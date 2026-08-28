import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync('web/index.html', 'utf8');

// Extract all <script> contents
const scriptRegex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let fullScript = '';
while ((match = scriptRegex.exec(html)) !== null) {
  fullScript += match[1] + '\n;\n';
}

console.log('Total extracted inline JS bytes:', fullScript.length);

// Mock browser environment
const domMock = {
  console: console,
  window: {},
  document: {
    getElementById: () => ({ style: {}, innerHTML: '', querySelectorAll: () => [], addEventListener: () => {} }),
    querySelectorAll: () => [],
    querySelector: () => ({ style: {} }),
    createElement: () => ({ style: {}, appendChild: () => {} }),
    addEventListener: () => {}
  },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
  XMLHttpRequest: class {
    open() {}
    send() {}
  },
  TextDecoder: class {
    decode(b) { return ''; }
  },
  Uint8Array: Uint8Array,
  ArrayBuffer: ArrayBuffer,
  FileReader: class {
    readAsArrayBuffer() {}
    readAsText() {}
  },
  FormData: class {
    append() {}
  },
  navigator: { onLine: true },
  alert: (msg) => console.log('ALERT:', msg),
  confirm: (msg) => true,
  location: { reload: () => {} },
  scrollTo: () => {}
};
domMock.window = domMock;
domMock.globalThis = domMock;

try {
  const context = vm.createContext(domMock);
  vm.runInContext(fullScript, context);
  console.log('SUCCESS: Full inline JS executed without syntax or top-level runtime error!');
  
  // Check existence of core functions
  const requiredFunctions = [
    'init', 'finishInit', 'persist', 'navigate', 'render',
    'renderHome', 'renderTraining', 'renderStats', 'renderAI', 'renderDb', 'renderPrograms', 'renderImport',
    'handleImportFileSelected', 'formatFileSize', 'apiFetchJson',
    'startProgramImportAnalysis', 'confirmImportAndActivate'
  ];

  const missing = [];
  for (const fn of requiredFunctions) {
    if (typeof context[fn] !== 'function') {
      missing.push(fn);
    }
  }

  if (missing.length > 0) {
    console.error('MISSING FUNCTIONS IN SCOPE:', missing);
  } else {
    console.log('ALL REQUIRED FUNCTIONS EXIST IN GLOBAL SCOPE!');
  }

} catch (err) {
  console.error('JS EVALUATION ERROR:', err);
}
