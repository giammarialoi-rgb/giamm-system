import express from "express";
import { normalizeExerciseName, parseExerciseDetails, extractDocumentContent, parseCanonicalProgramFromText } from "./universal-import-engine.mjs";
import { extractExcelStructuredForApi, detectFormat, DI_MAX_BYTES } from "./document-intelligence-core.mjs";
import { resolveTargetSetCount, detectTechniquesFromText, reconcileSetRows } from "./import-fidelity.mjs";
import { applyPrescriptionsToProgram, enforceAllPrescriptions, enforceExercisePrescription } from "./prescription-engine.mjs";
import { rirToRpe, rpeToRir, validateRir, validateRpe, normalizeRir, normalizeRpe, getIntensityLabel, compareTargetVsActual, calculateDeviation } from "./rir-rpe-engine.mjs";
import { calculateCompletedSets, calculateMissedSets, calculateTotalReps, calculateTotalTonnage, calculateVolumeLoad, calculateAverageLoad, calculateAverageRIR, calculateAverageRPE, calculateEstimated1RM, calculateExercisePerformance, calculateWorkoutPerformance, calculateTrend, detectPersonalRecords, aggregateMuscleGroupVolume } from "./performance-engine.mjs";
import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import pg from "pg";
import jwt from "jsonwebtoken";
import ExcelJS from "exceljs";
import crypto from "crypto";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import * as XLSX from "xlsx";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAiGateway } from "./server/ai/index.mjs";
import { mountFoodRoutes } from "./server/food/index.mjs";
import { mountEvidenceRoutes } from "./server/evidence/index.mjs";
import { mountProgramGenerateRoutes } from "./server/program/generator.mjs";
import { actionsToOperations, operationsToActions } from "./action-catalog.mjs";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const corsOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: corsOrigins.length ? corsOrigins : true,
  credentials: true
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "12mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.JSON_BODY_LIMIT || "12mb" }));

// Request id for observability (AI and general)
app.use((req, res, next) => {
  req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost")
    ? { rejectUnauthorized: false }
    : false
});

let dbInitialized = false;



// Task 8: Exercise Replacement Matrix & Deterministic Customization Engine
const EXERCISE_REPLACEMENT_RULES = {
  "squat": [
    { target: "Hack Squat", match: ["bilanciere", "back squat", "squat"], reason: "Migliore stabilità lombare e carico selettivo sui quadricipiti", confidence: "95%" },
    { target: "Leg Press 45°", match: ["bilanciere", "back squat", "squat"], reason: "Minore stress assiale sulla colonna vertebrale", confidence: "92%" },
    { target: "Bulgarian Split Squat", match: ["home", "manubri", "liberi"], reason: "Alternativa unilaterale con manubri ad altissima efficienza", confidence: "90%" },
    { target: "Goblet Squat con Manubrio", match: ["home", "base", "principiante"], reason: "Ottimo schema motorio con carico frontale ridotto", confidence: "88%" }
  ],
  "panca": [
    { target: "Spinte con Manubri su Panca", match: ["panca", "bilanciere"], reason: "Traiettoria fisiologica e minore stress sull'articolazione gleno-omerale", confidence: "95%" },
    { target: "Chest Press Convergente", match: ["panca", "macchine"], reason: "Tensione muscolare costante e sicurezza esecutiva ad alte ripetizioni", confidence: "93%" },
    { target: "Floor Press con Manubri", match: ["home", "pavimento"], reason: "Adatto per allenamento a casa senza panca piana", confidence: "88%" },
    { target: "Push-ups Zavorrati", match: ["corpo libero", "bodyweight"], reason: "Stimolo pettorale a catena cinetica chiusa", confidence: "85%" }
  ],
  "stacco": [
    { target: "Stacco Rumeno con Manubri", match: ["stacco", "bilanciere"], reason: "Focus specifico su ischiocrurali e glutei con ridotto affaticamento sistemico", confidence: "94%" },
    { target: "Trap Bar Deadlift", match: ["stacco", "schiena"], reason: "Leva biomeccanica più favorevole ed equilibrio baricentrico ottimale", confidence: "93%" },
    { target: "Hyperextension con Sovraccarico", match: ["lombari", "macchine"], reason: "Isolamento catena posteriore senza compressione spinale diretta", confidence: "89%" }
  ],
  "trazioni": [
    { target: "Lat Machine Presa Neutra", match: ["trazioni", "sbarra"], reason: "Regolazione micrometrica del carico per sovraccarico progressivo", confidence: "95%" },
    { target: "Rematore con Manubri su Panca", match: ["home", "manubri"], reason: "Sviluppo dello spessore dorsale con manubri", confidence: "89%" }
  ],
  "military": [
    { target: "Spinte con Manubri da Seduto", match: ["military", "lento"], reason: "Eliminazione del compenso lombare e libertà di prono-supinazione", confidence: "94%" },
    { target: "Shoulder Press Machine", match: ["spalle", "macchine"], reason: "Tensione isolata sui deltoidi anteriori e laterali", confidence: "92%" }
  ]
};

function findExerciseAlternative(exerciseName, equipmentFilter, userExclusions) {
  const nameLow = String(exerciseName || "").toLowerCase();
  for (const [key, rules] of Object.entries(EXERCISE_REPLACEMENT_RULES)) {
    if (nameLow.includes(key)) {
      for (const rule of rules) {
        if (!userExclusions || !userExclusions.some(ex => rule.target.toLowerCase().includes(ex.toLowerCase()))) {
          return rule;
        }
      }
    }
  }
  return {
    target: exerciseName + " (Variante con Manubri)",
    reason: "Adattamento ergonomico in base alle preferenze e all'attrezzatura selezionata",
    confidence: "80%"
  };
}

function adaptProgramCustomization(originalProgram, { frequency, duration, equipment, exerciseExclusions, intensityType, athleteProfile }) {
  const program = JSON.parse(JSON.stringify(originalProgram));
  const diffs = [];
  const origFreq = Number(program.training_frequency || program.weeks?.[0]?.sessions?.length || 4);
  const targetFreq = frequency ? Number(frequency) : origFreq;
  const origDur = Number(program.duration_weeks || program.weeks?.length || 12);
  const targetDur = duration ? Number(duration) : origDur;
  const targetIntensity = intensityType ? String(intensityType).toUpperCase() : (athleteProfile?.intensity_type || "RIR").toUpperCase();

  // 1. Frequency Diff
  if (targetFreq !== origFreq) {
    diffs.push({
      type: "frequency",
      parameter: "Frequenza Settimanale",
      original_value: origFreq + " Giorni/sett.",
      new_value: targetFreq + " Giorni/sett.",
      reason: "Riorganizzazione delle sessioni per adattamento al tempo dell'atleta",
      confidence: "95%"
    });
    program.training_frequency = targetFreq;
  }

  // 2. Duration Diff
  if (targetDur !== origDur) {
    diffs.push({
      type: "duration",
      parameter: "Durata del Ciclo",
      original_value: origDur + " Settimane",
      new_value: targetDur + " Settimane",
      reason: "Ricalibrazione del mesociclo con posizionamento cadenzato dei deload",
      confidence: "95%"
    });
    program.duration_weeks = targetDur;
  }

  // 3. Intensity System Diff
  const currentIntensity = (program.weeks?.[0]?.sessions?.[0]?.exercises?.[0]?.rirTarget !== undefined) ? "RIR" : "RPE";
  if (targetIntensity !== currentIntensity) {
    diffs.push({
      type: "intensity",
      parameter: "Sistema di Intensità",
      original_value: currentIntensity,
      new_value: targetIntensity,
      reason: "Allineamento al metodo di autoregolazione preferito dall'atleta",
      confidence: "100%"
    });
  }

  // 4. Exercise Exclusions / Substitutions Diff
  const exclusions = Array.isArray(exerciseExclusions) ? exerciseExclusions : [];
  const isHomeGym = equipment && (equipment.toLowerCase().includes("home") || equipment.toLowerCase().includes("manubri") || equipment.toLowerCase().includes("liberi"));

  if (equipment && equipment !== "Commercial Gym") {
    diffs.push({
      type: "equipment",
      parameter: "Attrezzatura",
      original_value: "Palestra Commerciale",
      new_value: equipment,
      reason: "Verifica compatibilità del parco macchine con sostituzioni dirette",
      confidence: "95%"
    });
  }

  // Process and adapt weeks
  const baseSessions = program.weeks?.[0]?.sessions || [];
  let adaptedSessions = JSON.parse(JSON.stringify(baseSessions));

  // Adjust sessions count if frequency changed
  if (targetFreq < adaptedSessions.length) {
    adaptedSessions = adaptedSessions.slice(0, targetFreq);
  } else if (targetFreq > adaptedSessions.length) {
    while (adaptedSessions.length < targetFreq) {
      const extraIdx = adaptedSessions.length + 1;
      adaptedSessions.push({
        id: "s_extra_" + extraIdx,
        day: "Giorno " + extraIdx,
        title: "Sessione " + extraIdx + " - Focus & Richiamo",
        dayNumber: extraIdx,
        exercises: [
          { name: "Spinte con Manubri da Seduto", sets: 3, reps: "10-12", rir: 2, rpe: 8, restSeconds: 90, muscleGroup: "SPALLE" },
          { name: "Curl Bicipiti con Manubri", sets: 3, reps: "10-12", rir: 1, rpe: 9, restSeconds: 60, muscleGroup: "BRACCIA" },
          { name: "Pushdown Cavi / Estensioni", sets: 3, reps: "12-15", rir: 1, rpe: 9, restSeconds: 60, muscleGroup: "BRACCIA" },
          { name: "Plank Addominale", sets: 3, reps: "45-60s", rir: 2, rpe: 8, restSeconds: 60, muscleGroup: "ADDOME" }
        ]
      });
    }
  }

  // Apply exercise replacements and intensity targets
  const replacedMap = new Map();
  adaptedSessions.forEach(session => {
    (session.exercises || []).forEach(ex => {
      const shouldExclude = exclusions.some(e => ex.name.toLowerCase().includes(e.toLowerCase()));
      const machineMismatch = isHomeGym && (ex.name.toLowerCase().includes("machine") || ex.name.toLowerCase().includes("cavi") || ex.name.toLowerCase().includes("press 45"));

      if (shouldExclude || machineMismatch) {
        if (!replacedMap.has(ex.name)) {
          const rule = findExerciseAlternative(ex.name, equipment, exclusions);
          replacedMap.set(ex.name, rule);
          diffs.push({
            type: "exercise",
            parameter: "Sostituzione Esercizio",
            original_value: ex.name,
            new_value: rule.target,
            reason: rule.reason,
            confidence: rule.confidence
          });
        }
        const repl = replacedMap.get(ex.name);
        ex.name = repl.target;
        ex.exercise = repl.target;
      }

      // Convert Intensity System
      if (targetIntensity === "RIR") {
        ex.rirTarget = ex.rirTarget ?? (ex.rpeTarget ? Math.max(0, 10 - ex.rpeTarget) : 2);
        ex.rpeTarget = null;
      } else if (targetIntensity === "RPE") {
        ex.rpeTarget = ex.rpeTarget ?? (ex.rirTarget !== undefined ? Math.min(10, 10 - ex.rirTarget) : 8);
        ex.rirTarget = null;
      }
    });
  });

  // Re-build canonical weeks
  const newWeeks = [];
  for (let w = 1; w <= targetDur; w++) {
    const isDeload = (w % 4 === 0);
    const weekSessions = adaptedSessions.map((ts, sIdx) => {
      const exercises = (ts.exercises || []).map((ex, eIdx) => {
        const setsCount = Number(ex.sets || 3);
        const rirVal = isDeload ? Math.min(Number(ex.rirTarget ?? ex.rir ?? 2) + 1, 4) : Number(ex.rirTarget ?? ex.rir ?? 2);
        const rpeVal = isDeload ? Math.max(Number(ex.rpeTarget ?? ex.rpe ?? 8) - 1.5, 6) : Number(ex.rpeTarget ?? ex.rpe ?? 8);

        const sets = [];
        for (let s = 1; s <= setsCount; s++) {
          sets.push({
            id: `w${w}_s${sIdx + 1}_e${eIdx + 1}_set${s}`,
            order: s,
            reps: ex.reps || ex.repsTarget || "8-10",
            load: null,
            load_unit: "kg",
            percentage_1rm: targetIntensity === "%1RM" ? 75 : null,
            rpe: targetIntensity === "RPE" ? rpeVal : null,
            rir: targetIntensity === "RIR" ? rirVal : null,
            rest_seconds: ex.rest_seconds || ex.restSeconds || 90,
            tempo: ex.tempo || "",
            done: false
          });
        }

        return {
          id: `w${w}_s${sIdx + 1}_e${eIdx + 1}`,
          name: ex.name,
          exercise: ex.name,
          muscleGroup: ex.muscleGroup || "TOTAL",
          sets: setsCount,
          sets_data: sets,
          repsTarget: ex.reps || ex.repsTarget || "8-10",
          rirTarget: targetIntensity === "RIR" ? rirVal : null,
          rpeTarget: targetIntensity === "RPE" ? rpeVal : null,
          percentage_1rm: targetIntensity === "%1RM" ? 75 : null,
          rest: (ex.rest_seconds || ex.restSeconds || 90) + "s",
          rest_seconds: ex.rest_seconds || ex.restSeconds || 90,
          tempo: ex.tempo || "",
          notes: ex.notes || "",
          isBonus: false
        };
      });

      return {
        id: `w${w}_s${sIdx + 1}`,
        day: `Giorno ${ts.dayNumber || sIdx + 1}`,
        title: ts.title || ts.name || `Sessione ${sIdx + 1}`,
        dayNumber: ts.dayNumber || sIdx + 1,
        exercises
      };
    });

    newWeeks.push({
      week: w,
      weekNumber: w,
      label: isDeload ? `Settimana ${w} (Deload & Scarico Tecnico)` : `Settimana ${w}`,
      sessions: weekSessions
    });
  }

  program.weeks = newWeeks;
  program.customized = true;

  return { adaptedProgram: program, diffs };
}

function buildCanonicalProgramFromTemplate(template) {
  const weeksCount = Number(template.duration_weeks || template.structure?.weeksCount || 12);
  const templateSessions = template.structure?.sessions || [];
  const title = template.title || 'Programma Nurvan';

  const weeks = [];
  for (let w = 1; w <= weeksCount; w++) {
    const isDeload = (w === 4 || w === 8 || w === 12);
    const weekSessions = templateSessions.map((ts, sIdx) => {
      const exercises = (ts.exercises || []).map((ex, eIdx) => {
        const setsCount = Number(ex.sets || 3);
        const rirVal = isDeload ? Math.min(Number(ex.rir ?? 2) + 1, 4) : Number(ex.rir ?? 2);
        const rpeVal = isDeload ? Math.max(Number(ex.rpe ?? 8) - 1.5, 6) : Number(ex.rpe ?? 8);

        const sets = [];
        for (let s = 1; s <= setsCount; s++) {
          sets.push({
            id: `w${w}_s${sIdx + 1}_e${eIdx + 1}_set${s}`,
            order: s,
            reps: ex.reps || '8-10',
            load: null,
            load_unit: 'kg',
            percentage_1rm: null,
            rpe: rpeVal,
            rir: rirVal,
            rest_seconds: ex.restSeconds || 90,
            tempo: ex.tempo || '',
            done: false
          });
        }

        return {
          id: `w${w}_s${sIdx + 1}_e${eIdx + 1}`,
          name: ex.name,
          exercise: ex.name,
          muscleGroup: ex.muscleGroup || 'TOTAL',
          sets: setsCount,
          sets_data: sets,
          repsTarget: ex.reps || '8-10',
          rirTarget: rirVal,
          rpeTarget: rpeVal,
          rest: (ex.restSeconds || 90) + 's',
          rest_seconds: ex.restSeconds || 90,
          tempo: ex.tempo || '',
          notes: ex.notes || '',
          isBonus: false
        };
      });

      return {
        id: `w${w}_s${sIdx + 1}`,
        day: `Giorno ${ts.dayNumber || sIdx + 1}`,
        title: ts.name || `Sessione ${sIdx + 1}`,
        dayNumber: ts.dayNumber || sIdx + 1,
        exercises
      };
    });

    weeks.push({
      week: w,
      weekNumber: w,
      label: isDeload ? `Settimana ${w} (Deload & Scarico Tecnico)` : `Settimana ${w}`,
      sessions: weekSessions
    });
  }

  return {
    id: `prog_${Date.now()}_${template.slug || 'custom'}`,
    template_id: template.id,
    template_slug: template.slug,
    title,
    author: template.author || 'Giammaria Loi',
    split: template.structure?.split || template.primary_goal || 'Custom Split',
    duration_weeks: weeksCount,
    source: template.source || 'PRESET',
    source_template_version: template.version || '1.0.0',
    weeks
  };
}

async function initDb() {
  if (dbInitialized || !process.env.DATABASE_URL) return;
  let client;
  try {
    client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`
        CREATE TABLE IF NOT EXISTS app_users (
          id BIGSERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          first_name TEXT,
          last_name TEXT,
          password_hash TEXT,
          provider TEXT NOT NULL DEFAULT 'email',
          provider_id TEXT,
          avatar_url TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          role TEXT NOT NULL DEFAULT 'athlete',
          last_login_at TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS app_account_data (
          user_id BIGINT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS app_athlete_profiles (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT UNIQUE NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
          first_name TEXT,
          last_name TEXT,
          birth_date DATE,
          gender TEXT,
          country TEXT DEFAULT 'IT',
          language TEXT DEFAULT 'it',
          height_cm NUMERIC(5,2),
          weight_kg NUMERIC(5,2),
          primary_goal TEXT,
          secondary_goals JSONB DEFAULT '[]'::jsonb,
          experience_level TEXT,
          training_frequency INTEGER DEFAULT 4,
          intensity_type TEXT DEFAULT 'RIR',
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS app_program_templates (
          id BIGSERIAL PRIMARY KEY,
          slug TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          author TEXT DEFAULT 'Giammaria Loi',
          source TEXT NOT NULL DEFAULT 'PRESET',
          status TEXT NOT NULL DEFAULT 'published',
          difficulty TEXT NOT NULL DEFAULT 'Intermediate',
          primary_goal TEXT NOT NULL,
          secondary_goals JSONB DEFAULT '[]'::jsonb,
          training_frequency INTEGER NOT NULL DEFAULT 4,
          duration_weeks INTEGER NOT NULL DEFAULT 12,
          equipment_requirements JSONB DEFAULT '["Palestra Commerciale", "Bilancieri", "Manubri", "Cavi", "Macchine"]'::jsonb,
          categories JSONB DEFAULT '["Hypertrophy"]'::jsonb,
          tags JSONB DEFAULT '["Evidence-Based"]'::jsonb,
          cover_url TEXT,
          version TEXT NOT NULL DEFAULT '1.0.0',
          version_number INTEGER NOT NULL DEFAULT 1,
          structure JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS app_program_imports (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
          filename TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_size_bytes BIGINT NOT NULL DEFAULT 0,
          storage_path TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'uploaded',
          raw_text TEXT,
          raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          parsed_data JSONB NOT NULL DEFAULT '{}'::jsonb,
          warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
          errors JSONB NOT NULL DEFAULT '[]'::jsonb,
          stats JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_app_program_imports_user ON app_program_imports(user_id);
        CREATE INDEX IF NOT EXISTS idx_app_program_imports_status ON app_program_imports(user_id, status);
        CREATE INDEX IF NOT EXISTS idx_app_program_imports_created ON app_program_imports(user_id, created_at DESC);
        
        CREATE TABLE IF NOT EXISTS app_imports (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
          original_filename TEXT NOT NULL,
          stored_filename TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          file_extension TEXT NOT NULL,
          file_size_bytes BIGINT NOT NULL,
          storage_path TEXT NOT NULL,
          storage_provider TEXT NOT NULL DEFAULT 'local',
          status TEXT NOT NULL DEFAULT 'uploaded',
          source_type TEXT NOT NULL DEFAULT 'unknown',
          parser_version TEXT DEFAULT '1.0.0',
          analysis_status TEXT DEFAULT 'pending',
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          expires_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS idx_app_imports_user ON app_imports(user_id);
        CREATE INDEX IF NOT EXISTS idx_app_imports_status ON app_imports(user_id, status);
        CREATE INDEX IF NOT EXISTS idx_app_imports_created ON app_imports(user_id, created_at DESC);
        
        
        CREATE TABLE IF NOT EXISTS app_workout_sessions (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
          athlete_program_id BIGINT REFERENCES app_athlete_programs(id) ON DELETE SET NULL,
          week_number INT NOT NULL DEFAULT 1,
          session_number INT NOT NULL DEFAULT 1,
          session_name TEXT NOT NULL,
          scheduled_at TIMESTAMPTZ,
          started_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          status TEXT NOT NULL DEFAULT 'in_progress',
          notes TEXT,
          duration_seconds INT DEFAULT 0,
          session_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON app_workout_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_status ON app_workout_sessions(user_id, status);
        CREATE INDEX IF NOT EXISTS idx_workout_sessions_created ON app_workout_sessions(user_id, created_at DESC);

        CREATE TABLE IF NOT EXISTS app_workout_exercises (
          id BIGSERIAL PRIMARY KEY,
          workout_session_id BIGINT NOT NULL REFERENCES app_workout_sessions(id) ON DELETE CASCADE,
          exercise_id TEXT,
          canonical_exercise_id TEXT,
          name TEXT NOT NULL,
          name_original TEXT,
          muscle_group TEXT,
          superset_group_id TEXT,
          order_index INT NOT NULL DEFAULT 0,
          prescribed_sets INT NOT NULL DEFAULT 3,
          prescribed_reps TEXT NOT NULL DEFAULT '8-10',
          prescribed_rir NUMERIC,
          prescribed_rpe NUMERIC,
          prescribed_percentage_1rm NUMERIC,
          prescribed_load TEXT,
          prescribed_rest_seconds INT DEFAULT 90,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_workout_exercises_session ON app_workout_exercises(workout_session_id);
        CREATE INDEX IF NOT EXISTS idx_workout_exercises_canonical ON app_workout_exercises(canonical_exercise_id);

        CREATE TABLE IF NOT EXISTS app_workout_sets (
          id BIGSERIAL PRIMARY KEY,
          workout_exercise_id BIGINT NOT NULL REFERENCES app_workout_exercises(id) ON DELETE CASCADE,
          set_number INT NOT NULL DEFAULT 1,
          set_type TEXT NOT NULL DEFAULT 'working',
          target_reps TEXT,
          actual_reps INT,
          target_load TEXT,
          actual_load NUMERIC,
          load_unit TEXT DEFAULT 'kg',
          target_rir NUMERIC,
          actual_rir NUMERIC,
          target_rpe NUMERIC,
          actual_rpe NUMERIC,
          target_percentage_1rm NUMERIC,
          rest_seconds INT DEFAULT 90,
          tempo TEXT,
          completed BOOLEAN NOT NULL DEFAULT false,
          completed_at TIMESTAMPTZ,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON app_workout_sets(workout_exercise_id);

        CREATE TABLE IF NOT EXISTS app_athlete_programs (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
          template_id BIGINT REFERENCES app_program_templates(id) ON DELETE SET NULL,
          name TEXT NOT NULL,
          source TEXT NOT NULL DEFAULT 'PRESET',
          status TEXT NOT NULL DEFAULT 'active',
          customized BOOLEAN NOT NULL DEFAULT false,
          version_snapshot TEXT NOT NULL DEFAULT '1.0.0',
          program_data JSONB NOT NULL DEFAULT '{}'::jsonb,
          started_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email';
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS provider_id TEXT;
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS first_name TEXT;
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_name TEXT;
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'athlete';
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_reset_hash TEXT;
        ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;
        UPDATE app_users SET provider = 'email' WHERE provider IS NULL;
        ALTER TABLE app_account_data ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
        ALTER TABLE app_account_data ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE app_athlete_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
        ALTER TABLE app_athlete_profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
        ALTER TABLE app_athlete_profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
        ALTER TABLE app_athlete_profiles ADD COLUMN IF NOT EXISTS gender TEXT;
        ALTER TABLE app_athlete_profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'IT';
        ALTER TABLE app_athlete_profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'it';
        ALTER TABLE app_athlete_profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,2);
        ALTER TABLE app_athlete_profiles ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,2);
        ALTER TABLE app_athlete_profiles ADD COLUMN IF NOT EXISTS primary_goal TEXT;
        ALTER TABLE app_athlete_profiles ADD COLUMN IF NOT EXISTS secondary_goals JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE app_athlete_profiles ADD COLUMN IF NOT EXISTS experience_level TEXT;
        ALTER TABLE app_athlete_profiles ADD COLUMN IF NOT EXISTS training_frequency INTEGER DEFAULT 4;
        ALTER TABLE app_athlete_profiles ADD COLUMN IF NOT EXISTS intensity_type TEXT DEFAULT 'RIR';
        ALTER TABLE app_athlete_profiles ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE app_athlete_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        CREATE INDEX IF NOT EXISTS idx_app_users_provider ON app_users(provider, provider_id);
        CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
        CREATE INDEX IF NOT EXISTS idx_app_athlete_profiles_user_id ON app_athlete_profiles(user_id);
        CREATE INDEX IF NOT EXISTS idx_app_program_templates_goal ON app_program_templates(primary_goal);
        CREATE INDEX IF NOT EXISTS idx_app_program_templates_slug ON app_program_templates(slug);
        CREATE INDEX IF NOT EXISTS idx_app_athlete_programs_user ON app_athlete_programs(user_id);
        CREATE INDEX IF NOT EXISTS idx_app_athlete_programs_user_status ON app_athlete_programs(user_id, status);
        ALTER TABLE app_athlete_programs ADD COLUMN IF NOT EXISTS title TEXT;
        ALTER TABLE app_athlete_programs ADD COLUMN IF NOT EXISTS source_template_version TEXT;
        ALTER TABLE app_athlete_programs ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE app_athlete_programs ADD COLUMN IF NOT EXISTS customization_history JSONB DEFAULT '[]'::jsonb;
        CREATE INDEX IF NOT EXISTS idx_app_athlete_programs_template ON app_athlete_programs(template_id);
      `);
      await client.query("COMMIT");
      console.log("Database schema verified successfully.");
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      console.error("DB Schema Init Error:", err);
      throw err;
    }

    try {
      await client.query("BEGIN");
      await seedProgramTemplates(client);
      await client.query("COMMIT");
      console.log("Database templates seeded successfully.");
    } catch (seedErr) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      console.error("DB Seed Error (schema already applied):", seedErr);
    }

    dbInitialized = true;
  } catch (err) {
    console.error("DB Connection/Init Error:", err);
  } finally {
    if (client) {
      try { client.release(); } catch (_) {}
    }
  }
}

