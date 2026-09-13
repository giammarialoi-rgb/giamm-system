import fs from 'fs';

console.log('=== APPLYING MASTER TASK 21 RUNTIME RECOVERY ===');

let html = fs.readFileSync('web/index.html', 'utf8');

// 1. Ensure XLSX script is present in <head>
if (!html.includes('src="xlsx.full.min.js"')) {
  html = html.replace('</head>', '  <script src="xlsx.full.min.js"></script>\n</head>');
}

// 2. Add getAllPrograms to GiammariaPersistenceEngine if not present
if (!html.includes('async getAllPrograms()')) {
  html = html.replace(
    'async listPrograms() {',
    `async getAllPrograms() {
    const all = await this.dbGetAll(STORES.PROGRAMS);
    return all.map(e => e.canonicalModel || e);
  }

  async listPrograms() {`
  );
}

// 3. Replace all path.extname references with safe string operations
const extHelper = `
function getExtName(filename) {
  if (!filename) return "";
  const idx = filename.lastIndexOf(".");
  return idx !== -1 ? filename.slice(idx).toLowerCase() : "";
}
`;
if (!html.includes('function getExtName(')) {
  html = html.replace('<script>', `<script>\n${extHelper}\n`);
}
html = html.replaceAll('path.extname(filename).toLowerCase()', 'getExtName(filename)');
html = html.replaceAll('path.extname(filename || "").toLowerCase()', 'getExtName(filename || "")');
html = html.replaceAll('path.extname(filename || "")', 'getExtName(filename || "")');
html = html.replaceAll('path.extname(originalName).toLowerCase()', 'getExtName(originalName)');

// 4. Master Task 21 async unfreezable bootstrap engine
const NEW_INIT_FN = `
async function init() {
  console.log('[INIT] Starting GIAMMARIA SYSTEM Master Recovery bootstrap...');
  
  // 1. Safety Timeout: Splash screen ALWAYS dismisses within 2.5 seconds
  const splashTimer = setTimeout(() => {
    console.warn('[INIT] Splash safety timer triggered (2.5s fallback)');
    finishInit();
  }, 2500);

  try {
    // 2. Initialize Persistence Core 2.0 (IndexedDB)
    if (typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.init) {
      await GiammariaPersistence.init().catch(err => console.warn('[INIT IDB Warning]', err));
    }

    // 3. Try loading active program from IndexedDB
    let activeProg = null;
    if (typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.loadActiveProgram) {
      try {
        activeProg = await GiammariaPersistence.loadActiveProgram();
      } catch (idbErr) {
        console.warn('[INIT] Could not load active program from IDB:', idbErr);
      }
    }

    if (activeProg && Array.isArray(activeProg.weeks) && activeProg.weeks.length > 0) {
      console.log('[INIT] Successfully loaded active program from IndexedDB:', activeProg.title);
      DATA = normalizeProgram(activeProg);
      clearTimeout(splashTimer);
      finishInit();
      return;
    }

    // 4. Fallback to localStorage activeProgram (legacy migration)
    if (store && store.activeProgram && Array.isArray(store.activeProgram.weeks) && store.activeProgram.weeks.length > 0) {
      console.log('[INIT] Loaded active program from legacy store');
      DATA = normalizeProgram(store.activeProgram);
      if (typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.saveProgram) {
        GiammariaPersistence.saveProgram(DATA, true).catch(console.warn);
      }
      clearTimeout(splashTimer);
      finishInit();
      return;
    }

    // 5. Fallback to bundled data.json (supports HTTP 200 and file:/// status 0)
    let loadedFromDataJson = false;
    try {
      if (typeof fetch !== 'undefined') {
        const resp = await fetch('data.json');
        if (resp.ok || resp.status === 0) {
          const json = await resp.json();
          if (json && Array.isArray(json.weeks) && json.weeks.length > 0) {
            DATA = normalizeProgram(json);
            loadedFromDataJson = true;
          }
        }
      }
    } catch (fetchErr) {
      console.warn('[INIT] fetch(data.json) error, trying XHR:', fetchErr);
    }

    if (!loadedFromDataJson && typeof XMLHttpRequest !== 'undefined') {
      await new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'data.json', true);
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            try {
              if (xhr.status === 200 || xhr.status === 0) {
                if (xhr.responseText && xhr.responseText.trim().startsWith('{')) {
                  const json = JSON.parse(xhr.responseText);
                  if (json && Array.isArray(json.weeks) && json.weeks.length > 0) {
                    DATA = normalizeProgram(json);
                    loadedFromDataJson = true;
                  }
                }
              }
            } catch (xhrErr) {
              console.warn('[INIT] XHR data.json parse error:', xhrErr);
            }
            resolve();
          }
        };
        xhr.onerror = function () { resolve(); };
        xhr.ontimeout = function () { resolve(); };
        xhr.timeout = 1500;
        xhr.send();
      });
    }

    if (loadedFromDataJson && DATA) {
      console.log('[INIT] Loaded default program from data.json');
      clearTimeout(splashTimer);
      finishInit();
      return;
    }

    // 6. Safe Empty Fallback Shell
    if (!DATA) {
      console.log('[INIT] No active program found, initializing empty program shell');
      DATA = { title: "Nessun Programma Attivo", weeks: [] };
    }

    clearTimeout(splashTimer);
    finishInit();
  } catch (globalErr) {
    console.error('[INIT_FATAL_RECOVERY]', globalErr);
    if (!DATA) {
      DATA = { title: "Nessun Programma Attivo", weeks: [] };
    }
    clearTimeout(splashTimer);
    finishInit();
  }
}
`;

