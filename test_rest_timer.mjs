// Il recupero: dall'orologio, non da un contatore.
//
// Tre cose devono tornare. Il tempo che manca si legge dal timestamp di fine,
// cosi' quaranta secondi in background sono quaranta secondi anche senza un
// solo tick. Il recupero passato davvero fra due serie si misura dalle due
// chiusure, e alla prima serie non c'e'. E l'etichetta per il coach si
// accende solo quando lo scarto dal prescritto supera la soglia in almeno
// meta' delle serie misurate.
//
// Le funzioni vivono dentro la pagina: qui vengono ritagliate dal sorgente e
// fatte girare da sole, cosi' il controllo e' su quello che gira davvero.
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
  catch (e) { failed++; console.log('FAIL ' + message + '\n     atteso ' + JSON.stringify(expected) + ', ottenuto ' + JSON.stringify(actual)); }
}
function grab(name) {
  const at = SRC.indexOf('function ' + name + '(');
  if (at < 0) return '';
  const end = SRC.indexOf('\n}', at);
  return end < 0 ? '' : SRC.slice(at, end + 2) + '\n';
}

const slice = 'var REST_DEVIATION_THRESHOLD_SEC = 20;' + String.fromCharCode(10) +
  ['parseRestSeconds', 'timerRemainingSeconds', 'actualRestSeconds', 'formatRestClock',
    'restDeviationSummary', 'restOverrides', 'restOverrideFor', 'adjustRestOverride',
    'clearRestOverrides', 'effectiveRestSeconds'].map(grab).join('\n');

const ctx = { console, window: {} };
vm.createContext(ctx);
vm.runInContext(slice, ctx);
const run = (code) => vm.runInContext(code, ctx);

console.log('\n--- 0. le funzioni si ritagliano dal sorgente ---');
ok('0a. il blocco c\'e\' tutto', slice.length > 2000);
ok('0b. ed e\' nella pagina costruita', /function timerRemainingSeconds\(endsAt, now\)/.test(BUILT));

console.log('\n--- 1. il tempo che manca viene dall\'orologio ---');
{
  const t0 = 1_700_000_000_000;
  const endsAt = t0 + 90 * 1000;
  eq(run(`timerRemainingSeconds(${endsAt}, ${t0})`), 90, '1a. appena partito, 90 secondi');
  eq(run(`timerRemainingSeconds(${endsAt}, ${t0 + 40 * 1000})`), 50, '1b. quaranta secondi in background: al ritorno ne mancano 50, nessun tick necessario');
  eq(run(`timerRemainingSeconds(${endsAt}, ${t0 + 90 * 1000})`), 0, '1c. allo scadere, zero');
  eq(run(`timerRemainingSeconds(${endsAt}, ${t0 + 300 * 1000})`), 0, '1d. e cinque minuti dopo ancora zero, non un numero negativo');
  eq(run(`timerRemainingSeconds(${endsAt}, ${t0 + 400})`), 90, '1e. si arrotonda verso l\'alto: a 0,4 s dalla partenza si legge ancora 90');
  ok('1f. il tick ridisegna dallo stato, non decrementa un contatore', !/sec--/.test(grab('renderRestTimer')) && /timerRemainingSeconds\(/.test(grab('renderRestTimer')));
  ok('1g. e al ritorno in primo piano si ridisegna subito',
    /visibilityState === 'visible' && restTimerState\(\)\) renderRestTimer\(\)/.test(SRC));
}

console.log('\n--- 2. il recupero scritto nella scheda si legge com\'e\' scritto ---');
{
  eq(run(`parseRestSeconds('90s')`), 90, '2a. "90s"');
  eq(run(`parseRestSeconds('2 min')`), 120, '2b. "2 min"');
  eq(run(`parseRestSeconds('60-90s')`), 90, '2c. "60-90s": conta l\'ultimo');
  eq(run(`parseRestSeconds('1.5 min')`), 90, '2d. "1.5 min"');
  eq(run(`parseRestSeconds('')`), 90, '2e. vuoto: novanta, come prima');
  eq(run(`parseRestSeconds('boh', 60)`), 60, '2f. e il fallback si puo\' scegliere');
  eq(run(`formatRestClock(120)`), '02:00', '2g. due minuti si scrivono 02:00');
}

