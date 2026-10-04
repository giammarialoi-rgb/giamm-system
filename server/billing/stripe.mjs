// Subscriptions bought on the website with Stripe (Checkout, then the customer portal).
//
// The page asks for a Checkout session for a product (POST /api/billing/stripe/checkout) and goes to
// the address Stripe gives back: the card is typed on Stripe's page, never here. Stripe then tells this
// server what happened with a webhook (POST /api/billing/stripe/webhook, signed); the events end where
// the ones of the stores end, in createBilling().apply(): the same plan, the same history, with the
// source "stripe". Plans and prices are the ones of web/features.json; the Stripe prices are made by
// tools/stripe_setup.mjs with the product id as their lookup key.
//
// Free month: a person who comes from the website and has not had it yet starts with
// STRIPE_TRIAL_DAYS (30) days without charge. It is given once per account, and it is announced only
// outside the apps (the stores' rules).
//
// Pure functions are exported for the tests: formEncode, verifySignature, subscriptionEvent, checkoutParams.
import crypto from "node:crypto";
import { FEATURES, loadAccount } from "../account/plans.mjs";

const API = "https://api.stripe.com/v1";
const GRACE_MS = 2 * 86400000;
const PLAN_IDS = FEATURES.plans.map((p) => p.id);
const rank = (plan) => Math.max(0, PLAN_IDS.indexOf(plan));

export function allProductIds() {
  const products = (FEATURES.billing && FEATURES.billing.products) || {};
  return Object.keys(products).flatMap((plan) => products[plan] || []);
}
export function planOfProduct(productId) {
  const products = (FEATURES.billing && FEATURES.billing.products) || {};
  for (const plan of Object.keys(products)) if ((products[plan] || []).includes(productId)) return plan;
  return null;
}

// Stripe takes forms: nested objects and lists use brackets (a[b]=1, c[0][d]=2).
export function formEncode(value, prefix = "", out = []) {
  if (value === undefined || value === null) return out;
  if (Array.isArray(value)) value.forEach((v, i) => formEncode(v, prefix + "[" + i + "]", out));
  else if (typeof value === "object") Object.keys(value).forEach((k) => formEncode(value[k], prefix ? prefix + "[" + k + "]" : k, out));
  else out.push(encodeURIComponent(prefix) + "=" + encodeURIComponent(String(value)));
  return out;
}
export const formBody = (obj) => formEncode(obj).join("&");

// The Stripe-Signature header: t=<time>,v1=<hmac of "<time>.<body>">. Nothing is trusted without it.
export function verifySignature(rawBody, header, secret, now = Date.now(), toleranceSec = 300) {
  if (!secret || !header || !rawBody) return false;
  const parts = String(header).split(",").map((p) => p.trim().split("="));
  const t = (parts.find((p) => p[0] === "t") || [])[1];
  const sigs = parts.filter((p) => p[0] === "v1").map((p) => p[1]);
  if (!t || !sigs.length || !/^\d+$/.test(t)) return false;
  if (Math.abs(now / 1000 - Number(t)) > toleranceSec) return false;
  const expected = crypto.createHmac("sha256", secret).update(t + "." + (Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody))).digest("hex");
  const e = Buffer.from(expected);
  return sigs.some((s) => { const b = Buffer.from(String(s)); return b.length === e.length && crypto.timingSafeEqual(b, e); });
}

const periodEndMs = (sub) => {
  const item = sub && sub.items && sub.items.data && sub.items.data[0];
  const s = (sub && sub.current_period_end) || (item && item.current_period_end);
  return s ? Number(s) * 1000 : null;
};
const productOfSub = (sub) => {
  const item = sub && sub.items && sub.items.data && sub.items.data[0];
  const price = (item && item.price) || {};
  return String(price.lookup_key || (price.metadata && price.metadata.nurvan_product) || "");
};
export const isRunning = (sub) => !!sub && ["active", "trialing", "past_due"].includes(sub.status);

// A Stripe subscription -> the event createBilling().apply() understands (the same shape as the stores').
// userId: the Nurvan account. at: when the event was made (ms), so an old one never undoes a newer one.
export function subscriptionEvent({ id, type, sub, userId, at }) {
  const product = productOfSub(sub);
  const base = { id, app_user_id: String(userId || ""), store: "STRIPE", product_id: product, event_timestamp_ms: at };
  const ended = type === "customer.subscription.deleted" || !isRunning(sub);
  if (ended) {
    if (sub && ["incomplete"].includes(sub.status)) return { ...base, type: "IGNORED" };
    return { ...base, type: "EXPIRATION" };
  }
  const end = periodEndMs(sub);
  if (!end || !planOfProduct(product)) return { ...base, type: "IGNORED" };
  // A subscription that stops at the end of the period ends exactly then; one that renews has a short grace
  // so that a late webhook does not drop a paying person.
  const until = sub.cancel_at_period_end ? end : end + GRACE_MS;
  return { ...base, type: "RENEWAL", expiration_at_ms: until };
}

