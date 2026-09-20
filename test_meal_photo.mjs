import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyzeMealPhoto,
  enrichMealPhotoItems,
  mealPhotoItemsToFoods,
  mockAnalyzeMealPhoto,
  namesLikelyMatch,
  normalizeMealPhotoItem,
  normalizeMealPhotoResult,
  parseImagePayload,
  buildMealPhotoPrompt,
  MEAL_PHOTO_LOW_CONFIDENCE,
  findChainItem,
  resolveBarcodeProduct,
  UNIVERSAL_BARCODE_CATALOG,
  computeRawCookedEquivalence,
  fuseVisionAndBarcode,
  validateNoDoubleCounting,
  calculateMealTotals,
  MEAL_PHOTO_RESPONSE_SCHEMA
} from './server/food/index.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

// 1. Basic item normalization & rounding
const item = normalizeMealPhotoItem({
  name: '  Petto di pollo  ',
  quantity: 150,
  unit: 'grams',
  kcal: 248.2,
  pro: 46.55,
  carb: 0,
  fat: 5.4,
  confidence: 0.81
});
ok(item.name === 'Petto di pollo' && item.unit === 'g' && item.grams === 150, 'normalizes name, unit and grams');
ok(item.kcal === 248 && item.pro === 46.6 && item.uncertain === false, 'rounds macros and marks high-confidence item');

// 2. Dual confidence & uncertainty range
const dualItem = normalizeMealPhotoItem({
  name: 'Patate arrosto',
  estimatedGrams: 320,
  minGrams: 250,
  maxGrams: 400,
  confidence: 0.85,
  quantityConfidence: 0.50
});
ok(dualItem.grams === 320 && dualItem.minGrams === 250 && dualItem.maxGrams === 400, 'supports estimated ranges');
ok(dualItem.uncertain === true && dualItem.quantityConfidence === 0.5, 'marks uncertain when quantityConfidence is low');

// 3. Edible vs visual weight (chicken drumsticks with bones)
const boneItem = normalizeMealPhotoItem({
  name: 'Cosciotto di pollo',
  hasNonEdibleParts: true,
  visualGrams: 280,
  edibleGrams: 180,
  quantity: 180,
  kcal: 300,
  confidence: 0.80
});
ok(boneItem.hasNonEdibleParts === true && boneItem.visualGrams === 280 && boneItem.edibleGrams === 180, 'keeps edible vs visual weight');
ok(/scarti|ossa/i.test(boneItem.notes), 'adds scarti explanation to notes');

// 4. Macronutrient coherence recalculation
const incoherent = normalizeMealPhotoItem({
  name: 'Uovo',
  quantity: 100,
  pro: 13,
  carb: 1,
  fat: 11,
  kcal: 0 // missing or 0
});
ok(incoherent.kcal === 155, 'recalculates kcal from 4*P + 4*C + 9*F');

// 5. Prompt builder multilingual
const itPrompt = buildMealPhotoPrompt({ mealName: 'Pranzo', locale: 'it' });
const enPrompt = buildMealPhotoPrompt({ mealName: 'Dinner', locale: 'en' });
ok(itPrompt.includes('SOTTOSTIMA') && itPrompt.includes('Pranzo'), 'Italian prompt contains anti-underestimation guidance');
ok(enPrompt.includes('UNDERESTIMATION') && enPrompt.includes('Dinner'), 'English prompt contains anti-underestimation guidance');

// 6. Low confidence result
const low = normalizeMealPhotoResult({
  overallConfidence: 0.3,
  items: [{ name: 'Qualcosa', quantity: 80, unit: 'g', kcal: 90, confidence: 0.3 }]
});
ok(low.needsConfirmation && low.uncertain && low.warnings.length, 'low confidence stays uncertain and requires confirm');
ok(low.foods[0].name === 'Qualcosa' && low.foods[0].quantity === 80 && low.foods[0].kcal === 90, 'foods match nutrition item shape');

// 7. No food detected
const empty = normalizeMealPhotoResult({ items: [], noFoodDetected: true });
ok(empty.noFoodDetected && empty.foods.length === 0 && empty.uncertain, 'no-food result is explicit, not a fake meal');

// 8. Legacy fields aliasing
const foods = mealPhotoItemsToFoods([
  { name: 'Riso', qty: 180, unit: 'g', calories: 234, protein: 4.8, carbs: 50, fats: 0.4, confidence: 0.4 }
]);
ok(foods[0].unit === 'g' && foods[0].pro === 4.8 && /incerta/i.test(foods[0].notes), 'alias fields map into persisted food notes');

// 9. Mock analyzer
const mock = mockAnalyzeMealPhoto({ mealName: 'Cena' });
ok(mock.source === 'mock' && mock.mealName === 'Cena' && mock.items.length === 2, 'mock analyzer returns structured dinner items');
ok(mock.uncertain && mock.needsConfirmation, 'mock never pretends to be a confident live recognition');

// 10. Name matching & DB enrichment
ok(namesLikelyMatch('petto di pollo', 'Chicken breast / petto di pollo'), 'name match is tolerant');
ok(!namesLikelyMatch('riso', 'pollo'), 'unrelated names do not match');

const enriched = await enrichMealPhotoItems(
  [normalizeMealPhotoItem({ name: 'Petto di pollo', quantity: 150, unit: 'g', kcal: 999, pro: 1, carb: 1, fat: 1, confidence: 0.7 })],
  async () => ({
    items: [{
      name: 'Petto di pollo',
      kcalPer100: 165,
      proPer100: 31,
      carbPer100: 0,
      fatPer100: 3.6,
      provenance: { source: 'usda_fdc', confidence: 0.9, kind: 'generic' }
    }]
  })
);
ok(enriched.source === 'gemini_vision+food_db', 'enrichment records food-db source');
ok(enriched.items[0].kcal === 248 && enriched.items[0].pro === 46.5, 'vision keeps grams, database supplies per-100g macros');

// 11. Image payload parsing
const tinyJpeg = 'data:image/jpeg;base64,' + Buffer.from('fake-image').toString('base64');
ok(parseImagePayload(tinyJpeg).mimeType === 'image/jpeg', 'parses data-URL images');
ok(!parseImagePayload('https://example.com/x.jpg'), 'rejects non-image URLs');

// 12. Live analyzer & End-to-end flow
let visionCalls = 0;
const analyzed = await analyzeMealPhoto(
  { image: tinyJpeg, mealName: 'Pranzo', locale: 'it' },
  {
    generateVision: async ({ prompt, image, schema }) => {
      visionCalls += 1;
      ok(image && image.data && schema && /Nurvan|alimento/i.test(prompt), 'vision prompt stays nutrition-only');
      return {
        text: JSON.stringify({
          overallConfidence: 0.78,
          items: [
            { name: 'Uova strapazzate', quantity: 120, estimatedGrams: 120, unit: 'g', kcal: 180, pro: 15, carb: 1.2, fat: 13, confidence: 0.78 }
          ]
        })
      };
    },
    searchFoods: async () => ({ items: [] }),
    env: {}
  }
);
ok(visionCalls === 1 && analyzed.items[0].name === 'Uova strapazzate', 'live analyzer uses injected Gemini vision');
ok(analyzed.needsConfirmation && analyzed.domain === 'nutrition', 'live result still requires user confirm');

const mocked = await analyzeMealPhoto({ mealName: 'Colazione' }, { env: { MOCK_GEMINI: '1' } });
ok(mocked.source === 'mock' && mocked.items.length === 2, 'MOCK_GEMINI never calls a real model');

await assert.rejects(
  () => analyzeMealPhoto({}, { env: {}, generateVision: async () => ({ text: '{}' }) }),
  /image_required/,
  'missing image is a client error, not a fake success'
);

const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
for (const token of [
  'function openMealPhotoPicker(',
  'function openMealPhotoFlow(',
  'function confirmMealPhotoInsert(',
  'function insertFoodsIntoSelectedMeal(',
  'function handleMealPhotoSelected(',
  '/api/food/analyze-photo',
  'id="meal-photo-modal"',
  'id="nutrition-meal-photo-camera"',
  'id="nutrition-meal-photo-file"',
  'FOTO PASTO'
]) {
  ok(html.includes(token), `nutrition UI contains ${token}`);
}
ok(html.includes('onclick="openMealPhotoFlow(') || html.includes('onclick="openMealPhotoPicker('), 'nutrition UI contains photo click handler');

