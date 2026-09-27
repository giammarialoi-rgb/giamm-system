// Builds web/food-ciqual.json: the Anses Ciqual 2025 food table (3,484 generic
// foods, values per 100 g) with Italian names, for the app's food search and
// for reading nutritionists' plans. Loaded by the app only when needed
// (FoodDatabaseService.loadExtra), never inside the page.
//
// Licence: Etalab Open Licence 2.0 - reuse allowed, source to be cited:
// "Anses. 2025. Table de composition nutritionnelle des aliments Ciqual."
// The app shows "Fonte: Anses Ciqual 2025" on every food taken from it.
//
//   node tools/build_food_ciqual.mjs --fetch   downloads the table into .food-sources/ (git-ignored)
//   node tools/build_food_ciqual.mjs           writes web/food-ciqual.json
//
// The Italian names are ours, in data/ciqual-it.json ({ code: { it, aliases } }):
// the build stops if a food has none, so no French name reaches the app.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const SRC = path.join(root, '.food-sources');
const NAMES = path.join(root, 'data', 'ciqual-it.json');
const OUT = path.join(root, 'web', 'food-ciqual.json');
export const CIQUAL_CITATION = 'Anses. 2025. Table de composition nutritionnelle des aliments Ciqual.';

// Recherche Data Gouv, doi:10.57745/RDMHWY (Ciqual 2025, 2025-11-03).
const FILES = {
  'ciqual2025.xlsx': 'https://entrepot.recherche.data.gouv.fr/api/access/datafile/666260',
  'alim.xml': 'https://entrepot.recherche.data.gouv.fr/api/access/datafile/666252'
};

async function fetchSources() {
  fs.mkdirSync(SRC, { recursive: true });
  for (const [name, url] of Object.entries(FILES)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(name + ': HTTP ' + res.status);
    fs.writeFileSync(path.join(SRC, name), Buffer.from(await res.arrayBuffer()));
    console.log('scaricato ' + name);
  }
}

// "traces" and "< 0,5" are not measurable amounts: 0. "-" is not known: null.
function value(x) {
  if (x == null) return null;
  const t = String(x).trim().replace(',', '.');
  if (t === '-' || t === '') return null;
  if (/^traces?$/i.test(t) || /^</.test(t)) return 0;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
}

export function readCiqual() {
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(path.join(SRC, 'ciqual2025.xlsx'));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  const head = rows[0].map((h) => String(h).replace(/\s+/g, ' '));
  const col = (re) => {
    const i = head.findIndex((h) => re.test(h));
    if (i < 0) throw new Error('colonna mancante: ' + re);
    return i;
  };
  const c = {
    grp: col(/^alim_grp_nom_fr/), sub: col(/^alim_ssgrp_nom_fr/), code: col(/^alim_code/), fr: col(/^alim_nom_fr/),
    kcal: col(/1169.*kcal/), pro: col(/Protéines, N x facteur de Jones/), carb: col(/^Glucides/), fat: col(/^Lipides/),
    sugars: col(/^Sucres/), fiber: col(/^Fibres alimentaires/)
  };
  return rows.slice(1).filter((r) => r[c.code] != null && String(r[c.code]).trim()).map((r) => ({
    code: String(r[c.code]).trim(),
    fr: String(r[c.fr] || '').trim(),
    group: String(r[c.grp] || '').replace(/\s+/g, ' ').trim(),
    sub: String(r[c.sub] || '').replace(/\s+/g, ' ').trim(),
    kcal: value(r[c.kcal]), pro: value(r[c.pro]), carb: value(r[c.carb]), fat: value(r[c.fat]),
    sugars: value(r[c.sugars]), fiber: value(r[c.fiber])
  }));
}

