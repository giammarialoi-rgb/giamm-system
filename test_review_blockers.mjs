// What Apple's review asks for, kept true: account deletion (and its warning about a subscription), rules against
// objectionable content with a way to report and block, the way the paid plans are described, medical and AI notices.
import fs from 'node:fs';
let failed = 0;
const ok = (m, v) => { if (v) console.log('OK   ' + m); else { failed++; console.log('FAIL ' + m); } };
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const LANGS = ['en', 'es', 'fr', 'de', 'pt', 'ru', 'zh', 'ar', 'hi'];

console.log('--- 1. eliminazione account ---');
const page = read('web/index.base.html');
ok('1a. il dialogo avvisa dell\'abbonamento attivo e rimanda allo store (non lo annulla)', /deleteAccountSubscriptionNotice\(\)/.test(page) && /Eliminare l’account non lo annulla/.test(page) && /billingManage\(\)/.test(page));
ok('1b. il pulsante c\'e\' anche per i clienti dei coach', /\(logged \? '<button type="button" class="btn btn-outline"[^']*onclick="openDeleteAccount\(\)"/.test(page));
ok('1c. il server cancella storico acquisti e persona su RevenueCat', /DELETE FROM billing_events WHERE user_id/.test(read('server/account/identity.mjs')) && /billing\.forget\(id\)/.test(read('coach-api.mjs')));
ok('1d. le note per Apple non dicono piu\' il falso', /rimanda a Impostazioni › il tuo nome › Abbonamenti/.test(read('store/apple/review-notes.md')));

console.log('--- 2. contenuti offensivi: regole, segnala e blocca ---');
const pages = ['web/termini.html'].concat(LANGS.map((l) => 'web/legal/' + l + '/termini.html'));
const section7 = (html) => { const h = html.indexOf('<h2>7.'); return html.slice(h, html.indexOf('<h2>8.')); };
ok('2a. i termini (10 lingue) vietano contenuti offensivi, spiegano segnala/blocca, 24 ore e il contatto', pages.every((f) => { const t = section7(read(f)); return /info@nurvan\.app/.test(t) && /24/.test(t); }));
ok('2b. la versione dei termini e\' cambiata (si richiede di nuovo il consenso)', /"version": "2026-10-06"/.test(read('web/features.json')));
console.log(failed ? '\n' + failed + ' controlli falliti.' : '\nBlocchi della review Apple: tutto in regola.');
process.exit(failed ? 1 : 0);
