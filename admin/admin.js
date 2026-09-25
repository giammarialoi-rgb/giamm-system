// Nurvan Admin: la dashboard. Parla solo con /api/admin/*, con il cookie di
// sessione (HttpOnly) e l'intestazione X-Nurvan-Admin. Nessun codice dell'app
// utenti. I dati entrano nel DOM solo come testo (textContent), mai come HTML.

const $ = (id) => document.getElementById(id);
const PLANS = ['free', 'standard', 'coach', 'coach_pro'];
const PLAN_NAMES = { free: 'Free', standard: 'Standard', coach: 'Coach', coach_pro: 'Coach Pro' };
let session = null;
let currentTab = 'accounts';

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Nurvan-Admin': '1' },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch (_) {}
  if (res.status === 401 && !opts.allow401) { showLogin('Sessione scaduta: accedi di nuovo.'); throw new HttpError(401, 'Sessione scaduta'); }
  if (!res.ok) throw new HttpError(res.status, (json && json.error) || ('Errore ' + res.status));
  return json;
}

// el('td', { class: 'x' }, 'text' | Node | [...])
function el(tag, attrs, children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  const list = Array.isArray(children) ? children : (children == null ? [] : [children]);
  for (const c of list) {
    if (c == null || c === false) continue;
    node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}
function msg(kind, text) { return el('div', { class: 'msg ' + kind }, text); }
function date(v) {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function dateTime(v) {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function planName(p) { return PLAN_NAMES[p] || p || '—'; }
function table(headers, rows) {
  return el('div', { class: 'tbl' }, el('table', null, [
    el('thead', null, el('tr', null, headers.map((h) => el('th', null, h)))),
    el('tbody', null, rows.length ? rows : [el('tr', null, el('td', { colspan: headers.length, class: 'muted' }, 'Niente da mostrare.'))])
  ]));
}
function view(children) {
  const v = $('view');
  v.replaceChildren(...(Array.isArray(children) ? children : [children]));
}
function loading() { view(el('p', { class: 'muted' }, 'Caricamento…')); }

/* ---------------------------- login ---------------------------- */

function showLogin(text) {
  session = null;
  $('app').hidden = true;
  $('login').hidden = false;
  $('login-email').hidden = false;
  $('login-code').hidden = true;
  $('login-msg').replaceChildren(text ? msg('warn', text) : '');
}

$('login-email').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const btn = ev.submitter;
  if (btn) btn.disabled = true;
  try {
    const out = await api('/api/admin/login/start', { method: 'POST', body: { email: $('email').value }, allow401: true });
    $('login-email').hidden = true;
    $('login-code').hidden = false;
    $('code').value = '';
    $('code').focus();
    $('login-msg').replaceChildren(msg('ok', out.message || 'Controlla la posta.'));
  } catch (e) {
    $('login-msg').replaceChildren(msg('bad', e.message));
  } finally {
    if (btn) btn.disabled = false;
  }
});

$('login-code').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  try {
    const out = await api('/api/admin/login/verify', { method: 'POST', body: { email: $('email').value, code: $('code').value }, allow401: true });
    enter({ email: out.email, expiresAt: out.expiresAt });
  } catch (e) {
    $('login-msg').replaceChildren(msg('bad', e.message));
  }
});
$('login-back').addEventListener('click', () => showLogin(''));

$('logout').addEventListener('click', async () => {
  try { await api('/api/admin/logout', { method: 'POST', allow401: true }); } catch (_) {}
  showLogin('Sei uscito.');
});

function enter(s) {
  session = s;
  $('login').hidden = true;
  $('app').hidden = false;
  $('who').textContent = s.email + ' · sessione fino alle ' + dateTime(s.expiresAt);
  openTab(currentTab);
}

document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => openTab(b.dataset.tab)));

function openTab(tab) {
  currentTab = tab;
  document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'));
  const pages = { accounts: pageAccounts, coaches: pageCoaches, metrics: pageMetrics, catalog: pageCatalog, errors: pageErrors, planlog: pagePlanLog };
  (pages[tab] || pageAccounts)().catch((e) => { if (e.status !== 401) view(msg('bad', e.message)); });
}

/* ---------------------------- account ---------------------------- */

