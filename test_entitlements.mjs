// Piani ed entitlement: un solo punto di controllo.
//
// Qui: can() per ogni funzione e ogni piano (con una tabella scritta a mano,
// non ricavata da features.json, cosi' un errore nel file si vede), l'eredita'
// dal coach, i posti del coach, la tolleranza di 7 giorni, il trial una volta
// sola, il lato server (piano, storico, amministrazione) con un pool finto, la
// pagina (import al mese, storico, pricing) e il censimento dei gate: nessuna
// schermata decide da se'.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  Entitlements as E,
  FEATURES,
  accountFromRow,
  coachLinkForClient,
  coachSeatState,
  isAdmin,
  sanitizePlanChange,
  setAccountPlan,
  startCoachTrial
} from './server/account/plans.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
function eq(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message + '\n     atteso ' + b + ', ottenuto ' + a);
}
const NOW = Date.parse('2026-09-25T12:00:00Z');
const DAY = 86400000;
const iso = (ms) => new Date(ms).toISOString();

// ------------------------------------------------------------ can() for every feature x plan
{
  const MIN = {
    logging: 'free', active_program: 'free', history: 'free', import: 'free', food_catalog: 'free', session_card: 'free',
    gold_frame: 'standard', history_full: 'standard', export: 'standard', proposed_target: 'standard', coach_clients: 'standard',
    scheduled_checkins: 'coach', prescribed_target: 'coach', import_unlimited: 'coach', client_billing: 'coach',
    branding: 'coach_pro', coach_therapy_exams: 'coach_pro', export_athletes: 'coach_pro'
  };
  eq(Object.keys(FEATURES.features).sort(), Object.keys(MIN).sort(), 'features.json lists exactly the features of the spec (plus the avatar frame)');
  const plans = ['free', 'standard', 'coach', 'coach_pro'];
  let wrong = [];
  for (const f of Object.keys(MIN)) {
    for (const p of plans) {
      const expected = plans.indexOf(p) >= plans.indexOf(MIN[f]);
      const why = E.explain({ plan: p }, f, null, { now: NOW });
      if (why.allowed !== expected) wrong.push(f + '@' + p);
      if (!expected && (why.reason !== 'plan' || why.minPlan !== MIN[f])) wrong.push(f + '@' + p + ' reason');
    }
  }
  eq(wrong, [], 'can(): ' + Object.keys(MIN).length + ' features x 4 plans, with the minimum plan when closed');
  ok('unknown feature: closed', E.can({ plan: 'coach_pro' }, 'nope') === false);
  ok('unknown plan counts as free', E.effective({ plan: 'gold' }, NOW).plan === 'free');
}

// ------------------------------------------------------------ counted features
{
  const second = E.explain({ plan: 'free' }, 'import', { count: 1 }, { now: NOW });
  eq([second.allowed, second.reason, second.limit, second.minPlan], [false, 'limit', 1, 'standard'], 'free: the 2nd import in the month is refused, Standard indicated');
  ok('free: the 1st import is allowed', E.can({ plan: 'free' }, 'import', { count: 0 }));
  eq([E.can({ plan: 'standard' }, 'import', { count: 4 }), E.explain({ plan: 'standard' }, 'import', { count: 5 }).minPlan], [true, 'coach'], 'standard: 5 a month, the 6th points to Coach');
  ok('coach: imports without limit', E.can({ plan: 'coach' }, 'import', { count: 500 }));
  eq([E.historyDays({ plan: 'free' }, { now: NOW }), E.historyDays({ plan: 'standard' }, { now: NOW })], [90, null], 'history: 90 days on free, all of it from standard');
}

// ------------------------------------------------------------ inheritance from the coach
{
  const linked = { plan: 'free', coachLink: { active: true, seatInactive: false } };
  const eff = E.effective(linked, NOW);
  eq([eff.plan, eff.inherited, eff.ownPlan], ['standard', true, 'free'], 'free athlete with an active coach: works as standard');
  ok('linked: export and full history open', E.can(linked, 'export') && E.can(linked, 'history_full') && E.historyDays(linked) === null);
  const unlinked = { plan: 'free', coachLink: { active: false } };
  ok('link ended: back to free, export and history closed again', !E.can(unlinked, 'export') && E.historyDays(unlinked) === 90);
  ok('own plan above standard is kept', E.effective({ plan: 'coach', coachLink: { active: true } }, NOW).plan === 'coach');
  const waiting = E.effective({ plan: 'free', coachLink: { active: true, seatInactive: true } }, NOW);
  eq([waiting.plan, waiting.notices.map((n) => n.kind)], ['free', ['coach_limit']], 'link beyond the coach\'s seats: no inheritance, a notice');
}

