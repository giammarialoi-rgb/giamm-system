// Subscriptions bought in the apps (Apple, Google Play) and, later, on the website
// (Stripe): one account, one plan, whatever the way it was paid.
//
// The stores are read through RevenueCat: it verifies the receipts with Apple and
// Google and tells this server what each person has, in two ways:
//   - a webhook (POST /api/billing/revenuecat/webhook) at every purchase, renewal,
//     cancellation, expiry;
//   - on request (POST /api/billing/refresh): the app asks right after a purchase or a
//     "restore purchases", and the server reads the person's subscriptions from RevenueCat.
// Both end in the same place: setAccountPlan(), with the history of the change.
//
// The person in RevenueCat is the Nurvan account (app_user_id = the account's id).
// Nothing about a card or a payment method ever reaches Nurvan: only the product,
// the store and the expiry date.
//
// Pure functions are exported for the tests: productPlan, planFromSubscriber, decideEvent.
import crypto from "node:crypto";
import { FEATURES, loadAccount, setAccountPlan } from "../account/plans.mjs";
import { mountStripe } from "./stripe.mjs";

const PLAN_IDS = FEATURES.plans.map((p) => p.id);
const rank = (plan) => Math.max(0, PLAN_IDS.indexOf(plan));
const STORE_SOURCE = { APP_STORE: "apple", MAC_APP_STORE: "apple", PLAY_STORE: "play", STRIPE: "stripe", RC_BILLING: "stripe" };
const STORE_SOURCES = ["apple", "play", "stripe"];

// The product ids the stores sell (web/features.json -> billing.products). A Google
// subscription arrives as "subscription:baseplan": only the first part names the product.
export function productPlan(productId) {
  const id = String(productId || "").split(":")[0].trim();
  if (!id) return null;
  const products = storeProducts();
  for (const plan of Object.keys(products)) {
    if ((products[plan] || []).includes(id)) return plan;
  }
  return null;
}

// The products the stores can sell: the ones of features.json plus the aliases, ids that exist in a store under
// another spelling (the Coach Pro ones were made in the App Store as nurvan.coach.pro.*). The apps get this list.
export function storeProducts() {
  const base = (FEATURES.billing && FEATURES.billing.products) || {};
  const aliases = (FEATURES.billing && FEATURES.billing.aliases) || {};
  const out = {};
  Object.keys(base).forEach((plan) => { out[plan] = base[plan].slice(); });
  Object.keys(aliases).forEach((id) => { const plan = aliases[id]; if (out[plan] && !out[plan].includes(id)) out[plan].push(id); });
  return out;
}

export function sourceOfStore(store) {
  return STORE_SOURCE[String(store || "").toUpperCase()] || null;
}

// What a person has in RevenueCat -> the plan to give: the best of the subscriptions still running.
// subscriber is the "subscriber" object of the REST answer (entitlements and subscriptions by product).
export function planFromSubscriber(subscriber, now = Date.now()) {
  const subs = (subscriber && subscriber.subscriptions) || {};
  const ents = (subscriber && subscriber.entitlements) || {};
  let best = null;
  const consider = (plan, expires, store, product) => {
    if (!PLAN_IDS.includes(plan) || plan === "free") return;
    const until = expires ? Date.parse(expires) : null;
    if (until != null && until <= now) return;
    if (!best || rank(plan) > rank(best.plan) || (rank(plan) === rank(best.plan) && (until || Infinity) > (best.until || Infinity))) {
      best = { plan, until, source: sourceOfStore(store), product };
    }
  };
  Object.keys(ents).forEach((key) => {
    const e = ents[key] || {};
    const plan = PLAN_IDS.includes(key) ? key : productPlan(e.product_identifier);
    const sub = subs[e.product_identifier] || {};
    consider(plan, e.expires_date, sub.store, e.product_identifier);
  });
  if (!best) {
    Object.keys(subs).forEach((product) => { const s = subs[product] || {}; consider(productPlan(product), s.expires_date, s.store, product); });
  }
  return best;
}

const PURCHASE_EVENTS = new Set(["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION", "NON_RENEWING_PURCHASE", "SUBSCRIPTION_EXTENDED", "TEMPORARY_ENTITLEMENT_GRANT"]);

// The account a RevenueCat event is about: the id we gave it, or one of its aliases.
export function eventUserId(event) {
  const candidates = [event && event.app_user_id, event && event.original_app_user_id].concat((event && event.aliases) || []);
  for (const c of candidates) { if (/^\d{1,18}$/.test(String(c || ""))) return String(c); }
  return null;
}

/**
 * What an event does to an account.
 * account: { plan, planSource, planUntil } (as loadAccount returns). Returns
 *   { action: 'set', plan, source, until, note } | { action: 'downgrade', note } | { action: 'ignore', reason }
 */
