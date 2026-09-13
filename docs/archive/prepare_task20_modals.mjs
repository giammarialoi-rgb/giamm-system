export const EXTRA_MODALS_HTML = `
<!-- Modal Aggiunta Alimento -->
<div id="add-food-modal" class="modal">
  <div class="modal-content" style="max-height:85vh;overflow-y:auto;">
    <h2 style="color:var(--gold);margin-top:0;font-size:16px;">AGGIUNGI ALIMENTO</h2>
    <p style="font-size:11px;color:#aaa;margin-bottom:12px;">Inserisci o seleziona un alimento dal database nutrizionale.</p>
    
    <label style="font-size:10px;color:var(--gold);font-weight:800;">CERCA NEL DATABASE ALIMENTI</label>
    <input id="food-search-input" type="search" placeholder="Es. Petto di Pollo, Riso, Avena..." oninput="filterFoodDb(this.value)" style="margin-bottom:8px;">
    <div id="food-db-suggestions" style="max-height:120px;overflow-y:auto;background:#111;border:1px solid #222;border-radius:6px;margin-bottom:10px;display:none;"></div>

    <label style="font-size:10px;color:var(--gold);font-weight:800;">NOME ALIMENTO *</label>
    <input id="food-name-input" type="text" placeholder="Es. Petto di Pollo ai ferri" style="margin-bottom:8px;" required>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
      <div>
        <label style="font-size:10px;color:var(--gold);font-weight:800;">QUANTITÀ *</label>
        <input id="food-qty-input" type="number" step="0.5" value="100" oninput="recalcFoodMacrosFromDb()" style="text-align:center;">
      </div>
      <div>
        <label style="font-size:10px;color:var(--gold);font-weight:800;">UNITÀ</label>
        <select id="food-unit-input" style="text-align:center;">
          <option value="g">Grammi (g)</option>
          <option value="ml">Millilitri (ml)</option>
          <option value="fette">Fette</option>
          <option value="porzioni">Porzioni</option>
          <option value="cucchiai">Cucchiai</option>
          <option value="cucchiaini">Cucchiaini</option>
          <option value="pezzi">Pezzi</option>
          <option value="capsule">Capsule</option>
          <option value="misurini">Misurini / Scoop</option>
        </select>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;margin-bottom:8px;">
      <div>
        <label style="font-size:9px;color:var(--gold);font-weight:800;">KCAL</label>
        <input id="food-kcal-input" type="number" placeholder="Kcal" style="text-align:center;padding:6px 2px;font-size:12px;">
      </div>
      <div>
        <label style="font-size:9px;color:#4caf50;font-weight:800;">PRO (g)</label>
        <input id="food-pro-input" type="number" step="0.1" placeholder="Pro" style="text-align:center;padding:6px 2px;font-size:12px;">
      </div>
      <div>
        <label style="font-size:9px;color:#2196f3;font-weight:800;">CARB (g)</label>
        <input id="food-carb-input" type="number" step="0.1" placeholder="Carb" style="text-align:center;padding:6px 2px;font-size:12px;">
      </div>
      <div>
        <label style="font-size:9px;color:#ff9800;font-weight:800;">FAT (g)</label>
        <input id="food-fat-input" type="number" step="0.1" placeholder="Fat" style="text-align:center;padding:6px 2px;font-size:12px;">
      </div>
    </div>

    <label style="font-size:10px;color:var(--gold);font-weight:800;">NOTE / PREPARAZIONE</label>
    <input id="food-note-input" type="text" placeholder="Es. A crudo, pesato cotto, opzionale..." style="margin-bottom:15px;">

    <input type="hidden" id="food-target-day" value="0">
    <input type="hidden" id="food-target-meal" value="0">

    <div style="display:flex;gap:10px;">
      <button class="btn btn-outline" style="flex:1;" onclick="closeAddFoodModal()">ANNULLA</button>
      <button class="btn btn-primary" style="flex:1;" onclick="saveFoodItem()">SALVA ALIMENTO</button>
    </div>
  </div>
</div>

<!-- Modal Aggiunta Integratore -->
<div id="add-supplement-modal" class="modal">
  <div class="modal-content" style="max-height:85vh;overflow-y:auto;">
    <h2 style="color:var(--gold);margin-top:0;font-size:16px;">AGGIUNGI INTEGRATORE</h2>
    <p style="font-size:11px;color:#aaa;margin-bottom:12px;">Configura dosaggio, timing e frequenza di assunzione.</p>

    <label style="font-size:10px;color:var(--gold);font-weight:800;">CERCA NEL CATALOGO INTEGRATORI</label>
    <input id="supp-search-input" type="search" placeholder="Es. Creatina, Omega 3, Vitamina D3..." oninput="filterSuppDb(this.value)" style="margin-bottom:8px;">
    <div id="supp-db-suggestions" style="max-height:120px;overflow-y:auto;background:#111;border:1px solid #222;border-radius:6px;margin-bottom:10px;display:none;"></div>

    <label style="font-size:10px;color:var(--gold);font-weight:800;">NOME INTEGRATORE *</label>
    <input id="supp-name-input" type="text" placeholder="Es. Creatina Monoidrato Creapure" style="margin-bottom:8px;" required>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
      <div>
        <label style="font-size:10px;color:var(--gold);font-weight:800;">DOSE *</label>
        <input id="supp-dose-input" type="text" placeholder="Es. 5" style="text-align:center;">
      </div>
      <div>
        <label style="font-size:10px;color:var(--gold);font-weight:800;">UNITÀ</label>
        <select id="supp-unit-input" style="text-align:center;">
          <option value="g">g (Grammi)</option>
          <option value="mg">mg (Milligrammi)</option>
          <option value="cps">cps (Capsule / Softgel)</option>
          <option value="UI">UI (Unità Internazionali)</option>
          <option value="scoop">Scoop / Misurini</option>
          <option value="gocce">Gocce</option>
          <option value="bustine">Bustine</option>
        </select>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
      <div>
        <label style="font-size:10px;color:var(--gold);font-weight:800;">TIMING</label>
        <select id="supp-timing-input">
          <option value="Colazione">Colazione</option>
          <option value="Mattina">Mattina a digiuno</option>
          <option value="Pranzo">Pranzo</option>
          <option value="Pre-workout">Pre-workout (30-45m)</option>
          <option value="Intra-workout">Intra-workout</option>
          <option value="Post-workout">Post-workout</option>
          <option value="Cena">Cena</option>
          <option value="Pre-nanna">Pre-nanna</option>
        </select>
      </div>
      <div>
        <label style="font-size:10px;color:var(--gold);font-weight:800;">FREQUENZA</label>
        <select id="supp-freq-input">
          <option value="Quotidiano">Quotidiano</option>
          <option value="Giorni ON">Solo Giorni Allenamento</option>
          <option value="Giorni OFF">Solo Giorni Riposo</option>
          <option value="Ciclico">A cicli</option>
        </select>
      </div>
    </div>

    <label style="font-size:10px;color:var(--gold);font-weight:800;">NOTE / ISTRUZIONI</label>
    <input id="supp-note-input" type="text" placeholder="Es. Con abbondante acqua o carboidrati" style="margin-bottom:15px;">

    <div style="display:flex;gap:10px;">
      <button class="btn btn-outline" style="flex:1;" onclick="closeAddSupplementModal()">ANNULLA</button>
      <button class="btn btn-primary" style="flex:1;" onclick="saveSupplementItem()">SALVA INTEGRATORE</button>
    </div>
  </div>
</div>

<!-- Modal Aggiunta Terapia -->
<div id="add-therapy-modal" class="modal">
  <div class="modal-content" style="max-height:85vh;overflow-y:auto;">
    <h2 style="color:var(--gold);margin-top:0;font-size:16px;">AGGIUNGI FARMACO / TERAPIA</h2>
    <p style="font-size:11px;color:#aaa;margin-bottom:12px;">Traccia dosaggio, giorni di assunzione e durata.</p>

    <label style="font-size:10px;color:var(--gold);font-weight:800;">NOME FARMACO *</label>
    <input id="therapy-name-input" type="text" placeholder="Es. Metformina, Cardioaspirina..." style="margin-bottom:8px;" required>

    <label style="font-size:10px;color:var(--gold);font-weight:800;">PRINCIPIO ATTIVO (Opzionale)</label>
    <input id="therapy-ingredient-input" type="text" placeholder="Es. Metformina cloridrato" style="margin-bottom:8px;">

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
      <div>
        <label style="font-size:10px;color:var(--gold);font-weight:800;">DOSE *</label>
        <input id="therapy-dose-input" type="text" placeholder="Es. 500" style="text-align:center;">
      </div>
      <div>
        <label style="font-size:10px;color:var(--gold);font-weight:800;">UNITÀ</label>
        <select id="therapy-unit-input" style="text-align:center;">
          <option value="mg">mg</option>
          <option value="mcg">mcg</option>
          <option value="g">g</option>
          <option value="compressa">compressa/e</option>
          <option value="UI">UI</option>
          <option value="ml">ml</option>
          <option value="fiala">fiala</option>
        </select>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
      <div>
        <label style="font-size:10px;color:var(--gold);font-weight:800;">TIMING</label>
        <select id="therapy-timing-input">
          <option value="Mattina">Mattina</option>
          <option value="Pranzo">Pranzo</option>
          <option value="Sera">Sera</option>
          <option value="Pre-nanna">Pre-nanna</option>
          <option value="Ai pasti">Ai pasti</option>
          <option value="A digiuno">A digiuno</option>
        </select>
      </div>
      <div>
        <label style="font-size:10px;color:var(--gold);font-weight:800;">DURATA</label>
        <input id="therapy-duration-input" type="text" placeholder="Es. 8 settimane, Continuativa" style="text-align:center;">
      </div>
    </div>

    <label style="font-size:10px;color:var(--gold);font-weight:800;">GIORNI DI ASSUNZIONE</label>
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;" id="therapy-days-selector">
      ${['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'].map(d=>`
        <button type="button" class="pill-tab active" data-day="${d}" onclick="this.classList.toggle('active')" style="padding:4px 8px;font-size:9px;">${d.slice(0,3)}</button>
      `).join('')}
    </div>

    <label style="font-size:10px;color:var(--gold);font-weight:800;">NOTE / AVVERTENZE</label>
    <input id="therapy-note-input" type="text" placeholder="Prescritto dal medico curante" style="margin-bottom:15px;">

    <div style="display:flex;gap:10px;">
      <button class="btn btn-outline" style="flex:1;" onclick="closeAddTherapyModal()">ANNULLA</button>
      <button class="btn btn-primary" style="flex:1;" onclick="saveTherapyItem()">SALVA TERAPIA</button>
    </div>
  </div>
</div>

<!-- Modal Aggiunta Referto Esami -->
<div id="add-exam-modal" class="modal">
  <div class="modal-content" style="max-height:85vh;overflow-y:auto;">
    <h2 style="color:var(--gold);margin-top:0;font-size:16px;">AGGIUNGI REFERTO ESAME</h2>
    <p style="font-size:11px;color:#aaa;margin-bottom:12px;">Traccia valori ematochimici e parametri di laboratorio.</p>

    <label style="font-size:10px;color:var(--gold);font-weight:800;">PARAMETRO *</label>
    <input id="exam-param-input" type="text" placeholder="Es. Testosterone Totale, Glicemia, ALT..." style="margin-bottom:8px;" required>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
      <div>
        <label style="font-size:10px;color:var(--gold);font-weight:800;">VALORE *</label>
        <input id="exam-value-input" type="text" placeholder="Es. 650" style="text-align:center;" required>
      </div>
      <div>
        <label style="font-size:10px;color:var(--gold);font-weight:800;">UNITÀ DI MISURA</label>
        <input id="exam-unit-input" type="text" placeholder="Es. ng/dL, mg/dL, U/L" style="text-align:center;">
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
      <div>
        <label style="font-size:10px;color:var(--gold);font-weight:800;">RANGE DI RIFERIMENTO</label>
        <input id="exam-range-input" type="text" placeholder="Es. 300 - 1000" style="text-align:center;">
      </div>
      <div>
        <label style="font-size:10px;color:var(--gold);font-weight:800;">DATA DEL REFERTO</label>
        <input id="exam-date-input" type="date" value="${new Date().toISOString().slice(0,10)}" style="text-align:center;">
      </div>
    </div>

    <label style="font-size:10px;color:var(--gold);font-weight:800;">LABORATORIO / NOTE</label>
    <input id="exam-notes-input" type="text" placeholder="Es. Synlab, a digiuno da 12 ore" style="margin-bottom:15px;">

    <div style="display:flex;gap:10px;">
      <button class="btn btn-outline" style="flex:1;" onclick="closeAddExamModal()">ANNULLA</button>
      <button class="btn btn-primary" style="flex:1;" onclick="saveExamRecord()">SALVA REFERTO</button>
    </div>
  </div>
</div>

<!-- Modal Evidenze Examine -->
<div id="examine-evidence-modal" class="modal">
  <div class="modal-content" style="max-height:85vh;overflow-y:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <span style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1px;">SCIENTIFIC EVIDENCE ENGINE</span>
      <button class="btn btn-outline" style="font-size:9px;padding:3px 8px;" onclick="closeExamineEvidenceModal()">✕</button>
    </div>
    <div id="examine-evidence-content"></div>
  </div>
</div>

<!-- Modal Navigation Hub / Menu -->
<div id="menu-hub-modal" class="modal">
  <div class="modal-content" style="max-height:90vh;overflow-y:auto;border:1px solid var(--gold);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div>
        <span style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1px;">PILLAR NAVIGATION</span>
        <h2 style="color:#fff;margin:2px 0 0;font-size:18px;">GIAMMARIA SYSTEM HUB</h2>
      </div>
      <button class="btn btn-outline" style="font-size:10px;padding:4px 10px;" onclick="closeMenuHub()">✕ CHIUDI</button>
    </div>
    <div class="menu-hub-grid">
      <div class="menu-hub-item" onclick="closeMenuHub();navigate('home')">
        <div class="menu-hub-icon">🏠</div>
        <div class="menu-hub-label">Home</div>
      </div>
      <div class="menu-hub-item" onclick="closeMenuHub();navigate('training')">
        <div class="menu-hub-icon">🏋️</div>
        <div class="menu-hub-label">Workout</div>
      </div>
      <div class="menu-hub-item" onclick="closeMenuHub();navigate('programs')">
        <div class="menu-hub-icon">📚</div>
        <div class="menu-hub-label">Programmi</div>
      </div>
      <div class="menu-hub-item" onclick="closeMenuHub();navigate('nutrition')">
        <div class="menu-hub-icon">🥗</div>
        <div class="menu-hub-label">Alimentazione</div>
      </div>
      <div class="menu-hub-item" onclick="closeMenuHub();navigate('supplements')">
        <div class="menu-hub-icon">💊</div>
        <div class="menu-hub-label">Integrazione</div>
      </div>
      <div class="menu-hub-item" onclick="closeMenuHub();navigate('therapy')">
        <div class="menu-hub-icon">🩺</div>
        <div class="menu-hub-label">Terapia</div>
      </div>
      <div class="menu-hub-item" onclick="closeMenuHub();navigate('exams')">
        <div class="menu-hub-icon">🧪</div>
        <div class="menu-hub-label">Esami Lab</div>
      </div>
      <div class="menu-hub-item" onclick="closeMenuHub();navigate('calendar')">
        <div class="menu-hub-icon">📅</div>
        <div class="menu-hub-label">Calendario</div>
      </div>
      <div class="menu-hub-item" onclick="closeMenuHub();navigate('stats')">
        <div class="menu-hub-icon">📊</div>
        <div class="menu-hub-label">Performance</div>
      </div>
      <div class="menu-hub-item" onclick="closeMenuHub();navigate('ai')">
        <div class="menu-hub-icon">🤖</div>
        <div class="menu-hub-label">Coach AI</div>
      </div>
      <div class="menu-hub-item" onclick="closeMenuHub();navigate('import')">
        <div class="menu-hub-icon">📥</div>
        <div class="menu-hub-label">Importa</div>
      </div>
      <div class="menu-hub-item" onclick="closeMenuHub();navigate('db')">
        <div class="menu-hub-icon">📁</div>
        <div class="menu-hub-label">Database</div>
      </div>
      <div class="menu-hub-item" onclick="closeMenuHub();navigate('settings')">
        <div class="menu-hub-icon">⚙️</div>
        <div class="menu-hub-label">Impostazioni</div>
      </div>
      <div class="menu-hub-item" onclick="closeMenuHub();navigate('pricing')">
        <div class="menu-hub-icon">👑</div>
        <div class="menu-hub-label">Piani & Pro</div>
      </div>
    </div>
  </div>
</div>
`;

console.log('Extra modals HTML prepared.');
