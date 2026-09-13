import fs from 'fs';

// Read prepare_task20_views_and_handlers.mjs content and update
let code = fs.readFileSync('prepare_task20_views_and_handlers.mjs', 'utf8');

// Ensure renderPrograms and renderImport are included
const addition = `
// ====================================================
// TASK 20: PROGRAM MANAGEMENT & LIBRARY VIEW
// ====================================================
function renderPrograms(c){
  const weeks = DATA?.weeks || [];
  const duration = DATA?.duration_weeks || weeks.length || 0;
  const sessionsCount = weeks.reduce((sum, w) => sum + ((w.sessions || w.days || []).length), 0);
  let totalExercises = 0;
  let totalSets = 0;
  weeks.forEach(w => (w.sessions || w.days || []).forEach(s => (s.exercises || s.rows || []).forEach(e => {
    totalExercises++;
    totalSets += (e.sets?.length || e.setCount || 3);
  })));

  const hasNutr = DATA?.nutrition?.present && (DATA.nutrition.days?.length > 0);
  const hasSupp = DATA?.supplementation?.present && (DATA.supplementation.items?.length > 0);
  const hasTherapy = DATA?.therapy?.present && (DATA.therapy.medications?.length > 0);
  const hasExams = DATA?.exams?.present && ((DATA.exams.records || DATA.exams.items || []).length > 0);

  c.innerHTML = \`
    <div style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div>
        <span style="font-size:10px; color:var(--gold); font-weight:800; letter-spacing:1.5px; text-transform:uppercase;">PROGRAM MANAGEMENT</span>
        <h2 style="font-size:18px; margin:2px 0 0; color:#fff; font-weight:900;">LIBRERIA PROGRAMMI</h2>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-outline" style="font-size:11px; padding:6px 12px; border-color:var(--gold); color:var(--gold);" onclick="navigate('import')">📥 IMPORTA SCHEDA</button>
        <button class="btn btn-primary" style="font-size:11px; padding:6px 12px;" onclick="exportActiveProgram()">ESPORTA JSON</button>
      </div>
    </div>

    <!-- Active Program Card -->
    <div class="card" style="margin-bottom:16px; border:2px solid var(--gold); position:relative; overflow:hidden;">
      <div style="position:absolute; top:0; right:0; background:var(--gold); color:#000; font-size:9px; font-weight:900; padding:3px 10px; border-bottom-left-radius:6px; letter-spacing:1px;">ATTIVO</div>
      <div class="card-header" style="padding-bottom:8px;">
        <span style="font-size:11px; color:var(--gold); font-weight:800; text-transform:uppercase;">Programma Attivo</span>
        <h3 style="font-size:18px; margin:4px 0 0; color:#fff; font-weight:800;">\${esc(DATA?.title || DATA?.programTitle || 'Programma Senza Titolo')}</h3>
        <p style="font-size:11px; color:#888; margin:2px 0 0;">Autore: \${esc(DATA?.author || 'Coach')} • Durata: \${duration} Settimane</p>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; margin:12px 0;">
        <div class="card" style="padding:10px; background:rgba(255,255,255,0.02); text-align:center;">
          <div style="font-size:18px; font-weight:900; color:var(--gold);">\${duration}</div>
          <div style="font-size:9px; color:#888; text-transform:uppercase; font-weight:700;">Settimane</div>
        </div>
        <div class="card" style="padding:10px; background:rgba(255,255,255,0.02); text-align:center;">
          <div style="font-size:18px; font-weight:900; color:var(--gold);">\${sessionsCount}</div>
          <div style="font-size:9px; color:#888; text-transform:uppercase; font-weight:700;">Sedute Totali</div>
        </div>
        <div class="card" style="padding:10px; background:rgba(255,255,255,0.02); text-align:center;">
          <div style="font-size:18px; font-weight:900; color:var(--gold);">\${totalExercises}</div>
          <div style="font-size:9px; color:#888; text-transform:uppercase; font-weight:700;">Esercizi</div>
        </div>
        <div class="card" style="padding:10px; background:rgba(255,255,255,0.02); text-align:center;">
          <div style="font-size:18px; font-weight:900; color:var(--gold);">\${totalSets}</div>
          <div style="font-size:9px; color:#888; text-transform:uppercase; font-weight:700;">Serie Totali</div>
        </div>
      </div>

      <!-- Domain Status -->
      <div style="border-top:1px solid #222; padding-top:10px; margin-top:8px;">
        <div style="font-size:10px; color:#888; text-transform:uppercase; font-weight:800; margin-bottom:8px;">Ambiti Inclusi</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          <span style="font-size:10px; font-weight:800; padding:4px 8px; border-radius:4px; background:rgba(212,175,55,0.15); color:var(--gold); border:1px solid rgba(212,175,55,0.3);">🏋️ ALLENAMENTO (Attivo)</span>
          <span style="font-size:10px; font-weight:800; padding:4px 8px; border-radius:4px; \${hasNutr ? 'background:rgba(76,175,80,0.15); color:#4caf50; border:1px solid rgba(76,175,80,0.3);' : 'background:#1a1a1a; color:#555; border:1px solid #2a2a2a;'}">🥗 ALIMENTAZIONE (\${hasNutr ? 'Inclusa' : 'Non presente'})</span>
          <span style="font-size:10px; font-weight:800; padding:4px 8px; border-radius:4px; \${hasSupp ? 'background:rgba(33,150,243,0.15); color:#2196f3; border:1px solid rgba(33,150,243,0.3);' : 'background:#1a1a1a; color:#555; border:1px solid #2a2a2a;'}">💊 INTEGRAZIONE (\${hasSupp ? 'Inclusa' : 'Non presente'})</span>
          <span style="font-size:10px; font-weight:800; padding:4px 8px; border-radius:4px; \${hasTherapy ? 'background:rgba(156,39,176,0.15); color:#ab47bc; border:1px solid rgba(156,39,176,0.3);' : 'background:#1a1a1a; color:#555; border:1px solid #2a2a2a;'}">🩺 TERAPIA (\${hasTherapy ? 'Inclusa' : 'Non presente'})</span>
          <span style="font-size:10px; font-weight:800; padding:4px 8px; border-radius:4px; \${hasExams ? 'background:rgba(0,188,212,0.15); color:#26c6da; border:1px solid rgba(0,188,212,0.3);' : 'background:#1a1a1a; color:#555; border:1px solid #2a2a2a;'}">🧪 ESAMI (\${hasExams ? 'Inclusi' : 'Non presenti'})</span>
        </div>
      </div>
    </div>

    <!-- Models / Templates Section -->
    <div class="card">
      <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="font-size:14px; color:var(--gold); font-weight:800;">ARCHIVIO MODELLI & TEMPLATE</h3>
        <span style="font-size:10px; color:#666;">\${(store.models || []).length} Modelli</span>
      </div>
      <div style="margin-top:10px;">
        \${(store.models && store.models.length > 0) ? store.models.map((m, idx) => \`
          <div style="padding:10px; margin-bottom:8px; background:rgba(255,255,255,0.02); border:1px solid #222; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:13px; font-weight:800; color:#eee;">\${esc(m.title || m.name || 'Modello ' + (idx+1))}</div>
              <div style="font-size:10px; color:#777;">Creato il: \${esc(m.createdAt || 'N/D')} • \${m.weeksCount || 0} Settimane</div>
            </div>
            <button class="btn btn-outline" style="font-size:10px; padding:4px 8px;" onclick="loadModelAsActive(\${idx})">Carica</button>
          </div>
        \`).join('') : '<div style=\"font-size:12px; color:#666; text-align:center; padding:16px;\">Nessun modello archiviato. Importa o salva un template per vederlo qui.</div>'}
      </div>
    </div>
  \`;
}

function exportActiveProgram() {
  if (!DATA) {
    showToast("Nessun programma attivo da esportare", "error");
    return;
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(DATA, null, 2));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", dataStr);
  const title = (DATA.title || DATA.programTitle || 'giammaria_system_program').replace(/[^a-z0-9_]/gi, '_').toLowerCase();
  dlAnchorElem.setAttribute("download", title + ".json");
  dlAnchorElem.click();
  showToast("Programma esportato con successo!", "success");
}

// ====================================================
// TASK 20: UNIVERSAL IMPORT VIEW (MULTI-DOMAIN REVIEW UX)
// ====================================================
function renderImport(c){
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  const prog = pState?.canonicalProgram;

  if (pState && pState.isAnalyzing) {
    c.innerHTML = \`
      <div class="card" style="text-align:center; padding:40px 20px;">
        <div style="font-size:32px; margin-bottom:16px;">⚙️</div>
        <h2 style="font-size:18px; color:var(--gold); margin-bottom:8px;">ANALISI DOCUMENTO IN CORSO...</h2>
        <p style="font-size:12px; color:#888;">Estrazione matriciale 2D, normalizzazione esercizi e rilevamento multi-dominio.</p>
      </div>
    \`;
    return;
  }

  if (prog) {
    const activeTab = pState.activeReviewTab || 'training';
    const weeks = prog.weeks || [];
    const nutr = prog.nutrition;
    const supp = prog.supplementation;
    const therapy = prog.therapy;
    const exams = prog.exams;

    c.innerHTML = \`
      <div style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <span style="font-size:10px; color:var(--gold); font-weight:800; letter-spacing:1.5px; text-transform:uppercase;">REVISIONE INTERATTIVA</span>
          <h2 style="font-size:18px; margin:2px 0 0; color:#fff; font-weight:900;">CONFERMA IMPORTAZIONE</h2>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-outline" style="font-size:11px; padding:6px 12px;" onclick="cancelCurrentImportReview()">ANNULLA</button>
          <button class="btn btn-primary" style="font-size:11px; padding:6px 14px;" onclick="confirmImportAndActivate()">\${pState.isConfirming ? 'ATTIVAZIONE...' : '✓ CONFERMA & ATTIVA'}</button>
        </div>
      </div>

      <!-- Domain Navigation Pills -->
      <div class="pill-tabs" style="margin-bottom:14px;">
        <button class="pill-tab \${activeTab === 'training' ? 'active' : ''}" onclick="switchReviewTab('training')">🏋️ Allenamento (\${weeks.length}W)</button>
        \${nutr?.present || (nutr?.days?.length > 0) ? \`<button class="pill-tab \${activeTab === 'nutrition' ? 'active' : ''}" onclick="switchReviewTab('nutrition')">🥗 Alimentazione (\${nutr.days?.length || 0}G)</button>\` : ''}
        \${supp?.present || (supp?.items?.length > 0) ? \`<button class="pill-tab \${activeTab === 'supplements' ? 'active' : ''}" onclick="switchReviewTab('supplements')">💊 Integrazione (\${supp.items?.length || 0})</button>\` : ''}
        \${therapy?.present || (therapy?.medications?.length > 0) ? \`<button class="pill-tab \${activeTab === 'therapy' ? 'active' : ''}" onclick="switchReviewTab('therapy')">🩺 Terapia (\${therapy.medications?.length || 0})</button>\` : ''}
        \${exams?.present || ((exams?.records || exams?.items || []).length > 0) ? \`<button class="pill-tab \${activeTab === 'exams' ? 'active' : ''}" onclick="switchReviewTab('exams')">🧪 Esami (\${(exams.records || exams.items || []).length})</button>\` : ''}
      </div>

      <!-- Main Review Area -->
      <div id="import-review-body">
        \${activeTab === 'training' ? renderReviewTraining(prog) : ''}
        \${activeTab === 'nutrition' ? renderReviewNutrition(nutr) : ''}
        \${activeTab === 'supplements' ? renderReviewSupplements(supp) : ''}
        \${activeTab === 'therapy' ? renderReviewTherapy(therapy) : ''}
        \${activeTab === 'exams' ? renderReviewExams(exams) : ''}
      </div>
    \`;
    return;
  }

  // Initial Import Dropzone & Mode Selector
  c.innerHTML = \`
    <div style="margin-bottom:16px;">
      <span style="font-size:10px; color:var(--gold); font-weight:800; letter-spacing:1.5px; text-transform:uppercase;">UNIVERSAL IMPORT ENGINE 2.1</span>
      <h2 style="font-size:18px; margin:2px 0 0; color:#fff; font-weight:900;">IMPORTA SCHEDA O DOCUMENTO</h2>
    </div>

    <div class="card" style="margin-bottom:14px; text-align:center; padding:24px 16px; border:2px dashed var(--border);">
      <div style="font-size:36px; margin-bottom:8px;">📥</div>
      <h3 style="font-size:14px; color:#fff; font-weight:800; margin-bottom:4px;">Carica File o Incolla Testo</h3>
      <p style="font-size:11px; color:#888; max-width:400px; margin:0 auto 16px;">Supporta XLSX, XLS, CSV, TXT, PDF esportato e Programmi JSON.</p>
      
      <input type="file" id="universal-file-input" style="display:none;" accept=".xlsx,.xls,.csv,.txt,.json" onchange="handleImportFileSelected(event)">
      <button class="btn btn-primary" style="font-size:12px; padding:10px 20px;" onclick="$('universal-file-input').click()">SELEZIONA FILE</button>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 style="font-size:13px; color:var(--gold); font-weight:800;">OPPURE INCOLLA TESTO SCHEDA</h3>
      </div>
      <textarea id="import-raw-text" class="input" style="height:120px; font-family:monospace; font-size:11px; resize:vertical;" placeholder="Incolla qui il testo di allenamento, dieta, integrazione o terapia..."></textarea>
      <button class="btn btn-outline" style="width:100%; margin-top:8px; font-size:11px; padding:8px;" onclick="handleImportTextSubmit()">ANALIZZA TESTO</button>
    </div>
  \`;
}

function renderReviewTraining(prog) {
  const weeks = prog.weeks || [];
  return \`
    <div class="card" style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <label style="font-size:11px; font-weight:800; color:var(--gold);">TITOLO SCHEDA:</label>
        <input type="text" class="input" style="flex:1; margin-left:10px; font-size:12px; padding:4px 8px;" value="\${esc(prog.title || 'Programma Importato')}" onchange="updateReviewTitle(this.value)">
      </div>
    </div>
    \${weeks.map((w, wIdx) => \`
      <div class="card" style="margin-bottom:12px;">
        <h3 style="font-size:14px; color:var(--gold); font-weight:800; margin-bottom:8px;">\${esc(w.label || 'Settimana ' + (w.weekNumber || (wIdx+1)))}</h3>
        \${(w.sessions || w.days || []).map((s, sIdx) => \`
          <div style="background:rgba(255,255,255,0.02); border:1px solid #222; border-radius:6px; padding:8px; margin-bottom:8px;">
            <div style="font-size:12px; font-weight:800; color:#ddd; margin-bottom:6px;">\${esc(s.name || 'Seduta ' + (sIdx+1))}</div>
            \${(s.exercises || s.rows || []).map((ex, exIdx) => \`
              <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px; font-size:11px;">
                <input type="text" class="input" style="flex:3; font-size:11px; padding:4px;" value="\${esc(ex.name_normalized || ex.name || ex.exercise || '')}" onchange="updateReviewExerciseField(\${wIdx}, \${sIdx}, \${exIdx}, 'name', this.value)">
                <input type="text" class="input" style="flex:1; font-size:11px; padding:4px; text-align:center;" value="\${esc(ex.reps_target || ex.reps || '8-10')}" placeholder="Reps" onchange="updateReviewExerciseField(\${wIdx}, \${sIdx}, \${exIdx}, 'reps', this.value)">
                <input type="number" class="input" style="width:50px; font-size:11px; padding:4px; text-align:center;" value="\${ex.rir_target !== undefined ? ex.rir_target : 2}" placeholder="RIR" onchange="updateReviewExerciseField(\${wIdx}, \${sIdx}, \${exIdx}, 'rir', parseFloat(this.value))">
              </div>
            \`).join('')}
          </div>
        \`).join('')}
      </div>
    \`).join('')}
  \`;
}

function renderReviewNutrition(nutr) {
  if (!nutr || !nutr.days) return '<div class="card">Nessun dato nutrizione</div>';
  return nutr.days.map((d, dIdx) => \`
    <div class="card" style="margin-bottom:12px;">
      <h3 style="font-size:13px; color:var(--gold); font-weight:800; margin-bottom:8px;">\${esc(d.day || d.day_name || 'Giorno ' + (dIdx+1))}</h3>
      \${(d.meals || []).map((m, mIdx) => \`
        <div style="background:rgba(255,255,255,0.02); border:1px solid #222; border-radius:6px; padding:8px; margin-bottom:8px;">
          <div style="font-size:11px; font-weight:800; color:#4caf50; margin-bottom:6px;">\${esc(m.name || m.meal_name || 'Pasto')}</div>
          \${(m.foods || m.items || []).map((f, fIdx) => \`
            <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px; font-size:11px;">
              <input type="text" class="input" style="flex:3; font-size:11px; padding:4px;" value="\${esc(f.name || f.food || '')}" onchange="updateReviewMealItem(\${dIdx}, \${mIdx}, \${fIdx}, 'name', this.value)">
              <input type="text" class="input" style="flex:1; font-size:11px; padding:4px; text-align:center;" value="\${esc(f.quantity || '')}" placeholder="Qta" onchange="updateReviewMealItem(\${dIdx}, \${mIdx}, \${fIdx}, 'quantity', this.value)">
              <input type="text" class="input" style="width:40px; font-size:11px; padding:4px; text-align:center;" value="\${esc(f.unit || 'g')}" placeholder="Unit" onchange="updateReviewMealItem(\${dIdx}, \${mIdx}, \${fIdx}, 'unit', this.value)">
              <button class="btn btn-outline" style="color:var(--accent-red); padding:4px 6px; font-size:10px;" onclick="removeReviewMealItem(\${dIdx}, \${mIdx}, \${fIdx})">✕</button>
            </div>
          \`).join('')}
          <button class="btn btn-outline" style="font-size:9px; padding:3px 6px; margin-top:4px;" onclick="addReviewMealItem(\${dIdx}, \${mIdx})">+ Alimento</button>
        </div>
      \`).join('')}
    </div>
  \`).join('');
}

function renderReviewSupplements(supp) {
  if (!supp || !supp.items) return '<div class="card">Nessun dato integrazione</div>';
  return \`
    <div class="card">
      <h3 style="font-size:13px; color:var(--gold); font-weight:800; margin-bottom:10px;">INTEGRAZIONE RILEVATA</h3>
      \${supp.items.map((item, idx) => \`
        <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px; font-size:11px;">
          <input type="text" class="input" style="flex:3; font-size:11px; padding:4px;" value="\${esc(item.name || '')}" onchange="updateReviewSupplementItem(\${idx}, 'name', this.value)">
          <input type="text" class="input" style="flex:1; font-size:11px; padding:4px; text-align:center;" value="\${esc(item.dose || item.dosage || '')}" placeholder="Dose" onchange="updateReviewSupplementItem(\${idx}, 'dose', this.value)">
          <input type="text" class="input" style="flex:1.5; font-size:11px; padding:4px; text-align:center;" value="\${esc(item.timing || 'Mattina')}" placeholder="Timing" onchange="updateReviewSupplementItem(\${idx}, 'timing', this.value)">
          <button class="btn btn-outline" style="color:var(--accent-red); padding:4px 6px; font-size:10px;" onclick="removeReviewSupplementItem(\${idx})">✕</button>
        </div>
      \`).join('')}
      <button class="btn btn-outline" style="font-size:10px; padding:4px 8px; margin-top:6px;" onclick="addReviewSupplementItem()">+ Aggiungi Integratore</button>
    </div>
  \`;
}

function renderReviewTherapy(therapy) {
  if (!therapy || !therapy.medications) return '<div class="card">Nessun dato terapia</div>';
  return \`
    <div class="card">
      <h3 style="font-size:13px; color:var(--gold); font-weight:800; margin-bottom:10px;">TERAPIA RILEVATA</h3>
      \${therapy.medications.map((med, idx) => \`
        <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px; font-size:11px;">
          <input type="text" class="input" style="flex:3; font-size:11px; padding:4px;" value="\${esc(med.medication || med.name || '')}" onchange="updateReviewTherapyMedication(\${idx}, 'medication', this.value)">
          <input type="text" class="input" style="flex:1; font-size:11px; padding:4px; text-align:center;" value="\${esc(med.dose || '')}" placeholder="Dose" onchange="updateReviewTherapyMedication(\${idx}, 'dose', this.value)">
          <input type="text" class="input" style="flex:2; font-size:11px; padding:4px; text-align:center;" value="\${esc(Array.isArray(med.days) ? med.days.join(', ') : (med.days || 'Tutti i giorni'))}" placeholder="Giorni" onchange="updateReviewTherapyMedication(\${idx}, 'days', this.value)">
          <button class="btn btn-outline" style="color:var(--accent-red); padding:4px 6px; font-size:10px;" onclick="removeReviewTherapyMedication(\${idx})">✕</button>
        </div>
      \`).join('')}
      <button class="btn btn-outline" style="font-size:10px; padding:4px 8px; margin-top:6px;" onclick="addReviewTherapyMedication()">+ Aggiungi Farmaco</button>
    </div>
  \`;
}

function renderReviewExams(exams) {
  const records = exams?.records || exams?.items || [];
  if (!records.length) return '<div class="card">Nessun referto o esame rilevato</div>';
  return \`
    <div class="card">
      <h3 style="font-size:13px; color:var(--gold); font-weight:800; margin-bottom:10px;">REFERTI & ESAMI RILEVATI</h3>
      \${records.map((rec, idx) => \`
        <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px; font-size:11px;">
          <input type="text" class="input" style="flex:2.5; font-size:11px; padding:4px;" value="\${esc(rec.parameter || rec.name || '')}" onchange="updateReviewExamRecord(\${idx}, 'parameter', this.value)">
          <input type="text" class="input" style="flex:1; font-size:11px; padding:4px; text-align:center;" value="\${esc(rec.value || '')}" placeholder="Valore" onchange="updateReviewExamRecord(\${idx}, 'value', this.value)">
          <input type="text" class="input" style="width:45px; font-size:11px; padding:4px; text-align:center;" value="\${esc(rec.unit || '')}" placeholder="Unità" onchange="updateReviewExamRecord(\${idx}, 'unit', this.value)">
          <input type="text" class="input" style="flex:1.5; font-size:11px; padding:4px; text-align:center;" value="\${esc(rec.reference_range || '')}" placeholder="Rif." onchange="updateReviewExamRecord(\${idx}, 'reference_range', this.value)">
          <button class="btn btn-outline" style="color:var(--accent-red); padding:4px 6px; font-size:10px;" onclick="removeReviewExamRecord(\${idx})">✕</button>
        </div>
      \`).join('')}
      <button class="btn btn-outline" style="font-size:10px; padding:4px 8px; margin-top:6px;" onclick="addReviewExamRecord()">+ Aggiungi Esame</button>
    </div>
  \`;
}

function switchReviewTab(tabName) {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  if (pState) {
    pState.activeReviewTab = tabName;
    if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') {
      render();
    }
  }
}

function switchImportInputMode(mode) {
  if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
}

async function handleImportFileSelected(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  if (pState) {
    pState.isAnalyzing = true;
    if (typeof render === 'function') render();
  }

  try {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    let parsed;
    if (isExcel) {
      const buffer = await file.arrayBuffer();
      const xlsxLib = typeof XLSX !== 'undefined' ? XLSX : (typeof window !== 'undefined' ? window.XLSX : null);
      if (!xlsxLib) throw new Error('Libreria XLSX non disponibile');
      const wb = xlsxLib.read(buffer, { type: 'buffer' });
      parsed = parseStructuredWorkbook(wb, file.name);
    } else {
      const text = await file.text();
      parsed = parseCanonicalProgramFromText(text, file.name);
    }

    const canonicalProgram = buildCanonicalProgram(parsed);
    if (pState) {
      pState.canonicalProgram = canonicalProgram;
      pState.currentImportId = 'imp_' + Date.now();
      pState.activeReviewTab = 'training';
      pState.isAnalyzing = false;
    }
    if (typeof render === 'function') render();
  } catch (err) {
    console.error('FILE_PARSE_ERROR', err);
    if (pState) pState.isAnalyzing = false;
    if (typeof showToast === 'function') showToast('Errore lettura file: ' + err.message, 'error');
    if (typeof render === 'function') render();
  }
}

function handleImportTextSubmit() {
  const txt = $('import-raw-text')?.value;
  if (!txt || !txt.trim()) {
    if (typeof showToast === 'function') showToast('Inserisci del testo prima di analizzare', 'error');
    return;
  }
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  if (pState) pState.isAnalyzing = true;
  if (typeof render === 'function') render();

  setTimeout(() => {
    try {
      const parsed = parseCanonicalProgramFromText(txt, 'testo_incollato.txt');
      const canonicalProgram = buildCanonicalProgram(parsed);
      if (pState) {
        pState.canonicalProgram = canonicalProgram;
        pState.currentImportId = 'imp_' + Date.now();
        pState.activeReviewTab = 'training';
        pState.isAnalyzing = false;
      }
      if (typeof render === 'function') render();
    } catch (err) {
      console.error('TEXT_PARSE_ERROR', err);
      if (pState) pState.isAnalyzing = false;
      if (typeof showToast === 'function') showToast('Errore parsing testo: ' + err.message, 'error');
      if (typeof render === 'function') render();
    }
  }, 100);
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
`;

// Insert addition right before the final backtick of JS_VIEWS_AND_HANDLERS
const lastBacktick = code.lastIndexOf('`;');
if (lastBacktick !== -1) {
  code = code.slice(0, lastBacktick) + '\n' + addition + '\n`;';
  fs.writeFileSync('prepare_task20_views_and_handlers.mjs', code, 'utf8');
  console.log('✓ Successfully updated prepare_task20_views_and_handlers.mjs');
} else {
  console.error('Could not find closing backtick in prepare_task20_views_and_handlers.mjs');
}
