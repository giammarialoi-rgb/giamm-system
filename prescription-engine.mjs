/**
 * Literal prescription engine — infallible NxM reading.
 *
 * Source of truth order (never reverse):
 * 1) Raw scheme token in source line / name / notes ("4x10", "4×10", "4*10", "4 serie x 10")
 * 2) ex.prescription { sets, reps, raw } if locked
 * 3) integer sets / sets_count (only if 1..15 and not equal to reps-looking hallucination)
 * 4) sets_data / sets array length (last resort)
 *
 * Arrays are ALWAYS resized to match the literal set count — never the other way around.
 */

export const MAX_SETS = 15;

const NXM_RE = /(\d{1,2})\s*[xX*\u00d7]\s*(\d+(?:[\-\u2013\/]\d+)+|\d+|AMRAP|MAX|EXHAUST|[^\s,;+]+)/g;
const SERIE_RE = /(\d{1,2})\s*(?:serie|sets?)\s*(?:[xX*\u00d7]|da|di|:)?\s*(\d+(?:[\-\u2013\/]\d+)?|AMRAP|MAX)/gi;
const DROP_RE = /\b(?:drop\s*-?\s*sets?|dropset|stripping|strip\s*set)\b/i;
const SPACE_LADDER_RE = /(?:^|[^\d])(\d{1,2}(?:[ ]+\d{1,2}){2,6})(?=[^\d]|$)/;

function clampSets(n) {
  const v = parseInt(n, 10);
  if (!Number.isFinite(v) || v < 1 || v > MAX_SETS) return null;
  return v;
}

/** 2x15 + 1x10 → 3 sets with reps [15,15,10] */
export function parseCompoundSchemes(text) {
  const str = String(text || '');
  const re = /(\d{1,2})\s*[xX*\u00d7]\s*(\d+(?:[\-\u2013\/]\d+)?|AMRAP|MAX|EXHAUST)/gi;
  const matches = [...str.matchAll(re)];
  if (matches.length < 2) return null;
  // Require explicit compound separators between schemes (not two unrelated NxM on one line)
  let hasSep = false;
  for (let i = 1; i < matches.length; i++) {
    const prevEnd = matches[i - 1].index + matches[i - 1][0].length;
    const between = str.slice(prevEnd, matches[i].index);
    if (/^\s*(?:\+|\/|,|;|e|poi|then|and)\s*$/i.test(between) || /^\s*[+\/|,;]\s*$/.test(between)) {
      hasSep = true;
      break;
    }
  }
  if (!hasSep) return null;
  const pattern = [];
  matches.forEach((m) => {
    const n = clampSets(m[1]);
    const reps = String(m[2]).trim();
    if (!n) return;
    for (let i = 0; i < n; i++) pattern.push(reps);
  });
  if (pattern.length < 2 || pattern.length > MAX_SETS) return null;
  return {
    sets: pattern.length,
    reps: pattern.join('/'),
    reps_pattern: pattern,
    raw: matches.map((m) => m[1] + 'x' + m[2]).join('+'),
    technique: DROP_RE.test(str) ? 'drop_set' : null,
    source: 'compound_nxm'
  };
}

/**
 * Weekly progression ladder: 3x10-4x10-5x10-3x12-... (one NxM per week).
 * Must run BEFORE single NxM parse (otherwise 3x10-4 becomes reps "10-4").
 */
export function parseWeeklySchemeLadder(text) {
  const str = String(text || '');
  // Require at least 3 NxM tokens joined only by hyphens (no + compound)
  const re = /(\d{1,2})\s*[xX*\u00d7]\s*(\d{1,3}|AMRAP|MAX)/g;
  const matches = [...str.matchAll(re)];
  if (matches.length < 3) return null;
  for (let i = 1; i < matches.length; i++) {
    const prevEnd = matches[i - 1].index + matches[i - 1][0].length;
    const between = str.slice(prevEnd, matches[i].index);
    // Weekly ladders use - or – or / between schemes; compounds use +
    if (!/^\s*[\-\u2013\/]\s*$/.test(between)) return null;
  }
  const weeks = matches.map((m) => ({
    sets: clampSets(m[1]) || parseInt(m[1], 10),
    reps: String(m[2]).trim(),
    raw: m[1] + 'x' + m[2]
  })).filter((w) => w.sets >= 1 && w.sets <= MAX_SETS);
  if (weeks.length < 3) return null;
  return {
    week_count: weeks.length,
    weeks,
    sets: weeks[0].sets,
    reps: weeks[0].reps,
    raw: weeks.map((w) => w.raw).join('-'),
    technique: null,
    source: 'weekly_scheme_ladder',
    weekly_schemes: weeks
  };
}

