import fs from 'fs';

let content = fs.readFileSync('web/index.base.html', 'utf8');

// 1. UPDATE renderTherapy
const oldRenderTherapyStart = 'function renderTherapy(c) {';
const oldRenderTherapyEnd = 'function openAddTherapyModal() {';
const startIdx = content.indexOf(oldRenderTherapyStart);
const endIdx = content.indexOf(oldRenderTherapyEnd);

if (startIdx === -1 || endIdx === -1) {
  throw new Error('Could not find renderTherapy boundaries');
}

const newRenderTherapy = `function renderTherapy(c) {
  if (!DATA.therapy && (!store.therapy || (!store.therapy.medications && !store.therapy.protocols))) {
    DATA.therapy = {
      protocol_name: "Monitoraggio Terapia Medica Personale",
      medications: []
    };
    persist();
  }

  const therapyData = (DATA.therapy && (DATA.therapy.medications || DATA.therapy.protocols)) ? DATA.therapy : (store.therapy || { medications: [] });
  const meds = therapyData.medications || [];
  const protocols = therapyData.protocols || therapyData.cycles || [];

  let html = \`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div>
        <span style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1.5px;">MEDICAL THERAPY TRACKER</span>
        <h1 style="color:#fff;margin:2px 0 0;font-size:20px;">\${safeDisplayValue(therapyData.protocol_name || therapyData.title, 'Terapia & Protocolli')}</h1>
      </div>
      <button class="btn btn-primary" style="font-size:10px;padding:6px 12px;" onclick="openAddTherapyModal()">+ AGGIUNGI FARMACO</button>
    </div>

    <!-- Medical disclaimer badge -->
    <div style="background:rgba(255,77,77,0.1);border:1px solid rgba(255,77,77,0.3);padding:10px 12px;border-radius:8px;margin-bottom:14px;font-size:10px;color:#ff8888;line-height:1.4;">
      ⚠️ <strong>AVVERTENZA MEDICA:</strong> Questa sezione ha esclusivamente scopo di tracciamento e promemoria personale. Non sostituisce il parere o la prescrizione del medico curante.
    </div>
  \`;

  if (protocols.length > 0) {
    protocols.forEach((proto, pIdx) => {
      html += \`
        <div class="card" style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid #222;padding-bottom:6px;">
            <h2 style="font-size:13px;color:var(--gold);font-weight:800;letter-spacing:0.5px;">\${esc(proto.title || proto.weekRange || ('Blocco ' + (pIdx+1)))}</h2>
            <span style="font-size:10px;color:#aaa;background:#181818;padding:2px 8px;border-radius:4px;">\${proto.medications?.length || 0} Prescrizioni</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            \${(proto.medications || []).map((m, idx) => {
              const daysList = m.dayOfWeek || m.days;
              const daysStr = Array.isArray(daysList) ? (daysList.length === 7 ? 'Tutti i giorni' : daysList.join(', ')) : (m.frequency || m.days || 'Quotidiano');
              const globalIdx = meds.indexOf(m);
              const delIdx = globalIdx >= 0 ? globalIdx : idx;
              return \`
                <div class="card-compact" style="border:1px solid var(--border);background:var(--surface);">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
                    <div>
                      <span style="font-size:15px;font-weight:900;color:#fff;">\${safeDisplayValue(m.name || m.medication, 'Farmaco')}</span>
                      \${m.active_ingredient ? \`<span style="font-size:11px;color:#888;margin-left:6px;">(\${safeDisplayValue(m.active_ingredient, '')})</span>\` : ''}
                      <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:6px;">
                        <span style="background:rgba(212,175,55,0.15);color:var(--gold);font-size:11px;font-weight:800;padding:2px 6px;border-radius:4px;">\${safeDisplayValue(m.dose, '')} \${safeDisplayValue(m.unit && !String(m.dose).includes(m.unit) ? m.unit : '', '')}</span>
                        <span style="background:#222;color:#aaa;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">⏰ \${safeDisplayValue(m.timing || m.time, 'Mattina')}</span>
                        <span style="background:#181818;color:#4caf50;font-size:10px;padding:2px 6px;border-radius:4px;">📅 \${daysStr}</span>
                        \${(m.duration || m.weekRange) ? \`<span style="background:#181818;color:#888;font-size:10px;padding:2px 6px;border-radius:4px;">⏱️ \${safeDisplayValue(m.duration || m.weekRange, '')}</span>\` : ''}
                      </div>
                    </div>
                    <button class="btn btn-outline" style="font-size:9px;padding:3px 6px;color:var(--accent-red);" onclick="deleteTherapyItem(\${delIdx})">✕</button>
                  </div>
                  \${m.notes ? \`<div style="font-size:11px;color:#888;margin-top:6px;border-top:1px dashed #222;padding-top:4px;">📝 \${safeDisplayValue(m.notes, '')}</div>\` : ''}
                </div>
              \`;
            }).join('')}
          </div>
        </div>
      \`;
    });
  } else if (meds.length > 0) {
    html += \`
      <div style="display:flex;flex-direction:column;gap:10px;">
        \${meds.map((m, idx) => {
          const daysList = m.dayOfWeek || m.days;
          const daysStr = Array.isArray(daysList) ? (daysList.length === 7 ? 'Tutti i giorni' : daysList.join(', ')) : (m.frequency || m.days || 'Quotidiano');
          return \`
            <div class="card-compact" style="border:1px solid var(--border);background:var(--surface);">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
                <div>
                  <span style="font-size:15px;font-weight:900;color:#fff;">\${safeDisplayValue(m.name || m.medication, 'Farmaco')}</span>
                  \${m.active_ingredient ? \`<span style="font-size:11px;color:#888;margin-left:6px;">(\${safeDisplayValue(m.active_ingredient, '')})</span>\` : ''}
                  <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:6px;">
                    <span style="background:rgba(212,175,55,0.15);color:var(--gold);font-size:11px;font-weight:800;padding:2px 6px;border-radius:4px;">\${safeDisplayValue(m.dose, '')} \${safeDisplayValue(m.unit && !String(m.dose).includes(m.unit) ? m.unit : '', '')}</span>
                    <span style="background:#222;color:#aaa;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">⏰ \${safeDisplayValue(m.timing || m.time, 'Mattina')}</span>
                    <span style="background:#181818;color:#4caf50;font-size:10px;padding:2px 6px;border-radius:4px;">📅 \${daysStr}</span>
                    \${(m.duration || m.weekRange) ? \`<span style="background:#181818;color:#888;font-size:10px;padding:2px 6px;border-radius:4px;">⏱️ \${safeDisplayValue(m.duration || m.weekRange, '')}</span>\` : ''}
                  </div>
                </div>
                <button class="btn btn-outline" style="font-size:9px;padding:3px 6px;color:var(--accent-red);" onclick="deleteTherapyItem(\${idx})">✕</button>
              </div>
              \${m.notes ? \`<div style="font-size:11px;color:#888;margin-top:6px;border-top:1px dashed #222;padding-top:4px;">📝 \${safeDisplayValue(m.notes, '')}</div>\` : ''}
            </div>
          \`;
        }).join('')}
      </div>
    \`;
  } else {
    html += \`
      <div class="card" style="text-align:center;padding:30px 15px;color:#888;">
        <div style="font-size:24px;margin-bottom:8px;">🩺</div>
        <p style="margin:0;font-size:12px;">Nessuna prescrizione o protocollo registrato.</p>
      </div>
    \`;
  }

  c.innerHTML = html;
}

`;

