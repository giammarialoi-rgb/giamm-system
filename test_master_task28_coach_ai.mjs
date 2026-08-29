/**
 * MASTER TASK 28 — Coach AI configuration, health endpoints, import isolation
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import XLSX from 'xlsx';
import {
  parseStructuredWorkbook,
  buildCanonicalProgram,
  detectTherapyDaysOfWeek
} from './universal-import-engine.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.join(__dirname, 'GIANMARIA LOI(2).xlsx');
const BUILT_HTML = path.join(__dirname, 'web/index.html');
const BASE_HTML = path.join(__dirname, 'web/index.base.html');

let pass = 0, fail = 0;
const failures = [];
function assert(c, m) {
  if (c) { pass++; console.log('  ✓', m); }
  else { fail++; failures.push(m); console.error('  ✗', m); }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForServer(port, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) return true;
    } catch (_) {}
    await sleep(400);
  }
  return false;
}

async function testBackendHealth(port) {
  const health = await (await fetch(`http://127.0.0.1:${port}/health`)).json();
  assert(health.ok === true, 'GET /health returns ok:true');
  assert(health.aiConfigured === false, 'GET /health reports aiConfigured:false without GEMINI_API_KEY');
  assert(!('GEMINI_API_KEY' in health), 'Health payload never exposes GEMINI_API_KEY');

  const apiHealth = await (await fetch(`http://127.0.0.1:${port}/api/health`)).json();
  assert(apiHealth.ok === true && apiHealth.aiConfigured === false, 'GET /api/health mirrors /health');

  const chatRes = await fetch(`http://127.0.0.1:${port}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'test' })
  });
  const chatBody = await chatRes.json();
  assert(chatRes.status === 503, 'POST /api/chat without GEMINI returns 503');
  assert(/Coach AI non configurato|GEMINI_API_KEY/i.test(chatBody.error || ''), 'Chat error message is configuration-specific');

  const badRes = await fetch(`http://127.0.0.1:${port}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert(badRes.status === 400 || badRes.status === 503, 'POST /api/chat empty body handled');
}

async function main() {
  console.log('=== MASTER TASK 28 — COACH AI & SYSTEM AUDIT ===\n');

  // 1. Frontend config hardening
  console.log('[1] Frontend Coach AI configuration...');
  const html = fs.readFileSync(BUILT_HTML, 'utf8');
  const base = fs.readFileSync(BASE_HTML, 'utf8');
  assert(/describeMisconfiguration/.test(html), 'Built HTML exposes describeMisconfiguration');
  assert(/formatCoachError/.test(base), 'formatCoachError helper in source');
  assert(!/throw new Error\('Endpoint Coach AI non configurato'\)/.test(base), 'Legacy coachEndpoint throw removed from source');
  assert(/Coach AI non configurato: configurare il backend e GEMINI_API_KEY/.test(base), 'Clear config error string in source');
  assert(/ConfigService\.getCoachApiUrl\(\)/.test(base), 'COACH_API_URL refresh uses ConfigService (native fallback fix)');
  assert(!/NativeConfig\.getCoachApiUrl\(\)\) \|\| ''/.test(base), 'Removed line that wiped COACH_API_URL to empty string');

  // 2. Static assets for Android WebView
  console.log('\n[2] Logo & static assets...');
  for (const file of ['gs_logo.png', 'xlsx.full.min.js', 'data.json']) {
    assert(fs.existsSync(path.join(__dirname, 'web', file)), `web/${file} exists`);
    assert(fs.existsSync(path.join(__dirname, 'app/src/main/assets', file)), `app/src/main/assets/${file} synced`);
  }

  // 3. Import offline isolation (golden file — no regression)
  console.log('\n[3] Golden import (offline, no AI)...');
  const wb = XLSX.readFile(GOLDEN);
  const parsed = parseStructuredWorkbook(wb, 'GIANMARIA LOI(2).xlsx');
  const prog = buildCanonicalProgram(parsed);
  let ex = 0;
  (prog.weeks || []).forEach(w => (w.sessions || []).forEach(s => { ex += (s.exercises || s.rows || []).length; }));
  assert(prog.weeks.length === 1 && ex === 19, `Golden training 1W/4S/19E (ex=${ex})`);
  assert(prog.nutrition?.days?.length === 7, 'Golden nutrition 7 days');
  let meals = 0;
  prog.nutrition.days.forEach(d => { meals += (d.meals || []).length; });
  assert(meals === 35, `Golden nutrition 35 meals (got ${meals})`);
  assert(prog.supplementation?.items?.length === 8, 'Golden supplements 8');
  assert(prog.therapy?.medications?.length === 6, 'Golden therapy 6 meds');
  assert((prog.therapy?.protocols?.length || 0) >= 2, 'Golden therapy 2+ temporal blocks');
  const telm = detectTherapyDaysOfWeek({ notes: 'Monitorare pressione', timing: 'Mattina' });
  assert(telm.dayOfWeek.length === 7, 'Therapy MON/Monitorare false-positive fix preserved');

  // 4. Exercise DB keywords (longest-first in engine)
  console.log('\n[4] Exercise dictionary smoke...');
  const { normalizeExerciseName } = await import('./universal-import-engine.mjs');
  const samples = [
    ['PULLDOWN LAT', 'Pulldown'],
    ['PUSH DOWN TRICIP', 'Push Down'],
    ['CROCI MANUBRI', 'Croci'],
    ['STACCO RDL', 'Rumeno'],
    ['CRUNCH ADDOME', 'Crunch'],
    ['LENTO MANUBRI', 'Lento Manubri'],
    ['PANCA PIANA', 'Panca'],
    ['SQUAT BILANCIERE', 'Squat'],
    ['STACCO DA TERRA', 'Stacco']
  ];
  samples.forEach(([input, expectFragment]) => {
    const norm = normalizeExerciseName(input);
    const name = typeof norm === 'string' ? norm : (norm.name_normalized || norm.name || '');
    assert(name.toLowerCase().includes(expectFragment.toLowerCase()), `${input} → contains "${expectFragment}" (${name})`);
  });

  // 5. i18n 10 languages
  console.log('\n[5] I18n 10 languages...');
  const services = fs.readFileSync(path.join(__dirname, 'prepare_task20_js_services.mjs'), 'utf8');
  for (const code of ['it', 'en', 'es', 'fr', 'de', 'pt', 'ru', 'zh', 'ar', 'hi']) {
    assert(new RegExp(`${code}:\\s*\\{`).test(services), `Language "${code}" present in I18nService`);
  }

  // 6. Google login wiring
  console.log('\n[6] Google Login wiring...');
  assert(/startGoogleSignIn/.test(fs.readFileSync(path.join(__dirname, 'app/src/main/java/com/giammaria/system/MainActivity.java'), 'utf8')), 'MainActivity startGoogleSignIn present');
  assert(/GOOGLE_WEB_CLIENT_ID/.test(fs.readFileSync(path.join(__dirname, 'app/build.gradle'), 'utf8')), 'Gradle GOOGLE_WEB_CLIENT_ID build field');
  assert(/getGoogleClientId/.test(html), 'JS bridge getGoogleClientId in built HTML');

  // 7. Backend health + chat config (local subprocess)
  console.log('\n[7] Backend health & chat without GEMINI...');
  const port = 19876 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, ['coach-api.mjs'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(port), GEMINI_API_KEY: '' },
    stdio: 'ignore'
  });
  try {
    const up = await waitForServer(port);
    assert(up, 'coach-api starts locally for health tests');
    if (up) await testBackendHealth(port);
  } finally {
    child.kill('SIGTERM');
  }

  // 8. ConfigService native-empty fallback (source patterns)
  console.log('\n[8] ConfigService native-empty fallback...');
  assert(/isValidHttpUrl\(native\)/.test(html), 'ConfigService validates native Coach API URL');
  assert(/isValidHttpUrl\(CONFIG\.coachApiUrl\)/.test(html), 'ConfigService falls back to CONFIG.coachApiUrl');
  assert(/describeMisconfiguration\(\)/.test(html), 'ConfigService.describeMisconfiguration available');

  console.log(`\n=== TASK 28 RESULT: ${pass} passed, ${fail} failed ===`);
  if (failures.length) {
    console.error('\nFailures:');
    failures.forEach(f => console.error(' -', f));
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
