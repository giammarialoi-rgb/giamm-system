// Economia: what comes in, what goes out, who pays. Never the coaches' own
// takings from their clients: only Nurvan's money.
import { api, download, el, view, loading, table, badge, toast, field, msg, planName, PLANS, date, euro, card, barChart, shareBars, tabs, num } from './ui.js';

let tab = 'summary';
const ledgerState = { from: '', to: '', kind: '', q: '' };
const STATE_LABEL = { paying: ['paga', 'ok'], comp: ['omaggio', 'blue'], trial: ['in prova', 'warn'], expired: ['scaduto', 'bad'], free: ['free', ''] };

async function openProfileFromHere(id) { const m = await import('./page-profiles.js'); await m.openProfile(id); }

export async function pageEconomy(which) {
  if (typeof which === 'string') tab = which;
  loading();
  const bar = tabs([['summary', 'Riepilogo'], ['ledger', 'Contabilità'], ['subscribers', 'Abbonati'], ['prices', 'Listino e costi']], tab, (t) => pageEconomy(t));
  const body = await ({ summary: summaryTab, ledger: ledgerTab, subscribers: subscribersTab, prices: pricesTab }[tab] || summaryTab)();
  view([el('h2', null, 'Economia'), bar].concat(body));
}

async function summaryTab() {
  const { summary: s } = await api('/api/admin/economy/summary');
  const l = s.ledger;
  const planRows = Object.entries(s.byPlan).filter(([id]) => id !== 'free').map(([id, v]) => el('tr', null, [
    el('td', null, planName(id)), el('td', { class: 'num' }, num(v.paying)), el('td', { class: 'num' }, euro(v.mrrCents)), el('td', { class: 'num' }, num(v.comp)), el('td', { class: 'num' }, num(v.trial))
  ]));
  const out = [
    el('div', { class: 'cards' }, [
      card(euro(s.mrrCents), 'Ricavo ricorrente mensile', { sub: euro(s.arrCents) + ' all\'anno' }),
      card(num(s.paying), 'Account che pagano', { sub: s.paying ? euro(s.arpuCents) + ' a testa al mese' : '' }),
      card(num(s.comp), 'In omaggio'), card(num(s.trial), 'In prova', { sub: s.trials.nowPaying + ' di chi ha provato ora paga' }),
      card(num(s.movements.new30), 'Nuovi abbonati, 30 giorni', { sub: num(s.movements.lost30) + ' persi' })
    ]),
    el('div', { class: 'cards' }, [
      card(euro(l.thisMonth.incomeCents), 'Incassato questo mese', { sub: 'mese scorso ' + euro(l.lastMonth.incomeCents) }),
      card(euro(l.thisMonth.expenseCents), 'Speso questo mese', { sub: 'mese scorso ' + euro(l.lastMonth.expenseCents) }),
      card(euro(l.thisMonth.netCents), 'Risultato del mese'),
      card(euro(l.ytd.incomeCents - l.ytd.expenseCents), 'Risultato ' + l.ytd.year, { sub: euro(l.ytd.incomeCents) + ' entrate · ' + euro(l.ytd.expenseCents) + ' uscite' }),
      card(euro(s.burnCents), 'Costi fissi al mese', { sub: s.runwayNote ? (s.runwayNote.coveredByMrr ? 'coperti dagli abbonamenti' : 'mancano ' + euro(s.runwayNote.gapCents) + ' al mese') : 'inseriscili in Listino e costi' })
    ]),
    barChart(l.series.map((r) => ({ label: r.month, a: r.incomeCents, b: r.expenseCents })), { height: 160 }),
    el('h3', null, 'Abbonati per piano'),
    table(['Piano', ['Pagano', 'num'], ['Ricavo al mese', 'num'], ['Omaggi', 'num'], ['In prova', 'num']], planRows)
  ];
  if (l.categories.length) {
    out.push(el('div', { class: 'grid2' }, [
      el('div', null, [el('h3', null, 'Entrate ' + l.ytd.year + ' per categoria'), shareBars(l.categories.filter((c) => c.kind === 'income').map((c) => ({ label: c.category, value: c.cents })), { fmt: euro })]),
      el('div', null, [el('h3', null, 'Uscite ' + l.ytd.year + ' per categoria'), shareBars(l.categories.filter((c) => c.kind === 'expense').map((c) => ({ label: c.category, value: c.cents })), { fmt: euro })])
    ]));
  }
  out.push(el('h3', null, 'Scadenze nei prossimi 30 giorni'));
  out.push(table(['Account', 'Piano', 'Stato', 'Scade il', ['Al mese', 'num']], s.expiring.map((e) => el('tr', { class: 'click', onclick: () => openProfileFromHere(e.id) }, [
    el('td', null, e.email), el('td', null, planName(e.plan)), el('td', null, badge(...STATE_LABEL[e.state])), el('td', null, date(e.until)), el('td', { class: 'num' }, euro(e.monthlyCents))
  ])), { empty: 'Nessun piano in scadenza.' }));
  out.push(el('p', { class: 'muted' }, 'Il ricavo ricorrente è una stima dai piani attivi e dal listino (o dal prezzo dell\'account). Le entrate vere sono quelle della Contabilità: quando i pagamenti passeranno da Stripe o dagli store, ci arriveranno da soli.'));
  return out;
}

