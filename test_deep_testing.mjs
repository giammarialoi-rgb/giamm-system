// The Deep Testing report of the Google Play testers (Testers Community, version 1.5.34, 16-10-2026):
// 21 bugs. Each check below is the fix for one of them, so none can come back unnoticed.
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) console.log('OK  ', message);
  else { failed += 1; console.log('FAIL', message); }
}
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const base = read('web/index.base.html');
const cpu = read('web/coach-practice-ui.js');
const main = read('app/src/main/java/com/giammaria/system/MainActivity.java');
const runtime = read('web/i18n-runtime.js');
const services = read('prepare_task20_js_services.mjs');
const server = read('coach-practice.mjs');
const fnBody = (src, name) => {
  const i = src.search(new RegExp('(async )?function ' + name + '\\('));
  if (i < 0) return '';
  const end = src.indexOf('\n}\n', i);
  return src.slice(i, end < 0 ? src.length : end + 2);
};

// BUG-001 Google sign-in: a plain message and a way in by email, never the raw Credential Manager text
ok('BUG-001: Android sends a code (cancelled / no credential / failed) and keeps the details in the log',
  /notifyGoogleError\("google_cancelled"/.test(main) && /"google_no_credential"/.test(main) && /instanceof NoCredentialException/.test(main) && !/notifyAuthError\("Accesso Google: "/.test(main));
ok('BUG-001: the page shows a translated sentence that points to email sign-in',
  /function nativeAuthError\(message, code\)/.test(base) && /Accesso con Google non riuscito su questo telefono\. Entra con email e password/.test(base));

// BUG-002 the Android app never loaded its translations: fetch() is refused on file://
{
  const fp = fnBody(runtime, 'fetchPack');
  ok('BUG-002: translations are read with XMLHttpRequest on file:// (the Android app)', /location\.protocol === 'file:'/.test(fp) && /viaXhr/.test(fp) && /function xhrJson\(url\)/.test(runtime) && /x\.status === 0/.test(runtime));
  // run the loader in a world where fetch refuses file:// like the Android web view
  let xhrUrl = '';
  function FakeXHR() {}
  FakeXHR.prototype.open = function (m, u) { xhrUrl = u; };
  FakeXHR.prototype.send = function () { this.status = 0; this.responseText = '{"CIAO":"HELLO"}'; this.onload(); };
  const ctx = { XMLHttpRequest: FakeXHR, fetch: () => Promise.reject(new TypeError('Failed to fetch')), location: { protocol: 'file:' }, window: {}, Promise, JSON };
  vm.createContext(ctx);
  const start = runtime.indexOf('  function xhrJson(url) {');
  const end = runtime.indexOf('  function setLang(l) {');
  vm.runInContext('var loading = {}; var BASE = "file:///android_asset/";\n' + runtime.slice(start, end) + '\nthis.fetchPack = fetchPack;', ctx);
  const pack = await ctx.fetchPack('en');
  ok('BUG-002: on file:// the pack loads (status 0) from the app folder', pack && pack.CIAO === 'HELLO' && xhrUrl === 'file:///android_asset/i18n/en.json');
}
ok('BUG-002: the food database and the recipes load on Android too', /fetchJsonAsset\('food-ciqual\.json'\)/.test(services) && /__recipeCatalogLoading = fetchJsonAsset\('recipe-catalog\.json'\)/.test(base));
ok('BUG-002: the keys shown in English in every language have Italian texts', ['noActiveProgram', 'askCoach', 'scientificEvidence', 'everyDay', 'weeksLabel', 'activeScale', 'voiceOrReadAsk', 'weekScaleUpdated'].every((k) => new RegExp('\\n      ' + k + ': "').test(services.slice(services.indexOf('  dictionaries: {'), services.indexOf('    en: {', services.indexOf('  dictionaries: {'))))));
ok('BUG-002: the supplement question sent to the AI is the real question, not "Supplement Coach Prompt"', !/t\('supplementCoachPrompt'\)/.test(base));

// BUG-003 offline: every save looped through the offline queue and crashed, the start too
{
  const q = fnBody(cpu, 'queueAccountSyncIfOffline');
  ok('BUG-003: one "sync later" marker, no endless loop', /accountSyncQueueing/.test(q) && /some\(function \(r\) \{ return r && r\.id === 'account-sync'; \}\)/.test(q));
  let persists = 0;
  const store = { clientOutbox: [] };
  const ctx = { store, isAppOnline: () => false, persist: null };
  ctx.enqueueClientOutbox = function (item) { store.clientOutbox.push(item); ctx.persist(); };
  ctx.persist = function () { persists++; if (persists > 50) throw new RangeError('loop'); ctx.queueAccountSyncIfOffline(); };
  vm.createContext(ctx);
  vm.runInContext(cpu.slice(cpu.indexOf('let accountSyncQueueing = false;'), cpu.indexOf('function setNurvanAppBadge(')) + '\nthis.queueAccountSyncIfOffline = queueAccountSyncIfOffline;', ctx);
  let threw = false;
  try { ctx.persist(); ctx.persist(); } catch (_) { threw = true; }
  ok('BUG-003: offline, saving twice queues one marker and saves without crashing', !threw && store.clientOutbox.length === 1 && persists <= 4);
}
ok('BUG-003: a failure after the program was read keeps it, instead of an empty shell', /window\.__bootLoadedProgram = activeProg \|\| null;/.test(base) && /const loaded = window\.__bootLoadedProgram;/.test(base));
ok('BUG-003: the program and its locked backup copy are one choice; the backup is not a program of its own',
  /activeProgramFingerprint\(Object\.assign\(\{\}, body, \{ id: '' \}\)\)/.test(base) && /if \(id === 'personal_locked_backup'\) return false;/.test(base));

// BUG-004 "Usa scheda attiva come base" copied nothing (read after entering the empty client area)
{
  const b = fnBody(cpu, 'beginAssignSandbox');
  ok('BUG-004: the coach\'s program is read before entering the client area', b.indexOf('ownProgram = JSON.parse(JSON.stringify(own))') > 0 && b.indexOf('ownProgram = JSON.parse') < b.indexOf('nurvanEnterClientArea()'));
  ok('BUG-004: only the training goes to the client: no diet, supplements, therapy or exams of the coach', /draft\.nutrition = null;[\s\S]*draft\.therapy = null;[\s\S]*draft\.exams = null;/.test(b));
  ok('BUG-004: an empty draft says so (no endless "Caricamento"), and INVIA waits for a draft', /Bozza vuota/.test(base) && /startEmptyClientDraft\(\)/.test(base) && /window\.startEmptyClientDraft = startEmptyClientDraft;/.test(cpu) && (cpu.match(/\(\(typeof DATA === 'undefined' \|\| !DATA\) \? ' disabled' : ''\)/g) || []).length === 2);
}

// BUG-005 client passwords: 8 characters, a strong one proposed
ok('BUG-005: 8 characters at least, in the app and on the server (sign-in still accepts the old short ones)',
  /password\.length < 8\) \{\s*if \(status\) status\.textContent = 'La password deve avere almeno 8 caratteri\.'/.test(cpu) && /displayName\.length < 2 \|\| password\.length < 8/.test(server) && /if \(password\.length < 8\) return res\.status\(400\)/.test(server) && /if \(!username \|\| password\.length < 4\)/.test(server));
{
  const c = { crypto: { getRandomValues: (a) => { for (let i = 0; i < a.length; i++) a[i] = i * 7919; return a; } }, Math, Uint32Array };
  vm.createContext(c);
  vm.runInContext(fnBody(cpu, 'suggestClientPassword') + '\nthis.p = suggestClientPassword();', c);
  ok('BUG-005: the proposed password is 12 random characters with no look-alikes', /^[a-km-zA-HJ-NP-Z2-9]{12}$/.test(c.p) && /value="' \+ esc\(suggestClientPassword\(\)\) \+ '"/.test(cpu));
}

// BUG-006 / BUG-019 Coach AI on the Free plan, and its field
ok('BUG-006: on the Free plan the lock is on the screen before typing, and the question is kept',
  /function aiCoachLocked\(\)/.test(base) && /aiCoachLocked\(\) \? \(typeof planLockedHtml === 'function' \? planLockedHtml\('ai_coach'\)/.test(base) && /window\.__aiDraft = \$\('ai-input'\)\.value;/.test(base) && !/requirePlan\('ai_coach'\)\) \{\s*if \(typeof navigate === 'function'\) navigate\('pricing'\);/.test(base));
ok('BUG-019: the field grows to four lines, Enter sends and Shift+Enter is a new line', /<textarea id="ai-input" rows="1"/.test(base) && /event\.key==='Enter'&&!event\.shiftKey/.test(base) && /function growAiInput\(el\)/.test(base));

// BUG-007 finalize with exercises not done
{
  const f = fnBody(base, 'finalizeWorkout');
  ok('BUG-007: exercises with no set ticked are named and the person is asked first', /unloggedSessionExercises\(currentWeek, currentDay\)/.test(f) && /await nurvanConfirm\(msg/.test(f) && /return finalizeWorkoutNow\(\);/.test(f));
  ok('BUG-007: the save button confirms where the finger is', /fab\.classList\.add\('is-saved'\)/.test(base));
}

// BUG-008 barcode "Aggiungi al diario" writes in the diary, not in the plan
{
  const a = fnBody(base, 'addLastScannedFoodToDiary');
  ok('BUG-008: the barcode food goes into today\'s diary as eaten', /window\.__diaryFoodTarget = \{ iso: iso, mealIdx: mealIdx, mealName: mealName/.test(a) && !/ensureTargetMealSlot/.test(a));
  ok('BUG-008: a meal the diary does not have yet is added', /if \(!meals\[target\.mealIdx\] && target\.mealName\)/.test(fnBody(base, 'saveDiaryFood')));
}

// BUG-009 recovery with no data
{
  const start = services.indexOf('const ReadinessService');
  const end = services.indexOf('const HealthSyncService');
  const c = { DataProvenance: { make: () => ({}) } };
  vm.createContext(c);
  vm.runInContext(services.slice(start, end).replace('const ReadinessService', 'this.R'), c);
  const none = c.R.assess({}, { highVolume: false, setsCompleted: 0 });
  const slept = c.R.assess({ sleepHours: 8 }, { highVolume: false, setsCompleted: 0 });
  ok('BUG-009: no body data, no verdict ("Dati insufficienti"), even with a training load', none.level === 'unknown' && slept.level !== 'unknown');
  ok('BUG-009: the card offers to add data and shows no confidence then', /r\.level === 'unknown' \? 'AGGIUNGI DATI' : 'DATI'/.test(base));
}

// BUG-010 stats from logged sets only
ok('BUG-010: districts and exercises come from sets ticked, not from the whole program',
  /if \(!logged\(eK\)\) return;/.test(fnBody(base, 'drillStatsMuscle')) && /list = MACRO_MUSCLE_GROUPS\.filter/.test(fnBody(base, 'drillStatsMuscle')));

// BUG-011 developer tools
ok('BUG-011: diagnostics, resets and the AI server check only in developer mode',
  /function isDevMode\(\)/.test(base) && /\$\{!isDevMode\(\) \? '' : `<div class="card"/.test(base) && /\$\{isDevMode\(\) \? `<button class="btn btn-outline" style="font-size:10px;padding:6px 10px;" onclick="checkBackendHealth\(\)"/.test(base) && /\$\{!isDevMode\(\) \? '' : homeCollapsibleCard\(t\('architectureStatus'\)/.test(base));

// BUG-012 screen readers on the first-run questions and the tutorials
ok('BUG-012: dialogs mark the page behind as inert and hidden, focus moves in', /function a11yOpenDialog\(el, titleId\)/.test(base) && /el\.setAttribute\('inert', ''\)/.test(base) && /a11yOpenDialog\(sheet, 'onboarding-title'\)/.test(base) && /a11yOpenDialog\(el, 'page-tutorial-title'\)/.test(base));
ok('BUG-012: choices say whether they are selected', /aria-pressed="' \+ \(on \? 'true' : 'false'\)/.test(base) && /role="radio" aria-checked="/.test(base) && /role="radiogroup" aria-labelledby="onboarding-title"/.test(base));
ok('BUG-012: no tutorial opens under the first-run questions', /#onboarding-sheet, \.nurvan-sheet\.is-open, \.nurvan-confirm/.test(base));

// BUG-013 notifications
ok('BUG-013: no question at start on Android; asked only when needed, after a line saying why, once',
  !/nativeConfig\.requestNotifications\(\);/.test(main) && /public String notificationPermission\(\)/.test(main) && /putBoolean\("asked", true\)/.test(main) &&
  /async function ensureNotificationPermission\(reason\)/.test(base) && /NOTIF_ASKED_KEY/.test(base) && /function requestNotifyPermission\(reason\) \{\s*if \(!reason\) return;/.test(cpu));
ok('BUG-013: iOS schedules only what is already allowed, and never asks by itself', /iosNotificationsAllowed\(\)\.then\(function \(ok\) \{\s*if \(!ok\) return;\s*const id = iosNotifId/.test(base));

// BUG-014 new client "Pagato"
ok('BUG-014: a payment is "registered" only when the coach records it', /ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ/.test(read('server/db/migrations/0038_coach_client_paid_at.sql')) && /paid_at = CASE WHEN \$2 THEN NOW\(\) ELSE paid_at END/.test(server) && /paid_at = NOW\(\)/.test(read('server/coach-os/business.mjs')));
{
  const c = { fmtDay: (d) => String(d) };
  vm.createContext(c);
  vm.runInContext(fnBody(cpu, 'paymentStatusFor') + '\nthis.p = paymentStatusFor;', c);
  const fresh = c.p({ payTracking: true, paid: true, paidAt: null, nextDueAt: null });
  const old = c.p({ payTracking: true, paid: true, nextDueAt: null });
  const recorded = c.p({ payTracking: true, paid: true, paidAt: '2026-11-01', nextDueAt: null });
  ok('BUG-014: a new client reads "Pagamento non registrato"; clients from before and recorded payments read "Pagato"', fresh.state === 'unrecorded' && /non registrato/.test(fresh.text) && old.text === 'Pagato' && recorded.text === 'Pagato');
}

// BUG-015 / BUG-020 / QC-043 layout
ok('BUG-015: the save button sits above the bottom bar and the page can lift the last set clear of it', /body\[data-view="training"\] \.fab-save \{ width: 46px;/.test(base) && /body\[data-view="training"\] #view-container \{ padding-bottom: 150px; \}/.test(base));
ok('BUG-020: the food form has inner margins and its footer no longer sticks out', /#add-food-modal \.modal-body-scroll,[\s\S]{0,200}padding: 12px 16px 8px;/.test(base) && !/margin: 0 -16px 0;/.test(base));
ok('QC-043: the coach controls shrink first; hub tiles wrap their labels', /\.header-actions > #cp-coach-header-controls \{\s*flex: 0 1 auto;/.test(base) && /#menu-hub-modal \.card > div > button\.btn \{\s*height: auto !important;/.test(base));

// BUG-016 browser bubbles and white dialogs
ok('BUG-016: the account form shows the app\'s own messages, not the browser\'s', /<form id="account-form" novalidate/.test(base) && /Inserisci un’email valida\./.test(base));
ok('BUG-016: "will be replaced" only when a program would be replaced; weeks said once; no dialog when nothing is active',
  /function activeProgramWouldBeReplaced\(\)/.test(base) && /var weeksLine = String\(prog\.title \|\| ''\)\.indexOf\(nWeeks \+ ' settimane'\) >= 0/.test(base) && /var plainActivate = target === 'active'/.test(base));
ok('BUG-016: an in-app dialog in the app\'s style and language replaces confirm() where it matters', /function nurvanConfirm\(message, opts\)/.test(base) && /overlay\.__backClose = function \(\) \{ finish\(false\); \};/.test(base));
ok('BUG-016: the remaining system dialogs on Android are dark, untitled, with the phone\'s button labels', /Theme_Material_Dialog_Alert/.test(main) && /android\.R\.string\.cancel/.test(main) && !/setTitle\("Nurvan"\)/.test(main));

// BUG-017 the program count
ok('BUG-017: no count of generator combinations in the library', !/schede · copertura completa filtri/.test(base) && /Programmi per ogni obiettivo, livello e attrezzatura/.test(base));

// BUG-018 resume after a restart
ok('BUG-018: Home shows the workout in progress, with its clock and sets, and leads back to it',
  /function workoutInProgressInfo\(\)/.test(base) && /ALLENAMENTO IN CORSO/.test(base) && /RIPRENDI ALLENAMENTO/.test(base) && /getElementById\('home-session-clock'\)/.test(base));

// BUG-021 logout
ok('BUG-021: logging out is confirmed, and pending changes are uploaded first',
  /async function confirmLogout\(\)/.test(base) && /onclick="confirmLogout\(\)" id="account-logout"/.test(base) && /closeProfileHub\(\);confirmLogout\(\)/.test(base) && /confirmLogout\(\); else logoutAccount\(\)/.test(cpu));

if (failed) { console.log('\n' + failed + ' failed'); process.exit(1); }
console.log('\nAll deep-testing fixes hold.');
