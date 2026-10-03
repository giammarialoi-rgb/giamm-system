// The people who use Nurvan, for the dashboard.
//
// Privacy line, same as the rest of the dashboard: only who they are, what
// plan they have, how much they use the app and how much room it takes.
// Counts and dates read from the synced record (how many sessions, how many
// checks), never their content: no diary, photos, measures, therapy, exams,
// notes of a check-in, and nothing of a coach's clients beyond how many there
// are. The owner's own notes on an account live in admin_notes.
import { Entitlements, accountFromRow, entitlementPayload } from "../account/plans.mjs";
import { dateOnly } from "./dates.mjs";

const DAY = 86400000;
const iso = (v) => (v ? new Date(v).toISOString() : null);

// jsonb helpers, safe on any shape the app ever synced.
const LEN = (path) => `(CASE WHEN jsonb_typeof(d.data${path}) = 'array' THEN jsonb_array_length(d.data${path}) ELSE 0 END)`;
const KEYS = (path) => `(CASE WHEN jsonb_typeof(d.data${path}) = 'object' THEN (SELECT COUNT(*) FROM jsonb_object_keys(d.data${path})) ELSE 0 END)`;

const LAST_SEEN_SQL = `GREATEST(
  u.last_seen_at,
  (SELECT MAX(lic.last_seen_at) FROM coach_licenses lic WHERE lic.user_id = u.id),
  (SELECT MAX(cc.last_seen_at) FROM coach_clients cc WHERE cc.athlete_user_id = u.id)
)`;

const SORTS = {
  created: "u.created_at",
  seen: "last_seen",
  storage: "storage_bytes",
  sessions: "sessions",
  email: "u.email",
  plan: "u.plan"
};

const SELECT_LIST = `
  u.id, u.email, u.name, u.plan, u.plan_source, u.plan_until, u.seats, u.trial_until, u.trial_used_at,
  u.created_at, u.email_verified_at, u.disabled_at, u.provider,
  ${LAST_SEEN_SQL} AS last_seen,
  EXISTS(SELECT 1 FROM coach_licenses l2 WHERE l2.user_id = u.id AND l2.status = 'active') AS is_coach,
  (SELECT COUNT(*)::int FROM coach_clients c WHERE c.coach_user_id = u.id AND c.status = 'active') AS athletes,
  (SELECT cu.email FROM coach_clients c3 JOIN app_users cu ON cu.id = c3.coach_user_id
    WHERE c3.athlete_user_id = u.id AND c3.status = 'active' ORDER BY c3.id DESC LIMIT 1) AS coach_email,
  COALESCE(pg_column_size(d.data), 0)::bigint AS storage_bytes,
  ${LEN("->'logs'")}::int AS sessions`;

function shape(r, now) {
  const account = accountFromRow(r);
  const eff = Entitlements.effective(account, now);
  return {
    id: String(r.id),
    email: r.email,
    name: r.name || "",
    provider: r.provider || "email",
    createdAt: iso(r.created_at),
    verified: !!r.email_verified_at,
    suspended: !!r.disabled_at,
    lastSeenAt: iso(r.last_seen),
    plan: account.plan,
    effectivePlan: eff.plan,
    planSource: account.planSource,
    planUntil: account.planUntil,
    status: eff.status,
    trialActive: eff.trialActive,
    isCoach: !!r.is_coach,
    athletes: Number(r.athletes || 0),
    coachEmail: r.coach_email || null,
    storageBytes: Number(r.storage_bytes || 0),
    sessions: Number(r.sessions || 0)
  };
}

/**
 * listProfiles: filtered, sorted, paged.
 *   filters: q (email or name), plan, role (coach | athlete | solo), seen
 *   (7 | 30 | quiet30 | never), created (days), provider, suspended.
 */
