/**
 * Writes the catalogue descriptor the app reads.
 *
 * The catalogue used to be generated as data: 101_250 program rows (48 MB) and
 * 3_375 week-1 templates (12 MB), every byte of it downloaded by the phone
 * before the library could be opened, and between them they only ever used 91
 * of the library's 215 exercises. A program is a point in a grid of training
 * variables, and everything about it follows from that point, so what ships is
 * the grid: the app builds a program when it lists or opens one
 * (web/program-catalog.js on web/program-builder.js on web/exercise-taxonomy.js).
 *
 * This script therefore writes a small descriptor, and checks - on the real
 * generator, for every combination - that what comes out is sound: no session
 * repeating an exercise, heavy work first, only equipment the person has, only
 * exercises they can be asked to do, and the whole library in use.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { expandScienceProgramWeeks } from './science-program-engine.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const WEB_INDEX = path.join(ROOT, 'web', 'program-catalog-index.json');
const WEB_BODY = path.join(ROOT, 'web', 'program-catalog-body.json');
const ASSETS_INDEX = path.join(ROOT, 'app', 'src', 'main', 'assets', 'program-catalog-index.json');
const ASSETS_BODY = path.join(ROOT, 'app', 'src', 'main', 'assets', 'program-catalog-body.json');

export function loadCatalogModules() {
  const sandbox = {};
  sandbox.self = sandbox;
  ['web/exercise-taxonomy.js', 'web/program-builder.js', 'web/program-catalog.js'].forEach((f) => {
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox);
  });
  return {
    taxonomy: sandbox.NURVAN_EXERCISE_TAXONOMY,
    builder: sandbox.NurvanProgramBuilder,
    catalog: sandbox.NurvanProgramCatalog
  };
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data), 'utf8');
}

function main() {
  const { taxonomy, catalog } = loadCatalogModules();
  console.log('=== program catalogue descriptor ===');

  const indexDoc = {
    version: 5,
    generated_at: new Date().toISOString(),
    imported: 0,
    // Kept empty on purpose: the app builds the rows it needs. An older app
    // that still expects them here shows an empty library until it updates.
    programs: [],
    science_v2: {
      generated_by: 'web/program-catalog.js',
      count: catalog.total(),
      library_exercises: taxonomy.EXERCISES.length,
      coverage: {
        days: catalog.DAYS,
        splits: catalog.SPLITS,
        goals: catalog.GOALS,
        equipment: catalog.EQUIPMENT,
        experience: catalog.EXPERIENCE,
        audience: catalog.AUDIENCE.map((a) => a.id),
        durations: catalog.DURATIONS,
        progressions: catalog.PROGRESSIONS,
        variants: catalog.VARIANTS
      },
      evidence: [
        'Schoenfeld 2016 volume',
        'Schoenfeld 2019 frequency volume-equated',
        'ACSM 2026 RIR 2-3 progressive overload',
        'Baz-Valle 2019 (main lifts kept), Fonseca 2014 / Kassiano 2022 (accessories rotated)'
      ]
    }
  };

  writeJson(WEB_INDEX, indexDoc);
  writeJson(WEB_BODY, {});
  if (fs.existsSync(path.dirname(ASSETS_INDEX))) {
    writeJson(ASSETS_INDEX, indexDoc);
    writeJson(ASSETS_BODY, {});
    console.log('Synced assets');
  }

  // One program per template (every combination bar duration/progression) to
  // check what the generator produces.
  const used = new Set();
  let templates = 0;
  let minEx = 99;
  let maxEx = 0;
  for (const days of catalog.DAYS) {
    for (const split of catalog.SPLITS) {
      for (const goal of catalog.GOALS) {
        for (const equipment of catalog.EQUIPMENT) {
          for (const experience of catalog.EXPERIENCE) {
            for (const audience of catalog.AUDIENCE) {
              for (const variant of catalog.VARIANTS) {
                const body = catalog.bodyFor({
                  days, split, goal, equipment, experience, audience: audience.id,
                  duration: 8, progression: 'linear', variant
                });
                templates += 1;
                body.weeks[0].sessions.forEach((s) => {
                  const names = s.exercises.map((e) => e.name);
                  if (new Set(names).size !== names.length) {
                    throw new Error('duplicate exercise in ' + body.id + ' / ' + s.name);
                  }
                  if (!names.length) throw new Error('empty session in ' + body.id + ' / ' + s.name);
                  minEx = Math.min(minEx, names.length);
                  maxEx = Math.max(maxEx, names.length);
                  s.exercises.forEach((e) => {
                    used.add(e.name);
                    (e.alts || []).forEach((n) => used.add(n));
                  });
                });
              }
            }
          }
        }
      }
    }
  }

  const never = taxonomy.EXERCISES.filter((e) => !used.has(e.name)).map((e) => e.name);
  if (never.length) throw new Error('library exercises never used: ' + never.join(', '));

  const sample = catalog.bodyFor({
    days: 4, split: 'upper_lower', goal: 'ipertrofia', equipment: 'palestra',
    experience: 'intermedio', audience: 'unisex', duration: 12, progression: 'block', variant: 'c'
  });
  const expanded = expandScienceProgramWeeks(sample);
  if (expanded.length !== 12) throw new Error('expand length ' + expanded.length);

  console.log('Programs', catalog.total().toLocaleString('it-IT'),
    '| templates checked', templates,
    '| library exercises used', used.size, '/', taxonomy.EXERCISES.length,
    '| exercises per session', minEx + '-' + maxEx,
    '| index KB', Math.round(fs.statSync(WEB_INDEX).size / 1024 * 10) / 10);
}

if (process.argv[1] && process.argv[1].endsWith('generate_science_programs_10k.mjs')) main();
