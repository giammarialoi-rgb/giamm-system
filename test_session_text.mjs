// Il log della seduta come testo: cosa ci finisce dentro, e cosa no.
//
// Il testo si costruisce dalla card (buildSessionCardData), con la stessa
// lista chiusa di campi: niente peso corporeo, niente kcal, niente dati di
// salute. Qui si ritagliano le funzioni dalla pagina e si fanno girare su una
// seduta di esempio: con e senza record, con e senza note, con e senza cardio.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8').replace(/\r\n/g, '\n');
const BUILT = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8').replace(/\r\n/g, '\n');
const NL = String.fromCharCode(10);

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
  catch (e) { failed++; console.log('FAIL ' + message + ' -- atteso ' + JSON.stringify(expected) + ', ottenuto ' + JSON.stringify(actual)); }
}
function grab(name) {
  const at = SRC.indexOf('function ' + name + '(');
  if (at < 0) return '';
  const end = SRC.indexOf(NL + '}', at);
  return end < 0 ? '' : SRC.slice(at, end + 2) + NL;
}
function grabVar(name) {
  const at = SRC.indexOf('var ' + name + ' = {');
  const end = SRC.indexOf(NL + '};', at);
  return at < 0 || end < 0 ? '' : SRC.slice(at, end + 3) + NL;
}

const FNS = ['formatKgIt', 'formatDurationIt', 'formatSessionCardDate', 'formatSessionCardPr', 'buildSessionCardData',
  'sessionCardExercises', 'formatSessionTextDate', 'formatSessionTextLoad', 'formatSessionTextRest', 'sessionTextPrLabel',
  'sessionTextSetCount', 'sessionTextCardioMinutes', 'sessionTextLines', 'formatSessionCardText', 'formatSessionPeriodText',
  'isWarmupSet', 'parseRestSeconds', 'withBonusRows', 'sessionExerciseDetailsFor'];
const slice = grabVar('SESSION_CARD_PR_LABEL') + FNS.map(grab).join(NL);
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(slice, ctx);
const run = (code) => vm.runInContext(code, ctx);

console.log('');
console.log('--- 0. il blocco si ritaglia dal sorgente ---');
ok('0a. ci sono tutte le funzioni', FNS.every(function (n) { return grab(n).length > 0; }));
ok('0b. e sono nella pagina costruita', /function formatSessionCardText\(card\)/.test(BUILT) && /function copyStatsPeriodText\(\)/.test(BUILT) && /function sessionExerciseDetailsFor\(week, day\)/.test(BUILT));

// Una seduta come la salva finalizeWorkout, con dentro anche cose che nel
// testo non devono arrivare (kcal, intensita', peso corporeo). Due
// riscaldamenti, sei serie allenanti, dieci minuti di cardio.
const LOG = {
  id: 'sess_1', at: '2026-09-25T18:40:00', finalizedAt: '2026-09-25T18:40:00',
  week: 3, day: 1, durationSec: 2880, kcal: 412, tonnage: 2245, intensity: 7310,
  sets: 7, exercises: 3, reps: 39, bw: 82.4, bodyWeight: 82.4,
  muscles: { PETTO: 3, SPALLE: 3 }, cardioMinutes: 10
};
const EXERCISES = [
  { name: 'Panca piana', cardio: false, restSec: 120, sets: [
    { load: 40, reps: 10, warmup: true }, { load: 50, reps: 5, warmup: true },
    { load: 60, reps: 8, warmup: false }, { load: 80, reps: 6, warmup: false }, { load: 85, reps: 5, warmup: false }] },
  { name: 'Military press', cardio: false, restSec: 90, sets: [
    { load: 40, reps: 8 }, { load: 45, reps: 6 }, { load: 45, reps: 6 }] },
  { name: 'tapis roulant', cardio: true, minutes: 10 }
];
ctx.LOG = LOG;
ctx.EX = EXERCISES;
ctx.PRS = [{ type: 'weight', name: 'Panca piana', value: 85, week: 3, day: 1 }];

