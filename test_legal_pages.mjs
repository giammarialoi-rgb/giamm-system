// The legal and account pages in every language: each translation keeps the
// structure of the Italian page (sections, the fields filled from
// features.json, the scripts), says that the Italian text prevails, and the
// server picks the page by language.
import fs from 'node:fs';
import path from 'node:path';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const LANGS = ['en', 'es', 'fr', 'de', 'pt', 'ru', 'zh', 'ar', 'hi'];
const PAGES = ['privacy.html', 'termini.html', 'elimina-account.html', 'verifica-email.html', 'reimposta-password.html'];
const count = (s, re) => (s.match(re) || []).length;
const shape = (html) => ({
  h2: count(html, /<h2[\s>]/g),
  legal: (html.match(/data-legal="[^"]+"/g) || []).sort().join(','),
  ids: (html.match(/\sid="[^"]+"/g) || []).sort().join(','),
  scripts: (html.match(/<script[^>]*src="[^"]+"/g) || []).join(','),
  inputs: count(html, /<input\b/g) + count(html, /<button\b/g) + count(html, /<form\b/g)
});

for (const lang of LANGS) {
  const problems = [];
  for (const page of PAGES) {
    const file = path.join('web', 'legal', lang, page);
    if (!fs.existsSync(file)) { problems.push(page + ': manca'); continue; }
    const src = shape(fs.readFileSync(path.join('web', page), 'utf8'));
    const html = fs.readFileSync(file, 'utf8');
    const out = shape(html);
    for (const k of Object.keys(src)) if (src[k] !== out[k]) problems.push(page + ': ' + k + ' diverso');
    if (!new RegExp('<html lang="' + lang + '"').test(html)) problems.push(page + ': lang');
    if (/^(privacy|termini|elimina-account)/.test(page) && !/href="\?lang=it"/.test(html)) problems.push(page + ': manca il rimando alla versione italiana');
  }
  ok('1. ' + lang + ': le cinque pagine tradotte, stessa struttura dell’italiano' + (problems.length ? ' (' + problems.slice(0, 4).join('; ') + ')' : ''), problems.length === 0);
}

const api = fs.readFileSync('coach-api.mjs', 'utf8');
ok('2a. il server sceglie la pagina per lingua (?lang= o lingua del browser) e ripiega sull’italiano', /path\.join\(__dirname, "web", "legal", lang, file\)/.test(api) && /req\.query\.lang/.test(api) && /res\.sendFile\(path\.join\(__dirname, "web", file\)\)/.test(api));
ok('2b. l’app apre le pagine nella sua lingua', /'\?lang=' \+ lang/.test(fs.readFileSync('web/index.base.html', 'utf8')));
ok('2c. i link nelle email portano alla pagina nella lingua dell’email', /"&lang=" \+ lang/.test(fs.readFileSync('server/account/email-auth.mjs', 'utf8')));

console.log('');
if (failed) { console.log(failed + ' controlli delle pagine legali falliti.'); process.exit(1); }
console.log('Tutti i controlli delle pagine legali passano.');
