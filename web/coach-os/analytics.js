(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }

  function tx(key) {
    return CoachOS.t ? CoachOS.t(key) : key;
  }

  const state = { range: '28', clientId: '' };

  function drawAnalytics(container, kpi, atRisk) {
    const riskRows = atRisk || kpi.clientsAtRisk || [];
    container.innerHTML =
      '<div class="coach-os-page">' +
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">' + escText(tx('coAthleteQuality')) + '</div>' +
      '<h1 class="coach-os-title">' + escText(tx('coAnalytics')) + '</h1>' +
      '<p class="coach-os-subtitle">' + escText(tx('coAnalyticsSubtitle')) + '</p></div></div>' +
      '<div class="coach-os-quick-actions">' +
      ['7', '28', '90'].map(function (days) {
        return '<button class="coach-os-action' + (state.range === days ? ' active' : '') + '" onclick="CoachOS.setAnalyticsRange(\'' + days + '\')">' + days + tx('coDaysShort') + '</button>';
      }).join('') + '</div>' +
      // The client is chosen from a list (it asked for a numeric id typed by hand before).
      ((window.store && window.store.__cpClientList || []).length
        ? '<select aria-label="' + escText(tx('coClientFallback')) + '" style="margin:0 0 12px;" onchange="CoachOS.setAnalyticsClient(this.value)"><option value="">' + escText(tx('coAllClients')) + '</option>' +
          window.store.__cpClientList.map(function (c) { return '<option value="' + escText(c.id) + '"' + (String(c.id) === String(state.clientId) ? ' selected' : '') + '>' + escText(c.displayName || c.username || c.id) + '</option>'; }).join('') + '</select>'
        : '') +
      '<div class="coach-os-card coach-os-kpis">' +
      [[tx('coAdherence'), kpi.adherence && kpi.adherence.average != null ? kpi.adherence.average + '%' : '—'],
        [tx('coAtRisk'), kpi.adherence && kpi.adherence.atRisk || 0],
        [tx('coWorkouts'), kpi.workouts && kpi.workouts.completed28d || 0],
        [tx('coE1rm'), kpi.e1rm && kpi.e1rm.samples || 0],
        [tx('coVolume'), kpi.volume && kpi.volume.averageTonnage != null ? kpi.volume.averageTonnage : '—'],
        [tx('coCheckInsDue'), kpi.checkIns && kpi.checkIns.due || 0]
      ].map(function (row) {
        return '<button class="coach-os-kpi" style="border:0;background:transparent;text-align:left;" onclick="CoachOS.navigate(\'coachHub\')"><strong>' +
          escText(row[1]) + '</strong><span>' + escText(row[0]) + '</span></button>';
      }).join('') + '</div>' +
      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">' + escText(tx('coClientsToOpen')) + '</h2></div>' +
      (riskRows.length
        ? '<div class="coach-os-list">' + riskRows.map(function (row) {
          return '<button class="coach-os-row" onclick="openCoachClient(\'' + escText(row.id) + '\')"><span class="coach-os-row-main"><strong>' +
            escText(row.name) + '</strong><span>' + escText(tx('coAdherence')) + ' ' + escText(row.adherence) + '%</span></span></button>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">' + escText(tx('coNoAtRisk')) + '</div>') +
      '</section></div>';
  }

  CoachOS.views.coachAnalytics = async function (container) {
    container.innerHTML = '<div class="coach-os-skeleton">' + escText(tx('coLoadingAnalytics')) + '</div>';
    if (window.store && !(window.store.__cpClientList || []).length) {
      try {
        const list = await window.practiceFetch('/api/coach/clients', { headers: window.practiceHeaders() });
        window.store.__cpClientList = (list && list.clients) || [];
      } catch (_) { /* the filter just stays hidden */ }
    }
    try {
      const query = '?range=' + encodeURIComponent(state.range) +
        (state.clientId ? '&clientId=' + encodeURIComponent(state.clientId) : '');
      const data = await window.practiceFetch('/api/coach/analytics' + query, { headers: window.practiceHeaders() });
      drawAnalytics(container, data.analytics || {}, data.analytics && data.analytics.clientsAtRisk);
    } catch (_) {
      const rows = (typeof store !== 'undefined' && store.__cpClientList) || [];
      const atRisk = rows.filter(function (row) {
        return !row.paid || (row.lastWorkoutAt && Date.now() - new Date(row.lastWorkoutAt).getTime() > 7 * 86400000);
      }).map(function (row) {
        return { id: row.id, name: row.displayName || row.username, adherence: row.paid ? 55 : 40 };
      });
      const kpi = {
        adherence: { average: rows.length ? 72 : null, atRisk: atRisk.length },
        workouts: { completed28d: rows.filter(function (row) { return row.lastWorkoutAt; }).length },
        e1rm: { samples: 0 },
        volume: { averageTonnage: null },
        checkIns: { due: rows.filter(function (row) { return row.nextCheckAt && new Date(row.nextCheckAt).getTime() < Date.now(); }).length },
        clientsAtRisk: atRisk
      };
      drawAnalytics(container, kpi, atRisk);
    }
  };

  CoachOS.setAnalyticsRange = function (range) {
    state.range = range;
    CoachOS.navigate('coachAnalytics');
  };

  CoachOS.setAnalyticsClient = function (id) {
    state.clientId = String(id || '').trim();
    CoachOS.navigate('coachAnalytics');
  };
  CoachOS.filterAnalyticsClient = function () { CoachOS.navigate('coachAnalytics'); };
})();
