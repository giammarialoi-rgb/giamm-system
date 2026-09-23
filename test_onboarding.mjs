// Le tre domande del primo avvio.
//
// Due cose devono reggere. Che le risposte restino: sono l'unica cosa che
// l'app sa di un profilo appena nato, e se si perdono la domanda torna. E che
// non vengano chieste a chi ha gia' risposto con i fatti - chi una scheda ce
// l'ha, chi se l'e' importata, chi ha gia' segnato una serie: a loro
// l'onboarding non deve comparire mai.
//
// Le funzioni vivono dentro la pagina: qui vengono ritagliate dal sorgente e
// fatte girare con uno store finto, cosi' il controllo e' su quello che gira
// davvero. L'ultima sezione invece usa i moduli veri, perche' il criterio da
// verificare - giorni scelti = sedute, niente attrezzatura esclusa - si vede
// solo sulla scheda che esce.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8').replace(/\r\n/g, '\n');
const BUILT = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8').replace(/\r\n/g, '\n');

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
function eq(actual, expected, message) {
  const a = actual !== null && typeof actual === 'object' ? JSON.stringify(actual) : actual;
  const b = expected !== null && typeof expected === 'object' ? JSON.stringify(expected) : expected;
  try {
    assert.equal(a, b);
    console.log('OK   ' + message);
  } catch (e) {
    failed++;
    console.log('FAIL ' + message + '\n     atteso ' + JSON.stringify(expected) + ', ottenuto ' + JSON.stringify(actual));
  }
}

function grab(name) {
  const at = SRC.indexOf('function ' + name + '(');
  if (at < 0) return '';
  const end = SRC.indexOf('\n}', at);
  return end < 0 ? '' : SRC.slice(at, end + 2) + '\n';
}

function grabVar(name) {
  const at = SRC.indexOf('var ' + name + ' = [');
  if (at < 0) return '';
  const end = SRC.indexOf('\n];', at);
  return end < 0 ? '' : SRC.slice(at, end + 3) + '\n';
}

const slice = 'var ONBOARDING_MAX_DAYS_LIST = [1, 2, 3, 4, 5, 6];' + String.fromCharCode(10) + grabVar('ONBOARDING_EQUIPMENT') +
  ['onboardingDraft', 'shouldShowOnboarding', 'maybeShowOnboarding',
    'saveOnboardingAnswers', 'applyProfileDefaultsToGenerator', 'skipOnboarding'].map(grab).join('\n');

console.log('\n--- 0. il blocco si ritaglia dal sorgente della pagina ---');
ok('0a. le funzioni ci sono tutte', slice.length > 2500);
ok('0b. e sono anche nella pagina costruita', /function shouldShowOnboarding\(\)/.test(BUILT));

const MACROS = [
  { id: 'PETTO', label: 'Petto' }, { id: 'GAMBE', label: 'Gambe' },
  { id: 'ADDOME', label: 'Addome' }, { id: 'BRACCIA', label: 'Braccia' },
  { id: 'SPALLE', label: 'Spalle' }, { id: 'DORSO', label: 'Dorso' }
];

function newCtx(overrides) {
  const ctx = {
    console,
    persisted: 0,
    synced: 0,
    opened: 0,
    MACRO_MUSCLE_GROUPS: MACROS,
    normalizeMacroMuscleGroup: function (raw) {
      const g = String(raw || '').toUpperCase();
      if (['SCHIENA', 'DORSO', 'BACK'].includes(g)) return 'DORSO';
      if (['GLUTEI', 'GAMBE', 'LEGS', 'QUADRICIPITI'].includes(g)) return 'GAMBE';
      if (['ADDOME', 'CORE', 'ABS', 'ADDOMINALI'].includes(g)) return 'ADDOME';
      return g;
    },
    isClientStorageContext: function () { return false; },
    isAthleteRole: function () { return false; },
    persist: function () { ctx.persisted++; },
    scheduleAccountSync: function () { ctx.synced++; },
    renderOnboarding: function () { ctx.opened++; },
    closeOnboarding: function () { ctx.closed = (ctx.closed || 0) + 1; },
    render: function () {},
    showToast: function () {},
    emptyGeneratorDraft: function () {
      return { days: 4, split: 'upper_lower', equipment: 'palestra', touched: false };
    },
    DATA: { weeks: [] },
    store: Object.assign({
      accountToken: 'tok',
      prefs: { focusMuscles: [] },
      profile: {},
      data: {},
      logs: [],
      models: [],
      activeProgramId: null
    }, (overrides && overrides.store) || {})
  };
  ctx.window = { NurvanProgramGenerator: { normalizeSplit: function (split, days) { return days >= 5 ? 'monofrequency' : split; } } };
  if (overrides && overrides.DATA) ctx.DATA = overrides.DATA;
  if (overrides && typeof overrides.isAthleteRole === 'function') ctx.isAthleteRole = overrides.isAthleteRole;
  if (overrides && typeof overrides.isClientStorageContext === 'function') ctx.isClientStorageContext = overrides.isClientStorageContext;
  vm.createContext(ctx);
  vm.runInContext(slice, ctx);
  return ctx;
}

