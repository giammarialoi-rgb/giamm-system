// Training tables in the layouts real coaches send, rebuilt here with made-up
// numbers (the real files, measured with tools/import-corpus, stay out of git).
// Each workbook goes through the real importer (parseStructuredWorkbook), the
// way the app reads a picked file.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { parseStructuredWorkbook, parseCanonicalProgramFromText } from './universal-import-engine.mjs';
import { parseWorkbookTables, parseSetLine, reflowOcrColumns, mergeOcrHeadings, cleanOcrText, schemeLineKey } from './import-tables.mjs';
import { applyPrescriptionsToProgram, enforceAllPrescriptions } from './prescription-engine.mjs';

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
console.log('--- 8. testo libero (Word, PDF): scale di carichi, gruppi, progressioni ---');
{
  const text = [
    'GIORNO 1',
    'STACCHI: 8X3 @150KG +10KG X WEEK',
    'PANCA: 3X3 AL 60% DISCESA 8" +5X1 80% CON FERMO 1"',
    'ADDUTTORI 3X12',
    'GIORNO 2',
    'stacco:120x8/150x5/180x4/200x3/210x3/3/3',
    'alzate lat cavi: 13,5x12/12/12',
    'PANCA SLINGSHOT: 160KG X 1 X 3'
  ].join('\n');
  const parsed = parseCanonicalProgramFromText(text, 'SCHEDA 3 SETTIMANE.doc');
  const p = parsed.canonicalProgram || parsed.program || parsed;
  applyPrescriptionsToProgram(p, text);
  enforceAllPrescriptions(p);
  const w = p.weeks;
  ok('8a. "3 SETTIMANE" nel nome: 3 settimane da 2 giorni', w.length === 3 && w[0].sessions.length === 2);
  const st = (wi) => ex(w, wi, 1, 'STACCHI');
  ok('8b. +10 kg a settimana: 150, 160, 170', st(1) && st(1).sets[0].target_load === 150 && st(2).sets[0].target_load === 160 && st(3).sets.every((s) => s.target_load === 170));
  const panca = ex(w, 1, 1, 'PANCA');
  ok('8c. "3X3 AL 60% + 5X1 80%": un esercizio, 3 serie al 60% e 5 all\'80%', panca && panca.sets.length === 8 && panca.sets[0].percentage_1rm === 60 && panca.sets[7].percentage_1rm === 80 && panca.sets[7].target_reps === '1');
  ok('8d. "AL 60%" non diventa un esercizio', !w[0].sessions[0].exercises.some((e) => /^AL 60/i.test(e.name_original || '')));
  const add = ex(w, 1, 1, 'ADDUTTORI');
  ok('8e. adduttori 3x12 senza RIR/RPE inventati', add && add.sets.length === 3 && add.sets.every((s) => s.target_rir == null && s.target_rpe == null));
  const lad = ex(w, 1, 2, 'stacco');
  ok('8f. scala 120x8/150x5/180x4/200x3/210x3/3/3: 7 serie, le ultime due a 210', lad && lad.sets.length === 7 && lad.sets[1].target_load === 150 && lad.sets[6].target_load === 210 && lad.sets[6].target_reps === '3');
  ok('8g. 13,5x12/12/12: 3 serie da 12 a 13,5 kg', (ex(w, 1, 2, 'alzate lat cavi') || {}).sets.every((s) => s.target_load === 13.5 && s.target_reps === '12'));
  const sl = ex(w, 1, 2, 'PANCA SLINGSHOT');
  ok('8h. 160KG X 1 X 3: 3 singole a 160', sl && sl.sets.length === 3 && sl.sets[0].target_reps === '1' && sl.sets[0].target_load === 160);
  ok('8i. le righe da sole', parseSetLine('4X3 50% + 3X2 RPE 8').groups[1].rpe === 8 && parseSetLine('+2,5KG NELLA % A SETT ALTERNE').progression.unit === '%' && parseSetLine('ADDUTTORI 3X12') === null);
}

