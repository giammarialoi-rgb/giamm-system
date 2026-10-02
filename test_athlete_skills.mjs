// Pull-ups, dips and the Olympic lifts are asked, not assumed from the level:
// an advanced lifter who does three pull-ups, or would rather not do them,
// gets a lat machine instead. Run over the real builder and catalogue.
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
function load() {
  const ctx = { console };
  ctx.self = ctx;
  vm.createContext(ctx);
  for (const f of ['web/exercise-taxonomy.js', 'web/program-builder.js', 'web/program-catalog.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
  return ctx;
}
const ctx = load();
const TAX = ctx.NURVAN_EXERCISE_TAXONOMY;
const B = ctx.NurvanProgramBuilder;
const PULL = TAX.SKILL_EXERCISES.pullups, DIPS = TAX.SKILL_EXERCISES.dips, OLY = TAX.SKILL_EXERCISES.olympic;
const names = (sessions) => sessions.flatMap((s) => s.exercises.flatMap((e) => [e.name].concat(e.alts || [])));
const grid = (fn) => {
  for (const days of [3, 4, 5, 6]) for (const split of ['fullbody', 'monofrequency', 'upper_lower']) for (const goal of ['ipertrofia', 'forza', 'powerbuilding'])
    for (const experience of ['intermedio', 'avanzato']) for (const variant of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) fn({ days, split, goal, experience, variant, audience: 'unisex' });
};
function count(equipment, skills, list) {
  let hits = 0; let programs = 0; let shortest = 99; let pullWork = 0;
  grid((p) => {
    const sessions = B.buildTemplateSessions(Object.assign({ equipment, skills }, p));
    programs++;
    if (names(sessions).some((n) => list.includes(n))) hits++;
    sessions.forEach((s) => { shortest = Math.min(shortest, s.exercises.length); });
    if (names(sessions).some((n) => /lat machine|pulldown|rematore|row|pull/i.test(n))) pullWork++;
  });
  return { hits, programs, shortest, pullWork };
}

ok('0. i gruppi sono nella libreria esercizi', PULL.every((n) => TAX.EXERCISES.some((e) => e.name === n)) && DIPS.concat(OLY).every((n) => TAX.EXERCISES.some((e) => e.name === n)));

const base = count('palestra', null, PULL);
ok('1a. senza risposta le schede in palestra usano anche le trazioni (' + base.hits + ' su ' + base.programs + ')', base.hits > 50);
for (const v of ['never', '0-5', 'avoid']) {
  const r = count('palestra', { pullups: v }, PULL);
  ok('1b. trazioni "' + v + '": nessuna scheda le contiene, nemmeno tra i cambi delle settimane dopo', r.hits === 0 && r.programs === base.programs);
  ok('1c. e il lavoro di tirata resta (lat machine, pulldown, rematori), con sedute non più corte', r.pullWork === r.programs && r.shortest >= base.shortest);
}
ok('1d. "da 5 a 10": le trazioni restano, il muscle-up no', count('palestra', { pullups: '5-10' }, ['Trazioni presa prona', 'Trazioni presa supina', 'Trazioni presa neutra']).hits > 50 && count('palestra', { pullups: '5-10' }, ['Muscle-up']).hits === 0);
ok('1e. "più di 10": tutto come senza risposta', count('palestra', { pullups: '10+' }, PULL).hits === base.hits);

const dipBase = count('palestra', null, DIPS);
ok('2. dip: fuori con "0-5" o "preferisco evitarle", dentro con "5-10"', dipBase.hits > 10 && count('palestra', { dips: '0-5' }, DIPS).hits === 0 && count('palestra', { dips: 'avoid' }, DIPS).hits === 0 && count('palestra', { dips: '5-10' }, DIPS).hits === dipBase.hits);

const olyBase = count('palestra', null, OLY);
ok('3. slancio e strappo: solo con una buona tecnica', olyBase.hits > 5 && count('palestra', { olympic: 'learning' }, OLY).hits === 0 && count('palestra', { olympic: 'never' }, OLY).hits === 0 && count('palestra', { olympic: 'avoid' }, OLY).hits === 0 && count('palestra', { olympic: 'good' }, OLY).hits === olyBase.hits);

ok('4. una risposta non tocca gli altri esercizi', (() => {
  const a = B.buildTemplateSessions({ days: 4, split: 'upper_lower', goal: 'ipertrofia', equipment: 'palestra', experience: 'avanzato', audience: 'unisex', variant: 'a', skills: { olympic: 'never' } });
  const b = B.buildTemplateSessions({ days: 4, split: 'upper_lower', goal: 'ipertrofia', equipment: 'palestra', experience: 'avanzato', audience: 'unisex', variant: 'a' });
  return JSON.stringify(a) === JSON.stringify(b);
})());
{
  // Bar and bodyweight only: there is no lat machine to fall back on.
  const r = count('bodyweight', { pullups: 'avoid' }, PULL);
  ok('5. a corpo libero con la sbarra, senza alternative, la seduta non resta vuota', r.shortest >= 4);
}
{
  // The ready-made programs follow what the app says about the athlete.
  const c = load();
  const id = 'sci2-4-upper_lower-ipertrofia-palestra-avanzato-unisex-8-linear-a';
  let withPull = null;
  for (const v of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
    const tryId = id.replace(/-a$/, '-' + v);
    if (names(c.NurvanProgramCatalog.bodyFor(tryId).weeks[0].sessions).some((n) => PULL.includes(n))) { withPull = tryId; break; }
  }
  c.nurvanAthleteSkills = () => ({ pullups: 'avoid' });
  ok('6. anche le schede del database: la stessa scheda, senza trazioni per chi le evita', !!withPull && !names(c.NurvanProgramCatalog.bodyFor(withPull).weeks[0].sessions).some((n) => PULL.includes(n)));
}
{
  const html = fs.readFileSync('web/index.base.html', 'utf8');
  const cpu = fs.readFileSync('web/coach-practice-ui.js', 'utf8');
  ok('7a. le domande sono nel profilo e vengono salvate', /id="' \+ id \+ '"|profile-skill-pullups/.test(html) && /skills: \$\('profile-skill-pullups'\)/.test(html) && /window\.nurvanAthleteSkills = currentAthleteSkills/.test(html));
  ok('7b. e nel questionario del cliente, che il server accetta', /key: 'skillPullups'/.test(cpu) && /key: 'skillDips'/.test(cpu) && /key: 'skillOlympic'/.test(cpu) && /"skillPullups", "skillDips", "skillOlympic"/.test(fs.readFileSync('coach-practice.mjs', 'utf8')));
  const c = { store: {}, window: {}, esc: (s) => s, trText: (s) => s };
  vm.createContext(c);
  const src = html.replace(/\r\n/g, '\n');
  vm.runInContext(src.slice(src.indexOf('var ATHLETE_SKILL_REPS = '), src.indexOf('function saveAthleteProfile() {')) + '\nthis.cur = currentAthleteSkills; this.from = athleteSkillsFromIntake;', c);
  ok('7c. le risposte del questionario diventano quelle che legge il generatore', JSON.stringify(c.from({ skillPullups: 'Da 0 a 5', skillDips: 'Preferisco evitarle', skillOlympic: 'Ho una buona tecnica' })) === JSON.stringify({ pullups: '0-5', dips: 'avoid', olympic: 'good' }) && c.from({}) === null);
  c.store = { profile: { skills: { pullups: '10+' } }, coachAssigning: { clientId: 1 }, coachWorkspace: { intake: { skillPullups: 'Mai provate' } } };
  ok('7d. quando il coach scrive per un cliente valgono le risposte del cliente, non le sue', c.cur().pullups === 'never');
  c.store = { profile: { skills: { pullups: '10+' } } };
  ok('7e. altrimenti quelle del proprio profilo', c.cur().pullups === '10+');
}

console.log('');
if (failed) { console.log(failed + ' controlli degli esercizi tecnici falliti.'); process.exit(1); }
console.log('Tutti i controlli degli esercizi tecnici passano.');
