import { execSync } from 'child_process';
import fs from 'fs';

const headHtml = execSync('git show HEAD:web/index.html', { maxBuffer: 20 * 1024 * 1024 }).toString('utf8');
const currHtml = fs.readFileSync('web/index.html', 'utf8');

// Extract all function declarations
function getFunctions(src) {
  const fns = new Set();
  const re = /(?:function\s+([a-zA-Z0-9_$]+)|(?:var|let|const)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>))/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1] || m[2];
    if (name) fns.add(name);
  }
  return [...fns].sort();
}

// Extract all element IDs
function getIds(src) {
  const ids = new Set();
  const re = /id=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    ids.add(m[1]);
  }
  return [...ids].sort();
}

// Extract all onclick handlers
function getOnClickHandlers(src) {
  const handlers = new Set();
  const re = /onclick=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    handlers.add(m[1].trim());
  }
  return [...handlers].sort();
}

// Extract views from navigate or render functions
function getNavViews(src) {
  const views = new Set();
  const re = /navigate\s*\(\s*['"]([a-zA-Z0-9_-]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    views.add(m[1]);
  }
  return [...views].sort();
}

const headFns = getFunctions(headHtml);
const currFns = getFunctions(currHtml);

const missingFns = headFns.filter(f => !currFns.includes(f));
const addedFns = currFns.filter(f => !headFns.includes(f));

const headIds = getIds(headHtml);
const currIds = getIds(currHtml);

const missingIds = headIds.filter(id => !currIds.includes(id));
const addedIds = currIds.filter(id => !headIds.includes(id));

const headClicks = getOnClickHandlers(headHtml);
const currClicks = getOnClickHandlers(currHtml);

const missingClicks = headClicks.filter(c => !currClicks.includes(c));

const headViews = getNavViews(headHtml);
const currViews = getNavViews(currHtml);
const missingViews = headViews.filter(v => !currViews.includes(v));

console.log('=== FUNCTIONS COMPARISON ===');
console.log('HEAD functions count:', headFns.length);
console.log('CURRENT functions count:', currFns.length);
console.log('Missing functions from HEAD in CURRENT:', missingFns);
console.log('Added functions count in CURRENT:', addedFns.length);

console.log('\n=== DOM IDs COMPARISON ===');
console.log('HEAD IDs count:', headIds.length);
console.log('CURRENT IDs count:', currIds.length);
console.log('Missing IDs from HEAD in CURRENT:', missingIds);
console.log('Added IDs count in CURRENT:', addedIds.length);

console.log('\n=== NAVIGATION VIEWS COMPARISON ===');
console.log('HEAD nav views:', headViews);
console.log('CURRENT nav views:', currViews);
console.log('Missing nav views:', missingViews);

console.log('\n=== ONCLICK HANDLERS COMPARISON ===');
console.log('HEAD onClick handlers:', headClicks.length);
console.log('CURRENT onClick handlers:', currClicks.length);
console.log('Missing onClick handlers count:', missingClicks.length);
if (missingClicks.length > 0) {
  console.log('Missing onClick handlers samples:', missingClicks.slice(0, 20));
}
