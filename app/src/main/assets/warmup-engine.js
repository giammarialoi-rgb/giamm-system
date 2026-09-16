/* Nurvan Warm-Up Engine - deterministic, offline-first, explainable.
 * Pure functions over plain data (a session's exercise list + the static
 * WARMUP_EXERCISE_LIBRARY) - no DOM, no network, so it runs identically
 * offline and can be unit-tested by loading this file in a sandbox. Reuses
 * the existing exercise-list shape already produced by normalizeProgram()
 * (exercise.name / .plannedLoad / .sets / .repsTarget) - it does not define
 * a second workout-exercise model.
 */
(function (root) {
  'use strict';

  var LIFT_KEYS = ['squat', 'deadlift', 'bench', 'overhead_press', 'pull', 'general'];

  // Order matters: more specific patterns first, so e.g. "military press" is
  // not mistaken for a generic "press" pull/push ambiguity.
  var PATTERN_RULES = [
    { liftKey: 'deadlift', pattern: 'hinge', label: 'Deadlift', re: /stacco|deadlift|rdl|romanian/i },
    { liftKey: 'squat', pattern: 'squat', label: 'Squat', re: /\bsquat\b|accosciata/i },
    { liftKey: 'overhead_press', pattern: 'vertical_push', label: 'Overhead Press', re: /overhead|military|lento avanti|shoulder press|press sopra la testa|push press/i },
    { liftKey: 'bench', pattern: 'horizontal_push', label: 'Bench Press', re: /panca|bench/i },
    { liftKey: 'pull', pattern: 'vertical_pull', label: 'Pull-Up', re: /trazion|pull-?up|lat machine|chin-?up/i },
    { liftKey: 'pull', pattern: 'horizontal_pull', label: 'Row', re: /rematore|\brow\b|pulley/i },
    { liftKey: 'general', pattern: 'unilateral_lower', label: 'Affondo', re: /affond|lunge|bulgar|step-?up/i },
    { liftKey: 'general', pattern: 'olympic', label: 'Olympic Lift', re: /strapp|slancio|snatch|clean and jerk|\bclean\b/i }
  ];

  var REGION_PRIORITY = {
    squat: ['ankle', 'hip', 'trunk'],
    deadlift: ['hip', 'adductor', 'ankle', 'trunk', 'posterior_chain'],
    bench: ['shoulder', 'thoracic', 'scapula', 'trunk'],
    overhead_press: ['thoracic', 'shoulder', 'scapula'],
    pull: ['shoulder', 'scapula', 'thoracic', 'grip'],
    general: ['ankle', 'hip', 'trunk', 'shoulder', 'thoracic']
  };

  function classifyExerciseName(name) {
    var n = String(name || '');
    for (var i = 0; i < PATTERN_RULES.length; i++) {
      if (PATTERN_RULES[i].re.test(n)) return PATTERN_RULES[i];
    }
    return { liftKey: 'general', pattern: 'general', label: n || 'Sessione' };
  }

  // Full-body fallback: no single dominant pattern from exercise 1 alone -
  // scan the first few exercises and union their priority regions instead of
  // defaulting to the same generic set every time (spec section 6/23: "FULL
  // BODY: analizzare i primi esercizi e i principali pattern della sessione").
  function classifySession(exercises) {
    var list = Array.isArray(exercises) ? exercises : [];
    var first = list[0] || null;
    var mainName = first ? (first.name || first.title || '') : '';
    var main = classifyExerciseName(mainName);
    if (main.liftKey !== 'general') {
      return { mainLift: mainName, liftKey: main.liftKey, pattern: main.pattern, label: main.label, priorityRegions: REGION_PRIORITY[main.liftKey] };
    }
    var seenLiftKeys = [];
    list.slice(0, 4).forEach(function (ex) {
      var c = classifyExerciseName(ex && (ex.name || ex.title));
      if (c.liftKey !== 'general' && seenLiftKeys.indexOf(c.liftKey) < 0) seenLiftKeys.push(c.liftKey);
    });
    if (!seenLiftKeys.length) {
      return { mainLift: mainName, liftKey: 'general', pattern: 'full_body', label: main.label, priorityRegions: REGION_PRIORITY.general };
    }
    var regions = [];
    seenLiftKeys.forEach(function (k) {
      (REGION_PRIORITY[k] || []).forEach(function (r) { if (regions.indexOf(r) < 0) regions.push(r); });
    });
    return { mainLift: mainName, liftKey: seenLiftKeys[0], pattern: 'full_body', label: main.label, priorityRegions: regions };
  }

  var FATIGUE_COST_WEIGHT = { very_low: 0, low: 1, moderate: 3, high: 5 };

  function scoreExercise(ex, ctx) {
    if (!ex || ex.auto_selectable === false) return -1000;
    var liftScore = (ex.compatible_main_lifts && ex.compatible_main_lifts[ctx.liftKey]) || 0;
    var regionOverlap = (ex.target_regions || []).filter(function (r) { return ctx.priorityRegions.indexOf(r) >= 0; }).length;
    var fatigueCost = FATIGUE_COST_WEIGHT[ex.fatigue_cost] != null ? FATIGUE_COST_WEIGHT[ex.fatigue_cost] : 1;
    var equipmentPenalty = 0;
    if (ctx.availableEquipment && ctx.availableEquipment.length) {
      if (ex.equipment !== 'none' && ctx.availableEquipment.indexOf(ex.equipment) < 0) equipmentPenalty = 1000;
    } else if (ex.equipment !== 'none') {
      equipmentPenalty = 1; // prefer bodyweight when equipment availability is unknown (spec section 36)
    }
    return (liftScore * 3) + (regionOverlap * 2) - fatigueCost - equipmentPenalty;
  }

  function pickTop(library, categories, limit, excludeIds, ctx) {
    return library
      .filter(function (e) { return categories.indexOf(e.category) >= 0 && excludeIds.indexOf(e.id) < 0; })
      .map(function (e) { return { ex: e, score: scoreExercise(e, ctx) }; })
      .filter(function (s) { return s.score > -100; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, limit)
      .map(function (s) { return s.ex; });
  }

  // Ramp-up is calculated from the actual planned working weight, never a
  // fixed table of kg values (spec section 3.8: "Il sistema NON deve usare
  // sempre questi valori"). Step count scales with athlete level; every step
  // stays strictly below the working weight so it never collides with it.
  var RAMP_CURVES = {
    4: { pct: [0.40, 0.60, 0.75, 0.88], reps: [8, 5, 3, 2] },
    5: { pct: [0.35, 0.50, 0.65, 0.80, 0.90], reps: [8, 5, 3, 2, 1] },
    6: { pct: [0.30, 0.45, 0.58, 0.70, 0.80, 0.90], reps: [8, 6, 4, 3, 2, 1] }
  };
  var RAMP_STEP_COUNT_BY_LEVEL = { beginner: 4, intermediate: 5, advanced: 6 };

  function buildRampUp(workingWeight, workingSets, opts) {
    opts = opts || {};
    if (!(Number(workingWeight) > 0)) return [];
    var level = opts.athleteLevel === 'beginner' || opts.athleteLevel === 'advanced' ? opts.athleteLevel : 'intermediate';
    var n = RAMP_STEP_COUNT_BY_LEVEL[level] || 5;
    var curve = RAMP_CURVES[n] || RAMP_CURVES[5];
    var barWeight = Number(opts.emptyBarWeight) > 0 ? Number(opts.emptyBarWeight) : 20;
    var roundTo = Number(opts.roundTo) > 0 ? Number(opts.roundTo) : 2.5;
    var out = [];
    var lastLoad = -1;
    curve.pct.forEach(function (p, i) {
      var raw = workingWeight * p;
      var load = Math.round(raw / roundTo) * roundTo;
      if (load < barWeight) load = barWeight;
      if (load >= workingWeight) load = Math.floor((workingWeight - roundTo) / roundTo) * roundTo;
      if (load > lastLoad && load > 0 && load < workingWeight) {
        out.push({ load: load, reps: curve.reps[i] || 1 });
        lastLoad = load;
      }
    });
    return out;
  }

  function buildExplanation(classification) {
    var regionsText = classification.priorityRegions.join(', ');
    var mainLabel = classification.mainLift || classification.label || 'la sessione';
    return 'Ho selezionato questi esercizi perché la sessione inizia con ' + mainLabel +
      ' e il warm-up dà priorità alla preparazione di ' + regionsText +
      ' e del pattern specifico (' + classification.pattern + ').';
}

  function extractWorkingWeight(mainEx) {
    if (!mainEx) return null;
    var candidates = [mainEx.plannedLoad, mainEx.targetLoad, mainEx.load, mainEx.workingWeight];
    for (var i = 0; i < candidates.length; i++) {
      var n = Number(candidates[i]);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  }

  function itemFromExercise(ex, orderIndex) {
    return {
      exerciseId: ex.id,
      name: ex.name,
      category: ex.category,
      orderIndex: orderIndex,
      sets: ex.default_sets || 1,
      reps: ex.default_reps != null ? ex.default_reps : null,
      durationSeconds: ex.default_duration != null ? ex.default_duration : null,
      restSeconds: ex.default_rest || 0,
      intensity: ex.intensity_type || 'low_fatigue',
      notes: ex.cautions || ''
    };
  }

  // The main entry point. `session` is whatever shape renderTraining() already
  // works with (an object exposing .exercises or .rows); `options` tunes the
  // engine without changing its determinism for the same inputs.
  function generate(session, options) {
    options = options || {};
    var exercises = (session && (session.exercises || session.rows)) || [];
    var classification = classifySession(exercises);
    var ctx = {
      liftKey: classification.liftKey,
      priorityRegions: classification.priorityRegions,
      availableEquipment: Array.isArray(options.availableEquipment) ? options.availableEquipment : null
    };
    var library = (root.WARMUP_EXERCISE_LIBRARY || []).slice();
    var chosen = [];
    var chosenIds = [];
    function add(list) {
      list.forEach(function (e) {
        if (chosenIds.indexOf(e.id) < 0) { chosen.push(e); chosenIds.push(e.id); }
      });
    }

    add(pickTop(library, ['raise'], 1, chosenIds, ctx));
    add(pickTop(library, ['mobility', 'cars'], 2, chosenIds, ctx));
    add(pickTop(library, ['core_stability', 'activation'], 2, chosenIds, ctx));

    var readiness = options.readiness || null; // 'low' | 'medium' | 'high' | null
    var allowPotentiation = !!options.includePotentiation &&
      options.athleteLevel !== 'beginner' &&
      readiness !== 'low' &&
      ['squat', 'deadlift', 'bench', 'overhead_press'].indexOf(classification.liftKey) >= 0;
    if (allowPotentiation) add(pickTop(library, ['potentiation', 'isometric'], 1, chosenIds, ctx));

    add(pickTop(library, ['specific_preparation'], 1, chosenIds, ctx));

    chosen = chosen.slice(0, 7); // spec section 22: target 5-8 items total, leave room for the ramp-up item below

    var items = chosen.map(function (ex, idx) { return itemFromExercise(ex, idx); });

    var mainEx = exercises[0] || null;
    var workingWeight = extractWorkingWeight(mainEx);
    var workingSets = mainEx ? (Number(mainEx.sets) || (Array.isArray(mainEx.sets) ? mainEx.sets.length : null)) : null;
    var rampUp = null;
    if (workingWeight && classification.liftKey !== 'general') {
      var rampSteps = buildRampUp(workingWeight, workingSets, {
        athleteLevel: options.athleteLevel,
        emptyBarWeight: options.emptyBarWeight,
        roundTo: options.roundTo
      });
      if (rampSteps.length) {
        rampUp = { mainLift: classification.mainLift, workingWeight: workingWeight, loadUnit: options.loadUnit || 'kg', steps: rampSteps };
        items.push({
          exerciseId: 'ramp_up_' + classification.liftKey,
          name: (classification.label || classification.mainLift || 'Ramp-Up') + ' Ramp-Up',
          category: 'ramp_up',
          orderIndex: items.length,
          sets: rampSteps.length,
          reps: null,
          durationSeconds: null,
          restSeconds: 60,
          intensity: 'moderate',
          notes: '',
          rampUp: rampSteps
        });
      }
    }

    return {
      source: 'auto_generated',
      mode: 'auto',
      mainLift: classification.mainLift,
      liftKey: classification.liftKey,
      pattern: classification.pattern,
      priorityRegions: classification.priorityRegions,
      items: items,
      rampUp: rampUp,
      explanation: buildExplanation(classification),
      generatedAt: new Date().toISOString()
    };
  }

  root.WarmUpEngine = {
    LIFT_KEYS: LIFT_KEYS,
    REGION_PRIORITY: REGION_PRIORITY,
    classifyExerciseName: classifyExerciseName,
    classifySession: classifySession,
    scoreExercise: scoreExercise,
    buildRampUp: buildRampUp,
    generate: generate
  };
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this));
