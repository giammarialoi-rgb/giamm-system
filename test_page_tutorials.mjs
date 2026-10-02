// Every page explains itself the first time it is opened, can be skipped,
// is not explained twice, and can be opened again from Menu → Tutorial.
// The engine is run as it is in the page; the texts are checked for being
// there, for every page the app can draw.
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const html = fs.readFileSync('web/index.base.html', 'utf8').replace(/\r\n/g, '\n');
const cpu = fs.readFileSync('web/coach-practice-ui.js', 'utf8').replace(/\r\n/g, '\n');
const cut = (a, b) => { const i = html.indexOf(a); const j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('block not found: ' + a); return html.slice(i, j); };

function world(over = {}) {
  const made = [];
  const node = (id) => ({ id, style: {}, innerHTML: '', children: [], setAttribute() {}, remove() { const i = made.indexOf(this); if (i >= 0) made.splice(i, 1); if (this.id === 'page-tutorial') { const k = made.findIndex((e) => e.id === 'page-tutorial-card'); if (k >= 0) made.splice(k, 1); } }, appendChild(c) { this.children.push(c); } });
  const c = Object.assign({
    console, JSON, Date, Math, String, Number, Object, Array, setTimeout: (fn) => { c.timers.push(fn); return c.timers.length; }, clearTimeout() {},
    timers: [],
    store: { prefs: {}, accountToken: 'tok' },
    currentView: 'home',
    window: {},
    document: {
      body: { classList: { contains: () => false }, appendChild(el) { made.push(el); if (el.id === 'page-tutorial') made.push(Object.assign(node('page-tutorial-card'), {})); } },
      createElement: () => node(''),
      getElementById: (id) => made.find((e) => e.id === id) || null,
      querySelectorAll: () => c.overlays || []
    },
    esc: (s) => String(s), trText: (s) => s,
    isAthleteRole: () => false, isClientStorageContext: () => false,
    persist() { c.persisted = (c.persisted || 0) + 1; }, showToast() {}, navigate(v) { c.currentView = v; c.navigated = v; }
  }, over);
  c.window.getComputedStyle = () => ({ display: 'flex', visibility: 'visible' });
  vm.createContext(c);
  vm.runInContext(cut('var PAGE_TUTORIALS = {', 'function personalNavBack() {') + '\nthis.T = PAGE_TUTORIALS; this.A = PAGE_TUTORIALS_ATHLETE; this.api = { maybe: maybeShowPageTutorial, open: openPageTutorial, close: closePageTutorial, step: stepPageTutorial, off: disablePageTutorials, applies: pageTutorialApplies, steps: pageTutorialSteps, reset: resetPageTutorials, replay: replayPageTutorial, index: openTutorialIndex, seen: tutorialsSeen };', c);
  c.made = made;
  c.card = () => made.find((e) => e.id === 'page-tutorial-card');
  return c;
}

