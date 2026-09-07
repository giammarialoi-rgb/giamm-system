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
    _cache = { key: fp, at: Date.now(), value: analytics };
    return analytics;
  }

  return {
    EPLEY_MAX_REPS: EPLEY_MAX_REPS,
    DEFAULT_LANDMARKS: DEFAULT_LANDMARKS,
    intensityFromRirRpe: intensityFromRirRpe,
    epley1rm: epley1rm,
    relativeIntensity: relativeIntensity,
    movingAverage: movingAverage,
    isoWeekKey: isoWeekKey,
    normalizeSets: normalizeSets,
    detectPRs: detectPRs,
    comparePeriods: comparePeriods,
    applyZoom: applyZoom,
    landmarksFor: landmarksFor,
    build: build,
    clearCache: function () { _cache = { key: '', at: 0, value: null }; }
  };
});
