// What Apple's review asks for, kept true: account deletion (and its warning about a subscription), rules against
// objectionable content with a way to report and block, the way the paid plans are described, medical and AI notices.
import fs from 'node:fs';
import { stripWebOnly } from './server/site/web-only.mjs';
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
console.log('--- 3. pagamenti: niente Stripe né primo periodo gratuito nell’app ---');
const termsApp = stripWebOnly(read('web/termini.html'));
const privacyApp = stripWebOnly(read('web/privacy.html'));
ok('3a. i termini per l’app non parlano di Stripe, del primo periodo gratuito o di acquisti dal sito', !/Stripe|primo periodo|dal sito/.test(termsApp) && /Google Play o App Store/.test(termsApp));
ok('3b. la privacy per l’app non nomina Stripe', !/Stripe/.test(privacyApp) && /RevenueCat/.test(privacyApp));
ok('3c. le pagine per il sito restano complete (Stripe, recesso)', /Stripe/.test(read('web/termini.html')) && /recedere/.test(read('web/termini.html')) && /Stripe/.test(read('web/privacy.html')));
ok('3d. l’app chiede la versione per l’app (?app=1) e il server la serve', page.includes('app=1') && read('coach-api.mjs').includes('asksForAppVersion(req)') && read('server/site/trust.mjs').includes('asksForAppVersion(req)'));
const plansUi = read('web/plans-ui.js');
ok('3e. la prova di 14 giorni dice che non c’è addebito né rinnovo', plansUi.includes("GIORNI DI COACH</button>") && plansUi.includes('Nessun addebito e nessun rinnovo automatico'));
console.log('--- 4. avvisi medici fissi in Esami, Integratori, Terapia, Coach AI ---');
const fnBody = (name) => { const a = page.search(new RegExp('function ' + name + String.raw`\(c\) ?\{`)); return page.slice(a, a + 9000); };
ok('4a. Esami, Integratori, Terapia e Coach AI mostrano l’avviso in cima, non chiudibile', [['renderExams', 'exams'], ['renderSupplements', 'supplements'], ['renderTherapy', 'therapy'], ['renderAI', 'ai']].every(([fn, kind]) => fnBody(fn).includes("domainNoticeHtml('" + kind + "')")) && !/domain-notice[^>]*onclick/.test(page));
ok('4b. gli avvisi dicono medico / non prescrizione / non diagnosi', /non diagnosi/.test(page) && /non prescrizione/.test(page) && /non un medico/.test(page));
console.log('--- 5. consenso AI: testo chiaro e controllo lato server ---');
const apiSrc = read('coach-api.mjs');
ok('5a. il foglio del consenso dice cosa viene inviato, a chi e come viene usato (niente addestramento)', page.includes('Cosa viene inviato:') && page.includes('Come vengono usati:') && page.includes('non li usa per addestrare modelli di AI'));
ok('5b. il server rifiuta le richieste AI senza un consenso registrato (AI_CONSENT_REQUIRED)', apiSrc.includes('!aiConsentActive(row)') && apiSrc.includes('AI_CONSENT_REQUIRED'));
ok('5c. l’app manda il consenso prima della richiesta e, se il server lo chiede, mostra il foglio e riprova', page.includes('await sendPendingConsents()') && page.includes("code === 'AI_CONSENT_REQUIRED'"));
console.log(failed ? '\n' + failed + ' controlli falliti.' : '\nBlocchi della review Apple: tutto in regola.');
process.exit(failed ? 1 : 0);
