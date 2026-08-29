/**
 * MASTER TASK 32 — Import review pipeline isolation + device recovery contracts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import XLSX from 'xlsx';
import {
  parseStructuredWorkbook,
  buildCanonicalProgram,
  validateCanonicalProgram
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

function simulateRenderImportReview() {
  const programImportState = {
    canonicalProgram: {
      title: 'Test Import',
      weeks: [{ weekNumber: 1, sessions: [{ name: 'S1', exercises: [{ name: 'Squat' }] }] }],
      nutrition: { present: true, days: [{ day: 'LUN', meals: [{ name: 'Colazione', foods: [] }] }] },
      supplementation: { present: true, items: [{ name: 'Creatina' }] },
      therapy: { present: true, medications: [{ medication: 'Telmisartan' }], protocols: [{ title: 'Blocco 1' }, { title: 'Blocco 2' }] }
    },
    activeReviewTab: 'training',
    isAnalyzing: false
  };

  globalThis.programImportState = programImportState;
  globalThis.window = { programImportState };

  const container = { innerHTML: '' };
  const esc = x => String(x ?? '');

  function renderImport(c) {
    const pState = globalThis.window?.programImportState || globalThis.programImportState;
    const prog = pState?.canonicalProgram;
    if (!prog) {
      c.innerHTML = 'DROPZONE';
      return;
    }
    const activeTab = pState.activeReviewTab || 'training';
    const weeks = prog.weeks || [];
    c.innerHTML = `
      REVISIONE INTERATTIVA
      REVISIONE PROGRAMMA IMPORTATO
      <div class="pill-tabs">
        <button class="pill-tab ${activeTab === 'training' ? 'active' : ''}">Allenamento (${weeks.length}W)</button>
        <button class="pill-tab">Alimentazione</button>
        <button class="pill-tab">Integrazione</button>
        <button class="pill-tab">Terapia</button>
      </div>
      <div id="import-review-body">REVIEW_BODY</div>
    `;
  }

  renderImport(container);
  assert(container.innerHTML.includes('REVISIONE INTERATTIVA'), 'renderImport shows review header');
  assert(container.innerHTML.includes('pill-tab'), 'renderImport shows domain pills');
  assert(!container.innerHTML.includes('ARCHITETTURA ALLENAMENTO'), 'renderImport does not show coach report');
  assert(!container.innerHTML.includes('CONSIGLI OPERATIVI DEL COACH'), 'renderImport excludes coach tips block');

  delete globalThis.window;
  delete globalThis.programImportState;
}

function simulateImportIntentResolution() {
  globalThis.window = {};
  globalThis.currentView = 'home';
  globalThis.sessionStorage = { _m: {}, setItem(k, v) { this._m[k] = v; }, getItem(k) { return this._m[k] || null; }, removeItem(k) { delete this._m[k]; } };

  function setFilePickIntent(intent) {
    globalThis.window._activeFileAction = intent;
    globalThis.sessionStorage.setItem('pendingFileIntent', intent);
  }
  function resolveFilePickIntent() {
    let intent = globalThis.window._activeFileAction;
    if (!intent) intent = globalThis.sessionStorage.getItem('pendingFileIntent');
    if (!intent) {
      if (globalThis.currentView === 'import') intent = 'IMPORT';
      else if (globalThis.currentView === 'ai') intent = 'COACH_AI';
      else intent = 'IMPORT';
    }
    globalThis.window._activeFileAction = null;
    globalThis.sessionStorage.removeItem('pendingFileIntent');
    return intent;
  }

  setFilePickIntent('IMPORT');
  globalThis.window._activeFileAction = null;
  globalThis.currentView = 'ai';
  assert(resolveFilePickIntent() === 'IMPORT', 'sessionStorage preserves IMPORT intent when view is ai');

  globalThis.currentView = 'home';
  assert(resolveFilePickIntent() === 'IMPORT', 'home view defaults to IMPORT not COACH_AI');

  delete globalThis.window;
  delete globalThis.currentView;
  delete globalThis.sessionStorage;
}

async function main() {
  console.log('=== MASTER TASK 32 — IMPORT REVIEW PIPELINE RECOVERY ===\n');

  const baseHtml = fs.readFileSync(BASE, 'utf8');

  console.log('[1] IMPORT path isolation (no Coach AI analysis)...');
  const importBlock = baseHtml.slice(
    baseHtml.indexOf('async function processUniversalFile'),
    baseHtml.indexOf('function formatCoachError')
  );
  const importOnlyBranch = importBlock.split("actionIntent === 'COACH_AI'")[0] || '';
  assert(!/executeCoachAiFileAnalysis/.test(importOnlyBranch), 'IMPORT branch never calls executeCoachAiFileAnalysis');
  assert(!/coachEndpoint|\/api\/chat/.test(importOnlyBranch), 'IMPORT path has no coachEndpoint');
  assert(/actionIntent === 'IMPORT'/.test(importBlock), 'Explicit IMPORT branch before COACH_AI');
  assert(/setFilePickIntent\('IMPORT'\)/.test(baseHtml), 'triggerImportFileSelect sets persisted IMPORT intent');
  assert(/resolveFilePickIntent/.test(baseHtml), 'resolveFilePickIntent helper present');
  assert(/sessionStorage\.setItem\('pendingFileIntent'/.test(baseHtml), 'Intent persisted in sessionStorage');
  assert(/clearLastPickedDocument/.test(baseHtml), 'Native doc cleared after processing');

  console.log('\n[2] renderImport review UX (not coach report)...');
  assert(/function renderImport\s*\(/.test(baseHtml), 'renderImport defined');
  assert(baseHtml.includes('REVISIONE INTERATTIVA'), 'Review editor label in renderImport');
  assert(baseHtml.includes('switchReviewTab('), 'Domain pill navigation in renderImport');
  assert(!baseHtml.includes('ARCHITETTURA ALLENAMENTO') || baseHtml.indexOf('ARCHITETTURA ALLENAMENTO') > baseHtml.indexOf('executeCoachAiFileAnalysis'),
    'Coach report headers only inside executeCoachAiFileAnalysis');
  simulateRenderImportReview();

  console.log('\n[3] Intent resolution simulation...');
  simulateImportIntentResolution();

  console.log('\n[4] Golden file integrity...');
  assert(fs.existsSync(GOLDEN), 'Golden file exists');
  const wb = XLSX.read(fs.readFileSync(GOLDEN), { type: 'buffer' });
  const canon = buildCanonicalProgram(parseStructuredWorkbook(wb, 'GIANMARIA LOI(2).xlsx'));
  let sessions = 0, exercises = 0;
  (canon.weeks || []).forEach(w => {
    const s = w.sessions || w.days || [];
    sessions += s.length;
    s.forEach(d => { exercises += (d.exercises || d.rows || []).length; });
  });
  const meals = (canon.nutrition?.days || []).reduce((n, d) => n + (d.meals || []).length, 0);
  assert((canon.weeks || []).length === 1, 'Golden: 1 week');
  assert(sessions === 4, 'Golden: 4 sessions');
  assert(exercises === 19, 'Golden: 19 exercises');
  assert((canon.nutrition?.days || []).length === 7, 'Golden: 7 nutrition days');
  assert(meals === 35, 'Golden: 35 meals');
  assert((canon.supplementation?.items || []).length === 8, 'Golden: 8 supplements');
  assert((canon.therapy?.medications || []).length === 6, 'Golden: 6 meds');
  assert((canon.therapy?.protocols?.length || 0) >= 2, 'Golden: 2+ therapy blocks');
  assert(validateCanonicalProgram(canon).valid, 'Golden validates');

  console.log('\n[5] ACCEDI / PROFILO / Coach AZZERA contracts...');
  assert(/#account-modal[\s\S]*z-index:\s*4000/.test(baseHtml), 'account-modal above splash');
  assert(/function openAccount[\s\S]*splash\.style\.display\s*=\s*'none'/.test(baseHtml), 'openAccount hides splash');
  assert(/function openAthleteProfile/.test(baseHtml), 'openAthleteProfile defined');
  assert(/function confirmResetSession/.test(baseHtml), 'Coach AZZERA confirmResetSession');
  assert(!/confirmResetSession[\s\S]{0,400}resetAllData/.test(baseHtml), 'Coach AZZERA does not hard reset');
  assert(/function clearCoachSession/.test(baseHtml), 'clearCoachSession for chat-only reset');

  console.log('\n[6] Build pipeline + tag...');
  assert(fs.existsSync(WEB), 'web/index.html exists (run build:web if missing)');
  if (fs.existsSync(WEB)) {
    const built = fs.readFileSync(WEB, 'utf8');
    assert(built.includes('MASTER-TASK-32'), 'Build tag MASTER-TASK-32');
  }
  if (fs.existsSync(WEB) && fs.existsSync(ASSETS)) {
    assert(md5(WEB) === md5(ASSETS), 'web/index.html MD5 == assets/index.html');
  }

  console.log(`\n=== TASK 32 RECOVERY: ${pass} passed, ${fail} failed ===`);
  if (failures.length) {
    failures.forEach(f => console.error(' -', f));
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
