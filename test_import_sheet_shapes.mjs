// Spreadsheet layouts met in real programs (LiftVault templates and others),
// rebuilt here as small workbooks - the real files are not in git - and the
// OCR shapes of printed sheets photographed with a phone.
//   1. "Exercise | Sets | Reps | ... | Wk1 ... Wk8": week columns to log in -> 8 weeks
//   2. phases side by side, each with its own exercise column, one set per row,
//      TARGET/ACHIEVED rows, an ACCESSORY column
//   3. "Work-up (load × reps)" cells built by formulas from the maxes, in lb
//   4. day titles over each table, "2x20, 2-3x3-4" in the reps column, "Failure", "8 each"
//   5. "Sets | Reps | Weight | Reps": the second Reps is a log, not another week;
//      a name with words instead of numbers ("Run | AM: 5-mile run")
//   6. nothing invented: no "8-10" when the reps are not written
//   7. OCR of printed sheets
import { createRequire } from 'node:module';
import { parseWorkbookTables, cleanOcrText } from './import-tables.mjs';
import { parseWeeklySchemeLadder, resolvePrescription } from './prescription-engine.mjs';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const sheet = (rows) => XLSX.utils.aoa_to_sheet(rows);
const book = (sheets) => { const wb = XLSX.utils.book_new(); Object.entries(sheets).forEach(([n, ws]) => XLSX.utils.book_append_sheet(wb, ws, n)); return wb; };
const read = (wb) => parseWorkbookTables(wb, { XLSX });
const reps = (ex) => ex.sets.map((s) => s.reps).join(' ');

console.log('--- 1. colonne settimana da compilare ---');
{
  const t = read(book({ Program: sheet([
    ['Day 1 - Chest'],
    ['Exercise', 'Sets', 'Reps', 'Rest', 'Technique', 'Wk1', 'Wk2', 'Wk3', 'Wk4', 'Wk5', 'Wk6', 'Wk7', 'Wk8'],
    ['Incline Bench', 3, '12, 10, 12', '90 sec', 'Final set: Rest-Pause'],
    ['Cable Fly', 3, '12, 12, 12', '90 sec'],
    [],
    ['Day 2 - Back'],
    ['Exercise', 'Sets', 'Reps', 'Rest', 'Technique', 'Wk1', 'Wk2', 'Wk3', 'Wk4', 'Wk5', 'Wk6', 'Wk7', 'Wk8'],
    ['Barbell Row', 3, '12, 10, 12', '90 sec']
  ]) }));
  ok('1a. otto settimane, due giorni', t.weeks.length === 8 && t.weeks.every((w) => w.sessions.length === 2));
  const inc = t.weeks[0].sessions[0].exercises[0];
  ok('1b. "12, 10, 12": una ripetizione per serie', reps(inc) === '12 10 12' && inc.sets[0].rest_seconds === 90);
  ok('1c. il titolo sopra la tabella e\' il giorno', t.weeks[0].sessions[1].name === 'Day 2 - Back');
  ok('1d. la tecnica resta come nota', /Rest-Pause/.test(inc.sets[0].notes || ''));
}

console.log('');
console.log('--- 2. fasi affiancate con la propria colonna esercizio ---');
{
  const t = read(book({ Main: sheet([
    ['', '', 'ACCUMULATION PHASE - WEEK 1', '', '', '', '', 'INTENSIFICATION PHASE - WEEK 2'],
    ['', '', 'EXERCISE', '% OF TRAINING MAX', 'REP', 'WEIGHT', '', 'EXERCISE', '% OF TRAINING MAX', 'REP', 'WEIGHT', 'ACCESSORY'],
    ['10s WAVE', 'DAY 1', 'BENCH', '60%', 5, 32.5, '', 'BENCH', '67.50%', 3, 37.5, 'SUPPLEMENTARY:'],
    ['', '', '', '60%', 5, 32.5, '', '', '67.50%', 3, 37.5, 'Triceps Dip'],
    ['', '', '', '60%', '5+', 32.5, '', '', 'TARGET:', 10, '', ''],
    ['', '', '', 'ACHIEVED:', '', 32.5, '', '', '', '', '', ''],
    ['', 'DAY 2', 'SQUAT', '60%', 5, 65, '', 'SQUAT', '67.50%', 3, 75, 'Romanian Deadlift']
  ]) }));
  ok('2a. due settimane da due giorni', t.weeks.length === 2 && t.weeks.every((w) => w.sessions.length === 2));
  const b1 = t.weeks[0].sessions[0].exercises[0];
  const b2 = t.weeks[1].sessions[0].exercises[0];
  ok('2b. una serie per riga; "5+" resta 5+', b1.name_original === 'BENCH' && reps(b1) === '5 5 5+' && b1.sets[0].percentage_1rm === 60 && b1.sets[0].load === 32.5);
  ok('2c. TARGET: e ACHIEVED: non sono serie', b2.sets.length === 2 && reps(b2) === '3 3');
  const acc = t.weeks.map((w) => w.sessions[0].exercises.map((e) => e.name_original));
  ok('2d. gli accessori in fondo al giorno, in ogni settimana, senza serie inventate', acc.every((names) => names[names.length - 1] === 'Triceps Dip') && t.weeks[0].sessions[0].exercises.slice(-1)[0].sets.length === 0);
  ok('2e. "SUPPLEMENTARY:" e\' un titolo, non un esercizio', !acc.flat().some((n) => /SUPPLEMENTARY/.test(n)));
}

