/*
 * Progression advisor: reads what an athlete has actually done in the program
 * and says when the way the program progresses has stopped working - and which
 * other progression is the likeliest to start the improvements again.
 *
 * It looks at three things in the closed sessions:
 *
 *   - stall: the best estimated max (or the best reps, for an exercise done
 *     with no load) of an exercise has not gone up by 1.5% across its last
 *     three exposures (two, when it has only three), measured against everything
 *     before them. Progress that
 *     slow, for that long, is the usual definition of a plateau - the stimulus
 *     has stopped being new;
 *   - regression: the last two exposures sit 4% or more under the best one;
 *   - fatigue: effort above what was prescribed (RIR logged below the target),
 *     reps below the bottom of the range, sets left unfinished - taken over
 *     the last three sessions and compared with the three before.
 *
 * The answer depends on the pair: a stall with the athlete fresh asks for a
 * new stimulus (more volume, a different distribution of it); a stall with
 * the athlete tired, or a regression, asks for less accumulated fatigue (waves
 * with a lighter week, or loads decided on the day). Never the model the
 * athlete is already on, and nothing at all when there is not enough history,
 * when the program is about to end, or when it is a peak toward a test day -
 * a taper is the wrong moment to change the shape of the block.
 *
 * Evidence the model choices lean on: weekly volume and proximity to failure
 * as the drivers of hypertrophy (Schoenfeld 2016, 2021; ACSM 2026) and the
 * RIR scale as the way effort is read from sets (Zourdos 2016). The thresholds
 * themselves are working rules, not published cut-offs: they are named
 * constants below so they can be tuned against real logs.
 */
