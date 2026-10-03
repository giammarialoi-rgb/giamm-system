// Statistiche: the site, the app, Instagram and the stores. Visits are counted
// without cookies and without identifying anyone; Instagram and the stores
// come from their own services when connected, or are typed in by hand.
import { api, el, view, loading, table, badge, toast, field, msg, date, dateTime, ago, num, pct, card, lineChart, shareBars, tabs, daysPicker } from './ui.js';

let tab = 'site';
let days = 30;

export async function pageStats(which) {
  if (typeof which === 'string') tab = which;
  loading();
  const bar = tabs([['site', 'Sito'], ['app', 'App'], ['instagram', 'Instagram'], ['stores', 'App Store e Google Play']], tab, (t) => pageStats(t));
  const body = await ({ site: siteTab, app: appTab, instagram: instagramTab, stores: storesTab }[tab] || siteTab)();
  view([el('div', { class: 'row', style: 'justify-content:space-between' }, [el('h2', null, 'Statistiche'), daysPicker(days, (d) => { days = d; pageStats(); })]), bar].concat(body));
}

const sum = (list, from = 0) => list.slice(from).reduce((n, x) => n + x.value, 0);
function delta(cur, prev) { if (!prev) return ''; return pct(Math.round(((cur - prev) / prev) * 1000) / 10); }
const SOURCE_NAMES = { diretto: 'Diretto (nessun referrer)', instagram: 'Instagram', google: 'Google', ricerca: 'Altri motori di ricerca', facebook: 'Facebook', x: 'X / Twitter', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok', whatsapp: 'WhatsApp', 'assistenti-ai': 'Assistenti AI' };
const sourceName = (s) => SOURCE_NAMES[s] || (s.startsWith('link:') ? 'Link «' + s.slice(5) + '»' : s.startsWith('altro:') ? s.slice(6) : s);

/* ------------------------------ site ------------------------------ */

async function siteTab() {
  const { stats: s } = await api('/api/admin/stats/site?days=' + days);
  const blog = s.pages.filter((p) => p.path.startsWith('/blog/') || /^\/[a-z]{2}\/blog\//.test(p.path));
  const mobile = (s.devices.find((d) => d.device === 'mobile') || { hits: 0 }).hits;
  const desktop = (s.devices.find((d) => d.device === 'desktop') || { hits: 0 }).hits;
  return [
    el('div', { class: 'cards' }, [
      card(num(s.visitors.current), 'Visitatori', { delta: delta(s.visitors.current, s.visitors.previous), sub: 'periodo prima: ' + num(s.visitors.previous) }),
      card(num(s.views.current), 'Pagine viste', { delta: delta(s.views.current, s.views.previous), sub: 'periodo prima: ' + num(s.views.previous) }),
      card(s.visitors.current ? (s.views.current / s.visitors.current).toFixed(1).replace('.', ',') : '—', 'Pagine per visitatore'),
      card(mobile + desktop ? Math.round((mobile / (mobile + desktop)) * 100) + '%' : '—', 'Da telefono')
    ]),
    el('div', { class: 'grid2' }, [lineChart(s.visitors.series, { title: 'Visitatori al giorno', color: 'blue' }), lineChart(s.views.series, { title: 'Pagine viste al giorno', color: 'gold' })]),
    el('div', { class: 'grid2' }, [
      el('div', null, [el('h3', null, 'Da dove arrivano'), shareBars(s.sources.map((x) => ({ label: sourceName(x.source), value: x.hits })))]),
      el('div', null, [el('h3', null, 'Pagine più viste'), shareBars(s.pages.slice(0, 12).map((x) => ({ label: x.path, value: x.hits })))])
    ]),
    blog.length ? el('div', null, [el('h3', null, 'Articoli del blog'), shareBars(blog.slice(0, 10).map((x) => ({ label: x.path.replace(/^.*\/blog\//, ''), value: x.hits })))]) : null,
    utmBuilder(),
    el('p', { class: 'muted' }, s.note + ' I robot dei motori di ricerca non sono contati.')
  ];
}

function utmBuilder() {
  const base = el('input', { type: 'text', value: 'https://nurvan.app/', size: 28 });
  const src = el('input', { type: 'text', value: 'instagram', size: 14 });
  const camp = el('input', { type: 'text', placeholder: 'campagna (facoltativa)', size: 18 });
  const out = el('input', { type: 'text', readonly: true, size: 50 });
  const make = () => {
    try {
      const u = new URL(base.value);
      u.searchParams.set('utm_source', src.value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, ''));
      if (camp.value.trim()) u.searchParams.set('utm_campaign', camp.value.trim());
      out.value = u.toString();
    } catch (_) { out.value = 'Indirizzo non valido'; }
  };
  [base, src, camp].forEach((i) => i.addEventListener('input', make));
  make();
  return el('div', { class: 'panel' }, [
    el('h3', { style: 'margin-top:0' }, 'Un link che si riconosce'),
    el('p', { class: 'muted' }, 'Metti questo indirizzo nella bio di Instagram, in una storia o in una newsletter: le visite che portano compaiono qui con il nome che scegli.'),
    el('div', { class: 'form' }, [field('Pagina', base), field('Provenienza', src), field('Campagna', camp)]),
    el('div', { class: 'row', style: 'margin-top:8px' }, [out, el('button', { class: 'btn', type: 'button', onclick: () => { navigator.clipboard.writeText(out.value).then(() => toast('ok', 'Copiato.')).catch(() => toast('bad', 'Non riesco a copiare.')); } }, 'Copia')])
  ]);
}

/* ------------------------------ app ------------------------------ */

const PLAT = { web: 'Web app nel browser', pwa: 'Web app installata', ios: 'App iPhone', android: 'App Android' };

async function appTab() {
  const { stats: s } = await api('/api/admin/stats/app?days=' + days);
  const plats = Object.entries(s.platforms);
  const totalInstalls = plats.reduce((n, [, p]) => n + p.installs.current, 0);
  const totalToday = plats.reduce((n, [, p]) => n + p.active.today, 0);
  const merge = (key) => plats[0][1][key].series.map((x, i) => ({ day: x.day, value: plats.reduce((n, [, p]) => n + p[key].series[i].value, 0) }));
  return [
    el('div', { class: 'cards' }, [
      card(num(totalToday), 'App aperta oggi', { sub: 'dispositivi diversi' }),
      card(num(totalInstalls), 'Prime aperture nel periodo', { sub: 'nuove installazioni' })
    ].concat(plats.map(([id, p]) => card(num(p.active.today), PLAT[id], { sub: num(p.installs.current) + ' prime aperture · ' + num(p.active.current) + ' aperture-giorno', delta: delta(p.active.current, p.active.previous) })))),
    el('div', { class: 'grid2' }, [lineChart(merge('active'), { title: 'Dispositivi che aprono l\'app, al giorno', color: 'blue' }), lineChart(merge('installs'), { title: 'Prime aperture al giorno', color: 'green' })]),
    el('h3', null, 'Per piattaforma'),
    table(['Piattaforma', ['Oggi', 'num'], ['Aperture-giorno nel periodo', 'num'], ['Prime aperture', 'num'], ['Periodo prima', 'num']], plats.map(([id, p]) => el('tr', null, [el('td', null, PLAT[id]), el('td', { class: 'num' }, num(p.active.today)), el('td', { class: 'num' }, num(p.active.current)), el('td', { class: 'num' }, num(p.installs.current)), el('td', { class: 'num' }, num(p.active.previous) + ' / ' + num(p.installs.previous))]))),
    el('p', { class: 'muted' }, 'Ogni giorno l\'app dice da quale piattaforma gira e, una sola volta, che è stata aperta per la prima volta. Nessun identificativo, nessun account: «dispositivi diversi» è un\'impronta giornaliera, dimenticata dopo due giorni. Le prime aperture non sono i download degli store (quelli stanno nell\'ultima scheda): sono chi l\'ha davvero aperta.')
  ];
}

/* ------------------------------ Instagram and stores ------------------------------ */

function manualForm(source, metrics, onDone, labels = {}) {
  const metric = el('select', null, metrics.map((m) => el('option', { value: m }, labels[m] || m)));
  const day = el('input', { type: 'date', value: new Date().toISOString().slice(0, 10) });
  const value = el('input', { type: 'text', size: 10, placeholder: 'valore' });
  return el('div', { class: 'panel' }, [
    el('h3', { style: 'margin-top:0' }, 'Inserisci un numero a mano'),
    el('p', { class: 'muted' }, 'Per i giorni in cui non hai (ancora) il collegamento automatico. Un numero scritto a mano non viene mai sovrascritto dal collegamento.'),
    el('div', { class: 'form' }, [field('Cosa', metric), field('Giorno', day), field('Valore', value), el('button', { class: 'btn primary', type: 'button', onclick: async () => {
      try { await api('/api/admin/stats/metrics', { method: 'POST', body: { source, metric: metric.value, day: day.value, value: value.value } }); toast('ok', 'Salvato.'); onDone(); } catch (e) { toast('bad', e.message); }
    } }, 'Salva')])
  ]);
}

function recentValues(source, series, onDone) {
  const rows = [];
  for (const [metric, list] of Object.entries(series)) for (const v of list.slice(-8)) rows.push({ metric, ...v });
  rows.sort((a, b) => (a.day < b.day ? 1 : -1));
  return table(['Giorno', 'Cosa', ['Valore', 'num'], 'Origine', ''], rows.slice(0, 30).map((r) => el('tr', null, [
    el('td', null, date(r.day)), el('td', null, r.metric), el('td', { class: 'num' }, num(r.value)), el('td', null, r.origin === 'api' ? badge('collegamento', 'blue') : badge('a mano')),
    el('td', null, r.origin === 'manual' ? el('button', { class: 'btn small danger', type: 'button', onclick: async () => { await api('/api/admin/stats/metrics', { method: 'DELETE', body: { source, metric: r.metric, day: r.day } }); onDone(); } }, 'Togli') : '')
  ])), { empty: 'Ancora nessun numero.' });
}

function integrationBox(i, hint) {
  const runBtn = i.configured ? el('button', { class: 'btn', type: 'button', onclick: async (ev) => {
    ev.target.disabled = true; ev.target.textContent = 'Aggiorno…';
    try { await api('/api/admin/integrations/' + i.name + '/run', { method: 'POST' }); toast('ok', i.label + ' aggiornato.'); pageStats(); } catch (e) { toast('bad', e.message); pageStats(); }
  } }, 'Aggiorna ora') : null;
  return el('div', { class: 'panel' }, [
    el('h3', { style: 'margin-top:0' }, 'Collegamento a ' + i.label + ' ', ),
    i.configured
      ? el('div', null, [badge('attivo', 'ok'), el('span', { class: 'muted' }, ' ultimo aggiornamento ' + (i.lastOkAt ? ago(i.lastOkAt) : 'mai')), i.lastError ? msg('bad', i.lastError) : null, el('div', { class: 'row', style: 'margin-top:8px' }, runBtn)])
      : el('div', null, [badge('non collegato', 'warn'), el('p', { class: 'muted' }, 'Per collegarlo servono queste variabili sul server (Render → Environment): ' + i.missing.join(', ') + '.'), hint ? el('p', { class: 'muted' }, hint) : null])
  ]);
}

async function instagramTab() {
  const [{ series }, { integrations }] = await Promise.all([api('/api/admin/stats/metrics?source=instagram&days=' + Math.max(days, 30)), api('/api/admin/integrations')]);
  const ig = integrations.find((i) => i.name === 'instagram');
  const f = series.followers || [];
  const last = f[f.length - 1];
  const first = f.find((x) => x.day >= new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)) || f[0];
  const within = (m, n) => (series[m] || []).filter((x) => x.day >= new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)).reduce((s, x) => s + x.value, 0);
  const media = (ig.info && ig.info.recentMedia) || [];
  return [
    el('div', { class: 'cards' }, [
      card(last ? num(last.value) : '—', 'Follower', { sub: last ? 'al ' + date(last.day) : 'nessun dato', delta: last && first && last !== first ? (last.value - first.value >= 0 ? '+' : '') + (last.value - first.value) + ' nel periodo' : '' }),
      card(num(within('reach', days)), 'Persone raggiunte', { sub: 'somma dei giorni nel periodo' }),
      card(num(within('profile_views', days)), 'Visite al profilo'),
      card(num(within('website_clicks', days)), 'Clic al sito', { sub: 'dal link in bio' }),
      card(num(within('accounts_engaged', days)), 'Account che interagiscono')
    ]),
    el('div', { class: 'grid2' }, [lineChart(f.map((x) => ({ day: x.day, value: x.value })), { title: 'Follower', color: 'green' }), lineChart((series.reach || []).map((x) => ({ day: x.day, value: x.value })), { title: 'Persone raggiunte al giorno', color: 'blue' })]),
    media.length ? el('div', null, [el('h3', null, 'Ultimi post'), table(['Quando', 'Tipo', 'Mi piace', 'Commenti', 'Testo'], media.map((m) => el('tr', null, [el('td', null, date(m.at)), el('td', null, m.type), el('td', { class: 'num' }, num(m.likes)), el('td', { class: 'num' }, num(m.comments)), el('td', { class: 'wrap' }, m.caption)])))]) : null,
    integrationBox(ig, 'L\'account deve essere Business o Creator. Token: Meta for Developers → la tua app → Instagram → Genera token. Dura 60 giorni e qui si rinnova da solo ogni mese.'),
    manualForm('instagram', ['followers', 'reach', 'profile_views', 'website_clicks', 'accounts_engaged', 'likes', 'comments', 'shares', 'saves', 'follows', 'media_count'], () => pageStats('instagram'), { followers: 'Follower', reach: 'Persone raggiunte (giorno)', profile_views: 'Visite al profilo (giorno)', website_clicks: 'Clic al sito (giorno)', accounts_engaged: 'Account che interagiscono', likes: 'Mi piace', comments: 'Commenti', shares: 'Condivisioni', saves: 'Salvataggi', follows: 'Account seguiti', media_count: 'Post pubblicati' }),
    recentValues('instagram', series, () => pageStats('instagram'))
  ];
}

async function storesTab() {
  const [a, g, { integrations }] = await Promise.all([api('/api/admin/stats/metrics?source=appstore&days=' + Math.max(days, 30)), api('/api/admin/stats/metrics?source=playstore&days=' + Math.max(days, 30)), api('/api/admin/integrations')]);
  const within = (series, m, n) => (series[m] || []).filter((x) => x.day >= new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)).reduce((s, x) => s + x.value, 0);
  const asI = integrations.find((i) => i.name === 'appstore');
  const gpI = integrations.find((i) => i.name === 'playstore');
  const both = (a.series.downloads || []).map((x) => ({ day: x.day, value: x.value }));
  return [
    el('div', { class: 'cards' }, [
      card(num(within(a.series, 'downloads', days)), 'Download App Store', { sub: 'ultimi ' + days + ' giorni' }),
      card(num(within(g.series, 'downloads', days)), 'Installazioni Google Play', { sub: 'ultimi ' + days + ' giorni' }),
      card(num(within(a.series, 'downloads', days) + within(g.series, 'downloads', days)), 'Totale dagli store'),
      card(num(within(g.series, 'uninstalls', days)), 'Disinstallazioni Play')
    ]),
    el('div', { class: 'grid2' }, [lineChart(both, { title: 'Download App Store al giorno', color: 'blue' }), lineChart((g.series.downloads || []).map((x) => ({ day: x.day, value: x.value })), { title: 'Installazioni Google Play al giorno', color: 'green' })]),
    integrationBox(asI, 'Chiave in App Store Connect → Utenti e accesso → Integrazioni, con accesso a «Vendite e rapporti». ASC_PRIVATE_KEY è il testo del file .p8; ASC_VENDOR_NUMBER lo trovi in Vendite e andamenti.'),
    integrationBox(gpI, 'Play Console → Impostazioni → Accesso API: collega un account di servizio con permesso di vedere i rapporti. PLAY_BUCKET è l\'indirizzo «gs://pubsite_prod_rev_…» che trovi in Scarica rapporti (senza gs://).'),
    manualForm('appstore', ['downloads', 'updates', 'proceeds', 'rating', 'ratings_count'], () => pageStats('stores'), { downloads: 'Download', updates: 'Aggiornamenti', proceeds: 'Incasso (€)', rating: 'Voto medio', ratings_count: 'Numero di voti' }),
    manualForm('playstore', ['downloads', 'uninstalls', 'active_devices', 'rating', 'ratings_count', 'proceeds'], () => pageStats('stores'), { downloads: 'Installazioni', uninstalls: 'Disinstallazioni', active_devices: 'Dispositivi attivi', rating: 'Voto medio', ratings_count: 'Numero di voti', proceeds: 'Incasso (€)' }),
    el('h3', null, 'App Store · ultimi valori'), recentValues('appstore', a.series, () => pageStats('stores')),
    el('h3', null, 'Google Play · ultimi valori'), recentValues('playstore', g.series, () => pageStats('stores')),
    el('p', { class: 'muted' }, 'Apple pubblica i dati di un giorno con uno o due giorni di ritardo. Gli incassi dell\'App Store in euro entrano da soli nella Contabilità.')
  ];
}
