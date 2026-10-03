// Profili: everyone who uses Nurvan, filtered and sorted, and the full picture
// of one account with what can be done to it. Counts and dates only: never the
// content of their diary, photos, measures, therapy, exams or notes.
import { api, download, el, view, loading, table, badge, drawer, toast, field, msg, planName, PLANS, date, dateTime, ago, euro, num, bytes, card, lineChart } from './ui.js';

const state = { q: '', plan: '', role: '', seen: '', created: '', provider: '', suspended: '', sort: 'created', dir: 'desc', offset: 0, limit: 50 };

function query() {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) if (v !== '' && v != null) p.set(k, v);
  return p.toString();
}

export async function pageProfiles() {
  loading();
  const [out, signups] = await Promise.all([api('/api/admin/profiles?' + query()), api('/api/admin/signups?days=60')]);
  const sel = (key, label, options) => el('select', { onchange: (ev) => { state[key] = ev.target.value; state.offset = 0; pageProfiles(); } },
    [el('option', { value: '' }, label)].concat(options.map(([v, l]) => el('option', { value: v, selected: state[key] === v }, l))));
  const search = el('input', { type: 'search', placeholder: 'Cerca email o nome', value: state.q, style: 'min-width:200px' });
  const form = el('form', { class: 'filters', onsubmit: (ev) => { ev.preventDefault(); state.q = search.value.trim(); state.offset = 0; pageProfiles(); } }, [
    search, el('button', { class: 'btn', type: 'submit' }, 'Cerca'),
    sel('plan', 'Ogni piano', PLANS.map((p) => [p, planName(p)])),
    sel('role', 'Chiunque', [['coach', 'Coach'], ['athlete', 'Atleti di un coach'], ['solo', 'Senza coach']]),
    sel('seen', 'Ultimo accesso', [['7', 'Ultimi 7 giorni'], ['30', 'Ultimi 30 giorni'], ['quiet30', 'Fermi da 30 giorni'], ['never', 'Mai visti']]),
    sel('created', 'Iscritti', [['7', 'Ultimi 7 giorni'], ['30', 'Ultimi 30 giorni'], ['90', 'Ultimi 90 giorni']]),
    sel('provider', 'Accesso', [['email', 'Email'], ['google', 'Google'], ['apple', 'Apple']]),
    sel('suspended', 'Stato', [['1', 'Sospesi']]),
    el('button', { class: 'btn', type: 'button', onclick: () => { Object.assign(state, { q: '', plan: '', role: '', seen: '', created: '', provider: '', suspended: '', offset: 0 }); pageProfiles(); } }, 'Azzera'),
    el('button', { class: 'btn', type: 'button', onclick: () => download('/api/admin/profiles.csv?' + query(), 'nurvan-profili.csv').catch((e) => toast('bad', e.message)) }, 'Scarica CSV')
  ]);
  const head = (label, key, cls) => el('th', { class: 'sortable ' + (cls || ''), onclick: () => { if (state.sort === key) state.dir = state.dir === 'desc' ? 'asc' : 'desc'; else { state.sort = key; state.dir = key === 'email' ? 'asc' : 'desc'; } state.offset = 0; pageProfiles(); } },
    label + (state.sort === key ? (state.dir === 'desc' ? ' ↓' : ' ↑') : ''));
  const rows = out.rows.map((p) => el('tr', { class: 'click', onclick: () => openProfile(p.id) }, [
    el('td', null, [p.email, p.suspended ? badge('sospeso', 'bad') : null, p.verified ? null : badge('non verificata', 'warn')]),
    el('td', null, [planName(p.effectivePlan), p.trialActive ? badge('prova', 'blue') : null, p.status === 'grace' ? badge('tolleranza', 'warn') : null]),
    el('td', null, p.isCoach ? 'Coach · ' + p.athletes + ' atleti' : (p.coachEmail ? 'Atleta di ' + p.coachEmail : '—')),
    el('td', null, p.provider),
    el('td', null, date(p.createdAt)),
    el('td', null, ago(p.lastSeenAt)),
    el('td', { class: 'num' }, num(p.sessions)),
    el('td', { class: 'num' }, bytes(p.storageBytes))
  ]));
  const pages = Math.ceil(out.total / out.limit);
  const page = Math.floor(out.offset / out.limit) + 1;
  view([
    el('h2', null, 'Profili'),
    lineChart(signups.series.map((s) => ({ day: s.day, value: s.signups })), { title: 'Nuove iscrizioni, 60 giorni', height: 90 }),
    el('div', { class: 'panel' }, form),
    table([head('Account', 'email'), head('Piano', 'plan'), 'Ruolo', 'Accesso', head('Iscritto', 'created'), head('Ultimo accesso', 'seen'), head('Sedute', 'sessions', 'num'), head('Spazio', 'storage', 'num')], rows, { empty: 'Nessun profilo con questi filtri.' }),
    el('div', { class: 'row' }, [
      el('span', { class: 'muted' }, num(out.total) + ' profili · pagina ' + page + ' di ' + Math.max(1, pages)),
      el('button', { class: 'btn small', type: 'button', disabled: out.offset === 0, onclick: () => { state.offset = Math.max(0, out.offset - out.limit); pageProfiles(); } }, '← Prima'),
      el('button', { class: 'btn small', type: 'button', disabled: page >= pages, onclick: () => { state.offset = out.offset + out.limit; pageProfiles(); } }, 'Dopo →')
    ])
  ]);
}