/** Lightweight auth-column migration — safe to call before register/login. */
async function ensureAuthSchema() {
  if (!process.env.DATABASE_URL || !pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      first_name TEXT,
      last_name TEXT,
      password_hash TEXT,
      provider TEXT NOT NULL DEFAULT 'email',
      provider_id TEXT,
      avatar_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      role TEXT NOT NULL DEFAULT 'athlete',
      last_login_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS app_account_data (
      user_id BIGINT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS first_name TEXT;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_name TEXT;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email';
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS provider_id TEXT;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'athlete';
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_reset_hash TEXT;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;
    CREATE TABLE IF NOT EXISTS app_athlete_profiles (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT UNIQUE NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      first_name TEXT,
      last_name TEXT,
      birth_date DATE,
      gender TEXT,
      country TEXT DEFAULT 'IT',
      language TEXT DEFAULT 'it',
      height_cm NUMERIC(5,2),
      weight_kg NUMERIC(5,2),
      primary_goal TEXT,
      secondary_goals JSONB DEFAULT '[]'::jsonb,
      experience_level TEXT,
      training_frequency INTEGER DEFAULT 4,
      intensity_type TEXT DEFAULT 'RIR',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE app_athlete_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
    ALTER TABLE app_athlete_profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
  `);
}


const INITIAL_PROGRAM_TEMPLATES = [
  {
    slug: 'gs-hypertrophy-4d-upper-lower',
    title: 'GS Hypertrophy Mastery: Upper / Lower Split',
    description: 'Programmazione evidence-based su 4 giorni con split Upper/Lower. Frequenza ottimale 2x a settimana per gruppo muscolare, gestione controllata del volume e target RIR 1-2.',
    author: 'Giammaria Loi',
    source: 'PRESET',
    status: 'published',
    difficulty: 'Intermediate',
    primary_goal: 'Hypertrophy',
    secondary_goals: ['Ipertrofia Funzionale', 'Densità Muscolare', 'Longevità Articolare'],
    training_frequency: 4,
    duration_weeks: 12,
    equipment_requirements: ['Palestra Commerciale', 'Bilancieri', 'Manubri', 'Cavi', 'Macchine'],
    categories: ['Hypertrophy', 'Upper/Lower', 'Evidence-Based'],
    tags: ['Ipertrofia', '4 Giorni', 'Intermedio', 'RIR'],
    cover_url: null,
    version: '1.0.0',
    version_number: 1,
    structure: {
      name: 'GS Hypertrophy Mastery: Upper / Lower Split',
      weeksCount: 12,
      split: 'Upper / Lower (4 Days)',
      sessions: [
        {
          name: 'Sessione A1 - Upper Body Strength & Power',
          dayNumber: 1,
          exercises: [
            { name: 'Panca Piana Bilanciere', muscleGroup: 'PETTO', sets: 4, reps: '6-8', rir: 2, rpe: 8, restSeconds: 180, tempo: '3-0-1-0', notes: 'Arco fisiologico, fermo al petto controllato.' },
            { name: 'Trazioni alla Sbarra / Lat Machine', muscleGroup: 'SCHIENA', sets: 4, reps: '6-8', rir: 2, rpe: 8, restSeconds: 150, tempo: '2-0-1-1', notes: 'Completa estensione dorsale in basso.' },
            { name: 'Spinte con Manubri su Panca Inclinata 30°', muscleGroup: 'PETTO', sets: 3, reps: '8-10', rir: 1, rpe: 9, restSeconds: 120, tempo: '2-1-1-0', notes: 'Focus fascio clavicolare.' },
            { name: 'Pulley Basso Presa Neutra', muscleGroup: 'SCHIENA', sets: 3, reps: '10-12', rir: 1, rpe: 9, restSeconds: 90, tempo: '2-0-1-1', notes: 'Adduzione scapolare attiva.' },
            { name: 'Alzate Laterali con Manubri', muscleGroup: 'SPALLE', sets: 4, reps: '12-15', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-0-1-0', notes: 'Traiettoria sul piano scapolare.' },
            { name: 'French Press su Panca con Bilanciere EZ', muscleGroup: 'TRICIPITI', sets: 3, reps: '10-12', rir: 1, rpe: 9, restSeconds: 75, tempo: '3-0-1-0', notes: 'Gomiti stabili.' }
          ]
        },
        {
          name: 'Sessione A2 - Lower Body Strength & Quad Focus',
          dayNumber: 2,
          exercises: [
            { name: 'Squat con Bilanciere', muscleGroup: 'QUADRICIPITI', sets: 4, reps: '6-8', rir: 2, rpe: 8, restSeconds: 180, tempo: '3-1-1-0', notes: 'Profondità parallelo, spinta a centro piede.' },
            { name: 'RDL - Romanian Deadlift con Manubri/Bilanciere', muscleGroup: 'FEMORALI', sets: 4, reps: '8-10', rir: 2, rpe: 8, restSeconds: 150, tempo: '3-1-1-0', notes: 'Flessione d\'anca pura, colonna neutra.' },
            { name: 'Leg Press 45°', muscleGroup: 'QUADRICIPITI', sets: 3, reps: '10-12', rir: 1, rpe: 9, restSeconds: 120, tempo: '2-1-1-0', notes: 'Range di movimento completo.' },
            { name: 'Leg Curl Seduto o Sdraiato', muscleGroup: 'FEMORALI', sets: 3, reps: '12-15', rir: 0, rpe: 10, restSeconds: 90, tempo: '2-0-1-1', notes: 'Fermo 1 secondo in massima contrazione.' },
            { name: 'Calf Raise in Piedi alla Macchina', muscleGroup: 'POLPACCI', sets: 4, reps: '12-15', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-2-1-0', notes: '2 secondi di allungamento in basso.' }
          ]
        },
        {
          name: 'Sessione B1 - Upper Body Hypertrophy & Shoulder/Arm Focus',
          dayNumber: 3,
          exercises: [
            { name: 'Military Press / Shoulder Press con Manubri', muscleGroup: 'SPALLE', sets: 4, reps: '8-10', rir: 1, rpe: 9, restSeconds: 120, tempo: '2-1-1-0', notes: 'Stabilità del core e glutei contratti.' },
            { name: 'Rematore con Bilanciere o Manubrio', muscleGroup: 'SCHIENA', sets: 4, reps: '8-10', rir: 1, rpe: 9, restSeconds: 120, tempo: '2-0-1-0', notes: 'Trazione verso l\'ombelico.' },
            { name: 'Croci ai Cavi / Pectoral Machine', muscleGroup: 'PETTO', sets: 3, reps: '12-15', rir: 0, rpe: 10, restSeconds: 75, tempo: '2-1-1-1', notes: 'Massimo allungamento e contrazione di picco.' },
            { name: 'Alzate Posteriori ai Cavi / Face Pull', muscleGroup: 'SPALLE', sets: 4, reps: '15-20', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-0-1-1', notes: 'Focus deltoide posteriore e cuffia.' },
            { name: 'Curl con Bilanciere Sagomato EZ', muscleGroup: 'BICIPITI', sets: 3, reps: '10-12', rir: 1, rpe: 9, restSeconds: 75, tempo: '2-0-1-0', notes: 'Senza oscillazioni di schiena.' },
            { name: 'Pushdown ai Cavi con Corda', muscleGroup: 'TRICIPITI', sets: 3, reps: '12-15', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-0-1-1', notes: 'Apertura corda a fine corsa.' }
          ]
        },
        {
          name: 'Sessione B2 - Lower Body Hypertrophy & Posterior Chain',
          dayNumber: 4,
          exercises: [
            { name: 'Stacco da Terra con Trap Bar o Regolare', muscleGroup: 'SCHIENA', sets: 3, reps: '6-8', rir: 2, rpe: 8, restSeconds: 180, tempo: '2-1-1-0', notes: 'Setup compatto, spinta dalle gambe.' },
            { name: 'Hack Squat / Front Squat / Bulgarian Split Squat', muscleGroup: 'QUADRICIPITI', sets: 3, reps: '8-10', rir: 1, rpe: 9, restSeconds: 120, tempo: '3-0-1-0', notes: 'Flessione del ginocchio profonda.' },
            { name: 'Hip Thrust con Bilanciere', muscleGroup: 'GLUTEI', sets: 4, reps: '10-12', rir: 1, rpe: 9, restSeconds: 120, tempo: '2-1-1-1', notes: 'Retroversione di bacino al vertice.' },
            { name: 'Leg Extension', muscleGroup: 'QUADRICIPITI', sets: 3, reps: '12-15', rir: 0, rpe: 10, restSeconds: 75, tempo: '2-0-1-1', notes: 'Controllo eccentrico 2 secondi.' },
            { name: 'Calf Raise Seduto', muscleGroup: 'POLPACCI', sets: 4, reps: '15-20', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-2-1-0', notes: 'Focus muscolo soleo.' }
          ]
        }
      ]
    }
  },
  {
    slug: 'gs-powerlifting-4d-strength',
    title: 'GS Pure Strength & Powerlifting Protocol',
    description: 'Protocollo avanzato a 4 giorni finalizzato all\'incremento del massimale sui tre grandi alzate (Squat, Panca, Stacco) con periodizzazione ondulata e gestione carichi in RPE/% 1RM.',
    author: 'Giammaria Loi',
    source: 'PRESET',
    status: 'published',
    difficulty: 'Advanced',
    primary_goal: 'Strength',
    secondary_goals: ['Powerlifting', 'Forza Massimale', 'Efficienza Neurale'],
    training_frequency: 4,
    duration_weeks: 12,
    equipment_requirements: ['Rack', 'Bilanciere Olimpico', 'Dischi Calibrati', 'Panca Regolabile'],
    categories: ['Strength', 'Powerlifting', 'SBD'],
    tags: ['Forza', 'Powerlifting', '4 Giorni', 'Avanzato', 'RPE'],
    cover_url: null,
    version: '1.0.0',
    version_number: 1,
    structure: {
      name: 'GS Pure Strength & Powerlifting Protocol',
      weeksCount: 12,
      split: 'SBD Specificity (4 Days)',
      sessions: [
        {
          name: 'Giorno 1 - Squat Primario & Panca Volume',
          dayNumber: 1,
          exercises: [
            { name: 'Squat da Competizione', muscleGroup: 'QUADRICIPITI', sets: 4, reps: '4-5', rir: 2, rpe: 8, restSeconds: 240, tempo: '2-1-1-0', notes: 'Discesa controllata, risalita esplosiva.' },
            { name: 'Panca Piana con Fermo al Petto (Larsen Press / Touch&Go)', muscleGroup: 'PETTO', sets: 4, reps: '6-8', rir: 2, rpe: 8, restSeconds: 180, tempo: '3-1-1-0', notes: 'Fermo 2 secondi al petto.' },
            { name: 'Affondi con Manubri in Camminata', muscleGroup: 'QUADRICIPITI', sets: 3, reps: '10', rir: 2, rpe: 8, restSeconds: 90, tempo: '2-0-1-0', notes: 'Stabilità pelvica.' },
            { name: 'Rematore con Manubrio', muscleGroup: 'SCHIENA', sets: 4, reps: '8-10', rir: 1, rpe: 9, restSeconds: 90, tempo: '2-0-1-0', notes: 'Supporto lombare.' }
          ]
        },
        {
          name: 'Giorno 2 - Panca Primaria & Lavoro Accessorio Traspilatorio',
          dayNumber: 2,
          exercises: [
            { name: 'Panca Piana da Competizione', muscleGroup: 'PETTO', sets: 5, reps: '3-4', rir: 1.5, rpe: 8.5, restSeconds: 240, tempo: '2-1-1-0', notes: 'Arco e leg drive costante.' },
            { name: 'Spinte Manubri su Panca Inclinata', muscleGroup: 'PETTO', sets: 3, reps: '8-10', rir: 1, rpe: 9, restSeconds: 120, tempo: '2-1-1-0', notes: 'Profondità massima.' },
            { name: 'Trazioni alla Sbarra Sovraccaricate', muscleGroup: 'SCHIENA', sets: 4, reps: '5-6', rir: 2, rpe: 8, restSeconds: 150, tempo: '2-0-1-1', notes: 'Zavorra progressiva.' },
            { name: 'Dip alle Parallele Sovraccaricate', muscleGroup: 'PETTO', sets: 3, reps: '6-8', rir: 1, rpe: 9, restSeconds: 120, tempo: '2-1-1-0', notes: 'Inclinazione busto in avanti.' }
          ]
        },
        {
          name: 'Giorno 3 - Stacco da Terra Primario & Squat Variante',
          dayNumber: 3,
          exercises: [
            { name: 'Stacco da Terra da Competizione (Regular / Sumo)', muscleGroup: 'SCHIENA', sets: 4, reps: '3-4', rir: 2, rpe: 8, restSeconds: 240, tempo: '1-0-1-0', notes: 'Partenza compatta dal pavimento.' },
            { name: 'Pause Squat (Fermo 2 secondi in buca)', muscleGroup: 'QUADRICIPITI', sets: 3, reps: '4-5', rir: 2, rpe: 8, restSeconds: 180, tempo: '2-2-1-0', notes: 'Zero rimbalzo.' },
            { name: 'Stacco Rumeno con Bilanciere', muscleGroup: 'FEMORALI', sets: 3, reps: '8', rir: 2, rpe: 8, restSeconds: 120, tempo: '3-1-1-0', notes: 'Tensione femorale.' },
            { name: 'Plank con Sovraccarico', muscleGroup: 'ADDOME', sets: 3, reps: '45s', rir: 1, rpe: 9, restSeconds: 60, tempo: 'Hold', notes: 'Bracing addominale massimo.' }
          ]
        },
        {
          name: 'Giorno 4 - Panca Variante & Upper Accessory',
          dayNumber: 4,
          exercises: [
            { name: 'Panca Presa Stretta (Close Grip)', muscleGroup: 'TRICIPITI', sets: 4, reps: '6-8', rir: 1.5, rpe: 8.5, restSeconds: 150, tempo: '3-1-1-0', notes: 'Larghezza spalle.' },
            { name: 'Military Press con Bilanciere in Piedi', muscleGroup: 'SPALLE', sets: 4, reps: '5-6', rir: 2, rpe: 8, restSeconds: 150, tempo: '2-1-1-0', notes: 'Lockout completo.' },
            { name: 'Seal Row / Pulley Presa Larga', muscleGroup: 'SCHIENA', sets: 4, reps: '8-10', rir: 1, rpe: 9, restSeconds: 90, tempo: '2-0-1-1', notes: 'Alta attivazione romboidi.' },
            { name: 'Curl Bicipiti con Manubri', muscleGroup: 'BICIPITI', sets: 4, reps: '10-12', rir: 1, rpe: 9, restSeconds: 60, tempo: '2-0-1-0', notes: 'Supinazione attiva.' }
          ]
        }
      ]
    }
  },
  {
    slug: 'gs-aesthetic-5d-pplul',
    title: 'GS Aesthetic Blueprint: 5-Day Hybrid Split',
    description: 'Split ibrido a 5 giorni per massimizzare simmetria, sviluppo di spalle, braccia e densità muscolare. Ideale per atleti intermedi/avanzati orientati al Bodybuilding.',
    author: 'Giammaria Loi',
    source: 'PRESET',
    status: 'published',
    difficulty: 'Advanced',
    primary_goal: 'Bodybuilding',
    secondary_goals: ['Hypertrophy', 'Focus Spalle e Braccia', 'Definizione / Cut'],
    training_frequency: 5,
    duration_weeks: 16,
    equipment_requirements: ['Palestra Commerciale Completa', 'Cavi', 'Macchine Convergenti'],
    categories: ['Bodybuilding', 'Push/Pull/Legs', 'Aesthetics'],
    tags: ['Bodybuilding', '5 Giorni', 'Aesthetics', 'Volume'],
    cover_url: null,
    version: '1.0.0',
    version_number: 1,
    structure: {
      name: 'GS Aesthetic Blueprint: 5-Day Hybrid Split',
      weeksCount: 16,
      split: 'Push / Pull / Legs / Upper / Lower (5 Days)',
      sessions: [
        { name: 'Sessione 1 - Push (Petto, Spalle, Tricipiti)', dayNumber: 1, exercises: [
          { name: 'Spinte con Manubri su Panca Inclinata', muscleGroup: 'PETTO', sets: 4, reps: '8-10', rir: 1, rpe: 9, restSeconds: 120, tempo: '2-1-1-0', notes: '' },
          { name: 'Chest Press Convergente', muscleGroup: 'PETTO', sets: 3, reps: '10-12', rir: 0, rpe: 10, restSeconds: 90, tempo: '2-0-1-1', notes: '' },
          { name: 'Alzate Laterali con Manubri', muscleGroup: 'SPALLE', sets: 4, reps: '12-15', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-0-1-0', notes: '' },
          { name: 'Dip alle Parallele', muscleGroup: 'PETTO', sets: 3, reps: '8-10', rir: 1, rpe: 9, restSeconds: 90, tempo: '2-1-1-0', notes: '' },
          { name: 'Triceps Pushdown alla Corda', muscleGroup: 'TRICIPITI', sets: 4, reps: '12-15', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-0-1-1', notes: '' }
        ]},
        { name: 'Sessione 2 - Pull (Schiena, Deltoidi Post., Bicipiti)', dayNumber: 2, exercises: [
          { name: 'Lat Machine Presa Neutra', muscleGroup: 'SCHIENA', sets: 4, reps: '8-10', rir: 1, rpe: 9, restSeconds: 120, tempo: '2-0-1-1', notes: '' },
          { name: 'Rematore con Supporto al Petto (Chest Supported Row)', muscleGroup: 'SCHIENA', sets: 4, reps: '10-12', rir: 1, rpe: 9, restSeconds: 90, tempo: '2-0-1-1', notes: '' },
          { name: 'Pullover al Cavo Alto', muscleGroup: 'SCHIENA', sets: 3, reps: '12-15', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-1-1-0', notes: '' },
          { name: 'Face Pull con Corda', muscleGroup: 'SPALLE', sets: 4, reps: '15-20', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-0-1-1', notes: '' },
          { name: 'Incline Dumbbell Biceps Curl', muscleGroup: 'BICIPITI', sets: 4, reps: '10-12', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-1-1-0', notes: '' }
        ]},
        { name: 'Sessione 3 - Legs & Abs (Gambe & Core)', dayNumber: 3, exercises: [
          { name: 'Hack Squat alla Macchina', muscleGroup: 'QUADRICIPITI', sets: 4, reps: '8-10', rir: 1, rpe: 9, restSeconds: 150, tempo: '3-1-1-0', notes: '' },
          { name: 'Lying Leg Curl', muscleGroup: 'FEMORALI', sets: 4, reps: '10-12', rir: 0, rpe: 10, restSeconds: 90, tempo: '2-0-1-1', notes: '' },
          { name: 'Leg Extension', muscleGroup: 'QUADRICIPITI', sets: 3, reps: '12-15', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-0-1-1', notes: '' },
          { name: 'Standing Calf Raise', muscleGroup: 'POLPACCI', sets: 4, reps: '15', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-2-1-0', notes: '' },
          { name: 'Hanging Leg Raise (Alzate Gambe alla Sbarra)', muscleGroup: 'ADDOME', sets: 4, reps: '12-15', rir: 1, rpe: 9, restSeconds: 60, tempo: '2-0-1-0', notes: '' }
        ]},
        { name: 'Sessione 4 - Upper Focus Aesthetics', dayNumber: 4, exercises: [
          { name: 'Panca Piana con Manubri', muscleGroup: 'PETTO', sets: 4, reps: '8-10', rir: 1, rpe: 9, restSeconds: 120, tempo: '2-1-1-0', notes: '' },
          { name: 'Trazioni alla Sbarra / Lat Machine Presa Inversa', muscleGroup: 'SCHIENA', sets: 4, reps: '8-10', rir: 1, rpe: 9, restSeconds: 90, tempo: '2-0-1-1', notes: '' },
          { name: 'Alzate Laterali ai Cavi Unilaterali', muscleGroup: 'SPALLE', sets: 4, reps: '12-15', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-0-1-1', notes: '' },
          { name: 'Preacher Curl alla Panca Scott', muscleGroup: 'BICIPITI', sets: 3, reps: '10-12', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-1-1-0', notes: '' },
          { name: 'Overhead Cable Triceps Extension', muscleGroup: 'TRICIPITI', sets: 3, reps: '12-15', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-0-1-1', notes: '' }
        ]},
        { name: 'Sessione 5 - Lower Posterior & Arms Finish', dayNumber: 5, exercises: [
          { name: 'Romanian Deadlift con Bilanciere', muscleGroup: 'FEMORALI', sets: 4, reps: '8-10', rir: 2, rpe: 8, restSeconds: 120, tempo: '3-1-1-0', notes: '' },
          { name: 'Bulgarian Split Squat', muscleGroup: 'QUADRICIPITI', sets: 3, reps: '10-12', rir: 1, rpe: 9, restSeconds: 90, tempo: '2-1-1-0', notes: '' },
          { name: 'Seated Leg Curl', muscleGroup: 'FEMORALI', sets: 3, reps: '12-15', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-0-1-1', notes: '' },
          { name: 'Hammer Curl con Manubri', muscleGroup: 'BICIPITI', sets: 3, reps: '10-12', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-0-1-0', notes: '' },
          { name: 'Calf Seduto alla Macchina', muscleGroup: 'POLPACCI', sets: 4, reps: '15-20', rir: 0, rpe: 10, restSeconds: 60, tempo: '2-2-1-0', notes: '' }
        ]}
      ]
    }
  },
  {
    slug: 'gs-foundation-3d-fullbody',
    title: 'GS Foundation Full-Body Recomposition',
    description: 'Programma fondamentale su 3 giorni full body basato sugli schemi motori multiarticolari principali. Ottimizzato per principianti o atleti con tempo limitato.',
    author: 'Giammaria Loi',
    source: 'PRESET',
    status: 'published',
    difficulty: 'Beginner',
    primary_goal: 'General Fitness',
    secondary_goals: ['Ricomposizione Corporea', 'Apprendimento Motorio', 'Forza Base'],
    training_frequency: 3,
    duration_weeks: 8,
    equipment_requirements: ['Palestra Base', 'Bilanciere', 'Manubri', 'Panca'],
    categories: ['General Fitness', 'Full Body', 'Beginner'],
    tags: ['Full Body', '3 Giorni', 'Principiante', 'Recomp'],
    cover_url: null,
    version: '1.0.0',
    version_number: 1,
    structure: {
      name: 'GS Foundation Full-Body Recomposition',
      weeksCount: 8,
      split: 'Full Body (3 Days)',
      sessions: [
        { name: 'Giorno A - Full Body Squat & Push', dayNumber: 1, exercises: [
          { name: 'Squat con Bilanciere o Goblet Squat', muscleGroup: 'QUADRICIPITI', sets: 3, reps: '8-10', rir: 2, rpe: 8, restSeconds: 120, tempo: '2-1-1-0', notes: 'Focus tecnica e profondità.' },
          { name: 'Panca Piana con Bilanciere o Manubri', muscleGroup: 'PETTO', sets: 3, reps: '8-10', rir: 2, rpe: 8, restSeconds: 120, tempo: '2-1-1-0', notes: 'Traiettoria bilanciata.' },
          { name: 'Lat Machine o Trazioni Assistite', muscleGroup: 'SCHIENA', sets: 3, reps: '8-10', rir: 2, rpe: 8, restSeconds: 90, tempo: '2-0-1-1', notes: 'Attivazione dorsale.' },
          { name: 'Alzate Laterali Manubri', muscleGroup: 'SPALLE', sets: 3, reps: '12-15', rir: 1, rpe: 9, restSeconds: 60, tempo: '2-0-1-0', notes: '' },
          { name: 'Plank Addominale', muscleGroup: 'ADDOME', sets: 3, reps: '40s', rir: 1, rpe: 9, restSeconds: 60, tempo: 'Hold', notes: '' }
        ]},
        { name: 'Giorno B - Full Body Hinge & Overhead Press', dayNumber: 2, exercises: [
          { name: 'Stacco da Terra con Bilanciere o Manubri', muscleGroup: 'FEMORALI', sets: 3, reps: '6-8', rir: 2, rpe: 8, restSeconds: 150, tempo: '2-1-1-0', notes: 'Cerniera d\'anca impeccabile.' },
          { name: 'Military Press / Spinte Spalle Manubri', muscleGroup: 'SPALLE', sets: 3, reps: '8-10', rir: 2, rpe: 8, restSeconds: 120, tempo: '2-1-1-0', notes: '' },
          { name: 'Pulley Basso o Rematore con Manubrio', muscleGroup: 'SCHIENA', sets: 3, reps: '10-12', rir: 2, rpe: 8, restSeconds: 90, tempo: '2-0-1-1', notes: '' },
          { name: 'Leg Extension', muscleGroup: 'QUADRICIPITI', sets: 3, reps: '12-15', rir: 1, rpe: 9, restSeconds: 60, tempo: '2-0-1-1', notes: '' },
          { name: 'Curl Bicipiti con Manubri', muscleGroup: 'BICIPITI', sets: 3, reps: '10-12', rir: 1, rpe: 9, restSeconds: 60, tempo: '2-0-1-0', notes: '' }
        ]},
        { name: 'Giorno C - Full Body Lunge & Upper Balance', dayNumber: 3, exercises: [
          { name: 'Affondi con Manubri o Leg Press', muscleGroup: 'QUADRICIPITI', sets: 3, reps: '10-12', rir: 2, rpe: 8, restSeconds: 90, tempo: '2-0-1-0', notes: '' },
          { name: 'Spinte Manubri su Panca Inclinata', muscleGroup: 'PETTO', sets: 3, reps: '8-10', rir: 2, rpe: 8, restSeconds: 90, tempo: '2-1-1-0', notes: '' },
          { name: 'Rematore al Cavo o con Bilanciere', muscleGroup: 'SCHIENA', sets: 3, reps: '8-10', rir: 2, rpe: 8, restSeconds: 90, tempo: '2-0-1-0', notes: '' },
          { name: 'Leg Curl Seduto', muscleGroup: 'FEMORALI', sets: 3, reps: '12-15', rir: 1, rpe: 9, restSeconds: 60, tempo: '2-0-1-1', notes: '' },
          { name: 'French Press o Pushdown Tricipiti', muscleGroup: 'TRICIPITI', sets: 3, reps: '10-12', rir: 1, rpe: 9, restSeconds: 60, tempo: '2-0-1-0', notes: '' }
        ]}
      ]
    }
  },
  {
    slug: 'gs-athletic-4d-performance',
    title: 'GS Hybrid Athlete Performance',
    description: 'Protocollo integrato su 4 giorni per lo sviluppo di forza massimale, potenza esplosiva, conditioning e resistenza muscolare per atleti ibridi e multidisciplinari.',
    author: 'Giammaria Loi',
    source: 'PRESET',
    status: 'published',
    difficulty: 'Intermediate',
    primary_goal: 'Athletic Performance',
    secondary_goals: ['Potenza Esplosiva', 'Conditioning', 'Ipertrofia Funzionale'],
    training_frequency: 4,
    duration_weeks: 8,
    equipment_requirements: ['Bilanciere', 'Kettlebell', 'Trap Bar', 'Panca'],
    categories: ['Athletic Performance', 'Hybrid', 'Conditioning'],
    tags: ['Atletica', '4 Giorni', 'Potenza', 'Hybrid'],
    cover_url: null,
    version: '1.0.0',
    version_number: 1,
    structure: {
      name: 'GS Hybrid Athlete Performance',
      weeksCount: 8,
      split: 'Power, Strength & Conditioning (4 Days)',
      sessions: [
        { name: 'Sessione 1 - Lower Power & Strength', dayNumber: 1, exercises: [
          { name: 'Trap Bar Deadlift (Jumps o Carico Pesante)', muscleGroup: 'SCHIENA', sets: 4, reps: '5', rir: 2, rpe: 8, restSeconds: 150, tempo: '1-0-X-0', notes: 'Massima accelerazione.' },
          { name: 'Front Squat con Bilanciere', muscleGroup: 'QUADRICIPITI', sets: 3, reps: '6-8', rir: 2, rpe: 8, restSeconds: 120, tempo: '2-1-1-0', notes: '' },
          { name: 'Kettlebell Swing Esplosivo', muscleGroup: 'FEMORALI', sets: 4, reps: '12', rir: 1, rpe: 9, restSeconds: 60, tempo: '1-0-X-0', notes: '' },
          { name: 'Farmer\'s Walk con Trap Bar / Manubri', muscleGroup: 'TRAPEZI', sets: 3, reps: '30m', rir: 1, rpe: 9, restSeconds: 90, tempo: 'Walk', notes: 'Presa e core compatto.' }
        ]},
        { name: 'Sessione 2 - Upper Power & Horizontal Push/Pull', dayNumber: 2, exercises: [
          { name: 'Panca Piana con Bilanciere (Velocità / Forza)', muscleGroup: 'PETTO', sets: 4, reps: '5-6', rir: 2, rpe: 8, restSeconds: 120, tempo: '2-1-X-0', notes: '' },
          { name: 'Pendlay Row con Bilanciere', muscleGroup: 'SCHIENA', sets: 4, reps: '6-8', rir: 2, rpe: 8, restSeconds: 90, tempo: '1-0-1-0', notes: 'Reset ad ogni ripetizione.' },
          { name: 'Push Press con Bilanciere', muscleGroup: 'SPALLE', sets: 3, reps: '6', rir: 2, rpe: 8, restSeconds: 90, tempo: '1-1-X-0', notes: 'Spinta con le gambe.' },
          { name: 'Pull-Up Zavorrate', muscleGroup: 'SCHIENA', sets: 3, reps: '6-8', rir: 1, rpe: 9, restSeconds: 90, tempo: '2-0-1-1', notes: '' }
        ]},
        { name: 'Sessione 3 - Unilateral Strength & Core Control', dayNumber: 3, exercises: [
          { name: 'Bulgarian Split Squat con Manubri', muscleGroup: 'QUADRICIPITI', sets: 3, reps: '8 per gamba', rir: 2, rpe: 8, restSeconds: 90, tempo: '2-1-1-0', notes: '' },
          { name: 'Single Leg Romanian Deadlift', muscleGroup: 'FEMORALI', sets: 3, reps: '8 per gamba', rir: 2, rpe: 8, restSeconds: 90, tempo: '2-1-1-0', notes: '' },
          { name: 'Landmine Press a Un Braccio', muscleGroup: 'SPALLE', sets: 3, reps: '10 per braccio', rir: 1, rpe: 9, restSeconds: 60, tempo: '2-0-1-0', notes: '' },
          { name: 'Pallof Press al Cavo', muscleGroup: 'ADDOME', sets: 3, reps: '12 per lato', rir: 1, rpe: 9, restSeconds: 45, tempo: 'Hold 2s', notes: 'Anti-rotazione pura.' }
        ]},
        { name: 'Sessione 4 - Metabolic Conditioning & Hypertrophy', dayNumber: 4, exercises: [
          { name: 'Chin-Up (Trazioni Presa Supina)', muscleGroup: 'BICIPITI', sets: 3, reps: '8-10', rir: 1, rpe: 9, restSeconds: 75, tempo: '2-0-1-0', notes: '' },
          { name: 'Dips alle Parallele', muscleGroup: 'PETTO', sets: 3, reps: '10-12', rir: 1, rpe: 9, restSeconds: 75, tempo: '2-1-1-0', notes: '' },
          { name: 'Lateral Raise ai Cavi', muscleGroup: 'SPALLE', sets: 4, reps: '12-15', rir: 0, rpe: 10, restSeconds: 45, tempo: '2-0-1-1', notes: '' },
          { name: 'Ab Wheel Rollout', muscleGroup: 'ADDOME', sets: 3, reps: '10-12', rir: 1, rpe: 9, restSeconds: 60, tempo: '2-1-1-0', notes: '' }
        ]}
      ]
    }
  }
];

async function seedProgramTemplates(dbClient) {
  for (const t of INITIAL_PROGRAM_TEMPLATES) {
    await dbClient.query(
      `INSERT INTO app_program_templates (
        slug, title, description, author, source, status, difficulty,
        primary_goal, secondary_goals, training_frequency, duration_weeks,
        equipment_requirements, categories, tags, cover_url, version, version_number, structure, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        author = EXCLUDED.author,
        difficulty = EXCLUDED.difficulty,
        primary_goal = EXCLUDED.primary_goal,
        secondary_goals = EXCLUDED.secondary_goals,
        training_frequency = EXCLUDED.training_frequency,
        duration_weeks = EXCLUDED.duration_weeks,
        equipment_requirements = EXCLUDED.equipment_requirements,
        categories = EXCLUDED.categories,
        tags = EXCLUDED.tags,
        version = EXCLUDED.version,
        version_number = EXCLUDED.version_number,
        structure = EXCLUDED.structure,
        updated_at = NOW()`,
      [
        t.slug, t.title, t.description, t.author, t.source, t.status, t.difficulty,
        t.primary_goal, JSON.stringify(t.secondary_goals), t.training_frequency, t.duration_weeks,
        JSON.stringify(t.equipment_requirements), JSON.stringify(t.categories), JSON.stringify(t.tags),
        t.cover_url, t.version, t.version_number, JSON.stringify(t.structure)
      ]
    );
  }
}


initDb();

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  if (!hash || !password) return false;
  return bcrypt.compare(password, hash);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function splitFullName(fullName) {
  const clean = String(fullName || "").trim();
  if (!clean) return { firstName: "", lastName: "" };
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

function formatUserPayload(user, profile = null) {
  const { firstName, lastName } = splitFullName(user?.name);
  const fName = user?.first_name || profile?.first_name || firstName || "";
  const lName = user?.last_name || profile?.last_name || lastName || "";
  const fullName = user?.name || [fName, lName].filter(Boolean).join(" ") || user?.email?.split("@")[0] || "Atleta";
  return {
    id: String(user.id),
    email: user.email,
    name: fullName,
    first_name: fName || null,
    last_name: lName || null,
    provider: user.provider || "email",
    avatarUrl: user.avatar_url || null,
    status: user.status || "active",
    role: user.role || "athlete",
    created_at: user.created_at || null,
    last_login_at: user.last_login_at || null
  };
}

async function getOrInitAthleteProfile(dbClientOrPool, userId, defaults = {}) {
  const res = await dbClientOrPool.query(
    "SELECT id, user_id, first_name, last_name, TO_CHAR(birth_date, 'YYYY-MM-DD') AS birth_date, gender, country, language, height_cm, weight_kg, primary_goal, secondary_goals, experience_level, training_frequency, intensity_type, notes, created_at, updated_at FROM app_athlete_profiles WHERE user_id = $1",
    [userId]
  );
  if (res.rows.length) return res.rows[0];
  const fName = defaults.firstName || defaults.first_name || "";
  const lName = defaults.lastName || defaults.last_name || "";
  const ins = await dbClientOrPool.query(
    `INSERT INTO app_athlete_profiles (user_id, first_name, last_name, country, language, training_frequency, intensity_type)
     VALUES ($1, $2, $3, 'IT', 'it', 4, 'RIR')
     ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
     RETURNING id, user_id, first_name, last_name, TO_CHAR(birth_date, 'YYYY-MM-DD') AS birth_date, gender, country, language, height_cm, weight_kg, primary_goal, secondary_goals, experience_level, training_frequency, intensity_type, notes, created_at, updated_at`,
    [userId, fName || null, lName || null]
  );
  return ins.rows[0];
}

const JWT_SECRET = process.env.JWT_SECRET
  || (process.env.NODE_ENV === "production"
    ? crypto.createHash("sha256").update(`nurvan|${process.env.DATABASE_URL || "no-db"}`).digest("hex")
    : "gs-coach-dev-only-not-for-production");
if (!process.env.JWT_SECRET) {
  console.warn("[SECURITY] JWT_SECRET is not set. Using derived fallback — set JWT_SECRET in production.");
}
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.warn("[SECURITY] JWT_SECRET missing in production — derived secret in use so auth stays available.");
}
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || "com.giammaria.system";

function issueAccountToken(user) {
  if (!JWT_SECRET) {
    throw Object.assign(new Error("JWT_SECRET non configurato sul server."), { statusCode: 503 });
  }
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      name: user.name,
      provider: user.provider
    },
    JWT_SECRET,
    { expiresIn: "90d" }
  );
}

async function accountFromBearer(authHeader) {
  if (!JWT_SECRET) return null;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || !payload.sub) return null;
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      provider: payload.provider
    };
  } catch (_) {
    return null;
  }
}

async function resolveOAuthUser({ email, name, provider, providerId, avatarUrl, linkingUser }) {
  const normalized = normalizeEmail(email);
  if (!normalized) throw Object.assign(new Error("Missing user email from identity provider."), { statusCode: 400 });
  const { firstName, lastName } = splitFullName(name);

  if (linkingUser && linkingUser.id) {
    const updated = await pool.query(
      `UPDATE app_users
       SET email = $1,
           name = COALESCE($2, name),
           first_name = COALESCE(first_name, $3),
           last_name = COALESCE(last_name, $4),
           provider = $5,
           provider_id = $6,
           avatar_url = COALESCE($7, avatar_url),
           last_login_at = NOW(),
           updated_at = NOW()
       WHERE id = $8
       RETURNING id, email, name, first_name, last_name, provider, provider_id, avatar_url, status, role, created_at, last_login_at`,
      [normalized, name, firstName || null, lastName || null, provider, providerId, avatarUrl || null, linkingUser.id]
    );
    if (updated.rows.length) {
      await getOrInitAthleteProfile(pool, updated.rows[0].id, { firstName, lastName });
      return updated.rows[0];
    }
  }

  const existing = await pool.query(
    "SELECT id, email, name, first_name, last_name, provider, provider_id, avatar_url, status, role, created_at, last_login_at FROM app_users WHERE email = $1",
    [normalized]
  );
  if (existing.rows.length) {
    const updated = await pool.query(
      `UPDATE app_users
       SET name = COALESCE($1, name),
           first_name = COALESCE(first_name, $2),
           last_name = COALESCE(last_name, $3),
           provider = $4,
           provider_id = $5,
           avatar_url = COALESCE($6, avatar_url),
           last_login_at = NOW(),
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, email, name, first_name, last_name, provider, provider_id, avatar_url, status, role, created_at, last_login_at`,
      [name, firstName || null, lastName || null, provider, providerId, avatarUrl || null, existing.rows[0].id]
    );
    const user = updated.rows[0];
    await getOrInitAthleteProfile(pool, user.id, { firstName, lastName });
    return user;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const created = await client.query(
      `INSERT INTO app_users(email, name, first_name, last_name, provider, provider_id, avatar_url, last_login_at)
       VALUES($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, email, name, first_name, last_name, provider, provider_id, avatar_url, status, role, created_at, last_login_at`,
      [normalized, name || normalized.split("@")[0], firstName || null, lastName || null, provider, providerId, avatarUrl || null]
    );
    const user = created.rows[0];
    await client.query("INSERT INTO app_account_data(user_id, data) VALUES($1, '{}'::jsonb) ON CONFLICT (user_id) DO NOTHING", [user.id]);
    await getOrInitAthleteProfile(client, user.id, { firstName, lastName });
    await client.query("COMMIT");
    return user;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw error;
  } finally {
    client.release();
  }
}

async function verifyGoogleCredential(idToken) {
  if (!idToken) throw Object.assign(new Error("Missing Google ID token."), { statusCode: 400 });
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    throw Object.assign(new Error("Failed to verify Google ID token with Google servers."), { statusCode: 401 });
  }
  const payload = await response.json();
  if (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID) {
    throw Object.assign(new Error("Google token client ID does not match the configured web client ID."), { statusCode: 401 });
  }
  return {
    email: payload.email,
    name: payload.name || payload.email,
    provider: "google",
    providerId: payload.sub,
    avatarUrl: payload.picture || null
  };
}

async function verifyAppleCredential(idToken, userPayload) {
  if (!idToken) throw Object.assign(new Error("Missing Apple identity token."), { statusCode: 400 });
  const decoded = jwt.decode(idToken);
  if (!decoded || !decoded.sub || !decoded.email) {
    throw Object.assign(new Error("Malformed Apple identity token."), { statusCode: 400 });
  }
  if (decoded.iss !== "https://appleid.apple.com") {
    throw Object.assign(new Error("Invalid Apple token issuer."), { statusCode: 401 });
  }
  if (APPLE_BUNDLE_ID && decoded.aud !== APPLE_BUNDLE_ID) {
    throw Object.assign(new Error("Apple token audience does not match the configured bundle ID."), { statusCode: 401 });
  }
  let name = "";
  if (userPayload?.name) {
    name = [userPayload.name.firstName, userPayload.name.lastName].filter(Boolean).join(" ");
  }
  return {
    email: decoded.email,
    name: name || decoded.email,
    provider: "apple",
    providerId: decoded.sub,
    avatarUrl: null
  };
}

async function issueOAuthResponse(req, res, identity) {
  const user = await resolveOAuthUser({ ...identity, linkingUser: await accountFromBearer(req.headers.authorization) });
  const profile = await getOrInitAthleteProfile(pool, user.id, { firstName: user.first_name, lastName: user.last_name });
  return res.json({
    token: issueAccountToken(user),
    user: formatUserPayload(user, profile),
    profile
  });
}



// Task 9A: Storage Adapter Abstract Interface & Local Storage Implementation
class StorageAdapter {
  async save(buffer, filename, mimeType) { throw new Error("Not implemented"); }
  async get(storagePath) { throw new Error("Not implemented"); }
  async delete(storagePath) { throw new Error("Not implemented"); }
}

class LocalStorageAdapter extends StorageAdapter {
  constructor(baseDir = "./uploads") {
    super();
    this.baseDir = path.resolve(baseDir);
    if (!fsSync.existsSync(this.baseDir)) {
      try {
        fsSync.mkdirSync(this.baseDir, { recursive: true });
      } catch (e) {
        console.warn("Storage directory creation deferred:", e.message);
      }
    }
  }

  async save(buffer, safeFilename, mimeType) {
    if (!fsSync.existsSync(this.baseDir)) {
      fsSync.mkdirSync(this.baseDir, { recursive: true });
    }
    const safeBase = path.basename(safeFilename);
    const fullPath = path.join(this.baseDir, safeBase);
    await fs.promises.writeFile(fullPath, buffer);
    return {
      storage_path: safeBase,
      storage_provider: 'local',
      full_path: fullPath
    };
  }

  async get(storagePath) {
    const safeBase = path.basename(storagePath);
    const fullPath = path.join(this.baseDir, safeBase);
    if (!fsSync.existsSync(fullPath)) return null;
    return fs.promises.readFile(fullPath);
  }

  async delete(storagePath) {
    const safeBase = path.basename(storagePath);
    const fullPath = path.join(this.baseDir, safeBase);
    if (fsSync.existsSync(fullPath)) {
      try {
        await fs.promises.unlink(fullPath);
      } catch (e) {
        console.warn("File delete error:", e.message);
      }
    }
    return true;
  }
}

const storageAdapter = new LocalStorageAdapter(process.env.IMPORT_STORAGE_DIR || "./uploads");

const ALLOWED_IMPORT_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png", ".webp", ".txt"
]);

const ALLOWED_IMPORT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/octet-stream"
]);

function validateImportFile(file) {
  if (!file) {
    return { valid: false, error: "Nessun file fornito per il caricamento." };
  }

  const maxBytes = (Number(process.env.IMPORT_MAX_FILE_SIZE_MB) || 25) * 1024 * 1024;
  const size = file.size || (file.buffer ? file.buffer.length : 0);

  if (size <= 0) {
    return { valid: false, error: "Il file caricato è vuoto (0 byte)." };
  }

  if (size > maxBytes) {
    return { valid: false, error: `Il file supera la dimensione massima consentita di ${Math.round(maxBytes / (1024 * 1024))} MB.` };
  }

  const originalName = file.originalname || file.name || "document.txt";
  const ext = path.extname(originalName).toLowerCase();

  if (!ALLOWED_IMPORT_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Formato estensione non supportato (${ext}). Formati consentiti: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, WEBP, TXT.` };
  }

  const mime = String(file.mimetype || file.type || "").toLowerCase();
  if (mime && !ALLOWED_IMPORT_MIME_TYPES.has(mime) && !mime.startsWith("text/")) {
    return { valid: false, error: `Tipo MIME non supportato (${mime}).` };
  }

  return { valid: true, ext, size, originalName, mime: mime || "application/octet-stream" };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

function nullable(type) {
  return {
    type: [type, "null"]
  };
}

const setSchema = {
  type: "object",
  properties: {
    order: { type: "integer" },
    reps: nullable("string"),
    load: nullable("number"),
    load_unit: nullable("string"),
    percentage_1rm: nullable("number"),
    rpe: nullable("number"),
    rir: nullable("number"),
    rest_seconds: nullable("integer"),
    tempo: nullable("string"),
    set_type: nullable("string"),
    technique: nullable("string"),
    done: nullable("boolean")
  }
};

const workoutSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    source_summary: { type: "string" },
    assumptions: { type: "array", items: { type: "string" } },
    global_rules: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
    weeks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          week: { type: "integer" },
          label: { type: "string" },
          sessions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "string" },
                title: { type: "string" },
                is_bonus: nullable("boolean"),
                exercises: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      order: { type: "integer" },
                      movement: nullable("string"),
                      is_bonus: nullable("boolean"),
                      muscle_group: nullable("string"),
                      muscle_groups: { type: "array", items: { type: "string" } },
                      superset_id: nullable("string"),
                      sets: nullable("integer"),
                      sets_data: {
                        type: "array",
                        items: setSchema
                      },
                      reps: nullable("string"),
                      load: nullable("number"),
                      load_unit: nullable("string"),
                      percentage_1rm: nullable("number"),
                      rpe: nullable("number"),
                      rir: nullable("number"),
                      rest_seconds: nullable("integer"),
                      tempo: nullable("string"),
                      notes: nullable("string"),
                      progression_rule: nullable("string")
                    },
                    required: [
                      "name",
                      "order"
                    ]
                  }
                }
              },
              required: [
                "day",
                "exercises"
              ]
            }
          }
        },
        required: [
          "week",
          "sessions"
        ]
      }
    }
  },
  required: [
    "title",
    "weeks"
  ]
};

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("GEMINI_API_KEY is not configured on the server."), {
      statusCode: 500
    });
  }
  return new GoogleGenAI({ apiKey });
}

