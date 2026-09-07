/* Nurvan training encyclopedia — short practical cues. Does not change programs. */
(function (root) {
  function fold(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  const SCALES = [
    { id: 'rir', cat: 'scale', title: 'RIR — Reps in Reserve', body: 'Quante ripetizioni ti restano in canna a fine serie. RIR 3 = potevi farne ancora 3. RIR 2 è il margine da ipertrofia. RIR 1 è duro ma pulito. RIR 0 è cedimento: usalo poco, soprattutto sui multiarticolari.' },
    { id: 'rpe', cat: 'scale', title: 'RPE — Rate of Perceived Exertion', body: 'Scala 1–10 di fatica percepita. RPE 10 = nessuna rep in più (RIR 0). RPE 9 ≈ RIR 1. RPE 8 ≈ RIR 2. RPE 7 ≈ RIR 3. Se usi RPE, tieni lo stesso numero su tutte le serie di lavoro: non “indovinare” ogni volta.' },
    { id: 'rir-table', cat: 'scale', title: 'Tabella rapida RIR', body: 'RIR 4+: riscaldamento o tecnica. RIR 3: volume accumulo. RIR 2: serie efficaci. RIR 1: serie dure. RIR 0: solo isolation o ultima serie, tecnica ancora valida.' },
    { id: 'rpe-table', cat: 'scale', title: 'Tabella rapida RPE', body: 'RPE 6: facile, utile per pattern. RPE 7: lavoro. RPE 8: stimolo principale. RPE 9: pesante. RPE 10: limite. Se la tecnica crolla, il numero è già troppo alto.' }
  ];

  const TECHNIQUES = [
    { id: 'normale', cat: 'tecniche', title: 'Serie normale', body: 'Esecuzione pulita fino al RIR/RPE indicato, senza trucchi. È la base: impara prima questa, poi aggiungi intensità.' },
    { id: 'drop_set', cat: 'tecniche', title: 'Drop set / Stripping', body: 'Finisci la serie, togli subito carico (circa 20–30%) e continui senza pausa. 1–2 drop bastano. Ideale su isolation (curl, laterali, cavi), non su squat/stacco pesanti.' },
    { id: 'rest_pause', cat: 'tecniche', title: 'Rest-pause', body: 'Arrivi vicino al target, riposi 10–20 secondi, fai altre 2–4 reps. Ripeti 1–2 volte. Tanta fatica in poco tempo: tieni RIR 1 sulla prima parte.' },
    { id: 'myo_reps', cat: 'tecniche', title: 'Myo-reps', body: 'Serie di attivazione (es. 12–15 a RIR 2), poi mini-serie da 3–5 reps con 3–5 respiri. Stop quando perdi 1–2 reps o la tecnica. Ottimo su isolation, non su 1RM.' },
    { id: 'cluster', cat: 'tecniche', title: 'Cluster set', body: 'Spezzetti una serie pesante: es. 5×2 con 15–20 s tra i cluster invece di 5 reps di fila. Serve a tenere alta la qualità con carichi alti.' },
    { id: 'superset', cat: 'tecniche', title: 'Superset', body: 'Due esercizi in fila, poco o niente riposo. Agonista/antagonista (panca + rematore) è sostenibile. Stesso muscolo è più duro: riduci i kg.' },
    { id: 'giant_set', cat: 'tecniche', title: 'Giant set', body: 'Tre o più esercizi di fila sullo stesso distretto. Volume enorme, tecnica che cala in fretta. Usalo da finisher, non come lavoro pesante.' },
    { id: 'pause_reps', cat: 'tecniche', title: 'Pause reps', body: 'Fermi 1–3 s nel punto difficile (petto sulla panca, buca dello squat). Togli lo slancio. Di solito servono 5–10% di kg in meno.' },
    { id: 'forced_reps', cat: 'tecniche', title: 'Forced reps', body: 'Un partner ti aiuta a chiudere 1–3 reps oltre il cedimento. Solo se c’è spotter e la schiena/spalle restano sicure. Non è progresso, è overload extra.' },
    { id: 'negatives', cat: 'tecniche', title: 'Negatives / Eccentriche', body: 'Fase di discesa lenta (3–5 s) o con carico sopra il concentrico. Altissimo stress: 1–2 serie, non ogni settimana su tutto.' },
    { id: 'partials', cat: 'tecniche', title: 'Partial reps', body: 'Solo un tratto del ROM (lockout, metà, stretch). Utile come extra dopo serie complete, non al posto del movimento intero.' },
    { id: 'pre_exhaust', cat: 'tecniche', title: 'Pre-exhaust', body: 'Isolation prima del multiarticolare (croci poi panca). Il petto arriva già stanco: i kg sul composto scendono. Utile se i deltoidi rubano il lavoro.' },
    { id: 'pyramid', cat: 'tecniche', title: 'Pyramid', body: 'Aumenti i kg e scendi di reps: 12 → 10 → 8 → 6. Buona per scaldare e arrivare pesanti. Non fare tutte le piramidi a RIR 0.' },
    { id: 'reverse_pyramid', cat: 'tecniche', title: 'Reverse pyramid', body: 'Prima serie più pesante (dopo riscaldamento), poi togli kg e fai più reps. Molto faticosa: 2–4 serie totali bastano.' },
    { id: 'tempo_contrast', cat: 'tecniche', title: 'Tempo contrast', body: 'Alterni reps lente e reps esplosive nella stessa serie. Serve controllo + potenza. Conta il tempo (es. 3-1-1-0).' },
    { id: 'isometric', cat: 'tecniche', title: 'Isometria', body: 'Tieni una posizione (plank, pausa in buca, lockout) 10–30 s. Costruisce stabilità. Non sostituisce le serie dinamiche.' }
  ];

  const PROGRESSIONS = [
    { id: 'double', cat: 'progressioni', title: 'Doppia progressione', body: 'Prima chiudi tutte le reps dello schema a RIR richiesto. Poi alzi il carico. In Nurvan il salto standard è +2,5 kg. Se l’esercizio è già da pochi kg (laterali, curl, cavi leggeri), +1 kg.' },
    { id: 'linear', cat: 'progressioni', title: 'Progressione lineare', body: 'Ogni settimana aggiungi carico se la tecnica e il RIR restano. Funziona su principianti e su alzate con margine. Se manchi le reps, tieni i kg.' },
    { id: 'wave', cat: 'progressioni', title: 'Onda / wave', body: 'Settimane pesante–media–leggera, poi riparti un filo sopra. Utile quando il lineare si pianta. Non alzare nella settimana facile.' },
    { id: 'dup', cat: 'progressioni', title: 'DUP', body: 'Stesso esercizio, stimoli diversi nei giorni: forza (basse reps), ipertrofia (medie), potenza o volume. Non livellare tutto allo stesso RIR.' },
    { id: 'deload', cat: 'progressioni', title: 'Deload', body: 'Settimana più leggera: meno volume, intensità moderata, tecnica pulita. Serve a recuperare, non a “fare extra”. Poi riparti.' },
    { id: 'rir-load', cat: 'progressioni', title: 'Progressione a RIR', body: 'Se chiudi tutte le serie con RIR ≥ 2, la settimana dopo +2,5 kg (o +1 kg se i carichi sono bassi). Se RIR ≤ 0,5, ripeti i kg o +1 rep. Non usare salti da 1,25 kg: in palestra si viaggia su 2,5 kg.' },
    { id: 'rep', cat: 'progressioni', title: 'Progressione a reps', body: 'Tieni i kg e cerca +1 rep su ogni serie. Quando superi il range (es. 8–12), alza di 2,5 kg e torna in basso al range.' },
    { id: 'percent', cat: 'progressioni', title: 'Percentuali su 1RM', body: 'I kg arrivano da una percentuale del massimale (es. 75% × 5). Utile in forza. Se non hai un 1RM fresco, usa RIR, non inventare il massimale.' }
  ];

  const SPLITS = [
    { id: 'fullbody', cat: 'split', title: 'Full body', body: 'Ogni seduta tocchi tutto il corpo. 3 giorni/settimana è il classico. Frequenza alta, volume per muscolo medio. Ideale per chi ha poco tempo o sta imparando i pattern.' },
    { id: 'upper_lower', cat: 'split', title: 'Upper / Lower', body: 'Un giorno parte alta, un giorno parte bassa. 4 giorni: A-B-A-B. Buon compromesso frequenza/volume. Attenzione a non distruggere le spalle il giorno upper.' },
    { id: 'ppl', cat: 'split', title: 'Push Pull Legs', body: 'Spinta (petto, spalle, tricipiti), tirata (dorso, bicipiti), gambe. 6 giorni = ogni distretto 2 volte. 3 giorni = una volta. Recupera le spalle tra push e pull.' },
    { id: 'bro', cat: 'split', title: 'Distretto per giorno (bro split)', body: 'Un distretto al giorno, volume alto, frequenza 1×. Va bene se recuperi lento o ami sessioni lunghe. Meno adatto a chi si allena 3 volte a settimana.' },
    { id: 'phul', cat: 'split', title: 'PHUL', body: 'Power Hypertrophy Upper Lower: due giorni forza, due ipertrofia. Utile se vuoi sia kg che muscolo. Non copiare i kg del giorno power sul giorno hypertrophy.' },
    { id: 'torso_limbs', cat: 'split', title: 'Torso / Limbs', body: 'Torso (petto, dorso, spalle) e arti (gambe + braccia). Variante dell’upper/lower. Le braccia ricevono lavoro extra nel giorno limbs.' },
    { id: 'full_upper', cat: 'split', title: 'Full body + upper', body: 'Due full body e un upper, o simili. Serve quando le gambe recuperano più lento della parte alta.' },
    { id: 'coach', cat: 'split', title: 'Lo decide il coach', body: 'La scheda Nurvan del cliente segue lo split assegnato. Non cambiare da solo i giorni: chiedi al coach se vuoi più frequenza o meno volume.' }
  ];

  const MUSCLES = {
    PETTO: { title: 'Petto', how: 'Adduci le scapole e tieni il petto alto. Gomiti a circa 45–70° rispetto al busto. Controlla la discesa e spingi il carico lontano dallo sterno, senza far avanzare le spalle.', mistakes: 'Gomiti a 90° (sovraccarico della spalla), rimbalzo sul petto, piedi instabili, range di movimento incompleto.' },
    DORSALI: { title: 'Dorsali', how: 'Inizia abbassando le scapole, poi tira i gomiti verso i fianchi. Petto alto. Il lavoro deve arrivare dai dorsali, non solo dalla flessione del gomito.', mistakes: 'Strappare con la lombare, usare solo i bicipiti, spingere il collo in avanti, range di movimento corto.' },
    SCHIENA: { title: 'Schiena / catena posteriore', how: 'Mantieni la colonna in posizione neutra: curve naturali, senza flettere né aumentare la lordosi. Fletti le anche, tieni i dorsali attivi e il carico vicino al corpo. Espira nella fase di spinta.', mistakes: 'Flettere (arrotondare) la colonna sotto carico, tirare solo con le braccia, sguardo troppo basso, usare lo slancio.' },
    TRAPEZIO: { title: 'Trapezio', how: 'Eleva le spalle e portale leggermente indietro. Collo fermo. Pausa di 1 s in alto. Usa un carico che riesci a controllare, senza saltare.', mistakes: 'Ruotare le spalle in avanti, usare carichi da stacco sullo shrug, spingere il collo verso le orecchie.' },
    QUADRICIPITI: { title: 'Quadricipiti', how: 'Ginocchia in linea con le punte dei piedi, talloni a terra, busto inclinato quanto serve ma petto aperto. Scendi almeno al parallelo se la mobilità lo permette.', mistakes: 'Ginocchia che collassano in dentro (valgismo), salire sulle punte, dimezzare lo squat per alzare il carico.' },
    FEMORALI: { title: 'Femorali', how: 'Fletti le anche tenendo le tibie quasi verticali: senti l’allungamento dietro la coscia. Nello hinge il ginocchio non è il motore principale.', mistakes: 'Piegare troppo le ginocchia (diventa uno squat), arrotondare la schiena, rimbalzare nel punto basso.' },
    GLUTEI: { title: 'Glutei', how: 'Estendi il bacino in alto/avanti, costato chiuso, senza aumentare la lordosi lombare. Contrai 1 s in alto.', mistakes: 'Iperlordosi lombare, far lavorare soprattutto i quadricipiti, estensione incompleta.' },
    GAMBE: { title: 'Gambe (adduttori / generale)', how: 'Controlla il ginocchio, niente strappi. Devi sentire il muscolo bersaglio, non un dolore articolare.' },
    POLPACCI: { title: 'Polpacci', how: 'Range completo: allungamento in basso, pausa in alto. Ginocchio morbido ma stabile. 10–20 ripetizioni vanno bene; i kg devono comunque salire nel tempo.' },
    SPALLE: { title: 'Spalle', how: 'Scapole basse e stabili. Laterali: mignolo leggermente più alto del pollice, busto fermo. Distensione: polsi sopra i gomiti; evita il passaggio dietro la testa se dà dolore.' },
    BICIPITI: { title: 'Bicipiti', how: 'Gomiti fermi, scapole basse, busto stabile. Contrai in alto. Se serve slanciare, il carico è eccessivo.' },
    TRICIPITI: { title: 'Tricipiti', how: 'Gomiti vicini al tronco o fissi sopra la testa, a seconda della variante. Estendi senza aprire i gomiti verso l’esterno. Le spalle non devono partire prima del tricipite.' },
    ADDOME: { title: 'Addome', how: 'Lieve retroversione del bacino, costato chiuso, espira nello sforzo. Poche ripetizioni pulite valgono più di tanti crunch veloci.' },
    CORE: { title: 'Core', how: 'Resisti alla rotazione o alla flessione del tronco. Spalle lontane dalle orecchie; in piedi, tieni anche i glutei attivi.' },
    BRACCIA: { title: 'Avambracci / braccia', how: 'Polso in posizione neutra, movimento piccolo e controllato. Non strappare.' }
  };

  const EXERCISES = [
    { name: 'Panca piana bilanciere', muscle: 'PETTO', how: 'Scapole addotte, piedi fissi, barra in appoggio sugli avambracci. Tocca il petto in controllo e spingi su una linea leggermente verso i piedi.', cue: 'Spingi la barra verso l’esterno e fissa i piedi a terra.' },
    { name: 'Panca piana manubri', muscle: 'PETTO', how: 'Stesso assetto della panca. I manubri scendono a lato del petto, non verso il viso. Ruota poco i palmi se le spalle lo richiedono.' },
    { name: 'Panca inclinata bilanciere', muscle: 'PETTO', how: 'Inclinazione 15–30°. Se è troppo verticale diventa una distensione per le spalle. Gomiti sotto i 90° rispetto al busto.' },
    { name: 'Croci panca piana', muscle: 'PETTO', how: 'Gomito leggermente flesso e fisso. Allunga il petto, non i tessuti della spalla. Fermati dove senti stiramento, non dolore.' },
    { name: 'Croci ai cavi', muscle: 'PETTO', how: 'Appoggio stabile, petto alto. Avvicina le mani in avanti senza far avanzare le spalle.' },
    { name: 'Dips parallele', muscle: 'PETTO', how: 'Busto leggermente inclinato in avanti per il petto. Gomiti non a 90° all’indietro. Scendi finché le spalle restano comode.' },
    { name: 'Push-up', muscle: 'PETTO', how: 'Corpo in linea, mani sotto le spalle, petto verso il pavimento. Se il bacino cede, appoggia le ginocchia o alza le mani.' },
    { name: 'Trazioni presa prona', muscle: 'DORSALI', how: 'Abbassa le scapole, petto verso la sbarra, mento sopra senza iperestendere il collo. Se non chiudi la ripetizione, usa lat machine o elastico.' },
    { name: 'Trazioni presa supina', muscle: 'DORSALI', how: 'Maggiore coinvolgimento del bicipite. Stesso abbassamento delle scapole. Evita di dondolare.' },
    { name: 'Lat machine avanti', muscle: 'DORSALI', how: 'Tira la sbarra al petto alto, gomiti in basso e leggermente indietro. Non portare la sbarra dietro la nuca.' },
    { name: 'Pulley basso', muscle: 'DORSALI', how: 'Petto alto, tira verso l’ombelico. Non aumentare la lordosi lombare a fine corsa.' },
    { name: 'Rematore bilanciere', muscle: 'DORSALI', how: 'Busto inclinato 30–45°, barra vicina a tibie e cosce, tira verso l’anca. Colonna stabile in posizione neutra.' },
    { name: 'Rematore manubrio', muscle: 'DORSALI', how: 'Mano e ginocchio sul supporto, colonna in posizione neutra. Gomito rasente al fianco: non elevare la spalla verso l’orecchio.' },
    { name: 'Face pull', muscle: 'DORSALI', how: 'Cavo alto, tira verso il viso aprendo i gomiti. Rotazione esterna a fine corsa. Carico da controllo, non da stacco.' },
    { name: 'Squat bilanciere', muscle: 'QUADRICIPITI', how: 'Inspira, addome contratto, scendi tra le anche. Ginocchia in linea con i piedi. Risali spingendo il pavimento, senza lanciare il petto in avanti.' },
    { name: 'Squat frontale', muscle: 'QUADRICIPITI', how: 'Gomiti alti, busto verticale. Se i gomiti scendono, perdi il carico. Prima la mobilità di polso e spalla, poi i kg.' },
    { name: 'Hack squat', muscle: 'QUADRICIPITI', how: 'Schiena ben aderente al supporto, piedi leggermente avanti. Non rimbalzare nel punto basso.' },
    { name: 'Leg press', muscle: 'QUADRICIPITI', how: 'Lombare a contatto con lo schienale. Non chiudere le ginocchia a zero. Piedi alti: più gluteo e femorale; piedi bassi: più quadricipite.' },
    { name: 'Affondo bulgaro', muscle: 'QUADRICIPITI', how: 'Busto eretto, ginocchio anteriore stabile. Il piede posteriore è solo un appoggio, non deve spingere.' },
    { name: 'Leg extension', muscle: 'QUADRICIPITI', how: 'Schiena ferma, estendi senza slanciare. Utile a RIR alto o come finisher.' },
    { name: 'Stacco da terra', muscle: 'SCHIENA', how: 'Barra a contatto con le tibie, dorsali attivi, piedi ben piantati. Spingi il pavimento e poi estendi le anche. Non sollevare flettendo la schiena.' },
    { name: 'Stacco rumeno', muscle: 'FEMORALI', how: 'Ginocchia morbide e fisse, bacino indietro, barra vicina alle cosce. Allungamento sui femorali, non sulla lombare.' },
    { name: 'Leg curl sdraiato', muscle: 'FEMORALI', how: 'Bacino aderente al poggiatesta, tira i talloni verso i glutei senza sollevare il bacino.' },
    { name: 'Hip thrust', muscle: 'GLUTEI', how: 'Sguardo avanti, costato chiuso. Estendi il bacino fino ad allineare spalle, bacino e ginocchia. Pausa in alto.' },
    { name: 'Military press', muscle: 'SPALLE', how: 'Glutei e addome contratti. Porta la testa leggermente indietro e poi in avanti quando la barra passa, così il percorso resta verticale. Non aumentare la lordosi lombare.' },
    { name: 'Shoulder press manubri', muscle: 'SPALLE', how: 'Polsi sopra i gomiti, percorso verticale. Non far scontrare i manubri in alto se perdi tensione.' },
    { name: 'Alzate laterali', muscle: 'SPALLE', how: 'Gomito allineato al polso, braccio 20–30° davanti al busto. Niente slancio. Qui i salti sono da +1 kg, non da 2,5.' },
    { name: 'Alzate posteriori', muscle: 'SPALLE', how: 'Fletti le anche, porta i manubri in fuori con i gomiti, non con le mani. Carico che permette di isolare i deltoidi posteriori.' },
    { name: 'Curl bilanciere', muscle: 'BICIPITI', how: 'Gomiti al fianco, scapole basse. Se il busto oscilla, riduci il carico.' },
    { name: 'Curl martello', muscle: 'BICIPITI', how: 'Presa neutra, stesso controllo. Coinvolge anche brachiale e avambraccio.' },
    { name: 'French press', muscle: 'TRICIPITI', how: 'Gomiti fissi; la barra va verso la fronte o la nuca a seconda della variante. Non aprire i gomiti verso l’esterno.' },
    { name: 'Pushdown cavo', muscle: 'TRICIPITI', how: 'Gomiti vicini al tronco, estendi fino in fondo, torna senza far volare il peso.' },
    { name: 'Crunch', muscle: 'ADDOME', how: 'Fletti il tronco portando il petto verso il bacino; la lombare resta in appoggio. Non tirare il collo con le mani.' },
    { name: 'Plank', muscle: 'ADDOME', how: 'Corpo in linea: bacino né cadente né troppo alto. Respira. Meglio 20–40 s puliti che tenute lunghe e molli.' },
    { name: 'Calf raise in piedi', muscle: 'POLPACCI', how: 'Allungamento in basso, spinta sulla punta in alto, pausa. Ginocchio morbido.' }
  ];

  function catalogItems() {
    try {
      const list = (root.WEB_EXERCISE_CATALOG || (typeof self !== 'undefined' && self.WEB_EXERCISE_CATALOG) || []);
      return Array.isArray(list) ? list : [];
    } catch (_) { return []; }
  }

  function muscleGuide(muscle) {
    return MUSCLES[String(muscle || '').toUpperCase()] || null;
  }

  function matchScore(query, item) {
    const q = fold(query);
    if (!q) return 0;
    const name = fold(item.name || item.title);
    const en = fold(item.en || '');
    const aliases = (item.aliases || []).map(fold);
    if (name === q || en === q) return 100;
    if (name.indexOf(q) >= 0 || q.indexOf(name) >= 0) return 80;
    if (en && (en.indexOf(q) >= 0 || q.indexOf(en) >= 0)) return 75;
    for (let i = 0; i < aliases.length; i++) {
      if (aliases[i] && (aliases[i] === q || aliases[i].indexOf(q) >= 0 || q.indexOf(aliases[i]) >= 0)) return 70;
    }
    const tokens = q.split(' ').filter(function (t) { return t.length > 2; });
    let hit = 0;
    tokens.forEach(function (t) {
      if (name.indexOf(t) >= 0 || en.indexOf(t) >= 0) hit += 1;
    });
    return hit ? 40 + hit * 8 : 0;
  }

  let EXTRA_EXERCISES = [];
  function setExtraExercises(list) {
    EXTRA_EXERCISES = Array.isArray(list) ? list.map(function (e) {
      return {
        name: String(e.name || e.title || '').trim(),
        muscle: String(e.muscle || '').trim(),
        how: String(e.how || e.body || '').trim(),
        mistakes: String(e.mistakes || '').trim(),
        cue: String(e.cue || '').trim(),
        aliases: Array.isArray(e.aliases) ? e.aliases : []
      };
    }).filter(function (e) { return e.name; }) : [];
  }
  function extraItems() { return EXTRA_EXERCISES; }

  function explainExercise(name) {
    const raw = String(name || '').trim();
    if (!raw) return null;
    let best = null;
    let bestScore = 0;
    EXTRA_EXERCISES.concat(EXERCISES, catalogItems()).forEach(function (item) {
      const s = matchScore(raw, item);
      if (s > bestScore) { bestScore = s; best = item; }
    });
    const extraHit = best && EXTRA_EXERCISES.some(function (e) { return fold(e.name) === fold(best.name); });
    if (extraHit && bestScore >= 50) {
      return {
        kind: 'exercise',
        title: best.name,
        muscle: best.muscle || '',
        body: best.how || '',
        mistakes: best.mistakes || '',
        cue: best.cue || '',
        matched: true,
        custom: true
      };
    }
    if (!best || bestScore < 40) {
      return {
        kind: 'exercise',
        title: raw,
        muscle: '',
        body: 'Esercizio della scheda. Tieni tecnica pulita, ROM completo, RIR indicato. Se non sei sicuro dell’esecuzione, usa questa guida o chiedi al coach. Non cambiare i kg della scheda a caso: +2,5 kg quando chiudi le serie con RIR ≥ 2 (+1 kg se i carichi sono già bassi).',
        cue: 'Qualità prima dei kg.',
        matched: false
      };
    }
    const mg = muscleGuide(best.muscle);
    const specific = EXERCISES.filter(function (e) { return fold(e.name) === fold(best.name); })[0];
    const how = (specific && specific.how) || (best.how) || (mg && mg.how) || '';
    const mistakes = (specific && specific.mistakes) || (best.mistakes) || (mg && mg.mistakes) || '';
    const cue = (specific && specific.cue) || (best.cue) || (mg && mg.cue) || '';
    return {
      kind: 'exercise',
      title: best.name || raw,
      muscle: best.muscle || '',
      eq: best.eq || '',
      body: how,
      mistakes: mistakes,
      cue: cue,
      matched: true,
      score: bestScore
    };
  }

  function allEntries() {
    const extras = EXTRA_EXERCISES.map(function (item) {
      return {
        id: 'ex-custom-' + fold(item.name).replace(/\s+/g, '-'),
        cat: 'esercizi',
        muscle: item.muscle || '',
        title: item.name,
        body: item.how || '',
        extra: { body: item.how, mistakes: item.mistakes, cue: item.cue },
        custom: true
      };
    });
    const exFromCatalog = catalogItems().map(function (item) {
      const explained = explainExercise(item.name);
      return {
        id: 'ex-' + fold(item.name).replace(/\s+/g, '-'),
        cat: 'esercizi',
        muscle: item.muscle || '',
        title: item.name,
        en: item.en || '',
        body: (explained && explained.body) || '',
        extra: explained
      };
    });
    return SCALES.concat(TECHNIQUES, PROGRESSIONS, SPLITS, extras, exFromCatalog);
  }

  function searchKnowledge(query) {
    const q = fold(query);
    const all = allEntries();
    if (!q) return all;
    return all.map(function (item) {
      const blob = fold([item.title, item.en, item.body, item.muscle, item.cat].join(' '));
      let score = 0;
      if (fold(item.title) === q) score = 100;
      else if (blob.indexOf(q) >= 0) score = 70;
      else {
        q.split(' ').forEach(function (t) { if (t.length > 2 && blob.indexOf(t) >= 0) score += 12; });
      }
      return { item: item, score: score };
    }).filter(function (x) { return x.score > 0; }).sort(function (a, b) { return b.score - a.score; }).map(function (x) { return x.item; });
  }

  function lookupAny(query) {
    const q = fold(query);
    if (!q) return null;
    const buckets = [
      { list: SCALES, kind: 'scale' },
      { list: TECHNIQUES, kind: 'technique' },
      { list: PROGRESSIONS, kind: 'progression' },
      { list: SPLITS, kind: 'split' }
    ];
    let best = null;
    let bestScore = 0;
    buckets.forEach(function (b) {
      b.list.forEach(function (item) {
        const s = matchScore(q, { name: item.title, aliases: [item.id] });
        if (s > bestScore) {
          bestScore = s;
          best = { kind: b.kind, title: item.title, body: item.body, id: item.id, cat: item.cat };
        }
      });
    });
    if (best && bestScore >= 50) return best;
    return explainExercise(query);
  }

  root.NURVAN_TRAINING_KNOWLEDGE = {
    SCALES: SCALES,
    TECHNIQUES: TECHNIQUES,
    PROGRESSIONS: PROGRESSIONS,
    SPLITS: SPLITS,
    MUSCLES: MUSCLES,
    EXERCISES: EXERCISES,
    fold: fold,
    muscleGuide: muscleGuide,
    explainExercise: explainExercise,
    searchKnowledge: searchKnowledge,
    lookupAny: lookupAny,
    allEntries: allEntries,
    setExtraExercises: setExtraExercises,
    extraItems: extraItems
  };
  root.explainExercise = explainExercise;
  root.searchTrainingKnowledge = searchKnowledge;
  root.lookupTrainingKnowledge = lookupAny;
})(typeof window !== 'undefined' ? window : self);
