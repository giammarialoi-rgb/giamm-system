// Training tables in the layouts real coaches send, rebuilt here with made-up
// numbers (the real files, measured with tools/import-corpus, stay out of git).
// Each workbook goes through the real importer (parseStructuredWorkbook), the
// way the app reads a picked file.
import { createRequire } from 'node:module';
import { parseStructuredWorkbook } from './universal-import-engine.mjs';
import { parseWorkbookTables } from './import-tables.mjs';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
globalThis.XLSX = XLSX;

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

// A sheet from rows; a cell may be { v, f, z } for a formula or a percent format.
function sheet(rows) {
  const ws = {};
  let maxC = 0;
  rows.forEach((row, r) => (row || []).forEach((val, c) => {
    if (val == null || val === '') return;
    maxC = Math.max(maxC, c);
    const addr = XLSX.utils.encode_cell({ r, c });
    if (typeof val === 'object') {
      ws[addr] = { t: typeof val.v === 'number' ? 'n' : 's', v: val.v, f: val.f, z: val.z };
    } else ws[addr] = { t: typeof val === 'number' ? 'n' : 's', v: val };
  }));
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: maxC } });
  return ws;
}
// Written to xlsx and read back the way the app reads a file (formulas kept, cached values formatted).
function workbook(sheets) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(([name, rows]) => XLSX.utils.book_append_sheet(wb, sheet(rows), name));
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return XLSX.read(buf, { type: 'buffer', cellFormula: true, cellDates: true });
}
const pct = (v) => ({ v, z: '0.00%' });
function program(wb) {
  const res = parseStructuredWorkbook(wb, 'test.xlsx');
  const p = res.canonicalProgram || res.program;
  return { p, weeks: (p.training && p.training.weeks) || p.weeks || [] };
}
const ex = (weeks, w, d, name) => ((weeks[w - 1] && (weeks[w - 1].sessions || [])[d - 1]) || { exercises: [] }).exercises.find((e) => (e.name_original || '').toLowerCase() === name.toLowerCase());
const loads = (e) => (e ? e.sets.map((s) => s.target_load) : []);

console.log('');
console.log('--- 1. italiano: "Carico (kg)" e % non finiscono nel RIR ---');
{
  const { weeks } = program(workbook([['Programma', [
    ['SETTIMANA 1'], ['GIORNO A'],
    ['Esercizio', 'Serie', 'Ripetizioni', '%1RM', 'Carico (kg)', 'Recupero'],
    ['Squat', 4, 5, 0.75, 105, '180"'],
    ['Curl bilanciere', 3, 10, null, 30, '60"'],
    [], ['GIORNO B'],
    ['Esercizio', 'Serie', 'Ripetizioni', '%1RM', 'Carico (kg)', 'Recupero'],
    ['Squat', 5, 3, 0.82, 115, '180"']
  ]]]));
  const sq = ex(weeks, 1, 1, 'Squat');
  ok('1a. lo squat ha 4 serie da 5 a 105 kg', sq && sq.sets.length === 4 && sq.sets[0].target_reps === '5' && sq.sets[0].target_load === 105);
  ok('1b. e il 75% del massimale', sq && sq.sets[0].percentage_1rm === 75);
  ok('1c. nessun RIR o RPE inventato (la scheda non li scrive)', sq && sq.sets.every((s) => s.target_rir == null && s.target_rpe == null) && sq.rir_target == null);
  const curl = ex(weeks, 1, 1, 'Curl bilanciere');
  ok('1d. il curl a 30 kg resta 30 kg, senza %', curl && curl.sets[0].target_load === 30 && curl.sets[0].percentage_1rm == null);
  ok('1e. GIORNO A e GIORNO B sono due giorni', weeks[0] && weeks[0].sessions.length === 2);
}

