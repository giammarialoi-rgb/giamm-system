// La card di fine seduta: cosa ci finisce sopra, e cosa no.
//
// La composizione dei dati e' una funzione sola, con una lista chiusa di
// campi: e' il modo per essere sicuri che sull'immagine condivisa non arrivi
// mai un dato di salute per sbaglio. Qui la si ritaglia dalla pagina e la si
// fa girare su una seduta di esempio, con e senza record.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8').replace(/\r\n/g, '\n');
const BUILT = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8').replace(/\r\n/g, '\n');

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
function eq(actual, expected, message) {
  const a = actual !== null && typeof actual === 'object' ? JSON.stringify(actual) : actual;
  const b = expected !== null && typeof expected === 'object' ? JSON.stringify(expected) : expected;
  try { assert.equal(a, b); console.log('OK   ' + message); }
  catch (e) { failed++; console.log('FAIL ' + message + ' -- atteso ' + JSON.stringify(expected) + ', ottenuto ' + JSON.stringify(actual)); }
}
function grab(name) {
  const at = SRC.indexOf('function ' + name + '(');
  if (at < 0) return '';
  const NL = String.fromCharCode(10);
  const end = SRC.indexOf(NL + '}', at);
  return end < 0 ? '' : SRC.slice(at, end + 2) + NL;
}
function grabVar(name) {
  const at = SRC.indexOf('var ' + name + ' = {');
  const NL = String.fromCharCode(10);
  const end = SRC.indexOf(NL + '};', at);
  return at < 0 || end < 0 ? '' : SRC.slice(at, end + 3) + NL;
}

const slice = grabVar('SESSION_CARD_PR_LABEL') +
  ['formatKgIt', 'formatDurationIt', 'formatSessionCardDate', 'formatSessionCardPr', 'buildSessionCardData'].map(grab).join(String.fromCharCode(10));
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(slice, ctx);
const run = (code) => vm.runInContext(code, ctx);

console.log("");
console.log('--- 0. il blocco si ritaglia dal sorgente ---');
ok('0a. c\'e\' tutto', slice.length > 1500);
ok('0b. ed e\' nella pagina costruita', /function buildSessionCardData\(input\)/.test(BUILT) && /async function drawSessionCard\(canvas, card, style\)/.test(BUILT));

// Una seduta come la salva finalizeWorkout, con dentro anche cose che sulla
// card non devono arrivare (kcal, intensita', peso corporeo).
const LOG = {
  id: 'sess_1', at: '2026-09-22T18:42:10.000Z', finalizedAt: '2026-09-22T18:42:10.000Z',
  week: 3, day: 1, durationSec: 2895, kcal: 412, tonnage: 6240, intensity: 7310,
  sets: 24, exercises: 6, reps: 190, bw: 82.4,
  muscles: { PETTO: 9, SPALLE: 4, BRACCIA: 6, GAMBE: 0 }
};
ctx.LOG = LOG;

console.log("");
console.log('--- 1. con i record ---');
{
  ctx.PRS = [
    { type: 'weight', name: 'Panca piana', value: 85, week: 3, day: 1 },
    { type: 'reps', name: 'Rematore', value: 10, load: 60, week: 3, day: 1 },
    { type: 'e1rm', name: 'Panca piana', value: 107.7, week: 3, day: 1 },
    { type: 'boh', name: 'Cosa strana', value: 1 }
  ];
  const card = run('buildSessionCardData({ log: LOG, sessionName: "Upper A", athleteName: "  Giammaria  ", prs: PRS })');
  eq(card.title, 'Upper A', '1a. il nome della seduta');
  eq(card.weekDay, 'W3 · S2', '1b. settimana e seduta');
  eq(card.dateText, 'Martedì 22 settembre 2026', '1c. la data per esteso');
  eq(card.durationText, '48 min', '1d. la durata in minuti');
  eq(card.tonnageText, '6.240 kg', '1e. il volume con il punto delle migliaia');
  eq(card.sets, 24, '1f. le serie chiuse');
  eq(card.exercises, 6, '1g. gli esercizi');
  eq(card.athleteName, 'Giammaria', '1h. il nome, ripulito');
  eq(card.prs.length, 3, '1i. tre record: quello di tipo ignoto sparisce');
  eq(card.prs[0], { name: 'Panca piana', type: 'weight', label: 'Carico', value: '85 kg' }, '1j. il record di carico');
  eq(card.prs[1].value, '10 rip × 60 kg', '1k. quello di ripetizioni dice a che carico');
  eq(card.prs[2].value, '108 kg', '1l. e1RM arrotondato');
  eq(card.muscles, { PETTO: 9, SPALLE: 4, BRACCIA: 6 }, '1m. la mappa tiene solo i muscoli con serie');
  ctx.PRS2 = [
    { type: 'weight', name: 'Panca piana', value: 80, week: 3, day: 1 },
    { type: 'weight', name: 'Panca piana', value: 82.5, week: 3, day: 1 },
    { type: 'e1rm', name: 'Panca piana', value: 101, week: 3, day: 1 },
    { type: 'e1rm', name: 'Panca piana', value: 104.5, week: 3, day: 1 }
  ];
  const dd = run('buildSessionCardData({ log: LOG, prs: PRS2 })');
  eq(dd.prs.map(function (p) { return p.label + ' ' + p.value; }), ['Carico 83 kg', 'e1RM stimato 105 kg'], "1n. dentro la seduta conta un record per esercizio e tipo, il piu' alto");
}

