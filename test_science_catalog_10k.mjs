// Runs the real catalogue generator (web/exercise-taxonomy.js,
// web/program-builder.js, web/program-catalog.js) over every combination it
// can produce and checks what comes out, plus the descriptor the app reads.
//
// The catalogue used to be 101_250 rows and 3_375 templates shipped as 60 MB
// of JSON, built from twelve hand-written lists that between them used 91 of
// the library's 215 exercises. Now it is a grid the app builds from, so what
// needs guarding is different: that every combination still produces a sound
// session, that nothing outside the library gets in, and that the library is
// actually used.
import fs from 'fs';
import { expandScienceProgramWeeks, rankCatalogPrograms, parseCatalogQuery } from './science-program-engine.mjs';
import { loadCatalogModules } from './generate_science_programs_10k.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
function ok(cond, msg) {
  assert(cond, msg);
  console.log('OK  ', msg);
}

const { taxonomy, catalog } = loadCatalogModules();
const idx = JSON.parse(fs.readFileSync('web/program-catalog-index.json', 'utf8'));
const body = JSON.parse(fs.readFileSync('web/program-catalog-body.json', 'utf8'));

// --- the descriptor the phone downloads -----------------------------------
ok(idx.version === 5 && idx.science_v2, 'the catalogue ships as a descriptor');
ok(Array.isArray(idx.programs) && idx.programs.length === 0, 'no program rows are shipped: the app builds them');
ok(Object.keys(body).length === 0, 'no templates are shipped either');
ok(fs.statSync('web/program-catalog-index.json').size < 5 * 1024,
  'the descriptor is under 5 KB (it used to be 48 MB of rows plus 12 MB of templates)');
ok(idx.science_v2.count === catalog.total() && catalog.total() === 810000,
  'it describes ' + catalog.total().toLocaleString('it-IT') + ' programs');

// --- the grid --------------------------------------------------------------
{
  const dims = idx.science_v2.coverage;
  ok(dims.days.length === 5 && dims.splits.length === 3 && dims.goals.length === 5
    && dims.equipment.length === 5 && dims.experience.length === 3 && dims.audience.length === 3
    && dims.durations.length === 6 && dims.progressions.length === 5 && dims.variants.length === 8,
    'every training variable is covered, with 8 exercise selections each');
  const p = { days: 4, split: 'upper_lower', goal: 'ipertrofia', equipment: 'casa', experience: 'intermedio', audience: 'female', duration: 8, progression: 'linear', variant: 'c' };
  const id = catalog.idFor(p);
  ok(JSON.stringify(catalog.parseId(id)) === JSON.stringify(p), 'an id says exactly which program it is, and reads back');
  ok(catalog.parseId('sci_000123') === null && catalog.parseId('sci2-9-nope-x-y-z-w-1-2-3') === null,
    'an id from the old catalogue, or a made-up one, resolves to nothing rather than to a random program');
  const one = catalog.search(p, 50);
  ok(one.rows.length === 1 && one.total === 1 && one.rows[0].id === id, 'a fully specified request has exactly one answer');
  const some = catalog.search({ days: 4, equipment: 'casa' }, 30);
  ok(some.rows.length === 30 && some.rows.every((r) => r.days_per_week === 4 && r.equipment === 'casa'),
    'a partial request is answered from the matching part of the grid only');
  ok(some.total === 3 * 5 * 3 * 3 * 6 * 5 * 8, 'and knows how many there are without building them');
}

// --- free text still understood --------------------------------------------
{
  const parsed = parseCatalogQuery('4 giorni upper lower ipertrofia donna casa');
  ok(parsed.days === 4 && parsed.split === 'upper_lower' && parsed.goal === 'ipertrofia' && parsed.audience === 'female',
    'free text is still read into filters');
  const rows = catalog.search({ days: parsed.days, split: parsed.split, goal: parsed.goal, audience: parsed.audience, equipment: 'casa' }, 10).rows;
  const ranked = rankCatalogPrograms(rows, { days: 4, split: 'upper_lower', goal: 'ipertrofia', audience: 'female' });
  ok(ranked.length === rows.length, 'and the rows built from it pass the app\'s own ranking');
}