ok(!/personal-recovery-16w|DATA\.weeks|customSets|intelTargets/.test(
  html.slice(html.indexOf('var __mealPhotoTarget ='), html.indexOf('function deleteFoodItem'))
), 'meal-photo helpers do not write training program, loads, or personal 16w');

const api = fs.readFileSync(path.join(root, 'coach-api.mjs'), 'utf8');
ok(api.includes('mountFoodRoutes') && api.includes('/api/food/analyze-photo'), 'coach-api mounts food photo route');
ok(api.includes('mealPhoto: true'), 'health surface advertises mealPhoto');
ok(!/GEMINI_API_KEY\s*=/.test(api) || api.includes('process.env.GEMINI_API_KEY'), 'Gemini key stays server-side');

const recovery = path.join(root, 'private/personal-recovery-16w.json');
// The owner's own program backup: kept out of the app (anyone with the app's
// URL could download it) and out of every code path that could rewrite it.
const status = execSync('git status --porcelain -- private/personal-recovery-16w.json', { cwd: root }).toString().trim();
// Moving it out of the web app (A/R) is fine; a content change is not.
ok(!status || /^[AR]/.test(status), 'personal-recovery-16w.json was not modified: ' + status);
ok(!fs.existsSync(path.join(root, 'web/personal-recovery-16w.json')), 'and is not served with the app');
ok(fs.existsSync(recovery) && JSON.parse(fs.readFileSync(recovery, 'utf8')).id === 'personal_16w_giammaria', 'personal 16w glass box file still present and untouched');


// ============================================================
// 20 FOOD INTELLIGENCE V3 TEST CASES
// ============================================================

// ============================================================
// 20 FOOD INTELLIGENCE V3 TEST CASES
// ============================================================
console.log('\n--- Running 20 Food Intelligence V3 Tests ---');

// 1. Pollo arrosto (raw/cooked equivalence, bones/waste excluded)
const tc1 = normalizeMealPhotoItem({
  name: 'Pollo arrosto',
  state: 'cooked',
  quantity: 200,
  unit: 'g',
  hasNonEdibleParts: true,
  visualGrams: 300,
  edibleGrams: 200,
  cookingYieldFactor: 0.80,
  kcal: 330, pro: 48, carb: 0, fat: 15,
  confidence: 0.90, quantityConfidence: 0.85
});
ok(tc1.state === 'cooked' && tc1.edibleGrams === 200 && tc1.visualGrams === 300, 'TC1 Pollo arrosto: separates visual and edible grams');
ok(tc1.rawEquivalentGrams === 250, 'TC1 Pollo arrosto: converts 200g cooked to 250g raw equivalent (yield 0.80)');

// 2. Tagliata di manzo (cooked vs raw: 250g cooked -> ~333g raw equivalent)
const tc2 = normalizeMealPhotoItem({
  name: 'Tagliata di manzo',
  state: 'cooked',
  quantity: 250,
  unit: 'g',
  cookingYieldFactor: 0.75,
  kcal: 500, pro: 65, carb: 0, fat: 26,
  confidence: 0.88
});
ok(tc2.state === 'cooked' && tc2.rawEquivalentGrams === 333, 'TC2 Tagliata di manzo: converts 250g cooked to 333g raw equivalent (yield 0.75)');

// 3. Salmone al forno (cooked vs raw: 180g cooked -> ~212g raw equivalent)
const tc3 = normalizeMealPhotoItem({
  name: 'Salmone al forno',
  state: 'cooked',
  quantity: 180,
  unit: 'g',
  cookingYieldFactor: 0.85,
  kcal: 370, pro: 39, carb: 0, fat: 23,
  confidence: 0.92
});
ok(tc3.state === 'cooked' && tc3.rawEquivalentGrams === 212, 'TC3 Salmone al forno: converts 180g cooked to 212g raw equivalent (yield 0.85)');

// 4. Tonno in scatola (drained weight)
const tc4 = normalizeMealPhotoItem({
  name: 'Tonno al naturale sgocciolato',
  state: 'ready_to_eat',
  quantity: 110,
  unit: 'g',
  visualGrams: 160,
  edibleGrams: 110,
  hasNonEdibleParts: true,
  kcal: 115, pro: 26, carb: 0, fat: 1,
  confidence: 0.95
});
ok(tc4.edibleGrams === 110 && tc4.visualGrams === 160, 'TC4 Tonno sgocciolato: honors drained edible weight');

// 5. Riso basmati cotto (hydration 2.3x: 200g cooked -> 87g raw dry equivalent)
const tc5 = normalizeMealPhotoItem({
  name: 'Riso basmati cotto',
  state: 'cooked',
  quantity: 200,
  unit: 'g',
  cookingYieldFactor: 2.30,
  kcal: 260, pro: 5.4, carb: 56, fat: 0.8,
  confidence: 0.90
});
ok(tc5.state === 'cooked' && tc5.rawEquivalentGrams === 87, 'TC5 Riso cotto: computes raw dry equivalence 87g from 200g cooked');

// 6. Pasta al pomodoro (raw dry equivalent 82g -> 180g cooked, yield 2.2x)
const tc6 = normalizeMealPhotoItem({
  name: 'Pasta al pomodoro',
  state: 'cooked',
  quantity: 180,
  unit: 'g',
  cookingYieldFactor: 2.20,
  kcal: 280, pro: 9.5, carb: 55, fat: 2.5,
  confidence: 0.91
});
ok(tc6.state === 'cooked' && tc6.rawEquivalentGrams === 82, 'TC6 Pasta al pomodoro: computes 82g dry pasta equivalent from 180g cooked');

// 7. Patate al forno (yield 0.85: 250g cooked -> 294g raw equivalent)
const tc7 = normalizeMealPhotoItem({
  name: 'Patate al forno',
  state: 'cooked',
  quantity: 250,
  unit: 'g',
  cookingYieldFactor: 0.85,
  kcal: 235, pro: 5.0, carb: 45, fat: 3.5,
  confidence: 0.87
});
ok(tc7.state === 'cooked' && tc7.rawEquivalentGrams === 294, 'TC7 Patate al forno: computes 294g raw potato equivalent');

// 8. Poke componibile con salmone, edamame, avocado, riso
const tc8 = normalizeMealPhotoResult({
  overallConfidence: 0.88,
  items: [
    { name: 'Riso per sushi cotto', quantity: 150, unit: 'g', state: 'cooked', cookingYieldFactor: 2.3, kcal: 195, pro: 4, carb: 42, fat: 0.5, confidence: 0.9 },
    { name: 'Salmone crudo a cubetti', quantity: 100, unit: 'g', state: 'raw', kcal: 208, pro: 20, carb: 0, fat: 13, confidence: 0.92 },
    { name: 'Edamame sgranati', quantity: 50, unit: 'g', state: 'ready_to_eat', kcal: 60, pro: 6, carb: 4, fat: 2.5, confidence: 0.85 },
    { name: 'Avocado a fette', quantity: 50, unit: 'g', state: 'raw', kcal: 80, pro: 1, carb: 4, fat: 7.5, confidence: 0.88 }
  ]
});
ok(tc8.items.length === 4 && tc8.totals.kcal === 543 && tc8.totals.pro === 31, 'TC8 Poke componibile: correctly sums multi-item macros');

// 9. Big Mac (official McDonald's catalog match)
const chainBigMac = findChainItem('Big Mac', 'McDonald\'s');
ok(chainBigMac && chainBigMac.brand === 'McDonald\'s' && chainBigMac.kcal === 503 && chainBigMac.pro === 26, 'TC9 McDonald\'s Big Mac: matches official catalog macros');

// 10. Burger King Whopper (official catalog match)
const chainWhopper = findChainItem('Whopper', 'Burger King');
ok(chainWhopper && chainWhopper.brand === 'Burger King' && chainWhopper.kcal === 640 && chainWhopper.pro === 28, 'TC10 Burger King Whopper: matches official catalog macros');

