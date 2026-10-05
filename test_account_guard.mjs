// The server does not let a device wipe a person's loads by accident: a mass deletion without a new epoch is not
// applied, a deliberate clear (a new epoch) is, a few deletions are, and a copy of the record is kept before a loss.
import { mergeAccountDataBlobs, updateAccountData, MASS_DELETE_MIN } from './server/account/index.mjs';

let failed = 0;
function ok(message, value) {
  if (value) console.log('OK  ', message);
  else { failed += 1; console.log('FAIL', message); }
}
const T0 = Date.parse('2026-10-05T10:00:00Z');
const T1 = Date.parse('2026-10-05T15:53:00Z');
const keys = (n) => { const o = {}; for (let i = 0; i < n; i++) o['w1_d0_e' + i + '_s1_load'] = String(40 + i); return o; };
const stamps = (o, t) => Object.fromEntries(Object.keys(o).map((k) => [k, t]));

const stored = { data: keys(200), mapStamps: { data: stamps(keys(200), T0) }, mapDeletes: {}, trainingDataEpoch: { at: '2026-10-03T16:45:55.637Z', program: 'p1' }, logs: [{ id: 'a', at: '2026-10-05T12:00:00Z' }] };

// the incident: everything deleted, same epoch
const wiped = { data: {}, mapStamps: { data: {} }, mapDeletes: { data: Object.fromEntries(Object.keys(keys(200)).map((k) => [k, T1])) }, trainingDataEpoch: stored.trainingDataEpoch };
let notes = [];
let merged = mergeAccountDataBlobs(stored, wiped, notes);
ok('a device that deletes every load in one sync does not delete them on the server', Object.keys(merged.data).length === 200);
ok('and the guard says so', notes.length === 1 && notes[0].field === 'data' && notes[0].kept === 200);
ok('the deletions are not kept as tombstones either (the next sync would bring them back)', Object.keys(merged.mapDeletes.data).length === 0);

// a deliberate clear: new epoch
const cleared = { ...wiped, trainingDataEpoch: { at: '2026-10-05T15:53:00Z', program: 'p2' } };
notes = [];
merged = mergeAccountDataBlobs(stored, cleared, notes);
ok('a deliberate clear (a program switch, "Azzera carichi": new epoch) goes through', Object.keys(merged.data).length === 0 && notes.length === 0);

// a few deletions are normal
const few = { data: Object.fromEntries(Object.entries(keys(200)).slice(10)), mapStamps: { data: {} }, mapDeletes: { data: Object.fromEntries(Object.keys(keys(200)).slice(0, 10).map((k) => [k, T1])) }, trainingDataEpoch: stored.trainingDataEpoch };
notes = [];
merged = mergeAccountDataBlobs(stored, few, notes);
ok('a few deletions (a skipped set, an undone edit) are applied', Object.keys(merged.data).length === 190 && notes.length === 0);

// a small record: below the minimum, deleting everything is allowed
const smallStored = { data: keys(MASS_DELETE_MIN - 1), mapStamps: { data: stamps(keys(MASS_DELETE_MIN - 1), T0) }, mapDeletes: {} };
const smallWipe = { data: {}, mapStamps: { data: {} }, mapDeletes: { data: Object.fromEntries(Object.keys(smallStored.data).map((k) => [k, T1])) } };
merged = mergeAccountDataBlobs(smallStored, smallWipe, []);
ok('a record with few keys can be emptied (nothing to protect)', Object.keys(merged.data).length === 0);

// the logs are never lost either
ok('the sessions of the record stay', merged !== null && mergeAccountDataBlobs(stored, wiped, []).logs.length === 1);

// ---- the history
function fakePool(current, last) {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (/SELECT data, revision FROM app_account_data/.test(sql)) return { rows: [{ data: current, revision: 7 }] };
      if (/SELECT created_at FROM app_account_history/.test(sql)) return { rows: last ? [{ created_at: last }] : [] };
      return { rows: [] };
    },
    release() {}
  };
  return { calls, pool: { connect: async () => client } };
}
const bigRecord = { data: keys(200) };
let fp = fakePool(bigRecord, null);
await updateAccountData(fp.pool, 1, () => ({ data: keys(200) }));
ok('the first change of the day keeps a copy of the record', fp.calls.some((c) => /INSERT INTO app_account_history/.test(c.sql) && c.params[2] === 'daily'));
fp = fakePool(bigRecord, new Date().toISOString());
await updateAccountData(fp.pool, 1, () => ({ data: keys(200) }));
ok('a second change the same day does not', !fp.calls.some((c) => /INSERT INTO app_account_history/.test(c.sql)));
fp = fakePool(bigRecord, new Date().toISOString());
await updateAccountData(fp.pool, 1, () => ({ data: keys(20) }));
ok('but a record that loses half of its loads is copied first, whatever the day', fp.calls.some((c) => /INSERT INTO app_account_history/.test(c.sql) && c.params[2] === 'shrink'));
ok('the copy is made before the record is overwritten', fp.calls.findIndex((c) => /INSERT INTO app_account_history/.test(c.sql)) < fp.calls.findIndex((c) => /UPDATE app_account_data/.test(c.sql)));
fp = fakePool({}, null);
await updateAccountData(fp.pool, 1, () => ({ data: keys(5) }));
ok('an empty record has nothing to copy', !fp.calls.some((c) => /INSERT INTO app_account_history/.test(c.sql)));
// a failing history never stops the save
const failing = fakePool(bigRecord, null);
const real = failing.pool.connect;
failing.pool.connect = async () => { const c = await real(); const q = c.query; c.query = async (sql, p) => { if (/app_account_history/.test(sql)) throw new Error('no table'); return q(sql, p); }; return c; };
let saved = false;
try { await updateAccountData(failing.pool, 1, () => ({ data: keys(200) })); saved = failing.calls.some((c) => /UPDATE app_account_data/.test(c.sql)); } catch (_) {}
ok('if the history cannot be written the record is still saved', saved);

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nProtezione dei carichi e cronologia dei record: tutto verde');
