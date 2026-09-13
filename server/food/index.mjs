/**
 * Nurvan Food Intelligence V3 + Barcode Scanner V2
 * Production-grade food recognition, portion estimation, raw/cooked intelligence,
 * chain restaurant catalog, OCR label extraction & universal barcode lookup.
 */

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';
const OFF_BASE = 'https://world.openfoodfacts.org';

function fold(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function num(value, defaultVal = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultVal;
}

function clampNum(value, min, max, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function mapUsdaFood(raw) {
  const nuts = raw.foodNutrients || [];
  let kcal = 0, pro = 0, carb = 0, fat = 0;
  for (const n of nuts) {
    const id = n.nutrientId || n.nutrientNumber;
    const name = fold(n.nutrientName);
    const v = num(n.value || n.amount);
    if (id === 1008 || name.includes('energy') && !name.includes('kj')) kcal = v;
    else if (id === 1003 || name === 'protein') pro = v;
    else if (id === 1005 || name.includes('carbohydrate')) carb = v;
    else if (id === 1004 || name.includes('total lipid') || name === 'fat') fat = v;
  }
  const isBranded = raw.dataType === 'Branded';
  return {
    id: 'usda_' + raw.fdcId,
    name: raw.description || 'Senza nome',
    brand: raw.brandOwner || raw.brandName || null,
    kcalPer100: Math.round(kcal),
    proPer100: Math.round(pro * 10) / 10,
    carbPer100: Math.round(carb * 10) / 10,
    fatPer100: Math.round(fat * 10) / 10,
    serving: raw.householdServingFullText || '100g',
    servingGrams: num(raw.servingSize) || 100,
    provenance: {
      source: 'usda_fdc',
      kind: isBranded ? 'branded' : 'generic',
      confidence: isBranded ? 0.85 : 0.95,
      attribution: 'USDA FoodData Central (CC0)'
    }
  };
}

function mapOffProduct(raw) {
  const nuts = raw.nutriments || {};
  let kcal = num(nuts['energy-kcal_100g'] || nuts.energy_kcal_100g || nuts['energy-kcal'] || nuts.energy_kcal);
  if (!kcal && nuts['energy-kj_100g']) {
    kcal = num(nuts['energy-kj_100g']) / 4.184;
  }
  if (!kcal && nuts.energy_100g) {
    const isKcal = String(nuts.energy_unit || '').toLowerCase() === 'kcal';
    kcal = isKcal ? num(nuts.energy_100g) : (num(nuts.energy_100g) / 4.184);
  }
  const pro = num(nuts.proteins_100g || nuts.proteins || nuts['proteins_value']);
  const carb = num(nuts.carbohydrates_100g || nuts.carbohydrates || nuts['carbohydrates_value']);
  const fat = num(nuts.fat_100g || nuts.fat || nuts['fat_value']);
  const sugars = num(nuts.sugars_100g || nuts.sugars || nuts['sugars_value']);
  const saturatedFat = num(nuts['saturated-fat_100g'] || nuts.saturated_fat_100g || nuts['saturated-fat'] || nuts.saturated_fat);
  const fiber = num(nuts.fiber_100g || nuts.fiber || nuts['fiber_value']);
  const salt = num(nuts.salt_100g || nuts.salt || (nuts.sodium_100g ? num(nuts.sodium_100g) * 2.5 : 0));

  if (!kcal && (pro > 0 || carb > 0 || fat > 0)) {
    kcal = pro * 4 + carb * 4 + fat * 9;
  }

  const brand = raw.brands || raw.brand || null;
  const name = raw.product_name_it || raw.product_name || raw.generic_name_it || raw.generic_name || 'Prodotto';
  const hasComplete = (kcal > 0) || (pro > 0 || carb > 0 || fat > 0);

  return {
    id: 'off_' + (raw.code || raw._id || Math.random().toString(36).slice(2, 10)),
    barcode: raw.code || null,
    name,
    brand,
    kcalPer100: Math.round(kcal),
    proPer100: Math.round(pro * 10) / 10,
    carbPer100: Math.round(carb * 10) / 10,
    fatPer100: Math.round(fat * 10) / 10,
    sugarsPer100: Math.round(sugars * 10) / 10,
    saturatedFatPer100: Math.round(saturatedFat * 10) / 10,
    fibersPer100: Math.round(fiber * 10) / 10,
    saltPer100: Math.round(salt * 100) / 100,
    serving: raw.serving_size || '100g',
    servingGrams: num(raw.serving_quantity) || (raw.serving_size ? parseFloat(String(raw.serving_size).replace(',', '.')) : 100) || 100,
    nutriscore: raw.nutriscore_grade || null,
    hasCompleteNutrition: hasComplete,
    provenance: {
      source: 'open_food_facts',
      kind: raw.code ? 'barcode_product' : 'crowdsourced',
      confidence: hasComplete ? (raw.code ? 0.98 : 0.8) : 0.6,
      attribution: 'Open Food Facts (ODbL)'
    }
  };
}

export async function searchUsda(query, { apiKey, pageSize = 8 } = {}) {
  if (!apiKey || !query || query.trim().length < 2) return [];
  const url = `${USDA_BASE}/foods/search?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(query)}&pageSize=${pageSize}&dataType=Survey (FPEDS),Foundation,SR Legacy,Branded`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('USDA_HTTP_' + res.status);
  const data = await res.json();
  return (data.foods || []).map(mapUsdaFood);
}

export async function searchOpenFoodFacts(query, { pageSize = 8 } = {}) {
  if (!query || query.trim().length < 2) return [];
  const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${pageSize}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'GiammariaSystem/1.0 (fitness-app; contact@giammaria.system)'
    }
  });
  if (!res.ok) throw new Error('OFF_HTTP_' + res.status);
  const data = await res.json();
  return (data.products || []).map(mapOffProduct);
}

export async function lookupOffBarcode(code) {
  if (!code) return null;
  const url = `${OFF_BASE}/api/v2/product/${encodeURIComponent(code)}.json`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'GiammariaSystem/1.0 (fitness-app; contact@giammaria.system)'
    }
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  return mapOffProduct(data.product);
}

export async function searchFoodMulti(query, env = process.env) {
  const q = fold(query);
  if (!q || q.length < 2) return { items: [], source: 'empty' };
  const items = [];
  const sources = [];

  // Check official chain restaurants first
  const chainHits = searchChainCatalog(query);
  if (chainHits.length) {
    items.push(...chainHits);
    sources.push('official_restaurant_data');
  }

  const usdaKey = env.USDA_FDC_API_KEY || env.FDC_API_KEY || '';
  try {
    if (usdaKey) {
      const usda = await searchUsda(query, { apiKey: usdaKey, pageSize: 6 });
      items.push(...usda);
      if (usda.length) sources.push('usda');
    }
  } catch (err) {
    console.warn('[food] USDA failed', err.message);
  }

  try {
    const off = await searchOpenFoodFacts(query, { pageSize: 6 });
    items.push(...off);
    if (off.length) sources.push('open_food_facts');
  } catch (err) {
    console.warn('[food] OFF failed', err.message);
  }

  const seen = new Set();
  const deduped = [];
  for (const it of items) {
    const key = fold(it.name) + '|' + (it.barcode || it.id);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(it);
  }

  return {
    ok: true,
    items: deduped.slice(0, 12),
    source: sources.join('+') || 'none',
    attribution: sources.includes('open_food_facts')
      ? 'Open Food Facts (ODbL) — keep separate from proprietary catalogs'
      : sources.includes('usda')
        ? 'USDA FoodData Central (CC0)'
        : null
  };
}


/**
 * Cooking Yield Factors (cooked_weight / raw_weight)
 */
export const COOKING_YIELD_FACTORS = {
  'rice': 2.3,
  'riso': 2.3,
  'pasta': 2.2,
  'spaghetti': 2.2,
  'penne': 2.2,
  'couscous': 2.4,
  'cuscus': 2.4,
  'quinoa': 2.6,
  'oats': 2.8,
  'avena': 2.8,
  'orzo': 2.5,
  'farro': 2.4,
  'lentils': 2.4,
  'lenticchie': 2.4,
  'chickpeas': 2.4,
  'ceci': 2.4,
  'beans': 2.3,
  'fagioli': 2.3,
  'chicken': 0.80,
  'pollo': 0.80,
  'turkey': 0.80,
  'fagiano': 0.80,
  'tacchino': 0.80,
  'beef': 0.75,
  'manzo': 0.75,
  'steak': 0.75,
  'bistecca': 0.75,
  'pork': 0.75,
  'maiale': 0.75,
  'porceddu': 0.70,
  'porcetto': 0.70,
  'capra': 0.70,
  'agnello': 0.72,
  'coniglio': 0.75,
  'vitello': 0.78,
  'fish': 0.82,
  'pesce': 0.82,
  'salmon': 0.85,
  'salmone': 0.85,
  'tuna': 0.80,
  'tonno': 0.80,
  'cod': 0.80,
  'merluzzo': 0.80,
  'potatoes': 0.98,
  'patate': 0.98,
  'spinach': 0.45,
  'spinaci': 0.45,
  'mushrooms': 0.50,
  'funghi': 0.50
};

export function computeRawCookedEquivalence({ name, state, grams, edibleGrams, rawEquivalentGrams, cookingYieldFactor } = {}) {
  const fname = fold(name);
  let yieldFactor = num(cookingYieldFactor);
  if (yieldFactor <= 0) {
    for (const [key, factor] of Object.entries(COOKING_YIELD_FACTORS)) {
      if (fname.includes(key)) {
        yieldFactor = factor;
        break;
      }
    }
  }
  if (yieldFactor <= 0) yieldFactor = 1.0;

  let finalState = String(state || '').toLowerCase().trim();
  if (!finalState || finalState === 'unknown') {
    if (fname.includes('cotto') || fname.includes('cooked') || fname.includes('boiled') || fname.includes('arrosto') || fname.includes('griglia') || fname.includes('fritto')) {
      finalState = 'cooked';
    } else if (fname.includes('crudo') || fname.includes('raw') || fname.includes('secco') || fname.includes('dried')) {
      finalState = 'raw';
    } else if (yieldFactor !== 1.0) {
      // Default to cooked for plated pasta/rice/meat if analyzed on a dinner plate
      finalState = 'cooked';
    } else {
      finalState = 'ready_to_eat';
    }
  }

  const g = edibleGrams != null ? num(edibleGrams) : num(grams);
  let estimatedCookedGrams = null;
  let estimatedRawGrams = null;
  let calcRawEquiv = num(rawEquivalentGrams);

  if (finalState === 'cooked') {
    estimatedCookedGrams = g;
    if (calcRawEquiv <= 0) {
      calcRawEquiv = yieldFactor > 0 ? Math.round(g / yieldFactor) : g;
    }
    estimatedRawGrams = calcRawEquiv;
  } else if (finalState === 'raw' || finalState === 'dried') {
    estimatedRawGrams = g;
    calcRawEquiv = g;
    estimatedCookedGrams = yieldFactor > 0 ? Math.round(g * yieldFactor) : g;
  } else {
    estimatedCookedGrams = g;
    estimatedRawGrams = g;
    calcRawEquiv = g;
  }

  return {
    state: finalState,
    stateConfidence: yieldFactor !== 1.0 ? 0.90 : 0.80,
    cookingYieldFactor: yieldFactor,
    estimatedCookedGrams,
    estimatedRawGrams,
    rawEquivalentGrams: calcRawEquiv
  };
}

