// Core work at least twice a week in every ready-made program: the weights
// catalogue (every week of it, after the accessories rotate), the HYROX
// preparations and the home disciplines. 86% of the weights catalogue used to
// have none at all: the only core slot was the last of the full body recipe,
// and the cap on session length cut it off.
import fs from 'node:fs';
import vm from 'node:vm';
import { expandScienceProgramWeeks } from './science-program-engine.mjs';
import { loadCatalogModules } from './generate_science_programs_10k.mjs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

const { taxonomy, catalog } = loadCatalogModules();
const CORE = new Set(taxonomy.EXERCISES.filter((e) => e.pattern === 'core').map((e) => e.name));
const coreSessions = (sessions) => sessions.filter((s) => s.exercises.some((e) => CORE.has(e.name))).length;
const id = (days, split, goal, equipment, experience, audience, variant, weeks, prog) =>
  ['sci2', days, split, goal, equipment, experience, audience, weeks || 8, prog || 'linear', variant].join('-');

// 1. Every template of the weights catalogue.
{
  let n = 0; let short = 0; let longest = 0; let doubled = 0;
  for (const days of [2, 3, 4, 5, 6]) for (const split of ['fullbody', 'monofrequency', 'upper_lower'])
    for (const goal of ['ipertrofia', 'forza', 'powerbuilding', 'recomp', 'cut'])
      for (const equipment of ['palestra', 'casa', 'minimal', 'kettlebell', 'bodyweight'])
        for (const experience of ['principiante', 'intermedio', 'avanzato'])
          for (const audience of ['unisex', 'female', 'male'])
            for (const variant of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
              const sessions = catalog.bodyFor(id(days, split, goal, equipment, experience, audience, variant)).weeks[0].sessions;
              n++;
              if (coreSessions(sessions) < 2) short++;
              sessions.forEach((s) => {
                longest = Math.max(longest, s.exercises.length);
                const names = s.exercises.map((e) => e.name);
                if (new Set(names).size !== names.length) doubled++;
              });
            }
  ok('1a. pesi: tutti i ' + n + ' modelli hanno il core almeno due volte a settimana', n === 27000 && short === 0);
  ok('1b. le sedute non si allungano di più di un esercizio (la più lunga: ' + longest + ')', longest <= 8);
  ok('1c. nessun esercizio scritto due volte nella stessa seduta', doubled === 0);
}

// 2. And it stays there when the accessories rotate, block after block.
{
  let weeks = 0; let short = 0;
  for (const split of ['fullbody', 'monofrequency', 'upper_lower']) for (const days of [2, 3, 4, 5, 6])
    for (const prog of ['linear', 'double', 'volume_wave', 'dup', 'block']) for (const goal of ['forza', 'cut', 'ipertrofia'])
      for (const equipment of ['palestra', 'bodyweight']) {
        const full = expandScienceProgramWeeks(catalog.bodyFor(id(days, split, goal, equipment, 'intermedio', 'unisex', 'a', 12, prog)));
        for (const w of (full.weeks || full)) { weeks++; if (coreSessions(w.sessions) < 2) short++; }
      }
  ok('2. resta in tutte le settimane, anche dopo la rotazione dei complementari (' + weeks + ' settimane)', weeks > 3000 && short === 0);
}

// 3. HYROX and the home disciplines, every week of every program.
{
  const ctx = { console }; ctx.self = ctx; vm.createContext(ctx);
  for (const f of ['web/exercise-taxonomy.js', 'web/hyrox.js', 'web/disciplines.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
  const RX = /plank|crunch|sit-up|hollow|dead bug|leg raise|knee raise|russian twist|mountain climber|l-sit|hundred|roll up|teaser|criss cross/i;
  const has = (s) => s.exercises.some((e) => RX.test(e.name) || (e.circuit && e.circuit.items.some((it) => RX.test(it.name))));
  const check = (mod, goal) => {
    const rows = mod.catalogSearch({ goal }, 100000).rows;
    let short = 0;
    for (const row of rows) for (const w of mod.catalogBody(row.id).weeks) if (w.sessions.filter(has).length < 2) short++;
    return { n: rows.length, short };
  };
  const hyrox = check(ctx.NurvanHyrox, 'hyrox');
  ok('3a. HYROX: ' + hyrox.n + ' preparazioni, core due volte in ogni settimana', hyrox.n === 1800 && hyrox.short === 0);
  for (const d of ['pilates', 'mobilita', 'calisthenics', 'hiit']) {
    const r = check(ctx.NurvanDisciplines, d);
    ok('3b. ' + d + ': ' + r.n + ' programmi, core due volte in ogni settimana', r.n > 100 && r.short === 0);
  }
  const sim = ctx.NurvanHyrox.catalogBody(ctx.NurvanHyrox.catalogSearch({ goal: 'hyrox' }, 5).rows[0].id).weeks
    .flatMap((w) => w.sessions).filter((s) => /simulazione/i.test(s.name));
  ok('3c. mai aggiunto a una simulazione di gara', sim.length > 0 && sim.every((s) => !has(s)));
}

console.log('');
if (failed) { console.log(failed + ' controlli del core falliti.'); process.exit(1); }
console.log('Tutti i controlli del core passano.');
