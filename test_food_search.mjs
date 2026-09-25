// Il catalogo alimenti ripulito e la ricerca per pertinenza.
//
// Il catalogo: una voce per alimento (le sei etichette finte ripetevano lo
// stesso cibo con gli stessi valori), apostrofi al loro posto, e il file
// generato corrisponde alla sua fonte. La ricerca: normalizzazione, punteggio
// a livelli, uso dell'atleta, parita', limite di 8. La rete: una sezione a
// parte, da 3 lettere, al massimo 6, entro 2 s o niente.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8').replace(/\r\n/g, '\n');
const SERVICES = fs.readFileSync(path.join(root, 'prepare_task20_js_services.mjs'), 'utf8').replace(/\r\n/g, '\n');

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
function eq(actual, expected, message) {
  const a = actual !== null && typeof actual === 'object' ? JSON.stringify(actual) : actual;
  const b = expected !== null && typeof expected === 'object' ? JSON.stringify(expected) : expected;
  try { assert.equal(a, b); console.log('OK   ' + message); }
  catch (e) { failed++; console.log('FAIL ' + message + '\n     atteso ' + JSON.stringify(expected) + ', ottenuto ' + JSON.stringify(actual)); }
}
function grab(name) {
  const at = SRC.indexOf('function ' + name + '(');
  if (at < 0) return '';
  const end = SRC.indexOf('\n}', at);
  return end < 0 ? '' : SRC.slice(at, end + 2) + '\n';
}

const lib = { self: {} };
vm.createContext(lib);
vm.runInContext(fs.readFileSync(path.join(root, 'web/food-search.js'), 'utf8'), lib);
const S = lib.self.NurvanFoodSearch;
const { FOOD_CATALOG } = await import('./food-catalog.mjs');
const names = (list) => list.map((f) => f.name);

console.log('\n--- 1. il catalogo: una voce per alimento ---');
{
  eq(FOOD_CATALOG.length, 148, '1a. 148 voci (erano 1300: 762 con un\'etichetta davanti, 390 varianti di cottura)');
  eq(FOOD_CATALOG.filter((f) => /lessat|grigliat|al forno|al vapore|in padella/i.test(f.name)).length, 0, '1a2. nessun alimento «lessato», «grigliato», «al forno», «al vapore», «in padella»');
  const LABELS = ['Bio', 'Convenience', 'Generico', 'Premium', 'Sport', 'Supermarket'];
  eq(FOOD_CATALOG.filter((f) => f.brand || LABELS.some((l) => f.name.startsWith(l + ' '))).length, 0, '1b. nessuna etichetta finta, nessun brand negli alimenti base');
  eq(FOOD_CATALOG.filter((f) => /(^|\s)(d|l|all|dell|dall|nell|sull|un|quest)\s+[aeiouh]/i.test(f.name)).length, 0, '1c. nessun apostrofo mancante');
  ok('1d. «Petto d\'anatra» e «Tonno all\'olio» scritti giusti', FOOD_CATALOG.some((f) => f.name === "Petto d'anatra") && FOOD_CATALOG.some((f) => f.name === "Tonno all'olio"));
  eq(new Set(FOOD_CATALOG.map((f) => f.name.toLowerCase())).size, FOOD_CATALOG.length, '1e. nessun nome doppio');
  ok('1f. ogni voce ha l\'ordine del curatore', FOOD_CATALOG.every((f) => Number.isFinite(f.rank)));
  let fresh = true;
  try { execFileSync(process.execPath, [path.join(root, 'tools/build_food_catalog.mjs'), '--check'], { stdio: 'pipe' }); } catch (_) { fresh = false; }
  ok('1g. food-catalog.mjs e\' esattamente quello che lo script genera da food-staples.json', fresh);
  ok('1h. e lo dice in testa', /^\/\*\* GENERATO da tools\/build_food_catalog\.mjs/.test(fs.readFileSync(path.join(root, 'food-catalog.mjs'), 'utf8')));
  const { buildFoodCatalog } = await import('./tools/build_food_catalog.mjs');
  let refused = '';
  try { buildFoodCatalog([{ id: 'x', name: 'Bio Riso', category: 'Carboidrati', kcal: 1, pro: 1, carb: 1, fat: 1, rank: 0 }, { id: 'y', name: 'Petto d anatra', category: 'Proteine', kcal: 1, pro: 1, carb: 1, fat: 1, rank: 0 }]); } catch (e) { refused = e.message; }
  ok('1i. lo script rifiuta un\'etichetta finta o un apostrofo mancante nella fonte', /etichetta finta/.test(refused) && /apostrofo mancante/.test(refused));
  let refusedCooking = '';
  try { buildFoodCatalog([{ id: 'food_Carboidrati_0_v2', name: 'Riso basmati lessato', category: 'Carboidrati', kcal: 1, pro: 1, carb: 1, fat: 1, rank: 0 }]); } catch (e) { refusedCooking = e.message; }
  ok('1j. e una variante di cottura, se ricompare', /variante di cottura/.test(refusedCooking));
}

