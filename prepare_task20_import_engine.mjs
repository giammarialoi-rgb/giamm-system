function getExtName(filename) {
  if (!filename) return "";
  const idx = filename.lastIndexOf(".");
  return idx !== -1 ? filename.slice(idx).toLowerCase() : "";
}

/**
 * GIAMMARIA SYSTEM — UNIVERSAL IMPORT ENGINE 3.0 (Master Task 22 & 25)
 * Robust Multi-Layout Semantic Extraction Matrix, Domain Extractors for Training,
 * Nutrition (Vertical + Horizontal Multi-Day Matrix), Supplementation, Therapy,
 * Clinical Exams, Text/DOC/DOCX parsers & Unrecognised Elements Diagnostics.
 */








// ====================================================
// 1. EXERCISE NORMALIZATION DICTIONARY & HELPERS
// ====================================================
var EXERCISE_DICTIONARY = [
  { keywords: ["panca piana con bilanciere", "panca piana bilanciere", "panca piana", "bench press", "barbell bench press", "flat bench press"], normalized: "Panca Piana con Bilanciere", muscle: "PETTO", muscles: ["PETTO", "TRICIPITI", "DELTOIDI"] },
  { keywords: ["croci ai cavi su panca inclinata", "croci ai cavi su panca", "croci ai cavi", "croci manubri", "croci su panca", "dumbbell flyes", "cable fly", "pec fly", "pec deck"], normalized: "Croci ai Cavi", muscle: "PETTO", muscles: ["PETTO"] },
  { keywords: ["panca inclinata 30° manubri", "panca inclinata manubri", "panca inclinata 30", "panca inclinata bilanciere", "panca inclinata", "incline bench press", "panca alta con manubri", "panca alta manubri"], normalized: "Panca Inclinata con Manubri", muscle: "PETTO", muscles: ["PETTO", "DELTOIDI", "TRICIPITI"] },
  { keywords: ["chest press", "spinta inclinata convergente", "chest press convergente", "chest press orizzontale", "chest press leggermente inclinata", "chest press inclinata"], normalized: "Chest Press Convergente", muscle: "PETTO", muscles: ["PETTO", "DELTOIDI", "TRICIPITI"] },
  { keywords: ["squat con bilanciere", "squat bilanciere", "back squat", "barbell squat", "high bar squat", "low bar squat", "box squat alto high-bar", "box squat alto", "box squat", "squat bilanciere high-bar"], normalized: "Squat con Bilanciere", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "GLUTEI", "CORE"] },
  { keywords: ["front squat", "squat frontale"], normalized: "Front Squat con Bilanciere", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "CORE"] },
  { keywords: ["leg press 45°", "leg press 45", "leg press", "pressa 45", "pressa", "leg press unilaterale", "leg press bilaterale", "leg press singola"], normalized: "Leg Press 45°", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "GLUTEI"] },
  { keywords: ["leg extension", "leg extension unilaterale", "leg extension bilaterale"], normalized: "Leg Extension", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI"] },
  { keywords: ["affondi camminati", "affondi con manubri", "affondi manubri", "walking lunges", "affondi"], normalized: "Affondi Camminati con Manubri", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "GLUTEI"] },
  { keywords: ["stacco da terra rumeno", "stacco rumeno", "romanian deadlift", "rdl", "stacco a gambe tese", "stacco a gambe semitese", "rdl manubri", "stacco rumeno manubri"], normalized: "Stacco Rumeno con Bilanciere", muscle: "FEMORALI", muscles: ["FEMORALI", "GLUTEI", "SCHIENA"] },
  { keywords: ["stacco da terra", "deadlift", "barbell deadlift", "stacco convenzionale", "stacco sumo"], normalized: "Stacco da Terra con Bilanciere", muscle: "SCHIENA", muscles: ["SCHIENA", "FEMORALI", "GLUTEI", "CORE"] },
  { keywords: ["leg curl", "lying leg curl", "seated leg curl", "leg curl seduto", "leg curl sdraiato", "leg curl unilaterale", "leg curl bilaterale", "leg curl singola"], normalized: "Leg Curl Sdraiato", muscle: "FEMORALI", muscles: ["FEMORALI"] },
  { keywords: ["hip thrust", "hip thrust bilanciere", "glute bridge", "ponte glutei"], normalized: "Hip Thrust con Bilanciere", muscle: "GLUTEI", muscles: ["GLUTEI", "FEMORALI"] },
  { keywords: ["trazioni alla sbarra", "trazioni", "pull up", "pull-ups", "chin up", "chin-ups", "trazioni prone", "trazioni neutre", "trazioni presa neutra"], normalized: "Trazioni alla Sbarra", muscle: "DORSALI", muscles: ["DORSALI", "BICIPITI"] },
  { keywords: ["pulldown al cavo", "pulldown braccia tese", "pulldown", "straight arm pulldown"], normalized: "Pulldown al Cavo Braccia Tese", muscle: "DORSALI", muscles: ["DORSALI"] },
  { keywords: ["lat machine presa larga", "lat machine presa neutra", "lat machine", "lat machine presa diversa", "lat pulldown", "lat machine avanti"], normalized: "Lat Machine Presa Larga", muscle: "DORSALI", muscles: ["DORSALI", "BICIPITI"] },
  { keywords: ["rematore con bilanciere", "rematore bilanciere", "barbell row", "bent over row"], normalized: "Rematore con Bilanciere", muscle: "DORSALI", muscles: ["DORSALI", "SCHIENA", "BICIPITI"] },
  { keywords: ["rematore con manubrio", "rematore manubrio", "dumbbell row", "single arm dumbbell row", "dorsey machine monopodalica", "dorsey machine", "low row 1 braccio"], normalized: "Rematore con Manubrio", muscle: "DORSALI", muscles: ["DORSALI", "BICIPITI"] },
  { keywords: ["pulley", "pulley basso", "pulley basso presa larga", "seated cable row"], normalized: "Pulley Basso", muscle: "DORSALI", muscles: ["DORSALI", "SCHIENA"] },
  { keywords: ["lento avanti con manubri", "shoulder press manubri", "dumbbell shoulder press", "military press manubri"], normalized: "Lento Avanti con Manubri", muscle: "DELTOIDI", muscles: ["DELTOIDI", "TRICIPITI"] },
  { keywords: ["military press", "lento avanti", "overhead press", "ohp", "shoulder press", "shoulder press convergente"], normalized: "Military Press con Bilanciere", muscle: "DELTOIDI", muscles: ["DELTOIDI", "TRICIPITI"] },
  { keywords: ["alzate laterali", "lateral raises", "side lateral raise", "alzate laterali cavo singolo", "alzate laterali manubri", "alzate laterali cavi"], normalized: "Alzate Laterali con Manubri", muscle: "DELTOIDI", muscles: ["DELTOIDI"] },
  { keywords: ["alzate posteriori", "rear delt fly", "croci inverse", "face pull", "rear delt machine"], normalized: "Face Pull al Cavo", muscle: "DELTOIDI", muscles: ["DELTOIDI", "SCHIENA"] },
  { keywords: ["curl con bilanciere", "barbell curl", "bicep curl", "curl bilanciere", "curl bilanciere ez", "curl bilanciere sagomato", "curl singolo al cavo", "curl singolo cavo"], normalized: "Curl con Bilanciere", muscle: "BICIPITI", muscles: ["BICIPITI"] },
  { keywords: ["curl con manubri", "dumbbell curl", "curl alternato"], normalized: "Curl Alternato con Manubri", muscle: "BICIPITI", muscles: ["BICIPITI"] },
  { keywords: ["hammer curl", "curl a martello"], normalized: "Hammer Curl con Manubri", muscle: "BICIPITI", muscles: ["BICIPITI", "AVAMBRACCI"] },
  { keywords: ["pushdown corda", "pushdown", "pushdown ai cavi", "triceps pushdown", "corda tricipiti", "push down con corda"], normalized: "Pushdown ai Cavi con Corda", muscle: "TRICIPITI", muscles: ["TRICIPITI"] },
  { keywords: ["french press", "skull crusher", "estensioni tricipiti", "french press con bilanciere"], normalized: "French Press con Bilanciere EZ", muscle: "TRICIPITI", muscles: ["TRICIPITI"] },
  { keywords: ["dip alle parallele", "dip", "dips", "parallele"], normalized: "Dip alle Parallele", muscle: "PETTO", muscles: ["PETTO", "TRICIPITI", "DELTOIDI"] },
  { keywords: ["calf raise", "calf in piedi", "calf seduto", "calves", "calf raise smith in piedi", "smith calf raise in piedi", "calf smith", "calf machine in piedi", "calf machine"], normalized: "Calf Raise in Piedi", muscle: "POLPACCI", muscles: ["POLPACCI"] },
  { keywords: ["crunch ai cavi", "cable crunch", "cable crunch inginocchiato", "crunch"], normalized: "Crunch ai Cavi", muscle: "CORE", muscles: ["CORE"] },
  { keywords: ["plank", "ab roller", "leg raise", "hanging leg raise", "addominali"], normalized: "Plank Addominale", muscle: "CORE", muscles: ["CORE"] },
  { keywords: ["adductor", "adductor machine", "adduttori"], normalized: "Adductor Machine", muscle: "GAMBE", muscles: ["GAMBE", "ADDUTTORI"] },
  { keywords: ["abductor", "abductor machine", "abduttori"], normalized: "Abductor Machine", muscle: "GLUTEI", muscles: ["GLUTEI", "ABDUTTORI"] },
  { keywords: ["pullover", "pullover ai cavi"], normalized: "Pullover ai Cavi", muscle: "DORSALI", muscles: ["DORSALI", "PETTO"] }
];

function normalizeExerciseName(rawName) {
  if (!rawName) return { name_original: "Esercizio", name_normalized: "Esercizio", muscle: "TOTAL", muscles: ["TOTAL"], confidence: 0.5 };
  const cleaned = String(rawName).trim().replace(/^\d+[.\s\-)]+/, "").trim();
  const lower = cleaned.toLowerCase();

  // Longest-keyword-first: prevents "panca inclinata" matching before "croci ai cavi su panca inclinata"
  let best = null;
  let bestLen = 0;
  for (const entry of EXERCISE_DICTIONARY) {
    for (const kw of entry.keywords) {
      if (kw.length > bestLen && lower.includes(kw)) {
        best = entry;
        bestLen = kw.length;
      }
    }
  }
  if (best) {
    return {
      name_original: cleaned,
      name_normalized: best.normalized,
      muscle: best.muscle,
      muscles: best.muscles,
      confidence: 0.95
    };
  }

  return {
    name_original: cleaned,
    name_normalized: cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
    muscle: "TOTAL",
    muscles: ["TOTAL"],
    confidence: 0.6
  };
}

/**
 * Detect therapy days from schedule fields only (never free-text notes).
 * Uses word-boundary tokens so "MON" does not match inside "MONITORARE".
 * Blank day fields → all 7 days ("Tutti i giorni") — never invent a single weekday.
 */
function detectTherapyDaysOfWeek({ daysRaw = "", timing = "", frequency = "", notes = "" } = {}) {
  const ALL_DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
  // Schedule sources only — notes are excluded to avoid false positives (e.g. Monitorare → MON)
  const scheduleText = [daysRaw, timing, frequency].filter(Boolean).join(" ").toUpperCase();

  const dayPatterns = [
    { day: "Lunedì", re: /\bLUNED[IÌ]?\b|\bMON(?:DAY)?\b/ },
    { day: "Martedì", re: /\bMARTED[IÌ]?\b|\bTUE(?:S(?:DAY)?)?\b/ },
    { day: "Mercoledì", re: /\bMERCOLED[IÌ]?\b|\bWED(?:NESDAY)?\b/ },
    { day: "Giovedì", re: /\bGIOVED[IÌ]?\b|\bTHU(?:RS(?:DAY)?)?\b/ },
    { day: "Venerdì", re: /\bVENERD[IÌ]?\b|\bFRI(?:DAY)?\b/ },
    { day: "Sabato", re: /\bSABATO\b|\bSAT(?:URDAY)?\b/ },
    { day: "Domenica", re: /\bDOMENICA\b|\bSUN(?:DAY)?\b/ }
  ];

  const daysDetected = [];
  for (const { day, re } of dayPatterns) {
    if (re.test(scheduleText)) daysDetected.push(day);
  }

  const everyDayHint = /\bTUTTI\s+I\s+GIORNI\b|\bQUOTIDIAN[OA]?\b|\bEVERY\s+DAY\b|\bDAILY\b|\b7\s*\/\s*7\b/.test(scheduleText);
  const dayOnHint = /\bDAY\s*ON\b/.test(scheduleText);

  let dayOfWeek;
  let freqLabel;
  let daysSource;

  if (daysDetected.length > 0 && daysDetected.length < 7 && !everyDayHint) {
    dayOfWeek = daysDetected;
    freqLabel = daysDetected.join(", ");
    daysSource = "explicit_schedule";
  } else if (dayOnHint) {
    dayOfWeek = [...ALL_DAYS];
    freqLabel = "Day ON";
    daysSource = "day_on";
  } else {
    dayOfWeek = [...ALL_DAYS];
    freqLabel = "Tutti i giorni";
    daysSource = daysDetected.length === 7 || everyDayHint ? "explicit_daily" : "default_daily";
  }

  return { dayOfWeek, frequency: freqLabel, daysSource, notes: notes || null };
}

