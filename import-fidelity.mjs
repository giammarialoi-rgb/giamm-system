/**
 * Import fidelity helpers — never silently shrink OR inflate NxM set counts.
 * Critical: "4x10" must stay 4 sets / 10 reps — never treat reps (10) as set count.
 */

export const TECHNIQUE_PATTERNS = Object.freeze([
  { id: 'drop_set', re: /\b(?:drop\s*-?\s*sets?|dropset|stripping|strip\s*set)\b/i, setType: 'dropset' },
  { id: 'rest_pause', re: /\b(?:rest[\s-]*pause|rp\s*set)\b/i, setType: 'rest_pause' },
  { id: 'myo_reps', re: /\b(?:myo[\s-]*reps?)\b/i, setType: 'myo_reps' },
  { id: 'cluster', re: /\b(?:cluster\s*sets?)\b/i, setType: 'cluster' },
  { id: 'pause_reps', re: /\b(?:pause\s*reps?|paused?\s*reps?)\b/i, setType: 'pause_reps' },
  { id: 'forced_reps', re: /\b(?:forced\s*reps?|assisted\s*reps?)\b/i, setType: 'forced_reps' },
  { id: 'lengthened_partials', re: /\b(?:lengthened\s*partials?|lunghi\s*parziali)\b/i, setType: 'lengthened_partials' }
]);

const MAX_PLAUSIBLE_SETS = 15;

function clampSetCount(n) {
  const v = parseInt(n, 10);
  if (!Number.isFinite(v) || v < 1 || v > MAX_PLAUSIBLE_SETS) return null;
  return v;
}

/**
 * Extract N from patterns like 4x12, 4×12, 4*12, 4 serie x 12, 4 serie da 12.
 * STRICT: separator x/×/* OR keyword serie/set required — never match two bare numbers (that turned 4x10 → 10).
 */
