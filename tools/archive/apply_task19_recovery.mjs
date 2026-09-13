import fs from 'fs';

let html = fs.readFileSync('web/index.html', 'utf8');

// 1. Update render() dispatch to include 'programs'
const renderRegex = /function\s+render\(\)\s*\{[\s\S]*?if\(currentView\s*===\s*'home'\)\s*renderHome\(c\);[\s\S]*?else\s+if\(currentView\s*===\s*'import'\)\s*renderImport\(c\);/g;

if (!html.includes("else if(currentView === 'programs') renderPrograms(c);")) {
  html = html.replace(
    "else if(currentView === 'import') renderImport(c);",
    "else if(currentView === 'import') renderImport(c);\n  else if(currentView === 'programs') renderPrograms(c);"
  );
  console.log('✓ Added programs view check to render()');
}

// 2. Remove blocking login requirement in renderImport so offline file selection works immediately
const loginBlockOld = `\${!isLoggedIn ? \`
            <div style="text-align:center;">
              <button class="btn btn-outline" style="border-color:var(--gold); color:var(--gold); font-size:11px; padding:10px 18px;" onclick="openAccountModal('login')">
                🔑 ACCEDI PER IMPORTARE SCHEDE
              </button>
            </div>
          \` : (pState.isAnalyzing ? \`
            <button class="btn btn-primary" style="width:100%; font-weight:900; opacity:0.8; cursor:not-allowed;" disabled>
              ⏳ ANALISI STRUTTURATA 2.1 IN CORSO...
            </button>
          \` : \`
            <div style="display:flex; gap:10px;">
              \${pStateInput === 'file' ? \`
                <button class="btn btn-outline" style="flex:1; font-size:11px;" onclick="document.getElementById('universal-import-input').click()">
                  \${file ? 'CAMBIA FILE' : '+ SCEGLI FILE'}
                </button>
              \` : ''}
              <button class="btn btn-primary" style="flex:2; font-weight:900; font-size:12px;" onclick="startProgramImportAnalysis()">
                🚀 ANALIZZA ED APRI REVIEW
              </button>
            </div>
          \`)}`;

const loginBlockNew = `\${pState.isAnalyzing ? \`
            <button class="btn btn-primary" style="width:100%; font-weight:900; opacity:0.8; cursor:not-allowed;" disabled>
              ⏳ ANALISI STRUTTURATA 2.1 IN CORSO...
            </button>
          \` : \`
            <div style="display:flex; gap:10px;">
              \${pStateInput === 'file' ? \`
                <button class="btn btn-outline" style="flex:1; font-size:11px;" onclick="document.getElementById('universal-import-input').click()">
                  \${file ? 'CAMBIA FILE' : '+ SCEGLI FILE'}
                </button>
              \` : ''}
              <button class="btn btn-primary" style="flex:2; font-weight:900; font-size:12px;" onclick="startProgramImportAnalysis()">
                🚀 ANALIZZA ED APRI REVIEW
              </button>
            </div>
          \`}`;

if (html.includes(loginBlockOld)) {
  html = html.replace(loginBlockOld, loginBlockNew);
  console.log('✓ Made Import upload accessible offline without blocking login requirement');
}

// 3. Add renderPrograms and exportActiveProgram if not already present
const programsCode = `
// ====================================================
// PROGRAM MANAGEMENT & LIBRARY VIEW
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
        <h1 class="text-gold" style="font-size:24px; font-weight:900; margin:2px 0 0;">LIBRERIA PROGRAMMI</h1>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-primary" style="font-size:11px; font-weight:900; padding:8px 16px;" onclick="navigate('import')">📥 IMPORTA SCHEDA</button>
      </div>
    </div>

    <!-- Active Program Card -->
    <div class="card" style="border:2px solid var(--gold); background:linear-gradient(135deg, #18150c 0%, #0d0d0d 100%); margin-bottom:16px;">
      <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
        <h2>Programma Attivo</h2>
        <span class="badge badge-success" style="font-size:9px;">IN USO</span>
      </div>
      <div style="padding:16px 20px;">
        <div style="font-size:18px; font-weight:900; color:var(--gold); margin-bottom:8px;">
          \${esc(DATA?.title || DATA?.normalized_title || 'Programma Principale')}
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px;">
          <span class="badge" style="font-size:10px;">⏱️ \${duration} Settimane</span>
          <span class="badge" style="font-size:10px;">📅 \${sessionsCount} Sessioni Totali</span>
          <span class="badge" style="font-size:10px;">🏋️ \${totalExercises} Esercizi</span>
          <span class="badge" style="font-size:10px;">🔢 \${totalSets} Serie</span>
        </div>

        <!-- Domains Status -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:8px; margin-bottom:16px;">
          <div style="background:#111; padding:10px; border-radius:8px; border:1px solid #222; text-align:center;">
            <div style="font-size:11px; font-weight:800; color:var(--gold);">ALLENAMENTO</div>
            <div style="font-size:10px; color:#aaa; margin-top:2px;">\${weeks.length} Settimane</div>
          </div>
          <div style="background:#111; padding:10px; border-radius:8px; border:1px solid #222; text-align:center;">
            <div style="font-size:11px; font-weight:800; color:\${hasNutr ? '#4caf50' : '#666'};">ALIMENTAZIONE</div>
            <div style="font-size:10px; color:#aaa; margin-top:2px;">\${hasNutr ? (DATA.nutrition.days.length + ' Giorni') : 'Non presente'}</div>
          </div>
          <div style="background:#111; padding:10px; border-radius:8px; border:1px solid #222; text-align:center;">
            <div style="font-size:11px; font-weight:800; color:\${hasSupp ? '#2196f3' : '#666'};">INTEGRAZIONE</div>
            <div style="font-size:10px; color:#aaa; margin-top:2px;">\${hasSupp ? (DATA.supplementation.items.length + ' Integratori') : 'Non presente'}</div>
          </div>
          <div style="background:#111; padding:10px; border-radius:8px; border:1px solid #222; text-align:center;">
            <div style="font-size:11px; font-weight:800; color:\${hasTherapy ? '#e91e63' : '#666'};">TERAPIA</div>
            <div style="font-size:10px; color:#aaa; margin-top:2px;">\${hasTherapy ? (DATA.therapy.medications.length + ' Farmaci') : 'Non presente'}</div>
          </div>
          <div style="background:#111; padding:10px; border-radius:8px; border:1px solid #222; text-align:center;">
            <div style="font-size:11px; font-weight:800; color:\${hasExams ? '#00bcd4' : '#666'};">ESAMI LAB</div>
            <div style="font-size:10px; color:#aaa; margin-top:2px;">\${hasExams ? ((DATA.exams.records || DATA.exams.items || []).length + ' Referti') : 'Non presente'}</div>
          </div>
        </div>

        <div style="display:flex; gap:10px;">
          <button class="btn btn-primary" style="flex:2; height:45px; font-size:14px;" onclick="navigate('training')">VAI AL WORKOUT</button>
          <button class="btn btn-outline" style="flex:1; height:45px; font-size:11px; border-color:var(--gold); color:var(--gold);" onclick="exportActiveProgram()">ESPORTA JSON</button>
        </div>
      </div>
    </div>

    <!-- Saved Models List -->
    <div class="card">
      <div class="card-header"><h2>Modelli Salvati in Archivio</h2></div>
      <div style="padding:15px;" id="saved-models-list-programs">
        \${store.models.length ? store.models.map((m,i)=>\`
          <div style="display:flex; justify-content:space-between; align-items:center; background:#111; padding:12px; border-radius:8px; margin-bottom:8px; border:1px solid #222;">
            <div>
              <b style="color:var(--gold); font-size:14px;">\${esc(m.name)}</b>
              <div style="font-size:10px; color:#777; margin-top:2px;">Creato il \${new Date(m.date).toLocaleDateString()} • \${m.data?.weeks?.length || 0} Settimane</div>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-outline" style="font-size:10px; padding:6px 12px;" onclick="applyModel(\${i})">ATTIVA</button>
              <button class="btn btn-outline" style="font-size:10px; padding:6px 10px; border-color:var(--accent-red); color:var(--accent-red);" onclick="deleteModel(\${i})">X</button>
            </div>
          </div>
        \`).join('') : '<div style="font-size:11px; color:#666; text-align:center; padding:16px;">Nessun modello salvato in archivio. Usa il pulsante Importa per caricare una nuova scheda.</div>'}
      </div>
    </div>
  \`;
}

function exportActiveProgram() {
  try {
    const jsonStr = JSON.stringify(DATA, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (DATA?.title || 'programma_giammaria_system').replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch(e) {
    alert('Impossibile esportare il programma: ' + e.message);
  }
}
`;

if (!html.includes("function renderPrograms(c)")) {
  html = html.replace(
    "function renderHome(c){",
    programsCode + "\nfunction renderHome(c){"
  );
  console.log('✓ Added renderPrograms() and exportActiveProgram() to index.html');
}

// 4. In renderHome: add Import button alongside Start Workout
const oldHomeBtn = `<button class="btn btn-primary" style="width:100%;margin-top:20px;font-size:16px;height:55px;" onclick="navigate('training')">INIZIA WORKOUT</button>`;
const newHomeBtn = `<div style="display:flex;gap:10px;margin-top:20px;">
        <button class="btn btn-primary" style="flex:2;font-size:16px;height:55px;" onclick="navigate('training')">INIZIA WORKOUT</button>
        <button class="btn btn-outline" style="flex:1;font-size:12px;height:55px;border-color:var(--gold);color:var(--gold);font-weight:800;" onclick="navigate('import')">📥 IMPORTA</button>
      </div>`;

if (html.includes(oldHomeBtn)) {
  html = html.replace(oldHomeBtn, newHomeBtn);
  console.log('✓ Enhanced Home Sessione Attiva with quick Import button');
}

// 5. In renderDb: add Import button in CARICA NUOVO MATERIALE card
const oldDbBtn = `<button class="btn btn-primary" style="width:100%; font-size:12px;" onclick="triggerFileSelect()">+ SELEZIONA FILE</button>`;
const newDbBtn = `<button class="btn btn-primary" style="width:100%; font-size:12px;" onclick="triggerFileSelect()">+ SELEZIONA FILE</button>
      <button class="btn btn-outline" style="width:100%; font-size:11px; margin-top:8px; border-color:var(--gold); color:var(--gold); font-weight:800;" onclick="navigate('import')">📥 IMPORTATORE UNIVERSALE 2.1 (XLSX / DOC / TESTO)</button>`;

if (html.includes(oldDbBtn) && !html.includes("IMPORTATORE UNIVERSALE 2.1 (XLSX / DOC / TESTO)")) {
  html = html.replace(oldDbBtn, newDbBtn);
  console.log('✓ Added Universal Import 2.1 button to DB section');
}

fs.writeFileSync('web/index.html', html, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', html, 'utf8');
console.log('✓ Saved and synchronized web/index.html and app/src/main/assets/index.html');