export async function listProfiles(pool, f = {}, { now = Date.now() } = {}) {
  const where = [];
  const params = [];
  const add = (sql, value) => { params.push(value); where.push(sql.replace("?", "$" + params.length)); };
  const needle = String(f.q || "").trim().toLowerCase().slice(0, 80);
  if (needle) { params.push("%" + needle + "%"); where.push(`(LOWER(u.email) LIKE $${params.length} OR LOWER(COALESCE(u.name, '')) LIKE $${params.length})`); }
  if (["free", "standard", "coach", "coach_pro"].includes(f.plan)) add("u.plan = ?", f.plan);
  if (f.role === "coach") where.push("EXISTS(SELECT 1 FROM coach_licenses l2 WHERE l2.user_id = u.id AND l2.status = 'active')");
  if (f.role === "athlete") where.push("EXISTS(SELECT 1 FROM coach_clients c3 WHERE c3.athlete_user_id = u.id AND c3.status = 'active')");
  if (f.role === "solo") where.push("NOT EXISTS(SELECT 1 FROM coach_licenses l2 WHERE l2.user_id = u.id AND l2.status = 'active') AND NOT EXISTS(SELECT 1 FROM coach_clients c3 WHERE c3.athlete_user_id = u.id AND c3.status = 'active')");
  const seen = String(f.seen || "");
  if (seen === "7" || seen === "30") where.push(`(${LAST_SEEN_SQL}) >= NOW() - INTERVAL '${seen} days'`);
  if (seen === "quiet30") where.push(`(${LAST_SEEN_SQL}) < NOW() - INTERVAL '30 days'`);
  if (seen === "never") where.push(`(${LAST_SEEN_SQL}) IS NULL`);
  const created = Number(f.created);
  if (Number.isFinite(created) && created > 0 && created <= 3650) where.push(`u.created_at >= NOW() - INTERVAL '${Math.floor(created)} days'`);
  if (["email", "google", "apple"].includes(f.provider)) add("u.provider = ?", f.provider);
  if (f.suspended === "1") where.push("u.disabled_at IS NOT NULL");
  const sort = SORTS[f.sort] || SORTS.created;
  const dir = f.dir === "asc" ? "ASC" : "DESC";
  const limit = Math.min(500, Math.max(1, Number(f.limit) || 50));
  const offset = Math.max(0, Number(f.offset) || 0);
  const from = "FROM app_users u LEFT JOIN app_account_data d ON d.user_id = u.id" + (where.length ? " WHERE " + where.join(" AND ") : "");
  const total = Number((await pool.query("SELECT COUNT(*)::int AS n " + from, params)).rows[0].n);
  const rows = (await pool.query(
    `SELECT ${SELECT_LIST} ${from} ORDER BY ${sort} ${dir} NULLS LAST, u.id DESC LIMIT ${limit} OFFSET ${offset}`, params
  )).rows;
  return { total, rows: rows.map((r) => shape(r, now)), limit, offset };
}