function cloneWeekWithUniqueIds(templateWeek, newWeekNum) {
  const copy = JSON.parse(JSON.stringify(templateWeek));
  copy.id = `w${newWeekNum}`;
  copy.week = newWeekNum;
  copy.weekNumber = newWeekNum;
  copy.label = `Settimana ${newWeekNum}`;

  const sessions = copy.sessions || copy.days || [];
  sessions.forEach((s, sIdx) => {
    s.id = `${copy.id}_s${sIdx + 1}`;
    s.day = s.day || `Giorno ${sIdx + 1}`;
    const exercises = s.exercises || s.rows || [];
    exercises.forEach((e, eIdx) => {
      e.id = `${s.id}_e${eIdx + 1}`;
      if (e.superset_id) {
        const baseSs = String(e.superset_id).replace(/^ss_w\d+_/, "");
        e.superset_id = `ss_w${newWeekNum}_${baseSs}`;
      }
      if (Array.isArray(e.sets)) {
        e.sets.forEach((st, stIdx) => {
          st.id = `${e.id}_s${stIdx + 1}`;
          st.order = stIdx + 1;
        });
      }
    });
    s.exercises = exercises;
    s.rows = exercises;
  });
  copy.sessions = sessions;
  copy.days = sessions;
  return copy;
}

