// The blog in every language: each article folder has the article written in
// all ten languages, each one loads with its own title, category and address,
// and every image it shows exists.
import fs from 'node:fs';
import path from 'node:path';
import { loadArticles, slugify } from './server/site/blog.mjs';
import { SITE_LANGS } from './server/site/i18n.mjs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const DIR = path.join('content', 'articles');
const folders = fs.readdirSync(DIR, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('_')).map((d) => d.name);
ok('1a. ci sono articoli', folders.length > 0);

// Published = dated today or earlier; a future article is still being prepared.
const far = new Date('2100-01-01');
for (const lang of SITE_LANGS) {
  const list = await loadArticles({ contentDir: DIR, siteDir: path.join('site', 'blog') }, far, lang);
  const mine = list.filter((a) => folders.includes(a.dir));
  const problems = [];
  for (const f of folders) {
    const a = mine.find((x) => x.dir === f);
    // "only: it" in the header: an article about the Italian market, not published in other languages.
    if (!a && lang !== 'it' && /^only:\s*it\s*$/m.test(fs.readFileSync(path.join(DIR, f, 'article.it.md'), 'utf8'))) continue;
    if (!a) { problems.push(f + ': non caricato'); continue; }
    if (a.lang !== lang) problems.push(f + ': scritto in ' + a.lang);
    if (!a.title || !a.slug || !a.categorySlug) problems.push(f + ': titolo, indirizzo o categoria mancante');
    if (a.html.length < 2000) problems.push(f + ': testo troppo corto');
    for (const m of a.html.matchAll(/src="\/blog-media\/([^"]+)"/g)) {
      const file = path.join(DIR, decodeURIComponent(m[1]));
      if (!fs.existsSync(file)) problems.push(f + ': immagine mancante ' + path.basename(file));
    }
  }
  if (new Set(mine.map((a) => a.slug)).size !== mine.length) problems.push('due articoli con lo stesso indirizzo');
  ok('2. ' + lang + ': tutti gli articoli nella lingua, con le loro immagini' + (problems.length ? ' (' + problems.slice(0, 4).join('; ') + ')' : ''), problems.length === 0);
}
ok('3a. una categoria scritta in un altro alfabeto ha un indirizzo', slugify('Питание') === 'питание' && slugify('营养') === '营养' && slugify('Nutrición y salud') === 'nutricion-y-salud');

console.log('');
if (failed) { console.log(failed + ' controlli del blog falliti.'); process.exit(1); }
console.log('Tutti i controlli del blog passano.');
