// Weights in kg or lb (Impostazioni): loads are stored, synced and computed in
// kg; only what the person sees and types is in the unit chosen. The helpers
// run cut out of web/index.base.html; the wiring is read from the source.
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const SRC = fs.readFileSync('web/index.base.html', 'utf8');
const block = (start) => {
  const at = SRC.indexOf(start);
  if (at < 0) throw new Error(start);
  let d = 0;
  for (let i = SRC.indexOf('{', at); i < SRC.length; i++) {
    if (SRC[i] === '{') d++;
    else if (SRC[i] === '}' && --d === 0) return SRC.slice(at, i + 1);
  }
  throw new Error('unterminated ' + start);
};
const ctx = { store: { prefs: {}, data: {} }, persist() { ctx.saved = (ctx.saved || 0) + 1; }, render() {}, window: {} };
vm.createContext(ctx);
vm.runInContext('const LB_PER_KG = 2.20462262;\n' + ['function wUnit(', 'function kgToDisp(', 'function dispToKg(', 'function setWeightUnit('].map(block).join('\n'), ctx);
const run = (code) => vm.runInContext(code, ctx);

ok('1a. senza scelta: kg, e i numeri restano come sono', run('wUnit()') === 'kg' && run('kgToDisp(100)') === 100 && run('dispToKg("100")') === '100');
run('setWeightUnit("lb")');
ok('1b. scelta lb: salvata', ctx.store.prefs.weightUnit === 'lb' && ctx.saved === 1);
ok('1c. 100 kg si vedono come 220.5 lb (al mezzo)', run('kgToDisp(100)') === 220.5);
ok('1d. 225 lb scritte diventano 102.06 kg da salvare', run('dispToKg("225")') === '102.06');
ok('1e. andata e ritorno: 225 lb restano 225 lb', run('kgToDisp(dispToKg("225"))') === 225);
ok('1f. vuoto resta vuoto, testo resta testo', run('kgToDisp("")') === '' && run('dispToKg("")') === '' && run('kgToDisp("BW")') === 'BW');
run('setWeightUnit("qualcosa")');
ok('1g. un valore strano torna a kg', ctx.store.prefs.weightUnit === 'kg');

ok('2a. il carico scritto nel campo si salva in kg', /function updateData\(key, val\)\{\s*if \(\/_load\$\/\.test\(String\(key \|\| ''\)\)\) val = dispToKg\(val\);/.test(SRC));
ok('2b. i campi della serie mostrano carico e suggerimento nell\'unita\'', (SRC.match(/value="\$\{kgToDisp\(shownLoad\)\}"/g) || []).length === 2 && /value="\$\{kgToDisp\(bonusShown\)\}"/.test(SRC));
ok('2c. il ✓ legge il campo nell\'unita\' e scrive kg', /dispToKg\(loadEl\.value\)/.test(SRC) && /loadEl\.value = kgToDisp\(load\)/.test(SRC));
ok('2d. l\'intestazione della serie dice KG o LB', (SRC.match(/wUnit\(\)\.toUpperCase\(\)/g) || []).length >= 3);
ok('2e. i massimali in % si leggono e si mostrano nell\'unita\'', /dispToKg\(\(el && el\.value\) \|\| ''\)/.test(SRC) && /kgToDisp\(maxes\[lift\]\)/.test(SRC));
ok('2f. la scelta sta nelle impostazioni', /id="pref-weight-unit" onchange="setWeightUnit\(this\.value\)"/.test(SRC));
ok('2g. e passa dalla sincronizzazione delle preferenze', /weightUnit: \(v\) => \(String\(v\)\.toLowerCase\(\)\.startsWith\('lb'\) \? 'lb' : 'kg'\)/.test(SRC));
ok('2h. volumi e record nell\'unita\' scelta', /function formatStatsKg\(n\) \{\s*return Math\.round\(Number\(typeof kgToDisp === 'function' \? kgToDisp/.test(SRC));

console.log('');
if (failed) { console.log(failed + ' controlli dell\'unita\' di peso falliti.'); process.exit(1); }
console.log('Tutti i controlli dell\'unita\' di peso passano.');
