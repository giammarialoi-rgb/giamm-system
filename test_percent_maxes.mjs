// Loads written as a % of a max, in the app: the maxes the imported file
// stated become the program's, the kilos are computed the way the sheet
// rounded them, and changing a max recomputes them without touching what the
// athlete already did or typed.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { unitHelpersSource } from './test_unit_helpers.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8').replace(/\r\n/g, '\n');
let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

const block = SRC.slice(SRC.indexOf('// ---- Loads as a percentage of a max ----'), SRC.indexOf('function applySsttStartInputs() {'));
const ctx = {
  console,
  window: {},
  store: { data: {}, prefs: {}, profile: {} },
  DATA: null,
  esc: (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  isWarmupSet: (s) => Boolean(s && s.warmup),
  weekExerciseWasLogged: (w, d, e) => !!(ctx.__logged && ctx.__logged[w + '_' + d + '_' + e]),
  persist() {},
  persistActiveProgramStructure() {},
  recordManualAction() {},
  render() {},
  showToast(msg, type) { ctx.__toast = { msg, type }; },
  document: { getElementById: (id) => (ctx.__inputs && ctx.__inputs[id]) || null }
};
// The competition lift of a name, as progression-models.js answers it (variants are not the lift).
ctx.window.NurvanProgressions = {
  competitionLiftFor: (name) => (/^squat$/i.test(String(name).trim()) ? 'squat' : (/^panca( piana)?$/i.test(String(name).trim()) ? 'bench' : null)),
  liftLabel: (id) => ({ squat: 'Squat', bench: 'Panca piana', deadlift: 'Stacco da terra' }[id] || id)
};
vm.createContext(ctx);
// The weight unit helpers, as the page has them (kg unless set).
vm.runInContext(unitHelpersSource(), ctx);
vm.runInContext(block, ctx);

const set = (pct, load, extra) => Object.assign({ percentage_1rm: pct, target_load: load, load }, extra || {});
function program() {
  return {
    weeks: [{
      sessions: [{
        exercises: [
          // From a sheet: loads =CEILING(projected max * %, 2.5), each set says which max.
          { name: 'Squat', sets: [set(50, 145, { percent_of: { lift: 'squat' }, load_formula: "CEILING('Weeks 1-16'!$B$13*C21,$B$17)" }), set(55, 160, { percent_of: { lift: 'squat' } })] },
          // A variant whose formula reads the bench max: % of the bench.
          { name: 'CGBP', sets: [set(45, 82.5, { percent_of: { lift: 'bench' } })] },
          // Accessory: no %, nothing to compute.
          { name: 'Leg extensions', sets: [{ target_rpe: 8, target_load: null }] }
        ]
      }]
    }, {
      sessions: [{
        exercises: [
          // From a Word "SQUAT 5X5 60%": a %, no kilos, no formula.
          { name: 'Squat', sets: [set(60, null), set(60, null)] },
          // A variant with a % and no formula: which max is unknown, left alone.
          { name: 'Panca presa larga', sets: [set(50, null)] }
        ]
      }]
    }]
  };
}

console.log('');
console.log('--- 1. dopo l\'import: massimali del file, arrotondamento, kg mancanti ---');
{
  ctx.DATA = program();
  ctx.store.data = {};
  vm.runInContext('initPercentModelFromImport({ spreadsheet: { maxes: { squat: { value: 290, kind: "projected" }, bench: { value: 182.5, kind: "projected" } } } })', ctx);
  const D = ctx.DATA;
  ok('1a. i massimali del file diventano quelli del programma', D.progression.maxes.squat === 290 && D.progression.maxes.bench === 182.5);
  ok('1b. l\'arrotondamento e\' quello delle formule (CEILING a 2.5)', D.progression.rounding.mode === 'ceil' && D.progression.rounding.step === 2.5);
  ok('1c. i kg gia\' scritti dal file non cambiano', D.weeks[0].sessions[0].exercises[0].sets[0].target_load === 145);
  const w2 = D.weeks[1].sessions[0].exercises;
  ok('1d. "5X5 60%" senza kg: 60% di 290 = 174 (arrotondato per eccesso a 2.5)', w2[0].sets.every((s) => s.target_load === 175));
  ok('1e. lo squat da Word e\' riconosciuto come squat per nome', w2[0].percent_lift === 'squat');
  ok('1f. una variante con % ma senza formula non riceve kg inventati', w2[1].sets[0].target_load == null && !w2[1].percent_lift);
  ok('1g. l\'import non scrive nei campi dell\'allenamento', Object.keys(ctx.store.data).length === 0);
  ok('1h. le alzate da chiedere: squat e panca, in quest\'ordine', JSON.stringify(vm.runInContext('programPercentLifts()', ctx)) === '["squat","bench"]');
}

console.log('');
console.log('--- 2. l\'atleta cambia i massimali dal pannello ---');
{
  ctx.store.data = { w1_d0_e0_s1_done: true, w1_d0_e0_s1_load: 145, w1_d0_e1_s1_load_user: true, w1_d0_e1_s1_load: 80 };
  ctx.__inputs = { 'pct-max-squat': { value: '300' }, 'pct-max-bench': { value: '190' } };
  vm.runInContext('applyPercentMaxesFromPanel()', ctx);
  const D = ctx.DATA;
  const sq = D.weeks[0].sessions[0].exercises[0].sets;
  ok('2a. il programma ricalcola: 50% di 300 = 150, 55% = 165', sq[0].target_load === 150 && sq[1].target_load === 165);
  ok('2b. la variante segue il massimale di panca: 45% di 190 = 85.5 -> 87.5', D.weeks[0].sessions[0].exercises[1].sets[0].target_load === 87.5);
  ok('2c. la serie gia\' fatta resta com\'era nell\'allenamento', ctx.store.data.w1_d0_e0_s1_load === 145);
  ok('2d. il carico scritto dall\'atleta resta suo', ctx.store.data.w1_d0_e1_s1_load === 80);
  ok('2e. la serie non ancora fatta prende il nuovo carico', ctx.store.data.w1_d0_e0_s2_load === 165);
  ok('2f. i massimali nuovi restano nel programma', D.progression.maxes.squat === 300 && D.progression.maxes.bench === 190);
  ok('2g. l\'atleta vede cosa e\' cambiato', ctx.__toast && ctx.__toast.type === 'ok' && /Squat 300 kg/.test(ctx.__toast.msg));
}

console.log('');
console.log('--- 3. il pannello e l\'intensita\' mostrata ---');
{
  ctx.store.profile = { squatMax: 280 };
  const html = vm.runInContext('percentMaxesCardHtml()', ctx);
  ok('3a. il pannello mostra i massimali in uso e da dove vengono', /pct-max-squat/.test(html) && /value="300"/.test(html) && /file: 290 previsto/.test(html) && /profilo: 280/.test(html));
  ok('3b. un programma senza % non mostra il pannello', (() => { const keep = ctx.DATA; ctx.DATA = { weeks: [{ sessions: [{ exercises: [{ name: 'Curl', sets: [{ target_load: 20 }] }] }] }] }; const out = vm.runInContext('percentMaxesCardHtml()', ctx); ctx.DATA = keep; return out === ''; })());
  const txt = (row) => { ctx.__row = row; return vm.runInContext('rowIntensityText(__row)', ctx); };
  ok('3c. intensita\': il RIR scritto, altrimenti l\'RPE, altrimenti la %, altrimenti niente', txt({ rirTarget: 2 }) === '2' && txt({ rpeTarget: 8 }) === '8' && txt({ sets: [set(75, 150)] }) === '75%' && txt({ sets: [{}] }) === '—');
  const lab = (row, scale) => { ctx.__row = row; ctx.__scale = scale; return vm.runInContext('rowIntensityLabel(__row, __scale)', ctx); };
  ok('3d. l\'etichetta dice cos\'e\' il valore: un RPE 8 non diventa "RIR: 8", una % e\' "%1RM"', lab({ rpeTarget: 8 }, 'RIR') === 'RPE' && lab({ rirTarget: 2 }, 'RPE') === 'RIR' && lab({ sets: [set(70, 150)] }, 'RIR') === '%1RM');
}

console.log('');
console.log('--- 4. nella pagina ---');
{
  ok('4a. la conferma dell\'import prepara il modello a %', /try \{ initPercentModelFromImport\(prog\); \} catch/.test(SRC));
  ok('4b. il pannello sta sopra l\'allenamento quando non c\'e\' quello SSTT', /let h = ssttCard \|\| percentMaxesCardHtml\(\);/.test(SRC));
  ok('4c. normalizeProgram tiene per ogni serie di quale massimale e\' la %', /percent_of: s\.percent_of && s\.percent_of\.lift \?/.test(SRC) && /percent_lift: exercise\.percent_lift \|\| undefined/.test(SRC));
  ok('4d. nessun RIR 1 di default quando la scheda non lo scrive', /exercise\.rir_target != null \? Number\(exercise\.rir_target\) : null\)\);/.test(SRC));
  ok('4e. nessun "2" o "1" mostrato come intensita\' inventata', !/row\.rirTarget \?\? row\.rpeTarget \?\? 2/.test(SRC) && !/bEx\.rirTarget \?\? 1/.test(SRC));
  const same = (v, o) => { ctx.__v = v; ctx.__o = o; return vm.runInContext('sameIntensityOption(__v, __o)', ctx); };
  ok('4f. un RIR non scritto seleziona "-", non "0" (in JS \'\' == 0)', same('', 0) === false && same(undefined, 0) === false && same('0', 0) === true && same(2, 2) === true);
  ok('4g. le select del RIR usano quel confronto', !/shownRir==i\?/.test(SRC) && !/store\.data\[k\+'_rir'\]==i\?/.test(SRC) && (SRC.match(/sameIntensityOption\(/g) || []).length >= 4);
  ok('4h. una serie in % mostra nel campo vuoto i kg a cui corrisponde', /placeholder="\$\{kgToDisp\(sugg \|\| pctPlanLoad \|\| ''\)\}"/.test(SRC));
}

console.log('');
if (failed) { console.log(failed + ' controlli del modello a % falliti.'); process.exit(1); }
console.log('Tutti i controlli del modello a % passano.');