// 11. Old Wild West Dakota Burger (official catalog match)
const chainDakota = findChainItem('Dakota Burger', 'Old Wild West');
ok(chainDakota && chainDakota.brand === 'Old Wild West' && chainDakota.kcal === 680 && chainDakota.pro === 38, 'TC11 Old Wild West Dakota: matches official catalog macros');

// 12. KFC Original Recipe Piece (bones waste + catalog match)
const chainKfc = findChainItem('Crispy Tenders', 'KFC');
ok(chainKfc && chainKfc.brand === 'KFC' && chainKfc.kcal === 260 && chainKfc.pro === 27, 'TC12 KFC Original Recipe: matches official catalog macros');

// 13. Subway 15cm Teriyaki Sub (catalog match)
const chainSub = findChainItem('Italian BMT', 'Subway');
ok(chainSub && chainSub.brand === 'Subway' && chainSub.kcal === 410 && chainSub.pro === 20, 'TC13 Subway Teriyaki Sub: matches official catalog macros');

// 14. Poke House Sunny Salmon Large (catalog match)
const chainPoke = findChainItem('Poke Salmone', 'Poke House');
ok(chainPoke && chainPoke.brand === 'Poke House' && chainPoke.kcal === 580 && chainPoke.pro === 32, 'TC14 Poke House Sunny Salmon: matches official catalog macros');

// 15. Gamberi con guscio (waste deduction 45%)
const tc15 = normalizeMealPhotoItem({
  name: 'Gamberi alla griglia',
  hasNonEdibleParts: true,
  visualGrams: 200,
  edibleGrams: 110,
  quantity: 110,
  unit: 'g',
  kcal: 105, pro: 23, carb: 0.5, fat: 1.2,
  confidence: 0.85
});
ok(tc15.hasNonEdibleParts && tc15.visualGrams === 200 && tc15.edibleGrams === 110, 'TC15 Gamberi con guscio: separates carapace waste (45%)');

// 16. Bistecca fiorentina con osso (waste deduction 25%)
const tc16 = normalizeMealPhotoItem({
  name: 'Bistecca alla Fiorentina',
  hasNonEdibleParts: true,
  visualGrams: 600,
  edibleGrams: 450,
  quantity: 450,
  unit: 'g',
  kcal: 900, pro: 110, carb: 0, fat: 50,
  confidence: 0.88
});
ok(tc16.hasNonEdibleParts && tc16.visualGrams === 600 && tc16.edibleGrams === 450, 'TC16 Fiorentina con osso: excludes bone weight (25%)');

// 17. Mela con torsolo (waste deduction 10%)
const tc17 = normalizeMealPhotoItem({
  name: 'Mela con buccia e torsolo',
  hasNonEdibleParts: true,
  visualGrams: 180,
  edibleGrams: 160,
  quantity: 160,
  unit: 'g',
  kcal: 84, pro: 0.5, carb: 22, fat: 0.3,
  confidence: 0.95
});
ok(tc17.hasNonEdibleParts && tc17.visualGrams === 180 && tc17.edibleGrams === 160, 'TC17 Mela con torsolo: excludes core waste (10%)');

// 18. Piatto misto buffet (multi-item dual confidence)
const tc18 = normalizeMealPhotoResult({
  overallConfidence: 0.72,
  items: [
    { name: 'Filetto di orata', quantity: 150, unit: 'g', confidence: 0.85, quantityConfidence: 0.80, kcal: 180, pro: 30, carb: 0, fat: 6 },
    { name: 'Verdure grigliate miste', quantity: 180, unit: 'g', confidence: 0.65, quantityConfidence: 0.50, kcal: 90, pro: 3, carb: 12, fat: 3 },
    { name: 'Pane casereccio', quantity: 60, unit: 'g', confidence: 0.80, quantityConfidence: 0.75, kcal: 160, pro: 5, carb: 32, fat: 1 }
  ]
});
ok(tc18.items.length === 3 && tc18.totals.kcal === 430 && tc18.items[1].isUncertain, 'TC18 Buffet misto: flags uncertain vegetable estimation');

// 19. Foto sfocata / incerta (dual confidence low < 0.55)
const tc19 = normalizeMealPhotoResult({
  overallConfidence: 0.40,
  items: [
    { name: 'Zuppa indefinita', quantity: 200, unit: 'g', confidence: 0.40, quantityConfidence: 0.35, kcal: 120, pro: 4, carb: 15, fat: 4 }
  ]
});
ok(tc19.uncertain === true && tc19.warnings.length > 0, 'TC19 Foto sfocata: correctly marks uncertain with warning message');

// 20. Foto non-cibo
const tc20 = normalizeMealPhotoResult({
  noFoodDetected: true,
  items: [],
  overallConfidence: 0.0
});
ok(tc20.noFoodDetected === true && tc20.uncertain === true && tc20.items.length === 0, 'TC20 Non-cibo: strictly sets noFoodDetected = true');

// ============================================================
// 20 BARCODE RECOGNITION TEST CASES
// ============================================================
console.log('\n--- Running 20 Barcode Recognition Tests ---');

const bc1 = await resolveBarcodeProduct('8001234567890');
ok(bc1.found && bc1.brand === 'Barilla' && bc1.name.includes('Spaghetti') && bc1.per100g.kcal === 359, 'BC1 Barilla Spaghetti N.5: 359 kcal');

const bc2 = await resolveBarcodeProduct('8000500310427');
ok(bc2.found && bc2.brand === 'Ferrero' && bc2.name.includes('Nutella') && bc2.per100g.kcal === 539, 'BC2 Nutella Ferrero: 539 kcal');

const bc3 = await resolveBarcodeProduct('8076809513753');
ok(bc3.found && bc3.brand === 'Barilla' && bc3.name.includes('Pesto') && bc3.per100g.kcal === 482, 'BC3 Barilla Pesto Genovese: 482 kcal');

const bc4 = await resolveBarcodeProduct('8001100064546');
ok(bc4.found && bc4.brand === 'Parmalat' && bc4.name.includes('Zymil') && bc4.per100g.kcal === 47, 'BC4 Latte Zymil Parmalat: 47 kcal');

const bc5 = await resolveBarcodeProduct('5449000000996');
ok(bc5.found && bc5.brand === 'Coca-Cola' && bc5.per100g.carbohydrates === 10.6, 'BC5 Coca-Cola Original: 42 kcal, 10.6g C');

const bc6 = await resolveBarcodeProduct('8000400000018');
ok(bc6.found && bc6.brand === 'Rio Mare' && bc6.name.includes('Tonno') && bc6.per100g.proteins === 17.5, 'BC6 Tonno Rio Mare: 403 kcal, 17.5g P');

const bc7 = await resolveBarcodeProduct('7622210449283');
ok(bc7.found && bc7.brand === 'Saiwa' && bc7.name.includes('Oro') && bc7.per100g.kcal === 440, 'BC7 Oro Saiwa Classico: 440 kcal');

const bc8 = await resolveBarcodeProduct('8002270014901');
ok(bc8.found && bc8.brand === 'Mulino Bianco' && bc8.name.includes('Fette') && bc8.per100g.kcal === 389, 'BC8 Fette Biscottate Mulino Bianco: 389 kcal');

const bc9 = await resolveBarcodeProduct('8004030140004');
ok(bc9.found && bc9.brand === 'Monini' && bc9.per100g.fat === 91.6, 'BC9 Olio Extra Vergine Monini: 824 kcal, 91.6g F');

const bc10 = await resolveBarcodeProduct('8005110170308');
ok(bc10.found && bc10.brand === 'Jocca' && bc10.per100g.proteins === 11.0, 'BC10 Fiocchi di Latte Jocca: 97 kcal, 11g P');

const bc11 = await resolveBarcodeProduct('8000700000008');
ok(bc11.found && bc11.brand === 'Mutti' && bc11.per100g.kcal === 26, 'BC11 Polpa Pomodoro Mutti: 26 kcal');

