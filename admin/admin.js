// Nurvan Admin: login and the pages' router. Talks only to /api/admin/*, with
// the session cookie (HttpOnly) and the secret link in a header. No code of the
// users' app. Data enters the DOM only as text.
import { $, api, el, msg, view, dateTime, setUnauthorizedHandler } from './ui.js';

let currentTab = 'overview';
let session = null;

const PAGES = {
  overview: () => import('./page-overview.js').then((m) => m.pageOverview),
  profiles: () => import('./page-profiles.js').then((m) => m.pageProfiles),
  economy: () => import('./page-economy.js').then((m) => m.pageEconomy),
  stats: () => import('./page-stats.js').then((m) => m.pageStats),
  coaches: () => import('./page-legacy.js').then((m) => m.pageCoaches),
  operations: () => import('./page-ops.js').then((m) => m.pageOperations),
  catalog: () => import('./page-legacy.js').then((m) => m.pageCatalog),
  settings: () => import('./page-settings.js').then((m) => m.pageSettings)
};

function showLogin(text) {
  session = null;
  $('app').hidden = true;
  $('login').hidden = false;
  $('login-email').hidden = false;
  $('login-code').hidden = true;
  $('login-msg').replaceChildren(text ? msg('warn', text) : '');
}
setUnauthorizedHandler(() => showLogin('Sessione scaduta: accedi di nuovo.'));

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
  const wanted = (location.hash || '').replace('#', '');
  openTab(PAGES[wanted] ? wanted : currentTab);
}

document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => openTab(b.dataset.tab)));
window.addEventListener('hashchange', () => { const t = (location.hash || '').replace('#', ''); if (session && PAGES[t] && t !== currentTab) openTab(t); });

// Other pages ask for a tab (a card on the overview opens the page it is about).
window.addEventListener('nurvan-admin-open', (ev) => { if (PAGES[ev.detail]) openTab(ev.detail); });

export async function openTab(tab, arg) {
  currentTab = tab;
  history.replaceState(null, '', '#' + tab);
  document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'));
  view(el('p', { class: 'muted' }, 'Caricamento…'));
  try {
    const page = await PAGES[tab]();
    await page(arg);
  } catch (e) {
    if (e.status !== 401) view(msg('bad', e.message || String(e)));
  }
}

(async function start() {
  try {
    const s = await api('/api/admin/session', { allow401: true });
    enter(s);
  } catch (_) {
    showLogin('');
  }
})();
