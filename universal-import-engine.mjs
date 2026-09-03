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

import XLSX from "xlsx";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { rirToRpe, rpeToRir, validateRir, validateRpe } from "./rir-rpe-engine.mjs";
import { buildIRFromWorkbook, createSourceRef, createEmptyDocumentIR, detectFormat, expandMergesToGrid, reconstructTablesFromDocxXml, reconstructTablesFromSheet, classifyDocumentFromSignals, validateDocumentSemantics, flagInferredSets, pdfNeedsOcr, runLocalOcr, DI_MAX_BYTES } from "./document-intelligence-core.mjs";
import { detectTechniquesFromText, parseDeclaredSetCount, resolveTargetSetCount } from "./import-fidelity.mjs";
import { enforceAllPrescriptions, applyPrescriptionsToProgram, parseLiteralScheme, enforceExercisePrescription, parseCompoundSchemes, parseSpaceLadder, parseWeeklySchemeLadder } from "./prescription-engine.mjs";
import { DRUG_CATALOG, matchDrug, enrichTherapyMedications } from "./drug-catalog.mjs";

export { DRUG_CATALOG, matchDrug, enrichTherapyMedications };
export { parseWeeklySchemeLadder, parseLiteralScheme };
// ====================================================
// 1. EXERCISE NORMALIZATION DICTIONARY & HELPERS
// ====================================================
export const EXERCISE_DICTIONARY = [
  { keywords: ["panca piana con bilanciere", "panca piana bilanciere", "panca piana", "bench press", "barbell bench press", "flat bench press"], normalized: "Panca Piana con Bilanciere", muscle: "PETTO", muscles: ["PETTO", "TRICIPITI", "DELTOIDI"] },
  { keywords: ["croci ai cavi su panca inclinata", "croci ai cavi su panca", "croci ai cavi", "croci manubri", "croci su panca", "dumbbell flyes", "cable fly", "pec fly", "pec deck"], normalized: "Croci ai Cavi", muscle: "PETTO", muscles: ["PETTO"] },
  { keywords: ["panca inclinata 30° manubri", "panca inclinata manubri", "panca inclinata 30", "panca inclinata bilanciere", "panca inclinata", "incline bench press", "panca alta con manubri", "panca alta manubri"], normalized: "Panca Inclinata con Manubri", muscle: "PETTO", muscles: ["PETTO", "DELTOIDI", "TRICIPITI"] },
  { keywords: ["panca declinata", "decline bench", "panca declinata bilanciere"], normalized: "Panca Declinata con Bilanciere", muscle: "PETTO", muscles: ["PETTO", "TRICIPITI"] },
  { keywords: ["chest press", "spinta inclinata convergente", "chest press convergente", "chest press orizzontale", "chest press leggermente inclinata", "chest press inclinata"], normalized: "Chest Press Convergente", muscle: "PETTO", muscles: ["PETTO", "DELTOIDI", "TRICIPITI"] },
  { keywords: ["floor press", "panca a terra", "floor press manubri"], normalized: "Floor Press con Manubri", muscle: "PETTO", muscles: ["PETTO", "TRICIPITI"] },
  { keywords: ["push-up", "push up", "flessioni", "piegamenti", "diamond push-up", "archer push-up"], normalized: "Push-up", muscle: "PETTO", muscles: ["PETTO", "TRICIPITI", "CORE"] },
  { keywords: ["squat con bilanciere", "squat bilanciere", "back squat", "barbell squat", "high bar squat", "low bar squat", "box squat alto high-bar", "box squat alto", "box squat", "squat bilanciere high-bar"], normalized: "Squat con Bilanciere", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "GLUTEI", "CORE"] },
  { keywords: ["front squat", "squat frontale"], normalized: "Front Squat con Bilanciere", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "CORE"] },
  { keywords: ["goblet squat", "squat goblet"], normalized: "Goblet Squat", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "GLUTEI", "CORE"] },
  { keywords: ["hack squat", "hack squat machine"], normalized: "Hack Squat", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "GLUTEI"] },
  { keywords: ["leg press 45°", "leg press 45", "leg press", "pressa 45", "pressa", "leg press bilaterale"], normalized: "Leg Press 45°", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "GLUTEI"] },
  { keywords: ["leg press unilaterale", "leg press singola", "single leg press", "pressa unilaterale"], normalized: "Leg Press Unilaterale", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "GLUTEI"] },
  { keywords: ["leg extension", "leg extension bilaterale"], normalized: "Leg Extension", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI"] },
  { keywords: ["leg extension unilaterale", "leg extension singola"], normalized: "Leg Extension Unilaterale", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI"] },
  { keywords: ["affondi camminati", "affondi con manubri", "affondi manubri", "walking lunges", "affondi"], normalized: "Affondi Camminati con Manubri", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "GLUTEI"] },
  { keywords: ["affondi bulgari", "bulgarian split squat", "split squat bulgaro", "rear foot elevated split squat", "rfess"], normalized: "Affondi Bulgari", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "GLUTEI"] },
  { keywords: ["reverse lunge", "affondo indietro", "affondi indietro"], normalized: "Affondi Indietro", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "GLUTEI"] },
  { keywords: ["step-up", "step up", "salita al box", "step-up manubri"], normalized: "Step-up", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "GLUTEI"] },
  { keywords: ["pistol squat", "pistol assistito", "squat monopodalico", "single leg squat"], normalized: "Pistol Squat Assistito", muscle: "QUADRICIPITI", muscles: ["QUADRICIPITI", "GLUTEI", "CORE"] },
  { keywords: ["stacco da terra rumeno", "stacco rumeno", "romanian deadlift", "rdl", "stacco a gambe tese", "stacco a gambe semitese", "rdl manubri", "stacco rumeno manubri"], normalized: "Stacco Rumeno con Bilanciere", muscle: "FEMORALI", muscles: ["FEMORALI", "GLUTEI", "SCHIENA"] },
  { keywords: ["rdl monopodalico", "single leg rdl", "stacco rumeno unilaterale", "rdl una gamba", "stacco rumeno monopodalico"], normalized: "RDL Monopodalico", muscle: "FEMORALI", muscles: ["FEMORALI", "GLUTEI", "CORE"] },
  { keywords: ["stacco da terra", "deadlift", "barbell deadlift", "stacco convenzionale", "stacco sumo"], normalized: "Stacco da Terra con Bilanciere", muscle: "SCHIENA", muscles: ["SCHIENA", "FEMORALI", "GLUTEI", "CORE"] },
  { keywords: ["good morning", "good morning bilanciere"], normalized: "Good Morning", muscle: "FEMORALI", muscles: ["FEMORALI", "GLUTEI", "SCHIENA"] },
  { keywords: ["leg curl", "lying leg curl", "seated leg curl", "leg curl seduto", "leg curl sdraiato", "leg curl bilaterale"], normalized: "Leg Curl Sdraiato", muscle: "FEMORALI", muscles: ["FEMORALI"] },
  { keywords: ["leg curl unilaterale", "leg curl singola", "single leg curl"], normalized: "Leg Curl Unilaterale", muscle: "FEMORALI", muscles: ["FEMORALI"] },
  { keywords: ["nordic curl", "nordic hamstring", "nordic assistito"], normalized: "Nordic Curl Assistito", muscle: "FEMORALI", muscles: ["FEMORALI"] },
  { keywords: ["hip thrust", "hip thrust bilanciere", "ponte glutei bilanciere"], normalized: "Hip Thrust con Bilanciere", muscle: "GLUTEI", muscles: ["GLUTEI", "FEMORALI"] },
  { keywords: ["hip thrust unilaterale", "single leg hip thrust", "hip thrust monopodalico"], normalized: "Hip Thrust Unilaterale", muscle: "GLUTEI", muscles: ["GLUTEI", "FEMORALI"] },
  { keywords: ["glute bridge", "ponte glutei", "glute bridge a terra"], normalized: "Glute Bridge", muscle: "GLUTEI", muscles: ["GLUTEI"] },
  { keywords: ["kickback cavo", "kickback", "glute kickback", "kickback elastico"], normalized: "Kickback al Cavo", muscle: "GLUTEI", muscles: ["GLUTEI"] },
  { keywords: ["frog pump", "frog pumps"], normalized: "Frog Pump", muscle: "GLUTEI", muscles: ["GLUTEI"] },
  { keywords: ["cable pull through", "pull through"], normalized: "Cable Pull-Through", muscle: "GLUTEI", muscles: ["GLUTEI", "FEMORALI"] },
  { keywords: ["trazioni alla sbarra", "trazioni", "pull up", "pull-ups", "chin up", "chin-ups", "trazioni prone", "trazioni neutre", "trazioni presa neutra"], normalized: "Trazioni alla Sbarra", muscle: "DORSALI", muscles: ["DORSALI", "BICIPITI"] },
  { keywords: ["pulldown al cavo", "pulldown braccia tese", "pulldown", "straight arm pulldown"], normalized: "Pulldown al Cavo Braccia Tese", muscle: "DORSALI", muscles: ["DORSALI"] },
  { keywords: ["lat machine presa larga", "lat machine presa neutra", "lat machine", "lat machine presa diversa", "lat pulldown", "lat machine avanti"], normalized: "Lat Machine Presa Larga", muscle: "DORSALI", muscles: ["DORSALI", "BICIPITI"] },
  { keywords: ["rematore con bilanciere", "rematore bilanciere", "barbell row", "bent over row"], normalized: "Rematore con Bilanciere", muscle: "DORSALI", muscles: ["DORSALI", "SCHIENA", "BICIPITI"] },
  { keywords: ["rematore con manubrio", "rematore manubrio", "dumbbell row", "single arm dumbbell row", "rematore unilaterale", "dorsey machine monopodalica", "dorsey machine", "low row 1 braccio"], normalized: "Rematore con Manubrio", muscle: "DORSALI", muscles: ["DORSALI", "BICIPITI"] },
  { keywords: ["chest supported row", "rematore panca", "rematore supportato"], normalized: "Rematore su Panca", muscle: "DORSALI", muscles: ["DORSALI"] },
  { keywords: ["pulley", "pulley basso", "pulley basso presa larga", "seated cable row"], normalized: "Pulley Basso", muscle: "DORSALI", muscles: ["DORSALI", "SCHIENA"] },
  { keywords: ["inverted row", "rematore orizzontale", "australian pull-up"], normalized: "Inverted Row", muscle: "DORSALI", muscles: ["DORSALI", "CORE"] },
  { keywords: ["lento avanti con manubri", "shoulder press manubri", "dumbbell shoulder press", "military press manubri"], normalized: "Lento Avanti con Manubri", muscle: "DELTOIDI", muscles: ["DELTOIDI", "TRICIPITI"] },
  { keywords: ["military press", "lento avanti", "overhead press", "ohp", "shoulder press", "shoulder press convergente"], normalized: "Military Press con Bilanciere", muscle: "DELTOIDI", muscles: ["DELTOIDI", "TRICIPITI"] },
  { keywords: ["alzate laterali", "lateral raises", "side lateral raise", "alzate laterali manubri", "alzate laterali cavi"], normalized: "Alzate Laterali con Manubri", muscle: "DELTOIDI", muscles: ["DELTOIDI"] },
  { keywords: ["alzate laterali cavo singolo", "alzate laterali unilaterali", "single arm lateral raise"], normalized: "Alzate Laterali al Cavo Singolo", muscle: "DELTOIDI", muscles: ["DELTOIDI"] },
  { keywords: ["alzate posteriori", "rear delt fly", "croci inverse", "face pull", "rear delt machine"], normalized: "Face Pull al Cavo", muscle: "DELTOIDI", muscles: ["DELTOIDI", "SCHIENA"] },
  { keywords: ["curl con bilanciere", "barbell curl", "bicep curl", "curl bilanciere", "curl bilanciere ez", "curl bilanciere sagomato"], normalized: "Curl con Bilanciere", muscle: "BICIPITI", muscles: ["BICIPITI"] },
  { keywords: ["curl con manubri", "dumbbell curl", "curl alternato"], normalized: "Curl Alternato con Manubri", muscle: "BICIPITI", muscles: ["BICIPITI"] },
  { keywords: ["curl singolo al cavo", "curl singolo cavo", "cable curl unilaterale"], normalized: "Curl al Cavo Singolo", muscle: "BICIPITI", muscles: ["BICIPITI"] },
  { keywords: ["hammer curl", "curl a martello"], normalized: "Hammer Curl con Manubri", muscle: "BICIPITI", muscles: ["BICIPITI", "AVAMBRACCI"] },
  { keywords: ["pushdown corda", "pushdown", "pushdown ai cavi", "triceps pushdown", "corda tricipiti", "push down con corda"], normalized: "Pushdown ai Cavi con Corda", muscle: "TRICIPITI", muscles: ["TRICIPITI"] },
  { keywords: ["overhead extension unilaterale", "ext tricipiti overhead manubrio", "single arm overhead tricep"], normalized: "Estensione Overhead Unilaterale", muscle: "TRICIPITI", muscles: ["TRICIPITI"] },
  { keywords: ["french press", "skull crusher", "estensioni tricipiti", "french press con bilanciere"], normalized: "French Press con Bilanciere EZ", muscle: "TRICIPITI", muscles: ["TRICIPITI"] },
  { keywords: ["dip alle parallele", "dip", "dips", "parallele"], normalized: "Dip alle Parallele", muscle: "PETTO", muscles: ["PETTO", "TRICIPITI", "DELTOIDI"] },
  { keywords: ["calf raise", "calf in piedi", "calf seduto", "calves", "calf raise smith in piedi", "smith calf raise in piedi", "calf smith", "calf machine in piedi", "calf machine"], normalized: "Calf Raise in Piedi", muscle: "POLPACCI", muscles: ["POLPACCI"] },
  { keywords: ["calf raise unilaterale", "single leg calf raise", "calf monopodalico"], normalized: "Calf Raise Unilaterale", muscle: "POLPACCI", muscles: ["POLPACCI"] },
  { keywords: ["crunch ai cavi", "cable crunch", "cable crunch inginocchiato", "crunch"], normalized: "Crunch ai Cavi", muscle: "CORE", muscles: ["CORE"] },
  { keywords: ["plank", "ab roller", "leg raise", "hanging leg raise", "addominali", "dead bug", "hollow hold", "ab wheel"], normalized: "Plank Addominale", muscle: "CORE", muscles: ["CORE"] },
  { keywords: ["pallof press", "anti-rotation press"], normalized: "Pallof Press", muscle: "CORE", muscles: ["CORE"] },
  { keywords: ["suitcase carry", "farmer walk unilaterale", "farmers walk single"], normalized: "Suitcase Carry", muscle: "CORE", muscles: ["CORE", "AVAMBRACCI"] },
  { keywords: ["adductor", "adductor machine", "adduttori"], normalized: "Adductor Machine", muscle: "GAMBE", muscles: ["GAMBE", "ADDUTTORI"] },
  { keywords: ["abductor", "abductor machine", "abduttori"], normalized: "Abductor Machine", muscle: "GLUTEI", muscles: ["GLUTEI", "ABDUTTORI"] },
  { keywords: ["pullover", "pullover ai cavi"], normalized: "Pullover ai Cavi", muscle: "DORSALI", muscles: ["DORSALI", "PETTO"] },
  { keywords: ["kettlebell swing", "kb swing", "swing kettlebell"], normalized: "Kettlebell Swing", muscle: "GLUTEI", muscles: ["GLUTEI", "FEMORALI", "CORE"] },
  { keywords: ["turkish get-up", "tgu", "turkish get up"], normalized: "Turkish Get-Up", muscle: "CORE", muscles: ["CORE", "DELTOIDI"] },
  { keywords: ["gorilla row", "kettlebell row", "rematore kettlebell"], normalized: "Kettlebell Row", muscle: "DORSALI", muscles: ["DORSALI"] }
];

