// Target nutrizionale e somme dei pasti: l'app propone, chi segue l'atleta decide.
//
// Qui le formule (web/nutrition-targets.js) con i numeri dell'accettazione,
// la precedenza fra prescritto e proposto, le somme per grammi dai valori per
// 100 g (con i valori CREA veri del catalogo), la somma parziale, il tono dello
// scostamento e la media del coach con i giorni vuoti contati a parte. Poi la
// pagina: con un prescritto il proposto non compare, ne' nella card ne' nella
// finestra del target.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8').replace(/\r\n/g, '\n');
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
  return SRC.slice(at, end + 2) + '\n';
}

const lib = { self: {} };
vm.createContext(lib);
vm.runInContext(fs.readFileSync(path.join(root, 'web/nutrition-targets.js'), 'utf8'), lib);
const N = lib.self.NurvanNutritionTargets;
const man = { sex: 'm', age: 30, height: 180, weight: 80, activity: 3, goal: 'maintain' };

console.log('\n--- 1. le formule ---');
{
  eq(N.mifflin(man), 1780, '1a. Mifflin-St Jeor, uomo 30 anni 180 cm 80 kg: 1.780 kcal');
  eq(N.mifflin(Object.assign({}, man, { sex: 'f' })), 1614, '1b. donna: -161 invece di +5');
  eq([1, 2, 3, 4, 5].map(N.activityFactor), [1.2, 1.375, 1.55, 1.725, 1.9], '1c. cinque gradini di attivita\'');
  const m = N.propose(man).target;
  ok('1d. mantenimento, attivita\' moderata: 2.750 kcal ±10 (' + m.kcal + ')', Math.abs(m.kcal - 2750) <= 10);
  eq([m.pro, m.fat], [145, 75], '1e. proteine 145 g (1,8 g/kg), grassi 75 g (25 % delle kcal)');
  eq(m.carb, 375, '1f. carboidrati il resto: (2.760 - 145×4 - 75×9) / 4 = 376 → 375');
  eq(m.fiber, 40, '1g. fibra di riferimento: 14 g ogni 1000 kcal → 40 g');
  const l = N.propose(Object.assign({}, man, { goal: 'loss', pace: 'moderate' })).target;
  ok('1h. perdita moderata: 2.200 kcal ±10 (' + l.kcal + ')', Math.abs(l.kcal - 2200) <= 10);
  eq(l.pro, 175, '1i. e proteine 175 g (2,2 g/kg in perdita)');
  eq([N.propose(Object.assign({}, man, { goal: 'loss', pace: 'slow' })).target.kcal, N.propose(Object.assign({}, man, { goal: 'gain', pace: 'slow' })).target.kcal, N.propose(Object.assign({}, man, { goal: 'gain', pace: 'moderate' })).target.kcal],
    [2480, 2900, 3030], '1j. perdita lenta -10 %, aumento lento +5 %, moderato +10 % (2.759 × 1,1 = 3.034,9 → 3.030)');
  ok('1k. arrotondamenti: kcal a 10, grammi a 5', [m, l].every((t) => t.kcal % 10 === 0 && [t.pro, t.carb, t.fat, t.fiber].every((g) => g % 5 === 0)));
  eq(N.propose({ sex: 'm', age: 30 }).missing, ['peso', 'altezza', 'attivita', 'obiettivo'], '1l. senza i dati, nessuna stima inventata: si dice cosa manca');
  eq(N.propose(Object.assign({}, man, { weight: 76 })).target.kcal !== m.kcal, true, '1m. il proposto cambia quando cambia il peso');
}