/** Bare descending/ascending ladder: "12 10 8 6" or "8 10 12" */
export function parseSpaceLadder(text) {
  // Strip exercise index markers (#12) and rest tokens so TSV "12 10 8 6\t90s" stays clean
  const str = String(text || '')
    .replace(/#\s*\d+\b/g, ' ')
    .replace(/\bRIR\s*[:=]?\s*\d+(?:\.\d+)?/gi, ' ')
    .replace(/\bRPE\s*[:=]?\s*\d+(?:\.\d+)?/gi, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:s|sec|secondi|min|minuti|\"|')\b/gi, ' ');
  // Prefer hyphen ladders already handled elsewhere; here only spaced numbers
  if (/\d+\s*[xX*\u00d7]/.test(str)) return null;
  const m = str.match(SPACE_LADDER_RE);
  if (!m) return null;
  const parts = m[1].trim().split(/[ ]+/).map((x) => parseInt(x, 10));
  if (parts.length < 3 || parts.length > MAX_SETS) return null;
  // Reps band only (avoid absorbing rest/kg columns)
  if (parts.some((n) => !Number.isFinite(n) || n < 3 || n > 30)) return null;
  // Avoid matching dates / random numbers: require monotonic-ish ladder (all up or all down) OR all in reps band
  let up = 0, down = 0;
  for (let i = 1; i < parts.length; i++) {
    if (parts[i] > parts[i - 1]) up++;
    else if (parts[i] < parts[i - 1]) down++;
  }
  if (up > 0 && down > 0 && Math.min(up, down) > 1) return null;
  return {
    sets: parts.length,
    reps: parts.join('-'),
    reps_pattern: parts.map(String),
    raw: parts.join(' '),
    technique: null,
    source: 'space_ladder'
  };
}

/** Parse first literal scheme from text → { sets, reps, raw, technique } */
export function parseLiteralScheme(text) {
  const str = String(text || '')
    .replace(/#\s*\d+\b/g, ' ');
  if (!str.trim()) return null;

  // Weekly NxM ladder first (3x10-4x10-5x10-…) — before greedy single NxM
  const weekly = parseWeeklySchemeLadder(str);
  if (weekly) return weekly;

  const compound = parseCompoundSchemes(str);
  if (compound) return compound;

  SERIE_RE.lastIndex = 0;
  const serie = SERIE_RE.exec(str);
  if (serie) {
    const sets = clampSets(serie[1]);
    if (sets) {
      return {
        sets,
        reps: String(serie[2]).trim(),
        raw: serie[0].replace(/\s+/g, ''),
        technique: DROP_RE.test(str) ? 'drop_set' : null,
        source: 'serie_phrase'
      };
    }
  }

  // Single NxM without absorbing the next week scheme via hyphen
  const singleRe = /(\d{1,2})\s*[xX*\u00d7]\s*(\d{1,3}(?:[\-\u2013\/]\d{1,3})?|AMRAP|MAX|EXHAUST)/i;
  const nxm = singleRe.exec(str);
  if (nxm) {
    const sets = clampSets(nxm[1]);
    let reps = String(nxm[2]).trim();
    const after = str.slice(nxm.index + nxm[0].length);
    // "3x10-4x10" misread as reps 10-4 → keep first rep number only
    if (/^\s*[\-\u2013]\s*\d{1,2}\s*[xX*\u00d7]/.test(after) || (/\d+[\-\u2013]\d+/.test(reps) && /\d+\s*[xX*\u00d7]\s*\d+[\-\u2013]\d+\s*[xX*\u00d7]/.test(str))) {
      reps = reps.split(/[\-\u2013\/]/)[0];
    }
    if (sets) {
      return {
        sets,
        reps,
        raw: nxm[1] + 'x' + reps,
        technique: DROP_RE.test(str) ? 'drop_set' : null,
        source: 'nxm'
      };
    }
  }

  const ladder = parseSpaceLadder(str);
  if (ladder) return ladder;
  return null;
}

/** Extract all prescription lines from a raw document / note / OCR dump. */
export function extractPrescriptionsFromText(rawText) {
  const lines = String(rawText || '').split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const trimmed = String(line || '').trim();
    if (!trimmed || trimmed.length < 3) continue;
    if (/^(giorno|day|settimana|week|sessione|session|bonus)\b/i.test(trimmed) && !NXM_RE.test(trimmed) && !SERIE_RE.test(trimmed)) {
      NXM_RE.lastIndex = 0;
      SERIE_RE.lastIndex = 0;
      continue;
    }
    NXM_RE.lastIndex = 0;
    SERIE_RE.lastIndex = 0;
    const scheme = parseLiteralScheme(trimmed);
    if (!scheme) continue;
    const nameHint = trimmed
      .replace(SERIE_RE, ' ')
      .replace(NXM_RE, ' ')
      .replace(DROP_RE, ' ')
      .replace(/[@]?\s*RIR\s*[:=]?\s*\d+(?:\.\d+)?/ig, ' ')
      .replace(/[@]?\s*RPE\s*[:=]?\s*\d+(?:\.\d+)?/ig, ' ')
      .replace(/\d+(?:\.\d+)?\s*(?:kg|lbs?|%|s|sec|min|')\b/ig, ' ')
      .replace(/^[\-\u2013\u2022*#\d\.\)]+\s*/, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (!nameHint || nameHint.length < 2) continue;
    out.push({
      line: trimmed,
      nameHint,
      nameKey: foldName(nameHint),
      ...scheme
    });
  }
  return out;
}

function foldName(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function nameSimilarity(a, b) {
  const ka = foldName(a).split(/\s+/).filter((w) => w.length > 2);
  const kb = foldName(b).split(/\s+/).filter((w) => w.length > 2);
  if (!ka.length || !kb.length) return 0;
  let hit = 0;
  ka.forEach((w) => { if (kb.some((x) => x.includes(w) || w.includes(x))) hit++; });
  return hit / Math.max(ka.length, kb.length);
}

/**
 * Resolve the locked prescription for one exercise.
 */
export function resolvePrescription(ex) {
  const e = ex || {};
  if (e.prescription && e.prescription.locked && e.prescription.sets) {
    return {
      sets: clampSets(e.prescription.sets),
      reps: e.prescription.reps || e.reps || e.reps_target || '8-10',
      raw: e.prescription.raw || null,
      technique: e.prescription.technique || null,
      source: 'locked'
    };
  }

  const blob = [e.name, e.exercise, e.name_original, e.notes, e.progression_rule, e.scheme, e.prescription_raw]
    .filter(Boolean)
    .join(' ');
  const fromText = parseLiteralScheme(blob);
  if (fromText) return { ...fromText, source: fromText.source || 'literal' };

  let declared = null;
  if (typeof e.sets === 'number') declared = clampSets(e.sets);
  else if (e.sets_count != null) declared = clampSets(e.sets_count);
  else if (typeof e.sets === 'string' && /^\s*\d{1,2}\s*$/.test(e.sets)) declared = clampSets(e.sets);

  const repsGuess = e.reps || e.reps_target || e.repsTarget || e.reps_raw;
  const repsNum = repsGuess != null ? parseInt(String(repsGuess).replace(/[^\d].*/, ''), 10) : null;
  // Discard declared if it looks like the model copied reps into sets (4x10 → sets:10)
  if (declared != null && repsNum != null && declared === repsNum && declared >= 6) {
    declared = null;
  }

  const dataLen = Array.isArray(e.sets_data) && e.sets_data.length
    ? e.sets_data.length
    : (Array.isArray(e.sets) && e.sets.length && typeof e.sets[0] === 'object' ? e.sets.length : 0);
  const dataSafe = dataLen >= 1 && dataLen <= MAX_SETS ? dataLen : null;

  if (declared != null) {
    return {
      sets: declared,
      reps: repsGuess != null ? String(repsGuess) : '8-10',
      raw: declared + 'x' + (repsGuess || '?'),
      technique: DROP_RE.test(blob) ? 'drop_set' : null,
      source: 'declared_int'
    };
  }
  if (dataSafe != null) {
    return {
      sets: dataSafe,
      reps: repsGuess != null ? String(repsGuess) : '8-10',
      raw: dataSafe + 'x' + (repsGuess || '?'),
      technique: DROP_RE.test(blob) ? 'drop_set' : null,
      source: 'array_length'
    };
  }
  return null;
}

/** Force exercise sets[] / sets_data / sets_count to match prescription exactly. */
export function enforceExercisePrescription(ex, prescriptionOpt) {
  const e = ex || {};
  const p = prescriptionOpt || resolvePrescription(e);
  if (!p || !p.sets) return e;

  const rawRows = Array.isArray(e.sets_data) && e.sets_data.length
    ? e.sets_data
    : (Array.isArray(e.sets) && e.sets.length && typeof e.sets[0] === 'object' ? e.sets : []);
  const template = rawRows[0] || {};
  const pattern = Array.isArray(p.reps_pattern) && p.reps_pattern.length
    ? p.reps_pattern
    : (Array.isArray(e.reps_pattern) ? e.reps_pattern : null);
  const reps = p.reps || e.reps || e.reps_target || template.reps || template.target_reps || '8-10';
  const rows = [];
  for (let i = 0; i < p.sets; i++) {
    const src = rawRows[i] ? { ...rawRows[i] } : { ...template };
    const isLast = i === p.sets - 1;
    const drop = p.technique === 'drop_set' && isLast;
    const setReps = (pattern && pattern[i] != null) ? String(pattern[i]) : (src.reps ?? src.target_reps ?? reps);
    rows.push({
      ...src,
      set_number: i + 1,
      order: i + 1,
      reps: setReps,
      target_reps: setReps,
      set_type: drop ? 'dropset' : (src.set_type && src.set_type !== 'working' ? src.set_type : 'working'),
      technique: drop ? 'drop_set' : (src.technique || null)
    });
  }

  e.prescription = {
    sets: p.sets,
    reps,
    reps_pattern: pattern || null,
    raw: p.raw || (p.sets + 'x' + reps),
    technique: p.technique || null,
    locked: true,
    source: p.source || 'enforced'
  };
  e.sets_count = p.sets;
  e.sets = rows;
  e.sets_data = rows;
  e.reps = reps;
  e.reps_target = reps;
  e.repsTarget = reps;
  e.reps_pattern = pattern || e.reps_pattern || null;
  e.reps_raw = e.reps_raw || p.raw || (p.sets + 'x' + reps);
  e.scheme = e.prescription.raw;
  if (p.technique === 'drop_set') {
    e.notes = e.notes && /drop/i.test(e.notes) ? e.notes : [e.notes, 'drop set'].filter(Boolean).join(' · ');
    e.intensity_technique = 'drop_set';
  }
  e.setRows = Array.from({ length: Math.max(0, p.sets - 1) }, (_, i) => i + 2);
  return e;
}

/**
 * Match raw-text prescriptions onto program exercises and lock them.
 * Fixes Gemini stripping "4x10" from the exercise name.
 */
export function applyPrescriptionsToProgram(program, rawText) {
  if (!program || !Array.isArray(program.weeks)) return program;
  const prescriptions = extractPrescriptionsFromText(rawText);
  const used = new Set();
  const LOCKED_LITERAL = new Set([
    'excel_pattern', 'excel_expand', 'line_literal', 'nxm', 'compound_nxm',
    'space_ladder', 'serie_phrase', 'literal', 'locked'
  ]);

  for (const week of program.weeks) {
    for (const session of (week.sessions || week.days || [])) {
      for (const ex of (session.exercises || session.rows || [])) {
        // Do not rematch-overwrite prescriptions already locked from a literal scheme cell/line
        if (ex.prescription && ex.prescription.locked && LOCKED_LITERAL.has(String(ex.prescription.source || ''))) {
          continue;
        }
        // Prefer scheme already on the exercise (JSON/import fields) over fuzzy document rematch
        let selfLit = null;
        for (const field of [ex.scheme, ex.reps_raw, ex.notes, ex.prescription_raw]) {
          if (!field) continue;
          selfLit = parseLiteralScheme(String(field));
          if (selfLit && selfLit.sets) break;
        }
        if (selfLit && selfLit.sets) {
          enforceExercisePrescription(ex, {
            sets: selfLit.sets,
            reps: selfLit.reps,
            raw: selfLit.raw,
            technique: selfLit.technique,
            reps_pattern: selfLit.reps_pattern || null,
            source: selfLit.source || 'literal'
          });
          continue;
        }
        // Always try raw-text match first when available — beats weak declared_int (Gemini's "3")
        let p = null;
        let best = null;
        let bestScore = 0;
        prescriptions.forEach((pr, idx) => {
          if (used.has(idx)) return;
          const score = nameSimilarity(ex.name || ex.exercise || '', pr.nameHint);
          if (score > bestScore && score >= 0.34) {
            bestScore = score;
            best = { pr, idx };
          }
        });
        if (best) {
          used.add(best.idx);
          p = {
            sets: best.pr.sets,
            reps: best.pr.reps,
            raw: best.pr.raw,
            technique: best.pr.technique,
            reps_pattern: best.pr.reps_pattern || null,
            source: 'raw_text_match'
          };
          if (!parseLiteralScheme([ex.name, ex.notes, ex.scheme, ex.reps_raw].join(' '))) {
            ex.notes = [ex.notes, best.pr.raw + (best.pr.technique ? ' dropset' : '')].filter(Boolean).join(' · ');
          }
        } else {
          p = resolvePrescription(ex);
        }
        if (p) enforceExercisePrescription(ex, p);
      }
    }
  }
  program._prescriptionsApplied = true;
  program._prescriptionCount = prescriptions.length;
  return program;
}

/** Walk program and enforce every exercise (no raw text needed). */
export function enforceAllPrescriptions(program) {
  if (!program || !Array.isArray(program.weeks)) return program;
  for (const week of program.weeks) {
    for (const session of (week.sessions || week.days || [])) {
      for (const ex of (session.exercises || session.rows || [])) {
        enforceExercisePrescription(ex);
      }
    }
  }
  return program;
}

export default {
  parseLiteralScheme,
  parseCompoundSchemes,
  parseWeeklySchemeLadder,
  parseSpaceLadder,
  extractPrescriptionsFromText,
  resolvePrescription,
  enforceExercisePrescription,
  applyPrescriptionsToProgram,
  enforceAllPrescriptions
};