content = content.substring(0, startIdx) + newRenderTherapy + content.substring(endIdx);
console.log('✅ Updated renderTherapy in baseHtml');

// 2. UPDATE renderImport, renderReviewTherapy, and confirmImportAndActivate
const oldRenderImportStart = 'function renderImport(c){';
const oldConfirmEnd = 'function switchReviewTab(tabName) {';

const rImportStartIdx = content.indexOf(oldRenderImportStart);
const confirmEndIdx = content.indexOf(oldConfirmEnd);

if (rImportStartIdx === -1 || confirmEndIdx === -1) {
  throw new Error('Could not find renderImport / confirm boundaries');
}

const newImportAndReview = `function renderImport(c){
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

    let totalSessions = 0;
    let totalExercises = 0;
    weeks.forEach(w => {
      const sess = w.sessions || w.days || [];
      totalSessions += sess.length;
      sess.forEach(s => {
        totalExercises += (s.exercises || s.rows || []).length;
      });
    });

    let totalMeals = 0;
    (nutr?.days || []).forEach(d => {
      totalMeals += (d.meals || []).length;
    });

    const valResult = (typeof validateCanonicalProgram === 'function')
      ? validateCanonicalProgram(prog)
      : { valid: true, errors: [], warnings: [] };

    c.innerHTML = \`
      <div style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <span style="font-size:10px; color:var(--gold); font-weight:800; letter-spacing:1.5px; text-transform:uppercase;">REVISIONE INTERATTIVA</span>
          <h2 style="font-size:18px; margin:2px 0 0; color:#fff; font-weight:900;">REVISIONE PROGRAMMA IMPORTATO</h2>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-outline" style="font-size:11px; padding:6px 12px;" onclick="cancelCurrentImportReview()">ANNULLA</button>
          <button class="btn btn-primary" style="font-size:11px; padding:6px 14px; \${!valResult.valid ? 'background:var(--accent-red);border-color:var(--accent-red);' : ''}" onclick="confirmImportAndActivate()">\${pState.isConfirming ? 'ATTIVAZIONE...' : (!valResult.valid ? '⚠️ CONFERMA E ATTIVA' : '✓ CONFERMA E ATTIVA')}</button>
        </div>
      </div>

      \${!valResult.valid ? \`
        <div style="background:rgba(255,68,68,0.12); border:1px solid var(--accent-red); border-radius:8px; padding:12px 14px; margin-bottom:14px;">
          <div style="color:var(--accent-red); font-weight:800; font-size:12px; margin-bottom:4px;">⚠️ IMPORTAZIONE NON VALIDA</div>
          <div style="color:#ffcccc; font-size:11px; margin-bottom:6px;">Rilevate anomalie o dati corrotti nella scheda importata:</div>
          <ul style="margin:0 0 0 16px; color:#ff9999; font-size:10.5px;">
            \${valResult.errors.map(err => \`<li>\${esc(err)}</li>\`).join('')}
          </ul>
        </div>
      \` : ''}

      <!-- Domain Navigation Pills -->
      <div class="pill-tabs" style="margin-bottom:14px;">
        <button class="pill-tab \${activeTab === 'training' ? 'active' : ''}" onclick="switchReviewTab('training')">🏋️ Allenamento (\${weeks.length}W / \${totalSessions}S / \${totalExercises}E)</button>
        \${nutr?.present || (nutr?.days?.length > 0) ? \`<button class="pill-tab \${activeTab === 'nutrition' ? 'active' : ''}" onclick="switchReviewTab('nutrition')">🥗 Alimentazione (\${nutr.days?.length || 0}G / \${totalMeals}P)</button>\` : ''}
        \${supp?.present || (supp?.items?.length > 0) ? \`<button class="pill-tab \${activeTab === 'supplements' ? 'active' : ''}" onclick="switchReviewTab('supplements')">💊 Integrazione (\${supp.items?.length || 0})</button>\` : ''}
        \${therapy?.present || (therapy?.medications?.length > 0) ? \`<button class="pill-tab \${activeTab === 'therapy' ? 'active' : ''}" onclick="switchReviewTab('therapy')">🩺 Terapia (\${therapy.medications?.length || 0}\${therapy.protocols?.length ? ' / ' + therapy.protocols.length + ' blocchi' : ''})</button>\` : ''}
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
      
      <button class="btn btn-primary" id="btn-import-file" style="font-size:13px; font-weight:800; padding:12px 24px; min-height:46px; width:100%; max-width:280px; margin:0 auto;" onclick="triggerImportFileSelect()">📥 IMPORTA FILE</button>
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
    </div>\`).join('');
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
  if (!therapy || (!therapy.medications && !therapy.entries)) return '<div class="card">Nessun dato terapia</div>';
  const meds = therapy.medications || [];
  const protocols = therapy.protocols || therapy.cycles || [];

  if (protocols.length > 0) {
    return protocols.map((proto, pIdx) => \`
      <div class="card" style="margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <h3 style="font-size:13px; color:var(--gold); font-weight:800;">\${esc(proto.title || proto.weekRange || ('Blocco ' + (pIdx+1)))}</h3>
          <span style="font-size:10px; color:#aaa; background:#222; padding:2px 6px; border-radius:4px;">\${proto.medications?.length || 0} Farmaci</span>
        </div>
        \${(proto.medications || []).map((med, mIdx) => {
          const globalIdx = meds.findIndex(m => m === med || (m.name === med.name && m.weekRange === med.weekRange));
          const actualIdx = globalIdx >= 0 ? globalIdx : mIdx;
          return \`
            <div style="background:rgba(255,255,255,0.02); border:1px solid #222; border-radius:6px; padding:8px; margin-bottom:8px;">
              <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px; font-size:11px;">
                <input type="text" class="input" style="flex:2.5; font-size:11px; padding:4px;" value="\${esc(med.medication || med.name || '')}" placeholder="Farmaco" onchange="updateReviewTherapyMedication(\${actualIdx}, 'medication', this.value)">
                <input type="text" class="input" style="flex:1.2; font-size:11px; padding:4px; text-align:center;" value="\${esc(med.dose || '')}" placeholder="Dose" onchange="updateReviewTherapyMedication(\${actualIdx}, 'dose', this.value)">
                <input type="text" class="input" style="flex:1.8; font-size:11px; padding:4px; text-align:center;" value="\${esc(Array.isArray(med.days) ? (med.days.length === 7 ? 'Tutti i giorni' : med.days.join(', ')) : (med.days || 'Tutti i giorni'))}" placeholder="Giorni" onchange="updateReviewTherapyMedication(\${actualIdx}, 'days', this.value)">
                <button class="btn btn-outline" style="color:var(--accent-red); padding:4px 6px; font-size:10px;" onclick="removeReviewTherapyMedication(\${actualIdx})">✕</button>
              </div>
              <div style="display:flex; gap:6px; font-size:10px; color:#888;">
                <span style="color:var(--gold);">Timing: \${esc(med.timing || med.time || 'Secondo prescrizione')}</span>
                \${med.notes ? \`<span style="color:#aaa;">• Note: \${esc(med.notes)}</span>\` : ''}
              </div>
            </div>
          \`;
        }).join('')}
      </div>
    \`).join('') + \`
      <div style="text-align:center;">
        <button class="btn btn-outline" style="font-size:10px; padding:4px 8px;" onclick="addReviewTherapyMedication()">+ Aggiungi Farmaco</button>
      </div>
    \`;
  }

  return \`
    <div class="card">
      <h3 style="font-size:13px; color:var(--gold); font-weight:800; margin-bottom:10px;">TERAPIA RILEVATA</h3>
      \${meds.map((med, idx) => \`
        <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px; font-size:11px;">
          <input type="text" class="input" style="flex:3; font-size:11px; padding:4px;" value="\${esc(med.medication || med.name || '')}" placeholder="Farmaco" onchange="updateReviewTherapyMedication(\${idx}, 'medication', this.value)">
          <input type="text" class="input" style="flex:1; font-size:11px; padding:4px; text-align:center;" value="\${esc(med.dose || '')}" placeholder="Dose" onchange="updateReviewTherapyMedication(\${idx}, 'dose', this.value)">
          <input type="text" class="input" style="flex:2; font-size:11px; padding:4px; text-align:center;" value="\${esc(Array.isArray(med.days) ? (med.days.length === 7 ? 'Tutti i giorni' : med.days.join(', ')) : (med.days || 'Tutti i giorni'))}" placeholder="Giorni" onchange="updateReviewTherapyMedication(\${idx}, 'days', this.value)">
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

// ====================================================
// REVIEW UX MUTATION & CONFIRMATION HANDLERS
// ====================================================
function updateReviewTitle(val) {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  if (pState && pState.canonicalProgram) {
    if (pState.canonicalProgram.training) pState.canonicalProgram.training.title = val;
    pState.canonicalProgram.title = val;
  }
}

function updateReviewExerciseField(wIdx, sIdx, exIdx, field, val) {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  const prog = pState?.canonicalProgram?.training || pState?.canonicalProgram;
  const ex = prog?.weeks?.[wIdx]?.sessions?.[sIdx]?.exercises?.[exIdx];
  if (!ex) return;
  if (field === 'name') {
    ex.name_normalized = val;
    ex.name = val;
    ex.exercise = val;
  } else if (field === 'reps') {
    ex.reps_target = val;
    ex.reps = val;
  } else if (field === 'rir') {
    ex.rir_target = val;
  }
}

function updateReviewMealItem(dIdx, mIdx, fIdx, field, val) {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  const food = pState?.canonicalProgram?.nutrition?.days?.[dIdx]?.meals?.[mIdx]?.foods?.[fIdx];
  if (!food) return;
  if (field === 'name') food.name = val;
  else if (field === 'quantity') food.quantity = val;
  else if (field === 'unit') food.unit = val;
}

function removeReviewMealItem(dIdx, mIdx, fIdx) {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  const foods = pState?.canonicalProgram?.nutrition?.days?.[dIdx]?.meals?.[mIdx]?.foods;
  if (foods && foods[fIdx]) {
    foods.splice(fIdx, 1);
    if (typeof render === 'function') render();
  }
}

function addReviewMealItem(dIdx, mIdx) {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  const meal = pState?.canonicalProgram?.nutrition?.days?.[dIdx]?.meals?.[mIdx];
  if (meal) {
    if (!meal.foods) meal.foods = [];
    meal.foods.push({ name: 'Nuovo Alimento', quantity: '100', unit: 'g', kcal: 0, pro: 0, carb: 0, fat: 0 });
    if (typeof render === 'function') render();
  }
}

function updateReviewSupplementItem(idx, field, val) {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  const item = pState?.canonicalProgram?.supplementation?.items?.[idx];
  if (!item) return;
  if (field === 'name') item.name = val;
  else if (field === 'dose') item.dose = val;
  else if (field === 'timing') item.timing = val;
}

function removeReviewSupplementItem(idx) {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  const items = pState?.canonicalProgram?.supplementation?.items;
  if (items && items[idx]) {
    items.splice(idx, 1);
    if (typeof render === 'function') render();
  }
}

function addReviewSupplementItem() {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  if (!pState?.canonicalProgram?.supplementation) {
    if (!pState.canonicalProgram) pState.canonicalProgram = {};
    pState.canonicalProgram.supplementation = { items: [] };
  }
  pState.canonicalProgram.supplementation.items.push({ name: 'Nuovo Integratore', dose: '1 cps', timing: 'Mattina' });
  if (typeof render === 'function') render();
}

function updateReviewTherapyMedication(idx, field, val) {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  const med = pState?.canonicalProgram?.therapy?.medications?.[idx];
  if (!med) return;
  if (field === 'medication' || field === 'name') {
    med.medication = val;
    med.name = val;
  } else if (field === 'dose') {
    med.dose = val;
  } else if (field === 'days') {
    med.days = val.split(',').map(s => s.trim());
    med.dayOfWeek = med.days;
  }
}

function removeReviewTherapyMedication(idx) {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  const meds = pState?.canonicalProgram?.therapy?.medications;
  if (meds && meds[idx]) {
    meds.splice(idx, 1);
    if (typeof render === 'function') render();
  }
}

function addReviewTherapyMedication() {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  if (!pState?.canonicalProgram?.therapy) {
    if (!pState.canonicalProgram) pState.canonicalProgram = {};
    pState.canonicalProgram.therapy = { medications: [] };
  }
  pState.canonicalProgram.therapy.medications.push({ medication: 'Nuovo Farmaco', dose: '1 compressa', days: ['Tutti i giorni'] });
  if (typeof render === 'function') render();
}

function updateReviewExamRecord(idx, field, val) {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  const rec = (pState?.canonicalProgram?.exams?.records || pState?.canonicalProgram?.exams?.items)?.[idx];
  if (!rec) return;
  if (field === 'parameter') rec.parameter = val;
  else if (field === 'value') rec.value = val;
  else if (field === 'unit') rec.unit = val;
  else if (field === 'reference_range') rec.reference_range = val;
}

function removeReviewExamRecord(idx) {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  const recs = (pState?.canonicalProgram?.exams?.records || pState?.canonicalProgram?.exams?.items);
  if (recs && recs[idx]) {
    recs.splice(idx, 1);
    if (typeof render === 'function') render();
  }
}

function addReviewExamRecord() {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  if (!pState?.canonicalProgram?.exams) {
    if (!pState.canonicalProgram) pState.canonicalProgram = {};
    pState.canonicalProgram.exams = { records: [] };
  }
  const target = pState.canonicalProgram.exams.records || (pState.canonicalProgram.exams.items = []);
  target.push({ parameter: 'Nuovo Parametro', value: '', unit: '', reference_range: '' });
  if (typeof render === 'function') render();
}

function cancelCurrentImportReview() {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  if (pState) {
    pState.canonicalProgram = null;
    pState.currentImportId = null;
    pState.isAnalyzing = false;
  }
  if (typeof render === 'function') render();
}

async function confirmImportAndActivate() {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : (typeof programImportState !== 'undefined' ? programImportState : null);
  if (!pState || !pState.canonicalProgram) return;

  if (pState.isConfirming) return;
  pState.isConfirming = true;
  if (typeof render === 'function') render();

  const prog = JSON.parse(JSON.stringify(pState.canonicalProgram));
  try {
    // 1. Ensure unique programId
    if (!prog.id) {
      prog.id = 'prog_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    }

    // 2. Validate program before activation
    if (typeof validateCanonicalProgram === 'function') {
      const val = validateCanonicalProgram(prog);
      if (!val.valid) {
        throw new Error('Validazione fallita: ' + val.errors.join(', '));
      }
    }

    // 3. Normalize training program for runtime DATA locally (100% offline, zero server calls)
    const trainingPayload = prog.training || prog;
    DATA = (typeof normalizeProgram === 'function') ? normalizeProgram(trainingPayload) : trainingPayload;
    if (!DATA.id) DATA.id = prog.id;
    if (!DATA.title && prog.title) DATA.title = prog.title;

    // 4. Save program to IndexedDB
    if (typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.saveActiveProgram) {
      const res = await GiammariaPersistence.saveActiveProgram(prog);
      console.log(\`[PERSISTENCE] Program saved to IndexedDB. ID: \${res.id}\`);
      store.activeProgramId = res.id;
    } else {
      store.activeProgramId = prog.id;
    }
    
    // 5. Store multi-domain data in app store & DATA
    if (prog.nutrition) {
      store.nutrition = prog.nutrition;
      DATA.nutrition = prog.nutrition;
    }
    if (prog.supplementation) {
      store.supplementation = prog.supplementation;
      DATA.supplementation = prog.supplementation;
    }
    if (prog.therapy) {
      store.therapy = prog.therapy;
      DATA.therapy = prog.therapy;
    }
    if (prog.exams) {
      store.exams = prog.exams;
      DATA.exams = prog.exams;
    }

    if (prog.duration_weeks || DATA.duration_weeks) {
      store.prefs.duration = prog.duration_weeks || DATA.duration_weeks;
    }

    currentWeek = 1;
    currentDay = 0;
    store.activeAthleteProgram = null;
    persist();

    pState.currentImportId = null;
    pState.canonicalProgram = null;

    if (typeof showToast === 'function') {
      showToast("✓ Scheda importata e attivata con successo!", "success");
    } else {
      alert("🎉 Scheda importata con successo! Nuova scheda impostata sulla tua Dashboard.");
    }
    navigate('home');
  } catch (err) {
    console.error("[CONFIRM IMPORT ERROR]", err);
    if (typeof showToast === 'function') {
      showToast("Errore durante l'attivazione: " + err.message, "danger");
    } else {
      alert("Errore attivazione: " + err.message);
    }
  } finally {
    pState.isConfirming = false;
    if (currentView === 'import' && typeof render === 'function') render();
  }
}

`;

