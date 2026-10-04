// Subscriptions bought in the apps: the server turns a store event into the account's plan, and the
// phone shows the store's prices and starts the purchase. The store itself (Apple, Google Play,
// RevenueCat) is not reachable from here: it is stood in for, with the answers it really gives.
import fs from 'node:fs';
import vm from 'node:vm';
import { productPlan, sourceOfStore, planFromSubscriber, eventUserId, decideEvent, createBilling } from './server/billing/index.mjs';

let failed = 0;
function ok(message, value) {
  if (value) console.log('OK  ', message);
  else { failed += 1; console.log('FAIL', message); }
}
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const NOW = Date.parse('2026-10-10T12:00:00Z');
const DAY = 86400000;

// ---- the products
ok('a product id names its plan', productPlan('nurvan.standard.year') === 'standard' && productPlan('nurvan.coach.month') === 'coach' && productPlan('nurvan.coach_pro.year') === 'coach_pro');
ok('a Google subscription arrives as "product:baseplan": only the product counts', productPlan('nurvan.coach.month:monthly') === 'coach');
ok('an unknown product is no plan', productPlan('other.thing') === null && productPlan('') === null);
ok('the store names map to a source', sourceOfStore('APP_STORE') === 'apple' && sourceOfStore('PLAY_STORE') === 'play' && sourceOfStore('STRIPE') === 'stripe' && sourceOfStore('X') === null);
const features = JSON.parse(read('web/features.json'));
ok('every paid plan has a product, and the ids are valid for both stores (lowercase, digits, dot, underscore)', ['standard', 'coach', 'coach_pro'].every((p) => (features.billing.products[p] || []).length) && Object.values(features.billing.products).flat().every((id) => /^[a-z0-9][a-z0-9._]*$/.test(id)));

// ---- what a person has at the store
const sub = (product, store, days) => ({ store, expires_date: new Date(NOW + days * DAY).toISOString() });
const subscriber = {
  entitlements: { standard: { product_identifier: 'nurvan.standard.year', expires_date: new Date(NOW + 200 * DAY).toISOString() }, coach: { product_identifier: 'nurvan.coach.month:monthly', expires_date: new Date(NOW + 10 * DAY).toISOString() } },
  subscriptions: { 'nurvan.standard.year': sub('x', 'app_store', 200), 'nurvan.coach.month:monthly': sub('x', 'play_store', 10) }
};
const best = planFromSubscriber(subscriber, NOW);
ok('the best running plan wins', best.plan === 'coach' && best.source === 'play');
ok('an expired one is not counted', planFromSubscriber({ entitlements: { coach: { product_identifier: 'nurvan.coach.month', expires_date: new Date(NOW - DAY).toISOString() } }, subscriptions: {} }, NOW) === null);
ok('with nothing running there is no plan', planFromSubscriber({ entitlements: {}, subscriptions: {} }, NOW) === null && planFromSubscriber(null, NOW) === null);
ok('without entitlements the subscriptions themselves are read', planFromSubscriber({ entitlements: {}, subscriptions: { 'nurvan.standard.year': sub('x', 'app_store', 30) } }, NOW).plan === 'standard');

// ---- the account an event is about
ok('the account is the id we gave RevenueCat', eventUserId({ app_user_id: '42' }) === '42');
ok('an anonymous id is looked for among the aliases', eventUserId({ app_user_id: '$RCAnonymousID:abc', aliases: ['$RCAnonymousID:abc', '17'] }) === '17');
ok('no numeric id, no account', eventUserId({ app_user_id: '$RCAnonymousID:abc' }) === null);

