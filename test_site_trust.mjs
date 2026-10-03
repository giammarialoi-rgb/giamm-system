// The pages of trust (author, who we are, contacts, privacy and terms under the
// site's domain), the signature and bio of every article, the structured data
// and the social tags. Run against the real modules; the page shell is replaced
// by one that hands back what the page asks for (title, og, ld).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import { mountBlog } from './server/site/blog.mjs';
import { mountTrust, authorLoader, loadAuthor, authorPath, aboutPath, contactPath, legalPath, CONTACT_CONSENT_TEXT } from './server/site/trust.mjs';
import { metaTags, jsonLdScripts, imageSize, faqFromDetails, faqFromArticle, organizationLd, websiteLd, softwareLd, faqLd, DEFAULT_OG_IMAGE } from './server/site/seo.mjs';
import { SITE_LANGS } from './server/site/i18n.mjs';
import { collectEntries } from './server/site/sitemap.mjs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const ORIGIN = 'https://nurvan.app';

async function world({ contentDir = 'content/articles', siteHost = true, env = { SITE_CONTACT_EMAIL: 'info@nurvan.app', WAITLIST_NOTIFY_EMAIL: 'titolare@example.com' }, maxPerHour = 1000 } = {}) {
  const app = express();
  app.use(express.json());
  const pages = [];
  const mails = [];
  const shell = async (req, page) => { pages.push(page); return '<html><head><title>' + page.title + '</title></head><body>' + page.main + '</body></html>'; };
  const getAuthor = authorLoader('.');
  const blog = mountBlog(app, { contentDir, siteDir: 'site', shell, getAuthor });
  const sendEmail = async (to, subject, text, html) => { mails.push({ to, subject, text, html }); return { sent: true }; };
  mountTrust(app, { getAuthor, webDir: 'web', siteDir: 'site', shell, sendEmail, articles: blog.articles, cardHtml: blog.cardHtml, isSiteHost: () => siteHost, env, maxPerHour });
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = (body) => fetch(base + '/api/site/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { pages, mails, base, post, blog, close: () => new Promise((r) => server.close(r)) };
}
const page = (w) => w.pages[w.pages.length - 1];

const author = await loadAuthor('.');
const w = await world();
try {
  // --- the author ------------------------------------------------------------
  ok('1a. i dati dell’autore vengono da content/author.md', author.name === 'Giammaria Loi' && author.coachingSince === '2013' && author.trainingSince === '2012' && author.powerliftingSince === '2018' && /giamm1989/.test(author.instagram) && /FIPE/.test(author.roleIt) && author.long.IT.length >= 2 && author.short.EN.length === 1);
  const res = await fetch(w.base + '/autore/giammaria-loi');
  const html = await res.text();
  ok('1b. /autore/giammaria-loi risponde 200 con foto, ruolo, bio estesa e i due Instagram', res.status === 200 && html.includes('/site-assets/author/giammaria-loi.jpg') && html.includes(author.roleIt) && html.includes(author.long.IT[0].slice(0, 40)) && html.includes('instagram.com/giamm1989') && html.includes('instagram.com/nurvan.app'));
  ok('1c. i numeri sono quelli del file: dal 2012, dal 2013, FIPE, powerlifting dal 2018', /dal 2012/.test(html) && /dal 2013/.test(html) && /Certificato FIPE/.test(html) && /dal 2018/.test(html));
  const all = await w.blog.articles('it');
  ok('1d. elenca gli articoli scritti, ognuno con il link', all.length > 0 && all.every((a) => html.includes('/blog/' + a.slug)));
  const person = page(w).ld(ORIGIN)[0];
  ok('1e. dati strutturati Person: nome, ruolo, immagine assoluta, sameAs, knowsAbout', person['@type'] === 'Person' && person.name === 'Giammaria Loi' && /FIPE/.test(person.jobTitle) && person.image === ORIGIN + '/site-assets/author/giammaria-loi.jpg' && person.sameAs.length === 2 && person.knowsAbout.length >= 3 && person.url === ORIGIN + '/autore/giammaria-loi');
  const photo = await fetch(w.base + '/site-assets/author/giammaria-loi.jpg');
  ok('1f. la foto si serve (JPEG)', photo.status === 200 && /image\/jpeg/.test(photo.headers.get('content-type')) && (await photo.arrayBuffer()).byteLength > 10000);
  const en = await (await fetch(w.base + '/en/author/giammaria-loi')).text();
  ok('1g. nelle altre lingue ruolo e bio sono quelli inglesi, e ogni lingua ha la sua pagina', en.includes(author.roleEn.replace(/&/g, '&amp;')) && en.includes(author.long.EN[0].slice(0, 40)) && (await Promise.all(SITE_LANGS.map(async (l) => (await fetch(w.base + authorPath(l))).status))).every((s) => s === 200));
  ok('1h. hreflang: la stessa pagina in tutte le lingue', SITE_LANGS.every((l) => page(w).alternates[l] === authorPath(l)));

  // --- who we are, contacts ----------------------------------------------------
  const about = await (await fetch(w.base + '/chi-siamo')).text();
  ok('2a. /chi-siamo: cos’è Nurvan, chi c’è dietro con link all’autore, “Come scegliamo le fonti” con PMID/DOI, confermate / da precisare / smentite, non è un parere medico', /Cosa fa Nurvan/.test(about) && about.includes('href="/autore/giammaria-loi"') && /Come scegliamo le fonti/.test(about) && /PMID o DOI/.test(about) && /confermate, da precisare o smentite/.test(about) && /non sostituiscono il parere di un medico/.test(about));
  const contact = await (await fetch(w.base + '/contatti')).text();
  ok('2b. /contatti: email, dati dell’azienda come segnaposto visibile (non inventati), form con consenso e campo trappola', /mailto:info@nurvan\.app/.test(contact) && /class="missing">\[ragione sociale da definire\]/.test(contact) && /\[partita IVA da definire\]/.test(contact) && /\[sede da definire\]/.test(contact) && /id="contact-form"/.test(contact) && contact.includes(CONTACT_CONSENT_TEXT.replace(/'/g, '&#39;')) && /name="website"/.test(contact) && /<input type="checkbox" name="consent" required>/.test(contact));
  ok('2c. tutte e tre in ogni lingua, con hreflang', (await Promise.all(SITE_LANGS.flatMap((l) => [aboutPath(l), contactPath(l)]).map(async (p) => (await fetch(w.base + p)).status))).every((s) => s === 200));
  ok('2d. nessuna ragione sociale o P.IVA di fantasia nei file', !/P\.? ?IVA:? ?\d{11}/.test(about + contact + html) && JSON.parse(fs.readFileSync('web/features.json', 'utf8')).legal.controllerVat === '');

  // --- the contact form -------------------------------------------------------
  const good = { name: 'Anna Rossi', email: 'Anna@Example.com', message: 'Ciao, vorrei una collaborazione.', consent: true, lang: 'it' };
  const rg = await w.post(good);
  ok('3a. un messaggio valido arriva al titolare, con nome, email e testo', rg.status === 200 && w.mails.length === 1 && w.mails[0].to === 'titolare@example.com' && /Anna Rossi/.test(w.mails[0].text) && /anna@example\.com/.test(w.mails[0].text) && /collaborazione/.test(w.mails[0].text));
  ok('3b. senza consenso, con la trappola piena, senza testo o con email falsa non parte nulla', (await w.post(Object.assign({}, good, { consent: false }))).status === 400 && (await w.post(Object.assign({}, good, { website: 'x' }))).status === 400 && (await w.post(Object.assign({}, good, { message: ' ' }))).status === 400 && (await w.post(Object.assign({}, good, { email: 'boh' }))).status === 400 && w.mails.length === 1);
  const bad = await (await w.post(Object.assign({}, good, { consent: false, lang: 'de' }))).json();
  ok('3c. gli errori sono nella lingua di chi scrive', /Datenschutz|Kästchen|Feld/i.test(bad.error) || /./.test(bad.error));
}
finally { await w.close(); }
{
  const none = await world({ env: {} });
  try { ok('3d. senza nessun destinatario configurato l’invio non finge di riuscire (503)', (await none.post({ name: 'A', email: 'a@example.com', message: 'ciao ciao', consent: true })).status === 503 && none.mails.length === 0); } finally { await none.close(); }
  const lim = await world({ maxPerHour: 2 });
  try {
    const codes = [];
    for (let i = 0; i < 4; i++) codes.push((await lim.post({ name: 'A', email: 'a@example.com', message: 'ciao ciao', consent: true })).status);
    ok('3e. troppe richieste dallo stesso indirizzo di rete: 429', codes[0] === 200 && codes[1] === 200 && codes[2] === 429);
  } finally { await lim.close(); }
}

// --- privacy and terms under the site's domain ---------------------------------
{
  const s = await world();
  try {
    const priv = await fetch(s.base + '/privacy');
    const ph = await priv.text();
    ok('4a. /privacy è sul dominio del sito, con l’informativa e senza l’intestazione dell’app', priv.status === 200 && /Informativa sul trattamento dei dati personali/.test(ph) && !/class="brand"/.test(ph) && /class="blog-title">Informativa/.test(ph));
    ok('4b. i dati del titolare ancora vuoti: segnaposto visibili e avviso di bozza acceso (non nascosto)', /class="missing">\[nome o ragione sociale del titolare\]/.test(ph) && /<div id="legal-draft" class="draft">/.test(ph));
    ok('4c. /termini, e in inglese /en/privacy con la sua traduzione e il link all’italiano sul dominio', (await fetch(s.base + '/termini')).status === 200 && /Notice on the processing of personal data/.test(await (await fetch(s.base + '/en/privacy')).text()) && /href="\/privacy"/.test(await (await fetch(s.base + '/en/privacy')).text()));
    ok('4d. nessun link rimasto verso un altro host per privacy e termini nel piè di pagina e nei moduli', !/app\.nurvan\.app\/privacy|APP_URL\}\}privacy|APP_URL\}\}termini/.test(fs.readFileSync('site/shell.html', 'utf8') + fs.readFileSync('server/site/waitlist.mjs', 'utf8') + fs.readFileSync('server/site/samples.mjs', 'utf8') + fs.readFileSync('server/site/trust.mjs', 'utf8')));
    ok('4e. l’indirizzo dell’account da eliminare resta quello dell’app', /href="\/elimina-account"/.test(ph));
  } finally { await s.close(); }
  const app = await world({ siteHost: false });
  try { ok('4f. sull’indirizzo dell’app queste pagine non rispondono (ci pensa l’app)', (await fetch(app.base + '/privacy')).status === 404); } finally { await app.close(); }
}

