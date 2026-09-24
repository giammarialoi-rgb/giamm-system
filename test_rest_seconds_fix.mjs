// Due residui: i recuperi "2 s" salvati prima della correzione, e il settimo
// giorno del generatore.
//
// La migrazione gira una volta per spazio: riconosce solo i recuperi scritti
// "N s" con N fino a 5 e rest_seconds fino a 5, li riporta a N minuti, lascia
// un registro e un avviso. Tutto il resto non si tocca. Il generatore si
// ferma a sei giorni, come l'onboarding: ogni split ne scrive sei, un settimo
// sarebbe una seduta inventata.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8').replace(/\r\n/g, '\n');
const BUILT = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8').replace(/\r\n/g, '\n');

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
function eq(actual, expected, message) {
  const a = actual !== null && typeof actual === 'object' ? JSON.stringify(actual) : actual;
  const b = expected !== null && typeof expected === 'object' ? JSON.stringify(expected) : expected;
  try { assert.equal(a, b); console.log('OK   ' + message); }
  catch (e) { failed++; console.log('FAIL ' + message + '\n     atteso ' + JSON.stringify(expected) + ', ottenuto ' + JSON.stringify(actual)); }
}
function grab(name) {
  const at = SRC.indexOf('function ' + name + '(');
  if (at < 0) return '';
  const end = SRC.indexOf('\n}', at);
  return end < 0 ? '' : SRC.slice(at, end + 2) + '\n';
}

function row(name, rest, sec, setSec) {
  return { name, rest, rest_seconds: sec, sets: [1, 2, 3].map(() => ({ reps: '8', rest_seconds: setSec == null ? sec : setSec })) };
}
function program(id, rows) {
  return { id, title: 'Scheda ' + id, weeks: [{ sessions: [{ exercises: rows }] }, { sessions: [{ exercises: JSON.parse(JSON.stringify(rows)) }] }] };
}

// A small in-memory persistence, same calls the page makes.
function fakePersistence(programs) {
  const db = {};
  programs.forEach((p, i) => { db[p.id] = { id: p.id, isActive: i === 0, createdAt: 'c', version: 1, model: JSON.parse(JSON.stringify(p)) }; });
  return {
    db,
    saves: 0,
    async listPrograms() { return Object.values(db).map((e) => ({ id: e.id, isActive: e.isActive, createdAt: e.createdAt, version: e.version })); },
    async loadProgram(id) { return db[id] ? JSON.parse(JSON.stringify(db[id].model)) : null; },
    async saveProgram(prog, active) { this.saves++; db[prog.id] = { id: prog.id, isActive: !!active, createdAt: 'c', version: 1, model: JSON.parse(JSON.stringify(prog)) }; }
  };
}

