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

  function tx(key) {
    return CoachOS.t ? CoachOS.t(key) : key;
  }

  function clientStatus(client) {
    const now = Date.now();
    if (!client.paid || (client.nextDueAt && new Date(client.nextDueAt).getTime() < now)) {
      return { id: 'payment_due', label: tx('coStatusPayment'), severity: 'high' };
    }
    if (client.hasPendingChange || client.hasPendingUnlock || client.leaveRequested || Number(client.unreadCount || 0) > 0) {
      return { id: 'awaiting_coach', label: tx('coStatusAwaiting'), severity: 'high' };
    }
    if (client.lastWorkoutAt && new Date(client.lastWorkoutAt).getTime() < now - 7 * 86400000) {
      return { id: 'at_risk', label: tx('coStatusAtRisk'), severity: 'medium' };
    }
    return { id: 'on_track', label: tx('coStatusOnTrack'), severity: 'low' };
  }

  function initials(name) {
    return String(name || 'C').split(/\s+/).slice(0, 2).map(function (part) {
      return part.charAt(0).toUpperCase();
    }).join('');
  }

  function relativeDate(value) {
    if (!value) return tx('coNoWorkout');
    const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
    if (days === 0) return tx('coWorkoutToday');
    if (days === 1) return tx('coWorkoutYesterday');
    return days + ' ' + tx('coDaysAgo');
  }

  function clientCard(client) {
    const status = clientStatus(client);
    const name = client.displayName || client.username || tx('coClientFallback');
    const avatar = client.photo
      ? '<img src="' + escText(client.photo) + '" alt="" style="width:44px;height:44px;border-radius:14px;object-fit:cover;">'
      : '<span style="width:44px;height:44px;border-radius:14px;background:#222;display:flex;align-items:center;justify-content:center;color:var(--co-accent);font-weight:900;">' + escText(initials(name)) + '</span>';
    const badges = [];
    if (client.unreadCount) badges.push(client.unreadCount + ' ' + tx('coUnread'));
    if (client.workoutLive) badges.push(tx('coLiveWorkout'));
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
      if (!payload || !payload.ok) throw new Error(payload && payload.error || tx('coClientsUnavailable'));
      state.clients = append ? state.clients.concat(payload.clients || []) : (payload.clients || []);
      state.total = Number(payload.total || state.clients.length);
      state.nextCursor = payload.nextCursor || null;
      store.__cpClientList = state.clients.slice();
      drawClients(container);
      applyClientChrome();
    } catch (error) {
      container.innerHTML =
        '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Coach OS</div>' +
        '<h1 class="coach-os-title">' + escText(tx('coClients')) + '</h1></div></div><div class="coach-os-error">' +
        escText(error && error.message || tx('coClientsUnavailable')) +
        '<br><button class="btn btn-outline" style="margin-top:12px;" onclick="CoachOS.navigate(\'coachHub\')">' + escText(tx('coRetry')) + '</button></div></div>';
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
    const all = [{ id: '', name: tx('coAllClients') }].concat((state.views || []).map(function (view) {
      const map = {
        'At Risk': 'coSavedAtRisk',
        'No Workout 7d': 'coSavedNoWorkout',
        'Check-ins': 'coSavedCheckIns',
        'Payments': 'coSavedPayments',
        'New Clients': 'coSavedNew'
      };
      return map[view.name] ? Object.assign({}, view, { name: tx(map[view.name]) }) : view;
    }));
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
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">' + escText(tx('coPortfolio')) + '</div>' +
      '<h1 class="coach-os-title">' + escText(tx('coClients')) + '</h1><p class="coach-os-subtitle">' + state.total +
      ' ' + escText(tx('coClients').toLowerCase()) + ' · ' + escText(tx('coNeedsAttention').toLowerCase()) + '.</p></div>' +
      '<button class="btn btn-primary" style="min-height:44px;" onclick="openAddClientWizard()">' + escText(tx('coAddClient')) + '</button></div>' +
      '<div class="coach-os-card" style="padding:12px;">' +
      '<input type="search" value="' + escText(state.query) + '" placeholder="' + escText(tx('coSearchClients')) + '" aria-label="' + escText(tx('coSearchClients')) + '" ' +
      'oninput="CoachOS.searchClients(this.value)" style="width:100%;min-height:44px;background:#0b0b0b;border:1px solid var(--co-border);border-radius:12px;color:#fff;padding:0 12px;">' +
      '</div>' +
      viewChips() +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
      '<select aria-label="' + escText(tx('coClientFilter')) + '" onchange="CoachOS.setClientFilter(this.value)" style="width:auto;min-height:40px;">' +
      ['all', 'active', 'attention', 'inactive', 'unread', 'checkin', 'payment', 'program', 'nutrition', 'injury'].map(function (filter) {
        const labels = {
          all: 'coFilterAll', active: 'coFilterActive', attention: 'coFilterAttention',
          inactive: 'coFilterInactive', unread: 'coFilterUnread', checkin: 'coFilterCheckin',
          payment: 'coFilterPayment', program: 'coFilterProgram', nutrition: 'coFilterNutrition',
          injury: 'coFilterInjury'
        };
        return '<option value="' + filter + '"' + (state.filter === filter ? ' selected' : '') + '>' +
          escText(tx(labels[filter] || filter)) + '</option>';
      }).join('') + '</select>' +
      '<button type="button" class="btn btn-outline" style="font-size:9px;" onclick="CoachOS.saveCurrentClientView()">' + escText(tx('coSaveView')) + '</button></div>' +
      (state.clients.length
        ? '<div class="coach-os-list">' + state.clients.map(clientCard).join('') + '</div>'
        : '<div class="coach-os-empty">' + escText(tx('coNoClientsView')) + '</div>') +
      (state.nextCursor
        ? '<button class="btn btn-outline" style="width:100%;margin-top:12px;" onclick="CoachOS.loadMoreClients()">' + escText(tx('coLoadMore')) + '</button>'
        : '') +
      '<div style="height:28px;"></div></div>';
  }

  async function renderClients(container) {
    store.coachSessionActive = true;
    store.__coachOsClientLegacy = false;
    container.innerHTML =
      '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">' + escText(tx('coPortfolio')) + '</div>' +
      '<h1 class="coach-os-title">' + escText(tx('coClients')) + '</h1></div></div><div class="coach-os-skeleton">' + escText(tx('coLoadingClients')) + '</div></div>';
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
      escText(event.summary || event.type) + '</strong><span>' +       escText(event.domain || tx('coDomains')) +
      (event.at ? ' · ' + escText(new Date(event.at).toLocaleDateString(CoachOS.locale ? CoachOS.locale() : 'it-IT')) : '') +
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
    const brain = intelligence.aiInterpretation || null;
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
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">' + escText(status.label || tx('coClientFallback')) + '</div>' +
      '<h1 class="coach-os-title">' + escText(client.name || tx('coClientFallback')) + '</h1>' +
      '<p class="coach-os-subtitle">' + escText(client.goal || tx('coGoalUnset')) + '</p></div>' +
      '<button class="btn btn-outline" style="min-height:44px;" onclick="openCoachClientChat(\'' + escText(client.id) + '\')">' + escText(tx('coMessage')) + '</button></div>' +

      '<section><div class="coach-os-card coach-os-card-primary">' +
      '<div class="coach-os-card-kicker">' + escText(tx('coNextAction')) + '</div><div class="coach-os-card-title">' +
      escText(action.label || tx('coReviewClient')) + '</div>' +
      '<button class="btn" style="margin-top:10px;background:#111;color:#fff !important;-webkit-text-fill-color:#fff !important;" onclick="CoachOS.runClientNextAction()">' + escText(tx('coOpen')) + '</button>' +
      '</div></section>' +

      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">' + escText(tx('coAthleteSnapshot')) + '</h2></div>' +
      '<div class="coach-os-grid-2" style="grid-template-columns:repeat(2,minmax(0,1fr));">' +
      snapshotMetric(tx('coWeight'), weight.current ? weight.current + ' kg' : '—', weight.delta == null ? '' : ((weight.delta > 0 ? '+' : '') + weight.delta + ' kg')) +
      snapshotMetric(tx('coAdherence'), derived.adherence && derived.adherence.value != null ? derived.adherence.value + '%' : '—', tx('coLast28d')) +
      snapshotMetric(
        tx('coTraining'),
        snapshot.training && snapshot.training.programTitle || tx('coNoProgram'),
        (snapshot.training && snapshot.training.weeks ? snapshot.training.weeks + ' ' + tx('coWeeks') : '') +
          (snapshot.training && snapshot.training.lastWorkoutAt ? ' · ' + relativeDate(snapshot.training.lastWorkoutAt) : '')
      ) +
      snapshotMetric(tx('coPerformance'), derived.performance && derived.performance.deltaPct != null ? ((derived.performance.deltaPct > 0 ? '+' : '') + derived.performance.deltaPct + '%') : '—', tx('coTonnageTrend')) +
      '</div></section>' +

      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">' + escText(tx('coAthleteIntelligence')) + '</h2>' +
      '<span class="coach-os-muted">' + escText(tx('coDeterministic')) + ' · ' + escText(intelligence.formulaVersion || '—') + '</span></div>' +
      (signals.length
        ? '<div class="coach-os-list">' + signals.map(function (signal) {
          return '<div class="coach-os-row"><span class="coach-os-status-dot ' + escText(signal.severity || 'low') +
            '"></span><span class="coach-os-row-main"><strong>' + escText(signal.title || signal.id) +
            '</strong><span>' + escText(signal.detail || '') + '</span></span></div>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">' + escText(tx('coNoRisks')) + '</div>') +
      (brain
        ? '<div class="coach-os-card" style="margin-top:12px;"><div class="coach-os-card-kicker">' + escText(tx('coAthleteBrain')) + '</div>' +
          '<div class="coach-os-card-title">' + escText(brain.currentStatus || '') + '</div>' +
          '<div class="coach-os-muted">' + escText((brain.suggestedAction && brain.suggestedAction.text) || '') + '</div>' +
          '<div class="coach-os-quick-actions" style="margin-top:10px;">' +
          '<button class="coach-os-action" onclick="CoachOS.brainFeedback(\'approve\')">' + escText(tx('coApprove')) + '</button>' +
          '<button class="coach-os-action" onclick="CoachOS.brainFeedback(\'modify\')">' + escText(tx('coModify')) + '</button>' +
          '<button class="coach-os-action" onclick="CoachOS.brainFeedback(\'dismiss\')">' + escText(tx('coDismiss')) + '</button>' +
          '<button class="coach-os-action" onclick="CoachOS.navigate(\'coachAgent\')">' + escText(tx('coAskAgent')) + '</button>' +
          '<button class="coach-os-action" onclick="CoachOS.openBrainData()">' + escText(tx('coOpenData')) + '</button></div></div>'
        : '') +
      '</section>' +

      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">' + escText(tx('coTimeline')) + '</h2>' +
      '<button class="btn btn-outline" style="font-size:9px;" onclick="CoachOS.loadFullTimeline()">' + escText(tx('coViewAll')) + '</button></div>' +
      (timeline.length ? '<div class="coach-os-list">' + timeline.map(timelineRow).join('') + '</div>' : '<div class="coach-os-empty">' + escText(tx('coNoTimeline')) + '</div>') +
      '</section>' +

      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">' + escText(tx('coDomains')) + '</h2></div>' +
      '<div class="coach-os-quick-actions">' +
      '<button class="coach-os-action" onclick="enterCoachClientView(\'training\')">' + escText(tx('coPrograms')) + '</button>' +
      '<button class="coach-os-action" onclick="enterCoachClientView(\'nutrition\')">' + escText(tx('coNutrition')) + '</button>' +
      '<button class="coach-os-action" onclick="CoachOS.navigate(\'coachCheckIns\')">' + escText(tx('coCheckIns')) + '</button>' +
      '<button class="coach-os-action" onclick="openCoachClientChat(\'' + escText(client.id) + '\')">' + escText(tx('coMessage')) + '</button>' +
      '<button class="coach-os-action" onclick="enterCoachClientView(\'calendar\')">' + escText(tx('coCalendar')) + '</button>' +
      '<button class="coach-os-action" onclick="enterCoachClientView(\'stats\')">' + escText(tx('coAnalytics')) + '</button>' +
      '<button class="coach-os-action" onclick="enterCoachClientView(\'athlete\')">' + escText(tx('profilo')) + '</button>' +
      '<button class="coach-os-action" onclick="CoachOS.openLegacyClientWorkspace()">' + escText(tx('coMore')) + '</button>' +
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
      container.innerHTML = '<div class="coach-os-skeleton">' + escText(tx('coLoadingOps')) + '</div>';
      Promise.resolve(renderCoachWorkspace(container)).then(function () {
        const back = document.createElement('button');
        back.className = 'btn btn-outline';
        back.style.cssText = 'width:100%;margin-bottom:12px;';
        back.textContent = tx('coBackOverview');
        back.onclick = function () {
          store.__coachOsClientLegacy = false;
          render();
        };
        container.insertBefore(back, container.firstChild);
      });
      return;
    }
    container.innerHTML = '<div class="coach-os-page"><div class="coach-os-skeleton">' + escText(tx('coLoadingOverview')) + '</div></div>';
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
      if (!payload || !payload.ok) throw new Error(payload && payload.error || tx('coOverviewUnavailable'));
      if (results[1] && results[1].ok) payload.intelligence = results[1];
      renderOverviewData(container, payload);
    } catch (error) {
      container.innerHTML = '<div class="coach-os-page"><div class="coach-os-error">' +
        escText(error && error.message || tx('coOverviewUnavailable')) +
        '<br><button class="btn btn-outline" style="margin-top:12px;" onclick="CoachOS.openLegacyClientWorkspace()">' + escText(tx('coOpenClassic')) + '</button></div></div>';
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
    const name = prompt(tx('coSaveViewPrompt'));
    if (!name) return;
    try {
      await practiceFetch('/api/coach/saved-views', {
        method: 'POST',
        headers: practiceHeaders(true),
        body: JSON.stringify({ name: name, filters: { filter: state.filter, q: state.query }, sort: { by: state.sort } })
      }, 12000);
      await loadViews();
      practiceToast(tx('coViewSaved'), 'success');
      CoachOS.navigate('coachHub');
    } catch (error) {
      practiceToast((error && error.message) || tx('coViewNotSaved'), 'danger');
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

  CoachOS.brainFeedback = async function (decision) {
    const payload = window.__coachClientOverview || {};
    const id = payload.client && payload.client.id;
    const brain = payload.intelligence && payload.intelligence.aiInterpretation;
    if (!id || !brain) return;
    let note = '';
    if (decision === 'modify') {
      note = window.prompt('Modifica la next action o annota il dato da rivedere', (brain.suggestedAction && brain.suggestedAction.text) || '') || '';
      if (!note) return;
    }
    try {
      await practiceFetch('/api/coach/clients/' + encodeURIComponent(id) + '/brain-feedback', {
        method: 'POST',
        headers: practiceHeaders(true),
        body: JSON.stringify({
          decision: decision,
          note: note,
          interpretationFingerprint: brain.sourceFingerprint
        })
      });
      if (typeof practiceToast === 'function') practiceToast('Feedback registrato', 'success');
    } catch (error) {
      if (typeof practiceToast === 'function') practiceToast((error && error.message) || 'Feedback non salvato', 'danger');
    }
  };

  CoachOS.openBrainData = function () {
    const payload = window.__coachClientOverview || {};
    const intelligence = payload.intelligence || {};
    const brain = intelligence.aiInterpretation || {};
    const sources = [];
    (brain.positives || []).forEach(function (row) {
      if (row && row.source) sources.push(row.text + ' → ' + (row.source.source || 'derived'));
    });
    (brain.risks || []).forEach(function (row) {
      const evidence = (row.evidence || []).map(function (item) { return item.source || item; }).join(', ');
      sources.push((row.text || row.signalId) + (evidence ? ' → ' + evidence : ''));
    });
    (intelligence.signals || []).forEach(function (signal) {
      const evidence = (signal.evidence || []).map(function (item) { return item.source || item; }).join(', ');
      sources.push((signal.title || signal.id) + (evidence ? ' → ' + evidence : ''));
    });
    window.alert(sources.length ? sources.join('\n') : 'Nessuna fonte deterministica disponibile.');
  };

  CoachOS.registerView('coachHub', renderClients);
  CoachOS.registerView('coachClient', renderClientOverview);
})();