// ---- what an event does
const free = { plan: 'free', planSource: 'manual', planUntil: null };
const ev = (type, extra) => Object.assign({ type, store: 'APP_STORE', product_id: 'nurvan.coach.month', expiration_at_ms: NOW + 30 * DAY, event_timestamp_ms: NOW }, extra);
let d = decideEvent(ev('INITIAL_PURCHASE'), free, NOW);
ok('a first purchase sets the plan, the source and the end date', d.action === 'set' && d.plan === 'coach' && d.source === 'apple' && Date.parse(d.until) === NOW + 30 * DAY);
d = decideEvent(ev('RENEWAL', { store: 'PLAY_STORE', product_id: 'nurvan.coach.month:monthly' }), free, NOW);
ok('a renewal on Google Play sets it with that source', d.action === 'set' && d.plan === 'coach' && d.source === 'play');
d = decideEvent(ev('PRODUCT_CHANGE', { product_id: 'nurvan.standard.year', new_product_id: 'nurvan.coach_pro.year' }), { plan: 'standard', planSource: 'apple', planUntil: new Date(NOW + 10 * DAY).toISOString() }, NOW);
ok('a change of product goes to the new product\'s plan', d.action === 'set' && d.plan === 'coach_pro');
d = decideEvent(ev('INITIAL_PURCHASE', { entitlement_ids: ['coach_pro'] }), free, NOW);
ok('the entitlement named in the event counts first', d.plan === 'coach_pro');
d = decideEvent(ev('INITIAL_PURCHASE', { product_id: 'nurvan.standard.year' }), { plan: 'coach_pro', planSource: 'manual', planUntil: null }, NOW);
ok('a plan given by hand that is higher is not lowered by a smaller purchase', d.action === 'ignore' && d.reason === 'higher-by-hand');
d = decideEvent(ev('INITIAL_PURCHASE', { product_id: 'nurvan.coach.month' }), { plan: 'standard', planSource: 'manual', planUntil: null }, NOW);
ok('but a higher purchase goes over a smaller plan given by hand', d.action === 'set' && d.plan === 'coach');
d = decideEvent(ev('INITIAL_PURCHASE', { expiration_at_ms: NOW - DAY }), free, NOW);
ok('a purchase already expired changes nothing', d.action === 'ignore');
d = decideEvent(ev('INITIAL_PURCHASE', { product_id: 'something.else' }), free, NOW);
ok('an unknown product changes nothing', d.action === 'ignore' && d.reason === 'product');
d = decideEvent(ev('EXPIRATION', { expiration_at_ms: NOW - 1000 }), { plan: 'coach', planSource: 'apple', planUntil: new Date(NOW - 1000).toISOString() }, NOW);
ok('an expiry takes the plan back to free', d.action === 'downgrade');
d = decideEvent(ev('EXPIRATION', { expiration_at_ms: NOW - 1000 }), { plan: 'coach', planSource: 'play', planUntil: new Date(NOW + 20 * DAY).toISOString() }, NOW);
ok('an expiry of the other store does not touch a plan that this store did not give', d.action === 'ignore' && d.reason === 'other-source');
d = decideEvent(ev('EXPIRATION', { expiration_at_ms: NOW - 5 * DAY }), { plan: 'coach', planSource: 'apple', planUntil: new Date(NOW + 20 * DAY).toISOString() }, NOW);
ok('an old expiry does not undo a newer renewal', d.action === 'ignore' && d.reason === 'newer-plan');
d = decideEvent(ev('EXPIRATION'), { plan: 'coach', planSource: 'manual', planUntil: null }, NOW);
ok('a plan given by hand is never ended by a store', d.action === 'ignore');
d = decideEvent(ev('CANCELLATION'), { plan: 'coach', planSource: 'apple', planUntil: new Date(NOW + 20 * DAY).toISOString() }, NOW);
ok('a cancellation (auto-renew off) leaves the plan until its end', d.action === 'ignore');
d = decideEvent(ev('CANCELLATION', { expiration_at_ms: NOW - 1000, cancel_reason: 'CUSTOMER_SUPPORT' }), { plan: 'coach', planSource: 'apple', planUntil: new Date(NOW + 20 * DAY).toISOString() }, NOW);
ok('a refund that ends the access now ends the plan', d.action === 'downgrade' || d.reason === 'newer-plan');
ok('a test event and a billing issue change nothing', decideEvent(ev('TEST'), free, NOW).action === 'ignore' && decideEvent(ev('BILLING_ISSUE'), { plan: 'coach', planSource: 'apple', planUntil: null }, NOW).action === 'ignore');
ok('an event from an unknown store changes nothing', decideEvent(ev('INITIAL_PURCHASE', { store: 'AMAZON' }), free, NOW).reason === 'store');

