// The <title> every blog article page would get, in every language, with its real length.
//
//   node tools/seo_titles.mjs            all articles
//   node tools/seo_titles.mjs --long     only the ones over the limit
import path from 'node:path';
import { loadArticles, pageTitle, TITLE_MAX } from '../server/site/blog.mjs';
import { SITE_LANGS } from '../server/site/i18n.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const onlyLong = process.argv.includes('--long');
const len = (s) => [...String(s)].length;
let bad = 0, rows = 0;
for (const lang of SITE_LANGS) {
  const list = await loadArticles({ contentDir: path.join(root, 'content/articles'), siteDir: path.join(root, 'site/blog') }, new Date('2030-01-01'), lang);
  for (const a of list) {
    const t = pageTitle(a);
    rows++;
    if (len(t) > TITLE_MAX) bad++;
    if (onlyLong && len(t) <= TITLE_MAX) continue;
    console.log(lang.padEnd(3), String(len(t)).padStart(3), a.slug.slice(0, 48).padEnd(48), t);
  }
}
console.log(rows + ' pagine, ' + bad + ' con il titolo oltre ' + TITLE_MAX);
