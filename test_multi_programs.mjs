// Up to three active programs on a paid plan, each with its own loads.
// The plan rule (who gets how many), the swap itself run on the real code,
// and the sync rule for the parked ones.
import fs from 'node:fs';
import vm from 'node:vm';
import { mergeAccountDataBlobs } from './server/account/index.mjs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

// --- the plan ----------------------------------------------------------------
{
  const features = JSON.parse(fs.readFileSync('web/features.json', 'utf8'));
  const ctx = { NURVAN_FEATURES: features };
  ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('web/entitlements.js', 'utf8'), ctx);
  const E = ctx.NurvanEntitlements;
  const limit = (account) => E.explain(account, 'active_program').limit;
  ok('1a. gratis: un programma attivo', limit({ plan: 'free' }) === 1);
  ok('1b. Standard, Coach e Coach Pro: tre', limit({ plan: 'standard' }) === 3 && limit({ plan: 'coach' }) === 3 && limit({ plan: 'coach_pro' }) === 3);
  const athlete = (coachPlan) => ({ plan: 'free', coachLink: { active: true, seatInactive: false, coachPlan } });
  ok('1c. atleta di un coach Coach Pro: tre', limit(athlete('coach_pro')) === 3);
  ok('1d. atleta di un coach sul piano base: uno', limit(athlete('coach')) === 1 && limit(athlete('standard')) === 1 && limit({ plan: 'free', coachLink: { active: true } }) === 1);
  ok('1e. un atleta che paga di suo ne ha tre comunque', limit({ plan: 'standard', coachLink: { active: true, coachPlan: 'coach' } }) === 3);
  ok('1f. il resto di ciò che l’atleta eredita non cambia', E.can(athlete('coach'), 'ai_coach') && E.can(athlete('coach'), 'program_share_receive') && !E.can({ plan: 'free' }, 'program_share_receive'));
  ok('1g. il server dice all’app il piano del coach', /coachPlan/.test(fs.readFileSync('server/account/plans.mjs', 'utf8')));
}

// --- the swap, on the app's own code ------------------------------------------
const html = fs.readFileSync('web/index.base.html', 'utf8').replace(/\r\n/g, '\n');
const cut = (a, b) => { const i = html.indexOf(a); const j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('block not found: ' + a); return html.slice(i, j); };
function world(limit) {
  const library = {};
  const c = {
    console, JSON, Date, Math, String, Number, Array, Object, Promise, setTimeout,
    window: {}, document: { getElementById: () => null },
    store: { activeProgramId: null, logs: [], prefs: {}, models: [], mapStamps: {}, mapDeletes: {}, mapSyncBase: {} },
    DATA: null, currentWeek: 1, currentDay: 0,
    TRAINING_SLOT_FIELDS: ['data', 'customSets', 'subs', 'skips', 'loadTypes', 'tempos', 'exIntensity', 'bonus', 'intelTargets', 'warmups', 'warmupProgress'],
    planExplain: () => ({ allowed: true, limit }),
    programKindOf: () => 'pesi', normalizeProgram: (p) => JSON.parse(JSON.stringify(p)),
    isClientStorageContext: () => false, isAthleteRole: () => false,
    showToast() {}, render() {}, persist() {}, esc: (s) => String(s), trText: (s) => s, confirm: () => true,
    clearRestOverrides() {}, syncProgramLibraryFromIdb: async () => {}, syncAccountData: () => Promise.resolve(),
    withBusy: (fn) => fn(),
    GiammariaPersistence: {
      loadProgram: async (id) => library[id] || null,
      saveProgram: async (p) => { library[p.id] = JSON.parse(JSON.stringify(p)); },
      activateCanonicalProgram: async (p) => { library[p.id] = JSON.parse(JSON.stringify(p)); },
      clearWorkoutLogs: async () => {}
    },
    activeProgramKey: function () { return String(c.store.activeProgramId || ''); },
    markTrainingDataEpoch: function () { c.store.trainingDataEpoch = { at: new Date().toISOString() }; c.epochs = (c.epochs || 0) + 1; },
    resetMapStampsFor: function () { c.resets = (c.resets || 0) + 1; },
    answer: 'keep', asked: 0
  };
  vm.createContext(c);
  vm.runInContext(
    'async function clearWorkoutLogsForNewProgram(prev) { (store.logs || []).forEach(function (l) { if (l && !l.programId) l.programId = prev; }); TRAINING_SLOT_FIELDS.forEach(function (k) { store[k] = {}; }); markTrainingDataEpoch(); resetMapStampsFor(TRAINING_SLOT_FIELDS); }\n'
    + cut('function parkedPrograms() {', '// "Keep the one you have as well, or replace it?"')
    + 'function askKeepOrReplaceProgram() { asked++; return Promise.resolve(answer); }\n'
    + cut('// Bring a parked program back into the room', '// The row that shows which programs are active')
    + cut('async function maybeClearLogsOnProgramSwitch(newProgramId) {', 'async function resetWorkoutData(){')
    + '\nthis.api = { switchTo: switchActiveProgram, before: maybeClearLogsOnProgramSwitch, parked: parkedPrograms, limit: activeProgramsLimit };', c);
  // What every activation in the app does around the door.
  c.activate = async (prog) => {
    await c.api.before(prog.id);
    await c.GiammariaPersistence.activateCanonicalProgram(prog);
    c.DATA = JSON.parse(JSON.stringify(prog));
    c.store.activeProgramId = prog.id;
    c.currentWeek = 1; c.currentDay = 0;
  };
  return c;
}
const prog = (id, weeks) => ({ id, title: 'Programma ' + id, weeks: Array.from({ length: weeks }, (_, i) => ({ week_number: i + 1, sessions: [{ name: 'A', exercises: [{ name: 'Squat' }] }] })) });

