/*
 * Writes a whole program on its own, with the same decisions the builder
 * offers by hand.
 *
 * The old generator held three hand-written lists of six exercise names,
 * clamped the duration between 4 and 16 weeks, dropped a deload on every
 * fourth week and called it done. Everything the builder had learned since -
 * fifteen progression models, exercise rotation by block, a mid-program test
 * week, intensity techniques, tempo, time-based work, cardio and circuits,
 * and the place the athlete actually trains in - was unreachable unless the
 * program was typed out by hand.
 *
 * So this is not a new engine: it is the two that already exist, joined.
 *   web/program-builder.js   picks the exercises for week 1 out of the whole
 *                            library, by movement slot, filtered by the
 *                            equipment and the experience.
 *   web/progression-models.js turns that one week into all of them.
 * What is added here is the deciding: which model suits the goal and the
 * length, when to rotate the accessories, where a test week belongs in a
 * peaking block, what a session's cardio looks like, and how to say all of it
 * back to the person in a sentence they can check before they commit.
 *
 * Nothing here touches storage. plan() returns a program object; what is done
 * with it - activated, saved, filed in a database, handed to a client - is
 * the page's decision, and the same one the builder makes.
 */
(function (root) {
  'use strict';

  var BUILDER = root.NurvanProgramBuilder;
  var PROG = root.NurvanProgressions;
  var CARDIO = root.NurvanCardio;

  var DAYS = [1, 2, 3, 4, 5, 6, 7];

  // The weeks a program is actually written for. Longer than a year is not a
  // program, it is a career, so the ceiling is the engine's own 52.
  var WEEK_PRESETS = [4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 40, 52];
  var MAX_WEEKS = 52;

  var SPLITS = [
    { id: 'fullbody', label: 'Full body', minDays: 1, maxDays: 4, note: 'Tutto il corpo a ogni seduta' },
    { id: 'upper_lower', label: 'Upper / Lower', minDays: 2, maxDays: 6, note: 'Alto e basso alternati' },
    { id: 'monofrequency', label: 'Monofrequenza / PPL', minDays: 2, maxDays: 7, note: 'Un distretto per seduta' }
  ];

  var GOALS = [
    { id: 'ipertrofia', label: 'Ipertrofia', note: 'Volume e ripetizioni medie' },
    { id: 'forza', label: 'Forza', note: 'Poche ripetizioni, carichi alti, recuperi lunghi' },
    { id: 'powerbuilding', label: 'Powerbuilding', note: 'Fondamentali pesanti + accessori da massa' },
    { id: 'cut', label: 'Definizione', note: 'Densità alta, recuperi corti' }
  ];

  var EQUIPMENT = [
    { id: 'palestra', label: 'Palestra completa' },
    { id: 'casa', label: 'Casa attrezzata' },
    { id: 'minimal', label: 'Manubri ed elastici' },
    { id: 'kettlebell', label: 'Solo kettlebell' },
    { id: 'bodyweight', label: 'Corpo libero' }
  ];

  var EXPERIENCE = [
    { id: 'principiante', label: 'Principiante' },
    { id: 'intermedio', label: 'Intermedio' },
    { id: 'avanzato', label: 'Avanzato' }
  ];

  var AUDIENCE = [
    { id: 'unisex', label: 'Unisex' },
    { id: 'female', label: 'Donna · glutei e lower' },
    { id: 'male', label: 'Uomo · upper e petto' }
  ];

  // The app's six macro groups, the ones the muscle map and the athlete
  // profile already speak. Glutes live inside GAMBE here as they do
  // everywhere else in the app.
  var FOCUS_GROUPS = ['PETTO', 'DORSO', 'SPALLE', 'BRACCIA', 'GAMBE', 'ADDOME'];
  var FOCUS_LABELS = {
    PETTO: 'petto', DORSO: 'dorso', SPALLE: 'spalle',
    BRACCIA: 'braccia', GAMBE: 'gambe', ADDOME: 'addome'
  };

  var CARDIO_MODES = [
    { id: 'none', label: 'Nessun cardio' },
    { id: 'finisher', label: 'Cardio a fine seduta' },
    { id: 'circuit', label: 'Circuito a intervalli' }
  ];

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  function byId(list, id, fallback) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return fallback !== undefined ? fallback : list[0];
  }

  // A split has a number of days it makes sense over: full body six times a
  // week is not full body, and a one-day week cannot be upper/lower.
  function splitsFor(days) {
    var d = clamp(Math.round(Number(days) || 3), 1, 7);
    return SPLITS.filter(function (s) { return d >= s.minDays && d <= s.maxDays; });
  }

  function normalizeSplit(split, days) {
    var allowed = splitsFor(days);
    for (var i = 0; i < allowed.length; i++) if (allowed[i].id === split) return split;
    return allowed[allowed.length - 1].id;
  }

  /*
   * What to run, given what was asked for.
   *
   * A goal picks the family - a strength block is a percentage block, a cut is
   * a density block - and the length picks how much room there is to use it:
   * a four-week program has no time for a wave and a peak, a twenty-week one
   * has no business running the same linear step for twenty weeks.
   */
  function suggestModel(opts) {
    var goal = (opts && opts.goal) || 'ipertrofia';
    var weeks = clamp(Math.round(Number(opts && opts.weeks) || 8), 1, MAX_WEEKS);
    var experience = (opts && opts.experience) || 'intermedio';
    if (goal === 'forza') {
      if (weeks >= 12) return 'block_pl';
      if (weeks >= 8) return 'wave_531';
      return experience === 'principiante' ? 'linear_rir' : 'texas_method';
    }
    if (goal === 'powerbuilding') return weeks >= 12 ? 'block_hyp_strength' : 'volume_wave';
    if (goal === 'cut') return 'density';
    if (experience === 'principiante') return 'linear_rir';
    if (weeks >= 16) return 'block_hyp_strength';
    if (weeks >= 10) return 'volume_wave';
    return 'double_progression';
  }

  // Accessories are changed by block, not by whim: long enough to progress on
  // them, short enough that a region is not left out for months.
  function suggestRotationEvery(weeks) {
    var w = clamp(Math.round(Number(weeks) || 8), 1, MAX_WEEKS);
    if (w < 8) return 0;
    if (w <= 12) return 6;
    if (w <= 24) return 5;
    return 4;
  }

  function rotationWeeksFrom(every, weeks) {
    var w = clamp(Math.round(Number(weeks) || 8), 1, MAX_WEEKS);
    var step = Math.round(Number(every) || 0);
    if (!step || step < 2) return [];
    var out = [];
    for (var n = step + 1; n <= w; n += step) out.push(n);
    return out;
  }

  // A test inside a peaking block only earns its place if there are weeks
  // left to rewrite with what it says. Five is the usual last block.
  function suggestTestWeeks(opts) {
    var modelId = (opts && opts.modelId) || '';
    var weeks = clamp(Math.round(Number(opts && opts.weeks) || 8), 1, MAX_WEEKS);
    var family = familyOf(modelId);
    if (family !== 'powerlifting') return [];
    if (weeks < 10) return [];
    return [Math.max(4, weeks - 5)];
  }

  function familyOf(modelId) {
    if (!PROG || !modelId) return '';
    var m = PROG.get(modelId);
    return (m && m.family) || '';
  }

  function modelLabel(modelId) {
    if (!PROG || !modelId) return '';
    var m = PROG.get(modelId);
    return (m && m.label) || modelId;
  }

  // Everything the form can leave unsaid, decided once, so plan() and the
  // sentence shown to the person are reading the same numbers.
  function resolve(opts) {
    var o = opts || {};
    var days = clamp(Math.round(Number(o.days) || 4), 1, 7);
    var weeks = clamp(Math.round(Number(o.weeks) || 8), 1, MAX_WEEKS);
    var goal = byId(GOALS, o.goal, GOALS[0]).id;
    var experience = byId(EXPERIENCE, o.experience, EXPERIENCE[1]).id;
    var equipment = byId(EQUIPMENT, o.equipment, EQUIPMENT[0]).id;
    var audience = byId(AUDIENCE, o.audience, AUDIENCE[0]).id;
    var split = normalizeSplit(o.split, days);
    var modelId = o.modelId && o.modelId !== 'auto'
      ? o.modelId
      : suggestModel({ goal: goal, weeks: weeks, experience: experience });
    var rotateEvery = o.rotateEvery === undefined || o.rotateEvery === 'auto'
      ? suggestRotationEvery(weeks)
      : Math.max(0, Math.round(Number(o.rotateEvery) || 0));
    var rotateWeeks = Array.isArray(o.rotateWeeks) && o.rotateWeeks.length
      ? o.rotateWeeks.map(Number).filter(function (n) { return n >= 2 && n <= weeks; })
      : rotationWeeksFrom(rotateEvery, weeks);
    var testWeeks = o.testWeeks === undefined || o.testWeeks === 'auto'
      ? suggestTestWeeks({ modelId: modelId, weeks: weeks })
      : (Array.isArray(o.testWeeks) ? o.testWeeks.map(Number) : [])
        .filter(function (n) { return n >= 2 && n < weeks; });
    var cardio = o.cardio && o.cardio.mode && o.cardio.mode !== 'none' ? {
      mode: byId(CARDIO_MODES, o.cardio.mode, CARDIO_MODES[0]).id,
      minutes: clamp(Math.round(Number(o.cardio.minutes) || 15), 1, 120),
      sessions: clamp(Math.round(Number(o.cardio.sessions) || 2), 1, days),
      machine: o.cardio.machine || '',
      format: o.cardio.format || 'tabata',
      stations: Array.isArray(o.cardio.stations) ? o.cardio.stations.slice() : []
    } : { mode: 'none' };
    return {
      title: String(o.title || '').trim(),
      days: days,
      weeks: weeks,
      split: split,
      goal: goal,
      experience: experience,
      equipment: equipment,
      audience: audience,
      // The muscles to give a slot more to, by the app's own macro ids. The
      // builder is the one that knows what that means for a session; here it
      // is only carried through and written into the program, so a scheda
      // says what it was built for.
      focus: Array.isArray(o.focus)
        ? o.focus.map(function (m) { return String(m || '').toUpperCase(); })
          .filter(function (m, i, a) { return FOCUS_GROUPS.indexOf(m) >= 0 && a.indexOf(m) === i; })
        : [],
      variant: clamp(Math.round(Number(o.variant) || 0), 0, 5),
      modelId: modelId,
      loadDisplay: o.loadDisplay || (familyOf(modelId) === 'powerlifting' ? 'percent' : 'rir'),
      maxes: o.maxes || {},
      bodyweight: Number(o.bodyweight) || 0,
      rotateEvery: rotateEvery,
      rotateWeeks: rotateWeeks,
      rotateScope: o.rotateScope === 'all' ? 'all' : 'accessories',
      testWeeks: testWeeks,
      techniques: o.techniques === 'off' ? 'off' : 'model',
      technique: o.technique && o.technique !== 'auto' ? o.technique : '',
      cardio: cardio
    };
  }

  function restText(seconds) {
    var s = Math.max(20, Math.round(Number(seconds) || 90));
    if (s >= 120 && s % 60 === 0) return (s / 60) + ' min';
    return s + 's';
  }

  // The builder writes a slot; the app reads an exercise. Same thing, two
  // vocabularies - this is the only place that knows both.
  function rowFromSlot(e) {
    var setCount = clamp(Math.round(Number(e.sets_count) || 3), 1, 10);
    var reps = String(e.reps_target || '8-10');
    var sets = [];
    for (var i = 0; i < setCount; i++) sets.push({ reps: reps, target_load: null });
    var row = {
      name: e.name,
      name_original: e.name,
      unit: 'reps',
      sets: sets,
      setCount: setCount,
      repsTarget: reps,
      rirTarget: e.rir != null ? Number(e.rir) : 2,
      rest: restText(e.rest_sec),
      role: e.role || 'compound'
    };
    if (e.tempo) row.tempo = String(e.tempo);
    if (e.progressed) row.progressed = true;
    return row;
  }

  function cardioRow(name, minutes) {
    var mins = clamp(Math.round(Number(minutes) || 15), 1, 120);
    var reps = mins + ' min';
    return {
      name: name,
      name_original: name,
      muscle_groups: ['CARDIO'],
      unit: 'cardio',
      sets: [{ reps: reps, minutes: mins, target_load: null }],
      setCount: 1,
      repsTarget: reps,
      rest: '2 min'
    };
  }

  function circuitRow(cfg) {
    var fmt = CARDIO ? CARDIO.formatById(cfg.format) : { id: 'tabata', label: 'Tabata', work: 20, rest: 10, rounds: 8 };
    var stations = (cfg.stations || []).slice();
    if (!stations.length && CARDIO) {
      // A circuit needs stations that survive twenty seconds; the library
      // already says which ones do.
      stations = CARDIO.intervalReady().slice(0, 4).map(function (c) { return { name: c.name, muscle: 'CARDIO' }; });
    }
    var name = 'Circuito ' + fmt.label;
    return {
      name: name,
      name_original: name,
      muscle_groups: ['CARDIO'],
      unit: 'circuit',
      circuit: {
        format: fmt.id,
        work: fmt.work,
        rest: fmt.rest,
        rounds: fmt.rounds,
        roundRest: 0,
        items: stations
      },
      sets: [{ reps: fmt.rounds + ' round', target_load: null }],
      setCount: 1,
      repsTarget: fmt.rounds + ' round',
      rest: '2 min'
    };
  }

  // Conditioning goes at the end of a session and on the last sessions of the
  // week, so it never stands between the athlete and the heavy work.
  function addCardio(sessions, cfg) {
    if (!cfg || cfg.mode === 'none') return sessions;
    var howMany = clamp(cfg.sessions, 1, sessions.length);
    var from = sessions.length - howMany;
    return sessions.map(function (s, i) {
      if (i < from) return s;
      var row = cfg.mode === 'circuit'
        ? circuitRow(cfg)
        : cardioRow(cfg.machine || defaultMachine(), cfg.minutes);
      return { name: s.name, title: s.title || s.name, exercises: s.exercises.concat([row]) };
    });
  }

  function defaultMachine() {
    if (CARDIO && CARDIO.LIST && CARDIO.LIST.length) return CARDIO.LIST[0].name;
    return 'Tapis roulant';
  }

  // A technique the person asked for is written onto the last single-joint
  // exercise of each session: the one it belongs on, never the opener.
  function applyTechnique(sessions, technique) {
    if (!technique) return sessions;
    return sessions.map(function (s) {
      var rows = s.exercises.slice();
      for (var i = rows.length - 1; i >= 0; i--) {
        if (rows[i].unit && rows[i].unit !== 'reps') continue;
        if (rows[i].progressed) continue;
        rows[i] = Object.assign({}, rows[i], { technique: technique });
        break;
      }
      return { name: s.name, title: s.title || s.name, exercises: rows };
    });
  }

  function templateFor(r) {
    if (!BUILDER) return [];
    var built = BUILDER.buildTemplateSessions({
      days: r.days, split: r.split, goal: r.goal, equipment: r.equipment,
      experience: r.experience, audience: r.audience, variant: r.variant,
      focus: r.focus
    });
    var sessions = built.map(function (s) {
      return {
        name: s.name,
        title: s.name,
        exercises: (s.exercises || []).map(rowFromSlot)
      };
    });
    sessions = applyTechnique(sessions, r.technique);
    return addCardio(sessions, r.cardio);
  }

  function titleFor(r) {
    if (r.title) return r.title;
    var split = byId(SPLITS, r.split).label;
    var goal = byId(GOALS, r.goal).label;
    return split + ' · ' + goal + ' · ' + r.days + ' giorni · ' + r.weeks + ' settimane';
  }

  /*
   * The sentence the person reads before committing. Every clause is
   * something that was decided for them and that they can still change.
   */
  function describe(opts) {
    var r = resolve(opts);
    var bits = [];
    bits.push(r.days + ' giorni a settimana · ' + byId(SPLITS, r.split).label);
    bits.push(r.weeks + ' settimane');
    bits.push('Obiettivo ' + byId(GOALS, r.goal).label.toLowerCase());
    bits.push('Attrezzatura: ' + byId(EQUIPMENT, r.equipment).label.toLowerCase());
    if (r.focus.length) {
      bits.push('Priorità su ' + r.focus.map(function (m) { return FOCUS_LABELS[m] || m.toLowerCase(); }).join(', '));
    }
    if (r.modelId && r.modelId !== 'none') bits.push('Progressione ' + modelLabel(r.modelId));
    if (r.rotateWeeks.length) {
      bits.push('Cambio esercizi alle settimane ' + r.rotateWeeks.join(', ') +
        (r.rotateScope === 'all' ? ' (accessori e varianti dei fondamentali)' : ' (solo accessori)'));
    }
    if (r.testWeeks.length) bits.push('Test massimali alla settimana ' + r.testWeeks.join(', ') + ', poi ricalibro');
    if (r.technique) bits.push('Tecnica di intensità: ' + r.technique.replace(/_/g, ' '));
    if (r.cardio.mode === 'finisher') {
      bits.push('Cardio ' + r.cardio.minutes + ' min a fine seduta, ' + r.cardio.sessions + ' volte a settimana');
    } else if (r.cardio.mode === 'circuit') {
      var fmt = CARDIO ? CARDIO.formatById(r.cardio.format) : null;
      bits.push('Circuito ' + (fmt ? fmt.label : r.cardio.format) + ', ' + r.cardio.sessions + ' volte a settimana');
    }
    return bits.join(' · ');
  }

  /**
   * plan(opts) -> a program object, ready for the app to normalize.
   *
   * opts: { title, days, split, goal, experience, equipment, audience,
   *         weeks, variant, modelId|'auto', loadDisplay, maxes, bodyweight,
   *         rotateEvery|'auto', rotateWeeks, rotateScope, testWeeks|'auto',
   *         techniques: 'model'|'off', technique, cardio: {...} }
   */
  function plan(opts) {
    var r = resolve(opts);
    var template = templateFor(r);
    var weeks;
    if (PROG) {
      weeks = PROG.weeksFromTemplate(template, {
        weeks: r.weeks,
        modelId: r.modelId,
        loadDisplay: r.loadDisplay,
        maxes: r.maxes,
        bodyweight: r.bodyweight,
        techniques: r.techniques,
        rotateWeeks: r.rotateWeeks,
        rotateScope: r.rotateScope,
        testWeeks: r.testWeeks
      });
    } else {
      weeks = [];
      for (var w = 1; w <= r.weeks; w++) {
        weeks.push({
          week: w, weekNumber: w, week_number: w, label: 'Settimana ' + w,
          sessions: JSON.parse(JSON.stringify(template))
        });
      }
    }
    // Warm-ups on the main lift of each session, when the program knows the
    // load it is climbing to. Percent programs, bodyweight lifts and the
    // accessories get none: there is no load, or no need.
    if (PROG && PROG.applyWarmupRamp) {
      weeks.forEach(function (wk) {
        (wk.sessions || wk.days || []).forEach(function (s) {
          (s.exercises || s.rows || []).forEach(function (row) {
            if (!row.progressed) return;
            if (row.unit && row.unit !== 'reps') return;
            if (!PROG.firstWorkingLoad(row)) return;
            PROG.applyWarmupRamp(row);
            row.warmup_auto = true;
          });
        });
      });
    }
    var exercises = 0;
    var sets = 0;
    template.forEach(function (s) {
      exercises += s.exercises.length;
      s.exercises.forEach(function (e) { sets += (e.sets || []).length; });
    });
    return {
      id: 'gen_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      title: titleFor(r),
      weeks: weeks,
      duration_weeks: r.weeks,
      days_per_week: r.days,
      split: r.split,
      goals: [r.goal],
      purpose: r.goal,
      equipment: r.equipment,
      experience: r.experience,
      audience: r.audience,
      focus: r.focus.slice(),
      author: 'Generata da Nurvan',
      source: 'generator_v2',
      progression_model: r.modelId,
      progression: {
        model: r.modelId,
        load_display: r.loadDisplay,
        maxes: r.maxes,
        rotate_weeks: r.rotateWeeks,
        rotate_scope: r.rotateScope,
        test_weeks: r.testWeeks
      },
      source_summary: 'Generata · ' + describe(opts),
      meta: {
        generatedAt: new Date().toISOString(),
        method: 'slots_from_library_then_progression_model',
        resolved: r,
        week1_exercises: exercises,
        week1_sets: sets
      }
    };
  }

  root.NurvanProgramGenerator = {
    DAYS: DAYS,
    WEEK_PRESETS: WEEK_PRESETS,
    MAX_WEEKS: MAX_WEEKS,
    SPLITS: SPLITS,
    GOALS: GOALS,
    EQUIPMENT: EQUIPMENT,
    EXPERIENCE: EXPERIENCE,
    AUDIENCE: AUDIENCE,
    FOCUS_GROUPS: FOCUS_GROUPS,
    FOCUS_LABELS: FOCUS_LABELS,
    CARDIO_MODES: CARDIO_MODES,
    splitsFor: splitsFor,
    normalizeSplit: normalizeSplit,
    suggestModel: suggestModel,
    suggestRotationEvery: suggestRotationEvery,
    suggestTestWeeks: suggestTestWeeks,
    rotationWeeksFrom: rotationWeeksFrom,
    resolve: resolve,
    describe: describe,
    templateFor: function (opts) { return templateFor(resolve(opts)); },
    plan: plan
  };
})(typeof self !== 'undefined' ? self : this);
