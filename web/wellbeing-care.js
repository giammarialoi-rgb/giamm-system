/*
 * Salute e recupero, second part: the months after a birth and the weeks
 * before it. It extends NurvanWellbeing (web/wellbeing.js), which holds the
 * notice, the exercises and the way a program is written.
 *
 * Two rules run through everything here. The type of birth decides WHEN a
 * stage can be unlocked; the symptoms decide WHETHER the person moves on - every
 * source asks for progression guided by symptoms. And what the studies do not
 * show is not said: no fixed week to "be healed", no promise that training
 * shortens labour, no claim that crunches ruin a diastasis. Where the app is
 * being cautious on its own (an emergency caesarean takes the slower path),
 * the text says it is caution, not evidence.
 *
 * The references are PubMed identifiers or the keys of guidelines
 * (web/wellbeing-refs.js).
 */
(function (root) {
  'use strict';

  var W = root.NurvanWellbeing;
  if (!W) throw new Error('wellbeing.js has to be loaded first');
  var H = W._helpers;
  var EX = W.EX;
  var rowFor = W._rowFor;

  // The exercises of these two areas.
  var MORE = {
    breath: { name: "Respirazione diaframmatica", en: "Diaphragmatic Breathing", muscle: "ADDOME", sec: 45,
      cue: "Seduta o sdraiata, una mano sul petto e una sul fianco. Inspira dal naso allargando le costole, espira lenta dalla bocca. Quando inspiri il pavimento pelvico si rilascia." },
    pf_slow: { name: "Contrazione del pavimento pelvico", en: "Pelvic Floor Contraction", muscle: "ADDOME", reps: 8,
      cue: "Immagina di trattenere gas e urina: contrai e solleva dolcemente, senza trattenere il fiato e senza stringere glutei e cosce, poi rilascia del tutto. Il rilascio conta quanto la contrazione." },
    pf_quick: { name: "Contrazioni rapide del pavimento pelvico", en: "Quick Pelvic Floor Contractions", muscle: "ADDOME", reps: 8,
      cue: "Contrai e rilascia il pavimento pelvico in modo rapido e completo, una dopo l'altra, senza trattenere il fiato." },
    knee_fall: { name: "Apertura del ginocchio da supino", en: "Supine Knee Fall-Out", muscle: "ADDOME", reps: 8, side: true,
      cue: "Supina con le ginocchia piegate. Lascia aprire un ginocchio verso l'esterno senza muovere il bacino e riportalo su, piano. Se tira la ferita, salta l'esercizio." },
    plank_knees: { name: "Plank sulle ginocchia", en: "Kneeling Plank", muscle: "ADDOME", sec: 15,
      cue: "Avambracci e ginocchia a terra, corpo in linea dalle ginocchia alla testa. Respira e fermati se senti pesantezza o trascinamento nel pavimento pelvico." },
    curl_up: { name: "Curl-up", en: "Curl-Up", muscle: "ADDOME", reps: 8,
      cue: "Supina con le ginocchia piegate. Solleva testa e spalle espirando e torna giù piano. Se compare un rigonfiamento al centro dell'addome o pesantezza pelvica, riduci." },
    incline_pushup: { name: "Push-up inclinato", en: "Incline Push-Up", muscle: "PETTO", reps: 8,
      cue: "Mani su un piano rialzato (tavolo o panca), corpo in linea. Scendi con i gomiti a 45° e risali espirando." },
    lunge_static: { name: "Affondo statico con appoggio", en: "Supported Split Squat", muscle: "QUADRICIPITI", reps: 8, side: true,
      cue: "Un piede avanti e uno indietro, con una mano a un appoggio. Scendi dritta e risali espirando." },
    scar: { name: "Mobilizzazione della cicatrice", en: "Scar Mobilisation", muscle: "ADDOME", sec: 60,
      cue: "Solo a ferita ben chiusa e quando il medico o l'ostetrica ti hanno detto che è guarita. Con le dita pulite, massaggia piano la cicatrice con piccoli cerchi, senza dolore." },
    jog_light: { name: "Saltelli sul posto", en: "Light Hops in Place", muscle: "GAMBE", reps: 10, side: true,
      cue: "Piccoli saltelli su una gamba, atterrando morbida. Fermati se senti pesantezza, trascinamento o perdite." },
    walk_run: { name: "Cammina-corri", en: "Walk-Run", muscle: "CARDIO", cardio: true,
      cue: "Alterna corsa leggera e camminata secondo la tabella della settimana. Prima aumenta il volume, poi l'intensità. Fermati se compaiono perdite, pesantezza o dolore." },
    ball_sway: { name: "Dondolio del bacino sulla palla", en: "Birth Ball Hip Sway", muscle: "GLUTEI", sec: 120,
      cue: "Seduta sulla palla con i piedi ben appoggiati e un appoggio vicino. Dondola e disegna cerchi con il bacino, a un ritmo comodo. È una forma di movimento libero, non un esercizio con un effetto dimostrato." },
    lean_forward: { name: "Appoggio in avanti", en: "Leaning Forward on a Support", muscle: "SCHIENA", sec: 60,
      cue: "In piedi, appoggiata con le braccia a un tavolo, al letto o al divano, gambe larghe e ginocchia morbide. Dondola piano il bacino e respira lenta." },
    all_fours_rock: { name: "Carponi con dondolio", en: "All-Fours Rocking", muscle: "SCHIENA", sec: 60,
      cue: "In quadrupedia, con un cuscino sotto le ginocchia. Dondola avanti e indietro e disegna cerchi con il bacino, respirando lenta." },
    side_lying_rest: { name: "Sul fianco con un cuscino tra le ginocchia", en: "Side-Lying Rest", muscle: "GLUTEI", sec: 120,
      cue: "Sdraiata su un fianco con un cuscino tra le ginocchia. Rilassa spalle, mandibola e pavimento pelvico e respira lenta." },
    supported_squat: { name: "Accosciata sostenuta", en: "Supported Squat", muscle: "QUADRICIPITI", sec: 20,
      cue: "In piedi con le mani a un appoggio solido, scendi in accosciata solo se è comodo e resta pochi secondi. Se dà fastidio, salta: nessuno studio dice che serva come preparazione." },
    breath_slow: { name: "Respiro lento e rilassamento", en: "Slow Breathing and Relaxation", muscle: "ADDOME", sec: 180,
      cue: "Comoda, seduta o sul fianco. Inspira dal naso e allunga l'espirazione, rilassando mandibola, spalle e pavimento pelvico. È uno strumento di comfort, non un metodo per accorciare il travaglio." },
    calf_raise_assist: { name: "Alzate dei talloni con appoggio", en: "Supported Calf Raise", muscle: "POLPACCI", reps: 12,
      cue: "In piedi con una mano a un appoggio, sali sulle punte e scendi piano." },
    wall_pushup: { name: "Push-up al muro", en: "Wall Push-Up", muscle: "PETTO", reps: 10,
      cue: "Mani al muro all'altezza delle spalle, piedi lontani un passo. Piegati verso il muro e torna, espirando." }
  };
  Object.keys(MORE).forEach(function (k) { EX[k] = MORE[k]; });

  var rows = W.rows;

  function levelOf(trained) { return trained === 'nessuno' ? W.LEVELS[0] : W.LEVELS[1]; }
  function seq(list) { return list.filter(Boolean); }

  /* ------------------------------- postpartum ------------------------------ */

  var DELIVERIES = [
    { id: "vaginale", label: "Parto vaginale", note: "Parto vaginale senza lacerazioni importanti." },
    { id: "lacerazione", label: "Parto vaginale con lacerazione di 1° o 2° grado, o episiotomia", note: "Si riprende come dopo un parto vaginale, con l'attenzione a cyclette e nuoto solo quando la zona è guarita e ti siedi comoda." },
    { id: "oasis", label: "Parto vaginale con lacerazione di 3° o 4° grado (sfintere anale)", note: "Qui conta molto la fisioterapia del pavimento pelvico: chiedila. L'app non passa oltre il recupero finché non hai fatto la visita e chi ti segue non ti ha dato il via." },
    { id: "operativo", label: "Parto vaginale operativo (forcipe o ventosa)", note: "Dopo un parto operativo la linea guida NICE invita a considerare un programma di esercizi del pavimento pelvico supervisionato per 3 mesi." },
    { id: "cesareo_prog", label: "Taglio cesareo programmato", note: "Dopo il cesareo carichi e guida si riprendono «quando ti senti completamente ripresa» (NICE): nessuna linea guida dà un numero di settimane." },
    { id: "cesareo_urg", label: "Taglio cesareo d'urgenza (dopo travaglio o in emergenza)", note: "Nessuno studio indica tempi diversi per il cesareo d'urgenza. Per prudenza Nurvan lo tratta come il percorso più lento e con più rinvii a chi ti segue: è una scelta dell'app, non un dato scientifico." }
  ];

  var PHASES = [
    { id: 0, label: "Recupero", range: "dal parto a 6 settimane", min: 0, max: 6,
      summary: "Respirazione, pavimento pelvico ogni giorno, camminate brevi e movimenti dolci. Niente corsa, salti, carichi pesanti o addominali intensi." },
    { id: 1, label: "Ricostruzione", range: "da 6 a 12 settimane", min: 6, max: 12,
      summary: "Dopo il controllo post-parto: camminata veloce o cyclette, pavimento pelvico in progressione, forza leggera per glutei, schiena e braccia, core graduale." },
    { id: 2, label: "Ritorno all'impatto", range: "da 3 a 6 mesi", min: 12, max: 26,
      summary: "Corsa con alternanza cammina-corri e forza progressiva, solo se non ci sono sintomi pelvici e superi i test di carico." },
    { id: 3, label: "Prestazione", range: "da 6 a 12 mesi", min: 26, max: 52,
      summary: "Ritorno graduale agli obiettivi di prima, con i sintomi come guida." },
    { id: 4, label: "Oltre l'anno", range: "oltre i 12 mesi", min: 52, max: 999,
      summary: "Programmi normali con le indicazioni per gli adulti; il pavimento pelvico si continua a lavorare." }
  ];

  // The first group: stop and call. The second: stop and see a pelvic-floor
  // physiotherapist, the midwife or the doctor.
  var URGENT = [
    "Sanguinamento vaginale improvviso o molto abbondante, o perdite che aumentano",
    "Dolore addominale, pelvico o del perineo forte, febbre, brividi o perdite che hanno cattivo odore",
    "Gonfiore e dolore a un polpaccio o a una gamba, o mancanza di fiato",
    "Dolore al petto",
    "Mal di testa forte o che non passa",
    "Capogiri, svenimenti o mancanza di fiato a riposo",
    "La ferita del cesareo è rossa, calda, secerne o si apre",
    "Seno rosso e gonfio da più di 24 ore nonostante le cure a casa",
    "Pensieri di farti del male, o umore molto basso che non passa"
  ];
  var PELVIC = [
    "Perdi urina, feci o gas, o ti scappa senza riuscire a trattenere",
    "Senti pesantezza, trascinamento o un rigonfiamento in vagina",
    "Il sanguinamento ricompare con l'esercizio, o hai perdite che durano oltre 8 settimane senza essere il ciclo",
    "Hai dolore al bacino, alla schiena o nei rapporti",
    "Compare un rigonfiamento al centro dell'addome quando fai sforzo"
  ];
  var LOAD_TESTS = [
    "Cammino 30 minuti senza dolore, pesantezza o perdite",
    "Resto in equilibrio su una gamba per 10 secondi",
    "Faccio 10 squat su una gamba per lato",
    "Corro sul posto per 1 minuto",
    "Faccio 10 balzi in avanti",
    "Faccio 10 saltelli sul posto per gamba",
    "Faccio 10 «running man» su una gamba per lato"
  ];
  var STRENGTH_TESTS = [
    "Arrivo a 20 sollevamenti sulle punte su una gamba",
    "Arrivo a 20 ponti su una gamba",
    "Arrivo a 20 alzate dalla sedia su una gamba",
    "Arrivo a 20 abduzioni dell'anca da sdraiata su un fianco"
  ];

  // Which stage the person is in, and why. input: { delivery, weeks, trained,
  // breastfeeding, checkDone, cleared, pelvicSymptoms, urgent, testsPassed }.
  function postpartumStage(input) {
    input = input || {};
    var weeks = H.clamp(Math.round(Number(input.weeks)) || 0, 0, 156);
    var delivery = H.byId(DELIVERIES, input.delivery, DELIVERIES[0]);
    var by = 0;
    PHASES.forEach(function (p) { if (weeks >= p.min) by = p.id; });
    var out = { weeks: weeks, delivery: delivery.id, phase: by, requested: by, blocked: false, urgent: false, messages: [], referrals: [], reasons: [] };
    if (input.urgent) {
      out.urgent = true; out.blocked = true; out.phase = 0;
      out.messages.push("Con uno di questi segni non fare esercizio: chiama la tua ostetrica o il tuo medico, e in caso di dolore al petto, mancanza di fiato o sanguinamento molto abbondante chiama il 112.");
      return out;
    }
    var cap = function (phase, why) { if (out.phase > phase) { out.phase = phase; out.reasons.push(why); } };
    if (!input.checkDone) cap(0, "Prima di passare oltre il recupero fai il controllo post-parto delle 6-8 settimane con il tuo medico o la tua ostetrica: è un passaggio di valutazione, non un via libera automatico all'impatto.");
    if (delivery.id === "oasis" && !input.cleared) { cap(0, "Dopo una lacerazione di 3° o 4° grado l'app resta al recupero finché non hai fatto la visita e chi ti segue non ti ha detto che puoi aumentare. Chiedi la fisioterapia del pavimento pelvico (RCOG; NICE)."); out.referrals.push("Fisioterapista del pavimento pelvico"); }
    if (delivery.id === "cesareo_urg" && !input.cleared) cap(1, "Per prudenza, dopo un cesareo d'urgenza l'app si ferma alla ricostruzione finché chi ti segue non ti dice che puoi aumentare (è una scelta dell'app, non un dato di studio).");
    if (input.pelvicSymptoms) { cap(1, "Con sintomi del pavimento pelvico si resta senza impatto: fatti vedere da un fisioterapista del pavimento pelvico."); out.referrals.push("Fisioterapista del pavimento pelvico, ostetrica o medico"); }
    if (out.phase >= 2 && !input.testsPassed) cap(1, "Prima della corsa e dei salti servono i test di carico e di forza senza sintomi: li trovi qui sotto.");
    if (delivery.id === "operativo") out.messages.push("Dopo un parto operativo la linea guida NICE invita a considerare un programma di esercizi del pavimento pelvico supervisionato per 3 mesi.");
    if (out.phase >= 2) out.messages.push("Le linee guida di esperti suggeriscono di non correre prima di circa 3 mesi dal parto e solo senza sintomi. Non è una regola fissa né un risultato di studi: nessuno studio ha stabilito quando riprendere corsa, salti o carichi pesanti.");
    if (out.phase !== out.requested) out.blocked = false;
    out.delivery = delivery.id;
    return out;
  }

  var RUN_LADDER = [
    "1 minuto di corsa leggera e 2 di camminata, ripetuti 6 volte",
    "2 minuti di corsa e 2 di camminata, ripetuti 5 volte",
    "3 minuti di corsa e 2 di camminata, ripetuti 5 volte",
    "5 minuti di corsa e 2 di camminata, ripetuti 4 volte",
    "8 minuti di corsa e 1 di camminata, ripetuti 3 volte",
    "15 minuti di corsa continua e il resto camminando"
  ];

  function postpartumSession(ctx, phase, weekInBlock, day) {
    var weeksEff = ctx.weeks + weekInBlock - 1;
    var p = ctx.blockWeeks <= 1 ? 0 : (weekInBlock - 1) / (ctx.blockWeeks - 1);
    var lvl = levelOf(ctx.trained);
    var caesarean = ctx.delivery === "cesareo_prog" || ctx.delivery === "cesareo_urg";
    var strict = ctx.delivery === "cesareo_urg" || ctx.delivery === "oasis";
    var guided = ctx.delivery === "oasis" ? "Chiedi indicazioni al tuo fisioterapista del pavimento pelvico." : "";
    var out = [];
    var first = true;
    var add = function (row) {
      if (!row) return;
      if (first) { row.notes = (row.notes ? row.notes + " " : "") + "Se senti dolore, tiramento della ferita o perdite che aumentano, salta l'esercizio e parlane con chi ti segue."; first = false; }
      out.push(row);
    };
    if (phase === 0) {
      add(rowFor("breath", lvl, p, { sets: 2, sec: 45 + Math.round(p * 15), rest: "20s" }));
      add(rowFor("pf_slow", lvl, p, { sets: 2, reps: 8 + Math.round(p * 2), rest: "30s", extra: "Dose indicativa (nessuno studio fissa il numero): contrai tenendo 3-5 secondi e rilascia del tutto. " + guided }));
      if (weeksEff >= 2) add(rowFor("pf_quick", lvl, p, { sets: 1, reps: 8, rest: "30s", extra: guided }));
      if (!(ctx.delivery === "cesareo_urg") || weeksEff >= 4) add(rowFor("pelvic_tilt", lvl, p, { sets: 2, reps: 8, rest: "30s" }));
      if (weeksEff >= (caesarean ? 4 : 2) && !strict) add(rowFor("knee_fall", lvl, p, { sets: 2, reps: 8, rest: "30s" }));
      if (weeksEff >= (caesarean ? 4 : 2) && !strict) add(rowFor("side_hip_abd", lvl, p, { sets: 2, reps: 8, rest: "30s" }));
      if (weeksEff >= (strict ? 4 : 3)) {
        add(rowFor("sit_to_stand", lvl, p, { sets: 2, reps: 8, rest: "30s", extra: "Come un gesto di tutti i giorni." }));
        add(rowFor("glute_bridge", lvl, p, { sets: 2, reps: 8, rest: "30s" }));
      }
      add(rowFor("walking", lvl, p, { minutes: Math.min(20, 8 + weeksEff * 2), extra: "Brevi uscite, aumentando a poco a poco. Cammina piano se senti pesantezza." }));
      return { name: "Giorno " + (day + 1), title: "Recupero · giorno " + (day + 1), exercises: out };
    }
    if (phase === 1) {
      var sets = lvl.n === 0 ? 2 : 3;
      var minutes = 20 + Math.round(p * 10);
      var bike = !(ctx.delivery === "oasis") && (ctx.delivery !== "lacerazione" || weeksEff >= 8);
      var t = day % 3;
      add(rowFor(t === 1 && bike ? "cycling" : "walking", lvl, p, { minutes: minutes, extra: t === 1 && bike ? "Solo se ti siedi comoda sul sellino." : "Cammina a passo svelto: dovresti riuscire a parlare." }));
      add(rowFor("pf_slow", lvl, p, { sets: 2, reps: 10, rest: "30s", extra: "Prova anche in piedi e durante i gesti di ogni giorno. Contrazioni vicine al massimo, tenute 5-6 secondi, e rilascio completo. " + guided }));
      if (t === 0) { add(rowFor("glute_bridge", lvl, p, { sets: sets, reps: 10 })); add(rowFor("row_band", lvl, p, { sets: sets, reps: 12 })); add(rowFor("goblet_squat", lvl, p, { sets: sets, reps: 10, extra: "Con un peso leggero." })); }
      if (t === 1) { add(rowFor("rdl_db", lvl, p, { sets: sets, reps: 10, extra: "Carico leggero: non oltre il peso del bambino nell'ovetto (circa 15 kg). È un'indicazione di esperti, non di studi." })); add(rowFor("incline_pushup", lvl, p, { sets: sets, reps: 8 })); add(rowFor("side_hip_abd", lvl, p, { sets: sets, reps: 10 })); }
      if (t === 2) { add(rowFor("row_band", lvl, p, { sets: sets, reps: 12 })); add(rowFor("sit_to_stand", lvl, p, { sets: sets, reps: 10 })); add(rowFor("calf_raise", lvl, p, { sets: sets, reps: 12 })); }
      add(rowFor("dead_bug", lvl, p, { sets: 2, reps: 8, rest: "30s" }));
      add(rowFor("bird_dog", lvl, p, { sets: 2, reps: 8, rest: "30s" }));
      add(rowFor("plank_knees", lvl, p, { sets: 2, sec: 15 + Math.round(p * 15), rest: "30s" }));
      if (weeksEff >= 6 && (caesarean || ctx.delivery === "lacerazione" || ctx.delivery === "oasis")) add(rowFor("scar", lvl, p, { sets: 1, sec: 60, rest: "0s" }));
      return { name: "Giorno " + (day + 1), title: "Ricostruzione · giorno " + (day + 1), exercises: out };
    }
    // stages 2, 3, 4: strength plus the walk-run, impact only from stage 2
    var s3 = lvl.n === 0 ? 3 : 4;
    var run = H.clamp(weekInBlock - 1, 0, RUN_LADDER.length - 1);
    var t2 = day % 3;
    if (phase >= 2 && t2 !== 1) add(rowFor("walk_run", lvl, p, { minutes: 20 + Math.min(10, (weekInBlock - 1) * 2), extra: RUN_LADDER[run] + "." }));
    else add(rowFor("walking", lvl, p, { minutes: 30, extra: "Cammina a passo svelto." }));
    add(rowFor("pf_slow", lvl, p, { sets: 1, reps: 10, rest: "30s", extra: "Ogni giorno, anche nei giorni senza allenamento." }));
    if (t2 === 0) { add(rowFor("goblet_squat", lvl, p, { sets: s3 - 1, reps: 8, extra: "Aumenta il carico a poco a poco." })); add(rowFor("rdl_db", lvl, p, { sets: s3 - 1, reps: 8 })); add(rowFor("incline_pushup", lvl, p, { sets: s3 - 1, reps: 8 })); add(rowFor("row_db", lvl, p, { sets: s3 - 1, reps: 10 })); }
    if (t2 === 1) { add(rowFor("split_squat", lvl, p, { sets: s3 - 1, reps: 8 })); add(rowFor("calf_raise", lvl, p, { sets: s3 - 1, reps: 12 })); add(rowFor("glute_bridge", lvl, p, { sets: s3 - 1, reps: 10 })); if (phase >= 2 && weekInBlock >= 3) add(rowFor("jog_light", lvl, p, { sets: 2, reps: 10, extra: "Solo se hai superato i test e non hai sintomi." })); }
    if (t2 === 2) { add(rowFor("row_band", lvl, p, { sets: s3 - 1, reps: 12 })); add(rowFor("side_hip_abd", lvl, p, { sets: s3 - 1, reps: 12 })); add(rowFor("rdl_db", lvl, p, { sets: s3 - 1, reps: 8 })); }
    add(rowFor("plank", lvl, p, { sets: 2, sec: 20 + Math.round(p * 20), rest: "30s" }));
    add(rowFor("side_plank", lvl, p, { sets: 2, sec: 15 + Math.round(p * 15), rest: "30s" }));
    add(rowFor("curl_up", lvl, p, { sets: 2, reps: 8, rest: "30s", extra: "Se hai la diastasi puoi farlo: uno studio non ha visto peggioramenti. Se compare un rigonfiamento al centro, riduci e fatti valutare." }));
    var names = { 2: "Ritorno all'impatto", 3: "Prestazione", 4: "Programma normale" };
    return { name: "Giorno " + (day + 1), title: names[phase] + " · giorno " + (day + 1), exercises: out };
  }

  function planPostpartum(input) {
    input = input || {};
    var stage = postpartumStage(input);
    var blockWeeks = H.clamp(Math.round(Number(input.blockWeeks)) || 4, 2, 8);
    var phase = stage.phase;
    var days = phase === 0 ? 4 : (phase === 1 ? 3 : 3);
    var ctx = { delivery: stage.delivery, weeks: stage.weeks, trained: input.trained || "nessuno", blockWeeks: blockWeeks, breastfeeding: !!input.breastfeeding };
    var weeks = [];
    for (var w = 1; w <= blockWeeks; w++) {
      var sessions = [];
      for (var d = 0; d < days; d++) sessions.push(postpartumSession(ctx, phase, w, d));
      weeks.push({ week: w, weekNumber: w, week_number: w, label: "Settimana " + w + " · " + PHASES[phase].label, sessions: sessions });
    }
    var delivery = H.byId(DELIVERIES, stage.delivery, DELIVERIES[0]);
    var summary = "Dopo il parto · " + PHASES[phase].label + " (" + PHASES[phase].range + ") · " + delivery.label + ". " + W.DISCLAIMER_SHORT +
      (input.breastfeeding ? " Se allatti, allattare o tirare il latte prima dell'esercizio e bere abbastanza." : "");
    return {
      id: "wbg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      title: "Dopo il parto · " + PHASES[phase].label + " · " + blockWeeks + " settimane",
      weeks: weeks, duration_weeks: blockWeeks, days_per_week: days,
      split: "wellbeing_postpartum", goals: ["wellbeing"], purpose: "wellbeing", equipment: "minimal", experience: ctx.trained,
      author: "Generata da Nurvan", source: "wellbeing_v1",
      wellbeing: { area: "postpartum", phase: phase, delivery: stage.delivery, weeks: stage.weeks, disclaimer: W.DISCLAIMER_VERSION },
      source_summary: summary,
      meta: { generatedAt: new Date().toISOString(), method: "wellbeing_postpartum_" + phase, stage: stage.reasons }
    };
  }

  var POSTPARTUM_SOURCES = [
    { t: "Le linee guida sull'attività fisica (OMS 2020, Canada 2025, ACOG 2020, UK) concordano su due cose: l'esercizio dopo il parto è sicuro e utile, e si riprende gradualmente, guidati dai sintomi. Nessuna fissa una settimana per riprendere corsa, salti o carichi pesanti.", r: ["33239350", "40139673", "32217980", "uk-cmo-postpartum"] },
    { t: "La linea guida canadese del 2025 raccomanda almeno 120 minuti a settimana di attività moderata o vigorosa su 4 o più giorni, con attività di forza, e il pavimento pelvico ogni giorno; passare all'attività più intensa quando ferite e lacerazioni sono guarite e le perdite non aumentano con lo sforzo.", r: ["40139673"] },
    { t: "Il controllo post-parto delle 6-8 settimane (NICE) è una valutazione, non un via libera automatico all'impatto.", r: ["nice-ng194"] },
    { t: "Gli esercizi del pavimento pelvico dopo il parto riducono l'incontinenza urinaria (meta-analisi del 2025: 37% in meno, certezza moderata); la revisione Cochrane del 2020 è più incerta per quelli iniziati dopo il parto. Servono programmi supervisionati, con contrazioni vicine al massimo e di almeno 8 settimane.", r: ["39694630", "32378735", "23365417"] },
    { t: "Dopo un parto operativo o una lacerazione dello sfintere anale il NICE invita a considerare 3 mesi di esercizi del pavimento pelvico supervisionati; la linea guida RCOG sulle lacerazioni di 3° e 4° grado dice che la fisioterapia può essere utile e che la rivalutazione avviene di solito a 6-12 settimane.", r: ["nice-ng210", "rcog-gtg29"] },
    { t: "La diastasi dei retti è frequente (circa il 60% a 6 settimane, il 33% a 12 mesi) e l'esercizio la riduce poco, senza benefici funzionali dimostrati. Evitare i crunch non è una regola dimostrata: in uno studio randomizzato 12 settimane di curl-up non hanno peggiorato la diastasi.", r: ["27324871", "36934466", "37286390"] },
    { t: "Dopo il cesareo il NICE dice di riprendere guida, carichi pesanti ed esercizio quando ci si sente completamente riprese; non indica un numero di settimane né un limite di peso. Mobilizzarsi presto è raccomandato.", r: ["nice-ng192", "30995461"] },
    { t: "Per la corsa, le linee guida di esperti (Goom 2019) suggeriscono di non correre prima di circa 3 mesi dal parto e solo senza sintomi: è opinione di esperti (livello 4), non risultato di studi. Per gli atleti seguiti da professionisti, i consensi del 2024 ammettono tempi individualizzati dopo almeno 3 settimane.", r: ["goom-2019", "38148108", "38191239"] },
    { t: "Allenarsi non riduce il latte né la crescita del bambino (studio randomizzato e revisione del 2025), e migliora umore e sonno: l'esercizio riduce i sintomi depressivi, ma non sostituisce la cura della depressione.", r: ["8289849", "39375006", "39500542", "40011015"] }
  ];
  var POSTPARTUM_NOT_PROVEN = [
    "Nessuno studio dice quando riprendere corsa, salti o carichi pesanti: le 12 settimane sono opinione di esperti.",
    "Non ci sono prove che il cesareo d'urgenza richieda tempi diversi da quello programmato: la scelta più prudente dell'app è tale, non un dato.",
    "Regole come «non sollevare più del peso del bambino per 6 settimane» non hanno prove: il NICE le lascia al recupero percepito.",
    "Non è dimostrato che gli esercizi «chiudano» la diastasi, né che il drawing-in o gli ipopressivi siano il metodo giusto.",
    "Per gli esercizi del pavimento pelvico dopo il parto le revisioni non sono d'accordo: non promettiamo che «prevengano sicuramente» l'incontinenza."
  ];

  /* -------------------------------- labour -------------------------------- */

  // A "yes" to any of these means the team decides: information only.
  var LABOUR_RISKS = [
    "La mia gravidanza non è seguita come a basso rischio",
    "Ho una placenta previa",
    "Ho la pressione alta o la preeclampsia",
    "Ho avuto sanguinamenti",
    "Aspetto due o più bambini",
    "Il bambino è podalico (con i piedi in giù)",
    "Ho avuto un taglio cesareo in precedenza",
    "Mi si sono rotte le acque",
    "Ho contrazioni regolari prima della 37ª settimana",
    "Chi mi segue mi ha detto di limitare l'attività o di stare a riposo"
  ];
  var LABOUR_ALARMS = [
    "Sanguinamento rosso vivo o abbondante",
    "Perdita di liquido verde, marrone o che ha cattivo odore",
    "Il bambino si muove meno o in modo diverso dal solito",
    "Dolore addominale forte e continuo, che non passa tra una contrazione e l'altra",
    "Febbre o brividi",
    "Mal di testa forte, disturbi della vista, dolore sotto le costole a destra o gonfiore improvviso di viso e mani",
    "Senti qualcosa in vagina dopo la rottura delle acque: è un'emergenza",
    "Contrazioni regolari prima della 37ª settimana"
  ];

  // What the evidence says, by moment of labour. t: the advice in plain words;
  // e: the evidence in a line; r: references.
  var LABOUR_GUIDE = [
    { id: "primo", title: "Primo stadio: muoversi", when: "Se non hai l'epidurale e chi ti segue è d'accordo",
      t: "Muoviti, cammina, resta in piedi appoggiata in avanti, siediti (anche sulla palla), mettiti in ginocchio o carponi. Scegli quello che ti fa stare meglio e cambia quando vuoi.",
      e: "Posizioni erette e camminare accorciano il primo stadio di circa 1 ora e 20 minuti, con meno cesarei e meno epidurali e nessun segnale di danno (revisione Cochrane del 2013: la qualità degli studi è variabile e le stime poco precise). L'OMS raccomanda mobilità e posizioni erette per le donne a basso rischio; il NICE di muoversi e assumere le posizioni più comode, tranne quella supina.",
      r: ["24105444", "29637727", "nice-ng235"] },
    { id: "palla", title: "La palla da parto", when: "Se la usi con l'accordo del team",
      t: "Può aiutarti con il dolore. Non ci sono prove sufficienti per dire che riduca i cesarei o la durata.",
      e: "Meno dolore di circa 1,7 punti su 10 in una meta-analisi di 7 studi; per parto spontaneo, operativo e cesareo nessuna differenza. Una meta-analisi del 2025 trova meno cesarei, ma da studi piccoli: è un segnale da confermare.",
      r: ["33478303", "31003693", "39825901"] },
    { id: "schiena", title: "Stare piatta sulla schiena", when: "In ogni momento del travaglio",
      t: "Evita di stare a lungo sdraiata sulla schiena: meglio il fianco o una posizione inclinata.",
      e: "Il NICE consiglia di evitare la posizione supina; la Cochrane ricorda il rischio di compressione dei grossi vasi.",
      r: ["nice-ng235", "30411804"] },
    { id: "epidurale", title: "Con l'epidurale o l'induzione", when: "Se hai l'epidurale o ti è stato indotto il travaglio",
      t: "Le posizioni le decide il team. Spesso stare sul fianco aiuta. Non ci sono esercizi guidati dall'app.",
      e: "Con l'epidurale le posizioni erette in fase espulsiva non hanno aiutato e, negli studi migliori, hanno aumentato i parti operativi e i cesarei (Cochrane 2018, certezza alta); in un grande studio stare sdraiate sul fianco ha dato più parti spontanei (41% contro 35%). Con l'epidurale, le attività a letto guidate hanno accorciato il travaglio, mentre la sola attività eretta ha aumentato dell'8% i parti vaginali operativi.",
      r: ["30411804", "29046273", "41865496"] },
    { id: "spinta", title: "Spingere", when: "Nella fase espulsiva",
      t: "Segui il tuo stimolo, nel modo che ti viene naturale, e le indicazioni della tua ostetrica. Non esiste un unico modo giusto di spingere.",
      e: "Spinta spontanea o guidata: nessuna differenza chiara per durata e lacerazioni. Con l'epidurale spingere subito o più tardi non cambia la percentuale di parti vaginali spontanei (studio JAMA 2018). La pressione sul fondo dell'utero non è raccomandata.",
      r: ["28349526", "30304425", "28267223", "29637727"] },
    { id: "posizione", title: "La posizione per partorire", when: "Senza epidurale",
      t: "Puoi chiedere una posizione eretta, in ginocchio, sul fianco o accovacciata.",
      e: "Le posizioni erette si associano a meno parti assistiti e meno episiotomie, ma forse a più lacerazioni di secondo grado e a più perdite di sangue (oltre i 500 ml): ci sono benefici e rischi, e la scelta spetta a te e al team (Cochrane 2017).",
      r: ["28539008"] },
    { id: "perineo", title: "Il perineo", when: "In gravidanza e durante la spinta",
      t: "Dalla 34ª-35ª settimana puoi chiedere alla tua ostetrica come fare il massaggio perineale. Durante la spinta puoi chiedere se usa impacchi caldi o il massaggio.",
      e: "Il massaggio prenatale riduce i traumi da suturare e le episiotomie nelle donne che non hanno mai partorito per via vaginale (revisione Cochrane); impacchi caldi e massaggio durante la spinta possono ridurre le lacerazioni di 3° e 4° grado (certezza moderata). Sono gesti da fare con l'ostetrica.",
      r: ["23633325", "37414371", "28608597"] },
    { id: "respiro", title: "Respiro, rilassamento e una persona accanto", when: "In travaglio",
      t: "Il respiro lento e il rilassamento sono strumenti di comfort. Scegli e prepara una persona di supporto.",
      e: "Rilassamento e respiro hanno prove di bassa certezza sul dolore e non vanno presentati come metodi per accorciare il parto. Il sostegno continuo in travaglio ha le prove più solide: più parti vaginali spontanei, meno cesarei e meno analgesia.",
      r: ["29589650", "36896808", "28681500"] },
    { id: "acqua", title: "L'acqua", when: "Solo se il tuo punto nascita la offre e sei a basso rischio",
      t: "L'immersione in acqua nel primo stadio può ridurre un po' il ricorso all'epidurale.",
      e: "15 studi su donne sane, a basso rischio e a termine: nessuna prova di danni, ma per la fase espulsiva i dati sono pochi.",
      r: ["29768662"] }
  ];
  var LABOUR_TRAINING = {
    title: "Essere allenate cambia il travaglio?",
    t: "In sala parto le indicazioni su posizioni, spinte e acqua sono le stesse per tutte, qualunque sia il tuo livello di allenamento: gli studi non giustificano consigli diversi. Il livello conta prima, per come ti prepari in gravidanza.",
    facts: [
      { t: "Allenarsi in gravidanza è associato a meno parti strumentali (circa il 24% in meno, certezza moderata). Sul cesareo e sulla durata del travaglio le meta-analisi non sono d'accordo, e non c'è relazione tra quantità di esercizio ed esiti: non si può promettere che allenarsi accorci il travaglio.", r: ["30337349", "24631706", "40700369"] },
      { t: "Nelle atlete di alto livello non ci sono differenze nei principali esiti del parto rispetto a donne attive o sedentarie.", r: ["32925496"] },
      { t: "Le linee guida dicono che chi era attiva può continuare e chi non lo era deve cominciare gradualmente, con almeno 150 minuti a settimana di attività moderata se non ci sono controindicazioni, e il pavimento pelvico.", r: ["30337460", "32217980", "33239350"] },
      { t: "Un pavimento pelvico forte non rende il parto più difficile: gli esercizi in gravidanza riducono l'incontinenza (62% in meno a fine gravidanza nelle donne continenti) e non risultano allungare il parto.", r: ["32378735", "15253920", "32506232"] }
    ]
  };
  var LABOUR_PROFILES = [
    { id: "nessuno", label: "Non mi allenavo prima", message: "Muoverti in gravidanza è sicuro e utile; non serve essere allenate per partorire bene. Comincia gradualmente." },
    { id: "amatoriale", label: "Mi allenavo ogni tanto", message: "Restare attiva è associato a meno parti strumentali. Mantieni almeno 150 minuti a settimana di attività moderata, se non ci sono controindicazioni." },
    { id: "regolare", label: "Mi allenavo con regolarità, anche da atleta", message: "Puoi continuare, riducendo con il progredire della gravidanza. Il tuo allenamento non rende il parto più corto o più facile, e non ci sono prove di benefici oltre le raccomandazioni; per le intensità molto alte serve il parere del tuo team." }
  ];

  function planLabour(input) {
    input = input || {};
    var profile = H.byId(LABOUR_PROFILES, input.profile, LABOUR_PROFILES[0]);
    var gw = H.clamp(Math.round(Number(input.weeksPregnant)) || 34, 24, 40);
    var total = H.clamp(40 - gw, 1, 12);
    var lvl = profile.id === "nessuno" ? W.LEVELS[0] : W.LEVELS[1];
    var weeks = [];
    for (var w = 1; w <= total; w++) {
      var p = total <= 1 ? 0 : (w - 1) / (total - 1);
      var walkMin = profile.id === "nessuno" ? Math.min(30, 15 + (w - 1) * 3) : (profile.id === "amatoriale" ? 30 : 30 + Math.round(p * 10));
      var s1 = seq([
        rowFor("walking", lvl, p, { minutes: walkMin, extra: "Riesci a parlare ma non a cantare. Fermati se hai capogiri, dolore, perdite o contrazioni." }),
        rowFor("pf_slow", lvl, p, { sets: 2, reps: 10, rest: "30s", extra: "Contrai e rilascia. Impara bene il gesto: se puoi, fatti insegnare da un'ostetrica o da un fisioterapista." })
      ]);
      var s2 = seq([
        rowFor("ball_sway", lvl, p, { sets: 1, sec: 120, rest: "0s" }),
        rowFor("lean_forward", lvl, p, { sets: 1, sec: 60, rest: "0s" }),
        rowFor("all_fours_rock", lvl, p, { sets: 1, sec: 60, rest: "0s" }),
        rowFor("side_lying_rest", lvl, p, { sets: 1, sec: 120, rest: "0s" }),
        rowFor("bird_dog", lvl, p, { sets: 2, reps: 8, rest: "30s" })
      ]);
      var s3 = profile.id === "nessuno"
        ? seq([rowFor("walking", lvl, p, { minutes: Math.min(25, 12 + (w - 1) * 2) }), rowFor("pf_quick", lvl, p, { sets: 1, reps: 8, rest: "30s" })])
        : seq([rowFor("sit_to_stand", lvl, p, { sets: 2, reps: 10 }), rowFor("row_band", lvl, p, { sets: 2, reps: 12 }), rowFor("calf_raise_assist", lvl, p, { sets: 2, reps: 12 }), rowFor("wall_pushup", lvl, p, { sets: 2, reps: 10 }), rowFor("bird_dog", lvl, p, { sets: 2, reps: 8, rest: "30s" })]);
      var s4 = seq([
        rowFor("breath_slow", lvl, p, { sets: 1, sec: 180, rest: "0s" }),
        rowFor("pf_slow", lvl, p, { sets: 2, reps: 10, rest: "30s" }),
        rowFor("pf_quick", lvl, p, { sets: 1, reps: 8, rest: "30s" })
      ]);
      s1[0].notes = (s1[0].notes ? s1[0].notes + " " : "") + "Fermati e chiama chi ti segue se compaiono sanguinamento, perdita di liquido, contrazioni regolari, dolore o se il bambino si muove meno.";
      weeks.push({ week: w, weekNumber: w, week_number: w, label: "Settimana " + w + " · " + (gw + w - 1) + "ª di gravidanza", sessions: [
        { name: "Movimento", title: "Movimento e pavimento pelvico", exercises: s1 },
        { name: "Posizioni", title: "Posizioni comode e movimento libero", exercises: s2 },
        { name: "Forza leggera", title: profile.id === "nessuno" ? "Camminata facile" : "Forza leggera", exercises: s3 },
        { name: "Respiro", title: "Respiro, rilassamento e pavimento pelvico", exercises: s4 }
      ] });
    }
    return {
      id: "wbg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      title: "Preparazione al parto · " + total + (total === 1 ? " settimana" : " settimane"),
      weeks: weeks, duration_weeks: total, days_per_week: 4,
      split: "wellbeing_labour", goals: ["wellbeing"], purpose: "wellbeing", equipment: "minimal", experience: profile.id,
      author: "Generata da Nurvan", source: "wellbeing_v1",
      wellbeing: { area: "labour", profile: profile.id, weeksPregnant: gw, disclaimer: W.DISCLAIMER_VERSION },
      source_summary: "Preparazione al parto · " + profile.label + " · dalla " + gw + "ª settimana. " + W.DISCLAIMER_SHORT,
      meta: { generatedAt: new Date().toISOString(), method: "wellbeing_labour_" + profile.id }
    };
  }

  // Before anything: any of the situations means the team decides.
  function screenLabour(answers) {
    var flagged = [];
    (answers || []).forEach(function (yes, i) { if (yes && LABOUR_RISKS[i]) flagged.push(LABOUR_RISKS[i]); });
    return { ok: flagged.length === 0, reasons: flagged };
  }

  /* ------------------------------- the entry ------------------------------- */

  W.DELIVERIES = DELIVERIES;
  W.PHASES = PHASES;
  W.URGENT = URGENT;
  W.PELVIC = PELVIC;
  W.LOAD_TESTS = LOAD_TESTS;
  W.STRENGTH_TESTS = STRENGTH_TESTS;
  W.POSTPARTUM_SOURCES = POSTPARTUM_SOURCES;
  W.POSTPARTUM_NOT_PROVEN = POSTPARTUM_NOT_PROVEN;
  W.LABOUR_RISKS = LABOUR_RISKS;
  W.LABOUR_ALARMS = LABOUR_ALARMS;
  W.LABOUR_GUIDE = LABOUR_GUIDE;
  W.LABOUR_TRAINING = LABOUR_TRAINING;
  W.LABOUR_PROFILES = LABOUR_PROFILES;
  W.postpartumStage = postpartumStage;
  W.screenLabour = screenLabour;
  W._plan.postpartum = planPostpartum;
  W._plan.labour = planLabour;

  // The program of an area, from its answers.
  W.plan = function (input) {
    input = input || {};
    var make = W._plan[input.area];
    if (!make) throw new Error('Area sconosciuta: ' + input.area);
    return make(input);
  };

  // Every exercise, for the screens that list them.
  W.library = function () {
    return Object.keys(EX).map(function (k) { return { name: EX[k].name, en: EX[k].en, muscle: EX[k].muscle, eq: "corpo libero" }; });
  };
})(typeof self !== 'undefined' ? self : this);
