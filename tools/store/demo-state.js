// Runs inside the app, as the body of an async function (see tools/store/make_screenshots.mjs).
// The program must already be active (DATA). It writes, in the app's own store, six weeks of finished
// sessions with loads that rise, today's session half done, body checks without photos, and a short
// conversation with the Coach AI whose numbers come from those sessions.
// Nothing here is a real person: the profile is "Alex", the data are made up.
const weeks = (DATA && DATA.weeks) || [];
if (!weeks.length) return 'no program';
const today = new Date(); today.setHours(9, 0, 0, 0);
const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const baseLoad = (name) => {
  const n = String(name).toLowerCase();
  let b = 40 + (hash(name) % 30);
  if (/squat|stacco|leg press|pressa|hip thrust/.test(n)) b += 50;
  else if (/panca|military|rematore|trazion|lat |pulldown|shoulder/.test(n)) b += 15;
  else if (/curl|alzate|french|estension|croci|face|kickback|pushdown/.test(n)) b -= 28;
  return Math.max(8, Math.round(b / 2.5) * 2.5);
};
const workRows = (sess) => (sess.exercises || sess.rows || []);
const setCountOf = (row) => {
  if (Array.isArray(row.sets)) { const n = row.sets.filter((s) => s && !s.warmup).length; if (n) return n; }
  return Number(row.setCount) || 3;
};
const repsOf = (row) => { const m = String(row.repsTarget || row.reps_target || (row.sets && row.sets[0] && row.sets[0].reps) || '8').match(/\d+/); return m ? Number(m[0]) : 8; };
const isCardio = (row) => row.unit === 'cardio' || /corsa|cyclette|tapis|vogatore|ellittica|camminata/i.test(String(row.name || ''));
const dayOffsets = [0, 2, 4, 5];
const logs = [];
const key = (typeof activeProgramKey === 'function') ? activeProgramKey() : null;
for (let w = 1; w <= 6; w++) {
  const wk = weeks[w - 1];
  const sessions = (wk && (wk.sessions || wk.days)) || [];
  for (let d = 0; d < sessions.length && d < 4; d++) {
    const sess = sessions[d];
    const at = new Date(monday);
    at.setDate(monday.getDate() - (7 - w) * 7 + dayOffsets[d]);
    at.setHours(18, 10 + d * 7, 0, 0);
    const muscles = {};
    const lines = [];
    let tonnage = 0, setsTotal = 0, repsTotal = 0, cardioMinutes = 0, exercises = 0;
    workRows(sess).forEach((row, i) => {
      const name = row.name || row.exercise || '';
      if (!name) return;
      exercises++;
      if (isCardio(row)) { lines.push({ name, cardio: true, minutes: 20 }); cardioMinutes += 20; return; }
      const n = setCountOf(row), r = repsOf(row);
      const load = Math.round(baseLoad(name) * (1 + 0.025 * (w - 1)) / 1.25) * 1.25;
      const sets = [];
      store.data = store.data || {};
      for (let s = 0; s < n; s++) {
        const reps = Math.max(5, r - (s >= n - 1 ? 1 : 0));
        sets.push({ load, reps, warmup: false }); tonnage += load * reps; repsTotal += reps; setsTotal++;
        // the same sets as the app keeps them while they are done: the statistics are made of these
        const k = 'w' + w + '_d' + d + '_e' + i + '_s' + (s + 1);
        store.data[k + '_load'] = String(load); store.data[k + '_reps'] = String(reps); store.data[k + '_done'] = true;
      }
      lines.push({ name, cardio: false, sets, restSec: 90 });
      const grp = (typeof normalizeMacroMuscleGroup === 'function') ? normalizeMacroMuscleGroup((row.muscle_groups && row.muscle_groups[0]) || row.muscle || 'ALTRO') : 'ALTRO';
      muscles[grp] = (muscles[grp] || 0) + n;
    });
    logs.push({
      id: 'sess_demo_' + w + '_' + d, at: at.toISOString(), finalizedAt: at.toISOString(), week: w, day: d,
      durationSec: 3300 + (hash(w + ':' + d) % 900), kcal: 360 + (hash(w + ':' + d) % 120), tonnage: Math.round(tonnage), intensity: 58 + (hash('i' + w + d) % 12),
      sets: setsTotal, exercises, reps: repsTotal, muscles, cardioMinutes, prCount: 0, exerciseLines: lines,
      sessionName: sess.name || sess.title || ('Giorno ' + (d + 1)), programId: key, prs: []
    });
  }
}
store.logs = logs;

