// Release gate: every inline <script> in the built HTML must actually parse.
// A SyntaxError here means the whole bundle fails to load and the app renders
// an empty shell - the failure mode that shipped in 7264817..01ab18d.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const targets = process.argv.slice(2);
if (!targets.length) targets.push('web/index.html', 'app/src/main/assets/index.html');

let failures = 0;

for (const rel of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.error(`MISSING  ${rel}`);
    failures++;
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(m => !/\bsrc=/i.test(m[1]))
    .filter(m => !/\btype=["'](?!text\/javascript|module)/i.test(m[1]));

  let checked = 0;
  blocks.forEach((m, i) => {
    const code = m[2];
    if (!code.trim()) return;
    const line = html.slice(0, m.index).split('\n').length;
    try {
      new vm.Script(code, { filename: `${rel}#script[${i}]@line${line}` });
      checked++;
    } catch (err) {
      failures++;
      console.error(`\nFAIL  ${rel} - inline script #${i} starting at line ${line}`);
      console.error(`      ${err.message}`);
      const m2 = /at .*?:(\d+)/.exec(err.stack || '');
      if (m2) {
        const bad = code.split('\n')[Number(m2[1]) - 1];
        if (bad) console.error(`      > ${bad.trim().slice(0, 160)}`);
      }
    }
  });
  if (!failures) console.log(`OK    ${rel} - ${checked} inline script block(s) parse cleanly`);
}

if (failures) {
  console.error(`\n${failures} syntax failure(s). The app would render a blank screen. Build must not ship.`);
  process.exit(1);
}
console.log('\nAll inline scripts parse. No blank-screen syntax risk.');