console.log('');
console.log('--- 3. schemi in una cella, calcolati dai massimali, in libbre ---');
{
  const setup = sheet([['Lift', '1RM'], ['Snatch', 135], ['Back Squat', 245], [], ['Rounding', 5]]);
  const w1 = sheet([
    ['Day 1'],
    ['Exercise', 'Work-up (load × reps)', 'Log'],
    ['Snatch', '90×3, 95×3'],
    ['Back squat', '185×8, 185×6'],
    ['Sit-ups', 'reps: 25, 25']
  ]);
  w1.B3.f = 'ROUND(Setup!$B$2*0.65/Setup!$B$5,0)*Setup!$B$5&"×3"&", "&ROUND(Setup!$B$2*0.7/Setup!$B$5,0)*Setup!$B$5&"×3"';
  w1.B4.f = 'ROUND(Setup!$B$3*0.75/Setup!$B$5,0)*Setup!$B$5&"×8"&", "&ROUND(Setup!$B$3*0.75/Setup!$B$5,0)*Setup!$B$5&"×6"';
  const readMe = sheet([['Pick your rounding (5 for lb plates, 2.5 for kg plates).']]);
  const t = read(book({ 'Read Me': readMe, Setup: setup, 'Week 1': w1 }));
  const day = t.weeks[0].sessions[0];
  const sn = day.exercises[0];
  ok('3a. l\'intestazione non e\' un esercizio', day.exercises.length === 3 && sn.name_original === 'Snatch');
  ok('3b. un passo per serie, la % dalla formula e il massimale che legge', reps(sn) === '3 3' && sn.sets[0].percentage_1rm === 65 && sn.sets[1].percentage_1rm === 70 && sn.sets[0].percent_of && sn.sets[0].percent_of.lift === 'snatch');
  ok('3c. in libbre: carichi e massimali in kg, con l\'avviso', t.unit === 'lb' && sn.sets[0].load === 41 && t.warnings.some((w) => /libbre/.test(w)) && t.maxes.find((m) => m.lift === 'snatch').value === 61);
  ok('3d. back squat e\' lo squat', day.exercises[1].sets[0].percent_of && day.exercises[1].sets[0].percent_of.lift === 'squat');
  ok('3e. "reps: 25, 25": due serie da 25', reps(day.exercises[2]) === '25 25');
  const kgBook = book({ Inputs: sheet([['Do you track your weights in kilograms or pounds?'], ['', 'kg'], ['', '', '', 'lb']]), 'Week 1': w1 });
  ok('3f. la risposta "kg" del foglio vale piu\' di un "lb" in un elenco', read(kgBook).unit === 'kg');
}

console.log('');
console.log('--- 4. titoli dei giorni, gruppi nella colonna ripetizioni ---');
{
  const t = read(book({ Program: sheet([
    ['Push Workout'],
    ['Exercise', 'Sets', 'Reps', 'Coaching note', 'Weight used', 'Reps done'],
    ['Decline Press', '5-6', '2x20, 2-3x3-4, 1x6-8', 'Pump sets, then heavy'],
    ['Pec Minor Dip', 3, 'Failure'],
    ['Split Squat', 3, '8 each', 'Per leg.'],
    [],
    ['Legs Workout'],
    ['Exercise', 'Sets', 'Reps', 'Coaching note', 'Weight used', 'Reps done'],
    ['Spider Bar Squats', 6, '2x8, 3x3, 1x6-8']
  ]) }));
  const s = t.weeks[0].sessions;
  ok('4a. due giorni coi loro nomi', s.length === 2 && s[0].name === 'Push Workout' && s[1].name === 'Legs Workout');
  ok('4b. "2x20, 2-3x3-4, 1x6-8": i gruppi come scritti', reps(s[0].exercises[0]) === '20 20 3-4 3-4 6-8');
  ok('4c. "Failure" e\' MAX', reps(s[0].exercises[1]) === 'MAX MAX MAX');
  ok('4d. "8 each": 8, e la nota', reps(s[0].exercises[2]) === '8 8 8' && /each/.test(s[0].exercises[2].sets[0].notes || ''));
  ok('4e. "2x8, 3x3, 1x6-8"', reps(s[1].exercises[0]) === '8 8 3 3 3 6-8');
}

