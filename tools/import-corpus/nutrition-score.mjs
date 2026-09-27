// Measures the nutrition import on the corpus: every day, meal, food,
// quantity and alternative written by hand in .import-corpus/nutrition-checks/
// against what the app's reader makes of the file. Real plans ("plan") and
// other documents (slides, booklets, canteen schemes: "other") apart.
//   node tools/import-corpus/nutrition-score.mjs [--only id] [--verbose]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { readNutrition, scoreNutrition } = await import('file:///' + path.join(root, 'tools/import-corpus/nutrition-run.mjs').split(String.fromCharCode(92)).join('/'));
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const dir = path.join(root, '.import-corpus', 'nutrition-checks');
const tot = { plan: [0, 0, 0], other: [0, 0, 0] };
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json') && (!only || x.includes(only))).sort()) {
  const truth = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const r = await readNutrition(path.join(root, '.import-corpus', truth.file));
  const s = scoreNutrition(r.nutrition, truth);
  const kind = truth.document === 'other' ? 'other' : 'plan';
  tot[kind][0] += s.points; tot[kind][1] += s.right; tot[kind][2]++;
  console.log(truth.id.padEnd(24) + String(s.pct).padStart(6) + '%  (' + s.right + '/' + s.points + ')  ' + truth.kind + (kind === 'other' ? '  [non e\' un piano]' : ''));
  if (args.includes('--verbose')) s.misses.slice(0, 40).forEach((m) => console.log('     - ' + m));
}
const pct = (t) => (t[0] ? Math.round(t[1] / t[0] * 1000) / 10 : 0);
console.log('PIANI ALIMENTARI  ' + pct(tot.plan) + '% (' + tot.plan[1] + '/' + tot.plan[0] + ', ' + tot.plan[2] + ' file)');
console.log('ALTRI DOCUMENTI   ' + pct(tot.other) + '% (' + tot.other[1] + '/' + tot.other[0] + ', ' + tot.other[2] + ' file)');
