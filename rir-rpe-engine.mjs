/**
 * GIAMMARIA SYSTEM - RIR / RPE ENGINE DEFINITIVO (Task 11)
 * Centralized logic for RIR, RPE, %1RM and Target vs Actual calculation.
 */

// 1. Basic Conversions
export function rirToRpe(rir) {
  if (rir === null || rir === undefined || isNaN(Number(rir))) return null;
  const num = Number(rir);
  if (num < 0 || num > 10) return null;
  const rpe = 10 - num;
  return Math.round(rpe * 10) / 10;
}

export function rpeToRir(rpe) {
  if (rpe === null || rpe === undefined || isNaN(Number(rpe))) return null;
  const num = Number(rpe);
  if (num < 1 || num > 10) return null;
  const rir = 10 - num;
  return Math.round(rir * 10) / 10;
}

// 2. Validators
export function validateRir(rir) {
  if (rir === null || rir === undefined || rir === "") {
    return { valid: true, value: null, error: null };
  }
  const num = Number(rir);
  if (isNaN(num)) {
    return { valid: false, value: null, error: "RIR deve essere un valore numerico compreso tra 0 e 10." };
  }
  if (num < 0 || num > 10) {
    return { valid: false, value: null, error: "RIR deve essere compreso nell'intervallo [0, 10]." };
  }
  return { valid: true, value: Math.round(num * 10) / 10, error: null };
}

export function validateRpe(rpe) {
  if (rpe === null || rpe === undefined || rpe === "") {
    return { valid: true, value: null, error: null };
  }
  const num = Number(rpe);
  if (isNaN(num)) {
    return { valid: false, value: null, error: "RPE deve essere un valore numerico compreso tra 1 e 10." };
  }
  if (num < 1 || num > 10) {
    return { valid: false, value: null, error: "RPE deve essere compreso nell'intervallo [1, 10]." };
  }
  return { valid: true, value: Math.round(num * 10) / 10, error: null };
}

// 3. Normalizers
export function normalizeRir(value) {
  const res = validateRir(value);
  return res.valid ? res.value : null;
}

export function normalizeRpe(value) {
  const res = validateRpe(value);
  return res.valid ? res.value : null;
}

// 4. Intensity Label Formatting
export function getIntensityLabel({ rir, rpe, percentage_1rm, preference = "RIR" }) {
  if (percentage_1rm !== null && percentage_1rm !== undefined && !isNaN(Number(percentage_1rm))) {
    return `@${percentage_1rm}% 1RM`;
  }

  const p = String(preference).toUpperCase();
  if (p === "RPE") {
    if (rpe !== null && rpe !== undefined) {
      const derivedRir = rpeToRir(rpe);
      return derivedRir !== null ? `RPE ${rpe} (RIR ${derivedRir})` : `RPE ${rpe}`;
    }
    if (rir !== null && rir !== undefined) {
      const derivedRpe = rirToRpe(rir);
      return derivedRpe !== null ? `RPE ${derivedRpe} (RIR ${rir})` : `RIR ${rir}`;
    }
  } else {
    // Default RIR
    if (rir !== null && rir !== undefined) {
      const derivedRpe = rirToRpe(rir);
      return derivedRpe !== null ? `RIR ${rir} (RPE ${derivedRpe})` : `RIR ${rir}`;
    }
    if (rpe !== null && rpe !== undefined) {
      const derivedRir = rpeToRir(rpe);
      return derivedRir !== null ? `RIR ${derivedRir} (RPE ${rpe})` : `RPE ${rpe}`;
    }
  }

  return "RIR 2 (Standard)";
}

// 5. Target vs Actual Deviation Calculation
export function calculateDeviation(target, actual) {
  if (target === null || target === undefined || actual === null || actual === undefined) return null;
  const t = Number(target);
  const a = Number(actual);
  if (isNaN(t) || isNaN(a)) return null;
  return Math.round((a - t) * 10) / 10;
}

export function compareTargetVsActual({
  targetRir,
  actualRir,
  targetRpe,
  actualRpe,
  targetLoad,
  actualLoad,
  targetReps,
  actualReps
}) {
  const normTargetRir = normalizeRir(targetRir);
  const normActualRir = normalizeRir(actualRir);
  const normTargetRpe = normalizeRpe(targetRpe) || (normTargetRir !== null ? rirToRpe(normTargetRir) : null);
  const normActualRpe = normalizeRpe(actualRpe) || (normActualRir !== null ? rirToRpe(normActualRir) : null);

  const rirDev = calculateDeviation(normTargetRir, normActualRir);
  const rpeDev = calculateDeviation(normTargetRpe, normActualRpe);
  const loadDev = calculateDeviation(targetLoad, actualLoad);
  const repsDev = calculateDeviation(targetReps, actualReps);

  let intensityStatus = "on_target";
  let intensityBadge = "✓ Target centrato";

  // In RIR: lower RIR than target means closer to failure (MORE intense)
  if (rirDev !== null) {
    if (rirDev < 0) {
      intensityStatus = "more_intense";
      intensityBadge = `↑ Più intenso (RIR ${normActualRir} vs ${normTargetRir})`;
    } else if (rirDev > 0) {
      intensityStatus = "less_intense";
      intensityBadge = `↓ Meno intenso (RIR ${normActualRir} vs ${normTargetRir})`;
    }
  } else if (rpeDev !== null) {
    // In RPE: higher RPE than target means MORE intense
    if (rpeDev > 0) {
      intensityStatus = "more_intense";
      intensityBadge = `↑ Più intenso (RPE ${normActualRpe} vs ${normTargetRpe})`;
    } else if (rpeDev < 0) {
      intensityStatus = "less_intense";
      intensityBadge = `↓ Meno intenso (RPE ${normActualRpe} vs ${normTargetRpe})`;
    }
  }

  return {
    target: {
      rir: normTargetRir,
      rpe: normTargetRpe,
      load: targetLoad,
      reps: targetReps
    },
    actual: {
      rir: normActualRir,
      rpe: normActualRpe,
      load: actualLoad,
      reps: actualReps
    },
    deviations: {
      rir: rirDev,
      rpe: rpeDev,
      load: loadDev,
      reps: repsDev
    },
    status: intensityStatus,
    badge: intensityBadge
  };
}
