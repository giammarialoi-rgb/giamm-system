// Subscriptions bought on the website with Stripe: the signed webhook, what a Stripe subscription means for the
// plan, the Checkout request, and the plans page in a browser. Stripe itself is not reachable from here: it is stood
// in for with the answers it really gives (and the flow against a real PostgreSQL is in tmp-debug/e2e/stripe_e2e.mjs).
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import { formEncode, formBody, verifySignature, subscriptionEvent, bestSubscription, checkoutParams, planOfProduct, allProductIds, createStripe } from './server/billing/stripe.mjs';
import { decideEvent } from './server/billing/index.mjs';

let failed = 0;
function ok(message, value) {
  if (value) console.log('OK  ', message);
  else { failed += 1; console.log('FAIL', message); }
}
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const NOW = Date.parse('2026-10-10T12:00:00Z');
const DAY = 86400000;

// ---- forms
ok('a form: nested objects and lists use brackets', formBody({ a: 1, b: { c: 'x y' }, d: [{ e: 2 }, { e: 3 }], skip: undefined, none: null }) === 'a=1&b%5Bc%5D=x%20y&d%5B0%5D%5Be%5D=2&d%5B1%5D%5Be%5D=3');
ok('lookup keys go as a list', formBody({ lookup_keys: ['nurvan.coach.month'], limit: 1 }) === 'lookup_keys%5B0%5D=nurvan.coach.month&limit=1');

// ---- the signature
const secret = 'whsec_test_secret';
const body = JSON.stringify({ id: 'evt_1', type: 'customer.subscription.updated' });
const sign = (b, t, s = secret) => 't=' + t + ',v1=' + crypto.createHmac('sha256', s).update(t + '.' + b).digest('hex');
const t0 = Math.floor(NOW / 1000);
ok('a good signature passes', verifySignature(Buffer.from(body), sign(body, t0), secret, NOW));
ok('another secret does not', !verifySignature(Buffer.from(body), sign(body, t0, 'whsec_other'), secret, NOW));
ok('a changed body does not', !verifySignature(Buffer.from(body + ' '), sign(body, t0), secret, NOW));
ok('an old signature does not (replay)', !verifySignature(Buffer.from(body), sign(body, t0 - 3600), secret, NOW));
ok('no header, no secret, no body: no', !verifySignature(Buffer.from(body), '', secret, NOW) && !verifySignature(Buffer.from(body), sign(body, t0), '', NOW) && !verifySignature(null, sign(body, t0), secret, NOW));
ok('two v1 (key rolling): one good is enough', verifySignature(Buffer.from(body), 't=' + t0 + ',v1=00,' + sign(body, t0).split(',')[1], secret, NOW));

// ---- products
ok('the product ids are the ones of the plans', allProductIds().length === 5 && planOfProduct('nurvan.coach_pro.year') === 'coach_pro' && planOfProduct('nope') === null);

