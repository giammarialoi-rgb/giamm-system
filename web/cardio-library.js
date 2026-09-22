/*
 * Cardio and conditioning, which the strength library had no room for.
 *
 * A squat is sets and reps. Ten minutes on the rower is not: what is worth
 * writing down is how long, and then - only if the athlete cares - how far,
 * how many calories, what heart rate, what level. So these exercises carry
 * their own prescription shape, and the app asks for the minutes and nothing
 * else unless asked.
 *
 * They are deliberately kept out of web/exercise-taxonomy.js: that file feeds
 * the program generator, which builds strength sessions out of movement
 * slots, and a treadmill has no business being drawn as a horizontal push.
 * Cardio is chosen by a person - written into a day, or dropped into a
 * circuit - and never guessed into a program.
 *
 * `interval: true` marks what works in a Tabata or an interval circuit:
 * twenty seconds of an air bike is a round, twenty seconds of a treadmill is
 * mostly the belt getting up to speed.
 */
(function (root) {
  'use strict';

  // kind      machine | tool | bodyweight | outdoor
  // logs      the optional fields worth offering for that exercise; the
  //           duration is always there and is the only one ever required
  var CARDIO = [
    { name: 'Tapis roulant', en: 'Treadmill', kind: 'machine', minutes: 20, logs: ['distance', 'kcal', 'hr', 'incline', 'speed'], interval: false },
    { name: 'Cyclette', en: 'Stationary bike', kind: 'machine', minutes: 20, logs: ['distance', 'kcal', 'hr', 'level', 'rpm'], interval: true },
    { name: 'Spin bike', en: 'Spin bike', kind: 'machine', minutes: 20, logs: ['kcal', 'hr', 'level', 'rpm'], interval: true },
    { name: 'Air bike', en: 'Assault bike', kind: 'machine', minutes: 10, logs: ['kcal', 'hr', 'rpm'], interval: true },
    { name: 'Ellittica', en: 'Elliptical', kind: 'machine', minutes: 20, logs: ['distance', 'kcal', 'hr', 'level'], interval: false },
    { name: 'Vogatore', en: 'Rowing machine', kind: 'machine', minutes: 15, logs: ['distance', 'kcal', 'hr', 'level'], interval: true },
    { name: 'Ski erg', en: 'Ski erg', kind: 'machine', minutes: 10, logs: ['distance', 'kcal', 'hr'], interval: true },
    { name: 'Stair climber', en: 'Stair climber', kind: 'machine', minutes: 15, logs: ['kcal', 'hr', 'level'], interval: false },
    { name: 'Tapis roulant in pendenza', en: 'Incline walk', kind: 'machine', minutes: 30, logs: ['distance', 'kcal', 'hr', 'incline', 'speed'], interval: false },

    { name: 'Salto della corda', en: 'Jump rope', kind: 'tool', minutes: 10, logs: ['kcal', 'hr', 'reps'], interval: true },
    { name: 'Battle rope', en: 'Battle ropes', kind: 'tool', minutes: 8, logs: ['hr'], interval: true },
    { name: 'Sled push', en: 'Sled push', kind: 'tool', minutes: 10, logs: ['distance', 'hr'], interval: true },
    { name: 'Sled pull', en: 'Sled pull', kind: 'tool', minutes: 10, logs: ['distance', 'hr'], interval: true },

    { name: 'Burpees', en: 'Burpees', kind: 'bodyweight', minutes: 6, logs: ['reps', 'hr'], interval: true },
    { name: 'Jumping jack', en: 'Jumping jacks', kind: 'bodyweight', minutes: 5, logs: ['reps', 'hr'], interval: true },
    { name: 'Mountain climber', en: 'Mountain climbers', kind: 'bodyweight', minutes: 5, logs: ['reps', 'hr'], interval: true },
    { name: 'High knees', en: 'High knees', kind: 'bodyweight', minutes: 4, logs: ['hr'], interval: true },
    { name: 'Skater jump', en: 'Skater jumps', kind: 'bodyweight', minutes: 5, logs: ['reps', 'hr'], interval: true },
    { name: 'Box jump', en: 'Box jumps', kind: 'bodyweight', minutes: 6, logs: ['reps', 'hr'], interval: true },
    { name: 'Squat jump', en: 'Squat jumps', kind: 'bodyweight', minutes: 5, logs: ['reps', 'hr'], interval: true },
    { name: 'Shuttle run', en: 'Shuttle run', kind: 'bodyweight', minutes: 8, logs: ['distance', 'hr'], interval: true },

    { name: 'Corsa', en: 'Running', kind: 'outdoor', minutes: 30, logs: ['distance', 'kcal', 'hr', 'pace'], interval: false },
    { name: 'Camminata veloce', en: 'Brisk walk', kind: 'outdoor', minutes: 40, logs: ['distance', 'kcal', 'hr'], interval: false },
    { name: 'Bici', en: 'Cycling', kind: 'outdoor', minutes: 45, logs: ['distance', 'kcal', 'hr', 'pace'], interval: false },
    { name: 'Nuoto', en: 'Swimming', kind: 'outdoor', minutes: 30, logs: ['distance', 'kcal', 'hr'], interval: false }
  ];

  var LOG_FIELDS = {
    distance: { label: 'Distanza', unit: 'km', step: '0.01' },
    kcal: { label: 'Calorie', unit: 'kcal', step: '1' },
    hr: { label: 'FC media', unit: 'bpm', step: '1' },
    level: { label: 'Livello', unit: '', step: '1' },
    incline: { label: 'Pendenza', unit: '%', step: '0.5' },
    speed: { label: 'Velocità', unit: 'km/h', step: '0.1' },
    rpm: { label: 'RPM', unit: '', step: '1' },
    pace: { label: 'Passo', unit: 'min/km', step: '0.1' },
    reps: { label: 'Ripetizioni', unit: '', step: '1' }
  };

  // Interval formats worth having ready. Tabata is the one with a paper
  // behind it (Tabata 1996: 20 on, 10 off, eight rounds, at an intensity
  // nobody holds for a ninth); the rest are the shapes people actually use.
  var FORMATS = [
    { id: 'tabata', label: 'Tabata', work: 20, rest: 10, rounds: 8, note: 'Tabata 1996: 8 round, intensità massimale' },
    { id: 'emom', label: 'EMOM 10\'', work: 60, rest: 0, rounds: 10, note: 'Ogni minuto al via, il resto è recupero' },
    { id: 'hiit_30_30', label: 'HIIT 30/30', work: 30, rest: 30, rounds: 10, note: 'Lavoro e recupero uguali' },
    { id: 'hiit_40_20', label: 'HIIT 40/20', work: 40, rest: 20, rounds: 8, note: 'Più lavoro che recupero' },
    { id: 'circuit_45_15', label: 'Circuito 45/15', work: 45, rest: 15, rounds: 6, note: 'Giro continuo su più stazioni' },
    { id: 'sprint_15_45', label: 'Sprint 15/45', work: 15, rest: 45, rounds: 10, note: 'Massimale breve, recupero lungo' }
  ];

  function fold(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  var BY_NAME = {};
  CARDIO.forEach(function (c) {
    BY_NAME[fold(c.name)] = c;
    if (c.en) BY_NAME[fold(c.en)] = c;
  });

  function find(name) {
    return BY_NAME[fold(name)] || null;
  }

  // Exercises measured in seconds rather than reps. Named, not guessed: a
  // "hold" is a hold, a carry is a carry, and everything else is reps until
  // somebody says otherwise.
  var TIME_PATTERNS = [
    /\bplank\b/i, /\bhold\b/i, /\bhollow\b/i, /\bhang\b/i, /\bisometri/i,
    /\bwall\s*sit\b/i, /\bcarry\b/i, /\bfarmer\b/i, /\bsuitcase\b/i,
    /\bdead\s*hang\b/i, /\bbird\s*dog\b/i, /\bside\s*plank\b/i, /\bhandstand\b/i
  ];

  function defaultUnitFor(name) {
    if (find(name)) return 'cardio';
    var clean = String(name || '');
    for (var i = 0; i < TIME_PATTERNS.length; i++) {
      if (TIME_PATTERNS[i].test(clean)) return 'time';
    }
    return 'reps';
  }

  root.NurvanCardio = {
    LIST: CARDIO,
    FORMATS: FORMATS,
    LOG_FIELDS: LOG_FIELDS,
    find: find,
    isCardio: function (name) { return !!find(name); },
    defaultUnitFor: defaultUnitFor,
    logFieldsFor: function (name) {
      var c = find(name);
      return c ? c.logs.slice() : ['distance', 'kcal', 'hr'];
    },
    fieldLabel: function (id) { return (LOG_FIELDS[id] && LOG_FIELDS[id].label) || id; },
    fieldUnit: function (id) { return (LOG_FIELDS[id] && LOG_FIELDS[id].unit) || ''; },
    fieldStep: function (id) { return (LOG_FIELDS[id] && LOG_FIELDS[id].step) || '1'; },
    intervalReady: function () { return CARDIO.filter(function (c) { return c.interval; }); },
    formatById: function (id) {
      for (var i = 0; i < FORMATS.length; i++) if (FORMATS[i].id === id) return FORMATS[i];
      return FORMATS[0];
    }
  };
})(typeof self !== 'undefined' ? self : this);
