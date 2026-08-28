import { execSync } from 'child_process';
import fs from 'fs';

const commits = execSync('git rev-list --all', { maxBuffer: 20 * 1024 * 1024 })
  .toString('utf8')
  .trim()
  .split('\n');

const currHtml = fs.readFileSync('web/index.html', 'utf8');

function getFunctions(src) {
  const fns = new Set();
  const re = /(?:function\s+([a-zA-Z0-9_$]+)|(?:var|let|const)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>))/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1] || m[2];
    if (name) fns.add(name);
  }
  return fns;
}

function getIds(src) {
  const ids = new Set();
  const re = /id=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    ids.add(m[1]);
  }
  return ids;
}

const currFns = getFunctions(currHtml);
const currIds = getIds(currHtml);

const allHistoricFns = new Map(); // fnName -> [commit]
const allHistoricIds = new Map(); // id -> [commit]

console.log(`Scanning ${commits.length} commits for any historical functions and IDs...`);

for (const c of commits) {
  try {
    const content = execSync(`git show ${c}:web/index.html`, { maxBuffer: 20 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'] }).toString('utf8');
    const fns = getFunctions(content);
    const ids = getIds(content);
    
    for (const f of fns) {
      if (!allHistoricFns.has(f)) allHistoricFns.set(f, []);
      allHistoricFns.get(f).push(c.slice(0, 7));
    }
    for (const id of ids) {
      if (!allHistoricIds.has(id)) allHistoricIds.set(id, []);
      allHistoricIds.get(id).push(c.slice(0, 7));
    }
  } catch (e) {
    // web/index.html might not exist in early commits
  }
}

const missingFnsEver = [];
for (const [fn, commitList] of allHistoricFns.entries()) {
  if (!currFns.has(fn)) {
    missingFnsEver.push({ fn, seenIn: commitList });
  }
}

const missingIdsEver = [];
for (const [id, commitList] of allHistoricIds.entries()) {
  if (!currIds.has(id)) {
    missingIdsEver.push({ id, seenIn: commitList });
  }
}

console.log('\n=== HISTORICAL AUDIT RESULTS ===');
console.log('Total unique historical functions across all commits:', allHistoricFns.size);
console.log('Total current functions:', currFns.size);
console.log('Functions ever present in Git history that are missing now:', missingFnsEver);

console.log('\nTotal unique historical DOM IDs across all commits:', allHistoricIds.size);
console.log('Total current DOM IDs:', currIds.size);
console.log('DOM IDs ever present in Git history that are missing now:', missingIdsEver);