console.log('');
console.log('--- 2. inglese: massimali in alto, % e formula del carico ---');
{
  const rows = [
    ['12 week program'],
    ['Squat', 200], ['Bench press', 140], ['Deadlift', 240],
    ['Squat projected max', { v: 210, f: 'CEILING(B2+10,2.5)' }],
    [],
    ['Week 1', 'Exercise', '%', 'RPE', 'Weight', 'Sets', 'Reps'],
    ['Monday, 1 January', 'Squat', pct(0.7), null, { v: 147.5, f: 'CEILING($B$5*C8,2.5)' }, 5, 5],
    [null, 'Leg extensions', null, 'RPE 8', 'xxx', 3, '8 bis 10'],
    [null, 'Bench press', pct(0.65), null, { v: 92.5, f: 'CEILING($B$3*C10,2.5)' }, 4, 6],
    ['Wednesday, 3 January', 'Deadlift', pct(0.6), null, { v: 145, f: 'CEILING($B$4*C11,2.5)' }, 4, 4],
    ['Week 2', 'Exercise', '%', 'RPE', 'Weight', 'Sets', 'Reps'],
    ['Monday, 8 January', 'Squat', pct(0.75), null, { v: 157.5, f: 'CEILING($B$5*C13,2.5)' }, 5, 4]
  ];
  const wb = workbook([['Weeks 1-12', rows]]);
  const { p, weeks } = program(wb);
  ok('2a. due settimane, la prima di due giorni', weeks.length === 2 && weeks[0].sessions.length === 2);
  const sq = ex(weeks, 1, 1, 'Squat');
  ok('2b. squat 5x5 al 70% = 147.5 kg', sq && sq.sets.length === 5 && sq.sets[0].percentage_1rm === 70 && sq.sets[0].target_load === 147.5);
  ok('2c. il carico sa di essere una % del massimale previsto dello squat (letto dalla formula)', sq && sq.sets[0].percent_of && sq.sets[0].percent_of.lift === 'squat' && sq.sets[0].percent_of.value === 210);
  const le = ex(weeks, 1, 1, 'Leg extensions');
  ok('2d. leg extension: RPE 8, 3 serie da 8-10, nessun carico ("xxx")', le && le.sets.length === 3 && le.sets[0].target_rpe === 8 && le.sets[0].target_reps === '8-10' && le.sets[0].target_load == null);
  ok('2e. i massimali del programma arrivano con il programma', p.spreadsheet && p.spreadsheet.maxes && p.spreadsheet.maxes.squat && p.spreadsheet.maxes.squat.value === 210 && p.spreadsheet.maxes.bench.value === 140);
}

console.log('');
console.log('--- 3. settimane affiancate (una colonna di gruppi per settimana) ---');
{
  const hdr = ['Exercise', 'Sets', 'Reps', 'Intensity', 'Load', 'Sets', 'Reps', 'Intensity', 'Load'];
  const wb = workbook([['Weeks 1-2', [
    ['WEEK 1', null, null, null, null, 'WEEK 2'],
    hdr,
    ['Competition Squat', 3, 3, pct(0.8), 160, 4, 3, pct(0.82), 165],
    ['Competition Squat', 2, 5, pct(0.68), 135, 2, 5, pct(0.7), 140],
    ['SLDL', 4, 8, '8RPE', null, 4, 8, '8RPE', null],
    ['WEEK 1, Day 2'],
    hdr,
    ['Competition Bench', 4, 3, pct(0.8), 100, 5, 3, pct(0.82), 102.5]
  ]]]);
  const { weeks } = program(wb);
  ok('3a. due settimane da due giorni', weeks.length === 2 && weeks.every((w) => w.sessions.length === 2));
  const s1 = ex(weeks, 1, 1, 'Competition Squat');
  ok('3b. top set e back-off della stessa alzata: un esercizio, 3x3@80% poi 2x5@68%', s1 && s1.sets.length === 5 && s1.sets[0].percentage_1rm === 80 && s1.sets[4].target_reps === '5' && s1.sets[4].target_load === 135);
  const s2 = ex(weeks, 2, 1, 'Competition Squat');
  ok('3c. la settimana 2 legge le sue colonne', s2 && s2.sets.length === 6 && s2.sets[0].target_load === 165);
  ok('3d. "8RPE" nella colonna intensita\' e\' un RPE', (ex(weeks, 1, 1, 'SLDL') || {}).sets[0].target_rpe === 8);
  ok('3e. il giorno 2 si chiama "Day 2" anche nella settimana 2 (non "WEEK 1, Day 2")', weeks[1] && /^Day 2$/i.test(weeks[1].sessions[1].name));
}

console.log('');
console.log('--- 4. una riga per gruppo di serie (stile Sheiko) e righe di totale ---');
{
  const wb = workbook([['Max', [['Squat', 180], ['Bench', 120]]], ['#1', [
    [null, 'Week 1'],
    [null, 'Day 1', '%', 'Reps', 'Sets', 'Weight'],
    ['1', 'Bench press', pct(0.5), 5, 1, { v: 60, f: 'Max!B2*C3' }],
    [null, null, pct(0.6), 4, 2, 72.5],
    [null, null, pct(0.7), 3, 3, 85],
    ['2', 'Dumbbell fly', null, 10, 5, null],
    [],
    [null, 'Squat', null, 74, null, 10195],
    [null, 'Total', null, 286, null, 34545]
  ]]]);
  const { weeks } = program(wb);
  const b = ex(weeks, 1, 1, 'Bench press');
  ok('4a. panca: 1 + 2 + 3 serie con % e carichi propri', b && b.sets.length === 6 && b.sets[0].percentage_1rm === 50 && b.sets[5].target_load === 85 && b.sets[5].target_reps === '3');
  ok('4b. le croci: 5x10 senza carico', (ex(weeks, 1, 1, 'Dumbbell fly') || {}).sets.length === 5);
  ok('4c. le righe di totale (74 alzate, 10195 kg) non diventano esercizi', !ex(weeks, 1, 1, 'Squat') && !ex(weeks, 1, 1, 'Total'));
}

