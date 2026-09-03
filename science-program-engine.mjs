/**
 * Evidence-informed catalog helpers.
 * Landmarks: Schoenfeld volume ≥10 set/muscolo/sett (2016/2017);
 * frequenza volume-equated (Schoenfeld 2019 JSS); ACSM 2026 overview
 * (progressive overload, RIR 2–3, failure non obbligatorio).
 */

export const SPLIT_IDS = ['fullbody', 'monofrequency', 'upper_lower'];

export const SPLIT_LABELS = {
  fullbody: 'Full body',
  full_body: 'Full body',
  monofrequency: 'Monofrequenza',
  upper_lower: 'Upper/Lower',
  push_pull: 'Push/Pull'
};

export const GOAL_LABELS = {
  ipertrofia: 'Ipertrofia',
  forza: 'Forza',
  powerbuilding: 'Powerbuilding',
  recomp: 'Ricomposizione',
  cut: 'Dimagrimento',
  dimagrimento: 'Dimagrimento',
  glutei: 'Glutei',
  glutei_lower: 'Glutei/Lower',
  petto: 'Petto',
  petto_panca: 'Petto/Panca',
  dorso: 'Dorso',
  spalle: 'Spalle',
  braccia: 'Braccia',
  gambe: 'Gambe',
  mobility: 'Mobilità'
};

export const PROGRESSION_LABELS = {
  linear: 'Lineare (carico/RIR)',
  double: 'Doppia progressione',
  volume_wave: 'Onda di volume',
  dup: 'DUP intra-settimana',
  block: 'Blocchi ipertrofia→forza'
};

const IT_DAYS = {
  due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6,
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6
};

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function bumpReps(reps, delta) {
  const s = String(reps || '8-10');
  if (!delta) return s;
  const m = s.match(/^(\d+)(?:\s*[-–]\s*(\d+))?/);
  if (!m) return s;
  const lo = parseInt(m[1], 10) + delta;
  const hi = m[2] ? parseInt(m[2], 10) + delta : lo;
  return m[2] ? `${Math.max(3, lo)}-${Math.max(4, hi)}` : String(Math.max(3, lo));
}

export function weekProgress(week, duration, model, isDeload) {
  const t = week / Math.max(2, duration);
  if (isDeload) {
    return { phase: 'deload', volumeMul: 0.6, rirDelta: 2, repsDelta: -1, restDelta: 15, tempo: '2011', note: 'Deload: volume −40%, RIR più alto' };
  }
  if (model === 'volume_wave') {
    const cycle = ((week - 1) % 4) + 1;
    return {
      phase: cycle === 3 ? 'picco volume' : 'accumulo',
      volumeMul: 1 + (cycle - 1) * 0.12,
      rirDelta: cycle === 3 ? -1 : 0,
      repsDelta: 0,
      restDelta: 0,
      tempo: cycle >= 3 ? '2010' : '3010',
      note: 'Onda: +set fino a settimana 3, deload 4'
    };
  }
  if (model === 'double') {
    return {
      phase: week % 2 === 0 ? 'carico' : 'reps',
      volumeMul: 1,
      rirDelta: t > 0.7 ? -1 : 0,
      repsDelta: week % 2 === 1 ? 1 : 0,
      restDelta: 0,
      tempo: t > 0.6 ? '2010' : '3010',
      note: 'Doppia progressione: reps poi carico (RIR costante finché range completo)'
    };
  }
  if (model === 'dup') {
    return {
      phase: 'DUP',
      volumeMul: 1,
      rirDelta: 0,
      repsDelta: 0,
      restDelta: 0,
      tempo: '2010',
      note: 'DUP: heavy / hypertrophy / pump ruotati nelle sedute'
    };
  }
  if (model === 'block') {
    const first = duration <= 6 ? Math.ceil(duration * 0.6) : Math.ceil(duration / 2);
    const inStrength = week > first;
    return {
      phase: inStrength ? 'intensificazione' : 'ipertrofia',
      volumeMul: inStrength ? 0.85 : 1.05,
      rirDelta: inStrength ? -1 : 0,
      repsDelta: inStrength ? -2 : 0,
      restDelta: inStrength ? 30 : 0,
      tempo: inStrength ? '10X0' : '3010',
      note: inStrength ? 'Blocco forza: carichi più alti, volume leggermente giù' : 'Blocco ipertrofia: volume e TUT'
    };
  }
  // linear
  return {
    phase: t < 0.35 ? 'base' : (t < 0.75 ? 'sforzo' : 'picco'),
    volumeMul: 1,
    rirDelta: t > 0.5 ? -1 : 0,
    repsDelta: 0,
    restDelta: t > 0.6 ? 15 : 0,
    tempo: t < 0.4 ? '3010' : (t < 0.75 ? '2010' : '10X0'),
    note: 'Lineare: stesso volume, RIR più basso e concentriche più rapide nel tempo'
  };
}