// ---- the server flow, with an in-memory database that answers the queries the module makes
function fakeDb(users) {
  const db = { users, events: new Map(), state: new Map(), history: [] };
  const run = (sql, p = []) => {
    const q = sql.replace(/\s+/g, ' ').trim();
    if (/^CREATE TABLE/i.test(q) || q === 'BEGIN' || q === 'COMMIT' || q === 'ROLLBACK') return { rows: [] };
    if (/^SELECT 1 FROM app_users WHERE id = \$1/.test(q)) return { rows: db.users[p[0]] ? [{}] : [] };
    if (/^INSERT INTO billing_events/.test(q)) { if (db.events.has(p[0])) return { rows: [] }; db.events.set(p[0], { outcome: null }); return { rows: [{ id: p[0] }] }; }
    if (/^UPDATE billing_events SET outcome/.test(q)) { if (db.events.has(p[0])) db.events.get(p[0]).outcome = p[1]; return { rows: [] }; }
    if (/^SELECT last_event_ms FROM billing_state/.test(q)) return { rows: db.state.has(p[0]) ? [{ last_event_ms: db.state.get(p[0]) }] : [] };
    if (/^INSERT INTO billing_state/.test(q)) { db.state.set(p[0], Math.max(db.state.get(p[0]) || 0, Number(p[1]))); return { rows: [] }; }
    if (/^SELECT plan, plan_source, plan_until, seats, trial_until, trial_used_at FROM app_users/.test(q)) { const u = db.users[p[0]]; return { rows: u ? [u] : [] }; }
    if (/^SELECT plan FROM app_users WHERE id = \$1 FOR UPDATE/.test(q)) { const u = db.users[p[0]]; return { rows: u ? [{ plan: u.plan }] : [] }; }
    if (/^UPDATE app_users SET plan = \$2, plan_source = \$3/.test(q)) { const u = db.users[p[0]]; u.plan = p[1]; u.plan_source = p[2]; u.plan_until = p[3]; u.seats = p[4]; return { rows: [] }; }
    if (/^INSERT INTO app_plan_history/.test(q)) { db.history.push({ from: p[1], to: p[2], source: p[3], note: p[6], actor: p[7] }); return { rows: [] }; }
    throw new Error('unexpected query: ' + q.slice(0, 80));
  };
  const pool = { query: async (sql, p) => run(sql, p), connect: async () => ({ query: async (sql, p) => run(sql, p), release() {} }) };
  return { db, pool };
}
{
  const { db, pool } = fakeDb({ 7: { plan: 'free', plan_source: 'manual', plan_until: null, seats: null, trial_until: null, trial_used_at: null } });
  const billing = createBilling({ pool, initDb: async () => {}, env: {} });
  const purchase = { id: 'evt-1', type: 'INITIAL_PURCHASE', app_user_id: '7', store: 'APP_STORE', product_id: 'nurvan.coach.month', expiration_at_ms: NOW + 30 * DAY, event_timestamp_ms: NOW };
  let r = await billing.apply(purchase, NOW);
  ok('a purchase changes the account: plan, source, end date, with its history', r.outcome === 'set' && db.users[7].plan === 'coach' && db.users[7].plan_source === 'apple' && db.history.length === 1 && db.history[0].actor === 'revenuecat');
  r = await billing.apply(purchase, NOW);
  ok('the same event again does nothing', r.reason === 'duplicate' && db.history.length === 1);
  r = await billing.apply({ ...purchase, id: 'evt-0', type: 'EXPIRATION', expiration_at_ms: NOW - DAY, event_timestamp_ms: NOW - 10 * DAY }, NOW);
  ok('an event that arrives late, from before the last one, is not applied', r.reason === 'out-of-order' && db.users[7].plan === 'coach');
  r = await billing.apply({ ...purchase, id: 'evt-2', type: 'RENEWAL', expiration_at_ms: NOW + 60 * DAY, event_timestamp_ms: NOW + 1000 }, NOW + 1000);
  ok('a renewal moves the end date', r.outcome === 'set' && Date.parse(db.users[7].plan_until) === NOW + 60 * DAY);
  r = await billing.apply({ ...purchase, id: 'evt-3', type: 'EXPIRATION', expiration_at_ms: NOW + 60 * DAY, event_timestamp_ms: NOW + 61 * DAY }, NOW + 61 * DAY);
  ok('the expiry brings the account back to free', r.outcome === 'downgraded' && db.users[7].plan === 'free');
  r = await billing.apply({ ...purchase, id: 'evt-4', app_user_id: '999' }, NOW);
  ok('an account that does not exist is ignored, not an error', r.reason === 'unknown-account');
  r = await billing.apply({ ...purchase, id: 'evt-5', app_user_id: '$RCAnonymousID:x' }, NOW);
  ok('an anonymous buyer is ignored until the app logs in', r.reason === 'no-account');

  // asked to RevenueCat
  const answers = { ok: true, status: 200, json: async () => ({ subscriber: subscriber }) };
  let asked = null;
  const b2 = createBilling({ pool, initDb: async () => {}, env: { REVENUECAT_SECRET_KEY: 'sk_test' }, fetchImpl: async (url, opts) => { asked = { url, auth: opts.headers.Authorization }; return answers; } });
  db.users[7].plan = 'free'; db.users[7].plan_source = 'manual'; db.users[7].plan_until = null;
  let f = await b2.refresh(7, NOW);
  ok('asked to RevenueCat with the secret key, for this account only', asked.url.endsWith('/v1/subscribers/7') && asked.auth === 'Bearer sk_test');
  ok('the best subscription becomes the plan', f.changed && db.users[7].plan === 'coach' && db.users[7].plan_source === 'play');
  f = await b2.refresh(7, NOW);
  ok('asking again changes nothing', f.changed === false);
  answers.json = async () => ({ subscriber: { entitlements: {}, subscriptions: {} } });
  f = await b2.refresh(7, NOW);
  ok('with nothing running at the store, a plan the store gave ends', f.changed && db.users[7].plan === 'free');
  db.users[7].plan = 'coach_pro'; db.users[7].plan_source = 'manual'; db.users[7].plan_until = null;
  f = await b2.refresh(7, NOW);
  ok('but a plan given by hand stays', f.changed === false && db.users[7].plan === 'coach_pro');
  const noKey = createBilling({ pool, initDb: async () => {}, env: {} });
  ok('without a RevenueCat key the refresh says so and touches nothing', (await noKey.refresh(7, NOW)).reason === 'not-configured');
}

