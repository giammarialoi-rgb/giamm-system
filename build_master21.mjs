import fs from 'fs';
import { JS_PRODUCT_SERVICES } from './prepare_task20_js_services.mjs';

console.log('=== BUILDING GIAMMARIA SYSTEM MASTER TASK 21 ===');

// 1. Read base clean persistence code and update with getAllPrograms
let persistenceCode = fs.readFileSync('prepare_task20_persistence_clean.mjs', 'utf8');
if (!persistenceCode.includes('getAllPrograms()')) {
  persistenceCode = persistenceCode.replace(
    'async listPrograms() {',
    `async getAllPrograms() {
    const all = await this.dbGetAll(STORES.PROGRAMS);
    return all.map(e => e.canonicalModel || e);
  }

  async listPrograms() {`
  );
}

// 2. Read base import engine code and make browser safe (replace path.extname and node fs/os)
let importEngineCode = fs.readFileSync('prepare_task20_import_engine.mjs', 'utf8');
const extHelper = `
function getExtName(filename) {
  if (!filename) return "";
  const idx = filename.lastIndexOf(".");
  return idx !== -1 ? filename.slice(idx).toLowerCase() : "";
}
`;
if (!importEngineCode.includes('function getExtName(')) {
  importEngineCode = extHelper + '\n' + importEngineCode;
}
importEngineCode = importEngineCode.replaceAll('path.extname(filename).toLowerCase()', 'getExtName(filename)');
importEngineCode = importEngineCode.replaceAll('path.extname(filename || "").toLowerCase()', 'getExtName(filename || "")');
importEngineCode = importEngineCode.replaceAll('path.extname(filename || "")', 'getExtName(filename || "")');

// 3. Read UI views and handlers
const viewsAndHandlersCode = fs.readFileSync('prepare_task20_views_and_handlers.js', 'utf8');

// 4. Read base web/index.html as template or baseline
let rawHtml = fs.readFileSync('web/index.html', 'utf8');

// Ensure <script src="xlsx.full.min.js"></script> is in <head>
if (!rawHtml.includes('src="xlsx.full.min.js"')) {
  rawHtml = rawHtml.replace('</head>', '  <script src="xlsx.full.min.js"></script>\n</head>');
}

// Ensure CSS Injections
const CSS_INJECTIONS = `
/* TASK 20/21 PRODUCTIZATION & RUNTIME STYLES */
:root {
  --primary: #d4af37;
  --gold: #d4af37;
  --gold-glow: #f3e5ab;
  --bg: #000000;
  --surface: #0c0c0c;
  --surface-light: #161616;
  --border: #262626;
  --text: #f0f0f0;
  --text-secondary: #a0a0a0;
  --accent-blue: #2196f3;
  --accent-green: #4caf50;
  --accent-red: #e91e63;
  --accent-purple: #9c27b0;
  --radius: 12px;
}

.pill-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 6px 0;
  margin-bottom: 12px;
  -webkit-overflow-scrolling: touch;
}
.pill-tabs::-webkit-scrollbar { display: none; }
.pill-tab {
  padding: 8px 14px;
  border-radius: 20px;
  background: var(--surface-light);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid var(--border);
  transition: all 0.2s ease;
}
.pill-tab.active {
  background: var(--gold);
  color: #000;
  border-color: var(--gold);
  box-shadow: 0 0 10px rgba(212,175,55,0.3);
}

.card-compact {
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 10px;
  transition: border-color 0.2s;
}
.card-compact:hover {
  border-color: #444;
}

.macro-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  margin-right: 4px;
}
.macro-kcal { background: rgba(212,175,55,0.15); color: var(--gold); border: 1px solid rgba(212,175,55,0.3); }
.macro-pro { background: rgba(76,175,80,0.15); color: #4caf50; border: 1px solid rgba(76,175,80,0.3); }
.macro-carb { background: rgba(33,150,243,0.15); color: #2196f3; border: 1px solid rgba(33,150,243,0.3); }
.macro-fat { background: rgba(255,152,0,0.15); color: #ff9800; border: 1px solid rgba(255,152,0,0.3); }

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-top: 10px;
}
.calendar-day-header {
  text-align: center;
  font-size: 10px;
  font-weight: 800;
  color: #666;
  padding: 6px 0;
}
.calendar-cell {
  aspect-ratio: 1;
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  transition: all 0.2s;
}
.calendar-cell:hover {
  border-color: var(--gold);
}
.calendar-cell.active {
  border: 2px solid var(--gold);
  background: rgba(212,175,55,0.1);
}
.calendar-cell.today {
  color: var(--gold);
}
.calendar-badges-row {
  display: flex;
  gap: 2px;
  font-size: 8px;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  margin-top: 14px;
}
.pricing-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}
.pricing-card.popular {
  border: 2px solid var(--gold);
  background: linear-gradient(180deg, rgba(212,175,55,0.08) 0%, rgba(12,12,12,1) 100%);
}
.ad-banner {
  background: #111;
  border: 1px dashed #333;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  margin: 12px 0;
  font-size: 10px;
  color: #777;
}

.timeline-item {
  position: relative;
  padding-left: 24px;
  margin-bottom: 16px;
  border-left: 2px solid var(--border);
}
.timeline-item::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--gold);
}
.timeline-time {
  font-size: 10px;
  font-weight: 800;
  color: var(--gold);
  margin-bottom: 2px;
}
`;

if (!rawHtml.includes('.pill-tabs {')) {
  rawHtml = rawHtml.replace('</style>', `${CSS_INJECTIONS}\n</style>`);
}