async function ledgerTab() {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(ledgerState)) if (v) p.set(k, v);
  const [{ rows }, { summary: s, categories }] = await Promise.all([api('/api/admin/ledger?' + p), api('/api/admin/economy/summary')]);
  const filt = (key, input) => { input.addEventListener('change', () => { ledgerState[key] = input.value; pageEconomy('ledger'); }); return input; };
  const kind = el('select', null, [['', 'Tutto'], ['income', 'Entrate'], ['expense', 'Uscite']].map(([v, l]) => el('option', { value: v, selected: ledgerState.kind === v }, l)));
  const from = el('input', { type: 'date', value: ledgerState.from });
  const to = el('input', { type: 'date', value: ledgerState.to });
  const q = el('input', { type: 'search', placeholder: 'Cerca nota o categoria', value: ledgerState.q });
  const filters = el('div', { class: 'filters' }, [filt('kind', kind), field('Dal', filt('from', from)), field('Al', filt('to', to)), filt('q', q),
    el('button', { class: 'btn', type: 'button', onclick: () => download('/api/admin/ledger.csv?' + p, 'nurvan-contabilita.csv').catch((e) => toast('bad', e.message)) }, 'Scarica CSV')]);

  // new entry
  const knd = el('select', null, [['income', 'Entrata'], ['expense', 'Uscita']].map(([v, l]) => el('option', { value: v }, l)));
  const cat = el('select');
  const fillCats = () => cat.replaceChildren(...(knd.value === 'income' ? categories.income : categories.expense).map((c) => el('option', { value: c }, c)));
  knd.addEventListener('change', fillCats); fillCats();
  const amount = el('input', { type: 'text', placeholder: '0,00', size: 9 });
  const day = el('input', { type: 'date', value: new Date().toISOString().slice(0, 10) });
  const source = el('select', null, ['manual', 'stripe', 'play', 'apple', 'bank'].map((c) => el('option', { value: c }, c)));
  const note = el('input', { type: 'text', placeholder: 'es. Render, giugno', size: 26 });
  const add = el('div', { class: 'panel' }, [
    el('h3', { style: 'margin-top:0' }, 'Nuova voce'),
    el('div', { class: 'form' }, [field('Tipo', knd), field('Importo €', amount), field('Data', day), field('Categoria', cat), field('Origine', source), field('Nota', note),
      el('button', { class: 'btn primary', type: 'button', onclick: async () => {
        try {
          await api('/api/admin/ledger', { method: 'POST', body: { kind: knd.value, amount: amount.value, day: day.value, category: cat.value, source: source.value, note: note.value } });
          toast('ok', 'Registrata.');
          pageEconomy('ledger');
        } catch (e) { toast('bad', e.message); }
      } }, 'Registra')]),
    el('p', { class: 'muted' }, 'Le voci non si cancellano: si annullano, e restano nel registro.')
  ]);
  const tbl = table(['Data', 'Tipo', ['Importo', 'num'], 'Categoria', 'Origine', 'Account', 'Nota', ''], rows.map((r) => el('tr', { style: r.voided ? 'opacity:.45;text-decoration:line-through' : '' }, [
    el('td', null, date(r.day)), el('td', null, r.kind === 'income' ? badge('entrata', 'ok') : badge('uscita', 'bad')), el('td', { class: 'num' }, euro(r.cents)), el('td', null, r.category), el('td', null, r.source),
    el('td', null, r.email || '—'), el('td', { class: 'wrap' }, r.note), el('td', null, r.voided ? '' : el('button', { class: 'btn small danger', type: 'button', onclick: async () => { if (confirm('Annullare questa voce?')) { await api('/api/admin/ledger/' + r.id + '/void', { method: 'POST' }); pageEconomy('ledger'); } } }, 'Annulla'))
  ])), { empty: 'Nessuna voce.' });
  const live = rows.filter((r) => !r.voided);
  const inc = live.filter((r) => r.kind === 'income').reduce((n, r) => n + r.cents, 0);
  const exp = live.filter((r) => r.kind === 'expense').reduce((n, r) => n + r.cents, 0);
  return [add, filters, el('p', { class: 'muted' }, 'Nei filtri: entrate ' + euro(inc) + ' · uscite ' + euro(exp) + ' · risultato ' + euro(inc - exp)), tbl];
}

