// La scheda sta in IndexedDB, non in mezzo al blob di ogni salvataggio.
//
// persist() parte a ogni tocco. Il sanitizer toglie la programmazione dal blob
// di localStorage apposta - la scheda vive in IndexedDB e da lì viene riletta
// all'avvio - ma la riga subito dopo, che sovrappone l'area personale, gliela
// rimetteva dentro. Risultato: 784 KB riscritti a ogni tocco con 6 settimane,
// 6,2 MB con 40, contro un tetto di 5 MB su iOS.
//
// Togliere la scheda dal blob è sicuro solo se qualcuno la porta in IndexedDB.
// Qui si controlla proprio quello: che una modifica alla scheda venga vista,
// che una scheda immutata non venga riscritta a vuoto, che un salvataggio
// fallito non venga dato per fatto, e che il battito lento copra comunque
// tutto quello che l'impronta non può vedere.
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
  try {
    assert.ok(value, message);
    console.log('OK   ' + message);
  } catch (e) {
    failed++;
    console.log('FAIL ' + message);
  }
}
function eq(actual, expected, message) {
  try {
    assert.equal(actual, expected);
    console.log('OK   ' + message);
  } catch (e) {
    failed++;
    console.log('FAIL ' + message + '\n     atteso ' + JSON.stringify(expected) + ', ottenuto ' + JSON.stringify(actual));
  }
}

// One function, from its declaration to the brace that closes it at column 0.
function grab(name) {
  const at = SRC.indexOf('function ' + name + '(');
  if (at < 0) return '';
  const end = SRC.indexOf('\n}', at);
  return end < 0 ? '' : SRC.slice(at, end + 2) + '\n';
}

const slice = 'var NURVAN_PROGRAM_IDB_HEARTBEAT_MS = 30000;\n' +
  'var __programIdbSyncTimer = null;\n' +
  'var __programIdbLastFingerprint = null;\n' +
  'var __programIdbLastSavedAt = 0;\n' +
  ['activeProgramFingerprint', 'scheduleActiveProgramIdbSync'].map(grab).join('\n');

console.log('\n--- 0. le funzioni si ritagliano dal sorgente della pagina ---');
ok('0a. impronta e mirror sono nel sorgente', slice.length > 1200);

function makeProgram() {
  return {
    id: 'prog_test',
    title: 'Upper/Lower',
    weeks: [
      {
        label: 'W1',
        sessions: [
          { name: 'Upper', exercises: [
            { name: 'Panca piana', sets: [{}, {}, {}], reps_target: '8', load: 80, rest_seconds: 120 },
            { name: 'Rematore', sets: [{}, {}, {}], reps_target: '10', load: 60, rest_seconds: 90 }
          ] },
          { name: 'Lower', exercises: [
            { name: 'Squat', sets: [{}, {}, {}, {}], reps_target: '6', load: 110, rest_seconds: 180 }
          ] }
        ]
      },
      {
        label: 'W2',
        sessions: [
          { name: 'Upper', exercises: [
            { name: 'Panca piana', sets: [{}, {}, {}], reps_target: '8', load: 85, rest_seconds: 120 }
          ] }
        ]
      }
    ]
  };
}

function newCtx() {
  const ctx = {
    console,
    DATA: makeProgram(),
    store: {},
    saves: [],
    now: 1000000,
    timers: [],
    isClientStorageContext: function () { return false; },
    setTimeout: function (fn) { ctx.timers.push(fn); return ctx.timers.length; },
    clearTimeout: function (id) { if (id) ctx.timers[id - 1] = null; },
    Date: { now: function () { return ctx.now; } },
    GiammariaPersistence: {
      saveProgram: function (prog, setActive) {
        ctx.saves.push({ title: prog.title, setActive: setActive });
        return ctx.nextSaveFails
          ? Promise.reject(new Error('IndexedDB non disponibile'))
          : Promise.resolve({ success: true });
      }
    },
    nextSaveFails: false
  };
  vm.createContext(ctx);
  vm.runInContext(slice, ctx);
  return ctx;
}

// The debounce is a setTimeout; run whatever it queued.
function runTimers(ctx) {
  const queued = ctx.timers.slice();
  ctx.timers = [];
  queued.forEach(function (fn) { if (fn) fn(); });
}

console.log('\n--- 1. una modifica alla scheda arriva in IndexedDB ---');
{
  const ctx = newCtx();
  vm.runInContext('scheduleActiveProgramIdbSync();', ctx);
  runTimers(ctx);
  eq(ctx.saves.length, 1, '1a. la prima volta la scheda viene scritta');
  eq(ctx.saves[0].setActive, true, '1b. e resta quella attiva');

  vm.runInContext('DATA.weeks[0].sessions[0].exercises[0].name = "Panca inclinata";', ctx);
  vm.runInContext('scheduleActiveProgramIdbSync();', ctx);
  runTimers(ctx);
  eq(ctx.saves.length, 2, '1c. rinominare un esercizio la fa riscrivere');

  vm.runInContext('DATA.weeks[0].sessions[0].exercises[0].sets.push({});', ctx);
  vm.runInContext('scheduleActiveProgramIdbSync();', ctx);
  runTimers(ctx);
  eq(ctx.saves.length, 3, '1d. aggiungere una serie pure');

  vm.runInContext('DATA.weeks[0].sessions[0].exercises[0].load = 90;', ctx);
  vm.runInContext('scheduleActiveProgramIdbSync();', ctx);
  runTimers(ctx);
  eq(ctx.saves.length, 4, '1e. e cambiare il carico prescritto anche');

  vm.runInContext('DATA.weeks.push({ label: "W3", sessions: [] });', ctx);
  vm.runInContext('scheduleActiveProgramIdbSync();', ctx);
  runTimers(ctx);
  eq(ctx.saves.length, 5, '1f. una settimana in più non passa inosservata');
}

