// Genera food-catalog.mjs da food-staples.json.
//
// food-staples.json e' la fonte: un alimento per voce, nome italiano e
// inglese, categoria, macro per 100 g e `rank`, l'ordine del curatore dentro
// la categoria (0 = il piu' comune), che la ricerca usa come primo criterio
// a parita' di punteggio, prima della lunghezza del nome. food-catalog.mjs e'
// l'uscita: non si modifica a mano, si rigenera.
//
// Qui si controlla anche che i dati siano puliti: nessuna etichetta finta
// davanti al nome (Bio, Convenience, Generico, Premium, Sport, Supermarket:
// ripetevano lo stesso alimento con gli stessi valori), nessun apostrofo
// mancante ("Petto d anatra"), nessuna variante di cottura generata,
// nessun doppione, macro numeriche. Il campo
// `brand` resta nello schema per i prodotti veri (Open Food Facts), che
// arrivano dalla rete e non passano di qui.
//
//   node tools/build_food_catalog.mjs          scrive food-catalog.mjs
//   node tools/build_food_catalog.mjs --check  esce con 1 se l'uscita e' vecchia
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchAll } from './match_crea.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(root, 'food-staples.json');
const OUTPUT = path.join(root, 'food-catalog.mjs');
const CREA_FILE = path.join(root, 'data', 'food-crea.json');
const CREA_ALIASES = path.join(root, 'data', 'crea-aliases.json');
const CREA_NAMES = path.join(root, 'data', 'crea-names.json');

export const CREA_CITATION = 'CREA – Centro di ricerca Alimenti e Nutrizione, Tabelle di composizione degli alimenti, aggiornamento 2019 (alimentinutrizione.it)';

const FAKE_LABELS = ['Bio', 'Convenience', 'Generico', 'Premium', 'Sport', 'Supermarket'];
const MISSING_APOSTROPHE = /(^|\s)(d|l|all|dell|dall|nell|sull|un|quest)\s+[aeiouh]/i;
// Le "varianti di cottura" generate (riso basmati grigliato, mela lessato)
// avevano macro inventate e riempivano i risultati: non tornano.
const COOKING_VARIANT = / (al forno|al vapore|grigliat[oa]|in padella|lessat[oa])$/i;

/* ------------------------- CREA 2019 ------------------------- */
//
// data/food-crea.json (tools/fetch_crea.mjs) e data/crea-aliases.json (le
// decisioni sull'aggancio) entrano qui. Per ogni nostra voce agganciata a un
// alimento CREA (tools/match_crea.mjs) valori e macro diventano quelli CREA,
// con source "crea", l'URL della scheda e il nome CREA; le altre restano
// source "nurvan". Gli alimenti CREA che nessuna nostra voce usa entrano come
// voci nuove, con un nome leggibile, una delle nostre sei categorie e un rank
// in coda (da CREA_NEW_RANK in su), cosi' la ricerca le mette dopo le nostre.

export const CREA_NEW_RANK = 1000;

// "Pollo, petto, crudo" -> "Petto di pollo, crudo": il CREA scrive dal
// generale al particolare; quando la seconda parte e' un taglio o una parte
// dell'animale la si porta davanti. Altrimenti le prime due parti si leggono
// di seguito ("Riso, brillato" -> "Riso brillato") e il resto (stato, metodo)
// resta dopo la virgola. I casi brutti li corregge data/crea-names.json.
const CREA_PART_NOUNS = new Set(['petto', 'coscia', 'sovracoscia', 'fuso', 'ala', 'fesa', 'filetto', 'lombo', 'lombata',
  'costata', 'costoletta', 'costolette', 'cosciotto', 'spalla', 'girello', 'sottofesa', 'noce', 'pancia', 'reale',
  'controfiletto', 'scamone', 'collo', 'fegato', 'cuore', 'lingua', 'trippa', 'rognone', 'cervello', 'milza',
  'polmone', 'stinco', 'braciola', 'capocollo', 'polpa', 'tuorlo', 'albume', 'carre', 'carré', 'bistecca', 'muscolo',
  'coscio', 'geretto', 'copertina', 'tagli', 'sottospalla', 'punta', 'lacerto', 'fianchetto', 'petti', 'cosce', 'ali']);

