// Level 4 of the 25/09 audit, and what the stores ask for privacy: the server
// hardening, the Android permissions and backup, the correctness fixes, the
// legal pages, the consents (age, notice and terms, health data, AI).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  loadLegal, validMainConsent, aiConsentActive, aiConsentWithdrawn, consentState, mountConsentRoutes
} from './server/account/consent.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
const SRC = read('web/index.base.html');
const API = read('coach-api.mjs');
let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

console.log('');
console.log('--- 1. server: intestazioni, errori, accessi ---');
{
  ok('1a. nosniff, Referrer-Policy, frame-ancestors, Permissions-Policy, HSTS in produzione',
    /X-Content-Type-Options", "nosniff"/.test(API) && /Referrer-Policy/.test(API) && /frame-ancestors 'self'/.test(API)
    && /Permissions-Policy/.test(API) && /isProduction\(process\.env\)\) res\.setHeader\("Strict-Transport-Security"/.test(API));
  const health = API.slice(API.indexOf('app.get("/health"'), API.indexOf('app.get("/health"') + 1500);
  ok('1b. /health non dice piu\' host ed errore del database', !/dbHost\s*[,:]/.test(health) && !/dbError\s*[,:]/.test(health));
  ok('1c. il gestore globale mostra il messaggio solo per errori voluti (< 500)', /const expose = status < 500/.test(API));
  const auth = read('server/admin/auth.mjs');
  ok('1d. admin: i tentativi falliti si sommano tra codici diversi nell\'ora', /created_at > now\(\) - interval '1 hour'|HOUR/i.test(auth));
  const cp = read('coach-practice.mjs');
  ok('1e. password-help: stessa risposta sempre, niente enumerazione degli atleti', /Se il nome e' corretto, il tuo coach ricevera' la richiesta\./.test(cp));
  ok('1f. reset password e nuovo invito chiudono le sessioni dell\'atleta', (cp.match(/tokens_valid_after/g) || []).length >= 3);
  ok('1g. conferma del pasto solo del coach dell\'atleta', /String\(row\.coach_user_id \|\| ""\) !== String\(owner\.coachUserId\)/.test(read('server/coach-os/media-ai.mjs')));
  const ci = read('server/coach-os/checkins.mjs');
  ok('1h. check-in: un solo invio per operationId (retry dopo timeout)', /client_operation_id = \$2/.test(ci));
  ok('1i. check-in: le domande viste restano con le risposte', /answer_rows/.test(ci) && /answerRows/.test(read('web/coach-os/checkins.js')));
  ok('1j. migrazione 0019 e schemaTarget', fs.existsSync(path.join(root, 'server/db/migrations/0019_checkins_privacy.sql')) && Number(JSON.parse(read('release.json')).schemaTarget) >= 19);
}

