import fs from 'fs';

let code = fs.readFileSync('test_master_task20_architecture.mjs', 'utf8');

const targetStr = `              objectStore: (s) => {
                const targetStore = idbStores[s] || new Map();
                return {
                  put: (val, key) => {
                    const req = { onsuccess: null, onerror: null };
                    setTimeout(() => {
                      targetStore.set(key, JSON.parse(JSON.stringify(val)));
                      if (req.onsuccess) req.onsuccess({ target: { result: key } });
                    }, 0);
                    return req;
                  },`;

const replacementStr = `              objectStore: (s) => {
                if (!idbStores[s]) idbStores[s] = new Map();
                const targetStore = idbStores[s];
                return {
                  put: (val, key) => {
                    const req = { onsuccess: null, onerror: null };
                    setTimeout(() => {
                      const k = key !== undefined ? key : (val && val.id ? val.id : 'default');
                      targetStore.set(k, JSON.parse(JSON.stringify(val)));
                      req.result = k;
                      if (req.onsuccess) req.onsuccess({ target: { result: k } });
                    }, 0);
                    return req;
                  },`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('test_master_task20_architecture.mjs', code, 'utf8');
  console.log('Successfully replaced mock in test file.');
} else {
  console.log('Target string not found in test file.');
}