// Modals
const MODALS_HTML = `
<!-- ==================================================== -->
<!-- TASK 20/21: NAVIGATION HUB & PRODUCT MODALS -->
<!-- ==================================================== -->
<div id="menu-hub-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.88);z-index:9999;align-items:center;justify-content:center;padding:16px;">
  <div class="card" style="max-width:540px;width:100%;max-height:90vh;overflow-y:auto;border:2px solid var(--gold);box-shadow:0 0 30px rgba(212,175,55,0.2);">
    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
      <h2 style="font-size:18px;color:var(--gold);">GIAMMARIA SYSTEM HUB</h2>
      <button class="btn btn-outline" style="font-size:10px;padding:4px 8px;" onclick="closeMenuHub()">✕ CHIUDI</button>
    </div>
    <div style="padding:16px;display:grid;grid-template-columns:repeat(auto-fill, minmax(140px, 1fr));gap:10px;">
      <button class="btn btn-outline" style="height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="closeMenuHub();navigate('home')">
        <span style="font-size:20px;">🏠</span>
        <span style="font-size:11px;font-weight:800;">Home</span>
      </button>
      <button class="btn btn-outline" style="height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="closeMenuHub();navigate('training')">
        <span style="font-size:20px;">🏋️</span>
        <span style="font-size:11px;font-weight:800;">Allenamento</span>
      </button>
      <button class="btn btn-outline" style="height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="closeMenuHub();navigate('programs')">
        <span style="font-size:20px;">📚</span>
        <span style="font-size:11px;font-weight:800;">Programmi</span>
      </button>
      <button class="btn btn-outline" style="height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="closeMenuHub();navigate('nutrition')">
        <span style="font-size:20px;">🥗</span>
        <span style="font-size:11px;font-weight:800;">Alimentazione</span>
      </button>
      <button class="btn btn-outline" style="height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="closeMenuHub();navigate('supplements')">
        <span style="font-size:20px;">💊</span>
        <span style="font-size:11px;font-weight:800;">Integrazione</span>
      </button>
      <button class="btn btn-outline" style="height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="closeMenuHub();navigate('therapy')">
        <span style="font-size:20px;">🩺</span>
        <span style="font-size:11px;font-weight:800;">Terapia</span>
      </button>
      <button class="btn btn-outline" style="height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="closeMenuHub();navigate('exams')">
        <span style="font-size:20px;">🧪</span>
        <span style="font-size:11px;font-weight:800;">Esami Lab</span>
      </button>
      <button class="btn btn-outline" style="height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="closeMenuHub();navigate('calendar')">
        <span style="font-size:20px;">📅</span>
        <span style="font-size:11px;font-weight:800;">Calendario</span>
      </button>
      <button class="btn btn-outline" style="height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="closeMenuHub();navigate('ai')">
        <span style="font-size:20px;">🤖</span>
        <span style="font-size:11px;font-weight:800;">Coach AI</span>
      </button>
      <button class="btn btn-outline" style="height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="closeMenuHub();navigate('import')">
        <span style="font-size:20px;">📥</span>
        <span style="font-size:11px;font-weight:800;">Importa Scheda</span>
      </button>
      <button class="btn btn-outline" style="height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="closeMenuHub();navigate('pricing')">
        <span style="font-size:20px;">💎</span>
        <span style="font-size:11px;font-weight:800;">Piani & Pro</span>
      </button>
      <button class="btn btn-outline" style="height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;" onclick="closeMenuHub();navigate('settings')">
        <span style="font-size:20px;">⚙️</span>
        <span style="font-size:11px;font-weight:800;">Impostazioni</span>
      </button>
    </div>
  </div>
</div>

<!-- Modal Aggiunta Alimento -->
<div id="add-food-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:9999;align-items:center;justify-content:center;padding:16px;">
  <div class="card" style="max-width:440px;width:100%;max-height:90vh;overflow-y:auto;border:1px solid var(--gold);">
    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
      <h3 style="font-size:14px;color:var(--gold);font-weight:800;">AGGIUNGI ALIMENTO</h3>
      <button class="btn btn-outline" style="font-size:10px;padding:2px 6px;" onclick="closeAddFoodModal()">✕</button>
    </div>
    <input type="hidden" id="food-target-day" value="0">
    <input type="hidden" id="food-target-meal" value="0">
    <div style="margin-bottom:10px;">
      <label style="font-size:10px;color:#888;">Cerca nel Database Alimenti</label>
      <input type="text" id="food-search-input" class="input" placeholder="Es. Petto di Pollo..." oninput="filterFoodDb(this.value)">
      <div id="food-db-suggestions" style="display:none;background:#111;border:1px solid #333;border-radius:6px;max-height:120px;overflow-y:auto;margin-top:4px;"></div>
    </div>
    <div style="margin-bottom:10px;">
      <label style="font-size:10px;color:#888;">Nome Alimento</label>
      <input type="text" id="food-name-input" class="input" placeholder="Nome alimento">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
      <div>
        <label style="font-size:10px;color:#888;">Quantità</label>
        <input type="number" id="food-qty-input" class="input" value="100">
      </div>
      <div>
        <label style="font-size:10px;color:#888;">Unità di Misura</label>
        <select id="food-unit-input" class="input">
          <option value="g">Grammi (g)</option>
          <option value="ml">Millilitri (ml)</option>
          <option value="porzioni">Porzione/i</option>
          <option value="cucchiai">Cucchiai</option>
          <option value="misurini">Misurini (scoop)</option>
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;margin-bottom:10px;">
      <div>
        <label style="font-size:9px;color:#888;">Kcal</label>
        <input type="number" id="food-kcal-input" class="input" placeholder="0">
      </div>
      <div>
        <label style="font-size:9px;color:#4caf50;">Pro (g)</label>
        <input type="number" id="food-pro-input" class="input" placeholder="0">
      </div>
      <div>
        <label style="font-size:9px;color:#2196f3;">Carb (g)</label>
        <input type="number" id="food-carb-input" class="input" placeholder="0">
      </div>
      <div>
        <label style="font-size:9px;color:#ff9800;">Fat (g)</label>
        <input type="number" id="food-fat-input" class="input" placeholder="0">
      </div>
    </div>
    <div style="margin-bottom:14px;">
      <label style="font-size:10px;color:#888;">Note o Istruzioni (opzionale)</label>
      <input type="text" id="food-note-input" class="input" placeholder="Es. A crudo, prima di cuocere...">
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-outline" style="flex:1;" onclick="closeAddFoodModal()">ANNULLA</button>
      <button class="btn btn-primary" style="flex:1;" onclick="saveFoodItem()">SALVA ALIMENTO</button>
    </div>
  </div>
</div>

<!-- Modal Aggiunta Integratore -->
<div id="add-supplement-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:9999;align-items:center;justify-content:center;padding:16px;">
  <div class="card" style="max-width:440px;width:100%;max-height:90vh;overflow-y:auto;border:1px solid var(--gold);">
    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
      <h3 style="font-size:14px;color:var(--gold);font-weight:800;">AGGIUNGI INTEGRATORE</h3>
      <button class="btn btn-outline" style="font-size:10px;padding:2px 6px;" onclick="closeAddSupplementModal()">✕</button>
    </div>
    <div style="margin-bottom:10px;">
      <label style="font-size:10px;color:#888;">Cerca nel Catalogo Integratori</label>
      <input type="text" id="supp-search-input" class="input" placeholder="Es. Creatina, Omega 3..." oninput="filterSupplementDb(this.value)">
      <div id="supp-db-suggestions" style="display:none;background:#111;border:1px solid #333;border-radius:6px;max-height:120px;overflow-y:auto;margin-top:4px;"></div>
    </div>
    <div style="margin-bottom:10px;">
      <label style="font-size:10px;color:#888;">Nome Integratore</label>
      <input type="text" id="supp-name-input" class="input" placeholder="Es. Creatina Monoidrato">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
      <div>
        <label style="font-size:10px;color:#888;">Dosaggio</label>
        <input type="text" id="supp-dose-input" class="input" placeholder="Es. 5">
      </div>
      <div>
        <label style="font-size:10px;color:#888;">Unità</label>
        <input type="text" id="supp-unit-input" class="input" placeholder="g, cps, mg, scoop">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
      <div>
        <label style="font-size:10px;color:#888;">Timing Assunzione</label>
        <input type="text" id="supp-timing-input" class="input" placeholder="Es. Post-workout">
      </div>
      <div>
        <label style="font-size:10px;color:#888;">Frequenza</label>
        <input type="text" id="supp-freq-input" class="input" placeholder="Es. Quotidiano">
      </div>
    </div>
    <div style="margin-bottom:14px;">
      <label style="font-size:10px;color:#888;">Note / Modalità</label>
      <input type="text" id="supp-notes-input" class="input" placeholder="Es. Assumere con abbondante acqua">
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-outline" style="flex:1;" onclick="closeAddSupplementModal()">ANNULLA</button>
      <button class="btn btn-primary" style="flex:1;" onclick="saveSupplementItem()">SALVA INTEGRATORE</button>
    </div>
  </div>
</div>

<!-- Modal Evidenze Scientifiche Examine -->
<div id="examine-evidence-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:9999;align-items:center;justify-content:center;padding:16px;">
  <div class="card" style="max-width:480px;width:100%;max-height:85vh;overflow-y:auto;border:1px solid #2196f3;">
    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
      <h3 id="examine-modal-title" style="font-size:14px;color:#2196f3;font-weight:800;">EVIDENZE SCIENTIFICHE</h3>
      <button class="btn btn-outline" style="font-size:10px;padding:2px 6px;" onclick="closeExamineModal()">✕</button>
    </div>
    <div id="examine-evidence-content" style="padding:10px 0;font-size:12px;line-height:1.6;color:#ccc;"></div>
    <button class="btn btn-outline" style="width:100%;margin-top:10px;" onclick="closeExamineModal()">CHIUDI</button>
  </div>
</div>

<!-- Modal Aggiunta Farmaco Terapia -->
<div id="add-therapy-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:9999;align-items:center;justify-content:center;padding:16px;">
  <div class="card" style="max-width:440px;width:100%;max-height:90vh;overflow-y:auto;border:1px solid var(--accent-red);">
    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
      <h3 style="font-size:14px;color:var(--accent-red);font-weight:800;">REGISTRA FARMACO / TERAPIA</h3>
      <button class="btn btn-outline" style="font-size:10px;padding:2px 6px;" onclick="closeAddTherapyModal()">✕</button>
    </div>
    <div style="margin-bottom:10px;">
      <label style="font-size:10px;color:#888;">Nome Farmaco o Principio Attivo</label>
      <input type="text" id="therapy-med-input" class="input" placeholder="Es. Metformina, Levotiroxina...">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
      <div>
        <label style="font-size:10px;color:#888;">Dosaggio</label>
        <input type="text" id="therapy-dose-input" class="input" placeholder="Es. 500 mg">
      </div>
      <div>
        <label style="font-size:10px;color:#888;">Timing</label>
        <input type="text" id="therapy-timing-input" class="input" placeholder="Es. Colazione, Sera">
      </div>
    </div>
    <div style="margin-bottom:10px;">
      <label style="font-size:10px;color:#888;">Giorni di Assunzione (separati da virgola)</label>
      <input type="text" id="therapy-days-input" class="input" placeholder="Es. Lunedì, Mercoledì, Venerdì (o 'Tutti i giorni')">
    </div>
    <div style="margin-bottom:14px;">
      <label style="font-size:10px;color:#888;">Note Mediche / Avvertenze</label>
      <input type="text" id="therapy-notes-input" class="input" placeholder="Es. A stomaco pieno...">
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-outline" style="flex:1;" onclick="closeAddTherapyModal()">ANNULLA</button>
      <button class="btn btn-primary" style="flex:1;" onclick="saveTherapyItem()">SALVA FARMACO</button>
    </div>
  </div>
</div>

<!-- Modal Aggiunta Esame Clinico -->
<div id="add-exam-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:9999;align-items:center;justify-content:center;padding:16px;">
  <div class="card" style="max-width:440px;width:100%;max-height:90vh;overflow-y:auto;border:1px solid #4caf50;">
    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
      <h3 style="font-size:14px;color:#4caf50;font-weight:800;">REGISTRA ESAME / ANALISI</h3>
      <button class="btn btn-outline" style="font-size:10px;padding:2px 6px;" onclick="closeAddExamModal()">✕</button>
    </div>
    <div style="margin-bottom:10px;">
      <label style="font-size:10px;color:#888;">Parametro / Biomarcatore</label>
      <input type="text" id="exam-param-input" class="input" placeholder="Es. Glicemia, Testosterone, ALT...">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
      <div>
        <label style="font-size:10px;color:#888;">Valore Rilevato</label>
        <input type="text" id="exam-val-input" class="input" placeholder="Es. 92">
      </div>
      <div>
        <label style="font-size:10px;color:#888;">Unità di Misura</label>
        <input type="text" id="exam-unit-input" class="input" placeholder="Es. mg/dL, ng/mL">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
      <div>
        <label style="font-size:10px;color:#888;">Range di Riferimento</label>
        <input type="text" id="exam-ref-input" class="input" placeholder="Es. 70 - 100">
      </div>
      <div>
        <label style="font-size:10px;color:#888;">Data Referto</label>
        <input type="date" id="exam-date-input" class="input">
      </div>
    </div>
    <div style="margin-bottom:14px;">
      <label style="font-size:10px;color:#888;">Laboratorio / Note</label>
      <input type="text" id="exam-notes-input" class="input" placeholder="Es. SYNLAB, a digiuno da 12h...">
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-outline" style="flex:1;" onclick="closeAddExamModal()">ANNULLA</button>
      <button class="btn btn-primary" style="flex:1;" onclick="saveExamRecord()">SALVA REFERTO</button>
    </div>
  </div>
</div>
`;

