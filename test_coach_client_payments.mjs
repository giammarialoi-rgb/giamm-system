// The coach's client list (order and filters), the payment reminder (a date, a cycle and a flag the coach sets by hand;
// the money never passes through the app), what the client sees of it, and the request of a new program (the coach only
// marks that it is settled outside the app: nothing is locked, no price, no payment link).
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const srv = read('coach-practice.mjs');
const ui = read('web/coach-practice-ui.js');
const idx = read('web/index.base.html');
const ledgerUi = read('web/coach-os/business.js');
const biz = read('server/coach-os/business.mjs');
const cut = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('block not found: ' + a); return src.slice(i, j); };

// --- the due date repeats with the cycle ------------------------------------------------
{
  const c = {};
  vm.createContext(c);
  vm.runInContext(cut(srv, 'const BILLING_CYCLES = ', 'function clientRow(') + '\nthis.add = addBillingCycle; this.next = nextBillingDue; this.parse = parseDueDate; this.cycles = BILLING_CYCLES;', c);
  const iso = (d) => new Date(d).toISOString().slice(0, 10);
  ok('1a. i cicli sono settimanale, 2 settimane, mensile, trimestrale, annuale', JSON.stringify(c.cycles) === JSON.stringify(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']));
  ok('1b. la scadenza si sposta di un ciclo', iso(c.add('2026-10-10T12:00:00Z', 'weekly')) === '2026-10-17' && iso(c.add('2026-10-10T12:00:00Z', 'biweekly')) === '2026-10-24' && iso(c.add('2026-10-10T12:00:00Z', 'monthly')) === '2026-11-10' && iso(c.add('2026-10-10T12:00:00Z', 'quarterly')) === '2027-01-10' && iso(c.add('2026-10-10T12:00:00Z', 'yearly')) === '2027-10-10');
  const now = new Date('2026-10-20T08:00:00Z');
  ok('1c. segnato pagato, la prossima scadenza è nel futuro e tiene il giorno del mese', iso(c.next('2026-10-05T12:00:00Z', 'monthly', now)) === '2026-11-05');
  ok('1d. se la scadenza è molto indietro si recupera ciclo dopo ciclo, senza fermarsi nel passato', c.next('2026-01-05T12:00:00Z', 'monthly', now).getTime() > now.getTime() && iso(c.next('2026-01-05T12:00:00Z', 'monthly', now)) === '2026-11-05');
  ok('1e. senza una scadenza si parte da oggi', c.next(null, 'weekly', now).getTime() > now.getTime());
  ok('1f. una data scritta male non passa', c.parse('boh') === null && c.parse('') === null && typeof c.parse('2026-10-31').getTime === 'function');
}

// --- the state of a payment, as the coach and the client read it -------------------------
{
  const c = { fmtDay: (v) => String(v).slice(0, 10) };
  vm.createContext(c);
  vm.runInContext(cut(ui, 'function paymentStatusFor(row, now) {', 'var __cpListTimer = 0;') + '\nthis.st = paymentStatusFor;', c);
  const now = new Date('2026-10-20T08:00:00Z');
  const day = 86400000;
  const row = (over) => Object.assign({ payTracking: true, paid: true, nextDueAt: new Date(now.getTime() + 20 * day).toISOString() }, over);
  ok('2a. senza promemoria non si dice nulla (né al coach né al cliente)', c.st({ payTracking: false, paid: true }, now).state === 'none' && c.st(null, now).text === '');
  ok('2b. pagato con scadenza lontana', c.st(row(), now).state === 'ok' && /^Pagato · scade il /.test(c.st(row(), now).text));
  ok('2c. entro 7 giorni è in scadenza', c.st(row({ nextDueAt: new Date(now.getTime() + 3 * day).toISOString() }), now).state === 'soon' && /Scade tra 3 gg/.test(c.st(row({ nextDueAt: new Date(now.getTime() + 3 * day).toISOString() }), now).text));
  ok('2d. scaduta da qualche giorno', c.st(row({ nextDueAt: new Date(now.getTime() - 4 * day).toISOString() }), now).state === 'overdue' && /Scaduto da 4 gg/.test(c.st(row({ nextDueAt: new Date(now.getTime() - 4 * day).toISOString() }), now).text));
  ok('2e. segnato non pagato è da regolare', c.st(row({ paid: false }), now).state === 'overdue');
}

// --- the list: order and filters ---------------------------------------------------------
{
  ok('3a. il server accetta solo valori fissi per ordine e filtri (nessun testo dell’utente nella query)', /const payFilter = String\(req\.query\.pay/.test(srv) && /payFilter === "unpaid"/.test(srv) && /assignFilter === "assigned"/.test(srv) && /COACHING_MODES\.includes\(modeFilter\)/.test(srv) && /c\.coaching_mode = \$\{addParam\(modeFilter\)\}/.test(srv));
  ok('3b. ordina per nome, scadenza scheda e scadenza check', /program: "c\.program_expires_at ASC NULLS LAST/.test(srv) && /check: "c\.next_check_at ASC NULLS LAST/.test(srv) && /name: "LOWER\(c\.display_name\) ASC/.test(srv));
  ok('3c. la lista legge la modalità (live/distanza) e se c’è un allenamento assegnato', /c\.checkin_template, c\.coaching_mode, c\.pay_tracking,/.test(srv) && /AS has_program,/.test(srv) && /row\.hasProgram = !!r\.has_program/.test(srv));
  ok('3d. pagato e non pagato contano solo i clienti con il promemoria acceso', /trackedSql \+ " AND " \+ unpaidSql/.test(srv) && /trackedSql \+ " AND NOT " \+ unpaidSql/.test(srv) && /payFilter === "none"/.test(srv));
  ok('3e. la lista si legge a pagine, con CARICA ALTRI, e dice quanti sono (regge migliaia di clienti)', /CP_CLIENT_PAGE = 50/.test(ui) && /'&offset=' \+ offset/.test(ui) && /store\.__cpClientNext/.test(ui) && /onclick="loadMoreCoachClients\(\)">CARICA ALTRI/.test(ui) && /Mostrati ' \+ rows\.length \+ ' di '/.test(ui) && !/limit=100&offset=0/.test(ui));
  ok('3e2. "allenamento assegnato" si legge da una colonna tenuta dal database, non dal JSON degli atleti', /ADD COLUMN IF NOT EXISTS has_program BOOLEAN/.test(srv) && /CREATE TRIGGER trg_coach_has_program/.test(srv) && /COALESCE\(c\.has_program, jsonb_array_length/.test(srv) && /idx_coach_clients_athlete/.test(srv));
  ok('3e3. i selettori di cliente (incassi, calendario) cercano per nome a 50 alla volta, senza tetto di 200', /payClientSearch/.test(ledgerUi) && /calClientSearch/.test(read('web/coach-os/calendar.js')) && !/limit=200/.test(ledgerUi) && !/limit=200/.test(read('web/coach-os/calendar.js')));
  const c = { store: { prefs: {} }, esc: (s) => String(s) };
  vm.createContext(c);
  vm.runInContext(cut(ui, 'var CP_CLIENT_SORTS = ', 'function setCoachClientView(') + '\nthis.view = coachClientView; this.html = coachClientControlsHtml;', c);
  ok('3f. di base: per nome, tutti i clienti', JSON.stringify(c.view()) === JSON.stringify({ sort: 'name', pay: '', assign: '', mode: '' }));
  c.store.prefs.coachClientView = { sort: 'check', pay: 'unpaid', assign: 'unassigned', mode: 'presence' };
  ok('3g. la scelta del coach resta salvata nelle preferenze', c.view().sort === 'check' && c.view().pay === 'unpaid' && c.view().assign === 'unassigned' && c.view().mode === 'presence');
  c.store.prefs.coachClientView = { sort: 'DROP TABLE', pay: 'x', assign: '1', mode: '<b>' };
  ok('3h. un valore sconosciuto torna al valore di base', JSON.stringify(c.view()) === JSON.stringify({ sort: 'name', pay: '', assign: '', mode: '' }));
  const html = c.html();
  ok('3i. i controlli offrono ordine, pagato, allenamento, live/distanza e “tutti i clienti”', /Scadenza scheda/.test(html) && /Scadenza check/.test(html) && /Pagato/.test(html) && /Non pagato/.test(html) && /Allenamento assegnato/.test(html) && /Allenamento non assegnato/.test(html) && /Live \(in presenza\)/.test(html) && /A distanza/.test(html) && /TUTTI I CLIENTI/.test(html));
}

// --- the payment reminder: set by hand, outside the app ---------------------------------
{
  ok('4a. il promemoria si imposta alla creazione del cliente e nella scheda (ciclo e data)', /billingFieldsHtml\('cp-add', null\)/.test(ui) && /payment: readBillingFields\('cp-add'\)/.test(ui) && /openClientBilling/.test(ui) && /\/billing'/.test(ui));
  ok('4b. il server crea il cliente senza scadenza inventata se il coach non vuole il promemoria', /const dueDate = payTrack \? \(parseDueDate\(payReq\.nextDueAt\)/.test(srv) && !/new Date\(Date\.now\(\) \+ 30 \* 86400000\)/.test(srv));
  ok('4c. segnare pagato sposta la scadenza di un ciclo', /nextBillingDue\(row\.next_due_at, cycle\)/.test(srv));
  ok('4d. l’incasso nel registro può indicare la prossima scadenza e la propone in base al ciclo', /Prossima scadenza \(facoltativa\)/.test(ledgerUi) && /payClientChanged/.test(ledgerUi) && /nextDueAt: val\('pay-next-due'\)/.test(ledgerUi) && /pay_tracking = \(pay_tracking OR \$2::timestamptz IS NOT NULL\)/.test(biz));
  ok('4e. il testo dice sempre che il pagamento è fuori dall’app e non passa da Nurvan', /fuori dall’app e non passa da Nurvan/.test(ui) && /fuori dall’app: non passa da Nurvan/.test(ui));
  ok('4f. un avviso giornaliero sul telefono del coach, contato dal server su TUTTI i clienti e tolto quando non c’è nulla da regolare', /function updateCoachPaymentReminder\(alert\)/.test(ui) && /updateCoachPaymentReminder\(payload\.payAlert\)/.test(ui) && /payAlert = \{ n: pa\.rows\[0\]\.n/.test(srv) && /coach_pay_due/.test(idx) && /cancelReminder\('coach_pay_due'\)/.test(idx));
}

// --- what the client sees ----------------------------------------------------------------
{
  const card = cut(ui, 'function athletePaymentCardHtml() {', 'function athleteWaitingHomeHtml() {');
  ok('5a. il cliente vede solo stato e data, nessun importo, nessun prezzo, nessun link o pulsante di pagamento', !/cents|importo|prezzo|€|amount|price|href|<button|onclick|http/i.test(card));
  ok('5b. la scheda compare solo per un atleta, e solo se il coach ha acceso il promemoria', /isAthleteRole\(\)\) return ''/.test(card) && /!p\.payTracking\) return ''/.test(card) && /store\.coachViewingClient/.test(card));
  ok('5c. è nella home dell’atleta con e senza scheda', /athleteWaitingHomeHtml\(\) \+\n    athletePaymentCardHtml\(\)/.test(ui) && /athletePaymentCardHtml\(\) : ''\}/.test(idx));
  ok('5d. il cliente riceve solo il proprio stato (nessun registro incassi nelle sue risposte)', !/coach_payment_events/.test(cut(srv, 'app.get("/api/client/inbox"', 'app.post("/api/client/request-program"')));
}

// --- a new program request: settled outside the app, nothing locked ----------------------
{
  ok('6a. la richiesta del cliente non parla di pagamenti né di prezzi', /Il coach riceve la richiesta e ti risponde\./.test(ui) && !/Il coach riceve la richiesta e ti assegna/.test(ui));
  ok('6b. il coach vede la richiesta “in attesa di accordo” e segna “accordo confermato”', /In attesa di accordo/.test(ui) && /ACCORDO CONFERMATO/.test(ui) && /\/agreement'/.test(ui) && /app\.post\("\/api\/coach\/clients\/:id\/agreement"/.test(srv));
  ok('6c. l’accordo è solo un evento del coach: non cambia piano, non blocca nulla, non tocca il programma', (() => { const h = cut(srv, 'app.post("/api/coach/clients/:id/agreement"', 'app.post("/api/coach/clients/:id/allow-db"'); return /INSERT INTO coach_events/.test(h) && !/UPDATE |updateAccountData|app_users|plan/.test(h); })());
  ok('6d. il cliente non vede l’evento dell’accordo (resta uno stato del coach)', (srv.match(/kind <> 'agreement_confirmed'/g) || []).length >= 2 && (srv.match(/'agreement_confirmed',/g) || []).length >= 2);
  ok('6e. richieste ripetute in pochi minuti non si accumulano', /kind = 'request_program' AND created_at > NOW\(\) - INTERVAL '10 minutes'/.test(srv));
}

// --- the handlers used in the pages are exported -----------------------------------------
{
  for (const name of ['setCoachClientView', 'loadMoreCoachClients', 'resetCoachClientView', 'openClientBilling', 'saveClientBilling', 'confirmClientAgreement', 'athletePaymentCardHtml', 'paymentStatusFor']) {
    ok('7. window.' + name + ' esportata', new RegExp('window\\.' + name + ' = ' + name).test(ui));
  }
}

console.log(failed ? '\n' + failed + ' FAILED' : '\nAll good.');
process.exit(failed ? 1 : 0);