(function (root) {
  'use strict';

  var MIN_EXPOSURES = 3;      // an exercise needs three closed sessions to be judged
  var MIN_SESSIONS = 4;       // and the program four sessions in two weeks
  var MIN_WEEKS = 2;
  var STALL_GAIN = 0.015;     // under +1.5% over its last three exposures = stalled
  var REGRESS_DROP = 0.04;    // the last two 4% under the best = going backwards
  var MIN_REMAINING_WEEKS = 3; // a new progression needs at least this much program left

  function num(v) {
    var n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
    return isFinite(n) ? n : null;
  }
  function mean(a) {
    if (!a.length) return 0;
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i];
    return s / a.length;
  }
  function round1(n) { return Math.round(n * 10) / 10; }

  // The estimated one-rep max of a set, Epley's way. Reps in reserve count as
  // reps that could have been done, and past twelve the estimate is not
  // worth the name.
  function e1rm(load, reps, rir) {
    var r = Math.min(12, Math.max(1, reps + Math.max(0, rir || 0)));
    return load * (1 + r / 30);
  }

  // One exposure of an exercise: its best working set, as a number.
  function exposureOf(sets) {
    var best = null;
    var loaded = 0;
    var done = 0;
    sets.forEach(function (s) {
      if (!s.done) return;
      var reps = num(s.reps);
      if (reps == null || reps < 1) return;
      done += 1;
      var load = num(s.load);
      var rir = s.rir == null ? 0 : s.rir;
      if (load != null && load > 0) {
        loaded += 1;
        var v = e1rm(load, reps, rir);
        if (!best || v > best.e1rm) best = { e1rm: v, load: load, reps: reps };
      }
    });
    if (!done) return null;
    if (best && loaded === done) return { kind: 'e1rm', value: best.e1rm, load: best.load, reps: best.reps };
    // No load written: the reps themselves are the measure.
    var top = 0;
    sets.forEach(function (s) {
      if (!s.done) return;
      var r = num(s.reps);
      if (r != null && r > top) top = r;
    });
    return top ? { kind: 'reps', value: top, load: null, reps: top } : null;
  }

  // history: closed sessions, oldest first, working sets only:
  // [{ week, day, rows: [{ key, name, repsLow, targetRir, planned, sets: [{ load, reps, rir, done }] }] }]
  function analyze(history) {
    history = (history || []).slice(-10);
    var weeks = {};
    history.forEach(function (h) { weeks[h.week] = true; });
    var out = {
      sessions: history.length, weeks: Object.keys(weeks).length, tracked: [],
      fatigue: { last: null, prev: null, level: 'low', rising: false }, state: 'ok', enough: false
    };
    out.enough = history.length >= MIN_SESSIONS && out.weeks >= MIN_WEEKS;

    // Exercise by exercise.
    var by = {};
    history.forEach(function (h) {
      h.rows.forEach(function (row) {
        var exp = exposureOf(row.sets || []);
        if (!exp) return;
        if (!by[row.key]) by[row.key] = { name: row.name, list: [] };
        by[row.key].list.push(exp);
      });
    });
    Object.keys(by).forEach(function (key) {
      var item = by[key];
      var kind = item.list.filter(function (e) { return e.kind === 'e1rm'; }).length >= item.list.length / 2 ? 'e1rm' : 'reps';
      var values = item.list.filter(function (e) { return e.kind === kind; }).map(function (e) { return e.value; });
      if (values.length < MIN_EXPOSURES) return;
      // Four exposures or more: the last three against everything before them.
      // Exactly three (an exercise done once a week): the last two against the first.
      var recent = values.length >= 4 ? 3 : 2;
      var last3 = values.slice(-recent);
      var before = values.slice(0, values.length - recent);
      var base = Math.max.apply(null, before);
      var gain = (Math.max.apply(null, last3) - base) / base;
      var best = Math.max.apply(null, values);
      var lastTwo = mean(values.slice(-2));
      var drop = (best - lastTwo) / best;
      var state = 'progress';
      if (drop >= REGRESS_DROP) state = 'regressing';
      else if (gain < STALL_GAIN) state = 'stalled';
      out.tracked.push({
        name: item.name, kind: kind, state: state, exposures: values.length,
        gainPct: round1(gain * 100), dropPct: round1(drop * 100), best: round1(best), last: round1(values[values.length - 1])
      });
    });

    // Fatigue, session by session.
    var perSession = history.map(function (h) {
      var deficits = [];
      var short = 0;
      var counted = 0;
      var planned = 0;
      var done = 0;
      h.rows.forEach(function (row) {
        planned += row.planned || (row.sets || []).length;
        (row.sets || []).forEach(function (s) {
          if (s.done) done += 1;
          if (!s.done) return;
          if (s.rir != null && row.targetRir != null) deficits.push(Math.max(0, row.targetRir - s.rir));
          var reps = num(s.reps);
          if (reps != null && row.repsLow) { counted += 1; if (reps < row.repsLow) short += 1; }
        });
      });
      return {
        deficit: deficits.length ? mean(deficits) : null,
        rated: deficits.length,
        shortfall: counted ? short / counted : 0,
        incomplete: planned ? Math.max(0, planned - done) / planned : 0
      };
    });
    function block(list) {
      if (!list.length) return null;
      var rated = list.filter(function (p) { return p.deficit != null; });
      return {
        deficit: rated.length ? mean(rated.map(function (p) { return p.deficit; })) : null,
        shortfall: mean(list.map(function (p) { return p.shortfall; })),
        incomplete: mean(list.map(function (p) { return p.incomplete; }))
      };
    }
    var last = block(perSession.slice(-3));
    var prev = perSession.length >= 6 ? block(perSession.slice(-6, -3)) : null;
    out.fatigue.last = last;
    out.fatigue.prev = prev;
    if (last) {
      var d = last.deficit == null ? 0 : last.deficit;
      out.fatigue.level = (d >= 1 || last.shortfall >= 0.3 || last.incomplete >= 0.2) ? 'high' : 'low';
      var growing = prev && prev.deficit != null && last.deficit != null && (last.deficit - prev.deficit) >= 0.3 && last.deficit >= 0.7;
      out.fatigue.rising = !!(out.fatigue.level === 'high' || growing);
    }

    // The verdict.
    var tracked = out.tracked;
    var stalled = tracked.filter(function (t) { return t.state === 'stalled'; });
    var regress = tracked.filter(function (t) { return t.state === 'regressing'; });
    var stuck = stalled.length + regress.length;
    if (tracked.length >= 2 && (regress.length >= 2 || regress.length / tracked.length >= 0.3)) out.state = 'regressing';
    else if (tracked.length >= 2 && stuck >= 2 && stuck / tracked.length >= 0.5) out.state = 'stalled';
    else if (out.fatigue.level === 'high' && out.fatigue.rising && tracked.length >= 1 && stuck >= 1) out.state = 'fatigue';
    return out;
  }

  // The progression to suggest. current: the id the program is on ('none' when it
  // has none); family: 'bodybuilding' | 'powerlifting' of that model; ctx:
  // { remainingWeeks, current, family }.
  var BB_AFTER = {
    // a stall with the athlete still fresh: a new stimulus
    fresh: { none: 'volume_ramp', linear: 'volume_ramp', linear_rir: 'volume_ramp', double_progression: 'volume_ramp', density: 'volume_ramp', technique_intensifier: 'volume_ramp',
      volume_ramp: 'dup', volume_wave: 'dup', dup: 'block_hyp_strength', block_hyp_strength: 'technique_intensifier' },
    // tired or going backwards: less fatigue accumulated
    tired: { none: 'volume_wave', linear: 'volume_wave', linear_rir: 'volume_wave', double_progression: 'volume_wave', density: 'volume_wave', technique_intensifier: 'volume_wave', volume_ramp: 'volume_wave',
      volume_wave: 'dup', dup: 'linear_rir', block_hyp_strength: 'volume_wave' }
  };
  var PL_AFTER = {
    fresh: { wave_531: 'texas_method', texas_method: 'block_pl', block_pl: 'rpe_autoreg', rpe_autoreg: 'wave_531' },
    tired: { wave_531: 'rpe_autoreg', texas_method: 'rpe_autoreg', block_pl: 'rpe_autoreg', rpe_autoreg: 'wave_531' }
  };
  var ALTERNATIVES = {
    bodybuilding: { fresh: ['volume_ramp', 'dup', 'block_hyp_strength', 'technique_intensifier'], tired: ['volume_wave', 'dup', 'linear_rir'] },
    powerlifting: { fresh: ['wave_531', 'texas_method', 'block_pl'], tired: ['rpe_autoreg', 'wave_531'] }
  };
  var NEVER_CHANGE = { peaking_classic: true, meet_taper: true };

  function advise(analysis, ctx) {
    ctx = ctx || {};
    if (!analysis || !analysis.enough || analysis.state === 'ok') return null;
    if (NEVER_CHANGE[ctx.current]) return null;
    if ((Number(ctx.remainingWeeks) || 0) < MIN_REMAINING_WEEKS) return null;
    var family = ctx.family === 'powerlifting' ? 'powerlifting' : 'bodybuilding';
    var tired = analysis.state === 'regressing' || analysis.fatigue.level === 'high' || analysis.fatigue.rising;
    var mode = tired ? 'tired' : 'fresh';
    var table = family === 'powerlifting' ? PL_AFTER : BB_AFTER;
    var current = ctx.current || 'none';
    var pick = table[mode][current] || (family === 'powerlifting' ? (tired ? 'rpe_autoreg' : 'wave_531') : (tired ? 'volume_wave' : 'volume_ramp'));
    if (pick === current) return null;
    var alternatives = ALTERNATIVES[family][mode].filter(function (id) { return id !== pick && id !== current; });
    var stuck = analysis.tracked.filter(function (t) { return t.state !== 'progress'; })
      .sort(function (a, b) { return (b.dropPct - a.dropPct) || (a.gainPct - b.gainPct); });
    return {
      state: analysis.state, fatigue: tired ? 'high' : 'low', modelId: pick, alternatives: alternatives,
      exercises: stuck.slice(0, 3), sessions: analysis.sessions, weeks: analysis.weeks,
      deficit: analysis.fatigue.last && analysis.fatigue.last.deficit != null ? round1(analysis.fatigue.last.deficit) : null,
      shortfallPct: analysis.fatigue.last ? Math.round(analysis.fatigue.last.shortfall * 100) : 0,
      incompletePct: analysis.fatigue.last ? Math.round(analysis.fatigue.last.incomplete * 100) : 0
    };
  }

  root.NurvanProgressionAdvisor = {
    analyze: analyze, advise: advise, e1rm: e1rm,
    limits: { MIN_EXPOSURES: MIN_EXPOSURES, MIN_SESSIONS: MIN_SESSIONS, MIN_WEEKS: MIN_WEEKS, STALL_GAIN: STALL_GAIN, REGRESS_DROP: REGRESS_DROP, MIN_REMAINING_WEEKS: MIN_REMAINING_WEEKS }
  };
})(typeof self !== 'undefined' ? self : this);
