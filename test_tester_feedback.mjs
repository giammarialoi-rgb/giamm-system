// What the Google Play testers (Testers Community report, October 2026) found, and how it is fixed:
// the password eye that read the wrong way round, sharing the app, rating it, writing to us from the
// app, a light mode, and the details that made the Android app feel like a web page (the "save before
// leaving?" dialog, sheets that did not close with back, the page reloading when the phone switched
// to dark mode).
import fs from 'node:fs';
import vm from 'node:vm';
import { validateAppFeedback, feedbackNotifyEmail, mountAppFeedback, listAppFeedback, closeAppFeedback, APP_FEEDBACK_KINDS } from './server/admin/app-feedback.mjs';
import { downloadTarget, APP_STORE_URL, PLAY_STORE_URL } from './server/site/download-link.mjs';

let failed = 0;
function ok(message, value) {
  if (value) console.log('OK  ', message);
  else { failed += 1; console.log('FAIL', message); }
}
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const base = read('web/index.base.html');
const fnBody = (src, name) => {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) return '';
  const end = src.indexOf('\n}\n', start);
  return src.slice(start, end + 2);
};

/* ---------------- 1. the password eye ---------------- */

const EYE_OFF = 'M11.83,9L15,12.16';
const EYE_OPEN = 'M12,9A3,3 0 0,0 9,12';
const staticToggles = base.slice(0, base.indexOf('<script>', base.indexOf("var DATA=null, currentView='home'") - 2000)).match(/<button type="button" class="pw-toggle"[^>]*>\s*<svg[^>]*><path d="[^"]{20}/g) || [];
ok('the login and reset fields start with the crossed eye: the password is hidden',
  staticToggles.length === 2 && staticToggles.every((b) => b.includes(EYE_OFF) && b.includes('aria-pressed="false"')));

const pwCode = ['PW_EYE_OFF_SVG', 'PW_EYE_OPEN_SVG'].map((n) => (base.match(new RegExp('const ' + n + ' = [^\\n]*')) || [''])[0]).join('\n') + '\n' +
  ['syncPasswordToggle', 'togglePasswordVisibility', 'hidePasswordFields', 'pwToggleHtml'].map((n) => fnBody(base, n)).join('\n');
function fakeButton() { const attrs = {}; return { innerHTML: '', setAttribute(k, v) { attrs[k] = String(v); }, getAttribute(k) { return attrs[k]; } }; }
const input = { type: 'password' };
const button = fakeButton();
const pwCtx = { $: (id) => (id === 'pw' ? input : null) };
vm.createContext(pwCtx);
vm.runInContext(pwCode, pwCtx);
pwCtx.togglePasswordVisibility('pw', button);
ok('tapped once, the password can be read and the eye is open', input.type === 'text' && button.innerHTML.includes(EYE_OPEN) && button.getAttribute('aria-pressed') === 'true' && button.getAttribute('aria-label') === 'Nascondi password');
pwCtx.togglePasswordVisibility('pw', button);
ok('tapped again, hidden and crossed out', input.type === 'password' && button.innerHTML.includes(EYE_OFF) && button.getAttribute('aria-pressed') === 'false' && button.getAttribute('aria-label') === 'Mostra password');
input.type = 'text';
const field = { querySelector: (sel) => (sel === 'input' ? input : button) };
pwCtx.hidePasswordFields({ querySelectorAll: () => [field] });
ok('a form opened again starts with the password hidden', input.type === 'password' && button.innerHTML.includes(EYE_OFF));
ok('the login panel hides the passwords when it opens and when it closes',
  /hidePasswordFields\(modal\);\s*modal\.style\.display = 'flex'/.test(fnBody(base, 'openAccount')) && /hidePasswordFields\(modal\)/.test(fnBody(base, 'closeAccount')));
ok('change password has the eye on its three fields', /pwToggleHtml\(id\)/.test(fnBody(base, 'openChangePassword')));
const cpUi = read('web/coach-practice-ui.js');
ok('the client login of a coach link has the same eye (the old button said MOSTRA in both states)',
  /window\.pwToggleHtml\('cp-login-pass'\)/.test(cpUi) && !/toggleClientLoginPassword/.test(cpUi) && /window\.pwToggleHtml = pwToggleHtml;/.test(base));
