// node tools/browser-checks/ui-audit/coach/coachaudit.mjs <width> <height> <lang> <outdir> [screens,comma]
// Fake coach session + fetch mock (mock.js) in one headless Chrome (needs `node preview-webapp.mjs` on :4173).
// Visits every coach screen and open sheet, audits the DOM (audit-coach.js), writes <screen>-<n>.png + <screen>.json.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const [W, H, LANG, OUT, ONLY] = process.argv.slice(2);
const width = Number(W) || 400; const height = Number(H) || 866; const lang = LANG || 'it';
fs.mkdirSync(OUT, { recursive: true });
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nurvan-coach-'));
const port = 9600 + Math.floor(Math.random() * 90);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target = null;
for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch('http://127.0.0.1:' + port + '/json')).json()).find((t) => t.type === 'page'); } catch (_) {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let seq = 0; const waiting = new Map(); const logs = [];
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description).slice(0, 220)); };
const send = (method, params = {}) => new Promise((resolve) => { const id = ++seq; waiting.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (body) => {
  const r = await send('Runtime.evaluate', { expression: '(async () => { ' + body + ' })()', awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) return 'THROWN ' + JSON.stringify(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description).slice(0, 500);
  return r.result && r.result.result && r.result.result.value;
};
await send('Runtime.enable'); await send('Page.enable');
// 1. the mock, installed before any app script runs (survives reloads)
await send('Page.addScriptToEvaluateOnNewDocument', { source: fs.readFileSync(path.join(here, 'mock.js'), 'utf8') });
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
const prelude = `
  var st = document.createElement('style'); st.textContent = '#account-modal{display:none !important}'; document.head.appendChild(st);
  document.body.classList.remove('nurvan-locked'); document.getElementById('view-container').style.display = '';
  window.confirm = () => true; window.alert = () => {}; window.prompt = () => null;
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);`;
await send('Page.navigate', { url: 'http://localhost:4173/?eval=1&b=' + Date.now() });
await sleep(5500);
await evaluate(prelude);
if (lang !== 'it') { await evaluate("changeAppLanguage('" + lang + "'); return 1;"); await sleep(2000); }
// 2. the fake coach, set right after boot
const boot = await evaluate(`
  store.prefs.tutorialsOff = true;
  store.accountToken = 'fake'; store.accountUser = { id: 'coach1', email: 'c@example.com', name: 'Giammaria Loi' };
  store.coachUnlocked = true;
  store.coachFeatureFlags = { coachShellV2: true, coachTodayV2: true, checkInCenterV1: true, agentV1: true, schedulingV1: true, coachAnalyticsV1: true, businessV1: true, inboxV2: true, mealAiV1: true, videoFormV1: true };
  if (typeof onEntitlementReceived === 'function') onEntitlementReceived({ plan: 'coach_pro', planSource: 'manual', seats: null });
  let lib = [];
  try {
    const p = window.NurvanProgramGenerator.plan({ days: 4, weeks: 8, goal: 'hypertrophy', experience: 'intermediate', equipment: 'gym' });
    lib = [
      { id: 'cpl_1', title: 'Ipertrofia upper/lower 8 settimane', savedAt: new Date().toISOString(), meta: { weeks: 8 }, payload: Object.assign({}, p, { nutrition: { present: true, days: [] }, supplementation: { items: [{ name: 'Creatina' }] } }) },
      { id: 'cpl_2', title: 'Forza di base 5x5 per principianti con gestione della spalla', savedAt: new Date().toISOString(), meta: { weeks: 12 }, payload: p },
      { id: 'cpl_3', title: 'Piano alimentare 2.100 kcal', savedAt: new Date().toISOString(), meta: {}, payload: { nutrition: { present: true, days: [] }, therapy: { present: true }, exams: { present: true } } }
    ];
  } catch (e) {}
  store.coachProgramLibrary = lib;
  window.__reset = async function () {
    try { if (store.coachViewingClient) await leaveCoachClientView(true); } catch (_) {}
    ['cp-assign', 'cp-add', 'cp-invite', 'cp-modal', 'cp-intake', 'cp-demo'].forEach(function (id) { try { showOverlay(id, false); } catch (_) {} });
    ['coach-appointment-form', 'coach-payment-form', 'cp-invite-sheet', 'cp-resend-invite', 'cp-invite-template'].forEach(function (id) { var e = document.getElementById(id); if (e) e.remove(); });
    try { closeCpModal(); } catch (_) {}
    try { closeCoachDrawer(); } catch (_) {}
    try { closeNotificationsCenter(); } catch (_) {}
    try { closeChatAttachSheet(); } catch (_) {}
    try { clearTimeout(window.__cpInappNotifyTimer); var nn = document.getElementById('cp-inapp-notify'); if (nn) nn.style.display = 'none'; } catch (_) {}
    try { document.querySelectorAll('.cp-overlay').forEach(function (e) { e.style.display = 'none'; }); } catch (_) {}
  };
  window.__w = (ms) => new Promise((r) => setTimeout(r, ms));
  enterCoachSession(); await __w(2500);
  return { view: currentView, body: document.body.className, lang: document.documentElement.lang };`);
console.log('boot', JSON.stringify(boot));
await sleep(500);

const C1 = "await openCoachClient('1'); await __w(2200);";
const NAV = (v, ms) => "navigate('" + v + "'); await __w(" + (ms || 1800) + ");";
const OV = '#cp-assign-panel';
const SCREENS = [
  { n: 'today', s: NAV('coachToday') },
  { n: 'today-task-menu', s: NAV('coachToday') + "CoachOS.taskMenu(0); await __w(500);", sc: OV },
  { n: 'today-attention-menu', s: NAV('coachToday') + "CoachOS.attentionMenu(0); await __w(500);", sc: OV },
  { n: 'hub', s: NAV('coachHub', 2500) },
  { n: 'hub-search', s: NAV('coachHub', 2000) + "window.__cpClientQ='ma'; await loadCoachClientList(); await __w(500);" , after: "window.__cpClientQ='';" },
  { n: 'hub-checkins-to-read', s: NAV('coachHub', 2200) + "openCoachCheckInsToRead(); await __w(500);", sc: OV },
  { n: 'hub-drawer', s: NAV('coachHub', 1800) + "openCoachDrawer(); await __w(500);", sc: '#cp-coach-drawer .cp-drawer-panel' },
  { n: 'notifications', s: NAV('coachHub', 1800) + "openNotificationsCenter(); await __w(1200);", sc: '#cp-notify-center .cp-notify-panel' },
  { n: 'add-client-new', s: NAV('coachHub', 1500) + "window.__cpAddMode='new'; openAddClientWizard(); await __w(600);", sc: '#cp-add-panel' },
  { n: 'add-client-transition', s: NAV('coachHub', 1500) + "setAddClientMode('transition'); openAddClientWizard(); await __w(1200);", sc: '#cp-add-panel', after: "window.__cpAddMode='new';" },
  { n: 'invite-template', s: NAV('coachHub', 1500) + "openInviteTemplateEditor(); await __w(500);", sc: '#cp-invite-template > .card' },
  { n: 'invite-sheet', s: NAV('coachHub', 1500) + "showInviteSheet('Invito pronto', 'Ciao Alessandra Montanari-Bellini! Entra su Nurvan da qui: https://app.nurvan.app/c/tok_ale111111\\nUtente: alessandra.montanari-bellini\\nPassword: forza4821\\nCodice: 111111', 'Al primo accesso compilerà il questionario.'); await __w(600);", sc: '#cp-invite-sheet > div' },
  { n: 'resend-invite', s: NAV('coachHub', 1500) + "await copyClientInvite('1','tok_ale111111'); await __w(700);", sc: '#cp-resend-invite > div' },
  { n: 'client-1', s: C1 },
  { n: 'client-2-newintake', s: "await openCoachClient('2'); await __w(2200);" },
  { n: 'client-5-pendingchange', s: "await openCoachClient('5'); await __w(2200);" },
  { n: 'client-8-pendingunlock', s: "await openCoachClient('8'); await __w(2200);" },
  { n: 'client-6-leave', s: "await openCoachClient('6'); await __w(2200);" },
  { n: 'client-7-longname', s: "await openCoachClient('7'); await __w(2200);" },
  { n: 'client-9-notemplate', s: "await openCoachClient('9'); await __w(2200);" },
  { n: 'client-checkin-editor', s: C1 + "editCoachCheckInTemplate(); await __w(500);" },
  { n: 'client-checkin-detail', s: C1 + "await openScheduledCheckInDetail('101'); await __w(900);", sc: OV },
  { n: 'client-schedule-modal', s: C1 + "editClientSchedule('1'); await __w(500);", sc: '#cp-modal-panel' },
  { n: 'client-request-check', s: C1 + "requestCheckFromClient('1'); await __w(500);", sc: '#cp-modal-panel' },
  { n: 'client-request-exams', s: C1 + "await requestExamsFromClient('1'); await __w(900);", sc: '#cp-modal-panel' },
  { n: 'client-assign-chooser', s: C1 + "openAssignChooser('1','Alessandra Montanari-Bellini'); await __w(700);", sc: '#cp-assign-panel' },
  { n: 'client-anagrafica', s: C1 + "await openCoachClientAnagrafica(); await __w(900);", sc: '#cp-intake-panel' },
  { n: 'client-notifications', s: C1 + "openNotificationsCenter('1'); await __w(1000);", sc: '#cp-notify-center .cp-notify-panel' },
  { n: 'cv-training', s: C1 + "await enterCoachClientView('training'); await __w(2500);" },
  { n: 'cv-stats', s: C1 + "await enterCoachClientView('stats'); await __w(2500);" },
  { n: 'cv-nutrition', s: C1 + "await enterCoachClientView('nutrition'); await __w(2500);" },
  { n: 'cv-supplements', s: C1 + "await enterCoachClientView('supplements'); await __w(2500);" },
  { n: 'cv-calendar', s: C1 + "await enterCoachClientView('calendar'); await __w(2500);" },
  { n: 'inbox', s: NAV('coachInbox') },
  { n: 'calendar-week', s: "CoachOS.setCalendarRange && 0; " + NAV('coachCalendar', 2200) },
  { n: 'calendar-day', s: NAV('coachCalendar', 1800) + "CoachOS.setCalendarRange('day'); await __w(600);" },
  { n: 'calendar-month', s: NAV('coachCalendar', 1800) + "CoachOS.setCalendarRange('month'); await __w(600);", after: "CoachOS.setCalendarRange('week');" },
  { n: 'calendar-new-form', s: NAV('coachCalendar', 1800) + "await CoachOS.openAppointmentForm(); await __w(600);", sc: '#coach-appointment-form > .card' },
  { n: 'calendar-move-form', s: NAV('coachCalendar', 1800) + "await CoachOS.openAppointmentForm('2'); await __w(600);", sc: '#coach-appointment-form > .card' },
  { n: 'checkins-to_review', s: NAV('coachCheckIns', 2000) },
  { n: 'checkins-requested', s: NAV('coachCheckIns', 1500) + "CoachOS.setCheckInStatus('requested'); await __w(1500);" },
  { n: 'checkins-received', s: NAV('coachCheckIns', 1500) + "CoachOS.setCheckInStatus('received'); await __w(1500);" },
  { n: 'checkins-reviewed', s: NAV('coachCheckIns', 1500) + "CoachOS.setCheckInStatus('reviewed'); await __w(1500);", after: "CoachOS.setCheckInStatus('to_review');" },
  { n: 'checkins-detail', s: NAV('coachCheckIns', 1800) + "await CoachOS.openCheckIn(0); await __w(900);", sc: OV },
  { n: 'checkins-request-picker', s: NAV('coachCheckIns', 1800) + "await CoachOS.requestCheckInPicker(); await __w(600);", sc: OV },
  { n: 'programs', s: NAV('coachPrograms') },
  { n: 'programs-menu', s: NAV('coachPrograms') + "CoachOS.programMenu('cpl_1'); await __w(500);", sc: OV },
  { n: 'programs-assign', s: NAV('coachPrograms') + "await CoachOS.chooseClientForProgram('cpl_1'); await __w(600);", sc: OV },
  { n: 'programs-import', s: NAV('coachPrograms') + "CoachOS.openNativeImport(); await __w(1800);", after: "store.__coachOsNativeImport=false;store.__cpCoachLibraryImport=false;" },
  { n: 'programs-catalog', s: NAV('coachPrograms') + "CoachOS.openNurvanCatalog(); await __w(2500);", after: "store.__coachOsProgramCatalog=false;" },
  { n: 'library', s: NAV('coachLibrary', 2000) },
  { n: 'analytics', s: NAV('coachAnalytics') },
  { n: 'business-ledger', s: NAV('coachBusiness', 2200) },
  { n: 'business-payment-form', s: NAV('coachBusiness', 2000) + "await CoachOS.openPaymentForm(); await __w(600);", sc: '#coach-payment-form > .card' },
  { n: 'crm', s: NAV('coachCrm') },
  { n: 'automations', s: NAV('coachAutomations') },
  { n: 'agent', s: NAV('coachAgent', 1200) },
  { n: 'agent-run', s: NAV('coachAgent', 1000) + "document.getElementById('coach-os-agent-input').value='Chi non si allena da una settimana?'; await CoachOS.submitAgentRun(); await __w(1800);" },
  { n: 'agent-audit', s: NAV('coachAgentAudit', 1500) },
  { n: 'nutrition-view', s: NAV('coachNutrition', 1800) },
  { n: 'meal-ai', s: NAV('coachMealAi', 1500) },
  { n: 'form-review', s: NAV('coachFormReview', 1500) },
  { n: 'coach-ai', s: NAV('ai', 1800) },
  { n: 'chat', s: "openCoachClientChat('1'); await __w(2500);" },
  { n: 'chat-attach-sheet', s: "openCoachClientChat('1'); await __w(2000); openChatAttachSheet(); await __w(500);", sc: '.cp-attach-sheet .cp-sheet' }
];
const only = ONLY ? ONLY.split(',') : null;
const tpl = fs.readFileSync(path.join(here, 'audit-coach.js'), 'utf8');
const summary = [];
for (const sc of SCREENS) {
  if (only && !only.includes(sc.n)) continue;
  const t0 = Date.now();
  await evaluate('await __reset();');
  const setupRes = await evaluate(sc.s + ' return currentView;');
  if (typeof setupRes === 'string' && setupRes.startsWith('THROWN')) { summary.push({ screen: sc.n, error: 'setup ' + setupRes.slice(0, 200) }); await evaluate('await __reset();'); continue; }
  await sleep(300);
  const res = await evaluate(tpl.replace('__VIEW__', sc.n).replace('__LANG__', lang));
  if (typeof res === 'string') { summary.push({ screen: sc.n, error: res.slice(0, 200) }); continue; }
  res.currentView = setupRes;
  const scrollSel = JSON.stringify(sc.sc || '#view-container');
  const info = await evaluate(`const el = document.querySelector(${scrollSel}) || document.getElementById('view-container'); el.scrollTop = 0; return { sh: el.scrollHeight, ch: el.clientHeight };`);
  const step = Math.max(300, info.ch - 40); let n = 0;
  for (let y = 0; y < info.sh && n < 6; y += step, n++) {
    await evaluate(`const el = document.querySelector(${scrollSel}) || document.getElementById('view-container'); el.scrollTop = ${y}; return 1;`); await sleep(220);
    try { const shot = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, sc.n + '-' + (n + 1) + '.png'), Buffer.from(shot.result.data, 'base64')); } catch (e) { console.log('shot failed', sc.n); }
  }
  res.segments = n; res.scrollHeight = info.sh; res.clientHeight = info.ch;
  fs.writeFileSync(path.join(OUT, sc.n + '.json'), JSON.stringify(res, null, 1));
  summary.push({ screen: sc.n, view: setupRes, heading: res.heading, hscroll: res.pageScrollsHorizontally, issues: res.issueCount, en: res.english.length, segs: n, ms: Date.now() - t0 });
  if (sc.after) await evaluate(sc.after + ' return 1;');
}
const unm = await evaluate('return { unmocked: [...new Set(window.__coachMock.unmocked)], calls: window.__coachMock.calls.length };');
fs.writeFileSync(path.join(OUT, '_summary.json'), JSON.stringify({ summary, unm, logs: [...new Set(logs)] }, null, 1));
for (const s of summary) console.log(JSON.stringify(s));
console.log('UNMOCKED', JSON.stringify(unm));
if (logs.length) console.log([...new Set(logs)].join('\n'));
ws.close(); chrome.kill(); await sleep(300);
try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
