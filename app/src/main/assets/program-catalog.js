/*
 * The catalogue of ready-made programs, as a description instead of a list.
 *
 * It used to ship as two files: every program written out row by row
 * (48 MB) plus every week-1 template (12 MB), both downloaded whole by the
 * phone before the library could be shown. A program is a point in a grid -
 * days × split × goal × equipment × experience × muscle focus × duration ×
 * progression × exercise selection - and everything about it can be worked
 * out from that point, so the grid is all that ships and the program itself is
 * built when someone actually opens it (web/program-builder.js).
 *
 * The id is that point, readable: sci3-4-upper_lower-ipertrofia-palestra-
 * intermedio-petto_dorso-12-dup-c. An id from an older catalogue (sci_000123)
 * no longer resolves, which only means a saved shortcut needs picking again;
 * a program already activated lives in the user's own record, untouched.
 * The previous grid (sci2) had a "donna / uomo / unisex" axis in this place:
 * its ids still open, as the focus that axis stood for.
 *
 * Muscle focus is none ("bil", balanced), one muscle, two or three: 7 muscles,
 * so 7 + 21 + 35 + 1 = 64 values. A focus gives the chosen muscles more of
 * every session that already trains them (web/program-builder.js applyFocus).
 */
(function (root) {
  'use strict';

  var DAYS = [2, 3, 4, 5, 6];
  var SPLITS = ['fullbody', 'upper_lower', 'monofrequency', 'ppl', 'antagonist', 'torso_limbs', 'hybrid'];
  var GOALS = ['ipertrofia', 'forza', 'powerbuilding', 'recomp', 'cut'];
  var EQUIPMENT = ['palestra', 'casa', 'minimal', 'kettlebell', 'bodyweight'];
  var EXPERIENCE = ['principiante', 'intermedio', 'avanzato'];
  var FOCUS_MUSCLES = [
    { id: 'petto', macro: 'PETTO', label: 'Petto' },
    { id: 'dorso', macro: 'DORSO', label: 'Dorso' },
    { id: 'spalle', macro: 'SPALLE', label: 'Spalle' },
    { id: 'braccia', macro: 'BRACCIA', label: 'Braccia' },
    { id: 'gambe', macro: 'GAMBE', label: 'Gambe' },
    { id: 'glutei', macro: 'GLUTEI', label: 'Glutei' },
    { id: 'addome', macro: 'ADDOME', label: 'Addome' }
  ];
  var FOCUS_NONE = 'bil';
  var FOCUS_MAX = 3;
  var FOCUS_IDS = (function () {
    var ids = [FOCUS_NONE];
    var n = FOCUS_MUSCLES.length;
    var i, j, k;
    for (i = 0; i < n; i++) ids.push(FOCUS_MUSCLES[i].id);
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) ids.push(FOCUS_MUSCLES[i].id + '_' + FOCUS_MUSCLES[j].id);
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) for (k = j + 1; k < n; k++) {
      ids.push(FOCUS_MUSCLES[i].id + '_' + FOCUS_MUSCLES[j].id + '_' + FOCUS_MUSCLES[k].id);
    }
    return ids;
  })();
  var DURATIONS = [4, 6, 8, 10, 12, 16];
  var PROGRESSIONS = ['linear', 'double', 'volume_wave', 'dup', 'block'];
  var PROG_LABEL = {
    linear: 'Lineare', double: 'Doppia progressione', volume_wave: 'Onda volume', dup: 'DUP', block: 'Blocchi'
  };
  var SPLIT_LABEL = {
    fullbody: 'Full body', upper_lower: 'Upper/Lower', monofrequency: 'Monofrequenza',
    ppl: 'Push/Pull/Legs', antagonist: 'Antagonisti', torso_limbs: 'Torso/Arti', hybrid: 'Ibrido'
  };
  var SPLIT_NOTE = {
    fullbody: 'Tutto il corpo a ogni seduta',
    upper_lower: 'Parte alta e parte bassa alternate',
    monofrequency: 'Un distretto per seduta (stile bro split)',
    ppl: 'Spinta, trazione e gambe',
    antagonist: 'Muscoli opposti nella stessa seduta (petto + dorso)',
    torso_limbs: 'Un giorno il busto, un giorno gambe e braccia',
    hybrid: 'Full body e upper/lower insieme'
  };
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

  // The days a split can be written over (the builder knows; this is the same
  // table for when the builder is not loaded yet).
  var SPLIT_DAYS_FALLBACK = {
    fullbody: [2, 3, 4, 5, 6], upper_lower: [2, 3, 4, 5, 6], monofrequency: [2, 3, 4, 5, 6],
    ppl: [3, 4, 5, 6], antagonist: [3, 4, 5, 6], torso_limbs: [3, 4, 5, 6], hybrid: [3, 4, 5, 6]
  };
  function splitDays(split) {
    var b = root.NurvanProgramBuilder;
    var t = (b && b.SPLIT_DAYS) || SPLIT_DAYS_FALLBACK;
    return t[split] || DAYS;
  }
  function splitsForDays(days) {
    return SPLITS.filter(function (s) { return splitDays(s).indexOf(Number(days)) >= 0; });
  }

  // A focus written in any order, with any separator, as the catalogue writes it.
  function focusCanon(raw) {
    if (Array.isArray(raw)) raw = raw.join('_');
    var parts = String(raw || '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
    if (!parts.length || parts.indexOf(FOCUS_NONE) >= 0 && parts.length === 1) return FOCUS_NONE;
    var picked = FOCUS_MUSCLES.filter(function (m) { return parts.indexOf(m.id) >= 0; }).slice(0, FOCUS_MAX);
    return picked.length ? picked.map(function (m) { return m.id; }).join('_') : FOCUS_NONE;
  }
  function focusList(focusId) {
    if (!focusId || focusId === FOCUS_NONE) return [];
    return String(focusId).split('_').filter(function (id) {
      return FOCUS_MUSCLES.some(function (m) { return m.id === id; });
    });
  }
  function focusMacros(focusId) {
    return focusList(focusId).map(function (id) {
      for (var i = 0; i < FOCUS_MUSCLES.length; i++) if (FOCUS_MUSCLES[i].id === id) return FOCUS_MUSCLES[i].macro;
      return id.toUpperCase();
    });
  }
  function focusLabel(focusId) {
    var list = focusList(focusId);
    if (!list.length) return 'Equilibrato';
    return 'Focus ' + list.map(function (id) {
      for (var i = 0; i < FOCUS_MUSCLES.length; i++) if (FOCUS_MUSCLES[i].id === id) return FOCUS_MUSCLES[i].label;
      return id;
    }).join(' + ');
  }

  // The "sci2" axis that "focus" replaced.
  var LEGACY_AUDIENCE_FOCUS = { unisex: FOCUS_NONE, female: 'glutei', male: 'petto' };

  function idFor(p) {
    return ['sci3', p.days, p.split, p.goal, p.equipment, p.experience, p.focus, p.duration, p.progression, p.variant].join('-');
  }

  function parseId(id) {
    var s = String(id || '').split('-');
    if (s.length !== 10 || (s[0] !== 'sci3' && s[0] !== 'sci2')) return null;
    var focus = s[0] === 'sci2' ? LEGACY_AUDIENCE_FOCUS[s[6]] : s[6];
    var p = {
      days: Number(s[1]), split: s[2], goal: s[3], equipment: s[4], experience: s[5],
      focus: focus, duration: Number(s[7]), progression: s[8], variant: s[9]
    };
    if (DAYS.indexOf(p.days) < 0 || SPLITS.indexOf(p.split) < 0 || GOALS.indexOf(p.goal) < 0) return null;
    if (splitDays(p.split).indexOf(p.days) < 0) return null;
    if (EQUIPMENT.indexOf(p.equipment) < 0 || EXPERIENCE.indexOf(p.experience) < 0) return null;
    if (FOCUS_IDS.indexOf(p.focus) < 0) return null;
    if (DURATIONS.indexOf(p.duration) < 0 || PROGRESSIONS.indexOf(p.progression) < 0) return null;
    if (VARIANTS.indexOf(p.variant) < 0) return null;
    return p;
  }

  function goalsFor(p) {
    var goals = [p.goal];
    focusList(p.focus).forEach(function (id) { if (goals.indexOf(id) < 0) goals.push(id); });
    if (p.goal === 'cut' && goals.indexOf('dimagrimento') < 0) goals.push('dimagrimento');
    return goals;
  }

  function titleFor(p) {
    return [
      focusLabel(p.focus), SPLIT_LABEL[p.split], p.goal, p.days + ' gg', p.duration + ' sett',
      PROG_LABEL[p.progression], p.experience, p.equipment, 'sel. ' + VARIANT_LABEL[p.variant]
    ].join(' · ');
  }

  function sessionsFor(p) {
    return root.NurvanProgramBuilder.buildTemplateSessions({
      days: p.days, split: p.split, goal: p.goal, equipment: p.equipment,
      experience: p.experience, audience: 'unisex', focus: focusMacros(p.focus), variant: p.variant
    });
  }

  // The row the library list and the filters work on.
  function rowFor(p, sessions) {
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
      focus: p.focus,
      focus_groups: focusList(p.focus),
      variant: p.variant
    };
  }

  // The week-1 template, built on the spot. The weeks after it come from
  // expandScienceProgramWeeks, as before.
  function bodyFor(id) {
    if (typeof id === 'string' && id.indexOf('hyx-') === 0) return hyrox() ? hyrox().catalogBody(id) : null;
    if (typeof id === 'string' && id.indexOf('dsc-') === 0) return home() ? home().catalogBody(id) : null;
    var p = typeof id === 'string' ? parseId(id) : id;
    if (!p) return null;
    var sessions = sessionsFor(p);
    var notes = NOTES.slice();
    var groups = focusList(p.focus);
    if (groups.length) notes.push('Focus ' + groups.join(', ') + ': una serie di lavoro in più, ogni seduta che li allena già, al posto del lavoro meno prioritario.');
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
      focus: p.focus,
      focus_groups: groups,
      progression_model: p.progression,
      progression: { model: p.progression, deload_every: 4 },
      notes: notes
    };
  }

  var ALL = {
    days: DAYS, split: SPLITS, goal: GOALS, equipment: EQUIPMENT, experience: EXPERIENCE,
    focus: FOCUS_IDS, duration: DURATIONS, progression: PROGRESSIONS, variant: VARIANTS
  };

  function valuesFor(dim, filters) {
    var all = ALL[dim];
    var want = filters && filters[dim];
    if (want === undefined || want === null || want === '') return all;
    if (dim === 'days' || dim === 'duration') want = Number(want);
    if (dim === 'split' && want === 'full_body') want = 'fullbody';
    if (dim === 'focus') want = focusCanon(want);
    return all.indexOf(want) >= 0 ? [want] : all;
  }

  // The race preparations are a grid of their own (web/hyrox.js).
  function hyrox() { return root.NurvanHyrox && root.NurvanHyrox.catalogSearch ? root.NurvanHyrox : null; }
  function isHyrox(filters) { return !!(filters && filters.goal === 'hyrox' && hyrox()); }
  // ... and so are the home disciplines (web/disciplines.js).
  function home() { return root.NurvanDisciplines && root.NurvanDisciplines.catalogSearch ? root.NurvanDisciplines : null; }
  function isHome(filters) { return !!(filters && home() && home().isDiscipline(filters.goal)); }

  // How many (days, split) pairs the filters leave: not every split exists
  // over every number of days.
  function dayPairs(filters) {
    var days = valuesFor('days', filters);
    var out = [];
    valuesFor('split', filters).forEach(function (sp) {
      days.forEach(function (d) { if (splitDays(sp).indexOf(d) >= 0) out.push([d, sp]); });
    });
    return out;
  }

  function total(filters) {
    if (isHyrox(filters)) return hyrox().catalogTotal(filters);
    if (isHome(filters)) return home().catalogTotal(filters);
    // With no goal chosen the count is everything there is.
    var extra = (hyrox() && !(filters && filters.goal)) ? hyrox().catalogTotal({}) : 0;
    if (home() && !(filters && filters.goal)) extra += home().catalogTotal({});
    return extra + dayPairs(filters).length * ['goal', 'equipment', 'experience', 'focus', 'duration', 'progression', 'variant']
      .reduce(function (n, dim) { return n * valuesFor(dim, filters).length; }, 1);
  }

  // Whether the filters, taken together, can name a program at all: the one
  // way they cannot is a split that does not exist over the days chosen.
  function possible(filters) {
    return dayPairs(filters || {}).length > 0;
  }

  // Where the first rows of an open search come from. The grid is far larger
  // than the screen, and its first 150 cells in plain order would all be the
  // same program with another number of weeks. A low-discrepancy walk (one
  // irrational step per dimension) visits it evenly instead, so the first page
  // is a spread of days, splits, goals, equipment, muscles... and is always
  // the same page for the same filters.
  var STEPS = [0.41421356, 0.73205081, 0.23606798, 0.64575131, 0.31662479, 0.60555128, 0.12310563, 0.89442719, 0.35889894, 0.77200187];

  function pick(list, k, dimIndex) {
    if (list.length === 1) return list[0];
    var x = ((k + 1) * STEPS[dimIndex]) % 1;
    return list[Math.floor(x * list.length)];
  }

  // Walks the grid, narrowed by whatever the filters pin down, and stops as
  // soon as it has enough rows for the screen. Nothing else is ever built.
  function search(filters, limit) {
    var f = filters || {};
    if (isHyrox(f)) return hyrox().catalogSearch(f, limit || 150);
    if (isHome(f)) return home().catalogSearch(f, limit || 150);
    var cap = limit || 150;
    var pairs = dayPairs(f);
    var count = total(f);
    var rows = [];
    if (!pairs.length) return { rows: rows, total: 0, impossible: true };
    var dims = {
      goal: valuesFor('goal', f), equipment: valuesFor('equipment', f), experience: valuesFor('experience', f),
      focus: valuesFor('focus', f), duration: valuesFor('duration', f),
      progression: valuesFor('progression', f), variant: valuesFor('variant', f)
    };
    var seen = {};
    var tries = 0;
    var maxTries = cap * 12;
    // A small grid is listed whole, in order.
    var whole = pairs.length * dims.goal.length * dims.equipment.length * dims.experience.length *
      dims.focus.length * dims.duration.length * dims.progression.length * dims.variant.length;
    if (whole <= cap * 4) {
      outer:
      for (var a = 0; a < pairs.length; a++) {
        for (var b = 0; b < dims.goal.length; b++) {
          for (var c = 0; c < dims.equipment.length; c++) {
            for (var d = 0; d < dims.experience.length; d++) {
              for (var e = 0; e < dims.focus.length; e++) {
                for (var g = 0; g < dims.variant.length; g++) {
                  for (var h = 0; h < dims.duration.length; h++) {
                    for (var i = 0; i < dims.progression.length; i++) {
                      rows.push(rowFor({
                        days: pairs[a][0], split: pairs[a][1], goal: dims.goal[b], equipment: dims.equipment[c],
                        experience: dims.experience[d], focus: dims.focus[e], duration: dims.duration[h],
                        progression: dims.progression[i], variant: dims.variant[g]
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
      return { rows: rows, total: count };
    }
    while (rows.length < cap && tries < maxTries) {
      var pair = pick(pairs, tries, 0);
      var p = {
        days: pair[0], split: pair[1],
        goal: pick(dims.goal, tries, 1), equipment: pick(dims.equipment, tries, 2),
        experience: pick(dims.experience, tries, 3), focus: pick(dims.focus, tries, 4),
        duration: pick(dims.duration, tries, 5), progression: pick(dims.progression, tries, 6),
        variant: pick(dims.variant, tries, 7)
      };
      tries += 1;
      var key = idFor(p);
      if (seen[key]) continue;
      seen[key] = true;
      rows.push(rowFor(p));
    }
    return { rows: rows, total: count };
  }

  function rowById(id) {
    if (String(id || '').indexOf('hyx-') === 0) return hyrox() ? hyrox().catalogRow(id) : null;
    if (String(id || '').indexOf('dsc-') === 0) return home() ? home().catalogRow(id) : null;
    var p = parseId(id);
    return p ? rowFor(p) : null;
  }

  root.NurvanProgramCatalog = {
    DAYS: DAYS, SPLITS: SPLITS, GOALS: GOALS, EQUIPMENT: EQUIPMENT, EXPERIENCE: EXPERIENCE,
    FOCUS_MUSCLES: FOCUS_MUSCLES, FOCUS_IDS: FOCUS_IDS, FOCUS_NONE: FOCUS_NONE, FOCUS_MAX: FOCUS_MAX,
    DURATIONS: DURATIONS, PROGRESSIONS: PROGRESSIONS, VARIANTS: VARIANTS,
    PROG_LABEL: PROG_LABEL, SPLIT_LABEL: SPLIT_LABEL, SPLIT_NOTE: SPLIT_NOTE,
    idFor: idFor, parseId: parseId, rowFor: rowFor, rowById: rowById, bodyFor: bodyFor,
    search: search, total: total, titleFor: titleFor, possible: possible,
    splitDays: splitDays, splitsForDays: splitsForDays,
    focusCanon: focusCanon, focusList: focusList, focusLabel: focusLabel, focusMacros: focusMacros
  };
})(typeof self !== 'undefined' ? self : this);