// Expands pattern strings like 4*10, 4*25-20-15-10, 4*EXHAUST, 4*24 PASSI, 4*21'S, DROP SET into full structured sets
function expandPatternToSets(patternStr, baseRest = 90, baseNotes = null, rir = 2, rpe = 8, loadVal = null) {
  const str = String(patternStr || "").trim();
  const sets = [];
  
  // Pattern 1: Multi-Reps (e.g. 4*25-20-15-10 or 4x25-20-15-10)
  const multiRepMatch = str.match(/^(\d+)\s*[\*xX\u00d7]\s*(\d+[\-\/\u2013]\d+[\-\/\u2013]\d+(?:[\-\/\u2013]\d+)*)/i);
  if (multiRepMatch) {
    const setCount = parseInt(multiRepMatch[1], 10);
    const repsArr = multiRepMatch[2].split(/[\-\/\u2013]/).map(r => r.trim());
    for (let s = 1; s <= setCount; s++) {
      sets.push({
        set_number: s,
        set_type: "working",
        target_load: loadVal || null,
        target_reps: repsArr[s - 1] || repsArr[repsArr.length - 1],
        target_rir: rir,
        target_rpe: rpe,
        percentage_1rm: null,
        rest_seconds: baseRest,
        notes: baseNotes
      });
    }
    return { setCount, reps: multiRepMatch[2], sets };
  }

  // Pattern 2: Standard or Special String (e.g. 4*10, 3*15, 4*EXHAUST, 4*24 PASSI, 4*21'S)
  const stdMatch = str.match(/^(\d+)\s*[\*xX\u00d7]\s*(.+)$/i);
  if (stdMatch) {
    const setCount = parseInt(stdMatch[1], 10);
    const repSpec = stdMatch[2].trim();
    for (let s = 1; s <= setCount; s++) {
      let setType = "working";
      if (baseNotes && baseNotes.toUpperCase().includes("DROP SET") && s === setCount) {
        setType = "dropset";
      } else if (baseNotes && baseNotes.toUpperCase().includes("TOP SET") && s === 1) {
        setType = "topset";
      } else if (baseNotes && baseNotes.toUpperCase().includes("BACK-OFF") && s > 1) {
        setType = "backoff";
      }
      sets.push({
        set_number: s,
        set_type: setType,
        target_load: loadVal || null,
        target_reps: repSpec,
        target_rir: rir,
        target_rpe: rpe,
        percentage_1rm: null,
        rest_seconds: baseRest,
        notes: baseNotes
      });
    }
    return { setCount, reps: repSpec, sets };
  }

  // Fallback single set
  sets.push({
    set_number: 1,
    set_type: "working",
    target_load: loadVal || null,
    target_reps: str || "8-10",
    target_rir: rir,
    target_rpe: rpe,
    percentage_1rm: null,
    rest_seconds: baseRest,
    notes: baseNotes
  });
  return { setCount: 1, reps: str || "8-10", sets };
}