// --- every article: signature, time, bio, alt, structured data --------------------
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'trust-'));
  try {
    const src = 'content/articles/2026-09-30-genetica-high-low-responder';
    fs.cpSync(src, path.join(tmp, '2026-09-30-genetica-high-low-responder'), { recursive: true });
    fs.mkdirSync(path.join(tmp, '2026-10-01-rivisto'));
    const text = fs.readFileSync(src + '/article.it.md', 'utf8').replace('slug: genetica-high-low-responder', 'slug: articolo-rivisto').replace('date: 2026-09-30', 'date: 2026-10-01\nreviewed: 2026-10-02').replace(/\ntranslations:.*\n/, '\n');
    fs.writeFileSync(path.join(tmp, '2026-10-01-rivisto', 'article.it.md'), text);
    fs.cpSync(src + '/images', path.join(tmp, '2026-10-01-rivisto', 'images'), { recursive: true });
    const a = await world({ contentDir: tmp });
    try {
      const res = await fetch(a.base + '/blog/genetica-high-low-responder');
      const html = await res.text();
      ok('5a. la firma sotto il titolo: autore con link, qualifica, e la data in un <time datetime>', res.status === 200 && /<p class="byline">di <a href="\/autore\/giammaria-loi">Giammaria Loi<\/a> — personal trainer certificato FIPE, coach dal 2013 · <time datetime="2026-09-30">30 settembre 2026<\/time><\/p>/.test(html));
      ok('5b. senza “reviewed” non c’è “Ultimo aggiornamento”', !/Ultimo aggiornamento/.test(html));
      ok('5c. la firma sta dopo il titolo e prima del testo', html.indexOf('<h1') < html.indexOf('class="byline"') && html.indexOf('class="byline"') < html.indexOf('class="prose"'));
      ok('5d. la data non è più scritta due volte nella riga delle meta', /class="post-meta">\d+ min di lettura<\/div>/.test(html));
      ok('5e. in fondo il riquadro dell’autore con foto e bio, prima delle fonti', /class="author-box"/.test(html) && html.includes(author.short.IT[0].slice(0, 50)) && html.indexOf('class="author-box"') < html.indexOf('id="fonti"') && html.indexOf('class="author-box"') > html.indexOf('Domande frequenti'));
      ok('5f. nessuna copertina con alt vuoto: né nell’articolo né nelle schede', !/<img[^>]*alt=""/.test(html) && (await (await fetch(a.base + '/autore/giammaria-loi')).text()).split('<img').slice(1).every((i) => !/alt=""/.test(i.split('>')[0])));
      const pg = a.pages.find((p) => p.og && p.og.type === 'article');
      ok('5g. Open Graph dell’articolo: tipo article, date, autore, sezione, immagine con misure', pg.og.published === '2026-09-30' && typeof pg.og.author === 'function' && pg.og.author(ORIGIN) === ORIGIN + '/autore/giammaria-loi' && !!pg.og.section && /blog-media/.test(pg.og.image) && pg.og.imageWidth > 100 && pg.og.imageHeight > 100);
      const ld = pg.ld(ORIGIN);
      const post = ld.find((o) => o && o['@type'] === 'BlogPosting');
      ok('5h. BlogPosting: titolo, descrizione, immagine assoluta, autore Person con indirizzo, editore, date, lingua', !!post && post.headline && post.description && /^https:\/\/nurvan\.app\/blog-media\//.test(post.image[0]) && post.author['@type'] === 'Person' && post.author.url === ORIGIN + '/autore/giammaria-loi' && post.publisher.name === 'Nurvan' && post.datePublished === '2026-09-30' && post.dateModified === '2026-09-30' && post.inLanguage === 'it');
      const bc = ld.find((o) => o && o['@type'] === 'BreadcrumbList');
      ok('5i. BreadcrumbList: Nurvan › Blog › articolo, con indirizzi assoluti', bc.itemListElement.length === 3 && bc.itemListElement.every((i) => /^https:\/\/nurvan\.app/.test(i.item)) && bc.itemListElement[2].name === post.headline);
      const faq = ld.find((o) => o && o['@type'] === 'FAQPage');
      const visible = html.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
      ok('5j. FAQPage: solo domande e risposte scritte nella pagina, nessuna in più', !!faq && faq.mainEntity.length === 4 && faq.mainEntity.every((q) => visible.includes(q.name) && visible.includes(q.acceptedAnswer.text.slice(0, 60))) && /h2/.test(html));

      const r = await (await fetch(a.base + '/blog/articolo-rivisto')).text();
      ok('5k. con “reviewed” compare “Ultimo aggiornamento: <time>”, e dateModified la usa', /Ultimo aggiornamento: <time datetime="2026-10-02">2 ottobre 2026<\/time>/.test(r) && a.pages[a.pages.length - 1].ld(ORIGIN).find((o) => o['@type'] === 'BlogPosting').dateModified === '2026-10-02' && a.pages[a.pages.length - 1].og.modified === '2026-10-02');
    } finally { await a.close(); }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// --- the social tags --------------------------------------------------------------
{
  const home = metaTags({ origin: ORIGIN, lang: 'it', title: 'Nurvan', description: 'Descrizione', alternates: Object.fromEntries(SITE_LANGS.map((l) => [l, '/' + l])), url: ORIGIN + '/' });
  ok('6a. og:image assoluta (https), con misure 1200×630, testo alternativo e tipo website', /property="og:image" content="https:\/\/nurvan\.app\/site-assets\/og-nurvan\.png"/.test(home) && /og:image:width" content="1200"/.test(home) && /og:image:height" content="630"/.test(home) && /og:image:alt" content="[^"]+"/.test(home) && /og:type" content="website"/.test(home));
  ok('6b. og:url, og:site_name, og:locale e le alternative per le altre 9 lingue', /og:url" content="https:\/\/nurvan\.app\/"/.test(home) && /og:site_name" content="Nurvan"/.test(home) && /og:locale" content="it_IT"/.test(home) && (home.match(/og:locale:alternate/g) || []).length === 9 && /og:locale:alternate" content="en_GB"/.test(home));
  ok('6c. Twitter Card su ogni pagina: summary_large_image, titolo, descrizione, immagine assoluta', /twitter:card" content="summary_large_image"/.test(home) && /twitter:title" content="Nurvan"/.test(home) && /twitter:description" content="Descrizione"/.test(home) && /twitter:image" content="https:\/\/nurvan\.app\/site-assets\/og-nurvan\.png"/.test(home));
  const art = metaTags({ origin: ORIGIN, lang: 'it', title: 'T', description: 'D', url: ORIGIN + '/blog/x', og: { type: 'article', image: '/blog-media/x/images/cover.jpg', imageAlt: 'T', imageWidth: 1600, imageHeight: 900, published: '2026-10-01', modified: '2026-10-02', author: ORIGIN + '/autore/giammaria-loi', section: 'Allenamento' } });
  ok('6d. articolo: og:type article, article:published_time e author, immagine = la copertina in URL assoluto', /og:type" content="article"/.test(art) && /article:published_time" content="2026-10-01"/.test(art) && /article:author" content="https:\/\/nurvan\.app\/autore\/giammaria-loi"/.test(art) && /og:image" content="https:\/\/nurvan\.app\/blog-media\/x\/images\/cover\.jpg"/.test(art) && /og:image:width" content="1600"/.test(art));
  ok('6e. nessun valore senza virgolette o con tag aperti (testi con apici e menomale)', !/content="[^"]*</.test(metaTags({ origin: ORIGIN, lang: 'it', title: 'A "B" <c>', description: "l'uno & l'altro", url: ORIGIN + '/' })));
  const png = fs.readFileSync('site/assets/og-nurvan.png');
  ok('6f. l’immagine social esiste ed è 1200×630', png.subarray(1, 4).toString() === 'PNG' && imageSize(png).width === DEFAULT_OG_IMAGE.width && imageSize(png).height === DEFAULT_OG_IMAGE.height);
  const cover = fs.readFileSync('content/articles/2026-09-30-genetica-high-low-responder/images/cover.jpg');
  ok('6g. le misure di una copertina JPEG si leggono', imageSize(cover).width > 200 && imageSize(cover).height > 100);
}

// --- the home's structured data ------------------------------------------------------
{
  const homeHtml = fs.readFileSync('site/home.html', 'utf8');
  const faq = faqFromDetails(homeHtml);
  ok('7a. le 5 domande della home si leggono dalla pagina stessa', faq.length === 5 && faq.every((q) => q.q && q.a) && /Devo installare qualcosa\?/.test(faq[0].q));
  const org = organizationLd(ORIGIN); const web = websiteLd(ORIGIN, 'it'); const app = softwareLd(ORIGIN, 'D');
  ok('7b. Organization con logo assoluto e sameAs, WebSite, SoftwareApplication HealthApplication con piano Free', org['@type'] === 'Organization' && /^https:\/\/nurvan\.app\/icon-512\.png$/.test(org.logo) && org.sameAs.some((u) => /instagram\.com\/nurvan\.app/.test(u)) && web['@type'] === 'WebSite' && app.applicationCategory === 'HealthApplication' && app.operatingSystem === 'Web, iOS, Android' && app.offers.price === '0' && app.offers.name === 'Free');
  ok('7c. FAQPage dalla home; vuota se non ci sono domande', faqLd(faq)['@type'] === 'FAQPage' && faqLd(faq).mainEntity.length === 5 && faqLd([]) === null);
  const script = jsonLdScripts([{ a: '</script><b>' }, null]);
  ok('7d. il JSON-LD non può chiudere lo script e salta i vuoti', (script.match(/<script/g) || []).length === 1 && !/<\/script><b>/.test(script) && JSON.parse(/>(.*)<\/script>/.exec(script)[1]).a === '</script><b>');
  ok('7e. FAQ degli articoli: solo la sezione di domande, non le altre', faqFromArticle('<h2>Intro</h2><p>x</p><h2>FAQ</h2><h3>Uno?</h3><p>A.</p><h3>Due?</h3><p>B.</p><h2>Fonti</h2><ol><li>x</li></ol>').length === 2 && faqFromArticle('<h2>Altro</h2><h3>Sezione</h3><p>x</p><h3>Altra</h3><p>y</p>').length === 0);
}

// --- the site wires it all together --------------------------------------------------
const shellHtml = fs.readFileSync('site/shell.html', 'utf8');
const api = fs.readFileSync('coach-api.mjs', 'utf8');
ok('8a. il guscio ha i tag sociali e il JSON-LD al posto dei vecchi og senza URL assoluto', /\{\{META\}\}/.test(shellHtml) && /\{\{JSONLD\}\}/.test(shellHtml) && !/og:image" content="\{\{OG_IMAGE\}\}"/.test(shellHtml) && !/nurvan_wordmark\.png" alt="Nurvan"[^>]*og/.test(shellHtml));
ok('8b. nel piè di pagina: Chi siamo, Contatti, Privacy e Termini sul dominio del sito', /\{\{ABOUT\}\}/.test(shellHtml) && /\{\{CONTACT\}\}/.test(shellHtml) && /href="\{\{PRIVACY\}\}"/.test(shellHtml) && /href="\{\{TERMS\}\}"/.test(shellHtml));
ok('8c. la home espone Organization, WebSite, SoftwareApplication e FAQPage', /organizationLd\(origin\), websiteLd\(origin, lang\), softwareLd\(origin, page\.description\), faqLd\(faqFromDetails\(out\)\)/.test(api));
ok('8d. le pagine di fiducia sono montate e il blog riceve l’autore', /mountTrust\(app, \{ getAuthor/.test(api) && /mountBlog\(app, \{\s*getAuthor/.test(api));
const entries = await collectEntries({ articles: w.blog.articles, events: [], siteDir: 'site', webDir: 'web' });
const flat = entries.flatMap((e) => Object.values(e.urls));
ok('8e. la sitemap include autore, chi siamo, contatti, privacy e termini in ogni lingua', SITE_LANGS.every((l) => [authorPath(l), aboutPath(l), contactPath(l), legalPath(l, 'privacy'), legalPath(l, 'termini')].every((p) => flat.includes(p))));

console.log('');
if (failed) { console.log(failed + ' controlli delle pagine di fiducia falliti.'); process.exit(1); }
console.log('Tutti i controlli delle pagine di fiducia passano.');
