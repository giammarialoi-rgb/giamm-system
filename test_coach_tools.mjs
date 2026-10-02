// The coach's tools: the invite text is the coach's own, sending it again
// asks about the password before touching it, the calendar is made of forms
// (no typed ISO dates), the menu is grouped and the logo goes home, and a
// plan read again from the server does not redraw the page.
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const ui = fs.readFileSync('web/coach-practice-ui.js', 'utf8').replace(/\r\n/g, '\n');
const idx = fs.readFileSync('web/index.base.html', 'utf8').replace(/\r\n/g, '\n');
const cal = fs.readFileSync('web/coach-os/calendar.js', 'utf8').replace(/\r\n/g, '\n');
const plans = fs.readFileSync('web/plans-ui.js', 'utf8').replace(/\r\n/g, '\n');
const cut = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('block not found: ' + a); return src.slice(i, j); };

// --- the invite text --------------------------------------------------------
{
  const c = { store: { prefs: {} }, String, inviteShortCode: (t) => String(t || '').slice(-6).toUpperCase() };
  vm.createContext(c);
  vm.runInContext(cut(ui, 'var DEFAULT_INVITE_TEMPLATE = ', 'function openInviteTemplateEditor() {') + '\nthis.fmt = formatInviteShareText; this.def = DEFAULT_INVITE_TEMPLATE;', c);
  const data = { name: 'Mario Rossi', inviteUrl: 'https://app.nurvan.app/c/abc123', inviteCode: 'ABC123', username: 'mario.rossi', password: 'forza1234' };
  const std = c.fmt(data);
  ok('1a. senza modifiche il testo è quello di sempre, con link, utente, password e codice', /^Ciao Mario Rossi,/.test(std) && /Link: https:\/\/app\.nurvan\.app\/c\/abc123/.test(std) && /Utente: mario\.rossi/.test(std) && /Password: forza1234/.test(std) && /Codice invito: ABC123/.test(std));
  c.store.prefs.inviteTemplate = 'Ehi {nome}, ecco il tuo accesso: {link} ({utente} / {password})';
  ok('1b. il coach scrive il suo testo e l’app ci mette i dati del cliente', c.fmt(data) === 'Ehi Mario Rossi, ecco il tuo accesso: https://app.nurvan.app/c/abc123 (mario.rossi / forza1234)');
  c.store.prefs.inviteTemplate = 'Benvenuto {nome}!';
  ok('1c. un testo senza il link lo riceve comunque in fondo', /Benvenuto Mario Rossi!\nLink: https:\/\/app\.nurvan\.app\/c\/abc123/.test(c.fmt(data)));
  c.store.prefs.inviteTemplate = '';
  ok('1d. senza una password appena impostata non ne viene scritta una', /Password: quella che hai già/.test(c.fmt(Object.assign({}, data, { password: '' }))));
  ok('1e. il testo si modifica dall’hub, con anteprima e ripristino', /onclick="openInviteTemplateEditor\(\)">TESTO DELL’INVITO/.test(ui) && /function previewInviteTemplate/.test(ui) && /function resetInviteTemplate/.test(ui) && /store\.prefs\.inviteTemplate = /.test(ui));
  ok('1f. il testo scritto dal server non viene più usato al posto di quello del coach', !/inviteText \|\| formatInviteShareText/.test(ui));
}
// --- sending the invite again ------------------------------------------------
{
  const resend = cut(ui, 'async function copyClientInvite(id, token) {', 'function suggestClientPassword() {');
  ok('2a. reinviare l’invito non cambia nulla da solo: apre la domanda', /openResendInviteDialog\(info\)/.test(resend) && !/reset-password|rotate-invite|showInviteSheet/.test(resend));
  const dialog = cut(ui, 'function openResendInviteDialog(info) {', 'async function confirmResendInvite(reset) {');
  ok('2b. la domanda mostra l’utente, spiega che la password non si può rileggere e offre le due strade', /Utente: <b>/.test(dialog) && /non si può rileggere/.test(dialog) && /confirmResendInvite\(true\)/.test(dialog) && /confirmResendInvite\(false\)/.test(dialog) && /ANNULLA/.test(dialog));
  const confirm = cut(ui, 'async function confirmResendInvite(reset) {', 'window.confirmResendInvite = confirmResendInvite;');
  ok('2c. la password viene reimpostata solo se il coach lo sceglie, ed è scritta nell’invito', /if \(!reset\) \{[\s\S]*?return;\s*\}/.test(confirm) && confirm.indexOf('reset-password') > confirm.indexOf('if (!reset)') && /password: password \}\)\)/.test(confirm));
  ok('2d. almeno 4 caratteri, come chiede il server', /password\.length < 4/.test(confirm));
  const c = { String, Math, Uint32Array, crypto: { getRandomValues: (a) => { a[0] = 123456; a[1] = 3; return a; } } };
  vm.createContext(c);
  vm.runInContext(cut(ui, 'function suggestClientPassword() {', 'function openResendInviteDialog(info) {') + '\nthis.p = suggestClientPassword();', c);
  ok('2e. viene proposta una password che si legge e si detta', /^[a-z]{5}\d{4}$/.test(c.p));
}
// --- the calendar --------------------------------------------------------------
{
  ok('3a. nessuna finestra di testo: giorno, ora, durata, cliente e tipo si scelgono', !/window\.prompt\(/.test(cal) && /id="cal-client"/.test(cal) && /id="cal-type"/.test(cal) && /type="date"/.test(cal) && /type="time"/.test(cal) && /id="cal-duration"/.test(cal) && /id="cal-repeat"/.test(cal));
  ok('3b. tolto ciò che non serviva: tipi in mostra, disponibilità a numeri, link al file senza accesso', !/setAvailabilityPrompt|coSessionTypes|href="\/api\/coach\/appointments\.ics"/.test(cal));
  ok('3c. il file per il calendario si scarica con l’accesso del coach', /CoachOS\.downloadCalendarFile = async function/.test(cal) && /headers: window\.practiceHeaders\(false\)/.test(cal));
  const win = { CoachOS: { views: {} }, tr: (s) => s };
  const c = { window: win, document: { documentElement: { lang: 'it' }, getElementById: () => null }, Intl, Date, String, Number, Math, Object, setTimeout, store: {}, console };
  vm.createContext(c);
  vm.runInContext(cal, c);
  const H = win.CoachOS.calendarTestHooks;
  const at = (h) => new Date(Date.now() + h * 3600000).toISOString();
  H.state.appointments = [
    { id: '1', startsAt: at(2), endsAt: at(3), status: 'scheduled' },
    { id: '2', startsAt: at(30), endsAt: at(31), status: 'cancelled' },
    { id: '3', startsAt: at(50), endsAt: at(51), status: 'completed' },
    { id: '4', startsAt: at(24 * 20), endsAt: at(24 * 20 + 1), status: 'scheduled' }
  ];
  H.state.range = 'week';
  ok('3d. 7 giorni: le sessioni della settimana, senza quelle annullate', H.visibleAppointments().map((a) => a.id).join() === '1,3' || H.visibleAppointments().map((a) => a.id).join() === '3' );
  H.state.range = 'month';
  ok('3e. 31 giorni: anche quelle più avanti', H.visibleAppointments().some((a) => a.id === '4') && !H.visibleAppointments().some((a) => a.id === '2'));
  ok('3f. gli errori del server sono detti in parole del coach', H.errorText(new Error('Appointment collides with an existing session.')) === 'A quell’ora hai già un’altra sessione.' && H.errorText(new Error('Invalid appointment time.')) === 'Data o ora non valide.');
  ok('3g. i tipi di sessione sono quelli che il server conosce', H.TYPES.map((t) => t[0]).sort().join() === ['Check-in', 'Coaching Call', 'Consultation', 'Custom Session', 'Review', 'Training Session'].join() && H.typeLabel('Coaching Call') === 'Chiamata di coaching');
  ok('3h. si può spostare, segnare come fatta, annullare', typeof win.CoachOS.openAppointmentForm === 'function' && typeof win.CoachOS.completeAppointment === 'function' && typeof win.CoachOS.cancelAppointment === 'function' && typeof win.CoachOS.saveAppointmentForm === 'function');
}
// --- menu, logo, names -----------------------------------------------------------
{
  const a = idx.indexOf('<div id="menu-hub-modal"');
  const menu = idx.slice(a, idx.indexOf('</div>\n  </div>\n</div>', a));
  const order = ["navigate('training')", "navigate('nutrition')", "navigate('supplements')", "navigate('therapy')", "navigate('exams')", "navigate('calendar')", "navigate('stats')", "navigate('programs')", "navigate('knowledge')", "navigate('ai')", "navigate('settings')", 'openTutorialIndex()'];
  const pos = order.map((k) => menu.indexOf(k));
  ok('4a. menu: allenamento, alimentazione, integrazione, terapia, esami uno dopo l’altro; tutorial in fondo', pos.every((p) => p > 0) && pos.every((p, i) => i === 0 || p > pos[i - 1]));
  ok('4b. niente tasto Home e niente tasto Import a parte: sta in «Libreria programmi e import»', !/closeMenuHub\(\);navigate\('home'\)/.test(menu) && !/closeMenuHub\(\);navigate\('import'\)/.test(menu) && /Libreria programmi e import/.test(menu));
  ok('4c. «Info training» è «Libreria esercizi», «Sblocca Coach» è «Modalità coach»', /Libreria esercizi/.test(menu) && !/Info training/.test(menu) && /Modalità coach/.test(menu) && !/Sblocca Coach/.test(menu) && /ATTIVA MODALITÀ COACH/.test(ui) && !/SBLOCCA MODALITÀ COACH|Diventa Coach/.test(ui));
  ok('4d. la N in alto a sinistra porta alla home', /class="logo-container"[^>]*onclick="goHomeFromLogo\(\)"/.test(idx) && /function goHomeFromLogo\(\)/.test(idx));
}
// --- no needless redraw ------------------------------------------------------------
{
  let renders = 0;
  const ls = {};
  const c = { window: {}, self: {}, JSON, Object, Date, localStorage: { getItem: (k) => ls[k] || null, setItem: (k, v) => { ls[k] = v; }, removeItem: (k) => { delete ls[k]; } }, isClientStorageContext: () => false, render: () => { renders++; } };
  vm.createContext(c);
  vm.runInContext(cut(plans, 'var PLAN_ENTITLEMENT_KEY', 'function clearAccountEntitlement()') + '\nthis.recv = onEntitlementReceived;', c);
  c.recv({ plan: 'coach', at: '2026-10-02T10:00:00.000Z' });
  const first = renders;
  c.recv({ plan: 'coach', at: '2026-10-02T10:00:08.000Z' });
  c.recv({ plan: 'coach', at: '2026-10-02T10:00:16.000Z' });
  ok('5a. il piano riletto dal server, uguale a prima, non ridisegna la pagina', first === 1 && renders === 1);
  c.recv({ plan: 'coach_pro', at: '2026-10-02T10:00:24.000Z' });
  ok('5b. un piano davvero cambiato sì', renders === 2);
  ok('5c. una schermata del coach già aperta non viene ricaricata da un ridisegno che non ha chiesto', /window\.__cpNavRender = true;/.test(ui) && /if \(osView && !window\.__cpNavRender && window\.__cpDrawnOsView === currentView/.test(ui));
}

console.log('');
if (failed) { console.log(failed + ' controlli degli strumenti del coach falliti.'); process.exit(1); }
console.log('Tutti i controlli degli strumenti del coach passano.');
