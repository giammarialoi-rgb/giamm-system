(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  const TYPES = ['Coaching Call', 'Check-in', 'Review', 'Consultation', 'Custom Session', 'Training Session'];
  const state = { appointments: [], availability: [] };

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }

  function render(container) {
    container.innerHTML =
      '<div class="coach-os-page">' +
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Online coaching</div>' +
      '<h1 class="coach-os-title">Calendar</h1>' +
      '<p class="coach-os-subtitle">Call, check-in e review. Timezone esplicita, niente booking palestra-first.</p></div>' +
      '<button class="btn" style="background:#111;color:#fff;" onclick="CoachOS.createAppointmentPrompt()">NEW SESSION</button></div>' +
      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Session types</h2></div>' +
      '<div class="coach-os-quick-actions">' + TYPES.map(function (type) {
        return '<span class="coach-os-action" style="cursor:default;">' + escText(type) + '</span>';
      }).join('') + '</div></section>' +
      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Upcoming</h2></div>' +
      (state.appointments.length
        ? '<div class="coach-os-list">' + state.appointments.map(function (item) {
          return '<div class="coach-os-row"><span class="coach-os-row-main"><strong>' +
            escText(item.title) + '</strong><span>' + escText(item.type) + ' · ' +
            escText(String(item.startsAt || '').replace('T', ' ').slice(0, 16)) + ' · ' +
            escText(item.timeZone) + '</span></span>' +
            '<button class="btn btn-outline" style="font-size:9px;" onclick="CoachOS.cancelAppointment(\'' +
            escText(item.id) + '\')">CANCEL</button></div>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">Nessuna sessione. Imposta disponibilità e prenota una Coaching Call.</div>') +
      '</section></div>';
  }

  CoachOS.views.coachCalendar = async function (container) {
    container.innerHTML = '<div class="coach-os-skeleton">Loading calendar…</div>';
    try {
      const payload = await window.practiceFetch('/api/coach/appointments', { headers: window.practiceHeaders() });
      state.appointments = payload.appointments || [];
      render(container);
    } catch (_) {
      render(container);
    }
  };

  CoachOS.createAppointmentPrompt = async function () {
    const title = window.prompt('Titolo sessione', 'Coaching Call');
    if (!title) return;
    const startsAt = window.prompt('Inizio ISO (es. 2026-09-06T09:00:00.000Z)');
    if (!startsAt) return;
    try {
      await window.practiceFetch('/api/coach/appointments', {
        method: 'POST',
        headers: window.practiceHeaders(true),
        body: JSON.stringify({
          title: title,
          type: 'Coaching Call',
          startsAt: startsAt,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          clientId: store.coachWorkspace && store.coachWorkspace.clientId || null
        })
      });
      CoachOS.navigate('coachCalendar');
    } catch (error) {
      if (typeof practiceToast === 'function') practiceToast(error.message || 'Prenotazione non salvata', 'error');
    }
  };

  CoachOS.cancelAppointment = async function (id) {
    await window.practiceFetch('/api/coach/appointments/' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: window.practiceHeaders(true),
      body: JSON.stringify({ status: 'cancelled' })
    });
    CoachOS.navigate('coachCalendar');
  };
})();
