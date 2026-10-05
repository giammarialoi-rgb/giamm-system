// Every page of the site, as the server answers it: <title> and og:title length, <img> without alt.
//
//   node tools/seo_crawl.mjs [base=http://localhost:4555] [host=nurvan.app]
//
// The base is a running server; the Host header makes it answer as the site (not the app).
const base = process.argv[2] || 'http://localhost:4555';
const host = process.argv[3] || 'nurvan.app';
const MAX = 60;
const len = (s) => [...String(s)].length;
const get = async (p) => {
  const r = await fetch(base + p, { headers: { Host: host }, redirect: 'manual' });
  return { status: r.status, text: await r.text() };
};
const unesc = (s) => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const index = await get('/sitemap.xml');
const maps = [...index.text.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
const urls = new Set();
for (const m of maps) for (const x of (await get(m)).text.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)) urls.add(x[1]);
let pages = 0, longTitle = 0, longOg = 0, noAlt = 0, errors = 0;
const out = [];
for (const u of urls) {
  const r = await get(u);
  if (r.status !== 200) { errors++; out.push(`HTTP ${r.status} ${u}`); continue; }
  pages++;
  const title = unesc((/<title>([\s\S]*?)<\/title>/.exec(r.text) || [])[1] || '');
  const og = unesc((/<meta property="og:title" content="([^"]*)"/.exec(r.text) || [])[1] || '');
  if (len(title) > MAX) { longTitle++; out.push(`TITLE ${len(title)} ${u} | ${title}`); }
  if (og && len(og) > MAX) { longOg++; out.push(`OG    ${len(og)} ${u} | ${og}`); }
  for (const img of r.text.matchAll(/<img\b[^>]*>/gi)) if (!/\balt\s*=/.test(img[0])) { noAlt++; out.push(`NOALT ${u} ${img[0].slice(0, 120)}`); }
}
// pages that are not in the sitemap but are public
for (const u of ['/elimina-account', '/privacy', '/termini']) {
  const r = await get(u);
  if (r.status !== 200) { out.push(`(fuori sitemap) HTTP ${r.status} ${u}`); continue; }
  pages++;
  const title = unesc((/<title>([\s\S]*?)<\/title>/.exec(r.text) || [])[1] || '');
  if (len(title) > MAX) { longTitle++; out.push(`TITLE ${len(title)} ${u} | ${title}`); }
  for (const img of r.text.matchAll(/<img\b[^>]*>/gi)) if (!/\balt\s*=/.test(img[0])) { noAlt++; out.push(`NOALT ${u} ${img[0].slice(0, 120)}`); }
}
console.log(out.join('\n'));
console.log(`${pages} pagine · titoli oltre ${MAX}: ${longTitle} · og:title oltre ${MAX}: ${longOg} · img senza alt: ${noAlt} · errori: ${errors}`);
