(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  const state = {
    query: '',
    filter: 'all',
    sort: 'name',
    savedViewId: '',
    clients: [],
    views: [],
    total: 0,
    nextCursor: null,
    timer: null
  };

  function escText(value) {
    if (typeof esc === 'function') return esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }

  function clientStatus(client) {
    const now = Date.now();
    if (!client.paid || (client.nextDueAt && new Date(client.nextDueAt).getTime() < now)) {
      return { id: 'payment_due', label: 'Payment due', severity: 'high' };
    }
    if (client.hasPendingChange || client.hasPendingUnlock || client.leaveRequested || Number(client.unreadCount || 0) > 0) {
      return { id: 'awaiting_coach', label: 'Awaiting coach', severity: 'high' };
    }
    if (client.lastWorkoutAt && new Date(client.lastWorkoutAt).getTime() < now - 7 * 86400000) {
      return { id: 'at_risk', label: 'At risk', severity: 'medium' };
    }
    return { id: 'on_track', label: 'On track', severity: 'low' };
  }

  function initials(name) {
    return String(name || 'C').split(/\s+/).slice(0, 2).map(function (part) {
      return part.charAt(0).toUpperCase();
    }).join('');
  }

  function relativeDate(value) {
    if (!value) return 'No workout';
    const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
    if (days === 0) return 'Workout today';
    if (days === 1) return 'Workout yesterday';
    return 'Workout ' + days + 'd ago';
  }

  function clientCard(client) {
    const status = clientStatus(client);
    const name = client.displayName || client.username || 'Client';
    const avatar = client.photo
      ? '<img src="' + escText(client.photo) + '" alt="" style="width:44px;height:44px;border-radius:14px;object-fit:cover;">'
      : '<span style="width:44px;height:44px;border-radius:14px;background:#222;display:flex;align-items:center;justify-content:center;color:var(--co-accent);font-weight:900;">' + escText(initials(name)) + '</span>';
    const badges = [];
    if (client.unreadCount) badges.push(client.unreadCount + ' unread');
    if (client.workoutLive) badges.push('Live workout');
    return '<button type="button" class="coach-os-row" style="min-height:82px;" onclick="openCoachClient(\'' + escText(client.id) + '\')">' +
      avatar +
      '<span class="coach-os-row-main"><strong>' + escText(name) + '</strong>' +
      '<span>' + escText(status.label) + ' · ' + escText(relativeDate(client.lastWorkoutAt)) +
      (badges.length ? ' · ' + escText(badges.join(' · ')) : '') + '</span></span>' +
      '<span class="coach-os-status-dot ' + status.severity + '"></span><span aria-hidden="true">›</span></button>';
  }

  function queryString(cursor) {
    const params = new URLSearchParams();
    params.set('limit', '40');
    if (state.query) params.set('q', state.query);
    if (state.filter && state.filter !== 'all') params.set('filter', state.filter);
    if (state.sort) params.set('sort', state.sort);
    if (state.savedViewId) params.set('savedViewId', state.savedViewId);
    if (cursor) params.set('cursor', cursor);
    return params.toString();
  }

  async function loadClients(container, append) {
    try {
      const payload = await practiceFetch('/api/coach/clients?' + queryString(append ? state.nextCursor : ''), {
        method: 'GET',
        headers: practiceHeaders(false)
      }, 15000);
      if (!payload || !payload.ok) throw new Error(payload && payload.error || 'Clients unavailable');
      state.clients = append ? state.clients.concat(payload.clients || []) : (payload.clients || []);
      state.total = Number(payload.total || state.clients.length);
      state.nextCursor = payload.nextCursor || null;
      store.__cpClientList = state.clients.slice();
      drawClients(container);
      applyClientChrome();
    } catch (error) {
      container.innerHTML =
        '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Coach OS</div>' +
        '<h1 class="coach-os-title">Clients</h1></div></div><div class="coach-os-error">' +
        escText(error && error.message || 'Clients unavailable') +
        '<br><button class="btn btn-outline" style="margin-top:12px;" onclick="CoachOS.navigate(\'coachHub\')">RETRY</button></div></div>';
    }
  }

  async function loadViews() {
    try {
      const payload = await practiceFetch('/api/coach/saved-views', {
        method: 'GET',
        headers: practiceHeaders(false)
      }, 10000);
      state.views = payload && payload.views || [];
    } catch (_) {
      state.views = [
        { id: 'system:at-risk', name: 'At Risk' },
        { id: 'system:no-workout-7d', name: 'No Workout 7d' },
        { id: 'system:check-ins', name: 'Check-ins' },
        { id: 'system:payments', name: 'Payments' },
        { id: 'system:new-clients', name: 'New Clients' }
      ];
    }
  }

  function viewChips() {
    const all = [{ id: '', name: 'All clients' }].concat(state.views || []);
    return '<div style="display:flex;gap:7px;overflow:auto;padding-bottom:4px;margin-bottom:12px;">' +
      all.map(function (view) {
        const active = String(state.savedViewId) === String(view.id);
        return '<button type="button" class="pill-tab' + (active ? ' active' : '') +
          '" style="white-space:nowrap;" onclick="CoachOS.selectSavedView(\'' + escText(view.id) + '\')">' +
          escText(view.name) + '</button>';
      }).join('') + '</div>';
  }

  function drawClients(container) {
    container.innerHTML =
      '<div class="coach-os-page">' +
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Portfolio</div>' +
      '<h1 class="coach-os-title">Clients</h1><p class="coach-os-subtitle">' + state.total +
      ' clienti · trova subito chi richiede attenzione.</p></div>' +
      '<button class="btn btn-primary" style="min-height:44px;" onclick="openAddClientWizard()">ADD CLIENT</button></div>' +
      '<div class="coach-os-card" style="padding:12px;">' +
      '<input type="search" value="' + escText(state.query) + '" placeholder="Search clients…" aria-label="Search clients" ' +
      'oninput="CoachOS.searchClients(this.value)" style="width:100%;min-height:44px;background:#0b0b0b;border:1px solid var(--co-border);border-radius:12px;color:#fff;padding:0 12px;">' +
      '</div>' +
      viewChips() +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
      '<select aria-label="Client filter" onchange="CoachOS.setClientFilter(this.value)" style="width:auto;min-height:40px;">' +
      ['all', 'active', 'attention', 'inactive', 'unread', 'checkin', 'payment', 'program', 'nutrition', 'injury'].map(function (filter) {
        return '<option value="' + filter + '"' + (state.filter === filter ? ' selected' : '') + '>' +
          filter.replace(/^\w/, function (c) { return c.toUpperCase(); }) + '</option>';
      }).join('') + '</select>' +
      '<button type="button" class="btn btn-outline" style="font-size:9px;" onclick="CoachOS.saveCurrentClientView()">SAVE VIEW</button></div>' +
      (state.clients.length
        ? '<div class="coach-os-list">' + state.clients.map(clientCard).join('') + '</div>'
        : '<div class="coach-os-empty">Nessun cliente per questa vista.</div>') +
      (state.nextCursor
        ? '<button class="btn btn-outline" style="width:100%;margin-top:12px;" onclick="CoachOS.loadMoreClients()">LOAD MORE</button>'
        : '') +
      '<div style="height:28px;"></div></div>';
  }

  async function renderClients(container) {
    store.coachSessionActive = true;
    store.__coachOsClientLegacy = false;
    container.innerHTML =
      '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Portfolio</div>' +
      '<h1 class="coach-os-title">Clients</h1></div></div><div class="coach-os-skeleton">Loading clients…</div></div>';
    await loadViews();
    await loadClients(container, false);
  }

  function snapshotMetric(label, value, hint) {
    return '<div class="coach-os-card" style="margin:0;padding:13px;"><div class="coach-os-card-kicker">' +
      escText(label) + '</div><div style="font-size:19px;font-weight:900;margin-top:7px;">' +
      escText(value == null || value === '' ? '—' : value) + '</div>' +
      (hint ? '<div class="coach-os-muted" style="margin-top:4px;">' + escText(hint) + '</div>' : '') + '</div>';
  }

  function timelineRow(event, index) {
    return '<button type="button" class="coach-os-row" onclick="CoachOS.openTimelineEvent(' + index + ')">' +
      '<span class="coach-os-status-dot low"></span><span class="coach-os-row-main"><strong>' +
      escText(event.summary || event.type) + '</strong><span>' + escText(event.domain || 'general') +
      (event.at ? ' · ' + escText(new Date(event.at).toLocaleDateString('it-IT')) : '') +
      '</span></span><span>›</span></button>';
  }

  function renderOverviewData(container, payload) {
    window.__coachClientOverview = payload;
    const client = payload.client || {};
    const status = payload.operationalStatus || {};
    const action = payload.nextAction || {};
    const snapshot = payload.snapshot || {};
    const intelligence = payload.intelligence || {};
    const derived = intelligence.derivedMetrics || {};
    const signals = intelligence.signals || [];
    const weight = snapshot.weight || {};
    const timeline = payload.timeline || [];
    store.coachWorkspace = Object.assign({}, store.coachWorkspace || {}, {
      clientId: client.id,
      client: Object.assign({}, store.coachWorkspace && store.coachWorkspace.client || {}, {
        id: client.id,
        displayName: client.name,
        username: client.username
      })
    });
    container.innerHTML =
      '<div class="coach-os-page">' +
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">' + escText(status.label || 'Client') + '</div>' +
      '<h1 class="coach-os-title">' + escText(client.name || 'Client') + '</h1>' +
      '<p class="coach-os-subtitle">' + escText(client.goal || 'Goal not set') + '</p></div>' +
      '<button class="btn btn-outline" style="min-height:44px;" onclick="openCoachClientChat(\'' + escText(client.id) + '\')">MESSAGE</button></div>' +

      '<section><div class="coach-os-card coach-os-card-primary">' +
      '<div class="coach-os-card-kicker">Next action</div><div class="coach-os-card-title">' +
      escText(action.label || 'Review client') + '</div>' +
      '<button class="btn" style="margin-top:10px;background:#111;color:#fff !important;-webkit-text-fill-color:#fff !important;" onclick="CoachOS.runClientNextAction()">OPEN</button>' +
      '</div></section>' +

      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Athlete snapshot</h2></div>' +
      '<div class="coach-os-grid-2" style="grid-template-columns:repeat(2,minmax(0,1fr));">' +
      snapshotMetric('Weight', weight.current ? weight.current + ' kg' : '—', weight.delta == null ? '' : ((weight.delta > 0 ? '+' : '') + weight.delta + ' kg')) +
      snapshotMetric('Adherence', derived.adherence && derived.adherence.value != null ? derived.adherence.value + '%' : '—', 'Last 28 days') +
      snapshotMetric(
        'Training',
        snapshot.training && snapshot.training.programTitle || 'No program',
        (snapshot.training && snapshot.training.weeks ? snapshot.training.weeks + ' weeks' : '') +
          (snapshot.training && snapshot.training.lastWorkoutAt ? ' · ' + relativeDate(snapshot.training.lastWorkoutAt) : '')
      ) +
      snapshotMetric('Performance', derived.performance && derived.performance.deltaPct != null ? ((derived.performance.deltaPct > 0 ? '+' : '') + derived.performance.deltaPct + '%') : '—', 'Tonnage trend') +
      '</div></section>' +

      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Athlete intelligence</h2>' +
      '<span class="coach-os-muted">Deterministic · ' + escText(intelligence.formulaVersion || 'pending') + '</span></div>' +
      (signals.length
        ? '<div class="coach-os-list">' + signals.map(function (signal) {
          return '<div class="coach-os-row"><span class="coach-os-status-dot ' + escText(signal.severity || 'low') +
            '"></span><span class="coach-os-row-main"><strong>' + escText(signal.title || signal.id) +
            '</strong><span>' + escText(signal.detail || '') + '</span></span></div>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">Nessun rischio deterministico rilevato. Apri i dati per il dettaglio.</div>') +
      '</section>' +

      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Timeline</h2>' +
      '<button class="btn btn-outline" style="font-size:9px;" onclick="CoachOS.loadFullTimeline()">VIEW ALL</button></div>' +
      (timeline.length ? '<div class="coach-os-list">' + timeline.map(timelineRow).join('') + '</div>' : '<div class="coach-os-empty">No significant activity yet.</div>') +
      '</section>' +

      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Domains</h2></div>' +
      '<div class="coach-os-quick-actions">' +
      '<button class="coach-os-action" onclick="enterCoachClientView(\'training\')">Program</button>' +
      '<button class="coach-os-action" onclick="enterCoachClientView(\'nutrition\')">Nutrition</button>' +
      '<button class="coach-os-action" onclick="CoachOS.navigate(\'coachCheckIns\')">Check-ins</button>' +
      '<button class="coach-os-action" onclick="openCoachClientChat(\'' + escText(client.id) + '\')">Messages</button>' +
      '<button class="coach-os-action" onclick="enterCoachClientView(\'calendar\')">Calendar</button>' +
      '<button class="coach-os-action" onclick="enterCoachClientView(\'stats\')">Analytics</button>' +
      '<button class="coach-os-action" onclick="enterCoachClientView(\'athlete\')">Profile</button>' +
      '<button class="coach-os-action" onclick="CoachOS.openLegacyClientWorkspace()">More actions</button>' +
      '</div></section><div style="height:28px;"></div></div>';
    applyClientChrome();
  }

  async function renderClientOverview(container) {
    const id = store.coachWorkspace && store.coachWorkspace.clientId;
    if (!id) {
      CoachOS.navigate('coachHub');
      return;
    }
    if (store.__coachOsClientLegacy) {
      container.innerHTML = '<div class="coach-os-skeleton">Loading client operations…</div>';
      Promise.resolve(renderCoachWorkspace(container)).then(function () {
        const back = document.createElement('button');
        back.className = 'btn btn-outline';
        back.style.cssText = 'width:100%;margin-bottom:12px;';
        back.textContent = '← CLIENT OVERVIEW';
        back.onclick = function () {
          store.__coachOsClientLegacy = false;
          render();
        };
        container.insertBefore(back, container.firstChild);
      });
      return;
    }
    container.innerHTML = '<div class="coach-os-page"><div class="coach-os-skeleton">Loading client overview…</div></div>';
    try {
      const results = await Promise.all([
        practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/overview', {
          method: 'GET',
          headers: practiceHeaders(false)
        }, 20000),
        practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/intelligence', {
          method: 'GET',
          headers: practiceHeaders(false)
        }, 20000).catch(function () { return null; })
      ]);
      const payload = results[0];
      if (!payload || !payload.ok) throw new Error(payload && payload.error || 'Overview unavailable');
      if (results[1] && results[1].ok) payload.intelligence = results[1];
      renderOverviewData(container, payload);
    } catch (error) {
      container.innerHTML = '<div class="coach-os-page"><div class="coach-os-error">' +
        escText(error && error.message || 'Overview unavailable') +
        '<br><button class="btn btn-outline" style="margin-top:12px;" onclick="CoachOS.openLegacyClientWorkspace()">OPEN CLASSIC WORKSPACE</button></div></div>';
    }
  }

  CoachOS.selectSavedView = function (id) {
    state.savedViewId = id || '';
    state.filter = 'all';
    state.nextCursor = null;
    CoachOS.navigate('coachHub');
  };
  CoachOS.setClientFilter = function (filter) {
    state.filter = filter || 'all';
    state.savedViewId = '';
    state.nextCursor = null;
    CoachOS.navigate('coachHub');
  };
  CoachOS.searchClients = function (value) {
    state.query = String(value || '');
    clearTimeout(state.timer);
    state.timer = setTimeout(function () { CoachOS.navigate('coachHub'); }, 280);
  };
  CoachOS.loadMoreClients = function () {
    const container = document.getElementById('view-container');
    if (container && state.nextCursor) loadClients(container, true);
  };
  CoachOS.saveCurrentClientView = async function () {
    const name = prompt('Nome della vista salvata');
    if (!name) return;
    try {
      await practiceFetch('/api/coach/saved-views', {
        method: 'POST',
        headers: practiceHeaders(true),
        body: JSON.stringify({ name: name, filters: { filter: state.filter, q: state.query }, sort: { by: state.sort } })
      }, 12000);
      await loadViews();
      practiceToast('Vista salvata', 'success');
      CoachOS.navigate('coachHub');
    } catch (error) {
      practiceToast((error && error.message) || 'Vista non salvata', 'danger');
    }
  };
  CoachOS.openLegacyClientWorkspace = function () {
    store.__coachOsClientLegacy = true;
    render();
  };
  CoachOS.runClientNextAction = function () {
    const payload = window.__coachClientOverview || {};
    const client = payload.client || {};
    const action = payload.nextAction || {};
    if (action.view === 'coachChat') return openCoachClientChat(client.id);
    if (action.view === 'coachPrograms') return openAssignChooser(client.id, client.name || '');
    if (action.view === 'coachCheckIns' && typeof requestCheckFromClient === 'function') return requestCheckFromClient(client.id);
    if (action.view === 'coachAnalytics') return enterCoachClientView('stats');
    CoachOS.openLegacyClientWorkspace();
  };
  CoachOS.openTimelineEvent = function (index) {
    const event = ((window.__coachClientOverview || {}).timeline || [])[index];
    if (!event) return;
    const link = event.sourceLink || {};
    const id = (window.__coachClientOverview.client || {}).id;
    if (link.view === 'coachChat') return openCoachClientChat(id);
    if (['training', 'nutrition', 'supplements', 'therapy', 'exams', 'calendar', 'stats'].includes(link.view)) {
      return enterCoachClientView(link.view);
    }
    if (link.view === 'coachCheckIns') return CoachOS.navigate('coachCheckIns');
    CoachOS.openLegacyClientWorkspace();
  };
  CoachOS.loadFullTimeline = async function () {
    const payload = window.__coachClientOverview || {};
    const id = payload.client && payload.client.id;
    if (!id) return;
    try {
      const result = await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/timeline?limit=100', {
        method: 'GET',
        headers: practiceHeaders(false)
      }, 20000);
      payload.timeline = result.events || [];
      const container = document.getElementById('view-container');
      if (container) renderOverviewData(container, payload);
    } catch (error) {
      practiceToast((error && error.message) || 'Timeline non disponibile', 'danger');
    }
  };

  CoachOS.registerView('coachHub', renderClients);
  CoachOS.registerView('coachClient', renderClientOverview);
})();
