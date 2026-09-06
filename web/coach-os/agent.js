(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  const state = { run: null, message: '', busy: false };

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }

  function whyHtml(why) {
    const reasons = (why && why.reasons) || [];
    if (!reasons.length) return '';
    return '<div class="coach-os-muted" style="margin-top:8px;">WHY</div><div class="coach-os-list">' +
      reasons.map(function (reason) {
        return '<div class="coach-os-row"><span class="coach-os-row-main"><strong>' +
          escText(reason.statement || '') + '</strong><span>' +
          escText(JSON.stringify(reason.evidence || {})) + '</span></span>' +
          (why.viewData ? '<button class="btn btn-outline" style="font-size:9px;" onclick="CoachOS.openAgentViewData()">VIEW DATA</button>' : '') +
          '</div>';
      }).join('') + '</div>';
  }

  function render(container) {
    const run = state.run;
    const proposals = (run && run.proposals) || [];
    container.innerHTML =
      '<div class="coach-os-page">' +
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Nurvan Agent</div>' +
      '<h1 class="coach-os-title">Ask. Plan. Execute.</h1>' +
      '<p class="coach-os-subtitle">Intent → Plan → Preview → Confirmation → Result. Nessuna write senza conferma.</p></div></div>' +
      '<div class="coach-os-card">' +
      '<textarea id="coach-os-agent-input" rows="3" placeholder="Es. mostra i clienti inattivi, proponi un deload, crea un task…"' +
      ' style="width:100%;background:#0b0b0b;border:1px solid var(--co-border);color:#fff;border-radius:12px;padding:12px;">' +
      escText(state.message) + '</textarea>' +
      '<button class="btn" style="margin-top:10px;background:#111;color:#fff;" onclick="CoachOS.submitAgentRun()">ASK NURVAN</button></div>' +
      (run
        ? '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Intent</h2></div>' +
          '<div class="coach-os-card"><strong>' + escText(run.intent || (state.intent && state.intent.id) || '') +
          '</strong><div class="coach-os-muted">Plan: understand → preview → confirm</div></div></section>'
        : '') +
      (proposals.length
        ? '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Preview</h2></div>' +
          proposals.map(function (proposal, index) {
            return '<div class="coach-os-card" style="margin-bottom:10px;"><div class="coach-os-card-kicker">' +
              escText(proposal.toolId) + '</div><div class="coach-os-card-title">' + escText(proposal.summary) +
              '</div>' + whyHtml(proposal.why) +
              '<div class="coach-os-quick-actions" style="margin-top:10px;">' +
              '<button class="coach-os-action" onclick="CoachOS.confirmAgentProposal(' + index + ')">CONFIRM</button>' +
              '<button class="coach-os-action" onclick="CoachOS.undoAgentProposal(' + index + ')">UNDO</button>' +
              '<button class="coach-os-action" onclick="CoachOS.refreshAgentRun()">REFRESH DATA</button>' +
              '<button class="coach-os-action" onclick="CoachOS.submitAgentRun()">RE-PLAN</button></div></div>';
          }).join('') + '</section>'
        : '<div class="coach-os-empty">Chiedi un comando ristretto: inattivi, check-in mancanti, deload, messaggio o task.</div>') +
      (state.result
        ? '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Result</h2></div>' +
          '<div class="coach-os-card">' + escText(JSON.stringify(state.result)) + '</div></section>'
        : '') +
      (state.stale
        ? '<div class="coach-os-error">Questa proposta non è più aggiornata perché i dati sono cambiati.</div>'
        : '') +
      '</div>';
  }

  CoachOS.views.coachAgent = function (container) {
    render(container);
  };

  CoachOS.submitAgentRun = async function () {
    const input = document.getElementById('coach-os-agent-input');
    state.message = input ? input.value : state.message;
    const clientId = store.coachWorkspace && store.coachWorkspace.clientId;
    try {
      const payload = await window.practiceFetch('/api/coach/agent/runs', {
        method: 'POST',
        headers: window.practiceHeaders(true),
        body: JSON.stringify({ message: state.message, clientId: clientId || null })
      });
      state.run = payload.run;
      state.intent = payload.intent;
      state.stale = false;
      CoachOS.navigate('coachAgent');
    } catch (error) {
      if (typeof practiceToast === 'function') practiceToast(error.message || 'Agent non disponibile', 'error');
    }
  };

  CoachOS.confirmAgentProposal = async function (index) {
    const proposal = state.run && state.run.proposals && state.run.proposals[index];
    if (!proposal || !state.run) return;
    try {
      const payload = await window.practiceFetch('/api/coach/agent/runs/' + encodeURIComponent(state.run.id) + '/confirm', {
        method: 'POST',
        headers: window.practiceHeaders(true),
        body: JSON.stringify({
          proposalId: proposal.id,
          expectedRevision: proposal.expectedRevision,
          expectedFingerprint: proposal.expectedFingerprint,
          idempotencyKey: 'ui:' + proposal.id,
          targetSet: proposal.targetSet
        })
      });
      state.result = payload.result;
      state.stale = false;
      CoachOS.navigate('coachAgent');
    } catch (error) {
      if (error && error.code === 'STALE_PROPOSAL') state.stale = true;
      if (typeof practiceToast === 'function') practiceToast(error.message || 'Conferma rifiutata', 'warning');
      CoachOS.navigate('coachAgent');
    }
  };

  CoachOS.undoAgentProposal = async function (index) {
    const proposal = state.run && state.run.proposals && state.run.proposals[index];
    if (!proposal || !state.run) return;
    await window.practiceFetch('/api/coach/agent/runs/' + encodeURIComponent(state.run.id) + '/undo', {
      method: 'POST',
      headers: window.practiceHeaders(true),
      body: JSON.stringify({ proposalId: proposal.id })
    });
    if (typeof practiceToast === 'function') practiceToast('Azione annullata', 'info');
  };

  CoachOS.refreshAgentRun = CoachOS.submitAgentRun;
  CoachOS.openAgentViewData = function () {
    const clientId = store.coachWorkspace && store.coachWorkspace.clientId;
    if (clientId) openCoachClient(clientId);
    else CoachOS.navigate('coachHub');
  };
})();
