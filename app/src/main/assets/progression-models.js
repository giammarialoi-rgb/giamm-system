/*
 * Progression models: how a week-1 template becomes a whole program.
 *
 * The builder lets an athlete write one week. This turns that week into the
 * twelve (or four, or sixteen) that follow, and the point of each model is
 * that the weeks are NOT all the same: volume, effort, tempo, rest and load
 * move on purpose, in a shape somebody can name and defend.
 *
 * Two families.
 *
 * Bodybuilding models move volume and proximity to failure. Effort lives at
 * RIR 2-3 for most of a block, failure is not required for growth (ACSM 2026;
 * Schoenfeld 2021), weekly volume per muscle sits around and above ten hard
 * sets (Schoenfeld 2016 dose-response), and a lighter week every fourth one
 * is there to let fatigue drain rather than to punish. Where a model calls for
 * them, the intensity techniques this app already has - myo-reps, rest-pause,
 * drop sets, clusters - are written onto the LAST set of ACCESSORY work only:
 * they buy stimulus per unit of time on exercises where failing is cheap, and
 * they are exactly what should not be done on a heavy barbell lift.
 *
 * Powerlifting / streetlifting models drive competition lifts by percentage of
 * a maximum toward a test day, on the six lifts a meet can ask for: squat,
 * bench, deadlift, overhead press, weighted pull-up and weighted dip. Volume
 * falls and intensity rises across the block, the last week is a taper and
 * then the attempt (Grgic 2018 on loading for strength; specificity of the
 * competition lift, Baz-Valle 2019). Accessories keep doing the hypertrophy
 * job, which is where the techniques go.
 *
 * Loads can be written three ways, because an athlete is not always somebody
 * with real maxes: in kilograms when a max is known, as a percentage when the
 * same program is shared by two athletes, or as RIR/RPE when there is no max
 * to compute from. Pull-ups and dips are percentages of bodyweight PLUS the
 * belt, so the kilograms printed for them are the added load.
 */