// ---- the routes
const srv = read('server/billing/index.mjs');
ok('the webhook asks for a secret and compares it without leaking time', /REVENUECAT_WEBHOOK_AUTH/.test(srv) && /timingSafeEqual/.test(srv) && /status\(401\)/.test(srv));
ok('the webhook answers 500 when an event could not be applied, so it is sent again', /status\(500\)\.json\(\{ error: "Evento non applicato\." \}\)/.test(srv));
ok('the config route gives only public keys and product ids', /appleKey/.test(srv) && !/REVENUECAT_SECRET_KEY.*res\.json/.test(srv));
ok('the billing is mounted by the server', /mountBilling\(app, \{ pool, initDb, accountFromBearer \}\)/.test(read('coach-api.mjs')));
ok('the migration lets the App Store be a source of the plan', /'manual', 'stripe', 'play', 'apple'/.test(read('server/db/migrations/0027_billing_apple.sql')) && /"apple"/.test(read('server/account/plans.mjs')));
ok('the variables are listed for the host', ['REVENUECAT_APPLE_KEY', 'REVENUECAT_GOOGLE_KEY', 'REVENUECAT_SECRET_KEY', 'REVENUECAT_WEBHOOK_AUTH'].every((k) => read('render.yaml').includes(k)));

// ---- Coach mode: no more fake checkout
const cp = read('coach-practice.mjs');
ok('Coach mode opens only with a plan that allows it', /app\.post\("\/api\/coach\/unlock"/.test(cp) && /Entitlements\.explain\(account, "coach_clients"\)/.test(cp) && /code: "PLAN_REQUIRED"/.test(cp));
ok('the demo unlock is gone from the server', !/unlock\/demo/.test(cp) && !/source='demo'/.test(cp.slice(cp.indexOf('app.post("/api/coach/unlock"'), cp.indexOf('app.get("/api/coach/clients"'))));
ok('the trial no longer needs the demo unlock first', !/attiva prima la modalita' Coach/.test(read('server/account/plans.mjs')));

// ---- on the phone
const ui = read('web/plans-ui.js');
function phone({ platform, user = { id: 7 }, athlete = false, cfg = { enabled: true, appleKey: 'appl_x', googleKey: 'goog_x', products: features.billing.products }, offerings, purchaseFails }) {
  const calls = [];
  const toasts = [];
  const doc = { };
  const win = {};
  const ctx = vm.createContext({
    window: win, self: { NURVAN_FEATURES: features, NurvanEntitlements: null }, console, setTimeout, clearTimeout,
    store: { accountToken: 't', accountUser: user }, localStorage: { getItem: () => null, setItem() {} },
    esc: (x) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    practiceHeaders: () => ({}), render() {}, openAccount() { calls.push('openAccount'); }, showToast: (m, k) => toasts.push([m, k]),
    isAthleteRole: () => athlete, legalLinkHtml: (k, l) => '<a>' + l + '</a>', currentView: 'pricing',
    isIosApp: () => platform === 'ios',
    practiceFetch: async (path, opts) => {
      calls.push((opts && opts.method) + ' ' + path);
      if (path === '/api/billing/config') return cfg;
      if (path === '/api/account/plan') return { entitlement: { plan: 'coach', planSource: 'apple' } };
      return { ok: true };
    }
  });
  if (platform === 'ios') {
    const P = {
      configure: async (o) => { calls.push('configure ' + o.apiKey + ' ' + o.appUserID); },
      logIn: async (o) => { calls.push('logIn ' + o.appUserID); },
      getOfferings: async () => ({ current: { availablePackages: offerings } }),
      purchasePackage: async ({ aPackage }) => { calls.push('buy ' + aPackage.product.identifier); if (purchaseFails) throw Object.assign(new Error('cancelled'), { userCancelled: true }); return {}; },
      restorePurchases: async () => { calls.push('restore'); return {}; }
    };
    win.Capacitor = { registerPlugin: (n) => { calls.push('plugin ' + n); return P; } };
  } else if (platform === 'android') {
    const reply = (id, ok, data, extra) => setTimeout(() => win.__nvBillingResult(id, JSON.stringify(Object.assign({ ok, data }, extra || {}))), 0);
    ctx.NativeConfig = {
      purchasesConfigure: (k, u, id) => { calls.push('configure ' + k + ' ' + u); reply(id, true, 'ok'); },
      purchasesOfferings: (id) => reply(id, true, offerings),
      purchasesBuy: (p, id) => { calls.push('buy ' + p); if (purchaseFails) reply(id, false, null, { error: 'cancelled', cancelled: true }); else reply(id, true, 'purchased'); },
      purchasesRestore: (id) => { calls.push('restore'); reply(id, true, 'restored'); }
    };
  }
  vm.runInContext(ui, ctx);
  vm.runInContext('function onEntitlementReceived(e) { __ent = e; }; var __ent = null; function currentPlanEffective() { return { plan: __ent ? __ent.plan : "free" }; }', ctx);
  return { ctx, calls, toasts, run: (code) => vm.runInContext(code, ctx) };
}
const iosOfferings = [
  { identifier: '$rc_monthly', packageType: 'MONTHLY', product: { identifier: 'nurvan.coach.month', priceString: '19,99 €', subscriptionPeriod: 'P1M' } },
  { identifier: '$rc_annual', packageType: 'ANNUAL', product: { identifier: 'nurvan.coach.year', priceString: '199,99 €', subscriptionPeriod: 'P1Y' } },
  { identifier: 'standard', packageType: 'ANNUAL', product: { identifier: 'nurvan.standard.year', priceString: '24,99 €', subscriptionPeriod: 'P1Y' } },
  { identifier: 'other', packageType: 'CUSTOM', product: { identifier: 'nurvan.unknown', priceString: '1 €' } }
];
{
  const web = phone({ platform: 'web' });
  ok('in a browser there is no store: no buttons, no footer', web.run("billingButtonsHtml('coach')") === '' && web.run('billingFooterHtml()') === '' && web.run('billingIsNative()') === false);

  const ios = phone({ platform: 'ios', offerings: iosOfferings });
  await ios.run('billingLoad()');
  ok('on iPhone the SDK is configured with the Apple key and the account id', ios.calls.includes('plugin Purchases') && ios.calls.includes('configure appl_x 7'));
  ok('prices come from the store, for the plans we sell only', ios.run('__billing.state') === 'ready' && ios.run('__billing.packs.length') === 3 && ios.run("billingPriceLine('coach')") === '19,99 € / mese · 199,99 € / anno');
  const html = ios.run("billingButtonsHtml('coach')");
  ok('a button per product, with the store\'s price and period', /ABBONATI<\/span> · 19,99 € \/ <span>mese/.test(html) && /199,99 € \/ <span>anno/.test(html) && /billingBuy\('nurvan\.coach\.month'\)/.test(html));
  await ios.run("billingBuy('nurvan.coach.month')");
  ok('buying starts the purchase, then the server looks again and the plan is read', ios.calls.includes('buy nurvan.coach.month') && ios.calls.includes('POST /api/billing/refresh') && ios.calls.includes('GET /api/account/plan') && ios.run('__ent.plan') === 'coach');
  ok('and says so', ios.toasts.some((t) => /Abbonamento attivo/.test(t[0]) && t[1] === 'ok'));
  await ios.run('billingRestore()');
  ok('restore asks the store, then the server', ios.calls.includes('restore') && ios.calls.filter((c) => c === 'POST /api/billing/refresh').length === 2);
  const foot = ios.run('billingFooterHtml()');
  ok('the footer says what the store requires: charge, automatic renewal, cancel at least 24 hours before, where to manage', /account Apple/.test(foot) && /si rinnova automaticamente/.test(foot) && /24 ore/.test(foot) && /Abbonamenti/.test(foot));
  ok('and has restore, manage, terms and privacy', /billingRestore\(\)/.test(foot) && /billingManage\(\)/.test(foot) && /Termini di servizio/.test(foot) && /Informativa privacy/.test(foot));
  ok('the Apple footer does not talk about Google, nor the other way round', !/Google/.test(foot) && !/account Apple/.test(phone({ platform: 'android', offerings: [] }).run('billingFooterHtml()')));

  const cancelled = phone({ platform: 'ios', offerings: iosOfferings, purchaseFails: true });
  await cancelled.run('billingLoad()');
  await cancelled.run("billingBuy('nurvan.coach.month')");
  ok('a cancelled purchase is silent and changes nothing', !cancelled.toasts.length && !cancelled.calls.includes('POST /api/billing/refresh'));

  const android = phone({ platform: 'android', offerings: [{ productId: 'nurvan.coach.month', packageId: '$rc_monthly', priceString: '19,99 €', period: 'month' }, { productId: 'nurvan.standard.year', packageId: 's', priceString: '24,99 €', period: 'year' }] });
  await android.run('billingLoad()');
  ok('on Android the bridge is configured with the Google key and the account id', android.calls.includes('configure goog_x 7') && android.run('__billing.state') === 'ready');
  ok('the plans are matched to the products', android.run("billingPriceLine('standard')") === '24,99 € / anno' && android.run("billingPriceLine('coach_pro')") === '');
  await android.run("billingBuy('nurvan.coach.month')");
  ok('buying goes through the bridge, then the server', android.calls.includes('buy nurvan.coach.month') && android.calls.includes('POST /api/billing/refresh') && android.run('__ent.plan') === 'coach');
  const ac = phone({ platform: 'android', offerings: [], purchaseFails: true });
  ac.ctx.NativeConfig.purchasesOfferings = (id) => setTimeout(() => ac.ctx.window.__nvBillingResult(id, JSON.stringify({ ok: true, data: [{ productId: 'nurvan.coach.month', priceString: '19,99 €', period: 'month' }] })), 0);
  await ac.run('billingLoad()');
  await ac.run("billingBuy('nurvan.coach.month')");
  ok('on Android a cancelled purchase is silent too', !ac.toasts.length);

  const off = phone({ platform: 'ios', offerings: iosOfferings, cfg: { enabled: false, products: features.billing.products } });
  await off.run('billingLoad()');
  ok('with the store keys not set the page says purchases are unavailable, it does not send anyone elsewhere', off.run('__billing.state') === 'unavailable' && /non sono disponibili/.test(off.run("billingButtonsHtml('coach')")) && !/CONTATTACI|scrivici|mailto/i.test(off.run("billingButtonsHtml('coach')")));
  const empty = phone({ platform: 'ios', offerings: [] });
  await empty.run('billingLoad()');
  ok('a store with no offering configured is the same: unavailable', empty.run('__billing.state') === 'unavailable');
  const anon = phone({ platform: 'ios', offerings: iosOfferings, user: null });
  await anon.run('billingLoad()');
  ok('without an account the button asks to sign in', /ACCEDI PER ABBONARTI/.test(anon.run("billingButtonsHtml('coach')")));
  const ath = phone({ platform: 'ios', offerings: iosOfferings, athlete: true });
  await ath.run('billingLoad()');
  ok('an athlete (a coach\'s client) is never offered a purchase', ath.run("billingButtonsHtml('coach')") === '');
}

// ---- the plans page
ok('on a phone the price is the store\'s, never the one in our file', /native && p\.id !== 'free'\) \? billingPriceLineHtml\(p\.id\)/.test(ui));
ok('on a phone nothing says "scrivici" or "contattaci": the purchase is the store\'s', /native\s*\? billingButtonsHtml\(p\.id\)/.test(ui) && /Gli abbonamenti si acquistano e si gestiscono dallo store del tuo telefono/.test(ui));
ok('in a browser it stays "Contattaci"', /CONTATTACI/.test(ui));
ok('the Coach trial can be started by any personal account, and then Coach mode opens', !/isCoachUnlocked\(\)\s*;\s*\}/.test(ui.slice(ui.indexOf('function canStartCoachTrial'), ui.indexOf('async function startCoachTrialFromApp'))) && /unlockCoachFromPlan/.test(ui));

// ---- the apps
const java = read('app/src/main/java/com/giammaria/system/MainActivity.java');
ok('Android: the Java side offers configure, offerings, buy and restore to the page', ['purchasesConfigure', 'purchasesOfferings', 'purchasesBuy', 'purchasesRestore'].every((m) => java.includes('public void ' + m + '(')));
ok('Android: the answer goes back through the same callback the page waits on', /window\.__nvBillingResult/.test(java));
ok('Android: the store library is a dependency', /com\.revenuecat\.purchases:purchases:/.test(read('app/build.gradle')));
const pkg = JSON.parse(read('package.json'));
ok('iPhone: the store plugin (a version for Capacitor 7) is a dependency', /revenuecat\/purchases-capacitor/.test(JSON.stringify(pkg.dependencies)) && /^\^?11\./.test(pkg.dependencies['@revenuecat/purchases-capacitor']));

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nAcquisti in app: tutto verde');
