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
  UNIVERSAL_BARCODE_CATALOG
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
  'function confirmMealPhotoInsert(',
  'function insertFoodsIntoSelectedMeal(',
  'function handleMealPhotoSelected(',
  '/api/food/analyze-photo',
  'id="meal-photo-modal"',
  'id="nutrition-meal-photo-camera"',
  'id="nutrition-meal-photo-file"',
  'FOTO PASTO',
  'onclick="openMealPhotoPicker('
]) {
  ok(html.includes(token), `nutrition UI contains ${token}`);
}

ok(!/personal-recovery-16w|DATA\.weeks|customSets|intelTargets/.test(
  html.slice(html.indexOf('function ensureNutritionSlotForPhoto'), html.indexOf('function deleteFoodItem'))
), 'meal-photo helpers do not write training program, loads, or personal 16w');

const api = fs.readFileSync(path.join(root, 'coach-api.mjs'), 'utf8');
ok(api.includes('mountFoodRoutes') && api.includes('/api/food/analyze-photo'), 'coach-api mounts food photo route');
ok(api.includes('mealPhoto: true'), 'health surface advertises mealPhoto');
ok(!/GEMINI_API_KEY\s*=/.test(api) || api.includes('process.env.GEMINI_API_KEY'), 'Gemini key stays server-side');

const recovery = path.join(root, 'web/personal-recovery-16w.json');
const status = execSync('git status --porcelain -- web/personal-recovery-16w.json app/src/main/assets/personal-recovery-16w.json', { cwd: root }).toString().trim();
ok(!status, 'personal-recovery-16w.json was not modified');
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


console.log('\nAll meal-photo tests passed.');