console.log('\n--- 3. il recupero passato davvero ---');
{
  const a = 1_700_000_000_000;
  eq(run(`actualRestSeconds(${a}, ${a + 120 * 1000})`), 120, '3a. due minuti fra due chiusure: 120');
  eq(run(`actualRestSeconds(${a}, ${a + 87 * 400})`), 35, '3b. si arrotonda al secondo');
  eq(run(`actualRestSeconds(null, ${a})`), null, '3c. senza la chiusura precedente non c\'e\' niente da misurare');
  eq(run(`actualRestSeconds(${a + 5000}, ${a})`), null, '3d. e se l\'ordine non torna, nemmeno');
  ok('3e. la prima serie non riceve mai un valore: si misura solo da prevSetKey',
    /if \(prevSetKey && store\.data\[prevSetKey \+ '_done'\] && store\.data\[prevSetKey \+ '_done_at'\]\)/.test(SRC));
  ok('3f. e riaprire una serie cancella la sua ora e il suo recupero',
    /delete store\.data\[k \+ '_done_at'\];\s*\n\s*delete store\.data\[k \+ '_rest_actual'\];/.test(SRC));
  ok('3g. il valore entra nel diario col meccanismo di sempre: store.data e poi persist()',
    /store\.data\[k \+ '_rest_actual'\] = actual;[\s\S]{0,60}persist\(\);/.test(SRC));
}

