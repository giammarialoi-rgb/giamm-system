/*
 * Training at home, without a gym: Pilates on the mat, mobility and
 * stretching, calisthenics, HIIT.
 *
 * Each discipline has its own way of being trained - Pilates is a sequence
 * done in a fixed order, mobility is positions held for a time, calisthenics
 * is a ladder of harder and harder versions of the same movement, HIIT is a
 * clock - so each one has its own writer here. What they share is the
 * result: a program with the same shape as every other program of the app
 * (weeks -> sessions -> exercises), so it is read, edited, logged and, when
 * wanted, followed as a timed lesson like the others.
 *
 * Like the HYROX preparations (web/hyrox.js), the ready-made programs are a
 * grid, not a list: the id says which program it is and it is written when
 * opened.
 */
(function (root) {
  'use strict';

  var LEVELS = [
    { id: 'principiante', label: 'Principiante', n: 0 },
    { id: 'intermedio', label: 'Intermedio', n: 1 },
    { id: 'avanzato', label: 'Avanzato', n: 2 }
  ];
  var MINUTES = [20, 30, 45];
  var WEEKS = [4, 6, 8, 12];

  var DISCIPLINES = [
    { id: 'pilates', label: 'Pilates matwork', short: 'Pilates',
      note: 'La sequenza classica sul tappetino: centro, controllo e respiro.',
      needs: 'Un tappetino.',
      days: [2, 3, 4, 5],
      kits: [{ id: 'mat', label: 'Tappetino' }] },
    { id: 'mobilita', label: 'Mobilità e stretching', short: 'Mobilità',
      note: 'Posizioni tenute e movimenti lenti per guadagnare ampiezza di movimento.',
      needs: 'Niente: un tappetino aiuta.',
      days: [3, 4, 5, 6],
      kits: [
        { id: 'full', label: 'Tutto il corpo' },
        { id: 'lower', label: 'Anche e gambe' },
        { id: 'upper', label: 'Spalle e schiena' }
      ] },
    { id: 'calisthenics', label: 'Calisthenics', short: 'Calisthenics',
      note: 'Forza a corpo libero: la stessa spinta, la stessa tirata, in versioni sempre più difficili.',
      needs: 'Niente; con una sbarra si allena anche la tirata vera.',
      days: [3, 4, 5],
      kits: [
        { id: 'floor', label: 'Solo pavimento' },
        { id: 'bar', label: 'Con sbarra per trazioni' },
        { id: 'bar_dips', label: 'Sbarra e parallele' }
      ] },
    { id: 'hiit', label: 'HIIT e Tabata', short: 'HIIT',
      note: 'Circuiti a tempo: pochi minuti molto intensi, recuperi brevi.',
      needs: 'Niente; elastici o un kettlebell se li hai.',
      days: [2, 3, 4],
      kits: [
        { id: 'bodyweight', label: 'Corpo libero' },
        { id: 'bands', label: 'Con elastici' },
        { id: 'kettlebell', label: 'Con kettlebell' }
      ] }
  ];

  function byId(list, id, fallback) {
    for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i];
    return fallback === undefined ? list[0] : fallback;
  }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function discipline(id) { return byId(DISCIPLINES, id, null); }

  /* ------------------------------ rows ------------------------------ */

  function repsRow(name, sets, reps, rest, note, muscle) {
    var list = [];
    for (var i = 0; i < sets; i++) list.push({ reps: String(reps), target_load: null });
    var row = { name: name, name_original: name, unit: 'reps', sets: list, setCount: sets, repsTarget: String(reps), rirTarget: 2, rest: rest || '60s', role: 'accessory' };
    if (muscle) row.muscle_groups = [muscle];
    if (note) { row.notes = note; row.cue = true; }
    return row;
  }
  function timeRow(name, sets, seconds, rest, note, muscle) {
    var list = [];
    for (var i = 0; i < sets; i++) list.push({ reps: seconds + 's', seconds: seconds, target_load: null });
    var row = { name: name, name_original: name, unit: 'time', sets: list, setCount: sets, repsTarget: seconds + 's', rest: rest || '30s' };
    if (muscle) row.muscle_groups = [muscle];
    if (note) { row.notes = note; row.cue = true; }
    return row;
  }
  function cardioRow(name, minutes, note) {
    var row = { name: name, name_original: name, muscle_groups: ['CARDIO'], unit: 'cardio', sets: [{ reps: minutes + ' min', minutes: minutes, target_load: null }], setCount: 1, repsTarget: minutes + ' min', rest: '60s' };
    if (note) { row.notes = note; row.cue = true; }
    return row;
  }
  function circuitRow(label, work, rest, rounds, roundRest, items, note) {
    var name = 'Circuito ' + label;
    var row = {
      name: name, name_original: name, muscle_groups: ['CARDIO'], unit: 'circuit',
      circuit: { format: 'custom', work: work, rest: rest, rounds: rounds, roundRest: roundRest, items: items.map(function (n) { return { name: n, muscle: 'CARDIO' }; }) },
      sets: [{ reps: rounds + ' round', target_load: null }], setCount: 1, repsTarget: rounds + ' round', rest: '2 min'
    };
    if (note) { row.notes = note; row.cue = true; }
    return row;
  }

  // How far into the program a week is: 0 at the start, 1 at the end.
  function progressOf(week, weeks) { return weeks <= 1 ? 0 : (week - 1) / (weeks - 1); }
  // The last week of a long program is lighter: what was built is absorbed.
  function isDeload(week, weeks) { return weeks >= 8 && week === weeks; }

  /* ----------------------------- Pilates ----------------------------- */

  // The mat sequence in its classical order (J. H. Pilates, "Return to Life
  // Through Contrology", 1945), with the preparatory exercises teachers put
  // in front of it. lvl: who it is for; core: always in a session; sec: time
  // (the rest is by repetitions); side: done on each side.
  var PILATES = [
    { name: 'Pelvic curl', en: 'Pelvic Curl', lvl: 0, reps: 8, core: false, muscle: 'GLUTEI', cue: 'Bacino che si arrotola, una vertebra alla volta, su e giù.' },
    { name: 'Chest lift', en: 'Pilates Chest Lift', lvl: 0, reps: 10, core: false, muscle: 'ADDOME', cue: 'Testa e spalle si sollevano, bacino fermo, sguardo alle ginocchia.' },
    { name: 'Hundred', en: 'Pilates Hundred', lvl: 0, sec: 45, core: true, muscle: 'ADDOME', cue: 'Braccia che battono piccole e veloci: inspira per 5 battiti, espira per 5.' },
    { name: 'Roll up', en: 'Pilates Roll Up', lvl: 0, reps: 6, core: true, muscle: 'ADDOME', cue: 'Sali e scendi una vertebra alla volta, senza slancio.' },
    { name: 'Roll over', en: 'Pilates Roll Over', lvl: 2, reps: 5, core: false, muscle: 'ADDOME', cue: 'Gambe oltre la testa con controllo, peso sulle scapole e mai sul collo.' },
    { name: 'Single leg circles', en: 'Pilates Single Leg Circles', lvl: 0, reps: 5, side: true, core: true, muscle: 'ADDOME', cue: 'Cerchi con la gamba, bacino immobile. Poi inverti il senso.' },
    { name: 'Rolling like a ball', en: 'Pilates Rolling Like a Ball', lvl: 0, reps: 8, core: true, muscle: 'ADDOME', cue: 'Schiena tonda, rotola fino alle scapole e torna in equilibrio.' },
    { name: 'Single leg stretch', en: 'Pilates Single Leg Stretch', lvl: 0, reps: 8, side: true, core: true, muscle: 'ADDOME', cue: 'Un ginocchio al petto, l’altra gamba lunga: cambia senza muovere il busto.' },
    { name: 'Double leg stretch', en: 'Pilates Double Leg Stretch', lvl: 0, reps: 8, core: true, muscle: 'ADDOME', cue: 'Braccia e gambe si allungano insieme, poi tornano al centro.' },
    { name: 'Scissors', en: 'Pilates Single Straight Leg Stretch', lvl: 1, reps: 8, side: true, core: false, muscle: 'ADDOME', cue: 'Gambe tese a forbice, due piccoli richiami sulla gamba alta.' },
    { name: 'Lower lift', en: 'Pilates Double Straight Leg Lower Lift', lvl: 1, reps: 8, core: false, muscle: 'ADDOME', cue: 'Gambe tese che scendono solo finché la schiena resta a terra.' },
    { name: 'Criss cross', en: 'Pilates Criss Cross', lvl: 1, reps: 8, side: true, core: false, muscle: 'ADDOME', cue: 'Ruota il busto, non i gomiti: la spalla va verso il ginocchio opposto.' },
    { name: 'Spine stretch forward', en: 'Pilates Spine Stretch Forward', lvl: 0, reps: 5, core: true, muscle: 'SCHIENA', cue: 'Seduto alto, arrotola in avanti come sopra una palla e risali.' },
    { name: 'Open leg rocker', en: 'Pilates Open Leg Rocker', lvl: 1, reps: 6, core: false, muscle: 'ADDOME', cue: 'Gambe a V, rotola indietro e torna in equilibrio sugli ischi.' },
    { name: 'Corkscrew', en: 'Pilates Corkscrew', lvl: 1, reps: 3, side: true, core: false, muscle: 'ADDOME', cue: 'Gambe unite che disegnano un cerchio, spalle a terra.' },
    { name: 'Saw', en: 'Pilates Saw', lvl: 1, reps: 4, side: true, core: false, muscle: 'SCHIENA', cue: 'Ruota e allunga il mignolo oltre il piede opposto, bacino fermo.' },
    { name: 'Swan', en: 'Pilates Swan', lvl: 1, reps: 6, core: false, muscle: 'SCHIENA', cue: 'Petto che si apre in avanti e in alto, glutei attivi, collo lungo.' },
    { name: 'Single leg kick', en: 'Pilates Single Leg Kick', lvl: 1, reps: 6, side: true, core: false, muscle: 'FEMORALI', cue: 'Sui gomiti, due calci verso il gluteo, addome sollevato.' },
    { name: 'Double leg kick', en: 'Pilates Double Leg Kick', lvl: 1, reps: 4, side: true, core: false, muscle: 'SCHIENA', cue: 'Tre calci, poi allunga gambe e braccia aprendo il petto.' },
    { name: 'Neck pull', en: 'Pilates Neck Pull', lvl: 1, reps: 5, core: false, muscle: 'ADDOME', cue: 'Come il roll up, mani dietro la nuca e gomiti larghi.' },
    { name: 'Jackknife', en: 'Pilates Jackknife', lvl: 2, reps: 4, core: false, muscle: 'ADDOME', cue: 'Gambe oltre la testa, poi verticali verso il soffitto. Mai sul collo.' },
    { name: 'Shoulder bridge', en: 'Pilates Shoulder Bridge', lvl: 0, reps: 6, side: true, core: false, muscle: 'GLUTEI', cue: 'Bacino alto e fermo mentre una gamba sale e scende.' },
    { name: 'Spine twist', en: 'Pilates Spine Twist', lvl: 0, reps: 5, side: true, core: false, muscle: 'ADDOME', cue: 'Seduto alto, ruota dal centro, braccia larghe.' },
    { name: 'Side kick series', en: 'Pilates Side Kick Series', lvl: 0, reps: 8, side: true, core: false, muscle: 'GLUTEI', cue: 'Sul fianco: gamba avanti e indietro, busto fermo come un muro.' },
    { name: 'Teaser', en: 'Pilates Teaser', lvl: 1, reps: 4, core: false, muscle: 'ADDOME', cue: 'Busto e gambe salgono a V e restano in equilibrio.' },
    { name: 'Hip circles', en: 'Pilates Hip Circles', lvl: 2, reps: 3, side: true, core: false, muscle: 'ADDOME', cue: 'Seduto sulle mani, le gambe unite disegnano un cerchio ampio.' },
    { name: 'Swimming', en: 'Pilates Swimming', lvl: 0, sec: 30, core: true, muscle: 'SCHIENA', cue: 'Braccio e gamba opposti si alternano rapidi, addome sollevato dal tappetino.' },
    { name: 'Leg pull front', en: 'Pilates Leg Pull Front', lvl: 1, reps: 4, side: true, core: false, muscle: 'ADDOME', cue: 'In plank: una gamba sale e scende, il bacino non si muove.' },
    { name: 'Leg pull back', en: 'Pilates Leg Pull', lvl: 2, reps: 3, side: true, core: false, muscle: 'GLUTEI', cue: 'Plank rovesciato: bacino alto mentre una gamba sale tesa.' },
    { name: 'Kneeling side kick', en: 'Pilates Kneeling Side Kick', lvl: 2, reps: 5, side: true, core: false, muscle: 'GLUTEI', cue: 'Su un ginocchio e una mano: la gamba va avanti e indietro all’altezza dell’anca.' },
    { name: 'Mermaid', en: 'Pilates Mermaid', lvl: 0, reps: 4, side: true, core: false, muscle: 'ADDOME', cue: 'Seduto, un braccio sale e il fianco si allunga senza cadere in avanti.' },
    { name: 'Boomerang', en: 'Pilates Boomerang', lvl: 2, reps: 4, core: false, muscle: 'ADDOME', cue: 'Rotola indietro, incrocia le caviglie, risali in teaser e allunga in avanti.' },
    { name: 'Seal', en: 'Pilates Seal', lvl: 0, reps: 6, core: true, muscle: 'ADDOME', cue: 'Rotola e batti i piedi tre volte, dietro e davanti.' },
    { name: 'Control balance', en: 'Pilates Control Balance', lvl: 2, reps: 3, side: true, core: false, muscle: 'ADDOME', cue: 'Gambe oltre la testa: una resta a terra, l’altra sale verso il soffitto.' },
    { name: 'Pilates push-up', en: 'Pilates Push Up', lvl: 1, reps: 4, core: false, muscle: 'PETTO', cue: 'Arrotola fino a terra, cammina in plank, tre piegamenti stretti, risali.' }
  ];
  function pilatesSeconds(e, reps) { return (e.sec ? e.sec : reps * (e.side ? 2 : 1) * 6) + 15; }

  function pilatesSession(r, week, day) {
    var p = progressOf(week, r.weeks);
    var deload = isDeload(week, r.weeks);
    // The harder exercises come in once the base is there.
    var allowed = r.level.n + (p >= 0.5 ? 1 : 0);
    if (r.level.n === 0) allowed = p >= 0.5 ? 1 : 0;
    allowed = clamp(allowed, 0, 2);
    var budget = r.minutes * 60 * (deload ? 0.8 : 1);
    var grow = deload ? 1 : (1 + 0.3 * p);
    var repsOf = function (e) { return e.sec ? 0 : clamp(Math.round(e.reps * grow), e.reps, e.reps + 4); };
    var chosen = [];
    var used = 0;
    var take = function (e) {
      var reps = repsOf(e);
      chosen.push({ e: e, reps: reps });
      used += pilatesSeconds(e, reps);
    };
    PILATES.forEach(function (e) { if (e.core && e.lvl <= allowed) take(e); });
    // The others take turns, so two sessions of the same week are not the same.
    var optional = PILATES.filter(function (e) { return !e.core && e.lvl <= allowed; });
    var start = optional.length ? ((day * 3 + week) % optional.length) : 0;
    for (var i = 0; i < optional.length; i++) {
      var e = optional[(start + i * 2 + (i * 2 >= optional.length ? 1 : 0)) % optional.length];
      if (chosen.some(function (c) { return c.e === e; })) continue;
      if (used + pilatesSeconds(e, repsOf(e)) > budget) continue;
      take(e);
    }
    chosen.sort(function (a, b) { return PILATES.indexOf(a.e) - PILATES.indexOf(b.e); });
    // When the exercises allowed are fewer than the time asked for, each is
    // done twice (three times at most) rather than inventing harder ones.
    var sets = clamp(Math.round(budget / Math.max(1, used)), 1, 3);
    var rows = chosen.map(function (c) {
      var e = c.e;
      var note = (e.side ? 'Per lato. ' : '') + e.cue;
      var sec = e.sec ? clamp(Math.round(e.sec * grow / 5) * 5, e.sec, e.sec + 30) : 0;
      return e.sec ? timeRow(e.name, sets, sec, '15s', note, e.muscle) : repsRow(e.name, sets, c.reps, '15s', note, e.muscle);
    });
    var name = 'Matwork ' + (day + 1);
    return { name: name, title: name, exercises: rows };
  }

  /* ----------------------------- mobility ---------------------------- */

  // area: lower | upper | spine. sec: a position held; reps: a slow movement.
  var MOBILITY = [
    { name: 'Cat-cow', en: 'Cat Cow Stretch', area: 'spine', reps: 10, muscle: 'SCHIENA', cue: 'In quadrupedia: schiena che si inarca e si arrotonda, lenta, con il respiro.' },
    { name: 'World’s greatest stretch', en: 'World\'s Greatest Stretch', area: 'lower', reps: 5, side: true, muscle: 'GAMBE', cue: 'Affondo lungo, gomito verso terra, poi ruota il braccio al soffitto.' },
    { name: 'Stretch 90/90 anche', en: '90/90 Hip Stretch', area: 'lower', sec: 40, side: true, muscle: 'GLUTEI', cue: 'Due ginocchia a 90°, busto alto che si inclina sulla gamba davanti.' },
    { name: 'Stretch flessori dell’anca', en: 'Half Kneeling Hip Flexor Stretch', area: 'lower', sec: 40, side: true, muscle: 'QUADRICIPITI', cue: 'In mezzo affondo, gluteo contratto e bacino in avanti: tira davanti all’anca.' },
    { name: 'Posizione del bambino', en: 'Child\'s Pose', area: 'spine', sec: 45, muscle: 'SCHIENA', cue: 'Glutei sui talloni, braccia lunghe, respiro nella schiena.' },
    { name: 'Cane a testa in giù', en: 'Downward Dog', area: 'lower', sec: 40, muscle: 'FEMORALI', cue: 'Bacino in alto, schiena lunga, talloni che scendono poco per volta.' },
    { name: 'Cobra', en: 'Cobra Stretch', area: 'spine', sec: 30, muscle: 'ADDOME', cue: 'A pancia in giù, spingi sulle mani e apri il petto, bacino a terra.' },
    { name: 'Rotazioni toraciche in quadrupedia', en: 'Quadruped Thoracic Rotation', area: 'upper', reps: 8, side: true, muscle: 'SCHIENA', cue: 'Una mano dietro la nuca: il gomito scende e poi sale al soffitto.' },
    { name: 'Thread the needle', en: 'Thread the Needle Stretch', area: 'upper', reps: 6, side: true, muscle: 'SPALLE', cue: 'In quadrupedia, il braccio passa sotto il busto finché la spalla tocca terra.' },
    { name: 'Squat profondo tenuto', en: 'Deep Squat Hold', area: 'lower', sec: 45, muscle: 'GAMBE', cue: 'Talloni a terra, gomiti che spingono le ginocchia in fuori, petto alto.' },
    { name: 'Stretch ischiocrurali supino', en: 'Supine Hamstring Stretch', area: 'lower', sec: 40, side: true, muscle: 'FEMORALI', cue: 'Sdraiato, una gamba tesa verso il soffitto, l’altra lunga a terra.' },
    { name: 'Stretch del piccione', en: 'Pigeon Stretch', area: 'lower', sec: 45, side: true, muscle: 'GLUTEI', cue: 'Gamba davanti piegata, quella dietro lunga: il bacino resta dritto.' },
    { name: 'Stretch a rana', en: 'Frog Stretch', area: 'lower', sec: 45, muscle: 'GAMBE', cue: 'Ginocchia larghe a terra, bacino che va indietro senza inarcare.' },
    { name: 'Stretch polpacci al muro', en: 'Wall Calf Stretch', area: 'lower', sec: 30, side: true, muscle: 'POLPACCI', cue: 'Mani al muro, gamba dietro tesa, tallone a terra.' },
    { name: 'Stretch pettorali al muro', en: 'Wall Pec Stretch', area: 'upper', sec: 30, side: true, muscle: 'PETTO', cue: 'Avambraccio al muro, ruota il busto dall’altra parte.' },
    { name: 'Cerchi controllati della spalla', en: 'Shoulder CARs', area: 'upper', reps: 5, side: true, muscle: 'SPALLE', cue: 'Il cerchio più grande che riesci, lentissimo, senza muovere il busto.' },
    { name: 'Cerchi controllati dell’anca', en: 'Hip CARs', area: 'lower', reps: 5, side: true, muscle: 'GLUTEI', cue: 'In piedi o in quadrupedia: il ginocchio disegna il cerchio più ampio possibile.' },
    { name: 'Stretch quadricipite in piedi', en: 'Standing Quad Stretch', area: 'lower', sec: 30, side: true, muscle: 'QUADRICIPITI', cue: 'Tallone al gluteo, ginocchia vicine, bacino in avanti.' },
    { name: 'Torsione supina', en: 'Supine Spinal Twist', area: 'spine', sec: 40, side: true, muscle: 'SCHIENA', cue: 'Ginocchio che cade da un lato, spalle a terra, sguardo dall’altro.' },
    { name: 'Stretch dorsali in ginocchio', en: 'Kneeling Lat Stretch', area: 'upper', sec: 40, muscle: 'DORSALI', cue: 'In ginocchio, mani su un rialzo, petto che scende tra le braccia.' },
    { name: 'Cossack squat', en: 'Cossack Squat', area: 'lower', reps: 6, side: true, muscle: 'QUADRICIPITI', cue: 'Da gambe larghe, scendi su un lato tenendo l’altra gamba tesa.' },
    { name: 'Stretch a farfalla', en: 'Butterfly Stretch', area: 'lower', sec: 45, muscle: 'GAMBE', cue: 'Piante dei piedi unite, schiena lunga, ginocchia che scendono da sole.' },
    { name: 'Stretch laterale del collo', en: 'Lateral Neck Stretch', area: 'upper', sec: 20, side: true, muscle: 'TRAPEZIO', cue: 'Orecchio verso la spalla, spalla opposta bassa. Senza tirare.' },
    { name: 'Scivolamenti al muro', en: 'Wall Slides', area: 'upper', reps: 10, muscle: 'SPALLE', cue: 'Schiena e avambracci al muro: le braccia salgono senza staccarsi.' },
    { name: 'Estensione toracica a terra', en: 'Thoracic Extension Stretch', area: 'upper', sec: 40, muscle: 'SCHIENA', cue: 'In ginocchio, gomiti su un rialzo, mani dietro la nuca, petto verso terra.' },
    { name: 'Jefferson curl a corpo libero', en: 'Bodyweight Jefferson Curl', area: 'spine', reps: 6, muscle: 'SCHIENA', cue: 'In piedi, arrotola giù una vertebra alla volta e risali allo stesso modo.' }
  ];

  function mobilitySession(r, week, day) {
    var p = progressOf(week, r.weeks);
    var deload = isDeload(week, r.weeks);
    // Holds get longer through the program: time under stretch is what counts.
    var extra = deload ? 0 : Math.round(p * 15 / 5) * 5;
    var base = [0, 10, 20][r.level.n];
    var sets = r.level.n === 0 ? 1 : 2;
    var areas = r.kit === 'lower' ? ['lower', 'lower', 'spine'] : (r.kit === 'upper' ? ['upper', 'upper', 'spine'] : [['lower', 'spine', 'upper'], ['upper', 'spine', 'lower'], ['spine', 'lower', 'upper']][day % 3]);
    var budget = r.minutes * 60;
    var pools = { lower: MOBILITY.filter(function (e) { return e.area === 'lower'; }), upper: MOBILITY.filter(function (e) { return e.area === 'upper'; }), spine: MOBILITY.filter(function (e) { return e.area === 'spine'; }) };
    var inFocus = MOBILITY.filter(function (e) { return areas.indexOf(e.area) !== -1; }).length;
    var build = function (sets) {
      var used = 0;
      var rows = [];
      var seen = {};
      var count = 0;
      for (var turn = 0; turn < 90 && count < inFocus; turn++) {
        var area = areas[turn % areas.length];
        var pool = pools[area];
        var e = pool[(day * 2 + Math.floor(turn / areas.length) + (week % 2)) % pool.length];
        if (seen[e.name]) continue;
        var sec = e.sec ? e.sec + base + extra : 0;
        var cost = ((e.sec ? sec : e.reps * 4) * (e.side ? 2 : 1) + 10) * sets;
        if (used + cost > budget + 30) continue;
        seen[e.name] = true;
        count++;
        used += cost;
        var note = (e.side ? 'Per lato. ' : '') + e.cue;
        rows.push(e.sec ? timeRow(e.name, sets, sec, '10s', note, e.muscle) : repsRow(e.name, sets, e.reps, '10s', note, e.muscle));
      }
      return { rows: rows, used: used };
    };
    var built = build(sets);
    while (built.used < budget * 0.75 && sets < 3) { sets++; built = build(sets); }
    var rows = built.rows;
    var label = r.kit === 'lower' ? 'Anche e gambe' : (r.kit === 'upper' ? 'Spalle e schiena' : ['Mobilità A', 'Mobilità B', 'Mobilità C'][day % 3]);
    var name = (r.kit === 'full' ? label : label + ' ' + (day + 1));
    return { name: name, title: name, exercises: rows };
  }

  /* --------------------------- calisthenics -------------------------- */

  // A ladder is the same movement from its easiest version to its hardest.
  // unit 'time' = a position held for seconds.
  var LADDERS = {
    push: [
      { name: 'Push-up inclinato', reps: '8-12', muscle: 'PETTO', cue: 'Mani su un rialzo: corpo in linea dalla testa ai talloni.' },
      { name: 'Push-up', reps: '8-12', muscle: 'PETTO', cue: 'Petto a un pugno da terra, gomiti a 45°.' },
      { name: 'Push-up diamante', reps: '6-10', muscle: 'TRICIPITI', cue: 'Mani vicine sotto il petto, gomiti lungo i fianchi.' },
      { name: 'Archer push-up', reps: '4-8', muscle: 'PETTO', cue: 'Un braccio lavora, l’altro resta teso di lato. Per lato.' }
    ],
    vpush: [
      { name: 'Pike push-up', reps: '6-10', muscle: 'SPALLE', cue: 'Bacino alto, la testa scende davanti alle mani.' },
      { name: 'Pike push-up', reps: '8-12', muscle: 'SPALLE', cue: 'Piedi su un rialzo per caricare di più le spalle.' },
      { name: 'Handstand push-up al muro', reps: '3-6', muscle: 'SPALLE', cue: 'In verticale al muro, scendi finché la testa sfiora terra.' }
    ],
    dips: [
      { name: 'Dip su sedia', reps: '8-12', muscle: 'TRICIPITI', cue: 'Mani sul bordo, gomiti indietro, spalle lontane dalle orecchie.' },
      { name: 'Dip su sedia', reps: '12-15', muscle: 'TRICIPITI', cue: 'Gambe tese, piedi lontani.' },
      { name: 'Dips parallele', reps: '5-10', muscle: 'PETTO', cue: 'Scendi fino a spalle sotto i gomiti, busto appena inclinato.' }
    ],
    pullBar: [
      { name: 'Dead hang', sec: 30, muscle: 'DORSALI', cue: 'Appeso alla sbarra, spalle attive e lontane dalle orecchie.' },
      { name: 'Trazioni negative', reps: '4-6', muscle: 'DORSALI', cue: 'Parti dall’alto e scendi in 5 secondi.' },
      { name: 'Trazioni presa supina', reps: '4-8', muscle: 'DORSALI', cue: 'Mento sopra la sbarra, discesa completa.' },
      { name: 'Trazioni presa prona', reps: '5-10', muscle: 'DORSALI', cue: 'Petto verso la sbarra, niente slancio.' }
    ],
    pullBar2: [
      { name: 'Scapular pull-up', reps: '8-10', muscle: 'DORSALI', cue: 'Braccia tese: solo le scapole si abbassano e risalgono.' },
      { name: 'Inverted row', reps: '8-12', muscle: 'DORSALI', cue: 'Sotto una sbarra bassa o un tavolo solido: petto alla sbarra, corpo in linea.' },
      { name: 'Hanging knee raise', reps: '8-12', muscle: 'ADDOME', cue: 'Appeso: ginocchia al petto senza dondolare.' },
      { name: 'Leg raise', reps: '6-10', muscle: 'ADDOME', cue: 'Appeso: gambe tese fino all’orizzontale.' }
    ],
    pullFloor: [
      { name: 'Reverse snow angel', reps: '10-12', muscle: 'DORSALI', cue: 'A pancia in giù, braccia staccate da terra che vanno dai fianchi a sopra la testa.' },
      { name: 'Towel row', reps: '8-12', muscle: 'DORSO', cue: 'Asciugamano chiuso in una porta solida: tira il petto alle mani, corpo in linea.' },
      { name: 'Y raise a terra', reps: '10-15', muscle: 'SPALLE', cue: 'A pancia in giù, braccia a Y: sollevale con i pollici in alto.' },
      { name: 'Towel row', reps: '10-15', muscle: 'DORSO', cue: 'Piedi più avanti, corpo più orizzontale.' }
    ],
    legs: [
      { name: 'Squat a corpo libero', reps: '15-20', muscle: 'QUADRICIPITI', cue: 'Anche sotto le ginocchia, talloni a terra.' },
      { name: 'Affondi a corpo libero', reps: '10-12', muscle: 'QUADRICIPITI', cue: 'Passo indietro, ginocchio che sfiora terra. Per lato.' },
      { name: 'Pistol squat assistito', reps: '5-8', muscle: 'QUADRICIPITI', cue: 'Su una gamba, una mano a un appoggio. Per lato.' },
      { name: 'Pistol squat', reps: '3-6', muscle: 'QUADRICIPITI', cue: 'Su una gamba fino in fondo, l’altra tesa avanti. Per lato.' }
    ],
    hinge: [
      { name: 'Glute bridge', reps: '15-20', muscle: 'GLUTEI', cue: 'Spingi sui talloni, una pausa in alto.' },
      { name: 'Single-leg bridge', reps: '10-12', muscle: 'GAMBE', cue: 'Una gamba sola, bacino in linea. Per lato.' },
      { name: 'Nordic curl', reps: '4-6', muscle: 'FEMORALI', cue: 'Piedi bloccati: scendi il più lentamente possibile, risali con le mani.' },
      { name: 'Nordic curl', reps: '6-8', muscle: 'FEMORALI', cue: 'Discesa in 5 secondi, il meno aiuto possibile dalle mani.' }
    ],
    core: [
      { name: 'Plank', sec: 30, muscle: 'ADDOME', cue: 'Glutei e addome contratti, bacino in linea.' },
      { name: 'Hollow hold', sec: 25, muscle: 'ADDOME', cue: 'Zona lombare incollata a terra, braccia e gambe lunghe.' },
      { name: 'L-sit raccolto', sec: 15, muscle: 'ADDOME', cue: 'Mani a terra o su due rialzi: bacino sollevato, ginocchia al petto.' },
      { name: 'L-sit raccolto', sec: 25, muscle: 'ADDOME', cue: 'Allunga una gamba alla volta.' }
    ],
    core2: [
      { name: 'Dead bug', reps: '8-10', muscle: 'ADDOME', cue: 'Braccio e gamba opposti si allungano, schiena a terra. Per lato.' },
      { name: 'Side plank', sec: 25, muscle: 'ADDOME', cue: 'Sul fianco, bacino alto. Per lato.' },
      { name: 'Hollow rock', reps: '10-15', muscle: 'ADDOME', cue: 'In hollow, dondola senza perdere la forma.' },
      { name: 'Arch hold', sec: 30, muscle: 'SCHIENA', cue: 'A pancia in giù, petto e gambe sollevati.' }
    ],
    skill: [
      { name: 'Wall sit', sec: 30, muscle: 'QUADRICIPITI', cue: 'Schiena al muro, ginocchia a 90°.' },
      { name: 'Arch hold', sec: 25, muscle: 'SCHIENA', cue: 'A pancia in giù, petto e gambe sollevati.' },
      { name: 'Handstand hold', sec: 20, muscle: 'SPALLE', cue: 'Pancia al muro, corpo in linea, spalle che spingono.' },
      { name: 'Handstand hold', sec: 35, muscle: 'SPALLE', cue: 'Pancia al muro, prova a staccare un piede alla volta.' }
    ],
    jump: [
      { name: 'Calf raise a corpo libero', reps: '15-20', muscle: 'POLPACCI', cue: 'Su un gradino, discesa completa. Su una gamba se è facile.' },
      { name: 'Step-up', reps: '10-12', muscle: 'QUADRICIPITI', cue: 'Sali su un rialzo spingendo solo con la gamba sopra. Per lato.' },
      { name: 'Squat jump', reps: '8-10', muscle: 'CARDIO', cue: 'Scendi in squat ed esplodi verso l’alto, atterra morbido.' },
      { name: 'Affondi saltati', reps: '8-10', muscle: 'CARDIO', cue: 'Cambia gamba in volo, atterra morbido. Per lato.' }
    ]
  };

  function calisRow(slot, r, week, sets) {
    var ladder = LADDERS[slot];
    var p = progressOf(week, r.weeks);
    // Half-way through, the next rung of the ladder.
    var step = clamp(r.level.n + (p >= 0.5 ? 1 : 0), 0, ladder.length - 1);
    // Parallel bars only for who has them: the others stay on the chair.
    if (slot === 'dips' && r.kit !== 'bar_dips') step = Math.min(step, 1);
    var e = ladder[step];
    var deload = isDeload(week, r.weeks);
    var n = deload ? Math.max(2, sets - 1) : sets;
    if (e.sec) {
      var half = p >= 0.5 ? p - 0.5 : p;
      return timeRow(e.name, n, e.sec + Math.round(half * 20 / 5) * 5, '60s', e.cue, e.muscle);
    }
    return repsRow(e.name, n, e.reps, slot === 'core2' || slot === 'jump' ? '60s' : '90s', e.cue, e.muscle);
  }

  function calisthenicsSession(r, week, day) {
    var hasBar = r.kit !== 'floor';
    var pull = hasBar ? 'pullBar' : 'pullFloor';
    var pull2 = hasBar ? 'pullBar2' : 'pullFloor';
    var push2 = r.kit === 'bar_dips' ? 'dips' : 'vpush';
    var push3 = r.kit === 'bar_dips' ? 'vpush' : 'dips';
    var sets = r.level.n === 0 ? 3 : 4;
    // How many exercises fit: a set with its rest is about a minute and a half.
    var count = clamp(Math.round(r.minutes * 60 / (sets * 120)), 3, 8);
    var plans;
    var names;
    if (r.days === 3) {
      plans = [['push', pull, 'legs', 'core', 'hinge', push2, 'core2', 'jump'], [pull, push2, 'hinge', 'core2', 'legs', 'push', 'skill', 'jump'], ['legs', 'push', pull, 'core', push3, 'hinge', pull2, 'skill']];
      names = ['Tutto il corpo A', 'Tutto il corpo B', 'Tutto il corpo C'];
    } else if (r.days === 4) {
      plans = [['push', 'legs', push2, 'hinge', 'core', push3, 'jump', 'skill'], [pull, 'core', pull2, 'core2', 'hinge', 'skill', 'legs', 'jump'], ['legs', 'push', 'hinge', push2, 'jump', 'core2', push3, 'skill'], [pull, 'core2', pull2, 'core', 'skill', 'hinge', 'legs', 'jump']];
      names = ['Spinta e gambe A', 'Tirata e core A', 'Spinta e gambe B', 'Tirata e core B'];
    } else {
      plans = [['push', push2, push3, 'core', 'skill', 'core2', 'jump', 'hinge'], [pull, pull2, 'core2', 'hinge', 'core', 'skill', 'legs', 'jump'], ['legs', 'hinge', 'jump', 'core', 'skill', 'core2', 'push', pull], ['push', pull, push2, pull2, 'core', 'skill', 'core2', 'hinge'], ['legs', 'hinge', 'core2', 'jump', 'skill', 'core', push3, pull2]];
      names = ['Spinta', 'Tirata', 'Gambe', 'Spinta e tirata', 'Gambe e core'];
    }
    var slots = plans[day % plans.length].slice(0, count);
    var rows = [];
    var seen = {};
    slots.forEach(function (slot) {
      var row = calisRow(slot, r, week, sets);
      if (seen[row.name]) return;
      seen[row.name] = true;
      rows.push(row);
    });
    var name = names[day % names.length];
    return { name: name, title: name, exercises: rows };
  }

  /* ------------------------------- HIIT ------------------------------ */

  var STATIONS = {
    bodyweight: {
      legs: ['Squat jump', 'Affondi saltati', 'Squat a corpo libero', 'Skater jump'],
      upper: ['Push-up', 'Pike push-up', 'Push-up diamante', 'Dip su sedia'],
      core: ['Mountain climber', 'Plank jack', 'Russian twist', 'Hollow rock'],
      cardio: ['Burpees', 'High knees', 'Jumping jack', 'Bear crawl']
    },
    bands: {
      legs: ['Squat con elastico', 'Good morning elastico', 'Squat jump', 'Affondi saltati'],
      upper: ['Rematore elastico', 'Chest press elastico', 'Pull-apart elastico', 'Face pull elastico'],
      core: ['Mountain climber', 'Plank jack', 'Russian twist', 'Hollow rock'],
      cardio: ['Burpees', 'High knees', 'Jumping jack', 'Skater jump']
    },
    kettlebell: {
      legs: ['Kettlebell swing', 'Squat goblet', 'Kettlebell lunge', 'Kettlebell deadlift'],
      upper: ['Kettlebell clean & press', 'Gorilla row', 'Kettlebell press', 'Push-up'],
      core: ['Russian twist', 'Mountain climber', 'Kettlebell halo', 'Plank jack'],
      cardio: ['Burpees', 'High knees', 'Jumping jack', 'Skater jump']
    }
  };
  // Tabata 1996: 20 seconds on, 10 off, eight times. The others are the
  // shapes people use when the work has to last longer than four minutes.
  var HIIT_FORMATS = [
    { id: 'tabata', label: 'Tabata', work: 20, rest: 10, items: 2, rounds: 4, roundRest: 0, note: '20 secondi al massimo, 10 di recupero: 4 minuti in tutto.' },
    { id: '30_30', label: 'HIIT 30/30', work: 30, rest: 30, items: 4, rounds: 2, roundRest: 60, note: 'Lavoro e recupero uguali: forte ma ripetibile.' },
    { id: '40_20', label: 'HIIT 40/20', work: 40, rest: 20, items: 4, rounds: 2, roundRest: 60, note: '40 secondi di lavoro, 20 per cambiare stazione.' }
  ];

  function hiitSession(r, week, day) {
    var p = progressOf(week, r.weeks);
    var deload = isDeload(week, r.weeks);
    var pool = STATIONS[r.kit] || STATIONS.bodyweight;
    var blocks = r.minutes <= 20 ? 2 : (r.minutes <= 30 ? 3 : 4);
    var extra = deload ? 0 : (p >= 0.5 ? 1 : 0) + (r.level.n === 2 ? 1 : 0);
    var rows = [cardioRow('Jumping jack', 3, 'Riscaldamento: ritmo facile, poi qualche squat e qualche piegamento.')];
    var cats = ['legs', 'cardio', 'upper', 'core'];
    var usedNames = { 'Jumping jack': true };
    for (var b = 0; b < blocks; b++) {
      // A beginner's Tabata is never the first block of the session: the
      // order starts one step later on the days it would be.
      var shift = (r.level.n === 0 && HIIT_FORMATS[day % HIIT_FORMATS.length].id === 'tabata') ? 1 : 0;
      var f = HIIT_FORMATS[(b + day + shift) % HIIT_FORMATS.length];
      var items = [];
      for (var i = 0; i < f.items; i++) {
        var cat = cats[(b + i + day) % cats.length];
        var list = pool[cat];
        var at = week + day * 2 + b * 3 + i;
        var name = list[at % list.length];
        for (var t = 1; t < list.length && usedNames[name]; t++) name = list[(at + t) % list.length];
        if (items.indexOf(name) !== -1) name = list[(at + 1) % list.length];
        usedNames[name] = true;
        items.push(name);
      }
      var rounds = f.rounds + (f.id === 'tabata' ? 0 : Math.min(extra, 2));
      rows.push(circuitRow(f.label, f.work, f.rest, rounds, f.roundRest, items, f.note));
    }
    // The session lasts what was asked for: rounds come off the longest
    // circuit until it fits (a Tabata stays whole, it is four minutes).
    var secondsOf = function (row) {
      if (!row.circuit) return 180;
      var c = row.circuit;
      return c.rounds * c.items.length * (c.work + c.rest) + (c.rounds - 1) * c.roundRest + 60;
    };
    var total = function () { return rows.reduce(function (n, row) { return n + secondsOf(row); }, 0); };
    for (var guard = 0; guard < 12 && total() > r.minutes * 60 * 1.1; guard++) {
      var longest = null;
      rows.forEach(function (row) { if (row.circuit && row.circuit.rounds > 1 && row.circuit.work !== 20 && (!longest || secondsOf(row) > secondsOf(longest))) longest = row; });
      if (!longest) break;
      longest.circuit.rounds -= 1;
      longest.repsTarget = longest.circuit.rounds + ' round';
      longest.sets = [{ reps: longest.repsTarget, target_load: null }];
    }
    var name = ['HIIT A', 'HIIT B', 'HIIT C', 'HIIT D'][day % 4];
    return { name: name, title: name, exercises: rows };
  }

  /* ------------------------------ program ---------------------------- */

  var WRITERS = { pilates: pilatesSession, mobilita: mobilitySession, calisthenics: calisthenicsSession, hiit: hiitSession };

  function resolve(input) {
    input = input || {};
    var d = discipline(input.discipline) || DISCIPLINES[0];
    var days = Math.round(Number(input.days)) || d.days[1] || d.days[0];
    return {
      discipline: d,
      days: clamp(days, d.days[0], d.days[d.days.length - 1]),
      weeks: clamp(Math.round(Number(input.weeks)) || 8, 2, 24),
      level: byId(LEVELS, input.level || 'intermedio', LEVELS[1]),
      minutes: clamp(Math.round(Number(input.minutes)) || 30, 10, 75),
      kit: byId(d.kits, input.kit, d.kits[0]).id
    };
  }
  function weekSessions(week, r) {
    var out = [];
    for (var day = 0; day < r.days; day++) out.push(WRITERS[r.discipline.id](r, week, day));
    return out;
  }
  function weekLabel(week, r) {
    if (isDeload(week, r.weeks)) return 'Settimana ' + week + ' · Scarico';
    var p = progressOf(week, r.weeks);
    return 'Settimana ' + week + ' · ' + (p < 0.5 ? 'Base' : 'Progressione');
  }
  function kitLabel(r) { return byId(r.discipline.kits, r.kit).label; }

  function plan(input) {
    var r = resolve(input);
    var weeks = [];
    for (var w = 1; w <= r.weeks; w++) {
      weeks.push({ week: w, weekNumber: w, week_number: w, label: weekLabel(w, r), sessions: weekSessions(w, r) });
    }
    return {
      id: 'dsc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      title: r.discipline.label + ' · ' + r.days + ' giorni · ' + r.weeks + ' settimane',
      weeks: weeks,
      duration_weeks: r.weeks,
      days_per_week: r.days,
      split: r.discipline.id,
      goals: [r.discipline.id],
      purpose: r.discipline.id,
      equipment: r.discipline.id === 'hiit' && r.kit === 'kettlebell' ? 'kettlebell' : (r.discipline.id === 'hiit' && r.kit === 'bands' ? 'minimal' : 'bodyweight'),
      experience: r.level.id,
      author: 'Generata da Nurvan',
      source: 'discipline_v1',
      discipline: { id: r.discipline.id, kit: r.kit, minutes: r.minutes },
      source_summary: r.discipline.label + ' · ' + r.level.label + ' · ' + r.days + ' giorni a settimana · ' + r.minutes + ' minuti' + (r.discipline.kits.length > 1 ? ' · ' + kitLabel(r) : ''),
      meta: { generatedAt: new Date().toISOString(), method: 'discipline_' + r.discipline.id, evidence: (EVIDENCE[r.discipline.id] || []).map(function (e) { return e.url; }) }
    };
  }
  // One week to start a hand-written program from.
  function sampleWeek(input) {
    var r = resolve(input);
    return weekSessions(Math.max(1, Math.ceil(r.weeks / 2)), r);
  }

  /* ----------------------------- evidence ---------------------------- */

  // What was measured, and what the program does about it. Filled from the
  // studies only: a discipline without a line here shows none.
  var EVIDENCE = {
    pilates: [
      { fact: 'Nel mal di schiena cronico il Pilates è risultato il tipo di esercizio più efficace per dolore e disabilità, su 118 studi con 9.710 persone. I programmi migliori erano di 1-2 sedute a settimana, sotto i 60 minuti.',
        plan: 'Bastano due sedute a settimana da 20 a 45 minuti. Con un dolore in corso, prima senti il medico.',
        source: 'Fernández-Rodríguez et al., J Orthop Sports Phys Ther 2022 · 118 studi', url: 'https://doi.org/10.2519/jospt.2022.10671' },
      { fact: 'Rispetto a non fare nulla, nel mal di schiena cronico il Pilates riduce il dolore di 15-19 punti su 100 e migliora la funzionalità di 10-12 punti.',
        plan: 'La sequenza parte dagli esercizi di controllo del centro e aggiunge i più difficili solo da metà programma.',
        source: 'Hayden et al., Journal of Physiotherapy 2021 · 217 studi', url: 'https://doi.org/10.1016/j.jphys.2021.09.004' },
      { fact: 'Negli adulti sani l’effetto sulla forma cardiorespiratoria compare solo da circa 1.440 minuti in tutto: due sedute a settimana per tre mesi, o tre per due mesi. Tappetino e macchine danno lo stesso risultato.',
        plan: 'I programmi vanno da 4 a 12 settimane: per un effetto misurabile servono quelli da 8 in su.',
        source: 'Pessôa et al., Complement Ther Clin Pract 2023 · 12 studi, prove di qualità bassa', url: 'https://doi.org/10.1016/j.ctcp.2023.101772' }
    ],
    mobilita: [
      { fact: 'Lo stretching statico aumenta la flessibilità in modo ampio (189 studi, 6.654 adulti). Il beneficio si ferma intorno a 10 minuti di allungamento a settimana e 4 minuti per seduta.',
        plan: 'Posizioni tenute da 30 a 75 secondi e ripetute: la dose utile si raggiunge senza sedute lunghe.',
        source: 'Ingram et al., Sports Medicine 2024 · 189 studi', url: 'https://doi.org/10.1007/s40279-024-02143-9' },
      { fact: 'Tenere la posizione funziona meglio dei molleggi. Quante volte a settimana e quanto forte si tira non cambiano il risultato.',
        plan: 'Tutte le posizioni sono tenute, senza rimbalzi, a un fastidio sopportabile.',
        source: 'Konrad et al., J Sport Health Sci 2023 · 77 studi', url: 'https://doi.org/10.1016/j.jshs.2023.06.002' },
      { fact: 'Lo stretching dopo l’allenamento non riduce i dolori muscolari dei giorni seguenti.',
        plan: 'Qui la mobilità serve a guadagnare ampiezza di movimento, non a recuperare prima.',
        source: 'Afonso et al., Frontiers in Physiology 2021 · 10 studi, prove deboli', url: 'https://doi.org/10.3389/fphys.2021.677581' }
    ],
    calisthenics: [
      { fact: 'Piegamenti con un carico pari a quello usato in panca hanno dato in 8 settimane la stessa crescita muscolare e la stessa forza della panca.',
        plan: 'La spinta si allena con piegamenti via via più difficili, invece che con più peso.',
        source: 'Kikuchi e Nakazato, J Exerc Sci Fit 2017 · 18 uomini, studio piccolo', url: 'https://doi.org/10.1016/j.jesf.2017.06.003' },
      { fact: 'Con carichi leggeri portati vicino al cedimento i muscoli crescono quanto con i carichi pesanti. La forza massima invece cresce di più con i pesi.',
        plan: 'Le serie si fermano a 2 ripetizioni dal cedimento; quando diventano facili si passa alla variante successiva.',
        source: 'Schoenfeld et al., J Strength Cond Res 2017 · 21 studi', url: 'https://doi.org/10.1519/JSC.0000000000002200' },
      { fact: 'Allenarsi solo a corpo libero non aumenta la mobilità articolare, a differenza dei pesi usati a escursione completa.',
        plan: 'Se ti serve mobilità, affianca una seduta di Mobilità e stretching.',
        source: 'Alizadeh et al., Sports Medicine 2023 · 55 studi', url: 'https://doi.org/10.1007/s40279-022-01804-x' }
    ],
    hiit: [
      { fact: 'L’HIIT aumenta il VO2max di 5,5 ml/kg/min rispetto a non allenarsi, e di circa 1,2 in più dell’allenamento continuo.',
        plan: 'Intervalli brevi a intensità alta, con recuperi che permettono di ripetere lo sforzo.',
        source: 'Milanović et al., Sports Medicine 2015 · 28 studi, 723 adulti', url: 'https://doi.org/10.1007/s40279-015-0365-0' },
      { fact: 'Fatto a casa, l’HIIT migliora la forma cardiorespiratoria quanto quello fatto in laboratorio.',
        plan: 'Bastano il pavimento e un timer: elastici e kettlebell sono facoltativi.',
        source: 'Tsuji et al., BMC Sports Sci Med Rehabil 2023 · 15 studi', url: 'https://doi.org/10.1186/s13102-023-00777-2' },
      { fact: 'Per perdere grasso l’HIIT rende quanto il lavoro continuo, con circa il 40% di tempo in meno.',
        plan: 'Sedute da 20 a 45 minuti, da 2 a 4 volte a settimana.',
        source: 'Wewege et al., Obesity Reviews 2017 · 13 studi', url: 'https://doi.org/10.1111/obr.12532' },
      { fact: 'Il Tabata originale, 20 secondi al massimo e 10 di recupero per 7-8 volte, fu misurato su una bici in 7 atleti: +7 ml/kg/min di VO2max in 6 settimane.',
        plan: 'I blocchi Tabata durano 4 minuti e chiedono lo sforzo massimo: non sono un riscaldamento.',
        source: 'Tabata et al., Med Sci Sports Exerc 1996 · 7 atleti', url: 'https://doi.org/10.1097/00005768-199610000-00018' }
    ]
  };

  /* ----------------------------- database ---------------------------- */

  function catalogId(p) { return ['dsc', p.discipline, p.days, p.level, p.weeks, p.minutes, p.kit].join('-'); }
  function parseCatalogId(id) {
    var s = String(id || '').split('-');
    if (s.length !== 7 || s[0] !== 'dsc') return null;
    var d = discipline(s[1]);
    if (!d) return null;
    var p = { discipline: d.id, days: Number(s[2]), level: s[3], weeks: Number(s[4]), minutes: Number(s[5]), kit: s[6] };
    if (d.days.indexOf(p.days) < 0 || !byId(LEVELS, p.level, null) || WEEKS.indexOf(p.weeks) < 0 || MINUTES.indexOf(p.minutes) < 0 || !byId(d.kits, p.kit, null)) return null;
    return p;
  }
  function catalogTitle(p) {
    var d = discipline(p.discipline);
    var bits = [d.short, p.days + ' gg', p.weeks + ' sett', p.minutes + ' min', byId(LEVELS, p.level).label];
    if (d.kits.length > 1) bits.push(byId(d.kits, p.kit).label);
    return bits.join(' · ');
  }
  function catalogRow(p) {
    var r = resolve(p);
    var sessions = weekSessions(1, r);
    var exercises = 0, sets = 0;
    sessions.forEach(function (s) { exercises += s.exercises.length; s.exercises.forEach(function (e) { sets += e.setCount; }); });
    return {
      id: catalogId(p), title: catalogTitle(p),
      days_per_week: p.days, duration_weeks: p.weeks, split: p.discipline, goals: [p.discipline], purpose: p.discipline,
      equipment: byId(discipline(p.discipline).kits, p.kit).label, discipline_kit: p.kit, minutes: p.minutes,
      sessions: p.days, exercises: exercises, sets: sets,
      source: 'discipline_v1', source_ext: '.discipline', experience: p.level,
      progression_model: 'discipline', audience: 'unisex'
    };
  }
  function catalogBody(id) {
    var p = typeof id === 'string' ? parseCatalogId(id) : id;
    if (!p) return null;
    var prog = plan(p);
    prog.id = catalogId(p);
    prog.title = catalogTitle(p);
    prog.audience = 'unisex';
    prog.notes = (EVIDENCE[p.discipline] || []).slice(0, 3).map(function (e) { return e.fact + ' (' + e.source + ')'; });
    return prog;
  }
  var KIT_OF = {
    hiit: { bodyweight: 'bodyweight', minimal: 'bands', casa: 'bands', kettlebell: 'kettlebell' },
    calisthenics: { bodyweight: 'floor', casa: 'bar', minimal: 'bar', palestra: 'bar_dips' }
  };
  function catalogValues(filters) {
    var f = filters || {};
    var d = discipline(f.goal);
    if (!d) return null;
    var strict = function (all, want) { return (want === undefined || want === null || want === '') ? all : (all.indexOf(want) >= 0 ? [want] : []); };
    var kits = d.kits.map(function (k) { return k.id; });
    var kit = f.equipment ? (kits.indexOf(f.equipment) >= 0 ? f.equipment : ((KIT_OF[d.id] || {})[f.equipment] || (d.kits.length === 1 ? kits[0] : f.equipment))) : '';
    return {
      discipline: d.id,
      days: strict(d.days, f.days === '' || f.days == null ? '' : Number(f.days)),
      level: strict(LEVELS.map(function (l) { return l.id; }), f.experience || ''),
      weeks: strict(WEEKS, f.duration === '' || f.duration == null ? '' : Number(f.duration)),
      minutes: strict(MINUTES, f.minutes === '' || f.minutes == null ? '' : Number(f.minutes)),
      kit: strict(kits, kit)
    };
  }
  function catalogTotal(filters) {
    var f = filters || {};
    if (!f.goal) return DISCIPLINES.reduce(function (n, d) { return n + catalogTotal({ goal: d.id }); }, 0);
    var v = catalogValues(f);
    if (!v) return 0;
    return v.days.length * v.level.length * v.weeks.length * v.minutes.length * v.kit.length;
  }
  function catalogSearch(filters, limit) {
    var v = catalogValues(filters);
    var rows = [];
    if (!v) return { rows: rows, total: 0 };
    var cap = limit || 150;
    var weeks = v.weeks.slice().sort(function (a, b) { return Math.abs(a - 8) - Math.abs(b - 8); });
    var minutes = v.minutes.slice().sort(function (a, b) { return Math.abs(a - 30) - Math.abs(b - 30); });
    outer:
    for (var l = 0; l < v.level.length; l++) {
      for (var n = 0; n < v.days.length; n++) {
        for (var w = 0; w < weeks.length; w++) {
          for (var m = 0; m < minutes.length; m++) {
            for (var k = 0; k < v.kit.length; k++) {
              rows.push(catalogRow({ discipline: v.discipline, days: v.days[n], level: v.level[l], weeks: weeks[w], minutes: minutes[m], kit: v.kit[k] }));
              if (rows.length >= cap) break outer;
            }
          }
        }
      }
    }
    return { rows: rows, total: catalogTotal(filters) };
  }

  /* ------------------------------ library ---------------------------- */

  // Every exercise the writers use that the app's library may not have yet:
  // name, English name (for the video search), muscle, equipment.
  function library() {
    var out = [];
    var seen = {};
    var add = function (name, en, muscle, eq) {
      if (seen[name]) return;
      seen[name] = true;
      out.push({ name: name, en: en || name, muscle: muscle || 'CORE', eq: eq || 'corpo libero' });
    };
    PILATES.forEach(function (e) { add(e.name, e.en, e.muscle, 'tappetino'); });
    MOBILITY.forEach(function (e) { add(e.name, e.en, e.muscle, 'corpo libero'); });
    var EN = {
      'Push-up inclinato': 'Incline Push-Up', 'Handstand push-up al muro': 'Wall Handstand Push-Up', 'Dip su sedia': 'Chair Dip',
      'Dead hang': 'Dead Hang', 'Trazioni negative': 'Negative Pull-Up', 'Reverse snow angel': 'Reverse Snow Angel',
      'Affondi a corpo libero': 'Bodyweight Reverse Lunge', 'Pistol squat assistito': 'Assisted Pistol Squat',
      'L-sit raccolto': 'Tuck L-Sit', 'Arch hold': 'Superman Arch Hold', 'Wall sit': 'Wall Sit',
      'Calf raise a corpo libero': 'Bodyweight Calf Raise', 'Step-up': 'Step-Up', 'Affondi saltati': 'Jumping Lunge',
      'Plank jack': 'Plank Jack', 'Bear crawl': 'Bear Crawl', 'Squat con elastico': 'Banded Squat',
      'Chest press elastico': 'Band Chest Press', 'Pull-apart elastico': 'Band Pull-Apart'
    };
    var EQ = { 'Dead hang': 'sbarra', 'Trazioni negative': 'sbarra', 'Squat con elastico': 'elastici', 'Chest press elastico': 'elastici', 'Pull-apart elastico': 'elastici' };
    Object.keys(LADDERS).forEach(function (slot) {
      LADDERS[slot].forEach(function (e) { if (EN[e.name]) add(e.name, EN[e.name], e.muscle, EQ[e.name]); });
    });
    var MUSCLE = { 'Plank jack': 'CARDIO', 'Bear crawl': 'CARDIO', 'Affondi saltati': 'CARDIO', 'Squat con elastico': 'QUADRICIPITI', 'Chest press elastico': 'PETTO', 'Pull-apart elastico': 'SPALLE' };
    Object.keys(MUSCLE).forEach(function (name) { add(name, EN[name], MUSCLE[name], EQ[name]); });
    return out;
  }
  // The cue of an exercise, for the screens that list them.
  function exercisesOf(id) {
    if (id === 'pilates') return PILATES.map(function (e) { return { name: e.name, cue: e.cue, level: e.lvl, amount: e.sec ? e.sec + 's' : String(e.reps) + (e.side ? ' per lato' : '') }; });
    if (id === 'mobilita') return MOBILITY.map(function (e) { return { name: e.name, cue: e.cue, level: 0, amount: e.sec ? e.sec + 's' : String(e.reps) }; });
    if (id === 'calisthenics') {
      var out = [];
      var seen = {};
      Object.keys(LADDERS).forEach(function (slot) {
        LADDERS[slot].forEach(function (e, i) { if (!seen[e.name]) { seen[e.name] = true; out.push({ name: e.name, cue: e.cue, level: Math.min(2, i), amount: e.sec ? e.sec + 's' : e.reps }); } });
      });
      return out;
    }
    return HIIT_FORMATS.map(function (f) { return { name: f.label, cue: f.note, level: 0, amount: f.work + '" / ' + f.rest + '"' }; });
  }

  root.NurvanDisciplines = {
    DISCIPLINES: DISCIPLINES,
    LEVELS: LEVELS,
    MINUTES: MINUTES,
    WEEKS: WEEKS,
    EVIDENCE: EVIDENCE,
    discipline: discipline,
    isDiscipline: function (id) { return !!discipline(id); },
    resolve: resolve,
    plan: plan,
    sampleWeek: sampleWeek,
    library: library,
    exercisesOf: exercisesOf,
    catalogId: catalogId,
    parseCatalogId: parseCatalogId,
    catalogRow: function (id) { var p = parseCatalogId(id); return p ? catalogRow(p) : null; },
    catalogBody: catalogBody,
    catalogSearch: catalogSearch,
    catalogTotal: catalogTotal
  };
})(typeof self !== 'undefined' ? self : this);
