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
  // needs; `alt` what trains the same effort without it; `top` the time the
  // best 100 Pro athletes of season 2024/25 took on it (men, women), from the
  // official results analysed in Rappelt et al. 2026.
  var STATIONS = [
    { id: 'skierg', top: { m: '3:48', w: '4:23' }, name: 'Ski erg', amount: '1000 m', gear: 'skierg', unit: 'cardio', minutes: 5,
      cue: 'Braccia lunghe, spinta dalle anche: il lavoro lo fanno busto e dorsali, non le spalle. Ritmo costante, niente partenza a razzo.',
      alt: { name: 'Slam ball', unit: 'reps', reps: '20', note: 'Al posto dello ski erg: stessa catena, anche e dorsali.' },
      home: { name: 'Burpees', unit: 'reps', reps: '15', note: 'Al posto dello ski erg: tutto il corpo, ritmo costante.' } },
    { id: 'sled_push', top: { m: '2:26', w: '2:47' }, name: 'Sled push', amount: '50 m', gear: 'sled', unit: 'cardio', minutes: 3,
      cue: 'Braccia tese o gomiti vicini al busto, schiena piatta, passi corti e continui. Fermarsi costa più che rallentare.',
      alt: { name: 'Affondi camminati', unit: 'reps', reps: '20', note: 'Al posto della slitta: carico pesante, passi corti, busto inclinato in avanti.' },
      bw: { name: 'Affondi camminati', unit: 'reps', reps: '30', note: 'Al posto della slitta: passi corti e continui, senza fermarti.' } },
    { id: 'sled_pull', top: { m: '3:27', w: '3:58' }, name: 'Sled pull', amount: '50 m', gear: 'sled', unit: 'cardio', minutes: 3,
      cue: 'Siediti indietro sulle anche e tira a braccia alternate camminando all’indietro nella corsia. Corda sempre ordinata accanto a te.',
      alt: { name: 'Rematore manubrio', unit: 'reps', reps: '15', note: 'Al posto della slitta: tirate pesanti e veloci, poco recupero.' },
      bw: { name: 'Glute bridge', unit: 'reps', reps: '25', note: 'Al posto della slitta da tirare: catena posteriore, senza attrezzi.' } },
    { id: 'burpee_broad_jump', top: { m: '2:44', w: '3:27' }, name: 'Burpee broad jump', amount: '80 m', gear: null, unit: 'reps', reps: '10',
      cue: 'Petto a terra, piedi vicino alle mani, salto in lungo. Salti regolari e respirazione prima della distanza: è la stazione che alza di più i battiti.' },
    { id: 'row', top: { m: '3:56', w: '4:30' }, name: 'Vogatore', amount: '1000 m', gear: 'rower', unit: 'cardio', minutes: 5,
      cue: 'Gambe, busto, braccia; ritorno al contrario. Colpi lunghi a ritmo basso: qui si recuperano le gambe per i carry.',
      alt: { name: 'Air bike', unit: 'cardio', minutes: 5, note: 'Al posto del vogatore: stesso tempo, sforzo costante.' },
      home: { name: 'Mountain climber', unit: 'time', seconds: 60, note: 'Al posto del vogatore: ritmo costante, senza macchine.' } },
    { id: 'farmers_carry', top: { m: '1:25', w: '1:44' }, name: 'Farmer walk', amount: '200 m', gear: 'kettlebells', unit: 'time', seconds: 60,
      cue: 'Spalle basse, presa piena, passi rapidi. Appoggia solo se la presa sta per cedere: ogni appoggio sono secondi persi.',
      alt: { name: 'Farmer walk', unit: 'time', seconds: 60, note: 'Con manubri o un bilanciere per mano: conta la presa, non l’attrezzo.' },
      bw: { name: 'Plank', unit: 'time', seconds: 60, note: 'Al posto del farmer walk: tenuta del busto. La presa si allena solo con un carico in mano.' } },
    { id: 'sandbag_lunges', top: { m: '3:07', w: '3:26' }, name: 'Affondi camminati con sandbag', amount: '100 m', gear: 'sandbag', unit: 'reps', reps: '20',
      cue: 'Sandbag sulle spalle, ginocchio dietro che tocca terra a ogni passo, busto alto. Passi lunghi: meno ripetizioni per la stessa distanza.',
      alt: { name: 'Affondi camminati', unit: 'reps', reps: '20', note: 'Con manubri o bilanciere sulle spalle al posto del sandbag.' },
      bw: { name: 'Affondi camminati', unit: 'reps', reps: '30', note: 'Senza carico: ginocchio a terra a ogni passo, più ripetizioni.' } },
    { id: 'wall_balls', top: { m: '3:55', w: '3:59' }, name: 'Wall ball', amount: '100 rip', gear: 'wallball', unit: 'reps', reps: '25',
      cue: 'Squat completo sotto il parallelo, palla al bersaglio. Blocchi decisi prima di partire (es. 25-25-25-25) con pause brevi e contate.',
      alt: { name: 'Thruster', unit: 'reps', reps: '20', note: 'Al posto dei wall ball: carico leggero, squat completo, spinta sopra la testa.' },
      bw: { name: 'Squat jump', unit: 'reps', reps: '25', note: 'Al posto dei wall ball: squat completo e spinta verso l’alto.' } }
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

  // Where people actually train. Not everybody has a sled and a ski erg: a
  // profile says which race equipment is there (`gear`) and what the strength
  // work is done with (`kit`: a full gym, dumbbells or kettlebells, nothing).
  var PROFILES = [
    { id: 'full', label: 'Palestra HYROX completa', note: 'Slitta, ski erg, vogatore, sandbag e wall ball', gear: ALL_GEAR.slice(), kit: 'gym' },
    { id: 'box', label: 'Box senza slitta', note: 'Ski erg, vogatore, kettlebell, sandbag e wall ball', gear: ['skierg', 'rower', 'kettlebells', 'sandbag', 'wallball'], kit: 'gym' },
    { id: 'gym', label: 'Palestra classica', note: 'Vogatore, bilanciere, manubri o kettlebell', gear: ['rower', 'kettlebells'], kit: 'gym' },
    { id: 'home', label: 'Casa con manubri o kettlebell', note: 'Nessuna macchina: manubri o kettlebell e un posto dove correre', gear: ['kettlebells'], kit: 'dumbbells' },
    { id: 'bodyweight', label: 'Corpo libero', note: 'Solo corsa e corpo libero', gear: [], kit: 'bodyweight' }
  ];
  function profileById(id) {
    for (var i = 0; i < PROFILES.length; i++) if (PROFILES[i].id === id) return PROFILES[i];
    return null;
  }
  // The profile a list of equipment is, when it is exactly one of them.
  function profileOfGear(gear, kit) {
    var key = (gear || []).slice().sort().join(',');
    for (var i = 0; i < PROFILES.length; i++) {
      if (PROFILES[i].gear.slice().sort().join(',') === key && (!kit || kit === PROFILES[i].kit)) return PROFILES[i];
    }
    return null;
  }

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
    // Without the equipment: what the place allows. At home there is no
    // slam ball or air bike; with no weights at all, not even a dumbbell.
    var kit = opts.kit || 'gym';
    var swap = kit === 'bodyweight' ? (station.bw || station.home || station.alt)
      : (kit === 'dumbbells' ? (station.home || station.alt) : station.alt);
    var src = has ? station : (swap || station);
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
  function sessionStrength(variant, phase, k, kit) {
    var sets = phase === 'taper' ? 2 : clamp(Math.round(3 * k), 2, 4);
    var reps = phase === 'base' ? '8-10' : (phase === 'build' ? '6-8' : '5');
    var grip = 'Presa: è quello che cede per primo negli ultimi chilometri.';
    var rows;
    if (kit === 'bodyweight') {
      // No load to add: more repetitions, the same movements.
      rows = variant === 'A'
        ? [strength('Squat a corpo libero', sets, '20-25', '90s'), strength('Glute bridge', sets, '15-20', '90s'), strength('Push-up', sets, '10-15', '90s'), strength('Affondi camminati', sets, '16-20', '90s'), timed('Plank', 3, 45, '60s')]
        : [strength('Affondi camminati', sets, '20-24', '90s'), strength('Squat jump', sets, '12-15', '90s'), strength('Pike push-up', sets, '8-12', '90s'), strength('Burpees', sets, '10-12', '90s'), timed('Side plank', 3, 30, '60s')];
    } else if (kit === 'dumbbells') {
      rows = variant === 'A'
        ? [strength('Squat goblet', sets, phase === 'base' ? '10-12' : '8-10', '2 min'), strength('Stacco rumeno', sets, '10-12', '2 min'), strength('Floor press', sets, '8-10', '90s'), strength('Rematore manubrio', sets, '10-12', '90s'), timed('Plank', 3, 45, '60s')]
        : [strength('Affondi camminati', sets, '12-16', '2 min'), strength('Hip thrust KB', sets, '10-12', '2 min'), strength('Shoulder press manubri', sets, '8-10', '90s'), strength('Thruster', sets, '10-12', '90s'), timed('Farmer walk', 3, 45, '60s', grip)];
    } else {
      rows = variant === 'A'
        ? [strength('Squat bilanciere', sets, reps, '2 min'), strength('Stacco rumeno', sets, '8-10', '2 min'), strength('Panca piana manubri', sets, '8-10', '90s'), strength('Rematore manubrio', sets, '10-12', '90s'), timed('Plank', 3, 45, '60s')]
        : [strength('Affondi camminati', sets, '12-16', '2 min'), strength('Hip thrust', sets, '8-10', '2 min'), strength('Military press', sets, reps, '90s'), strength('Lat machine avanti', sets, '10-12', '90s'), timed('Farmer walk', 3, 45, '60s', grip)];
    }
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
    // Outside a gym there is no air bike and no battle rope: the engine is built running.
    if (opts.kit && opts.kit !== 'gym' && !hasRow && !hasSki) {
      return { name: 'Motore', title: 'Motore', exercises: [
        run(8, 1, '2 min', 'Riscaldamento'),
        run(2, sets, '60s', '400 m forti, recupero breve'),
        strength('Burpees', 3, '12', '90s', 3),
        strength('Burpee broad jump', 3, '10', '90s', 3)
      ] };
    }
    var rows = [
      cardio(hasRow ? 'Vogatore' : 'Air bike', sets, 2, '60s', '500 m forti, recupero breve'),
      cardio(hasSki ? 'Ski erg' : 'Battle rope', sets, 2, '60s', hasSki ? '500 m forti, recupero breve' : 'Al posto dello ski erg'),
      strength('Burpee broad jump', 3, '10', '90s', 3)
    ];
    return { name: 'Motore', title: 'Motore', exercises: rows };
  }

  // The taper that pays most lasts about two weeks (Bosquet et al. 2007): a
  // preparation of ten weeks or more gives it two, a shorter one keeps one.
  function taperWeeks(weeks) { return weeks >= 10 ? 2 : 1; }
  function phaseOf(week, weeks) {
    var taper = taperWeeks(weeks);
    if (week > weeks - taper) return 'taper';
    var left = weeks - taper;
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
    out.push(sessionStrength('A', phase, k, opts.kit));
    out.push(sessionIntervals(phase, k, week));
    // A first race gets one full simulation, in the last week of the peak;
    // the others one every second week of it.
    if (phase === 'peak' && (week % 2 === 0 || phaseOf(week + 1, weeks) === 'taper')) out.push(sessionSimulation(phaseOf(week + 1, weeks) === 'taper' || opts.level.id !== 'beginner', opts));
    else if (phase === 'taper') out.push(sessionCompromised(phase, opts, k, week));
    else out.push(week % 2 ? sessionStations((week >> 1) % 2, phase, opts, k) : sessionCompromised(phase, opts, k, week));
    if (opts.days >= 4) out.push(sessionRunEasy(phase, k, week));
    if (opts.days >= 5) out.push(sessionStrength('B', phase, k, opts.kit));
    if (opts.days >= 6) out.push(sessionEngine(phase, opts, k));
    // Strength and running alternate through the week.
    var order = opts.days >= 5 ? [0, 1, 4, 2, 3, 5] : [0, 1, 2, 3];
    return ensureCore(order.filter(function (i) { return i < out.length; }).map(function (i) { return out[i]; }));
  }

  // Core work twice a week, every week. Strength A always closes on a plank;
  // the second one is added to the other strength day, or after a run when
  // there is none - never to a simulation, and nothing is taken out for it.
  var CORE_NAMES = ['Plank', 'Side plank'];
  function hasCore(session) {
    return session.exercises.some(function (e) { return CORE_NAMES.indexOf(e.name) !== -1; });
  }
  function ensureCore(sessions) {
    var count = sessions.filter(hasCore).length;
    // The other strength day is named after the first one (… A, … B).
    [sessions[0].name.replace(/A$/, 'B'), 'Corsa facile', 'Corsa a intervalli'].forEach(function (name) {
      if (count >= 2) return;
      var s = null;
      sessions.forEach(function (x) { if (!s && x.name === name && !hasCore(x)) s = x; });
      if (!s) return;
      s.exercises.push(timed('Side plank', 3, 30, '60s', 'Per lato.'));
      count += 1;
    });
    return sessions;
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
    var profile = profileById(input.profile);
    var kit = (input.kit === 'dumbbells' || input.kit === 'bodyweight') ? input.kit : 'gym';
    if (profile) { gear = profile.gear.slice(); kit = profile.kit; }
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
      kit: kit,
      profile: profile ? profile.id : '',
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
      equipment: r.kit === 'bodyweight' ? 'bodyweight' : (r.kit === 'dumbbells' ? 'casa' : (missing.length ? 'palestra' : 'hyrox')),
      hyrox_profile: r.profile,
      experience: r.level.id,
      author: 'Generata da Nurvan',
      source: 'hyrox_v1',
      race: { name: r.raceName, date: r.raceDate, division: r.division.id },
      source_summary: 'Preparazione HYROX · ' + r.division.label + ' · ' + r.days + ' giorni a settimana' + (r.profile ? ' · ' + profileById(r.profile).label : (missing.length ? ' · senza: ' + missing.join(', ') : '')),
      meta: { generatedAt: new Date().toISOString(), method: 'hyrox_phases', missing_gear: missing, evidence: EVIDENCE.map(function (e) { return e.url; }).filter(function (u, i, a) { return a.indexOf(u) === i; }) }
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

  /* ---------------------------- evidence ---------------------------- */

  // Why the preparation is laid out this way: what was measured on people
  // who raced, and what the plan does about it. Every line has its study;
  // numbers are the ones the papers report, not rounded to look better.
  var EVIDENCE = [
    { id: 'running',
      fact: 'La corsa vale circa metà del tempo di gara: nei migliori 100 Pro della stagione 2024/25, 27:38 su 56:56 per gli uomini e 30:17 su 1:03:11 per le donne.',
      plan: 'Ogni settimana ha almeno tante sedute di corsa quante di forza, e la corsa cresce per prima quando aggiungi giorni.',
      source: 'Rappelt et al., Frontiers in Physiology 2026 · 39.696 risultati di gara',
      url: 'https://doi.org/10.3389/fphys.2026.1847569' },
    { id: 'vo2max',
      fact: 'Chi ha un VO2max più alto e fa più ore di resistenza a settimana finisce prima: le correlazioni con il tempo finale sono −0,71 e −0,68. Forza della presa e ore di pesi non lo spostano.',
      plan: 'Intervalli a passo gara e corsa facile sono la base; la forza resta in ogni settimana ma non prende il loro posto.',
      source: 'Brandt et al., Frontiers in Physiology 2025 · 11 amatori, gara simulata',
      url: 'https://doi.org/10.3389/fphys.2025.1519240' },
    { id: 'intensity',
      fact: 'In gara si passa circa l’80% del tempo tra il 90 e il 100% della frequenza cardiaca massima; battiti, lattato e fatica toccano il picco ai wall ball, l’ultima stazione.',
      plan: 'Le sedute “Corsa + stazioni” e le simulazioni abituano a quell’intensità, e i wall ball si allenano da stanchi, a fine seduta.',
      source: 'Brandt et al., Frontiers in Physiology 2025',
      url: 'https://doi.org/10.3389/fphys.2025.1519240' },
    { id: 'fade',
      fact: 'La velocità di corsa cala dal primo all’ultimo chilometro: da 16,1 a 13,6 km/h in 24 atleti Pro misurati in gara.',
      plan: 'Si corre subito dopo ogni stazione, a gambe stanche: è il chilometro che la gara chiede davvero.',
      source: 'Gutiérrez-Hellín et al., Int J Sports Physiol Perform 2026',
      url: 'https://doi.org/10.1123/ijspp.2026-0098' },
    { id: 'stations',
      fact: 'Le stazioni di forza costano in proporzione più tempo a chi è più lento, e la slitta da spingere è quella che rimescola di più la classifica.',
      plan: 'Le stazioni si provano dalla prima settimana con i carichi della tua categoria, prima a pezzi e poi alla distanza di gara.',
      source: 'Rappelt et al., Frontiers in Physiology 2026',
      url: 'https://doi.org/10.3389/fphys.2026.1847569' },
    { id: 'economy',
      fact: 'Allenare la forza due o tre volte a settimana migliora l’economia di corsa dal 2 all’8%, senza peggiorare il VO2max.',
      plan: 'Squat, stacchi e affondi restano in programma fino allo scarico, in sedute separate dalla corsa dura.',
      source: 'Blagrove et al., Sports Medicine 2018 · 24 studi',
      url: 'https://doi.org/10.1007/s40279-017-0835-7' },
    { id: 'taper',
      fact: 'Lo scarico che rende di più dura circa due settimane e taglia il volume del 41–60% lasciando invariata l’intensità.',
      plan: 'Le ultime settimane riducono serie e minuti ma tengono il passo gara.',
      source: 'Bosquet et al., Med Sci Sports Exerc 2007 · 27 studi',
      url: 'https://doi.org/10.1249/mss.0b013e31806010e0' },
    { id: 'injury',
      fact: 'In 12 settimane di preparazione gli infortuni sono stati 14,4 ogni 1.000 ore, per il 73% da sovraccarico, soprattutto a ginocchio e gamba.',
      plan: 'I minuti di corsa salgono poco per volta e una parte del lavoro aerobico si fa su vogatore e ski erg.',
      source: 'Chittenden et al., Frontiers in Sports and Active Living 2026 · 89 atleti',
      url: 'https://doi.org/10.3389/fspor.2026.1937574' }
  ];

  /* ---------------------------- database ---------------------------- */

  // The ready-made preparations, as a grid instead of a list: days x level x
  // weeks x category x where one trains. Like the rest of the catalogue
  // (web/program-catalog.js) nothing is stored: the id says which program it
  // is - hyx-4-intermediate-12-open_m-gym - and it is written when opened.
  var CAT_DIVISIONS = ['open_m', 'open_w', 'pro_m', 'pro_w', 'doubles', 'relay'];
  var CAT_LEVEL_OF = { principiante: 'beginner', intermedio: 'intermediate', avanzato: 'advanced' };
  var CAT_EXPERIENCE_OF = { beginner: 'principiante', intermediate: 'intermedio', advanced: 'avanzato' };
  var CAT_PROFILE_OF = { hyrox: 'full', palestra: 'gym', casa: 'home', minimal: 'home', kettlebell: 'home', bodyweight: 'bodyweight' };
  function catalogAudience(division) { return /_w$/.test(division) ? 'female' : (/_m$/.test(division) ? 'male' : 'unisex'); }

  function catalogId(p) { return ['hyx', p.days, p.level, p.weeks, p.division, p.profile].join('-'); }
  function parseCatalogId(id) {
    var s = String(id || '').split('-');
    if (s.length !== 6 || s[0] !== 'hyx') return null;
    var p = { days: Number(s[1]), level: s[2], weeks: Number(s[3]), division: s[4], profile: s[5] };
    if (DAYS.indexOf(p.days) < 0 || WEEKS.indexOf(p.weeks) < 0 || CAT_DIVISIONS.indexOf(p.division) < 0) return null;
    if (!CAT_EXPERIENCE_OF[p.level] || !profileById(p.profile)) return null;
    return p;
  }
  function catalogInput(p) { return { days: p.days, level: p.level, weeks: p.weeks, division: p.division, profile: p.profile }; }
  function catalogTitle(p) {
    return ['HYROX', byId(DIVISIONS, p.division).label, p.days + ' gg', p.weeks + ' sett', byId(LEVELS, p.level).label, profileById(p.profile).label].join(' · ');
  }
  function catalogRow(p) {
    var r = resolve(catalogInput(p));
    var sessions = weekSessions(1, r.weeks, r);
    var exercises = 0, sets = 0;
    sessions.forEach(function (s) { exercises += s.exercises.length; s.exercises.forEach(function (e) { sets += e.setCount; }); });
    return {
      id: catalogId(p), title: catalogTitle(p),
      days_per_week: p.days, duration_weeks: p.weeks, split: 'hyrox', goals: ['hyrox'], purpose: 'hyrox',
      equipment: profileById(p.profile).label, hyrox_profile: p.profile, hyrox_division: p.division,
      sessions: p.days, exercises: exercises, sets: sets,
      source: 'hyrox_v1', source_ext: '.hyrox', experience: CAT_EXPERIENCE_OF[p.level],
      progression_model: 'hyrox_phases', audience: catalogAudience(p.division)
    };
  }
  // The whole preparation, every week of it.
  function catalogBody(id) {
    var p = typeof id === 'string' ? parseCatalogId(id) : id;
    if (!p) return null;
    var prog = plan(catalogInput(p));
    prog.id = catalogId(p);
    prog.title = catalogTitle(p);
    prog.audience = catalogAudience(p.division);
    prog.notes = EVIDENCE.slice(0, 3).map(function (e) { return e.fact + ' (' + e.source + ')'; });
    return prog;
  }
  function catalogValues(filters) {
    var f = filters || {};
    var one = function (all, want) { return (want !== undefined && want !== null && want !== '' && all.indexOf(want) >= 0) ? [want] : all; };
    var profiles = PROFILES.map(function (x) { return x.id; });
    var divisions = CAT_DIVISIONS;
    if (f.audience === 'female') divisions = ['open_w', 'pro_w'];
    else if (f.audience === 'male') divisions = ['open_m', 'pro_m'];
    else if (f.audience === 'unisex') divisions = ['doubles', 'relay'];
    // A filter the grid has no value for (2 days, 4 weeks) has no program.
    var strict = function (all, want) { return (want === undefined || want === null || want === '') ? all : (all.indexOf(want) >= 0 ? [want] : []); };
    return {
      days: strict(DAYS, f.days === '' || f.days == null ? '' : Number(f.days)),
      level: f.experience ? strict(['beginner', 'intermediate', 'advanced'], CAT_LEVEL_OF[f.experience] || f.experience) : ['beginner', 'intermediate', 'advanced'],
      weeks: strict(WEEKS, f.duration === '' || f.duration == null ? '' : Number(f.duration)),
      division: one(divisions, f.division),
      profile: f.equipment ? strict(profiles, profileById(f.equipment) ? f.equipment : (CAT_PROFILE_OF[f.equipment] || f.equipment)) : profiles
    };
  }
  function catalogTotal(filters) {
    var v = catalogValues(filters);
    return v.days.length * v.level.length * v.weeks.length * v.division.length * v.profile.length;
  }
  // Rows for the screen: where one trains first, so the first screen already
  // shows every kind of equipment, then category, level, days and length.
  function catalogSearch(filters, limit) {
    var v = catalogValues(filters);
    var cap = limit || 150;
    var rows = [];
    var weeks = v.weeks.slice().sort(function (a, b) { return Math.abs(a - 12) - Math.abs(b - 12); });
    outer:
    for (var d = 0; d < v.division.length; d++) {
      for (var l = 0; l < v.level.length; l++) {
        for (var n = 0; n < v.days.length; n++) {
          for (var w = 0; w < weeks.length; w++) {
            for (var q = 0; q < v.profile.length; q++) {
              rows.push(catalogRow({ days: v.days[n], level: v.level[l], weeks: weeks[w], division: v.division[d], profile: v.profile[q] }));
              if (rows.length >= cap) break outer;
            }
          }
        }
      }
    }
    return { rows: rows, total: catalogTotal(filters) };
  }
  // One week to start a hand-written program from: the first week of the
  // build phase, the one that looks most like "a normal week".
  function sampleWeek(input) {
    var r = resolve(input);
    for (var w = 1; w <= r.weeks; w++) if (phaseOf(w, r.weeks) === 'build') return weekSessions(w, r.weeks, r);
    return weekSessions(1, r.weeks, r);
  }

  // "HYROX" written as a goal, in an intake, a profile or a request.
  function wantsHyrox(text) { return /hyrox/i.test(String(text == null ? '' : text)); }

  root.NurvanHyrox = {
    STATIONS: STATIONS,
    DIVISIONS: DIVISIONS,
    GEAR: GEAR,
    LEVELS: LEVELS,
    DAYS: DAYS,
    WEEKS: WEEKS,
    PHASE_LABELS: PHASE_LABELS,
    EVIDENCE: EVIDENCE,
    PROFILES: PROFILES,
    profileById: profileById,
    profileOfGear: profileOfGear,
    sampleWeek: sampleWeek,
    catalogId: catalogId,
    parseCatalogId: parseCatalogId,
    catalogRow: function (id) { var p = parseCatalogId(id); return p ? catalogRow(p) : null; },
    catalogBody: catalogBody,
    catalogSearch: catalogSearch,
    catalogTotal: catalogTotal,
    wantsHyrox: wantsHyrox,
    taperWeeks: taperWeeks,
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
