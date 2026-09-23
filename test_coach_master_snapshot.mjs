// Executes the real memory-area code out of web/index.base.html.
//
// The coach area and the personal app used to share one `store`, mutated on the
// way into a client session and put back from an in-memory snapshot on the way
// out. Four separate data losses came out of that, all of them the same shape:
// something interrupted the way out, and the client's data was left sitting in
// the coach's record.
//
// There is no snapshot now. The domain fields are accessors onto whichever area
// is active, and the personal area is never written to during a client session,
// so there is nothing to put back and nothing that can fail to be put back.
// These assertions run that code rather than searching its text.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

const src = fs.readFileSync(
  path.resolve(root, process.argv[2] || 'web/index.base.html'),
  'utf8'
);

// The memory-area block is self-contained apart from the four bindings it
// swaps, which the sandbox supplies.
const from = src.indexOf('var NURVAN_DOMAIN_FIELDS');
assert.ok(from !== -1, 'NURVAN_DOMAIN_FIELDS not found in web/index.base.html');
const to = src.indexOf('window.NURVAN_DOMAIN_FIELDS = NURVAN_DOMAIN_FIELDS;', from);
assert.ok(to !== -1, 'end of the memory-area block not found');
const block = src.slice(from, to);

function boot(personalSeed) {
  const sandbox = {
    console,
    store: Object.assign({
      // identity: shared, must survive an area switch untouched
      accountToken: 'coach-token',
      accountUser: { id: 'coach-1', name: 'Coach' },
      coachWorkspace: { clientId: null },
      prefs: { intensityType: 'RIR' }
    }, personalSeed),
    DATA: { title: 'Scheda COACH', weeks: [{ week: 1 }] },
    currentWeek: 3,
    currentDay: 2
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(block + '\nwindow.__ready = true;', sandbox);
  return sandbox;
}

const COACH_DIARY = { '2026-09-17': { meals: ['Colazione COACH'] } };
const sb = boot({
  nutritionDaily: COACH_DIARY,
  activeProgram: { id: 'personale', title: 'Scheda COACH' },
  bodyChecks: [{ id: 'check-coach' }],
  bw: { '2026-09-17': 80 }
});

// --- the field list ---
ok(Array.isArray(sb.NURVAN_DOMAIN_FIELDS), 'NURVAN_DOMAIN_FIELDS is declared');
for (const field of ['nutritionDaily', 'activeProgram', 'bodyChecks', 'bw', 'logs', 'data', 'warmups', 'profile']) {
  ok(sb.NURVAN_DOMAIN_FIELDS.includes(field), `"${field}" is a domain field`);
}

// --- boot: the personal area took the values that were on store ---
ok(sb.NurvanMemory.active === 'personal', 'the personal area is active at boot');
ok(sb.personalDomain().nutritionDaily === COACH_DIARY, 'boot harvested the coach data into the personal area');
ok(typeof Object.getOwnPropertyDescriptor(sb.store, 'nutritionDaily').get === 'function',
  'domain fields became accessors on store');
ok(sb.store.nutritionDaily === COACH_DIARY, 'reading store still gives the coach data');

// --- entering a client area ---
sb.nurvanEnterClientArea();
ok(sb.NurvanMemory.active === 'client', 'entering switches the active area');
ok(sb.nurvanClientAreaActive() === true, 'the client area reports itself active');
ok(sb.store.nutritionDaily === undefined, 'the client area starts empty, not seeded from the coach');
ok(sb.store.profile === sb.personalDomain().profile, 'the client view keeps showing the coach profile');

// --- writing a whole client session ---
const CLIENT_DIARY = { '2026-09-17': { meals: ['Pasto DEL CLIENTE'] } };
sb.store.nutritionDaily = CLIENT_DIARY;
sb.store.activeProgram = { id: 'cliente', title: 'Scheda CLIENTE' };
sb.store.bodyChecks = [{ id: 'check-cliente' }];
sb.store.bw = { '2026-09-17': 65 };
sb.DATA = { title: 'Scheda CLIENTE', weeks: [] };
sb.currentWeek = 1;
sb.currentDay = 0;

ok(sb.store.nutritionDaily === CLIENT_DIARY, 'store shows the client data inside the session');
ok(sb.personalDomain().nutritionDaily === COACH_DIARY, 'the coach diary is untouched while the session runs');
ok(sb.personalDomain().activeProgram.title === 'Scheda COACH', 'the coach program is untouched');
ok(sb.personalDomain().bodyChecks[0].id === 'check-coach', 'the coach body checks are untouched');
ok(sb.personalDomain().bw['2026-09-17'] === 80, 'the coach body weight is untouched');

// --- identity is shared, not duplicated ---
sb.store.coachWorkspace.clientId = '42';
sb.store.coachSeenEventId = 99;
ok(sb.store.accountToken === 'coach-token', 'identity still reads through inside a client session');

// --- the case that cost a day and a half of food diary: no clean exit ---
ok(sb.personalDomain().nutritionDaily['2026-09-17'].meals[0] === 'Colazione COACH',
  'if the session never exits, the coach copy is still the coach data');
ok(JSON.stringify(sb.personalDomain()).indexOf('DEL CLIENTE') === -1,
  'no client value has reached the personal area by any route');

// --- leaving ---
ok(sb.nurvanLeaveClientArea() === true, 'leaving reports success');
ok(sb.NurvanMemory.active === 'personal', 'the personal area is active again');
ok(sb.NurvanMemory.client === null, 'the client area is discarded');
ok(sb.store.nutritionDaily === COACH_DIARY, 'the coach diary is back on store');
ok(sb.DATA.title === 'Scheda COACH', 'DATA came back with the area');
ok(sb.currentWeek === 3 && sb.currentDay === 2, 'the week/day cursor came back with the area');
ok(sb.store.coachWorkspace.clientId === '42', 'identity written during the session survived the switch');
ok(sb.store.coachSeenEventId === 99, 'identity assigned during the session survived the switch');

// --- leaving when not in a client area is a no-op ---
ok(sb.nurvanLeaveClientArea() === false, 'leaving twice does nothing');
ok(sb.store.nutritionDaily === COACH_DIARY, 'and does not disturb the coach data');

// --- a rebuilt store must get its accessors back ---
{
  const sb2 = boot({ nutritionDaily: COACH_DIARY });
  sb2.store = { nutritionDaily: { fresh: true }, accountToken: 'coach-token' };
  sb2.nurvanInstallDomainAccessors();
  ok(typeof Object.getOwnPropertyDescriptor(sb2.store, 'nutritionDaily').get === 'function',
    'reinstalling gives a rebuilt store its accessors back');
  sb2.nurvanEnterClientArea();
  sb2.store.nutritionDaily = { client: true };
  ok(sb2.personalDomain().nutritionDaily.fresh === true,
    'and the rebuilt store is still isolated from a client session');
}

// --- the wiring in the coach flow ---
{
  const ui = fs.readFileSync(path.join(root, 'web/coach-practice-ui.js'), 'utf8');

  // Order is checked on statements, not prose: these functions carry comments
  // that name the very calls being ordered.
  const code = (body) => body.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

  const applyAt = ui.indexOf('function applyClientPayloadToLocal(payload)');
  const applyBody = code(ui.slice(applyAt, ui.indexOf('\nfunction ', applyAt + 20)));
  ok(applyBody.indexOf('nurvanEnterClientArea()') !== -1
    && applyBody.indexOf('nurvanEnterClientArea()') < applyBody.indexOf('store.activeProgram ='),
    'applyClientPayloadToLocal enters the client area before it writes anything');

  const beginAt = ui.indexOf('function beginAssignSandbox');
  const beginBody = code(ui.slice(beginAt, ui.indexOf('\nfunction ', beginAt + 20)));
  ok(beginBody.indexOf('nurvanEnterClientArea()') !== -1
    && beginBody.indexOf('nurvanEnterClientArea()') < beginBody.indexOf('resetSandboxSessionState()'),
    'beginAssignSandbox enters the client area BEFORE clearing - the other order would clear the coach copy');

  const restoreAt = ui.indexOf('async function restoreCoachMaster(backup)');
  const restoreBody = ui.slice(restoreAt, ui.indexOf('\n}', restoreAt) + 2);
  ok(restoreBody.includes('nurvanLeaveClientArea()'), 'ending a session switches back rather than copying fields');
  ok(!/store\.\w+ = backup\./.test(restoreBody), 'nothing is copied back out of a backup any more');
}

// --- persistence takes the coach copy, not the active one ---
{
  const base = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
  // The overlay now happens before the sanitizer rather than after it (the
  // programming must not reach the deep clone at all), but it is the same
  // overlay: the personal area over whatever the active one holds.
  ok(base.includes('Object.assign({}, store, personalDomain())'),
    'persist writes the personal area over whatever the active one holds');
  ok(base.indexOf('Object.assign({}, store, personalDomain())') < base.indexOf('sanitizeStoreForLocalStorage(source)'),
    'and it happens before the blob is built, not after');
  ok(base.includes('const own = personalDomain();'),
    'the emergency quota write also takes the coach copy');
}

console.log('\nAll memory-area tests passed.');