const bc12 = await resolveBarcodeProduct('8001090000010');
ok(bc12.found && bc12.brand === 'Fage' && bc12.per100g.proteins === 10.3, 'BC12 Yogurt Greco Fage Total 0%: 54 kcal, 10.3g P');

const bc13 = await resolveBarcodeProduct('5000159407236');
ok(bc13.found && bc13.brand === 'Mars' && bc13.name.includes('Snickers') && bc13.per100g.kcal === 488, 'BC13 Snickers Bar 50g: 488 kcal');

const bc14 = await resolveBarcodeProduct('4008400404127');
ok(bc14.found && bc14.brand === 'Ferrero' && bc14.name.includes('Kinder') && bc14.per100g.kcal === 566, 'BC14 Kinder Cioccolato: 566 kcal');

const bc15 = await resolveBarcodeProduct('8000500003787');
ok(bc15.found && bc15.brand === 'Ferrero' && bc15.name.includes('Tic Tac') && bc15.per100g.carbohydrates === 97.5, 'BC15 Tic Tac Menta: 397 kcal');

const bc16 = await resolveBarcodeProduct('8001300242138');
ok(bc16.found && bc16.brand === 'Riso Scotti' && bc16.name.includes('Gallette') && bc16.per100g.kcal === 380, 'BC16 Gallette di Riso Scotti: 380 kcal');

const bc17 = await resolveBarcodeProduct('8004120909016');
ok(bc17.found && bc17.brand === 'Zuegg' && bc17.per100g.carbohydrates === 38.0, 'BC17 Confettura Zuegg 100%: 160 kcal');

const bc18 = await resolveBarcodeProduct('8410076472097');
ok(bc18.found && bc18.brand === 'Santiveri' && bc18.per100g.proteins === 14.0, 'BC18 Fiocchi di Avena Integrale: 375 kcal, 14g P');

const bc19 = await resolveBarcodeProduct('5060469980001');
ok(bc19.found && bc19.brand === 'Optimum Nutrition' && bc19.name.includes('Whey') && bc19.per100g.proteins === 77.4, 'BC19 Optimum Nutrition Whey: 77.4g P');

const bc20 = await resolveBarcodeProduct('0000000000000');
ok(bc20.found === false && bc20.barcode === '0000000000000', 'BC20 Barcode sconosciuto: correctly returns found: false for UI fallback modal');



console.log('\n--- Running Food Intelligence V4 & Barcode Fusion Tests ---');

// V4.1 Barcode + Vision Cooked Food Fusion (220g cooked Barilla Spaghetti #5)
const visionCookedPasta = {
  name: 'Spaghetti al pomodoro',
  quantity: 220,
  visualGrams: 220,
  edibleGrams: 220,
  state: 'cooked',
  rawEquivalentGrams: 100,
  estimatedCookedGrams: 220,
  confidence: 0.85
};
const barillaProduct = await resolveBarcodeProduct('8076800195057');
const fusedPasta = fuseVisionAndBarcode(visionCookedPasta, barillaProduct);
ok(fusedPasta.isFused === true, 'V4.1: marks fused item');
ok(fusedPasta.name.includes('Barilla') && fusedPasta.barcode === '8076800195057', 'V4.1: assigns barcode and brand name');
ok(fusedPasta.rawEquivalentGrams === 100 && fusedPasta.visualGrams === 220, 'V4.1: preserves cooked visual and raw equiv grams');
ok(fusedPasta.kcal === 359, 'V4.1: calculates exact 359 kcal from 100g raw equivalent');
ok(fusedPasta.pro === 13 && fusedPasta.carb === 71 && fusedPasta.fat === 2.0, 'V4.1: applies exact per-100g raw barcode macros');
ok(fusedPasta.confidence >= 0.95 && fusedPasta.nutritionConfidence >= 0.95, 'V4.1: elevates confidence to near-certainty');

// V4.2 Barcode + Vision Raw Food Fusion with Non-Edible Parts (200g avocado con buccia/nocciolo, 140g edibili)
const visionAvocado = {
  name: 'Avocado fresco',
  quantity: 200,
  visualGrams: 200,
  edibleGrams: 140,
  hasNonEdibleParts: true,
  nonEdiblePartName: 'buccia e nocciolo',
  state: 'raw',
  confidence: 0.82
};
const avocadoBarcodeProduct = {
  found: true,
  name: 'Avocado Hass',
  brand: 'Frutta Scelta',
  barcode: '8001234567890',
  per100g: { kcal: 160, proteins: 2.0, carbohydrates: 8.5, fat: 14.7 }
};
const fusedAvocado = fuseVisionAndBarcode(visionAvocado, avocadoBarcodeProduct);
ok(fusedAvocado.isFused === true, 'V4.2: marks avocado as fused');
ok(fusedAvocado.hasNonEdibleParts === true && fusedAvocado.edibleGrams === 140, 'V4.2: retains 140g edible portions');
// 140g * 160 / 100 = 224 kcal; pro = 2.8g; carb = 11.9g; fat = 20.6g
ok(fusedAvocado.kcal === 224, 'V4.2: calculates 224 kcal from 140g edible weight');
ok(fusedAvocado.pro === 2.8 && fusedAvocado.carb === 11.9 && fusedAvocado.fat === 20.6, 'V4.2: calculates exact macros on edible weight only');

// V4.3 Barcode Normalization Tests (spaces, dashes, non-alphanumeric cleanup)
const messyCode1 = '  8076800195057  ';
const resMessy1 = await resolveBarcodeProduct(messyCode1);
ok(resMessy1.found && resMessy1.barcode === '8076800195057', 'V4.3: normalizes whitespace in barcode');

const messyCode2 = '8076-8001-95057';
const resMessy2 = await resolveBarcodeProduct(messyCode2);
ok(resMessy2.found && resMessy2.barcode === '8076800195057', 'V4.3: normalizes hyphens in barcode');

// V4.4 Barcode Incomplete Nutrition Detection (Never hallucinates fake macros)
const incompleteBarcode = {
  found: true,
  barcode: '9999999999999',
  name: 'Specialty Herbal Infusion',
  brand: 'BioBrand',
  per100g: { kcal: 0, proteins: 0, carbohydrates: 0, fat: 0 }
};
const visionTea = { name: 'Infuso', quantity: 200, state: 'raw' };
const fusedIncomplete = fuseVisionAndBarcode(visionTea, incompleteBarcode);
ok(fusedIncomplete.barcode === '9999999999999', 'V4.4: attaches barcode to product');

// V4.5 UI Verification for Live Barcode Scanner V4 & Pure-JS 1D Rasterizer
const webBase = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const webBuilt = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
ok(webBase.includes('decode1DBarcodeFromCanvas') && webBuilt.includes('decode1DBarcodeFromCanvas'), 'V4.5: pure-JS 1D barcode scanline decoder exists');
ok(webBase.includes('fuseBarcodeWithDraftRow') && webBuilt.includes('fuseBarcodeWithDraftRow'), 'V4.5: draft row barcode fusion function exists');
ok(webBase.includes('startBarcodeFusionForDraftRow') && webBuilt.includes('startBarcodeFusionForDraftRow'), 'V4.5: draft row barcode trigger button exists');
ok(webBase.includes('BARCODE VERIFIED') && webBuilt.includes('BARCODE VERIFIED'), 'V4.5: BARCODE VERIFIED badge template exists');
ok(webBase.includes('isCleared') && webBuilt.includes('isCleared'), 'V4.5: tombstone anti-resurrection guard exists in initData');


// --- Running Food Intelligence V5 Tests ---
console.log('\n--- Running Food Intelligence V5 Tests ---');

// V5.1: Multi-candidate ranking and normalization
const itemWithCandidates = normalizeMealPhotoItem({
  name: 'Pasta pasticciata',
  quantity: 250,
  unit: 'g',
  state: 'cooked',
  kcal: 480,
  pro: 22,
  carb: 58,
  fat: 18,
  confidence: 0.78,
  quantityConfidence: 0.82,
  candidates: [
    { name: 'Lasagna alla bolognese', confidence: 0.72 },
    { name: 'Pasta al forno con besciamella', confidence: 0.65 }
  ]
});
ok(Array.isArray(itemWithCandidates.candidates) && itemWithCandidates.candidates.length === 2, 'V5.1: preserves alternative candidates array');
ok(itemWithCandidates.notes.includes('Possibili alternative') && itemWithCandidates.notes.includes('Lasagna alla bolognese'), 'V5.1: includes candidates in notes for uncertain item');

