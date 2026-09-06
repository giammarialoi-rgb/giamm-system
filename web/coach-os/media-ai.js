(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }

  function page(title, subtitle, body) {
    return '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Assistive media</div>' +
      '<h1 class="coach-os-title">' + escText(title) + '</h1>' +
      '<p class="coach-os-subtitle">' + escText(subtitle) + '</p></div></div>' + body + '</div>';
  }

  CoachOS.views.coachNutrition = async function (container) {
    container.innerHTML = page(
      'Nutrition',
      'Photo → Estimate → Confirm → Log. L’AI non salva senza conferma.',
      '<div class="coach-os-card"><div class="coach-os-card-kicker">Meal estimate</div>' +
      '<input id="coach-os-meal-client" placeholder="Client ID" style="width:100%;min-height:44px;margin:6px 0;background:#0b0b0b;border:1px solid var(--co-border);color:#fff;border-radius:12px;padding:0 12px;">' +
      '<input id="coach-os-meal-p" placeholder="Protein g" style="width:100%;min-height:44px;margin:6px 0;background:#0b0b0b;border:1px solid var(--co-border);color:#fff;border-radius:12px;padding:0 12px;">' +
      '<input id="coach-os-meal-c" placeholder="Carbs g" style="width:100%;min-height:44px;margin:6px 0;background:#0b0b0b;border:1px solid var(--co-border);color:#fff;border-radius:12px;padding:0 12px;">' +
      '<input id="coach-os-meal-f" placeholder="Fats g" style="width:100%;min-height:44px;margin:6px 0;background:#0b0b0b;border:1px solid var(--co-border);color:#fff;border-radius:12px;padding:0 12px;">' +
      '<button class="btn" style="margin-top:8px;background:#111;color:#fff;" onclick="CoachOS.estimateMeal()">ESTIMATE</button>' +
      '<div id="coach-os-meal-result" class="coach-os-muted" style="margin-top:10px;"></div></div>'
    );
  };

  CoachOS.views.coachFormReview = async function (container) {
    container.innerHTML = page(
      'Video form',
      'Video → Markers → Feedback → Exercise history. Nessuna diagnosi clinica.',
      '<div class="coach-os-card"><div class="coach-os-card-kicker">Form review</div>' +
      '<input id="coach-os-form-client" placeholder="Client ID" style="width:100%;min-height:44px;margin:6px 0;background:#0b0b0b;border:1px solid var(--co-border);color:#fff;border-radius:12px;padding:0 12px;">' +
      '<input id="coach-os-form-exercise" placeholder="Exercise" style="width:100%;min-height:44px;margin:6px 0;background:#0b0b0b;border:1px solid var(--co-border);color:#fff;border-radius:12px;padding:0 12px;">' +
      '<input id="coach-os-form-markers" placeholder="Markers (es. 0:12 knee valgus; 0:28 depth)" style="width:100%;min-height:44px;margin:6px 0;background:#0b0b0b;border:1px solid var(--co-border);color:#fff;border-radius:12px;padding:0 12px;">' +
      '<textarea id="coach-os-form-feedback" placeholder="Feedback coach" style="width:100%;min-height:88px;margin:6px 0;background:#0b0b0b;border:1px solid var(--co-border);color:#fff;border-radius:12px;padding:10px 12px;"></textarea>' +
      '<button class="btn" style="margin-top:8px;background:#111;color:#fff;" onclick="CoachOS.saveFormReview()">SAVE MARKERS</button>' +
      '<div id="coach-os-form-result" class="coach-os-muted" style="margin-top:10px;"></div></div>'
    );
  };

  CoachOS.estimateMeal = async function () {
    const protein = document.getElementById('coach-os-meal-p').value;
    const carbs = document.getElementById('coach-os-meal-c').value;
    const fats = document.getElementById('coach-os-meal-f').value;
    const clientId = document.getElementById('coach-os-meal-client').value;
    const payload = await window.practiceFetch('/api/coach/meals/estimate', {
      method: 'POST',
      headers: window.practiceHeaders(true),
      body: JSON.stringify({ protein: protein, carbs: carbs, fats: fats, clientId: clientId || null })
    });
    window.__coachMealEstimate = payload.meal;
    const box = document.getElementById('coach-os-meal-result');
    if (box) {
      box.innerHTML = 'Stima ' + escText((payload.meal && payload.meal.estimated && payload.meal.estimated.calories) || '—') +
        ' kcal · confidence ' + escText(payload.meal && payload.meal.estimated && payload.meal.estimated.confidence) +
        '<br><button class="btn btn-outline" style="margin-top:8px;" onclick="CoachOS.confirmMeal()">CONFIRM & LOG</button>';
    }
  };

  CoachOS.confirmMeal = async function () {
    const meal = window.__coachMealEstimate;
    if (!meal) return;
    await window.practiceFetch('/api/coach/meals/' + encodeURIComponent(meal.id) + '/confirm', {
      method: 'POST',
      headers: window.practiceHeaders(true),
      body: JSON.stringify(meal.estimated || {})
    });
    if (typeof practiceToast === 'function') practiceToast('Pasto confermato', 'success');
  };

  CoachOS.saveFormReview = async function () {
    const clientId = document.getElementById('coach-os-form-client').value;
    const exercise = document.getElementById('coach-os-form-exercise').value;
    const raw = document.getElementById('coach-os-form-markers').value || '';
    const feedback = document.getElementById('coach-os-form-feedback').value;
    const markers = raw.split(';').map(function (part) { return part.trim(); }).filter(Boolean).map(function (part) {
      const bits = part.split(/\s+/);
      return { at: bits.shift() || '', note: bits.join(' ') };
    });
    const payload = await window.practiceFetch('/api/coach/form-reviews', {
      method: 'POST',
      headers: window.practiceHeaders(true),
      body: JSON.stringify({ clientId: clientId, exercise: exercise, markers: markers, feedback: feedback })
    });
    const box = document.getElementById('coach-os-form-result');
    if (box) box.textContent = 'Review salvata · ' + ((payload.review && payload.review.exercise) || exercise || 'exercise');
  };
})();
