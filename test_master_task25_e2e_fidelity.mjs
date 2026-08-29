import fs from 'fs';
import * as XLSX from 'xlsx';
import { parseStructuredWorkbook, validateCanonicalProgram } from './universal-import-engine.mjs';
import { GiammariaPersistenceEngine, STORES, deterministicSerialize, getDeterministicFingerprint } from './persistence-core.mjs';

console.log('====================================================');
console.log('GIAMMARIA SYSTEM — MASTER TASK 25 E2E FIDELITY SUITE');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

async function runSuite() {
  // TEST 1: Golden Excel Ingestion & Multi-Domain Data Fidelity
  console.log('--- TEST 1: Golden Excel Ingestion (GIANMARIA LOI(2).xlsx) ---');
  const xlsxPath = 'GIANMARIA LOI(2).xlsx';
  assert(fs.existsSync(xlsxPath), 'GIANMARIA LOI(2).xlsx exists in workspace');

  const buf = fs.readFileSync(xlsxPath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const parsed = parseStructuredWorkbook(wb, xlsxPath);
  const prog = parsed.canonicalProgram;

  assert(Boolean(prog), 'Canonical program generated');
  assert(prog.weeks && prog.weeks.length === 1, `Weeks count is 1 (got ${prog.weeks?.length})`);

  const sessions = prog.weeks[0]?.sessions || [];
  assert(sessions.length === 4, `Sessions count is 4 (got ${sessions.length})`);

  let totalEx = 0;
  sessions.forEach(s => totalEx += (s.exercises || []).length);
  assert(totalEx === 19, `Total exercises count is 19 (got ${totalEx})`);

  // Nutrition Fidelity: 7 days, 35 meals
  const nutr = prog.nutrition;
  assert(nutr && nutr.present === true, 'Nutrition domain is present');
  assert(nutr.days && nutr.days.length === 7, `Nutrition days count is 7 (got ${nutr.days?.length})`);
  
  let totalMeals = 0;
  nutr.days.forEach(d => totalMeals += (d.meals || []).length);
  assert(totalMeals === 35, `Total meals count across 7 days is 35 (got ${totalMeals})`);

  // Supplementation Fidelity: 8 items
  const supp = prog.supplementation;
  assert(supp && supp.present === true, 'Supplementation domain is present');
  assert(supp.items && supp.items.length === 8, `Supplement items count is 8 (got ${supp.items?.length})`);

  // Therapy Fidelity: 2 Blocks (Settimane 1-4, Settimane 5-8), 6 prescriptions total
  const therapy = prog.therapy;
  assert(therapy && therapy.present === true, 'Therapy domain is present');
  assert(therapy.medications && therapy.medications.length === 6, `Therapy medications count is 6 (got ${therapy.medications?.length})`);
  assert(therapy.protocols && therapy.protocols.length === 2, `Therapy multi-week protocol blocks count is 2 (got ${therapy.protocols?.length})`);

  // Check specific day frequency preservation — Telmisartan Block 1 notes say "Monitorare"
  // which must NOT be misread as Monday (MON). Source has no weekday → default all 7 days.
  const telmBlock1 = therapy.medications.find(m => /telmisartan/i.test(m.name || m.medication) && /1\s*-\s*4/.test(m.weekRange));
  assert(telmBlock1 && Array.isArray(telmBlock1.dayOfWeek) && telmBlock1.dayOfWeek.length === 7, 'Telmisartan Block 1 defaults to all 7 days (no weekday in source; Monitorare must not match MON)');
  assert(telmBlock1.frequency === 'Tutti i giorni', 'Telmisartan Block 1 frequency is Tutti i giorni');
  assert(!telmBlock1.daysSource || telmBlock1.daysSource === 'default_daily', 'Telmisartan Block 1 daysSource is default_daily');

  // Negative: "Monitorare" must never invent Lunedì-only
  assert(!(telmBlock1.dayOfWeek.length === 1 && telmBlock1.dayOfWeek[0] === 'Lunedì'), 'Telmisartan Block 1 must NOT be falsely mapped to Lunedì-only via Monitorare');

  // TEST 2: Validation Gate
  console.log('\n--- TEST 2: Import Validation Gate ---');
  const validRes = validateCanonicalProgram(prog);
  assert(validRes.valid === true && validRes.errors.length === 0, 'Golden Excel program passes Validation Gate with 0 errors');

  // Corrupted mock program validation
  const corruptProg = JSON.parse(JSON.stringify(prog));
  corruptProg.weeks[0].sessions[0].exercises[0].name = "Gau`vG\u0001\u0002CorruptedString";
  const corruptRes = validateCanonicalProgram(corruptProg);
  assert(corruptRes.valid === false && corruptRes.errors.length > 0, 'Validation Gate successfully rejects corrupted exercise strings');

  // TEST 3: Persistence Core 2.0 Fingerprinting & Storage
  console.log('\n--- TEST 3: Persistence Core 2.0 Operations ---');
  const persistence = new GiammariaPersistenceEngine();
  
  // Save program
  const saveRes = await persistence.saveProgram(prog, true, { version: 1 });
  assert(saveRes.success === true && Boolean(saveRes.id), `Program saved atomically with ID ${saveRes.id}`);
  assert(saveRes.fingerprint && saveRes.fingerprint.length > 8, `Deterministic fingerprint generated (${saveRes.fingerprint})`);

  // Load active program
  const loaded = await persistence.loadActiveProgram();
  assert(loaded !== null && loaded.weeks.length === 1 && loaded.weeks[0].sessions.length === 4, 'Loaded active program matches stored structure');

  // Save additional domain data
  await persistence.saveNutrition(prog.nutrition);
  await persistence.saveSupplements(prog.supplementation);
  await persistence.saveTherapy(prog.therapy);

  const loadedNutr = await persistence.getNutrition();
  assert(loadedNutr && loadedNutr.days.length === 7, 'Nutrition persisted and retrieved with 7 days');

  const loadedSupp = await persistence.getSupplements();
  assert(loadedSupp && loadedSupp.items.length === 8, 'Supplements persisted and retrieved with 8 items');

  const loadedTherapy = await persistence.getTherapy();
  assert(loadedTherapy && loadedTherapy.medications.length === 6, 'Therapy persisted and retrieved with 6 medications');

  // TEST 4: Workout Logs Reset
  console.log('\n--- TEST 4: Workout Logs Reset ---');
  await persistence.clearWorkoutLogs();
  const progAfterLogsReset = await persistence.loadActiveProgram();
  assert(progAfterLogsReset !== null && progAfterLogsReset.weeks.length === 1, 'Active program preserved intact after clearWorkoutLogs');

  // TEST 5: Hard Reset (Full DB Wipe)
  console.log('\n--- TEST 5: Hard Reset (wipeDatabase) ---');
  await persistence.wipeDatabase();
  const progAfterWipe = await persistence.loadActiveProgram();
  assert(progAfterWipe === null, 'All programs purged after wipeDatabase');

  const nutrAfterWipe = await persistence.getNutrition();
  assert(nutrAfterWipe === null, 'Nutrition store purged after wipeDatabase');

  const suppAfterWipe = await persistence.getSupplements();
  assert(suppAfterWipe === null, 'Supplements store purged after wipeDatabase');

  const therapyAfterWipe = await persistence.getTherapy();
  assert(therapyAfterWipe === null, 'Therapy store purged after wipeDatabase');

  // Print Summary
  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
