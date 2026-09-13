import fs from 'fs';
import { JS_PRODUCT_SERVICES } from './prepare_task20_js_services.mjs';
import { JS_VIEWS_AND_HANDLERS } from './prepare_task20_views_and_handlers.mjs';
import { EXTRA_MODALS_HTML } from './prepare_task20_modals.mjs';

// Read original index.html
let html = fs.readFileSync('web/index.html', 'utf8');

// 1. Inject EXTRA CSS before </style>
const EXTRA_CSS = `
/* TASK 20 PRODUCT STYLES */
.pill-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 4px 0 10px;
  margin-bottom: 12px;
  scrollbar-width: none;
}
.pill-tabs::-webkit-scrollbar { display: none; }
.pill-tab {
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--surface-light);
  color: #888;
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

.timeline-item {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #1a1a1a;
}
.timeline-time {
  font-size: 11px;
  font-weight: 800;
  color: var(--gold);
  width: 50px;
  flex-shrink: 0;
}
.timeline-content {
  flex: 1;
}

.pricing-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}
@media (min-width: 600px) {
  .pricing-grid { grid-template-columns: 1fr 1fr; }
}
.pricing-card {
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.pricing-card.popular {
  border: 2px solid var(--gold);
  background: linear-gradient(135deg, #18150c 0%, #0d0d0d 100%);
}

.menu-hub-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 10px 0;
}
.menu-hub-item {
  background: #141414;
  border: 1px solid #222;
  border-radius: 12px;
  padding: 14px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}
.menu-hub-item:hover {
  border-color: var(--gold);
  transform: translateY(-2px);
}
.menu-hub-icon {
  font-size: 24px;
  margin-bottom: 6px;
}
.menu-hub-label {
  font-size: 10px;
  font-weight: 800;
  color: #ccc;
  text-transform: uppercase;
}

.set-type-badge {
  font-size: 9px;
  font-weight: 800;
  padding: 2px 4px;
  border-radius: 4px;
  background: #222;
  color: #aaa;
  cursor: pointer;
  text-align: center;
}
.set-type-badge.working { color: var(--gold); border: 1px solid rgba(212,175,55,0.4); }
.set-type-badge.warmup { color: #888; border: 1px solid #444; }
.set-type-badge.backoff { color: #2196f3; border: 1px solid rgba(33,150,243,0.4); }
.set-type-badge.dropset { color: #ff9800; border: 1px solid rgba(255,152,0,0.4); }
.set-type-badge.amrap { color: #e91e63; border: 1px solid rgba(233,30,99,0.4); }
.set-type-badge.failure { color: var(--accent-red); border: 1px solid rgba(255,77,77,0.4); }

.quick-hub-btn {
  background: #141414;
  border: 1px solid #222;
  border-radius: 10px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.quick-hub-btn:hover {
  border-color: var(--gold);
  background: #181818;
}
`;

if (!html.includes('/* TASK 20 PRODUCT STYLES */')) {
  html = html.replace('</style>', `${EXTRA_CSS}\n</style>`);
}

// 2. Inject EXTRA MODALS before <div id="prev-load-tooltip">
if (!html.includes('id="add-food-modal"')) {
  html = html.replace('<div id="prev-load-tooltip">', `${EXTRA_MODALS_HTML}\n<div id="prev-load-tooltip">`);
}

// 3. Update Bottom Nav to include Calendar and Menu Hub
const updatedBottomNav = `
<nav class="bottom-nav">
  <a href="#" class="nav-item active" id="nav-home" onclick="navigate('home', event)">
    <svg viewBox="0 0 24 24"><path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/></svg><span>HOME</span>
  </a>
  <a href="#" class="nav-item" id="nav-training" onclick="navigate('training', event)">
    <svg viewBox="0 0 24 24"><path d="M20.57,14.86L22,13.43L20.57,12L17,15.57L8.43,7L12,3.43L10.57,2L9.14,3.43L7.71,2L5.57,4.14L4.14,2.71L2.71,4.14L4.14,5.57L2,7.71L3.43,9.14L2,10.57L3.43,12L7,8.43L15.57,17L12,20.57L13.43,22L14.86,20.57L16.29,22L18.43,19.86L19.86,21.29L21.29,19.86L19.86,18.43L22,16.29L20.57,14.86Z"/></svg><span>WORKOUT</span>
  </a>
  <a href="#" class="nav-item" id="nav-calendar" onclick="navigate('calendar', event)">
    <svg viewBox="0 0 24 24"><path d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z"/></svg><span>CALENDAR</span>
  </a>
  <a href="#" class="nav-item" id="nav-ai" onclick="navigate('ai', event)">
    <svg viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8Z"/></svg><span>COACH AI</span>
  </a>
  <a href="#" class="nav-item" id="nav-menu" onclick="openMenuHub(); if(event) event.preventDefault();">
    <svg viewBox="0 0 24 24"><path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z"/></svg><span>HUB</span>
  </a>
</nav>
`;

html = html.replace(/<nav class="bottom-nav">[\s\S]*?<\/nav>/, updatedBottomNav);

// 4. Update Header with quick Settings icon
const updatedHeader = `
<header>
  <div class="logo-container">
    <img src="gs_logo.png" alt="GS">
    <span>GIAMMARIA SYSTEM</span>
  </div>
  <div style="display:flex;align-items:center;gap:6px;">
    <button class="btn btn-outline" style="padding:6px 10px;font-size:12px;" onclick="navigate('settings')" title="Impostazioni & Lingua">⚙️</button>
    <button id="account-button" class="btn btn-outline" onclick="openAccount()">LOGIN</button>
  </div>
</header>
`;

html = html.replace(/<header>[\s\S]*?<\/header>/, updatedHeader);

// 5. Inject JS Product Services right after ConfigService & Persistence Core 2.0
const configServiceEnd = 'window.ConfigService = ConfigService;\n}';
if (html.includes(configServiceEnd) && !html.includes('// TASK 20: INTERNATIONALIZATION ENGINE')) {
  html = html.replace(configServiceEnd, `${configServiceEnd}\n\n${JS_PRODUCT_SERVICES}`);
}

// 6. Inject JS Views and Handlers right before function renderHome
if (html.includes('function renderHome(c){') && !html.includes('// TASK 20: NUTRITION CONTROLLER')) {
  html = html.replace('function renderHome(c){', `${JS_VIEWS_AND_HANDLERS}\n\nfunction renderHome(c){`);
}

// 7. Update render() dispatcher to handle all new views
const updatedRenderFn = `
function render(){
  const c = $('view-container'); if(!c) return;
  if(!DATA){
    c.innerHTML = '<div class="card"><div class="msg ai" style="color:var(--accent-red);">Caricamento programmazione in corso…</div></div>';
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

// 8. Update window.GS object to expose all services and helpers
const gsMountMatch = html.match(/window\.GS\s*=\s*\{[\s\S]*?\};/);
const updatedGsMount = `
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
`;

if (gsMountMatch) {
  html = html.replace(gsMountMatch[0], updatedGsMount);
}

// 9. Write updated file to web/index.html and app/src/main/assets/index.html
fs.writeFileSync('web/index.html', html, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', html, 'utf8');

console.log('Successfully written updated web/index.html and synced app/src/main/assets/index.html');
