(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }

  function firstName() {
    const account = (typeof store !== 'undefined' && store.accountUser) || {};
    return String(account.name || 'Coach').trim().split(/\s+/)[0] || 'Coach';
  }

  function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  }

  function timeZone() {
    try {
      if (typeof window.deviceTimeZone === 'function') return window.deviceTimeZone();
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (_) {
      return 'UTC';
    }
  }

  function formatWhen(value) {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString('it-IT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timeZone()
      });
    } catch (_) {
      return '';
    }
  }

  function actionButton(item, index) {
    return '<button type="button" class="coach-os-row" onclick="CoachOS.openTodayAttention(' + index + ')">' +
      '<span class="coach-os-status-dot ' + escText(item.severity || 'low') + '"></span>' +
      '<span class="coach-os-row-main"><strong>' + escText(item.title || 'Richiede attenzione') + '</strong>' +
      '<span>' + escText(item.detail || '') + (item.dueAt ? ' · ' + escText(formatWhen(item.dueAt)) : '') + '</span></span>' +
      '<span aria-hidden="true" style="color:var(--co-muted);">›</span></button>';
  }

  function activityButton(item, index) {
    return '<button type="button" class="coach-os-row" onclick="CoachOS.openTodayActivity(' + index + ')">' +
      '<span class="coach-os-row-main"><strong>' + escText(item.title || 'Attività') + '</strong>' +
      '<span>' + escText(item.clientName || '') + (item.at ? ' · ' + escText(formatWhen(item.at)) : '') + '</span></span>' +
      '<span aria-hidden="true" style="color:var(--co-muted);">›</span></button>';
  }

  function renderKpis(kpi) {
    const rows = [
      [kpi.clients || 0, 'Clients'],
      [kpi.activeClients || 0, 'Active'],
      [kpi.unread || 0, 'Unread'],
      [kpi.liveNow || 0, 'Live']
    ];
    return '<div class="coach-os-card coach-os-kpis">' + rows.map(function (row) {
      return '<div class="coach-os-kpi"><strong>' + Number(row[0] || 0) + '</strong><span>' + row[1] + '</span></div>';
    }).join('') + '</div>';
  }

  function renderToday(container, data) {
    window.__coachTodayData = data;
    const attention = data.attention || [];
    const sessions = data.sessions || [];
    const tasks = data.tasks || [];
    const activity = (data.recentActivity || []).slice(0, 8);

    container.innerHTML =
      '<div class="coach-os-page">' +
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Today · ' +
      escText(new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' })) +
      '</div><h1 class="coach-os-title">' + greeting() + ', <em>' + escText(firstName()) + '.</em></h1>' +
      '<p class="coach-os-subtitle">Priorità, clienti e prossime azioni in un solo posto.</p></div></div>' +

      '<div class="coach-os-grid-2">' +
      '<button type="button" class="coach-os-card coach-os-card-primary" style="text-align:left;cursor:pointer;" onclick="CoachOS.navigate(\'coachAgent\')">' +
      '<div class="coach-os-card-kicker">Primary action</div><div class="coach-os-card-title">Nurvan Agent</div>' +
      '<div class="coach-os-muted">Ask. Plan. Execute.</div></button>' +
      '<button type="button" class="coach-os-card" style="text-align:left;cursor:pointer;" onclick="CoachOS.navigate(\'coachCalendar\')">' +
      '<div class="coach-os-card-kicker">Online coaching</div><div class="coach-os-card-title">Schedule</div>' +
      '<div class="coach-os-muted">Call, check-in e review.</div></button></div>' +

      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Needs attention</h2>' +
      '<span class="coach-os-muted">' + attention.length + '</span></div>' +
      (attention.length
        ? '<div class="coach-os-list">' + attention.map(actionButton).join('') + '</div>'
        : '<div class="coach-os-empty">Nessuna urgenza. Il portfolio è sotto controllo.</div>') +
      '</section>' +

      (sessions.length
        ? '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Today’s sessions</h2></div>' +
          '<div class="coach-os-list">' + sessions.map(function (session) {
            return '<div class="coach-os-row"><span class="coach-os-row-main"><strong>' + escText(session.title) +
              '</strong><span>' + escText(session.time || '') + '</span></span></div>';
          }).join('') + '</div></section>'
        : '') +

      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">My tasks</h2></div>' +
      (tasks.length
        ? '<div class="coach-os-list">' + tasks.map(function (task) {
          return '<div class="coach-os-row"><span class="coach-os-row-main"><strong>' + escText(task.title) +
            '</strong><span>' + escText(task.clientName || '') + '</span></span></div>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">I task operativi compariranno qui.</div>') +
      '</section>' +

      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Recent activity</h2></div>' +
      (activity.length
        ? '<div class="coach-os-list">' + activity.map(activityButton).join('') + '</div>'
        : '<div class="coach-os-empty">Nessuna attività recente.</div>') +
      '</section>' +

      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Portfolio</h2></div>' +
      renderKpis(data.kpi || {}) + '</section>' +

      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Quick actions</h2></div>' +
      '<div class="coach-os-quick-actions">' +
      '<button class="coach-os-action" onclick="openAddClientWizard()">Add client</button>' +
      '<button class="coach-os-action" onclick="CoachOS.navigate(\'coachHub\')">Assign program</button>' +
      '<button class="coach-os-action" onclick="CoachOS.navigate(\'coachInbox\')">Open Inbox</button>' +
      '<button class="coach-os-action" onclick="CoachOS.navigate(\'coachHub\')">Request check-in</button>' +
      '<button class="coach-os-action" onclick="CoachOS.navigate(\'coachPrograms\')">Create program</button>' +
      '<button class="coach-os-action" onclick="CoachOS.openNativeImport()">Import program</button>' +
      '</div></section>' +
      '<div style="height:28px;"></div></div>';
  }

  async function loadToday(container) {
    container.innerHTML =
      '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Coach OS</div>' +
      '<h1 class="coach-os-title">Today</h1></div></div><div class="coach-os-skeleton">Caricamento priorità…</div></div>';
    try {
      const date = new Date().toISOString().slice(0, 10);
      const payload = await window.practiceFetch(
        '/api/coach/today?date=' + encodeURIComponent(date) + '&timezone=' + encodeURIComponent(timeZone()),
        { method: 'GET', headers: window.practiceHeaders(false) },
        15000
      );
      if (!payload || !payload.ok) throw new Error((payload && payload.error) || 'Today non disponibile');
      renderToday(container, payload);
    } catch (error) {
      container.innerHTML =
        '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Coach OS</div>' +
        '<h1 class="coach-os-title">Today</h1></div></div>' +
        '<div class="coach-os-error">' + escText(error && error.message || 'Today non disponibile') +
        '<br><button class="btn btn-outline" style="margin-top:12px;" onclick="CoachOS.navigate(\'coachToday\')">RIPROVA</button></div></div>';
    }
  }

  function openTarget(item) {
    if (!item) return;
    const action = item.action || {};
    const id = action.clientId || item.clientId;
    if (action.view === 'coachChat' && id && typeof window.openCoachClientChat === 'function') {
      window.openCoachClientChat(id);
      return;
    }
    if (id && typeof window.openCoachClient === 'function') {
      window.openCoachClient(id);
      return;
    }
  }

  CoachOS.openTodayAttention = function (index) {
    openTarget((window.__coachTodayData && window.__coachTodayData.attention || [])[index]);
  };
  CoachOS.openTodayActivity = function (index) {
    openTarget((window.__coachTodayData && window.__coachTodayData.recentActivity || [])[index]);
  };
  CoachOS.registerView('coachToday', loadToday);
})();
