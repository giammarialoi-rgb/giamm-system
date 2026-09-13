import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync('web/index.html', 'utf8');
const scriptMatch = html.match(/<script(?:\s+type="text\/javascript")?>([\s\S]*?)<\/script>/i);
const sandbox = {
  window: null, globalThis: null,
  document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ appendChild: ()=>{} }), body: { appendChild: ()=>{} } },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
  indexedDB: { open: () => ({}) }, console, setTimeout, clearTimeout, setInterval, clearInterval,
  addEventListener: () => {}, removeEventListener: () => {},
  NativeConfig: { getCoachApiUrl: () => 'https://coach-api-gemini.onrender.com' }
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);
vm.runInContext(scriptMatch[1], ctx);

const res = vm.runInContext('compareTargetVsActual(2, 0, null, null)', ctx);
console.log('Result of compareTargetVsActual(2, 0, null, null):', res);
