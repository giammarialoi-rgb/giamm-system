// Level 2 of the 25/09 audit, fourth block: what the cloud keeps when two
// devices sync - a shorter program, saved programs, calendar events.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeAccountDataBlobs } from './server/account/index.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
const SRC = read('web/index.base.html');
let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const weeks = (n) => Array.from({ length: n }, (_, i) => ({ weekNumber: i + 1, sessions: [{ name: 'S', exercises: [] }] }));

console.log('');
console.log('--- 1. un programma piu\' corto arriva al cloud ---');
{
  const t0 = '2026-09-01T10:00:00Z', t1 = '2026-09-20T10:00:00Z';
  const cloud = { activeProgram: { id: 'long', weeks: weeks(16) }, trainingDataEpoch: { at: t0 } };
  const switched = { activeProgram: { id: 'short', weeks: weeks(8) }, trainingDataEpoch: { at: t1 } };
  ok('1a. 16 settimane -> 8 per scelta (cambio piu\' recente): il cloud prende le 8', mergeAccountDataBlobs(cloud, switched).activeProgram.id === 'short');
  const stale = { activeProgram: { id: 'draft', weeks: weeks(4) }, trainingDataEpoch: { at: t0 } };
  ok('1b. un programma corto senza cambio piu\' recente non sostituisce quello lungo (protezione di prima)', mergeAccountDataBlobs(cloud, stale).activeProgram.id === 'long');
  ok('1c. e nemmeno uno vuoto', mergeAccountDataBlobs(cloud, { activeProgram: { weeks: [] }, trainingDataEpoch: { at: t1 } }).activeProgram.id === 'long');
  const it = mergeAccountDataBlobs({ intelTargets: { w1_d0_e0: { a: 1 } }, trainingDataEpoch: { at: t0 } }, { intelTargets: {}, trainingDataEpoch: { at: t1 } });
  ok('1d. anche gli obiettivi per posizione (intelTargets) seguono l\'epoca', Object.keys(it.intelTargets).length === 0);
  const sync = SRC.slice(SRC.indexOf('async function syncAccountData('), SRC.indexOf('async function syncAccountData(') + 5000);
  ok('1e. la pagina carica il programma cambiato qui anche se il cloud ne ha uno piu\' lungo', /\|\| \(remoteWeeks > localWeeks && !localSwitchedLater\);/.test(sync));
  ok('1f. e prende quello cambiato su un altro dispositivo, marcando le sue sedute col programma sostituito',
    /if \(!athlete && remoteSwitchedProgram && remoteProg && Array\.isArray\(remoteProg\.weeks\) && remoteProg\.weeks\.length\) \{\s*\n\s*takeRemote = true;/.test(SRC) &&
    /if \(!athlete && remoteSwitchedProgram && prevProgramKey && prevProgramKey !== activeProgramKey\(\)\) \{/.test(SRC));
}

console.log('');
console.log('--- 2. schede salvate ---');
{
  const cloud = { models: [{ id: 'p1', name: 'Forza', date: 1, data: { weeks: weeks(4) } }, { id: 'p2', name: 'Ipertrofia', date: 2, data: { weeks: weeks(6) } }] };
  const phone = { models: [{ id: 'p1', name: 'Forza', date: 1 }] };
  const m = mergeAccountDataBlobs(cloud, phone);
  ok('2a. un telefono che ha solo il nome non cancella il contenuto nel cloud', m.models.find((x) => x.id === 'p1').data.weeks.length === 4);
  ok('2b. le schede solo nel cloud restano', m.models.some((x) => x.id === 'p2'));
  const del = mergeAccountDataBlobs(m, { models: [], hiddenProgramIds: ['p2'] });
  ok('2c. una scheda tolta dalla libreria resta tolta (hiddenProgramIds viaggia)', !del.models.some((x) => x.id === 'p2') && del.hiddenProgramIds.includes('p2'));
  const back = mergeAccountDataBlobs(del, { models: [{ id: 'p2', name: 'Ipertrofia', date: 2 }] });
  ok('2d. e un altro dispositivo non la riporta', !back.models.some((x) => x.id === 'p2'));
  const many = mergeAccountDataBlobs({ models: Array.from({ length: 20 }, (_, i) => ({ id: 'c' + i, date: i })) }, { models: Array.from({ length: 8 }, (_, i) => ({ id: 'n' + i, date: 100 + i })) });
  ok('2e. otto nuove non spingono fuori le altre (24 tenute, non 12)', many.models.length === 24);
  const lib = SRC.slice(SRC.indexOf('async function syncProgramLibraryFromIdb('), SRC.indexOf('function buildExerciseDbFromDictionary('));
  ok('2f. la pagina manda il contenuto delle 8 piu\' recenti, da una cache fuori dallo store', /window\.__programDataCache\[m\.id\] = full;/.test(lib) && /const content = m\.data \|\| \(window\.__programDataCache && window\.__programDataCache\[m\.id\]\) \|\| null;/.test(SRC));
  ok('2g. una scheda che arriva dal cloud finisce nella libreria del dispositivo (non attiva)', /return GiammariaPersistence\.saveProgram\(prog, false, \{ id: model\.id \}\);/.test(SRC) && /storeRemoteProgramLocally\(m\);/.test(SRC));
  ok('2h. il contenuto non entra nello store (copiato a ogni salvataggio)', /const meta = Object\.assign\(\{\}, byModel\[m\.id\] \|\| \{\}, m\);\s*\n\s*delete meta\.data;/.test(SRC));
}

console.log('');
console.log('--- 3. calendario ---');
{
  const cloud = { calendarEvents: [{ id: 'e1', title: 'Visita' }, { id: 'e2', title: 'Gara' }] };
  const phone = { calendarEvents: [{ id: 'e1', title: 'Visita' }, { id: 'e3', title: 'Nuovo' }], calendarEventsDeleted: { e2: '2026-09-20' } };
  const m = mergeAccountDataBlobs(cloud, phone);
  const ids = m.calendarEvents.map((e) => e.id).sort().join();
  ok('3a. per id da entrambe le parti, meno i cancellati', ids === 'e1,e3');
  const again = mergeAccountDataBlobs(m, { calendarEvents: [{ id: 'e2', title: 'Gara' }] });
  ok('3b. un altro dispositivo non riporta l\'evento cancellato', !again.calendarEvents.some((e) => e.id === 'e2'));
  const svc = read('prepare_task20_js_services.mjs');
  ok('3c. il calendario legge la lista dell\'account ogni volta (la sua copia vecchia cancellava gli eventi sincronizzati)', /if \(typeof store !== 'undefined' && store && Array\.isArray\(store\.calendarEvents\)\) \{\s*\n\s*this\._customCache = store\.calendarEvents;/.test(svc));
  ok('3d. eliminare un evento lascia la sua cancellazione', /store\.calendarEventsDeleted\[String\(id\)\] = new Date\(\)\.toISOString\(\);/.test(svc));
  ok('3e. l\'upload la porta, il download la applica', /calendarEventsDeleted: \(store\.calendarEventsDeleted/.test(SRC) && /const kept = store\.calendarEvents\.filter\(function \(e\) \{ return !\(e && e\.id != null && gone\[String\(e\.id\)\]\); \}\);/.test(SRC));
}

console.log('');
if (failed) { console.log(failed + ' controlli del livello 2 (sincronizzazione) falliti.'); process.exit(1); }
console.log('Tutti i controlli del livello 2 (sincronizzazione) passano.');