console.log('');
console.log('--- 5. colonne "Set 1 | Set 2" con carico e "x ripetizioni" (stile Candito) ---');
{
  const wb = workbook([['Week 1', [
    ['Week 1 - Conditioning'],
    ['Tuesday, September 1'],
    [null, null, 'Set 1', null, 'Set 2', null, 'Set 3'],
    ['Squat', 'Warm Up', 150, 'x6', 150, 'x6', 150, 'x6'],
    ['Optional Exercise 1', 'Warm Up'],
    ['Wednesday, September 2'],
    [null, null, 'Set 1', null, 'Set 2', null, 'Set 3'],
    ['Bench Press', 'Warm Up', 70, 'x10', 90, 'x8', 100, 'xMR10'],
    ['Machine Row', 'Warm Up', 'x10', 'x10', 'x8']
  ]]]);
  const { weeks } = program(wb);
  ok('5a. due giorni', weeks[0] && weeks[0].sessions.length === 2);
  ok('5b. squat 3x6 a 150', (ex(weeks, 1, 1, 'Squat') || {}).sets.length === 3 && loads(ex(weeks, 1, 1, 'Squat')).every((l) => l === 150));
  const bp = ex(weeks, 1, 2, 'Bench Press');
  ok('5c. panca serie per serie: 70x10, 90x8, 100 x max 10', bp && loads(bp).join(',') === '70,90,100' && bp.sets[2].target_reps === 'MR10');
  ok('5d. il rematore: 3 serie senza carico', (ex(weeks, 1, 2, 'Machine Row') || {}).sets.length === 3 && loads(ex(weeks, 1, 2, 'Machine Row')).every((l) => l == null));
  ok('5e. "Warm Up" e gli slot vuoti non sono esercizi', !ex(weeks, 1, 1, 'Optional Exercise 1') && !ex(weeks, 1, 1, 'Warm Up'));
}

console.log('');
console.log('--- 6. tedesco, e un file con due versioni alternative ---');
{
  const block = (days) => [
    [null, 'Woche 1'],
    ['Woche 1', 'Übung', '%', 'RPE', 'Last', 'Sätze', 'Wdh'],
    ['Tag 1', 'Kniebeuge', pct(0.5), null, 100, 1, 10],
    ['Sunday, 24 January', 'Kniebeuge', pct(0.55), null, 110, 1, 10],
    [null, 'keine Auswahl', null, 'RPE 8', 'xxx', 3, '7 bis 10'],
    ['Tag 3', 'Bankdrücken', pct(0.6), null, 75, 5, 5],
    ...(days === 4 ? [['Tag 4', 'Kreuzheben', pct(0.6), null, 130, 4, 4]] : [])
  ];
  const wb = workbook([['3 Tage-Version', block(3)], ['4 Tage-Version', block(4)]]);
  const { p, weeks } = program(wb);
  const kb = ex(weeks, 1, 1, 'Kniebeuge');
  ok('6a. la data sotto "Tag 1" non apre un altro giorno: 2 serie di squat', kb && kb.sets.length === 2 && kb.sets[1].percentage_1rm === 55);
  ok('6b. "keine Auswahl" (nessuna scelta) non e\' un esercizio', !ex(weeks, 1, 1, 'keine Auswahl'));
  ok('6c. importata la prima versione, la seconda segnalata', weeks[0].sessions.length === 2 && p.spreadsheet.alternatives.length === 1 && (p.unrecognised_elements || []).some((u) => /alternativi/.test(u.message || '')));
}

console.log('');
console.log('--- 7. lo stesso parser da solo: niente settimane inventate ---');
{
  const wb = workbook([['Note', [['Programma da definire con il coach'], ['Nessuna tabella qui']]]]);
  const res = parseWorkbookTables(wb, { XLSX });
  ok('7a. un foglio senza tabella non produce settimane', res.weeks.length === 0);
}

console.log('');
if (failed) { console.log(failed + ' controlli delle tabelle falliti.'); process.exit(1); }
console.log('Tutti i controlli delle tabelle passano.');
