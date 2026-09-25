// Level 2 of the 25/09 audit, second block: training numbers and history.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { mergeAccountDataBlobs } from './server/account/index.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
const SRC = read('web/index.base.html');
const NL = '\n';
let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
function grab(name) {
  const at = SRC.search(new RegExp('(async )?function ' + name + '\\('));
  if (at < 0) return '';
  const end = SRC.indexOf(NL + '}', at);
  return SRC.slice(at, end + 2) + NL;
}
function grabVar(name) {
  const at = SRC.indexOf('var ' + name + ' = ');
  const end = SRC.indexOf(';' + NL, at);
  return at < 0 ? '' : SRC.slice(at, end + 2);
}

console.log('');
console.log('--- 1. cambio programma ---');
{
  const ctx = { console, Date };
  vm.createContext(ctx);
  vm.runInContext(grabVar('TRAINING_SLOT_FIELDS') + NL + grabVar('STAMPED_MAP_FIELDS') + NL + ['mapValueSig', 'mapSnapshot', 'resetMapStampsFor', 'activeProgramKey', 'logIsOfActiveProgram', 'logsOfActiveProgram', 'findLogById', 'sessionWasFinalized', 'markTrainingDataEpoch', 'clearWorkoutLogsForNewProgram'].map(grab).join(NL), ctx);
  ctx.DATA = { id: 'progA' };
  ctx.store = {
    activeProgramId: 'progA',
    logs: [{ id: 's1', week: 1, day: 0, at: '2026-09-01' }, { id: 's2', week: 1, day: 1, at: '2026-09-03' }],
    data: { w1_d0_e0_s1_load: '80' }, customSets: { w1_d0_e0: 5 },
    subs: { w1_d0_e2: 'Panca inclinata' }, skips: { w1_d0_e3: true }, warmups: { w1_d0: { items: [1] } }, bonus: { w1_d0: [{ name: 'Curl' }] }
  };
  ok('1a. prima del cambio W1 S1 risulta finalizzata', vm.runInContext('sessionWasFinalized(1, 0)', ctx) === true);
  await vm.runInContext('clearWorkoutLogsForNewProgram("progA")', ctx);
  ctx.store.activeProgramId = 'progB'; ctx.DATA = { id: 'progB' };
  ok('1b. le sedute fatte restano, marcate col programma vecchio', ctx.store.logs.length === 2 && ctx.store.logs.every((l) => l.programId === 'progA'));
  ok('1c. W1 S1 del programma nuovo NON risulta finalizzata', vm.runInContext('sessionWasFinalized(1, 0)', ctx) === false);
  ok('1d. sostituzioni, esercizi saltati, riscaldamenti, bonus del vecchio programma azzerati', ['data', 'customSets', 'subs', 'skips', 'warmups', 'bonus'].every((k) => Object.keys(ctx.store[k]).length === 0));
  ok('1e. e l\'epoca dei dati di allenamento e\' segnata', !!(ctx.store.trainingDataEpoch && ctx.store.trainingDataEpoch.at));
  ok('1e2. e le ore delle modifiche di quei campi ripartono da zero', ['data', 'subs', 'skips'].every((k) => Object.keys(ctx.store.mapStamps[k]).length === 0 && Object.keys(ctx.store.mapDeletes[k]).length === 0));
  ok('1f. la seduta vecchia si ritrova per id', vm.runInContext('findLogById("s1")', ctx).id === 's1');
  ok('1g. alla finalizzazione la seduta porta programma e record', /programId: activeProgramKey\(\) \|\| null,\s*\n\s*prs: frozenSessionPrs\(currentWeek \|\| 1, currentDay \|\| 0\)/.test(SRC));
  ok('1h. le righe dello storico aprono la loro seduta per id, e MODIFICA solo per il programma attivo',
    /onclick="openSessionCardForLog\(' \+ hid \+ '\)">CARD/.test(SRC) && /\(logIsOfActiveProgram\(row\) \? '<button[^']*startEditFinalizedWorkout/.test(SRC));
  const review = grab('openLoggedSessionReview');
  ok('1i. il riepilogo di una seduta di un altro programma mostra le serie salvate con lei, senza MODIFICA', /log\.exerciseLines\.length\)\s*\n\s*\? loggedSessionLinesFromLog\(log\)/.test(review) && /\(ofActive \? '<button[^\n]*MODIFICA ALLENAMENTO FINALIZZATO<\/button>' : ''\)/.test(review));
  const card = grab('sessionCardFor');
  ok('1j. card: record salvati con la seduta; per un altro programma nessun record ricalcolato', /prs: Array\.isArray\(entry\.prs\) \? entry\.prs : \(ofActive \? sessionPrsFor\(w, d\) : \[\]\)/.test(card));
}

