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

export function mountFoodRoutes(app, { requireAuth } = {}) {
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
}
