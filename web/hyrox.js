/*
 * Preparation for a HYROX race.
 *
 * The race is always the same: eight times one kilometre of running followed
 * by a station, in a fixed order. That makes it something a program can be
 * written for: this file knows the stations and their loads per division,
 * what to train instead of a station when the gym lacks the equipment, and
 * how to lay out the weeks before a race date (base, build, peak, taper).
 *
 * The program it writes has the same shape as every other program of the
 * app (weeks -> sessions -> exercises), so it is read, edited and logged
 * like the others.
 *
 * HYROX is a registered trademark of its owner. Nurvan is not affiliated
 * with, sponsored or endorsed by HYROX: this is independent training
 * material for people who enter the race.
 */
(function (root) {
  'use strict';

  // The eight stations, in race order. `gear` is the equipment the station
  // needs; `alt` what trains the same effort without it.
  var STATIONS = [
    { id: 'skierg', name: 'Ski erg', amount: '1000 m', gear: 'skierg', unit: 'cardio', minutes: 5,
      cue: 'Braccia lunghe, spinta dalle anche: il lavoro lo fanno busto e dorsali, non le spalle. Ritmo costante, niente partenza a razzo.',
      alt: { name: 'Slam ball', unit: 'reps', reps: '20', note: 'Al posto dello ski erg: stessa catena, anche e dorsali.' } },
    { id: 'sled_push', name: 'Sled push', amount: '50 m', gear: 'sled', unit: 'cardio', minutes: 3,
      cue: 'Braccia tese o gomiti vicini al busto, schiena piatta, passi corti e continui. Fermarsi costa più che rallentare.',
      alt: { name: 'Affondi camminati', unit: 'reps', reps: '20', note: 'Al posto della slitta: carico pesante, passi corti, busto inclinato in avanti.' } },
    { id: 'sled_pull', name: 'Sled pull', amount: '50 m', gear: 'sled', unit: 'cardio', minutes: 3,
      cue: 'Siediti indietro sulle anche e tira a braccia alternate camminando all’indietro nella corsia. Corda sempre ordinata accanto a te.',
      alt: { name: 'Rematore manubrio', unit: 'reps', reps: '15', note: 'Al posto della slitta: tirate pesanti e veloci, poco recupero.' } },
    { id: 'burpee_broad_jump', name: 'Burpee broad jump', amount: '80 m', gear: null, unit: 'reps', reps: '10',
      cue: 'Petto a terra, piedi vicino alle mani, salto in lungo. Salti regolari e respirazione prima della distanza: è la stazione che alza di più i battiti.' },
    { id: 'row', name: 'Vogatore', amount: '1000 m', gear: 'rower', unit: 'cardio', minutes: 5,
      cue: 'Gambe, busto, braccia; ritorno al contrario. Colpi lunghi a ritmo basso: qui si recuperano le gambe per i carry.',
      alt: { name: 'Air bike', unit: 'cardio', minutes: 5, note: 'Al posto del vogatore: stesso tempo, sforzo costante.' } },
    { id: 'farmers_carry', name: 'Farmer walk', amount: '200 m', gear: 'kettlebells', unit: 'time', seconds: 60,
      cue: 'Spalle basse, presa piena, passi rapidi. Appoggia solo se la presa sta per cedere: ogni appoggio sono secondi persi.',
      alt: { name: 'Farmer walk', unit: 'time', seconds: 60, note: 'Con manubri o un bilanciere per mano: conta la presa, non l’attrezzo.' } },
    { id: 'sandbag_lunges', name: 'Affondi camminati con sandbag', amount: '100 m', gear: 'sandbag', unit: 'reps', reps: '20',
      cue: 'Sandbag sulle spalle, ginocchio dietro che tocca terra a ogni passo, busto alto. Passi lunghi: meno ripetizioni per la stessa distanza.',
      alt: { name: 'Affondi camminati', unit: 'reps', reps: '20', note: 'Con manubri o bilanciere sulle spalle al posto del sandbag.' } },
    { id: 'wall_balls', name: 'Wall ball', amount: '100 rip', gear: 'wallball', unit: 'reps', reps: '25',
      cue: 'Squat completo sotto il parallelo, palla al bersaglio. Blocchi decisi prima di partire (es. 25-25-25-25) con pause brevi e contate.',
      alt: { name: 'Thruster', unit: 'reps', reps: '20', note: 'Al posto dei wall ball: carico leggero, squat completo, spinta sopra la testa.' } }
  ];

  // Loads per division (kg). Sled loads include the sled.
  var DIVISIONS = [
    { id: 'open_w', label: 'Open donne', sled_push: 102, sled_pull: 78, farmers: '2 × 16', sandbag: 10, wallball: 4 },
    { id: 'open_m', label: 'Open uomini', sled_push: 152, sled_pull: 103, farmers: '2 × 24', sandbag: 20, wallball: 6 },
    { id: 'pro_w', label: 'Pro donne', sled_push: 152, sled_pull: 103, farmers: '2 × 24', sandbag: 20, wallball: 6 },
    { id: 'pro_m', label: 'Pro uomini', sled_push: 202, sled_pull: 153, farmers: '2 × 32', sandbag: 30, wallball: 9 },
    { id: 'doubles', label: 'Doubles (in coppia)', sled_push: 152, sled_pull: 103, farmers: '2 × 24', sandbag: 20, wallball: 6 },
    { id: 'relay', label: 'Relay (staffetta a 4)', sled_push: 152, sled_pull: 103, farmers: '2 × 24', sandbag: 20, wallball: 6 }
  ];

  var GEAR = [
    { id: 'skierg', label: 'Ski erg' },
    { id: 'sled', label: 'Slitta (push e pull)' },
    { id: 'rower', label: 'Vogatore' },
    { id: 'kettlebells', label: 'Kettlebell o manubri pesanti' },
    { id: 'sandbag', label: 'Sandbag' },
    { id: 'wallball', label: 'Wall ball e bersaglio' }
  ];
  var ALL_GEAR = GEAR.map(function (g) { return g.id; });

  var LEVELS = [
    { id: 'beginner', label: 'Prima gara', volume: 0.8 },
    { id: 'intermediate', label: 'Ho già gareggiato', volume: 1 },
    { id: 'advanced', label: 'Punto al tempo', volume: 1.2 }
  ];
  var DAYS = [3, 4, 5, 6];
  var WEEKS = [6, 8, 10, 12, 16];

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i];
    return list[0];
  }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  /* ------------------------------ rows ------------------------------ */

  function strength(name, sets, reps, rest, rir) {
    var list = [];
    for (var i = 0; i < sets; i++) list.push({ reps: reps, target_load: null });
    return { name: name, name_original: name, unit: 'reps', sets: list, setCount: sets, repsTarget: reps, rirTarget: rir == null ? 2 : rir, rest: rest || '2 min', role: 'compound' };
  }
  function cardio(name, sets, minutes, rest, notes) {
    var list = [];
    var reps = minutes + ' min';
    for (var i = 0; i < sets; i++) list.push({ reps: reps, minutes: minutes, target_load: null });
    var row = { name: name, name_original: name, muscle_groups: ['CARDIO'], unit: 'cardio', sets: list, setCount: sets, repsTarget: reps, rest: rest || '2 min' };
    if (notes) row.notes = notes;
    return row;
  }
  function timed(name, sets, seconds, rest, notes) {
    var list = [];
    for (var i = 0; i < sets; i++) list.push({ reps: seconds + 's', seconds: seconds, target_load: null });
    var row = { name: name, name_original: name, unit: 'time', sets: list, setCount: sets, repsTarget: seconds + 's', rest: rest || '90s' };
    if (notes) row.notes = notes;
    return row;
  }

  function loadNote(station, division) {
    var d = division;
    switch (station.id) {
      case 'sled_push': return 'Carico gara ' + d.sled_push + ' kg (slitta compresa)';
      case 'sled_pull': return 'Carico gara ' + d.sled_pull + ' kg (slitta compresa)';
      case 'farmers_carry': return 'Carico gara ' + d.farmers + ' kg';
      case 'sandbag_lunges': return 'Carico gara ' + d.sandbag + ' kg';
      case 'wall_balls': return 'Palla da ' + d.wallball + ' kg';
      default: return '';
    }
  }

  // One station as a row of a session. share: the part of the race amount
  // done in each set (0.25 = a quarter), sets: how many times.
  function stationRow(station, opts, sets, share, rest) {
    var has = !station.gear || opts.gear.indexOf(station.gear) !== -1;
    var src = has ? station : (station.alt || station);
    var name = has ? station.name : src.name;
    var notes = [];
    if (has) {
      notes.push(amountText(station, share));
      var ln = loadNote(station, opts.division);
      if (ln) notes.push(ln);
    } else if (src.note) notes.push(src.note);
    var note = notes.join(' · ');
    var unit = has ? station.unit : src.unit;
    var row;
    if (unit === 'cardio') row = cardio(name, sets, Math.max(1, Math.round((src.minutes || 5) * share)), rest, note);
    else if (unit === 'time') row = timed(name, sets, Math.max(20, Math.round((src.seconds || 60) * share)), rest, note);
    else {
      // Repetitions of the whole station in a race (steps for the lunges, jumps for the burpees).
      var RACE_REPS = { wall_balls: 100, burpee_broad_jump: 40, sandbag_lunges: 80 };
      var reps = has ? String(Math.max(5, Math.round((RACE_REPS[station.id] || 20) * share))) : String(src.reps || '20');
      row = strength(name, sets, reps, rest, 3);
      row.role = 'accessory';
      if (note) row.notes = note;
    }
    row.hyrox_station = station.id;
    return row;
  }
  function amountText(station, share) {
    var m = /^(\d+)\s*(m|rip)$/.exec(station.amount);
    if (!m) return station.amount;
    var n = Math.round(Number(m[1]) * share);
    return n + ' ' + m[2] + (share >= 1 ? ' (distanza di gara)' : '');
  }
  function run(minutes, sets, rest, notes) { return cardio('Corsa', sets || 1, minutes, rest || '90s', notes); }

  /* ---------------------------- sessions ---------------------------- */

  // phase: base | build | peak | taper; k: volume factor of the athlete.
  function sessionStrength(variant, phase, k) {
    var sets = phase === 'taper' ? 2 : clamp(Math.round(3 * k), 2, 4);
    var reps = phase === 'base' ? '8-10' : (phase === 'build' ? '6-8' : '5');
    var rows = variant === 'A'
      ? [strength('Squat bilanciere', sets, reps, '2 min'), strength('Stacco rumeno', sets, '8-10', '2 min'), strength('Panca piana manubri', sets, '8-10', '90s'), strength('Rematore manubrio', sets, '10-12', '90s'), timed('Plank', 3, 45, '60s')]
      : [strength('Affondi camminati', sets, '12-16', '2 min'), strength('Hip thrust', sets, '8-10', '2 min'), strength('Military press', sets, reps, '90s'), strength('Lat machine', sets, '10-12', '90s'), timed('Farmer walk', 3, 45, '60s', 'Presa: è quello che cede per primo negli ultimi chilometri.')];
    return { name: 'Forza ' + variant, title: 'Forza ' + variant, exercises: rows };
  }
  function sessionRunEasy(phase, k, week) {
    var minutes = phase === 'taper' ? 25 : clamp(Math.round((30 + week * 2) * k), 25, 70);
    return { name: 'Corsa facile', title: 'Corsa facile', exercises: [run(minutes, 1, '2 min', 'Passo a cui riesci a parlare. È la base che ti porta in fondo agli otto chilometri.')] };
  }
  function sessionIntervals(phase, k, week) {
    var rows;
    if (phase === 'base') rows = [run(10, 1, '2 min', 'Riscaldamento'), run(4, clamp(Math.round(4 * k), 3, 6), '2 min', '4 minuti forti, appena sopra il passo gara'), run(8, 1, '2 min', 'Defaticamento')];
    else if (phase === 'build') rows = [run(10, 1, '2 min', 'Riscaldamento'), run(5, clamp(Math.round(5 * k), 4, 8), '90s', '1 km a passo gara. Recupero breve: in gara non ne avrai.'), run(8, 1, '2 min', 'Defaticamento')];
    else if (phase === 'peak') rows = [run(10, 1, '2 min', 'Riscaldamento'), run(5, clamp(Math.round(6 * k), 5, 8), '60s', '1 km a passo gara'), run(6, 1, '2 min', 'Defaticamento')];
    else rows = [run(10, 1, '2 min', 'Riscaldamento'), run(3, 4, '2 min', 'Allunghi a passo gara, senza stancarti'), run(5, 1, '2 min', 'Defaticamento')];
    return { name: 'Corsa a intervalli', title: 'Corsa a intervalli', exercises: rows };
  }
  function sessionStations(half, phase, opts, k) {
    var list = STATIONS.slice(half * 4, half * 4 + 4);
    var sets = phase === 'taper' ? 2 : clamp(Math.round(3 * k), 2, 4);
    var share = phase === 'base' ? 0.25 : (phase === 'build' ? 0.5 : (phase === 'peak' ? 0.5 : 0.25));
    var rows = [run(8, 1, '2 min', 'Riscaldamento')];
    list.forEach(function (st) { rows.push(stationRow(st, opts, sets, share, '90s')); });
    return { name: half ? 'Stazioni 5-8' : 'Stazioni 1-4', title: half ? 'Stazioni 5-8' : 'Stazioni 1-4', exercises: rows };
  }
  // Running with tired legs: a run, a station, a run. The thing the race is.
  function sessionCompromised(phase, opts, k, week) {
    var rounds = phase === 'base' ? 3 : (phase === 'build' ? 4 : (phase === 'peak' ? 4 : 2));
    var share = phase === 'base' ? 0.5 : (phase === 'taper' ? 0.5 : 1);
    var rows = [run(8, 1, '2 min', 'Riscaldamento')];
    for (var i = 0; i < rounds; i++) {
      var st = STATIONS[(week + i * 3) % STATIONS.length];
      rows.push(run(5, 1, '30s', '1 km a passo gara, poi subito la stazione'));
      rows.push(stationRow(st, opts, 1, share, '60s'));
    }
    return { name: 'Corsa + stazioni', title: 'Corsa + stazioni', exercises: rows };
  }
  function sessionSimulation(full, opts) {
    var list = full ? STATIONS : STATIONS.filter(function (_, i) { return i % 2 === 0; });
    var rows = [run(8, 1, '2 min', 'Riscaldamento')];
    list.forEach(function (st) {
      rows.push(run(5, 1, '30s', '1 km a passo gara'));
      rows.push(stationRow(st, opts, 1, 1, '30s'));
    });
    var name = full ? 'Simulazione di gara' : 'Mezza simulazione';
    return { name: name, title: name, exercises: rows };
  }
  function sessionEngine(phase, opts, k) {
    var sets = phase === 'taper' ? 3 : clamp(Math.round(5 * k), 4, 8);
    var hasRow = opts.gear.indexOf('rower') !== -1, hasSki = opts.gear.indexOf('skierg') !== -1;
    var rows = [
      cardio(hasRow ? 'Vogatore' : 'Air bike', sets, 2, '60s', '500 m forti, recupero breve'),
      cardio(hasSki ? 'Ski erg' : 'Battle rope', sets, 2, '60s', hasSki ? '500 m forti, recupero breve' : 'Al posto dello ski erg'),
      strength('Burpee broad jump', 3, '10', '90s', 3)
    ];
    return { name: 'Motore', title: 'Motore', exercises: rows };
  }

  function phaseOf(week, weeks) {
    if (week === weeks) return 'taper';
    var left = weeks - 1;
    var base = Math.max(1, Math.round(left * 0.4));
    var build = Math.max(1, Math.round(left * 0.35));
    if (week <= base) return 'base';
    if (week <= base + build) return 'build';
    return 'peak';
  }
  var PHASE_LABELS = { base: 'Base', build: 'Costruzione', peak: 'Picco', taper: 'Scarico pre-gara' };

  function weekSessions(week, weeks, opts) {
    var phase = phaseOf(week, weeks);
    var k = opts.level.volume;
    var out = [];
    // The three that every week has: strength, running, and the two together.
    out.push(sessionStrength('A', phase, k));
    out.push(sessionIntervals(phase, k, week));
    if (phase === 'peak' && week % 2 === 0) out.push(sessionSimulation(week === weeks - 1 || opts.level.id !== 'beginner', opts));
    else if (phase === 'taper') out.push(sessionCompromised(phase, opts, k, week));
    else out.push(week % 2 ? sessionStations((week >> 1) % 2, phase, opts, k) : sessionCompromised(phase, opts, k, week));
    if (opts.days >= 4) out.push(sessionRunEasy(phase, k, week));
    if (opts.days >= 5) out.push(sessionStrength('B', phase, k));
    if (opts.days >= 6) out.push(sessionEngine(phase, opts, k));
    // Strength and running alternate through the week.
    var order = opts.days >= 5 ? [0, 1, 4, 2, 3, 5] : [0, 1, 2, 3];
    return order.filter(function (i) { return i < out.length; }).map(function (i) { return out[i]; });
  }

  // Whole weeks between today and the race, within what a program can hold.
  function weeksUntil(dateIso, from) {
    var race = new Date(String(dateIso) + 'T00:00:00');
    var now = from ? new Date(from) : new Date();
    if (isNaN(race.getTime())) return null;
    return Math.floor((race.getTime() - now.getTime()) / (7 * 24 * 3600 * 1000));
  }

  function resolve(input) {
    input = input || {};
    var gear = Array.isArray(input.gear) ? input.gear.filter(function (g) { return ALL_GEAR.indexOf(g) !== -1; }) : ALL_GEAR.slice();
    var weeks = Number(input.weeks) || 0;
    if (input.raceDate) {
      var left = weeksUntil(input.raceDate, input.today);
      if (left != null) weeks = clamp(left, 4, 20);
    }
    return {
      weeks: clamp(Math.round(weeks) || 8, 4, 20),
      days: clamp(Math.round(Number(input.days)) || 4, 3, 6),
      level: byId(LEVELS, input.level || 'intermediate'),
      division: byId(DIVISIONS, input.division || 'open_m'),
      gear: gear,
      raceDate: input.raceDate || '',
      raceName: String(input.raceName || '').trim()
    };
  }

  function plan(input) {
    var r = resolve(input);
    var weeks = [];
    for (var w = 1; w <= r.weeks; w++) {
      weeks.push({
        week: w, weekNumber: w, week_number: w,
        label: 'Settimana ' + w + ' · ' + PHASE_LABELS[phaseOf(w, r.weeks)],
        phase: phaseOf(w, r.weeks),
        sessions: weekSessions(w, r.weeks, r)
      });
    }
    var missing = GEAR.filter(function (g) { return r.gear.indexOf(g.id) === -1; }).map(function (g) { return g.label; });
    return {
      id: 'hyrox_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      title: 'Preparazione HYROX' + (r.raceName ? ' · ' + r.raceName : '') + ' · ' + r.weeks + ' settimane',
      weeks: weeks,
      duration_weeks: r.weeks,
      days_per_week: r.days,
      split: 'hyrox',
      goals: ['hyrox'],
      purpose: 'hyrox',
      equipment: missing.length ? 'palestra' : 'hyrox',
      experience: r.level.id,
      author: 'Generata da Nurvan',
      source: 'hyrox_v1',
      race: { name: r.raceName, date: r.raceDate, division: r.division.id },
      source_summary: 'Preparazione HYROX · ' + r.division.label + ' · ' + r.days + ' giorni a settimana' + (missing.length ? ' · senza: ' + missing.join(', ') : ''),
      meta: { generatedAt: new Date().toISOString(), method: 'hyrox_phases', missing_gear: missing }
    };
  }

  /* ----------------------------- events ----------------------------- */

  var EUROPE = ['AT', 'BE', 'CH', 'CZ', 'DE', 'DK', 'ES', 'FI', 'FR', 'GB', 'GR', 'HU', 'IE', 'LV', 'NL', 'NO', 'PL', 'PT', 'SE'];
  function regionOf(ev) {
    if (ev.country === 'IT') return 'italy';
    return EUROPE.indexOf(ev.country) !== -1 ? 'europe' : 'world';
  }
  // Races still to come (or under way), nearest first. region: italy | europe | world | all.
  function upcoming(events, region, today) {
    var now = today || new Date().toISOString().slice(0, 10);
    return (events || []).filter(function (ev) {
      if (!ev.start) return false;
      if ((ev.end || ev.start) < now) return false;
      if (!region || region === 'all') return true;
      if (region === 'europe') return regionOf(ev) !== 'world';
      return regionOf(ev) === region;
    }).sort(function (a, b) { return a.start < b.start ? -1 : (a.start > b.start ? 1 : 0); });
  }

  // A finish time from what the athlete knows: the pace of an easy 5 km and
  // an honest guess at the stations. Rough on purpose: a range, not a promise.
  function estimateFinish(fiveKmMinutes, level) {
    var five = Number(fiveKmMinutes);
    if (!(five > 12 && five < 60)) return null;
    var runPerKm = (five / 5) * 1.12;                 // running between stations is slower than a fresh 5 km
    var stations = { beginner: 44, intermediate: 36, advanced: 30 }[level] || 36;
    var transitions = 6;
    var total = runPerKm * 8 + stations + transitions;
    return { low: Math.round(total * 0.95), high: Math.round(total * 1.08) };
  }

  root.NurvanHyrox = {
    STATIONS: STATIONS,
    DIVISIONS: DIVISIONS,
    GEAR: GEAR,
    LEVELS: LEVELS,
    DAYS: DAYS,
    WEEKS: WEEKS,
    PHASE_LABELS: PHASE_LABELS,
    DISCLAIMER: 'HYROX® è un marchio registrato del suo titolare. Nurvan non è affiliata né sponsorizzata da HYROX: questo è materiale di allenamento indipendente.',
    resolve: resolve,
    plan: plan,
    phaseOf: phaseOf,
    weeksUntil: weeksUntil,
    regionOf: regionOf,
    upcoming: upcoming,
    estimateFinish: estimateFinish
  };
})(typeof self !== 'undefined' ? self : this);