console.log('');
console.log('--- 1. la seduta del brief: 2 riscaldamenti + 6 allenanti + cardio, con record ---');
{
  const card = run('buildSessionCardData({ log: LOG, sessionName: "Chest & Shoulders", athleteName: "G", prs: PRS, exercises: EX })');
  const text = run('formatSessionCardText(' + JSON.stringify(card) + ')');
  console.log(text.split(NL).map(function (l) { return '     | ' + l; }).join(NL));
  eq(text, [
    '**Chest & Shoulders — 25/09/2026** (48 min · 2.245 kg · 6 serie)',
    '- Panca piana: 60×8 · 80×6 · 85×5 (rec. 2:00) — PR 85 kg',
    '- Military press: 40×8 · 45×6 · 45×6 (rec. 1:30)',
    '- Cardio: tapis roulant 10 min',
    'via Nurvan'
  ].join(NL), '1a. il testo esatto');
  ok('1b. sei serie contate, non sette (il cardio non e\' una serie) ne\' otto (i riscaldamenti no)', /· 6 serie\)/.test(text));
  ok('1c. nessun riscaldamento: 40×10 e 50×5 non ci sono', text.indexOf('40×10') < 0 && text.indexOf('50×5') < 0);
  ok('1d. il cardio e\' una riga con i minuti, mai in kg', /^- Cardio: tapis roulant 10 min$/m.test(text) && !/tapis roulant[^\n]*kg/.test(text));
  ok('1e. il record e\' sulla riga del suo esercizio, e solo li\'', (text.match(/PR /g) || []).length === 1);
  ok('1f. "via Nurvan" e\' l\'ultima riga', text.split(NL).pop() === 'via Nurvan');
  ok('1g. nessuna riga Note se non ci sono note', text.indexOf('Note:') < 0);
}

console.log('');
console.log('--- 2. mai dati di salute ---');
{
  const card = run('buildSessionCardData({ log: LOG, sessionName: "Chest & Shoulders", athleteName: "Giammaria", prs: PRS, exercises: EX })');
  const text = run('formatSessionCardText(' + JSON.stringify(card) + ')');
  ok('2a. il peso corporeo (82.4 / 82,4) non compare', text.indexOf('82.4') < 0 && text.indexOf('82,4') < 0);
  ok('2b. ne\' le kcal (412) ne\' l\'intensita\' (7310)', text.indexOf('412') < 0 && text.indexOf('7310') < 0);
  ok('2c. ne\' il nome dell\'atleta', text.indexOf('Giammaria') < 0);
  ok('2d. le parole della salute non ci sono', !/peso corporeo|kcal|calorie|misure|esami|terapi|vita|bw\b/i.test(text));
  const ex = card.exerciseLines;
  ok('2e. la lista degli esercizi e\' chiusa: nome, carico, ripetizioni, recupero, minuti',
    ex.every(function (e) { return Object.keys(e).every(function (k) { return ['name', 'cardio', 'sets', 'restSec', 'minutes'].indexOf(k) >= 0; }); }) &&
    ex.filter(function (e) { return !e.cardio; }).every(function (e) { return e.sets.every(function (s) { return Object.keys(s).join(',') === 'load,reps'; }); }));
  const text2 = run('formatSessionCardText(Object.assign({}, ' + JSON.stringify(card) + ', { bw: 82.4, kcal: 412, health: { weight: 82.4 } }))');
  ok('2f. e il formatter non legge campi che la card non ha, anche se qualcuno ce li mette', text2.indexOf('82') < 0 && text2.indexOf('412') < 0);
  const lines = grab('sessionTextLines') + grab('formatSessionCardText') + grab('formatSessionPeriodText');
  ok('2g. il formatter non legge store ne\' log', !/\bstore\b|\blog\b|\bDATA\b/.test(lines));
}

console.log('');
console.log('--- 3. senza record, con note, senza cardio ---');
{
  const plain = [EXERCISES[0], EXERCISES[1]];
  ctx.EX2 = plain;
  const card = run('buildSessionCardData({ log: Object.assign({}, LOG, { cardioMinutes: 0, notes: "  Spalla ok,\\n  ultima serie dura " }), sessionName: "Upper", prs: [], exercises: EX2 })');
  const text = run('formatSessionCardText(' + JSON.stringify(card) + ')');
  ok('3a. nessun PR se il motore non ne ha trovati', text.indexOf('PR') < 0);
  ok('3b. nessuna riga cardio', text.indexOf('Cardio') < 0);
  ok('3c. le note, su una riga, prima di "via Nurvan"', /\nNote: Spalla ok, ultima serie dura\nvia Nurvan$/.test(text));
  const blank = run('formatSessionCardText(buildSessionCardData({ log: Object.assign({}, LOG, { notes: "   " }), sessionName: "Upper", exercises: EX2 }))');
  ok('3d. note vuote: nessuna riga', blank.indexOf('Note:') < 0);
}