// --- every combination produces a sound session ----------------------------
{
  const byName = {};
  taxonomy.EXERCISES.forEach((e) => { byName[e.name] = e; });
  const used = new Set();
  let sessions = 0;
  let firstNotCompound = 0;
  let minEx = 99, maxEx = 0;

  for (const days of catalog.DAYS) {
    for (const split of catalog.SPLITS) {
      for (const goal of catalog.GOALS) {
        for (const equipment of catalog.EQUIPMENT) {
          const allowed = taxonomy.EQUIPMENT_SETS[equipment];
          for (const experience of catalog.EXPERIENCE) {
            const cap = taxonomy.LEVEL_CAP[experience];
            for (const audience of catalog.AUDIENCE) {
              for (const variant of catalog.VARIANTS) {
                const b = catalog.bodyFor({ days, split, goal, equipment, experience, audience: audience.id, duration: 8, progression: 'linear', variant });
                const where = [days + 'gg', split, goal, equipment, experience, audience.id, variant].join('/');
                assert(b.weeks[0].sessions.length === days, 'sessions per week in ' + where);
                b.weeks[0].sessions.forEach((s) => {
                  sessions += 1;
                  const names = s.exercises.map((e) => e.name);
                  assert(new Set(names).size === names.length, 'a session repeats an exercise in ' + where + ' / ' + s.name);
                  assert(names.length >= 4 && names.length <= 7, 'session length ' + names.length + ' in ' + where + ' / ' + s.name);
                  minEx = Math.min(minEx, names.length); maxEx = Math.max(maxEx, names.length);
                  if (s.exercises[0].role !== 'compound') firstNotCompound += 1;
                  assert(s.exercises.some((e) => e.progressed), 'no lift to progress on in ' + where + ' / ' + s.name);
                  s.exercises.forEach((e) => {
                    const info = byName[e.name];
                    assert(info, 'exercise outside the library: ' + e.name + ' in ' + where);
                    assert(allowed.includes(info.equip) || (info.also || []).some((x) => allowed.includes(x)),
                      e.name + ' needs equipment the person does not have in ' + where);
                    assert(info.level <= cap, e.name + ' is too advanced for ' + experience + ' in ' + where);
                    assert(e.sets_count >= 1 && e.sets_count <= 5, 'sets out of range in ' + where);
                    used.add(e.name);
                    (e.alts || []).forEach((n) => {
                      assert(byName[n], 'alternate outside the library: ' + n);
                      assert(n !== e.name && !names.includes(n), 'alternate repeats an exercise of the session in ' + where);
                      used.add(n);
                    });
                    assert(!(e.progressed && e.alts), 'the lift a program progresses on must not rotate: ' + e.name + ' in ' + where);
                  });
                });
              }
            }
          }
        }
      }
    }
  }

  ok(sessions > 100000, sessions.toLocaleString('it-IT') + ' sessions checked: no repeats, ' + minEx + '-' + maxEx + ' exercises each');
  ok(firstNotCompound === 0, 'every session opens on a multi-joint exercise');
  const never = taxonomy.EXERCISES.filter((e) => !used.has(e.name)).map((e) => e.name);
  ok(never.length === 0, 'all ' + taxonomy.EXERCISES.length + ' library exercises are used somewhere (' + (never.join(', ') || 'none left out') + ')');
  ok(used.size === taxonomy.EXERCISES.length, 'and nothing outside the library is ever used');
}

// --- a program over time ----------------------------------------------------
{
  const b = catalog.bodyFor('sci2-4-upper_lower-ipertrofia-palestra-intermedio-unisex-12-block-c');
  const weeks = expandScienceProgramWeeks(b);
  ok(weeks.length === 12, 'a 12-week program expands to 12 weeks');
  const first = b.weeks[0].sessions[0].exercises;
  const main = first.find((e) => e.progressed);
  const rotating = first.find((e) => e.alts && e.alts.length);
  ok(!main.alts, 'the lift the program progresses on does not rotate');
  const nameInWeek = (w, i) => weeks[w - 1].sessions[0].exercises[i].name;
  const mainIdx = first.indexOf(main);
  const rotIdx = first.indexOf(rotating);
  ok([1, 4, 5, 9, 12].every((w) => nameInWeek(w, mainIdx) === main.name), 'it is the same lift from week 1 to week 12');
  ok(nameInWeek(1, rotIdx) === rotating.name && nameInWeek(4, rotIdx) === rotating.name,
    'an accessory stays put inside its block, deload week included');
  ok(nameInWeek(5, rotIdx) === rotating.alts[0] && nameInWeek(9, rotIdx) === (rotating.alts[1] || rotating.alts[0]),
    'and changes when the next block starts');
  const deload = weeks[3];
  ok(deload.phase === 'deload' && deload.sessions[0].exercises[0].sets_count < first[0].sets_count,
    'the deload week still drops the volume');
}

console.log('\nPASS science catalog:', catalog.total().toLocaleString('it-IT'), 'programs from', taxonomy.EXERCISES.length, 'exercises');