console.log('\n--- 2. normalizzazione ---');
{
  eq(S.fold("  Petto d’Anatra  "), 'petto d anatra', '2a. minuscolo, apostrofi (anche tipografici) come spazio, spazi compattati');
  eq(S.fold('Caffè Lungo'), 'caffe lungo', '2b. senza accenti');
  eq(S.singular('olive mele pomodori riso oli'), 'oliva mela pomodoro riso oli', '2c. singolare semplice (-i→-o, -e→-a) solo dalle 4 lettere: «oli» resta «oli»');
  eq(S.scoreFood({ name: "Petto d'anatra" }, 'petto danatra').score, 0, '2d. l\'apostrofo non si toglie incollando: separa due parole');
  eq(S.scoreFood({ name: "Petto d'anatra" }, "petto d'an").score, 100, '2e. scritto con l\'apostrofo, trova');
  eq(S.scoreFood({ name: "Petto d'anatra" }, 'anatra').score, 80, '2f. e dalla parola dopo l\'apostrofo');
  eq(S.scoreFood({ name: 'Olive nere' }, 'oliva').score, 100, '2g. «oliva» trova «Olive nere»');
  eq(S.scoreFood({ name: 'Pomodoro' }, 'pomodori').score, 100, '2h. «pomodori» trova «Pomodoro»');
}

console.log('\n--- 3. il punteggio ---');
{
  const food = { name: 'Petto di pollo', name_en: 'Chicken breast', category: 'Proteine', aliases: ['Petto di pollo', 'Chicken breast', 'pollo petto'] };
  eq(S.scoreFood(food, 'pet').score, 100, '3a. il nome inizia con il testo: 100');
  eq(S.scoreFood(food, 'pol').score, 80, '3b. una parola del nome inizia con il testo: 80');
  eq(S.scoreFood({ name: 'Fesa', name_en: 'Turkey', aliases: ['Fesa', 'Turkey', 'tacchino a fette'] }, 'tacch').score, 60, '3c. un alias italiano per prefisso: 60');
  eq(S.scoreFood(food, 'ett').score, 30, '3d. il testo dentro il nome: 30');
  eq(S.scoreFood(food, 'chick').score, 10, '3e. nome inglese: il ripiego');
  eq(S.scoreFood(food, 'protei').score, 10, '3f. categoria: il ripiego');
  const cat = [{ name: 'Latte', name_en: 'Milk', category: 'Bevande', rank: 0 }, { name: 'Mela', name_en: 'Apple', category: 'Frutta', rank: 0 }];
  eq(names(S.rank(cat, 'milk')), ['Latte'], '3g. «milk»: nessun nome italiano, il nome inglese basta');
  eq(names(S.rank(FOOD_CATALOG, 'oli')).filter((n) => /pasta/i.test(n)), [], '3h. «oli»: c\'e\' «olio» nei nomi, quindi «Semolina pasta» (nome inglese) resta fuori');
}

