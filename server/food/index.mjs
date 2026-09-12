/**
 * Multi-source food search proxy (USDA FDC + Open Food Facts).
 * Keys stay server-side. OFF results are tagged ODbL and must not be merged into proprietary DBs.
 */

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';
const OFF_BASE = 'https://world.openfoodfacts.org';

function fold(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function nutrientFromFdc(food, id) {
  const list = food.foodNutrients || [];
  const hit = list.find((n) => Number(n.nutrientNumber || n.nutrient?.number || n.nutrientId) === id || n.nutrient?.id === id);
  return hit ? Number(hit.value ?? hit.amount) || 0 : 0;
}

function mapUsdaFood(food) {
  // Energy kcal often nutrient 1008; protein 1003; carb 1005; fat 1004
  const kcal = nutrientFromFdc(food, 1008) || nutrientFromFdc(food, 208) || 0;
  const pro = nutrientFromFdc(food, 1003) || nutrientFromFdc(food, 203) || 0;
  const carb = nutrientFromFdc(food, 1005) || nutrientFromFdc(food, 205) || 0;
  const fat = nutrientFromFdc(food, 1004) || nutrientFromFdc(food, 204) || 0;
  return {
    id: 'usda_' + food.fdcId,
    name: food.description || food.lowercaseDescription || 'USDA food',
    brand: food.brandOwner || food.brandName || null,
    barcode: food.gtinUpc || null,
    category: food.foodCategory || food.dataType || 'USDA',
    kcalPer100: kcal,
    proPer100: pro,
    carbPer100: carb,
    fatPer100: fat,
    unit: 'g',
    provenance: {
      source: 'usda_fdc',
      sourceId: String(food.fdcId),
      kind: food.dataType === 'Branded' ? 'label' : 'generic',
      confidence: food.dataType === 'Foundation' || food.dataType === 'SR Legacy' ? 0.9 : 0.75,
      method: 'per_100g',
      license: 'CC0'
    }
  };
}

function mapOffProduct(p) {
  const n = p.nutriments || {};
  return {
    id: 'off_' + (p.code || p._id || Math.random().toString(36).slice(2)),
    name: p.product_name || p.product_name_it || p.generic_name || 'Prodotto OFF',
    brand: p.brands || null,
    barcode: p.code || null,
    category: (p.categories_tags && p.categories_tags[0]) || 'OFF',
    kcalPer100: Number(n['energy-kcal_100g'] || n.energy_kcal_100g || 0) || 0,
    proPer100: Number(n.proteins_100g || 0) || 0,
    carbPer100: Number(n.carbohydrates_100g || 0) || 0,
    fatPer100: Number(n.fat_100g || 0) || 0,
    unit: 'g',
    provenance: {
      source: 'open_food_facts',
      sourceId: String(p.code || p._id || ''),
      kind: 'label',
      confidence: 0.7,
      method: 'per_100g',
      license: 'ODbL',
      attribution: 'Open Food Facts contributors — https://openfoodfacts.org'
    }
  };
}

export async function searchUsda(query, { apiKey, pageSize = 8 } = {}) {
  if (!apiKey || !query) return [];
  const url = `${USDA_BASE}/foods/search?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(query)}&pageSize=${pageSize}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('USDA_HTTP_' + res.status);
  const data = await res.json();
  return (data.foods || []).map(mapUsdaFood);
}

export async function searchOpenFoodFacts(query, { pageSize = 8 } = {}) {
  if (!query) return [];
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

/**
 * Local-first merge: caller should already have local hits.
 * Returns { items, source, attribution }
 */
export async function searchFoodMulti(query, env = process.env) {
  const q = fold(query);
  if (!q || q.length < 2) return { items: [], source: 'empty' };
  const items = [];
  const sources = [];
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

export const MEAL_PHOTO_LOW_CONFIDENCE = 0.55;
export const MEAL_PHOTO_MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export const MEAL_PHOTO_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    overallConfidence: { type: 'number' },
    notes: { type: 'string' },
    noFoodDetected: { type: 'boolean' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: 'string' },
          kcal: { type: 'number' },
          pro: { type: 'number' },
          carb: { type: 'number' },
          fat: { type: 'number' },
          confidence: { type: 'number' },
          notes: { type: 'string' }
        },
        required: ['name', 'quantity', 'unit', 'kcal', 'confidence']
      }
    }
  },
  required: ['items', 'overallConfidence']
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

function clampNum(value, min, max, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeUnit(unit) {
  const u = fold(unit);
  if (u === 'ml' || u === 'millilitri') return 'ml';
  if (u === 'porzione' || u === 'porzioni' || u === 'portion' || u === 'portions' || u === 'serving') return 'porzioni';
  if (u === 'cucchiaio' || u === 'cucchiai' || u === 'tbsp') return 'cucchiai';
  if (u === 'scoop' || u === 'misurino' || u === 'misurini') return 'misurini';
  return 'g';
}

function quantityToGrams(quantity, unit) {
  const qty = clampNum(quantity, 0, 5000, 0);
  const u = normalizeUnit(unit);
  if (u === 'porzioni') return qty * 100;
  if (u === 'cucchiai') return qty * 15;
  if (u === 'misurini') return qty * 30;
  return qty;
}

export function normalizeMealPhotoItem(raw) {
  const name = String(raw?.name || raw?.food || '').replace(/\s+/g, ' ').trim();
  if (!name) return null;
  const unit = normalizeUnit(raw?.unit);
  const quantity = clampNum(raw?.quantity ?? raw?.qty ?? raw?.grams, 0, 5000, 0);
  const confidence = clampNum(raw?.confidence, 0, 1, 0.35);
  const kcal = Math.round(clampNum(raw?.kcal ?? raw?.calories, 0, 4000, 0));
  const pro = Math.round(clampNum(raw?.pro ?? raw?.protein, 0, 400, 0) * 10) / 10;
  const carb = Math.round(clampNum(raw?.carb ?? raw?.carbs, 0, 500, 0) * 10) / 10;
  const fat = Math.round(clampNum(raw?.fat ?? raw?.fats, 0, 300, 0) * 10) / 10;
  return {
    name: name.slice(0, 80),
    quantity: Math.round(quantity * 10) / 10,
    unit,
    grams: Math.round(quantityToGrams(quantity, unit)),
    kcal,
    pro,
    carb,
    fat,
    confidence,
    uncertain: confidence < MEAL_PHOTO_LOW_CONFIDENCE,
    notes: String(raw?.notes || '').slice(0, 240),
    provenance: raw?.provenance && typeof raw.provenance === 'object'
      ? raw.provenance
      : { source: 'gemini_vision', kind: 'estimate', confidence, method: 'vision_estimate' }
  };
}

export function mealPhotoItemsToFoods(items) {
  return (Array.isArray(items) ? items : [])
    .map((it) => normalizeMealPhotoItem(it))
    .filter(Boolean)
    .map((it) => ({
      name: it.name,
      quantity: it.quantity,
      unit: it.unit,
      kcal: it.kcal,
      pro: it.pro,
      carb: it.carb,
      fat: it.fat,
      notes: it.notes || (it.uncertain ? 'Stima visiva incerta — verifica quantità e kcal' : 'Stima da foto'),
      provenance: Object.assign({ source: 'gemini_vision', kind: 'estimate' }, it.provenance, {
        confidence: it.confidence,
        method: it.provenance?.method || 'vision_estimate'
      })
    }));
}

export function normalizeMealPhotoResult(raw, extras = {}) {
  const items = (Array.isArray(raw?.items) ? raw.items : [])
    .map((it) => normalizeMealPhotoItem(it))
    .filter(Boolean)
    .slice(0, 12);
  const explicit = Number(raw?.overallConfidence);
  const fromItems = items.length
    ? items.reduce((sum, it) => sum + it.confidence, 0) / items.length
    : 0;
  const overallConfidence = clampNum(Number.isFinite(explicit) ? explicit : fromItems, 0, 1, fromItems);
  const noFoodDetected = raw?.noFoodDetected === true || items.length === 0;
  const uncertain = noFoodDetected
    || overallConfidence < MEAL_PHOTO_LOW_CONFIDENCE
    || items.some((it) => it.uncertain);
  const warnings = [];
  if (noFoodDetected) warnings.push('Nessun alimento riconosciuto con sufficiente certezza.');
  if (uncertain && items.length) warnings.push('Stima incerta: controlla quantità e calorie prima di salvare.');
  if (extras.dbEnrichFailed) warnings.push('Database alimenti non disponibile: kcal e macro restano una stima visiva.');
  return {
    ok: true,
    domain: 'nutrition',
    mealName: extras.mealName || raw?.mealName || null,
    items,
    foods: mealPhotoItemsToFoods(items),
    overallConfidence: Math.round(overallConfidence * 100) / 100,
    uncertain,
    needsConfirmation: true,
    noFoodDetected,
    notes: String(raw?.notes || extras.notes || '').slice(0, 400),
    warnings,
    source: extras.source || 'gemini_vision',
    diagnosis: false
  };
}

export function mockAnalyzeMealPhoto({ mealName } = {}) {
  return normalizeMealPhotoResult({
    overallConfidence: 0.42,
    notes: 'Stima mock — non è un riconoscimento reale. Usata solo in test / MOCK_GEMINI.',
    items: [
      {
        name: 'Petto di pollo',
        quantity: 150,
        unit: 'g',
        kcal: 248,
        pro: 46.5,
        carb: 0,
        fat: 5.4,
        confidence: 0.72,
        notes: 'Stima visiva'
      },
      {
        name: 'Riso bianco cotto',
        quantity: 180,
        unit: 'g',
        kcal: 234,
        pro: 4.8,
        carb: 50,
        fat: 0.4,
        confidence: 0.4,
        notes: 'Quantità incerta'
      }
    ]
  }, { source: 'mock', mealName: mealName || 'Pranzo' });
}

export function namesLikelyMatch(a, b) {
  const left = fold(a);
  const right = fold(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length >= 4 && right.includes(left)) return true;
  if (right.length >= 4 && left.includes(right)) return true;
  const tokens = left.split(/\s+/).filter((t) => t.length >= 4);
  return tokens.length > 0 && tokens.every((t) => right.includes(t));
}

function scaleDbMacros(food, grams) {
  const ratio = (Number(grams) || 0) / 100;
  const kcal = food.kcalPer100 != null ? food.kcalPer100 : food.kcal;
  const pro = food.proPer100 != null ? food.proPer100 : food.pro;
  const carb = food.carbPer100 != null ? food.carbPer100 : food.carb;
  const fat = food.fatPer100 != null ? food.fatPer100 : food.fat;
  return {
    kcal: Math.round((Number(kcal) || 0) * ratio),
    pro: Math.round((Number(pro) || 0) * ratio * 10) / 10,
    carb: Math.round((Number(carb) || 0) * ratio * 10) / 10,
    fat: Math.round((Number(fat) || 0) * ratio * 10) / 10
  };
}

export async function enrichMealPhotoItems(items, searchFn) {
  if (!items.length || typeof searchFn !== 'function') {
    return { items, dbEnrichFailed: false, source: 'gemini_vision' };
  }
  let usedDb = false;
  let dbEnrichFailed = false;
  const out = [];
  for (const item of items) {
    try {
      const found = await searchFn(item.name);
      const list = Array.isArray(found?.items) ? found.items : Array.isArray(found) ? found : [];
      const match = list.find((f) => namesLikelyMatch(item.name, f.name));
      const grams = item.grams || quantityToGrams(item.quantity, item.unit);
      if (match && grams > 0 && (match.kcalPer100 > 0 || match.kcal > 0)) {
        const scaled = scaleDbMacros(match, grams);
        usedDb = true;
        out.push(normalizeMealPhotoItem({
          ...item,
          kcal: scaled.kcal,
          pro: scaled.pro,
          carb: scaled.carb,
          fat: scaled.fat,
          notes: item.notes,
          provenance: {
            source: match.provenance?.source || 'food_db',
            sourceId: match.provenance?.sourceId || match.id || null,
            kind: match.provenance?.kind || 'generic',
            confidence: Math.min(item.confidence, match.provenance?.confidence || 0.75),
            method: 'vision_qty+db_macros',
            license: match.provenance?.license || null,
            attribution: match.provenance?.attribution || null
          }
        }));
        continue;
      }
    } catch (_) {
      dbEnrichFailed = true;
    }
    out.push(item);
  }
  return {
    items: out,
    dbEnrichFailed,
    source: usedDb ? 'gemini_vision+food_db' : 'gemini_vision'
  };
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {}
  const fence = raw.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/i);
  if (fence) {
    try { return JSON.parse(fence[1]); } catch (_) {}
  }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch (_) {}
  }
  return null;
}

export function buildMealPhotoPrompt({ mealName, locale } = {}) {
  const lang = String(locale || 'it').toLowerCase().startsWith('en') ? 'en' : 'it';
  const slot = String(mealName || '').trim();
  return lang === 'en'
    ? `You are a nutrition vision estimator for Nurvan. Identify visible foods in the photo.
Return ONLY JSON matching the schema. Estimate cooked edible grams, kcal, protein, carbs, fats.
If unsure, lower confidence instead of inventing hidden ingredients.
Meal slot hint: ${slot || 'unspecified'}.
No medical diagnosis. If the image is not food, set noFoodDetected=true and items=[].`
    : `Sei uno stimatore visivo di alimenti per Nurvan. Identifica i cibi visibili nella foto.
Rispondi SOLO con JSON dello schema. Stima grammi edibili (cotti se sembra cotto), kcal, proteine, carboidrati, grassi.
Se sei incerto, abbassa confidence: non inventare ingredienti non visibili.
Pasto selezionato: ${slot || 'non specificato'}.
Niente diagnosi mediche. Se la foto non è cibo, noFoodDetected=true e items=[].`;
}

export async function analyzeMealPhoto(input = {}, deps = {}) {
  const env = deps.env || process.env;
  const mealName = String(input.mealName || input.meal || '').slice(0, 60);
  const locale = String(input.locale || 'it').slice(0, 8);
  if (env.MOCK_GEMINI === '1' || deps.forceMock) {
    return mockAnalyzeMealPhoto({ mealName });
  }
  const image = parseImagePayload(input.image || input.dataUrl || input.data, input.mimeType || input.mime);
  if (!image) {
    const err = new Error('image_required');
    err.statusCode = 400;
    throw err;
  }
  if (image.bytes > MEAL_PHOTO_MAX_IMAGE_BYTES) {
    const err = new Error('image_too_large');
    err.statusCode = 413;
    throw err;
  }
  if (typeof deps.generateVision !== 'function') {
    const err = new Error('vision_not_configured');
    err.statusCode = 503;
    throw err;
  }
  const prompt = buildMealPhotoPrompt({ mealName, locale });
  const vision = await deps.generateVision({
    prompt,
    image,
    schema: MEAL_PHOTO_RESPONSE_SCHEMA
  });
  const parsed = extractJsonObject(vision && vision.text);
  if (!parsed) {
    const err = new Error('invalid_vision_json');
    err.statusCode = 500;
    throw err;
  }
  const searchFn = deps.searchFoods || ((q) => searchFoodMulti(q, env));
  let normalized = normalizeMealPhotoResult(parsed, { mealName, source: 'gemini_vision' });
  const enriched = await enrichMealPhotoItems(normalized.items, searchFn);
  normalized = normalizeMealPhotoResult({
    items: enriched.items,
    overallConfidence: normalized.overallConfidence,
    notes: normalized.notes,
    noFoodDetected: normalized.noFoodDetected
  }, {
    mealName,
    source: enriched.source,
    dbEnrichFailed: enriched.dbEnrichFailed
  });
  return normalized;
}

export function mountFoodRoutes(app, { requireAuth, generateVision, env } = {}) {
  app.get('/api/food/search', async (req, res) => {
    try {
      if (requireAuth) {
        const auth = await requireAuth(req);
        if (!auth) return res.status(401).json({ ok: false, error: 'Auth required' });
      }
      const q = String(req.query.q || req.query.query || '').trim();
      const result = await searchFoodMulti(q);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message || 'food_search_failed' });
    }
  });

  app.get('/api/food/barcode/:code', async (req, res) => {
    try {
      const item = await lookupOffBarcode(req.params.code);
      if (!item) return res.status(404).json({ ok: false, error: 'not_found' });
      return res.json({ ok: true, item, attribution: item.provenance?.attribution });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message || 'barcode_failed' });
    }
  });

  app.post('/api/food/analyze-photo', async (req, res) => {
    try {
      const result = await analyzeMealPhoto(req.body || {}, {
        generateVision,
        env: env || process.env
      });
      return res.json(result);
    } catch (err) {
      const status = err.statusCode || (/image_required|image_too_large/i.test(err.message) ? 400 : 500);
      return res.status(status).json({
        ok: false,
        error: err.message || 'meal_photo_failed',
        needsConfirmation: true,
        uncertain: true,
        items: [],
        foods: []
      });
    }
  });
}
