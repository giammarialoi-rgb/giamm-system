import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

console.log('--- Running Warm-Up Engine Tests ---');

const librarySrc = fs.readFileSync(path.join(root, 'web/warmup-exercise-library.js'), 'utf8');
const engineSrc = fs.readFileSync(path.join(root, 'web/warmup-engine.js'), 'utf8');

function freshSandbox() {
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(librarySrc, sandbox);
  vm.runInContext(engineSrc, sandbox);
  return sandbox;
}

// 0. Library sanity: every exercise has the fields the spec's data model
// (section 35) requires, and Italian text is actually present (not empty).
{
  const sb = freshSandbox();
  const lib = sb.WARMUP_EXERCISE_LIBRARY;
  ok(Array.isArray(lib) && lib.length >= 29, '0a. library has at least the 29 exercises specified');
  const ids = new Set();
  for (const ex of lib) {
    ok(ex.id && !ids.has(ex.id), '0b. ' + ex.id + ' has a unique id');
    ids.add(ex.id);
    ok(typeof ex.name === 'string' && ex.name.length > 0, '0c. ' + ex.id + ' has a name');
    ok(typeof ex.category === 'string' && ex.category.length > 0, '0d. ' + ex.id + ' has a category');
    ok(typeof ex.description === 'string' && ex.description.length > 5, '0e. ' + ex.id + ' has a description');
    ok(typeof ex.instructions === 'string' && ex.instructions.length > 20, '0f. ' + ex.id + ' has detailed instructions');
    ok(ex.compatible_main_lifts && typeof ex.compatible_main_lifts === 'object', '0g. ' + ex.id + ' has compatible_main_lifts');
    ok(typeof ex.auto_selectable === 'boolean' && typeof ex.coach_selectable === 'boolean' && typeof ex.personal_selectable === 'boolean',
      '0h. ' + ex.id + ' declares selectability flags');
  }
  const smr = lib.filter((e) => e.category === 'self_myofascial_release');
  ok(smr.length > 0 && smr.every((e) => e.auto_selectable === false),
    '0i. self-myofascial-release items exist but are never auto-selectable (spec section 28)');
}

function sessionWithMain(name, plannedLoad, sets) {
  return { exercises: [{ name, plannedLoad, sets }, { name: 'Leg Press' }, { name: 'Leg Extension' }] };
}

// A. Auto warm-up squat
{
  const sb = freshSandbox();
  const w = sb.WarmUpEngine.generate(sessionWithMain('Back Squat', 220, 4), { athleteLevel: 'advanced' });
  ok(w.liftKey === 'squat', 'A1. classifies Back Squat as squat');
  ok(w.priorityRegions.includes('ankle') && w.priorityRegions.includes('hip'), 'A2. prioritizes ankle and hip for squat');
  ok(w.items.some((i) => i.category === 'raise'), 'A3. includes a raise item');
  ok(w.items.some((i) => i.exerciseId === 'mobility_ankle_dorsiflexion' || i.category === 'mobility'), 'A4. includes ankle-relevant mobility');
  ok(w.rampUp && w.rampUp.workingWeight === 220, 'A5. builds a ramp-up from the actual working weight (220kg), not a fixed table');
  ok(w.rampUp.steps.every((s) => s.load < 220), 'A6. every ramp-up step stays below the working weight');
  ok(w.items.length >= 5 && w.items.length <= 8, 'A7. total item count is within the 5-8 target (spec section 22)');
}

// B. Auto warm-up deadlift
{
  const sb = freshSandbox();
  const w = sb.WarmUpEngine.generate(sessionWithMain('Stacco da Terra', 260, 3), { athleteLevel: 'advanced' });
  ok(w.liftKey === 'deadlift', 'B1. classifies "Stacco da Terra" (Italian) as deadlift');
  ok(w.priorityRegions.includes('hip') && w.priorityRegions.includes('adductor'), 'B2. prioritizes hip/adductor for deadlift');
  ok(w.items.some((i) => i.exerciseId === 'cars_hip' || i.exerciseId === 'mobility_adductor_rockback'), 'B3. includes hip/adductor mobility relevant to deadlift');
  ok(w.rampUp && w.rampUp.workingWeight === 260, 'B4. ramp-up derived from the 260kg working weight');
}

// C. Auto warm-up bench
{
  const sb = freshSandbox();
  const w = sb.WarmUpEngine.generate(sessionWithMain('Panca Piana', 150, 5), { athleteLevel: 'advanced' });
  ok(w.liftKey === 'bench', 'C1. classifies "Panca Piana" as bench');
  ok(w.priorityRegions.includes('shoulder') && w.priorityRegions.includes('thoracic'), 'C2. prioritizes shoulder/thoracic for bench');
  ok(w.items.some((i) => i.exerciseId === 'cars_shoulder' || i.exerciseId === 'mobility_thoracic_rotation'), 'C3. includes shoulder/thoracic prep');
}

