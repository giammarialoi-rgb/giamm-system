// The translations, from the translators' work to the files the app reads.
//
//   node tools/i18n_pack.mjs chunks        split i18n/strings.json into i18n/chunks/NN.json (what is still to translate, per language: --lang xx)
//   node tools/i18n_pack.mjs check xx NN   check i18n/out/xx/NN.json against i18n/chunks/NN.json
//   node tools/i18n_pack.mjs build         i18n/out/*/ + i18n/tm/xx.json -> i18n/tm/xx.json and web/i18n/xx.json
//
// i18n/tm/<lang>.json is the memory: every Italian text ever translated. A
// text that changes in the code only needs its own new translation.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const I18N = path.join(ROOT, 'i18n');
export const LANGS = ['en', 'es', 'fr', 'de', 'pt', 'ru', 'zh', 'ar', 'hi'];
const read = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : fallback);
const holes = (s) => (String(s).match(/\{\d+\}/g) || []).sort().join(',');

export function problems(key, value) {
  if (typeof value !== 'string' || !value.trim()) return 'empty';
  if (holes(key) !== holes(value)) return 'holes differ: ' + holes(key) + ' / ' + holes(value);
  return '';
}

const cmd = /i18n_pack\.mjs$/.test(process.argv[1] || '') ? process.argv[2] : 'none';
if (cmd === 'chunks') {
  const keys = read(path.join(I18N, 'strings.json'), []);
  const li = process.argv.indexOf('--lang');
  const tm = li !== -1 ? read(path.join(I18N, 'tm', process.argv[li + 1] + '.json'), {}) : {};
  const todo = keys.filter((k) => !(k in tm));
  const dir = path.join(I18N, 'chunks');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  let chunk = []; let size = 0; let n = 0;
  const flush = () => { if (!chunk.length) return; n++; fs.writeFileSync(path.join(dir, String(n).padStart(2, '0') + '.json'), JSON.stringify(chunk, null, 0).replace(/","/g, '",\n"') + '\n'); chunk = []; size = 0; };
  for (const k of todo) { chunk.push(k); size += k.length; if (size > 15000 || chunk.length >= 520) flush(); }
  flush();
  console.log(todo.length + ' texts in ' + n + ' chunks');
} else if (cmd === 'check') {
  const lang = process.argv[3]; const nn = process.argv[4];
  const keys = read(path.join(I18N, 'chunks', nn + '.json'), null);
  const out = read(path.join(I18N, 'out', lang, nn + '.json'), null);
  if (!keys || !out) { console.log('FAIL missing file'); process.exit(1); }
  const bad = [];
  keys.forEach((k) => { if (!(k in out)) bad.push('missing: ' + k.slice(0, 80)); else { const p = problems(k, out[k]); if (p) bad.push(p + ' — ' + k.slice(0, 80)); } });
  Object.keys(out).forEach((k) => { if (!keys.includes(k)) bad.push('not a key of this chunk (keys must be copied exactly): ' + k.slice(0, 80)); });
  if (bad.length) { console.log('FAIL ' + bad.length + '\n' + bad.slice(0, 60).join('\n')); process.exit(1); }
  console.log('OK ' + lang + ' ' + nn + ': ' + keys.length + ' texts');
} else if (cmd === 'build') {
  const keys = read(path.join(I18N, 'strings.json'), []);
  fs.mkdirSync(path.join(I18N, 'tm'), { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'web', 'i18n'), { recursive: true });
  for (const lang of LANGS) {
    const tmFile = path.join(I18N, 'tm', lang + '.json');
    const tm = read(tmFile, {});
    const outDir = path.join(I18N, 'out', lang);
    if (fs.existsSync(outDir)) for (const f of fs.readdirSync(outDir).sort()) {
      const part = read(path.join(outDir, f), {});
      for (const [k, v] of Object.entries(part)) if (!problems(k, v)) tm[k] = v;
    }
    // Labels translated by hand (i18n/manual.json), one value per language in the order of LANGS.
    const manual = read(path.join(I18N, 'manual.json'), {});
    for (const [k, v] of Object.entries(manual)) if (Array.isArray(v) && v[LANGS.indexOf(lang)] && !(k in tm)) tm[k] = v[LANGS.indexOf(lang)];
    const sorted = {};
    Object.keys(tm).sort().forEach((k) => { sorted[k] = tm[k]; });
    fs.writeFileSync(tmFile, JSON.stringify(sorted, null, 0).replace(/","/g, '",\n"') + '\n');
    const pack = {};
    let missing = 0;
    keys.forEach((k) => { if (!(k in tm)) { missing++; return; } // A text with a value inside is kept even when it reads the same: the value may need translating.
      if (tm[k] !== k || /\{\d+\}/.test(k)) pack[k] = tm[k]; });
    fs.writeFileSync(path.join(ROOT, 'web', 'i18n', lang + '.json'), JSON.stringify(pack));
    console.log(lang + ': ' + Object.keys(pack).length + ' in the pack, ' + missing + ' missing of ' + keys.length);
  }
} else if (cmd !== 'none') {
  console.log('usage: chunks | check <lang> <NN> | build');
}