console.log('');
console.log('--- 2. i carichi azzerati non tornano dal cloud ---');
{
  const t0 = '2026-09-01T10:00:00Z', t1 = '2026-09-20T10:00:00Z';
  const cloud = { trainingDataEpoch: { at: t0 }, data: { w1_d0_e0_s1_load: '80', w1_d0_e0_s1_done: true }, subs: { w1_d0_e2: 'Vecchio' } };
  const cleared = { trainingDataEpoch: { at: t1 }, data: { w1_d0_e0_s1_load: '50' }, subs: {} };
  const m1 = mergeAccountDataBlobs(cloud, cleared);
  ok('2a. il dispositivo che ha cambiato programma: i suoi dati sostituiscono quelli vecchi, non si mescolano', m1.data.w1_d0_e0_s1_load === '50' && !m1.data.w1_d0_e0_s1_done && Object.keys(m1.subs).length === 0);
  const stale = { trainingDataEpoch: { at: t0 }, data: { w1_d0_e0_s1_load: '80', w1_d0_e0_s1_done: true, w1_d1_e0_s1_load: '90' }, subs: { w1_d0_e2: 'Vecchio' } };
  const m2 = mergeAccountDataBlobs(m1, stale);
  ok('2b. un telefono rimasto al programma vecchio non riporta i suoi carichi', m2.data.w1_d0_e0_s1_load === '50' && !m2.data.w1_d1_e0_s1_load && Object.keys(m2.subs).length === 0);
  const same = mergeAccountDataBlobs(m1, { trainingDataEpoch: { at: t1 }, data: { w1_d1_e0_s1_load: '55' } });
  ok('2c. stessa epoca: si uniscono come prima', same.data.w1_d0_e0_s1_load === '50' && same.data.w1_d1_e0_s1_load === '55');
  const none = mergeAccountDataBlobs({ data: { a: 1 } }, { data: { b: 2 } });
  ok('2d. senza epoca da nessuna parte: come prima', none.data.a === 1 && none.data.b === 2);
  const apply = grab('applyRemoteAccountData');
  ok('2e. anche la pagina: la parte piu\' recente vince intera, quella piu\' vecchia non viene unita',
    /\} else if \(trainingEpochMs\(remote\.trainingDataEpoch\) > trainingEpochMs\(store\.trainingDataEpoch\)\) \{/.test(apply) && /\} else if \(trainingEpochMs\(store\.trainingDataEpoch\) > trainingEpochMs\(remote\.trainingDataEpoch\)\) \{/.test(apply));
  ok('2f. "Azzera carichi" segna l\'epoca', /store\.logs = \[\];\s*\n\s*\/\/ The next sync must not bring the cleared loads back from the cloud\.\s*\n\s*markTrainingDataEpoch\(\);/.test(SRC));
}

console.log('');
console.log('--- 3. durata della seduta ---');
{
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(grab('sessionSetTimes') + grab('sessionDurationSec'), ctx);
  const base = Date.UTC(2026, 8, 22, 18, 0, 0);
  const data = {};
  [0, 10, 25, 40].forEach((min, i) => { const k = 'w1_d0_e0_s' + (i + 1); data[k + '_done'] = true; data[k + '_done_at'] = base + min * 60000; });
  ctx.store = { data, sessionStartedAt: base - 48 * 3600 * 1000 };
  ctx.sessionElapsedMs = () => 48 * 3600 * 1000;
  ok('3a. orologio partito lunedi\', seduta chiusa mercoledi\': 42 min dalle serie, non 48 h', vm.runInContext('sessionDurationSec(1, 0, 4)', ctx) === 40 * 60 + 120);
  ctx.sessionElapsedMs = () => 5000;
  ok('3b. STOP e poi FINALIZZA (orologio a pochi secondi): 42 min, non 1 min', vm.runInContext('sessionDurationSec(1, 0, 4)', ctx) === 40 * 60 + 120);
  ctx.sessionElapsedMs = () => 50 * 60000;
  ok('3c. un orologio coerente con le serie (50 min) vale', vm.runInContext('sessionDurationSec(1, 0, 4)', ctx) === 50 * 60);
  ctx.store = { data: {}, sessionStartedAt: 0 };
  ok('3d. senza ore e senza orologio: 90 s a serie', vm.runInContext('sessionDurationSec(1, 0, 10)', ctx) === 900);
  const save = grab('saveFinalizedWorkoutEdits');
  ok('3e. salvare le modifiche di una seduta finalizzata ferma l\'orologio', /store\.sessionStartedAt = null;/.test(save) && /store\.sessionClockRunning = false;/.test(save));
  const refresh = grab('refreshFinalizedLogInPlace');
  ok('3f. la modifica aggiorna tutto il log: serie a 0 restano 0, ripetizioni e minuti di cardio seguono',
    /hit\.sets = snap\.sets \|\| 0;/.test(refresh) && /hit\.reps = snap\.reps \|\| 0;/.test(refresh) && /hit\.cardioMinutes = snap\.cardioMinutes \|\| 0;/.test(refresh) && /hit\.prs = frozenSessionPrs\(week, day\);/.test(refresh));
}

