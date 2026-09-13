import fs from 'fs';
import path from 'path';

console.log('=== PREPARING TASK 20 HARDENED ARCHITECTURE ===');

const originalHtml = fs.readFileSync('web/index.html', 'utf8');

// 1. Remove duplicate RIR/RPE block (lines around 3025-3238)
let cleanedHtml = originalHtml;

const duplicatePattern = `// ====================================================
// UNIVERSAL IMPORT ENGINE 2.1
// ====================================================
/**
 * GIAMMARIA SYSTEM - UNIVERSAL IMPORT ENGINE 2.1 (Master Task 15)
 * 2D Semantic Extraction Matrix, Domain Extractors for Training, Nutrition,
 * Supplementation, Therapy & Clinical Exams, Canonical Model 2.1.
 */









// ====================================================
// 1. EXERCISE NORMALIZATION DICTIONARY & HELPERS
// ====================================================

// ====================================================
// RIR / RPE ENGINE CORE HELPERS
// ====================================================
/**
 * GIAMMARIA SYSTEM - RIR / RPE ENGINE DEFINITIVO (Task 11)
 * Centralized logic for RIR, RPE, %1RM and Target vs Actual calculation.
 */

// 1. Basic Conversions
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
  if (num < 0 || num > 10) return null;
  const rir = 10 - num;
  return Math.round(rir * 10) / 10;
}

// 2. Range and Format Validators
function validateRir(rir) {
  if (rir === null || rir === undefined) return { valid: false, value: null };
  const num = Number(rir);
  if (isNaN(num) || num < 0 || num > 10) return { valid: false, value: null };
  return { valid: true, value: num };
}

function validateRpe(rpe) {
  if (rpe === null || rpe === undefined) return { valid: false, value: null };
  const num = Number(rpe);
  if (isNaN(num) || num < 0 || num > 10) return { valid: false, value: null };
  return { valid: true, value: num };
}

// 3. Normalization functions
function normalizeRir(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    const clean = value.replace(/,/g, '.').replace(/rir/gi, '').trim();
    if (clean.includes('-')) {
      const parts = clean.split('-').map(p => parseFloat(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return Math.min(parts[0], parts[1]);
      }
    }
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? null : parsed;
  }
  const num = Number(value);
  return isNaN(num) ? null : num;
}

function normalizeRpe(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    const clean = value.replace(/,/g, '.').replace(/rpe|@/gi, '').trim();
    if (clean.includes('-')) {
      const parts = clean.split('-').map(p => parseFloat(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return Math.max(parts[0], parts[1]);
      }
    }
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? null : parsed;
  }
  const num = Number(value);
  return isNaN(num) ? null : num;
}

// 4. Semantic UI Helpers
function getIntensityLabel(targetRir, targetRpe, actualRir = null, actualRpe = null) {
  if (actualRir !== null && actualRir !== undefined) {
    return \`RIR Effettivo: \${actualRir}\`;
  }
  if (actualRpe !== null && actualRpe !== undefined) {
    return \`RPE Effettivo: \${actualRpe}\`;
  }
  if (targetRir !== null && targetRir !== undefined) {
    return \`Target RIR: \${targetRir}\`;
  }
  if (targetRpe !== null && targetRpe !== undefined) {
    return \`Target RPE: \${targetRpe}\`;
  }
  return 'Intensità: Libera';
}

// 5. Delta & Deviation Calculations
function calculateDeviation(target, actual, type = 'RIR') {
  if (target === null || target === undefined || actual === null || actual === undefined) return null;
  const t = Number(target);
  const a = Number(actual);
  if (isNaN(t) || isNaN(a)) return null;
  return Math.round((a - t) * 10) / 10;
}

function compareTargetVsActual(targetRir, actualRir, targetRpe, actualRpe) {
  let rirDelta = calculateDeviation(targetRir, actualRir, 'RIR');
  let rpeDelta = calculateDeviation(targetRpe, actualRpe, 'RPE');
  let status = 'exact';
  let message = 'In target';

  if (rirDelta !== null) {
    if (rirDelta < 0) {
      status = 'overreached';
      message = \`Cedimento più vicino del previsto (Delta: \${rirDelta})\`;
    } else if (rirDelta > 0) {
      status = 'underreached';
      message = \`Buffer superiore al target (Delta: +\${rirDelta})\`;
    }
  } else if (rpeDelta !== null) {
    if (rpeDelta > 0) {
      status = 'overreached';
      message = \`Intensità superiore al target (Delta: +\${rpeDelta})\`;
    } else if (rpeDelta < 0) {
      status = 'underreached';
      message = \`Intensità inferiore al target (Delta: \${rpeDelta})\`;
    }
  }

  return {
    status,
    message,
    rirDelta,
    rpeDelta
  };
}


// ====================================================
// UNIVERSAL IMPORT ENGINE 2.1
// ====================================================
/**
 * GIAMMARIA SYSTEM - UNIVERSAL IMPORT ENGINE 2.1 (Master Task 15)
 * 2D Semantic Extraction Matrix, Domain Extractors for Training, Nutrition,
 * Supplementation, Therapy & Clinical Exams, Canonical Model 2.1.
 */









// ====================================================
// 1. EXERCISE NORMALIZATION DICTIONARY & HELPERS
// ====================================================`;

if (cleanedHtml.includes(duplicatePattern)) {
  cleanedHtml = cleanedHtml.replace(duplicatePattern, `// ====================================================
// 1. EXERCISE NORMALIZATION DICTIONARY & HELPERS
// ====================================================`);
  console.log('✓ Removed duplicate RIR/RPE block successfully.');
} else {
  console.log('Duplicate pattern not matched exactly, checking alternative cleanup.');
}

console.log('New HTML length:', cleanedHtml.length);
fs.writeFileSync('web/index.html', cleanedHtml, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', cleanedHtml, 'utf8');
console.log('✓ Synced web/index.html and app/src/main/assets/index.html.');