export function parseDeclaredSetCount(text) {
  const str = String(text || '');
  if (!str.trim()) return null;

  // Prefer first explicit NxM in the string (leftmost)
  const serieIt = str.match(/(\d{1,2})\s*(?:serie|sets?)\s*(?:[xX*\u00d7]|da|di|:)?\s*(?:\d+(?:[\-\u2013\/]\d+)?|AMRAP|MAX)\b/i);
  if (serieIt) return clampSetCount(serieIt[1]);

  const nxm = str.match(/(\d{1,2})\s*[xX*\u00d7]\s*(?:\d+(?:[\-\u2013\/]\d+)?|AMRAP|MAX|EXHAUST|\d+\s*PASSI|21['\u2019]?S)\b/i);
  if (nxm) return clampSetCount(nxm[1]);

  return null;
}

/** Parse reps side of first NxM (e.g. 4x10 → "10"). */
export function parseDeclaredReps(text) {
  const str = String(text || '');
  const serieIt = str.match(/\d{1,2}\s*(?:serie|sets?)\s*(?:[xX*\u00d7]|da|di|:)?\s*(\d+(?:[\-\u2013\/]\d+)?|AMRAP|MAX)\b/i);
  if (serieIt) return serieIt[1];
  const nxm = str.match(/\d{1,2}\s*[xX*\u00d7]\s*(\d+(?:[\-\u2013\/]\d+)?|AMRAP|MAX|EXHAUST|\d+\s*PASSI|21['\u2019]?S)\b/i);
  if (nxm) return nxm[1];
  return null;
}

export function detectTechniquesFromText(...parts) {
  const blob = parts.filter(Boolean).map(String).join(' ');
  const found = [];
  for (const p of TECHNIQUE_PATTERNS) {
    if (p.re.test(blob)) found.push({ id: p.id, setType: p.setType });
  }
  return found;
}

function readDeclaredInteger(ex) {
  if (typeof ex.sets === 'number' && Number.isFinite(ex.sets)) return clampSetCount(ex.sets);
  if (ex.sets_count != null && Number.isFinite(Number(ex.sets_count))) return clampSetCount(ex.sets_count);
  if (typeof ex.sets === 'string' && /^\s*\d{1,2}\s*$/.test(ex.sets)) return clampSetCount(ex.sets);
  // "4x10" stored in sets string
  if (typeof ex.sets === 'string') return parseDeclaredSetCount(ex.sets);
  return null;
}

/**
 * Resolve how many working sets an exercise must have.
 * Literal NxM in name/notes ALWAYS wins. Never Math.max with reps-looking integers.
 */
export function resolveTargetSetCount(exercise) {
  const ex = exercise || {};
  // Do NOT include bare reps fields in pattern blob — "10" next to other digits created false NxM / max(4,10)
  const patternBlob = [ex.name, ex.exercise, ex.notes, ex.progression_rule, ex.intensity_notes]
    .filter(Boolean)
    .join(' ');
  const techBlob = [patternBlob, ex.reps, ex.reps_target, ex.repsTarget, ex.reps_raw]
    .filter(Boolean)
    .join(' ');

  const fromText = parseDeclaredSetCount(patternBlob);
  let declared = readDeclaredInteger(ex);

  const dataLen = Array.isArray(ex.sets_data) && ex.sets_data.length
    ? ex.sets_data.length
    : (Array.isArray(ex.sets) && ex.sets.length && typeof ex.sets[0] === 'object' ? ex.sets.length : 0);
  const dataLenSafe = dataLen > 0 && dataLen <= MAX_PLAUSIBLE_SETS ? dataLen : 0;

  // If declared integer equals the reps number from NxM (e.g. sets:10 from "4x10"), discard it
  const repsFromPattern = parseDeclaredReps(patternBlob);
  if (declared != null && fromText != null && repsFromPattern) {
    const repsNum = parseInt(String(repsFromPattern).replace(/[^\d].*/, ''), 10);
    if (declared === repsNum && fromText !== declared) {
      declared = null;
    }
  }

  // Priority: literal NxM > integer sets > array length. NEVER Math.max(declared, fromText).
  let target = null;
  let source = null;
  if (fromText != null) {
    target = fromText;
    source = 'nxm_text';
  } else if (declared != null) {
    target = declared;
    source = 'declared_int';
  } else if (dataLenSafe > 0) {
    target = dataLenSafe;
    source = 'sets_data_length';
  }

  return {
    target,
    declared,
    fromText,
    dataLen,
    source,
    techniques: detectTechniquesFromText(techBlob),
    mismatched: (fromText != null && dataLenSafe > 0 && fromText !== dataLenSafe)
      || (fromText == null && declared != null && dataLenSafe > 0 && declared !== dataLenSafe)
  };
}

/** Expand or truncate set rows to target count; attach technique on last set for dropset. */
export function reconcileSetRows(exercise, mapRow) {
  const info = resolveTargetSetCount(exercise);
  const ex = exercise || {};
  const rawRows = Array.isArray(ex.sets_data) && ex.sets_data.length
    ? ex.sets_data
    : (Array.isArray(ex.sets) && ex.sets.length && typeof ex.sets[0] === 'object' ? ex.sets : []);
  const target = info.target || Math.max(Math.min(rawRows.length, MAX_PLAUSIBLE_SETS), 1);
  const template = rawRows[0] || {};
  const repsHint = parseDeclaredReps([ex.name, ex.exercise, ex.notes].filter(Boolean).join(' '))
    || ex.reps || ex.reps_target || ex.repsTarget || null;
  const out = [];
  for (let i = 0; i < target; i++) {
    const src = rawRows[i] || { ...template };
    if (repsHint && (src.reps == null || src.reps === '') && (src.target_reps == null || src.target_reps === '')) {
      src.reps = repsHint;
      src.target_reps = repsHint;
    }
    const row = typeof mapRow === 'function' ? mapRow(src, i, target, info) : { ...src };
    out.push(row);
  }
  const tech = info.techniques[0];
  if (tech && out.length) {
    const last = out[out.length - 1];
    last.set_type = last.set_type && last.set_type !== 'working' ? last.set_type : tech.setType;
    last.technique = last.technique || tech.id;
  }
  return { sets: out, info, techniques: info.techniques };
}

export default {
  TECHNIQUE_PATTERNS,
  parseDeclaredSetCount,
  parseDeclaredReps,
  detectTechniquesFromText,
  resolveTargetSetCount,
  reconcileSetRows
};