// Parse detailed parameters from text line or table row
function parseExerciseDetails(str) {
  str = String(str || "");
  let sets = 3;
  let reps = "8-10";
  let reps_raw = "8-10";
  let reps_pattern = null;
  let rir = null;
  let rpe = null;
  let percentage_1rm = null;
  let rest_seconds = 90;
  let load = null;
  let load_value = null;
  let load_unit = "kg";

  // Complex Rep Pattern check (e.g. 25-20-15-10, 4xMAX, 4x21's, 4x24 PASSI)
  const specialPatternMatch = str.match(/(\d+)\s*(?:x|X|\*|\u00d7)\s*(\d+[\-\/\u2013]\d+[\-\/\u2013]\d+(?:[\-\/\u2013]\d+)?|MAX|AMRAP|EXHAUST|\d+\s*PASSI|21['\u2019]?S)/i);
  if (specialPatternMatch) {
    sets = parseInt(specialPatternMatch[1], 10) || 4;
    reps = specialPatternMatch[2].trim();
    reps_raw = reps;
    if (reps.includes("-") || reps.includes("/") || reps.includes("–")) {
      reps_pattern = reps.split(/[\-\/\u2013]/).map(r => r.trim());
    }
  } else {
    const setRepMatch = str.match(/(\d+)\s*(?:x|X|\*|\u00d7)\s*(\d+(?:[\-\u2013\/]\d+)?(?:\+AMRAP)?|AMRAP|MAX)/i);
    if (setRepMatch) {
      sets = parseInt(setRepMatch[1], 10) || 3;
      reps = setRepMatch[2].trim();
      reps_raw = reps;
    } else {
      const repsRangeMatch = str.match(/(\d+\s*[\-\u2013\/]\s*\d+)/);
      if (repsRangeMatch) {
        reps = repsRangeMatch[1].trim();
        reps_raw = reps;
      }
    }
  }

  // Target RIR
  const rirMatch = str.match(/(?:@\s*)?RIR\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  if (rirMatch) {
    rir = parseFloat(rirMatch[1]);
    rpe = rirToRpe(rir);
  }

  // Target RPE
  const rpeMatch = str.match(/(?:@\s*)?RPE\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  if (rpeMatch) {
    rpe = parseFloat(rpeMatch[1]);
    if (rir === null) rir = rpeToRir(rpe);
  }

  // Target %1RM
  const percMatch = str.match(/(?:@\s*)?(\d+(?:\.\d+)?)\s*%\s*(?:1RM|RM)?/i);
  if (percMatch) {
    percentage_1rm = parseFloat(percMatch[1]);
  }

  // Rest Seconds (e.g. 90", 120s, 2', 90 sec, 2–3 min, 3-4 min)
  const restMinRangeMatch = str.match(/(\d+(?:\.\d+)?)\s*[\-\u2013]\s*(\d+(?:\.\d+)?)\s*(?:min|minuti|')/i);
  if (restMinRangeMatch) {
    const minVal = parseFloat(restMinRangeMatch[1]);
    const maxVal = parseFloat(restMinRangeMatch[2]);
    rest_seconds = Math.round(((minVal + maxVal) / 2) * 60);
  } else {
    const restSecRangeMatch = str.match(/(\d+)\s*[\-\u2013]\s*(\d+)\s*(?:s|sec|secondi|\")/i);
    if (restSecRangeMatch) {
      const minVal = parseInt(restSecRangeMatch[1], 10);
      const maxVal = parseInt(restSecRangeMatch[2], 10);
      rest_seconds = Math.round((minVal + maxVal) / 2);
    } else {
      const restSecMatch = str.match(/(\d+)\s*(?:s|sec|secondi|\")/i);
      if (restSecMatch) {
        rest_seconds = parseInt(restSecMatch[1], 10);
      } else {
        const restMinMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:min|minuti|')/i);
        if (restMinMatch) {
          rest_seconds = Math.round(parseFloat(restMinMatch[1]) * 60);
        }
      }
    }
  }

  // Target Load (e.g. 130 kg, 55, 67.5 kg)
  const loadMatch = str.match(/(\d+(?:\.\d+)?)\s*(kg|lbs?|%)\b/i);
  if (loadMatch && !percentage_1rm) {
    load_value = parseFloat(loadMatch[1]);
    load_unit = loadMatch[2].toLowerCase().startsWith("lb") ? "lb" : "kg";
    load = `${load_value} ${load_unit}`;
  }

  return {
    sets,
    reps,
    reps_raw,
    reps_pattern,
    rir: rir !== null ? rir : 2,
    rpe: rpe !== null ? rpe : 8,
    percentage_1rm,
    rest_seconds,
    load,
    load_value,
    load_unit
  };
}

// ====================================================
// 2. 2D STRUCTURED WORKBOOK READER & SEMANTIC CLASSIFIER
// ====================================================

function readStructuredWorkbook(workbook) {
  const sheets = [];
  for (let idx = 0; idx < workbook.SheetNames.length; idx++) {
    const sheetName = workbook.SheetNames[idx];
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
    const rows = rawRows.map((r, rIdx) => {
      const cells = (r || []).map((val, cIdx) => ({
        address: XLSX.utils.encode_cell({ r: rIdx, c: cIdx }),
        row: rIdx + 1,
        column: cIdx + 1,
        rawValue: val,
        displayValue: val == null ? "" : String(val).trim(),
        type: typeof val
      }));
      return { rowIndex: rIdx + 1, cells, rawRow: r || [] };
    });

    sheets.push({
      name: sheetName,
      index: idx,
      rows,
      rawRows,
      merges: ws["!merges"] || []
    });
  }

  return { sheets, sheetNames: workbook.SheetNames };
}

function classifySheetType(sheetName, rawRows = []) {
  const nameUpper = String(sheetName || "").toUpperCase().trim();

  // Explicit sheet name matchers
  if (/^(?:W\d+|SETTIMANA\s*\d*|WEEK\s*\d*|ALLENAMENTO|ALL\.?|TRAINING|WORKOUT|SCHEDA|SPLIT|PUSH|PULL|LEGS|UPPER|LOWER|MESOCICLO|MICROCICLO|BLOCCO|FASE|TABELLA|PROGRAMMA|GYM|ROUTINE|SESSIONI|PESI|BODYBUILDING|FITNESS)/i.test(nameUpper)) {
    return "training";
  }
  if (/^(?:ALIMENTAZIONE|NUTRIZIONE|DIETA|PIANO\s*ALIMENTARE|MEALS|MEAL\s*PLAN|PASTI|FOOD|NUTRITION)/i.test(nameUpper)) {
    return "nutrition";
  }
  if (/^(?:INTEGRAZIONE|INTEGRATORI|SUPPLEMENTI|SUPPLEMENTATION|SUPPLEMENTS)/i.test(nameUpper)) {
    return "supplementation";
  }
  if (/^(?:TERAPIA\s*ED\s*ESAMI|TERAPIA_ESAMI|PIANO\s*CLINICO|CLINICAL)/i.test(nameUpper)) {
    return "therapy_exams";
  }
  if (/^(?:TERAPIA|FARMACOLOGIA|TRATTAMENTO|TERAPIE|MEDICINALI|FARMACI)/i.test(nameUpper)) {
    return "therapy";
  }
  if (/^(?:ESAMI|ANALISI|ESAMI\s*DEL\s*SANGUE|BLOODWORK|REFERTI|VALORI)/i.test(nameUpper)) {
    return "exams";
  }

  // Content-based heuristic scanner (First 40 rows)
  let trainingHits = 0;
  let nutritionHits = 0;
  let supplementHits = 0;
  let therapyHits = 0;
  let examHits = 0;

  for (let i = 0; i < Math.min(40, rawRows.length); i++) {
    const rowStr = (rawRows[i] || []).join(" ").toLowerCase();
    if (/movimento|esercizio|reps|rir|rpe|recupero|rest|panca|squat|stacco|serie|set|pattern|lat machine|pulley|pulldown|croci|alzate|trazioni|curl|french|press|affondi|calf|plank|crunch/.test(rowStr)) trainingHits++;
    if (/colazione|pranzo|cena|spuntino|merenda|pre-nanna|alimento|grammi|kcal|calorie|proteine|carboidrati|grassi|avena|albumi|riso|pollo/.test(rowStr)) nutritionHits++;
    if (/creatina|whey|omega|dosaggio|timing|multivitaminico|magnesio|integratore|eaa|capsule|posologia/.test(rowStr)) supplementHits++;
    if (/farmaco|principio attivo|somministrazione|medicinale|durata settimane|compresse|terapia|metformina|cardiaspirina|telmisartan/.test(rowStr)) therapyHits++;
    if (/esame|referto|analisi|sangue|emocromo|testosterone|glicemia|transaminasi|valori di riferimento/.test(rowStr)) examHits++;
  }

  if (nutritionHits >= 2 && nutritionHits >= trainingHits) return "nutrition";
  if (supplementHits >= 2 && supplementHits >= trainingHits) return "supplementation";
  if (therapyHits >= 1 && examHits >= 1) return "therapy_exams";
  if (therapyHits >= 2) return "therapy";
  if (examHits >= 2) return "exams";
  if (trainingHits >= 1) return "training";

  return "other";
}

// ====================================================
// 3. STRUCTURED MULTI-LAYOUT TRAINING SHEET PARSER
// ====================================================

function parseTrainingSheet(sheet, weekIndex = 1) {
  const rawRows = sheet.rawRows || [];
  const weekNumber = parseInt(sheet.name.replace(/\D/g, ""), 10) || weekIndex;
  const sessions = [];

  // Determine if sheet is Layout A (Detailed Table) or Layout B (Compact Exercise + Pattern)
  let isCompactLayout = false;
  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const rowStr = (rawRows[i] || []).join(" ").toUpperCase();
    if (rowStr.includes("ESERCIZIO") && (rowStr.includes("PATTERN") || rowStr.includes("RIPOSO"))) {
      isCompactLayout = true;
      break;
    }
    // Check if second column has pattern-like values (e.g. 4*10)
    const row = rawRows[i] || [];
    if (row[1] && /^\d+\s*[\*xX\u00d7]\s*\S+/.test(String(row[1]).trim())) {
      isCompactLayout = true;
      break;
    }
  }

  if (isCompactLayout) {
    let currentSession = null;
    for (let rIdx = 0; rIdx < rawRows.length; rIdx++) {
      const row = rawRows[rIdx] || [];
      const nonEmpty = row.map(c => c == null ? "" : String(c).trim()).filter(Boolean);
      if (!nonEmpty.length) continue;

      const rowStr = nonEmpty.join(" ");

      // Check if this row is actually an exercise row with pattern or sets (e.g. "PULLDOWN AL CAVO", "PUSH DOWN")
      const isExerciseRow = row[1] && /^\d+\s*[\*xX\u00d7]|\d+\s*(?:reps|rip|serie)/i.test(String(row[1]).trim());

      // Session Header: GIORNO 1, DAY 1, SEDUTA A, etc. (Must NOT be an exercise row)
      const dayMatch = !isExerciseRow && (
        nonEmpty.length <= 2 || !row[1] || !row[2]
      ) && rowStr.match(/^(?:GIORNO|DAY|SEDUTA|SESSIONE|SPLIT|SCHEDA|WORKOUT|ALLENAMENTO|LUNED[I\u00cc]|MARTED[I\u00cc]|MERCOLED[I\u00cc]|GIOVED[I\u00cc]|VENERD[I\u00cc]|SABATO|DOMENICA|\bPUSH\b|\bPULL\b|\bLEGS\b|\bUPPER\b|\bLOWER\b|[A-G]\s*[\-\u2013:])/i);
      if (dayMatch && !rowStr.includes("ESERCIZIO") && !rowStr.includes("PATTERN")) {
        if (currentSession && currentSession.exercises.length > 0) {
          sessions.push(currentSession);
        }
        currentSession = {
          session_number: sessions.length + 1,
          name: rowStr.trim(),
          exercises: []
        };
        continue;
      }

      // Column Header skip
      if (row.some(c => /^(ESERCIZIO|PATTERN|RIPOSO|NOTE)$/i.test(String(c || "").trim()))) {
        continue;
      }

      if (!currentSession) {
        currentSession = {
          session_number: 1,
          name: "Sessione 1",
          exercises: []
        };
      }

      const exNameRaw = String(row[0] || "").trim();
      const patternRaw = String(row[1] || "").trim();
      const restRaw = String(row[2] || "").trim();
      const notesRaw = String(row[3] || "").trim();

      if (!exNameRaw || exNameRaw.toUpperCase().startsWith("VOLUME") || exNameRaw.toUpperCase().startsWith("SETTIMANA")) {
        continue;
      }

      // Parse rest seconds
      let restSec = 90;
      const restMatch = restRaw.match(/(\d+)\s*(?:s|sec|secondi|\")/i);
      if (restMatch) {
        restSec = parseInt(restMatch[1], 10);
      } else {
        const minMatch = restRaw.match(/(\d+(?:\.\d+)?)\s*(?:min|minuti|')/i);
        if (minMatch) restSec = Math.round(parseFloat(minMatch[1]) * 60);
      }

      // Parse RIR / RPE from notes
      let rir = 2;
      let rpe = 8;
      const rirMatch = (notesRaw + " " + patternRaw).match(/RIR\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
      if (rirMatch) {
        rir = parseFloat(rirMatch[1]);
        rpe = 10 - rir;
      }
      const rpeMatch = (notesRaw + " " + patternRaw).match(/RPE\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
      if (rpeMatch) {
        rpe = parseFloat(rpeMatch[1]);
        rir = 10 - rpe;
      }

      const normalized = normalizeExerciseName(exNameRaw);
      const expansion = expandPatternToSets(patternRaw, restSec, notesRaw, rir, rpe);

      const exercise = {
        id: `e_${weekNumber}_${currentSession.session_number}_${currentSession.exercises.length + 1}`,
        name: normalized.name_normalized,
        name_original: exNameRaw,
        name_normalized: normalized.name_normalized,
        movement: exNameRaw,
        muscle_group: normalized.muscle,
        muscle_groups: normalized.muscles,
        sets_count: expansion.setCount,
        reps_target: expansion.reps,
        reps_raw: patternRaw,
        rir_target: rir,
        rpe_target: rpe,
        percentage_1rm: null,
        rest_seconds: restSec,
        load_target: null,
        load_value: null,
        notes: notesRaw || null,
        sets: expansion.sets
      };

      currentSession.exercises.push(exercise);
    }

    if (currentSession && currentSession.exercises.length > 0) {
      sessions.push(currentSession);
    }

    return {
      week_number: weekNumber,
      label: sheet.name.startsWith("W") ? `Settimana ${weekNumber}` : sheet.name,
      sessions
    };
  }

  // Layout A: Detailed Multi-Column Table (Master V29 standard)
  let currentSession = null;
  let currentExercise = null;
  let headerColMap = null;

  for (let rIdx = 0; rIdx < rawRows.length; rIdx++) {
    const row = rawRows[rIdx] || [];
    const nonEmpty = row.map(c => c == null ? "" : String(c).trim()).filter(Boolean);
    if (!nonEmpty.length) continue;

    const rowStr = nonEmpty.join(" ");

    // 1. Detect Day / Session Header
    const dayMatch = rowStr.match(/^(?:GIORNO|DAY|SEDUTA|SESSIONE)\s*([0-9a-zA-Z\s\u2022\—\-\_]+)/i);
    if (dayMatch && !rowStr.includes("Movimento") && !rowStr.includes("Esercizio effettivo")) {
      if (currentExercise && currentSession) {
        currentSession.exercises.push(currentExercise);
        currentExercise = null;
      }
      if (currentSession && currentSession.exercises.length > 0) {
        sessions.push(currentSession);
      }

      currentSession = {
        session_number: sessions.length + 1,
        name: rowStr.trim(),
        exercises: []
      };
      headerColMap = null;
      continue;
    }

    // 2. Detect Table Column Headers
    const isHeaderRow = row.some((c, colIdx) => colIdx < 4 && /^(movimento|esercizio effettivo|esercizio|nome esercizio)$/i.test(String(c || "").trim()));
    if (isHeaderRow) {
      headerColMap = {};
      row.forEach((cellVal, cIdx) => {
        const v = String(cellVal || "").toLowerCase().trim();
        if (v === "movimento") headerColMap.movement = cIdx;
        else if (v.includes("esercizio effettivo") || v === "esercizio" || v === "nome") headerColMap.exercise = cIdx;
        else if (v === "set" || v === "serie") headerColMap.set = cIdx;
        else if ((v.includes("reps target") || v === "reps" || v === "ripetizioni") && !v.includes("reali") && !v.includes("eseguite")) {
          if (headerColMap.reps === undefined) headerColMap.reps = cIdx;
        }
        else if ((v.includes("rir target") || v === "rir") && !v.includes("reale") && !v.includes("effettivo")) {
          if (headerColMap.rir === undefined) headerColMap.rir = cIdx;
        }
        else if ((v.includes("rpe target") || v === "rpe") && !v.includes("reale")) {
          if (headerColMap.rpe === undefined) headerColMap.rpe = cIdx;
        }
        else if (v.includes("%") || v.includes("1rm")) {
          if (headerColMap.percentage_1rm === undefined) headerColMap.percentage_1rm = cIdx;
        }
        else if (v.includes("recupero") || v.includes("rest") || v.includes("pausa")) {
          if (headerColMap.rest === undefined) headerColMap.rest = cIdx;
        }
        else if ((v.includes("carico pianificato") || v === "carico" || v === "load" || v === "peso") && !v.includes("reale")) {
          if (headerColMap.load === undefined) headerColMap.load = cIdx;
        }
        else if (v.includes("note")) {
          if (headerColMap.notes === undefined) headerColMap.notes = cIdx;
        }
      });
      continue;
    }

    // Ignore Volume summary or section footer rows
    if (rowStr.startsWith("VOLUME GIORNO") || rowStr.startsWith("PESO CORPOREO") || rowStr.startsWith("OBIETTIVO BLOCCO") || rowStr.startsWith("PERFORMANCE VS") || rowStr.startsWith("SETTIMANA")) {
      continue;
    }

    if (!headerColMap && !rowStr.match(/\d+\s*(?:x|X|\*|\u00d7)\s*\d+/)) {
      continue;
    }

    if (!currentSession) {
      currentSession = {
        session_number: 1,
        name: `Sessione 1`,
        exercises: []
      };
    }

    let rawExName = headerColMap?.exercise !== undefined ? row[headerColMap.exercise] : row[1] || row[0];
    let movement = headerColMap?.movement !== undefined ? row[headerColMap.movement] : row[0];
    let setVal = headerColMap?.set !== undefined ? row[headerColMap.set] : row[2];
    let repsVal = headerColMap?.reps !== undefined ? row[headerColMap.reps] : row[3];
    let rirVal = headerColMap?.rir !== undefined ? row[headerColMap.rir] : row[4];
    let restVal = headerColMap?.rest !== undefined ? row[headerColMap.rest] : row[5];
    let loadVal = headerColMap?.load !== undefined ? row[headerColMap.load] : row[6];
    let notesVal = headerColMap?.notes !== undefined ? row[headerColMap.notes] : row[10];

    rawExName = rawExName == null ? "" : String(rawExName).trim();
    movement = movement == null ? "" : String(movement).trim();
    setVal = setVal == null ? "" : String(setVal).trim();
    repsVal = repsVal == null ? "" : String(repsVal).trim();
    rirVal = rirVal == null ? "" : String(rirVal).trim();
    restVal = restVal == null ? "" : String(restVal).trim();
    loadVal = loadVal == null ? "" : String(loadVal).trim();
    notesVal = notesVal == null ? "" : String(notesVal).trim();

    const isSameExerciseContinuation = currentExercise && (
      (!rawExName && setVal) ||
      (rawExName && rawExName.toLowerCase() === currentExercise.name_original.toLowerCase())
    );

    if (isSameExerciseContinuation) {
      const setNum = parseInt(setVal, 10) || (currentExercise.sets.length + 1);
      const parsedContLoad = loadVal ? parseFloat(loadVal.replace(/[^0-9.]/g, "")) : null;
      const targetLoadNum = (parsedContLoad !== null && !isNaN(parsedContLoad)) ? parsedContLoad : (currentExercise.sets[0]?.target_load || null);
      const targetRepsStr = repsVal || currentExercise.reps_target;
      const targetRirNum = (rirVal && !isNaN(parseFloat(rirVal))) ? parseFloat(rirVal) : ((currentExercise.rir_target !== undefined && currentExercise.rir_target !== null && !isNaN(currentExercise.rir_target)) ? currentExercise.rir_target : 2);
      const targetRpeNum = (targetRirNum !== null && !isNaN(targetRirNum)) ? rirToRpe(targetRirNum) : ((currentExercise.rpe_target !== undefined && currentExercise.rpe_target !== null && !isNaN(currentExercise.rpe_target)) ? currentExercise.rpe_target : 8);

      let setType = "working";
      if (notesVal.toUpperCase().includes("TOP SET")) setType = "topset";
      else if (notesVal.toUpperCase().includes("BACK-OFF")) setType = "backoff";
      else if (notesVal.toUpperCase().includes("DROP")) setType = "dropset";
      else if (notesVal.toUpperCase().includes("WARM")) setType = "warmup";

      currentExercise.sets.push({
        set_number: setNum,
        set_type: setType,
        target_load: targetLoadNum,
        target_reps: targetRepsStr,
        target_rir: targetRirNum,
        target_rpe: targetRpeNum,
        percentage_1rm: currentExercise.percentage_1rm,
        rest_seconds: currentExercise.rest_seconds,
        notes: notesVal || null
      });
      currentExercise.sets_count = currentExercise.sets.length;
    } else if (rawExName && rawExName !== "Esercizio effettivo" && !rawExName.toLowerCase().startsWith("volume")) {
      if (currentExercise) {
        currentSession.exercises.push(currentExercise);
      }

      const normalized = normalizeExerciseName(rawExName);
      const details = parseExerciseDetails(`${repsVal} ${rirVal ? "RIR " + rirVal : ""} ${restVal} ${loadVal ? loadVal + " kg" : ""}`);

      const parsedNewLoad = loadVal ? parseFloat(loadVal.replace(/[^0-9.]/g, "")) : null;
      const targetLoadNum = (parsedNewLoad !== null && !isNaN(parsedNewLoad)) ? parsedNewLoad : (details.load_value || null);
      const targetRirNum = (rirVal && !isNaN(parseFloat(rirVal))) ? parseFloat(rirVal) : (details.rir !== null && details.rir !== undefined ? details.rir : 2);
      const targetRpeNum = (targetRirNum !== null && !isNaN(targetRirNum)) ? rirToRpe(targetRirNum) : (details.rpe !== null && details.rpe !== undefined ? details.rpe : 8);

      let setType = "working";
      if (notesVal.toUpperCase().includes("TOP SET")) setType = "topset";
      else if (notesVal.toUpperCase().includes("BACK-OFF")) setType = "backoff";
      else if (notesVal.toUpperCase().includes("DROP")) setType = "dropset";
      else if (notesVal.toUpperCase().includes("WARM")) setType = "warmup";

      const finalRestSec = details.rest_seconds || 90;
      const finalRepsTarget = repsVal || details.reps || "8-10";

      currentExercise = {
        id: `e_${weekNumber}_${currentSession.session_number}_${currentSession.exercises.length + 1}`,
        name: normalized.name_normalized,
        name_original: rawExName,
        name_normalized: normalized.name_normalized,
        movement: movement || null,
        muscle_group: normalized.muscle,
        muscle_groups: normalized.muscles,
        sets_count: 1,
        reps_target: finalRepsTarget,
        reps_raw: repsVal || details.reps_raw || "8-10",
        rir_target: targetRirNum,
        rpe_target: targetRpeNum,
        percentage_1rm: details.percentage_1rm,
        rest_seconds: finalRestSec,
        load_target: targetLoadNum ? `${targetLoadNum} kg` : null,
        load_value: targetLoadNum,
        notes: notesVal || null,
        sets: [
          {
            set_number: 1,
            set_type: setType,
            target_load: targetLoadNum,
            target_reps: finalRepsTarget,
            target_rir: targetRirNum,
            target_rpe: targetRpeNum,
            percentage_1rm: details.percentage_1rm,
            rest_seconds: finalRestSec,
            notes: notesVal || null
          }
        ]
      };
    }
  }

  if (currentExercise && currentSession) {
    currentSession.exercises.push(currentExercise);
  }
  if (currentSession && currentSession.exercises.length > 0) {
    sessions.push(currentSession);
  }

  return {
    week_number: weekNumber,
    label: sheet.name.startsWith("W") ? `Settimana ${weekNumber}` : sheet.name,
    sessions
  };
}

// ====================================================
// 4. STRUCTURED NUTRITION SHEET PARSER (Multi-Layout: Vertical & Horizontal Matrix)
// ====================================================

function parseFoodItem(foodNameRaw, qtyRaw = null, unitRaw = null, kcalRaw = null, proRaw = null, carbRaw = null, fatRaw = null, notesRaw = null) {
  let foodName = String(foodNameRaw || "").trim();
  if (!foodName) return null;

  let quantity = qtyRaw !== null && qtyRaw !== undefined && qtyRaw !== "" ? qtyRaw : null;
  let unit = unitRaw ? String(unitRaw).trim() : null;
  let kcal = kcalRaw !== null && kcalRaw !== undefined && kcalRaw !== "" ? parseFloat(String(kcalRaw).replace(/[^0-9.]/g, "")) : null;
  let protein_g = proRaw !== null && proRaw !== undefined && proRaw !== "" ? parseFloat(String(proRaw).replace(/[^0-9.]/g, "")) : null;
  let carbs_g = carbRaw !== null && carbRaw !== undefined && carbRaw !== "" ? parseFloat(String(carbRaw).replace(/[^0-9.]/g, "")) : null;
  let fat_g = fatRaw !== null && fatRaw !== undefined && fatRaw !== "" ? parseFloat(String(fatRaw).replace(/[^0-9.]/g, "")) : null;
  let notes = notesRaw ? String(notesRaw).trim() : null;

  // Extract inline notes in parentheses if not explicitly provided
  if (!notes) {
    const noteMatch = foodName.match(/\(([^)]+)\)/);
    if (noteMatch) {
      notes = noteMatch[1].trim();
      foodName = foodName.replace(noteMatch[0], "").trim();
    }
  }

  // Extract inline Kcal and macros if embedded in string
  if (kcal === null) {
    const kcalMatch = foodName.match(/(\d+(?:\.\d+)?)\s*(?:kcal|calorie|cal)\b/i);
    if (kcalMatch) {
      kcal = parseFloat(kcalMatch[1]);
      foodName = foodName.replace(kcalMatch[0], "").trim();
    }
  }

  if (protein_g === null) {
    const proMatch = foodName.match(/(?:pro(?:t|teine)?|p)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*g?\b/i);
    if (proMatch) {
      protein_g = parseFloat(proMatch[1]);
      foodName = foodName.replace(proMatch[0], "").trim();
    }
  }

  if (carbs_g === null) {
    const carbMatch = foodName.match(/(?:carb(?:o|oidrati)?|c|cho)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*g?\b/i);
    if (carbMatch) {
      carbs_g = parseFloat(carbMatch[1]);
      foodName = foodName.replace(carbMatch[0], "").trim();
    }
  }

  if (fat_g === null) {
    const fatMatch = foodName.match(/(?:fat|grassi|g)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*g?\b/i);
    if (fatMatch) {
      fat_g = parseFloat(fatMatch[1]);
      foodName = foodName.replace(fatMatch[0], "").trim();
    }
  }

  // Parse quantity and unit if embedded in quantity or foodName (e.g. 50 gr, 200 gr, 10 ML, 1 MELA, 1 BANANA)
  if (quantity === null || quantity === "") {
    const qtyUnitMatch = foodName.match(/^(\d+(?:[.,]\d+)?)\s*(g|gr|grammi|ml|l|litri|cps|capsule|compresse|cp|fette|fetta|scoop|misurini|misurino|porzioni|porzione|pz|pezzi|cucchiai|cucchiaio|uova|albumi)\b/i);
    if (qtyUnitMatch) {
      quantity = parseFloat(qtyUnitMatch[1].replace(",", "."));
      if (!unit) unit = qtyUnitMatch[2].toLowerCase();
      foodName = foodName.replace(qtyUnitMatch[0], "").trim();
    } else {
      const leadingNumMatch = foodName.match(/^(\d+(?:[.,]\d+)?)\s+([a-zA-Z\u00c0-\u00ff\s'-]+)$/);
      if (leadingNumMatch) {
        quantity = parseFloat(leadingNumMatch[1].replace(",", "."));
        if (!unit) unit = "pz";
        foodName = leadingNumMatch[2].trim();
      }
    }
  } else if (typeof quantity === "string" && !unit) {
    const qMatch = quantity.match(/(\d+(?:[.,]\d+)?)\s*([a-zA-Z%]+)?/);
    if (qMatch) {
      quantity = parseFloat(qMatch[1].replace(",", "."));
      if (qMatch[2]) unit = qMatch[2].trim();
    }
  }

  if (typeof quantity === "string" && !isNaN(parseFloat(quantity))) {
    quantity = parseFloat(quantity);
  }

  // Normalize Unit
  if (unit) {
    const uLow = unit.toLowerCase();
    if (uLow === "gr" || uLow === "grammi") unit = "g";
    else if (uLow === "litri" || uLow === "l") unit = "l";
    else if (uLow === "compresse" || uLow === "cp") unit = "compresse";
    else if (uLow === "capsule" || uLow === "cps") unit = "capsule";
    else if (uLow === "fetta" || uLow === "fette") unit = "fette";
    else if (uLow === "misurino" || uLow === "misurini" || uLow === "scoop") unit = "misurino";
    else if (uLow === "cucchiaio" || uLow === "cucchiai") unit = "cucchiaio";
    else if (uLow === "pz" || uLow === "pezzi") unit = "pz";
  } else {
    unit = "g";
  }

  foodName = foodName.replace(/^[,\\-\u2013:\s]+|[,\\-\u2013:\s]+$/g, "").trim();
  if (!foodName) foodName = String(foodNameRaw).trim();

  return {
    name: foodName,
    food: foodName,
    quantity: quantity !== null && quantity !== undefined ? quantity : "",
    unit: unit || "g",
    kcal: !isNaN(kcal) ? kcal : null,
    protein_g: !isNaN(protein_g) ? protein_g : null,
    carbs_g: !isNaN(carbs_g) ? carbs_g : null,
    fat_g: !isNaN(fat_g) ? fat_g : null,
    notes: notes || null
  };
}

function parseNutritionSheet(sheet) {
  const rawRows = sheet.rawRows || [];
  const days = [];
  const notes = [];

  // Step 1: Detect Horizontal Multi-Day Column Groups (e.g. LUNEDI, MARTEDI, MERCOLEDI...)
  const dayColMap = [];
  const DAY_REGEX = /^(LUNED[I\u00cc]|MARTED[I\u00cc]|MERCOLED[I\u00cc]|GIOVED[I\u00cc]|VENERD[I\u00cc]|SABATO|DOMENICA|GIORNO\s*\d+|DAY\s*\d+|REST DAY|TRAINING DAY)/i;

  for (let rIdx = 0; rIdx < Math.min(5, rawRows.length); rIdx++) {
    const row = rawRows[rIdx] || [];
    row.forEach((cellVal, cIdx) => {
      const valStr = String(cellVal || "").trim();
      const match = valStr.match(DAY_REGEX);
      if (match) {
        if (!dayColMap.some(d => d.startCol === cIdx)) {
          dayColMap.push({
            dayName: match[1].toUpperCase(),
            startCol: cIdx,
            startRow: rIdx
          });
        }
      }
    });
  }

  // If 2 or more day columns are detected side-by-side, use Horizontal Matrix Parser
  if (dayColMap.length >= 2) {
    dayColMap.sort((a, b) => a.startCol - b.startCol);
    for (let i = 0; i < dayColMap.length; i++) {
      const nextCol = (i + 1 < dayColMap.length) ? dayColMap[i + 1].startCol : 100;
      dayColMap[i].endCol = nextCol - 1;
    }

    dayColMap.forEach(dayGroup => {
      const dayObj = {
        day: dayGroup.dayName,
        day_name: dayGroup.dayName,
        meals: []
      };

      let currentMeal = null;

      for (let rIdx = dayGroup.startRow + 1; rIdx < rawRows.length; rIdx++) {
        const row = rawRows[rIdx] || [];
        const cells = [];
        for (let c = dayGroup.startCol; c <= dayGroup.endCol && c < row.length; c++) {
          const val = row[c] != null ? String(row[c]).trim() : "";
          if (val) cells.push(val);
        }

        if (cells.length === 0) continue;
        const rowText = cells.join(" ");

        const isMeal = /^(PASTO\s*\d+|MEAL\s*\d+|COLAZIONE|SPUNTINO|PRANZO|MERENDA|CENA|PRE[_\-\s]?NANNA)/i.test(cells[0]);
        if (isMeal) {
          if (currentMeal && (currentMeal.foods.length > 0 || currentMeal.items.length > 0)) {
            dayObj.meals.push(currentMeal);
          }
          currentMeal = {
            name: cells[0],
            meal_name: cells[0],
            foods: [],
            items: []
          };
          if (cells.length > 1) {
            const item = parseFoodItem(cells.slice(1).join(" "));
            if (item) {
              currentMeal.foods.push(item);
              currentMeal.items.push(item);
            }
          }
          continue;
        }

        if (!currentMeal) {
          currentMeal = {
            name: "Pasto",
            meal_name: "Pasto",
            foods: [],
            items: []
          };
        }

        const item = parseFoodItem(rowText);
        if (item) {
          currentMeal.foods.push(item);
          currentMeal.items.push(item);
        }
      }

      if (currentMeal && (currentMeal.foods.length > 0 || currentMeal.items.length > 0)) {
        dayObj.meals.push(currentMeal);
      }

      if (dayObj.meals.length > 0) {
        days.push(dayObj);
      }
    });

    return { present: days.length > 0, days, notes };
  }

  // Step 2: Fallback to Vertical Rows Layout
  let currentDay = null;
  let currentMeal = null;
  let headerColMap = null;

  for (let rIdx = 0; rIdx < rawRows.length; rIdx++) {
    const row = rawRows[rIdx] || [];
    const nonEmpty = row.map(c => c == null ? "" : String(c).trim()).filter(Boolean);
    if (!nonEmpty.length) continue;

    const rowStr = nonEmpty.join(" ");
    if (rowStr.toUpperCase().includes("PIANO ALIMENTARE") && nonEmpty.length === 1) {
      continue;
    }

    // Check Table Column Headers (e.g. Pasto, Alimento, Grammi, Kcal...)
    const isColHeader = row.some(c => /^(pasto|alimento|cibo|grammi|quantit[aà]|kcal|calorie|proteine|carboidrati|grassi)$/i.test(String(c || "").trim()));
    if (isColHeader) {
      headerColMap = {};
      row.forEach((cellVal, cIdx) => {
        const v = String(cellVal || "").toLowerCase().trim();
        if (v === "giorno" || v === "day") headerColMap.day = cIdx;
        else if (v === "pasto" || v === "meal") headerColMap.meal = cIdx;
        else if (v === "alimento" || v === "cibo" || v === "food" || v === "nome") headerColMap.food = cIdx;
        else if (v.includes("quant") || v === "grammi" || v === "peso" || v === "qta" || v === "qtà") headerColMap.qty = cIdx;
        else if (v === "unit" || v === "unità" || v === "unita") headerColMap.unit = cIdx;
        else if (v.includes("kcal") || v.includes("calor")) headerColMap.kcal = cIdx;
        else if (v.includes("prot")) headerColMap.pro = cIdx;
        else if (v.includes("carb") || v.includes("cho")) headerColMap.carb = cIdx;
        else if (v.includes("fat") || v.includes("gras")) headerColMap.fat = cIdx;
        else if (v.includes("note")) headerColMap.notes = cIdx;
      });
      continue;
    }

    // 1. Detect Day Header (e.g. LUNEDÌ, MARTEDÌ, GIORNO 1, REST DAY, TRAINING DAY)
    const dayMatch = rowStr.match(/^(?:=== )?(LUNED[I\u00cc]|MARTED[I\u00cc]|MERCOLED[I\u00cc]|GIOVED[I\u00cc]|VENERD[I\u00cc]|SABATO|DOMENICA|GIORNO\s*\d+|DAY\s*\d+|REST DAY|TRAINING DAY|GIORNI?\s*ON|GIORNI?\s*OFF|GIORNO\s*[A-G]|PIANO GENERALE|TUTTI I GIORNI)/i);
    if (dayMatch && !rowStr.toLowerCase().includes("colazione") && !rowStr.toLowerCase().includes("pranzo") && !rowStr.toLowerCase().includes("cena")) {
      if (currentMeal && currentDay) {
        currentDay.meals.push(currentMeal);
        currentMeal = null;
      }
      if (currentDay && currentDay.meals.length > 0) {
        days.push(currentDay);
      }
      const dName = dayMatch[1].toUpperCase().trim();
      currentDay = { day: dName, day_name: dName, meals: [] };
      continue;
    }

    if (!currentDay) {
      currentDay = { day: "LUNEDÌ", day_name: "LUNEDÌ", meals: [] };
    }

    // 2. Detect Meal Header (e.g. Colazione, Spuntino Mattina, Pranzo, Merenda, Cena, Pre-nanna)
    const col0Str = String(row[0] || "").trim();
    const isMealInCol0 = /^(Colazione|Pranzo|Cena|Spuntino(?:\s*\d*|\s+Mattina|\s+Pomeriggio)?|Pre[\s\-_]?nanna|Pre[\s\-_]?workout|Post[\s\-_]?workout|Merenda|Pasto\s*\d+|Meal\s*\d+)/i.test(col0Str);

    if (isMealInCol0) {
      if (currentMeal) {
        currentDay.meals.push(currentMeal);
      }
      currentMeal = {
        name: col0Str,
        meal_name: col0Str,
        foods: [],
        items: []
      };

      if (row[1] || row[2]) {
        const item = parseFoodItem(
          row[1] || row[0],
          row[2],
          row[3],
          row[4],
          row[5],
          row[6],
          row[7],
          row[8]
        );
        if (item) {
          currentMeal.foods.push(item);
          currentMeal.items.push(item);
        }
      }
      continue;
    }

    // 3. Item continuation for current meal or mapped row
    if (headerColMap && headerColMap.food !== undefined && row[headerColMap.food]) {
      const item = parseFoodItem(
        row[headerColMap.food],
        headerColMap.qty !== undefined ? row[headerColMap.qty] : null,
        headerColMap.unit !== undefined ? row[headerColMap.unit] : null,
        headerColMap.kcal !== undefined ? row[headerColMap.kcal] : null,
        headerColMap.pro !== undefined ? row[headerColMap.pro] : null,
        headerColMap.carb !== undefined ? row[headerColMap.carb] : null,
        headerColMap.fat !== undefined ? row[headerColMap.fat] : null,
        headerColMap.notes !== undefined ? row[headerColMap.notes] : null
      );
      if (item) {
        if (!currentMeal) {
          currentMeal = { name: "Pasto", meal_name: "Pasto", foods: [], items: [] };
        }
        currentMeal.foods.push(item);
        currentMeal.items.push(item);
      }
    } else if (currentMeal) {
      const rawFood = row[1] || row[0];
      if (rawFood) {
        const item = parseFoodItem(
          rawFood,
          row[2],
          row[3],
          row[4],
          row[5],
          row[6],
          row[7],
          row[8]
        );
        if (item) {
          currentMeal.foods.push(item);
          currentMeal.items.push(item);
        }
      }
    } else {
      notes.push(rowStr);
    }
  }

  if (currentMeal && currentDay) {
    currentDay.meals.push(currentMeal);
  }
  if (currentDay && currentDay.meals.length > 0) {
    days.push(currentDay);
  }

  return { present: days.length > 0, days, notes };
}

// ====================================================
// 5. STRUCTURED SUPPLEMENTATION SHEET PARSER (Multi-Layout)
// ====================================================

function parseSupplementationSheet(sheet) {
  const rawRows = sheet.rawRows || [];
  const items = [];

  let headerColMap = null;

  for (let rIdx = 0; rIdx < rawRows.length; rIdx++) {
    const row = rawRows[rIdx] || [];
    const nonEmpty = row.map(c => c == null ? "" : String(c).trim()).filter(Boolean);
    if (!nonEmpty.length) continue;

    const rowStr = nonEmpty.join(" ");
    if (rowStr.toUpperCase().includes("PIANO SUPPLEMENTI") || rowStr.toUpperCase().includes("PIANO INTEGRAZIONE")) continue;

    const isHeaderRow = row.some(c => /^(integratore|supplemento|sostanza|nome|dose|dosaggio|timing|assunzione|frequenza|posologia)$/i.test(String(c || "").trim()));
    if (isHeaderRow) {
      headerColMap = {};
      row.forEach((cellVal, cIdx) => {
        const v = String(cellVal || "").toLowerCase().trim();
        if (v.includes("integratore") || v.includes("supplemento") || v.includes("sostanza") || v === "nome") headerColMap.name = cIdx;
        else if (v === "dose" || v === "dosaggio" || v === "quantità" || v === "qta") headerColMap.dose = cIdx;
        else if (v === "unità" || v === "unit" || v === "unita") headerColMap.unit = cIdx;
        else if (v.includes("timing") || v.includes("momento") || v.includes("quando") || v.includes("assunzione")) headerColMap.timing = cIdx;
        else if (v.includes("frequenza") || v.includes("giorni")) headerColMap.frequency = cIdx;
        else if (v.includes("posologia") || v.includes("prescrizione")) headerColMap.prescription = cIdx;
        else if (v.includes("note")) headerColMap.notes = cIdx;
      });
      continue;
    }

    let name = headerColMap?.name !== undefined ? row[headerColMap.name] : row[0];
    let doseRaw = headerColMap?.dose !== undefined ? row[headerColMap.dose] : (headerColMap?.prescription !== undefined ? row[headerColMap.prescription] : row[1]);
    let unitRaw = headerColMap?.unit !== undefined ? row[headerColMap.unit] : null;
    let timingRaw = headerColMap?.timing !== undefined ? row[headerColMap.timing] : (row[2] || "");
    let freqRaw = headerColMap?.frequency !== undefined ? row[headerColMap.frequency] : null;
    let notesRaw = headerColMap?.notes !== undefined ? row[headerColMap.notes] : (row[3] || "");

    name = name == null ? "" : String(name).trim();
    doseRaw = doseRaw == null ? "" : String(doseRaw).trim();
    timingRaw = timingRaw == null ? "" : String(timingRaw).trim();
    notesRaw = notesRaw == null ? "" : String(notesRaw).trim();

    if (!name || name.toUpperCase().startsWith("SETTIMANA") || name.toUpperCase().startsWith("GIORNO")) continue;

    let doseVal = doseRaw;
    let unit = unitRaw ? String(unitRaw).trim() : "g";
    let timing = timingRaw;
    let frequency = freqRaw || "Quotidiano";

    // Extract unit and dosage from freeform string (e.g. "2 GR TRA EPA E DHA A COLAZIONE", "DAY ON - 5 GR POST WORKOUT")
    const doseMatch = doseRaw.match(/(\\d+(?:[.,]\d+)?)\s*(g|gr|mg|mcg|cps|capsule|compresse|cp|scoop|misurini|misurino|ml|l|litri|ui|bustine)\b/i);
    if (doseMatch) {
      doseVal = parseFloat(doseMatch[1].replace(",", "."));
      unit = doseMatch[2].toLowerCase();
      if (unit === "gr") unit = "g";
      else if (unit === "litri") unit = "l";
    }

    // Extract timing if embedded in doseRaw
    if (!timing || timing === doseRaw) {
      if (/colazione/i.test(doseRaw)) timing = "Colazione";
      else if (/pranzo/i.test(doseRaw)) timing = "Pranzo";
      else if (/cena/i.test(doseRaw)) timing = "Cena";
      else if (/dormire|pre-nanna/i.test(doseRaw)) timing = "Prima di dormire";
      else if (/durante l'allenamento|intra/i.test(doseRaw)) timing = "Durante l'allenamento";
      else if (/post workout|dopo allenamento/i.test(doseRaw)) timing = "Post-Workout";
      else if (/pre workout|prima allenamento/i.test(doseRaw)) timing = "Pre-Workout";
      else timing = "Quotidiano";
    }

    if (/day on.*day off/i.test(doseRaw)) {
      frequency = "Day ON / Day OFF";
    }

    items.push({
      name,
      dose: doseVal || "1 dose",
      dosage: `${doseVal} ${unit}`.trim(),
      unit: unit || "g",
      timing: timing || "Quotidiano",
      frequency: frequency,
      category: /farmaco|medicinale|terapia/i.test(rowStr) ? "medication" : "supplement",
      relation: timing || null,
      notes: notesRaw || (doseRaw !== String(doseVal) ? doseRaw : null)
    });
  }

  return { present: items.length > 0, items };
}

// ====================================================
// 6. STRUCTURED THERAPY & CLINICAL EXAMS PARSER (Multi-Layout)
// ====================================================

function parseTherapyExamsSheet(sheet) {
  const rawRows = sheet.rawRows || [];
  const rawTherapyEntries = [];
  const rawExamEntries = [];

  let headerColMap = null;
  let activeWeeklyBlock = null;

  for (let rIdx = 0; rIdx < rawRows.length; rIdx++) {
    const row = rawRows[rIdx] || [];
    const nonEmpty = row.map(c => c == null ? "" : String(c).trim()).filter(Boolean);
    if (!nonEmpty.length) continue;

    const rowStr = nonEmpty.join(" ");
    if (rowStr.toUpperCase().includes("TERAPIA ED ESAMI") || rowStr.toUpperCase().includes("PIANO CLINICO") || rowStr.toUpperCase().includes("PIANO TERAPIA")) continue;

    // Check for Section Header like "SETTIMANA 1 - 4" or "SETTIMANA 5 - 8"
    const weekBlockMatch = rowStr.match(/^(?:SETTIMANA|SETTIMANE|WEEK|WEEKS)\s*(\d+)\s*(?:[\-\u2013]\s*(\d+))?/i);
    if (weekBlockMatch && nonEmpty.length <= 2) {
      activeWeeklyBlock = rowStr.trim();
      continue;
    }

    const isHeaderRow = row.some(c => /^(data|farmaco|principio|medicinale|esame|parametro|dose|dosaggio|posologia|valore|referto|intervallo|giorno|giorni|frequenza|orario|timing|durata|note|note mediche)$/i.test(String(c || "").trim()));
    if (isHeaderRow) {
      headerColMap = {};
      row.forEach((cellVal, cIdx) => {
        const v = String(cellVal || "").toLowerCase().trim();
        if (v.includes("farmaco") || v.includes("principio") || v.includes("medicinale") || v.includes("esame") || v.includes("parametro") || v === "voce") {
          headerColMap.name = cIdx;
        } else if (v.includes("dose") || v.includes("dosaggio") || v.includes("posologia") || v.includes("valore") || v.includes("referto")) {
          headerColMap.value = cIdx;
        } else if (v.includes("durata") || (v.includes("settimana") && !v.includes("data"))) {
          headerColMap.duration = cIdx;
        } else if (v.includes("orario") || v.includes("timing") || v.includes("ora") || v.includes("momento") || v.includes("frequenza")) {
          headerColMap.timing = cIdx;
        } else if (v.includes("data") || v.includes("date")) {
          headerColMap.date = cIdx;
        } else if (v.includes("giorn") || v.includes("day")) {
          headerColMap.days = cIdx;
        } else if (v.includes("intervallo") || v.includes("riferimento") || v.includes("range")) {
          headerColMap.range = cIdx;
        } else if (v.includes("unit") || v.includes("unità") || v.includes("unita")) {
          headerColMap.unit = cIdx;
        } else if (v.includes("note")) {
          headerColMap.notes = cIdx;
        }
      });
      continue;
    }

    const col0 = headerColMap?.date !== undefined ? row[headerColMap.date] : null;
    const col1 = headerColMap?.name !== undefined ? row[headerColMap.name] : (row[0]);
    const col2 = headerColMap?.value !== undefined ? row[headerColMap.value] : (row[1]);
    const colDays = headerColMap?.days !== undefined ? row[headerColMap.days] : "";
    const col3 = headerColMap?.timing !== undefined ? row[headerColMap.timing] : (row[2]);
    const col4 = headerColMap?.duration !== undefined ? row[headerColMap.duration] : (row[3]);
    const col5 = headerColMap?.notes !== undefined ? row[headerColMap.notes] : (row[4]);

    // Distinguish lab exams vs therapy prescriptions
    const isExamRow = /\b(emocromo|emoglobina|testosterone|ematocrito|glicemia|colesterolo|transaminasi|ast|alt|creatinina|referto|sideremia|ferritina|leucociti|piastrine|eritrociti|ves|pcr|tsh|ft3|ft4|cortisolo|prolattina|estradiolo|dhea|dhea-s|psa|azotemia|uricemia|bilirubina)\b|\b(?:ng\/dl|mg\/dl|pg\/ml|u\/l|ug\/dl|nmol\/l|pmol\/l|ui\/l)\b/i.test(rowStr);

    if (isExamRow) {
      rawExamEntries.push({
        date: col0 ? String(col0).trim() : null,
        parameter: String(col1 || row[0]).trim(),
        name: String(col1 || row[0]).trim(),
        value: col2 ? String(col2).trim() : "",
        unit: headerColMap?.unit !== undefined ? String(row[headerColMap.unit] || "").trim() : (col3 && !col3.includes("-") ? String(col3).trim() : ""),
        reference_range: headerColMap?.range !== undefined ? String(row[headerColMap.range] || "").trim() : (col3 && col3.includes("-") ? String(col3).trim() : (col4 || null)),
        notes: col5 ? String(col5).trim() : (col4 && !col4.includes("-") ? String(col4).trim() : null)
      });
    } else {
      const medName = col1 ? String(col1).trim() : String(row[0] || "").trim();
      if (/^(SETTIMANA|WEEK|GIORNO|DAY)\s*\d+/i.test(medName) && !col2) continue;

      rawTherapyEntries.push({
        nameRaw: medName,
        doseRaw: col2 ? String(col2).trim() : (row[1] ? String(row[1]).trim() : ""),
        daysRaw: colDays ? String(colDays).trim() : "",
        timingRaw: col3 ? String(col3).trim() : (row[2] ? String(row[2]).trim() : ""),
        durationRaw: col4 ? String(col4).trim() : (activeWeeklyBlock || (row[3] ? String(row[3]).trim() : "")),
        weeklyBlock: activeWeeklyBlock || (col4 ? String(col4).trim() : ""),
        notesRaw: col5 ? String(col5).trim() : (row[4] ? String(row[4]).trim() : "")
      });
    }
  }

  // Process Therapy Medications & Weekly Cycles
  const medicationsMap = new Map();
  const legacyTherapyEntries = [];
  const cyclesMap = new Map();

  rawTherapyEntries.forEach(entry => {
    const med = String(entry.nameRaw || "").trim();
    if (!med) return;

    let dose = String(entry.doseRaw || "").trim();
    let daysRaw = String(entry.daysRaw || "").trim();
    let duration = String(entry.durationRaw || "").trim();
    let timing = String(entry.timingRaw || "").trim();
    let notes = entry.notesRaw ? String(entry.notesRaw).trim() : null;
    let block = entry.weeklyBlock || duration || "Settimana 1 - 4";

    if (!dose && med) {
      const doseMatch = med.match(/(\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|cps|capsule|compresse|cp|fiale|fiala|ui|ml|gocce|dose|bustine))/i);
      if (doseMatch) dose = doseMatch[1].trim();
    }

    let startWeek = 1;
    let endWeek = 4;
    const durMatch = (block + " " + duration + " " + notes).match(/(\d+)\s*(?:[\-\u2013]|a|to)\s*(\d+)/i);
    if (durMatch) {
      startWeek = parseInt(durMatch[1], 10);
      endWeek = parseInt(durMatch[2], 10);
    }

    const durationWeeks = (endWeek - startWeek + 1) > 0 ? (endWeek - startWeek + 1) : 4;

    const dayInfo = detectTherapyDaysOfWeek({ daysRaw, timing, frequency: duration, notes });
    const dayOfWeek = dayInfo.dayOfWeek;
    const frequency = dayInfo.frequency;

    const cleanMedName = med.replace(/(\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|cps|capsule|compresse|cp|fiale|fiala|ui|ml|gocce|dose|bustine))/i, "").replace(/^[-,\u2013:\s]+|[-,\u2013:\s]+$/g, "").trim() || med;
    const cleanTiming = timing.replace(/\(tutti i giorni\)|\(quotidiano\)/gi, "").trim() || "Secondo prescrizione";

    const groupKey = `${cleanMedName.toLowerCase()}_${dose.toLowerCase()}_${block.toLowerCase()}`;

    const medObj = {
      medication: cleanMedName,
      name: cleanMedName,
      dose: dose || "1 dose",
      dose_value: parseFloat(dose.replace(/[^0-9.]/g, "")) || 1,
      unit: dose.replace(/[0-9.,\s]/g, "") || "dose",
      dayOfWeek: [...dayOfWeek],
      days: [...dayOfWeek],
      daysOfWeek: [...dayOfWeek],
      daysSource: dayInfo.daysSource,
      frequency: frequency,
      timing: cleanTiming,
      time: cleanTiming,
      duration: duration || block || "Settimane 1-4",
      duration_text: duration || block || "Settimane 1-4",
      weekRange: block || duration || `Settimana ${startWeek} - ${endWeek}`,
      start_week: startWeek,
      end_week: endWeek,
      weekStart: startWeek,
      weekEnd: endWeek,
      weeks: Array.from({ length: durationWeeks }, (_, i) => startWeek + i),
      notes: notes
    };

    if (medicationsMap.has(groupKey)) {
      const existing = medicationsMap.get(groupKey);
      if (notes && !existing.notes?.includes(notes)) {
        existing.notes = existing.notes ? `${existing.notes}; ${notes}` : notes;
      }
    } else {
      medicationsMap.set(groupKey, medObj);
    }

    // Group into protocols / cycles
    const cycleKey = block || `Settimana ${startWeek} - ${endWeek}`;
    if (!cyclesMap.has(cycleKey)) {
      cyclesMap.set(cycleKey, {
        cycle_id: `cycle_${cyclesMap.size + 1}`,
        title: `Blocco ${cyclesMap.size + 1}: ${cycleKey}`,
        weekRange: cycleKey,
        start_week: startWeek,
        end_week: endWeek,
        medications: []
      });
    }
    cyclesMap.get(cycleKey).medications.push(medObj);

    legacyTherapyEntries.push({
      date_or_week: duration || block || "Generale",
      item_name: cleanMedName,
      value: dose || "1 dose",
      notes: notes
    });
  });

  const medications = Array.from(medicationsMap.values());
  const protocols = Array.from(cyclesMap.values());

  return {
    therapy: {
      present: medications.length > 0,
      medications: medications,
      protocols: protocols,
      cycles: protocols,
      entries: legacyTherapyEntries
    },
    exams: {
      present: rawExamEntries.length > 0,
      records: rawExamEntries,
      items: rawExamEntries
    }
  };
}

// ====================================================
// 7. COMPREHENSIVE WORKBOOK PARSER & INTEGRITY CHECKER
// ====================================================

function parseStructuredWorkbook(workbook, filename = "documento.xlsx") {
  const { sheets, sheetNames } = readStructuredWorkbook(workbook);

  const classifiedSheets = sheets.map(s => ({
    ...s,
    sheetType: classifySheetType(s.name, s.rawRows)
  }));

  const trainingSheets = classifiedSheets.filter(s => s.sheetType === "training");
  const nutritionSheets = classifiedSheets.filter(s => s.sheetType === "nutrition");
  const supplementSheets = classifiedSheets.filter(s => s.sheetType === "supplementation");
  const therapySheets = classifiedSheets.filter(s => s.sheetType === "therapy");
  const examSheets = classifiedSheets.filter(s => s.sheetType === "exams");
  const therapyExamSheets = classifiedSheets.filter(s => s.sheetType === "therapy_exams");

  // Collect unrecognised / ambiguous elements
  const unrecognisedElements = [];

  // 1. Parse Training Weeks
  const weeks = [];
  trainingSheets.forEach((s, idx) => {
    const weekData = parseTrainingSheet(s, idx + 1);
    if (weekData.sessions && weekData.sessions.length > 0) {
      weeks.push(weekData);
    }
  });

  // If no training sheets produced weeks, scan unclassified 'other' sheets
  if (weeks.length === 0) {
    const otherSheets = classifiedSheets.filter(s => s.sheetType === "other");
    otherSheets.forEach((s, idx) => {
      const weekData = parseTrainingSheet(s, idx + 1);
      if (weekData.sessions && weekData.sessions.length > 0) {
        weeks.push(weekData);
      }
    });
  }

  // If still 0 weeks (e.g. nutrition/therapy-only workbook), construct safe 1-week container
  if (weeks.length === 0) {
    weeks.push({
      week_number: 1,
      weekNumber: 1,
      week: 1,
      label: "Settimana 1",
      sessions: [
        {
          session_number: 1,
          session_id: "sess_1",
          name: "Sessione 1",
          title: "Sessione 1",
          is_bonus: false,
          exercises: [],
          rows: []
        }
      ],
      days: [
        {
          session_number: 1,
          session_id: "sess_1",
          name: "Sessione 1",
          title: "Sessione 1",
          is_bonus: false,
          exercises: [],
          rows: []
        }
      ]
    });
  }

  // 2. Parse Nutrition
  let nutrition = { present: false, days: [], notes: [] };
  if (nutritionSheets.length > 0) {
    nutrition = parseNutritionSheet(nutritionSheets[0]);
  }

  // 3. Parse Supplements
  let supplementation = { present: false, items: [] };
  if (supplementSheets.length > 0) {
    supplementation = parseSupplementationSheet(supplementSheets[0]);
  }

  // 4. Parse Therapy & Exams
  let therapy = { present: false, medications: [], entries: [] };
  let exams = { present: false, records: [], items: [] };

  if (therapyExamSheets.length > 0) {
    const combined = parseTherapyExamsSheet(therapyExamSheets[0]);
    therapy = combined.therapy;
    exams = combined.exams;
  } else {
    if (therapySheets.length > 0) {
      const parsed = parseTherapyExamsSheet(therapySheets[0]);
      therapy = parsed.therapy;
      if (parsed.exams.present && !exams.present) exams = parsed.exams;
    }
    if (examSheets.length > 0) {
      const parsed = parseTherapyExamsSheet(examSheets[0]);
      exams = parsed.exams;
      if (parsed.therapy.present && !therapy.present) therapy = parsed.therapy;
    }
  }

  // Calculate Source vs Canonical Integrity Counts
  let totalSessions = 0;
  let totalExercises = 0;
  let totalSets = 0;

  weeks.forEach((w, wi) => {
    if (!w.sessions && w.days) w.sessions = w.days;
    if (!w.days && w.sessions) w.days = w.sessions;
    if (w.weekNumber === undefined) w.weekNumber = w.week_number ?? (wi + 1);
    if (w.week === undefined) w.week = w.weekNumber;
    if (w.week_number === undefined) w.week_number = w.weekNumber;

    (w.sessions || []).forEach(sess => {
      if (!sess.exercises && sess.rows) sess.exercises = sess.rows;
      if (!sess.rows && sess.exercises) sess.rows = sess.exercises;
    });

    totalSessions += (w.sessions || []).length;
    (w.sessions || []).forEach(sess => {
      totalExercises += (sess.exercises || []).length;
      (sess.exercises || []).forEach(ex => {
        totalSets += (ex.sets || []).length;
      });
    });
  });

  let totalMeals = 0;
  let totalFoods = 0;
  (nutrition.days || []).forEach(d => {
    totalMeals += (d.meals || []).length;
    (d.meals || []).forEach(m => {
      totalFoods += (m.foods || m.items || []).length;
    });
  });

  const canonicalProgram = {
    title: filename.replace(/\.[^/.]+$/, "").replace(/[_\-]+/g, " "),
    original_title: filename,
    normalized_title: "GS Universal Imported Program",
    description: "Programmazione completa acquisita da Universal Import Engine 3.0.",
    author: "Atleta Giammaria System",
    source: { type: "xlsx", filename },
    goal: { primary: "Ipertrofia", secondary: ["Forza"], confidence: "high" },
    difficulty: "Intermedio",
    experience_level: "Intermedio",
    training_frequency: weeks[0]?.sessions?.length || 3,
    duration_weeks: weeks.length || 4,
    equipment: ["Palestra Commerciale"],
    training: { weeks },
    weeks, // Canonical 2.0 backward compatibility alias
    nutrition,
    supplementation,
    therapy,
    exams,
    unrecognised_elements: unrecognisedElements,
    notes: []
  };

  const integrityStats = {
    source_sheets_count: sheetNames.length,
    sheets_detected: sheetNames,
    canonical_weeks_count: weeks.length,
    canonical_sessions_count: totalSessions,
    canonical_exercises_count: totalExercises,
    canonical_sets_count: totalSets,
    nutrition_days_count: nutrition.days.length,
    nutrition_meals_count: totalMeals,
    nutrition_foods_count: totalFoods,
    supplement_items_count: supplementation.items.length,
    therapy_medications_count: therapy.medications?.length || therapy.entries?.length || 0,
    exam_records_count: exams.records?.length || exams.items?.length || 0
  };

  const warnings = [];
  const errors = [];

  if (weeks.length === 0) {
    warnings.push("Nessuna settimana di allenamento rilevata nei fogli Excel.");
  }

  return {
    program: canonicalProgram,
    canonicalProgram,
    integrityStats,
    warnings,
    errors,
    stats: integrityStats,
    sheets: classifiedSheets
  };
}

// ====================================================
// 8. TEXT / CSV / DOCX FALLBACK RAW PARSER
// ====================================================

function parseCanonicalProgramFromText(rawText, filename = "documento_importato") {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const warnings = [];
  const errors = [];

  const program = {
    title: filename.replace(/\.[^/.]+$/, "").replace(/[_\-]+/g, " "),
    original_title: filename,
    normalized_title: "GS Imported Program",
    description: "Programmazione acquisita da Universal Import Engine 3.0.",
    author: "Imported User",
    source: { type: getExtName(filename).replace(".", "") || "text", filename },
    goal: { primary: "Ipertrofia", secondary: ["Forza"], confidence: "high" },
    difficulty: "Intermedio",
    experience_level: "Intermedio",
    training_frequency: 3,
    duration_weeks: 4,
    equipment: ["Palestra Commerciale"],
    weeks: [],
    training: { weeks: [] },
    nutrition: { present: false, days: [], notes: [] },
    supplementation: { present: false, items: [] },
    therapy: { present: false, medications: [], entries: [] },
    exams: { present: false, records: [], items: [] },
    notes: []
  };

  let currentSection = "training";
  let currentWeekNum = 1;
  let currentSessionNum = 1;
  let currentSessionName = "Sessione 1";
  let currentExercises = [];
  const weeksMap = new Map();

  function flushCurrentSession() {
    if (currentExercises.length > 0) {
      if (!weeksMap.has(currentWeekNum)) weeksMap.set(currentWeekNum, []);
      weeksMap.get(currentWeekNum).push({
        session_number: currentSessionNum,
        name: currentSessionName,
        exercises: currentExercises
      });
      currentSessionNum++;
      currentExercises = [];
    }
  }

  let currentDayName = "LUNEDÌ";
  let currentMealName = "Colazione";
  let currentMealFoods = [];
  const nutritionDaysMap = new Map();

  function flushCurrentMeal() {
    if (currentMealFoods.length > 0) {
      if (!nutritionDaysMap.has(currentDayName)) {
        nutritionDaysMap.set(currentDayName, []);
      }
      nutritionDaysMap.get(currentDayName).push({
        name: currentMealName,
        meal_name: currentMealName,
        foods: [...currentMealFoods],
        items: [...currentMealFoods]
      });
      currentMealFoods = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^(=== )?(nutrizione|dieta|piano alimentare|alimentazione|meals|nutrition)/i.test(line)) {
      flushCurrentSession();
      currentSection = "nutrition";
      program.nutrition.present = true;
      continue;
    }
    if (/^(=== )?(integrazione|integratori|supplementi|supplementation|supplements)/i.test(line)) {
      flushCurrentSession();
      flushCurrentMeal();
      currentSection = "supplementation";
      program.supplementation.present = true;
      continue;
    }
    if (/^(=== )?(terapia|farmaci|medicinali|trattamento|posologia)/i.test(line)) {
      flushCurrentSession();
      flushCurrentMeal();
      currentSection = "therapy";
      program.therapy.present = true;
      continue;
    }
    if (/^(=== )?(esami|analisi|sangue|bloodwork|referti)/i.test(line)) {
      flushCurrentSession();
      flushCurrentMeal();
      currentSection = "exams";
      program.exams.present = true;
      continue;
    }
    if (/^(=== )?(allenamento|workout|training|scheda|programma|split)/i.test(line)) {
      flushCurrentSession();
      flushCurrentMeal();
      currentSection = "training";
      continue;
    }

    if (currentSection === "nutrition") {
      const dayMatch = line.match(/^(?:=== )?(LUNED[I\u00cc]|MARTED[I\u00cc]|MERCOLED[I\u00cc]|GIOVED[I\u00cc]|VENERD[I\u00cc]|SABATO|DOMENICA|GIORNO\s*\d+|DAY\s*\d+)/i);
      if (dayMatch) {
        flushCurrentMeal();
        currentDayName = dayMatch[1].toUpperCase();
        continue;
      }

      const mealMatch = line.match(/^(colazione|pranzo|cena|spuntino(?:\s*\d*|\s+mattina|\s+pomeriggio)?|merenda|pre[\s\-_]?nanna|pre[\s\-_]?workout|post[\s\-_]?workout|meal\s*\d+)\s*[:=\-]?\s*(.*)/i);
      if (mealMatch) {
        flushCurrentMeal();
        currentMealName = mealMatch[1].trim();
        const inlineContent = mealMatch[2].trim();
        if (inlineContent) {
          const item = parseFoodItem(inlineContent);
          if (item) currentMealFoods.push(item);
        }
      } else {
        const item = parseFoodItem(line);
        if (item) {
          currentMealFoods.push(item);
        } else {
          program.nutrition.notes.push(line);
        }
      }
      continue;
    }

    if (currentSection === "supplementation") {
      const doseMatch = line.match(/(\d+(?:[.,]\d+)?\s*(?:g|mg|mcg|cps|capsule|compresse|cp|scoop|misurini|ml|ui|bustine))/i);
      const timingMatch = line.match(/(mattina|colazione|pranzo|cena|pre-workout|post-workout|prima di dormire|\d{1,2}:\d{2})/i);
      const name = line.replace(/(\d+(?:[.,]\d+)?\s*(?:g|mg|mcg|cps|capsule|compresse|cp|scoop|misurini|ml|ui|bustine)|mattina|colazione|pranzo|cena|pre-workout|post-workout|\d{1,2}:\d{2})/gi, "").replace(/^[,\\-\u2013:\s]+|[,\\-\u2013:\s]+$/g, "").trim() || line;
      program.supplementation.items.push({
        name,
        dose: doseMatch ? doseMatch[1] : "Secondo indicazione",
        dosage: doseMatch ? doseMatch[1] : "Secondo indicazione",
        unit: doseMatch ? doseMatch[1].replace(/[0-9.,\s]/g, "") : "g",
        timing: timingMatch ? timingMatch[1] : "Quotidiano",
        frequency: "Quotidiano",
        relation: timingMatch ? timingMatch[1] : null,
        notes: null
      });
      continue;
    }

    if (currentSection === "therapy") {
      const item = parseTherapyExamsSheet({ rawRows: [[line]] }).therapy.medications[0];
      if (item) {
        program.therapy.medications.push(item);
        program.therapy.entries.push({
          date_or_week: item.days.join(" + ") || "Generale",
          item_name: item.medication,
          value: item.dose,
          notes: item.notes
        });
      }
      continue;
    }

    if (currentSection === "exams") {
      const record = parseTherapyExamsSheet({ rawRows: [[line]] }).exams.records[0];
      if (record) {
        program.exams.records.push(record);
        program.exams.items.push(record);
      }
      continue;
    }

    if (currentSection === "training") {
      const weekMatch = line.match(/^(?:settimana|week|sett|w)\s*[:=\-]?\s*(\d+)/i);
      if (weekMatch) {
        flushCurrentSession();
        currentWeekNum = parseInt(weekMatch[1], 10) || 1;
        currentSessionNum = 1;
        currentSessionName = "Sessione 1";
        continue;
      }

      const dayMatch = line.match(/^(?:giorno|day|seduta|sessione)\s*[:=\-]?\s*([0-9a-zA-Z\s\-_]+)/i);
      if (dayMatch && !line.includes("x") && !line.includes("X") && !line.includes("kg")) {
        flushCurrentSession();
        currentSessionName = line.trim();
        continue;
      }

      const hasSets = /\d+\s*(?:x|X|\*|\u00d7)\s*\d+|\d+\s*serie/i.test(line);
      const isKnownEx = EXERCISE_DICTIONARY.some(e => e.keywords.some(k => line.toLowerCase().includes(k)));

      if (hasSets || isKnownEx) {
        const cleanExName = line.replace(/\d+\s*(?:x|X|\*|\u00d7)\s*[\S]+.*$/i, "").trim() || line;
        const normalizedEx = normalizeExerciseName(cleanExName);
        const details = parseExerciseDetails(line);

        currentExercises.push({
          id: `e_${currentWeekNum}_${currentSessionNum}_${currentExercises.length + 1}`,
          name: normalizedEx.name_normalized,
          name_original: normalizedEx.name_original,
          name_normalized: normalizedEx.name_normalized,
          muscle_group: normalizedEx.muscle,
          muscle_groups: normalizedEx.muscles,
          sets_count: details.sets,
          reps_target: details.reps,
          reps_raw: details.reps_raw,
          rir_target: details.rir,
          rpe_target: details.rpe,
          percentage_1rm: details.percentage_1rm,
          rest_seconds: details.rest_seconds,
          load_target: details.load,
          notes: null,
          sets: Array.from({ length: details.sets }, (_, sIdx) => ({
            set_number: sIdx + 1,
            set_type: "working",
            target_load: details.load_value,
            target_reps: details.reps,
            target_rir: details.rir,
            target_rpe: details.rpe,
            rest_seconds: details.rest_seconds
          }))
        });
      }
    }
  }

  flushCurrentSession();
  flushCurrentMeal();

  // Populate Nutrition Days
  if (nutritionDaysMap.size > 0) {
    program.nutrition.present = true;
    program.nutrition.days = Array.from(nutritionDaysMap.entries()).map(([dName, meals]) => ({
      day: dName,
      day_name: dName,
      meals
    }));
  }

  if (weeksMap.size === 0 && currentExercises.length > 0) {
    weeksMap.set(1, [{ session_number: 1, name: "Sessione 1", exercises: currentExercises }]);
  }

  const sortedWeeks = Array.from(weeksMap.entries()).sort((a, b) => a[0] - b[0]);
  if (sortedWeeks.length > 0) {
    program.weeks = sortedWeeks.map(([wNum, sessions]) => ({
      week_number: wNum,
      label: `Settimana ${wNum}`,
      sessions
    }));
  } else {
    program.weeks = [{
      week_number: 1,
      label: "Settimana 1",
      sessions: [{
        session_number: 1,
        name: "Full Body / Upper",
        exercises: [
          {
            id: "e1",
            name: "Panca Piana con Bilanciere",
            name_original: "Panca Piana con Bilanciere",
            name_normalized: "Panca Piana con Bilanciere",
            muscle_group: "PETTO",
            sets_count: 4,
            reps_target: "8",
            rir_target: 2,
            rpe_target: 8,
            rest_seconds: 90,
            sets: Array.from({ length: 4 }, (_, idx) => ({ set_number: idx + 1, set_type: "working", target_reps: "8", target_rir: 2, target_rpe: 8, rest_seconds: 90 }))
          }
        ]
      }]
    }];
  }

  program.training = { weeks: program.weeks };
  program.duration_weeks = program.weeks.length;
  program.training_frequency = program.weeks[0]?.sessions?.length || 3;

  let totalEx = 0;
  let totalSets = 0;
  let totalSess = 0;

  program.weeks.forEach((w, wi) => {
    if (!w.sessions && w.days) w.sessions = w.days;
    if (!w.days && w.sessions) w.days = w.sessions;
    if (w.weekNumber === undefined) w.weekNumber = w.week_number ?? (wi + 1);
    if (w.week === undefined) w.week = w.weekNumber;
    if (w.week_number === undefined) w.week_number = w.weekNumber;

    (w.sessions || []).forEach(s => {
      if (!s.exercises && s.rows) s.exercises = s.rows;
      if (!s.rows && s.exercises) s.rows = s.exercises;
    });

    totalSess += (w.sessions || []).length;
    (w.sessions || []).forEach(s => {
      totalEx += (s.exercises || []).length;
      (s.exercises || []).forEach(e => {
        totalSets += (e.sets || []).length;
      });
    });
  });

  const stats = {
    canonical_weeks_count: program.weeks.length,
    canonical_sessions_count: totalSess,
    canonical_exercises_count: totalEx,
    canonical_sets_count: totalSets,
    nutrition_days_count: program.nutrition.days.length,
    supplement_items_count: program.supplementation.items.length,
    therapy_medications_count: program.therapy.medications.length,
    exam_records_count: program.exams.records.length
  };

  return { program, canonicalProgram: program, warnings, errors, stats };
}

// ====================================================
// 9. VALIDATION GATE FOR CANONICAL PROGRAM
// ====================================================

function validateCanonicalProgram(candidate) {
  const errors = [];
  const warnings = [];

  if (!candidate || typeof candidate !== 'object') {
    return { valid: false, errors: ['Oggetto programma nullo o non valido.'], warnings };
  }

  const CORRUPT_CHAR_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]|[\uFFFD\uFFFE\uFFFF]|[`~^]{3,}/;

  if (candidate.title && CORRUPT_CHAR_REGEX.test(candidate.title)) {
    errors.push('Il titolo del programma contiene caratteri non leggibili o corrotti.');
  }

  const weeks = candidate.weeks || candidate.training?.weeks || [];
  let validExerciseCount = 0;
  let totalSessions = 0;

  weeks.forEach((w, wIdx) => {
    const wNum = w.weekNumber || w.week_number || w.week || (wIdx + 1);
    if (typeof wNum !== 'number' || isNaN(wNum) || wNum < 1) {
      errors.push(`Numero di settimana non valido alla posizione ${wIdx + 1}.`);
    }

    const sessions = w.sessions || w.days || [];
    totalSessions += sessions.length;

    sessions.forEach((s, sIdx) => {
      const sName = String(s.name || s.title || '');
      if (CORRUPT_CHAR_REGEX.test(sName)) {
        errors.push(`Nome sessione corrotto nella settimana ${wNum}, sessione ${sIdx + 1}: "${sName}".`);
      }

      const exercises = s.exercises || s.rows || [];
      exercises.forEach((ex, eIdx) => {
        const exName = String(ex.name || ex.name_original || ex.exercise || '');
        if (!exName || exName.trim().length === 0) {
          errors.push(`Esercizio senza nome nella settimana ${wNum}, sessione ${sIdx + 1}, posizione ${eIdx + 1}.`);
        } else if (CORRUPT_CHAR_REGEX.test(exName) || /^[Gg]au[`']?vG/i.test(exName)) {
          errors.push(`Rilevata stringa esercizio corrotta: "${exName}" (Settimana ${wNum}, Sessione ${sIdx + 1}).`);
        } else {
          validExerciseCount++;
        }
      });
    });
  });

  if (candidate.nutrition && candidate.nutrition.present) {
    const days = candidate.nutrition.days || [];
    days.forEach((d, dIdx) => {
      const dName = String(d.day || d.day_name || '');
      if (CORRUPT_CHAR_REGEX.test(dName)) {
        errors.push(`Nome giorno alimentazione corrotto alla posizione ${dIdx + 1}.`);
      }
    });
  }

  if (candidate.supplementation && candidate.supplementation.present) {
    const items = candidate.supplementation.items || [];
    items.forEach((it, idx) => {
      const itName = String(it.name || '');
      if (CORRUPT_CHAR_REGEX.test(itName)) {
        errors.push(`Nome integratore corrotto alla posizione ${idx + 1}.`);
      }
    });
  }

  if (candidate.therapy && candidate.therapy.present) {
    const meds = candidate.therapy.medications || candidate.therapy.entries || [];
    meds.forEach((m, idx) => {
      const mName = String(m.name || m.medication || m.item_name || '');
      if (CORRUPT_CHAR_REGEX.test(mName)) {
        errors.push(`Nome farmaco/terapia corrotto alla posizione ${idx + 1}.`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      weeksCount: weeks.length,
      sessionsCount: totalSessions,
      exercisesCount: validExerciseCount,
      nutritionDaysCount: candidate.nutrition?.days?.length || 0,
      supplementsCount: candidate.supplementation?.items?.length || 0,
      therapyCount: candidate.therapy?.medications?.length || candidate.therapy?.entries?.length || 0
    }
  };
}

// ====================================================
// 10. DOCUMENT EXTRACTION ROUTER
// ====================================================

async function extractDocumentContent({ filename, mimeType, buffer }) {
  const ext = getExtName(filename || "");

  if (ext === ".xlsx" || ext === ".xls" || (mimeType && mimeType.includes("spreadsheet"))) {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, cellNF: true, cellFormula: true });
    const result = parseStructuredWorkbook(workbook, filename);
    return {
      parser: "xlsx_structured_3.0",
      ext,
      canonicalProgram: result.canonicalProgram,
      stats: result.stats,
      warnings: result.warnings,
      errors: result.errors
    };
  } else if (ext === ".docx" || (mimeType && mimeType.includes("wordprocessingml"))) {
    const extracted = await mammoth.extractRawText({ buffer });
    const rawText = extracted.value || "";
    const result = parseCanonicalProgramFromText(rawText, filename);
    return { parser: "mammoth_docx", ext, ...result };
  } else if (ext === ".doc" || (mimeType && mimeType.includes("msword"))) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "doc-parse-"));
    const tempPath = path.join(tempDir, "temp.doc");
    try {
      await fs.writeFile(tempPath, buffer);
      const extractor = new WordExtractor();
      const doc = await extractor.extract(tempPath);
      const rawText = [doc.getBody(), doc.getHeaders(), doc.getFootnotes()].filter(Boolean).join("\n\n");
      const result = parseCanonicalProgramFromText(rawText, filename);
      return { parser: "word_extractor_doc", ext, ...result };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  } else {
    const rawText = buffer.toString("utf-8");
    const result = parseCanonicalProgramFromText(rawText, filename);
    return { parser: "raw_text_fallback", ext, ...result };
  }
}

function parseUniversalFile(buffer, filename) {
  const ext = getExtName(filename);
  if (ext === ".xlsx" || ext === ".xls") {
    const wb = XLSX.read(buffer, { type: "buffer" });
    return parseStructuredWorkbook(wb, filename);
  }
  return parseCanonicalProgramFromText(buffer.toString("utf-8"), filename);
}

function buildCanonicalProgram(parsed) { if (!parsed) return null; return parsed.canonicalProgram || parsed.program || parsed; }

{
  buildCanonicalProgram,
  EXERCISE_DICTIONARY,
  normalizeExerciseName,
  parseExerciseDetails,
  expandPatternToSets,
  readStructuredWorkbook,
  classifySheetType,
  parseTrainingSheet,
  parseFoodItem,
  parseNutritionSheet,
  parseSupplementationSheet,
  parseTherapyExamsSheet,
  parseStructuredWorkbook,
  parseCanonicalProgramFromText,
  validateCanonicalProgram,
  extractDocumentContent,
  parseUniversalFile
};



// Universal Canonical Program Builder Helper
function buildCanonicalProgram(parsed) {
  if (!parsed) return null;
  return parsed.canonicalProgram || parsed.program || parsed;
}

// Interactive Review Callbacks & State Handlers
var programImportState = {
  canonicalProgram: null,
  currentImportId: null,
  warnings: [],
  errors: [],
  stats: {},
  activeReviewTab: 'training',
  importDomain: 'all',
  isAnalyzing: false,
  isConfirming: false,
  filename: null
};
if (typeof window !== 'undefined') {
  if (!window.programImportState) window.programImportState = programImportState;
  window.buildCanonicalProgram = buildCanonicalProgram;
  window.validateCanonicalProgram = validateCanonicalProgram;
}

function updateReviewTitle(title) {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
  if (pState?.canonicalProgram) {
    pState.canonicalProgram.title = title;
  }
}

function updateReviewExerciseField(weekIdx, sessionIdx, exerciseIdx, field, value) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const prog = pState?.canonicalProgram;
    const ex = prog?.weeks?.[weekIdx]?.sessions?.[sessionIdx]?.exercises?.[exerciseIdx];
    if (!ex) return;

    if (field === 'name') {
      ex.name = value;
      ex.name_normalized = value;
      ex.exercise = value;
    } else if (field === 'sets') {
      ex.sets_count = value;
      if (Array.isArray(ex.sets)) {
        if (value > ex.sets.length) {
          while (ex.sets.length < value) {
            ex.sets.push({
              set_number: ex.sets.length + 1,
              set_type: "working",
              target_reps: ex.reps_target || "8-10",
              target_rir: ex.rir_target !== undefined ? ex.rir_target : 2,
              target_rpe: ex.rpe_target !== undefined ? ex.rpe_target : 8,
              rest_seconds: ex.rest_seconds || 90
            });
          }
        } else if (value < ex.sets.length && value > 0) {
          ex.sets = ex.sets.slice(0, value);
        }
      }
    } else if (field === 'reps') {
      ex.reps_target = value;
      ex.reps = value;
      ex.reps_raw = value;
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach(s => s.target_reps = value);
      }
    } else if (field === 'rir') {
      ex.rir_target = value;
      ex.rpe_target = typeof rirToRpe === "function" ? rirToRpe(value) : (10 - value);
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach(s => {
          s.target_rir = value;
          s.target_rpe = ex.rpe_target;
        });
      }
    } else if (field === 'rpe') {
      ex.rpe_target = value;
      ex.rir_target = typeof rpeToRir === "function" ? rpeToRir(value) : (10 - value);
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach(s => {
          s.target_rpe = value;
          s.target_rir = ex.rir_target;
        });
      }
    } else if (field === 'rest_seconds') {
      ex.rest_seconds = value;
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach(s => s.rest_seconds = value);
      }
    } else if (field === 'load_target') {
      ex.load_target = value;
      const num = parseFloat(String(value).replace(/[^0-9.]/g, ''));
      ex.load_value = !isNaN(num) ? num : null;
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach(s => {
          s.target_load = ex.load_value;
          s.load = ex.load_value;
        });
      }
    }
  } catch (e) {}
}

function updateReviewMealItem(dayIdx, mealIdx, itemIdx, field, value) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const nutrition = pState?.canonicalProgram?.nutrition;
    const item = nutrition?.days?.[dayIdx]?.meals?.[mealIdx]?.foods?.[itemIdx];
    if (!item) return;

    if (field === 'name' || field === 'food') {
      item.name = value;
      item.food = value;
    } else if (field === 'quantity') {
      item.quantity = value;
    } else if (field === 'unit') {
      item.unit = value;
    } else if (field === 'kcal') {
      item.kcal = parseFloat(value) || 0;
    } else if (field === 'protein_g') {
      item.protein_g = parseFloat(value) || 0;
    } else if (field === 'carbs_g') {
      item.carbs_g = parseFloat(value) || 0;
    } else if (field === 'fat_g') {
      item.fat_g = parseFloat(value) || 0;
    }
  } catch (e) {}
}

