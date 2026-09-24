// Genera food-catalog.mjs da food-staples.json.
//
// food-staples.json e' la fonte: un alimento per voce, nome italiano e
// inglese, categoria, macro per 100 g e `rank`, l'ordine del curatore dentro
// la categoria (0 = il piu' comune), che la ricerca usa come ultimo criterio
// a parita' di punteggio e lunghezza. food-catalog.mjs e' l'uscita: non si
// modifica a mano, si rigenera.
//
// Qui si controlla anche che i dati siano puliti: nessuna etichetta finta
// davanti al nome (Bio, Convenience, Generico, Premium, Sport, Supermarket:
// ripetevano lo stesso alimento con gli stessi valori), nessun apostrofo
// mancante ("Petto d anatra"), nessun doppione, macro numeriche. Il campo
// `brand` resta nello schema per i prodotti veri (Open Food Facts), che
// arrivano dalla rete e non passano di qui.
//
//   node tools/build_food_catalog.mjs          scrive food-catalog.mjs
//   node tools/build_food_catalog.mjs --check  esce con 1 se l'uscita e' vecchia
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(root, 'food-staples.json');
const OUTPUT = path.join(root, 'food-catalog.mjs');

const FAKE_LABELS = ['Bio', 'Convenience', 'Generico', 'Premium', 'Sport', 'Supermarket'];
const MISSING_APOSTROPHE = /(^|\s)(d|l|all|dell|dall|nell|sull|un|quest)\s+[aeiouh]/i;

export function buildFoodCatalog(staples) {
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
    ['kcal', 'pro', 'carb', 'fat', 'rank'].forEach((k) => {
      if (typeof f[k] !== 'number' || !Number.isFinite(f[k])) errors.push(where + ': ' + k + ' non numerico');
    });
  });
  if (errors.length) throw new Error('food-staples.json non valido:\n  ' + errors.join('\n  '));

  const catalog = staples
    .map((f) => {
      const aliases = [];
      [f.name, f.name_en, String(f.name).toLowerCase(), String(f.name_en || '').toLowerCase()].forEach((a) => {
        if (a && aliases.indexOf(a) < 0) aliases.push(a);
      });
      return {
        id: f.id, name: f.name, name_en: f.name_en || '', aliases: aliases,
        category: f.category, kcal: f.kcal, pro: f.pro, carb: f.carb, fat: f.fat,
        serving: f.serving || '100g', unit: f.unit || 'g', rank: f.rank, source: 'nurvan_staple_v3'
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category, 'it') || a.rank - b.rank || a.name.localeCompare(b.name, 'it'));
  const categories = [...new Set(catalog.map((f) => f.category))].sort((a, b) => a.localeCompare(b, 'it'));

  return '/** GENERATO da tools/build_food_catalog.mjs a partire da food-staples.json: non modificare a mano. */\n' +
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
  const out = buildFoodCatalog(staples);
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, 'utf8').replace(/\r\n/g, '\n') : '';
    if (now !== out) { console.error('food-catalog.mjs non corrisponde a food-staples.json: rigenera con node tools/build_food_catalog.mjs'); process.exit(1); }
    console.log('food-catalog.mjs aggiornato (' + staples.length + ' voci)');
  } else {
    fs.writeFileSync(OUTPUT, out, 'utf8');
    console.log('food-catalog.mjs scritto: ' + staples.length + ' voci');
  }
}