console.log('\n--- 4. ordinamento e limite sul catalogo vero ---');
{
  const pet = names(S.rank(FOOD_CATALOG, 'pet'));
  eq(pet.slice(0, 3), ['Petto di pollo', 'Petto di tacchino', "Petto d'anatra"], '4a. «pet» → pollo, tacchino, anatra');
  ok('4b. poi solo altri petti', pet.slice(3).every((n) => /^Petto/.test(n)));
  eq(pet.filter((n) => /^(Bio|Convenience|Generico|Premium|Sport|Supermarket) /.test(n)).length, 0, '4c. niente doppioni con etichette');
  eq(S.rank(FOOD_CATALOG, 'lat').length, 8, '4d. al massimo 8 anche quando ce ne sono di piu\'');
  const ris = names(S.rank(FOOD_CATALOG, 'ris'));
  ok('4e. «ris» → Riso, basmati, integrale, jasmine, Latte di riso, Gallette di riso, tutti negli 8',
    ['Riso', 'Riso basmati', 'Riso integrale', 'Riso jasmine', 'Latte di riso', 'Gallette di riso'].every((n) => ris.includes(n)));
  ok('4e2. e i risi prima del latte e delle gallette', ['Riso', 'Riso basmati', 'Riso integrale', 'Riso jasmine'].every((n) => ris.indexOf(n) < ris.indexOf('Latte di riso') && ris.indexOf(n) < ris.indexOf('Gallette di riso')));
  const oli = names(S.rank(FOOD_CATALOG, 'oli'));
  ok('4f. «oli» → Olio EVO, Olio di cocco, Olive fra i primi quattro, nessuna pasta',
    ['Olio EVO', 'Olio di cocco', 'Olive nere'].every((n) => oli.slice(0, 4).includes(n)) && !oli.some((n) => /pasta/i.test(n)));
  const tie = S.rank([{ name: 'Petto d\'anatra', rank: 21 }, { name: 'Petto di pollo', rank: 0 }, { name: 'Petto di tacchino', rank: 1 }, { name: 'Pett', rank: 50 }], 'pet');
  eq(names(tie), ['Petto di pollo', 'Petto di tacchino', "Petto d'anatra", 'Pett'], '4g. a parita\' di punteggio l\'ordine del curatore');
  eq(names(S.rank([{ name: 'Riso basmati', rank: 3 }, { name: 'Riso', rank: 3 }], 'ris')), ['Riso', 'Riso basmati'], '4g2. poi il nome piu\' corto');
  eq(S.rank(FOOD_CATALOG, '').length + S.rank(FOOD_CATALOG, '   ').length, 0, '4h. testo vuoto: niente');
}

console.log('\n--- 5. l\'uso dell\'atleta ---');
{
  const now = Date.parse('2026-09-24T12:00:00Z');
  const u = S.usageIndex([
    { name: 'Petto di pollo', at: '2026-09-23' },
    { name: 'Petto di pollo', at: '2026-09-20' },
    { name: 'Petto di pollo', at: '2026-09-10' },
    { name: 'Petto di pollo', at: '2026-09-01' },
    { name: 'Petto di pollo', at: '2026-01-01' },
    { name: 'Merluzzo', at: null }
  ], now);
  eq(u.get({ name: 'petto di pollo' }), { used: true, recent: 4 }, '5a. quattro usi negli ultimi 30 giorni, uno piu\' vecchio');
  eq(u.get({ name: 'Merluzzo' }), { used: true, recent: 0 }, '5b. un uso senza data conta come usato, non come recente');
  eq(u.get({ name: 'Salmone' }), null, '5c. mai usato');
  const withUse = S.rank(FOOD_CATALOG, 'pollo', { usage: S.usageIndex([{ name: 'Petto di pollo', at: new Date(Date.now() - 86400000).toISOString() }]).get });
  eq(withUse[0].name, 'Petto di pollo', '5d. «pollo» dopo aver usato Petto di pollo ieri: Petto di pollo primo');
  eq(withUse[0]._score, 80 + 50 + 10, '5e. 80 (parola) + 50 (usato) + 10 (un uso recente)');
  const capped = S.rank([{ name: 'Petto di pollo' }], 'pet', { usage: u.get });
  eq(capped[0]._score, 100 + 50 + 30, '5f. i recenti si fermano a +30');
  const usedMilk = S.rank([{ name: 'Mela', name_en: 'Apple' }, { name: 'Latte', name_en: 'Milk' }], 'milk', { usage: S.usageIndex([{ name: 'Mela', at: null }]).get });
  eq(names(usedMilk), ['Latte'], '5g. l\'uso non fa entrare un alimento che il testo non trova');
}