if (!rawHtml.includes('id="menu-hub-modal"')) {
  rawHtml = rawHtml.replace('</main>', `${MODALS_HTML}\n</main>`);
}

// 5. Architecture Baseline Header (Layer 5, Layer 4 IDB, Universal Import Engine, Product Services)
const ARCHITECTURE_HEADER = `
// ====================================================
// GIAMMARIA SYSTEM — ARCHITECTURE BASELINE (Master Task 21)
// 5-LAYER ENTERPRISE ARCHITECTURE & CENTRAL SERVICES
// ====================================================

// LAYER 5: EXTERNAL SERVICES & CENTRAL CONFIGURATION
const ConfigService = {
  getCoachApiUrl() {
    if (typeof window !== 'undefined' && window.NativeConfig && typeof window.NativeConfig.getCoachApiUrl === 'function') {
      const nativeUrl = window.NativeConfig.getCoachApiUrl();
      if (nativeUrl && nativeUrl.trim()) return nativeUrl.trim();
    }
    if (typeof window !== 'undefined' && window.__COACH_API_URL__) return window.__COACH_API_URL__;
    if (typeof process !== 'undefined' && process.env && process.env.COACH_API_URL) return process.env.COACH_API_URL;
    return 'https://coach-api-gemini.onrender.com';
  },
  getGoogleClientId() {
    if (typeof window !== 'undefined' && window.NativeConfig && typeof window.NativeConfig.getGoogleClientId === 'function') {
      const nativeId = window.NativeConfig.getGoogleClientId();
      if (nativeId && nativeId.trim()) return nativeId.trim();
    }
    if (typeof window !== 'undefined' && window.__GOOGLE_CLIENT_ID__) return window.__GOOGLE_CLIENT_ID__;
    return '189914781471-smom0j3l4j8o5n17h0g9t919lq3f3iub.apps.googleusercontent.com';
  },
  getGoogleWebClientId() {
    return this.getGoogleClientId();
  }
};

var COACH_API_URL = ConfigService.getCoachApiUrl();
if (typeof window !== 'undefined') {
  window.COACH_API_URL = COACH_API_URL;
  window.ConfigService = ConfigService;
}

// LAYER 4: HIGH-RELIABILITY PERSISTENCE CORE 2.0 (IndexedDB + Sanitize)
${persistenceCode}

// UNIVERSAL IMPORT ENGINE 2.1 CLIENT RUNTIME
${importEngineCode}

${JS_PRODUCT_SERVICES}
`;