// ------------------------------------------------------------ seats
{
  const clients = Array.from({ length: 21 }, (_, i) => ({ id: String(i + 1), createdAt: iso(NOW - (30 - i) * DAY), status: 'active' }));
  const s20 = E.seatAssignment(clients, E.effective({ plan: 'coach' }, NOW).seats);
  eq([s20.active.length, s20.inactive], [20, ['21']], 'coach, 20 seats, 21 athletes: the most recent is inactive');
  const pro = E.seatAssignment(clients, E.effective({ plan: 'coach_pro' }, NOW).seats);
  eq(pro.inactive, [], 'up to Pro: all active, no other action');
  eq(E.seatAssignment(clients, E.effective({ plan: 'coach', seats: 25 }, NOW).seats).inactive, [], 'seats set by the administrator win over the default');
  eq(E.seatAssignment(clients.concat([{ id: '99', status: 'revoked', createdAt: iso(NOW) }]), 20).inactive, ['21'], 'revoked links take no seat');
  eq(E.effective({ plan: 'standard' }, NOW).seats, 3, 'standard: 3 athletes');
  eq(E.effective({ plan: 'free' }, NOW).seats, 0, 'free: no athletes');
  const why = E.explain({ plan: 'coach' }, 'coach_clients', { count: 20 });
  eq([why.allowed, why.minPlan], [false, 'coach_pro'], 'a 21st athlete on Coach points to Coach Pro');
}

// ------------------------------------------------------------ expiry and grace
{
  const yesterday = E.effective({ plan: 'coach', planUntil: iso(NOW - DAY) }, NOW);
  eq([yesterday.plan, yesterday.status, yesterday.notices[0].kind], ['coach', 'grace', 'grace'], 'expired yesterday: everything works, with a notice');
  ok('in grace, coach features still open', E.can({ plan: 'coach', planUntil: iso(NOW - DAY) }, 'scheduled_checkins', null, { now: NOW }));
  const eight = E.effective({ plan: 'coach', planUntil: iso(NOW - 8 * DAY) }, NOW);
  eq([eight.plan, eight.status, eight.seats], ['free', 'expired', 0], 'expired 8 days ago: free, no seats');
  eq(E.effective({ plan: 'coach', planUntil: iso(NOW - 7 * DAY) }, NOW).status, 'grace', 'exactly 7 days: still in grace');
  eq(E.effective({ plan: 'coach', planUntil: null }, NOW).status, 'active', 'no expiry: active');
  eq(E.effective({ plan: 'coach', planUntil: iso(NOW + DAY) }, NOW).status, 'active', 'expiry tomorrow: active');
  const expiredSeats = E.effective({ plan: 'coach', seats: 40, planUntil: iso(NOW - 9 * DAY) }, NOW).seats;
  eq(expiredSeats, 0, 'an expired plan takes its seats with it');
}

// ------------------------------------------------------------ trial
{
  const t = E.effective({ plan: 'free', trialUntil: iso(NOW + 13 * DAY) }, NOW);
  eq([t.plan, t.trialActive, t.seats], ['coach', true, 20], 'trial running: coach, 20 seats');
  eq(E.effective({ plan: 'free', trialUntil: iso(NOW - 1) }, NOW).plan, 'free', 'trial over: back to free');

  // Server: once per account.
  const row = { plan: 'free', trial_used_at: null, trial_until: null };
  const history = [];
  const pool = {
    async connect() {
      return {
        async query(sql, params) {
          if (/SELECT plan, trial_used_at/.test(sql)) return { rows: [row] };
          if (/UPDATE app_users SET trial_until/.test(sql)) { row.trial_until = params[1]; row.trial_used_at = params[2]; return { rows: [] }; }
          if (/INSERT INTO app_plan_history/.test(sql)) { history.push(params); return { rows: [] }; }
          return { rows: [] };
        },
        release() {}
      };
    },
    async query(sql) {
      if (/FROM app_users WHERE id/.test(sql)) return { rows: [{ ...row, plan_source: 'manual' }] };
      return { rows: [] };
    }
  };
  const first = await startCoachTrial(pool, 7, NOW);
  eq([first.trialUntil, history.length, history[0][3]], [iso(NOW + 14 * DAY), 1, '2026-10-09T12:00:00.000Z'], 'first trial: 14 days, written to the history');
  let refused = null;
  try { await startCoachTrial(pool, 7, NOW + DAY); } catch (e) { refused = e; }
  eq([refused && refused.statusCode, refused && refused.code, history.length], [409, 'TRIAL_USED', 1], 'second attempt refused, nothing written');
}

