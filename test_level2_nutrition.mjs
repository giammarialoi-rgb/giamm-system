// Level 2 of the 25/09 audit, first block: nutrition, therapy, body checks.
//
// The functions are run where they can be (sums, units, therapy matching,
// the server merge and the coach filter); the rest is read in the code.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { mergeAccountDataBlobs } from './server/account/index.mjs';
import { sentBodyChecks } from './server/coach-os/workspace.mjs';

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
function grab(src, name) {
  const at = src.indexOf('function ' + name + '(');
  if (at < 0) return '';
  const end = src.indexOf(NL + '}', at);
  return src.slice(at, end + 2) + NL;
}

console.log('');
console.log('--- 1. foto del pasto ---');
{
  const draft = grab(SRC, 'mealPhotoFoodsFromDraft');
  ok('1a. salva pro/carb/fat (quelli che le somme leggono), non protein/carbs/fats', /pro: Number\.isFinite\(pro\)/.test(draft) && /fat: Number\.isFinite\(fat\)/.test(draft) && !/fats: Number\.isFinite/.test(draft));
  ok('1b. e i valori per 100 g, se in grammi o ml', /food\.kcalPer100 = Math\.round\(food\.kcal \/ q \* 1000\) \/ 10;/.test(draft));
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(read('web/nutrition-targets.js'), ctx);
  const N = ctx.NurvanNutritionTargets;
  const old = N.sumFoods([{ name: 'Pasta (foto, vecchio formato)', quantity: 300, unit: 'g', kcal: 450, protein: 15, carbs: 80, fats: 9 }], (f) => f.quantity);
  ok('1c. i pasti da foto gia\' salvati con "fats" ora contano i grassi', Math.round(old.fat) === 9 && Math.round(old.pro) === 15);
  vm.runInContext(grab(SRC, 'foodMacroVal'), ctx);
  ok('1d. anche foodMacroVal (PDF, riepiloghi) legge "fats"', ctx.foodMacroVal({ fats: 12 }, 'fat') === 12);

  const enrich = grab(SRC, 'enrichImportedFoods');
  const ectx = { console, normalizeNutritionMeals: (n) => n, FoodDatabaseService: { matchFood: () => ({ kcal: 18, pro: 0.9, carb: 3.5, fat: 0.2 }) }, gramsForFood: (f) => Number(f.quantity) || 100 };
  ectx.enrichFoodItemMacros = function (f) { f.kcal = 54; f.pro = 2.7; f.macro_source = 'food_catalog'; };
  vm.createContext(ectx);
  vm.runInContext(grab(SRC, 'foodMacroVal') + enrich, ectx);
  const n = { days: [{ meals: [{ foods: [
    { name: 'Pasta al pomodoro', quantity: 300, unit: 'g', kcal: 450, pro: 0, carb: 80, fat: 9, macro_source: 'meal_photo' },
    { name: 'Olio di oliva', quantity: 2, unit: 'cucchiai', kcal: 265, pro: 0, carb: 0, fat: 30 },
    { name: 'Pomodoro', quantity: 100, unit: 'g' }
  ] }] }] };
  vm.runInContext('enrichImportedFoods(N)', Object.assign(ectx, { N: n }));
  const [pasta, oil, tomato] = n.days[0].meals[0].foods;
  ok('1e. una stima da foto non viene riscritta da un nome simile ("pasta al pomodoro" resta 450 kcal)', pasta.kcal === 450 && pasta.macro_source === 'meal_photo');
  ok('1f. un alimento con le sue kcal (olio, 0 g di proteine, in cucchiai) resta com\'e\'', oil.kcal === 265);
  ok('1g. solo un alimento senza valori viene completato', tomato.kcal === 54);

  const fetchBlock = SRC.slice(SRC.indexOf("const imagesPayload = photos.map"), SRC.indexOf('function handleMealPhotoFile('));
  ok('1h. se l\'analisi fallisce: niente "Piatto stimato" inventato, un messaggio', !/name: 'Piatto stimato'/.test(fetchBlock) && !/showMealPhotoConfirm\(\{/.test(fetchBlock) && /Analisi della foto non riuscita/.test(fetchBlock) && /closeMealPhotoModal\(\);/.test(fetchBlock));
}

console.log('');
console.log('--- 2. modifica alimento e unita\' ---');
{
  const ctx = { console, guessPortionGrams: () => 50 };
  vm.createContext(ctx);
  vm.runInContext(grab(SRC, 'foodQtyToGrams') + grab(SRC, 'selectableFoodUnit'), ctx);
  ok('2a. kg e litri in grammi', ctx.foodQtyToGrams(0.2, 'kg') === 200 && ctx.foodQtyToGrams(1.5, 'l') === 1500);
  ok('2b. "pz" come pezzi', ctx.foodQtyToGrams(2, 'pz', 'uovo') === 100);
  const kg = ctx.selectableFoodUnit(0.2, 'kg');
  ok('2c. un alimento in kg si apre in grammi con la stessa quantita\' (0.2 kg -> 200 g, non 0.2 g)', kg.unit === 'g' && kg.qty === 200);
  ok('2d. pz -> pezzi, litro -> ml, cucchiaio -> cucchiai', ctx.selectableFoodUnit(2, 'pz').unit === 'pezzi' && ctx.selectableFoodUnit(1, 'l').unit === 'ml' && ctx.selectableFoodUnit(1, 'cucchiaio').unit === 'cucchiai');
  const save = grab(SRC, 'saveFoodItem');
  ok('2e. kcal o macro scritte sopra quelle del catalogo prevalgono (i valori per 100 g si ricavano da quelle)',
    /const typedOver = !!ref && \(/.test(save) && /const fromRef = !!ref && !typedOver;/.test(save) && /const kcalPer100 = fromRef && ref\.kcal != null \? ref\.kcal : Math\.round\(kcal \* ratio100 \* 10\) \/ 10;/.test(save));
  ok('2f. e l\'alimento non dichiara piu\' la fonte del catalogo', /provenance: foodProvenanceFor\(typedOver \? null : activeSelectedFoodRef\)/.test(save));
  const edit = grab(SRC, 'editFoodItem');
  ok('2g. in modifica i macro si leggono con tutti i nomi (vecchie foto)', /\$\('food-fat-input'\)\.value = foodMacroVal\(food, 'fat'\) \|\| 0;/.test(edit) && /selectableFoodUnit\(rawQty, food\.unit \|\| 'g'\)/.test(edit));
}

console.log('');
console.log('--- 3. pasto duplicato, conferma pasti, PDF ---');
{
  const dup = grab(SRC, 'finishDuplicateMeal');
  ok('3a. la copia di un pasto nasce senza id e updatedAt dell\'originale', /if \(f && typeof f === 'object'\) \{ delete f\.id; delete f\.updatedAt; \}/.test(dup));
  ok('3b. confermare i pasti del giorno non cancella i passi della stessa data',
    /store\.nutritionDaily\[key\] = Object\.assign\(\{\}, store\.nutritionDaily\[key\], \{ confirmed: true,/.test(SRC) && /store\.nutritionDaily\[key\] = Object\.assign\(\{\}, store\.nutritionDaily\[key\], \{ confirmed: false,/.test(SRC));
  const pdf = SRC.slice(SRC.indexOf('function nutritionDayMacros(nd) {'), SRC.indexOf('function nutritionDayMacros(nd) {') + 1600);
  ok('3c. il PDF somma come lo schermo e un giorno vuoto resta a 0 (non stampa il target come mangiato)', /nutritionDaySums\(/.test(pdf) && !/daily_calories_target/.test(pdf));
}

console.log('');
console.log('--- 4. terapia ---');
{
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(grab(SRC, 'sameTherapyMed') + grab(SRC, 'therapyMedIndexOf'), ctx);
  const meds = [{ id: 'm1', name: 'Blocco1-A' }, { id: 'm2', name: 'Blocco1-B' }, { id: 'm3', name: 'Blocco2-A' }];
  const reloadedRow = JSON.parse(JSON.stringify(meds[2]));
  ok('4a. la riga del blocco 2, dopo un ricaricamento, trova il suo farmaco (non il primo della lista)', ctx.therapyMedIndexOf(meds, reloadedRow) === 2);
  ok('4b. per contenuto, senza id', ctx.therapyMedIndexOf([{ name: 'A', dose: '1' }, { name: 'B', dose: '2' }], { name: 'B', dose: '2', updatedAt: 5 }) === 1);
  ok('4c. nessuna corrispondenza: -1, non una posizione a caso', ctx.therapyMedIndexOf(meds, { name: 'Altro' }) === -1);
  const view = SRC.slice(SRC.indexOf('(proto.medications || []).map((m, idx) => {'), SRC.indexOf('(proto.medications || []).map((m, idx) => {') + 2600);
  ok('4d. senza corrispondenza la riga non ha EDIT/✕', /const globalIdx = therapyData === DATA\.therapy \? therapyMedIndexOf\(medsRaw, m\) : -1;/.test(view) && /\$\{delIdx >= 0 \? `<div style="display:flex;gap:4px;">/.test(view));
  const del = grab(SRC, 'deleteTherapyItem');
  ok('4e. eliminare toglie il farmaco anche dal suo blocco, e senza terapia non si rompe', /p\.medications = p\.medications\.filter\(function \(x\) \{ return !sameTherapyMed\(x, med\); \}\);/.test(del) && /if \(!med\) return;/.test(del));
}

console.log('');
console.log('--- 5. check fisici ---');
{
  const now = '2026-09-25T10:00:00Z';
  const cloud = { bodyChecks: Array.from({ length: 20 }, (_, i) => ({ id: 'c' + i, at: '2026-01-' + String(i + 1).padStart(2, '0'), weight: 80 - i * 0.1 })) };
  const phone = { bodyChecks: cloud.bodyChecks.slice(0, 10).concat([{ id: 'new', at: '2026-09-20', weight: 75 }]), bodyChecksDeleted: { c3: now } };
  const merged = mergeAccountDataBlobs(cloud, phone);
  const ids = merged.bodyChecks.map((c) => c.id);
  ok('5a. un telefono con una lista vecchia non cancella i check che non ha', ids.includes('c15') && ids.includes('c19'));
  ok('5b. il check nuovo si aggiunge', ids.includes('new'));
  ok('5c. un check eliminato resta eliminato, e la cancellazione viaggia', !ids.includes('c3') && merged.bodyChecksDeleted.c3 === now);
  const again = mergeAccountDataBlobs(merged, { bodyChecks: [{ id: 'c3', at: '2026-01-04', weight: 79.7 }] });
  ok('5d. un altro dispositivo che ha ancora il check eliminato non lo riporta', !again.bodyChecks.some((c) => c.id === 'c3'));
  const many = mergeAccountDataBlobs({}, { bodyChecks: Array.from({ length: 450 }, (_, i) => ({ id: 'x' + i, at: String(i).padStart(4, '0') })) });
  ok('5e. si tengono 400 check, non 16', many.bodyChecks.length === 400);
  ok('5f. in locale: 400 (BODY_CHECKS_KEEP), cancellazioni registrate e applicate al download',
    /var BODY_CHECKS_KEEP = 400;/.test(SRC) && /store\.bodyChecksDeleted\[checkId\] = new Date\(\)\.toISOString\(\);/.test(SRC) && /store\.bodyChecks = store\.bodyChecks\.filter\(function \(c\) \{ return !\(c && c\.id && deletedChecks\[c\.id\]\); \}\);/.test(SRC) && /'bodyChecks', 'bodyChecksDeleted',/.test(SRC));
  ok('5g. il coach vede solo i check inviati', sentBodyChecks({ bodyChecks: [{ id: 'a', sentToCoach: true }, { id: 'b', sentToCoach: false }, { id: 'c' }] }).map((c) => c.id).join() === 'a');
  ok('5h. l\'upload dice quali sono stati inviati', /sentToCoach: !!\(c && \(c\.checkInSyncState === 'SYNCED' \|\| c\.serverCheckInId\)\)/.test(SRC));
  const practice = read('coach-practice.mjs');
  ok('5i. lo snapshot per il coach toglie i check non inviati', /data: coachVisibleAccountData\(/.test(practice) && /out\.bodyChecks = sentBodyChecks\(d\)/.test(fs.readFileSync('server/coach-os/workspace.mjs', 'utf8')));
  const intel = read('server/coach-os/intelligence.mjs');
  ok('5j. e anche l\'analisi per il coach', /weightTrend\(sentBodyChecks\(accountData\)\)/.test(intel) && /bodyChecks: sentBodyChecks\(accountData\)\.slice\(-40\)/.test(intel));
}

console.log('');
console.log('--- 6. USDA: kJ non letti come kcal ---');
{
  const food = read('server/food/index.mjs');
  const src = grab(food, 'fold') + grab(food, 'num') + grab(food, 'mapUsdaFood');
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const r = ctx.mapUsdaFood({ fdcId: 1, description: 'Oats', foodNutrients: [
    { nutrientId: 1008, nutrientName: 'Energy', unitName: 'KCAL', value: 389 },
    { nutrientId: 1062, nutrientName: 'Energy', unitName: 'kJ', value: 1628 },
    { nutrientId: 1003, nutrientName: 'Protein', value: 16.9 }
  ] });
  ok('6a. con kJ dopo kcal restano le kcal (389, non 1628)', r.kcalPer100 === 389);
}

console.log('');
if (failed) { console.log(failed + ' controlli del livello 2 (nutrizione) falliti.'); process.exit(1); }
console.log('Tutti i controlli del livello 2 (nutrizione, terapia, check) passano.');
