(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }

  CoachOS.views.coachNutrition = async function (container) {
    container.innerHTML =
      '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Portfolio</div>' +
      '<h1 class="coach-os-title">Nutrition</h1>' +
      '<p class="coach-os-subtitle">Stima pasto → conferma → log. L’AI non salva senza conferma.</p></div></div>' +
      '<div class="coach-os-card"><div class="coach-os-card-kicker">Meal estimate</div>' +
      '<input id="coach-os-meal-p" placeholder="Protein g" style="width:100%;min-height:44px;margin:6px 0;background:#0b0b0b;border:1px solid var(--co-border);color:#fff;border-radius:12px;padding:0 12px;">' +
      '<input id="coach-os-meal-c" placeholder="Carbs g" style="width:100%;min-height:44px;margin:6px 0;background:#0b0b0b;border:1px solid var(--co-border);color:#fff;border-radius:12px;padding:0 12px;">' +
      '<input id="coach-os-meal-f" placeholder="Fats g" style="width:100%;min-height:44px;margin:6px 0;background:#0b0b0b;border:1px solid var(--co-border);color:#fff;border-radius:12px;padding:0 12px;">' +
      '<button class="btn" style="margin-top:8px;background:#111;color:#fff;" onclick="CoachOS.estimateMeal()">ESTIMATE</button>' +
      '<div id="coach-os-meal-result" class="coach-os-muted" style="margin-top:10px;"></div></div></div>';
  };

  CoachOS.estimateMeal = async function () {
    const protein = document.getElementById('coach-os-meal-p').value;
    const carbs = document.getElementById('coach-os-meal-c').value;
    const fats = document.getElementById('coach-os-meal-f').value;
    const payload = await window.practiceFetch('/api/coach/meals/estimate', {
      method: 'POST',
      headers: window.practiceHeaders(true),
      body: JSON.stringify({ protein: protein, carbs: carbs, fats: fats })
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
})();
