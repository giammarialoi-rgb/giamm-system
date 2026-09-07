/* Nurvan Training Analytics Engine — formulas live here, not in the Stats UI. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TrainingAnalyticsEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

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
      opts.axis, opts.zoomWeeks, opts.muscle || '', opts.exercise || ''
    ].join('|');
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
      empty: true
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
      sessionCount: freq
    };
  }

  function trainingBuckets(sets, weekCount) {
    const n = Math.max(1, weekCount || 1);
    const buckets = [];
    for (let w = 1; w <= n; w++) buckets.push(emptyWeek('W' + w, 'tw-' + w));
    sets.forEach(function (s) {
      const i = s.week - 1;
      if (i < 0) return;
      while (buckets.length <= i) buckets.push(emptyWeek('W' + (buckets.length + 1), 'tw-' + (buckets.length + 1)));
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

  function applyZoom(weeks, zoomWeeks) {
    if (!weeks.length) return { weeks: [], offset: 0 };
    let lastHit = 0;
    weeks.forEach(function (w, i) { if (!w.empty) lastHit = i + 1; });
    const z = Number(zoomWeeks);
    if (!z || z <= 0 || z >= weeks.length) return { weeks: weeks.slice(), offset: 0 };
    const end = Math.max(lastHit, z, 1);
    const endClamped = Math.min(weeks.length, end);
    const start = Math.max(0, endClamped - z);
    return { weeks: weeks.slice(start, endClamped), offset: start };
  }

  function previousWindow(allWeeks, zoomWeeks, current) {
    const z = current.weeks.length;
    if (!z) return { weeks: [], offset: 0 };
    const start = current.offset;
    if (start <= 0) return { weeks: [], offset: 0 };
    const prevStart = Math.max(0, start - z);
    return { weeks: allWeeks.slice(prevStart, start), offset: prevStart };
  }

  function sumField(weeks, field) {
    return (weeks || []).reduce(function (s, w) { return s + (Number(w[field]) || 0); }, 0);
  }

  function detectPRs(sets) {
    const best = {};
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
    });
    return events.slice(-12);
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
    return Object.assign({ currentSets: weeklySets, status: status }, lm);
  }

  function fatigueFromWeeks(weeks) {
    const nonempty = (weeks || []).filter(function (w) { return !w.empty; });
    if (!nonempty.length) return { acute: null, chronic: null, stress: null, kind: 'estimated', note: 'Not enough weekly volume' };
    const acute = nonempty[nonempty.length - 1].volume;
    const hist = nonempty.slice(Math.max(0, nonempty.length - 4));
    if (hist.length < 2) return { acute: acute, chronic: null, stress: null, kind: 'estimated', note: 'Chronic load needs ≥2 settimane con volume' };
    const chronic = Math.round(hist.reduce(function (s, w) { return s + w.volume; }, 0) / hist.length);
    const stress = chronic > 0 ? round1(acute / chronic) : null;
    return { acute: acute, chronic: chronic, stress: stress, kind: 'estimated', note: 'Acute = ultima settimana; chronic = media fino a 4 settimane; stress = acute/chronic' };
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
    return { observed: observed, estimate: estimate, kind: 'estimated', note: 'Recovery Estimate da acute/chronic. Non è un dato fisiologico misurato.' };
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

  function build(store, data, opts) {
    opts = opts || {};
    const axis = opts.axis === 'calendar' ? 'calendar' : 'training';
    const zoomWeeks = opts.zoomWeeks == null ? 8 : Number(opts.zoomWeeks);
    const muscle = opts.muscle || 'TOTAL';
    const exercise = opts.exercise || '';
    const fp = fingerprint(store, { axis: axis, zoomWeeks: zoomWeeks, muscle: muscle, exercise: exercise });
    if (_cache.key === fp && _cache.value && (Date.now() - _cache.at) < 2500) return _cache.value;

    const fromData = (data && Array.isArray(data.weeks)) ? data.weeks.length : 0;
    const fromPref = Number(store && store.prefs && store.prefs.duration) || 0;
    const fromLogs = ((store && store.logs) || []).reduce(function (m, row) { return Math.max(m, Number(row.week) || 0); }, 0);
    const weekCount = Math.max(1, fromData, fromPref, fromLogs);

    const sets = normalizeSets(store, data, opts);
    const allWeeks = axis === 'calendar' ? calendarBuckets(sets) : trainingBuckets(sets, weekCount);
    const windowed = applyZoom(allWeeks, zoomWeeks);
    const prev = previousWindow(allWeeks, zoomWeeks, windowed);
    const comparison = comparePeriods(windowed.weeks, prev.weeks);
    const last = windowed.weeks.filter(function (w) { return !w.empty; }).pop() || windowed.weeks[windowed.weeks.length - 1] || emptyWeek('—', 'none');
    const prevWeek = (function () {
      const filled = windowed.weeks.filter(function (w) { return !w.empty; });
      return filled.length >= 2 ? filled[filled.length - 2] : null;
    })();
    const windowSets = sets.filter(function (s) {
      if (axis === 'calendar') {
        return windowed.weeks.some(function (w) { return w.key === s.calendarKey; });
      }
      const startW = windowed.offset + 1;
      const endW = windowed.offset + windowed.weeks.length;
      return s.week >= startW && s.week <= endW;
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
        periodVar: comparison.volume,
        avgIntensity: last.avgIntensity,
        avgRir: last.avgRir,
        avgRpe: last.avgRpe,
        sets: sumField(windowed.weeks, 'sets'),
        reps: sumField(windowed.weeks, 'reps'),
        e1rm: last.e1rm,
        sessions: sumField(windowed.weeks, 'frequency')
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
      byMuscle: null,
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
      exercises: Array.from(new Set(sets.map(function (s) { return s.name; }))).sort()
    };
    analytics.insights = insightsFrom(analytics);
    analytics.trainingLoad = trainingLoadFromWeeks(windowed.weeks);
    analytics.adaptation = adaptationFromComparison(comparison, windowed.weeks);
    analytics.formulaVersion = FORMULA_VERSION;
    analytics.kind = 'derived';
    _cache = { key: fp, at: Date.now(), value: analytics };
    return analytics;
  }

  const FORMULA_VERSION = 'intel-v1';
  const METRIC_CATALOG = {
    volume: { id: 'volume', category: 'volume', definition: 'Tonnage load × reps', formula: 'Σ(load × reps × partMultiplier)', unit: 'kg', evidenceLevel: 'DERIVED', formulaVersion: 'epley-v1', confidence: 'high', limitations: 'Skipped sets ignored. Part multiplier is a calculation mode.' },
    e1rm: { id: 'e1rm', category: 'strength', definition: 'Estimated one-repetition maximum', formula: 'Epley: load × (1 + reps/30); singles = load', unit: 'kg', evidenceLevel: 'DERIVED', formulaVersion: 'epley-v1', confidence: 'medium', limitations: 'Unreliable above 12 reps. Exercise-specific. Not a tested 1RM.' },
    intensity10: { id: 'intensity10', category: 'intensity', definition: 'Effort on a 0–10 scale from RIR or RPE', formula: 'RIR → 10−RIR; RPE → RPE', unit: '/10', evidenceLevel: 'DERIVED', formulaVersion: 'rir-rpe-v1', confidence: 'medium', limitations: 'Missing effort stays empty. Scales are opposite.' },
    landmarks: { id: 'landmarks', category: 'landmarks', definition: 'Configurable weekly-set zones MV/MEV/MAV/MRV', formula: 'user prefs or defaults', unit: 'sets', evidenceLevel: 'MODEL_BASED', formulaVersion: 'landmarks-v1', confidence: 'low', limitations: 'Not universal physiology. Configurable estimates.' },
    recovery: { id: 'recovery', category: 'recovery', definition: 'Recovery Estimate from acute/chronic volume', formula: 'acute/chronic labels', unit: 'label', evidenceLevel: 'HEURISTIC', formulaVersion: 'acwr-adapt-v1', confidence: 'low', limitations: 'Not a measured readiness score. Never shown as a percent.' },
    atlCtl: { id: 'atlCtl', category: 'workload', definition: 'Adapted ATL/CTL/TSB from weekly volume', formula: 'ATL=last week; CTL=mean last 4; TSB=CTL−ATL', unit: 'kg', evidenceLevel: 'MODEL_BASED', formulaVersion: 'atl-adapt-v1', confidence: 'low', limitations: 'Endurance-derived model adapted for trend only. Not overtraining diagnosis.' },
    recommendation: { id: 'recommendation', category: 'recommendations', definition: 'Suggested next-session load change', formula: 'rules on e1RM/RPE/recovery', unit: 'kg', evidenceLevel: 'HEURISTIC', formulaVersion: 'reco-v1', confidence: 'medium', limitations: 'Never writes programmed workouts. User must Accept.' }
  };

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
      methodology: 'Adapted ATL/CTL/TSB from weekly tonnage. Endurance-derived, context-dependent. Trend only.',
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
      return { name: name, empty: true, e1rm: null, note: 'Not enough valid sets', kind: 'derived' };
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
      return { empty: true, note: 'Not enough valid sets', kind: 'derived', formulaVersion: FORMULA_VERSION };
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
      if (todayE1 > lastE1) status = 'Performance improved';
      else if (todayE1 < lastE1) status = 'Performance declined';
      else status = 'Performance stable';
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
      confidence: 'LOW',
      kind: 'heuristic',
      formulaVersion: 'reco-v1',
      evidenceLevel: 'HEURISTIC',
      name: (report && report.name) || ''
    };
    if (report.empty || report.e1rmToday == null) return base;
    const lastLoad = report.load;
    const e1up = report.e1rmChange != null && report.e1rmChange > 1.5;
    const e1down = report.e1rmChange != null && report.e1rmChange < -1.5;
    const rpeHigh = report.avgRpe != null && report.avgRpe >= 9;
    const rpeOk = report.avgRpe == null || report.avgRpe <= 8.5;
    const fat = report.fatigue || {};
    const evidence = [];
    if (report.e1rmChange != null) evidence.push('e1RM ' + (report.e1rmChange >= 0 ? '+' : '') + report.e1rmChange + '% vs seduta precedente');
    if (report.avgRpe != null) evidence.push('RPE medio ' + report.avgRpe);
    if (fat.signal) evidence.push('Intra-session fatigue: ' + fat.signal);
    let action = 'maintain';
    let delta = 0;
    let why = 'Prestazione stabile: mantieni il carico.';
    let conf = report.e1rmPrev == null ? 'LOW' : 'MEDIUM';
    if (e1up && rpeOk && fat.signal !== 'high') {
      action = 'increase';
      delta = lastLoad < 20 ? 1 : 2.5;
      why = 'e1RM in aumento e RPE nella fascia obiettivo. Suggerimento, non modifica automatica.';
      conf = 'MEDIUM';
    } else if (e1down && (rpeHigh || fat.signal === 'high' || fat.signal === 'moderate')) {
      action = 'reduce_volume';
      delta = 0;
      why = 'Prestazione in calo con fatica/RPE alti. Valuta di togliere 1 serie di lavoro. Non è una diagnosi.';
      conf = 'MEDIUM';
    }
    return {
      action: action,
      suggestedLoad: lastLoad != null ? round1(lastLoad + delta) : null,
      deltaKg: delta,
      why: why,
      evidence: evidence,
      confidence: conf,
      kind: 'heuristic',
      formulaVersion: 'reco-v1',
      evidenceLevel: 'HEURISTIC',
      name: report.name,
      week: loc.week,
      day: loc.day,
      exIdx: loc.exIdx
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
    return {
      volume: Math.round(vol),
      sets: today.length,
      avgRpe: mean(today.map(function (s) { return s.rpe; })),
      volumeChange: lastVol > 0 ? pctDelta(vol, lastVol) : null,
      fatigue: intraSessionFatigue(today),
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
    build: build,
    clearCache: function () { _cache = { key: '', at: 0, value: null }; }
  };
});