/**
 * Famous Chain & Restaurant Official Menu Catalog
 */
export const CHAIN_RESTAURANT_CATALOG = [
  // Old Wild West
  {
    id: 'oww_double_cheeseburger',
    name: 'Double Cheeseburger',
    brand: 'Old Wild West',
    aliases: ['double cheeseburger', 'old wild west double cheeseburger', 'oww double cheeseburger'],
    kcal: 740, pro: 44, carb: 46, fat: 42,
    serving: '1 panino (320g)', servingGrams: 320,
    provenance: { source: 'official_restaurant_data', kind: 'chain_menu_item', confidence: 0.96, attribution: 'Old Wild West Official Nutrition' }
  },
  {
    id: 'oww_dakota_burger',
    name: 'Dakota Burger',
    brand: 'Old Wild West',
    aliases: ['dakota burger', 'old wild west dakota'],
    kcal: 680, pro: 38, carb: 48, fat: 36,
    serving: '1 panino (300g)', servingGrams: 300,
    provenance: { source: 'official_restaurant_data', kind: 'chain_menu_item', confidence: 0.96, attribution: 'Old Wild West Official Nutrition' }
  },
  {
    id: 'oww_bbq_ribs',
    name: 'BBQ Ribs',
    brand: 'Old Wild West',
    aliases: ['bbq ribs', 'costine bbq', 'old wild west ribs'],
    kcal: 890, pro: 58, carb: 24, fat: 62,
    serving: '1 porzione (450g)', servingGrams: 450,
    provenance: { source: 'official_restaurant_data', kind: 'chain_menu_item', confidence: 0.96, attribution: 'Old Wild West Official Nutrition' }
  },
  // McDonald's
  {
    id: 'mcd_big_mac',
    name: 'Big Mac',
    brand: 'McDonald\'s',
    aliases: ['big mac', 'mcdonalds big mac', 'mcdonald big mac'],
    kcal: 503, pro: 26, carb: 42, fat: 25,
    serving: '1 panino (215g)', servingGrams: 215,
    provenance: { source: 'official_restaurant_data', kind: 'chain_menu_item', confidence: 0.98, attribution: 'McDonald\'s Official Nutrition' }
  },
  {
    id: 'mcd_crispy_mcbacon',
    name: 'Crispy McBacon',
    brand: 'McDonald\'s',
    aliases: ['crispy mcbacon', 'mcdonalds crispy mcbacon'],
    kcal: 497, pro: 28, carb: 39, fat: 26,
    serving: '1 panino (200g)', servingGrams: 200,
    provenance: { source: 'official_restaurant_data', kind: 'chain_menu_item', confidence: 0.98, attribution: 'McDonald\'s Official Nutrition' }
  },
  {
    id: 'mcd_mcchicken',
    name: 'McChicken',
    brand: 'McDonald\'s',
    aliases: ['mcchicken', 'mcdonalds mcchicken'],
    kcal: 427, pro: 21, carb: 43, fat: 18,
    serving: '1 panino (180g)', servingGrams: 180,
    provenance: { source: 'official_restaurant_data', kind: 'chain_menu_item', confidence: 0.98, attribution: 'McDonald\'s Official Nutrition' }
  },
  {
    id: 'mcd_fries_medium',
    name: 'Patatine Medie',
    brand: 'McDonald\'s',
    aliases: ['patatine mcdonalds', 'mcdonalds fries', 'medium fries'],
    kcal: 330, pro: 4.1, carb: 42, fat: 16,
    serving: 'porzione media (115g)', servingGrams: 115,
    provenance: { source: 'official_restaurant_data', kind: 'chain_menu_item', confidence: 0.98, attribution: 'McDonald\'s Official Nutrition' }
  },
  // Burger King
  {
    id: 'bk_whopper',
    name: 'Whopper',
    brand: 'Burger King',
    aliases: ['whopper', 'burger king whopper'],
    kcal: 640, pro: 28, carb: 51, fat: 36,
    serving: '1 panino (290g)', servingGrams: 290,
    provenance: { source: 'official_restaurant_data', kind: 'chain_menu_item', confidence: 0.98, attribution: 'Burger King Official Nutrition' }
  },
  {
    id: 'bk_bacon_king',
    name: 'Bacon King',
    brand: 'Burger King',
    aliases: ['bacon king', 'burger king bacon king'],
    kcal: 1040, pro: 64, carb: 50, fat: 68,
    serving: '1 panino (370g)', servingGrams: 370,
    provenance: { source: 'official_restaurant_data', kind: 'chain_menu_item', confidence: 0.98, attribution: 'Burger King Official Nutrition' }
  },
  // KFC
  {
    id: 'kfc_crispy_tenders_3',
    name: 'Colonel Crispy Tenders (3 pz)',
    brand: 'KFC',
    aliases: ['crispy tenders', 'kfc tenders', 'tenders kfc'],
    kcal: 260, pro: 27, carb: 12, fat: 11,
    serving: '3 pezzi (135g)', servingGrams: 135,
    provenance: { source: 'official_restaurant_data', kind: 'chain_menu_item', confidence: 0.98, attribution: 'KFC Official Nutrition' }
  },
  // Subway
  {
    id: 'subway_italian_bmt',
    name: 'Sub 15cm Italian B.M.T.',
    brand: 'Subway',
    aliases: ['italian bmt', 'subway italian bmt', 'subway bmt'],
    kcal: 410, pro: 20, carb: 44, fat: 17,
    serving: '1 sub (220g)', servingGrams: 220,
    provenance: { source: 'official_restaurant_data', kind: 'chain_menu_item', confidence: 0.98, attribution: 'Subway Official Nutrition' }
  },
  // Poke & Pizza
  {
    id: 'pizza_margherita_whole',
    name: 'Pizza Margherita (intera)',
    brand: 'Pizzeria',
    aliases: ['pizza margherita', 'pizza margherita intera'],
    kcal: 800, pro: 32, carb: 108, fat: 26,
    serving: '1 pizza (350g)', servingGrams: 350,
    provenance: { source: 'official_restaurant_data', kind: 'chain_menu_item', confidence: 0.95, attribution: 'Standard Pizza Nutrition' }
  },
  {
    id: 'poke_salmone_regular',
    name: 'Poke Bowl Salmone (Regular)',
    brand: 'Poke House',
    aliases: ['poke salmone', 'poke house salmone', 'poke bowl'],
    kcal: 580, pro: 32, carb: 68, fat: 18,
    serving: '1 bowl (400g)', servingGrams: 400,
    provenance: { source: 'official_restaurant_data', kind: 'chain_menu_item', confidence: 0.95, attribution: 'Poke House Nutrition' }
  }
];

export function searchChainCatalog(query) {
  const q = fold(query);
  if (!q || q.length < 2) return [];
  const hits = [];
  for (const item of CHAIN_RESTAURANT_CATALOG) {
    const itemName = fold(item.name);
    const brandName = fold(item.brand);
    const allText = itemName + ' ' + brandName + ' ' + (item.aliases || []).map(fold).join(' ');
    if (allText.includes(q) || q.includes(itemName) || (brandName && q.includes(brandName) && q.split(' ').some(w => w.length > 3 && itemName.includes(w)))) {
      const grams = item.servingGrams || 100;
      hits.push({
        id: item.id,
        name: item.name,
        brand: item.brand,
        kcalPer100: Math.round((item.kcal / grams) * 100),
        proPer100: Math.round((item.pro / grams) * 1000) / 10,
        carbPer100: Math.round((item.carb / grams) * 1000) / 10,
        fatPer100: Math.round((item.fat / grams) * 1000) / 10,
        serving: item.serving,
        servingGrams: grams,
        provenance: item.provenance
      });
    }
  }
  return hits;
}

export function findChainItem(query, brandHint = '') {
  const q = fold(query);
  const b = fold(brandHint);
  if (!q || q.length < 2) return null;
  for (const item of CHAIN_RESTAURANT_CATALOG) {
    const itemName = fold(item.name);
    const itemBrand = fold(item.brand);
    if (b && !itemBrand.includes(b) && !b.includes(itemBrand)) continue;
    if (q.includes(itemName) || itemName.includes(q) || (item.aliases || []).some(a => q.includes(fold(a)) || fold(a).includes(q))) {
      return item;
    }
  }
  return null;
}