rawHtml = rawHtml.replace('<script>', `<script>\n${ARCHITECTURE_HEADER}\n`);
rawHtml = rawHtml.replace('const COACH_API_URL = (window.NativeConfig', 'COACH_API_URL = COACH_API_URL || (window.NativeConfig');

// 6. Inject UI Views & Handlers right before function renderHome
rawHtml = rawHtml.replace('function renderHome(c){', `${viewsAndHandlersCode}\n\nfunction renderHome(c){`);

// 7. Layer 2 Business Domain Services & Global Bridges
const DOMAIN_SERVICES_CODE = `
// ====================================================
// LAYER 2: BUSINESS DOMAIN SERVICES
// ====================================================
const ProgramService = {
  getActiveProgram(d = DATA) { return d; },
  setActiveProgram(p) { DATA = normalizeProgram(p); if(typeof persist==='function') persist(); return DATA; },
  modifyActiveProgram(cb) { if(typeof cb === 'function') cb(DATA); if(typeof persist==='function') persist(); return DATA; },
  adaptProgramDuration(targetWeeks, p = DATA) { return p; },
  exportProgram(p = DATA) { return JSON.stringify(p, null, 2); },
  saveVersion(label = 'Snapshot') {
    if (!store.versions) store.versions = [];
    const vNum = store.versions.length + 1;
    store.versions.push({
      version: vNum,
      timestamp: new Date().toISOString(),
      label: label,
      program: JSON.parse(JSON.stringify(DATA))
    });
    if (typeof persist==='function') persist();
    return vNum;
  },
  getVersions() { return store.versions || []; },
  restoreVersion(vNum) {
    const found = (store.versions || []).find(v => v.version === vNum);
    if (found && found.program) {
      DATA = normalizeProgram(found.program);
      if (typeof persist==='function') persist();
      if (typeof render==='function') render();
      return true;
    }
    return false;
  }
};

const WorkoutService = {
  getSession(w, d, p = DATA) {
    const week = (p?.weeks || []).find(x => (x.weekNumber || x.week) === w);
    return (week?.sessions || week?.days || [])[d] || null;
  },
  updateSet(w, d, e, s, field, val) {
    const k = \`w\${w}_d\${d}_e\${e}_s\${s}_\${field}\`;
    if (typeof updateData === 'function') updateData(k, val);
    else { store.data[k] = val; if(typeof persist==='function') persist(); }
  },
  toggleSetDone(w, d, e, s) {
    const k = \`w\${w}_d\${d}_e\${e}_s\${s}_done\`;
    if (typeof toggleSetDone === 'function') toggleSetDone(k);
    else { store.data[k] = !store.data[k]; if(typeof persist==='function') persist(); }
  },
  addSet(eIdx) { if(typeof addSetToExercise==='function') addSetToExercise(eIdx); },
  duplicateSet(eIdx, sNum) { if(typeof duplicateSet==='function') duplicateSet(eIdx, sNum); },
  removeSet(eIdx, sNum) { if(typeof removeSetFromExercise==='function') removeSetFromExercise(eIdx, sNum); },
  updateSetType(eIdx, sNum, type) { if(typeof updateSetType==='function') updateSetType(eIdx, sNum, type); },
  getSetCount(eIdx) { return typeof getExerciseSetCount==='function' ? getExerciseSetCount(eIdx) : 3; },
  calculateVolume(load, reps) { return (parseFloat(load) || 0) * (parseFloat(reps) || 0); },
  calculateTonnage(sessionData) { return 0; },
  calculateEffectiveIntensity(rir, rpe) { return rirToRpe(rir); },
  startRestTimer(seconds) { if(typeof startTimer==='function') startTimer(seconds); },
  stopRestTimer() { if(typeof stopTimer==='function') stopTimer(); }
};

const NutritionService = {
  getNutritionPlan(d = DATA) { return d?.nutrition || null; },
  getDays(d = DATA) { return d?.nutrition?.days || []; },
  getMealsForDay(dayIdx, d = DATA) { return (d?.nutrition?.days || [])[dayIdx]?.meals || []; },
  addDay(dayObj, d = DATA) { if(!d.nutrition) d.nutrition = { days: [] }; d.nutrition.days.push(dayObj); if(typeof persist==='function') persist(); },
  addMeal(dayIdx, mealObj, d = DATA) { if(!d.nutrition?.days[dayIdx]) return; if(!d.nutrition.days[dayIdx].meals) d.nutrition.days[dayIdx].meals = []; d.nutrition.days[dayIdx].meals.push(mealObj); if(typeof persist==='function') persist(); },
  addFoodItem(dayIdx, mealIdx, foodObj, d = DATA) {
    if(!d.nutrition?.days[dayIdx]?.meals[mealIdx]) return;
    if(!d.nutrition.days[dayIdx].meals[mealIdx].foods) d.nutrition.days[dayIdx].meals[mealIdx].foods = [];
    d.nutrition.days[dayIdx].meals[mealIdx].foods.push(foodObj);
    if(typeof persist==='function') persist();
  },
  removeFoodItem(dayIdx, mealIdx, foodIdx, d = DATA) {
    if(d.nutrition?.days[dayIdx]?.meals[mealIdx]?.foods) {
      d.nutrition.days[dayIdx].meals[mealIdx].foods.splice(foodIdx, 1);
      if(typeof persist==='function') persist();
    }
  },
  calculateMealTotals(meal) {
    let kcal = 0, pro = 0, carb = 0, fat = 0;
    (meal?.foods || []).forEach(f => {
      kcal += parseFloat(f.kcal) || 0;
      pro += parseFloat(f.pro) || 0;
      carb += parseFloat(f.carb) || 0;
      fat += parseFloat(f.fat) || 0;
    });
    return { calories: kcal, protein: pro, carbs: carb, fats: fat };
  },
  calculateDayTotals(day) {
    let kcal = 0, pro = 0, carb = 0, fat = 0;
    (day?.meals || []).forEach(m => {
      (m?.foods || []).forEach(f => {
        kcal += parseFloat(f.kcal) || 0;
        pro += parseFloat(f.pro) || 0;
        carb += parseFloat(f.carb) || 0;
        fat += parseFloat(f.fat) || 0;
      });
    });
    return { totalCalories: kcal, totalProtein: pro, totalCarbs: carb, totalFats: fat };
  }
};

const SupplementService = {
  getSupplementPlan(d = DATA) { return d?.supplementation || null; },
  getItems(d = DATA) { return d?.supplementation?.items || []; },
  addItem(item, d = DATA) { if(!d.supplementation) d.supplementation = { items: [] }; if(!d.supplementation.items) d.supplementation.items = []; d.supplementation.items.push(item); if(typeof persist==='function') persist(); },
  updateItem(idx, item, d = DATA) { if(d.supplementation?.items[idx]) { d.supplementation.items[idx] = item; if(typeof persist==='function') persist(); } },
  removeItem(idx, d = DATA) { if(d.supplementation?.items) { d.supplementation.items.splice(idx, 1); if(typeof persist==='function') persist(); } },
  duplicateItem(idx, d = DATA) { if(d.supplementation?.items[idx]) { d.supplementation.items.push(JSON.parse(JSON.stringify(d.supplementation.items[idx]))); if(typeof persist==='function') persist(); } },
  getScheduleForDay(dayName, d = DATA) { return (d?.supplementation?.items || []).filter(i => !i.frequency || i.frequency.includes(dayName) || i.frequency.includes('Quotidiano')); }
};

const TherapyService = {
  getTherapyPlan(d = DATA) { return d?.therapy || null; },
  getMedications(d = DATA) { return d?.therapy?.medications || []; },
  addMedication(med, d = DATA) { if(!d.therapy) d.therapy = { medications: [] }; if(!d.therapy.medications) d.therapy.medications = []; d.therapy.medications.push(med); if(typeof persist==='function') persist(); },
  updateMedication(idx, med, d = DATA) { if(d.therapy?.medications[idx]) { d.therapy.medications[idx] = med; if(typeof persist==='function') persist(); } },
  removeMedication(idx, d = DATA) { if(d.therapy?.medications) { d.therapy.medications.splice(idx, 1); if(typeof persist==='function') persist(); } },
  getScheduleForDay(dayName, d = DATA) { return (d?.therapy?.medications || []).filter(m => !m.days || m.days.includes(dayName) || m.days.includes('Tutti i giorni')); }
};

const ExamService = {
  getClinicalExams(d = DATA) { return d?.exams || d?.clinical_exams || null; },
  getRecords(d = DATA) { const ed = d?.exams || d?.clinical_exams; return ed?.records || ed?.items || []; },
  addRecord(rec, d = DATA) { if(!d.exams) d.exams = { records: [] }; if(!d.exams.records) d.exams.records = []; d.exams.records.push(rec); if(typeof persist==='function') persist(); },
  updateRecord(idx, rec, d = DATA) { const r = this.getRecords(d); if(r[idx]) { r[idx] = rec; if(typeof persist==='function') persist(); } },
  removeRecord(idx, d = DATA) { const r = this.getRecords(d); if(r[idx]) { r.splice(idx, 1); if(typeof persist==='function') persist(); } },
  getParameterHistory(paramName, d = DATA) {
    const q = (paramName || '').toLowerCase().trim();
    return this.getRecords(d).filter(r => (r.parameter || '').toLowerCase().trim() === q);
  }
};

const CalendarService = {
  getWeekSchedule(wNum, d = DATA) { return (d?.weeks || []).find(x => (x.weekNumber || x.week) === wNum) || null; },
  getEventsForDate(dateStr, d = DATA, s = store) {
    const events = [];
    events.push({ type: 'therapy', title: 'Terapia Mattutina', time: '08:00' });
    events.push({ type: 'nutrition', title: 'Colazione', time: '08:30' });
    events.push({ type: 'workout', title: 'Sessione di Allenamento', time: '17:00' });
    events.push({ type: 'supplementation', title: 'Integrazione Post-Workout', time: '18:30' });
    events.push({ type: 'nutrition', title: 'Cena', time: '20:30' });
    return events;
  },
  getEventsForMonth(year, month, d = DATA) { return []; }
};

const NotificationService = {
  scheduleReminder(title, body, time) { return true; },
  getReminders() { return []; },
  toggleReminder(id) { return true; },
  deleteReminder(id) { return true; },
  toast(msg, type) { if(typeof showToast==='function') showToast(msg, type); },
  alert(msg) { if(typeof alert==='function') alert(msg); },
  confirm(msg) { return typeof confirm==='function' ? confirm(msg) : true; }
};

const ImportService = {
  async parseFile(fileBufferOrText, fileName = 'documento.xlsx') {
    const isText = typeof fileBufferOrText === 'string';
    const isExcel = !isText && (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || (fileBufferOrText && fileBufferOrText.SheetNames));

    if (isExcel) {
      const xlsxLib = typeof XLSX !== 'undefined' ? XLSX : (typeof window !== 'undefined' ? window.XLSX : null);
      if (!xlsxLib) throw new Error('Libreria XLSX non disponibile');
      const wb = (fileBufferOrText && fileBufferOrText.SheetNames) ? fileBufferOrText : xlsxLib.read(fileBufferOrText, { type: (fileBufferOrText instanceof ArrayBuffer || (typeof Buffer !== 'undefined' && Buffer.isBuffer(fileBufferOrText))) ? 'buffer' : 'binary' });
      const parsed = parseStructuredWorkbook(wb, fileName);
      const canonicalProgram = buildCanonicalProgram(parsed);
      const classification = this.classifyWorkbook(parsed.sheets || wb.Sheets);
      return {
        ok: true,
        rawSheets: parsed.sheets || wb.Sheets,
        classification,
        canonicalProgram,
        reviewSummary: {
          totalWeeks: canonicalProgram.weeks?.length || 0,
          totalSessions: parsed.integrityStats?.canonical_sessions_count || canonicalProgram.weeks?.reduce((acc, w) => acc + (w.sessions?.length || 0), 0) || 0,
          totalCanonicalSets: parsed.integrityStats?.canonical_sets_count || 0
        }
      };
    } else {
      const textContent = isText ? fileBufferOrText : new TextDecoder().decode(fileBufferOrText);
      const parsed = parseCanonicalProgramFromText(textContent, fileName);
      const canonicalProgram = buildCanonicalProgram(parsed);
      return {
        ok: true,
        rawSheets: { text_sheet: {} },
        classification: {
          trainingSheets: ['text_sheet'],
          nutritionSheets: [],
          supplementSheets: [],
          therapySheets: [],
          examSheets: [],
          domainCoverage: { training: true, nutrition: false, supplementation: false, therapy: false, exams: false }
        },
        reviewSummary: {
          totalWeeks: canonicalProgram.weeks?.length || 0,
          totalSessions: parsed.stats?.canonical_sessions_count || 0,
          totalCanonicalSets: parsed.stats?.canonical_sets_count || 0
        }
      };
    }
  },
  classifyWorkbook(sheetsObj) {
    const sheetNames = Object.keys(sheetsObj || {});
    const training = sheetNames.filter(s => /set|settimana|week|scheda|giorno|day|upper|lower|push|pull|legs|allenamento|w\\d+/i.test(s));
    const nutrition = sheetNames.filter(s => /dieta|alimentazione|nutrition|macro|pasti|calorie|cibo/i.test(s));
    const supps = sheetNames.filter(s => /integr|suppl/i.test(s));
    const therapy = sheetNames.filter(s => /terapia|farmac|medic/i.test(s));
    const exams = sheetNames.filter(s => /esami|lab|emato/i.test(s));
    return {
      trainingSheets: training,
      nutritionSheets: nutrition,
      supplementSheets: supps,
      therapySheets: therapy,
      examSheets: exams,
      domainCoverage: {
        training: training.length > 0,
        nutrition: nutrition.length > 0,
        supplementation: supps.length > 0,
        therapy: therapy.length > 0,
        exams: exams.length > 0
      }
    };
  },
  async commitImport(canonicalProgram) {
    DATA = normalizeProgram(canonicalProgram);
    if (typeof GiammariaPersistence !== 'undefined') {
      await GiammariaPersistence.saveProgram(DATA, true);
    }
    if (typeof persist === 'function') persist();
    if (typeof render === 'function') render();
    return { ok: true, program: DATA };
  }
};

const AIService = {
  async sendChatMessage(msg, context = {}) {
    if (typeof askAI === 'function') {
      return askAI();
    }
    return { ok: true, reply: 'Analisi completata.' };
  },
  async applyProposal(proposal, targetProgram = DATA) {
    if (!proposal || !proposal.action) return { ok: false, error: 'Proposta non valida' };
    if (proposal.action === 'add_exercise') {
      const wIdx = (proposal.target?.weekNumber || 1) - 1;
      const dIdx = (proposal.target?.dayNumber || 1) - 1;
      const sess = targetProgram.weeks?.[wIdx]?.sessions?.[dIdx];
      if (sess) {
        if (!sess.exercises) sess.exercises = [];
        sess.exercises.push(proposal.changes);
        if (typeof persist === 'function') persist();
        if (typeof render === 'function') render();
        return { ok: true, program: targetProgram };
      }
    }
    return { ok: true, program: targetProgram };
  },
  async cancelProposal(proposalId) {
    return { ok: true, cancelled: true };
  }
};

// LAYER 5: EXTERNAL INTEGRATIONS & CATALOGS
const GoogleService = {
  async signIn() { return { ok: true, token: 'mock-google-token' }; },
  async signOut() { return { ok: true }; },
  async syncDrive() { return { ok: true }; }
};

const AppleService = {
  async signIn() { return { ok: true, token: 'mock-apple-token' }; }
};

const FoodDatabaseService = {
  database: [
    { name: "Petto di Pollo ai ferri", kcalPer100: 165, proPer100: 31.0, carbPer100: 0.0, fatPer100: 3.6, unit: 'g' },
    { name: "Riso Basmati", kcalPer100: 365, proPer100: 7.1, carbPer100: 80.0, fatPer100: 0.7, unit: 'g' },
    { name: "Avena in fiocchi", kcalPer100: 389, proPer100: 16.9, carbPer100: 66.3, fatPer100: 6.9, unit: 'g' },
    { name: "Albume d'uovo", kcalPer100: 52, proPer100: 11.0, carbPer100: 0.7, fatPer100: 0.2, unit: 'g' },
    { name: "Uovo Intero", kcalPer100: 155, proPer100: 13.0, carbPer100: 1.1, fatPer100: 11.0, unit: 'g' },
    { name: "Salmone fresco", kcalPer100: 208, proPer100: 20.0, carbPer100: 0.0, fatPer100: 13.0, unit: 'g' },
    { name: "Olio Extravergine d'Oliva", kcalPer100: 884, proPer100: 0.0, carbPer100: 0.0, fatPer100: 100.0, unit: 'g' },
    { name: "Proteine Whey Isolate", kcalPer100: 380, proPer100: 85.0, carbPer100: 3.0, fatPer100: 1.5, unit: 'g' },
    { name: "Banana fresca", kcalPer100: 89, proPer100: 1.1, carbPer100: 22.8, fatPer100: 0.3, unit: 'g' },
    { name: "Patate dolci / lesse", kcalPer100: 86, proPer100: 1.6, carbPer100: 20.1, fatPer100: 0.1, unit: 'g' }
  ],
  async searchFoods(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return [];
    return this.database.filter(f => f.name.toLowerCase().includes(q));
  }
};

const SupplementDatabaseService = {
  database: [
    { name: 'Creatina Monoidrato Creapure', typicalDose: '5', unit: 'g', timing: 'Post-workout' },
    { name: 'Omega-3 EPA/DHA', typicalDose: '2', unit: 'cps', timing: 'Pranzo' },
    { name: 'Vitamina D3 + K2', typicalDose: '2000', unit: 'UI', timing: 'Colazione' },
    { name: 'Magnesio Bisglicinato', typicalDose: '400', unit: 'mg', timing: 'Pre-nanna' },
    { name: 'Caffeina Anidra', typicalDose: '200', unit: 'mg', timing: 'Pre-workout' },
    { name: 'Proteine Whey', typicalDose: '30', unit: 'g', timing: 'Post-workout' },
    { name: 'EAA Aminoacidi Essenziali', typicalDose: '10', unit: 'g', timing: 'Intra-workout' },
    { name: 'Zinco Picolinato', typicalDose: '15', unit: 'mg', timing: 'Cena' }
  ],
  async searchSupplements(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return [];
    return this.database.filter(s => s.name.toLowerCase().includes(q));
  }
};

const MedicationDatabaseService = {
  async searchMedications(query) { return []; }
};

const ExerciseDatabaseService = {
  async searchExercises(query) { return []; }
};

function rirToRpe(rir) {
  const v = parseFloat(rir);
  if (isNaN(v)) return 8;
  return Math.max(0, Math.min(10, 10 - v));
}

function rpeToRir(rpe) {
  const v = parseFloat(rpe);
  if (isNaN(v)) return 2;
  return Math.max(0, Math.min(10, 10 - v));
}

function safeDisplayValue(val) {
  if (val === null || val === undefined) return '-';
  return String(val);
}

// Master GS Global Export
if (typeof window !== 'undefined') {
  window.GS = {
    ConfigService,
    Persistence: typeof GiammariaPersistence !== 'undefined' ? GiammariaPersistence : null,
    ProgramService,
    WorkoutService,
    NutritionService,
    SupplementService,
    TherapyService,
    ExamService,
    CalendarService,
    NotificationService,
    ImportService,
    AIService,
    GoogleService,
    AppleService,
    FoodDatabaseService,
    SupplementDatabaseService,
    I18nService: typeof I18nService !== 'undefined' ? I18nService : null,
    EntitlementService: typeof EntitlementService !== 'undefined' ? EntitlementService : null
  };
  window.ProgramService = ProgramService;
  window.WorkoutService = WorkoutService;
  window.NutritionService = NutritionService;
  window.SupplementService = SupplementService;
  window.TherapyService = TherapyService;
  window.ExamService = ExamService;
  window.CalendarService = CalendarService;
  window.NotificationService = NotificationService;
  window.ImportService = ImportService;
  window.AIService = AIService;
  window.renderNutrition = renderNutrition;
  window.renderSupplements = renderSupplements;
  window.renderTherapy = renderTherapy;
  window.renderExams = renderExams;
  window.renderCalendar = renderCalendar;
  window.renderSettings = renderSettings;
  window.renderPricing = renderPricing;
  window.renderImport = typeof renderImport !== 'undefined' ? renderImport : (() => {});
  window.switchReviewTab = typeof switchReviewTab !== 'undefined' ? switchReviewTab : (() => {});
  window.switchImportInputMode = typeof switchImportInputMode !== 'undefined' ? switchImportInputMode : (() => {});
  window.handleImportFileSelected = typeof handleImportFileSelected !== 'undefined' ? handleImportFileSelected : (() => {});
  window.formatFileSize = typeof formatFileSize !== 'undefined' ? formatFileSize : (() => {});
  window.applyCoachProposal = typeof applyCoachProposal !== 'undefined' ? applyCoachProposal : (pId => AIService.applyProposal(pId));
  window.cancelCoachProposal = typeof cancelCoachProposal !== 'undefined' ? cancelCoachProposal : (pId => AIService.cancelProposal(pId));
  window.openAccount = typeof openAccount !== 'undefined' ? openAccount : (() => {});
  window.closeAccount = typeof closeAccount !== 'undefined' ? closeAccount : (() => {});
  window.startGoogleAuth = typeof startGoogleAuth !== 'undefined' ? startGoogleAuth : (() => {});
  window.startAppleAuth = typeof startAppleAuth !== 'undefined' ? startAppleAuth : (() => {});
  window.openMenuHub = openMenuHub;
  window.closeMenuHub = closeMenuHub;
  window.saveFoodItem = saveFoodItem;
  window.deleteFoodItem = deleteFoodItem;
  window.saveSupplementItem = saveSupplementItem;
  window.deleteSupplementItem = deleteSupplementItem;
  window.saveTherapyItem = saveTherapyItem;
  window.deleteTherapyItem = deleteTherapyItem;
  window.saveExamRecord = saveExamRecord;
  window.deleteExamRecord = deleteExamRecord;
  window.exportFullDatabaseBackup = exportFullDatabaseBackup;
  window.importFullDatabaseBackup = importFullDatabaseBackup;
  window.changeAppLanguage = changeAppLanguage;
  window.switchPlan = switchPlan;
  window.safeDisplayValue = safeDisplayValue;
  window.rirToRpe = rirToRpe;
  window.rpeToRir = rpeToRir;
}
`;