content = content.substring(0, rImportStartIdx) + newImportAndReview + content.substring(confirmEndIdx);
console.log('✅ Updated renderImport, renderReviewTherapy, and confirmImportAndActivate in baseHtml');

// 3. Replace resetWorkoutData and resetAllData
const oldResetBlock = 'function saveAll(){ persist(); alert("Salvataggio completato."); }\nfunction resetWorkoutData(){ if(confirm("Azzerare tutti i carichi registrati?")){ store.data = {}; store.customSets = {}; persist(); render(); } }\nfunction resetAllData(){ if(confirm("HARD RESET: cancella ogni dato e programma salvato?")){ localStorage.clear(); location.reload(); } }';

const newResetBlock = `function saveAll(){ persist(); alert("Salvataggio completato."); }
async function resetWorkoutData(){
  if(confirm("Azzerare tutti i carichi registrati?")){
    store.data = {};
    store.customSets = {};
    store.logs = [];
    if(typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.clearWorkoutLogs){
      try { await GiammariaPersistence.clearWorkoutLogs(); } catch(e){ console.error(e); }
    }
    persist();
    render();
    if(typeof showToast === 'function') showToast("Carichi azzerati con successo", "info");
    else alert("Carichi azzerati con successo.");
  }
}
async function resetAllData(){
  if(confirm("HARD RESET: cancellare definitivamente ogni dato, scheda e configurazione da LocalStorage e IndexedDB?")){
    try {
      if(typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.wipeDatabase){
        await GiammariaPersistence.wipeDatabase();
      }
    } catch(e){ console.error('IndexedDB wipe error:', e); }
    try {
      if(typeof localStorage !== 'undefined') localStorage.clear();
      if(typeof sessionStorage !== 'undefined') sessionStorage.clear();
    } catch(e){}
    DATA = {
      profile: { name: "Gianmaria Loi", age: 27, weight: 84.5, height: 178, goal: "Ipertrofia / Bodybuilding", activeSplit: "Nessun programma", currentPhase: "Fase 1", coachName: "Coach AI" },
      activeProgram: null,
      activeProgramId: null,
      activeProgramName: null,
      programTitle: "NESSUN PROGRAMMA ATTIVO",
      training: { weeks: [] },
      weeks: [],
      nutrition: { present: false, days: [], notes: [] },
      supplementation: { present: false, items: [] },
      therapy: { present: false, medications: [], protocols: [], entries: [] },
      exams: { present: false, records: [], items: [] },
      exerciseDb: DATA?.exerciseDb || {}
    };
    store = { activeTab: 'home', curW: 1, curS: 1, curEx: 0, timer: 0, timerRunning: false, timerInterval: null, data: {}, customSets: {}, customEx: [], docs: [], logs: [], notes: {} };
    if(typeof window !== 'undefined' && window.location){
      window.location.reload();
    } else {
      render();
    }
  }
}`;