/* ------------------------------ one account ------------------------------ */

export async function openProfile(id) {
  const { profile: p } = await api('/api/admin/profiles/' + encodeURIComponent(id));
  const body = el('div');
  const d = drawer(p.email, body);
  const refresh = async () => { d.close(); await openProfile(id); };
  const section = (title, ...content) => el('div', { class: 'panel' }, [el('h3', { style: 'margin-top:0' }, title)].concat(content));
  const kv = (pairs) => el('dl', { class: 'kv' }, pairs.flatMap(([k, v]) => [el('dt', null, k), el('dd', null, v == null || v === '' ? '—' : v)]));

  body.append(
    el('div', { class: 'row', style: 'margin-bottom:10px' }, [
      badge(planName(p.effectivePlan), 'blue'), p.trialActive ? badge('in prova', 'blue') : null, p.suspended ? badge('sospeso', 'bad') : null,
      p.verified ? badge('email verificata', 'ok') : badge('email non verificata', 'warn'), p.isCoach ? badge('coach', 'ok') : null
    ]),
    section('Chi è', kv([
      ['Nome', p.name], ['Email', p.email], ['Iscritto il', dateTime(p.createdAt)], ['Ultimo accesso', p.lastSeenAt ? dateTime(p.lastSeenAt) + ' (' + ago(p.lastSeenAt) + ')' : 'mai'],
      ['Accesso con', [p.provider].concat(p.identities.map((i) => i.provider + (i.email ? ' (' + i.email + ')' : ''))).join(', ')],
      ['Coach', p.coachEmail], ['Consenso informativa', p.consent.version ? p.consent.version + ' · ' + date(p.consent.at) : 'non dato'],
      ['Dati salute / AI / età', (p.consent.health ? 'salute sì' : 'salute no') + ' · ' + (p.consent.ai ? 'AI sì' : 'AI no') + ' · ' + (p.consent.age ? 'età confermata' : 'età no')]
    ])),
    section('Uso dell\'app',
      el('div', { class: 'cards' }, [
        card(num(p.usage.sessionsTotal), 'Sedute registrate'), card(num(p.usage.sessions30), 'Sedute, 30 giorni'),
        card(num(p.usage.bodyChecks), 'Controlli fisici'), card(num(p.usage.imports), 'Import fatti'),
        card(num(p.usage.nutritionDays), 'Giorni di alimentazione'), card(bytes(p.usage.storageBytes), 'Spazio occupato')
      ]),
      kv([['Ultima sincronizzazione', dateTime(p.usage.syncedAt)], ['Revisione dati', p.usage.revision], ['Sessioni chiuse il', p.usage.sessionsRevokedAt ? dateTime(p.usage.sessionsRevokedAt) : null]]),
      p.clients ? kv([['Atleti seguiti', p.clients.active + ' attivi su ' + p.clients.total], ['Atleti visti negli ultimi 7 giorni', p.clients.seen7]]) : null,
      el('p', { class: 'muted' }, 'Solo conteggi e date: il contenuto dei dati non si legge da qui.')
    ),
    planSection(p, refresh),
    billingSection(p, refresh),
    notesSection(p, refresh),
    actionsSection(p, refresh),
    section('Soldi di questo account',
      p.ledger.length ? table(['Data', 'Tipo', ['Importo', 'num'], 'Categoria', 'Origine', 'Nota'], p.ledger.map((l) => el('tr', null, [el('td', null, date(l.day)), el('td', null, l.kind === 'income' ? 'entrata' : 'uscita'), el('td', { class: 'num' }, euro(l.cents)), el('td', null, l.category), el('td', null, l.source), el('td', { class: 'wrap' }, l.note)]))) : el('p', { class: 'muted' }, 'Nessun incasso registrato.'),
      ledgerForm(p, refresh)
    ),
    section('Storico dei piani', table(['Quando', 'Da → a', 'Origine', 'Scadenza', 'Chi', 'Nota'], p.history.map((h) => el('tr', null, [el('td', null, dateTime(h.at)), el('td', null, planName(h.from) + ' → ' + planName(h.to)), el('td', null, h.source), el('td', null, date(h.until)), el('td', null, h.actor || '—'), el('td', { class: 'wrap' }, h.note)])))),
    section('Ultimi problemi visti dal server', p.events.length ? table(['Quando', 'Cosa', 'Rotta', 'Stato', 'Messaggio'], p.events.map((e) => el('tr', null, [el('td', null, dateTime(e.at)), el('td', null, e.kind), el('td', null, e.route || '—'), el('td', null, e.status == null ? '—' : e.status), el('td', { class: 'wrap' }, e.message || '—')]))) : el('p', { class: 'muted' }, 'Nessuno.'))
  );
}

