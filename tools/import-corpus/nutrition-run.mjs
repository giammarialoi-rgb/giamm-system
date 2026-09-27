// Measures the nutrition import on real plans: the app's path for a PDF
// (layout reader -> text -> parser -> nutritionist-plan reader), then prints
// what came out, or compares with hand-written checks.
//   node tools/import-corpus/nutrition-run.mjs [--only id] [--text] [--verbose]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const url = (p) => 'file:///' + p.split(String.fromCharCode(92)).join('/');
const engine = await import(url(path.join(root, 'universal-import-engine.mjs')));
const pdf = await import(url(path.join(root, 'pdf-layout.mjs')));
const ctx = {}; ctx.self = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'web/nutrition-plan.js'), 'utf8'), ctx);
const NP = ctx.NurvanNutritionPlan;
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const dir = path.join(root, '.import-corpus', 'files', 'nutrition');

export async function readNutrition(file) {
  const bytes = new Uint8Array(fs.readFileSync(file));
  let text = '', drawn = false, layDoc = null, grid = null;
  try {
    const lay = await pdf.readPdfLayout(bytes, { inflate: async (u8) => new Uint8Array(zlib.inflateSync(u8)) });
    if (lay.pages > 0 && !lay.items.length) drawn = true;
    if (lay.items.length) { layDoc = NP.layoutDocument(lay.items); grid = NP.parseGridPlan(lay.items, lay.rects) || NP.parseSubstitutionTable(lay.items); }
    const res = pdf.pdfLayoutToText(lay);
    if (res.text.trim().length > 40) text = res.text;
  } catch (e) { text = ''; }
  const ocrDoc = path.join(root, '.import-corpus', 'ocr', path.basename(file) + '.doc.json');
  const doc = fs.existsSync(ocrDoc) ? JSON.parse(fs.readFileSync(ocrDoc, 'utf8')) : null;
  if (doc) text = doc.text;
  const parsed = engine.parseCanonicalProgramFromText(text, path.basename(file));
  const prog = engine.buildCanonicalProgram(parsed);
  const src = doc || layDoc || { pages: [{ columns: [text.split('\n')] }] };
  const plan = process.env.OLD_ONLY ? null : (NP.parsePlanDocument(src) || grid || NP.parseGenericPlan(src));
  return { text, drawn, nutrition: plan || (prog && prog.nutrition), reader: plan ? 'plan' : 'engine' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const f of fs.readdirSync(dir).filter((x) => /\.pdf$/i.test(x) && (!only || x.includes(only))).sort()) {
    const r = await readNutrition(path.join(dir, f));
    const n = r.nutrition || {};
    const days = n.days || [];
    const foods = days.reduce((a, d) => a + (d.meals || []).reduce((b, m) => b + (m.foods || m.items || []).length, 0), 0);
    console.log(`${f.padEnd(28)} text=${String(r.text.length).padStart(6)} drawn=${r.drawn ? 'Y' : 'n'} reader=${r.reader} days=${days.length} meals=${days.reduce((a, d) => a + (d.meals || []).length, 0)} foods=${foods}`);
    if (args.includes('--text')) console.log(r.text.slice(0, 3000) + '\n-----');
    if (args.includes('--verbose')) days.slice(0, 2).forEach((d) => { console.log('  ## ' + d.day); (d.meals || []).forEach((m) => console.log('    ' + (m.time || '') + ' ' + m.name + ': ' + (m.foods || m.items || []).map((x) => x.name + ' ' + (x.quantity ?? '') + (x.unit || '')).join(' | '))); });
  }
}

// Scores one import against its hand-written checks (.import-corpus/
// nutrition-checks/<id>.json). Every day label, every meal name and, for
// every check, the food found in its meal, its quantity and its
// alternatives: each one is a point; the score is points right / points.
export function scoreNutrition(nutrition, truth) {
  const f = (s) => NP.fold(s).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const days = (nutrition && nutrition.days) || [];
  const dayOf = (label) => days.find((d) => f(d.day) === f(label)) || null;
  const out = { points: 0, right: 0, misses: [] };
  const point = (ok, what) => { out.points++; if (ok) out.right++; else out.misses.push(what); };
  (truth.days || []).forEach((label) => point(!!dayOf(label), 'giorno ' + label));
  Object.keys(truth.meals || {}).forEach((label) => {
    const d = dayOf(label);
    (truth.meals[label] || []).forEach((m) => point(!!(d && (d.meals || []).some((x) => f(x.name) === f(m) || f(x.name).startsWith(f(m)))), 'pasto ' + label + '/' + m));
  });
  (truth.checks || []).forEach((c) => {
    const d = dayOf(c.day);
    const meal = d && (d.meals || []).find((x) => f(x.name) === f(c.meal) || f(x.name).startsWith(f(c.meal)));
    const foods = (meal && (meal.foods || meal.items)) || [];
    const want = f(c.food);
    const hit = foods.find((x) => [x].concat(x.alternatives || []).some((a) => { const n = f(a.name || a.food); return n === want || n.includes(want) || want.includes(n) && n.length > 3; }));
    point(!!hit, 'alimento ' + c.day + '/' + c.meal + '/' + c.food);
    if (!hit) { point(false, '  quantita\''); if ((c.alternatives || []).length) point(false, '  alternative'); return; }
    const alt = [hit].concat(hit.alternatives || []).find((a) => { const n = f(a.name || a.food); return n === want || n.includes(want) || want.includes(n); }) || hit;
    const q = alt.quantity != null ? Number(alt.quantity) : null;
    point(c.qty == null ? (q == null || !isFinite(q)) : (q != null && Math.abs(q - c.qty) <= 0.5), 'quantita\' ' + c.food + ' (atteso ' + c.qty + ', letto ' + q + ')');
    if ((c.alternatives || []).length) {
      const names = (hit.alternatives || []).map((a) => f(a.name));
      point(c.alternatives.every((w) => names.some((n) => n.includes(f(w)) || f(w).includes(n))), 'alternative ' + c.food);
    }
  });
  out.pct = out.points ? Math.round(out.right / out.points * 1000) / 10 : 0;
  return out;
}