{
  const c = world(1);
  await c.activate(prog('A', 8));
  c.store.data.w1_d0_e0_s1_load = 80;
  await c.activate(prog('B', 6));
  ok('2a. piano con un solo programma: nessuna domanda, tutto come prima', c.asked === 0 && c.api.parked().length === 0 && Object.keys(c.store.data).length === 0 && c.store.activeProgramId === 'B');
}
{
  const c = world(3);
  await c.activate(prog('A', 8));
  c.store.data.w1_d0_e0_s1_load = 80; c.store.subs.w1_d0_e0 = 'Leg press'; c.store.logs.push({ week: 1, day: 0 });
  c.currentWeek = 2; c.currentDay = 1;
  await c.activate(prog('B', 6));
  ok('3a. con posto libero viene chiesto, e "tienilo" mette da parte il primo con i suoi carichi', c.asked === 1 && c.api.parked().length === 1 && c.api.parked()[0].id === 'A' && c.api.parked()[0].fields.data.w1_d0_e0_s1_load === 80 && c.api.parked()[0].week === 2 && c.api.parked()[0].day === 1);
  ok('3b. il nuovo parte pulito', Object.keys(c.store.data).length === 0 && Object.keys(c.store.subs).length === 0);
  ok('3c. le sedute chiuse restano del programma su cui sono state fatte', c.store.logs[0].programId === 'A');
  c.store.data.w1_d0_e0_s1_load = 40; c.currentDay = 2;
  await c.activate(prog('C', 4));
  ok('3d. tre programmi attivi', c.api.parked().map((p) => p.id).join() === 'A,B' && c.store.activeProgramId === 'C');
  const okA = await c.api.switchTo('A');
  ok('3e. tornando al primo: i suoi carichi, la sua sostituzione, il punto dov’era', okA === true && c.store.activeProgramId === 'A' && c.store.data.w1_d0_e0_s1_load === 80 && c.store.subs.w1_d0_e0 === 'Leg press' && c.currentWeek === 2 && c.currentDay === 1 && c.DATA.weeks.length === 8);
  ok('3f. quello che era in uso è messo da parte, niente è perso', c.api.parked().map((p) => p.id).sort().join() === 'B,C');
  await c.api.switchTo('B');
  ok('3g. e il secondo ritrova i suoi', c.store.data.w1_d0_e0_s1_load === 40 && c.currentDay === 2 && c.DATA.weeks.length === 6 && c.api.parked().find((p) => p.id === 'A').fields.data.w1_d0_e0_s1_load === 80);
  ok('3h. ogni cambio segna un nuovo momento per la sincronizzazione', c.epochs >= 4 && c.resets >= 4 && c.store.parkedProgramsAt > 0);
  const asked = c.asked;
  await c.activate(prog('D', 4));
  ok('3i. al massimo dei programmi attivi il nuovo prende il posto di quello in uso, gli altri restano', c.asked === asked && c.store.activeProgramId === 'D' && c.api.parked().map((p) => p.id).sort().join() === 'A,C' && Object.keys(c.store.data).length === 0);
  await c.activate(prog('A', 8));
  ok('3j. attivare dalla libreria un programma in attesa lo riporta con i suoi carichi', c.store.activeProgramId === 'A' && c.store.data.w1_d0_e0_s1_load === 80 && c.api.parked().map((p) => p.id).sort().join() === 'C,D');
}
{
  const c = world(3);
  c.answer = 'replace';
  await c.activate(prog('A', 8));
  c.store.data.x = 1;
  await c.activate(prog('B', 6));
  ok('4a. "sostituiscilo": come prima, niente messo da parte', c.asked === 1 && c.api.parked().length === 0 && Object.keys(c.store.data).length === 0);
  const c2 = world(3);
  c2.store.coachViewingClient = true;
  await c2.activate(prog('A', 8));
  await c2.activate(prog('B', 6));
  ok('4b. mai mentre il coach guarda i dati di un atleta', c2.asked === 0 && c2.api.parked().length === 0 && (await c2.api.switchTo('A')) === false);
  const c3 = world(3);
  await c3.activate(prog('A', 8));
  await c3.activate(prog('B', 6));
  delete c3.GiammariaPersistence.loadProgram;
  c3.GiammariaPersistence.loadProgram = async () => null;
  ok('4c. se il programma in attesa non c’è su questo dispositivo, non si cambia e non si perde nulla', (await c3.api.switchTo('A')) === false && c3.store.activeProgramId === 'B' && c3.api.parked().length === 1);
}

