// Screens of the app for the store listings, from the built web app with made-up data.
//
//   node preview-webapp.mjs            (port 4173, in another terminal, after npm run build:web)
//   node tools/store/make_screenshots.mjs <outdir> [width height dpr] [screens,comma]
//
// Default size is an iPhone 6.9" (440 x 956 at 3x = 1320 x 2868). The profile is "Alex", the sessions are
// invented (tools/store/demo-state.js); every call to the server fails on purpose, so nothing touches the real database.
// Also writes <outdir>/demo-account-data.json: what the app would upload for that account (used to give the
// reviewers' account the same content).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [OUT, W = '440', H = '956', DPR = '3', ONLY = ''] = process.argv.slice(2);
if (!OUT) { console.log('usage: node tools/store/make_screenshots.mjs <outdir> [width height dpr] [screens]'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const width = Number(W), height = Number(H), dpr = Number(DPR);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nurvan-store-'));
const port = 9600 + Math.floor(Math.random() * 90);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target = null;
for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch('http://127.0.0.1:' + port + '/json')).json()).find((t) => t.type === 'page'); } catch (_) {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let seq = 0; const waiting = new Map(); const logs = [];
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description).slice(0, 300)); };
const send = (method, params = {}) => new Promise((resolve) => { const id = ++seq; waiting.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (body) => {
  const r = await send('Runtime.evaluate', { expression: '(async () => { ' + body + ' })()', awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) return 'THROWN ' + JSON.stringify(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description).slice(0, 600);
  return r.result && r.result.result && r.result.result.value;
};
await send('Runtime.enable'); await send('Page.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: "(function(){var f=window.fetch;window.fetch=function(u,o){var s=String((u&&u.url)||u||'');if(/\\/api\\//.test(s)||/nurvan\\.app|onrender/.test(s))return Promise.reject(new TypeError('offline test'));return f.apply(this,arguments);};})();" });
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: true });
const prelude = `
  var st = document.createElement('style'); st.textContent = '#account-modal{display:none !important}'; document.head.appendChild(st);
  document.body.classList.remove('nurvan-locked'); document.getElementById('view-container').style.display = '';
  window.confirm = () => true; window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);`;

await send('Page.navigate', { url: 'http://localhost:4173/?eval=1&b=' + Date.now() });
await sleep(4500);
await evaluate(prelude);
console.log('program', await evaluate(`
  const prog = window.NurvanProgramGenerator.plan({ days: 4, weeks: 8, goal: 'hypertrophy', experience: 'intermediate', equipment: 'gym', cardio: { mode: 'steady', minutes: 20, sessions: 2 } });
  prog.id = 'store-demo-' + Date.now();
  prog.title = 'Ipertrofia 4 giorni · Upper / Lower';
  await GiammariaPersistence.saveProgram(prog, true);
  return prog.weeks ? prog.weeks.length : 'no weeks';`));
await sleep(1500);
await send('Page.navigate', { url: 'http://localhost:4173/?eval=1&b=' + Date.now() });
await sleep(6000);
await evaluate(prelude);
const demo = fs.readFileSync(new URL('./demo-state.js', import.meta.url), 'utf8');
console.log('demo', await evaluate(demo));
fs.writeFileSync(path.join(OUT, 'demo-account-data.json'), String(await evaluate('return JSON.stringify(accountPayload());')));
// No reload from here: a guest profile is emptied at every boot, the demo lives in this page.
await evaluate('render(); return 1;');
await sleep(800);

const JUMP = "const jump = (el, off) => { el.scrollIntoView({ block: 'start' }); const vc = document.getElementById('view-container'); [document.scrollingElement, vc].forEach((s) => { if (s && s.scrollTop > 0) s.scrollTop = Math.max(0, s.scrollTop - off); }); };";
const SCREENS = [
  { name: '01-home', js: "navigate('home'); await new Promise(r => setTimeout(r, 1500)); document.getElementById('view-container').scrollTop = 0; window.scrollTo(0, 0); return 1;" },
  { name: '02-allenamento', js: JUMP + "navigate('training'); await new Promise(r => setTimeout(r, 1800)); const l = document.getElementById('exercises-list'); if (l) jump(l.parentElement || l, 70); return 1;" },
  { name: '03-statistiche', js: JUMP + "navigate('stats'); await new Promise(r => setTimeout(r, 2400)); const c = document.querySelector('.stats-anatomy'); if (c) jump(c, 70); return 1;" },
  { name: '04-coach-ai', js: JUMP + "navigate('ai'); await new Promise(r => setTimeout(r, 1500)); const h = document.getElementById('chat-history'); if (h) jump(h.closest('.card') || h, 70); return 1;" },
  { name: '05-esercizio', js: "navigate('training'); await new Promise(r => setTimeout(r, 1800)); const nm = (DATA.weeks[6].sessions || DATA.weeks[6].days)[0].exercises[0].name; openExerciseInfoSheet(0, nm); await new Promise(r => setTimeout(r, 3500)); return nm;" },
  { name: '06-salute', js: "closeExerciseInfoSheet && closeExerciseInfoSheet(); navigate('health'); await new Promise(r => setTimeout(r, 1500)); document.getElementById('view-container').scrollTop = 0; window.scrollTo(0, 0); return 1;" },
  { name: '07-programmi', js: "navigate('programs'); await new Promise(r => setTimeout(r, 1500)); document.getElementById('view-container').scrollTop = 0; window.scrollTo(0, 0); return 1;" },
  // The plans page as it looks on an iPhone with the store's prices (the review of the subscriptions asks for it).
  { name: '09-piani-abbonamento', js: "window.Capacitor = { getPlatform: () => 'ios', isNativePlatform: () => true }; __billing.state = 'ready'; __billing.packs = [{ plan: 'standard', productId: 'nurvan.standard.year', packageId: 'p1', priceString: '23,99 €', period: 'year' }, { plan: 'coach', productId: 'nurvan.coach.month', packageId: 'p2', priceString: '18,99 €', period: 'month' }, { plan: 'coach', productId: 'nurvan.coach.year', packageId: 'p3', priceString: '189,99 €', period: 'year' }, { plan: 'coach_pro', productId: 'nurvan.coach_pro.month', packageId: 'p4', priceString: '38,99 €', period: 'month' }, { plan: 'coach_pro', productId: 'nurvan.coach_pro.year', packageId: 'p5', priceString: '389,99 €', period: 'year' }]; navigate('pricing'); await new Promise(r => setTimeout(r, 1800)); document.getElementById('view-container').scrollTop = 0; window.scrollTo(0, 0); return 1;" },
  { name: '08-enciclopedia', js: "navigate('knowledge'); await new Promise(r => setTimeout(r, 1800)); document.getElementById('view-container').scrollTop = 0; window.scrollTo(0, 0); return 1;" }
];
const wanted = ONLY ? ONLY.split(',') : null;
for (const s of SCREENS) {
  if (wanted && !wanted.some((w) => s.name.includes(w))) continue;
  const r = await evaluate(s.js);
  await sleep(900);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, s.name + '.png'), Buffer.from(shot.result.data, 'base64'));
  console.log(s.name, r);
}
if (logs.length) console.log([...new Set(logs)].join('\n'));
ws.close(); chrome.kill(); await sleep(300);
try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
