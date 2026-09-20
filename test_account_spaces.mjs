// Runs the real space functions out of web/index.base.html and checks what
// ships in the web app.
//
// A brand new phone, with nobody logged in, used to open on the owner's own
// training: web/personal-recovery-16w.json shipped with the app (downloadable
// by anyone with the URL - program, name, bodyweight) and the boot offered it
// as "restore your training". On top of that every account on a device shared
// one storage key and one database, so whoever opened the app saw whatever the
// last person had.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GiammariaPersistenceEngine, DB_NAME } from './persistence-core.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const base = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const built = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');

function ok(cond, msg) {
  assert.ok(cond, msg);
  console.log('OK  ', msg);
}

function sourceOf(name) {
  const at = base.indexOf('function ' + name + '(');
  assert.ok(at !== -1, name + ' not found in web/index.base.html');
  let depth = 0;
  for (let i = base.indexOf('{', at); i < base.length; i++) {
    if (base[i] === '{') depth++;
    else if (base[i] === '}' && --depth === 0) return base.slice(at, i + 1);
  }
  throw new Error('unterminated ' + name);
}

// --- nothing personal ships with the app ----------------------------------
ok(!fs.existsSync(path.join(root, 'web/personal-recovery-16w.json')),
  'the owner\'s program backup is no longer inside the web app');
ok(!fs.existsSync(path.join(root, 'app/src/main/assets/personal-recovery-16w.json')),
  'nor inside the Android assets');
