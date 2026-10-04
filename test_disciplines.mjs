// Training at home: Pilates matwork, mobility and stretching, calisthenics,
// HIIT. The programs written, the database, and how they are wired into the
// app (screen, generator, builder, timed lesson).
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
for (const f of ['web/program-builder.js', 'web/program-catalog.js', 'web/hyrox.js', 'web/disciplines.js', 'web/exercise-catalog-extra.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
const D = ctx.NurvanDisciplines;
const C = ctx.NurvanProgramCatalog;
const libraryNames = new Set(ctx.WEB_EXERCISE_CATALOG.map((e) => e.name));
const rows = (p) => p.weeks.flatMap((w) => w.sessions.flatMap((s) => s.exercises));
const everyPlan = [];
for (const d of D.DISCIPLINES) for (const k of d.kits) for (const l of D.LEVELS) for (const m of D.MINUTES) for (const days of d.days) {
  everyPlan.push({ d, k, l, m, days, prog: D.plan({ discipline: d.id, kit: k.id, level: l.id, minutes: m, days, weeks: 12 }) });
}

// 1. The disciplines.
ok('1a. cinque discipline: Pilates, mobilità, calisthenics, HIIT, GAG', D.DISCIPLINES.map((d) => d.id).join() === 'pilates,mobilita,calisthenics,hiit,gag');
ok('1b. ognuna dice cosa serve e in quanti giorni si allena', D.DISCIPLINES.every((d) => d.needs && d.note && d.days.length >= 3 && d.kits.length >= 1));

// 2. The programs.
ok('2a. ogni combinazione scrive tutte le settimane e tutte le sedute, mai vuote', everyPlan.every((x) => x.prog.weeks.length === 12 && x.prog.weeks.every((w) => w.sessions.length === x.days && w.sessions.every((s) => s.exercises.length >= 2))));
ok('2b. le righe hanno la forma delle altre schede', everyPlan.every((x) => rows(x.prog).every((r) => r.name && Array.isArray(r.sets) && r.sets.length === r.setCount && r.rest && ['reps', 'time', 'cardio', 'circuit'].includes(r.unit))));
ok('2c. ogni esercizio scritto è nella libreria dell’app', everyPlan.every((x) => rows(x.prog).every((r) => (r.unit === 'circuit' ? r.circuit.items.map((i) => i.name) : [r.name]).every((n) => libraryNames.has(n)))));
const seconds = (s, pilates) => s.exercises.reduce((n, e) => {
  if (e.unit === 'circuit') { const c = e.circuit; return n + c.rounds * c.items.length * (c.work + c.rest) + (c.rounds - 1) * c.roundRest + 60; }
  const rest = /min/.test(e.rest) ? parseInt(e.rest, 10) * 60 : parseInt(e.rest, 10);
  const per = e.unit === 'time' ? e.sets[0].seconds : (e.unit === 'cardio' ? e.sets[0].minutes * 60 : parseInt(e.repsTarget, 10) * (pilates ? 6 : 4));
  return n + e.setCount * (per * (/^Per lato/.test(e.notes || '') ? 2 : 1) + rest);
}, 0);
ok('2d. Pilates, mobilità e HIIT durano circa quanto chiesto (mai oltre il 35% in più, mai sotto la metà)', everyPlan.filter((x) => x.d.id !== 'calisthenics').every((x) => x.prog.weeks.every((w) => w.sessions.every((s) => { const min = seconds(s, x.d.id === 'pilates') / 60; return min <= x.m * 1.35 && min >= x.m * 0.5; }))));
ok('2e. la scheda dice da dove viene e porta le sue fonti', everyPlan.every((x) => x.prog.source === 'discipline_v1' && x.prog.purpose === x.d.id && x.prog.meta.evidence.length >= 3));

// 3. Pilates.
const pil = D.plan({ discipline: 'pilates', level: 'principiante', minutes: 30, days: 3, weeks: 8 });
const order = D.exercisesOf('pilates').map((e) => e.name);
ok('3a. la sequenza segue l’ordine classico', pil.weeks.every((w) => w.sessions.every((s) => s.exercises.every((e, i, a) => i === 0 || order.indexOf(a[i - 1].name) < order.indexOf(e.name)))));
ok('3b. Hundred, Roll up e Seal ci sono in ogni seduta', pil.weeks.every((w) => w.sessions.every((s) => ['Hundred', 'Roll up', 'Seal'].every((n) => s.exercises.some((e) => e.name === n)))));
ok('3c. un principiante non trova esercizi avanzati, e quelli intermedi solo da metà programma', (() => {
  const lvl = Object.fromEntries(D.exercisesOf('pilates').map((e) => [e.name, e.level]));
  return rows(pil).every((r) => lvl[r.name] < 2) && pil.weeks.slice(0, 3).every((w) => w.sessions.every((s) => s.exercises.every((e) => lvl[e.name] === 0))) && rows({ weeks: pil.weeks.slice(5) }).some((r) => lvl[r.name] === 1);
})());
ok('3d. ogni esercizio ha la sua indicazione; quelli per lato lo dicono', rows(pil).every((r) => r.notes && r.cue) && rows(pil).some((r) => /^Per lato\. /.test(r.notes)));

// 4. Mobility.
const mob = D.plan({ discipline: 'mobilita', kit: 'lower', level: 'intermedio', minutes: 30, days: 4, weeks: 8 });
const mobFull = D.plan({ discipline: 'mobilita', kit: 'full', level: 'intermedio', minutes: 30, days: 3, weeks: 8 });
ok('4a. "anche e gambe" non lavora su spalle e collo', !rows(mob).some((r) => /spall|collo|pettorali|dorsali|toracic/i.test(r.name)));
ok('4b. "tutto il corpo" tocca gambe, schiena e spalle', ['Stretch 90/90 anche', 'Cat-cow', 'Cerchi controllati della spalla'].every((n) => rows(mobFull).some((r) => r.name === n)));
ok('4c. le tenute si allungano nel programma', (() => { const hold = (w) => Math.max(...mob.weeks[w].sessions[0].exercises.filter((e) => e.unit === 'time').map((e) => e.sets[0].seconds)); return hold(6) > hold(0); })());
ok('4d. nessuna posizione due volte nella stessa seduta', mob.weeks.every((w) => w.sessions.every((s) => new Set(s.exercises.map((e) => e.name)).size === s.exercises.length)));

// 5. Calisthenics.
const calFloor = D.plan({ discipline: 'calisthenics', kit: 'floor', level: 'principiante', minutes: 45, days: 4, weeks: 8 });
const calBar = D.plan({ discipline: 'calisthenics', kit: 'bar', level: 'principiante', minutes: 45, days: 4, weeks: 8 });
ok('5a. senza sbarra niente trazioni né esercizi appesi', !rows(calFloor).some((r) => /Trazioni|Dead hang|Scapular|Hanging|Leg raise|Inverted row|Dips parallele/.test(r.name)));
ok('5b. con la sbarra la tirata è alla sbarra', rows(calBar).some((r) => r.name === 'Dead hang') && rows(calBar).some((r) => r.name === 'Trazioni negative'));
ok('5c. a metà programma si passa alla variante successiva', calBar.weeks[0].sessions[0].exercises.some((e) => e.name === 'Push-up inclinato') && calBar.weeks[5].sessions[0].exercises.some((e) => e.name === 'Push-up') && !calBar.weeks[5].sessions[0].exercises.some((e) => e.name === 'Push-up inclinato'));
ok('5d. le parallele solo a chi le ha', !rows(D.plan({ discipline: 'calisthenics', kit: 'bar', level: 'avanzato', minutes: 45, days: 5, weeks: 8 })).some((r) => r.name === 'Dips parallele') && rows(D.plan({ discipline: 'calisthenics', kit: 'bar_dips', level: 'avanzato', minutes: 45, days: 5, weeks: 8 })).some((r) => r.name === 'Dips parallele'));

// 6. HIIT.
const hiit = D.plan({ discipline: 'hiit', kit: 'bodyweight', level: 'intermedio', minutes: 30, days: 3, weeks: 8 });
const circuits = rows(hiit).filter((r) => r.unit === 'circuit');
ok('6a. riscaldamento, poi circuiti a tempo', hiit.weeks.every((w) => w.sessions.every((s) => s.exercises[0].unit === 'cardio' && s.exercises.slice(1).every((e) => e.unit === 'circuit'))));
ok('6b. il Tabata è 20 secondi di lavoro e 10 di recupero, 4 minuti', circuits.filter((r) => /Tabata/.test(r.name)).every((r) => r.circuit.work === 20 && r.circuit.rest === 10 && r.circuit.rounds * r.circuit.items.length * 30 === 240));
ok('6c. a corpo libero nessun attrezzo; con il kettlebell lo si usa', !circuits.some((r) => r.circuit.items.some((i) => /Kettlebell|elastico|goblet/i.test(i.name))) && rows(D.plan({ discipline: 'hiit', kit: 'kettlebell', days: 3, weeks: 4 })).some((r) => r.unit === 'circuit' && r.circuit.items.some((i) => i.name === 'Kettlebell swing')));
ok('6d. nessuna stazione due volte nella stessa seduta', hiit.weeks.every((w) => w.sessions.every((s) => { const n = s.exercises.filter((e) => e.circuit).flatMap((e) => e.circuit.items.map((i) => i.name)); return new Set(n).size === n.length; })));

// 7. The evidence.
ok('7a. ogni disciplina ha almeno tre risultati, ognuno con il suo studio e il DOI', D.DISCIPLINES.every((d) => D.EVIDENCE[d.id].length >= 3 && D.EVIDENCE[d.id].every((e) => e.fact && e.plan && e.source && /^https:\/\/doi\.org\/10\./.test(e.url))));
ok('7b. i numeri sono quelli degli studi', /118 studi con 9\.710 persone/.test(D.EVIDENCE.pilates[0].fact) && /189 studi, 6\.654 adulti/.test(D.EVIDENCE.mobilita[0].fact) && /5,5 ml\/kg\/min/.test(D.EVIDENCE.hiit[0].fact));

// 8. The database.
ok('8a. 1.656 schede pronte: 144 Pilates, 432 mobilità, 324 calisthenics, 324 HIIT, 432 GAG', D.catalogTotal({}) === 1656 && D.catalogTotal({ goal: 'pilates' }) === 144 && D.catalogTotal({ goal: 'mobilita' }) === 432 && D.catalogTotal({ goal: 'calisthenics' }) === 324 && D.catalogTotal({ goal: 'hiit' }) === 324 && D.catalogTotal({ goal: 'gag' }) === 432);
ok('8b. il database programmi le trova per obiettivo e le conta nel totale', C.search({ goal: 'pilates' }, 500).rows.length === 144 && C.total({}) === C.total({ goal: 'ipertrofia' }) * 5 + 1800 + 1656);
ok('8c. filtri: giorni, livello, durata, attrezzi', (() => { const r = C.search({ goal: 'hiit', equipment: 'kettlebell', days: 3, experience: 'avanzato', duration: 8 }, 50).rows; return r.length === 3 && r.every((x) => x.discipline_kit === 'kettlebell' && x.days_per_week === 3 && x.duration_weeks === 8 && x.experience === 'avanzato'); })());
ok('8d. un filtro che la disciplina non ha (Pilates 6 giorni) non inventa schede', C.search({ goal: 'pilates', days: 6 }, 50).rows.length === 0);
ok('8e. dall’id si riscrive la stessa scheda, intera', (() => { const row = C.search({ goal: 'calisthenics', equipment: 'bar' }, 1).rows[0]; const b = C.bodyFor(row.id); return C.rowById(row.id).title === row.title && b.weeks.length === row.duration_weeks && b.weeks[0].sessions.length === row.days_per_week && b.source === 'discipline_v1' && b.notes.length === 3; })());
ok('8f. gli id sono tutti diversi', (() => { const ids = D.DISCIPLINES.flatMap((d) => C.search({ goal: d.id }, 2000).rows.map((x) => x.id)); return ids.length === 1656 && new Set(ids).size === 1656; })());

// 9. Wired into the app.
const html = fs.readFileSync('web/index.base.html', 'utf8');
const coachUi = fs.readFileSync('web/coach-practice-ui.js', 'utf8');
ok('9a. la schermata è nell’app, si apre dalla Home e dal programma del cliente', /currentView === 'disciplines'\) renderDisciplines\(c\)/.test(html) && /navigate\(\\'disciplines\\'\)/.test(html) && /<script src="disciplines\.js"><\/script>/.test(html) && /navigate\(\\'disciplines\\'\)/.test(coachUi));
ok('9b. il generatore ha le quattro discipline come obiettivo', /disciplinesApi\(\)\.DISCIPLINES\.forEach\(function \(d\) \{ items\.push\(\{ id: d\.id, label: d\.label \}\); \}\)/.test(html) && /if \(generatorIsDiscipline\(g\)\) \{ renderGeneratorDisciplineSheet/.test(html));
ok('9c. il costruttore parte da una settimana della disciplina', /builderDisciplineStartHtml\(d, inputStyle\) \+/.test(html) && /function startDisciplineDraft\(\)/.test(html));
ok('9d. un atleta seguito la chiede al coach', /if \(hyroxMustAsk\(\)\) \{ disciplineRequestCoach\(\); return; \}/.test(html));
ok('9e. il coach la assegna e il questionario ha gli obiettivi', /\\'discipline\\'\)">PILATES, MOBILITÀ, CALISTHENICS, HIIT, GAG/.test(coachUi) && /mode === 'discipline'/.test(coachUi) && /'HYROX', 'Pilates', 'Mobilità e stretching', 'Calisthenics', 'HIIT', 'GAG'\]/.test(coachUi));
ok('9f. file copiato nelle app e messo in cache', /'disciplines\.js'/.test(fs.readFileSync('sync_web_assets.mjs', 'utf8')) && /'\.\/disciplines\.js'/.test(fs.readFileSync('web/sw.js', 'utf8')));
ok('9g. il Coach AI conosce la sezione', /ALLENARSI A CASA \(Pilates matwork/.test(fs.readFileSync('coach-api.mjs', 'utf8')));

// 10. The timed lesson, run for real on a session.
const from = html.indexOf('function lessonSteps(week, day) {');
const to = html.indexOf('function lessonBeep(high) {');
const session = D.plan({ discipline: 'pilates', level: 'principiante', minutes: 20, days: 2, weeks: 4 }).weeks[0].sessions[0];
const hiitSession = hiit.weeks[0].sessions[0];
function lessonContext(sess) {
  const c = {
    store: { skips: {}, subs: {}, data: {} }, DATA: { source: 'discipline_v1' }, currentWeek: 1, currentDay: 0,
    sessionExercisesFor: () => sess.exercises,
    exerciseLogUnit: (row) => (row.circuit ? 'circuit' : row.unit),
    circuitOf: (row) => row.circuit,
    getExerciseSetCount: (i) => sess.exercises[i].setCount,
    parseRestSeconds: (t, f) => (/min/.test(t) ? parseInt(t, 10) * 60 : (parseInt(t, 10) || f)),
    parseInt, Math, Number, String, Array
  };
  vm.createContext(c);
  vm.runInContext(html.slice(from, to) + '\nthis.api = { lessonSteps, lessonWorthOffering, lessonButtonHtml };', c);
  return c;
}
const lc = lessonContext(session);
const steps = lc.api.lessonSteps(1, 0);
const sideTimed = session.exercises.filter((e) => e.unit === 'time' && /^Per lato/.test(e.notes)).length;
ok('10a. un passo per ogni serie, in ordine (i tenuti per lato valgono due)', steps.length === session.exercises.reduce((n, e) => n + e.setCount, 0) + sideTimed * session.exercises[0].setCount && steps[0].name === session.exercises[0].name);
ok('10b. a tempo quello che si tiene, contato il resto, con l’indicazione', steps.some((s) => s.kind === 'time' && s.name === 'Hundred' && s.seconds >= 45) && steps.some((s) => s.kind === 'reps' && s.name === 'Roll up' && s.target === '6' && /vertebra/.test(s.note)));
ok('10c. la lezione viene proposta, e non più quando la seduta è fatta', /SEGUI COME LEZIONE A TEMPO/.test(lc.api.lessonButtonHtml()) && (() => { session.exercises.forEach((e, i) => { for (let s = 1; s <= e.setCount; s++) lc.store.data['w1_d0_e' + i + '_s' + s + '_done'] = true; }); return lc.api.lessonSteps(1, 0).length === 0 && lc.api.lessonButtonHtml() === ''; })());
const hs = lessonContext(hiitSession).api.lessonSteps(1, 0);
const firstCircuit = hiitSession.exercises[1].circuit;
ok('10d. un circuito diventa i suoi round, stazione per stazione', hs.filter((s) => s.circuit && s.exIdx === 1).length === firstCircuit.rounds * firstCircuit.items.length && hs.filter((s) => s.circuit && s.exIdx === 1 && s.closes).length === 1);
ok('10e. quello che si fa nella lezione finisce nel diario come una serie spuntata', /store\.data\[k \+ '_done'\] = true;\s+store\.data\[k \+ '_done_at'\] = Date\.now\(\);/.test(html) && /else if \(step\.kind === 'time'\) store\.data\[k \+ '_sec'\] = step\.seconds;/.test(html));
ok('10f. il pulsante è nella schermata di allenamento', /try \{ h \+= lessonButtonHtml\(\); \} catch \(_\) \{\}/.test(html));

// 11. GAG (gambe, addome, glutei).
const gagPlans = everyPlan.filter((x) => x.d.id === 'gag');
ok('11a. GAG: 3 attrezzature × 3 livelli × 3 durate × 4 frequenze scritte per intero', gagPlans.length === 108 && D.discipline('gag').kits.map((k) => k.id).join() === 'floor,bands,weights');
ok('11b. ogni seduta allena i glutei e l’addome', gagPlans.every((x) => x.prog.weeks.every((w) => w.sessions.every((s) => s.exercises.some((e) => (e.muscle_groups || []).includes('GLUTEI')) && s.exercises.some((e) => (e.muscle_groups || []).includes('ADDOME'))))));
ok('11c. a corpo libero nessun elastico e nessun manubrio; con gli elastici e i manubri li si usa', !gagPlans.filter((x) => x.k.id === 'floor').some((x) => rows(x.prog).some((r) => /elastico|manubri|goblet|bilanciere/i.test(r.name)))
  && gagPlans.filter((x) => x.k.id === 'bands').some((x) => rows(x.prog).some((r) => /elastico|band walk|Monster walk/i.test(r.name)))
  && gagPlans.filter((x) => x.k.id === 'weights').some((x) => rows(x.prog).some((r) => /manubri|manubrio|goblet|B-stance/i.test(r.name))));
ok('11d. il livello e metà programma alzano la difficoltà (un gradino della scala)', (() => {
  const first = (level, week) => D.plan({ discipline: 'gag', kit: 'floor', level, minutes: 30, days: 3, weeks: 8 }).weeks[week - 1].sessions[0].exercises.filter((e) => e.unit !== 'cardio').map((e) => e.name).join();
  return first('principiante', 1) !== first('avanzato', 1) && first('principiante', 1) !== first('principiante', 6);
})());
ok('11e. gli studi citati hanno il loro numero e il loro DOI', D.EVIDENCE.gag.length === 4 && /34 persone/.test(D.EVIDENCE.gag[0].fact) && /14 calciatrici/.test(D.EVIDENCE.gag[1].fact) && D.EVIDENCE.gag.every((e) => e.url.startsWith('https://doi.org/10.')));
ok('11f. il database ha le schede GAG e i suoi esercizi sono tutti elencati', C.search({ goal: 'gag' }, 500).rows.length === 432 && D.exercisesOf('gag').length >= 30 && D.exercisesOf('gag').every((e) => e.cue && e.amount));
ok('11g. «GAG» è riconosciuto come tipo di programma e ha la sua icona', html.includes("{ id: 'gag', label: 'GAG' }") && /gag: 'discipline-gag'/.test(html) && fs.existsSync('web/icons/discipline-gag.svg'));

console.log('');
if (failed) { console.log(failed + ' controlli delle discipline falliti.'); process.exit(1); }
console.log('Tutti i controlli delle discipline passano.');
