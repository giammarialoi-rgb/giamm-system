import fs from 'fs';
import vm from 'vm';
import XLSX from 'xlsx';
import assert from 'assert';

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
        click() {}
      });
    }
    return elements.get(id);
  },
  querySelectorAll(selector) { return []; },
  querySelector(selector) { return null; },
  createElement(tag) { return { tagName: tag.toUpperCase(), style: {}, classList: { add(){}, remove(){} } }; }
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
  console: { log: ()=>{}, warn: ()=>{}, error: ()=>{}, info: ()=>{}, debug: ()=>{} },
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

async function run() {
  console.log('Testing Check 6...');
  vm.runInContext(`
    DATA = null;
    store = { activeProgram: null, data: {}, bw: {}, prefs: { duration: 4, frequency: 3 }, customSets: {} };
    localStorage.clear();
  `, context);
  await vm.runInContext('init()', context);
  console.log('Check 6 passed! DATA =', vm.runInContext('DATA', context).title);

  console.log('Testing Check 7...');
  const vc = mockWindow.document.getElementById('view-container');
  vm.runInContext('navigate("home")', context);
  console.log('Check 7 innerHTML length:', vc.innerHTML.length);

  console.log('Testing Check 8...');
  const goldenBuffer = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
  mockWindow.goldenBufferBase64 = goldenBuffer.toString('base64');
  const goldenParsed = vm.runInContext(`parseStructuredWorkbook(XLSX.read(Buffer.from(goldenBufferBase64, 'base64'), {type:'buffer'}), 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx')`, context);
  console.log('Check 8 parsed weeks:', goldenParsed.canonicalProgram.weeks.length);

  console.log('Testing Check 9...');
  mockWindow.goldenParsed = goldenParsed;
  vm.runInContext(`
    programImportState.canonicalProgram = buildCanonicalProgram(goldenParsed);
    programImportState.currentImportId = 'test_imp_21';
    programImportState.activeReviewTab = 'training';
    navigate('import');
  `, context);
  console.log('Check 9 passed!');

  console.log('All debug checks completed successfully!');
}

run().catch(e => console.error('ERROR IN DEBUG:', e));
