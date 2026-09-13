import fs from 'fs';
import vm from 'vm';
import * as XLSX from 'xlsx';

const htmlContent = fs.readFileSync('web/index.html', 'utf8');
const scriptRegex = /<script(?:\s+type="text\/javascript")?>([\s\S]*?)<\/script>/gi;
const scriptMatches = [...htmlContent.matchAll(scriptRegex)];
const fullScript = scriptMatches.map(m => m[1]).join('\n');

const idbStores = {
  programs: new Map(),
  workouts: new Map(),
  settings: new Map(),
  metadata: new Map(),
  performance: new Map()
};

const indexedDBMock = {
  open: (name, version) => {
    const request = {
      result: {
        objectStoreNames: { contains: (s) => Boolean(idbStores[s]) },
        createObjectStore: (s) => {
          if (!idbStores[s]) idbStores[s] = new Map();
          return {};
        },
        transaction: (storeNames, mode) => {
          return {
            objectStore: (s) => {
              if (!idbStores[s]) idbStores[s] = new Map();
              const targetStore = idbStores[s];
              return {
                put: (val, key) => {
                  const req = { onsuccess: null, onerror: null };
                  setTimeout(() => {
                    const k = key !== undefined ? key : (val && val.id ? val.id : 'default');
                    targetStore.set(k, JSON.parse(JSON.stringify(val)));
                    if (req.onsuccess) req.onsuccess({ target: { result: k } });
                  }, 0);
                  return req;
                },
                get: (key) => {
                  const req = { onsuccess: null, onerror: null };
                  setTimeout(() => {
                    const res = targetStore.get(key);
                    req.result = res ? JSON.parse(JSON.stringify(res)) : undefined;
                    if (req.onsuccess) req.onsuccess({ target: req });
                  }, 0);
                  return req;
                },
                getAll: () => {
                  const req = { onsuccess: null, onerror: null };
                  setTimeout(() => {
                    req.result = Array.from(targetStore.values()).map(v => JSON.parse(JSON.stringify(v)));
                    if (req.onsuccess) req.onsuccess({ target: req });
                  }, 0);
                  return req;
                },
                delete: (key) => {
                  const req = { onsuccess: null, onerror: null };
                  setTimeout(() => {
                    targetStore.delete(key);
                    if (req.onsuccess) req.onsuccess({ target: {} });
                  }, 0);
                  return req;
                }
              };
            }
          };
        }
      },
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null
    };
    setTimeout(() => {
      if (request.onupgradeneeded) request.onupgradeneeded({ target: { result: request.result } });
      if (request.onsuccess) request.onsuccess({ target: { result: request.result } });
    }, 0);
    return request;
  }
};

const sandbox = {
  window: null,
  globalThis: null,
  XLSX: XLSX,
  indexedDB: indexedDBMock,
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

async function test() {
  const realBuf = fs.readFileSync('GIANMARIA LOI(2).xlsx');
  const res = await ctx.ImportService.parseFile(realBuf, 'GIANMARIA LOI(2).xlsx');
  console.log('--- Real File Parse ---');
  console.log('parseFile ok:', res.ok);
  console.log('canonicalProgram keys:', res.canonicalProgram ? Object.keys(res.canonicalProgram) : 'null');
  console.log('weeks count:', res.canonicalProgram?.weeks?.length);
  console.log('nutrition:', Boolean(res.canonicalProgram?.nutrition));
  console.log('supplementation:', Boolean(res.canonicalProgram?.supplementation));
  console.log('therapy:', Boolean(res.canonicalProgram?.therapy));
  console.log('reviewSummary:', res.reviewSummary);

  const classification = ctx.ImportService.classifyWorkbook(res.rawSheets);
  console.log('classification:', classification);

  console.log('--- I18n Keys ---');
  console.log('it:', ctx.I18nService.t('home'), ctx.I18nService.t('startWorkout'));

  console.log('--- AI Service ---');
  const aiRes = await ctx.AIService.sendChatMessage('Sostituisci la panca piana');
  console.log('aiRes:', aiRes);
}

test().catch(console.error);