console.log('\n--- 2. una scheda che non cambia non viene riscritta a ogni tocco ---');
{
  const ctx = newCtx();
  vm.runInContext('scheduleActiveProgramIdbSync();', ctx);
  runTimers(ctx);
  for (let i = 0; i < 40; i++) {
    ctx.now += 100;
    vm.runInContext('scheduleActiveProgramIdbSync();', ctx);
    runTimers(ctx);
  }
  eq(ctx.saves.length, 1, '2a. quaranta tocchi in quattro secondi, una scrittura sola');
}

console.log('\n--- 3. il battito lento copre quello che l impronta non vede ---');
{
  const ctx = newCtx();
  vm.runInContext('scheduleActiveProgramIdbSync();', ctx);
  runTimers(ctx);
  ctx.now += 5000;
  vm.runInContext('scheduleActiveProgramIdbSync();', ctx);
  runTimers(ctx);
  eq(ctx.saves.length, 1, '3a. dopo cinque secondi senza modifiche non si riscrive');
  ctx.now += 31000;
  vm.runInContext('scheduleActiveProgramIdbSync();', ctx);
  runTimers(ctx);
  eq(ctx.saves.length, 2, '3b. dopo mezzo minuto si riscrive comunque, per sicurezza');
}

console.log('\n--- 4. un salvataggio fallito non viene dato per fatto ---');
{
  const ctx = newCtx();
  ctx.nextSaveFails = true;
  vm.runInContext('scheduleActiveProgramIdbSync();', ctx);
  runTimers(ctx);
  eq(ctx.saves.length, 1, '4a. il primo tentativo parte');
  // The rejection is handled in a .catch(), so the retry only becomes
  // possible on the next turn of the microtask queue.
  await Promise.resolve();
  ctx.nextSaveFails = false;
  ctx.now += 100;
  vm.runInContext('scheduleActiveProgramIdbSync();', ctx);
  runTimers(ctx);
  eq(ctx.saves.length, 2, '4b. e al tocco successivo si riprova, invece di credere che ci sia');
}