console.log('\n--- 6. la rete: una sezione a parte ---');
{
  // The service, cut out of the services bundle and run with a fake network.
  const at = SERVICES.indexOf('const FoodDatabaseService = {');
  const end = SERVICES.indexOf('\n};\n', at);
  const code = SERVICES.slice(at, end + 3).replace('const FoodDatabaseService', 'var FoodDatabaseService');
  function service(fetchImpl, withAccount) {
    const ctx = {
      self: { NurvanFoodSearch: S }, FOOD_CATALOG, console, AbortController, setTimeout, clearTimeout,
      store: withAccount ? { accountToken: 't' } : {},
      fetch: fetchImpl, calls: []
    };
    if (withAccount) ctx.coachEndpoint = (p) => 'https://api' + p;
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    return ctx.FoodDatabaseService;
  }
  const offHits = { hits: Array.from({ length: 10 }, (_, i) => ({ product_name: 'Nutella ' + i, brands: ['Ferrero'], nutriments: { 'energy-kcal_100g': 539 }, code: '80' + i })) };
  let fetched = 0;
  const offOk = (url) => { fetched++; return Promise.resolve({ ok: true, json: () => Promise.resolve(offHits) }); };
  const svc = service(offOk, false);
  eq(await svc.searchRemote('nu'), [], '6a. sotto le 3 lettere la rete non si chiama');
  eq(fetched, 0, '6b. nemmeno una richiesta');
  const nutella = await svc.searchRemote('nutella');
  eq(nutella.length, 6, '6c. «nutella» → al massimo 6 prodotti');
  ok('6d. con la marca', nutella.every((p) => p.brand === 'Ferrero'));
  const t0 = Date.now();
  const hang = service(() => new Promise(() => {}), true);
  const none = await hang.searchRemote('nutella', { timeoutMs: 80 });
  eq(none, [], '6e. se la rete non risponde entro il tempo: nessun prodotto, nessun errore');
  ok('6f. e non si aspetta oltre', Date.now() - t0 < 1000);
  eq(S.REMOTE_TIMEOUT_MS, 2000, '6g. il tempo di attesa e\' 2 s');
  const failing = service(() => Promise.reject(new Error('offline')), true);
  eq(await failing.searchRemote('nutella'), [], '6h. rete spenta: lista vuota, nessuna eccezione');
  eq(svc.search('lat').length, 8, '6i. la ricerca locale non passa dalla rete e tiene il suo limite');
  const urls = [];
  const viaServer = service((url, opts) => { urls.push({ url, auth: !!(opts && opts.headers && opts.headers.Authorization) }); return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [{ name: 'Nutella', brand: 'Ferrero', kcalPer100: 539 }] }) }); }, true);
  const got = await viaServer.searchRemote('nutella');
  eq([got.length, got[0] && got[0].brand, urls.length, /\/api\/food\/search\?q=nutella/.test(urls[0] && urls[0].url)], [1, 'Ferrero', 1, true], '6j. passa dal nostro server, che risponde con la marca');
  ok('6k. il server si chiama anche senza account (niente token, niente intestazione)', /headers: token \? \{ Authorization: 'Bearer ' \+ token \} : \{\}/.test(SERVICES) && !/store\.accountToken\) \{\s*const lang/.test(SERVICES));
}

