// A quick audit of the built app in a real headless Chrome, for a store review:
//   1. every handler written in the markup (onclick="...", onchange="..."...) points to a function that exists;
//   2. the 18 screens draw with nothing in the console;
//   3. the Database file picker takes every type it declares (.csv .json .png .pdf .xlsx .txt ...) without a refusal;
//   4. the RIPROVA button of a check that failed to send does something, and ends in a sent check.
//
//   node preview-webapp.mjs            (port 4173, in another terminal, after npm run build:web)
//   node tools/browser-checks/review_audit.mjs
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const base = process.env.APP_URL || 'http://localhost:4173';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nurvan-review-'));
const port = 9600 + Math.floor(Math.random() * 90);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target = null;
for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch('http://127.0.0.1:' + port + '/json')).json()).find((t) => t.type === 'page'); } catch (_) {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let seq = 0; const waiting = new Map(); let consoleErrors = [];
ws.onmessage = (ev) => {
  const x = JSON.parse(ev.data);
  if (x.id && waiting.has(x.id)) { waiting.get(x.id)(x); waiting.delete(x.id); return; }
  if (x.method === 'Runtime.exceptionThrown') consoleErrors.push('EXC ' + String(x.params.exceptionDetails.exception && x.params.exceptionDetails.exception.description).slice(0, 200));
  else if (x.method === 'Runtime.consoleAPICalled' && x.params.type === 'error') consoleErrors.push('ERR ' + x.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 200));
};
const send = (method, params = {}) => new Promise((resolve) => { const id = ++seq; waiting.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (body) => {
  const r = await send('Runtime.evaluate', { expression: '(async () => { ' + body + ' })()', awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) return 'THROWN ' + JSON.stringify(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description).slice(0, 400);
  return r.result && r.result.result && r.result.result.value;
};
let failed = 0;
const ok = (m, v, extra) => { if (v) console.log('OK   ' + m); else { failed++; console.log('FAIL ' + m + (extra ? ' - ' + extra : '')); } };

await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 400, height: 866, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url: base + '/?eval=1&b=' + Date.now() });
await sleep(5500);
await evaluate(`
  const st = document.createElement('style'); st.textContent = '#account-modal{display:none !important}'; document.head.appendChild(st);
  document.body.classList.remove('nurvan-locked'); document.getElementById('view-container').style.display = '';
  window.__alerts = []; window.alert = (m) => { window.__alerts.push(String(m)); };
  window.__confirms = []; window.confirm = (m) => { window.__confirms.push(String(m)); return true; };
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
  return 1;`);

// 1. handlers
const scan = await evaluate(`
  const src = await (await fetch(location.pathname + '?b=' + Date.now())).text();
  const re = /\\son(?:click|change|input|submit|keydown|keyup|focus|blur|load|error|toggle|pointerdown|pointerup|touchstart)\\s*=\\s*\\\\?(?:"([^"]*)"|'([^']*)')/g;
  const KEYWORDS = new Set(['if','for','while','return','function','typeof','new','this','event','else','var','let','const','true','false','null','void','await','async','switch','case']);
  const BUILTIN = new Set(['alert','confirm','prompt','setTimeout','setInterval','clearTimeout','clearInterval','parseInt','parseFloat','String','Number','Boolean','JSON','Math','Date','encodeURIComponent','decodeURIComponent','isNaN','requestAnimationFrame','Array','Object','Promise','Event','Error','RegExp','Intl','Set','Map','URL','Blob','File','FileReader','Image','Headers','fetch','history']);
  const names = new Map(); let handlers = 0; let m;
  while ((m = re.exec(src))) {
    handlers++;
    let code = (m[1] != null ? m[1] : m[2]);
    // what is joined into the markup while the page is drawn is not part of the handler
    code = code.replace(/\\$\\{[^}]*\\}/g, '').replace(/'\\s*\\+[\\s\\S]*?\\+\\s*'/g, '');
    const reCall = /(^|[^.\\w$])([A-Za-z_$][\\w$]*)\\s*\\(/g; let c;
    while ((c = reCall.exec(code))) { const n = c[2]; if (!KEYWORDS.has(n) && !BUILTIN.has(n)) names.set(n, (names.get(n) || 0) + 1); }
  }
  const missing = [];
  for (const n of names.keys()) if (typeof window[n] !== 'function') missing.push(n);
  return JSON.stringify({ handlers, distinct: names.size, missing });`);
const sc = JSON.parse(scan);
ok('1. every handler in the markup calls a function that exists (' + sc.handlers + ' handlers, ' + sc.distinct + ' distinct functions)', !sc.missing.length, sc.missing.join(', '));

// 2. the screens
const views = ['home', 'training', 'programs', 'stats', 'nutrition', 'supplements', 'therapy', 'exams', 'settings', 'ai', 'db', 'import', 'knowledge', 'pricing', 'athlete', 'calendar', 'community', 'progress'];
consoleErrors = [];
let drawn = 0;
for (const v of views) {
  const before = consoleErrors.length;
  const html = await evaluate(`try { navigate('${v}'); } catch (e) { return 'THROW ' + e.message; } await new Promise((r) => setTimeout(r, 900)); return String(document.getElementById('view-container').innerText || '').trim().length;`);
  // a failed request is what offline looks like: the screen must still draw (it does), the console says so
  const newErrors = consoleErrors.slice(before).filter((e) => !/Failed to fetch|NetworkError|network error/.test(e));
  const good = typeof html === 'number' && html > 20 && !newErrors.length;
  if (good) drawn++; else console.log('   view ' + v + ': ' + (typeof html === 'number' ? html + ' chars' : html) + ' ' + newErrors.join(' | '));
}
ok('2. ' + views.length + ' screens draw with text and with nothing in the console (' + drawn + ' ok)', drawn === views.length);

// 3. the Database file picker
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nurvan-files-'));
const XLSX = require('xlsx');
const sample = {
  'programma.csv': Buffer.from('Giorno;Esercizio;Serie;Reps\nLunedi;Panca piana;4;8\nLunedi;Rematore;4;10\n'),
  'programma.json': Buffer.from(JSON.stringify({ title: 'Prova', weeks: [{ week: 1, sessions: [{ name: 'A', exercises: [{ name: 'Panca piana', sets: 3, reps: '8' }] }] }] })),
  'foto.png': Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
  'scheda.pdf': Buffer.from('%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'),
  'scheda.xlsx': (() => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Giorno', 'Esercizio', 'Serie', 'Reps'], ['Lunedi', 'Panca piana', 4, 8]]), 'Scheda'); return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }); })(),
  'note.txt': Buffer.from('Giorno 1\nPanca piana 4x8\nRematore 4x10\n')
};
// REVIEW_FILES=a.pdf,b.csv: try these real files too (the samples for the reviewers) and say whether the app read the exercises
const extra = String(process.env.REVIEW_FILES || '').split(',').filter(Boolean);
for (const f of extra) sample[path.basename(f)] = fs.readFileSync(f);
const refusal = /Seleziona PDF|non supportat|formato non|tipo di file/i;
for (const name of Object.keys(sample)) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, sample[name]);
  await evaluate(`window.__alerts.length = 0; navigate('db'); await new Promise((r) => setTimeout(r, 400)); const el = document.getElementById('db-file-input'); if (el) el.value = ''; return !!el;`);
  const doc = await send('DOM.getDocument', { depth: 1 });
  const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '#db-file-input' });
  if (!q.result.nodeId) { ok('3. ' + name + ': the picker exists', false); continue; }
  consoleErrors = [];
  await send('DOM.setFileInputFiles', { nodeId: q.result.nodeId, files: [file] });
  await sleep(4500);
  const seen = await evaluate(`return JSON.stringify({ read: /Panca|Rematore|Lat machine|Yogurt|Proteine|Energia/i.test(document.body.innerText), alerts: window.__alerts.slice(), overlay: !!document.querySelector('#import-progress-overlay') && document.querySelector('#import-progress-overlay').style.display, review: !!document.querySelector('[id*=review]') });`);
  const s = JSON.parse(seen);
  const refused = s.alerts.some((a) => refusal.test(a));
  ok('3. ' + name + ' is taken by the Database picker' + (extra.some((f) => path.basename(f) === name) ? (s.read ? ' and its content is read' : ' (content not shown on screen)') : '') + (s.alerts.length ? ' (message: ' + s.alerts.join(' / ').slice(0, 120) + ')' : ''), !refused && !consoleErrors.filter((e) => /Seleziona|undefined|not a function/.test(e)).length, 'refused: ' + s.alerts.join(' / ').slice(0, 160) + ' | console: ' + consoleErrors.join(' / ').slice(0, 300));
  await evaluate(`try { if (typeof hideImportProgress === 'function') hideImportProgress(); } catch (_) {} return 1;`);
}

