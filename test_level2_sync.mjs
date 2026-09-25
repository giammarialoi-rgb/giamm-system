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
console.log('--- 4. la modifica piu\' recente vince, valore per valore ---');
{
  const T2 = Date.now() - 1000;
  const cloud = mergeAccountDataBlobs({}, { data: { k: '90', o: 'x' } });
  const web = mergeAccountDataBlobs(cloud, { data: { k: '100' }, mapStamps: { data: { k: T2 } } });
  ok('4a. server: la correzione fatta dal web entra', web.data.k === '100');
  const stale = mergeAccountDataBlobs(web, { data: { k: '90', o: 'x' } });
  ok('4b. server: un telefono con il valore vecchio (senza ora) non la annulla', stale.data.k === '100' && stale.data.o === 'x');
  const del = mergeAccountDataBlobs(stale, { data: {}, mapDeletes: { data: { o: Date.now() } } });
  const back = mergeAccountDataBlobs(del, { data: { o: 'x' } });
  ok('4c. server: una chiave cancellata resta cancellata, anche se un altro la rimanda', !('o' in del.data) && !('o' in back.data));
  const newer = mergeAccountDataBlobs(back, { data: { k: '110' }, mapStamps: { data: { k: Date.now() } } });
  ok('4d. server: una modifica piu\' recente vince sulla precedente', newer.data.k === '110');
  const legacy = mergeAccountDataBlobs({ subs: { a: 1 } }, { subs: { a: 2, b: 3 } });
  ok('4e. server: senza ore da nessuna parte, come prima (vince chi carica)', legacy.subs.a === 2 && legacy.subs.b === 3);

  const vm = await import('node:vm');
  const NL = '\n';
  const grab = (name) => { const at = SRC.indexOf('function ' + name + '('); const end = SRC.indexOf(NL + '}', at); return SRC.slice(at, end + 2) + NL; };
  const grabVar = (name) => { const at = SRC.indexOf('var ' + name + ' = '); return SRC.slice(at, SRC.indexOf(';' + NL, at) + 2); };
  const ctx = { console, Date };
  vm.createContext(ctx);
  vm.runInContext(grabVar('STAMPED_MAP_FIELDS') + NL + grabVar('MAP_DELETES_KEEP_MS') + NL + ['mapValueSig', 'mapSnapshot', 'stampLocalMapChanges', 'mergeStampedMap'].map(grab).join(NL), ctx);
  ctx.store = { data: { a: '80', b: '6', c: 'old' } };
  vm.runInContext('stampLocalMapChanges(1000)', ctx);
  ok('4f. pagina: la prima volta cio\' che c\'e\' conta come sincronizzato, senza ore', !ctx.store.mapStamps && !!ctx.store.mapSyncBase);
  ctx.store.data.a = '85'; delete ctx.store.data.c;
  vm.runInContext('stampLocalMapChanges(2000)', ctx);
  ok('4g. pagina: una modifica e una cancellazione locali prendono la loro ora', ctx.store.mapStamps.data.a === 2000 && ctx.store.mapDeletes.data.c === 2000);
  ctx.remote = { data: { a: '82', b: '8', d: 'new' }, mapStamps: { data: { a: 1500, b: 3000 } } };
  vm.runInContext('mergeStampedMap("data", remote)', ctx);
  ok('4h. pagina: vince la modifica piu\' recente di ciascun lato (a locale 2000 > 1500; b remoto 3000)', ctx.store.data.a === '85' && ctx.store.data.b === '8');
  ok('4i. pagina: senza ore, il cloud riempie solo cio\' che manca', ctx.store.data.d === 'new');
  ctx.remote = { data: {}, mapDeletes: { data: { b: 4000 } } };
  vm.runInContext('mergeStampedMap("data", remote)', ctx);
  ok('4j. pagina: una cancellazione piu\' recente dall\'altro dispositivo si applica', !('b' in ctx.store.data));
  const apply = SRC.slice(SRC.indexOf('function applyRemoteAccountData('), SRC.indexOf('function applyRemoteAccountData(') + 60000);
  ok('4k. il download segna prima le modifiche locali e alla fine assorbe il cloud senza segnarlo come modifica locale',
    /try \{ stampLocalMapChanges\(\); \} catch \(_\) \{\}/.test(apply) && /try \{ store\.mapSyncBase = mapSnapshot\(\); \} catch \(_\) \{\}\s*\n\}/.test(apply));
  ok('4l. l\'upload porta le ore', /mapStamps: \(!bak && store\.mapStamps\) \? store\.mapStamps : \{\},/.test(SRC));
}

console.log('');
console.log('--- 5. lo stesso giorno aperto su due telefoni ---');
{
  const vm = await import('node:vm');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(read('web/domain-merge.js'), ctx);
  const N = ctx.NurvanNutritionMerge;
  const mk = (food) => ({ mergeVersion: 1, present: true, days: [{ day: 'Giovedi', date: '2026-09-25', meals: [{ name: 'Pasti liberi', foods: [{ name: food, quantity: 100, unit: 'g' }] }] }] });
  const a = mk('Yogurt'), b = mk('Mela');
  N.ensureIds(a, true); N.ensureIds(b, true);
  N.stamp(a, null, 1000); N.stamp(b, null, 2000);
  const m = N.merge(a, b);
  ok('5a. un solo giorno 25/09, con i cibi di entrambi i telefoni', m.days.length === 1 && m.days[0].meals.length === 1 && m.days[0].meals[0].foods.length === 2);
  ok('5b. gli alimenti restano distinti (id casuali)', a.days[0].meals[0].foods[0].id !== b.days[0].meals[0].foods[0].id);
}

console.log('');
if (failed) { console.log(failed + ' controlli del livello 2 (sincronizzazione) falliti.'); process.exit(1); }
console.log('Tutti i controlli del livello 2 (sincronizzazione) passano.');
