/**
 * Structured program generator + validator (rules-based, not random LLM dumps).
 */

const TEMPLATES = {
  'full-body-3': {
    title: 'Full Body 3 giorni',
    days: 3,
    level: 'beginner',
    goal: 'hypertrophy',
    sessions: [
      ['Squat', 'Panca Piana', 'Rematore', 'Military Press', 'Curl', 'Pushdown'],
      ['Stacco Rumeno', 'Panca Inclinata', 'Lat Pulldown', 'Alzate Laterali', 'Leg Curl', 'Calf Raise'],
      ['Front Squat', 'Dip', 'Trazioni', 'Face Pull', 'Hip Thrust', 'Plank']
    ]
  },
  'upper-lower-4': {
    title: 'Upper/Lower 4 giorni',
    days: 4,
    level: 'intermediate',
    goal: 'hypertrophy',
    sessions: [
      ['Panca Piana', 'Rematore', 'Military Press', 'Lat Pulldown', 'Curl', 'Pushdown'],
      ['Squat', 'Stacco Rumeno', 'Leg Press', 'Leg Curl', 'Calf Raise', 'Hip Thrust'],
      ['Panca Inclinata', 'Trazioni', 'Alzate Laterali', 'Face Pull', 'Hammer Curl', 'French Press'],
      ['Front Squat', 'Affondi', 'Leg Extension', 'Leg Curl', 'Calf Raise', 'Plank']
    ]
  },
  'ppl-6': {
    title: 'PPL 6 giorni',
    days: 6,
    level: 'advanced',
    goal: 'hypertrophy',
    sessions: [
      ['Panca Piana', 'Panca Inclinata', 'Croci', 'Military Press', 'Alzate Laterali', 'Pushdown'],
      ['Trazioni', 'Rematore', 'Lat Pulldown', 'Face Pull', 'Curl', 'Hammer Curl'],
      ['Squat', 'Leg Press', 'Leg Extension', 'Stacco Rumeno', 'Leg Curl', 'Calf Raise'],
      ['Dip', 'Panca Inclinata', 'Military Press', 'Alzate Laterali', 'French Press', 'Pushdown'],
      ['Rematore', 'Trazioni', 'Pullover', 'Face Pull', 'Curl', 'Hammer Curl'],
      ['Front Squat', 'Affondi', 'Hip Thrust', 'Leg Curl', 'Calf Raise', 'Plank']
    ]
  }
};

function makeExercise(name, scheme) {
  const sets = [];
  const count = scheme.sets || 3;
  for (let i = 0; i < count; i++) {
    sets.push({
      reps: scheme.reps || '8-12',
      rir: scheme.rir != null ? scheme.rir : 2,
      target_load: null
    });
  }
  return {
    name,
    name_original: name,
    setCount: count,
    repsTarget: scheme.reps || '8-12',
    sets
  };
}

export function validateGeneratedProgram(program) {
  const errors = [];
  const warnings = [];
  if (!program || typeof program !== 'object') return { ok: false, errors: ['missing_program'], warnings };
  const weeks = program.weeks || [];
  if (!weeks.length) errors.push('no_weeks');
  let totalEx = 0;
  weeks.forEach((w, wi) => {
    const sessions = w.sessions || [];
    if (!sessions.length) warnings.push(`week_${wi + 1}_empty`);
    sessions.forEach((s) => {
      const exs = s.exercises || [];
      totalEx += exs.length;
      if (exs.length < 3) warnings.push('session_low_volume');
      if (exs.length > 12) warnings.push('session_high_volume');
    });
  });
  if (totalEx < 6) errors.push('too_few_exercises');
  return { ok: errors.length === 0, errors, warnings, totalExercises: totalEx, weeks: weeks.length };
}

export function generateProgram(opts = {}) {
  const days = Number(opts.days) || 4;
  const weeksCount = Math.min(16, Math.max(4, Number(opts.weeks) || 8));
  const level = String(opts.level || 'intermediate').toLowerCase();
  const goal = String(opts.goal || 'hypertrophy').toLowerCase();
  const templateKey =
    opts.template ||
    (days >= 6 ? 'ppl-6' : days >= 4 ? 'upper-lower-4' : 'full-body-3');
  const tpl = TEMPLATES[templateKey] || TEMPLATES['upper-lower-4'];

  const scheme =
    goal === 'strength'
      ? { sets: 5, reps: '3-5', rir: 2 }
      : goal === 'fat_loss' || goal === 'dimagrimento'
        ? { sets: 3, reps: '10-15', rir: 1 }
        : { sets: 3, reps: '8-12', rir: 2 };

  const weeks = [];
  for (let w = 1; w <= weeksCount; w++) {
    const deload = w % 4 === 0;
    const weekScheme = deload
      ? { sets: Math.max(2, scheme.sets - 1), reps: scheme.reps, rir: (scheme.rir || 2) + 1 }
      : scheme;
    weeks.push({
      week: w,
      week_number: w,
      label: deload ? `Settimana ${w} (deload)` : `Settimana ${w}`,
      sessions: tpl.sessions.map((names, si) => ({
        title: `Giorno ${si + 1}`,
        day: `Giorno ${si + 1}`,
        exercises: names.map((n) => makeExercise(n, weekScheme))
      }))
    });
  }

  const program = {
    id: 'gen_' + Date.now(),
    title: `${tpl.title} · ${level} · ${goal}`,
    source: 'structured_generator',
    duration_weeks: weeksCount,
    weeks,
    meta: {
      template: templateKey,
      level,
      goal,
      days: tpl.days,
      generatedAt: new Date().toISOString(),
      method: 'rules_based_not_random'
    }
  };

  const validation = validateGeneratedProgram(program);
  return { program, validation };
}

export function mountProgramGenerateRoutes(app, { requireAuth } = {}) {
  app.post('/api/program/generate', async (req, res) => {
    try {
      if (requireAuth) {
        const auth = await requireAuth(req);
        if (!auth) return res.status(401).json({ ok: false, error: 'Auth required' });
      }
      const result = generateProgram(req.body || {});
      if (!result.validation.ok) {
        return res.status(422).json({ ok: false, error: 'validation_failed', validation: result.validation });
      }
      return res.json({ ok: true, ...result });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message || 'generate_failed' });
    }
  });
}