// ------------------------------------------------------------ server: plan changes, admin, seats, link
{
  eq(sanitizePlanChange({ plan: 'Coach', seats: 'unlimited', until: '2026-12-31', note: ' primo coach ' }), { plan: 'coach', source: 'manual', until: '2026-12-31T00:00:00.000Z', seats: -1, note: 'primo coach' }, 'admin input cleaned');
  let bad = 0;
  for (const input of [{ plan: 'gold' }, { plan: 'coach', source: 'paypal' }, { plan: 'coach', until: 'domani' }, { plan: 'coach', seats: -5 }]) {
    try { sanitizePlanChange(input); } catch (e) { if (e.statusCode === 400) bad++; }
  }
  eq(bad, 4, 'bad plan, source, date, seats: refused');
  eq(E.effective(accountFromRow({ plan: 'coach', seats: -1 }), NOW).seats, Infinity, 'seats -1 = unlimited');

  const writes = [];
  const pool = {
    async connect() {
      return {
        async query(sql, params) {
          if (/SELECT plan FROM app_users/.test(sql)) return { rows: [{ plan: 'free' }] };
          if (/UPDATE app_users SET plan/.test(sql) || /INSERT INTO app_plan_history/.test(sql)) writes.push([sql.trim().split(/\s+/)[0], params]);
          return { rows: [] };
        },
        release() {}
      };
    },
    async query() { return { rows: [{ plan: 'coach', plan_source: 'manual', plan_until: null, seats: 20 }] }; }
  };
  await setAccountPlan(pool, 5, { plan: 'coach', seats: 20, note: 'gratis ai primi coach' }, { actor: 'token' });
  eq(writes.map((w) => w[0]), ['UPDATE', 'INSERT'], 'plan change: account updated and history written in one transaction');
  eq(writes[1][1].slice(1, 4).concat([writes[1][1][6], writes[1][1][7]]), ['free', 'coach', 'manual', 'gratis ai primi coach', 'token'], 'history: from, to, origin, note, who');

  const req = (h) => ({ headers: h });
  const env = { NURVAN_ADMIN_TOKEN: 'x'.repeat(32), ADMIN_EMAILS: 'Owner@Example.com' };
  eq([
    isAdmin(req({ 'x-admin-token': 'x'.repeat(32) }), null, env),
    isAdmin(req({ 'x-admin-token': 'wrong' }), null, env),
    isAdmin(req({}), { email: 'owner@example.com', role: 'user' }, env),
    isAdmin(req({}), { email: 'owner@example.com', role: 'athlete' }, env),
    isAdmin(req({ 'x-admin-token': 'short' }), null, { NURVAN_ADMIN_TOKEN: 'short' }),
    isAdmin(req({}), { email: 'x@y.z' }, {})
  ], ['token', null, 'email:owner@example.com', null, null, null], 'admin: token or listed email only; short tokens and athletes never');

  // Seats on the server, from the same module.
  const clientRows = Array.from({ length: 21 }, (_, i) => ({ id: i + 1, created_at: iso(NOW - (30 - i) * DAY), status: 'active' }));
  let coachPlan = { plan: 'coach', plan_source: 'manual', seats: null };
  const seatPool = {
    async query(sql, params) {
      if (/FROM app_users WHERE id/.test(sql)) return { rows: [coachPlan] };
      if (/FROM coach_clients WHERE coach_user_id/.test(sql)) return { rows: clientRows };
      if (/FROM coach_licenses/.test(sql)) return { rows: [{ '?column?': 1 }] };
      return { rows: [] };
    }
  };
  const st = await coachSeatState(seatPool, 1, NOW);
  eq([st.seats, st.inactive], [20, ['21']], 'server: 21st link inactive on Coach');
  const link21 = await coachLinkForClient(seatPool, { id: 21, coach_user_id: 1, status: 'active' }, NOW);
  const link3 = await coachLinkForClient(seatPool, { id: 3, coach_user_id: 1, status: 'active' }, NOW);
  eq([link21, link3], [{ active: true, seatInactive: true }, { active: true, seatInactive: false }], 'server: the athlete learns its link is waiting');
  coachPlan = { plan: 'coach_pro', plan_source: 'manual', seats: null };
  eq((await coachLinkForClient(seatPool, { id: 21, coach_user_id: 1, status: 'active' }, NOW)).seatInactive, false, 'coach moves to Pro: the 21st is active at the next read');
  eq(await coachLinkForClient(seatPool, { id: 3, coach_user_id: 1, status: 'revoked' }, NOW), { active: false, seatInactive: false }, 'revoked link: no inheritance');
}