function applyDupSession(ex, sessionIndex) {
  const lane = sessionIndex % 3;
  if (lane === 0) return { ...ex, reps_target: '4-6', rir: Math.min(ex.rir || 2, 1), rest_sec: Math.max(ex.rest_sec || 90, 150), tempo: '10X0', sets_count: Math.max(3, ex.sets_count || 3) };
  if (lane === 1) return { ...ex, reps_target: '8-12', rir: 2, rest_sec: 90, tempo: '2010' };
  return { ...ex, reps_target: '12-15', rir: 3, rest_sec: 60, tempo: '3010', sets_count: Math.max(2, (ex.sets_count || 3) - 1) };
}

export function expandScienceProgramWeeks(entry) {
  const duration = Number(entry.duration_weeks) || ((entry.weeks && entry.weeks.length) || 8);
  const stored = Array.isArray(entry.weeks) ? entry.weeks : [];
  if (stored.length >= duration && duration > 1) return stored;
  const template = stored[0] || { sessions: [] };
  const model = (entry.progression && entry.progression.model) || 'linear';
  const deloadEvery = (entry.progression && entry.progression.deload_every) || 4;
  const weeks = [];
  for (let w = 1; w <= duration; w++) {
    const isDeload = deloadEvery > 0 && w % deloadEvery === 0 && w !== 1;
    const t = weekProgress(w, duration, model, isDeload);
    weeks.push({
      week_number: w,
      weekNumber: w,
      label: isDeload ? `Settimana ${w} · Deload` : `Settimana ${w} · ${t.phase}`,
      phase: isDeload ? 'deload' : t.phase,
      sessions: (template.sessions || []).map((s, si) => {
        let exercises = (s.exercises || []).map((e) => {
          let sets = Math.max(1, Math.round((e.sets_count || 3) * t.volumeMul));
          if (isDeload) sets = Math.max(1, Math.round((e.sets_count || 3) * 0.6));
          return {
            name: e.name,
            sets_count: sets,
            reps_target: bumpReps(e.reps_target, t.repsDelta),
            rir: clamp((e.rir != null ? e.rir : 2) + t.rirDelta, 0, 4),
            rest_sec: (e.rest_sec || 90) + t.restDelta,
            tempo: t.tempo || e.tempo || '2010',
            notes: t.note
          };
        });
        if (model === 'dup' && !isDeload) {
          exercises = exercises.map((e) => applyDupSession(e, si));
        }
        return {
          session_number: si + 1,
          name: s.name,
          exercises
        };
      })
    });
  }
  return weeks;
}

