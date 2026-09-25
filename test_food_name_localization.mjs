import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { localizeFoodSearchResults } from './server/food/index.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

// "possiamo tradurre simultaneamente alla ricerca il database" - localize
// search results into the user's language as part of the search itself,
// explicitly NOT a literal/mechanical translation but the name a product is
// actually known by in that market (asked for directly - "non con
// traduzione letteraria... il nome usato in italia"). Backed by a permanent
// cache (food_name_translations) keyed by name+brand+language, so the AI is
// only ever consulted once per distinct item - not on every search, and not
// for items from already-curated sources (the local staple catalog, chain
// restaurant menus) that never needed it in the first place.
console.log('--- Running Food Name Localization Tests ---');

function makeMockPool(existingRows = []) {
  const inserted = [];
  return {
    rows: existingRows,
    inserted,
    async query(sql, params) {
      if (/SELECT original_key/.test(sql)) {
        const [lang, keys] = params;
        return { rows: existingRows.filter((r) => r.target_lang === lang && keys.includes(r.original_key)) };
      }
      if (/INSERT INTO food_name_translations/.test(sql)) {
        inserted.push({ key: params[0], lang: params[1], name: params[2] });
        return { rows: [] };
      }
      return { rows: [] };
    }
  };
}

// 1. Items from already-curated sources (chain restaurants, the local
// staple catalog) are never sent to translation - they don't need it, and
// nothing should risk mangling an already-correct Italian name.
{
  const items = [{ name: 'Big Mac', brand: "McDonald's", provenance: { source: 'official_restaurant_data' } }];
  const pool = makeMockPool();
  let aiCalled = false;
  await localizeFoodSearchResults(items, 'it', { pool, translateFoodNames: async () => { aiCalled = true; return []; } });
  ok(!aiCalled, '1a. an already-curated source (chain restaurant menu) is never sent to the AI');
  ok(items[0].name === 'Big Mac', '1b. its name is left untouched');
}

// 2. A cached translation is applied without ever calling the AI again.
{
  const items = [{ name: 'Pollo Asado', brand: 'Fresh & Easy', provenance: { source: 'fatsecret' } }];
  const key = 'pollo asado|fresh & easy'; // fold() lowercases; matches server-side fold() behavior
  const pool = makeMockPool([{ original_key: key, target_lang: 'it', translated_name: 'Pollo arrosto' }]);
  let aiCalled = false;
  await localizeFoodSearchResults(items, 'it', { pool, translateFoodNames: async () => { aiCalled = true; return []; } });
  ok(!aiCalled, '2a. a cached translation is served from the cache, no AI call needed');
  ok(items[0].name === 'Pollo arrosto', '2b. the cached localized name replaces the original');
  ok(items[0].originalName === 'Pollo Asado', '2c. the original name is preserved on the item (not silently discarded) for transparency/debugging');
}

// 3. An uncached item from a localizable source is sent to the AI, the
// result is applied to this response AND persisted for next time.
{
  const items = [
    { name: 'Chicken Breast Grilled', brand: null, provenance: { source: 'usda' } },
    { name: 'Big Mac', brand: "McDonald's", provenance: { source: 'official_restaurant_data' } }
  ];
  const pool = makeMockPool();
  let receivedLangLabel = null;
  let receivedItems = null;
  await localizeFoodSearchResults(items, 'it', {
    pool,
    translateFoodNames: async (toTranslate, langLabel) => {
      receivedLangLabel = langLabel;
      receivedItems = toTranslate;
      return [{ index: 0, localized_name: 'Petto di pollo grigliato' }];
    }
  });
  ok(receivedLangLabel === 'Italia', '3a. the AI is told which market/language to localize for');
  ok(receivedItems.length === 1 && receivedItems[0].name === 'Chicken Breast Grilled',
    '3b. only the uncached, localizable item is sent to the AI - the chain-restaurant item never is');
  ok(items[0].name === 'Petto di pollo grigliato', '3c. the AI-provided localized name is applied to the response');
  ok(pool.inserted.length === 1 && pool.inserted[0].name === 'Petto di pollo grigliato',
    '3d. the new translation is persisted to the cache so future searches never need the AI for this item again');
}

// 4. Never fabricates a translation, never blocks the search response
// waiting on the AI, and empty responses degrade gracefully.
{
  const items = [{ name: 'Something Untranslatable', brand: null, provenance: { source: 'open_food_facts' } }];
  const pool = makeMockPool();
  await localizeFoodSearchResults(items, 'it', { pool, translateFoodNames: async () => [] });
  ok(items[0].name === 'Something Untranslatable', '4a. an empty AI response leaves the original name in place rather than blanking it');
  ok(!items[0].originalName, '4b. originalName is only set when an actual replacement happened');
}

// 5. Static checks: the response is never held hostage by a slow AI call
// (bounded with a timeout), and the DB write is fire-and-forget (never
// blocks/fails the search response even if it errors).
const serverSrc = fs.readFileSync(path.join(root, 'server/food/index.mjs'), 'utf8');
ok(/setTimeout\(\(\) => resolve\(TIMED_OUT\), 5000\)/.test(serverSrc) && serverSrc.includes('Promise.race([translateFoodNames'),
  '5a. the AI call is bounded by a timeout so a slow response never blocks the search itself');
ok(serverSrc.includes('saveCachedFoodTranslations(pool, toSave, lang).catch(() => {})'),
  '5b. persisting the new translations is fire-and-forget, never able to fail or delay the response');
ok(serverSrc.includes("await localizeFoodSearchResults(result.items, lang, { pool, translateFoodNames, background: true });"),
  '5c. the /api/food/search route wires localization into every search, with new translations in the background');

// 6. The search answers now: cached names are applied, new names are
// translated after the response and land in the cache for the next search.
{
  const items = [
    { name: 'Nutella', brand: 'Ferrero', provenance: { source: 'open_food_facts' } },
    { name: 'Hazelnut spread', brand: 'Brand', provenance: { source: 'open_food_facts' } }
  ];
  const pool = makeMockPool([{ original_key: 'nutella|ferrero', target_lang: 'it', translated_name: 'Nutella' }]);
  let release = null;
  let calls = 0;
  const translateFoodNames = (list) => { calls++; return new Promise((r) => { release = () => r(list.map((x, i) => ({ index: i, localized_name: 'Crema di nocciole' }))); }); };
  const t0 = Date.now();
  await localizeFoodSearchResults(items, 'it', { pool, translateFoodNames, background: true });
  ok(Date.now() - t0 < 200, '6a. with background: the call returns without waiting for the AI');
  ok(items[1].name === 'Hazelnut spread' && !items[1].originalName, '6b. the uncached product goes out with its original name');
  ok(calls === 1, '6c. and the AI is asked once, after');
  // Typing on: the same product while its translation is still running.
  await localizeFoodSearchResults([{ name: 'Hazelnut spread', brand: 'Brand', provenance: { source: 'open_food_facts' } }], 'it', { pool, translateFoodNames, background: true });
  ok(calls === 1, '6d. a second search for the same product does not start a second translation');
  release();
  await new Promise((r) => setTimeout(r, 20));
  ok(pool.inserted.length === 1 && pool.inserted[0].name === 'Crema di nocciole', '6e. the translation lands in the cache');
  ok(items[1].name === 'Hazelnut spread', '6f. and the response already sent is not changed under it');
}

console.log('\nAll food name localization tests passed.');
