import fs from 'fs';

const htmlPath = 'web/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// Find insertion boundaries
const startMarker = "var EXERCISE_DICTIONARY = [";
const endMarker = "function renderHome(c){";

let startIndex = html.indexOf(startMarker);
const endIndex = html.indexOf(endMarker);

if (endIndex === -1) {
  console.error("Could not find end marker in web/index.html");
  process.exit(1);
}
if (startIndex === -1) {
  startIndex = endIndex;
}

// Build the replacement code safely without unescaped regexes
const replacementParts = [
`var EXERCISE_DICTIONARY = [
  { keywords: ["panca piana con bilanciere", "panca piana bilanciere", "panca piana", "bench press", "barbell bench press", "flat bench press"], normalized: "Panca Piana con Bilanciere", muscle: "PETTO", muscles: ["PETTO", "TRICIPITI", "DELTOIDI"] },
  { keywords: ["panca inclinata 30° manubri", "panca inclinata manubri", "panca inclinata 30", "panca inclinata bilanciere", "panca inclinata", "incline bench press"], normalized: "Panca Inclinata con Manubri", muscle: "PETTO", muscles: ["PETTO", "DELTOIDI", "TRICIPITI"] },
  { keywords: ["croci manubri", "croci su panca", "dumbbell flyes", "cable fly", "croci ai cavi", "pec fly", "pec deck"], normalized: "Croci ai Cavi", muscle: "PETTO", muscles: ["PETTO"] },
  { keywords: ["chest press", "spinta inclinata convergente", "chest press convergente", "chest press orizzontale", "chest press leggermente inclinata"], normalized: "Chest Press Convergente", muscle: "PETTO", muscles: ["PETTO", "DELTOIDI", "TRICIPITI"] },
  { keywords: ["squat con bilanciere", "squat bilanciere", "back squat", "barbell squat", "high bar squat", "low bar squat", "box squat alto high-bar", "box squat alto", "box squat", "squat bilanciere high-bar"], normalized: "Squat con Bilanciere", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "GLUTEI", "CORE"] },
  { keywords: ["front squat", "squat frontale"], normalized: "Front Squat con Bilanciere", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "CORE"] },
  { keywords: ["leg press 45°", "leg press 45", "leg press", "pressa 45", "pressa", "leg press unilaterale", "leg press bilaterale", "leg press singola"], normalized: "Leg Press 45°", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "GLUTEI"] },
  { keywords: ["leg extension", "leg extension unilaterale", "leg extension bilaterale"], normalized: "Leg Extension", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI"] },
  { keywords: ["stacco da terra", "deadlift", "barbell deadlift", "stacco convenzionale", "stacco sumo"], normalized: "Stacco da Terra con Bilanciere", muscle: "SCHIENA", muscles: ["SCHIENA", "FEMORALI", "GLUTEI", "CORE"] },
  { keywords: ["stacco rumeno", "romanian deadlift", "rdl", "stacco a gambe tese", "stacco a gambe semitese", "rdl manubri", "stacco rumeno manubri"], normalized: "Stacco Rumeno con Bilanciere", muscle: "FEMORALI", muscles: ["FEMORALI", "GLUTEI", "SCHIENA"] },
  { keywords: ["leg curl", "lying leg curl", "seated leg curl", "leg curl seduto", "leg curl sdraiato", "leg curl unilaterale", "leg curl bilaterale", "leg curl singola"], normalized: "Leg Curl Sdraiato", muscle: "FEMORALI", muscles: ["FEMORALI"] },
  { keywords: ["trazioni alla sbarra", "trazioni", "pull up", "pull-ups", "chin up", "chin-ups", "trazioni prone", "trazioni neutre"], normalized: "Trazioni alla Sbarra", muscle: "DORSALI", muscles: ["DORSALI", "BICIPITI"] },
  { keywords: ["lat machine presa larga", "lat machine presa neutra", "lat machine", "lat machine presa diversa", "lat pulldown", "lat machine avanti"], normalized: "Lat Machine Presa Larga", muscle: "DORSALI", muscles: ["DORSALI", "BICIPITI"] },
  { keywords: ["rematore con bilanciere", "rematore bilanciere", "barbell row", "bent over row"], normalized: "Rematore con Bilanciere", muscle: "DORSALI", muscles: ["DORSALI", "SCHIENA", "BICIPITI"] },
  { keywords: ["rematore con manubrio", "rematore manubrio", "dumbbell row", "single arm dumbbell row", "dorsey machine monopodalica", "dorsey machine", "low row 1 braccio"], normalized: "Rematore con Manubrio", muscle: "DORSALI", muscles: ["DORSALI", "BICIPITI"] },
  { keywords: ["pulley", "pulley basso", "pulley basso presa larga", "seated cable row"], normalized: "Pulley Basso", muscle: "DORSALI", muscles: ["DORSALI", "SCHIENA"] },
  { keywords: ["military press", "lento avanti", "overhead press", "ohp", "shoulder press", "shoulder press convergente"], normalized: "Military Press con Bilanciere", muscle: "DELTOIDI", muscles: ["DELTOIDI", "TRICIPITI"] },
  { keywords: ["alzate laterali", "lateral raises", "side lateral raise", "alzate laterali cavo singolo", "alzate laterali manubri", "alzate laterali cavi"], normalized: "Alzate Laterali con Manubri", muscle: "DELTOIDI", muscles: ["DELTOIDI"] },
  { keywords: ["alzate posteriori", "rear delt fly", "croci inverse", "face pull", "rear delt machine"], normalized: "Face Pull al Cavo", muscle: "DELTOIDI", muscles: ["DELTOIDI", "SCHIENA"] },
  { keywords: ["curl con bilanciere", "barbell curl", "bicep curl", "curl bilanciere", "curl bilanciere ez", "curl singolo al cavo", "curl singolo cavo"], normalized: "Curl con Bilanciere", muscle: "BICIPITI", muscles: ["BICIPITI"] },
  { keywords: ["curl con manubri", "dumbbell curl", "curl alternato"], normalized: "Curl Alternato con Manubri", muscle: "BICIPITI", muscles: ["BICIPITI"] },
  { keywords: ["hammer curl", "curl a martello"], normalized: "Hammer Curl con Manubri", muscle: "BICIPITI", muscles: ["BICIPITI", "AVAMBRACCI"] },
  { keywords: ["pushdown corda", "pushdown", "pushdown ai cavi", "triceps pushdown", "corda tricipiti", "french press/cavo"], normalized: "Pushdown ai Cavi con Corda", muscle: "TRICIPITI", muscles: ["TRICIPITI"] },
  { keywords: ["french press", "skull crusher", "estensioni tricipiti"], normalized: "French Press con Bilanciere EZ", muscle: "TRICIPITI", muscles: ["TRICIPITI"] },
  { keywords: ["dip alle parallele", "dip", "dips", "parallele"], normalized: "Dip alle Parallele", muscle: "PETTO", muscles: ["PETTO", "TRICIPITI", "DELTOIDI"] },
  { keywords: ["calf raise", "calf in piedi", "calf seduto", "calves", "calf raise smith in piedi", "smith calf raise in piedi", "calf smith"], normalized: "Calf Raise in Piedi", muscle: "POLPACCI", muscles: ["POLPACCI"] },
  { keywords: ["crunch", "plank", "ab roller", "leg raise", "hanging leg raise", "addominali", "cable crunch", "crunch ai cavi", "cable crunch inginocchiato"], normalized: "Plank Addominale", muscle: "CORE", muscles: ["CORE"] },
  { keywords: ["adductor", "adductor machine", "adduttori"], normalized: "Adductor Machine", muscle: "GAMBE", muscles: ["GAMBE", "ADDUTTORI"] },
  { keywords: ["abductor", "abductor machine", "abduttori"], normalized: "Abductor Machine", muscle: "GLUTEI", muscles: ["GLUTEI", "ABDUTTORI"] },
  { keywords: ["pullover", "pullover ai cavi"], normalized: "Pullover ai Cavi", muscle: "DORSALI", muscles: ["DORSALI", "PETTO"] }
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
    const setRepMatch = str.match(/(\\d+)\\s*(?:x|X|\\*|\\u00d7)\\s*(\\d+(?:[\\-\u2013\\/]\\d+)?(?:\\+AMRAP)?|AMRAP|MAX)/i);
    if (setRepMatch) {
      sets = parseInt(setRepMatch[1], 10) || 3;
      reps = setRepMatch[2].trim();
      reps_raw = reps;
    } else {
      const repsRangeMatch = str.match(/(\\d+\\s*[\\-\u2013\\/]\\s*\\d+)/);
      if (repsRangeMatch) {
        reps = repsRangeMatch[1].trim();
        reps_raw = reps;
      }
    }
  }

  const rirMatch = str.match(/(?:@\\s*)?RIR\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)/i);
  if (rirMatch) {
    rir = parseFloat(rirMatch[1]);
    rpe = typeof rirToRpe === "function" ? rirToRpe(rir) : (10 - rir);
  }

  const rpeMatch = str.match(/(?:@\\s*)?RPE\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)/i);
  if (rpeMatch) {
    rpe = parseFloat(rpeMatch[1]);
    if (rir === null) rir = typeof rpeToRir === "function" ? rpeToRir(rpe) : (10 - rpe);
  }

  const percMatch = str.match(/(?:@\\s*)?(\\d+(?:\\.\\d+)?)\\s*%\\s*(?:1RM|RM)?/i);
  if (percMatch) {
    percentage_1rm = parseFloat(percMatch[1]);
  }

  const restMinRangeMatch = str.match(/(\\d+(?:\\.\\d+)?)\\s*[\\-\u2013]\\s*(\\d+(?:\\.\\d+)?)\\s*(?:min|minuti|')/i);
  if (restMinRangeMatch) {
    const minVal = parseFloat(restMinRangeMatch[1]);
    const maxVal = parseFloat(restMinRangeMatch[2]);
    rest_seconds = Math.round(((minVal + maxVal) / 2) * 60);
  } else {
    const restSecRangeMatch = str.match(/(\\d+)\\s*[\\-\u2013]\\s*(\\d+)\\s*(?:s|sec|secondi|")/i);
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
        address: xlsxLib ? xlsxLib.utils.encode_cell({ r: rIdx, c: cIdx }) : \`R\${rIdx+1}C\${cIdx+1}\`,
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
  if (/^(ALIMENTAZIONE|NUTRIZIONE|DIETA|PIANO ALIMENTARE|MEALS|MEAL PLAN|PASTI|FOOD|NUTRITION)/i.test(nameUpper)) {
    return "nutrition";
  }
  if (/^(INTEGRAZIONE|INTEGRATORI|SUPPLEMENTI|SUPPLEMENTATION|SUPPLEMENTS)/i.test(nameUpper)) {
    return "supplementation";
  }
  if (/^(TERAPIA ED ESAMI|TERAPIA_ESAMI|PIANO CLINICO|CLINICAL)/i.test(nameUpper)) {
    return "therapy_exams";
  }
  if (/^(TERAPIA|FARMACOLOGIA|TRATTAMENTO|TERAPIE|MEDICINALI)/i.test(nameUpper)) {
    return "therapy";
  }
  if (/^(ESAMI|ANALISI|ESAMI DEL SANGUE|BLOODWORK|REFERTI|VALORI)/i.test(nameUpper)) {
    return "exams";
  }

  let trainingHits = 0;
  let nutritionHits = 0;
  let supplementHits = 0;
  let therapyHits = 0;
  let examHits = 0;

  for (let i = 0; i < Math.min(30, rawRows.length); i++) {
    const rowStr = (rawRows[i] || []).join(" ").toLowerCase();
    if (/movimento|esercizio|reps|rir|recupero|panca|squat|stacco|serie/.test(rowStr)) trainingHits++;
    if (/colazione|pranzo|cena|spuntino|merenda|pre-nanna|alimento|grammi|kcal|calorie|proteine|carboidrati|grassi/.test(rowStr)) nutritionHits++;
    if (/creatina|whey|omega|dosaggio|timing|multivitaminico|magnesio|integratore/.test(rowStr)) supplementHits++;
    if (/farmaco|posologia|somministrazione|medicinale|durata settimane|compresse|terapia/.test(rowStr)) therapyHits++;
    if (/esame|referto|analisi|sangue|emocromo|testosterone|glicemia|transaminasi|valori di riferimento/.test(rowStr)) examHits++;
  }

  if (nutritionHits >= 2 && nutritionHits >= trainingHits) return "nutrition";
  if (supplementHits >= 2 && supplementHits >= trainingHits) return "supplementation";
  if (therapyHits >= 1 && examHits >= 1) return "therapy_exams";
  if (therapyHits >= 2) return "therapy";
  if (examHits >= 2) return "exams";
  if (trainingHits >= 2 && trainingHits > nutritionHits) return "training";

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

    const dayMatch = rowStr.match(/^(?:GIORNO|DAY|SEDUTA|SESSIONE)\\s*([0-9a-zA-Z\\s\\u2022\\—\\-\\_]+)/i);
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
      const targetRpeNum = (targetRirNum !== null && !isNaN(targetRirNum)) ? (typeof rirToRpe === "function" ? rirToRpe(targetRirNum) : 10 - targetRirNum) : ((currentExercise.rpe_target !== undefined && currentExercise.rpe_target !== null && !isNaN(currentExercise.rpe_target)) ? currentExercise.rpe_target : 8);

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
      const targetRpeNum = (targetRirNum !== null && !isNaN(targetRirNum)) ? (typeof rirToRpe === "function" ? rirToRpe(targetRirNum) : 10 - targetRirNum) : (details.rpe !== null && details.rpe !== undefined ? details.rpe : 8);

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

  if (!notes) {
    const noteMatch = foodName.match(/\\(([^)]+)\\)/);
    if (noteMatch) {
      notes = noteMatch[1].trim();
      foodName = foodName.replace(noteMatch[0], "").trim();
    }
  }

  if (kcal === null) {
    const kcalMatch = foodName.match(/(\\d+(?:\\.\\d+)?)\\s*(?:kcal|calorie|cal)\\b/i);
    if (kcalMatch) {
      kcal = parseFloat(kcalMatch[1]);
      foodName = foodName.replace(kcalMatch[0], "").trim();
    }
  }

  if (protein_g === null) {
    const proMatch = foodName.match(/(?:pro(?:t|teine)?|p)\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)\\s*g?\\b/i);
    if (proMatch) {
      protein_g = parseFloat(proMatch[1]);
      foodName = foodName.replace(proMatch[0], "").trim();
    }
  }

  if (carbs_g === null) {
    const carbMatch = foodName.match(/(?:carb(?:o|oidrati)?|c|cho)\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)\\s*g?\\b/i);
    if (carbMatch) {
      carbs_g = parseFloat(carbMatch[1]);
      foodName = foodName.replace(carbMatch[0], "").trim();
    }
  }

  if (fat_g === null) {
    const fatMatch = foodName.match(/(?:fat|grassi|g)\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)\\s*g?\\b/i);
    if (fatMatch) {
      fat_g = parseFloat(fatMatch[1]);
      foodName = foodName.replace(fatMatch[0], "").trim();
    }
  }

  if (quantity === null || quantity === "") {
    const qtyUnitMatch = foodName.match(/(\\d+(?:[.,]\\d+)?)\\s*(g|gr|grammi|ml|l|litri|cps|capsule|compresse|cp|fette|fetta|scoop|misurini|misurino|porzioni|porzione|pz|pezzi|cucchiai|cucchiaio|uova|albumi)\\b/i);
    if (qtyUnitMatch) {
      quantity = parseFloat(qtyUnitMatch[1].replace(",", "."));
      if (!unit) unit = qtyUnitMatch[2].toLowerCase();
      foodName = foodName.replace(qtyUnitMatch[0], "").trim();
    } else {
      const leadingNumMatch = foodName.match(/^(\\d+(?:[.,]\\d+)?)\\s+([a-zA-ZÀ-ÿ\\s'-]+)$/);
      if (leadingNumMatch) {
        quantity = parseFloat(leadingNumMatch[1].replace(",", "."));
        if (!unit) unit = "pz";
        foodName = leadingNumMatch[2].trim();
      }
    }
  } else if (typeof quantity === "string" && !unit) {
    const qMatch = quantity.match(/(\\d+(?:[.,]\\d+)?)\\s*([a-zA-Z%]+)?/);
    if (qMatch) {
      quantity = parseFloat(qMatch[1].replace(",", "."));
      if (qMatch[2]) unit = qMatch[2].trim();
    }
  }

  if (typeof quantity === "string" && !isNaN(parseFloat(quantity))) {
    quantity = parseFloat(quantity);
  }

  if (unit) {
    const uLow = unit.toLowerCase();
    if (uLow === "gr" || uLow === "grammi") unit = "g";
    else if (uLow === "litri" || uLow === "l") unit = "ml";
    else if (uLow === "compresse" || uLow === "cp") unit = "compresse";
    else if (uLow === "capsule" || uLow === "cps") unit = "capsule";
    else if (uLow === "fetta" || uLow === "fette") unit = "fette";
    else if (uLow === "misurino" || uLow === "misurini" || uLow === "scoop") unit = "misurino";
    else if (uLow === "cucchiaio" || uLow === "cucchiai") unit = "cucchiaio";
    else if (uLow === "pz" || uLow === "pezzi") unit = "pz";
  } else {
    unit = "g";
  }

  foodName = foodName.replace(/^[,\-–:\\s]+|[,\-–:\\s]+$/g, "").trim();
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

    const dayMatch = rowStr.match(/^(?:=== )?(LUNED[IÌ]|MARTED[IÌ]|MERCOLED[IÌ]|GIOVED[IÌ]|VENERD[IÌ]|SABATO|DOMENICA|GIORNO\\s*\\d+|DAY\\s*\\d+|REST DAY|TRAINING DAY|GIORNI?\\s*ON|GIORNI?\\s*OFF|GIORNO\\s*[A-G]|PIANO GENERALE|TUTTI I GIORNI)/i);
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

    const col0Str = String(row[0] || "").trim();
    const isMealInCol0 = /^(Colazione|Pranzo|Cena|Spuntino(?:\\s*\\d*|\\s+Mattina|\\s+Pomeriggio)?|Pre[\\s\\-_]?nanna|Pre[\\s\\-_]?workout|Post[\\s\\-_]?workout|Merenda|Pasto\\s*\\d+|Meal\\s*\\d+)/i.test(col0Str);

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

    const isHeaderRow = row.some(c => /^(integratore|supplemento|nome|dose|dosaggio|timing|assunzione|frequenza)$/i.test(String(c || "").trim()));
    if (isHeaderRow) {
      headerColMap = {};
      row.forEach((cellVal, cIdx) => {
        const v = String(cellVal || "").toLowerCase().trim();
        if (v.includes("integratore") || v.includes("supplemento") || v === "nome") headerColMap.name = cIdx;
        else if (v === "dose" || v === "dosaggio" || v === "quantità" || v === "qta") headerColMap.dose = cIdx;
        else if (v === "unità" || v === "unit" || v === "unita") headerColMap.unit = cIdx;
        else if (v.includes("timing") || v.includes("momento") || v.includes("quando") || v.includes("assunzione")) headerColMap.timing = cIdx;
        else if (v.includes("frequenza") || v.includes("giorni")) headerColMap.frequency = cIdx;
        else if (v.includes("note")) headerColMap.notes = cIdx;
      });
      continue;
    }

    let name = headerColMap?.name !== undefined ? row[headerColMap.name] : row[0];
    let doseRaw = headerColMap?.dose !== undefined ? row[headerColMap.dose] : row[1];
    let unitRaw = headerColMap?.unit !== undefined ? row[headerColMap.unit] : null;
    let timingRaw = headerColMap?.timing !== undefined ? row[headerColMap.timing] : row[2];
    let freqRaw = headerColMap?.frequency !== undefined ? row[headerColMap.frequency] : null;
    let notesRaw = headerColMap?.notes !== undefined ? row[headerColMap.notes] : row[3];

    name = name == null ? "" : String(name).trim();
    doseRaw = doseRaw == null ? "" : String(doseRaw).trim();
    timingRaw = timingRaw == null ? "" : String(timingRaw).trim();
    notesRaw = notesRaw == null ? "" : String(notesRaw).trim();

    if (!name) continue;

    let doseVal = doseRaw;
    let unit = unitRaw ? String(unitRaw).trim() : "g";

    const doseMatch = doseRaw.match(/(\\d+(?:[.,]\\d+)?)\\s*(g|mg|mcg|cps|capsule|compresse|cp|scoop|misurini|misurino|ml|ui|bustine)?/i);
    if (doseMatch) {
      doseVal = parseFloat(doseMatch[1].replace(",", "."));
      if (doseMatch[2]) unit = doseMatch[2].toLowerCase();
    }

    items.push({
      name,
      dose: doseVal || "Secondo indicazione",
      dosage: \`\${doseVal} \${unit}\`.trim(),
      unit: unit || "g",
      timing: timingRaw || "Quotidiano",
      frequency: freqRaw || "Quotidiano",
      category: /farmaco|medicinale|terapia/i.test(rowStr) ? "medication" : "supplement",
      relation: timingRaw || null,
      notes: notesRaw || null
    });
  }

  return { present: items.length > 0, items };
}

function parseTherapyExamsSheet(sheet) {
  const rawRows = sheet.rawRows || [];
  const rawTherapyEntries = [];
  const rawExamEntries = [];

  let headerColMap = null;

  for (let rIdx = 0; rIdx < rawRows.length; rIdx++) {
    const row = rawRows[rIdx] || [];
    const nonEmpty = row.map(c => c == null ? "" : String(c).trim()).filter(Boolean);
    if (!nonEmpty.length) continue;

    const rowStr = nonEmpty.join(" ");
    if (rowStr.toUpperCase().includes("TERAPIA ED ESAMI") || rowStr.toUpperCase().includes("PIANO CLINICO") || rowStr.toUpperCase().includes("PIANO TERAPIA")) continue;

    const isHeaderRow = row.some(c => /^(data|farmaco|medicinale|esame|parametro|dose|dosaggio|posologia|valore|referto|intervallo|giorno|giorni|frequenza|orario|timing|durata|note)$/i.test(String(c || "").trim()));
    if (isHeaderRow) {
      headerColMap = {};
      row.forEach((cellVal, cIdx) => {
        const v = String(cellVal || "").toLowerCase().trim();
        if (v.includes("data") || v.includes("date") || v.includes("settimana")) headerColMap.date = cIdx;
        else if (v.includes("farmaco") || v.includes("medicinale") || v.includes("esame") || v.includes("parametro") || v === "voce") headerColMap.name = cIdx;
        else if (v.includes("dose") || v.includes("dosaggio") || v.includes("posologia") || v.includes("valore") || v.includes("referto")) headerColMap.value = cIdx;
        else if (v.includes("giorn") || v.includes("day") || v.includes("frequenza") || v.includes("quando")) headerColMap.days = cIdx;
        else if (v.includes("orario") || v.includes("timing") || v.includes("ora") || v.includes("momento")) headerColMap.timing = cIdx;
        else if (v.includes("durata") || v.includes("duration") || v.includes("periodo")) headerColMap.duration = cIdx;
        else if (v.includes("intervallo") || v.includes("riferimento") || v.includes("range")) headerColMap.range = cIdx;
        else if (v.includes("unit") || v.includes("unità") || v.includes("unita")) headerColMap.unit = cIdx;
        else if (v.includes("note")) headerColMap.notes = cIdx;
      });
      continue;
    }

    const col0 = headerColMap?.date !== undefined ? row[headerColMap.date] : row[0];
    const col1 = headerColMap?.name !== undefined ? row[headerColMap.name] : (row[1] || row[0]);
    const col2 = headerColMap?.value !== undefined ? row[headerColMap.value] : row[2];
    const colDays = headerColMap?.days !== undefined ? row[headerColMap.days] : "";
    const col3 = headerColMap?.timing !== undefined ? row[headerColMap.timing] : (headerColMap?.range !== undefined ? row[headerColMap.range] : row[3]);
    const col4 = headerColMap?.duration !== undefined ? row[headerColMap.duration] : row[4];
    const col5 = headerColMap?.notes !== undefined ? row[headerColMap.notes] : row[5];

    const isExamRow = /emocromo|emoglobina|testosterone|ematocrito|glicemia|colesterolo|transaminasi|ast|alt|creatinina|referto|range|intervallo|ng[\\/]dl|mg[\\/]dl|pg[\\/]ml|u[\\/]l|%/i.test(rowStr);

    if (isExamRow) {
      rawExamEntries.push({
        date: col0 ? String(col0).trim() : null,
        parameter: String(col1 || col0).trim(),
        name: String(col1 || col0).trim(),
        value: col2 ? String(col2).trim() : "",
        unit: headerColMap?.unit !== undefined ? String(row[headerColMap.unit] || "").trim() : (col3 && !col3.includes("-") ? String(col3).trim() : ""),
        reference_range: headerColMap?.range !== undefined ? String(row[headerColMap.range] || "").trim() : (col3 && col3.includes("-") ? String(col3).trim() : (col4 || null)),
        notes: col5 ? String(col5).trim() : (col4 && !col4.includes("-") ? String(col4).trim() : null)
      });
    } else {
      rawTherapyEntries.push({
        nameRaw: col1 ? String(col1).trim() : String(col0).trim(),
        doseRaw: col2 ? String(col2).trim() : "",
        daysRaw: colDays ? String(colDays).trim() : "",
        timingRaw: col3 ? String(col3).trim() : "",
        durationRaw: col4 ? String(col4).trim() : "",
        notesRaw: col5 ? String(col5).trim() : (row[3] ? String(row[3]).trim() : "")
      });
    }
  }

  const medicationsMap = new Map();
  const legacyTherapyEntries = [];

  rawTherapyEntries.forEach(entry => {
    const med = String(entry.nameRaw || "").trim();
    if (!med) return;

    let dose = String(entry.doseRaw || "").trim();
    let daysRaw = String(entry.daysRaw || "").trim();
    let duration = String(entry.durationRaw || "").trim();
    let timing = String(entry.timingRaw || "").trim();
    let notes = entry.notesRaw ? String(entry.notesRaw).trim() : null;

    if (!dose && med) {
      const doseMatch = med.match(/(\\d+(?:[.,]\\d+)?\\s*(?:mg|mcg|g|cps|capsule|compresse|cp|fiale|fiala|ui|ml|gocce|dose|bustine))/i);
      if (doseMatch) dose = doseMatch[1].trim();
    }

    let durationWeeks = null;
    const durMatch = (duration + " " + notes + " " + med).match(/(\\d+)\\s*(?:settimane|sett|weeks|w)\\b/i);
    if (durMatch) durationWeeks = parseInt(durMatch[1], 10);

    const allText = (daysRaw + " " + timing + " " + notes + " " + dose + " " + med).toUpperCase();
    const daysDetected = [];
    if (allText.includes("LUNED") || allText.includes("MON")) daysDetected.push("Lunedì");
    if (allText.includes("MARTED") || allText.includes("TUE")) daysDetected.push("Martedì");
    if (allText.includes("MERCOLED") || allText.includes("WED")) daysDetected.push("Mercoledì");
    if (allText.includes("GIOVED") || allText.includes("THU")) daysDetected.push("Giovedì");
    if (allText.includes("VENERD") || allText.includes("FRI")) daysDetected.push("Venerdì");
    if (allText.includes("SABATO") || allText.includes("SAT")) daysDetected.push("Sabato");
    if (allText.includes("DOMENICA") || allText.includes("SUN")) daysDetected.push("Domenica");

    let days = daysDetected.length > 0 ? daysDetected : (daysRaw ? [daysRaw] : ["Tutti i giorni"]);
    if (allText.includes("TUTTI I GIORNI") || allText.includes("QUOTIDIANO") || allText.includes("DAILY")) {
      days = ["Tutti i giorni"];
    }

    const cleanMedName = med.replace(/(\\d+(?:[.,]\\d+)?\\s*(?:mg|mcg|g|cps|capsule|compresse|cp|fiale|fiala|ui|ml|gocce|dose|bustine))/i, "").replace(/^[,\-–:\\s]+|[,\-–:\\s]+$/g, "").trim() || med;
    const groupKey = \`\${cleanMedName.toLowerCase()}_\${dose.toLowerCase()}_\${durationWeeks || 0}\`;

    if (medicationsMap.has(groupKey)) {
      const existing = medicationsMap.get(groupKey);
      days.forEach(d => {
        if (!existing.days.includes(d) && d !== "Tutti i giorni") {
          existing.days.push(d);
        }
      });
      if (notes && !existing.notes?.includes(notes)) {
        existing.notes = existing.notes ? \`\${existing.notes}; \${notes}\` : notes;
      }
    } else {
      medicationsMap.set(groupKey, {
        medication: cleanMedName,
        name: cleanMedName,
        dose: dose || "1 dose",
        dose_value: parseFloat(dose.replace(/[^0-9.]/g, "")) || 1,
        unit: dose.replace(/[0-9.,\\s]/g, "") || "dose",
        days: [...days],
        duration_weeks: durationWeeks,
        duration_text: durationWeeks ? \`\${durationWeeks} settimane\` : (duration || null),
        timing: timing || null,
        notes: notes
      });
    }

    legacyTherapyEntries.push({
      date_or_week: days.join(" + ") || "Generale",
      item_name: med,
      value: dose || "1 dose",
      notes: notes
    });
  });

  const medications = Array.from(medicationsMap.values());

  return {
    therapy: {
      present: medications.length > 0,
      medications: medications,
      entries: legacyTherapyEntries
    },
    exams: {
      present: rawExamEntries.length > 0,
      records: rawExamEntries,
      items: rawExamEntries
    }
  };
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
  const examSheets = classifiedSheets.filter(s => s.sheetType === "exams");
  const therapyExamSheets = classifiedSheets.filter(s => s.sheetType === "therapy_exams");

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

  let totalMeals = 0;
  let totalFoods = 0;
  (nutrition.days || []).forEach(d => {
    totalMeals += (d.meals || []).length;
    (d.meals || []).forEach(m => {
      totalFoods += (m.foods || m.items || []).length;
    });
  });

  const canonicalProgram = {
    title: filename.replace(/\\.[^/.]+$/, "").replace(/[_\\-]+/g, " "),
    original_title: filename,
    normalized_title: "GS Universal Imported Program",
    description: "Programmazione completa acquisita da Universal Import Engine 2.1.",
    author: "Atleta Giammaria System",
    source: { type: "xlsx", filename },
    goal: { primary: "Ipertrofia", secondary: ["Forza"], confidence: "high" },
    difficulty: "Intermedio",
    experience_level: "Intermedio",
    training_frequency: weeks[0]?.sessions?.length || 3,
    duration_weeks: weeks.length || 4,
    equipment: ["Palestra Commerciale"],
    training: { weeks },
    weeks,
    nutrition,
    supplementation,
    therapy,
    exams,
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
    stats: integrityStats
  };
}

function parseCanonicalProgramFromText(rawText, filename = "documento_importato") {
  const lines = rawText.split(/\\r?\\n/).map(l => l.trim()).filter(Boolean);
  const warnings = [];
  const errors = [];

  const program = {
    title: filename.replace(/\\.[^/.]+$/, "").replace(/[_\\-]+/g, " "),
    original_title: filename,
    normalized_title: "GS Imported Program",
    description: "Programmazione acquisita da Universal Import Engine 2.1.",
    author: "Imported User",
    source: { type: "text", filename },
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
      const dayMatch = line.match(/^(?:=== )?(LUNED[IÌ]|MARTED[IÌ]|MERCOLED[IÌ]|GIOVED[IÌ]|VENERD[IÌ]|SABATO|DOMENICA|GIORNO\\s*\\d+|DAY\\s*\\d+)/i);
      if (dayMatch) {
        flushCurrentMeal();
        currentDayName = dayMatch[1].toUpperCase();
        continue;
      }

      const mealMatch = line.match(/^(colazione|pranzo|cena|spuntino(?:\\s*\\d*|\\s+mattina|\\s+pomeriggio)?|merenda|pre[\\s\\-_]?nanna|pre[\\s\\-_]?workout|post[\\s\\-_]?workout|meal\\s*\\d+)\\s*[:=\\-]?\\s*(.*)/i);
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
      const doseMatch = line.match(/(\\d+(?:[.,]\\d+)?\\s*(?:g|mg|mcg|cps|capsule|compresse|cp|scoop|misurini|ml|ui|bustine))/i);
      const timingMatch = line.match(/(mattina|colazione|pranzo|cena|pre-workout|post-workout|prima di dormire|\\d{1,2}:\\d{2})/i);
      const name = line.replace(/(\\d+(?:[.,]\\d+)?\\s*(?:g|mg|mcg|cps|capsule|compresse|cp|scoop|misurini|ml|ui|bustine)|mattina|colazione|pranzo|cena|pre-workout|post-workout|\\d{1,2}:\\d{2})/gi, "").replace(/^[,\-–:\\s]+|[,\-–:\\s]+$/g, "").trim() || line;
      program.supplementation.items.push({
        name,
        dose: doseMatch ? doseMatch[1] : "Secondo indicazione",
        dosage: doseMatch ? doseMatch[1] : "Secondo indicazione",
        unit: doseMatch ? doseMatch[1].replace(/[0-9.,\\s]/g, "") : "g",
        timing: timingMatch ? timingMatch[1] : "Quotidiano",
        frequency: "Quotidiano",
        relation: timingMatch ? timingMatch[1] : null,
        notes: null
      });
      continue;
    }

    if (currentSection === "therapy") {
      const parsed = parseTherapyExamsSheet({ rawRows: [[line]] });
      const item = parsed.therapy.medications[0];
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
      const parsed = parseTherapyExamsSheet({ rawRows: [[line]] });
      const record = parsed.exams.records[0];
      if (record) {
        program.exams.records.push(record);
        program.exams.items.push(record);
      }
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

      const dayMatch = line.match(/^(?:giorno|day|seduta|sessione)\\s*[:=\\-]?\\s*([0-9a-zA-Z\\s\\-_\\u2022]+)/i);
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

  program.training = { weeks: program.weeks };
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
    canonical_sets_count: totalSets,
    nutrition_days_count: program.nutrition.days.length,
    supplement_items_count: program.supplementation.items.length,
    therapy_medications_count: program.therapy.medications.length,
    exam_records_count: program.exams.records.length
  };

  return { program, canonicalProgram: program, warnings, errors, stats };
}

// ====================================================
// IMPORT REVIEW INTERACTIVE CONTROLLERS & CALLBACKS (2.1)
// ====================================================

function switchReviewTab(tabName) {
  if (window.programImportState) {
    window.programImportState.activeReviewTab = tabName;
  }
  if (currentView === 'import') render();
}

function updateReviewTitle(title) {
  if (window.programImportState?.canonicalProgram) {
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
        ex.sets.forEach(s => s.target_load = ex.load_value);
      }
    } else if (field === 'notes') {
      ex.notes = value;
    }
  } catch (e) {
    console.warn("updateReviewExerciseField error:", e);
  }
}

// Nutrition Interactive Callbacks
function updateReviewMealItem(dayIdx, mealIdx, itemIdx, field, value) {
  try {
    const meal = window.programImportState?.canonicalProgram?.nutrition?.days?.[dayIdx]?.meals?.[mealIdx];
    const item = (meal?.foods || meal?.items)?.[itemIdx];
    if (!item) return;

    if (field === 'food' || field === 'name') {
      item.name = value;
      item.food = value;
    } else if (field === 'quantity') {
      const num = parseFloat(String(value).replace(',', '.'));
      item.quantity = !isNaN(num) ? num : value;
    } else if (field === 'unit') {
      item.unit = value;
    } else if (field === 'kcal') {
      const num = parseFloat(value);
      item.kcal = !isNaN(num) ? num : null;
    } else if (field === 'protein_g') {
      const num = parseFloat(value);
      item.protein_g = !isNaN(num) ? num : null;
    } else if (field === 'carbs_g') {
      const num = parseFloat(value);
      item.carbs_g = !isNaN(num) ? num : null;
    } else if (field === 'fat_g') {
      const num = parseFloat(value);
      item.fat_g = !isNaN(num) ? num : null;
    } else if (field === 'notes') {
      item.notes = value;
    }
  } catch (e) {
    console.warn("updateReviewMealItem error:", e);
  }
}

function addReviewMealItem(dayIdx, mealIdx) {
  try {
    const meal = window.programImportState?.canonicalProgram?.nutrition?.days?.[dayIdx]?.meals?.[mealIdx];
    if (!meal) return;
    if (!meal.foods) meal.foods = [];
    if (!meal.items) meal.items = meal.foods;
    const newItem = {
      name: "Nuovo Alimento",
      food: "Nuovo Alimento",
      quantity: 100,
      unit: "g",
      kcal: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
      notes: null
    };
    meal.foods.push(newItem);
    if (meal.items !== meal.foods) meal.items.push(newItem);
    if (currentView === 'import') render();
  } catch (e) {}
}

function removeReviewMealItem(dayIdx, mealIdx, itemIdx) {
  try {
    const meal = window.programImportState?.canonicalProgram?.nutrition?.days?.[dayIdx]?.meals?.[mealIdx];
    if (!meal) return;
    if (Array.isArray(meal.foods)) meal.foods.splice(itemIdx, 1);
    if (Array.isArray(meal.items) && meal.items !== meal.foods) meal.items.splice(itemIdx, 1);
    if (currentView === 'import') render();
  } catch (e) {}
}

// Supplement Interactive Callbacks
function updateReviewSupplementItem(itemIdx, field, value) {
  try {
    const item = window.programImportState?.canonicalProgram?.supplementation?.items?.[itemIdx];
    if (!item) return;
    item[field] = value;
    if (field === 'dose' || field === 'unit') {
      item.dosage = \`\${item.dose || ''} \${item.unit || ''}\`.trim();
    }
  } catch (e) {}
}

function addReviewSupplementItem() {
  try {
    const supp = window.programImportState?.canonicalProgram?.supplementation;
    if (!supp) return;
    if (!Array.isArray(supp.items)) supp.items = [];
    supp.present = true;
    supp.items.push({
      name: "Nuovo Integratore",
      dose: "5",
      unit: "g",
      dosage: "5 g",
      timing: "Mattina",
      frequency: "Quotidiano",
      notes: null
    });
    if (currentView === 'import') render();
  } catch (e) {}
}

function removeReviewSupplementItem(itemIdx) {
  try {
    const supp = window.programImportState?.canonicalProgram?.supplementation;
    if (supp && Array.isArray(supp.items)) {
      supp.items.splice(itemIdx, 1);
      if (supp.items.length === 0) supp.present = false;
      if (currentView === 'import') render();
    }
  } catch (e) {}
}

// Therapy Interactive Callbacks
function updateReviewTherapyMedication(medIdx, field, value) {
  try {
    const therapy = window.programImportState?.canonicalProgram?.therapy;
    const med = therapy?.medications?.[medIdx];
    if (!med) return;

    if (field === 'medication' || field === 'name') {
      med.medication = value;
      med.name = value;
    } else if (field === 'dose') {
      med.dose = value;
    } else if (field === 'days') {
      med.days = String(value).split(/[+,;]/).map(d => d.trim()).filter(Boolean);
    } else if (field === 'duration_weeks') {
      const num = parseInt(value, 10);
      med.duration_weeks = !isNaN(num) ? num : null;
      med.duration_text = med.duration_weeks ? \`\${med.duration_weeks} settimane\` : value;
    } else if (field === 'timing') {
      med.timing = value;
    } else if (field === 'notes') {
      med.notes = value;
    }
  } catch (e) {}
}

function addReviewTherapyMedication() {
  try {
    const therapy = window.programImportState?.canonicalProgram?.therapy;
    if (!therapy) return;
    if (!Array.isArray(therapy.medications)) therapy.medications = [];
    therapy.present = true;
    therapy.medications.push({
      medication: "Nuovo Trattamento",
      name: "Nuovo Trattamento",
      dose: "1 dose",
      days: ["Tutti i giorni"],
      duration_weeks: 4,
      duration_text: "4 settimane",
      timing: "Mattina",
      notes: null
    });
    if (currentView === 'import') render();
  } catch (e) {}
}

function removeReviewTherapyMedication(medIdx) {
  try {
    const therapy = window.programImportState?.canonicalProgram?.therapy;
    if (therapy && Array.isArray(therapy.medications)) {
      therapy.medications.splice(medIdx, 1);
      if (therapy.medications.length === 0) therapy.present = false;
      if (currentView === 'import') render();
    }
  } catch (e) {}
}

// Clinical Exams Interactive Callbacks
function updateReviewExamRecord(recIdx, field, value) {
  try {
    const exams = window.programImportState?.canonicalProgram?.exams;
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
    const exams = window.programImportState?.canonicalProgram?.exams;
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
    if (currentView === 'import') render();
  } catch (e) {}
}

function removeReviewExamRecord(recIdx) {
  try {
    const exams = window.programImportState?.canonicalProgram?.exams;
    if (exams) {
      if (Array.isArray(exams.records)) exams.records.splice(recIdx, 1);
      if (Array.isArray(exams.items) && exams.items !== exams.records) exams.items.splice(recIdx, 1);
      if ((exams.records?.length || 0) === 0) exams.present = false;
      if (currentView === 'import') render();
    }
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
        console.warn("[BACKEND IMPORT ATTEMPT]", backendErr.message, "-> Activating Instant Client-Side Parser 2.1!");
      }
    }

    // 2. Client-Side Universal Parser 2.1 (Offline Autonomous)
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

// ====================================================
// RENDER IMPORT REVIEW UX 2.1 (MOBILE-FIRST)
// ====================================================

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
    // STEP 2: IMPORT REVIEW SCREEN 2.1
    // ==========================================
    if (pState.canonicalProgram) {
      const prog = pState.canonicalProgram;
      const stats = pState.stats || {};
      const warnings = pState.warnings || [];
      const errors = pState.errors || [];
      const weeks = prog.weeks || [];
      const activeTab = pState.activeReviewTab || 'training';

      const nutritionDays = prog.nutrition?.days || [];
      const supplementItems = prog.supplementation?.items || [];
      const therapyMeds = prog.therapy?.medications || [];
      const examRecords = prog.exams?.records || prog.exams?.items || [];

      c.innerHTML = \`
        <div style="margin-bottom:16px; max-width:100%; box-sizing:border-box;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
            <div>
              <span class="badge badge-success" style="font-size:9px; letter-spacing:1px; text-transform:uppercase;">STEP 2: IMPORT REVIEW (UNIVERSAL ENGINE 2.1)</span>
              <h1 class="text-gold" style="font-size:22px; font-weight:900; margin:4px 0 0;">REVISIONE PROGRAMMA IMPORTATO</h1>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-outline" style="font-size:10px; padding:6px 12px;" onclick="cancelCurrentImportReview()">✕ ANNULLA</button>
              <button class="btn btn-primary" style="font-size:11px; font-weight:900; padding:6px 16px;" onclick="confirmImportAndActivate()">🚀 CONFERMA E ATTIVA</button>
            </div>
          </div>
          <p style="font-size:11px; color:#bbb; line-height:1.4; margin:0 0 14px;">
            Verifica e personalizza i dati estratti dal documento. Puoi modificare allenamento, nutrizione per pasti, integratori, terapia medica ed esami clinici prima di confermare.
          </p>
        </div>

        <!-- Overview Header Card -->
        <div class="card" style="border:1px solid rgba(212,175,55,0.4); background:linear-gradient(135deg, #18150c 0%, #0d0d0d 100%); margin-bottom:16px; max-width:100%; box-sizing:border-box;">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
            <h2>Dati Identificati</h2>
            <span class="badge badge-success" style="font-size:9px;">CANONICAL MODEL 2.1</span>
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
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(75px, 1fr)); gap:8px; text-align:center; background:#0a0a0a; border:1px solid #222; border-radius:8px; padding:10px; margin-bottom:12px;">
              <div>
                <div style="font-size:15px; font-weight:900; color:var(--gold);">\${stats.canonical_exercises_count || stats.total_exercises || 0}</div>
                <div style="font-size:8px; color:#888;">ESERCIZI</div>
              </div>
              <div>
                <div style="font-size:15px; font-weight:900; color:#fff;">\${stats.canonical_sets_count || stats.total_sets || 0}</div>
                <div style="font-size:8px; color:#888;">SERIE</div>
              </div>
              <div>
                <div style="font-size:15px; font-weight:900; color:#fff;">\${stats.canonical_sessions_count || stats.total_sessions || 0}</div>
                <div style="font-size:8px; color:#888;">SESSIONI</div>
              </div>
              <div>
                <div style="font-size:15px; font-weight:900; color:var(--gold);">\${stats.canonical_weeks_count || stats.total_weeks || weeks.length || 0}</div>
                <div style="font-size:8px; color:#888;">SETTIMANE</div>
              </div>
              <div>
                <div style="font-size:15px; font-weight:900; color:#4caf50;">\${nutritionDays.length}</div>
                <div style="font-size:8px; color:#888;">GIORNI DIETA</div>
              </div>
              <div>
                <div style="font-size:15px; font-weight:900; color:#2196f3;">\${supplementItems.length}</div>
                <div style="font-size:8px; color:#888;">INTEGRATORI</div>
              </div>
              <div>
                <div style="font-size:15px; font-weight:900; color:#e91e63;">\${therapyMeds.length}</div>
                <div style="font-size:8px; color:#888;">FARMACI</div>
              </div>
              <div>
                <div style="font-size:15px; font-weight:900; color:#00bcd4;">\${examRecords.length}</div>
                <div style="font-size:8px; color:#888;">ESAMI LAB</div>
              </div>
            </div>

            <!-- Navigation Tabs (4 distinct mobile-first buttons) -->
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button class="btn \${activeTab === 'training' ? 'btn-primary' : 'btn-outline'}" style="font-size:10px; padding:6px 12px;" onclick="switchReviewTab('training')">
                🏋️ ALLENAMENTO (\${weeks.length} Settimane)
              </button>
              <button class="btn \${activeTab === 'nutrition' ? 'btn-primary' : 'btn-outline'}" style="font-size:10px; padding:6px 12px;" onclick="switchReviewTab('nutrition')">
                🥗 ALIMENTAZIONE \${prog.nutrition?.present ? '✓ (' + nutritionDays.length + ' Giorni)' : ''}
              </button>
              <button class="btn \${activeTab === 'supplementation' ? 'btn-primary' : 'btn-outline'}" style="font-size:10px; padding:6px 12px;" onclick="switchReviewTab('supplementation')">
                💊 INTEGRAZIONE \${prog.supplementation?.present ? '✓ (' + supplementItems.length + ' Voci)' : ''}
              </button>
              <button class="btn \${activeTab === 'therapy' ? 'btn-primary' : 'btn-outline'}" style="font-size:10px; padding:6px 12px;" onclick="switchReviewTab('therapy')">
                🩺 TERAPIA / ESAMI \${(prog.therapy?.present || prog.exams?.present) ? '✓' : ''}
              </button>
            </div>
          </div>
        </div>

        <!-- TAB 1: ALLENAMENTO -->
        \${activeTab === 'training' ? \`
          <div style="margin-bottom:20px; max-width:100%;">
            <h3 style="color:var(--gold); font-size:14px; font-weight:900; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.5px;">
              Struttura Allenamento Estratta (\${weeks.length} Settimane)
            </h3>

            \${weeks.map((w, wIdx) => \`
              <div class="card" style="margin-bottom:12px; max-width:100%;">
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
                          <div style="background:#141414; border:1px solid #282828; border-radius:6px; padding:10px 12px; box-sizing:border-box;">
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                              <div style="flex:1; min-width:160px;">
                                <input type="text" value="\${esc(safeDisplayValue(ex.name_normalized || ex.name))}" style="width:100%; font-size:12px; font-weight:bold;" onchange="updateReviewExerciseField(\${wIdx}, \${sIdx}, \${exIdx}, 'name', this.value)">
                                <div style="font-size:9px; color:#666; margin-top:2px;">Orig: \${esc(safeDisplayValue(ex.name_original || ex.name))} • \${esc(safeDisplayValue(ex.muscle_group || 'TOTAL'))}</div>
                              </div>
                              <span class="badge" style="font-size:9px; color:var(--gold);">\${esc(safeDisplayValue(ex.muscle_group || 'TOTAL'))}</span>
                            </div>

                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(65px, 1fr)); gap:6px;">
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

        <!-- TAB 2: ALIMENTAZIONE (2.1 ENHANCED NUTRITION VIEW) -->
        \${activeTab === 'nutrition' ? \`
          <div class="card" style="margin-bottom:16px; max-width:100%;">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
              <h2>Piano Alimentare Strutturato Semantico</h2>
              <span class="badge badge-success" style="font-size:9px;">NUTRITION 2.1</span>
            </div>
            <div style="padding:14px 18px; font-size:11px;">
              \${nutritionDays.length > 0 ? nutritionDays.map((d, dIdx) => \`
                <div style="margin-bottom:16px; background:#111; border:1px solid #222; border-radius:8px; padding:12px; box-sizing:border-box;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #222; padding-bottom:6px;">
                    <span style="color:var(--gold); font-weight:900; font-size:14px; text-transform:uppercase;">📅 \${esc(safeDisplayValue(d.day_name || d.day))}</span>
                    <span style="font-size:10px; color:#888;">\${(d.meals || []).length} Pasti</span>
                  </div>

                  \${(d.meals || []).map((m, mIdx) => {
                    const foods = m.foods || m.items || [];
                    const totKcal = foods.reduce((sum, f) => sum + (Number(f.kcal) || 0), 0);
                    const totPro = foods.reduce((sum, f) => sum + (Number(f.protein_g) || 0), 0);
                    const totCarb = foods.reduce((sum, f) => sum + (Number(f.carbs_g) || 0), 0);
                    const totFat = foods.reduce((sum, f) => sum + (Number(f.fat_g) || 0), 0);

                    return \`
                      <div style="margin-bottom:12px; background:#181818; border:1px solid #2a2a2a; border-radius:6px; padding:10px; box-sizing:border-box;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                          <div style="font-weight:800; color:#fff; font-size:12px; display:flex; align-items:center; gap:6px;">
                            <span>🍽️ \${esc(safeDisplayValue(m.meal_name || m.name))}</span>
                            \${totKcal > 0 ? \`<span class="badge" style="background:#222; color:var(--gold); font-size:9px;">\${totKcal} kcal</span>\` : ''}
                            \${totPro > 0 ? \`<span class="badge" style="background:#1b281b; color:#81c784; font-size:9px;">P: \${totPro}g</span>\` : ''}
                            \${totCarb > 0 ? \`<span class="badge" style="background:#28231b; color:#ffb74d; font-size:9px;">C: \${totCarb}g</span>\` : ''}
                            \${totFat > 0 ? \`<span class="badge" style="background:#281b1b; color:#e57373; font-size:9px;">F: \${totFat}g</span>\` : ''}
                          </div>
                          <button class="btn btn-outline" style="font-size:9px; padding:2px 8px; border-color:#444;" onclick="addReviewMealItem(\${dIdx}, \${mIdx})">+ Aggiungi Alimento</button>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:6px;">
                          \${foods.map((it, itIdx) => \`
                            <div style="background:#0f0f0f; border:1px solid #222; border-radius:6px; padding:8px 10px; box-sizing:border-box;">
                              <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:6px; flex-wrap:wrap;">
                                <input type="text" value="\${esc(safeDisplayValue(it.name || it.food || ''))}" placeholder="Alimento..." style="flex:3; min-width:140px; font-weight:bold; font-size:11px;" onchange="updateReviewMealItem(\${dIdx}, \${mIdx}, \${itIdx}, 'name', this.value)">
                                <div style="display:flex; gap:4px; align-items:center;">
                                  <input type="text" value="\${esc(safeDisplayValue(it.quantity || ''))}" placeholder="Qtà" style="width:55px; text-align:center; font-size:11px;" onchange="updateReviewMealItem(\${dIdx}, \${mIdx}, \${itIdx}, 'quantity', this.value)">
                                  <input type="text" value="\${esc(safeDisplayValue(it.unit || 'g'))}" placeholder="Unità" style="width:40px; text-align:center; font-size:11px;" onchange="updateReviewMealItem(\${dIdx}, \${mIdx}, \${itIdx}, 'unit', this.value)">
                                  <button class="btn btn-outline" style="color:var(--accent-red); border-color:var(--accent-red); padding:3px 7px; font-size:10px;" onclick="removeReviewMealItem(\${dIdx}, \${mIdx}, \${itIdx})">✕</button>
                                </div>
                              </div>

                              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(60px, 1fr)); gap:6px; margin-top:4px;">
                                <div>
                                  <span style="font-size:8px; color:#888; display:block;">KCAL</span>
                                  <input type="number" value="\${it.kcal !== null && it.kcal !== undefined ? it.kcal : ''}" placeholder="kcal" style="width:100%; text-align:center; font-size:10px;" onchange="updateReviewMealItem(\${dIdx}, \${mIdx}, \${itIdx}, 'kcal', this.value)">
                                </div>
                                <div>
                                  <span style="font-size:8px; color:#888; display:block;">PROT (g)</span>
                                  <input type="number" step="0.1" value="\${it.protein_g !== null && it.protein_g !== undefined ? it.protein_g : ''}" placeholder="g" style="width:100%; text-align:center; font-size:10px;" onchange="updateReviewMealItem(\${dIdx}, \${mIdx}, \${itIdx}, 'protein_g', this.value)">
                                </div>
                                <div>
                                  <span style="font-size:8px; color:#888; display:block;">CARB (g)</span>
                                  <input type="number" step="0.1" value="\${it.carbs_g !== null && it.carbs_g !== undefined ? it.carbs_g : ''}" placeholder="g" style="width:100%; text-align:center; font-size:10px;" onchange="updateReviewMealItem(\${dIdx}, \${mIdx}, \${itIdx}, 'carbs_g', this.value)">
                                </div>
                                <div>
                                  <span style="font-size:8px; color:#888; display:block;">FAT (g)</span>
                                  <input type="number" step="0.1" value="\${it.fat_g !== null && it.fat_g !== undefined ? it.fat_g : ''}" placeholder="g" style="width:100%; text-align:center; font-size:10px;" onchange="updateReviewMealItem(\${dIdx}, \${mIdx}, \${itIdx}, 'fat_g', this.value)">
                                </div>
                              </div>

                              \${it.notes ? \`
                                <div style="margin-top:4px;">
                                  <input type="text" value="\${esc(safeDisplayValue(it.notes))}" placeholder="Note alimento..." style="width:100%; font-size:9px; color:#aaa;" onchange="updateReviewMealItem(\${dIdx}, \${mIdx}, \${itIdx}, 'notes', this.value)">
                                </div>
                              \` : ''}
                            </div>
                          \`).join('')}
                        </div>
                      </div>
                    \`;
                  }).join('')}
                </div>
              \`).join('') : \`
                <div style="text-align:center; color:#888; padding:24px;">
                  <div style="font-size:24px; margin-bottom:8px;">🥗</div>
                  <div>Nessun piano alimentare presente nel file.</div>
                </div>
              \`}
            </div>
          </div>
        \` : ''}

        <!-- TAB 3: INTEGRAZIONE -->
        \${activeTab === 'supplementation' ? \`
          <div class="card" style="margin-bottom:16px; max-width:100%;">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
              <h2>Piano Integrazione & Supplementi</h2>
              <button class="btn btn-outline" style="font-size:10px; padding:4px 10px;" onclick="addReviewSupplementItem()">+ AGGIUNGI INTEGRATORE</button>
            </div>
            <div style="padding:14px 18px; font-size:11px;">
              \${supplementItems.length > 0 ? supplementItems.map((sup, sIdx) => \`
                <div style="margin-bottom:10px; background:#111; border:1px solid #222; border-radius:8px; padding:12px; box-sizing:border-box;">
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
                    <input type="text" value="\${esc(safeDisplayValue(sup.name))}" placeholder="Nome Integratore..." style="flex:2; min-width:140px; font-weight:bold; font-size:12px;" onchange="updateReviewSupplementItem(\${sIdx}, 'name', this.value)">
                    <button class="btn btn-outline" style="color:var(--accent-red); border-color:var(--accent-red); padding:3px 8px; font-size:10px;" onclick="removeReviewSupplementItem(\${sIdx})">✕ Elimina</button>
                  </div>

                  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(90px, 1fr)); gap:6px; margin-bottom:6px;">
                    <div>
                      <span style="font-size:8px; color:#888; display:block;">DOSE</span>
                      <input type="text" value="\${esc(safeDisplayValue(sup.dose))}" placeholder="es. 5" style="width:100%; text-align:center; font-size:11px;" onchange="updateReviewSupplementItem(\${sIdx}, 'dose', this.value)">
                    </div>
                    <div>
                      <span style="font-size:8px; color:#888; display:block;">UNITÀ</span>
                      <input type="text" value="\${esc(safeDisplayValue(sup.unit || 'g'))}" placeholder="g, cps..." style="width:100%; text-align:center; font-size:11px;" onchange="updateReviewSupplementItem(\${sIdx}, 'unit', this.value)">
                    </div>
                    <div>
                      <span style="font-size:8px; color:#888; display:block;">TIMING</span>
                      <input type="text" value="\${esc(safeDisplayValue(sup.timing || 'Quotidiano'))}" placeholder="Colazione, Pre-wo..." style="width:100%; font-size:11px;" onchange="updateReviewSupplementItem(\${sIdx}, 'timing', this.value)">
                    </div>
                    <div>
                      <span style="font-size:8px; color:#888; display:block;">FREQUENZA</span>
                      <input type="text" value="\${esc(safeDisplayValue(sup.frequency || 'Quotidiano'))}" placeholder="Tutti i giorni..." style="width:100%; font-size:11px;" onchange="updateReviewSupplementItem(\${sIdx}, 'frequency', this.value)">
                    </div>
                  </div>

                  \${sup.notes ? \`
                    <div>
                      <input type="text" value="\${esc(safeDisplayValue(sup.notes))}" placeholder="Note..." style="width:100%; font-size:10px; color:#aaa;" onchange="updateReviewSupplementItem(\${sIdx}, 'notes', this.value)">
                    </div>
                  \` : ''}
                </div>
              \`).join('') : \`
                <div style="text-align:center; color:#888; padding:24px;">
                  <div style="font-size:24px; margin-bottom:8px;">💊</div>
                  <div>Nessun integratore presente nel file.</div>
                </div>
              \`}
            </div>
          </div>
        \` : ''}

        <!-- TAB 4: TERAPIA / ESAMI (COMPACT MOBILE-FIRST CARDS) -->
        \${activeTab === 'therapy' ? \`
          <!-- SEZIONE 1: TERAPIA MEDICA -->
          <div class="card" style="margin-bottom:16px; max-width:100%;">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h2>Terapia Farmacologica & Trattamenti</h2>
                <div style="font-size:10px; color:#888;">Presentazione compatta mobile-first con raggruppamento giorni</div>
              </div>
              <button class="btn btn-outline" style="font-size:10px; padding:4px 10px;" onclick="addReviewTherapyMedication()">+ AGGIUNGI FARMACO</button>
            </div>
            <div style="padding:14px 18px; font-size:11px;">
              \${therapyMeds.length > 0 ? therapyMeds.map((th, tIdx) => \`
                <div style="margin-bottom:12px; background:#121212; border:1px solid #292929; border-radius:8px; padding:12px; box-sizing:border-box;">
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
                    <div style="flex:2; min-width:140px;">
                      <input type="text" value="\${esc(safeDisplayValue(th.medication || th.name))}" placeholder="Nome Farmaco..." style="width:100%; font-weight:bold; font-size:12px; color:var(--gold);" onchange="updateReviewTherapyMedication(\${tIdx}, 'medication', this.value)">
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                      <span class="badge badge-success" style="font-size:9px;">\${th.duration_text || (th.duration_weeks ? th.duration_weeks + ' sett.' : 'Continuativo')}</span>
                      <button class="btn btn-outline" style="color:var(--accent-red); border-color:var(--accent-red); padding:2px 7px; font-size:10px;" onclick="removeReviewTherapyMedication(\${tIdx})">✕</button>
                    </div>
                  </div>

                  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(100px, 1fr)); gap:6px; margin-bottom:8px;">
                    <div>
                      <span style="font-size:8px; color:#888; display:block;">DOSE / POSOLOGIA</span>
                      <input type="text" value="\${esc(safeDisplayValue(th.dose))}" placeholder="es. 1 compressa" style="width:100%; font-size:11px;" onchange="updateReviewTherapyMedication(\${tIdx}, 'dose', this.value)">
                    </div>
                    <div>
                      <span style="font-size:8px; color:#888; display:block;">GIORNI ASSUNZIONE</span>
                      <input type="text" value="\${esc(Array.isArray(th.days) ? th.days.join(' + ') : safeDisplayValue(th.days || 'Tutti i giorni'))}" placeholder="es. Lunedì + Giovedì" style="width:100%; font-size:11px;" onchange="updateReviewTherapyMedication(\${tIdx}, 'days', this.value)">
                    </div>
                    <div>
                      <span style="font-size:8px; color:#888; display:block;">DURATA (SETTIMANE)</span>
                      <input type="number" value="\${th.duration_weeks !== null && th.duration_weeks !== undefined ? th.duration_weeks : ''}" placeholder="es. 8" style="width:100%; text-align:center; font-size:11px;" onchange="updateReviewTherapyMedication(\${tIdx}, 'duration_weeks', this.value)">
                    </div>
                    <div>
                      <span style="font-size:8px; color:#888; display:block;">ORARIO / TIMING</span>
                      <input type="text" value="\${esc(safeDisplayValue(th.timing || ''))}" placeholder="es. Ore 08:00" style="width:100%; font-size:11px;" onchange="updateReviewTherapyMedication(\${tIdx}, 'timing', this.value)">
                    </div>
                  </div>

                  \${th.notes ? \`
                    <div>
                      <input type="text" value="\${esc(safeDisplayValue(th.notes))}" placeholder="Note terapia..." style="width:100%; font-size:10px; color:#aaa;" onchange="updateReviewTherapyMedication(\${tIdx}, 'notes', this.value)">
                    </div>
                  \` : ''}
                </div>
              \`).join('') : \`
                <div style="text-align:center; color:#888; padding:16px;">
                  Nessun protocollo terapeutico o farmacologico rilevato.
                </div>
              \`}
            </div>
          </div>

          <!-- SEZIONE 2: ESAMI EMATOLOGICI & PARAMETRI CLINICI -->
          <div class="card" style="margin-bottom:16px; max-width:100%;">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h2>Esami Clinici & Analisi del Sangue</h2>
                <div style="font-size:10px; color:#888;">Monitoraggio parametri ematologici ed ematochimici</div>
              </div>
              <button class="btn btn-outline" style="font-size:10px; padding:4px 10px;" onclick="addReviewExamRecord()">+ AGGIUNGI ESAME</button>
            </div>
            <div style="padding:14px 18px; font-size:11px;">
              \${examRecords.length > 0 ? examRecords.map((exr, eIdx) => \`
                <div style="margin-bottom:10px; background:#121212; border:1px solid #292929; border-radius:8px; padding:12px; box-sizing:border-box;">
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
                    <input type="text" value="\${esc(safeDisplayValue(exr.parameter || exr.name))}" placeholder="Parametro / Analisi..." style="flex:2; min-width:140px; font-weight:bold; font-size:12px; color:#fff;" onchange="updateReviewExamRecord(\${eIdx}, 'parameter', this.value)">
                    <div style="display:flex; gap:6px; align-items:center;">
                      <input type="text" value="\${esc(safeDisplayValue(exr.date || ''))}" placeholder="Data (AAAA-MM-GG)" style="width:90px; text-align:center; font-size:10px;" onchange="updateReviewExamRecord(\${eIdx}, 'date', this.value)">
                      <button class="btn btn-outline" style="color:var(--accent-red); border-color:var(--accent-red); padding:2px 7px; font-size:10px;" onclick="removeReviewExamRecord(\${eIdx})">✕</button>
                    </div>
                  </div>

                  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(90px, 1fr)); gap:6px; margin-bottom:6px;">
                    <div>
                      <span style="font-size:8px; color:#888; display:block;">VALORE MISURATO</span>
                      <input type="text" value="\${esc(safeDisplayValue(exr.value))}" placeholder="es. 650" style="width:100%; text-align:center; font-weight:bold; font-size:11px;" onchange="updateReviewExamRecord(\${eIdx}, 'value', this.value)">
                    </div>
                    <div>
                      <span style="font-size:8px; color:#888; display:block;">UNITÀ DI MISURA</span>
                      <input type="text" value="\${esc(safeDisplayValue(exr.unit || ''))}" placeholder="ng/dL, mg/dL..." style="width:100%; text-align:center; font-size:11px;" onchange="updateReviewExamRecord(\${eIdx}, 'unit', this.value)">
                    </div>
                    <div>
                      <span style="font-size:8px; color:#888; display:block;">VALORI DI RIFERIMENTO</span>
                      <input type="text" value="\${esc(safeDisplayValue(exr.reference_range || ''))}" placeholder="es. 300 - 1000" style="width:100%; font-size:11px;" onchange="updateReviewExamRecord(\${eIdx}, 'reference_range', this.value)">
                    </div>
                  </div>

                  \${exr.notes ? \`
                    <div>
                      <input type="text" value="\${esc(safeDisplayValue(exr.notes))}" placeholder="Note referto..." style="width:100%; font-size:10px; color:#aaa;" onchange="updateReviewExamRecord(\${eIdx}, 'notes', this.value)">
                    </div>
                  \` : ''}
                </div>
              \`).join('') : \`
                <div style="text-align:center; color:#888; padding:16px;">
                  Nessun esame ematologico o referto clinico rilevato.
                </div>
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
      <div style="margin-bottom:16px; max-width:100%; box-sizing:border-box;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <span style="font-size:10px; color:var(--gold); font-weight:800; letter-spacing:1.5px; text-transform:uppercase;">UNIVERSAL PROGRAM IMPORT ENGINE 2.1</span>
            <h1 class="text-gold" style="font-size:22px; font-weight:900; margin:2px 0 0;">IMPORTAZIONE PROGRAMMA</h1>
          </div>
          <button class="btn btn-outline" style="font-size:10px; padding:6px 10px;" onclick="navigate('programs')">📚 LIBRERIA</button>
        </div>
        <p style="font-size:11px; color:#aaa; line-height:1.4; margin:0 0 12px;">
          Carica qualsiasi documento di allenamento esistente (PDF, Excel, Word, Immagine o testo incollato). Il motore semantico 2.1 estrarrà automaticamente settimane, sessioni, serie, ripetizioni, RIR, RPE, nutrizione strutturata per pasti, integratori, terapia medica ed esami clinici per la tua revisione.
        </p>

        <div class="badge-row" style="margin-bottom:14px; gap:4px; flex-wrap:wrap;">
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
      <div class="card" style="border:1px solid rgba(212,175,55,0.4); background:linear-gradient(135deg, #14120b 0%, #0d0d0d 100%); margin-bottom:16px; max-width:100%; box-sizing:border-box;">
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
            <textarea id="import-text-input" placeholder="Incolla qui il testo della scheda, es:\\n\\nSettimana 1\\nGiorno 1: Upper Body\\nPanca Piana Bilanciere 4x8 RIR 2 90s\\nRematore con Bilanciere 4x8-10 90s\\nSquat 3x8\\n\\nNutrizione:\\nLunedì\\nColazione: 100g avena, 200g yogurt\\n\\nIntegrazione:\\nCreatina 5g\\n\\nTerapia:\\nFarmaco X 1 compressa Lunedì + Giovedì 8 settimane" style="width:100%; height:160px; font-size:11px; background:#080808; border:1px solid #333; border-radius:8px; padding:12px; color:#fff; font-family:monospace; margin-bottom:16px; resize:vertical; box-sizing:border-box;"></textarea>
          \`}

          \${!isLoggedIn ? \`
            <div style="text-align:center;">
              <button class="btn btn-outline" style="border-color:var(--gold); color:var(--gold); font-size:11px; padding:10px 18px;" onclick="openAccountModal('login')">
                🔑 ACCEDI PER IMPORTARE SCHEDE
              </button>
            </div>
          \` : (pState.isAnalyzing ? \`
            <button class="btn btn-primary" style="width:100%; font-weight:900; opacity:0.8; cursor:not-allowed;" disabled>
              ⏳ ANALISI STRUTTURATA 2.1 IN CORSO...
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

`
];

const replacementCode = replacementParts.join('');

let newHtml = html.slice(0, startIndex) + replacementCode + html.slice(endIndex);

if (!newHtml.includes('<script src="xlsx.full.min.js"></script>')) {
  newHtml = newHtml.replace("</head>", '  <script src="xlsx.full.min.js"></script>\n</head>');
}
if (!newHtml.includes("else if(currentView === 'import') renderImport(c);")) {
  newHtml = newHtml.replace("else if(currentView === 'db') renderDb(c);", "else if(currentView === 'db') renderDb(c);\n  else if(currentView === 'import') renderImport(c);");
}
fs.writeFileSync(htmlPath, newHtml, 'utf8');

// Also sync directly to Android assets
fs.writeFileSync('app/src/main/assets/index.html', newHtml, 'utf8');

console.log("Successfully updated web/index.html and app/src/main/assets/index.html with Import Engine 2.1!");