async function pageAccounts(q) {
  const query = typeof q === 'string' ? q : ($('acc-q') ? $('acc-q').value : '');
  loading();
  const out = await api('/api/admin/accounts?limit=500&q=' + encodeURIComponent(query));
  const search = el('input', { id: 'acc-q', type: 'search', placeholder: 'Cerca per email', value: query });
  const form = el('form', { class: 'row', onsubmit: (ev) => { ev.preventDefault(); pageAccounts(search.value); } }, [search, el('button', { class: 'btn', type: 'submit' }, 'Cerca')]);
  const rows = [];
  for (const a of out.accounts) {
    const seats = a.isCoach ? a.athletes + ' / ' + (a.seatsEffective == null ? '∞' : a.seatsEffective) : '—';
    const tr = el('tr', null, [
      el('td', null, a.email),
      el('td', null, planName(a.effectivePlan) + (a.effectivePlan !== a.plan ? ' (assegnato ' + planName(a.plan) + ')' : '') + (a.status === 'grace' ? ' · in tolleranza' : '')),
      el('td', null, a.planSource),
      el('td', null, date(a.planUntil)),
      el('td', null, seats),
      el('td', null, dateTime(a.lastSeenAt)),
      el('td', null, a.coachEmail || '—'),
      el('td', null, el('div', { class: 'row nowrap' }, [
        el('button', { class: 'btn', type: 'button', onclick: () => toggleSub(tr, planForm(a)) }, 'Piano'),
        el('button', { class: 'btn', type: 'button', onclick: async () => toggleSub(tr, await historyBox(a)) }, 'Storico')
      ]))
    ]);
    rows.push(tr);
  }
  view([
    el('h2', null, 'Account'),
    el('div', { class: 'panel' }, [form, el('p', { class: 'muted' }, out.accounts.length + ' account')]),
    table(['Email', 'Piano', 'Origine', 'Scadenza', 'Posti usati/totali', 'Ultimo accesso', 'Coach collegato', ''], rows)
  ]);
}

function toggleSub(tr, content) {
  const next = tr.nextElementSibling;
  if (next && next.classList.contains('sub')) next.remove();
  if (next && next.classList.contains('sub') && next.dataset.kind === content.dataset.kind) return;
  const sub = el('tr', { class: 'sub', 'data-kind': content.dataset.kind }, el('td', { colspan: tr.children.length }, content));
  tr.after(sub);
}

function planForm(a) {
  const plan = el('select', null, PLANS.map((p) => el('option', { value: p, selected: p === a.plan }, planName(p))));
  const seats = el('input', { type: 'text', placeholder: 'default del piano', value: a.seats == null ? '' : (a.seats < 0 ? 'unlimited' : a.seats), size: 12 });
  const until = el('input', { type: 'date', value: a.planUntil ? a.planUntil.slice(0, 10) : '' });
  const source = el('select', null, ['manual', 'stripe', 'play'].map((s) => el('option', { value: s, selected: s === a.planSource }, s)));
  const note = el('input', { type: 'text', placeholder: 'Nota (es. gratis ai primi coach)', size: 32 });
  const out = el('div');
  const box = el('div', { 'data-kind': 'plan' }, [
    el('div', { class: 'row' }, [
      el('label', null, ['Piano ', plan]),
      el('label', null, ['Posti ', seats]),
      el('label', null, ['Scadenza ', until]),
      el('label', null, ['Origine ', source]),
      note,
      el('button', { class: 'btn primary', type: 'button', onclick: save }, 'Salva')
    ]),
    el('p', { class: 'muted' }, 'Posti vuoti = quelli del piano; «unlimited» = illimitati. Scadenza vuota = senza scadenza.'),
    out
  ]);
  async function save() {
    try {
      const res = await api('/api/admin/accounts/' + encodeURIComponent(a.id) + '/plan', {
        method: 'POST',
        body: { plan: plan.value, seats: seats.value.trim(), until: until.value || null, source: source.value, note: note.value }
      });
      out.replaceChildren(msg('ok', 'Salvato: ' + a.email + ' ora ha ' + planName(res.account.plan) + '. L\'app lo riceve al prossimo aggiornamento.'));
      setTimeout(() => pageAccounts(), 900);
    } catch (e) {
      out.replaceChildren(msg('bad', e.message));
    }
  }
  return box;
}

async function historyBox(a) {
  const out = await api('/api/admin/accounts/' + encodeURIComponent(a.id) + '/history');
  const rows = out.history.map((h) => el('tr', null, [
    el('td', null, dateTime(h.changed_at)), el('td', null, planName(h.from_plan) + ' → ' + planName(h.to_plan)),
    el('td', null, h.source), el('td', null, date(h.plan_until)), el('td', null, h.seats == null ? '—' : String(h.seats)),
    el('td', null, h.actor || '—'), el('td', { class: 'wrap' }, h.note || '')
  ]));
  const box = el('div', { 'data-kind': 'history' }, table(['Quando', 'Da → a', 'Origine', 'Scadenza', 'Posti', 'Chi', 'Nota'], rows));
  return box;
}

/* ---------------------------- coach ---------------------------- */

async function pageCoaches() {
  loading();
  const out = await api('/api/admin/coaches');
  const rows = out.coaches.map((c) => el('tr', null, [
    el('td', null, c.email),
    el('td', null, planName(c.effectivePlan) + (c.trialActive ? ' (prova)' : '') + (c.status === 'grace' ? ' · in tolleranza' : '')),
    el('td', null, String(c.activeAthletes)),
    el('td', null, String(c.waitingAthletes)),
    el('td', null, c.seats == null ? '∞' : String(c.seats)),
    el('td', null, c.trialUsed ? 'sì' : 'no'),
    el('td', null, String(c.checkIns30)),
    el('td', null, dateTime(c.lastSeenAt))
  ]));
  view([el('h2', null, 'Coach'), table(['Email', 'Piano', 'Atleti attivi', 'In attesa di posto', 'Posti', 'Trial usato', 'Check-in 30 gg', 'Ultimo accesso'], rows)]);
}