// Canonical Program Modifier Engine
function applyOperationsToProgram(program, operations) {
  if (!program || typeof program !== "object") {
    throw new Error("Programma non valido o mancante.");
  }
  if (!Array.isArray(operations) || !operations.length) {
    return { ok: true, program, appliedCount: 0 };
  }

  const cloned = JSON.parse(JSON.stringify(program));
  if (!Array.isArray(cloned.weeks) || !cloned.weeks.length) {
    throw new Error("Il programma non contiene settimane valide.");
  }

  let appliedCount = 0;

  for (let opIdx = 0; opIdx < operations.length; opIdx++) {
    const op = operations[opIdx];
    if (!op || typeof op !== "object") continue;

    const type = op.type;
    const targetWeekNum = op.week;
    const targetSessionSpec = op.session;
    const targetExName = String(op.exercise || "").toLowerCase();
    const targetExId = op.exercise_id;
    const targetSetIndex = op.set_index;
    const changes = op.changes || {};

    if (type === "add_week") {
      const targetNum = Number(targetWeekNum) || (cloned.weeks.length + 1);
      while (cloned.weeks.length < targetNum) {
        const nextNum = cloned.weeks.length + 1;
        const sourceWeek = (changes.source_week && cloned.weeks[changes.source_week - 1]) || cloned.weeks[cloned.weeks.length - 1];
        const newWeek = cloneWeekWithUniqueIds(sourceWeek, nextNum);
        if (nextNum === targetNum) {
          if (changes.label) newWeek.label = changes.label;
          if (changes.notes) newWeek.notes = changes.notes;
          if (changes.title) newWeek.title = changes.title;
        }
        cloned.weeks.push(newWeek);
        appliedCount++;
      }
      if (targetNum <= cloned.weeks.length) {
        const existingWeek = cloned.weeks[targetNum - 1];
        if (existingWeek) {
          if (changes.label) existingWeek.label = changes.label;
          if (changes.notes) existingWeek.notes = changes.notes;
          if (changes.title) existingWeek.title = changes.title;
          appliedCount++;
        }
      }
      continue;
    }

    if (type === "extend_weeks" || type === "set_program_duration") {
      const desired = Number(changes.duration || op.weeks || targetWeekNum || 12);
      if (desired > cloned.weeks.length) {
        while (cloned.weeks.length < desired) {
          const nextNum = cloned.weeks.length + 1;
          const template = cloned.weeks[cloned.weeks.length - 1];
          const newWeek = cloneWeekWithUniqueIds(template, nextNum);
          cloned.weeks.push(newWeek);
          appliedCount++;
        }
      } else if (desired < cloned.weeks.length && desired >= 1) {
        cloned.weeks = cloned.weeks.slice(0, desired);
        appliedCount++;
      }
      continue;
    }

    if (type === "remove_week") {
      const weekIndex = cloned.weeks.findIndex(w => (w.weekNumber ?? w.week) === Number(targetWeekNum) || w.id === targetWeekNum || w.id === `w${targetWeekNum}`);
      if (weekIndex >= 0) {
        cloned.weeks.splice(weekIndex, 1);
        cloned.weeks.forEach((w, idx) => {
          w.week = idx + 1;
          w.weekNumber = idx + 1;
        });
        appliedCount++;
      }
      continue;
    }

    let weeksToModify = [];
    if (targetWeekNum === "all" || targetWeekNum == null) {
      weeksToModify = cloned.weeks;
    } else {
      weeksToModify = cloned.weeks.filter(w => (w.weekNumber ?? w.week) === Number(targetWeekNum) || w.id === targetWeekNum || w.id === `w${targetWeekNum}`);
    }

    if (!weeksToModify.length) {
      continue;
    }

    weeksToModify.forEach(w => {
      const sessions = w.sessions || w.days || [];
      let sessionsToModify = [];

      if (targetSessionSpec === "all" || targetSessionSpec == null) {
        sessionsToModify = sessions;
      } else if (typeof targetSessionSpec === "number") {
        const s = sessions[targetSessionSpec - 1];
        if (s) sessionsToModify.push(s);
      } else {
        const specStr = String(targetSessionSpec).toLowerCase();
        sessionsToModify = sessions.filter((s, idx) => {
          const dayMatch = String(s.day || "").toLowerCase().includes(specStr);
          const titleMatch = String(s.title || "").toLowerCase().includes(specStr);
          const numMatch = specStr.includes(String(idx + 1));
          return dayMatch || titleMatch || numMatch;
        });
        if (!sessionsToModify.length && sessions.length) {
          sessionsToModify.push(sessions[0]);
        }
      }

      if (!sessionsToModify.length) return;

      if (type === "add_session") {
        const newOrder = sessions.length + 1;
        const newS = {
          id: `${w.id || "w1"}_s${newOrder}`,
          day: changes.day || `Giorno ${newOrder}`,
          title: changes.title || `SESSIONE ${newOrder}`,
          is_bonus: Boolean(changes.is_bonus),
          exercises: []
        };
        sessions.push(newS);
        appliedCount++;
        return;
      }

      if (type === "remove_session") {
        const sIndex = sessions.findIndex((s, idx) => {
          if (typeof targetSessionSpec === "number") return idx === targetSessionSpec - 1;
          const specStr = String(targetSessionSpec).toLowerCase();
          return String(s.day || "").toLowerCase().includes(specStr) || String(s.title || "").toLowerCase().includes(specStr);
        });
        if (sIndex >= 0) {
          sessions.splice(sIndex, 1);
          appliedCount++;
        }
        return;
      }

      if (type === "modify_session") {
        sessionsToModify.forEach(s => {
          if (changes.title) s.title = changes.title;
          if (changes.day) s.day = changes.day;
          if (changes.is_bonus !== undefined) s.is_bonus = Boolean(changes.is_bonus);
          appliedCount++;
        });
        return;
      }

      sessionsToModify.forEach(s => {
        const exercises = s.exercises || s.rows || [];

        if (type === "add_exercise") {
          const exName = op.target_exercise || op.exercise || changes.name || "Nuovo Esercizio";
          const setsCount = Number(changes.sets || 3);
          const setsList = Array.from({ length: setsCount }, (_, i) => ({
            id: `${s.id || "s"}_e${exercises.length + 1}_s${i + 1}`,
            order: i + 1,
            reps: changes.reps || "8-10",
            load: changes.load != null ? Number(changes.load) : null,
            load_unit: changes.load_unit || "kg",
            percentage_1rm: changes.percentage_1rm != null ? Number(changes.percentage_1rm) : null,
            rpe: changes.rpe != null ? Number(changes.rpe) : null,
            rir: changes.rir != null ? Number(changes.rir) : 1,
            rest_seconds: changes.rest_seconds || 90,
            tempo: changes.tempo || "",
            done: false
          }));

          exercises.push({
            id: `${s.id || "s"}_e${exercises.length + 1}`,
            name: exName,
            exercise: exName,
            order: exercises.length + 1,
            movement: changes.movement || "ALTRO",
            muscle_groups: Array.isArray(changes.muscle_groups) ? changes.muscle_groups : (changes.muscle_group ? [changes.muscle_group] : []),
            muscle_group: changes.muscle_group || null,
            superset_id: changes.superset_id || null,
            notes: changes.notes || "",
            progression_rule: changes.progression_rule || "",
            is_bonus: Boolean(changes.is_bonus || s.is_bonus),
            sets: setsList,
            repsTarget: changes.reps || "8-10",
            rirTarget: changes.rir != null ? Number(changes.rir) : 1,
            rpeTarget: changes.rpe != null ? Number(changes.rpe) : null,
            rest: changes.rest || "90s",
            plannedLoad: changes.load != null ? Number(changes.load) : null,
            tempo: changes.tempo || ""
          });
          s.exercises = exercises;
          s.rows = exercises;
          appliedCount++;
          return;
        }

        if (type === "remove_exercise") {
          const initialLen = exercises.length;
          const filtered = exercises.filter(ex => {
            const matchName = targetExName && String(ex.name || ex.exercise || "").toLowerCase().includes(targetExName);
            const matchId = targetExId && ex.id === targetExId;
            return !(matchName || matchId);
          });
          s.exercises = filtered;
          s.rows = filtered;
          appliedCount += (initialLen - filtered.length);
          return;
        }

        if (type === "replace_exercise") {
          exercises.forEach(ex => {
            const matchName = targetExName && String(ex.name || ex.exercise || "").toLowerCase().includes(targetExName);
            const matchId = targetExId && ex.id === targetExId;
            if (matchName || matchId) {
              const newName = op.target_exercise || changes.name || "Esercizio Sostitutivo";
              ex.name = newName;
              ex.exercise = newName;
              if (changes.movement) ex.movement = changes.movement;
              if (changes.muscle_groups) ex.muscle_groups = changes.muscle_groups;
              if (changes.notes) ex.notes = changes.notes;
              appliedCount++;
            }
          });
          return;
        }

        if (type === "create_superset") {
          const ssId = changes.superset_id || `ss_${Date.now().toString(36)}`;
          const names = [targetExName, String(op.target_exercise || "").toLowerCase()].filter(Boolean);
          exercises.forEach(ex => {
            const currentName = String(ex.name || ex.exercise || "").toLowerCase();
            if (names.some(n => currentName.includes(n)) || (targetExId && ex.id === targetExId)) {
              ex.superset_id = ssId;
              appliedCount++;
            }
          });
          return;
        }

        if (type === "remove_superset") {
          exercises.forEach(ex => {
            const matchName = targetExName && String(ex.name || ex.exercise || "").toLowerCase().includes(targetExName);
            const matchId = targetExId && ex.id === targetExId;
            const matchSS = changes.superset_id && ex.superset_id === changes.superset_id;
            if (matchName || matchId || matchSS) {
              ex.superset_id = null;
              appliedCount++;
            }
          });
          return;
        }

        exercises.forEach(ex => {
          const matchName = targetExName && String(ex.name || ex.exercise || "").toLowerCase().includes(targetExName);
          const matchId = targetExId && ex.id === targetExId;
          if (!matchName && !matchId && targetExName) return;

          if (!Array.isArray(ex.sets)) {
            const n = typeof ex.sets === "number" ? ex.sets : 3;
            ex.sets = Array.from({ length: n }, (_, i) => ({
              id: `${ex.id}_s${i + 1}`,
              order: i + 1,
              reps: ex.repsTarget || ex.reps || "8-10",
              load: ex.plannedLoad || ex.load || null,
              load_unit: ex.load_unit || "kg",
              percentage_1rm: ex.percentage_1rm || null,
              rpe: ex.rpeTarget || ex.rpe || null,
              rir: ex.rirTarget || ex.rir || 1,
              rest_seconds: ex.rest_seconds || 90,
              tempo: ex.tempo || "",
              done: false
            }));
          }

          if (type === "add_set") {
            const newOrder = ex.sets.length + 1;
            ex.sets.push({
              id: `${ex.id}_s${newOrder}`,
              order: newOrder,
              reps: changes.reps || ex.sets[ex.sets.length - 1]?.reps || "8-10",
              load: changes.load != null ? Number(changes.load) : (ex.sets[ex.sets.length - 1]?.load || null),
              load_unit: changes.load_unit || "kg",
              percentage_1rm: changes.percentage_1rm != null ? Number(changes.percentage_1rm) : null,
              rpe: changes.rpe != null ? Number(changes.rpe) : null,
              rir: changes.rir != null ? Number(changes.rir) : 1,
              rest_seconds: changes.rest_seconds || 90,
              tempo: changes.tempo || ex.tempo || "",
              done: false
            });
            appliedCount++;
            return;
          }

          if (type === "remove_set") {
            if (ex.sets.length > 1) {
              const setIdx = targetSetIndex != null ? targetSetIndex - 1 : ex.sets.length - 1;
              if (setIdx >= 0 && setIdx < ex.sets.length) {
                ex.sets.splice(setIdx, 1);
                ex.sets.forEach((s, idx) => { s.order = idx + 1; });
                appliedCount++;
              }
            }
            return;
          }

          if (type === "modify_set") {
            const setIdx = targetSetIndex != null ? targetSetIndex - 1 : 0;
            const targetSet = ex.sets[setIdx];
            if (targetSet) {
              if (changes.load !== undefined) targetSet.load = changes.load != null ? Number(changes.load) : null;
              if (changes.reps !== undefined) targetSet.reps = changes.reps;
              if (changes.rpe !== undefined) targetSet.rpe = changes.rpe != null ? Number(changes.rpe) : null;
              if (changes.rir !== undefined) targetSet.rir = changes.rir != null ? Number(changes.rir) : null;
              if (changes.rest_seconds !== undefined) targetSet.rest_seconds = changes.rest_seconds;
              if (changes.tempo !== undefined) targetSet.tempo = changes.tempo;
              if (changes.done !== undefined) targetSet.done = Boolean(changes.done);
              appliedCount++;
            }
            return;
          }

          if (type === "modify_load") {
            const targetLoad = Number(changes.load);
            if (targetSetIndex != null) {
              const set = ex.sets[targetSetIndex - 1];
              if (set) { set.load = targetLoad; appliedCount++; }
            } else {
              ex.sets.forEach(s => { s.load = targetLoad; });
              ex.plannedLoad = targetLoad;
              appliedCount++;
            }
            return;
          }

          if (type === "modify_reps") {
            if (targetSetIndex != null) {
              const set = ex.sets[targetSetIndex - 1];
              if (set) { set.reps = changes.reps; appliedCount++; }
            } else {
              ex.sets.forEach(s => { s.reps = changes.reps; });
              ex.repsTarget = changes.reps;
              appliedCount++;
            }
            return;
          }

          if (type === "modify_rpe" || type === "modify_rir") {
            const val = changes.rpe !== undefined ? Number(changes.rpe) : Number(changes.rir);
            const field = type === "modify_rpe" ? "rpe" : "rir";
            if (targetSetIndex != null) {
              const set = ex.sets[targetSetIndex - 1];
              if (set) { set[field] = val; appliedCount++; }
            } else {
              ex.sets.forEach(s => { s[field] = val; });
              if (type === "modify_rpe") ex.rpeTarget = val; else ex.rirTarget = val;
              appliedCount++;
            }
            return;
          }

          if (type === "modify_rest") {
            const restVal = changes.rest || `${changes.rest_seconds}s`;
            ex.rest = restVal;
            ex.rest_seconds = changes.rest_seconds || parseInt(restVal, 10);
            ex.sets.forEach(s => { s.rest_seconds = ex.rest_seconds; });
            appliedCount++;
            return;
          }

          if (type === "modify_tempo") {
            ex.tempo = changes.tempo;
            ex.sets.forEach(s => { s.tempo = changes.tempo; });
            appliedCount++;
            return;
          }

          if (type === "modify_exercise") {
            if (changes.name) { ex.name = changes.name; ex.exercise = changes.name; }
            if (changes.movement) ex.movement = changes.movement;
            if (changes.notes) ex.notes = changes.notes;
            if (changes.reps) ex.repsTarget = changes.reps;
            if (changes.load != null) ex.plannedLoad = Number(changes.load);
            if (changes.rest) ex.rest = changes.rest;
            appliedCount++;
            return;
          }
        });
      });
    });
  }

  return { ok: true, program: cloned, appliedCount };
}

// Extractors for documents
async function extractLegacyWordText(buffer) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "giammaria-doc-"));
  const filename = path.join(dir, "document.doc");
  try {
    await fs.writeFile(filename, buffer);
    const extractor = new WordExtractor();
    const document = await extractor.extract(filename);
    return [document.getBody(), document.getHeaders(), document.getFootnotes()].filter(Boolean).join("\n\n");
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function extractExcelText(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, cellNF: true, cellFormula: true });
  if (!workbook.SheetNames || !workbook.SheetNames.length) throw new Error("Excel workbook contains no worksheets");
  return workbook.SheetNames.map((name, index) => {
    const sheet = workbook.Sheets[name];
    if (!sheet) return "";
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "", blankrows: false });
    if (!rows.length) return "";
    const rowLines = rows
      .map((row, rowIndex) => {
        const nonEmpty = row.map(v => v == null ? "" : String(v).trim()).filter(Boolean);
        if (!nonEmpty.length) return "";
        return `RIGA ${rowIndex + 1}: ${row.map(value => value == null ? "" : String(value).trim()).join(" | ")}`;
      })
      .filter(Boolean);
    if (!rowLines.length) return "";
    return [`FOGLIO ${index + 1}: ${name}`, ...rowLines].join("\n");
  }).filter(Boolean).join("\n\n");
}

function extractExcelStructuredPayload(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, cellNF: true, cellFormula: true });
  if (!workbook.SheetNames || !workbook.SheetNames.length) throw new Error("Excel workbook contains no worksheets");
  try {
    return extractExcelStructuredForApi(workbook, XLSX);
  } catch (_) {
    return null;
  }
}

function reconcileGeminiWorkout(structuredWorkout, rawTextHint) {
  if (!structuredWorkout || !Array.isArray(structuredWorkout.weeks)) return structuredWorkout;
  // First: classic row pad/trim
  for (const week of structuredWorkout.weeks) {
    for (const session of (week.sessions || [])) {
      for (const ex of (session.exercises || [])) {
        const info = resolveTargetSetCount(ex);
        const techs = detectTechniquesFromText(ex.name, ex.notes, ex.reps, ex.progression_rule);
        if (techs[0] && !ex.notes) ex.notes = techs[0].id.replace(/_/g, " ");
        const { sets } = reconcileSetRows(ex, (src, i, total, meta) => {
          const isLast = i === total - 1;
          const drop = meta.techniques?.[0]?.id === "drop_set" && isLast;
          return {
            order: i + 1,
            reps: src.reps != null ? String(src.reps) : (ex.reps != null ? String(ex.reps) : null),
            load: src.load != null ? Number(src.load) : (ex.load != null ? Number(ex.load) : null),
            load_unit: src.load_unit || ex.load_unit || "kg",
            percentage_1rm: src.percentage_1rm != null ? Number(src.percentage_1rm) : (ex.percentage_1rm != null ? Number(ex.percentage_1rm) : null),
            rpe: src.rpe != null ? Number(src.rpe) : (ex.rpe != null ? Number(ex.rpe) : null),
            rir: src.rir != null ? Number(src.rir) : (ex.rir != null ? Number(ex.rir) : null),
            rest_seconds: src.rest_seconds != null ? Number(src.rest_seconds) : (ex.rest_seconds != null ? Number(ex.rest_seconds) : null),
            tempo: src.tempo || ex.tempo || null,
            set_type: drop ? "dropset" : (src.set_type || "working"),
            technique: drop ? "drop_set" : (src.technique || null),
            done: Boolean(src.done)
          };
        });
        ex.sets = info.target || sets.length;
        ex.sets_count = sets.length;
        ex.sets_data = sets;
        if (info.mismatched) {
          structuredWorkout.warnings = structuredWorkout.warnings || [];
          structuredWorkout.warnings.push(
            `FIDELITY: "${ex.name}" sets dichiarate=${info.declared || info.fromText} vs model rows=${info.dataLen} → allineato a ${sets.length}`
          );
        }
      }
    }
  }
  // Then: literal prescription lock from raw document text (beats Gemini 3-row habit)
  try {
    if (rawTextHint) applyPrescriptionsToProgram(structuredWorkout, rawTextHint);
    enforceAllPrescriptions(structuredWorkout);
  } catch (err) {
    console.warn("[PRESCRIPTION_ENFORCE]", err?.message || err);
  }
  return structuredWorkout;
}

async function processDocumentAnalysis({ filename, mimeType, buffer }) {
  const ext = (filename || "").toLowerCase().split(".").pop();
  let parser = "unknown";
  const promptText = `Analizza questo documento (scheda allenamento / nutrizione / integrazione / terapia) ed estrai fedelmente TUTTO nel JSON richiesto.

REGOLE DI FEDELTÀ (NON NEGOZIABILI):
1. Non inventare esercizi, serie, ripetizioni, carichi, RPE, RIR, recuperi o progressioni.
2. Se un valore manca usa null — NON indovinare e NON usare default tipo 3 serie.
3. PATTERN NxM: "4x12", "4×12", "4*12", "4 serie x 12", "4 serie da 12" ⇒ sets=4 E sets_data DEVE avere ESATTAMENTE 4 elementi con reps="12".
4. sets (integer) DEVE essere uguale a sets_data.length. Mai meno. Se leggi 4 serie, emetti 4 oggetti in sets_data.
5. TECNICHE: se accanto all'esercizio c'è dropset / drop set / stripping ⇒ notes include "drop set", ultima serie set_type="dropset", technique="drop_set".
6. Altre tecniche (rest-pause, myo-reps, cluster, pause reps) ⇒ valorizza technique sulla serie interessata.
7. ESTRAZIONE COMPLETA: tutte le settimane, sessioni, esercizi. Non troncare.
8. BONUS/richiamo/opzionali ⇒ is_bonus: true.
9. GRUPPI MUSCOLARI: muscle_group / muscle_groups.
10. Per FOTO/SCANSIONI: leggi ogni riga della scheda come testo stampato; non omettere esercizi poco leggibili — segnalali in warnings.
11. Nutrizione/integrazione/terapia se presenti: mantieni struttura fedele senza diagnosi mediche.

Preserva ogni dato (serie, ripetizioni, carichi, recuperi, intensità, tecniche).`;

  let parts = [];
  let rawTextHint = "";

  // Prefer deterministic local Universal Import for Excel (no LLM cell invention)
  if (ext === "xlsx" || ext === "xls" || mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || mimeType === "application/vnd.ms-excel") {
    try {
      const local = await extractDocumentContent({ filename, mimeType, buffer });
      if (local?.canonicalProgram?.weeks?.length) {
        console.log(`[FILE_ANALYZE_LOCAL] filename="${filename}" parser="${local.parser}" weeks=${local.canonicalProgram.weeks.length}`);
        return {
          structuredWorkout: reconcileGeminiWorkout(local.canonicalProgram, local.rawText || ""),
          parser: local.parser || "xlsx_local_di",
          documentIR: local.documentIR || null
        };
      }
    } catch (localErr) {
      console.warn("[FILE_ANALYZE_LOCAL_FALLBACK]", localErr?.message || localErr);
    }
    parser = "xlsx_structured_di";
    console.log(`[FILE_ANALYZE_START] filename="${filename}" mime="${mimeType || 'application/vnd.ms-excel'}" byteLength=${buffer.length} parser="${parser}"`);
    const structured = extractExcelStructuredPayload(buffer);
    const textContent = extractExcelText(buffer);
    rawTextHint = textContent || "";
    const payload = structured
      ? `STRUCTURED_EXCEL_JSON (source of truth — do not invent cells):\n${JSON.stringify(structured).slice(0, 180000)}\n\nFLAT_PREVIEW:\n${textContent.slice(0, 40000)}`
      : textContent;
    parts = [{ text: `${promptText}\n\nDOCUMENT CONTENT (EXCEL):\n${payload}` }];
  } else if (ext === "pdf" || mimeType === "application/pdf") {
    parser = "gemini_pdf_inline";
    console.log(`[FILE_ANALYZE_START] filename="${filename}" mime="${mimeType || 'application/pdf'}" byteLength=${buffer.length} parser="${parser}"`);
    parts = [
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: "application/pdf"
        }
      },
      { text: promptText }
    ];
  } else if (
    ["png", "jpg", "jpeg", "webp", "heic", "gif"].includes(ext) ||
    String(mimeType || "").startsWith("image/")
  ) {
    parser = "gemini_image_vision";
    const mime = mimeType && String(mimeType).startsWith("image/")
      ? mimeType
      : (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg");
    console.log(`[FILE_ANALYZE_START] filename="${filename}" mime="${mime}" byteLength=${buffer.length} parser="${parser}"`);
    // Local OCR first (if available), then Vision with image bytes — never UTF-8-decode images
    let ocrHint = "";
    try {
      const local = await extractDocumentContent({ filename, mimeType: mime, buffer });
      if (local?.rawText && String(local.rawText).trim().length > 20) {
        ocrHint = `\n\nOCR_LOCAL_HINT (usa solo se coerente con l'immagine):\n${String(local.rawText).slice(0, 20000)}`;
      }
      // If local parse already found exercises with correct NxM, prefer it
      const weeks = local?.canonicalProgram?.weeks || [];
      const exCount = weeks.reduce((n, w) => n + (w.sessions || []).reduce((m, s) => m + ((s.exercises || []).length), 0), 0);
      if (exCount > 0 && local.parser !== "image_ocr_fallback") {
        console.log(`[FILE_ANALYZE_LOCAL_IMAGE] exercises=${exCount} parser=${local.parser}`);
        return {
          structuredWorkout: reconcileGeminiWorkout(local.canonicalProgram),
          parser: local.parser || "image_local_ocr",
          documentIR: local.documentIR || null
        };
      }
    } catch (imgLocalErr) {
      console.warn("[FILE_ANALYZE_IMAGE_LOCAL]", imgLocalErr?.message || imgLocalErr);
    }
    parts = [
      { inlineData: { data: buffer.toString("base64"), mimeType: mime } },
      { text: `${promptText}\n\nQuesta è una FOTO/SCANSIONE di una scheda. Estrai ogni esercizio leggibile.${ocrHint}` }
    ];
  } else if (ext === "docx" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    parser = "mammoth_docx";
    console.log(`[FILE_ANALYZE_START] filename="${filename}" mime="${mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}" byteLength=${buffer.length} parser="${parser}"`);
    try {
      const local = await extractDocumentContent({ filename, mimeType, buffer });
      if (local?.canonicalProgram?.weeks?.length) {
        const exCount = local.canonicalProgram.weeks.reduce((n, w) => n + (w.sessions || []).reduce((m, s) => m + ((s.exercises || []).length), 0), 0);
        if (exCount > 0) {
          return { structuredWorkout: reconcileGeminiWorkout(local.canonicalProgram), parser: local.parser || "docx_local_di", documentIR: local.documentIR || null };
        }
      }
    } catch (_) {}
    const extracted = await mammoth.extractRawText({ buffer });
    const textContent = extracted.value || "";
    parts = [{ text: `${promptText}\n\nDOCUMENT CONTENT (DOCX):\n${textContent}` }];
  } else if (ext === "doc" || mimeType === "application/msword") {
    parser = "word_extractor_doc";
    console.log(`[FILE_ANALYZE_START] filename="${filename}" mime="${mimeType || 'application/msword'}" byteLength=${buffer.length} parser="${parser}"`);
    const textContent = await extractLegacyWordText(buffer);
    if (!textContent.trim()) throw new Error("Legacy DOC contains no readable text");
    try {
      const localProg = parseCanonicalProgramFromText(textContent, filename);
      if (localProg?.canonicalProgram?.weeks?.length) {
        const exCount = localProg.canonicalProgram.weeks.reduce((n, w) => n + (w.sessions || []).reduce((m, s) => m + ((s.exercises || []).length), 0), 0);
        if (exCount > 0) {
          return { structuredWorkout: reconcileGeminiWorkout(localProg.canonicalProgram, textContent), parser: "doc_local_text" };
        }
      }
    } catch (_) {}
    parts = [{ text: `${promptText}\n\nDOCUMENT CONTENT (DOC):\n${textContent}` }];
  } else if (ext === "txt" || ext === "csv" || mimeType === "text/plain" || mimeType === "text/csv") {
    parser = "utf8_text_local_first";
    console.log(`[FILE_ANALYZE_START] filename="${filename}" mime="${mimeType || 'text/plain'}" byteLength=${buffer.length} parser="${parser}"`);
    const textContent = buffer.toString("utf-8");
    rawTextHint = textContent;
    try {
      const localProg = parseCanonicalProgramFromText(textContent, filename);
      const weeks = localProg?.canonicalProgram?.weeks || localProg?.program?.weeks || [];
      const exCount = weeks.reduce((n, w) => n + (w.sessions || []).reduce((m, s) => m + ((s.exercises || []).length), 0), 0);
      if (exCount > 0) {
        console.log(`[FILE_ANALYZE_LOCAL_TEXT] exercises=${exCount}`);
        return {
          structuredWorkout: reconcileGeminiWorkout(localProg.canonicalProgram || localProg.program, textContent),
          parser: "txt_local_parse"
        };
      }
    } catch (txtErr) {
      console.warn("[FILE_ANALYZE_TEXT_LOCAL]", txtErr?.message || txtErr);
    }
    parts = [{ text: `${promptText}\n\nDOCUMENT CONTENT (TXT):\n${textContent}` }];
  } else {
    parser = "fallback_text";
    console.log(`[FILE_ANALYZE_START] filename="${filename}" mime="${mimeType || 'application/octet-stream'}" byteLength=${buffer.length} parser="${parser}"`);
    const textContent = buffer.toString("utf-8");
    parts = [{ text: `${promptText}\n\nDOCUMENT CONTENT:\n${textContent}` }];
  }

  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseSchema: workoutSchema
    }
  });

  const replyText = (response.text || "").trim();
  if (!replyText) throw new Error("Gemini returned an empty document analysis response.");

  let structuredWorkout = JSON.parse(replyText);
  structuredWorkout = reconcileGeminiWorkout(structuredWorkout, rawTextHint);
  console.log(`[FILE_ANALYZE_END] filename="${filename}" parser="${parser}"`);
  return { structuredWorkout, parser };
}

// Routes
let aiGateway = null;

async function initAiGateway() {
  if (aiGateway) return aiGateway;
  aiGateway = await createAiGateway({
    resolveAuthUser: async (req) => accountFromBearer(req.headers.authorization),
    loadAccountData: async (userId) => {
      if (!process.env.DATABASE_URL || !pool) return null;
      try {
        const dataRes = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [userId]);
        return dataRes.rows[0]?.data || null;
      } catch (_) {
        return null;
      }
    }
  });
  return aiGateway;
}

// Eager init (non-blocking for boot)
initAiGateway().catch((err) => console.error("[AI_GATEWAY_INIT]", err?.message || err));

function buildHealthPayload() {
  const aiConfigured = Boolean(process.env.GEMINI_API_KEY) || process.env.MOCK_GEMINI === "1" || process.env.AI_PROVIDER === "mock";
  const payload = {
    ok: true,
    status: "healthy",
    model: MODEL,
    aiConfigured,
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    accountStorageConfigured: Boolean(process.env.DATABASE_URL),
    googleOAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID)
  };
  if (aiGateway) {
    Object.assign(payload, aiGateway.healthExtras());
  }
  return payload;
}