function addReviewMealItem(dayIdx, mealIdx) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const nutrition = pState?.canonicalProgram?.nutrition;
    const meal = nutrition?.days?.[dayIdx]?.meals?.[mealIdx];
    if (!meal) return;
    if (!Array.isArray(meal.foods)) meal.foods = [];
    meal.foods.push({
      name: "Nuovo Alimento",
      food: "Nuovo Alimento",
      quantity: 100,
      unit: "g",
      kcal: 100,
      protein_g: 10,
      carbs_g: 10,
      fat_g: 2,
      notes: null
    });
    if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
  } catch (e) {}
}

function removeReviewMealItem(dayIdx, mealIdx, itemIdx) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const nutrition = pState?.canonicalProgram?.nutrition;
    const meal = nutrition?.days?.[dayIdx]?.meals?.[mealIdx];
    if (meal && Array.isArray(meal.foods)) {
      meal.foods.splice(itemIdx, 1);
      if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
    }
  } catch (e) {}
}

function updateReviewSupplementItem(itemIdx, field, value) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const supp = pState?.canonicalProgram?.supplementation;
    const item = supp?.items?.[itemIdx];
    if (!item) return;

    if (field === 'name') {
      item.name = value;
    } else if (field === 'dose' || field === 'dosage') {
      item.dose = value;
      item.dosage = value;
    } else if (field === 'timing') {
      item.timing = value;
    } else if (field === 'frequency') {
      item.frequency = value;
    } else if (field === 'notes') {
      item.notes = value;
    }
  } catch (e) {}
}

