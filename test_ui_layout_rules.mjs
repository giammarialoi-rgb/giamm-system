// What the eye caught, written down so it cannot come back.
//
// Every rule here answers a specific thing the user circled in a screenshot:
// a button sliced in half at the start edge, a heading whose first letter was
// shaved off inside a dropdown, a badge printed over a program title, a save
// button floating over screens that have nothing to save. The assertions are
// about the stylesheet and the markup that produce those pixels, because the
// pixels themselves are only measurable in a browser.

import fs from 'fs';

// Line endings are not the subject here, and the file has had both.
const SRC = fs.readFileSync('web/index.base.html', 'utf8').replace(/\r\n/g, '\n');
const BUILT = fs.readFileSync('web/index.html', 'utf8').replace(/\r\n/g, '\n');

let failed = 0;
function ok(label, cond, detail) {
  if (cond) { console.log('OK   ' + label); return; }
  failed++;
  console.log('FAIL ' + label + (detail ? '\n     ' + detail : ''));
}

function cssBlock(selector) {
  const at = SRC.indexOf(selector);
  if (at < 0) return '';
  const open = SRC.indexOf('{', at);
  const close = SRC.indexOf('}', open);
  return open < 0 || close < 0 ? '' : SRC.slice(open + 1, close);
}

console.log('\n--- 1. the header row reaches its first button ---');
{
  const block = cssBlock('.header-actions {');
  ok('1a. the header row is start-aligned', /justify-content:\s*flex-start/.test(block),
    'flex-end plus overflow-x put INDIETRO past the start edge, where scrolling cannot reach it');
  ok('1b. and scrolls horizontally when it must', /overflow-x:\s*auto/.test(block));
  ok('1c. a spacer pushes the group right only while there is room',
    /\.header-actions::before\s*\{[^}]*margin-left:\s*auto/.test(SRC));
  ok('1d. nothing in the row is allowed to shrink',
    /\.header-actions > \.btn,[\s\S]{0,200}?flex-shrink:\s*0/.test(SRC));
}

console.log('\n--- 2. the phone header shrinks instead of hiding buttons ---');
{
  const mq = SRC.indexOf('@media (max-width: 560px)');
  const ids = SRC.indexOf('#menu-hub-button,\n#profile-button');
  ok('2a. there is a compact breakpoint', mq > 0);
  ok('2b. it comes after the rules it overrides', mq > ids && ids > 0,
    'equal specificity: the later rule wins, so source order is the whole fix');
  const body = SRC.slice(mq, mq + 700);
  ok('2c. every header button is named in it',
    ['#menu-hub-button', '#profile-button', '#cp-notify-btn', '#coach-unlock-button', '#personal-back-button']
      .every(function (id) { return body.indexOf(id) > 0; }),
    'one button left at the desktop size is one button that pushes the rest off screen');
  ok('2d. and the comment states the breakpoint it actually uses',
    SRC.indexOf('Below 560px they shrink') > 0);
  const tight = SRC.indexOf('@media (max-width: 400px)');
  ok('2e. a tighter tier exists for a 375px phone', tight > mq && mq > 0,
    'at 375px the five buttons still measured 328px against 319px of room, and MENU was sliced');
  const tightBody = SRC.slice(tight, tight + 400);
  ok('2f. it takes the last pixels from the gap and the letter spacing',
    /gap:\s*4px/.test(tightBody) && /letter-spacing:\s*0/.test(tightBody));
}

console.log('\n--- 3. a section is one card, not a card inside a card ---');
{
  const block = cssBlock('.collapsible-body > .card,');
  ok('3a. the inner card gives up its border', /border:\s*0\s*!important/.test(block),
    'an inline border:2px solid var(--gold) beats a plain stylesheet rule');
  ok('3b. and its background', /background:\s*transparent\s*!important/.test(block));
  ok('3c. it is not clipped by its own frame', /overflow:\s*visible/.test(block));
  const header = cssBlock('.collapsible-body .card-header {');
  ok('3d. its header stops being a flex row', /display:\s*block/.test(header),
    'title and subtitle overlapped once the section carried the name');
  ok('3e. and the body provides the padding the card no longer has',
    /class="collapsible-body" style="padding:0 16px 16px;"/.test(SRC));
}