app.get("/health", (req, res) => {
  res.json(buildHealthPayload());
});

app.get("/api/health", (req, res) => {
  res.json(buildHealthPayload());
});

app.get("/api/health/ready", async (req, res) => {
  const gw = await initAiGateway();
  const ready = {
    ok: true,
    status: "ready",
    aiConfigured: gw.provider.isConfigured() || gw.config.provider === "mock",
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    googleOAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID),
    model: gw.config.model,
    circuit: gw.circuit.state()
  };
  // Never include secrets
  res.json(ready);
});

app.get("/api/ai/metrics", async (req, res) => {
  // Internal metrics — no secrets. Protect with optional admin token.
  const admin = process.env.AI_METRICS_TOKEN;
  if (admin && req.headers["x-ai-metrics-token"] !== admin) {
    return res.status(401).json({ ok: false, error: "Unauthorized." });
  }
  const gw = await initAiGateway();
  res.json({ ok: true, metrics: gw.telemetry.snapshot() });
});

app.post("/api/auth/register", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: "Database non configurato." });
  }
  try {
    await ensureAuthSchema();
    const email = normalizeEmail(req.body?.email);
    const name = String(req.body?.name || "").trim();
    const password = String(req.body?.password || "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || name.length < 2 || password.length < 8) {
      return res.status(400).json({ error: "Nome, email valida e password di almeno 8 caratteri sono obbligatori." });
    }
    const { firstName, lastName } = splitFullName(name);
    const passwordHash = await hashPassword(password);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        "INSERT INTO app_users(email, name, first_name, last_name, password_hash, provider, last_login_at) VALUES($1, $2, $3, $4, $5, 'email', NOW()) RETURNING id, email, name, first_name, last_name, provider, avatar_url, status, role, created_at, last_login_at",
        [email, name, firstName || null, lastName || null, passwordHash]
      );
      const user = result.rows[0];
      await client.query("INSERT INTO app_account_data(user_id, data) VALUES($1, '{}'::jsonb) ON CONFLICT (user_id) DO NOTHING", [user.id]);
      const profile = await getOrInitAthleteProfile(client, user.id, { firstName, lastName });
      await client.query("COMMIT");
      client.release();
      return res.status(201).json({
        token: issueAccountToken(user),
        user: formatUserPayload(user, profile),
        profile
      });
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      try { client.release(); } catch (_) {}
      if (error?.code === "23505") return res.status(409).json({ error: "Esiste già un account con questa email." });
      console.error("ACCOUNT_REGISTER_ERROR", error);
      return res.status(500).json({
        error: "Registrazione non riuscita.",
        detail: String(error?.message || error).slice(0, 240)
      });
    }
  } catch (error) {
    console.error("ACCOUNT_REGISTER_OUTER_ERROR", error);
    return res.status(500).json({
      error: "Registrazione non riuscita.",
      detail: String(error?.message || error).slice(0, 240)
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: "Database non configurato." });
  }
  try {
    await ensureAuthSchema();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    if (!email || !password) {
      return res.status(400).json({ error: "Email e password sono obbligatori." });
    }
    const result = await pool.query(
      "SELECT id, email, name, first_name, last_name, password_hash, provider, avatar_url, status, role, created_at, last_login_at FROM app_users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];
    if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: "Email o password non corretti." });
    }
    await pool.query("UPDATE app_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1", [user.id]);
    const profile = await getOrInitAthleteProfile(pool, user.id, { firstName: user.first_name, lastName: user.last_name });
    return res.status(200).json({
      token: issueAccountToken(user),
      user: formatUserPayload(user, profile),
      profile
    });
  } catch (error) {
    console.error("ACCOUNT_LOGIN_ERROR", error);
    return res.status(500).json({
      error: "Accesso non riuscito.",
      detail: String(error?.message || error).slice(0, 240)
    });
  }
});

app.get("/api/auth/public-config", (req, res) => {
  res.json({
    ok: true,
    googleClientId: GOOGLE_CLIENT_ID || "",
    googleEnabled: Boolean(GOOGLE_CLIENT_ID),
    appleEnabled: Boolean(process.env.APPLE_CLIENT_ID || process.env.APPLE_BUNDLE_ID),
    passwordResetEnabled: true
  });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: "Database non configurato." });
  }
  try {
    await ensureAuthSchema();
    const email = normalizeEmail(req.body?.email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: "Inserisci un'email valida." });
    }
    const result = await pool.query(
      "SELECT id, email, password_hash, provider FROM app_users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];
    const generic = {
      ok: true,
      message: "Se l'account esiste, puoi usare il codice di recupero per impostare una nuova password."
    };
    if (!user || !user.password_hash || (user.provider && user.provider !== "email")) {
      return res.status(200).json(generic);
    }
    const code = String(crypto.randomInt(100000, 999999));
    const passwordResetHash = await hashPassword(code);
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query(
      "UPDATE app_users SET password_reset_hash = $1, password_reset_expires = $2, updated_at = NOW() WHERE id = $3",
      [passwordResetHash, expires.toISOString(), user.id]
    );
    // No SMTP yet: expose one-time code so web/PWA recovery works.
    return res.status(200).json({
      ...generic,
      resetAvailable: true,
      code,
      expiresInMinutes: 60
    });
  } catch (error) {
    console.error("ACCOUNT_FORGOT_PASSWORD_ERROR", error);
    return res.status(500).json({ error: "Recupero password non riuscito." });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: "Database non configurato." });
  }
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || req.body?.token || "").trim();
    const password = String(req.body?.password || req.body?.newPassword || "");
    if (!email || !code || password.length < 8) {
      return res.status(400).json({ error: "Email, codice e nuova password (min. 8 caratteri) sono obbligatori." });
    }
    const result = await pool.query(
      "SELECT id, email, name, first_name, last_name, password_reset_hash, password_reset_expires, provider, avatar_url, status, role, created_at, last_login_at FROM app_users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];
    if (!user || !user.password_reset_hash || !user.password_reset_expires) {
      return res.status(400).json({ error: "Codice non valido o scaduto." });
    }
    if (new Date(user.password_reset_expires).getTime() < Date.now()) {
      return res.status(400).json({ error: "Codice scaduto. Richiedine uno nuovo." });
    }
    if (!(await verifyPassword(code, user.password_reset_hash))) {
      return res.status(400).json({ error: "Codice non valido o scaduto." });
    }
    const passwordHash = await hashPassword(password);
    await pool.query(
      "UPDATE app_users SET password_hash = $1, password_reset_hash = NULL, password_reset_expires = NULL, last_login_at = NOW(), updated_at = NOW() WHERE id = $2",
      [passwordHash, user.id]
    );
    const profile = await getOrInitAthleteProfile(pool, user.id, { firstName: user.first_name, lastName: user.last_name });
    return res.status(200).json({
      ok: true,
      message: "Password aggiornata.",
      token: issueAccountToken(user),
      user: formatUserPayload(user, profile),
      profile
    });
  } catch (error) {
    console.error("ACCOUNT_RESET_PASSWORD_ERROR", error);
    return res.status(500).json({ error: "Reset password non riuscito." });
  }
});

// Canonical Modern Account & Profile Endpoints
app.get("/api/me", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: "Unauthorized." });
  try {
    const userRes = await pool.query(
      "SELECT id, email, name, first_name, last_name, provider, avatar_url, status, role, created_at, last_login_at FROM app_users WHERE id = $1",
      [auth.id]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(401).json({ error: "User not found." });
    const profile = await getOrInitAthleteProfile(pool, user.id, { firstName: user.first_name, lastName: user.last_name });
    const dataRes = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [auth.id]);
    const accountData = dataRes.rows[0]?.data || {};
    return res.json({
      ok: true,
      user: formatUserPayload(user, profile),
      profile,
      settings: accountData.prefs || { intensityType: profile.intensity_type || "RIR", frequency: profile.training_frequency || 4, duration: 16 }
    });
  } catch (error) {
    console.error("API_ME_ERROR", error);
    return res.status(500).json({ error: "Failed to fetch account info." });
  }
});

app.get("/api/me/profile", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: "Unauthorized." });
  try {
    const userRes = await pool.query("SELECT first_name, last_name, name FROM app_users WHERE id = $1", [auth.id]);
    const user = userRes.rows[0] || {};
    const profile = await getOrInitAthleteProfile(pool, auth.id, { firstName: user.first_name, lastName: user.last_name });
    return res.json({ ok: true, profile });
  } catch (error) {
    console.error("API_GET_PROFILE_ERROR", error);
    return res.status(500).json({ error: "Failed to fetch athlete profile." });
  }
});

app.put(["/api/me/profile", "/api/profile"], async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: "Unauthorized." });
  try {
    const body = req.body?.profile || req.body || {};
    const firstName = String(body.first_name || body.firstName || "").trim();
    const lastName = String(body.last_name || body.lastName || "").trim();
    const birthDate = body.birth_date || body.birthDate || null;
    const gender = body.gender ? String(body.gender).trim() : null;
    const country = body.country ? String(body.country).trim().toUpperCase() : "IT";
    const language = body.language ? String(body.language).trim().toLowerCase() : "it";
    const heightCm = body.height_cm != null && body.height_cm !== "" ? Number(body.height_cm) : null;
    const weightKg = body.weight_kg != null && body.weight_kg !== "" ? Number(body.weight_kg) : null;
    const primaryGoal = body.primary_goal || body.primaryGoal || null;
    const secondaryGoals = Array.isArray(body.secondary_goals)
      ? JSON.stringify(body.secondary_goals)
      : (body.secondary_goals ? JSON.stringify([body.secondary_goals]) : "[]");
    const experienceLevel = body.experience_level || body.experienceLevel || null;
    const trainingFrequency = body.training_frequency != null ? Number(body.training_frequency) : 4;
    const intensityType = body.intensity_type || body.intensityType || "RIR";
    const notes = body.notes ? String(body.notes).trim() : null;

    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const profileRes = await client.query(
        `INSERT INTO app_athlete_profiles (
          user_id, first_name, last_name, birth_date, gender, country, language,
          height_cm, weight_kg, primary_goal, secondary_goals, experience_level,
          training_frequency, intensity_type, notes, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          first_name = COALESCE(EXCLUDED.first_name, app_athlete_profiles.first_name),
          last_name = COALESCE(EXCLUDED.last_name, app_athlete_profiles.last_name),
          birth_date = EXCLUDED.birth_date,
          gender = EXCLUDED.gender,
          country = COALESCE(EXCLUDED.country, app_athlete_profiles.country),
          language = COALESCE(EXCLUDED.language, app_athlete_profiles.language),
          height_cm = EXCLUDED.height_cm,
          weight_kg = EXCLUDED.weight_kg,
          primary_goal = EXCLUDED.primary_goal,
          secondary_goals = EXCLUDED.secondary_goals,
          experience_level = EXCLUDED.experience_level,
          training_frequency = COALESCE(EXCLUDED.training_frequency, app_athlete_profiles.training_frequency),
          intensity_type = COALESCE(EXCLUDED.intensity_type, app_athlete_profiles.intensity_type),
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING id, user_id, first_name, last_name, TO_CHAR(birth_date, 'YYYY-MM-DD') AS birth_date, gender, country, language, height_cm, weight_kg, primary_goal, secondary_goals, experience_level, training_frequency, intensity_type, notes, created_at, updated_at`,
        [
          auth.id, firstName || null, lastName || null, birthDate || null, gender, country, language,
          heightCm, weightKg, primaryGoal, typeof secondaryGoals === "string" ? secondaryGoals : JSON.stringify(secondaryGoals),
          experienceLevel, trainingFrequency, intensityType, notes
        ]
      );
      const updatedProfile = profileRes.rows[0];

      let updatedUserRes;
      if (fullName) {
        updatedUserRes = await client.query(
          `UPDATE app_users
           SET name = $1, first_name = $2, last_name = $3, updated_at = NOW()
           WHERE id = $4
           RETURNING id, email, name, first_name, last_name, provider, avatar_url, status, role, created_at, last_login_at`,
          [fullName, firstName || null, lastName || null, auth.id]
        );
      } else {
        updatedUserRes = await client.query(
          "SELECT id, email, name, first_name, last_name, provider, avatar_url, status, role, created_at, last_login_at FROM app_users WHERE id = $1",
          [auth.id]
        );
      }
      const updatedUser = updatedUserRes.rows[0];
      await client.query("COMMIT");
      return res.json({
        ok: true,
        profile: updatedProfile,
        user: formatUserPayload(updatedUser, updatedProfile)
      });
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("API_PUT_PROFILE_ERROR", error);
    return res.status(500).json({ error: "Failed to update athlete profile." });
  }
});

app.get("/api/me/settings", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: "Unauthorized." });
  try {
    const dataRes = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [auth.id]);
    const settings = dataRes.rows[0]?.data?.prefs || { intensityType: "RIR", duration: 16, frequency: 4 };
    return res.json({ ok: true, settings });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch user settings." });
  }
});

app.put("/api/me/settings", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: "Unauthorized." });
  try {
    const newPrefs = req.body?.settings || req.body || {};
    const existing = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [auth.id]);
    const current = existing.rows[0]?.data || {};
    const merged = { ...current, prefs: { ...(current.prefs || {}), ...newPrefs }, lastSyncedAt: new Date().toISOString() };
    await pool.query(
      `INSERT INTO app_account_data(user_id, data, updated_at)
       VALUES($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [auth.id, JSON.stringify(merged)]
    );
    return res.json({ ok: true, settings: merged.prefs });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save user settings." });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  return res.json({ ok: true, message: "Logged out successfully." });
});

// Backward-compatible endpoints
app.get("/api/account/me", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: "Unauthorized." });
  try {
    const userRes = await pool.query(
      "SELECT id, email, name, first_name, last_name, provider, avatar_url, status, role, created_at, last_login_at FROM app_users WHERE id = $1",
      [auth.id]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(401).json({ error: "User not found." });
    const profile = await getOrInitAthleteProfile(pool, user.id, { firstName: user.first_name, lastName: user.last_name });
    const dataRes = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [auth.id]);
    return res.json({
      user: formatUserPayload(user, profile),
      profile,
      data: dataRes.rows[0]?.data || {}
    });
  } catch (error) {
    console.error("ACCOUNT_ME_ERROR", error);
    return res.status(500).json({ error: "Failed to fetch account profile." });
  }
});

app.post("/api/account/sync", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: "Unauthorized." });
  try {
    const clientData = req.body?.data || req.body || {};
    const existing = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [auth.id]);
    const current = existing.rows[0]?.data || {};
    const merged = { ...current, ...clientData, lastSyncedAt: new Date().toISOString() };
    await pool.query(
      `INSERT INTO app_account_data(user_id, data, updated_at)
       VALUES($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [auth.id, JSON.stringify(merged)]
    );
    return res.json({ ok: true, data: merged });
  } catch (error) {
    console.error("ACCOUNT_SYNC_ERROR", error);
    return res.status(500).json({ error: "Failed to sync account data." });
  }
});

app.post("/api/auth/google", async (req, res) => {
  try {
    await ensureAuthSchema();
    const identity = await verifyGoogleCredential(req.body?.credential);
    return await issueOAuthResponse(req, res, identity);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }
});

