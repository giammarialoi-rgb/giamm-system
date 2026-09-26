// The weight-unit helpers of web/index.base.html (wUnit, kgToDisp, dispToKg,
// bwToDisp, keepKg, wFmt, wStep), cut out of the page for tests that run
// other page functions in a vm: those functions now show and read loads
// through them. Run the returned source in the test's context.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export function unitHelpersSource() {
  const src = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
  const block = (start) => {
    const at = src.indexOf(start);
    if (at < 0) throw new Error('missing ' + start);
    let d = 0;
    for (let i = src.indexOf('{', at); i < src.length; i++) {
      if (src[i] === '{') d++;
      else if (src[i] === '}' && --d === 0) return src.slice(at, i + 1);
    }
    throw new Error('unterminated ' + start);
  };
  return 'var LB_PER_KG = 2.20462262;\n' +
    ['function wUnit(', 'function kgToDisp(', 'function dispToKg(', 'function bwToDisp(', 'function keepKg(', 'function wFmt(', 'function wStep('].map(block).join('\n');
}