export function normalizeExerciseName(rawName) {
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
export function detectTherapyDaysOfWeek({ daysRaw = "", timing = "", frequency = "", notes = "" } = {}) {
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
export function expandPatternToSets(patternStr, baseRest = 90, baseNotes = null, rir = 2, rpe = 8, loadVal = null) {
  const str = String(patternStr || "").trim();
  const sets = [];

  // Compound: 2x15+1x10 / 2x12 + 1x8
  const compound = parseCompoundSchemes(str);
  if (compound && Array.isArray(compound.reps_pattern)) {
    compound.reps_pattern.forEach((repSpec, idx) => {
      const s = idx + 1;
      let setType = "working";
      const notesU = String(baseNotes || "").toUpperCase();
      const hasDrop = /\bDROP/.test(notesU) || /DROPSET/.test(notesU) || /STRIPPING/.test(notesU);
      if (hasDrop && s === compound.reps_pattern.length) setType = "dropset";
      const row = {
        set_number: s,
        set_type: setType,
        target_load: loadVal || null,
        target_reps: String(repSpec),
        target_rir: rir,
        target_rpe: rpe,
        percentage_1rm: null,
        rest_seconds: baseRest,
        notes: baseNotes
      };
      if (setType === "dropset") row.technique = "drop_set";
      sets.push(row);
    });
    return { setCount: compound.sets, reps: compound.reps, sets, reps_pattern: compound.reps_pattern };
  }

  // Space ladder: 12 10 8 6
  const space = parseSpaceLadder(str);
  if (space && Array.isArray(space.reps_pattern)) {
    space.reps_pattern.forEach((repSpec, idx) => {
      sets.push({
        set_number: idx + 1,
        set_type: "working",
        target_load: loadVal || null,
        target_reps: String(repSpec),
        target_rir: rir,
        target_rpe: rpe,
        percentage_1rm: null,
        rest_seconds: baseRest,
        notes: baseNotes
      });
    });
    return { setCount: space.sets, reps: space.reps, sets, reps_pattern: space.reps_pattern };
  }
  
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
      const notesU = String(baseNotes || "").toUpperCase();
      const hasDrop = /\bDROP/.test(notesU) || /DROPSET/.test(notesU) || /STRIPPING/.test(notesU);
      if (hasDrop && s === setCount) {
        setType = "dropset";
      } else if (notesU.includes("TOP SET") && s === 1) {
        setType = "topset";
      } else if ((notesU.includes("BACK-OFF") || notesU.includes("BACKOFF")) && s > 1) {
        setType = "backoff";
      }
      const row = {
        set_number: s,
        set_type: setType,
        target_load: loadVal || null,
        target_reps: repSpec,
        target_rir: rir,
        target_rpe: rpe,
        percentage_1rm: null,
        rest_seconds: baseRest,
        notes: baseNotes
      };
      if (setType === "dropset") row.technique = "drop_set";
      sets.push(row);
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
export function parseExerciseDetails(str) {
  str = String(str || "");
  let sets = null;
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
  let sets_inferred = false;

  // Complex Rep Pattern check (e.g. 25-20-15-10, 4xMAX, 4x21's, 4x24 PASSI)
  // Compound schemes first: 2x15 + 1x10
  const compoundMatch = parseCompoundSchemes(str);
  const specialPatternMatch = str.match(/(\d+)\s*(?:x|X|\*|\u00d7)\s*(\d+[\-\/\u2013]\d+[\-\/\u2013]\d+(?:[\-\/\u2013]\d+)?|MAX|AMRAP|EXHAUST|\d+\s*PASSI|21['\u2019]?S)/i);
  const serieItMatch = str.match(/(\d+)\s*(?:serie|sets?)\s*(?:x|X|\*|\u00d7|da|di|:)?\s*(\d+(?:[\-\u2013\/]\d+)?(?:\+AMRAP)?|AMRAP|MAX)/i);
  if (compoundMatch) {
    sets = compoundMatch.sets;
    reps = compoundMatch.reps;
    reps_raw = compoundMatch.raw || compoundMatch.reps;
    reps_pattern = compoundMatch.reps_pattern;
  } else if (specialPatternMatch) {
    sets = parseInt(specialPatternMatch[1], 10) || null;
    reps = specialPatternMatch[2].trim();
    reps_raw = reps;
    if (reps.includes("-") || reps.includes("/") || reps.includes("–")) {
      reps_pattern = reps.split(/[\-\/\u2013]/).map(r => r.trim());
    }
  } else if (serieItMatch) {
    sets = parseInt(serieItMatch[1], 10) || null;
    reps = serieItMatch[2].trim();
    reps_raw = reps;
  } else {
    const setRepMatch = str.match(/(\d+)\s*(?:x|X|\*|\u00d7)\s*(\d+(?:[\-\u2013\/]\d+)?(?:\+AMRAP)?|AMRAP|MAX)/i);
    const ladderMatch = str.match(/(\d+(?:\s*[\-\u2013\/]\s*\d+){2,})/);
    if (setRepMatch) {
      sets = parseInt(setRepMatch[1], 10) || null;
      reps = setRepMatch[2].trim();
      reps_raw = reps;
    } else if (ladderMatch) {
      const parts = ladderMatch[1].split(/[\-\u2013\/]/).map((r) => r.trim()).filter(Boolean);
      sets = Math.max(parts.length, 1);
      reps = parts.join("-");
      reps_raw = reps;
      reps_pattern = parts;
    } else {
      const spaceLadder = parseSpaceLadder(str);
      if (spaceLadder) {
        sets = spaceLadder.sets;
        reps = spaceLadder.reps;
        reps_raw = spaceLadder.raw;
        reps_pattern = spaceLadder.reps_pattern;
      } else {
      const fromHelper = parseDeclaredSetCount(str);
      if (fromHelper) sets = fromHelper;
      const repsRangeMatch = str.match(/(\d+\s*[\-\u2013\/]\s*\d+)/);
      const repsWordMatch = str.match(/(\d+(?:[\-\u2013\/]\d+)?)\s*(?:rip(?:etizioni)?|reps?)\b/i);
      if (repsRangeMatch) {
        reps = repsRangeMatch[1].trim();
        reps_raw = reps;
      } else if (repsWordMatch) {
        reps = repsWordMatch[1].trim();
        reps_raw = reps;
      }
      }
    }
  }

  if (sets == null || !Number.isFinite(sets) || sets < 1) {
    sets = 3;
    sets_inferred = true;
  }

  const techniques = detectTechniquesFromText(str);
  const primaryTech = techniques[0] || null;

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
    load_unit,
    sets_inferred,
    techniques,
    technique: primaryTech ? primaryTech.id : null,
    notes: primaryTech ? primaryTech.id.replace(/_/g, " ") : null
  };
}

// ====================================================
// 2. 2D STRUCTURED WORKBOOK READER & SEMANTIC CLASSIFIER
// ====================================================

export function readStructuredWorkbook(workbook) {
  const sheets = [];
  for (let idx = 0; idx < workbook.SheetNames.length; idx++) {
    const sheetName = workbook.SheetNames[idx];
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    let maxR = 0;
    let maxC = 0;
    if (ws["!ref"]) {
      try {
        const range = XLSX.utils.decode_range(ws["!ref"]);
        maxR = Math.max(maxR, range.e.r);
        maxC = Math.max(maxC, range.e.c);
      } catch (_) {}
    }
    Object.keys(ws).forEach((key) => {
      if (!key || key[0] === "!") return;
      try {
        const cell = XLSX.utils.decode_cell(key);
        if (cell.r > maxR) maxR = cell.r;
        if (cell.c > maxC) maxC = cell.c;
      } catch (_) {}
    });
    const width = maxC + 1;
    const height = maxR + 1;

    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false, blankrows: true });
    while (rawRows.length < height) rawRows.push([]);
    for (let r = 0; r < rawRows.length; r++) {
      const row = Array.isArray(rawRows[r]) ? rawRows[r].slice() : [];
      while (row.length < width) row.push(null);
      rawRows[r] = row;
    }
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

    const formulaMap = {};
    Object.keys(ws).forEach((key) => {
      if (!key || key[0] === "!") return;
      const cell = ws[key];
      if (cell && cell.f) formulaMap[key] = String(cell.f);
    });

    // Enrich cells with formula + merge metadata (Document Intelligence)
    let mergeMeta = [];
    try {
      if (typeof expandMergesToGrid === "function") {
        const expanded = expandMergesToGrid(rawRows, ws["!merges"] || []);
        mergeMeta = expanded.mergedCells || [];
        for (let r = 0; r < rows.length; r++) {
          for (let c = 0; c < (rows[r].cells || []).length; c++) {
            const g = expanded.grid?.[r]?.[c];
            if (!g) continue;
            const cellObj = rows[r].cells[c];
            cellObj.rowSpan = g.rowSpan;
            cellObj.colSpan = g.colSpan;
            cellObj.isMergeOrigin = g.isMergeOrigin;
            cellObj.isMergeCovered = g.isMergeCovered;
            const f = formulaMap[cellObj.address];
            if (f) {
              cellObj.formula = "=" + String(f).replace(/^=/, "");
              cellObj.type = "formula";
            }
          }
        }
      }
    } catch (_) {}

    sheets.push({
      name: sheetName,
      index: idx,
      rows,
      rawRows,
      formulaMap,
      merges: ws["!merges"] || [],
      mergedCells: mergeMeta
    });
  }

  return { sheets, sheetNames: workbook.SheetNames };
}

function looksLikeSsttProgramGrid(rawRows) {
  let daySets = 0;
  const n = Math.min((rawRows || []).length, 120);
  for (let r = 0; r < n; r++) {
    const row = rawRows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const v = String(row[c] || "").trim();
      if (!/^(?:DAY|GIORNO)\s*\d+/i.test(v)) continue;
      const nxt = String(row[c + 1] || "").trim();
      if (/^SETS?$|^SERIE$/i.test(nxt)) daySets++;
    }
  }
  return daySets >= 1;
}

function excelEncodeCell(r, c) {
  if (typeof XLSX !== "undefined" && XLSX.utils && XLSX.utils.encode_cell) return XLSX.utils.encode_cell({ r, c });
  let col = "";
  let n = Number(c) + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    col = String.fromCharCode(65 + m) + col;
    n = Math.floor((n - 1) / 26);
  }
  return col + (Number(r) + 1);
}

function parseSsttProgramGrid(rawRows, sheetName, formulaMap = {}) {
  const weekStarts = [];
  for (let r = 0; r < (rawRows || []).length; r++) {
    (rawRows[r] || []).forEach((c, col) => {
      const m = String(c || "").match(/WEEK\s*(\d+)/i);
      if (m) weekStarts.push({ week: parseInt(m[1], 10), col, row: r });
    });
  }
  function weekForHeader(col, row) {
    const candidates = weekStarts.filter((w) => w.row <= row && Math.abs(w.col - col) <= 12);
    if (!candidates.length) return 1;
    candidates.sort((a, b) => (row - a.row) - (row - b.row) || Math.abs(a.col - col) - Math.abs(b.col - col));
    return candidates[0].week;
  }
  const headers = [];
  for (let r = 0; r < (rawRows || []).length; r++) {
    const row = rawRows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const v = String(row[c] || "").trim();
      const dm = v.match(/^(?:DAY|GIORNO)\s*(\d+)/i);
      if (!dm) continue;
      const nxt = String(row[c + 1] || "").trim();
      if (!/^SETS?$|^SERIE$/i.test(nxt)) continue;
      headers.push({
        row: r,
        col: c,
        dayNum: parseInt(dm[1], 10),
        name: v,
        week: weekForHeader(c, r),
        setsCol: c + 1,
        repsCol: c + 2,
        loadCol: c + 3,
        rpeCol: c + 6,
        tempoCol: c + 7
      });
    }
  }
  const weeksMap = new Map();
  function sessionFor(week, dayNum, dayName) {
    if (!weeksMap.has(week)) weeksMap.set(week, new Map());
    const days = weeksMap.get(week);
    if (!days.has(dayNum)) days.set(dayNum, { name: dayName, exercises: [] });
    return days.get(dayNum);
  }
  headers.forEach((h) => {
    const session = sessionFor(h.week, h.dayNum, h.name);
    const nextSameCol = headers.filter((x) => x.col === h.col && x.row > h.row).sort((a, b) => a.row - b.row)[0];
    const endRow = nextSameCol ? nextSameCol.row : rawRows.length;
    let lastEx = null;
    for (let r = h.row + 1; r < endRow; r++) {
      const row = rawRows[r] || [];
      const name = String(row[h.col] || "").trim();
      const setsVal = String(row[h.setsCol] || "").trim();
      const repsVal = String(row[h.repsCol] || "").trim();
      const loadVal = String(row[h.loadCol] || "").trim();
      const rpeVal = String(row[h.rpeCol] || "").trim();
      const tempoVal = String(row[h.tempoCol] || "").trim();
      const nameFormula = formulaMap[excelEncodeCell(r, h.col)] || null;
      const setsFormula = formulaMap[excelEncodeCell(r, h.setsCol)] || null;
      if (!name) {
        lastEx = null;
        continue;
      }
      if (/^TOTAL\b/i.test(name) || /^[-–]$/.test(name) || /ERROR|PROBLEM|FIXING|CONTACT US/i.test(name) || /^(DAY|GIORNO|SETS?|REPS?|WEIGHT|SERIE|VOLUME|RPE|TEMPO|NOTES?|COMMENTS?)/i.test(name)) {
        lastEx = null;
        continue;
      }
      const setNum = parseInt(setsVal, 10);
      const isSetRow = Number.isFinite(setNum) && setNum >= 1;
      const loadNum = loadVal ? parseFloat(String(loadVal).replace(",", ".")) : null;
      const loadOk = loadNum !== null && !Number.isNaN(loadNum) ? loadNum : null;
      const loadFormula = formulaMap[excelEncodeCell(r, h.loadCol)] || null;
      const rpeNum = parseFloat(String(rpeVal).replace(",", "."));
      const rpeOk = Number.isFinite(rpeNum) ? rpeNum : null;
      const setType = (isSetRow && setNum === 1 && rpeOk !== null && rpeOk <= 7.5) ? "topset" : (isSetRow && setNum > 1 ? "backoff" : "working");
      const rirFromRpe = rpeOk !== null ? Math.max(0, 10 - rpeOk) : 2;
      if (lastEx && String(lastEx.name_original).toLowerCase() === name.toLowerCase() && isSetRow) {
        if (nameFormula) lastEx.name_formula = nameFormula;
        lastEx.sets.push({
          set_number: setNum,
          set_type: setType,
          target_load: loadOk,
          load_formula: loadFormula,
          sets_formula: setsFormula,
          target_reps: repsVal || lastEx.reps_target,
          target_rir: rirFromRpe,
          target_rpe: rpeOk !== null ? rpeOk : 8,
          rest_seconds: 120,
          notes: tempoVal && tempoVal !== "-" ? tempoVal : null
        });
        lastEx.sets_count = lastEx.sets.length;
        continue;
      }
      const normalized = normalizeExerciseName(name);
      const ex = {
        id: `e_${h.week}_${h.dayNum}_${session.exercises.length + 1}`,
        name: normalized.name_normalized,
        name_original: name,
        name_normalized: normalized.name_normalized,
        movement: name,
        muscle_group: normalized.muscle,
        muscle_groups: normalized.muscles,
        mappingConfidence: normalized.confidence,
        mappingSource: normalized.confidence >= 0.9 ? 'dictionary' : 'raw',
        sets_count: 1,
        reps_target: repsVal || "8",
        reps_raw: (isSetRow ? String(setNum) : (setsVal || "3")) + "*" + (repsVal || "8"),
        rir_target: rirFromRpe,
        rpe_target: rpeOk !== null ? rpeOk : 8,
        percentage_1rm: null,
        rest_seconds: 120,
        load_target: loadVal || null,
        load_value: loadOk,
        name_formula: nameFormula,
        notes: tempoVal && tempoVal !== "-" ? ("Tempo " + tempoVal) : null,
        sets: [{
          set_number: isSetRow ? setNum : 1,
          set_type: setType,
          target_load: loadOk,
          load_formula: loadFormula,
          sets_formula: setsFormula,
          target_reps: repsVal || "8",
          target_rir: rirFromRpe,
          target_rpe: rpeOk !== null ? rpeOk : 8,
          rest_seconds: 120,
          notes: tempoVal && tempoVal !== "-" ? tempoVal : null
        }]
      };
      session.exercises.push(ex);
      lastEx = ex;
    }
  });
  return Array.from(weeksMap.entries()).sort((a, b) => a[0] - b[0]).map(([wNum, days]) => {
    const sessions = Array.from(days.entries()).sort((a, b) => a[0] - b[0]).map(([dNum, sess], idx) => ({
      session_number: idx + 1,
      name: sess.name || ("Day " + dNum),
      exercises: sess.exercises
    })).filter((s) => s.exercises.length);
    return {
      week_number: wNum,
      weekNumber: wNum,
      week: wNum,
      label: sheetName ? `${sheetName} · Settimana ${wNum}` : `Settimana ${wNum}`,
      sessions,
      days: sessions
    };
  }).filter((w) => w.sessions.length);
}

