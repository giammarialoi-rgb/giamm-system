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

console.log('\n--- 8. all of it ships ---');
{
  ok('8a. the built app carries the header fix', /\.header-actions::before/.test(BUILT));
  ok('8b. the collapsible fix', /\.collapsible-body > \.card:last-child/.test(BUILT));
  ok('8c. the badge fix', /padding-right:76px/.test(BUILT));
  ok('8d. and the builder day row', /flex:1 1 100%;min-width:0;font-weight:800;/.test(BUILT));
}

console.log('');
if (failed) { console.log(failed + ' UI layout rule(s) broken.'); process.exit(1); }
console.log('All UI layout rules hold.');
