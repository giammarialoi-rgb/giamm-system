/*
 * Salute e recupero: exercise for a physical problem, for the weeks before a
 * birth and for the months after one.
 *
 * What this is NOT: a diagnosis, a treatment or a replacement for the
 * physiotherapist, doctor or midwife who follows the person. Everything here
 * is general information drawn from guidelines and studies, each one cited
 * with its identifier (web/wellbeing-refs.js, built from PubMed by
 * tools/build_wellbeing_refs.mjs). Where a statement is expert opinion and not
 * a trial result, the text says so. Where the evidence is weak or says "this
 * does not work", the text says that too: a posture program that promised to
 * "correct" what the studies cannot show it corrects would be selling
 * something.
 *
 * Three areas share this file and web/wellbeing-care.js:
 *   posture     twelve common problems (winged scapula, rounded shoulders,
 *               hyperlordosis, kyphosis, neck, scoliosis, knee valgus and
 *               patellofemoral pain, chronic low back pain, shoulder pain,
 *               flat foot, knee osteoarthritis, lateral hip pain);
 *   postpartum  by type of birth and weeks since it (care file);
 *   labour      what the evidence says about positions and movement in
 *               labour, and the preparation of the last weeks (care file).
 *
 * Like the home disciplines (web/disciplines.js), a program is written when
 * asked for and has the shape of every other program of the app: weeks,
 * sessions, exercises.
 */