// ------------------------------------------------------------ the page: imports, history, messages, pricing
function pageContext(entitlement, extra = {}) {
  const storage = {};
  const ctx = {
    console,
    Date,
    localStorage: { getItem: (k) => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); }, removeItem: (k) => { delete storage[k]; } },
    esc: (s) => String(s == null ? '' : s),
    toasts: [],
    render: () => {},
    persist: () => {},
    navigate: () => {},
    isAthleteRole: () => false,
    isCoachUnlocked: () => false,
    store: { prefs: {}, logs: [] },
    ...extra
  };
  ctx.showToast = (m, k) => ctx.toasts.push([m, k]);
  ctx.self = ctx;
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('web/features.js'), ctx);
  vm.runInContext(read('web/entitlements.js'), ctx);
  vm.runInContext(read('web/plans-ui.js'), ctx);
  if (entitlement) ctx.onEntitlementReceived(entitlement);
  return ctx;
}
{
  const free = pageContext({ plan: 'free' });
  free.store.prefs.importLog = [new Date().toISOString()];
  ok('page: 2nd import this month refused', free.requireImportAllowed() === false);
  ok('page: the refusal names Standard', /Standard/.test(free.toasts[0][0]) && free.toasts[0][1] === 'error');
  free.store.prefs.importLog = ['2020-01-15T10:00:00.000Z'];
  ok('page: an import in another month does not count', free.requireImportAllowed() === true);
  free.recordImportUse();
  eq(free.importsThisMonth(), 1, 'page: an applied import is counted');

  const logs = [
    { at: iso(Date.now() - 200 * DAY), week: 1 },
    { at: iso(Date.now() - 100 * DAY), week: 2 },
    { at: iso(Date.now() - 10 * DAY), week: 3 }
  ];
  free.store.logs = logs;
  const visible = free.historyVisibleLogs(free.store.logs);
  eq([visible.map((l) => l.week), free.store.logs.length], [[3], 3], 'free: sessions older than 90 days hidden, not deleted');
  ok('free: the list says how many are hidden and where to see them', /2 sedute/.test(free.historyHiddenNoteHtml(logs, visible)) && /Standard/.test(free.historyHiddenNoteHtml(logs, visible)));

  const linked = pageContext({ plan: 'free', coachLink: { active: true, seatInactive: false } });
  ok('free + coach: export and the whole history', linked.planCan('export') && linked.historyVisibleLogs(logs).length === 3);
  linked.onEntitlementReceived({ plan: 'free', coachLink: { active: false } });
  ok('unlinked: closed again, data intact', !linked.planCan('export') && linked.historyVisibleLogs(logs).length === 1 && logs.length === 3);

  // Offline: the last plan known.
  const again = pageContext(null);
  again.localStorage.setItem('nurvan.entitlement.v1', JSON.stringify({ plan: 'coach' }));
  ok('offline: the last known plan holds', again.planCan('scheduled_checkins'));
  again.clearAccountEntitlement();
  ok('logout: the plan is forgotten', !again.planCan('scheduled_checkins'));

  const waiting = pageContext({ plan: 'free', coachLink: { active: true, seatInactive: true } });
  ok('athlete beyond the seats: the message, blaming nobody', /il tuo coach ha raggiunto il limite/i.test(waiting.planNoticesHtml()) && /restano/.test(waiting.planNoticesHtml()));
  const grace = pageContext({ plan: 'coach', planUntil: iso(Date.now() - DAY) });
  ok('grace: the notice with the end date', /scaduto/.test(grace.planNoticesHtml()) && /torna Free/.test(grace.planNoticesHtml()));

  // Pricing
  function cards(ctx) {
    const c = { innerHTML: '' };
    ctx.renderPlansPricing(c);
    return c.innerHTML;
  }
  const web = cards(pageContext({ plan: 'standard' }));
  ok('pricing: four plans', (web.match(/class="card plan-card/g) || []).length === 4);
  ok('pricing: the prices of the doc', ['24 €/anno', '19 €/mese · 190 €/anno', '39 €/mese · 390 €/anno'].every((p) => web.includes(p)));
  ok('pricing: the current plan highlighted', /plan-card plan-card-current" data-plan="standard"/.test(web) && /IL TUO PIANO/.test(web));
  ok('pricing: «Contattaci», never a purchase', (web.match(/CONTATTACI/g) || []).length === 2 && !/ACQUISTA|COMPRA|checkout/i.test(web));
  const android = cards(pageContext({ plan: 'free' }, { NativeConfig: {} }));
  const block = (html, id) => {
    const at = html.indexOf('data-plan="' + id + '"');
    const next = html.indexOf('data-plan=', at + 12);
    return html.slice(at, next > 0 ? next : html.length);
  };
  const androidCoach = android.slice(android.indexOf('data-plan="coach"'));
  ok('Android: no button for Coach and Pro', !/CONTATTACI/.test(androidCoach) && /CONTATTACI/.test(block(android, 'standard')));
  const coachFree = pageContext({ plan: 'free' }, { isCoachUnlocked: () => true });
  ok('pricing: a coach without trial sees «Prova Coach 14 giorni»', /PROVA COACH 14 GIORNI/.test(cards(coachFree)));
  coachFree.onEntitlementReceived({ plan: 'free', trialUsedAt: iso(Date.now() - 30 * DAY) });
  ok('pricing: trial already used, no button', !/PROVA COACH/.test(cards(coachFree)));
  ok('pricing: an athlete never sees the trial', !/PROVA COACH/.test(cards(pageContext({ plan: 'free' }, { isAthleteRole: () => true, isCoachUnlocked: () => true }))));
}

// ------------------------------------------------------------ the census: every gate goes through can()
{
  const base = read('web/index.base.html');
  const ui = read('web/coach-practice-ui.js');
  const sched = read('web/coach-os/scheduled-checkins.js');
  const services = read('prepare_task20_js_services.mjs');
  const build = read('build_master25.mjs');
  ok('old plan logic gone: no getPlan() decisions in the page', !/EntitlementService\.getPlan\(\)/.test(base) && !/=== 'gold'/.test(base));
  ok('old client-side plan switch and trial gone', !/setPlan|start14DayTrial|GS_PLAN|GS_TRIAL_END|accountTrialStart/.test(services) && !build.includes('EntitlementService.setPlan'));
  ok('EntitlementService only forwards to NurvanEntitlements', /E\.can\(this\.account\(\), featureName, usage\)/.test(services));
  ok('settings card and pricing read the plan from entitlements', base.includes('const planEff = currentPlanEffective();') && base.includes('return renderPlansPricing(c);'));
  ok('avatar frame through can()', base.includes("hasGold = planCan('gold_frame')"));
  ok('imports: gated at start and at confirm, counted when applied', base.includes("if (actionIntent === 'IMPORT' && !requireImportAllowed())") && (base.match(/recordImportUse\(\);/g) || []).length === 3 && base.includes('function handleImportTextSubmit() {\n  if (!requireImportAllowed()) return;'));
  const exportsGated = ['exportStatsCsv', 'exportWorkoutHistory', 'exportWorkoutPdf', 'exportNutritionPdf', 'exportActiveProgram', 'exportCheckFisicoPdf', 'exportSavedCheckFisico'].filter((f) => {
    const at = base.indexOf('function ' + f + '(');
    return at >= 0 && base.slice(at, at + 200).includes("requirePlan('export')");
  });
  eq(exportsGated.length, 7, 'exports: CSV, history, workout PDF, nutrition PDF, program, check PDF (not the send to the coach)');
  ok('backup is not an export: always available', !base.slice(base.indexOf('function exportFullDatabaseBackup('), base.indexOf('function exportFullDatabaseBackup(') + 300).includes('requirePlan'));
  ok('history: stats list and progress center', base.includes('historyVisibleLogs(store.logs || [])') && base.includes('historyVisibleLogs(store.logs || (DATA && DATA.logs) || [])'));
  ok('proposed target through can()', base.includes("proposed: planCan('proposed_target') ? nutritionProposed() : null") && base.includes("planLockedHtml('proposed_target')"));
  ok('prescription through can()', base.includes("if (coach && !planCan('prescribed_target'))") && base.includes("if (!requirePlan('prescribed_target')) return;"));
  ok('scheduled check-ins through can(), on the page and on the server', sched.includes("planCan('scheduled_checkins')") && read('coach-practice.mjs').includes('requireCoachFeature(coach, "scheduled_checkins", res)'));
  ok('coach therapy and exams through can()', ui.includes("!requirePlan('coach_therapy_exams')) return;") && (ui.match(/coach_therapy_exams/g) || []).length >= 2);
  ok('client billing through can()', read('web/coach-os/business.js').includes("planCan('client_billing')"));
  ok('seats: marked in the coach list, the athlete\'s reminders wait', ui.includes('OLTRE I POSTI') && sched.includes('if (link && link.seatInactive) return null;'));
  ok('the plan arrives with /api/account/me, /api/client/me and /api/coach/status', read('coach-api.mjs').includes('entitlement = await accountEntitlement(pool, auth)') && read('coach-practice.mjs').includes('entitlement = await accountEntitlement(pool, ctx.auth)') && ui.includes('onEntitlementReceived(me.entitlement)') && ui.includes('onEntitlementReceived(s && s.entitlement)') && base.includes('onEntitlementReceived(payload.entitlement)'));
  ok('logout forgets the plan', base.includes('try { clearAccountEntitlement(); } catch (_) {}'));
  eq(JSON.parse(read('web/features.js').replace(/^\/\/.*\n/, '').replace('self.NURVAN_FEATURES = ', '').replace(/;\s*$/, '')), JSON.parse(read('web/features.json')), 'features.js is features.json, generated by the build');
  ok('page loads features.js before entitlements.js', base.indexOf('<script src="features.js"></script>') > 0 && base.indexOf('<script src="features.js"></script>') < base.indexOf('<script src="entitlements.js"></script>'));
  ok('offline and Android: both files cached and copied', ['./features.js', './entitlements.js'].every((f) => read('web/sw.js').includes("'" + f + "'")) && ['features.js', 'entitlements.js'].every((f) => read('sync_web_assets.mjs').includes("'" + f + "'")));
  const mig = read('server/db/migrations/0015_plans_entitlements.sql');
  ok('migration: plan fields on the account, history table, existing coaches kept', ['plan TEXT', 'plan_source TEXT', 'plan_until TIMESTAMPTZ', 'seats INTEGER', 'trial_until TIMESTAMPTZ', 'trial_used_at TIMESTAMPTZ'].every((c) => mig.includes('ADD COLUMN IF NOT EXISTS ' + c)) && mig.includes('CREATE TABLE IF NOT EXISTS app_plan_history') && /SET plan = 'coach'/.test(mig));
  ok('admin routes and trial route mounted', ['app.get("/api/admin/accounts"', 'app.post("/api/admin/accounts/:id/plan"', 'app.get("/api/admin/accounts/:id/history"', 'app.post("/api/account/trial"'].every((r) => read('server/account/plans.mjs').includes(r)) && read('coach-api.mjs').includes('mountPlanRoutes(app, { pool, initDb, accountFromBearer });'));
}

if (failed) {
  console.log('\n' + failed + ' FAIL');
  process.exit(1);
}
console.log('\nPiani ed entitlement: tutto verde');