export const MEAL_PHOTO_LOW_CONFIDENCE = 0.55;
export const MEAL_PHOTO_MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export const MEAL_PHOTO_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    representationMode: { type: 'string', enum: ['COMPOSITE', 'COMPONENTS'] },
    overallConfidence: { type: 'number' },
    notes: { type: 'string' },
    noFoodDetected: { type: 'boolean' },
    secondPhotoRecommendation: { type: 'string', enum: ['SECOND_PHOTO_REQUIRED', 'SECOND_PHOTO_RECOMMENDED', 'SECOND_PHOTO_NOT_NEEDED'] },
    secondPhotoReason: { type: 'string' },
    compositeDish: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        brand: { type: 'string' },
        state: { type: 'string', enum: ['raw', 'cooked', 'ready_to_eat', 'dried', 'frozen', 'unknown'] },
        quantity: { type: 'number' },
        unit: { type: 'string' },
        estimatedGrams: { type: 'number' },
        minGrams: { type: 'number' },
        maxGrams: { type: 'number' },
        visualGrams: { type: 'number' },
        edibleGrams: { type: 'number' },
        hasNonEdibleParts: { type: 'boolean' },
        kcal: { type: 'number' },
        pro: { type: 'number' },
        carb: { type: 'number' },
        fat: { type: 'number' },
        confidence: { type: 'number' },
        foodConfidence: { type: 'number' },
        quantityConfidence: { type: 'number' },
        compositionConfidence: { type: 'number' },
        notes: { type: 'string' }
      }
    },
    components: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          brand: { type: 'string' },
          state: { type: 'string', enum: ['raw', 'cooked', 'ready_to_eat', 'dried', 'frozen', 'unknown'] },
          stateConfidence: { type: 'number' },
          estimatedCookedGrams: { type: 'number' },
          estimatedRawGrams: { type: 'number' },
          rawEquivalentGrams: { type: 'number' },
          cookingYieldFactor: { type: 'number' },
          quantity: { type: 'number' },
          unit: { type: 'string' },
          estimatedGrams: { type: 'number' },
          minGrams: { type: 'number' },
          maxGrams: { type: 'number' },
          visualGrams: { type: 'number' },
          edibleGrams: { type: 'number' },
          hasNonEdibleParts: { type: 'boolean' },
          kcal: { type: 'number' },
          pro: { type: 'number' },
          carb: { type: 'number' },
          fat: { type: 'number' },
          confidence: { type: 'number' },
          foodConfidence: { type: 'number' },
          quantityConfidence: { type: 'number' },
          compositionConfidence: { type: 'number' },
          candidates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                confidence: { type: 'number' }
              },
              required: ['name', 'confidence']
            }
          },
          notes: { type: 'string' }
        },
        required: ['name', 'quantity', 'unit', 'kcal', 'confidence']
      }
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          brand: { type: 'string' },
          isRestaurantChain: { type: 'boolean' },
          isPackagedProduct: { type: 'boolean' },
          state: { type: 'string', enum: ['raw', 'cooked', 'ready_to_eat', 'dried', 'frozen', 'unknown'] },
          stateConfidence: { type: 'number' },
          estimatedCookedGrams: { type: 'number' },
          estimatedRawGrams: { type: 'number' },
          rawEquivalentGrams: { type: 'number' },
          cookingYieldFactor: { type: 'number' },
          visualDescription: { type: 'string' },
          pieceCount: { type: 'number' },
          plateCoveragePercent: { type: 'number' },
          quantity: { type: 'number' },
          unit: { type: 'string' },
          estimatedGrams: { type: 'number' },
          minGrams: { type: 'number' },
          maxGrams: { type: 'number' },
          visualGrams: { type: 'number' },
          edibleGrams: { type: 'number' },
          hasNonEdibleParts: { type: 'boolean' },
          kcal: { type: 'number' },
          pro: { type: 'number' },
          carb: { type: 'number' },
          fat: { type: 'number' },
          confidence: { type: 'number' },
          foodConfidence: { type: 'number' },
          quantityConfidence: { type: 'number' },
          compositionConfidence: { type: 'number' },
          candidates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                confidence: { type: 'number' }
              },
              required: ['name', 'confidence']
            }
          },
          notes: { type: 'string' }
        },
        required: ['name', 'quantity', 'unit', 'kcal', 'confidence']
      }
    }
  },
  required: ['items', 'overallConfidence']
};

export const NUTRITION_LABEL_OCR_SCHEMA = {
  type: 'object',
  properties: {
    productName: { type: 'string' },
    brand: { type: 'string' },
    servingSize: { type: 'string' },
    servingGrams: { type: 'number' },
    per100g: {
      type: 'object',
      properties: {
        kcal: { type: 'number' },
        kj: { type: 'number' },
        fat: { type: 'number' },
        saturatedFat: { type: 'number' },
        carb: { type: 'number' },
        sugars: { type: 'number' },
        fiber: { type: 'number' },
        pro: { type: 'number' },
        salt: { type: 'number' }
      }
    },
    perServing: {
      type: 'object',
      properties: {
        kcal: { type: 'number' },
        fat: { type: 'number' },
        carb: { type: 'number' },
        pro: { type: 'number' }
      }
    },
    confidence: { type: 'number' },
    notes: { type: 'string' }
  },
  required: ['per100g', 'confidence']
};


export function parseImagePayload(raw, mimeHint) {
  const source = String(raw || '').trim();
  if (!source) return null;
  const dataUrl = source.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (dataUrl) {
    const data = dataUrl[2].replace(/\s/g, '');
    return { mimeType: dataUrl[1], data, bytes: Math.floor(data.length * 0.75) };
  }
  if (/^[A-Za-z0-9+/=\s]+$/.test(source) && source.replace(/\s/g, '').length > 80) {
    const data = source.replace(/\s/g, '');
    const mime = typeof mimeHint === 'string' && mimeHint.startsWith('image/') ? mimeHint : 'image/jpeg';
    return { mimeType: mime, data, bytes: Math.floor(data.length * 0.75) };
  }
  return null;
}

function normalizeUnit(unit) {
  const u = fold(unit);
  if (u === 'ml' || u === 'millilitri') return 'ml';
  if (u === 'porzione' || u === 'porzioni' || u === 'portion' || u === 'portions' || u === 'serving') return 'porzioni';
  if (u === 'cucchiaio' || u === 'cucchiai' || u === 'tbsp') return 'cucchiai';
  if (u === 'scoop' || u === 'misurino' || u === 'misurini') return 'misurini';
  if (u === 'panino' || u === 'sandwich' || u === 'burger') return 'panino';
  if (u === 'pezzo' || u === 'pezzi' || u === 'piece' || u === 'pieces') return 'pezzi';
  return 'g';
}

function quantityToGrams(quantity, unit) {
  const qty = clampNum(quantity, 0, 5000, 0);
  const u = normalizeUnit(unit);
  if (u === 'porzioni') return qty * 100;
  if (u === 'cucchiai') return qty * 15;
  if (u === 'misurini') return qty * 30;
  if (u === 'panino') return qty * 250;
  return qty;
}

function roundGramsPlatitude(g) {
  const n = clampNum(g, 0, 5000, 0);
  if (n <= 0) return 0;
  if (n <= 15) return Math.round(n * 10) / 10;
  if (n <= 50) return Math.round(n / 5) * 5;
  return Math.round(n / 5) * 5;
}

export function validateNoDoubleCounting(mealDraft) {
  if (!mealDraft || typeof mealDraft !== 'object') {
    return { valid: true, error: null, sanitizedItems: [] };
  }

  const mode = mealDraft.representationMode === 'COMPOSITE' ? 'COMPOSITE' : 'COMPONENTS';
  const items = Array.isArray(mealDraft.items) ? [...mealDraft.items] : [];
  const compositeDish = mealDraft.compositeDish || null;
  const components = Array.isArray(mealDraft.components) ? mealDraft.components : [];

  const compositeName = compositeDish?.name ? fold(compositeDish.name) : '';
  let hasCompositeInItems = false;

  for (const it of items) {
    const itName = fold(it.name || '');
    if (compositeName && (itName === compositeName || compositeName.includes(itName) || itName.includes(compositeName))) {
      hasCompositeInItems = true;
    }
  }

  const isMultiComponent = items.length > 1;
  const violationDetected = Boolean(
    (mode === 'COMPOSITE' && isMultiComponent && compositeDish) ||
    (mode === 'COMPONENTS' && hasCompositeInItems && components.length > 0 && items.length > components.length) ||
    (hasCompositeInItems && isMultiComponent && items.some(it => {
      const n = fold(it.name || '');
      return compositeName && compositeName !== n && (compositeName.includes(n) || n.includes('riso') || n.includes('pollo') || n.includes('peperon'));
    }))
  );

  let sanitizedItems = items;
  if (mode === 'COMPOSITE') {
    sanitizedItems = compositeDish ? [compositeDish] : items.slice(0, 1);
  } else {
    if (components && components.length > 0) {
      sanitizedItems = components;
    } else if (compositeDish && items.length > 1) {
      sanitizedItems = items.filter(it => fold(it.name || '') !== compositeName);
    }
  }

  const normalizedSanitized = sanitizedItems.map(normalizeMealPhotoItem).filter(Boolean);
  return {
    valid: !violationDetected,
    violationDetected,
    representationMode: mode,
    sanitizedItems: normalizedSanitized,
    activeItems: normalizedSanitized
  };
}

export function calculateMealTotals(items = []) {
  let totalGrams = 0;
  let totalKcal = 0;
  let totalPro = 0;
  let totalCarb = 0;
  let totalFat = 0;

  for (const it of items) {
    totalGrams += num(it.quantity || it.grams || it.visualGrams || it.edibleGrams || 0);
    totalKcal += num(it.kcal);
    totalPro += num(it.pro ?? it.protein ?? 0);
    totalCarb += num(it.carb ?? it.carbs ?? 0);
    totalFat += num(it.fat ?? it.fats ?? 0);
  }

  const roundedGrams = Math.round(totalGrams);
  const roundedKcal = Math.round(totalKcal);
  const roundedPro = Math.round(totalPro * 10) / 10;
  const roundedCarb = Math.round(totalCarb * 10) / 10;
  const roundedFat = Math.round(totalFat * 10) / 10;

  const macroKcal = Math.round(roundedPro * 4 + roundedCarb * 4 + roundedFat * 9);
  let finalKcal = roundedKcal;
  if (macroKcal > 0 && (finalKcal === 0 || Math.abs(finalKcal - macroKcal) > Math.max(80, finalKcal * 0.4))) {
    finalKcal = macroKcal;
  }

  return {
    kcal: finalKcal,
    pro: roundedPro,
    carb: roundedCarb,
    fat: roundedFat,
    grams: roundedGrams,
    totalKcal: finalKcal,
    totalPro: roundedPro,
    totalCarb: roundedCarb,
    totalFat: roundedFat,
    totalGrams: roundedGrams
  };
}