console.log('\n--- 7. la pagina: tre liste, nell\'ordine giusto ---');
{
  const box = { style: { display: 'none' }, innerHTML: '', onclick: null };
  const timers = [];
  let remoteResolve = null;
  const ctx = {
    console, window: {}, box,
    $: (id) => (id === 'food-db-suggestions' ? box : null),
    esc: (s) => String(s),
    currentNutritionRestrictionIds: () => [],
    foodRestrictionWarnHtml: () => '',
    selectFoodFromDb: () => {},
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: () => {},
    DATA: { nutrition: { customFoods: [{ name: 'Pecorino di Nuoro', kcal: 390 }], days: [] } },
    store: { nutritionDaily: {} },
    FoodDatabaseService: {
      searchFoods: (q, opts) => S.rank(FOOD_CATALOG, q, opts),
      searchRemote: () => new Promise((r) => { remoteResolve = r; })
    }
  };
  ctx.window.NurvanFoodSearch = S;
  vm.createContext(ctx);
  vm.runInContext('let __foodSearchTimer = null; let __foodSearchHits = [];\n' +
    ['foodUsageEntries', 'foodSearchDelayMs', 'renderFoodSuggestions'].map(grab).join('\n') +
    '\nlet __foodSearchSeq = 0; let __foodSearchState = null;\nasync ' + grab('filterFoodDb') +
    '\nfunction hits() { return __foodSearchHits; }', ctx);
  ctx.filterFoodDb('pe');
  eq(timers[timers.length - 1].ms, 150, '7a. 150 ms fra il tasto e la ricerca');
  timers[timers.length - 1].fn();
  const first = ctx.hits();
  eq(first[0].name, 'Pecorino di Nuoro', '7b. gli alimenti dell\'utente in cima');
  eq(first.length, 1 + 8, '7c. fuori dal limite: 1 dell\'utente + 8 del catalogo');
  ok('7d. prima che la rete risponda non c\'e\' la sezione Prodotti', !/data-food-section="prodotti"/.test(box.innerHTML));
  remoteResolve(Array.from({ length: 6 }, (_, i) => ({ name: 'Pesto ' + i, brand: 'Barilla', kcal: 500 })));
  await new Promise((r) => setImmediate(r));
  const all = ctx.hits();
  eq(all.length, 1 + 8 + 6, '7e. poi i 6 prodotti, in aggiunta: non tagliati dal limite locale');
  ok('7f. sotto una riga «PRODOTTI», dopo tutti i locali', box.innerHTML.indexOf('PRODOTTI') > box.innerHTML.lastIndexOf('data-food-idx="8"') && box.innerHTML.indexOf('PRODOTTI') < box.innerHTML.indexOf('data-food-idx="9"'));
  ok('7g. con la marca visibile', (box.innerHTML.match(/Barilla/g) || []).length === 6);
  // A newer query: an old network answer must not land in it.
  ctx.filterFoodDb('ris');
  timers[timers.length - 1].fn();
  const stale = remoteResolve;
  ctx.filterFoodDb('riso');
  timers[timers.length - 1].fn();
  stale([{ name: 'Vecchio', brand: 'X' }]);
  await new Promise((r) => setImmediate(r));
  ok('7h. una risposta arrivata tardi per un testo gia\' cambiato si butta', !/Vecchio/.test(box.innerHTML));
  ok('7i. il modulo e\' caricato dalla pagina, in cache e nell\'app', /<script src="food-search\.js"><\/script>/.test(SRC) &&
    fs.readFileSync(path.join(root, 'web/sw.js'), 'utf8').includes("'./food-search.js'") &&
    fs.readFileSync(path.join(root, 'sync_web_assets.mjs'), 'utf8').includes("'food-search.js'"));
}

console.log('\n--- 8. il server risponde subito anche se una fonte e\' lenta ---');
{
  const { searchFoodMulti } = await import('./server/food/index.mjs');
  const realFetch = globalThis.fetch;
  let started = 0;
  globalThis.fetch = () => { started++; return new Promise(() => {}); };
  const t0 = Date.now();
  const res = await searchFoodMulti('nutella', { FOOD_SOURCE_DEADLINE_MS: '120', FATSECRET_CLIENT_ID: 'x', FATSECRET_CLIENT_SECRET: 'y' }, { lang: 'it' });
  const ms = Date.now() - t0;
  globalThis.fetch = realFetch;
  ok('8a. le fonti sono partite', started >= 1);
  ok('8b. e la risposta arriva al tempo limite, non quando le fonti si svegliano (' + ms + ' ms)', ms < 600);
  ok('8c. senza errori: una lista, magari vuota', Array.isArray(res.items));
  ok('8d. il tempo limite predefinito per fonte e\' 800 ms', /const FOOD_SOURCE_DEADLINE_MS = 800;/.test(fs.readFileSync(path.join(root, 'server/food/index.mjs'), 'utf8')));
}

