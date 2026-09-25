// I valori ufficiali CREA nel catalogo.
//
// Quattro pezzi: i dati estratti (data/food-crea.json), il matcher che
// aggancia le nostre voci agli alimenti CREA, il riordino dei nomi CREA in
// italiano leggibile, e la fusione che da' la precedenza ai valori CREA senza
// creare doppioni. Piu' la pagina: la fonte sotto ogni alimento.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
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

const crea = JSON.parse(fs.readFileSync(path.join(root, 'data/food-crea.json'), 'utf8'));
const { matchStaple, matchAll, keyWords } = await import('./tools/match_crea.mjs');
const { creaReadableName, creaCategory, mergeCrea, buildFoodCatalog, CREA_NEW_RANK } = await import('./tools/build_food_catalog.mjs');
const { parseCreaFood, creaNumber, creaState } = await import('./tools/fetch_crea.mjs');

console.log('\n--- 1. i dati CREA ---');
{
  ok('1a. almeno 700 alimenti (' + crea.foods.length + ')', crea.foods.length >= 700);
  ok('1b. ognuno con URL della scheda e valori per 100 g', crea.foods.every((f) => /^https:\/\/www\.alimentinutrizione\.it\/tabelle-nutrizionali\/[0-9A-Z]+$/.test(f.url) &&
    ['kcal', 'pro', 'carb', 'fat'].every((k) => typeof f.per100[k] === 'number')));
  ok('1c. con la citazione', /CREA/.test(crea.citation) && /2019/.test(crea.citation));
  eq(crea.failed.length, 0, '1d. nessuna scheda fallita');
  eq([creaNumber('11.3'), creaNumber('tr'), creaNumber(''), creaNumber('-'), creaNumber('2,5')], [11.3, 0, null, null, 2.5], '1e. numeri: «tr» (tracce) e\' 0, un vuoto resta vuoto');
  eq([creaState('Pollo, petto, crudo'), creaState('Riso, brillato, cotto, bollito'), creaState('Latte di vacca, intero')].map((s) => s.state + '/' + s.method), ['crudo/null', 'cotto/bollito', 'null/null'], '1f. crudo e cotto solo quando il nome lo dice');
  const html = '<h1 class="article-title" itemprop="name">Pollo, petto, crudo<meta itemprop="url" /></h1>' +
    '<tr><td>Categoria</td><td>Carni fresche</td></tr><tr><td>Codice Alimento</td><td>106500</td></tr><tr><td>Porzione</td><td>100 g</td></tr>' +
    '<tr class="corponutriente"><td>Energia (kcal)</td><td>kcal</td><td>100&nbsp;<i class="fa">x</i></td></tr>' +
    '<tr class="corponutriente"><td>Proteine (g)</td><td>g</td><td>23.3</td></tr><tr class="corponutriente"><td>Lipidi (g)</td><td>g</td><td>0.8</td></tr>' +
    '<tr class="corponutriente"><td>Carboidrati disponibili (g)</td><td>g</td><td>tr</td></tr>';
  const f = parseCreaFood(html, '106500');
  eq([f.name, f.category, f.per100.kcal, f.per100.pro, f.per100.carb, f.portion_g], ['Pollo, petto, crudo', 'Carni fresche', 100, 23.3, 0, 100], '1g. la scheda si legge: nome, categoria, valori, porzione');
}