// D. Auto warm-up overhead press
{
  const sb = freshSandbox();
  const w = sb.WarmUpEngine.generate(sessionWithMain('Overhead Press', 60, 5), { athleteLevel: 'advanced' });
  ok(w.liftKey === 'overhead_press', 'D1. classifies Overhead Press correctly');
  ok(w.items.some((i) => i.exerciseId === 'mobility_wall_slide' || i.exerciseId === 'cars_shoulder'), 'D2. includes scapular/shoulder preparation');
}

// E/F. Auto warm-up upper / lower body general (no explicit main-lift keyword)
{
  const sb = freshSandbox();
  const upper = sb.WarmUpEngine.generate({ exercises: [{ name: 'Alzate Laterali' }, { name: 'Croci ai Cavi' }] }, {});
  ok(Array.isArray(upper.items) && upper.items.length > 0, 'E1. generates a non-empty warm-up for a generic upper-body session');
  const lower = sb.WarmUpEngine.generate({ exercises: [{ name: 'Leg Press' }, { name: 'Leg Curl' }] }, {});
  ok(Array.isArray(lower.items) && lower.items.length > 0, 'F1. generates a non-empty warm-up for a generic lower-body session');
}

// G. Auto warm-up full body (mixed pattern session, no single dominant lift on exercise 1)
{
  const sb = freshSandbox();
  const full = sb.WarmUpEngine.generate({ exercises: [{ name: 'Kettlebell Swing' }, { name: 'Panca Piana', plannedLoad: 100 }, { name: 'Rematore' }] }, {});
  ok(full.pattern === 'full_body', 'G1. classifies a mixed-pattern session as full_body');
  ok(full.priorityRegions.length >= 3, 'G2. unions priority regions across the first exercises instead of a single generic set');
}

// Determinism + explainability (spec sections 19/34)
{
  const sb = freshSandbox();
  const a = sb.WarmUpEngine.generate(sessionWithMain('Back Squat', 180, 4), { athleteLevel: 'intermediate' });
  const b = sb.WarmUpEngine.generate(sessionWithMain('Back Squat', 180, 4), { athleteLevel: 'intermediate' });
  ok(JSON.stringify(a.items) === JSON.stringify(b.items), 'H1. generation is deterministic for identical inputs');
  ok(typeof a.explanation === 'string' && a.explanation.length > 20 && a.explanation.indexOf(a.mainLift) >= 0,
    'H2. produces a human-readable explanation referencing the main lift (AI Coach hook, spec section 34)');
}

// Potentiation gating (spec sections 7/27): opt-in only, never for beginners,
// never when readiness is explicitly low.
{
  const sb = freshSandbox();
  const session = sessionWithMain('Back Squat', 200, 4);
  const off = sb.WarmUpEngine.generate(session, { athleteLevel: 'advanced' });
  ok(!off.items.some((i) => i.category === 'potentiation' || i.category === 'isometric'),
    'I1. potentiation is excluded by default even for an advanced lifter (must be explicitly requested)');
  const beginner = sb.WarmUpEngine.generate(session, { athleteLevel: 'beginner', includePotentiation: true });
  ok(!beginner.items.some((i) => i.category === 'potentiation' || i.category === 'isometric'),
    'I2. potentiation is never included for a beginner even if requested');
  const lowReadiness = sb.WarmUpEngine.generate(session, { athleteLevel: 'advanced', includePotentiation: true, readiness: 'low' });
  ok(!lowReadiness.items.some((i) => i.category === 'potentiation' || i.category === 'isometric'),
    'I3. potentiation is excluded when readiness is low');
  const on = sb.WarmUpEngine.generate(session, { athleteLevel: 'advanced', includePotentiation: true, readiness: 'high' });
  ok(on.items.some((i) => i.category === 'potentiation' || i.category === 'isometric'),
    'I4. potentiation is included when explicitly requested, athlete is advanced, and readiness is high');
}

// Self-myofascial-release is never auto-selected (spec section 28)
{
  const sb = freshSandbox();
  const w = sb.WarmUpEngine.generate(sessionWithMain('Back Squat', 180, 4), { athleteLevel: 'advanced', includePotentiation: true, readiness: 'high' });
  ok(!w.items.some((i) => i.category === 'self_myofascial_release'), 'J1. foam rolling never appears in an auto-generated warm-up');
}

// Ramp-up math: no session load -> no ramp-up (graceful, not a crash or a fake table)
{
  const sb = freshSandbox();
  const noLoad = sb.WarmUpEngine.generate(sessionWithMain('Back Squat', null, 4), {});
  ok(noLoad.rampUp === null, 'K1. no working weight -> no fabricated ramp-up');
  const steps = sb.WarmUpEngine.buildRampUp(100, 3, { athleteLevel: 'beginner' });
  ok(steps.length === 4, 'K2. beginner ramp-up uses fewer steps (4) than advanced');
  const advSteps = sb.WarmUpEngine.buildRampUp(100, 3, { athleteLevel: 'advanced' });
  ok(advSteps.length === 6, 'K3. advanced ramp-up uses more steps (6) - denser progression, not the same table for everyone');
  let increasing = true;
  for (let i = 1; i < advSteps.length; i++) if (advSteps[i].load <= advSteps[i - 1].load) increasing = false;
  ok(increasing, 'K4. ramp-up loads are strictly increasing');
}

console.log('\nAll warm-up engine tests passed.');
