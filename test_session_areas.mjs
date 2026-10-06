// The workout in progress belongs to the memory area it was started in. A coach who starts a client's workout
// (clock, undo list, rest timer between sets) must not see it running in their own training, and the other way round.
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
const ok = (m, v) => { if (v) console.log('OK   ' + m); else { failed++; console.log('FAIL ' + m); } };
const html = fs.readFileSync('web/index.base.html', 'utf8').replace(/\r\n/g, '\n');
const a = html.indexOf('var NURVAN_DOMAIN_FIELDS');
const b = html.indexOf('\nfunction nurvanLeaveClientArea()', a);
const end = html.indexOf('\n}\n', b) + 3;
if (a < 0 || b < 0) throw new Error('memory areas not found');
const code = html.slice(a, end);

const fields = ['sessionStartedAt', 'sessionStartedDate', 'sessionPausedMs', 'sessionPausedAt', 'sessionClockRunning', 'workoutUndo'];
const listText = code.slice(0, code.indexOf('];'));
ok('1a. the workout clock and its undo list are fields of the memory area', fields.every((f) => listText.includes("'" + f + "'")));

const ctx = { window: {}, store: {}, DATA: null, currentWeek: 1, currentDay: 0, saveTrainingSafetyCopy() {}, console };
vm.createContext(ctx);
vm.runInContext(code + `
NurvanMemory.personal = nurvanEmptyArea();
nurvanInstallDomainAccessors();
this.go = { enter: nurvanEnterClientArea, leave: nurvanLeaveClientArea, active: () => NurvanMemory.active };`, ctx);

// the coach's own workout is running
ctx.store.sessionStartedAt = 1000;
ctx.store.sessionClockRunning = true;
ctx.store.workoutUndo = [{ x: 1 }];
ctx.window.__restTimer = { endsAt: 5000, own: true };
ctx.go.enter();
ok('2a. in a client\'s area the coach\'s clock is not there', !ctx.store.sessionStartedAt && !ctx.store.workoutUndo);
ok('2b. nor the coach\'s rest timer', !ctx.window.__restTimer);

// the client's workout starts
ctx.store.sessionStartedAt = 9000;
ctx.store.sessionClockRunning = true;
ctx.store.workoutUndo = [{ x: 2 }, { x: 3 }];
ctx.window.__restTimer = { endsAt: 9500, client: true };
ctx.go.leave();
ok('3a. back in the coach\'s own area the coach\'s clock is the coach\'s, still running', ctx.store.sessionStartedAt === 1000 && ctx.store.sessionClockRunning === true);
ok('3b. the client\'s clock did not start the coach\'s', ctx.store.sessionStartedAt !== 9000);
ok('3c. the coach\'s undo list and rest timer are back as they were', ctx.store.workoutUndo.length === 1 && ctx.window.__restTimer && ctx.window.__restTimer.own === true);

// entering the client again starts from nothing (a new view of the client), not from the previous visit
ctx.go.enter();
ok('4a. entering a client\'s area again starts clean', !ctx.store.sessionStartedAt && !ctx.window.__restTimer);

// the reset of the sandbox clears them too
const ui = fs.readFileSync('web/coach-practice-ui.js', 'utf8').replace(/\r\n/g, '\n');
const f0 = ui.indexOf('function resetSandboxSessionState()');
const body = ui.slice(f0, ui.indexOf('\n}\n', f0));
ok('5a. the sandbox reset clears the workout clock and undo list', fields.every((f) => body.includes('store.' + f + ' = ')));

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nAllenamento del cliente e personale: sessioni separate.');
