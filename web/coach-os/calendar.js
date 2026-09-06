(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  const TYPES = ['Coaching Call', 'Check-in', 'Review', 'Consultation', 'Custom Session', 'Training Session'];
  const state = { appointments: [], availability: [], range: 'week' };

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }

  function timeZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (_) {
      return 'UTC';
    }
  }

  function inRange(item) {
    const start = new Date(item.startsAt).getTime();
    const now = Date.now();
    if (state.range === 'day') {
      const from = new Date(); from.setHours(0, 0, 0, 0);
      const to = new Date(from.getTime() + 86400000);
      return start >= from.getTime() && start < to.getTime();
    }
    if (state.range === 'month') return start >= now - 7 * 86400000 && start < now + 31 * 86400000;
    return start >= now - 2 * 86400000 && start < now + 8 * 86400000;
  }

  function render(container) {
    const rows = state.appointments.filter(inRange);
    container.innerHTML =
      '<div class="coach-os-page">' +
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Online coaching · ' + escText(timeZone()) + '</div>' +
      '<h1 class="coach-os-title">Calendar</h1>' +
      '<p class="coach-os-subtitle">Availability → booking → reminder → reschedule/cancel. Nessun Google/Apple Calendar.</p></div>' +
      '<button class="btn" style="background:#111;color:#fff;" onclick="CoachOS.createAppointmentPrompt()">NEW SESSION</button></div>' +
      '<div class="coach-os-quick-actions">' +
      ['day', 'week', 'month'].map(function (range) {
        return '<button class="coach-os-action' + (state.range === range ? ' active' : '') + '" onclick="CoachOS.setCalendarRange(\'' + range + '\')">' +
          range.toUpperCase() + '</button>';
      }).join('') +
      '<button class="coach-os-action" onclick="CoachOS.setAvailabilityPrompt()">AVAILABILITY</button>' +
      '<a class="coach-os-action" href="/api/coach/appointments.ics">ICAL</a></div>' +
      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Session types</h2></div>' +
      '<div class="coach-os-quick-actions">' + TYPES.map(function (type) {
        return '<span class="coach-os-action" style="cursor:default;">' + escText(type) + '</span>';
      }).join('') + '</div></section>' +
      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Availability</h2></div>' +
      (state.availability.length
        ? '<div class="coach-os-list">' + state.availability.map(function (rule) {
          function clock(minute) {
            const value = Number(minute);
            if (!Number.isFinite(value)) return '';
            const hours = String(Math.floor(value / 60)).padStart(2, '0');
            const mins = String(value % 60).padStart(2, '0');
            return hours + ':' + mins;
          }
          return '<div class="coach-os-row"><span class="coach-os-row-main"><strong>' +
            escText(rule.weekday != null ? 'Giorno ' + rule.weekday : 'Regola') + '</strong><span>' +
            escText(clock(rule.startMinute) || rule.startTime || '') + '–' +
            escText(clock(rule.endMinute) || rule.endTime || '') +
            ' · ' + escText(rule.timeZone || timeZone()) + '</span></span></div>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">Nessuna disponibilità. Imposta orari prima di prenotare.</div>') +
      '</section>' +
      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">Upcoming</h2></div>' +
      (rows.length
        ? '<div class="coach-os-list">' + rows.map(function (item) {
          return '<div class="coach-os-row"><span class="coach-os-row-main"><strong>' +
            escText(item.title) + '</strong><span>' + escText(item.type) + ' · ' +
            escText(String(item.startsAt || '').replace('T', ' ').slice(0, 16)) + ' · ' +
            escText(item.timeZone) + '</span></span>' +
            '<button class="btn btn-outline" style="font-size:9px;" onclick="CoachOS.rescheduleAppointment(\'' +
            escText(item.id) + '\')">RESCHEDULE</button>' +
            '<button class="btn btn-outline" style="font-size:9px;" onclick="CoachOS.cancelAppointment(\'' +
            escText(item.id) + '\')">CANCEL</button></div>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">Nessuna sessione in questa vista. Imposta disponibilità e prenota una Coaching Call.</div>') +
      '</section></div>';
  }

  CoachOS.views.coachCalendar = async function (container) {
    container.innerHTML = '<div class="coach-os-skeleton">Loading calendar…</div>';
    try {
      const payload = await window.practiceFetch('/api/coach/appointments', { headers: window.practiceHeaders() });
      state.appointments = payload.appointments || [];
      try {
        const avail = await window.practiceFetch('/api/coach/availability', { headers: window.practiceHeaders() });
        state.availability = avail.rules || avail.availability || [];
      } catch (_) {
        state.availability = [];
      }
      render(container);
    } catch (_) {
      render(container);
    }
  };

  CoachOS.setCalendarRange = function (range) {
    state.range = range;
    const page = document.querySelector('.coach-os-page');
    if (page && page.parentNode) render(page.parentNode);
    else CoachOS.navigate('coachCalendar');
  };

  CoachOS.setAvailabilityPrompt = async function () {
    const weekday = window.prompt('Giorno settimana (0=Dom … 6=Sab)', '1');
    if (weekday == null) return;
    const startTime = window.prompt('Inizio (HH:MM)', '09:00');
    if (!startTime) return;
    const endTime = window.prompt('Fine (HH:MM)', '17:00');
    if (!endTime) return;
    await window.practiceFetch('/api/coach/availability', {
      method: 'POST',
      headers: window.practiceHeaders(true),
      body: JSON.stringify({
        weekday: Number(weekday),
        startTime: startTime,
        endTime: endTime,
        timeZone: timeZone()
      })
    });
    CoachOS.navigate('coachCalendar');
  };

  CoachOS.createAppointmentPrompt = async function () {
    const title = window.prompt('Titolo sessione', 'Coaching Call');
    if (!title) return;
    const type = window.prompt('Tipo: ' + TYPES.join(', '), 'Coaching Call') || 'Coaching Call';
    const startsAt = window.prompt('Inizio ISO (es. 2026-09-06T09:00:00.000Z)');
    if (!startsAt) return;
    const weeks = window.prompt('Ricorrenza settimane (1 = singola)', '1') || '1';
    try {
      await window.practiceFetch('/api/coach/appointments', {
        method: 'POST',
        headers: window.practiceHeaders(true),
        body: JSON.stringify({
          title: title,
          type: type,
          startsAt: startsAt,
          recurrenceWeeks: Number(weeks) || 1,
          timeZone: timeZone(),
          clientId: store.coachWorkspace && store.coachWorkspace.clientId || null
        })
      });
      CoachOS.navigate('coachCalendar');
    } catch (error) {
      if (typeof practiceToast === 'function') practiceToast(error.message || 'Prenotazione non salvata', 'error');
    }
  };

  CoachOS.rescheduleAppointment = async function (id) {
    const startsAt = window.prompt('Nuovo inizio ISO');
    if (!startsAt) return;
    await window.practiceFetch('/api/coach/appointments/' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: window.practiceHeaders(true),
      body: JSON.stringify({ startsAt: startsAt })
    });
    CoachOS.navigate('coachCalendar');
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