export function decideEvent(event, account, now = Date.now()) {
  const type = String((event && event.type) || "").toUpperCase();
  const source = sourceOfStore(event && event.store);
  if (type === "TEST") return { action: "ignore", reason: "test" };
  if (!source) return { action: "ignore", reason: "store" };
  const expires = event.expiration_at_ms ? Number(event.expiration_at_ms) : null;
  const cur = account || { plan: "free", planSource: "manual", planUntil: null };
  const curUntil = cur.planUntil ? Date.parse(cur.planUntil) : null;
  const heldByHand = cur.planSource === "manual" && cur.plan !== "free" && (curUntil == null || curUntil > now);

  if (PURCHASE_EVENTS.has(type)) {
    const productId = type === "PRODUCT_CHANGE" && event.new_product_id ? event.new_product_id : event.product_id;
    const plan = (Array.isArray(event.entitlement_ids) && event.entitlement_ids.find((e) => PLAN_IDS.includes(e) && e !== "free")) || productPlan(productId);
    if (!plan) return { action: "ignore", reason: "product" };
    if (expires != null && expires <= now) return { action: "ignore", reason: "already-expired" };
    // A plan given by hand (a gift, a founder) that is higher is not lowered by a smaller purchase.
    if (heldByHand && rank(cur.plan) > rank(plan)) return { action: "ignore", reason: "higher-by-hand" };
    return { action: "set", plan, source, until: expires != null ? new Date(expires).toISOString() : null, note: type + " " + String(productId || "").split(":")[0] };
  }
  if (type === "EXPIRATION" || (type === "CANCELLATION" && expires != null && expires <= now)) {
    // Only the plan this store gave, and only if it is not already a later one.
    if (cur.planSource !== source) return { action: "ignore", reason: "other-source" };
    if (curUntil != null && expires != null && curUntil > expires + 1000) return { action: "ignore", reason: "newer-plan" };
    return { action: "downgrade", note: type + " " + String(event.product_id || "").split(":")[0] };
  }
  // CANCELLATION (auto-renew switched off: the plan runs to its end), BILLING_ISSUE (the store keeps a grace
  // period of its own), TRANSFER and the rest: nothing to do now.
  return { action: "ignore", reason: type.toLowerCase() };
}

