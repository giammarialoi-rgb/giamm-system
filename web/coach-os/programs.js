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

  function library() {
    if (!store.coachProgramLibrary) store.coachProgramLibrary = [];
    return store.coachProgramLibrary;
  }

  function domains(entry) {
    const payload = (entry && entry.payload) || {};
    const result = [];
    if ((payload.weeks || []).length) result.push(tx('coDomainWorkout'));
    if (payload.nutrition) result.push(tx('coNutrition'));
    if (payload.supplementation) result.push(tx('coDomainIntegration'));
    if (payload.therapy) result.push(tx('coDomainTherapy'));
    if (payload.exams) result.push(tx('coDomainExams'));
    return result;
  }

  function renderPrograms(container) {
    const rows = library().filter(function (entry) { return entry && !entry.archivedAt; });
    container.innerHTML =
      '<div class="coach-os-page">' +
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Coach OS</div>' +
      '<h1 class="coach-os-title">' + escText(tx('coPrograms')) + '</h1>' +
      '<p class="coach-os-subtitle">' + escText(tx('coProgramsSubtitle')) + '</p></div></div>' +

      '<div class="coach-os-grid-2">' +
      '<button type="button" class="coach-os-card coach-os-card-primary" style="text-align:left;cursor:pointer;" onclick="CoachOS.openNativeImport()">' +
      '<div class="coach-os-card-kicker">' + escText(tx('coSmartImport')) + '</div><div class="coach-os-card-title">' + escText(tx('coImportProgramTitle')) + '</div>' +
      '<div class="coach-os-muted">' + escText(tx('coImportHint')) + '</div></button>' +
      '<button type="button" class="coach-os-card" style="text-align:left;cursor:pointer;" onclick="CoachOS.openNurvanCatalog()">' +
      '<div class="coach-os-card-kicker">' + escText(tx('coProgramBuilder')) + '</div><div class="coach-os-card-title">' + escText(tx('coCreateProgram')) + '</div>' +
      '<div class="coach-os-muted">' + escText(tx('coCreateHint')) + '</div></button></div>' +

      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">' + escText(tx('coCoachDatabase')) + '</h2>' +
      '<span class="coach-os-muted">' + rows.length + ' ' + escText(tx('coProgramsCount')) + '</span></div>' +
      (rows.length
        ? '<div class="coach-os-list">' + rows.map(function (entry) {
          const ds = domains(entry);
          const weeks = entry.meta && entry.meta.weeks ? entry.meta.weeks : ((entry.payload && entry.payload.weeks || []).length);
          return '<div class="coach-os-row" style="cursor:default;">' +
            '<span class="coach-os-row-main"><strong>' + escText(entry.title || tx('coPrograms')) + '</strong>' +
            '<span>' + (weeks ? weeks + ' ' + tx('coWeeks') : tx('coDomainPlan')) +
            (ds.length ? ' · ' + escText(ds.join(', ')) : '') + '</span></span>' +
            '<button type="button" class="btn btn-primary" style="font-size:9px;padding:7px 9px;" onclick="CoachOS.chooseClientForProgram(\'' +
            escText(entry.id) + '\')">' + escText(tx('coAssign')) + '</button>' +
            '<button type="button" class="btn btn-outline" style="font-size:9px;padding:7px 9px;" onclick="CoachOS.programMenu(\'' +
            escText(entry.id) + '\')">•••</button></div>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">' + escText(tx('coProgramEmpty')) + '</div>') +
      '</section><div style="height:28px;"></div></div>';
  }

  function resetImportState() {
    const state = window.programImportState || (typeof programImportState !== 'undefined' ? programImportState : null);
    if (!state) return;
    state.importDomain = 'all';
    state.canonicalProgram = null;
    state.currentImportId = null;
    state.isAnalyzing = false;
    state.isConfirming = false;
    state.selectedDomains = null;
  }

  function openNativeImport() {
    store.__coachOsNativeImport = true;
    store.__cpCoachLibraryImport = true;
    store.coachSessionActive = true;
    resetImportState();
    if (typeof persist === 'function') persist();
    CoachOS.navigate('coachImport');
  }

  function renderNativeImport(container) {
    if (!store.__coachOsNativeImport) store.__coachOsNativeImport = true;
    store.__cpCoachLibraryImport = true;
    if (typeof renderImport === 'function') renderImport(container);
    const first = container.firstElementChild;
    if (first) first.classList.add('coach-os-page');
  }

  function openNurvanCatalog() {
    store.__coachOsProgramCatalog = true;
    if (typeof persist === 'function') persist();
    // Reuse the stable catalog renderer while the Coach shell remains active.
    if (typeof currentView !== 'undefined') currentView = 'programs';
    if (typeof render === 'function') render();
  }

  async function ensureClients() {
    if (Array.isArray(store.__cpClientList) && store.__cpClientList.length) return store.__cpClientList;
    const payload = await practiceFetch('/api/coach/clients?limit=40', {
      method: 'GET',
      headers: practiceHeaders(false)
    }, 15000);
    store.__cpClientList = (payload && payload.clients) || [];
    return store.__cpClientList;
  }

  async function chooseClientForProgram(entryId) {
    try {
      const clients = await ensureClients();
      ensurePracticeOverlays();
      const panel = document.getElementById('cp-assign-panel');
      if (!panel) return;
      panel.innerHTML =
        '<div class="coach-os-card-kicker">' + escText(tx('coAssignProgram')) + '</div><h2>' + escText(tx('coChooseClient')) + '</h2>' +
        (clients.length
          ? '<div class="coach-os-list" style="max-height:52vh;overflow:auto;">' + clients.map(function (client) {
            return '<button type="button" class="coach-os-row" onclick="CoachOS.assignProgramToClient(\'' +
              escText(entryId) + '\',\'' + escText(client.id) + '\')"><span class="coach-os-row-main"><strong>' +
              escText(client.displayName || client.username || tx('coClientFallback')) + '</strong><span>' +
              escText(client.status || tx('coFilterActive')) + '</span></span><span>›</span></button>';
          }).join('') + '</div>'
          : '<div class="coach-os-empty">' + escText(tx('coAddClientFirst')) + '</div>') +
        '<button class="btn btn-outline" style="width:100%;margin-top:12px;" onclick="showOverlay(\'cp-assign\',false)">' + escText(tx('coCancel')) + '</button>';
      showOverlay('cp-assign', true);
    } catch (error) {
      practiceToast((error && error.message) || 'Clienti non disponibili', 'danger');
    }
  }

  function assignProgramToClient(entryId, clientId) {
    const client = (store.__cpClientList || []).find(function (row) {
      return String(row.id) === String(clientId);
    });
    showOverlay('cp-assign', false);
    if (typeof applyCoachLibraryToAssign === 'function') {
      applyCoachLibraryToAssign(clientId, client && (client.displayName || client.username) || 'Cliente', entryId);
    }
  }

  function duplicateProgram(entry) {
    let payload = entry.payload;
    try { payload = JSON.parse(JSON.stringify(entry.payload)); } catch (_) {}
    const copy = Object.assign({}, entry, {
      id: 'cpl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      title: (entry.title || tx('coPrograms')) + tx('coCopySuffix'),
      payload: payload,
      savedAt: new Date().toISOString(),
      archivedAt: null
    });
    library().unshift(copy);
    persist();
    if (typeof scheduleAccountSync === 'function') scheduleAccountSync();
    render();
  }

  function exportProgram(entry) {
    const blob = new Blob([JSON.stringify(entry.payload || {}, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = String(entry.title || 'nurvan-program').replace(/[^a-z0-9_-]/gi, '_') + '.json';
    anchor.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function programMenu(entryId) {
    const entry = library().find(function (row) { return row && row.id === entryId; });
    if (!entry) return;
    ensurePracticeOverlays();
    const panel = document.getElementById('cp-assign-panel');
    if (!panel) return;
    panel.innerHTML =
      '<div class="coach-os-card-kicker">' + escText(tx('coProgramActions')) + '</div><h2>' + escText(entry.title || tx('coPrograms')) + '</h2>' +
      '<button class="btn btn-primary" style="width:100%;margin-bottom:8px;" onclick="showOverlay(\'cp-assign\',false);CoachOS.chooseClientForProgram(\'' +
      escText(entry.id) + '\')">' + escText(tx('coAssign')) + '</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="showOverlay(\'cp-assign\',false);CoachOS.duplicateProgram(\'' +
      escText(entry.id) + '\')">' + escText(tx('coDuplicate')) + '</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="showOverlay(\'cp-assign\',false);CoachOS.exportProgram(\'' +
      escText(entry.id) + '\')">' + escText(tx('coExport')) + '</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="CoachOS.archiveProgram(\'' +
      escText(entry.id) + '\')">' + escText(tx('coArchive')) + '</button>' +
      '<button class="btn btn-outline" style="width:100%;" onclick="showOverlay(\'cp-assign\',false)">' + escText(tx('coClose')) + '</button>';
    showOverlay('cp-assign', true);
  }

  function withEntry(entryId, fn) {
    const entry = library().find(function (row) { return row && row.id === entryId; });
    if (entry) fn(entry);
  }

  function afterNativeImport(entry) {
    store.__coachOsNativeImport = false;
    store.__cpCoachLibraryImport = false;
    if (typeof persist === 'function') persist();
    CoachOS.navigate('coachPrograms');
    setTimeout(function () {
      ensurePracticeOverlays();
      const panel = document.getElementById('cp-assign-panel');
      if (!panel) return;
      panel.innerHTML =
        '<div class="coach-os-card-kicker">' + escText(tx('coImportComplete')) + '</div><h2>' + escText(tx('coProgramSaved')) + '</h2>' +
        '<p class="cp-help">' + escText(entry.title || tx('coPrograms')) + ' ' + escText(tx('coAssignNow')) + '</p>' +
        '<button class="btn btn-primary" style="width:100%;margin-bottom:8px;" onclick="showOverlay(\'cp-assign\',false);CoachOS.chooseClientForProgram(\'' +
        escText(entry.id) + '\')">' + escText(tx('coAssignToClient')) + '</button>' +
        '<button class="btn btn-outline" style="width:100%;" onclick="showOverlay(\'cp-assign\',false)">' + escText(tx('coDone')) + '</button>';
      showOverlay('cp-assign', true);
    }, 0);
  }

  CoachOS.openNativeImport = openNativeImport;
  CoachOS.openNurvanCatalog = openNurvanCatalog;
  CoachOS.chooseClientForProgram = chooseClientForProgram;
  CoachOS.assignProgramToClient = assignProgramToClient;
  CoachOS.programMenu = programMenu;
  CoachOS.duplicateProgram = function (id) { withEntry(id, duplicateProgram); };
  CoachOS.exportProgram = function (id) { withEntry(id, exportProgram); };
  CoachOS.archiveProgram = function (id) {
    withEntry(id, function (entry) {
      if (!confirm(tx('coArchiveConfirm'))) return;
      entry.archivedAt = new Date().toISOString();
      persist();
      if (typeof scheduleAccountSync === 'function') scheduleAccountSync();
      showOverlay('cp-assign', false);
      render();
    });
  };
  CoachOS.afterNativeImport = afterNativeImport;
  CoachOS.registerView('coachPrograms', renderPrograms);
  CoachOS.registerView('coachImport', renderNativeImport);
})();
