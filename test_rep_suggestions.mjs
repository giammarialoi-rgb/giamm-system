// Adding or swapping in an exercise starts it with a number or a range of
// repetitions that fits it - and the person can always write their own.
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) console.log('OK  ', message);
  else { failed += 1; console.log('FAIL', message); }
}

const ctx = vm.createContext({ self: {}, console });
vm.runInContext(fs.readFileSync('web/exercise-taxonomy.js', 'utf8'), ctx);
const T = ctx.self.NURVAN_EXERCISE_TAXONOMY;
const sug = (n, m) => T.suggestPrescription(n, m).reps;

ok('the taxonomy offers a suggestion', typeof T.suggestPrescription === 'function');
ok('squat and deadlift: heavy, few', sug('Squat bilanciere') === '5-8' && sug('Stacco da terra') === '5-8');
ok('a bench or a row: 6 to 10', sug('Panca piana bilanciere') === '6-10');
ok('calves and abs: higher', sug('Calf raise in piedi') === '12-15' && sug('Plank') === '12-20');
ok('an isolation exercise: 10 to 15 or more', ['10-15', '12-15'].includes(sug('Curl manubri')));
ok('a name from the library alias is placed like the exercise it stands for', sug('Squat con Bilanciere') === '5-8');

// Names the table does not know are placed by what they say, never left empty
ok('an unknown squat variant is placed by its name', sug('Squat zercher') === '5-8');
ok('an unknown curl is an isolation', sug('Curl al cavo rovesciato') === '10-15');
ok('an unknown name falls back on the muscle', sug('Esercizio mio', 'ADDOME') === '12-20' && sug('Esercizio mio', 'GAMBE') === '8-12');
ok('with nothing to go on it is still a number', /^\d+(-\d+)?$/.test(sug('???')) && /^\d+(-\d+)?$/.test(sug('')));

// Every exercise the table knows gets a plausible range, and never the same for all
const all = T.EXERCISES.map((e) => sug(e.name));
ok('every known exercise has a number or a range', all.every((r) => /^\d+(-\d+)?$/.test(r)));
ok('the suggestions are not all the same', new Set(all).size >= 4);

// The app: where an exercise is added or swapped in, the suggestion is written
// into a box the person can edit.
const app = fs.readFileSync('web/index.base.html', 'utf8').replace(/\r\n/g, '\n');
const between = (from, to) => app.slice(app.indexOf(from), app.indexOf(to, app.indexOf(from)));
const sheet = between('function openAddToProgramConfig(', 'function confirmAddExerciseToProgram(');
ok('the add-to-program sheet starts from the suggestion, in an editable box', /value="' \+ esc\(sugg\.reps\) \+ '"/.test(sheet) && /id="atp-reps" type="text"/.test(sheet));
ok('the add-to-program sheet offers quick values', /repsQuickPicksHtml\('atp-reps'/.test(sheet));
ok('the library "AGGIUNGI" goes through that sheet', /openAddToProgramConfig\(name, muscle, \{ scope: 'week' \}\)/.test(between('function addExerciseFromDb(', 'window.addExerciseFromDb')));
ok('the program builder starts a new exercise from the suggestion', /reps: suggestedReps\(name, muscle\)\.reps, rest: '90s'/.test(app));
ok('swapping an exercise in the workout offers reps too', /id="replace-reps"/.test(app) && /applyReplacementReps\(replacementDraft\.idx, scope\)/.test(app));
ok('an empty reps box keeps the previous reps', /const reps = \(block && block\.style\.display !== 'none' && input\) \? String\(input\.value \|\| ''\)\.trim\(\) : '';\n  if \(!reps/.test(app));
ok('swapping in the review sheet starts from the suggestion', /var sg = suggestedReps\(name, ''\);/.test(app));

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nRipetizioni consigliate: tutto verde');
