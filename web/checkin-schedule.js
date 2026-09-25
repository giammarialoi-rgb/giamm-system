/*
 * Check-in programmati: il calendario, il contenuto, i confronti.
 *
 * Il coach sceglie per ogni atleta una cadenza (settimanale, quindicinale,
 * mensile), un giorno e un'ora; l'atleta ha 48 ore per compilare, poi il
 * check-in e' "saltato". Qui, senza DOM e senza stato:
 *   - il modello di default e la sua normalizzazione;
 *   - gli appuntamenti fra due date e il prossimo;
 *   - lo stato di ogni appuntamento (ricevuto, in attesa, saltato) a partire
 *     dai check-in ricevuti;
 *   - le differenze di ogni numero dal check-in precedente (solo numero e
 *     freccia, nessun giudizio);
 *   - l'allegato, costruito da numeri gia' calcolati altrove;
 *   - "applica a tutti", che non tocca i modelli personalizzati.
 */
(function (root) {
  'use strict';

  var DAY_MS = 86400000;
  var WINDOW_MS = 48 * 3600000;
  var CADENCES = ['weekly', 'biweekly', 'monthly'];
  var WEEKDAYS = ['Domenica', 'Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato'];
  var ROW_TYPES = ['scale', 'yesno', 'number', 'text'];

  // The default content. Every row can be switched off; the coach can add
  // rows of the four types and reorder them.
  function defaultRows() {
    return [
      { id: 'weight', type: 'weight', label: 'Peso', on: true },
      { id: 'photos', type: 'photos', label: 'Foto fronte, lato, retro (facoltative, private)', on: true },
      { id: 'sleep', type: 'scale', label: 'Sonno', on: true },
      { id: 'energy', type: 'scale', label: 'Energia', on: true },
      { id: 'hunger', type: 'scale', label: 'Fame', on: true },
      { id: 'pain', type: 'scale', label: 'Dolori', on: true },
      { id: 'adh_nutrition', type: 'scale', label: 'Aderenza all\'alimentazione', on: true },
      { id: 'adh_training', type: 'scale', label: 'Aderenza all\'allenamento', on: true },
      { id: 'question', type: 'text', label: 'Com\'\u00e8 andata la settimana?', on: true, coachQuestion: true }
    ];
  }

  function defaultTemplate() {
    return { cadence: 'weekly', weekday: 0, time: '18:00', rows: defaultRows(), customized: false, since: null };
  }

  function normalizeTime(t) {
    var m = String(t || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return '18:00';
    var h = Math.max(0, Math.min(23, Number(m[1])));
    var mi = Math.max(0, Math.min(59, Number(m[2])));
    return (h < 10 ? '0' : '') + h + ':' + (mi < 10 ? '0' : '') + mi;
  }

  function normalizeRow(r, i) {
    r = r || {};
    var fixed = ['weight', 'photos'].indexOf(r.type) >= 0;
    var type = fixed ? r.type : (ROW_TYPES.indexOf(r.type) >= 0 ? r.type : 'scale');
    return {
      id: String(r.id || ('c_' + i)).slice(0, 40),
      type: type,
      label: String(r.label || '').trim().slice(0, 120) || 'Domanda',
      on: r.on !== false,
      coachQuestion: !!r.coachQuestion
    };
  }

  function normalizeTemplate(t) {
    if (!t || typeof t !== 'object') return null;
    var rows = Array.isArray(t.rows) && t.rows.length ? t.rows.map(normalizeRow) : defaultRows();
    var seen = {};
    rows = rows.filter(function (r) { if (seen[r.id]) return false; seen[r.id] = true; return true; }).slice(0, 30);
    return {
      cadence: CADENCES.indexOf(t.cadence) >= 0 ? t.cadence : 'weekly',
      weekday: Number.isInteger(Number(t.weekday)) && Number(t.weekday) >= 0 && Number(t.weekday) <= 6 ? Number(t.weekday) : 0,
      time: normalizeTime(t.time),
      rows: rows,
      customized: !!t.customized,
      since: t.since ? String(t.since).slice(0, 10) : null
    };
  }

  /* ------------------------------ the calendar ------------------------------ */

  function atTime(day, time) {
    var parts = normalizeTime(time).split(':');
    var d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(parts[0]), Number(parts[1]), 0, 0);
    return d.getTime();
  }
  function startOfDay(ms) {
    var d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  // Weeks between two dates, by calendar day (safe across daylight saving).
  function weeksBetween(a, b) {
    var da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    var db = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((db - da) / (7 * DAY_MS));
  }
  function anchorOf(t) {
    // Every other week counts from the first scheduled day on or after "since".
    var base = t.since ? new Date(t.since + 'T00:00:00') : new Date(2026, 0, 4);
    var d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    while (d.getDay() !== t.weekday) d.setDate(d.getDate() + 1);
    return d;
  }
  function isScheduledDay(t, day) {
    if (day.getDay() !== t.weekday) return false;
    if (t.cadence === 'weekly') return true;
    if (t.cadence === 'biweekly') {
      var w = weeksBetween(anchorOf(t), day);
      return w % 2 === 0;
    }
    // monthly: the first such weekday of each month
    return day.getDate() <= 7;
  }

  /**
   * slots(template, fromMs, toMs) -> [dueAt ms], the appointments whose time
   * falls in [fromMs, toMs].
   */
  function slots(template, fromMs, toMs) {
    var t = normalizeTemplate(template);
    if (!t) return [];
    var out = [];
    var day = startOfDay(fromMs);
    var end = toMs;
    for (var guard = 0; guard < 800 && day.getTime() <= end; guard++) {
      if (isScheduledDay(t, day)) {
        var at = atTime(day, t.time);
        if (at >= fromMs && at <= toMs) out.push(at);
      }
      day.setDate(day.getDate() + 1);
    }
    return out;
  }

  // The next appointment at or after "now".
  function nextDue(template, nowMs) {
    var s = slots(template, nowMs, nowMs + 70 * DAY_MS);
    return s.length ? s[0] : null;
  }

  // The appointment open right now (due, not yet expired), if any.
  function openSlot(template, nowMs) {
    var s = slots(template, nowMs - WINDOW_MS, nowMs).filter(function (due) { return due + WINDOW_MS > nowMs; });
    if (!s.length) return null;
    var due = s[s.length - 1];
    return { dueAt: due, expiresAt: due + WINDOW_MS };
  }

  function receivedAtOf(c) {
    var v = c && (c.receivedAt || c.at || c.createdAt);
    var ms = v ? new Date(v).getTime() : NaN;
    return Number.isFinite(ms) ? ms : null;
  }
  // A check-in answers an appointment when it says so (scheduledFor), or,
  // failing that, when it arrived within its 48 hours.
  function answers(c, dueAt) {
    if (!c || c.kind === 'extra' || c.status === 'requested' || c.status === 'superseded') return false;
    if (c.scheduledFor) return Math.abs(new Date(c.scheduledFor).getTime() - dueAt) < 60000;
    var r = receivedAtOf(c);
    return r != null && r >= dueAt && r < dueAt + WINDOW_MS;
  }

  /**
   * statuses({ template, checkIns, now, from }) -> appointments newest first:
   * { dueAt, expiresAt, status: 'received' | 'pending' | 'skipped', checkIn,
   *   lateDays } plus the extra check-ins, { status: 'extra', checkIn }.
   */
  function statuses(o) {
    o = o || {};
    var now = o.now == null ? Date.now() : o.now;
    var t = normalizeTemplate(o.template);
    var list = (o.checkIns || []).slice();
    var out = [];
    if (t) {
      var from = o.from != null ? o.from : (t.since ? new Date(t.since + 'T00:00:00').getTime() : now - 56 * DAY_MS);
      slots(t, from, now).forEach(function (due) {
        var c = list.filter(function (x) { return answers(x, due); })[0] || null;
        var status = c ? 'received' : (now < due + WINDOW_MS ? 'pending' : 'skipped');
        out.push({ dueAt: due, expiresAt: due + WINDOW_MS, status: status, checkIn: c, lateDays: c ? 0 : Math.floor((now - due) / DAY_MS) });
      });
    }
    var used = out.map(function (x) { return x.checkIn; });
    list.forEach(function (c) {
      if (!c || used.indexOf(c) >= 0 || receivedAtOf(c) == null) return;
      if (c.status === 'requested' || c.status === 'superseded') return;
      // Extra check-ins, and the ones sent before this model existed.
      out.push({ dueAt: receivedAtOf(c), status: c.kind === 'extra' ? 'extra' : 'received', checkIn: c, lateDays: 0 });
    });
    return out.sort(function (a, b) { return (b.dueAt || 0) - (a.dueAt || 0); });
  }

  /* ------------------------------ the comparisons ------------------------------ */

  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  /**
   * diffFromPrevious(current, previous, rows) -> [{ id, label, value, prev,
   * delta, arrow }] for every number: weight, scales, numbers. The arrow says
   * which way, nothing more.
   */
  function diffFromPrevious(current, previous, rows) {
    var cur = current || {};
    var prev = previous || {};
    var ca = cur.answers || {};
    var pa = prev.answers || {};
    var out = [];
    var numeric = (rows || defaultRows()).filter(function (r) { return r.type === 'weight' || r.type === 'scale' || r.type === 'number'; });
    numeric.forEach(function (r) {
      var v = r.type === 'weight' ? num(cur.weight != null ? cur.weight : ca.weight) : num(ca[r.id]);
      var p = r.type === 'weight' ? num(prev.weight != null ? prev.weight : pa.weight) : num(pa[r.id]);
      if (v == null) return;
      var delta = p == null ? null : Math.round((v - p) * 10) / 10;
      out.push({
        id: r.id, label: r.label, value: v, prev: p, delta: delta,
        unit: r.type === 'weight' ? 'kg' : '',
        arrow: delta == null ? '' : (delta > 0 ? '\u2191' : (delta < 0 ? '\u2193' : '='))
      });
    });
    return out;
  }

  function formatDelta(d) {
    if (d == null || d.delta == null) return '';
    var abs = String(Math.abs(d.delta)).replace('.', ',');
    return (d.delta > 0 ? '+' : (d.delta < 0 ? '\u2212' : '\u00b1')) + abs + (d.unit ? ' ' + d.unit : '');
  }

  /**
   * buildAttachment({ week, target, sessionsDone, sessionsPlanned, restAvgSec })
   * The numbers the app already has, in one object the athlete sees before
   * sending and cannot edit. week: NurvanNutritionTargets.weekAverage(...).
   */
  function buildAttachment(o) {
    o = o || {};
    var w = o.week || null;
    var avg = w && w.average ? w.average : null;
    var target = o.target && o.target.kcal ? o.target : null;
    function r(n) { return n == null ? null : Math.round(n); }
    return {
      period: '7 giorni',
      nutrition: {
        average: avg ? { kcal: r(avg.kcal), pro: r(avg.pro), carb: r(avg.carb), fat: r(avg.fat), partial: !!avg.partial } : null,
        target: target ? { kcal: r(target.kcal), pro: r(target.pro), carb: r(target.carb), fat: r(target.fat), source: target.source || null } : null,
        loggedDays: w ? w.logged : 0,
        emptyDays: w ? w.empty : 7
      },
      training: {
        done: o.sessionsDone == null ? null : Number(o.sessionsDone),
        planned: o.sessionsPlanned == null ? null : Number(o.sessionsPlanned)
      },
      recovery: { avgRestSec: o.restAvgSec == null ? null : Math.round(o.restAvgSec) }
    };
  }

  /**
   * planApplyToAll(sourceClientId, clients[{ id, template }]) ->
   * { update: [ids], keep: [ids] }: the others get the model, except those
   * whose model was customized, which stay as they are.
   */
  function planApplyToAll(sourceId, clients) {
    var update = [];
    var keep = [];
    (clients || []).forEach(function (c) {
      if (!c || String(c.id) === String(sourceId)) return;
      var t = c.template || c.checkInTemplate || null;
      if (t && t.customized) keep.push(String(c.id));
      else update.push(String(c.id));
    });
    return { update: update, keep: keep };
  }

  // The weight to suggest: the last body check, if at most 2 days old.
  function weightPrefill(bodyChecks, nowMs) {
    var now = nowMs == null ? Date.now() : nowMs;
    var best = null;
    (bodyChecks || []).forEach(function (c) {
      var w = num(c && c.weight);
      var t = c && c.at ? new Date(c.at).getTime() : NaN;
      if (w > 0 && Number.isFinite(t) && (!best || t > best.t)) best = { w: w, t: t };
    });
    return best && now - best.t <= 2 * DAY_MS ? best.w : null;
  }

  root.NurvanCheckIns = {
    DAY_MS: DAY_MS,
    WINDOW_MS: WINDOW_MS,
    CADENCES: CADENCES,
    WEEKDAYS: WEEKDAYS,
    ROW_TYPES: ROW_TYPES,
    defaultRows: defaultRows,
    defaultTemplate: defaultTemplate,
    normalizeTemplate: normalizeTemplate,
    slots: slots,
    nextDue: nextDue,
    openSlot: openSlot,
    answersSlot: answers,
    statuses: statuses,
    diffFromPrevious: diffFromPrevious,
    formatDelta: formatDelta,
    buildAttachment: buildAttachment,
    planApplyToAll: planApplyToAll,
    weightPrefill: weightPrefill
  };
})(typeof self !== 'undefined' ? self : this);
