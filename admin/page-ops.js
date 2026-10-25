// Operazioni: what went wrong, who changed what, who is signed in to this
// dashboard, and the lists collected on the site.
import { api, download, el, view, loading, table, badge, toast, tabs, date, dateTime, num, bytes, card } from './ui.js';
import { errorsBlock, planLogBlock } from './page-legacy.js';

let tab = 'errors';

export async function pageOperations(which) {
  if (typeof which === 'string') tab = which;
  else if (window.__adminSub) { tab = window.__adminSub; }
  window.__adminSub = null;
  loading();
  const bar = tabs([['errors', 'Errori'], ['planlog', 'Log piani'], ['reports', 'Segnalazioni chat'], ['content', 'Segnalazioni contenuti'], ['feedback', 'Suggerimenti app'], ['audit', 'Registro accessi'], ['sessions', 'Sessioni admin'], ['lists', 'Liste del sito'], ['storage', 'Spazio']], tab, (t) => pageOperations(t));
  const body = await ({ errors: errorsBlock, planlog: planLogBlock, reports: reportsTab, content: contentTab, feedback: feedbackTab, audit: auditTab, sessions: sessionsTab, lists: listsTab, storage: storageTab }[tab] || errorsBlock)();
  view([el('h2', null, 'Operazioni'), bar].concat(body));
}

async function reportsTab() {
  const out = await api('/api/admin/chat-reports?status=all');
  const rows = out.reports.map((r) => el('tr', null, [
    el('td', null, [badge(r.status === 'open' ? 'da gestire' : 'gestita', r.status === 'open' ? 'bad' : 'ok'), ' ' + dateTime(r.at)]),
    el('td', { class: 'wrap' }, [r.reasonLabel, r.details ? el('div', { class: 'muted' }, r.details) : null,
      r.excerpt.length ? el('details', null, [el('summary', { class: 'muted' }, 'Messaggi allegati (' + r.excerpt.length + ')'), el('div', { class: 'muted', style: 'white-space:pre-wrap' }, r.excerpt.map((m) => (m.from === 'coach' ? 'Coach' : 'Atleta') + ': ' + m.text).join('\n'))]) : null,
      r.handledNote ? el('div', { class: 'muted' }, 'Nota: ' + r.handledNote) : null]),
    el('td', null, (r.reporterRole === 'coach' ? 'Coach ' : 'Atleta ') + (r.reporter || '—')),
    el('td', null, [(r.reported || '—') + (r.blockedBy ? ' · chat bloccata' : ''), r.reportedSuspended ? el('div', null, badge('account sospeso', 'bad')) : null,
      // The step a store asks for after a report: the account that broke the rules can be suspended from here (its sessions end at once).
      r.reportedId ? el('div', null, el('button', { class: 'btn small' + (r.reportedSuspended ? '' : ' danger'), type: 'button', onclick: async () => {
        const suspend = !r.reportedSuspended;
        if (!confirm(suspend ? 'Sospendere l\'account ' + r.reported + '? Non potrà più entrare finché non lo riattivi.' : 'Riattivare l\'account ' + r.reported + '?')) return;
        await api('/api/admin/profiles/' + r.reportedId + '/suspend', { method: 'POST', body: { suspended: suspend } });
        toast(suspend ? 'Account sospeso' : 'Account riattivato', 'ok'); pageOperations('reports');
      } }, r.reportedSuspended ? 'Riattiva account' : 'Sospendi account')) : null]),
    el('td', null, r.status === 'open'
      ? el('button', { class: 'btn small primary', type: 'button', onclick: async () => { const note = prompt('Nota su come l\'hai gestita (facoltativa):', ''); if (note === null) return; await api('/api/admin/chat-reports/' + r.id, { method: 'POST', body: { note } }); toast('Segnalazione chiusa', 'ok'); pageOperations('reports'); } }, 'Gestita')
      : el('button', { class: 'btn small', type: 'button', onclick: async () => { await api('/api/admin/chat-reports/' + r.id, { method: 'POST', body: { reopen: true } }); pageOperations('reports'); } }, 'Riapri'))
  ]));
  return [el('p', { class: 'muted' }, 'Segnalazioni fatte da coach e atleti nella chat. La chat è cifrata: qui vedi solo i messaggi che chi segnala ha scelto di allegare. Gli store chiedono di rispondere in tempi brevi (entro 24 ore è l\'obiettivo).'),
    out.reports.length ? table(['Quando', 'Motivo', 'Chi segnala', 'Segnalato', ''], rows) : el('p', { class: 'muted' }, 'Nessuna segnalazione.')];
}