console.log('');
console.log('--- 9. foto: due colonne, titoli in riquadri colorati, cosa fa l\'OCR agli elenchi ---');
{
  // Two columns of words laid out as Tesseract returns them (boxes in px).
  const words = [];
  const put = (text, x, y) => text.split(' ').forEach((t, i) => words.push({ text: t, bbox: { x0: x + i * 70, y0: y, x1: x + i * 70 + 60, y1: y + 20 } }));
  put('Giorno 1', 40, 100);
  put('squat: 5x5', 40, 140); put('pullover cavi: 3x12', 660, 140);
  put('panca piana: 4x8', 40, 180); put('hack squat: 4x10', 660, 180);
  put('rematore: 3x10', 40, 220); put('leg curl: 3x12', 660, 220);
  put('curl: 3x12', 40, 260); put('calf: 4x20', 660, 260);
  put('dips: 3x8', 40, 300); put('plank: 3x60s', 660, 300);
  const reflowed = reflowOcrColumns(words);
  ok('9a. le colonne si leggono una dopo l\'altra, non riga per riga attraverso la pagina', reflowed && reflowed.split('\n')[1] === 'squat: 5x5' && reflowed.indexOf('dips: 3x8') < reflowed.indexOf('pullover cavi: 3x12'));
  // "Giorno 2" in a coloured box: lost on the first pass, read on the second (at 2x).
  const second = [{ text: 'Giorno', bbox: { x0: 1320, y0: 200, x1: 1440, y1: 240 } }, { text: '2', bbox: { x0: 1460, y0: 200, x1: 1480, y1: 240 } }];
  const merged = mergeOcrHeadings(words, second, 2);
  const withHeading = reflowOcrColumns(merged);
  ok('9b. il titolo letto nel secondo passaggio torna al suo posto, in testa alla colonna destra', withHeading && /dips: 3x8\nGIORNO 2\npullover cavi/.test(withHeading));
  ok('9c. un titolo gia\' letto non viene duplicato', mergeOcrHeadings(words, [{ text: 'Giorno', bbox: { x0: 40, y0: 100, x1: 100, y1: 120 } }, { text: '1', bbox: { x0: 110, y0: 100, x1: 120, y1: 120 } }]).length === words.length);
  const cleaned = cleanOcrText([
    'Glomo2',
    'ealzate laterali : 3x10-4x10-5x10-',
    '3x12-4x12 1\'rec',
    'e panca piana: 5x5 difficoltà 8',
    'su 10 + 2,5kg x week',
    '*LAT MACHINE PRESA PULLEY',
    'LARGO 10-10-8-6',
    '®pulley basso: 5xB',
    'hip thrust machine 4x10'
  ].join('\n')).split('\n');
  ok('9d. "Glomo2" e\' GIORNO 2', cleaned[0] === 'GIORNO 2');
  ok('9e. il pallino letto come "e" non fa parte del nome, e la scala spezzata si ricompone', cleaned[1] === 'alzate laterali : 3x10-4x10-5x10-3x12-4x12 1\'rec');
  ok('9f. "difficolta\' 8" / "su 10" e\' una frase sola', cleaned[2] === 'panca piana: 5x5 difficoltà 8 su 10 + 2,5kg x week');
  ok('9g. nome spezzato su due righe in maiuscolo: una riga', cleaned[3] === 'LAT MACHINE PRESA PULLEY LARGO 10-10-8-6');
  ok('9h. "5xB" e\' 5x8, "®" e\' un pallino', cleaned[4] === 'pulley basso: 5x8');
  ok('9i. un esercizio nuovo senza pallino resta un esercizio nuovo', cleaned[5] === 'hip thrust machine 4x10');
  const lad = parseSetLine('PANCA PIANA (FERMO AL PETTO) 10-8-6 POI 3X3 BOARD @8');
  ok('9j. "10-8-6 POI 3X3 @8": tre serie a scalare e 3x3 a RPE 8', lad && lad.groups.map((g) => g.sets + 'x' + g.reps + (g.rpe ? '@' + g.rpe : '')).join(' ') === '1x10 1x8 1x6 3x3@8');
  ok('9k. "7x5 difficolta\' 8 su 10" e\' RPE 8; il tempo 3-0-1 non e\' una scala di ripetizioni', parseSetLine('Squat hack: 7x5 difficoltà 8 su 10').groups[0].rpe === 8 && parseSetLine('Tempo 3-0-1') === null);
}