/* ---------------------------- numbers ---------------------------- */

async function pageMetrics() {
  loading();
  const m = (await api('/api/admin/metrics')).metrics;
  const card = (n, l) => el('div', { class: 'card' }, [el('div', { class: 'n' }, String(n)), el('div', { class: 'l' }, l)]);
  view([
    el('h2', null, 'Numeri'),
    el('p', { class: 'muted' }, 'Calcolati dal server il ' + dateTime(m.at) + '.'),
    el('div', { class: 'cards' }, [
      card(m.active.d7, 'Account attivi, 7 giorni'), card(m.active.d30, 'Account attivi, 30 giorni'),
      card(m.sessions.d7, 'Sedute chiuse, 7 giorni'), card(m.sessions.d30, 'Sedute chiuse, 30 giorni'),
      card(m.imports.d7, 'Import fatti, 7 giorni'), card(m.imports.d30, 'Import fatti, 30 giorni'),
      card(m.checkIns.d7, 'Check-in inviati, 7 giorni'), card(m.checkIns.d30, 'Check-in inviati, 30 giorni')
    ]),
    el('h3', null, 'Account per piano (' + m.plans.total + ')'),
    table(['Piano', 'Assegnato', 'In vigore ora'], PLANS.map((p) => el('tr', null, [el('td', null, planName(p)), el('td', null, String(m.plans.assigned[p] || 0)), el('td', null, String(m.plans.effective[p] || 0))]))),
    el('p', { class: 'muted' }, '«In vigore ora» tiene conto di scadenze e prove, non dell\'eredità dal coach. Ultimo accesso: registrato dal server da questa versione; prima valeva solo per coach e atleti collegati.')
  ]);
}

/* ---------------------------- catalog ---------------------------- */

async function pageCatalog() {
  loading();
  const cat = await api('/api/admin/catalog');
  const foods = await api('/api/admin/custom-foods');
  const banner = el('div');
  const showRegenerate = () => banner.replaceChildren(msg('warn', 'food-staples.json è cambiato: rigenera il catalogo (node tools/build_food_catalog.mjs), poi build e commit. Sul server di produzione il file si perde al prossimo deploy: scaricalo e committalo.'),
    el('div', { class: 'row' }, el('a', { href: '/api/admin/catalog/file', download: 'food-staples.json' }, 'Scarica food-staples.json')));
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
  const custom = foods.foods.map((f) => el('tr', null, [el('td', null, f.name), el('td', null, String(f.accounts))]));
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

/* ---------------------------- errors ---------------------------- */

const KIND_LABELS = { sync_failed: 'sync', checkin_failed: 'invio check-in', import_failed: 'import' };

async function pageErrors() {
  loading();
  const out = await api('/api/admin/errors');
  const server = out.server.map((e) => el('tr', null, [
    el('td', null, dateTime(e.at)), el('td', null, KIND_LABELS[e.kind] || e.kind), el('td', null, e.email || '—'),
    el('td', null, e.format || '—'), el('td', null, e.status == null ? '—' : String(e.status)), el('td', { class: 'wrap' }, e.message || '—')
  ]));
  const app = out.app.map((e) => el('tr', null, [el('td', null, dateTime(e.at)), el('td', null, e.kind), el('td', null, e.state), el('td', null, e.email)]));
  view([
    el('h2', null, 'Errori · ultimi 30 giorni'),
    el('h3', null, 'Visti dal server'),
    el('p', { class: 'muted' }, 'Sync, invio dei check-in, import di documenti letti dal server. Gli import di Excel letti sul telefono non passano dal server e non compaiono qui.'),
    table(['Quando', 'Cosa', 'Account', 'Formato', 'Stato', 'Messaggio'], server),
    el('h3', null, 'Invii rimasti in sospeso nell\'app'),
    el('p', { class: 'muted' }, 'Check e check-in che l\'app ha segnato come non inviati o in attesa di linea, letti dai dati sincronizzati (solo stato e data).'),
    table(['Quando', 'Cosa', 'Stato', 'Account'], app)
  ]);
}

/* ---------------------------- plan log ---------------------------- */

async function pagePlanLog() {
  loading();
  const out = await api('/api/admin/plan-log');
  const rows = out.log.map((h) => el('tr', null, [
    el('td', null, dateTime(h.at)), el('td', null, h.email), el('td', null, planName(h.from) + ' → ' + planName(h.to)),
    el('td', null, h.source), el('td', null, date(h.until)), el('td', null, h.seats == null ? '—' : String(h.seats)),
    el('td', null, h.actor || '—'), el('td', { class: 'wrap' }, h.note || '')
  ]));
  view([el('h2', null, 'Log piani'), table(['Quando', 'Account', 'Da → a', 'Origine', 'Scadenza', 'Posti', 'Chi', 'Nota'], rows)]);
}

/* ---------------------------- start ---------------------------- */

(async function start() {
  try {
    const s = await api('/api/admin/session', { allow401: true });
    enter(s);
  } catch (_) {
    showLogin('');
  }
})();