// ---- a Stripe subscription as an event
const subOf = (o) => Object.assign({ id: 'sub_1', status: 'active', customer: 'cus_1', cancel_at_period_end: false, current_period_end: Math.floor((NOW + 20 * DAY) / 1000), metadata: { user_id: '42' }, items: { data: [{ price: { lookup_key: 'nurvan.coach.month' } }] } }, o);
let ev = subscriptionEvent({ id: 'evt_a', type: 'customer.subscription.updated', sub: subOf(), userId: '42', at: NOW });
ok('a running subscription renews the plan, with two days of grace', ev.type === 'RENEWAL' && ev.store === 'STRIPE' && ev.product_id === 'nurvan.coach.month' && ev.expiration_at_ms === NOW + 22 * DAY && ev.app_user_id === '42');
ev = subscriptionEvent({ id: 'evt_b', type: 'customer.subscription.updated', sub: subOf({ cancel_at_period_end: true }), userId: '42', at: NOW });
ok('one that stops at the end of the period ends exactly then', ev.type === 'RENEWAL' && ev.expiration_at_ms === NOW + 20 * DAY);
ev = subscriptionEvent({ id: 'evt_c', type: 'customer.subscription.updated', sub: subOf({ status: 'trialing' }), userId: '42', at: NOW });
ok('the free month is a running subscription', ev.type === 'RENEWAL');
ev = subscriptionEvent({ id: 'evt_d', type: 'customer.subscription.updated', sub: subOf({ status: 'past_due' }), userId: '42', at: NOW });
ok('a payment that failed keeps the plan until the period ends (Stripe retries)', ev.type === 'RENEWAL');
ok('canceled, unpaid, expired: the plan ends', ['canceled', 'unpaid', 'incomplete_expired'].every((status) => subscriptionEvent({ id: 'e', type: 'customer.subscription.updated', sub: subOf({ status }), userId: '42', at: NOW }).type === 'EXPIRATION'));
ok('deleted ends it whatever the state says', subscriptionEvent({ id: 'e', type: 'customer.subscription.deleted', sub: subOf(), userId: '42', at: NOW }).type === 'EXPIRATION');
ok('a payment still to be made is not a plan yet', subscriptionEvent({ id: 'e', type: 'customer.subscription.created', sub: subOf({ status: 'incomplete' }), userId: '42', at: NOW }).type === 'IGNORED');
ok('a product that is not ours is ignored', subscriptionEvent({ id: 'e', type: 'customer.subscription.updated', sub: subOf({ items: { data: [{ price: { lookup_key: 'other' } }] } }), userId: '42', at: NOW }).type === 'IGNORED');
ok('the period end can be on the item (newer Stripe versions)', subscriptionEvent({ id: 'e', type: 'customer.subscription.updated', sub: subOf({ current_period_end: undefined, items: { data: [{ current_period_end: Math.floor((NOW + 5 * DAY) / 1000), price: { lookup_key: 'nurvan.coach.month' } }] } }), userId: '42', at: NOW }).expiration_at_ms === NOW + 7 * DAY);

// what the shared rules do with it
const account = (plan, source, days) => ({ plan, planSource: source, planUntil: days == null ? null : new Date(NOW + days * DAY).toISOString() });
let d = decideEvent(subscriptionEvent({ id: 'e', type: 'customer.subscription.updated', sub: subOf(), userId: '42', at: NOW }), account('free', 'manual', null), NOW);
ok('the plan is given, from stripe', d.action === 'set' && d.plan === 'coach' && d.source === 'stripe');
d = decideEvent(subscriptionEvent({ id: 'e', type: 'customer.subscription.deleted', sub: subOf(), userId: '42', at: NOW }), account('coach', 'stripe', 22), NOW);
ok('the end of the subscription takes the plan back, even inside the grace', d.action === 'downgrade');
d = decideEvent(subscriptionEvent({ id: 'e', type: 'customer.subscription.deleted', sub: subOf(), userId: '42', at: NOW }), account('coach', 'apple', 22), NOW);
ok('but never the one of the App Store', d.action === 'ignore');
d = decideEvent(subscriptionEvent({ id: 'e', type: 'customer.subscription.updated', sub: subOf(), userId: '42', at: NOW }), account('coach_pro', 'manual', null), NOW);
ok('and a higher plan given by hand stays', d.action === 'ignore');

// the best of several
const s1 = subOf({ id: 'a', items: { data: [{ price: { lookup_key: 'nurvan.standard.year' } }] } });
const s2 = subOf({ id: 'b', items: { data: [{ price: { lookup_key: 'nurvan.coach_pro.month' } }] } });
const s3 = subOf({ id: 'c', status: 'canceled', items: { data: [{ price: { lookup_key: 'nurvan.coach_pro.year' } }] } });
ok('the best running subscription wins; a canceled one does not count', bestSubscription([s1, s2, s3]).id === 'b' && bestSubscription([s3]) === null && bestSubscription([]) === null);

