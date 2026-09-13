import fs from 'fs';

const raw = fs.readFileSync('persistence-core.mjs', 'utf8');
let clean = raw
  .replace(/^import\s+.*?;?\s*$/gm, '')
  .replace(/^export\s+default\s+/gm, '')
  .replace(/^export\s+const\s+/gm, 'var ')
  .replace(/^export\s+let\s+/gm, 'var ')
  .replace(/^export\s+var\s+/gm, 'var ')
  .replace(/^export\s+async\s+function\s+/gm, 'async function ')
  .replace(/^export\s+function\s+/gm, 'function ')
  .replace(/^export\s+class\s+/gm, 'class ')
  .replace(/^export\s+\{.*?\}[\s;]*/gm, '')
  .replace(/^export\s+/gm, '');

fs.writeFileSync('prepare_task20_persistence_clean.mjs', clean, 'utf8');
console.log('✓ Created prepare_task20_persistence_clean.mjs');