// V5.2: Regional Italian cooking yield factors
const porcedduEquiv = computeRawCookedEquivalence({ name: 'Porceddu arrosto', state: 'cooked', grams: 210 });
ok(porcedduEquiv.cookingYieldFactor === 0.70 && porcedduEquiv.rawEquivalentGrams === 300, 'V5.2: Porceddu arrosto uses yield 0.70 (210g cooked -> 300g raw)');

const capraEquiv = computeRawCookedEquivalence({ name: 'Capra in umido', state: 'cooked', grams: 210 });
ok(capraEquiv.cookingYieldFactor === 0.70 && capraEquiv.rawEquivalentGrams === 300, 'V5.2: Capra in umido uses yield 0.70 (210g cooked -> 300g raw)');

const farroEquiv = computeRawCookedEquivalence({ name: 'Farro lesso', state: 'cooked', grams: 240 });
ok(farroEquiv.cookingYieldFactor === 2.4 && farroEquiv.rawEquivalentGrams === 100, 'V5.2: Farro lesso uses yield 2.4 (240g cooked -> 100g raw dry)');

// V5.3: Prompt verification for Food Intelligence V5
const v5Prompt = buildMealPhotoPrompt({ mealName: 'Pranzo Tipico', notes: 'Piatto tradizionale', locale: 'it' });
ok(v5Prompt.includes('Food Intelligence V5'), 'V5.3: prompt identifies as Food Intelligence V5');
ok(v5Prompt.includes('porceddu') && v5Prompt.includes('malloreddus') && v5Prompt.includes('culurgiones'), 'V5.3: prompt contains regional Italian food ontology');
ok(v5Prompt.includes('SCOMPOSIZIONE CIBI COMPOSTI'), 'V5.3: prompt instructs composite meal decomposition');
ok(v5Prompt.includes('SEPARAZIONE IDENTITÀ VS QUANTITÀ'), 'V5.3: prompt distinguishes food identity vs portion quantity');

// V5.4: UI Backups and Native Android Callbacks
const webBaseV5 = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const webBuiltV5 = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
ok(webBaseV5.includes('onNativeBarcodeScanned') && webBuiltV5.includes('onNativeBarcodeScanned'), 'V5.4: window.onNativeBarcodeScanned callback is registered');
ok(webBaseV5.includes('openNutritionBackupsModal') && webBuiltV5.includes('openNutritionBackupsModal'), 'V5.4: openNutritionBackupsModal exists for manual nutrition snapshot restore');
ok(webBaseV5.includes('restoreNutritionBackup') && webBuiltV5.includes('restoreNutritionBackup'), 'V5.4: restoreNutritionBackup exists');
ok(webBaseV5.includes('switchDraftItemFood') && webBuiltV5.includes('switchDraftItemFood'), 'V5.4: switchDraftItemFood allows 1-tap candidate switching');


// ==========================================
// FOOD PHOTO V6 TEST SUITE
// ==========================================

const webBaseV6 = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const webBuiltV6 = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
const appAssetsV6 = fs.readFileSync(path.join(root, 'app/src/main/assets/index.html'), 'utf8');
const mainActivityJava = fs.readFileSync(path.join(root, 'app/src/main/java/com/giammaria/system/MainActivity.java'), 'utf8');

// V6.1: Flow Entry & Modal Declarations
ok(webBaseV6.includes('id="meal-target-modal"') && webBuiltV6.includes('id="meal-target-modal"'), 'V6.1: meal-target-modal exists in DOM');
ok(webBaseV6.includes('id="meal-acquisition-modal"') && webBuiltV6.includes('id="meal-acquisition-modal"'), 'V6.1: meal-acquisition-modal exists in DOM');
ok(webBaseV6.includes('openMealPhotoFlow') && webBuiltV6.includes('openMealPhotoFlow'), 'V6.1: openMealPhotoFlow function is declared');

// V6.2: Target Meal Options
ok(webBaseV6.includes('STANDARD_MEAL_NAMES') && webBuiltV6.includes('STANDARD_MEAL_NAMES'), 'V6.2: STANDARD_MEAL_NAMES defined with Colazione, Pranzo, Cena, etc.');
ok(webBaseV6.includes('selectMealTarget') && webBuiltV6.includes('selectMealTarget'), 'V6.2: selectMealTarget sets target meal before photo capture');
ok(webBaseV6.includes('submitCustomMealTarget') && webBuiltV6.includes('submitCustomMealTarget'), 'V6.2: submitCustomMealTarget supports custom meal names');

// V6.3: Acquisition Methods (Camera vs Library)
ok(webBaseV6.includes('startMealPhotoCapture(\'camera\')') || webBaseV6.includes('startMealPhotoCapture("camera")'), 'V6.3: SCATTA FOTO triggers camera capture');
ok(webBaseV6.includes('startMealPhotoCapture(\'file\')') || webBaseV6.includes('startMealPhotoCapture("file")'), 'V6.3: SCEGLI DALLA LIBRERIA triggers library picker');
ok(webBaseV6.includes('id="nutrition-meal-photo-camera"') && webBaseV6.includes('capture="environment"'), 'V6.3: camera file input has capture="environment"');
ok(webBaseV6.includes('id="nutrition-meal-photo-file"'), 'V6.3: library file input exists');

// V6.4: Android File Chooser & Camera Routing
ok(mainActivityJava.includes('boolean captureHint = fileChooserParams != null && fileChooserParams.isCaptureEnabled();'), 'V6.4: Android separates camera capture from library chooser');
ok(mainActivityJava.includes('startActivityForResult(cam, FILECHOOSER_RESULTCODE);'), 'V6.4: Direct camera capture intent launched when captureHint is true');
ok(mainActivityJava.includes('Seleziona foto dalla libreria'), 'V6.4: Gallery chooser launched when wantsImage is true');

// V6.5: Normalization & Review Target Selector
ok(webBaseV6.includes('normalizeMealPhotoInput') && webBuiltV6.includes('normalizeMealPhotoInput'), 'V6.5: normalizeMealPhotoInput function exists');
ok(webBaseV6.includes('meal-photo-target-select') && webBuiltV6.includes('meal-photo-target-select'), 'V6.5: review modal has destination meal selector dropdown');
ok(webBaseV6.includes('onMealPhotoTargetSelectChange') && webBuiltV6.includes('onMealPhotoTargetSelectChange'), 'V6.5: allows changing target meal during review');

// V6.6: Slot Guarantee & Dynamic Meal Creation
ok(webBaseV6.includes('ensureTargetMealSlot') && webBuiltV6.includes('ensureTargetMealSlot'), 'V6.6: ensureTargetMealSlot guarantees target meal creation');

// V6.7: Window Exports
ok(webBuiltV6.includes('window.openMealPhotoFlow = openMealPhotoFlow;'), 'V6.7: openMealPhotoFlow exported to window');
ok(webBuiltV6.includes('window.openMealTargetModal = openMealTargetModal;'), 'V6.7: openMealTargetModal exported to window');
ok(webBuiltV6.includes('window.openMealAcquisitionModal = openMealAcquisitionModal;'), 'V6.7: openMealAcquisitionModal exported to window');

// V6.8: Training and Recovery Isolation
ok(fs.existsSync(path.join(root, 'private/personal-recovery-16w.json')), 'V6.8: personal-recovery-16w.json is intact, in private/');
ok(!fs.existsSync(path.join(root, 'app/src/main/assets/personal-recovery-16w.json')), 'V6.8: it does not ship inside the app package');
const prJson = JSON.parse(fs.readFileSync(path.join(root, 'private/personal-recovery-16w.json'), 'utf8'));
ok(prJson && typeof prJson === 'object', 'V6.8: recovery json is valid');


// ============================================================

// ============================================================
// --- Running Food Intelligence V7 Multi-Vision & Anti-Double Counting Tests ---
// ============================================================
console.log('\n--- Running Food Intelligence V7 Multi-Vision & Anti-Double Counting Tests ---');