app.post("/api/auth/apple", async (req, res) => {
  try {
    const identity = await verifyAppleCredential(req.body?.code || req.body?.id_token || req.body?.identityToken, req.body?.user);
    return await issueOAuthResponse(req, res, identity);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
});

app.get("/api/auth/apple/start", (req, res) => {
  const redirectUri = process.env.APPLE_REDIRECT_URI || `${req.protocol}://${req.get("host")}/api/auth/apple/callback`;
  const clientId = process.env.APPLE_CLIENT_ID || APPLE_BUNDLE_ID;
  const state = crypto.randomBytes(16).toString("hex");
  const scope = encodeURIComponent("name email");
  const url =
    `https://appleid.apple.com/auth/authorize?response_type=code%20id_token&response_mode=form_post` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scope}&state=${state}`;
  // Deep-link friendly HTML for Android WebView / browser
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(`<!doctype html><html><head><meta charset="utf-8"><title>Apple Sign-In</title>
<meta http-equiv="refresh" content="0;url=${url}">
</head><body style="font-family:sans-serif;background:#111;color:#eee;padding:24px;">
<p>Reindirizzamento ad Apple Sign-In…</p>
<p><a href="${url}" style="color:#d4af37;">Continua con Apple</a></p>
<p style="font-size:12px;color:#888;">Se Apple non è configurato (APPLE_CLIENT_ID / APPLE_REDIRECT_URI), completa le variabili d'ambiente sul server.</p>
<script>location.href=${JSON.stringify(url)};</script>
</body></html>`);
});

app.post("/api/auth/apple/callback", async (req, res) => {
  try {
    const identity = await verifyAppleCredential(req.body?.code || req.body?.id_token, req.body?.user);
    const issued = await issueOAuthResponse(req, res, identity);
    return issued;
  } catch (err) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(401).send(`<html><body style="font-family:sans-serif;padding:24px;">Accesso Apple non riuscito: ${String(err.message || err)}</body></html>`);
  }
});

// Food / Evidence / Program generate proxies
mountFoodRoutes(app, {});
mountEvidenceRoutes(app, { requireAuth: async (req) => accountFromBearer(req.headers.authorization) });
mountProgramGenerateRoutes(app, { requireAuth: async (req) => accountFromBearer(req.headers.authorization) });

app.get("/api/account/data", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: "Sessione scaduta o non autorizzata." });
  try {
    const dataRes = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [auth.id]);
    const currentData = dataRes.rows[0]?.data || {};
    return res.json({ ok: true, data: currentData });
  } catch (err) {
    return res.status(500).json({ error: "Impossibile recuperare i dati dal cloud." });
  }
});

app.post("/api/account/data", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: "Sessione scaduta o non autorizzata." });
  try {
    const dataPayload = req.body?.data || {};
    await pool.query(
      `INSERT INTO app_account_data (user_id, data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET data = $2, updated_at = NOW()`,
      [auth.id, JSON.stringify(dataPayload)]
    );
    return res.json({ ok: true, saved_at: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: "Impossibile salvare i dati sul cloud." });
  }
});

// ============================================================
// NURVAN REWARDS API (Wave 1–4) — authoritative when authenticated
// Medical / therapy / exams must never enter rewards payloads.
// ============================================================
function sanitizeRewardsPayload(raw) {
  if (!raw || typeof raw !== "object") return {};
  const clean = JSON.parse(JSON.stringify(raw));
  delete clean.therapy;
  delete clean.exams;
  delete clean.healthSamples;
  delete clean.medications;
  delete clean.bodyWeight;
  if (Array.isArray(clean.ledger) && clean.ledger.length > 200) clean.ledger = clean.ledger.slice(-200);
  return clean;
}

app.get("/api/rewards/profile", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ ok: false, error: "Unauthorized" });
  try {
    const dataRes = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [auth.id]);
    const data = dataRes.rows[0]?.data || {};
    return res.json({ ok: true, profile: sanitizeRewardsPayload(data.rewards || {}) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "rewards_profile_failed" });
  }
});

app.put("/api/rewards/profile", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ ok: false, error: "Unauthorized" });
  try {
    const profile = sanitizeRewardsPayload(req.body?.profile || req.body || {});
    const existing = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [auth.id]);
    const data = existing.rows[0]?.data || {};
    data.rewards = profile;
    await pool.query(
      `INSERT INTO app_account_data (user_id, data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET data = $2::jsonb, updated_at = NOW()`,
      [auth.id, JSON.stringify(data)]
    );
    return res.json({ ok: true, profile, saved_at: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "rewards_save_failed" });
  }
});

app.post("/api/rewards/xp", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ ok: false, error: "Unauthorized" });
  try {
    const event = req.body?.event || req.body || {};
    if (!event.sourceId || !event.eventType) {
      return res.status(400).json({ ok: false, error: "sourceId_and_eventType_required" });
    }
    // Client cannot invent XP amounts for competitive events — server recomputes when possible
    if (event.eventType === "WORKOUT_COMPLETED" && typeof event.xpAmount === "number" && event.xpAmount > 300) {
      return res.status(400).json({ ok: false, error: "xp_out_of_range" });
    }
    const existing = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [auth.id]);
    const data = existing.rows[0]?.data || {};
    const rewards = sanitizeRewardsPayload(data.rewards || { mode: "rewards", xp: 0, ledger: [], level: 1, tier: "bronze" });
    if (rewards.mode !== "rewards") {
      return res.json({ ok: true, rejected: true, reason: "focus_mode", profile: rewards });
    }
    rewards.ledger = Array.isArray(rewards.ledger) ? rewards.ledger : [];
    if (rewards.ledger.some((e) => e.sourceId === event.sourceId && e.eventType === event.eventType)) {
      return res.json({ ok: true, rejected: true, reason: "duplicate", profile: rewards });
    }
    const row = {
      id: event.id || ("xp_srv_" + Date.now()),
      eventType: event.eventType,
      sourceId: String(event.sourceId),
      xpAmount: Math.max(0, Math.min(300, Number(event.xpAmount) || 0)),
      timestamp: event.timestamp || new Date().toISOString(),
      metadata: event.metadata || {},
      validationStatus: "validated"
    };
    delete row.metadata.therapy;
    delete row.metadata.exams;
    rewards.ledger.push(row);
    rewards.xp = (Number(rewards.xp) || 0) + row.xpAmount;
    data.rewards = rewards;
    await pool.query(
      `INSERT INTO app_account_data (user_id, data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET data = $2::jsonb, updated_at = NOW()`,
      [auth.id, JSON.stringify(data)]
    );
    return res.json({ ok: true, event: row, profile: rewards });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "xp_append_failed" });
  }
});

app.get("/api/rewards/leaderboard", async (req, res) => {
  const auth = await accountFromBearer(req.headers.authorization);
  if (!auth) return res.status(401).json({ ok: false, error: "Unauthorized" });
  const scope = String(req.query.scope || "GLOBAL").toUpperCase();
  const seasonId = String(req.query.seasonId || "lifetime");
  try {
    // Aggregation from account_data.rewards (opt-in Rewards mode only)
    const rows = await pool.query(
      `SELECT u.id, u.name, d.data->'rewards' AS rewards
       FROM app_account_data d
       JOIN app_users u ON u.id = d.user_id
       WHERE (d.data->'rewards'->>'mode') = 'rewards'
         AND COALESCE((d.data->'rewards'->'community'->>'showOnLeaderboard')::text, 'false') = 'true'
       ORDER BY COALESCE((d.data->'rewards'->>'consistencyScore')::numeric, 0) DESC
       LIMIT 100`
    );
    const entries = rows.rows.map((r, idx) => {
      const rew = r.rewards || {};
      return {
        rank: idx + 1,
        userIdHash: "u" + String(r.id),
        displayName: rew.community?.displayName || (r.name ? String(r.name).split(" ")[0] : "Athlete"),
        tier: rew.tier || "bronze",
        level: Number(rew.level) || 1,
        consistencyScore: Number(rew.consistencyScore) || 0
      };
    });
    return res.json({
      ok: true,
      board: { scope, seasonId, updatedAt: new Date().toISOString(), entries },
      note: entries.length ? null : "Leaderboard empty until users opt into ranking (Wave 4)."
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "leaderboard_failed" });
  }
});

app.get("/api/rewards/season", async (req, res) => {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return res.json({
    ok: true,
    season: {
      id: now.getFullYear() + "-Q" + q,
      label: "Season " + now.getFullYear() + " Q" + q,
      type: "seasonal"
    },
    partnerSchema: { version: 1, partners: [], rules: { noPayToWin: true, goldNeverBoostsRank: true } }
  });
});

app.get("/api/rewards/tools", async (_req, res) => {
  return res.json({
    ok: true,
    tools: [
      { name: "propose_program_ops", domain: "programming", requiresConfirm: true },
      { name: "propose_deload", domain: "autoregulation", requiresConfirm: true },
      { name: "propose_nutrition_adjust", domain: "nutrition", requiresConfirm: true },
      { name: "summarize_week", domain: "analytics", requiresConfirm: false },
      { name: "unlock_achievement_notify", domain: "analytics", requiresConfirm: false, systemOnly: true }
    ]
  });
});


// Program Library Catalog & Multi-Criteria Filter Endpoints (Task 6)
app.get(["/api/programs", "/api/program-templates", "/api/programs/templates"], async (req, res) => {
  try {
    const goalFilter = req.query.goal ? String(req.query.goal).trim().toLowerCase() : null;
    const diffFilter = req.query.difficulty || req.query.level ? String(req.query.difficulty || req.query.level).trim().toLowerCase() : null;
    const freqFilter = req.query.frequency ? parseInt(req.query.frequency, 10) : null;
    const durFilter = req.query.duration ? parseInt(req.query.duration, 10) : null;
    const equipFilter = req.query.equipment ? String(req.query.equipment).trim().toLowerCase() : null;
    const searchFilter = req.query.search ? String(req.query.search).trim().toLowerCase() : null;
    const categoryFilter = req.query.category ? String(req.query.category).trim().toLowerCase() : null;
    const sortOption = req.query.sort ? String(req.query.sort).trim().toLowerCase() : "recommended";

    let authUser = null;
    let athleteProfile = null;
    try {
      authUser = await accountFromBearer(req.headers.authorization);
      if (authUser && process.env.DATABASE_URL) {
        const pRes = await pool.query("SELECT * FROM app_athlete_profiles WHERE user_id = $1", [authUser.id]);
        if (pRes.rows.length) athleteProfile = pRes.rows[0];
      }
    } catch (_) {}

    let templates = [];
    if (process.env.DATABASE_URL) {
      const qRes = await pool.query(
        `SELECT id, slug, title, description, author, source, status, difficulty, primary_goal,
                secondary_goals, training_frequency, duration_weeks, equipment_requirements,
                categories, tags, cover_url, version, version_number, structure, created_at, updated_at
         FROM app_program_templates
         WHERE status = 'published'
         ORDER BY id ASC`
      );
      templates = qRes.rows;
    } else {
      templates = INITIAL_PROGRAM_TEMPLATES.map((t, idx) => ({ id: idx + 1, ...t, created_at: new Date().toISOString() }));
    }

    // Helper to check text matches with synonym mapping
    const matchGoal = (templateGoal, filter) => {
      if (!filter || filter === "tutti" || filter === "all") return true;
      const tGoal = String(templateGoal || "").toLowerCase();
      if (tGoal.includes(filter) || filter.includes(tGoal)) return true;
      if (filter.includes("ipertrofia") && tGoal.includes("hypertrophy")) return true;
      if (filter.includes("hypertrophy") && tGoal.includes("ipertrofia")) return true;
      if (filter.includes("forza") && (tGoal.includes("strength") || tGoal.includes("powerlifting"))) return true;
      if (filter.includes("strength") && (tGoal.includes("forza") || tGoal.includes("powerlifting"))) return true;
      if (filter.includes("recomp") && (tGoal.includes("fitness") || tGoal.includes("general"))) return true;
      if (filter.includes("atlet") && tGoal.includes("athletic")) return true;
      return false;
    };

    const matchLevel = (templateDiff, filter) => {
      if (!filter || filter === "tutti" || filter === "all") return true;
      const tDiff = String(templateDiff || "").toLowerCase();
      if (tDiff === filter) return true;
      if (filter.includes("principiante") && tDiff.includes("beginner")) return true;
      if (filter.includes("intermedio") && tDiff.includes("intermediate")) return true;
      if (filter.includes("avanzato") && (tDiff.includes("advanced") || tDiff.includes("elite"))) return true;
      return false;
    };

    const matchEquipment = (templateEquip, filter) => {
      if (!filter || filter === "tutta" || filter === "all") return true;
      const equipArr = Array.isArray(templateEquip) ? templateEquip.map(e => String(e).toLowerCase()) : [String(templateEquip || "").toLowerCase()];
      const equipText = equipArr.join(" ");
      if (filter.includes("commercial") && (equipText.includes("commercial") || equipText.includes("completa") || equipText.includes("palestra"))) return true;
      if (filter.includes("barbell") || filter.includes("bilanciere")) return equipText.includes("bilancier") || equipText.includes("barbell") || equipText.includes("rack");
      if (filter.includes("dumbbell") || filter.includes("manubri")) return equipText.includes("manubri") || equipText.includes("dumbbell");
      if (filter.includes("cable") || filter.includes("cavi")) return equipText.includes("cavi") || equipText.includes("cable");
      if (filter.includes("home") || filter.includes("minimal")) return equipText.includes("base") || equipText.includes("manubri") || equipText.includes("home");
      return equipArr.some(e => e.includes(filter));
    };

    // 1. Filter: Multi-Criteria Combined
    let filtered = templates.filter(t => {
      // Goal Filter
      if (goalFilter && !matchGoal(t.primary_goal, goalFilter)) {
        const secMatch = Array.isArray(t.secondary_goals) && t.secondary_goals.some(g => matchGoal(g, goalFilter));
        if (!secMatch) return false;
      }
      // Level / Difficulty Filter
      if (diffFilter && !matchLevel(t.difficulty, diffFilter)) {
        return false;
      }
      // Frequency Filter
      if (freqFilter && Number(t.training_frequency) !== Number(freqFilter)) {
        return false;
      }
      // Duration Filter
      if (durFilter && Number(t.duration_weeks) !== Number(durFilter)) {
        return false;
      }
      // Equipment Filter
      if (equipFilter && !matchEquipment(t.equipment_requirements, equipFilter)) {
        return false;
      }
      // Category Filter
      if (categoryFilter && categoryFilter !== "tutti") {
        const catMatch = Array.isArray(t.categories) && t.categories.some(c => String(c).toLowerCase().includes(categoryFilter));
        const tagMatch = Array.isArray(t.tags) && t.tags.some(tag => String(tag).toLowerCase().includes(categoryFilter));
        if (!catMatch && !tagMatch && !matchGoal(t.primary_goal, categoryFilter)) return false;
      }
      // Full-Text Search Filter
      if (searchFilter) {
        const inTitle = String(t.title || "").toLowerCase().includes(searchFilter);
        const inDesc = String(t.description || "").toLowerCase().includes(searchFilter);
        const inAuthor = String(t.author || "").toLowerCase().includes(searchFilter);
        const inGoal = String(t.primary_goal || "").toLowerCase().includes(searchFilter);
        const inTags = Array.isArray(t.tags) && t.tags.some(tag => String(tag).toLowerCase().includes(searchFilter));
        const inCats = Array.isArray(t.categories) && t.categories.some(cat => String(cat).toLowerCase().includes(searchFilter));
        const inEquip = Array.isArray(t.equipment_requirements) && t.equipment_requirements.some(e => String(e).toLowerCase().includes(searchFilter));
        
        // Exercise names in sessions structure
        let inExercises = false;
        if (t.structure && Array.isArray(t.structure.sessions)) {
          inExercises = t.structure.sessions.some(s =>
            (s.name && s.name.toLowerCase().includes(searchFilter)) ||
            (Array.isArray(s.exercises) && s.exercises.some(ex =>
              (ex.name && ex.name.toLowerCase().includes(searchFilter)) ||
              (ex.muscleGroup && ex.muscleGroup.toLowerCase().includes(searchFilter))
            ))
          );
        }

        if (!inTitle && !inDesc && !inAuthor && !inGoal && !inTags && !inCats && !inEquip && !inExercises) {
          return false;
        }
      }

      return true;
    });

    // 2. Recommendation Engine & Reason Generation
    const decorated = filtered.map(t => {
      let matchScore = 50;
      let reasons = [];
      let isRecommended = false;

      if (athleteProfile) {
        const userGoal = String(athleteProfile.primary_goal || "").toLowerCase();
        const userLevel = String(athleteProfile.experience_level || "").toLowerCase();
        const userFreq = Number(athleteProfile.training_frequency || 4);
        const userIntensity = String(athleteProfile.intensity_type || "").toUpperCase();

        if (matchGoal(t.primary_goal, userGoal)) {
          matchScore += 30;
          reasons.push("obiettivo (" + (athleteProfile.primary_goal || t.primary_goal) + ")");
        }
        if (matchLevel(t.difficulty, userLevel)) {
          matchScore += 15;
          reasons.push("livello (" + t.difficulty + ")");
        }
        if (userFreq && Number(t.training_frequency) === userFreq) {
          matchScore += 15;
          reasons.push("frequenza (" + userFreq + " giorni/sett.)");
        }
        if (userIntensity && (t.description?.includes(userIntensity) || t.tags?.includes(userIntensity))) {
          matchScore += 5;
        }

        if (matchScore >= 75) {
          isRecommended = true;
        }
      }

      const recommendationReason = reasons.length
        ? "Compatibile con il tuo " + reasons.join(", ") + "."
        : "Programma strutturato evidence-based con progressione modulare.";

      return {
        ...t,
        matchScore: Math.min(matchScore, 100),
        isRecommended,
        recommendationReason
      };
    });

    // 3. Sorting Engine
    if (sortOption === "recommended") {
      decorated.sort((a, b) => b.matchScore - a.matchScore);
    } else if (sortOption === "duration_asc") {
      decorated.sort((a, b) => (a.duration_weeks || 0) - (b.duration_weeks || 0));
    } else if (sortOption === "duration_desc") {
      decorated.sort((a, b) => (b.duration_weeks || 0) - (a.duration_weeks || 0));
    } else if (sortOption === "frequency_asc") {
      decorated.sort((a, b) => (a.training_frequency || 0) - (b.training_frequency || 0));
    } else if (sortOption === "frequency_desc") {
      decorated.sort((a, b) => (b.training_frequency || 0) - (a.training_frequency || 0));
    } else if (sortOption === "difficulty_asc") {
      const order = { beginner: 1, intermediate: 2, advanced: 3, elite: 4 };
      decorated.sort((a, b) => (order[String(a.difficulty).toLowerCase()] || 2) - (order[String(b.difficulty).toLowerCase()] || 2));
    } else if (sortOption === "difficulty_desc") {
      const order = { beginner: 1, intermediate: 2, advanced: 3, elite: 4 };
      decorated.sort((a, b) => (order[String(b.difficulty).toLowerCase()] || 2) - (order[String(a.difficulty).toLowerCase()] || 2));
    }

    const recommended = decorated.filter(t => t.isRecommended);

    // Compute dynamic facets counts for filter badges
    const facets = {
      total: decorated.length,
      goals: {
        Hypertrophy: templates.filter(t => matchGoal(t.primary_goal, "hypertrophy")).length,
        Strength: templates.filter(t => matchGoal(t.primary_goal, "strength")).length,
        Powerlifting: templates.filter(t => matchGoal(t.primary_goal, "powerlifting")).length,
        Bodybuilding: templates.filter(t => matchGoal(t.primary_goal, "bodybuilding")).length,
        GeneralFitness: templates.filter(t => matchGoal(t.primary_goal, "general fitness")).length,
        AthleticPerformance: templates.filter(t => matchGoal(t.primary_goal, "athletic")).length
      },
      difficulties: {
        Beginner: templates.filter(t => matchLevel(t.difficulty, "beginner")).length,
        Intermediate: templates.filter(t => matchLevel(t.difficulty, "intermediate")).length,
        Advanced: templates.filter(t => matchLevel(t.difficulty, "advanced")).length
      },
      frequencies: {
        3: templates.filter(t => Number(t.training_frequency) === 3).length,
        4: templates.filter(t => Number(t.training_frequency) === 4).length,
        5: templates.filter(t => Number(t.training_frequency) === 5).length,
        6: templates.filter(t => Number(t.training_frequency) === 6).length
      },
      durations: {
        8: templates.filter(t => Number(t.duration_weeks) === 8).length,
        12: templates.filter(t => Number(t.duration_weeks) === 12).length,
        16: templates.filter(t => Number(t.duration_weeks) === 16).length
      }
    };

    return res.json({
      ok: true,
      templates: decorated,
      recommended: recommended.length ? recommended : decorated.slice(0, 2),
      facets,
      count: decorated.length
    });
  } catch (error) {
    console.error("GET_PROGRAMS_ERROR", error);
    return res.status(500).json({ error: "Failed to load program catalog." });
  }
});

app.get(["/api/programs/:id", "/api/program-templates/:id", "/api/programs/templates/:id"], async (req, res) => {
  try {
    const rawId = req.params.id;
    let template = null;
    if (process.env.DATABASE_URL) {
      let qRes;
      if (/^\d+$/.test(rawId)) {
        qRes = await pool.query("SELECT * FROM app_program_templates WHERE id = $1", [rawId]);
      } else {
        qRes = await pool.query("SELECT * FROM app_program_templates WHERE slug = $1", [rawId]);
      }
      if (qRes.rows.length) template = qRes.rows[0];
    }
    if (!template) {
      template = INITIAL_PROGRAM_TEMPLATES.find(t => t.slug === rawId || String(t.id) === rawId);
    }
    if (!template) {
      return res.status(404).json({ error: "Program template not found." });
    }
    return res.json({ ok: true, template });
  } catch (error) {
    console.error("GET_PROGRAM_DETAIL_ERROR", error);
    return res.status(500).json({ error: "Failed to load program details." });
  }
});


// Task 7: Athlete Program Activation, Retrieval and History Endpoints
app.post(["/api/programs/:id/activate", "/api/program-templates/:id/activate"], async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Authentication required to activate a program." });
    }

    const rawId = req.params.id;
    let template = null;
    if (process.env.DATABASE_URL) {
      let qRes;
      if (/^\d+$/.test(rawId)) {
        qRes = await pool.query("SELECT * FROM app_program_templates WHERE id = $1", [rawId]);
      } else {
        qRes = await pool.query("SELECT * FROM app_program_templates WHERE slug = $1", [rawId]);
      }
      if (qRes.rows.length) template = qRes.rows[0];
    }
    if (!template) {
      template = INITIAL_PROGRAM_TEMPLATES.find(t => t.slug === rawId || String(t.id) === rawId);
    }
    if (!template) {
      return res.status(404).json({ error: "Program template not found." });
    }

    const canonicalProgram = buildCanonicalProgramFromTemplate(template);
    const client = await pool.connect();
    let createdProgram = null;
    let archivedPrevious = false;

    try {
      await client.query("BEGIN");

      // 1. Archive any existing active program for this authenticated athlete
      const archiveRes = await client.query(
        "UPDATE app_athlete_programs SET status = 'archived', updated_at = NOW() WHERE user_id = $1 AND status = 'active' RETURNING id",
        [authUser.id]
      );
      if (archiveRes.rows.length > 0) {
        archivedPrevious = true;
      }

      // 2. Insert new independent Athlete Program clone
      const insertRes = await client.query(
        `INSERT INTO app_athlete_programs (
          user_id, template_id, name, title, source, status, customized,
          version_snapshot, source_template_version, program_data, data, started_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'active', false, $6, $7, $8, $9, NOW(), NOW(), NOW())
        RETURNING id, user_id, template_id, name, title, source, status, customized, version_snapshot, source_template_version, program_data, started_at, created_at, updated_at`,
        [
          authUser.id,
          template.id || null,
          template.title,
          template.title,
          template.source || 'PRESET',
          template.version || '1.0.0',
          template.version || '1.0.0',
          JSON.stringify(canonicalProgram),
          JSON.stringify(canonicalProgram)
        ]
      );
      createdProgram = insertRes.rows[0];

      // 3. Update app_account_data for backwards compatibility
      await client.query(
        `INSERT INTO app_account_data(user_id, data, updated_at)
         VALUES($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()`,
        [authUser.id, JSON.stringify({ activeProgram: canonicalProgram, activeProgramId: createdProgram.id })]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return res.status(201).json({
      ok: true,
      program: createdProgram,
      archived_previous: archivedPrevious,
      message: "Programma attivato con successo."
    });
  } catch (error) {
    console.error("ACTIVATE_PROGRAM_ERROR", error);
    return res.status(500).json({ error: "Failed to activate program." });
  }
});

app.get(["/api/me/program", "/api/me/program/active", "/api/athlete/program/active"], async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Authentication required." });
    }

    if (!process.env.DATABASE_URL) {
      return res.json({ ok: true, program: null });
    }

    const qRes = await pool.query(
      `SELECT id, user_id, template_id, name, title, source, status, customized,
              version_snapshot, source_template_version, program_data, started_at, created_at, updated_at
       FROM app_athlete_programs
       WHERE user_id = $1 AND status = 'active'
       ORDER BY id DESC LIMIT 1`,
      [authUser.id]
    );

    if (qRes.rows.length === 0) {
      return res.json({ ok: true, program: null });
    }

    return res.json({ ok: true, program: qRes.rows[0] });
  } catch (error) {
    console.error("GET_ME_PROGRAM_ERROR", error);
    return res.status(500).json({ error: "Failed to get active athlete program." });
  }
});


// Task 8: Athlete Program Customization Endpoints
app.get(["/api/me/program/customization-options", "/api/me/program/:id/customization-options"], async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Authentication required." });
    }

    let profile = null;
    if (process.env.DATABASE_URL) {
      const pRes = await pool.query("SELECT * FROM app_athlete_profiles WHERE user_id = $1", [authUser.id]);
      if (pRes.rows.length) profile = pRes.rows[0];
    }

    return res.json({
      ok: true,
      options: {
        frequencies: [3, 4, 5, 6],
        durations: [4, 8, 12, 16],
        equipment: ["Palestra Commerciale", "Home Gym", "Pesi Liberi (Manubri & Bilancieri)", "Macchine Isotoniche", "Corpo Libero / Bodyweight"],
        intensitySystems: ["RIR", "RPE", "%1RM"],
        commonExclusions: [
          "Squat con Bilanciere",
          "Stacco da Terra con Bilanciere",
          "Panca Piana con Bilanciere",
          "Military Press con Bilanciere",
          "Trazioni alla Sbarra"
        ]
      },
      defaults: {
        frequency: profile?.training_frequency || 4,
        duration: 12,
        equipment: "Palestra Commerciale",
        intensityType: profile?.intensity_type || "RIR"
      }
    });
  } catch (error) {
    console.error("GET_CUSTOMIZATION_OPTIONS_ERROR", error);
    return res.status(500).json({ error: "Failed to load customization options." });
  }
});

app.post(["/api/me/program/customize", "/api/me/program/:id/customize"], async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const { frequency, duration, equipment, exerciseExclusions, intensityType } = req.body || {};

    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ error: "Database not configured." });
    }

    // Retrieve the active athlete program
    const progRes = await pool.query(
      "SELECT * FROM app_athlete_programs WHERE user_id = $1 AND status = 'active' ORDER BY id DESC LIMIT 1",
      [authUser.id]
    );

    if (progRes.rows.length === 0) {
      return res.status(404).json({ error: "Nessun programma attivo trovato per questo atleta." });
    }

    const athleteProg = progRes.rows[0];
    const currentProgData = athleteProg.program_data || athleteProg.data;

    // Retrieve profile for default mappings
    const pRes = await pool.query("SELECT * FROM app_athlete_profiles WHERE user_id = $1", [authUser.id]);
    const athleteProfile = pRes.rows[0] || null;

    // Adapt program deterministically
    const { adaptedProgram, diffs } = adaptProgramCustomization(currentProgData, {
      frequency,
      duration,
      equipment,
      exerciseExclusions,
      intensityType,
      athleteProfile
    });

    // Build customization log entry
    const historyEntry = {
      timestamp: new Date().toISOString(),
      customizations: { frequency, duration, equipment, exerciseExclusions, intensityType },
      diffs
    };

    const client = await pool.connect();
    let updatedProgram = null;

    try {
      await client.query("BEGIN");

      const existingHistory = Array.isArray(athleteProg.customization_history) ? athleteProg.customization_history : [];
      const updatedHistory = [...existingHistory, historyEntry];
      const newVersion = (athleteProg.version_snapshot || "1.0.0") + "-custom." + (updatedHistory.length);

      const updRes = await client.query(
        `UPDATE app_athlete_programs
         SET customized = true,
             version_snapshot = $1,
             program_data = $2,
             data = $2,
             customization_history = $3,
             updated_at = NOW()
         WHERE id = $4 AND user_id = $5
         RETURNING id, user_id, template_id, name, title, source, status, customized, version_snapshot, source_template_version, program_data, customization_history, started_at, created_at, updated_at`,
        [newVersion, JSON.stringify(adaptedProgram), JSON.stringify(updatedHistory), athleteProg.id, authUser.id]
      );

      updatedProgram = updRes.rows[0];

      // Update app_account_data for backwards compatibility
      await client.query(
        `INSERT INTO app_account_data(user_id, data, updated_at)
         VALUES($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()`,
        [authUser.id, JSON.stringify({ activeProgram: adaptedProgram, activeProgramId: updatedProgram.id })]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return res.json({
      ok: true,
      program: updatedProgram,
      diffs,
      message: "Personalizzazione applicata con successo."
    });
  } catch (error) {
    console.error("CUSTOMIZE_PROGRAM_ERROR", error);
    return res.status(500).json({ error: "Failed to customize program." });
  }
});

app.get(["/api/me/program/versions", "/api/me/program/:id/versions"], async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Authentication required." });
    }

    if (!process.env.DATABASE_URL) {
      return res.json({ ok: true, versions: [] });
    }

    const progRes = await pool.query(
      "SELECT id, version_snapshot, source_template_version, customized, customization_history, updated_at FROM app_athlete_programs WHERE user_id = $1 AND status = 'active' ORDER BY id DESC LIMIT 1",
      [authUser.id]
    );

    if (progRes.rows.length === 0) {
      return res.json({ ok: true, versions: [] });
    }

    const prog = progRes.rows[0];
    return res.json({
      ok: true,
      currentVersion: prog.version_snapshot,
      templateVersion: prog.source_template_version,
      customized: prog.customized,
      history: prog.customization_history || []
    });
  } catch (error) {
    console.error("GET_PROGRAM_VERSIONS_ERROR", error);
    return res.status(500).json({ error: "Failed to get program versions." });
  }
});


app.get(["/api/me/programs", "/api/me/programs/history"], async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Authentication required." });
    }

    if (!process.env.DATABASE_URL) {
      return res.json({ ok: true, programs: [] });
    }

    const qRes = await pool.query(
      `SELECT id, user_id, template_id, name, title, source, status, customized,
              version_snapshot, source_template_version, started_at, completed_at, created_at, updated_at
       FROM app_athlete_programs
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [authUser.id]
    );

    return res.json({ ok: true, programs: qRes.rows, count: qRes.rows.length });
  } catch (error) {
    console.error("GET_ME_PROGRAMS_ERROR", error);
    return res.status(500).json({ error: "Failed to get athlete program history." });
  }
});

app.post(["/api/me/program/:id/archive", "/api/me/programs/:id/archive"], async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const progId = req.params.id;
    const qRes = await pool.query(
      "UPDATE app_athlete_programs SET status = 'archived', updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id",
      [progId, authUser.id]
    );

    if (qRes.rows.length === 0) {
      return res.status(404).json({ error: "Program not found or access denied." });
    }

    return res.json({ ok: true, message: "Program archived successfully." });
  } catch (error) {
    console.error("ARCHIVE_PROGRAM_ERROR", error);
    return res.status(500).json({ error: "Failed to archive program." });
  }
});


app.get("/api/programs-meta/categories", async (req, res) => {
  return res.json({
    ok: true,
    categories: ["Tutti", "Hypertrophy", "Strength", "Powerlifting", "Bodybuilding", "General Fitness", "Athletic Performance"],
    difficulties: ["Beginner", "Intermediate", "Advanced"],
    frequencies: [3, 4, 5, 6],
    durations: [4, 8, 12, 16],
    equipments: ["Tutta", "Palestra Commerciale", "Bilanciere & Rack", "Solo Manubri", "Cavi & Macchine", "Home Gym"],
    sortOptions: [
      { id: "recommended", label: "Consigliati per te" },
      { id: "duration_asc", label: "Durata: breve -> lunga" },
      { id: "duration_desc", label: "Durata: lunga -> breve" },
      { id: "frequency_asc", label: "Frequenza: minore -> maggiore" },
      { id: "frequency_desc", label: "Frequenza: maggiore -> minore" },
      { id: "difficulty_asc", label: "Livello: base -> avanzato" },
      { id: "difficulty_desc", label: "Livello: avanzato -> base" }
    ]
  });
});

app.get("/api/program/active", async (req, res) => {
  try {
    const auth = await accountFromBearer(req.headers.authorization);
    if (!auth) return res.json({ ok: true, program: null });
    const dataRes = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [auth.id]);
    const currentData = dataRes.rows[0]?.data || {};
    return res.json({ ok: true, program: currentData.activeProgram || null });
  } catch (err) {
    return res.json({ ok: true, program: null });
  }
});

app.post("/api/program/modify", async (req, res) => {
  try {
    let operations = (req.body || {}).operations;
    const actionsIn = (req.body || {}).actions;
    if ((!Array.isArray(operations) || !operations.length) && Array.isArray(actionsIn) && actionsIn.length) {
      operations = actionsToOperations(actionsIn);
    }
    if (!Array.isArray(operations) || !operations.length) {
      return res.status(400).json({ error: "operations array is required" });
    }

    const auth = await accountFromBearer(req.headers.authorization);
    let activeProg = null;
    if (auth) {
      const dataRes = await pool.query("SELECT data FROM app_account_data WHERE user_id = $1", [auth.id]);
      const currentData = dataRes.rows[0]?.data || {};
      activeProg = currentData.activeProgram;
    }

    if (!activeProg && req.body.program) {
      activeProg = req.body.program;
    }

    if (!activeProg) {
      return res.status(400).json({ error: "No active program found to modify" });
    }

    const modResult = applyOperationsToProgram(activeProg, operations);
    const canonicalActions = operationsToActions(operations, {
      source: req.body.source || 'AI',
      reason: req.body.reason || ''
    });

    if (auth && modResult.ok) {
      await pool.query(
        `UPDATE app_account_data
         SET data = jsonb_set(data, '{activeProgram}', $1::jsonb), updated_at = NOW()
         WHERE user_id = $2`,
        [JSON.stringify(modResult.program), auth.id]
      );
    }

    return res.json({
      ok: true,
      program: modResult.program,
      appliedCount: modResult.appliedCount,
      actions: canonicalActions
    });
  } catch (err) {
    console.error("Program modify error:", err);
    return res.status(400).json({ error: err.message });
  }
});

app.post("/api/document/semantic", async (req, res) => {
  try {
    const body = req.body || {};
    const chunks = Array.isArray(body.chunks) ? body.chunks.slice(0, 12) : [];
    const classificationHint = body.classification || "UNKNOWN";
    if (!chunks.length) {
      return res.status(400).json({ ok: false, error: "chunks required (max 12)" });
    }
    const totalChars = chunks.reduce((n, c) => n + String(c?.text || "").length, 0);
    if (totalChars > 40000) {
      return res.status(413).json({ ok: false, error: "chunks troppo grandi — riduci il payload" });
    }
    const prompt = `Sei un motore di interpretazione semantica fitness. Ricevi SOLO chunk testuali già estratti da un parser.
NON inventare esercizi, serie, reps, carichi, alimenti o dosi assenti nei chunk.
Se ambiguo, metti confidence bassa e flag FLAG_FOR_REVIEW.
classificazione_suggerita=${classificationHint}
Restituisci JSON: { "entities": [ { "type":"exercise|food|supplement|note", "value":"...", "originalText":"...", "confidence":0-1, "sourceChunk":0 } ], "warnings":[] }`;
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt + "\n\nCHUNKS:\n" + JSON.stringify(chunks) }] }],
      config: { responseMimeType: "application/json" }
    });
    const text = (response.text || "").trim();
    let parsed = { entities: [], warnings: ["empty_ai"] };
    try { parsed = JSON.parse(text); } catch (_) {
      return res.json({ ok: true, fallback: true, entities: [], warnings: ["ai_parse_failed"], raw: text.slice(0, 2000) });
    }
    return res.json({ ok: true, fallback: false, ...parsed });
  } catch (err) {
    console.error("[DOCUMENT_SEMANTIC]", err);
    return res.status(200).json({ ok: true, fallback: true, entities: [], warnings: [err.message || "semantic_unavailable"] });
  }
});