async function subscribersTab() {
  const { subscribers: list } = await api('/api/admin/economy/subscribers');
  const order = { paying: 0, comp: 1, trial: 2, expired: 3, free: 4 };
  const rows = list.sort((a, b) => order[a.state] - order[b.state] || (b.monthlyCents - a.monthlyCents)).map((s) => el('tr', { class: 'click', onclick: () => openProfileFromHere(s.id) }, [
    el('td', null, s.email), el('td', null, badge(...STATE_LABEL[s.state])), el('td', null, planName(s.plan)), el('td', null, s.source), el('td', null, s.period === 'year' ? 'annuale' : s.period === 'month' ? 'mensile' : '—'),
    el('td', { class: 'num' }, s.state === 'paying' ? euro(s.monthlyCents) : '—'), el('td', null, date(s.until || s.trialUntil)), el('td', { class: 'wrap' }, s.note)
  ]));
  return [el('p', { class: 'muted' }, 'Tutti gli account che hanno o hanno avuto un piano, una prova o una riga di fatturazione. Tocca una riga per aprire l\'account.'),
    table(['Account', 'Stato', 'Piano', 'Origine', 'Periodo', ['Al mese', 'num'], 'Scade', 'Nota'], rows)];
}

async function pricesTab() {
  const { summary: s } = await api('/api/admin/economy/summary');
  const inputs = {};
  const rows = PLANS.filter((p) => p !== 'free').map((p) => {
    inputs[p] = { month: el('input', { type: 'text', size: 7, value: s.prices[p].month == null ? '' : String(s.prices[p].month).replace('.', ',') }), year: el('input', { type: 'text', size: 7, value: s.prices[p].year == null ? '' : String(s.prices[p].year).replace('.', ',') }) };
    return el('tr', null, [el('td', null, planName(p)), el('td', null, inputs[p].month), el('td', null, inputs[p].year)]);
  });
  const savePrices = el('button', { class: 'btn primary', type: 'button', onclick: async () => {
    const prices = {};
    for (const p of Object.keys(inputs)) prices[p] = { month: inputs[p].month.value.trim() || null, year: inputs[p].year.value.trim() || null };
    try { await api('/api/admin/settings/prices', { method: 'PUT', body: { prices } }); toast('ok', 'Listino salvato.'); pageEconomy('prices'); } catch (e) { toast('bad', e.message); }
  } }, 'Salva listino');

  const costs = s.costs.map((c) => ({ name: c.name, amount: (c.cents / 100).toString().replace('.', ','), period: c.period }));
  const list = el('div');
  const draw = () => list.replaceChildren(...costs.map((c, i) => el('div', { class: 'row', style: 'margin-bottom:6px' }, [
    el('input', { type: 'text', value: c.name, placeholder: 'Nome', oninput: (ev) => { c.name = ev.target.value; } }),
    el('input', { type: 'text', value: c.amount, size: 8, placeholder: '€', oninput: (ev) => { c.amount = ev.target.value; } }),
    el('select', { onchange: (ev) => { c.period = ev.target.value; } }, [['month', 'al mese'], ['year', 'all\'anno']].map(([v, l]) => el('option', { value: v, selected: c.period === v }, l))),
    el('button', { class: 'btn small danger', type: 'button', onclick: () => { costs.splice(i, 1); draw(); } }, 'Togli')
  ])));
  draw();
  const saveCosts = el('button', { class: 'btn primary', type: 'button', onclick: async () => {
    try { await api('/api/admin/settings/costs', { method: 'PUT', body: { costs } }); toast('ok', 'Costi salvati.'); pageEconomy('prices'); } catch (e) { toast('bad', e.message); }
  } }, 'Salva costi');
  return [
    el('div', { class: 'panel' }, [el('h3', { style: 'margin-top:0' }, 'Listino'), el('p', { class: 'muted' }, 'Prezzi dei piani in euro, per periodo. Servono a stimare il ricavo mensile degli account che pagano; lascia vuoto un periodo che non vendi.'),
      table(['Piano', 'Al mese (€)', 'All\'anno (€)'], rows), el('div', { class: 'row' }, savePrices)]),
    el('div', { class: 'panel' }, [el('h3', { style: 'margin-top:0' }, 'Costi fissi'), el('p', { class: 'muted' }, 'Server, email, dominio, account sviluppatore, strumenti: quello che spendi anche con zero clienti. Si usa per dire se gli abbonamenti coprono i costi.'),
      list, el('div', { class: 'row' }, [el('button', { class: 'btn', type: 'button', onclick: () => { costs.push({ name: '', amount: '', period: 'month' }); draw(); } }, '+ Aggiungi costo'), saveCosts])])
  ];
}