// The best of the running subscriptions of a customer (the highest plan, then the latest end).
export function bestSubscription(subs) {
  let best = null;
  (subs || []).filter(isRunning).forEach((s) => {
    const plan = planOfProduct(productOfSub(s));
    if (!plan) return;
    if (!best || rank(plan) > best.rank || (rank(plan) === best.rank && (periodEndMs(s) || 0) > (periodEndMs(best.sub) || 0))) best = { sub: s, plan, rank: rank(plan) };
  });
  return best ? best.sub : null;
}

export function checkoutParams({ priceId, customerId, userId, baseUrl, trialDays, automaticTax }) {
  const p = {
    mode: "subscription",
    customer: customerId,
    client_reference_id: String(userId),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: baseUrl + "?checkout=success",
    cancel_url: baseUrl + "?checkout=cancel",
    allow_promotion_codes: "true",
    billing_address_collection: "auto",
    locale: "auto",
    subscription_data: { metadata: { user_id: String(userId) } },
    custom_text: { submit: { message: "Abbonandoti accetti i Termini di servizio (nurvan.app/termini) e che il servizio inizi subito. Si rinnova ogni periodo finché non lo annulli dal portale, quando vuoi." } }
  };
  if (trialDays > 0) p.subscription_data.trial_period_days = trialDays;
  if (automaticTax) { p.automatic_tax = { enabled: "true" }; p.customer_update = { address: "auto", name: "auto" }; }
  return p;
}

