import { execSync } from 'child_process';

const commits = execSync('git rev-list --all').toString().trim().split('\n');
const seen = new Set();

for (const c of commits) {
  try {
    const html = execSync(`git show ${c}:web/index.html`, { maxBuffer: 20 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'] }).toString();
    const views = (html.match(/function\s+render([A-Z][a-zA-Z0-9_$]+)\s*\(/g) || []).map(m => m.replace(/function\s+render/, '').replace('(', ''));
    const renderIfs = (html.match(/currentView\s*===\s*['"][a-zA-Z0-9_-]+['"]/g) || []);
    const key = views.join(',') + ' | ' + renderIfs.join(',');
    if (!seen.has(key)) {
      seen.add(key);
      console.log(c.slice(0, 7), 'Views:', views, '| Render checks:', renderIfs);
    }
  } catch (e) {}
}
