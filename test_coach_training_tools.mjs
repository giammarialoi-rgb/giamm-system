// The Coach AI reads the person's training log - loads and repetitions of every
// set, volume per muscle, records, body weight - through tools, as the
// Statistics page does. Without them it answered that it could not see the loads.
import fs from 'node:fs';
import { cleanTrainingData, trainingDigest, trainingTools, estimate1RM } from './server/coach-ai/training-tools.mjs';

let failed = 0;
function ok(message, value) {
  if (value) console.log('OK  ', message);
  else { failed += 1; console.log('FAIL', message); }
}

// what the app sends
const raw = {
  unit: 'kg', date: '2026-10-03',
  sessions: [
    { d: '2026-09-10', w: 1, day: 0, n: 'Giorno 1 - Upper', min: 58, t: 6200, s: 16, m: { PETTO: 8, DORSO: 8 }, l: [
      { n: 'Panca piana bilanciere', s: [[80, 8], [80, 8], [80, 7]], wu: [[40, 10]] },
      { n: 'Rematore bilanciere', s: [[70, 8], [70, 8]], wu: [] },
      { n: 'Corsa', c: 20 }
    ] },
    { d: '2026-09-17', w: 2, day: 0, n: 'Giorno 1 - Upper', min: 61, t: 6900, s: 16, m: { PETTO: 9, DORSO: 7 }, l: [
      { n: 'Panca piana bilanciere', s: [[82.5, 8], [82.5, 8], [82.5, 6]], wu: [] },
      { n: 'Rematore bilanciere', s: [[72.5, 8], [72.5, 8]], wu: [] }
    ] },
    { d: '2026-09-24', w: 3, day: 1, n: 'Giorno 2 - Lower', min: 70, t: 9100, s: 18, m: { GAMBE: 14 }, l: [
      { n: 'Squat bilanciere', s: [[100, 5], [100, 5], [100, 5]], wu: [[60, 8]] }
    ] },
    { d: '2026-10-01', w: 4, day: 0, n: 'Giorno 1 - Upper', min: 60, t: 7300, s: 16, m: { PETTO: 10, DORSO: 6 }, l: [
      { n: 'Panca piana bilanciere', s: [[85, 8], [85, 8], [85, 7]], wu: [] }
    ] }
  ],
  bodyWeight: [{ d: '2026-09-10', kg: 82.4 }, { d: '2026-10-01', kg: 81.9 }],
  today: { n: 'Giorno 2 - Lower', l: [{ n: 'Squat bilanciere', s: [[102.5, 5]], wu: [] }] }
};

const data = cleanTrainingData(raw);
ok('the history is read', data && data.sessions.length === 4 && data.bodyWeight.length === 2);
ok('sessions come in date order, each with its sets as load and repetitions', data.sessions[0].date === '2026-09-10' && data.sessions[3].lines[0].sets[0][0] === 85);
ok('the session still open is kept apart', data.today && data.today.lines[0].name === 'Squat bilanciere');

// bounded and safe
const hostile = cleanTrainingData({ sessions: [null, 5, { d: 'not a date' }, { d: '2026-01-01', l: [{ n: 'x', s: [['a', 'b'], 7, [1e9, 3]] }] }], bodyWeight: [{ d: '2026-01-01', kg: 9999 }, { d: 'x', kg: 80 }] });
ok('odd entries are dropped, not trusted', hostile.sessions.length === 1 && hostile.bodyWeight.length === 0);
ok('nothing from a missing history', cleanTrainingData(null) === null && cleanTrainingData('x') === null);
ok('the history is capped', cleanTrainingData({ sessions: Array.from({ length: 900 }, (_, i) => ({ d: '2026-01-' + String((i % 28) + 1).padStart(2, '0') })) }).sessions.length <= 400);

ok('the one-repetition estimate follows Epley', estimate1RM(100, 5) === 116.7 && estimate1RM(100, 1) === 100 && estimate1RM(0, 5) === 0);