function planSection(p, refresh) {
  const plan = el('select', null, PLANS.map((x) => el('option', { value: x, selected: x === p.plan }, planName(x))));
  const seats = el('input', { type: 'text', placeholder: 'default del piano', value: p.entitlement.seats == null ? '' : (p.entitlement.seats < 0 ? 'unlimited' : p.entitlement.seats), size: 12 });
  const until = el('input', { type: 'date', value: p.planUntil ? p.planUntil.slice(0, 10) : '' });
  const source = el('select', null, ['manual', 'stripe', 'play'].map((s) => el('option', { value: s, selected: s === p.planSource }, s)));
  const note = el('input', { type: 'text', placeholder: 'Nota (es. gratis ai primi coach)', size: 28 });
  return el('div', { class: 'panel' }, [
    el('h3', { style: 'margin-top:0' }, 'Piano'),
    el('div', { class: 'form' }, [field('Piano', plan), field('Posti', seats, 'vuoto = quelli del piano'), field('Scadenza', until, 'vuota = nessuna'), field('Origine', source), field('Nota', note)]),
    el('div', { class: 'row', style: 'margin-top:10px' }, el('button', { class: 'btn primary', type: 'button', onclick: async (ev) => {
      ev.target.disabled = true;
      try {
        await api('/api/admin/accounts/' + p.id + '/plan', { method: 'POST', body: { plan: plan.value, seats: seats.value.trim(), until: until.value || null, source: source.value, note: note.value } });
        toast('ok', 'Piano salvato. L\'app lo riceve al prossimo aggiornamento.');
        refresh();
      } catch (e) { toast('bad', e.message); ev.target.disabled = false; }
    } }, 'Salva piano'))
  ]);
}

function billingSection(p, refresh) {
  const b = p.billing || {};
  const period = el('select', null, [['', 'dal listino'], ['month', 'mensile'], ['year', 'annuale']].map(([v, l]) => el('option', { value: v, selected: (b.period || '') === v }, l)));
  const price = el('input', { type: 'text', placeholder: 'es. 19', value: b.priceCents ? (b.priceCents / 100).toString().replace('.', ',') : '', size: 8 });
  const comp = el('input', { type: 'checkbox', checked: !!b.comp });
  const note = el('input', { type: 'text', value: b.note || '', placeholder: 'Nota', size: 28 });
  return el('div', { class: 'panel' }, [
    el('h3', { style: 'margin-top:0' }, 'Cosa paga'),
    el('p', { class: 'muted' }, 'Un piano assegnato a mano senza prezzo conta come omaggio. Con origine Stripe o store paga il listino, a meno che qui non metti il suo prezzo. «Omaggio» lo toglie dagli incassi in ogni caso.'),
    el('div', { class: 'form' }, [field('Periodo', period), field('Prezzo (€)', price), field('Omaggio', comp), field('Nota', note)]),
    el('div', { class: 'row', style: 'margin-top:10px' }, el('button', { class: 'btn', type: 'button', onclick: async (ev) => {
      ev.target.disabled = true;
      try {
        await api('/api/admin/accounts/' + p.id + '/billing', { method: 'PUT', body: { period: period.value, price: price.value, comp: comp.checked, note: note.value } });
        toast('ok', 'Salvato.');
        refresh();
      } catch (e) { toast('bad', e.message); ev.target.disabled = false; }
    } }, 'Salva'))
  ]);
}

