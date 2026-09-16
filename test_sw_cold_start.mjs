import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

// Reported live: opening the PWA after a period of inactivity showed
// Render's own "APPLICATION LOADING" boot page (visible for 20-30s while the
// free-tier instance wakes from sleep) instead of Nurvan's own splash. Root
// cause was two-fold: (1) release-meta.js was generated with a literal
// backslash-n at the end instead of a real newline, which is a JS syntax
// error - importScripts('./release-meta.js') inside sw.js threw on every
// load, so the service worker never installed at all; (2) even with a
// working SW, the HTML/navigation handler was network-first with no
// caching, so a returning visitor always waited on the network (and thus on
// Render's interstitial) instead of getting the cached app shell instantly.
console.log('--- Running Service-Worker Cold-Start Tests ---');

const buildSrc = fs.readFileSync(path.join(root, 'build_master25.mjs'), 'utf8');
const swSrc = fs.readFileSync(path.join(root, 'web/sw.js'), 'utf8');
const releaseMeta = fs.readFileSync(path.join(root, 'web/release-meta.js'), 'utf8');

// 1. build_master25.mjs must write a real newline after the release-meta.js
// body, not the two literal characters backslash+n (a JS syntax error that
// breaks importScripts inside the service worker).
{
  const genStart = buildSrc.indexOf('const releaseMetaScript =');
  ok(genStart >= 0, '1a. the release-meta.js generator is declared');
  const genBlock = buildSrc.slice(genStart, buildSrc.indexOf('\n', buildSrc.indexOf(';', genStart)) + 1);
  ok(!genBlock.includes("\\\\n"), '1b. the template no longer appends a literal backslash-n (JS syntax error)');
  ok(genBlock.includes("');\\n'"), '1c. it appends a real newline escape instead');
}

// 2. The currently-checked-in web/release-meta.js must itself be valid JS -
// this is the actual file the service worker imports, so a regression here
// (even if build_master25.mjs is later fixed) would still break the SW until
// the next rebuild is run and committed.
{
  ok(!releaseMeta.includes('\\n'), '2a. web/release-meta.js has no literal backslash-n sequence');
  ok(!/[^\n]\\n["'`]?\s*$/.test(releaseMeta.trimEnd() + '\n'), '2b. sanity check does not flag a real trailing newline as broken');
  assert.doesNotThrow(() => new Function(releaseMeta), '2c. web/release-meta.js parses as valid JS with no syntax error');
}

// 3. sw.js must cache the app shell (navigation/HTML requests) and serve it
// stale-while-revalidate - answer instantly from cache when available, and
// only hit the network when there is nothing cached yet (first-ever visit).
// A plain network-first fetch means every visit after idle re-hits the
// network and therefore Render's own boot interstitial while it wakes up.
{
  ok(swSrc.includes('const isHtml ='), '3a. sw.js still classifies navigation/HTML requests distinctly');
  const fnStart = swSrc.indexOf('if (isHtml) {');
  const fnBody = swSrc.slice(fnStart, swSrc.indexOf('\n  }', fnStart) + 4);
  ok(fnBody.includes('cache.match(req)'), '3b. the HTML handler checks the cache for a hit');
  ok(fnBody.includes('event.waitUntil(network)') && fnBody.includes('return cached;'),
    '3c. a cache hit is returned immediately, with the network refresh happening in the background (not blocking the response)');
  ok(fnBody.includes("cache.put(req, res.clone())"),
    '3d. a successful network fetch actually populates the cache, so the *next* visit can be served from it');
  ok(!/fetch\(req, \{ cache: 'no-store' \}\)\.catch\(\(\) => caches\.match\(req\)\)\);\s*\n\s*return;/.test(fnBody),
    '3e. the old network-only-with-cache-fallback-on-failure strategy is gone');
}

console.log('\nAll service-worker cold-start tests passed.');