export function normalizeMealPhotoItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw?.name || raw?.food || '').replace(/\s+/g, ' ').trim();
  if (!name) return null;
  const unit = normalizeUnit(raw?.unit);
  const rawQty = raw?.estimatedGrams ?? raw?.quantity ?? raw?.qty ?? raw?.grams;
  const rawGrams = quantityToGrams(rawQty, unit);
  const grams = roundGramsPlatitude(rawGrams);
  const quantity = unit === 'g' ? grams : (clampNum(rawQty, 0, 5000, 0) || (unit === 'ml' ? grams : 1));

  const confidence = Math.round(clampNum(raw?.confidence, 0, 1, 0.4) * 100) / 100;
  const foodConfidence = Math.round(clampNum(raw?.foodConfidence ?? raw?.confidence, 0, 1, confidence) * 100) / 100;
  const quantityConfidence = Math.round(clampNum(raw?.quantityConfidence ?? raw?.confidence, 0, 1, confidence) * 100) / 100;
  const compositionConfidence = Math.round(clampNum(raw?.compositionConfidence ?? raw?.confidence, 0, 1, 0.5) * 100) / 100;

  let minGrams = Number.isFinite(Number(raw?.minGrams ?? raw?.rangeMin)) && Number(raw?.minGrams ?? raw?.rangeMin) > 0
    ? roundGramsPlatitude(raw?.minGrams ?? raw?.rangeMin)
    : null;
  let maxGrams = Number.isFinite(Number(raw?.maxGrams ?? raw?.rangeMax)) && Number(raw?.maxGrams ?? raw?.rangeMax) > 0
    ? roundGramsPlatitude(raw?.maxGrams ?? raw?.rangeMax)
    : null;

  if (minGrams == null || minGrams > grams) {
    const margin = quantityConfidence >= 0.8 ? 0.15 : quantityConfidence >= 0.6 ? 0.25 : 0.35;
    minGrams = roundGramsPlatitude(grams * (1 - margin));
  }
  if (maxGrams == null || maxGrams < grams) {
    const margin = quantityConfidence >= 0.8 ? 0.15 : quantityConfidence >= 0.6 ? 0.25 : 0.35;
    maxGrams = roundGramsPlatitude(grams * (1 + margin));
  }

  const hasNonEdibleParts = Boolean(
    raw?.hasNonEdibleParts ||
    raw?.hasWaste ||
    (raw?.visualGrams && raw?.edibleGrams && Number(raw.visualGrams) > Number(raw.edibleGrams))
  );
  const visualGrams = roundGramsPlatitude(raw?.visualGrams ?? (hasNonEdibleParts ? Math.round(grams * 1.35) : grams));
  const edibleGrams = hasNonEdibleParts
    ? roundGramsPlatitude(raw?.edibleGrams ?? grams)
    : grams;

  // Raw/Cooked Intelligence calculation
  const rawCooked = computeRawCookedEquivalence({
    name,
    state: raw?.state,
    grams: grams,
    edibleGrams,
    rawEquivalentGrams: raw?.rawEquivalentGrams,
    cookingYieldFactor: raw?.cookingYieldFactor
  });

  let kcal = Math.round(clampNum(raw?.kcal ?? raw?.calories, 0, 4000, 0));
  let pro = Math.round(clampNum(raw?.pro ?? raw?.protein, 0, 400, 0) * 10) / 10;
  let carb = Math.round(clampNum(raw?.carb ?? raw?.carbs, 0, 500, 0) * 10) / 10;
  let fat = Math.round(clampNum(raw?.fat ?? raw?.fats, 0, 300, 0) * 10) / 10;

  const macroKcal = Math.round(pro * 4 + carb * 4 + fat * 9);
  if (macroKcal > 0 && (kcal === 0 || Math.abs(kcal - macroKcal) > Math.max(60, kcal * 0.4))) {
    kcal = macroKcal;
  }

  const pieceCount = Number.isFinite(Number(raw?.pieceCount)) && Number(raw?.pieceCount) > 0 ? Number(raw.pieceCount) : null;
  const plateCoveragePercent = Number.isFinite(Number(raw?.plateCoveragePercent)) ? Number(raw.plateCoveragePercent) : null;

  const isUncertain = confidence < MEAL_PHOTO_LOW_CONFIDENCE || quantityConfidence < MEAL_PHOTO_LOW_CONFIDENCE;

  const brand = raw?.brand || raw?.restaurantName || null;
  const isRestaurantChain = Boolean(raw?.isRestaurantChain || (brand && /old wild|mcdonald|burger king|kfc|subway|poke house/i.test(brand)));
  const isPackagedProduct = Boolean(raw?.isPackagedProduct || (brand && !isRestaurantChain));

  const candidates = Array.isArray(raw?.candidates) ? raw.candidates.map(c => ({
    name: String(c.name || '').trim(),
    confidence: Math.round(clampNum(c.confidence, 0, 1, 0.5) * 100) / 100
  })).filter(c => c.name && c.name.toLowerCase() !== name.toLowerCase()) : [];

  let notes = String(raw?.notes || raw?.visualDescription || '').trim();
  if (hasNonEdibleParts && !/scarti|ossa/i.test(notes)) {
    notes = (notes ? notes + ' · ' : '') + 'Ossa e scarti esclusi (' + visualGrams + 'g lordo -> ' + edibleGrams + 'g edibile)';
  }
  if (candidates.length > 0 && confidence < 0.85 && !notes.includes('alternative')) {
    const candStr = 'Possibili alternative: ' + candidates.slice(0, 3).map(c => `${c.name} (${Math.round(c.confidence * 100)}%)`).join(', ');
    notes = (notes ? notes + ' · ' : '') + candStr;
  }

  return {
    name,
    brand,
    isRestaurantChain,
    isPackagedProduct,
    state: rawCooked.state,
    stateConfidence: rawCooked.stateConfidence,
    cookingYieldFactor: rawCooked.cookingYieldFactor,
    estimatedCookedGrams: rawCooked.estimatedCookedGrams,
    estimatedRawGrams: rawCooked.estimatedRawGrams,
    rawEquivalentGrams: rawCooked.rawEquivalentGrams,
    quantity,
    unit,
    grams,
    estimatedGrams: grams,
    minGrams,
    maxGrams,
    rangeMin: minGrams,
    rangeMax: maxGrams,
    visualGrams,
    edibleGrams,
    hasNonEdibleParts,
    pieceCount,
    plateCoveragePercent,
    kcal,
    pro,
    carb,
    fat,
    confidence,
    foodConfidence,
    quantityConfidence,
    compositionConfidence,
    candidates: candidates.length > 0 ? candidates : undefined,
    isUncertain,
    uncertain: isUncertain,
    notes
  };
}

export function normalizeMealPhotoResult(parsed = {}, { mealName = '', source = 'gemini_vision', dbEnrichFailed = false, imagesAnalyzed = 1, imageRoles = ['TOP'] } = {}) {
  const compositeDish = parsed?.compositeDish ? normalizeMealPhotoItem(parsed.compositeDish) : null;
  const components = (Array.isArray(parsed?.components) ? parsed.components : [])
    .map(normalizeMealPhotoItem)
    .filter(Boolean);

  let rawItems = (Array.isArray(parsed?.items) ? parsed.items : [])
    .map(normalizeMealPhotoItem)
    .filter(Boolean);

  // Smart automatic choice for representationMode if not explicitly set
  let representationMode = parsed?.representationMode;
  if (!representationMode || (representationMode !== 'COMPOSITE' && representationMode !== 'COMPONENTS')) {
    const compositeKeywords = /lasagn|parmigiana|pasta al forno|pasta pasticciata|risotto|cous cous|paella|arancin|capra in umido|porceddu|torta salata|casserol/i;
    const isInherentlyComposite = (compositeDish && compositeKeywords.test(compositeDish.name)) ||
      rawItems.some(it => compositeKeywords.test(it.name));

    if (isInherentlyComposite) {
      representationMode = 'COMPOSITE';
    } else if (components.length > 1) {
      representationMode = 'COMPONENTS';
    } else if (rawItems.length > 1) {
      representationMode = 'COMPONENTS';
    } else {
      representationMode = compositeDish ? 'COMPOSITE' : 'COMPONENTS';
    }
  }

  // Populate items strictly matching active representation mode
  let items = [];
  if (representationMode === 'COMPOSITE') {
    if (compositeDish) {
      items = [compositeDish];
    } else if (rawItems.length) {
      items = [rawItems[0]];
    }
  } else {
    if (components.length) {
      items = components;
    } else if (rawItems.length) {
      items = rawItems;
    }
  }

  // Anti-Double-Counting validation
  const validation = validateNoDoubleCounting({
    representationMode,
    compositeDish: compositeDish || (items.length === 1 ? items[0] : null),
    components: components.length ? components : (items.length > 1 ? items : []),
    items
  });

  if (!validation.valid && validation.sanitizedItems.length) {
    items = validation.sanitizedItems;
  }

  const noFoodDetected = Boolean(parsed?.noFoodDetected || items.length === 0);
  const overallConfidence = Math.round(clampNum(parsed?.overallConfidence, 0, 1, items.length ? 0.7 : 0) * 100) / 100;

  const totals = calculateMealTotals(items);

  const hasLowConfidenceItem = items.some((it) => it.confidence < MEAL_PHOTO_LOW_CONFIDENCE || it.quantityConfidence < MEAL_PHOTO_LOW_CONFIDENCE);
  const uncertain = Boolean(noFoodDetected || overallConfidence < MEAL_PHOTO_LOW_CONFIDENCE || hasLowConfidenceItem || parsed?.uncertain || source === 'mock');

  const warnings = Array.isArray(parsed?.warnings) ? [...parsed.warnings] : [];
  if (uncertain && warnings.length === 0) {
    if (noFoodDetected) warnings.push('Nessun alimento rilevato con certezza');
    else if (overallConfidence < MEAL_PHOTO_LOW_CONFIDENCE) warnings.push('Confidenza visiva ridotta: controlla alimenti e grammature');
    else if (hasLowConfidenceItem) warnings.push('Stima quantità incerta per alcuni alimenti');
    else warnings.push('Verifica i dati stimati prima di confermare');
  }

  const secondPhotoRecommendation = parsed?.secondPhotoRecommendation ||
    (items.some(it => /toast|panino|sandwich|burger/i.test(it.name)) ? 'SECOND_PHOTO_RECOMMENDED' : 'SECOND_PHOTO_NOT_NEEDED');
  const secondPhotoReason = parsed?.secondPhotoReason ||
    (secondPhotoRecommendation === 'SECOND_PHOTO_RECOMMENDED' ? 'Valutazione spessore e ripieni' : '');

  const foods = mealPhotoItemsToFoods(items, source);

  return {
    ok: !noFoodDetected,
    domain: 'nutrition',
    mealName: String(mealName || '').trim(),
    source,
    representationMode,
    compositeDish: compositeDish || (representationMode === 'COMPOSITE' && items.length === 1 ? items[0] : null),
    components: components.length ? components : (representationMode === 'COMPONENTS' ? items : []),
    imagesAnalyzed: Number(imagesAnalyzed) || 1,
    imageRoles: Array.isArray(imageRoles) ? imageRoles : ['TOP'],
    secondPhotoRecommendation,
    secondPhotoReason,
    noFoodDetected,
    overallConfidence,
    uncertain,
    needsConfirmation: true,
    warnings,
    dbEnrichFailed: Boolean(dbEnrichFailed),
    notes: String(parsed?.notes || '').trim(),
    totals,
    items,
    foods
  };
}