console.log('');
console.log('--- 4. i record ---');
{
  ctx.PRS4 = [
    { type: 'weight', name: 'Panca piana', value: 85 },
    { type: 'e1rm', name: 'Panca piana', value: 99.2 },
    { type: 'reps', name: 'Military press', value: 8, load: 40 },
    { type: 'weight', name: 'Stacco', value: 140 }
  ];
  const text = run('formatSessionCardText(buildSessionCardData({ log: LOG, sessionName: "X", prs: PRS4, exercises: EX }))');
  ok('4a. due record sullo stesso esercizio, sulla stessa riga', /Panca piana: [^\n]*— PR 85 kg, PR e1RM 99 kg/.test(text));
  ok('4b. il record di ripetizioni dice a che carico', /Military press: [^\n]*— PR 8 rip × 40 kg/.test(text));
  ok('4c. un record senza serie da elencare resta scritto', /^- Stacco — PR 140 kg$/m.test(text));
}

console.log('');
console.log('--- 5. casi di bordo ---');
{
  const text = run('formatSessionCardText(buildSessionCardData({ log: { at: "2026-09-25T10:00:00", durationSec: 1500, tonnage: 0, sets: 2, cardioMinutes: 25 }, sessionName: "Solo cardio" }))');
  eq(text, ['**Solo cardio — 25/09/2026** (25 min · 2 serie)', '- Cardio: 25 min', 'via Nurvan'].join(NL), '5a. senza dettaglio delle serie: il cardio dal log, niente kg a zero');
  ctx.EX5 = [{ name: 'Trazioni', sets: [{ load: 0, reps: 8 }, { load: 0, reps: 7 }] }, { name: 'Curl', restSec: 75, sets: [{ load: 12.5, reps: 10 }] }];
  const bw = run('formatSessionCardText(buildSessionCardData({ log: LOG, sessionName: "Pull", exercises: EX5 }))');
  ok('5b. a corpo libero: le ripetizioni, senza un carico a zero', /- Trazioni: 8 rip · 7 rip$/m.test(bw));
  ok('5c. carichi con i decimali alla italiana, recupero in m:ss', /- Curl: 12,5×10 \(rec\. 1:15\)$/m.test(bw));
}

console.log('');
console.log('--- 6. copia periodo: il totale in cima ---');
{
  ctx.C1 = run('buildSessionCardData({ log: LOG, sessionName: "Chest & Shoulders", prs: PRS, exercises: EX })');
  ctx.C2 = run('buildSessionCardData({ log: Object.assign({}, LOG, { at: "2026-09-22T18:00:00", finalizedAt: "2026-09-22T18:00:00", durationSec: 3600, tonnage: 5000, cardioMinutes: 0 }), sessionName: "Legs", exercises: [{ name: "Squat", restSec: 180, sets: [{ load: 100, reps: 5 }, { load: 100, reps: 5 }] }] })');
  const text = run('formatSessionPeriodText([C1, C2])');
  console.log(text.split(NL).map(function (l) { return '     | ' + l; }).join(NL));
  const first = text.split(NL)[0];
  eq(first, '**Totale: 2 sedute** (22/09/2026 – 25/09/2026 · 1 h 48 min · 7.245 kg · 8 serie · cardio 10 min)', '6a. la riga di totale');
  ok('6b. le due sedute, nell\'ordine dato, separate da una riga vuota', text.indexOf('**Chest & Shoulders') < text.indexOf('**Legs') && /\n\n\*\*Legs/.test(text));
  ok('6c. un solo "via Nurvan", in fondo', (text.match(/via Nurvan/g) || []).length === 1 && /\nvia Nurvan$/.test(text));
  eq(run('formatSessionPeriodText([])'), '', '6d. storico vuoto: niente testo');
}

