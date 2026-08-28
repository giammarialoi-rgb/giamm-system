import fs from 'fs';

let webHtml = fs.readFileSync('web/index.html', 'utf8').replace(/\r\n/g, '\n');

// 1. Ensure Persistence Core block is at the top of <script>
const pCoreContent = fs.readFileSync('persistence-core.mjs', 'utf8').replace(/\r\n/g, '\n');
let clientPersistenceBlock = pCoreContent
  .replace(/export function /g, 'function ')
  .replace(/export class /g, 'class ')
  .replace(/export const /g, 'const ')
  .replace(/export default [^;]+;/g, '');

clientPersistenceBlock += `
if (typeof window !== 'undefined') {
  window.GiammariaPersistence = GiammariaPersistence;
  window.deterministicSerialize = deterministicSerialize;
  window.getDeterministicFingerprint = getDeterministicFingerprint;
  window.deepEqual = deepEqual;
}
`;

const pStart = '/**\n * ============================================================\n * GIAMMARIA SYSTEM — PERSISTENCE CORE 2.0 (Master Task 17)';
if (!webHtml.includes(pStart)) {
  webHtml = webHtml.replace('<script>', `<script>\n${clientPersistenceBlock}\n`);
}

// 2. Update init() idempotently
const newInit = `async function init(){
  try {
    if (typeof GiammariaPersistence !== 'undefined') {
      await GiammariaPersistence.migrateLegacyStore();
      const activeProg = await GiammariaPersistence.loadActiveProgram();
      if (activeProg) {
        DATA = normalizeProgram(activeProg);
        finishInit();
        return;
      }
    }
  } catch (err) {
    console.warn('[PERSISTENCE INIT WARNING]', err);
  }

  if(store.activeProgram) {
    DATA = normalizeProgram(store.activeProgram);
    finishInit();
  } else {
    let xhr = new XMLHttpRequest(); xhr.open('GET', 'data.json', true);
    xhr.onreadystatechange = function(){
      if(xhr.readyState === 4){
        try {
          if(xhr.status < 200 || xhr.status >= 300) throw new Error('Impossibile caricare data.json (' + xhr.status + ').');
          DATA = normalizeProgram(JSON.parse(xhr.responseText));
          finishInit();
        } catch(error) {
          console.error('DATA_LOAD_ERROR', error);
          $('splash').style.display = 'none';
          $('view-container').innerHTML = '<div class="card"><div class="msg ai" style="color:var(--accent-red);">Impossibile caricare la programmazione: ' + esc(error.message) + '</div></div>';
        }
      }
    };
    xhr.onerror = function(){
      console.error('DATA_LOAD_NETWORK_ERROR');
      $('splash').style.display = 'none';
      $('view-container').innerHTML = '<div class="card"><div class="msg ai" style="color:var(--accent-red);">Impossibile caricare la programmazione.</div></div>';
    };
    xhr.send();
  }
}`;

webHtml = webHtml.replace(/(?:async\s+)*function init\(\)\s*\{[\s\S]*?xhr\.send\(\);\s*\}\s*\}/, newInit);

// 3. Update persist()
const newPersist = `function persist(){
  if (typeof GiammariaPersistence !== 'undefined') {
    const sanitized = GiammariaPersistence.sanitizeStoreForLocalStorage(store);
    localStorage.setItem('GS_STORE', JSON.stringify(sanitized));
  } else {
    localStorage.setItem('GS_STORE', JSON.stringify(store));
  }
  scheduleAccountSync();
  updateAccountButton();
}`;

webHtml = webHtml.replace(/function persist\(\)\s*\{[\s\S]*?updateAccountButton\(\);\s*\}/, newPersist);

// Clean any double async occurrences
webHtml = webHtml.replace(/\basync\s+async\b/g, 'async');

fs.writeFileSync('web/index.html', webHtml, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', webHtml, 'utf8');

console.log("Persistence patch applied cleanly and idempotently!");
