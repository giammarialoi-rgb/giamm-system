// What Nurvan earns and spends, for the dashboard.
//
// Revenue is read from two places that must agree on what "paying" means:
//   - the accounts: a plan in effect (not expired, not a trial) that is not a
//     gift. A plan set by hand with no price is a gift ("omaggio"), which is
//     how the first coaches get it; a plan that comes from Stripe or the
//     stores pays the price book, unless the account has its own price;
//   - the ledger: money really received and money spent, entered by hand or
//     imported from the stores. Subscriptions that renew are counted in the
//     ledger when the money arrives, never guessed from the plan.
// The coaches' own ledger (what a coach takes from a client) is theirs and is
// never read here.
import { FEATURES, Entitlements, accountFromRow } from "../account/plans.mjs";
import { dateOnly } from "./dates.mjs";
import { dayOf } from "./analytics.mjs";

const DAY = 86400000;
export const PAID_SOURCES = ["stripe", "play", "apple"];
export const INCOME_CATEGORIES = ["abbonamento", "app-store", "play-store", "consulenza", "altro"];
export const EXPENSE_CATEGORIES = ["server", "email", "dominio", "account-sviluppatore", "strumenti", "pubblicita", "tasse-commissioni", "collaboratori", "altro"];

/* ------------------------------ settings ------------------------------ */