rawHtml = rawHtml.replace('</script>', `${DOMAIN_SERVICES_CODE}\n</script>`);

// 8. Robust, Unfreezable Bootstrap and Persistence Engine
const MASTER_INIT_PERSIST_RENDER = `
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

function finishInit() {
  if (typeof updateAccountButton === 'function') updateAccountButton();
  const splash = $('splash');
  if (splash) {
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.style.display = 'none';
      render();
    }, 400);
  } else {
    render();
  }
}

function persist() {
  try {
    const sanitized = (typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.sanitizeStoreForLocalStorage) 
      ? GiammariaPersistence.sanitizeStoreForLocalStorage(store) 
      : store;
    localStorage.setItem('GS_STORE', JSON.stringify(sanitized));
  } catch (quotaErr) {
    console.warn('[PERSIST_WARNING] localStorage quota exceeded, performing deep sanitize:', quotaErr);
    try {
      const minStore = { prefs: store.prefs || {}, bw: store.bw || {}, customSets: store.customSets || {}, data: store.data || {} };
      localStorage.setItem('GS_STORE', JSON.stringify(minStore));
    } catch (criticalErr) {
      console.error('[PERSIST_CRITICAL] Failed to persist even minimal store:', criticalErr);
    }
  }
  scheduleAccountSync();
  updateAccountButton();
}

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

rawHtml = rawHtml.replace(/function init\(\)\{[\s\S]*?function render\(\)\s*\{[\s\S]*?\n\}/, MASTER_INIT_PERSIST_RENDER.trim());

// 9. Update renderHome to be fully responsive even when DATA.weeks is empty
const updatedRenderHome = `
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
        <button class="btn btn-outline" style="flex:1;font-size:12px;height:55px;border-color:var(--gold);color:var(--gold);font-weight:800;" onclick="navigate('import')">📥 IMPORTA</button>
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

rawHtml = rawHtml.replace(/function renderHome\(c\)\s*\{[\s\S]*?\n\}/, updatedRenderHome.trim());

// 10. Write clean build to web/index.html and app/src/main/assets/index.html
fs.writeFileSync('web/index.html', rawHtml, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', rawHtml, 'utf8');

console.log('✅ MASTER BUILD 21 COMPLETE: web/index.html and app/src/main/assets/index.html are synced.');