// ---- the Checkout request
const p = checkoutParams({ priceId: 'price_1', customerId: 'cus_1', userId: '42', baseUrl: 'https://app.nurvan.app/', trialDays: 30, automaticTax: false });
ok('Checkout: a subscription, for this account, with the free month, back to the app', p.mode === 'subscription' && p.client_reference_id === '42' && p.subscription_data.trial_period_days === 30 && p.subscription_data.metadata.user_id === '42' && p.success_url === 'https://app.nurvan.app/?checkout=success' && p.line_items[0].price === 'price_1');
ok('Checkout: no trial when it was used', checkoutParams({ priceId: 'x', customerId: 'c', userId: '1', baseUrl: 'https://a/', trialDays: 0 }).subscription_data.trial_period_days === undefined);
ok('Checkout: tax collection only when switched on', !p.automatic_tax && checkoutParams({ priceId: 'x', customerId: 'c', userId: '1', baseUrl: 'https://a/', trialDays: 0, automaticTax: true }).automatic_tax.enabled === 'true');
ok('Checkout: the terms are named next to the button', /Termini di servizio/.test(p.custom_text.submit.message));

// ---- the server side with a database and Stripe stood in for
function fakeDb(account) {
  const state = { calls: [], account };
  const pool = {
    async query(sql, params) {
      state.calls.push(sql);
      if (/FROM app_users WHERE id/.test(sql) && /stripe_customer_id/.test(sql)) return { rows: [{ id: 42, email: 'a@b.it', name: 'A', stripe_customer_id: state.customer || null, stripe_trial_used_at: state.trialUsed || null }] };
      if (/UPDATE app_users SET stripe_customer_id/.test(sql)) { state.customer = params[1]; return { rows: [{ stripe_customer_id: params[1] }] }; }
      if (/SELECT plan, plan_source, plan_until/.test(sql)) return { rows: [{ plan: state.account.plan, plan_source: state.account.planSource, plan_until: state.account.planUntil, seats: 0 }] };
      return { rows: [] };
    }
  };
  return { pool, state };
}
{
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, method: init.method, body: init.body });
    const j = (o) => ({ ok: true, json: async () => o });
    if (/\/customers$/.test(url)) return j({ id: 'cus_new' });
    if (/\/prices\?/.test(url)) return j({ data: [{ id: 'price_coach_month' }] });
    if (/checkout\/sessions$/.test(url)) return j({ url: 'https://checkout.stripe.com/c/pay/cs_1' });
    if (/billing_portal\/sessions$/.test(url)) return j({ url: 'https://billing.stripe.com/p/session/x' });
    return j({});
  };
  const env = { STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: secret, APP_PUBLIC_URL: 'https://app.nurvan.app/' };
  let { pool, state } = fakeDb({ plan: 'free', planSource: 'manual', planUntil: null });
  const s = createStripe({ pool, initDb: async () => {}, billing: { apply: async () => ({ outcome: 'set' }) }, env, fetchImpl });
  const out = await s.checkout(42, 'nurvan.coach.month', NOW);
  ok('checkout makes the customer once, finds the price by the product id, and gives the page', out.url.startsWith('https://checkout.stripe.com/') && calls.some((c) => /customers$/.test(c.url)) && calls.some((c) => /lookup_keys%5B0%5D=nurvan.coach.month/.test(c.url)) && state.customer === 'cus_new');
  const sent = decodeURIComponent(calls.find((c) => /checkout\/sessions$/.test(c.url)).body);
  ok('and it asks Stripe for the free month and this account', /trial_period_days\]=30/.test(sent) && /user_id\]=42/.test(sent) && /customer=cus_new/.test(sent));
  let err = null; try { await s.checkout(42, 'nurvan.hack.month', NOW); } catch (e) { err = e; }
  ok('an unknown product is refused', err && err.statusCode === 400);
  ({ pool, state } = fakeDb({ plan: 'coach', planSource: 'apple', planUntil: new Date(NOW + 10 * DAY).toISOString() }));
  const s2b = createStripe({ pool, initDb: async () => {}, billing: {}, env, fetchImpl });
  err = null; try { await s2b.checkout(42, 'nurvan.coach.month', NOW); } catch (e) { err = e; }
  ok('someone who pays in the App Store is not asked to pay twice', err && err.statusCode === 409 && err.code === 'STORE_ACTIVE');
  ({ pool, state } = fakeDb({ plan: 'coach', planSource: 'stripe', planUntil: new Date(NOW + 10 * DAY).toISOString() }));
  const s3b = createStripe({ pool, initDb: async () => {}, billing: {}, env, fetchImpl });
  err = null; try { await s3b.checkout(42, 'nurvan.coach_pro.month', NOW); } catch (e) { err = e; }
  ok('someone who already has a web subscription is sent to the portal', err && err.statusCode === 409 && err.code === 'USE_PORTAL');
  const off = createStripe({ pool, initDb: async () => {}, billing: {}, env: {}, fetchImpl });
  err = null; try { await off.checkout(42, 'nurvan.coach.month', NOW); } catch (e) { err = e; }
  ok('without a Stripe key nothing is sold', err && err.statusCode === 503 && (await off.status(42)).enabled === false);
  // webhook events
  const applied = [];
  ({ pool, state } = fakeDb({ plan: 'free', planSource: 'manual', planUntil: null }));
  const s4 = createStripe({ pool, initDb: async () => {}, billing: { apply: async (e) => { applied.push(e); return { outcome: 'set' }; } }, env, fetchImpl });
  let r = await s4.handleEvent({ id: 'evt_9', type: 'customer.subscription.created', created: Math.floor(NOW / 1000), data: { object: subOf({ trial_end: 1, status: 'trialing' }) } }, NOW);
  ok('a subscription event becomes a plan event, and the free month is marked as used', r.outcome === 'set' && applied[0].type === 'RENEWAL' && applied[0].id === 'evt_9' && state.calls.some((q) => /stripe_trial_used_at = COALESCE/.test(q)));
  r = await s4.handleEvent({ id: 'evt_10', type: 'invoice.paid', data: { object: {} } }, NOW);
  ok('other events are acknowledged and do nothing', r.outcome === 'ignored' && applied.length === 1);
  ({ pool, state } = fakeDb({ plan: 'coach', planSource: 'play', planUntil: new Date(NOW + 10 * DAY).toISOString() }));
  const s5 = createStripe({ pool, initDb: async () => {}, billing: { apply: async (e) => { applied.push(e); return { outcome: 'set' }; } }, env, fetchImpl });
  r = await s5.handleEvent({ id: 'evt_11', type: 'customer.subscription.updated', created: Math.floor(NOW / 1000), data: { object: subOf() } }, NOW);
  ok('a web subscription does not replace a running Google Play one of the same level', r.outcome === 'ignored' && r.reason === 'store-active' && applied.length === 1);
}