export async function getSetting(pool, key, fallback) {
  const r = await pool.query("SELECT value FROM admin_settings WHERE key = $1", [key]);
  return r.rows[0] ? r.rows[0].value : fallback;
}
export async function putSetting(pool, key, value) {
  await pool.query(
    `INSERT INTO admin_settings(key, value, updated_at) VALUES($1,$2,NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );
}

/* ------------------------------ price book ------------------------------ */

/** { plan: { month: euros|null, year: euros|null } } - the plans' prices, with the owner's changes on top. */
export function priceBook(overrides) {
  const book = {};
  for (const p of FEATURES.plans) {
    book[p.id] = { month: null, year: null };
    for (const price of p.prices || []) book[p.id][price.period] = Number(price.amount);
  }
  for (const [plan, v] of Object.entries(overrides || {})) {
    if (!book[plan] || !v || typeof v !== "object") continue;
    for (const period of ["month", "year"]) {
      if (v[period] === null) book[plan][period] = null;
      else if (Number.isFinite(Number(v[period])) && Number(v[period]) >= 0) book[plan][period] = Number(v[period]);
    }
  }
  return book;
}

export function sanitizePrices(input) {
  const out = {};
  for (const p of FEATURES.plans) {
    const v = input && input[p.id];
    if (!v || typeof v !== "object") continue;
    out[p.id] = {};
    for (const period of ["month", "year"]) {
      if (v[period] === undefined) continue;
      if (v[period] === null || v[period] === "") { out[p.id][period] = null; continue; }
      const n = Number(String(v[period]).replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || n > 10000) throw Object.assign(new Error("Prezzo non valido per " + p.id + "."), { statusCode: 400 });
      out[p.id][period] = Math.round(n * 100) / 100;
    }
  }
  return out;
}

/** Cents per month this account pays, from its own price or the price book. */
export function monthlyCents(plan, billing, book) {
  const period = billing && (billing.period === "year" || billing.period === "month") ? billing.period : null;
  if (billing && billing.price_cents != null && Number(billing.price_cents) > 0) {
    return Math.round(Number(billing.price_cents) / ((period || "month") === "year" ? 12 : 1));
  }
  const prices = book[plan] || {};
  const use = period || (prices.month != null ? "month" : "year");
  const amount = prices[use];
  if (amount == null) return 0;
  return Math.round((amount * 100) / (use === "year" ? 12 : 1));
}

/* ------------------------------ accounts that pay ------------------------------ */

const SUBSCRIBERS_SQL = `
  SELECT u.id, u.email, u.name, u.plan, u.plan_source, u.plan_until, u.seats, u.trial_until, u.trial_used_at, u.created_at,
         b.period, b.price_cents, b.comp, b.note AS billing_note
  FROM app_users u
  LEFT JOIN admin_account_billing b ON b.user_id = u.id
  WHERE u.plan <> 'free' OR u.trial_until IS NOT NULL OR b.user_id IS NOT NULL`;

/**
 * subscribers: every account with something to say about money, sorted out:
 *   state "paying" | "comp" (gift) | "trial" | "expired" | "free"
 * and, for the paying ones, the monthly equivalent in cents.
 */
export async function subscribers(pool, { now = Date.now(), prices } = {}) {
  const book = priceBook(prices !== undefined ? prices : await getSetting(pool, "prices", {}));
  const rows = (await pool.query(SUBSCRIBERS_SQL)).rows;
  return rows.map((r) => {
    const account = accountFromRow(r);
    const eff = Entitlements.effective(account, now);
    const billing = { period: r.period, price_cents: r.price_cents, comp: r.comp };
    let state = "free";
    if (eff.trialActive) state = "trial";
    else if (account.plan !== "free" && eff.ownPlan === "free") state = "expired";
    else if (eff.ownPlan !== "free") {
      const gift = r.comp === true || (!PAID_SOURCES.includes(account.planSource) && !(Number(r.price_cents) > 0));
      state = gift ? "comp" : "paying";
    }
    const plan = state === "paying" || state === "comp" ? eff.ownPlan : account.plan;
    return {
      id: String(r.id),
      email: r.email,
      name: r.name || "",
      plan,
      state,
      source: account.planSource,
      until: account.planUntil,
      trialUntil: account.trialUntil,
      period: r.period || null,
      priceCents: r.price_cents == null ? null : Number(r.price_cents),
      monthlyCents: state === "paying" ? monthlyCents(plan, billing, book) : 0,
      note: r.billing_note || "",
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null
    };
  });
}

/* ------------------------------ ledger ------------------------------ */

const ymd = (d) => (d instanceof Date ? dateOnly(d) : new Date(d).toISOString().slice(0, 10));
const ym = (d) => new Date(d).toISOString().slice(0, 7);

export function parseAmountCents(v) {
  const n = Number(String(v == null ? "" : v).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 10000000) return null;
  return Math.round(n * 100);
}

export function cleanLedgerEntry(body, actor) {
  const kind = body && body.kind;
  if (kind !== "income" && kind !== "expense") throw Object.assign(new Error("Scegli entrata o uscita."), { statusCode: 400 });
  const cents = parseAmountCents(body.amount);
  if (cents == null || cents <= 0) throw Object.assign(new Error("Importo non valido."), { statusCode: 400 });
  const day = String(body.day || dayOf()).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day))) throw Object.assign(new Error("Data non valida."), { statusCode: 400 });
  const list = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const category = list.includes(body.category) ? body.category : "altro";
  return {
    day, kind, cents, category,
    userId: body.userId ? Number(body.userId) || null : null,
    source: ["manual", "stripe", "play", "apple", "bank"].includes(body.source) ? body.source : "manual",
    reference: body.reference ? String(body.reference).slice(0, 120) : null,
    note: body.note ? String(body.note).slice(0, 300) : null,
    actor: String(actor || "").slice(0, 120)
  };
}

export async function addLedger(pool, entry) {
  const r = await pool.query(
    `INSERT INTO admin_ledger(day, kind, amount_cents, category, user_id, source, reference, note, created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (source, reference) WHERE reference IS NOT NULL DO NOTHING
     RETURNING id`,
    [entry.day, entry.kind, entry.cents, entry.category, entry.userId, entry.source, entry.reference, entry.note, entry.actor]
  );
  return r.rows[0] ? Number(r.rows[0].id) : null;
}

export async function voidLedger(pool, id) {
  const r = await pool.query("UPDATE admin_ledger SET voided_at = NOW() WHERE id = $1 AND voided_at IS NULL RETURNING id", [id]);
  return r.rows.length > 0;
}

export async function listLedger(pool, { from, to, kind, q, limit = 500 } = {}) {
  const r = await pool.query(
    `SELECT l.id, l.day, l.kind, l.amount_cents, l.currency, l.category, l.source, l.reference, l.note, l.created_by, l.voided_at, u.email
     FROM admin_ledger l LEFT JOIN app_users u ON u.id = l.user_id
     WHERE ($1::date IS NULL OR l.day >= $1::date) AND ($2::date IS NULL OR l.day <= $2::date)
       AND ($3::text IS NULL OR l.kind = $3::text)
       AND ($4::text IS NULL OR LOWER(COALESCE(l.note, '') || ' ' || l.category || ' ' || COALESCE(u.email, '')) LIKE '%' || LOWER($4::text) || '%')
     ORDER BY l.day DESC, l.id DESC
     LIMIT $5`,
    [from || null, to || null, kind === "income" || kind === "expense" ? kind : null, q ? String(q).slice(0, 80) : null, Math.min(2000, Math.max(1, Number(limit) || 500))]
  );
  return r.rows.map((x) => ({
    id: String(x.id), day: ymd(x.day), kind: x.kind, cents: Number(x.amount_cents), currency: x.currency, category: x.category,
    source: x.source, reference: x.reference, note: x.note || "", by: x.created_by || "", voided: !!x.voided_at, email: x.email || null
  }));
}

function csvCell(v) {
  const s = String(v == null ? "" : v);
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export function ledgerCsv(rows) {
  const head = ["data", "tipo", "importo", "valuta", "categoria", "origine", "riferimento", "account", "nota", "inserito da", "annullata"];
  return [head.join(";")].concat(rows.map((r) => [
    r.day, r.kind === "income" ? "entrata" : "uscita", (r.cents / 100).toFixed(2).replace(".", ","), r.currency, r.category,
    r.source, r.reference || "", r.email || "", r.note, r.by, r.voided ? "si" : ""
  ].map(csvCell).join(";"))).join("\r\n") + "\r\n";
}

/* ------------------------------ summary ------------------------------ */

export function sanitizeCosts(input) {
  const list = Array.isArray(input) ? input : [];
  return list.slice(0, 40).map((c) => {
    const cents = parseAmountCents(c && c.amount);
    if (cents == null) throw Object.assign(new Error("Importo non valido in un costo."), { statusCode: 400 });
    return {
      name: String((c && c.name) || "").trim().slice(0, 60) || "Costo",
      cents,
      period: c && c.period === "year" ? "year" : "month"
    };
  });
}

/**
 * summary: the whole money picture.
 *   mrr/arr/arpu from the accounts that pay;
 *   movements: new paying accounts and accounts that stopped, from the plan history;
 *   trials: started in 30 days and how many now pay;
 *   ledger: month by month for the last 12 months (in, out, net), this year,
 *   by category; fixed costs per month from the recurring list.
 */
export async function summary(pool, { now = Date.now() } = {}) {
  const prices = await getSetting(pool, "prices", {});
  const costs = await getSetting(pool, "costs", []);
  const subs = await subscribers(pool, { now, prices });
  const paying = subs.filter((s) => s.state === "paying");
  const mrr = paying.reduce((n, s) => n + s.monthlyCents, 0);
  const byPlan = {};
  for (const p of FEATURES.plans) byPlan[p.id] = { paying: 0, comp: 0, trial: 0, mrrCents: 0 };
  for (const s of subs) {
    const slot = byPlan[s.plan] || (byPlan[s.plan] = { paying: 0, comp: 0, trial: 0, mrrCents: 0 });
    if (s.state === "paying") { slot.paying += 1; slot.mrrCents += s.monthlyCents; }
    else if (s.state === "comp") slot.comp += 1;
    else if (s.state === "trial") slot.trial += 1;
  }
  const expiring = subs
    .filter((s) => (s.state === "paying" || s.state === "comp") && s.until && Date.parse(s.until) - now <= 30 * DAY && Date.parse(s.until) >= now)
    .sort((a, b) => Date.parse(a.until) - Date.parse(b.until))
    .map((s) => ({ id: s.id, email: s.email, plan: s.plan, state: s.state, until: s.until, monthlyCents: s.monthlyCents }));

  const hist = (await pool.query(
    "SELECT changed_at, from_plan, to_plan FROM app_plan_history WHERE changed_at >= NOW() - INTERVAL '90 days'"
  )).rows;
  const move = { new30: 0, lost30: 0, new90: 0, lost90: 0 };
  for (const h of hist) {
    const t = Date.parse(h.changed_at);
    const gained = h.from_plan === "free" && h.to_plan !== "free";
    const lost = h.from_plan !== "free" && h.to_plan === "free";
    if (gained) { move.new90 += 1; if (now - t <= 30 * DAY) move.new30 += 1; }
    if (lost) { move.lost90 += 1; if (now - t <= 30 * DAY) move.lost30 += 1; }
  }
  const trialStarted30 = subs.filter((s) => s.trialUntil && now - (Date.parse(s.trialUntil) - (FEATURES.trialDays || 14) * DAY) <= 30 * DAY).length;
  const trialConverted = subs.filter((s) => s.trialUntil && s.state === "paying").length;

  const monthly = (await pool.query(
    `SELECT to_char(day, 'YYYY-MM') AS m, kind, SUM(amount_cents)::bigint AS cents
     FROM admin_ledger WHERE voided_at IS NULL AND day >= (date_trunc('month', NOW()) - INTERVAL '23 months')::date
     GROUP BY 1, 2 ORDER BY 1`
  )).rows;
  const months = [];
  const base = new Date(now);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1));
    months.push(ym(d));
  }
  const series = months.map((m) => {
    const inc = Number((monthly.find((r) => r.m === m && r.kind === "income") || {}).cents || 0);
    const out = Number((monthly.find((r) => r.m === m && r.kind === "expense") || {}).cents || 0);
    return { month: m, incomeCents: inc, expenseCents: out, netCents: inc - out };
  });
  const year = String(new Date(now).getUTCFullYear());
  const cats = (await pool.query(
    `SELECT kind, category, SUM(amount_cents)::bigint AS cents FROM admin_ledger
     WHERE voided_at IS NULL AND to_char(day, 'YYYY') = $1 GROUP BY 1, 2 ORDER BY 3 DESC`, [year]
  )).rows.map((r) => ({ kind: r.kind, category: r.category, cents: Number(r.cents) }));
  const ytd = { incomeCents: 0, expenseCents: 0 };
  for (const c of cats) { if (c.kind === "income") ytd.incomeCents += c.cents; else ytd.expenseCents += c.cents; }
  const burn = (Array.isArray(costs) ? costs : []).reduce((n, c) => n + (c.period === "year" ? Math.round(c.cents / 12) : c.cents), 0);
  const thisMonth = series[series.length - 1];
  const lastMonth = series[series.length - 2] || { incomeCents: 0, expenseCents: 0, netCents: 0 };
  return {
    at: new Date(now).toISOString(),
    mrrCents: mrr,
    arrCents: mrr * 12,
    paying: paying.length,
    comp: subs.filter((s) => s.state === "comp").length,
    trial: subs.filter((s) => s.state === "trial").length,
    expired: subs.filter((s) => s.state === "expired").length,
    arpuCents: paying.length ? Math.round(mrr / paying.length) : 0,
    byPlan,
    movements: move,
    trials: { started30: trialStarted30, nowPaying: trialConverted },
    expiring,
    ledger: { series, thisMonth, lastMonth, ytd: Object.assign({ year }, ytd), categories: cats },
    burnCents: burn,
    runwayNote: burn > 0 ? { monthlyCostCents: burn, coveredByMrr: mrr >= burn, gapCents: Math.max(0, burn - mrr) } : null,
    prices: priceBook(prices),
    costs: Array.isArray(costs) ? costs : []
  };
}

/** The account's own billing line (period, price, gift). */
export async function setBilling(pool, userId, body) {
  const period = body && (body.period === "year" || body.period === "month") ? body.period : null;
  const cents = body && body.price !== undefined && body.price !== "" && body.price !== null ? parseAmountCents(body.price) : null;
  if (body && body.price !== undefined && body.price !== "" && body.price !== null && cents == null) throw Object.assign(new Error("Prezzo non valido."), { statusCode: 400 });
  const comp = body && body.comp === true;
  const note = body && body.note ? String(body.note).slice(0, 300) : null;
  const exists = await pool.query("SELECT 1 FROM app_users WHERE id = $1", [userId]);
  if (!exists.rows.length) throw Object.assign(new Error("Account non trovato."), { statusCode: 404 });
  await pool.query(
    `INSERT INTO admin_account_billing(user_id, period, price_cents, comp, note, updated_at) VALUES($1,$2,$3,$4,$5,NOW())
     ON CONFLICT (user_id) DO UPDATE SET period = EXCLUDED.period, price_cents = EXCLUDED.price_cents, comp = EXCLUDED.comp, note = EXCLUDED.note, updated_at = NOW()`,
    [userId, period, cents, comp, note]
  );
  return { period, priceCents: cents, comp, note };
}