console.log('\n--- 4. the save button lives where there is something to save ---');
{
  ok('4a. it is hidden by default', /\.fab-save \{ display: none; \}/.test(SRC));
  ok('4b. and shown while a session is being logged',
    /body\[data-view="training"\] \.fab-save \{ display: flex; \}/.test(SRC));
  ok('4c. the view is written onto the body for it to key off',
    /document\.body\.setAttribute\('data-view'/.test(SRC),
    'without the marker the rule above hides the button everywhere');
}

console.log('\n--- 5. nothing pushes text out of its box ---');
{
  ok('5a. no card child refuses to shrink',
    /#view-container \.card, #view-container \.card \* \{[^}]*min-width:\s*0/.test(SRC.replace(/\r\n/g, '')) ||
    /#view-container \.card \*[\s\S]{0,120}min-width:\s*0/.test(SRC));
  ok('5b. and a long word breaks instead of running under the next column',
    /#view-container \{[^}]*overflow-wrap:\s*break-word/.test(SRC));
  ok('5c. but a label is not prose: a button never breaks mid-word',
    /#view-container \.btn,\n#view-container button \{[^}]*overflow-wrap:\s*normal/.test(SRC),
    'break-word printed PROGRAMMI as "PROGRAM MI" on two lines');
  ok('5d. it gives up padding instead of giving up a word',
    /@media \(max-width: 420px\) \{\n  #view-container \.btn \{ padding-left: 12px/.test(SRC));
}

console.log('\n--- 6. the ATTIVO badge no longer prints over the title ---');
{
  const at = SRC.indexOf("${weeks.length ? 'ATTIVO' : 'VUOTO'}");
  ok('6a. the badge is still there', at > 0);
  const h3 = SRC.slice(at, at + 600);
  ok('6b. the title reserves the corner it occupies', /padding-right:76px/.test(h3),
    'the heading box ran full width under an absolutely positioned badge');
  ok('6c. and still clamps instead of growing without end', /-webkit-line-clamp:3/.test(h3));
}

console.log('\n--- 7. the builder day keeps its name on one line of its own ---');
{
  const at = SRC.indexOf('placeholder="Nome del giorno"');
  ok('7a. the day name input is still there', at > 0);
  const row = SRC.slice(Math.max(0, at - 400), at + 600);
  ok('7b. its row wraps', /flex-wrap:wrap/.test(row));
  ok('7c. the name takes the full width', /flex:1 1 100%/.test(row),
    'sharing a line with DUPLICA and ELIMINA cut the name at "Giorno 1 - Squat pe"');
  ok('7d. and the buttons sit at the right end of the next line', /margin-left:auto/.test(row));
}

console.log('\n--- 8. a hub tile is shown as the tile it is ---');
{
  const UI = fs.readFileSync('web/coach-practice-ui.js', 'utf8').replace(/\r\n/g, '\n');
  const hubBlocks = UI.match(/\[data-hub="[a-z-]+"\][\s\S]{0,140}?\}\);/g) || [];
  ok('8a. every data-hub branch is still there', hubBlocks.length >= 5, hubBlocks.length + ' found');
  const restoresEmpty = hubBlocks.filter(function (b) { return /style\.display = [^;]*: ''/.test(b) || /style\.display = '';/.test(b); });
  ok('8b. none of them restores a tile with an empty string', restoresEmpty.length === 0,
    "'' erases the inline display:flex the markup carries, and the icon falls back onto the label's line");
  ok('8c. the markup still carries that display:flex',
    (SRC.match(/data-hub="[a-z-]+" style="[^"]*flex-direction:column/g) || []).length >= 5);
}

console.log('\n--- 9. all of it ships ---');
{
  ok('9a. the built app carries the header fix', /\.header-actions::before/.test(BUILT));
  ok('9b. the collapsible fix', /\.collapsible-body > \.card:last-child/.test(BUILT));
  ok('9c. the badge fix', /padding-right:76px/.test(BUILT));
  ok('9d. and the builder day row', /flex:1 1 100%;min-width:0;font-weight:800;/.test(BUILT));
}

console.log('\n--- 10. una selezione non ti riporta in cima ---');
{
  // Every tap ends in render(), which rebuilds the screen from scratch: the
  // scroll position had nothing left to hold on to and the page snapped back
  // to the top. Ticking a machine in a training space threw you out of the
  // list; closing a set threw you out of the workout.
  ok('10a. esiste un render che si ricorda dove eri', /function keepScrollDuring\(fn, anchorId\)/.test(SRC));
  ok('10b. e render() ci passa attraverso quando la schermata e la stessa',
    /function render\(\) \{[\s\S]{0,500}?keepScrollDuring\(draw\)/.test(SRC));
  ok('10c. cambiando schermata si riparte dall alto, come e giusto',
    /var sameScreen = \(window\.__lastRenderedView === currentView\)/.test(SRC));
  ['renderSpaceExercises', 'renderMyGym', 'renderTrainingSpaces', 'renderExercisePickerResults',
    'renderProgramBuilder', 'renderProgramGenerator'].forEach(function (fn) {
    const re = new RegExp('function ' + fn + '\\([^)]*\\) \\{[\\s\\S]{0,400}?keepScrollDuring');
    ok('10d. anche ' + fn + ' rispetta la posizione nel foglio', re.test(SRC));
  });
  ok('10e. chiudendo una serie l esercizio resta fermo sullo schermo',
    /function renderKeepingExercise\(exIdx\)/.test(SRC) &&
    /keepScrollDuring\(render, 'exercise-item-' \+ exIdx\)/.test(SRC));
  ok('10f. ogni esercizio ha un id a cui agganciarsi', /id="exercise-item-\$\{fIdx\}"/.test(SRC));
  ok('10g. e completeSetQuick non chiama piu il render nudo',
    /queueLiveSetIntel\(exIdx, setNum\); \} catch \(_\) \{\}\n  renderKeepingExercise\(exIdx\);/.test(SRC));
}

console.log('\n--- 11. le sezioni lunghe si chiudono a tendina ---');
{
  ok('11a. esiste il passaggio che le rende richiudibili', /function makeLongSectionsFoldable\(root\)/.test(SRC));
  ok('11b. con una soglia dichiarata, non un numero sparso nel codice', /var FOLD_MIN_HEIGHT = \d+;/.test(SRC));
  ok('11c. e il CSS che le chiude', /\.card\.is-folded > \.card-fold \{ display: none; \}/.test(SRC));
  ok('11d. quello che chiudi resta chiuso anche dopo',
    /function toggleSectionFold\(key, cardEl\)/.test(SRC) && /store\.foldedSections/.test(SRC));
  ok('11e. e il controllo gira a ogni render', /makeLongSectionsFoldable\(\);/.test(SRC));
}

console.log('\n--- 12. non si manda niente a un coach che non ce ---');
{
  const at = SRC.indexOf('SALVA E MANDA AL COACH');
  ok('12a. il bottone esiste ancora', at > 0);
  const around = SRC.slice(Math.max(0, at - 260), at + 80);
  ok('12b. ma solo per chi un coach ce l ha davvero', /isClientAthleteView/.test(around));
  ok('12c. e il messaggio dopo il salvataggio dice la verita',
    /var toCoach = \(typeof isClientAthleteView === 'function'\) && isClientAthleteView\(\);/.test(SRC));
}

console.log('\n--- 13. la scheda generata si legge e si corregge prima di salvarla ---');
{
  ok('13a. generare apre una revisione, non un salvataggio',
    /function openGeneratedReview\(prog, target, report\)/.test(SRC));
  ok('13b. ed e li che finisce createGeneratedProgram', /openGeneratedReview\(prog, target, report\);/.test(SRC));
  ok('13c. si puo aprire qualsiasi settimana, non solo la prima', /function setReviewWeek\(n\)/.test(SRC));
  ok('13d. serie, ripetizioni, recupero e nome si cambiano',
    /function updateReviewExercise\(si, ei, field, value, allWeeks\)/.test(SRC));
  ok('13e. per una settimana sola o per tutte, a scelta', /allWeeks \? 0 : generatedReview\.week - 1/.test(SRC));
  ok('13f. e da li esce con le stesse quattro strade del costruttore',
    /function deliverGeneratedReview\(target\)/.test(SRC) &&
    /deliverProgram\(normalizeProgram\(prog\), target/.test(SRC));
}

console.log('\n--- 14. quello che l app dichiara, l app lo fa ---');
{
  // Every one of these was a button on screen that led nowhere, or a screen
  // with no door. Found by the audit of 23 settembre, fixed together.
  ok('14a. RIPROVA chiama una funzione che esiste davvero',
    /(async )?function retryCheckInSend\(id\)/.test(SRC) &&
    /onclick="event\.stopPropagation\(\);retryCheckInSend\(/.test(SRC));
  ok('14b. ed e la stessa nella pagina costruita', /function retryCheckInSend\(id\)/.test(BUILT));
  ok('14c. un invio fallito lascia scritto che e fallito',
    /markCheckInSyncState\(entry, 'FAILED'\)/.test(SRC) &&
    /markCheckInSyncState\(entry, 'SYNCED'\)/.test(SRC));
  ok('14d. e il rinvio porta anche le foto, che stanno in IndexedDB',
    /getDocumentFile\('bodycheck_front_' \+ checkId\)/.test(SRC));

  const dbInput = (SRC.match(/<input[^>]*id="db-file-input"[^>]*>/) || [''])[0];
  ok('14e. il selettore del database dichiara csv, json e immagini',
    /\.csv/.test(dbInput) && /\.json/.test(dbInput) && /\.png/.test(dbInput));
  ok('14f. e li accetta, perche passa dal router universale e non dal vecchio filtro',
    !/Seleziona PDF, DOC, DOCX, TXT, XLSX o XLS/.test(SRC) &&
    !/Seleziona PDF, DOC, DOCX, TXT, XLSX o XLS/.test(BUILT));
  ok('14g. handleFileUpload esiste una volta sola',
    (SRC.match(/^(?:async )?function handleFileUpload\(/gm) || []).length === 1);

  ok('14h. il Centro Progressi ha una porta d ingresso', /onclick="showProgressCenter\(\)"/.test(SRC));
  ok('14i. e lo storico serie si puo esportare da Impostazioni',
    (SRC.match(/onclick="exportWorkoutHistory\(\)"/g) || []).length >= 2);

  // In one script, the last declaration of a name is the one that runs. Two
  // bodies under one name means the copy you read may not be the copy that
  // answers - which is how a documents-only handleFileUpload kept winning.
  const decls = {};
  const re = /^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/gm;
  let m;
  while ((m = re.exec(BUILT))) decls[m[1]] = (decls[m[1]] || 0) + 1;
  const dupes = Object.keys(decls).filter(function (k) { return decls[k] > 1; });
  ok('14j. nella pagina costruita nessun nome e dichiarato due volte', dupes.length === 0,
    dupes.join(', '));
}

console.log('\n--- 15. la scheda non passa per intero da ogni tocco ---');
{
  // persist() runs on every tap. The sanitizer takes the programming out of
  // the local-storage blob because it lives in IndexedDB; the personal-area
  // overlay right after it put the programming straight back, so every tap
  // re-serialized it - 784 KB at 6 weeks, 6,2 MB at 40, against a 5 MB
  // ceiling on iOS.
  ok('15a. il blob non si riporta dietro la programmazione',
    /if \(!isClientStorageContext\(\)\) source\.activeProgram = null;/.test(SRC));
  ok('15b. in cambio la scheda si rispecchia in IndexedDB come ogni altro dominio',
    /function scheduleActiveProgramIdbSync\(immediate\)/.test(SRC) &&
    /\n  scheduleActiveProgramIdbSync\(\);\n  scheduleWorkoutLogsIdbSync\(\);/.test(SRC));
  ok('15c. e viene scaricata prima che la pagina sparisca',
    /try \{ scheduleActiveProgramIdbSync\(true\); \} catch \(_\) \{\}/.test(SRC));
  ok('15d. senza serializzare megabyte per capire se e cambiata',
    /function activeProgramFingerprint\(prog\)/.test(SRC));
  ok('15e. e se il salvataggio fallisce non si finge che sia andato',
    /__programIdbLastFingerprint = null;\s*\n\s*__programIdbLastSavedAt = 0;/.test(SRC));
  ok('15f. lo spazio cliente tiene la sua copia, perche altra non ne ha',
    /A client or invite session has no IndexedDB/.test(SRC));
}

console.log('');
if (failed) { console.log(failed + ' UI layout rule(s) broken.'); process.exit(1); }
console.log('All UI layout rules hold.');