console.log('');
console.log('--- 7. dalle serie salvate: saltati, riscaldamenti, cardio ---');
{
  ctx.store = {
    skips: { w1_d0_e2: true },
    subs: { w1_d0_e1: 'Military press' },
    data: {
      w1_d0_e0_s1_done: true, w1_d0_e0_s1_load: '40', w1_d0_e0_s1_reps: '10',
      w1_d0_e0_s2_done: true, w1_d0_e0_s2_load: '50', w1_d0_e0_s2_reps: '5',
      w1_d0_e0_s3_done: true, w1_d0_e0_s3_load: '60', w1_d0_e0_s3_reps: '8',
      w1_d0_e0_s4_done: true, w1_d0_e0_s4_load: '80', w1_d0_e0_s4_reps: '6',
      w1_d0_e0_s5_done: true, w1_d0_e0_s5_load: '85', w1_d0_e0_s5_reps: '5',
      w1_d0_e1_s1_done: true, w1_d0_e1_s1_load: '40', w1_d0_e1_s1_reps: '8',
      w1_d0_e1_s2_done: true, w1_d0_e1_s2_load: '45', w1_d0_e1_s2_reps: '6',
      w1_d0_e1_s3_done: true, w1_d0_e1_s3_load: '45', w1_d0_e1_s3_reps: '6',
      w1_d0_e1_s4_load: '50', w1_d0_e1_s4_reps: '6',
      w1_d0_e2_s1_done: true, w1_d0_e2_s1_load: '100', w1_d0_e2_s1_reps: '5',
      w1_d0_e3_s1_done: true, w1_d0_e3_s1_min: '10'
    }
  };
  ctx.DATA = { weeks: [{ sessions: [{ exercises: [
    { name: 'Panca piana', rest: '2 min', sets: [{ warmup: true }, { warmup: true }, {}, {}, {}] },
    { name: 'Lento avanti', rest: '90s', sets: [{}, {}, {}, {}] },
    { name: 'Saltato', rest: '90s', sets: [{}] },
    { name: 'tapis roulant', unit: 'cardio', sets: [{}] }
  ] }] }] };
  ctx.exerciseLogUnit = function (row) { return row.unit === 'cardio' ? 'cardio' : 'weight'; };
  ctx.prescribedMinutesFor = function () { return 0; };
  const details = run('sessionExerciseDetailsFor(1, 0)');
  eq(details.map(function (e) { return e.name; }), ['Panca piana', 'Military press', 'tapis roulant'], '7a. il saltato non c\'e\', il sostituto ha il suo nome');
  eq(details[0].sets.filter(function (s) { return s.warmup; }).length, 2, '7b. i riscaldamenti arrivano segnati');
  eq(details[1].sets.length, 3, '7c. solo le serie chiuse');
  eq([details[0].restSec, details[1].restSec], [120, 90], '7d. il recupero prescritto, in secondi');
  eq(details[2], { name: 'tapis roulant', cardio: true, minutes: 10 }, '7e. il cardio in minuti');
  ctx.DET = details;
  const text = run('formatSessionCardText(buildSessionCardData({ log: LOG, sessionName: "Chest & Shoulders", prs: PRS, exercises: DET }))');
  eq(text.split(NL).slice(1, 4), [
    '- Panca piana: 60×8 · 80×6 · 85×5 (rec. 2:00) — PR 85 kg',
    '- Military press: 40×8 · 45×6 · 45×6 (rec. 1:30)',
    '- Cardio: tapis roulant 10 min'
  ], '7f. dalle serie salvate al testo: 6 serie, cardio in minuti, niente riscaldamenti');
  ok('7g. 6 serie contate', /· 6 serie\)/.test(text));
  // A BONUS exercise added during the session (store.bonus, slot 900) is part of it.
  ctx.store.bonus = { w1_d0: [{ exercise: 'Curl', name: 'Curl', sets: 2 }] };
  ctx.store.data.w1_d0_e900_s1_done = true; ctx.store.data.w1_d0_e900_s1_load = '12'; ctx.store.data.w1_d0_e900_s1_reps = '10';
  const withBonus = run('sessionExerciseDetailsFor(1, 0)');
  ok('7h. gli esercizi BONUS entrano nella seduta', withBonus.some(function (e) { return e.name === 'Curl' && e.sets.length === 1 && e.sets[0].load === 12; }));
}

