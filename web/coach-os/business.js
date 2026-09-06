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

  function euros(cents) {
    return '€' + (Number(cents || 0) / 100).toFixed(0);
  }

  CoachOS.views.coachBusiness = async function (container) {
    container.innerHTML = '<div class="coach-os-skeleton">' + escText(tx('coLoadingLedger')) + '</div>';
    let summary = {};
    try {
      const data = await window.practiceFetch('/api/coach/business', { headers: window.practiceHeaders() });
      summary = data.summary || {};
    } catch (_) {
      summary = { activeClients: 0, revenue30dCents: 0, mrrCents: 0, overdue: 0 };
    }
    container.innerHTML =
      '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">' + escText(tx('coManualLedger')) + '</div>' +
      '<h1 class="coach-os-title">' + escText(tx('coBusiness')) + '</h1><p class="coach-os-subtitle">' + escText(tx('coBusinessSubtitle')) + '</p></div></div>' +
      '<div class="coach-os-card coach-os-kpis">' +
      [[tx('coActive'), summary.activeClients || 0], [tx('coRevenue30d'), euros(summary.revenue30dCents)], ['MRR', euros(summary.mrrCents)], [tx('coOverdue'), summary.overdue || 0]]
        .map(function (row) {
          return '<div class="coach-os-kpi"><strong>' + escText(row[1]) + '</strong><span>' + escText(row[0]) + '</span></div>';
        }).join('') + '</div></div>';
  };

  CoachOS.views.coachCrm = async function (container) {
    let rows = [];
    try {
      const data = await window.practiceFetch('/api/coach/crm', { headers: window.practiceHeaders() });
      rows = data.pipeline || [];
    } catch (_) {
      rows = [];
    }
    container.innerHTML =
      '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">' + escText(tx('coCrm')) + '</div>' +
      '<h1 class="coach-os-title">' + escText(tx('coCrm')) + '</h1></div></div>' +
      (rows.length
        ? '<div class="coach-os-list">' + rows.map(function (row) {
          return '<button class="coach-os-row" onclick="openCoachClient(\'' + escText(row.id) + '\')"><span class="coach-os-row-main"><strong>' +
            escText(row.name) + '</strong><span>' + escText(row.stage) + (row.nextAction ? ' · ' + escText(row.nextAction) : '') +
            '</span></span></button>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">' + escText(tx('coCrmEmpty')) + '</div>') + '</div>';
  };

  CoachOS.views.coachAutomations = async function (container) {
    let rows = [];
    try {
      const data = await window.practiceFetch('/api/coach/automations', { headers: window.practiceHeaders() });
      rows = data.rules || [];
    } catch (_) {
      rows = [];
    }
    container.innerHTML =
      '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">' + escText(tx('coRules')) + '</div>' +
      '<h1 class="coach-os-title">' + escText(tx('coAutomations')) + '</h1><p class="coach-os-subtitle">' + escText(tx('coAutomationsSubtitle')) + '</p></div>' +
      '<button class="btn btn-outline" onclick="CoachOS.createAutomationPrompt()">' + escText(tx('coNewRule')) + '</button></div>' +
      (rows.length
        ? '<div class="coach-os-list">' + rows.map(function (row) {
          return '<div class="coach-os-row"><span class="coach-os-row-main"><strong>' + escText(row.name) +
            '</strong><span>' + escText(row.trigger) + ' → ' + escText(row.action) + '</span></span>' +
            '<button class="btn btn-outline" style="font-size:9px;" onclick="CoachOS.dryRunAutomation(\'' +
            escText(row.id) + '\')">' + escText(tx('coDryRun')) + '</button>' +
            '<button class="btn btn-outline" style="font-size:9px;" onclick="CoachOS.runAutomationNow(\'' +
            escText(row.id) + '\')">' + escText(tx('coRun')) + '</button></div>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">' + escText(tx('coNoAutomations')) + '</div>') + '</div>';
  };

  CoachOS.createAutomationPrompt = async function () {
    const name = window.prompt(tx('coAutomationName'), tx('coAutomationDefault'));
    if (!name) return;
    await window.practiceFetch('/api/coach/automations', {
      method: 'POST',
      headers: window.practiceHeaders(true),
      body: JSON.stringify({ name: name, trigger: 'check_in_received', action: 'create_task' })
    });
    CoachOS.navigate('coachAutomations');
  };

  CoachOS.dryRunAutomation = async function (id) {
    const payload = await window.practiceFetch('/api/coach/automations/' + encodeURIComponent(id) + '/dry-run', {
      method: 'POST',
      headers: window.practiceHeaders(true),
      body: JSON.stringify({})
    });
    if (typeof practiceToast === 'function') practiceToast(tx('coDryRunPrefix') + ' ' + (payload.preview && payload.preview.action), 'info');
  };

  CoachOS.runAutomationNow = async function (id) {
    const payload = await window.practiceFetch('/api/coach/automations/' + encodeURIComponent(id) + '/run', {
      method: 'POST',
      headers: window.practiceHeaders(true),
      body: JSON.stringify({})
    });
    const failed = payload.result && payload.result.failed;
    if (typeof practiceToast === 'function') {
      practiceToast(failed ? tx('coAutomationFailed') : tx('coAutomationRan'), failed ? 'danger' : 'success');
    }
  };
})();