console.log('');
console.log('--- 5. colonne da compilare, righe senza numeri ---');
{
  const t = read(book({ 'Weeks 1-4': sheet([
    ['Week 1'],
    ['Monday - Run + Lower'],
    ['Exercise', 'Sets', 'Reps', 'Weight', 'Reps'],
    ['Run', 'AM: 5-mile run (easy)'],
    ['Leg Extensions', 5, '10-12'],
    ['Pull-Ups', 5, 'AMRAP'],
    ['100 Push-Ups'],
    [],
    ['Sunday - Rest'],
    ['Exercise', 'Sets', 'Reps', 'Weight', 'Reps'],
    ['Rest', 'Foam rolling, stretching']
  ]) }));
  const ex = t.weeks[0].sessions[0].exercises;
  ok('5a. "Weight | Reps" dopo la prescrizione: niente doppioni', ex.filter((e) => e.name_original === 'Leg Extensions').length === 1 && reps(ex.find((e) => e.name_original === 'Leg Extensions')) === '10-12 10-12 10-12 10-12 10-12');
  ok('5b. la corsa c\'e\', con la sua descrizione e senza serie inventate', ex[0].name_original === 'Run' && ex[0].sets.length === 0 && /5-mile/.test(ex[0].notes || ''));
  ok('5c. AMRAP resta AMRAP', reps(ex.find((e) => e.name_original === 'Pull-Ups')) === 'AMRAP AMRAP AMRAP AMRAP AMRAP');
  ok('5d. "100 Push-Ups": l\'esercizio c\'e\'', ex.some((e) => e.name_original === '100 Push-Ups'));
  ok('5e. il giorno di riposo non diventa un esercizio "Rest"', t.weeks[0].sessions.length === 1);
}

console.log('');
console.log('--- 6. niente valori inventati ---');
{
  const p = resolvePrescription({ sets: 3, name: 'Superset curl' });
  ok('6a. serie scritte, ripetizioni no: restano vuote (niente "8-10")', p && p.sets === 3 && p.reps == null);
}

console.log('');
console.log('--- 7. OCR di schede stampate ---');
{
  const lad = parseWeeklySchemeLadder('4X8-4X6-5X8-4X8-3X3+ 1XMAX');
  ok('7a. "...-3X3+ 1XMAX": l\'ultimo passo e\' una settimana con due blocchi', lad && lad.week_count === 5 && lad.weekly_schemes[4].raw === '3x3+1xMAX');
  const c = cleanOcrText([
    'POLISPORTIV = _%',
    'GIORNO 1',
    'i *LEG CURL:4X8-5X8',
    'PULLEY BASSO: 4X10-4X12-5X8.',
    'AX10-4X12-5X0-4X12-5X10-4X8-3%10',
    'SLANCI Al CAVI: 4X1 5-4X20',
    'FRENCH PRESS MANUBRI SEDUTA SU',
    'PANCA:4X12',
    'SALZATE LATERALI:3X20',
    'ABS: SIT UP SS LEG RAISE: 3X15 AUMENTA',
    ': 1 SERIE A SETTIMANA',
    'REMATORE: 4X10-4X12- |',
    '5X10-4X8',
    'BODY BUILDING-,'
  ].join('\n')).split('\n');
  ok('7b. il logo non resta', !c.some((l) => /POLISPORTIV|BODY BUILDING/.test(l)));
  ok('7c. "i *" davanti al nome se ne va', c.includes('LEG CURL:4X8-5X8'));
  ok('7d. una riga di sola scala finisce quella sopra, con % e A letti bene', c.includes('PULLEY BASSO: 4X10-4X12-5X8-4X10-4X12-5X0-4X12-5X10-4X8-3X10'));
  ok('7e. "Al" e\' "AI", "4X1 5" e\' 4X15', c.includes('SLANCI AI CAVI: 4X15-4X20'));
  ok('7f. un nome spezzato dopo "SU" si ricompone', c.includes('FRENCH PRESS MANUBRI SEDUTA SU PANCA:4X12'));
  ok('7g. una S incollata dal pallino se ne va', c.includes('ALZATE LATERALI:3X20'));
  ok('7h. ": 1 SERIE A SETTIMANA" continua la riga sopra', c.some((l) => /AUMENTA : 1 SERIE A SETTIMANA$/.test(l)));
  ok('7i. " |" nella scala non la spezza', c.includes('REMATORE: 4X10-4X12-5X10-4X8'));
}

console.log('');
if (failed) { console.log(failed + ' controlli delle forme di scheda falliti.'); process.exit(1); }
console.log('Tutti i controlli delle forme di scheda passano.');