app.post("/api/document/detect", async (req, res) => {
  try {
    const rawBase64 = req.body?.data_base64 || req.body?.dataBase64;
    if (!rawBase64) return res.status(400).json({ error: "data_base64 required" });
    const buffer = Buffer.from(String(rawBase64).replace(/^data:[^;]+;base64,/, ""), "base64");
    if (buffer.length > (DI_MAX_BYTES || 12 * 1024 * 1024)) {
      return res.status(413).json({ error: "file too large" });
    }
    const detect = detectFormat(buffer, req.body?.filename || "", req.body?.mime_type || "");
    return res.json({ ok: true, detect });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.post(["/api/analyze-file", "/api/analyze", "/analyze"], async (req, res) => {
  let filename = "unknown";
  let mimeType = "";
  let parser = "none";
  try {
    const body = req.body || {};
    filename = body.filename || "document.bin";
    mimeType = body.mime_type || body.mimeType || "";
    const rawBase64 = body.data_base64 || body.dataBase64 || body.base64;

    if (!rawBase64 || typeof rawBase64 !== "string" || !rawBase64.trim()) {
      return res.status(400).json({ error: "Campo data_base64 mancante o non valido." });
    }

    const cleanBase64 = rawBase64.replace(/^data:[^;]+;base64,/, "").trim();
    const buffer = Buffer.from(cleanBase64, "base64");

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: "Buffer decodificato vuoto." });
    }

    if (buffer.length > 50 * 1024 * 1024) {
      return res.status(413).json({ error: "Il file supera la dimensione massima consentita (50 MB)." });
    }

    const { structuredWorkout, parser: usedParser, documentIR } = await processDocumentAnalysis({
      filename,
      mimeType,
      buffer
    });
    parser = usedParser;

    if (documentIR) {
      return res.json({ ...structuredWorkout, _documentIR: documentIR, _parser: parser });
    }
    return res.json(structuredWorkout);
  } catch (error) {
    console.error(`[FILE_ANALYZE_ERROR] filename="${filename}" parser="${parser}" error_name="${error?.name}" error_message="${error?.message}"`);
    const status = error?.statusCode || (/Payload too large/i.test(error?.message) ? 413 : 500);
    return res.status(status).json({
      error: "Document analysis failed.",
      details: error.message
    });
  }
});

app.post("/api/ingest/document", upload.single("file"), async (req, res) => {
  let filename = "unknown";
  let mimeType = "";
  let parser = "none";
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }
    filename = req.file.originalname || "document.bin";
    mimeType = req.file.mimetype || "";
    const buffer = req.file.buffer;

    const { structuredWorkout, parser: usedParser } = await processDocumentAnalysis({
      filename,
      mimeType,
      buffer
    });
    parser = usedParser;

    return res.json(structuredWorkout);
  } catch (error) {
    console.error(`[FILE_ANALYZE_ERROR] filename="${filename}" parser="${parser}" error_name="${error?.name}" error_message="${error?.message}"`);
    return res.status(500).json({
      error: "Document ingestion failed.",
      details: error.message
    });
  }
});

app.post("/api/program/reprogram", async (req, res) => {
  try {
    const body = req.body || {};
    const kind = body.kind === "days" ? "days" : "duration";
    const desired = Math.max(1, Math.min(52, parseInt(body.desired, 10) || 4));
    const goal = String(body.goal || "IPERTROFIA / MASSA");
    const secondary = String(body.secondary || "");
    const constraints = String(body.constraints || "");
    const program = body.program || null;
    const summary = body.programSummary || null;
    if (!program && !summary) {
      return res.status(400).json({ ok: false, error: "program or programSummary required" });
    }

    const compact = summary || {
      title: program?.title,
      weeks: (program?.weeks || []).slice(0, 4).map((w, wi) => ({
        week: wi + 1,
        sessions: (w.sessions || w.days || []).map((s) => ({
          name: s.name || s.title,
          exercises: (s.exercises || []).slice(0, 12).map((e) => ({
            name: e.name || e.exercise,
            sets: e.sets_count || e.prescription?.sets || (Array.isArray(e.sets) ? e.sets.length : 3),
            reps: e.reps_target || e.repsTarget || e.prescription?.reps || "8-10",
            rir: e.rir_target ?? e.rirTarget ?? 2
          }))
        }))
      }))
    };

    const prompt = `Sei un coach di programmazione. Adatta il programma all'obiettivo.
Obiettivo primario: ${goal}
${secondary ? `Obiettivo secondario: ${secondary}` : ""}
${kind === "duration" ? `Durata target: ${desired} settimane` : `Frequenza target: ${desired} giorni/settimana`}
${constraints ? `Vincoli: ${constraints}` : ""}

REGOLE:
- Restituisci SOLO JSON valido (nessun markdown).
- Schema: {"title":"...","weeks":[{"week_number":1,"label":"Settimana 1","sessions":[{"name":"Giorno 1","exercises":[{"name":"...","sets_count":4,"reps_target":"10","rir_target":2,"rest_seconds":90,"notes":""}]}]}]}
- Mantieni gli esercizi riconoscibili dal programma base.
- Numero settimane = ${kind === "duration" ? desired : "come nel base, progressione sull'intensità"}.
- Non inventare alimentazione/terapia.

PROGRAMMA BASE:
${JSON.stringify(compact).slice(0, 28000)}`;

    const ai = getClient();
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });
    const text = (response.text || "").trim();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (_) {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try { parsed = JSON.parse(text.slice(start, end + 1)); } catch (__) {}
      }
    }
    if (!parsed || !(parsed.weeks || parsed.program?.weeks || parsed.training?.weeks)) {
      return res.status(200).json({
        ok: false,
        fallback: true,
        error: "invalid_ai_json",
        raw: text.slice(0, 2000)
      });
    }
    const prog = parsed.program || parsed.training || parsed;
    return res.json({ ok: true, fallback: false, program: prog });
  } catch (err) {
    console.error("[PROGRAM_REPROGRAM]", err);
    return res.status(200).json({
      ok: false,
      fallback: true,
      error: err.message || "reprogram_failed"
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const gw = await initAiGateway();
    const result = await gw.handleChat(req);
    if (result.body?.extras?.retryAfterSec || result.body?.retryAfterSec) {
      res.setHeader("Retry-After", String(result.body.retryAfterSec || result.body.extras?.retryAfterSec));
    }
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    console.error("Chat error:", {
      requestId: req.requestId,
      name: error?.name,
      message: error?.message,
      status: error?.status || error?.statusCode
    });
    return res.status(500).json({
      ok: false,
      error: "Coach interaction failed.",
      code: "AI_PROVIDER_ERROR",
      requestId: req.requestId
    });
  }
});


app.post("/api/coach/check-in", async (req, res) => {
  try {
    const gw = await initAiGateway();
    const result = await gw.handleCheckIn(req);
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    console.error("CHECK_IN_ERROR", error);
    return res.status(500).json({ ok: false, error: "Check-in failed.", code: "AI_PROVIDER_ERROR" });
  }
});


// Task 9A: Universal Import Engine Endpoints
app.post("/api/imports", upload.single("file"), async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Autenticazione richiesta per caricare documenti." });
    }

    let file = req.file;
    // Support base64 JSON payload fallback for WebView / API clients
    if (!file && req.body && req.body.base64 && req.body.filename) {
      const buf = Buffer.from(req.body.base64, "base64");
      file = {
        buffer: buf,
        size: buf.length,
        originalname: req.body.filename,
        mimetype: req.body.mime_type || "application/octet-stream"
      };
    }

    const validation = validateImportFile(file);
    if (!validation.valid) {
      const statusCode = validation.error.includes("supera la dimensione") ? 413 : 400;
      return res.status(statusCode).json({ error: validation.error });
    }

    const safeStorageName = `import_${Date.now()}_${crypto.randomUUID()}${validation.ext}`;
    const saved = await storageAdapter.save(file.buffer, safeStorageName, validation.mime);

    let createdRecord = null;
    if (process.env.DATABASE_URL) {
      const qRes = await pool.query(
        `INSERT INTO app_imports (
          user_id, original_filename, stored_filename, mime_type, file_extension,
          file_size_bytes, storage_path, storage_provider, status, source_type,
          parser_version, analysis_status, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'uploaded', 'unknown', '1.0.0', 'pending', $9, NOW(), NOW())
        RETURNING id, user_id, original_filename, mime_type, file_extension, file_size_bytes, status, source_type, created_at`,
        [
          authUser.id,
          validation.originalName,
          safeStorageName,
          validation.mime,
          validation.ext,
          validation.size,
          saved.storage_path,
          saved.storage_provider,
          JSON.stringify({ upload_source: "universal_import_engine", client_ip: req.ip })
        ]
      );
      createdRecord = qRes.rows[0];
    } else {
      createdRecord = {
        id: Date.now(),
        user_id: authUser.id,
        original_filename: validation.originalName,
        mime_type: validation.mime,
        file_extension: validation.ext,
        file_size_bytes: validation.size,
        status: "uploaded",
        source_type: "unknown",
        created_at: new Date().toISOString()
      };
    }

    return res.status(201).json({
      ok: true,
      import: {
        id: createdRecord.id,
        filename: createdRecord.original_filename,
        mime_type: createdRecord.mime_type,
        file_extension: createdRecord.file_extension,
        size: Number(createdRecord.file_size_bytes),
        status: createdRecord.status,
        created_at: createdRecord.created_at
      },
      message: "File caricato con successo. Pronto per l'analisi (Task ⑨B)."
    });
  } catch (error) {
    console.error("UPLOAD_IMPORT_ERROR", error);
    return res.status(500).json({ error: "Errore durante il caricamento del file." });
  }
});

app.get("/api/imports", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Autenticazione richiesta." });
    }

    if (!process.env.DATABASE_URL) {
      return res.json({ ok: true, imports: [], count: 0 });
    }

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const qRes = await pool.query(
      `SELECT id, user_id, original_filename, mime_type, file_extension,
              file_size_bytes, status, source_type, parser_version, analysis_status, created_at
       FROM app_imports
       WHERE user_id = $1 AND status != 'deleted'
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [authUser.id, limit, offset]
    );

    return res.json({
      ok: true,
      imports: qRes.rows.map(r => ({
        id: r.id,
        filename: r.original_filename,
        mime_type: r.mime_type,
        file_extension: r.file_extension,
        size: Number(r.file_size_bytes),
        status: r.status,
        source_type: r.source_type,
        created_at: r.created_at
      })),
      count: qRes.rows.length
    });
  } catch (error) {
    console.error("GET_IMPORTS_ERROR", error);
    return res.status(500).json({ error: "Impossibile recuperare lo storico dei file importati." });
  }
});

app.get("/api/imports/:id", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Autenticazione richiesta." });
    }

    const importId = req.params.id;
    if (!process.env.DATABASE_URL) {
      return res.status(404).json({ error: "File non trovato." });
    }

    const qRes = await pool.query(
      `SELECT id, user_id, original_filename, mime_type, file_extension,
              file_size_bytes, status, source_type, parser_version, analysis_status, metadata, created_at
       FROM app_imports
       WHERE id = $1 AND user_id = $2 AND status != 'deleted'`,
      [importId, authUser.id]
    );

    if (qRes.rows.length === 0) {
      return res.status(404).json({ error: "File non trovato o accesso non autorizzato." });
    }

    const r = qRes.rows[0];
    return res.json({
      ok: true,
      import: {
        id: r.id,
        filename: r.original_filename,
        mime_type: r.mime_type,
        file_extension: r.file_extension,
        size: Number(r.file_size_bytes),
        status: r.status,
        source_type: r.source_type,
        created_at: r.created_at,
        metadata: r.metadata
      }
    });
  } catch (error) {
    console.error("GET_IMPORT_DETAIL_ERROR", error);
    return res.status(500).json({ error: "Impossibile recuperare il dettaglio del file." });
  }
});

app.get("/api/imports/:id/download", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Autenticazione richiesta." });
    }

    const importId = req.params.id;
    if (!process.env.DATABASE_URL) {
      return res.status(404).json({ error: "File non trovato." });
    }

    const qRes = await pool.query(
      "SELECT * FROM app_imports WHERE id = $1 AND user_id = $2 AND status != 'deleted'",
      [importId, authUser.id]
    );

    if (qRes.rows.length === 0) {
      return res.status(404).json({ error: "File non trovato o accesso non autorizzato." });
    }

    const record = qRes.rows[0];
    const buffer = await storageAdapter.get(record.storage_path);
    if (!buffer) {
      return res.status(404).json({ error: "Contenuto del file non presente nello storage." });
    }

    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(record.original_filename)}"`);
    res.setHeader("Content-Type", record.mime_type || "application/octet-stream");
    return res.send(buffer);
  } catch (error) {
    console.error("DOWNLOAD_IMPORT_ERROR", error);
    return res.status(500).json({ error: "Errore durante il download del file." });
  }
});

app.delete("/api/imports/:id", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Autenticazione richiesta." });
    }

    const importId = req.params.id;
    if (!process.env.DATABASE_URL) {
      return res.status(404).json({ error: "File non trovato." });
    }

    const qRes = await pool.query(
      "SELECT * FROM app_imports WHERE id = $1 AND user_id = $2",
      [importId, authUser.id]
    );

    if (qRes.rows.length === 0) {
      return res.status(404).json({ error: "File non trovato o accesso non autorizzato." });
    }

    const record = qRes.rows[0];
    await storageAdapter.delete(record.storage_path);

    await pool.query(
      "UPDATE app_imports SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND user_id = $2",
      [importId, authUser.id]
    );

    return res.json({ ok: true, message: "File eliminato con successo." });
  } catch (error) {
    console.error("DELETE_IMPORT_ERROR", error);
    return res.status(500).json({ error: "Errore durante l'eliminazione del file." });
  }
});



// Task 9: Universal Program Import Engine Endpoints
app.post("/api/me/program-import", upload.single("file"), async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Autenticazione richiesta per importare una programmazione." });
    }

    let file = req.file;
    let textInput = req.body?.text;
    let filename = file?.originalname || req.body?.filename || "programma_manuale.txt";
    let mimeType = file?.mimetype || req.body?.mime_type || "text/plain";
    let buffer = file?.buffer;

    if (!buffer && textInput) {
      buffer = Buffer.from(textInput, "utf-8");
      mimeType = "text/plain";
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: "Nessun file o testo fornito per l'importazione." });
    }

    const maxBytes = (Number(process.env.IMPORT_MAX_FILE_SIZE_MB) || 25) * 1024 * 1024;
    if (buffer.length > maxBytes) {
      return res.status(413).json({ error: `Il file supera il limite massimo consentito di ${Math.round(maxBytes / (1024 * 1024))} MB.` });
    }

    // 1. Extract raw content & structured canonical model 2.0
    const extraction = await extractDocumentContent({ filename, mimeType, buffer });
    const program = extraction.canonicalProgram || extraction.program || parseCanonicalProgramFromText(extraction.rawText || "", filename).program;
    const warnings = extraction.warnings || [];
    const errors = extraction.errors || [];
    const stats = extraction.stats || {};
    const parser = extraction.parser || "unknown";
    const ext = extraction.ext || path.extname(filename) || ".txt";
    const rawText = extraction.rawText || "";

    // 3. Save raw file into storage adapter
    const safeStorageName = `prog_import_${Date.now()}_${crypto.randomUUID()}${ext || '.txt'}`;
    const saved = await storageAdapter.save(buffer, safeStorageName, mimeType);

    // 4. Save record in app_program_imports
    let createdRecord = null;
    if (process.env.DATABASE_URL) {
      const qRes = await pool.query(
        `INSERT INTO app_program_imports (
          user_id, filename, file_type, file_size_bytes, storage_path,
          status, raw_text, raw_metadata, parsed_data, warnings, errors, stats, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'reviewing', $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING id, user_id, filename, file_type, file_size_bytes, status, parsed_data, warnings, errors, stats, created_at`,
        [
          authUser.id,
          filename,
          ext || path.extname(filename) || ".txt",
          buffer.length,
          saved.storage_path,
          rawText,
          JSON.stringify({ parser, mimeType, original_size: buffer.length }),
          JSON.stringify(program),
          JSON.stringify(warnings),
          JSON.stringify(errors),
          JSON.stringify(stats)
        ]
      );
      createdRecord = qRes.rows[0];
    } else {
      createdRecord = {
        id: Date.now(),
        user_id: authUser.id,
        filename,
        file_type: ext || ".txt",
        file_size_bytes: buffer.length,
        status: "reviewing",
        parsed_data: program,
        warnings,
        errors,
        stats,
        created_at: new Date().toISOString()
      };
    }

    return res.status(201).json({
      ok: true,
      importId: createdRecord.id,
      import: {
        id: createdRecord.id,
        filename: createdRecord.filename,
        file_type: createdRecord.file_type,
        status: createdRecord.status,
        stats: createdRecord.stats,
        created_at: createdRecord.created_at
      },
      canonicalProgram: createdRecord.parsed_data,
      warnings: createdRecord.warnings,
      errors: createdRecord.errors,
      stats: createdRecord.stats,
      message: "File analizzato con successo. Import Review pronta per la verifica."
    });
  } catch (error) {
    console.error("PROGRAM_IMPORT_ERROR", error);
    return res.status(500).json({ error: "Errore durante l'acquisizione e l'analisi del programma: " + error.message });
  }
});

app.get(["/api/me/program-imports", "/api/me/program-import"], async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Autenticazione richiesta." });
    }

    if (!process.env.DATABASE_URL) {
      return res.json({ ok: true, imports: [], count: 0 });
    }

    const qRes = await pool.query(
      `SELECT id, user_id, filename, file_type, file_size_bytes, status, stats, warnings, errors, created_at, updated_at
       FROM app_program_imports
       WHERE user_id = $1 AND status != 'deleted'
       ORDER BY created_at DESC`,
      [authUser.id]
    );

    return res.json({
      ok: true,
      imports: qRes.rows,
      count: qRes.rows.length
    });
  } catch (error) {
    console.error("GET_PROGRAM_IMPORTS_ERROR", error);
    return res.status(500).json({ error: "Impossibile caricare lo storico importazioni." });
  }
});

app.get("/api/me/program-import/:id", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Autenticazione richiesta." });
    }

    const importId = req.params.id;
    if (!process.env.DATABASE_URL) {
      return res.status(404).json({ error: "Import non trovato." });
    }

    const qRes = await pool.query(
      "SELECT * FROM app_program_imports WHERE id = $1 AND user_id = $2 AND status != 'deleted'",
      [importId, authUser.id]
    );

    if (qRes.rows.length === 0) {
      return res.status(404).json({ error: "Importazione non trovata o accesso negato." });
    }

    const r = qRes.rows[0];
    return res.json({
      ok: true,
      import: {
        id: r.id,
        filename: r.filename,
        file_type: r.file_type,
        status: r.status,
        created_at: r.created_at
      },
      canonicalProgram: r.parsed_data,
      warnings: r.warnings || [],
      errors: r.errors || [],
      stats: r.stats || {}
    });
  } catch (error) {
    console.error("GET_PROGRAM_IMPORT_DETAIL_ERROR", error);
    return res.status(500).json({ error: "Impossibile recuperare il dettaglio dell'importazione." });
  }
});

app.post("/api/me/program-import/:id/analyze", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Autenticazione richiesta." });
    }

    const importId = req.params.id;
    if (!process.env.DATABASE_URL) {
      return res.status(404).json({ error: "Import non trovato." });
    }

    const qRes = await pool.query(
      "SELECT * FROM app_program_imports WHERE id = $1 AND user_id = $2 AND status != 'deleted'",
      [importId, authUser.id]
    );

    if (qRes.rows.length === 0) {
      return res.status(404).json({ error: "Importazione non trovata." });
    }

    const record = qRes.rows[0];
    const rawText = record.raw_text || "";

    // Re-run canonical parsing
    const { program, warnings, errors, stats } = parseCanonicalProgramFromText(rawText, record.filename);

    await pool.query(
      `UPDATE app_program_imports
       SET parsed_data = $1, warnings = $2, errors = $3, stats = $4, status = 'reviewing', updated_at = NOW()
       WHERE id = $5 AND user_id = $6`,
      [JSON.stringify(program), JSON.stringify(warnings), JSON.stringify(errors), JSON.stringify(stats), importId, authUser.id]
    );

    return res.json({
      ok: true,
      canonicalProgram: program,
      warnings,
      errors,
      stats,
      message: "Analisi semantica completata."
    });
  } catch (error) {
    console.error("REANALYZE_PROGRAM_IMPORT_ERROR", error);
    return res.status(500).json({ error: "Errore durante la ri-analisi del programma." });
  }
});

app.put("/api/me/program-import/:id/review", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Autenticazione richiesta." });
    }

    const importId = req.params.id;
    const { canonicalProgram, warnings, errors } = req.body || {};

    if (!canonicalProgram) {
      return res.status(400).json({ error: "Struttura programmazione canonica mancante." });
    }

    if (!process.env.DATABASE_URL) {
      return res.status(404).json({ error: "Database non configurato." });
    }

    const qRes = await pool.query(
      "SELECT id FROM app_program_imports WHERE id = $1 AND user_id = $2 AND status != 'deleted'",
      [importId, authUser.id]
    );

    if (qRes.rows.length === 0) {
      return res.status(404).json({ error: "Importazione non trovata o accesso non autorizzato." });
    }

    await pool.query(
      `UPDATE app_program_imports
       SET parsed_data = $1, warnings = $2, errors = $3, status = 'reviewing', updated_at = NOW()
       WHERE id = $4 AND user_id = $5`,
      [JSON.stringify(canonicalProgram), JSON.stringify(warnings || []), JSON.stringify(errors || []), importId, authUser.id]
    );

    return res.json({
      ok: true,
      message: "Modifiche salvate con successo nella review."
    });
  } catch (error) {
    console.error("UPDATE_PROGRAM_REVIEW_ERROR", error);
    return res.status(500).json({ error: "Impossibile salvare le modifiche della review." });
  }
});

app.post("/api/me/program-import/:id/confirm", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Autenticazione richiesta." });
    }

    const importId = req.params.id;
    if (!process.env.DATABASE_URL) {
      return res.status(404).json({ error: "Database non configurato." });
    }

    const qRes = await pool.query(
      "SELECT * FROM app_program_imports WHERE id = $1 AND user_id = $2 AND status != 'deleted'",
      [importId, authUser.id]
    );

    if (qRes.rows.length === 0) {
      return res.status(404).json({ error: "Importazione non trovata o accesso non autorizzato." });
    }

    const importRecord = qRes.rows[0];
    const canonicalProg = importRecord.parsed_data || {};

    const progTitle = canonicalProg.title || canonicalProg.normalized_title || importRecord.filename || "Programma Importato";

    const client = await pool.connect();
    let athleteProgram = null;

    try {
      await client.query("BEGIN");

      // 1. Archive any current active program
      await client.query(
        "UPDATE app_athlete_programs SET status = 'archived', updated_at = NOW() WHERE user_id = $1 AND status = 'active'",
        [authUser.id]
      );

      // 2. Insert new active athlete program
      const insRes = await client.query(
        `INSERT INTO app_athlete_programs (
          user_id, template_id, name, title, source, status, customized,
          version_snapshot, source_template_version, program_data, data, started_at, created_at, updated_at
        ) VALUES (
          $1, NULL, $2, $2, 'IMPORTED', 'active', false,
          '1.0.0-imported', '1.0.0', $3, $3, NOW(), NOW(), NOW()
        ) RETURNING id, user_id, name, title, source, status, version_snapshot, program_data, started_at, created_at`,
        [authUser.id, progTitle, JSON.stringify(canonicalProg)]
      );

      athleteProgram = insRes.rows[0];

      // 3. Mark import as confirmed
      await client.query(
        "UPDATE app_program_imports SET status = 'confirmed', updated_at = NOW() WHERE id = $1 AND user_id = $2",
        [importId, authUser.id]
      );

      // 4. Update app_account_data for backwards compatibility
      await client.query(
        `INSERT INTO app_account_data(user_id, data, updated_at)
         VALUES($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()`,
        [authUser.id, JSON.stringify({ activeProgram: canonicalProg, activeProgramId: athleteProgram.id })]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return res.json({
      ok: true,
      programId: athleteProgram.id,
      athleteProgram,
      message: "Programma confermato e attivato con successo sulla tua Dashboard!"
    });
  } catch (error) {
    console.error("CONFIRM_PROGRAM_IMPORT_ERROR", error);
    return res.status(500).json({ error: "Errore durante la conferma e attivazione del programma: " + error.message });
  }
});

app.delete("/api/me/program-import/:id", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: "Autenticazione richiesta." });
    }

    const importId = req.params.id;
    if (!process.env.DATABASE_URL) {
      return res.status(404).json({ error: "Database non configurato." });
    }

    const qRes = await pool.query(
      "SELECT id FROM app_program_imports WHERE id = $1 AND user_id = $2",
      [importId, authUser.id]
    );

    if (qRes.rows.length === 0) {
      return res.status(404).json({ error: "Importazione non trovata o accesso non autorizzato." });
    }

    await pool.query(
      "UPDATE app_program_imports SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND user_id = $2",
      [importId, authUser.id]
    );

    return res.json({
      ok: true,
      message: "Importazione annullata ed eliminata."
    });
  } catch (error) {
    console.error("DELETE_PROGRAM_IMPORT_ERROR", error);
    return res.status(500).json({ error: "Impossibile eliminare l'importazione." });
  }
});



// ==========================================
// TASK 10: TRAINING LOGGER CORE ENDPOINTS
// ==========================================