if (!content.includes(oldResetBlock)) {
  console.warn('Could not find oldResetBlock directly, trying regex replacement');
  content = content.replace(/function resetWorkoutData\(\)\{[\s\S]*?function resetAllData\(\)\{[\s\S]*?location\.reload\(\);\s*\}\s*\}/, `async function resetWorkoutData(){\n  if(confirm("Azzerare tutti i carichi registrati?")){\n    store.data = {};\n    store.customSets = {};\n    store.logs = [];\n    if(typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.clearWorkoutLogs){\n      try { await GiammariaPersistence.clearWorkoutLogs(); } catch(e){ console.error(e); }\n    }\n    persist();\n    render();\n    if(typeof showToast === 'function') showToast("Carichi azzerati con successo", "info");\n    else alert("Carichi azzerati con successo.");\n  }\n}\nasync function resetAllData(){\n  if(confirm("HARD RESET: cancellare definitivamente ogni dato, scheda e configurazione da LocalStorage e IndexedDB?")){\n    try {\n      if(typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.wipeDatabase){\n        await GiammariaPersistence.wipeDatabase();\n      }\n    } catch(e){ console.error('IndexedDB wipe error:', e); }\n    try {\n      if(typeof localStorage !== 'undefined') localStorage.clear();\n      if(typeof sessionStorage !== 'undefined') sessionStorage.clear();\n    } catch(e){}\n    DATA = {\n      profile: { name: "Gianmaria Loi", age: 27, weight: 84.5, height: 178, goal: "Ipertrofia / Bodybuilding", activeSplit: "Nessun programma", currentPhase: "Fase 1", coachName: "Coach AI" },\n      activeProgram: null,\n      activeProgramId: null,\n      activeProgramName: null,\n      programTitle: "NESSUN PROGRAMMA ATTIVO",\n      training: { weeks: [] },\n      weeks: [],\n      nutrition: { present: false, days: [], notes: [] },\n      supplementation: { present: false, items: [] },\n      therapy: { present: false, medications: [], protocols: [], entries: [] },\n      exams: { present: false, records: [], items: [] },\n      exerciseDb: DATA?.exerciseDb || {}\n    };\n    store = { activeTab: 'home', curW: 1, curS: 1, curEx: 0, timer: 0, timerRunning: false, timerInterval: null, data: {}, customSets: {}, customEx: [], docs: [], logs: [], notes: {} };\n    if(typeof window !== 'undefined' && window.location){\n      window.location.reload();\n    } else {\n      render();\n    }\n  }\n}`);
} else {
  content = content.replace(oldResetBlock, newResetBlock);
}

fs.writeFileSync('web/index.base.html', content, 'utf8');
console.log('🎉 web/index.base.html fully updated!');