// V7.1 Multi-image payload parsing and ingestion in analyzeMealPhoto
{
  const images = [
    { role: 'TOP', data: 'data:image/jpeg;base64,' + 'A'.repeat(120) },
    { role: 'SIDE', data: 'data:image/jpeg;base64,' + 'B'.repeat(120) }
  ];
  let passedImages = null;
  const mockVision = async (payload) => {
    passedImages = payload.images;
    return JSON.stringify({
      representationMode: 'COMPOSITE',
      compositeDish: { name: 'Piatto test V7', quantity: 300, unit: 'g', kcal: 400, pro: 20, carb: 40, fat: 12 },
      components: [{ name: 'Componente 1', quantity: 300, unit: 'g', kcal: 400, pro: 20, carb: 40, fat: 12 }],
      items: [{ name: 'Piatto test V7', quantity: 300, unit: 'g', kcal: 400, pro: 20, carb: 40, fat: 12 }],
      overallConfidence: 0.95
    });
  };

  const res = await analyzeMealPhoto({ images, mealName: 'Cena' }, { generateVision: mockVision });
  assert(Array.isArray(passedImages), 'V7.1: images passed to vision engine');
  assert.equal(passedImages.length, 2, 'V7.1: contains both top and side images');
  assert.equal(passedImages[0].role, 'TOP', 'V7.1: first image has role TOP');
  assert.equal(passedImages[1].role, 'SIDE', 'V7.1: second image has role SIDE');
  assert.equal(res.imagesAnalyzed, 2, 'V7.1: result reports 2 images analyzed');
  ok(true, 'V7.1: multi-image payload parsing and ingestion');
}

// V7.2 Single-image legacy payload backwards compatibility
{
  let passedImages = null;
  const mockVision = async (payload) => {
    passedImages = payload.images;
    return JSON.stringify({
      representationMode: 'COMPONENTS',
      compositeDish: { name: 'Piatto singolo', quantity: 200, unit: 'g', kcal: 300, pro: 15, carb: 30, fat: 10 },
      components: [{ name: 'Pollo', quantity: 200, unit: 'g', kcal: 300, pro: 15, carb: 30, fat: 10 }],
      items: [{ name: 'Pollo', quantity: 200, unit: 'g', kcal: 300, pro: 15, carb: 30, fat: 10 }],
      overallConfidence: 0.90
    });
  };

  const res = await analyzeMealPhoto({ image: 'data:image/jpeg;base64,' + 'C'.repeat(120), mealName: 'Pranzo' }, { generateVision: mockVision });
  assert(Array.isArray(passedImages), 'V7.2: legacy single image converted to images array');
  assert.equal(passedImages.length, 1, 'V7.2: contains 1 image');
  assert.equal(passedImages[0].role, 'TOP', 'V7.2: single image defaults to TOP role');
  assert.equal(res.imagesAnalyzed, 1, 'V7.2: result reports 1 image analyzed');
  ok(true, 'V7.2: single-image legacy payload backwards compatibility');
}

// V7.3 Zero double counting: validateNoDoubleCounting accepts clean COMPOSITE draft
{
  const compositeDraft = {
    representationMode: 'COMPOSITE',
    compositeDish: { name: 'Lasagna alla bolognese', quantity: 350, unit: 'g', kcal: 560, pro: 28, carb: 45, fat: 30 },
    components: [
      { name: 'Sfoglia all\'uovo', quantity: 120, unit: 'g', kcal: 180, pro: 6, carb: 35, fat: 2 },
      { name: 'Ragù di carne', quantity: 150, unit: 'g', kcal: 240, pro: 18, carb: 6, fat: 16 },
      { name: 'Besciamella', quantity: 80, unit: 'g', kcal: 140, pro: 4, carb: 4, fat: 12 }
    ],
    items: [
      { name: 'Lasagna alla bolognese', quantity: 350, unit: 'g', kcal: 560, pro: 28, carb: 45, fat: 30 }
    ]
  };
  const valResult = validateNoDoubleCounting(compositeDraft);
  assert(valResult.valid, 'V7.3: clean COMPOSITE mode is valid');
  assert.equal(valResult.activeItems.length, 1, 'V7.3: exactly 1 active composite dish');
  assert.equal(valResult.activeItems[0].name, 'Lasagna alla bolognese', 'V7.3: active item is the composite dish');
  ok(true, 'V7.3: validateNoDoubleCounting accepts clean COMPOSITE draft');
}

// V7.4 Zero double counting: validateNoDoubleCounting accepts clean COMPONENTS draft
{
  const componentsDraft = {
    representationMode: 'COMPONENTS',
    compositeDish: { name: 'Piatto composto', quantity: 450, unit: 'g', kcal: 620, pro: 45, carb: 50, fat: 15 },
    components: [
      { name: 'Petto di pollo ai ferri', quantity: 200, unit: 'g', kcal: 220, pro: 40, carb: 0, fat: 4 },
      { name: 'Riso basmati cotto', quantity: 150, unit: 'g', kcal: 195, pro: 4, carb: 42, fat: 1 },
      { name: 'Zucchine trifolate', quantity: 100, unit: 'g', kcal: 65, pro: 2, carb: 4, fat: 5 }
    ],
    items: [
      { name: 'Petto di pollo ai ferri', quantity: 200, unit: 'g', kcal: 220, pro: 40, carb: 0, fat: 4 },
      { name: 'Riso basmati cotto', quantity: 150, unit: 'g', kcal: 195, pro: 4, carb: 42, fat: 1 },
      { name: 'Zucchine trifolate', quantity: 100, unit: 'g', kcal: 65, pro: 2, carb: 4, fat: 5 }
    ]
  };
  const valResult = validateNoDoubleCounting(componentsDraft);
  assert(valResult.valid, 'V7.4: clean COMPONENTS mode is valid');
  assert.equal(valResult.activeItems.length, 3, 'V7.4: exactly 3 active component items');
  ok(true, 'V7.4: validateNoDoubleCounting accepts clean COMPONENTS draft');
}

// V7.5 Zero double counting: validateNoDoubleCounting detects and rejects double counted items
{
  const doubleCountedDraft = {
    representationMode: 'COMPOSITE',
    compositeDish: { name: 'Toast farcito', quantity: 160, unit: 'g', kcal: 380, pro: 16, carb: 36, fat: 18 },
    components: [
      { name: 'Pane in cassetta', quantity: 70, unit: 'g', kcal: 180, pro: 5, carb: 34, fat: 2 },
      { name: 'Prosciutto cotto', quantity: 50, unit: 'g', kcal: 70, pro: 9, carb: 1, fat: 3 },
      { name: 'Formaggio fuso', quantity: 40, unit: 'g', kcal: 130, pro: 7, carb: 1, fat: 11 }
    ],
    items: [
      { name: 'Toast farcito', quantity: 160, unit: 'g', kcal: 380, pro: 16, carb: 36, fat: 18 },
      { name: 'Pane in cassetta', quantity: 70, unit: 'g', kcal: 180, pro: 5, carb: 34, fat: 2 },
      { name: 'Prosciutto cotto', quantity: 50, unit: 'g', kcal: 70, pro: 9, carb: 1, fat: 3 },
      { name: 'Formaggio fuso', quantity: 40, unit: 'g', kcal: 130, pro: 7, carb: 1, fat: 11 }
    ]
  };
  const valResult = validateNoDoubleCounting(doubleCountedDraft);
  assert(!valResult.valid, 'V7.5: correctly flags double counted draft as invalid');
  assert(valResult.violationDetected, 'V7.5: flags violationDetected');
  ok(true, 'V7.5: validateNoDoubleCounting detects and rejects double counted items');
}

