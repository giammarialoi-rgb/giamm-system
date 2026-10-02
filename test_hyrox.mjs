// The HYROX section: the preparation written for a race date, the equipment
// that is missing replaced, the calendar the app and the site read.
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const ctx = {};
ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('web/hyrox.js', 'utf8'), ctx);
const H = ctx.NurvanHyrox;
const all = H.GEAR.map((g) => g.id);
const rows = (p) => p.weeks.flatMap((w) => w.sessions.flatMap((s) => s.exercises));

// 1. The race.
ok('1a. otto stazioni, nell’ordine di gara', H.STATIONS.length === 8 && H.STATIONS[0].id === 'skierg' && H.STATIONS[7].id === 'wall_balls');
ok('1b. carichi per categoria (slitta Open uomini 152/103, Pro uomini 202/153)', H.DIVISIONS.find((d) => d.id === 'open_m').sled_push === 152 && H.DIVISIONS.find((d) => d.id === 'open_m').sled_pull === 103 && H.DIVISIONS.find((d) => d.id === 'pro_m').sled_push === 202);
ok('1c. avviso sul marchio', /non è affiliata/.test(H.DISCLAIMER));

// 2. The program.
const p = H.plan({ weeks: 12, days: 4, level: 'intermediate', division: 'open_m', gear: all });
ok('2a. dodici settimane, quattro sedute ciascuna', p.weeks.length === 12 && p.weeks.every((w) => w.sessions.length === 4));
ok('2b. fasi: base, costruzione, picco, e l’ultima settimana di scarico', p.weeks[0].phase === 'base' && p.weeks[11].phase === 'taper' && p.weeks.some((w) => w.phase === 'build') && p.weeks.some((w) => w.phase === 'peak'));
ok('2c. ha la forma delle altre schede (righe con serie, unità, recupero)', rows(p).every((r) => r.name && Array.isArray(r.sets) && r.sets.length === r.setCount && r.rest && ['reps', 'cardio', 'time'].includes(r.unit)));
ok('2d. almeno una simulazione di gara nel picco', p.weeks.some((w) => w.sessions.some((s) => /simulazione/i.test(s.name))));
ok('2e. la simulazione completa ha le otto stazioni, ognuna dopo un chilometro di corsa', (() => {
  const sim = p.weeks.flatMap((w) => w.sessions).find((s) => s.name === 'Simulazione di gara');
  if (!sim) return false;
  const st = sim.exercises.filter((e) => e.hyrox_station);
  return st.length === 8 && st.every((e) => sim.exercises[sim.exercises.indexOf(e) - 1].name === 'Corsa');
})());
ok('2f. i carichi di gara sono scritti nelle note', rows(p).some((r) => /Carico gara 152 kg/.test(r.notes || '')));
ok('2g. giorni: da 3 a 6', [3, 4, 5, 6].every((d) => H.plan({ weeks: 8, days: d, gear: all }).weeks[0].sessions.length === d));

// 3. Missing equipment.
const q = H.plan({ weeks: 8, days: 4, gear: ['rower', 'wallball'] });
ok('3a. senza slitta e ski erg quegli esercizi non compaiono', !rows(q).some((r) => /^(Sled push|Sled pull|Ski erg)$/.test(r.name)));
ok('3b. al loro posto un esercizio che si può fare, con la spiegazione', rows(q).some((r) => r.hyrox_station === 'sled_push' && r.name === 'Affondi camminati' && /Al posto della slitta/.test(r.notes || '')));
ok('3c. quello che c’è resta', rows(q).some((r) => r.name === 'Vogatore') && rows(q).some((r) => r.name === 'Wall ball'));
ok('3d. il riepilogo dice cosa manca', /senza: .*Ski erg/.test(q.source_summary));

