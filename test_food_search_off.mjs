import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapOffProduct } from './server/food/index.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

// Open Food Facts retired the legacy cgi/search.pl text-search endpoint (it
// started returning 503 "Page temporarily unavailable" - verified live) in
// favor of a new search-a-licious service at a different host, whose hits
// also shape "brands" as an array instead of the old comma-joined string.
// searchOpenFoodFacts() silently caught every failure (searchFoodMulti's own
// try/catch), so food search results were quietly missing every Open Food
// Facts hit - one of the two sources ("un database ampio come FatSecret")
// this app leans on for broad food coverage - with no visible error anywhere.
console.log('--- Running Open Food Facts Search Endpoint Tests ---');

const serverSrc = fs.readFileSync(path.join(root, 'server/food/index.mjs'), 'utf8');
ok(serverSrc.includes("OFF_SEARCH_BASE = 'https://search.openfoodfacts.org'"),
  '1a. server-side food search points at the new search-a-licious host');
ok(!serverSrc.includes('OFF_BASE}/cgi/search.pl'), '1b. the retired cgi/search.pl endpoint is no longer called');
ok(/const url = `\$\{OFF_SEARCH_BASE\}\/search\?/.test(serverSrc), '1c. searchOpenFoodFacts calls the new /search endpoint');
ok(/return \(data\.hits \|\| \[\]\)\.map\(mapOffProduct\)/.test(serverSrc), '1d. searchOpenFoodFacts reads the new "hits" array instead of "products"');

const clientSrc = fs.readFileSync(path.join(root, 'prepare_task20_js_services.mjs'), 'utf8');
ok(clientSrc.includes('https://search.openfoodfacts.org/search?q='), '2a. the client-side fallback search also points at the new host');
ok(!clientSrc.includes("'https://world.openfoodfacts.org/cgi/search.pl"), '2b. the client-side fallback no longer calls the retired endpoint');
ok(/\(j\.hits \|\| \[\]\)\.forEach/.test(clientSrc), '2c. the client-side fallback reads "hits" instead of "products"');

// mapOffProduct must handle both shapes of the "brands" field: a plain string
// (still returned by the barcode-lookup product API, unaffected by this
// change) and an array (returned by the new search API) - the exact
// regression risk introduced by switching endpoints.
const arrayBrandProduct = mapOffProduct({
  code: '8003518100141',
  product_name: 'Pecorino romano dop',
  brands: ['Agriform'],
  nutriments: { 'energy-kcal_100g': 397, proteins_100g: 25, carbohydrates_100g: 0, fat_100g: 33 }
});
ok(arrayBrandProduct.brand === 'Agriform', '3a. mapOffProduct joins an array-shaped brands field into a plain string');
ok(arrayBrandProduct.kcalPer100 === 397 && arrayBrandProduct.proPer100 === 25, '3b. mapOffProduct still reads nutriments correctly for a search-hit-shaped product');

const stringBrandProduct = mapOffProduct({
  code: '3017620422003',
  product_name: 'Nutella',
  brands: 'Ferrero',
  nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 }
});
ok(stringBrandProduct.brand === 'Ferrero', '3c. mapOffProduct still handles a plain string brands field (barcode-lookup API shape, unaffected by this change)');

console.log('\nAll Open Food Facts search endpoint tests passed.');
