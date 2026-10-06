// The coach's own questionnaire for new clients: what is stored, what a client's answers become, what is required.
import { sanitizeIntakeConfig, sanitizeCustomAnswers, requiredKeys, emptyIntakeConfig } from './server/coach-os/settings.mjs';

let failed = 0;
const ok = (m, v) => { if (v) console.log('OK   ' + m); else { failed++; console.log('FAIL ' + m); } };
const KEYS = ['firstName', 'lastName', 'sex', 'goal', 'jobType', 'stress', 'splitPref'];
const SELECTS = KEYS.filter((k) => k !== 'firstName' && k !== 'lastName');
const REQUIRED = ['firstName', 'lastName', 'sex', 'goal', 'jobType', 'stress'];

const cfg = sanitizeIntakeConfig({
  hidden: ['jobType', 'nope', 'jobType'],
  overrides: { goal: { label: ' Cosa vuoi ottenere? ', options: ['A', 'B', 'a'] }, stress: { required: false }, sex: { options: ['solo'] }, firstName: { options: ['x', 'y'], label: 'Come ti chiami?' } },
  custom: [
    { id: 'Ab c!', label: 'Domanda libera', type: 'text', required: true },
    { id: 'zona', label: 'Dove?', type: 'choice', options: ['Casa', 'Parco', 'casa'], required: true },
    { id: 'zona', label: 'Doppia', type: 'text' },
    { label: 'Una sola scelta', type: 'multi', options: ['x'] },
    { label: '   ', type: 'text' },
    { label: 'Tipo strano', type: 'script' }
  ]
}, KEYS, SELECTS);
ok('1a. only the fixed questions that exist can be hidden, once', cfg.hidden.join() === 'jobType');
ok('1b. the text of an override is cleaned, its choices are the coach\'s (no repeats)', cfg.overrides.goal.label === 'Cosa vuoi ottenere?' && cfg.overrides.goal.options.join() === 'A,B');
ok('1c. choices with fewer than two answers are ignored; a name has no choices', !cfg.overrides.sex && !cfg.overrides.firstName.options && cfg.overrides.firstName.label === 'Come ti chiami?');
ok('1d. required can be turned off', cfg.overrides.stress.required === false);
ok('1e. the coach\'s own questions: text, one choice, the ids made safe and unique', cfg.custom.length === 4 && cfg.custom[0].id === 'abc' && cfg.custom[1].id === 'zona' && cfg.custom[2].id !== 'zona');
ok('1f. a choice question keeps its answers once', cfg.custom[1].options.join() === 'Casa,Parco');
ok('1g. a question of an unknown type is an open one', cfg.custom[3].type === 'text');
ok('1h. nothing in = nothing changed', JSON.stringify(sanitizeIntakeConfig(null, KEYS, SELECTS)) === JSON.stringify(emptyIntakeConfig()));

const req = requiredKeys(REQUIRED, KEYS, { hidden: ['jobType'], overrides: { stress: { required: false }, splitPref: { required: true } }, custom: [] });
ok('2a. hidden questions are not required, relaxed ones neither, new required ones are', req.join() === 'firstName,lastName,sex,goal,splitPref');
ok('2b. without a configuration the app\'s own list is required', requiredKeys(REQUIRED, KEYS, null).join() === REQUIRED.join());

const config = { custom: [
  { id: 'a', label: 'Libera', type: 'text', options: undefined },
  { id: 'b', label: 'Dove?', type: 'choice', options: ['Casa', 'Parco'] },
  { id: 'c', label: 'Giorni', type: 'multi', options: ['Lun', 'Mar', 'Mer'] }
] };
const ans = sanitizeCustomAnswers({ a: '  no,   mai ', b: 'Piscina', c: ['Lun', 'Gio', 'Lun'], ghost: 'x' }, config);
ok('3a. an open answer is cleaned', ans.find((e) => e.id === 'a').answer === 'no, mai');
ok('3b. a choice outside the choices is not an answer', !ans.find((e) => e.id === 'b'));
ok('3c. several choices keep the real ones once', ans.find((e) => e.id === 'c').answer.join() === 'Lun');
ok('3d. an answer to a question that is not there is dropped; the question\'s text travels with the answer', !ans.find((e) => e.id === 'ghost') && ans[0].label === 'Libera');
const stored = sanitizeCustomAnswers([{ id: 'a', label: 'Libera', type: 'text', answer: 'ok' }, { id: '', label: 'x' }], null);
ok('3e. an answer already stored is kept as it is (even if the question changed later)', stored.length === 1 && stored[0].answer === 'ok');
ok('3f. no answers = none', sanitizeCustomAnswers(null, config).length === 0);

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nQuestionario del coach: tutto in regola.');