// Replace function init() specifically
html = html.replace(/function init\(\)\s*\{[\s\S]*?\n\}/, NEW_INIT_FN.trim());

// 5. Update persist()
const NEW_PERSIST_FN = `
function persist() {
  try {
    const sanitized = (typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.sanitizeStoreForLocalStorage) 
      ? GiammariaPersistence.sanitizeStoreForLocalStorage(store) 
      : store;
    localStorage.setItem('GS_STORE', JSON.stringify(sanitized));
  } catch (quotaErr) {
    console.warn('[PERSIST_WARNING] localStorage quota exceeded, performing deep sanitize:', quotaErr);
    try {
      const sanitizedStore = { prefs: store.prefs || {}, bw: store.bw || {}, customSets: store.customSets || {}, data: store.data || {} };
      localStorage.setItem('GS_STORE', JSON.stringify(sanitizedStore));
    } catch (criticalErr) {
      console.error('[PERSIST_CRITICAL] Failed to persist even minimal store:', criticalErr);
    }
  }
  scheduleAccountSync();
  updateAccountButton();
}
`;

html = html.replace(/function persist\(\)\s*\{[\s\S]*?\n\}/, NEW_PERSIST_FN.trim());

// 6. Update render() dispatcher
const NEW_RENDER_FN = `
function render() {
  const c = $('view-container');
  if (!c) return;

  if (!DATA) {
    c.innerHTML = \`
      <div class="card" style="padding:20px;text-align:center;">
        <div style="font-size:16px;font-weight:900;color:var(--gold);margin-bottom:8px;">Caricamento Iniziale</div>
        <p style="font-size:12px;color:#aaa;margin-bottom:15px;">Inizializzazione dei moduli di sistema in corso...</p>
        <button class="btn btn-outline" onclick="init()">RIPROVA CARICAMENTO</button>
      </div>
    \`;
    return;
  }

  c.innerHTML = '';
  if (currentView === 'home') renderHome(c);
  else if (currentView === 'training') renderTraining(c);
  else if (currentView === 'stats') renderStats(c);
  else if (currentView === 'ai') renderAI(c);
  else if (currentView === 'db') renderDb(c);
  else if (currentView === 'import') renderImport(c);
  else if (currentView === 'programs') renderPrograms(c);
  else if (currentView === 'nutrition') renderNutrition(c);
  else if (currentView === 'supplements') renderSupplements(c);
  else if (currentView === 'therapy') renderTherapy(c);
  else if (currentView === 'exams') renderExams(c);
  else if (currentView === 'calendar') renderCalendar(c);
  else if (currentView === 'settings') renderSettings(c);
  else if (currentView === 'pricing') renderPricing(c);
  else renderHome(c);
}
`;

html = html.replace(/function render\(\)\s*\{[\s\S]*?\n\}/, NEW_RENDER_FN.trim());

