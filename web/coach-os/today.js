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
    return '<div class="coach-os-row">' +
      '<span class="coach-os-status-dot ' + escText(item.severity || 'low') + '"></span>' +
      '<button type="button" class="coach-os-row-main" style="border:0;background:transparent;text-align:left;" onclick="CoachOS.openTodayAttention(' + index + ')"><strong>' +
      escText(item.title || 'Richiede attenzione') + '</strong><span>' + escText(item.detail || '') +
      (item.dueAt ? ' · ' + escText(formatWhen(item.dueAt)) : '') + '</span></button>' +
      '<button type="button" aria-label="Azioni attention" style="border:0;background:transparent;color:var(--co-muted);font-weight:900;" onclick="CoachOS.attentionMenu(' + index + ')">•••</button></div>';
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

      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">My tasks</h2>' +
      '<button class="btn btn-outline" style="font-size:9px;" onclick="CoachOS.createTaskPrompt()">ADD TASK</button></div>' +
      (tasks.length
        ? '<div class="coach-os-list">' + tasks.map(function (task, index) {
          return '<div class="coach-os-row"><button type="button" aria-label="Completa task" title="Completa" ' +
            'style="width:32px;height:32px;border-radius:50%;border:1px solid var(--co-border);background:transparent;color:var(--co-accent);" ' +
            'onclick="CoachOS.completeTask(\'' + escText(task.id) + '\')">✓</button>' +
            '<button type="button" class="coach-os-row-main" style="border:0;background:transparent;text-align:left;" onclick="CoachOS.openTodayTask(' + index + ')"><strong>' + escText(task.title) +
            '</strong><span>' + escText(task.clientName || '') + (task.dueAt ? ' · ' + escText(formatWhen(task.dueAt)) : '') + '</span></button>' +
            '<button type="button" aria-label="Azioni task" style="border:0;background:transparent;color:var(--co-muted);font-weight:900;" onclick="CoachOS.taskMenu(' + index + ')">•••</button></div>';
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

      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Coach OS · apri e controlla</h2></div>' +
      '<div class="coach-os-quick-actions">' +
      [['coachToday', 'Today'], ['coachHub', 'Clients'], ['coachInbox', 'Inbox'], ['coachPrograms', 'Programs'],
        ['coachCalendar', 'Calendar'], ['coachCheckIns', 'Check-ins'], ['coachAgent', 'Agent'],
        ['coachAnalytics', 'Analytics'], ['coachBusiness', 'Business'], ['coachCrm', 'CRM'],
        ['coachAutomations', 'Automations'], ['coachNutrition', 'Nutrition'], ['coachFormReview', 'Form review']
      ].map(function (row) {
        return '<button class="coach-os-action" onclick="CoachOS.navigate(\'' + row[0] + '\')">' + row[1] + '</button>';
      }).join('') +
      '<button class="coach-os-action" onclick="openAddClientWizard()">Add client</button>' +
      '<button class="coach-os-action" onclick="CoachOS.openNativeImport()">Import program</button>' +
      '</div></section>' +
      '<div style="height:28px;"></div></div>';
  }

  function todayFromClients(clients) {
    const rows = Array.isArray(clients) ? clients : [];
    const now = Date.now();
    const attention = [];
    const activity = [];
    rows.forEach(function (client) {
      const id = String(client.id || '');
      const name = client.displayName || client.username || 'Cliente';
      const lastAt = client.lastWorkoutAt || client.last_workout_at;
      if (client.leaveRequested || client.leave_requested_at) {
        attention.push({ title: 'Fine rapporto', detail: name + ' ha chiesto di uscire', severity: 'high', clientId: id, action: { clientId: id } });
      } else if (client.hasPendingChange || client.hasPendingUnlock) {
        attention.push({ title: 'In attesa di te', detail: name + ' ha una richiesta da approvare', severity: 'high', clientId: id, action: { clientId: id } });
      } else if (Number(client.unreadCount || 0) > 0) {
        attention.push({ title: 'Messaggi non letti', detail: name + ' · ' + client.unreadCount + ' unread', severity: 'high', clientId: id, action: { view: 'coachChat', clientId: id } });
      } else if (!client.paid) {
        attention.push({ title: 'Pagamento', detail: name + ' non risulta pagato', severity: 'medium', clientId: id, action: { clientId: id } });
      } else if (lastAt && now - new Date(lastAt).getTime() > 7 * 86400000) {
        attention.push({ title: 'Inattivo 7+ giorni', detail: name, severity: 'medium', clientId: id, action: { clientId: id } });
      }
      if (lastAt) {
        activity.push({ title: 'Ultimo workout', clientName: name, at: lastAt, clientId: id, action: { clientId: id } });
      }
      if (client.workoutLive) {
        activity.unshift({ title: 'In allenamento ora', clientName: name, at: new Date().toISOString(), clientId: id, action: { clientId: id } });
      }
    });
    return {
      attention: attention.slice(0, 12),
      sessions: [],
      tasks: [],
      recentActivity: activity.slice(0, 8),
      kpi: {
        clients: rows.length,
        activeClients: rows.filter(function (row) { return row.paid !== false; }).length,
        unread: rows.reduce(function (sum, row) { return sum + Number(row.unreadCount || 0); }, 0),
        liveNow: rows.filter(function (row) { return !!row.workoutLive; }).length
      }
    };
  }

  async function loadLocalClients() {
    if (typeof store !== 'undefined' && Array.isArray(store.__cpClientList) && store.__cpClientList.length) {
      return store.__cpClientList;
    }
    const payload = await window.practiceFetch('/api/coach/clients?limit=40&offset=0', {
      method: 'GET',
      headers: window.practiceHeaders(false)
    }, 15000);
    const rows = (payload && payload.clients) || [];
    if (typeof store !== 'undefined') store.__cpClientList = rows;
    return rows;
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
    } catch (_) {
      try {
        renderToday(container, todayFromClients(await loadLocalClients()));
      } catch (error) {
        renderToday(container, todayFromClients([]));
        if (typeof practiceToast === 'function') {
          practiceToast((error && error.message) || 'Today in modalità locale', 'info');
        }
      }
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
  CoachOS.openTodayTask = function (index) {
    const task = (window.__coachTodayData && window.__coachTodayData.tasks || [])[index];
    if (task && task.clientId && typeof openCoachClient === 'function') openCoachClient(task.clientId);
  };
  CoachOS.completeTask = async function (id) {
    try {
      await practiceFetch('/api/coach/tasks/' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: practiceHeaders(true),
        body: JSON.stringify({ status: 'completed' })
      }, 10000);
      CoachOS.navigate('coachToday');
    } catch (error) {
      practiceToast((error && error.message) || 'Task non aggiornato', 'danger');
    }
  };
  CoachOS.snoozeTask = async function (id) {
    try {
      await practiceFetch('/api/coach/tasks/' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: practiceHeaders(true),
        body: JSON.stringify({ status: 'snoozed', dueAt: new Date(Date.now() + 86400000).toISOString() })
      }, 10000);
      showOverlay('cp-assign', false);
      CoachOS.navigate('coachToday');
    } catch (error) {
      practiceToast((error && error.message) || 'Task non aggiornato', 'danger');
    }
  };
  CoachOS.moveTask = async function (index, delta) {
    const tasks = (window.__coachTodayData && window.__coachTodayData.tasks || []).slice();
    const next = index + delta;
    if (index < 0 || next < 0 || next >= tasks.length) return;
    const temp = tasks[index];
    tasks[index] = tasks[next];
    tasks[next] = temp;
    try {
      await practiceFetch('/api/coach/tasks/reorder', {
        method: 'POST',
        headers: practiceHeaders(true),
        body: JSON.stringify({ ids: tasks.map(function (task) { return task.id; }) })
      }, 10000);
      showOverlay('cp-assign', false);
      CoachOS.navigate('coachToday');
    } catch (error) {
      practiceToast((error && error.message) || 'Ordine non salvato', 'danger');
    }
  };
  CoachOS.taskMenu = function (index) {
    const task = (window.__coachTodayData && window.__coachTodayData.tasks || [])[index];
    if (!task) return;
    ensurePracticeOverlays();
    const panel = document.getElementById('cp-assign-panel');
    if (!panel) return;
    panel.innerHTML = '<div class="coach-os-card-kicker">Task</div><h2>' + escText(task.title) + '</h2>' +
      '<button class="btn btn-primary" style="width:100%;margin-bottom:8px;" onclick="CoachOS.completeTask(\'' + escText(task.id) + '\')">COMPLETE</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="CoachOS.snoozeTask(\'' + escText(task.id) + '\')">SNOOZE 1 DAY</button>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
      '<button class="btn btn-outline" onclick="CoachOS.moveTask(' + index + ',-1)">MOVE UP</button>' +
      '<button class="btn btn-outline" onclick="CoachOS.moveTask(' + index + ',1)">MOVE DOWN</button></div>' +
      (task.clientId ? '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="showOverlay(\'cp-assign\',false);openCoachClient(\'' + escText(task.clientId) + '\')">OPEN CLIENT</button>' : '') +
      '<button class="btn btn-outline" style="width:100%;" onclick="showOverlay(\'cp-assign\',false)">CLOSE</button>';
    showOverlay('cp-assign', true);
  };
  CoachOS.createTaskPrompt = async function () {
    const title = prompt('Nuovo task');
    if (!title) return;
    try {
      await practiceFetch('/api/coach/tasks', {
        method: 'POST',
        headers: practiceHeaders(true),
        body: JSON.stringify({ title: title, priority: 'normal', source: 'coach', createdBy: 'coach' })
      }, 10000);
      CoachOS.navigate('coachToday');
    } catch (error) {
      practiceToast((error && error.message) || 'Task non creato', 'danger');
    }
  };
  CoachOS.updateAttention = async function (id, status, snoozedUntil) {
    try {
      await practiceFetch('/api/coach/attention/' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: practiceHeaders(true),
        body: JSON.stringify({ status: status, snoozedUntil: snoozedUntil || null })
      }, 10000);
      showOverlay('cp-assign', false);
      CoachOS.navigate('coachToday');
    } catch (error) {
      practiceToast((error && error.message) || 'Attention non aggiornata', 'danger');
    }
  };
  CoachOS.attentionMenu = function (index) {
    const item = (window.__coachTodayData && window.__coachTodayData.attention || [])[index];
    if (!item) return;
    ensurePracticeOverlays();
    const panel = document.getElementById('cp-assign-panel');
    if (!panel) return;
    panel.innerHTML = '<div class="coach-os-card-kicker">Attention</div><h2>' + escText(item.title) + '</h2>' +
      '<p class="cp-help">' + escText(item.detail || '') + '</p>' +
      '<button class="btn btn-primary" style="width:100%;margin-bottom:8px;" onclick="CoachOS.updateAttention(\'' + escText(item.id) + '\',\'resolved\')">RESOLVE</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="CoachOS.updateAttention(\'' + escText(item.id) + '\',\'snoozed\',new Date(Date.now()+86400000).toISOString())">SNOOZE 1 DAY</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="showOverlay(\'cp-assign\',false);CoachOS.openTodayAttention(' + index + ')">OPEN CLIENT</button>' +
      '<button class="btn btn-outline" style="width:100%;" onclick="showOverlay(\'cp-assign\',false)">CLOSE</button>';
    showOverlay('cp-assign', true);
  };
  CoachOS.registerView('coachToday', loadToday);
})();
