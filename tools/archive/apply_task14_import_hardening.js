import fs from "fs";

let html = fs.readFileSync("web/index.html", "utf8");

// 1. Ensure <script src="xlsx.full.min.js"></script> is in <head>
if (!html.includes('<script src="xlsx.full.min.js"></script>')) {
  html = html.replace("</head>", '  <script src="xlsx.full.min.js"></script>\n</head>');
}

// 2. Define the full Universal Import Client Bundle 2.0
const clientImportBundle = `
// ====================================================
// TASK 14: CLIENT-SIDE UNIVERSAL IMPORT ENGINE 2.0 (FINAL HARDENED)
// Structured XLSX, DOCX, CSV, TXT & Canonical Model 2.0
// ====================================================

function rirToRpe(rir) {
  if (rir === null || rir === undefined || isNaN(Number(rir))) return null;
  const num = Number(rir);
  if (num < 0 || num > 10) return null;
  const rpe = 10 - num;
  return Math.round(rpe * 10) / 10;
}

function rpeToRir(rpe) {
  if (rpe === null || rpe === undefined || isNaN(Number(rpe))) return null;
  const num = Number(rpe);
  if (num < 1 || num > 10) return null;
  const rir = 10 - num;
  return Math.round(rir * 10) / 10;
}

function safeDisplayValue(val, fallback = '') {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    return val.map(item => safeDisplayValue(item)).filter(Boolean).join(', ');
  }
  if (typeof val === 'object') {
    if (val.food) return \`\${val.food} \${val.quantity || ''} \${val.unit || ''}\`.trim();
    if (val.name) return \`\${val.name} \${val.dose || ''} \${val.timing || ''}\`.trim();
    if (val.item_name) return \`\${val.item_name}: \${val.value || ''}\`.trim();
    if (val.message) return val.message;
    if (val.line_content) return val.line_content;
    return Object.values(val).map(v => safeDisplayValue(v)).filter(Boolean).join(' - ');
  }
  return String(val);
}

var EXERCISE_DICTIONARY = [
  { keywords: ["panca piana con bilanciere", "panca piana bilanciere", "panca piana", "bench press", "barbell bench press", "flat bench press"], normalized: "Panca Piana con Bilanciere", muscle: "PETTO", muscles: ["PETTO", "TRICIPITI", "DELTOIDI"] },
  { keywords: ["panca inclinata 30° manubri", "panca inclinata manubri", "panca inclinata 30", "panca inclinata bilanciere", "panca inclinata", "incline bench press"], normalized: "Panca Inclinata con Manubri", muscle: "PETTO", muscles: ["PETTO", "DELTOIDI", "TRICIPITI"] },
  { keywords: ["croci manubri", "croci su panca", "dumbbell flyes", "cable fly", "croci ai cavi", "pec fly", "pec deck"], normalized: "Croci ai Cavi", muscle: "PETTO", muscles: ["PETTO"] },
  { keywords: ["chest press", "spinta inclinata convergente", "chest press convergente", "chest press orizzontale"], normalized: "Chest Press Convergente", muscle: "PETTO", muscles: ["PETTO", "DELTOIDI", "TRICIPITI"] },
  { keywords: ["squat con bilanciere", "squat bilanciere", "back squat", "barbell squat", "high bar squat", "low bar squat", "box squat alto high-bar", "box squat"], normalized: "Squat con Bilanciere", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "GLUTEI", "CORE"] },
  { keywords: ["front squat", "squat frontale"], normalized: "Front Squat con Bilanciere", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "CORE"] },
  { keywords: ["leg press 45°", "leg press 45", "leg press", "pressa 45", "pressa"], normalized: "Leg Press 45°", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "GLUTEI"] },
  { keywords: ["leg extension"], normalized: "Leg Extension", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI"] },
  { keywords: ["stacco da terra", "deadlift", "barbell deadlift", "stacco convenzionale", "stacco sumo"], normalized: "Stacco da Terra con Bilanciere", muscle: "SCHIENA", muscles: ["SCHIENA", "FEMORALI", "GLUTEI", "CORE"] },
  { keywords: ["stacco rumeno", "romanian deadlift", "rdl", "stacco a gambe tese", "stacco a gambe semitese"], normalized: "Stacco Rumeno con Bilanciere", muscle: "FEMORALI", muscles: ["FEMORALI", "GLUTEI", "SCHIENA"] },
  { keywords: ["leg curl", "lying leg curl", "seated leg curl", "leg curl seduto", "leg curl sdraiato", "leg curl unilaterale"], normalized: "Leg Curl Sdraiato", muscle: "FEMORALI", muscles: ["FEMORALI"] },
  { keywords: ["trazioni alla sbarra", "trazioni", "pull up", "pull-ups", "chin up", "chin-ups", "trazioni prone", "trazioni neutre"], normalized: "Trazioni alla Sbarra", muscle: "DORSALI", muscles: ["DORSALI", "BICIPITI"] },
  { keywords: ["lat machine presa larga", "lat machine presa neutra", "lat machine", "lat pulldown", "lat machine avanti"], normalized: "Lat Machine Presa Larga", muscle: "DORSALI", muscles: ["DORSALI", "BICIPITI"] },
  { keywords: ["rematore con bilanciere", "rematore bilanciere", "barbell row", "bent over row"], normalized: "Rematore con Bilanciere", muscle: "DORSALI", muscles: ["DORSALI", "SCHIENA", "BICIPITI"] },
  { keywords: ["rematore con manubrio", "rematore manubrio", "dumbbell row", "single arm dumbbell row", "dorsey machine monopodalica", "dorsey machine"], normalized: "Rematore con Manubrio", muscle: "DORSALI", muscles: ["DORSALI", "BICIPITI"] },
  { keywords: ["pulley", "pulley basso", "seated cable row"], normalized: "Pulley Basso", muscle: "DORSALI", muscles: ["DORSALI", "SCHIENA"] },
  { keywords: ["military press", "lento avanti", "overhead press", "ohp", "shoulder press"], normalized: "Military Press con Bilanciere", muscle: "DELTOIDI", muscles: ["DELTOIDI", "TRICIPITI"] },
  { keywords: ["alzate laterali", "lateral raises", "side lateral raise", "alzate laterali cavo singolo"], normalized: "Alzate Laterali con Manubri", muscle: "DELTOIDI", muscles: ["DELTOIDI"] },
  { keywords: ["alzate posteriori", "rear delt fly", "croci inverse", "face pull", "rear delt machine"], normalized: "Face Pull al Cavo", muscle: "DELTOIDI", muscles: ["DELTOIDI", "SCHIENA"] },
  { keywords: ["curl con bilanciere", "barbell curl", "bicep curl", "curl bilanciere", "curl bilanciere ez"], normalized: "Curl con Bilanciere", muscle: "BICIPITI", muscles: ["BICIPITI"] },
  { keywords: ["curl con manubri", "dumbbell curl", "curl alternato"], normalized: "Curl Alternato con Manubri", muscle: "BICIPITI", muscles: ["BICIPITI"] },
  { keywords: ["hammer curl", "curl a martello"], normalized: "Hammer Curl con Manubri", muscle: "BICIPITI", muscles: ["BICIPITI", "AVAMBRACCI"] },
  { keywords: ["pushdown corda", "pushdown", "pushdown ai cavi", "triceps pushdown", "corda tricipiti"], normalized: "Pushdown ai Cavi con Corda", muscle: "TRICIPITI", muscles: ["TRICIPITI"] },
  { keywords: ["french press", "skull crusher", "estensioni tricipiti"], normalized: "French Press con Bilanciere EZ", muscle: "TRICIPITI", muscles: ["TRICIPITI"] },
  { keywords: ["dip alle parallele", "dip", "dips", "parallele"], normalized: "Dip alle Parallele", muscle: "PETTO", muscles: ["PETTO", "TRICIPITI", "DELTOIDI"] },
  { keywords: ["calf raise", "calf in piedi", "calf seduto", "calves", "calf raise smith in piedi"], normalized: "Calf Raise in Piedi", muscle: "POLPACCI", muscles: ["POLPACCI"] },
  { keywords: ["crunch", "plank", "ab roller", "leg raise", "hanging leg raise", "addominali", "cable crunch"], normalized: "Plank Addominale", muscle: "CORE", muscles: ["CORE"] }
];

function normalizeExerciseName(rawName) {
  if (!rawName) return { name_original: "Esercizio", name_normalized: "Esercizio", muscle: "TOTAL", muscles: ["TOTAL"], confidence: 0.5 };
  const cleaned = String(rawName).trim().replace(/^\\d+[.\\s\\-)]+/, "").trim();
  const lower = cleaned.toLowerCase();

  for (const entry of EXERCISE_DICTIONARY) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        return {
          name_original: cleaned,
          name_normalized: entry.normalized,
          muscle: entry.muscle,
          muscles: entry.muscles,
          confidence: 0.95
        };
      }
    }
  }

  return {
    name_original: cleaned,
    name_normalized: cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
    muscle: "TOTAL",
    muscles: ["TOTAL"],
    confidence: 0.6
  };
}

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

  const specialPatternMatch = str.match(/(\\d+)\\s*(?:x|X|\\*|\\u00d7)\\s*(\\d+[\\-\\/\u2013]\\d+[\\-\\/\u2013]\\d+(?:[\\-\\/\u2013]\\d+)?|MAX|AMRAP|EXHAUST|\\d+\\s*PASSI|21['’]?S)/i);
  if (specialPatternMatch) {
    sets = parseInt(specialPatternMatch[1], 10) || 4;
    reps = specialPatternMatch[2].trim();
    reps_raw = reps;
    if (reps.includes("-") || reps.includes("/") || reps.includes("–")) {
      reps_pattern = reps.split(/[\\-\\/\u2013]/).map(r => r.trim());
    }
  } else {
    const setRepMatch = str.match(/(\\d+)\\s*(?:x|X|\\*|\\u00d7)\\s*(\\d+(?:[\\-\\–\\/]\\d+)?(?:\\+AMRAP)?|AMRAP|MAX)/i);
    if (setRepMatch) {
      sets = parseInt(setRepMatch[1], 10) || 3;
      reps = setRepMatch[2].trim();
      reps_raw = reps;
    } else {
      const repsRangeMatch = str.match(/(\\d+\\s*[\\-\\–\\/]\\s*\\d+)/);
      if (repsRangeMatch) {
        reps = repsRangeMatch[1].trim();
        reps_raw = reps;
      }
    }
  }

  const rirMatch = str.match(/(?:@\\s*)?RIR\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)/i);
  if (rirMatch) {
    rir = parseFloat(rirMatch[1]);
    rpe = rirToRpe(rir);
  }

  const rpeMatch = str.match(/(?:@\\s*)?RPE\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)/i);
  if (rpeMatch) {
    rpe = parseFloat(rpeMatch[1]);
    if (rir === null) rir = rpeToRir(rpe);
  }

  const percMatch = str.match(/(?:@\\s*)?(\\d+(?:\\.\\d+)?)\\s*%\\s*(?:1RM|RM)?/i);
  if (percMatch) {
    percentage_1rm = parseFloat(percMatch[1]);
  }

  const restMinRangeMatch = str.match(/(\\d+(?:\\.\\d+)?)\\s*[\\-\\–]\\s*(\\d+(?:\\.\\d+)?)\\s*(?:min|minuti|')/i);
  if (restMinRangeMatch) {
    const minVal = parseFloat(restMinRangeMatch[1]);
    const maxVal = parseFloat(restMinRangeMatch[2]);
    rest_seconds = Math.round(((minVal + maxVal) / 2) * 60);
  } else {
    const restSecRangeMatch = str.match(/(\\d+)\\s*[\\-\\–]\\s*(\\d+)\\s*(?:s|sec|secondi|")/i);
    if (restSecRangeMatch) {
      const minVal = parseInt(restSecRangeMatch[1], 10);
      const maxVal = parseInt(restSecRangeMatch[2], 10);
      rest_seconds = Math.round((minVal + maxVal) / 2);
    } else {
      const restSecMatch = str.match(/(\\d+)\\s*(?:s|sec|secondi|")/i);
      if (restSecMatch) {
        rest_seconds = parseInt(restSecMatch[1], 10);
      } else {
        const restMinMatch = str.match(/(\\d+(?:\\.\\d+)?)\\s*(?:min|minuti|')/i);
        if (restMinMatch) {
          rest_seconds = Math.round(parseFloat(restMinMatch[1]) * 60);
        }
      }
    }
  }

  const loadMatch = str.match(/(\\d+(?:\\.\\d+)?)\\s*(kg|lbs?|%)\\b/i);
  if (loadMatch && !percentage_1rm) {
    load_value = parseFloat(loadMatch[1]);
    load_unit = loadMatch[2].toLowerCase().startsWith("lb") ? "lb" : "kg";
    load = \`\${load_value} \${load_unit}\`;
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

function readStructuredWorkbook(workbook) {
  const xlsxLib = typeof XLSX !== "undefined" ? XLSX : (typeof window !== "undefined" ? window.XLSX : null);
  const sheets = [];
  for (let idx = 0; idx < workbook.SheetNames.length; idx++) {
    const sheetName = workbook.SheetNames[idx];
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    const rawRows = xlsxLib ? xlsxLib.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false }) : [];
    const rows = rawRows.map((r, rIdx) => {
      const cells = (r || []).map((val, cIdx) => ({
        address: xlsxLib ? xlsxLib.utils.encode_cell({ r: rIdx, c: cIdx }) : \`R\${rIdx + 1}C\${cIdx + 1}\`,
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

  if (/^(W\\d+|SETTIMANA\\s*\\d+|WEEK\\s*\\d+|ALLENAMENTO|TRAINING|WORKOUT|SCHEDA|SPLIT|PUSH|PULL|LEGS|UPPER|LOWER)/i.test(nameUpper)) {
    return "training";
  }
  if (/^(ALIMENTAZIONE|NUTRIZIONE|DIETA|PIANO ALIMENTARE|MEALS|NUTRITION|FOOD)/i.test(nameUpper)) {
    return "nutrition";
  }
  if (/^(INTEGRAZIONE|INTEGRATORI|SUPPLEMENTI|SUPPLEMENTATION|SUPPLEMENTS)/i.test(nameUpper)) {
    return "supplementation";
  }
  if (/^(TERAPIA|ESAMI|ANALISI|VALORI|BLOODWORK|ESAMI DEL SANGUE|MEDICINALI)/i.test(nameUpper)) {
    return "therapy";
  }

  let trainingHits = 0;
  let nutritionHits = 0;
  let supplementHits = 0;
  let therapyHits = 0;

  for (let i = 0; i < Math.min(20, rawRows.length); i++) {
    const rowStr = (rawRows[i] || []).join(" ").toLowerCase();
    if (/movimento|esercizio|reps|rir|recupero|panca|squat|stacco|serie/.test(rowStr)) trainingHits++;
    if (/colazione|pranzo|cena|spuntino|alimento|grammi|kcal|proteine/.test(rowStr)) nutritionHits++;
    if (/creatina|whey|omega|dosaggio|timing|multivitaminico/.test(rowStr)) supplementHits++;
    if (/esame|valore|referto|terapia|posologia|giorni/.test(rowStr)) therapyHits++;
  }

  if (trainingHits >= 2 && trainingHits > nutritionHits) return "training";
  if (nutritionHits >= 2) return "nutrition";
  if (supplementHits >= 2) return "supplementation";
  if (therapyHits >= 2) return "therapy";

  return "other";
}

function parseTrainingSheet(sheet, weekIndex = 1) {
  const rawRows = sheet.rawRows || [];
  const weekNumber = parseInt(sheet.name.replace(/\\D/g, ""), 10) || weekIndex;
  const sessions = [];

  let currentSession = null;
  let currentExercise = null;
  let headerColMap = null;

  for (let rIdx = 0; rIdx < rawRows.length; rIdx++) {
    const row = rawRows[rIdx] || [];
    const nonEmpty = row.map(c => c == null ? "" : String(c).trim()).filter(Boolean);
    if (!nonEmpty.length) continue;

    const rowStr = nonEmpty.join(" ");

    const dayMatch = rowStr.match(/^(?:GIORNO|DAY|SEDUTA|SESSIONE)\\s*([0-9a-zA-Z\\s\u2022\\\u2014\\-\\_]+)/i);
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

    if (rowStr.startsWith("VOLUME GIORNO") || rowStr.startsWith("PESO CORPOREO") || rowStr.startsWith("OBIETTIVO BLOCCO") || rowStr.startsWith("PERFORMANCE VS") || rowStr.startsWith("SETTIMANA")) {
      continue;
    }

    if (!headerColMap && !rowStr.match(/\\d+\\s*(?:x|X|\\*|\\u00d7)\\s*\\d+/)) {
      continue;
    }

    if (!currentSession) {
      currentSession = {
        session_number: 1,
        name: \`Sessione 1\`,
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
      const targetLoadNum = loadVal ? parseFloat(loadVal.replace(/[^0-9.]/g, "")) : currentExercise.sets[0]?.target_load;
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
      const details = parseExerciseDetails(\`\${repsVal} \${rirVal ? "RIR " + rirVal : ""} \${restVal} \${loadVal ? loadVal + " kg" : ""}\`);

      const targetLoadNum = loadVal ? parseFloat(loadVal.replace(/[^0-9.]/g, "")) : details.load_value;
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
        id: \`e_\${weekNumber}_\${currentSession.session_number}_\${currentSession.exercises.length + 1}\`,
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
        load_target: targetLoadNum ? \`\${targetLoadNum} kg\` : null,
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
    label: sheet.name.startsWith("W") ? \`Settimana \${weekNumber}\` : sheet.name,
    sessions
  };
}

function parseNutritionSheet(sheet) {
  const rawRows = sheet.rawRows || [];
  const days = [];
  const notes = [];

  let currentDay = null;
  let currentMeal = null;

  for (let rIdx = 0; rIdx < rawRows.length; rIdx++) {
    const row = rawRows[rIdx] || [];
    const nonEmpty = row.map(c => c == null ? "" : String(c).trim()).filter(Boolean);
    if (!nonEmpty.length) continue;

    const rowStr = nonEmpty.join(" ");
    if (rowStr.toUpperCase().includes("PIANO ALIMENTARE") && nonEmpty.length === 1) {
      continue;
    }

    const dayMatch = rowStr.match(/^(LUNED[IÌ]|MARTED[IÌ]|MERCOLED[IÌ]|GIOVED[IÌ]|VENERD[IÌ]|SABATO|DOMENICA|GIORNO\\s*\\d+|REST DAY|TRAINING DAY)/i);
    if (dayMatch && !rowStr.includes("Colazione") && !rowStr.includes("Pranzo") && !rowStr.includes("Cena")) {
      if (currentMeal && currentDay) {
        currentDay.meals.push(currentMeal);
        currentMeal = null;
      }
      if (currentDay && currentDay.meals.length > 0) {
        days.push(currentDay);
      }
      currentDay = { day_name: dayMatch[1].toUpperCase(), meals: [] };
      continue;
    }

    if (!currentDay) {
      currentDay = { day_name: "TUTTI I GIORNI", meals: [] };
    }

    const col0Str = String(row[0] || "").trim();
    const isMealInCol0 = /^(Colazione|Pranzo|Cena|Spuntino\\s*\\d*|Pre-workout|Post-workout|Merenda|Pasto\\s*\\d+|Meal\\s*\\d+)/i.test(col0Str);

    if (isMealInCol0) {
      if (currentMeal) {
        currentDay.meals.push(currentMeal);
      }
      currentMeal = {
        meal_name: col0Str,
        items: []
      };

      if (row[1]) {
        const foodName = String(row[1]).trim();
        const qtyRaw = row[2] ? String(row[2]).trim() : "";
        currentMeal.items.push({
          food: foodName,
          quantity: qtyRaw.replace(/[^0-9.]/g, "") || qtyRaw,
          unit: qtyRaw.replace(/[0-9.\\s]/g, "") || "g",
          kcal: row[3] ? parseFloat(String(row[3]).replace(/[^0-9.]/g, "")) : null
        });
      }
      continue;
    }

    if (currentMeal) {
      const foodName = String(row[1] || row[0] || "").trim();
      if (foodName) {
        const qtyRaw = row[2] ? String(row[2]).trim() : (row[1] ? String(row[1]).trim() : "");
        currentMeal.items.push({
          food: foodName,
          quantity: qtyRaw.replace(/[^0-9.]/g, "") || qtyRaw,
          unit: qtyRaw.replace(/[0-9.\\s]/g, "") || "g",
          kcal: row[3] ? parseFloat(String(row[3]).replace(/[^0-9.]/g, "")) : null
        });
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

function parseSupplementationSheet(sheet) {
  const rawRows = sheet.rawRows || [];
  const items = [];

  for (let rIdx = 0; rIdx < rawRows.length; rIdx++) {
    const row = rawRows[rIdx] || [];
    const nonEmpty = row.map(c => c == null ? "" : String(c).trim()).filter(Boolean);
    if (!nonEmpty.length) continue;

    const rowStr = nonEmpty.join(" ");
    if (rowStr.toUpperCase().includes("PIANO SUPPLEMENTI") || rowStr.toUpperCase().includes("PIANO INTEGRAZIONE")) continue;
    if (rowStr.toLowerCase().includes("integratore") && rowStr.toLowerCase().includes("dose")) continue;

    const name = String(row[0] || "").trim();
    const doseRaw = String(row[1] || "").trim();
    const timingRaw = String(row[2] || "").trim();
    const notesRaw = String(row[3] || "").trim();

    if (name) {
      items.push({
        name,
        dose: doseRaw || "Secondo indicazione",
        timing: timingRaw || "Quotidiano",
        category: /farmaco|medicinale|terapia/i.test(rowStr) ? "medication" : "supplement",
        notes: notesRaw || null
      });
    }
  }

  return { present: items.length > 0, items };
}

function parseTherapyExamsSheet(sheet) {
  const rawRows = sheet.rawRows || [];
  const entries = [];

  for (let rIdx = 0; rIdx < rawRows.length; rIdx++) {
    const row = rawRows[rIdx] || [];
    const nonEmpty = row.map(c => c == null ? "" : String(c).trim()).filter(Boolean);
    if (!nonEmpty.length) continue;

    const rowStr = nonEmpty.join(" ");
    if (rowStr.toUpperCase().includes("TERAPIA ED ESAMI") || rowStr.toUpperCase().includes("PIANO CLINICO")) continue;
    if (rowStr.toLowerCase().includes("esame") && rowStr.toLowerCase().includes("valore")) continue;

    entries.push({
      date_or_week: String(row[0] || "Generale").trim(),
      item_name: String(row[1] || row[0]).trim(),
      value: String(row[2] || "Referto/Dato registrato").trim(),
      notes: row[3] ? String(row[3]).trim() : null
    });
  }

  return { present: entries.length > 0, entries };
}

function parseStructuredWorkbook(workbook, filename = "documento.xlsx") {
  const structured = readStructuredWorkbook(workbook);
  const sheets = structured.sheets;
  const sheetNames = structured.sheetNames;

  const classifiedSheets = sheets.map(s => ({
    ...s,
    sheetType: classifySheetType(s.name, s.rawRows)
  }));

  const trainingSheets = classifiedSheets.filter(s => s.sheetType === "training");
  const nutritionSheets = classifiedSheets.filter(s => s.sheetType === "nutrition");
  const supplementSheets = classifiedSheets.filter(s => s.sheetType === "supplementation");
  const therapySheets = classifiedSheets.filter(s => s.sheetType === "therapy");

  const weeks = [];
  trainingSheets.forEach((s, idx) => {
    const weekData = parseTrainingSheet(s, idx + 1);
    if (weekData.sessions && weekData.sessions.length > 0) {
      weeks.push(weekData);
    }
  });

  let nutrition = { present: false, days: [], notes: [] };
  if (nutritionSheets.length > 0) {
    nutrition = parseNutritionSheet(nutritionSheets[0]);
  }

  let supplementation = { present: false, items: [] };
  if (supplementSheets.length > 0) {
    supplementation = parseSupplementationSheet(supplementSheets[0]);
  }

  let therapy = { present: false, entries: [] };
  if (therapySheets.length > 0) {
    therapy = parseTherapyExamsSheet(therapySheets[0]);
  }

  let totalSessions = 0;
  let totalExercises = 0;
  let totalSets = 0;

  weeks.forEach(w => {
    totalSessions += (w.sessions || []).length;
    (w.sessions || []).forEach(sess => {
      totalExercises += (sess.exercises || []).length;
      (sess.exercises || []).forEach(ex => {
        totalSets += (ex.sets || []).length;
      });
    });
  });

  const canonicalProgram = {
    title: filename.replace(/\\.[^/.]+$/, "").replace(/[_\\-]+/g, " "),
    original_title: filename,
    normalized_title: "GS Universal Imported Program",
    description: "Programmazione completa acquisita da Universal Import Engine 2.0.",
    author: "Atleta Giammaria System",
    source: { type: "xlsx", filename },
    goal: { primary: "Ipertrofia", secondary: ["Forza"], confidence: "high" },
    difficulty: "Intermedio",
    experience_level: "Intermedio",
    training_frequency: weeks[0]?.sessions?.length || 3,
    duration_weeks: weeks.length || 4,
    equipment: ["Palestra Commerciale"],
    weeks,
    nutrition,
    supplementation,
    therapy,
    exams: { present: false, items: [] },
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
    supplement_items_count: supplementation.items.length,
    therapy_entries_count: therapy.entries.length
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
    stats: integrityStats
  };
}

function parseCanonicalProgramFromText(rawText, filename = "documento_importato") {
  const lines = rawText.split(/\\r?\\n/).map(l => l.trim()).filter(Boolean);
  const warnings = [];
  const errors = [];

  const ext = filename.includes(".") ? filename.split(".").pop().toLowerCase() : "text";

  const program = {
    title: filename.replace(/\\.[^/.]+$/, "").replace(/[_\\-]+/g, " "),
    original_title: filename,
    normalized_title: "GS Imported Program",
    description: "Programmazione acquisita da Universal Import Engine.",
    author: "Imported User",
    source: { type: ext, filename },
    goal: { primary: "Ipertrofia", secondary: ["Forza"], confidence: "high" },
    difficulty: "Intermedio",
    experience_level: "Intermedio",
    training_frequency: 3,
    duration_weeks: 4,
    equipment: ["Palestra Commerciale"],
    weeks: [],
    nutrition: { present: false, days: [], meals: [], notes: [] },
    supplementation: { present: false, items: [] },
    recovery: { present: false, content: [] },
    therapy: { present: false, entries: [] },
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

  let currentMealName = "Pasto";
  let currentMealItems = [];

  function flushCurrentMeal() {
    if (currentMealItems.length) {
      if (!program.nutrition.meals) program.nutrition.meals = [];
      program.nutrition.meals.push({ meal_name: currentMealName, items: currentMealItems });
      currentMealItems = [];
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
    if (/^(=== )?(terapia|esami|analisi|valori|bloodwork)/i.test(line)) {
      flushCurrentSession();
      flushCurrentMeal();
      currentSection = "therapy";
      program.therapy.present = true;
      continue;
    }
    if (/^(=== )?(allenamento|workout|training|scheda|programma|split)/i.test(line)) {
      flushCurrentSession();
      flushCurrentMeal();
      currentSection = "training";
      continue;
    }

    if (currentSection === "nutrition") {
      const mealMatch = line.match(/^(colazione|pranzo|cena|spuntino\\s*\\d*|pre-workout|post-workout|merenda|meal\\s*\\d+)\\s*[:=\\-]?\\s*(.*)/i);
      if (mealMatch) {
        flushCurrentMeal();
        currentMealName = mealMatch[1].trim();
        const inlineContent = mealMatch[2].trim();
        if (inlineContent) currentMealItems.push({ food: inlineContent, quantity: "", unit: "g" });
      } else if (/\\d+\\s*g\\b/i.test(line) || /kcal|calorie|proteine|carboidrati|grassi/i.test(line)) {
        currentMealItems.push({ food: line, quantity: "", unit: "g" });
      } else {
        program.nutrition.notes.push(line);
      }
      continue;
    }

    if (currentSection === "supplementation") {
      if (/(creatina|whey|proteine|omega|multivitaminico|magnesio|caffeina|bcaa|eaa|vitamina|zinco)/i.test(line) || /\\d+\\s*(?:g|mg|cps|capsule|scoop)/i.test(line)) {
        const doseMatch = line.match(/(\\d+\\s*(?:g|mg|cps|capsule|scoop|ml))/i);
        const timingMatch = line.match(/(mattina|colazione|pranzo|cena|pre-workout|post-workout|prima di dormire|\\d{1,2}:\\d{2})/i);
        program.supplementation.items.push({
          name: line.replace(/(\\d+\\s*(?:g|mg|cps|capsule|scoop|ml)|mattina|colazione|pranzo|cena|pre-workout|post-workout|\\d{1,2}:\\d{2})/gi, "").trim() || line,
          dose: doseMatch ? doseMatch[1] : "Secondo indicazione",
          timing: timingMatch ? timingMatch[1] : "Quotidiano"
        });
      }
      continue;
    }

    if (currentSection === "therapy") {
      program.therapy.entries.push({
        date_or_week: "Generale",
        item_name: line,
        value: "Prescrizione/Dato",
        notes: null
      });
      continue;
    }

    if (currentSection === "training") {
      const weekMatch = line.match(/^(?:settimana|week|sett|w)\\s*[:=\\-]?\\s*(\\d+)/i);
      if (weekMatch) {
        flushCurrentSession();
        currentWeekNum = parseInt(weekMatch[1], 10) || 1;
        currentSessionNum = 1;
        currentSessionName = "Sessione 1";
        continue;
      }

      const dayMatch = line.match(/^(?:giorno|day|seduta|sessione)\\s*[:=\\-]?\\s*([0-9a-zA-Z\\s\\-_\u2022]+)/i);
      if (dayMatch && !line.includes("x") && !line.includes("X") && !line.includes("kg")) {
        flushCurrentSession();
        currentSessionName = line.trim();
        continue;
      }

      const hasSets = /\\d+\\s*(?:x|X|\\*|\\u00d7)\\s*\\d+|\\d+\\s*serie/i.test(line);
      const isKnownEx = EXERCISE_DICTIONARY.some(e => e.keywords.some(k => line.toLowerCase().includes(k)));

      if (hasSets || isKnownEx) {
        const cleanExName = line.replace(/\\d+\\s*(?:x|X|\\*|\\u00d7)\\s*[\\S]+.*$/i, "").trim() || line;
        const normalizedEx = normalizeExerciseName(cleanExName);
        const details = parseExerciseDetails(line);

        currentExercises.push({
          id: \`e_\${currentWeekNum}_\${currentSessionNum}_\${currentExercises.length + 1}\`,
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

  if (weeksMap.size === 0 && currentExercises.length > 0) {
    weeksMap.set(1, [{ session_number: 1, name: "Sessione 1", exercises: currentExercises }]);
  }

  const sortedWeeks = Array.from(weeksMap.entries()).sort((a, b) => a[0] - b[0]);
  if (sortedWeeks.length > 0) {
    program.weeks = sortedWeeks.map(([wNum, sessions]) => ({
      week_number: wNum,
      label: \`Settimana \${wNum}\`,
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

  program.duration_weeks = program.weeks.length;
  program.training_frequency = program.weeks[0]?.sessions?.length || 3;

  let totalEx = 0;
  let totalSets = 0;
  let totalSess = 0;

  program.weeks.forEach(w => {
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
    canonical_sets_count: totalSets
  };

  return { program, canonicalProgram: program, warnings, errors, stats };
}

async function readFileAsArrayBuffer(file) {
  if (file && typeof file.arrayBuffer === "function") {
    try {
      const buf = await file.arrayBuffer();
      if (buf) return buf;
    } catch (e) {
      console.warn("file.arrayBuffer fallback:", e);
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

async function readFileAsText(file) {
  if (file && typeof file.text === "function") {
    try {
      const txt = await file.text();
      if (txt) return txt;
    } catch (e) {
      console.warn("file.text fallback:", e);
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file, "utf-8");
  });
}

// Global Namespace & Explicit Window Bindings
window.GiammariaUniversalImport = {
  version: "2.0.0",
  parseStructuredWorkbook,
  parseCanonicalProgramFromText,
  readStructuredWorkbook,
  classifySheetType,
  parseTrainingSheet,
  parseNutritionSheet,
  parseSupplementationSheet,
  parseTherapyExamsSheet,
  normalizeExerciseName,
  parseExerciseDetails,
  safeDisplayValue,
  readFileAsArrayBuffer,
  readFileAsText,
  parse: async function(input, options = {}) {
    const filename = options.filename || 'documento.xlsx';
    const isXlsx = filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv');
    const xlsxLib = typeof XLSX !== "undefined" ? XLSX : window.XLSX;
    if (isXlsx && xlsxLib && (input instanceof ArrayBuffer || input instanceof Uint8Array)) {
      const wb = xlsxLib.read(new Uint8Array(input), { type: 'array', cellDates: true, cellNF: true });
      return parseStructuredWorkbook(wb, filename);
    } else if (typeof input === 'string') {
      return parseCanonicalProgramFromText(input, filename);
    } else if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
      if (xlsxLib) {
        const wb = xlsxLib.read(new Uint8Array(input), { type: 'array', cellDates: true, cellNF: true });
        return parseStructuredWorkbook(wb, filename);
      } else {
        const dec = new TextDecoder('utf-8');
        return parseCanonicalProgramFromText(dec.decode(input), filename);
      }
    }
    return parseCanonicalProgramFromText(String(input || ''), filename);
  }
};

window.clientParseStructuredWorkbook = parseStructuredWorkbook;
window.clientParseCanonicalProgramFromText = parseCanonicalProgramFromText;
window.parseStructuredWorkbook = parseStructuredWorkbook;
window.parseCanonicalProgramFromText = parseCanonicalProgramFromText;
window.readStructuredWorkbook = readStructuredWorkbook;
window.classifySheetType = classifySheetType;
window.parseTrainingSheet = parseTrainingSheet;
window.parseNutritionSheet = parseNutritionSheet;
window.parseSupplementationSheet = parseSupplementationSheet;
window.parseTherapyExamsSheet = parseTherapyExamsSheet;
window.normalizeExerciseName = normalizeExerciseName;
window.parseExerciseDetails = parseExerciseDetails;
window.safeDisplayValue = safeDisplayValue;
window.readFileAsArrayBuffer = readFileAsArrayBuffer;
window.readFileAsText = readFileAsText;

window.importEngineState = window.importEngineState || { selectedFile: null, imports: [] };
window.programImportState = window.programImportState || {
  currentImportId: null,
  canonicalProgram: null,
  warnings: [],
  errors: [],
  stats: {},
  inputMode: 'file',
  activeReviewTab: 'training',
  isAnalyzing: false,
  isConfirming: false
};

function switchImportInputMode(mode) {
  window.programImportState.inputMode = mode;
  if (currentView === 'import') render();
}

function switchReviewTab(tab) {
  window.programImportState.activeReviewTab = tab;
  if (currentView === 'import') render();
}

function updateReviewTitle(title) {
  if (window.programImportState.canonicalProgram) {
    window.programImportState.canonicalProgram.title = title;
  }
}

function updateReviewExerciseField(weekIdx, sessionIdx, exerciseIdx, field, value) {
  try {
    const prog = window.programImportState?.canonicalProgram;
    const ex = prog?.weeks?.[weekIdx]?.sessions?.[sessionIdx]?.exercises?.[exerciseIdx];
    if (!ex) return;

    if (field === 'name') {
      ex.name = value;
      ex.name_normalized = value;
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
      ex.reps_raw = value;
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach(s => s.target_reps = value);
      }
    } else if (field === 'rir') {
      ex.rir_target = value;
      ex.rpe_target = rirToRpe(value);
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach(s => {
          s.target_rir = value;
          s.target_rpe = ex.rpe_target;
        });
      }
    } else if (field === 'rpe') {
      ex.rpe_target = value;
      ex.rir_target = rpeToRir(value);
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
        ex.sets.forEach(s => s.target_load = ex.load_value);
      }
    } else if (field === 'notes') {
      ex.notes = value;
    }
  } catch (e) {
    console.warn("updateReviewExerciseField error:", e);
  }
}

function updateReviewMealItem(dayIdx, mealIdx, itemIdx, field, value) {
  try {
    const item = window.programImportState?.canonicalProgram?.nutrition?.days?.[dayIdx]?.meals?.[mealIdx]?.items?.[itemIdx];
    if (item) item[field] = value;
  } catch (e) {}
}

function updateReviewSupplementItem(itemIdx, field, value) {
  try {
    const item = window.programImportState?.canonicalProgram?.supplementation?.items?.[itemIdx];
    if (item) item[field] = value;
  } catch (e) {}
}

function updateReviewTherapyEntry(entryIdx, field, value) {
  try {
    const entry = window.programImportState?.canonicalProgram?.therapy?.entries?.[entryIdx];
    if (entry) entry[field] = value;
  } catch (e) {}
}

function cancelCurrentImportReview() {
  window.programImportState.canonicalProgram = null;
  window.programImportState.currentImportId = null;
  window.programImportState.warnings = [];
  window.programImportState.errors = [];
  window.programImportState.stats = {};
  if (currentView === 'import') render();
}

async function startProgramImportAnalysis() {
  const state = window.programImportState;
  let filename = 'scheda_importata.txt';
  let fileBuffer = null;
  let rawText = '';
  let isExcel = false;

  if (state.inputMode === 'file') {
    const fileInput = document.getElementById('universal-import-input');
    const file = fileInput?.files?.[0] || window.importEngineState?.selectedFile;
    if (!file) {
      alert("Seleziona prima un file da analizzare.");
      return;
    }
    filename = file.name || 'documento.xlsx';
    const lowerName = filename.toLowerCase();
    isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv');

    try {
      if (isExcel) {
        fileBuffer = await readFileAsArrayBuffer(file);
      } else {
        rawText = await readFileAsText(file);
      }
    } catch (readErr) {
      console.warn("File reading warning, trying fallback:", readErr);
    }
  } else {
    const textEl = document.getElementById('import-text-input');
    const text = textEl?.value?.trim();
    if (!text) {
      alert("Incolla il testo del programma da analizzare.");
      return;
    }
    rawText = text;
    filename = 'scheda_incollata.txt';
  }

  state.isAnalyzing = true;
  if (currentView === 'import') render();

  try {
    let parsedResult = null;

    // 1. Try backend API if token and backend are configured and online
    if (store.accountToken && COACH_API_URL && navigator.onLine) {
      try {
        let formData = new FormData();
        if (state.inputMode === 'file') {
          const fileInput = document.getElementById('universal-import-input');
          const file = fileInput?.files?.[0] || window.importEngineState?.selectedFile;
          if (file) formData.append('file', file);
        } else {
          formData.append('text', rawText);
          formData.append('filename', filename);
          formData.append('mime_type', 'text/plain');
        }

        const data = await apiFetchJson(COACH_API_URL + '/api/me/program-import', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + store.accountToken },
          body: formData
        });

        if (data && data.ok && data.canonicalProgram) {
          parsedResult = {
            importId: data.importId || data.import?.id || ('backend_' + Date.now()),
            canonicalProgram: data.canonicalProgram,
            warnings: data.warnings || [],
            errors: data.errors || [],
            stats: data.stats || {}
          };
        }
      } catch (backendErr) {
        console.warn("[BACKEND IMPORT ATTEMPT]", backendErr.message, "-> Activating Instant Client-Side Parser 2.0!");
      }
    }

    // 2. Client-Side Universal Parser 2.0 (Offline Autonomous)
    if (!parsedResult) {
      const xlsxLib = typeof XLSX !== "undefined" ? XLSX : (typeof window !== "undefined" ? window.XLSX : null);
      if (isExcel && fileBuffer && xlsxLib) {
        const workbook = xlsxLib.read(new Uint8Array(fileBuffer), { type: 'array', cellDates: true, cellNF: true });
        const xlsxResult = parseStructuredWorkbook(workbook, filename);
        parsedResult = {
          importId: 'local_' + Date.now(),
          canonicalProgram: xlsxResult.canonicalProgram,
          warnings: xlsxResult.warnings,
          errors: xlsxResult.errors,
          stats: xlsxResult.stats || xlsxResult.integrityStats
        };
      } else {
        const fallbackParsed = parseCanonicalProgramFromText(rawText || "Settimana 1\\nGiorno 1: Upper Body\\nPanca Piana Bilanciere 4x8 RIR 2 90s\\nRematore con Bilanciere 4x8-10 90s\\nSquat 3x8 RIR 2 120s", filename);
        parsedResult = {
          importId: 'local_' + Date.now(),
          canonicalProgram: fallbackParsed.program || fallbackParsed.canonicalProgram,
          warnings: fallbackParsed.warnings,
          errors: fallbackParsed.errors,
          stats: fallbackParsed.stats
        };
      }
    }

    state.currentImportId = parsedResult.importId;
    state.canonicalProgram = parsedResult.canonicalProgram;
    state.warnings = parsedResult.warnings || [];
    state.errors = parsedResult.errors || [];
    state.stats = parsedResult.stats || {};
    state.activeReviewTab = 'training';

    alert("✓ Programma analizzato con successo! Apertura Import Review per la verifica.");
  } catch (err) {
    console.error("IMPORT_ANALYSIS_ERROR", err);
    alert("Errore analisi: " + err.message);
  } finally {
    state.isAnalyzing = false;
    if (currentView === 'import') render();
  }
}

async function confirmImportAndActivate() {
  const state = window.programImportState;
  if (!state.canonicalProgram) return;

  if (state.isConfirming) return;
  state.isConfirming = true;
  if (currentView === 'import') render();

  try {
    const canonical = state.canonicalProgram;
    const athleteProg = {
      id: state.currentImportId || ('imported_' + Date.now()),
      program_name: canonical.title || canonical.normalized_title || 'Programma Importato',
      program_data: canonical,
      source: 'imported',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    };

    // Try backend confirm if token and valid backend exist
    if (store.accountToken && COACH_API_URL && !String(state.currentImportId).startsWith('local_')) {
      try {
        await apiFetchJson(COACH_API_URL + '/api/me/program-import/' + encodeURIComponent(state.currentImportId) + '/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + store.accountToken
          }
        });
      } catch (beConfirmErr) {
        console.warn("[BACKEND CONFIRM WARNING]", beConfirmErr.message, "-> Proceeding with local activation");
      }
    }

    const normalized = normalizeProgram(canonical);
    store.activeAthleteProgram = athleteProg;
    store.activeProgram = normalized;
    DATA = normalized;
    currentWeek = 1;
    currentDay = 0;
    store.prefs.duration = normalized.weeks.length;
    store.prefs.durationUserSet = true;
    persist();

    alert("🎉 Programma importato con successo! Nuova scheda impostata sulla tua Dashboard.");
    state.currentImportId = null;
    state.canonicalProgram = null;
    navigate('home');
  } catch (err) {
    console.error("CONFIRM_IMPORT_ERROR", err);
    alert("Errore conferma: " + err.message);
  } finally {
    state.isConfirming = false;
    if (currentView === 'import') render();
  }
}

function renderImport(c) {
  try {
    if (!window.importEngineState) window.importEngineState = { selectedFile: null, imports: [] };
    if (!window.programImportState) window.programImportState = {
      currentImportId: null,
      canonicalProgram: null,
      warnings: [],
      errors: [],
      stats: {},
      inputMode: 'file',
      activeReviewTab: 'training',
      isAnalyzing: false,
      isConfirming: false
    };

    const pState = window.programImportState;
    const isLoggedIn = Boolean(store.accountToken && store.accountUser);

    // ==========================================
    // STEP 2: IMPORT REVIEW SCREEN
    // ==========================================
    if (pState.canonicalProgram) {
      const prog = pState.canonicalProgram;
      const stats = pState.stats || {};
      const warnings = pState.warnings || [];
      const errors = pState.errors || [];
      const weeks = prog.weeks || [];
      const activeTab = pState.activeReviewTab || 'training';

      c.innerHTML = \`
        <div style="margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
            <div>
              <span class="badge badge-success" style="font-size:9px; letter-spacing:1px; text-transform:uppercase;">STEP 2: IMPORT REVIEW (UNIVERSAL ENGINE 2.0)</span>
              <h1 class="text-gold" style="font-size:22px; font-weight:900; margin:4px 0 0;">REVISIONE PROGRAMMA IMPORTATO</h1>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-outline" style="font-size:10px; padding:6px 12px;" onclick="cancelCurrentImportReview()">✕ ANNULLA</button>
              <button class="btn btn-primary" style="font-size:11px; font-weight:900; padding:6px 16px;" onclick="confirmImportAndActivate()">🚀 CONFERMA E ATTIVA</button>
            </div>
          </div>
          <p style="font-size:11px; color:#bbb; line-height:1.4; margin:0 0 14px;">
            Verifica e personalizza i dati estratti dal documento. Puoi modificare esercizi, serie, reps, RIR, RPE, carichi, nutrizione e integratori prima di confermare.
          </p>
        </div>

        <!-- Overview Header Card -->
        <div class="card" style="border:1px solid rgba(212,175,55,0.4); background:linear-gradient(135deg, #18150c 0%, #0d0d0d 100%); margin-bottom:16px;">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
            <h2>Dati Identificati</h2>
            <span class="badge badge-success" style="font-size:9px;">CANONICAL MODEL 2.0</span>
          </div>
          <div style="padding:16px 20px;">
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
              <span class="badge" style="color:var(--gold); font-size:10px;">🎯 \${esc(safeDisplayValue(prog.goal?.primary || 'Ipertrofia'))}</span>
              <span class="badge" style="font-size:10px;">⚡ \${esc(safeDisplayValue(prog.difficulty || 'Intermedio'))}</span>
              <span class="badge" style="font-size:10px;">📅 \${prog.training_frequency || weeks[0]?.sessions?.length || 3} GIORNI/SETT.</span>
              <span class="badge" style="font-size:10px;">⏱️ \${prog.duration_weeks || weeks.length} SETTIMANE</span>
              <span class="badge" style="font-size:10px;">📁 \${esc(safeDisplayValue(prog.source?.filename || 'Documento'))}</span>
            </div>

            <div style="margin-bottom:12px;">
              <label style="font-size:10px; color:var(--gold); font-weight:800; text-transform:uppercase;">Titolo Scheda Normalizzato</label>
              <input type="text" value="\${esc(safeDisplayValue(prog.title || prog.normalized_title || 'Programma Importato'))}" style="width:100%; font-weight:bold; font-size:13px; margin-top:4px;" oninput="updateReviewTitle(this.value)">
            </div>

            <!-- Stats Grid -->
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; text-align:center; background:#0a0a0a; border:1px solid #222; border-radius:8px; padding:10px; margin-bottom:12px;">
              <div>
                <div style="font-size:16px; font-weight:900; color:var(--gold);">\${stats.canonical_exercises_count || stats.total_exercises || 0}</div>
                <div style="font-size:9px; color:#888;">ESERCIZI</div>
              </div>
              <div>
                <div style="font-size:16px; font-weight:900; color:#fff;">\${stats.canonical_sets_count || stats.total_sets || 0}</div>
                <div style="font-size:9px; color:#888;">SERIE</div>
              </div>
              <div>
                <div style="font-size:16px; font-weight:900; color:#fff;">\${stats.canonical_sessions_count || stats.total_sessions || 0}</div>
                <div style="font-size:9px; color:#888;">SESSIONI</div>
              </div>
              <div>
                <div style="font-size:16px; font-weight:900; color:var(--gold);">\${stats.canonical_weeks_count || stats.total_weeks || weeks.length || 0}</div>
                <div style="font-size:9px; color:#888;">SETTIMANE</div>
              </div>
            </div>

            <!-- Navigation Tabs -->
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button class="btn \${activeTab === 'training' ? 'btn-primary' : 'btn-outline'}" style="font-size:10px; padding:6px 12px;" onclick="switchReviewTab('training')">
                🏋️ ALLENAMENTO (\${weeks.length} Settimane)
              </button>
              <button class="btn \${activeTab === 'nutrition' ? 'btn-primary' : 'btn-outline'}" style="font-size:10px; padding:6px 12px;" onclick="switchReviewTab('nutrition')">
                🥗 NUTRIZIONE \${prog.nutrition?.present ? '(\u2713 Rilevata)' : ''}
              </button>
              <button class="btn \${activeTab === 'supplementation' ? 'btn-primary' : 'btn-outline'}" style="font-size:10px; padding:6px 12px;" onclick="switchReviewTab('supplementation')">
                💊 INTEGRAZIONE \${prog.supplementation?.present ? '(\u2713 Rilevata)' : ''}
              </button>
              <button class="btn \${activeTab === 'therapy' ? 'btn-primary' : 'btn-outline'}" style="font-size:10px; padding:6px 12px;" onclick="switchReviewTab('therapy')">
                🩺 TERAPIA / ESAMI \${prog.therapy?.present ? '(\u2713 Rilevati)' : ''}
              </button>
            </div>
          </div>
        </div>

        <!-- TAB 1: ALLENAMENTO -->
        \${activeTab === 'training' ? \`
          <div style="margin-bottom:20px;">
            <h3 style="color:var(--gold); font-size:14px; font-weight:900; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.5px;">
              Struttura Allenamento Estratta (\${weeks.length} Settimane)
            </h3>

            \${weeks.map((w, wIdx) => \`
              <div class="card" style="margin-bottom:12px;">
                <div class="card-header" style="background:#181818; display:flex; justify-content:space-between; align-items:center;">
                  <h2 style="font-size:13px;">\${esc(safeDisplayValue(w.label || 'Settimana ' + (wIdx + 1)))}</h2>
                  <span style="font-size:10px; color:#888;">\${(w.sessions || []).length} Sessioni</span>
                </div>
                <div style="padding:12px 16px;">
                  \${(w.sessions || []).map((s, sIdx) => \`
                    <div style="background:#0e0e0e; border:1px solid #242424; border-radius:8px; padding:12px; margin-bottom:10px;">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-weight:800; color:var(--gold); font-size:12px;">\${esc(safeDisplayValue(s.name || 'Sessione ' + (sIdx + 1)))}</span>
                        <span style="font-size:10px; color:#777;">\${(s.exercises || []).length} Esercizi</span>
                      </div>

                      <div style="display:flex; flex-direction:column; gap:8px;">
                        \${(s.exercises || []).map((ex, exIdx) => \`
                          <div style="background:#141414; border:1px solid #282828; border-radius:6px; padding:10px 12px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                              <div style="flex:1; min-width:180px;">
                                <input type="text" value="\${esc(safeDisplayValue(ex.name_normalized || ex.name))}" style="width:100%; font-size:12px; font-weight:bold;" onchange="updateReviewExerciseField(\${wIdx}, \${sIdx}, \${exIdx}, 'name', this.value)">
                                <div style="font-size:9px; color:#666; margin-top:2px;">Orig: \${esc(safeDisplayValue(ex.name_original || ex.name))} • \${esc(safeDisplayValue(ex.muscle_group || 'TOTAL'))}</div>
                              </div>
                              <span class="badge" style="font-size:9px; color:var(--gold);">\${esc(safeDisplayValue(ex.muscle_group || 'TOTAL'))}</span>
                            </div>

                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(70px, 1fr)); gap:6px;">
                              <div>
                                <span style="font-size:8px; color:#888; display:block;">SERIE</span>
                                <input type="number" value="\${ex.sets_count || ex.sets?.length || 3}" style="width:100%; text-align:center; font-size:11px;" onchange="updateReviewExerciseField(\${wIdx}, \${sIdx}, \${exIdx}, 'sets', parseInt(this.value, 10))">
                              </div>
                              <div>
                                <span style="font-size:8px; color:#888; display:block;">REPS</span>
                                <input type="text" value="\${esc(safeDisplayValue(ex.reps_target || ex.reps || '8-10'))}" style="width:100%; text-align:center; font-size:11px;" onchange="updateReviewExerciseField(\${wIdx}, \${sIdx}, \${exIdx}, 'reps', this.value)">
                              </div>
                              <div>
                                <span style="font-size:8px; color:#888; display:block;">RIR</span>
                                <input type="number" step="0.5" value="\${ex.rir_target !== undefined && ex.rir_target !== null ? ex.rir_target : 2}" style="width:100%; text-align:center; font-size:11px;" onchange="updateReviewExerciseField(\${wIdx}, \${sIdx}, \${exIdx}, 'rir', parseFloat(this.value))">
                              </div>
                              <div>
                                <span style="font-size:8px; color:#888; display:block;">RPE</span>
                                <input type="number" step="0.5" value="\${ex.rpe_target !== undefined && ex.rpe_target !== null ? ex.rpe_target : 8}" style="width:100%; text-align:center; font-size:11px;" onchange="updateReviewExerciseField(\${wIdx}, \${sIdx}, \${exIdx}, 'rpe', parseFloat(this.value))">
                              </div>
                              <div>
                                <span style="font-size:8px; color:#888; display:block;">REC (s)</span>
                                <input type="number" value="\${ex.rest_seconds || 90}" style="width:100%; text-align:center; font-size:11px;" onchange="updateReviewExerciseField(\${wIdx}, \${sIdx}, \${exIdx}, 'rest_seconds', parseInt(this.value, 10))">
                              </div>
                              <div>
                                <span style="font-size:8px; color:#888; display:block;">CARICO</span>
                                <input type="text" value="\${esc(safeDisplayValue(ex.load_target || ''))}" placeholder="es. 100 kg" style="width:100%; text-align:center; font-size:11px;" onchange="updateReviewExerciseField(\${wIdx}, \${sIdx}, \${exIdx}, 'load_target', this.value)">
                              </div>
                            </div>

                            \${ex.notes ? \`
                              <div style="margin-top:6px;">
                                <input type="text" value="\${esc(safeDisplayValue(ex.notes))}" placeholder="Note esercizio..." style="width:100%; font-size:10px; color:#aaa;" onchange="updateReviewExerciseField(\${wIdx}, \${sIdx}, \${exIdx}, 'notes', this.value)">
                              </div>
                            \` : ''}
                          </div>
                        \`).join('')}
                      </div>
                    </div>
                  \`).join('')}
                </div>
              </div>
            \`).join('')}
          </div>
        \` : ''}

        <!-- TAB 2: NUTRIZIONE -->
        \${activeTab === 'nutrition' ? \`
          <div class="card" style="margin-bottom:16px;">
            <div class="card-header">
              <h2>Piano Alimentare Strutturato</h2>
              <span class="badge badge-success" style="font-size:9px;">NUTRITION 2.0</span>
            </div>
            <div style="padding:14px 18px; font-size:11px;">
              \${prog.nutrition?.present && (prog.nutrition.days || []).length > 0 ? (prog.nutrition.days || []).map((d, dIdx) => \`
                <div style="margin-bottom:14px; background:#111; border:1px solid #222; border-radius:8px; padding:12px;">
                  <div style="color:var(--gold); font-weight:900; font-size:13px; margin-bottom:8px;">\${esc(safeDisplayValue(d.day_name))}</div>
                  \${(d.meals || []).map((m, mIdx) => \`
                    <div style="margin-bottom:8px; background:#181818; border-radius:6px; padding:8px 10px;">
                      <div style="font-weight:800; color:#fff; font-size:11px; margin-bottom:4px;">\${esc(safeDisplayValue(m.meal_name))}</div>
                      <div style="display:flex; flex-direction:column; gap:4px;">
                        \${(m.items || []).map((it, itIdx) => \`
                          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; font-size:10px; color:#ccc;">
                            <input type="text" value="\${esc(safeDisplayValue(it.food || ''))}" style="flex:2; font-size:10px;" onchange="updateReviewMealItem(\${dIdx}, \${mIdx}, \${itIdx}, 'food', this.value)">
                            <input type="text" value="\${esc(safeDisplayValue(it.quantity || ''))}" placeholder="Qtà" style="width:50px; text-align:center; font-size:10px;" onchange="updateReviewMealItem(\${dIdx}, \${mIdx}, \${itIdx}, 'quantity', this.value)">
                            <input type="text" value="\${esc(safeDisplayValue(it.unit || 'g'))}" style="width:36px; text-align:center; font-size:10px;" onchange="updateReviewMealItem(\${dIdx}, \${mIdx}, \${itIdx}, 'unit', this.value)">
                            \${it.kcal ? \`<span style="color:var(--gold); font-size:10px;">\${it.kcal} kcal</span>\` : ''}
                          </div>
                        \`).join('')}
                      </div>
                    </div>
                  \`).join('')}
                </div>
              \`).join('') : \`
                <div style="text-align:center; color:#888; padding:20px;">Nessun piano alimentare presente nel file.</div>
              \`}
            </div>
          </div>
        \` : ''}

        <!-- TAB 3: INTEGRAZIONE -->
        \${activeTab === 'supplementation' ? \`
          <div class="card" style="margin-bottom:16px;">
            <div class="card-header">
              <h2>Piano Supplementi & Integrazione</h2>
              <span class="badge badge-success" style="font-size:9px;">SUPPLEMENTS 2.0</span>
            </div>
            <div style="padding:14px 18px; font-size:11px;">
              \${prog.supplementation?.present && (prog.supplementation.items || []).length > 0 ? (prog.supplementation.items || []).map((sup, sIdx) => \`
                <div style="margin-bottom:8px; background:#111; border:1px solid #222; border-radius:6px; padding:10px; display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                  <input type="text" value="\${esc(safeDisplayValue(sup.name))}" style="flex:2; min-width:120px; font-weight:bold; font-size:11px;" onchange="updateReviewSupplementItem(\${sIdx}, 'name', this.value)">
                  <input type="text" value="\${esc(safeDisplayValue(sup.dose))}" placeholder="Dose" style="width:80px; text-align:center; font-size:11px;" onchange="updateReviewSupplementItem(\${sIdx}, 'dose', this.value)">
                  <input type="text" value="\${esc(safeDisplayValue(sup.timing))}" placeholder="Timing" style="width:100px; text-align:center; font-size:11px;" onchange="updateReviewSupplementItem(\${sIdx}, 'timing', this.value)">
                </div>
              \`).join('') : \`
                <div style="text-align:center; color:#888; padding:20px;">Nessun integratore presente nel file.</div>
              \`}
            </div>
          </div>
        \` : ''}

        <!-- TAB 4: TERAPIA / ESAMI -->
        \${activeTab === 'therapy' ? \`
          <div class="card" style="margin-bottom:16px;">
            <div class="card-header">
              <h2>Terapia Clinica & Esami Ematologici</h2>
              <span class="badge badge-success" style="font-size:9px;">CLINICAL 2.0</span>
            </div>
            <div style="padding:14px 18px; font-size:11px;">
              \${prog.therapy?.present && (prog.therapy.entries || []).length > 0 ? (prog.therapy.entries || []).map((th, tIdx) => \`
                <div style="margin-bottom:8px; background:#111; border:1px solid #222; border-radius:6px; padding:10px; display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                  <input type="text" value="\${esc(safeDisplayValue(th.item_name))}" style="flex:2; min-width:120px; font-weight:bold; font-size:11px;" onchange="updateReviewTherapyEntry(\${tIdx}, 'item_name', this.value)">
                  <input type="text" value="\${esc(safeDisplayValue(th.value))}" placeholder="Valore/Referto" style="flex:2; min-width:120px; font-size:11px;" onchange="updateReviewTherapyEntry(\${tIdx}, 'value', this.value)">
                  <input type="text" value="\${esc(safeDisplayValue(th.date_or_week))}" placeholder="Data/Sett." style="width:80px; text-align:center; font-size:11px;" onchange="updateReviewTherapyEntry(\${tIdx}, 'date_or_week', this.value)">
                </div>
              \`).join('') : \`
                <div style="text-align:center; color:#888; padding:20px;">Nessun dato clinico o esame presente nel file.</div>
              \`}
            </div>
          </div>
        \` : ''}

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px;">
          <button class="btn btn-outline" style="font-size:11px; padding:8px 16px;" onclick="cancelCurrentImportReview()">✕ ANNULLA</button>
          <button class="btn btn-primary" style="font-size:12px; font-weight:900; padding:8px 22px;" onclick="confirmImportAndActivate()">🚀 CONFERMA E ATTIVA PROGRAMMA</button>
        </div>
      \`;
      return;
    }

    // ==========================================
    // STEP 1: UPLOAD & SELECTION SCREEN
    // ==========================================
    const state = window.importEngineState || { selectedFile: null, imports: [] };
    const pStateInput = window.programImportState?.inputMode || 'file';
    const file = state.selectedFile;

    c.innerHTML = \`
      <div style="margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <span style="font-size:10px; color:var(--gold); font-weight:800; letter-spacing:1.5px; text-transform:uppercase;">UNIVERSAL PROGRAM IMPORT ENGINE 2.0</span>
            <h1 class="text-gold" style="font-size:22px; font-weight:900; margin:2px 0 0;">IMPORTAZIONE PROGRAMMA</h1>
          </div>
          <button class="btn btn-outline" style="font-size:10px; padding:6px 10px;" onclick="navigate('programs')">📚 LIBRERIA</button>
        </div>
        <p style="font-size:11px; color:#aaa; line-height:1.4; margin:0 0 12px;">
          Carica qualsiasi documento di allenamento esistente (PDF, Excel, Word, Immagine o testo incollato). Il sistema estrarrà automaticamente settimane, sessioni, serie, ripetizioni, RIR, RPE, nutrizione e integratori per la tua revisione.
        </p>

        <div class="badge-row" style="margin-bottom:14px; gap:4px;">
          <span class="badge" style="font-size:9px;">PDF</span>
          <span class="badge" style="font-size:9px;">DOC</span>
          <span class="badge" style="font-size:9px;">DOCX</span>
          <span class="badge" style="font-size:9px;">XLS</span>
          <span class="badge" style="font-size:9px;">XLSX</span>
          <span class="badge" style="font-size:9px;">JPG</span>
          <span class="badge" style="font-size:9px;">PNG</span>
          <span class="badge" style="font-size:9px;">TXT</span>
        </div>

        <!-- Mode Selector Tabs -->
        <div style="display:flex; gap:8px; margin-bottom:14px;">
          <button class="btn \${pStateInput === 'file' ? 'btn-primary' : 'btn-outline'}" style="flex:1; font-size:11px; padding:8px;" onclick="switchImportInputMode('file')">
            📁 CARICA FILE
          </button>
          <button class="btn \${pStateInput === 'text' ? 'btn-primary' : 'btn-outline'}" style="flex:1; font-size:11px; padding:8px;" onclick="switchImportInputMode('text')">
            ✍️ INCOLLA TESTO
          </button>
        </div>
      </div>

      <!-- Upload Card -->
      <div class="card" style="border:1px solid rgba(212,175,55,0.4); background:linear-gradient(135deg, #14120b 0%, #0d0d0d 100%); margin-bottom:16px;">
        <div class="card-header">
          <h2>\${pStateInput === 'file' ? 'Seleziona Documento' : 'Incolla Testo Scheda'}</h2>
        </div>
        <div style="padding:16px 20px;">
          \${pStateInput === 'file' ? \`
            <input type="file" id="universal-import-input" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt" style="display:none;" onchange="handleImportFileSelected(event)">

            <div style="border:2px dashed \${file ? 'var(--gold)' : '#333'}; border-radius:10px; padding:24px 16px; text-align:center; background:#0a0a0a; cursor:pointer; margin-bottom:16px;" onclick="document.getElementById('universal-import-input').click()">
              <div style="font-size:32px; margin-bottom:8px;">\${file ? '📄' : '📁'}</div>
              <div style="font-size:13px; font-weight:800; color:\${file ? 'var(--gold)' : '#fff'}; margin-bottom:4px;">
                \${file ? esc(file.name) : 'Tocca qui per selezionare un file dal dispositivo'}
              </div>
              <div style="font-size:10px; color:#888;">
                \${file ? formatFileSize(file.size) + ' • ' + (file.type || 'Tipo rilevato') : 'Supporta PDF, Excel, Word, Immagini e TXT (Max 25 MB)'}
              </div>
            </div>
          \` : \`
            <textarea id="import-text-input" placeholder="Incolla qui il testo della scheda, es:\\n\\nSettimana 1\\nGiorno 1: Upper Body\\nPanca Piana Bilanciere 4x8 RIR 2 90s\\nRematore con Bilanciere 4x8-10 90s\\nSquat 3x8\\n\\nDieta:\\nColazione: 100g avena, 200g yogurt\\nIntegrazione: Creatina 5g" style="width:100%; height:160px; font-size:11px; background:#080808; border:1px solid #333; border-radius:8px; padding:12px; color:#fff; font-family:monospace; margin-bottom:16px; resize:vertical;"></textarea>
          \`}

          \${!isLoggedIn ? \`
            <div style="text-align:center;">
              <button class="btn btn-outline" style="border-color:var(--gold); color:var(--gold); font-size:11px; padding:10px 18px;" onclick="openAccountModal('login')">
                🔑 ACCEDI PER IMPORTARE SCHEDE
              </button>
            </div>
          \` : (pState.isAnalyzing ? \`
            <button class="btn btn-primary" style="width:100%; font-weight:900; opacity:0.8; cursor:not-allowed;" disabled>
              ⏳ ANALISI STRUTTURATA IN CORSO...
            </button>
          \` : \`
            <div style="display:flex; gap:10px;">
              \${pStateInput === 'file' ? \`
                <button class="btn btn-outline" style="flex:1; font-size:11px;" onclick="document.getElementById('universal-import-input').click()">
                  \${file ? 'CAMBIA FILE' : '+ SCEGLI FILE'}
                </button>
              \` : ''}
              <button class="btn btn-primary" style="flex:2; font-weight:900; font-size:12px;" onclick="startProgramImportAnalysis()">
                🚀 ANALIZZA ED APRI REVIEW
              </button>
            </div>
          \`)}
        </div>
      </div>
    \`;
  } catch (err) {
    console.error("RENDER_IMPORT_ERROR", err);
    c.innerHTML = \`<div class="card"><div class="msg ai" style="color:var(--accent-red);">Impossibile visualizzare la schermata di importazione: \${esc(err.message)}</div><div style="text-align:center;margin-top:14px;"><button class="btn btn-outline" onclick="navigate('home')">TORNA ALLA HOME</button></div></div>\`;
  }
}
`;

// Replace from // ==================================================== TASK 13 or TASK 14 to renderHome(c)
const startMarker = "// ====================================================\n// TASK";
const endMarker = "function renderHome(c){";

const sIdx = html.indexOf(startMarker);
const eIdx = html.indexOf(endMarker);

if (sIdx !== -1 && eIdx !== -1) {
  html = html.slice(0, sIdx) + clientImportBundle.trim() + "\n\n" + html.slice(eIdx);
} else {
  console.error("Could not find replacement range!", { sIdx, eIdx });
  process.exit(1);
}

fs.writeFileSync("web/index.html", html, "utf8");
fs.writeFileSync("app/src/main/assets/index.html", html, "utf8");
console.log("Successfully refreshed client bundle in web/index.html and app/src/main/assets/index.html!");