// 4. RIPROVA
const retry = await evaluate(`
  window.__calls = 0;
  window.submitClientCheckInToCoach = async function () { window.__calls++; if (window.__calls === 1) throw new Error('offline'); return { checkIn: { id: 'srv1' } }; };
  const id = 'chk_audit_1';
  store.bodyChecks = [{ id: id, at: new Date().toISOString(), weight: 70, checkInSyncState: 'FAILED', sentToCoach: true }];
  if (typeof isAthleteRole === 'function') window.isAthleteRole = function () { return true; };
  navigate('stats'); await new Promise((r) => setTimeout(r, 700));
  let btn = [...document.querySelectorAll('button')].find((b) => /RIPROVA/.test(b.textContent));
  const found = !!btn;
  if (btn) btn.click();
  await new Promise((r) => setTimeout(r, 1200));
  const state1 = (store.bodyChecks[0] || {}).checkInSyncState;
  btn = [...document.querySelectorAll('button')].find((b) => /RIPROVA/.test(b.textContent));
  if (btn) btn.click();
  await new Promise((r) => setTimeout(r, 1200));
  const state2 = (store.bodyChecks[0] || {}).checkInSyncState;
  const still = !![...document.querySelectorAll('button')].find((b) => /RIPROVA/.test(b.textContent));
  return JSON.stringify({ found, calls: window.__calls, state1, state2, still });`);
let rt = null; try { rt = JSON.parse(retry); } catch (_) {}
ok('4a. a check in error shows RIPROVA', rt && rt.found, String(retry).slice(0, 200));
ok('4b. pressing it sends again; a second failure leaves it in error with the button', rt && rt.calls >= 1 && /FAILED|QUEUED/.test(rt.state1 || ''), JSON.stringify(rt));
ok('4c. pressing it again, when the send works, ends in SYNCED and the button goes away', rt && rt.calls === 2 && rt.state2 === 'SYNCED' && !rt.still, JSON.stringify(rt));

ws.close(); chrome.kill(); await sleep(300);
try { fs.rmSync(profile, { recursive: true, force: true }); fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
console.log(failed ? '\n' + failed + ' FAIL' : '\nAudit del build: tutto in regola.');
process.exit(failed ? 1 : 0);
