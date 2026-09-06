(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  const state = { items: [], q: '' };

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }

  function openItem(item) {
    const href = item.href || {};
    if (href.view === 'coachChat' && href.clientId && typeof openCoachClientChat === 'function') {
      openCoachClientChat(href.clientId);
      return;
    }
    if (href.view === 'coachCheckIns') {
      CoachOS.navigate('coachCheckIns');
      return;
    }
    if (href.clientId && typeof openCoachClient === 'function') {
      openCoachClient(href.clientId);
      return;
    }
    CoachOS.navigate('coachHub');
  }

  CoachOS.views.coachInbox = async function (container) {
    container.innerHTML = '<div class="coach-os-skeleton">Loading inbox…</div>';
    const payload = await window.practiceFetch(
      '/api/coach/inbox-feed?q=' + encodeURIComponent(state.q || ''),
      { headers: window.practiceHeaders() }
    );
    state.items = payload.items || [];
    container.innerHTML =
      '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Operational</div>' +
      '<h1 class="coach-os-title">Inbox</h1>' +
      '<p class="coach-os-subtitle">Messaggi, check-in, richieste e attention. La chat 1:1 resta il thread.</p></div></div>' +
      '<input value="' + escText(state.q) + '" placeholder="Cerca messaggi o clienti" onchange="CoachOS.searchInbox(this.value)" ' +
      'style="width:100%;min-height:44px;background:#0b0b0b;border:1px solid var(--co-border);border-radius:12px;color:#fff;padding:0 12px;">' +
      (state.items.length
        ? '<div class="coach-os-list" style="margin-top:12px;">' + state.items.map(function (item, index) {
          return '<button class="coach-os-row" onclick="CoachOS.openInboxItem(' + index + ')">' +
            '<span class="coach-os-status-dot ' + (item.unread ? 'high' : 'low') + '"></span>' +
            '<span class="coach-os-row-main"><strong>' + escText(item.title) + '</strong><span>' +
            escText(item.kind) + (item.preview ? ' · ' + escText(item.preview) : '') + '</span></span></button>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">Inbox vuota. I thread E2E restano in Chat.</div>') +
      '</div>';
  };

  CoachOS.searchInbox = function (value) {
    state.q = value;
    CoachOS.navigate('coachInbox');
  };
  CoachOS.openInboxItem = function (index) {
    openItem(state.items[index] || {});
  };
})();