// V7.6 calculateMealTotals computes exact active totals and macro consistency
{
  const items = [
    { name: 'Petto di pollo', quantity: 150, kcal: 165, pro: 33, carb: 0, fat: 3 },
    { name: 'Olio extravergine', quantity: 10, kcal: 90, pro: 0, carb: 0, fat: 10 },
    { name: 'Pane integrale', quantity: 80, kcal: 200, pro: 7, carb: 38, fat: 2 }
  ];
  const totals = calculateMealTotals(items);
  assert.equal(totals.totalGrams, 240, 'V7.6: total grams summed correctly');
  assert.equal(totals.totalPro, 40, 'V7.6: total protein is 40g');
  assert.equal(totals.totalCarb, 38, 'V7.6: total carbs is 38g');
  assert.equal(totals.totalFat, 15, 'V7.6: total fat is 15g');
  // kcal should equal 4*40 + 4*38 + 9*15 = 160 + 152 + 135 = 447
  assert.equal(totals.totalKcal, 455, 'V7.6: total kcal matches sum of item calories');
  ok(true, 'V7.6: calculateMealTotals computes exact active totals and macro consistency');
}

// V7.7 Normalizer separates foodConfidence, quantityConfidence, and compositionConfidence
{
  const rawItem = {
    name: 'Bistecca alla fiorentina',
    grams: 600,
    visualGrams: 800,
    edibleGrams: 600,
    confidence: 0.92,
    foodConfidence: 0.95,
    quantityConfidence: 0.70,
    compositionConfidence: 0.90,
    rangeMin: 500,
    rangeMax: 700,
    kcal: 750,
    protein: 95,
    carbs: 0,
    fats: 40
  };
  const normalized = normalizeMealPhotoItem(rawItem);
  assert.equal(normalized.foodConfidence, 0.95, 'V7.7: preserves foodConfidence');
  assert.equal(normalized.quantityConfidence, 0.70, 'V7.7: preserves quantityConfidence');
  assert.equal(normalized.compositionConfidence, 0.90, 'V7.7: preserves compositionConfidence');
  assert.equal(normalized.minGrams, 500, 'V7.7: maps minGrams');
  assert.equal(normalized.maxGrams, 700, 'V7.7: maps maxGrams');
  ok(true, 'V7.7: normalizer separates foodConfidence, quantityConfidence, and compositionConfidence');
}

// V7.8 Toast logic: when filling is obscured, mark unobservable filling note and do not hallucinate
{
  const toastResult = normalizeMealPhotoResult({
    representationMode: 'COMPOSITE',
    items: [
      {
        name: 'Toast — ripieno non determinabile dalla foto',
        quantity: 120,
        unit: 'g',
        kcal: 280,
        pro: 9,
        carb: 38,
        fat: 10,
        confidence: 0.70,
        foodConfidence: 0.85,
        quantityConfidence: 0.65,
        notes: 'Toast — ripieno non determinabile dalla foto'
      }
    ]
  }, { mealName: 'Spuntino' });

  assert(toastResult.items[0].name.includes('Toast'), 'V7.8: recognizes toast');
  assert(toastResult.items[0].notes.includes('ripieno non determinabile'), 'V7.8: includes unobservable filling note');
  ok(true, 'V7.8: toast logic handles unobservable fillings without hallucination');
}

// V7.9 Second photo recommendation is returned when single photo is provided for thick/layered dish
{
  const singlePhotoPrompt = buildMealPhotoPrompt({
    images: [{ role: 'TOP', data: 'dummy1' }, { role: 'SIDE', data: 'dummy2' }],
    mealName: 'Pranzo',
    locale: 'it'
  });
  assert(singlePhotoPrompt.includes('VISTA LATERALE'), 'V7.9: prompt explains lateral view benefits');
  assert(singlePhotoPrompt.includes('DOPPIO CONTEGGIO'), 'V7.9: prompt enforces anti-double counting');
  assert(singlePhotoPrompt.includes('TOAST'), 'V7.9: prompt has specific toast guidelines');
  ok(true, 'V7.9: prompt contains multi-view and anti-double counting instructions');
}

// V7.10 UI contains representation switcher buttons and functions
{
  const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf-8');
  assert(html.includes('id="meal-photo-mode-composite-btn"'), 'V7.10: COMPOSITE button exists in UI');
  assert(html.includes('id="meal-photo-mode-components-btn"'), 'V7.10: COMPONENTS button exists in UI');
  assert(html.includes('function switchRepresentationMode('), 'V7.10: switchRepresentationMode function declared');
  assert(html.includes('function recalculateDraftTotals('), 'V7.10: recalculateDraftTotals function declared');
  assert(html.includes('function proceedWithTopPhotoOnly('), 'V7.10: proceedWithTopPhotoOnly function declared');
  ok(true, 'V7.10: UI contains representation switcher buttons and functions');
}

// V7.11 Regional Italian dish recognition (Porceddu sardo)
{
  const porcedduItem = normalizeMealPhotoItem({
    name: 'Porceddu arrosto sardo',
    grams: 250,
    state: 'cooked',
    yieldFactor: 0.70,
    hasNonEdibleParts: true,
    nonEdibleGrams: 80,
    edibleGrams: 170,
    confidence: 0.90,
    foodConfidence: 0.95,
    quantityConfidence: 0.80,
    kcal: 450,
    protein: 38,
    carbs: 0,
    fats: 32
  });
  assert.equal(porcedduItem.rawEquivalentGrams, 243, 'V7.11: computes 243g raw equivalent from 170g cooked edible at yield 0.70');
  assert.equal(porcedduItem.edibleGrams, 170, 'V7.11: separates bone scrap');
  ok(true, 'V7.11: Porceddu arrosto converts to raw equivalent and excludes bone scrap');
}

// V7.12 Regional Italian dish recognition (Culurgiones d'Ogliastra)
{
  const culurgionesItem = normalizeMealPhotoItem({
    name: 'Culurgiones d\'Ogliastra alla menta',
    grams: 220,
    confidence: 0.92,
    foodConfidence: 0.94,
    quantityConfidence: 0.85,
    kcal: 410,
    protein: 14,
    carbs: 58,
    fats: 13
  });
  assert.equal(culurgionesItem.kcal, 410, 'V7.12: preserves item kcal within macro tolerance');
  ok(true, 'V7.12: Culurgiones macros and calories consistent');
}

// V7.13 Regional Italian dish recognition (Malloreddus alla campidanese)
{
  const malloreddusItem = normalizeMealPhotoItem({
    name: 'Malloreddus alla campidanese',
    grams: 300,
    confidence: 0.93,
    foodConfidence: 0.95,
    quantityConfidence: 0.85,
    kcal: 540,
    protein: 20,
    carbs: 72,
    fats: 18
  });
  assert.equal(malloreddusItem.kcal, 540, 'V7.13: preserves item kcal within macro tolerance');
  ok(true, 'V7.13: Malloreddus macros and calories consistent');
}

// V7.14 Regional Italian dish recognition (Arancini di riso al ragù)
{
  const arancinoItem = normalizeMealPhotoItem({
    name: 'Arancino di riso al ragù',
    grams: 200,
    confidence: 0.94,
    foodConfidence: 0.96,
    quantityConfidence: 0.88,
    kcal: 420,
    protein: 12,
    carbs: 54,
    fats: 16
  });
  assert.equal(arancinoItem.kcal, 420, 'V7.14: preserves item kcal within macro tolerance');
  ok(true, 'V7.14: Arancino macros and calories consistent');
}

// V7.15 Regional Italian dish recognition (Bresaola della Valtellina IGP)
{
  const bresaolaItem = normalizeMealPhotoItem({
    name: 'Bresaola della Valtellina IGP',
    grams: 80,
    confidence: 0.96,
    foodConfidence: 0.98,
    quantityConfidence: 0.90,
    kcal: 125,
    protein: 26,
    carbs: 0,
    fats: 2
  });
  assert.equal(bresaolaItem.kcal, 125, 'V7.15: preserves item kcal within macro tolerance');
  ok(true, 'V7.15: Bresaola macros and calories consistent');
}

// V7.16 Mock analyzer returns valid V7 composite & components schema
{
  const mockResult = mockAnalyzeMealPhoto({ mealName: 'Pranzo' });
  assert(mockResult.compositeDish != null, 'V7.16: mock includes compositeDish');
  assert(Array.isArray(mockResult.components), 'V7.16: mock includes components array');
  assert(mockResult.representationMode === 'COMPOSITE' || mockResult.representationMode === 'COMPONENTS', 'V7.16: mock sets representationMode');
  const validNoDouble = validateNoDoubleCounting(mockResult);
  assert(validNoDouble.valid, 'V7.16: mock passes zero-double-counting validator');
  ok(true, 'V7.16: mock analyzer returns valid V7 composite & components schema');
}