console.log('');
console.log('--- 2. Android: permessi, backup, file condivisi ---');
{
  const man = read('app/src/main/AndroidManifest.xml');
  ok('2a. nessun permesso Health Connect dichiarato senza uso', !/android\.permission\.health\./.test(man));
  ok('2b. niente ACTIVITY_RECOGNITION ne\' SCHEDULE_EXACT_ALARM', !/ACTIVITY_RECOGNITION/.test(man) && !/SCHEDULE_EXACT_ALARM/.test(man));
  ok('2c. nessun backup Android dei dati sanitari (allowBackup false + regole)', /android:allowBackup="false"/.test(man) && /android:dataExtractionRules="@xml\/data_extraction_rules"/.test(man));
  const rules = read('app/src/main/res/xml/data_extraction_rules.xml');
  ok('2d. le regole escludono tutto da cloud-backup e device-transfer', /<cloud-backup>[\s\S]*domain="sharedpref"[\s\S]*<\/cloud-backup>/.test(rules) && /<device-transfer>[\s\S]*domain="database"[\s\S]*<\/device-transfer>/.test(rules));
  ok('2e. il receiver dei promemoria non e\' esportato', /\.ReminderReceiver"\s*\n\s*android:exported="false"/.test(man));
  const paths = read('app/src/main/res/xml/file_paths.xml');
  ok('2f. FileProvider solo sulla cartella share della cache', /<cache-path name="share" path="share\/" \/>/.test(paths) && !/<files-path/.test(paths) && !/path="\."/.test(paths));
  const gradle = read('app/build.gradle');
  ok('2g. nessuna libreria Health Connect', !/health\.connect/.test(gradle));
  const main = read('app/src/main/java/com/giammaria/system/MainActivity.java');
  ok('2h. il codice Java non usa Health Connect', !/HealthConnectClient|PermissionController/.test(main));
  const onCreate = main.slice(main.indexOf('web.setBackgroundColor(0xFF090909);'), main.indexOf('web.loadUrl("file:///android_asset/index.html");'));
  ok('2i. microfono e fotocamera non chiesti all\'avvio', !/requestPermissions/.test(onCreate));
  ok('2j. il microfono e\' chiesto quando parte l\'input vocale', (main.match(/if \(!askMicrophone\(\)\) return;/g) || []).length === 2);
  ok('2k. la build dell\'APK rigenera la pagina dai sorgenti', /build_master25\.mjs/.test(gradle));
}

console.log('');
console.log('--- 3. testi: niente promesse di Connessione Salute ---');
{
  ok('3a. la pagina non promette lettura o permessi di Connessione Salute', !/Apri Connessione Salute|Richiesta permessi Connessione Salute|Concedi i permessi di Connessione Salute/.test(SRC));
  const svc = read('prepare_task20_js_services.mjs');
  ok('3b. le stime non si presentano come dati Health Connect', !/'health_connect'|health_connect_bridge|Collega Health Connect/.test(svc));
}

console.log('');
console.log('--- 4. features.json: i campi legali ---');
const FEATURES = JSON.parse(read('web/features.json'));
{
  const legal = FEATURES.legal || {};
  ok('4a. versione dell\'informativa ed eta\' minima 16', /^\d{4}-\d{2}-\d{2}/.test(legal.version || '') && legal.minAge === 16);
  ok('4b. i dati del titolare sono campi (vuoti finche\' non compilati), non testo nel codice',
    ['controllerName', 'controllerAddress', 'controllerVat', 'privacyEmail', 'hostingRegion'].every((k) => typeof legal[k] === 'string'));
  ok('4c. il server legge la stessa versione', loadLegal(path.join(root, 'web/features.json')).version === legal.version);
  ok('4d. features.js rigenerato con il blocco legal', /"legal":\{"version":"/.test(read('web/features.js')));
}

console.log('');
console.log('--- 5. le pagine pubbliche ---');
{
  const pages = { privacy: 'web/privacy.html', termini: 'web/termini.html', 'elimina-account': 'web/elimina-account.html' };
  Object.entries(pages).forEach(([slug, file]) => {
    const html = read(file);
    ok('5a. ' + slug + ': legge i campi da features.js e mostra l\'avviso di bozza', /<script src="features\.js"><\/script>\s*<script src="legal-pages\.js"><\/script>/.test(html) && /id="legal-draft"/.test(html));
    ok('5b. ' + slug + ': pagina per telefono (viewport) e servita a /' + slug, /name="viewport"/.test(html) && API.includes('"/' + slug + '": "' + slug + '.html"'));
  });
  const privacy = read('web/privacy.html');
  ok('5c. informativa: titolare, dati sanitari art. 9, AI/Gemini, fornitori, trasferimenti, conservazione, diritti, Garante, eta\', non medico',
    ['Titolare', 'art. 9', 'Gemini', 'Render', 'Resend', 'Data Privacy Framework', 'conserviamo', 'Garante', 'data-legal="minAge"', 'dispositivo medico'].every((s) => privacy.includes(s)));
  const del = read('web/elimina-account.html');
  ok('5d. eliminazione (Play): passi in app, richiesta senza app, cosa si cancella e cosa resta', /Dall'app/.test(del) && /Senza l'app/.test(del) && /Cosa viene eliminato/.test(del) && /Cosa resta/.test(del));
  const sw = read('web/sw.js');
  ok('5e. il service worker non tiene copie vecchie delle pagine legali', /privacy\|termini\|elimina-account/.test(sw));

  // legal-pages.js: fields filled, draft banner while the controller is empty
  const run = (legal) => {
    const els = [
      { key: 'controllerName', tag: 'SPAN', textContent: '', cls: [], attrs: {} },
      { key: 'privacyEmail', tag: 'A', textContent: '', cls: [], attrs: {} },
      { key: 'minAge', tag: 'SPAN', textContent: '', cls: [], attrs: {} }
    ].map((e) => Object.assign(e, {
      getAttribute: (n) => (n === 'data-legal' ? e.key : e.attrs[n]),
      setAttribute: (n, v) => { e.attrs[n] = v; },
      tagName: e.tag,
      classList: { add: (c) => e.cls.push(c) }
    }));
    const banner = { hidden: true };
    const ctx = {
      self: { NURVAN_FEATURES: { contactEmail: 'contatto@example.com', legal } },
      document: { querySelectorAll: () => els, getElementById: () => banner }
    };
    vm.createContext(ctx);
    vm.runInContext(read('web/legal-pages.js'), ctx);
    return { els, banner };
  };
  const empty = run({ minAge: 16, controllerName: '', controllerAddress: '', privacyEmail: '' });
  ok('5f. titolare non compilato: segnaposto visibile e avviso di bozza', /\[/.test(empty.els[0].textContent) && empty.banner.hidden === false);
  ok('5g. senza email privacy si usa il contatto generale', empty.els[1].attrs.href === 'mailto:contatto@example.com');
  const full = run({ minAge: 16, controllerName: 'Esempio Srl', controllerAddress: 'Via Roma 1', privacyEmail: 'privacy@example.com' });
  ok('5h. compilato: i valori al posto dei segnaposto e niente avviso', full.els[0].textContent === 'Esempio Srl' && full.banner.hidden === true && full.els[1].attrs.href === 'mailto:privacy@example.com');
}

console.log('');
console.log('--- 6. consensi sul server ---');
{
  const v = '2026-09-25';
  ok('6a. consenso valido solo con eta\', termini e dati sanitari per la versione in vigore',
    validMainConsent({ version: v, age: true, terms: true, health: true }, v)
    && !validMainConsent({ version: v, age: true, terms: true }, v)
    && !validMainConsent({ version: '2020-01-01', age: true, terms: true, health: true }, v)
    && !validMainConsent({ version: v, age: 'true', terms: true, health: true }, v));
  const t0 = '2026-09-01T10:00:00Z', t1 = '2026-09-10T10:00:00Z';
  ok('6b. AI: dato, revocato, ridato', aiConsentActive({ ai_consent_at: t0 }) && !aiConsentActive({ ai_consent_at: t0, ai_consent_withdrawn_at: t1 }) && aiConsentActive({ ai_consent_at: t1, ai_consent_withdrawn_at: t0 }));
  ok('6c. il server rifiuta l\'AI solo dopo una revoca (mai chiesto = decide l\'app)', aiConsentWithdrawn({ ai_consent_withdrawn_at: t1 }) && !aiConsentWithdrawn({}) && !aiConsentWithdrawn(null));
  const st = consentState({ consent_version: v, consent_at: t0, age_confirmed_at: t0, health_consent_at: t0 }, v);
  ok('6d. stato: ok solo per la versione in vigore', st.ok === true && consentState({ consent_version: '2020-01-01', age_confirmed_at: t0, health_consent_at: t0 }, v).ok === false);

  // the routes, on a fake app and database
  const routes = {};
  const app = { get: (p, h) => { routes['GET ' + p] = h; }, post: (p, h) => { routes['POST ' + p] = h; } };
  const row = { consent_version: null, consent_at: null, age_confirmed_at: null, health_consent_at: null, ai_consent_at: null, ai_consent_withdrawn_at: null };
  const queries = [];
  const pool = {
    async query(sql, params) {
      queries.push(sql);
      if (/^SELECT/.test(sql)) return { rows: [Object.assign({}, row)] };
      if (/consent_version = \$2/.test(sql)) { row.consent_version = params[1]; row.consent_at = row.age_confirmed_at = row.health_consent_at = new Date().toISOString(); }
      if (/ai_consent_at = NOW\(\)/.test(sql)) { row.ai_consent_at = new Date(Date.now() + 5).toISOString(); row.ai_consent_withdrawn_at = null; }
      if (/ai_consent_withdrawn_at = NOW\(\)/.test(sql)) { row.ai_consent_withdrawn_at = new Date(Date.now() + 10).toISOString(); }
      return { rows: [] };
    }
  };
  mountConsentRoutes(app, { pool, accountFromBearer: async (h) => (h === 'Bearer ok' ? { id: 7 } : null), featuresPath: path.join(root, 'web/features.json') });
  const call = async (key, headers, body) => {
    let status = 200, payload = null;
    const res = { status(s) { status = s; return this; }, json(p) { payload = p; return this; } };
    await routes[key]({ headers, body }, res);
    return { status, payload };
  };
  const version = FEATURES.legal.version;
  const r0 = await call('GET /api/account/consent', { authorization: 'Bearer no' });
  ok('6e. senza sessione: 401', r0.status === 401);
  const r1 = await call('GET /api/account/consent', { authorization: 'Bearer ok' });
  ok('6f. account nuovo: consenso da chiedere', r1.status === 200 && r1.payload.consent.ok === false && r1.payload.consent.version === version);
  const r2 = await call('POST /api/account/consent', { authorization: 'Bearer ok' }, { version, age: true, terms: true });
  ok('6g. senza il consenso ai dati sanitari: rifiutato, niente salvato', r2.status === 400 && r2.payload.code === 'CONSENT_INCOMPLETE' && row.consent_version === null);
  const r3 = await call('POST /api/account/consent', { authorization: 'Bearer ok' }, { version, age: true, terms: true, health: true });
  ok('6h. completo: salvato con la versione', r3.status === 200 && r3.payload.consent.ok === true && row.consent_version === version);
  const r4 = await call('POST /api/account/consent', { authorization: 'Bearer ok' }, { ai: true });
  ok('6i. AI attivata', r4.payload.consent.ai.granted === true);
  const r5 = await call('POST /api/account/consent', { authorization: 'Bearer ok' }, { ai: false });
  ok('6j. AI revocata', r5.payload.consent.ai.granted === false && !!r5.payload.consent.ai.withdrawnAt);
  const r6 = await call('POST /api/account/consent', { authorization: 'Bearer ok' }, {});
  ok('6k. richiesta vuota: 400', r6.status === 400);

  ok('6l. la registrazione salva il consenso dato nel modulo', /validMainConsent\(req\.body && req\.body\.consent, legalVersion\)/.test(API) && /recordMainConsent\(client, user\.id, legalVersion\)/.test(API));
  const aiGate = API.slice(API.indexOf('app.post(AI_ROUTES'), API.indexOf('createFixedWindowRateLimiter({', API.indexOf('app.post(AI_ROUTES')));
  ok('6m. rotte AI: rifiutate (403) dopo la revoca', /aiConsentWithdrawn\(row\)/.test(aiGate) && /AI_CONSENT_WITHDRAWN/.test(aiGate));
  ok('6n. rotte dei consensi montate', /mountConsentRoutes\(app, \{ pool, initDb, accountFromBearer, featuresPath: FEATURES_PATH \}\)/.test(API));
}

console.log('');
console.log('--- 7. consensi nella pagina ---');
{
  const block = SRC.slice(SRC.indexOf('// ---- Privacy: the notice and terms in force'), SRC.indexOf('// Deleting the account: on the server first'));
  const BASE = 'https://api.example.test';
  const shown = [];
  const posts = [];
  let serverState = null;
  let offline = false;
  const ctx = {
    self: { NURVAN_FEATURES: FEATURES },
    store: {},
    currentView: 'home',
    esc: (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    coachEndpoint: (p) => BASE + p,
    $: () => null,
    document: { getElementById: () => null, querySelectorAll: () => [], createElement: () => ({ style: {}, setAttribute() {} }), body: { appendChild() {} } },
    persist() {},
    render() {},
    confirm: () => true,
    showToast() {},
    logoutAccount() {},
    coachHoldsClientData: () => false,
    isAthleteRole: () => false,
    async accountRequest(p, opts) {
      if (offline) throw new Error('offline');
      if (opts && opts.method === 'POST') { posts.push(JSON.parse(opts.body)); return { body: { ok: true } }; }
      return { body: { ok: true, consent: serverState } };
    },
    async readApiJson(res) { return res.body; },
    console
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(block, ctx);
  ctx.showPrivacyConsentSheet = () => shown.push('privacy');

  const version = FEATURES.legal.version;
  ok('7a. riconosce le richieste AI (POST, percorsi esatti)',
    ctx.isAiRequest(BASE + '/api/chat', { method: 'POST' })
    && ctx.isAiRequest(BASE + '/api/food/barcode/800123/ai-lookup', { method: 'POST' })
    && !ctx.isAiRequest(BASE + '/api/chat', { method: 'GET' })
    && !ctx.isAiRequest(BASE + '/api/coach/clients', { method: 'POST' })
    && !ctx.isAiRequest('https://altro.example/api/chat', { method: 'POST' }));

  ctx.store = { accountToken: 't', accountUser: { id: 1 } };
  serverState = { version, accepted: null, ok: false, ai: { granted: false } };
  await ctx.ensurePrivacyConsent();
  ok('7b. account senza consenso: il foglio dei consensi si apre', shown.length === 1);

  shown.length = 0;
  ctx.store = { accountToken: 't', accountUser: { id: 1 } };
  serverState = { version, accepted: version, acceptedAt: '2026-09-25T10:00:00Z', ok: true, ai: { granted: true, at: '2026-09-25T10:00:00Z' } };
  await ctx.ensurePrivacyConsent();
  ok('7c. consenso gia\' dato sul server: niente foglio, copia locale aggiornata', shown.length === 0 && ctx.store.privacyConsent.version === version && ctx.store.aiConsent.granted === true);

  shown.length = 0;
  ctx.store = { accountToken: 't', accountUser: { id: 1 } };
  offline = true;
  await ctx.ensurePrivacyConsent();
  ok('7d. offline e mai accettato qui: il foglio si apre comunque', shown.length === 1);

  shown.length = 0;
  ctx.store = { accountToken: 't', accountUser: { id: 1 }, privacyConsent: { version, at: 'x', synced: false } };
  await ctx.ensurePrivacyConsent();
  ok('7e. offline ma accettato qui: si prosegue, si inviera\' dopo', shown.length === 0);
  offline = false;
  posts.length = 0;
  await ctx.sendPendingConsents();
  ok('7f. appena si puo\', il consenso dato qui arriva al server', posts.some((b) => b.version === version && b.health === true));

  shown.length = 0;
  ctx.coachHoldsClientData = () => true;
  ctx.store = { accountToken: 't', accountUser: { id: 1 } };
  await ctx.ensurePrivacyConsent();
  ok('7g. il coach che guarda un atleta non riceve il foglio al posto suo', shown.length === 0);
  ctx.coachHoldsClientData = () => false;

  ctx.store = { accountToken: 't', aiConsent: { granted: true } };
  ok('7h. AI gia\' consentita: nessuna domanda', (await ctx.ensureAiConsent()) === true);
  ctx.showAiConsentSheet = (done) => done(false);
  ctx.store = { accountToken: 't' };
  ok('7i. AI rifiutata: la richiesta non parte', (await ctx.ensureAiConsent()) === false && ctx.aiConsentDeclinedError().code === 'AI_CONSENT_DECLINED');

  posts.length = 0;
  ctx.store = { accountToken: 't', aiConsent: { granted: true, synced: true } };
  await ctx.setAiConsent(false);
  ok('7j. revoca da Impostazioni: arriva al server', ctx.store.aiConsent.granted === false && posts.some((b) => b.ai === false));

  ctx.store = { accountToken: 't', accountUser: { id: 1 }, privacyConsent: { version, at: '2026-09-25T10:00:00Z' }, aiConsent: { granted: true } };
  const card = ctx.renderPrivacySettingsCard();
  ok('7k. Privacy e dati: link alle pagine, AI revocabile, export, eliminazione, non-medico',
    /Informativa privacy/.test(card) && /\/privacy"/.test(card) && /\/termini"/.test(card) && /\/elimina-account"/.test(card)
    && /REVOCA/.test(card) && /ESPORTA I MIEI DATI/.test(card) && /openDeleteAccount\(\)/.test(card) && /dispositivo medico/.test(card));
  ctx.isAthleteRole = () => true;
  ok('7l. atleta: niente pulsante di eliminazione (lo gestisce il coach), ma spiegato', !/openDeleteAccount\(\)/.test(ctx.renderPrivacySettingsCard()) && /gestito dal coach/.test(ctx.renderPrivacySettingsCard()));

  ok('7m. apiFetch chiede il consenso AI prima della prima richiesta AI', /async function apiFetch\(url, options, timeoutMs=90000\) \{\n  if \(isAiRequest\(url, options\) && !\(await ensureAiConsent\(\)\)\) throw aiConsentDeclinedError\(\);/.test(SRC));
  ok('7n. registrazione: tre caselle obbligatorie, consenso inviato col modulo', /id="consent-age"/.test(SRC) && /id="consent-terms"/.test(SRC) && /id="consent-health"/.test(SRC) && /body\.consent = \{ version: legalConfig\(\)\.version, age: true, terms: true, health: true \}/.test(SRC));
  ok('7o. il controllo parte all\'avvio, dopo ogni accesso e per gli atleti', (SRC.match(/ensurePrivacyConsent\(\); \} catch \(_\) \{\}/g) || []).length >= 4 && /ensurePrivacyConsent/.test(read('web/coach-practice-ui.js')));
  ok('7p. link a informativa e termini nella schermata di accesso', /id="account-legal-links"/.test(SRC));
  ok('7q. Impostazioni mostra Privacy e dati', /\$\{renderPrivacySettingsCard\(\)\}/.test(SRC));
  const exp = SRC.slice(SRC.indexOf('function exportFullDatabaseBackup()'), SRC.indexOf('function triggerImportBackupFile()'));
  ok('7r. l\'export non contiene il token di sessione', /delete exported\.accountToken/.test(exp) && /store: exported/.test(exp));
  ok('7s. l\'import di un backup non cambia l\'account connesso', /const keep = \{ accountToken: store\.accountToken, accountUser: store\.accountUser \}/.test(SRC));
}

console.log('');
if (failed) {
  console.log(failed + ' controlli del livello 4 falliti.');
  process.exit(1);
}
console.log('Tutti i controlli del livello 4 passano.');
