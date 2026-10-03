// What the Coach AI can read of the person's training, as the Statistics page
// does: every finalized session with the load and repetitions of each set, the
// volume per muscle group, records, body weight. The app sends the history
// with the question (compact: a session is a few hundred bytes); the model
// asks for what it needs through the tools below, so it can look as deep as
// the question goes instead of being handed a fixed summary.
//
// Pure functions, no network, no database: tested in test_coach_training_tools.mjs.

const MAX_SESSIONS = 400;
const MAX_LINES = 40;
const MAX_SETS = 30;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const round = (v, d = 1) => { const k = 10 ** d; return Math.round(num(v) * k) / k; };
const dayOf = (s) => String(s || "").slice(0, 10);

// Epley: the usual estimate of the weight lifted once, good up to about twelve repetitions.
export function estimate1RM(load, reps) {
  const l = num(load), r = Math.round(num(reps));
  if (l <= 0 || r <= 0) return 0;
  if (r === 1) return round(l);
  return round(l * (1 + Math.min(r, 12) / 30));
}

// The app's compact form -> a checked, bounded form. Anything odd is dropped, never trusted.
export function cleanTrainingData(raw) {
  if (!raw || typeof raw !== "object") return null;
  const sessions = (Array.isArray(raw.sessions) ? raw.sessions : []).slice(-MAX_SESSIONS).map((s) => {
    if (!s || typeof s !== "object") return null;
    const date = dayOf(s.d);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const lines = (Array.isArray(s.l) ? s.l : []).slice(0, MAX_LINES).map((l) => {
      if (!l || typeof l !== "object" || !l.n) return null;
      const sets = (Array.isArray(l.s) ? l.s : []).slice(0, MAX_SETS)
        .map((p) => (Array.isArray(p) ? [num(p[0]), Math.round(num(p[1]))] : null)).filter(Boolean);
      const warm = (Array.isArray(l.wu) ? l.wu : []).slice(0, MAX_SETS)
        .map((p) => (Array.isArray(p) ? [num(p[0]), Math.round(num(p[1]))] : null)).filter(Boolean);
      const out = { name: String(l.n).slice(0, 80), sets, warmup: warm };
      if (num(l.c) > 0) out.cardioMinutes = Math.round(num(l.c));
      return out;
    }).filter(Boolean);
    const muscles = {};
    if (s.m && typeof s.m === "object") Object.keys(s.m).slice(0, 20).forEach((k) => { if (num(s.m[k]) > 0) muscles[String(k).slice(0, 24)] = round(s.m[k], 1); });
    return {
      date, week: num(s.w) || null, day: Number.isFinite(Number(s.day)) ? num(s.day) : null,
      name: String(s.n || "").slice(0, 80), minutes: round(num(s.min), 0), tonnage: Math.round(num(s.t)), sets: Math.round(num(s.s)),
      muscles, lines
    };
  }).filter(Boolean).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const bodyWeight = (Array.isArray(raw.bodyWeight) ? raw.bodyWeight : []).slice(-200)
    .map((p) => (p && /^\d{4}-\d{2}-\d{2}$/.test(dayOf(p.d)) && num(p.kg) > 20 && num(p.kg) < 400 ? { date: dayOf(p.d), kg: round(p.kg, 1) } : null)).filter(Boolean);
  const today = raw.today && typeof raw.today === "object" ? cleanTrainingData({ sessions: [{ ...raw.today, d: raw.today.d || "2000-01-01" }] }) : null;
  return {
    sessions, bodyWeight,
    today: today && today.sessions[0] ? { name: today.sessions[0].name, lines: today.sessions[0].lines } : null,
    unit: raw.unit === "lb" ? "lb" : "kg",
    today_date: /^\d{4}-\d{2}-\d{2}$/.test(dayOf(raw.date)) ? dayOf(raw.date) : null
  };
}

function sessionTop(line) {
  let best = null;
  line.sets.forEach(([load, reps]) => {
    const e = estimate1RM(load, reps);
    if (!best || e > best.e1rm || (e === best.e1rm && load > best.load)) best = { load, reps, e1rm: e };
  });
  return best;
}
const lineVolume = (line) => line.sets.reduce((a, [l, r]) => a + l * r, 0);
const sameName = (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()) || String(b).toLowerCase().includes(String(a).toLowerCase());

