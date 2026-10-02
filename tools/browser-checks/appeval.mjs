// node tmp-debug/appeval.mjs <script.js> [shot.png]
// Opens the built app (preview on :4173) in a throwaway headless Chrome with
// an empty profile, runs the script's body as an async function, prints what it returns.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const [file, shotPath] = process.argv.slice(2);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nurvan-eval-'));
const port = 9400 + Math.floor(Math.random() * 50);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--no-first-run', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
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
  if (r.result && r.result.exceptionDetails) return 'THROWN ' + JSON.stringify(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description).slice(0, 800);
  return r.result && r.result.result && r.result.result.value;
};
await send('Runtime.enable');
if (process.env.OFFLINE_API) await send('Page.addScriptToEvaluateOnNewDocument', { source: "(function(){var f=window.fetch;window.fetch=function(u,o){var s=String((u&&u.url)||u||'');if(/\/api\//.test(s)||/nurvan\.app|onrender/.test(s))return Promise.reject(new TypeError('offline test'));return f.apply(this,arguments);};})();" });
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 400, height: 866, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url: 'http://localhost:4173/?eval=1' });
await sleep(4500);
await evaluate(`
  const st = document.createElement('style');
  st.textContent = '#account-modal{display:none !important}';
  document.head.appendChild(st);
  document.body.classList.remove('nurvan-locked');
  document.getElementById('view-container').style.display = '';
  window.__confirms = []; window.confirm = (m) => { window.__confirms.push(String(m)); return true; };
`);
console.log(JSON.stringify(await evaluate(fs.readFileSync(file, 'utf8')), null, 1));
if (logs.length) console.log(logs.join('\n'));
for (const next of String(process.env.AFTER_RELOAD || '').split(',').filter(Boolean)) {
  await sleep(2500);
  await send('Page.reload');
  await sleep(6000);
  await evaluate("document.body.classList.remove('nurvan-locked'); document.getElementById('view-container').style.display = ''; window.confirm = () => true; var st = document.createElement('style'); st.textContent = '#account-modal{display:none !important}'; document.head.appendChild(st);");
  console.log('AFTER RELOAD ' + next, JSON.stringify(await evaluate(fs.readFileSync(next, 'utf8')), null, 1));
}
if (shotPath) { await sleep(400); const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(shotPath, Buffer.from(r.result.data, 'base64')); }
ws.close(); chrome.kill(); await sleep(300);
try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