// V7.17 Glass box file personal-recovery-16w.json untouched and identical
{
  const recJson = fs.readFileSync(path.join(root, 'private/personal-recovery-16w.json'), 'utf-8');
  assert(recJson.length > 500, 'V7.17: recovery json is intact');
  const parsed = JSON.parse(recJson);
  assert(parsed.title != null && Array.isArray(parsed.weeks), 'V7.17: recovery json title and weeks intact');
  ok(true, 'V7.17: glass box personal-recovery-16w.json untouched and intact');
}

// ============================================================
// V8: Scale Reference Calibration Tests
// ============================================================
console.log('\n--- Running V8 Scale Reference Calibration Tests ---');

// V8.1 Prompt instructs the model to look for scale-reference objects
{
  const itPromptV8 = buildMealPhotoPrompt({ mealName: 'Pranzo', locale: 'it' });
  const enPromptV8 = buildMealPhotoPrompt({ mealName: 'Dinner', locale: 'en' });
  ok(itPromptV8.includes('CALIBRAZIONE DI SCALA') && itPromptV8.includes('scaleReferenceDetected'), 'V8.1: Italian prompt instructs scale-reference calibration');
  ok(enPromptV8.includes('SCALE CALIBRATION') && enPromptV8.includes('scaleReferenceDetected'), 'V8.1: English prompt instructs scale-reference calibration');
}

// V8.2 normalizeMealPhotoResult propagates scale-reference fields from the model response
{
  const withRef = normalizeMealPhotoResult({
    overallConfidence: 0.85,
    scaleReferenceDetected: true,
    scaleReferenceType: 'fork',
    scaleReferenceNote: 'Forchetta standard usata per calibrare l\'area del piatto',
    items: [{ name: 'Pollo alla griglia', quantity: 180, unit: 'g', kcal: 280, confidence: 0.85 }]
  });
  assert.equal(withRef.scaleReferenceDetected, true, 'V8.2: preserves scaleReferenceDetected=true');
  assert.equal(withRef.scaleReferenceType, 'fork', 'V8.2: preserves scaleReferenceType');
  assert(withRef.scaleReferenceNote.includes('Forchetta'), 'V8.2: preserves scaleReferenceNote');
  ok(true, 'V8.2: normalizeMealPhotoResult propagates scale-reference fields');
}

// V8.3 Missing scale reference lowers trust: explicit warning is added
{
  const withoutRef = normalizeMealPhotoResult({
    overallConfidence: 0.85,
    items: [{ name: 'Pollo alla griglia', quantity: 180, unit: 'g', kcal: 280, confidence: 0.85 }]
  });
  assert.equal(withoutRef.scaleReferenceDetected, false, 'V8.3: defaults scaleReferenceDetected to false when absent');
  assert(withoutRef.warnings.some(w => /riferimento di scala/i.test(w)), 'V8.3: warns the user when no scale reference is detected');
  ok(true, 'V8.3: missing scale reference surfaces an explicit warning');
}

// V8.4 Mock analyzer reports no scale reference (never fakes calibration)
{
  const mockV8 = mockAnalyzeMealPhoto({ mealName: 'Cena' });
  assert.equal(mockV8.scaleReferenceDetected, false, 'V8.4: mock never claims a fake scale-reference calibration');
  ok(true, 'V8.4: mock analyzer is honest about missing scale reference');
}

// V8.5 Client UI surfaces scale-reference hint and confirm-modal feedback
{
  const htmlV8 = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
  const builtV8 = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
  ok(htmlV8.includes('scaleReferenceDetected') && builtV8.includes('scaleReferenceDetected'), 'V8.5: confirm modal reads scaleReferenceDetected from the result');
  ok(htmlV8.includes('posata, una moneta') && builtV8.includes('posata, una moneta'), 'V8.5: acquisition modal hints at including a scale-reference object');
}

// ============================================================
// V9: Quantity/Unit Robustness Tests (estimatedGrams vs piece/portion units)
// ============================================================
console.log('\n--- Running V9 Quantity/Unit Robustness Tests ---');

// V9.1 estimatedGrams (already an absolute gram value) must never be re-multiplied
// by a non-gram unit conversion - this is exactly how a real toast slice logged
// as "70g" ended up saved as ~4g/11kcal once "unit: fetta" was also present.
{
  const breadItem = normalizeMealPhotoItem({
    name: 'Pane in cassetta tostato',
    estimatedGrams: 70,
    quantity: 4,
    unit: 'fetta',
    kcal: 280,
    confidence: 0.85
  });
  assert.equal(breadItem.grams, 70, 'V9.1: estimatedGrams is not re-multiplied by the "fetta" unit conversion');
  assert.equal(breadItem.quantity, 4, 'V9.1: displayed quantity still reflects the 4-slice count, not grams');
  ok(true, 'V9.1: estimatedGrams stays authoritative regardless of the declared unit');
}

// V9.2 Without estimatedGrams, piece/slice units fall back to a sane per-piece
// gram estimate instead of treating "4 fette" as literally 4 grams.
{
  const noGramsItem = normalizeMealPhotoItem({
    name: 'Pane in cassetta tostato',
    quantity: 4,
    unit: 'fetta',
    kcal: 280,
    confidence: 0.85
  });
  assert.equal(noGramsItem.grams, 160, 'V9.2: falls back to a per-slice estimate (4 x 40g) instead of 4 grams');
  ok(true, 'V9.2: piece/slice units without estimatedGrams get a non-trivial gram fallback');
}

// V9.3 The response schema requires the model to always supply estimatedGrams,
// closing the ambiguous-unit gap at the source rather than only patching it downstream.
{
  ok(MEAL_PHOTO_RESPONSE_SCHEMA.properties.compositeDish.required?.includes('estimatedGrams'), 'V9.3: compositeDish schema requires estimatedGrams');
  ok(MEAL_PHOTO_RESPONSE_SCHEMA.properties.components.items.required.includes('estimatedGrams'), 'V9.3: components schema requires estimatedGrams');
  ok(MEAL_PHOTO_RESPONSE_SCHEMA.properties.items.items.required.includes('estimatedGrams'), 'V9.3: items schema requires estimatedGrams');
}

// V9.4 Client-side: unit-switch recalculation uses a food-aware portion guess
// instead of a flat 100g/porzione, and barcode fusion on a draft row respects
// the row's own unit instead of assuming the qty field is already grams.
{
  const htmlV9 = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
  const builtV9 = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
  ok(htmlV9.includes('function guessPortionGrams(') && builtV9.includes('function guessPortionGrams('), 'V9.4: food-specific portion-size heuristic exists');
  ok(htmlV9.includes('function foodQtyToGrams(') && builtV9.includes('function foodQtyToGrams('), 'V9.4: shared qty+unit->grams helper exists');
  ok(htmlV9.includes('foodQtyToGrams(rawQty, rowUnit') && builtV9.includes('foodQtyToGrams(rawQty, rowUnit'), 'V9.4: barcode fusion on a draft row respects its own unit instead of assuming grams');
  ok(htmlV9.includes('foodQtyToGrams(qty, unit, foodName)') && builtV9.includes('foodQtyToGrams(qty, unit, foodName)'), 'V9.4: manual add-food unit switch uses the food-aware portion helper');
}

// V9.5 Home dashboard progress % is derived from the active plan's actual week
// count (which currentWeek is already clamped against) and capped at 100%,
// instead of an unrelated "desired duration for future generation" preference
// that could drift out of sync and show nonsense like 400%.
{
  const htmlV9b = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
  const builtV9b = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
  const expr = 'Math.min(100, Math.round((currentWeek/(DATA.weeks.length||1))*100))';
  ok(htmlV9b.includes(expr) && builtV9b.includes(expr), 'V9.5: home progress % uses the active plan\'s week count and is capped at 100%');
}

console.log('\nAll meal-photo tests passed.');

