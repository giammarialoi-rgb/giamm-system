// Three things an athlete asked for, checked against the app's own code
// rather than a description of it:
//
//   1. emptying the food diary holds a loading overlay until it is really
//      empty, because the last step of it is a round trip to the account;
//   2. a warm-up can be read before it is started - the player shows one
//      exercise at a time and the editor is for changing things, so there was
//      nowhere to see the whole list;
//   3. every exercise and every warm-up exercise offers a YouTube search.
//
// The YouTube button is a link, not an embed. It opens the hand-verified clip
// of the exercise when data/youtube-links.json has one (test_youtube_links.mjs)
// and a youtube.com search otherwise; either link is claimed by the YouTube
// app when it is installed and opens in the browser when it is not.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const built = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
const coachUi = fs.readFileSync(path.join(root, 'web/coach-practice-ui.js'), 'utf8');

function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}
function slice(from, to) {
  const a = html.indexOf(from);
  const b = html.indexOf(to, a + 1);
  assert.ok(a > 0 && b > a, 'source slice not found: ' + from);
  return html.slice(a, b);
}

console.log('--- Running warm-up overview / YouTube tests ---');

/* ---------- 1. the food diary reset waits for the reset ---------- */
{
  const fn = slice('async function clearPersonalNutrition()', 'function mealPhotoCaptureCardHtml');
  ok(/withBusy\(clearWork/.test(fn), '1a. the reset runs behind the busy overlay');
  ok(fn.indexOf('syncAccountData') < fn.indexOf('withBusy(clearWork'),
    '1b. and the account round trip is inside the work the overlay covers');
  const busyAt = fn.indexOf('withBusy(clearWork');
  ok(fn.indexOf('clearNutritionDone') > busyAt,
    '1c. "Alimentazione azzerata" is only said after the overlay comes down');
  ok(/immediate: true/.test(fn), '1d. the overlay shows at once, with no delay to look like nothing happened');
  ok(/await clearWork\(\)/.test(fn), '1e. and it still works if the overlay helper is missing');

  const coachFn = coachUi.slice(coachUi.indexOf('async function clearCoachClientDomain'), coachUi.indexOf('function openAddClientWizard'));
  ok(/withBusy\(sendClear/.test(coachFn) && /pushCoachClientEdits/.test(coachFn),
    '1f. the coach clearing a client domain waits on its push the same way');
}

/* ---------- 2. the YouTube search link ---------- */
const ctx = {
  console, window: {}, document: undefined, Math, String, Number, Array, Object, JSON, encodeURIComponent
};
vm.createContext(ctx);
vm.runInContext(html.match(/const esc = x => [^\n]+/)[0], ctx);
vm.runInContext(slice('function youtubeSearchUrl(query)', 'function snapshotAppSurface'), ctx);

{
  ok(ctx.youtubeSearchUrl('Panca piana bilanciere') === 'https://www.youtube.com/results?search_query=Panca%20piana%20bilanciere',
    '2a. the link is a youtube.com search for exactly that exercise');
  ok(ctx.youtubeSearchUrl('  Curl bilanciere  ') === 'https://www.youtube.com/results?search_query=Curl%20bilanciere',
    '2b. padding around the name does not leak into the query');
  ok(ctx.youtubeSearchButtonHtml('') === '' && ctx.youtubeSearchButtonHtml(null) === '',
    '2c. no name, no button');

  const btn = ctx.youtubeSearchButtonHtml('Rematore bilanciere');
  ok(/^<a class="btn btn-outline" href="https:\/\/www\.youtube\.com\/results\?search_query=Rematore%20bilanciere"/.test(btn),
    '2d. it is a real link, so the phone can hand it to the YouTube app');
  ok(/target="_blank"/.test(btn) && /rel="noopener noreferrer"/.test(btn),
    '2e. opened away from the app, without handing it a window reference');
  ok(/#ff0000/.test(btn) && /<path d="M11 5\.4 L20 10 L11 14\.6 Z" fill="#ffffff">/.test(btn),
    '2f. with the red play mark, so it reads as YouTube at a glance');
  ok(btn.includes('CERCA SU YOUTUBE'), '2g. and it says what it does');

  const compact = ctx.youtubeSearchButtonHtml('Bird Dog', { compact: true });
  ok(compact.includes('href="https://www.youtube.com/results?search_query=Bird%20Dog"') && !compact.includes('CERCA SU YOUTUBE'),
    '2h. the compact one is the same link as an icon, for a list row');
  ok(/aria-label="Cerca &quot;Bird Dog&quot; su YouTube"/.test(compact),
    '2i. which still tells a screen reader what it is');

  const nasty = ctx.youtubeSearchButtonHtml('Curl "aperto" <script>');
  ok(!/<script>/.test(nasty) && /&lt;script&gt;/.test(nasty),
    '2j. an exercise name with markup in it cannot break out of the button');
}

/* ---------- 3. where the button appears ---------- */
{
  const sheet = slice('function paintExerciseInfoSheet(opts)', 'function openExerciseInfoSheet(idx');
  // The verified clip when the catalog has one, the search otherwise (test_youtube_links.mjs).
  ok(/youtubeButtonHtml\(\{ name: title, names: \[name, row\.name, row\.name_original\], overrideId: row\.youtube_override_id \}\)/.test(sheet), '3a. CHIEDI INFO on an exercise offers its YouTube link');
  ok(sheet.indexOf('youtubeButtonHtml(') < sheet.indexOf('APRI ENCICLOPEDIA'),
    '3b. above the encyclopedia, where the eye lands first');

  const player = slice('function renderWarmupPlayer()', 'function loadWarmupItemMedia');
  ok(/youtubeButtonHtml\(\{ warmup: true, warmupId: it\.exerciseId, name: it\.name \}\)/.test(player), '3c. and so does every warm-up exercise in the player, by its library id');

  ok(built.includes('youtubeSearchButtonHtml') && built.includes('function youtubeButtonHtml('), '3d. all of it survives the build into web/index.html');

  // The Android build loads the app from a local asset, so without this an
  // external link would open inside the WebView with no way back out.
  const activity = fs.readFileSync(path.join(root, 'app/src/main/java/com/giammaria/system/MainActivity.java'), 'utf8');
  ok(/public boolean shouldOverrideUrlLoading\(/.test(activity),
    '3e. the Android shell decides what to do with a link instead of following it');
  const hook = activity.slice(activity.indexOf('public boolean shouldOverrideUrlLoading('), activity.indexOf('public boolean shouldOverrideUrlLoading(') + 1200);
  ok(/"https"\.equalsIgnoreCase\(scheme\)/.test(hook) && /Intent\.ACTION_VIEW/.test(hook) && /return true;/.test(hook),
    '3f. an http(s) link goes to the system, which is what hands it to the YouTube app');
}

/* ---------- 4. the warm-up you are about to do, on one screen ---------- */
{
  ok(/onclick="openWarmupOverview\(/.test(html), '4a. the session card has a VISUALIZZA button');
  ok(/>VISUALIZZA</.test(html), '4b. labelled VISUALIZZA');
  ok(html.includes('window.openWarmupOverview = openWarmupOverview;'), '4c. reachable from an onclick attribute');
  ok(html.includes('window.closeWarmupOverview = closeWarmupOverview;'), '4d. and so is closing it');

  // Run it for real against a fake page, so the list is the code's output and
  // not a regex's opinion of it.
  const appended = [];
  const wctx = {
    console, Math, String, Number, Array, Object, JSON, Date, encodeURIComponent,
    WARMUP_EXERCISE_LIBRARY: [
      { id: 'mobility_wall_slide', name: 'Wall Slide', description: 'Scapole a contatto col muro.' },
      { id: 'core_mcgill_birddog', name: 'Bird Dog', description: 'Colonna neutra, braccio e gamba opposti.' }
    ],
    store: {
      warmups: {
        w1_d0: {
          items: [
            { exerciseId: 'mobility_wall_slide', name: 'Wall Slide', category: 'mobility', sets: 1, reps: 10, restSeconds: 0, orderIndex: 0 },
            { exerciseId: 'core_mcgill_birddog', name: 'Bird Dog', category: 'core_stability', sets: 2, durationSeconds: 30, restSeconds: 15, orderIndex: 1 }
          ]
        }
      },
      warmupProgress: { w1_d0: { status: 'partial', idx: 1 } }
    },
    persist() {},
    showToast(msg) { wctx.__toast = msg; },
    document: {
      getElementById: () => null,
      createElement: () => ({ style: {}, classList: { add() {} }, set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; } }),
      body: { appendChild: (el) => appended.push(el) }
    },
    window: {}
  };
  vm.createContext(wctx);
  vm.runInContext(html.match(/const esc = x => [^\n]+/)[0], wctx);
  vm.runInContext(slice('function youtubeSearchUrl(query)', 'function snapshotAppSurface'), wctx);
  vm.runInContext(slice('var WARMUP_CATEGORY_LABELS = {', 'function skipWarmup(week, day)'), wctx);

  const before = JSON.stringify(wctx.store.warmups);
  wctx.openWarmupOverview(1, 0);
  ok(appended.length === 1, '4e. opening it puts one sheet on the page');
  const out = appended[0].innerHTML;

  ok(out.includes('Wall Slide') && out.includes('Bird Dog'), '4f. every warm-up exercise is listed');
  ok(out.indexOf('Wall Slide') < out.indexOf('Bird Dog'), '4g. in the order they will be done');
  ok(out.includes('Mobilità') && out.includes('Stabilità Core'), '4h. each with what it is for');
  ok(out.includes('1×10') && out.includes('2×30s'), '4i. and its scheme, so you know what you are in for');
  ok(out.includes('Scapole a contatto col muro.'), '4j. with the library description when there is one');
  ok(out.includes('2 esercizi'), '4k. the head counts them');
  ok(/~\d+ min/.test(out), '4l. and says how long it takes');
  ok((out.match(/youtube\.com\/results/g) || []).length === 2, '4m. each row can be looked up on YouTube');
  ok(out.includes('▸'), '4n. a half-done warm-up shows where you left off');
  ok(out.includes('openWarmupPlayer(1,0)'), '4o. and you can start it from here');

  ok(JSON.stringify(wctx.store.warmups) === before, '4p. looking at a warm-up never changes it');

  // An empty warm-up must say so rather than opening an empty sheet.
  appended.length = 0;
  wctx.store.warmups.w1_d0.items = [];
  wctx.openWarmupOverview(1, 0);
  ok(appended.length === 0 && /Nessun esercizio/.test(wctx.__toast || ''),
    '4q. nothing to show means a message, not an empty sheet');
}

console.log('\nAll warm-up overview / YouTube tests passed.');