export function profilesCsv(rows) {
  const cell = (v) => { const s = String(v == null ? "" : v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const head = ["id", "email", "nome", "accesso", "iscritto il", "ultimo accesso", "piano", "origine", "scadenza", "coach", "atleti", "coach collegato", "sedute", "spazio KB", "sospeso"];
  return [head.join(";")].concat(rows.map((r) => [
    r.id, r.email, r.name, r.provider, (r.createdAt || "").slice(0, 10), (r.lastSeenAt || "").slice(0, 10), r.effectivePlan, r.planSource,
    (r.planUntil || "").slice(0, 10), r.isCoach ? "si" : "", r.athletes, r.coachEmail || "", r.sessions, Math.round(r.storageBytes / 1024), r.suspended ? "si" : ""
  ].map(cell).join(";"))).join("\r\n") + "\r\n";
}

/** The whole picture of one account. */
export async function profileDetail(pool, id, { now = Date.now() } = {}) {
  const head = (await pool.query(
    `SELECT ${SELECT_LIST},
            u.consent_version, u.consent_at, u.age_confirmed_at, u.health_consent_at, u.ai_consent_at, u.ai_consent_withdrawn_at,
            u.tokens_valid_after, d.revision, d.updated_at AS data_updated_at,
            ${LEN("->'bodyChecks'")}::int AS body_checks,
            ${LEN("->'prefs'->'importLog'")}::int AS imports,
            ${KEYS("->'nutritionDaily'")}::int AS nutrition_days
     FROM app_users u LEFT JOIN app_account_data d ON d.user_id = u.id WHERE u.id = $1`, [id]
  )).rows[0];
  if (!head) return null;
  const base = shape(head, now);
  const account = accountFromRow(head);
  const identities = (await pool.query(
    "SELECT provider, email, created_at, last_login_at FROM app_user_identities WHERE user_id = $1 ORDER BY created_at", [id]
  )).rows.map((r) => ({ provider: r.provider, email: r.email || null, since: iso(r.created_at), lastLoginAt: iso(r.last_login_at) }));
  const history = (await pool.query(
    "SELECT changed_at, from_plan, to_plan, source, plan_until, seats, note, actor FROM app_plan_history WHERE user_id = $1 ORDER BY changed_at DESC, id DESC LIMIT 50", [id]
  )).rows.map((h) => ({ at: iso(h.changed_at), from: h.from_plan, to: h.to_plan, source: h.source, until: iso(h.plan_until), seats: h.seats == null ? null : Number(h.seats), note: h.note || "", actor: h.actor || "" }));
  const billing = (await pool.query("SELECT period, price_cents, comp, note FROM admin_account_billing WHERE user_id = $1", [id])).rows[0] || null;
  const notes = (await pool.query("SELECT id, note, tag, author, created_at FROM admin_notes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100", [id]))
    .rows.map((n) => ({ id: String(n.id), note: n.note, tag: n.tag || "", author: n.author || "", at: iso(n.created_at) }));
  const events = (await pool.query(
    "SELECT at, kind, detail FROM app_events WHERE user_id = $1 ORDER BY at DESC LIMIT 20", [id]
  )).rows.map((e) => ({ at: iso(e.at), kind: e.kind, route: (e.detail && e.detail.route) || null, status: e.detail && e.detail.status != null ? Number(e.detail.status) : null, message: (e.detail && e.detail.message) || null }));
  const ledger = (await pool.query(
    "SELECT id, day, kind, amount_cents, category, source, note FROM admin_ledger WHERE user_id = $1 AND voided_at IS NULL ORDER BY day DESC, id DESC LIMIT 50", [id]
  )).rows.map((l) => ({ id: String(l.id), day: dateOnly(l.day), kind: l.kind, cents: Number(l.amount_cents), category: l.category, source: l.source, note: l.note || "" }));
  const sessions30 = Number((await pool.query(
    `SELECT COUNT(*)::int AS n FROM app_account_data d CROSS JOIN LATERAL jsonb_array_elements(
       CASE WHEN jsonb_typeof(d.data->'logs') = 'array' THEN d.data->'logs' ELSE '[]'::jsonb END) l
     WHERE d.user_id = $1 AND COALESCE(l->>'finalizedAt', l->>'at') >= to_char(NOW() - INTERVAL '30 days', 'YYYY-MM-DD')`, [id]
  )).rows[0].n);
  let clients = null;
  if (base.isCoach) {
    clients = (await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'active')::int AS active, COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE last_seen_at >= NOW() - INTERVAL '7 days')::int AS seen7
       FROM coach_clients WHERE coach_user_id = $1`, [id]
    )).rows[0];
    clients = { active: Number(clients.active), total: Number(clients.total), seen7: Number(clients.seen7) };
  }
  const consent = {
    version: head.consent_version || null,
    at: iso(head.consent_at),
    age: !!head.age_confirmed_at,
    health: !!head.health_consent_at,
    ai: !!head.ai_consent_at && !(head.ai_consent_withdrawn_at && new Date(head.ai_consent_withdrawn_at) >= new Date(head.ai_consent_at))
  };
  return {
    ...base,
    entitlement: entitlementPayload(account, now),
    identities,
    history,
    billing: billing ? { period: billing.period, priceCents: billing.price_cents == null ? null : Number(billing.price_cents), comp: !!billing.comp, note: billing.note || "" } : null,
    notes,
    events,
    ledger,
    clients,
    consent,
    usage: {
      sessionsTotal: base.sessions,
      sessions30,
      bodyChecks: Number(head.body_checks || 0),
      imports: Number(head.imports || 0),
      nutritionDays: Number(head.nutrition_days || 0),
      storageBytes: base.storageBytes,
      revision: head.revision == null ? null : Number(head.revision),
      syncedAt: iso(head.data_updated_at),
      sessionsRevokedAt: iso(head.tokens_valid_after)
    }
  };
}

/** Signups and how many of each day came back, for the last N days. */
export async function signupSeries(pool, days = 90) {
  const n = Math.min(365, Math.max(7, Number(days) || 90));
  const rows = (await pool.query(
    `SELECT to_char(u.created_at::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS signups,
            COUNT(*) FILTER (WHERE ${LAST_SEEN_SQL} >= u.created_at + INTERVAL '1 day')::int AS returned
     FROM app_users u WHERE u.created_at >= NOW() - ($1 || ' days')::interval GROUP BY 1 ORDER BY 1`, [String(n)]
  )).rows;
  // Every day of the period, the quiet ones as zero.
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date(Date.now() - i * DAY));
    const r = byDay.get(day);
    out.push({ day, signups: r ? Number(r.signups) : 0, returned: r ? Number(r.returned) : 0 });
  }
  return out;
}

/** Storage and activity at a glance: the heaviest accounts and the database. */
export async function storageReport(pool) {
  const total = (await pool.query("SELECT COALESCE(SUM(pg_column_size(data)), 0)::bigint AS b, COUNT(*)::int AS n FROM app_account_data")).rows[0];
  const db = (await pool.query("SELECT pg_database_size(current_database())::bigint AS b")).rows[0];
  const top = (await pool.query(
    `SELECT u.id, u.email, pg_column_size(d.data)::bigint AS b FROM app_account_data d JOIN app_users u ON u.id = d.user_id
     ORDER BY b DESC NULLS LAST LIMIT 10`
  )).rows.map((r) => ({ id: String(r.id), email: r.email, bytes: Number(r.b) }));
  return { accountDataBytes: Number(total.b), accounts: Number(total.n), databaseBytes: Number(db.b), top };
}

/* ------------------------------ actions ------------------------------ */

export async function addNote(pool, id, { note, tag }, actor) {
  const text = String(note || "").trim().slice(0, 1000);
  if (!text) throw Object.assign(new Error("Scrivi la nota."), { statusCode: 400 });
  const exists = await pool.query("SELECT 1 FROM app_users WHERE id = $1", [id]);
  if (!exists.rows.length) throw Object.assign(new Error("Account non trovato."), { statusCode: 404 });
  const r = await pool.query(
    "INSERT INTO admin_notes(user_id, note, tag, author) VALUES($1,$2,$3,$4) RETURNING id, created_at",
    [id, text, tag ? String(tag).slice(0, 30) : null, String(actor || "").slice(0, 120)]
  );
  return { id: String(r.rows[0].id), at: iso(r.rows[0].created_at) };
}

export async function deleteNote(pool, id, noteId) {
  const r = await pool.query("DELETE FROM admin_notes WHERE id = $1 AND user_id = $2 RETURNING id", [noteId, id]);
  return r.rows.length > 0;
}

/** Suspend / reactivate: the account's sessions stop working at once (within the 30 s the gate caches). */
export async function setSuspended(pool, id, suspended) {
  const r = await pool.query(
    `UPDATE app_users SET disabled_at = CASE WHEN $2::boolean THEN COALESCE(disabled_at, NOW()) ELSE NULL END,
            tokens_valid_after = CASE WHEN $2::boolean THEN NOW() ELSE tokens_valid_after END
     WHERE id = $1 RETURNING id`, [id, !!suspended]
  );
  if (!r.rows.length) throw Object.assign(new Error("Account non trovato."), { statusCode: 404 });
  return { suspended: !!suspended };
}

/** Ends every session of the account (it signs in again). */
export async function revokeSessions(pool, id) {
  const r = await pool.query("UPDATE app_users SET tokens_valid_after = NOW() WHERE id = $1 RETURNING id", [id]);
  if (!r.rows.length) throw Object.assign(new Error("Account non trovato."), { statusCode: 404 });
  return { ok: true };
}

/** Gives a coach (or anyone) more days of trial: from today, or from the end of the current one. */
export async function extendTrial(pool, id, days) {
  const n = Math.floor(Number(days));
  if (!Number.isFinite(n) || n < 1 || n > 365) throw Object.assign(new Error("Giorni da 1 a 365."), { statusCode: 400 });
  const r = await pool.query(
    `UPDATE app_users SET trial_until = GREATEST(COALESCE(trial_until, NOW()), NOW()) + ($2 || ' days')::interval,
            trial_used_at = COALESCE(trial_used_at, NOW())
     WHERE id = $1 RETURNING trial_until`, [id, String(n)]
  );
  if (!r.rows.length) throw Object.assign(new Error("Account non trovato."), { statusCode: 404 });
  return { trialUntil: iso(r.rows[0].trial_until) };
}

export { DAY };