(function (root) {
  'use strict';

  var COMP_LIFTS = [
    { id: 'squat', label: 'Squat', match: /\bsquat\b/i, exclude: /(split|bulgar|goblet|pistol|hack|sissy|overhead|front|zercher|box|pause|pin|anderson|belt|smith|cossack|jump)/i },
    // "Bench dip" carries the word bench and is not a bench press: the
    // exclusions are what keep a name from being read as the wrong lift.
    { id: 'bench', label: 'Panca piana', match: /(panca\s*piana|bench\s*press|\bbench\b)/i, exclude: /(inclinat|declinat|incline|decline|manubri|dumbbell|presa stretta|close|smith|floor|pause|spinte|\bdip\b|\brow\b|rematore|press\s*up)/i },
    { id: 'deadlift', label: 'Stacco da terra', match: /(stacco|deadlift)/i, exclude: /(rumeno|romanian|\brdl\b|sumo|deficit|rack|block|trap|manubri|dumbbell|monopodalic|single)/i },
    { id: 'press', label: 'Military press', match: /(military\s*press|overhead\s*press|lento\s*avanti|\bohp\b)/i, exclude: /(manubri|dumbbell|macchina|machine|arnold|push\s*press|seduto|seated)/i },
    { id: 'pullup', label: 'Trazioni zavorrate', match: /(trazion|pull[\s-]*up|chin[\s-]*up)/i, exclude: /(lat\s*machine|assistit|elastic|negative|australian|inverse)/i },
    { id: 'dip', label: 'Dip zavorrati', match: /(\bdip\b|dips|parallele)/i, exclude: /(assistit|macchina|machine|bench\s*dip|panca)/i }
  ];

  // Weighted calisthenics load the whole system: a percentage of a pull-up max
  // is a percentage of bodyweight plus belt, and what goes on the belt is the
  // difference. Treating the added kilos as the 1RM would make 70% meaningless.
  var BODYWEIGHT_LIFTS = { pullup: true, dip: true };

  function competitionLiftFor(name) {
    var clean = String(name || '');
    for (var i = 0; i < COMP_LIFTS.length; i++) {
      var lift = COMP_LIFTS[i];
      if (lift.match.test(clean) && !(lift.exclude && lift.exclude.test(clean))) return lift.id;
    }
    return null;
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function roundLoad(kg, step) {
    var s = step || 2.5;
    return Math.round(kg / s) * s;
  }

  // Effort from a percentage, for when there is no max to turn into kilograms.
  //
  // It has to account for the reps, not only the load: five reps at 70% and
  // one rep at 70% are not the same effort at all. Epley's relation inverted
  // gives how many reps a load allows; what is left over is the reps in
  // reserve. Six is as far as the scale usefully goes - past that it is just
  // "easy".
  function repsAtPercent(pct) {
    return Math.max(1, 30 * (1 / clamp(Number(pct) || 1, 0.3, 1) - 1));
  }

  function rirForPercent(pct, reps) {
    return clamp(Math.round(repsAtPercent(pct) - Math.max(1, Number(reps) || 1)), 0, 6);
  }

  function rpeForPercent(pct, reps) {
    return clamp(10 - rirForPercent(pct, reps), 4, 10);
  }

  // "8-10" are repetitions, "45s" is a hold and "20 min" is cardio. A
  // progression that turned 45s into 46 would be writing nonsense, so the
  // unit is kept and a duration moves by a step that means something.
  function bumpReps(raw, delta) {
    var text = String(raw == null ? '' : raw).trim();
    if (!delta || !text) return text || '8-10';
    var m = text.match(/^(\d+)\s*(?:-\s*(\d+))?\s*(s|sec|secondi|min|minuti)?\b/i);
    if (!m) return text;
    var unit = (m[3] || '').toLowerCase();
    var step = delta;
    if (unit) step = delta * (/^min/.test(unit) ? 2 : 5);
    var lo = Math.max(1, parseInt(m[1], 10) + step);
    var hi = m[2] ? Math.max(lo + 1, parseInt(m[2], 10) + step) : null;
    var suffix = m[3] ? (/^min/.test(unit) ? ' min' : 's') : '';
    return (hi ? (lo + '-' + hi) : String(lo)) + suffix;
  }

  /* ---------------- bodybuilding models ---------------- */

  function wave(week, length) { return ((week - 1) % length) + 1; }

  var BODYBUILDING = [
    {
      id: 'linear_rir',
      label: 'Lineare a RIR calante',
      summary: 'Stesso volume per tutto il blocco, ci si avvicina al cedimento settimana dopo settimana.',
      detail: 'Il carico sale quando le ripetizioni restano in range. È la progressione più semplice da leggere e da rispettare: cambia una variabile sola.',
      evidence: 'ACSM 2026 · Schoenfeld 2021 (il cedimento non serve per crescere)',
      deloadEvery: 4,
      week: function (w, duration) {
        var t = w / Math.max(2, duration);
        return {
          phase: t < 0.35 ? 'base' : (t < 0.75 ? 'sforzo' : 'picco'),
          volumeMul: 1,
          repsDelta: 0,
          rirDelta: t > 0.7 ? -2 : (t > 0.4 ? -1 : 0),
          restDelta: t > 0.6 ? 15 : 0,
          tempo: t < 0.4 ? '3010' : (t < 0.75 ? '2010' : '10X0'),
          note: 'Stesso volume, RIR più basso'
        };
      }
    },
    {
      id: 'double_progression',
      label: 'Doppia progressione',
      summary: 'Prima si sale di ripetizioni dentro il range, poi si aggiunge carico e si riparte dal basso.',
      detail: 'Una settimana cerchi la parte alta del range, quella dopo aggiungi peso e torni in basso. Sovraccarico senza dover indovinare i kg.',
      evidence: 'Sovraccarico progressivo su reps e carico · Schoenfeld 2016',
      deloadEvery: 5,
      week: function (w) {
        // Week one is the week that was written. Shifting the range on it
        // handed back a program that did not match the one just accepted:
        // 8-10 typed in, 9-11 printed out. The cycle starts after it.
        if (w === 1) {
          return {
            phase: 'base',
            volumeMul: 1, repsDelta: 0, rirDelta: 0, restDelta: 0, tempo: '3010',
            note: 'Parti dal range scritto e chiudi le serie vicino al limite alto'
          };
        }
        var top = w % 2 === 0;
        return {
          phase: top ? 'reps' : 'carico',
          volumeMul: 1,
          repsDelta: top ? 1 : 0,
          rirDelta: top ? 0 : -1,
          restDelta: top ? 0 : 15,
          tempo: top ? '3010' : '2010',
          note: top ? 'Cerca la parte alta del range' : 'Aggiungi carico, torna in basso nel range'
        };
      }
    },
    {
      id: 'volume_wave',
      label: 'Onda di volume 3:1',
      summary: 'Tre settimane di serie crescenti, la quarta scarica.',
      detail: 'Il volume sale di circa il 12% a settimana e poi si azzera la fatica accumulata. Adatto a chi tollera bene il volume.',
      evidence: 'Dose-risposta del volume · Schoenfeld 2016 · gestione della fatica',
      deloadEvery: 4,
      week: function (w) {
        var c = wave(w, 4);
        return {
          phase: c === 3 ? 'picco volume' : 'accumulo',
          volumeMul: 1 + (c - 1) * 0.12,
          repsDelta: 0,
          rirDelta: c === 3 ? -1 : 0,
          restDelta: 0,
          tempo: c >= 3 ? '2010' : '3010',
          note: 'Serie in crescita fino alla terza settimana'
        };
      }
    },
    {
      id: 'dup',
      label: 'Ondulata giornaliera (DUP)',
      summary: 'Ogni seduta della settimana ha il suo carattere: pesante, ipertrofia, metabolica.',
      detail: 'Range e recuperi ruotano seduta per seduta invece che settimana per settimana. Utile quando si allena lo stesso muscolo più volte a settimana.',
      evidence: 'Periodizzazione ondulata · Rhea 2002 · Schoenfeld 2019 (frequenza a pari volume)',
      deloadEvery: 5,
      sessionLane: true,
      week: function () {
        return { phase: 'DUP', volumeMul: 1, repsDelta: 0, rirDelta: 0, restDelta: 0, tempo: '2010', note: 'Pesante / ipertrofia / metabolica ruotate nelle sedute' };
      },
      session: function (sessionIndex) {
        var lane = sessionIndex % 3;
        if (lane === 0) return { repsOverride: '4-6', rir: 1, rest: 150, tempo: '10X0', setsDelta: 0, note: 'Seduta pesante' };
        if (lane === 1) return { repsOverride: '8-12', rir: 2, rest: 90, tempo: '2010', setsDelta: 0, note: 'Seduta ipertrofia' };
        return { repsOverride: '12-15', rir: 3, rest: 60, tempo: '3010', setsDelta: -1, note: 'Seduta metabolica' };
      }
    },
    {
      id: 'block_hyp_strength',
      label: 'Blocchi: ipertrofia poi intensificazione',
      summary: 'Prima metà di volume e tensione, seconda metà di carichi alti e serie più corte.',
      detail: 'Si costruisce il tessuto e poi lo si insegna a esprimere forza. Il passaggio è netto, non graduale.',
      evidence: 'Periodizzazione a blocchi · accumulo → intensificazione',
      deloadEvery: 4,
      week: function (w, duration) {
        var first = duration <= 6 ? Math.ceil(duration * 0.6) : Math.ceil(duration / 2);
        var strength = w > first;
        return {
          phase: strength ? 'intensificazione' : 'ipertrofia',
          volumeMul: strength ? 0.85 : 1.05,
          repsDelta: strength ? -2 : 0,
          rirDelta: strength ? -1 : 0,
          restDelta: strength ? 30 : 0,
          tempo: strength ? '10X0' : '3010',
          note: strength ? 'Carichi alti, volume leggermente giù' : 'Volume e tempo sotto tensione'
        };
      }
    },
    {
      id: 'volume_ramp',
      label: 'Volume crescente fino al limite',
      summary: 'Si parte dal minimo che funziona e si aggiungono serie finché il recupero regge, poi scarico.',
      detail: 'Ogni settimana una serie in più sugli accessori, mantenendo il RIR: quando il volume diventa il fattore limitante, il blocco si chiude.',
      evidence: 'Volume landmarks MEV→MRV · Israetel · dose-risposta Schoenfeld 2016',
      deloadEvery: 5,
      week: function (w, duration) {
        var c = Math.min(w, duration);
        return {
          phase: 'accumulo',
          volumeMul: 1 + Math.min(0.5, (c - 1) * 0.1),
          repsDelta: 0,
          rirDelta: c > duration * 0.7 ? -1 : 0,
          restDelta: 0,
          tempo: '3010',
          note: 'Una serie in più a settimana, RIR costante'
        };
      }
    },
    {
      id: 'technique_intensifier',
      label: 'Intensificazione con tecniche',
      summary: 'Volume stabile; nelle ultime settimane gli accessori chiudono con myo-reps, rest-pause e drop set.',
      detail: 'Serie complessive costanti, ma l\'ultima serie degli accessori diventa più densa man mano che il blocco avanza. Il carico sui fondamentali non viene toccato.',
      evidence: 'Tecniche ad alta densità a pari volume · lavoro vicino al cedimento su esercizi dove fallire costa poco',
      deloadEvery: 4,
      week: function (w, duration) {
        var t = w / Math.max(2, duration);
        var tech = null;
        if (t > 0.75) tech = 'drop_set';
        else if (t > 0.5) tech = 'rest_pause';
        else if (t > 0.3) tech = 'myo_reps';
        return {
          phase: tech ? 'intensificazione' : 'base',
          volumeMul: 1,
          repsDelta: 0,
          rirDelta: t > 0.5 ? -1 : 0,
          restDelta: 0,
          tempo: '2010',
          technique: tech,
          note: tech ? 'Ultima serie degli accessori con tecnica' : 'Costruzione, nessuna tecnica'
        };
      }
    },
    {
      id: 'density',
      label: 'Densità: recuperi che calano',
      summary: 'Stesso lavoro, sempre meno tempo per farlo.',
      detail: 'Serie, ripetizioni e carico restano; scende il recupero. Alza il lavoro per unità di tempo senza aggiungere volume.',
      evidence: 'Densità come variabile allenante · utile in fase di definizione',
      deloadEvery: 4,
      week: function (w, duration) {
        var t = w / Math.max(2, duration);
        return {
          phase: 'densità',
          volumeMul: 1,
          repsDelta: 0,
          rirDelta: t > 0.6 ? -1 : 0,
          restDelta: -Math.round(t * 30),
          tempo: '2010',
          note: 'Stesso lavoro, recuperi più corti'
        };
      }
    }
  ];

  /* ---------------- powerlifting / streetlifting models ---------------- */
  //
  // Each returns, for a competition lift in a given week: how many sets, of
  // how many reps, at what fraction of the max. The last week is the attempt.

  function testWeek(pct) {
    return { sets: 1, reps: 1, pct: pct || 1.0, note: 'Massimale: salite singole fino al massimo', attempt: true };
  }

  var POWERLIFTING = [
    {
      id: 'peaking_classic',
      label: 'Peaking classico verso il massimale',
      summary: 'Volume che scende e percentuali che salgono, fino al singolo di gara.',
      detail: 'Da 5 serie da 5 a 70% fino a doppie e singole sopra il 90%, con scarico e poi test. È il modello di riferimento se hai una base e una data.',
      evidence: 'Carichi ≥85% per la forza massimale · Grgic 2018 · specificità dell\'alzata',
      deloadEvery: 0,
      main: function (w, duration) {
        if (w === duration) return testWeek(1.0);
        if (w === duration - 1) return { sets: 2, reps: 2, pct: 0.85, note: 'Scarico: velocità, niente cedimento' };
        var t = (w - 1) / Math.max(1, duration - 2);
        var pct = 0.70 + t * 0.22;
        var reps = t < 0.3 ? 5 : (t < 0.6 ? 3 : 2);
        var sets = t < 0.3 ? 5 : (t < 0.6 ? 4 : 3);
        return { sets: sets, reps: reps, pct: Math.round(pct * 100) / 100, note: 'Accumulo verso il picco' };
      },
      accessory: function (w, duration) {
        var t = w / Math.max(2, duration);
        return { volumeMul: t > 0.75 ? 0.6 : 1, rirDelta: t > 0.75 ? 1 : 0, technique: t > 0.35 && t < 0.75 ? 'myo_reps' : null, note: t > 0.75 ? 'Accessori ridotti: la gara è vicina' : 'Accessori pieni' };
      }
    },
    {
      id: 'wave_531',
      label: 'Onde 5/3/1 sul massimale allenante',
      summary: 'Cicli di quattro settimane: 5, 3, poi 5/3/1, poi scarico. Percentuali su un massimale allenante al 90%.',
      detail: 'Modello di Jim Wendler. Ogni ciclo aggiunge un piccolo incremento al massimale allenante invece che al massimale vero, così le percentuali restano sostenibili a lungo.',
      evidence: 'Onde di intensità su TM al 90% · progressione lenta e ripetibile',
      deloadEvery: 4,
      main: function (w, duration) {
        if (w === duration) return testWeek(1.0);
        var c = wave(w, 4);
        var cycle = Math.floor((w - 1) / 4);
        var bump = cycle * 0.025;
        if (c === 1) return { sets: 3, reps: 5, pct: Math.round((0.75 + bump) * 100) / 100, note: 'Settimana 5: ultima serie a ripetizioni massime tecniche' };
        if (c === 2) return { sets: 3, reps: 3, pct: Math.round((0.80 + bump) * 100) / 100, note: 'Settimana 3' };
        if (c === 3) return { sets: 3, reps: 1, pct: Math.round((0.85 + bump) * 100) / 100, note: 'Settimana 5/3/1: apri, sali, chiudi forte' };
        return { sets: 3, reps: 5, pct: 0.55, note: 'Scarico' };
      },
      accessory: function (w) {
        var c = wave(w, 4);
        return { volumeMul: c === 4 ? 0.5 : 1, rirDelta: c === 4 ? 2 : 0, technique: c === 3 ? 'rest_pause' : null, note: c === 4 ? 'Scarico anche sugli accessori' : 'Accessori pieni' };
      }
    },
    {
      id: 'texas_method',
      label: 'Metodo Texas settimanale',
      summary: 'Una seduta di volume, una leggera, una di intensità, ogni settimana.',
      detail: 'Il carico sale di settimana in settimana sulla seduta pesante mentre il volume resta il motore. Adatto a chi è uscito dai progressi di seduta in seduta.',
      evidence: 'Progressione settimanale per intermedi · volume / recupero / intensità',
      deloadEvery: 6,
      sessionLane: true,
      main: function (w, duration, sessionIndex) {
        if (w === duration) return testWeek(1.0);
        var step = (w - 1) * 0.02;
        var lane = (sessionIndex || 0) % 3;
        if (lane === 0) return { sets: 5, reps: 5, pct: Math.round((0.80 + step) * 100) / 100, note: 'Seduta volume' };
        if (lane === 1) return { sets: 2, reps: 5, pct: Math.round((0.70 + step) * 100) / 100, note: 'Seduta leggera, tecnica' };
        return { sets: 1, reps: 5, pct: Math.round((0.88 + step) * 100) / 100, note: 'Seduta intensità: nuovo 5RM' };
      },
      accessory: function () {
        return { volumeMul: 1, rirDelta: 0, technique: null, note: 'Accessori costanti' };
      }
    },
    {
      id: 'block_pl',
      label: 'Blocchi: accumulo, trasmutazione, realizzazione',
      summary: 'Tre fasi nette: tanto lavoro, poi lavoro più duro, poi poco lavoro molto pesante.',
      detail: 'Il volume più alto sta all\'inizio e crolla nell\'ultima fase, quando conta solo l\'espressione di forza. La struttura classica della periodizzazione a blocchi.',
      evidence: 'Periodizzazione a blocchi · Verkhoshansky · carico concentrato',
      deloadEvery: 0,
      main: function (w, duration) {
        if (w === duration) return testWeek(1.0);
        var third = Math.max(1, Math.floor((duration - 1) / 3));
        if (w <= third) return { sets: 5, reps: 6, pct: 0.70, note: 'Accumulo: volume alto, percentuali contenute' };
        if (w <= third * 2) return { sets: 4, reps: 4, pct: 0.80, note: 'Trasmutazione: il volume diventa forza' };
        if (w === duration - 1) return { sets: 2, reps: 2, pct: 0.85, note: 'Scarico prima del test' };
        return { sets: 3, reps: 2, pct: 0.90, note: 'Realizzazione: poche serie, molto carico' };
      },
      accessory: function (w, duration) {
        var third = Math.max(1, Math.floor((duration - 1) / 3));
        if (w <= third) return { volumeMul: 1.2, rirDelta: 0, technique: 'myo_reps', note: 'Accessori al massimo del volume' };
        if (w <= third * 2) return { volumeMul: 1, rirDelta: 0, technique: 'rest_pause', note: 'Accessori mantenuti' };
        return { volumeMul: 0.5, rirDelta: 1, technique: null, note: 'Accessori ridotti al minimo' };
      }
    },
    {
      id: 'rpe_autoreg',
      label: 'Autoregolata a RPE',
      summary: 'Non percentuali fisse ma un RPE bersaglio per serie, con il carico deciso in giornata.',
      detail: 'Il numero che conta è lo sforzo percepito: la scheda dice 4x3 @RPE 8 e il carico lo scegli tu quel giorno. È il modello giusto quando non hai massimali affidabili o quando la giornata varia molto.',
      evidence: 'Autoregolazione a RPE/RIR · Helms 2016 · carico aggiustato alla forma del giorno',
      deloadEvery: 5,
      rpeDriven: true,
      main: function (w, duration) {
        if (w === duration) return testWeek(1.0);
        var t = (w - 1) / Math.max(1, duration - 1);
        var rpe = clamp(7 + t * 2, 7, 9.5);
        var reps = t < 0.35 ? 5 : (t < 0.7 ? 3 : 2);
        return { sets: 4, reps: reps, pct: 0.72 + t * 0.18, rpe: Math.round(rpe * 2) / 2, note: 'Carico scelto in giornata sul RPE bersaglio' };
      },
      accessory: function (w, duration) {
        var t = w / Math.max(2, duration);
        return { volumeMul: 1, rirDelta: t > 0.6 ? -1 : 0, technique: t > 0.5 ? 'myo_reps' : null, note: 'Accessori a RIR 2' };
      }
    },
    {
      id: 'meet_taper',
      label: 'Avvicinamento gara (taper finale)',
      summary: 'Blocco corto e affilato: si toglie volume e si prova il gesto di gara.',
      detail: 'Pensato per le ultime settimane prima di una gara quando la base c\'è già: singole di apertura, seconda e terza prova, poi la gara.',
      evidence: 'Taper: volume −40/60% mantenendo l\'intensità · Pritchard 2015',
      deloadEvery: 0,
      main: function (w, duration) {
        if (w === duration) return testWeek(1.0);
        var left = duration - w;
        if (left === 1) return { sets: 2, reps: 1, pct: 0.85, note: 'Ultima settimana: apertura di gara, niente di più' };
        if (left === 2) return { sets: 3, reps: 1, pct: 0.92, note: 'Prova della seconda alzata' };
        if (left === 3) return { sets: 4, reps: 2, pct: 0.87, note: 'Ultimo lavoro pesante' };
        return { sets: 4, reps: 3, pct: 0.82, note: 'Mantenimento con volume ridotto' };
      },
      accessory: function (w, duration) {
        var left = duration - w;
        return { volumeMul: left <= 2 ? 0.4 : 0.7, rirDelta: 1, technique: null, note: 'Accessori tagliati: conta solo arrivare freschi' };
      }
    }
  ];

  var NONE = {
    id: 'none',
    label: 'Tutte le settimane come la prima',
    summary: 'Nessuna progressione automatica: le settimane sono copie identiche, le modifichi tu.',
    detail: 'Scelta giusta se la progressione la gestisci in palestra, aggiungendo carico quando le ripetizioni tornano.',
    evidence: '',
    family: 'none'
  };

  BODYBUILDING.forEach(function (m) { m.family = 'bodybuilding'; });
  POWERLIFTING.forEach(function (m) { m.family = 'powerlifting'; });

  var ALL = [NONE].concat(BODYBUILDING, POWERLIFTING);

  function listModels(family) {
    if (!family) return ALL.slice();
    return ALL.filter(function (m) { return m.family === family; });
  }

  function modelById(id) {
    for (var i = 0; i < ALL.length; i++) if (ALL[i].id === id) return ALL[i];
    return NONE;
  }

  function publicModel(m) {
    return {
      id: m.id, family: m.family, label: m.label, summary: m.summary,
      detail: m.detail || '', evidence: m.evidence || '', deloadEvery: m.deloadEvery || 0,
      rpeDriven: !!m.rpeDriven
    };
  }

  /* ---------------- writing the weeks ---------------- */

  function loadTextFor(opts, liftId, pct, reps) {
    var display = opts.loadDisplay || 'percent';
    var pctText = Math.round(pct * 100) + '%';
    if (display === 'rir') {
      return 'RPE ' + rpeForPercent(pct, reps) + ' (RIR ' + rirForPercent(pct, reps) + ')';
    }
    if (display === 'kg') {
      var max = Number((opts.maxes || {})[liftId]) || 0;
      if (max > 0) {
        if (BODYWEIGHT_LIFTS[liftId]) {
          var bw = Number(opts.bodyweight) || 0;
          var total = (bw + max) * pct;
          var added = total - bw;
          if (added <= 0) return pctText + ' · corpo libero';
          return roundLoad(added, 1) + ' kg di zavorra (' + pctText + ')';
        }
        return roundLoad(max * pct, 2.5) + ' kg (' + pctText + ')';
      }
      // No max for this lift: say something true rather than a made-up number.
      return pctText + ' · RPE ' + rpeForPercent(pct, reps);
    }
    return pctText;
  }

  function targetLoadFor(opts, liftId, pct) {
    if ((opts.loadDisplay || 'percent') !== 'kg') return null;
    var max = Number((opts.maxes || {})[liftId]) || 0;
    if (!max) return null;
    if (BODYWEIGHT_LIFTS[liftId]) {
      var bw = Number(opts.bodyweight) || 0;
      var added = (bw + max) * pct - bw;
      return added > 0 ? roundLoad(added, 1) : null;
    }
    return roundLoad(max * pct, 2.5);
  }

  /* ---------------- warm-up sets ---------------- */
  //
  // A ramp up to the first working load, so the first heavy set is not the
  // first time the bar moves. Three bands: a light load needs one touch, a
  // medium one two, a heavy one three, each shorter than the last. Loads are
  // rounded UP to the plate step (2.5 kg): 48 becomes 50, not 47.5, because a
  // warm-up that lands under the plan is a warm-up nobody loads.
  function warmupRampFor(load) {
    var L = Number(load) || 0;
    if (L <= 0) return [];
    if (L <= 40) return [{ pct: 0.5, reps: 8 }];
    if (L <= 100) return [{ pct: 0.5, reps: 6 }, { pct: 0.75, reps: 3 }];
    return [{ pct: 0.4, reps: 6 }, { pct: 0.6, reps: 4 }, { pct: 0.8, reps: 2 }];
  }

  function roundUpLoad(kg, step) {
    var s = step || 2.5;
    return Math.round(Math.ceil(Number(kg) / s - 1e-9) * s * 100) / 100;
  }

  function isWarmupSet(s) {
    return Boolean(s && typeof s === 'object' && s.warmup);
  }

  function warmupSetsFor(load) {
    return warmupRampFor(load).map(function (b) {
      return { reps: String(b.reps), target_load: roundUpLoad(Number(load) * b.pct, 2.5), warmup: true, set_type: 'warmup' };
    });
  }

  function workingSetsOf(sets) {
    return (Array.isArray(sets) ? sets : []).filter(function (s) { return s && !isWarmupSet(s); });
  }

  // The load the ramp climbs to: the first working set's, or the row's.
  function firstWorkingLoad(row) {
    var working = workingSetsOf(row && row.sets);
    var s = working[0];
    var l = s ? (s.target_load != null ? s.target_load : s.load) : null;
    if (!(Number(l) > 0) && row && row.load != null) l = row.load;
    return Number(l) > 0 ? Number(l) : null;
  }

  // Rewrites the row's warm-ups from its working load. Without a load there
  // is nothing to climb to, and the row is left with its working sets only.
  function applyWarmupRamp(row) {
    if (!row) return row;
    var working = workingSetsOf(row.sets);
    var load = firstWorkingLoad(row);
    row.sets = (load ? warmupSetsFor(load) : []).concat(working);
    return row;
  }

  // Between warm-ups: half the prescribed rest, to the 5 s, never under 30.
  function warmupRestSeconds(prescribedSec) {
    var p = Number(prescribedSec) || 0;
    return Math.max(30, Math.round(p / 2 / 5) * 5);
  }

  /* ---------------- changing the exercises along the way ---------------- */
  //
  // A forty-week program run on the same eight exercises is not one program,
  // it is the same one five times. Rotating the assistance work spreads the
  // stimulus across a muscle's regions (Fonseca 2014; Kassiano 2022) and gives
  // the joints a break from one line of pull. The main lifts are a different
  // matter: swapping them costs strength (Baz-Valle 2019), so they are only
  // rotated when the athlete asks for it, and then only within their own
  // family - a low-bar squat becomes a box squat or a pause squat, never a
  // leg press - which is how a long block uses variations without losing the
  // lift it is built on.
  //
  // Nothing is ever invented: a replacement has to be an exercise the library
  // already describes, or the written one stays.

  function taxonomy() {
    return (root.NURVAN_EXERCISE_TAXONOMY && root.NURVAN_EXERCISE_TAXONOMY.EXERCISES) ? root.NURVAN_EXERCISE_TAXONOMY : null;
  }

  function foldName(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function taxonomyEntry(name) {
    var tax = taxonomy();
    if (!tax) return null;
    var want = foldName(name);
    if (!want) return null;
    var same = tax.SAME_AS && tax.SAME_AS[name];
    if (same) want = foldName(same);
    for (var i = 0; i < tax.EXERCISES.length; i++) {
      if (foldName(tax.EXERCISES[i].name) === want) return tax.EXERCISES[i];
    }
    return null;
  }

  function rotationBlockFor(week, rotateWeeks) {
    if (!Array.isArray(rotateWeeks) || !rotateWeeks.length) return 0;
    var block = 0;
    for (var i = 0; i < rotateWeeks.length; i++) {
      if (week >= Number(rotateWeeks[i])) block += 1;
    }
    return block;
  }

  function rotationCandidates(entry) {
    var tax = taxonomy();
    if (!tax || !entry) return [];
    var cap = Math.max(entry.level, 1);
    return tax.EXERCISES.filter(function (e) {
      if (e.name === entry.name) return false;
      if (e.pattern !== entry.pattern) return false;
      if (e.role !== entry.role) return false;
      if (e.level > cap) return false;
      // A main lift only ever becomes a variation of itself: same pattern,
      // same implement. That is what keeps "squat" a squat.
      if (entry.role === 'main' && e.equip !== entry.equip) return false;
      return true;
    }).sort(function (a, b) { return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0); });
  }

  function rotatedName(name, block, opts, used, isFinalBlockOfMeet) {
    if (!block) return name;
    var scope = opts.rotateScope === 'all' ? 'all' : 'accessories';
    var entry = taxonomyEntry(name);
    if (!entry) return name;
    if (entry.role === 'main') {
      if (scope !== 'all') return name;
      // The lift you are going to test is the lift you peak on.
      if (isFinalBlockOfMeet && competitionLiftFor(name)) return name;
    }
    var pool = rotationCandidates(entry);
    if (!pool.length) return name;
    for (var attempt = 0; attempt < pool.length; attempt++) {
      var pick = pool[(block - 1 + attempt) % pool.length];
      if (used.indexOf(pick.name) < 0) return pick.name;
    }
    return name;
  }

  function baseSetCount(ex) {
    if (Array.isArray(ex.sets) && ex.sets.length) return ex.sets.length;
    return Math.max(1, Number(ex.setCount) || 3);
  }

  function baseReps(ex) {
    if (ex.repsTarget) return String(ex.repsTarget);
    if (Array.isArray(ex.sets) && ex.sets[0] && ex.sets[0].reps != null) return String(ex.sets[0].reps);
    return '8-10';
  }

  function makeSets(count, reps, load, techniqueOnLast) {
    var out = [];
    for (var i = 0; i < count; i++) {
      var set = { reps: String(reps), target_load: load != null ? load : null };
      if (techniqueOnLast && i === count - 1) set.technique = techniqueOnLast;
      out.push(set);
    }
    return out;
  }

  // Techniques belong on accessories. A heavy barbell lift taken to failure
  // with a drop set is how people get hurt and how bars get missed.
  function techniqueAllowed(isCompetitionLift, opts) {
    if (opts.techniques === 'off') return false;
    return !isCompetitionLift;
  }

  /**
   * weeksFromTemplate(sessions, opts) -> array of week objects
   *
   * sessions: the week-1 sessions ([{ name, exercises: [...] }])
   * opts: {
   *   weeks, modelId, loadDisplay: 'kg'|'percent'|'rir',
   *   maxes: { squat: 140, ... }, bodyweight, techniques: 'model'|'off'
   * }
   */
  function weeksFromTemplate(sessions, opts) {
    opts = opts || {};
    var duration = clamp(Math.round(Number(opts.weeks) || 1), 1, 52);
    var model = modelById(opts.modelId);
    var out = [];
    for (var w = 1; w <= duration; w++) {
      var isDeload = !!model.deloadEvery && duration > model.deloadEvery && w % model.deloadEvery === 0 && w !== duration;
      var plan = (typeof model.week === 'function') ? model.week(w, duration) : null;
      var label = 'Settimana ' + w;
      if (model.family === 'powerlifting') label += w === duration ? ' · Gara / massimale' : (isDeload ? ' · Scarico' : '');
      else if (plan) label += isDeload ? ' · Deload' : (plan.phase ? ' · ' + plan.phase : '');

      var block = rotationBlockFor(w, opts.rotateWeeks);
      var lastBlock = rotationBlockFor(duration, opts.rotateWeeks);
      var finalBlockOfMeet = model.family === 'powerlifting' && block === lastBlock;
      if (block) label += ' · Esercizi ' + String.fromCharCode(65 + Math.min(25, block));
      // A test inside the program, not only at the end of it: the weeks after
      // it are meant to be rewritten on what was actually lifted.
      var isTestWeek = model.family === 'powerlifting' && w !== duration
        && Array.isArray(opts.testWeeks) && opts.testWeeks.map(Number).indexOf(w) >= 0;
      if (isTestWeek) label = 'Settimana ' + w + ' · Test massimali';

      out.push({
        week: w,
        weekNumber: w,
        week_number: w,
        label: label,
        phase: isTestWeek ? 'test' : (isDeload ? 'deload' : (plan && plan.phase) || (model.family === 'powerlifting' ? 'forza' : '')),
        rotation_block: block,
        test_week: !!isTestWeek,
        sessions: (sessions || []).map(function (session, si) {
          var used = [];
          return {
            name: session.name,
            title: session.title || session.name,
            exercises: (session.exercises || []).map(function (ex) {
              var written = ex.name || ex.exercise || '';
              var name = rotatedName(written, block, opts, used, finalBlockOfMeet);
              used.push(name);
              var source = (name === written) ? ex : Object.assign({}, ex, { name: name, name_original: ex.name_original || written, rotated_from: written });
              return progressExercise(source, {
                model: model, week: w, duration: duration, sessionIndex: si,
                isDeload: isDeload, isTestWeek: isTestWeek, plan: plan, opts: opts
              });
            })
          };
        })
      });
    }
    return out;
  }

  function progressExercise(ex, ctx) {
    var model = ctx.model;
    var opts = ctx.opts;
    var name = ex.name || ex.exercise || '';
    var liftId = model.family === 'powerlifting' ? competitionLiftFor(name) : null;
    var copy = JSON.parse(JSON.stringify(ex));

    if (model.id === 'none') return copy;
    // A circuit is a clock, not a prescription of sets: a progression has
    // nothing to add to it, and rewriting its rounds as "sets" would break it.
    if (copy.unit === 'circuit' || copy.circuit) return copy;

    if (liftId && typeof model.main === 'function') {
      var main = ctx.isTestWeek ? testWeek(1.0) : model.main(ctx.week, ctx.duration, ctx.sessionIndex);
      if (ctx.isTestWeek) main = Object.assign({}, main, { note: 'Test di metà programma: nuovo massimale' });
      var load = targetLoadFor(opts, liftId, main.pct);
      copy.sets = makeSets(main.sets, main.reps, load, null);
      copy.setCount = main.sets;
      copy.repsTarget = String(main.reps);
      copy.rest = main.attempt ? '5 min' : (main.pct >= 0.85 ? '4 min' : '3 min');
      if (main.rpe != null) copy.rirTarget = clamp(Math.round(10 - main.rpe), 0, 4);
      else copy.rirTarget = rirForPercent(main.pct, main.reps);
      copy.notes = [main.note, loadTextFor(opts, liftId, main.pct, main.reps)].filter(Boolean).join(' · ');
      copy.competition_lift = liftId;
      // Kept so the weeks after a mid-program test can be rewritten from the
      // max that was actually hit, rather than the one it was planned on.
      copy.target_pct = main.pct;
      if (load != null) copy.load = load;
      return copy;
    }

    var setsCount = baseSetCount(ex);
    var reps = baseReps(ex);
    var rir = ex.rirTarget != null ? Number(ex.rirTarget) : 2;
    var rest = ex.rest || '90s';
    var tempo = ex.tempo || '';
    var technique = null;
    var noteBits = [];

    if (model.family === 'powerlifting' && typeof model.accessory === 'function') {
      var acc = ctx.isTestWeek
        ? { volumeMul: 0.5, rirDelta: 2, technique: null, note: 'Settimana di test: accessori ridotti' }
        : model.accessory(ctx.week, ctx.duration);
      setsCount = Math.max(1, Math.round(setsCount * (acc.volumeMul != null ? acc.volumeMul : 1)));
      rir = clamp(rir + (acc.rirDelta || 0), 0, 5);
      technique = acc.technique || null;
      if (acc.note) noteBits.push(acc.note);
    } else if (ctx.plan) {
      var plan = ctx.plan;
      var mul = ctx.isDeload ? 0.6 : (plan.volumeMul != null ? plan.volumeMul : 1);
      setsCount = Math.max(1, Math.round(setsCount * mul));
      rir = clamp(rir + (ctx.isDeload ? 2 : (plan.rirDelta || 0)), 0, 5);
      if (plan.repsDelta) reps = bumpReps(reps, plan.repsDelta);
      if (plan.restDelta) rest = shiftRest(rest, ctx.isDeload ? 15 : plan.restDelta);
      if (plan.tempo) tempo = ctx.isDeload ? '2011' : plan.tempo;
      technique = ctx.isDeload ? null : (plan.technique || null);
      if (ctx.isDeload) noteBits.push('Deload: volume ridotto, RIR più alto');
      else if (plan.note) noteBits.push(plan.note);

      if (typeof model.session === 'function' && !ctx.isDeload) {
        var lane = model.session(ctx.sessionIndex);
        if (lane.repsOverride) reps = lane.repsOverride;
        if (lane.rir != null) rir = lane.rir;
        if (lane.rest != null) rest = lane.rest + 's';
        if (lane.tempo) tempo = lane.tempo;
        if (lane.setsDelta) setsCount = Math.max(1, setsCount + lane.setsDelta);
        if (lane.note) noteBits.push(lane.note);
      }
    }

    // A technique the athlete chose by hand outranks the model's: they asked
    // for it from week one, and a progression is not entitled to drop it.
    // A deload still clears it - that is what a deload is.
    if (ex.technique && !ctx.isDeload) technique = ex.technique;
    if (technique && !techniqueAllowed(false, opts)) technique = null;
    if (technique) noteBits.push('Ultima serie: ' + techniqueLabel(technique));
    if (ex.tempo && !tempo) tempo = ex.tempo;

    copy.sets = makeSets(setsCount, reps, null, technique);
    // A hold and a cardio block carry their number twice: in the text the
    // athlete reads and in the field the timer runs on. A progression that
    // changes one has to change the other, or week six asks for 45 seconds
    // and starts a 30-second clock.
    if (copy.unit === 'time' || copy.unit === 'cardio') {
      var amount = parseInt(String(reps).replace(/[^\d].*$/, ''), 10);
      if (amount > 0) {
        copy.sets.forEach(function (set) {
          if (copy.unit === 'time') set.seconds = amount;
          else set.minutes = amount;
        });
      }
    }
    copy.setCount = setsCount;
    copy.repsTarget = String(reps);
    copy.rirTarget = rir;
    copy.rest = String(rest);
    if (tempo) copy.tempo = tempo;
    copy.notes = noteBits.join(' · ');
    return copy;
  }

  function shiftRest(rest, delta) {
    var m = String(rest || '90s').match(/(\d+)/);
    if (!m) return rest;
    var base = parseInt(m[1], 10);
    if (/min/i.test(String(rest))) base = base * 60;
    var next = Math.max(30, base + delta);
    return next + 's';
  }

  var TECHNIQUE_LABELS = {
    drop_set: 'drop set', rest_pause: 'rest-pause', myo_reps: 'myo-reps',
    cluster: 'cluster', superset: 'superset', giant_set: 'giant set',
    pause_reps: 'pause reps', partials: 'parziali', negatives: 'eccentriche'
  };
  function techniqueLabel(id) { return TECHNIQUE_LABELS[id] || id; }

  /**
   * After a test inside the program: rewrite what is left of it on the maxes
   * that were actually hit.
   *
   * Only the weeks after the test are touched - what is already trained is
   * history - and only the competition lifts, whose percentage was written
   * down when the program was built. If the test came in low the athlete can
   * also ask for a set to come off the accessories, because a max that went
   * backwards usually means fatigue, not a lack of assistance work.
   */
  function recalibrateWeeks(weeks, opts) {
    opts = opts || {};
    var fromWeek = Number(opts.fromWeek) || 1;
    var maxes = opts.maxes || {};
    var display = opts.loadDisplay || 'percent';
    var out = { weeks: 0, lifts: 0, setsRemoved: 0 };
    (weeks || []).forEach(function (week, wi) {
      var number = Number(week.week || week.weekNumber || week.week_number || (wi + 1));
      if (number <= fromWeek) return;
      var touched = false;
      (week.sessions || week.days || []).forEach(function (session) {
        (session.exercises || session.rows || []).forEach(function (row) {
          if (row.competition_lift && row.target_pct != null && maxes[row.competition_lift] > 0) {
            var pct = Number(row.target_pct);
            var load = targetLoadFor({ loadDisplay: display, maxes: maxes, bodyweight: opts.bodyweight }, row.competition_lift, pct);
            (row.sets || []).forEach(function (s) { s.target_load = load; });
            if (load != null) row.load = load;
            var head = String(row.notes || '').split(' · ')[0];
            row.notes = [head, loadTextFor({ loadDisplay: display, maxes: maxes, bodyweight: opts.bodyweight }, row.competition_lift, pct, row.repsTarget)]
              .filter(Boolean).join(' · ');
            out.lifts += 1;
            touched = true;
          } else if (opts.trimAccessorySets && !row.competition_lift && Array.isArray(row.sets) && row.sets.length > 1) {
            row.sets.pop();
            row.setCount = row.sets.length;
            out.setsRemoved += 1;
            touched = true;
          }
        });
      });
      if (touched) out.weeks += 1;
    });
    return out;
  }

  // Which competition lifts a written week actually contains, so the builder
  // only asks for the maxes it will use.
  function competitionLiftsIn(sessions) {
    var found = [];
    (sessions || []).forEach(function (s) {
      (s.exercises || []).forEach(function (ex) {
        var id = competitionLiftFor(ex.name || ex.exercise || '');
        if (id && found.indexOf(id) < 0) found.push(id);
      });
    });
    return found;
  }

  function liftLabel(id) {
    for (var i = 0; i < COMP_LIFTS.length; i++) if (COMP_LIFTS[i].id === id) return COMP_LIFTS[i].label;
    return id;
  }

  root.NurvanProgressions = {
    list: function (family) { return listModels(family).map(publicModel); },
    get: function (id) { return publicModel(modelById(id)); },
    weeksFromTemplate: weeksFromTemplate,
    recalibrateWeeks: recalibrateWeeks,
    rotationBlockFor: rotationBlockFor,
    rotationOptionsFor: function (name) {
      var entry = taxonomyEntry(name);
      if (!entry) return { known: false, role: null, candidates: [] };
      return { known: true, role: entry.role, candidates: rotationCandidates(entry).map(function (e) { return e.name; }) };
    },
    parseRotationWeeks: function (raw, duration) {
      var max = clamp(Math.round(Number(duration) || 52), 1, 52);
      var seen = {};
      return String(raw || '').split(/[^\d]+/)
        .map(function (n) { return parseInt(n, 10); })
        .filter(function (n) {
          if (!(n >= 2 && n <= max)) return false;
          if (seen[n]) return false;
          seen[n] = true;
          return true;
        })
        .sort(function (a, b) { return a - b; });
    },
    competitionLiftFor: competitionLiftFor,
    competitionLiftsIn: competitionLiftsIn,
    liftLabel: liftLabel,
    rpeForPercent: rpeForPercent,
    rirForPercent: rirForPercent,
    isBodyweightLift: function (id) { return !!BODYWEIGHT_LIFTS[id]; },
    warmupRampFor: warmupRampFor,
    warmupSetsFor: warmupSetsFor,
    isWarmupSet: isWarmupSet,
    workingSetsOf: workingSetsOf,
    firstWorkingLoad: firstWorkingLoad,
    applyWarmupRamp: applyWarmupRamp,
    warmupRestSeconds: warmupRestSeconds
  };
})(typeof self !== 'undefined' ? self : this);