// --- every page has one ---------------------------------------------------
{
  const c = world();
  const personal = ['home', 'training', 'programs', 'nutrition', 'supplements', 'therapy', 'exams', 'calendar', 'stats', 'ai', 'db', 'import', 'profile', 'settings', 'pricing', 'progress', 'knowledge', 'hyrox', 'disciplines'];
  const drawn = [...html.matchAll(/currentView === '([a-zA-Z]+)'\) render[A-Z]/g)].map((m) => (m[1] === 'athlete' ? 'profile' : m[1]));
  const missing = [...new Set(drawn)].filter((v) => !c.T[v]);
  ok('1a. ogni pagina che l’app disegna ha il suo tutorial' + (missing.length ? ' (mancano: ' + missing.join(', ') + ')' : ''), drawn.length >= 15 && missing.length === 0 && personal.every((v) => c.T[v]));
  const coach = ['coachHub', 'coachClient', 'coachToday', 'coachInbox', 'coachChat', 'coachCheckIns', 'coachCalendar', 'coachLibrary', 'coachPrograms', 'coachNutrition', 'coachFormReview', 'coachAnalytics', 'coachAgent', 'coachBusiness', 'coachCrm', 'coachAutomations'];
  ok('1b. anche le schermate del coach e la chat del cliente', coach.every((v) => c.T[v] && c.T[v].who === 'coach') && c.T.clientChat.who === 'athlete');
  const all = Object.values(c.T).flatMap((t) => t.steps).concat(Object.values(c.A).flat());
  ok('1c. ogni passo ha un titolo e una spiegazione vera (' + all.length + ' passi)', all.length > 100 && all.every((s) => s.t && s.t.length >= 6 && s.d && s.d.length >= 40 && s.d.length <= 330));
  ok('1d. ogni tutorial ha un nome e un’icona per il menu', Object.values(c.T).every((t) => t.label && t.icon && t.steps.length >= 1 && t.steps.length <= 7));
}
// --- first time, skip, never twice ----------------------------------------
{
  const c = world();
  ok('2a. la prima volta che si apre una pagina il tutorial parte', c.api.maybe('training') === true && !!c.card() && /La seduta di oggi/.test(c.card().innerHTML) && /SALTA/.test(c.card().innerHTML) && /1\/7/.test(c.card().innerHTML));
  c.api.step(1);
  ok('2b. AVANTI e INDIETRO scorrono i passi', /Il recupero/.test(c.card().innerHTML) && /INDIETRO/.test(c.card().innerHTML) && (c.api.step(-1), /La seduta di oggi/.test(c.card().innerHTML)));
  c.api.close();
  ok('2c. saltato o letto, quella pagina è spiegata: non si ripresenta', !c.card() && c.api.seen().training > 0 && c.persisted === 1 && c.api.maybe('training') === false);
  ok('2d. le altre pagine sì', c.api.maybe('nutrition') === true);
  c.api.close();
  const c2 = world();
  for (let i = 0; i < 20; i++) c2.api.open('training', false), c2.api.step(1);
  c2.api.open('training', false); for (let i = 0; i < 6; i++) c2.api.step(1);
  ok('2e. all’ultimo passo il pulsante chiude', /HO CAPITO/.test(c2.card().innerHTML) && /7\/7/.test(c2.card().innerHTML));
}
// --- when it does not open ---------------------------------------------------
{
  ok('3a. non prima dell’accesso', world({ store: { prefs: {} } }).api.maybe('home') === false);
  const over = world(); over.overlays = [{ id: 'menu-hub-modal', offsetWidth: 300, offsetHeight: 300 }];
  ok('3b. non sopra un’altra finestra aperta', over.api.maybe('home') === false);
  ok('3c. non mentre il coach guarda i dati di un cliente', world({ store: { prefs: {}, accountToken: 't', coachViewingClient: true } }).api.maybe('training') === false);
  const off = world(); off.api.maybe('home'); off.api.off();
  ok('3d. "non mostrarmi più i tutorial" li spegne tutti', off.store.prefs.tutorialsOff === true && off.api.maybe('training') === false && off.api.maybe('nutrition') === false);
  ok('3e. una pagina senza tutorial non fa nulla', world().api.maybe('boh') === false);
}
// --- who sees what ---------------------------------------------------------
{
  const athlete = world({ isAthleteRole: () => true, isClientStorageContext: () => true });
  ok('4a. al cliente di un coach non si spiega come creare programmi, né l’area coach', !athlete.api.applies('programs') && !athlete.api.applies('coachHub') && athlete.api.applies('training') && athlete.api.applies('clientChat'));
  ok('4b. la sua home ha la sua spiegazione (scheda dal coach, check-in, permessi)', athlete.api.steps('home')[0].t === 'Il tuo spazio con il coach' && world().api.steps('home')[0].t !== 'Il tuo spazio con il coach');
  const plain = world();
  ok('4c. chi non è coach non vede i tutorial del coach, né quello della chat cliente', !plain.api.applies('coachHub') && !plain.api.applies('clientChat') && plain.api.applies('programs'));
  const coach = world({ store: { prefs: {}, accountToken: 't', coachUnlocked: true } });
  ok('4d. il coach sì', coach.api.applies('coachHub') && coach.api.applies('coachClient') && coach.api.maybe('coachHub') === true);
  ok('4e. la pagina profilo vale con entrambi i suoi nomi', (() => { const w = world(); return w.api.maybe('athlete') === true && (w.api.close(), w.api.seen().profile > 0); })());
}
// --- from the menu ---------------------------------------------------------
{
  const c = world();
  c.api.maybe('home'); c.api.close();
  c.api.index();
  const idx = c.made.find((e) => e.id === 'tutorial-index-modal');
  ok('5a. Menu → Tutorial elenca le pagine, con visto / nuovo', !!idx && /replayPageTutorial\('training'\)/.test(idx.innerHTML) && /visto/.test(idx.innerHTML) && /nuovo/.test(idx.innerHTML) && !/coachHub/.test(idx.innerHTML));
  c.api.replay('exams');
  c.timers.forEach((fn) => fn());
  ok('5b. da lì si rivede una spiegazione già vista, sulla sua pagina', c.navigated === 'exams' && !!c.card() && /I tuoi esami/.test(c.card().innerHTML));
  c.api.close();
  c.api.reset();
  ok('5c. "rivedili tutti da capo" li fa ripartire', Object.keys(c.store.prefs.tutorialsSeen).length === 0 && c.store.prefs.tutorialsOff === false);
  ok('5d. la voce Tutorial è nel menu', /data-hub="tutorial"[^>]*onclick="closeMenuHub\(\);openTutorialIndex\(\)"/.test(html));
}
ok('6a. parte dopo ogni cambio di pagina e al primo disegno', /schedulePageTutorial\(\);\n\}/.test(html) && /if \(!tutorialsSeen\(\)\[pageTutorialKey\(currentView\)\]\) schedulePageTutorial\(\)/.test(html));
ok('6b. anche sulle schermate del coach', /typeof schedulePageTutorial === 'function'\) schedulePageTutorial\(\)/.test(cpu));
ok('6c. la guida di benvenuto del cliente non è seguita da un secondo tutorial sulla home', /tutorialsSeen\(\)\.home = Date\.now\(\)/.test(cpu));

console.log('');
if (failed) { console.log(failed + ' controlli dei tutorial falliti.'); process.exit(1); }
console.log('Tutti i controlli dei tutorial passano.');
