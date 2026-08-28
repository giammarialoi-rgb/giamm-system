export const JS_VIEWS_AND_HANDLERS = `
// ====================================================
// TASK 20: TRAINING LOGGER ENHANCEMENTS
// ====================================================
function duplicateSet(exIdx, setNum) {
  if (!DATA) return;
  const targetCount = getExerciseSetCount(exIdx);
  const newSetNum = targetCount + 1;
  const key = \`w\${currentWeek}_d\${currentDay}_e\${exIdx}_customSets\`;
  store.customSets[key] = newSetNum;
  
  const prevLoadKey = \`w\${currentWeek}_d\${currentDay}_e\${exIdx}_s\${setNum}_load\`;
  const prevRepsKey = \`w\${currentWeek}_d\${currentDay}_e\${exIdx}_s\${setNum}_reps\`;
  const prevRirKey = \`w\${currentWeek}_d\${currentDay}_e\${exIdx}_s\${setNum}_rir\`;
  const prevTypeKey = \`w\${currentWeek}_d\${currentDay}_e\${exIdx}_s\${setNum}_type\`;

  const newLoadKey = \`w\${currentWeek}_d\${currentDay}_e\${exIdx}_s\${newSetNum}_load\`;
  const newRepsKey = \`w\${currentWeek}_d\${currentDay}_e\${exIdx}_s\${newSetNum}_reps\`;
  const newRirKey = \`w\${currentWeek}_d\${currentDay}_e\${exIdx}_s\${newSetNum}_rir\`;
  const newTypeKey = \`w\${currentWeek}_d\${currentDay}_e\${exIdx}_s\${newSetNum}_type\`;

  if (store.data[prevLoadKey] !== undefined) store.data[newLoadKey] = store.data[prevLoadKey];
  if (store.data[prevRepsKey] !== undefined) store.data[newRepsKey] = store.data[prevRepsKey];
  if (store.data[prevRirKey] !== undefined) store.data[newRirKey] = store.data[prevRirKey];
  if (store.data[prevTypeKey] !== undefined) store.data[newTypeKey] = store.data[prevTypeKey];

  persist();
  render();
  showToast("Serie duplicata con successo", "success");
}

function updateSetType(exIdx, setNum, type) {
  const key = \`w\${currentWeek}_d\${currentDay}_e\${exIdx}_s\${setNum}_type\`;
  store.data[key] = type;
  persist();
}

function handleRirChange(input, rpeInputId, exIdx, setNum) {
  const rirVal = parseFloat(input.value);
  const rpeInput = $(rpeInputId);
  if (!isNaN(rirVal)) {
    const computedRpe = Math.max(5, Math.min(10, 10 - rirVal));
    if (rpeInput && rpeInput.value !== String(computedRpe)) {
      rpeInput.value = computedRpe;
    }
  }
}

function handleRpeChange(input, rirInputId, exIdx, setNum) {
  const rpeVal = parseFloat(input.value);
  const rirInput = $(rirInputId);
  if (!isNaN(rpeVal)) {
    const computedRir = Math.max(0, Math.min(5, 10 - rpeVal));
    if (rirInput && rirInput.value !== String(computedRir)) {
      rirInput.value = computedRir;
    }
  }
}

// ====================================================
// TASK 20: NUTRITION CONTROLLER & RENDERER
// ====================================================
let currentNutritionDayIndex = 0;

function renderNutrition(c) {
  if (!DATA.nutrition) {
    DATA.nutrition = {
      plan_name: "Piano Nutrizionale Personalizzato",
      daily_calories_target: 2600,
      daily_protein_target: 170,
      daily_carbs_target: 330,
      daily_fats_target: 65,
      days: [
        {
          day: "Lunedi (ON)",
          meals: [
            {
              name: "Colazione",
              time: "08:00",
              foods: [
                { name: "Albume d'uovo", quantity: 200, unit: "g", kcal: 104, pro: 22, carb: 1.4, fat: 0.4, notes: "Cotto in padella" },
                { name: "Avena in fiocchi", quantity: 80, unit: "g", kcal: 311, pro: 13.5, carb: 53, fat: 5.5, notes: "Porridge" },
                { name: "Frutti di bosco", quantity: 100, unit: "g", kcal: 57, pro: 0.7, carb: 14, fat: 0.3, notes: "Freschi" }
              ]
            },
            {
              name: "Pranzo",
              time: "13:00",
              foods: [
                { name: "Riso Basmati", quantity: 120, unit: "g", kcal: 438, pro: 8.5, carb: 96, fat: 0.8, notes: "A crudo" },
                { name: "Petto di Pollo", quantity: 180, unit: "g", kcal: 297, pro: 55.8, carb: 0, fat: 6.5, notes: "Ai ferri" },
                { name: "Olio EVO", quantity: 15, unit: "g", kcal: 132, pro: 0, carb: 0, fat: 15, notes: "A crudo" },
                { name: "Zucchine", quantity: 200, unit: "g", kcal: 34, pro: 2.4, carb: 6.2, fat: 0.4, notes: "Grigliate" }
              ]
            },
            {
              name: "Cena",
              time: "20:30",
              foods: [
                { name: "Salmone fresco", quantity: 180, unit: "g", kcal: 374, pro: 36, carb: 0, fat: 23.4, notes: "Al vapore" },
                { name: "Patate lesse", quantity: 300, unit: "g", kcal: 231, pro: 6, carb: 51, fat: 0.3, notes: "Al vapore" },
                { name: "Insalata mista", quantity: 150, unit: "g", kcal: 25, pro: 1.5, carb: 4.5, fat: 0.3, notes: "A piacere" }
              ]
            }
          ]
        }
      ]
    };
    persist();
  }

  const days = DATA.nutrition.days || [];
  if (currentNutritionDayIndex >= days.length) currentNutritionDayIndex = 0;
  const activeDay = days[currentNutritionDayIndex] || { day: "Giorno 1", meals: [] };

  let dayKcal = 0, dayPro = 0, dayCarb = 0, dayFat = 0;
  (activeDay.meals || []).forEach(m => {
    (m.foods || []).forEach(f => {
      dayKcal += parseFloat(f.kcal) || 0;
      dayPro += parseFloat(f.pro) || 0;
      dayCarb += parseFloat(f.carb) || 0;
      dayFat += parseFloat(f.fat) || 0;
    });
  });

  const targetKcal = DATA.nutrition.daily_calories_target || 2500;
  const targetPro = DATA.nutrition.daily_protein_target || 160;
  const targetCarb = DATA.nutrition.daily_carbs_target || 300;
  const targetFat = DATA.nutrition.daily_fats_target || 65;

  let html = \`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div>
        <span style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1.5px;">NUTRITION MASTER PLAN</span>
        <h1 style="color:#fff;margin:2px 0 0;font-size:20px;">\${safeDisplayValue(DATA.nutrition.plan_name, 'Alimentazione')}</h1>
      </div>
      <button class="btn btn-outline" style="font-size:10px;padding:6px 12px;" onclick="addNutritionDay()">+ GIORNO</button>
    </div>

    <!-- Daily Macro Summary Card -->
    <div class="card" style="border:1px solid var(--border);background:linear-gradient(135deg, #16140d 0%, #0c0c0c 100%);margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:11px;font-weight:800;color:var(--gold);">TOTALI GIORNALIERI • \${safeDisplayValue(activeDay.day, 'Oggi')}</span>
        <span style="font-size:13px;font-weight:900;color:#fff;">\${Math.round(dayKcal)} <span style="font-size:10px;color:#888;">/ \${targetKcal} kcal</span></span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;">
        <div style="background:#111;padding:8px;border-radius:8px;text-align:center;border:1px solid rgba(76,175,80,0.3);">
          <div style="font-size:9px;color:#888;font-weight:800;">PROTEINE</div>
          <div style="font-size:14px;font-weight:900;color:#4caf50;">\${Math.round(dayPro)}g <span style="font-size:9px;color:#666;">(\${targetPro}g)</span></div>
        </div>
        <div style="background:#111;padding:8px;border-radius:8px;text-align:center;border:1px solid rgba(33,150,243,0.3);">
          <div style="font-size:9px;color:#888;font-weight:800;">CARBOIDRATI</div>
          <div style="font-size:14px;font-weight:900;color:#2196f3;">\${Math.round(dayCarb)}g <span style="font-size:9px;color:#666;">(\${targetCarb}g)</span></div>
        </div>
        <div style="background:#111;padding:8px;border-radius:8px;text-align:center;border:1px solid rgba(255,152,0,0.3);">
          <div style="font-size:9px;color:#888;font-weight:800;">GRASSI</div>
          <div style="font-size:14px;font-weight:900;color:#ff9800;">\${Math.round(dayFat)}g <span style="font-size:9px;color:#666;">(\${targetFat}g)</span></div>
        </div>
      </div>
    </div>

    <!-- Day selector tabs -->
    <div class="pill-tabs">
      \${days.map((d, idx) => \`
        <div class="pill-tab \${idx === currentNutritionDayIndex ? 'active' : ''}" onclick="currentNutritionDayIndex=\${idx};render();">
          \${safeDisplayValue(d.day, 'Giorno ' + (idx + 1))}
        </div>
      \`).join('')}
    </div>

    <!-- Meals list -->
    <div style="display:flex;flex-direction:column;gap:14px;">
      \${(activeDay.meals || []).map((m, mIdx) => {
        let mKcal = 0, mPro = 0, mCarb = 0, mFat = 0;
        (m.foods || []).forEach(f => {
          mKcal += parseFloat(f.kcal) || 0;
          mPro += parseFloat(f.pro) || 0;
          mCarb += parseFloat(f.carb) || 0;
          mFat += parseFloat(f.fat) || 0;
        });
        return \`
          <div class="card" style="padding:14px;margin-bottom:0;border:1px solid var(--border);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid #1c1c1c;padding-bottom:8px;">
              <div>
                <span style="font-size:14px;font-weight:900;color:#fff;">\${safeDisplayValue(m.name, 'Pasto')}</span>
                \${m.time ? \`<span style="font-size:11px;color:#888;margin-left:6px;">• \${m.time}</span>\` : ''}
              </div>
              <div style="display:flex;gap:4px;align-items:center;">
                <span class="macro-badge macro-kcal">\${Math.round(mKcal)} kcal</span>
                <span class="macro-badge macro-pro">\${Math.round(mPro)}P</span>
                <span class="macro-badge macro-carb">\${Math.round(mCarb)}C</span>
                <span class="macro-badge macro-fat">\${Math.round(mFat)}F</span>
              </div>
            </div>

            <!-- Foods in meal -->
            <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
              \${(m.foods || []).map((f, fIdx) => \`
                <div style="display:flex;justify-content:space-between;align-items:center;background:#121212;padding:8px 10px;border-radius:6px;font-size:12px;">
                  <div style="flex:1;">
                    <span style="font-weight:700;color:#eee;">\${safeDisplayValue(f.name, 'Alimento')}</span>
                    <span style="color:var(--gold);font-weight:800;margin-left:6px;">\${safeDisplayValue(f.quantity, '')} \${safeDisplayValue(f.unit, 'g')}</span>
                    \${f.notes ? \`<div style="font-size:10px;color:#777;margin-top:2px;">\${safeDisplayValue(f.notes, '')}</div>\` : ''}
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div style="font-size:10px;color:#aaa;text-align:right;">
                      <div>\${Math.round(f.kcal || 0)} kcal</div>
                      <div style="color:#666;font-size:9px;">\${Math.round(f.pro || 0)}P • \${Math.round(f.carb || 0)}C • \${Math.round(f.fat || 0)}F</div>
                    </div>
                    <button class="btn btn-outline" style="padding:2px 6px;font-size:10px;color:var(--accent-red);border-color:#333;" onclick="deleteFoodItem(\${currentNutritionDayIndex}, \${mIdx}, \${fIdx})">✕</button>
                  </div>
                </div>
              \`).join('')}
            </div>

            <button class="btn btn-outline" style="width:100%;font-size:11px;padding:6px;border-style:dashed;" onclick="openAddFoodModal(\${currentNutritionDayIndex}, \${mIdx})">+ AGGIUNGI ALIMENTO</button>
          </div>
        \`;
      }).join('')}
    </div>

    <button class="btn btn-outline" style="width:100%;margin-top:14px;font-size:11px;padding:10px;" onclick="addNutritionMeal(\${currentNutritionDayIndex})">+ AGGIUNGI PASTO A QUESTO GIORNO</button>
  \`;

  c.innerHTML = html;
}

function openAddFoodModal(dayIdx, mealIdx) {
  $('food-target-day').value = dayIdx;
  $('food-target-meal').value = mealIdx;
  $('food-search-input').value = '';
  $('food-name-input').value = '';
  $('food-qty-input').value = '100';
  $('food-kcal-input').value = '';
  $('food-pro-input').value = '';
  $('food-carb-input').value = '';
  $('food-fat-input').value = '';
  $('food-note-input').value = '';
  $('food-db-suggestions').style.display = 'none';
  $('add-food-modal').style.display = 'flex';
}

function closeAddFoodModal() {
  $('add-food-modal').style.display = 'none';
}

async function filterFoodDb(query) {
  const box = $('food-db-suggestions');
  if (!query || query.length < 2) {
    box.style.display = 'none';
    return;
  }
  const foods = await FoodDatabaseService.searchFoods(query);
  if (!foods || foods.length === 0) {
    box.style.display = 'none';
    return;
  }
  box.innerHTML = foods.slice(0, 5).map(f => \`
    <div style="padding:8px 10px;border-bottom:1px solid #222;cursor:pointer;display:flex;justify-content:space-between;align-items:center;" onclick='selectFoodFromDb(\${JSON.stringify(f)})'>
      <span style="font-size:11px;font-weight:700;color:#fff;">\${f.name}</span>
      <span style="font-size:10px;color:var(--gold);">\${f.kcalPer100} kcal/100g</span>
    </div>
  \`).join('');
  box.style.display = 'block';
}

let activeSelectedFoodRef = null;

function selectFoodFromDb(food) {
  activeSelectedFoodRef = food;
  $('food-name-input').value = food.name;
  $('food-unit-input').value = food.unit || 'g';
  $('food-db-suggestions').style.display = 'none';
  recalcFoodMacrosFromDb();
}

function recalcFoodMacrosFromDb() {
  if (!activeSelectedFoodRef) return;
  const qty = parseFloat($('food-qty-input').value) || 100;
  const ratio = qty / 100;
  $('food-kcal-input').value = Math.round((activeSelectedFoodRef.kcalPer100 || 0) * ratio);
  $('food-pro-input').value = Math.round((activeSelectedFoodRef.proPer100 || 0) * ratio * 10) / 10;
  $('food-carb-input').value = Math.round((activeSelectedFoodRef.carbPer100 || 0) * ratio * 10) / 10;
  $('food-fat-input').value = Math.round((activeSelectedFoodRef.fatPer100 || 0) * ratio * 10) / 10;
}

function saveFoodItem() {
  const dayIdx = parseInt($('food-target-day').value, 10);
  const mealIdx = parseInt($('food-target-meal').value, 10);
  const name = $('food-name-input').value.trim();
  if (!name) {
    showToast("Inserisci il nome dell'alimento", "warning");
    return;
  }
  const foodObj = {
    name,
    quantity: parseFloat($('food-qty-input').value) || 100,
    unit: $('food-unit-input').value || 'g',
    kcal: parseFloat($('food-kcal-input').value) || 0,
    pro: parseFloat($('food-pro-input').value) || 0,
    carb: parseFloat($('food-carb-input').value) || 0,
    fat: parseFloat($('food-fat-input').value) || 0,
    notes: $('food-note-input').value.trim()
  };

  if (!DATA.nutrition.days[dayIdx]) DATA.nutrition.days[dayIdx] = { day: 'Giorno ' + (dayIdx + 1), meals: [] };
  if (!DATA.nutrition.days[dayIdx].meals[mealIdx]) DATA.nutrition.days[dayIdx].meals[mealIdx] = { name: 'Pasto', foods: [] };
  if (!DATA.nutrition.days[dayIdx].meals[mealIdx].foods) DATA.nutrition.days[dayIdx].meals[mealIdx].foods = [];

  DATA.nutrition.days[dayIdx].meals[mealIdx].foods.push(foodObj);
  persist();
  closeAddFoodModal();
  render();
  showToast("Alimento aggiunto", "success");
}

function deleteFoodItem(dayIdx, mealIdx, foodIdx) {
  if (confirm("Rimuovere questo alimento?")) {
    DATA.nutrition.days[dayIdx].meals[mealIdx].foods.splice(foodIdx, 1);
    persist();
    render();
    showToast("Alimento rimosso", "info");
  }
}

function addNutritionDay() {
  const name = prompt("Nome del nuovo giorno (es. Sabato ON / Domenica Libera):", "Nuovo Giorno");
  if (name && name.trim()) {
    if (!DATA.nutrition) DATA.nutrition = { days: [] };
    if (!DATA.nutrition.days) DATA.nutrition.days = [];
    DATA.nutrition.days.push({
      day: name.trim(),
      meals: [
        { name: "Colazione", foods: [] },
        { name: "Pranzo", foods: [] },
        { name: "Cena", foods: [] }
      ]
    });
    currentNutritionDayIndex = DATA.nutrition.days.length - 1;
    persist();
    render();
    showToast("Giorno aggiunto", "success");
  }
}

function addNutritionMeal(dayIdx) {
  const mealName = prompt("Nome del pasto (es. Snack Pomeridiano, Spuntino Notturno):", "Nuovo Pasto");
  if (mealName && mealName.trim()) {
    if (!DATA.nutrition.days[dayIdx].meals) DATA.nutrition.days[dayIdx].meals = [];
    DATA.nutrition.days[dayIdx].meals.push({ name: mealName.trim(), foods: [] });
    persist();
    render();
    showToast("Pasto aggiunto", "success");
  }
}

// ====================================================
// TASK 20: SUPPLEMENTATION CONTROLLER & RENDERER
// ====================================================
function renderSupplements(c) {
  if (!DATA.supplementation) {
    DATA.supplementation = {
      protocol_name: "Protocollo Integrazione Performance & Salute",
      items: [
        { name: "Creatina Monoidrato", dose: "5", unit: "g", timing: "Post-workout / Colazione", frequency: "Quotidiano", notes: "Con carboidrati e abbondante acqua" },
        { name: "Omega 3 (EPA/DHA)", dose: "2", unit: "cps", timing: "Pranzo", frequency: "Quotidiano", notes: "Durante il pasto principale" },
        { name: "Vitamina D3", dose: "2000", unit: "UI", timing: "Colazione", frequency: "Quotidiano", notes: "Assieme a grassi dietetici" },
        { name: "Magnesio Bisglicinato", dose: "400", unit: "mg", timing: "Pre-nanna", frequency: "Quotidiano", notes: "30 minuti prima di dormire" },
        { name: "Caffeina Anidra", dose: "200", unit: "mg", timing: "Pre-workout", frequency: "Giorni ON", notes: "45 minuti prima del workout" }
      ]
    };
    persist();
  }

  const items = DATA.supplementation.items || [];

  let html = \`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div>
        <span style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1.5px;">SUPPLEMENT MASTER PROTOCOL</span>
        <h1 style="color:#fff;margin:2px 0 0;font-size:20px;">\${safeDisplayValue(DATA.supplementation.protocol_name, 'Integrazione')}</h1>
      </div>
      <button class="btn btn-primary" style="font-size:10px;padding:6px 12px;" onclick="openAddSupplementModal()">+ AGGIUNGI</button>
    </div>

    <div style="display:flex;flex-direction:column;gap:10px;">
      \${items.map((it, idx) => \`
        <div class="card-compact" style="border:1px solid var(--border);background:var(--surface);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <div>
              <span style="font-size:15px;font-weight:900;color:var(--gold);">\${safeDisplayValue(it.name, 'Integratore')}</span>
              <div style="display:flex;gap:6px;align-items:center;margin-top:4px;">
                <span style="background:rgba(212,175,55,0.15);color:var(--gold);font-size:11px;font-weight:800;padding:2px 6px;border-radius:4px;">\${safeDisplayValue(it.dose, '')} \${safeDisplayValue(it.unit, '')}</span>
                <span style="background:#222;color:#aaa;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">\${safeDisplayValue(it.timing, 'Generale')}</span>
                <span style="background:#181818;color:#777;font-size:10px;padding:2px 6px;border-radius:4px;">\${safeDisplayValue(it.frequency, 'Quotidiano')}</span>
              </div>
            </div>
            <div style="display:flex;gap:4px;">
              <button class="btn btn-outline" style="font-size:9px;padding:3px 6px;" title="Duplica" onclick="duplicateSupplementItem(\${idx})">📋</button>
              <button class="btn btn-outline" style="font-size:9px;padding:3px 6px;color:var(--accent-red);" title="Elimina" onclick="deleteSupplementItem(\${idx})">✕</button>
            </div>
          </div>
          \${it.notes ? \`<div style="font-size:11px;color:#888;margin-bottom:8px;">\${safeDisplayValue(it.notes, '')}</div>\` : ''}
          <div style="display:flex;gap:8px;margin-top:8px;border-top:1px solid #1c1c1c;padding-top:6px;">
            <button class="btn btn-outline" style="flex:1;font-size:10px;padding:4px 8px;border-color:rgba(212,175,55,0.4);color:var(--gold);" onclick="openExamineEvidenceModal('\${it.name}')">🔬 EVIDENZE SCIENTIFICHE</button>
            <button class="btn btn-outline" style="flex:1;font-size:10px;padding:4px 8px;" onclick="askAiAboutSupplement('\${it.name}')">🤖 CHIEDI AL COACH</button>
          </div>
        </div>
      \`).join('')}
    </div>
  \`;

  c.innerHTML = html;
}

function openAddSupplementModal() {
  $('supp-name-input').value = '';
  $('supp-dose-input').value = '';
  $('supp-note-input').value = '';
  $('supp-db-suggestions').style.display = 'none';
  $('add-supplement-modal').style.display = 'flex';
}

function closeAddSupplementModal() {
  $('add-supplement-modal').style.display = 'none';
}

async function filterSuppDb(query) {
  const box = $('supp-db-suggestions');
  if (!query || query.length < 2) {
    box.style.display = 'none';
    return;
  }
  const items = await SupplementDatabaseService.searchSupplements(query);
  if (!items || items.length === 0) {
    box.style.display = 'none';
    return;
  }
  box.innerHTML = items.slice(0, 5).map(s => \`
    <div style="padding:8px 10px;border-bottom:1px solid #222;cursor:pointer;display:flex;justify-content:space-between;align-items:center;" onclick='selectSuppFromDb(\${JSON.stringify(s)})'>
      <span style="font-size:11px;font-weight:700;color:#fff;">\${s.name}</span>
      <span style="font-size:10px;color:var(--gold);">\${s.typicalDose} \${s.unit}</span>
    </div>
  \`).join('');
  box.style.display = 'block';
}

function selectSuppFromDb(s) {
  $('supp-name-input').value = s.name;
  $('supp-dose-input').value = s.typicalDose || '';
  $('supp-unit-input').value = s.unit || 'g';
  $('supp-timing-input').value = s.timing || 'Colazione';
  $('supp-db-suggestions').style.display = 'none';
}

function saveSupplementItem() {
  const name = $('supp-name-input').value.trim();
  if (!name) {
    showToast("Inserisci il nome dell'integratore", "warning");
    return;
  }
  const item = {
    name,
    dose: $('supp-dose-input').value.trim() || '1',
    unit: $('supp-unit-input').value || 'g',
    timing: $('supp-timing-input').value || 'Colazione',
    frequency: $('supp-freq-input').value || 'Quotidiano',
    notes: $('supp-note-input').value.trim()
  };

  if (!DATA.supplementation) DATA.supplementation = { items: [] };
  if (!DATA.supplementation.items) DATA.supplementation.items = [];
  DATA.supplementation.items.push(item);

  persist();
  closeAddSupplementModal();
  render();
  showToast("Integratore aggiunto", "success");
}

function duplicateSupplementItem(idx) {
  const it = DATA.supplementation.items[idx];
  if (it) {
    DATA.supplementation.items.push(JSON.parse(JSON.stringify(it)));
    persist();
    render();
    showToast("Integratore duplicato", "success");
  }
}

function deleteSupplementItem(idx) {
  if (confirm("Rimuovere questo integratore dal protocollo?")) {
    DATA.supplementation.items.splice(idx, 1);
    persist();
    render();
    showToast("Integratore rimosso", "info");
  }
}

async function openExamineEvidenceModal(suppName) {
  const res = await ExamineService.getEvidence(suppName);
  const ev = res.evidence;
  const content = $('examine-evidence-content');
  content.innerHTML = \`
    <h2 style="color:var(--gold);margin-top:0;font-size:18px;">\${ev.name}</h2>
    <div style="background:rgba(212,175,55,0.1);border:1px solid var(--gold);padding:8px 12px;border-radius:8px;margin-bottom:12px;">
      <span style="font-size:10px;color:#aaa;font-weight:800;">LIVELLO DI EVIDENZA:</span>
      <span style="font-size:12px;font-weight:900;color:var(--gold);margin-left:6px;">\${ev.grade}</span>
    </div>
    <div style="margin-bottom:10px;">
      <div style="font-size:10px;font-weight:800;color:#aaa;">EFFETTI PRIMARI DOCUMENTATI</div>
      <div style="font-size:12px;color:#eee;margin-top:3px;line-height:1.4;">\${ev.primaryOutcomes}</div>
    </div>
    <div style="margin-bottom:10px;">
      <div style="font-size:10px;font-weight:800;color:#aaa;">DOSAGGIO SCIENTIFICO RACCOMANDATO</div>
      <div style="font-size:12px;color:var(--gold);margin-top:3px;">\${ev.dosage}</div>
    </div>
    <div style="margin-bottom:12px;">
      <div style="font-size:10px;font-weight:800;color:#aaa;">AVVERTENZE & SICUREZZA</div>
      <div style="font-size:11px;color:#888;margin-top:3px;">\${ev.warnings}</div>
    </div>
    <div style="font-size:9px;color:#555;font-style:italic;">Fonte: \${ev.source}</div>
  \`;
  $('examine-evidence-modal').style.display = 'flex';
}

function closeExamineEvidenceModal() {
  $('examine-evidence-modal').style.display = 'none';
}

function askAiAboutSupplement(name) {
  navigate('ai');
  $('ai-input').value = "Spiegami nel dettaglio il dosaggio, il timing e le evidenze per l'integrazione con " + name;
  askAI();
}

// ====================================================
// TASK 20: MEDICAL THERAPY CONTROLLER & RENDERER
// ====================================================
function renderTherapy(c) {
  if (!DATA.therapy) {
    DATA.therapy = {
      protocol_name: "Monitoraggio Terapia Medica Personale",
      medications: [
        { name: "Metformina", active_ingredient: "Metformina cloridrato", dose: "500", unit: "mg", timing: "Pranzo", days: ["Lunedi","Martedi","Mercoledi","Giovedi","Venerdi","Sabato","Domenica"], duration: "Continuativa", notes: "Durante il pasto" },
        { name: "Cardioaspirina", active_ingredient: "Acido acetilsalicilico", dose: "100", unit: "mg", timing: "Mattina", days: ["Lunedi","Martedi","Mercoledi","Giovedi","Venerdi","Sabato","Domenica"], duration: "Continuativa", notes: "A stomaco pieno" }
      ]
    };
    persist();
  }

  const meds = DATA.therapy.medications || [];

  let html = \`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div>
        <span style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1.5px;">MEDICAL THERAPY TRACKER</span>
        <h1 style="color:#fff;margin:2px 0 0;font-size:20px;">\${safeDisplayValue(DATA.therapy.protocol_name, 'Terapia')}</h1>
      </div>
      <button class="btn btn-primary" style="font-size:10px;padding:6px 12px;" onclick="openAddTherapyModal()">+ AGGIUNGI FARMACO</button>
    </div>

    <!-- Medical disclaimer badge -->
    <div style="background:rgba(255,77,77,0.1);border:1px solid rgba(255,77,77,0.3);padding:10px 12px;border-radius:8px;margin-bottom:14px;font-size:10px;color:#ff8888;line-height:1.4;">
      ⚠️ <strong>AVVERTENZA MEDICA:</strong> Questa sezione ha esclusivamente scopo di tracciamento e promemoria personale. Non sostituisce il parere o la prescrizione del medico curante.
    </div>

    <!-- Compact mobile-first grouped therapy cards -->
    <div style="display:flex;flex-direction:column;gap:10px;">
      \${meds.map((m, idx) => {
        const daysStr = Array.isArray(m.days) ? (m.days.length === 7 ? 'Tutti i giorni' : m.days.join(', ')) : (m.days || 'Quotidiano');
        return \`
          <div class="card-compact" style="border:1px solid var(--border);background:var(--surface);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
              <div>
                <span style="font-size:15px;font-weight:900;color:#fff;">\${safeDisplayValue(m.name, 'Farmaco')}</span>
                \${m.active_ingredient ? \`<span style="font-size:11px;color:#888;margin-left:6px;">(\${safeDisplayValue(m.active_ingredient, '')})</span>\` : ''}
                <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:6px;">
                  <span style="background:rgba(212,175,55,0.15);color:var(--gold);font-size:11px;font-weight:800;padding:2px 6px;border-radius:4px;">\${safeDisplayValue(m.dose, '')} \${safeDisplayValue(m.unit, '')}</span>
                  <span style="background:#222;color:#aaa;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">\${safeDisplayValue(m.timing, 'Mattina')}</span>
                  <span style="background:#181818;color:#4caf50;font-size:10px;padding:2px 6px;border-radius:4px;">📅 \${daysStr}</span>
                  \${m.duration ? \`<span style="background:#181818;color:#888;font-size:10px;padding:2px 6px;border-radius:4px;">⏱️ \${safeDisplayValue(m.duration, '')}</span>\` : ''}
                </div>
              </div>
              <button class="btn btn-outline" style="font-size:9px;padding:3px 6px;color:var(--accent-red);" onclick="deleteTherapyItem(\${idx})">✕</button>
            </div>
            \${m.notes ? \`<div style="font-size:11px;color:#777;margin-top:6px;">\${safeDisplayValue(m.notes, '')}</div>\` : ''}
          </div>
        \`;
      }).join('')}
    </div>
  \`;

  c.innerHTML = html;
}

function openAddTherapyModal() {
  $('therapy-name-input').value = '';
  $('therapy-ingredient-input').value = '';
  $('therapy-dose-input').value = '';
  $('therapy-duration-input').value = '';
  $('therapy-note-input').value = '';
  $('add-therapy-modal').style.display = 'flex';
}

function closeAddTherapyModal() {
  $('add-therapy-modal').style.display = 'none';
}

function saveTherapyItem() {
  const name = $('therapy-name-input').value.trim();
  if (!name) {
    showToast("Inserisci il nome del farmaco", "warning");
    return;
  }
  const selectedDays = [];
  document.querySelectorAll('#therapy-days-selector .pill-tab.active').forEach(el => {
    selectedDays.push(el.getAttribute('data-day'));
  });

  const med = {
    name,
    active_ingredient: $('therapy-ingredient-input').value.trim(),
    dose: $('therapy-dose-input').value.trim() || '1',
    unit: $('therapy-unit-input').value || 'compressa',
    timing: $('therapy-timing-input').value || 'Mattina',
    duration: $('therapy-duration-input').value.trim() || 'Continuativa',
    days: selectedDays.length > 0 ? selectedDays : ["Lunedi","Martedi","Mercoledi","Giovedi","Venerdi","Sabato","Domenica"],
    notes: $('therapy-note-input').value.trim()
  };

  if (!DATA.therapy) DATA.therapy = { medications: [] };
  if (!DATA.therapy.medications) DATA.therapy.medications = [];
  DATA.therapy.medications.push(med);

  persist();
  closeAddTherapyModal();
  render();
  showToast("Farmaco registrato", "success");
}

function deleteTherapyItem(idx) {
  if (confirm("Rimuovere questo farmaco dalla terapia?")) {
    DATA.therapy.medications.splice(idx, 1);
    persist();
    render();
    showToast("Farmaco rimosso", "info");
  }
}

// ====================================================
// TASK 20: CLINICAL EXAMS CONTROLLER & RENDERER
// ====================================================
function renderExams(c) {
  if (!DATA.exams && !DATA.clinical_exams) {
    DATA.exams = {
      patient_name: "Atleta",
      records: [
        { parameter: "Testosterone Totale", value: 680, unit: "ng/dL", range: "300 - 1000", date: "2025-01-15", lab: "Synlab", notes: "A digiuno" },
        { parameter: "Glicemia Basale", value: 85, unit: "mg/dL", range: "70 - 99", date: "2025-01-15", lab: "Synlab", notes: "Normale" },
        { parameter: "Colesterolo HDL", value: 62, unit: "mg/dL", range: "> 50", date: "2025-01-15", lab: "Synlab", notes: "Ottimale" },
        { parameter: "Creatinina", value: 1.05, unit: "mg/dL", range: "0.70 - 1.25", date: "2025-01-15", lab: "Synlab", notes: "Nella norma" },
        { parameter: "ALT (GPT)", value: 28, unit: "U/L", range: "10 - 50", date: "2025-01-15", lab: "Synlab", notes: "Funzionalita epatica OK" }
      ]
    };
    persist();
  }

  const examData = DATA.exams || DATA.clinical_exams || { records: [] };
  const records = examData.records || examData.items || [];

  let html = \`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div>
        <span style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1.5px;">CLINICAL LAB MONITORING</span>
        <h1 style="color:#fff;margin:2px 0 0;font-size:20px;">Esami Ematochimici</h1>
      </div>
      <button class="btn btn-primary" style="font-size:10px;padding:6px 12px;" onclick="openAddExamModal()">+ AGGIUNGI REFERTO</button>
    </div>

    <!-- Table of exam records -->
    <div style="display:flex;flex-direction:column;gap:8px;">
      \${records.map((r, idx) => \`
        <div class="card-compact" style="border:1px solid var(--border);background:var(--surface);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <span style="font-size:14px;font-weight:900;color:#fff;">\${safeDisplayValue(r.parameter, 'Parametro')}</span>
              <div style="display:flex;gap:6px;align-items:center;margin-top:4px;">
                <span style="background:rgba(212,175,55,0.15);color:var(--gold);font-size:13px;font-weight:900;padding:2px 8px;border-radius:4px;">\${safeDisplayValue(r.value, '')} \${safeDisplayValue(r.unit, '')}</span>
                <span style="font-size:10px;color:#888;">Ref: \${safeDisplayValue(r.range, 'N/D')}</span>
                <span style="font-size:10px;color:#666;">• \${safeDisplayValue(r.date, '')}</span>
              </div>
            </div>
            <div style="display:flex;gap:4px;">
              <button class="btn btn-outline" style="font-size:10px;padding:3px 8px;" onclick="explainExamParameterAI('\${r.parameter}', '\${r.value}', '\${r.unit}')">🤖 ANALIZZA</button>
              <button class="btn btn-outline" style="font-size:10px;padding:3px 6px;color:var(--accent-red);" onclick="deleteExamRecord(\${idx})">✕</button>
            </div>
          </div>
          \${r.notes || r.lab ? \`<div style="font-size:10px;color:#666;margin-top:6px;">\${r.lab ? 'Lab: ' + r.lab : ''} \${r.notes ? '• ' + r.notes : ''}</div>\` : ''}
        </div>
      \`).join('')}
    </div>
  \`;

  c.innerHTML = html;
}

function openAddExamModal() {
  $('exam-param-input').value = '';
  $('exam-value-input').value = '';
  $('exam-unit-input').value = '';
  $('exam-range-input').value = '';
  $('exam-notes-input').value = '';
  $('add-exam-modal').style.display = 'flex';
}

function closeAddExamModal() {
  $('add-exam-modal').style.display = 'none';
}

function saveExamRecord() {
  const param = $('exam-param-input').value.trim();
  const val = $('exam-value-input').value.trim();
  if (!param || !val) {
    showToast("Parametro e valore sono obbligatori", "warning");
    return;
  }
  const record = {
    parameter: param,
    value: parseFloat(val) || val,
    unit: $('exam-unit-input').value.trim() || '',
    range: $('exam-range-input').value.trim() || '',
    date: $('exam-date-input').value || new Date().toISOString().slice(0, 10),
    notes: $('exam-notes-input').value.trim()
  };

  if (!DATA.exams) DATA.exams = { records: [] };
  if (!DATA.exams.records) DATA.exams.records = [];
  DATA.exams.records.push(record);

  persist();
  closeAddExamModal();
  render();
  showToast("Referto salvato", "success");
}

function deleteExamRecord(idx) {
  if (confirm("Rimuovere questo referto?")) {
    const records = DATA.exams?.records || DATA.clinical_exams?.records;
    if (records) {
      records.splice(idx, 1);
      persist();
      render();
      showToast("Referto eliminato", "info");
    }
  }
}

function explainExamParameterAI(param, val, unit) {
  navigate('ai');
  $('ai-input').value = "Spiegami in termini generali il significato clinico e sportivo del parametro " + param + " con valore di " + val + " " + unit;
  askAI();
}

// ====================================================
// TASK 20: UNIFIED CALENDAR CONTROLLER & RENDERER
// ====================================================
let calendarSelectedDate = new Date().toISOString().slice(0, 10);
let calendarCurrentMonth = new Date().getMonth();
let calendarCurrentYear = new Date().getFullYear();

function renderCalendar(c) {
  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const firstDayIndex = new Date(calendarCurrentYear, calendarCurrentMonth, 1).getDay();
  const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  const daysInMonth = new Date(calendarCurrentYear, calendarCurrentMonth + 1, 0).getDate();

  let html = \`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div>
        <span style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1.5px;">UNIFIED CALENDAR & AGENDAS</span>
        <h1 style="color:#fff;margin:2px 0 0;font-size:20px;">\${monthNames[calendarCurrentMonth]} \${calendarCurrentYear}</h1>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn btn-outline" style="font-size:11px;padding:4px 10px;" onclick="changeCalendarMonth(-1)">◀</button>
        <button class="btn btn-outline" style="font-size:11px;padding:4px 10px;" onclick="changeCalendarMonth(1)">▶</button>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="card" style="padding:10px;margin-bottom:14px;border:1px solid var(--border);">
      <div class="calendar-grid" style="margin-top:0;">
        \${['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(d => \`<div class="calendar-day-header">\${d}</div>\`).join('')}
        \${Array(adjustedFirstDay).fill(0).map(() => \`<div style="opacity:0.2;"></div>\`).join('')}
        \${Array(daysInMonth).fill(0).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = \`\${calendarCurrentYear}-\${String(calendarCurrentMonth + 1).padStart(2, '0')}-\${String(dayNum).padStart(2, '0')}\`;
          const isSelected = dateStr === calendarSelectedDate;
          const isToday = dateStr === new Date().toISOString().slice(0, 10);
          return \`
            <div class="calendar-cell \${isSelected ? 'active' : ''} \${isToday ? 'today' : ''}" onclick="selectCalendarDate('\${dateStr}')">
              <span>\${dayNum}</span>
              <div class="calendar-badges-row">
                <span>🏋️</span>
                <span>🥗</span>
              </div>
            </div>
          \`;
        }).join('')}
      </div>
    </div>

    <!-- Timeline of selected date -->
    <div class="card" style="border:1px solid var(--border);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid #222;padding-bottom:6px;">
        <span style="font-size:12px;font-weight:900;color:var(--gold);">PROGRAMMA DEL GIORNO: \${calendarSelectedDate}</span>
      </div>

      <div class="timeline-item">
        <div class="timeline-time">08:00</div>
        <div class="timeline-content">
          <div style="font-size:12px;font-weight:800;color:#fff;">💊 Terapia & Integrazione Mattutina</div>
          <div style="font-size:10px;color:#888;">Vitamina D3 2000 UI • Cardioaspirina 100mg</div>
        </div>
      </div>

      <div class="timeline-item">
        <div class="timeline-time">08:30</div>
        <div class="timeline-content">
          <div style="font-size:12px;font-weight:800;color:#4caf50;">🥗 Colazione Completa</div>
          <div style="font-size:10px;color:#888;">Albume d'uovo, Avena in fiocchi, Frutti di bosco (~500 kcal)</div>
        </div>
      </div>

      <div class="timeline-item">
        <div class="timeline-time">17:00</div>
        <div class="timeline-content">
          <div style="font-size:12px;font-weight:800;color:var(--gold);">🏋️ Sessione Workout: Upper Body A</div>
          <div style="font-size:10px;color:#888;">Panca Piana, Trazioni, Military Press • Target 18 Serie</div>
          <button class="btn btn-primary" style="font-size:9px;padding:3px 8px;margin-top:6px;" onclick="navigate('training')">INIZIA QUESTA SESSIONE</button>
        </div>
      </div>

      <div class="timeline-item">
        <div class="timeline-time">18:30</div>
        <div class="timeline-content">
          <div style="font-size:12px;font-weight:800;color:#2196f3;">💊 Integrazione Post-Workout</div>
          <div style="font-size:10px;color:#888;">Creatina Monoidrato 5g • Proteine Whey 30g</div>
        </div>
      </div>

      <div class="timeline-item">
        <div class="timeline-time">20:30</div>
        <div class="timeline-content">
          <div style="font-size:12px;font-weight:800;color:#4caf50;">🥗 Cena Bilanciata</div>
          <div style="font-size:10px;color:#888;">Salmone al vapore, Patate lesse, Insalata verde (~650 kcal)</div>
        </div>
      </div>
    </div>
  \`;

  c.innerHTML = html;
}

function changeCalendarMonth(delta) {
  calendarCurrentMonth += delta;
  if (calendarCurrentMonth > 11) {
    calendarCurrentMonth = 0;
    calendarCurrentYear++;
  } else if (calendarCurrentMonth < 0) {
    calendarCurrentMonth = 11;
    calendarCurrentYear--;
  }
  render();
}

function selectCalendarDate(dateStr) {
  calendarSelectedDate = dateStr;
  render();
}

// ====================================================
// TASK 20: SETTINGS, I18N & MONETIZATION RENDERER
// ====================================================
function renderSettings(c) {
  const currentPlan = EntitlementService.getPlan();
  const currentLang = I18nService.getLanguage();
  const languages = I18nService.getAvailableLanguages();

  let html = \`
    <div style="margin-bottom:12px;">
      <span style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1.5px;">SYSTEM PREFERENCES</span>
      <h1 style="color:#fff;margin:2px 0 0;font-size:20px;">Impostazioni & Abbonamento</h1>
    </div>

    <!-- Language Switcher Card -->
    <div class="card" style="border:1px solid var(--border);margin-bottom:14px;">
      <div style="font-size:13px;font-weight:900;color:var(--gold);margin-bottom:8px;">🌍 SELEZIONA LINGUA (MULTILINGUA i18n)</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(90px, 1fr));gap:6px;">
        \${languages.map(l => \`
          <button class="pill-tab \${l.code === currentLang ? 'active' : ''}" style="text-align:center;padding:8px 4px;" onclick="changeAppLanguage('\${l.code}')">
            \${l.flag} \${l.name}
          </button>
        \`).join('')}
      </div>
    </div>

    <!-- Active Plan & Upgrade Card -->
    <div class="card" style="border:1px solid var(--border);background:linear-gradient(135deg, #18150c 0%, #0d0d0d 100%);margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div>
          <span style="font-size:10px;color:#888;font-weight:800;">PIANO ATTUALE:</span>
          <div style="font-size:16px;font-weight:900;color:var(--gold);">\${currentPlan}</div>
        </div>
        <button class="btn btn-primary" style="font-size:10px;padding:6px 12px;" onclick="navigate('pricing')">GESTISCI PIANI</button>
      </div>
      <div style="font-size:11px;color:#aaa;line-height:1.4;">
        \${pricingConfig.plans[currentPlan]?.description || 'Piano di utilizzo Giammaria System.'}
      </div>
    </div>

    <!-- Full Database JSON Backup & Restore -->
    <div class="card" style="border:1px solid var(--border);margin-bottom:14px;">
      <div style="font-size:13px;font-weight:900;color:var(--gold);margin-bottom:8px;">💾 BACKUP & RIPRISTINO COMPLETO</div>
      <p style="font-size:11px;color:#aaa;margin-bottom:10px;">Esporta tutti i dati di allenamento, nutrizione, terapia ed esami in un unico file JSON atomico.</p>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" style="flex:1;font-size:10px;padding:8px;" onclick="exportFullDatabaseBackup()">ESPORTA BACKUP (JSON)</button>
        <button class="btn btn-outline" style="flex:1;font-size:10px;padding:8px;" onclick="triggerImportBackupFile()">IMPORTA BACKUP</button>
      </div>
      <input type="file" id="import-backup-input" accept=".json" style="display:none;" onchange="importFullDatabaseBackup(this)">
    </div>

    <!-- Storage & Diagnostics Card -->
    <div class="card" style="border:1px solid var(--border);margin-bottom:14px;">
      <div style="font-size:13px;font-weight:900;color:var(--gold);margin-bottom:8px;">🛡️ STATO ARCHITETTURA & PERSISTENZA</div>
      <div style="font-size:11px;color:#aaa;display:flex;flex-direction:column;gap:4px;">
        <div>IndexedDB Store: <strong style="color:#4caf50;">ATTIVO (Core 2.0)</strong></div>
        <div>Coach API URL: <strong style="color:var(--gold);">\${COACH_API_URL}</strong></div>
        <div>Offline Mode: <strong style="color:#888;">\${store.prefs.offlineMode ? 'ATTIVA' : 'DISATTIVA'}</strong></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;">
        <button class="btn btn-outline" style="flex:1;font-size:10px;color:var(--accent-red);border-color:#442222;" onclick="resetWorkoutData()">AZZERA LOG WORKOUT</button>
        <button class="btn btn-outline" style="flex:1;font-size:10px;color:var(--accent-red);border-color:#442222;" onclick="resetAllData()">HARD RESET</button>
      </div>
    </div>
  \`;

  c.innerHTML = html;
}

function changeAppLanguage(lang) {
  I18nService.setLanguage(lang);
  render();
  showToast("Lingua aggiornata", "success");
}

function exportFullDatabaseBackup() {
  const fullBackup = {
    appName: "GIAMMARIA_SYSTEM",
    exportDate: new Date().toISOString(),
    version: "Master Task 20",
    store: store,
    DATA: DATA
  };
  const str = JSON.stringify(fullBackup, null, 2);
  const blob = new Blob([str], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "giammaria_system_backup_" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Backup completo esportato con successo", "success");
}

function triggerImportBackupFile() {
  $('import-backup-input').click();
}

function importFullDatabaseBackup(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.store) {
        store = { ...DEFAULT_STORE, ...parsed.store };
      }
      if (parsed.DATA) {
        DATA = normalizeProgram(parsed.DATA);
      }
      persist();
      render();
      showToast("Backup ripristinato con successo!", "success");
    } catch(err) {
      ErrorLogger.log("STORAGE_ERROR", "Import backup fallito", err);
      showToast("File di backup non valido", "error");
    }
  };
  reader.readAsText(file);
}

// ====================================================
// TASK 20: PRICING SCREEN RENDERER
// ====================================================
function renderPricing(c) {
  const plans = PricingService.getPlans();
  const currentPlan = EntitlementService.getPlan();

  let html = \`
    <div style="margin-bottom:14px;text-align:center;">
      <span style="font-size:10px;color:var(--gold);font-weight:800;letter-spacing:1.5px;">GIAMMARIA SYSTEM PRO</span>
      <h1 style="color:#fff;margin:4px 0 0;font-size:22px;">Piani & Abbonamenti</h1>
      <p style="font-size:11px;color:#aaa;margin-top:4px;">Sblocca il massimo potenziale: Coach AI contestuale, Universal Import e monitoraggio completo.</p>
    </div>

    <div class="pricing-grid">
      \${plans.map(p => {
        const isCurrent = p.name.toUpperCase() === currentPlan.toUpperCase();
        return \`
          <div class="pricing-card \${p.popular ? 'popular' : ''}">
            \${p.popular ? '<div style="position:absolute;top:10px;right:10px;background:var(--gold);color:#000;font-size:9px;font-weight:900;padding:2px 8px;border-radius:10px;">PIÙ POPOLARE</div>' : ''}
            <div>
              <span style="font-size:16px;font-weight:900;color:\${p.popular ? 'var(--gold)' : '#fff'};">\${p.name}</span>
              <div style="margin:10px 0;">
                <span style="font-size:26px;font-weight:900;color:#fff;">\${pricingConfig.symbol}\${p.price}</span>
                <span style="font-size:11px;color:#888;"> / \${p.period === 'month' ? 'mese' : (p.period === 'once' ? 'per sempre' : 'base')}</span>
              </div>
              <p style="font-size:11px;color:#ccc;margin-bottom:12px;line-height:1.4;">\${p.description}</p>
            </div>
            <div>
              <button class="btn \${isCurrent ? 'btn-outline' : 'btn-primary'}" style="width:100%;font-size:11px;padding:10px;" onclick="switchPlan('\${p.name.toUpperCase().split(' ')[0]}')">
                \${isCurrent ? '✓ PIANO ATTIVO' : (p.price === 0 ? 'ATTIVA FREE' : 'SCEGLI ' + p.name)}
              </button>
            </div>
          </div>
        \`;
      }).join('')}
    </div>
  \`;

  c.innerHTML = html;
}

function switchPlan(planName) {
  EntitlementService.setPlan(planName);
  showToast("Piano aggiornato a: " + planName, "success");
}

// ====================================================
// TASK 20: NAVIGATION HUB CONTROLLER
// ====================================================
function openMenuHub() {
  $('menu-hub-modal').style.display = 'flex';
}

function closeMenuHub() {
  $('menu-hub-modal').style.display = 'none';
}


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

  c.innerHTML = `
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
        <h3 style="font-size:18px; margin:4px 0 0; color:#fff; font-weight:800;">${esc(DATA?.title || DATA?.programTitle || 'Programma Senza Titolo')}</h3>
        <p style="font-size:11px; color:#888; margin:2px 0 0;">Autore: ${esc(DATA?.author || 'Coach')} • Durata: ${duration} Settimane</p>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; margin:12px 0;">
        <div class="card" style="padding:10px; background:rgba(255,255,255,0.02); text-align:center;">
          <div style="font-size:18px; font-weight:900; color:var(--gold);">${duration}</div>
          <div style="font-size:9px; color:#888; text-transform:uppercase; font-weight:700;">Settimane</div>
        </div>
        <div class="card" style="padding:10px; background:rgba(255,255,255,0.02); text-align:center;">
          <div style="font-size:18px; font-weight:900; color:var(--gold);">${sessionsCount}</div>
          <div style="font-size:9px; color:#888; text-transform:uppercase; font-weight:700;">Sedute Totali</div>
        </div>
        <div class="card" style="padding:10px; background:rgba(255,255,255,0.02); text-align:center;">
          <div style="font-size:18px; font-weight:900; color:var(--gold);">${totalExercises}</div>
          <div style="font-size:9px; color:#888; text-transform:uppercase; font-weight:700;">Esercizi</div>
        </div>
        <div class="card" style="padding:10px; background:rgba(255,255,255,0.02); text-align:center;">
          <div style="font-size:18px; font-weight:900; color:var(--gold);">${totalSets}</div>
          <div style="font-size:9px; color:#888; text-transform:uppercase; font-weight:700;">Serie Totali</div>
        </div>
      </div>

      <!-- Domain Status -->
      <div style="border-top:1px solid #222; padding-top:10px; margin-top:8px;">
        <div style="font-size:10px; color:#888; text-transform:uppercase; font-weight:800; margin-bottom:8px;">Ambiti Inclusi</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          <span style="font-size:10px; font-weight:800; padding:4px 8px; border-radius:4px; background:rgba(212,175,55,0.15); color:var(--gold); border:1px solid rgba(212,175,55,0.3);">🏋️ ALLENAMENTO (Attivo)</span>
          <span style="font-size:10px; font-weight:800; padding:4px 8px; border-radius:4px; ${hasNutr ? 'background:rgba(76,175,80,0.15); color:#4caf50; border:1px solid rgba(76,175,80,0.3);' : 'background:#1a1a1a; color:#555; border:1px solid #2a2a2a;'}">🥗 ALIMENTAZIONE (${hasNutr ? 'Inclusa' : 'Non presente'})</span>
          <span style="font-size:10px; font-weight:800; padding:4px 8px; border-radius:4px; ${hasSupp ? 'background:rgba(33,150,243,0.15); color:#2196f3; border:1px solid rgba(33,150,243,0.3);' : 'background:#1a1a1a; color:#555; border:1px solid #2a2a2a;'}">💊 INTEGRAZIONE (${hasSupp ? 'Inclusa' : 'Non presente'})</span>
          <span style="font-size:10px; font-weight:800; padding:4px 8px; border-radius:4px; ${hasTherapy ? 'background:rgba(156,39,176,0.15); color:#ab47bc; border:1px solid rgba(156,39,176,0.3);' : 'background:#1a1a1a; color:#555; border:1px solid #2a2a2a;'}">🩺 TERAPIA (${hasTherapy ? 'Inclusa' : 'Non presente'})</span>
          <span style="font-size:10px; font-weight:800; padding:4px 8px; border-radius:4px; ${hasExams ? 'background:rgba(0,188,212,0.15); color:#26c6da; border:1px solid rgba(0,188,212,0.3);' : 'background:#1a1a1a; color:#555; border:1px solid #2a2a2a;'}">🧪 ESAMI (${hasExams ? 'Inclusi' : 'Non presenti'})</span>
        </div>
      </div>
    </div>

    <!-- Models / Templates Section -->
    <div class="card">
      <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="font-size:14px; color:var(--gold); font-weight:800;">ARCHIVIO MODELLI & TEMPLATE</h3>
        <span style="font-size:10px; color:#666;">${(store.models || []).length} Modelli</span>
      </div>
      <div style="margin-top:10px;">
        ${(store.models && store.models.length > 0) ? store.models.map((m, idx) => `
          <div style="padding:10px; margin-bottom:8px; background:rgba(255,255,255,0.02); border:1px solid #222; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:13px; font-weight:800; color:#eee;">${esc(m.title || m.name || 'Modello ' + (idx+1))}</div>
              <div style="font-size:10px; color:#777;">Creato il: ${esc(m.createdAt || 'N/D')} • ${m.weeksCount || 0} Settimane</div>
            </div>
            <button class="btn btn-outline" style="font-size:10px; padding:4px 8px;" onclick="loadModelAsActive(${idx})">Carica</button>
          </div>
        `).join('') : '<div style="font-size:12px; color:#666; text-align:center; padding:16px;">Nessun modello archiviato. Importa o salva un template per vederlo qui.</div>'}
      </div>
    </div>
  `;
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
    c.innerHTML = `
      <div class="card" style="text-align:center; padding:40px 20px;">
        <div style="font-size:32px; margin-bottom:16px;">⚙️</div>
        <h2 style="font-size:18px; color:var(--gold); margin-bottom:8px;">ANALISI DOCUMENTO IN CORSO...</h2>
        <p style="font-size:12px; color:#888;">Estrazione matriciale 2D, normalizzazione esercizi e rilevamento multi-dominio.</p>
      </div>
    `;
    return;
  }

  if (prog) {
    const activeTab = pState.activeReviewTab || 'training';
    const weeks = prog.weeks || [];
    const nutr = prog.nutrition;
    const supp = prog.supplementation;
    const therapy = prog.therapy;
    const exams = prog.exams;

    c.innerHTML = `
      <div style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <span style="font-size:10px; color:var(--gold); font-weight:800; letter-spacing:1.5px; text-transform:uppercase;">REVISIONE INTERATTIVA</span>
          <h2 style="font-size:18px; margin:2px 0 0; color:#fff; font-weight:900;">CONFERMA IMPORTAZIONE</h2>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-outline" style="font-size:11px; padding:6px 12px;" onclick="cancelCurrentImportReview()">ANNULLA</button>
          <button class="btn btn-primary" style="font-size:11px; padding:6px 14px;" onclick="confirmImportAndActivate()">${pState.isConfirming ? 'ATTIVAZIONE...' : '✓ CONFERMA & ATTIVA'}</button>
        </div>
      </div>

      <!-- Domain Navigation Pills -->
      <div class="pill-tabs" style="margin-bottom:14px;">
        <button class="pill-tab ${activeTab === 'training' ? 'active' : ''}" onclick="switchReviewTab('training')">🏋️ Allenamento (${weeks.length}W)</button>
        ${nutr?.present || (nutr?.days?.length > 0) ? `<button class="pill-tab ${activeTab === 'nutrition' ? 'active' : ''}" onclick="switchReviewTab('nutrition')">🥗 Alimentazione (${nutr.days?.length || 0}G)</button>` : ''}
        ${supp?.present || (supp?.items?.length > 0) ? `<button class="pill-tab ${activeTab === 'supplements' ? 'active' : ''}" onclick="switchReviewTab('supplements')">💊 Integrazione (${supp.items?.length || 0})</button>` : ''}
        ${therapy?.present || (therapy?.medications?.length > 0) ? `<button class="pill-tab ${activeTab === 'therapy' ? 'active' : ''}" onclick="switchReviewTab('therapy')">🩺 Terapia (${therapy.medications?.length || 0})</button>` : ''}
        ${exams?.present || ((exams?.records || exams?.items || []).length > 0) ? `<button class="pill-tab ${activeTab === 'exams' ? 'active' : ''}" onclick="switchReviewTab('exams')">🧪 Esami (${(exams.records || exams.items || []).length})</button>` : ''}
      </div>

      <!-- Main Review Area -->
      <div id="import-review-body">
        ${activeTab === 'training' ? renderReviewTraining(prog) : ''}
        ${activeTab === 'nutrition' ? renderReviewNutrition(nutr) : ''}
        ${activeTab === 'supplements' ? renderReviewSupplements(supp) : ''}
        ${activeTab === 'therapy' ? renderReviewTherapy(therapy) : ''}
        ${activeTab === 'exams' ? renderReviewExams(exams) : ''}
      </div>
    `;
    return;
  }

  // Initial Import Dropzone & Mode Selector
  c.innerHTML = `
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
  `;
}

function renderReviewTraining(prog) {
  const weeks = prog.weeks || [];
  return `
    <div class="card" style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <label style="font-size:11px; font-weight:800; color:var(--gold);">TITOLO SCHEDA:</label>
        <input type="text" class="input" style="flex:1; margin-left:10px; font-size:12px; padding:4px 8px;" value="${esc(prog.title || 'Programma Importato')}" onchange="updateReviewTitle(this.value)">
      </div>
    </div>
    ${weeks.map((w, wIdx) => `
      <div class="card" style="margin-bottom:12px;">
        <h3 style="font-size:14px; color:var(--gold); font-weight:800; margin-bottom:8px;">${esc(w.label || 'Settimana ' + (w.weekNumber || (wIdx+1)))}</h3>
        ${(w.sessions || w.days || []).map((s, sIdx) => `
          <div style="background:rgba(255,255,255,0.02); border:1px solid #222; border-radius:6px; padding:8px; margin-bottom:8px;">
            <div style="font-size:12px; font-weight:800; color:#ddd; margin-bottom:6px;">${esc(s.name || 'Seduta ' + (sIdx+1))}</div>
            ${(s.exercises || s.rows || []).map((ex, exIdx) => `
              <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px; font-size:11px;">
                <input type="text" class="input" style="flex:3; font-size:11px; padding:4px;" value="${esc(ex.name_normalized || ex.name || ex.exercise || '')}" onchange="updateReviewExerciseField(${wIdx}, ${sIdx}, ${exIdx}, 'name', this.value)">
                <input type="text" class="input" style="flex:1; font-size:11px; padding:4px; text-align:center;" value="${esc(ex.reps_target || ex.reps || '8-10')}" placeholder="Reps" onchange="updateReviewExerciseField(${wIdx}, ${sIdx}, ${exIdx}, 'reps', this.value)">
                <input type="number" class="input" style="width:50px; font-size:11px; padding:4px; text-align:center;" value="${ex.rir_target !== undefined ? ex.rir_target : 2}" placeholder="RIR" onchange="updateReviewExerciseField(${wIdx}, ${sIdx}, ${exIdx}, 'rir', parseFloat(this.value))">
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `).join('')}
  `;
}

function renderReviewNutrition(nutr) {
  if (!nutr || !nutr.days) return '<div class="card">Nessun dato nutrizione</div>';
  return nutr.days.map((d, dIdx) => `
    <div class="card" style="margin-bottom:12px;">
      <h3 style="font-size:13px; color:var(--gold); font-weight:800; margin-bottom:8px;">${esc(d.day || d.day_name || 'Giorno ' + (dIdx+1))}</h3>
      ${(d.meals || []).map((m, mIdx) => `
        <div style="background:rgba(255,255,255,0.02); border:1px solid #222; border-radius:6px; padding:8px; margin-bottom:8px;">
          <div style="font-size:11px; font-weight:800; color:#4caf50; margin-bottom:6px;">${esc(m.name || m.meal_name || 'Pasto')}</div>
          ${(m.foods || m.items || []).map((f, fIdx) => `
            <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px; font-size:11px;">
              <input type="text" class="input" style="flex:3; font-size:11px; padding:4px;" value="${esc(f.name || f.food || '')}" onchange="updateReviewMealItem(${dIdx}, ${mIdx}, ${fIdx}, 'name', this.value)">
              <input type="text" class="input" style="flex:1; font-size:11px; padding:4px; text-align:center;" value="${esc(f.quantity || '')}" placeholder="Qta" onchange="updateReviewMealItem(${dIdx}, ${mIdx}, ${fIdx}, 'quantity', this.value)">
              <input type="text" class="input" style="width:40px; font-size:11px; padding:4px; text-align:center;" value="${esc(f.unit || 'g')}" placeholder="Unit" onchange="updateReviewMealItem(${dIdx}, ${mIdx}, ${fIdx}, 'unit', this.value)">
              <button class="btn btn-outline" style="color:var(--accent-red); padding:4px 6px; font-size:10px;" onclick="removeReviewMealItem(${dIdx}, ${mIdx}, ${fIdx})">✕</button>
            </div>
          `).join('')}
          <button class="btn btn-outline" style="font-size:9px; padding:3px 6px; margin-top:4px;" onclick="addReviewMealItem(${dIdx}, ${mIdx})">+ Alimento</button>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function renderReviewSupplements(supp) {
  if (!supp || !supp.items) return '<div class="card">Nessun dato integrazione</div>';
  return `
    <div class="card">
      <h3 style="font-size:13px; color:var(--gold); font-weight:800; margin-bottom:10px;">INTEGRAZIONE RILEVATA</h3>
      ${supp.items.map((item, idx) => `
        <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px; font-size:11px;">
          <input type="text" class="input" style="flex:3; font-size:11px; padding:4px;" value="${esc(item.name || '')}" onchange="updateReviewSupplementItem(${idx}, 'name', this.value)">
          <input type="text" class="input" style="flex:1; font-size:11px; padding:4px; text-align:center;" value="${esc(item.dose || item.dosage || '')}" placeholder="Dose" onchange="updateReviewSupplementItem(${idx}, 'dose', this.value)">
          <input type="text" class="input" style="flex:1.5; font-size:11px; padding:4px; text-align:center;" value="${esc(item.timing || 'Mattina')}" placeholder="Timing" onchange="updateReviewSupplementItem(${idx}, 'timing', this.value)">
          <button class="btn btn-outline" style="color:var(--accent-red); padding:4px 6px; font-size:10px;" onclick="removeReviewSupplementItem(${idx})">✕</button>
        </div>
      `).join('')}
      <button class="btn btn-outline" style="font-size:10px; padding:4px 8px; margin-top:6px;" onclick="addReviewSupplementItem()">+ Aggiungi Integratore</button>
    </div>
  `;
}

function renderReviewTherapy(therapy) {
  if (!therapy || !therapy.medications) return '<div class="card">Nessun dato terapia</div>';
  return `
    <div class="card">
      <h3 style="font-size:13px; color:var(--gold); font-weight:800; margin-bottom:10px;">TERAPIA RILEVATA</h3>
      ${therapy.medications.map((med, idx) => `
        <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px; font-size:11px;">
          <input type="text" class="input" style="flex:3; font-size:11px; padding:4px;" value="${esc(med.medication || med.name || '')}" onchange="updateReviewTherapyMedication(${idx}, 'medication', this.value)">
          <input type="text" class="input" style="flex:1; font-size:11px; padding:4px; text-align:center;" value="${esc(med.dose || '')}" placeholder="Dose" onchange="updateReviewTherapyMedication(${idx}, 'dose', this.value)">
          <input type="text" class="input" style="flex:2; font-size:11px; padding:4px; text-align:center;" value="${esc(Array.isArray(med.days) ? med.days.join(', ') : (med.days || 'Tutti i giorni'))}" placeholder="Giorni" onchange="updateReviewTherapyMedication(${idx}, 'days', this.value)">
          <button class="btn btn-outline" style="color:var(--accent-red); padding:4px 6px; font-size:10px;" onclick="removeReviewTherapyMedication(${idx})">✕</button>
        </div>
      `).join('')}
      <button class="btn btn-outline" style="font-size:10px; padding:4px 8px; margin-top:6px;" onclick="addReviewTherapyMedication()">+ Aggiungi Farmaco</button>
    </div>
  `;
}

function renderReviewExams(exams) {
  const records = exams?.records || exams?.items || [];
  if (!records.length) return '<div class="card">Nessun referto o esame rilevato</div>';
  return `
    <div class="card">
      <h3 style="font-size:13px; color:var(--gold); font-weight:800; margin-bottom:10px;">REFERTI & ESAMI RILEVATI</h3>
      ${records.map((rec, idx) => `
        <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px; font-size:11px;">
          <input type="text" class="input" style="flex:2.5; font-size:11px; padding:4px;" value="${esc(rec.parameter || rec.name || '')}" onchange="updateReviewExamRecord(${idx}, 'parameter', this.value)">
          <input type="text" class="input" style="flex:1; font-size:11px; padding:4px; text-align:center;" value="${esc(rec.value || '')}" placeholder="Valore" onchange="updateReviewExamRecord(${idx}, 'value', this.value)">
          <input type="text" class="input" style="width:45px; font-size:11px; padding:4px; text-align:center;" value="${esc(rec.unit || '')}" placeholder="Unità" onchange="updateReviewExamRecord(${idx}, 'unit', this.value)">
          <input type="text" class="input" style="flex:1.5; font-size:11px; padding:4px; text-align:center;" value="${esc(rec.reference_range || '')}" placeholder="Rif." onchange="updateReviewExamRecord(${idx}, 'reference_range', this.value)">
          <button class="btn btn-outline" style="color:var(--accent-red); padding:4px 6px; font-size:10px;" onclick="removeReviewExamRecord(${idx})">✕</button>
        </div>
      `).join('')}
      <button class="btn btn-outline" style="font-size:10px; padding:4px 8px; margin-top:6px;" onclick="addReviewExamRecord()">+ Aggiungi Esame</button>
    </div>
  `;
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