/* Per provare l'area coach A MANO in un browser (non headless), senza toccare il server vero.
 * 1. apri http://localhost:4173/?eval=1   (preview-webapp.mjs acceso)
 * 2. DevTools > Console: incolla PRIMA tutto mock.js, POI questo file.
 *    (il mock sostituisce window.fetch: da quel momento ogni /api/ e' finto, anche dopo il boot)
 * 3. ricarica la pagina = si perde tutto, rifai 2.
 */
(async function () {
  var st = document.createElement('style'); st.textContent = '#account-modal{display:none !important}'; document.head.appendChild(st);
  document.body.classList.remove('nurvan-locked'); document.getElementById('view-container').style.display = '';
  store.prefs.tutorialsOff = true;
  store.accountToken = 'fake'; store.accountUser = { id: 'coach1', email: 'c@example.com', name: 'Giammaria Loi' };
  store.coachUnlocked = true;
  store.coachFeatureFlags = { coachShellV2: true, coachTodayV2: true, checkInCenterV1: true, agentV1: true, schedulingV1: true, coachAnalyticsV1: true, businessV1: true, inboxV2: true, mealAiV1: true, videoFormV1: true };
  if (typeof onEntitlementReceived === 'function') onEntitlementReceived({ plan: 'coach_pro', planSource: 'manual', seats: null });
  try {
    var p = window.NurvanProgramGenerator.plan({ days: 4, weeks: 8, goal: 'hypertrophy', experience: 'intermediate', equipment: 'gym' });
    store.coachProgramLibrary = [
      { id: 'cpl_1', title: 'Ipertrofia upper/lower 8 settimane', savedAt: new Date().toISOString(), meta: { weeks: 8 }, payload: Object.assign({}, p, { nutrition: { present: true, days: [] } }) },
      { id: 'cpl_2', title: 'Forza di base 5x5 per principianti con gestione della spalla', savedAt: new Date().toISOString(), meta: { weeks: 12 }, payload: p }
    ];
  } catch (e) {}
  enterCoachSession();           // poi: navigate('coachToday'), navigate('coachCalendar'), openCoachClient('1') ...
})();
