/*
 * What each exercise in the library is, for program building.
 *
 * The catalogue knows an exercise's muscle and equipment; building a session
 * needs more: which movement it is (so a session gets a squat, a hinge, a
 * horizontal push...), whether it can carry the first, heaviest slot, and who
 * can be asked to do it. Guessing that from names is how a Smith-machine
 * exercise ends up illustrated with a barbell squat, so it is written down
 * here, one line per exercise, and tested against the catalogue.
 *
 * Columns: name (the catalogue's own, so its picture resolves), pattern, role,
 * equipment, level.
 *   pattern  squat hinge lunge glute quadIso hamIso calf adductor tibialis
 *            pushH pushV chestIso pullV pullH pullIso deltLat deltFront
 *            deltRear rotator traps biceps triceps forearm core carry power
 *            conditioning neck mobility
 *   role     main       multi-joint, can open a session and be loaded heavy
 *            secondary  multi-joint assistance work
 *            iso        single-joint or a hold
 *   equip    barbell dumbbell kettlebell machine cable smith bodyweight bar
 *            bench band plate sled rope tool
 *            (bar = pull-up/dip bar, bench = a bench or a back extension)
 *   level    0 anyone, 1 some practice needed, 2 advanced only
 *   also     (optional) other equipment it can be done with just as well
 */
