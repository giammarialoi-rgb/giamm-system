// The coach area for the store listings: a fake coach with made-up clients, every call to the server answered by
// the mock of tools/browser-checks/ui-audit/coach/mock.js (nothing reaches the real database).
//
//   node preview-webapp.mjs            (port 4173, in another terminal, after npm run build:web)
//   node tools/store/make_coach_screenshots.mjs <outdir> [width height dpr]
//
// The fake coach comes from the same boot code as the UI audit of the coach area (read from there, so the two stay equal).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [OUT, W = '440', H = '956', DPR = '3'] = process.argv.slice(2);
if (!OUT) { console.log('usage: node tools/store/make_coach_screenshots.mjs <outdir> [width height dpr]'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const auditDir = path.join(here, '../browser-checks/ui-audit/coach');
const audit = fs.readFileSync(path.join(auditDir, 'coachaudit.mjs'), 'utf8');
const m = audit.match(/const boot = await evaluate\(`([\s\S]*?)`\);\nconsole\.log\('boot'/);
if (!m) throw new Error('boot code of the coach audit not found');
// The coach of the screenshots is not a real person.
const bootJs = new Function('return `' + m[1] + '`')().split('Giammaria Loi').join('Marco Conti');

const width = Number(W), height = Number(H), dpr = Number(DPR);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nurvan-store-coach-'));
const port = 9700 + Math.floor(Math.random() * 90);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target = null;
for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch('http://127.0.0.1:' + port + '/json')).json()).find((t) => t.type === 'page'); } catch (_) {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let seq = 0; const waiting = new Map(); const logs = [];
ws.onmessage = (ev) => { const x = JSON.parse(ev.data); if (x.id && waiting.has(x.id)) { waiting.get(x.id)(x); waiting.delete(x.id); } else if (x.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(x.params.exceptionDetails.exception && x.params.exceptionDetails.exception.description).slice(0, 300)); };
const send = (method, params = {}) => new Promise((resolve) => { const id = ++seq; waiting.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (body) => {
  const r = await send('Runtime.evaluate', { expression: '(async () => { ' + body + ' })()', awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) return 'THROWN ' + JSON.stringify(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description).slice(0, 500);
  return r.result && r.result.result && r.result.result.value;
};
await send('Runtime.enable'); await send('Page.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: fs.readFileSync(path.join(auditDir, 'mock.js'), 'utf8') });
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: true });
const prelude = `
  var st = document.createElement('style'); st.textContent = '#account-modal{display:none !important}'; document.head.appendChild(st);
  document.body.classList.remove('nurvan-locked'); document.getElementById('view-container').style.display = '';
  window.confirm = () => true; window.alert = () => {}; window.prompt = () => null;
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);`;
await send('Page.navigate', { url: 'http://localhost:4173/?eval=1&b=' + Date.now() });
await sleep(5500);
await evaluate(prelude);
console.log('boot', JSON.stringify(await evaluate(bootJs)));
await sleep(500);

const NAV = (v, ms) => "navigate('" + v + "'); await __w(" + (ms || 2000) + ");";
const TOP = "const vc = document.getElementById('view-container'); vc.scrollTop = 0; window.scrollTo(0, 0);";
const SCREENS = [
  { name: 'c1-oggi', js: NAV('coachToday', 2600) + TOP },
  { name: 'c2-clienti', js: NAV('coachHub', 2600) + TOP },
  { name: 'c3-scheda-cliente', js: "await openCoachClient('1'); await __w(2600);" + TOP },
  { name: 'c4-check-in', js: NAV('coachCheckIns', 2200) + TOP },
  { name: 'c5-programmi', js: NAV('coachPrograms', 2200) + TOP },
  { name: 'c6-calendario', js: NAV('coachCalendar', 2400) + TOP }
];
for (const s of SCREENS) {
  const r = await evaluate(s.js);
  await sleep(900);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, s.name + '.png'), Buffer.from(shot.result.data, 'base64'));
  console.log(s.name, typeof r === 'string' && /THROWN/.test(r) ? r : 'ok');
}
if (logs.length) console.log([...new Set(logs)].join('\n'));
ws.close(); chrome.kill(); await sleep(300);
try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