// 7. Update renderHome
const NEW_RENDER_HOME = `
function renderHome(c) {
  if (!DATA || !Array.isArray(DATA.weeks) || !DATA.weeks.length) {
    c.innerHTML = \`
      <div style="text-align:center;padding:20px 0;">
        <img src="gs_logo.png" style="width:120px;filter:drop-shadow(0 0 15px var(--gold));">
        <h1 class="text-gold" style="font-size:26px;font-weight:900;letter-spacing:3px;">SYSTEM DASHBOARD</h1>
      </div>

      <div class="card" style="border:2px solid var(--gold);padding:24px;text-align:center;">
        <div style="font-size:18px;font-weight:900;color:var(--gold);margin-bottom:8px;">NESSUN PROGRAMMA ATTIVO</div>
        <p style="font-size:12px;color:#aaa;line-height:1.5;margin-bottom:20px;">
          Carica la tua scheda di allenamento (Excel XLSX, PDF, Word DOCX o Testo) oppure seleziona un programma dalla libreria.
        </p>
        <div style="display:flex;flex-direction:column;gap:10px;max-width:320px;margin:0 auto;">
          <button class="btn btn-primary" style="height:50px;font-size:14px;font-weight:900;" onclick="navigate('import')">
            📥 IMPORTA SCHEDA DI ALLENAMENTO
          </button>
          <button class="btn btn-outline" style="height:44px;font-size:12px;font-weight:800;border-color:var(--gold);color:var(--gold);" onclick="navigate('programs')">
            📚 LIBRERIA PROGRAMMI
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h2>MODULI DEL SISTEMA</h2></div>
        <div style="padding:16px;display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:10px;">
          <button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="navigate('nutrition')">
            <span style="font-size:18px;">🥗</span>
            <span style="font-size:11px;font-weight:800;">Alimentazione</span>
          </button>
          <button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="navigate('supplements')">
            <span style="font-size:18px;">💊</span>
            <span style="font-size:11px;font-weight:800;">Integrazione</span>
          </button>
          <button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="navigate('therapy')">
            <span style="font-size:18px;">🩺</span>
            <span style="font-size:11px;font-weight:800;">Terapia</span>
          </button>
          <button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="navigate('exams')">
            <span style="font-size:18px;">🧪</span>
            <span style="font-size:11px;font-weight:800;">Esami Lab</span>
          </button>
          <button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="navigate('calendar')">
            <span style="font-size:18px;">📅</span>
            <span style="font-size:11px;font-weight:800;">Calendario</span>
          </button>
          <button class="btn btn-outline" style="height:65px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="navigate('ai')">
            <span style="font-size:18px;">🤖</span>
            <span style="font-size:11px;font-weight:800;">Coach AI</span>
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h2>GESTIONE & MANUTENZIONE</h2></div>
        <div style="padding:15px;display:flex;flex-direction:column;gap:10px;">
          <button class="btn btn-outline" style="width:100%;border-color:var(--gold);color:var(--gold);" onclick="init()">
            🔄 RICARICA PROGRAMMA PREDEFINITO
          </button>
          <button class="btn btn-outline" style="width:100%;border-color:var(--accent-red);color:var(--accent-red);font-size:10px;" onclick="resetAllData()">
            HARD RESET DATI LOCALI
          </button>
        </div>
      </div>
    \`;
    return;
  }

  currentWeek = Math.min(Math.max(1, currentWeek), DATA.weeks.length);
  const homeWeek = DATA.weeks[currentWeek - 1];
  const sessions = homeWeek?.sessions || homeWeek?.days || [];
  if (!sessions.length) {
    c.innerHTML = \`
      <div class="card"><div class="card-header"><h2>Settimana \${currentWeek}</h2></div>
      <div style="padding:20px;text-align:center;">
        <p style="color:#aaa;margin-bottom:15px;">Nessuna sessione trovata in questa settimana.</p>
        <button class="btn btn-outline" onclick="navigate('import')">IMPORTA SCHEDA</button>
      </div></div>
    \`;
    return;
  }
  currentDay = Math.min(Math.max(0, currentDay), sessions.length - 1);
  const bw = store.bw[currentWeek] || '--';
  const duration = store.prefs.duration || DATA.weeks.length;
  const frequency = store.prefs.frequency || sessions.length;

  c.innerHTML = \`
    <div style="text-align:center;padding:20px 0;"><img src="gs_logo.png" style="width:120px;filter:drop-shadow(0 0 15px var(--gold));"><h1 class="text-gold" style="font-size:26px;font-weight:900;letter-spacing:3px;">SYSTEM DASHBOARD</h1></div>

    <div class="card" style="border:2px solid var(--gold);"><div class="card-header"><h2>Sessione Attiva</h2></div><div style="padding:20px;"><div style="font-size:20px;font-weight:900;">Settimana \${currentWeek} • Giorno \${currentDay+1}</div><div style="color:var(--gold-glow);font-size:14px;margin-top:8px;font-weight:700;">\${esc(sessions[currentDay].title||sessions[currentDay].day||'Sessione')}</div><div style="display:flex;gap:10px;margin-top:20px;">
        <button class="btn btn-primary" style="flex:2;font-size:16px;height:55px;" onclick="navigate('training')">INIZIA WORKOUT</button>
        <button class="btn btn-outline" style="flex:1;font-size:12px;height:55px;border-color:var(--gold);color:var(--gold);" onclick="navigate('import')">📥 IMPORTA</button>
      </div></div></div>

    <div class="card">
      <div class="card-header"><h2>Struttura Programmazione</h2></div>
      <div style="padding:15px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div>
          <label style="font-size:10px; color:#666; font-weight:800;">DURATA (SETTIMANE)</label>
          <select onchange="setDesiredDuration(this.value)" style="margin-top:5px;">
            \${[4,6,8,12,16].map(w=>\`<option value="\${w}" \${w===duration?'selected':''}>\${w} Settimane</option>\`).join('')}
            \${![4,6,8,12,16].includes(duration)?\`<option value="\${duration}" selected>\${duration} Settimane</option>\`:''}
            <option value="custom">Personalizzata...</option>
          </select>
        </div>
        <div>
          <label style="font-size:10px; color:#666; font-weight:800;">FREQUENZA (GIORNI/W)</label>
          <select onchange="setDesiredFrequency(this.value)" style="margin-top:5px;">
            \${[2,3,4,5,6,7].map(d=>\`<option value="\${d}" \${d===frequency?'selected':''}>\${d} Allenamenti</option>\`).join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="card">
       <div class="card-header"><h2>Programmi Salvati</h2></div>
       <div style="padding:15px;" id="saved-models-list">
          \${store.models && store.models.length ? store.models.map((m,i)=>\`
            <div style="display:flex; justify-content:space-between; align-items:center; background:#111; padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid #222;">
              <div>
                <b style="color:var(--gold); font-size:13px;">\${esc(m.name)}</b>
                <div style="font-size:9px; color:#666;">Creato il \${new Date(m.date).toLocaleDateString()}</div>
              </div>
              <div style="display:flex; gap:5px;">
                <button class="btn btn-outline" style="font-size:9px; padding:4px 8px;" onclick="applyModel(\${i})">ATTIVA</button>
                <button class="btn btn-outline" style="font-size:9px; padding:4px 8px; border-color:var(--accent-red); color:var(--accent-red);" onclick="deleteModel(\${i})">X</button>
              </div>
            </div>
          \`).join('') : '<div style="font-size:11px; color:#555; text-align:center;">Nessun modello salvato. Carica documenti nel DB per generarne uno.</div>'}
       </div>
    </div>

    <div class="card"><div class="card-header"><h2>Razionale & Regole Operative</h2></div><div style="padding:15px;font-size:11px;line-height:1.5;color:#ccc;"><div style="margin-bottom:12px;"><b style="color:var(--gold);">TOP SET + BACK-OFF:</b> Un set principale controllato seguito da back-off (-10%). Il back-off segue il carico REALE del top set.</div><div style="margin-bottom:12px;"><b style="color:var(--gold);">RIR (Prossimità al cedimento):</b> W1-2: 2 RIR costanti; W3: 1 RIR; W4: Deload. La meta-regressione 2024 indica che l\\'ipertrofia aumenta terminando le serie vicini al cedimento.</div><div><b style="color:var(--gold);">RECUPERO:</b> Compound 3-4min, Isolation 60-90s (Singer et al. 2024). Mantieni recuperi completi per massimizzare il volume tecnico.</div></div></div>

    <div class="card"><div class="card-header"><h2>Gestione Dati</h2></div><div style="padding:15px;display:flex;flex-direction:column;gap:10px;"><button class="btn btn-outline" style="width:100%;border-color:var(--gold);color:var(--gold);" onclick="resetWorkoutData()">RIPRISTINA CARICHI (AZZERA)</button><button class="btn btn-outline" style="width:100%;border-color:var(--accent-red);color:var(--accent-red);font-size:10px;" onclick="resetAllData()">HARD RESET APP</button></div></div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div class="card" style="padding:15px;text-align:center;"><span style="font-size:11px;color:var(--text-secondary);font-weight:800;">BODYWEIGHT</span><div style="font-size:22px;font-weight:900;color:var(--gold);">\${bw} kg</div></div><div class="card" style="padding:15px;text-align:center;"><span style="font-size:11px;color:var(--text-secondary);font-weight:800;">PROGRESSO</span><div style="font-size:22px;font-weight:900;color:var(--gold);">\${Math.round((currentWeek/duration)*100)}%</div></div></div>
  \`;
}
`;

html = html.replace(/function renderHome\(c\)\s*\{[\s\S]*?\n\}/, NEW_RENDER_HOME.trim());

fs.writeFileSync('web/index.html', html, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', html, 'utf8');

console.log('✅ Applied Master Task 21 runtime recovery to web/index.html and app/src/main/assets/index.html');
