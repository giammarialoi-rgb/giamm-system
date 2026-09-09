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
  function foldName(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
  function sameExerciseName(a, b) {
    const fa = foldName(a);
    const fb = foldName(b);
    return !!fa && fa === fb;
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
      const eK = 'w' + week + '_d' + day + '_e' + exIdx;
      const sub = store && store.subs && store.subs[eK];
      if (sub) return sub;
      const w = data && data.weeks && data.weeks[week - 1];
      const sess = w && (w.sessions || w.days) && (w.sessions || w.days)[day];
      const list = sess && (sess.exercises || sess.rows);
      const ex = list && list[exIdx];
      if (ex) return ex.name || ex.exercise || ('Esercizio ' + (exIdx + 1));
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
    const subs = (store && store.subs) || {};
    const subSig = Object.keys(subs).sort().map(function (k) { return k + '=' + subs[k]; }).join(';');
    return [
      n, Math.round(acc),
      ((store && store.logs) || []).length,
      opts.axis, opts.zoomWeeks, opts.muscle || '', opts.exercise || '',
      opts.includeIncompleteWeeks ? '1' : '0',
      opts.currentWeek || 0,
      subSig
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
    if (planned > 0) {
      for (let d = 0; d < planned; d++) {
        if (!sessionFinalized(store, week, d)) return false;
      }
      return true;
    }
    const need = typicalPlannedDays(data, store);
    if (!need) return false;
    return finalizedDayCount(store, week) >= need;
  }

  function isCalendarWeekComplete(isoKey) {
    if (!isoKey || String(isoKey).indexOf('-W') < 0) return false;
    const now = isoWeekKey(Date.now());
    return now != null && isoKey < now;
  }

  function normalizeSets(store, data, opts) {
    opts = opts || {};
    const matchMuscle = opts.matchMuscle || function (name, movement, groups, muscleId, eK) {
      if (!muscleId || muscleId === 'TOTAL' || muscleId === 'GENERALE' || muscleId === 'ALL') return true;
      const rec = storedMuscleRecord(store, name, eK);
      const c = muscleContributionForExercise(name, {
        muscle_groups: groups,
        movement: movement,
        storedMuscle: rec && rec.muscle,
        storedSource: rec && rec.source
      });
      const id = normalizeMuscleId(muscleId);
      return (c.primary || [])[0] === id;
    };
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
      if (row.week > 1) {
        const doneK = !!(store && store.data && store.data[id + '_done']);
        const userK = !!(store && store.data && store.data[id + '_load_user']);
        if (!doneK && !userK && !sessionFinalized(store, row.week, row.day)) {
          let prevDiff = false;
          for (let pw = row.week - 1; pw >= 1; pw--) {
            const pn = resolveExerciseName(data, store, pw, row.day, row.exIdx);
            if (pn && name && !sameExerciseName(pn, name)) { prevDiff = true; break; }
          }
          if (prevDiff) return;
        }
      }
      try {
        if (!matchMuscle(name, meta.movement, meta.muscle_groups || meta.muscleGroups, muscle, eK)) return;
      } catch (_) {}
      if (exerciseFilter && !sameExerciseName(name, exerciseFilter)) return;
      const isPart = !!(store && store.loadTypes && store.loadTypes[eK] === 'part');
      const load = isPart ? loadRaw * 2 : loadRaw;
      const scale = scaleForSet(store, eK, row.week);
      const effort = intensityFromRirRpe(row.rir, scale);
      const estRir = effort ? effort.rir : null;
      const e1 = epley1rm(loadRaw, reps);
      const dateMs = sessionDateMs(store, row.week, row.day);
      const storedRec = storedMuscleRecord(store, name, eK);
      const contribMeta = storedRec
        ? Object.assign({}, meta, { storedMuscle: storedRec.muscle, storedSource: storedRec.source })
        : meta;
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
        contribution: muscleContributionForExercise(name, contribMeta),
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
    if (!out.length) {
      (weeks || []).forEach(function (w, i) {
        if (w && !w.empty) out.push(i);
      });
    }
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

  function landmarksFor(store, muscle, weeklySets, opts) {
    opts = opts || {};
    const rawId = String(muscle || 'TOTAL');
    const macroId = normalizeMuscleId(rawId);
    const global = !rawId || rawId === 'TOTAL' || rawId === 'GENERALE' || rawId === 'ALL' || MACRO_MUSCLE_IDS.indexOf(macroId) < 0;
    const scale = opts.scale || (global ? 'global' : (opts.scale === 'exercise' ? 'exercise' : 'muscle'));
    const comparable = scale === 'muscle' && !global;
    const lmStore = store && store.prefs && store.prefs.volumeLandmarks;
    const cfgKey = global ? 'GENERALE' : ((lmStore && (lmStore[rawId] || lmStore[macroId])) ? (lmStore[rawId] ? rawId : macroId) : macroId);
    const hasCfg = !!(lmStore && lmStore[cfgKey]);
    const cfg = hasCfg ? lmStore[cfgKey] : DEFAULT_LANDMARKS;
    const lm = {
      MV: Number(cfg.MV) || DEFAULT_LANDMARKS.MV,
      MEV: Number(cfg.MEV) || DEFAULT_LANDMARKS.MEV,
      MAV_LOW: Number(cfg.MAV_LOW) || DEFAULT_LANDMARKS.MAV_LOW,
      MAV_HIGH: Number(cfg.MAV_HIGH) || DEFAULT_LANDMARKS.MAV_HIGH,
      MRV: Number(cfg.MRV) || DEFAULT_LANDMARKS.MRV,
      kind: 'estimated_configurable',
      scale: scale,
      muscle: global ? null : (MACRO_MUSCLE_IDS.indexOf(macroId) >= 0 ? macroId : rawId),
      comparable: comparable,
      source: hasCfg ? 'configured' : 'default_configurable',
      title: comparable ? ('VOLUME — ' + rawId) : (scale === 'exercise' ? 'VOLUME ESERCIZIO' : 'VOLUME TOTALE'),
      unit: 'serie / settimana'
    };
    if (!comparable) {
      return Object.assign({
        currentSets: weeklySets == null ? null : weeklySets,
        status: null,
        evidenceLevel: 'MODEL_BASED',
        formulaVersion: 'landmarks-v1',
        confidence: 'LOW',
        note: scale === 'global'
          ? 'Il volume globale non si confronta con MEV/MAV/MRV di un singolo distretto. Seleziona un gruppo muscolare.'
          : 'I landmark di volume valgono per un gruppo muscolare, non per il singolo esercizio.'
      }, lm, { MRV: comparable ? lm.MRV : null, MEV: comparable ? lm.MEV : null, MAV_LOW: comparable ? lm.MAV_LOW : null, MAV_HIGH: comparable ? lm.MAV_HIGH : null, MV: comparable ? lm.MV : null });
    }
    if (weeklySets == null) return Object.assign({ currentSets: null, status: null }, lm);
    let status = null;
    if (weeklySets < lm.MV) status = 'below_estimated_MV';
    else if (weeklySets < lm.MEV) status = 'near_estimated_MV';
    else if (weeklySets <= lm.MAV_HIGH) status = 'within_estimated_MAV';
    else if (weeklySets < lm.MRV) status = 'above_estimated_MAV';
    else status = 'at_or_above_estimated_MRV';
    return Object.assign({
      currentSets: weeklySets,
      status: status,
      evidenceLevel: 'MODEL_BASED',
      formulaVersion: 'landmarks-v1',
      confidence: weeklySets != null ? 'MEDIUM' : 'LOW',
      note: 'Stima individuale / configurabile per questo distretto. Non rappresenta una soglia fisiologica universale. Fonte: ' + (hasCfg ? 'valore configurato' : 'stima configurabile di default') + '.'
    }, lm);
  }

  function assertComparableMetric(current, reference, label) {
    const issues = [];
    if (!current || !reference) issues.push('missing side');
    else {
      if (current.scope && reference.scope && current.scope !== reference.scope) issues.push('scope mismatch');
      if (current.unit && reference.unit && current.unit !== reference.unit) issues.push('unit mismatch');
      if (current.period && reference.period && current.period !== reference.period) issues.push('time-period mismatch');
    }
    const ok = !issues.length;
    if (!ok && typeof console !== 'undefined' && console.error) {
      console.error('[TRAINING-INTEL] assertComparableMetric', label || '', issues, current, reference);
    }
    return { ok: ok, reason: issues.join(', ') || null };
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
  const MACRO_MUSCLE_IDS = ['PETTO', 'DORSO', 'SPALLE', 'BRACCIA', 'ADDOME', 'GAMBE'];
  const MUSCLE_HINTS = [
    { re: /calf raise|seated calf|standing calf|donkey calf|polpac/i, primary: ['GAMBE'] },
    { re: /hip thrust|glute bridge|glute kickback|abduct|adductor|glutei|\bglute\b/i, primary: ['GAMBE'] },
    { re: /stacco rumeno|romanian|\brdl\b|good morning|\bleg curl\b|femoral|nordic/i, primary: ['GAMBE'] },
    { re: /squat|hack squat|leg press|pressa 45|\bpressa\b|affondi|lunge|leg extension|bulgarian|step.?up|sissy|pistol squat/i, primary: ['GAMBE'] },
    { re: /\bstacco\b|deadlift/i, primary: ['GAMBE'], secondary: ['DORSO'] },
    { re: /panca stretta|close.?grip/i, primary: ['BRACCIA'], secondary: ['PETTO'] },
    { re: /panca piana|panca inclin|panca declin|bench press|chest press|croci|cable fly|pec deck|pec fly|push.?up|piegament|flessioni|chest fly|svend|spoto|floor press|guillotine|multi.?bench|leverage.*(bench|panca)|distensioni.*(petto|panca)|dumbbell press|spinte.*(petto|panca|manubri)/i, primary: ['PETTO'], secondary: ['BRACCIA', 'SPALLE'] },
    { re: /\bpanca\b|\bbench\b|petto|chest/i, primary: ['PETTO'], secondary: ['BRACCIA', 'SPALLE'] },
    { re: /pullover/i, primary: ['DORSO'], secondary: ['PETTO'] },
    { re: /dorsey|low row|iso[\s-]?lateral[\s-]?row|hammer[\s-]*(strength[\s-]*)?row|iso[\s-]?row|gorilla row|kelso|yates row/i, primary: ['DORSO'], secondary: ['BRACCIA'] },
    { re: /trazioni|pull.?up|chin.?up|lat machine|lat pull|pulldown|pulley|remator|seal row|dorso|trazione|chest supported|pendlay|meadows|t.?bar|vertical traction|mezzor|iperext|hyperext|back extension|scrollate|shrug/i, primary: ['DORSO'], secondary: ['BRACCIA'] },
    { re: /\brow\b|remat/i, primary: ['DORSO'], secondary: ['BRACCIA'] },
    { re: /military|lento avanti|lento dietro|shoulder press|overhead press|alzate later|lateral raise|alzate front|front raise|rear delt|deltoid|face pull|alzate posteriori|\blento\b|spinta.*(spalle|alto)|distensioni.*(spalle|alto)/i, primary: ['SPALLE'], secondary: ['BRACCIA'] },
    { re: /curl|bicip|hammer curl|preacher|spider curl|bayesian|concentration/i, primary: ['BRACCIA'] },
    { re: /french|skull|pushdown|tricip|tricep|estensioni.*(tricip|gomito)|kickback/i, primary: ['BRACCIA'] },
    { re: /\bdips?\b|parallele/i, primary: ['PETTO'], secondary: ['BRACCIA'] },
    { re: /crunch|plancia|plank|ab wheel|ab roller|addom|sit.?up|leg raise|knee raise|hollow|situp|woodchop|wood chop|pallof|\babs\b|\bcore\b|vacuum|bicycle|alzate gambe|sollevamento gambe|ruota addom|dead bug|bird dog|russian twist|hanging|macchina addom|torso (machine|rotation)|roman chair|air bike|heel tap|v[\s-]?up|jackknife/i, primary: ['ADDOME'] }
  ];
  const NAME_MUSCLE_LOCKS = [
    { re: /leg\s*curl|femoral|hamstring/i, id: 'GAMBE' },
    { re: /dorsey|low row/i, id: 'DORSO' },
    { re: /crunch|plancia|\bplank\b|addominal|\babs\b|sit[\s-]?up|leg raise|knee raise|ab wheel|ab roller|pallof|vacuum|hollow|dead bug|bird dog|woodchop|russian twist|alzate gambe|sollevamento gambe|macchina addom|torso (machine|rotation)|roman chair|air bike/i, id: 'ADDOME' },
    { re: /curl|bicip/i, id: 'BRACCIA' }
  ];

  function nameLockedMuscle(name, movement) {
    const text = String(name || '') + ' ' + String(movement || '');
    for (let i = 0; i < NAME_MUSCLE_LOCKS.length; i++) {
      if (NAME_MUSCLE_LOCKS[i].re.test(text)) return NAME_MUSCLE_LOCKS[i].id;
    }
    return null;
  }
  const FINE_TO_MACRO = {
    PETTO: 'PETTO', CHEST: 'PETTO',
    SCHIENA: 'DORSO', DORSALI: 'DORSO', DORSO: 'DORSO', BACK: 'DORSO',
    SPALLE: 'SPALLE', DELTOIDI: 'SPALLE',
    BICIPITI: 'BRACCIA', TRICIPITI: 'BRACCIA', BRACCIA: 'BRACCIA',
    QUADRICIPITI: 'GAMBE', FEMORALI: 'GAMBE', GLUTEI: 'GAMBE', POLPACCI: 'GAMBE', GAMBE: 'GAMBE',
    ADDOME: 'ADDOME', CORE: 'ADDOME'
  };

  function normalizeMuscleId(raw) {
    const g = String(raw || '').toUpperCase().replace(/&/g, '_').replace(/\s+/g, '_');
    if (['SCHIENA', 'DORSO', 'DORSALI', 'BACK', 'LAT', 'LATS', 'TRAP', 'TRAPEZIO'].includes(g)) return 'DORSO';
    if (['SPALLE', 'DELTOIDI', 'SHOULDERS', 'DELTS'].includes(g)) return 'SPALLE';
    if (['BICIPITI', 'TRICIPITI', 'BRACCIA', 'ARMS', 'BICEPS', 'TRICEPS'].includes(g)) return 'BRACCIA';
    if (['PETTO', 'CHEST', 'PECS', 'PETTORALE', 'PETTORALE_MAGGIORE', 'PETTORALE_CLAVICOLARE'].includes(g)) return 'PETTO';
    if (['ADDOME', 'CORE', 'ABS', 'ABDOMINAL', 'ALTRO'].includes(g)) return 'ADDOME';
    if (['GAMBE', 'LEGS', 'QUADRICIPITI', 'QUADS', 'QUAD', 'FEMORALI', 'HAMSTRINGS', 'HAM', 'GLUTEI', 'GLUTES', 'GLUTE', 'POLPACCI', 'CALVES', 'CALF', 'GAMBE_POLPACCI'].includes(g)) return 'GAMBE';
    return FINE_TO_MACRO[g] || g;
  }

  function storedMuscleRecord(store, name, eK) {
    if (store && eK && store.exMuscle && store.exMuscle[eK]) {
      return { muscle: store.exMuscle[eK], source: 'slot' };
    }
    const map = store && store.exMuscleByName;
    if (!map || typeof map !== 'object') return null;
    const hit = map[foldName(name)] || map[String(name || '').toLowerCase()];
    if (!hit) return null;
    if (typeof hit === 'string') return { muscle: hit, source: 'triangulated' };
    return { muscle: hit.muscle || hit.id || null, source: hit.source || 'triangulated' };
  }

  function storedMuscleFrom(store, name, eK) {
    const rec = storedMuscleRecord(store, name, eK);
    return rec ? rec.muscle : null;
  }

  function muscleContributionForExercise(name, meta) {
    const primary = [];
    const secondary = [];
    const indirect = [];
    const seen = {};
    function add(arr, id) {
      const n = normalizeMuscleId(id);
      if (!n || MACRO_MUSCLE_IDS.indexOf(n) < 0 || seen[n]) return;
      seen[n] = true;
      arr.push(n);
    }
    const storedSource = String((meta && meta.storedSource) || '').toLowerCase();
    const stored = meta && (meta.storedMuscle || meta.muscle_group || meta.muscleGroup);
    const locked = nameLockedMuscle(name, meta && meta.movement);
    if (storedSource === 'manual' && stored) {
      add(primary, stored);
    } else if (locked) {
      add(primary, locked);
    } else if (stored) {
      add(primary, stored);
    }
    const explicit = (meta && (meta.muscle_groups || meta.muscleGroups)) || [];
    if (explicit.length && !locked) {
      if (!primary.length) add(primary, explicit[0]);
      else add(secondary, explicit[0]);
      explicit.slice(1).forEach(function (g) { add(secondary, g); });
    }
    const text = String(name || '') + ' ' + String((meta && meta.movement) || '');
    MUSCLE_HINTS.forEach(function (h) {
      if (!h.re.test(text)) return;
      (h.primary || []).forEach(function (g) {
        if (locked && normalizeMuscleId(g) !== locked) return;
        if (primary.length) add(secondary, g);
        else add(primary, g);
      });
      (h.secondary || []).forEach(function (g) { add(secondary, g); });
      (h.indirect || []).forEach(function (g) { add(indirect, g); });
    });
    return {
      primary: primary,
      secondary: secondary,
      indirect: indirect,
      kind: primary.length ? 'heuristic' : 'unknown',
      evidenceLevel: primary.length ? 'HEURISTIC' : 'NONE',
      formulaVersion: 'contrib-v2'
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
        const mid = normalizeMuscleId(gid);
        if (MACRO_MUSCLE_IDS.indexOf(mid) < 0) return;
        if (!map[mid]) map[mid] = emptyMuscleRollup(mid);
        const g = map[mid];
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
        volumeVarWeek: (prevWeek && last && !last.inProgress) ? pctDelta(last.volume, prevWeek.volume) : null,
        volumeVarNote: (function () {
          if (!prevWeek || !last) return 'Servono due settimane confrontabili';
          const a = last.label.replace(' — in corso', '');
          const b = prevWeek.label.replace(' — in corso', '');
          if (!includeIncomplete && skippedIncomplete.length) {
            return a + ' vs ' + b + ' (' + skippedIncomplete.map(function (w) { return w.label.replace(' — in corso', ''); }).join(', ') + ' esclusa, in corso)';
          }
          if (last.inProgress) return a + ' in corso: il Δ% vs ' + b + ' resta vuoto finché la settimana non è completa';
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
        rpe: windowed.weeks.map(function (w) { return w.avgRpe; }),
        rir: windowed.weeks.map(function (w) { return w.avgRir; }),
        performance: windowed.weeks.map(function (w, i) {
          if (i === 0 || w.empty || windowed.weeks[i - 1].empty) return null;
          return pctDelta(w.e1rm, windowed.weeks[i - 1].e1rm);
        }),
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
      landmarks: landmarksFor(store, muscle, last.sets || null, { scale: (muscle && muscle !== 'TOTAL') ? 'muscle' : 'global' }),
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
      'Confronto tra l’ultima esposizione valida dello stesso esercizio e la precedente. Usa carico, ripetizioni, e1RM di supporto e RPE/RIR. Non usa il tonnellaggio da solo.',
      'Dice se stai andando meglio, uguale o peggio sullo stesso movimento. Il volume della seduta è una metrica separata.',
      'Punteggio set-by-set (carico, rip, margine) più delta e1RM come segnale di supporto. Il segno non viene invertito artificialmente.',
      'Vale solo a parità di esercizio. Non confronta panca e squat. Un calo di volume non è un calo di prestazione.',
      'ESTIMATED', 'perf-exposure-v1', 'compareExposures(current, previous)', '%', { shortNameIt: 'vs prec.', technicalName: 'Performance vs previous' }),
    volumeVsPrevious: catalogRow('volumeVsPrevious', 'volume', 'Volume vs precedente',
      'Variazione percentuale del volume rispetto alla precedente esposizione dello stesso esercizio. È la stessa previousExposure usata per la prestazione.',
      'Mostra se hai fatto più o meno lavoro, non se è stato meglio.',
      'Delta di tonnellaggio tra currentExposure e previousExposure nello snapshot. Non è un proxy della prestazione.',
      'Un + non è automaticamente un miglioramento. Un − con prestazione ↑ non è un peggioramento.',
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
      'MODEL_BASED', 'atl-adapt-v1', 'TSB = CTL − ATL', 'kg', { shortNameIt: 'TSB', technicalName: 'TSB — Training Stress Balance', confidence: 'low' }),
    volumeLoad: catalogRow('volumeLoad', 'volume', 'Volume load',
      'Tonnellaggio: somma di carico × ripetizioni × serie. È la quantità di lavoro, non la qualità né la prestazione.',
      'Risponde a: quanto lavoro ho fatto? Non a: sto diventando più forte?',
      'Σ(kg × rip) sulle serie valide della stessa esposizione o dello stesso periodo.',
      'Un +1% di volume non è un +1% di prestazione. Non è intensità e non è fatica.',
      'DERIVED', 'tonnage-v1', 'Σ(load × reps)', 'kg', { shortNameIt: 'Volume load', technicalName: 'Volume Load / Tonnage' }),
    relativeIntensity: catalogRow('relativeIntensity', 'intensity', 'Intensità relativa',
      'Quanto è pesante il carico rispetto al massimale di riferimento di QUESTO esercizio (1RM validato o e1RM recente).',
      'Distingue “bilanciere più carico” da “più vicino al massimale”.',
      'Load / reference 1RM × 100. Il riferimento è specifico dell’esercizio, mai di un altro movimento.',
      'Senza un 1RM o e1RM affidabile resta vuota. Non è lo sforzo percepito (RPE).',
      'DERIVED', 'intx-v1', 'load / e1RM × 100', '%', { shortNameIt: '%1RM', technicalName: 'Relative Intensity' }),
    effort: catalogRow('effort', 'intensity', 'Sforzo (effort)',
      'Quanto è stata impegnativa la serie: RPE, RIR e la loro deriva. Non è la fatica cumulativa.',
      'Dice il costo percepito dell’output, a parità di kg e ripetizioni.',
      'Media RPE/RIR dell’esposizione e confronto con la precedente.',
      'RPE 9 non significa automaticamente fatica alta. È percepito, non misurato in laboratorio.',
      'DERIVED', 'effx-v1', 'RPE / RIR trend', 'segnale', { shortNameIt: 'Sforzo', technicalName: 'Effort Context' }),
    performanceTrend: catalogRow('performanceTrend', 'strength', 'Trend di prestazione',
      'Direzione della prestazione sulle ultime esposizioni dello stesso esercizio, distinta dal delta vs precedente.',
      'Impedisce che una sola seduta anomala cancelli un trend consolidato.',
      'Confronto consecutivi sulle ultime 3–4 esposizioni.',
      'Richiede più sedute. Non è un e1RM aggregato tra esercizi diversi.',
      'ESTIMATED', 'pic-v1', 'multiSessionTrend(exposures)', 'segnale', { shortNameIt: 'Trend prestazione', technicalName: 'Performance Trend' }),
    performanceResponse: catalogRow('performanceResponse', 'strength', 'Risposta di prestazione',
      'Sintesi output vs costo vs dose: carico, rip, e1RM, RPE/RIR. Positive / Neutral / Negative / Mixed / Insufficient.',
      'È la risposta alla domanda “sto diventando più performante?”, non “quanto lavoro ho fatto?”.',
      'evaluatePerformanceContext sullo snapshot. Il top set pesa più dei backoff.',
      'Stima. Mixed è uno stato valido: non viene compresso in miglioramento o calo.',
      'ESTIMATED', 'pic-v1', 'evaluatePerformanceContext(snapshot)', 'segnale', { shortNameIt: 'Risposta', technicalName: 'Performance Response' }),
    performanceEfficiency: catalogRow('performanceEfficiency', 'strength', 'Efficienza di prestazione',
      'Modello interno: output rispetto allo sforzo. Stesso 120×8 a RIR 2 è più efficiente che a RIR 1.',
      'Aiuta a vedere se produci lo stesso con meno costo percepito.',
      'Confronta load/reps/e1RM con RPE/RIR tra due esposizioni.',
      'Non è una metrica fisiologica ufficiale. Solo modello interno.',
      'HEURISTIC', 'eff-v1', 'output vs effort', 'segnale', { shortNameIt: 'Efficienza', technicalName: 'Performance Efficiency', confidence: 'low' }),
    fatigueSignal: catalogRow('fatigueSignal', 'fatigue', 'Segnale di fatica',
      'Fatica intra-seduta (perdita di rip, deriva RPE) distinta dal carico recente. Non è una percentuale.',
      'Contestualizza un calo di rip durante la seduta senza diagnosticare overtraining.',
      'intraSessionFatigue + contesto di recupero. RPE alto da solo non la alza a HIGH.',
      'Euristica. Mai “Fatigue = 73%”.',
      'HEURISTIC', 'fatigue-v1', 'rep loss + RPE drift', 'segnale', { shortNameIt: 'Fatica', technicalName: 'Fatigue Signal', confidence: 'low' }),
    recoverySignal: catalogRow('recoverySignal', 'recovery', 'Segnale di recupero',
      'Quanto i dati recenti (carico acuto/cronico) appaiono favorevoli a una nuova esposizione.',
      'È un contesto, non un semaforo medico.',
      'Rapporto acuto/cronico sul tonnellaggio settimanale.',
      'Non è HRV né un test di laboratorio.',
      'HEURISTIC', 'acwr-adapt-v1', 'ATL/CTL labels', 'segnale', { shortNameIt: 'Recupero', technicalName: 'Recovery Signal', confidence: 'low' }),
    trainingDose: catalogRow('trainingDose', 'volume', 'Dose di allenamento',
      'Contesto ispezionabile: volume, intensità, frequenza, sforzo, contributo muscolare. Non un unico numero.',
      'Serve alla futura centralina per vedere cosa è stato somministrato, distinto da come hai risposto.',
      'Unisce volume load, intensità relativa, serie e effort.',
      'Modello interno. Stimulus estimate e fatigue cost estimate sono separati dal tonnellaggio.',
      'HEURISTIC', 'dose-v1', 'volume + intensity + effort', 'contesto', { shortNameIt: 'Dose', technicalName: 'Training Dose Context', confidence: 'low' }),
    intensityTrend: catalogRow('intensityTrend', 'intensity', 'Trend di intensità',
      'Come è cambiato il carico (assoluto o relativo) rispetto alla precedente esposizione dello stesso esercizio.',
      'Separato dal trend di prestazione e dal trend di volume.',
      'Delta del top load e, se c’è un e1RM di riferimento, della %1RM stimata.',
      'Non è RPE. Un carico più alto a pari sforzo è intensità ↑, non fatica ↑.',
      'DERIVED', 'intx-v1', 'Δ top load / Δ %e1RM', '%', { shortNameIt: 'Δ intensità', technicalName: 'Intensity Trend' }),
    sessionQuality: catalogRow('sessionQuality', 'adaptation', 'Qualità della seduta',
      'Segnale interno che combina prestazione, intensità, effort, volume e fatica.',
      'Aiuta a leggere una seduta oltre il solo tonnellaggio.',
      'evaluatePerformanceContext.overallSignal.',
      'Non è una misura fisiologica ufficiale.',
      'HEURISTIC', 'sq-v1', 'PIC overallSignal', 'segnale', { shortNameIt: 'Qualità seduta', technicalName: 'Session Quality Signal', confidence: 'low' }),
    performanceContext: catalogRow('performanceContext', 'strength', 'Contesto prestazione e intensità',
      'Layer che tiene insieme volume load, intensità, sforzo, prestazione e fatica senza comprimerli in un solo score.',
      'Spiega perché una seduta può essere migliore anche se il tonnellaggio è quasi uguale.',
      'exerciseAnalyticsSnapshot → evaluatePerformanceContext. Il testo è generato dai delta, non è una frase fissa.',
      'Stima. Vale solo a parità di esercizio e di scala temporale (esposizione vs esposizione).',
      'ESTIMATED', 'pic-v1', 'RAW → PIC → decision', 'contesto', { shortNameIt: 'Contesto', technicalName: 'Performance & Intensity Context' })
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
    const firstRpe = first.rpe != null ? first.rpe : first.intensity10;
    const lastRpe = last.rpe != null ? last.rpe : last.intensity10;
    const sameLoad = first.loadRaw > 0 && Math.abs(first.loadRaw - last.loadRaw) < 0.6;
    const repLoss = (sameLoad && first.reps > 0) ? round1(((last.reps - first.reps) / first.reps) * 100) : null;
    const rpeDrift = (firstRpe != null && lastRpe != null) ? round1(lastRpe - firstRpe) : null;
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

  function exposureKey(s) {
    return String(s.week) + '_' + String(s.day);
  }

  function classifySetRoles(rows) {
    const sorted = (rows || []).slice().sort(function (a, b) { return a.set - b.set; });
    if (!sorted.length) return [];
    let top = sorted[0];
    sorted.forEach(function (s) {
      if (s.loadRaw > top.loadRaw + 0.4) top = s;
      else if (Math.abs((s.loadRaw || 0) - (top.loadRaw || 0)) < 0.4 && s.set < top.set) top = s;
    });
    return sorted.map(function (s) {
      let role = 'working';
      if (s.set === top.set && Math.abs((s.loadRaw || 0) - (top.loadRaw || 0)) < 0.4) role = 'top';
      else if (s.set < top.set && top.loadRaw > 0 && s.loadRaw < top.loadRaw * 0.9) role = 'warmup';
      else if (s.loadRaw < top.loadRaw - 0.4) role = 'backoff';
      const copy = Object.assign({}, s, { role: role });
      return copy;
    });
  }

  function summarizeExposure(sets) {
    const raw = (sets || []).slice().sort(function (a, b) { return a.set - b.set; });
    const rows = classifySetRoles(raw);
    const e1s = rows.map(function (s) { return s.e1rm; }).filter(function (n) { return n != null; });
    const top = rows.filter(function (s) { return s.role === 'top'; })[0] || rows[0] || null;
    const backoff = rows.filter(function (s) { return s.role === 'backoff' || s.role === 'working'; }).filter(function (s) {
      return !top || s.set !== top.set;
    });
    const working = rows.filter(function (s) { return s.role !== 'warmup'; });
    const week = rows.length ? rows[0].week : null;
    const day = rows.length ? rows[0].day : null;
    return {
      id: week != null && day != null ? ('w' + week + '_d' + day) : null,
      week: week,
      day: day,
      name: rows.length ? rows[0].name : '',
      sets: rows,
      setCount: rows.length,
      volume: rows.reduce(function (a, s) { return a + s.volume; }, 0),
      perSetVolume: rows.map(function (s) { return round1(s.volume); }),
      peakE1: e1s.length ? Math.max.apply(null, e1s) : null,
      avgLoad: mean(working.map(function (s) { return s.loadRaw; })),
      avgReps: mean(working.map(function (s) { return s.reps; })),
      avgRir: mean(rows.map(function (s) { return s.rir; })),
      avgRpe: mean(rows.map(function (s) { return s.rpe; })),
      topSet: top || null,
      topLoad: top ? top.loadRaw : null,
      topReps: top ? top.reps : null,
      topRpe: top && top.rpe != null ? top.rpe : null,
      topRir: top && top.rir != null ? top.rir : null,
      topE1: top && top.e1rm != null ? top.e1rm : null,
      backoffSets: backoff,
      backoffLoad: backoff.length ? mean(backoff.map(function (s) { return s.loadRaw; })) : null,
      backoffVolume: backoff.reduce(function (a, s) { return a + s.volume; }, 0),
      backoffReps: backoff.length ? mean(backoff.map(function (s) { return s.reps; })) : null,
      workingLoad: working.length ? mean(working.map(function (s) { return s.loadRaw; })) : null
    };
  }

  function groupExposures(sets, name) {
    const map = {};
    (sets || []).forEach(function (s) {
      if (name && s.name && !sameExerciseName(s.name, name)) return;
      const k = exposureKey(s);
      if (!map[k]) map[k] = [];
      map[k].push(s);
    });
    return Object.keys(map).sort(function (a, b) {
      const aa = map[a][0];
      const bb = map[b][0];
      return aa.week - bb.week || aa.day - bb.day;
    }).map(function (k) { return summarizeExposure(map[k]); });
  }

  function performanceValueForExposure(exp, kind) {
    if (!exp) return null;
    if (kind === 'topLoad') return exp.topLoad != null ? exp.topLoad : exp.avgLoad;
    if (kind === 'load') return exp.avgLoad != null ? exp.avgLoad : exp.topLoad;
    if (kind === 'reps') return exp.avgReps;
    if (kind === 'e1rm') return exp.peakE1 != null ? exp.peakE1 : exp.topLoad;
    return exp.peakE1 != null ? exp.peakE1 : exp.topLoad;
  }

  function compareExposures(curr, prev) {
    if (!curr || !prev || !curr.setCount || !prev.setCount) {
      return {
        direction: 'insufficient',
        delta: null,
        volumeDelta: null,
        e1Delta: null,
        loadDelta: null,
        repsDelta: null,
        topLoadDelta: null,
        topRepDelta: null,
        score: 0,
        mixed: false,
        efficiency: null,
        confidence: 'LOW',
        kind: 'derived',
        formulaVersion: 'perf-exposure-v1',
        performanceComparisonVersion: 'pic-v1',
        note: 'Servono due esposizioni dello stesso esercizio.'
      };
    }
    const e1Delta = (curr.peakE1 != null && prev.peakE1 != null) ? pctDelta(curr.peakE1, prev.peakE1) : null;
    const loadDelta = (curr.avgLoad != null && prev.avgLoad != null) ? pctDelta(curr.avgLoad, prev.avgLoad) : null;
    const repsDelta = (curr.avgReps != null && prev.avgReps != null) ? pctDelta(curr.avgReps, prev.avgReps) : null;
    const volumeDelta = pctDelta(curr.volume, prev.volume);
    const topLoadDelta = (curr.topLoad != null && prev.topLoad != null) ? pctDelta(curr.topLoad, prev.topLoad) : loadDelta;
    const topRepDelta = (curr.topReps != null && prev.topReps != null) ? round1(curr.topReps - prev.topReps) : null;
    const backoffLoadDelta = (curr.backoffLoad != null && prev.backoffLoad != null) ? pctDelta(curr.backoffLoad, prev.backoffLoad) : null;
    const backoffVolDelta = (curr.backoffVolume > 0 && prev.backoffVolume > 0) ? pctDelta(curr.backoffVolume, prev.backoffVolume) : null;
    const rpeDelta = (curr.avgRpe != null && prev.avgRpe != null) ? round1(curr.avgRpe - prev.avgRpe) : null;
    const rirDelta = (curr.avgRir != null && prev.avgRir != null) ? round1(curr.avgRir - prev.avgRir) : null;
    let score = 0;
    const n = Math.min(curr.sets.length, prev.sets.length);
    for (let i = 0; i < n; i++) {
      const c = curr.sets[i];
      const p = prev.sets[i];
      const loadUp = c.loadRaw > p.loadRaw + 0.4;
      const loadDown = c.loadRaw < p.loadRaw - 0.4;
      const repsUp = c.reps > p.reps;
      const repsDown = c.reps < p.reps;
      const rirEasier = c.rir != null && p.rir != null && c.rir > p.rir + 0.4;
      const rirHarder = c.rir != null && p.rir != null && c.rir < p.rir - 0.4;
      const isTop = c.role === 'top' || p.role === 'top';
      const w = isTop ? 2 : 1;
      if (loadUp) score += 2 * w;
      if (loadDown) score -= 2 * w;
      if (repsUp) score += 1 * w;
      if (repsDown) score -= 1 * w;
      if (!loadDown && !repsDown && rirEasier) score += 1;
      if (!loadUp && !repsUp && rirHarder) score -= 1;
    }
    if (curr.topLoad != null && prev.topLoad != null && curr.topLoad > prev.topLoad + 0.4) score += 3;
    if (curr.topLoad != null && prev.topLoad != null && curr.topLoad < prev.topLoad - 0.4) score -= 3;
    if (topRepDelta != null && topRepDelta > 0) score += 2;
    if (topRepDelta != null && topRepDelta < 0) score -= 2;
    if (e1Delta != null && e1Delta > 1) score += 2;
    if (e1Delta != null && e1Delta < -1) score -= 1;
    if (loadDelta != null && loadDelta > 1) score += 1;
    if (loadDelta != null && loadDelta < -1) score -= 1;
    const outputStable = (topLoadDelta == null || Math.abs(topLoadDelta) < 0.8)
      && (topRepDelta == null || Math.abs(topRepDelta) < 0.5)
      && (e1Delta == null || Math.abs(e1Delta) < 1);
    let efficiency = null;
    if (outputStable && rirDelta != null && rirDelta > 0.4) efficiency = 'improved';
    if (outputStable && rirDelta != null && rirDelta < -0.4) efficiency = 'worsened';
    if (outputStable && rpeDelta != null && rpeDelta < -0.4) efficiency = 'improved';
    if (outputStable && rpeDelta != null && rpeDelta > 0.4) efficiency = 'worsened';
    const mixed = !!(
      topLoadDelta != null && topLoadDelta > 0.4
      && (
        (backoffLoadDelta != null && backoffLoadDelta < -8)
        || (backoffVolDelta != null && backoffVolDelta < -20)
      )
      && (rpeDelta != null && rpeDelta > 0.4)
    );
    let direction = 'stable';
    if (mixed) direction = 'mixed';
    else if (outputStable && efficiency === 'worsened') direction = 'stable';
    else if (outputStable && efficiency === 'improved') direction = 'stable';
    else if (score > 0) direction = 'improving';
    else if (score < 0) direction = 'declining';
    if (!mixed && curr.topLoad != null && prev.topLoad != null && curr.topLoad > prev.topLoad + 0.4
      && (topRepDelta == null || topRepDelta >= 0) && (rpeDelta == null || rpeDelta <= 0.6)) {
      direction = 'improving';
      if (score < 1) score = 1;
    }
    let delta = e1Delta;
    let deltaKind = 'e1rm';
    if (delta == null || (direction === 'improving' && e1Delta != null && e1Delta < 0) || (direction === 'declining' && e1Delta != null && e1Delta > 0)) {
      if (topLoadDelta != null && Math.abs(topLoadDelta) >= 0.5) { delta = topLoadDelta; deltaKind = 'topLoad'; }
      else if (loadDelta != null && Math.abs(loadDelta) >= 0.5) { delta = loadDelta; deltaKind = 'load'; }
      else if (repsDelta != null) { delta = repsDelta; deltaKind = 'reps'; }
    }
    if ((direction === 'stable' || direction === 'mixed') && (delta == null || Math.abs(delta) < 0.8)) delta = delta == null ? 0 : delta;
    const filled = n + (e1Delta != null ? 1 : 0) + (curr.avgRir != null && prev.avgRir != null ? 1 : 0);
    let confidence = filled >= 4 ? 'HIGH' : (filled >= 2 ? 'MEDIUM' : 'LOW');
    if (curr.avgRpe == null || prev.avgRpe == null) confidence = confidence === 'HIGH' ? 'MEDIUM' : 'LOW';
    return {
      direction: direction,
      delta: delta,
      deltaKind: deltaKind,
      volumeDelta: volumeDelta,
      e1Delta: e1Delta,
      loadDelta: loadDelta,
      repsDelta: repsDelta,
      topLoadDelta: topLoadDelta,
      topRepDelta: topRepDelta,
      backoffLoadDelta: backoffLoadDelta,
      backoffVolDelta: backoffVolDelta,
      rpeDelta: rpeDelta,
      rirDelta: rirDelta,
      mixed: mixed,
      efficiency: efficiency,
      score: score,
      confidence: confidence,
      kind: 'derived',
      formulaVersion: 'perf-exposure-v1',
      performanceComparisonVersion: 'pic-v1',
      note: 'Confronto tra esposizioni dello stesso esercizio. Il volume è una metrica separata. Il top set pesa più dei backoff.'
    };
  }

  function multiSessionTrend(exposures) {
    if (!exposures || exposures.length < 3) return { trend: exposures && exposures.length >= 2 ? null : 'insufficient', confidence: 'LOW' };
    const recent = exposures.slice(-4);
    let up = 0;
    let used = 0;
    for (let i = 1; i < recent.length; i++) {
      const c = compareExposures(recent[i], recent[i - 1]);
      if (c.direction === 'insufficient') continue;
      used += 1;
      if (c.direction === 'improving') up += 1;
      else if (c.direction === 'declining') up -= 1;
    }
    if (!used) return { trend: 'insufficient', confidence: 'LOW' };
    let trend = 'stable';
    if (up > 0) trend = 'improving';
    else if (up < 0) trend = 'declining';
    return { trend: trend, confidence: used >= 3 ? 'HIGH' : 'MEDIUM', samples: used };
  }

  function performanceFromSets(sets, name) {
    const exposures = groupExposures(sets, name);
    if (exposures.length < 2) {
      return {
        direction: 'insufficient',
        delta: null,
        volumeDelta: null,
        trend: 'insufficient',
        confidence: 'LOW',
        exposures: exposures.length,
        comparison: null,
        multi: { trend: 'insufficient', confidence: 'LOW' }
      };
    }
    const curr = exposures[exposures.length - 1];
    const prev = exposures[exposures.length - 2];
    const comparison = compareExposures(curr, prev);
    const multi = multiSessionTrend(exposures);
    return {
      direction: comparison.direction,
      delta: comparison.delta,
      volumeDelta: comparison.volumeDelta,
      e1Delta: comparison.e1Delta,
      trend: multi.trend || comparison.direction,
      confidence: comparison.confidence,
      exposures: exposures.length,
      current: curr,
      previous: prev,
      comparison: comparison,
      multi: multi
    };
  }

  function slotLineageStartWeek(store, data, week, day, exIdx) {
    const name = resolveExerciseName(data, store, week, day, exIdx);
    if (!name) return week;
    let start = week;
    for (let w = week - 1; w >= 1; w--) {
      const prev = resolveExerciseName(data, store, w, day, exIdx);
      if (!prev || !sameExerciseName(prev, name)) break;
      start = w;
    }
    return start;
  }

  function setsMatchingLoc(store, data, loc) {
    loc = loc || {};
    const week = Number(loc.week) || 1;
    const day = Number(loc.day) || 0;
    const exIdx = Number(loc.exIdx) || 0;
    const name = resolveExerciseName(data, store, week, day, exIdx);
    const start = slotLineageStartWeek(store, data, week, day, exIdx);
    const all = normalizeSets(store, data, {});
    const matched = all.filter(function (s) {
      return Number(s.week) >= start && Number(s.week) <= week
        && Number(s.day) === day
        && Number(s.exIdx) === exIdx
        && sameExerciseName(s.name, name);
    });
    return { name: name, all: all, matched: matched, week: week, day: day, exIdx: exIdx, lineageStartWeek: start };
  }

  function trendState(delta, dz) {
    if (delta == null || !Number.isFinite(delta)) return 'insufficient';
    if (delta > (dz || 0.8)) return 'rising';
    if (delta < -(dz || 0.8)) return 'falling';
    return 'stable';
  }

  function intraSessionCurve(exposure, referenceE1) {
    const rows = ((exposure && exposure.sets) || []).slice().sort(function (a, b) { return a.set - b.set; });
    const ref = referenceE1 || (exposure && exposure.peakE1);
    const points = rows.map(function (s) {
      return {
        set: s.set,
        role: s.role || 'working',
        load: s.loadRaw,
        reps: s.reps,
        rpe: s.rpe,
        rir: s.rir,
        e1rm: s.e1rm,
        volume: round1(s.volume),
        relativeIntensity: relativeIntensity(s.loadRaw, ref)
      };
    });
    const fat = intraSessionFatigue(rows);
    return {
      points: points,
      decay: { repLoss: fat.repLoss, rpeDrift: fat.rpeDrift, signal: fat.signal },
      formulaVersion: 'pic-v1',
      kind: 'derived'
    };
  }

  function volumeContextFrom(curr, prev, comparison) {
    const delta = comparison ? comparison.volumeDelta : null;
    return {
      totalVolume: curr ? Math.round(curr.volume) : 0,
      previousVolume: prev ? Math.round(prev.volume) : 0,
      volumeDelta: delta,
      volumeTrend: trendState(delta, 2),
      setCount: curr ? curr.setCount : 0,
      totalReps: curr && curr.sets ? curr.sets.reduce(function (a, s) { return a + (s.reps || 0); }, 0) : 0,
      perSetVolume: curr ? curr.perSetVolume : [],
      backoffVolume: curr ? Math.round(curr.backoffVolume || 0) : 0,
      scale: 'exercise',
      unit: 'kg',
      timeScale: 'exposure',
      kind: 'derived',
      formulaVersion: 'tonnage-v1'
    };
  }

  function intensityContextFrom(curr, prev, comparison, referenceE1) {
    const ref = referenceE1 || (curr && curr.peakE1) || (prev && prev.peakE1);
    const topLoad = curr ? curr.topLoad : null;
    const rel = relativeIntensity(topLoad, ref);
    const prevRel = relativeIntensity(prev && prev.topLoad, ref);
    const absDelta = comparison ? comparison.topLoadDelta : null;
    let band = 'insufficient';
    if (rel != null) {
      if (rel >= 85) band = 'high';
      else if (rel >= 70) band = 'moderate';
      else band = 'low';
    } else if (curr && curr.avgRpe != null) {
      band = curr.avgRpe >= 8.5 ? 'high' : (curr.avgRpe >= 7 ? 'moderate' : 'low');
    }
    return {
      absoluteLoad: topLoad,
      previousAbsoluteLoad: prev ? prev.topLoad : null,
      absoluteLoadDelta: absDelta,
      averageWorkingLoad: curr ? curr.workingLoad : null,
      relativeIntensity: rel,
      previousRelativeIntensity: prevRel,
      relativeIntensityDelta: (rel != null && prevRel != null) ? round1(rel - prevRel) : null,
      referenceE1RM: ref,
      referenceKind: 'estimated',
      intensityBand: band,
      intensityTrend: trendState(absDelta, 0.8),
      intensityContextVersion: 'intx-v1',
      scale: 'exercise',
      unit: 'kg / %1RM stimato',
      timeScale: 'exposure',
      kind: 'derived'
    };
  }

  function effortContextFrom(curr, prev, comparison) {
    const rpe = curr && curr.avgRpe != null ? round1(curr.avgRpe) : null;
    const rir = curr && curr.avgRir != null ? round1(curr.avgRir) : null;
    const rpeDelta = comparison ? comparison.rpeDelta : null;
    const rirDelta = comparison ? comparison.rirDelta : null;
    let effortTrend = 'insufficient';
    if (rpeDelta != null || rirDelta != null) {
      if ((rpeDelta != null && Math.abs(rpeDelta) <= 0.4) && (rirDelta == null || Math.abs(rirDelta) <= 0.4)) effortTrend = 'stable';
      else if ((rpeDelta != null && rpeDelta > 0.4) || (rirDelta != null && rirDelta < -0.4)) effortTrend = 'rising';
      else if ((rpeDelta != null && rpeDelta < -0.4) || (rirDelta != null && rirDelta > 0.4)) effortTrend = 'falling';
      else effortTrend = 'stable';
    } else if (rpe != null || rir != null) effortTrend = 'stable';
    return {
      rpe: rpe,
      rir: rir,
      previousRpe: prev && prev.avgRpe != null ? round1(prev.avgRpe) : null,
      previousRir: prev && prev.avgRir != null ? round1(prev.avgRir) : null,
      rpeDelta: rpeDelta,
      rirDelta: rirDelta,
      effortTrend: effortTrend,
      drift: comparison ? comparison.rpeDelta : null,
      effortContextVersion: 'effx-v1',
      note: 'RPE descrive il costo percepito della serie, non la fatica cumulativa.',
      kind: 'derived'
    };
  }

  function performanceContextFrom(comparison, curr, prev, multi) {
    const dir = comparison ? comparison.direction : 'insufficient';
    let state = 'insufficient';
    if (dir === 'improving') state = 'positive';
    else if (dir === 'declining') state = 'negative';
    else if (dir === 'mixed') state = 'mixed';
    else if (dir === 'stable') state = 'neutral';
    return {
      state: state,
      direction: dir,
      delta: comparison ? comparison.delta : null,
      loadPerformance: comparison ? comparison.topLoadDelta : null,
      repPerformance: comparison ? comparison.topRepDelta : null,
      e1rmPerformance: comparison ? comparison.e1Delta : null,
      effortAdjusted: comparison ? comparison.efficiency : null,
      mixed: !!(comparison && comparison.mixed),
      trend: (multi && multi.trend) || dir,
      confidence: comparison ? comparison.confidence : 'LOW',
      performanceComparisonVersion: 'pic-v1',
      kind: 'estimated',
      evidenceLevel: 'ESTIMATED',
      note: 'La prestazione non usa il tonnellaggio come proxy.'
    };
  }

  function doseContextFrom(curr, intensity, effort, contrib) {
    return {
      sets: curr ? curr.setCount : 0,
      volumeLoad: curr ? Math.round(curr.volume) : 0,
      intensityExposure: intensity && intensity.relativeIntensity,
      effort: effort && effort.rpe,
      muscleContribution: contrib || null,
      stimulusEstimate: null,
      fatigueCostEstimate: null,
      doseContextVersion: 'dose-v1',
      kind: 'heuristic',
      evidenceLevel: 'HEURISTIC',
      note: 'Dose ispezionabile. Non è un unico numero fisiologico.'
    };
  }

  function interpretPerformanceContext(pic) {
    pic = pic || {};
    const vol = pic.volume || {};
    const inten = pic.intensity || {};
    const effort = pic.effort || {};
    const perf = pic.performance || {};
    const rec = pic.recovery || {};
    const v = vol.volumeDelta;
    const reasons = [];
    let volumePhrase = 'Il volume non è confrontabile con una esposizione precedente.';
    if (v != null && Math.abs(v) < 2.5) {
      volumePhrase = 'Il volume è rimasto sostanzialmente invariato';
      reasons.push('volume load ≈ (' + (v >= 0 ? '+' : '') + v + '%)');
    } else if (v != null && v > 0) {
      volumePhrase = 'Il volume è aumentato del ' + v + '%';
      reasons.push('volume load +' + v + '%');
    } else if (v != null && v < 0) {
      volumePhrase = 'Il volume è diminuito del ' + Math.abs(v) + '%';
      reasons.push('volume load ' + v + '%');
    }
    const loadUp = inten.absoluteLoadDelta != null && inten.absoluteLoadDelta > 0.4;
    const loadSame = inten.absoluteLoadDelta == null || Math.abs(inten.absoluteLoadDelta) <= 0.8;
    const repsSame = perf.repPerformance == null || Math.abs(perf.repPerformance) < 0.5;
    const effortStable = effort.effortTrend === 'stable';
    const effortUp = effort.effortTrend === 'rising';
    const effortDown = effort.effortTrend === 'falling';
    const recWorse = rec.signal === 'LOW' || rec.estimate === 'high_recent_load';
    if (v != null && v > 2 && perf.state === 'neutral' && effortUp && recWorse) {
      return {
        it: 'Il volume è aumentato, ma la prestazione è rimasta stabile mentre l\'effort è aumentato e i segnali di recupero sono peggiorati. Il sistema considera questo un possibile aumento del costo di allenamento.',
        reasons: reasons
      };
    }
    let mid = '';
    if (loadUp && repsSame && effortStable) {
      mid = 'ma hai aumentato il carico mantenendo le stesse ripetizioni e lo stesso livello di sforzo';
    } else if (loadUp && effortStable) {
      mid = 'ma hai aumentato il carico mantenendo lo stesso livello di sforzo';
    } else if (v != null && v < -2 && loadUp && (perf.state === 'positive')) {
      mid = 'ma hai aumentato il carico e la prestazione è migliorata nonostante meno tonnellaggio';
    } else if (loadSame && repsSame && effortDown) {
      mid = 'a parità di output lo sforzo percepito è diminuito';
    } else if (loadSame && repsSame && effortUp) {
      mid = 'l\'output è simile ma lo sforzo è aumentato';
    } else if (perf.state === 'mixed') {
      mid = 'il top set e i backoff non vanno nella stessa direzione';
    }
    let tail = '';
    if (perf.state === 'positive' && effortStable) {
      tail = 'La risposta prestazionale è quindi positiva.';
    } else if (perf.state === 'positive' && (v != null && v < -2)) {
      tail = 'Non è una regressione: meno volume load con prestazione migliore.';
    } else if (perf.state === 'neutral' && effortUp && recWorse) {
      tail = 'Il sistema considera questo un possibile aumento del costo di allenamento.';
    } else if (perf.state === 'neutral' && perf.effortAdjusted === 'worsened') {
      tail = 'La prestazione è stabile, l\'efficienza è peggiorata.';
    } else if (perf.state === 'neutral' && perf.effortAdjusted === 'improved') {
      tail = 'La prestazione è stabile, l\'efficienza è migliorata.';
    } else if (perf.state === 'mixed') {
      tail = 'Segnale misto: monitorare la prossima esposizione invece di una modifica aggressiva.';
    } else if (perf.state === 'negative') {
      tail = 'La prestazione è in calo rispetto alla precedente esposizione.';
    } else if (perf.state === 'insufficient') {
      tail = 'Servono più esposizioni dello stesso esercizio.';
    }
    const parts = [];
    let text = volumePhrase;
    if (mid) text += ', ' + mid;
    if (tail) text += (mid ? '. ' : '. ') + tail;
    text = text.replace(/\.\s*\./g, '.').replace(/\s+/g, ' ').trim();
    return {
      it: text.charAt(0).toUpperCase() + text.slice(1),
      reasons: reasons
    };
  }

  function evaluatePerformanceContext(snapshot) {
    const snap = snapshot || {};
    const curr = snap.currentExposure;
    const prev = snap.previousExposure;
    const comparison = snap.comparison;
    const vol = snap.volumeContext || volumeContextFrom(curr, prev, comparison);
    const inten = snap.intensityContext || intensityContextFrom(curr, prev, comparison, snap.currentE1RM || snap.previousE1RM);
    const effort = snap.effortContext || effortContextFrom(curr, prev, comparison);
    const perf = snap.performanceContext || performanceContextFrom(comparison, curr, prev, snap.multi);
    const fat = snap.fatigue || {};
    const rec = snap.recovery || {};
    const pack = {
      volume: vol,
      intensity: inten,
      effort: effort,
      performance: perf,
      fatigue: { state: fat.signal || null, scope: fat.scope || 'intra_session' },
      recovery: rec
    };
    const interp = interpretPerformanceContext(pack);
    let overall = 'insufficient';
    if (perf.state === 'insufficient') overall = 'insufficient';
    else if (perf.state === 'mixed') overall = 'mixed';
    else if (perf.state === 'positive' && vol.volumeTrend === 'falling' && inten.intensityTrend === 'rising') overall = 'efficient_exposure';
    else if (perf.state === 'positive' && effort.effortTrend === 'stable') overall = 'positive';
    else if (perf.state === 'positive') overall = 'positive';
    else if (perf.state === 'negative' && (effort.effortTrend === 'rising' || fat.signal === 'high' || fat.signal === 'moderate') && (rec.signal === 'LOW' || rec.estimate === 'high_recent_load')) overall = 'fatigue_accumulation';
    else if (perf.state === 'negative') overall = 'monitor';
    else if (perf.state === 'neutral' && effort.effortTrend === 'rising' && (vol.volumeTrend === 'rising')) overall = 'fatigue_accumulation';
    else if (perf.state === 'neutral') overall = 'stable';
    const volUpHigh = vol.volumeDelta != null && vol.volumeDelta > 12;
    if (volUpHigh && perf.state === 'positive' && effort.effortTrend === 'stable') overall = 'positive';
    const sessionQuality = {
      signal: overall,
      kind: 'heuristic',
      evidenceLevel: 'HEURISTIC',
      formulaVersion: 'sq-v1',
      note: 'Segnale interno di qualità della seduta. Non è una misura fisiologica ufficiale.'
    };
    return {
      volumeState: vol.volumeTrend,
      intensityState: inten.intensityTrend,
      effortState: effort.effortTrend,
      performanceState: perf.state,
      fatigueState: fat.signal || null,
      overallSignal: overall,
      confidence: perf.confidence || snap.confidence || 'LOW',
      reasons: interp.reasons.concat([
        'top load ' + (curr && curr.topLoad != null ? curr.topLoad + ' kg' : '—'),
        'top reps ' + (curr && curr.topReps != null ? curr.topReps : '—')
      ]),
      interpretation: interp.it,
      sessionQuality: sessionQuality,
      volume: vol,
      intensity: inten,
      effort: effort,
      performance: perf,
      formulaVersion: 'pic-v1',
      performanceComparisonVersion: 'pic-v1',
      intensityContextVersion: 'intx-v1',
      effortContextVersion: 'effx-v1',
      doseContextVersion: 'dose-v1',
      kind: 'estimated'
    };
  }

  function attachPerformanceIntensityLayer(snap, extras) {
    extras = extras || {};
    const curr = snap.currentExposure;
    const prev = snap.previousExposure;
    const comparison = snap.comparison;
    snap.volumeContext = volumeContextFrom(curr, prev, comparison);
    snap.intensityContext = intensityContextFrom(curr, prev, comparison, snap.currentE1RM || snap.previousE1RM);
    snap.effortContext = effortContextFrom(curr, prev, comparison);
    snap.performanceContext = performanceContextFrom(comparison, curr, prev, snap.multi);
    snap.doseContext = doseContextFrom(curr, snap.intensityContext, snap.effortContext, extras.contrib);
    snap.performanceCurve = intraSessionCurve(curr, snap.currentE1RM);
    const bestE1s = (extras.exposures || []).map(function (e) { return e.peakE1; }).filter(function (n) { return n != null; });
    snap.bestE1RM = bestE1s.length ? Math.max.apply(null, bestE1s) : snap.currentE1RM;
    snap.e1rmKind = 'estimated';
    snap.intensityDelta = snap.intensityContext.absoluteLoadDelta;
    snap.effortTrend = snap.effortContext.effortTrend;
    const pic = evaluatePerformanceContext(snap);
    snap.pic = pic;
    snap.explanationIt = pic.interpretation;
    snap.performanceState = pic.performanceState;
    snap.overallSignal = pic.overallSignal;
    snap.sessionQuality = pic.sessionQuality;
    snap.performanceComparisonVersion = 'pic-v1';
    snap.intensityContextVersion = 'intx-v1';
    snap.effortContextVersion = 'effx-v1';
    snap.doseContextVersion = 'dose-v1';
    return snap;
  }

  function exerciseAnalyticsSnapshot(store, data, loc) {
    loc = loc || {};
    const pack = setsMatchingLoc(store, data, loc);
    const week = pack.week;
    const day = pack.day;
    const exIdx = pack.exIdx;
    const setN = Number(loc.set) || 1;
    const today = pack.matched.filter(function (s) { return s.week === week && s.day === day; });
    const currentSet = today.find(function (s) { return s.set === setN; }) || today[today.length - 1] || null;
    const exposures = groupExposures(pack.matched, pack.name);
    let currExp = exposures.filter(function (e) { return e.week === week && e.day === day; })[0];
    if (!currExp && today.length) currExp = summarizeExposure(today);
    const prevExps = exposures.filter(function (e) {
      return e.week < week || (e.week === week && e.day < day);
    });
    const prevExp = prevExps.length ? prevExps[prevExps.length - 1] : null;
    const usedCompletedPair = false;
    const compareCurr = currExp || null;
    const comparePrev = currExp ? prevExp : null;
    const comparison = (compareCurr && comparePrev) ? compareExposures(compareCurr, comparePrev) : null;
    const currentFinalized = sessionFinalized(store, week, day);
    const volumeComparable = !!(comparison && compareCurr && comparePrev && (
      currentFinalized || compareCurr.setCount >= comparePrev.setCount
    ));
    if (comparison && !volumeComparable) {
      comparison.volumeDelta = null;
      comparison.volumeComparable = false;
      comparison.volumeNote = 'Seduta in corso: il volume non è ancora confrontabile con la precedente.';
    } else if (comparison) {
      comparison.volumeComparable = true;
    }
    const multi = multiSessionTrend(exposures);
    const fatigueRows = today.length ? today : ((currExp && currExp.sets) || []);
    const fatigue = intraSessionFatigue(fatigueRows);
    fatigue.scope = 'intra_session';
    fatigue.labelIt = 'Fatica durante questa seduta';
    const recBuckets = trainingBuckets(pack.matched, Math.max(week, 4));
    const recov = recoveryFromStore(store, recBuckets);
    recov.scope = 'recent';
    recov.labelIt = 'Recupero recente';
    const locEk = 'w' + week + '_d' + day + '_e' + exIdx;
    const storedRec = storedMuscleRecord(store, pack.name, locEk);
    const contrib = muscleContributionForExercise(pack.name, Object.assign({}, exerciseMeta(data, store, week, day, exIdx), {
      storedMuscle: storedRec && storedRec.muscle,
      storedSource: storedRec && storedRec.source
    }));
    const primary = (contrib.primary && contrib.primary[0]) || null;
    let lm = landmarksFor(store, primary || 'GENERALE', null, { scale: primary ? 'muscle' : 'global' });
    if (primary) {
      const muscleSets = normalizeSets(store, data, { muscle: primary });
      const weekCount = muscleSets.filter(function (s) { return s.week === week; }).length;
      lm = landmarksFor(store, primary, weekCount, { scale: 'muscle' });
    }
    const empty = !currentSet && !prevExp && !currExp;
    const peakE1 = currExp ? currExp.peakE1 : (compareCurr && compareCurr.peakE1);
    const prevPeak = comparePrev ? comparePrev.peakE1 : null;
    const lastLoad = (currExp && currExp.topLoad) || (compareCurr && compareCurr.topLoad) || (currentSet && currentSet.loadRaw) || (prevExp && prevExp.topLoad) || null;
    const statusMap = { improving: 'Prestazione in miglioramento', declining: 'Prestazione in calo', stable: 'Prestazione stabile', mixed: 'Prestazione mista', insufficient: 'Dati insufficienti' };
    const direction = comparison ? comparison.direction : 'insufficient';
    const bestSrc = (currExp && currExp.sets) || today;
    const bestSet = bestSrc.slice().sort(function (a, b) { return (b.e1rm || 0) - (a.e1rm || 0); })[0];
    const intensityRef = prevPeak || peakE1;
    const snapObj = {
      empty: empty,
      kind: 'derived',
      formulaVersion: 'snap-v1',
      exerciseId: pack.name,
      name: pack.name,
      week: week,
      day: day,
      exIdx: exIdx,
      set: currentSet ? (currentSet.set || setN) : setN,
      currentExposure: currExp,
      previousExposure: comparePrev,
      currentExposureId: currExp && currExp.id ? currExp.id : null,
      previousExposureId: comparePrev && comparePrev.id ? comparePrev.id : null,
      exposureSequence: exposures.map(function (e, i) {
        return { index: i + 1, id: e.id, week: e.week, day: e.day, setCount: e.setCount, topLoad: e.topLoad, volume: Math.round(e.volume), peakE1: e.peakE1 };
      }),
      currentVolume: currExp ? Math.round(currExp.volume) : 0,
      previousVolume: comparePrev ? Math.round(comparePrev.volume) : 0,
      currentPerformance: performanceValueForExposure(compareCurr, comparison && comparison.deltaKind),
      previousPerformance: performanceValueForExposure(comparePrev, comparison && comparison.deltaKind),
      performanceMetric: comparison ? (comparison.deltaKind || null) : null,
      volumeDelta: comparison ? comparison.volumeDelta : null,
      volumeDeltaPct: comparison ? comparison.volumeDelta : null,
      volumeComparable: comparison ? comparison.volumeComparable !== false : null,
      performanceDeltaPct: comparison ? comparison.delta : null,
      currentE1RM: peakE1,
      lastSetE1RM: currentSet && currentSet.e1rm != null ? currentSet.e1rm : null,
      previousE1RM: prevPeak,
      e1rmDelta: comparison ? comparison.e1Delta : null,
      e1rmDeltaPct: comparison ? comparison.e1Delta : null,
      currentRPE: currExp && currExp.avgRpe != null ? round1(currExp.avgRpe) : (currentSet && currentSet.rpe),
      previousRPE: comparePrev && comparePrev.avgRpe != null ? round1(comparePrev.avgRpe) : null,
      currentRIR: currExp && currExp.avgRir != null ? round1(currExp.avgRir) : (currentSet && currentSet.rir),
      previousRIR: comparePrev && comparePrev.avgRir != null ? round1(comparePrev.avgRir) : null,
      currentLoad: currentSet ? currentSet.loadRaw : lastLoad,
      currentReps: currentSet ? currentSet.reps : (currExp && currExp.avgReps),
      lastLoad: lastLoad,
      relativeIntensity: currentSet ? relativeIntensity(currentSet.loadRaw, intensityRef) : (currExp ? relativeIntensity(currExp.topLoad, intensityRef) : null),
      volumeSet: currentSet ? currentSet.volume : 0,
      performanceDelta: comparison ? comparison.delta : null,
      source: 'exerciseAnalyticsSnapshot',
      performanceDirection: direction,
      comparison: comparison,
      multiTrend: multi.trend || direction,
      multi: multi,
      confidence: comparison ? comparison.confidence : 'LOW',
      fatigue: fatigue,
      recovery: recov,
      landmarks: lm,
      exposures: exposures.length,
      usedPreviousPair: !!usedCompletedPair,
      noCurrentSets: !currentSet,
      currentSet: currentSet,
      todaySets: today,
      status: statusMap[direction] || 'Dati insufficienti',
      bestSet: bestSet ? (bestSet.loadRaw + ' × ' + bestSet.reps) : null,
      scale: 'exercise',
      unit: 'kg / % vs previous exposure',
      recommendationContext: {
        previousExposure: comparePrev,
        currentExposure: compareCurr,
        performanceDelta: comparison ? comparison.delta : null,
        volumeDelta: comparison ? comparison.volumeDelta : null,
        e1rmDelta: comparison ? comparison.e1Delta : null,
        fatigueSignal: fatigue && fatigue.signal,
        recoverySignal: recov && (recov.signal || recov.estimate),
        multiTrend: multi.trend || direction
      },
      performanceContract: { scope: 'exercise', metric: 'performance', period: 'exposure', unit: '% vs previous exposure' },
      volumeContract: { scope: 'exercise', metric: 'volume_load', period: 'exposure', unit: 'kg' },
      intensityContract: { scope: 'exercise', metric: 'relative_intensity', period: 'exposure', unit: '% e1RM esercizio' },
      note: !currExp
        ? 'Nessuna esposizione valida oggi: i delta vs precedente restano vuoti finché non c’è almeno un set eseguito.'
        : (!volumeComparable
          ? 'Seduta in corso: la prestazione usa le serie già fatte, il volume vs precedente resta vuoto finché la seduta non è completa.'
          : 'Confronto tra questa esposizione e la precedente dello stesso esercizio.')
    };
    snapObj.performanceContract.current = snapObj.currentPerformance;
    snapObj.performanceContract.previous = snapObj.previousPerformance;
    snapObj.volumeContract.current = snapObj.currentVolume;
    snapObj.volumeContract.previous = snapObj.previousVolume;
    const layered = attachPerformanceIntensityLayer(snapObj, { exposures: exposures, contrib: contrib });
    layered.intensityState = layered.pic && layered.pic.intensityState;
    layered.effortState = layered.pic && layered.pic.effortState;
    layered.fatigueState = layered.fatigue && layered.fatigue.signal;
    layered.recoveryState = layered.recovery && (layered.recovery.signal || layered.recovery.estimate);
    layered.adaptationState = layered.pic && layered.pic.overallSignal;
    if (store && store.prefs && store.prefs.debugAnalytics) {
      const tr = debugExerciseTrace(layered, null);
      if (typeof console !== 'undefined' && console.info) console.info('[TRAINING-INTEL-TRACE]', tr);
    }
    return layered;
  }

  function buildExerciseAnalyticsSnapshot(store, data, loc) {
    return exerciseAnalyticsSnapshot(store, data, loc);
  }

  function isRecommendationEligible(snapshot) {
    const snap = snapshot || {};
    if (snap.empty && snap.exposures < 1) {
      return { eligible: false, reason: 'Nessun set confrontabile per questo esercizio.', recommendedWeight: null };
    }
    if (snap.lastLoad == null) {
      return { eligible: false, reason: 'Manca un carico registrato.', recommendedWeight: null };
    }
    if (!snap.currentExposure && snap.exposures < 1) {
      return { eligible: false, reason: 'Serve almeno una esposizione eseguita dello stesso esercizio.', recommendedWeight: null };
    }
    if (!snap.comparison && snap.exposures < 2 && !snap.previousExposure && !snap.currentExposure) {
      return { eligible: false, reason: 'Non ci sono abbastanza dati per una stima affidabile. Serve almeno una esposizione precedente dello stesso esercizio.', recommendedWeight: null };
    }
    if (!snap.currentExposure && snap.lastLoad != null) {
      return { eligible: true, reason: 'Baseline dalla ultima esposizione eseguita. I delta di oggi restano vuoti.', recommendedWeight: snap.lastLoad, baselineOnly: true };
    }
    if (snap.exposures < 2 && !snap.comparison) {
      return { eligible: true, reason: 'Una sola esposizione: raccomandazione conservativa, senza confronto vs precedente.', recommendedWeight: snap.lastLoad, baselineOnly: true };
    }
    return { eligible: true, reason: 'Due esposizioni confrontabili dello stesso esercizio.', recommendedWeight: snap.lastLoad };
  }

  function debugExerciseTrace(snap, reco) {
    const s = snap || {};
    const curr = s.currentExposure || {};
    const prev = s.previousExposure || {};
    return {
      tag: 'TRAINING-INTEL-TRACE',
      exercise: s.name,
      exerciseId: s.exerciseId,
      currentExposure: curr.id || s.currentExposureId || null,
      previousExposure: prev.id || s.previousExposureId || null,
      exposureSequence: s.exposureSequence || [],
      currentSets: (curr.sets || []).map(function (row) { return { set: row.set, load: row.loadRaw, reps: row.reps, rir: row.rir, rpe: row.rpe }; }),
      previousSets: (prev.sets || []).map(function (row) { return { set: row.set, load: row.loadRaw, reps: row.reps, rir: row.rir, rpe: row.rpe }; }),
      currentVolume: s.currentVolume,
      previousVolume: s.previousVolume,
      currentPerformance: s.currentPerformance,
      previousPerformance: s.previousPerformance,
      currentE1RM: s.currentE1RM,
      previousE1RM: s.previousE1RM,
      currentRPE: s.currentRPE,
      previousRPE: s.previousRPE,
      currentRIR: s.currentRIR,
      previousRIR: s.previousRIR,
      performanceDelta: s.performanceDelta,
      performanceDeltaPct: s.performanceDeltaPct != null ? s.performanceDeltaPct : s.performanceDelta,
      volumeDelta: s.volumeDelta,
      volumeDeltaPct: s.volumeDeltaPct != null ? s.volumeDeltaPct : s.volumeDelta,
      e1rmDeltaPct: s.e1rmDeltaPct != null ? s.e1rmDeltaPct : s.e1rmDelta,
      performanceState: s.performanceState,
      intensityState: s.intensityState,
      effortState: s.effortState,
      fatigueState: s.fatigueState || (s.fatigue && s.fatigue.signal),
      recoveryState: s.recoveryState || (s.recovery && (s.recovery.signal || s.recovery.estimate)),
      adaptationState: s.adaptationState,
      recommendation: reco ? reco.action : null,
      recommendationTarget: reco ? reco.suggestedLoad : null,
      recommendationPerformanceDelta: reco ? reco.performanceDelta : null,
      recommendationVolumeDelta: reco ? reco.volumeDelta : null,
      confidence: s.confidence,
      source: s.source || 'exerciseAnalyticsSnapshot',
      formulaVersion: s.formulaVersion,
      eligibility: reco && reco.eligibility ? reco.eligibility : isRecommendationEligible(s)
    };
  }

  function evaluateExerciseState(snapshot) {
    const snap = snapshot || {};
    const pic = snap.pic || evaluatePerformanceContext(snap);
    const direction = snap.performanceDirection || 'insufficient';
    const lastLoad = snap.lastLoad;
    const fat = snap.fatigue && snap.fatigue.signal;
    const recSig = snap.recovery && (snap.recovery.signal || snap.recovery.estimate);
    const rpe = snap.currentRPE;
    const rpeHigh = rpe != null && rpe >= 9;
    const perfState = pic.performanceState || snap.performanceState;
    const improving = direction === 'improving' || perfState === 'positive';
    const declining = direction === 'declining' || perfState === 'negative';
    const mixed = direction === 'mixed' || perfState === 'mixed';
    const repeatedNeg = snap.multiTrend === 'declining' && declining;
    const lm = snap.landmarks || {};
    const eligibility = isRecommendationEligible(snap);
    const mrvCmp = lm.comparable
      ? assertComparableMetric(
        { scope: 'muscle', unit: 'sets/week', period: 'week' },
        { scope: lm.scale || 'muscle', unit: 'sets/week', period: 'week' },
        'MRV'
      )
      : { ok: false, reason: 'not comparable' };
    const aboveMrv = !!(lm.comparable && mrvCmp.ok && lm.currentSets != null && lm.MRV != null && lm.currentSets >= lm.MRV);
    const evidence = [];
    if (snap.performanceDelta != null) evidence.push('Prestazione vs precedente ' + (snap.performanceDelta >= 0 ? '+' : '') + snap.performanceDelta + '%');
    if (snap.intensityDelta != null) evidence.push('Intensità vs precedente ' + (snap.intensityDelta >= 0 ? '+' : '') + snap.intensityDelta + '%');
    if (snap.volumeDelta != null) evidence.push('Volume vs precedente ' + (snap.volumeDelta >= 0 ? '+' : '') + snap.volumeDelta + '%');
    if (rpe != null) evidence.push('RPE medio ' + rpe);
    if (fat) evidence.push(humanState('fatigue', fat) + ' (durante questa seduta)');
    if (recSig) evidence.push(humanState('recovery', recSig) + ' (recente)');
    if (aboveMrv) evidence.push('Serie del distretto ≥ MRV stimata (' + lm.currentSets + ' vs ~' + lm.MRV + ' serie)');
    const base = {
      action: 'insufficient',
      suggestedLoad: lastLoad != null ? round1(lastLoad) : null,
      deltaKg: 0,
      why: snap.exposures < 2
        ? 'Non ci sono abbastanza dati per una stima affidabile. Serve almeno una esposizione precedente dello stesso esercizio.'
        : 'Dati insufficienti per una raccomandazione affidabile.',
      evidence: evidence,
      signalsUsed: ['snapshot', 'performanceContext', 'intensityContext', 'effortContext', 'fatigue', 'recovery'],
      confidence: snap.confidence || 'LOW',
      kind: 'heuristic',
      formulaVersion: 'reco-snap-v1',
      recommendationVersion: 'reco-pic-v1',
      evidenceLevel: 'HEURISTIC',
      name: snap.name,
      mrvNote: null,
      week: snap.week,
      day: snap.day,
      exIdx: snap.exIdx,
      performanceDelta: snap.performanceDelta,
      volumeDelta: snap.volumeDelta,
      intensityDelta: snap.intensityDelta,
      e1rmDelta: snap.e1rmDelta,
      fatigueSignal: fat || null,
      recoverySignal: recSig || null,
      performanceDirection: direction,
      performanceState: perfState || null,
      overallSignal: pic.overallSignal,
      multiTrend: snap.multiTrend,
      advisable: false,
      pic: pic,
      eligibility: eligibility,
      currentExposureId: snap.currentExposureId || null,
      previousExposureId: snap.previousExposureId || null,
      fatigueState: fat || null,
      recoveryState: recSig || null,
      intensityState: pic.intensityState || null,
      effortState: pic.effortState || null,
      adaptationState: pic.overallSignal || null,
      recommendationAction: 'insufficient',
      targetWeight: lastLoad != null ? round1(lastLoad) : null,
      targetReps: snap.currentReps != null ? snap.currentReps : null,
      targetSets: snap.currentExposure && snap.currentExposure.setCount ? snap.currentExposure.setCount : null,
      reasons: evidence,
      basedOn: {
        source: snap.source || 'exerciseAnalyticsSnapshot',
        currentExposureId: snap.currentExposureId || null,
        previousExposureId: snap.previousExposureId || null,
        performanceDelta: snap.performanceDelta,
        volumeDelta: snap.volumeDelta,
        e1rmDelta: snap.e1rmDelta,
        fatigueState: fat || null,
        recoveryState: recSig || null,
        formulaVersion: snap.formulaVersion || 'snap-v1'
      }
    };
    if (snap.empty || snap.exposures < 1 || lastLoad == null) {
      if (lastLoad == null) base.why = 'Non ci sono abbastanza dati per una stima affidabile. Manca un carico registrato.';
      return base;
    }
    if (snap.exposures < 2 && !snap.comparison) {
      const sameDay = snap.currentExposure && snap.currentExposure.week === snap.week && snap.currentExposure.day === snap.day;
      if (sameDay) return base;
      return Object.assign({}, base, {
        action: 'maintain',
        recommendationAction: 'maintain',
        suggestedLoad: round1(lastLoad),
        targetWeight: round1(lastLoad),
        why: 'Baseline dalla prima esposizione. Mantieni il carico attuale; dopo la seconda seduta la stima diventa più precisa.',
        evidence: ['Una sola esposizione precedente'],
        confidence: 'LOW',
        advisable: false
      });
    }
    let action = 'maintain';
    let delta = 0;
    let why = pic.interpretation || 'Prestazione stabile: mantieni il carico attuale.';
    let conf = snap.confidence || 'MEDIUM';
    let mrvNote = null;
    let advisable = true;
    if (mixed) {
      action = 'monitor';
      why = pic.interpretation || 'Segnale misto tra top set e backoff. Mantieni e monitora.';
      advisable = false;
    } else if (pic.overallSignal === 'efficient_exposure') {
      action = (rpeHigh || fat === 'high') ? 'maintain' : 'increase';
      delta = action === 'increase' ? (lastLoad < 20 ? 1 : 2.5) : 0;
      why = pic.interpretation || 'Prestazione migliorata con meno volume load. Non è una regressione.';
    } else if ((improving || pic.overallSignal === 'positive') && !rpeHigh && fat !== 'high') {
      action = 'increase';
      delta = lastLoad < 20 ? 1 : 2.5;
      why = pic.interpretation || 'La prestazione è migliorata rispetto all\'ultima esposizione e lo sforzo è nella fascia. Suggerimento, non modifica automatica.';
      if (aboveMrv) {
        mrvNote = 'La stima di MRV potrebbe essere conservativa. Continuare a monitorare.';
        why += ' Volume del distretto sopra la MRV stimata ma la risposta resta positiva.';
      }
    } else if ((improving || pic.overallSignal === 'positive') && rpeHigh) {
      action = 'maintain';
      why = pic.interpretation || 'La prestazione è migliorata, ma lo sforzo è elevato. Conserviamo il carico e verifichiamo la prossima esposizione.';
    } else if (pic.overallSignal === 'fatigue_accumulation' || (declining && repeatedNeg && (fat === 'high' || fat === 'moderate') && (recSig === 'LOW' || recSig === 'high_recent_load' || rpeHigh))) {
      const volumeUp = snap.volumeDelta != null && snap.volumeDelta > 3;
      if (volumeUp) {
        action = 'reduce_volume';
        why = pic.interpretation || 'Calo ripetuto di prestazione con volume in aumento e fatica intra-seduta. Valuta di togliere 1–2 serie di lavoro. Non è una diagnosi.';
      } else {
        action = 'reduce_load';
        delta = lastLoad < 20 ? -1 : -2.5;
        why = pic.interpretation || 'Calo ripetuto con sforzo alto e fatica intra-seduta. Valuta di ridurre il carico. Non è una diagnosi.';
      }
    } else if (declining) {
      action = 'monitor';
      why = pic.interpretation || 'Una singola esposizione in calo non basta per ridurre. Mantieni il carico e monitora la prossima seduta.';
      advisable = false;
    } else if (aboveMrv && improving) {
      mrvNote = 'La stima di MRV potrebbe essere conservativa. Continuare a monitorare.';
      why = pic.interpretation || 'La risposta prestazionale resta positiva nonostante il volume sopra la stima attuale del MRV.';
    } else if (!improving && rpeHigh && fat !== 'high') {
      action = 'maintain';
      why = pic.interpretation || 'Sforzo alto con prestazione non in calo: mantieni il carico e monitora il recupero.';
    }
    return Object.assign({}, base, {
      action: action,
      recommendationAction: action,
      suggestedLoad: round1(lastLoad + delta),
      targetWeight: round1(lastLoad + delta),
      deltaKg: delta,
      why: why,
      confidence: conf,
      mrvNote: mrvNote,
      advisable: advisable,
      landmarks: lm
    });
  }

  function analyzeExercise(store, data, name, opts) {
    const useSets = setsForExercise(store, data, name, opts);
    if (!useSets.length) return { name: name, empty: true, e1rm: null, note: 'Dati insufficienti', kind: 'derived' };
    const exposures = groupExposures(useSets, name);
    const last = exposures.length ? exposures[exposures.length - 1] : summarizeExposure(useSets);
    const loc = {
      week: last.week,
      day: last.day,
      exIdx: (last.sets && last.sets[0] && last.sets[0].exIdx) || 0,
      set: last.setCount || 1
    };
    const snap = exerciseAnalyticsSnapshot(store, data, loc);
    const currentExp = snap.currentExposure || last;
    const today = currentExp.sets || [];
    return {
      name: name,
      empty: false,
      snapshot: snap,
      currentExposureId: snap.currentExposureId,
      previousExposureId: snap.previousExposureId,
      sets: useSets.length,
      volume: Math.round(useSets.reduce(function (a, s) { return a + s.volume; }, 0)),
      avgLoad: mean(useSets.map(function (s) { return s.loadRaw; })),
      avgRpe: mean(useSets.map(function (s) { return s.rpe; })),
      avgRir: mean(useSets.map(function (s) { return s.rir; })),
      e1rm: snap.currentE1RM,
      e1rmBest: useSets.reduce(function (m, s) { return (s.e1rm != null && (m == null || s.e1rm > m)) ? s.e1rm : m; }, null),
      e5rm: estimatedNrm(snap.currentE1RM, 5),
      e8rm: estimatedNrm(snap.currentE1RM, 8),
      e10rm: estimatedNrm(snap.currentE1RM, 10),
      trend: snap.performanceDelta,
      direction: snap.performanceDirection,
      multiTrend: snap.multiTrend,
      confidence: snap.confidence,
      volumeVsPrevious: snap.volumeDelta,
      performance: snap.comparison,
      performanceDelta: snap.performanceDelta,
      prStatus: (snap.currentE1RM != null && snap.previousE1RM != null && snap.currentE1RM > snap.previousE1RM) ? 'new_estimated_pr' : null,
      intensityDist: intensityDistribution(useSets),
      fatigue: snap.fatigue || intraSessionFatigue(today),
      kind: 'derived',
      formulaVersion: FORMULA_VERSION
    };
  }

  function liveAfterSet(store, data, loc, snapOpt) {
    const snap = snapOpt || exerciseAnalyticsSnapshot(store, data, loc);
    if (snap.empty) {
      return { empty: true, note: 'Dati insufficienti', kind: 'derived', formulaVersion: FORMULA_VERSION, name: snap.name, snapshot: snap };
    }
    return {
      empty: false,
      snapshot: snap,
      name: snap.name,
      week: snap.week,
      day: snap.day,
      exIdx: snap.exIdx,
      set: snap.set,
      load: snap.currentLoad,
      reps: snap.currentReps,
      rpe: snap.currentSet ? snap.currentSet.rpe : snap.currentRPE,
      rir: snap.currentSet ? snap.currentSet.rir : snap.currentRIR,
      e1rm: snap.currentE1RM,
      lastSetE1RM: snap.lastSetE1RM,
      relativeIntensity: snap.relativeIntensity,
      intensityDelta: snap.intensityDelta,
      intensityBand: snap.intensityContext && snap.intensityContext.intensityBand,
      volumeSet: snap.volumeSet,
      volumeToday: snap.currentVolume,
      vsPreviousBest: snap.performanceDelta,
      vsPreviousExposure: snap.performanceDelta,
      vsLastSessionVolume: snap.volumeDelta,
      volumeVsPrevious: snap.volumeDelta,
      direction: snap.performanceDirection,
      performanceState: snap.performanceState,
      trend: snap.multiTrend,
      confidence: snap.confidence,
      performance: snap.comparison,
      explanationIt: snap.explanationIt,
      effortTrend: snap.effortTrend,
      noCurrentSets: snap.noCurrentSets,
      fatigue: snap.fatigue,
      recovery: snap.recovery,
      pic: snap.pic,
      kind: 'derived',
      formulaVersion: FORMULA_VERSION
    };
  }

  function exerciseReport(store, data, loc, snapOpt) {
    const snap = snapOpt || exerciseAnalyticsSnapshot(store, data, loc);
    const live = liveAfterSet(store, data, loc, snap);
    if (snap.empty) {
      return Object.assign({}, live, {
        empty: true,
        report: true,
        status: 'Dati insufficienti',
        direction: 'insufficient',
        volumeChange: null,
        e1rmChange: null,
        snapshot: snap,
        kind: 'derived'
      });
    }
    return Object.assign({}, live, {
      empty: false,
      report: true,
      snapshot: snap,
      volumeToday: snap.currentVolume,
      bestSet: snap.bestSet,
      e1rmToday: snap.currentE1RM,
      e1rmPrev: snap.previousE1RM,
      e1rmChange: snap.e1rmDelta,
      volumeChange: snap.volumeDelta,
      avgRpe: snap.currentRPE,
      status: snap.status,
      direction: snap.performanceDirection,
      trend: snap.multiTrend,
      confidence: snap.confidence,
      lastLoad: snap.lastLoad,
      exposures: snap.exposures,
      usedPreviousExposure: snap.usedPreviousPair,
      performance: snap.comparison,
      kind: 'derived'
    });
  }

  function recommendNext(store, data, loc, snapOpt) {
    const snap = snapOpt || exerciseAnalyticsSnapshot(store, data, loc);
    const decision = evaluateExerciseState(snap);
    const eligibility = decision.eligibility || isRecommendationEligible(snap);
    if (store && store.prefs && store.prefs.debugAnalytics) {
      const tr = debugExerciseTrace(snap, Object.assign({}, decision, { eligibility: eligibility }));
      if (typeof console !== 'undefined' && console.info) {
        console.info('[RECOMMENDATION TRACE]', {
          exerciseId: snap.exerciseId,
          exerciseSource: snap.name,
          historyCount: snap.exposures,
          previousExposure: snap.previousExposureId,
          currentExposure: snap.currentExposureId,
          currentE1RM: snap.currentE1RM,
          previousE1RM: snap.previousE1RM,
          performanceState: snap.performanceState,
          recommendationEligibility: eligibility.eligible,
          eligibilityReason: eligibility.reason,
          recommendedWeight: decision.suggestedLoad
        }, tr);
      }
    }
    return Object.assign({}, decision, {
      snapshot: snap,
      usedPreviousExposure: !!snap.usedPreviousPair,
      eligibility: eligibility,
      currentExposureId: snap.currentExposureId,
      previousExposureId: snap.previousExposureId,
      fatigueState: decision.fatigueState || snap.fatigueState || (snap.fatigue && snap.fatigue.signal) || null,
      recoveryState: decision.recoveryState || snap.recoveryState || (snap.recovery && (snap.recovery.signal || snap.recovery.estimate)) || null,
      adaptationState: decision.adaptationState || snap.adaptationState || null,
      basedOn: decision.basedOn || {
        source: snap.source || 'exerciseAnalyticsSnapshot',
        currentExposureId: snap.currentExposureId || null,
        previousExposureId: snap.previousExposureId || null,
        performanceDelta: snap.performanceDelta,
        volumeDelta: snap.volumeDelta,
        fatigueState: snap.fatigueState || (snap.fatigue && snap.fatigue.signal) || null,
        recoveryState: snap.recoveryState || (snap.recovery && (snap.recovery.signal || snap.recovery.estimate)) || null
      }
    });
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
    const all = normalizeSets(store, data, {});
    const today = all.filter(function (s) { return s.week === week && s.day === day; });
    const prev = all.filter(function (s) { return s.week < week || (s.week === week && s.day < day); });
    const lastKey = prev.length ? (prev[prev.length - 1].week + '_' + prev[prev.length - 1].day) : null;
    const last = lastKey ? prev.filter(function (s) { return (s.week + '_' + s.day) === lastKey; }) : [];
    const vol = today.reduce(function (a, s) { return a + s.volume; }, 0);
    const lastVol = last.reduce(function (a, s) { return a + s.volume; }, 0);
    const setsChange = last.length ? pctDelta(today.length, last.length) : null;
    const names = [];
    today.forEach(function (s) {
      if (s.name && names.indexOf(s.name) < 0) names.push(s.name);
    });
    const dirs = [];
    const deltas = [];
    names.forEach(function (name) {
      const row = today.find(function (s) { return sameExerciseName(s.name, name); });
      const snap = exerciseAnalyticsSnapshot(store, data, {
        week: week,
        day: day,
        exIdx: row ? row.exIdx : 0,
        set: 1
      });
      if (snap.performanceDirection === 'insufficient') return;
      dirs.push(snap.performanceDirection);
      if (snap.performanceDelta != null) deltas.push(snap.performanceDelta);
    });
    let direction = 'insufficient';
    if (dirs.length) {
      const up = dirs.filter(function (d) { return d === 'improving'; }).length;
      const down = dirs.filter(function (d) { return d === 'declining'; }).length;
      if (up && !down) direction = 'improving';
      else if (down && !up) direction = 'declining';
      else if (!up && !down) direction = 'stable';
      else direction = 'mixed';
    }
    const perf = deltas.length ? round1(deltas.reduce(function (a, n) { return a + n; }, 0) / deltas.length) : null;
    const buckets = trainingBuckets(all, Math.max(week, 4));
    const rec = recoveryFromStore(store, buckets);
    const e1Proxy = direction === 'improving' ? (perf != null ? Math.max(perf, 2.1) : 2.1)
      : (direction === 'declining' ? (perf != null ? Math.min(perf, -2.1) : -2.1)
        : (direction === 'stable' ? 0 : null));
    return {
      volume: Math.round(vol),
      sets: today.length,
      avgRpe: mean(today.map(function (s) { return s.rpe; })),
      volumeChange: lastVol > 0 ? pctDelta(vol, lastVol) : null,
      setsChange: setsChange,
      performanceChange: perf,
      performanceDirection: direction,
      scale: 'session',
      note: 'La prestazione è la media dei confronti exercise-specific, non il max e1RM tra alzate diverse.',
      fatigue: intraSessionFatigue(today),
      recovery: rec,
      adaptation: adaptationFromComparison({
        volume: lastVol > 0 ? pctDelta(vol, lastVol) : null,
        e1rm: e1Proxy,
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
      increase: 'Aumento carico', maintain: 'Mantieni', monitor: 'Mantieni e monitora',
      mixed: 'Mista', positive: 'Positiva', negative: 'Negativa', neutral: 'Neutra',
      rising: 'In aumento', falling: 'In calo',
      reduce_load: 'Riduci carico', reduce_volume: 'Riduci volume', insufficient: 'Dati insufficienti',
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
      if (k === 'POSITIVE' || k === 'positive' || k === 'improving' || k === 'Prestazione in miglioramento') return 'Prestazione in miglioramento';
      if (k === 'NEGATIVE' || k === 'negative' || k === 'declining' || k === 'Prestazione in calo') return 'Prestazione in calo';
      if (k === 'NEUTRAL' || k === 'neutral' || k === 'stable' || k === 'Prestazione stabile') return 'Prestazione stabile';
      if (k === 'MIXED' || k === 'mixed') return 'Prestazione mista';
      if (k === 'INSUFFICIENT_DATA' || k === 'insufficient') return 'Dati insufficienti';
    }
    if (d === 'intensity') {
      if (k === 'high' || k === 'HIGH') return 'Alta';
      if (k === 'moderate' || k === 'MODERATE' || k === 'medium') return 'Media';
      if (k === 'low' || k === 'LOW') return 'Bassa';
      if (k === 'rising') return 'In aumento';
      if (k === 'falling') return 'In calo';
      if (k === 'stable') return 'Stabile';
    }
    if (d === 'effort') {
      if (k === 'stable') return 'Stabile';
      if (k === 'rising') return 'In aumento';
      if (k === 'falling') return 'In calo';
      if (k === 'improved') return 'Migliorato';
      if (k === 'worsened') return 'Peggiorato';
    }
    if (d === 'adaptation' || d === 'volumeResponse') {
      if (k === 'POSITIVE' || k === 'positive_response' || k === 'positive') return 'Risposta positiva';
      if (k === 'NEGATIVE' || k === 'negative_response' || k === 'negative') return 'Risposta negativa';
      if (k === 'NEUTRAL' || k === 'neutral_response' || k === 'stable') return 'Risposta neutra';
      if (k === 'MIXED' || k === 'mixed') return 'Risposta mista';
      if (k === 'efficient_exposure') return 'Esposizione efficiente';
      if (k === 'fatigue_accumulation') return 'Possibile accumulo di fatica';
      if (k === 'monitor') return 'Da monitorare';
      if (k === 'INSUFFICIENT_DATA' || k === 'insufficient_data' || k === 'insufficient') return 'Dati insufficienti';
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
    MACRO_MUSCLE_IDS: MACRO_MUSCLE_IDS,
    normalizeMuscleId: normalizeMuscleId,
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
    exerciseAnalyticsSnapshot: exerciseAnalyticsSnapshot,
    buildExerciseAnalyticsSnapshot: buildExerciseAnalyticsSnapshot,
    isRecommendationEligible: isRecommendationEligible,
    debugExerciseTrace: debugExerciseTrace,
    assertComparableMetric: assertComparableMetric,
    evaluateExerciseState: evaluateExerciseState,
    evaluatePerformanceContext: evaluatePerformanceContext,
    classifySetRoles: classifySetRoles,
    compareExposures: compareExposures,
    performanceValueForExposure: performanceValueForExposure,
    performanceFromSets: performanceFromSets,
    groupExposures: groupExposures,
    sameExerciseName: sameExerciseName,
    resolveExerciseName: resolveExerciseName,
    slotLineageStartWeek: slotLineageStartWeek,
    preWorkout: preWorkout,
    sessionSummary: sessionSummary,
    explainMetric: explainMetric,
    rawFingerprint: rawFingerprint,
    isWeekComplete: isWeekComplete,
    muscleContributionForExercise: muscleContributionForExercise,
    storedMuscleFrom: storedMuscleFrom,
    storedMuscleRecord: storedMuscleRecord,
    nameLockedMuscle: nameLockedMuscle,
    buildByMuscle: buildByMuscle,
    listProgramExercises: listProgramExercises,
    labelIt: labelIt,
    humanState: humanState,
    build: build,
    clearCache: function () { _cache = { key: '', at: 0, value: null }; }
  };
});
