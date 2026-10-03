// Panoramica: the few numbers that say how Nurvan is going, and what needs a look.
import { api, el, view, loading, card, euro, num, pct, lineChart, daysPicker, msg } from './ui.js';

function open(tab) { window.dispatchEvent(new CustomEvent('nurvan-admin-open', { detail: tab })); }

export async function pageOverview(days) {
  const n = Number(days) || 30;
  loading();
  const { overview: o } = await api('/api/admin/overview?days=' + n);
  const k = o.kpis;
  const sections = [
    el('div', { class: 'row', style: 'justify-content:space-between;margin-bottom:6px;' }, [
      el('h2', { style: 'margin:0' }, 'Panoramica'),
      daysPicker(n, (d) => pageOverview(d))
    ])
  ];
  if (o.alerts.length) {
    sections.push(el('div', { class: 'alerts' }, o.alerts.map((a) => el('div', { class: 'msg ' + (a.level === 'bad' ? 'bad' : a.level === 'info' ? 'info' : 'warn') }, [
      el('span', null, a.text),
      el('button', { class: 'btn small', type: 'button', onclick: () => open(a.tab) }, 'Apri')
    ]))));
  } else {
    sections.push(msg('ok', 'Niente che richieda attenzione.'));
  }
  sections.push(
    el('h3', null, 'Soldi'),
    el('div', { class: 'cards' }, [
      card(euro(k.mrrCents), 'Ricavo ricorrente mensile', { onclick: () => open('economy'), sub: euro(k.mrrCents * 12) + ' all\'anno' }),
      card(num(k.paying), 'Account che pagano', { onclick: () => open('economy') }),
      card(num(k.comp), 'Piani in omaggio', { onclick: () => open('economy') }),
      card(num(k.trial), 'In prova', { onclick: () => open('economy') })
    ]),
    el('h3', null, 'Persone'),
    el('div', { class: 'cards' }, [
      card(num(k.accounts), 'Account', { onclick: () => open('profiles') }),
      card(num(k.new7), 'Nuovi, 7 giorni', { sub: num(k.new30) + ' in 30 giorni', onclick: () => open('profiles') }),
      card(num(k.active7), 'Attivi, 7 giorni', { sub: num(k.active30) + ' in 30 giorni' }),
      card(num(k.dailyActiveApp), 'App aperta oggi', { sub: num(k.sessions30) + ' sedute chiuse in 30 gg', onclick: () => open('stats') })
    ]),
    el('h3', null, 'Sito, social, download'),
    el('div', { class: 'cards' }, [
      card(num(k.siteVisitors.current), 'Visitatori del sito', { delta: pct(k.siteVisitors.delta), onclick: () => open('stats') }),
      card(num(k.siteViews.current), 'Pagine viste', { delta: pct(k.siteViews.delta), onclick: () => open('stats') }),
      card(k.instagram.followers == null ? '—' : num(k.instagram.followers), 'Follower Instagram', { delta: k.instagram.deltaMonth == null ? '' : (k.instagram.deltaMonth > 0 ? '+' : '') + k.instagram.deltaMonth + ' in 30 gg', onclick: () => open('stats'), sub: k.instagram.clicks30 ? num(k.instagram.clicks30) + ' clic al sito (30 gg)' : '' }),
      card(num(k.installs.current), 'Prime aperture dell\'app', { delta: pct(k.installs.delta), onclick: () => open('stats'), sub: 'store: ' + num(k.storeDownloads.appstore + k.storeDownloads.playstore) + ' download' })
    ]),
    el('div', { class: 'grid2' }, [
      lineChart(o.series.signups, { title: 'Nuovi account al giorno', color: 'gold' }),
      lineChart(o.series.visitors, { title: 'Visitatori del sito al giorno', color: 'blue' }),
      lineChart(o.series.followers, { title: 'Follower Instagram', color: 'green' }),
      lineChart(o.series.views, { title: 'Pagine viste del sito', color: 'gold' })
    ]),
    el('p', { class: 'muted' }, 'Aggiornato il ' + new Date(o.at).toLocaleString('it-IT') + '. Visite e aperture dell\'app sono contate senza cookie e senza identificare nessuno.')
  );
  view(sections);
}
