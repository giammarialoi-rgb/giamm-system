(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }

  CoachOS.views.coachAnalytics = async function (container) {
    container.innerHTML = '<div class="coach-os-skeleton">Loading coach analytics…</div>';
    try {
      const data = await window.practiceFetch('/api/coach/analytics', { headers: window.practiceHeaders() });
      const kpi = data.analytics || {};
      container.innerHTML =
        '<div class="coach-os-page">' +
        '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Athlete quality</div>' +
        '<h1 class="coach-os-title">Coach Analytics</h1>' +
        '<p class="coach-os-subtitle">Adherence, workout e check-in. Nessun revenue o MRR qui.</p></div></div>' +
        '<div class="coach-os-card coach-os-kpis">' +
        [['Adherence', kpi.adherence && kpi.adherence.average != null ? kpi.adherence.average + '%' : '—'],
          ['At risk', kpi.adherence && kpi.adherence.atRisk || 0],
          ['Workouts 28d', kpi.workouts && kpi.workouts.completed28d || 0],
          ['Check-ins due', kpi.checkIns && kpi.checkIns.due || 0]
        ].map(function (row) {
          return '<div class="coach-os-kpi"><strong>' + escText(row[1]) + '</strong><span>' + escText(row[0]) + '</span></div>';
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
})();
