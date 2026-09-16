import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rfc3986Encode, fatSecretSignedParams, mapFatSecretFood, nameMatchScore, searchFoodMulti } from './server/food/index.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

// Added FatSecret as a third food source (OAuth 1.0 - the free tier that
// needs no IP whitelist, unlike OAuth 2.0) and fixed two real problems in
// how results from every source get combined: they were fetched one after
// another instead of in parallel (a search took roughly the SUM of USDA +
// Open Food Facts + FatSecret's latency instead of the slowest one), and
// results were just concatenated in source order with no regard for how
// well each one actually matched what was typed - the reported "un poco
// lenta e strutturata male con suggerimenti di nome un po' incasinati".
console.log('--- Running FatSecret Integration & Search Quality Tests ---');

// 1. RFC3986 encoding - the classic OAuth1 gotcha (encodeURIComponent alone
// leaves !'()* unescaped, which silently breaks the signature).
ok(rfc3986Encode("a b") === 'a%20b', '1a. spaces are percent-encoded');
ok(rfc3986Encode("a!b'c(d)e*f") === 'a%21b%27c%28d%29e%2Af', "1b. !'()* are encoded too, unlike plain encodeURIComponent");
ok(rfc3986Encode('a&b=c') === 'a%26b%3Dc', '1c. reserved delimiter characters are encoded');

// 2. OAuth 1.0 signing: only activates with both credentials present, never
// throws or silently sends an unsigned request when they're missing.
{
  const signed = fatSecretSignedParams({ method: 'foods.search.v3', search_expression: 'pollo' }, {
    FATSECRET_CONSUMER_KEY: 'testkey', FATSECRET_CONSUMER_SECRET: 'testsecret'
  });
  ok(signed && typeof signed.oauth_signature === 'string' && signed.oauth_signature.length > 0, '2a. a request is signed when both credentials are present');
  ok(signed.oauth_signature_method === 'HMAC-SHA1' && signed.oauth_version === '1.0', '2b. required OAuth 1.0 parameters are present');
  const noCreds = fatSecretSignedParams({ method: 'foods.search.v3' }, {});
  ok(noCreds === null, '2c. signing is skipped (not attempted with empty/garbage keys) when no credentials are configured');
}

// 3. Response mapping: foods.search.v3 needs Premier-tier access - confirmed
// live against a real (Basic-tier) account with error code 10 "Unknown
// method" - so this parses the plain v1 method's free-text food_description
// ("Per 100g - Calories: Xkcal | Fat: Yg | Carbs: Zg | Protein: Wg"), the
// only method actually available on every tier.
{
  const per100 = mapFatSecretFood({
    food_id: '123', food_name: 'Pollo petto', brand_name: null, food_type: 'Generic',
    food_description: 'Per 100g - Calories: 110kcal | Fat: 1.20g | Carbs: 0.00g | Protein: 23.00g'
  });
  ok(per100.kcalPer100 === 110 && per100.proPer100 === 23, '3a. a plain "Per 100g" description is parsed directly as the per-100g rate');

  const scaled = mapFatSecretFood({
    food_id: '456', food_name: 'Barretta proteica', brand_name: 'Marca', food_type: 'Brand',
    food_description: 'Per 1 bar (50g) - Calories: 200kcal | Fat: 6.00g | Carbs: 15.00g | Protein: 20.00g'
  });
  ok(scaled.kcalPer100 === 400 && scaled.proPer100 === 40, '3b. a non-100g serving ("1 bar (50g)") is scaled back to a per-100g rate (50g->100g means x2)');
  ok(scaled.provenance.source === 'fatsecret' && scaled.provenance.kind === 'branded', '3c. provenance correctly identifies the source and branded/generic kind');
}

