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

  function drawInbox(container) {
    container.innerHTML =
      '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Operational</div>' +
      '<h1 class="coach-os-title">Inbox</h1>' +
      '<p class="coach-os-subtitle">Messaggi, check-in, richieste e attention. La chat 1:1 resta il thread.</p></div></div>' +
      '<input value="' + escText(state.q) + '" placeholder="Cerca messaggi o clienti" onchange="CoachOS.searchInbox(this.value)" ' +
      'style="width:100%;min-height:44px;background:#0b0b0b;border:1px solid var(--co-border);border-radius:12px;color:#fff;padding:0 12px;">' +
      '<div class="coach-os-quick-actions" style="margin-top:10px;">' +
      '<button class="coach-os-action" onclick="CoachOS.previewBroadcast()">PREVIEW BROADCAST</button></div>' +
      (state.items.length
        ? '<div class="coach-os-list" style="margin-top:12px;">' + state.items.map(function (item, index) {
          return '<div class="coach-os-row"><button class="coach-os-row-main" style="border:0;background:transparent;text-align:left;" onclick="CoachOS.openInboxItem(' + index + ')">' +
            '<strong>' + escText(item.title) + (item.pinned ? ' · PIN' : '') + '</strong><span>' +
            escText(item.kind) + (item.preview ? ' · ' + escText(item.preview) : '') +
            (item.reaction ? ' · ' + escText(item.reaction) : '') + '</span></button>' +
            (item.kind === 'message'
              ? '<button class="btn btn-outline" style="font-size:9px;" onclick="CoachOS.pinInboxItem(\'' + escText(item.id) + '\',' + (item.pinned ? 'false' : 'true') + ')">' +
                (item.pinned ? 'UNPIN' : 'PIN') + '</button>'
              : '') +
            '</div>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">Inbox vuota. I thread E2E restano in Chat.</div>') +
      '</div>';
  }

  CoachOS.views.coachInbox = async function (container) {
    container.innerHTML = '<div class="coach-os-skeleton">Loading inbox…</div>';
    try {
      const payload = await window.practiceFetch(
        '/api/coach/inbox-feed?q=' + encodeURIComponent(state.q || ''),
        { headers: window.practiceHeaders() }
      );
      state.items = payload.items || [];
    } catch (_) {
      try {
        const legacy = await window.practiceFetch('/api/coach/inbox', { headers: window.practiceHeaders() });
        const events = (legacy && legacy.events) || [];
        const clients = (legacy && legacy.clients) || [];
        state.items = events.map(function (event) {
          return {
            id: String(event.id),
            kind: event.kind || 'event',
            title: event.display_name || event.displayName || event.kind,
            preview: (event.payload && (event.payload.preview || event.payload.body)) || '',
            clientId: event.client_id || event.clientId,
            href: { view: event.kind === 'message' ? 'coachChat' : 'coachClient', clientId: event.client_id || event.clientId }
          };
        }).concat(clients.map(function (client) {
          return {
            id: 'client-' + client.id,
            kind: 'attention',
            title: client.displayName,
            preview: client.unreadCount ? (client.unreadCount + ' unread') : 'Richiede attenzione',
            href: { view: 'coachChat', clientId: client.id }
          };
        }));
      } catch (__) {
        state.items = [];
      }
    }
    drawInbox(container);
  };

  CoachOS.searchInbox = function (value) {
    state.q = value;
    CoachOS.navigate('coachInbox');
  };
  CoachOS.openInboxItem = function (index) {
    openItem(state.items[index] || {});
  };

  CoachOS.pinInboxItem = async function (id, pinned) {
    await window.practiceFetch('/api/coach/messages/' + encodeURIComponent(id) + '/pin', {
      method: 'POST',
      headers: window.practiceHeaders(true),
      body: JSON.stringify({ pinned: !!pinned })
    });
    CoachOS.navigate('coachInbox');
  };

  CoachOS.previewBroadcast = async function () {
    const raw = window.prompt('Client IDs da includere nella preview (virgola)', '');
    if (raw == null) return;
    const clientIds = String(raw).split(',').map(function (id) { return id.trim(); }).filter(Boolean);
    const payload = await window.practiceFetch('/api/coach/broadcast/preview', {
      method: 'POST',
      headers: window.practiceHeaders(true),
      body: JSON.stringify({ clientIds: clientIds })
    });
    const preview = payload.preview || {};
    window.alert('Preview broadcast: ' + (preview.targetCount || 0) + ' target. Nessun messaggio inviato.');
  };
})();