console.log("");
console.log('--- 2. senza record, senza nome, senza mappa ---');
{
  const card = run('buildSessionCardData({ log: Object.assign({}, LOG, { muscles: { GAMBE: 0 } }), sessionName: "Lower", athleteName: "", prs: [] })');
  eq(card.prs, [], '2a. nessuna sezione record');
  eq(card.muscles, null, '2b. nessuna mappa: tutte le voci a zero');
  eq(card.athleteName, null, '2c. nessun nome se non l\'ha messo');
  const bare = run('buildSessionCardData({ log: { week: 1, day: 0, sets: 3 } })');
  eq(bare.title, 'Seduta 1', '2d. senza nome di seduta, un titolo di ripiego');
  eq(bare.durationText, '1 min', '2e. una durata a zero non si scrive come zero');
  eq(bare.tonnageText, '0 kg', '2f. volume zero');
  eq(bare.muscles, null, '2g. e niente mappa');
}

console.log("");
console.log('--- 3. mai dati di salute ---');
{
  const card = run('buildSessionCardData({ log: LOG, sessionName: "Upper A", athleteName: "G", prs: [] })');
  const keys = Object.keys(card);
  const forbidden = ['bw', 'bodyweight', 'weight', 'kcal', 'intensity', 'height', 'waist', 'exams', 'therapy', 'health', 'steps'];
  ok('3a. nessuna chiave di salute nella card: ' + keys.join(','), !forbidden.some(function (k) { return keys.indexOf(k) >= 0; }));
  const json = JSON.stringify(card);
  ok('3b. il peso corporeo del log (82.4) non compare da nessuna parte', json.indexOf('82.4') < 0);
  ok('3c. e nemmeno le kcal (412) o l\'intensita\' (7310)', json.indexOf('412') < 0 && json.indexOf('7310') < 0);
  const draw = grab('drawSessionCard');
  ok('3d. il canvas non legge bw, kcal, intensita\', misure', !/\b(bw|kcal|intensity|bodyweight|waist|exams|therapy)\b/.test(draw));
  ok('3e. e non legge store.health o store.bodyChecks', !/store\.(health|bodyChecks|bw)/.test(draw));
  ok('3f. niente streak, livelli, punti: ne\' sul canvas ne\' sulla schermata',
    !/streak|level|tier|xp\b|badge/i.test(draw) && !/streak|wco-xp|Livello|badge/i.test(grab('sessionCardOverlayHtml')));
}