// subs: { "bovino adulto o vitellone": "manzo", ... } - expressions replaced
// in the reordered name (data/crea-names.json, "sostituzioni").
function applyCreaSubs(text, subs) {
  let out = text;
  Object.keys(subs || {}).forEach((from) => {
    const esc = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp('(^|[^\\p{L}])' + esc + '(?=$|[^\\p{L}])', 'giu'), (m, lead) => lead + subs[from]);
  });
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export function creaReadableName(name, override, subs) {
  if (override) return override;
  return applyCreaSubs(creaReorder(name), subs);
}

function creaReorder(name) {
  const parts = String(name || '').split(/\s*,\s*/).filter(Boolean);
  if (parts.length < 2) return String(name || '').trim();
  const first = parts[0];
  const second = parts[1];
  const firstWord = second.split(/\s+/)[0].toLowerCase();
  let head;
  if (CREA_PART_NOUNS.has(firstWord)) {
    head = second.charAt(0).toUpperCase() + second.slice(1) + ' di ' + first.charAt(0).toLowerCase() + first.slice(1);
  } else if (!/\s/.test(first.trim())) {
    // One word ("Riso, brillato"): read on. A phrase ("Gelato confezionato,
    // biscotto...") is already a name: keep the comma.
    head = first + ' ' + second;
  } else {
    head = first + ', ' + second;
  }
  const rest = parts.slice(2).join(', ');
  const out = head + (rest ? ', ' + rest : '');
  return out.charAt(0).toUpperCase() + out.slice(1);
}

// Our six categories. Most CREA categories map straight; the mixed ones
// (recipes, ethnic dishes, various products) go where most of their energy
// comes from.
const CREA_CATEGORY = {
  'Dolci': 'Snack',
  'Prodotti della pesca': 'Proteine',
  'Verdure e ortaggi': 'Verdure',
  'Carni fresche': 'Proteine',
  'Frutta': 'Carboidrati',
  'Frutta secca a guscio e semi oleaginosi': 'Grassi',
  'Frattaglie': 'Proteine',
  'Cereali e derivati': 'Carboidrati',
  'Bevande alcoliche': 'Bevande',
  'Carni trasformate e conservate': 'Proteine',
  'Formaggi e latticini': 'Proteine',
  'Oli e grassi': 'Grassi',
  'Legumi': 'Proteine',
  'Fast-food a base di carne': 'Proteine',
  'Uova': 'Proteine'
};
export function creaCategory(food) {
  const c = food.category || '';
  if (c === 'Latte e yogurt') return /^latte\b/i.test(food.name) ? 'Bevande' : 'Proteine';
  if (CREA_CATEGORY[c]) return CREA_CATEGORY[c];
  const p = food.per100 || {};
  const kcal = { Proteine: (p.pro || 0) * 4, Carboidrati: (p.carb || 0) * 4, Grassi: (p.fat || 0) * 9 };
  return Object.keys(kcal).sort((a, b) => kcal[b] - kcal[a])[0];
}

function creaValues(food) {
  const p = food.per100 || {};
  const out = { kcal: p.kcal, pro: p.pro, carb: p.carb, fat: p.fat };
  if (p.fiber != null) out.fiber = p.fiber;
  if (p.sugars != null) out.sugars = p.sugars;
  if (p.water != null) out.water = p.water;
  return out;
}
function creaFields(food) {
  return { source: 'crea', crea_code: food.code, crea_name: food.name, crea_url: food.url };
}