const acct = read('web/account-pages.js');
ok('the reset page by email has a "Mostra password" box for both fields', /id="reset-show"/.test(acct) && /\$\('reset-pw'\)\.type = type/.test(acct) && /\$\('reset-pw2'\)\.type = type/.test(acct));

/* ---------------- 2. share, rate (web/app-community.js) ---------------- */

const communitySrc = read('web/app-community.js');
function community(win) {
  const ctx = Object.assign({ console, Promise, JSON, Date, Number, String, Math, setTimeout }, win);
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(communitySrc.replace(/typeof window !== 'undefined' \? window : globalThis/, 'window'), ctx);
  return ctx.NurvanCommunity;
}
function storage() { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m }; }
const DAY = 86400000;

const C0 = community({ localStorage: storage(), navigator: {} });
const now = Date.parse('2026-10-25T10:00:00Z');
ok('no rating card before the third workout', !C0.reviewDue({ first: now - 10 * DAY }, 2, now));
ok('nor in the first three days of use', !C0.reviewDue({ first: now - 2 * DAY }, 5, now));
ok('after three workouts and three days it may be asked', C0.reviewDue({ first: now - 4 * DAY }, 3, now));
ok('never more than three times', !C0.reviewDue({ first: now - 400 * DAY, count: 3, last: now - 200 * DAY }, 30, now));
ok('and 120 days apart', !C0.reviewDue({ first: now - 400 * DAY, count: 1, last: now - 100 * DAY }, 30, now) && C0.reviewDue({ first: now - 400 * DAY, count: 1, last: now - 121 * DAY }, 30, now));
ok('in a browser there is no store to rate in', C0.platform() === 'web' && !C0.canRate() && C0.afterWorkout(10) === false);

const calls = [];
const androidStore = storage();
androidStore.setItem('nurvan.review.v1', JSON.stringify({ first: Date.now() - 10 * DAY }));
const CA = community({
  localStorage: androidStore, navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A; wv) AppleWebKit/537.36' },
  NURVAN_RELEASE: { versionName: '1.5.36', webBuild: 'X' }, screen: { width: 412, height: 915 },
  Android: {
    getCoachApiUrl: () => 'https://api.example',
    shareText: (text, title) => calls.push(['share', text, title]),
    openStorePage: () => calls.push(['store']),
    requestInAppReview: () => calls.push(['review'])
  }
});
ok('the Android app is recognised', CA.platform() === 'android' && CA.canRate());
const shared = await CA.share();
ok('Condividi Nurvan opens the Android share sheet with the message and the link', shared === 'native' && calls[0][0] === 'share' && calls[0][1].includes('https://nurvan.app/scarica') && /Nurvan/.test(calls[0][1]));
ok('after the third workout Google Play\'s rating card is asked for, once', CA.afterWorkout(3) === true && calls.some((c) => c[0] === 'review') && CA.afterWorkout(4) === false);
CA.rate();
ok('the button opens the Play Store page where the review is written', calls[calls.length - 1][0] === 'store');

const iosCalls = [];
const iosLocation = { href: '' };
const CI = community({
  localStorage: storage(), navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)' }, location: iosLocation,
  Capacitor: { getPlatform: () => 'ios', Plugins: { Share: { share: async (o) => { iosCalls.push(['share', o]); } }, InAppReview: { requestReview: async () => { iosCalls.push(['review']); } } } }
});
await CI.share();
ok('on iPhone the share sheet is the native one (Capacitor Share)', iosCalls[0] && iosCalls[0][0] === 'share' && iosCalls[0][1].text.includes('nurvan.app/scarica'));
CI.rate();
ok('on iPhone the button opens the App Store on "write a review"', CI.canRate() && iosLocation.href === 'itms-apps://apps.apple.com/app/id6817405788?action=write-review');
ok('and after the third workout the system rating card is asked for', (() => { const s = storage(); s.setItem('nurvan.review.v1', JSON.stringify({ first: Date.now() - 10 * DAY })); const c = community({ localStorage: s, navigator: {}, Capacitor: { getPlatform: () => 'ios', Plugins: { InAppReview: { requestReview: async () => { iosCalls.push(['review']); } } } } }); return c.afterWorkout(5) === true && iosCalls.some((x) => x[0] === 'review'); })());