// 4. The race date.
ok('4a. settimane fino alla gara', H.weeksUntil('2026-12-04', '2026-10-01') === 9);
ok('4b. la preparazione dura quanto manca alla gara', H.plan({ raceDate: '2026-12-04', today: '2026-10-01', raceName: 'Milano', gear: all }).weeks.length === 9);
ok('4c. mai meno di 4 settimane né più di 20', H.plan({ raceDate: '2026-10-10', today: '2026-10-01', gear: all }).weeks.length === 4 && H.plan({ raceDate: '2028-01-01', today: '2026-10-01', gear: all }).weeks.length === 20);
ok('4d. il nome della gara è nel titolo', /Milano/.test(H.plan({ raceDate: '2026-12-04', today: '2026-10-01', raceName: 'Milano', gear: all }).title));

// 5. The calendar.
const cal = JSON.parse(fs.readFileSync('web/hyrox-events.json', 'utf8'));
ok('5a. calendario con data di aggiornamento e fonte', cal.events.length > 50 && /^\d{4}-\d{2}-\d{2}$/.test(cal.updated) && /hyrox\.com/.test(cal.source));
ok('5b. ogni gara ha città, paese, pagina ufficiale e un id unico', cal.events.every((e) => e.id && e.city && e.countryName && /^https:\/\/hyrox\.com\//.test(e.url)) && new Set(cal.events.map((e) => e.id)).size === cal.events.length);
ok('5c. le date sono in ordine (inizio prima della fine)', cal.events.every((e) => !e.start || e.start <= e.end));
ok('5d. gare in Italia', H.upcoming(cal.events, 'italy', '2026-10-01').length >= 1 && H.upcoming(cal.events, 'italy', '2026-10-01').every((e) => e.country === 'IT'));
ok('5e. le gare passate non compaiono, quelle in corso sì', H.upcoming([{ start: '2026-09-01', end: '2026-09-02', country: 'IT' }, { start: '2026-09-30', end: '2026-10-04', country: 'FR' }], 'all', '2026-10-01').length === 1);
ok('5f. Europa comprende l’Italia, Mondo tutto', H.upcoming(cal.events, 'europe', '2026-10-01').some((e) => e.country === 'IT') && H.upcoming(cal.events, 'all', '2026-10-01').some((e) => e.country === 'US'));

// 6. The estimate.
const est = H.estimateFinish(25, 'intermediate');
ok('6a. stima: una forchetta plausibile', est && est.low < est.high && est.low > 60 && est.high < 130);
ok('6b. senza un tempo sensato nessuna stima', H.estimateFinish('', 'beginner') === null && H.estimateFinish(5, 'beginner') === null);

// 7. Wired into the app and the site.
const html = fs.readFileSync('web/index.base.html', 'utf8');
ok('7a. la schermata è nell’app e si apre dalla Home', /currentView === 'hyrox'\) renderHyrox\(c\)/.test(html) && /navigate\(\\'hyrox\\'\)/.test(html) && /<script src="hyrox\.js"><\/script>/.test(html));
ok('7b. la scheda passa dall’anteprima prima di essere attivata; per un cliente diventa la sua bozza', /openGeneratedReview\(prog, hyroxForClient\(\) \? 'assign' : 'active', null\)/.test(html));
const coachUi = fs.readFileSync('web/coach-practice-ui.js', 'utf8');
ok('7b2. il coach la assegna dal menu di assegnazione del cliente', (coachUi.match(/,\\'hyrox\\'\)">PREPARAZIONE HYROX/g) || []).length === 2 && /mode === 'hyrox'/.test(coachUi) && /navigate\('hyrox'\)/.test(coachUi));
const sync = fs.readFileSync('sync_web_assets.mjs', 'utf8');
ok('7c. motore e calendario copiati nelle app', /'hyrox\.js'/.test(sync) && /'hyrox-events\.json'/.test(sync));
const api = fs.readFileSync('coach-api.mjs', 'utf8');
ok('7d. il sito ha il calendario e una pagina per gara', /mountHyrox\(app/.test(api) && /app\.get\(base \+ "\/hyrox\/:id", one\)/.test(fs.readFileSync('server/site/hyrox.mjs', 'utf8')));

// 8. The evidence the preparation is built on.
ok('8a. ogni dato ha il suo studio (testo, cosa fa il piano, fonte, DOI)', H.EVIDENCE.length >= 6 && H.EVIDENCE.every((e) => e.fact && e.plan && e.source && /^https:\/\/doi\.org\/10\./.test(e.url)));
ok('8b. i numeri sono quelli degli studi (corsa 27:38 su 56:56, correlazione −0,71, scarico 41–60%)', /27:38 su 56:56/.test(H.EVIDENCE[0].fact) && H.EVIDENCE.some((e) => /−0,71/.test(e.fact)) && H.EVIDENCE.some((e) => /41–60%/.test(e.fact)));
ok('8c. ogni stazione ha il tempo dei migliori 100 Pro', H.STATIONS.every((s) => s.top && /^\d:\d\d$/.test(s.top.m) && /^\d:\d\d$/.test(s.top.w)));
ok('8d. scarico di due settimane da 10 settimane in su, una sotto', p.weeks[10].phase === 'taper' && p.weeks[9].phase === 'peak' && H.plan({ weeks: 8, days: 4, gear: all }).weeks.filter((w) => w.phase === 'taper').length === 1);
ok('8e. le sedute di corsa non sono mai meno di quelle di sola forza', [3, 4, 5, 6].every((d) => {
  const s = H.plan({ weeks: 12, days: d, gear: all }).weeks[0].sessions.map((x) => x.name);
  return s.filter((n) => /^Corsa/.test(n)).length >= s.filter((n) => /^Forza/.test(n)).length;
}));
ok('8f. anche alla prima gara c’è una simulazione completa prima dello scarico', H.plan({ weeks: 12, days: 3, level: 'beginner', gear: all }).weeks.some((w) => w.phase === 'peak' && w.sessions.some((s) => s.name === 'Simulazione di gara')));
ok('8g. la scheda porta con sé le fonti', p.meta.evidence.length >= 5 && p.meta.evidence.every((u) => /doi\.org/.test(u)));

// 9. HYROX as a goal: in the generator, in the profile, in what a client asks for.
ok('9a. riconosce l’obiettivo scritto a mano', H.wantsHyrox('Preparare una Hyrox a Milano') && H.wantsHyrox('HYROX') && !H.wantsHyrox('Ipertrofia') && !H.wantsHyrox(null));
ok('9b. il generatore di schede ha l’obiettivo HYROX e scrive la preparazione', /items\.push\(\{ id: 'hyrox', label: 'HYROX · preparazione gara' \}\)/.test(html) && /if \(generatorIsHyrox\(g\)\) \{ renderGeneratorHyroxSheet\(g, api, sheet, inputStyle\); return; \}/.test(html) && /race = hx\.plan\(input\);/.test(html));
ok('9c. le domande sono le stesse nella schermata HYROX e nel generatore', (html.match(/hyroxFieldsHtml\(\)/g) || []).length >= 3);
ok('9d. profilo con obiettivo HYROX: si apre la preparazione', /wantsHyrox\(profile\.goal\)/.test(html));
ok('9e. un atleta seguito non la scrive: la chiede al coach', /if \(hyroxMustAsk\(\)\) \{ hyroxRequestCoach\(\); return; \}/.test(html) && /CHIEDI AL COACH QUESTA PREPARAZIONE/.test(html));
ok('9f. il questionario del cliente ha l’obiettivo HYROX', /'Preparazione gara', 'HYROX'/.test(coachUi));
ok('9g. il Coach AI conosce la sezione e i dati', /HYROX_KNOWLEDGE/.test(api) && (api.match(/\$\{HYROX_KNOWLEDGE\}/g) || []).length === 2);
const practice = fs.readFileSync('coach-practice.mjs', 'utf8');
ok('9h. la richiesta arriva al coach con gara, categoria e giorni', /payload\.hyrox = \{/.test(practice) && /hyrox: it\.hyrox \|\| null/.test(coachUi));

// The coach's side of a request, run for real.
const from = coachUi.indexOf('function latestHyroxRequest');
const to = coachUi.indexOf('function openAssignChooser');
const labelFrom = coachUi.indexOf('function parseCoachEventPayload');
const labelTo = coachUi.indexOf('function coachEventNotifyRoute') > labelFrom ? coachUi.indexOf('function coachEventNotifyRoute') : coachUi.indexOf('\nfunction ', coachUi.indexOf('function coachEventLabel') + 10);
const cctx = { store: { coachWorkspace: {}, hyrox: {} }, esc: (s) => String(s), fmtDay: (s) => String(s), eventNotifyCopy: () => null, JSON };
cctx.window = cctx;
cctx.NurvanHyrox = H;
vm.createContext(cctx);
vm.runInContext(coachUi.slice(labelFrom, labelTo) + '\n' + coachUi.slice(from, to) + '\nthis.api = { latestHyroxRequest, hyroxRequestFor, clientWantsHyrox, clientHyroxCardHtml, prefillHyroxFromRequest, coachEventLabel };', cctx);
const hxReq = { raceId: 'milano', raceName: 'Milano', raceDate: '2026-12-04', division: 'open_w', level: 'beginner', days: 3, weeks: 9, gear: ['rower'] };
const events = [{ id: 3, kind: 'program_assigned' }, { id: 5, kind: 'request_program', payload: JSON.stringify({ hyrox: hxReq }) }];
ok('9i. la richiesta più recente senza risposta è quella che il coach vede', cctx.api.latestHyroxRequest(events, '7').hyrox.raceName === 'Milano');
ok('9j. una scheda assegnata dopo la richiesta la chiude', cctx.api.latestHyroxRequest(events.concat([{ id: 9, kind: 'program_assigned' }]), '7') === null);
ok('9k. la notifica dice quale gara; una richiesta normale porta il messaggio', /HYROX · Milano/.test(cctx.api.coachEventLabel('request_program', 'Anna', { hyrox: hxReq }).body) && /chiede la scheda: 4 giorni/.test(cctx.api.coachEventLabel('request_program', 'Anna', { note: '4 giorni' }).body));
cctx.__cpHyroxRequest = cctx.api.latestHyroxRequest(events, '7');
ok('9l. la scheda del cliente mostra la richiesta e il pulsante per scriverla', /Richiesta: preparazione HYROX/.test(cctx.api.clientHyroxCardHtml('7', 'Anna', {})) && /Open donne/.test(cctx.api.clientHyroxCardHtml('7', 'Anna', {})) && cctx.api.clientHyroxCardHtml('8', 'Altro', {}) === '');
ok('9m. anche il solo obiettivo HYROX del questionario la propone', /Obiettivo del cliente: HYROX/.test(cctx.api.clientHyroxCardHtml('8', 'Altro', { goal: 'HYROX' })));
cctx.api.prefillHyroxFromRequest('7');
ok('9n. le risposte del cliente sono già compilate quando il coach apre la preparazione', cctx.store.hyrox.raceId === 'milano' && cctx.store.hyrox.division === 'open_w' && cctx.store.hyrox.days === 3 && cctx.store.hyrox.gear.join() === 'rower');

// 10. Where one trains, the database of ready-made programs, the builder.
vm.runInContext(fs.readFileSync('web/program-builder.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('web/program-catalog.js', 'utf8'), ctx);
const C = ctx.NurvanProgramCatalog;
const names = (prog) => [...new Set(rows(prog).map((r) => r.name))];
const library = fs.readFileSync('web/exercise-catalog-extra.js', 'utf8') + fs.readFileSync('web/cardio-library.js', 'utf8');
ok('10a. cinque posti in cui ci si allena, dal completo al corpo libero', H.PROFILES.map((x) => x.id).join() === 'full,box,gym,home,bodyweight');
ok('10b. a casa niente macchine né bilanciere', (() => { const n = names(H.plan({ weeks: 8, days: 6, profile: 'home' })); return !n.some((x) => /Ski erg|Vogatore|Sled|Air bike|Battle rope|Slam ball|bilanciere|Lat machine|Wall ball/.test(x)) && n.includes('Squat goblet') && n.includes('Farmer walk'); })());
ok('10c. a corpo libero nessun carico', (() => { const n = names(H.plan({ weeks: 8, days: 6, profile: 'bodyweight' })); return !n.some((x) => /manubri|Farmer|Thruster|goblet|Hip thrust|Rematore|Stacco|Sled|Ski erg|Vogatore/i.test(x)) && n.includes('Squat a corpo libero'); })());
ok('10d. ogni esercizio scritto è nella libreria dell’app, stazioni di gara comprese', H.PROFILES.every((pr) => names(H.plan({ weeks: 12, days: 6, profile: pr.id })).every((n) => library.includes('"' + n + '"') || library.includes("'" + n + "'"))) && ['Wall ball', 'Burpee broad jump', 'Affondi camminati con sandbag', 'Slam ball'].every((n) => library.includes('name: "' + n + '"')));
ok('10e. il database ha 1.800 preparazioni, 360 per ogni posto', H.catalogTotal({}) === 1800 && H.PROFILES.every((pr) => H.catalogTotal({ equipment: pr.id }) === 360));
ok('10f. il database programmi le trova con obiettivo HYROX e le conta nel totale', C.search({ goal: 'hyrox' }, 150).rows.length === 150 && C.total({ goal: 'hyrox' }) === 1800 && C.total({}) === C.total({ goal: 'ipertrofia' }) * 5 + 1800);
ok('10g. filtri: attrezzatura, pubblico, giorni, livello, durata', (() => { const r = C.search({ goal: 'hyrox', equipment: 'casa', audience: 'female', days: 3, experience: 'principiante', duration: 8 }, 50).rows; return r.length === 2 && r.every((x) => x.hyrox_profile === 'home' && /_w$/.test(x.hyrox_division) && x.days_per_week === 3 && x.duration_weeks === 8); })());
ok('10h. un filtro che HYROX non ha (2 giorni) non inventa schede', C.search({ goal: 'hyrox', days: 2 }, 50).rows.length === 0);
ok('10i. dall’id si riscrive la stessa scheda, intera', (() => { const row = C.search({ goal: 'hyrox', equipment: 'box' }, 1).rows[0]; const b = C.bodyFor(row.id); return C.rowById(row.id).title === row.title && b.weeks.length === row.duration_weeks && b.weeks[0].sessions.length === row.days_per_week && b.source === 'hyrox_v1' && b.notes.length === 3; })());
ok('10j. gli id sono tutti diversi', (() => { const ids = C.search({ goal: 'hyrox' }, 2000).rows.map((x) => x.id); return ids.length === 1800 && new Set(ids).size === 1800; })());
ok('10k. una settimana per il costruttore, nel posto scelto', H.sampleWeek({ profile: 'gym', days: 4 }).length === 4 && H.sampleWeek({ profile: 'bodyweight', days: 3 }).every((s) => s.exercises.length > 0));
ok('10l. il costruttore parte da una settimana HYROX e la schermata Programmi lo offre', /function startHyroxDraft\(\)/.test(html) && /builderHyroxStartHtml\(d, inputStyle\) \+/.test(html) && /homeCollapsibleCard\('SCHEDA HYROX'/.test(html) && /onclick="openHyroxBuilder\(\)"/.test(html));
ok('10m. una scheda HYROX del database si attiva intera, senza essere riscritta come le altre', /!catalogWholeSource\(entry\.source\) && typeof expandScienceProgramWeeks/.test(html) && /function catalogWholeSource\(src\) \{ return src === 'hyrox_v1'/.test(html));

console.log('');
if (failed) { console.log(failed + ' controlli HYROX falliti.'); process.exit(1); }
console.log('Tutti i controlli HYROX passano.');