console.log('\n--- 9. dalla rete solo cibo plausibile ---');
{
  const { isPlausibleFoodResult: keep, FOOD_KCAL_MAX_PER_100, searchFoodMulti } = await import('./server/food/index.mjs');
  const off = (name, kcal) => ({ name, kcalPer100: kcal, provenance: { source: 'open_food_facts' } });
  const chain = (name, brand) => ({ name, brand, kcalPer100: 250, provenance: { source: 'official_restaurant_data' } });
  ok('9a. 0 kcal non e\' cibo: «Pet toothbrush», «Himalaya Pet Food» fuori', !keep(off('Pet toothbrush', 0), 'pet') && !keep(off('Himalaya Pet Food', 0), 'pet'));
  ok('9b. sopra 900 kcal/100 g e\' un dato sbagliato: «Riso Freyja» a 2362 fuori', !keep(off('Riso Freyja', 2362), 'ris'));
  ok('9c. l\'olio a 884 e i 900 esatti restano', keep(off('Olio EVO', 884), 'oli') && keep(off('Burro chiarificato', FOOD_KCAL_MAX_PER_100), 'bur'));
  ok('9d. un valore mancante non passa', !keep(off('Senza valori', undefined), 'sen') && !keep(off('Testo', 'abc'), 'tes'));
  ok('9e. «ris» non porta piu\' «Crispy McBacon» ne\' i «Crispy Tenders»', !keep(chain('Crispy McBacon', "McDonald's"), 'ris') && !keep(chain('Colonel Crispy Tenders (3 pz)', 'KFC'), 'ris'));
  ok('9f. il menu resta per chi lo cerca: «big» → Big Mac, «mcdo» → i prodotti McDonald\'s', keep(chain('Big Mac', "McDonald's"), 'big') && keep(chain('Big Mac', "McDonald's"), 'mcdo'));
  ok('9g. un prodotto vero con la marca nel nome resta: «Pet milk» 110 kcal', keep(off('Pet milk', 110), 'pet'));
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => ({
    ok: true, status: 200,
    json: async () => ({ hits: [
      { product_name: 'Pet toothbrush', brands: ['Charles pet'], nutriments: { 'energy-kcal_100g': 0 }, code: '1' },
      { product_name: 'Pet milk', brands: ['Pet'], nutriments: { 'energy-kcal_100g': 110 }, code: '2' }
    ] })
  });
  const res = await searchFoodMulti('pet', { FOOD_SOURCE_DEADLINE_MS: '500' }, { lang: 'it' });
  globalThis.fetch = realFetch;
  const got = res.items.map((i) => i.name);
  ok('9h. e il filtro e\' applicato alla ricerca vera del server: ' + JSON.stringify(got), got.includes('Pet milk') && !got.includes('Pet toothbrush'));
}

console.log('\n--- 10. dalla rete solo cio\' che il testo nomina ---');
{
  const { isRelevantFoodResult: rel } = await import('./server/food/index.mjs');
  ok('10a. «ris» non porta «Kinder Tricky» ne\' le costine', !rel({ name: 'Kinder Tricky', brand: 'Kinder' }, 'ris') && !rel({ name: 'Costine Montgomery Inn', originalName: 'Montgomery Inn Ribs', brand: 'Montgomery Inn' }, 'ris'));
  ok('10b. «big mac» non porta «Guinea Pig» ne\' «Big Red»: tutte le parole devono esserci', !rel({ name: 'Guinea Pig' }, 'big mac') && !rel({ name: 'Big Red (Bottle)', brand: 'Big Red' }, 'big mac'));
  ok('10c. restano Riso Rema, Big Mac, Pet milk, Nutella & GO!', rel({ name: 'Riso Rema', brand: 'Rema' }, 'ris') && rel({ name: 'Big Mac', brand: "McDonald's" }, 'big mac') && rel({ name: 'Pet milk', brand: 'Pet' }, 'pet') && rel({ name: 'Nutella & GO!', brand: 'Nutella' }, 'nutella'));
  ok('10d. conta anche il nome tradotto: «Jasmine rice» diventato «Riso jasmine» resta per «riso»', rel({ name: 'Riso jasmine', originalName: 'Jasmine rice' }, 'riso'));
  ok('10e. e la marca: «mcdo» → Big Mac di McDonald\'s', rel({ name: 'Big Mac', brand: "McDonald's" }, 'mcdo'));
  ok('10f. accenti e punteggiatura non contano', rel({ name: 'Caffè d\'orzo' }, 'caffe orz') && rel({ name: 'Yogurt greco 0%' }, 'greco'));
  ok('10g. la route filtra dopo la traduzione', /background: true \}\);\s*\n(?:\s*\/\/[^\n]*\n)*\s*result\.items = result\.items\.filter\(\(it\) => isRelevantFoodResult\(it, q\)\);/.test(fs.readFileSync(path.join(root, 'server/food/index.mjs'), 'utf8').replace(/\r\n/g, '\n')));
}

console.log('\n' + (failed ? failed + ' controlli falliti' : 'tutti i controlli passano'));
process.exit(failed ? 1 : 0);
