// Tutte le chiamate showToast(...) della pagina e dei moduli: file, riga,
// tipo e testo. Serve a tenere d'occhio i messaggi (doppi, inutili, in
// inglese) quando se ne aggiungono.
//
//   node tools/list_toasts.mjs          elenco leggibile
//   node tools/list_toasts.mjs --json   lo stesso in JSON
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['web/index.base.html'].concat(
  fs.readdirSync(path.join(root, 'web')).filter((f) => f.endsWith('.js')).map((f) => 'web/' + f)
);

// The argument list of a call, read with a small bracket/string scanner so
// commas inside strings and nested calls do not split it.
function argsAt(src, open) {
  const out = [];
  let depth = 0, cur = '', q = null;
  for (let i = open + 1; i < src.length; i++) {
    const c = src[i];
    if (q) {
      cur += c;
      if (c === '\\') { cur += src[++i]; continue; }
      if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { q = c; cur += c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) { out.push(cur.trim()); return out; }
      depth--;
    }
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  return out;
}

const rows = [];
files.forEach((file) => {
  const src = fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
  const re = /\bshowToast\(/g;
  let m;
  while ((m = re.exec(src))) {
    const before = src.slice(Math.max(0, m.index - 9), m.index);
    if (/function\s$/.test(before)) continue;
    const line = src.slice(0, m.index).split('\n').length;
    const args = argsAt(src, m.index + 'showToast'.length);
    const kind = (args[1] || '').replace(/^['"`]|['"`]$/g, '') || '(nessuno)';
    rows.push({ file, line, kind, text: args[0] || '' });
  }
});

const direct = /list_toasts\.mjs$/.test(String(process.argv[1] || '').replace(/\\/g, '/'));
if (!direct) {
  // imported by a test: no printing
} else if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 1));
} else {
  const byKind = {};
  rows.forEach((r) => { byKind[r.kind] = (byKind[r.kind] || 0) + 1; });
  console.log('Chiamate showToast: ' + rows.length);
  console.log('Per tipo: ' + Object.keys(byKind).map((k) => k + ' ' + byKind[k]).join(', '));
  rows.forEach((r) => console.log(r.file + ':' + r.line + '\t' + r.kind + '\t' + r.text));
}
export default rows;