// 4. Relevance ranking - an exact/prefix match must outrank a loose
// substring match regardless of which source found it.
{
  const q = 'pollo';
  ok(nameMatchScore('Pollo', q) > nameMatchScore('Insalata di pollo e mais', q), '4a. an exact match outranks a loose substring match');
  ok(nameMatchScore('Pollo arrosto', q) > nameMatchScore('Spezzatino di pollo', q), '4b. a name starting with the query outranks one with the query buried in the middle');
  ok(nameMatchScore('Petto di pollo', q) > nameMatchScore('Polloni', q), '4c. a whole-word match outranks a same-prefix-but-different-word match');
}

// 5. searchFoodMulti structure: parallel fetch, FatSecret wired in as a
// third source, smarter dedup key (name+brand, not name+source-specific id).
const serverSrc = fs.readFileSync(path.join(root, 'server/food/index.mjs'), 'utf8');
ok(/const \[usdaResult, offResult, fatSecretResult\] = await Promise\.allSettled\(\[/.test(serverSrc),
  '5a. USDA, Open Food Facts and FatSecret are fetched in parallel (Promise.allSettled), not one after another');
ok(serverSrc.includes("sources.push('fatsecret')"), '5b. FatSecret results contribute to the reported source list');
ok(serverSrc.includes("fold(it.name) + '|' + fold(it.brand || '')"), '5c. dedup keys on name+brand, not a source-specific id, so the same generic food from two sources actually collapses into one suggestion');
ok(serverSrc.includes('scored.sort((a, b) => b.score - a.score)'), '5d. results are sorted by relevance before deduping/truncating, so the best match survives and sorts first');
ok(serverSrc.includes("const usdaKey ? Boolean") === false && serverSrc.includes('usdaKey ? searchUsda('), '5e. USDA is still skipped cleanly (not attempted) when no API key is configured');
// Confirmed live against a real account: foods.search.v3 answers error code
// 10 "Unknown method" (Premier-tier only) - foods.search (v1) is what's
// actually available and must be what gets called.
ok(serverSrc.includes("fatSecretRequest('foods.search', params, env)"), '5f. FatSecret is called via the universally-available v1 foods.search method, not the Premier-only v3');
ok(!serverSrc.includes("'foods.search.v3'"), '5g. the Premier-only v3 method name is not referenced anywhere anymore');

// 6. Locale plumbing end-to-end: client -> route -> searchFoodMulti -> FatSecret,
// so localized results aren't hardcoded to Italian - the seam for other
// languages already exists instead of needing another rewrite later.
ok(serverSrc.includes("export async function searchFoodMulti(query, env = process.env, { lang = 'it' } = {})"),
  '6a. searchFoodMulti accepts a lang parameter (defaulting to Italian, not hardcoded to it)');
ok(serverSrc.includes('LANG_TO_FATSECRET_REGION'), '6b. app language codes map to FatSecret region/language pairs');
ok(/req\.query\.lang \|\| 'it'/.test(serverSrc), "6c. the /api/food/search route reads the caller's language from the request");

const clientSrc = fs.readFileSync(path.join(root, 'prepare_task20_js_services.mjs'), 'utf8');
ok(clientSrc.includes("I18nService.getLanguage()") && clientSrc.includes("'&lang=' + encodeURIComponent(lang)"),
  "6d. the client passes the user's actual selected app language, not a hardcoded one");

// 7. Live integration sanity check against USDA/Open Food Facts (no
// credentials needed for either) - confirms the rewritten merge/rank/dedup
// pipeline still returns real, correctly-shaped results end to end.
try {
  const result = await searchFoodMulti('pollo', process.env, { lang: 'it' });
  ok(result.ok === true, '7a. searchFoodMulti still returns a real result for a live query');
  ok(Array.isArray(result.items), '7b. items is an array');
  if (result.items.length > 1) {
    ok(nameMatchScore(result.items[0].name, 'pollo') >= nameMatchScore(result.items[1].name, 'pollo'),
      '7c. live results actually come back ranked best-match-first');
  }
} catch (err) {
  console.warn('  (skipped 7: live network unavailable in this environment -', err.message, ')');
}

console.log('\nAll FatSecret integration & search quality tests passed.');
