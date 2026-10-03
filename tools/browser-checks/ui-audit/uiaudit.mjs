// node tools/browser-checks/ui-audit/uiaudit.mjs <width> <height> <lang> <outdir> [views,comma]
// One headless Chrome, a fixture program, every view audited + viewport screenshots down the page.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const [W, H, LANG, OUT, ONLY] = process.argv.slice(2);
const width = Number(W) || 400; const height = Number(H) || 866;
fs.mkdirSync(OUT, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nurvan-ui-'));
const port = 9500 + Math.floor(Math.random() * 90);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target = null;
for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch('http://127.0.0.1:' + port + '/json')).json()).find((t) => t.type === 'page'); } catch (_) {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let seq = 0; const waiting = new Map(); const logs = [];
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description).slice(0, 200)); };
const send = (method, params = {}) => new Promise((resolve) => { const id = ++seq; waiting.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (body) => {
  const r = await send('Runtime.evaluate', { expression: '(async () => { ' + body + ' })()', awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) return 'THROWN ' + JSON.stringify(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description).slice(0, 600);
  return r.result && r.result.result && r.result.result.value;
};
await send('Runtime.enable'); await send('Page.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: "(function(){var f=window.fetch;window.fetch=function(u,o){var s=String((u&&u.url)||u||'');if(/\\/api\\//.test(s)||/nurvan\\.app|onrender/.test(s))return Promise.reject(new TypeError('offline test'));return f.apply(this,arguments);};})();" });
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
const prelude = `
  var st = document.createElement('style'); st.textContent = '#account-modal{display:none !important}'; document.head.appendChild(st);
  document.body.classList.remove('nurvan-locked'); document.getElementById('view-container').style.display = '';
  window.confirm = () => true; window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);`;
await send('Page.navigate', { url: 'http://localhost:4173/?eval=1&b=' + Date.now() });
await sleep(4500);
await evaluate(prelude);
const fx = await evaluate(`
  const prog = window.NurvanProgramGenerator.plan({ days: 4, weeks: 8, goal: 'hypertrophy', experience: 'intermediate', equipment: 'gym', cardio: { mode: 'steady', minutes: 20, sessions: 2 } });
  prog.id = 'ui-audit-' + Date.now();
  await GiammariaPersistence.saveProgram(prog, true);
  return prog.weeks ? prog.weeks.length : 'no weeks';`);
console.log('fixture', fx);
await sleep(1500);
await send('Page.navigate', { url: 'http://localhost:4173/?eval=1&b=' + Date.now() });
await sleep(6000);
await evaluate(prelude);
if (LANG && LANG !== 'it') { await evaluate("await window.NurvanI18n.setLang('" + LANG + "'); return 1;"); await sleep(2500); }
const VIEWS = (ONLY || 'home,training,programs,stats,progress,nutrition,supplements,therapy,exams,calendar,ai,import,db,knowledge,disciplines,hyrox,wellbeing,pricing,profile,settings').split(',');
const tpl = fs.readFileSync(new URL('./audit.js', import.meta.url), 'utf8').replace("document.getElementById('view-container')", 'document.body');
const infoJs = "const vc=document.getElementById('view-container'); vc.scrollTop=0; return {sh:vc.scrollHeight, ch:vc.clientHeight};";
const clearJs = `const vc=document.getElementById('view-container'); vc.scrollTop=vc.scrollHeight; await new Promise(r=>setTimeout(r,300));
  let last=0; const rng=document.createRange();
  for (const el of vc.querySelectorAll('*')) { const cs=getComputedStyle(el); if (cs.display==='none'||cs.visibility==='hidden') continue; const own=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()); for (const n of own){ rng.selectNodeContents(n); for (const q of rng.getClientRects()) if (q.width>0 && q.top<innerHeight) last=Math.max(last,q.bottom);} }
  let navTop=innerHeight; for (const el of document.body.querySelectorAll('*')) { const s=getComputedStyle(el); if (s.position==='fixed'&&s.display!=='none'){ const r=el.getBoundingClientRect(); if (r.top>innerHeight*0.6&&r.width>innerWidth*0.5&&r.height>20) navTop=Math.min(navTop,r.top);} }
  return {lastText:Math.round(last), navTop:Math.round(navTop), clearance:Math.round(navTop-last)};`;
const summary = [];
for (const v of VIEWS) {
  const res = await evaluate(tpl.replace('__VIEW__', v));
  if (typeof res === 'string') { summary.push({ view: v, error: res }); continue; }
  const info = await evaluate(infoJs);
  const step = Math.max(300, info.ch - 40); let n = 0;
  for (let y = 0; y < info.sh && n < 7; y += step, n++) {
    await evaluate("document.getElementById('view-container').scrollTop=" + y + "; return 1;"); await sleep(250);
    try { const shot = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, v + '-' + (n + 1) + '.png'), Buffer.from(shot.result.data, 'base64')); } catch (e) { console.log('shot failed', v); }
  }
  res.clearance = await evaluate(clearJs);
  res.segments = n;
  fs.writeFileSync(path.join(OUT, v + '.json'), JSON.stringify(res, null, 1));
  summary.push({ view: v, heading: res.heading, hscroll: res.pageScrollsHorizontally, svg: res.svg, img: res.img, emoji: res.emoji, issues: res.issueCount, clearance: res.clearance && res.clearance.clearance, segments: n });
}
console.log(JSON.stringify(summary));
if (logs.length) console.log([...new Set(logs)].join('\n'));
ws.close(); chrome.kill(); await sleep(300);
try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