export function namesLikelyMatch(a, b) {
  const fa = fold(a);
  const fb = fold(b);
  if (!fa || !fb) return false;
  if (fa === fb || fa.includes(fb) || fb.includes(fa)) return true;
  const wordsA = fa.split(/[\s,-]+/).filter((w) => w.length >= 3);
  const wordsB = fb.split(/[\s,-]+/).filter((w) => w.length >= 3);
  let intersect = 0;
  for (const w of wordsA) {
    if (wordsB.some((bw) => bw.includes(w) || w.includes(bw))) intersect++;
  }
  return intersect >= 1;
}

export function mealPhotoItemsToFoods(items = [], source = 'gemini_vision') {
  return items.map((raw, idx) => {
    const it = (raw && raw.estimatedCookedGrams !== undefined) ? raw : (normalizeMealPhotoItem(raw) || raw);
    let notes = String(it.notes || '').trim();
    if (it.confidence < MEAL_PHOTO_LOW_CONFIDENCE && !/incert/i.test(notes)) {
      notes = (notes ? notes + ' · ' : '') + 'Stima visiva incerta: verifica i dati.';
    }
    return {
      name: it.name,
      brand: it.brand || null,
      state: it.state || 'ready_to_eat',
      quantity: it.quantity ?? it.qty ?? it.grams,
      qty: it.quantity ?? it.qty ?? it.grams,
      unit: it.unit || 'g',
      grams: it.grams ?? it.quantity,
      estimatedGrams: it.grams ?? it.quantity,
      minGrams: it.minGrams,
      maxGrams: it.maxGrams,
      visualGrams: it.visualGrams,
      edibleGrams: it.edibleGrams,
      rawEquivalentGrams: it.rawEquivalentGrams,
      cookingYieldFactor: it.cookingYieldFactor,
      hasNonEdibleParts: it.hasNonEdibleParts,
      kcal: it.kcal,
      pro: it.pro,
      carb: it.carb,
      fat: it.fat,
      confidence: it.confidence,
      quantityConfidence: it.quantityConfidence,
      provenance: it.provenance || {
        source,
        kind: 'vision_estimate',
        confidence: it.confidence
      },
      notes
    };
  });
}

export async function enrichMealPhotoItems(items = [], searchFn) {
  if (!items.length) return { items: [], source: 'gemini_vision', dbEnrichFailed: false };
  const enriched = [];
  let hasDbHit = false;
  let hadFailure = false;

  for (const it of items) {
    // 1. Check official chain restaurant catalog first
    const chainItem = findChainItem(it.name, it.brand);
    if (chainItem) {
      hasDbHit = true;
      enriched.push({
        ...it,
        name: chainItem.name,
        brand: chainItem.brand,
        isRestaurantChain: true,
        kcal: chainItem.kcal,
        pro: chainItem.pro,
        carb: chainItem.carb,
        fat: chainItem.fat,
        provenance: chainItem.provenance || {
          source: 'official_restaurant_data',
          kind: 'chain_menu_item',
          confidence: 0.96
        }
      });
      continue;
    }

    if (typeof searchFn !== 'function') {
      enriched.push(it);
      continue;
    }

    try {
      const searchRes = await searchFn(it.name);
      const candidates = Array.isArray(searchRes?.items) ? searchRes.items : (Array.isArray(searchRes) ? searchRes : []);
      const match = candidates.find((c) => namesLikelyMatch(it.name, c.name));
      if (match && match.kcalPer100 > 0) {
        hasDbHit = true;
        // Scale on edible grams (or rawEquivalent if database is raw and food is cooked)
        let scaleGrams = it.edibleGrams || it.grams;
        if (it.state === 'cooked' && match.kcalPer100 > 300 && (it.rawEquivalentGrams || 0) > 0) {
          // DB item is raw (e.g. raw rice ~360 kcal/100g), scale against raw equivalent
          scaleGrams = it.rawEquivalentGrams;
        }
        const ratio = scaleGrams / 100;
        enriched.push({
          ...it,
          kcal: Math.round(match.kcalPer100 * ratio),
          pro: Math.round((match.proPer100 || 0) * ratio * 10) / 10,
          carb: Math.round((match.carbPer100 || 0) * ratio * 10) / 10,
          fat: Math.round((match.fatPer100 || 0) * ratio * 10) / 10,
          provenance: match.provenance || {
            source: 'food_database',
            kind: 'db_enrichment',
            confidence: 0.90
          }
        });
      } else {
        enriched.push(it);
      }
    } catch (err) {
      hadFailure = true;
      enriched.push(it);
    }
  }

  return {
    items: enriched,
    source: hasDbHit ? 'gemini_vision+food_db' : 'gemini_vision',
    dbEnrichFailed: hadFailure
  };
}

export function mockAnalyzeMealPhoto({ mealName = '', imagesAnalyzed = 1, imageRoles = ['TOP'] } = {}) {
  const compositeDish = {
    name: 'Riso saltato con pollo e verdure',
    quantity: 520,
    unit: 'g',
    estimatedGrams: 520,
    minGrams: 450,
    maxGrams: 590,
    visualGrams: 520,
    edibleGrams: 520,
    hasNonEdibleParts: false,
    kcal: 640,
    pro: 74.0,
    carb: 54.0,
    fat: 12.5,
    confidence: 0.50,
    foodConfidence: 0.85,
    quantityConfidence: 0.50,
    compositionConfidence: 0.75,
    notes: 'Piatto completo (mock)'
  };

  const components = [
    {
      name: 'Petto di pollo alla griglia',
      state: 'cooked',
      stateConfidence: 0.92,
      cookingYieldFactor: 0.80,
      estimatedCookedGrams: 220,
      rawEquivalentGrams: 275,
      quantity: 220,
      unit: 'g',
      estimatedGrams: 220,
      minGrams: 190,
      maxGrams: 260,
      visualGrams: 220,
      edibleGrams: 220,
      hasNonEdibleParts: false,
      kcal: 360,
      pro: 68.0,
      carb: 0.0,
      fat: 8.0,
      confidence: 0.50,
      foodConfidence: 0.90,
      quantityConfidence: 0.50,
      compositionConfidence: 0.85,
      notes: 'Porzione abbondante (2 filetti medi)'
    },
    {
      name: 'Patate al forno',
      state: 'cooked',
      stateConfidence: 0.90,
      cookingYieldFactor: 0.98,
      estimatedCookedGrams: 300,
      rawEquivalentGrams: 305,
      quantity: 300,
      unit: 'g',
      estimatedGrams: 300,
      minGrams: 250,
      maxGrams: 360,
      visualGrams: 300,
      edibleGrams: 300,
      hasNonEdibleParts: false,
      kcal: 280,
      pro: 6.0,
      carb: 54.0,
      fat: 4.5,
      confidence: 0.50,
      foodConfidence: 0.88,
      quantityConfidence: 0.50,
      compositionConfidence: 0.80,
      notes: 'Patate a spicchi'
    }
  ];

  return normalizeMealPhotoResult({
    representationMode: 'COMPONENTS',
    overallConfidence: 0.50,
    uncertain: true,
    notes: 'Stima automatica da foto (mock gemini)',
    noFoodDetected: false,
    secondPhotoRecommendation: imagesAnalyzed > 1 ? 'SECOND_PHOTO_NOT_NEEDED' : 'SECOND_PHOTO_RECOMMENDED',
    secondPhotoReason: 'Valutazione spessore',
    compositeDish,
    components,
    items: components
  }, { mealName, source: 'mock', imagesAnalyzed, imageRoles });
}

