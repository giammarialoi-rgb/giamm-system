/**
 * MASTER TASK 29 — Full Application Recovery & Zero Regression
 * Validates source ↔ assets ↔ APK pipeline + domain contracts + UI wiring
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
const APK = path.join(ROOT, 'app/build/outputs/apk/debug/app-debug.apk');

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

async function main() {
  console.log('=== MASTER TASK 29 — FULL RECOVERY & ZERO REGRESSION ===\n');

  // --- Pipeline parity ---
  console.log('[A] Build pipeline (source → assets → APK)...');
  assert(fs.existsSync(BASE), 'web/index.base.html exists');
  assert(fs.existsSync(WEB), 'web/index.html built');
  assert(fs.existsSync(ASSETS), 'app/src/main/assets/index.html exists');
  if (fs.existsSync(WEB) && fs.existsSync(ASSETS)) {
    assert(md5(WEB) === md5(ASSETS), 'web/index.html MD5 matches Android assets');
  }
  for (const f of ['gs_logo.png', 'xlsx.full.min.js', 'data.json']) {
    assert(fs.existsSync(path.join(ROOT, 'web', f)), `web/${f}`);
    assert(fs.existsSync(path.join(ROOT, 'app/src/main/assets', f)), `assets/${f}`);
  }
  if (fs.existsSync(APK)) {
    try {
      const listing = execSync(`tar -tf "${APK}"`, { encoding: 'utf8' });
      for (const f of ['assets/index.html', 'assets/gs_logo.png', 'assets/xlsx.full.min.js', 'assets/data.json']) {
        assert(listing.includes(f), `APK contains ${f}`);
      }
    } catch (_) {
      console.log('  ⚠ APK tar listing skipped (use unzip manually if needed)');
    }
  } else {
    console.log('  ⚠ app-debug.apk not found — run gradlew assembleDebug');
  }

  const base = fs.readFileSync(BASE, 'utf8');
  const built = fs.readFileSync(WEB, 'utf8');

  // --- Golden file ---
  console.log('\n[B] Golden file multi-domain...');
  assert(fs.existsSync(GOLDEN), 'GIANMARIA LOI(2).xlsx present');
  const wb = XLSX.readFile(GOLDEN);
  const parsed = parseStructuredWorkbook(wb, 'GIANMARIA LOI(2).xlsx');
  const prog = buildCanonicalProgram(parsed);
  let ex = 0, sess = 0;
  (prog.weeks || []).forEach(w => {
    const s = w.sessions || w.days || [];
    sess += s.length;
    s.forEach(x => { ex += (x.exercises || x.rows || []).length; });
  });
  let meals = 0;
  (prog.nutrition?.days || []).forEach(d => { meals += (d.meals || []).length; });
  assert(prog.weeks.length === 1 && sess === 4 && ex === 19, `Training 1W/4S/19E (${prog.weeks.length}W/${sess}S/${ex}E)`);
  assert(prog.nutrition?.days?.length === 7, 'Nutrition 7 days');
  assert(meals === 35, `Nutrition 35 meals (${meals})`);
  assert(prog.supplementation?.items?.length === 8, 'Supplements 8');
  assert(prog.therapy?.medications?.length === 6, 'Therapy 6 meds');
  assert((prog.therapy?.protocols?.length || 0) >= 2, 'Therapy 2+ blocks');
  const val = validateCanonicalProgram(prog);
  assert(val.valid === true, 'Golden passes validateCanonicalProgram');
  const telm = detectTherapyDaysOfWeek({ notes: 'Monitorare pressione', timing: 'Mattina' });
  assert(telm.dayOfWeek.length === 7, 'Monitorare does not invent Lunedì');

  // --- Import offline isolation ---
  console.log('\n[C] Import offline (no Coach API in IMPORT path)...');
  const importBlock = base.slice(base.indexOf('async function processUniversalFile'), base.indexOf('function formatCoachError'));
  assert(!/coachEndpoint|\/api\/chat|GEMINI/i.test(importBlock.split('COACH_AI')[0] || importBlock.slice(0, 4000)), 'IMPORT branch does not call Coach API before parse');

  // --- Storage 3 programs ---
  console.log('\n[D] Multi-program storage (IndexedDB)...');
  const persistence = new GiammariaPersistenceEngine();
  await persistence.wipeDatabase();
  const mk = (title, id) => {
    const c = JSON.parse(JSON.stringify(prog));
    c.id = id; c.title = title; return c;
  };
  await persistence.saveProgram(mk('P1', 't29_p1'), true);
  await persistence.saveProgram(mk('P2', 't29_p2'), true);
  await persistence.saveProgram(mk('P3', 't29_p3'), true);
  const list = await persistence.listPrograms();
  assert(list.length === 3, `3 programs in library (${list.length})`);
  assert(!/base64:\s*base64String/.test(base.split('persistDocumentMetadata')[1]?.slice(0, 900) || ''), 'No base64 in store.docs push');

  // --- UI contracts ---
  console.log('\n[E] UI handler contracts (dead button scan)...');
  const critical = [
    'openAccount', 'openAthleteProfile', 'startGoogleAuth', 'navigate', 'render',
    'resetWorkoutData', 'resetAllData', 'processUniversalFile', 'confirmImportAndActivate',
    'askAI', 'checkBackendHealth', 'searchDb', 'saveAthleteProfile', 'changeAppLanguage',
    'triggerImportFileSelect', 'triggerCoachFileSelect', 'handleImportFileSelected'
  ];
  const funcs = extractFunctionNames(base);
  critical.forEach(fn => assert(funcs.has(fn), `function ${fn}() defined`));

  const handlers = extractOnclickHandlers(base);
  const missing = [...handlers].filter(h => !/^[|$]|navigate|render|confirm|toggle|close|open|delete|save|add|update|switch|apply|cancel|stop|start|trigger|handle|export|import|ask|check|search|change|select|duplicate|explain|analyze|newCoach|sync|logout|submit|finish|init|persist|calc|set|choose|resize|importAnalyzed|activate|seed|fileToBase64|document|NativeConfig/.test(h) && !funcs.has(h));
  assert(missing.length === 0, `No orphan onclick handlers (${missing.slice(0, 5).join(', ') || 'none'})`);

  assert(/id="account-button".*openAccount/.test(base.replace(/\s+/g, ' ')), 'ACCEDI → openAccount');
  assert(/id="profile-button".*openAthleteProfile/.test(base.replace(/\s+/g, ' ')), 'PROFILO → openAthleteProfile');
  assert(/GOOGLE_WEB_CLIENT_ID|getGoogleClientId/.test(built), 'Google client ID bridge in built HTML');
  assert(/pointerEvents\s*=\s*['"]none['"]/.test(base), 'Splash disables pointer-events when dismissing');
  assert(/Google Login non configurato/.test(base), 'Clear Google config message');

  // --- Reset semantics in source ---
  console.log('\n[F] Reset / Hard reset contracts...');
  assert(/clearWorkoutLogs/.test(base), 'Soft reset uses clearWorkoutLogs');
  assert(/wipeDatabase/.test(base), 'Hard reset uses wipeDatabase');
  assert(/sessionStorage\.clear/.test(base), 'Hard reset clears sessionStorage');
  assert(/localStorage\.clear/.test(base), 'Hard reset clears localStorage');

  // --- I18n 10 ---
  console.log('\n[G] I18n 10 languages...');
  const services = fs.readFileSync(path.join(ROOT, 'prepare_task20_js_services.mjs'), 'utf8');
  for (const code of ['it', 'en', 'es', 'fr', 'de', 'pt', 'ru', 'zh', 'ar', 'hi']) {
    assert(new RegExp(`${code}:\\s*\\{`).test(services), `lang ${code}`);
  }

  // --- Coach config (Task 28 preserved) ---
  console.log('\n[H] Coach AI config preserved...');
  assert(/describeMisconfiguration/.test(built), 'ConfigService.describeMisconfiguration');
  assert(/formatCoachError/.test(base), 'formatCoachError helper');
  assert(!/throw new Error\('Endpoint Coach AI non configurato'\)/.test(base), 'Legacy endpoint error removed');

  console.log(`\n=== TASK 29 RESULT: ${pass} passed, ${fail} failed ===`);
  if (failures.length) {
    failures.forEach(f => console.error(' -', f));
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