// Notices of illegal content from /segnala-contenuto (Digital Services Act): the decision written here goes by
// email to whoever sent the notice, with the way to contest it.
async function contentTab() {
  const out = await api('/api/admin/content-reports');
  const rows = out.reports.map((r) => el('tr', null, [
    el('td', null, [badge(r.status === 'open' ? 'da decidere' : 'decisa', r.status === 'open' ? 'bad' : 'ok'), ' n. ' + r.id + ' · ' + dateTime(r.at)]),
    el('td', { class: 'wrap' }, [r.kindLabel, el('div', { class: 'muted', style: 'white-space:pre-wrap' }, 'Dove: ' + r.location), el('div', { class: 'muted', style: 'white-space:pre-wrap' }, 'Perché: ' + r.explanation),
      r.decision ? el('div', { class: 'muted', style: 'white-space:pre-wrap' }, 'Decisione: ' + r.decision) : null]),
    el('td', null, [(r.name || 'anonimo'), r.email ? el('div', { class: 'muted' }, r.email) : null, el('div', { class: 'muted' }, 'lingua: ' + r.lang)]),
    el('td', null, r.status === 'open'
      ? el('button', { class: 'btn small primary', type: 'button', onclick: async () => {
        const decision = prompt('Decisione e motivo (arriva per email a chi ha segnalato). Es.: «Abbiamo rimosso la foto e sospeso l\'account: viola il diritto all\'immagine.» oppure «Non rimosso: il contenuto non risulta illegale perché…»', '');
        if (decision === null) return;
        const res = await api('/api/admin/content-reports/' + r.id, { method: 'POST', body: { decision } });
        toast(res.emailed ? 'Decisione salvata e inviata' : 'Decisione salvata (email non inviata)', 'ok'); pageOperations('content');
      } }, 'Decidi')
      : el('span', { class: 'muted' }, r.decidedAt ? dateTime(r.decidedAt) : ''))
  ]));
  return [el('p', { class: 'muted' }, 'Segnalazioni di contenuti illegali inviate da chiunque dalla pagina /segnala-contenuto (Digital Services Act). Per rimuovere un contenuto o sospendere un account usa Profili. Chi segnala riceve la tua decisione per email.'),
    out.reports.length ? table(['Quando', 'Contenuto', 'Chi segnala', ''], rows) : el('p', { class: 'muted' }, 'Nessuna segnalazione.')];
}

// Suggestions and problems sent from the app (Impostazioni › Suggerimenti e problemi). The answer goes by
// email from your own inbox: the address is here when the person left one.
async function feedbackTab() {
  const out = await api('/api/admin/feedback');
  const info = (d) => d ? Object.entries(d).map(([k, v]) => k + ': ' + v).join(' · ') : 'dati tecnici non allegati';
  const rows = out.items.map((f) => el('tr', null, [
    el('td', null, [badge(f.status === 'open' ? 'da leggere' : 'chiuso', f.status === 'open' ? 'warn' : 'ok'), ' n. ' + f.id + ' · ' + dateTime(f.at)]),
    el('td', { class: 'wrap' }, [el('strong', null, f.kindLabel), el('div', { style: 'white-space:pre-wrap' }, f.message),
      el('div', { class: 'muted' }, info(f.device)), f.note ? el('div', { class: 'muted' }, 'Nota: ' + f.note) : null]),
    el('td', null, [f.email ? el('a', { href: 'mailto:' + f.email + '?subject=' + encodeURIComponent('Il tuo messaggio a Nurvan (n. ' + f.id + ')') }, f.email) : el('span', { class: 'muted' }, 'nessuna email'),
      f.accountEmail && f.accountEmail !== f.email ? el('div', { class: 'muted' }, 'account: ' + f.accountEmail) : null]),
    el('td', null, f.status === 'open'
      ? el('button', { class: 'btn small primary', type: 'button', onclick: async () => { const note = prompt('Cosa hai fatto (facoltativo, resta qui):', ''); if (note === null) return; await api('/api/admin/feedback/' + f.id, { method: 'POST', body: { note } }); toast('Messaggio chiuso', 'ok'); pageOperations('feedback'); } }, 'Chiudi')
      : el('button', { class: 'btn small', type: 'button', onclick: async () => { await api('/api/admin/feedback/' + f.id, { method: 'POST', body: { reopen: true } }); pageOperations('feedback'); } }, 'Riapri'))
  ]));
  return [el('p', { class: 'muted' }, 'Suggerimenti e problemi inviati dall’app (Impostazioni › Suggerimenti e problemi). Arrivano anche per email. Per rispondere tocca l’indirizzo. I messaggi chiusi si cancellano dopo 12 mesi.'),
    out.items.length ? table(['Quando', 'Messaggio', 'Rispondere a', ''], rows) : el('p', { class: 'muted' }, 'Nessun messaggio.')];
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