console.log('\n--- 4. l\'etichetta per il coach ---');
{
  eq(run(`restDeviationSummary(90, [120]) && restDeviationSummary(90, [120]).label`), 'recupero +30 s medio',
    '4a. due serie chiuse a due minuti con prescritto 90: "+30 s"');
  eq(run(`restDeviationSummary(90, [95, 100, 85, 110])`), null, '4b. recuperi tutti entro ±20 s: nessuna etichetta');
  eq(run(`restDeviationSummary(90, [130, 92, 88, 125]).label`), 'recupero +19 s medio',
    '4c. meta\' delle serie oltre soglia: etichetta, con la media su tutte');
  eq(run(`restDeviationSummary(90, [130, 92, 88, 91])`), null, '4d. una su quattro oltre soglia: niente');
  eq(run(`restDeviationSummary(120, [80, 84]).label`), 'recupero −38 s medio', '4e. e lo scarto in meno si dice in meno');
  eq(run(`restDeviationSummary(90, [])`), null, '4f. senza serie misurate, niente');
  eq(run(`restDeviationSummary(0, [120])`), null, '4g. e senza un prescritto, niente da confrontare');
  eq(run(`restDeviationSummary(90, [110])`), null, '4h. venti secondi esatti non sono oltre la soglia');
  eq(run(`restDeviationSummary(90, [111]).label`), 'recupero +21 s medio', '4i. ventuno sì');
  ok('4j. e nella vista seduta l\'etichetta compare solo al coach', /store && store\.coachViewingClient\)\s*\n\s*\? restDeviationSummary\(/.test(SRC));
  ok('4k. senza colori: e\' un\'indicazione', /coachRestNote\.label\)\}[^`]*color:#666/.test(SRC) && !/coachRestNote[^\n]*accent-red/.test(SRC));
}

console.log('\n--- 5. l\'override vale per la seduta e non si ricorda ---');
{
  run('clearRestOverrides()');
  eq(run(`effectiveRestSeconds('90s', 'w1_d0_e2')`), 90, '5a. senza override, il prescritto');
  run(`adjustRestOverride('w1_d0_e2', 10, 90); adjustRestOverride('w1_d0_e2', 10, 90); adjustRestOverride('w1_d0_e2', 10, 90)`);
  eq(run(`effectiveRestSeconds('90s', 'w1_d0_e2')`), 120, '5b. tre volte +10: la serie dopo parte da 2:00');
  eq(run(`effectiveRestSeconds('90s', 'w1_d0_e3')`), 90, '5c. l\'esercizio accanto non ne sa niente');
  eq(run(`effectiveRestSeconds('90s', 'w1_d1_e2')`), 90, '5d. e nemmeno lo stesso esercizio in un\'altra seduta');
  run(`adjustRestOverride('w1_d0_e2', -200, 90)`);
  eq(run(`effectiveRestSeconds('90s', 'w1_d0_e2')`), 10, '5e. non si scende sotto i dieci secondi');
  run('clearRestOverrides()');
  eq(run(`effectiveRestSeconds('90s', 'w1_d0_e2')`), 90, '5f. chiusa la seduta, torna il prescritto');
  ok('5g. vive in window, non nello store: un reload lo azzera da solo',
    /window\.__restOverrides = \{\}/.test(SRC) && !/store\.restOverrides|store\.data\[[^\]]*override/i.test(SRC));
  ok('5h. e finalizzare la seduta lo azzera esplicitamente',
    /try \{ stopTimer\(\); \} catch \(_\) \{\}\s*\n\s*try \{ clearRestOverrides\(\); \} catch \(_\) \{\}/.test(SRC));
  ok('5i. saltare il recupero non tocca l\'override', /function skipRestTimer\(\) \{\s*\n\s*stopTimer\(\);\s*\n\}/.test(SRC));
  ok('5j. il timer parte con la chiave dell\'esercizio, cosi\' l\'override lo trova',
    /startTimer\(rest, `w\$\{currentWeek\}_d\$\{currentDay\}_e\$\{exIdx\}`\)/.test(SRC));
}

console.log('\n--- 6. i comandi ci sono e la scheda non viene toccata ---');
{
  ok('6a. −10, +10, SALTA e CHIUDI sul timer',
    /onclick="nudgeRestTimer\(-10\)"/.test(SRC) && /onclick="nudgeRestTimer\(10\)"/.test(SRC) && /onclick="skipRestTimer\(\)"/.test(SRC) && /onclick="stopTimer\(\)">CHIUDI/.test(SRC));
  ok('6b. l\'override non scrive mai row.rest o rest_seconds',
    !/restOverride[^\n]*row\.rest\s*=/.test(SRC) && !/nudgeRestTimer[\s\S]{0,800}rest_seconds\s*=/.test(SRC));
  ok('6c. persist() non e\' stato toccato', /function persist\(\) \{\s*\n\s*ensureStoreIntegrity\(\);/.test(SRC));
  ok('6d. tutto questo e\' nella pagina costruita', /function nudgeRestTimer\(deltaSec\)/.test(BUILT) && /_rest_actual/.test(BUILT));
}

console.log("");
console.log("--- 7. la scheda non perde i minuti al reload ---");
{
  // normalizeProgram leggeva il recupero con parseInt: "2 min" faceva 2, e
  // al giro dopo la scheda diceva "2 s". Il timer automatico partiva da due
  // secondi. Ora legge come legge il timer.
  const L = SRC.indexOf('function normalizeProgram');
  const NL = String.fromCharCode(10);
  const body = SRC.slice(L, SRC.indexOf(NL + '}' + NL, L));
  ok("7a. dentro normalizeProgram non c'e' piu' un parseInt sul recupero", !/parseInt\(rest, 10\)/.test(body));
  ok('7b. e le letture passano dalla stessa funzione del timer', /const restSecondsOf = \(typeof parseRestSeconds === .function.\) \? parseRestSeconds :/.test(body) && (body.match(/restSecondsOf\(rest, (90|null)\)/g) || []).length >= 2);
  ok("7d. e dove il testo del recupero esiste ancora, vince lui sul numero derivato", /const rest = restTextOk \? exercise\.rest :/.test(body));
  eq(run(`parseRestSeconds('2 min', 90)`), 120, '7c. che di "2 min" fa 120, non 2');
}

console.log('');
if (failed) { console.log(failed + ' test del recupero falliti.'); process.exit(1); }
console.log('Tutti i test del recupero passano.');
