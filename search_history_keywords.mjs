import { execSync } from 'child_process';

const commits = execSync('git rev-list --all').toString().trim().split('\n');
console.log('Searching for profile, settings, preferences in Git history...');

for (const c of commits) {
  try {
    const html = execSync(`git show ${c}:web/index.html`, { maxBuffer: 20 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'] }).toString();
    const keywords = ['profile', 'impostazioni', 'profilo', 'settings', 'renderPrograms', 'renderProfile', 'renderSettings'];
    const found = [];
    for (const kw of keywords) {
      if (html.toLowerCase().includes(kw)) {
        found.push(kw);
      }
    }
    if (found.length > 0) {
      console.log(c.slice(0, 7), 'Found keywords:', found);
    }
  } catch (e) {}
}
