// The timed lesson player is redrawn by the clock five times a second. It must not rebuild its buttons each time
// (on Android they flickered, and a tap could land on a button that had just been replaced): the sheet is built when
// the step, the phase or the pause changes, and between those only the big number is updated.
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const html = fs.readFileSync('web/index.base.html', 'utf8').replace(/\r\n/g, '\n');
const i = html.indexOf('function paintLesson() {');
const j = html.indexOf('\nwindow.openLesson = openLesson;', i);
if (i < 0 || j < 0) throw new Error('paintLesson not found');
const code = html.slice(i, j);

let builds = 0, numberWrites = 0;
const attrs = {};
let bigEl = null;
const el = {
  getAttribute: (k) => (k in attrs ? attrs[k] : null),
  setAttribute: (k, v) => { attrs[k] = v; },
  set innerHTML(v) { builds++; bigEl = { _h: (/id="lesson-big"[^>]*>([^<]*)</.exec(v) || [])[1], get innerHTML() { return this._h; }, set innerHTML(x) { numberWrites++; this._h = x; } }; },
  get innerHTML() { return ''; }
};
const ctx = {
  document: { getElementById: (id) => (id === 'lesson-player' ? el : (id === 'lesson-big' ? bigEl : null)) },
  esc: (s) => String(s == null ? '' : s),
  Date, Math, String, Number,
  window: {}
};
ctx.window.__lesson = null;
vm.createContext(ctx);
vm.runInContext(code, ctx);
const st = { steps: [{ kind: 'time', name: 'Plank', seconds: 30, rest: 10, label: '', note: '' }, { kind: 'time', name: 'Ponte', seconds: 30, rest: 10 }], i: 0, phase: 'work', endsAt: Date.now() + 30000, paused: false, leftMs: 0 };
ctx.window.__lesson = st;
vm.runInContext('window.__lesson = window.__lesson', ctx);
// the function reads window.__lesson: give it the same object
ctx.__lessonState = st;
vm.runInContext('var window = { __lesson: __lessonState };', ctx);
vm.runInContext('paintLesson()', ctx);
ok('1a. the first paint builds the sheet', builds === 1 && !!bigEl);
st.endsAt = Date.now() + 28000;
vm.runInContext('paintLesson()', ctx);
vm.runInContext('paintLesson()', ctx);
ok('1b. the clock ticking does not rebuild it (only the number is written)', builds === 1 && numberWrites >= 1);
st.paused = true; st.leftMs = 20000;
vm.runInContext('paintLesson()', ctx);
ok('1c. pausing rebuilds it once (the PAUSA button becomes RIPRENDI)', builds === 2);
vm.runInContext('paintLesson()', ctx);
ok('1d. and then it stays', builds === 2);
st.paused = false; st.i = 1; st.endsAt = Date.now() + 30000;
vm.runInContext('paintLesson()', ctx);
ok('1e. the next exercise rebuilds it', builds === 3);
st.phase = 'rest'; st.endsAt = Date.now() + 10000;
vm.runInContext('paintLesson()', ctx);
ok('1f. the rest rebuilds it', builds === 4);

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nLezione a tempo: i pulsanti non vengono ridisegnati a ogni tick.');
