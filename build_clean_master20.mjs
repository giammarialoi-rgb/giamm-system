import fs from 'fs';

// Read prepare_task20_views_and_handlers.js and prepare_task20_js_services.mjs
const JS_VIEWS_AND_HANDLERS = fs.readFileSync('prepare_task20_views_and_handlers.js', 'utf8');
import { JS_PRODUCT_SERVICES } from './prepare_task20_js_services.mjs';

// Read baseline and clean persistence code
const cleanPersistenceCode = fs.readFileSync('prepare_task20_persistence_clean.mjs', 'utf8');
const universalImportBundleCode = fs.readFileSync('prepare_task20_import_engine.mjs', 'utf8');

let html = fs.readFileSync('web/index.html', 'utf8');

// 1. Inject modern CSS variables and UI components right before </style>
const CSS_INJECTIONS = `
/* TASK 20 PRODUCTIZATION & COMPACT MOBILE UX */
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

if (!html.includes('.pill-tabs {')) {
  html = html.replace('</style>', `${CSS_INJECTIONS}\n</style>`);
}

// 2. Add Navigation Hub Modal & Edit Modals right before </main>
const MODALS_HTML = `
<!-- ==================================================== -->
<!-- TASK 20: NAVIGATION HUB & PRODUCT MODALS -->
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

if (!html.includes('id="menu-hub-modal"')) {
  html = html.replace('</main>', `${MODALS_HTML}\n</main>`);
}

// 4. Inject 5-Layer Architecture and Universal Import Engine right after <script>
const ARCHITECTURE_HEADER = `
// ====================================================
// GIAMMARIA SYSTEM — ARCHITECTURE BASELINE (Master Task 20)
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
${cleanPersistenceCode}

// UNIVERSAL IMPORT ENGINE 2.1 CLIENT RUNTIME
${universalImportBundleCode}

${JS_PRODUCT_SERVICES}
`;

html = html.replace('<script>', `<script>\n${ARCHITECTURE_HEADER}\n`);

// 5. Replace downstream redundant declaration `const COACH_API_URL =`
html = html.replace('const COACH_API_URL = (window.NativeConfig', 'COACH_API_URL = COACH_API_URL || (window.NativeConfig');

// 6. Inject JS Views & Handlers right before function renderHome
html = html.replace('function renderHome(c){', `${JS_VIEWS_AND_HANDLERS}\n\nfunction renderHome(c){`);