console.log('\n--- 5. la scheda non è più nel blob, ma solo dove ne esiste un altra copia ---');
{
  ok('5a. persist() la toglie dal blob',
    /if \(!isClientStorageContext\(\)\) source\.activeProgram = null;/.test(SRC));
  ok('5b. e la toglie prima del sanitizer, non dopo: il clone non deve nemmeno vederla',
    SRC.indexOf('source.activeProgram = null;') < SRC.indexOf('GiammariaPersistence.sanitizeStoreForLocalStorage(source)'));
  ok('5c. l avvio la rilegge da IndexedDB', /GiammariaPersistence\.loadActiveProgram\(\)/.test(SRC));
  ok('5d. e lo spazio cliente la rilegge dal blob, come prima',
    /DATA = normalizeProgram\(store\.activeProgram \|\| \{ title: 'Programma Atleta', weeks: \[\] \}\)/.test(SRC));
  ok('5e. il mirror gira a ogni persist', /\n  scheduleActiveProgramIdbSync\(\);\n  scheduleWorkoutLogsIdbSync\(\);/.test(SRC));
  ok('5f. e anche quando la pagina sta per sparire',
    /try \{ scheduleActiveProgramIdbSync\(true\); \} catch \(_\) \{\}/.test(SRC));
  ok('5g. il diario allenamenti resta dov era, intatto',
    /function scheduleWorkoutLogsIdbSync\(immediate\)/.test(SRC) &&
    /saveWorkoutLogsSnapshot\(\{\s*\n\s*data: store\.data \|\| \{\}/.test(SRC));
  ok('5h. e il backup bloccato della scheda personale resta la rete di sicurezza',
    /personalScopedKey\('nurvan_personal_program_lock'\)/.test(SRC) &&
    /function lockPersonalProgramBackup\(prog\)/.test(SRC));
  ok('5i. tutto questo è anche nella pagina costruita',
    /function scheduleActiveProgramIdbSync\(immediate\)/.test(BUILT));
}

console.log('');
console.log('--- 6. la copia bloccata non prova a stare dove non ci sta ---');
// Il backup bloccato teneva una copia intera della scheda in localStorage. Con
// 52 settimane sono 9 MB contro un tetto di circa 5 MB su iOS: una rete che
// non entra non è una rete. Sopra la soglia in locale resta il riferimento e
// la scheda sta in IndexedDB, dove il recupero d'emergenza la cerca già.
{
  const lockSlice = 'var NURVAN_PROGRAM_LOCK_MAX_BYTES = ' +
    (SRC.match(/var NURVAN_PROGRAM_LOCK_MAX_BYTES = ([^;]+);/) || [0, '1024 * 1024'])[1] + ';' + String.fromCharCode(10) +
    grab('lockPersonalProgramBackup');
  const KEY = 'nurvan_personal_program_lock__test';

  function lockCtx(idbOutcome) {
    const ctx = {
      console: { warn: function () {} },
      store: {},
      ls: {},
      idbSaves: [],
      personalScopedKey: function (name) { return name + '__test'; },
      isClientStorageContext: function () { return false; },
      looksLikeClientAssignDraft: function () { return false; }
    };
    ctx.localStorage = {
      setItem: function (k, v) { ctx.ls[k] = v; },
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(ctx.ls, k) ? ctx.ls[k] : null; }
    };
    ctx.GiammariaPersistence = {
      saveProgram: function (prog) {
        ctx.idbSaves.push({ id: prog.id, weeks: (prog.weeks || []).length });
        return idbOutcome === 'fail'
          ? Promise.reject(new Error('IndexedDB non disponibile'))
          : Promise.resolve({ success: true });
      }
    };
    vm.createContext(ctx);
    vm.runInContext(lockSlice, ctx);
    return ctx;
  }

  function program(weeks, exPerSession) {
    const ex = () => ({ name: 'Esercizio con un nome lungo come quelli veri', muscle: 'Petto',
      reps_target: '8', rest_seconds: 120, load: 80, technique: '', notes: '',
      sets: [1, 2, 3, 4].map(n => ({ set_number: n, target_reps: '8', reps: '8', set_type: 'working', rest_seconds: 120 })) });
    return { id: 'p', title: 'Scheda', weeks: Array.from({ length: weeks }, (_, w) => ({
      week: w + 1, label: 'Settimana ' + (w + 1),
      sessions: Array.from({ length: 6 }, () => ({ name: 'Seduta', exercises: Array.from({ length: exPerSession }, ex) })) })) };
  }

  const small = lockCtx('ok');
  small.prog = program(6, 4);
  vm.runInContext('lockPersonalProgramBackup(prog);', small);
  const smallRec = JSON.parse(small.ls[KEY]);
  ok('6a. una scheda corta tiene la copia intera in locale, come prima',
    !!(smallRec.program && smallRec.program.weeks.length === 6));
  eq(small.idbSaves.length, 1, '6b. e ne va comunque una copia in IndexedDB');
  eq(small.idbSaves[0].id, 'personal_locked_backup', '6c. col nome che il recupero cerca');

  const big = lockCtx('ok');
  big.prog = program(52, 8);
  ok('6d. la scheda di prova è davvero grossa (oltre 1 MB)', JSON.stringify(big.prog).length > 1024 * 1024);
  vm.runInContext('lockPersonalProgramBackup(prog);', big);
  eq(big.ls[KEY], undefined, '6e. prima che IndexedDB confermi, in locale non si tocca niente');
  await Promise.resolve();
  const bigRec = JSON.parse(big.ls[KEY]);
  ok('6f. dopo la conferma in locale resta solo il riferimento', bigRec.program === null && bigRec.inIdb === true);
  eq(bigRec.weeks, 52, '6g. che dice comunque quante settimane erano');
  ok('6h. e pesa qualche centinaio di byte invece di nove megabyte', big.ls[KEY].length < 400);
  eq(big.idbSaves.length, 1, '6i. la scheda intera è in IndexedDB');
  eq(big.idbSaves[0].weeks, 52, '6j. tutte e 52 le settimane');

  // Se IndexedDB non prende il backup, la copia locale è l'unica rete rimasta:
  // non la si sostituisce con un riferimento a niente.
  const broken = lockCtx('fail');
  broken.prog = program(52, 8);
  vm.runInContext('lockPersonalProgramBackup(prog);', broken);
  await Promise.resolve();
  await Promise.resolve();
  const brokenRec = JSON.parse(broken.ls[KEY] || 'null');
  ok('6k. se IndexedDB fallisce si tiene la copia intera in locale',
    !!(brokenRec && brokenRec.program && brokenRec.program.weeks.length === 52));

  ok('6l. il recupero salta un record senza scheda dentro',
    /if \(locked && locked\.program\) addCandidate\(locked\.program, 'Backup locale bloccato'\)/.test(SRC));
  ok('6m. e il backup di IndexedDB è già fra i candidati',
    /loadProgram\('personal_locked_backup'\)[\s\S]{0,120}addCandidate\(lockedProg, 'IndexedDB · backup bloccato'\)/.test(SRC));
  ok('6n. tutto questo è anche nella pagina costruita', /var NURVAN_PROGRAM_LOCK_MAX_BYTES = /.test(BUILT));
}

console.log('');
if (failed) { console.log(failed + ' test di archiviazione scheda falliti.'); process.exit(1); }
console.log('Tutti i test di archiviazione della scheda passano.');
