// One browser, the normal app and a client link in turn: neither changes the other.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const BASE = 'http://127.0.0.1:4181';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nurvan-seal-'));
const port = 9460;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target = null;
for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch('http://127.0.0.1:' + port + '/json')).json()).find((t) => t.type === 'page'); } catch (_) {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let seq = 0; const waiting = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } };
const send = (method, params = {}) => new Promise((resolve) => { const id = ++seq; waiting.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (body) => {
  const r = await send('Runtime.evaluate', { expression: '(async () => { ' + body + ' })()', awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) return 'THROWN ' + JSON.stringify(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description).slice(0, 500);
  return r.result && r.result.result && r.result.result.value;
};
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 400, height: 866, deviceScaleFactor: 1, mobile: true });
const go = async (url) => { await send('Page.navigate', { url: BASE + url }); await sleep(5500); await evaluate('window.confirm = () => true;'); };
const STATE = `return {
  path: location.pathname,
  client: isClientStorageContext(),
  shell: !!store.clientShell,
  user: store.accountUser && store.accountUser.id,
  token: store.accountToken,
  probe: store.prefs && store.prefs.__probe,
  load: store.data && store.data.w1_d0_e0_s1_load,
  storeKey: activeGsStoreKey(),
  db: (typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.databaseName) ? GiammariaPersistence.databaseName() : '?',
  plan: (typeof currentPlanEffective === 'function') ? currentPlanEffective().plan : '?',
  view: currentView,
  cookies: document.cookie
};`;
const out = {};
// 1. the normal app, a personal account logged in
await go('/');
await evaluate(`
  localStorage.setItem('NURVAN_ACTIVE_ACCOUNT', JSON.stringify({ id: 'personal1', email: 'p@example.com', name: 'P' }));
  store.accountUser = { id: 'personal1', email: 'p@example.com', name: 'P' }; store.accountToken = 'PERSONAL-TOKEN'; store.stayLoggedIn = true;
  store.prefs.__probe = 'personal'; store.data.w1_d0_e0_s1_load = 100;
  persist();
  onEntitlementReceived({ plan: 'standard' });
`);
await go('/');
out['1 app normale'] = await evaluate(STATE);
// 2. a client link opened in the same browser
await go('/c/INVITE-TOKEN-AAA');
out['2 link cliente'] = await evaluate(STATE);
await evaluate(`
  store.accountUser = { id: 'athlete9', role: 'athlete', provider: 'coach_client', email: 'c.x@client.nurvan.internal' }; store.accountToken = 'ATHLETE-TOKEN'; store.role = 'athlete';
  store.prefs.__probe = 'client'; store.data.w1_d0_e0_s1_load = 20;
  localStorage.setItem('GS_CLIENT_ACTIVE', JSON.stringify({ user: store.accountUser, inviteToken: 'INVITE-TOKEN-AAA' }));
  persist();
  onEntitlementReceived({ plan: 'free' });
`);
out['2b gate'] = await evaluate(`currentView = 'coachHub'; render(); const a = currentView; currentView = 'programs'; render(); const b = currentView; currentView = 'training'; render(); return [a, b, currentView];`);
// 3. back to the root: the normal app, untouched
await go('/');
out['3 di nuovo app normale'] = await evaluate(STATE);
// 4. the client link again: the client, not the personal account
await go('/c/INVITE-TOKEN-AAA');
out['4 di nuovo link cliente'] = await evaluate(STATE);
// 5. another invite in the same browser does not get the first client's session
await go('/c/INVITE-TOKEN-BBB');
out['5 altro invito'] = await evaluate(STATE);
// 6. logging out of the client link stays in the client link
await go('/c/INVITE-TOKEN-AAA');
await evaluate('logoutAccount(); return 1;');
await sleep(6000);
out['6 dopo logout cliente'] = await evaluate(STATE);
// 7. and the normal app is still there
await go('/');
out['7 app normale alla fine'] = await evaluate(STATE);
out.keys = await evaluate('return Object.keys(localStorage).sort();');
console.log(JSON.stringify(out, null, 1));
ws.close(); chrome.kill(); await sleep(300);
try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
