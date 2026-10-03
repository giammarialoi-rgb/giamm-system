// node tools/browser-checks/ui-audit/coach/agg.mjs <outdir/config> [kinds]  -> digest of the DOM audit per screen
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
const emoji = new Map();
const svgs = new Map();
for (const f of files) {
  const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const issues = (r.issues || []).filter((i) => !(i.k === 'small-tap-target' && /select/.test(i.el || '') && false));
  const byKind = {};
  for (const i of issues) (byKind[i.k] = byKind[i.k] || []).push(i);
  console.log('\n## ' + r.view + ' (' + r.currentView + ') segs=' + r.segments + ' h=' + r.scrollHeight + ' hscroll=' + r.pageScrollsHorizontally + ' emoji=[' + r.emoji + '] svg=' + r.svg);
  for (const k of Object.keys(byKind)) {
    console.log('  ' + k + ' x' + byKind[k].length);
    for (const i of byKind[k].slice(0, 6)) console.log('     ' + (i.el || i.a + ' / ' + i.b) + ' ' + JSON.stringify(Object.fromEntries(Object.entries(i).filter(([a]) => !['k', 'el', 'a', 'b'].includes(a)))));
  }
  if (process.argv[3] === 'en' && r.english && r.english.length) { console.log('  english:'); for (const e of r.english.slice(0, 12)) console.log('     ' + e.text + '   <' + e.el.slice(0, 50) + '>'); }
  for (const e of String(r.emoji || '').split(' ').filter(Boolean)) { const [c] = e.split('x'); emoji.set(c, (emoji.get(c) || new Set()).add(r.view)); }
}
console.log('\nEMOJI/GLYPHS:'); for (const [c, v] of emoji) console.log('  ' + c + '  ' + [...v].slice(0, 8).join(','));
