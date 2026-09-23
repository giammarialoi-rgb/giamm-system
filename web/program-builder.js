/*
 * Builds one week-1 template - the sessions and the exercises in them - from
 * the training variables (days, split, goal, equipment, experience, audience)
 * and a variant number.
 *
 * It used to pick from twelve hand-written lists of two to four names, so the
 * whole catalogue of programs only ever used 91 exercises out of a library of
 * 215. Here a session is a list of movement slots - open with a squat, then a
 * horizontal push, then a row... - and each slot is filled from the library
 * itself (web/exercise-taxonomy.js), keeping only what the person's equipment
 * and experience allow. Which one it takes is decided by a hash of the
 * variables and the slot, so the same program always comes out the same, and
 * across the catalogue every exercise gets used.
 *
 * Evidence the shape follows: multi-joint work first and heaviest, ~10+ sets
 * per muscle per week (Schoenfeld 2016; 2017 dose-response), effort at RIR 2-3
 * with failure not required (ACSM 2026), frequency chosen by preference at
 * equal volume (Schoenfeld 2019). Main lifts stay the same all program long
 * so load can progress and the skill is trained (specificity; varying them
 * cost strength in Baz-Valle 2019), while the accessory slots rotate every
 * block, which spreads the stimulus across a muscle's regions (Fonseca 2014;
 * Kassiano 2022) without touching what is being measured.
 */
