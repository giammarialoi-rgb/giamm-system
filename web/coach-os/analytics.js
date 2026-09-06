(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }

  const state = { range: '28', clientId: '' };

  CoachOS.views.coachAnalytics = async function (container) {
    container.innerHTML = '<div class="coach-os-skeleton">Loading coach analytics…</div>';
    try {
      const query = '?range=' + encodeURIComponent(state.range) +
        (state.clientId ? '&clientId=' + encodeURIComponent(state.clientId) : '');
      const data = await window.practiceFetch('/api/coach/analytics' + query, { headers: window.practiceHeaders() });
      const kpi = data.analytics || {};
      container.innerHTML =
        '<div class="coach-os-page">' +
        '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Athlete quality</div>' +
        '<h1 class="coach-os-title">Coach Analytics</h1>' +
        '<p class="coach-os-subtitle">Adherence, workout e check-in. Nessun revenue o MRR qui.</p></div></div>' +
        '<div class="coach-os-quick-actions">' +
        ['7', '28', '90'].map(function (days) {
          return '<button class="coach-os-action" onclick="CoachOS.setAnalyticsRange(\'' + days + '\')">' + days + 'D</button>';
        }).join('') +
        '<button class="coach-os-action" onclick="CoachOS.filterAnalyticsClient()">CLIENT</button></div>' +
        '<div class="coach-os-card coach-os-kpis">' +
        [['Adherence', kpi.adherence && kpi.adherence.average != null ? kpi.adherence.average + '%' : '—'],
          ['At risk', kpi.adherence && kpi.adherence.atRisk || 0],
          ['Workouts', kpi.workouts && kpi.workouts.completed28d || 0],
          ['e1RM samples', kpi.e1rm && kpi.e1rm.samples || 0],
          ['Volume', kpi.volume && kpi.volume.averageTonnage != null ? kpi.volume.averageTonnage : '—'],
          ['Check-ins due', kpi.checkIns && kpi.checkIns.due || 0]
        ].map(function (row) {
          return '<button class="coach-os-kpi" style="border:0;background:transparent;text-align:left;" onclick="CoachOS.navigate(\'coachHub\')"><strong>' +
            escText(row[1]) + '</strong><span>' + escText(row[0]) + '</span></button>';
        }).join('') + '</div>' +
        '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Clients to open</h2></div>' +
        ((kpi.clientsAtRisk || []).length
          ? '<div class="coach-os-list">' + kpi.clientsAtRisk.map(function (row) {
            return '<button class="coach-os-row" onclick="openCoachClient(\'' + escText(row.id) + '\')"><span class="coach-os-row-main"><strong>' +
              escText(row.name) + '</strong><span>Adherence ' + escText(row.adherence) + '%</span></span></button>';
          }).join('') + '</div>'
          : '<div class="coach-os-empty">Nessun cliente sotto soglia. Apri Clients per il dettaglio.</div>') +
        '</section></div>';
    } catch (error) {
      container.innerHTML = '<div class="coach-os-error">Analytics non disponibili.</div>';
    }
  };

  CoachOS.setAnalyticsRange = function (range) {
    state.range = range;
    CoachOS.navigate('coachAnalytics');
  };

  CoachOS.filterAnalyticsClient = function () {
    const id = window.prompt('Filtra per client ID (vuoto = portfolio)', state.clientId || '');
    if (id == null) return;
    state.clientId = String(id).trim();
    CoachOS.navigate('coachAnalytics');
  };
})();