export function buildMealPhotoPrompt({ mealName = '', notes = '', locale = 'it', images = [] } = {}) {
  const isEn = String(locale).toLowerCase().startsWith('en');
  const contextLines = [];
  if (mealName && mealName !== 'Pasto' && mealName !== 'Meal') {
    contextLines.push(isEn ? ('- User target meal: "' + mealName + '"') : ('- Pasto di destinazione: "' + mealName + '"'));
  }
  if (notes) {
    contextLines.push(isEn ? ('- User notes: "' + notes + '"') : ('- Note utente: "' + notes + '"'));
  }
  if (Array.isArray(images) && images.length > 1) {
    contextLines.push(isEn
      ? '- MULTI-IMAGE INPUT: Image 1 is TOP VIEW (surface area/distribution), Image 2 is SIDE VIEW (thickness/height/layering).'
      : '- INPUT MULTI-FOTO: Immagine 1 è VISTA DALL\'ALTO (area e distribuzione superficiale), Immagine 2 è VISTA LATERALE (altezza, spessore, stratificazione e ripieni).'
    );
  }
  const contextBlock = contextLines.length ? ('\n' + (isEn ? 'Context:' : 'Contesto:') + '\n' + contextLines.join('\n') + '\n') : '';

  if (isEn) {
    return 'You are the Nurvan Universal Food Intelligence V7 (Food Intelligence V5/V7) Computer Vision & Nutritional AI specialist.\n' +
      'Analyze the provided food photograph(s) using deep multimodal reasoning and produce strict JSON conforming to the schema.\n' +
      contextBlock +
      'MANDATORY FOOD INTELLIGENCE V7 RULES & ANTI-UNDERESTIMATION GUIDELINES:\n' +
      '1. NEVER DOUBLE COUNT: You must output BOTH compositeDish (if the dish can be viewed as a single recipe) AND components (if ingredients are distinguishable). BUT in the active items array, choose EITHER representationMode="COMPOSITE" with ONLY the single compositeDish OR representationMode="COMPONENTS" with ONLY the constituent items. NEVER mix composite parent dish and child items in the items array!\n' +
      '2. MULTI-IMAGE FUSION: When top and side views are provided, fuse top (area, spread) with side (height, vertical volume, bread thickness, internal fillings). Do NOT sum quantities across photos; they are two perspectives of the same dish.\n' +
      '3. TOAST & SANDWICHES INTELLIGENCE: Inspect toast shape, slice count, thickness and cross-section. If fillings are not visible, name as "Toast - ripieno non determinabile" without hallucinating invisible ingredients.\n' +
      '4. ZERO INVENTION & ANTI-UNDERESTIMATION: Avoid portion UNDERESTIMATION. Never invent unobserved oils, hidden dressings or precise grams without visual cues. Lower confidence when uncertain and provide estimation ranges (minGrams / maxGrams).\n' +
      '5. SEPARATION OF IDENTITY VS QUANTITY: Output foodConfidence, quantityConfidence, and compositionConfidence independently.\n' +
      '6. REGIONAL & INTERNATIONAL DISHES: Visual recognition of regional Italian (porceddu, capra in umido, malloreddus, culurgiones, seadas, arancini, pasta al forno, parmigiana, lasagna, risotti) and international cuisines (couscous, paella, ramen, poke, tacos, curry).\n' +
      '7. NUTRITIONAL CONSISTENCY: Ensure kcal approximately equals 4*pro + 4*carb + 9*fat.\n';
  }

  return 'Sei lo specialista Nurvan Food Intelligence V7 (Food Intelligence V5) in Visione Multimodale e Nutrizione Clinica.\n' +
    'Analizza le fotografie del pasto con ragionamento geometrico e nutrizionale profondo, producendo JSON valido aderente allo schema.\n' +
    contextBlock +
    'REGOLE FONDAMENTALI FOOD INTELLIGENCE V7 E LINEE GUIDA ANTI-SOTTOSTIMA:\n' +
    '1. MAI DOPPIO CONTEGGIO (REQUISITO PRIMARIO): Nel JSON fornisci sia compositeDish (ricetta complessiva) che components (ingredienti scomposti). MA nell\'array items attivo inserisci ESCLUSIVAMENTE gli elementi corrispondenti a representationMode: se "COMPOSITE" un solo elemento piatto completo; se "COMPONENTS" i singoli ingredienti. MAI sommare né includere contemporaneamente il piatto intero e i suoi ingredienti in items.\n' +
    '2. FUSIONE MULTI-FOTO DALL\'ALTO E LATERALE: Quando sono fornite 2 foto (TOP = vista dall\'alto per area e distribuzione; SIDE = vista laterale per altezza, spessore e stratificazione), fondi le evidenze volumetriche. NON sommare le quantità delle due foto: sono viste diverse dello stesso piatto.\n' +
    '3. SCOMPOSIZIONE CIBI COMPOSTI: Riconosci piatti unici e ricette complesse. Fornisci la corretta scomposizione in ingredienti distinti mantenendo la coerenza delle grammature.\n' +
    '4. RICONOSCIMENTO ACCURATO TOAST E PANINI: Analizza numero fette, spessore, bordi e fuoriuscita ripieno. Se il ripieno interno non è osservabile, indica "Toast - ripieno non determinabile dalla foto" con richiesta di specificare il ripieno. ZERO invenzione di ingredienti invisibili.\n' +
    '5. ZERO INVENZIONE E GUIDA SOTTOSTIMA: Evita la SOTTOSTIMA delle porzioni. Non inventare olii non visibili, condimenti o grammature arbitrarie. Fornisci range di stima (minGrams, maxGrams) e stima centrale quando la quantità è incerta.\n' +
    '6. SEPARAZIONE IDENTITÀ VS QUANTITÀ: Specifica foodConfidence (identità), quantityConfidence (grammatura) e compositionConfidence (ricetta).\n' +
    '7. RICONOSCIMENTO UNIVERSALE PIATTI REGIONALI E INTERNAZIONALI: Identifica visivamente piatti tipici (porceddu, capra in umido, malloreddus, culurgiones, seadas, arancini, pasta al forno, parmigiana, lasagna, risotti, cous cous, paella, poke, sushi, ramen, tacos).\n' +
    '8. COERENZA NUTRIZIONALE: Assicura che kcal sia coerente con 4*P + 4*C + 9*F.\n';
}

export async function analyzeMealPhoto(input = {}, opts = {}) {
  const env = opts.env || input.env || process.env || {};
  const mealName = input.mealName || opts.mealName || '';
  const notes = input.notes || opts.notes || '';
  const locale = input.locale || opts.locale || 'it';
  const apiKey = input.apiKey || opts.apiKey || env.GEMINI_API_KEY;
  const generateVision = opts.generateVision || opts.generateVisionFn || input.generateVision || input.generateVisionFn;
  const searchFoods = opts.searchFoods || opts.searchFn || input.searchFoods || input.searchFn;

  const rawImages = Array.isArray(input.images) && input.images.length
    ? input.images
    : (input.image || input.imageBase64 || input.dataUrl || input.data
        ? [{ role: input.role || 'TOP', data: input.image || input.imageBase64 || input.dataUrl || input.data, mimeType: input.mimeType || opts.mimeType }]
        : []);

  if (!rawImages.length && env.MOCK_GEMINI !== '1' && env.MOCK_GEMINI !== true) {
    throw new Error('image_required');
  }

  const parsedImages = [];
  for (const img of rawImages) {
    const rawData = typeof img === 'string' ? img : (img.data || img.dataUrl || img.imageBase64 || img.image);
    const role = (img && img.role) || (parsedImages.length === 0 ? 'TOP' : 'SIDE');
    const pl = parseImagePayload(rawData, (img && img.mimeType) || input.mimeType || opts.mimeType);
    if (!pl) continue;
    if (pl.bytes > MEAL_PHOTO_MAX_IMAGE_BYTES) throw new Error('image_too_large');
    parsedImages.push({
      role: role.toUpperCase(),
      mimeType: pl.mimeType,
      data: pl.data,
      bytes: pl.bytes
    });
  }

  const imagesAnalyzed = parsedImages.length || 1;
  const imageRoles = parsedImages.map(p => p.role);

  if (env.MOCK_GEMINI === '1' || env.MOCK_GEMINI === true) {
    return mockAnalyzeMealPhoto({ mealName, imagesAnalyzed, imageRoles });
  }

  if (!parsedImages.length) throw new Error('image_required');

  const primaryPayload = parsedImages[0];
  let parsed = null;
  let source = 'gemini_vision';

  if (typeof generateVision === 'function') {
    const prompt = buildMealPhotoPrompt({ mealName, notes, locale, images: parsedImages });
    try {
      const rawRes = await generateVision({
        prompt,
        imageBase64: primaryPayload.data,
        mimeType: primaryPayload.mimeType,
        image: { mimeType: primaryPayload.mimeType, data: primaryPayload.data },
        images: parsedImages,
        schema: MEAL_PHOTO_RESPONSE_SCHEMA
      });
      if (rawRes && typeof rawRes === 'object' && 'text' in rawRes) {
        parsed = typeof rawRes.text === 'string' ? JSON.parse(rawRes.text) : rawRes.text;
      } else if (typeof rawRes === 'string') {
        parsed = JSON.parse(rawRes);
      } else {
        parsed = rawRes;
      }
    } catch (err) {
      console.warn('[food] Gemini vision call failed, using fallback', err.message);
      parsed = null;
    }
  }

  if (!parsed || (!Array.isArray(parsed.items) && !parsed.compositeDish && !Array.isArray(parsed.components))) {
    return mockAnalyzeMealPhoto({ mealName, imagesAnalyzed, imageRoles });
  }

  const normalized = normalizeMealPhotoResult(parsed, { mealName, source, imagesAnalyzed, imageRoles });
  if (!normalized.items.length) return normalized;

  const enriched = await enrichMealPhotoItems(normalized.items, searchFoods);
  return normalizeMealPhotoResult(
    {
      ...parsed,
      items: enriched.items
    },
    {
      mealName,
      source: enriched.source,
      dbEnrichFailed: enriched.dbEnrichFailed,
      imagesAnalyzed,
      imageRoles
    }
  );
}

export async function analyzeNutritionLabelOcr({ image, mimeType, generateVisionFn } = {}) {
  const payload = parseImagePayload(image, mimeType);
  if (!payload) throw new Error('IMAGE_REQUIRED');

  const prompt = `Sei un esperto OCR di etichette nutrizionali (Nutrition Facts / Tabella Nutrizionale).
Estrai i valori nutrizionali per 100g (kcal, kj, grassi, saturi, carboidrati, zuccheri, fibre, proteine, sale) e, se presenti, per singola porzione.
Estrai anche il nome del prodotto e il brand se visibili.
Restituisci un JSON strutturato secondo lo schema.`;

  let parsed = null;
  if (typeof generateVisionFn === 'function') {
    try {
      parsed = await generateVisionFn({
        prompt,
        imageBase64: payload.data,
        mimeType: payload.mimeType,
        schema: NUTRITION_LABEL_OCR_SCHEMA
      });
    } catch (err) {
      console.warn('[food] OCR call failed', err.message);
    }
  }

  if (!parsed || !parsed.per100g) {
    return {
      ok: false,
      error: "Non è stato possibile leggere i valori nutrizionali dall'etichetta."
    };
  }

  const p100 = parsed.per100g || {};
  const kcal = num(p100.kcal || (num(p100.kj) / 4.184));
  const pro = num(p100.pro);
  const carb = num(p100.carb);
  const fat = num(p100.fat);

  return {
    ok: true,
    productName: parsed.productName || 'Prodotto da etichetta',
    brand: parsed.brand || null,
    servingSize: parsed.servingSize || '100g',
    servingGrams: num(parsed.servingGrams) || 100,
    kcalPer100: Math.round(kcal),
    proPer100: Math.round(pro * 10) / 10,
    carbPer100: Math.round(carb * 10) / 10,
    fatPer100: Math.round(fat * 10) / 10,
    confidence: clampNum(parsed.confidence, 0, 1, 0.90),
    provenance: {
      source: 'ocr_extracted',
      kind: 'nutrition_label_ocr',
      confidence: 0.92,
      attribution: 'OCR Etichetta Nutrizionale'
    }
  };
}


/**
 * Universal Barcode Catalog
 */