// The app's six groups (as in food-catalog.mjs) and, finer, the kind of food
// for the proposals of "cambia combinazione" (fish for fish, fruit for fruit).
const KIND = [
  [/légumineuses/, 'Proteine', 'legumi'],
  [/fruits à coque/, 'Grassi', 'frutta secca'],
  [/^fruits$/, 'Carboidrati', 'frutta'],
  [/légumes/, 'Verdure', 'verdura'],
  [/pommes de terre/, 'Carboidrati', 'patate'],
  [/pâtes, riz/, 'Carboidrati', 'cereali'],
  [/pains/, 'Carboidrati', 'pane'],
  [/farines|pâtes à tarte/, 'Carboidrati', 'farine'],
  [/biscuits apéritifs/, 'Snack', 'snack salati'],
  [/céréales de petit-déjeuner|barres céréalières/, 'Carboidrati', 'colazione'],
  [/biscuits sucrés|viennoiseries|gâteaux|chocolats|confiseries|confitures|sucres/, 'Snack', 'dolci'],
  [/glaces|sorbets|desserts glacés/, 'Snack', 'gelati'],
  [/poissons|mollusques|crustacés|produits de la mer/, 'Proteine', 'pesce'],
  [/oeufs/, 'Proteine', 'uova'],
  [/charcuteries/, 'Proteine', 'salumi'],
  [/viandes|produits à base de viande/, 'Proteine', 'carne'],
  [/fromages/, 'Proteine', 'formaggi'],
  [/produits laitiers frais/, 'Proteine', 'latticini'],
  [/laits/, 'Bevande', 'latte'],
  [/crèmes/, 'Grassi', 'panna'],
  [/beurres|huiles|margarines|matières grasses|graisses/, 'Grassi', 'grassi'],
  [/eaux|boissons/, 'Bevande', 'bevande'],
  [/sauces|condiments|aides culinaires|épices|herbes|sels/, 'Grassi', 'condimenti']
];
function kindOf(f) {
  const s = f.sub.toLowerCase();
  for (const [re, cat, kind] of KIND) if (re.test(s)) return [cat, kind];
  // Dishes and the rest: by what gives most of the energy.
  const p = (f.pro || 0) * 4, cb = (f.carb || 0) * 4, ft = (f.fat || 0) * 9, k = p + cb + ft;
  const cat = !k ? 'Snack' : (p / k >= 0.35 ? 'Proteine' : (ft / k >= 0.55 ? 'Grassi' : 'Carboidrati'));
  return [cat, /plats|entrées|pizzas|sandwichs|soupes|salades/.test(s) ? 'piatti pronti' : ''];
}

export function build() {
  const foods = readCiqual();
  const names = JSON.parse(fs.readFileSync(NAMES, 'utf8'));
  const missing = foods.filter((f) => !names[f.code] || !String(names[f.code].it || '').trim());
  if (missing.length) {
    throw new Error(missing.length + ' alimenti senza nome italiano (data/ciqual-it.json), es. ' + missing.slice(0, 5).map((f) => f.code + ' ' + f.fr).join('; '));
  }
  // Infant foods are not for this app; foods without energy cannot be summed.
  const kept = foods.filter((f) => !/infantiles/.test(f.group) && f.kcal != null);
  const items = kept.map((f) => {
    const n = names[f.code];
    const [cat, kind] = kindOf(f);
    const aliases = (n.aliases || []).map((a) => String(a).trim()).filter((a) => a && a.toLowerCase() !== n.it.toLowerCase());
    return [Number(f.code), n.it.trim(), aliases, cat, kind, f.kcal, f.pro, f.carb, f.fat, f.fiber, f.sugars];
  });
  const out = { source: CIQUAL_CITATION, licence: 'Licence Ouverte / Etalab 2.0', version: '2025-11-03', items };
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log('web/food-ciqual.json: ' + items.length + ' alimenti (' + (foods.length - kept.length) + ' esclusi: infanzia o senza energia), ' + Math.round(fs.statSync(OUT).size / 1024) + ' KB');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--fetch')) await fetchSources();
  else build();
}