(function (root) {
  'use strict';

  var W = root.NurvanWellbeing = root.NurvanWellbeing || {};

  var DISCLAIMER_VERSION = '2026-10-03';

  // The notice every area opens with. It is shown whole and has to be
  // acknowledged before anything else, and its first lines travel with every
  // program written from this section.
  var DISCLAIMER = [
    "Queste informazioni sono generali e non sostituiscono il parere, la diagnosi o la cura di un medico, di un fisioterapista, di un'ostetrica o di un altro professionista sanitario. Nurvan non fa diagnosi.",
    "Gli esercizi che trovi qui sono quelli che gli studi e le linee guida citati considerano utili in generale: non sono una prescrizione per te. Falli solo se te li ha consigliati chi ti segue, oppure dopo averne parlato con lui o con lei.",
    "Se hai dolore che peggiora, formicolii, perdita di forza, capogiri, mancanza di fiato, sanguinamento o qualsiasi cosa ti preoccupa, fermati e chiama il tuo medico, la tua ostetrica o il tuo fisioterapista. In caso di emergenza chiama il 112.",
    "Dove una cosa è opinione di esperti e non risultato di studi, lo scriviamo. Dove gli studi dicono che un esercizio non cambia ciò che molti credono (per esempio la postura), lo scriviamo ugualmente.",
    "Usando questa sezione ti prendi la responsabilità di ascoltare il tuo corpo e di fermarti quando serve."
  ];
  // The short form that goes into a program's own summary.
  var DISCLAIMER_SHORT = "Programma informativo: non sostituisce il parere del tuo medico, fisioterapista od ostetrica. Fallo solo se te lo hanno consigliato; se i sintomi peggiorano, fermati e chiamali.";

  var AREAS = [
    { id: "posture", label: "Postura e dolori", note: "Esercizi per spalle, schiena, collo, ginocchio, piede e anca, con ciò che le fonti dicono davvero." },
    { id: "labour", label: "Travaglio e parto", note: "Posizioni e movimento in travaglio, e la preparazione delle ultime settimane." },
    { id: "postpartum", label: "Dopo il parto", note: "Il ritorno all'esercizio in base al tipo di parto e ai mesi passati." }
  ];

  var LEVELS = [
    { id: "principiante", label: "Base", n: 0 },
    { id: "intermedio", label: "Intermedio", n: 1 }
  ];

  function byId(list, id, fallback) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return fallback || null;
  }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  /* ------------------------------ the rows ------------------------------ */

  function repsRow(name, sets, reps, rest, note, muscle) {
    var list = [];
    for (var i = 0; i < sets; i++) list.push({ reps: String(reps), target_load: null });
    var row = { name: name, name_original: name, unit: "reps", sets: list, setCount: sets, repsTarget: String(reps), rirTarget: 3, rest: rest || "45s", role: "accessory" };
    if (muscle) row.muscle_groups = [muscle];
    if (note) { row.notes = note; row.cue = true; }
    return row;
  }
  function timeRow(name, sets, seconds, rest, note, muscle) {
    var list = [];
    for (var i = 0; i < sets; i++) list.push({ reps: seconds + "s", seconds: seconds, target_load: null });
    var row = { name: name, name_original: name, unit: "time", sets: list, setCount: sets, repsTarget: seconds + "s", rest: rest || "30s" };
    if (muscle) row.muscle_groups = [muscle];
    if (note) { row.notes = note; row.cue = true; }
    return row;
  }
  function cardioRow(name, minutes, note) {
    var row = { name: name, name_original: name, muscle_groups: ["CARDIO"], unit: "cardio", sets: [{ reps: minutes + " min", minutes: minutes, target_load: null }], setCount: 1, repsTarget: minutes + " min", rest: "0s" };
    if (note) { row.notes = note; row.cue = true; }
    return row;
  }
  W.rows = { reps: repsRow, time: timeRow, cardio: cardioRow };

  /* ---------------------------- the exercises ---------------------------- */

  // id -> what it is and how it is done. unit: reps | time. reps/sec: where it
  // starts; side: done on each side. Names are the ones people look up.
  var EX = {
    er_fianco: { name: "Extrarotazione sul fianco", en: "Side-Lying External Rotation", muscle: "SPALLE", reps: 12, side: true,
      cue: "Sdraiato su un fianco, gomito a 90° contro il busto con un asciugamano arrotolato sotto. Ruota l'avambraccio verso l'alto senza staccare il gomito e torna piano. Peso molto leggero." },
    flex_fianco: { name: "Flessione della spalla sul fianco", en: "Side-Lying Forward Flexion", muscle: "SPALLE", reps: 10, side: true,
      cue: "Sdraiato su un fianco, braccio teso con il pollice verso l'alto. Sollevalo davanti a te fino all'altezza della spalla, lento, senza alzare la spalla verso l'orecchio." },
    prone_t: { name: "Alzata a T da proni", en: "Prone T Raise", muscle: "SCHIENA", reps: 10,
      cue: "A pancia in giù, braccia aperte a T con i pollici in alto. Porta le scapole indietro e in basso e solleva le braccia di pochi centimetri. Niente slancio." },
    prone_ext: { name: "Estensione del braccio da proni", en: "Prone Arm Extension", muscle: "DORSALI", reps: 10, side: true,
      cue: "A pancia in giù, braccio lungo il fianco. Portalo indietro e in alto spingendo la scapola verso il basso." },
    pushup_plus: { name: "Piegamento con protrazione", en: "Push-Up Plus", muscle: "PETTO", reps: 8,
      cue: "In appoggio sui piedi o sulle ginocchia. Fai un piegamento; in alto spingi ancora il pavimento per allargare le scapole sulla schiena." },
    wall_slide: { name: "Scivolamento al muro", en: "Wall Slide", muscle: "SPALLE", reps: 10,
      cue: "Avambracci al muro, gomiti all'altezza delle spalle. Scivola verso l'alto allargando le scapole, senza inarcare la schiena." },
    punch: { name: "Spinta in avanti con elastico", en: "Band Serratus Punch", muscle: "SPALLE", reps: 12, side: true,
      cue: "In piedi con l'elastico dietro la schiena, spingi il pugno in avanti allungando il braccio e allargando la scapola. Torna piano." },
    low_row: { name: "Rematore con elastico a gomiti bassi", en: "Low Band Row", muscle: "DORSALI", reps: 12,
      cue: "Elastico fissato davanti a te. Tira i gomiti indietro lungo il corpo stringendo le scapole verso il basso, senza alzare le spalle." },
    row_db: { name: "Rematore a un braccio", en: "One-Arm Dumbbell Row", muscle: "DORSALI", reps: 10, side: true,
      cue: "Una mano e un ginocchio su una panca o una sedia, schiena lunga. Tira il manubrio verso l'anca senza ruotare il busto." },
    face_pull: { name: "Face pull con elastico", en: "Band Face Pull", muscle: "SPALLE", reps: 12,
      cue: "Elastico all'altezza del viso. Tira verso il viso con i gomiti alti e apri le mani verso l'esterno; torna piano." },
    reverse_fly: { name: "Alzate posteriori", en: "Reverse Fly", muscle: "SPALLE", reps: 12,
      cue: "Busto inclinato in avanti con la schiena lunga, manubri leggeri: apri le braccia ai lati, gomiti appena piegati, stringendo le scapole." },
    prone_ytw: { name: "Y-T-W da proni", en: "Prone Y-T-W", muscle: "SCHIENA", reps: 8,
      cue: "A pancia in giù disegna con le braccia una Y, una T e una W sollevandole di pochi centimetri. Ogni lettera con le scapole indietro e in basso." },
    er_band: { name: "Extrarotazione con elastico", en: "Band External Rotation", muscle: "SPALLE", reps: 12, side: true,
      cue: "In piedi, gomito a 90° vicino al fianco con un asciugamano arrotolato tra gomito e busto. Ruota l'avambraccio verso l'esterno e torna piano." },
    pull_apart: { name: "Apertura dell'elastico", en: "Band Pull-Apart", muscle: "SPALLE", reps: 12,
      cue: "Braccia tese davanti a te con un elastico tra le mani. Aprilo ai lati portando le scapole verso la colonna, poi torna piano." },
    pec_stretch: { name: "Stretching del pettorale alla porta", en: "Doorway Pec Stretch", muscle: "PETTO", sec: 30, side: true,
      cue: "Avambraccio sullo stipite, un passo avanti finché senti un allungamento morbido davanti alla spalla. Mai dolore. Respira." },
    thoracic_ext: { name: "Estensione toracica su foam roller", en: "Thoracic Extension on Foam Roller", muscle: "SCHIENA", reps: 8,
      cue: "Foam roller sotto la parte alta della schiena, mani dietro la testa. Estendi piano la schiena sopra il rullo respirando, senza inarcare la zona lombare." },
    glute_bridge: { name: "Ponte glutei", en: "Glute Bridge", muscle: "GLUTEI", reps: 12,
      cue: "Supino, piedi a terra. Spingi i talloni e solleva il bacino finché il corpo forma una linea, poi scendi piano. Non inarcare la zona lombare." },
    dead_bug: { name: "Dead bug", en: "Dead Bug", muscle: "ADDOME", reps: 8, side: true,
      cue: "Supino, ginocchia e braccia in alto. Allunga un braccio e la gamba opposta mantenendo la schiena appoggiata, poi torna. Respira, non trattenere il fiato." },
    plank: { name: "Plank frontale", en: "Front Plank", muscle: "ADDOME", sec: 20,
      cue: "Avambracci e punte (o ginocchia) a terra, corpo in linea. Stringi addome e glutei e respira. Fermati se la schiena cede." },
    bird_dog: { name: "Bird dog", en: "Bird Dog", muscle: "ADDOME", reps: 8, side: true,
      cue: "In quadrupedia allunga un braccio e la gamba opposta, bacino fermo e schiena lunga. Tieni due secondi e torna." },
    hip_flexor_stretch: { name: "Allungamento del flessore dell'anca", en: "Half-Kneeling Hip Flexor Stretch", muscle: "QUADRICIPITI", sec: 30, side: true,
      cue: "In ginocchio con un piede avanti. Contrai il gluteo della gamba dietro e porta il bacino in avanti finché senti l'allungamento davanti all'anca." },
    pelvic_tilt: { name: "Retroversione del bacino da supino", en: "Supine Posterior Pelvic Tilt", muscle: "ADDOME", reps: 10,
      cue: "Supino, ginocchia piegate. Appiattisci la zona lombare sul pavimento portando il bacino verso l'ombelico, tieni due secondi e rilascia." },
    rdl_db: { name: "Stacco rumeno con manubri", en: "Dumbbell Romanian Deadlift", muscle: "FEMORALI", reps: 10,
      cue: "In piedi con i manubri davanti alle cosce. Spingi il bacino indietro con la schiena lunga e le ginocchia appena piegate, scendi a metà stinco e risali spingendo i piedi." },
    back_ext: { name: "Estensione della schiena da proni", en: "Prone Back Extension", muscle: "SCHIENA", reps: 8,
      cue: "A pancia in giù, mani vicino alla testa. Solleva petto e braccia di pochi centimetri senza inarcare il collo, tieni un secondo e scendi." },
    row_band: { name: "Rematore con elastico", en: "Seated Band Row", muscle: "DORSALI", reps: 12,
      cue: "Seduto con le gambe tese e l'elastico intorno ai piedi. Tira le mani verso l'addome stringendo le scapole, schiena lunga, e torna piano." },
    wall_posture: { name: "Allineamento al muro", en: "Wall Posture Drill", muscle: "SCHIENA", sec: 30,
      cue: "Schiena, glutei e nuca al muro, mento leggermente indietro. Respira e mantieni senza forzare." },
    hip_hinge: { name: "Hip hinge con bastone", en: "Dowel Hip Hinge", muscle: "FEMORALI", reps: 10,
      cue: "Un bastone lungo la schiena che tocca nuca, schiena e bacino. Spingi il bacino indietro piegando poco le ginocchia, torna su senza perdere il contatto." },
    open_book: { name: "Apertura toracica in quadrupedia", en: "Quadruped Thoracic Rotation", muscle: "SCHIENA", reps: 8, side: true,
      cue: "In quadrupedia, una mano dietro la testa. Ruota il busto aprendo il gomito verso il soffitto, guarda il gomito, poi torna." },
    chin_tuck: { name: "Flessione cranio-cervicale", en: "Chin Tuck", muscle: "TRAPEZIO", reps: 10,
      cue: "Seduto o supino, porta il mento indietro come per fare il doppio mento, senza abbassare né alzare la testa. Tieni 5-10 secondi e rilascia." },
    shrug_db: { name: "Scrollate con manubri", en: "Dumbbell Shrug", muscle: "TRAPEZIO", reps: 12,
      cue: "In piedi con un manubrio per mano, braccia lungo i fianchi. Alza le spalle verso le orecchie, tieni un secondo e scendi piano." },
    lateral_raise: { name: "Alzate laterali", en: "Lateral Raise", muscle: "SPALLE", reps: 12,
      cue: "In piedi, manubri leggeri. Solleva le braccia ai lati fino all'altezza delle spalle, gomiti appena piegati, e scendi piano." },
    neck_iso: { name: "Estensione cervicale isometrica", en: "Isometric Neck Extension", muscle: "TRAPEZIO", sec: 10,
      cue: "Mani intrecciate dietro la testa. Spingi la testa indietro contro le mani senza muoverla, forza leggera e costante. Respira." },
    side_hip_abd: { name: "Abduzione dell'anca sul fianco", en: "Side-Lying Hip Abduction", muscle: "GLUTEI", reps: 12, side: true,
      cue: "Sdraiato su un fianco con le gambe tese. Solleva la gamba di sopra di poco, punta in avanti, senza ruotare il bacino, e scendi piano." },
    clamshell: { name: "Clamshell con elastico", en: "Clamshell", muscle: "GLUTEI", reps: 12, side: true,
      cue: "Sdraiato su un fianco, ginocchia piegate e elastico sopra le ginocchia. Apri il ginocchio di sopra mantenendo i piedi uniti, senza muovere il bacino." },
    lateral_band_walk: { name: "Camminata laterale con elastico", en: "Lateral Band Walk", muscle: "GLUTEI", reps: 10, side: true,
      cue: "In piedi con l'elastico sopra le ginocchia o alle caviglie, ginocchia appena piegate. Fai passi laterali piccoli, senza far cadere le ginocchia in dentro." },
    seated_knee_ext: { name: "Estensione del ginocchio con elastico da seduto", en: "Seated Band Knee Extension", muscle: "QUADRICIPITI", reps: 12, side: true,
      cue: "Seduto sulla sedia con l'elastico alla caviglia. Estendi il ginocchio senza bloccarlo del tutto e torna piano." },
    mini_squat: { name: "Mini squat al box", en: "Box Mini Squat", muscle: "QUADRICIPITI", reps: 10,
      cue: "Davanti a una sedia, piedi larghi come le anche. Siediti indietro fino a sfiorarla con ginocchia in linea con i piedi e risali spingendo a terra." },
    lateral_step_down: { name: "Step-down laterale", en: "Lateral Step-Down", muscle: "QUADRICIPITI", reps: 8, side: true,
      cue: "In piedi su un gradino basso, scendi con una gamba toccando il pavimento con il tallone dell'altra, ginocchio in linea con il secondo dito del piede, e risali." },
    split_squat: { name: "Affondo statico", en: "Split Squat", muscle: "QUADRICIPITI", reps: 8, side: true,
      cue: "Un piede avanti, uno indietro. Scendi dritto tenendo il ginocchio davanti in linea con il piede e risali. Un appoggio al muro se serve." },
    drop_landing: { name: "Atterraggio controllato", en: "Controlled Drop Landing", muscle: "GAMBE", reps: 6,
      cue: "Scendi da un gradino basso e atterra morbido su due piedi, ginocchia in linea con i piedi, anche indietro. Ferma l'atterraggio due secondi." },
    goblet_squat: { name: "Goblet squat", en: "Goblet Squat", muscle: "QUADRICIPITI", reps: 10,
      cue: "Un manubrio contro il petto, piedi larghi come le spalle. Scendi con la schiena lunga e le ginocchia in linea con i piedi, poi risali." },
    side_plank: { name: "Side plank", en: "Side Plank", muscle: "ADDOME", sec: 20, side: true,
      cue: "Su un fianco, avambraccio a terra sotto la spalla, ginocchia piegate o gambe tese. Solleva il bacino e tieni il corpo in linea." },
    scaption: { name: "Alzata sul piano scapolare", en: "Scaption", muscle: "SPALLE", reps: 12,
      cue: "Manubri leggeri, braccia davanti a te a 30° rispetto al corpo e pollici in alto. Solleva fino all'altezza della spalla e scendi piano." },
    prone_horiz_abd: { name: "Abduzione orizzontale da proni", en: "Prone Horizontal Abduction", muscle: "SCHIENA", reps: 10,
      cue: "A pancia in giù su una panca o a terra, braccia verso il pavimento. Solleva le braccia ai lati con i pollici in alto stringendo le scapole." },
    wall_pushup_plus: { name: "Push-up plus al muro", en: "Wall Push-Up Plus", muscle: "PETTO", reps: 12,
      cue: "Mani al muro all'altezza delle spalle. Fai un piegamento e, in avanti, spingi ancora allargando le scapole." },
    ir_band: { name: "Intrarotazione con elastico", en: "Band Internal Rotation", muscle: "SPALLE", reps: 12, side: true,
      cue: "Gomito a 90° vicino al fianco con un asciugamano arrotolato. Ruota l'avambraccio verso l'addome e torna piano." },
    short_foot: { name: "Esercizio del piede corto", en: "Short Foot Exercise", muscle: "POLPACCI", reps: 10, side: true,
      cue: "Seduto o in piedi, senza arricciare le dita porta l'avampiede verso il tallone sollevando l'arco. Tieni 5 secondi e rilascia." },
    calf_raise: { name: "Calf raise", en: "Calf Raise", muscle: "POLPACCI", reps: 12,
      cue: "In piedi, sali sulle punte spingendo sull'alluce, tieni un secondo e scendi piano." },
    towel_curl: { name: "Raccolta dell'asciugamano con le dita", en: "Towel Curl", muscle: "POLPACCI", reps: 10, side: true,
      cue: "Seduto, un asciugamano sotto il piede. Tira l'asciugamano verso di te arricciando le dita del piede." },
    toe_spread: { name: "Divaricazione delle dita del piede", en: "Toe Spread", muscle: "POLPACCI", reps: 10, side: true,
      cue: "Piede a terra: solleva l'alluce tenendo le altre dita giù, poi fai il contrario." },
    single_leg_balance: { name: "Equilibrio su una gamba", en: "Single-Leg Balance", muscle: "POLPACCI", sec: 30, side: true,
      cue: "In piedi su una gamba vicino a un appoggio, ginocchio morbido. Tieni il piede ben appoggiato." },
    foot_inversion: { name: "Inversione del piede con elastico", en: "Band Foot Inversion", muscle: "POLPACCI", reps: 12, side: true,
      cue: "Seduto con l'elastico intorno al piede. Porta la pianta del piede verso l'interno e torna piano." },
    sit_to_stand: { name: "Alzarsi dalla sedia", en: "Sit-to-Stand", muscle: "QUADRICIPITI", reps: 10,
      cue: "Siediti e alzati da una sedia stabile senza appoggiare le mani se riesci, spingendo con tutto il piede." },
    step_up: { name: "Step-up", en: "Step-Up", muscle: "QUADRICIPITI", reps: 10, side: true,
      cue: "Sali su un gradino basso spingendo con la gamba davanti, poi scendi piano. Ginocchio in linea con il piede." },
    iso_hip_abd: { name: "Abduzione isometrica dell'anca", en: "Isometric Hip Abduction", muscle: "GLUTEI", sec: 20, side: true,
      cue: "In piedi di lato a un muro o supino con un elastico: spingi la gamba verso l'esterno contro la resistenza senza muoverla, forza costante." },
    partial_squat: { name: "Squat parziale", en: "Partial Squat", muscle: "QUADRICIPITI", reps: 10,
      cue: "Piedi larghi come le anche, scendi solo a un terzo della discesa con peso sui talloni e ginocchia in linea, poi risali." },
    lateral_step_up: { name: "Step-up laterale", en: "Lateral Step-Up", muscle: "GLUTEI", reps: 8, side: true,
      cue: "Di lato a un gradino basso, sali di lato spingendo con la gamba sul gradino e scendi piano." },
    hip_hitch: { name: "Sollevamento del bacino su una gamba", en: "Single-Leg Pelvic Drop", muscle: "GLUTEI", reps: 10, side: true,
      cue: "In piedi su un gradino su una gamba. Lascia scendere piano il bacino dell'altro lato e risali stringendo il gluteo della gamba d'appoggio." },
    walking: { name: "Camminata", en: "Walking", muscle: "CARDIO", cardio: true,
      cue: "A passo svelto ma tale da riuscire a parlare." },
    cycling: { name: "Cyclette", en: "Stationary Cycling", muscle: "CARDIO", cardio: true,
      cue: "Resistenza leggera, sellino regolato, ritmo facile." }
  };
  W.EX = EX;

  // One exercise as a row of the program, at a point of the block (0..1).
  function rowFor(id, level, p, opts) {
    opts = opts || {};
    var e = EX[id];
    var sets = opts.sets != null ? opts.sets : (level.n === 0 ? 2 : 3) + (p >= 0.5 && level.n === 1 ? 1 : 0);
    if (opts.deload) sets = Math.max(1, sets - 1);
    if (e.cardio) return cardioRow(e.name, Math.round((opts.minutes || 20) * (opts.deload ? 0.7 : 1)), (opts.note || e.cue) + (opts.extra ? " " + opts.extra : ""));
    var note = (opts.note || e.cue) + (e.side ? " Per lato." : "") + (opts.extra ? " " + opts.extra : "");
    if (e.sec) {
      var seconds = opts.sec != null ? opts.sec : e.sec + (p >= 0.34 ? 5 : 0) + (p >= 0.67 ? 5 : 0);
      return timeRow(e.name, sets, seconds, opts.rest || "30s", note, e.muscle);
    }
    var reps = opts.reps != null ? opts.reps : e.reps + (p >= 0.34 ? 2 : 0) + (p >= 0.67 ? 1 : 0);
    return repsRow(e.name, sets, reps, opts.rest || "45s", note, e.muscle);
  }
  W._rowFor = rowFor;

  /* -------------------------------- posture ------------------------------- */

  // Each problem: what it is (honestly), what the sources say, what is NOT
  // shown, the signs that mean a doctor first, and the exercises of the
  // category with the best support, in the order they are introduced. The
  // numbers (PMID) point into web/wellbeing-refs.js.
  var POSTURE = [
    {
      id: "scapole", label: "Scapole alate e discinesia scapolare", short: "Scapola che si stacca dal torace quando alzi il braccio",
      what: "La scapola si stacca o si muove in modo anomalo dal torace quando sollevi il braccio. È molto comune anche in chi non ha dolore, quindi spesso è una variazione e non una malattia. La «scapola alata vera», dovuta alla lesione di un nervo, è invece un problema neurologico che deve vedere il medico.",
      sources: [
        { t: "Il consenso internazionale del 2013 (Scapular Summit) considera la discinesia una possibile alterazione della funzione: il suo ruolo nel causare il dolore non è chiaro, e i programmi che ripristinano il movimento della scapola possono servire dentro una riabilitazione completa della spalla.", r: ["23580420"] },
        { t: "Negli atleti senza dolore, chi ha discinesia ha un rischio di dolore alla spalla futuro più alto del 43% (rischio relativo 1,43). È un'associazione, non la prova di una causa.", r: ["28735288"] },
        { t: "Gli approcci centrati sulla scapola nel dolore di spalla danno un beneficio fino a 6 settimane che a 3 mesi non si vede più, e non è chiaro che gli esercizi cambino davvero il movimento della scapola.", r: ["27422595"] },
        { t: "In laboratorio, su persone sane, gli esercizi con il miglior rapporto tra trapezio inferiore e medio e trapezio superiore sono l'extrarotazione e la flessione da sdraiati su un fianco, l'abduzione orizzontale e l'estensione da proni.", r: ["17606671"] }
      ],
      notProven: ["Non è dimostrato che «correggere» una scapola alata in chi non ha dolore prevenga problemi, né che gli esercizi ne cambino la posizione in modo stabile."],
      red: ["È comparsa all'improvviso dopo un trauma, un intervento, uno sforzo o un'infezione", "Fai molta fatica a sollevare il braccio o vedi un muscolo che si assottiglia", "Hai dolore bruciante o formicolio lungo il braccio"],
      muscles: "Trapezio inferiore e medio, dentato anteriore.",
      dose: "2-3 serie da 10-15 ripetizioni, 3 volte a settimana, per 6-12 settimane. È l'uso comune: nessuno studio verificato fissa un dosaggio specifico.",
      exercises: ["er_fianco", "flex_fianco", "prone_t", "prone_ext", "pushup_plus", "wall_slide", "punch", "low_row"], warm: "thoracic_ext"
    },
    {
      id: "spalle", label: "Spalle in avanti", short: "Spalle davanti al tronco e ruotate in dentro",
      what: "Le spalle stanno davanti al tronco e ruotate in dentro, spesso con la testa in avanti e la parte alta della schiena arrotondata. È soprattutto una postura abituale: non esiste una postura «giusta» unica dimostrata e il legame con il dolore è debole.",
      sources: [
        { t: "Una meta-analisi del 2024 (22 studi, molti di qualità bassa) trova che rinforzo, stretching e programmi combinati migliorano gli angoli di spalle in avanti, testa in avanti e cifosi. Si misurano angoli, non il dolore.", r: ["38302926"] },
        { t: "Un editoriale della rivista JOSPT del 2019 ricorda che non ci sono prove solide che stare «seduti dritti» prevenga o curi il dolore.", r: ["31366294"] },
        { t: "Per il dolore al collo, il rinforzo di collo, scapole e torace riduce il dolore (prove moderate), mentre lo stretching da solo non dà benefici.", r: ["25629215"] }
      ],
      notProven: ["Non è dimostrato che correggere le spalle in avanti riduca il dolore o prevenga infortuni, né che l'effetto sugli angoli duri dopo la fine del programma."],
      red: ["Dolore a riposo di notte", "Formicolio o debolezza al braccio", "Dolore al petto o mancanza di fiato"],
      muscles: "Trapezio medio e inferiore, romboidi, cuffia dei rotatori posteriore; allungamento del pettorale come parte dei programmi studiati (da solo non riduce il dolore).",
      dose: "2-3 serie da 10-15 ripetizioni, 2-3 volte a settimana, per 6-10 settimane. È l'uso comune, non un dosaggio dimostrato.",
      exercises: ["row_db", "face_pull", "reverse_fly", "prone_ytw", "er_band", "pull_apart", "pec_stretch", "thoracic_ext"], warm: "thoracic_ext"
    },
    {
      id: "lordosi", label: "Iperlordosi lombare", short: "Curva accentuata della parte bassa della schiena",
      what: "La curva della parte bassa della schiena è accentuata, spesso con il bacino inclinato in avanti. Nelle persone sane è la norma, non l'eccezione: in uno studio su 120 giovani senza dolore, l'85% degli uomini e il 75% delle donne aveva il bacino inclinato in avanti.",
      sources: [
        { t: "Chi ha mal di schiena non ha una lordosi diversa né un'inclinazione del bacino diversa da chi non ne ha (meta-analisi di 43 studi).", r: ["25012528", "21658988"] },
        { t: "Semmai il mal di schiena si associa a una lordosi ridotta, non aumentata (meta-analisi di 13 studi radiologici).", r: ["28476690"] },
        { t: "Una revisione di revisioni conclude che non c'è consenso su un rapporto di causa tra posture della colonna e mal di schiena.", r: ["31451200"] },
        { t: "Gli esercizi hanno un effetto ampio sull'angolo della cifosi, ma nessun effetto chiaro sull'angolo della lordosi (10 studi randomizzati).", r: ["31034509"] }
      ],
      notProven: ["Non è dimostrato che esercizi «anti-lordosi» cambino la curva in modo duraturo, né che ridurla riduca il dolore. Il modello «flessori dell'anca corti più glutei e addominali deboli» non ha prove di causa nelle fonti verificate."],
      red: ["La curva si è accentuata molto in poco tempo", "Sei un adolescente sportivo e ti fa male estendere la schiena", "Hai dolore di notte o formicolii alle gambe"],
      muscles: "Glutei e tronco come allenamento generale: non come correzione della curva.",
      dose: "2-3 serie da 8-15 ripetizioni o 20-40 secondi di tenuta, 2-3 volte a settimana. Opinione esperta.",
      exercises: ["glute_bridge", "dead_bug", "plank", "bird_dog", "hip_flexor_stretch", "pelvic_tilt", "rdl_db"], warm: "pelvic_tilt",
      framing: "Questo programma allena forza e mobilità di tronco e anche. Non promette di correggere la curva."
    },
    {
      id: "cifosi", label: "Ipercifosi toracica", short: "Parte alta della schiena più curva del normale",
      what: "La parte alta della schiena è più curva del normale (negli studi sugli anziani si parla di ipercifosi sopra circa 40°). Nei giovani è spesso posturale; nelle persone anziane è comune, si associa a funzione peggiore e a fratture vertebrali, ed è un problema clinico reale.",
      sources: [
        { t: "Una revisione sistematica su adulti dai 45 anni con ipercifosi trova che 8 studi su 13 hanno visto un miglioramento di almeno una misura posturale con l'esercizio, ma i dati sono pochi e di qualità limitata.", r: ["23850611"] },
        { t: "Nello studio randomizzato SHEAF (99 adulti dai 60 anni con cifosi di 40° o più), un programma di rinforzo della colonna e allenamento posturale di 1 ora, 3 volte a settimana per 6 mesi ha ridotto l'angolo di 3,0° e migliorato l'immagine di sé, senza cambiare la funzione fisica.", r: ["28689306"] },
        { t: "Una meta-analisi di studi randomizzati trova un effetto ampio dell'esercizio sull'angolo di cifosi; il rinforzo sembra più importante dello stretching.", r: ["31034509"] }
      ],
      notProven: ["Non è dimostrato che ridurre la curva di pochi gradi cambi il dolore, la funzione o il rischio di fratture."],
      red: ["Dolore dorsale acuto e improvviso, soprattutto se hai l'osteoporosi (possibile frattura)", "Perdita di altezza rapida", "Schiena rigida in un adolescente (possibile malattia di Scheuermann)"],
      muscles: "Estensori della colonna toracica e muscoli scapolari posteriori.",
      dose: "Nello studio SHEAF: sedute di gruppo di 1 ora, 3 volte a settimana, per 6 mesi. Serie e ripetizioni dei singoli esercizi (1-3 serie da 8-15): opinione esperta. Con osteoporosi nota evita flessioni del busto con carico e torsioni brusche con peso.",
      exercises: ["back_ext", "prone_ytw", "row_band", "thoracic_ext", "wall_posture", "hip_hinge", "open_book"], warm: "thoracic_ext"
    },
    {
      id: "collo", label: "Collo: testa in avanti e dolore cervicale", short: "Testa davanti alle spalle, collo che fa male",
      what: "La testa sta davanti alla linea delle spalle, in grado diverso in quasi tutti. Il legame con il dolore al collo è controverso: negli adulti c'è, negli adolescenti no.",
      sources: [
        { t: "La linea guida americana sul dolore cervicale (JOSPT, 2017) raccomanda l'esercizio: rinforzo e resistenza di collo, scapole e torace, coordinazione e stretching combinati.", r: ["28666405"] },
        { t: "Per il dolore cervicale cronico, la revisione Cochrane trova prove moderate per il rinforzo di collo, scapole e torace; lo stretching da solo e il fitness generale probabilmente non cambiano dolore e funzione.", r: ["25629215"] },
        { t: "In donne con dolore al trapezio da lavoro al computer, 10 settimane di rinforzo specifico hanno ridotto il dolore peggiore di 35 mm su 100.", r: ["18163419"] },
        { t: "Gli adulti con dolore al collo hanno più testa in avanti, ma gli studi sono trasversali e non dimostrano la causa; negli adolescenti non c'è associazione.", r: ["31773477", "30107937"] }
      ],
      notProven: ["Non è dimostrato che il miglioramento del dolore dipenda dal «raddrizzare» la testa."],
      red: ["Dolore dopo una caduta o un incidente", "Debolezza o goffaggine di mani o gambe, o difficoltà a camminare", "Vertigini, doppia visione, difficoltà a parlare o a deglutire, svenimenti", "Febbre, perdita di peso inspiegata o una storia di tumore", "Mal di testa improvviso e violento"],
      muscles: "Flessori profondi del collo, trapezio, muscoli scapolari, estensori cervicali.",
      dose: "Il trial sul trapezio ha usato 10 settimane di rinforzo specifico; il resto (2-3 serie da 10-15 ripetizioni, 3 volte a settimana) è opinione esperta.",
      exercises: ["chin_tuck", "shrug_db", "row_db", "lateral_raise", "reverse_fly", "neck_iso", "face_pull"], warm: "chin_tuck"
    },
    {
      id: "scoliosi", label: "Scoliosi", short: "Curva laterale della colonna con rotazione delle vertebre", referral: true,
      what: "La scoliosi idiopatica è una curva laterale della colonna con rotazione delle vertebre, di almeno 10° alla radiografia. Non è lo stesso di un'asimmetria posturale: è una condizione da far diagnosticare e seguire da un medico.",
      sources: [
        { t: "Le linee guida SOSORT raccomandano gli esercizi specifici per la scoliosi (come il metodo Schroth) per ridurre la progressione durante la crescita e insieme al corsetto; i corsetti hanno le prove più forti.", r: ["29435499"] },
        { t: "La revisione Cochrane del 2024 (13 studi) giudica le prove da molto incerte a basse: gli esercizi specifici insieme al corsetto riducono la curva di circa 2° rispetto al solo corsetto.", r: ["38415871"] },
        { t: "In uno studio randomizzato su 50 adolescenti, 6 mesi di esercizi Schroth (a casa 30-45 minuti al giorno più una seduta supervisionata a settimana) hanno ridotto la curva di 3,5° rispetto al controllo.", r: ["28033399", "29164179"] },
        { t: "In un altro studio, gli esercizi Schroth fatti in clinica sotto supervisione hanno funzionato meglio di quelli fatti a casa: la supervisione conta.", r: ["25780260"] },
        { t: "Un'autocorrezione attiva con esercizi orientati al compito ha dato risultati superiori agli esercizi tradizionali in adolescenti con curve lievi.", r: ["24682356"] }
      ],
      notProven: ["Non è dimostrato che ginnastica posturale generica, stretching o sport asimmetrici correggano la scoliosi, né che un'app possa sostituire gli esercizi specifici insegnati da un fisioterapista formato.", "Per la scoliosi dell'adulto non abbiamo trovato una revisione di buona qualità sugli esercizi: non va trattata con programmi generici."],
      red: ["Sospetti una scoliosi (spalle o fianchi asimmetrici, gibbo quando ti pieghi in avanti) in un ragazzo in crescita: serve la visita, non gli esercizi da soli", "Dolore importante o notturno, curva che peggiora in fretta, sintomi neurologici", "Da adulto: dolore che scende nelle gambe o zoppia dopo aver camminato un po'"],
      muscles: "Le fonti non supportano il «rinforza il lato debole e allunga il lato corto»: gli esercizi specifici lavorano su autocorrezione in tre dimensioni e controllo posturale.",
      dose: "Nessuna: Nurvan non propone esercizi correttivi per la scoliosi. Se hai una diagnosi e il tuo professionista è d'accordo, qui trovi solo attività fisica generale, che le linee guida non vietano.",
      exercises: ["plank", "side_plank", "bird_dog"], warm: "thoracic_ext",
      framing: "Attività fisica generale: non è un programma correttivo e non sostituisce gli esercizi specifici insegnati dal tuo fisioterapista."
    },
    {
      id: "ginocchio", label: "Ginocchio che cade in dentro e dolore davanti al ginocchio", short: "Valgismo dinamico e dolore femoro-rotuleo",
      what: "Il ginocchio a «X» statico è normale nei bambini piccoli e si corregge con la crescita. Il «valgo dinamico» è il ginocchio che cade verso l'interno in squat, salti o corsa. Il dolore femoro-rotuleo è un dolore attorno o dietro la rotula che peggiora con scale, squat, corsa o stando seduti a lungo: è un problema reale e comune negli sportivi giovani.",
      sources: [
        { t: "La linea guida americana sul dolore femoro-rotuleo (JOSPT, 2019) indica l'esercizio terapeutico, con esercizi per anca e ginocchio insieme, come trattamento centrale.", r: ["31475628"] },
        { t: "Il consenso internazionale del 2018 raccomanda l'esercizio, soprattutto anca più ginocchio, e non raccomanda le mobilizzazioni da sole né le terapie fisiche strumentali.", r: ["29925502"] },
        { t: "La revisione Cochrane (31 studi) trova prove di qualità molto bassa ma coerenti: l'esercizio riduce il dolore e migliora la funzione, e anca più ginocchio può essere meglio del solo ginocchio.", r: ["25603546"] },
        { t: "Il rinforzo di abduttori e rotatori esterni dell'anca migliora dolore e funzione, in genere più del solo quadricipite.", r: ["35988215"] },
        { t: "Nel dolore femoro-rotuleo i cambiamenti nel controllo del movimento di anca e ginocchio si accompagnano ai cambiamenti di dolore e funzione.", r: ["37068162"] },
        { t: "I programmi di prevenzione neuromuscolare dimezzano il rischio di lesione del legamento crociato anteriore (OR 0,50); per i maschi i dati non bastano.", r: ["29737024"] }
      ],
      notProven: ["Non è dimostrato che gli esercizi cambino un ginocchio valgo strutturale dell'adulto."],
      red: ["Gonfiore importante dopo un trauma", "Il ginocchio si blocca o cede, o non riesci a caricare il peso", "Ginocchio caldo e rosso, o febbre", "Dolore notturno costante", "Per un bambino: ginocchia molto a X, asimmetriche, o che peggiorano dopo i 7-8 anni"],
      muscles: "Abduttori e rotatori esterni dell'anca, glutei, quadricipite.",
      dose: "I trial e le linee guida non fissano un dosaggio unico. Uso comune: 3 serie da 10-15 ripetizioni, 2-3 volte a settimana, per 6-12 settimane: opinione esperta.",
      exercises: ["side_hip_abd", "clamshell", "lateral_band_walk", "glute_bridge", "mini_squat", "lateral_step_down", "split_squat", "drop_landing"], warm: "clamshell"
    },
    {
      id: "schiena", label: "Mal di schiena cronico aspecifico", short: "Dolore lombare da più di 12 settimane senza una causa precisa",
      what: "È il mal di schiena che dura da più di 12 settimane senza una causa specifica identificabile (frattura, tumore, infezione, radicolopatia grave). È un problema reale e la prima causa di disabilità al mondo, ma raramente è legato a una «postura sbagliata».",
      sources: [
        { t: "La linea guida NICE (NG59) consiglia informazioni per l'autogestione e di considerare un programma di esercizio di gruppo (biomeccanico, aerobico, mente-corpo o una combinazione), scelto secondo bisogni, preferenze e capacità della persona.", r: ["nice-ng59"] },
        { t: "La linea guida dell'American College of Physicians (2017) raccomanda per prima cosa trattamenti senza farmaci: esercizio, riabilitazione multidisciplinare, mindfulness, tai chi, yoga, controllo motorio.", r: ["28192789"] },
        { t: "La linea guida dell'OMS (2023) indica tra gli interventi da offrire educazione e un programma di esercizio strutturato.", r: ["who-lbp-2023"] },
        { t: "La revisione Cochrane (249 studi) trova prove moderate che l'esercizio riduca il dolore di circa 15 punti su 100; l'effetto sulla funzione è piccolo.", r: ["34580864"] },
        { t: "In una meta-analisi di confronto tra tipi di esercizio, il Pilates è risultato migliore per il dolore e rinforzo e controllo motorio per la funzione; stretching e McKenzie non differivano dal controllo. Prove di qualità bassa.", r: ["31666220"] }
      ],
      notProven: ["Non è dimostrato che un tipo di esercizio sia chiaramente superiore agli altri, né che «correggere la postura» o «attivare il core» sia il meccanismo che fa funzionare l'esercizio."],
      red: ["Perdita del controllo di vescica o intestino, o intorpidimento nella zona dell'inguine e dei glutei: urgenza", "Debolezza alle gambe che peggiora", "Febbre o un'infezione recente", "Una storia di tumore o una perdita di peso senza spiegazione", "Un trauma importante, oppure osteoporosi con dolore improvviso", "Dolore costante di notte che non cambia con il movimento"],
      muscles: "Nessuna fonte verificata indica un singolo gruppo muscolare «chiave»: funzionano programmi globali di forza e attività aerobica.",
      dose: "Le linee guida non fissano numeri. Uso comune: 2-3 sedute a settimana per 8-12 settimane, forza 2-3 serie da 8-15 ripetizioni, aerobico 20-30 minuti (opinione esperta). Meglio gradualmente, senza evitare il movimento.",
      exercises: ["dead_bug", "bird_dog", "glute_bridge", "side_plank", "rdl_db", "goblet_squat", "row_band", "walking"], warm: "pelvic_tilt"
    },
    {
      id: "spalla", label: "Dolore di spalla", short: "Dolore alla spalla quando alzi il braccio (cuffia dei rotatori)",
      what: "È il dolore sul lato o davanti alla spalla quando alzi il braccio, legato ai tendini della cuffia dei rotatori e alle strutture sotto l'acromion (un tempo chiamato «conflitto»). È un problema reale e comune; l'idea che sia causato da una postura sbagliata o da uno «schiacciamento» è oggi ridimensionata.",
      sources: [
        { t: "La linea guida JOSPT del 2025 sulla tendinopatia della cuffia dei rotatori indica la riabilitazione con esercizio come cardine delle cure non chirurgiche.", r: ["40165544", "35881707"] },
        { t: "Una revisione di revisioni (16 studi) raccomanda con forza l'esercizio come trattamento di prima linea per dolore, mobilità e funzione; laser, onde d'urto e ultrasuoni non hanno mostrato effetto.", r: ["31726927"] },
        { t: "In 102 persone già candidate alla chirurgia, 12 settimane di esercizi specifici per cuffia e scapola hanno migliorato molto di più il gruppo di controllo, e solo il 20% ha poi scelto l'intervento contro il 63%.", r: ["22349588"] },
        { t: "La revisione Cochrane trova che terapia manuale più esercizio ha effetti probabilmente simili a infiltrazioni e chirurgia di decompressione (prove di qualità bassa).", r: ["27283590"] },
        { t: "Una meta-analisi del 2024 non ha trovato trial che confrontino frequenze o durate diverse: il dosaggio ottimale non è noto.", r: ["38848304"] },
        { t: "La linea guida olandese indica l'esercizio come trattamento di base del dolore subacromiale.", r: ["24847788"] }
      ],
      notProven: ["Non è dimostrato un dosaggio ottimale, né la superiorità di un tipo di esercizio, né che correggere la postura della scapola sia necessario."],
      red: ["Hai perso di colpo la capacità di alzare il braccio dopo un trauma", "La spalla è uscita dalla sede", "Spalla calda, rossa, o febbre", "Dolore alla spalla sinistra con dolore al petto o mancanza di fiato: chiama il 112", "Rigidità che aumenta in tutte le direzioni", "Formicolii al braccio"],
      muscles: "Cuffia dei rotatori, trapezio inferiore e medio, dentato anteriore.",
      dose: "Nel trial sui candidati alla chirurgia: 12 settimane, esercizi a casa 1-2 volte al giorno e alcune sedute guidate. Il resto (3 serie da 10-15; dolore durante l'esercizio fino a circa 3-5 su 10 se torna come prima entro 24 ore) è opinione esperta.",
      exercises: ["er_band", "er_fianco", "scaption", "row_band", "prone_horiz_abd", "wall_pushup_plus", "ir_band"], warm: "thoracic_ext"
    },
    {
      id: "piede", label: "Piede piatto", short: "Arco del piede che si abbassa sotto carico",
      what: "Nel piede piatto flessibile l'arco si abbassa sotto carico ma ricompare sulle punte o senza carico. Nei bambini è normale e quasi sempre si risolve con la crescita; negli adulti è molto spesso una variazione senza sintomi.",
      sources: [
        { t: "Per il piede piatto senza dolore in bambini sani, i plantari non danno vantaggi (revisione Cochrane, 16 studi): trattare un piede piatto che non fa male non ha supporto.", r: ["35080267"] },
        { t: "Un piede pronato è un fattore di rischio piccolo per la periostite tibiale e, con prove molto limitate, per il dolore femoro-rotuleo; non lo è per altri infortuni.", r: ["25558288"] },
        { t: "L'esercizio del «piede corto» riduce poco l'abbassamento dell'arco in una meta-analisi (6 studi), mentre un'altra non trova differenza complessiva, con un miglioramento solo in programmi più lunghi di 6 settimane. Campioni piccoli.", r: ["36231295", "38517769"] }
      ],
      notProven: ["Non è dimostrato che gli esercizi riducano dolore o infortuni in chi ha il piede piatto, né che il piede piatto senza sintomi vada trattato."],
      red: ["L'arco non ricompare neanche sulle punte (piede rigido)", "Dolore o gonfiore nella parte interna della caviglia", "Il piede piatto è comparso da adulto, da un solo lato, e peggiora", "Hai artrite o una malattia neurologica"],
      muscles: "Muscoli intrinseci del piede, polpaccio e tibiale posteriore (supporto limitato).",
      dose: "Per vedere cambiamenti dell'arco servono programmi di più di 6 settimane; il resto (3 serie da 10-15, 3-5 volte a settimana) è opinione esperta.",
      exercises: ["short_foot", "calf_raise", "towel_curl", "toe_spread", "single_leg_balance", "foot_inversion"], warm: "short_foot"
    },
    {
      id: "artrosi", label: "Artrosi del ginocchio", short: "Dolore da carico e rigidità al ginocchio",
      what: "L'artrosi del ginocchio è un'alterazione della cartilagine e dell'intera articolazione, con dolore da carico e rigidità. È un problema reale, ma le immagini della radiografia si correlano poco con il dolore.",
      sources: [
        { t: "Le linee guida OARSI (2019) mettono tra i trattamenti di base l'educazione e i programmi di esercizio strutturati a terra, con o senza gestione del peso.", r: ["31278997"] },
        { t: "La revisione Cochrane (54 studi) trova che l'esercizio riduca il dolore di circa 12 punti su 100 e migliori la funzione di circa 10, con effetto mantenuto per 2-6 mesi.", r: ["25569281"] }
      ],
      notProven: ["Non è dimostrato che un tipo specifico di esercizio sia superiore agli altri."],
      red: ["Ginocchio caldo, rosso e molto gonfio, o febbre", "Il ginocchio si blocca", "Dolore a riposo o di notte che aumenta", "Non riesci a caricare il peso"],
      muscles: "Quadricipite e muscoli dell'anca.",
      dose: "Almeno 8-12 settimane, poi continuare; 2-3 serie da 8-15 ripetizioni, 2-3 volte a settimana: opinione esperta.",
      exercises: ["sit_to_stand", "seated_knee_ext", "step_up", "mini_squat", "side_hip_abd", "glute_bridge", "cycling", "walking"], warm: "seated_knee_ext"
    },
    {
      id: "anca", label: "Dolore laterale dell'anca (tendinopatia glutea)", short: "Dolore sul lato dell'anca, peggiore sdraiati su quel lato",
      what: "È un dolore sul lato dell'anca (il trocantere), peggiore sdraiandosi su quel lato, salendo le scale o stando su una gamba. È un problema dei tendini dei glutei, spesso chiamato «borsite» o attribuito a un problema posturale.",
      sources: [
        { t: "In uno studio randomizzato su 204 persone, educazione sulla gestione del carico più esercizio (14 sedute in 8 settimane) è stata migliore dell'infiltrazione di cortisone e dell'attesa a 8 settimane, e migliore come miglioramento globale a 52 settimane.", r: ["29720374"] },
        { t: "Un lavoro clinico del 2015 consiglia di evitare la compressione del tendine (gambe accavallate, stare «seduti su un fianco», stretching della bandelletta ileotibiale), sulla base di evidenza limitata e dell'esperienza.", r: ["26381486"] }
      ],
      notProven: ["Non è noto il dosaggio ottimale: il trial ha usato 14 sedute supervisionate in 8 settimane più esercizi a casa."],
      red: ["Dolore all'inguine (possibile problema dell'articolazione dell'anca)", "Dolore notturno costante o febbre", "Una caduta in una persona anziana (possibile frattura)", "Formicolii o debolezza alla gamba"],
      muscles: "Medio e piccolo gluteo con carico progressivo.",
      dose: "Il trial: 8 settimane con sedute supervisionate più esercizi a casa. Serie e ripetizioni: opinione esperta. Si comincia con le tenute isometriche e si passa agli esercizi dinamici quando il dolore lo permette.",
      exercises: ["iso_hip_abd", "glute_bridge", "partial_squat", "lateral_step_up", "hip_hitch", "side_hip_abd"], warm: "glute_bridge"
    }
  ];
  W.POSTURE = POSTURE;

  function topic(id) { return byId(POSTURE, id, null); }

  // The program for a posture problem: weeks of two or three short sessions,
  // from the exercises of the category with the best support, introduced in
  // the order of the list. Core work at least twice a week, like every
  // ready-made program of the app; the last of a long block is lighter.
  var PAIN_RULE = "Il dolore durante l'esercizio deve restare lieve (al massimo 3 su 10) e tornare come prima entro 24 ore. Se no, riduci o fermati.";
  var CORE_IDS = { dead_bug: 1, plank: 1, bird_dog: 1, side_plank: 1 };

  function resolvePosture(input) {
    input = input || {};
    var t = topic(input.topic) || POSTURE[0];
    var days = clamp(Math.round(Number(input.days)) || 3, 2, 3);
    var weeks = clamp(Math.round(Number(input.weeks)) || 8, 4, 12);
    var minutes = [20, 30, 45].indexOf(Number(input.minutes)) >= 0 ? Number(input.minutes) : 30;
    var level = byId(LEVELS, input.level, LEVELS[0]);
    return { topic: t, days: days, weeks: weeks, minutes: minutes, level: level };
  }

  function postureSession(r, week, day) {
    var t = r.topic;
    var p = r.weeks <= 1 ? 0 : (week - 1) / (r.weeks - 1);
    var deload = r.weeks >= 8 && week === r.weeks;
    var count = r.minutes === 20 ? 4 : (r.minutes === 30 ? 5 : 6);
    var pool = t.exercises.slice(0, r.level.n === 0 ? Math.min(t.exercises.length, 5) : t.exercises.length);
    var anchors = pool.slice(0, Math.min(3, pool.length));
    var rest = pool.slice(anchors.length);
    var picked = anchors.slice();
    for (var i = 0; picked.length < Math.min(count, pool.length) && rest.length; i++) {
      var choice = rest[(day * 2 + i) % rest.length];
      if (picked.indexOf(choice) < 0) picked.push(choice);
      else if (i > rest.length * 2) break;
    }
    var exercises = [];
    var warm = t.warm && EX[t.warm] ? t.warm : null;
    if (warm) exercises.push(rowFor(warm, r.level, 0, { deload: false, extra: "Per scaldarti." }));
    picked.forEach(function (id) {
      if (id === warm) return;
      exercises.push(rowFor(id, r.level, p, { deload: deload, minutes: 15 }));
    });
    if (exercises.length) exercises[0].notes = (exercises[0].notes ? exercises[0].notes + " " : "") + PAIN_RULE;
    return { name: "Giorno " + (day + 1), title: t.label + " · giorno " + (day + 1), exercises: exercises };
  }

  function ensureCore(sessions) {
    var count = sessions.filter(function (s) { return s.exercises.some(function (e) { return CORE_IDS[idOf(e.name)]; }); }).length;
    for (var turn = 0; count < Math.min(2, sessions.length); turn++) {
      var lacking = sessions.filter(function (s) { return !s.exercises.some(function (e) { return CORE_IDS[idOf(e.name)]; }); });
      if (!lacking.length) break;
      var s = turn ? lacking[lacking.length - 1] : lacking[0];
      s.exercises.push(turn ? timeRow(EX.plank.name, 2, EX.plank.sec, "30s", EX.plank.cue, "ADDOME") : repsRow(EX.dead_bug.name, 2, EX.dead_bug.reps, "30s", EX.dead_bug.cue + " Per lato.", "ADDOME"));
      count += 1;
    }
    return sessions;
  }
  var NAME_TO_ID = null;
  function idOf(name) {
    if (!NAME_TO_ID) { NAME_TO_ID = {}; Object.keys(EX).forEach(function (k) { NAME_TO_ID[EX[k].name] = k; }); }
    return NAME_TO_ID[name] || "";
  }
  W._ensureCore = ensureCore;
  W._idOf = idOf;

  function weekLabel(w, r) {
    if (r.weeks >= 8 && w === r.weeks) return "Settimana " + w + " · Scarico";
    var p = r.weeks <= 1 ? 0 : (w - 1) / (r.weeks - 1);
    return "Settimana " + w + " · " + (p < 0.34 ? "Base" : (p < 0.67 ? "Progressione" : "Consolidamento"));
  }

  function planPosture(input) {
    var r = resolvePosture(input);
    var weeks = [];
    for (var w = 1; w <= r.weeks; w++) {
      var sessions = [];
      for (var d = 0; d < r.days; d++) sessions.push(postureSession(r, w, d));
      weeks.push({ week: w, weekNumber: w, week_number: w, label: weekLabel(w, r), sessions: ensureCore(sessions) });
    }
    return {
      id: "wbg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      title: r.topic.label + " · " + r.days + " giorni · " + r.weeks + " settimane",
      weeks: weeks, duration_weeks: r.weeks, days_per_week: r.days,
      split: "wellbeing_posture", goals: ["wellbeing"], purpose: "wellbeing", equipment: "minimal", experience: r.level.id,
      author: "Generata da Nurvan", source: "wellbeing_v1",
      wellbeing: { area: "posture", topic: r.topic.id, disclaimer: DISCLAIMER_VERSION },
      source_summary: r.topic.label + " · " + r.level.label + " · " + r.days + " giorni a settimana · " + r.minutes + " minuti. " + DISCLAIMER_SHORT + (r.topic.framing ? " " + r.topic.framing : ""),
      meta: { generatedAt: new Date().toISOString(), method: "wellbeing_posture_" + r.topic.id, evidence: r.topic.sources.reduce(function (a, s) { return a.concat(s.r); }, []) }
    };
  }

  // Before a posture program: a "yes" to any of the signs means a doctor first.
  function screenPosture(topicId, answers) {
    var t = topic(topicId);
    if (!t) return { ok: false, reasons: [] };
    var flagged = [];
    (answers || []).forEach(function (yes, i) { if (yes && t.red[i]) flagged.push(t.red[i]); });
    return { ok: flagged.length === 0, reasons: flagged };
  }

  W.DISCLAIMER = DISCLAIMER;
  W.DISCLAIMER_SHORT = DISCLAIMER_SHORT;
  W.DISCLAIMER_VERSION = DISCLAIMER_VERSION;
  W.AREAS = AREAS;
  W.LEVELS = LEVELS;
  W.PAIN_RULE = PAIN_RULE;
  W.topic = topic;
  W.screenPosture = screenPosture;
  W._plan = W._plan || {};
  W._plan.posture = planPosture;
  W._helpers = { clamp: clamp, byId: byId, repsRow: repsRow, timeRow: timeRow, cardioRow: cardioRow };
})(typeof self !== 'undefined' ? self : this);