function ledgerForm(p, refresh) {
  const amount = el('input', { type: 'text', placeholder: 'importo €', size: 9 });
  const category = el('select', null, ['abbonamento', 'consulenza', 'altro'].map((c) => el('option', { value: c }, c)));
  const day = el('input', { type: 'date', value: new Date().toISOString().slice(0, 10) });
  const source = el('select', null, ['manual', 'stripe', 'play', 'apple', 'bank'].map((c) => el('option', { value: c }, c)));
  const note = el('input', { type: 'text', placeholder: 'nota', size: 20 });
  return el('div', { class: 'form', style: 'margin-top:10px' }, [
    field('Incasso €', amount), field('Data', day), field('Categoria', category), field('Origine', source), field('Nota', note),
    el('button', { class: 'btn', type: 'button', onclick: async () => {
      try {
        await api('/api/admin/ledger', { method: 'POST', body: { kind: 'income', amount: amount.value, day: day.value, category: category.value, source: source.value, note: note.value, userId: p.id } });
        toast('ok', 'Incasso registrato.');
        refresh();
      } catch (e) { toast('bad', e.message); }
    } }, 'Registra incasso')
  ]);
}

function notesSection(p, refresh) {
  const text = el('textarea', { placeholder: 'Nota privata su questo account (solo tu la vedi)' });
  const tag = el('input', { type: 'text', placeholder: 'etichetta (facoltativa)', size: 18 });
  return el('div', { class: 'panel' }, [
    el('h3', { style: 'margin-top:0' }, 'Note private'),
    p.notes.length ? el('div', null, p.notes.map((n) => el('div', { class: 'msg info' }, [
      el('div', null, [n.tag ? badge(n.tag, 'blue') : null, n.note]),
      el('div', { class: 'row', style: 'justify-content:space-between' }, [el('span', { class: 'muted' }, dateTime(n.at) + ' · ' + n.author),
        el('button', { class: 'btn small danger', type: 'button', onclick: async () => { await api('/api/admin/profiles/' + p.id + '/notes/' + n.id, { method: 'DELETE' }); refresh(); } }, 'Elimina')])
    ]))) : el('p', { class: 'muted' }, 'Nessuna nota.'),
    text, el('div', { class: 'row', style: 'margin-top:8px' }, [tag, el('button', { class: 'btn', type: 'button', onclick: async () => {
      try { await api('/api/admin/profiles/' + p.id + '/notes', { method: 'POST', body: { note: text.value, tag: tag.value } }); refresh(); } catch (e) { toast('bad', e.message); }
    } }, 'Aggiungi nota')])
  ]);
}

function actionsSection(p, refresh) {
  const days = el('input', { type: 'number', value: 14, min: 1, max: 365 });
  const run = async (fn, okText) => { try { await fn(); toast('ok', okText); refresh(); } catch (e) { toast('bad', e.message); } };
  return el('div', { class: 'panel' }, [
    el('h3', { style: 'margin-top:0' }, 'Azioni'),
    el('div', { class: 'row' }, [
      el('button', { class: 'btn', type: 'button', onclick: () => { if (confirm('Chiudere tutte le sessioni di ' + p.email + '? Dovrà accedere di nuovo.')) run(() => api('/api/admin/profiles/' + p.id + '/revoke-sessions', { method: 'POST' }), 'Sessioni chiuse.'); } }, 'Chiudi le sessioni'),
      p.suspended
        ? el('button', { class: 'btn', type: 'button', onclick: () => run(() => api('/api/admin/profiles/' + p.id + '/suspend', { method: 'POST', body: { suspended: false } }), 'Account riattivato.') }, 'Riattiva l\'account')
        : el('button', { class: 'btn danger', type: 'button', onclick: () => { if (confirm('Sospendere ' + p.email + '? Non potrà più usare l\'app finché non lo riattivi. I dati restano.')) run(() => api('/api/admin/profiles/' + p.id + '/suspend', { method: 'POST', body: { suspended: true } }), 'Account sospeso.'); } }, 'Sospendi l\'account'),
      field('Giorni di prova in più', days),
      el('button', { class: 'btn', type: 'button', onclick: () => run(() => api('/api/admin/profiles/' + p.id + '/extend-trial', { method: 'POST', body: { days: Number(days.value) } }), 'Prova prolungata.') }, 'Prolunga la prova')
    ]),
    p.trialActive || p.entitlement.trialUntil ? el('p', { class: 'muted' }, 'Prova fino al ' + date(p.entitlement.trialUntil)) : null,
    el('p', { class: 'muted' }, 'Eliminare un account lo può fare solo la persona, dall\'app (Impostazioni → Elimina account): così la cancellazione dei dati è sempre sua scelta.')
  ]);
}
