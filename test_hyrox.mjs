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
ok('7b2. il coach la assegna dal menu di assegnazione del cliente', (coachUi.match(/\\'hyrox\\'\)">PREPARAZIONE HYROX/g) || []).length === 2 && /mode === 'hyrox'/.test(coachUi) && /navigate\('hyrox'\)/.test(coachUi));
const sync = fs.readFileSync('sync_web_assets.mjs', 'utf8');
ok('7c. motore e calendario copiati nelle app', /'hyrox\.js'/.test(sync) && /'hyrox-events\.json'/.test(sync));
const api = fs.readFileSync('coach-api.mjs', 'utf8');
ok('7d. il sito ha il calendario e una pagina per gara', /mountHyrox\(app/.test(api) && /app\.get\(base \+ "\/hyrox\/:id", one\)/.test(fs.readFileSync('server/site/hyrox.mjs', 'utf8')));

console.log('');
if (failed) { console.log(failed + ' controlli HYROX falliti.'); process.exit(1); }
console.log('Tutti i controlli HYROX passano.');
