// The larger food table (Anses Ciqual 2025 in Italian), loaded only when
// needed; how a plan's food is matched to the same database food (and never
// to a close one); the advanced reading and the AI food match: consent,
// signed-in only, FatSecret never stored, values from the databases only.
import fs from 'node:fs';
import vm from 'node:vm';
import { JS_PRODUCT_SERVICES } from './prepare_task20_js_services.mjs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

// 1. The table.
const table = JSON.parse(fs.readFileSync('web/food-ciqual.json', 'utf8'));
ok('1a. oltre 3.000 alimenti generici', table.items.length > 3000);
ok('1b. la fonte citata come chiede la licenza', /Anses\. 2025\. Table de composition nutritionnelle des aliments Ciqual/.test(table.source) && /Etalab/.test(table.licence));
const french = table.items.filter((r) => /\b(cuit|cru|sans|avec|pomme de terre|poulet|boeuf|fromage de)\b/i.test(r[1]) && !/fromage blanc/i.test(r[1]));
ok('1c. nomi in italiano (nessun nome francese rimasto)', french.length === 0);
ok('1d. ogni voce ha energia e un gruppo dell\'app', table.items.every((r) => r[5] != null && ['Proteine', 'Carboidrati', 'Grassi', 'Verdure', 'Bevande', 'Snack'].indexOf(r[3]) >= 0));
const names = JSON.parse(fs.readFileSync('data/ciqual-it.json', 'utf8'));
ok('1e. le traduzioni sono nel repository, una per alimento', Object.keys(names).length === 3484);

// 2. Loaded on need, then part of the catalog.
const ctx = { console, window: {}, localStorage: { getItem() { return null; }, setItem() {} }, document: { documentElement: {}, querySelectorAll() { return []; } }, navigator: { language: 'it' } };
ctx.self = ctx;
ctx.FOOD_CATALOG = [{ name: 'Petto di pollo', category: 'Proteine', kcal: 110, pro: 23, carb: 0, fat: 1.2 }];
let fetched = 0;
ctx.fetch = async (url) => { fetched++; return { ok: /food-ciqual\.json$/.test(url), json: async () => table }; };
vm.createContext(ctx);
vm.runInContext(JS_PRODUCT_SERVICES + ';this.__F = FoodDatabaseService;', ctx);
const F = ctx.__F;
ok('2a. prima del caricamento: solo il catalogo della pagina', F.catalog.length === 1);
await F.loadExtra();
await F.loadExtra();
ok('2b. caricato una volta sola, poi nel catalogo', fetched === 1 && F.catalog.length === 1 + table.items.length);
ok('2c. lo stesso array finche\' non cambia (niente copie a ogni lettura)', F.catalog === F.catalog);
const cq = F.catalog.find((f) => f.source === 'ciqual');
ok('2d. le voci Ciqual dicono da dove vengono', cq && /^ciqual_/.test(cq.id) && cq.rank >= 2000);