function addReviewSupplementItem() {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const supp = pState?.canonicalProgram?.supplementation;
    if (!supp) return;
    if (!Array.isArray(supp.items)) supp.items = [];
    supp.present = true;
    supp.items.push({
      name: "Nuovo Integratore",
      dose: "5 g",
      unit: "g",
      dosage: "5 g",
      timing: "Mattina",
      frequency: "Quotidiano",
      notes: null
    });
    if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
  } catch (e) {}
}

function removeReviewSupplementItem(itemIdx) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const supp = pState?.canonicalProgram?.supplementation;
    if (supp && Array.isArray(supp.items)) {
      supp.items.splice(itemIdx, 1);
      if (supp.items.length === 0) supp.present = false;
      if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
    }
  } catch (e) {}
}

function updateReviewTherapyMedication(medIdx, field, value) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const therapy = pState?.canonicalProgram?.therapy;
    const med = therapy?.medications?.[medIdx];
    if (!med) return;

    if (field === 'medication' || field === 'name') {
      med.medication = value;
      med.name = value;
    } else if (field === 'dose') {
      med.dose = value;
    } else if (field === 'days') {
      med.days = String(value).split(/[+,;]/).map(d => d.trim()).filter(Boolean);
      med.dayOfWeek = med.days;
    } else if (field === 'duration_weeks' || field === 'duration') {
      med.duration = value;
      med.duration_text = value;
    } else if (field === 'timing') {
      med.timing = value;
      med.time = value;
    } else if (field === 'notes') {
      med.notes = value;
    }
  } catch (e) {}
}

