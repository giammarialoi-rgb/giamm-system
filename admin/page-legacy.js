// Coach, catalog, errors and the plan log: the pages the dashboard had before,
// moved onto the shared pieces.
import { api, el, view, loading, table, msg, planName, date, dateTime } from './ui.js';

export async function pageCoaches() {
  loading();
  const out = await api('/api/admin/coaches');
  const rows = out.coaches.map((c) => el('tr', null, [
    el('td', null, c.email),
    el('td', null, planName(c.effectivePlan) + (c.trialActive ? ' (prova)' : '') + (c.status === 'grace' ? ' · in tolleranza' : '')),
    el('td', { class: 'num' }, String(c.activeAthletes)),
    el('td', { class: 'num' }, String(c.waitingAthletes)),
    el('td', { class: 'num' }, c.seats == null ? '∞' : String(c.seats)),
    el('td', null, c.trialUsed ? 'sì' : 'no'),
    el('td', { class: 'num' }, String(c.checkIns30)),
    el('td', null, dateTime(c.lastSeenAt))
  ]));
  view([el('h2', null, 'Coach'), table(['Email', 'Piano', 'Atleti attivi', 'In attesa di posto', 'Posti', 'Prova usata', 'Check-in 30 gg', 'Ultimo accesso'], rows)]);
}

export async function pageCatalog() {
  loading();
  const cat = await api('/api/admin/catalog');
  const foods = await api('/api/admin/custom-foods');
  const banner = el('div');
  const showRegenerate = () => banner.replaceChildren(msg('warn', 'food-staples.json è cambiato: rigenera il catalogo (node tools/build_food_catalog.mjs), poi build e commit. Sul server di produzione il file si perde al prossimo deploy: scaricalo e committalo.'));
  if (cat.regenerate) showRegenerate();
  const rows = cat.rows.map((f) => {
    const inputs = {};
    const cells = ['kcal', 'pro', 'carb', 'fat'].map((k) => {
      inputs[k] = el('input', { type: 'number', step: '0.1', min: '0', value: f[k] });
      return el('td', null, inputs[k]);
    });
    const state = el('span', { class: 'muted' }, f.stale ? 'da rigenerare' : '');
    const save = el('button', { class: 'btn', type: 'button', onclick: async () => {
      save.disabled = true;
      try {
        const body = {};
        for (const k of Object.keys(inputs)) body[k] = inputs[k].value;
        await api('/api/admin/catalog/' + encodeURIComponent(f.id), { method: 'PUT', body });
        state.textContent = 'salvato · da rigenerare';
        showRegenerate();
      } catch (e) {
        state.textContent = e.message;
      } finally {
        save.disabled = false;
      }
    } }, 'Salva');
    return el('tr', null, [el('td', null, f.name), el('td', null, f.category)].concat(cells, [el('td', null, el('div', { class: 'row nowrap' }, [save, state]))]));
  });
  const custom = foods.foods.map((f) => el('tr', null, [el('td', null, f.name), el('td', { class: 'num' }, String(f.accounts))]));
  view([
    el('h2', null, 'Catalogo'),
    banner,
    el('p', { class: 'muted' }, 'Le voci Nurvan (quelle che il CREA non copre), valori per 100 g. Le altre vengono dal CREA e non si modificano qui.'),
    table(['Alimento', 'Categoria', 'kcal', 'Proteine', 'Carboidrati', 'Grassi', ''], rows),
    el('h3', null, 'Aggiunti a mano dagli utenti'),
    el('p', { class: 'muted' }, 'Nome e numero di account che l\'hanno aggiunto, mai chi. Solo i nomi aggiunti da almeno 2 account.'),
    table(['Nome', 'Account'], custom)
  ]);
}

const KIND_LABELS = { sync_failed: 'sync', checkin_failed: 'invio check-in', import_failed: 'import' };

export async function errorsBlock() {
  const out = await api('/api/admin/errors');
  const server = out.server.map((e) => el('tr', null, [
    el('td', null, dateTime(e.at)), el('td', null, KIND_LABELS[e.kind] || e.kind), el('td', null, e.email || '—'),
    el('td', null, e.format || '—'), el('td', null, e.status == null ? '—' : String(e.status)), el('td', { class: 'wrap' }, e.message || '—')
  ]));
  const app = out.app.map((e) => el('tr', null, [el('td', null, dateTime(e.at)), el('td', null, e.kind), el('td', null, e.state), el('td', null, e.email)]));
  return [
    el('h3', null, 'Visti dal server · ultimi 30 giorni'),
    el('p', { class: 'muted' }, 'Sync, invio dei check-in, import di documenti letti dal server. Gli import di Excel letti sul telefono non passano dal server e non compaiono qui.'),
    table(['Quando', 'Cosa', 'Account', 'Formato', 'Stato', 'Messaggio'], server),
    el('h3', null, 'Invii rimasti in sospeso nell\'app'),
    el('p', { class: 'muted' }, 'Check e check-in che l\'app ha segnato come non inviati o in attesa di linea, letti dai dati sincronizzati (solo stato e data).'),
    table(['Quando', 'Cosa', 'Stato', 'Account'], app)
  ];
}

export async function planLogBlock() {
  const out = await api('/api/admin/plan-log');
  const rows = out.log.map((h) => el('tr', null, [
    el('td', null, dateTime(h.at)), el('td', null, h.email), el('td', null, planName(h.from) + ' → ' + planName(h.to)),
    el('td', null, h.source), el('td', null, date(h.until)), el('td', null, h.seats == null ? '—' : String(h.seats)),
    el('td', null, h.actor || '—'), el('td', { class: 'wrap' }, h.note || '')
  ]));
  return [table(['Quando', 'Account', 'Da → a', 'Origine', 'Scadenza', 'Posti', 'Chi', 'Nota'], rows)];
}
