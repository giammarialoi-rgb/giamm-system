// What the stores ask of an app with messages between people (report and block),
// and the Salute screen that replaces the dead button: typed values, the estimate
// reading them, kept from the coach unless shared.
// The server side of the chat is also proved end to end on a real PostgreSQL
// (not part of this file: it needs a database).
import fs from 'node:fs';
import vm from 'node:vm';
import { coachVisibleAccountData } from './server/coach-os/workspace.mjs';
import { listChatReports, handleChatReport, openReportCount, CHAT_REPORT_REASONS } from './server/admin/reports.mjs';

let failed = 0;
function ok(message, value) {
  if (value) console.log('OK  ', message);
  else { failed += 1; console.log('FAIL', message); }
}
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');

// ---- chat: server
const cp = read('coach-practice.mjs');
ok('the chat has a report table and a block flag on the relationship', /CREATE TABLE IF NOT EXISTS chat_reports/.test(cp) && /ADD COLUMN IF NOT EXISTS chat_blocked_by TEXT/.test(cp));
ok('both sides can report and block, on routes that check who they are', ['/api/client/chat/report', '/api/client/chat/block', '/api/coach/clients/:id/chat/report', '/api/coach/clients/:id/chat/block'].every((r) => cp.includes('"' + r + '"')));
ok('a blocked chat takes no new message, from anyone (also the automatic ones)', /chat_blocked_by FROM coach_clients WHERE id = \$1", \[clientId\]\);\n    if \(blocked\.rows\[0\] && blocked\.rows\[0\]\.chat_blocked_by\) return \{ blocked: true/.test(cp));
ok('the two ways to write answer 403 with a clear code', (cp.match(/code: "CHAT_BLOCKED"/g) || []).length === 2);
ok('only who blocked can unblock', /WHERE id = \$1 AND chat_blocked_by = \$2/.test(cp));
ok('the thread tells each side whether it is blocked', (cp.match(/chat: \{ blockedBy:/g) || []).length === 2);
ok('reports are limited per person per day', /INTERVAL '1 day'/.test(cp) && />= 10/.test(cp));
ok('what a report keeps is bounded and only what the reporter attached', /raw\.slice\(-12\)/.test(cp) && /slice\(0, 1000\)/.test(cp) && /slice\(0, 2000\)/.test(cp));
ok('handled reports are deleted after 12 months, as the privacy notice says', /status = 'handled' AND handled_at < NOW\(\) - INTERVAL '12 months'/.test(cp));

// ---- chat: the people using it
const ui = read('web/coach-practice-ui.js');
ok('the chat has a button for report and block', /onclick="openChatSafety\(\)">SEGNALA · BLOCCA/.test(ui));
ok('the sheet gives the reasons, a free text, the choice to attach messages and to block as well', CHAT_REPORT_REASONS && /cp-safety-reason/.test(ui) && /cp-safety-details/.test(ui) && /cp-safety-excerpt/.test(ui) && /cp-safety-block/.test(ui));
ok('it says that the chat is encrypted and what is sent', /Nurvan non può leggerla/.test(ui) && /ultimi 10 messaggi/.test(ui));
ok('it publishes a contact and a response time', /info@nurvan\.app/.test(ui) && /entro 24 ore/.test(ui));
ok('the messages attached are the ones decrypted on the phone', /window\.__cpChatLast = decrypted;/.test(ui) && /text: m\._plain != null \? m\._plain : ''/.test(ui));
ok('a blocked thread says so', /Hai bloccato questa chat/.test(ui) && /bloccata dall’altra persona/.test(ui));

// ---- chat: the dashboard
const ops = read('admin/page-ops.js');
ok('the dashboard has a tab for the reports, with the attached messages and a "handled" button', /\['reports', 'Segnalazioni chat'\]/.test(ops) && /Messaggi allegati/.test(ops) && /Gestita/.test(ops));
ok('the overview warns about open reports', /segnalazion/.test(read('server/admin/overview.mjs')));
// the reports module answers an empty list when the table is not there yet
const absent = { query: async () => { const e = new Error('no table'); e.code = '42P01'; throw e; } };
ok('before the first chat exists the list is empty, not an error', (await listChatReports(absent)).length === 0 && (await openReportCount(absent)) === 0);
const calls = [];
const pool = { query: async (sql, p) => { calls.push([sql, p]); return { rowCount: 1, rows: [] }; } };
ok('closing a report only touches an open one', (await handleChatReport(pool, '5', ' fatto ')) === true && /status = 'open'/.test(calls[0][0]) && calls[0][1][1] === 'fatto');

// ---- Salute: what a coach sees
const day = '2026-10-04';
const rec = { steps: 9000, vitals: { sleepHours: 7, restingHr: 55 }, water: 2 };
const seen = coachVisibleAccountData({ nutritionDaily: { [day]: rec }, prefs: {} });
ok('sleep, resting heart rate and HRV are kept from the coach by default', !('vitals' in seen.nutritionDaily[day]) && seen.nutritionDaily[day].steps === 9000 && seen.nutritionDaily[day].water === 2);
ok('they are shown when the person shares them', coachVisibleAccountData({ nutritionDaily: { [day]: rec }, prefs: { healthShareCoach: true } }).nutritionDaily[day].vitals.restingHr === 55);
ok('the stored record is not touched', rec.vitals.sleepHours === 7);

// ---- Salute: the screen
const app = read('web/index.base.html');
ok('the Salute tile opens the screen, and has its own rule', /data-hub="health"[^>]*onclick="closeMenuHub\(\);navigate\('health'\)"/.test(app) && /\[data-hub="health"\]/.test(ui));
ok('the view is wired', /else if \(currentView === 'health'\) renderHealth\(c\);/.test(app));
const src = app.slice(app.indexOf('function isNativeApp()'), app.indexOf('function renderHealth('));
const store = { nutritionDaily: {}, prefs: {}, health: {} };
const keyOf = (back) => { const d = new Date(); d.setDate(d.getDate() - back); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
let toast = null, athlete = false, native = false;
const ctx = vm.createContext({
  store, window: { Capacitor: undefined }, document: { getElementById: () => null }, nutritionTodayKey: () => keyOf(0),
  isAthleteRole: () => athlete, persist() {}, render() {}, showToast: (m) => { toast = m; },
  get NativeConfig() { if (native) return {}; throw new ReferenceError('NativeConfig is not defined'); }
});
vm.runInContext(src, ctx);
ok('a coach\'s client on the web app has no Salute; on the phone app they do', (() => { athlete = true; native = false; const w = vm.runInContext('healthTileAvailable()', ctx); native = true; const p = vm.runInContext('healthTileAvailable()', ctx); athlete = false; native = false; return w === false && p === true; })());
ok('anyone else has it on the web app too', vm.runInContext('healthTileAvailable()', ctx) === true);
ok('with nothing written the estimate reads nothing', Object.keys(vm.runInContext('manualHealthSample()', ctx)).length === 0);
// two weeks of a normal resting heart rate, then a higher one today
for (let i = 1; i <= 8; i++) store.nutritionDaily[keyOf(i)] = { vitals: { restingHr: 54 + (i % 2), hrvMs: 70 } };
store.nutritionDaily[keyOf(0)] = { steps: 4000, vitals: { sleepHours: 5.5, restingHr: 63, hrvMs: 48 } };
const sample = vm.runInContext('manualHealthSample()', ctx);
ok('it reads today\'s sleep, resting heart rate, HRV and steps', sample.sleepHours === 5.5 && sample.restingHr === 63 && sample.hrvMs === 48 && sample.steps === 4000);
ok('against the person\'s own usual values', sample.baselineRhr >= 54 && sample.baselineRhr <= 55 && sample.baselineHrv === 70);
delete store.nutritionDaily[keyOf(0)];
ok('yesterday still counts', vm.runInContext('manualHealthSample()', ctx).restingHr === 55);
[1, 2, 3].forEach((i) => { delete store.nutritionDaily[keyOf(i)]; });
ok('a value older than three days no longer counts', Object.keys(vm.runInContext('manualHealthSample()', ctx)).length === 0);
ok('the home estimate reads the typed values', /manualHealthSample\(\)/.test(app.slice(app.indexOf('function computeHomeReadinessHtml'), app.indexOf('function exportStatsCsv'))));
ok('the old "SYNC" that did nothing is gone', !/>SYNC<\/button>/.test(app));
ok('no wording says Nurvan reads other apps, and it says what it does not read', /Nurvan non legge Apple Salute né Health Connect/.test(app));
ok('the person can delete a day, or everything, and choose to share with the coach (off by default)', /function deleteHealthDay/.test(app) && /function clearAllHealthVitals/.test(app) && /healthShareCoach === true/.test(app) && /spento di base/.test(app));
ok('the values are checked against sensible ranges', /sleepHours: \[1, 16\], restingHr: \[25, 140\], hrvMs: \[5, 250\], steps: \[0, 100000\]/.test(app));

// ---- privacy notice
const privacy = read('web/privacy.html');
ok('the notice describes the reports and the blocks', /Segnalazioni e blocchi nella chat/.test(privacy) && /decifrati dal tuo telefono/.test(privacy));
ok('it says how long they are kept', /altri 12 mesi/.test(privacy));
ok('it says what is typed in Salute and who sees it', /sezione Salute/.test(privacy) && /Non vengono inviati al Coach AI/.test(privacy));
ok('the version changed, so everyone is asked again', /"version": "2026-10-04"/.test(read('web/features.json')));

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nChat sicura e Salute: tutto verde');
