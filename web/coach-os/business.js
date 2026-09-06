(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }

  function euros(cents) {
    return '€' + (Number(cents || 0) / 100).toFixed(0);
  }

  CoachOS.views.coachBusiness = async function (container) {
    container.innerHTML = '<div class="coach-os-skeleton">Loading ledger…</div>';
    const data = await window.practiceFetch('/api/coach/business', { headers: window.practiceHeaders() });
    const summary = data.summary || {};
    container.innerHTML =
      '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Manual ledger</div>' +
      '<h1 class="coach-os-title">Business</h1><p class="coach-os-subtitle">Nessuno Stripe. Piano, rinnovo e overdue.</p></div></div>' +
      '<div class="coach-os-card coach-os-kpis">' +
      [['Active', summary.activeClients || 0], ['Revenue 30d', euros(summary.revenue30dCents)], ['MRR', euros(summary.mrrCents)], ['Overdue', summary.overdue || 0]]
        .map(function (row) {
          return '<div class="coach-os-kpi"><strong>' + escText(row[1]) + '</strong><span>' + escText(row[0]) + '</span></div>';
        }).join('') + '</div></div>';
  };

  CoachOS.views.coachCrm = async function (container) {
    const data = await window.practiceFetch('/api/coach/crm', { headers: window.practiceHeaders() });
    const rows = data.pipeline || [];
    container.innerHTML =
      '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Pipeline</div>' +
      '<h1 class="coach-os-title">CRM</h1></div></div>' +
      (rows.length
        ? '<div class="coach-os-list">' + rows.map(function (row) {
          return '<button class="coach-os-row" onclick="openCoachClient(\'' + escText(row.id) + '\')"><span class="coach-os-row-main"><strong>' +
            escText(row.name) + '</strong><span>' + escText(row.stage) + (row.nextAction ? ' · ' + escText(row.nextAction) : '') +
            '</span></span></button>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">Nessun cliente in pipeline.</div>') + '</div>';
  };

  CoachOS.views.coachAutomations = async function (container) {
    const data = await window.practiceFetch('/api/coach/automations', { headers: window.practiceHeaders() });
    const rows = data.rules || [];
    container.innerHTML =
      '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Rules</div>' +
      '<h1 class="coach-os-title">Automations</h1><p class="coach-os-subtitle">Trigger, condizione, azione. Dry-run prima di abilitare.</p></div>' +
      '<button class="btn btn-outline" onclick="CoachOS.createAutomationPrompt()">NEW RULE</button></div>' +
      (rows.length
        ? '<div class="coach-os-list">' + rows.map(function (row) {
          return '<div class="coach-os-row"><span class="coach-os-row-main"><strong>' + escText(row.name) +
            '</strong><span>' + escText(row.trigger) + ' → ' + escText(row.action) + '</span></span>' +
            '<button class="btn btn-outline" style="font-size:9px;" onclick="CoachOS.dryRunAutomation(\'' +
            escText(row.id) + '\')">DRY RUN</button></div>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">Nessuna automation. Restano fuori dall’Agent V1.</div>') + '</div>';
  };

  CoachOS.createAutomationPrompt = async function () {
    const name = window.prompt('Nome automation', 'Check-in received → task');
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
    if (typeof practiceToast === 'function') practiceToast('Dry-run: ' + (payload.preview && payload.preview.action), 'info');
  };
})();