(function (root) {
  'use strict';

  var T = [
    // --- squat ------------------------------------------------------------
    ['Squat bilanciere', 'squat', 'main', 'barbell', 0],
    ['High-bar squat', 'squat', 'main', 'barbell', 1],
    ['Low-bar squat', 'squat', 'main', 'barbell', 2],
    ['Squat frontale', 'squat', 'main', 'barbell', 2],
    ['Box squat', 'squat', 'main', 'barbell', 1],
    ['Pause squat', 'squat', 'main', 'barbell', 1],
    ['Tempo squat', 'squat', 'main', 'barbell', 1],
    ['Pin squat', 'squat', 'main', 'barbell', 2],
    ['Anderson squat', 'squat', 'main', 'barbell', 2],
    ['Safety bar squat', 'squat', 'main', 'barbell', 1],
    ['Zercher squat', 'squat', 'main', 'barbell', 2],
    ['Overhead squat', 'squat', 'main', 'barbell', 2],
    ['Squat Smith', 'squat', 'main', 'smith', 0],
    ['Hack squat', 'squat', 'main', 'machine', 0],
    ['Belt squat', 'squat', 'main', 'machine', 1],
    ['Leg press', 'squat', 'main', 'machine', 0],
    ['Squat goblet', 'squat', 'main', 'dumbbell', 0, ['kettlebell']],
    ['Squat a corpo libero', 'squat', 'main', 'bodyweight', 0],
    ['Sissy squat', 'quadIso', 'iso', 'bodyweight', 2],

    // --- hinge ------------------------------------------------------------
    ['Stacco da terra', 'hinge', 'main', 'barbell', 1],
    ['Stacco sumo', 'hinge', 'main', 'barbell', 1],
    ['Trap bar deadlift', 'hinge', 'main', 'barbell', 0],
    ['Deficit deadlift', 'hinge', 'main', 'barbell', 2],
    ['Block pull', 'hinge', 'main', 'barbell', 2],
    ['Stacco rumeno', 'hinge', 'main', 'barbell', 1],
    ['Stacco gambe tese', 'hinge', 'secondary', 'barbell', 1],
    ['Good morning', 'hinge', 'secondary', 'barbell', 2],
    ['Smith RDL', 'hinge', 'secondary', 'smith', 1],
    ['Single-leg RDL', 'hinge', 'secondary', 'dumbbell', 1],
    ['Stacco manubri', 'hinge', 'main', 'dumbbell', 0],
    ['Kettlebell deadlift', 'hinge', 'main', 'kettlebell', 0],
    ['Kettlebell swing', 'hinge', 'secondary', 'kettlebell', 1],
    ['Hip hinge', 'hinge', 'secondary', 'bodyweight', 0],
    ['Good morning elastico', 'hinge', 'secondary', 'band', 0],
    ['Hyperextension', 'hinge', 'iso', 'bench', 0],

    // --- single leg -------------------------------------------------------
    ['Affondi', 'lunge', 'secondary', 'dumbbell', 0],
    ['Affondi camminati', 'lunge', 'secondary', 'dumbbell', 1],
    ['Affondi indietro', 'lunge', 'secondary', 'bodyweight', 0],
    ['Affondo bulgaro', 'lunge', 'secondary', 'dumbbell', 1],
    ['Step-up', 'lunge', 'secondary', 'dumbbell', 0],
    ['Kettlebell lunge', 'lunge', 'secondary', 'kettlebell', 0],
    ['Leg press unilaterale', 'lunge', 'secondary', 'machine', 1],
    ['Cossack squat', 'lunge', 'secondary', 'bodyweight', 1],
    ['Pistol squat', 'lunge', 'secondary', 'bodyweight', 2],
    ['Pistol squat assistito', 'lunge', 'secondary', 'bodyweight', 1],

    // --- glutes -----------------------------------------------------------
    ['Hip thrust', 'glute', 'main', 'barbell', 0],
    ['Machine hip thrust', 'glute', 'main', 'machine', 0],
    ['Smith hip thrust', 'glute', 'main', 'smith', 1],
    ['Hip thrust KB', 'glute', 'secondary', 'kettlebell', 0],
    ['Glute bridge', 'glute', 'secondary', 'bodyweight', 0],
    ['Hip thrust unilaterale', 'glute', 'secondary', 'bodyweight', 1],
    ['Single-leg bridge', 'glute', 'secondary', 'bodyweight', 0],
    ['Frog pump', 'glute', 'iso', 'bodyweight', 0],
    ['Kickback cavo', 'glute', 'iso', 'cable', 0],
    ['Kickback elastico', 'glute', 'iso', 'band', 0],
    ['Pull-through', 'glute', 'secondary', 'cable', 0],
    ['Abductor machine', 'glute', 'iso', 'machine', 0],
    ['Adductor machine', 'adductor', 'iso', 'machine', 0],

    // --- legs, single joint ------------------------------------------------
    ['Leg extension', 'quadIso', 'iso', 'machine', 0],
    ['Leg Extension Unilaterale', 'quadIso', 'iso', 'machine', 0],
    ['Leg curl sdraiato', 'hamIso', 'iso', 'machine', 0],
    ['Leg curl seduto', 'hamIso', 'iso', 'machine', 0],
    ['Leg Curl Unilaterale', 'hamIso', 'iso', 'machine', 0],
    ['Glute ham raise', 'hamIso', 'secondary', 'machine', 2],
    ['Nordic curl', 'hamIso', 'secondary', 'bodyweight', 2],
    ['Nordic curl assistito', 'hamIso', 'secondary', 'bodyweight', 1],
    ['Calf raise in piedi', 'calf', 'iso', 'machine', 0],
    ['Calf raise seduto', 'calf', 'iso', 'machine', 0],
    ['Donkey calf raise', 'calf', 'iso', 'machine', 1],
    ['Calf Raise Unilaterale', 'calf', 'iso', 'bodyweight', 0],
    ['Tibialis raise', 'tibialis', 'iso', 'bodyweight', 0],

    // --- horizontal push ---------------------------------------------------
    ['Panca piana bilanciere', 'pushH', 'main', 'barbell', 0],
    ['Panca inclinata bilanciere', 'pushH', 'main', 'barbell', 0],
    ['Panca declinata', 'pushH', 'secondary', 'barbell', 1],
    ['Pause bench', 'pushH', 'main', 'barbell', 1],
    ['Spoto press', 'pushH', 'secondary', 'barbell', 2],
    ['Guillotine press', 'pushH', 'secondary', 'barbell', 2],
    ['Floor press', 'pushH', 'secondary', 'barbell', 1],
    ['Panca piana manubri', 'pushH', 'main', 'dumbbell', 0],
    ['Panca inclinata manubri', 'pushH', 'main', 'dumbbell', 0],
    ['Floor Press con Manubri', 'pushH', 'secondary', 'dumbbell', 0],
    ['Panca piana Smith', 'pushH', 'main', 'smith', 0],
    ['Chest press macchina', 'pushH', 'main', 'machine', 0],
    ['Chest Press Convergente', 'pushH', 'main', 'machine', 0],
    ['Dips parallele', 'pushH', 'main', 'bar', 1],
    ['Push-up', 'pushH', 'main', 'bodyweight', 0],
    ['Archer push-up', 'pushH', 'secondary', 'bodyweight', 2],
    ['Kettlebell floor press', 'pushH', 'secondary', 'kettlebell', 0],

    // --- chest, single joint ------------------------------------------------
    ['Croci panca piana', 'chestIso', 'iso', 'dumbbell', 0],
    ['Croci panca inclinata', 'chestIso', 'iso', 'dumbbell', 0],
    ['Croci ai cavi', 'chestIso', 'iso', 'cable', 0],
    ['Pec deck', 'chestIso', 'iso', 'machine', 0],
    ['Machine pec fly', 'chestIso', 'iso', 'machine', 0],
    ['Svend press', 'chestIso', 'iso', 'plate', 0],
    ['Pullover manubrio', 'chestIso', 'iso', 'dumbbell', 1],

    // --- vertical push ------------------------------------------------------
    ['Military press', 'pushV', 'main', 'barbell', 1],
    ['Push press', 'pushV', 'main', 'barbell', 2],
    ['Landmine press', 'pushV', 'secondary', 'barbell', 1],
    ['Shoulder press manubri', 'pushV', 'main', 'dumbbell', 0],
    ['Arnold press', 'pushV', 'secondary', 'dumbbell', 1],
    ['Machine shoulder press', 'pushV', 'main', 'machine', 0],
    ['Kettlebell press', 'pushV', 'main', 'kettlebell', 1],
    ['Pike push-up', 'pushV', 'secondary', 'bodyweight', 1],
    ['Handstand hold', 'pushV', 'iso', 'bodyweight', 2],

    // --- shoulders, single joint --------------------------------------------
    ['Alzate laterali', 'deltLat', 'iso', 'dumbbell', 0],
    ['Alzate laterali cavi', 'deltLat', 'iso', 'cable', 0],
    ['Alzate Laterali al Cavo Singolo', 'deltLat', 'iso', 'cable', 0],
    ['Alzate laterali KB', 'deltLat', 'iso', 'kettlebell', 0],
    ['Upright row', 'deltLat', 'secondary', 'barbell', 1],
    ['Alzate frontali', 'deltFront', 'iso', 'dumbbell', 0],
    ['Alzate posteriori', 'deltRear', 'iso', 'dumbbell', 0],
    ['Chest-supported rear delt', 'deltRear', 'iso', 'dumbbell', 0],
    ['Face pull', 'deltRear', 'iso', 'cable', 0],
    ['Face pull elastico', 'deltRear', 'iso', 'band', 0],
    ['Y-raise', 'deltRear', 'iso', 'dumbbell', 0],
    ['W-raise', 'deltRear', 'iso', 'dumbbell', 0],
    ['Y raise a terra', 'deltRear', 'iso', 'bodyweight', 0],
    ['External rotation', 'rotator', 'iso', 'dumbbell', 0],
    ['Cuban press', 'rotator', 'iso', 'dumbbell', 2],
    ['Shrug bilanciere', 'traps', 'iso', 'barbell', 0],
    ['Shrug manubri', 'traps', 'iso', 'dumbbell', 0],

    // --- vertical pull -------------------------------------------------------
    ['Trazioni presa prona', 'pullV', 'main', 'bar', 1],
    ['Trazioni presa supina', 'pullV', 'main', 'bar', 1],
    ['Trazioni presa neutra', 'pullV', 'main', 'bar', 1],
    ['Muscle-up', 'pullV', 'main', 'bar', 2],
    ['Scapular pull-up', 'pullV', 'iso', 'bar', 0],
    ['Lat machine avanti', 'pullV', 'main', 'machine', 0],
    ['Lat Machine Presa Larga', 'pullV', 'main', 'machine', 0],
    ['Lat machine inversa', 'pullV', 'main', 'machine', 0],
    ['Machine lat pulldown', 'pullV', 'main', 'machine', 0],
    ['Pulldown neutro', 'pullV', 'main', 'machine', 0],
    ['Pulldown elastico', 'pullV', 'secondary', 'band', 0],
    ['Straight-arm pulldown', 'pullIso', 'iso', 'cable', 0],
    ['Pullover ai Cavi', 'pullIso', 'iso', 'cable', 1],
    ['Kettlebell pullover', 'pullIso', 'iso', 'kettlebell', 1],

    // --- horizontal pull ------------------------------------------------------
    ['Rematore bilanciere', 'pullH', 'main', 'barbell', 1],
    ['Pendlay row', 'pullH', 'main', 'barbell', 2],
    ['Meadows row', 'pullH', 'secondary', 'barbell', 2],
    ['Rematore T-bar', 'pullH', 'main', 'barbell', 1],
    ['Rematore manubrio', 'pullH', 'main', 'dumbbell', 0],
    ['Rematore su Panca', 'pullH', 'secondary', 'bench', 0],
    ['Seal row', 'pullH', 'secondary', 'bench', 1],
    ['Rematore macchina', 'pullH', 'main', 'machine', 0],
    ['Machine row', 'pullH', 'main', 'machine', 0],
    ['Dorsey machine 1 braccio', 'pullH', 'secondary', 'machine', 0],
    ['Pulley basso', 'pullH', 'main', 'cable', 0],
    ['Inverted row', 'pullH', 'main', 'bar', 0],
    ['Kettlebell Row', 'pullH', 'main', 'kettlebell', 0],
    ['Gorilla row', 'pullH', 'secondary', 'kettlebell', 1],
    ['Towel row', 'pullH', 'secondary', 'bodyweight', 1],
    ['Rematore elastico', 'pullH', 'main', 'band', 0],

    // --- arms ------------------------------------------------------------------
    ['Curl bilanciere', 'biceps', 'iso', 'barbell', 0],
    ['Curl bilanciere EZ', 'biceps', 'iso', 'barbell', 0],
    ['Curl manubri', 'biceps', 'iso', 'dumbbell', 0],
    ['Curl martello', 'biceps', 'iso', 'dumbbell', 0],
    ['Curl concentrato', 'biceps', 'iso', 'dumbbell', 0],
    ['Cross-body hammer', 'biceps', 'iso', 'dumbbell', 0],
    ['Zottman curl', 'biceps', 'iso', 'dumbbell', 1],
    ['Curl cavi', 'biceps', 'iso', 'cable', 0],
    ['Curl al Cavo Singolo', 'biceps', 'iso', 'cable', 0],
    ['Bayesian curl', 'biceps', 'iso', 'cable', 1],
    ['Curl predicatore', 'biceps', 'iso', 'bench', 0],
    ['Spider curl', 'biceps', 'iso', 'bench', 1],
    ['Kettlebell curl', 'biceps', 'iso', 'kettlebell', 0],
    ['Close-grip bench', 'triceps', 'secondary', 'barbell', 1],
    ['JM press', 'triceps', 'secondary', 'barbell', 2],
    ['French press', 'triceps', 'iso', 'barbell', 1],
    ['French press manubri', 'triceps', 'iso', 'dumbbell', 0],
    ['Overhead extension', 'triceps', 'iso', 'dumbbell', 0],
    ['Estensione Overhead Unilaterale', 'triceps', 'iso', 'dumbbell', 0],
    ['Kickback tricipiti', 'triceps', 'iso', 'dumbbell', 0],
    ['Tate press', 'triceps', 'iso', 'dumbbell', 2],
    ['Pushdown cavo', 'triceps', 'iso', 'cable', 0],
    ['Pushdown ai Cavi con Corda', 'triceps', 'iso', 'cable', 0],
    ['Single-arm pushdown', 'triceps', 'iso', 'cable', 0],
    ['Overhead cable extension', 'triceps', 'iso', 'cable', 0],
    ['Kickback cavo tricipiti', 'triceps', 'iso', 'cable', 0],
    ['Push-up diamante', 'triceps', 'secondary', 'bodyweight', 1],
    ['Kettlebell tricep press', 'triceps', 'iso', 'kettlebell', 0],
    ['Curl polsi', 'forearm', 'iso', 'barbell', 0],
    ['Estensioni polsi', 'forearm', 'iso', 'barbell', 0],
    ['Wrist roller', 'forearm', 'iso', 'tool', 1],

    // --- core, carries, conditioning ---------------------------------------------
    ['Plank', 'core', 'iso', 'bodyweight', 0],
    ['Side plank', 'core', 'iso', 'bodyweight', 0],
    ['Hollow hold', 'core', 'iso', 'bodyweight', 1],
    ['Hollow rock', 'core', 'iso', 'bodyweight', 1],
    ['Dead bug', 'core', 'iso', 'bodyweight', 0],
    ['Bird dog', 'core', 'iso', 'bodyweight', 0],
    ['Crunch', 'core', 'iso', 'bodyweight', 0],
    ['Sit-up', 'core', 'iso', 'bodyweight', 0],
    ['Reverse crunch', 'core', 'iso', 'bodyweight', 0],
    ['Russian twist', 'core', 'iso', 'bodyweight', 0],
    ['Decline sit-up', 'core', 'iso', 'bench', 1],
    ['Leg raise', 'core', 'iso', 'bar', 1],
    ['Hanging knee raise', 'core', 'iso', 'bar', 1],
    ['Crunch cavo', 'core', 'iso', 'cable', 0],
    ['Woodchop', 'core', 'iso', 'cable', 0],
    ['Cable twist', 'core', 'iso', 'cable', 0],
    ['Pallof press', 'core', 'iso', 'cable', 0],
    ['Ab wheel', 'core', 'iso', 'tool', 2],
    ['Farmer walk', 'carry', 'iso', 'dumbbell', 0, ['kettlebell']],
    ['Suitcase Carry', 'carry', 'iso', 'dumbbell', 0, ['kettlebell']],
    ['Turkish get-up', 'carry', 'iso', 'kettlebell', 2],
    ['Kettlebell halo', 'mobility', 'iso', 'kettlebell', 0],
    ['Jefferson curl', 'mobility', 'iso', 'barbell', 2],
    ['Clean', 'power', 'main', 'barbell', 2],
    ['Snatch', 'power', 'main', 'barbell', 2],
    ['Thruster', 'power', 'main', 'barbell', 2],
    ['Kettlebell clean & press', 'power', 'secondary', 'kettlebell', 2],
    ['Jump squat', 'power', 'secondary', 'bodyweight', 1],
    ['Sled push', 'conditioning', 'secondary', 'sled', 1],
    ['Sled pull', 'conditioning', 'secondary', 'sled', 1],
    ['Battle rope', 'conditioning', 'secondary', 'rope', 1],
    ['Neck curl', 'neck', 'iso', 'machine', 1]
  ];

  // Names in the library that mean the same exercise as one above. They are
  // left out of the pools so a program cannot pick the same thing twice under
  // two names; the app already maps them to the entry that has the picture.
  var SAME_AS = {
    'Squat con Bilanciere': 'Squat bilanciere',
    'Front Squat con Bilanciere': 'Squat frontale',
    'Goblet Squat': 'Squat goblet',
    'Leg Press 45°': 'Leg press',
    'Pistol Squat Assistito': 'Pistol squat assistito',
    'Affondi Bulgari': 'Affondo bulgaro',
    'Affondi Camminati con Manubri': 'Affondi camminati',
    'Affondi Indietro': 'Affondi indietro',
    'Stacco da Terra con Bilanciere': 'Stacco da terra',
    'Stacco Rumeno con Bilanciere': 'Stacco rumeno',
    'RDL Monopodalico': 'Single-leg RDL',
    'Nordic Curl Assistito': 'Nordic curl assistito',
    'Hip Thrust con Bilanciere': 'Hip thrust',
    'Hip Thrust Unilaterale': 'Hip thrust unilaterale',
    'Hip thrust a terra': 'Glute bridge',
    'Kickback al Cavo': 'Kickback cavo',
    'Cable Pull-Through': 'Pull-through',
    'Panca Piana con Bilanciere': 'Panca piana bilanciere',
    'Panca Inclinata con Manubri': 'Panca inclinata manubri',
    'Panca Declinata con Bilanciere': 'Panca declinata',
    'Panca manubri': 'Panca piana manubri',
    'Dip alle Parallele': 'Dips parallele',
    'Lento Avanti con Manubri': 'Shoulder press manubri',
    'Military Press con Bilanciere': 'Military press',
    'Alzate Laterali con Manubri': 'Alzate laterali',
    'Alzate laterali manubri': 'Alzate laterali',
    'Face Pull al Cavo': 'Face pull',
    'Rear delt fly': 'Alzate posteriori',
    'Trazioni alla Sbarra': 'Trazioni presa prona',
    'Trazioni': 'Trazioni presa prona',
    'Chin-up': 'Trazioni presa supina',
    'Rematore con Bilanciere': 'Rematore bilanciere',
    'Rematore con Manubrio': 'Rematore manubrio',
    'Single arm KB row': 'Kettlebell Row',
    'Pulldown al Cavo Braccia Tese': 'Straight-arm pulldown',
    'Curl con Bilanciere': 'Curl bilanciere',
    'Curl Alternato con Manubri': 'Curl manubri',
    'Hammer Curl con Manubri': 'Curl martello',
    'French Press con Bilanciere EZ': 'French press',
    'Skull crusher': 'French press',
    'Ext tricipiti': 'Overhead extension',
    'Ext tricipiti overhead': 'Overhead extension',
    'Plank Addominale': 'Plank',
    'Crunch ai Cavi': 'Crunch cavo',
    'Calf raise': 'Calf raise in piedi',
    'Lat machine': 'Lat machine avanti',
    'Leg curl': 'Leg curl sdraiato',
    'Abductor': 'Abductor machine',
    'Squat': 'Squat bilanciere',
    'Stacco': 'Stacco da terra',
    'Panca piana': 'Panca piana bilanciere',
    'Panca inclinata': 'Panca inclinata bilanciere',
    'Dip': 'Dips parallele',
    'Lento avanti': 'Military press',
    'Military press manubri': 'Shoulder press manubri',
    'Spinte manubri spalle': 'Shoulder press manubri',
    'Diamond push-up': 'Push-up diamante',
    'Pistol assistito': 'Pistol squat assistito',
    'Kickback tricipiti ai cavi': 'Kickback cavo tricipiti',
    'Kettlebell squat': 'Squat goblet',
    'Floor press manubri': 'Floor Press con Manubri'
  };

  var EXERCISES = T.map(function (r) {
    return { name: r[0], pattern: r[1], role: r[2], equip: r[3], level: r[4], also: r[5] || [] };
  });

  // What is available where. A gym has everything; the others are what the
  // person actually said they have.
  var EQUIPMENT_SETS = {
    palestra: ['barbell', 'dumbbell', 'kettlebell', 'machine', 'cable', 'smith', 'bodyweight', 'bar', 'bench', 'band', 'plate', 'sled', 'rope', 'tool'],
    casa: ['dumbbell', 'kettlebell', 'bodyweight', 'bar', 'bench', 'band', 'tool'],
    minimal: ['dumbbell', 'bodyweight', 'band'],
    kettlebell: ['kettlebell', 'bodyweight'],
    bodyweight: ['bodyweight', 'bar']
  };

  var LEVEL_CAP = { principiante: 0, intermedio: 1, avanzato: 2 };

  function poolFor(equipment, experience, pattern, roles) {
    var allowed = EQUIPMENT_SETS[equipment] || EQUIPMENT_SETS.palestra;
    var cap = LEVEL_CAP[experience] != null ? LEVEL_CAP[experience] : 2;
    return EXERCISES.filter(function (e) {
      if (e.pattern !== pattern) return false;
      if (allowed.indexOf(e.equip) < 0 && !e.also.some(function (x) { return allowed.indexOf(x) >= 0; })) return false;
      if (e.level > cap) return false;
      if (roles && roles.indexOf(e.role) < 0) return false;
      return true;
    });
  }

  root.NURVAN_EXERCISE_TAXONOMY = {
    EXERCISES: EXERCISES,
    SAME_AS: SAME_AS,
    EQUIPMENT_SETS: EQUIPMENT_SETS,
    LEVEL_CAP: LEVEL_CAP,
    poolFor: poolFor
  };
})(typeof self !== 'undefined' ? self : this);