// today: week 7, day 1, half done
currentWeek = 7; currentDay = 0;
const todaySess = ((weeks[6] && (weeks[6].sessions || weeks[6].days)) || [])[0];
store.data = store.data || {};
if (todaySess) {
  workRows(todaySess).forEach((row, i) => {
    if (isCardio(row)) return;
    const n = setCountOf(row), r = repsOf(row);
    const load = Math.round(baseLoad(row.name || '') * (1 + 0.025 * 6) / 1.25) * 1.25;
    const doneSets = i < 3 ? n : (i === 3 ? 1 : 0);
    for (let s = 1; s <= doneSets; s++) {
      const k = 'w7_d0_e' + i + '_s' + s;
      store.data[k + '_load'] = String(load); store.data[k + '_reps'] = String(Math.max(5, r - (s === n ? 1 : 0))); store.data[k + '_done'] = true;
    }
  });
}

store.profile = Object.assign({}, store.profile, { name: 'Alex', sex: 'm', age: 29, height: 178, weight: 76.2, goal: 'ipertrofia' });
if (!store.prefs) store.prefs = {};
store.bodyChecks = [77.6, 77.1, 76.7, 76.2].map((w, i) => {
  const at = new Date(monday); at.setDate(monday.getDate() - (3 - i) * 14 - 2);
  return { id: 'chk_demo_' + i, at: at.toISOString(), weight: w, period: 'bisettimanale', notes: '', hasFront: false, hasBack: false, analysis: '', checkInSyncState: 'DRAFT' };
});
store.bw = { 1: 77.6, 3: 77.1, 5: 76.7, 6: 76.2 };

// today's values for the recovery estimate
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
store.nutritionDaily = store.nutritionDaily || {};
for (let i = 0; i < 8; i++) {
  const d = new Date(today); d.setDate(today.getDate() - i);
  store.nutritionDaily[iso(d)] = Object.assign({}, store.nutritionDaily[iso(d)], { steps: 7200 + ((i * 937) % 4200), vitals: { sleepHours: 7.5 - (i % 3) * 0.5, restingHr: 56 + (i % 4), hrvMs: 66 - (i % 5) * 2 } });
}

// the Coach AI conversation: numbers taken from the sessions above
const hist = (needle) => {
  const out = [];
  logs.forEach((l) => l.exerciseLines.forEach((e) => { if (!e.cardio && new RegExp(needle, 'i').test(e.name) && e.sets.length) out.push({ name: e.name, at: l.finalizedAt, load: e.sets[0].load, reps: e.sets[0].reps }); }));
  return out;
};
// the first strength exercise of the first session
const focusName = ((logs[0] && logs[0].exerciseLines.find((e) => !e.cardio)) || {}).name || '';
const bench = hist(focusName.split('').map((ch) => (/[a-z0-9 ]/i.test(ch) ? ch : '.')).join(''));
const first = bench[0], last = bench[bench.length - 1];
store.chatHistory = first && last ? [
  { role: 'user', text: 'Come sto andando con ' + first.name.toLowerCase() + '?' },
  { role: 'assistant', text: 'Negli ultimi due mesi **' + first.name + '** è passato da **' + first.load + ' kg × ' + first.reps + '** a **' + last.load + ' kg × ' + last.reps + '**: +' + Math.round((last.load - first.load) * 10) / 10 + ' kg, senza perdere ripetizioni.\n\n1. Tieni il carico finché fai tutte le serie nel range.\n2. Quando chiudi tutte le serie al top del range, sali di 2,5 kg.\n3. Se due sedute di fila restano ferme, riduci il volume del 10% per una settimana.\n\nVuoi che proponga la modifica al programma?' },
  { role: 'user', text: 'Sì, dammi solo un consiglio breve per la prossima seduta' },
  { role: 'assistant', text: 'Oggi parti con **' + last.load + ' kg** e punta a una ripetizione in più nelle prime due serie. Se la velocità resta buona, chiudi l’ultima serie con 1-2 ripetizioni di riserva.' }
] : [];
store.chatSessionId = 'demo';
if (typeof persist === 'function') persist();
return JSON.stringify({ logs: logs.length, chat: store.chatHistory.length, bench: bench.length });