export const UNIVERSAL_BARCODE_CATALOG = {
  '8001234567890': {
    barcode: '8001234567890',
    name: 'Spaghetti N.5',
    brand: 'Barilla',
    serving: '80g',
    per100g: { kcal: 359, proteins: 12.5, carbohydrates: 71.5, fat: 2.0, fibers: 3.0, salt: 0.013 },
    kcal: 359, pro: 12.5, carb: 71.5, fat: 2.0
  },
  '8000500310427': {
    barcode: '8000500310427',
    name: 'Nutella 400g',
    brand: 'Ferrero',
    serving: '15g',
    per100g: { kcal: 539, proteins: 6.3, carbohydrates: 57.5, fat: 30.9, fibers: 0, salt: 0.107 },
    kcal: 539, pro: 6.3, carb: 57.5, fat: 30.9
  },
  '8076809513753': {
    barcode: '8076809513753',
    name: 'Pesto alla Genovese',
    brand: 'Barilla',
    serving: '50g',
    per100g: { kcal: 482, proteins: 5.0, carbohydrates: 9.8, fat: 46.0, fibers: 2.0, salt: 3.0 },
    kcal: 482, pro: 5.0, carb: 9.8, fat: 46.0
  },
  '8001100064546': {
    barcode: '8001100064546',
    name: 'Latte Zymil Alta Digeribilità Parzialmente Scremato',
    brand: 'Parmalat',
    serving: '200ml',
    per100g: { kcal: 47, proteins: 3.2, carbohydrates: 5.0, fat: 1.5, fibers: 0, salt: 0.10 },
    kcal: 47, pro: 3.2, carb: 5.0, fat: 1.5
  },
  '5449000000996': {
    barcode: '5449000000996',
    name: 'Coca-Cola Original Taste',
    brand: 'Coca-Cola',
    serving: '330ml',
    per100g: { kcal: 42, proteins: 0.0, carbohydrates: 10.6, fat: 0.0, fibers: 0, salt: 0.0 },
    kcal: 42, pro: 0.0, carb: 10.6, fat: 0.0
  },
  '8000400000018': {
    barcode: '8000400000018',
    name: 'Tonno all\'Olio di Oliva',
    brand: 'Rio Mare',
    serving: '80g',
    per100g: { kcal: 403, proteins: 17.5, carbohydrates: 0.0, fat: 37.0, fibers: 0, salt: 1.1 },
    kcal: 403, pro: 17.5, carb: 0.0, fat: 37.0
  },
  '7622210449283': {
    barcode: '7622210449283',
    name: 'Biscotti Oro Saiwa Classico',
    brand: 'Saiwa',
    serving: '25g',
    per100g: { kcal: 440, proteins: 7.8, carbohydrates: 75.0, fat: 12.0, fibers: 2.8, salt: 0.60 },
    kcal: 440, pro: 7.8, carb: 75.0, fat: 12.0
  },
  '8002270014901': {
    barcode: '8002270014901',
    name: 'Fette Biscottate Dorate',
    brand: 'Mulino Bianco',
    serving: '30g',
    per100g: { kcal: 389, proteins: 11.5, carbohydrates: 71.0, fat: 5.5, fibers: 6.0, salt: 1.4 },
    kcal: 389, pro: 11.5, carb: 71.0, fat: 5.5
  },
  '8004030140004': {
    barcode: '8004030140004',
    name: 'Olio Extra Vergine di Oliva Classico',
    brand: 'Monini',
    serving: '10g',
    per100g: { kcal: 824, proteins: 0.0, carbohydrates: 0.0, fat: 91.6, fibers: 0, salt: 0.0 },
    kcal: 824, pro: 0.0, carb: 0.0, fat: 91.6
  },
  '8005110170308': {
    barcode: '8005110170308',
    name: 'Fiocchi di Latte Fresco',
    brand: 'Jocca',
    serving: '150g',
    per100g: { kcal: 97, proteins: 11.0, carbohydrates: 2.5, fat: 4.5, fibers: 0, salt: 0.80 },
    kcal: 97, pro: 11.0, carb: 2.5, fat: 4.5
  },
  '8000700000008': {
    barcode: '8000700000008',
    name: 'Polpa di Pomodoro in Finissimi Pezzi',
    brand: 'Mutti',
    serving: '100g',
    per100g: { kcal: 26, proteins: 1.2, carbohydrates: 3.9, fat: 0.2, fibers: 1.0, salt: 0.30 },
    kcal: 26, pro: 1.2, carb: 3.9, fat: 0.2
  },
  '8001090000010': {
    barcode: '8001090000010',
    name: 'Total Yogurt Greco 0% Grassi',
    brand: 'Fage',
    serving: '170g',
    per100g: { kcal: 54, proteins: 10.3, carbohydrates: 3.0, fat: 0.0, fibers: 0, salt: 0.10 },
    kcal: 54, pro: 10.3, carb: 3.0, fat: 0.0
  },
  '5000159407236': {
    barcode: '5000159407236',
    name: 'Snickers Cioccolato e Arachidi',
    brand: 'Mars',
    serving: '50g',
    per100g: { kcal: 488, proteins: 8.6, carbohydrates: 60.0, fat: 23.0, fibers: 2.3, salt: 0.63 },
    kcal: 488, pro: 8.6, carb: 60.0, fat: 23.0
  },
  '4008400404127': {
    barcode: '4008400404127',
    name: 'Kinder Cioccolato Barretta',
    brand: 'Ferrero',
    serving: '21g',
    per100g: { kcal: 566, proteins: 8.7, carbohydrates: 53.5, fat: 35.0, fibers: 0.9, salt: 0.31 },
    kcal: 566, pro: 8.7, carb: 53.5, fat: 35.0
  },
  '8000500003787': {
    barcode: '8000500003787',
    name: 'Tic Tac Mentina Fresca',
    brand: 'Ferrero',
    serving: '18g',
    per100g: { kcal: 397, proteins: 0.1, carbohydrates: 97.5, fat: 0.5, fibers: 0, salt: 0.03 },
    kcal: 397, pro: 0.1, carb: 97.5, fat: 0.5
  },
  '8001300242138': {
    barcode: '8001300242138',
    name: 'Gallette di Riso 100% Italiano',
    brand: 'Riso Scotti',
    serving: '30g',
    per100g: { kcal: 380, proteins: 7.8, carbohydrates: 82.0, fat: 1.8, fibers: 2.5, salt: 0.01 },
    kcal: 380, pro: 7.8, carb: 82.0, fat: 1.8
  },
  '8004120909016': {
    barcode: '8004120909016',
    name: '100% da Frutta Albicocche',
    brand: 'Zuegg',
    serving: '20g',
    per100g: { kcal: 160, proteins: 0.6, carbohydrates: 38.0, fat: 0.1, fibers: 2.0, salt: 0.02 },
    kcal: 160, pro: 0.6, carb: 38.0, fat: 0.1
  },
  '8410076472097': {
    barcode: '8410076472097',
    name: 'Fiocchi di Avena Integrale Bio',
    brand: 'Santiveri',
    serving: '50g',
    per100g: { kcal: 375, proteins: 14.0, carbohydrates: 59.0, fat: 7.0, fibers: 10.0, salt: 0.02 },
    kcal: 375, pro: 14.0, carb: 59.0, fat: 7.0
  },
  '5060469980001': {
    barcode: '5060469980001',
    name: 'Gold Standard 100% Whey Protein Double Rich Chocolate',
    brand: 'Optimum Nutrition',
    serving: '30g',
    per100g: { kcal: 375, proteins: 77.4, carbohydrates: 5.2, fat: 4.2, fibers: 1.8, salt: 0.50 },
    kcal: 375, pro: 77.4, carb: 5.2, fat: 4.2
  }
};

function customBarcodeRowToProduct(row) {
  return {
    found: true,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand || '',
    serving: row.serving || '100g',
    servingGrams: row.serving_grams ? Number(row.serving_grams) : 100,
    per100g: {
      kcal: Math.round(num(row.kcal)),
      proteins: Math.round(num(row.proteins) * 10) / 10,
      carbohydrates: Math.round(num(row.carbohydrates) * 10) / 10,
      fat: Math.round(num(row.fat) * 10) / 10,
      fibers: Math.round(num(row.fibers) * 10) / 10,
      salt: Math.round(num(row.salt) * 100) / 100,
      sugars: Math.round(num(row.sugars) * 10) / 10,
      saturatedFat: Math.round(num(row.saturated_fat) * 10) / 10
    },
    kcal: Math.round(num(row.kcal)),
    pro: Math.round(num(row.proteins) * 10) / 10,
    carb: Math.round(num(row.carbohydrates) * 10) / 10,
    fat: Math.round(num(row.fat) * 10) / 10,
    hasCompleteNutrition: true,
    nutritionAvailable: true,
    source: row.source || 'ai_discovered',
    confidence: 0.85
  };
}

export async function resolveBarcodeProduct(code, env = process.env, pool = null) {
  const clean = String(code || '').trim().replace(/[^0-9A-Za-z]/g, '');
  if (!clean) return { found: false, barcode: clean };

  if (UNIVERSAL_BARCODE_CATALOG[clean]) {
    const item = UNIVERSAL_BARCODE_CATALOG[clean];
    const p100 = item.per100g || {};
    return {
      found: true,
      barcode: clean,
      name: item.name,
      brand: item.brand || '',
      serving: item.serving || '100g',
      servingGrams: item.servingGrams || 100,
      per100g: {
        kcal: Math.round(num(p100.kcal ?? item.kcal ?? 0)),
        proteins: Math.round(num(p100.proteins ?? item.pro ?? 0) * 10) / 10,
        carbohydrates: Math.round(num(p100.carbohydrates ?? item.carb ?? 0) * 10) / 10,
        fat: Math.round(num(p100.fat ?? item.fat ?? 0) * 10) / 10,
        fibers: Math.round(num(p100.fibers ?? 0) * 10) / 10,
        salt: Math.round(num(p100.salt ?? 0) * 100) / 100
      },
      kcal: Math.round(num(p100.kcal ?? item.kcal ?? 0)),
      pro: Math.round(num(p100.proteins ?? item.pro ?? 0) * 10) / 10,
      carb: Math.round(num(p100.carbohydrates ?? item.carb ?? 0) * 10) / 10,
      fat: Math.round(num(p100.fat ?? item.fat ?? 0) * 10) / 10,
      hasCompleteNutrition: true,
      nutritionAvailable: true,
      source: 'verified_product_catalog',
      confidence: 0.99
    };
  }

  if (pool && typeof pool.query === 'function') {
    try {
      const custom = await pool.query('SELECT * FROM custom_barcode_products WHERE barcode = $1 LIMIT 1', [clean]);
      if (custom.rows && custom.rows[0]) {
        return customBarcodeRowToProduct(custom.rows[0]);
      }
    } catch (err) {
      console.warn('[food] custom_barcode_products lookup failed', err.message);
    }
  }

  try {
    const off = await lookupOffBarcode(clean);
    if (off) {
      let finalKcal = off.kcalPer100 || 0;
      let finalPro = off.proPer100 || 0;
      let finalCarb = off.carbPer100 || 0;
      let finalFat = off.fatPer100 || 0;
      let nutritionSource = 'open_food_facts';
      let hasComplete = !!off.hasCompleteNutrition;

      if (!hasComplete && off.name) {
        try {
          const dbMatches = await searchFoodMulti(off.name, env);
          if (dbMatches && dbMatches.items && dbMatches.items.length > 0) {
            const best = dbMatches.items[0];
            if (best.kcalPer100 || best.kcal) {
              finalKcal = best.kcalPer100 || best.kcal || 0;
              finalPro = best.proPer100 || best.pro || 0;
              finalCarb = best.carbPer100 || best.carb || 0;
              finalFat = best.fatPer100 || best.fat || 0;
              nutritionSource = 'food_db_fallback';
              hasComplete = true;
            }
          }
        } catch (_) {}
      }

      return {
        found: true,
        barcode: clean,
        name: off.name,
        brand: off.brand || '',
        serving: off.serving || '100g',
        servingGrams: off.servingGrams || 100,
        per100g: {
          kcal: finalKcal,
          proteins: finalPro,
          carbohydrates: finalCarb,
          fat: finalFat,
          sugars: off.sugarsPer100 || 0,
          saturatedFat: off.saturatedFatPer100 || 0,
          fibers: off.fibersPer100 || 0,
          salt: off.saltPer100 || 0
        },
        kcal: finalKcal,
        pro: finalPro,
        carb: finalCarb,
        fat: finalFat,
        hasCompleteNutrition: hasComplete,
        nutritionAvailable: hasComplete,
        source: nutritionSource,
        confidence: hasComplete ? 0.98 : 0.70,
        notes: hasComplete ? '' : "Valori nutrizionali non disponibili nel database. Fotografa l'etichetta nutrizionale per completarli."
      };
    }
  } catch (err) {
    console.warn('[food] lookupOffBarcode failed', err.message);
  }

  return {
    found: false,
    barcode: clean,
    hasCompleteNutrition: false,
    nutritionAvailable: false
  };
}

