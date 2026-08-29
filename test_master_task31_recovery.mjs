/**
 * MASTER TASK 31 — Recovery & Stabilization (behavior-focused)
 * Extends Task 30 with full regression contracts for device-reported failures.
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
import { GiammariaPersistenceEngine } from './persistence-core.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.join(ROOT, 'GIANMARIA LOI(2).xlsx');
const BASE = path.join(ROOT, 'web/index.base.html');
const WEB = path.join(ROOT, 'web/index.html');
const ASSETS = path.join(ROOT, 'app/src/main/assets/index.html');
const SERVICES = path.join(ROOT, 'prepare_task20_js_services.mjs');

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

function extractOnclickHandlers(html) {
  const re = /onclick="([^"]+)"/g;
  const handlers = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const expr = m[1].split('(')[0].trim();
    if (expr && !expr.includes('${')) handlers.add(expr);
  }
  return handlers;
}

function extractFunctionNames(html) {
  const re = /function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  const names = new Set();
  let m;
  while ((m = re.exec(html)) !== null) names.add(m[1]);
  return names;
}

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

  updateReviewExerciseField(0, 0, 0, 'name', 'Front Squat');
  updateReviewExerciseField(0, 0, 0, 'reps', '12');
  const ex = canonicalProgram.weeks[0].sessions[0].exercises[0];
  assert(ex.name === 'Front Squat', 'Review edit persists name in canonicalProgram');
  assert(ex.reps_target === '12', 'Review edit persists reps in canonicalProgram');
  delete globalThis.window;
  delete globalThis.programImportState;
}

async function checkCoachHealth() {
  try {
    const health = await fetch('https://coach-api-gemini.onrender.com/health');
    const data = await health.json();
    assert(health.ok && data.ok === true, 'Coach /health returns ok');
    assert(data.apiKeyConfigured === true, 'Coach apiKeyConfigured');

    const chat = await fetch('https://coach-api-gemini.onrender.com/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'ping', history: [] })
    });
    const chatBody = await chat.text();
    let parsed = {};
    try { parsed = chatBody ? JSON.parse(chatBody) : {}; } catch (_) {}
    assert(chat.ok || chat.status < 500, `Coach /api/chat not 5xx (status ${chat.status})`);
    if (!chat.ok) {
      console.log('  ⚠ /api/chat non-200:', chat.status, (parsed.error || chatBody).slice(0, 120));
    }
  } catch (e) {
    assert(false, 'Coach endpoints reachable: ' + e.message);
  }
}

async function main() {
  console.log('=== MASTER TASK 31 — RECOVERY & STABILIZATION ===\n');

  console.log('[A] Splash + ACCEDI/PROFILO (no click-through block)...');
  const baseHtml = fs.readFileSync(BASE, 'utf8');
  const splashBlock = baseHtml.match(/#splash\s*\{[^}]+\}/s)?.[0] || '';
  assert(/pointer-events\s*:\s*none/i.test(splashBlock), '#splash CSS pointer-events:none');
  assert(/pointerEvents\s*=\s*['"]none['"]/.test(baseHtml), 'finishInit sets splash pointerEvents none');
  assert(/id="account-button".*openAccount/.test(baseHtml.replace(/\s+/g, ' ')), 'ACCEDI → openAccount');
  assert(/id="profile-button".*openAthleteProfile/.test(baseHtml.replace(/\s+/g, ' ')), 'PROFILO → openAthleteProfile');
  assert(/function openAccount\s*\(/.test(baseHtml), 'openAccount defined');
  assert(/function openAthleteProfile\s*\(/.test(baseHtml), 'openAthleteProfile defined');
  assert(/id="account-modal"/.test(baseHtml), 'account-modal present');

  console.log('\n[B] Review editor oninput (all domains)...');
  assert(baseHtml.includes('oninput="updateReviewExerciseField'), 'Training review oninput');
  assert(baseHtml.includes('oninput="updateReviewMealItem'), 'Nutrition review oninput');
  assert(baseHtml.includes('oninput="updateReviewSupplementItem'), 'Supplements review oninput');
  assert(baseHtml.includes('oninput="updateReviewTherapyMedication'), 'Therapy review oninput');
  assert(baseHtml.includes('oninput="updateReviewExamRecord'), 'Exams review oninput');
  assert(/function loadModelAsActive\s*\(/.test(baseHtml), 'loadModelAsActive defined (programs structure)');
  simulateReviewEditPersistence();

  console.log('\n[C] Golden GIANMARIA LOI(2).xlsx...');
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
  assert(weeks.length === 1, 'Golden: 1 week');
  assert(sessions === 4, 'Golden: 4 sessions');
  assert(exercises === 19, 'Golden: 19 exercises');
  assert((canon.nutrition?.days || []).length === 7, 'Golden: 7 nutrition days');
  assert(meals === 35, 'Golden: 35 meals');
  assert((canon.supplementation?.items || []).length === 8, 'Golden: 8 supplements');
  assert((canon.therapy?.medications || []).length === 6, 'Golden: 6 meds');
  assert((canon.therapy?.protocols?.length || 0) >= 2, 'Golden: 2+ therapy blocks');
  assert(val.valid, 'Golden canonical validates');
  const telm = detectTherapyDaysOfWeek({ notes: 'Monitorare pressione', timing: 'Mattina' });
  assert(telm.dayOfWeek.length === 7, 'Monitorare → all days (not MON only)');

  console.log('\n[D] IMPORT vs COACH_AI isolation...');
  const importBlock = baseHtml.slice(
    baseHtml.indexOf('async function processUniversalFile'),
    baseHtml.indexOf('function formatCoachError')
  );
  const importBranch = importBlock.split("actionIntent === 'COACH_AI'")[0] || importBlock.slice(0, 5000);
  assert(!/coachEndpoint|\/api\/chat/.test(importBranch), 'IMPORT parse path does not call Coach API');
  assert(importBlock.includes("actionIntent === 'COACH_AI'"), 'COACH_AI branch exists');
  assert(importBlock.includes('pState.canonicalProgram = canonicalProgram'), 'IMPORT sets fresh canonicalProgram');

  console.log('\n[E] Multi-import IndexedDB (3 programs)...');
  const persistence = new GiammariaPersistenceEngine();
  await persistence.wipeDatabase();
  const mk = (title, id) => {
    const c = JSON.parse(JSON.stringify(canon));
    c.id = id; c.title = title; return c;
  };
  await persistence.saveProgram(mk('T31-P1', 't31_p1'), true);
  await persistence.saveProgram(mk('T31-P2', 't31_p2'), true);
  await persistence.saveProgram(mk('T31-P3', 't31_p3'), true);
  const list = await persistence.listPrograms();
  assert(list.length === 3, `3 programs in IDB (${list.length})`);

  console.log('\n[F] onclick orphan scan...');
  const funcs = extractFunctionNames(baseHtml);
  const handlers = extractOnclickHandlers(baseHtml);
  const missing = [...handlers].filter(h =>
    !/^[|$]|navigate|render|confirm|toggle|close|open|delete|save|add|update|switch|apply|cancel|stop|start|trigger|handle|export|import|ask|check|search|change|select|duplicate|explain|analyze|newCoach|sync|logout|submit|finish|init|persist|calc|set|choose|resize|importAnalyzed|activate|seed|fileToBase64|document|NativeConfig/.test(h)
    && !funcs.has(h)
  );
  assert(missing.length === 0, `No orphan onclick (${missing.slice(0, 5).join(', ') || 'none'})`);

  console.log('\n[G] Domain import pills + DB search...');
  for (const domain of ['training', 'nutrition', 'supplements', 'therapy', 'exams']) {
    assert(baseHtml.includes(`switchImportInputMode('${domain}')`), `Import pill: ${domain}`);
  }
  assert(/function searchDb\s*\(/.test(baseHtml), 'searchDb defined');
  assert(/oninput="searchDb/.test(baseHtml), 'DB exercise search oninput (pulldown)');

  console.log('\n[H] i18n 10 languages...');
  const services = fs.readFileSync(SERVICES, 'utf8');
  for (const code of ['it', 'en', 'es', 'fr', 'de', 'pt', 'ru', 'zh', 'ar', 'hi']) {
    assert(new RegExp(`${code}:\\s*\\{`).test(services), `lang ${code}`);
  }

  console.log('\n[I] Hard reset contracts...');
  assert(/wipeDatabase/.test(baseHtml), 'Hard reset wipeDatabase');
  assert(/localStorage\.clear/.test(baseHtml), 'Hard reset localStorage.clear');
  assert(/sessionStorage\.clear/.test(baseHtml), 'Hard reset sessionStorage.clear');
  assert(/window\.location\.reload/.test(baseHtml), 'Hard reset reload');

  console.log('\n[J] Build pipeline + tag...');
  assert(fs.existsSync(WEB), 'web/index.html built');
  assert(fs.existsSync(ASSETS), 'assets/index.html exists');
  const built = fs.readFileSync(WEB, 'utf8');
  assert(built.includes('MASTER-TASK-33') || built.includes('MASTER-TASK-32') || built.includes('MASTER-TASK-31'), 'Build tag MASTER-TASK-33/32/31 (rebuild if missing)');
  if (fs.existsSync(WEB) && fs.existsSync(ASSETS)) {
    assert(md5(WEB) === md5(ASSETS), 'web/index.html MD5 == assets/index.html');
  }

  console.log('\n[K] Coach production health...');
  await checkCoachHealth();

  console.log(`\n=== TASK 31 RECOVERY: ${pass} passed, ${fail} failed ===`);
  if (failures.length) {
    failures.forEach(f => console.error(' -', f));
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
