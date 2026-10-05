// The <title> and og:title of every page of the site: at most 60 characters (what a search result shows).
import path from 'node:path';
import { loadArticles, pageTitle, parseArticle, TITLE_MAX } from './server/site/blog.mjs';
import { fitTitle, fitHeadTitles } from './server/site/seo.mjs';
import { SITE_LANGS } from './server/site/i18n.mjs';

let failed = 0;
const ok = (m, v) => { if (v) console.log('OK   ' + m); else { failed++; console.log('FAIL ' + m); } };
const len = (s) => [...String(s)].length;

ok('1a. title + brand that fits keeps the brand', pageTitle({ title: 'Proteine in definizione' }) === 'Proteine in definizione | Nurvan');
const long = 'Come costruire una scheda di allenamento per ipertrofia';
ok('1b. title that fits only without the brand loses the brand', len(long) <= 60 && len(long) + 9 > 60 && pageTitle({ title: long }) === long);
const seo = pageTitle({ title: 'Un titolo lunghissimo che supera di molto i sessanta caratteri del risultato', seoTitle: 'Titolo SEO corto' });
ok('1c. seoTitle comes before the article title', seo === 'Titolo SEO corto | Nurvan');
const cut = pageTitle({ title: 'Un titolo lunghissimo che supera di molto i sessanta caratteri del risultato di ricerca' });
ok('1d. a title too long on its own is cut at a word, never over 60', len(cut) <= 60 && !/\s$/.test(cut) && 'Un titolo lunghissimo che supera di molto i sessanta caratteri del risultato di ricerca'.startsWith(cut));
const art = parseArticle('2026-10-01-x', '---\ntitle: "Il titolo dell\'articolo"\nseotitle: "Titolo SEO"\n---\nTesto');
ok('1e. seotitle in the header of an article is read, the title (h1) stays', art.seoTitle === 'Titolo SEO' && art.title === "Il titolo dell'articolo");

ok('2a. fitTitle drops the brand of a long page title', fitTitle('Trabalho de parto e parto: o que dizem as evidências — Nurvan') === 'Trabalho de parto e parto: o que dizem as evidências');
const head = '<title>Trabalho de parto e parto: o que dizem as evidências — Nurvan</title><meta property="og:title" content="Trabalho de parto e parto: o que dizem as evidências — Nurvan"><meta name="twitter:title" content="Breve — Nurvan">';
const fixed = fitHeadTitles(head);
ok('2b. fitHeadTitles fits title, og:title and twitter:title and leaves the short ones', !/evidências — Nurvan/.test(fixed) && /content="Breve — Nurvan"/.test(fixed));
ok('2c. what is escaped stays escaped', fitHeadTitles('<title>Tom &amp; Jerry</title>') === '<title>Tom &amp; Jerry</title>');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')));
let pages = 0, tooLong = [];
for (const lang of SITE_LANGS) {
  const list = await loadArticles({ contentDir: path.join(root, 'content/articles'), siteDir: path.join(root, 'site/blog') }, new Date('2030-01-01'), lang);
  for (const a of list) { pages++; if (len(pageTitle(a)) > TITLE_MAX) tooLong.push(lang + '/' + a.slug); }
}
ok('3a. every article page in every language has a title of at most 60 characters (' + pages + ' pages)' + (tooLong.length ? ' - ' + tooLong.join(', ') : ''), pages > 50 && !tooLong.length);

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nTitoli delle pagine: tutti entro 60 caratteri.');