export function parseCatalogQuery(raw) {
  const q = String(raw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const out = {
    days: null,
    split: null,
    goal: null,
    equipment: null,
    experience: null,
    duration: null,
    progression: null,
    audience: null,
    tokens: []
  };
  if (!q) return out;
  const dayHit = q.match(/\b(due|tre|quattro|cinque|sei|[2-6])\s*(gg|giorni|giorno|days?|d\/sett)?\b/);
  if (dayHit) out.days = IT_DAYS[dayHit[1]] || parseInt(dayHit[1], 10);
  if (/full\s*body|tutto il corpo|\bfb\b|fullbody/.test(q)) out.split = 'fullbody';
  else if (/mono\s*freq|monofrequenza|distrettuale|\bbro\b|\bppl\b|push\s*pull\s*legs/.test(q)) out.split = 'monofrequency';
  else if (/upper\s*\/?\s*lower|upper.lower|\bul\b|alto\s*basso/.test(q)) out.split = 'upper_lower';
  if (/ipertrof|massa|volume|hypertroph/.test(q)) out.goal = 'ipertrofia';
  else if (/\bforza\b|strength|1rm/.test(q)) out.goal = 'forza';
  else if (/powerbuild/.test(q)) out.goal = 'powerbuilding';
  else if (/recomp|ricompos/.test(q)) out.goal = 'recomp';
  else if (/cut|dimagr|deficit|defin/.test(q)) out.goal = 'cut';
  else if (/glute/.test(q)) out.goal = 'glutei';
  else if (/petto|panca|chest/.test(q)) out.goal = 'petto';
  else if (/dorso|schiena|back/.test(q)) out.goal = 'dorso';
  else if (/spall/.test(q)) out.goal = 'spalle';
  else if (/braccia|bicep|tricep/.test(q)) out.goal = 'braccia';
  else if (/gambe|quad|femor/.test(q)) out.goal = 'gambe';
  if (/palestra|gym|bilanciere/.test(q)) out.equipment = 'palestra';
  else if (/kettlebell|\bkb\b/.test(q)) out.equipment = 'kettlebell';
  else if (/corpo\s*libero|calisthen|bodyweight/.test(q)) out.equipment = 'bodyweight';
  else if (/minimal|manubri|casa/.test(q)) out.equipment = /casa/.test(q) ? 'casa' : 'minimal';
  if (/principiant|beginner/.test(q)) out.experience = 'principiante';
  else if (/avanzat|advanced/.test(q)) out.experience = 'avanzato';
  else if (/intermedio|intermediate/.test(q)) out.experience = 'intermedio';
  const dur = q.match(/\b(4|6|8|10|12|16)\s*(sett|settimane|weeks?)\b/);
  if (dur) out.duration = parseInt(dur[1], 10);
  if (/doppia|double\s*prog/.test(q)) out.progression = 'double';
  else if (/onda|volume\s*wave|wave/.test(q)) out.progression = 'volume_wave';
  else if (/\bdup\b/.test(q)) out.progression = 'dup';
  else if (/blocco|block/.test(q)) out.progression = 'block';
  else if (/lineare|linear/.test(q)) out.progression = 'linear';
  if (/donn|femminil|female|glute\s*focus|per lei/.test(q)) out.audience = 'female';
  else if (/\buomo\b|maschil|male\s*upper|per lui/.test(q)) out.audience = 'male';
  else if (/unisex/.test(q)) out.audience = 'unisex';
  out.tokens = q.split(/[\s,.;+/·_-]+/).filter((t) => t.length >= 2);
  return out;
}

function hayOf(p) {
  return [
    p.title, p.purpose, p.search_text, p.split, SPLIT_LABELS[p.split],
    p.equipment, p.experience, p.progression_model, p.sex_focus,
    ...(p.keywords || []), ...(p.goals || []),
    String(p.days_per_week) + 'gg',
    String(p.days_per_week) + ' giorni',
    String(p.duration_weeks) + ' settimane'
  ].filter(Boolean).join(' ').toLowerCase();
}

export function rankCatalogPrograms(list, filters = {}) {
  const parsed = parseCatalogQuery(filters.q || '');
  const days = filters.days || parsed.days;
  const split = filters.split || parsed.split;
  const goal = filters.goal || parsed.goal;
  const equipment = filters.equipment || parsed.equipment;
  const experience = filters.experience || parsed.experience;
  const duration = filters.duration || parsed.duration;
  const progression = filters.progression || parsed.progression;
  const audience = filters.audience || parsed.audience;
  const tokens = parsed.tokens || [];

  const scored = [];
  (list || []).forEach((p) => {
    if (days && Number(p.days_per_week) !== Number(days)) return;
    if (split && p.split !== split && p.split !== (split === 'fullbody' ? 'full_body' : split)) return;
    if (goal) {
      const goals = p.goals || [];
      if (p.purpose !== goal && !goals.includes(goal) && !(goal === 'cut' && (p.purpose === 'dimagrimento' || goals.includes('dimagrimento')))) return;
    }
    if (equipment && p.equipment !== equipment) return;
    if (experience && p.experience !== experience) return;
    if (duration && Number(p.duration_weeks) !== Number(duration)) return;
    if (progression && p.progression_model !== progression) return;
    if (audience) {
      const a = p.audience || (p.sex_focus === 'female_glute' ? 'female' : (p.sex_focus === 'male_upper' ? 'male' : 'unisex'));
      if (a !== audience) return;
    }

    let score = 1;
    const hay = hayOf(p);
    if (days && Number(p.days_per_week) === Number(days)) score += 40;
    if (split && (p.split === split || p.split === 'full_body' && split === 'fullbody')) score += 35;
    if (goal && (p.purpose === goal || (p.goals || []).includes(goal))) score += 25;
    if (equipment && p.equipment === equipment) score += 15;
    if (experience && p.experience === experience) score += 12;
    if (duration && Number(p.duration_weeks) === Number(duration)) score += 10;
    if (progression && p.progression_model === progression) score += 10;
    tokens.forEach((t) => {
      if (t.length < 2) return;
      if ((p.title || '').toLowerCase().includes(t)) score += 8;
      else if (hay.includes(t)) score += 3;
    });
    scored.push({ p, score });
  });
  scored.sort((a, b) => b.score - a.score || String(a.p.title).localeCompare(String(b.p.title), 'it'));
  return scored.map((x) => x.p);
}

export default { expandScienceProgramWeeks, parseCatalogQuery, rankCatalogPrograms, SPLIT_LABELS, GOAL_LABELS, PROGRESSION_LABELS };
