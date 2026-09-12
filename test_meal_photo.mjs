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
  MEAL_PHOTO_LOW_CONFIDENCE
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

console.log('\nAll meal-photo tests passed.');