// --- sync -------------------------------------------------------------------
{
  const p = (id) => ({ id, title: id, fields: { data: { k: 1 } } });
  const newer = mergeAccountDataBlobs({ parkedPrograms: [p('A')], parkedProgramsAt: 100 }, { parkedPrograms: [p('B'), p('C')], parkedProgramsAt: 200 });
  ok('5a. server: vale l’elenco cambiato per ultimo', newer.parkedPrograms.map((x) => x.id).join() === 'B,C' && newer.parkedProgramsAt === 200);
  const stale = mergeAccountDataBlobs({ parkedPrograms: [p('B'), p('C')], parkedProgramsAt: 200 }, { parkedPrograms: [], parkedProgramsAt: 100 });
  ok('5b. server: un dispositivo rimasto indietro non cancella i programmi in attesa', stale.parkedPrograms.length === 2 && stale.parkedProgramsAt === 200);
  const old = mergeAccountDataBlobs({ parkedPrograms: [p('A')], parkedProgramsAt: 100 }, { data: { a: 1 } });
  ok('5c. server: un’app vecchia che non li conosce non li cancella', old.parkedPrograms.length === 1);
  ok('5d. app: viaggiano con l’account e fanno parte dell’area personale', /parkedPrograms: \(!bak && Array\.isArray\(store\.parkedPrograms\)\)/.test(html) && /'parkedPrograms', 'parkedProgramsAt'/.test(html) && /Number\(remote\.parkedProgramsAt\) \|\| 0\) > \(Number\(store\.parkedProgramsAt\)/.test(html));
}
ok('6. il selettore è in cima all’allenamento e nella pagina programmi', /renderTraining\(c\); try \{ const sw = activeProgramsSwitcherHtml\(\)/.test(html) && /activeProgramsSwitcherHtml\(\{ always: true \}\)/.test(html));

console.log('');
if (failed) { console.log(failed + ' controlli dei programmi attivi falliti.'); process.exit(1); }
console.log('Tutti i controlli dei programmi attivi passano.');
