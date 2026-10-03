// The texts of the site that need a translation.
//
//   node tools/site_i18n.mjs          write site/i18n/_strings.json and say what each language is missing
//   node tools/site_i18n.mjs --check  exit 1 when a language is missing a text
//
// The texts come from the pages (site/shell.html, site/home.html), from
// site/shots.json and from site/i18n/_server.json: the texts written in the
// server code (server/site/blog.mjs, the site part of coach-api.mjs), listed
// there by hand because they are assembled in code.
import fs from 'node:fs';
import path from 'node:path';
import { pageTexts, SITE_LANGS } from '../server/site/i18n.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SITE = path.join(ROOT, 'site');
const read = (f) => fs.readFileSync(path.join(SITE, f), 'utf8');

const keys = new Set();
for (const f of ['shell.html', 'home.html']) pageTexts(read(f)).forEach((t) => keys.add(t));
JSON.parse(read('shots.json')).forEach((s) => { if (s.title) keys.add(s.title); if (s.text) keys.add(s.text); });
JSON.parse(read('i18n/_server.json')).forEach((t) => keys.add(t));
// Names and marks that are the same everywhere.
const SAME = /^(Nurvan|Instagram|Blog|Free|Standard|Coach|Coach Pro|Coach AI|X Gym|XG|Powered by Nurvan|Shoulder press|Dashboard|RIR 2|Train · Fuel · Recover · Track · Evolve|© |[\d\s€.,×–-]+)$/;
const list = [...keys].filter((k) => !SAME.test(k) && !/^\{\{/.test(k)).sort((a, b) => a.localeCompare(b, 'it'));
fs.writeFileSync(path.join(SITE, 'i18n', '_strings.json'), JSON.stringify(list, null, 0).replace(/","/g, '",\n"') + '\n');
console.log(list.length + ' texts');

let bad = 0;
for (const lang of SITE_LANGS) {
  if (lang === 'it') continue;
  const file = path.join(SITE, 'i18n', lang + '.json');
  const dict = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const holes = (s) => (String(s).match(/\{\d+\}/g) || []).sort().join(',');
  const missing = list.filter((k) => !(k in dict) || !String(dict[k]).trim() || holes(k) !== holes(dict[k]));
  if (missing.length) { bad++; console.log(lang + ': ' + missing.length + ' missing' + (missing.length <= 5 ? ' — ' + missing.join(' | ') : '')); }
  else console.log(lang + ': complete');
}
if (process.argv.includes('--check') && bad) process.exit(1);