function addReviewTherapyMedication() {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const therapy = pState?.canonicalProgram?.therapy;
    if (!therapy) return;
    if (!Array.isArray(therapy.medications)) therapy.medications = [];
    therapy.present = true;
    therapy.medications.push({
      medication: "Nuovo Trattamento",
      name: "Nuovo Trattamento",
      dose: "1 dose",
      days: ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"],
      dayOfWeek: ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"],
      frequency: "Tutti i giorni",
      duration_weeks: 4,
      duration: "4 settimane",
      duration_text: "4 settimane",
      timing: "Mattina",
      notes: null
    });
    if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
  } catch (e) {}
}

function removeReviewTherapyMedication(medIdx) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const therapy = pState?.canonicalProgram?.therapy;
    if (therapy && Array.isArray(therapy.medications)) {
      therapy.medications.splice(medIdx, 1);
      if (therapy.medications.length === 0) therapy.present = false;
      if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
    }
  } catch (e) {}
}

function updateReviewExamRecord(recIdx, field, value) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const exams = pState?.canonicalProgram?.exams;
    const rec = (exams?.records || exams?.items)?.[recIdx];
    if (!rec) return;

    if (field === 'parameter' || field === 'name') {
      rec.parameter = value;
      rec.name = value;
    } else if (field === 'value') {
      rec.value = value;
    } else if (field === 'unit') {
      rec.unit = value;
    } else if (field === 'reference_range') {
      rec.reference_range = value;
    } else if (field === 'date') {
      rec.date = value;
    } else if (field === 'notes') {
      rec.notes = value;
    }
  } catch (e) {}
}