ok(fs.existsSync(path.join(root, 'private/personal-recovery-16w.json')),
  'it is kept in private/, which is not served');
{
  const sw = fs.readFileSync(path.join(root, 'web/sw.js'), 'utf8');
  ok(!/personal-recovery/.test(sw), 'the service worker does not precache it any more');
  const sync = fs.readFileSync(path.join(root, 'sync_web_assets.mjs'), 'utf8');
  ok(!/personal-recovery/.test(sync), 'and it is not copied into the app package');
  const served = fs.readdirSync(path.join(root, 'web')).filter((f) => /\.json$/.test(f));
  const leaking = served.filter((f) => /giammaria/i.test(fs.readFileSync(path.join(root, 'web', f), 'utf8')));
  ok(leaking.length === 0, 'no data file served with the app carries the owner\'s name (' + (leaking.join(', ') || 'none') + ')');
}
{
  const api = fs.readFileSync(path.join(root, 'coach-api.mjs'), 'utf8');
  const at = api.indexOf('app.get("/api/account/personal-backup"');
  ok(at !== -1, 'the backup is served by an endpoint instead');
  const body = api.slice(at, api.indexOf('app.get("/api/account/me"', at));
  ok(/accountFromBearer/.test(body) && /401/.test(body), 'which requires being signed in');
  ok(/PERSONAL_BACKUP_EMAIL/.test(body) && /404/.test(body),
    'and answers only the account it belongs to - to nobody at all when that is not configured');
  ok(/private/.test(body), 'reading it from private/, outside the web root');
}
{
  const at = base.indexOf('async function collectRecoverSchedaCandidates');
  const body = base.slice(at, base.indexOf('\nasync function recoverPersonalTrainingEmergency', at));
  ok(!/fetch\('personal-recovery-16w\.json'/.test(body), 'the app no longer fetches the backup as a public file');
  ok(/accountRequest\('\/api\/account\/personal-backup'/.test(body) && /store\.accountToken/.test(body),
    'it asks the server for it, and only when signed in');
  ok(/if \(!store \|\| !store\.accountToken\) return false;/.test(sourceOf('personalSchedaNeedsRestore')),
    'and nothing is restored at boot when nobody is signed in');
}

// --- one space per account -------------------------------------------------
function spaceSandbox(initial) {
  const storage = Object.assign({}, initial || {});
  const sandbox = {
    console,
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; }
    },
    __storage: storage
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext([
    "var GS_STORE_PERSONAL_KEY = 'GS_STORE';",
    "var NURVAN_ACTIVE_ACCOUNT_KEY = 'NURVAN_ACTIVE_ACCOUNT';",
    "var NURVAN_SPACE_MAP_KEY = 'NURVAN_SPACE_MAP';",
    "var NURVAN_PERSONAL_DB_NAME = 'GIAMMARIA_SYSTEM_DB';",
    sourceOf('accountSpaceId'),
    sourceOf('readActiveAccount'),
    sourceOf('writeActiveAccount'),
    sourceOf('readSpaceMap'),
    sourceOf('writeSpaceMap'),
    sourceOf('legacySpaceOwnerId'),
    sourceOf('personalStoreKeyFor'),
    sourceOf('personalScopedKey'),
    sourceOf('personalDbNameFor')
  ].join('\n'), sandbox);
  return sandbox;
}

{
  const s = spaceSandbox();
  const a = { id: 101, email: 'a@esempio.it' };
  const b = { id: 202, email: 'b@esempio.it' };
  const keyA = s.personalStoreKeyFor(a);
  const keyB = s.personalStoreKeyFor(b);
  ok(keyA !== keyB, 'two accounts on the same device get two different spaces');
  ok(s.personalDbNameFor(a) !== s.personalDbNameFor(b), 'and two different databases');
  ok(s.personalStoreKeyFor(a) === keyA, 'an account always comes back to its own space');
  ok(s.personalStoreKeyFor({}) === 'GS_STORE_guest' && s.personalDbNameFor({}) !== s.personalDbNameFor(a),
    'with nobody signed in there is a guest space, and it is not anybody\'s');
}
{
  // The device that was already in use: its data is where it has always been.
  const s = spaceSandbox({ GS_STORE: JSON.stringify({ accountToken: 't', accountUser: { id: 999, email: 'owner@esempio.it' } }) });
  const owner = { id: 999, email: 'owner@esempio.it' };
  ok(s.personalStoreKeyFor(owner) === 'GS_STORE', 'the account already using this device keeps the original key');
  ok(s.personalDbNameFor(owner) === 'GIAMMARIA_SYSTEM_DB', 'and the original database: nothing of theirs is moved');
  const other = s.personalStoreKeyFor({ id: 5, email: 'nuovo@esempio.it' });
  ok(other !== 'GS_STORE', 'another account signing in on that device does not land in it');
  ok(s.personalDbNameFor({ id: 5, email: 'nuovo@esempio.it' }) !== 'GIAMMARIA_SYSTEM_DB',
    'and cannot read its database either');
}

{
  // The food diary, the locked program backup and the "cleared" marker are
  // one account's too: on a shared device they used to be one and the same.
  const s = spaceSandbox({ GS_STORE: JSON.stringify({ accountToken: 't', accountUser: { id: 999 } }) });
  s.writeActiveAccount({ id: 999 });
  ok(s.personalScopedKey('NURVAN_FOOD_DIARY') === 'NURVAN_FOOD_DIARY',
    'the account already using this device keeps its food diary where it is');
  s.writeActiveAccount({ id: 5 });
  ok(s.personalScopedKey('NURVAN_FOOD_DIARY') !== 'NURVAN_FOOD_DIARY',
    'another account on the same device has its own diary');
  ok(s.personalScopedKey('nurvan_personal_program_lock') !== 'nurvan_personal_program_lock',
    'and its own locked program backup');
  ok(/personalScopedKey\('nurvan_personal_program_lock'\)/.test(base) && /localStorage\.getItem\(foodDiaryKey\(\)\)/.test(base),
    'which is what the app reads and writes');
}

// --- the app is locked until somebody signs in -----------------------------
{
  const sandbox = { console, document: { body: { classList: { toggle() {}, contains() { return false; } } }, querySelector: () => null } };
  sandbox.window = sandbox;
  sandbox.$ = () => null;
  sandbox.openAccount = () => { sandbox.__opened = true; };
  vm.createContext(sandbox);
  vm.runInContext([
    'var store = null;',
    'function isClientStorageContext() { return !!(store && store.clientShell); }',
    'function detectClientBootContext() { return false; }',
    sourceOf('loginGateRequired'),
    sourceOf('applyLoginGate')
  ].join('\n'), sandbox);

  sandbox.store = { accountToken: null };
  ok(sandbox.loginGateRequired() === true, 'signed out, the app is locked');
  sandbox.store = { accountToken: 'tok' };
  ok(sandbox.loginGateRequired() === false, 'signed in, it is not');
  sandbox.store = { accountToken: null, clientShell: true };
  ok(sandbox.loginGateRequired() === false, 'an athlete opening their coach\'s invite link is not locked out');
}
{
  ok(/body\.nurvan-locked > \*:not\(#account-modal\)/.test(base), 'while locked, only the account card is on screen');
  ok(/function closeAccount\(\)\{ if \(loginGateRequired\(\)\) return;/.test(base), 'and it cannot be dismissed');
  const initAt = base.indexOf('async function init()');
  const nsAt = base.indexOf('applyPersonalStorageNamespace', initAt);
  const idbAt = base.indexOf('GiammariaPersistence.init', initAt);
  ok(nsAt !== -1 && nsAt < idbAt, 'boot points the database at the signed-in account before reading anything');
  ok(built.includes('nurvan-locked') && built.includes('personalStoreKeyFor'), 'the built app carries all of it');
}

// --- the database really is per account ------------------------------------
{
  const engine = new GiammariaPersistenceEngine();
  ok(engine.databaseName() === DB_NAME, 'by default the engine opens the original database');
  engine.setDatabaseName('GIAMMARIA_SYSTEM_DB__u_5');
  ok(engine.databaseName() === 'GIAMMARIA_SYSTEM_DB__u_5' && engine._db === null && engine._openPromise === null,
    'pointing it at another account drops the open connection instead of reusing it');
  engine.setDatabaseName('');
  ok(engine.databaseName() === DB_NAME, 'and an empty name falls back to the original database');
}

console.log('\nAll account space tests passed.');
