import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

console.log('=== AUDIT TASK 20 DEEP ===');

// 1. Navigation items
const navMatch = html.match(/<nav[\s\S]*?<\/nav>/);
if (navMatch) {
  console.log('--- BOTTOM NAV HTML ---');
  console.log(navMatch[0]);
}

// 2. Modals
const modalMatches = Array.from(html.matchAll(/id="([^"]*modal[^"]*)"/gi)).map(m => m[1]);
console.log('--- MODALS ---', modalMatches);

// 3. Check All Render functions
const renderFns = Array.from(html.matchAll(/function\s+(render[A-Za-z0-9_]*)\s*\(/g)).map(m => m[1]);
console.log('--- RENDER FUNCTIONS ---', renderFns);

// 4. Check All JS Functions
const allFns = Array.from(html.matchAll(/(?:function\s+([A-Za-z0-9_$]+)|(?:var|let|const)\s+([A-Za-z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>))/g)).map(m => m[1] || m[2]);
console.log('--- TOTAL JS FUNCTIONS COUNT ---', allFns.length);

// 5. Check All DOM IDs
const allIds = Array.from(html.matchAll(/id="([^"]+)"/g)).map(m => m[1]);
console.log('--- TOTAL DOM IDS COUNT ---', allIds.length);

// 6. Check IndexedDB usage in index.html and modules
console.log('--- INDEXEDDB STORES / CALLS ---');
const idbCalls = Array.from(html.matchAll(/GiammariaPersistence\.([A-Za-z0-9_$]+)/g)).map(m => m[1]);
console.log('GiammariaPersistence calls:', [...new Set(idbCalls)]);

// 7. Check localStorage usage
const lsCalls = Array.from(html.matchAll(/localStorage\.([A-Za-z0-9_$]+)/g)).map(m => m[1]);
console.log('localStorage calls:', [...new Set(lsCalls)]);

// 8. Check coach-api endpoints in coach-api.mjs
if (fs.existsSync('coach-api.mjs')) {
  const coachApi = fs.readFileSync('coach-api.mjs', 'utf8');
  const routes = Array.from(coachApi.matchAll(/app\.(get|post|put|delete|options)\s*\(\s*['"]([^'"]+)['"]/g)).map(m => `${m[1].toUpperCase()} ${m[2]}`);
  console.log('--- COACH API ROUTES (' + routes.length + ') ---', routes);
}
