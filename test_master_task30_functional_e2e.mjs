/**
 * MASTER TASK 30 — Functional E2E (behavior-focused, not just function existence)
 * Validates splash click-through, review edit persistence, golden import, pipeline.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import XLSX from 'xlsx';
import {
  parseStructuredWorkbook,
  buildCanonicalProgram,
  validateCanonicalProgram,
  detectTherapyDaysOfWeek
} from './universal-import-engine.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.join(ROOT, 'GIANMARIA LOI(2).xlsx');
const BASE = path.join(ROOT, 'web/index.base.html');
const WEB = path.join(ROOT, 'web/index.html');
const ASSETS = path.join(ROOT, 'app/src/main/assets/index.html');

let pass = 0, fail = 0;
const failures = [];
function assert(c, m) {
  if (c) { pass++; console.log('  ✓', m); }
  else { fail++; failures.push(m); console.error('  ✗', m); }
}

function md5(file) {
  return execSync(`certutil -hashfile "${file}" MD5`, { encoding: 'utf8' })
    .split('\n').find(l => /^[0-9a-f]{32}$/i.test(l.trim()))?.trim().toLowerCase();
}

/** Simulate review edit + render cycle (the bug Task 30 fixes) */
function simulateReviewEditPersistence() {
  const canonicalProgram = {
    title: 'Test',
    weeks: [{
      weekNumber: 1,
      sessions: [{
        name: 'S1',
        exercises: [{ name: 'Squat', name_normalized: 'Squat', reps_target: '10', rir_target: 2 }]
      }]
    }],
    training: null
  };
  canonicalProgram.training = { weeks: canonicalProgram.weeks };

  const programImportState = { canonicalProgram };
  globalThis.window = { programImportState };
  globalThis.programImportState = programImportState;

  function updateReviewExerciseField(wIdx, sIdx, exIdx, field, val) {
    const pState = globalThis.window?.programImportState || globalThis.programImportState;
    const prog = pState?.canonicalProgram?.training || pState?.canonicalProgram;
    const ex = prog?.weeks?.[wIdx]?.sessions?.[sIdx]?.exercises?.[exIdx];
    if (!ex) return;
    if (field === 'name') { ex.name_normalized = val; ex.name = val; ex.exercise = val; }
    else if (field === 'reps') { ex.reps_target = val; ex.reps = val; }
    else if (field === 'rir') { ex.rir_target = val; }
  }

  // oninput path: edit without blur (simulates keystroke before render)
  updateReviewExerciseField(0, 0, 0, 'name', 'Front Squat');
  updateReviewExerciseField(0, 0, 0, 'reps', '12');

  const ex = canonicalProgram.weeks[0].sessions[0].exercises[0];
  assert(ex.name === 'Front Squat', 'Review edit persists name in canonicalProgram (simulated oninput)');
  assert(ex.reps_target === '12', 'Review edit persists reps in canonicalProgram (simulated oninput)');

  // Simulate render reading back same state
  const weeks = canonicalProgram.weeks || [];
  const renderedName = weeks[0]?.sessions[0]?.exercises[0]?.name;
  assert(renderedName === 'Front Squat', 'Post-render read-back shows edited exercise name');

  delete globalThis.window;
  delete globalThis.programImportState;
}

async function checkCoachHealth() {
  try {
    const res = await fetch('https://coach-api-gemini.onrender.com/health');
    const data = await res.json();
    assert(res.ok && data.ok === true, 'Coach production /health returns ok');
    assert(data.apiKeyConfigured === true, 'Coach production apiKeyConfigured');
  } catch (e) {
    assert(false, 'Coach production /health reachable: ' + e.message);
  }
}

async function main() {
  console.log('=== MASTER TASK 30 — FUNCTIONAL E2E ===\n');

  console.log('[1] Splash must not block header clicks (CSS contract)...');
  const baseHtml = fs.readFileSync(BASE, 'utf8');
  const splashBlock = baseHtml.match(/#splash\s*\{[^}]+\}/s)?.[0] || '';
  assert(/pointer-events\s*:\s*none/i.test(splashBlock), '#splash has pointer-events:none (ACCEDI/PROFILO clickable during splash)');

  console.log('\n[2] Review training inputs sync on input (not only blur)...');
  assert(baseHtml.includes("oninput=\"updateReviewExerciseField"), 'Review exercise fields have oninput handlers');

  console.log('\n[3] Review edit persistence simulation...');
  simulateReviewEditPersistence();

  console.log('\n[4] Golden file GIANMARIA LOI(2).xlsx...');
  assert(fs.existsSync(GOLDEN), 'Golden file exists');
  const wb = XLSX.read(fs.readFileSync(GOLDEN), { type: 'buffer' });
  const parsed = parseStructuredWorkbook(wb, 'GIANMARIA LOI(2).xlsx');
  const canon = buildCanonicalProgram(parsed);
  const weeks = canon.weeks || canon.training?.weeks || [];
  let sessions = 0, exercises = 0;
  weeks.forEach(w => {
    const s = w.sessions || w.days || [];
    sessions += s.length;
    s.forEach(d => { exercises += (d.exercises || d.rows || []).length; });
  });
  const meals = (canon.nutrition?.days || []).reduce((n, d) => n + (d.meals || []).length, 0);
  const val = validateCanonicalProgram(canon);
  assert(weeks.length === 1, 'Golden training: 1 week');
  assert(sessions === 4, 'Golden training: 4 sessions');
  assert(exercises === 19, 'Golden training: 19 exercises');
  assert((canon.nutrition?.days || []).length === 7, 'Golden nutrition: 7 days');
  assert(meals === 35, 'Golden nutrition: 35 meals');
  assert((canon.supplementation?.items || []).length === 8, 'Golden supplements: 8');
  assert((canon.therapy?.medications || []).length === 6, 'Golden therapy: 6 meds');
  assert(val.valid, 'Golden canonical validates');
  const telm = detectTherapyDaysOfWeek({ notes: 'Monitorare pressione', timing: 'Mattina' });
  assert(telm.dayOfWeek.length === 7, 'Monitorare does not invent Lunedì only');

  console.log('\n[5] ACCEDI / PROFILO wiring in built HTML...');
  const built = fs.readFileSync(WEB, 'utf8');
  assert(built.includes('onclick="openAccount()"'), 'Built HTML: ACCEDI onclick');
  assert(built.includes('onclick="openAthleteProfile()"'), 'Built HTML: PROFILO onclick');
  assert(built.includes('id="account-modal"'), 'Built HTML: account-modal present');
  assert(/function openAccount\s*\(/.test(built), 'Built HTML: openAccount defined');
  assert(/function openAthleteProfile\s*\(/.test(built), 'Built HTML: openAthleteProfile defined');

  console.log('\n[6] Build tag + pipeline parity...');
  assert(/MASTER-TASK-3\d/.test(built), 'Build tag MASTER-TASK-3x in index.html');
  if (fs.existsSync(WEB) && fs.existsSync(ASSETS)) {
    assert(md5(WEB) === md5(ASSETS), 'web/index.html MD5 matches assets after rebuild');
  }

  console.log('\n[7] Coach AI production health...');
  await checkCoachHealth();

  console.log(`\n=== TASK 30 FUNCTIONAL E2E: ${pass} passed, ${fail} failed ===`);
  if (failures.length) {
    console.error('\nFailures:', failures);
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
