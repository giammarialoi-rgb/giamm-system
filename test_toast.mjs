// showToast: l'avviso breve che l'app chiamava in 280 punti senza che
// esistesse. Qui gira quello vero, ritagliato dalla pagina, su un DOM finto
// minimo: uno alla volta, 3 s per info e ok, 6 s per error, un tocco lo
// chiude, i vecchi nomi dei tipi si leggono ancora. Poi i testi: nessun tipo
// fuori dai tre, niente inglese rimasto, niente dei doppi tolti.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8').replace(/\r\n/g, '\n');
const BUILT = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8').replace(/\r\n/g, '\n');
const COACH = fs.readFileSync(path.join(root, 'web/coach-practice-ui.js'), 'utf8').replace(/\r\n/g, '\n');

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
function grab(name) {
  const at = SRC.indexOf('function ' + name + '(');
  if (at < 0) return '';
  const end = SRC.indexOf('\n}', at);
  return end < 0 ? '' : SRC.slice(at, end + 2) + '\n';
}
function grabVar(name) {
  const at = SRC.indexOf('var ' + name + ' = ');
  const end = SRC.indexOf('};\n', at);
  return SRC.slice(at, end + 3);
}

// Just enough DOM: elements with children, attributes, text and a body.
function fakeDom() {
  const byId = {};
  function el(tag) {
    const node = {
      tagName: tag.toUpperCase(), children: [], parentNode: null, style: {}, attrs: {}, _id: '', textContent: '', className: '', onclick: null,
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return this.attrs[k]; },
      appendChild(c) { c.parentNode = this; this.children.push(c); if (c._id) byId[c._id] = c; return c; },
      removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; if (byId[c._id] === c) delete byId[c._id]; return c; },
      get id() { return this._id; },
      set id(v) { this._id = v; },
      get innerText() { return [this.textContent].concat(this.children.map((c) => c.innerText)).join(' ').trim(); }
    };
    Object.defineProperty(node.style, 'cssText', { set(v) { node._css = v; }, get() { return node._css || ''; } });
    return node;
  }
  const body = el('body');
  return { body, createElement: el, getElementById: (id) => byId[id] || null, toasts: () => body.children.filter((c) => c.id === 'nurvan-toast') };
}