function splitExcelArgs(s) {
  const out = [];
  let cur = "";
  let depth = 0;
  for (let i = 0; i < String(s || "").length; i++) {
    const ch = s[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function evaluateSimpleExcelFormula(formula, cells) {
  const ctx = cells || {};
  function getCell(ref) {
    const key = String(ref || "").replace(/\$/g, "").replace(/'/g, "");
    if (Object.prototype.hasOwnProperty.call(ctx, key)) return ctx[key];
    const bang = key.indexOf("!");
    if (bang >= 0) {
      const local = key.slice(bang + 1);
      if (Object.prototype.hasOwnProperty.call(ctx, local)) return ctx[local];
    }
    return 0;
  }
  function stringifyRef(v) {
    if (v == null || v === "") return "0";
    if (typeof v === "boolean") return v ? "1" : "0";
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    const n = parseFloat(String(v).replace(",", "."));
    if (Number.isFinite(n) && String(v).trim() !== "" && !/[A-Za-z]{2,}/.test(String(v))) return String(n);
    return JSON.stringify(String(v));
  }
  function evalCond(s) {
    const raw = String(s || "").trim();
    if (/^TRUE$/i.test(raw)) return true;
    if (/^FALSE$/i.test(raw)) return false;
    const m = raw.match(/^(.*?)(<=|>=|<>|=|<|>)(.*)$/);
    if (!m) return !!evalExpr(raw);
    const a = evalExpr(m[1]);
    const b = evalExpr(m[3]);
    const op = m[2];
    if (op === "=") return a == b;
    if (op === "<>") return a != b;
    if (op === "<") return Number(a) < Number(b);
    if (op === ">") return Number(a) > Number(b);
    if (op === "<=") return Number(a) <= Number(b);
    if (op === ">=") return Number(a) >= Number(b);
    return false;
  }
  function evalExpr(s) {
    s = String(s || "").trim();
    if (!s) return 0;
    if (/^TRUE$/i.test(s)) return true;
    if (/^FALSE$/i.test(s)) return false;
    const ifs = s.match(/^IFS\(([\s\S]*)\)$/i);
    if (ifs) {
      const args = splitExcelArgs(ifs[1]);
      for (let i = 0; i + 1 < args.length; i += 2) {
        if (evalCond(args[i])) return evalExpr(args[i + 1]);
      }
      return 0;
    }
    const iff = s.match(/^IF\(([\s\S]*)\)$/i);
    if (iff) {
      const args = splitExcelArgs(iff[1]);
      return evalCond(args[0]) ? evalExpr(args[1] || "0") : evalExpr(args[2] || "0");
    }
    const rnd = s.match(/^ROUND\(([\s\S]*)\)$/i);
    if (rnd) {
      const args = splitExcelArgs(rnd[1]);
      const v = Number(evalExpr(args[0]));
      const n = Number(evalExpr(args[1] || "0")) || 0;
      const f = Math.pow(10, n);
      return Math.round(v * f) / f;
    }
    if ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'")) return s.slice(1, -1);
    s = s.replace(/'[A-Za-z0-9 _]+'\$?!\$?[A-Z]+\$?\d+/gi, (m) => stringifyRef(getCell(m)));
    s = s.replace(/[A-Za-z_][\w.]*!\$?[A-Z]+\$?\d+/gi, (m) => stringifyRef(getCell(m)));
    s = s.replace(/\$?[A-Z]+\$?\d+/g, (m) => stringifyRef(getCell(m.replace(/\$/g, ""))));
    if ((s[0] === '"' && s[s.length - 1] === '"')) {
      try { return JSON.parse(s); } catch (_) { return s.slice(1, -1); }
    }
    const num = parseFloat(s);
    if (Number.isFinite(num) && /^[+-]?[\d.]+$/.test(s)) return num;
    if (!/^[\d.\s+\-*/()]+$/.test(s)) return s.replace(/^"|"$/g, "");
    try {
      return Function('"use strict";return (' + s + ")")();
    } catch (_) {
      return null;
    }
  }
  return evalExpr(String(formula || "").replace(/^\s*=/, ""));
}

export function sheetToCellMap(sheetName, rawRows) {
  const cells = {};
  (rawRows || []).slice(0, 80).forEach((row, r) => {
    (row || []).slice(0, 16).forEach((val, c) => {
      if (val == null || String(val).trim() === "") return;
      const addr = excelEncodeCell(r, c);
      const key = sheetName + "!" + addr;
      const num = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
      const isNum = typeof val === "number" || (Number.isFinite(num) && !/[A-Za-z]{2,}/.test(String(val)));
      cells[key] = isNum ? (typeof val === "number" ? val : num) : val;
    });
  });
  return cells;
}

export function parseSsttStartInputs(rawRows) {
  const inputs = [];
  const labelRe = /^(NAME|AGE|SQUAT|BENCH PRESS|DEADLIFT|STARTING BODY WEIGHT)$/i;
  for (let r = 0; r < Math.min(40, (rawRows || []).length); r++) {
    const row = rawRows[r] || [];
    const label = String(row[2] || "").trim();
    const val = row[3];
    if (!labelRe.test(label)) continue;
    inputs.push({
      label,
      addr: "Start!" + excelEncodeCell(r, 3),
      value: val == null ? "" : val,
      kind: /name/i.test(label) ? "text" : "number",
      profileKey: /^NAME$/i.test(label) ? "name" : (/^AGE$/i.test(label) ? "age" : (/^SQUAT$/i.test(label) ? "squatMax" : (/^BENCH/i.test(label) ? "benchMax" : (/^DEADLIFT$/i.test(label) ? "deadliftMax" : (/BODY WEIGHT/i.test(label) ? "weight" : null)))))
    });
  }
  const headerRow = rawRows[76] || [];
  const deadliftLabel = String(headerRow[11] || "").trim() || "DEADLIFT VARIANT";
  const benchLabel = String(headerRow[10] || "").trim() || "BENCH PRESS VARIANT";
  const squatLabel = String(headerRow[12] || "").trim() || "SQUAT VARIANT";
  const deadliftOpts = [];
  const benchOpts = [];
  const squatOpts = [];
  for (let r = 76; r <= 120; r++) {
    const row = rawRows[r] || [];
    const b = String(row[10] || "").trim();
    const d = String(row[11] || "").trim();
    const s = String(row[12] || "").trim();
    if (b && !/variant/i.test(b) && benchOpts.indexOf(b) < 0) benchOpts.push(b);
    if (d && !/variant/i.test(d) && deadliftOpts.indexOf(d) < 0) deadliftOpts.push(d);
    if (s && !/variant/i.test(s) && squatOpts.indexOf(s) < 0) squatOpts.push(s);
  }
  const fallback = {
    deadlift: ["DEFICIT DEADLIFT", "BLOCK PULL", "PAUSED DEADLIFT", "STIFF LEGGED SUMO", "ROMANIAN DEADLIFTS", "LOW BLOCK PULL"],
    bench: ["LARSEN PRESS", "CLOSE GRIP BENCH PRESS", "SPOTO PRESS", "BOARD PRESS"],
    squat: ["HIGH BAR SQUAT", "PAUSED SQUAT", "PIN SQUAT", "SSB FRONT SQUAT"]
  };
  [
    { r: 10, label: deadliftLabel, opts: deadliftOpts.length ? deadliftOpts : fallback.deadlift, rm: "DEADLIFT VARIANT 1RM" },
    { r: 11, label: benchLabel, opts: benchOpts.length ? benchOpts : fallback.bench, rm: "BENCH PRESS VARIANT 1RM" },
    { r: 12, label: squatLabel, opts: squatOpts.length ? squatOpts : fallback.squat, rm: "SQUAT VARIANT 1RM" }
  ].forEach((spec) => {
    const row = rawRows[spec.r] || [];
    const vName = String(row[2] || "").trim();
    const options = spec.opts.slice();
    if (vName && !options.some((o) => String(o).toLowerCase() === vName.toLowerCase())) options.unshift(vName);
    inputs.push({ label: spec.label, addr: "Start!" + excelEncodeCell(spec.r, 2), value: vName, kind: "select", options });
    inputs.push({ label: spec.rm, addr: "Start!" + excelEncodeCell(spec.r, 3), value: row[3] == null ? "" : row[3], kind: "number" });
  });
  const rateRow = rawRows[34] || [];
  [["SQUAT volume 1-3", 4], ["BENCH volume 1-3", 6], ["DEADLIFT volume 1-3", 8]].forEach(([lab, c]) => {
    inputs.push({ label: lab, addr: "Start!" + excelEncodeCell(34, c), value: rateRow[c] == null || String(rateRow[c]).trim() === "" ? 2 : rateRow[c], kind: "select", options: ["1", "2", "3"] });
  });
  return inputs;
}

export function recalcTrainingLoadsFromCells(weeks, cells, prevCells) {
  const prev = prevCells || {};
  function rmAddr(ex) {
    const nf = String(ex.name_formula || "");
    if (/Start!C11/i.test(nf)) return "Start!D11";
    if (/Start!C12/i.test(nf)) return "Start!D12";
    if (/Start!C13/i.test(nf)) return "Start!D13";
    const name = String(ex.name_original || ex.name || ex.exercise || "");
    if (/SQUAT|HIGH BAR|PIN SQUAT|SSB/i.test(name) && !/GOBLET/i.test(name)) return "Start!D6";
    if (/BENCH|PANCA|SPOTO|LARSEN|BOARD PRESS|CLOSE GRIP/i.test(name)) return "Start!D7";
    if (/DEAD|STACCO|BLOCK PULL|RDL|ROMANIAN|DEFICIT/i.test(name)) return "Start!D8";
    return null;
  }
  let updated = 0;
  (weeks || []).forEach((w) => (w.sessions || w.days || []).forEach((sess) => (sess.exercises || []).forEach((ex) => {
    if (ex.name_formula) {
      const nv = evaluateSimpleExcelFormula(ex.name_formula, cells);
      if (nv != null && String(nv).trim() && String(nv) !== "0") {
        ex.name_original = String(nv);
        ex.name = String(nv);
        ex.exercise = String(nv);
        updated++;
      }
    }
    const rm = rmAddr(ex);
    const oldRm = parseFloat(prev[rm]);
    const newRm = parseFloat(cells[rm]);
    const ratio = (rm && Number.isFinite(oldRm) && oldRm > 0 && Number.isFinite(newRm) && newRm > 0) ? (newRm / oldRm) : 1;
    (ex.sets || []).forEach((set) => {
      if (set.load_formula) {
        const v = evaluateSimpleExcelFormula(set.load_formula, cells);
        if (v != null && Number.isFinite(Number(v))) {
          set.target_load = Math.round(Number(v) * 4) / 4;
          set.load = set.target_load;
          updated++;
          return;
        }
      }
      if (ratio !== 1 && set.target_load != null && Number.isFinite(Number(set.target_load))) {
        set.target_load = Math.round(Number(set.target_load) * ratio * 4) / 4;
        set.load = set.target_load;
        updated++;
      }
    });
    if (ex.sets && ex.sets[0] && ex.sets[0].target_load != null) {
      ex.load_value = ex.sets[0].target_load;
      ex.load_target = ex.sets[0].target_load;
      ex.plannedLoad = ex.sets[0].target_load;
    }
  })));
  return updated;
}

function sheetNameBare(sheetName) {
  return String(sheetName || "")
    .replace(/^[\s_\-~]+/, "")
    .replace(/^\d{1,2}[\s._-]*/, "")
    .trim();
}

function isWeekNamedSheet(sheetName) {
  const n = String(sheetName || "").trim();
  return /^(?:w|wk|week|sett\.?|settimana)\s*\.?\s*\d+$/i.test(n)
    || /^(?:w|wk)\d+$/i.test(n);
}

function isMetaOrAdminSheetName(sheetName) {
  const n = String(sheetName || "").trim();
  if (/^[_~]/.test(n)) return true;
  const bare = sheetNameBare(n);
  return /^(?:cover|copertina|dashboard|home|welcome|start|faq|faqs|setup|istruzioni|instructions|how\s*to|baseline|riferimenti|progresso|progress|performance|audit|volume|evidence|evidenza|razionale|sostituzioni|substitutions|alternative|swap|liste|lists|elenco|catalogo|catalog|index|indice|legend|leggenda|glossary|glossario|notes|note|readme|changelog|profile|rpe|graphs?|info|about|sub[_\s-]?db|db)\b/i.test(bare);
}

function rowLooksLikeSessionHeader(row) {
  const cells = (row || []).map((c) => String(c == null ? "" : c).trim()).filter(Boolean);
  if (!cells.length) return false;
  const a = cells[0];
  if (/^(?:GIORNO|DAY|SEDUTA|SESSIONE|WORKOUT|ALLENAMENTO)\s*[0-9A-G]\b/i.test(a)) return true;
  if (/^(?:UPPER|LOWER|PUSH|PULL|LEGS|FULL\s*BODY)\s*[A-C]?\b/i.test(a) && cells.length <= 4) return true;
  return false;
}

function rowLooksLikeExerciseTableHeader(row) {
  const vals = (row || []).map((c) => String(c == null ? "" : c).toLowerCase().trim());
  if (!vals.length) return false;
  const hasEx = vals.some((v) =>
    /^(movimento|esercizio(\s+effettivo)?|exercise|nome(\s+esercizio)?)$/i.test(v)
    || v.includes("esercizio effettivo")
  );
  const hasSet = vals.some((v) => /^(set|serie|sets)$/i.test(v));
  const hasReps = vals.some((v) => /^(reps|ripetizioni)$/i.test(v) || v.includes("reps target"));
  const hasPattern = vals.some((v) => /^(pattern|schema|scheme)$/i.test(v));
  return hasEx && (hasSet || hasReps || hasPattern);
}

function countSchemePatternCells(rawRows, maxRows = 80) {
  let n = 0;
  const limit = Math.min(maxRows, (rawRows || []).length);
  for (let i = 0; i < limit; i++) {
    const row = rawRows[i] || [];
    for (let c = 0; c < row.length; c++) {
      if (/\d+\s*[*xX\u00d7]\s*\S+/.test(String(row[c] || ""))) n++;
    }
  }
  return n;
}

export function looksLikeTrainingProgramSheet(rawRows = []) {
  if (looksLikeSsttProgramGrid(rawRows)) return true;
  let sessions = 0;
  let headers = 0;
  for (let i = 0; i < (rawRows || []).length; i++) {
    if (rowLooksLikeSessionHeader(rawRows[i])) sessions++;
    if (rowLooksLikeExerciseTableHeader(rawRows[i])) headers++;
  }
  const patterns = countSchemePatternCells(rawRows);
  return (sessions >= 1 && headers >= 1)
    || (sessions >= 2 && patterns >= 3)
    || (headers >= 1 && patterns >= 4);
}

function looksLikeCatalogOrLookupSheet(sheetName, rawRows = []) {
  const n = String(sheetName || "");
  if (looksLikeTrainingProgramSheet(rawRows)) return false;
  if (/list|liste|catalog|elenco|dizionario|dictionary|sub[_\s-]?db|(?:^|_)db$/i.test(n)) return true;
  if (/^[_~]/.test(n) && !isWeekNamedSheet(n)) return true;
  return false;
}

function looksLikeScienceOrEvidenceSheet(sheetName, rawRows = []) {
  const n = sheetNameBare(sheetName);
  if (/^(?:evidence|evidenza|razionale|research|letteratura|fonti|references|bibliografia)\b/i.test(n)) return true;
  let hits = 0;
  for (let i = 0; i < Math.min(12, (rawRows || []).length); i++) {
    const rowStr = (rawRows[i] || []).join(" ").toLowerCase();
    if (/\b(fonte|evidenza|meta-analisi|meta analisi|pubmed|doi|razionale|letteratura)\b/.test(rowStr)) hits++;
  }
  return hits >= 2 && !looksLikeTrainingProgramSheet(rawRows);
}

function hasTherapyTableHeaders(rawRows = []) {
  for (let i = 0; i < Math.min(20, (rawRows || []).length); i++) {
    const vals = (rawRows[i] || []).map((c) => String(c == null ? "" : c).toLowerCase().trim());
    const hasDrug = vals.some((v) => /farmaco|principio|medicinale|sostanza/.test(v));
    const hasDose = vals.some((v) => /dose|dosaggio|posologia/.test(v));
    if (hasDrug && hasDose) return true;
  }
  return false;
}

function hasExamTableHeaders(rawRows = []) {
  for (let i = 0; i < Math.min(20, (rawRows || []).length); i++) {
    const vals = (rawRows[i] || []).map((c) => String(c == null ? "" : c).toLowerCase().trim());
    const hasParam = vals.some((v) => /parametro|esame|biomarcatore|analita/.test(v));
    const hasVal = vals.some((v) => /valore|referto|risultato/.test(v));
    if (hasParam && hasVal) return true;
  }
  return false;
}

export function classifySheetType(sheetName, rawRows = []) {
  const nameUpper = String(sheetName || "").toUpperCase().trim();

  if (looksLikeSsttProgramGrid(rawRows)) return "training";
  if (looksLikeScienceOrEvidenceSheet(sheetName, rawRows)) return "other";
  if (looksLikeCatalogOrLookupSheet(sheetName, rawRows)) return "other";
  if (isMetaOrAdminSheetName(sheetName) && !looksLikeTrainingProgramSheet(rawRows) && !isWeekNamedSheet(sheetName)) {
    return "other";
  }

  if (/^(START|WELCOME|FAQS?|GRAPHS?|PROFILE|RPE)\b/i.test(nameUpper) && !looksLikeSsttProgramGrid(rawRows)) {
    return "other";
  }

  // Explicit sheet name matchers
  if (/^(?:ALLENAMENTO|TRAINING|WORKOUT|SCHEDA|SPLIT|W\d+|SETTIMANA\s*\d*|WEEK\s*\d+|ALL\.?|PUSH|PULL|LEGS|UPPER|LOWER|MESOCICLO|MICROCICLO|BLOCCO|FASE|TABELLA|PROGRAMMA|GYM|ROUTINE|SESSIONI|PESI|BODYBUILDING|FITNESS)$/i.test(nameUpper)) {
    return "training";
  }
  if (isWeekNamedSheet(sheetName) && looksLikeTrainingProgramSheet(rawRows)) return "training";
  if (/^(?:ALIMENTAZIONE|NUTRIZIONE|DIETA|PIANO\s*ALIMENTARE|MEALS|MEAL\s*PLAN|PASTI|FOOD|NUTRITION|NUTRICI[OÓ]N|NUTRI[CÇ][AÃ]O|ERN[AÄ]HRUNG|ALIMENTATION|ПИТАНИЕ|营养|التغذية|पोषण)/i.test(nameUpper)) {
    return "nutrition";
  }
  if (/^(?:INTEGRAZIONE|INTEGRATORI|SUPPLEMENTI|SUPPLEMENTATION|SUPPLEMENTS)/i.test(nameUpper)) {
    return "supplementation";
  }
  if (/^(?:TERAPIA\s*ED\s*ESAMI|TERAPIA_ESAMI|PIANO\s*CLINICO|CLINICAL)/i.test(nameUpper) && (hasTherapyTableHeaders(rawRows) || hasExamTableHeaders(rawRows))) {
    return "therapy_exams";
  }
  if (/^(?:TERAPIA|FARMACOLOGIA|TRATTAMENTO|TERAPIE|MEDICINALI|FARMACI)/i.test(nameUpper) && hasTherapyTableHeaders(rawRows)) {
    return "therapy";
  }
  if (/^(?:ESAMI|ANALISI|ESAMI\s*DEL\s*SANGUE|BLOODWORK|REFERTI|VALORI)/i.test(nameUpper) && hasExamTableHeaders(rawRows)) {
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
    if (/\bfarmaco\b|principio attivo|somministrazione|medicinale|durata settimane|\bcompresse\b|\bterapia\b|metformina|cardiaspirina|telmisartan/.test(rowStr)) therapyHits++;
    if (/\besame\b|\breferto\b|\bsangue\b|emocromo|testosterone|glicemia|transaminasi|valori di riferimento/.test(rowStr)
      || (/\banalisi\b/.test(rowStr) && !/meta[-\s]?analisi/.test(rowStr))) examHits++;
  }

  if (nutritionHits >= 2 && nutritionHits >= trainingHits) return "nutrition";
  if (supplementHits >= 2 && supplementHits >= trainingHits) return "supplementation";
  if (therapyHits >= 1 && examHits >= 1 && (hasTherapyTableHeaders(rawRows) || hasExamTableHeaders(rawRows))) return "therapy_exams";
  if (therapyHits >= 2 && hasTherapyTableHeaders(rawRows)) return "therapy";
  if (examHits >= 2 && hasExamTableHeaders(rawRows)) return "exams";
  if (looksLikeTrainingProgramSheet(rawRows)) return "training";
  if (trainingHits >= 3 && looksLikeTrainingProgramSheet(rawRows)) return "training";

  return "other";
}

// ====================================================
// 3. STRUCTURED MULTI-LAYOUT TRAINING SHEET PARSER
// ====================================================

function looksLikeGiornoNameList(rawRows) {
  let giornoHits = 0;
  let patternHits = 0;
  let nameOnlyHits = 0;
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i] || [];
    const a = String(row[0] || "").trim();
    const b = String(row[1] || "").trim();
    const joined = `${a} ${b}`;
    if (/GIORNO\s*\d+/i.test(joined)) giornoHits++;
    if (/\d+\s*[\*xX\u00d7]\s*\S+/.test(joined)) patternHits++;
    else if (b && !/^(ESERCIZIO|PATTERN|RIPOSO|NOTE)$/i.test(b) && !/GIORNO\s*\d+/i.test(b) && !a) nameOnlyHits++;
  }
  return giornoHits >= 1 && patternHits === 0 && nameOnlyHits >= 3;
}

function parseGiornoNameListSheet(rawRows, weekNumber, sheetName) {
  const sessions = [];
  let currentSession = null;
  const skipName = /^(ESERCIZIO|PATTERN|RIPOSO|NOTE|SET|SERIE|REPS|VOLUME|SETTIMANA)$/i;

  function addEx(name) {
    const exName = String(name || "").trim();
    if (!exName || skipName.test(exName) || /^(GIORNO|DAY|SEDUTA|SESSIONE)\s*\d+/i.test(exName)) return;
    if (!currentSession) {
      currentSession = { session_number: 1, name: "Sessione 1", exercises: [] };
    }
    const lit = parseLiteralScheme(exName);
    const pattern = lit ? (lit.sets + "*" + lit.reps) : null;
    const expansion = expandPatternToSets(pattern || "3*10", 90, null, 2, 8);
    const nameClean = lit
      ? exName.replace(/\d+\s*[xX*\u00d7]\s*\S+/g, " ").replace(/\s{2,}/g, " ").trim() || exName
      : exName;
    const normalized = normalizeExerciseName(nameClean);
    const exObj = {
      id: `e_${weekNumber}_${currentSession.session_number}_${currentSession.exercises.length + 1}`,
      name: normalized.name_normalized,
      name_original: exName,
      name_normalized: normalized.name_normalized,
      movement: nameClean,
      muscle_group: normalized.muscle,
      muscle_groups: normalized.muscles,
      mappingConfidence: Math.min(normalized.confidence, lit ? 0.85 : 0.55),
      mappingSource: normalized.confidence >= 0.9 ? 'dictionary' : 'raw',
      sets_count: (lit && lit.sets) || expansion.setCount,
      reps_target: (lit && lit.reps) || expansion.reps,
      reps_raw: (lit && lit.raw) || pattern || "3*10",
      scheme: (lit && lit.raw) || null,
      rir_target: 2,
      rpe_target: 8,
      percentage_1rm: null,
      rest_seconds: 90,
      load_target: null,
      load_value: null,
      notes: lit
        ? (lit.raw + (lit.technique === "drop_set" ? " drop set" : ""))
        : "Serie/reps non presenti nel documento — valori di default da verificare",
      sets: expansion.sets,
      setsInferred: !lit,
      reviewFlags: lit ? [] : ["SETS_INFERRED", "FLAG_FOR_REVIEW"]
    };
    if (lit) {
      try {
        enforceExercisePrescription(exObj, {
          sets: lit.sets,
          reps: lit.reps,
          raw: lit.raw,
          technique: lit.technique,
          source: "name_list_literal"
        });
      } catch (_) {}
    } else if (typeof flagInferredSets === "function") {
      flagInferredSets(exObj, { inferred: true });
    }
    currentSession.exercises.push(exObj);
  }

  for (let rIdx = 0; rIdx < rawRows.length; rIdx++) {
    const row = rawRows[rIdx] || [];
    const a = String(row[0] || "").trim();
    const b = String(row[1] || "").trim();
    const dayA = a.match(/^(?:GIORNO|DAY|SEDUTA|SESSIONE)\s*\d+/i);
    if (dayA) {
      if (currentSession && currentSession.exercises.length > 0) sessions.push(currentSession);
      currentSession = { session_number: sessions.length + 1, name: a, exercises: [] };
      if (b && !skipName.test(b)) addEx(b);
      continue;
    }
    if (skipName.test(a) || skipName.test(b)) continue;
    const name = b || a;
    if (name) addEx(name);
  }
  if (currentSession && currentSession.exercises.length > 0) sessions.push(currentSession);
  return {
    week_number: weekNumber,
    label: sheetName,
    sessions
  };
}

export function parseTrainingSheet(sheet, weekIndex = 1) {
  const rawRows = sheet.rawRows || [];
  const weekNumber = parseInt(sheet.name.replace(/\D/g, ""), 10) || weekIndex;
  const sessions = [];

  if (looksLikeSsttProgramGrid(rawRows)) {
    const ssttWeeks = parseSsttProgramGrid(rawRows, sheet.name, sheet.formulaMap || {});
    if (ssttWeeks.length) return ssttWeeks[0];
  }

  if (looksLikeGiornoNameList(rawRows)) {
    return parseGiornoNameListSheet(rawRows, weekNumber, sheet.name);
  }

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
      const lit = parseLiteralScheme(patternRaw) || parseLiteralScheme(exNameRaw + " " + patternRaw + " " + notesRaw);

      const exercise = {
        id: `e_${weekNumber}_${currentSession.session_number}_${currentSession.exercises.length + 1}`,
        name: normalized.name_normalized,
        name_original: exNameRaw,
        name_normalized: normalized.name_normalized,
        movement: exNameRaw,
        muscle_group: normalized.muscle,
        muscle_groups: normalized.muscles,
        mappingConfidence: normalized.confidence,
        mappingSource: normalized.confidence >= 0.9 ? 'dictionary' : 'raw',
        sets_count: (lit && lit.sets) || expansion.setCount,
        reps_target: (lit && lit.reps) || expansion.reps,
        reps_raw: patternRaw,
        scheme: (lit && lit.raw) || patternRaw,
        rir_target: rir,
        rpe_target: rpe,
        percentage_1rm: null,
        rest_seconds: restSec,
        load_target: null,
        load_value: null,
        notes: notesRaw || null,
        sets: expansion.sets
      };
      try {
        enforceExercisePrescription(exercise, lit ? {
          sets: lit.sets,
          reps: lit.reps,
          raw: lit.raw,
          technique: lit.technique,
          source: "excel_pattern"
        } : {
          sets: expansion.setCount,
          reps: expansion.reps,
          raw: patternRaw,
          technique: /drop/i.test(notesRaw || "") ? "drop_set" : null,
          source: "excel_expand"
        });
      } catch (_) {}

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
      // Prefer literal scheme from cells: "4x10" OR Sets=4 + Reps=10
      const combinedScheme = [setVal, repsVal, notesVal, rawExName].filter(Boolean).join(" ");
      let lit = parseLiteralScheme(combinedScheme)
        || parseLiteralScheme(String(setVal || ""))
        || parseLiteralScheme(String(repsVal || ""));
      const setAsNumber = parseInt(String(setVal || "").trim(), 10);
      // Peek next row: if no continuation, Sets column is a COUNT (4) not set index (1)
      const nextRow = rawRows[rIdx + 1] || [];
      const nextName = headerColMap?.exercise !== undefined
        ? String(nextRow[headerColMap.exercise] || "").trim()
        : String(nextRow[1] || nextRow[0] || "").trim();
      const nextSet = headerColMap?.set !== undefined
        ? String(nextRow[headerColMap.set] || "").trim()
        : String(nextRow[2] || "").trim();
      const nextIsContinuation = (!nextName || nextName.toLowerCase() === rawExName.toLowerCase())
        && nextSet
        && !String(nextName || "").toLowerCase().startsWith("volume");
      if (!lit && Number.isFinite(setAsNumber) && setAsNumber >= 1 && setAsNumber <= 15 && repsVal && !nextIsContinuation) {
        lit = { sets: setAsNumber, reps: String(repsVal).trim(), raw: setAsNumber + "x" + String(repsVal).trim(), technique: /drop/i.test(notesVal) ? "drop_set" : null, source: "sets_col_count" };
      }

      const details = parseExerciseDetails(`${lit ? lit.raw : ""} ${repsVal} ${rirVal ? "RIR " + rirVal : ""} ${restVal} ${loadVal ? loadVal + " kg" : ""} ${notesVal}`);

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
      const finalRepsTarget = (lit && lit.reps) || repsVal || details.reps || "8-10";
      const totalSets = (lit && lit.sets) || 1;

      currentExercise = {
        id: `e_${weekNumber}_${currentSession.session_number}_${currentSession.exercises.length + 1}`,
        name: normalized.name_normalized,
        name_original: rawExName,
        name_normalized: normalized.name_normalized,
        movement: movement || null,
        muscle_group: normalized.muscle,
        muscle_groups: normalized.muscles,
        mappingConfidence: normalized.confidence,
        mappingSource: normalized.confidence >= 0.9 ? 'dictionary' : 'raw',
        sets_count: totalSets,
        reps_target: finalRepsTarget,
        reps_raw: (lit && lit.raw) || repsVal || details.reps_raw || "8-10",
        scheme: lit ? lit.raw : null,
        rir_target: targetRirNum,
        rpe_target: targetRpeNum,
        percentage_1rm: details.percentage_1rm,
        rest_seconds: finalRestSec,
        load_target: targetLoadNum ? `${targetLoadNum} kg` : null,
        load_value: targetLoadNum,
        notes: notesVal || (lit ? lit.raw : null),
        sets: Array.from({ length: totalSets }, (_, sIdx) => ({
          set_number: sIdx + 1,
          set_type: (lit && lit.technique === "drop_set" && sIdx === totalSets - 1) ? "dropset" : (sIdx === 0 ? setType : "working"),
          technique: (lit && lit.technique === "drop_set" && sIdx === totalSets - 1) ? "drop_set" : null,
          target_load: targetLoadNum,
          target_reps: finalRepsTarget,
          target_rir: targetRirNum,
          target_rpe: targetRpeNum,
          percentage_1rm: details.percentage_1rm,
          rest_seconds: finalRestSec,
          notes: notesVal || null
        }))
      };
      if (lit) {
        try {
          enforceExercisePrescription(currentExercise, {
            sets: lit.sets,
            reps: lit.reps,
            raw: lit.raw,
            technique: lit.technique,
            source: lit.source || "excel_row"
          });
        } catch (_) {}
      }
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

// ====================================================
// FOOD MACRO CATALOG — fill missing kcal/macros on import
// Values per 100g (or per typical piece when unit=pz)
// ====================================================
export const FOOD_MACRO_CATALOG = [
  { keys: ["petto di pollo", "pollo", "chicken breast", "coscia di pollo", "petto pollo"], kcal: 110, pro: 23, carb: 0, fat: 1.2 },
  { keys: ["tacchino", "petto di tacchino", "fesa di tacchino"], kcal: 105, pro: 24, carb: 0, fat: 1 },
  { keys: ["macinato magro", "carne macinata", "hamburger di pollo", "hamburguer di pollo"], kcal: 140, pro: 20, carb: 0, fat: 6 },
  { keys: ["vitello", "carne di vitello"], kcal: 120, pro: 21, carb: 0, fat: 4 },
  { keys: ["maiale magro", "lonza"], kcal: 140, pro: 21, carb: 0, fat: 5 },
  { keys: ["albume", "albumi", "egg white"], kcal: 52, pro: 11, carb: 0.7, fat: 0.2 },
  { keys: ["uovo", "uova", "egg"], kcal: 143, pro: 12.6, carb: 0.8, fat: 9.5 },
  { keys: ["salmone"], kcal: 208, pro: 20, carb: 0, fat: 13 },
  { keys: ["tonno", "tonno al naturale"], kcal: 103, pro: 24, carb: 0, fat: 0.8 },
  { keys: ["yogurt greco", "yogurt"], kcal: 97, pro: 9, carb: 3.6, fat: 5 },
  { keys: ["fiocchi di latte", "cottage"], kcal: 85, pro: 12, carb: 3.5, fat: 2 },
  { keys: ["whey", "proteine", "protein powder"], kcal: 370, pro: 80, carb: 5, fat: 3 },
  { keys: ["avena", "fiocchi d'avena", "oats"], kcal: 389, pro: 16.9, carb: 66.3, fat: 6.9 },
  { keys: ["riso basmati", "riso", "rice"], kcal: 360, pro: 7, carb: 79, fat: 0.6 },
  { keys: ["pasta", "pasta di semola"], kcal: 355, pro: 12.5, carb: 73, fat: 1.5 },
  { keys: ["pane", "pane integrale"], kcal: 265, pro: 9, carb: 49, fat: 3.2 },
  { keys: ["patate", "patate lesse"], kcal: 77, pro: 2, carb: 17, fat: 0.1 },
  { keys: ["patate dolci", "sweet potato"], kcal: 86, pro: 1.6, carb: 20, fat: 0.1 },
  { keys: ["cereali"], kcal: 380, pro: 8, carb: 80, fat: 2 },
  { keys: ["latte di riso"], kcal: 47, pro: 0.3, carb: 9.2, fat: 1 },
  { keys: ["latte", "latte parzialmente scremato"], kcal: 46, pro: 3.4, carb: 4.8, fat: 1.5 },
  { keys: ["olio evo", "olio extravergine", "olio d'oliva", "olio"], kcal: 884, pro: 0, carb: 0, fat: 100 },
  { keys: ["burro di arachidi", "peanut butter"], kcal: 588, pro: 25, carb: 20, fat: 50 },
  { keys: ["mandorle"], kcal: 579, pro: 21, carb: 22, fat: 49 },
  { keys: ["avocado"], kcal: 160, pro: 2, carb: 8.5, fat: 14.7 },
  { keys: ["zucchine", "zucchini"], kcal: 17, pro: 1.2, carb: 3.1, fat: 0.3 },
  { keys: ["carote", "carrot"], kcal: 41, pro: 0.9, carb: 10, fat: 0.2 },
  { keys: ["pomodoro", "pomodori"], kcal: 18, pro: 0.9, carb: 3.9, fat: 0.2 },
  { keys: ["lattuga", "insalata"], kcal: 15, pro: 1.4, carb: 2.9, fat: 0.2 },
  { keys: ["mela", "apple"], kcal: 52, pro: 0.3, carb: 14, fat: 0.2, perPieceG: 180 },
  { keys: ["pera", "pear"], kcal: 57, pro: 0.4, carb: 15, fat: 0.1, perPieceG: 170 },
  { keys: ["arancia", "orange"], kcal: 47, pro: 0.9, carb: 12, fat: 0.1, perPieceG: 130 },
  { keys: ["banana"], kcal: 89, pro: 1.1, carb: 23, fat: 0.3, perPieceG: 120 },
  { keys: ["frutti di bosco", "mirtilli", "berries"], kcal: 57, pro: 0.7, carb: 14, fat: 0.3 },
  { keys: ["broccoli", "broccolo"], kcal: 34, pro: 2.8, carb: 7, fat: 0.4 },
  { keys: ["miele", "honey"], kcal: 304, pro: 0.3, carb: 82, fat: 0 },
  { keys: ["spinaci"], kcal: 23, pro: 2.9, carb: 3.6, fat: 0.4 },
  { keys: ["ceci", "fagioli", "lenticchie"], kcal: 120, pro: 8, carb: 20, fat: 2 },
  { keys: ["parmigiano", "grana"], kcal: 392, pro: 33, carb: 0, fat: 28 },
  { keys: ["prosciutto cotto", "prosciutto"], kcal: 120, pro: 20, carb: 0.5, fat: 4 }
];

function foldFoodKey(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchFoodMacros(foodName) {
  const q = foldFoodKey(foodName);
  if (!q || q.length < 2) return null;
  let best = null;
  let bestScore = 0;
  for (const row of FOOD_MACRO_CATALOG) {
    for (const key of row.keys) {
      const k = foldFoodKey(key);
      if (!k) continue;
      let score = 0;
      if (q === k) score = 100;
      else if (q.includes(k) || k.includes(q)) score = 80 + Math.min(k.length, 15);
      else {
        const qw = q.split(/\s+/);
        const kw = k.split(/\s+/);
        const hits = kw.filter((w) => w.length > 2 && qw.some((x) => x.includes(w) || w.includes(x))).length;
        if (hits) score = 40 + hits * 15;
      }
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }
  }
  return bestScore >= 40 ? best : null;
}

export function enrichFoodItemMacros(item) {
  if (!item || typeof item !== "object") return item;
  const hasKcal = item.kcal != null && !isNaN(Number(item.kcal)) && Number(item.kcal) > 0;
  const hasPro = (item.pro != null && Number(item.pro) > 0) || (item.protein_g != null && Number(item.protein_g) > 0);
  if (hasKcal && hasPro) {
    item.pro = item.pro != null ? Number(item.pro) : Number(item.protein_g);
    item.carb = item.carb != null ? Number(item.carb) : Number(item.carbs_g || 0);
    item.fat = item.fat != null ? Number(item.fat) : Number(item.fat_g || 0);
    item.protein_g = item.pro;
    item.carbs_g = item.carb;
    item.fat_g = item.fat;
    return item;
  }
  const hit = matchFoodMacros(item.name || item.food);
  if (!hit) return item;
  let grams = 100;
  const q = parseFloat(item.quantity);
  const u = String(item.unit || "g").toLowerCase();
  if (!isNaN(q) && q > 0) {
    if (u === "kg") grams = q * 1000;
    else if (u === "ml" || u === "g" || u === "gr" || u === "grammi" || u === "l") grams = u === "l" ? q * 1000 : q;
    else if (u === "pz" || u === "pezzi" || u === "fetta" || u === "fette" || u === "") {
      grams = (hit.perPieceG || 100) * q;
    } else grams = q;
  }
  const ratio = grams / 100;
  item.kcal = Math.round((hit.kcal || 0) * ratio);
  item.pro = Math.round((hit.pro || 0) * ratio * 10) / 10;
  item.carb = Math.round((hit.carb || 0) * ratio * 10) / 10;
  item.fat = Math.round((hit.fat || 0) * ratio * 10) / 10;
  item.protein_g = item.pro;
  item.carbs_g = item.carb;
  item.fat_g = item.fat;
  item.macro_source = "food_catalog";
  return item;
}

export function enrichNutritionMacros(nutrition) {
  if (!nutrition || !Array.isArray(nutrition.days)) return nutrition;
  nutrition.days.forEach((day) => {
    (day.meals || []).forEach((meal) => {
      const foods = meal.foods || meal.items || [];
      foods.forEach((f) => enrichFoodItemMacros(f));
      meal.foods = foods;
      meal.items = foods;
    });
  });
  nutrition.present = nutrition.present || nutrition.days.length > 0;
  return nutrition;
}

export function parseFoodItem(foodNameRaw, qtyRaw = null, unitRaw = null, kcalRaw = null, proRaw = null, carbRaw = null, fatRaw = null, notesRaw = null) {
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
    const fatMatch = foodName.match(/(?:fat|grassi|lipidi)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*g?\b/i);
    if (fatMatch) {
      fat_g = parseFloat(fatMatch[1]);
      foodName = foodName.replace(fatMatch[0], "").trim();
    }
  }

  // Parse quantity and unit if embedded in quantity or foodName (e.g. 50 gr, 200 gr, 10 ML, 1 MELA, 1 BANANA)
  if (quantity === null || quantity === "") {
    const qtyUnitMatch = foodName.match(/^(\d+(?:[.,]\d+)?)\s*(gr|grammi|g|ml|l|litri|cps|capsule|compresse|cp|fette|fetta|scoop|misurini|misurino|porzioni|porzione|pz|pezzi|cucchiai|cucchiaio|uova|albumi)\b/i);
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

  foodName = foodName.replace(/^\d+(?:[.,]\d+)?\s*(?:gr|grammi|g|ml|kg)?\s*(?:di|of)?\s*/i, "").replace(/^(?:di|of)\s+/i, "").replace(/^[,:\s\-\u2013]+|[,:\s\-\u2013]+$/g, "").trim();
  if (!foodName) foodName = String(foodNameRaw).trim();

  const proOut = !isNaN(protein_g) ? protein_g : null;
  const carbOut = !isNaN(carbs_g) ? carbs_g : null;
  const fatOut = !isNaN(fat_g) ? fat_g : null;
  return enrichFoodItemMacros({
    name: foodName,
    food: foodName,
    quantity: quantity !== null && quantity !== undefined ? quantity : "",
    unit: unit || "g",
    kcal: !isNaN(kcal) ? kcal : null,
    protein_g: proOut,
    carbs_g: carbOut,
    fat_g: fatOut,
    pro: proOut,
    carb: carbOut,
    fat: fatOut,
    notes: notes || null
  });
}

export function parseNutritionSheet(sheet) {
  const rawRows = sheet.rawRows || [];
  const days = [];
  const notes = [];

  // Step 1: Detect Horizontal Multi-Day Column Groups (e.g. LUNEDI, MARTEDI, MERCOLEDI...)
  const dayColMap = [];
  const DAY_REGEX = /^(LUNED|MARTED|MERCOLED|GIOVED|VENERD|SABATO|DOMENICA|GIORNO\s*\d+|DAY\s*\d+|REST DAY|TRAINING DAY)/i;
  function canonNutritionDay(raw) {
    const u = String(raw || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (/^LUNED/.test(u)) return "LUNEDI";
    if (/^MARTED/.test(u)) return "MARTEDI";
    if (/^MERCOLED/.test(u)) return "MERCOLEDI";
    if (/^GIOVED/.test(u)) return "GIOVEDI";
    if (/^VENERD/.test(u)) return "VENERDI";
    if (/^SABATO/.test(u)) return "SABATO";
    if (/^DOMENICA/.test(u)) return "DOMENICA";
    return String(raw || "").toUpperCase();
  }

  for (let rIdx = 0; rIdx < rawRows.length; rIdx++) {
    const row = rawRows[rIdx] || [];
    row.forEach((cellVal, cIdx) => {
      const valStr = String(cellVal || "").trim();
      const match = valStr.match(DAY_REGEX);
      if (match) {
        if (!dayColMap.some(d => d.startCol === cIdx && d.dayName === match[0].toUpperCase())) {
          dayColMap.push({
            dayName: canonNutritionDay(match[0]),
            startCol: cIdx,
            startRow: rIdx
          });
        }
      }
    });
  }

  const MEAL_RE = /^(PASTO\s*\d+|MEAL\s*\d+|COLAZIONE|SPUNTINO|PRANZO|MERENDA|CENA|PRE[_\-\s]?NANNA)/i;

  function consumeNutritionCells(cells, dayObj, currentMeal) {
    if (!cells.length) return currentMeal;
    const rowText = cells.join(" ");
    const isMeal = MEAL_RE.test(cells[0]);
    if (isMeal) {
      if (currentMeal && (currentMeal.foods.length > 0 || currentMeal.items.length > 0)) {
        dayObj.meals.push(currentMeal);
      }
      currentMeal = { name: cells[0], meal_name: cells[0], foods: [], items: [] };
      if (cells.length > 1) {
        const item = parseFoodItem(cells.slice(1).join(" "));
        if (item) {
          currentMeal.foods.push(item);
          currentMeal.items.push(item);
        }
      }
      return currentMeal;
    }
    if (!currentMeal) {
      currentMeal = { name: "Pasto", meal_name: "Pasto", foods: [], items: [] };
    }
    const item = parseFoodItem(rowText);
    if (item && !DAY_REGEX.test(String(item.name || item.food || ""))) {
      currentMeal.foods.push(item);
      currentMeal.items.push(item);
    }
    return currentMeal;
  }

  const bandsByRow = new Map();
  dayColMap.forEach((d) => {
    if (!bandsByRow.has(d.startRow)) bandsByRow.set(d.startRow, []);
    bandsByRow.get(d.startRow).push(d);
  });
  const horizontalBandRows = Array.from(bandsByRow.entries())
    .filter(([, list]) => new Set(list.map(d => d.startCol)).size >= 2)
    .sort((a, b) => a[0] - b[0]);

  const horizontalRowSkip = new Set();
  if (horizontalBandRows.length) {
    const captured = new Set();
    horizontalBandRows.forEach((entry, bIdx) => {
      const startRow = entry[0];
      const list = entry[1].slice().sort((a, b) => a.startCol - b.startCol);
      const nextBandRow = (bIdx + 1 < horizontalBandRows.length) ? horizontalBandRows[bIdx + 1][0] : rawRows.length;
      let endRow = nextBandRow;
      for (let r = startRow + 1; r < nextBandRow; r++) {
        const row = rawRows[r] || [];
        const col0 = String(row[0] || "").trim();
        if (DAY_REGEX.test(col0) && !list.some(d => d.dayName === (col0.match(DAY_REGEX) || [])[1]?.toUpperCase())) {
          endRow = r;
          break;
        }
      }
      for (let r = startRow; r < endRow; r++) horizontalRowSkip.add(r);
      for (let i = 0; i < list.length; i++) {
        const nextCol = (i + 1 < list.length) ? list[i + 1].startCol : 100;
        list[i].endCol = nextCol - 1;
      }
      list.forEach((dayGroup, bandIdx) => {
        const dayObj = { day: dayGroup.dayName, day_name: dayGroup.dayName, meals: [] };
        let currentMeal = null;
        const headerRow = rawRows[startRow] || [];
        const headerCells = [];
        for (let c = dayGroup.startCol + 1; c <= dayGroup.endCol; c++) {
          const val = headerRow[c] != null ? String(headerRow[c]).trim() : "";
          if (val && !DAY_REGEX.test(val)) headerCells.push(val);
        }
        currentMeal = consumeNutritionCells(headerCells, dayObj, currentMeal);
        let dataWidth = 0;
        let dataMaxCol = -1;
        for (let r = startRow + 1; r < endRow; r++) {
          (rawRows[r] || []).forEach((cell, ci) => {
            if (!String(cell || "").trim()) return;
            dataWidth = Math.max(dataWidth, (rawRows[r] || []).filter((c) => String(c || "").trim()).length);
            dataMaxCol = Math.max(dataMaxCol, ci);
          });
        }
        const compactBands = list.length >= 2 && dataWidth === list.length && dataMaxCol >= 0 && dataMaxCol < list[1].startCol;
        for (let rIdx = startRow + 1; rIdx < endRow; rIdx++) {
          const row = rawRows[rIdx] || [];
          const cells = [];
          if (compactBands) {
            const val = row[bandIdx] != null ? String(row[bandIdx]).trim() : "";
            if (val) cells.push(val);
          } else {
            for (let c = dayGroup.startCol; c <= dayGroup.endCol; c++) {
              const val = row[c] != null ? String(row[c]).trim() : "";
              if (val && (c !== dayGroup.startCol || !DAY_REGEX.test(val))) cells.push(val);
            }
          }
          currentMeal = consumeNutritionCells(cells, dayObj, currentMeal);
        }
        if (currentMeal && (currentMeal.foods.length > 0 || currentMeal.items.length > 0)) {
          dayObj.meals.push(currentMeal);
        }
        if (dayObj.meals.length > 0 && !captured.has(dayObj.day)) {
          captured.add(dayObj.day);
          days.push(dayObj);
        }
      });
    });
  }

  // Step 2: Fallback to Vertical Rows Layout
  let currentDay = null;
  let currentMeal = null;
  let headerColMap = null;

  for (let rIdx = 0; rIdx < rawRows.length; rIdx++) {
    if (horizontalRowSkip.has(rIdx)) continue;
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
      const dName = canonNutritionDay(dayMatch[1]);
      if (days.some(d => d.day === dName)) {
        continue;
      }
      currentDay = { day: dName, day_name: dName, meals: [] };
      const sameRowMeal = String(row[1] || "").trim();
      if (!/^(PASTO\s*\d+|MEAL\s*\d+|COLAZIONE|SPUNTINO|PRANZO|MERENDA|CENA|PRE[_\-\s]?NANNA)/i.test(sameRowMeal)) {
        continue;
      }
    }

    if (!currentDay) {
      currentDay = { day: "LUNEDÌ", day_name: "LUNEDÌ", meals: [] };
    }

    // 2. Detect Meal Header (e.g. Colazione, Spuntino Mattina, Pranzo, Merenda, Cena, Pre-nanna)
    const col0Str = String(row[0] || "").trim();
    const col1Str = String(row[1] || "").trim();
    const mealHeaderRe = /^(Colazione|Pranzo|Cena|Spuntino(?:\s*\d*|\s+Mattina|\s+Pomeriggio)?|Pre[\s\-_]?nanna|Pre[\s\-_]?workout|Post[\s\-_]?workout|Merenda|Pasto\s*\d+|Meal\s*\d+)/i;
    const mealName = mealHeaderRe.test(col0Str) ? col0Str : (mealHeaderRe.test(col1Str) ? col1Str : "");
    const isMealInCol0 = !!mealName;

    if (isMealInCol0) {
      if (currentMeal) {
        currentDay.meals.push(currentMeal);
      }
      currentMeal = {
        name: mealName,
        meal_name: mealName,
        foods: [],
        items: []
      };

      const foodCell = mealHeaderRe.test(col0Str) ? (row[1] || row[2]) : (row[2] || null);
      if (foodCell && !mealHeaderRe.test(String(foodCell).trim())) {
        const item = parseFoodItem(
          foodCell,
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

  return enrichNutritionMacros({ present: days.length > 0, days, notes });
}

// ====================================================
// 5. STRUCTURED SUPPLEMENTATION SHEET PARSER (Multi-Layout)
// ====================================================

export function parseSupplementationSheet(sheet) {
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
    if (name.includes("\t")) {
      const parts = name.split("\t").map((s) => s.trim()).filter(Boolean);
      name = parts[0] || "";
      if (!doseRaw && parts[1]) doseRaw = parts[1];
    }
    doseRaw = doseRaw == null ? "" : String(doseRaw).trim();
    timingRaw = timingRaw == null ? "" : String(timingRaw).trim();
    notesRaw = notesRaw == null ? "" : String(notesRaw).trim();

    if (!name || name.toUpperCase().startsWith("SETTIMANA") || name.toUpperCase().startsWith("GIORNO")) continue;
    if (/^(colazione|pranzo|cena|spuntino|merenda|timing|posologia|integratore)$/i.test(name)) continue;
    if (/giammaria|master xlsx|^pagina\s+\d/i.test(name)) continue;

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

function weekdayFromToken(token) {
  const days = daysMentionedInText(token);
  return days[0] || null;
}

function daysMentionedInText(text) {
  const u = String(text || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['’`]/g, "");
  const days = [];
  if (/LUNED|\bLUN\b|MONDAY|\bMON\b/.test(u)) days.push("Lunedì");
  if (/MARTED|\bMAR\b|TUESDAY/.test(u)) days.push("Martedì");
  if (/MERCOLED|\bMER\b|WEDNESDAY|\bWED\b/.test(u)) days.push("Mercoledì");
  if (/GIOVED|\bGIO\b|THURSDAY/.test(u)) days.push("Giovedì");
  if (/VENERD|\bVEN\b|FRIDAY/.test(u)) days.push("Venerdì");
  if (/SABATO|\bSAB\b|SATURDAY/.test(u)) days.push("Sabato");
  if (/DOMENICA|\bDOM\b|SUNDAY/.test(u)) days.push("Domenica");
  return Array.from(new Set(days));
}

function isDoseCell(val) {
  const s = String(val || "").trim();
  return /(?:mg|mcg|µg|ug|g|ui|ml|cps|cp|dose)\b/i.test(s) || /^\d+(?:[.,]\d+)?$/.test(s);
}

function isJunkTherapyName(name) {
  const n = String(name || "").replace(/\s+/g, " ").trim();
  if (n.length < 3) return true;
  if (/indice|foglio|pagina|conversione|giammaria|master xlsx|^esami$|^pdf$/i.test(n)) return true;
  if (/\t/.test(String(name || "")) && /^(LUNED|MARTED|MERCOLED|GIOVED|VENERD|SABATO|DOMENICA)/i.test(n)) return true;
  if (/^(LUNED|MARTED|MERCOLED|GIOVED|VENERD|SABATO|DOMENICA)(\s|$)/i.test(n) && daysMentionedInText(n).length >= 3) return true;
  if (isDoseCell(n) && !/[a-zàèéìòù]{3,}/i.test(n.replace(/[0-9.,\s]|mg|mcg|µg|ug|ui|ml|cps|cp|dose/ig, ""))) return true;
  return false;
}

function tryParseTherapyWeekDayGrid(rawRows) {
  const dayCols = {};
  let headerRow = -1;
  for (let r = 0; r < Math.min(40, rawRows.length); r++) {
    const row = rawRows[r] || [];
    const nonempty = row.map((cell, c) => ({ c, v: String(cell || "").trim() })).filter((x) => x.v);
    nonempty.forEach(({ c, v }) => {
      const days = daysMentionedInText(v);
      if (!days.length) return;
      if (nonempty.length === 1 && c === 0) return;
      dayCols[c] = days;
      if (headerRow < 0) headerRow = r;
    });
  }
  const hasColGrid = Object.keys(dayCols).length > 0;
  if (!hasColGrid) headerRow = 0;

  const hits = [];
  let currentWeek = null;
  let namesByCol = {};
  let sectionDays = null;

  function colDays(c) {
    const d = dayCols[c];
    return Array.isArray(d) ? d : (d ? [d] : []);
  }

  function uniqueSiblingName(namesThisWeek) {
    const uniq = Array.from(new Set(Object.values(namesThisWeek).filter(Boolean)));
    return uniq.length === 1 ? uniq[0] : "";
  }

  function pushHit(week, day, name, dose) {
    const cleanName = String(name || "").replace(/\s+/g, " ").trim();
    if (!cleanName || week == null || /^(?:SETTIMANA|WEEK)\s*\d+/i.test(cleanName)) return;
    const extraDays = daysMentionedInText(cleanName);
    const days = Array.from(new Set([day].concat(extraDays).filter(Boolean)));
    days.forEach((d) => hits.push({ week, day: d, name: cleanName, dose: dose || "" }));
  }

  function pushHitDays(week, days, name, dose) {
    (days || []).forEach((d) => pushHit(week, d, name, dose));
  }

  const startRow = hasColGrid ? headerRow : 0;
  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r] || [];
    const nonempty = row.map((cell) => String(cell || "").trim()).filter(Boolean);
    const c0 = String(row[0] || "").trim();
    if (nonempty.length === 1 && daysMentionedInText(nonempty[0]).length) {
      sectionDays = daysMentionedInText(nonempty[0]);
      continue;
    }
    const weekCell = row.find((cell) => /^(?:SETTIMANA|WEEK)\s*\d+/i.test(String(cell || "").trim()));
    const weekM = String(weekCell || c0 || "").trim().match(/^(?:SETTIMANA|WEEK)\s*(\d+)/i);
    if (weekM) {
      currentWeek = parseInt(weekM[1], 10);
      const namesThisWeek = {};
      const hasWideDayHit = Object.keys(dayCols).some((c) => Number(c) >= 2 && String(row[c] || "").trim());
      if (sectionDays && sectionDays.length && !hasColGrid) {
        const extra = nonempty.filter((v) => !/^(?:SETTIMANA|WEEK)\s*\d+/i.test(v) && !daysMentionedInText(v).length);
        const nameCell = extra.find((v) => !isDoseCell(v));
        const doseCell = extra.find((v) => isDoseCell(v)) || "";
        if (nameCell) pushHitDays(currentWeek, sectionDays, nameCell, doseCell);
      } else if (!hasWideDayHit && nonempty.length <= 3) {
        nonempty.filter((v) => !/^(?:SETTIMANA|WEEK)\s*\d+/i.test(v) && !daysMentionedInText(v).length && !isDoseCell(v) && String(v).length >= 4)
          .forEach((name) => {
            const firstDayCol = Object.keys(dayCols).map(Number).sort((a, b) => a - b)[0];
            const target = firstDayCol != null ? firstDayCol : 0;
            namesThisWeek[target] = name;
            namesByCol[target] = name;
          });
      } else {
        Object.keys(dayCols).forEach((c) => {
          const val = String(row[c] || "").trim();
          if (!val || daysMentionedInText(val).length && !isDoseCell(val)) return;
          if (/^(?:SETTIMANA|WEEK)\s*\d+/i.test(val)) return;
          if (isDoseCell(val) && !/[a-zàèéìòù]{3,}/i.test(val.replace(/mg|mcg|µg|ug|ui|ml|cps|cp|dose/ig, ""))) {
            return;
          }
          const inlineDose = val.match(/(\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|g|ui|ml|cps|cp)\b.*)$/i);
          const name = inlineDose ? (val.replace(inlineDose[1], "").trim() || val) : val;
          namesThisWeek[c] = name;
          namesByCol[c] = name;
          if (inlineDose) pushHitDays(currentWeek, colDays(c), name, inlineDose[1]);
        });
        Object.keys(dayCols).forEach((c) => {
          const val = String(row[c] || "").trim();
          if (!val || !isDoseCell(val)) return;
          if (namesThisWeek[c]) return;
          const name = namesByCol[c] || uniqueSiblingName(namesThisWeek);
          if (name) pushHitDays(currentWeek, colDays(c), name, val);
        });
        if (sectionDays && sectionDays.length) {
          const extraCells = row.map((cell, c) => ({ c, val: String(cell || "").trim() }))
            .filter(({ c, val }) => val && !dayCols[c] && !/^(?:SETTIMANA|WEEK)\s*\d+/i.test(val) && !daysMentionedInText(val).length)
            .map((x) => x.val);
          const nameCell = extraCells.find((val) => !isDoseCell(val)) || uniqueSiblingName(namesThisWeek);
          const doseCell = extraCells.find((val) => isDoseCell(val)) || "";
          if (nameCell) pushHitDays(currentWeek, sectionDays, nameCell, doseCell);
        }
      }
      continue;
    }
    if (currentWeek == null) continue;
    const dayKeys = Object.keys(dayCols).map(Number).sort((a, b) => a - b);
    const collapsedPair = hasColGrid && dayKeys.length >= 4 && nonempty.length === 2 && (row.length <= 3);
    if (collapsedPair) {
      const dMon = colDays(dayKeys[0])[0];
      const dThu = colDays(dayKeys[3])[0];
      if (!isDoseCell(nonempty[0]) && String(nonempty[0]).toLowerCase() === String(nonempty[1]).toLowerCase()) {
        namesByCol[dayKeys[0]] = nonempty[0];
        namesByCol[dayKeys[3]] = nonempty[1];
        continue;
      }
      if (isDoseCell(nonempty[0]) && isDoseCell(nonempty[1])) {
        const nMon = namesByCol[dayKeys[0]] || uniqueSiblingName({});
        const nThu = namesByCol[dayKeys[3]] || nMon;
        if (nMon) pushHit(currentWeek, dMon, nMon, nonempty[0]);
        if (nThu) pushHit(currentWeek, dThu, nThu, nonempty[1]);
        continue;
      }
    }
    const namesThisWeek = {};
    Object.keys(dayCols).forEach((c) => { if (namesByCol[c]) namesThisWeek[c] = namesByCol[c]; });
    Object.keys(dayCols).forEach((c) => {
      const cell = String(row[c] || "").trim();
      if (!cell) return;
      if (isDoseCell(cell)) {
        const name = namesByCol[c] || uniqueSiblingName(namesThisWeek);
        if (name) pushHitDays(currentWeek, colDays(c), name, cell);
      } else if (!daysMentionedInText(cell).length && cell.length > 2 && !/^(?:SETTIMANA|WEEK)\s*\d+/i.test(cell)) {
        namesByCol[c] = cell;
        namesThisWeek[c] = cell;
      }
    });
    if (sectionDays && sectionDays.length) {
      const extraCells = row.map((cell, c) => ({ c, val: String(cell || "").trim() }))
        .filter(({ c, val }) => val && !dayCols[c] && !daysMentionedInText(val).length)
        .map((x) => x.val);
      const nameCell = extraCells.find((val) => !isDoseCell(val));
      const doseCell = extraCells.find((val) => isDoseCell(val)) || "";
      if (nameCell || doseCell) pushHitDays(currentWeek, sectionDays, nameCell || uniqueSiblingName(namesThisWeek), doseCell);
    }
  }

  if (!hits.length) return null;

  const grouped = new Map();
  hits.forEach((h) => {
    const doseKey = String(h.dose || "").toLowerCase().replace(/\s+/g, "").replace(",", ".") || "_";
    const key = String(h.name || "").toLowerCase().replace(/[^a-z0-9àèéìòù]+/gi, " ").trim() + "|" + h.day + "|" + doseKey;
    if (!grouped.has(key)) grouped.set(key, { name: h.name, dose: h.dose, weeks: [], days: new Set() });
    const g = grouped.get(key);
    g.weeks.push(h.week);
    g.days.add(h.day);
    if (h.dose && !g.dose) g.dose = h.dose;
  });

  const medications = [];
  grouped.forEach((g) => {
    if (isJunkTherapyName(g.name)) return;
    const weeks = Array.from(new Set(g.weeks)).sort((a, b) => a - b);
    const startWeek = weeks[0] || 1;
    const endWeek = weeks[weeks.length - 1] || startWeek;
    const days = Array.from(g.days);
    const rangeParts = [];
    let a = weeks[0], b = weeks[0];
    for (let i = 1; i <= weeks.length; i++) {
      if (i < weeks.length && weeks[i] === b + 1) { b = weeks[i]; continue; }
      rangeParts.push(a === b ? String(a) : (a + "-" + b));
      if (i < weeks.length) { a = b = weeks[i]; }
    }
    const rangeLabel = "Settimana " + rangeParts.join(", ");
    medications.push({
      medication: g.name,
      name: g.name,
      dose: g.dose || "1 dose",
      dose_value: parseFloat(String(g.dose).replace(/[^0-9.]/g, "")) || 1,
      unit: String(g.dose || "").replace(/[0-9.,\s]/g, "") || "dose",
      dayOfWeek: days,
      days,
      daysOfWeek: days,
      daysSource: "weekday_grid",
      frequency: days.join(", "),
      timing: "",
      time: "",
      duration: rangeLabel,
      duration_text: rangeLabel,
      weekRange: rangeLabel,
      start_week: startWeek,
      end_week: endWeek,
      weekStart: startWeek,
      weekEnd: endWeek,
      weeks,
      notes: null
    });
  });


  return { medications, protocols: [], legacy: medications.map(m => ({ date_or_week: m.weekRange, item_name: m.name, value: m.dose, notes: m.frequency })) };
}

/** Parse a lab exam line into { parameter, value, unit, reference_range }. */
export function parseExamLineRecord(rawLine) {
  let line = String(rawLine || "").trim();
  if (!line) return null;
  // markdown table row
  if (line.includes("|")) {
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 2 && !/^[-:]+$/.test(cells[0])) {
      const parameter = cells[0];
      const value = String(cells[1] || "").replace(/[^\d.,\-]/g, "").trim() || String(cells[1] || "").trim();
      const unit = cells[2] || "";
      const reference_range = cells[3] || null;
      if (parameter && value && /\d/.test(value)) {
        return { date: null, parameter, name: parameter, value, unit, reference_range, notes: null };
      }
    }
  }
  // csv / simple comma
  if (/,/.test(line) && !line.includes("(")) {
    const cells = line.split(",").map((c) => c.trim());
    if (cells.length >= 2 && !/^(parameter|parametro|esame)/i.test(cells[0])) {
      const parameter = cells[0];
      const value = String(cells[1] || "").trim();
      if (parameter && value && /\d/.test(value)) {
        return {
          date: null,
          parameter,
          name: parameter,
          value: value.replace(/[^\d.,\-]/g, "") || value,
          unit: cells[2] || "",
          reference_range: cells[3] || null,
          notes: null
        };
      }
    }
  }
  // tab-separated
  if (/\t/.test(line)) {
    const cells = line.split("\t").map((c) => c.trim());
    if (cells.length >= 2) {
      const parameter = cells[0];
      let value = cells[1] || "";
      let unit = cells[2] || "";
      // "95 mg/dL" in value cell
      const vu = value.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
      if (vu) {
        value = vu[1];
        if (!unit && vu[2]) unit = vu[2].replace(/[\(\[].*$/, "").trim();
      }
      if (parameter && value && /\d/.test(value)) {
        return {
          date: null,
          parameter,
          name: parameter,
          value,
          unit,
          reference_range: cells[3] || null,
          notes: null
        };
      }
    }
  }
  // plain: "Glicemia 95 mg/dL (70-100)" / "TSH: 1.8 mIU/L"
  const m = line.match(
    /^(.+?)\s*[:=\-]?\s+(\d+(?:[.,]\d+)?)\s*([A-Za-zµμ/%°][A-Za-z0-9µμ/%°.\-_]*)?\s*(?:[\(\[]([^)\]]+)[\)\]])?\s*$/
  );
  if (m) {
    const parameter = String(m[1] || "").replace(/[:\-–—]+\s*$/, "").trim();
    const value = String(m[2] || "").trim();
    const unit = String(m[3] || "").trim();
    const reference_range = m[4] ? String(m[4]).trim() : null;
    if (parameter.length >= 2 && value) {
      return { date: null, parameter, name: parameter, value, unit, reference_range, notes: null };
    }
  }
  return null;
}

export function parseTherapyExamsSheet(sheet) {
  const rawRows = sheet.rawRows || [];
  const grid = tryParseTherapyWeekDayGrid(rawRows);
  if (grid && grid.medications.length) {
    return {
      therapy: {
        present: true,
        medications: grid.medications,
        protocols: grid.protocols,
        cycles: grid.protocols,
        entries: grid.legacy
      },
      exams: { present: false, records: [], items: [] }
    };
  }
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

    // Check for Section Header like "SETTIMANA 1 - 4" or "SETTIMANA 5 - 8" (row must be ONLY the week label)
    const weekOnly = /^(?:SETTIMANA|SETTIMANE|WEEK|WEEKS)\s*\d+\s*(?:[\-\u2013]\s*\d+)?\s*$/i.test(rowStr);
    if (weekOnly) {
      activeWeeklyBlock = rowStr.trim();
      continue;
    }

    const c0 = String(row[0] || "").trim();
    const c1 = String(row[1] || "").trim();
    if (!c0 && /(?:mg|mcg|g|ui|ml|cps|cp|dose)\b/i.test(c1) && rawTherapyEntries.length) {
      const prev = rawTherapyEntries[rawTherapyEntries.length - 1];
      if (prev && !prev.doseRaw) {
        prev.doseRaw = c1;
        continue;
      }
    }

    const isHeaderRow = row.some(c => {
      const v = String(c || "").trim().toLowerCase();
      return /^(data|farmaco|principio|medicinale|esame|parametro|dose|dosaggio|posologia|valore|referto|intervallo|giorno|giorni|frequenza|orario|timing|durata|note|note mediche)$/i.test(v)
        || /farmaco\s*\/\s*principio|^farmaco\b|^dosaggio$|^orario/.test(v);
    });
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
      let parameter = String(col1 || row[0] || "").trim();
      let value = col2 ? String(col2).trim() : "";
      let unit = headerColMap?.unit !== undefined ? String(row[headerColMap.unit] || "").trim() : (col3 && !col3.includes("-") ? String(col3).trim() : "");
      let reference_range = headerColMap?.range !== undefined ? String(row[headerColMap.range] || "").trim() : (col3 && col3.includes("-") ? String(col3).trim() : (col4 || null));
      if (!value || !parameter) {
        const parsed = parseExamLineRecord(rowStr);
        if (parsed) {
          parameter = parsed.parameter || parameter;
          value = parsed.value || value;
          unit = parsed.unit || unit;
          reference_range = parsed.reference_range || reference_range;
        }
      }
      rawExamEntries.push({
        date: col0 ? String(col0).trim() : null,
        parameter,
        name: parameter,
        value,
        unit,
        reference_range,
        notes: col5 ? String(col5).trim() : (col4 && !String(col4).includes("-") ? String(col4).trim() : null)
      });
    } else {
      const weekLabelInCol0 = /^(?:SETTIMANA|WEEK)\s*\d+/i.test(String(row[0] || "").trim());
      const medName = weekLabelInCol0 && String(row[1] || "").trim()
        ? String(row[1]).trim()
        : (col1 ? String(col1).trim() : String(row[0] || "").trim());
      if (/^(SETTIMANA|WEEK|GIORNO|DAY)\s*\d+/i.test(medName) && !col2) continue;

      rawTherapyEntries.push({
        nameRaw: medName,
        doseRaw: weekLabelInCol0
          ? (row[2] ? String(row[2]).trim() : "")
          : (col2 ? String(col2).trim() : (row[1] ? String(row[1]).trim() : "")),
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
  const therapyOut = {
    present: medications.length > 0,
    medications: medications,
    protocols: protocols,
    cycles: protocols,
    entries: legacyTherapyEntries
  };
  enrichTherapyMedications(therapyOut);

  return {
    therapy: therapyOut,
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

export function parseStructuredWorkbook(workbook, filename = "documento.xlsx") {
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

  // Document Intelligence IR (tables + merges) — non-fatal if core absent
  let documentIR = null;
  try {
    if (typeof buildIRFromWorkbook === "function") {
      documentIR = buildIRFromWorkbook({ sheets: classifiedSheets, sheetNames }, filename, {
        magicType: "xlsx",
        extension: getExtName(filename),
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
    }
  } catch (irErr) {
    unrecognisedElements.push({ type: "ir_build_error", reason: String(irErr?.message || irErr) });
  }

  // Track unclassified sheets as unrecognised (no silent data loss)
  classifiedSheets.forEach((s) => {
    if (s.sheetType === "other") {
      const sample = (s.rawRows || []).slice(0, 5).map((r) => (r || []).filter((v) => v != null && String(v).trim()).join(" | ")).filter(Boolean).join(" / ");
      if (sample) {
        unrecognisedElements.push({
          type: "sheet",
          name: s.name,
          reason: "unclassified_sheet",
          sample: sample.slice(0, 200),
          sourceRef: typeof createSourceRef === "function" ? createSourceRef({ sheet: s.name, parser: "sheet_classifier", filename }) : { sheet: s.name }
        });
      }
    }
  });

  // 1. Parse Training Weeks — keep every real program sheet (one week per sheet, stacked weeks, etc.)
  const weeks = [];
  const countExercises = (weekData) => {
    let n = 0;
    (weekData.sessions || weekData.days || []).forEach(sess => { n += (sess.exercises || []).length; });
    return n;
  };
  const isUsableTrainingSheet = (s) => {
    if (!s) return false;
    if (looksLikeCatalogOrLookupSheet(s.name, s.rawRows)) return false;
    if (looksLikeScienceOrEvidenceSheet(s.name, s.rawRows)) return false;
    if (isMetaOrAdminSheetName(s.name) && !looksLikeTrainingProgramSheet(s.rawRows) && !isWeekNamedSheet(s.name)) return false;
    return looksLikeTrainingProgramSheet(s.rawRows) || s.sheetType === "training";
  };
  let ssttHit = false;
  classifiedSheets.forEach((s) => {
    if (!looksLikeSsttProgramGrid(s.rawRows)) return;
    const ssttWeeks = parseSsttProgramGrid(s.rawRows, s.name, s.formulaMap || {});
    if (!ssttWeeks.length) return;
    if (!ssttHit) {
      weeks.length = 0;
      ssttHit = true;
    }
    ssttWeeks.forEach((w) => weeks.push(w));
  });
  const weekNamedProgramSheets = classifiedSheets.filter((s) => isWeekNamedSheet(s.name) && looksLikeTrainingProgramSheet(s.rawRows));
  if (!ssttHit) {
    const sourceSheets = weekNamedProgramSheets.length >= 2
      ? weekNamedProgramSheets
      : classifiedSheets.filter(isUsableTrainingSheet);
    sourceSheets.forEach((s, idx) => {
      const weekData = parseTrainingSheet(s, idx + 1);
      if (weekData.sessions && weekData.sessions.length > 0 && countExercises(weekData) > 0) {
        weeks.push(weekData);
      }
    });
  }
  // Fallback: a single compact GIORNO + pattern sheet, only if nothing was collected
  if (!ssttHit && weeks.length === 0) {
    let bestTraining = null;
    let bestEx = 0;
    classifiedSheets.forEach((s) => {
      if (!isUsableTrainingSheet(s)) return;
      const blob = (s.rawRows || []).slice(0, 16).map(r => (r || []).join(" ")).join(" ");
      if (!/GIORNO\s*\d+/i.test(blob) || !/\d+\s*[\*xX\u00d7]/.test(blob)) return;
      const weekData = parseTrainingSheet(s, 1);
      const ex = countExercises(weekData);
      if (ex > bestEx) {
        bestEx = ex;
        bestTraining = weekData;
      }
    });
    if (bestTraining && bestEx > 0) weeks.push(bestTraining);
  }

  // If no training sheets produced weeks, scan unclassified 'other' sheets that still look like a program
  if (weeks.length === 0) {
    classifiedSheets.filter((s) => s.sheetType === "other" && looksLikeTrainingProgramSheet(s.rawRows)).forEach((s, idx) => {
      const weekData = parseTrainingSheet(s, idx + 1);
      if (weekData.sessions && weekData.sessions.length > 0 && countExercises(weekData) > 0) {
        weeks.push(weekData);
      }
    });
  }

  weeks.sort((a, b) => (Number(a.week_number || a.weekNumber || 0) - Number(b.week_number || b.weekNumber || 0)));

  // If still 0 weeks (e.g. nutrition/therapy-only workbook), keep empty weeks —
  // do NOT invent a fake empty session shell (anti-hallucination). Flag instead.
  let emptyTrainingShell = false;
  if (weeks.length === 0) {
    emptyTrainingShell = true;
    unrecognisedElements.push({
      type: "training",
      reason: "no_training_weeks_detected",
      message: "Nessuna settimana di allenamento rilevata — non inventata."
    });
  }

  const startSheet = classifiedSheets.find((s) => /^START$/i.test(String(s.name || "").trim()));
  const spreadsheet = {
    inputs: startSheet ? parseSsttStartInputs(startSheet.rawRows) : [],
    cells: startSheet ? sheetToCellMap("Start", startSheet.rawRows) : {},
    sourceSheets: sheetNames
  };
  if (ssttHit && spreadsheet.cells && Object.keys(spreadsheet.cells).length) {
    recalcTrainingLoadsFromCells(weeks, spreadsheet.cells);
  }

  // 2. Parse Nutrition — enrich macros from catalog when missing
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
      if (parsed.therapy.present && !therapy.present && hasTherapyTableHeaders(examSheets[0].rawRows)) therapy = parsed.therapy;
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

  // Merge IR unmapped into unrecognised
  if (documentIR && Array.isArray(documentIR.unmapped)) {
    documentIR.unmapped.forEach((u) => unrecognisedElements.push(u));
  }

  const canonicalProgram = {
    title: filename.replace(/\.[^/.]+$/, "").replace(/[_\-]+/g, " "),
    original_title: filename,
    normalized_title: "GS Universal Imported Program",
    description: "Programmazione completa acquisita da Universal Import Engine 3.0 + Document Intelligence.",
    author: "Atleta Nurvan",
    source: { type: "xlsx", filename },
    goal: { primary: "Ipertrofia", secondary: ["Forza"], confidence: "high" },
    difficulty: "Intermedio",
    experience_level: "Intermedio",
    training_frequency: weeks[0]?.sessions?.length || 0,
    duration_weeks: weeks.length || 0,
    equipment: ["Palestra Commerciale"],
    training: { weeks },
    weeks, // Canonical 2.0 backward compatibility alias
    nutrition,
    supplementation,
    therapy,
    exams,
    unrecognised_elements: unrecognisedElements,
    documentIR,
    spreadsheet,
    notes: emptyTrainingShell ? ["Nessun training rilevato nel workbook"] : []
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
    exam_records_count: exams.records?.length || exams.items?.length || 0,
    tables_reconstructed: documentIR?.tables?.length || 0,
    unrecognised_count: unrecognisedElements.length
  };

  const warnings = [];
  const errors = [];

  if (weeks.length === 0) {
    warnings.push("Nessuna settimana di allenamento rilevata nei fogli Excel.");
  }
  if (emptyTrainingShell && !nutrition.present && !supplementation.present) {
    warnings.push("Documento senza training/nutrition/supplement riconoscibili — dati grezzi in unrecognised_elements.");
  }

  return {
    program: canonicalProgram,
    canonicalProgram,
    documentIR,
    integrityStats,
    warnings,
    errors,
    stats: integrityStats,
    sheets: classifiedSheets
  };
}

const ML_WEEKDAY_TOKEN = String.raw`luned[iì]?|marted[iì]?|mercoled[iì]?|gioved[iì]?|venerd[iì]?|sabato|domenica|monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|segunda(?:\s*-?\s*feira)?|ter[cç]a(?:\s*-?\s*feira)?|quarta(?:\s*-?\s*feira)?|quinta(?:\s*-?\s*feira)?|sexta(?:\s*-?\s*feira)?|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье|周一|周二|周三|周四|周五|周六|周日|الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت|الأحد|सोमवार|मंगलवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार`;
const ML_MEAL_TOKEN = String.raw`pasto\s*\d+|colazione|pranzo|cena|spuntino(?:\s*\d*|\s+mattina|\s+pomeriggio)?|merenda|pre[\s\-_]?nanna|pre[\s\-_]?workout|post[\s\-_]?workout|meal\s*\d+|breakfast|lunch|dinner|snack|desayuno|almuerzo|comida|petit\s*d[eé]jeuner|d[eé]jeuner|d[iî]ner|frühstück|mittagessen|abendessen|caf[eé]\s*da\s*manh[aã]|almo[cç]o|jantar|завтрак|обед|ужин|早餐|午餐|晚餐|فطور|غداء|عشاء|नाश्ता|दोपहर\s*का\s*भोजन|रात\s*का\s*खाना`;
const ML_NUTRITION_SECTION = String.raw`nutrizione|dieta|piano\s*alimentare|alimentazione|meals|meal\s*plan|nutrition|nutrici[oó]n|nutri[cç][aã]o|ern[aä]hrung|alimentation|питание|营养|التغذية|पोषण`;
const ML_SUPP_SECTION = String.raw`integrazione|integratori|supplementi|supplementation|supplements|compl[eé]ments|suplementos|добавки|补剂|المكملات|सप्लीमेंट`;
const ML_THERAPY_SECTION = String.raw`terapia|farmaci|medicinali|trattamento|posologia|therapy|th[eé]rapie|therapie|medikation|терапия|治疗|العلاج|थेरेपी`;
const ML_EXAM_SECTION = String.raw`esami(?:\s+di\s+laboratorio)?|analisi(?:\s+del\s+sangue)?|sangue|bloodwork|referti|lab(?:oratory)?\s*results?|lab(?:oratory)?\s*report|exams?|examens?|an[aá]lisis(?:\s+de\s+sangre)?|resultados?\s+(?:de\s+)?laboratorio|bilan\s*sanguin|analyses?|r[eé]sultats?\s+labo|laborwerte|blutbild|laborbericht|untersuchungen|hemograma|resultados?\s+lab|an[aá]lises|анализы|анализ\s*крови|лабораторные\s*результаты|обследования|化验(?:单)?|血液检查|检验报告|实验室结果|تحاليل|فحص\s*الدم|نتائج\s*المختبر|فحوصات|प्रयोगशाला(?:\s*रिपोर्ट)?|रक्त\s*जाँच|लैब\s*परिणाम|जांच`;

function parseNutritionFromLooseText(rawText) {
  const text = String(rawText || "").replace(/\r/g, "\n");
  const gate = new RegExp(String.raw`(?:${ML_WEEKDAY_TOKEN}|${ML_MEAL_TOKEN}|avena|albumi|pollo|rice|chicken)`, "i");
  if (!gate.test(text)) return [];
  const dayRe = new RegExp(String.raw`(?:${ML_WEEKDAY_TOKEN})`, "i");
  const daySplit = new RegExp(String.raw`(?=(?:${ML_WEEKDAY_TOKEN}))`, "i");
  const mealSplit = new RegExp(String.raw`(?=(?:${ML_MEAL_TOKEN}))`, "i");
  const mealHead = new RegExp(String.raw`^(${ML_MEAL_TOKEN})\b`, "i");
  const chunks = text.split(daySplit).map((s) => s.trim()).filter(Boolean);
  const days = [];
  chunks.forEach((chunk) => {
    const dayM = chunk.match(dayRe);
    if (!dayM) return;
    const body = chunk.slice(dayM.index + dayM[0].length);
    const mealParts = body.split(mealSplit).map((s) => s.trim()).filter(Boolean);
    const meals = [];
    (mealParts.length ? mealParts : [body]).forEach((part) => {
      const mealM = part.match(mealHead);
      const mealName = mealM ? mealM[1].trim() : "Pasto";
      const foodSrc = mealM ? part.slice(mealM[0].length) : part;
      const foods = [];
      foodSrc.split(/[\n;,]+|(?=\d+\s*(?:gr|g|ml)\b)/i).forEach((bit) => {
        const item = parseFoodItem(String(bit || "").trim());
        if (item && item.name && item.name.length > 1 && !dayRe.test(item.name)) foods.push(item);
      });
      if (foods.length) meals.push({ name: mealName, meal_name: mealName, foods, items: foods });
    });
    if (meals.length) days.push({ day: dayM[0].toUpperCase(), meals });
  });
  return days;
}

// ====================================================
// 8. TEXT / CSV / DOCX FALLBACK RAW PARSER
// ====================================================

export function parseCanonicalProgramFromText(rawText, filename = "documento_importato") {
  const normalizedText = prepareImportedPlainText(rawText)
    // Do NOT split mid-line on "week N" inside load notes (X WEEK 2 REP…)
    .replace(/\s+(?=(?:settimana|sett\.?)\s+\d+)/gi, "\n")
    .replace(/\s+(?=(?:sessione|seduta|giorno|day)\s*\d+)/gi, "\n");
  const lines = normalizedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const warnings = [];
  const errors = [];

  const contentTitle = extractTitleFromText(normalizedText, filename);
  const program = {
    title: contentTitle,
    original_title: filename,
    normalized_title: contentTitle,
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
    warmup: null,
    notes: []
  };

  const warmupBlock = extractWarmupFromLines(lines);
  if (warmupBlock) program.warmup = warmupBlock;

  let currentSection = "preamble";
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

  function lineLooksLikeExercise(src) {
    const s = String(src || "");
    if (/\d+\s*(?:x|X|\*|\u00d7)\s*(?:\d+|AMRAP|MAX|EXHAUST|\S+)/i.test(s)) return true;
    if (/\d+\s*(?:serie|sets?)\b/i.test(s)) return true;
    if (/(?:^|[^\d])\d{1,2}(?:[ \t]+\d{1,2}){2,6}(?=[^\d]|$)/.test(s)) return true;
    const lower = s.toLowerCase();
    return EXERCISE_DICTIONARY.some((e) => e.keywords.some((k) => k.length >= 5 && lower.includes(k)));
  }
  const weekdayLineRe = new RegExp(String.raw`^(?:=== )?(?:${ML_WEEKDAY_TOKEN}|GIORNO\s*\d+|DAY\s*\d+)(?=\s|$|[:\-–—])`, "i");
  const mealLineRe = new RegExp(String.raw`^(${ML_MEAL_TOKEN})\s*[:=\-]?\s*(.*)`, "i");
  const nutritionSectionRe = new RegExp(String.raw`^(?:=== )?(?:${ML_NUTRITION_SECTION})(?=\s|$|[:\-–—])`, "i");
  const suppSectionRe = new RegExp(String.raw`^(?:=== )?(?:${ML_SUPP_SECTION})(?=\s|$|[:\-–—])`, "i");
  const therapySectionRe = new RegExp(String.raw`^(?:=== )?(?:${ML_THERAPY_SECTION})(?=\s|$|[:\-–—])`, "i");
  const examSectionRe = new RegExp(String.raw`^(?:=== )?(?:${ML_EXAM_SECTION})(?=\s|$|[:\-–—])`, "i");

  function lineLooksLikeNutrition(src) {
    return mealLineRe.test(String(src || "")) || /\d+\s*(?:gr|g|kcal|ml)\b/i.test(String(src || ""));
  }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // Strip markdown bullets / headings residual
    line = String(line || "").replace(/^\s*#{1,6}\s+/, "").replace(/^\s*[\*\u2022\-–—]+\s+/, "").replace(/\s[\u2013\u2014â]\s*/g, " - ").trim();
    if (!line) continue;

    if (nutritionSectionRe.test(line)
      || (currentSection === "nutrition" && weekdayLineRe.test(line))
      || (currentSection === "nutrition" && mealLineRe.test(line))) {
      if (currentSection !== "nutrition") flushCurrentSession();
      currentSection = "nutrition";
      program.nutrition.present = true;
      if (nutritionSectionRe.test(line) && !mealLineRe.test(line) && !weekdayLineRe.test(line)) continue;
    }
    if (suppSectionRe.test(line)) {
      flushCurrentSession();
      flushCurrentMeal();
      currentSection = "supplementation";
      program.supplementation.present = true;
      continue;
    }
    if (therapySectionRe.test(line)) {
      flushCurrentSession();
      flushCurrentMeal();
      currentSection = "therapy";
      program.therapy.present = true;
      continue;
    }
    if (examSectionRe.test(line)) {
      flushCurrentSession();
      flushCurrentMeal();
      currentSection = "exams";
      program.exams.present = true;
      continue;
    }
    if (/^(=== )?(allenamento|workout|training|scheda|programma|split)\b/i.test(line)) {
      flushCurrentSession();
      flushCurrentMeal();
      currentSection = "training";
      const hasInlineWork = /\d+\s*(?:x|X|\*|\u00d7)\s*\d+/.test(line) || /\b(sessione|seduta|giorno|settimana|week)\b/i.test(line);
      if (!hasInlineWork) continue;
    }

    if (currentSection === "preamble") {
      const looksLikeWeekOrSession = /^(?:settimana|week|sett\.?)\s*[:=\-]?\s*\d+|(?:giorno|day|seduta|sessione)\s*[:=\-]?\s*/i.test(line);
      const looksLikeLetterSession = /^[A-G]\s*[\)\.\-:–]\s*\S+/i.test(line);
      const looksLikeNamedSplit = /^(?:day\s*[a-g]|push|pull|legs|upper|lower|full\s*body|fullbody)\b/i.test(line);
      const weekday = /^(luned[iìÌ]|marted[iìÌ]|mercoled[iìÌ]|gioved[iìÌ]|venerd[iìÌ]|sabato|domenica)(?=\s|$|[:\-–—])/i.test(line);
      let weekdayIsWorkout = false;
      if (weekday) {
        for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
          if (lineLooksLikeNutrition(lines[j])) break;
          if (lineLooksLikeExercise(lines[j])) { weekdayIsWorkout = true; break; }
        }
      }
      if (looksLikeWeekOrSession || looksLikeLetterSession || looksLikeNamedSplit || lineLooksLikeExercise(line) || weekdayIsWorkout) {
        flushCurrentMeal();
        currentSection = "training";
      }
    }

    if (currentSection === "preamble") continue;

    if (currentSection === "nutrition") {
      const dayMatch = line.match(weekdayLineRe);
      if (dayMatch) {
        flushCurrentMeal();
        currentDayName = String(dayMatch[0] || line).replace(/^===\s*/, "").trim().toUpperCase();
        continue;
      }

      const mealMatch = line.match(mealLineRe);
      if (mealMatch) {
        flushCurrentMeal();
        currentMealName = mealMatch[1].trim();
        const inlineContent = (mealMatch[2] || "").trim();
        if (inlineContent) {
          // Support "meal: food1 100g, food2 50g"
          inlineContent.split(/[,;]+/).forEach((bit) => {
            const item = parseFoodItem(String(bit || "").trim());
            if (item && !weekdayLineRe.test(String(item.name || ""))) currentMealFoods.push(item);
          });
        }
      } else if (/^Food\tQty/i.test(line)) {
        // skip excel-like header
      } else {
        const item = parseFoodItem(line.replace(/\t/g, " "));
        if (item && !weekdayLineRe.test(String(item.name || ""))) {
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
      if (/giammaria|master xlsx|pagina\s+\d|\.xlsx|\.xls|\.pdf/i.test(name)) continue;
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
      if (item && !isJunkTherapyName(item.name || item.medication)) {
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
      // Skip table header rows
      if (/^(?:parameter|parametro|esame|valore|value|unit|unità|range|intervallo)\b/i.test(line)
        || /^\|?\s*[-:| ]+\s*\|?$/.test(line)
        || /^(?:lab|patient)\s*:/i.test(line)) {
        continue;
      }
      const record = parseExamLineRecord(line)
        || parseTherapyExamsSheet({ rawRows: [line.includes("\t") ? line.split("\t") : [line]] }).exams.records[0];
      if (record && String(record.parameter || record.name || "").trim() && String(record.value ?? "").trim()) {
        program.exams.records.push(record);
        program.exams.items.push(record);
      }
      continue;
    }

    if (currentSection === "training") {
      // Skip warmup lines (already captured on program.warmup)
      if (/^(?:riscaldamento|warm[\s-]?up)\b/i.test(line)) continue;

      const weekMatch = line.match(/^(?:settimana|week|sett\.?)\s*[:=\-]?\s*(\d+)(?:\s*[-–:]\s*(.*))?$/i);
      if (weekMatch) {
        const rest = String(weekMatch[2] || "").trim();
        // Ignore load notes mistaken as week headers: "WEEK 2 REP DI MARGINE"
        const looksLikeLoadNote = rest
          && /\b(rep|reps|kg|lbs|margine|margin|di margine)\b/i.test(rest)
          && !/\b(giorno|day|full|push|pull|upper|lower|legs|sessione|seduta|allenamento)\b/i.test(rest);
        if (!looksLikeLoadNote) {
          flushCurrentSession();
          currentWeekNum = parseInt(weekMatch[1], 10) || 1;
          currentSessionNum = 1;
          currentSessionName = "Sessione 1";
          continue;
        }
      }

      if (/^(luned[iìÌ]|marted[iìÌ]|mercoled[iìÌ]|gioved[iìÌ]|venerd[iìÌ]|sabato|domenica|monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunes|martes|montag|dienstag|lundi|mardi)(?=\s|$|[:\-–—])/i.test(line)
          && !/\d+\s*(?:x|X|\*|\u00d7)\s*\d+/.test(line)) {
        flushCurrentSession();
        currentSessionName = line.trim();
        continue;
      }
      // Common DOC headers: GIORNO 1, DAY A, ALLENAMENTO 2, SEDUTA 3, A) PUSH, Workout 1
      const sessionLead = line.match(/^(?:giorno|day|seduta|sessione|allenamento|workout|workout\s*day)\s*[:=\-]?\s*([0-9A-G]|[IVX]+)\b(?:\s*[:=\-–]\s*(.+))?/i)
        || line.match(/^([A-G])\s*[\)\.\-:–]\s*(.+)$/i)
        || line.match(/^(push|pull|legs|upper|lower|full\s*body|fullbody|petto|dorso|spalle|braccia|gambe)\b/i);
      if (sessionLead && !/\d+\s*(?:x|X|\*|\u00d7)\s*\d+/.test(line)) {
        const isLetterHead = /^[A-G]\s*[\)\.\-:–]/i.test(line);
        const isDayTokenHead = /^(?:giorno|day|seduta|sessione|allenamento|workout)\b/i.test(line);
        // Letter heads (A) Petto) and day tokens win even if muscle keywords match the dictionary
        if (isLetterHead || isDayTokenHead || !lineLooksLikeExercise(line)) {
          flushCurrentSession();
          currentSessionName = line.trim();
          continue;
        }
      }

      function pushTrainingExercise(exLine) {
        const stripped = String(exLine || "")
          .replace(/^(?:giorno|day|seduta|sessione)\s*[:=\-]?\s*\d+\s*[-–:]\s*/i, "")
          .replace(/^[\-\u2013\u2022*]+\s*/, "")
          .trim();
        const src = stripped || exLine;
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/.test(src) || ((src.match(/[A-Za-zÀ-ÿ]/g) || []).length < 3)) return;
        const cleanExName = src
          .replace(/:\s*[\d].*$/, "")
          .replace(/\d+\s*(?:x|X|\*|\u00d7)\s*[\S]+.*$/i, "")
          .replace(/\d+(?:\s*[\-\u2013\/]\s*\d+){2,}.*$/i, "")
          .replace(/(?:^|\s)\d{1,2}(?:[ \t]+\d{1,2}){2,6}(?=[^\d]|$).*$/i, "")
          .replace(/#\s*\d+\b/g, " ")
          .replace(/[:\-\s|]+$/, "")
          .trim() || src;
        if (/^(times new roman|arial|tahoma|symbol|root entry|normal)$/i.test(cleanExName)) return;
        // Junk fragments from load notes exploded as fake exercises
        if (/^(?:\d+(?:[.,]\d+)?\s*kg|kg\b|[+\-]\s*\d)/i.test(cleanExName) && cleanExName.length < 24) return;
        if (((cleanExName.match(/[A-Za-zÀ-ÿ]/g) || []).length < 3)) return;
        const normalizedEx = normalizeExerciseName(cleanExName);
        const details = parseExerciseDetails(src);
        const lit = parseLiteralScheme(src);
        const techNotes = details.technique
          ? (details.notes || details.technique.replace(/_/g, " "))
          : null;
        const weeklySchemes = (lit && lit.weekly_schemes) || null;
        const exObj = {
          id: `e_${currentWeekNum}_${currentSessionNum}_${currentExercises.length + 1}`,
          name: normalizedEx.name_normalized,
          name_original: normalizedEx.name_original,
          name_normalized: normalizedEx.name_normalized,
          muscle_group: normalizedEx.muscle,
          muscle_groups: normalizedEx.muscles,
          mappingConfidence: normalizedEx.confidence,
          mappingSource: normalizedEx.confidence >= 0.9 ? 'dictionary' : 'raw',
          sets_count: (lit && lit.sets) || details.sets,
          reps_target: (lit && lit.reps) || details.reps,
          reps_raw: (lit && lit.raw) || details.reps_raw,
          scheme: lit ? lit.raw : null,
          weekly_schemes: weeklySchemes,
          progression_weeks: weeklySchemes ? weeklySchemes.length : null,
          rir_target: details.rir,
          rpe_target: details.rpe,
          percentage_1rm: details.percentage_1rm,
          rest_seconds: details.rest_seconds,
          load_target: details.load,
          notes: techNotes,
          intensity_techniques: details.techniques || [],
          sets_inferred: lit ? false : !!details.sets_inferred,
          sets_data: Array.from({ length: (lit && lit.sets) || details.sets }, (_, sIdx) => {
            const total = (lit && lit.sets) || details.sets;
            const isLast = sIdx === total - 1;
            const drop = ((lit && lit.technique) || details.technique) === "drop_set" && isLast;
            const repsVal = (details.reps_pattern && details.reps_pattern[sIdx]) || (lit && lit.reps) || details.reps;
            return {
              set_number: sIdx + 1,
              order: sIdx + 1,
              set_type: drop ? "dropset" : "working",
              technique: drop ? "drop_set" : null,
              target_load: details.load_value,
              load: details.load_value,
              reps: repsVal,
              target_reps: repsVal,
              target_rir: details.rir,
              rir: details.rir,
              target_rpe: details.rpe,
              rpe: details.rpe,
              rest_seconds: details.rest_seconds
            };
          })
        };
        if (weeklySchemes) {
          exObj.prescription = {
            sets: lit.sets,
            reps: lit.reps,
            raw: lit.raw,
            source: 'weekly_scheme_ladder',
            weekly_schemes: weeklySchemes
          };
        }
        enforceExercisePrescription(exObj, lit ? {
          sets: lit.sets,
          reps: lit.reps,
          raw: lit.raw,
          technique: lit.technique,
          source: lit.source || 'line_literal',
          reps_pattern: lit.reps_pattern || details.reps_pattern || null,
          weekly_schemes: weeklySchemes
        } : null);
        currentExercises.push(exObj);
      }

      function explodeMultiSchemeLine(src) {
        const s = String(src || "");
        if (parseWeeklySchemeLadder(s)) return [s];
        // Keep compound schemes intact: 2x15+1x10 / 2x12 + 1x8 / 3x10 e 1x8
        if (parseCompoundSchemes(s)) return [s];
        const re = /(\d{1,2})\s*[xX*\u00d7]\s*(?:\d+(?:[\-\u2013\/]\d+)*|AMRAP|MAX|EXHAUST)/gi;
        const matches = [...s.matchAll(re)];
        if (matches.length <= 1) return [s];
        // Ignore trailing "2,5X WEEK" style load notes (decimal × word) — not a second exercise
        const real = matches.filter((m) => {
          const after = s.slice(m.index + m[0].length, m.index + m[0].length + 12);
          if (/^\s*(?:week|sett|kg|lbs)\b/i.test(after)) return false;
          const before = s.slice(Math.max(0, m.index - 3), m.index);
          if (/,\d*$/.test(before) || /\d,$/.test(before)) return false; // European decimal 2,5X
          return true;
        });
        if (real.length <= 1) return [s];
        const out = [];
        for (let i = 0; i < real.length; i++) {
          const prevEnd = i === 0 ? 0 : (real[i - 1].index + real[i - 1][0].length);
          const end = real[i].index + real[i][0].length;
          const between = i === 0 ? "" : s.slice(prevEnd, real[i].index);
          if (i > 0 && (/^\s*[+\/|,;\-\u2013]\s*$/.test(between) || /^\s*(?:e|poi|then|and)\s*$/i.test(between))) {
            continue;
          }
          const chunk = s.slice(prevEnd, end).replace(/^[\s,;|\-–]+/, "").trim();
          if (chunk && isExerciseLike(chunk)) out.push(chunk);
        }
        if (out.length < real.length && (parseCompoundSchemes(s) || parseWeeklySchemeLadder(s))) return [s];
        return out.length ? out : [s];
      }

      function isExerciseLike(part) {
        const p = String(part || "");
        if (/\d+\s*(?:x|X|\*|\u00d7)\s*(?:\d+|AMRAP|MAX|EXHAUST|[A-Za-z0-9][\w'’\-]*)/i.test(p)) return true;
        if (/\d+\s*(?:serie|sets?)\b/i.test(p)) return true;
        if (/\d+(?:\s*[\-\u2013\/]\s*\d+){2,}/.test(p)) return true;
        if (/(?:^|[^\d])\d{1,2}(?:[ \t]+\d{1,2}){2,6}(?=[^\d]|$)/.test(p)) return true;
        if (/^[\-\u2013\u2022*]\s*[A-Za-zÀ-ÿ]/.test(p)) return true;
        return EXERCISE_DICTIONARY.some(e => e.keywords.some(k => k.length >= 5 && p.toLowerCase().includes(k)));
      }

      const sessionInlineLead = line.match(/^(?:giorno|day|seduta|sessione)\s*[:=\-]?\s*[0-9a-zA-Z\s]*?(?:\s*[-–:]\s+|\s+)(?=[A-Za-zÀ-ÿ])/i);
      let workLine = line;
      if (sessionInlineLead && (isExerciseLike(line) || /\t/.test(line))) {
        flushCurrentSession();
        currentSessionName = sessionInlineLead[0].replace(/[-–:\s]+$/, "").trim() || line.trim();
        workLine = line.slice(sessionInlineLead[0].length).replace(/^\t+/, "").trim();
      }

      const multi = explodeMultiSchemeLine(workLine);
      if (multi.length > 1) {
        multi.forEach(pushTrainingExercise);
        continue;
      }

      const chunks = workLine.split(/\s*[,;]\s+(?=[A-Za-zÀ-ÿ])/).map(s => s.trim()).filter(Boolean);
      const exerciseChunks = chunks.filter(isExerciseLike);
      if (exerciseChunks.length >= 1 && (exerciseChunks.length > 1 || sessionInlineLead)) {
        exerciseChunks.forEach(pushTrainingExercise);
        continue;
      }

      const dayMatch = line.match(/^(?:giorno|day|seduta|sessione|bonus)\s*[:=\-]?\s*([0-9a-zA-Z\s\-_]+)/i);
      if (dayMatch && !/\d+\s*[xX*\u00d7]/.test(line) && !line.includes("kg")) {
        flushCurrentSession();
        currentSessionName = line.trim();
        continue;
      }

      if (isExerciseLike(line) || isExerciseLike(workLine)) {
        pushTrainingExercise(workLine || line);
      }
    }
  }

  flushCurrentSession();
  flushCurrentMeal();

  if (nutritionDaysMap.size === 0) {
    parseNutritionFromLooseText(normalizedText).forEach((day) => {
      nutritionDaysMap.set(day.day, day.meals);
    });
  }

  applyStructuredTextSections(program, normalizedText);
  program.therapy.medications = (program.therapy.medications || []).filter((m) => !isJunkTherapyName(m.name || m.medication));
  if (program.therapy.medications.length) program.therapy.present = true;
  enrichTherapyMedications(program.therapy);
  program.supplementation.items = (program.supplementation.items || []).filter((it) => !/giammaria|master xlsx|pagina\s+\d|\.xlsx|\.xls|\.pdf/i.test(String(it.name || "")));

  if (!(program.nutrition.days || []).length && nutritionDaysMap.size) {
    program.nutrition.present = true;
    program.nutrition.days = Array.from(nutritionDaysMap.entries()).map(([dName, meals]) => ({
      day: dName,
      day_name: dName,
      meals
    }));
  }
  if ((program.nutrition.days || []).length) {
    enrichNutritionMacros(program.nutrition);
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
  } else if (program.nutrition.days.length || program.supplementation.items.length || program.therapy.medications.length) {
    program.weeks = [];
  } else {
    program.weeks = [{
      week_number: 1,
      weekNumber: 1,
      week: 1,
      label: "Settimana 1",
      sessions: [],
      days: []
    }];
  }

  program.training = { weeks: program.weeks };
  program.duration_weeks = program.weeks.length;
  program.training_frequency = program.weeks[0]?.sessions?.length || 3;

  // Declared duration from title / weekly ladders (FULL BODY 10/12 → 12 weeks of the same 3 days)
  const inferredWeeks = inferProgramDurationFromText(normalizedText, filename);
  if (inferredWeeks && inferredWeeks > program.weeks.length) {
    expandProgramToDeclaredDuration(program, inferredWeeks);
  } else if (inferredWeeks) {
    program.duration_weeks = Math.max(program.duration_weeks || 0, inferredWeeks);
  }

  // Lock literal NxM from the source text (infallible) before stats
  try {
    applyPrescriptionsToProgram(program, rawText);
    enforceAllPrescriptions(program);
  } catch (_) {}

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

export function validateCanonicalProgram(candidate) {
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
    issues: typeof validateDocumentSemantics === "function" ? validateDocumentSemantics(candidate) : [],
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
// 10. DOCUMENT EXTRACTION ROUTER (PDF / DOCX / DOC / text)
// Browser-safe extractors — no Node fs/mammoth required at call time.
// ====================================================

function toU8(buffer) {
  if (!buffer) return new Uint8Array();
  if (buffer instanceof Uint8Array) return buffer;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(buffer)) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);
  if (ArrayBuffer.isView(buffer)) return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return new Uint8Array(buffer);
}

function latin1FromBytes(u8) {
  let s = "";
  const step = 0x8000;
  for (let i = 0; i < u8.length; i += step) {
    const end = Math.min(i + step, u8.length);
    s += String.fromCharCode.apply(null, u8.subarray(i, end));
  }
  return s;
}

function unescapePdfLiteral(s) {
  return String(s || "")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function extractPdfPositionedText(src) {
  const items = [];
  const stack = [{ ox: 0, oy: 0 }];
  let x = 0;
  let y = 0;
  const re = /\bq\b|\bQ\b|(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+cm|(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm|(-?[\d.]+)\s+(-?[\d.]+)\s+Td|\(((?:\\.|[^\\)])*)\)\s*Tj|T\*/g;
  let m;
  while ((m = re.exec(src))) {
    const tok = m[0];
    if (tok === "q") {
      const top = stack[stack.length - 1];
      stack.push({ ox: top.ox, oy: top.oy });
      continue;
    }
    if (tok === "Q") {
      if (stack.length > 1) stack.pop();
      continue;
    }
    if (/cm$/.test(tok) && m[1] != null) {
      const top = stack[stack.length - 1];
      top.ox += parseFloat(m[5]);
      top.oy += parseFloat(m[6]);
      continue;
    }
    if (/Tm$/.test(tok) && m[7] != null) {
      const top = stack[stack.length - 1];
      x = top.ox + parseFloat(m[11]);
      y = top.oy + parseFloat(m[12]);
      continue;
    }
    if (/Td$/.test(tok) && m[13] != null) {
      x += parseFloat(m[13]);
      y += parseFloat(m[14]);
      continue;
    }
    if (tok === "T*") {
      y -= 10;
      continue;
    }
    if (m[15] != null) {
      const text = unescapePdfLiteral(m[15]).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ").trim();
      if (text) items.push({ x, y, text });
    }
  }
  if (!items.length) return "";
  items.sort((a, b) => (b.y - a.y) || (a.x - b.x));
  const rows = [];
  const tol = 4;
  items.forEach((it) => {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.y - it.y) <= tol) last.cells.push(it);
    else rows.push({ y: it.y, cells: [it] });
  });
  return rows.map((r) => {
    r.cells.sort((a, b) => a.x - b.x);
    return r.cells.map((c) => c.text).join("\t");
  }).join("\n");
}

function prepareImportedPlainText(raw) {
  return String(raw || "")
    .replace(/[\u0001\u0002]/g, " - ")
    .replace(/(^|\n)\s*(?:\d+\.\s*)?(TERAPIA|ALIMENTAZIONE|NUTRIZIONE|INTEGRAZIONE|ALLENAMENTO)\b(?!\s*\/)/gi, "$1\n=== $2\n")
    .replace(/(^|\n)\s*#{1,6}\s*(TERAPIA|ALIMENTAZIONE|NUTRIZIONE|INTEGRAZIONE|ALLENAMENTO|TRAINING|WORKOUT|SCHEDA|DIETA|SUPPLEMENTS?)\b/gi, "$1\n=== $2\n")
    // Only split true week headers — NOT notes like "+2,5KG X WEEK 2 REP DI MARGINE"
    .replace(/(^|[.\n;:])\s*((?:SETTIMANA|WEEK|SETT\.?)\s+\d+)\b/gi, "$1\n$2")
    .split(/\n/)
    .map((line) => {
      let l = String(line || "").replace(/^\s*#{1,6}\s+/, "").replace(/^\s*[\*\u2022\-–—]+\s+/, "").trim();
      if (/\t/.test(l)) return l;
      return l
        .replace(/\b(PASTO\s*\d+)\b/gi, "\n$1")
        .replace(/\b(GIORNO\s*\d+|DAY\s*\d+)\b/gi, "\n$1");
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

/** Infer declared program length from title/body/weekly ladders (e.g. FULL BODY 10/12 SETTIMANE → 12). */
export function inferProgramDurationFromText(text, filename = "") {
  const blob = `${filename || ""}\n${text || ""}`;
  let best = 0;
  const slash = blob.match(/(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*settiman/i);
  if (slash) best = Math.max(best, parseInt(slash[1], 10) || 0, parseInt(slash[2], 10) || 0);
  const single = blob.match(/(?:programmazione|programma|full\s*body|scheda|ciclo|mesociclo)?.{0,48}?(\d{1,2})\s*settiman/i);
  if (single) best = Math.max(best, parseInt(single[1], 10) || 0);
  // Duration forms only: "12 weeks" / "weeks: 12" — NOT "WEEK 2" headers or "X WEEK 2" load notes
  const weeksAfterNum = blob.match(/\b(\d{1,2})\s*(?:weeks?|settimane?)\b/i);
  if (weeksAfterNum) best = Math.max(best, parseInt(weeksAfterNum[1], 10) || 0);
  const weeksAssigned = blob.match(/\b(?:weeks?|settimane?)\s*[:=\-]\s*(\d{1,2})\b/i);
  if (weeksAssigned) best = Math.max(best, parseInt(weeksAssigned[1], 10) || 0);
  // Longest weekly NxM ladder in document
  String(text || "").split(/\r?\n/).forEach((line) => {
    const ladder = parseWeeklySchemeLadder(line);
    if (ladder && ladder.week_count >= 4) best = Math.max(best, ladder.week_count);
  });
  if (!best || best < 1) return null;
  return Math.min(52, best);
}

/** Expand a 1-week (or short) day-template program to declared duration, applying weekly schemes. */
export function expandProgramToDeclaredDuration(program, targetWeeks) {
  if (!program || !Array.isArray(program.weeks) || !program.weeks.length) return program;
  const target = Math.min(52, Math.max(1, parseInt(targetWeeks, 10) || 1));
  if (program.weeks.length >= target) {
    program.duration_weeks = program.weeks.length;
    return program;
  }
  const template = JSON.parse(JSON.stringify(program.weeks[0]));
  const out = [];
  for (let wi = 0; wi < target; wi++) {
    const copy = JSON.parse(JSON.stringify(template));
    const wNum = wi + 1;
    copy.week_number = wNum;
    copy.weekNumber = wNum;
    copy.week = wNum;
    copy.label = `Settimana ${wNum}`;
    (copy.sessions || copy.days || []).forEach((sess) => {
      (sess.exercises || sess.rows || []).forEach((ex) => {
        const schemes = ex.weekly_schemes || (ex.prescription && ex.prescription.weekly_schemes) || null;
        if (Array.isArray(schemes) && schemes[wi]) {
          const sch = schemes[wi];
          ex.sets_count = sch.sets;
          ex.sets = sch.sets;
          ex.reps_target = sch.reps;
          ex.reps = sch.reps;
          ex.scheme = sch.raw;
          if (ex.prescription) {
            ex.prescription.sets = sch.sets;
            ex.prescription.reps = sch.reps;
            ex.prescription.raw = sch.raw;
          }
          try { enforceExercisePrescription(ex); } catch (_) {}
        }
      });
    });
    out.push(copy);
  }
  program.weeks = out;
  program.training = { weeks: out };
  program.duration_weeks = out.length;
  return program;
}

function extractWarmupFromLines(lines) {
  const items = [];
  let label = "Riscaldamento";
  for (const line of lines) {
    const m = String(line || "").match(/^(?:riscaldamento|warm[\s-]?up|warm\s*up)\s*[:\-–]?\s*(.+)$/i);
    if (!m) continue;
    const body = m[1].trim();
    body.split(/\s*\/\s*|\s*[•·|]\s*/).map((p) => p.trim()).filter(Boolean).forEach((part) => {
      const lit = parseLiteralScheme(part);
      const name = part
        .replace(/\d+\s*[xX*\u00d7]\s*\S+/g, " ")
        .replace(/\d+\s*['']?\s*(?:min|sec|s)?/gi, " ")
        .replace(/\s{2,}/g, " ")
        .trim() || part;
      items.push({
        name,
        scheme: lit ? lit.raw : null,
        sets_count: lit ? lit.sets : null,
        reps_target: lit ? lit.reps : null,
        notes: part
      });
    });
    break;
  }
  if (!items.length) return null;
  return { present: true, label, items, format: "warmup_block" };
}

function extractTitleFromText(text, filename) {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 12);
  for (const line of lines) {
    if (/^(riscaldamento|warm|giorno|day|===)/i.test(line)) continue;
    if (/\d+\s*[xX*\u00d7]\s*\d/.test(line) && !/settiman/i.test(line)) continue;
    if (/full\s*body|settiman|programma|scheda|mesociclo|ipertrof|forza/i.test(line) || line.length >= 8) {
      if (line.length <= 80) return line.replace(/\s+/g, " ").trim();
    }
  }
  return String(filename || "").replace(/\.[^/.]+$/, "").replace(/[_\-]+/g, " ").trim() || "Programma importato";
}

function splitProgramSections(text) {
  const out = { therapy: "", nutrition: "", supplementation: "", training: "" };
  const parts = String(text || "").split(/\n===\s*/);
  parts.forEach((p) => {
    const m = p.match(/^(TERAPIA|ALIMENTAZIONE|NUTRIZIONE|INTEGRAZIONE|ALLENAMENTO)\b([\s\S]*)/i);
    if (!m) return;
    const key = ({ terapia: "therapy", alimentazione: "nutrition", nutrizione: "nutrition", integrazione: "supplementation", allenamento: "training" })[m[1].toLowerCase()];
    if (key) out[key] += m[2];
  });
  return out;
}

function textToSheetRows(text) {
  return String(text || "").split(/\r?\n/).map((line) => {
    const cells = line.split(/\t| {2,}/).map((c) => c.trim()).filter((c, i, arr) => c || arr.length > 1);
    return cells.length ? cells : [line.trim()];
  }).filter((row) => row.some((c) => String(c || "").trim()));
}

function applyStructuredTextSections(program, rawText) {
  const prepared = /\n===\s*(TERAPIA|ALIMENTAZIONE|INTEGRAZIONE|ALLENAMENTO)\b/i.test(String(rawText || "")) ? rawText : prepareImportedPlainText(rawText);
  const sections = splitProgramSections(prepared);
  if (sections.therapy && sections.therapy.length > 12) {
    const th = parseTherapyExamsSheet({ name: "TERAPIA", rawRows: textToSheetRows(sections.therapy) });
    if ((th.therapy.medications || []).length) {
      th.therapy.medications = th.therapy.medications.filter((m) => !isJunkTherapyName(m.name || m.medication));
      if (th.therapy.medications.length) {
        program.therapy = th.therapy;
        program.therapy.present = true;
      }
    }
  }
  if (sections.nutrition && sections.nutrition.length > 12) {
    const nutrSheet = parseNutritionSheet({ name: "ALIMENTAZIONE", rawRows: textToSheetRows(sections.nutrition) });
    const loose = parseNutritionFromLooseText(sections.nutrition);
    const sheetDays = nutrSheet && nutrSheet.days ? nutrSheet.days : [];
    const uniqueSheet = new Set(sheetDays.map((d) => String(d.day || d.day_name || "").toUpperCase().replace(/[ÌÍ]/g, "I"))).size;
    const best = uniqueSheet >= 4 ? sheetDays : (sheetDays.length >= loose.length ? sheetDays : loose.map((d) => ({ day: d.day, day_name: d.day, meals: d.meals })));
    if (best.length) {
      const merged = [];
      const byDay = new Map();
      best.forEach((d) => {
        const key = String(d.day || d.day_name || "").toUpperCase().replace(/[ÌÍ]/g, "I");
        if (!key || /^(PASTO|MEAL)\b/i.test(key)) return;
        if (!byDay.has(key)) {
          byDay.set(key, { day: d.day || d.day_name, day_name: d.day || d.day_name, meals: [] });
          merged.push(byDay.get(key));
        }
        (d.meals || []).forEach((m) => byDay.get(key).meals.push(m));
      });
      merged.forEach((d) => {
        const byMeal = new Map();
        (d.meals || []).forEach((m) => {
          const mk = String(m.name || m.meal_name || "Pasto").toUpperCase();
          if (!byMeal.has(mk)) byMeal.set(mk, { name: m.name || m.meal_name, meal_name: m.name || m.meal_name, foods: [], items: [] });
          const tgt = byMeal.get(mk);
          (m.foods || m.items || []).forEach((f) => {
            const fn = String(f.name || f.food || "");
            if (!fn || /^(luned|marted|mercoled|gioved|venerd|sabato|domenica)/i.test(fn)) return;
            if (tgt.foods.some((x) => String(x.name || x.food || "").toLowerCase() === fn.toLowerCase())) return;
            tgt.foods.push(f);
          });
          tgt.items = tgt.foods;
        });
        d.meals = Array.from(byMeal.values()).filter((m) => (m.foods || []).length);
      });
      program.nutrition = { present: true, days: merged.filter((d) => (d.meals || []).length), notes: (nutrSheet && nutrSheet.notes) || [] };
    }
  }
  if (sections.supplementation && sections.supplementation.length > 8) {
    const sup = parseSupplementationSheet({ name: "INTEGRAZIONE", rawRows: textToSheetRows(sections.supplementation) });
    if ((sup.items || []).length) {
      sup.items = (sup.items || []).filter((it) => {
        const n = String(it.name || "").replace(/\t/g, " ").trim();
        it.name = n.split(/\s{2,}|\t/)[0] || n;
        return it.name.length >= 3 && !/^(colazione|pranzo|cena|spuntino|merenda|timing|posologia)$/i.test(it.name) && !/giammaria|master xlsx|pagina\s+\d|\.xlsx|\.xls|\.pdf/i.test(n);
      });
      if (sup.items.length) {
        program.supplementation = sup;
        program.supplementation.present = true;
      }
    }
  }
  return program;
}

function extractPdfTjFromString(raw) {
  const parts = [];
  // Preserve line breaks from T* / Td / Tm while collecting Tj/TJ text
  const tokenRe = /T\*|(-?[\d.]+)\s+(-?[\d.]+)\s+Td|\(((?:\\.|[^\\)])*)\)\s*Tj|\[([\s\S]*?)\]\s*TJ/g;
  let m;
  while ((m = tokenRe.exec(raw))) {
    if (m[0] === 'T*') {
      parts.push('\n');
      continue;
    }
    if (m[1] != null && m[2] != null && /Td$/.test(m[0])) {
      const dy = parseFloat(m[2]);
      if (Math.abs(dy) >= 8) parts.push('\n');
      else parts.push(' ');
      continue;
    }
    if (m[3] != null) {
      parts.push(unescapePdfLiteral(m[3]));
      continue;
    }
    if (m[4] != null) {
      const strRe = /\(((?:\\.|[^\\)])*)\)/g;
      let sm;
      while ((sm = strRe.exec(m[4]))) parts.push(unescapePdfLiteral(sm[1]));
    }
  }
  if (!parts.length) {
    const tjRe = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
    while ((m = tjRe.exec(raw))) parts.push(unescapePdfLiteral(m[1]));
  }
  return parts.join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function asciiRunsFromPdf(raw) {
  const runs = raw.match(/[\x20-\x7E\u00A0-\u00FF]{8,}/g) || [];
  return runs
    .filter((r) => /[A-Za-zÀ-ÿ]{4,}/.test(r) && !/^%PDF/.test(r) && !/\/(Type|Font|Length|Filter|Root|Pages|Resources)\b/.test(r) && !/\b(endobj|endstream|xref|startxref)\b/.test(r))
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

async function inflateZlibBytes(u8) {
  if (typeof DecompressionStream !== "undefined") {
    const ds = new DecompressionStream("deflate");
    const ab = await new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer();
    return new Uint8Array(ab);
  }
  const zlibMod = await import("node:zlib");
  const inflated = zlibMod.inflateSync(typeof Buffer !== "undefined" ? Buffer.from(u8) : u8);
  return new Uint8Array(inflated.buffer, inflated.byteOffset, inflated.byteLength);
}

async function inflateZlibOrRaw(payload) {
  try { return await inflateZlibBytes(payload); } catch (_) {}
  return await inflateRawBytes(payload);
}

function decodeAscii85(latin1) {
  let s = String(latin1 || "").replace(/\s+/g, "");
  if (s.slice(0, 2) === "<~") s = s.slice(2);
  const term = s.indexOf("~>");
  if (term >= 0) s = s.slice(0, term);
  const out = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === "z") {
      out.push(0, 0, 0, 0);
      i++;
      continue;
    }
    const take = Math.min(5, s.length - i);
    let n = 0;
    for (let k = 0; k < take; k++) n = n * 85 + (s.charCodeAt(i + k) - 33);
    for (let k = take; k < 5; k++) n = n * 85 + 84;
    const bytes = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
    const nbytes = take - 1;
    for (let k = 0; k < nbytes; k++) out.push(bytes[k]);
    i += take;
  }
  return Uint8Array.from(out);
}

async function inflateAllPdfFlateStreams(u8, raw) {
  const chunks = [];
  let from = 0;
  while (from < raw.length) {
    const idx = raw.indexOf("stream", from);
    if (idx < 0) break;
    if (idx >= 3 && raw.slice(idx - 3, idx + 6) === "endstream") {
      from = idx + 6;
      continue;
    }
    const prev = idx > 0 ? raw.charCodeAt(idx - 1) : 0;
    if ((prev >= 65 && prev <= 90) || (prev >= 97 && prev <= 122)) {
      from = idx + 6;
      continue;
    }
    from = idx + 6;
    const look = raw.slice(Math.max(0, idx - 1200), idx);
    if (!/\/FlateDecode\b/.test(look)) continue;
    let start = idx + 6;
    if (raw[start] === "\r") start++;
    if (raw[start] === "\n") start++;
    const end = raw.indexOf("endstream", start);
    if (end < 0) continue;
    let payload = u8.subarray(start, end);
    while (payload.length && (payload[payload.length - 1] === 10 || payload[payload.length - 1] === 13)) {
      payload = payload.subarray(0, payload.length - 1);
    }
    try {
      if (/\/ASCII85Decode\b/.test(look)) payload = decodeAscii85(latin1FromBytes(payload));
      chunks.push(latin1FromBytes(await inflateZlibOrRaw(payload)));
    } catch (_) {}
  }
  return chunks;
}

function parsePdfToUnicodeCMap(text) {
  const map = Object.create(null);
  const region = String(text || "");
  const start = region.indexOf("beginbfchar");
  const end = region.indexOf("endbfchar");
  const slice = start >= 0 && end > start ? region.slice(start, end) : "";
  const re = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
  let m;
  while ((m = re.exec(slice))) {
    const src = String(m[1] || "").toLowerCase();
    const dst = String(m[2] || "");
    if (!src || src.length > 4) continue;
    const uni = parseInt(dst.slice(-4), 16);
    if (uni) map[src.padStart(2, "0")] = String.fromCharCode(uni);
  }
  return map;
}

function decodePdfHexWithCMap(hex, cmap) {
  const h = String(hex || "").replace(/\s/g, "");
  if (h.length < 2 || h.length % 2) return "";
  let out = "";
  const pair = (h.length % 4 === 0 && h.length >= 8 && !cmap[h.slice(0, 2)]) ? 4 : 2;
  for (let i = 0; i + pair <= h.length; i += pair) {
    const g = h.slice(i, i + pair).toLowerCase();
    if (cmap[g]) out += cmap[g];
    else if (cmap[g.slice(-2)]) out += cmap[g.slice(-2)];
    else {
      const code = parseInt(g, 16);
      if (code >= 32 && code < 0xfffe) out += String.fromCharCode(code);
    }
  }
  return out;
}

export function extractPdfPlainText(buffer) {
  const u8 = toU8(buffer);
  const raw = latin1FromBytes(u8);
  let text = extractPdfTjFromString(raw);
  if (text.length < 24) text = asciiRunsFromPdf(raw);
  return text;
}

export async function extractPdfPlainTextAsync(buffer) {
  const u8 = toU8(buffer);
  const raw = latin1FromBytes(u8);
  let text = extractPdfTjFromString(raw);
  let chunkCount = 0;
  let contentChunks = 0;
  try {
    const chunks = await inflateAllPdfFlateStreams(u8, raw);
    chunkCount = chunks.length;
    const cmap = Object.create(null);
    chunks.forEach((c) => {
      if (/beginbfchar|begincmap/.test(c)) Object.assign(cmap, parsePdfToUnicodeCMap(c));
    });
    const parts = [];
    let positioned = "";
    chunks.forEach((c) => {
      if (/glyf|fpgm|\bcvt /.test(c) || /beginbfchar|begincmap|CIDInit/.test(c)) return;
      contentChunks++;
      const pos = extractPdfPositionedText(c);
      if (pos) positioned += pos + "\n";
      const tj = extractPdfTjFromString(c);
      if (tj) parts.push(tj);
      const hexRe = /<([0-9A-Fa-f\s]{2,})>/g;
      let hm;
      while ((hm = hexRe.exec(c))) {
        const decoded = decodePdfHexWithCMap(hm[1], cmap);
        if (/[A-Za-zÀ-ÿ]{3,}/.test(decoded)) parts.push(decoded);
      }
    });
    if (positioned && (/TERAPIA|ALIMENTAZIONE|ALLENAMENTO|avena|LUNED|PASTO/i.test(positioned) || (positioned.match(/\n/g) || []).length > 8)) {
      text = positioned;
    } else {
      const joined = parts.join(" ").replace(/[ \t]+/g, " ").trim();
      if (joined.length > text.length) text = joined;
    }
    if (text.length < 24) {
      const ascii = chunks.filter((c) => !/glyf|fpgm|begincmap|CIDInit|beginbfchar/.test(c)).map(asciiRunsFromPdf).join("\n");
      if (ascii.length > text.length) text = ascii;
    }
  } catch (_) {}
  if (text.length < 24) text = asciiRunsFromPdf(raw);
  return text;
}

function zipReadU16(u8, off) {
  return u8[off] | (u8[off + 1] << 8);
}
function zipReadU32(u8, off) {
  return (u8[off] | (u8[off + 1] << 8) | (u8[off + 2] << 16) | (u8[off + 3] << 24)) >>> 0;
}

async function inflateRawBytes(u8) {
  try {
    if (typeof DecompressionStream !== "undefined") {
      const ds = new DecompressionStream("deflate-raw");
      const ab = await new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer();
      if (ab && ab.byteLength) return new Uint8Array(ab);
    }
  } catch (_) {}
  try {
    const zlibMod = await import("node:zlib");
    const inflated = zlibMod.inflateRawSync(typeof Buffer !== "undefined" ? Buffer.from(u8) : u8);
    return new Uint8Array(inflated.buffer, inflated.byteOffset, inflated.byteLength);
  } catch (_) {
    return new Uint8Array(0);
  }
}

function readZipCentralEntries(u8) {
  let eocd = -1;
  const min = Math.max(0, u8.length - 22 - 65535);
  for (let i = u8.length - 22; i >= min; i--) {
    if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x05 && u8[i + 3] === 0x06) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return [];
  const cdSize = zipReadU32(u8, eocd + 12);
  const cdOff = zipReadU32(u8, eocd + 16);
  const entries = [];
  let p = cdOff;
  const end = Math.min(u8.length, cdOff + cdSize);
  while (p + 46 <= end) {
    if (u8[p] !== 0x50 || u8[p + 1] !== 0x4b || u8[p + 2] !== 0x01 || u8[p + 3] !== 0x02) break;
    const method = zipReadU16(u8, p + 10);
    const comp = zipReadU32(u8, p + 20);
    const nameLen = zipReadU16(u8, p + 28);
    const extraLen = zipReadU16(u8, p + 30);
    const commentLen = zipReadU16(u8, p + 32);
    const localOff = zipReadU32(u8, p + 42);
    const name = latin1FromBytes(u8.subarray(p + 46, p + 46 + nameLen)).replace(/\\/g, "/");
    entries.push({ name, method, comp, localOff });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function xmlToPlainText(xmlStr) {
  return String(xmlStr || "")
    .replace(/<\/w:tc>/g, "\t")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:br\b[^>]*\/?>/g, "\n")
    .replace(/<w:tab\b[^>]*\/?>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\t{2,}/g, "\t")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractDocxPlainText(buffer) {
  const u8 = toU8(buffer);
  const texts = [];
  const wanted = /^word\/document\.xml$/i;
  async function inflateZipFile(localOff, method, comp) {
    if (localOff + 30 > u8.length) return null;
    const nameLen = zipReadU16(u8, localOff + 26);
    const extraLen = zipReadU16(u8, localOff + 28);
    const dataStart = localOff + 30 + nameLen + extraLen;
    try {
      if (method === 8) {
        if (comp && dataStart + comp <= u8.length) return await inflateRawBytes(u8.subarray(dataStart, dataStart + comp));
        return await inflateRawBytes(u8.subarray(dataStart));
      }
      if (method === 0 && comp && dataStart + comp <= u8.length) return u8.subarray(dataStart, dataStart + comp);
    } catch (_) {}
    return null;
  }
  const central = readZipCentralEntries(u8);
  for (const ent of central) {
    if (!wanted.test(ent.name)) continue;
    const xmlBytes = await inflateZipFile(ent.localOff, ent.method, ent.comp);
    if (!xmlBytes || !xmlBytes.length) continue;
    const plain = xmlToPlainText(new TextDecoder("utf-8").decode(xmlBytes));
    if (plain) texts.push(plain);
  }
  if (!texts.length) {
    for (let i = 0; i < u8.length - 30; i++) {
      if (u8[i] !== 0x50 || u8[i + 1] !== 0x4b || u8[i + 2] !== 0x03 || u8[i + 3] !== 0x04) continue;
      const flags = zipReadU16(u8, i + 6);
      const method = zipReadU16(u8, i + 8);
      let compSize = zipReadU32(u8, i + 18);
      const nameLen = zipReadU16(u8, i + 26);
      const extraLen = zipReadU16(u8, i + 28);
      const nameStart = i + 30;
      if (nameStart + nameLen > u8.length) continue;
      const name = latin1FromBytes(u8.subarray(nameStart, nameStart + nameLen)).replace(/\\/g, "/");
      const dataStart = nameStart + nameLen + extraLen;
      if (!wanted.test(name)) continue;
      let xmlBytes = null;
      try {
        if (method === 8) {
          if ((flags & 8) || !compSize) xmlBytes = await inflateRawBytes(u8.subarray(dataStart));
          else if (dataStart + compSize <= u8.length) xmlBytes = await inflateRawBytes(u8.subarray(dataStart, dataStart + compSize));
        } else if (method === 0 && compSize && dataStart + compSize <= u8.length) {
          xmlBytes = u8.subarray(dataStart, dataStart + compSize);
        }
      } catch (_) { xmlBytes = null; }
      if (!xmlBytes || !xmlBytes.length) continue;
      const plain = xmlToPlainText(new TextDecoder("utf-8").decode(xmlBytes));
      if (plain) texts.push(plain);
      i = dataStart;
    }
  }
  const out = texts.join("\n");
  return out;
}

/** Extract DOCX document.xml raw string for table reconstruction. */
export async function extractDocxDocumentXml(buffer) {
  const u8 = toU8(buffer);
  const wanted = /^word\/document\.xml$/i;
  async function inflateZipFile(localOff, method, comp) {
    if (localOff + 30 > u8.length) return null;
    const nameLen = zipReadU16(u8, localOff + 26);
    const extraLen = zipReadU16(u8, localOff + 28);
    const dataStart = localOff + 30 + nameLen + extraLen;
    try {
      if (method === 8) {
        if (comp && dataStart + comp <= u8.length) return await inflateRawBytes(u8.subarray(dataStart, dataStart + comp));
        return await inflateRawBytes(u8.subarray(dataStart));
      }
      if (method === 0 && comp && dataStart + comp <= u8.length) return u8.subarray(dataStart, dataStart + comp);
    } catch (_) {}
    return null;
  }
  const central = readZipCentralEntries(u8);
  for (const ent of central) {
    if (!wanted.test(ent.name)) continue;
    const xmlBytes = await inflateZipFile(ent.localOff, ent.method, ent.comp);
    if (!xmlBytes || !xmlBytes.length) continue;
    return new TextDecoder("utf-8").decode(xmlBytes);
  }
  return "";
}

export async function extractDocxStructured(buffer, filename = "documento.docx") {
  const rawText = await extractDocxPlainText(buffer);
  const xml = await extractDocxDocumentXml(buffer);
  const tables = (typeof reconstructTablesFromDocxXml === "function")
    ? reconstructTablesFromDocxXml(xml, null)
    : [];
  const result = parseCanonicalProgramFromText(rawText, filename);
  const ir = typeof createEmptyDocumentIR === "function" ? createEmptyDocumentIR({
    filename, magicType: "docx", extension: ".docx"
  }) : null;
  if (ir) {
    ir.originalText = rawText;
    ir.tables = tables;
    ir.document.hasTables = tables.length > 0;
    ir.document.hasText = rawText.length > 0;
    ir.document.classification = classifyDocumentFromSignals({
      hasTraining: (result.canonicalProgram?.weeks || []).some(w => (w.sessions || []).some(s => (s.exercises || []).length)),
      hasNutrition: !!result.canonicalProgram?.nutrition?.present,
      hasSupplements: !!result.canonicalProgram?.supplementation?.present,
      tableCount: tables.length
    });
    if (result.canonicalProgram) result.canonicalProgram.documentIR = ir;
  }
  return { ...result, rawText, tables, documentIR: ir, parser: "docx_structured" };
}

export function extractDocBinaryText(buffer) {
  const u8 = toU8(buffer);
  const lines = [];
  let cur = "";
  const push = () => {
    const t = cur.replace(/\s+/g, " ").trim();
    if (t.length > 2 && /[A-Za-zÀ-ÿ]/.test(t)) lines.push(t);
    cur = "";
  };
  for (let i = 0; i + 1 < u8.length; i += 2) {
    const c = u8[i] | (u8[i + 1] << 8);
    if (c === 13 || c === 10 || c === 11 || c === 7) push();
    else if (c >= 32 && c < 127) cur += String.fromCharCode(c);
    else if ((c >= 0x00a0 && c <= 0x024f) || (c >= 0x1e00 && c <= 0x1eff)) cur += String.fromCharCode(c);
    else if (cur) push();
  }
  push();
  const utf16 = lines.join("\n");
  const ascii = latin1FromBytes(u8);
  const runs = (ascii.match(/[\x20-\x7EÀ-ÿ]{6,}/g) || []).filter((r) => /[A-Za-zÀ-ÿ]{4,}/.test(r));
  const asciiText = runs.join("\n");
  const scored = (t) => (t.match(/settimana|sessione|luned|panca|squat|stacco|pasto|mg\b|kg\b|giorno/gi) || []).length;
  let picked = scored(asciiText) > scored(utf16) && asciiText.length > utf16.length * 0.6 ? asciiText : (utf16.length >= 12 ? utf16 : asciiText);
  const cut = picked.search(/(?:^|\n)\s*(?:GIORNO|DAY|SETTIMANA|WEEK|ALLENAMENTO|BONUS)\b/i);
  if (cut >= 0) picked = picked.slice(cut);
  picked = picked.split(/\n/).filter((line) => {
    const s = String(line || "").trim();
    if (!s) return false;
    if (/^(Root Entry|Normal|WW8Num|Times New Roman|Arial|Tahoma|Symbol|OpenSymbol|Liberation|Microsoft YaHei|Lucida|Andale|RTF_Num|Titolo|Corpo del testo|Elenco|Didascalia|Indice|Intestazione|Punti|Carattere di numerazione|GIAMMARIA SYSTEM)/i.test(s)) return false;
    if (s.length > 160 && !/\d/.test(s)) return false;
    return true;
  }).join("\n");
  return picked;
}

export async function extractDocumentContent({ filename, mimeType, buffer }) {
  const detect = (typeof detectFormat === "function")
    ? detectFormat(buffer, filename, mimeType)
    : { magicType: "unknown", route: "text", warnings: [], size: buffer?.length || 0, extension: getExtName(filename || "") };
  const ext = detect.extension || getExtName(filename || "");
  const mime = String(mimeType || detect.mime || "");
  const route = detect.route;

  if (detect.size > (typeof DI_MAX_BYTES !== "undefined" ? DI_MAX_BYTES : 12 * 1024 * 1024)) {
    throw new Error("Documento supera il limite di 12 MB.");
  }

  if (route === "excel" || ext === ".xlsx" || ext === ".xls" || mime.includes("spreadsheet") || mime.includes("excel")) {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, cellNF: true, cellFormula: true });
    const result = parseStructuredWorkbook(workbook, filename);
    if (result.documentIR && detect.warnings?.length) result.documentIR.warnings.push(...detect.warnings);
    return {
      parser: "xlsx_structured_di",
      ext,
      detect,
      documentIR: result.documentIR || null,
      canonicalProgram: result.canonicalProgram,
      stats: result.stats,
      warnings: [...(result.warnings || []), ...(detect.warnings || [])],
      errors: result.errors
    };
  }

  if (route === "image" || [".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    const ocr = (typeof runLocalOcr === "function")
      ? await runLocalOcr(buffer)
      : { ok: false, text: "", warning: "OCR non disponibile", fallback: true };
    const rawText = ocr.text || "";
    const result = parseCanonicalProgramFromText(rawText, filename);
    const ir = typeof createEmptyDocumentIR === "function" ? createEmptyDocumentIR({
      filename, magicType: detect.magicType, extension: ext, size: detect.size
    }) : null;
    if (ir) {
      ir.originalText = rawText;
      ir.document.hasScannedContent = true;
      ir.document.hasImages = true;
      ir.warnings.push(ocr.warning || (ocr.ok ? "OCR completato" : "OCR fallback"));
      ir.images.push({ type: "source_image", confidence: ocr.confidence || 0 });
      if (result.canonicalProgram) result.canonicalProgram.documentIR = ir;
    }
    return {
      parser: ocr.ok ? "image_ocr" : "image_ocr_fallback",
      ext, detect, rawText, documentIR: ir, ocr, ...result,
      warnings: [...(result.warnings || []), ...(detect.warnings || []), ...(ocr.warning ? [ocr.warning] : [])]
    };
  }

  if (route === "pdf" || ext === ".pdf" || mime.includes("pdf")) {
    const rawText = await extractPdfPlainTextAsync(buffer);
    let ocr = null;
    let finalText = rawText;
    if (typeof pdfNeedsOcr === "function" && pdfNeedsOcr(rawText, 1)) {
      // Scanned PDF: attempt OCR if tesseract available (caller may pass rendered canvas)
      ocr = { ok: false, warning: "PDF a bassa densità testo — OCR richiesto se disponibile", fallback: true };
    }
    const result = parseCanonicalProgramFromText(finalText, filename);
    const ir = typeof createEmptyDocumentIR === "function" ? createEmptyDocumentIR({
      filename, magicType: "pdf", extension: ".pdf", size: detect.size
    }) : null;
    if (ir) {
      ir.originalText = finalText;
      ir.document.hasText = finalText.length > 0;
      ir.document.hasScannedContent = !!(ocr && !ocr.ok);
      if (detect.warnings?.length) ir.warnings.push(...detect.warnings);
      if (ocr?.warning) ir.warnings.push(ocr.warning);
      if (result.canonicalProgram) result.canonicalProgram.documentIR = ir;
    }
    return { parser: "pdf_text_di", ext, detect, rawText: finalText, documentIR: ir, ocr, ...result };
  }

  if (route === "docx" || ext === ".docx" || mime.includes("wordprocessingml")) {
    try {
      const structured = await extractDocxStructured(buffer, filename);
      return { ...structured, ext, detect, warnings: [...(structured.warnings || []), ...(detect.warnings || [])] };
    } catch (_) {
      let rawText = "";
      let parser = "docx_zip_xml";
      try {
        if (typeof mammoth !== "undefined" && mammoth && typeof mammoth.extractRawText === "function") {
          const extracted = await mammoth.extractRawText({ buffer });
          rawText = extracted.value || "";
          parser = "mammoth_docx";
        }
      } catch (_) {}
      if (!rawText || rawText.trim().length < 8) {
        rawText = await extractDocxPlainText(buffer);
        parser = "docx_zip_xml";
      }
      const result = parseCanonicalProgramFromText(rawText, filename);
      return { parser, ext, detect, rawText, ...result };
    }
  }

  if (route === "doc" || ext === ".doc" || (mime.includes("msword") && !mime.includes("wordprocessingml"))) {
    let rawText = "";
    let parser = "doc_binary_text";
    try {
      if (typeof fs !== "undefined" && fs && typeof WordExtractor === "function") {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "doc-parse-"));
        const tempPath = path.join(tempDir, "temp.doc");
        try {
          await fs.writeFile(tempPath, buffer);
          const extractor = new WordExtractor();
          const doc = await extractor.extract(tempPath);
          rawText = [doc.getBody(), doc.getHeaders(), doc.getFootnotes()].filter(Boolean).join("\n\n");
          parser = "word_extractor_doc";
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        }
      }
    } catch (_) {}
    if (!rawText || rawText.trim().length < 8) {
      rawText = extractDocBinaryText(buffer);
      parser = "doc_binary_text";
    }
    const result = parseCanonicalProgramFromText(rawText, filename);
    return { parser, ext, detect, rawText, ...result };
  }

  const rawText = typeof buffer?.toString === "function" ? buffer.toString("utf-8") : new TextDecoder("utf-8").decode(toU8(buffer));
  const result = parseCanonicalProgramFromText(rawText, filename);
  return { parser: "raw_text_fallback", ext, detect, rawText, ...result };
}

export function parseUniversalFile(buffer, filename) {
  const ext = getExtName(filename);
  if (ext === ".xlsx" || ext === ".xls") {
    const wb = XLSX.read(buffer, { type: "buffer", cellFormula: true, cellDates: true });
    return parseStructuredWorkbook(wb, filename);
  }
  if (ext === ".pdf") {
    return parseCanonicalProgramFromText(extractPdfPlainText(buffer), filename);
  }
  if (ext === ".doc") {
    return parseCanonicalProgramFromText(extractDocBinaryText(buffer), filename);
  }
  const raw = typeof buffer?.toString === "function" ? buffer.toString("utf-8") : new TextDecoder("utf-8").decode(toU8(buffer));
  return parseCanonicalProgramFromText(raw, filename);
}

export function buildCanonicalProgram(parsed) { if (!parsed) return null; return parsed.canonicalProgram || parsed.program || parsed; }

export default {
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
  parseCanonicalProgramFromText,
  extractPdfPlainText,
  extractPdfPlainTextAsync,
  parseStructuredWorkbook,
  evaluateSimpleExcelFormula,
  recalcTrainingLoadsFromCells,
  parseSsttStartInputs,
  validateCanonicalProgram,
  extractDocumentContent,
  parseUniversalFile,
  extractDocxPlainText,
  extractDocxDocumentXml,
  extractDocxStructured,
  extractDocBinaryText
};
