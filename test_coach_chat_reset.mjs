// "Azzera chat" and "Azzera archivio" of the Coach AI really clear, and stay
// cleared after the app is opened again. Two things undid them: the server
// kept whichever chat was longer (so the cloud handed the old one back under
// the new reset mark), and every save wrote the open conversation back into
// the archive that had just been emptied.
import fs from 'node:fs';
import vm from 'node:vm';
import { mergeAccountDataBlobs } from './server/account/index.mjs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const msgs = (n) => Array.from({ length: n }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: 'm' + i }));
const arc = (id) => ({ id, at: '2026-10-01T10:00:00.000Z', preview: id, messages: msgs(2) });

// --- server ---------------------------------------------------------------
{
  const cloud = { chatHistory: msgs(30), chatClearedAt: 100 };
  const m = mergeAccountDataBlobs(cloud, { chatHistory: [], chatClearedAt: 200 });
  ok('1a. server: una chat azzerata dopo sostituisce quella più lunga in cloud', m.chatHistory.length === 0 && m.chatClearedAt === 200);
  const again = mergeAccountDataBlobs(m, { chatHistory: msgs(30), chatClearedAt: 100 });
  ok('1b. server: un dispositivo rimasto a prima dell’azzeramento non la riporta', again.chatHistory.length === 0 && again.chatClearedAt === 200);
  const grow = mergeAccountDataBlobs(m, { chatHistory: msgs(4), chatClearedAt: 200 });
  ok('1c. server: dopo l’azzeramento la nuova conversazione viene salvata', grow.chatHistory.length === 4);
  const same = mergeAccountDataBlobs({ chatHistory: msgs(6), chatClearedAt: 200 }, { chatHistory: msgs(4), chatClearedAt: 200 });
  ok('1d. server: senza un nuovo azzeramento resta la più lunga', same.chatHistory.length === 6);
  const old = mergeAccountDataBlobs({ chatHistory: msgs(6) }, { chatHistory: msgs(8) });
  ok('1e. server: account senza alcun azzeramento, come prima', old.chatHistory.length === 8 && old.chatClearedAt === 0);
}
{
  const cloud = { coachArchives: [arc('a'), arc('b')], coachArchivesClearedAt: 0 };
  const m = mergeAccountDataBlobs(cloud, { coachArchives: [], coachArchivesClearedAt: 300 });
  ok('2a. server: archivio azzerato', m.coachArchives.length === 0 && m.coachArchivesClearedAt === 300);
  const back = mergeAccountDataBlobs(m, { coachArchives: [arc('a'), arc('b')], coachArchivesClearedAt: 0 });
  ok('2b. server: un dispositivo vecchio non rimette le chat cancellate', back.coachArchives.length === 0 && back.coachArchivesClearedAt === 300);
  const one = mergeAccountDataBlobs({ coachArchives: [arc('a'), arc('b')] }, { coachArchives: [arc('b')], coachArchivesDeleted: { a: 5 } });
  const other = mergeAccountDataBlobs(one, { coachArchives: [arc('a'), arc('b'), arc('c')] });
  ok('2c. server: una singola chat cancellata resta cancellata', one.coachArchives.map((a) => a.id).join() === 'b' && other.coachArchives.map((a) => a.id).join() === 'b,c');
}

// --- app ------------------------------------------------------------------
const html = fs.readFileSync('web/index.base.html', 'utf8').replace(/\r\n/g, '\n');
const cut = (a, b) => { const i = html.indexOf(a); const j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('block not found: ' + a); return html.slice(i, j); };
function world() {
  const calls = { uploads: 0, renders: 0 };
  const c = {
    console: { debug() {}, warn() {}, log() {} }, window: {}, Date, Promise, Math, String, Array, Object, Number,
    store: { accountToken: 'tok', chatHistory: [], coachArchives: [] },
    $: () => null, confirm: () => true, showToast() {}, render() { calls.renders++; },
    closeResetSession() {}, coachRequestToken: 0,
    uploadAccountDataFast: () => { calls.uploads++; return Promise.resolve({ uploaded: true }); }
  };
  vm.createContext(c);
  vm.runInContext('function persist() { try { upsertLiveCoachArchive(); } catch (_) {} }\n'
    + cut('function clearCoachSession(){', 'function loadCoachArchive(id) {')
    + cut('function resetCoachHistory() {', 'function sanitizeCoachDisplayText(raw) {'), c);
  return { c, calls };
}
{
  const { c, calls } = world();
  c.store.chatHistory = msgs(4);
  vm.runInContext('persist();', c);
  ok('3a. una conversazione aperta è nell’archivio mentre la usi', c.store.coachArchives.length === 1);
  c.store.coachArchives.unshift(arc('old'));
  vm.runInContext('confirmResetSession();', c);
  ok('3b. Azzera chat: la conversazione sparisce, anche dall’archivio', c.store.chatHistory.length === 0 && c.store.coachArchives.map((a) => a.id).join() === 'old');
  ok('3c. e resta cancellata sugli altri dispositivi', Object.keys(c.store.coachArchivesDeleted || {}).length === 1 && c.store.chatClearedAt > 0);
  ok('3d. viene mandata subito all’account', calls.uploads === 1);
  vm.runInContext('persist();', c);
  ok('3e. un salvataggio successivo non la rimette', c.store.coachArchives.length === 1);
}
{
  const { c, calls } = world();
  c.store.chatHistory = msgs(4);
  c.store.coachArchives = [arc('a'), arc('b')];
  vm.runInContext('persist(); resetCoachHistory();', c);
  ok('4a. Azzera archivio: vuoto subito, anche con una conversazione aperta', c.store.coachArchives.length === 0 && c.store.coachArchivesClearedAt > 0);
  vm.runInContext('persist(); persist();', c);
  ok('4b. e resta vuoto ai salvataggi successivi (prima la chat aperta ci tornava subito)', c.store.coachArchives.length === 0);
  ok('4c. la conversazione aperta resta sullo schermo', c.store.chatHistory.length === 4);
  ok('4d. viene mandato subito all’account', calls.uploads === 1);
  c.store.chatHistory.push({ role: 'user', text: 'nuova domanda' });
  vm.runInContext('persist();', c);
  ok('4e. quando la conversazione continua torna a essere salvata', c.store.coachArchives.length === 1);
}
ok('5. il testo del pulsante dice quello che fa', /La conversazione aperta viene cancellata, anche dall’archivio e su tutti i dispositivi/.test(html) && !/si chiude e va nell’archivio/.test(html));

console.log('');
if (failed) { console.log(failed + ' controlli dell’azzeramento chat falliti.'); process.exit(1); }
console.log('Tutti i controlli dell’azzeramento chat passano.');