console.log('\n--- 2. chi decide ---');
{
  const proposed = N.propose(man);
  const pres = { kcal: 2400, pro: 180, carb: 240, fat: 70, by: 'Marco Rossi', note: 'Cena leggera.' };
  const t = N.resolve({ prescribed: pres, own: { kcal: 2000, pro: 150, carb: 200, fat: 60 }, plan: { kcal: 2100 }, proposed });
  eq([t.kcal, t.pro, t.carb, t.fat, t.source, t.by, t.note], [2400, 180, 240, 70, 'prescribed', 'Marco Rossi', 'Cena leggera.'], '2a. il prescritto vince su tutto, con nome e nota');
  ok('2b. e del proposto non esce nulla: niente fibra ne\' avvertenza', !('disclaimer' in t) && !('fiber' in t));
  eq(N.resolve({ prescribed: { kcal: 2400, pro: 180, carb: 240, fat: null, by: 'M' } }).fat, 80, '2c. grassi a saldo: (2400 - 180×4 - 240×4)/9 = 80');
  const variants = Object.assign({}, pres, { training: { kcal: 2700, pro: 180, carb: 300, fat: 70 }, rest: { kcal: 2100, pro: 180, carb: 170, fat: 70 } });
  eq([N.resolve({ prescribed: variants, dayType: 'training' }).kcal, N.resolve({ prescribed: variants, dayType: 'rest' }).kcal, N.resolve({ prescribed: variants }).kcal], [2700, 2100, 2400], '2d. allenamento, riposo, base');
  eq(N.resolve({ own: { kcal: 2000, pro: 150, carb: 200, fat: 60 }, proposed }).source, 'own', '2e. senza coach: il target dell\'atleta');
  eq(N.resolve({ proposed }).source, 'proposed', '2f. senza nulla: il proposto');
  ok('2g. che porta l\'avvertenza', /Stima indicativa/.test(N.resolve({ proposed }).disclaimer));
  eq(N.resolve({ prescribed: null, proposed }).source, 'proposed', '2h. tolta la prescrizione, torna il proposto');
}

console.log('\n--- 3. le somme, per grammi dai valori per 100 g ---');
{
  const { FOOD_CATALOG } = await import('./food-catalog.mjs');
  const pollo = FOOD_CATALOG.find((f) => f.name === 'Petto di pollo');
  const riso = FOOD_CATALOG.find((f) => f.name === 'Riso basmati');
  const asSaved = (f, g) => ({ name: f.name, quantity: g, unit: 'g', kcalPer100: f.kcal, proPer100: f.pro, carbPer100: f.carb, fatPer100: f.fat, kcal: 999 });
  const s = N.sumFoods([asSaved(pollo, 150), asSaved(riso, 80)], (f) => f.quantity);
  const expect = {
    kcal: pollo.kcal * 1.5 + riso.kcal * 0.8,
    pro: pollo.pro * 1.5 + riso.pro * 0.8,
    carb: pollo.carb * 1.5 + riso.carb * 0.8,
    fat: pollo.fat * 1.5 + riso.fat * 0.8
  };
  ok('3a. Petto di pollo 150 g + Riso basmati 80 g con i valori CREA: ' + [s.kcal, s.pro, s.carb, s.fat].map((v) => Math.round(v * 10) / 10).join(' / '),
    ['kcal', 'pro', 'carb', 'fat'].every((k) => Math.abs(s[k] - expect[k]) < 1e-9));
  eq([Math.round(s.kcal), Math.round(s.pro * 10) / 10], [444, 42.2], '3b. a mano: 100×1,5 + 367×0,8 = 443,6 kcal; 23,3×1,5 + 9×0,8 = 42,15 g di proteine');
  eq(s.partial, false, '3c. tutti con valori: somma intera');
  const legacy = N.sumFoods([{ name: 'Pasta importata', quantity: 1, unit: 'porzione', kcal: 350, pro: 12, carb: 70, fat: 2 }], () => 80);
  eq(legacy.kcal, 350, '3d. un alimento vecchio senza valori per 100 g conta con i suoi totali');
  const partial = N.sumFoods([asSaved(pollo, 150), { name: 'Torta della nonna', quantity: 100 }], (f) => f.quantity);
  eq([partial.partial, partial.missing, Math.round(partial.kcal)], [true, ['Torta della nonna'], 150], '3e. un alimento senza kcal: la somma e\' parziale, non zero, e si dice quale');
  const zero = N.sumFoods([{ name: 'Acqua', quantity: 500, kcalPer100: 0, proPer100: 0, carbPer100: 0, fatPer100: 0 }], (f) => f.quantity);
  eq([zero.kcal, zero.partial], [0, false], '3f. un alimento a 0 kcal e\' un valore, non un buco');
}