const document = fakeDom();
const timers = [];
const ctx = {
  document,
  setTimeout(fn, ms) { const t = { fn, ms, cleared: false }; timers.push(t); return t; },
  clearTimeout(t) { if (t) t.cleared = true; }
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(grabVar('TOAST_DURATION_MS') + '\n' + grabVar('TOAST_STYLE') + '\n' +
  ['normalizeToastKind', 'hideToast', 'showToast'].map(grab).join('\n'), ctx);
const run = (c) => vm.runInContext(c, ctx);
const lastTimer = () => timers[timers.length - 1];

console.log('\n--- 0. esiste, finalmente ---');
ok('0a. showToast e\' definita nella pagina costruita', /function showToast\(msg, kind\)/.test(BUILT));
ok('0b. ed e\' su window, per i moduli caricati a parte', /window\.showToast = showToast;/.test(SRC));
ok('0c. nessun altro la ridefinisce', (BUILT.match(/function showToast\(/g) || []).length === 1);

console.log('\n--- 1. uno alla volta ---');
{
  run("showToast('Primo', 'info')");
  run("showToast('Secondo', 'ok')");
  eq(document.toasts().length, 1, '1a. due avvisi di fila: a schermo ce n\'e\' uno');
  ok('1b. ed e\' il nuovo', /Secondo/.test(document.toasts()[0].innerText) && !/Primo/.test(document.body.innerText));
  ok('1c. il timer del vecchio e\' annullato, non chiudera\' il nuovo', timers[0].cleared === true && timers[1].cleared === false);
  for (let i = 0; i < 10; i++) run("showToast('Raffica " + i + "', 'error')");
  eq(document.toasts().length, 1, '1d. dieci di fila: sempre uno');
  ok('1e. l\'ultimo', /Raffica 9/.test(document.toasts()[0].innerText));
  eq(timers.filter((t) => !t.cleared).length, 1, '1f. e un solo timer vivo');
}

console.log('\n--- 2. durata per tipo ---');
{
  run("showToast('Salvato', 'ok')");
  eq(lastTimer().ms, 3000, '2a. ok: 3 s');
  run("showToast('Caricamento', 'info')");
  eq(lastTimer().ms, 3000, '2b. info: 3 s');
  run("showToast('Salvataggio fallito', 'error')");
  eq(lastTimer().ms, 6000, '2c. error: 6 s');
  const t = document.toasts()[0];
  ok('2d. l\'errore e\' rosso e si annuncia subito', /#e53935/.test(t.style.cssText) && t.getAttribute('role') === 'alert' && t.getAttribute('aria-live') === 'assertive');
  lastTimer().fn();
  eq(document.toasts().length, 0, '2e. allo scadere sparisce');
}

console.log('\n--- 3. un tocco lo chiude ---');
{
  run("showToast('Tocca qui', 'info')");
  const t = document.toasts()[0];
  eq(t.getAttribute('role'), 'status', '3a. un info e\' uno stato, non un allarme');
  t.onclick();
  eq(document.toasts().length, 0, '3b. dopo il tocco non c\'e\' piu\'');
  ok('3c. e il suo timer e\' annullato', lastTimer().cleared === true);
}

console.log('\n--- 4. i vecchi nomi dei tipi ---');
{
  eq(run("['ok','success','error','danger','warning','info','',null,'boh'].map(normalizeToastKind)"),
    ['ok', 'ok', 'error', 'error', 'error', 'info', 'info', 'info', 'info'], '4a. success→ok, danger e warning→error, il resto info');
  run("showToast('', 'ok')");
  run("showToast(null, 'ok')");
  eq(document.toasts().length, 0, '4b. un messaggio vuoto non apre niente');
  run("showToast('<b>x</b>', 'info')");
  ok('4c. il testo resta testo, niente HTML', document.toasts()[0].children[1].textContent === '<b>x</b>');
  run('hideToast()');
}

console.log('\n--- 5. leggibile a 320 px ---');
{
  run("showToast('Salvato sul dispositivo, ma la sincronizzazione col cloud è fallita: riprova quando hai connessione.', 'error')");
  const css = document.toasts()[0].style.cssText;
  ok('5a. margini di 12 px, larghezza dal viewport, niente larghezza fissa', /left:12px;right:12px;/.test(css) && !/(^|;)width:\d/.test(css));
  ok('5b. il testo va a capo invece di tagliarsi', /white-space:normal/.test(css) && /overflow-wrap:anywhere/.test(css) && !/text-overflow|nowrap/.test(css));
  ok('5c. sopra il menu in basso', /bottom:calc\(76px \+ env\(safe-area-inset-bottom, 0px\)\)/.test(css));
  run('hideToast()');
}

console.log('\n--- 6. i testi ---');
{
  const rows = (await import('./tools/list_toasts.mjs')).default;
  ok('6a. il censimento trova tutte le chiamate', rows.length > 250);
  const kinds = new Set(rows.map((r) => r.kind));
  const allowed = ['info', 'ok', 'error', "st.includes('WARN') ? 'info' : 'ok", "updated ? 'ok' : 'info", "res.added ? 'ok' : 'error", "kind || 'ok"];
  const bad = [...kinds].filter((k) => !allowed.includes(k));
  eq(bad, [], '6b. nessun tipo fuori da info, ok, error');
  const all = rows.map((r) => r.text).join('\n');
  const english = ['Health Connect', 'Undo non', 'AI Create', 'Provenance', 'Sample salute', 'parsing', 'barcode', 'Focus Mode', 'ledger', 'resettat', "'Import ", 'Action OS', 'IMPORT_COMPLETED', '${st}'];
  eq(english.filter((w) => all.includes(w)), [], '6c. niente inglese rimasto nei testi');
  eq((all.match(/con successo/g) || []).length, 0, '6d. niente «con successo»: il verde lo dice gia\'');
  const gone = ['Toast aggiornato', 'Alimento cambiato in', 'Apertura revisione per', "'Serie completata: '", 'Calorie e stats aggiornate'];
  eq(gone.filter((w) => all.includes(w)), [], '6e. tolti quelli che ripetevano cio\' che lo schermo mostra gia\'');
  ok('6f. il 💾 della scheda dice «Salvato», senza finestra bloccante', /function saveAll\(\)\{ persist\(\); showToast\('Salvato', 'ok'\); \}/.test(SRC));
  ok('6g. offline: un listener solo, legato una volta', (COACH.match(/addEventListener\('offline'/g) || []).length === 1 && /if \(window\.__nurvanOfflineSyncBound\) return;/.test(COACH) && !/addEventListener\('offline'/.test(SRC));
  ok('6h. e dice che i dati restano, come informazione', /showToast\('Offline: i dati restano salvati in locale', 'info'\)/.test(COACH));
}

console.log('\n' + (failed ? failed + ' controlli falliti' : 'tutti i controlli passano'));
process.exit(failed ? 1 : 0);
