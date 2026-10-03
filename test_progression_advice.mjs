// When the progression has stopped working: what the advisor reads from the
// closed sessions, which progression it suggests, and what the app does when
// the athlete accepts (the weeks not started are rewritten, the trained ones
// are left alone, the change can be undone). The app's own functions are read
// out of the page and run on a program built by the real progression models.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
let n = 0;
function ok(value, message) { assert.ok(value, message); n++; console.log('OK  ', message); }

const ctx = { self: {}, console };
vm.createContext(ctx);
for (const f of ['web/exercise-taxonomy.js', 'web/progression-models.js', 'web/progression-advisor.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx);
const P = ctx.self.NurvanProgressions;
const A = ctx.self.NurvanProgressionAdvisor;

console.log('--- progression advice ---');

// A closed session: rows [{ name, load, reps, rir, sets, target }]
function session(week, day, rows) {
  return {
    week, day,
    rows: rows.map((r) => ({
      key: r.name.toLowerCase(), name: r.name, repsLow: r.low || 8, targetRir: r.target == null ? 2 : r.target, planned: r.sets || 3,
      sets: Array.from({ length: r.sets || 3 }, (_, i) => ({ load: r.load, reps: r.reps, rir: r.rir == null ? 2 : r.rir, done: r.done === false ? false : (i < (r.doneSets == null ? 99 : r.doneSets)) }))
    }))
  };
}
const history = (loads, extra = {}) => loads.map((l, i) => session(Math.floor(i / 2) + 1, i % 2, [
  { name: 'Panca piana', load: l, reps: 8, rir: extra.rir, target: 2 },
  { name: 'Rematore', load: l * 0.8, reps: 10, rir: extra.rir, target: 2 }
]));

// --- the verdict -----------------------------------------------------------------
{
  const rising = A.analyze(history([60, 60, 62.5, 62.5, 65, 65, 67.5, 67.5]));
  ok(rising.state === 'ok' && A.advise(rising, { current: 'none', family: 'bodybuilding', remainingWeeks: 8 }) === null, '1a. se i carichi salgono non c’è niente da proporre');
  const flat = A.analyze(history([60, 60, 60, 60, 60, 60], { rir: 2 }));
  ok(flat.enough && flat.state === 'stalled' && flat.tracked.every((t) => t.state === 'stalled'), '1b. tre settimane sugli stessi carichi: ferma, e lo dice per ogni esercizio');
  const few = A.analyze(history([60, 60, 60]));
  ok(!few.enough && A.advise(few, { current: 'none', remainingWeeks: 8 }) === null, '1c. con meno di quattro sedute non giudica');
  const oneWeek = A.analyze([session(1, 0, [{ name: 'Panca piana', load: 60, reps: 8 }]), session(1, 1, [{ name: 'Panca piana', load: 60, reps: 8 }]), session(1, 2, [{ name: 'Panca piana', load: 60, reps: 8 }]), session(1, 3, [{ name: 'Panca piana', load: 60, reps: 8 }])]);
  ok(!oneWeek.enough, '1d. quattro sedute nella stessa settimana non bastano: servono due settimane');
  const back = A.analyze(history([70, 70, 70, 67.5, 65, 62.5], { rir: 2 }));
  ok(back.state === 'regressing' && back.tracked[0].dropPct >= 4, '1e. numeri che calano: regressione, con di quanto');
  ok(A.analyze(history([60, 60, 60, 60, 60, 60], { rir: 2 })).fatigue.level === 'low' && A.analyze(history([60, 60, 60, 60, 60, 60], { rir: 0 })).fatigue.level === 'high', '1f. la fatica è lo sforzo oltre la prescrizione: RIR registrato sotto il bersaglio');
  const unfinished = A.analyze([0, 1, 2, 3, 4, 5].map((i) => session(Math.floor(i / 2) + 1, i % 2, [{ name: 'Panca piana', load: 60, reps: 8, doneSets: 2 }])));
  ok(unfinished.fatigue.level === 'high', '1g. serie lasciate a metà contano come fatica');
  const bodyweight = A.analyze([0, 1, 2, 3, 4, 5].map((i) => session(Math.floor(i / 2) + 1, i % 2, [{ name: 'Trazioni', load: '', reps: 8 }])));
  ok(bodyweight.tracked.length === 1 && bodyweight.tracked[0].kind === 'reps' && bodyweight.tracked[0].state === 'stalled', '1h. un esercizio senza carico si misura sulle ripetizioni');
}

// --- what to suggest ----------------------------------------------------------------
{
  const stalledFresh = A.analyze(history([60, 60, 60, 60, 60, 60], { rir: 2 }));
  const stalledTired = A.analyze(history([60, 60, 60, 60, 60, 60], { rir: 0 }));
  const back = A.analyze(history([70, 70, 70, 67.5, 65, 62.5], { rir: 2 }));
  const ctx8 = (current, family = 'bodybuilding') => ({ current, family, remainingWeeks: 8 });
  ok(A.advise(stalledFresh, ctx8('none')).modelId === 'volume_ramp' && A.advise(stalledFresh, ctx8('none')).fatigue === 'low', '2a. ferma ma fresco: serve più stimolo, serie che salgono');
  ok(A.advise(stalledTired, ctx8('none')).modelId === 'volume_wave' && A.advise(stalledTired, ctx8('double_progression')).modelId === 'volume_wave', '2b. ferma e stanco: meno fatica accumulata, onde con la settimana di scarico');
  ok(A.advise(back, ctx8('linear_rir')).modelId === 'volume_wave', '2c. in regressione: stessa risposta della fatica');
  ok(A.advise(stalledTired, ctx8('volume_wave')).modelId === 'dup' && A.advise(stalledFresh, ctx8('volume_ramp')).modelId === 'dup', '2d. se è già su quella proposta, ne propone un’altra');
  const models = ['none', 'linear_rir', 'double_progression', 'volume_wave', 'dup', 'block_hyp_strength', 'volume_ramp', 'technique_intensifier', 'density'];
  ok(models.every((m) => [stalledFresh, stalledTired, back].every((a) => { const r = A.advise(a, ctx8(m)); return !r || (r.modelId !== m && !r.alternatives.includes(m) && P.get(r.modelId).id === r.modelId && r.alternatives.every((x) => P.get(x).id === x)); })), '2e. mai quella su cui è già, e ogni consiglio è una progressione che esiste');
  ok(A.advise(stalledTired, ctx8('wave_531', 'powerlifting')).modelId === 'rpe_autoreg' && A.advise(stalledFresh, ctx8('wave_531', 'powerlifting')).modelId === 'texas_method', '2f. nel powerlifting: stanco → carico deciso in giornata sullo sforzo; fresco → altro ritmo di onde');
  ok(A.advise(stalledTired, ctx8('peaking_classic', 'powerlifting')) === null && A.advise(stalledTired, ctx8('meet_taper', 'powerlifting')) === null, '2g. a ridosso della gara non si tocca la forma del blocco');
  ok(A.advise(stalledFresh, { current: 'none', family: 'bodybuilding', remainingWeeks: 2 }) === null, '2h. con meno di tre settimane davanti non propone');
  const r = A.advise(stalledTired, ctx8('none'));
  ok(r.exercises.length >= 1 && r.sessions === 6 && r.weeks === 3 && r.alternatives.length >= 1, '2i. la proposta porta le prove: gli esercizi fermi, le sedute e le settimane osservate, le alternative');
}

// --- the app: apply and undo ----------------------------------------------------------------
const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8').replace(/\r\n/g, '\n');
const a = html.indexOf('/* ---------- when the way the program progresses has stopped working ---------- */');
const b = html.indexOf('/* ---------- a test inside the program, and what follows from it ---------- */');
ok(a > 0 && b > a, '3a. il blocco dell’app c’è');
const block = html.slice(a, b);

function world(opts = {}) {
  const template = [
    { name: 'Upper', exercises: [
      { name: 'Panca piana bilanciere', sets: [{ reps: '8' }, { reps: '8' }, { reps: '8' }], setCount: 3, repsTarget: '8', rest: '120s' },
      { name: 'Rematore bilanciere', sets: [{ reps: '10' }, { reps: '10' }, { reps: '10' }], setCount: 3, repsTarget: '10', rest: '90s' }
    ] },
    { name: 'Lower', exercises: [
      { name: 'Squat bilanciere', sets: [{ reps: '8' }, { reps: '8' }, { reps: '8' }], setCount: 3, repsTarget: '8', rest: '120s' },
      { name: 'Stacco rumeno', sets: [{ reps: '10' }, { reps: '10' }, { reps: '10' }], setCount: 3, repsTarget: '10', rest: '90s' }
    ] }
  ];
  const weeks = P.weeksFromTemplate(template, { weeks: 10, modelId: opts.model || 'linear_rir', loadDisplay: 'percent', maxes: {} });
  const w = {
    DATA: { id: 'p1', weeks, duration_weeks: 10, progression_model: opts.model || 'linear_rir', progression: { model: opts.model || 'linear_rir', load_display: 'percent', maxes: {} } },
    store: { data: {}, logs: [], subs: {}, exIntensity: {}, prefs: { intensityType: 'RIR' }, activeProgramId: 'p1' },
    currentWeek: opts.currentWeek || 3, persisted: 0, rendered: 0, toasts: [], body: [], coach: !!opts.coach
  };
  // closed sessions for weeks 1..(currentWeek): flat loads, effort as asked
  const upto = opts.logsUpTo == null ? 3 : opts.logsUpTo;
  for (let wk = 1; wk <= upto; wk++) for (let d = 0; d < 2; d++) {
    w.store.logs.push({ week: wk, day: d, programId: 'p1' });
    w.DATA.weeks[wk - 1].sessions[d].exercises.forEach((row, ei) => {
      for (let s = 1; s <= row.sets.length; s++) {
        const k = 'w' + wk + '_d' + d + '_e' + ei + '_s' + s;
        w.store.data[k + '_load'] = String(opts.load || (60 + ei * 10));
        w.store.data[k + '_reps'] = String(row.repsTarget || 8).replace(/-.*/, '');
        w.store.data[k + '_rir'] = String(opts.rir == null ? 2 : opts.rir);
        w.store.data[k + '_done'] = true;
      }
    });
  }
  const c = {
    console, Math, Number, String, Array, Object, JSON, isFinite,
    window: { NurvanProgressions: P, NurvanProgressionAdvisor: A },
    document: { createElement: () => ({ style: {}, set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; }, remove() { w.body = w.body.filter((x) => x !== this); } }), getElementById: (id) => w.body.find((x) => x.id === id) || null, body: { appendChild: (el) => w.body.push(el) } },
    get DATA() { return w.DATA; }, get store() { return w.store; }, get currentWeek() { return w.currentWeek; },
    logsOfActiveProgram: () => w.store.logs, activeProgramKey: () => 'p1',
    sessionExercisesFor: (week, day) => { const wk = w.DATA.weeks[week - 1]; const s = wk && (wk.sessions || wk.days)[day]; return s ? s.exercises : null; },
    programRowName: (row) => String((row && (row.name || row.exercise)) || '').trim(),
    isWarmupSet: (s) => !!(s && s.warmup),
    prescribedRirFor: (row, set) => (set && set.rir != null ? Number(set.rir) : (row && row.rirTarget != null ? Number(row.rirTarget) : 2)),
    currentBodyweightKg: () => 80, esc: (s) => String(s), persist() {}, persistActiveProgramStructure() { w.persisted++; },
    render() { w.rendered++; }, showToast: (m) => w.toasts.push(m),
    isAthleteRole: () => w.coach, isClientStorageContext: () => false
  };
  vm.createContext(c);
  vm.runInContext(block + '\nthis.api = { context: progressionAdviceContext, advice: progressionAdviceFor, maybe: maybeSuggestProgressionChange, apply: applyProgressionChange, undo: undoProgressionChange, card: renderProgressionAdviceCardHtml };', c);
  return { w, c };
}

{
  const { w, c } = world({ rir: 0 });
  const ctxApp = c.api.context();
  ok(ctxApp && ctxApp.current === 'linear_rir' && ctxApp.startAfter === 3 && ctxApp.remainingWeeks === 7 && ctxApp.templateWeek === 3, '3b. il contesto: sulla settimana 3 di 10, restano 7 settimane, parte da come è adesso');
  const advice = c.api.advice(ctxApp);
  ok(advice && advice.modelId === 'volume_wave' && advice.state === 'stalled', '3c. letto dai dati del programma: fermo e stanco → onde di volume');
  ok(c.api.maybe(false) === true && w.body.some((x) => x.id === 'progression-advice-sheet' && /LA PROGRESSIONE SI È FERMATA/.test(x.innerHTML) && /Onda di volume/.test(x.innerHTML) && /PASSA A QUESTA DALLA SETTIMANA 4/.test(x.innerHTML) && /NO, CONTINUO COSÌ/.test(x.innerHTML)), '3d. si apre la proposta, con le prove, il consiglio, la settimana da cui parte e il no');
  ok(c.api.maybe(false) === false && w.store.prefs.progressionAdvice.week === 3, '3e. non lo richiede subito: una volta ogni due settimane del programma');
  ok(/VEDI LA PROPOSTA/.test(c.api.card()), '3f. la scheda nella pagina delle statistiche c’è finché i numeri lo dicono');

  const before = JSON.stringify(w.DATA.weeks.slice(0, 3));
  const loadsBefore = JSON.stringify(w.store.data);
  c.api.apply('volume_wave');
  ok(JSON.stringify(w.DATA.weeks.slice(0, 3)) === before && JSON.stringify(w.store.data) === loadsBefore, '4a. le tre settimane fatte e tutti i dati registrati non si toccano');
  ok(w.DATA.weeks.length === 10 && w.DATA.weeks.every((wk, i) => wk.week === i + 1 && wk.weekNumber === i + 1 && /^Settimana \d+/.test(wk.label) && Number(/^Settimana (\d+)/.exec(wk.label)[1]) === i + 1), '4b. sempre dieci settimane, numerate e intitolate bene');
  ok(w.DATA.progression.model === 'volume_wave' && w.DATA.progression_model === 'volume_wave' && w.DATA.progression_changes.length === 1 && w.DATA.progression_changes[0].from === 'linear_rir' && w.DATA.progression_changes[0].week === 3, '4c. il programma ricorda la nuova progressione e il cambio (da quale, da che settimana)');
  const labels = w.DATA.weeks.slice(3).map((x) => x.label).join('|');
  ok(/Deload/.test(labels) && w.DATA.weeks.slice(3).some((x) => x.phase === 'deload'), '4d. le settimane nuove hanno la loro forma: qui lo scarico ogni quarta del nuovo blocco');
  const sess = w.DATA.weeks[4].sessions;
  ok(sess.length === 2 && sess[0].exercises.map((r) => r.name).join() === 'Panca piana bilanciere,Rematore bilanciere' && sess[1].exercises.length === 2 && sess[0].exercises.every((r) => r.sets.length >= 1 && r.setCount >= 1), '4e. stesse sedute e stessi esercizi, scritti di nuovo con la nuova progressione');
  ok(w.persisted >= 1 && w.rendered >= 1 && w.store.progressionBackup && w.store.progressionBackup.weeks.length === 7, '4f. salvato, ridisegnato, e le sette settimane sostituite messe da parte');
  ok(w.body.some((x) => x.id === 'progression-advice-sheet' && /PROGRESSIONE CAMBIATA/.test(x.innerHTML) && /ANNULLA, TORNA COME PRIMA/.test(x.innerHTML)), '4g. si dice cosa è cambiato e si può annullare');

  const afterChange = JSON.stringify(w.DATA.weeks);
  c.api.undo();
  ok(JSON.stringify(w.DATA.weeks.slice(0, 3)) === before && w.DATA.progression.model === 'linear_rir' && w.DATA.progression_changes.length === 0 && w.DATA.weeks.length === 10 && w.store.progressionBackup === null, '5a. annullare rimette le settimane e la progressione di prima');
  ok(JSON.stringify(w.DATA.weeks) !== afterChange, '5b. e non sono più quelle nuove');

  c.api.apply('dup');
  w.store.logs.push({ week: 5, day: 0, programId: 'p1' });
  const dupWeeks = JSON.stringify(w.DATA.weeks);
  c.api.undo();
  ok(JSON.stringify(w.DATA.weeks) === dupWeeks && w.toasts.some((m) => /già fatto sedute/.test(m)), '5c. se hai già fatto sedute con la nuova progressione non si torna indietro');
}
{
  const { w, c } = world({ rir: 2, load: 60 });
  ok(c.api.advice(c.api.context()).modelId === 'volume_ramp', '6a. fermo ma fresco: serie che salgono');
  const cur = world({ rir: 0, currentWeek: 2, logsUpTo: 3 });
  ok(cur.c.api.context().startAfter === 3, '6b. se ha già fatto sedute della settimana dopo, la nuova progressione parte dopo quelle');
}
{
  const { w, c } = world({ rir: 0 });
  w.DATA.weeks[2].phase = 'deload'; w.DATA.weeks[2].label = 'Settimana 3 · Scarico';
  ok(c.api.context().templateWeek === 2, '7a. se la settimana da cui si parte è di scarico, si riparte da quella prima: lo scarico non è il lavoro normale');
}
{
  const ath = world({ rir: 0, coach: true });
  ok(ath.c.api.context() === null && ath.c.api.maybe(true) === false && ath.c.api.card() === '', '7b. il programma di un coach non si cambia da qui: chi lo segue non vede la proposta');
  const short = world({ rir: 0, currentWeek: 9, logsUpTo: 9 });
  ok(short.c.api.advice(short.c.api.context()) === null, '7c. quasi alla fine del programma non propone');
  const hy = world({ rir: 0 }); hy.w.DATA.source = 'hyrox_v1';
  ok(hy.c.api.context() === null, '7d. i programmi di HYROX e delle discipline hanno il loro schema: niente proposta');
  const sub = world({ rir: 0 });
  Object.keys(sub.w.store.data).filter((k) => /_e0_/.test(k)).forEach((k) => { const m = /^(w\d+_d\d+_e0)/.exec(k); sub.w.store.subs[m[1]] = 'Altro esercizio'; });
  const hist = sub.c.api.advice(sub.c.api.context());
  ok(hist === null || !hist.exercises.some((e) => /Panca/.test(e.name)), '7e. un esercizio sostituito non entra nel confronto: non è lo stesso movimento');
}
{
  // the page wires it in: loaded after the models, asked after the deload question, shown on the stats page
  ok(/<script src="progression-models\.js"><\/script>\s*<script src="progression-advisor\.js"><\/script>/.test(html), '8a. il modulo è caricato dopo le progressioni');
  ok(/maybeSuggestDeloadWeek\(\)\) return;\s*if \(typeof maybeSuggestProgressionChange === 'function'\) maybeSuggestProgressionChange\(false\)/.test(html), '8b. alla fine di una seduta prima si chiede dello scarico, poi (solo se non c’era) della progressione');
  ok(/renderProgressionAdviceCardHtml\(\)/.test(html) && /progression-advisor\.js/.test(fs.readFileSync(path.join(root, 'sync_web_assets.mjs'), 'utf8')) && /progression-advisor\.js/.test(fs.readFileSync(path.join(root, 'web/sw.js'), 'utf8')), '8c. scheda nelle statistiche, file copiato nell’app e tra quelli in cache');
}

console.log('\nTutti i controlli sulla proposta di progressione passano (' + n + ').');
