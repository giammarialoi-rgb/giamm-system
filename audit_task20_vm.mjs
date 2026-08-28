import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync('web/index.html', 'utf8');
const scriptMatches = Array.from(html.matchAll(/<script(?:\s+type="text\/javascript")?>([\s\S]*?)<\/script>/gi));
console.log('Found script tags:', scriptMatches.length);

const mockWindow = {
  navigator: { onLine: true, userAgent: 'Node' },
  location: { reload: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {},
  document: {
    getElementById: (id) => ({ value: '', innerHTML: '', style: {}, classList: { add: ()=>{}, remove: ()=>{} }, addEventListener: ()=>{} }),
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: () => ({ setAttribute: ()=>{}, style: {}, appendChild: ()=>{} }),
    body: { appendChild: ()=>{} }
  },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  fetch: async () => ({ ok: true, status: 200, json: async () => ({}) }),
  NativeConfig: {
    getCoachApiUrl: () => 'https://coach-api-gemini.onrender.com',
    logDiagnostic: () => {}
  }
};
mockWindow.window = mockWindow;
mockWindow.globalThis = mockWindow;

const context = vm.createContext(mockWindow);

scriptMatches.forEach((s, idx) => {
  const code = s[1];
  if (!code.trim()) return;
  try {
    vm.runInContext(code, context);
    console.log(`Script ${idx + 1} executed successfully!`);
  } catch (err) {
    console.error(`Script ${idx + 1} execution error:`, err);
  }
});

// Now let's test calling functions and checking what globals are available
console.log('Checking COACH_API_URL:');
const result = vm.runInContext('typeof COACH_API_URL !== "undefined" ? COACH_API_URL : "UNDEFINED"', context);
console.log('COACH_API_URL value:', result);

console.log('Testing coachEndpoint("/api/chat"):');
const endpoint = vm.runInContext('coachEndpoint("/api/chat")', context);
console.log('coachEndpoint result:', endpoint);

console.log('Testing window.GS object:');
const gsKeys = vm.runInContext('Object.keys(window.GS)', context);
console.log('GS top-level modules:', gsKeys);
const serviceKeys = vm.runInContext('Object.keys(window.GS.Services)', context);
console.log('GS Services:', serviceKeys);
