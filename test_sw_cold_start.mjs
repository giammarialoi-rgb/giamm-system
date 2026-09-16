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

// 4. Actually run sw.js's fetch handler (not just grep it) against a same-
// origin /api/account/me GET request, and confirm it never calls
// event.respondWith() - i.e. the request passes through untouched, straight
// to the network, exactly like a page with no service worker at all. This is
// the fix for the data-loss bug: caching (and, on any network hiccup, silently
// re-serving) an account-data GET response meant a later, more complete save
// could be reverted to an older snapshot without any visible error.
{
  const origin = 'https://coach-api-gemini.onrender.com';
  const listeners = {};
  const sandbox = {
    self: {
      location: { origin },
      addEventListener: (type, fn) => { listeners[type] = fn; },
      NURVAN_RELEASE: { androidVersionCode: 999 }
    },
    caches: { open: async () => ({ match: async () => undefined, put: async () => {} }), match: async () => undefined, keys: async () => [], delete: async () => true },
    fetch: async () => ({ ok: true, type: 'basic', clone: () => ({}) }),
    importScripts: () => {},
    URL,
    console
  };
  sandbox.self.addEventListener = (type, fn) => { listeners[type] = fn; };
  vm.createContext(sandbox);
  vm.runInContext(swSrc, sandbox);

  function dispatchFetch(url, method = 'GET') {
    let respondWithCalled = false;
    const event = {
      request: { url, method, mode: method === 'GET' && /\.html$|^\/$/.test(new URL(url).pathname) ? 'navigate' : 'no-cors' },
      respondWith: () => { respondWithCalled = true; },
      waitUntil: () => {}
    };
    listeners.fetch(event);
    return respondWithCalled;
  }

  ok(typeof listeners.fetch === 'function', '4a. sw.js registers a fetch listener when actually executed');
  ok(dispatchFetch(origin + '/', 'GET') === true, '4b. sanity: a same-origin navigation IS intercepted (the harness itself works)');
  ok(dispatchFetch(origin + '/api/account/me', 'GET') === false,
    '4c. a same-origin GET to /api/account/me is NOT intercepted - it passes straight through to a real network fetch');
  ok(dispatchFetch(origin + '/api/coach/clients/1/patch-data', 'GET') === false,
    '4d. the bypass covers /api/ broadly, not just the one endpoint that was reproduced');
}

console.log('\nAll service-worker cold-start tests passed.');