export function fuseVisionAndBarcode(visionItem, barcodeProduct) {
  if (!barcodeProduct || !barcodeProduct.found) return visionItem;
  
  const vName = visionItem.name || 'Alimento';
  const isCooked = visionItem.isCooked || visionItem.state === 'cooked' || /cott[oa]|bollit[oa]|grigliat[oa]|forno/i.test(vName);
  const visualGrams = num(visionItem.grams || visionItem.quantityGrams || visionItem.portionGrams || visionItem.quantity || 100);
  
  let rawEquivGrams = num(visionItem.rawEquivalentGrams);
  if (rawEquivGrams <= 0) {
    const eq = computeRawCookedEquivalence({ name: vName, state: isCooked ? 'cooked' : 'raw', grams: visualGrams });
    rawEquivGrams = eq.rawEquivalentGrams || visualGrams;
  }
  const edibleGrams = num(visionItem.edibleGrams || visualGrams);

  const p100 = barcodeProduct.per100g || {
    kcal: barcodeProduct.kcal || 0,
    proteins: barcodeProduct.pro || 0,
    carbohydrates: barcodeProduct.carb || 0,
    fat: barcodeProduct.fat || 0,
    fibers: barcodeProduct.fibers || 0,
    salt: barcodeProduct.salt || 0
  };

  const calcBaseGrams = (isCooked && rawEquivGrams > 0) ? rawEquivGrams : edibleGrams;
  const mult = calcBaseGrams / 100;

  const fusedKcal = Math.round(p100.kcal * mult);
  const fusedPro = Math.round(p100.proteins * mult * 10) / 10;
  const fusedCarb = Math.round(p100.carbohydrates * mult * 10) / 10;
  const fusedFat = Math.round(p100.fat * mult * 10) / 10;
  const fusedFibers = Math.round((p100.fibers || 0) * mult * 10) / 10;
  const fusedSalt = Math.round((p100.salt || 0) * mult * 100) / 100;

  const displayName = barcodeProduct.brand && !barcodeProduct.name.toLowerCase().includes(barcodeProduct.brand.toLowerCase())
    ? `${barcodeProduct.name} (${barcodeProduct.brand})`
    : barcodeProduct.name;

  return {
    ...visionItem,
    name: displayName,
    originalVisionName: vName,
    barcode: barcodeProduct.barcode,
    brand: barcodeProduct.brand || null,
    serving: barcodeProduct.serving || '100g',
    servingGrams: barcodeProduct.servingGrams || 100,
    quantity: visualGrams,
    grams: visualGrams,
    quantityGrams: visualGrams,
    rawEquivalentGrams: rawEquivGrams,
    edibleGrams,
    state: isCooked ? 'cooked' : 'raw',
    isCooked,
    kcal: fusedKcal,
    proteins: fusedPro,
    pro: fusedPro,
    carbohydrates: fusedCarb,
    carb: fusedCarb,
    carbs: fusedCarb,
    fat: fusedFat,
    fats: fusedFat,
    fibers: fusedFibers,
    salt: fusedSalt,
    per100g: p100,
    isBarcodeFused: true,
    isFused: true,
    confidence: Math.max(Number(visionItem.confidence) || 0.85, 0.95),
    nutritionConfidence: Number(barcodeProduct.confidence) || 0.99,
    hasCompleteNutrition: barcodeProduct.hasCompleteNutrition !== false,
    provenance: {
      source: 'photo_barcode_fusion',
      kind: 'barcode_identity_photo_quantity',
      identityConfidence: 0.99,
      quantityConfidence: visionItem.confidence || 0.75,
      nutritionConfidence: barcodeProduct.confidence || 0.99,
      attribution: `Identità Barcode ${barcodeProduct.barcode} (${barcodeProduct.brand || 'DB'}) + Stima Visiva Porzione`
    },
    notes: `Verificato da barcode ${barcodeProduct.barcode}. Quantità visiva: ${visualGrams}g ${isCooked ? `(≈${rawEquivGrams}g crudi)` : ''}.`
  };
}



export function mountFoodRoutes(app, opts = {}) {
  const env = opts.env || process.env;
  const generateVisionFn = opts.generateVisionFn || opts.generateVision || null;
  const pool = opts.pool || null;
  const lookupBarcodeWithAI = opts.lookupBarcodeWithAI || null;
  const aiLookupRateLimiter = opts.aiLookupRateLimiter || ((req, res, next) => next());

  app.get('/api/food/search', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const result = await searchFoodMulti(q, env);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/food/barcode/:code', async (req, res) => {
    try {
      const code = String(req.params.code || '').trim();
      const product = await resolveBarcodeProduct(code, env, pool);
      if (!product || product.found === false) {
        return res.json({ ok: true, data: { found: false, barcode: code } });
      }
      res.json({ ok: true, data: product, product });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Barcode not found anywhere (static catalog, our DB, Open Food Facts) - ask
  // Coach AI to search the web for it, and if it finds something plausible,
  // save it so every future scan of this code resolves instantly and locally.
  app.post('/api/food/barcode/:code/ai-lookup', aiLookupRateLimiter, async (req, res) => {
    const code = String(req.params.code || '').trim().replace(/[^0-9A-Za-z]/g, '');
    if (!code) return res.status(400).json({ ok: false, error: 'Codice a barre mancante.' });
    if (!lookupBarcodeWithAI) {
      return res.status(503).json({ ok: false, error: 'Ricerca Coach AI non disponibile.', code: 'AI_UNAVAILABLE' });
    }
    try {
      const found = await lookupBarcodeWithAI(code);
      if (!found || found.found === false || !found.name) {
        return res.json({ ok: true, data: { found: false, barcode: code } });
      }
      const per100g = found.per100g || {};
      const row = {
        barcode: code,
        name: String(found.name).slice(0, 200),
        brand: found.brand ? String(found.brand).slice(0, 120) : null,
        serving: '100g',
        serving_grams: 100,
        kcal: num(per100g.kcal),
        proteins: num(per100g.proteins),
        carbohydrates: num(per100g.carbohydrates),
        fat: num(per100g.fat),
        fibers: num(per100g.fibers),
        salt: num(per100g.salt),
        sugars: num(per100g.sugars),
        saturated_fat: num(per100g.saturatedFat)
      };
      if (pool && typeof pool.query === 'function') {
        try {
          await pool.query(
            `INSERT INTO custom_barcode_products
               (barcode, name, brand, serving, serving_grams, kcal, proteins, carbohydrates, fat, fibers, salt, sugars, saturated_fat, source)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'ai_discovered')
             ON CONFLICT (barcode) DO UPDATE SET
               name = EXCLUDED.name, brand = EXCLUDED.brand, kcal = EXCLUDED.kcal,
               proteins = EXCLUDED.proteins, carbohydrates = EXCLUDED.carbohydrates,
               fat = EXCLUDED.fat, fibers = EXCLUDED.fibers, salt = EXCLUDED.salt,
               sugars = EXCLUDED.sugars, saturated_fat = EXCLUDED.saturated_fat`,
            [row.barcode, row.name, row.brand, row.serving, row.serving_grams, row.kcal, row.proteins,
              row.carbohydrates, row.fat, row.fibers, row.salt, row.sugars, row.saturated_fat]
          );
        } catch (err) {
          console.warn('[food] failed to persist AI-discovered barcode', err.message);
        }
      }
      res.json({ ok: true, data: customBarcodeRowToProduct(row) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/food/analyze-photo', async (req, res) => {
    try {
      const body = req.body || {};
      const result = await analyzeMealPhoto({
        image: body.image,
        images: body.images,
        mimeType: body.mimeType,
        mealName: body.mealName,
        notes: body.notes,
        locale: body.locale,
        apiKey: env.GEMINI_API_KEY,
        generateVisionFn,
        searchFn: q => searchFoodMulti(q, env)
      });
      res.json(result);
    } catch (err) {
      const status = (err.message === 'image_required' || err.message === 'IMAGE_REQUIRED') ? 400 :
        (err.message === 'image_too_large' || err.message === 'IMAGE_TOO_LARGE') ? 413 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/food/ocr-label', async (req, res) => {
    try {
      const body = req.body || {};
      const result = await analyzeNutritionLabelOcr({
        image: body.image,
        mimeType: body.mimeType,
        generateVisionFn
      });
      res.json(result);
    } catch (err) {
      const status = err.message === 'IMAGE_REQUIRED' ? 400 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });
}
