(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }

  function library() {
    if (!store.coachProgramLibrary) store.coachProgramLibrary = [];
    return store.coachProgramLibrary;
  }

  function domains(entry) {
    const payload = (entry && entry.payload) || {};
    const result = [];
    if ((payload.weeks || []).length) result.push('Workout');
    if (payload.nutrition) result.push('Nutrition');
    if (payload.supplementation) result.push('Integration');
    if (payload.therapy) result.push('Therapy');
    if (payload.exams) result.push('Exams');
    return result;
  }

  function renderPrograms(container) {
    const rows = library().filter(function (entry) { return entry && !entry.archivedAt; });
    container.innerHTML =
      '<div class="coach-os-page">' +
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Coach OS</div>' +
      '<h1 class="coach-os-title">Programs</h1>' +
      '<p class="coach-os-subtitle">Importa, crea e assegna programmi senza uscire dal Coach OS.</p></div></div>' +

      '<div class="coach-os-grid-2">' +
      '<button type="button" class="coach-os-card coach-os-card-primary" style="text-align:left;cursor:pointer;" onclick="CoachOS.openNativeImport()">' +
      '<div class="coach-os-card-kicker">Smart import</div><div class="coach-os-card-title">Import Program</div>' +
      '<div class="coach-os-muted">PDF, Excel, Word, immagini. Scegli sempre i domini.</div></button>' +
      '<button type="button" class="coach-os-card" style="text-align:left;cursor:pointer;" onclick="CoachOS.openNurvanCatalog()">' +
      '<div class="coach-os-card-kicker">Program builder</div><div class="coach-os-card-title">Create program</div>' +
      '<div class="coach-os-muted">Catalogo Nurvan o generazione rules-based.</div></button></div>' +

      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Coach database</h2>' +
      '<span class="coach-os-muted">' + rows.length + ' programs</span></div>' +
      (rows.length
        ? '<div class="coach-os-list">' + rows.map(function (entry) {
          const ds = domains(entry);
          const weeks = entry.meta && entry.meta.weeks ? entry.meta.weeks : ((entry.payload && entry.payload.weeks || []).length);
          return '<div class="coach-os-row" style="cursor:default;">' +
            '<span class="coach-os-row-main"><strong>' + escText(entry.title || 'Program') + '</strong>' +
            '<span>' + (weeks ? weeks + ' weeks' : 'Domain plan') +
            (ds.length ? ' · ' + escText(ds.join(', ')) : '') + '</span></span>' +
            '<button type="button" class="btn btn-primary" style="font-size:9px;padding:7px 9px;" onclick="CoachOS.chooseClientForProgram(\'' +
            escText(entry.id) + '\')">ASSIGN</button>' +
            '<button type="button" class="btn btn-outline" style="font-size:9px;padding:7px 9px;" onclick="CoachOS.programMenu(\'' +
            escText(entry.id) + '\')">•••</button></div>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">Il database è vuoto.<br>Importa il primo programma mantenendo il domain picker esplicito.</div>') +
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
        '<div class="coach-os-card-kicker">Assign program</div><h2>Scegli il cliente</h2>' +
        (clients.length
          ? '<div class="coach-os-list" style="max-height:52vh;overflow:auto;">' + clients.map(function (client) {
            return '<button type="button" class="coach-os-row" onclick="CoachOS.assignProgramToClient(\'' +
              escText(entryId) + '\',\'' + escText(client.id) + '\')"><span class="coach-os-row-main"><strong>' +
              escText(client.displayName || client.username || 'Cliente') + '</strong><span>' +
              escText(client.status || 'active') + '</span></span><span>›</span></button>';
          }).join('') + '</div>'
          : '<div class="coach-os-empty">Aggiungi prima un cliente.</div>') +
        '<button class="btn btn-outline" style="width:100%;margin-top:12px;" onclick="showOverlay(\'cp-assign\',false)">ANNULLA</button>';
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
      title: (entry.title || 'Program') + ' · Copy',
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
      '<div class="coach-os-card-kicker">Program actions</div><h2>' + escText(entry.title || 'Program') + '</h2>' +
      '<button class="btn btn-primary" style="width:100%;margin-bottom:8px;" onclick="showOverlay(\'cp-assign\',false);CoachOS.chooseClientForProgram(\'' +
      escText(entry.id) + '\')">ASSIGN</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="showOverlay(\'cp-assign\',false);CoachOS.duplicateProgram(\'' +
      escText(entry.id) + '\')">DUPLICATE</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="showOverlay(\'cp-assign\',false);CoachOS.exportProgram(\'' +
      escText(entry.id) + '\')">EXPORT</button>' +
      '<button class="btn btn-outline" style="width:100%;margin-bottom:8px;" onclick="CoachOS.archiveProgram(\'' +
      escText(entry.id) + '\')">ARCHIVE</button>' +
      '<button class="btn btn-outline" style="width:100%;" onclick="showOverlay(\'cp-assign\',false)">CLOSE</button>';
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
        '<div class="coach-os-card-kicker">Import complete</div><h2>Program saved</h2>' +
        '<p class="cp-help">' + escText(entry.title || 'Program') + ' è nel Coach Database. Vuoi assegnarlo ora?</p>' +
        '<button class="btn btn-primary" style="width:100%;margin-bottom:8px;" onclick="showOverlay(\'cp-assign\',false);CoachOS.chooseClientForProgram(\'' +
        escText(entry.id) + '\')">ASSIGN TO CLIENT</button>' +
        '<button class="btn btn-outline" style="width:100%;" onclick="showOverlay(\'cp-assign\',false)">DONE</button>';
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
      if (!confirm('Archiviare questo programma?')) return;
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
