// Quali nomi del database vengono letti come fondamentale.
//
// Tre fonti, come in list_unclassified_exercises.mjs: il catalogo web
// (web/exercise-catalog-extra.js), la libreria movimenti del costruttore
// (web/exercise-taxonomy.js) e il dizionario dell'import. Per ogni nome si
// mostra cosa ne pensa il modulo delle progressioni:
//   - fundamentalFor: il fondamentale (squat, panca, stacco, military press,
//     trazioni, dip) e se e' l'alzata stessa o una sua variante col bilanciere;
//   - competitionLiftFor: l'alzata esatta, quella su cui si calcolano le
//     percentuali del massimale.
// Un isolamento non deve comparire in nessuna delle due colonne.
//
//   node tools/list_fundamentals.mjs           solo i riconosciuti
//   node tools/list_fundamentals.mjs --json
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { self: {}, console };
vm.createContext(ctx);
for (const f of ['web/exercise-catalog-extra.js', 'web/exercise-taxonomy.js', 'web/progression-models.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx);
}
const P = ctx.self.NurvanProgressions;
const CATALOG = ctx.self.WEB_EXERCISE_CATALOG || [];
const TAX = (ctx.self.NURVAN_EXERCISE_TAXONOMY && ctx.self.NURVAN_EXERCISE_TAXONOMY.EXERCISES) || [];
let DICT = [];
try {
  const url = 'file:///' + path.join(root, 'universal-import-engine.mjs').replace(/\\/g, '/').replace(/^\//, '');
  DICT = (await import(url)).EXERCISE_DICTIONARY || [];
} catch (_) {}

function classify(name) {
  const f = P.fundamentalFor ? P.fundamentalFor(name) : null;
  return {
    name,
    fundamental: f ? f.lift : null,
    variant: f ? !!f.variant : false,
    competition: P.competitionLiftFor(name)
  };
}
const sources = [
  ['catalogo web', CATALOG.map((e) => e.name)],
  ['libreria movimenti', TAX.map((e) => e.name)],
  ['dizionario import', DICT.map((e) => e.normalized)]
];
const out = sources.map(([label, names]) => ({
  label,
  total: names.length,
  rows: names.filter(Boolean).map(classify).filter((r) => r.fundamental || r.competition)
}));

const direct = /list_fundamentals\.mjs$/.test(String(process.argv[1] || '').replace(/\\/g, '/'));
if (direct && process.argv.includes('--json')) {
  console.log(JSON.stringify(out, null, 1));
} else if (direct) {
  out.forEach((s) => {
    console.log('\n' + s.label + ' (' + s.total + ' voci): ' + s.rows.length + ' riconosciuti');
    s.rows.forEach((r) => console.log('  ' + r.name.padEnd(40) + ' fondamentale=' + (r.fundamental || '-') + (r.variant ? ' (variante)' : '') + '  alzata=' + (r.competition || '-')));
  });
}
export default out;