console.log('');
console.log('--- 4. statistiche e contatore ---');
{
  const stats = grab('renderStats');
  ok('4a. il riquadro dell\'ultima seduta usa solo i suoi numeri (0 resta 0, niente totali del programma)', /weight: Number\(last\.tonnage\) \|\| 0,/.test(stats) && /muscles: Object\.assign\(\{\}, last\.muscles \|\| \{\}\)/.test(stats) && !/last\.tonnage \|\| live\.weight/.test(stats));
  ok('4b. il contatore dal vivo conta come la seduta finalizzata', /const snap = collectSessionStats\(\{ currentSessionOnly: true \}\);/.test(grab('calcStats')));
  ok('4c. BONUS nella seduta, nel log e nell\'invio al cloud', (SRC.match(/withBonusRows\(/g) || []).length >= 4);
}

console.log('');
console.log('--- 5. eliminare una serie ---');
{
  const row = { name: 'Panca', sets: [{ warmup: true }, {}, {}, {}] };
  const DATA = { weeks: [{ sessions: [{ exercises: [row] }] }, { sessions: [{ exercises: [{ name: 'Panca', sets: [{ warmup: true }, {}, {}, {}] }] }] }] };
  const data = {
    w1_d0_e0_s1_load: '40', w1_d0_e0_s1_reps: '8', w1_d0_e0_s1_done: true, w1_d0_e0_s1_done_at: 1,
    w1_d0_e0_s2_load: '80', w1_d0_e0_s2_reps: '6', w1_d0_e0_s2_done: true, w1_d0_e0_s2_done_at: 2, w1_d0_e0_s2_rest_actual: 120,
    w1_d0_e0_s3_load: '82', w1_d0_e0_s3_reps: '6', w1_d0_e0_s3_min: '7',
    w1_d0_e0_s4_load: '84', w1_d0_e0_s4_reps: '5'
  };
  const ctx = { console, DATA, store: { data, customSets: {} }, currentWeek: 1, currentDay: 0,
    pushWorkoutUndoSnapshot() {}, persist() {}, render() {}, recordManualAction() {}, alert() {}, persistActiveProgramStructure() {},
    getExerciseSetCount: () => 4 };
  vm.createContext(ctx);
  vm.runInContext(grab('removeSetFromExercise'), ctx);
  vm.runInContext('removeSetFromExercise(0, 1)', ctx);
  ok('5a. tolto il riscaldamento R1: la prima allenante (80x6) sale in R1 con tutti i suoi dati', data.w1_d0_e0_s1_load === '80' && data.w1_d0_e0_s1_done === true && data.w1_d0_e0_s1_done_at === 2 && data.w1_d0_e0_s1_rest_actual === 120);
  ok('5b. e R1 non e\' piu\' un riscaldamento: la struttura ha perso la stessa riga', row.sets.length === 3 && !row.sets[0].warmup);
  ok('5c. anche i minuti si spostano con la loro serie, niente resti in fondo', data.w1_d0_e0_s2_min === '7' && !('w1_d0_e0_s3_min' in data) && !('w1_d0_e0_s4_load' in data));
  ok('5d. le altre settimane non si toccano', DATA.weeks[1].sessions[0].exercises[0].sets.length === 4);
}

console.log('');
console.log('--- 6. esercizi a tempo e serie riaperte ---');
{
  const quick = grab('completeSetQuick');
  ok('6a. un esercizio a tempo non prende "45s" come 45 ripetizioni', /if \(reps === '' && unitHere !== 'time' && unitHere !== 'cardio'\) \{/.test(quick));
  global.self = global; global.window = global;
  await import('./web/training-analytics-engine.js');
  const E = global.TrainingAnalyticsEngine;
  const meta = { name: 'Panca', sets: [{}, {}] };
  const store = { data: { w1_d0_e0_s1_load: 80, w1_d0_e0_s1_reps: 8, w1_d0_e0_s1_done: true, w1_d0_e0_s2_load: 120, w1_d0_e0_s2_reps: 8, w1_d0_e0_s2_done: false }, logs: [] };
  const sets = E.normalizeSets(store, { weeks: [{ sessions: [{ exercises: [meta] }] }] });
  ok('6b. una serie spuntata e poi riaperta non conta (niente 120 kg di record)', sets.length === 1 && sets[0].loadRaw === 80);
}

console.log('');
if (failed) { console.log(failed + ' controlli del livello 2 (allenamento) falliti.'); process.exit(1); }
console.log('Tutti i controlli del livello 2 (allenamento) passano.');