// staples + CREA -> the entries the catalog is built from (still unsorted).
export function mergeCrea(staples, crea, aliasFile, nameOverrides) {
  const aliases = {};
  const errors = [];
  const stapleNames = new Set(staples.map((s) => s.name));
  Object.keys(aliasFile || {}).forEach((k) => {
    if (k.charAt(0) === '_') return;
    if (!stapleNames.has(k)) errors.push('crea-aliases.json: «' + k + '» non e\' una voce di food-staples.json');
    aliases[k] = aliasFile[k];
  });
  const report = matchAll(staples, crea.foods, aliases);
  report.forEach((r) => {
    if (r.status === 'ambigua') errors.push('aggancio ambiguo non deciso: «' + r.staple.name + '» (' + r.candidates.map((c) => c.code).join(', ') + ')');
    if (r.status === 'nessuna' && /non esiste/.test(r.reason)) errors.push('«' + r.staple.name + '»: ' + r.reason);
  });
  const used = new Map();
  report.forEach((r) => {
    if (r.status !== 'certa') return;
    if (used.has(r.match.code)) errors.push('lo stesso alimento CREA ' + r.match.code + ' per «' + used.get(r.match.code) + '» e «' + r.staple.name + '»: sarebbe un doppione');
    used.set(r.match.code, r.staple.name);
  });
  if (errors.length) throw new Error('aggancio CREA non valido:\n  ' + errors.join('\n  '));

  const entries = report.map((r) => {
    const s = r.staple;
    if (r.status === 'certa') {
      return Object.assign({}, s, creaValues(r.match), creaFields(r.match), {
        aliases: (s.aliases || []).concat([r.match.name])
      });
    }
    return Object.assign({}, s, { source: 'nurvan' });
  });

  const takenNames = new Map();
  entries.forEach((e) => {
    takenNames.set(e.name.toLowerCase(), e.name);
    (e.aliases || []).forEach((a) => takenNames.set(String(a).toLowerCase(), e.name));
  });
  const newcomers = crea.foods
    .filter((f) => !used.has(f.code))
    .map((f) => ({ f, name: creaReadableName(f.name, ((nameOverrides || {}).nomi || {})[f.code], (nameOverrides || {}).sostituzioni), category: creaCategory(f) }))
    .sort((a, b) => a.category.localeCompare(b.category, 'it') || a.name.localeCompare(b.name, 'it'));
  const perCategory = {};
  const dup = [];
  newcomers.forEach(({ f, name, category }) => {
    const key = name.toLowerCase();
    if (takenNames.has(key)) { dup.push(f.code + ' «' + name + '» = «' + takenNames.get(key) + '»'); return; }
    takenNames.set(key, name);
    perCategory[category] = (perCategory[category] || 0) + 1;
    entries.push(Object.assign({
      id: 'crea_' + f.code,
      name: name,
      name_en: f.name_en || '',
      category: category,
      serving: '100g',
      unit: 'g',
      rank: CREA_NEW_RANK + perCategory[category] - 1,
      aliases: name === f.name ? [] : [f.name]
    }, creaValues(f), creaFields(f)));
  });
  if (dup.length) throw new Error('nomi CREA leggibili uguali a voci esistenti (data/crea-names.json):\n  ' + dup.join('\n  '));
  return { entries, report };
}