console.log('\n--- 2. il matcher: certa, ambigua, nessuna ---');
{
  const foods = [
    { code: '1', name: 'Pollo, petto, crudo', state: 'crudo' },
    { code: '2', name: 'Pollo, petto, cotto, in padella', state: 'cotto' },
    { code: '3', name: 'Mele, fresche, con buccia', state: null },
    { code: '4', name: 'Mele, fresche, golden', state: null },
    { code: '5', name: 'Spigola', state: null }
  ];
  eq(matchStaple({ name: 'Petto di pollo' }, foods, {}).match.code, '1', '2a. «Petto di pollo» → «Pollo, petto, crudo»: stesse parole, stato crudo');
  eq(matchStaple({ name: 'Petto di pollo cotto' }, foods, {}).match.code, '2', '2b. la voce cotta va sulla scheda cotta');
  const mela = matchStaple({ name: 'Mela' }, foods, {});
  eq([mela.status, mela.candidates.length], ['ambigua', 2], '2c. «Mela» con due varietà: ambigua, con la lista');
  eq(matchStaple({ name: 'Mela' }, foods, { 'Mela': '3' }).match.code, '3', '2d. la decisione in crea-aliases.json la chiude');
  eq(matchStaple({ name: 'Branzino' }, foods, {}).status, 'nessuna', '2e. «Branzino»: il CREA lo chiama Spigola, senza sinonimo non c\'e\'');
  eq(matchStaple({ name: 'Branzino' }, foods, { 'Branzino': '5' }).match.name, 'Spigola', '2f. con il sinonimo si');
  eq(matchStaple({ name: 'Skyr' }, foods, { 'Skyr': null }).status, 'nessuna', '2g. null dice: senza equivalente CREA');
  eq(matchStaple({ name: 'Mela' }, foods, { 'Mela': '999' }).status, 'nessuna', '2h. un sinonimo verso un codice che non esiste non aggancia');
  eq(keyWords('Petto d\'anatra').food, ['petto', 'anatra'], '2i. le parole che contano: senza preposizioni e apostrofi');
  const aliasFile = JSON.parse(fs.readFileSync(path.join(root, 'data/crea-aliases.json'), 'utf8'));
  ok('2j. crea-aliases.json dichiara in cima la regola della variante piu\' comune', /piu' comune nel consumo italiano/.test(aliasFile._regola));
  const staples = JSON.parse(fs.readFileSync(path.join(root, 'food-staples.json'), 'utf8'));
  const report = matchAll(staples, crea.foods, Object.fromEntries(Object.entries(aliasFile).filter(([k]) => k.charAt(0) !== '_')));
  eq(report.filter((r) => r.status === 'ambigua').length, 0, '2k. sulle nostre voci nessuna ambigua resta aperta');
}

console.log('\n--- 3. il nome leggibile ---');
{
  const subs = { 'bovino adulto o vitellone': 'manzo', 'uova di gallina': 'uovo', 'di uovo': "d'uovo" };
  eq(creaReadableName('Pollo, petto, crudo'), 'Petto di pollo, crudo', '3a. «Pollo, petto, crudo» → «Petto di pollo, crudo»');
  eq(creaReadableName('Riso, brillato, cotto, bollito'), 'Riso brillato, cotto, bollito', '3b. «Riso, brillato» → «Riso brillato», lo stato dopo la virgola');
  eq(creaReadableName('Gelato confezionato, cacao, in vaschetta'), 'Gelato confezionato, cacao, in vaschetta', '3c. un nome gia\' composto tiene la virgola');
  eq(creaReadableName('Bovino adulto o vitellone, girello, crudo', null, subs), 'Girello di manzo, crudo', '3d. «Bovino adulto o vitellone» → manzo');
  eq(creaReadableName('Uova di gallina, tuorlo', null, subs), 'Tuorlo d\'uovo', '3e. «Uova di gallina, tuorlo» → «Tuorlo d\'uovo»');
  eq(creaReadableName('Merluzzo o nasello, baccalà, secco', 'Baccalà, secco'), 'Baccalà, secco', '3f. un nome scritto a mano vince');
  eq(creaCategory({ category: 'Latte e yogurt', name: 'Latte di capra' }), 'Bevande', '3g. categorie: il latte e\' una bevanda');
  eq(creaCategory({ category: 'Latte e yogurt', name: 'Yogurt caprino' }), 'Proteine', '3h. lo yogurt una proteina, come nel nostro elenco');
  eq(creaCategory({ category: 'Ricette Italiane', name: 'Pasta al pomodoro', per100: { pro: 5, carb: 30, fat: 4 } }), 'Carboidrati', '3i. una ricetta va dove sta la maggior parte dell\'energia');
}

console.log('\n--- 4. la fusione: precedenza CREA, nessun doppione ---');
{
  const staples = [
    { id: 's1', name: 'Petto di pollo', name_en: 'Chicken breast', category: 'Proteine', kcal: 110, pro: 23, carb: 0, fat: 1.2, rank: 0 },
    { id: 's2', name: 'Skyr', name_en: 'Skyr', category: 'Proteine', kcal: 63, pro: 11, carb: 4, fat: 0.2, rank: 1 }
  ];
  const mini = { foods: [
    { code: '106500', name: 'Pollo, petto, crudo', category: 'Carni fresche', state: 'crudo', per100: { kcal: 100, pro: 23.3, carb: 0, fat: 0.8, fiber: 0 }, url: 'https://www.alimentinutrizione.it/tabelle-nutrizionali/106500' },
    { code: '106400', name: 'Pollo, fuso, con pelle, crudo', category: 'Carni fresche', state: 'crudo', per100: { kcal: 125, pro: 18, carb: 0, fat: 5.6 }, url: 'https://www.alimentinutrizione.it/tabelle-nutrizionali/106400' }
  ] };
  const { entries } = mergeCrea(staples, mini, { Skyr: null }, {});
  const pollo = entries.find((e) => e.name === 'Petto di pollo');
  eq([pollo.kcal, pollo.pro, pollo.fat, pollo.source, pollo.crea_code], [100, 23.3, 0.8, 'crea', '106500'], '4a. la voce agganciata prende i valori CREA, con codice e URL');
  eq([pollo.name, pollo.category, pollo.rank], ['Petto di pollo', 'Proteine', 0], '4b. e tiene il nostro nome, la categoria e il rank');
  eq(entries.find((e) => e.name === 'Skyr').source, 'nurvan', '4c. quella senza equivalente resta nurvan, con i suoi valori');
  const fuso = entries.find((e) => e.crea_code === '106400');
  eq([fuso.name, fuso.rank >= CREA_NEW_RANK, fuso.source], ['Fuso di pollo, con pelle, crudo', true, 'crea'], '4d. il CREA non usato entra come voce nuova, in coda');
  eq(entries.filter((e) => e.crea_code === '106500').length, 1, '4e. «Pollo, petto, crudo» c\'e\' una volta sola: niente doppione crea/nurvan');
  let err = '';
  try { mergeCrea(staples.concat([{ id: 's3', name: 'Petto pollo', category: 'Proteine', kcal: 1, pro: 1, carb: 1, fat: 1, rank: 2 }]), mini, { 'Petto pollo': '106500', Skyr: null }, {}); } catch (e) { err = e.message; }
  ok('4f. due nostre voci sullo stesso alimento CREA: rifiutato', /doppione/.test(err));
  err = '';
  try { mergeCrea(staples, mini, { 'Voce inesistente': '106500', Skyr: null }, {}); } catch (e) { err = e.message; }
  ok('4g. una decisione su una voce che non c\'e\': rifiutata', /non e' una voce di food-staples/.test(err));
  err = '';
  try { mergeCrea(staples.concat([{ id: 's4', name: 'Fuso di pollo, con pelle, crudo', category: 'Proteine', kcal: 1, pro: 1, carb: 1, fat: 1, rank: 3 }]), mini, { Skyr: null, 'Fuso di pollo, con pelle, crudo': null }, {}); } catch (e) { err = e.message; }
  ok('4h. un nome CREA leggibile uguale a una nostra voce: rifiutato (si corregge in crea-names.json)', /crea-names\.json/.test(err));
}

console.log('\n--- 5. il catalogo generato ---');
{
  const { FOOD_CATALOG } = await import('./food-catalog.mjs');
  const bySource = {};
  FOOD_CATALOG.forEach((f) => { bySource[f.source] = (bySource[f.source] || 0) + 1; });
  const pollo = FOOD_CATALOG.find((f) => f.name === 'Petto di pollo');
  eq([pollo.source, pollo.kcal, pollo.pro, pollo.fat, pollo.crea_url], ['crea', 100, 23.3, 0.8, 'https://www.alimentinutrizione.it/tabelle-nutrizionali/106500'], '5a. «Petto di pollo» ha i valori CREA e il link alla scheda');
  ok('5b. ogni voce crea ha URL e nome CREA', FOOD_CATALOG.filter((f) => f.source === 'crea').every((f) => f.crea_url && f.crea_name));
  const codes = FOOD_CATALOG.filter((f) => f.crea_code).map((f) => f.crea_code);
  eq(codes.length, new Set(codes).size, '5c. nessun alimento CREA compare due volte');
  eq(Object.keys(bySource).sort(), ['crea', 'nurvan'], '5d. due sole fonti: crea e nurvan (' + JSON.stringify(bySource) + ')');
  const latte = FOOD_CATALOG.find((f) => f.name === 'Latte intero');
  ok('5e. le generiche tolte restano come alias: «Latte» porta a Latte intero, «Uovo» a Uovo intero',
    latte.aliases.includes('Latte') && FOOD_CATALOG.find((f) => f.name === 'Uovo intero').aliases.includes('Uovo') && !FOOD_CATALOG.some((f) => f.name === 'Latte' || f.name === 'Uovo'));
  let fresh = true;
  try { (await import('node:child_process')).execFileSync(process.execPath, [path.join(root, 'tools/build_food_catalog.mjs'), '--check'], { stdio: 'pipe' }); } catch (_) { fresh = false; }
  ok('5f. food-catalog.mjs e\' quello che il generatore produce dalle fonti', fresh);
}

console.log('\n--- 6. nella pagina: la fonte sotto ogni alimento ---');
{
  const SRC = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8').replace(/\r\n/g, '\n');
  const vm = await import('node:vm');
  const grab = (name) => { const a = SRC.indexOf('function ' + name + '('); const b = SRC.indexOf('\n}', a); return SRC.slice(a, b + 2); };
  const ctx = { esc: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;') };
  vm.createContext(ctx);
  vm.runInContext([grab('foodProvenanceFor'), grab('creaPageUrl'), grab('foodSourceLabelHtml')].join('\n'), ctx);
  const creaFood = { name: 'Petto di pollo', source: 'crea', crea_url: 'https://www.alimentinutrizione.it/tabelle-nutrizionali/106500', crea_name: 'Pollo, petto, crudo' };
  const html = ctx.foodSourceLabelHtml({ provenance: ctx.foodProvenanceFor(creaFood) });
  ok('6a. voce CREA: «Fonte: CREA 2019» con il link alla scheda', /Fonte: CREA 2019/.test(html) && /href="https:\/\/www\.alimentinutrizione\.it\/tabelle-nutrizionali\/106500"/.test(html) && /rel="noopener"/.test(html));
  ok('6b. voce nostra: «Fonte: Nurvan»', /Fonte: Nurvan/.test(ctx.foodSourceLabelHtml({ provenance: ctx.foodProvenanceFor({ source: 'nurvan' }) })));
  ok('6c. prodotto: la marca', /Ferrero/.test(ctx.foodSourceLabelHtml({ brand: 'Ferrero', provenance: { source: 'open_food_facts' } })));
  ok('6d. un link che non porta al CREA non diventa un link', !/href/.test(ctx.foodSourceLabelHtml({ provenance: { source: 'crea', url: 'javascript:alert(1)' } })));
  ok('6e. la riga del piano e del diario la mostra', /\$\{foodSourceLabelHtml\(f\)\}/.test(SRC));
  const lib = { self: {} };
  vm.createContext(lib);
  vm.runInContext(fs.readFileSync(path.join(root, 'web/food-search.js'), 'utf8'), lib);
  const S = lib.self.NurvanFoodSearch;
  const tie = S.rank([{ name: 'Mela rossa', rank: 1, source: 'nurvan' }, { name: 'Mela verde', rank: 5, source: 'crea' }], 'mela');
  eq(tie.map((f) => f.name), ['Mela verde', 'Mela rossa'], '6f. nella ricerca, a parita\' di punteggio, CREA prima di Nurvan');
  const added = S.rank([{ name: 'Olio di girasole', rank: 1000, source: 'crea' }, { name: "Tonno all'olio", rank: 9, source: 'crea' }], 'oli');
  eq(added.map((f) => f.name), ["Tonno all'olio", 'Olio di girasole'], '6g. un alimento CREA aggiunto viene dopo le nostre voci (-25)');
}

console.log('\n' + (failed ? failed + ' controlli falliti' : 'tutti i controlli passano'));
process.exit(failed ? 1 : 0);
