import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

// Asked live: the Warm-Up Engine shipped (commits 248cf85..3d9031d) without
// its own exercises ever showing up in the main exercise encyclopedia
// ("libreria esercizi con le spiegazioni fatte molto bene"), so a warm-up
// movement had no reference card outside the player itself. This folds the
// warm-up library into the same enciclopedia entries/search as every other
// exercise, reusing the existing rendering rather than building a parallel
// UI.
console.log('--- Running Warm-Up Knowledge Library Tests ---');

const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const built = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
const librarySrc = fs.readFileSync(path.join(root, 'web/warmup-exercise-library.js'), 'utf8');
const knowledgeSrc = fs.readFileSync(path.join(root, 'web/training-knowledge.js'), 'utf8');

function freshSandbox() {
  const sandbox = { console };
  sandbox.self = sandbox; // self === window in a real page; both scripts attach here
  vm.createContext(sandbox);
  vm.runInContext(librarySrc, sandbox);
  vm.runInContext(knowledgeSrc, sandbox);
  return sandbox;
}

// 1. Real runtime check (not string matching): loading the actual library +
// knowledge files in order and calling allEntries() must produce one 'warmup'
// entry per library exercise, each with real Italian body text, matched to
// the real cautions/category data - not a mocked/hand-written stand-in list.
{
  const sb = freshSandbox();
  const lib = sb.WARMUP_EXERCISE_LIBRARY;
  const K = sb.NURVAN_TRAINING_KNOWLEDGE;
  ok(Array.isArray(lib) && lib.length > 0, '1a. the real warm-up library loaded in the sandbox');
  const entries = K.allEntries();
  const warmupEntries = entries.filter((e) => e.cat === 'warmup');
  ok(warmupEntries.length === lib.length, '1b. allEntries() produces exactly one warmup entry per library exercise (' + lib.length + ')');
  const byId = new Map(lib.map((ex) => [ex.id, ex]));
  for (const entry of warmupEntries) {
    const srcId = String(entry.id || '').replace(/^wu-/, '');
    const ex = byId.get(srcId);
    ok(!!ex, '1c. ' + entry.id + ' maps back to a real library exercise');
    ok(entry.title === ex.name, '1d. ' + entry.id + ' title matches the library name');
    ok(entry.body.includes(ex.description) && entry.body.includes(ex.instructions),
      '1e. ' + entry.id + ' body contains the real description and instructions, not a placeholder');
    ok(entry.extra.mistakes === (ex.cautions || ''), '1f. ' + entry.id + ' mistakes come from the real cautions field');
  }
}

// 2. The category label map used to build each card's muscle/group label is
// pinned equal to WARMUP_CATEGORY_LABELS in index.base.html, so the two
// cannot silently drift into showing different Italian labels for the same
// category id.
{
  const sb = freshSandbox();
  const jsMap = sb.NURVAN_TRAINING_KNOWLEDGE.WARMUP_CATEGORY_LABELS;
  const m = html.match(/var WARMUP_CATEGORY_LABELS = (\{[\s\S]*?\});/);
  ok(!!m, '2a. WARMUP_CATEGORY_LABELS is still declared in index.base.html');
  const htmlMap = JSON.parse(
    m[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"').replace(/,(\s*\})/g, '$1')
  );
  ok(JSON.stringify(jsMap) === JSON.stringify(htmlMap), '2b. training-knowledge.js\'s label map matches index.base.html\'s exactly (same keys/values)');
}

// 3. UI wiring: the Riscaldamento tab exists, routes to the warmup entries,
// and reuses the existing card renderer/grouping - not a bespoke rendering
// path that could drift from the rest of the enciclopedia.
for (const src of [html, built]) {
  ok(src.includes("['warmup', 'Riscaldamento']"), '3a. the Riscaldamento tab is registered');
  ok(src.includes("if (cat === 'warmup') return 'Riscaldamento';"), '3b. knowledgeCatLabel maps warmup -> Riscaldamento');
  ok(src.includes("else if (tab === 'warmup') rows = (typeof search === 'function' ? search('') : []).filter(function (x) { return x.cat === 'warmup'; });"),
    '3c. the empty-query warmup view pulls only cat===warmup entries');
  ok(src.includes("} else if ((tab === 'esercizi' || tab === 'warmup') && !q) {"),
    '3d. the warmup tab reuses the existing group-by-category-label rendering (same code path as esercizi group-by-muscle)');
}

console.log('\nAll warm-up knowledge library tests passed.');