console.log('');
console.log('--- 8. dove sono i bottoni ---');
{
  ok('8a. sulla card di fine seduta (e da storico)', /onclick="copySessionTextFromOverlay\(\)">Copia testo</.test(grab('sessionCardOverlayHtml')));
  const review = grab('openLoggedSessionReview');
  ok('8b. nel riepilogo della seduta salvata (la seduta per id, se c\'e\')', /onclick="' \+ copyCall \+ '">Copia testo</.test(review) && /copySessionTextForLog\(/.test(review));
  ok('8c. su ogni riga dello storico, per id della seduta', /onclick="copySessionTextForLog\(' \+ hid \+ '\)">Copia testo</.test(SRC));
  ok('8d. e "Copia periodo" in testa allo storico', /onclick="copyStatsPeriodText\(\)">Copia periodo</.test(SRC));
  const shown = grab('statsHistoryShownLogs');
  ok('8e. il periodo sono le sedute che lo storico mostra: piano, poi 12 o tutte', /historyVisibleLogs\(store\.logs \|\| \[\]\)\.slice\(\)\.reverse\(\)/.test(shown) && /statsHistoryAll\) \? all : all\.slice\(0, 12\)/.test(shown));
  const copy = grab('copySessionTextToClipboard');
  ok('8f. navigator.clipboard, con toast "Copiato" info', /navigator\.clipboard\.writeText\(text\)/.test(copy) && /showToast\('Copiato', 'info'\)/.test(copy));
  ok('8g. senza permesso: finestra con il testo gia\' selezionato', /openManualCopyOverlay\(text\)/.test(copy) && /ta\.select\(\)/.test(grab('openManualCopyOverlay')));
  // Il programma puo' cambiare dopo la seduta, e store.data e' indicizzato
  // solo per settimana/giorno/posto: gli esercizi si fissano nel log.
  const fin = SRC.slice(SRC.indexOf('function finalizeWorkout('), SRC.indexOf('store.logs.push(logEntry);'));
  ok('8i. alla finalizzazione il log salva gli esercizi fatti', /exerciseLines: sessionExerciseDetailsFor\(currentWeek \|\| 1, currentDay \|\| 0\)/.test(fin));
  ok('8j. e li rifissa quando si modifica una seduta finalizzata', /hit\.exerciseLines = sessionExerciseDetailsFor\(week, day\);/.test(grab('refreshFinalizedLogInPlace')));
  const scf = grab('sessionCardFor');
  ok('8k. il testo usa solo gli esercizi salvati con la seduta, mai il programma di oggi', /exercises: Array\.isArray\(entry\.exerciseLines\) \? entry\.exerciseLines : \[\]/.test(scf) && !/sessionExerciseDetailsFor/.test(scf));
  ok('8k2. anche il nome della seduta si fissa nel log, e la card lo preferisce', /sessionName: sessionNameFor\(currentWeek \|\| 1, currentDay \|\| 0\)/.test(fin) &&
    /hit\.sessionName = sessionNameFor\(week, day\);/.test(grab('refreshFinalizedLogInPlace')) &&
    /const sessionName = String\(entry\.sessionName \|\| ''\) \|\| \(ofActive \? sessionNameFor\(w, d\) : ''\);/.test(scf));
  const oldLog = run('formatSessionCardText(buildSessionCardData({ log: Object.assign({}, LOG, { cardioMinutes: 0 }), sessionName: "Vecchia", exercises: [] }))');
  eq(oldLog, ['**Vecchia — 25/09/2026** (48 min · 2.245 kg · 7 serie)', 'via Nurvan'].join(NL), '8l. una seduta di prima, senza esercizi salvati: solo i totali, nessun esercizio inventato');
  ok('8h. persist() e finalizeWorkout non sono stati toccati', /function persist\(\) \{\s*\n\s*ensureStoreIntegrity\(\);/.test(SRC) && /store\.logs\.push\(logEntry\);\s*\n\s*if \(store\.logs\.length > 400\)/.test(SRC));
}

console.log('');
if (failed) { console.log(failed + ' test del testo della seduta falliti.'); process.exit(1); }
console.log('Tutti i test del testo della seduta passano.');
