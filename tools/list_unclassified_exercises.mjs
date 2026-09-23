// Gli esercizi del database senza gruppo muscolare.
//
// Il database che l'app mostra e' l'unione di tre fonti: il dizionario
// dell'import (universal-import-engine.mjs), il catalogo web
// (web/exercise-catalog-extra.js) e la libreria dei movimenti che il
// costruttore usa per scrivere le schede (web/exercise-taxonomy.js). Le prime
// due portano un campo `muscle`; la terza porta un pattern di movimento e il
// muscolo lo si ricava a runtime. Qui si elenca chi resta senza gruppo:
//   1. voci con `muscle` vuoto o ALTRO nel dizionario e nel catalogo;
//   2. esercizi della libreria movimenti il cui nome non compare ne' nel
//      dizionario ne' nel catalogo, cioe' quelli che in una scheda generata
//      non hanno un muscolo dichiarato da nessuna parte.
//
//   node tools/list_unclassified_exercises.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MACROS = ['PETTO', 'DORSO', 'SPALLE', 'BRACCIA', 'GAMBE', 'ADDOME'];
const FINE = {
  TRICIPITI: 'BRACCIA', BICIPITI: 'BRACCIA', AVAMBRACCI: 'BRACCIA',
  DELTOIDI: 'SPALLE', TRAPEZIO: 'DORSO', DORSALI: 'DORSO', SCHIENA: 'DORSO', LOMBARI: 'DORSO',
  QUADRICIPITI: 'GAMBE', FEMORALI: 'GAMBE', GLUTEI: 'GAMBE', POLPACCI: 'GAMBE', ADDUTTORI: 'GAMBE', ABDUTTORI: 'GAMBE',
  CORE: 'ADDOME', ADDOMINALI: 'ADDOME', OBLIQUI: 'ADDOME'
};
function macroOf(m) {
  const g = String(m || '').toUpperCase().replace(/\s+/g, '_');
  if (!g || g === 'ALTRO' || g === 'TOTAL') return null;
  if (MACROS.includes(g)) return g;
  return FINE[g] || null;
}
function fold(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

const { EXERCISE_DICTIONARY } = await import(path.join(root, 'universal-import-engine.mjs').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));

const ctx = { self: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'web/exercise-catalog-extra.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'web/exercise-taxonomy.js'), 'utf8'), ctx);
const CATALOG = ctx.self.WEB_EXERCISE_CATALOG || [];
const TAX = (ctx.self.NURVAN_EXERCISE_TAXONOMY && ctx.self.NURVAN_EXERCISE_TAXONOMY.EXERCISES) || [];

const known = new Set();
const noGroup = [];
const cardio = [];
EXERCISE_DICTIONARY.forEach(function (e) {
  known.add(fold(e.normalized));
  (e.keywords || []).forEach(function (k) { known.add(fold(k)); });
  if (!macroOf(e.muscle)) noGroup.push({ fonte: 'dizionario', nome: e.normalized, muscle: e.muscle || '(vuoto)' });
});
CATALOG.forEach(function (e) {
  known.add(fold(e.name));
  if (e.en) known.add(fold(e.en));
  (e.aliases || []).forEach(function (k) { known.add(fold(k)); });
  if (String(e.muscle || '').toUpperCase() === 'CARDIO') cardio.push(e.name);
  else if (!macroOf(e.muscle)) noGroup.push({ fonte: 'catalogo', nome: e.name, muscle: e.muscle || '(vuoto)' });
});
const notInSources = TAX.filter(function (e) { return !known.has(fold(e.name)); })
  .map(function (e) { return { nome: e.name, pattern: e.pattern, equip: e.equip }; });

console.log('DATABASE ESERCIZI - senza gruppo muscolare');
console.log('  dizionario import: ' + EXERCISE_DICTIONARY.length + ' voci');
console.log('  catalogo web:      ' + CATALOG.length + ' voci');
console.log('  libreria movimenti: ' + TAX.length + ' voci');
console.log('');
console.log('0) Cardio (categoria a parte: minuti, non kg ne\' mappa): ' + cardio.length);
console.log('   ' + cardio.join(', '));
console.log('');
console.log('1) Voci con campo muscle vuoto o ALTRO: ' + noGroup.length);
noGroup.forEach(function (r) { console.log('   - [' + r.fonte + '] ' + r.nome + '  (muscle: ' + r.muscle + ')'); });
console.log('');
console.log('2) Esercizi della libreria movimenti senza voce nel dizionario o nel catalogo: ' + notInSources.length);
notInSources.forEach(function (r) { console.log('   - ' + r.nome + '  (' + r.pattern + ', ' + r.equip + ')'); });
console.log('');
console.log('TOTALE senza gruppo dichiarato (cardio escluso): ' + (noGroup.length + notInSources.length));

export default { noGroup, notInSources, cardio };
