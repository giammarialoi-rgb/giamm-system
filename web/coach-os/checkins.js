(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  const state = { status: 'to_review', rows: [], selected: null };

  function escText(value) {
    if (typeof esc === 'function') return esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }

  function formatDate(value) {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return '—';
    }
  }

  function rowHtml(row, index) {
    const date = row.receivedAt || row.requestedAt || row.createdAt;
    return '<button type="button" class="coach-os-row" onclick="CoachOS.openCheckIn(' + index + ')">' +
      '<span class="coach-os-status-dot ' + (row.status === 'received' ? 'high' : (row.status === 'requested' ? 'medium' : 'low')) + '"></span>' +
      '<span class="coach-os-row-main"><strong>' + escText(row.clientName || 'Client') + '</strong>' +
      '<span>' + escText(row.status.replace(/_/g, ' ')) + ' · ' + escText(formatDate(date)) +
      (row.weight ? ' · ' + Number(row.weight) + ' kg' : '') + '</span></span><span>›</span></button>';
  }

  function draw(container) {
    const tabs = [
      ['requested', 'Requested'],
      ['received', 'Received'],
      ['to_review', 'To review'],
      ['reviewed', 'Reviewed']
    ];
    container.innerHTML =
      '<div class="coach-os-page">' +
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Coach OS</div>' +
      '<h1 class="coach-os-title">Check-ins</h1><p class="coach-os-subtitle">Review, respond e crea il prossimo passo.</p></div>' +
      '<button class="btn btn-primary" style="min-height:44px;" onclick="CoachOS.requestCheckInPicker()">REQUEST</button></div>' +
      '<div style="display:flex;gap:7px;overflow:auto;padding-bottom:4px;margin-bottom:12px;">' +
      tabs.map(function (tab) {
        return '<button class="pill-tab' + (state.status === tab[0] ? ' active' : '') +
          '" style="white-space:nowrap;" onclick="CoachOS.setCheckInStatus(\'' + tab[0] + '\')">' + tab[1] + '</button>';
      }).join('') + '</div>' +
      (state.rows.length
        ? '<div class="coach-os-list">' + state.rows.map(rowHtml).join('') + '</div>'
        : '<div class="coach-os-empty">Nessun check-in in questa coda.</div>') +
      '</div>';
  }

  async function renderCheckIns(container) {
    container.innerHTML = '<div class="coach-os-page"><div class="coach-os-skeleton">Loading check-ins…</div></div>';
    try {
      const payload = await practiceFetch('/api/coach/check-ins?status=' + encodeURIComponent(state.status), {
        method: 'GET',
        headers: practiceHeaders(false)
      }, 15000);
      state.rows = payload && payload.checkIns || [];
      draw(container);
    } catch (error) {
      container.innerHTML = '<div class="coach-os-page"><div class="coach-os-error">' +
        escText(error && error.message || 'Check-ins unavailable') + '</div></div>';
    }
  }

  async function openCheckIn(index) {
    const selected = state.rows[index];
    if (!selected) return;
    try {
      const payload = await practiceFetch('/api/coach/check-ins/' + encodeURIComponent(selected.id), {
        method: 'GET',
        headers: practiceHeaders(false)
      }, 15000);
      state.selected = payload.checkIn;
      drawDetail();
    } catch (error) {
      practiceToast((error && error.message) || 'Check-in non disponibile', 'danger');
    }
  }

  function signalRows(summary) {
    const signals = summary && summary.signals || [];
    if (!signals.length) return '<div class="coach-os-empty">Nessun segnale deterministico rilevato.</div>';
    return '<div class="coach-os-list">' + signals.map(function (signal) {
      return '<div class="coach-os-row"><span class="coach-os-status-dot ' + escText(signal.severity || 'low') +
        '"></span><span class="coach-os-row-main"><strong>' + escText(signal.title || signal.id) +
        '</strong><span>' + escText(signal.detail || '') + '</span></span></div>';
    }).join('') + '</div>';
  }

  function drawDetail() {
    const row = state.selected;
    if (!row) return;
    ensurePracticeOverlays();
    const panel = document.getElementById('cp-assign-panel');
    if (!panel) return;
    panel.innerHTML =
      '<div class="coach-os-card-kicker">Review & Respond</div><h2>' + escText(row.clientName || 'Client') + '</h2>' +
      '<div class="coach-os-grid-2" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-bottom:12px;">' +
      '<div class="coach-os-card" style="margin:0;"><div class="coach-os-card-kicker">Weight</div><div class="coach-os-card-title">' +
      (row.weight ? Number(row.weight) + ' kg' : '—') + '</div></div>' +
      '<div class="coach-os-card" style="margin:0;"><div class="coach-os-card-kicker">Received</div><div class="coach-os-card-title" style="font-size:12px;">' +
      escText(formatDate(row.receivedAt || row.requestedAt)) + '</div></div></div>' +
      '<div class="coach-os-card"><div class="coach-os-card-kicker">Athlete notes</div><div class="coach-os-muted" style="color:#ddd;margin-top:8px;">' +
      escText(row.notes || 'No notes') + '</div></div>' +
      '<div class="coach-os-card-kicker" style="margin:14px 0 8px;">Deterministic signals</div>' +
      signalRows(row.deterministicSummary) +
      (row.previous ? '<div class="coach-os-card" style="margin-top:12px;"><div class="coach-os-card-kicker">Previous check</div>' +
        '<div class="coach-os-muted" style="margin-top:8px;">' + escText(formatDate(row.previous.received_at)) +
        (row.previous.weight ? ' · ' + Number(row.previous.weight) + ' kg' : '') + '</div></div>' : '') +
      ((row.media || []).length ? '<div class="coach-os-card-kicker" style="margin:14px 0 8px;">Private media</div>' +
        '<div class="coach-os-quick-actions">' + row.media.map(function (media) {
          return '<button class="coach-os-action" onclick="CoachOS.openCheckInMedia(\'' + escText(media.id) + '\')">' +
            escText(media.kind || 'Media') + '<br><span class="coach-os-muted">' + Math.round(Number(media.byteSize || 0) / 1024) + ' KB</span></button>';
        }).join('') + '</div>' : '') +
      '<label style="display:block;margin-top:14px;font-size:10px;color:var(--co-muted);">COACH RESPONSE</label>' +
      '<textarea id="coach-checkin-response" rows="4" style="width:100%;margin-top:6px;" placeholder="Risposta operativa all’atleta…">' +
      escText(row.coachResponse || '') + '</textarea>' +
      '<button class="btn btn-primary" style="width:100%;margin-top:12px;" onclick="CoachOS.reviewCheckIn()">SAVE REVIEW & RESPOND</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:8px;" onclick="showOverlay(\'cp-assign\',false)">CLOSE</button>';
    showOverlay('cp-assign', true);
  }

  async function reviewCheckIn() {
    const row = state.selected;
    const input = document.getElementById('coach-checkin-response');
    const response = input && input.value.trim();
    if (!row || !response) {
      practiceToast('Scrivi una risposta al cliente', 'warning');
      return;
    }
    try {
      await practiceFetch('/api/coach/check-ins/' + encodeURIComponent(row.id) + '/review', {
        method: 'POST',
        headers: practiceHeaders(true),
        body: JSON.stringify({ response: response })
      }, 15000);
      showOverlay('cp-assign', false);
      practiceToast('Check-in revisionato', 'success');
      CoachOS.navigate('coachCheckIns');
    } catch (error) {
      practiceToast((error && error.message) || 'Review non salvata', 'danger');
    }
  }

  async function requestCheckInPicker() {
    try {
      let clients = store.__cpClientList || [];
      if (!clients.length) {
        const payload = await practiceFetch('/api/coach/clients?limit=100&filter=active', {
          method: 'GET',
          headers: practiceHeaders(false)
        }, 15000);
        clients = payload.clients || [];
        store.__cpClientList = clients;
      }
      ensurePracticeOverlays();
      const panel = document.getElementById('cp-assign-panel');
      panel.innerHTML = '<div class="coach-os-card-kicker">Request check-in</div><h2>Scegli il cliente</h2>' +
        '<div class="coach-os-list" style="max-height:52vh;overflow:auto;">' + clients.map(function (client) {
          return '<button class="coach-os-row" onclick="CoachOS.requestCheckIn(\'' + escText(client.id) + '\')">' +
            '<span class="coach-os-row-main"><strong>' + escText(client.displayName || client.username) +
            '</strong></span><span>›</span></button>';
        }).join('') + '</div>' +
        '<button class="btn btn-outline" style="width:100%;margin-top:12px;" onclick="showOverlay(\'cp-assign\',false)">CLOSE</button>';
      showOverlay('cp-assign', true);
    } catch (error) {
      practiceToast((error && error.message) || 'Clienti non disponibili', 'danger');
    }
  }

  async function requestCheckIn(clientId) {
    try {
      await practiceFetch('/api/coach/check-ins/request', {
        method: 'POST',
        headers: practiceHeaders(true),
        body: JSON.stringify({ clientId: clientId })
      }, 15000);
      showOverlay('cp-assign', false);
      practiceToast('Check-in richiesto', 'success');
      CoachOS.navigate('coachCheckIns');
    } catch (error) {
      practiceToast((error && error.message) || 'Richiesta non inviata', 'danger');
    }
  }

  async function openCheckInMedia(mediaId) {
    try {
      const access = await practiceFetch('/api/media/' + encodeURIComponent(mediaId) + '/access', {
        method: 'POST',
        headers: practiceHeaders(true),
        body: '{}'
      }, 10000);
      const response = await fetch(
        practiceApi(access.contentPath) + '?token=' + encodeURIComponent(access.token),
        { headers: practiceHeaders(false), cache: 'no-store' }
      );
      if (!response.ok) throw new Error('Media access denied');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(function () { URL.revokeObjectURL(url); }, 60_000);
    } catch (error) {
      practiceToast((error && error.message) || 'Media non disponibile', 'danger');
    }
  }

  async function submitClientCheckInToCoach(entry, front, back) {
    if (typeof isAthleteRole !== 'function' || !isAthleteRole()) return null;
    const media = [];
    if (front && /^data:image\//.test(front)) media.push({ kind: 'front', data: front });
    if (back && /^data:image\//.test(back)) media.push({ kind: 'back', data: back });
    const payload = await practiceFetch('/api/client/check-ins', {
      method: 'POST',
      headers: practiceHeaders(true),
      body: JSON.stringify({
        weight: entry && entry.weight,
        notes: entry && entry.notes || '',
        media: media
      })
    }, 30000);
    if (entry && payload && payload.checkIn) {
      entry.serverCheckInId = payload.checkIn.id;
      if (typeof persist === 'function') persist();
    }
    return payload;
  }

  CoachOS.setCheckInStatus = function (status) {
    state.status = status;
    CoachOS.navigate('coachCheckIns');
  };
  CoachOS.openCheckIn = openCheckIn;
  CoachOS.reviewCheckIn = reviewCheckIn;
  CoachOS.requestCheckInPicker = requestCheckInPicker;
  CoachOS.requestCheckIn = requestCheckIn;
  CoachOS.openCheckInMedia = openCheckInMedia;
  CoachOS.submitClientCheckInToCoach = submitClientCheckInToCoach;
  window.submitClientCheckInToCoach = submitClientCheckInToCoach;
  CoachOS.registerView('coachCheckIns', renderCheckIns);
})();