// opts.crea / opts.aliases / opts.names: the CREA data and decisions. Without
// them the catalog is our staples alone, all source "nurvan".
export function buildFoodCatalog(staples, opts = {}) {
  const errors = [];
  const seenId = new Set();
  const seenName = new Set();
  staples.forEach((f, i) => {
    const where = '#' + i + ' ' + (f && f.name);
    if (!f || !f.id || !f.name) { errors.push(where + ': id o nome mancante'); return; }
    if (seenId.has(f.id)) errors.push(where + ': id doppio ' + f.id);
    seenId.add(f.id);
    const key = f.name.toLowerCase();
    if (seenName.has(key)) errors.push(where + ': nome doppio');
    seenName.add(key);
    if (FAKE_LABELS.some((l) => f.name.startsWith(l + ' '))) errors.push(where + ': etichetta finta davanti al nome');
    if (f.brand) errors.push(where + ': brand in un alimento base');
    if (MISSING_APOSTROPHE.test(f.name)) errors.push(where + ': apostrofo mancante');
    if (COOKING_VARIANT.test(f.name) || /_v\d+$/.test(f.id)) errors.push(where + ': variante di cottura');
    ['kcal', 'pro', 'carb', 'fat', 'rank'].forEach((k) => {
      if (typeof f[k] !== 'number' || !Number.isFinite(f[k])) errors.push(where + ': ' + k + ' non numerico');
    });
  });
  if (errors.length) throw new Error('food-staples.json non valido:\n  ' + errors.join('\n  '));

  const entries = opts.crea
    ? mergeCrea(staples, opts.crea, opts.aliases || {}, opts.names || {}).entries
    : staples.map((f) => Object.assign({}, f, { source: 'nurvan' }));
  const catalog = entries
    .map((f) => {
      const aliases = [];
      [f.name, f.name_en, String(f.name).toLowerCase(), String(f.name_en || '').toLowerCase()].concat(f.aliases || []).forEach((a) => {
        if (a && aliases.indexOf(a) < 0) aliases.push(a);
      });
      const out = {
        id: f.id, name: f.name, name_en: f.name_en || '', aliases: aliases,
        category: f.category, kcal: f.kcal, pro: f.pro, carb: f.carb, fat: f.fat,
        serving: f.serving || '100g', unit: f.unit || 'g', rank: f.rank, source: f.source
      };
      ['fiber', 'sugars', 'water', 'crea_code', 'crea_name', 'crea_url'].forEach((k) => { if (f[k] != null) out[k] = f[k]; });
      return out;
    })
    .sort((a, b) => a.category.localeCompare(b.category, 'it') || a.rank - b.rank || a.name.localeCompare(b.name, 'it'));
  const categories = [...new Set(catalog.map((f) => f.category))].sort((a, b) => a.localeCompare(b, 'it'));

  const names = new Set();
  catalog.forEach((f) => {
    const k = f.name.toLowerCase();
    if (names.has(k)) throw new Error('nome doppio nel catalogo: ' + f.name);
    names.add(k);
    ['kcal', 'pro', 'carb', 'fat'].forEach((m) => { if (typeof f[m] !== 'number' || !Number.isFinite(f[m])) throw new Error(f.name + ': ' + m + ' non numerico'); });
  });

  return '/** GENERATO da tools/build_food_catalog.mjs a partire da food-staples.json e data/food-crea.json: non modificare a mano. */\n' +
    '/** Valori CREA: ' + CREA_CITATION + '. */\n' +
    'export const FOOD_CATALOG = ' + JSON.stringify(catalog) + ';\n' +
    'export const FOOD_CATEGORIES = ' + JSON.stringify(categories) + ';\n' +
    '// La ricerca vera e\' web/food-search.js (NurvanFoodSearch): pertinenza, uso\n' +
    '// recente, limite. Questa resta per chi carica il catalogo senza la pagina.\n' +
    'export function searchFoodCatalog(query, limit = 8) {\n' +
    "  if (typeof self !== 'undefined' && self.NurvanFoodSearch) return self.NurvanFoodSearch.rank(FOOD_CATALOG, query, { limit: limit });\n" +
    "  const q = String(query || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();\n" +
    '  if (!q) return [];\n' +
    "  return FOOD_CATALOG.filter((f) => f.name.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').includes(q)).slice(0, limit);\n" +
    '}\n' +
    'export default { FOOD_CATALOG, FOOD_CATEGORIES, searchFoodCatalog };\n';
}

const direct = /build_food_catalog\.mjs$/.test(String(process.argv[1] || '').replace(/\\/g, '/'));
if (direct) {
  const staples = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  const readJson = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);
  const out = buildFoodCatalog(staples, { crea: readJson(CREA_FILE), aliases: readJson(CREA_ALIASES) || {}, names: readJson(CREA_NAMES) || {} });
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, 'utf8').replace(/\r\n/g, '\n') : '';
    if (now !== out) { console.error('food-catalog.mjs non corrisponde a food-staples.json: rigenera con node tools/build_food_catalog.mjs'); process.exit(1); }
    console.log('food-catalog.mjs aggiornato (' + staples.length + ' voci)');
  } else {
    fs.writeFileSync(OUTPUT, out, 'utf8');
    console.log('food-catalog.mjs scritto: ' + staples.length + ' voci');
  }
}