console.log('');
console.log('--- 10. una progressione settimanale scritta su una riga (Word, foto) diventa le settimane ---');
{
  const weeksOf = (text, file = 'scheda.docx') => {
    const parsed = parseCanonicalProgramFromText(text, file);
    const p = parsed.canonicalProgram || parsed.program || parsed;
    applyPrescriptionsToProgram(p, text);
    enforceAllPrescriptions(p);
    return p.weeks || [];
  };
  const series = (weeks, name, day = 1) => weeks.map((w) => {
    const e = ((w.sessions[day - 1] || {}).exercises || []).find((x) => (x.name_original || '').toLowerCase().startsWith(name.toLowerCase()));
    return e ? e.sets.length + 'x' + e.sets[0].target_reps + (e.sets[0].target_load != null ? '@' + e.sets[0].target_load : '') : '-';
  }).join(' ');
  const six = '3x10 4x10 5x10 3x8 4x8 5x8';
  ok('10a. trattini: 3x10-4x10-5x10-3x8-4x8-5x8 = sei settimane, una per schema', series(weeksOf('GIORNO 1\nPanca: 3x10-4x10-5x10-3x8-4x8-5x8\nCurl: 3x12'), 'Panca') === six);
  ok('10b. l\'esercizio senza progressione si ripete uguale ogni settimana', series(weeksOf('GIORNO 1\nPanca: 3x10-4x10-5x10-3x8-4x8-5x8\nCurl: 3x12'), 'Curl') === '3x12 3x12 3x12 3x12 3x12 3x12');
  ok('10c. anche di sole tre settimane', series(weeksOf('GIORNO 1\nPanca: 3x10-4x10-5x10'), 'Panca') === '3x10 4x10 5x10');
  ok('10d. con barre, virgole, frecce, spazi', ['3x10/4x10/5x10/3x8/4x8/5x8', '3x10, 4x10, 5x10, 3x8, 4x8, 5x8', '3x10 > 4x10 > 5x10 > 3x8 > 4x8 > 5x8', '3x10 - 4x10 - 5x10 - 3x8 - 4x8 - 5x8']
    .every((l) => series(weeksOf('GIORNO 1\nPanca: ' + l), 'Panca') === six));
  ok('10e. "3x10/4x10/..." non e\' una scala di carichi (niente "3 kg")', series(weeksOf('GIORNO 1\nPanca: 3x10/4x10/5x10'), 'Panca') === '3x10 4x10 5x10');
  ok('10f. con il carico di ogni settimana', series(weeksOf('GIORNO 1\nPanca: 3x10 60kg - 4x10 62,5kg - 5x10 65kg - 3x8 70kg'), 'Panca') === '3x10@60 4x10@62.5 5x10@65 3x8@70');
  const named = weeksOf('GIORNO 1\nPanca: settimana 1 3x10, settimana 2 4x10, settimana 3 5x10');
  ok('10g. "settimana 1 3x10, settimana 2 4x10, ...": un esercizio "Panca", tre settimane', series(named, 'Panca') === '3x10 4x10 5x10' && named[0].sessions[0].exercises.length === 1 && named[0].sessions[0].exercises[0].name_original === 'Panca');
  const two = weeksOf('GIORNO 1\nPanca: 3x10-4x10-5x10-3x8\nGIORNO 2\nSquat: 3x8-4x8-5x8-3x6\nLeg curl 3x12');
  ok('10h. progressioni diverse in giorni diversi', series(two, 'Panca', 1) === '3x10 4x10 5x10 3x8' && series(two, 'Squat', 2) === '3x8 4x8 5x8 3x6');
  const wave = weeksOf('SCHEDA 8 SETTIMANE\nGIORNO 1\nPanca: 3x10-4x10-5x10-3x8');
  ok('10i. programma di 8 settimane con progressione di 4: la progressione riparte, e l\'esercizio lo dice', series(wave, 'Panca') === '3x10 4x10 5x10 3x8 3x10 4x10 5x10 3x8' && /ripetuta/.test(wave[5].sessions[0].exercises[0].notes || ''));
  ok('10j. "5x5 + 2x8" resta la stessa seduta, non due settimane', weeksOf('GIORNO 1\nPressa: 5x5 + 2x8').length === 1);
  const sixNamed = weeksOf('GIORNO 1\nPanca: 3x10\nGIORNO 2\nSquat: settimana 1 4x6, settimana 2 5x6, settimana 3 6x6, settimana 4 4x5, settimana 5 5x5, settimana 6 6x5');
  ok('10k. sei settimane nominate su una riga lunga: non e\' una nota, il giorno 2 resta', series(sixNamed, 'Squat', 2) === '4x6 5x6 6x6 4x5 5x5 6x5');

  // The person decides: weeks or one session, line by line.
  const text = 'GIORNO 1\nPanca: 3x10, 4x10, 5x10, 3x8\nPressa: 5x5 + 2x8\nCurl: 3x12';
  const read = (choices) => {
    const parsed = parseCanonicalProgramFromText(text, 'scheda.docx', { schemeChoices: choices || {} });
    const p = parsed.canonicalProgram || parsed.program || parsed;
    applyPrescriptionsToProgram(p, text);
    enforceAllPrescriptions(p);
    return p;
  };
  const proposed = read();
  const list = proposed.scheme_choices || [];
  ok('10l. le righe con piu\' schemi sono elencate con la proposta: panca a settimane, pressa nella stessa seduta',
    list.length === 2 && list[0].name === 'Panca' && list[0].choice === 'weekly' && list[1].name === 'Pressa' && list[1].choice === 'session'
    && list[0].weeklyText === '3x10 → 4x10 → 5x10 → 3x8' && list[1].sessionText === '5x5 + 2x8');
  const kP = schemeLineKey('Panca: 3x10, 4x10, 5x10, 3x8');
  const kR = schemeLineKey('Pressa: 5x5 + 2x8');
  ok('10m. la chiave di una riga non dipende da pallini e spazi', schemeLineKey('- Panca:  3x10, 4x10,  5x10, 3x8') === kP);
  const oneSession = read({ [kP]: 'session' });
  ok('10n. scelta "stessa seduta": una settimana, la panca con 3+4+5+3 serie', oneSession.weeks.length === 1 && series(oneSession.weeks, 'Panca') === '15x10' && oneSession.weeks[0].sessions[0].exercises[0].sets[14].target_reps === '8');
  const pressWeeks = read({ [kR]: 'weekly' });
  ok('10o. scelta "una settimana per schema" su "5x5 + 2x8": la pressa cambia di settimana in settimana', series(pressWeeks.weeks, 'Pressa') === '5x5 2x8 5x5 2x8');
  ok('10p. la scelta resta scritta nell\'elenco', (read({ [kP]: 'session' }).scheme_choices || [])[0].choice === 'session');
  const page = fs.readFileSync(new URL('./web/index.base.html', import.meta.url), 'utf8');
  ok('10q. nella revisione dell\'import: la scheda delle scelte, e il testo del file tenuto per rileggerlo (Word, PDF, foto, testo)',
    /return schemeChoicesCardHtml\(prog\) \+ `/.test(page) && /pState\.importParseText = parseTextForChoices;/.test(page)
    && (page.match(/parseTextForChoices = /g) || []).length >= 6 && /parseCanonicalProgramFromText\(ps\.importParseText, ps\.filename \|\| 'documento', \{ schemeChoices: ps\.schemeChoices \|\| \{\} \}\)/.test(page));
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