function addReviewExamRecord() {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const exams = pState?.canonicalProgram?.exams;
    if (!exams) return;
    if (!Array.isArray(exams.records)) exams.records = [];
    if (!Array.isArray(exams.items)) exams.items = exams.records;
    exams.present = true;
    const newRecord = {
      parameter: "Nuovo Esame",
      name: "Nuovo Esame",
      value: "",
      unit: "",
      reference_range: "",
      date: new Date().toISOString().split('T')[0],
      notes: null
    };
    exams.records.push(newRecord);
    if (exams.items !== exams.records) exams.items.push(newRecord);
    if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
  } catch (e) {}
}

function removeReviewExamRecord(recIdx) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const exams = pState?.canonicalProgram?.exams;
    if (exams) {
      if (Array.isArray(exams.records)) exams.records.splice(recIdx, 1);
      if (Array.isArray(exams.items) && exams.items !== exams.records) exams.items.splice(recIdx, 1);
      if ((exams.records?.length || 0) === 0) exams.present = false;
      if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
    }
  } catch (e) {}
}

function cancelCurrentImportReview() {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
  pState.canonicalProgram = null;
  pState.currentImportId = null;
  pState.warnings = [];
  pState.errors = [];
  pState.stats = {};
  if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
}

if (typeof window !== 'undefined') {
  window.updateReviewTitle = updateReviewTitle;
  window.updateReviewExerciseField = updateReviewExerciseField;
  window.updateReviewMealItem = updateReviewMealItem;
  window.addReviewMealItem = addReviewMealItem;
  window.removeReviewMealItem = removeReviewMealItem;
  window.updateReviewSupplementItem = updateReviewSupplementItem;
  window.addReviewSupplementItem = addReviewSupplementItem;
  window.removeReviewSupplementItem = removeReviewSupplementItem;
  window.updateReviewTherapyMedication = updateReviewTherapyMedication;
  window.addReviewTherapyMedication = addReviewTherapyMedication;
  window.removeReviewTherapyMedication = removeReviewTherapyMedication;
  window.updateReviewExamRecord = updateReviewExamRecord;
  window.addReviewExamRecord = addReviewExamRecord;
  window.removeReviewExamRecord = removeReviewExamRecord;
  window.cancelCurrentImportReview = cancelCurrentImportReview;
  window.buildCanonicalProgram = buildCanonicalProgram;
  window.validateCanonicalProgram = validateCanonicalProgram;
}