ok('system, model and screen are read from the phone, nothing that identifies it',
  CA.osOf('Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A; wv)') === 'Android 14' && CA.modelOf('Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A; wv)') === 'Pixel 7' &&
  CA.osOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)') === 'iOS 18.1' && CA.modelOf('Mozilla/5.0 (Linux; Android 14; K) Chrome') === '');
const withDevice = CA.feedbackBody('bug', '  Il timer non suona  ', 'a@b.it', true, 'training');
const withoutDevice = CA.feedbackBody('idea', 'Vorrei il tema chiaro', '', false, 'home');
ok('the technical data go only with the box ticked', withDevice.device && withDevice.device.app === '1.5.36' && withDevice.device.platform === 'android' && withDevice.device.view === 'training' && withDevice.message === 'Il timer non suona' && !('device' in withoutDevice));

/* ---------------- 3. the link that is shared ---------------- */

ok('nurvan.app/scarica: an iPhone goes to the App Store', downloadTarget('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)') === APP_STORE_URL);
ok('an iPad that asks for the desktop site too', downloadTarget('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1') === APP_STORE_URL);
ok('an Android phone to Google Play once the app is public there, to the web app until then',
  downloadTarget('Mozilla/5.0 (Linux; Android 14)', { ANDROID_STORE_LIVE: '1' }) === PLAY_STORE_URL && downloadTarget('Mozilla/5.0 (Linux; Android 14)', {}) === 'https://app.nurvan.app/');
ok('a computer to the site', downloadTarget('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', {}) === 'https://nurvan.app/');
const api = read('coach-api.mjs');
ok('the server answers /scarica', /mountDownloadLink\(app\);/.test(api));

/* ---------------- 4. writing to us from the app ---------------- */

const codeOf = (body) => { try { validateAppFeedback(body); return ''; } catch (e) { return e.code; } };
ok('a message needs a kind and a few words', codeOf({ kind: 'bug', message: 'Il timer non suona' }) === '' && codeOf({ kind: 'x', message: 'abcdef' }) === 'KIND' && codeOf({ kind: 'bug', message: 'no' }) === 'MESSAGE' && Object.keys(APP_FEEDBACK_KINDS).length === 3);
ok('the email is optional, but a wrong one is said', codeOf({ kind: 'idea', message: 'Vorrei il tema chiaro', email: '' }) === '' && codeOf({ kind: 'idea', message: 'Vorrei il tema chiaro', email: 'nope' }) === 'EMAIL');
const cleanFb = validateAppFeedback({ kind: 'bug', message: 'x'.repeat(5000), device: { app: '1.5.36', model: 'Pixel 7', evil: '<script>', view: 'v'.repeat(100) } });
ok('long texts are cut and only the expected technical fields are kept', cleanFb.message.length === 4000 && cleanFb.device.app === '1.5.36' && !('evil' in cleanFb.device) && cleanFb.device.view.length === 40);
const mail = feedbackNotifyEmail('5', validateAppFeedback({ kind: 'bug', message: 'Il timer non suona', email: 'a@b.it', device: { app: '1.5.36' } }), 'acc@b.it');
ok('Nurvan gets an email with the message, where to answer and the technical data', /Problema/.test(mail.subject) && /Il timer non suona/.test(mail.text) && /a@b\.it/.test(mail.text) && /acc@b\.it/.test(mail.text) && /app: 1\.5\.36/.test(mail.text));

