/**
 * Deterministic Context Builder — selects only relevant athlete slices for the question.
 * Independent of Gemini / frontend.
 */

const DOMAIN_KEYWORDS = {
  training: /\b(panca|squat|stacco|serie|reps?|rir|rpe|volume|carico|esercizio|scheda|allen|workout|settiman|sessione|superset|recupero|forza|ipertrof|deload)\b/i,
  nutrition: /\b(aliment|dieta|calo?rie|proteine|carboidr|grassi|pasto|macro|nutriz|meal|kcal|pizza|cibo)\b/i,
  supplements: /\b(integrat|creatina|proteine?\s*whey|vitamina|omega|supp|ashwagandha|tongkat|fadogia|testo\s*boost|testobooster|booster|fenugreek|berberina|citrullina|beta[\s-]?alanina|pre[\s-]?workout|whey|caseina|multivitamin|zinco|magnesio|melatonina|collagene|carnitina|barcode|codice\s*a\s*barre)\b/i,
  therapy: /\b(terapia|farmac|medicinal|dose|protocollo\s*med)\b/i,
  exams: /\b(esami?|sangue|lab|analisi|valori|referto)\b/i,
  profile: /\b(obiettiv|peso|altezza|et[aà]|profilo|1rm|massimale|esperienza)\b/i,
  performance: /\b(progress|tonnellaggio|pr\b|record|statistiche|performance|trend)\b/i,
  health: /\b(sonno|heart|frequenza|cardiaca|passi|hrv|readiness|recupero|wearable|health\s*connect)\b/i,
  evidence: /\b(eviden|pubmed|letteratura|studio|meta-?anal|rct|scientific)\b/i
};

function estimateChars(obj) {
  try {
    return JSON.stringify(obj).length;
  } catch (_) {
    return 0;
  }
}

function slimProgram(program, currentWeek, currentDay) {
  if (!program || typeof program !== 'object') return null;
  const weeks = Array.isArray(program.weeks) ? program.weeks : [];
  const wIdx = Math.max(0, (Number(currentWeek) || 1) - 1);
  const focusWeeks = weeks.slice(Math.max(0, wIdx - 1), wIdx + 2).map((w) => {
    const sessions = w.sessions || w.days || [];
    return {
      week: w.weekNumber || w.week || w.id,
      label: w.label || w.title,
      sessions: sessions.map((s, i) => ({
        index: i + 1,
        title: s.title || s.day || `Giorno ${i + 1}`,
        exercises: (s.exercises || s.rows || []).slice(0, 20).map((e) => ({
          name: e.name || e.exercise,
          sets: Array.isArray(e.sets)
            ? e.sets.slice(0, 8).map((st) => ({
                reps: st.reps || st.reps_target || e.repsTarget,
                load: st.load ?? st.target_load,
                rir: st.rir ?? e.rir,
                rpe: st.rpe ?? e.rpe
              }))
            : undefined,
          repsTarget: e.repsTarget || e.reps_target || e.reps,
          setCount: e.setCount || (Array.isArray(e.sets) ? e.sets.length : e.sets)
        }))
      }))
    };
  });
  return {
    id: program.id,
    title: program.title,
    duration_weeks: program.duration_weeks || weeks.length,
    currentWeek: Number(currentWeek) || 1,
    currentDay: Number(currentDay) >= 0 ? Number(currentDay) : 0,
    focusWeeks
  };
}

function slimNutrition(nutrition) {
  if (!nutrition) return null;
  const days = (nutrition.days || []).slice(0, 3).map((d) => ({
    day: d.day || d.name,
    meals: (d.meals || []).slice(0, 5).map((m) => ({
      name: m.name,
      foods: (m.foods || []).slice(0, 8).map((f) => f.name || f.food || f)
    }))
  }));
  return {
    present: true,
    targets: {
      kcal: nutrition.daily_calories_target,
      protein: nutrition.daily_protein_target,
      carbs: nutrition.daily_carbs_target,
      fats: nutrition.daily_fats_target
    },
    sampleDays: days
  };
}

/**
 * @param {object} input
 * @param {string} input.question
 * @param {object} [input.clientContext] — untrusted hints from client (summary, prefs…)
 * @param {object} [input.serverProgram] — authoritative program from DB if any
 * @param {object} [input.profile]
 * @param {object} [input.config]
 */