// 1. Start Workout Session
app.post("/api/me/workouts/start", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) return res.status(401).json({ error: "Autenticazione richiesta per iniziare l'allenamento." });

    const {
      athlete_program_id,
      week_number = 1,
      session_number = 1,
      session_name = "Sessione di Allenamento",
      exercises = [],
      session_snapshot = {},
      force_new = false
    } = req.body || {};

    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "Database non configurato." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if there is an existing in-progress / paused workout
      if (!force_new) {
        const existingRes = await client.query(
          `SELECT id, user_id, athlete_program_id, week_number, session_number, session_name, status, started_at, duration_seconds, notes
           FROM app_workout_sessions
           WHERE user_id = $1 AND status IN ('in_progress', 'paused')
           ORDER BY started_at DESC LIMIT 1`,
          [authUser.id]
        );

        if (existingRes.rows.length > 0) {
          const activeSession = existingRes.rows[0];
          // Fetch its exercises and sets
          const exRes = await client.query(
            `SELECT * FROM app_workout_exercises WHERE workout_session_id = $1 ORDER BY order_index ASC`,
            [activeSession.id]
          );
          const exercisesWithSets = await Promise.all(
            exRes.rows.map(async (ex) => {
              const setsRes = await client.query(
                `SELECT * FROM app_workout_sets WHERE workout_exercise_id = $1 ORDER BY set_number ASC`,
                [ex.id]
              );
              return { ...ex, sets: setsRes.rows };
            })
          );

          await client.query("COMMIT");
          return res.json({
            ok: true,
            resumed: true,
            session: activeSession,
            exercises: exercisesWithSets,
            message: "Sessione attiva recuperata con successo."
          });
        }
      }

      // Close previous in-progress session if force_new is true
      if (force_new) {
        await client.query(
          "UPDATE app_workout_sessions SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE user_id = $1 AND status IN ('in_progress', 'paused')",
          [authUser.id]
        );
      }

      // 1. Insert new workout session
      const sessionRes = await client.query(
        `INSERT INTO app_workout_sessions (
          user_id, athlete_program_id, week_number, session_number, session_name,
          scheduled_at, started_at, status, notes, duration_seconds, session_snapshot, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), 'in_progress', '', 0, $6, NOW(), NOW())
        RETURNING *`,
        [authUser.id, athlete_program_id || null, week_number, session_number, session_name, JSON.stringify(session_snapshot)]
      );
      const newSession = sessionRes.rows[0];

      // 2. Insert exercises and initial prescribed sets
      const createdExercises = [];
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        const norm = normalizeExerciseName(ex.name || ex.name_normalized);
        const pSets = parseInt(ex.sets || 3, 10);
        const pReps = String(ex.reps || ex.repsTarget || "8-10");
        const pRir = ex.rir !== undefined && ex.rir !== null ? Number(ex.rir) : (ex.rirTarget !== undefined ? Number(ex.rirTarget) : 2);
        const pRpe = ex.rpe !== undefined && ex.rpe !== null ? Number(ex.rpe) : (ex.rpeTarget !== undefined ? Number(ex.rpeTarget) : null);
        const pLoad = ex.load ? String(ex.load) : (ex.load_value ? `${ex.load_value} ${ex.load_unit || 'kg'}` : "");
        const pRest = parseInt(ex.rest_seconds || ex.rest || 90, 10);

        const exRes = await client.query(
          `INSERT INTO app_workout_exercises (
            workout_session_id, exercise_id, canonical_exercise_id, name, name_original,
            muscle_group, superset_group_id, order_index, prescribed_sets, prescribed_reps,
            prescribed_rir, prescribed_rpe, prescribed_load, prescribed_rest_seconds, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
          RETURNING *`,
          [
            newSession.id,
            ex.id || `ex_${i + 1}`,
            norm.name_normalized.toLowerCase().replace(/\s+/g, "_"),
            norm.name_normalized,
            ex.name_original || ex.name,
            norm.muscle || ex.muscle_group || "TOTAL",
            ex.superset_group_id || null,
            i,
            pSets,
            pReps,
            pRir,
            pRpe,
            pLoad,
            pRest,
            ex.notes || ""
          ]
        );
        const createdEx = exRes.rows[0];

        // Insert initial prescribed sets
        const createdSets = [];
        for (let s = 1; s <= pSets; s++) {
          const setRes = await client.query(
            `INSERT INTO app_workout_sets (
              workout_exercise_id, set_number, set_type, target_reps, actual_reps,
              target_load, actual_load, load_unit, target_rir, actual_rir,
              target_rpe, actual_rpe, rest_seconds, completed, created_at, updated_at
            ) VALUES ($1, $2, 'working', $3, NULL, $4, NULL, 'kg', $5, NULL, $6, NULL, $7, false, NOW(), NOW())
            RETURNING *`,
            [createdEx.id, s, pReps, pLoad, pRir, pRpe, pRest]
          );
          createdSets.push(setRes.rows[0]);
        }

        createdExercises.push({ ...createdEx, sets: createdSets });
      }

      await client.query("COMMIT");
      return res.status(201).json({
        ok: true,
        session: newSession,
        exercises: createdExercises,
        message: "Workout iniziato! Sessione pronta per la registrazione."
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("START_WORKOUT_ERROR", error);
    return res.status(500).json({ error: "Errore durante l'avvio del workout: " + error.message });
  }
});

// 2. Get Active Workout Session
app.get("/api/me/workouts/active", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) return res.status(401).json({ error: "Autenticazione richiesta." });

    if (!process.env.DATABASE_URL) {
      return res.json({ ok: true, session: null });
    }

    const sRes = await pool.query(
      `SELECT * FROM app_workout_sessions
       WHERE user_id = $1 AND status IN ('in_progress', 'paused')
       ORDER BY started_at DESC LIMIT 1`,
      [authUser.id]
    );

    if (sRes.rows.length === 0) {
      return res.json({ ok: true, session: null });
    }

    const session = sRes.rows[0];
    const exRes = await pool.query(
      `SELECT * FROM app_workout_exercises WHERE workout_session_id = $1 ORDER BY order_index ASC`,
      [session.id]
    );

    const exercises = await Promise.all(
      exRes.rows.map(async (ex) => {
        const setsRes = await pool.query(
          `SELECT * FROM app_workout_sets WHERE workout_exercise_id = $1 ORDER BY set_number ASC`,
          [ex.id]
        );
        return { ...ex, sets: setsRes.rows };
      })
    );

    return res.json({
      ok: true,
      session,
      exercises
    });
  } catch (error) {
    console.error("GET_ACTIVE_WORKOUT_ERROR", error);
    return res.status(500).json({ error: "Impossibile recuperare il workout attivo." });
  }
});

// 3. Get Workout Session Detail
app.get("/api/me/workouts/:id", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) return res.status(401).json({ error: "Autenticazione richiesta." });

    const sessionId = req.params.id;
    if (!process.env.DATABASE_URL) return res.status(404).json({ error: "Database non configurato." });

    const sRes = await pool.query(
      "SELECT * FROM app_workout_sessions WHERE id = $1 AND user_id = $2",
      [sessionId, authUser.id]
    );

    if (sRes.rows.length === 0) return res.status(404).json({ error: "Sessione non trovata o accesso negato." });

    const session = sRes.rows[0];
    const exRes = await pool.query(
      "SELECT * FROM app_workout_exercises WHERE workout_session_id = $1 ORDER BY order_index ASC",
      [session.id]
    );

    const exercises = await Promise.all(
      exRes.rows.map(async (ex) => {
        const setsRes = await pool.query(
          "SELECT * FROM app_workout_sets WHERE workout_exercise_id = $1 ORDER BY set_number ASC",
          [ex.id]
        );
        return { ...ex, sets: setsRes.rows };
      })
    );

    return res.json({ ok: true, session, exercises });
  } catch (error) {
    console.error("GET_WORKOUT_DETAIL_ERROR", error);
    return res.status(500).json({ error: "Errore durante il recupero del workout." });
  }
});

// 4. Update Workout Session (metadata, notes, duration)
app.put("/api/me/workouts/:id", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) return res.status(401).json({ error: "Autenticazione richiesta." });

    const sessionId = req.params.id;
    const { notes, duration_seconds, status } = req.body || {};

    if (!process.env.DATABASE_URL) return res.status(404).json({ error: "Database non configurato." });

    const qRes = await pool.query(
      `UPDATE app_workout_sessions
       SET notes = COALESCE($1, notes),
           duration_seconds = COALESCE($2, duration_seconds),
           status = COALESCE($3, status),
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [notes !== undefined ? notes : null, duration_seconds !== undefined ? duration_seconds : null, status || null, sessionId, authUser.id]
    );

    if (qRes.rows.length === 0) return res.status(404).json({ error: "Workout non trovato o non modificabile." });

    return res.json({ ok: true, session: qRes.rows[0] });
  } catch (error) {
    console.error("UPDATE_WORKOUT_ERROR", error);
    return res.status(500).json({ error: "Errore durante l'aggiornamento del workout." });
  }
});

// 5. Add New Set to Workout Exercise
app.post("/api/me/workouts/:id/sets", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) return res.status(401).json({ error: "Autenticazione richiesta." });

    const sessionId = req.params.id;
    const { workout_exercise_id, set_type = "working", target_reps = "8-10", target_load = "", rest_seconds = 90 } = req.body || {};

    if (!workout_exercise_id) return res.status(400).json({ error: "workout_exercise_id obbligatorio." });

    // Verify ownership
    const vRes = await pool.query(
      `SELECT we.id, ws.user_id FROM app_workout_exercises we
       JOIN app_workout_sessions ws ON we.workout_session_id = ws.id
       WHERE we.id = $1 AND ws.id = $2 AND ws.user_id = $3`,
      [workout_exercise_id, sessionId, authUser.id]
    );

    if (vRes.rows.length === 0) return res.status(404).json({ error: "Esercizio non trovato o accesso negato." });

    // Determine next set number
    const countRes = await pool.query(
      "SELECT COUNT(*) AS total FROM app_workout_sets WHERE workout_exercise_id = $1",
      [workout_exercise_id]
    );
    const nextSetNumber = parseInt(countRes.rows[0].total, 10) + 1;

    const insRes = await pool.query(
      `INSERT INTO app_workout_sets (
        workout_exercise_id, set_number, set_type, target_reps, target_load, rest_seconds, completed, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW())
      RETURNING *`,
      [workout_exercise_id, nextSetNumber, set_type, target_reps, target_load, rest_seconds]
    );

    return res.status(201).json({ ok: true, set: insRes.rows[0] });
  } catch (error) {
    console.error("ADD_SET_ERROR", error);
    return res.status(500).json({ error: "Errore durante l'aggiunta della serie." });
  }
});

// 6. Update Set Performance (Actual load, reps, RIR, RPE, completed)
app.put("/api/me/workouts/:id/sets/:setId", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) return res.status(401).json({ error: "Autenticazione richiesta." });

    const { id: sessionId, setId } = req.params;
    const {
      actual_load,
      actual_reps,
      actual_rir,
      actual_rpe,
      set_type,
      completed,
      notes,
      rest_seconds
    } = req.body || {};

    // Verify ownership
    const vRes = await pool.query(
      `SELECT ws.id FROM app_workout_sets st
       JOIN app_workout_exercises we ON st.workout_exercise_id = we.id
       JOIN app_workout_sessions ws ON we.workout_session_id = ws.id
       WHERE st.id = $1 AND ws.id = $2 AND ws.user_id = $3`,
      [setId, sessionId, authUser.id]
    );

    if (vRes.rows.length === 0) return res.status(404).json({ error: "Serie non trovata o accesso negato." });

    const upRes = await pool.query(
      `UPDATE app_workout_sets
       SET actual_load = COALESCE($1, actual_load),
           actual_reps = COALESCE($2, actual_reps),
           actual_rir = COALESCE($3, actual_rir),
           actual_rpe = COALESCE($4, actual_rpe),
           set_type = COALESCE($5, set_type),
           completed = COALESCE($6, completed),
           completed_at = CASE WHEN $6 = true THEN NOW() ELSE completed_at END,
           notes = COALESCE($7, notes),
           rest_seconds = COALESCE($8, rest_seconds),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        actual_load !== undefined ? (actual_load !== null ? Number(actual_load) : null) : null,
        actual_reps !== undefined ? (actual_reps !== null ? parseInt(actual_reps, 10) : null) : null,
        actual_rir !== undefined ? (actual_rir !== null ? Number(actual_rir) : null) : null,
        actual_rpe !== undefined ? (actual_rpe !== null ? Number(actual_rpe) : null) : null,
        set_type || null,
        completed !== undefined ? Boolean(completed) : null,
        notes !== undefined ? notes : null,
        rest_seconds !== undefined ? parseInt(rest_seconds, 10) : null,
        setId
      ]
    );

    return res.json({ ok: true, set: upRes.rows[0] });
  } catch (error) {
    console.error("UPDATE_SET_ERROR", error);
    return res.status(500).json({ error: "Errore durante l'aggiornamento della serie: " + error.message });
  }
});

// 7. Pause Workout
app.post("/api/me/workouts/:id/pause", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) return res.status(401).json({ error: "Autenticazione richiesta." });

    const sessionId = req.params.id;
    const { duration_seconds } = req.body || {};

    const qRes = await pool.query(
      `UPDATE app_workout_sessions
       SET status = 'paused', duration_seconds = COALESCE($1, duration_seconds), updated_at = NOW()
       WHERE id = $2 AND user_id = $3 AND status = 'in_progress'
       RETURNING *`,
      [duration_seconds !== undefined ? duration_seconds : null, sessionId, authUser.id]
    );

    if (qRes.rows.length === 0) return res.status(404).json({ error: "Sessione non attiva o non trovata." });

    return res.json({ ok: true, session: qRes.rows[0], message: "Workout in pausa." });
  } catch (error) {
    console.error("PAUSE_WORKOUT_ERROR", error);
    return res.status(500).json({ error: "Errore durante la pausa del workout." });
  }
});

// 8. Resume Workout
app.post("/api/me/workouts/:id/resume", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) return res.status(401).json({ error: "Autenticazione richiesta." });

    const sessionId = req.params.id;

    const qRes = await pool.query(
      `UPDATE app_workout_sessions
       SET status = 'in_progress', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'paused'
       RETURNING *`,
      [sessionId, authUser.id]
    );

    if (qRes.rows.length === 0) return res.status(404).json({ error: "Sessione in pausa non trovata." });

    return res.json({ ok: true, session: qRes.rows[0], message: "Workout ripreso!" });
  } catch (error) {
    console.error("RESUME_WORKOUT_ERROR", error);
    return res.status(500).json({ error: "Errore durante la ripresa del workout." });
  }
});

// 9. Complete Workout
app.post("/api/me/workouts/:id/complete", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) return res.status(401).json({ error: "Autenticazione richiesta." });

    const sessionId = req.params.id;
    const { duration_seconds, notes } = req.body || {};

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const sRes = await client.query(
        `UPDATE app_workout_sessions
         SET status = 'completed', completed_at = NOW(),
             duration_seconds = COALESCE($1, duration_seconds),
             notes = COALESCE($2, notes),
             updated_at = NOW()
         WHERE id = $3 AND user_id = $4 AND status IN ('in_progress', 'paused')
         RETURNING *`,
        [duration_seconds !== undefined ? duration_seconds : null, notes !== undefined ? notes : null, sessionId, authUser.id]
      );

      if (sRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Sessione attiva non trovata." });
      }

      const session = sRes.rows[0];

      // Calculate summary stats (tonnage, total reps, sets completed)
      const statsRes = await client.query(
        `SELECT
           COUNT(st.id) AS total_sets,
           COUNT(CASE WHEN st.completed = true THEN 1 END) AS completed_sets,
           COALESCE(SUM(st.actual_reps), 0) AS total_reps,
           COALESCE(SUM(st.actual_reps * st.actual_load), 0) AS total_tonnage
         FROM app_workout_sets st
         JOIN app_workout_exercises we ON st.workout_exercise_id = we.id
         WHERE we.workout_session_id = $1`,
        [session.id]
      );

      await client.query("COMMIT");

      return res.json({
        ok: true,
        session,
        summary: statsRes.rows[0],
        message: "Workout completato con successo! Ottimo lavoro."
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("COMPLETE_WORKOUT_ERROR", error);
    return res.status(500).json({ error: "Errore durante il completamento del workout." });
  }
});

// 10. Skip Workout
app.post("/api/me/workouts/:id/skip", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) return res.status(401).json({ error: "Autenticazione richiesta." });

    const sessionId = req.params.id;
    const { notes = "Sessione saltata dall'atleta" } = req.body || {};

    const qRes = await pool.query(
      `UPDATE app_workout_sessions
       SET status = 'skipped', completed_at = NOW(), notes = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [notes, sessionId, authUser.id]
    );

    if (qRes.rows.length === 0) return res.status(404).json({ error: "Sessione non trovata." });

    return res.json({ ok: true, session: qRes.rows[0], message: "Sessione contrassegnata come saltata nello storico." });
  } catch (error) {
    console.error("SKIP_WORKOUT_ERROR", error);
    return res.status(500).json({ error: "Errore durante l'operazione." });
  }
});

// 11. Get Workout History
app.get("/api/me/workouts/history", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) return res.status(401).json({ error: "Autenticazione richiesta." });

    const limit = Math.min(100, parseInt(req.query.limit || 30, 10));
    const offset = parseInt(req.query.offset || 0, 10);

    const qRes = await pool.query(
      `SELECT ws.*,
              COUNT(DISTINCT we.id) AS exercises_count,
              COUNT(DISTINCT st.id) AS sets_count,
              COUNT(DISTINCT CASE WHEN st.completed = true THEN st.id END) AS completed_sets_count,
              COALESCE(SUM(st.actual_reps * st.actual_load), 0) AS total_tonnage
       FROM app_workout_sessions ws
       LEFT JOIN app_workout_exercises we ON we.workout_session_id = ws.id
       LEFT JOIN app_workout_sets st ON st.workout_exercise_id = we.id
       WHERE ws.user_id = $1 AND ws.status IN ('completed', 'skipped')
       GROUP BY ws.id
       ORDER BY ws.completed_at DESC NULLS LAST, ws.created_at DESC
       LIMIT $2 OFFSET $3`,
      [authUser.id, limit, offset]
    );

    return res.json({ ok: true, workouts: qRes.rows, count: qRes.rows.length });
  } catch (error) {
    console.error("GET_WORKOUT_HISTORY_ERROR", error);
    return res.status(500).json({ error: "Impossibile recuperare lo storico allenamenti." });
  }
});

// 12. Get Exercise History ("Ultima volta")
app.get("/api/me/exercises/:id/history", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) return res.status(401).json({ error: "Autenticazione richiesta." });

    const exerciseIdentifier = req.params.id; // can be canonical_exercise_id or name

    const qRes = await pool.query(
      `SELECT st.set_number, st.set_type, st.actual_load, st.actual_reps, st.actual_rir, st.actual_rpe, st.target_rir, st.target_rpe, st.target_load, st.target_reps, st.load_unit, ws.completed_at, ws.session_name
       FROM app_workout_sets st
       JOIN app_workout_exercises we ON st.workout_exercise_id = we.id
       JOIN app_workout_sessions ws ON we.workout_session_id = ws.id
       WHERE ws.user_id = $1 AND ws.status = 'completed' AND st.completed = true
         AND (we.canonical_exercise_id = $2 OR LOWER(we.name) = LOWER($2) OR LOWER(we.name_original) = LOWER($2))
       ORDER BY ws.completed_at DESC, st.set_number ASC
       LIMIT 10`,
      [authUser.id, exerciseIdentifier]
    );

    return res.json({ ok: true, history: qRes.rows });
  } catch (error) {
    console.error("GET_EXERCISE_HISTORY_ERROR", error);
    return res.status(500).json({ error: "Impossibile recuperare lo storico dell'esercizio." });
  }
});

// 12b. Log completed session from WebView local logs (offline-first sync)
app.post("/api/me/workouts/log-completed", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) return res.status(401).json({ error: "Autenticazione richiesta." });
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Database non configurato." });

    const {
      week_number = 1,
      session_number = 1,
      session_name = "Sessione",
      duration_seconds = 0,
      athlete_program_id = null,
      exercises = [],
      client_ref = null
    } = req.body || {};

    if (!Array.isArray(exercises) || !exercises.length) {
      return res.status(400).json({ error: "Nessun esercizio nella sessione." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (client_ref) {
        const dup = await client.query(
          `SELECT id FROM app_workout_sessions WHERE user_id = $1 AND session_snapshot->>'client_ref' = $2 LIMIT 1`,
          [authUser.id, String(client_ref)]
        );
        if (dup.rows.length) {
          await client.query("COMMIT");
          return res.json({ ok: true, duplicate: true, sessionId: dup.rows[0].id });
        }
      }

      const sessionRes = await client.query(
        `INSERT INTO app_workout_sessions (
          user_id, athlete_program_id, week_number, session_number, session_name,
          scheduled_at, started_at, completed_at, status, notes, duration_seconds, session_snapshot, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW(), 'completed', '', $6, $7, NOW(), NOW())
        RETURNING id`,
        [
          authUser.id,
          athlete_program_id,
          week_number,
          session_number,
          session_name,
          duration_seconds,
          JSON.stringify({ client_ref: client_ref || null, source: 'webview_log' })
        ]
      );
      const sessionId = sessionRes.rows[0].id;
      let setsLogged = 0;

      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        const norm = normalizeExerciseName(ex.name || ex.exercise || 'Esercizio');
        const exRes = await client.query(
          `INSERT INTO app_workout_exercises (
            workout_session_id, exercise_id, canonical_exercise_id, name, name_original,
            muscle_group, order_index, prescribed_sets, prescribed_reps, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '', NOW()) RETURNING id`,
          [
            sessionId,
            ex.id || `ex_${i + 1}`,
            norm.name_normalized.toLowerCase().replace(/\s+/g, '_'),
            norm.name_normalized,
            ex.name_original || ex.name,
            norm.muscle || ex.muscle_group || 'TOTAL',
            i,
            (ex.sets || []).length || 1,
            '8-10'
          ]
        );
        const exId = exRes.rows[0].id;
        const sets = Array.isArray(ex.sets) ? ex.sets : [];
        for (const st of sets) {
          if (!st.completed) continue;
          await client.query(
            `INSERT INTO app_workout_sets (
              workout_exercise_id, set_number, set_type, target_reps, actual_reps,
              target_load, actual_load, load_unit, target_rir, actual_rir,
              target_rpe, actual_rpe, rest_seconds, completed, created_at, updated_at
            ) VALUES ($1, $2, 'working', $3, $4, $5, $6, 'kg', $7, $8, NULL, $9, 90, true, NOW(), NOW())`,
            [
              exId,
              st.set_number || 1,
              String(st.actual_reps || st.reps || ''),
              parseInt(st.actual_reps || st.reps, 10) || null,
              st.actual_load != null ? String(st.actual_load) : '',
              st.actual_load != null ? Number(st.actual_load) : null,
              st.actual_rir != null ? Number(st.actual_rir) : null,
              st.actual_rir != null ? Number(st.actual_rir) : null,
              st.actual_rpe != null ? Number(st.actual_rpe) : null
            ]
          );
          setsLogged++;
        }
      }

      await client.query("COMMIT");
      return res.status(201).json({ ok: true, sessionId, setsLogged, message: 'Sessione sincronizzata nel cloud.' });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("LOG_COMPLETED_ERROR", error);
    return res.status(500).json({ error: "Errore sync sessione: " + error.message });
  }
});

// 13. Batch Sync for Offline Logs
app.post("/api/me/workouts/sync", async (req, res) => {
  try {
    const authUser = await accountFromBearer(req.headers.authorization);
    if (!authUser) return res.status(401).json({ error: "Autenticazione richiesta." });

    const { syncEvents = [] } = req.body || {};
    let syncedCount = 0;

    for (const ev of syncEvents) {
      if (ev.type === "set_update" && ev.sessionId && ev.setId) {
        await pool.query(
          `UPDATE app_workout_sets st
           SET actual_load = COALESCE($1, st.actual_load),
               actual_reps = COALESCE($2, st.actual_reps),
               actual_rir = COALESCE($3, st.actual_rir),
               actual_rpe = COALESCE($4, st.actual_rpe),
               completed = COALESCE($5, st.completed),
               updated_at = NOW()
           FROM app_workout_exercises we, app_workout_sessions ws
           WHERE st.workout_exercise_id = we.id AND we.workout_session_id = ws.id
             AND st.id = $6 AND ws.id = $7 AND ws.user_id = $8`,
          [
            ev.actual_load !== undefined ? Number(ev.actual_load) : null,
            ev.actual_reps !== undefined ? parseInt(ev.actual_reps, 10) : null,
            ev.actual_rir !== undefined ? Number(ev.actual_rir) : null,
            ev.actual_rpe !== undefined ? Number(ev.actual_rpe) : null,
            ev.completed !== undefined ? Boolean(ev.completed) : null,
            ev.setId,
            ev.sessionId,
            authUser.id
          ]
        );
        syncedCount++;
      }
    }

    return res.json({ ok: true, syncedCount, message: `Sincronizzati ${syncedCount} eventi offline con successo.` });
  } catch (error) {
    console.error("BATCH_SYNC_ERROR", error);
    return res.status(500).json({ error: "Errore durante la sincronizzazione batch offline." });
  }
});


const WEB_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "web");
if (fsSync.existsSync(WEB_ROOT)) {
  app.use(
    express.static(WEB_ROOT, {
      fallthrough: true,
      index: false,
      maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
      setHeaders(res, filePath) {
        if (/sw\.js$|manifest\.webmanifest$/i.test(filePath)) {
          res.setHeader("Cache-Control", "no-cache");
        }
      }
    })
  );
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api") || req.path === "/health") return next();
    // Never SPA-fallback binary/json/assets: return real 404 if missing.
    if (/\.[a-z0-9]+$/i.test(req.path) && !/\.html?$/i.test(req.path)) {
      return res.status(404).type("text/plain").send("Not found");
    }
    const indexPath = path.join(WEB_ROOT, "index.html");
    if (!fsSync.existsSync(indexPath)) return next();
    res.sendFile(indexPath);
  });
}

app.listen(port, () => {
  const aiConfigured = Boolean(process.env.GEMINI_API_KEY);
  console.log(`Coach API server listening at http://localhost:${port}`);
  console.log(`  MODEL=${MODEL}`);
  console.log(`  GEMINI_API_KEY configured: ${aiConfigured}`);
  console.log(`  DATABASE_URL configured: ${Boolean(process.env.DATABASE_URL)}`);
  console.log(`  GOOGLE_CLIENT_ID configured: ${Boolean(process.env.GOOGLE_CLIENT_ID)}`);
  console.log(`  SPA web root: ${fsSync.existsSync(WEB_ROOT) ? WEB_ROOT : "missing"}`);
  if (!aiConfigured) {
    console.warn("  WARNING: GEMINI_API_KEY missing — /api/chat will return 500 until configured.");
  }
});