function shows(ctx) { return vm.runInContext('shouldShowOnboarding()', ctx); }

console.log('\n--- 1. a chi viene chiesto, e a chi no ---');
{
  eq(shows(newCtx()), true, '1a. un profilo appena fatto se le vede, le tre domande');

  eq(shows(newCtx({ DATA: { weeks: [{ sessions: [] }] } })), false,
    '1b. chi una scheda attiva ce l\'ha gia\', no');
  eq(shows(newCtx({ store: { activeProgramId: 'prog_1' } })), false,
    '1c. e nemmeno chi ce l\'ha in archivio ma non in RAM');
  eq(shows(newCtx({ store: { models: [{ id: 'imp_1', title: 'Scheda importata' }] } })), false,
    '1d. chi ha importato una scheda, no');
  eq(shows(newCtx({ store: { data: { w1_d0_e0_s1_load: 80 } } })), false,
    '1e. chi ha gia\' segnato una serie, no');
  eq(shows(newCtx({ store: { logs: [{ at: '2026-09-01', week: 1 }] } })), false,
    '1f. chi ha gia\' finalizzato una seduta, no');

  eq(shows(newCtx({ store: { prefs: { onboardingAt: '2026-09-23T08:00:00.000Z' } } })), false,
    '1g. chi ha gia\' risposto non se le rivede');
  eq(shows(newCtx({ store: { prefs: { onboardingAt: '2026-09-23T08:00:00.000Z', onboardingSkipped: true } } })), false,
    '1h. e nemmeno chi le ha saltate');

  eq(shows(newCtx({ store: { accountToken: null } })), false,
    '1i. prima di accedere non si chiede niente');
  eq(shows(newCtx({ isAthleteRole: function () { return true; } })), false,
    '1j. un atleta dentro lo spazio del coach, no');
  eq(shows(newCtx({ isClientStorageContext: function () { return true; } })), false,
    '1k. e nemmeno una sessione cliente');
  eq(shows(newCtx({ store: { coachViewingClient: true } })), false,
    '1l. un coach che sta guardando un cliente, no');
  eq(shows(newCtx({ store: { coachAssigning: true } })), false,
    '1m. e nemmeno mentre assegna');
}

console.log('\n--- 2. le risposte restano ---');
{
  const ctx = newCtx();
  vm.runInContext('saveOnboardingAnswers({ focus: ["PETTO", "DORSO"], days: 5, equipment: "casa" });', ctx);
  eq(ctx.store.profile.focusMuscles, ['PETTO', 'DORSO'], '2a. i muscoli scelti finiscono nel profilo');
  eq(ctx.store.profile.trainingDays, 5, '2b. i giorni pure');
  eq(ctx.store.profile.equipment, 'casa', '2c. e l\'attrezzatura');
  ok('2d. la scheda viene salvata davvero', ctx.persisted > 0);
  ok('2e. e mandata al proprio account', ctx.synced > 0);
  ok('2f. da quel momento le domande non tornano', !!ctx.store.prefs.onboardingAt);
  eq(shows(ctx), false, '2g. verificato chiedendolo di nuovo');

  // Il profilo e' dominio personale: quello che conta e' che sopravviva al
  // giro in localStorage, che e' come l'app lo rilegge al riavvio.
  const reloaded = JSON.parse(JSON.stringify({ profile: ctx.store.profile, prefs: ctx.store.prefs }));
  eq(reloaded.profile.trainingDays, 5, '2h. dopo un giro di serializzazione i giorni ci sono ancora');
  eq(reloaded.profile.equipment, 'casa', '2i. l\'attrezzatura pure');
  eq(reloaded.profile.focusMuscles, ['PETTO', 'DORSO'], '2j. e i muscoli');
  eq(reloaded.prefs.onboardingAt, ctx.store.prefs.onboardingAt, '2k. e la data che dice che si e\' gia\' risposto');
}