export function buildAiContext(input = {}) {
  const question = String(input.question || '');
  const client = input.clientContext && typeof input.clientContext === 'object' ? input.clientContext : {};
  const config = input.config || {};
  const maxChars = config.maxContextChars || 24_000;

  const needed = {
    training: DOMAIN_KEYWORDS.training.test(question),
    nutrition: DOMAIN_KEYWORDS.nutrition.test(question),
    supplements: DOMAIN_KEYWORDS.supplements.test(question),
    therapy: DOMAIN_KEYWORDS.therapy.test(question),
    exams: DOMAIN_KEYWORDS.exams.test(question),
    profile: DOMAIN_KEYWORDS.profile.test(question) || true,
    performance: DOMAIN_KEYWORDS.performance.test(question),
    health: DOMAIN_KEYWORDS.health.test(question),
    evidence: DOMAIN_KEYWORDS.evidence.test(question)
  };

  // Default light training only when question is not clearly another domain
  const specific =
    needed.nutrition || needed.supplements || needed.therapy || needed.exams || needed.health || needed.evidence;
  if (!specific && !needed.training) {
    needed.training = true;
  }
  if (specific && !DOMAIN_KEYWORDS.training.test(question)) {
    needed.training = false;
  }

  const out = {
    language: client.language || 'it',
    currentWeek: client.currentWeek || 1,
    currentDay: client.currentDay || 0,
    intensityType: client.intensityType || (client.prefs && client.prefs.intensityType) || 'RIR',
    domains: Object.keys(needed).filter((k) => needed[k])
  };

  if (needed.profile) {
    const profile = input.profile || client.profile || {};
    out.profile = {
      goal: profile.goal || profile.primary_goal,
      weight: profile.weight || profile.weight_kg,
      height: profile.height || profile.height_cm,
      experience: profile.experience || profile.experience_level,
      squatMax: profile.squatMax,
      benchMax: profile.benchMax,
      deadliftMax: profile.deadliftMax,
      focusMuscles: profile.focusMuscles
    };
  }

  if (needed.training) {
    const program = input.serverProgram || client.program || null;
    const summary = client.programSummary || null;
    if (program && Array.isArray(program.weeks) && program.weeks.length) {
      out.program = slimProgram(program, out.currentWeek, out.currentDay);
    } else if (summary) {
      out.programSummary = summary;
    }
    if (client.prefs) {
      out.prefs = {
        intensityType: client.prefs.intensityType,
        duration: client.prefs.duration,
        frequency: client.prefs.frequency,
        weekIntensity: client.prefs.weekIntensity
      };
    }
  }

  if (needed.nutrition) {
    out.nutrition = slimNutrition(client.nutrition || input.nutrition);
  }
  if (needed.supplements) {
    const s = client.supplementation || input.supplementation;
    out.supplementation = s
      ? { items: (s.items || []).slice(0, 15).map((i) => ({ name: i.name, dose: i.dose || i.dosage })) }
      : null;
  }
  if (needed.therapy) {
    const t = client.therapy || input.therapy;
    out.therapy = t
      ? { medications: (t.medications || t.items || []).slice(0, 10).map((m) => ({ name: m.name, dose: m.dose })) }
      : null;
  }
  if (needed.exams) {
    const e = client.exams || input.exams;
    const records = e?.records || e?.items || [];
    out.exams = { recent: records.slice(0, 5).map((r) => ({ name: r.name || r.test, date: r.date, value: r.value })) };
  }
  if (client.performanceSummary && client.performanceSummary.hasData) {
    out.performanceSummary = client.performanceSummary;
    if (!out.domains.includes('performance')) out.domains.push('performance');
  } else if (needed.performance && client.performanceSummary) {
    out.performanceSummary = client.performanceSummary;
  }
  if (needed.health && (client.health || input.health)) {
    const h = client.health || input.health || {};
    out.health = {
      steps: h.steps,
      restingHr: h.restingHr || h.restingHeartRate,
      sleepHours: h.sleepHours,
      source: h.source || 'health_connect_or_client',
      kind: 'api',
      note: 'Dati wearable potenzialmente stimati — non certezza clinica'
    };
  }
  if (needed.evidence) {
    out.evidenceHint = {
      endpoint: '/api/evidence/search',
      note: 'Usa PMID verificabili; non inventare citazioni'
    };
  }

  // Enforce size budget by dropping heavier domains first
  let json = JSON.stringify(out);
  if (json.length > maxChars) {
    delete out.exams;
    delete out.therapy;
    delete out.supplementation;
    json = JSON.stringify(out);
  }
  if (json.length > maxChars && out.program && out.program.focusWeeks) {
    out.program.focusWeeks = out.program.focusWeeks.slice(0, 1);
    json = JSON.stringify(out);
  }
  if (json.length > maxChars) {
    out.truncated = true;
    out.program = out.program
      ? { title: out.program.title, currentWeek: out.program.currentWeek }
      : out.programSummary;
    delete out.programSummary;
  }

  return {
    context: out,
    domainsIncluded: out.domains,
    approxChars: estimateChars(out),
    needed
  };
}

export function detectNeededDomains(question) {
  return buildAiContext({ question, clientContext: {}, config: { maxContextChars: 1000 } }).needed;
}