const rows = [];
const pool = { async query(sql, params) {
  if (/SELECT COUNT\(\*\)::int AS n FROM app_feedback WHERE ip_hash/.test(sql)) return { rows: [{ n: rows.filter((x) => x.ip === params[0]).length }] };
  if (/INSERT INTO app_feedback/.test(sql)) { rows.push({ id: rows.length + 1, kind: params[0], message: params[1], email: params[2], device: params[3], account: params[4], ip: params[5], status: 'open' }); return { rows: [{ id: rows.length }] }; }
  if (/UPDATE app_feedback SET status = 'done'/.test(sql)) { const r = rows.find((x) => String(x.id) === String(params[0]) && x.status === 'open'); if (!r) return { rows: [] }; r.status = 'done'; return { rows: [r] }; }
  if (/DELETE FROM app_feedback/.test(sql)) return { rowCount: 0 };
  if (/FROM app_feedback f LEFT JOIN app_users/.test(sql)) return { rows: rows.map((x) => ({ id: x.id, kind: x.kind, message: x.message, email: x.email, device: x.device ? JSON.parse(x.device) : null, status: x.status, created_at: new Date() })) };
  return { rows: [] };
} };
const routes = {};
const app = { post: (p, h) => { routes['POST ' + p] = h; }, get: (p, h) => { routes['GET ' + p] = h; } };
const mails = [];
const accountFromBearer = async (h) => (h === 'Bearer user' ? { id: '42', email: 'acc@b.it', role: 'user' } : h === 'Bearer athlete' ? { id: 'c_9', role: 'athlete' } : null);
mountAppFeedback(app, { pool, initDb: async () => {}, accountFromBearer, sendEmail: async (to, subject) => { mails.push({ to, subject }); return { sent: true }; }, secret: 's', notifyTo: 'info@nurvan.app' });
const call = async (body, auth, ip = '1.2.3.4') => {
  let status = 200, json = null;
  const res = { status(c) { status = c; return this; }, json(j) { json = j; return this; } };
  await routes['POST /api/feedback']({ body, ip, headers: { authorization: auth } }, res);
  return { status, json };
};
let res = await call({ kind: 'bug', message: 'Il timer non suona', device: { app: '1.5.36' } }, 'Bearer user');
await new Promise((r) => setTimeout(r, 0));
ok('a message is saved and Nurvan is told by email', res.status === 200 && res.json.ok && rows.length === 1 && mails.some((m) => m.to === 'info@nurvan.app' && /n\. 1/.test(m.subject)));
ok('signed in, it is tied to the account; the address is kept only as a one-way trace', rows[0].account === '42' && rows[0].ip !== '1.2.3.4' && rows[0].ip.length === 32 && JSON.parse(rows[0].device).app === '1.5.36');
res = await call({ kind: 'idea', message: 'Vorrei il tema chiaro' }, 'Bearer athlete');
ok('without an account of its own (a coach\'s client) it is sent all the same, not tied', res.status === 200 && rows[1].account === null);
res = await call({ kind: 'idea', message: 'x' });
ok('an empty message is refused with the reason', res.status === 400 && res.json.code === 'MESSAGE');
for (let i = 0; i < 10; i++) await call({ kind: 'other', message: 'messaggio numero ' + i }, null, '9.9.9.9');
res = await call({ kind: 'other', message: 'uno di troppo' }, null, '9.9.9.9');
ok('at most 10 messages a day from the same address', res.status === 429 && res.json.code === 'RATE');
const listed = await listAppFeedback(pool);
ok('the dashboard lists them, open first', listed.length === rows.length && listed[0].kindLabel === 'Problema');
ok('and closes them', (await closeAppFeedback(pool, '1', 'Risolto in 1.5.36')) === true && (await closeAppFeedback(pool, '1', 'x')) === false);
ok('the dashboard has its tab and its alert', /\['feedback', 'Suggerimenti app'\]/.test(read('admin/page-ops.js')) && /openAppFeedbackCount/.test(read('server/admin/overview.mjs')) && /\/api\/admin\/feedback\/:id/.test(read('server/admin/index.mjs')));
ok('the server mounts the route', /mountAppFeedback\(app, \{ pool, initDb, accountFromBearer, sendEmail/.test(api));
const mig = read('server/db/migrations/0037_app_feedback.sql');
ok('migration 0037 creates the table', /CREATE TABLE IF NOT EXISTS app_feedback/.test(mig) && /device JSONB/.test(mig) && /ip_hash/.test(mig));
for (const lang of ['it', 'en', 'es', 'fr', 'de', 'pt', 'ru', 'zh', 'ar', 'hi']) {
  const p = read(lang === 'it' ? 'web/privacy.html' : 'web/legal/' + lang + '/privacy.html');
  const s7 = p.slice(p.search(/<h2>7[.\s]/));
  ok('privacy (' + lang + '): what a message carries, why, for how long', (p.match(/<h3>/g) || []).length === 10 && /6[.(]1[.)]?\s?\(?f|6\.º, n\.º 1, alínea f|Abs\. 1 lit\. f/.test(p) && (s7.match(/<li/g) || []).length >= 9);
}

/* ---------------- 5. settings ---------------- */

const settings = fnBody(base, 'renderSettings');
ok('Impostazioni has the Aspetto card and the "Nurvan ti piace?" card', /\$\{renderAppearanceCard\(\)\}/.test(settings) && /\$\{renderCommunityCard\(\)\}/.test(settings));
const card = fnBody(base, 'renderCommunityCard');
ok('the card shares, rates (only where there is a store), writes to us and opens the page guides',
  /shareNurvanApp\(\)/.test(card) && /C\.canRate\(\) \? btn\('rateNurvanApp\(\)'/.test(card) && /openAppFeedback\(\)/.test(card) && /openTutorialIndex\(\)/.test(card));
ok('the buttons work from the page (on window)', ['setAppTheme', 'shareNurvanApp', 'rateNurvanApp', 'openAppFeedback', 'setAppFeedbackKind', 'sendAppFeedback', 'closeAppFeedback'].every((n) => base.includes('window.' + n + ' = ' + n + ';')));
const sheet = fnBody(base, 'openAppFeedback');
ok('the message sheet: kind, text, optional email, technical data ticked by default, the privacy link', /chip\('bug', 'Problema'\)/.test(sheet) && /app-feedback-email/.test(sheet) && /id="app-feedback-device" checked/.test(sheet) && /legalLinkHtml\('privacy'/.test(sheet));
ok('it goes to /api/feedback, with the account when signed in', /coachEndpoint\('\/api\/feedback'\)/.test(fnBody(base, 'sendAppFeedback')) && /Authorization = 'Bearer '/.test(fnBody(base, 'sendAppFeedback')));
const closeOverlay = fnBody(base, 'closeWorkoutCompleteOverlay');
ok('the rating card is asked when a workout is closed, not over another question', /NurvanCommunity\.afterWorkout\(\(store\.logs \|\| \[\]\)\.length\)/.test(closeOverlay) && /if \(coachQuestion\) return;/.test(closeOverlay));
ok('the first day of use is noted at start', /NurvanCommunity\.noteFirstUse\(\)/.test(base));

/* ---------------- 6. light mode (web/theme.js) ---------------- */

const themeSrc = read('web/theme.js');
const tctx = { console };
tctx.window = tctx;
vm.createContext(tctx);
vm.runInContext(themeSrc.replace(/typeof window !== 'undefined' \? window : globalThis/, 'window'), tctx);
const T = tctx.NurvanTheme;
ok('the page becomes light: black and dark cards turn white', T.mapValue('#000', 'bg') === '#f4f4f4' && T.mapValue('#0d0d0d', 'bg') === '#fcfcfc');
ok('white text becomes near black, grey text a grey that still reads (≥4.5:1 on white)', T.mapValue('#fff', 'text') === '#141414' && T.mapValue('#888', 'text') === '#6f6f6f');
ok('gold text gets darker to read on white; gold buttons stay gold', T.mapValue('#d4af37', 'text') === '#886f1d' && T.mapValue('#d4af37', 'bg') === '#d4af37' && T.mapValue('var(--gold)', 'text') === 'var(--gold-ink)' && T.mapValue('1px solid var(--gold)', 'border') === '1px solid var(--gold)');
ok('dark lines become light lines, a dark red box a light red one', T.mapValue('#333', 'border') === '#dedede' && T.mapValue('#442222', 'bg') === '#e9d3d3');
ok('gradients change every colour, pictures in url() are left alone',
  T.mapValue('linear-gradient(135deg, #18150c 0%, #0d0d0d 100%)', 'bg') === 'linear-gradient(135deg, #f0ece0 0%, #fcfcfc 100%)' &&
  T.mapValue('url("data:image/svg+xml;utf8,<svg fill=%23fff>") #111', 'bg') === 'url("data:image/svg+xml;utf8,<svg fill=%23fff>") #fbfbfb');
ok('a colour already made light is never changed twice', ['#fff|text', '#0d0d0d|bg', '#d4af37|text', '#442222|bg', '#333|border'].every((x) => { const [v, r] = x.split('|'); const a = T.mapValue(v, r); return T.mapValue(a, r) === a || r === 'border'; }));
ok('the top bar and the bottom navigation stay dark, with the logo and the system clock on them', /header, \.bottom-nav, #splash/.test(themeSrc) && /html\[data-theme="light"\] header\{background:#000 !important/.test(themeSrc));
ok('a picture made to be shared keeps its dark design: only canvases in the page change', /this\.canvas\.isConnected/.test(themeSrc));
ok('no lookbehind in the regular expressions (older iPhones would not run the file)', !/\(\?<[=!]/.test(themeSrc) && !/\(\?<[=!]/.test(communitySrc));
ok('theme.js runs before the page is drawn', base.indexOf('<script src="theme.js"></script>') > 0 && base.indexOf('<script src="theme.js"></script>') < base.indexOf('<style>'));
ok('Automatico on Android asks the phone through the bridge (the web view always says light)', /root\.Android\.isSystemDark/.test(themeSrc) && /root\.nurvanSystemTheme = function/.test(themeSrc));
ok('new files reach the APK and the offline cache', ['app-community.js', 'theme.js'].every((f) => read('sync_web_assets.mjs').includes("'" + f + "'") && read('web/sw.js').includes("'./" + f + "'")));

/* ---------------- 7. native details ---------------- */

const main = read('app/src/main/java/com/giammaria/system/MainActivity.java');
ok('Android: share sheet, Play Store page, Play in-app review and dark-mode question on the bridge',
  /public void shareText\(String text, String title\)/.test(main) && /public void openStorePage\(\)/.test(main) && /ReviewManagerFactory\.create\(MainActivity\.this\)/.test(main) && /public boolean isSystemDark\(\)/.test(main));
ok('Android: back on the first screen leaves like other apps, no "save before leaving?" dialog', /moveTaskToBack\(true\)/.test(main) && !/showExitDialog/.test(main) && !/SALVA ED ESCI/.test(main));
ok('Android: switching the phone to dark mode no longer reloads the app', /configChanges="[^"]*uiMode/.test(read('app/src/main/AndroidManifest.xml')) && /nurvanSystemTheme/.test(main));
ok('Android: the Play review library is in the build', /com\.google\.android\.play:review:/.test(read('app/build.gradle')));
ok('back closes an optional sheet instead of moving the page behind it', /\[data-back-close\]/.test(fnBody(base, 'handleNativeBack')) && /data-back-close/.test(fnBody(base, 'openChangePassword')));
const plist = read('ios/App/App/Info.plist');
ok('iPhone: the clock stays light over the dark bar even with the phone in light mode', /<key>UIStatusBarStyle<\/key>\s*<string>UIStatusBarStyleLightContent<\/string>/.test(plist));
const pkg = JSON.parse(read('package.json'));
const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
ok('iPhone: Share and InAppReview plugins (Capacitor 7)', /^\^?7\./.test(deps['@capacitor/share'] || '') && /^\^?7\./.test(deps['@capacitor-community/in-app-review'] || ''));

if (failed) { console.log('\n' + failed + ' failed'); process.exit(1); }
console.log('\nAll tester-feedback checks pass.');