export function createBilling({ pool, initDb, env = process.env, fetchImpl = globalThis.fetch }) {
  let ready = null;
  async function ensure() {
    if (!ready) {
      ready = (async () => {
        await initDb();
        await pool.query(`
          CREATE TABLE IF NOT EXISTS billing_events (
            id TEXT PRIMARY KEY,
            user_id BIGINT,
            type TEXT,
            store TEXT,
            product TEXT,
            outcome TEXT,
            received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS billing_state (
            user_id BIGINT PRIMARY KEY,
            last_event_ms BIGINT NOT NULL DEFAULT 0,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );`);
      })().catch((err) => { ready = null; throw err; });
    }
    return ready;
  }

  async function apply(event, now = Date.now()) {
    await ensure();
    const eventId = String((event && event.id) || "");
    const userId = eventUserId(event);
    const out = { userId, outcome: "ignored", reason: "" };
    if (!userId) { out.reason = "no-account"; return record(event, out); }
    const exists = (await pool.query("SELECT 1 FROM app_users WHERE id = $1", [userId])).rows.length;
    if (!exists) { out.reason = "unknown-account"; return record(event, out); }
    if (eventId) {
      const dup = await pool.query("INSERT INTO billing_events(id, user_id, type, store, product) VALUES($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING RETURNING id",
        [eventId, userId, String(event.type || "").slice(0, 40), String(event.store || "").slice(0, 20), String(event.product_id || "").slice(0, 120)]);
      if (!dup.rows.length) { out.reason = "duplicate"; return out; }
    }
    const at = Number(event.event_timestamp_ms) || now;
    const last = Number(((await pool.query("SELECT last_event_ms FROM billing_state WHERE user_id = $1", [userId])).rows[0] || {}).last_event_ms || 0);
    if (at < last) { out.reason = "out-of-order"; return record(event, out); }
    const account = await loadAccount(pool, userId);
    const decision = decideEvent(event, account, now);
    if (decision.action === "ignore") {
      // An event that changed nothing (a test, a cancellation that only stops the renewal) is not a point in time
      // the next events must come after.
      out.reason = decision.reason;
      return record(event, out);
    }
    if (decision.action === "set") {
      await setAccountPlan(pool, userId, { plan: decision.plan, source: decision.source, until: decision.until, note: decision.note }, { actor: "revenuecat" });
      out.outcome = "set"; out.plan = decision.plan;
    } else {
      await setAccountPlan(pool, userId, { plan: "free", source: "manual", until: null, note: decision.note }, { actor: "revenuecat" });
      out.outcome = "downgraded"; out.plan = "free";
    }
    await pool.query("INSERT INTO billing_state(user_id, last_event_ms) VALUES($1,$2) ON CONFLICT (user_id) DO UPDATE SET last_event_ms = GREATEST(billing_state.last_event_ms, EXCLUDED.last_event_ms), updated_at = NOW()", [userId, at]);
    return record(event, out);
  }
  async function record(event, out) {
    if (event && event.id && out.outcome) {
      try { await pool.query("UPDATE billing_events SET outcome = $2 WHERE id = $1", [String(event.id), out.outcome + (out.reason ? ":" + out.reason : "")]); } catch (_) {}
    }
    return out;
  }

  // The same, asked to RevenueCat: after a purchase, a restore, or when the app opens.
  async function refresh(userId, now = Date.now()) {
    const key = String(env.REVENUECAT_SECRET_KEY || "").trim();
    if (!key) return { ok: false, reason: "not-configured" };
    await ensure();
    const r = await fetchImpl("https://api.revenuecat.com/v1/subscribers/" + encodeURIComponent(String(userId)), { headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" } });
    if (!r.ok) return { ok: false, reason: "revenuecat-" + r.status };
    const body = await r.json();
    const found = planFromSubscriber(body && body.subscriber, now);
    const account = await loadAccount(pool, userId);
    const curUntil = account.planUntil ? Date.parse(account.planUntil) : null;
    const heldByHand = account.planSource === "manual" && account.plan !== "free" && (curUntil == null || curUntil > now);
    if (found) {
      if (heldByHand && rank(account.plan) >= rank(found.plan)) return { ok: true, plan: account.plan, changed: false, reason: "held-by-hand" };
      if (account.plan === found.plan && account.planSource === found.source && account.planUntil && found.until && Math.abs(Date.parse(account.planUntil) - found.until) < 1000) return { ok: true, plan: found.plan, changed: false };
      await setAccountPlan(pool, userId, { plan: found.plan, source: found.source || "apple", until: found.until ? new Date(found.until).toISOString() : null, note: "refresh " + String(found.product || "").split(":")[0] }, { actor: "revenuecat" });
      return { ok: true, plan: found.plan, changed: true };
    }
    // Nothing running at the store: a plan that the stores gave ends; one given by hand or trial stays.
    if (STORE_SOURCES.includes(account.planSource) && account.plan !== "free") {
      await setAccountPlan(pool, userId, { plan: "free", source: "manual", until: null, note: "refresh: nessun abbonamento attivo" }, { actor: "revenuecat" });
      return { ok: true, plan: "free", changed: true };
    }
    return { ok: true, plan: account.plan, changed: false };
  }

  return { apply, refresh, ensure };
}

function sameSecret(a, b) {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

export function mountBilling(app, { pool, initDb, accountFromBearer, env = process.env }) {
  const billing = createBilling({ pool, initDb, env });

  // What the apps need to configure the store SDK: the public keys (they are made to ship in an app),
  // and the product ids by plan. Nothing here is secret.
  app.get("/api/billing/config", async (req, res) => {
    const apple = String(env.REVENUECAT_APPLE_KEY || "").trim();
    const google = String(env.REVENUECAT_GOOGLE_KEY || "").trim();
    return res.json({ ok: true, enabled: !!(apple || google), stripe: !!String(env.STRIPE_SECRET_KEY || "").trim(), appleKey: apple || null, googleKey: google || null, products: storeProducts() });
  });

  app.post("/api/billing/revenuecat/webhook", async (req, res) => {
    const secret = String(env.REVENUECAT_WEBHOOK_AUTH || "").trim();
    if (!secret) return res.status(503).json({ error: "Webhook non configurato." });
    const given = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!sameSecret(given, secret)) return res.status(401).json({ error: "Non autorizzato." });
    const event = req.body && req.body.event;
    if (!event || typeof event !== "object") return res.status(400).json({ error: "Evento mancante." });
    try {
      const out = await billing.apply(event);
      return res.json({ ok: true, outcome: out.outcome, reason: out.reason || undefined });
    } catch (err) {
      // 500 so that RevenueCat sends the event again.
      console.error("BILLING_WEBHOOK", err && err.message);
      return res.status(500).json({ error: "Evento non applicato." });
    }
  });

  app.post("/api/billing/refresh", async (req, res) => {
    const auth = await accountFromBearer(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Accedi al tuo account." });
    try {
      const out = await billing.refresh(auth.id);
      return res.json(out);
    } catch (err) {
      console.error("BILLING_REFRESH", err && err.message);
      return res.status(502).json({ ok: false, error: "Non riesco a leggere gli abbonamenti ora. Riprova tra poco." });
    }
  });

  // The website: Stripe (server/billing/stripe.mjs), the same plans and the same history.
  mountStripe(app, { pool, initDb, accountFromBearer, billing, env });

  return billing;
}