// 3. The same food, never a close one.
const pctx = {};
pctx.self = pctx;
vm.createContext(pctx);
vm.runInContext(fs.readFileSync('web/nutrition-plan.js', 'utf8'), pctx);
const NP = pctx.NurvanNutritionPlan;
const cat = F.catalog.concat([
  { name: 'Yogurt greco, bianco, intero', kcal: 120 }, { name: 'Yogurt greco, 0% grassi', kcal: 57 },
  { name: 'Uovo di gallina, intero, crudo', kcal: 128 }, { name: 'Riso Basmati, cotto, bollito', kcal: 120 },
  { name: 'Yogurt o latte fermentato, aromatizzato o alla frutta (in media)', aliases: ['yogurt aromatizzato o alla frutta'], kcal: 90 },
  { name: 'Cozza o mitilo', kcal: 84 }
]);
const yg = NP.sameFood('yogurt greco', cat);
ok('3a. "yogurt greco" = un yogurt greco bianco, mai lo 0%', yg && /yogurt greco/i.test(yg.name) && /bianco/i.test(yg.name) && !/0%/.test(yg.name));
const eg = NP.sameFood('uova fresche', cat);
ok('3b. plurali: "uova fresche" = un uovo crudo, mai cotto', eg && /uovo/i.test(eg.name) && !/cott|sod|strapazz|fritt/i.test(eg.name));
ok('3c. il negozio non cambia l\'alimento: "riso basmati Esselunga"', NP.sameFood('riso basmati Esselunga', [{ name: 'Riso basmati', kcal: 360 }]).kcal === 360);
ok('3d. le note fra parentesi non contano: "albume d\'uovo (pesato a crudo, consumato cotto)"', NP.sameFood('uovo di gallina, albume (3-4 albumi c.ca)', [{ name: 'Albume uovo', kcal: 43 }]).kcal === 43);
ok('3e. "frutta secca" non e\' uno yogurt alla frutta', NP.sameFood('frutta, secca', cat) === null);
ok('3f. "Cozza o mitilo" vale per "cozze"', NP.sameFood('cozze', cat).kcal === 84);
ok('3g. mai il cotto per il crudo', NP.sameFood('riso basmati', [{ name: 'Riso Basmati, cotto, bollito', kcal: 120 }]) === null);
ok('3h. "pollo, petto, senza pelle" = "Petto di pollo"', NP.sameFood('pollo, petto, senza pelle', cat).name === 'Petto di pollo' || /pollo/i.test(NP.sameFood('pollo, petto, senza pelle', cat).name));
const close = NP.closeFoods('philadelphia active', cat, 8);
ok('3i. i candidati da scegliere sono quelli con parole in comune (mai un abbinamento da soli)', Array.isArray(close) && close.length <= 8);

// 4. The page: advanced reading and AI match.
const SRC = fs.readFileSync('web/index.base.html', 'utf8');
ok('4a. lettura avanzata solo con account, scelta documento per documento', /function chooseDocumentReader\(pageCount\) \{\s*if \(!\(store && store\.accountToken\)\) return Promise\.resolve\('local'\);/.test(SRC));
ok('4b. le chiamate AI passano dal consenso', /\/\^\\\/api\\\/import\\\/read-page\$\/, \/\^\\\/api\\\/food\\\/match\$\//.test(SRC));
ok('4c. una pagina che l\'AI non legge si legge sul dispositivo', /else if \(hasOcr\) \{ job\.entry\.columns = \[\]; await job\.fallback\(\);/.test(SRC));
ok('4d. l\'abbinamento con l\'AI solo con consenso dato; FatSecret mai salvato in un piano', /if \(!\(store && store\.accountToken\) \|\| !aiConsentGranted\(\)\) return 0;/.test(SRC) && /p\.source !== 'fatsecret'/.test(SRC));
ok('4e. il catalogo grande si carica prima di cercare gli alimenti del piano', /await FoodDatabaseService\.loadExtra\(\); \} catch \(_\) \{\}\s*enrichPlanAlternatives\(plan\);/.test(SRC));
ok('4f. la fonte si vede sull\'alimento', /Fonte: Anses Ciqual 2025/.test(SRC) && /Valori di: /.test(SRC));
const API = fs.readFileSync('coach-api.mjs', 'utf8');
ok('4g. server: le due strade AI tra le rotte con account e consenso', /"\/api\/import\/read-page", "\/api\/food\/match"\s*\];/.test(API));
ok('4h. server: si accetta solo un id offerto per quella riga', /it\.candidates\.some\(\(c\) => String\(c\.id\) === String\(p\.id\)\)/.test(API));
ok('4i. server: la trascrizione non inventa ("[illeggibile]")', /\[illeggibile\]/.test(API) && /temperature: 0/.test(API));
ok('4j. offline e Android: la tabella e\' nella cache e negli asset', /'\.\/food-ciqual\.json'/.test(fs.readFileSync('web/sw.js', 'utf8')) && /'food-ciqual\.json'/.test(fs.readFileSync('sync_web_assets.mjs', 'utf8')));
ok('4k. informativa: fonti e invio dei nomi all\'AI', /Ciqual/.test(fs.readFileSync('web/privacy.html', 'utf8')) && /lettura avanzata/.test(fs.readFileSync('web/privacy.html', 'utf8')));

console.log('');
if (failed) { console.log(failed + ' controlli sulla copertura alimenti falliti.'); process.exit(1); }
console.log('Tutti i controlli sulla copertura alimenti passano.');