function page(active, library) {
  const P = fakePersistence([active].concat(library || []));
  const ctx = {
    console: { info() {}, table() {}, warn() {}, log() {} },
    store: { prefs: {} },
    DATA: JSON.parse(JSON.stringify(active)),
    GiammariaPersistence: P,
    toasts: [], persisted: 0, renders: 0
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(
    'function showRestFixNotice(m) { toasts.push(m); }\nfunction persist() { persisted++; }\nfunction render() { renders++; }\n' +
    'var REST_SECONDS_FIX_MAX = 5;\n' +
    ['secondRestTextValue', 'fixSecondRestsInProgram'].map(grab).join('\n') + '\nasync ' + grab('migrateSecondRestsOnce'), ctx);
  return { ctx, P, run: (c) => vm.runInContext(c, ctx) };
}

console.log('\n--- 0. i pezzi ci sono ---');
ok('0a. la migrazione e\' nella pagina costruita', /async function migrateSecondRestsOnce\(\)/.test(BUILT) && /function fixSecondRestsInProgram\(program\)/.test(BUILT));
ok('0b. e parte all\'avvio, dopo il primo render', /Promise\.resolve\(migrateSecondRestsOnce\(\)\)/.test(grab('finishInit')));
ok('0c. l\'avviso e\' un banner che resta, con la strada per Programmi', /function showRestFixNotice\(msg\)/.test(SRC) && /navigate\('programs'\)/.test(grab('showRestFixNotice')) && !/showToast/.test(grab('migrateSecondRestsOnce')));

console.log('\n--- 1. quali recuperi si riconoscono ---');
{
  const { run } = page(program('a', []));
  eq(run('["2 s", "2s", "5 s", "3 sec", "1,5 s", "90s", "6 s", "2 min", "", null, "10 s"].map(secondRestTextValue)'),
    [2, 2, 5, 3, 1.5, null, null, null, null, null, null], '1a. solo "N s" con N fino a 5');
  const p = program('b', [row('Panca', '2 s', 2), row('Curl', '90s', 90), row('Plank', '10 s', 10), row('Squat', '3 s', 45)]);
  const ch = run('fixSecondRestsInProgram(' + JSON.stringify(p) + ')');
  eq(ch.map((c) => c.exercise + ':' + c.before + '>' + c.after), ['Panca:2 s>2 min', 'Panca:2 s>2 min'], '1b. si corregge solo la panca, in entrambe le settimane');
  eq(Object.keys(ch[0]).sort(), ['after', 'before', 'exercise', 'program', 'session', 'week'], '1c. il registro dice esercizio, prima e dopo, e dove');
}

console.log('\n--- 2. la scheda con "2 s": 2 min e 120 s, avviso una volta ---');
{
  const active = program('act', [row('Panca piana', '2 s', 2), row('Curl', '60s', 60)]);
  const lib = program('lib', [row('Squat', '3 s', 3), row('Plank', '10 s', 10)]);
  const { ctx, P, run } = page(active, [lib]);
  const n = await run('migrateSecondRestsOnce()');
  const panca = ctx.DATA.weeks[0].sessions[0].exercises[0];
  eq([panca.rest, panca.rest_seconds, panca.sets.map((s) => s.rest_seconds)], ['2 min', 120, [120, 120, 120]], '2a. «2 s» diventa «2 min», rest_seconds 120, anche sulle serie');
  eq(ctx.DATA.weeks[1].sessions[0].exercises[0].rest, '2 min', '2b. in tutte le settimane');
  eq([ctx.DATA.weeks[0].sessions[0].exercises[1].rest, ctx.DATA.weeks[0].sessions[0].exercises[1].rest_seconds], ['60s', 60], '2c. il curl a 60 s non si tocca');
  eq(P.db.act.model.weeks[0].sessions[0].exercises[0].rest_seconds, 120, '2d. la scheda attiva e\' salvata corretta');
  const squat = P.db.lib.model.weeks[0].sessions[0].exercises[0];
  eq([squat.rest, squat.rest_seconds], ['3 min', 180], '2e. anche quella in libreria');
  eq(P.db.lib.model.weeks[0].sessions[0].exercises[1].rest, '10 s', '2f. un plank a 10 s resta a 10 s');
  eq(P.db.lib.isActive, false, '2g. e la scheda in libreria non diventa attiva');
  eq(n, 4, '2h. quattro recuperi corretti: panca e squat, due settimane ciascuno');
  eq(ctx.toasts.length, 1, '2i. un avviso');
  ok('2j. con il testo chiesto', ctx.toasts[0] === 'Ho corretto 4 recuperi che risultavano di pochi secondi: erano probabilmente minuti. Controlla in Programmi.');
  eq(ctx.store.restSecondsFixLog.length, 4, '2k. il registro resta nello spazio');
  ok('2l. il flag e\' scritto', !!ctx.store.__restSecondsFixV1);
  const saves = P.saves;
  const again = await run('migrateSecondRestsOnce()');
  eq([again, ctx.toasts.length, P.saves], [0, 1, saves], '2m. al riavvio successivo: niente da fare, nessun secondo avviso, nessun salvataggio');
  ctx.store.__restSecondsFixV1 = undefined;
  const third = await run('migrateSecondRestsOnce()');
  eq([third, ctx.toasts.length], [0, 1], '2n. e anche senza flag, una scheda gia\' corretta non genera avvisi');
}

console.log('\n--- 3. una scheda sana: nessun avviso ---');
{
  const { ctx, P, run } = page(program('ok', [row('Panca', '3 min', 180), row('Curl', '90s', 90), row('Plank', '30 s', 30)]));
  const n = await run('migrateSecondRestsOnce()');
  eq([n, ctx.toasts.length, P.saves, ctx.store.restSecondsFixLog], [0, 0, 0, undefined], '3a. niente da correggere, nessun avviso, nessun salvataggio');
  ok('3b. ma il passaggio e\' segnato come fatto', !!ctx.store.__restSecondsFixV1);
}

console.log('\n--- 4. lo spazio di un cliente non si tocca ---');
{
  const { ctx, run } = page(program('c', [row('Panca', '2 s', 2)]));
  ctx.store.coachViewingClient = true;
  const n = await run('migrateSecondRestsOnce()');
  eq([n, ctx.DATA.weeks[0].sessions[0].exercises[0].rest, !!ctx.store.__restSecondsFixV1], [0, '2 s', false], '4a. il coach che guarda un cliente non riscrive la sua scheda');
}

console.log('\n--- 5. il generatore si ferma a sei giorni ---');
{
  const lib = { self: {}, console };
  vm.createContext(lib);
  for (const file of ['web/exercise-taxonomy.js', 'web/program-builder.js', 'web/progression-models.js', 'web/cardio-library.js', 'web/program-generator.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), lib);
  }
  const G = lib.self.NurvanProgramGenerator;
  eq(G.DAYS, [1, 2, 3, 4, 5, 6], '5a. la schermata offre da 1 a 6 giorni');
  eq(G.MAX_DAYS, 6, '5b. il massimo e\' 6');
  const p = G.plan({ days: 7, weeks: 2, split: 'monofrequency' });
  eq(p.weeks[0].sessions.length, 6, '5c. chiedere 7 da fuori ne scrive 6, nessuna settima seduta inventata');
  eq(new Set(p.weeks[0].sessions.map((s) => s.name)).size, 6, '5d. sei sedute diverse');
  ok('5e. nessuno split arriva a 7', G.splitsFor(7).every((s) => true) && !/maxDays: 7/.test(fs.readFileSync(path.join(root, 'web/program-generator.js'), 'utf8')));
  ok('5f. i chip dei giorni leggono api.DAYS', /generatorChips\('days', api\.DAYS, g\.days\)/.test(SRC));
  ok('5g. una bozza salvata con 7 giorni torna a 6', /if \(Number\(store\.programGenerator\.days\) > maxDays\)/.test(grab('generatorDraft')));
  ok('5h. e il profilo non ne porta piu\' di 6', /g\.days = Math\.max\(1, Math\.min\(6, Math\.round\(Number\(profile\.trainingDays\)\)\)\);/.test(SRC));
}

console.log('\n' + (failed ? failed + ' controlli falliti' : 'tutti i controlli passano'));
process.exit(failed ? 1 : 0);