function daysAgo(dateStr, ref) {
  const a = Date.parse(dateStr + "T00:00:00Z"), b = Date.parse(ref + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}
function refDate(data) {
  return data.today_date || (data.sessions.length ? data.sessions[data.sessions.length - 1].date : new Date().toISOString().slice(0, 10));
}
function weekKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

// A few lines in the prompt so common questions need no tool at all.
export function trainingDigest(data) {
  if (!data || !data.sessions.length) return "Nessuna seduta finalizzata nello storico inviato dall'app (può essere il primo allenamento).";
  const ref = refDate(data);
  const first = data.sessions[0].date, last = data.sessions[data.sessions.length - 1].date;
  const in28 = data.sessions.filter((s) => daysAgo(s.date, ref) <= 28);
  const tonnage28 = in28.reduce((a, s) => a + s.tonnage, 0);
  const lines = [
    `Sedute registrate: ${data.sessions.length} (dal ${first} al ${last}), unità ${data.unit}.`,
    `Ultimi 28 giorni: ${in28.length} sedute, ${in28.reduce((a, s) => a + s.sets, 0)} serie, volume ${tonnage28} ${data.unit}.`
  ];
  const lastS = data.sessions[data.sessions.length - 1];
  lines.push("Ultima seduta (" + lastS.date + (lastS.name ? ", " + lastS.name : "") + "): " + lastS.lines.slice(0, 8).map((l) => {
    if (!l.sets.length) return l.name + (l.cardioMinutes ? " " + l.cardioMinutes + " min" : "");
    const t = sessionTop(l);
    return l.name + " " + l.sets.length + "×, top " + (t ? t.load + "×" + t.reps : "-");
  }).join("; "));
  if (data.today && data.today.lines.length) lines.push("Seduta di oggi, ancora aperta: " + data.today.lines.slice(0, 8).map((l) => l.name + " " + l.sets.map((p) => p[0] + "×" + p[1]).join(", ")).join("; "));
  return lines.join("\n");
}

export function trainingTools(data) {
  const unit = data ? data.unit : "kg";
  const ref = data ? refDate(data) : null;

  const declarations = [
    {
      name: "get_sessions",
      description: "Elenca le sedute di allenamento finalizzate dell'atleta, dalla più recente, con data, nome, durata, volume (tonnellaggio), serie e muscoli. Con 'detail' true include per ogni esercizio le serie (carico×ripetizioni).",
      parameters: { type: "OBJECT", properties: {
        last: { type: "NUMBER", description: "Quante sedute (default 10, max 40)." },
        days: { type: "NUMBER", description: "Solo le sedute degli ultimi N giorni." },
        exercise: { type: "STRING", description: "Solo le sedute che contengono questo esercizio (anche parte del nome)." },
        detail: { type: "BOOLEAN", description: "Includi le serie di ogni esercizio." }
      } }
    },
    {
      name: "get_exercise_history",
      description: "Storia di un esercizio: per ogni seduta data, serie fatte (carico×ripetizioni), serie top, 1RM stimato e volume. Serve per vedere progressione e stalli dei carichi.",
      parameters: { type: "OBJECT", properties: {
        exercise: { type: "STRING", description: "Nome o parte del nome dell'esercizio, es. 'panca' o 'squat'." },
        last: { type: "NUMBER", description: "Quante sedute (default 12, max 60)." }
      }, required: ["exercise"] }
    },
    {
      name: "get_personal_records",
      description: "Record personali: per ogni esercizio (o per quello indicato) il carico più alto sollevato, il miglior 1RM stimato e quando.",
      parameters: { type: "OBJECT", properties: { exercise: { type: "STRING", description: "Facoltativo: un solo esercizio." } } }
    },
    {
      name: "get_muscle_volume",
      description: "Volume per gruppo muscolare (serie e, dove disponibile, tonnellaggio) per settimana, come nella pagina Statistiche. Permette di vedere distretti trascurati o sovraccaricati.",
      parameters: { type: "OBJECT", properties: {
        weeks: { type: "NUMBER", description: "Quante settimane indietro (default 8, max 26)." },
        group: { type: "STRING", description: "Facoltativo: un solo gruppo (PETTO, DORSO, SPALLE, BRACCIA, ADDOME, GAMBE)." }
      } }
    },
    {
      name: "get_stats_summary",
      description: "Riepilogo come nella pagina Statistiche per un periodo: sedute, frequenza settimanale, serie, volume, durata media, esercizi più fatti.",
      parameters: { type: "OBJECT", properties: { days: { type: "NUMBER", description: "Periodo in giorni (default 28, max 365)." } } }
    },
    {
      name: "get_bodyweight",
      description: "Peso corporeo registrato nel tempo (kg), con variazione.",
      parameters: { type: "OBJECT", properties: { last: { type: "NUMBER", description: "Quante misure (default 20)." } } }
    }
  ];

  function sessionsMatching(args) {
    let list = data.sessions.slice();
    if (num(args.days) > 0) list = list.filter((s) => daysAgo(s.date, ref) <= num(args.days));
    if (args.exercise) list = list.filter((s) => s.lines.some((l) => sameName(l.name, args.exercise)));
    return list;
  }

  function call(name, args) {
    args = args && typeof args === "object" ? args : {};
    if (!data || !data.sessions.length) {
      if (name === "get_bodyweight" && data && data.bodyWeight.length) { /* handled below */ } else {
        return { available: false, note: "Nessuna seduta finalizzata nello storico dell'app: l'atleta non ha ancora registrato allenamenti, oppure non sono stati sincronizzati." };
      }
    }
    if (name === "get_sessions") {
      const n = Math.max(1, Math.min(40, Math.round(num(args.last)) || 10));
      const list = sessionsMatching(args).slice(-n).reverse();
      return { unit, count: list.length, sessions: list.map((s) => {
        const o = { date: s.date, name: s.name, minutes: s.minutes, volume: s.tonnage, sets: s.sets, muscles: s.muscles };
        if (args.detail) o.exercises = s.lines.map((l) => ({ name: l.name, sets: l.sets.map((p) => p[0] + "×" + p[1]), warmup_sets: l.warmup.length || undefined, cardio_minutes: l.cardioMinutes }));
        else o.exercises = s.lines.map((l) => l.name);
        return o;
      }) };
    }
    if (name === "get_exercise_history") {
      if (!args.exercise) return { error: "Indica l'esercizio." };
      const n = Math.max(1, Math.min(60, Math.round(num(args.last)) || 12));
      const rows = [];
      data.sessions.forEach((s) => s.lines.filter((l) => l.sets.length && sameName(l.name, args.exercise)).forEach((l) => {
        const top = sessionTop(l);
        rows.push({ date: s.date, exercise: l.name, sets: l.sets.map((p) => p[0] + "×" + p[1]), top_set: top ? top.load + "×" + top.reps : null, est_1rm: top ? top.e1rm : 0, volume: Math.round(lineVolume(l)) });
      }));
      const last = rows.slice(-n);
      if (!last.length) return { found: false, note: "Nessuna serie registrata per un esercizio con questo nome.", known_exercises: [...new Set(data.sessions.flatMap((s) => s.lines.filter((l) => l.sets.length).map((l) => l.name)))].slice(0, 40) };
      const first = last[0], latest = last[last.length - 1];
      return { unit, found: true, sessions: last, trend: { from: first.date, to: latest.date, est_1rm_change: round(latest.est_1rm - first.est_1rm), top_set_first: first.top_set, top_set_latest: latest.top_set } };
    }
    if (name === "get_personal_records") {
      const best = new Map();
      data.sessions.forEach((s) => s.lines.forEach((l) => {
        if (args.exercise && !sameName(l.name, args.exercise)) return;
        l.sets.forEach(([load, reps]) => {
          const cur = best.get(l.name) || { heaviest: null, best_1rm: null };
          const e = estimate1RM(load, reps);
          if (load > 0 && (!cur.heaviest || load > cur.heaviest.load)) cur.heaviest = { load, reps, date: s.date };
          if (e > 0 && (!cur.best_1rm || e > cur.best_1rm.value)) cur.best_1rm = { value: e, from: load + "×" + reps, date: s.date };
          best.set(l.name, cur);
        });
      }));
      return { unit, records: [...best.entries()].map(([exercise, v]) => ({ exercise, ...v })).sort((a, b) => (b.best_1rm ? b.best_1rm.value : 0) - (a.best_1rm ? a.best_1rm.value : 0)).slice(0, 40) };
    }
    if (name === "get_muscle_volume") {
      const weeks = Math.max(1, Math.min(26, Math.round(num(args.weeks)) || 8));
      const cut = new Date(Date.parse(ref + "T00:00:00Z") - weeks * 7 * 86400000).toISOString().slice(0, 10);
      const byWeek = {};
      data.sessions.filter((s) => s.date >= cut).forEach((s) => {
        const k = weekKey(s.date);
        byWeek[k] = byWeek[k] || { week_start: k, sessions: 0, sets_by_muscle: {} };
        byWeek[k].sessions += 1;
        Object.entries(s.muscles).forEach(([m, v]) => {
          if (args.group && String(m).toUpperCase() !== String(args.group).toUpperCase()) return;
          byWeek[k].sets_by_muscle[m] = round((byWeek[k].sets_by_muscle[m] || 0) + v, 1);
        });
      });
      return { note: "I numeri per muscolo sono le serie allenanti contate dall'app per ogni seduta (le stesse della pagina Statistiche).", weeks: Object.values(byWeek).sort((a, b) => (a.week_start < b.week_start ? -1 : 1)) };
    }
    if (name === "get_stats_summary") {
      const days = Math.max(1, Math.min(365, Math.round(num(args.days)) || 28));
      const list = data.sessions.filter((s) => daysAgo(s.date, ref) <= days);
      const count = {};
      list.forEach((s) => s.lines.forEach((l) => { if (l.sets.length) count[l.name] = (count[l.name] || 0) + 1; }));
      return {
        unit, period_days: days, sessions: list.length, sessions_per_week: round(list.length / (days / 7)),
        sets: list.reduce((a, s) => a + s.sets, 0), volume: list.reduce((a, s) => a + s.tonnage, 0),
        average_minutes: list.length ? round(list.reduce((a, s) => a + s.minutes, 0) / list.length, 0) : 0,
        most_done: Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([exercise, sessions]) => ({ exercise, sessions }))
      };
    }
    if (name === "get_bodyweight") {
      const n = Math.max(1, Math.min(100, Math.round(num(args.last)) || 20));
      const list = data.bodyWeight.slice(-n);
      if (!list.length) return { available: false, note: "Nessun peso corporeo registrato." };
      return { unit: "kg", measures: list, change: round(list[list.length - 1].kg - list[0].kg) };
    }
    return { error: "Strumento sconosciuto: " + name };
  }
  return { declarations, call };
}
