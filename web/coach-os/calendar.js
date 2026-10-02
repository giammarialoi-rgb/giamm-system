/*
 * The coach's calendar: the sessions booked with clients.
 *
 * A session is created from a form - who it is with, what kind, the day, the
 * time, how long, whether it repeats - and can then be moved, marked as done
 * or cancelled. It used to be made of prompt() boxes asking for an ISO date
 * typed by hand, a list of session types that did nothing, an "availability"
 * that could be added (as a weekday number) but never removed and that
 * nothing read, and a calendar-file link that could not work (a plain link
 * carries no login). Those are gone; the file is now downloaded with the
 * coach's session.
 */
(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  // The server's names for the kinds of session, and what the coach reads.
  const TYPES = [
    ['Training Session', 'Allenamento insieme'],
    ['Coaching Call', 'Chiamata di coaching'],
    ['Check-in', 'Check-in'],
    ['Review', 'Revisione del programma'],
    ['Consultation', 'Consulenza'],
    ['Custom Session', 'Altro']
  ];
  const DURATIONS = [15, 30, 45, 60, 90, 120];
  const REPEATS = [[1, 'Non si ripete'], [2, 'Ogni settimana, per 2 settimane'], [4, 'Ogni settimana, per 4 settimane'], [8, 'Ogni settimana, per 8 settimane'], [12, 'Ogni settimana, per 12 settimane']];
  const state = { appointments: [], clients: [], range: 'week', failed: false };

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value == null ? '' : value));
    return String(value == null ? '' : value).replace(/[&<>"']/g, '');
  }
  function T(text) { return typeof window.tr === 'function' ? window.tr(text) : text; }
  function locale() { try { return (document.documentElement && document.documentElement.lang) || 'it-IT'; } catch (_) { return 'it-IT'; } }
  function typeLabel(type) {
    const hit = TYPES.filter(function (t) { return t[0] === type; })[0];
    return T(hit ? hit[1] : (type || 'Altro'));
  }
  function timeZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (_) { return 'UTC'; }
  }
  function toast(msg, kind) { if (typeof window.practiceToast === 'function') window.practiceToast(T(msg), kind || 'info'); }
  // What the server says in English, in words for the coach.
  function errorText(error) {
    const m = String((error && error.message) || '');
    if (/collides/i.test(m)) return 'A quell’ora hai già un’altra sessione.';
    if (/end must be after start/i.test(m)) return 'La fine deve venire dopo l’inizio.';
    if (/Invalid appointment time/i.test(m)) return 'Data o ora non valide.';
    return m || 'Operazione non riuscita. Riprova.';
  }
  const pad = function (n) { return String(n).padStart(2, '0'); };
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function clock(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  // The window of days each view shows, from today.
  function rangeBounds() {
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const days = state.range === 'day' ? 1 : (state.range === 'month' ? 31 : 7);
    return { from: from, to: new Date(from.getTime() + days * 86400000) };
  }
  function visibleAppointments() {
    const b = rangeBounds();
    return state.appointments.filter(function (a) {
      if (a.status === 'cancelled') return false;
      const t = new Date(a.startsAt).getTime();
      return t >= b.from.getTime() && t < b.to.getTime();
    }).sort(function (x, y) { return new Date(x.startsAt) - new Date(y.startsAt); });
  }

  function render(container) {
    const rows = visibleAppointments();
    const byDay = {};
    rows.forEach(function (a) { const k = dayKey(new Date(a.startsAt)); (byDay[k] = byDay[k] || []).push(a); });
    const dayFmt = new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
    const ranges = [['day', 'Oggi'], ['week', '7 giorni'], ['month', '31 giorni']];
    container.innerHTML =
      '<div class="coach-os-page" id="coach-calendar-page">' +
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">' + escText(T('Coach')) + '</div>' +
      '<h1 class="coach-os-title">' + escText(T('Calendario')) + '</h1>' +
      '<p class="coach-os-subtitle">' + escText(T('Le sessioni fissate con i tuoi clienti. Gli orari sono nel tuo fuso:')) + ' ' + escText(timeZone()) + '</p></div>' +
      '<button class="btn btn-primary" onclick="CoachOS.openAppointmentForm()">' + escText(T('NUOVA SESSIONE')) + '</button></div>' +
      '<div class="coach-os-quick-actions">' +
      ranges.map(function (r) {
        return '<button class="coach-os-action' + (state.range === r[0] ? ' active' : '') + '" onclick="CoachOS.setCalendarRange(\'' + r[0] + '\')">' + escText(T(r[1])) + '</button>';
      }).join('') +
      '<button class="coach-os-action" onclick="CoachOS.downloadCalendarFile()">' + escText(T('Scarica per il calendario del telefono')) + '</button></div>' +
      (state.failed ? '<div class="coach-os-empty">' + escText(T('Calendario non disponibile adesso. Riprova tra poco.')) + '</div>' : '') +
      '<section class="coach-os-section">' +
      (rows.length
        ? Object.keys(byDay).map(function (k) {
          return '<div class="coach-os-section-head"><h2 class="coach-os-section-title">' + escText(dayFmt.format(new Date(byDay[k][0].startsAt))) + '</h2></div>' +
            '<div class="coach-os-list">' + byDay[k].map(function (a) {
              const start = new Date(a.startsAt); const end = new Date(a.endsAt);
              const done = a.status === 'completed';
              const id = escText(a.id);
              return '<div class="coach-os-row" style="flex-wrap:wrap;gap:8px;' + (done ? 'opacity:.55;' : '') + '"><span class="coach-os-row-main"><strong>' +
                escText(clock(start) + '–' + clock(end)) + ' · ' + escText(a.title) + '</strong><span>' +
                escText(typeLabel(a.type)) + (a.clientName ? ' · ' + escText(a.clientName) : '') + (done ? ' · ' + escText(T('fatta')) : '') +
                (a.notes ? ' · ' + escText(a.notes) : '') + '</span></span>' +
                (done ? '' :
                  '<button class="btn btn-outline" style="font-size:9px;" onclick="CoachOS.completeAppointment(\'' + id + '\')">' + escText(T('FATTA')) + '</button>' +
                  '<button class="btn btn-outline" style="font-size:9px;" onclick="CoachOS.openAppointmentForm(\'' + id + '\')">' + escText(T('SPOSTA')) + '</button>' +
                  '<button class="btn btn-outline" style="font-size:9px;color:#c66;border-color:#c66;" onclick="CoachOS.cancelAppointment(\'' + id + '\')">' + escText(T('ANNULLA SESSIONE')) + '</button>') +
                '</div>';
            }).join('') + '</div>';
        }).join('')
        : '<div class="coach-os-empty">' + escText(T('Nessuna sessione in questo periodo. Con NUOVA SESSIONE ne fissi una.')) + '</div>') +
      '</section></div>';
  }

  async function load() {
    const b = rangeBounds();
    // A little before today as well, so a session moved back is still found.
    const from = new Date(b.from.getTime() - 86400000).toISOString();
    const to = new Date(b.from.getTime() + 35 * 86400000).toISOString();
    const payload = await window.practiceFetch('/api/coach/appointments?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to), { headers: window.practiceHeaders() });
    state.appointments = payload.appointments || [];
    state.failed = false;
  }
  async function loadClients() {
    try {
      const payload = await window.practiceFetch('/api/coach/clients?limit=200&offset=0&q=', { method: 'GET', headers: window.practiceHeaders(false) }, 20000);
      state.clients = (payload.clients || []).map(function (c) { return { id: String(c.id), name: c.displayName || c.display_name || c.username || ('Cliente ' + c.id) }; });
    } catch (_) { /* the form still works, without a client */ }
  }
  function redraw() {
    const page = document.getElementById('coach-calendar-page');
    if (page && page.parentNode) render(page.parentNode);
  }
  async function refresh() {
    try { await load(); } catch (_) { state.failed = true; }
    redraw();
  }

  CoachOS.views.coachCalendar = async function (container) {
    // Drawn at once from what is already known; the fresh list replaces it.
    if (state.appointments.length || state.failed) render(container);
    else container.innerHTML = '<div class="coach-os-skeleton">' + escText(T('Carico il calendario…')) + '</div>';
    try { await load(); } catch (_) { state.failed = true; }
    if (typeof currentView === 'undefined' || currentView === 'coachCalendar') render(container);
    if (!state.clients.length) loadClients();
  };

  CoachOS.setCalendarRange = function (range) {
    state.range = range;
    redraw();
  };

  /* --------------------------- the form ---------------------------- */

  function closeForm() {
    const el = document.getElementById('coach-appointment-form');
    if (el) el.remove();
  }
  CoachOS.closeAppointmentForm = closeForm;

  // New session, or (with an id) moving one that exists.
  CoachOS.openAppointmentForm = async function (id) {
    closeForm();
    if (!state.clients.length) await loadClients();
    const existing = id ? state.appointments.filter(function (a) { return String(a.id) === String(id); })[0] : null;
    const start = existing ? new Date(existing.startsAt) : (function () { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d; })();
    const minutes = existing ? Math.max(15, Math.round((new Date(existing.endsAt) - new Date(existing.startsAt)) / 60000)) : 60;
    const field = 'width:100%;margin-top:4px;padding:10px;background:#111;border:1px solid #333;color:#fff;border-radius:8px;font-size:16px;box-sizing:border-box;';
    const label = function (text) { return '<label style="font-size:10px;color:#ccc;font-weight:800;display:block;margin-top:10px;">' + escText(T(text)); };
    const preset = store.coachWorkspace && store.coachWorkspace.clientId ? String(store.coachWorkspace.clientId) : '';
    const el = document.createElement('div');
    el.id = 'coach-appointment-form';
    el.style.cssText = 'display:flex;position:fixed;inset:0;z-index:100015;background:rgba(0,0,0,.88);align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
    el.onclick = function (ev) { if (ev.target === el) closeForm(); };
    el.innerHTML = '<div class="card" style="max-width:440px;width:100%;max-height:100%;overflow-y:auto;border:1px solid var(--gold);padding:16px;box-sizing:border-box;margin:0;">' +
      '<div style="font-size:14px;font-weight:900;color:var(--gold);">' + escText(T(existing ? 'Sposta la sessione' : 'Nuova sessione')) + '</div>' +
      (existing
        ? '<div style="font-size:12px;color:#bbb;margin-top:6px;">' + escText(existing.title) + (existing.clientName ? ' · ' + escText(existing.clientName) : '') + '</div>'
        : label('Con chi') + '<select id="cal-client" style="' + field + '" onchange="CoachOS.suggestAppointmentTitle()">' +
          '<option value="">' + escText(T('Nessun cliente (impegno mio)')) + '</option>' +
          state.clients.map(function (c) { return '<option value="' + escText(c.id) + '"' + (c.id === preset ? ' selected' : '') + '>' + escText(c.name) + '</option>'; }).join('') + '</select></label>' +
          label('Che cosa') + '<select id="cal-type" style="' + field + '" onchange="CoachOS.suggestAppointmentTitle()">' +
          TYPES.map(function (t) { return '<option value="' + escText(t[0]) + '">' + escText(T(t[1])) + '</option>'; }).join('') + '</select></label>' +
          label('Titolo') + '<input id="cal-title" type="text" maxlength="120" style="' + field + '"></label>') +
      label('Giorno') + '<input id="cal-date" type="date" value="' + dayKey(start) + '" style="' + field + '"></label>' +
      label('Ora') + '<input id="cal-time" type="time" step="300" value="' + clock(start) + '" style="' + field + '"></label>' +
      label('Durata') + '<select id="cal-duration" style="' + field + '">' +
      DURATIONS.concat(DURATIONS.indexOf(minutes) < 0 ? [minutes] : []).sort(function (a, b) { return a - b; }).map(function (m) {
        return '<option value="' + m + '"' + (m === minutes ? ' selected' : '') + '>' + (m < 60 ? m + ' min' : (m % 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : (m / 60) + ' h')) + '</option>';
      }).join('') + '</select></label>' +
      (existing ? '' :
        label('Ripetizione') + '<select id="cal-repeat" style="' + field + '">' +
        REPEATS.map(function (r) { return '<option value="' + r[0] + '">' + escText(T(r[1])) + '</option>'; }).join('') + '</select></label>' +
        label('Note (facoltative)') + '<input id="cal-notes" type="text" maxlength="300" style="' + field + '"></label>') +
      '<div id="cal-error" style="font-size:12px;color:#ff8a80;min-height:16px;margin-top:10px;"></div>' +
      '<div style="display:grid;gap:8px;margin-top:6px;">' +
      '<button type="button" class="btn btn-primary" id="cal-save" onclick="CoachOS.saveAppointmentForm(\'' + (existing ? escText(existing.id) : '') + '\')">' + escText(T(existing ? 'SPOSTA' : 'SALVA')) + '</button>' +
      '<button type="button" class="btn btn-outline" onclick="CoachOS.closeAppointmentForm()">' + escText(T('CHIUDI')) + '</button>' +
      '</div></div>';
    document.body.appendChild(el);
    if (!existing) CoachOS.suggestAppointmentTitle();
  };

  // "Chiamata di coaching · Mario Rossi", until the coach writes a title of their own.
  CoachOS.suggestAppointmentTitle = function () {
    const title = document.getElementById('cal-title');
    if (!title || title.getAttribute('data-own') === '1') return;
    const type = document.getElementById('cal-type');
    const client = document.getElementById('cal-client');
    const name = client && client.value ? client.options[client.selectedIndex].text : '';
    title.value = typeLabel(type ? type.value : '') + (name ? ' · ' + name : '');
    title.oninput = function () { title.setAttribute('data-own', '1'); };
  };

  CoachOS.saveAppointmentForm = async function (id) {
    const val = function (x) { const el = document.getElementById(x); return el ? String(el.value || '').trim() : ''; };
    const err = document.getElementById('cal-error');
    const say = function (m) { if (err) err.textContent = T(m); };
    const date = val('cal-date'); const time = val('cal-time');
    if (!date || !time) { say('Scegli giorno e ora.'); return; }
    const start = new Date(date + 'T' + time);
    if (isNaN(start.getTime())) { say('Data o ora non valide.'); return; }
    const end = new Date(start.getTime() + (Number(val('cal-duration')) || 60) * 60000);
    const btn = document.getElementById('cal-save');
    if (btn) btn.disabled = true;
    try {
      if (id) {
        await window.practiceFetch('/api/coach/appointments/' + encodeURIComponent(id), {
          method: 'PATCH', headers: window.practiceHeaders(true),
          body: JSON.stringify({ startsAt: start.toISOString(), endsAt: end.toISOString() })
        });
        toast('Sessione spostata', 'success');
      } else {
        const title = val('cal-title');
        if (!title) { say('Scrivi un titolo.'); if (btn) btn.disabled = false; return; }
        await window.practiceFetch('/api/coach/appointments', {
          method: 'POST', headers: window.practiceHeaders(true),
          body: JSON.stringify({
            title: title, type: val('cal-type') || 'Custom Session', clientId: val('cal-client') || null,
            startsAt: start.toISOString(), endsAt: end.toISOString(),
            recurrenceWeeks: Number(val('cal-repeat')) || 1, notes: val('cal-notes'), timeZone: timeZone()
          })
        });
        toast('Sessione salvata', 'success');
      }
      closeForm();
      await refresh();
    } catch (error) {
      say(errorText(error));
      if (btn) btn.disabled = false;
    }
  };

  async function patch(id, body, okText) {
    try {
      await window.practiceFetch('/api/coach/appointments/' + encodeURIComponent(id), { method: 'PATCH', headers: window.practiceHeaders(true), body: JSON.stringify(body) });
      toast(okText, 'success');
      await refresh();
    } catch (error) { toast(errorText(error), 'danger'); }
  }
  CoachOS.completeAppointment = function (id) { return patch(id, { status: 'completed' }, 'Segnata come fatta'); };
  CoachOS.cancelAppointment = function (id) {
    if (!window.confirm(T('Annullare questa sessione?'))) return;
    return patch(id, { status: 'cancelled' }, 'Sessione annullata');
  };
  // Kept under its old name for anything that still calls it.
  CoachOS.rescheduleAppointment = function (id) { return CoachOS.openAppointmentForm(id); };
  CoachOS.createAppointmentPrompt = function () { return CoachOS.openAppointmentForm(); };

  // The .ics file, fetched with the coach's session (a plain link has none).
  CoachOS.downloadCalendarFile = async function () {
    try {
      const url = (typeof window.coachEndpoint === 'function') ? window.coachEndpoint('/api/coach/appointments.ics') : '/api/coach/appointments.ics';
      const res = await fetch(url, { headers: window.practiceHeaders(false) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = new Blob([await res.text()], { type: 'text/calendar' });
      if (typeof window.downloadBlobHelper === 'function') { window.downloadBlobHelper(blob, 'nurvan-sessioni.ics'); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'nurvan-sessioni.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
    } catch (_) { toast('File del calendario non disponibile adesso.', 'danger'); }
  };

  CoachOS.calendarTestHooks = { state: state, visibleAppointments: visibleAppointments, errorText: errorText, typeLabel: typeLabel, TYPES: TYPES };
})();
