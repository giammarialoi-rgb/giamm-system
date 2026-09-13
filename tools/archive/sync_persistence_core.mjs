import fs from 'fs';

// Read full persistence-core.mjs
const pCoreContent = fs.readFileSync('persistence-core.mjs', 'utf8').replace(/\r\n/g, '\n');

// Build the client embed block from persistence-core.mjs, removing export keywords
let clientPersistenceBlock = pCoreContent
  .replace(/export function /g, 'function ')
  .replace(/export class /g, 'class ')
  .replace(/export const /g, 'const ')
  .replace(/export default [^;]+;/g, '');

// Append window bindings
clientPersistenceBlock += `
if (typeof window !== 'undefined') {
  window.GiammariaPersistence = GiammariaPersistence;
  window.deterministicSerialize = deterministicSerialize;
  window.getDeterministicFingerprint = getDeterministicFingerprint;
  window.deepEqual = deepEqual;
}
`;

let webHtml = fs.readFileSync('web/index.html', 'utf8').replace(/\r\n/g, '\n');

// Replace existing persistence block in web/index.html
const startMarker = '/**\n * ============================================================\n * GIAMMARIA SYSTEM — PERSISTENCE CORE 2.0 (Master Task 17)';
const endMarker = 'const GiammariaPersistence = new GiammariaPersistenceCore();';

if (webHtml.includes(startMarker)) {
  const sIdx = webHtml.indexOf(startMarker);
  const nextScriptIdx = webHtml.indexOf('const DEFAULT_STORE =', sIdx);
  if (nextScriptIdx !== -1) {
    webHtml = webHtml.slice(0, sIdx) + clientPersistenceBlock + '\n\n' + webHtml.slice(nextScriptIdx);
  }
} else {
  webHtml = webHtml.replace('<script>', `<script>\n${clientPersistenceBlock}\n`);
}

fs.writeFileSync('web/index.html', webHtml, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', webHtml, 'utf8');
console.log("Successfully synced full MemoryIndexedDB fallback and Persistence Core 2.0 to web and assets!");