console.log("");
console.log('--- 4. formato e condivisione ---');
{
  ok("4a. l'immagine e' 1080x1920", grab('drawSessionCard').indexOf('canvas.width = W;') >= 0 && grab('drawSessionCard').indexOf('canvas.height = H;') >= 0 && grab('drawSessionCard').indexOf('const W = 1080, H = 1920') >= 0 && SRC.indexOf('id="social-card-canvas" width="1080" height="1920"') >= 0);
  const share = grab('shareSessionCard');
  ok('4b. navigator.share con il file se c\'e\'', /navigator\.canShare\(\{ files: \[file\] \}\)/.test(share) && /navigator\.share\(\{ files: \[file\]/.test(share));
  ok('4c. altrimenti si scarica il PNG', /downloadBlobHelper\(blob, filename\)/.test(share));
  ok('4d. il nome del file dice di che giorno e\'', /'nurvan-seduta-' \+ String\(card\.at \|\| ''\)\.slice\(0, 10\) \+ suffix \+ '\.png'/.test(share));
  ok('4e. il logo in basso, con un ripiego a testo se non carica', /loadCardImage\('nurvan_logo\.png'(, \d+)?\)/.test(grab('drawSessionCard')) && /fillText\('NURVAN', W \/ 2, footerY \+ 60\)/.test(grab('drawSessionCard')));
}

console.log("");
console.log('--- 5. quando compare e da dove si riapre ---');
{
  ok('5a. dopo la finalizzazione, la card della seduta salvata', /function showWorkoutCompleteOverlay\(logEntry, awarded\) \{[\s\S]{0,400}sessionCardFor\(logEntry\.week, logEntry\.day, logEntry\)/.test(SRC));
  ok('5b. la card legge il log gia\' salvato, non ricalcola la seduta', /function findSessionLog\(week, day\)/.test(SRC) && /const entry = log \|\| findSessionLog\(week, day\);/.test(SRC));
  ok('5c. persist() e finalizeWorkout non sono stati toccati', /function persist\(\) \{\s*\n\s*ensureStoreIntegrity\(\);/.test(SRC) && /store\.logs\.push\(logEntry\);\s*\n\s*if \(store\.logs\.length > 400\)/.test(SRC));
  ok('5d. dallo storico: bottone CARD su ogni seduta', /onclick="openSessionCard\(' \+ hw \+ ',' \+ hd \+ '\)">CARD</.test(SRC));
  ok('5e. e dal riepilogo della seduta salvata', /onclick="openSessionCard\(' \+ week \+ ',' \+ day \+ '\)">CARD DELLA SEDUTA</.test(SRC));
  ok('5f. dallo storico, CHIUDI non fa partire le domande di fine seduta', /const fromFinalize = window\.__sessionCardMode !== 'history';[\s\S]{0,200}if \(!fromFinalize\) return;/.test(grab('closeWorkoutCompleteOverlay')));
  ok('5g. la mappa sulla schermata e\' quella delle statistiche, senza bottoni', /function sessionMuscleFigureHtml\(view, muscles\)/.test(SRC) && /pointer-events:none/.test(grab('sessionMuscleFigureHtml')));
  ok('5h. i record vengono dal motore, per seduta', /TAE\.sessionPRs\(TAE\.normalizeSets\(store, DATA\), week, day\)/.test(SRC));
  const eng = fs.readFileSync(path.join(root, 'web/training-analytics-engine.js'), 'utf8');
  ok('5i. e il motore li timbra con il giorno', /function sessionPRs\(sets, week, day\)/.test(eng) && /day: s\.day, kind: 'derived'/.test(eng));
}

console.log("");
console.log("--- 6. tre stili: scuro, su foto, vetro ---");
{
  const draw = grab('drawSessionCard');
  const flat = grab('drawSessionCardFlat');
  ok("6a. gli stili esistono e dark e' il ripiego",
    /var SESSION_CARD_STYLES = \[/.test(SRC) && /function normalizeSessionCardStyle\(style\)/.test(SRC) && /: 'dark';/.test(grab('normalizeSessionCardStyle')));
  ok("6b. negli stili trasparenti la tela parte vuota, niente sfondo",
    /main\.clearRect\(0, 0, W, H\)/.test(draw) && /if \(isDark\) \{\s*\n\s*const bg = ctx\.createLinearGradient/.test(draw));
  ok("6c. su foto: blocco in basso a sinistra, testo con ombra, niente record ne figure",
    /if \(isFlat\) return drawSessionCardFlat\(main, card, logo\);/.test(draw) && /shadowColor = 'rgba\(0,0,0,0\.75\)'/.test(flat) && /let y = H - 190 - blockH;/.test(flat) && !/prs|statsHotspots/.test(flat));
  ok("6d. vetro: pannello scuro semitrasparente dietro al blocco",
    /if \(isGlass\) \{\s*\n\s*main\.fillStyle = 'rgba\(8,8,8,0\.62\)'/.test(draw));
  ok("6e. il blocco del vetro si centra in verticale, cosi si sposta sulla foto senza tagli",
    /const offset = Math\.round\(\(H - blockH\) \/ 2 - blockTop\);/.test(draw) && /main\.drawImage\(work, 0, offset\)/.test(draw));
  ok("6f. la schermata offre i tre stili",
    /SESSION_CARD_STYLES\.map\(function \(st\)/.test(grab('sessionCardOverlayHtml')) && /shareWorkoutCardFromOverlay\(&#39;' \+ st\.id \+ '&#39;\)/.test(grab('sessionCardOverlayHtml')));
  const share = grab('shareSessionCard');
  ok("6g. e il nome del file dice quale",
    /'-' \+ \(style === 'glass' \? 'vetro' : 'trasparente'\)/.test(share));
  ok("6h. anche negli stili trasparenti niente dati di salute",
    !/\b(bw|kcal|intensity|bodyweight|waist|exams|therapy)\b/.test(draw + flat));
}

console.log("");
if (failed) { console.log(failed + ' test della card falliti.'); process.exit(1); }
console.log('Tutti i test della card passano.');
