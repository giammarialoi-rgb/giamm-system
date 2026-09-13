import fs from 'fs';
import vm from 'vm';
import XLSX from 'xlsx';

const webHtml = fs.readFileSync('web/index.html', 'utf8');
const scriptMatches = [...webHtml.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
const fullJsCode = scriptMatches.map(m => m[1]).join('\n');

const elements = new Map();
const storage = new Map();

const mockDocument = {
  getElementById(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        value: '',
        innerHTML: '',
        innerText: '',
        style: {},
        classList: { classes: new Set(), add(c){this.classes.add(c);}, remove(c){this.classes.delete(c);}, contains(c){return this.classes.has(c);} },
        querySelectorAll() { return []; },
        querySelector() { return null; },
        addEventListener() {},
        removeEventListener() {},
        click() {},
        focus() {},
        blur() {},
        getContext() { return { clearRect:()=>{}, fillRect:()=>{}, beginPath:()=>{}, moveTo:()=>{}, lineTo:()=>{}, stroke:()=>{}, fill:()=>{}, arc:()=>{}, fillText:()=>{} }; }
      });
    }
    return elements.get(id);
  },
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: (tag) => ({ tagName: tag.toUpperCase(), style: {}, classList: { add(){}, remove(){} } })
};

const mockLocalStorage = {
  getItem(k) { return storage.get(k) || null; },
  setItem(k, v) { storage.set(k, String(v)); },
  removeItem(k) { storage.delete(k); },
  clear() { storage.clear(); },
  get length() { return storage.size; }
};

const mockWindow = {
  document: mockDocument,
  localStorage: mockLocalStorage,
  sessionStorage: mockLocalStorage,
  Buffer: Buffer,
  console: console,
  setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms || 0, 10)),
  clearTimeout: (t) => clearTimeout(t),
  setInterval: (fn, ms) => setInterval(fn, ms || 0),
  clearInterval: (t) => clearInterval(t),
  fetch: async () => ({ ok: false, status: 404 }),
  XMLHttpRequest: function() {
    this.open = () => {};
    this.send = function() {
      this.readyState = 4;
      this.status = 404;
      if (typeof this.onreadystatechange === 'function') this.onreadystatechange();
    };
    this.setRequestHeader = () => {};
    this.readyState = 4;
    this.status = 404;
    this.responseText = '';
  },
  XLSX: XLSX,
  location: { href: 'file:///android_asset/index.html' },
  navigator: { userAgent: 'Android WebView TestRunner' },
  addEventListener: () => {},
  removeEventListener: () => {}
};
mockWindow.window = mockWindow;
mockWindow.global = mockWindow;
mockWindow.$ = (id) => mockDocument.getElementById(id);

const context = vm.createContext(mockWindow);
vm.runInContext(fullJsCode, context);

const goldenBuffer = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
mockWindow.goldenBufferBase64 = goldenBuffer.toString('base64');
mockWindow.goldenParsed = vm.runInContext(`parseStructuredWorkbook(XLSX.read(Buffer.from(goldenBufferBase64, 'base64'), {type:'buffer'}), 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx')`, context);

vm.runInContext(`
  DATA = normalizeProgram(goldenParsed.canonicalProgram);
  store.activeProgram = null;
  store.data = {};
  store.bw = {};
  store.customSets = {};
  store.skips = {};
  store.prefs = { duration: 20, frequency: 4 };
  currentWeek = 1;
  currentDay = 0;
  navigate('training');
`, context);

const vc = mockDocument.getElementById('view-container');
console.log('Training innerHTML preview:', vc.innerHTML.slice(0, 300));
console.log('Training contains + SERIE?', vc.innerHTML.includes('+ SERIE'));
console.log('Training contains SCALA ATTIVA?', vc.innerHTML.includes('SCALA ATTIVA'));

// Check 31 inspection:
vm.runInContext('persist()', context);
const rawStore = mockLocalStorage.getItem('GS_STORE');
console.log('rawStore size:', rawStore ? rawStore.length : 0);
if (rawStore) {
  const parsedStore = JSON.parse(rawStore);
  for (const k in parsedStore) {
    const kSize = JSON.stringify(parsedStore[k]).length;
    if (kSize > 100) {
      console.log('Key', k, 'is big:', kSize, 'chars');
    }
  }
}

// Check 33 inspection:
const views = ['home', 'training', 'programs', 'stats', 'ai', 'db', 'import', 'nutrition', 'supplements', 'therapy', 'exams', 'calendar', 'settings', 'pricing'];
views.forEach(v => {
  try {
    vm.runInContext(`navigate("${v}")`, context);
    console.log(`View ${v} OK`);
  } catch (err) {
    console.error(`View ${v} THREW:`, err.stack || err.message);
  }
});
