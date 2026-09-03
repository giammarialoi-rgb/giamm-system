import fs from 'fs';
import { expandScienceProgramWeeks, rankCatalogPrograms, parseCatalogQuery } from './science-program-engine.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const EXPECTED = 5 * 3 * 5 * 5 * 3 * 3 * 6 * 5; // 101250
const EXPECTED_TPL = 5 * 3 * 5 * 5 * 3 * 3; // 3375

const idx = JSON.parse(fs.readFileSync('web/program-catalog-index.json', 'utf8'));
const body = JSON.parse(fs.readFileSync('web/program-catalog-body.json', 'utf8'));
const programs = idx.programs || [];

assert(programs.length === EXPECTED, 'count ' + programs.length + ' expected ' + EXPECTED);
assert(Object.keys(body).length === EXPECTED_TPL, 'templates ' + Object.keys(body).length);
assert(programs.every((p) => String(p.id).startsWith('sci_')), 'only sci ids');
assert(programs.every((p) => p.body_ref && body[p.body_ref]), 'body_ref ok');
assert(!programs.some((p) => p.preview), 'preview is on-demand');

['female', 'male', 'unisex'].forEach((a) => {
  const n = programs.filter((p) => p.audience === a).length;
  assert(n === EXPECTED / 3, 'audience ' + a + '=' + n);
});

[2, 3, 4, 5, 6].forEach((d) => {
  assert(programs.some((p) => p.days_per_week === d), 'days ' + d);
});
['fullbody', 'monofrequency', 'upper_lower'].forEach((s) => {
  assert(programs.some((p) => p.split === s), 'split ' + s);
});
['ipertrofia', 'forza', 'powerbuilding', 'recomp', 'cut'].forEach((g) => {
  assert(programs.some((p) => p.purpose === g), 'goal ' + g);
});
['palestra', 'casa', 'minimal', 'kettlebell', 'bodyweight'].forEach((e) => {
  assert(programs.some((p) => p.equipment === e), 'eq ' + e);
});
['principiante', 'intermedio', 'avanzato'].forEach((e) => {
  assert(programs.some((p) => p.experience === e), 'exp ' + e);
});
[4, 6, 8, 10, 12, 16].forEach((d) => {
  assert(programs.some((p) => p.duration_weeks === d), 'dur ' + d);
});
['linear', 'double', 'volume_wave', 'dup', 'block'].forEach((m) => {
  assert(programs.some((p) => p.progression_model === m), 'prog ' + m);
});

const parsed = parseCatalogQuery('4 giorni upper lower ipertrofia donna casa');
assert(parsed.days === 4, 'parse days');
assert(parsed.split === 'upper_lower', 'parse split');
assert(parsed.goal === 'ipertrofia', 'parse goal');
assert(parsed.audience === 'female', 'parse audience');

const ranked = rankCatalogPrograms(programs, {
  days: 4, split: 'upper_lower', goal: 'ipertrofia', equipment: 'casa',
  experience: 'intermedio', duration: 8, progression: 'linear', audience: 'female'
});
assert(ranked.length === 1, 'exact combo should be unique, got ' + ranked.length);
assert(ranked[0].audience === 'female', 'female hit');

const sample = ranked[0];
const expanded = expandScienceProgramWeeks({
  ...body[sample.body_ref],
  duration_weeks: sample.duration_weeks,
  progression: { model: sample.progression_model, deload_every: 4 },
  progression_model: sample.progression_model
});
assert(expanded.length === sample.duration_weeks, 'expand weeks');

console.log('PASS science catalog coverage', programs.length, 'templates', EXPECTED_TPL);
