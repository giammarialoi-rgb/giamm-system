import fs from 'fs';
import vm from 'vm';

const htmlContent = fs.readFileSync('web/index.html', 'utf8');
const scriptRegex = /<script(?:\s+type="text\/javascript")?>([\s\S]*?)<\/script>/gi;
const scriptMatches = [...htmlContent.matchAll(scriptRegex)];
const fullScript = scriptMatches.map(m => m[1]).join('\n');

const sandbox = {
  window: null,
  globalThis: null,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
  navigator: { onLine: true }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

const ctx = vm.createContext(sandbox);
vm.runInContext(fullScript, ctx);

console.log('Inside ctx store type:', vm.runInContext('typeof store', ctx));
console.log('Inside ctx EntitlementService.getPlan:', vm.runInContext('EntitlementService.getPlan.toString()', ctx));
