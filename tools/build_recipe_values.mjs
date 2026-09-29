// Scrive dentro web/recipe-catalog.json i valori di ogni ricetta, calcolati
// una volta qui invece che nel telefono a ogni apertura (erano 150 ricette per
// ~900 ingredienti confrontati con oltre 4.000 alimenti: 20+ secondi).
//
// Stesse regole dell'app:
// - ogni ingrediente pesato prende i valori dall'alimento con lo stesso nome
//   (NurvanNutritionPlan.sameFood sul catalogo: staples + CREA, poi Ciqual);
// - "refs" nel file punta a un alimento del catalogo per nome esatto;
// - "foods" nel file porta valori di una fonte citata (USDA, etichette Open
//   Food Facts, Wikipedia);
// - la ricetta ha kcal e macro solo se TUTTI gli ingredienti pesati li hanno.
//
//   node tools/build_recipe_values.mjs          riscrive i campi calcolati
//   node tools/build_recipe_values.mjs --check  esce con 1 se sono vecchi
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { FOOD_CATALOG } from '../food-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(root, 'web', 'recipe-catalog.json');

const ctx = { self: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'web', 'nutrition-plan.js'), 'utf8'), ctx);
const NP = ctx.self.NurvanNutritionPlan;

const base = FOOD_CATALOG.map((f) => ({
  name: f.name, name_en: f.name_en || '', aliases: f.aliases || [],
  kcal: f.kcal || 0, pro: f.pro || 0, carb: f.carb || 0, fat: f.fat || 0,
  source: f.source || 'local', crea_url: f.crea_url || null, crea_name: f.crea_name || null
}));
const ciqual = JSON.parse(fs.readFileSync(path.join(root, 'web', 'food-ciqual.json'), 'utf8')).items.map((r) => ({
  name: r[1], name_en: '', aliases: r[2] || [], kcal: r[5] || 0, pro: r[6] || 0, carb: r[7] || 0, fat: r[8] || 0,
  source: 'ciqual', ciqual_code: String(r[0])
}));
const catalog = base.concat(ciqual);

const SOURCE_NAMES = { usda: 'USDA FoodData Central', off: 'Open Food Facts (etichetta)', wikipedia: 'Wikipedia' };
function provenanceOf(hit) {
  if (hit.source === 'crea') return { source: 'crea', kind: 'CREA 2019', url: hit.crea_url || null, crea_name: hit.crea_name || null, confidence: 1 };
  if (hit.source === 'ciqual') return { source: 'ciqual', kind: 'Anses Ciqual 2025', code: hit.ciqual_code || null, confidence: 1 };
  return { source: 'nurvan', kind: 'Nurvan', confidence: 0.9 };
}
const round1 = (v) => Math.round(v * 10) / 10;

export function computeRecipeValues(data) {
  const refs = data.refs || {};
  const foods = data.foods || {};
  return data.recipes.map((src) => {
    const ingredients = src.ingredients.map((line) => {
      if (/\bq\.?\s?b\.?\s*$/i.test(line)) return { label: line, name: line.replace(/\s*\bq\.?\s?b\.?\s*$/i, '').trim(), quantity: null, unit: '', qb: true };
      const a = NP.parseOption(line);
      const out = { label: line, name: a.name, quantity: a.quantity, unit: a.unit };
      const key = String(a.name || '').toLowerCase().trim();
      let v = null;
      if (foods[key]) {
        const f = foods[key];
        v = { kcal: f.kcal, pro: f.pro, carb: f.carb, fat: f.fat,
          provenance: { source: f.source || 'usda', kind: SOURCE_NAMES[f.source] || SOURCE_NAMES.usda, ref: f.ref || '', url: f.url || '', confidence: 1 } };
      } else {
        const hit = refs[key] ? catalog.find((f) => f.name === refs[key]) : NP.sameFood(a.name, catalog);
        if (hit && hit.kcal > 0) v = { kcal: hit.kcal, pro: hit.pro || 0, carb: hit.carb || 0, fat: hit.fat || 0, provenance: provenanceOf(hit) };
      }
      if (v) Object.assign(out, { kcalPer100: v.kcal, proPer100: v.pro, carbPer100: v.carb, fatPer100: v.fat, provenance: v.provenance });
      return out;
    });
    // Values of the recipe: only when every weighed ingredient has them.
    let grams = 0, kcal = 0, pro = 0, carb = 0, fat = 0, complete = true;
    ingredients.forEach((i) => {
      if (i.qb) return;
      const g = Number(i.quantity) || 0; // the book writes g and ml only
      if (!(g > 0) || i.kcalPer100 == null) { complete = false; return; }
      grams += g; kcal += i.kcalPer100 * g / 100; pro += i.proPer100 * g / 100; carb += i.carbPer100 * g / 100; fat += i.fatPer100 * g / 100;
    });
    const k = grams > 0 ? 100 / grams : 0;
    return Object.assign({}, src, {
      parsed: ingredients,
      per100: complete && grams > 0 ? { kcal: Math.round(kcal * k), pro: round1(pro * k), carb: round1(carb * k), fat: round1(fat * k) } : {},
      portionGrams: complete && grams > 0 ? Math.round(grams / (src.portions || 1)) : null
    });
  });
}

const direct = /build_recipe_values\.mjs$/.test(String(process.argv[1] || '').replace(/\\/g, '/'));
if (direct) {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const next = Object.assign({}, data, { recipes: computeRecipeValues(data) });
  const text = JSON.stringify(next);
  if (process.argv.includes('--check')) {
    if (text !== fs.readFileSync(FILE, 'utf8')) { console.error('web/recipe-catalog.json: valori vecchi, rilancia node tools/build_recipe_values.mjs'); process.exit(1); }
    console.log('recipe-catalog.json aggiornato');
  } else {
    fs.writeFileSync(FILE, text);
    const done = next.recipes.filter((r) => r.portionGrams).length;
    console.log('ricette con valori: ' + done + '/' + next.recipes.length);
  }
}