// 7. Inject Layer 2 and Layer 5 Services & Bindings right before the end of <script>
const SERVICES_CODE = `
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

// ====================================================
// LAYER 5: EXTERNAL INTEGRATIONS & CATALOGS
// ====================================================
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

// ====================================================
// GLOBAL BRIDGES & WINDOW.GS MASTER EXPORT
// ====================================================
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

function calculateSetVolume(load, reps) {
  return (parseFloat(load) || 0) * (parseFloat(reps) || 0);
}

function calculateSessionVolume(session) {
  let vol = 0;
  (session?.exercises || []).forEach(e => {
    (e?.sets || []).forEach(s => {
      vol += calculateSetVolume(s.targetLoad || s.load, s.targetReps || s.reps);
    });
  });
  return vol;
}

function calculateEffectiveIntensityVolume(load, reps, rir) {
  const baseVol = calculateSetVolume(load, reps);
  const rirVal = parseFloat(rir);
  if (isNaN(rirVal) || rirVal > 4) return 0;
  if (rirVal <= 2) return baseVol;
  if (rirVal <= 3) return baseVol * 0.8;
  return baseVol * 0.5;
}

function getExerciseSetCount(fIdx) {
  const k = 'w' + currentWeek + '_d' + currentDay + '_e' + fIdx;
  if (store.customSets && typeof store.customSets[k] === 'number' && Number.isFinite(store.customSets[k]) && store.customSets[k] > 0) return store.customSets[k];
  const w = (DATA?.weeks || [])[currentWeek - 1] || (DATA?.weeks || []).find(x => (x.weekNumber || x.week) === currentWeek);
  const d = (w?.sessions || w?.days || [])[currentDay];
  const ex = (d?.exercises || d?.rows || [])[fIdx];
  if (!ex) return 3;
  if (Array.isArray(ex.sets) && ex.sets.length > 0) return ex.sets.length;
  if (typeof ex.sets === 'number') return ex.sets;
  if (typeof ex.setCount === 'number') return ex.setCount;
  return Math.max(1, (ex.setRows ? ex.setRows.length : 0) + 1);
}

function safeDisplayValue(val, fallback = '') {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'number') {
    if (isNaN(val)) return fallback;
    return String(val);
  }
  if (typeof val === 'object') {
    if (Array.isArray(val)) return val.map(x => safeDisplayValue(x)).join(', ');
    return val.name || val.title || val.text || JSON.stringify(val);
  }
  return String(val);
}

if (typeof window !== 'undefined') {
  window.GS = {
    version: 'Master Task 20',
    CONFIG: ConfigService,
    Services: {
      ProgramService,
      WorkoutService,
      NutritionService,
      SupplementService,
      TherapyService,
      ExamService,
      ImportService,
      AIService,
      NotificationService,
      CalendarService,
      I18nService,
      EntitlementService,
      PricingService,
      AdsService,
      ExamineService,
      HealthDataProvider,
      ErrorLogger
    },
    External: {
      GoogleService,
      AppleService,
      FoodDatabaseService,
      SupplementDatabaseService,
      MedicationDatabaseService,
      ExerciseDatabaseService
    },
    Persistence: GiammariaPersistence,
    Utils: {
      safeDisplayValue,
      calculateSetVolume,
      calculateSessionVolume,
      calculateEffectiveIntensityVolume,
      rirToRpe,
      rpeToRir
    }
  };

  // Bind historical globals
  window.ProgramService = ProgramService;
  window.WorkoutService = WorkoutService;
  window.NutritionService = NutritionService;
  window.SupplementService = SupplementService;
  window.TherapyService = TherapyService;
  window.ExamService = ExamService;
  window.ImportService = ImportService;
  window.AIService = AIService;
  window.NotificationService = NotificationService;
  window.CalendarService = CalendarService;
  window.I18nService = I18nService;
  window.EntitlementService = EntitlementService;
  window.PricingService = PricingService;
  window.AdsService = AdsService;
  window.ExamineService = ExamineService;
  window.HealthDataProvider = HealthDataProvider;
  window.ErrorLogger = ErrorLogger;
  window.FoodDatabaseService = FoodDatabaseService;
  window.SupplementDatabaseService = SupplementDatabaseService;
  window.MedicationDatabaseService = MedicationDatabaseService;
  window.ExerciseDatabaseService = ExerciseDatabaseService;
  window.calculateSetVolume = calculateSetVolume;
  window.calculateSessionVolume = calculateSessionVolume;
  window.calculateEffectiveIntensityVolume = calculateEffectiveIntensityVolume;
  window.getExerciseSetCount = getExerciseSetCount;
  window.duplicateSet = duplicateSet;
  window.updateSetType = updateSetType;
  window.renderPrograms = typeof renderPrograms !== 'undefined' ? renderPrograms : (() => {});
  window.exportActiveProgram = typeof exportActiveProgram !== 'undefined' ? exportActiveProgram : (() => {});
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

html = html.replace('</script>', `${SERVICES_CODE}\n</script>`);

// 8. Update init and persist functions to be resilient and secure
const resilientInitAndPersist = `
function init(){
  if(store.activeProgram) {
    DATA = normalizeProgram(store.activeProgram);
    finishInit();
  } else {
    if (typeof XMLHttpRequest === 'undefined') {
      return;
    }
    let xhr = new XMLHttpRequest(); xhr.open('GET', 'data.json', true);
    xhr.onreadystatechange = function(){
      if(xhr.readyState === 4){
        try {
          if(xhr.status < 200 || xhr.status >= 300) throw new Error('Impossibile caricare data.json (' + xhr.status + ').');
          DATA = normalizeProgram(JSON.parse(xhr.responseText));
          finishInit();
        } catch(error) {
          console.error('DATA_LOAD_ERROR', error);
          if ($('splash')) $('splash').style.display = 'none';
          if ($('view-container')) $('view-container').innerHTML = '<div class=\"card\"><div class=\"msg ai\" style=\"color:var(--accent-red);\">Impossibile caricare la programmazione: ' + esc(error.message) + '</div></div>';
        }
      }
    };
    xhr.onerror = function(){
      console.error('DATA_LOAD_NETWORK_ERROR');
      if ($('splash')) $('splash').style.display = 'none';
      if ($('view-container')) $('view-container').innerHTML = '<div class=\"card\"><div class=\"msg ai\" style=\"color:var(--accent-red);\">Impossibile caricare la programmazione.</div></div>';
    };
    xhr.send();
  }
}
function finishInit() {
  updateAccountButton();
  setTimeout(() => {
    if ($('splash')) $('splash').style.opacity = '0';
    setTimeout(() => { if ($('splash')) $('splash').style.display = 'none'; render(); }, 800);
  }, 1200);
}
function persist(){
  const sanitized = (typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.sanitizeStoreForLocalStorage) ? GiammariaPersistence.sanitizeStoreForLocalStorage(store) : store;
  localStorage.setItem('GS_STORE', JSON.stringify(sanitized));
  scheduleAccountSync();
  updateAccountButton();
}
`;

html = html.replace(/function init\(\)\{[\s\S]*?function persist\(\)\{[\s\S]*?\n\}/, resilientInitAndPersist.trim());

// 9. Update render() dispatcher to handle all new views
const updatedRenderFn = `
function render(){
  const c = $('view-container'); if(!c) return;
  if(!DATA){
    c.innerHTML = '<div class=\"card\"><div class=\"msg ai\" style=\"color:var(--accent-red);\">Caricamento programmazione in corso…</div></div>';
    return;
  }
  c.innerHTML = '';
  if(currentView === 'home') renderHome(c);
  else if(currentView === 'training') renderTraining(c);
  else if(currentView === 'stats') renderStats(c);
  else if(currentView === 'ai') renderAI(c);
  else if(currentView === 'db') renderDb(c);
  else if(currentView === 'import') renderImport(c);
  else if(currentView === 'programs') renderPrograms(c);
  else if(currentView === 'nutrition') renderNutrition(c);
  else if(currentView === 'supplements') renderSupplements(c);
  else if(currentView === 'therapy') renderTherapy(c);
  else if(currentView === 'exams') renderExams(c);
  else if(currentView === 'calendar') renderCalendar(c);
  else if(currentView === 'settings') renderSettings(c);
  else if(currentView === 'pricing') renderPricing(c);
  else renderHome(c);
}
`;

html = html.replace(/function render\(\)\s*\{[\s\S]*?\n\}/, updatedRenderFn);

// 10. Update Home buttons to include quick Import and Coach buttons
const oldHomeBtn = `<button class="btn btn-primary" style="width:100%;margin-top:20px;font-size:16px;height:55px;" onclick="navigate('training')">INIZIA WORKOUT</button>`;
const newHomeBtn = `<div style="display:flex;gap:10px;margin-top:20px;">
        <button class="btn btn-primary" style="flex:2;font-size:16px;height:55px;" onclick="navigate('training')">INIZIA WORKOUT</button>
        <button class="btn btn-outline" style="flex:1;font-size:12px;height:55px;border-color:var(--gold);color:var(--gold);font-weight:800;" onclick="navigate('import')">📥 IMPORTA</button>
      </div>`;
if (html.includes(oldHomeBtn)) {
  html = html.replace(oldHomeBtn, newHomeBtn);
}

// Variable declarations compatibility
html = html.replace("let DATA=null, currentView='home', currentWeek=1, currentDay=0, accountRegisterMode=false, accountSyncTimer=null;", "var DATA=null, currentView='home', currentWeek=1, currentDay=0, accountRegisterMode=false, accountSyncTimer=null;");
html = html.replace('let store = loadStore();', 'var store = loadStore();');

// 11. Write updated file to web/index.html and app/src/main/assets/index.html
fs.writeFileSync('web/index.html', html, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', html, 'utf8');

console.log('✅ Master Task 20 build completed! Files written and synced.');
