// Impostazioni: how this dashboard is protected and what is connected. Secrets
// are never shown: only whether they are set.
import { api, el, view, loading, table, badge, msg, ago, toast } from './ui.js';

export async function pageSettings() {
  loading();
  const [{ config: c }, { integrations }] = await Promise.all([api('/api/admin/config'), api('/api/admin/integrations')]);
  const row = (label, ok, text) => el('tr', null, [el('td', null, label), el('td', null, ok === null ? text : badge(ok ? 'a posto' : 'da sistemare', ok ? 'ok' : 'warn')), el('td', { class: 'wrap' }, ok === null ? '' : text)]);
  view([
    el('h2', null, 'Impostazioni'),
    el('h3', null, 'Accesso'),
    table(['Cosa', 'Stato', 'Dettaglio'], [
      row('Link privato', c.linkLength >= 16, c.linkLength >= 16 ? 'Impostato (' + c.linkLength + ' caratteri). La pagina esiste solo a quell\'indirizzo.' : 'Non impostato: in produzione la dashboard sarebbe spenta. Imposta ADMIN_PATH sul server.'),
      row('Email abilitate', c.adminEmails >= 1, c.adminEmails + ' indirizzi in ADMIN_EMAILS' + (c.adminEmails === 1 ? ' · conviene averne un secondo di scorta' : '')),
      row('Invio del codice', c.email, c.email ? 'Resend configurato: il codice arriva per email.' : 'Servono RESEND_API_KEY e MAIL_FROM sul server, senza non si può entrare.'),
      row('Chiave per gli script', c.cliToken, c.cliToken ? 'NURVAN_ADMIN_TOKEN impostato (serve solo a tools/plan_admin.mjs).' : 'Facoltativa: serve solo allo script da riga di comando.'),
      row('Ambiente', null, c.production ? 'produzione' : 'locale / sviluppo')
    ]),
    msg('info', 'Come funziona la protezione: la pagina non è su /admin ma su un indirizzo segreto che solo tu conosci; senza quell\'indirizzo le richieste ricevono «non trovato». In più serve l\'email abilitata e il codice a 6 cifre; la sessione dura 12 ore e ogni azione finisce nel registro accessi.'),
    el('h3', null, 'Collegamenti'),
    table(['Servizio', 'Stato', 'Ultimo aggiornamento', 'Cosa manca'], integrations.map((i) => el('tr', null, [
      el('td', null, i.label), el('td', null, i.configured ? (i.lastError ? badge('errore', 'bad') : badge('attivo', 'ok')) : badge('non collegato', 'warn')),
      el('td', null, i.lastOkAt ? ago(i.lastOkAt) : 'mai'), el('td', { class: 'wrap' }, i.configured ? (i.lastError || '—') : i.missing.join(', '))
    ]))),
    el('p', { class: 'muted' }, 'I numeri di Instagram e degli store si impostano nella pagina Statistiche. Le variabili si inseriscono su Render → il servizio → Environment.'),
    el('h3', null, 'Cosa legge la dashboard'),
    el('p', { class: 'muted' }, c.privacyNote)
  ]);
}