console.log('\n--- 3. quello che si scrive nel profilo e\' pulito ---');
{
  const ctx = newCtx();
  vm.runInContext('saveOnboardingAnswers({ focus: ["schiena", "SCHIENA", "GLUTEI", "inventato"], days: 99, equipment: "astronave" });', ctx);
  eq(ctx.store.profile.focusMuscles, ['DORSO', 'GAMBE'], '3a. nomi doppi e alias diventano un gruppo solo, e quello che non esiste sparisce');
  eq(ctx.store.profile.trainingDays, 7, '3b. i giorni salvati si fermano a sette');
  eq(ctx.store.profile.equipment, undefined, '3c. un\'attrezzatura che non esiste non viene scritta');

  const zero = newCtx();
  vm.runInContext('saveOnboardingAnswers({ focus: [], days: 3, equipment: "bodyweight" });', zero);
  eq(zero.store.profile.focusMuscles, [], '3d. non scegliere nessun muscolo e\' una risposta valida');
  eq(zero.store.prefs.focusMuscles, [], '3e. e la stessa cosa arriva alle preferenze');
}

console.log('\n--- 4. saltare e\' una risposta anche quello ---');
{
  const ctx = newCtx();
  vm.runInContext('skipOnboarding();', ctx);
  ok('4a. chi salta non lascia niente nel profilo', !ctx.store.profile.trainingDays && !ctx.store.profile.equipment);
  ok('4b. ma resta scritto che ha saltato', !!ctx.store.prefs.onboardingAt && ctx.store.prefs.onboardingSkipped === true);
  eq(shows(ctx), false, '4c. e non gli vengono richieste');
  ok('4d. e il salvataggio e\' andato', ctx.persisted > 0);
}

