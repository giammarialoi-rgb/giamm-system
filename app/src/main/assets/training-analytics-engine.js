/* Nurvan Training Analytics Engine — formulas live here, not in the Stats UI. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TrainingAnalyticsEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* Logical sections (single file on purpose):
     raw normalization · volume · intensity · strength · workload ·
     fatigue · recovery · adaptation · landmarks · muscle attribution ·
     recommendations · insights · methodology/catalog · control-prep */

  const EPLEY_MAX_REPS = 12;
  const HARD_RIR_MAX = 2;
  const HARD_RPE_MIN = 8;
  const DEFAULT_LANDMARKS = { MV: 6, MEV: 8, MAV_LOW: 12, MAV_HIGH: 16, MRV: 20, kind: 'estimated_configurable' };

  let _cache = { key: '', at: 0, value: null };

  function num(v) {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  function int(v) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  function round1(n) {
    return Math.round(n * 10) / 10;
  }
  function pctDelta(cur, prev) {
    if (!(cur > 0) || !(prev > 0)) return null;
    return round1(((cur - prev) / prev) * 100);
  }
  function mean(arr) {
    const xs = (arr || []).filter(function (n) { return Number.isFinite(n); });
    if (!xs.length) return null;
    return xs.reduce(function (s, n) { return s + n; }, 0) / xs.length;
  }
  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function intensityFromRirRpe(value, scale) {
    const v = num(value);
    if (v == null) return null;
    const mode = String(scale || 'RIR').toUpperCase() === 'RPE' ? 'RPE' : 'RIR';
    if (mode === 'RPE') {
      if (v < 1 || v > 10) return null;
      return { scale: 'RPE', rpe: v, rir: round1(10 - v), intensity10: v };
    }
    if (v < 0 || v > 10) return null;
    return { scale: 'RIR', rir: v, rpe: round1(10 - v), intensity10: round1(10 - v) };
  }

  function epley1rm(load, reps) {
    const l = num(load);
    const r = int(reps);
    if (l == null || r == null || l <= 0 || r <= 0) return null;
    if (r > EPLEY_MAX_REPS) return null;
    if (r === 1) return round1(l);
    return round1(l * (1 + r / 30));
  }

  function relativeIntensity(load, e1rm) {
    const l = num(load);
    const e = num(e1rm);
    if (l == null || e == null || e <= 0 || l <= 0) return null;
    return round1((l / e) * 100);
  }

  function movingAverage(values, n) {
    const out = [];
    const xs = values || [];
    if (!n || xs.length < n) return out;
    for (let i = 0; i < xs.length; i++) {
      if (i + 1 < n) { out.push(null); continue; }
      let sum = 0, count = 0;
      for (let j = i - n + 1; j <= i; j++) {
        const v = num(xs[j]);
        if (v != null && v > 0) { sum += v; count += 1; }
      }
      out.push(count === n ? round1(sum / n) : null);
    }
    return out;
  }

  function isoWeekKey(ts) {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return null;
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
    return utc.getUTCFullYear() + '-W' + pad2(week);
  }

  function sessionDateMs(store, week, day) {
    const logs = (store && store.logs) || [];
    let best = null;
    for (let i = 0; i < logs.length; i++) {
      const l = logs[i];
      if (!l || Number(l.week) !== Number(week) || Number(l.day) !== Number(day)) continue;
      const t = Date.parse(l.at || '');
      if (Number.isFinite(t) && (best == null || t > best)) best = t;
    }
    return best;
  }

  function resolveExerciseName(data, store, week, day, exIdx) {
    try {
      if (exIdx >= 900) {
        const bonus = (store && store.bonus && store.bonus['w' + week + '_d' + day]) || [];
        const b = bonus[exIdx - 900];
        if (b) return b.name || b.exercise || 'Bonus';
      }
      const w = data && data.weeks && data.weeks[week - 1];
      const sess = w && (w.sessions || w.days) && (w.sessions || w.days)[day];
      const list = sess && (sess.exercises || sess.rows);
      const ex = list && list[exIdx];
      if (ex) return ex.name || ex.exercise || ('Esercizio ' + (exIdx + 1));
      const sub = store && store.subs && store.subs['w' + week + '_d' + day + '_e' + exIdx];
      if (sub) return sub;
    } catch (_) {}
    return 'Esercizio ' + (exIdx + 1);
  }

  function exerciseMeta(data, store, week, day, exIdx) {
    if (exIdx >= 900) {
      const bonus = (store && store.bonus && store.bonus['w' + week + '_d' + day]) || [];
      return bonus[exIdx - 900] || {};
    }
    try {
      const w = data && data.weeks && data.weeks[week - 1];
      const sess = w && (w.sessions || w.days) && (w.sessions || w.days)[day];
      const list = sess && (sess.exercises || sess.rows);
      return (list && list[exIdx]) || {};
    } catch (_) {
      return {};
    }
  }

  function scaleForSet(store, eK, week) {
    const ex = store && store.exIntensity && store.exIntensity[eK];
    if (ex) return String(ex).toUpperCase() === 'RPE' ? 'RPE' : 'RIR';
    const weekScale = store && store.prefs && store.prefs.weekIntensity
      && (store.prefs.weekIntensity[week] || store.prefs.weekIntensity[String(week)]);
    if (weekScale) return String(weekScale).toUpperCase() === 'RPE' ? 'RPE' : 'RIR';
    const pref = store && store.prefs && store.prefs.intensityType;
    return String(pref || 'RIR').toUpperCase() === 'RPE' ? 'RPE' : 'RIR';
  }

  function fingerprint(store, opts) {
    const data = (store && store.data) || {};
    let n = 0, acc = 0;
    Object.keys(data).forEach(function (k) {
      n += 1;
      const v = num(data[k]);
      if (v != null) acc += v;
    });
    return [
      n, Math.round(acc),
      ((store && store.logs) || []).length,
      opts.axis, opts.zoomWeeks, opts.muscle || '', opts.exercise || '',
      opts.includeIncompleteWeeks ? '1' : '0',
      opts.currentWeek || 0
    ].join('|');
  }

  function plannedDaysForWeek(data, week) {
    const w = data && data.weeks && data.weeks[week - 1];
    const days = (w && (w.sessions || w.days)) || [];
    return days.length;
  }

  function typicalPlannedDays(data, store) {
    let typical = 0;
    ((data && data.weeks) || []).forEach(function (w) {
      const n = ((w && (w.sessions || w.days)) || []).length;
      if (n > typical) typical = n;
    });
    const freq = Number(store && store.prefs && store.prefs.frequency) || 0;
    return Math.max(typical, freq, 0);
  }

  function sessionFinalized(store, week, day) {
    return ((store && store.logs) || []).some(function (row) {
      return row && Number(row.week) === Number(week) && Number(row.day) === Number(day);
    });
  }

  function finalizedDayCount(store, week) {
    const seen = {};
    ((store && store.logs) || []).forEach(function (row) {
      if (row && Number(row.week) === Number(week)) seen[String(Number(row.day))] = true;
    });
    return Object.keys(seen).length;
  }

  function isWeekComplete(store, data, week) {
    const planned = plannedDaysForWeek(data, week);
    const need = Math.max(planned, typicalPlannedDays(data, store));
    if (!need) return false;
    if (planned) {
      for (let d = 0; d < planned; d++) {
        if (!sessionFinalized(store, week, d)) return false;
      }
    }
    return finalizedDayCount(store, week) >= need;
  }

  function isCalendarWeekComplete(isoKey) {
    if (!isoKey || String(isoKey).indexOf('-W') < 0) return false;
    const now = isoWeekKey(Date.now());
    return now != null && isoKey < now;
  }

  function normalizeSets(store, data, opts) {
    opts = opts || {};
    const matchMuscle = opts.matchMuscle || function () { return true; };
    const muscle = opts.muscle || 'TOTAL';
    const exerciseFilter = String(opts.exercise || '').trim().toLowerCase();
    const map = {};
    Object.keys((store && store.data) || {}).forEach(function (k) {
      const m = k.match(/^w(\d+)_d(\d+)_e(\d+)_s(\d+)_(load|reps|rir|done)$/);
      if (!m) return;
      const id = 'w' + m[1] + '_d' + m[2] + '_e' + m[3] + '_s' + m[4];
      if (!map[id]) map[id] = { week: +m[1], day: +m[2], exIdx: +m[3], set: +m[4] };
      map[id][m[5]] = store.data[k];
    });

    const out = [];
    Object.keys(map).forEach(function (id) {
      const row = map[id];
      const eK = 'w' + row.week + '_d' + row.day + '_e' + row.exIdx;
      if (store && store.skips && store.skips[eK]) return;
      const loadRaw = num(row.load);
      const reps = int(row.reps);
      if (loadRaw == null || loadRaw <= 0 || reps == null || reps <= 0) return;
      const meta = exerciseMeta(data, store, row.week, row.day, row.exIdx);
      const name = (store && store.subs && store.subs[eK]) || resolveExerciseName(data, store, row.week, row.day, row.exIdx);
      if (!matchMuscle(name, meta.movement, meta.muscle_groups || meta.muscleGroups, muscle, eK)) return;
      if (exerciseFilter && String(name).toLowerCase().indexOf(exerciseFilter) < 0) return;
      const isPart = !!(store && store.loadTypes && store.loadTypes[eK] === 'part');
      const load = isPart ? loadRaw * 2 : loadRaw;
      const scale = scaleForSet(store, eK, row.week);
      const effort = intensityFromRirRpe(row.rir, scale);
      const estRir = effort ? effort.rir : null;
      const e1 = epley1rm(loadRaw, reps);
      const dateMs = sessionDateMs(store, row.week, row.day);
      out.push({
        week: row.week,
        day: row.day,
        exIdx: row.exIdx,
        set: row.set,
        name: name,
        load: load,
        loadRaw: loadRaw,
        reps: reps,
        isPart: isPart,
        scale: scale,
        rir: effort ? effort.rir : null,
        rpe: effort ? effort.rpe : null,
        intensity10: effort ? effort.intensity10 : null,
        volume: load * reps,
        effectivePts: load * (reps + (estRir != null ? estRir : 0)),
        e1rm: e1,
        hardSet: effort ? (effort.rir != null && effort.rir <= HARD_RIR_MAX) || (effort.rpe != null && effort.rpe >= HARD_RPE_MIN) : null,
        dateMs: dateMs,
        calendarKey: dateMs != null ? isoWeekKey(dateMs) : null,
        muscleGroups: (meta.muscle_groups || meta.muscleGroups || []).slice(),
        movement: meta.movement || '',
        contribution: muscleContributionForExercise(name, meta),
        kind: 'observed'
      });
    });
    return out.sort(function (a, b) {
      return a.week - b.week || a.day - b.day || a.exIdx - b.exIdx || a.set - b.set;
    });
  }

  function emptyWeek(label, key) {
    return {
      key: key,
      label: label,
      volume: 0,
      effectivePts: 0,
      sets: 0,
      hardSets: 0,
      reps: 0,
      loadSum: 0,
      intensityVals: [],
      rirVals: [],
      rpeVals: [],
      e1rms: [],
      sessions: {},
      exercises: {},
      empty: true,
      complete: false,
      inProgress: false,
      weekNum: null
    };
  }

  function addSetToBucket(b, s) {
    b.empty = false;
    b.volume += s.volume;
    b.effectivePts += s.effectivePts;
    b.sets += 1;
    if (s.hardSet === true) b.hardSets += 1;
    b.reps += s.reps;
    b.loadSum += s.load;
    if (s.intensity10 != null) b.intensityVals.push(s.intensity10);
    if (s.rir != null) b.rirVals.push(s.rir);
    if (s.rpe != null) b.rpeVals.push(s.rpe);
    if (s.e1rm != null) b.e1rms.push(s.e1rm);
    const sk = s.week + '_' + s.day;
    b.sessions[sk] = true;
    if (!b.exercises[s.name]) b.exercises[s.name] = { volume: 0, sets: 0, reps: 0, e1rms: [] };
    b.exercises[s.name].volume += s.volume;
    b.exercises[s.name].sets += 1;
    b.exercises[s.name].reps += s.reps;
    if (s.e1rm != null) b.exercises[s.name].e1rms.push(s.e1rm);
  }

  function finalizeBucket(b) {
    const freq = Object.keys(b.sessions).length;
    const avgLoad = b.sets ? round1(b.loadSum / b.sets) : null;
    const avgInt = mean(b.intensityVals);
    const maxE1 = b.e1rms.length ? Math.max.apply(null, b.e1rms) : null;
    return {
      key: b.key,
      label: b.label,
      volume: Math.round(b.volume),
      effectivePts: Math.round(b.effectivePts),
      sets: b.sets,
      hardSets: b.hardSets,
      reps: b.reps,
      avgLoad: avgLoad,
      avgIntensity: avgInt != null ? round1(avgInt) : null,
      avgRir: mean(b.rirVals) != null ? round1(mean(b.rirVals)) : null,
      avgRpe: mean(b.rpeVals) != null ? round1(mean(b.rpeVals)) : null,
      e1rm: maxE1,
      frequency: freq,
      empty: !!b.empty,
      sessionCount: freq,
      complete: !!b.complete,
      inProgress: !!b.inProgress,
      weekNum: b.weekNum != null ? b.weekNum : null
    };
  }

  function trainingBuckets(sets, weekCount) {
    const n = Math.max(1, weekCount || 1);
    const buckets = [];
    for (let w = 1; w <= n; w++) {
      const b = emptyWeek('W' + w, 'tw-' + w);
      b.weekNum = w;
      buckets.push(b);
    }
    sets.forEach(function (s) {
      const i = s.week - 1;
      if (i < 0) return;
      while (buckets.length <= i) {
        const w = buckets.length + 1;
        const b = emptyWeek('W' + w, 'tw-' + w);
        b.weekNum = w;
        buckets.push(b);
      }
      addSetToBucket(buckets[i], s);
    });
    return buckets.map(finalizeBucket);
  }

  function calendarBuckets(sets) {
    const map = {};
    const order = [];
    sets.forEach(function (s) {
      if (!s.calendarKey) return;
      if (!map[s.calendarKey]) {
        map[s.calendarKey] = emptyWeek(s.calendarKey, s.calendarKey);
        order.push(s.calendarKey);
      }
      addSetToBucket(map[s.calendarKey], s);
    });
    order.sort();
    return order.map(function (k) { return finalizeBucket(map[k]); });
  }

  function markWeekCompletion(buckets, store, data, axis) {
    return (buckets || []).map(function (b, i) {
      let complete = false;
      if (axis === 'calendar') {
        complete = isCalendarWeekComplete(b.key);
      } else {
        const weekNum = b.weekNum != null ? b.weekNum : (i + 1);
        complete = isWeekComplete(store, data, weekNum);
        b.weekNum = weekNum;
      }
      b.complete = complete;
      b.inProgress = !complete && !b.empty;
      const base = String(b.label || '').replace(/ — in corso$/, '');
      b.label = b.inProgress ? (base + ' — in corso') : base;
      return b;
    });
  }

  function eligibleWeekIndices(weeks, includeIncomplete) {
    const hasCompleteFlags = (weeks || []).some(function (w) { return w && typeof w.complete === 'boolean'; });
    const out = [];
    (weeks || []).forEach(function (w, i) {
      if (hasCompleteFlags && includeIncomplete === false) {
        if (w.complete) out.push(i);
      } else if (!w.empty) {
        out.push(i);
      }
    });
    return out;
  }

  function applyZoom(weeks, zoomWeeks, opts) {
    opts = opts || {};
    if (!weeks.length) return { weeks: [], offset: 0, indices: [] };
    const includeIncomplete = opts.includeIncompleteWeeks;
    const eligible = eligibleWeekIndices(weeks, includeIncomplete);
    const z = Number(zoomWeeks);
    if (!z || z <= 0 || z >= weeks.length) {
      if (includeIncomplete === false) {
        return { weeks: eligible.map(function (i) { return weeks[i]; }), offset: eligible[0] || 0, indices: eligible.slice() };
      }
      return { weeks: weeks.slice(), offset: 0, indices: weeks.map(function (_, i) { return i; }) };
    }
    const picked = eligible.slice(-z);
    if (!picked.length) return { weeks: [], offset: 0, indices: [] };
    return { weeks: picked.map(function (i) { return weeks[i]; }), offset: picked[0], indices: picked };
  }

  function previousWindow(allWeeks, zoomWeeks, current, opts) {
    const idxs = (current && current.indices) || [];
    const z = (current && current.weeks && current.weeks.length) || 0;
    if (!z) return { weeks: [], offset: 0, indices: [] };
    if (idxs.length) {
      const eligible = eligibleWeekIndices(allWeeks, opts && opts.includeIncompleteWeeks);
      const first = idxs[0];
      const before = eligible.filter(function (i) { return i < first; });
      const picked = before.slice(-z);
      return { weeks: picked.map(function (i) { return allWeeks[i]; }), offset: picked[0] || 0, indices: picked };
    }
    const start = current.offset || 0;
    if (start <= 0) return { weeks: [], offset: 0, indices: [] };
    const prevStart = Math.max(0, start - z);
    return { weeks: allWeeks.slice(prevStart, start), offset: prevStart, indices: [] };
  }

  function sumField(weeks, field) {
    return (weeks || []).reduce(function (s, w) { return s + (Number(w[field]) || 0); }, 0);
  }

  function detectPRs(sets) {
    const best = {};
    const sessionVol = {};
    const events = [];
    sets.forEach(function (s) {
      if (!best[s.name]) best[s.name] = { load: 0, repsAtLoad: {}, e1rm: 0, volume: 0 };
      const b = best[s.name];
      if (s.loadRaw > b.load) {
        events.push({ type: 'weight', name: s.name, value: s.loadRaw, week: s.week, kind: 'derived' });
        b.load = s.loadRaw;
      }
      const key = String(s.loadRaw);
      if (!b.repsAtLoad[key] || s.reps > b.repsAtLoad[key]) {
        if (b.repsAtLoad[key]) {
          events.push({ type: 'reps', name: s.name, value: s.reps, load: s.loadRaw, week: s.week, kind: 'derived' });
        }
        b.repsAtLoad[key] = s.reps;
      }
      if (s.e1rm != null && s.e1rm > b.e1rm) {
        if (b.e1rm > 0) events.push({ type: 'e1rm', name: s.name, value: s.e1rm, prev: b.e1rm, week: s.week, kind: 'estimated' });
        b.e1rm = s.e1rm;
      }
      const sk = s.name + '|' + s.week + '_' + s.day;
      sessionVol[sk] = (sessionVol[sk] || 0) + s.volume;
    });
    Object.keys(sessionVol).forEach(function (sk) {
      const name = sk.split('|')[0];
      const week = Number(String(sk.split('|')[1] || '').split('_')[0]);
      if (!best[name]) best[name] = { load: 0, repsAtLoad: {}, e1rm: 0, volume: 0 };
      if (sessionVol[sk] > (best[name].volume || 0)) {
        if (best[name].volume > 0) {
          events.push({ type: 'volume', name: name, value: Math.round(sessionVol[sk]), week: week, kind: 'derived' });
        }
        best[name].volume = sessionVol[sk];
      }
    });
    return events.slice(-16);
  }

  function comparePeriods(curWeeks, prevWeeks) {
    const cur = {
      volume: sumField(curWeeks, 'volume'),
      sets: sumField(curWeeks, 'sets'),
      reps: sumField(curWeeks, 'reps'),
      e1rm: Math.max.apply(null, [0].concat(curWeeks.map(function (w) { return w.e1rm || 0; }))),
      intensity: mean(curWeeks.map(function (w) { return w.avgIntensity; })),
      frequency: sumField(curWeeks, 'frequency')
    };
    const prev = {
      volume: sumField(prevWeeks, 'volume'),
      sets: sumField(prevWeeks, 'sets'),
      reps: sumField(prevWeeks, 'reps'),
      e1rm: Math.max.apply(null, [0].concat(prevWeeks.map(function (w) { return w.e1rm || 0; }))),
      intensity: mean(prevWeeks.map(function (w) { return w.avgIntensity; })),
      frequency: sumField(prevWeeks, 'frequency')
    };
    return {
      volume: pctDelta(cur.volume, prev.volume),
      sets: pctDelta(cur.sets, prev.sets),
      reps: pctDelta(cur.reps, prev.reps),
      e1rm: pctDelta(cur.e1rm, prev.e1rm),
      intensity: (cur.intensity != null && prev.intensity != null) ? round1(cur.intensity - prev.intensity) : null,
      frequency: (prev.frequency > 0) ? round1(cur.frequency - prev.frequency) : null,
      current: cur,
      previous: prev
    };
  }

  function landmarksFor(store, muscle, weeklySets) {
    const cfg = (store && store.prefs && store.prefs.volumeLandmarks && store.prefs.volumeLandmarks[muscle]) || DEFAULT_LANDMARKS;
    const lm = {
      MV: Number(cfg.MV) || DEFAULT_LANDMARKS.MV,
      MEV: Number(cfg.MEV) || DEFAULT_LANDMARKS.MEV,
      MAV_LOW: Number(cfg.MAV_LOW) || DEFAULT_LANDMARKS.MAV_LOW,
      MAV_HIGH: Number(cfg.MAV_HIGH) || DEFAULT_LANDMARKS.MAV_HIGH,
      MRV: Number(cfg.MRV) || DEFAULT_LANDMARKS.MRV,
      kind: 'estimated_configurable'
    };
    if (weeklySets == null) return Object.assign({ currentSets: null, status: null }, lm);
    let status = null;
    if (weeklySets < lm.MV) status = 'below_estimated_MV';
    else if (weeklySets < lm.MEV) status = 'near_estimated_MV';
    else if (weeklySets <= lm.MAV_HIGH) status = 'within_estimated_MAV';
    else if (weeklySets < lm.MRV) status = 'above_estimated_MAV';
    else status = 'at_or_above_estimated_MRV';
    const filledHint = weeklySets != null ? 'MEDIUM' : 'LOW';
    return Object.assign({
      currentSets: weeklySets,
      status: status,
      evidenceLevel: 'MODEL_BASED',
      formulaVersion: 'landmarks-v1',
      confidence: filledHint,
      note: 'Stima individuale / configurabile. Non rappresenta una soglia fisiologica universale.'
    }, lm);
  }

  function fatigueFromWeeks(weeks) {
    const nonempty = (weeks || []).filter(function (w) { return !w.empty; });
    if (!nonempty.length) return { acute: null, chronic: null, stress: null, kind: 'estimated', note: 'Dati insufficienti sul volume settimanale' };
    const acute = nonempty[nonempty.length - 1].volume;
    const hist = nonempty.slice(Math.max(0, nonempty.length - 4));
    if (hist.length < 2) return { acute: acute, chronic: null, stress: null, kind: 'estimated', note: 'Il carico cronico serve almeno 2 settimane con volume' };
    const chronic = Math.round(hist.reduce(function (s, w) { return s + w.volume; }, 0) / hist.length);
    const stress = chronic > 0 ? round1(acute / chronic) : null;
    return { acute: acute, chronic: chronic, stress: stress, kind: 'estimated', note: 'Acuto = ultima settimana; cronico = media fino a 4 settimane; stress = acuto/cronico. Modello, non diagnosi.' };
  }

  function recoveryFromStore(store, weeks) {
    const observed = {
      bodyweight: null,
      lastDurationSec: null,
      lastRpe: null
    };
    const bwKeys = Object.keys((store && store.bw) || {});
    if (bwKeys.length) {
      const last = bwKeys.map(Number).filter(function (n) { return n > 0; }).sort(function (a, b) { return a - b; }).pop();
      observed.bodyweight = num(store.bw[last]);
    }
    const logs = (store && store.logs) || [];
    if (logs.length) {
      const last = logs[logs.length - 1];
      observed.lastDurationSec = last.durationSec || null;
    }
    const lastWeek = (weeks || []).filter(function (w) { return w.avgIntensity != null; }).pop();
    if (lastWeek) observed.lastRpe = lastWeek.avgRpe;
    const fat = fatigueFromWeeks(weeks);
    let estimate = null;
    if (fat.stress != null) {
      if (fat.stress < 0.8) estimate = 'low_recent_load';
      else if (fat.stress <= 1.3) estimate = 'balanced_load';
      else estimate = 'high_recent_load';
    }
    let signal = 'INSUFFICIENT_DATA';
    if (estimate === 'low_recent_load') signal = 'GOOD';
    else if (estimate === 'balanced_load') signal = 'MODERATE';
    else if (estimate === 'high_recent_load') signal = 'LOW';
    return {
      observed: observed,
      derived: { acuteChronic: fat.stress, lastDurationSec: observed.lastDurationSec },
      estimate: estimate,
      signal: signal,
      kind: 'estimated',
      note: 'Segnale di recupero da carico acuto/cronico. Non è un dato fisiologico misurato.'
    };
  }

  function insightsFrom(analytics) {
    const out = [];
    const c = analytics.comparison;
    if (c && c.volume != null) {
      out.push('Il volume del periodo ' + (c.volume >= 0 ? 'è aumentato' : 'è diminuito') + ' del ' + Math.abs(c.volume) + '% rispetto al periodo precedente.');
    }
    if (c && c.e1rm != null && c.volume != null) {
      if (c.e1rm > 0 && Math.abs(c.volume) < 8) {
        out.push('e1RM ' + (c.e1rm >= 0 ? '+' : '') + c.e1rm + '% con volume quasi stabile. Stima, non certezza.');
      } else if (c.e1rm <= 0 && c.volume > 15) {
        out.push('Volume aumentato del ' + c.volume + '% mentre e1RM non cresce. Dato descrittivo, non una diagnosi.');
      }
    }
    if (c && c.intensity != null && c.intensity > 0.4 && c.e1rm != null && c.e1rm <= 0) {
      out.push('Intensità media cresciuta di ' + c.intensity + ' punti con e1RM piatto o in calo.');
    }
    const last = analytics.window.weeks.filter(function (w) { return !w.empty; }).pop();
    const prev = analytics.window.weeks.filter(function (w) { return !w.empty; });
    if (last && prev.length >= 2) {
      const p = prev[prev.length - 2];
      if (p.frequency && last.frequency && last.frequency !== p.frequency) {
        out.push('Frequenza da ' + p.frequency + ' a ' + last.frequency + ' sedute nella settimana inquadrata.');
      }
    }
    if (analytics.landmarks && analytics.landmarks.status) {
      const map = {
        below_estimated_MV: 'Volume settimanale sotto la MV stimata (configurabile).',
        near_estimated_MV: 'Volume settimanale vicino alla MV stimata.',
        within_estimated_MAV: 'Volume settimanale nella fascia MAV stimata.',
        above_estimated_MAV: 'Volume settimanale sopra la MAV stimata.',
        at_or_above_estimated_MRV: 'Volume settimanale a/oltre la MRV stimata.'
      };
      if (map[analytics.landmarks.status]) out.push(map[analytics.landmarks.status]);
    }
    if (!out.length) out.push('Servono almeno due settimane con serie registrate per confrontare i periodi.');
    return out.slice(0, 6);
  }

  function groupBy(sets, keyFn) {
    const map = {};
    sets.forEach(function (s) {
      const k = keyFn(s);
      if (!map[k]) map[k] = { name: k, volume: 0, sets: 0, reps: 0, intensity: [], e1rms: [], weeks: {} };
      const g = map[k];
      g.volume += s.volume;
      g.sets += 1;
      g.reps += s.reps;
      if (s.intensity10 != null) g.intensity.push(s.intensity10);
      if (s.e1rm != null) g.e1rms.push(s.e1rm);
      g.weeks[s.week] = true;
    });
    return Object.keys(map).map(function (k) {
      const g = map[k];
      const avgInt = mean(g.intensity);
      return {
        name: g.name,
        volume: Math.round(g.volume),
        sets: g.sets,
        reps: g.reps,
        avgIntensity: avgInt != null ? round1(avgInt) : null,
        e1rm: g.e1rms.length ? Math.max.apply(null, g.e1rms) : null,
        frequency: Object.keys(g.weeks).length
      };
    }).sort(function (a, b) { return b.volume - a.volume; });
  }

  const CONTRIB_WEIGHT = { primary: 1, secondary: 0.5, indirect: 0.25 };
  const MUSCLE_HINTS = [
    { re: /panca|bench|chest|croci|fly|aperture/i, primary: ['PETTO'], secondary: ['TRICIPITI', 'SPALLE'] },
    { re: /squat|hack|leg press|affondi|lunge|leg extension|press 45/i, primary: ['QUADRICIPITI'], secondary: ['GLUTEI'], indirect: ['FEMORALI'] },
    { re: /stacco|deadlift|rdl|good morning|leg curl|femoral/i, primary: ['FEMORALI'], secondary: ['GLUTEI'], indirect: ['SCHIENA'] },
    { re: /calf|polpac|raise/i, primary: ['POLPACCI'] },
    { re: /row|remat|lat |dorso|trazione|pull.?down|pulley|low row/i, primary: ['SCHIENA'], secondary: ['BICIPITI'] },
    { re: /military|lento|shoulder press|alzate later|face pull|deltoid/i, primary: ['SPALLE'], secondary: ['TRICIPITI'] },
    { re: /curl|bicep/i, primary: ['BICIPITI'] },
    { re: /french|skull|pushdown|triceps|dip|estensioni/i, primary: ['TRICIPITI'] },
    { re: /hip thrust|glute|kickback/i, primary: ['GLUTEI'] },
    { re: /crunch|plank|ab wheel|addome|sit.?up/i, primary: ['ADDOME'] }
  ];
  const FINE_TO_MACRO = {
    PETTO: 'PETTO', SCHIENA: 'SCHIENA', DORSALI: 'SCHIENA', SPALLE: 'SPALLE',
    BICIPITI: 'BRACCIA', TRICIPITI: 'BRACCIA', QUADRICIPITI: 'GAMBE', FEMORALI: 'GAMBE',
    GLUTEI: 'GLUTEI', POLPACCI: 'GAMBE', ADDOME: 'ADDOME'
  };

  function normalizeMuscleId(raw) {
    const g = String(raw || '').toUpperCase().replace(/&/g, '_').replace(/\s+/g, '_');
    if (['SCHIENA', 'DORSO', 'DORSALI', 'BACK', 'LAT', 'LATS'].includes(g)) return g === 'DORSALI' ? 'DORSALI' : 'SCHIENA';
    if (['SPALLE', 'DELTOIDI', 'SHOULDERS'].includes(g)) return 'SPALLE';
    if (['BICIPITI', 'BICEPS'].includes(g)) return 'BICIPITI';
    if (['TRICIPITI', 'TRICEPS'].includes(g)) return 'TRICIPITI';
    if (['PETTO', 'CHEST', 'PECS'].includes(g)) return 'PETTO';
    if (['ADDOME', 'CORE', 'ABS'].includes(g)) return 'ADDOME';
    if (['GLUTEI', 'GLUTES'].includes(g)) return 'GLUTEI';
    if (['QUADRICIPITI', 'QUADS', 'QUAD'].includes(g)) return 'QUADRICIPITI';
    if (['FEMORALI', 'HAMSTRINGS', 'HAM'].includes(g)) return 'FEMORALI';
    if (['POLPACCI', 'CALVES', 'CALF'].includes(g)) return 'POLPACCI';
    if (['GAMBE', 'LEGS'].includes(g)) return 'QUADRICIPITI';
    return g;
  }

  function muscleContributionForExercise(name, meta) {
    const primary = [];
    const secondary = [];
    const indirect = [];
    const seen = {};
    function add(arr, id) {
      const n = normalizeMuscleId(id);
      if (!n || seen[n]) return;
      seen[n] = true;
      arr.push(n);
    }
    const explicit = (meta && (meta.muscle_groups || meta.muscleGroups)) || [];
    if (explicit.length) {
      add(primary, explicit[0]);
      explicit.slice(1).forEach(function (g) { add(secondary, g); });
    }
    const text = String(name || '') + ' ' + String((meta && meta.movement) || '');
    MUSCLE_HINTS.forEach(function (h) {
      if (!h.re.test(text)) return;
      (h.primary || []).forEach(function (g) { add(primary, g); });
      (h.secondary || []).forEach(function (g) { add(secondary, g); });
      (h.indirect || []).forEach(function (g) { add(indirect, g); });
    });
    return {
      primary: primary,
      secondary: secondary,
      indirect: indirect,
      kind: 'heuristic',
      evidenceLevel: 'HEURISTIC',
      formulaVersion: 'contrib-v1'
    };
  }

  function roleForMuscle(contrib, muscleId) {
    const id = normalizeMuscleId(muscleId);
    const macro = FINE_TO_MACRO[id] || id;
    function hit(arr) {
      return (arr || []).some(function (g) {
        return g === id || g === macro || (FINE_TO_MACRO[g] || g) === id || (FINE_TO_MACRO[g] || g) === macro;
      });
    }
    if (hit(contrib.primary)) return 'primary';
    if (hit(contrib.secondary)) return 'secondary';
    if (hit(contrib.indirect)) return 'indirect';
    return null;
  }

  function proximityFactor(set) {
    if (set.rir != null) {
      if (set.rir <= 2) return 1;
      if (set.rir <= 4) return 0.8;
      return 0.6;
    }
    return 0.7;
  }

  function emptyMuscleRollup(id) {
    return {
      id: id,
      nominalSets: 0,
      directSets: 0,
      indirectSets: 0,
      effectiveWeightedSets: 0,
      effectiveTrainingDose: 0,
      fatigueCostPts: 0,
      volume: 0,
      rpe: [],
      intensity: [],
      weeks: {},
      exercises: {}
    };
  }

  function buildByMuscle(sets) {
    const map = {};
    (sets || []).forEach(function (s) {
      const c = s.contribution || muscleContributionForExercise(s.name, { muscle_groups: s.muscleGroups, movement: s.movement });
      const roles = {};
      (c.primary || []).forEach(function (g) { roles[g] = 'primary'; });
      (c.secondary || []).forEach(function (g) { if (!roles[g]) roles[g] = 'secondary'; });
      (c.indirect || []).forEach(function (g) { if (!roles[g]) roles[g] = 'indirect'; });
      Object.keys(roles).forEach(function (gid) {
        if (!map[gid]) map[gid] = emptyMuscleRollup(gid);
        const g = map[gid];
        const w = CONTRIB_WEIGHT[roles[gid]] || 0.25;
        g.nominalSets += 1;
        if (roles[gid] === 'primary') g.directSets += 1;
        else g.indirectSets += 1;
        g.effectiveWeightedSets += w;
        g.effectiveTrainingDose += w * proximityFactor(s);
        g.fatigueCostPts += (s.volume / 1000) * w * ((s.intensity10 != null ? s.intensity10 : 7) / 10);
        g.volume += s.volume;
        if (s.rpe != null) g.rpe.push(s.rpe);
        if (s.intensity10 != null) g.intensity.push(s.intensity10);
        g.weeks[s.week] = true;
        if (!g.exercises[s.name]) g.exercises[s.name] = { name: s.name, volume: 0, sets: 0, role: roles[gid] };
        g.exercises[s.name].volume += s.volume;
        g.exercises[s.name].sets += 1;
      });
    });
    return Object.keys(map).map(function (id) {
      const g = map[id];
      const cost = g.fatigueCostPts;
      let fatigueCost = 'LOW';
      if (cost >= 18) fatigueCost = 'HIGH';
      else if (cost >= 10) fatigueCost = 'ELEVATED';
      else if (cost >= 4) fatigueCost = 'MODERATE';
      return {
        id: id,
        macro: FINE_TO_MACRO[id] || id,
        nominalSets: g.nominalSets,
        directSets: g.directSets,
        indirectSets: g.indirectSets,
        effectiveWeightedSets: round1(g.effectiveWeightedSets),
        effectiveTrainingDose: round1(g.effectiveTrainingDose),
        fatigueCost: fatigueCost,
        fatigueCostPts: round1(g.fatigueCostPts),
        volume: Math.round(g.volume),
        avgRpe: mean(g.rpe) != null ? round1(mean(g.rpe)) : null,
        avgIntensity: mean(g.intensity) != null ? round1(mean(g.intensity)) : null,
        frequency: Object.keys(g.weeks).length,
        exercises: Object.keys(g.exercises).map(function (k) {
          const e = g.exercises[k];
          return { name: e.name, volume: Math.round(e.volume), sets: e.sets, role: e.role };
        }).sort(function (a, b) { return b.volume - a.volume; }),
        kind: 'heuristic',
        evidenceLevel: 'HEURISTIC',
        formulaVersion: 'contrib-v1'
      };
    }).sort(function (a, b) { return b.nominalSets - a.nominalSets; });
  }

  function listProgramExercises(data, store) {
    const names = {};
    ((data && data.weeks) || []).forEach(function (w, wi) {
      ((w && (w.sessions || w.days)) || []).forEach(function (sess, di) {
        ((sess && (sess.exercises || sess.rows)) || []).forEach(function (ex, ei) {
          const eK = 'w' + (wi + 1) + '_d' + di + '_e' + ei;
          const name = (store && store.subs && store.subs[eK]) || (ex && (ex.name || ex.exercise));
          if (name) names[String(name)] = true;
        });
      });
    });
    return Object.keys(names).sort();
  }

  function performanceResponseFromComparison(comparison, filledWeeks) {
    const e1 = comparison && comparison.e1rm;
    const vol = comparison && comparison.volume;
    if (filledWeeks < 2 || (e1 == null && vol == null)) {
      return { signal: 'INSUFFICIENT_DATA', kind: 'estimated', confidence: 'LOW' };
    }
    if (e1 != null && e1 > 2) return { signal: 'POSITIVE', kind: 'estimated', confidence: filledWeeks >= 4 ? 'MEDIUM' : 'LOW' };
    if (e1 != null && e1 < -2) return { signal: 'NEGATIVE', kind: 'estimated', confidence: filledWeeks >= 4 ? 'MEDIUM' : 'LOW' };
    if (e1 != null && Math.abs(e1) <= 2) return { signal: 'NEUTRAL', kind: 'estimated', confidence: 'MEDIUM' };
    return { signal: 'NEUTRAL', kind: 'estimated', confidence: 'LOW' };
  }

  function volumeResponseFrom(comparison, recoverySignal) {
    const vol = comparison && comparison.volume;
    const e1 = comparison && comparison.e1rm;
    const intD = comparison && comparison.intensity;
    if (vol == null || e1 == null) return { signal: 'INSUFFICIENT_DATA', kind: 'estimated' };
    if (vol > 5 && e1 > 1 && (intD == null || intD <= 0.6) && recoverySignal !== 'LOW') return { signal: 'POSITIVE', kind: 'estimated' };
    if (vol > 10 && e1 <= 0) return { signal: 'NEGATIVE', kind: 'estimated' };
    return { signal: 'NEUTRAL', kind: 'estimated' };
  }

  function fatigueSignalFrom(weeks, intra) {
    const components = {
      performanceDrop: intra && intra.repLoss != null ? intra.repLoss : null,
      rpeDrift: intra && intra.rpeDrift != null ? intra.rpeDrift : null,
      recentAccumulation: null
    };
    const fat = fatigueFromWeeks(weeks);
    components.recentAccumulation = fat.stress;
    let signal = 'LOW';
    if (fat.stress != null && fat.stress > 1.4) signal = 'HIGH';
    else if (fat.stress != null && fat.stress > 1.15) signal = 'ELEVATED';
    else if (fat.stress != null && fat.stress > 0.9) signal = 'MODERATE';
    if (intra && intra.signal === 'high') signal = 'HIGH';
    else if (intra && intra.signal === 'moderate' && signal === 'LOW') signal = 'ELEVATED';
    const reasons = [];
    if (components.performanceDrop != null && components.performanceDrop < 0) reasons.push('perdita di ripetizioni ' + components.performanceDrop + '%');
    if (components.rpeDrift != null && components.rpeDrift > 0) reasons.push('RPE +' + components.rpeDrift);
    if (components.recentAccumulation != null) reasons.push('carico acuto/cronico ' + components.recentAccumulation);
    return {
      signal: signal,
      components: components,
      reason: reasons.length ? reasons.join(' · ') : 'Dati insufficienti per un segnale di fatica',
      kind: 'heuristic',
      evidenceLevel: 'HEURISTIC',
      formulaVersion: 'intel-v1'
    };
  }

  function build(store, data, opts) {
    opts = opts || {};
    const axis = opts.axis === 'calendar' ? 'calendar' : 'training';
    const zoomWeeks = opts.zoomWeeks == null ? 8 : Number(opts.zoomWeeks);
    const muscle = opts.muscle || 'TOTAL';
    const exercise = opts.exercise || '';
    const includeIncomplete = opts.includeIncompleteWeeks != null
      ? !!opts.includeIncompleteWeeks
      : !!(store && store.prefs && store.prefs.includeIncompleteWeeks);
    const currentWeekOpt = Number(opts.currentWeek || (store && store.trainingWeek) || 0) || 0;
    const zoomOpts = { includeIncompleteWeeks: includeIncomplete };
    const fp = fingerprint(store, {
      axis: axis, zoomWeeks: zoomWeeks, muscle: muscle, exercise: exercise,
      includeIncompleteWeeks: includeIncomplete, currentWeek: currentWeekOpt
    });
    if (_cache.key === fp && _cache.value && (Date.now() - _cache.at) < 2500) return _cache.value;

    const fromData = (data && Array.isArray(data.weeks)) ? data.weeks.length : 0;
    const fromPref = Number(store && store.prefs && store.prefs.duration) || 0;
    const fromLogs = ((store && store.logs) || []).reduce(function (m, row) { return Math.max(m, Number(row.week) || 0); }, 0);
    const fromSets = Object.keys((store && store.data) || {}).reduce(function (m, k) {
      const mm = k.match(/^w(\d+)_/);
      return mm ? Math.max(m, Number(mm[1]) || 0) : m;
    }, 0);
    const weekCount = Math.max(1, fromData, fromPref, fromLogs, fromSets, currentWeekOpt);

    const sets = normalizeSets(store, data, opts);
    let allWeeks = axis === 'calendar' ? calendarBuckets(sets) : trainingBuckets(sets, weekCount);
    allWeeks = markWeekCompletion(allWeeks, store, data, axis);
    const windowed = applyZoom(allWeeks, zoomWeeks, zoomOpts);
    const prev = previousWindow(allWeeks, zoomWeeks, windowed, zoomOpts);
    const comparison = comparePeriods(windowed.weeks, prev.weeks);
    const last = windowed.weeks.filter(function (w) { return !w.empty; }).pop() || windowed.weeks[windowed.weeks.length - 1] || emptyWeek('—', 'none');
    const prevWeek = (function () {
      const filled = windowed.weeks.filter(function (w) { return !w.empty; });
      return filled.length >= 2 ? filled[filled.length - 2] : null;
    })();
    const skippedIncomplete = allWeeks.filter(function (w) { return w.inProgress; });
    const windowSets = sets.filter(function (s) {
      if (axis === 'calendar') {
        return windowed.weeks.some(function (w) { return w.key === s.calendarKey; });
      }
      return windowed.weeks.some(function (w) { return w.weekNum === s.week; });
    });

    const volumes = windowed.weeks.map(function (w) { return w.empty ? 0 : w.volume; });
    const analytics = {
      axis: axis,
      zoomWeeks: zoomWeeks,
      weekCount: weekCount,
      window: windowed,
      previous: prev,
      kpis: {
        volumeTotal: sumField(windowed.weeks, 'volume'),
        volumeWeek: last.empty ? 0 : last.volume,
        weekLabel: last.label,
        volumeVarWeek: prevWeek ? pctDelta(last.volume, prevWeek.volume) : null,
        volumeVarNote: (function () {
          if (!prevWeek || !last) return 'Servono due settimane confrontabili';
          const a = last.label.replace(' — in corso', '');
          const b = prevWeek.label.replace(' — in corso', '');
          if (!includeIncomplete && skippedIncomplete.length) {
            return a + ' vs ' + b + ' (' + skippedIncomplete.map(function (w) { return w.label.replace(' — in corso', ''); }).join(', ') + ' esclusa, in corso)';
          }
          if (last.inProgress) return a + ' vs ' + b + ' (' + a + ' parziale)';
          return a + ' vs ' + b;
        })(),
        periodVar: comparison.volume,
        avgIntensity: last.avgIntensity,
        avgRir: last.avgRir,
        avgRpe: last.avgRpe,
        sets: sumField(windowed.weeks, 'sets'),
        hardSets: sumField(windowed.weeks, 'hardSets'),
        reps: sumField(windowed.weeks, 'reps'),
        e1rm: last.e1rm,
        sessions: sumField(windowed.weeks, 'frequency'),
        includeIncompleteWeeks: includeIncomplete
      },
      comparison: comparison,
      table: windowed.weeks,
      charts: {
        volume: volumes,
        effective: windowed.weeks.map(function (w) { return w.empty ? 0 : w.effectivePts; }),
        intensity: windowed.weeks.map(function (w) { return w.avgIntensity; }),
        e1rm: windowed.weeks.map(function (w) { return w.e1rm; }),
        sets: windowed.weeks.map(function (w) { return w.sets; }),
        reps: windowed.weeks.map(function (w) { return w.reps; }),
        load: windowed.weeks.map(function (w) { return w.avgLoad; }),
        frequency: windowed.weeks.map(function (w) { return w.frequency; }),
        sessions: windowed.weeks.map(function (w) { return w.sessionCount; }),
        bw: windowed.weeks.map(function (w) {
          const m = String(w.key || '').match(/^tw-(\d+)$/);
          if (!m || !store || !store.bw) return null;
          const v = num(store.bw[m[1]] || store.bw[Number(m[1])]);
          return v != null && v > 0 ? v : null;
        }),
        labels: windowed.weeks.map(function (w) { return w.label; }),
        trainingLoad: volumes,
        ma4: movingAverage(volumes, 4),
        ma8: movingAverage(volumes, 8),
        ma12: movingAverage(volumes, 12),
        candles: windowed.weeks.map(function (w, i) {
          const prevV = i > 0 ? windowed.weeks[i - 1].volume : w.volume;
          return {
            open: prevV,
            close: w.volume,
            high: Math.max(prevV, w.volume),
            low: Math.min(prevV, w.volume),
            up: w.volume >= prevV,
            empty: w.empty
          };
        })
      },
      byExercise: groupBy(windowSets, function (s) { return s.name; }),
      byMuscle: buildByMuscle(windowSets),
      muscleContribution: windowSets.slice(0, 40).map(function (s) {
        return { name: s.name, contribution: s.contribution || muscleContributionForExercise(s.name, {}) };
      }).filter(function (row, i, arr) {
        return arr.findIndex(function (x) { return x.name === row.name; }) === i;
      }),
      prs: detectPRs(sets),
      landmarks: landmarksFor(store, muscle === 'TOTAL' ? 'GENERALE' : muscle, last.sets || null),
      fatigue: fatigueFromWeeks(windowed.weeks),
      recovery: recoveryFromStore(store, windowed.weeks),
      quality: {
        setsWithEffort: windowSets.filter(function (s) { return s.intensity10 != null; }).length,
        setsTotal: windowSets.length,
        calendarOrphans: axis === 'calendar' ? sets.filter(function (s) { return !s.calendarKey; }).length : 0
      },
      effectiveVolumeNote: 'Volume efficace (pts) = Σ carico × (reps + RIR). Se la scala è RPE, RIR = 10 − RPE. È una stima del lavoro se la serie fosse andata a cedimento, non il tonnellaggio.',
      exercises: Array.from(new Set((listProgramExercises(data, store).concat(sets.map(function (s) { return s.name; }))))).filter(Boolean).sort()
    };
    analytics.includeIncompleteWeeks = includeIncomplete;
    analytics.programExercises = listProgramExercises(data, store);
    analytics.insights = insightsFrom(analytics);
    analytics.trainingLoad = trainingLoadFromWeeks(windowed.weeks);
    analytics.adaptation = adaptationFromComparison(comparison, windowed.weeks);
    analytics.performanceResponse = performanceResponseFromComparison(comparison, windowed.weeks.filter(function (w) { return !w.empty; }).length);
    analytics.volumeResponse = volumeResponseFrom(comparison, analytics.recovery && analytics.recovery.signal);
    analytics.fatigueSignal = fatigueSignalFrom(windowed.weeks, null);
    analytics.dose = {
      effectiveTrainingDose: (analytics.byMuscle || []).reduce(function (s, m) { return s + (m.effectiveTrainingDose || 0); }, 0),
      fatigueCost: analytics.fatigueSignal.signal,
      kind: 'heuristic',
      evidenceLevel: 'HEURISTIC',
      note: 'Dose e costo sono modelli interni, non misure fisiologiche.'
    };
    const recovSig = (function () {
      const est = analytics.recovery && analytics.recovery.estimate;
      if (!est) return 'INSUFFICIENT_DATA';
      if (est === 'low_recent_load') return 'GOOD';
      if (est === 'balanced_load') return 'MODERATE';
      if (est === 'high_recent_load') return 'LOW';
      return 'INSUFFICIENT_DATA';
    })();
    analytics.recovery.signal = recovSig;
    const filledN = windowed.weeks.filter(function (w) { return !w.empty; }).length;
    const lmConf = filledN >= 6 ? 'HIGH' : (filledN >= 3 ? 'MEDIUM' : 'LOW');
    analytics.landmarks.confidence = lmConf;
    analytics.landmarks.evidence = {
      weeks: filledN,
      note: 'Una sola seduta non aggiorna MEV/MAV/MRV.'
    };
    const perfGain = comparison.e1rm;
    const trainCost = comparison.volume;
    analytics.performanceEfficiency = {
      value: (perfGain != null && trainCost != null && Math.abs(trainCost) >= 1) ? round1(perfGain / Math.abs(trainCost)) : null,
      kind: 'heuristic',
      evidenceLevel: 'HEURISTIC',
      formulaVersion: 'eff-v1',
      note: 'Rapporto interno prestazione/costo di lavoro. Non è una metrica fisiologica ufficiale.'
    };
    analytics.personalResponse = {
      volumeTolerance: filledN >= 4 ? analytics.volumeResponse.signal : null,
      volumeResponse: analytics.volumeResponse && analytics.volumeResponse.signal,
      intensityTolerance: null,
      frequencyResponse: null,
      exposures: filledN,
      kind: 'estimated',
      evidenceLevel: 'ESTIMATED',
      formulaVersion: 'personal-prep-v1',
      note: 'Richiede più esposizioni. Una sola seduta non aggiorna MEV/MAV/MRV.'
    };
    analytics.control = {
      kind: 'prepared',
      formulaVersion: 'control-prep-v1',
      evidenceLevel: 'MODEL_BASED',
      actual: {
        volume: analytics.kpis.volumeTotal,
        sets: analytics.kpis.sets,
        intensity: analytics.kpis.avgIntensity
      },
      derived: {
        e1rm: analytics.kpis.e1rm,
        hardSets: analytics.kpis.hardSets
      },
      dose: analytics.dose,
      stimulus: { effectiveTrainingDose: analytics.dose.effectiveTrainingDose, kind: 'heuristic', evidenceLevel: 'HEURISTIC' },
      performance: analytics.performanceResponse,
      effort: { avgRpe: analytics.kpis.avgRpe, avgRir: analytics.kpis.avgRir },
      fatigue: analytics.fatigueSignal,
      recovery: analytics.recovery,
      adaptation: analytics.adaptation,
      volumeResponse: analytics.volumeResponse,
      landmarks: analytics.landmarks,
      personalResponse: analytics.personalResponse,
      performanceEfficiency: analytics.performanceEfficiency,
      confidence: lmConf,
      note: 'Preparazione della futura Training Control Engine. Non decide da sola la scheda.'
    };
    analytics.charts.prMarks = (analytics.prs || []).map(function (p) {
      const idx = windowed.weeks.findIndex(function (w) {
        return w.weekNum === p.week || w.label.replace(' — in corso', '') === ('W' + p.week);
      });
      return { index: idx, type: p.type, name: p.name, value: p.value, week: p.week };
    }).filter(function (p) { return p.index >= 0; });
    analytics.formulaVersion = FORMULA_VERSION;
    analytics.kind = 'derived';
    _cache = { key: fp, at: Date.now(), value: analytics };
    return analytics;
  }

  const FORMULA_VERSION = 'intel-v1';
  function catalogRow(id, cat, nameIt, whatIt, whyIt, howIt, limitIt, evidenceLevel, formulaVersion, formula, unit, extra) {
    extra = extra || {};
    return Object.assign({
      id: id,
      category: cat,
      nameIt: nameIt,
      shortNameIt: extra.shortNameIt || nameIt,
      technicalName: extra.technicalName || '',
      humanName: nameIt,
      whatIt: whatIt,
      whyIt: whyIt,
      howIt: howIt,
      limitIt: limitIt,
      definition: whatIt,
      formula: formula,
      limitations: limitIt,
      unit: unit || '',
      evidenceLevel: evidenceLevel,
      formulaVersion: formulaVersion,
      confidence: extra.confidence || 'medium'
    }, extra);
  }

  const METRIC_CATALOG = {
    volume: catalogRow('volume', 'volume', 'Volume',
      'È il lavoro alzato: carico per ripetizioni, sommato sulle serie registrate.',
      'Serve a vedere quanto lavoro hai realmente eseguito nel periodo, non se stai migliorando.',
      'Somma carico × ripetizioni di ogni serie valida. In modalità per parte il carico conta due volte come già fai in scheda.',
      'Le serie saltate non entrano. Un volume più alto non è automaticamente un miglioramento.',
      'DERIVED', 'tonnage-v1', 'Σ(load × reps × partMultiplier)', 'kg', { confidence: 'high' }),
    bw: catalogRow('bw', 'body', 'Peso corporeo',
      'Peso corporeo che hai inserito per quella settimana di scheda.',
      'Serve come contesto, non come prestazione.',
      'Usa il valore BW registrato sulla settimana. Se manca, la cella resta vuota.',
      'Non viene interpolato. Non è una stima della composizione corporea.',
      'MEASURED', 'bw-v1', 'store.bw[week]', 'kg', { confidence: 'high' }),
    sets: catalogRow('sets', 'volume', 'Serie',
      'Numero di serie con carico e ripetizioni validi.',
      'Indica la quantità nominale di lavoro, prima di qualsiasi pesatura muscolare.',
      'Conta ogni riga con carico > 0 e ripetizioni > 0. Gli esercizi saltati sono esclusi.',
      '1 serie non vale 1 per ogni muscolo: guarda anche diretto/indiretto.',
      'DERIVED', 'sets-v1', 'count(valid sets)', 'serie'),
    reps: catalogRow('reps', 'volume', 'Ripetizioni',
      'Somma delle ripetizioni registrate nelle serie valide.',
      'Utile insieme al carico per capire se il lavoro è cambiato per volume o per schema.',
      'Somma i reps di ogni serie valida.',
      'Non distingue riscaldamento e serie di lavoro se non li hai marcati.',
      'DERIVED', 'reps-v1', 'Σ reps', 'rip'),
    load: catalogRow('load', 'intensity', 'Carico medio',
      'Media dei carichi delle serie valide nel periodo.',
      'Mostra se stai alzando di più, indipendentemente dalle ripetizioni.',
      'Media dei kg registrati (carico grezzo della serie).',
      'Non è intensità relativa. Serie leggere e pesanti pesano uguale nella media.',
      'DERIVED', 'load-v1', 'mean(load)', 'kg'),
    frequency: catalogRow('frequency', 'workload', 'Frequenza',
      'Quante sedute distinte hai registrato nella settimana.',
      'La frequenza va letta insieme al volume: da sola non dice se la dose è alta.',
      'Conta le coppie settimana+giorno con almeno una serie valida.',
      'Una seduta parziale conta come seduta se ha serie registrate.',
      'DERIVED', 'freq-v1', 'count(unique week+day)', 'sedute'),
    sessions: catalogRow('sessions', 'workload', 'Sedute',
      'Numero di allenamenti nel periodo zoomato.',
      'Serve a capire se il volume arriva da più uscite o da uscite più dense.',
      'Somma la frequenza delle settimane visibili.',
      'Non è una misura di qualità della seduta.',
      'DERIVED', 'sessions-v1', 'Σ frequency', 'sedute'),
    e1rm: catalogRow('e1rm', 'strength', 'e1RM stimato',
      'È una stima del massimale a una ripetizione, non un 1RM testato. Parte dal carico e dalle ripetizioni della serie e viene usata soprattutto per confrontare lo stesso esercizio nel tempo.',
      'Permette di confrontare serie con ripetizioni diverse sullo stesso movimento.',
      'Formula di Epley: carico × (1 + rip/30). I singoli valgono il carico. Sopra 12 rip la stima non viene calcolata.',
      'Meno affidabile sopra le 12 ripetizioni. Vale solo per lo stesso esercizio. Non è un 1RM testato.',
      'DERIVED', 'epley-v1', 'Epley: load × (1 + reps/30); singles = load', 'kg'),
    intensity: catalogRow('intensity', 'intensity', 'Intensità',
      'Sforzo percepito su scala 0–10, ricavato da RIR o RPE se li hai scritti.',
      'Dice quanto eri vicino al cedimento, non quanto era pesante il bilanciere in assoluto.',
      'Se la scala è RPE si usa il valore; se è RIR si usa 10 − RIR.',
      'Senza RIR/RPE il dato resta vuoto. Le scale sono opposte.',
      'DERIVED', 'rir-rpe-v1', 'RIR → 10−RIR; RPE → RPE', '/10'),
    intensity10: catalogRow('intensity10', 'intensity', 'Intensità /10',
      'Stessa intensità 0–10 usata internamente dal motore.',
      'Allinea RIR e RPE su una scala unica per i confronti.',
      'RIR → 10−RIR; RPE → RPE.',
      'Senza RIR/RPE il dato resta vuoto. Le scale sono opposte.',
      'DERIVED', 'rir-rpe-v1', 'RIR → 10−RIR; RPE → RPE', '/10'),
    landmarks: catalogRow('landmarks', 'landmarks', 'Landmark di volume',
      'Zone stimate di volume settimanale (MV, MEV, MAV, MRV). Sono soglie individuali e configurabili, non fisiologia universale.',
      'Danno un riferimento, non un limite automatico per alzare o togliere serie.',
      'Usa i valori in preferenze o i default. Lo stato dipende dalle serie della settimana inquadrata.',
      'Non sono soglie fisiologiche universali. Superare la MRV stimata non impone da sola una riduzione.',
      'MODEL_BASED', 'landmarks-v1', 'prefs.volumeLandmarks o default', 'serie', { confidence: 'low' }),
    recovery: catalogRow('recovery', 'recovery', 'Recupero',
      'Segnale stimato di recupero dal carico recente, non una percentuale fisiologica.',
      'Aiuta a leggere se il carico delle ultime settimane è basso, equilibrato o alto.',
      'Confronta il volume dell’ultima settimana con la media fino a 4 settimane.',
      'Non è un punteggio di readiness misurato. Mai mostrato come percentuale inventata.',
      'HEURISTIC', 'acwr-adapt-v1', 'acute/chronic labels', 'segnale', { confidence: 'low' }),
    atlCtl: catalogRow('atlCtl', 'workload', 'ATL / CTL / TSB',
      'Modello adattato di carico acuto, cronico e bilancio. Deriva da modelli di endurance e qui serve solo come tendenza.',
      'Mostra se il carico recente è sopra o sotto la media recente.',
      'ATL = volume ultima settimana; CTL = media fino a 4; TSB = CTL − ATL.',
      'Modello adattato e dipendente dal contesto; non è una misura fisiologica diretta né una diagnosi.',
      'MODEL_BASED', 'atl-adapt-v1', 'ATL=last week; CTL=mean last 4; TSB=CTL−ATL', 'kg', { confidence: 'low' }),
    trainingLoad: catalogRow('trainingLoad', 'workload', 'Training load',
      'Famiglia di carichi: seduta, settimana, acuto e cronico, ricavati dal volume.',
      'Serve a vedere l’accumulo, non a dichiarare un overtraining.',
      'Usa il tonnellaggio settimanale come proxy di carico.',
      'Non è validato come modello unico per la forza. Solo analisi di tendenza.',
      'MODEL_BASED', 'atl-adapt-v1', 'weekly tonnage proxy', 'kg', { confidence: 'low' }),
    hardSets: catalogRow('hardSets', 'volume', 'Serie dure',
      'Classificazione euristica delle serie vicine al cedimento (RIR ≤ 2 o RPE ≥ 8).',
      'Aiuta a distinguere volume nominale e volume “duro”, senza sostituire il giudizio.',
      'Se manca RIR/RPE la serie non viene etichettata.',
      'Non è una misura fisiologica. Non decide da sola il volume della prossima seduta.',
      'HEURISTIC', 'hardset-v1', 'RIR≤2 o RPE≥8', 'serie', { confidence: 'low' }),
    effectiveVolume: catalogRow('effectiveVolume', 'volume', 'Volume efficace',
      'Modello euristico: carico × (ripetizioni + RIR stimato). Stima un lavoro “a cedimento”, non il tonnellaggio reale.',
      'È un’ottica in più, non la metrica principale.',
      'Se la scala è RPE, RIR = 10 − RPE. Senza sforzo il termine extra è 0.',
      'Euristica. Non usarla da sola per alzare o togliere serie.',
      'HEURISTIC', 'effvol-v1', 'Σ load × (reps + RIR)', 'pt', { confidence: 'low' }),
    adaptation: catalogRow('adaptation', 'adaptation', 'Adattamento',
      'Segnale stimato da volume, e1RM e intensità nel confronto tra periodi.',
      'Indica se la risposta recente sembra positiva, mista o negativa.',
      'Regole sui delta di e1RM e volume. Richiede almeno due settimane con dati.',
      'Non è una diagnosi. Un segno negativo non significa overtraining.',
      'ESTIMATED', 'adapt-v1', 'rules on Δe1RM and Δvolume', 'segnale'),
    fatigue: catalogRow('fatigue', 'fatigue', 'Fatica',
      'Segnale interpretabile da perdita di ripetizioni, deriva di RPE e accumulo recente.',
      'Meglio di una percentuale inventata: dice cosa è cambiato e perché.',
      'Combina fatica intra-seduta e rapporto acuto/cronico.',
      'Euristica. Non misura il sistema nervoso né diagnostica overtraining.',
      'HEURISTIC', 'fatigue-v1', 'rep loss + RPE drift + ACWR', 'segnale', { confidence: 'low' }),
    performance: catalogRow('performance', 'strength', 'Risposta di prestazione',
      'Come sta andando la prestazione (soprattutto e1RM dello stesso esercizio) rispetto al periodo precedente.',
      'Ha più peso del semplice “volume vs MRV” nelle raccomandazioni.',
      'Delta di e1RM (e, se manca, stabilità di carico/rep) su almeno due settimane.',
      'Senza abbastanza esposizioni resta “dati insufficienti”.',
      'ESTIMATED', 'perf-v1', 'Δ e1RM sul confronto periodo', 'segnale'),
    volumeResponse: catalogRow('volumeResponse', 'adaptation', 'Risposta al volume',
      'Confronta il cambio di volume con prestazione, sforzo e recupero.',
      'Serve a capire se più lavoro sta ancora producendo adattamento.',
      'Δ volume vs Δ e1RM vs Δ intensità vs segnale di recupero.',
      'Servono più osservazioni. Una sola seduta non aggiorna MEV/MAV/MRV.',
      'ESTIMATED', 'volresp-v1', 'Δvol vs Δperf vs Δeffort', 'segnale'),
    muscleContribution: catalogRow('muscleContribution', 'volume', 'Contributo muscolare',
      'Mappa euristica di muscoli primari, secondari e indiretti per esercizio.',
      'Evita di contare 1 serie = 1 per ogni muscolo coinvolto.',
      'Usa i gruppi in scheda e parole chiave del nome. Pesi interni: 1 / 0,5 / 0,25.',
      'I coefficienti non sono misure fisiologiche. Sono un modello interno documentato.',
      'HEURISTIC', 'contrib-v1', 'primary=1 secondary=0.5 indirect=0.25', 'serie pesate', { confidence: 'low' }),
    recommendation: catalogRow('recommendation', 'recommendations', 'Raccomandazione',
      'Suggerimento di carico o volume per la prossima esposizione, separato dalla scheda originale.',
      'Ti dà un’ipotesi spiegabile. Accetti, tieni o scarti.',
      'Gerarchia: prestazione, sforzo, fatica, recupero, volume, landmark come riferimento.',
      'Non scrive i kg programmati. Non diagnostica overtraining. Sopra MRV stimata con prestazione positiva non riduce in automatico.',
      'HEURISTIC', 'reco-v1', 'rules on e1RM/RPE/recovery', 'kg'),
    effectiveDose: catalogRow('effectiveDose', 'volume', 'Dose allenante (ETD)',
      'Modello interno della dose contestualizzata: contributo muscolare × vicinanza al cedimento.',
      'Serve a distinguere “quante serie ho contato” da “quanto stimolo stima il modello”.',
      'Peso del ruolo (1 / 0,5 / 0,25) moltiplicato per un fattore da RIR/RPE.',
      'Non è una metrica scientifica ufficiale. Euristica per la futura centralina.',
      'HEURISTIC', 'etd-v1', 'Σ contribWeight × proximity', 'dose', { confidence: 'low' }),
    fatigueCost: catalogRow('fatigueCost', 'fatigue', 'Costo di fatica',
      'Modello interno del costo stimato del lavoro, separato dallo stimolo.',
      'Aiuta a leggere se lo stesso volume è “caro” o “economico” in termini di fatica.',
      'Usa volume, peso del muscolo e intensità 0–10 se presente.',
      'Non misura il sistema nervoso. Non è una percentuale fisiologica.',
      'HEURISTIC', 'fatcost-v1', 'volume × contrib × intensity/10', 'segnale', { confidence: 'low' }),
    rpe: catalogRow('rpe', 'intensity', 'Sforzo percepito',
      'Quanto è stata impegnativa la serie, su una scala da 1 a 10. RPE 9 significa che la serie è stata molto impegnativa e restava circa 1 ripetizione in riserva.',
      'Serve a leggere lo sforzo reale, non solo i kg sul bilanciere.',
      'Usa il valore RPE che hai scritto. Se usi la scala RIR, lo sforzo equivale a 10 − RIR.',
      'È una percezione. Due persone possono dare numeri diversi allo stesso set.',
      'DERIVED', 'rir-rpe-v1', 'RPE registrato, oppure 10−RIR', '/10', { shortNameIt: 'RPE', technicalName: 'RPE — Rate of Perceived Exertion' }),
    rir: catalogRow('rir', 'intensity', 'Ripetizioni in riserva',
      'Quante ripetizioni avresti probabilmente potuto completare ancora mantenendo una tecnica accettabile.',
      'Indica il margine dal cedimento, utile per capire se il lavoro era facile o duro.',
      'Usa il RIR registrato. Se la scala è RPE, RIR ≈ 10 − RPE.',
      'È una stima percepita, non un conteggio fisiologico.',
      'DERIVED', 'rir-rpe-v1', 'RIR registrato, oppure 10−RPE', 'rip', { shortNameIt: 'RIR', technicalName: 'RIR — Reps in Reserve' }),
    mev: catalogRow('mev', 'landmarks', 'Volume minimo efficace stimato',
      'È una stima del volume dal quale iniziamo a osservare una risposta positiva. Non rappresenta un numero universale valido per tutti.',
      'Serve come riferimento basso, non come obbligo di allenarti a quel numero.',
      'Valore configurabile o default del modello di landmark.',
      'Stima individuale. Una settimana sotto MEV non prova che non ci sia adattamento.',
      'MODEL_BASED', 'landmarks-v1', 'prefs.volumeLandmarks.MEV', 'serie', { shortNameIt: 'MEV', technicalName: 'MEV — Minimum Effective Volume', confidence: 'low' }),
    mav: catalogRow('mav', 'landmarks', 'Zona di volume più produttiva stimata',
      'È la fascia di volume nella quale i dati disponibili suggeriscono un buon rapporto tra stimolo e costo di fatica. È una stima individuale e può cambiare nel tempo.',
      'Aiuta a leggere se sei nella zona in cui il lavoro tende a pagare di più.',
      'Intervallo MAV_LOW–MAV_HIGH da preferenze o default.',
      'Non è una zona magica. Prestazione e recupero pesano di più di questo numero.',
      'MODEL_BASED', 'landmarks-v1', 'prefs.volumeLandmarks.MAV', 'serie', { shortNameIt: 'MAV', technicalName: 'MAV — Maximum Adaptive Volume', confidence: 'low' }),
    mrv: catalogRow('mrv', 'landmarks', 'Limite superiore di volume stimato',
      'È una stima del livello di volume oltre il quale il costo di fatica e recupero può iniziare a compromettere la capacità di continuare a progredire. Non è un limite fisiologico universale. Nella tabella, il valore attuale è le serie della settimana (filtro muscolare); il riferimento è questo MRV, non un massimale.',
      'È un riferimento, non un ordine automatico di ridurre le serie.',
      'Valore MRV da preferenze o default. 87 serie su tutto il corpo non si confronta con un MRV da singolo gruppo.',
      'Volume sopra MRV con prestazione in aumento e recupero stabile → continua a monitorare, non ridurre in automatico.',
      'MODEL_BASED', 'landmarks-v1', 'prefs.volumeLandmarks.MRV', 'serie', { shortNameIt: 'MRV', technicalName: 'MRV — Maximum Recoverable Volume', confidence: 'low' }),
    readiness: catalogRow('readiness', 'recovery', 'Prontezza stimata',
      'Lettura combinata di recupero e fatica recente. Non è una misura fisiologica diretta.',
      'Serve a capire se i dati recenti suggeriscono di procedere come al solito o di monitorare.',
      'Deriva dai segnali di recupero e fatica del motore.',
      'Non è HRV né un test di laboratorio.',
      'HEURISTIC', 'acwr-adapt-v1', 'recovery + fatigue labels', 'segnale', { shortNameIt: 'Readiness', technicalName: 'Readiness', confidence: 'low' }),
    confidence: catalogRow('confidence', 'recommendations', 'Confidenza della stima',
      'Quanto i dati disponibili sono sufficienti per fidarsi del segnale. Bassa confidenza non significa che il dato sia sbagliato: significa che manca storia.',
      'Evita di prendere decisioni nette su poche osservazioni.',
      'Sale con più settimane e più esposizioni dello stesso esercizio.',
      'Non è un p-value statistico.',
      'HEURISTIC', 'intel-v1', 'filled weeks / exposures', 'livello', { shortNameIt: 'Confidenza', technicalName: 'Confidence' }),
    performanceVsPrevious: catalogRow('performanceVsPrevious', 'strength', 'Prestazione vs precedente',
      'Quanto la prestazione di oggi (soprattutto e1RM dello stesso esercizio) differisce dalla precedente esposizione comparabile. Il confronto considera carico, ripetizioni e, quando disponibili, RPE/RIR.',
      'Dice se stai andando meglio, uguale o peggio sullo stesso movimento.',
      'Delta percentuale di e1RM (e, se manca, stabilità di carico/rep).',
      'Vale solo a parità di esercizio. Non confronta panca e squat.',
      'ESTIMATED', 'perf-v1', 'Δ e1RM vs previous exposure', '%', { shortNameIt: 'vs prec.', technicalName: 'Performance vs previous' }),
    volumeVsPrevious: catalogRow('volumeVsPrevious', 'volume', 'Volume vs precedente',
      'Variazione percentuale del volume rispetto alla settimana o seduta precedente.',
      'Mostra se hai fatto più o meno lavoro, non se è stato meglio.',
      'Delta di tonnellaggio sul confronto periodo.',
      'Un + non è automaticamente un miglioramento.',
      'DERIVED', 'tonnage-v1', 'Δ volume', '%', { shortNameIt: 'Δ volume', technicalName: 'Volume vs previous' }),
    atl: catalogRow('atl', 'workload', 'Carico recente stimato',
      'Volume dell’ultima settimana, usato come carico acuto. Modello adattato dall’endurance.',
      'Dice se il carico recente è alto rispetto a quello abituale.',
      'ATL = tonnellaggio dell’ultima settimana visibile.',
      'Non è una misura fisiologica diretta.',
      'MODEL_BASED', 'atl-adapt-v1', 'ATL = last week volume', 'kg', { shortNameIt: 'ATL', technicalName: 'ATL — Acute Training Load', confidence: 'low' }),
    ctl: catalogRow('ctl', 'workload', 'Carico abituale stimato',
      'Media del volume fino a quattro settimane, usata come carico cronico.',
      'È il riferimento rispetto a cui leggere il carico recente.',
      'CTL = media del tonnellaggio delle ultime settimane disponibili (fino a 4).',
      'Modello adattato. Poche settimane = stima poco stabile.',
      'MODEL_BASED', 'atl-adapt-v1', 'CTL = mean last ≤4 weeks', 'kg', { shortNameIt: 'CTL', technicalName: 'CTL — Chronic Training Load', confidence: 'low' }),
    tsb: catalogRow('tsb', 'workload', 'Bilancio del carico stimato',
      'Differenza tra carico abituale e carico recente (CTL − ATL). Positivo = recente più leggero; negativo = recente più pesante.',
      'Aiuta a vedere se stai accumulando o scaricando, non a diagnosticare overtraining.',
      'TSB = CTL − ATL.',
      'Modello adattato dall’endurance. Solo tendenza.',
      'MODEL_BASED', 'atl-adapt-v1', 'TSB = CTL − ATL', 'kg', { shortNameIt: 'TSB', technicalName: 'TSB — Training Stress Balance', confidence: 'low' })
  };
  (function attachCatalogLabels() {
    const tech = {
      volume: 'Volume / Tonnage', bw: 'BW', sets: 'Sets', reps: 'Reps', load: 'Load',
      frequency: 'Frequency', sessions: 'Sessions', e1rm: 'e1RM — Estimated 1RM',
      intensity: 'Intensity', intensity10: 'Intensity /10', landmarks: 'MV / MEV / MAV / MRV',
      recovery: 'Recovery', atlCtl: 'ATL / CTL / TSB', trainingLoad: 'Training Load',
      hardSets: 'Hard Sets', effectiveVolume: 'Effective Volume', adaptation: 'Adaptation',
      fatigue: 'Fatigue', performance: 'Performance', volumeResponse: 'Volume Response',
      muscleContribution: 'Muscle Contribution', recommendation: 'Recommendation',
      effectiveDose: 'Effective Training Dose', fatigueCost: 'Fatigue Cost'
    };
    Object.keys(METRIC_CATALOG).forEach(function (id) {
      const row = METRIC_CATALOG[id];
      if (!row.technicalName) row.technicalName = tech[id] || id;
      if (!row.shortNameIt) row.shortNameIt = row.nameIt;
    });
  })();

  function estimatedNrm(e1, n) {
    const e = num(e1);
    const r = int(n);
    if (e == null || r == null || r < 1 || r > EPLEY_MAX_REPS) return null;
    if (r === 1) return e;
    return round1(e / (1 + r / 30));
  }

  function intensityDistribution(sets) {
    const bins = { '<60': 0, '60-70': 0, '70-80': 0, '80-90': 0, '90+': 0 };
    let used = 0;
    (sets || []).forEach(function (s) {
      if (s.e1rm == null || !(s.loadRaw > 0)) return;
      const pct = (s.loadRaw / s.e1rm) * 100;
      used += 1;
      if (pct < 60) bins['<60'] += 1;
      else if (pct < 70) bins['60-70'] += 1;
      else if (pct < 80) bins['70-80'] += 1;
      else if (pct < 90) bins['80-90'] += 1;
      else bins['90+'] += 1;
    });
    return { bins: bins, used: used, kind: 'derived', formulaVersion: FORMULA_VERSION };
  }

  function intraSessionFatigue(sets) {
    const rows = (sets || []).slice().sort(function (a, b) { return a.set - b.set; });
    if (rows.length < 2) return { signal: null, repLoss: null, rpeDrift: null, kind: 'heuristic', note: 'Servono almeno 2 serie' };
    const first = rows[0];
    const last = rows[rows.length - 1];
    const sameLoad = first.loadRaw > 0 && Math.abs(first.loadRaw - last.loadRaw) < 0.6;
    const repLoss = (sameLoad && first.reps > 0) ? round1(((last.reps - first.reps) / first.reps) * 100) : null;
    const rpeDrift = (first.rpe != null && last.rpe != null) ? round1(last.rpe - first.rpe) : null;
    let signal = null;
    if (repLoss != null && repLoss <= -15 && rpeDrift != null && rpeDrift >= 1) signal = 'moderate';
    else if (repLoss != null && repLoss <= -25) signal = 'high';
    else if ((repLoss != null && repLoss < 0) || (rpeDrift != null && rpeDrift > 0.4)) signal = 'low';
    else if (repLoss != null || rpeDrift != null) signal = 'stable';
    return { signal: signal, repLoss: repLoss, rpeDrift: rpeDrift, kind: 'heuristic', formulaVersion: FORMULA_VERSION, note: 'Classificazione euristica, non misura fisiologica.' };
  }

  function trainingLoadFromWeeks(weeks) {
    const fat = fatigueFromWeeks(weeks);
    const atl = fat.acute;
    const ctl = fat.chronic;
    const tsb = (atl != null && ctl != null) ? Math.round(ctl - atl) : null;
    return {
      sessionLoad: atl,
      weeklyLoad: atl,
      acute: atl,
      chronic: ctl,
      stress: fat.stress,
      atl: atl,
      ctl: ctl,
      tsb: tsb,
      kind: 'model_based',
      methodology: 'Modello adattato ATL/CTL/TSB dal tonnellaggio settimanale. Derivato dall’endurance, dipendente dal contesto. Solo tendenza.',
      evidenceLevel: 'MODEL_BASED',
      formulaVersion: 'atl-adapt-v1',
      note: fat.note
    };
  }

  function adaptationFromComparison(comparison, weeks) {
    const vol = comparison && comparison.volume;
    const e1 = comparison && comparison.e1rm;
    const intD = comparison && comparison.intensity;
    let signal = null;
    let confidence = 'LOW';
    const filled = (weeks || []).filter(function (w) { return !w.empty; }).length;
    if (filled < 2 || (vol == null && e1 == null)) {
      return { signal: null, volumeResponse: 'insufficient_data', kind: 'estimated', confidence: 'LOW', note: 'Servono almeno 2 settimane con dati.' };
    }
    if (filled >= 4) confidence = 'MEDIUM';
    if (e1 != null && e1 > 2 && (vol == null || vol < 25)) { signal = 'POSITIVE'; }
    else if (e1 != null && e1 < -2 && vol != null && vol > 15) { signal = 'NEGATIVE'; }
    else if (e1 != null && Math.abs(e1) <= 2 && vol != null && Math.abs(vol) <= 8) { signal = 'NEUTRAL'; }
    else if (vol != null || e1 != null) { signal = 'MIXED'; }
    let volumeResponse = 'insufficient_data';
    if (vol != null && e1 != null) {
      if (vol > 5 && e1 > 1) volumeResponse = 'positive_response';
      else if (vol > 10 && e1 <= 0) volumeResponse = 'negative_response';
      else volumeResponse = 'neutral_response';
    }
    return {
      signal: signal,
      volumeResponse: volumeResponse,
      intensityDelta: intD,
      kind: 'estimated',
      confidence: confidence,
      formulaVersion: FORMULA_VERSION,
      note: 'Segnale adattativo descrittivo. Non è una diagnosi di overtraining.'
    };
  }

  function setsForExercise(store, data, name, opts) {
    return normalizeSets(store, data, Object.assign({}, opts || {}, { exercise: name || '' }));
  }

  function analyzeExercise(store, data, name, opts) {
    const sets = setsForExercise(store, data, name, opts);
    if (!sets.length) {
      return { name: name, empty: true, e1rm: null, note: 'Dati insufficienti', kind: 'derived' };
    }
    const e1s = sets.map(function (s) { return s.e1rm; }).filter(function (n) { return n != null; });
    const current = e1s.length ? e1s[e1s.length - 1] : null;
    const best = e1s.length ? Math.max.apply(null, e1s) : null;
    const prevBest = e1s.length > 1 ? Math.max.apply(null, e1s.slice(0, -1)) : null;
    const trend = (current != null && prevBest != null) ? pctDelta(current, prevBest) : null;
    const today = sets.filter(function (s) {
      const last = sets[sets.length - 1];
      return last && s.week === last.week && s.day === last.day;
    });
    return {
      name: name,
      empty: false,
      sets: sets.length,
      volume: Math.round(sets.reduce(function (a, s) { return a + s.volume; }, 0)),
      avgLoad: mean(sets.map(function (s) { return s.loadRaw; })),
      avgRpe: mean(sets.map(function (s) { return s.rpe; })),
      avgRir: mean(sets.map(function (s) { return s.rir; })),
      e1rm: current,
      e1rmBest: best,
      e5rm: estimatedNrm(current, 5),
      e8rm: estimatedNrm(current, 8),
      e10rm: estimatedNrm(current, 10),
      trend: trend,
      prStatus: (current != null && prevBest != null && current > prevBest) ? 'new_estimated_pr' : null,
      intensityDist: intensityDistribution(sets),
      fatigue: intraSessionFatigue(today),
      kind: 'derived',
      formulaVersion: FORMULA_VERSION
    };
  }

  function liveAfterSet(store, data, loc) {
    loc = loc || {};
    const week = Number(loc.week) || 1;
    const day = Number(loc.day) || 0;
    const exIdx = Number(loc.exIdx) || 0;
    const setN = Number(loc.set) || 1;
    const all = normalizeSets(store, data, {});
    const name = resolveExerciseName(data, store, week, day, exIdx);
    const today = all.filter(function (s) { return s.week === week && s.day === day && s.exIdx === exIdx; });
    const current = today.find(function (s) { return s.set === setN; }) || today[today.length - 1];
    if (!current) {
      return { empty: true, note: 'Dati insufficienti', kind: 'derived', formulaVersion: FORMULA_VERSION };
    }
    const hist = all.filter(function (s) {
      return s.name === name && (s.week < week || (s.week === week && (s.day < day || (s.day === day && s.set < setN))));
    });
    const prevBest = hist.reduce(function (m, s) { return (s.e1rm != null && (m == null || s.e1rm > m)) ? s.e1rm : m; }, null);
    const vsBest = (current.e1rm != null && prevBest != null) ? pctDelta(current.e1rm, prevBest) : null;
    const lastSession = hist.filter(function (s) {
      const last = hist[hist.length - 1];
      return last && s.week === last.week && s.day === last.day;
    });
    const lastVol = lastSession.reduce(function (a, s) { return a + s.volume; }, 0);
    const todayVol = today.reduce(function (a, s) { return a + s.volume; }, 0);
    return {
      empty: false,
      name: name,
      week: week,
      day: day,
      exIdx: exIdx,
      set: setN,
      load: current.loadRaw,
      reps: current.reps,
      rpe: current.rpe,
      rir: current.rir,
      e1rm: current.e1rm,
      relativeIntensity: relativeIntensity(current.loadRaw, current.e1rm),
      volumeSet: current.volume,
      volumeToday: Math.round(todayVol),
      vsPreviousBest: vsBest,
      vsLastSessionVolume: lastVol > 0 ? pctDelta(todayVol, lastVol) : null,
      fatigue: intraSessionFatigue(today),
      kind: 'derived',
      formulaVersion: FORMULA_VERSION
    };
  }

  function exerciseReport(store, data, loc) {
    const live = liveAfterSet(store, data, loc);
    if (live.empty) return live;
    const all = normalizeSets(store, data, { exercise: live.name });
    const today = all.filter(function (s) { return s.week === loc.week && s.day === loc.day && s.exIdx === loc.exIdx; });
    const prevDays = all.filter(function (s) { return !(s.week === loc.week && s.day === loc.day); });
    const lastDayKey = prevDays.length ? (prevDays[prevDays.length - 1].week + '_' + prevDays[prevDays.length - 1].day) : null;
    const last = lastDayKey ? prevDays.filter(function (s) { return (s.week + '_' + s.day) === lastDayKey; }) : [];
    const todayE1 = today.reduce(function (m, s) { return (s.e1rm != null && (m == null || s.e1rm > m)) ? s.e1rm : m; }, null);
    const lastE1 = last.reduce(function (m, s) { return (s.e1rm != null && (m == null || s.e1rm > m)) ? s.e1rm : m; }, null);
    const todayVol = today.reduce(function (a, s) { return a + s.volume; }, 0);
    const lastVol = last.reduce(function (a, s) { return a + s.volume; }, 0);
    const bestSet = today.slice().sort(function (a, b) { return (b.e1rm || 0) - (a.e1rm || 0); })[0];
    let status = null;
    if (todayE1 != null && lastE1 != null) {
      if (todayE1 > lastE1) status = 'Prestazione in miglioramento';
      else if (todayE1 < lastE1) status = 'Prestazione in calo';
      else status = 'Prestazione stabile';
    } else {
      status = 'Dati insufficienti';
    }
    return Object.assign({}, live, {
      report: true,
      volumeToday: Math.round(todayVol),
      bestSet: bestSet ? (bestSet.loadRaw + ' × ' + bestSet.reps) : null,
      e1rmToday: todayE1,
      e1rmPrev: lastE1,
      e1rmChange: (todayE1 != null && lastE1 != null) ? pctDelta(todayE1, lastE1) : null,
      volumeChange: lastVol > 0 ? pctDelta(todayVol, lastVol) : null,
      avgRpe: mean(today.map(function (s) { return s.rpe; })),
      status: status,
      kind: 'derived'
    });
  }

  function recommendNext(store, data, loc) {
    const report = exerciseReport(store, data, loc);
    const base = {
      action: 'insufficient',
      suggestedLoad: null,
      deltaKg: null,
      why: 'Servono più esposizioni con carico e reps validi.',
      evidence: [],
      signalsUsed: [],
      confidence: 'LOW',
      kind: 'heuristic',
      formulaVersion: 'reco-v1',
      evidenceLevel: 'HEURISTIC',
      name: (report && report.name) || '',
      mrvNote: null
    };
    if (report.empty || report.e1rmToday == null) return base;
    const lastLoad = report.load;
    const e1up = report.e1rmChange != null && report.e1rmChange > 1.5;
    const e1down = report.e1rmChange != null && report.e1rmChange < -1.5;
    const e1Flat = report.e1rmChange != null && Math.abs(report.e1rmChange) <= 1.5;
    const rpeHigh = report.avgRpe != null && report.avgRpe >= 9;
    const rpeOk = report.avgRpe == null || report.avgRpe <= 8.5;
    const rpeStable = report.avgRpe == null || report.avgRpe <= 8.7;
    const fat = report.fatigue || {};
    const buckets = trainingBuckets(normalizeSets(store, data, { exercise: report.name }), Math.max(Number(loc.week) || 1, 4));
    const lastWeek = buckets.filter(function (w) { return !w.empty; }).pop();
    const lm = landmarksFor(store, 'GENERALE', lastWeek ? lastWeek.sets : null);
    const aboveMrv = lm.currentSets != null && lm.currentSets >= lm.MRV;
    const rec = recoveryFromStore(store, buckets);
    const recoveryOk = rec.signal === 'GOOD' || rec.signal === 'MODERATE' || rec.signal === 'INSUFFICIENT_DATA';
    const evidence = [];
    const signalsUsed = ['performance', 'effort', 'fatigue', 'recovery', 'volume', 'landmarks'];
    if (report.e1rmChange != null) evidence.push('e1RM ' + (report.e1rmChange >= 0 ? '+' : '') + report.e1rmChange + '% vs seduta precedente');
    if (report.avgRpe != null) evidence.push('RPE medio ' + report.avgRpe);
    if (fat.signal) evidence.push('Fatica intra-seduta: ' + fat.signal);
    if (aboveMrv) evidence.push('Volume settimanale ≥ MRV stimata (' + lm.currentSets + '/' + lm.MRV + ')');
    if (rec.signal) evidence.push('Recupero: ' + rec.signal);
    let action = 'maintain';
    let delta = 0;
    let why = 'Prestazione stabile: mantieni il carico.';
    let conf = report.e1rmPrev == null ? 'LOW' : 'MEDIUM';
    let mrvNote = null;
    if (e1up && rpeOk && fat.signal !== 'high') {
      action = 'increase';
      delta = lastLoad < 20 ? 1 : 2.5;
      why = 'Prestazione in aumento e sforzo nella fascia. Suggerimento, non modifica automatica.';
      conf = 'MEDIUM';
      if (aboveMrv) {
        mrvNote = 'La stima di MRV potrebbe essere conservativa. Continuare a monitorare.';
        why += ' Volume sopra la MRV stimata ma la risposta resta positiva.';
      }
    } else if (e1down && (rpeHigh || fat.signal === 'high' || fat.signal === 'moderate' || rec.signal === 'LOW')) {
      action = 'reduce_volume';
      delta = 0;
      why = 'Prestazione in calo con fatica o recupero bassi. Valuta di togliere 1–2 serie di lavoro. Non è una diagnosi.';
      conf = 'MEDIUM';
    } else if (aboveMrv && e1up && rpeStable && recoveryOk) {
      action = 'maintain';
      mrvNote = 'La stima di MRV potrebbe essere conservativa. Continuare a monitorare.';
      why = 'La risposta prestazionale resta positiva nonostante il volume sopra la stima attuale del MRV.';
      conf = 'MEDIUM';
    } else if (e1Flat && rpeStable && fat.signal !== 'high') {
      action = 'maintain';
      why = 'Prestazione e sforzo stabili: mantieni il carico.';
    }
    return {
      action: action,
      suggestedLoad: lastLoad != null ? round1(lastLoad + delta) : null,
      deltaKg: delta,
      why: why,
      evidence: evidence,
      signalsUsed: signalsUsed,
      confidence: conf,
      kind: 'heuristic',
      formulaVersion: 'reco-v1',
      evidenceLevel: 'HEURISTIC',
      name: report.name,
      week: loc.week,
      day: loc.day,
      exIdx: loc.exIdx,
      mrvNote: mrvNote,
      landmarks: lm
    };
  }

  function preWorkout(store, data, loc, matchMuscle) {
    const sets = normalizeSets(store, data, { matchMuscle: matchMuscle });
    const week = Number(loc && loc.week) || 1;
    const day = Number(loc && loc.day) || 0;
    const lastLog = ((store && store.logs) || []).filter(function (l) {
      return l && !(Number(l.week) === week && Number(l.day) === day);
    }).pop();
    const recent = sets.filter(function (s) { return s.week === week || s.week === week - 1; });
    const fat = fatigueFromWeeks(trainingBuckets(sets, Math.max(week, 4)));
    return {
      lastSession: lastLog ? { week: lastLog.week, day: lastLog.day, at: lastLog.at, tonnage: lastLog.tonnage } : null,
      recentSets: recent.length,
      recentVolume: Math.round(recent.reduce(function (a, s) { return a + s.volume; }, 0)),
      recovery: recoveryFromStore(store, trainingBuckets(sets, Math.max(week, 4))),
      fatigue: fat,
      kind: 'estimated',
      formulaVersion: FORMULA_VERSION,
      note: 'Contesto pre-seduta. Non modifica la scheda.'
    };
  }

  function sessionSummary(store, data, loc) {
    const week = Number(loc && loc.week) || 1;
    const day = Number(loc && loc.day) || 0;
    const today = normalizeSets(store, data, {}).filter(function (s) { return s.week === week && s.day === day; });
    const prev = normalizeSets(store, data, {}).filter(function (s) { return s.week < week || (s.week === week && s.day < day); });
    const lastKey = prev.length ? (prev[prev.length - 1].week + '_' + prev[prev.length - 1].day) : null;
    const last = lastKey ? prev.filter(function (s) { return (s.week + '_' + s.day) === lastKey; }) : [];
    const vol = today.reduce(function (a, s) { return a + s.volume; }, 0);
    const lastVol = last.reduce(function (a, s) { return a + s.volume; }, 0);
    const setsChange = last.length ? pctDelta(today.length, last.length) : null;
    const todayE1 = today.reduce(function (m, s) { return (s.e1rm != null && (m == null || s.e1rm > m)) ? s.e1rm : m; }, null);
    const lastE1 = last.reduce(function (m, s) { return (s.e1rm != null && (m == null || s.e1rm > m)) ? s.e1rm : m; }, null);
    const perf = (todayE1 != null && lastE1 != null) ? pctDelta(todayE1, lastE1) : null;
    const buckets = trainingBuckets(normalizeSets(store, data, {}), Math.max(week, 4));
    const rec = recoveryFromStore(store, buckets);
    return {
      volume: Math.round(vol),
      sets: today.length,
      avgRpe: mean(today.map(function (s) { return s.rpe; })),
      volumeChange: lastVol > 0 ? pctDelta(vol, lastVol) : null,
      setsChange: setsChange,
      performanceChange: perf,
      fatigue: intraSessionFatigue(today),
      recovery: rec,
      adaptation: adaptationFromComparison({
        volume: lastVol > 0 ? pctDelta(vol, lastVol) : null,
        e1rm: perf,
        intensity: null
      }, buckets),
      kind: 'derived',
      formulaVersion: FORMULA_VERSION
    };
  }

  function rawFingerprint(store) {
    return JSON.stringify({
      data: (store && store.data) || {},
      logs: (store && store.logs) || [],
      bw: (store && store.bw) || {},
      customSets: (store && store.customSets) || {}
    });
  }

  function explainMetric(id) {
    return METRIC_CATALOG[id] || null;
  }

  function labelIt(key) {
    const map = {
      POSITIVE: 'Positiva', NEGATIVE: 'Negativa', NEUTRAL: 'Neutra', MIXED: 'Mista',
      INSUFFICIENT_DATA: 'Dati insufficienti',
      LOW: 'bassa', MODERATE: 'media', MEDIUM: 'media', HIGH: 'alta', ELEVATED: 'elevata', GOOD: 'buona',
      low: 'bassa', moderate: 'moderata', high: 'alta', stable: 'stabile',
      increase: 'Aumento carico', maintain: 'Mantieni', reduce_volume: 'Riduci volume', insufficient: 'Dati insufficienti',
      weight: 'PR carico', reps: 'PR ripetizioni', e1rm: 'PR e1RM', volume: 'PR volume',
      positive_response: 'Risposta positiva', negative_response: 'Risposta negativa',
      neutral_response: 'Risposta neutra', insufficient_data: 'Dati insufficienti',
      'Prestazione in miglioramento': 'Prestazione in miglioramento',
      'Prestazione in calo': 'Prestazione in calo',
      'Prestazione stabile': 'Prestazione stabile',
      below_estimated_MV: 'Sotto la MV stimata',
      near_estimated_MV: 'Vicino alla MV stimata',
      within_estimated_MAV: 'Nella MAV stimata',
      above_estimated_MAV: 'Sopra la MAV stimata',
      at_or_above_estimated_MRV: 'A/oltre la MRV stimata',
      low_recent_load: 'Carico recente basso',
      balanced_load: 'Carico equilibrato',
      high_recent_load: 'Carico recente alto'
    };
    return map[key] || (key == null ? '—' : String(key).replace(/_/g, ' '));
  }

  function humanState(domain, key) {
    if (key == null || key === '') return 'Dati insufficienti';
    const d = String(domain || '');
    const k = String(key);
    if (d === 'fatigue' || d === 'fatigueSignal') {
      if (k === 'low' || k === 'LOW') return 'Fatica bassa';
      if (k === 'moderate' || k === 'MODERATE' || k === 'MEDIUM') return 'Fatica moderata';
      if (k === 'high' || k === 'HIGH' || k === 'ELEVATED') return 'Fatica elevata';
      if (k === 'stable') return 'Fatica stabile';
    }
    if (d === 'recovery') {
      if (k === 'GOOD' || k === 'good' || k === 'balanced_load' || k === 'low_recent_load') return 'Recupero buono';
      if (k === 'MODERATE' || k === 'MEDIUM' || k === 'LOW' || k === 'low' || k === 'high_recent_load') return 'Recupero da monitorare';
      if (k === 'INSUFFICIENT_DATA' || k === 'insufficient_data') return 'Dati insufficienti';
    }
    if (d === 'performance') {
      if (k === 'POSITIVE' || k === 'Prestazione in miglioramento') return 'Prestazione in miglioramento';
      if (k === 'NEGATIVE' || k === 'Prestazione in calo') return 'Prestazione in calo';
      if (k === 'NEUTRAL' || k === 'Prestazione stabile') return 'Prestazione stabile';
      if (k === 'MIXED') return 'Prestazione mista';
      if (k === 'INSUFFICIENT_DATA') return 'Dati insufficienti';
    }
    if (d === 'adaptation' || d === 'volumeResponse') {
      if (k === 'POSITIVE' || k === 'positive_response') return 'Risposta positiva';
      if (k === 'NEGATIVE' || k === 'negative_response') return 'Risposta negativa';
      if (k === 'NEUTRAL' || k === 'neutral_response') return 'Risposta neutra';
      if (k === 'MIXED') return 'Risposta mista';
      if (k === 'INSUFFICIENT_DATA' || k === 'insufficient_data') return 'Dati insufficienti';
    }
    if (d === 'confidence') {
      if (k === 'LOW' || k === 'low') return 'Confidenza: bassa';
      if (k === 'MEDIUM' || k === 'medium' || k === 'MODERATE') return 'Confidenza: media';
      if (k === 'HIGH' || k === 'high') return 'Confidenza: alta';
    }
    return labelIt(k);
  }

  return {
    EPLEY_MAX_REPS: EPLEY_MAX_REPS,
    DEFAULT_LANDMARKS: DEFAULT_LANDMARKS,
    FORMULA_VERSION: FORMULA_VERSION,
    METRIC_CATALOG: METRIC_CATALOG,
    intensityFromRirRpe: intensityFromRirRpe,
    epley1rm: epley1rm,
    estimatedNrm: estimatedNrm,
    relativeIntensity: relativeIntensity,
    movingAverage: movingAverage,
    isoWeekKey: isoWeekKey,
    normalizeSets: normalizeSets,
    detectPRs: detectPRs,
    comparePeriods: comparePeriods,
    applyZoom: applyZoom,
    landmarksFor: landmarksFor,
    intensityDistribution: intensityDistribution,
    intraSessionFatigue: intraSessionFatigue,
    analyzeExercise: analyzeExercise,
    liveAfterSet: liveAfterSet,
    exerciseReport: exerciseReport,
    recommendNext: recommendNext,
    preWorkout: preWorkout,
    sessionSummary: sessionSummary,
    explainMetric: explainMetric,
    rawFingerprint: rawFingerprint,
    isWeekComplete: isWeekComplete,
    muscleContributionForExercise: muscleContributionForExercise,
    buildByMuscle: buildByMuscle,
    listProgramExercises: listProgramExercises,
    labelIt: labelIt,
    humanState: humanState,
    build: build,
    clearCache: function () { _cache = { key: '', at: 0, value: null }; }
  };
});