console.log('\n--- 4. lo scostamento, senza giudizio ---');
{
  const c = N.compare({ kcal: 2500, pro: 150, carb: 380, fat: 50 }, { kcal: 2400, pro: 150, carb: 240, fat: 70 });
  eq([c.kcal.diff, c.kcal.tone], [100, 'neutral'], '4a. +100 su 2.400 (4 %): neutro');
  eq([c.carb.tone, c.fat.tone], ['amber', 'amber'], '4b. oltre il 5 %, in piu\' o in meno: ambra');
  eq(c.pro.tone, 'neutral', '4c. esatto: neutro');
  eq(c.carb.fill, 1, '4d. la barra si ferma a pieno');
  ok('4e. nessun rosso nella pagina per lo scostamento', !/nutr-diff[^"]*"[^>]*#e53935|nutr-bar[^;]*#e53935/.test(grab('nutritionSummaryHtml')) && /#e0a030/.test(grab('nutritionSummaryHtml')) && /#9a9a9a/.test(grab('nutritionSummaryHtml')));
  ok('4f. e nessun messaggio: solo numeri, barra e colore', !/brav|attenzione|troppo|sgarr|sforato|ottimo/i.test(grab('nutritionSummaryHtml')));
}

console.log('\n--- 5. il coach: 7 giorni, i vuoti a parte ---');
{
  const today = '2026-09-25';
  const dates = N.lastDates(today, 7);
  eq(dates[0] + '…' + dates[6], '2026-09-19…2026-09-25', '5a. gli ultimi 7 giorni, oggi compreso');
  const days = dates.filter((d, i) => i !== 1 && i !== 4).map((d, i) => ({ date: d, total: { kcal: 2000 + i * 100, pro: 150, carb: 200, fat: 70 } }));
  const w = N.weekAverage({ days, today, target: { kcal: 2400, pro: 180, carb: 240, fat: 70 } });
  eq([w.logged, w.empty], [5, 2], '5b. diario in 5 giorni, 2 senza diario');
  eq(w.average.kcal, 2200, '5c. la media e\' sui 5 giorni con diario (2.000…2.400 → 2.200), non sui 7');
  eq(w.compare.kcal.diff, -200, '5d. e si confronta con il target');
  eq(N.weekAverage({ days: [], today }).average, null, '5e. nessun giorno: nessuna media, non zero');
  ok('5f. la card del coach scrive i giorni senza diario', /' senza diario/.test(grab('nutritionCoachWeekHtml')) && /' giorno' : ' giorni'/.test(grab('nutritionCoachWeekHtml')));
  ok('5g. e compare solo nella vista del coach sul cliente', /isCoachClientSandbox\(\)\) \? nutritionCoachWeekHtml\(days\)/.test(SRC));
}

console.log('\n--- 6. nella pagina: con un prescritto il proposto non compare ---');
{
  // A minimal DOM for the target window.
  let appended = null;
  const doc = {
    getElementById: () => null,
    createElement: () => ({ style: {}, set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; }, remove() {} }),
    body: { appendChild: (el) => { appended = el; } }
  };
  function page(opts) {
    const ctx = {
      document: doc,
      window: { NurvanNutritionTargets: N },
      esc: (s) => String(s),
      isoDateOnly: (d) => d.toISOString().slice(0, 10),
      foodQtyToGrams: (q) => q,
      store: Object.assign({ profile: { sex: 'm', age: 30, height: 180, weight: 80, nutritionActivity: 3, nutritionGoal: 'maintain' }, bodyChecks: [], logs: [] }, opts.store || {}),
      DATA: { nutrition: Object.assign({ days: [] }, opts.nutrition || {}) },
      isCoachClientSandbox: () => !!opts.coach
    };
    vm.createContext(ctx);
    vm.runInContext(['nutritionTargetsLib', 'nutritionSubjectProfile', 'latestCheckWeight', 'nutritionProfileInputs', 'nutritionProposed', 'nutritionPrescribed', 'nutritionPlanTarget',
      'nutritionOwnTarget', 'nutritionDayType', 'currentNutritionTarget', 'nutritionTargetSourceHtml', 'nutritionNumber', 'openEditNutritionTargetsModal'].map(grab).join('\n'), ctx);
    return ctx;
  }
  const withPres = page({ nutrition: { prescribed_target: { kcal: 2400, pro: 180, carb: 240, fat: 70, by: 'Marco Rossi', note: 'Cena leggera.' } } });
  const t = vm.runInContext('currentNutritionTarget(null)', withPres);
  eq([t.kcal, t.pro, t.carb, t.fat], [2400, 180, 240, 70], '6a. l\'atleta con un prescritto vede 2.400 / 180 / 240 / 70');
  const card = vm.runInContext('nutritionTargetSourceHtml(currentNutritionTarget(null))', withPres);
  ok('6b. nella card: «Prescritto da Marco Rossi» e la nota', /Prescritto da <b>Marco Rossi<\/b>/.test(card) && /Cena leggera\./.test(card));
  ok('6c. e niente proposto', !/Proposto|Stima indicativa|2760|2\.760/.test(card));
  vm.runInContext('openEditNutritionTargetsModal()', withPres);
  const modal = appended.innerHTML;
  ok('6d. nella finestra del target: i valori prescritti e chi li ha scritti', /2400 kcal/.test(modal) && /P 180 g · C 240 g · G 70 g/.test(modal) && /Marco Rossi/.test(modal));
  ok('6e. e il proposto non c\'e\' nemmeno li\'', !/Proposto|USA IL PROPOSTO|Stima indicativa|2\.760/.test(modal));
  const noPres = page({});
  vm.runInContext('openEditNutritionTargetsModal()', noPres);
  ok('6f. senza prescritto: il proposto, con l\'avvertenza e «usa il proposto»', /Proposto dall'app/.test(appended.innerHTML) && /Stima indicativa\. Se hai una condizione clinica/.test(appended.innerHTML) && /USA IL PROPOSTO/.test(appended.innerHTML));
  const own = page({ store: { profile: { sex: 'm', age: 30, height: 180, weight: 80, nutritionActivity: 3, nutritionGoal: 'maintain', nutritionTargetMode: 'own', nutritionTarget: { kcal: 2500, pro: 160, carb: 300, fat: 70 } } } });
  eq(vm.runInContext('nutritionTargetSourceHtml(currentNutritionTarget(null))', own).replace(/<[^>]+>/g, ''), 'Impostato da te', '6g. un target scritto dall\'atleta: «Impostato da te»');
  const coach = page({ coach: true, nutrition: { prescribed_target: { kcal: 2400, pro: 180, carb: 240, fat: null, by: 'Marco Rossi' } } });
  vm.runInContext('openEditNutritionTargetsModal()', coach);
  ok('6h. il coach prescrive: kcal e grammi, grassi a saldo, varianti allenamento/riposo, nota', /PRESCRIZIONE/.test(appended.innerHTML) && /placeholder="a saldo"/.test(appended.innerHTML) && /allenamento e di riposo/.test(appended.innerHTML) && /edit-nutr-note/.test(appended.innerHTML) && /RIMUOVI PRESCRIZIONE/.test(appended.innerHTML));
  const checked = page({ store: { bodyChecks: [{ at: '2026-09-01T08:00:00Z', weight: 82 }, { at: '2026-09-20T08:00:00Z', weight: 78.5 }] } });
  eq(vm.runInContext('nutritionProfileInputs().weight', checked), 78.5, '6i. il peso viene dall\'ultimo check fisico');
  ok('6j. il generatore di piani parte dal prescritto, non dal calcolo', /const base = nutritionGeneratorBase\(\);/.test(SRC) && /t\.source && Number\(t\.kcal\) > 0\) return \{ tdee: t\.kcal/.test(grab('nutritionGeneratorBase')));
  ok('6k. il profilo non perde il target dell\'atleta al salvataggio', /nutritionTarget: prev\.nutritionTarget \|\| null,/.test(grab('saveAthleteProfile')) && /nutritionActivity: \$\('profile-nutr-activity'\)/.test(grab('saveAthleteProfile')));
}

console.log('\n' + (failed ? failed + ' controlli falliti' : 'tutti i controlli passano'));
process.exit(failed ? 1 : 0);