(function (root) {
  'use strict';

  var TAX = root.NURVAN_EXERCISE_TAXONOMY;

  function hash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  var SPLIT_LABEL = { fullbody: 'Full body', monofrequency: 'Monofrequenza', upper_lower: 'Upper/Lower' };

  function sessionNames(split, days) {
    if (split === 'fullbody') {
      return Array.from({ length: days }, function (_, i) { return 'Full Body ' + String.fromCharCode(65 + i); });
    }
    if (split === 'upper_lower') {
      if (days === 2) return ['Upper', 'Lower'];
      if (days === 3) return ['Upper A', 'Lower', 'Upper B'];
      if (days === 4) return ['Upper A', 'Lower A', 'Upper B', 'Lower B'];
      if (days === 5) return ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Upper C'];
      return ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Upper C', 'Lower C'];
    }
    if (days === 2) return ['Torso', 'Gambe + Braccia'];
    if (days === 3) return ['Push', 'Pull', 'Legs'];
    if (days === 4) return ['Petto', 'Dorso', 'Gambe', 'Spalle + Braccia'];
    if (days === 5) return ['Petto', 'Dorso', 'Spalle', 'Gambe', 'Braccia'];
    return ['Petto', 'Dorso', 'Spalle', 'Quadricipiti', 'Catena posteriore', 'Braccia'];
  }

  // A slot says which movement goes there and how it is loaded. `main` slots
  // are the ones a program progresses on and never rotate.
  function slot(pattern, role, opts) {
    var s = { pattern: [].concat(pattern), role: role };
    if (opts) Object.keys(opts).forEach(function (k) { s[k] = opts[k]; });
    return s;
  }

  var UPPER_PULL_ISO = ['deltRear', 'traps', 'pullIso', 'rotator'];
  var CORE_ISO = ['core', 'carry'];

  // What a session gets when the person's equipment has nothing of that
  // movement at all: the nearest thing that trains the same muscles.
  var PATTERN_FALLBACK = {
    biceps: ['pullH', 'pullV'],
    triceps: ['pushH', 'pushV'],
    deltLat: ['deltRear', 'pushV'],
    deltFront: ['deltLat', 'pushV'],
    deltRear: ['pullH', 'deltLat'],
    rotator: ['deltRear'],
    traps: ['deltRear', 'pullH'],
    chestIso: ['pushH'],
    pullIso: ['pullH', 'pullV'],
    quadIso: ['lunge', 'squat'],
    hamIso: ['hinge', 'glute'],
    calf: ['lunge'],
    glute: ['hinge', 'lunge'],
    lunge: ['squat', 'glute'],
    carry: ['core'],
    pullV: ['pullH'],
    pushV: ['pushH'],
    adductor: ['lunge'],
    forearm: ['biceps'],
    mobility: ['core']
  };

  // The equipment the program is built around comes first; the rest of what is
  // available is still used, but only when the first choice has nothing left.
  // This is why a gym program opens on a barbell and not on a band.
  var EQUIP_PREFERENCE = {
    palestra: ['barbell', 'machine', 'cable', 'smith', 'dumbbell', 'bar', 'bench', 'plate', 'tool'],
    casa: ['dumbbell', 'kettlebell', 'band', 'bench', 'bar'],
    minimal: ['dumbbell', 'band'],
    kettlebell: ['kettlebell'],
    bodyweight: ['bodyweight', 'bar']
  };

  function recipeFor(sessionName, split, days, audience, goal) {
    var n = String(sessionName).toLowerCase();
    var female = audience === 'female';
    var male = audience === 'male';
    var out = [];

    if (split === 'fullbody') {
      out.push(slot('squat', 'main'));
      out.push(slot('pushH', 'main'));
      out.push(slot('pullH', 'main'));
      out.push(slot(['hinge', 'glute'], 'main'));
      out.push(slot('pushV', 'secondary'));
      out.push(female ? slot('glute', 'secondary') : slot('pullV', 'main'));
      if (female) out.push(slot('lunge', 'secondary'));
      if (male) out.push(slot(['chestIso', 'deltLat'], 'iso'));
      out.push(slot(CORE_ISO, 'iso'));
      return out;
    }

    // A torso day, however it is written: the two-day split calls it
    // "Torso", and the condition used to ask for the word "gambe" as well, so
    // the session fell through to the mixed recipe at the bottom and opened
    // on a squat.
    if (/torso/.test(n) && !/gambe \+ braccia/.test(n)) {
      return [
        slot('pushH', 'main'), slot('pullH', 'main'), slot('pushV', 'secondary'),
        slot('pullV', 'main'), slot('deltLat', 'iso'), slot(['biceps', 'triceps'], 'iso')
      ];
    }
    if (/gambe \+ braccia/.test(n)) {
      return [
        slot('squat', 'main'), slot(['hinge', 'glute'], 'main'), slot('lunge', 'secondary'),
        slot(['quadIso', 'hamIso'], 'iso'), slot('biceps', 'iso'), slot('triceps', 'iso'), slot('calf', 'iso')
      ];
    }

    if (/^upper/.test(n)) {
      out.push(slot('pushH', 'main'));
      out.push(slot('pullV', 'main'));
      out.push(slot('pushV', 'main'));
      out.push(slot('pullH', 'main'));
      out.push(slot('deltLat', 'iso'));
      if (male) out.push(slot(['pushH', 'chestIso'], 'secondary'));
      out.push(slot('biceps', 'iso'));
      out.push(slot('triceps', 'iso'));
      out.push(slot(UPPER_PULL_ISO, 'iso'));
      return out;
    }
    if (/^lower/.test(n)) {
      out.push(slot('squat', 'main'));
      out.push(slot(female ? 'glute' : 'hinge', 'main'));
      out.push(slot(female ? 'hinge' : 'lunge', 'secondary'));
      out.push(slot('quadIso', 'iso'));
      out.push(slot('hamIso', 'iso'));
      if (female) out.push(slot('glute', 'iso'));
      out.push(slot('calf', 'iso'));
      return out;
    }

    if (/push/.test(n)) {
      return [
        slot('pushH', 'main'), slot('pushV', 'main'), slot(['pushH'], 'secondary'),
        slot('chestIso', 'iso'), slot('deltLat', 'iso'), slot('triceps', 'iso')
      ];
    }
    if (/pull/.test(n)) {
      return [
        slot('pullV', 'main'), slot('pullH', 'main'), slot(['pullH'], 'secondary'),
        slot('deltRear', 'iso'), slot('biceps', 'iso'), slot(['pullIso', 'traps'], 'iso')
      ];
    }
    if (/legs|^gambe/.test(n)) {
      out.push(slot('squat', 'main'));
      out.push(slot(['hinge', 'glute'], 'main'));
      out.push(slot('lunge', 'secondary'));
      out.push(slot('quadIso', 'iso'));
      out.push(slot('hamIso', 'iso'));
      if (female) out.push(slot('glute', 'iso'));
      out.push(slot('calf', 'iso'));
      return out;
    }

    if (/petto/.test(n)) {
      return [
        slot('pushH', 'main'), slot('pushH', 'main', { second: true }), slot(['pushH', 'chestIso'], 'secondary'),
        slot('chestIso', 'iso'), slot('triceps', 'iso')
      ];
    }
    if (/dorso/.test(n)) {
      return [
        slot('pullV', 'main'), slot('pullH', 'main'), slot('pullH', 'main', { second: true }),
        slot(['pullIso', 'deltRear'], 'iso'), slot('biceps', 'iso')
      ];
    }
    if (/spalle \+/.test(n)) {
      return [
        slot('pushV', 'main'), slot('deltLat', 'iso'), slot('biceps', 'iso'),
        slot('triceps', 'iso'), slot('deltRear', 'iso')
      ];
    }
    if (/spalle/.test(n)) {
      return [
        slot('pushV', 'main'), slot(['pushV', 'deltLat'], 'secondary'), slot('deltLat', 'iso'),
        slot('deltRear', 'iso'), slot(['deltFront', 'traps', 'rotator'], 'iso')
      ];
    }
    if (/braccia/.test(n)) {
      return [
        slot('triceps', 'secondary'), slot('biceps', 'iso'), slot('triceps', 'iso'),
        slot('biceps', 'iso', { second: true }), slot(['forearm', 'triceps'], 'iso')
      ];
    }
    if (/quadricipiti|quad/.test(n)) {
      return [
        slot('squat', 'main'), slot('squat', 'main', { second: true }), slot('lunge', 'secondary'),
        slot('quadIso', 'iso'), slot('calf', 'iso')
      ];
    }
    if (/posteriore|catena/.test(n)) {
      out.push(slot('hinge', 'main'));
      out.push(slot('glute', 'main'));
      out.push(slot('hamIso', 'secondary'));
      out.push(slot('lunge', 'secondary'));
      if (female) out.push(slot('glute', 'iso'));
      out.push(slot(['calf', 'core'], 'iso'));
      return out;
    }

    // Anything else: a balanced upper/lower mix rather than nothing.
    return [
      slot('squat', 'main'), slot('pushH', 'main'), slot('pullH', 'main'),
      slot(['hinge', 'glute'], 'main'), slot(CORE_ISO, 'iso')
    ];
  }

  /*
   * Muscle priority.
   *
   * The movements each macro group is trained by - the whole list, compounds
   * included, which is how a session is recognised as training that muscle at
   * all - and the single-joint ones, which are what an extra slot can be.
   *
   * The group ids are the app's own six (PETTO, DORSO, SPALLE, BRACCIA,
   * GAMBE, ADDOME), the same ones the muscle map and the athlete profile use.
   * There is deliberately no GLUTEI here: the app folds glutes into GAMBE
   * everywhere else, and a chip that says one thing while the program does
   * another is worse than no chip.
   */
  var FOCUS_TRAINED_BY = {
    PETTO: ['pushH', 'chestIso'],
    DORSO: ['pullH', 'pullV', 'pullIso', 'traps'],
    SPALLE: ['pushV', 'deltLat', 'deltRear', 'deltFront', 'rotator'],
    BRACCIA: ['biceps', 'triceps', 'forearm'],
    GAMBE: ['squat', 'hinge', 'glute', 'lunge', 'quadIso', 'hamIso', 'calf', 'adductor'],
    ADDOME: ['core', 'carry']
  };

  var FOCUS_EXTRA_SLOT = {
    PETTO: ['chestIso'],
    DORSO: ['pullIso', 'traps'],
    SPALLE: ['deltLat', 'deltRear'],
    BRACCIA: ['biceps', 'triceps'],
    GAMBE: ['quadIso', 'hamIso', 'glute'],
    ADDOME: ['core']
  };

  function focusList(focus) {
    if (!Array.isArray(focus)) return [];
    var out = [];
    focus.forEach(function (raw) {
      var id = String(raw || '').toUpperCase();
      if (FOCUS_TRAINED_BY[id] && out.indexOf(id) < 0) out.push(id);
    });
    return out;
  }

  function slotTrains(s, group) {
    var want = FOCUS_TRAINED_BY[group] || [];
    return (s.pattern || []).some(function (p) { return want.indexOf(p) >= 0; });
  }

  /*
   * Gives the chosen muscles a slot more per session and the others a slot
   * less. It is a swap, not an addition: the session keeps the length the
   * goal and the split decided for it.
   *
   * Two things it will not do. It never touches a `main` slot, because that
   * is the lift the whole program progresses on. And it never puts a muscle
   * into a session that was not already training it - a leg day does not grow
   * a curl because somebody picked Braccia. A focus that a session has no
   * business with simply does nothing there, and lands where it belongs.
   */
  function applyFocus(slots, sessionName, params, maxSlots) {
    var focus = focusList(params.focus);
    if (!focus.length) return slots;
    var out = slots.slice();
    var seed = [params.days, params.split, params.goal, params.equipment,
      params.experience, params.audience, params.variant || 0, sessionName].join('|');
    // A session grows by at most one exercise however many muscles were
    // picked: a priority is not a licence to make every day longer. Which of
    // the picked muscles gets that one slot rotates from session to session,
    // so three priorities over three days get one each instead of the first
    // one taking all of them.
    var grown = false;
    var order = focus.slice();
    if (order.length > 1) {
      var turn = hash(seed) % order.length;
      order = order.slice(turn).concat(order.slice(0, turn));
    }

    order.forEach(function (group, fi) {
      // Only where the session already trains it - except the core, which is
      // the one group that belongs to every session whatever it is about.
      // Without this exception "Addominali" would do nothing at all on an
      // Upper/Lower or a PPL split, whose recipes have no core slot: the
      // person ticks a chip and the program comes out identical.
      if (group !== 'ADDOME' && !out.some(function (s) { return slotTrains(s, group); })) return;
      var patterns = FOCUS_EXTRA_SLOT[group] || [];
      if (!patterns.length) return;
      var at = hash(seed + '#focus#' + group + '#' + fi) % patterns.length;
      var extra = slot(patterns[at], 'iso', { focus: group });

      // What can give up a slot: single-joint work for a muscle nobody asked
      // for. Taken from the end, where the least important work sits.
      for (var i = out.length - 1; i >= 0; i--) {
        var s = out[i];
        if (s.role !== 'iso') continue;
        if (focus.some(function (g) { return slotTrains(s, g); })) continue;
        out[i] = extra;
        return;
      }

      // Nothing to take from: a leg day is already all legs, and a full body
      // day is compounds from start to finish. Here the slot is added rather
      // than swapped, because the alternative is a chip that does nothing.
      // Never onto a session that is already over its own length.
      if (!grown && out.length <= maxSlots) {
        out.push(extra);
        grown = true;
      }
    });
    return out;
  }

  // The small stuff that keeps a body working and that no session is about.
  // It still belongs to the half of the body the session trains: an adductor
  // machine or a tibialis raise in an upper day is somebody else's session,
  // and a shoulder external rotation in a leg day is the same mistake.
  var PREHAB_UPPER = ['rotator', 'forearm', 'neck', 'mobility'];
  var PREHAB_LOWER = ['tibialis', 'adductor', 'mobility'];
  var PREHAB_ANY = ['rotator', 'forearm', 'tibialis', 'adductor', 'neck', 'mobility'];

  function prehabFor(sessionName, isFullBody) {
    var n = String(sessionName).toLowerCase();
    if (isFullBody || /full body/.test(n)) return PREHAB_ANY;
    if (/lower|gambe|legs|quad|posteriore|catena|glutei/.test(n)) return PREHAB_LOWER;
    return PREHAB_UPPER;
  }

  // What the person's history and goal add to a session, on top of the
  // movements the session is about.
  //   - an explosive lift opens a lower-body or full-body day for advanced
  //     strength work, where it belongs and nowhere else;
  //   - a conditioning finisher closes a session in a cut;
  //   - advanced lifters get one slot for the small stuff that keeps
  //     shoulders, forearms, ankles and neck in the program at all.
  function addForProfile(slots, sessionName, params, maxSlots) {
    var n = String(sessionName).toLowerCase();
    var isLower = /lower|gambe|legs|quad|posteriore|catena/.test(n);
    var isFullBody = params.split === 'fullbody';
    var out = slots.slice();
    // One session of the week, not every one, so the week keeps its shape.
    var pick = hash([params.days, params.split, params.goal, params.equipment, params.experience, params.audience, params.variant].join('|'));
    if (params.experience === 'avanzato' && (params.goal === 'forza' || params.goal === 'powerbuilding') && (isLower || isFullBody)) {
      out.unshift(slot('power', 'main'));
      if (out.length > maxSlots + 1) out.length = maxSlots + 1;
      return out;
    }
    if (params.goal === 'cut') {
      out.push(slot('conditioning', 'secondary'));
    } else if (params.experience === 'avanzato' && (pick % 3 === 0 || /spalle|braccia|upper|full body/.test(n))) {
      out.push(slot(prehabFor(sessionName, isFullBody), 'iso'));
    }
    if (out.length > maxSlots + 1) out.length = maxSlots + 1;
    return out;
  }

  // Goal shapes how much of the session is loaded heavy: strength work keeps
  // the multi-joint slots and drops the last single-joint ones; a cut keeps
  // the volume up and adds core work.
  function trimForGoal(slots, goal, days, split, experience) {
    var list = slots.slice();
    var max = split === 'fullbody' ? (days >= 6 ? 4 : (days >= 5 ? 5 : 6)) : (days >= 6 ? 5 : 6);
    if (goal === 'forza') {
      // Heavy work first and fewer single-joint exercises, but never so few
      // that a session is two exercises long: an arms-and-shoulders day is
      // single-joint work by nature.
      var compounds = list.filter(function (s) { return s.role !== 'iso'; }).length;
      var isoAllowed = Math.max(experience === 'principiante' ? 2 : 1, 4 - compounds);
      var isoCount = 0;
      list = list.filter(function (s) {
        if (s.role !== 'iso') return true;
        isoCount += 1;
        return isoCount <= isoAllowed;
      });
      max = Math.min(max, 5);
    } else if (goal === 'cut') {
      if (list.length < max) list.push(slot(CORE_ISO, 'iso'));
    } else if (goal === 'powerbuilding') {
      max = Math.min(max, 6);
    }
    if (list.length > max) list.length = max;
    return list;
  }

  function schemeFor(goal, experience, role) {
    var beginner = experience === 'principiante';
    var compound = role !== 'iso';
    if (goal === 'forza' && compound) {
      return { sets: beginner ? 3 : 4, reps: '4-6', rir: 2, rest: 180, tempo: '10X0' };
    }
    if (goal === 'powerbuilding' && compound) {
      return { sets: 4, reps: '5-8', rir: 2, rest: 150, tempo: '2010' };
    }
    if (goal === 'cut') {
      return compound
        ? { sets: 3, reps: '8-12', rir: 2, rest: 75, tempo: '2010' }
        : { sets: 2, reps: '12-15', rir: 2, rest: 45, tempo: '3010' };
    }
    if (compound) {
      return { sets: beginner ? 3 : 4, reps: '6-10', rir: 2, rest: 120, tempo: '3010' };
    }
    return { sets: beginner ? 2 : 3, reps: '10-15', rir: 2, rest: 75, tempo: '3010' };
  }

  // Everything a slot could hold: the movements it asks for, then the nearest
  // ones if the person's equipment has none of them. Roles in order, so a
  // heavy slot is filled with a lift that can be loaded and a single-joint
  // slot prefers single-joint work.
  // Choices for a slot, in groups tried in order: the movement the session
  // asked for with the right role first, then that movement in a neighbouring
  // role, and only if the person's equipment has none of it at all, the
  // nearest movements. Without the order a biceps slot could be filled with a
  // row and a shoulder press slot with a chest press.
  function candidateGroups(s, equipment, experience) {
    var roleOrder = s.role === 'main'
      ? [['main'], ['secondary']]
      : (s.role === 'secondary' ? [['secondary'], ['main'], ['iso']] : [['iso'], ['secondary']]);
    var groups = [];
    function add(patterns) {
      roleOrder.forEach(function (roles) {
        var g = [];
        patterns.forEach(function (p) {
          TAX.poolFor(equipment, experience, p, roles).forEach(function (e) {
            if (g.indexOf(e) < 0) g.push(e);
          });
        });
        if (g.length) groups.push(g);
      });
    }
    add(s.pattern);
    var fallback = [];
    s.pattern.forEach(function (p) {
      (PATTERN_FALLBACK[p] || []).forEach(function (q) {
        if (s.pattern.indexOf(q) < 0 && fallback.indexOf(q) < 0) fallback.push(q);
      });
    });
    if (fallback.length) add(fallback);
    return groups;
  }

  function isPreferredEquip(e, tier) {
    if (tier.indexOf(e.equip) >= 0) return true;
    return (e.also || []).some(function (x) { return tier.indexOf(x) >= 0; });
  }

  // Splits the candidates into the equipment the program is built around and
  // everything else, so the first choice always comes from the former.
  function preferred(list, equipment) {
    var tier = EQUIP_PREFERENCE[equipment] || EQUIP_PREFERENCE.palestra;
    var first = list.filter(function (e) { return isPreferredEquip(e, tier); });
    return first.length ? first : list;
  }

  function buildSession(params, sessionName, sessionIndex) {
    var base = trimForGoal(
      recipeFor(sessionName, params.split, params.days, params.audience, params.goal),
      params.goal, params.days, params.split, params.experience
    );
    var slots = applyFocus(addForProfile(base, sessionName, params, base.length), sessionName, params, base.length);
    var seed = [params.days, params.split, params.goal, params.equipment, params.experience, params.audience, params.variant || 0].join('|');
    var used = {};
    var exercises = [];

    slots.forEach(function (s, slotIndex) {
      var groups = candidateGroups(s, params.equipment, params.experience);
      var free = [];
      for (var gi = 0; gi < groups.length && !free.length; gi++) {
        free = groups[gi].filter(function (e) { return !used[e.name]; });
      }
      // Nothing left that this session does not already have: leave the slot
      // out rather than writing the same exercise down twice.
      if (!free.length) return;
      var list = preferred(free, params.equipment);
      // A strength block is built on lifts that can be loaded in small steps
      // for months: the barbell ones, where there are any.
      if (s.role === 'main' && (params.goal === 'forza' || params.goal === 'powerbuilding')) {
        var barbell = list.filter(function (e) { return e.equip === 'barbell'; });
        if (barbell.length) list = barbell;
      }
      var at = hash(seed + '#' + sessionIndex + '#' + slotIndex + (s.second ? '#b' : '')) % list.length;
      var chosen = list[at];
      used[chosen.name] = true;

      // Accessory slots carry the exercises the later blocks rotate to; the
      // main lifts do not, so progression stays measurable on the same lift.
      var alts = [];
      if (s.role !== 'main') {
        var rest = list.filter(function (e) { return e.name !== chosen.name && !used[e.name]; });
        for (var k = 1; k <= 2 && rest.length; k++) {
          var pickAt = hash(seed + '#' + sessionIndex + '#' + slotIndex + '#alt' + k) % rest.length;
          var alt = rest.splice(pickAt, 1)[0];
          used[alt.name] = true;
          alts.push(alt.name);
        }
      }

      var scheme = schemeFor(params.goal, params.experience, s.role);
      exercises.push({
        name: chosen.name,
        sets_count: scheme.sets,
        reps_target: scheme.reps,
        rir: scheme.rir,
        rest_sec: scheme.rest,
        tempo: scheme.tempo,
        role: s.role === 'iso' ? 'accessory' : 'compound',
        // The lift this slot progresses on: never swapped between blocks.
        progressed: s.role === 'main' ? true : undefined,
        // The lift this slot progresses on: it is never swapped between blocks.
        progressed: s.role === 'main' ? true : undefined,
        alts: alts.length ? alts : undefined
      });
    });

    // A session with no heavy slot at all - an arms day is single-joint work
    // by nature - still needs one exercise that stays put, so there is
    // something to add load to week after week: its opener.
    if (exercises.length && !exercises.some(function (e) { return e.progressed; })) {
      exercises[0].progressed = true;
      delete exercises[0].alts;
    }

    // With little equipment a session can run out of movements to ask for
    // (a chest day with only push-ups). Rather than a two-exercise session,
    // top it up with whatever the person does have and has not done yet.
    var minExercises = Math.min(4, slots.length);
    if (exercises.length < minExercises) {
      var fillPatterns = [];
      slots.forEach(function (s) {
        s.pattern.forEach(function (p) {
          if (fillPatterns.indexOf(p) < 0) fillPatterns.push(p);
          (PATTERN_FALLBACK[p] || []).forEach(function (q) { if (fillPatterns.indexOf(q) < 0) fillPatterns.push(q); });
        });
      });
      if (fillPatterns.indexOf('core') < 0) fillPatterns.push('core');
      var filler = fillPatterns
        .reduce(function (acc, p) {
          return acc.concat(TAX.poolFor(params.equipment, params.experience, p, null));
        }, [])
        .filter(function (e) { return !used[e.name]; });
      for (var f = 0; f < filler.length && exercises.length < minExercises; f++) {
        var extra = filler[hash(seed + '#' + sessionIndex + '#fill' + f) % filler.length];
        if (!extra || used[extra.name]) continue;
        used[extra.name] = true;
        var sc = schemeFor(params.goal, params.experience, extra.role);
        exercises.push({
          name: extra.name,
          sets_count: sc.sets,
          reps_target: sc.reps,
          rir: sc.rir,
          rest_sec: sc.rest,
          tempo: sc.tempo,
          role: extra.role === 'iso' ? 'accessory' : 'compound'
        });
      }
    }

    return { name: sessionName, exercises: exercises };
  }

  function buildTemplateSessions(params) {
    return sessionNames(params.split, params.days).map(function (name, i) {
      return buildSession(params, name, i);
    });
  }

  root.NurvanProgramBuilder = {
    sessionNames: sessionNames,
    buildTemplateSessions: buildTemplateSessions,
    schemeFor: schemeFor,
    SPLIT_LABEL: SPLIT_LABEL,
    hash: hash
  };
})(typeof self !== 'undefined' ? self : this);
