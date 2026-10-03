// Operazioni: what went wrong, who changed what, who is signed in to this
// dashboard, and the lists collected on the site.
import { api, download, el, view, loading, table, badge, toast, tabs, date, dateTime, num, bytes, card } from './ui.js';
import { errorsBlock, planLogBlock } from './page-legacy.js';

let tab = 'errors';

export async function pageOperations(which) {
  if (typeof which === 'string') tab = which;
  loading();
  const bar = tabs([['errors', 'Errori'], ['planlog', 'Log piani'], ['audit', 'Registro accessi'], ['sessions', 'Sessioni admin'], ['lists', 'Liste del sito'], ['storage', 'Spazio']], tab, (t) => pageOperations(t));
  const body = await ({ errors: errorsBlock, planlog: planLogBlock, audit: auditTab, sessions: sessionsTab, lists: listsTab, storage: storageTab }[tab] || errorsBlock)();
  view([el('h2', null, 'Operazioni'), bar].concat(body));
}

async function auditTab() {
  const out = await api('/api/admin/audit?limit=300');
  return [el('p', { class: 'muted' }, 'Ogni richiesta alla dashboard, con chi e da dove. Si conserva senza limite; non contiene mai dati degli utenti.'),
    table(['Quando', 'Chi', 'Cosa', 'Su', 'IP'], out.rows.map((r) => el('tr', null, [el('td', null, dateTime(r.at)), el('td', null, r.actor), el('td', null, r.action), el('td', null, r.target || '—'), el('td', null, r.ip || '—')])))];
}

async function sessionsTab() {
  const out = await api('/api/admin/admin-sessions');
  const rows = out.sessions.map((s) => el('tr', null, [el('td', null, [s.email, s.current ? badge('questa', 'ok') : null]), el('td', null, dateTime(s.createdAt)), el('td', null, dateTime(s.expiresAt)), el('td', null, s.ip || '—'), el('td', { class: 'wrap' }, s.userAgent)]));
  return [el('p', { class: 'muted' }, 'Chi è entrato in questa dashboard e non è ancora uscito. Se vedi qualcosa che non riconosci, chiudi le altre sessioni e cambia il link (ADMIN_PATH).'),
    table(['Chi', 'Entrato', 'Scade', 'IP', 'Dispositivo'], rows),
    out.sessions.length > 1 ? el('button', { class: 'btn danger', type: 'button', onclick: async () => { if (confirm('Chiudere tutte le altre sessioni?')) { const r = await api('/api/admin/admin-sessions/revoke-others', { method: 'POST' }); toast('ok', r.revoked + ' sessioni chiuse.'); pageOperations('sessions'); } } }, 'Chiudi le altre sessioni') : null];
}

function listsTab() {
  const file = (label, path, name, note) => el('div', { class: 'panel' }, [el('h3', { style: 'margin-top:0' }, label), el('p', { class: 'muted' }, note), el('button', { class: 'btn', type: 'button', onclick: () => download(path, name).catch((e) => toast('bad', e.message)) }, 'Scarica CSV')]);
  return [
    file('Contatti dal sito', '/api/admin/leads.csv', 'nurvan-contatti-sito.csv', 'Chi ha chiesto un allenamento di esempio. «Contattabile» = ha detto sì alle email, ha aperto il link ricevuto e non si è cancellato.'),
    file('Lista d\'attesa', '/api/admin/waitlist.csv', 'nurvan-lista-attesa.csv', 'Chi si è iscritto per essere avvisato al lancio.'),
    file('Candidature dei coach fondatori', '/api/admin/coach-applications.csv', 'nurvan-candidature-coach.csv', 'I coach che hanno chiesto di entrare tra i primi.')
  ];
}

async function storageTab() {
  const { storage: s } = await api('/api/admin/storage');
  return [
    el('div', { class: 'cards' }, [card(bytes(s.databaseBytes), 'Database intero'), card(bytes(s.accountDataBytes), 'Dati degli account', { sub: num(s.accounts) + ' account con dati' }), card(s.accounts ? bytes(Math.round(s.accountDataBytes / s.accounts)) : '—', 'Media per account')]),
    el('h3', null, 'Gli account che occupano più spazio'),
    table(['Account', 'Spazio'], s.top.map((t) => el('tr', null, [el('td', null, t.email), el('td', { class: 'num' }, bytes(t.bytes))]))),
    el('p', { class: 'muted' }, 'Il piano gratuito del database di Render ha un tetto: tienilo d\'occhio qui. Dimensione compressa dei dati sincronizzati, senza guardarne il contenuto.')
  ];
}
