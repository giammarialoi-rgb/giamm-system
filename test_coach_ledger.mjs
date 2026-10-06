// The coach's ledger (figures optional, totals exact), how a client is
// followed (in person, at a distance, both) with the place of each session,
// and no AI assistant for a coach's clients - refused by the server too.
import fs from 'node:fs';
import vm from 'node:vm';
import { BusinessTestHelpers, recordPaymentEvent, listPaymentEvents, deletePaymentEvent, PAYMENT_METHODS } from './server/coach-os/business.mjs';
import { normalizeSessionMode, appointmentRow, createAppointment, updateAppointment, sessionsReport } from './server/coach-os/scheduling.mjs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const { ledgerTotals, paymentAmount } = BusinessTestHelpers;

// --- figures -----------------------------------------------------------------
{
  ok('1a. la cifra è facoltativa: senza cifra non è un incasso da zero', paymentAmount({}).has === false && paymentAmount({ amountCents: '' }).has === false && paymentAmount({ amountCents: null }).has === false && paymentAmount({ amountCents: 0 }).has === true && paymentAmount({ amountCents: 8050 }).cents === 8050);
  let threw = 0;
  for (const bad of [-1, 'abc', 1e12]) { try { paymentAmount({ amountCents: bad }); } catch (_) { threw++; } }
  ok('1b. una cifra negativa, non numerica o assurda è rifiutata', threw === 3);
  const now = new Date('2026-10-15T12:00:00Z').getTime();
  const ev = (clientId, name, cents, date, has = true) => ({ kind: 'paid', clientId, clientName: name, amountCents: cents, hasAmount: has, occurredAt: date });
  const t = ledgerTotals([
    ev('1', 'Mario', 8000, '2026-10-02T12:00:00Z'), ev('1', 'Mario', 8000, '2026-09-02T12:00:00Z'), ev('2', 'Anna', 12050, '2026-10-10T12:00:00Z'),
    ev('2', 'Anna', 5000, '2025-12-20T12:00:00Z'), ev('1', 'Mario', 0, '2026-10-12T12:00:00Z', false),
    { kind: 'refund', clientId: '1', amountCents: 9999, hasAmount: true, occurredAt: '2026-10-01T12:00:00Z' }
  ], now);
  ok('1c. totale di tutto: 330,50', t.allCents === 33050 && t.count === 5);
  ok('1d. quest’anno 280,50, questo mese 200,50, ultimi 30 giorni 200,50', t.yearCents === 28050 && t.monthCents === 20050 && t.last30Cents === 20050);
  ok('1e. gli incassi senza cifra sono contati a parte e non entrano nei totali', t.withoutAmount === 1);
  ok('1f. mese per mese, dal più recente', t.byMonth.map((m) => m.month + ':' + m.cents).join() === '2026-10:20050,2026-09:8000,2025-12:5000');
  ok('1g. cliente per cliente, da chi ha pagato di più', t.byClient.map((c) => c.clientName + ':' + c.cents + ':' + c.count).join() === 'Anna:17050:2,Mario:16000:3');
  ok('1h. registro vuoto: tutto a zero, nessun errore', ledgerTotals([]).allCents === 0 && ledgerTotals(null).byMonth.length === 0);
}
// --- writing, listing, deleting ------------------------------------------------
{
  const rows = [];
  const pool = { async query(sql, p) {
    const s = sql.replace(/\s+/g, ' ').trim();
    if (s.startsWith('INSERT INTO coach_payment_events')) { const r = { id: rows.length + 1, coach_user_id: p[0], client_id: p[1], plan_id: p[2], kind: p[3], amount_cents: p[4], currency: p[5], note: p[6], occurred_at: p[7] || '2026-10-03T10:00:00.000Z', method: p[8], label: p[9], has_amount: p[10] }; rows.push(r); return { rows: [r] }; }
    if (s.startsWith('UPDATE coach_clients SET paid')) return { rows: [] };
    if (s.startsWith('SELECT e.*, c.display_name AS client_name')) return { rows: rows.filter((r) => r.coach_user_id === p[0]).map((r) => Object.assign({ client_name: 'Mario' }, r)) };
    if (s.startsWith('DELETE FROM coach_payment_events')) { const i = rows.findIndex((r) => String(r.id) === String(p[0]) && r.coach_user_id === p[1]); if (i < 0) return { rows: [] }; rows.splice(i, 1); return { rows: [{ id: p[0] }] }; }
    throw new Error('unexpected SQL: ' + s.slice(0, 70));
  } };
  const e = await recordPaymentEvent(pool, 7, { clientId: 1, kind: 'paid', amountCents: 12050, occurredAt: '2026-09-30T12:00:00.000Z', method: 'transfer', label: 'Pacchetto di sedute', note: 'ottobre' });
  ok('2a. un incasso tiene cifra, data, metodo, causale e nota', e.amountCents === 12050 && e.hasAmount === true && e.method === 'transfer' && e.label === 'Pacchetto di sedute' && String(e.occurredAt).startsWith('2026-09-30'));
  const n = await recordPaymentEvent(pool, 7, { clientId: 1, kind: 'paid', method: 'bitcoin' });
  ok('2b. senza cifra viene salvato come tale; un metodo sconosciuto non viene scritto', n.hasAmount === false && n.amountCents === 0 && n.method === null && PAYMENT_METHODS.join() === 'cash,transfer,card,other');
  let bad = false; try { await recordPaymentEvent(pool, 7, { clientId: 1, occurredAt: 'boh' }); } catch (_) { bad = true; }
  ok('2c. una data non valida è rifiutata', bad);
  ok('2d. l’elenco porta il nome del cliente', (await listPaymentEvents(pool, 7)).every((x) => x.clientName === 'Mario'));
  ok('2e. un incasso lo elimina solo il coach che l’ha scritto', (await deletePaymentEvent(pool, 99, 1)) === false && (await deletePaymentEvent(pool, 7, 1)) === true && rows.length === 1);
}
// --- where a session takes place ------------------------------------------------
{
  ok('3a. una sessione è in presenza, a distanza o non indicata', normalizeSessionMode('presence') === 'presence' && normalizeSessionMode('REMOTE') === 'remote' && normalizeSessionMode('boh') === null && appointmentRow({ id: 1, mode: 'presence' }).mode === 'presence');
  const seen = [];
  const pool = { async query(sql, p) {
    const s = sql.replace(/\s+/g, ' ').trim(); seen.push([s, p]);
    if (s.startsWith('SELECT id FROM coach_appointments')) return { rows: [] };
    if (s.startsWith('INSERT INTO coach_appointments')) return { rows: [{ id: 5, client_id: p[1], type: p[2], title: p[3], starts_at: p[4], ends_at: p[5], status: 'scheduled', mode: p[9] }] };
    if (s.startsWith('UPDATE coach_appointments')) return { rows: [{ id: p[0], status: p[5] || 'scheduled', mode: p[7] }] };
    if (s.startsWith('SELECT a.client_id')) return { rows: [{ client_id: 1, client_name: 'Mario', month: '2026-10', mode: 'presence', n: 3 }, { client_id: 1, client_name: 'Mario', month: '2026-10', mode: '', n: 2 }] };
    return { rows: [] };
  } };
  const a = await createAppointment(pool, 7, { title: 'Seduta', type: 'Training Session', startsAt: '2026-10-05T16:00:00Z', clientId: 1, mode: 'presence' });
  ok('3b. la sessione creata ricorda dove si fa', a.mode === 'presence');
  ok('3c. e si può cambiare', (await updateAppointment(pool, 7, 5, { mode: 'remote' })).mode === 'remote');
  const rep = await sessionsReport(pool, 7);
  ok('3d. il resoconto conta le sedute fatte, in presenza e non, per cliente e mese', rep.length === 2 && rep[0].count === 3 && rep[0].mode === 'presence' && rep[1].mode === null && /status = 'completed'/.test(seen[seen.length - 1][0]));
}
// --- the pieces in the app and on the server ----------------------------------------
const practice = fs.readFileSync('coach-practice.mjs', 'utf8');
const api = fs.readFileSync('coach-api.mjs', 'utf8');
const ui = fs.readFileSync('web/coach-practice-ui.js', 'utf8').replace(/\r\n/g, '\n');
const biz = fs.readFileSync('web/coach-os/business.js', 'utf8').replace(/\r\n/g, '\n');
const cal = fs.readFileSync('web/coach-os/calendar.js', 'utf8');
{
  ok('4a. il cliente ha una modalità (a distanza, in presenza, entrambe), scelta alla creazione e modificabile', /const COACHING_MODES = \["remote", "presence", "both"\]/.test(practice) && /\/api\/coach\/clients\/:id\/coaching-mode/.test(practice) && /id="cp-add-coaching-mode"/.test(ui) && /function setCoachingMode/.test(ui) && /coachingModeFieldHtml\(id, cl\.coachingMode\)/.test(ui));
  ok('4b. a un cliente in presenza il link è facoltativo, e lo dice', /Cliente in presenza: mandargli il link è facoltativo/.test(ui));
  ok('4c. nel calendario ogni sessione dice dove si fa', /id="cal-mode"/.test(cal) && /mode: val\('cal-mode'\)/.test(cal));
  ok('4d. la migrazione aggiunge modalità, luogo della sessione e i campi del registro', /coaching_mode TEXT NOT NULL DEFAULT 'remote'/.test(fs.readFileSync('server/db/migrations/0023_coach_presence_payments.sql', 'utf8')));
  const c = { window: { CoachOS: { views: {} }, tr: (s) => s }, document: { documentElement: { lang: 'it' }, getElementById: () => null }, Intl, Date, String, Number, Math, Object, isFinite, isNaN, store: {}, console };
  vm.createContext(c);
  vm.runInContext(biz, c);
  const P = c.window.CoachOS.ledgerTestHooks.parseAmount;
  ok('4e. la cifra si scrive come viene: 80, 80,50, 1.250,00, 12.5 — vuoto vuol dire senza cifra', P('80') === 8000 && P('80,50') === 8050 && P('1.250,00') === 125000 && P('12.5') === 1250 && P('€ 30') === 3000 && P('') === null && isNaN(P('abc')) && isNaN(P('-5')));
  ok('4f. il registro ha totali, dettaglio per cliente, sedute fatte, eliminazione ed esportazione', /Totale incassato/.test(biz) && /Per cliente/.test(biz) && /Sedute fatte negli ultimi 12 mesi/.test(biz) && /CoachOS\.deletePayment/.test(biz) && /CoachOS\.exportLedgerCsv/.test(biz) && /dall’app non passa nessun pagamento/i.test(biz));
}
{
  ok('5a. il server rifiuta l’assistente AI a un cliente del coaching', /who\.role === "athlete" \|\| who\.provider === "coach_client"/.test(api) && /AI_NOT_FOR_CLIENTS/.test(api));
  ok('5b. il coach non può più attivarlo, e i dati del cliente lo danno sempre spento', /allowNurvanAi: false,/.test(practice) && !/allowNurvanAi: !!r\.allow_nurvan_ai/.test(practice) && !/SET allow_nurvan_ai = TRUE/.test(practice));
  const c = { store: { clientShell: true, clientProfile: { allowNurvanAi: true } }, isAthleteRole: () => true, isClientStorageContext: () => true, window: {} };
  vm.createContext(c);
  const gateSrc = ui.slice(ui.indexOf('function gatePracticeView(v) {'));
  const canSrc = ui.slice(ui.indexOf('function athleteCanUseNurvanAi() {'));
  const NL = String.fromCharCode(10);
  vm.runInContext(gateSrc.slice(0, gateSrc.indexOf(NL + 'function ', 10)) + NL + canSrc.slice(0, canSrc.indexOf(NL + '}') + 2) + NL + 'this.gate = gatePracticeView; this.can = athleteCanUseNurvanAi;', c);
  ok('5c. nell’app del cliente la pagina Coach AI non si apre, qualunque cosa dica un vecchio permesso', c.gate('ai') === 'home' && c.can() === false);
  ok('5d. nella scheda cliente non c’è più l’interruttore «Consenti Nurvan AI»', !/id="cp-nurvan-ai"/.test(ui) && !/Consenti Nurvan AI/.test(ui));
}

console.log('');
if (failed) { console.log(failed + ' controlli del registro coach falliti.'); process.exit(1); }
console.log('Tutti i controlli del registro coach passano.');
