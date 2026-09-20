/*
 * The catalogue of ready-made programs, as a description instead of a list.
 *
 * It used to ship as two files: every program written out row by row
 * (48 MB) plus every week-1 template (12 MB), both downloaded whole by the
 * phone before the library could be shown. A program is a point in a grid -
 * days × split × goal × equipment × experience × audience × duration ×
 * progression × exercise selection - and everything about it can be worked
 * out from that point, so the grid is all that ships and the program itself is
 * built when someone actually opens it (web/program-builder.js).
 *
 * The id is that point, readable: sci2-4-upper_lower-ipertrofia-palestra-
 * intermedio-female-12-dup-c. An id from an older catalogue (sci_000123) no
 * longer resolves, which only means a saved shortcut needs picking again; a
 * program already activated lives in the user's own record, untouched.
 */
(function (root) {
  'use strict';

  var DAYS = [2, 3, 4, 5, 6];
  var SPLITS = ['fullbody', 'monofrequency', 'upper_lower'];
  var GOALS = ['ipertrofia', 'forza', 'powerbuilding', 'recomp', 'cut'];
  var EQUIPMENT = ['palestra', 'casa', 'minimal', 'kettlebell', 'bodyweight'];
  var EXPERIENCE = ['principiante', 'intermedio', 'avanzato'];
  var AUDIENCE = [
    { id: 'unisex', sex: 'unisex', label: 'Unisex', focusBoost: null },
    { id: 'female', sex: 'female_glute', label: 'Donna', focusBoost: 'glutei' },
    { id: 'male', sex: 'male_upper', label: 'Uomo', focusBoost: 'petto' }
  ];
  var DURATIONS = [4, 6, 8, 10, 12, 16];
  var PROGRESSIONS = ['linear', 'double', 'volume_wave', 'dup', 'block'];
  var PROG_LABEL = {
    linear: 'Lineare', double: 'Doppia progressione', volume_wave: 'Onda volume', dup: 'DUP', block: 'Blocchi'
  };
  var SPLIT_LABEL = { fullbody: 'Full body', monofrequency: 'Monofrequenza', upper_lower: 'Upper/Lower' };
  // Each variant is a different draw of exercises from the library for the same
  // plan, so the same request has several honest answers instead of one.
  var VARIANTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  var VARIANT_LABEL = { a: 'A', b: 'B', c: 'C', d: 'D', e: 'E', f: 'F', g: 'G', h: 'H' };

  var NOTES = [
    'Volume settimanale target ≥10 serie/muscolo (Schoenfeld 2016; umbrella review 2022).',
    'Frequenza scelta per preferenza: a volume equated la crescita è simile (Schoenfeld 2019 JSS).',
    'Sforzo RIR 2–3; failure non obbligatorio (ACSM Position Stand 2026).',
    'Compound first. Carichi in %/RIR, non kg personali.',
    'Fondamentali fissi per tutto il programma; complementari ruotati a ogni blocco (Fonseca 2014; Kassiano 2022).'
  ];

  function audienceById(id) {
    for (var i = 0; i < AUDIENCE.length; i++) if (AUDIENCE[i].id === id) return AUDIENCE[i];
    return AUDIENCE[0];
  }

  function idFor(p) {
    return ['sci2', p.days, p.split, p.goal, p.equipment, p.experience, p.audience, p.duration, p.progression, p.variant].join('-');
  }

  function parseId(id) {
    var s = String(id || '').split('-');
    if (s.length !== 10 || s[0] !== 'sci2') return null;
    var p = {
      days: Number(s[1]), split: s[2], goal: s[3], equipment: s[4], experience: s[5],
      audience: s[6], duration: Number(s[7]), progression: s[8], variant: s[9]
    };
    if (DAYS.indexOf(p.days) < 0 || SPLITS.indexOf(p.split) < 0 || GOALS.indexOf(p.goal) < 0) return null;
    if (EQUIPMENT.indexOf(p.equipment) < 0 || EXPERIENCE.indexOf(p.experience) < 0) return null;
    if (!audienceById(p.audience) || p.audience !== audienceById(p.audience).id) return null;
    if (DURATIONS.indexOf(p.duration) < 0 || PROGRESSIONS.indexOf(p.progression) < 0) return null;
    if (VARIANTS.indexOf(p.variant) < 0) return null;
    return p;
  }

  function goalsFor(p) {
    var aud = audienceById(p.audience);
    var goals = [p.goal];
    if (aud.focusBoost && goals.indexOf(aud.focusBoost) < 0) goals.push(aud.focusBoost);
    if (p.goal === 'cut' && goals.indexOf('dimagrimento') < 0) goals.push('dimagrimento');
    return goals;
  }

  function titleFor(p) {
    var aud = audienceById(p.audience);
    return [
      aud.label, SPLIT_LABEL[p.split], p.goal, p.days + ' gg', p.duration + ' sett',
      PROG_LABEL[p.progression], p.experience, p.equipment, 'sel. ' + VARIANT_LABEL[p.variant]
    ].join(' · ');
  }

  function sessionsFor(p) {
    return root.NurvanProgramBuilder.buildTemplateSessions({
      days: p.days, split: p.split, goal: p.goal, equipment: p.equipment,
      experience: p.experience, audience: p.audience, variant: p.variant
    });
  }

  // The row the library list and the filters work on.
  function rowFor(p, sessions) {
    var aud = audienceById(p.audience);
    var s = sessions || sessionsFor(p);
    var exCount = 0;
    var setCount = 0;
    s.forEach(function (sess) {
      exCount += sess.exercises.length;
      sess.exercises.forEach(function (e) { setCount += e.sets_count; });
    });
    return {
      id: idFor(p),
      title: titleFor(p),
      days_per_week: p.days,
      duration_weeks: p.duration,
      split: p.split,
      goals: goalsFor(p),
      equipment: p.equipment,
      sessions: p.days,
      exercises: exCount,
      sets: setCount,
      purpose: p.goal,
      source: 'science_v2',
      source_ext: '.science',
      experience: p.experience,
      progression_model: p.progression,
      sex_focus: aud.sex,
      audience: aud.id,
      variant: p.variant
    };
  }

  // The week-1 template, built on the spot. The weeks after it come from
  // expandScienceProgramWeeks, as before.
  function bodyFor(id) {
    var p = typeof id === 'string' ? parseId(id) : id;
    if (!p) return null;
    var aud = audienceById(p.audience);
    var sessions = sessionsFor(p);
    var notes = NOTES.slice();
    if (aud.id === 'female') notes.push('Focus femminile: volume glutei/lower + unilaterali.');
    if (aud.id === 'male') notes.push('Focus maschile: volume upper/petto prioritizzato.');
    return {
      id: idFor(p),
      title: titleFor(p),
      weeks: [{ week_number: 1, label: 'Settimana 1 · template', sessions: sessions }],
      days_per_week: p.days,
      duration_weeks: p.duration,
      split: p.split,
      goals: goalsFor(p),
      equipment: p.equipment,
      experience: p.experience,
      purpose: p.goal,
      source: 'science_v2',
      sex_focus: aud.sex,
      audience: aud.id,
      progression_model: p.progression,
      progression: { model: p.progression, deload_every: 4 },
      notes: notes
    };
  }

  function valuesFor(dim, filters) {
    var all = {
      days: DAYS, split: SPLITS, goal: GOALS, equipment: EQUIPMENT, experience: EXPERIENCE,
      audience: AUDIENCE.map(function (a) { return a.id; }), duration: DURATIONS,
      progression: PROGRESSIONS, variant: VARIANTS
    }[dim];
    var want = filters && filters[dim];
    if (want === undefined || want === null || want === '') return all;
    if (dim === 'days' || dim === 'duration') want = Number(want);
    if (dim === 'split' && want === 'full_body') want = 'fullbody';
    return all.indexOf(want) >= 0 ? [want] : all;
  }

  function total(filters) {
    return ['days', 'split', 'goal', 'equipment', 'experience', 'audience', 'duration', 'progression', 'variant']
      .reduce(function (n, dim) { return n * valuesFor(dim, filters).length; }, 1);
  }

  // Walks the grid, narrowed by whatever the filters pin down, and stops as
  // soon as it has enough rows for the screen. Nothing else is ever built.
  function search(filters, limit) {
    var f = filters || {};
    var cap = limit || 150;
    var rows = [];
    var dims = {
      days: valuesFor('days', f), split: valuesFor('split', f), goal: valuesFor('goal', f),
      equipment: valuesFor('equipment', f), experience: valuesFor('experience', f),
      audience: valuesFor('audience', f), duration: valuesFor('duration', f),
      progression: valuesFor('progression', f), variant: valuesFor('variant', f)
    };
    outer:
    for (var a = 0; a < dims.days.length; a++) {
      for (var b = 0; b < dims.split.length; b++) {
        for (var c = 0; c < dims.goal.length; c++) {
          for (var d = 0; d < dims.equipment.length; d++) {
            for (var e = 0; e < dims.experience.length; e++) {
              for (var g = 0; g < dims.audience.length; g++) {
                for (var h = 0; h < dims.variant.length; h++) {
                  for (var i = 0; i < dims.duration.length; i++) {
                    for (var j = 0; j < dims.progression.length; j++) {
                      rows.push(rowFor({
                        days: dims.days[a], split: dims.split[b], goal: dims.goal[c],
                        equipment: dims.equipment[d], experience: dims.experience[e],
                        audience: dims.audience[g], duration: dims.duration[i],
                        progression: dims.progression[j], variant: dims.variant[h]
                      }));
                      if (rows.length >= cap) break outer;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return { rows: rows, total: total(f) };
  }

  function rowById(id) {
    var p = parseId(id);
    return p ? rowFor(p) : null;
  }

  root.NurvanProgramCatalog = {
    DAYS: DAYS, SPLITS: SPLITS, GOALS: GOALS, EQUIPMENT: EQUIPMENT, EXPERIENCE: EXPERIENCE,
    AUDIENCE: AUDIENCE, DURATIONS: DURATIONS, PROGRESSIONS: PROGRESSIONS, VARIANTS: VARIANTS,
    PROG_LABEL: PROG_LABEL, SPLIT_LABEL: SPLIT_LABEL,
    idFor: idFor, parseId: parseId, rowFor: rowFor, rowById: rowById, bodyFor: bodyFor,
    search: search, total: total, titleFor: titleFor
  };
})(typeof self !== 'undefined' ? self : this);