export function createStripe({ pool, initDb, billing, env = process.env, fetchImpl = globalThis.fetch }) {
  const secret = () => String(env.STRIPE_SECRET_KEY || "").trim();
  const whsec = () => String(env.STRIPE_WEBHOOK_SECRET || "").trim();
  const trialDays = () => { const n = Number(env.STRIPE_TRIAL_DAYS === undefined || env.STRIPE_TRIAL_DAYS === "" ? 30 : env.STRIPE_TRIAL_DAYS); return Number.isFinite(n) && n > 0 ? Math.min(90, Math.floor(n)) : 0; };
  const baseUrl = () => String(env.APP_PUBLIC_URL || "https://app.nurvan.app/").replace(/\/?$/, "/");
  const enabled = () => !!secret();

  async function call(method, path, body) {
    const r = await fetchImpl(API + path, {
      method,
      headers: { Authorization: "Bearer " + secret(), "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": String(env.STRIPE_API_VERSION || "2025-09-30.clover") },
      body: body ? formBody(body) : undefined
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error((json.error && json.error.message) || ("stripe " + r.status)), { statusCode: 502, stripe: json.error || null });
    return json;
  }

  const priceCache = new Map();
  async function priceFor(productId) {
    const hit = priceCache.get(productId);
    if (hit && hit.until > Date.now()) return hit.id;
    const list = await call("GET", "/prices?" + formBody({ lookup_keys: [productId], active: "true", limit: 1 }));
    const id = list.data && list.data[0] && list.data[0].id;
    if (!id) throw Object.assign(new Error("Prezzo non ancora configurato su Stripe."), { statusCode: 503 });
    priceCache.set(productId, { id, until: Date.now() + 600000 });
    return id;
  }

  async function row(userId) {
    await initDb();
    return (await pool.query("SELECT id, email, name, stripe_customer_id, stripe_trial_used_at FROM app_users WHERE id = $1", [userId])).rows[0] || null;
  }

  async function customerOf(u) {
    if (u.stripe_customer_id) return u.stripe_customer_id;
    const c = await call("POST", "/customers", { email: u.email, name: u.name || undefined, metadata: { user_id: String(u.id) } });
    const set = await pool.query("UPDATE app_users SET stripe_customer_id = COALESCE(stripe_customer_id, $2) WHERE id = $1 RETURNING stripe_customer_id", [u.id, c.id]);
    return set.rows[0].stripe_customer_id;
  }

  // What the page needs to draw the buttons.
  async function status(userId) {
    if (!enabled()) return { enabled: false };
    const u = await row(userId);
    if (!u) return { enabled: true, trialDays: 0, trialEligible: false, hasCustomer: false };
    const days = trialDays();
    return { enabled: true, trialDays: days, trialEligible: days > 0 && !u.stripe_trial_used_at, hasCustomer: !!u.stripe_customer_id };
  }

  async function checkout(userId, productId, now = Date.now()) {
    if (!enabled()) throw Object.assign(new Error("I pagamenti dal sito non sono ancora attivi."), { statusCode: 503, code: "NOT_CONFIGURED" });
    if (!allProductIds().includes(productId)) throw Object.assign(new Error("Piano non valido."), { statusCode: 400 });
    const u = await row(userId);
    if (!u) throw Object.assign(new Error("Account non trovato."), { statusCode: 404 });
    const acc = await loadAccount(pool, userId);
    const until = acc.planUntil ? Date.parse(acc.planUntil) : null;
    const running = acc.plan !== "free" && (until == null || until > now);
    if (running && (acc.planSource === "apple" || acc.planSource === "play")) {
      throw Object.assign(new Error("Hai già un abbonamento acquistato nell'app (" + (acc.planSource === "apple" ? "App Store" : "Google Play") + "): si gestisce da lì."), { statusCode: 409, code: "STORE_ACTIVE" });
    }
    if (running && acc.planSource === "stripe") {
      throw Object.assign(new Error("Hai già un abbonamento: per cambiarlo o annullarlo usa «Gestisci abbonamento»."), { statusCode: 409, code: "USE_PORTAL" });
    }
    const customerId = await customerOf(u);
    const priceId = await priceFor(productId);
    const days = trialDays();
    const params = checkoutParams({ priceId, customerId, userId, baseUrl: baseUrl(), trialDays: u.stripe_trial_used_at ? 0 : days, automaticTax: String(env.STRIPE_AUTOMATIC_TAX || "") === "1" });
    const session = await call("POST", "/checkout/sessions", params);
    return { url: session.url };
  }

  async function portal(userId) {
    if (!enabled()) throw Object.assign(new Error("I pagamenti dal sito non sono ancora attivi."), { statusCode: 503, code: "NOT_CONFIGURED" });
    const u = await row(userId);
    if (!u || !u.stripe_customer_id) throw Object.assign(new Error("Nessun abbonamento dal sito da gestire."), { statusCode: 404 });
    const body = { customer: u.stripe_customer_id, return_url: baseUrl() };
    if (env.STRIPE_PORTAL_CONFIG) body.configuration = String(env.STRIPE_PORTAL_CONFIG);
    const s = await call("POST", "/billing_portal/sessions", body);
    return { url: s.url };
  }

  async function userOfSubscription(sub) {
    const meta = sub && sub.metadata && sub.metadata.user_id;
    if (meta && /^\d{1,18}$/.test(String(meta))) return String(meta);
    const cust = typeof sub.customer === "string" ? sub.customer : sub.customer && sub.customer.id;
    if (!cust) return null;
    await initDb();
    const r = await pool.query("SELECT id FROM app_users WHERE stripe_customer_id = $1", [cust]);
    return r.rows[0] ? String(r.rows[0].id) : null;
  }

  // A running subscription of another store, or a higher plan given by hand, is not replaced by a web one.
  async function blockedByOther(userId, plan, now) {
    const acc = await loadAccount(pool, userId);
    const until = acc.planUntil ? Date.parse(acc.planUntil) : null;
    const running = acc.plan !== "free" && (until == null || until > now);
    return running && (acc.planSource === "apple" || acc.planSource === "play") && rank(acc.plan) >= rank(plan);
  }

  // A webhook, already verified.
  async function handleEvent(evt, now = Date.now()) {
    const type = String((evt && evt.type) || "");
    if (!/^customer\.subscription\.(created|updated|deleted)$/.test(type)) return { outcome: "ignored", reason: "type" };
    const sub = evt.data && evt.data.object;
    if (!sub) return { outcome: "ignored", reason: "no-object" };
    const userId = await userOfSubscription(sub);
    if (!userId) return { outcome: "ignored", reason: "no-account" };
    if (sub.trial_end && ["trialing", "active"].includes(sub.status)) {
      await pool.query("UPDATE app_users SET stripe_trial_used_at = COALESCE(stripe_trial_used_at, NOW()) WHERE id = $1", [userId]);
    }
    const event = subscriptionEvent({ id: String(evt.id), type, sub, userId, at: Number(evt.created) * 1000 || now });
    if (event.type === "IGNORED") return { outcome: "ignored", reason: "state" };
    if (event.type === "RENEWAL" && await blockedByOther(userId, planOfProduct(event.product_id), now)) return { outcome: "ignored", reason: "store-active" };
    return billing.apply(event, now);
  }

  // After the return from Checkout (the webhook can be a moment late): read the customer's subscriptions.
  async function sync(userId, now = Date.now()) {
    if (!enabled()) return { ok: false, reason: "not-configured" };
    const u = await row(userId);
    if (!u || !u.stripe_customer_id) return { ok: true, changed: false };
    const list = await call("GET", "/subscriptions?" + formBody({ customer: u.stripe_customer_id, status: "all", limit: 10 }));
    const subs = list.data || [];
    const best = bestSubscription(subs);
    const stamp = "sync:" + userId + ":" + now;
    if (best) {
      if (best.trial_end && ["trialing", "active"].includes(best.status)) await pool.query("UPDATE app_users SET stripe_trial_used_at = COALESCE(stripe_trial_used_at, NOW()) WHERE id = $1", [userId]);
      const ev = subscriptionEvent({ id: stamp, type: "customer.subscription.updated", sub: best, userId, at: now });
      if (ev.type !== "RENEWAL") return { ok: true, changed: false };
      if (await blockedByOther(userId, planOfProduct(ev.product_id), now)) return { ok: true, changed: false, reason: "store-active" };
      const out = await billing.apply(ev, now);
      return { ok: true, changed: out.outcome === "set" };
    }
    const acc = await loadAccount(pool, userId);
    if (acc.planSource === "stripe" && acc.plan !== "free") {
      const out = await billing.apply({ id: stamp, type: "EXPIRATION", app_user_id: String(userId), store: "STRIPE", event_timestamp_ms: now }, now);
      return { ok: true, changed: out.outcome === "downgraded" };
    }
    return { ok: true, changed: false };
  }

  return { enabled, status, checkout, portal, handleEvent, sync, whsec };
}

export function mountStripe(app, { pool, initDb, accountFromBearer, billing, env = process.env }) {
  const stripe = createStripe({ pool, initDb, billing, env });
  const authed = async (req, res) => {
    const auth = await accountFromBearer(req.headers.authorization);
    if (!auth) { res.status(401).json({ error: "Accedi al tuo account." }); return null; }
    return auth;
  };
  const fail = (res, err) => {
    const code = err && err.statusCode ? err.statusCode : 502;
    if (code >= 500) console.error("STRIPE", err && err.message);
    return res.status(code).json({ ok: false, error: code >= 500 && code !== 503 ? "Non riesco a contattare il sistema di pagamento. Riprova tra poco." : err.message, code: err && err.code });
  };

  app.get("/api/billing/stripe/status", async (req, res) => {
    const auth = await authed(req, res); if (!auth) return;
    try { return res.json({ ok: true, ...(await stripe.status(auth.id)) }); } catch (err) { return fail(res, err); }
  });
  app.post("/api/billing/stripe/checkout", async (req, res) => {
    const auth = await authed(req, res); if (!auth) return;
    try { return res.json({ ok: true, ...(await stripe.checkout(auth.id, String((req.body && req.body.productId) || ""))) }); } catch (err) { return fail(res, err); }
  });
  app.post("/api/billing/stripe/portal", async (req, res) => {
    const auth = await authed(req, res); if (!auth) return;
    try { return res.json({ ok: true, ...(await stripe.portal(auth.id)) }); } catch (err) { return fail(res, err); }
  });
  app.post("/api/billing/stripe/sync", async (req, res) => {
    const auth = await authed(req, res); if (!auth) return;
    try { return res.json(await stripe.sync(auth.id)); } catch (err) { return fail(res, err); }
  });
  // The body is read raw by the parser of coach-api.mjs (req.rawBody): the signature is of the exact bytes.
  app.post("/api/billing/stripe/webhook", async (req, res) => {
    const secret = stripe.whsec();
    if (!secret) return res.status(503).json({ error: "Webhook non configurato." });
    if (!verifySignature(req.rawBody, req.headers["stripe-signature"], secret)) return res.status(400).json({ error: "Firma non valida." });
    try {
      const out = await stripe.handleEvent(req.body);
      return res.json({ ok: true, outcome: out.outcome, reason: out.reason || undefined });
    } catch (err) {
      console.error("STRIPE_WEBHOOK", err && err.message);
      return res.status(500).json({ error: "Evento non applicato." });
    }
  });
  return stripe;
}