const digest = trainingDigest(data);
ok('the digest says how many sessions, the last one and today', /Sedute registrate: 4/.test(digest) && /Ultima seduta \(2026-10-01/.test(digest) && /Seduta di oggi/.test(digest));
ok('an empty history is said, not invented', /Nessuna seduta/.test(trainingDigest(cleanTrainingData({ sessions: [] }))));

const tools = trainingTools(data);
const names = tools.declarations.map((d) => d.name);
ok('six tools are offered', names.length === 6 && ['get_sessions', 'get_exercise_history', 'get_personal_records', 'get_muscle_volume', 'get_stats_summary', 'get_bodyweight'].every((n) => names.includes(n)));
ok('every tool has a description and parameters the model can read', tools.declarations.every((d) => d.description.length > 30 && d.parameters && d.parameters.type === 'OBJECT'));

const hist = tools.call('get_exercise_history', { exercise: 'panca' });
ok('an exercise is found by part of its name, with the real loads', hist.found && hist.sessions.length === 3 && hist.sessions[0].sets[0] === '80×8' && hist.sessions[2].top_set === '85×8');
ok('the trend is computed from the first to the last session', hist.trend.from === '2026-09-10' && hist.trend.to === '2026-10-01' && hist.trend.est_1rm_change > 0);
ok('an unknown exercise lists the ones that exist', tools.call('get_exercise_history', { exercise: 'xyz' }).known_exercises.includes('Squat bilanciere'));

const sess = tools.call('get_sessions', { last: 2, detail: true });
ok('the latest sessions come first, with the sets when asked', sess.sessions.length === 2 && sess.sessions[0].date === '2026-10-01' && sess.sessions[0].exercises[0].sets[0] === '85×8');
ok('sessions can be filtered by exercise', tools.call('get_sessions', { exercise: 'squat' }).sessions.length === 1);
ok('cardio shows as minutes, not as a lift', tools.call('get_sessions', { detail: true, days: 40 }).sessions.some((s) => s.exercises.some((e) => e.cardio_minutes === 20)));

const prs = tools.call('get_personal_records', {});
const bench = prs.records.find((r) => r.exercise === 'Panca piana bilanciere');
ok('records: the heaviest set and the best estimate, with their dates', bench.heaviest.load === 85 && bench.best_1rm.date === '2026-10-01' && prs.records.length === 3);

const vol = tools.call('get_muscle_volume', { weeks: 8 });
ok('muscle volume is grouped by week', vol.weeks.length === 4 && vol.weeks.every((w) => w.week_start && w.sets_by_muscle));
ok('a single group can be asked for', tools.call('get_muscle_volume', { weeks: 8, group: 'gambe' }).weeks.every((w) => Object.keys(w.sets_by_muscle).every((k) => k === 'GAMBE')));

const sum = tools.call('get_stats_summary', { days: 28 });
ok('the summary counts sessions, sets and volume of the period', sum.sessions === 4 && sum.sets === 66 && sum.volume === 29500 && sum.most_done[0].exercise === 'Panca piana bilanciere');
const bw = tools.call('get_bodyweight', {});
ok('body weight with its change', bw.measures.length === 2 && bw.change === -0.5);
ok('an unknown tool says so', /sconosciuto/.test(tools.call('nope', {}).error));

const empty = trainingTools(cleanTrainingData({ sessions: [] }));
ok('with no sessions the tools say there is nothing, they do not invent', empty.call('get_exercise_history', { exercise: 'panca' }).available === false && empty.call('get_stats_summary', {}).available === false);

// the wiring
const api = fs.readFileSync('coach-api.mjs', 'utf8').replace(/\r\n/g, '\n');
ok('the chat route reads the history and offers the tools', /cleanTrainingData\(req\.body\?\.context && req\.body\.context\.trainingData\)/.test(api) && /generateWithTrainingTools\(ai/.test(api));
ok('the history is not pasted into the prompt as JSON', /delete out\.trainingData;/.test(api));
ok('the model is told never to say it cannot see the loads', /NON DIRE MAI che non vedi i carichi/.test(api));
ok('a coach\'s client still has no AI', /AI_NOT_FOR_CLIENTS/.test(api) && /trainingTooling && !athleteLocked/.test(api));
ok('the tool loop stops after a few rounds and then asks for the answer', /round < 6/.test(api) && /Rispondi ora con i dati che hai raccolto/.test(api));
const app = fs.readFileSync('web/index.base.html', 'utf8').replace(/\r\n/g, '\n');
ok('the app sends the history with the chat and the quick insights', (app.match(/trainingData: /g) || []).length >= 2 && /function buildTrainingDataForCoach\(\)/.test(app));
ok('the history carries no photos or notes', !/notes|photo|dataUrl/.test(app.slice(app.indexOf('function buildTrainingDataForCoach'), app.indexOf('function buildPerformanceSummaryForCoach'))));

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nCoach AI e dati di allenamento: tutto verde');
