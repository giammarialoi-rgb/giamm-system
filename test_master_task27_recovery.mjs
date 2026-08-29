/**
 * MASTER TASK 27 — Feature Recovery & Multi-Program Storage Tests
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import {
  parseStructuredWorkbook,
  buildCanonicalProgram,
  validateCanonicalProgram,
  detectTherapyDaysOfWeek
} from './universal-import-engine.mjs';
import {
  GiammariaPersistenceEngine,
  getDeterministicFingerprint
} from './persistence-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.join(__dirname, 'GIANMARIA LOI(2).xlsx');
const BASE_HTML = fs.readFileSync(path.join(__dirname, 'web/index.base.html'), 'utf8');
const SERVICES = fs.readFileSync(path.join(__dirname, 'prepare_task20_js_services.mjs'), 'utf8');

let pass = 0, fail = 0;
const failures = [];
function assert(c, m) { if (c) { pass++; console.log('  ✓', m); } else { fail++; failures.push(m); console.error('  ✗', m); } }

async function main() {
  console.log('=== MASTER TASK 27 RECOVERY SUITE ===\n');

  // Golden parse preserved (Task 26)
  const wb = XLSX.readFile(GOLDEN);
  const parsed = parseStructuredWorkbook(wb, 'GIANMARIA LOI(2).xlsx');
  const prog = buildCanonicalProgram(parsed);
  let ex = 0;
  (prog.weeks || []).forEach(w => (w.sessions || []).forEach(s => { ex += (s.exercises || s.rows || []).length; }));
  assert(prog.weeks.length === 1 && ex === 19, 'Golden training 1W/19E preserved');
  assert(prog.nutrition?.days?.length === 7, 'Golden nutrition 7 days preserved');
  assert(prog.therapy?.medications?.length === 6, 'Golden therapy 6 meds preserved');
  const telm = detectTherapyDaysOfWeek({ notes: 'Monitorare pressione', timing: 'Mattina' });
  assert(telm.dayOfWeek.length === 7, 'Therapy MON/Monitorare fix preserved');

  // Multi-program IndexedDB (no overwrite delete)
  const persistence = new GiammariaPersistenceEngine();
  await persistence.wipeDatabase();

  const makeProg = (title, suffix) => {
    const clone = JSON.parse(JSON.stringify(prog));
    clone.id = `prog_test_${suffix}_${Date.now()}`;
    clone.title = title;
    return clone;
  };

  const p1 = makeProg('Programma A', 'a');
  const p2 = makeProg('Programma B', 'b');
  const p3 = makeProg('Programma C', 'c');

  await persistence.saveProgram(p1, true);
  await persistence.saveProgram(p2, true);
  await persistence.saveProgram(p3, true);

  const list = await persistence.listPrograms();
  assert(list.length === 3, `Three programs in library (got ${list.length})`);

  const loadedB = await persistence.loadProgram(p2.id);
  assert(loadedB && loadedB.title === 'Programma B', 'Program B retrievable after C activated');

  await persistence.activateCanonicalProgram(p1);
  const active = await persistence.loadActiveProgram();
  assert(active && active.title === 'Programma A', 'Can re-activate program A');

  // Source code recovery checks
  assert(/switchImportInputMode\(/.test(BASE_HTML) && /importDomain/.test(BASE_HTML), 'Multi-domain import UI in index.base.html');
  assert(/persistDocumentMetadata/.test(BASE_HTML), 'Document metadata-only persistence helper present');
  assert(/syncProgramLibraryFromIdb/.test(BASE_HTML), 'Program library IDB sync present');
  assert(/buildExerciseDbFromDictionary/.test(BASE_HTML), 'Exercise DB seeding present');
  assert(/activateSavedProgram/.test(BASE_HTML), 'Multi-program activation from IDB present');
  assert(/startGoogleAuth|nativeGoogleResult/.test(BASE_HTML), 'Google login UI handlers present');
  assert(!/base64:\s*base64String/.test(BASE_HTML.split('persistDocumentMetadata')[1]?.slice(0, 800) || ''), 'Import path avoids base64 in store.docs push');

  assert(/LANG_META/.test(SERVICES) && /supportedLangs/.test(SERVICES), 'I18n LANG_META with 10 languages');
  assert(/getAvailableLanguages\(\)\s*\{[\s\S]*LANG_META/.test(SERVICES), 'getAvailableLanguages returns meta objects');

  assert(!/window\.confirmImportAndActivate = confirmImportAndActivate/.test(
    fs.readFileSync(path.join(__dirname, 'generate_bundles.mjs'), 'utf8')
  ), 'No duplicate confirmImportAndActivate in import bundle');

  // Sanitizer strips models.data
  const engine = new GiammariaPersistenceEngine();
  const bloated = {
    models: [{ id: 'x', data: { weeks: prog.weeks } }],
    docs: [{ id: 'd1', base64: 'AAAA'.repeat(10000) }],
    activeProgram: prog
  };
  const clean = engine.sanitizeStoreForLocalStorage(bloated);
  assert(!clean.models[0].data, 'Sanitizer strips models[].data');
  assert(!clean.docs[0].base64, 'Sanitizer strips docs[].base64');
  assert(!clean.activeProgram, 'Sanitizer strips activeProgram');

  console.log('\n=== RESULTS ===');
  console.log(`PASS: ${pass} | FAIL: ${fail}`);
  if (failures.length) failures.forEach(f => console.log(' -', f));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