console.log('\n--- 5. il generatore parte da quello che ha risposto ---');
{
  const ctx = newCtx();
  vm.runInContext('saveOnboardingAnswers({ focus: ["PETTO"], days: 6, equipment: "minimal" });', ctx);
  eq(ctx.store.programGenerator.days, 6, '5a. i giorni della bozza sono quelli scelti');
  eq(ctx.store.programGenerator.equipment, 'minimal', '5b. e l\'attrezzatura pure');
  eq(ctx.store.programGenerator.split, 'monofrequency', '5c. e lo split si adegua ai giorni invece di restare impossibile');

  // Una bozza gia' toccata a mano non viene riscritta dal profilo: quella
  // decisione e' piu' recente.
  ctx.store.programGenerator.days = 3;
  ctx.store.programGenerator.touched = true;
  vm.runInContext('applyProfileDefaultsToGenerator();', ctx);
  eq(ctx.store.programGenerator.days, 6, '5d. applyProfileDefaultsToGenerator da solo riallinea sempre');
  ok('5e. ed e\' chi lo chiama a rispettare la bozza gia\' toccata',
    /if \(!g\.touched\) \{ try \{ applyProfileDefaultsToGenerator\(\); \} catch \(_\) \{\} \}/.test(SRC));
  ok('5f. il focus arriva al generatore dal profilo, non da una seconda copia',
    /focus: \(\(store\.profile && store\.profile\.focusMuscles\)/.test(SRC));
}

console.log('\n--- 6. e le risposte si cambiano da Profilo Atleta ---');
{
  ok('6a. i giorni hanno un campo', /id="profile-training-days"/.test(SRC));
  ok('6b. l\'attrezzatura pure', /id="profile-equipment"/.test(SRC));
  ok('6c. i muscoli c\'erano gia\'', /class="profile-focus"/.test(SRC));
  ok('6d. e il salvataggio del profilo li scrive',
    /trainingDays: \$\('profile-training-days'\)/.test(SRC) && /equipment: \$\('profile-equipment'\)/.test(SRC));
  ok('6e. senza cancellarli dove la schermata non li disegna',
    /: \(prev\.trainingDays \|\| null\)/.test(SRC) && /: \(prev\.equipment \|\| null\)/.test(SRC));
  ok('6f. e da li\' il generatore si riallinea',
    /try \{ if \(typeof applyProfileDefaultsToGenerator === 'function'\) applyProfileDefaultsToGenerator\(\); \} catch \(_\) \{\}/.test(SRC));
  ok('6g. le domande compaiono all\'avvio', /try \{ maybeShowOnboarding\(\); \} catch \(_\) \{\}/.test(BUILT));
  ok('6h. e SALTA e\' sempre a schermo', /onclick="skipOnboarding\(\)">SALTA</.test(SRC));
  ok('6i. con Indietro da ogni schermata dopo la prima',
    /d\.step > 1\s*\n\s*\? '<button type="button" class="btn btn-outline" aria-label="Indietro"/.test(SRC));
}

console.log('\n--- 7. la scheda che esce rispetta le risposte ---');
{
  // Qui girano i moduli veri: il criterio e' sulla scheda, non sul codice.
  global.self = global;
  await import('./web/exercise-taxonomy.js');
  await import('./web/program-builder.js');
  await import('./web/progression-models.js');
  await import('./web/cardio-library.js');
  await import('./web/program-generator.js');
  const G = global.NurvanProgramGenerator;
  const TAX = global.NURVAN_EXERCISE_TAXONOMY;
  const byName = {};
  TAX.EXERCISES.forEach(function (e) { byName[e.name] = e; });

  let daysWrong = 0;
  let outOfKit = [];
  const ONBOARDING_IDS = ['palestra', 'casa', 'minimal', 'kettlebell', 'bodyweight'];
  // Gli stessi giorni che la schermata offre. Sette non c'e': a sette il
  // costruttore scrive sei sedute, ed e' il motivo per cui la domanda si
  // ferma a sei.
  const ONBOARDING_DAYS = [1, 2, 3, 4, 5, 6];
  ONBOARDING_DAYS.forEach(function (days) {
    ONBOARDING_IDS.forEach(function (equipment) {
      const prog = G.plan({
        weeks: 4, days: days, goal: 'ipertrofia', experience: 'intermedio',
        equipment: equipment, focus: ['PETTO', 'ADDOME']
      });
      prog.weeks.forEach(function (w) {
        if ((w.sessions || []).length !== days) daysWrong++;
      });
      const allowed = TAX.EQUIPMENT_SETS[equipment];
      prog.weeks[0].sessions.forEach(function (s) {
        (s.exercises || []).forEach(function (e) {
          const row = byName[e.name];
          if (!row) return;
          if (allowed.indexOf(row.equip) < 0 && !(row.also || []).some(function (x) { return allowed.indexOf(x) >= 0; })) {
            outOfKit.push(equipment + '/' + e.name + ' [' + row.equip + ']');
          }
        });
      });
    });
  });
  eq(daysWrong, 0, '7a. le sedute a settimana sono i giorni scelti, su tutte le 30 combinazioni');
  eq(outOfKit.length, 0, '7b. e nessun esercizio chiede attrezzatura che non c\'e\'' +
    (outOfKit.length ? (': ' + outOfKit.slice(0, 5).join(', ')) : ''));

  // Il focus sposta lavoro, e non lo sposta dove non c'entra.
  const base = G.plan({ weeks: 2, days: 4, goal: 'ipertrofia', experience: 'intermedio', equipment: 'palestra', split: 'upper_lower' });
  const foc = G.plan({ weeks: 2, days: 4, goal: 'ipertrofia', experience: 'intermedio', equipment: 'palestra', split: 'upper_lower', focus: ['PETTO'] });
  let changed = 0;
  let grew = 0;
  base.weeks[0].sessions.forEach(function (s, i) {
    const b = foc.weeks[0].sessions[i];
    if (JSON.stringify(s.exercises.map(function (e) { return e.name; })) !== JSON.stringify(b.exercises.map(function (e) { return e.name; }))) changed++;
    if (b.exercises.length > s.exercises.length + 1) grew++;
  });
  ok('7c. scegliere il petto cambia davvero la scheda', changed > 0);
  eq(grew, 0, '7d. e nessuna seduta cresce di piu\' di un esercizio');
  eq(foc.focus, ['PETTO'], '7e. la scheda si porta dietro per cosa e\' stata scritta');

  // La regola di sempre: il lavoro per le gambe sta nelle sedute delle gambe.
  const legFocus = G.plan({ weeks: 2, days: 4, goal: 'ipertrofia', experience: 'intermedio', equipment: 'palestra', split: 'upper_lower', focus: ['GAMBE'] });
  const LOWER = ['squat', 'hinge', 'glute', 'lunge', 'quadIso', 'hamIso', 'calf', 'adductor'];
  let strays = [];
  legFocus.weeks[0].sessions.forEach(function (s) {
    if (!/^upper/i.test(s.name)) return;
    (s.exercises || []).forEach(function (e) {
      const row = byName[e.name];
      if (row && LOWER.indexOf(row.pattern) >= 0) strays.push(s.name + ': ' + e.name);
    });
  });
  eq(strays.length, 0, '7f. con priorita\' sulle gambe, nessun esercizio per le gambe finisce in una seduta alta' +
    (strays.length ? (' — ' + strays.join(', ')) : ''));
}

console.log('');
if (failed) { console.log(failed + ' test dell\'onboarding falliti.'); process.exit(1); }
console.log('Tutti i test dell\'onboarding passano.');
