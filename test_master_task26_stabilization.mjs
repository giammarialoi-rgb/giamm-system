/**
 * MASTER TASK 26 — Full System Stabilization E2E Suite
 * Verifies real golden-file fidelity, therapy day semantics,
 * activation atomicity, reset scopes, and negative cases.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  parseStructuredWorkbook,
  validateCanonicalProgram,
  buildCanonicalProgram,
  normalizeExerciseName,
  detectTherapyDaysOfWeek
} from './universal-import-engine.mjs';
import {
  GiammariaPersistenceEngine,
  getDeterministicFingerprint
} from './persistence-core.mjs';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.join(__dirname, 'GIANMARIA LOI(2).xlsx');

let passCount = 0;
let failCount = 0;
const failures = [];

function assert(cond, msg) {
  if (cond) {
    passCount++;
    console.log(`  ✓ ${msg}`);
  } else {
    failCount++;
    failures.push(msg);
    console.error(`  ✗ ${msg}`);
  }
}

async function main() {
  console.log('====================================================');
  console.log('MASTER TASK 26 — STABILIZATION E2E');
  console.log('====================================================');

  assert(fs.existsSync(GOLDEN), `Golden file exists: ${GOLDEN}`);

  // --- UNIT: therapy day detection ---
  console.log('\n--- UNIT: detectTherapyDaysOfWeek ---');
  const monTrap = detectTherapyDaysOfWeek({
    daysRaw: '',
    timing: 'Mattina al risveglio',
    notes: 'Monitorare pressione sanguigna'
  });
  assert(monTrap.dayOfWeek.length === 7, 'Monitorare does NOT invent Lunedì (defaults to 7 days)');
  assert(monTrap.frequency === 'Tutti i giorni', 'Monitorare → Tutti i giorni');
  assert(monTrap.daysSource === 'default_daily', 'daysSource=default_daily when no weekday in schedule fields');

  const explicitMon = detectTherapyDaysOfWeek({ daysRaw: 'Lunedì', timing: 'Mattina', notes: 'Monitorare' });
  assert(explicitMon.dayOfWeek.length === 1 && explicitMon.dayOfWeek[0] === 'Lunedì', 'Explicit Lunedì in daysRaw is preserved');
  assert(explicitMon.daysSource === 'explicit_schedule', 'explicit_schedule when weekday present');

  const englishMon = detectTherapyDaysOfWeek({ daysRaw: 'Monday Wednesday', timing: '', notes: 'Monitorare' });
  assert(englishMon.dayOfWeek.includes('Lunedì') && englishMon.dayOfWeek.includes('Mercoledì'), 'English Monday/Wednesday word-boundary tokens work');
  assert(englishMon.dayOfWeek.length === 2, 'Only Monday+Wednesday detected (not from Monitorare)');

  // --- UNIT: exercise longest-match ---
  console.log('\n--- UNIT: normalizeExerciseName longest-match ---');
  const croci = normalizeExerciseName('CROCI AI CAVI SU PANCA INCLINATA');
  assert(/croci/i.test(croci.name_normalized), `Croci not collapsed to Panca (got: ${croci.name_normalized})`);
  const rdl = normalizeExerciseName('STACCO DA TERRA RUMENO');
  assert(/rumeno/i.test(rdl.name_normalized), `RDL preferred over generic deadlift (got: ${rdl.name_normalized})`);
  const crunch = normalizeExerciseName('CRUNCH AI CAVI');
  assert(/crunch/i.test(crunch.name_normalized), `Crunch not collapsed to Plank (got: ${crunch.name_normalized})`);
  const lento = normalizeExerciseName('LENTO AVANTI CON MANUBRI');
  assert(/manubri/i.test(lento.name_normalized), `Lento avanti manubri keeps dumbbells (got: ${lento.name_normalized})`);

  // --- GOLDEN PARSE ---
  console.log('\n--- GOLDEN: parseStructuredWorkbook ---');
  const wb = XLSX.readFile(GOLDEN);
  const parsed = parseStructuredWorkbook(wb, 'GIANMARIA LOI(2).xlsx');
  const prog = buildCanonicalProgram(parsed) || parsed.canonicalProgram;

  assert(prog && Array.isArray(prog.weeks), 'Canonical program has weeks');
  assert(prog.weeks.length === 1, `Training weeks = 1 (got ${prog.weeks.length})`);

  const sessions = prog.weeks[0].sessions || [];
  assert(sessions.length === 4, `Sessions = 4 (got ${sessions.length})`);

  let totalEx = 0;
  const exerciseNames = [];
  sessions.forEach(s => {
    const exs = s.exercises || s.rows || [];
    totalEx += exs.length;
    exs.forEach(e => exerciseNames.push(e.name_original || e.name || e.name_normalized || '?'));
  });
  assert(totalEx === 19, `Exercises = 19 (got ${totalEx})`);
  console.log('  Exercise names:');
  exerciseNames.forEach((n, i) => console.log(`    ${i + 1}. ${n}`));

  // Session vs exercise: no empty fake PUSH/PULL sessions from PULLDOWN
  const fakeSession = sessions.find(s => /^(PUSH|PULL)$/i.test(String(s.name || s.title || '').trim()));
  assert(!fakeSession, 'No fake PUSH/PULL sessions from PULLDOWN/PUSH DOWN misclassification');

  const nutr = prog.nutrition;
  assert(nutr && nutr.days && nutr.days.length === 7, `Nutrition days = 7 (got ${nutr?.days?.length})`);
  console.log('  Nutrition days:', nutr.days.map(d => d.name || d.day || d.label).join(', '));
  let meals = 0;
  nutr.days.forEach(d => { meals += (d.meals || []).length; });
  assert(meals === 35, `Nutrition meals = 35 (got ${meals})`);

  const supp = prog.supplementation;
  assert(supp && supp.items && supp.items.length === 8, `Supplements = 8 (got ${supp?.items?.length})`);
  console.log('  Supplements:', supp.items.map(i => i.name).join(', '));

  const therapy = prog.therapy;
  assert(therapy && therapy.medications && therapy.medications.length === 6, `Therapy meds = 6 (got ${therapy?.medications?.length})`);
  assert(therapy.protocols && therapy.protocols.length === 2, `Therapy blocks = 2 (got ${therapy?.protocols?.length})`);

  therapy.medications.forEach((m, i) => {
    console.log(`  Med ${i + 1}: ${m.name} | ${m.dose} | ${m.weekRange} | ${m.frequency} | days=${JSON.stringify(m.dayOfWeek)} | source=${m.daysSource}`);
  });

  const telm1 = therapy.medications.find(m => /telmisartan/i.test(m.name || m.medication) && /1\s*-\s*4/.test(m.weekRange));
  assert(telm1 && telm1.dayOfWeek.length === 7, 'Telmisartan W1-4: all 7 days (not Lunedì-only from Monitorare)');
  assert(telm1.frequency === 'Tutti i giorni', 'Telmisartan W1-4 frequency Tutti i giorni');

  const val = validateCanonicalProgram(prog);
  assert(val.valid === true, 'Golden program passes validateCanonicalProgram');

  // --- NEGATIVE: empty / corrupt ---
  console.log('\n--- NEGATIVE CASES ---');
  const emptyWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(emptyWb, XLSX.utils.aoa_to_sheet([[]]), 'VUOTO');
  const emptyParsed = parseStructuredWorkbook(emptyWb, 'empty.xlsx');
  const emptyProg = buildCanonicalProgram(emptyParsed);
  let emptyEx = 0;
  (emptyProg?.weeks || []).forEach(w => (w.sessions || []).forEach(s => { emptyEx += (s.exercises || s.rows || []).length; }));
  assert(emptyEx === 0, `Empty workbook yields 0 exercises (got ${emptyEx})`);
  const emptyVal = validateCanonicalProgram(emptyProg || { weeks: [] });
  // Empty may be invalid or valid-with-warnings — must not crash
  assert(typeof emptyVal.valid === 'boolean', 'Empty workbook validation returns boolean without throwing');

  const corrupt = JSON.parse(JSON.stringify(prog));
  corrupt.weeks[0].sessions[0].exercises[0].name = 'Gau`vG\u0001\u0002Bad';
  const corruptVal = validateCanonicalProgram(corrupt);
  assert(corruptVal.valid === false, 'Corrupted exercise name fails validation');

  // --- ACTIVATION + PERSISTENCE ---
  console.log('\n--- ACTIVATION / PERSISTENCE ---');
  const persistence = new GiammariaPersistenceEngine();
  await persistence.wipeDatabase();

  const act = await persistence.activateCanonicalProgram(prog);
  assert(act.success && act.id, `activateCanonicalProgram ok id=${act.id}`);
  assert(act.fingerprint, `fingerprint generated: ${act.fingerprint}`);

  const loaded = await persistence.loadActiveProgram();
  assert(loaded && (loaded.weeks || loaded.training?.weeks)?.length === 1, 'Read-back active program has 1 week');

  const loadedNutr = await persistence.getNutrition();
  assert(loadedNutr && loadedNutr.days.length === 7, 'Nutrition domain persisted with 7 days');
  const loadedSupp = await persistence.getSupplements();
  assert(loadedSupp && loadedSupp.items.length === 8, 'Supplements domain persisted');
  const loadedTher = await persistence.getTherapy();
  assert(loadedTher && loadedTher.medications.length === 6, 'Therapy domain persisted');

  // --- RESET SCOPES ---
  console.log('\n--- RESET SCOPES ---');
  await persistence.clearWorkoutLogs();
  const afterSoft = await persistence.loadActiveProgram();
  assert(afterSoft !== null, 'Soft clearWorkoutLogs preserves active program');
  assert((await persistence.getNutrition())?.days?.length === 7, 'Soft reset preserves nutrition');
  assert((await persistence.getTherapy())?.medications?.length === 6, 'Soft reset preserves therapy');
  assert((await persistence.getSupplements())?.items?.length === 8, 'Soft reset preserves supplements');

  await persistence.wipeDatabase();
  assert((await persistence.loadActiveProgram()) === null, 'Hard wipe clears programs');
  assert((await persistence.getNutrition()) === null, 'Hard wipe clears nutrition');
  assert((await persistence.getTherapy()) === null, 'Hard wipe clears therapy');
  assert((await persistence.getSupplements()) === null, 'Hard wipe clears supplements');

  // --- REVIEW COUNTERS ---
  console.log('\n--- REVIEW COUNTERS (canonical) ---');
  const w = prog.weeks.length;
  let s = 0, e = 0;
  prog.weeks.forEach(week => {
    const sess = week.sessions || week.days || [];
    s += sess.length;
    sess.forEach(se => { e += (se.exercises || se.rows || []).length; });
  });
  assert(w === 1 && s === 4 && e === 19, `Review counters 1W/4S/19E from canonical (got ${w}W/${s}S/${e}E)`);

  console.log('\n====================================================');
  console.log(`TOTAL: ${passCount + failCount} | PASS: ${passCount} | FAIL: ${failCount}`);
  if (failures.length) {
    console.log('FAILURES:');
    failures.forEach(f => console.log('  - ' + f));
  }
  console.log('====================================================');
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('FATAL', err);
  process.exit(1);
});