// ---- the wiring
const api = read('coach-api.mjs');
ok('the webhook keeps the raw body for the signature, before the parsed one is used', /verify: \(req, _res, buf\)[^\n]*billing\/stripe\/webhook[^\n]*rawBody/.test(api));
const billing = read('server/billing/index.mjs');
ok('the Stripe routes are mounted with the billing ones, and the config says if Stripe is on', /mountStripe\(app/.test(billing) && /stripe: !!String\(env\.STRIPE_SECRET_KEY/.test(billing));
const render = read('render.yaml');
ok('Render has the Stripe variables, secret and webhook secret not synced', /STRIPE_SECRET_KEY\n\s+sync: false/.test(render) && /STRIPE_WEBHOOK_SECRET\n\s+sync: false/.test(render));
ok('the migration adds the customer and the used trial', /stripe_customer_id/.test(read('server/db/migrations/0028_stripe_web.sql')) && /stripe_trial_used_at/.test(read('server/db/migrations/0028_stripe_web.sql')));
const setup = read('tools/stripe_setup.mjs');
ok('the setup script makes prices with the product id as lookup key, and the portal', /lookup_key: id/.test(setup) && /billing_portal\/configurations/.test(setup));

// ---- the plans page in a browser
function page(extra, stripeOn, status) {
  const storage = {};
  const ctx = {
    console, Date, URLSearchParams,
    localStorage: { getItem: (k) => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); }, removeItem: (k) => { delete storage[k]; } },
    esc: (s) => String(s == null ? '' : s),
    render: () => {}, persist: () => {}, navigate: () => {},
    isAthleteRole: () => false, isCoachUnlocked: () => false,
    practiceHeaders: () => ({}),
    practiceFetch: async (url) => (/stripe\/status/.test(url) ? (status || { enabled: true, trialEligible: true, trialDays: 30, hasCustomer: false }) : { ok: true, stripe: !!stripeOn }),
    store: { prefs: {}, logs: [], accountToken: 'tok' },
    window: null, setInterval: () => 0, clearInterval: () => {}, setTimeout, history: {},
    ...extra
  };
  ctx.window = ctx; ctx.self = ctx; ctx.showToast = () => {};
  vm.createContext(ctx);
  vm.runInContext(read('web/features.js'), ctx);
  vm.runInContext(read('web/entitlements.js'), ctx);
  vm.runInContext(read('web/plans-ui.js'), ctx);
  ctx.onEntitlementReceived({ plan: 'free' });
  return ctx;
}
const draw = (ctx) => { const c = { innerHTML: '' }; ctx.renderPlansPricing(c); return c.innerHTML; };
{
  const off = page({}, false);
  await off.webStripeLoad();
  ok('browser, Stripe not set up: «Contattaci», as before', /CONTATTACI/.test(draw(off)) && !/ABBONATI/.test(draw(off)));
  const on = page({}, true);
  await on.webStripeLoad();
  const html = draw(on);
  ok('browser, Stripe on: a button per price, each to the checkout of its product', /webStripeBuy\('nurvan\.standard\.year'\)/.test(html) && /webStripeBuy\('nurvan\.coach\.month'\)/.test(html) && /webStripeBuy\('nurvan\.coach_pro\.year'\)/.test(html) && !/CONTATTACI/.test(html));
  ok('browser: the prices of the plans, the free month, the terms and no card talk', /19 € \/ <span>mese/.test(html) && /Il primo mese è gratis/.test(html) && /si rinnova automaticamente/.test(html) && /Stripe/.test(html));
  const used = page({}, true, { enabled: true, trialEligible: false, trialDays: 30, hasCustomer: true });
  await used.webStripeLoad();
  const h2 = draw(used);
  ok('free month already used: not announced; a customer gets the portal', !/Il primo mese è gratis/.test(h2) && /webStripePortal\(\)/.test(h2));
  const anon = page({ store: { prefs: {}, logs: [] } }, true);
  await anon.webStripeLoad();
  ok('signed out: the way to sign in, no free month shown', /ACCEDI PER ABBONARTI/.test(draw(anon)) && !/Il primo mese è gratis/.test(draw(anon)));
  const athlete = page({ isAthleteRole: () => true }, true);
  await athlete.webStripeLoad();
  ok('an athlete is never offered a purchase', !/webStripeBuy/.test(draw(athlete)));
  // never in the apps
  const ios = page({ isIosApp: () => true, NativeConfig: undefined }, true);
  await ios.webStripeLoad();
  const ih = draw(ios);
  ok('in the apps: no Stripe button, no free month, no mention of the website', !/webStripe|Stripe|primo mese/.test(ih));
  const android = page({ NativeConfig: {} }, true);
  await android.webStripeLoad();
  ok('on Android too', !/webStripe|Stripe|primo mese/.test(draw(android)));
}
const ui = read('web/plans-ui.js');
ok('the page reads the return from Checkout (?checkout=success|cancel) and asks the server to look again', /checkout=success|get\('checkout'\)/.test(ui) && /\/api\/billing\/stripe\/sync/.test(ui));

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nTutti i controlli dei pagamenti Stripe passano.');
