import fs from 'fs';

let code = fs.readFileSync('build_master24.mjs', 'utf8');

const oldProgramService = `const ProgramService = {
  getActiveProgram() { return DATA; },
  setActiveProgram(prog) {
    DATA = prog;
    if (typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.saveProgram) {
      GiammariaPersistence.saveProgram(prog, true);
    }
    if (typeof persist === 'function') persist();
  },
  getWeeks() { return DATA?.weeks || []; },
  getWeek(weekNum) { return (DATA?.weeks || []).find(w => w.weekNumber === weekNum || w.week === weekNum) || (DATA?.weeks || [])[weekNum - 1] || null; },
  getSessionsForWeek(weekNum) { const w = this.getWeek(weekNum); return w ? (w.sessions || w.days || []) : []; },
  getSession(weekNum, dayIdx) { const sessions = this.getSessionsForWeek(weekNum); return sessions[dayIdx] || null; },
  getExercises(weekNum, dayIdx) { const s = this.getSession(weekNum, dayIdx); return s ? (s.exercises || s.rows || []) : []; },
  calculateProgramSummary(prog = DATA) {
    if (!prog || !prog.weeks) return { totalWeeks: 0, totalSessions: 0, totalExercises: 0, totalVolume: 0 };
    let totalSessions = 0, totalExercises = 0, totalVolume = 0;
    prog.weeks.forEach(w => {
      const sess = w.sessions || w.days || [];
      totalSessions += sess.length;
      sess.forEach(s => {
        const exs = s.exercises || s.rows || [];
        totalExercises += exs.length;
        totalVolume += calculateSessionVolume(s);
      });
    });
    return {
      totalWeeks: prog.weeks.length,
      totalSessions,
      totalExercises,
      totalVolume,
      title: prog.title || prog.programTitle || 'Programma Senza Titolo'
    };
  }
};`;

const newProgramService = `const ProgramService = {
  getActiveProgram(d = DATA) { return d; },
  setActiveProgram(prog) {
    DATA = normalizeProgram(prog);
    if (typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.saveProgram) {
      GiammariaPersistence.saveProgram(DATA, true).catch(console.warn);
    }
    if (typeof persist === 'function') persist();
    return DATA;
  },
  modifyActiveProgram(cb) { if(typeof cb === 'function') cb(DATA); if(typeof persist==='function') persist(); return DATA; },
  adaptProgramDuration(targetWeeks, p = DATA) { return p; },
  exportProgram(p = DATA) { return JSON.stringify(p, null, 2); },
  saveVersion(label = 'Snapshot') {
    if (!store.versions) store.versions = [];
    const vNum = store.versions.length + 1;
    store.versions.push({
      version: vNum,
      timestamp: new Date().toISOString(),
      label: label,
      program: JSON.parse(JSON.stringify(DATA))
    });
    if (typeof persist==='function') persist();
    return vNum;
  },
  getVersions() { return store.versions || []; },
  restoreVersion(vNum) {
    const found = (store.versions || []).find(v => v.version === vNum);
    if (found && found.program) {
      DATA = normalizeProgram(found.program);
      if (typeof persist==='function') persist();
      if (typeof render==='function') render();
      return true;
    }
    return false;
  },
  getWeeks() { return DATA?.weeks || []; },
  getWeek(weekNum) { return (DATA?.weeks || []).find(w => w.weekNumber === weekNum || w.week === weekNum) || (DATA?.weeks || [])[weekNum - 1] || null; },
  getSessionsForWeek(weekNum) { const w = this.getWeek(weekNum); return w ? (w.sessions || w.days || []) : []; },
  getSession(weekNum, dayIdx) { const sessions = this.getSessionsForWeek(weekNum); return sessions[dayIdx] || null; },
  getExercises(weekNum, dayIdx) { const s = this.getSession(weekNum, dayIdx); return s ? (s.exercises || s.rows || []) : []; },
  calculateProgramSummary(prog = DATA) {
    if (!prog || !prog.weeks) return { totalWeeks: 0, totalSessions: 0, totalExercises: 0, totalVolume: 0 };
    let totalSessions = 0, totalExercises = 0, totalVolume = 0;
    prog.weeks.forEach(w => {
      const sess = w.sessions || w.days || [];
      totalSessions += sess.length;
      sess.forEach(s => {
        const exs = s.exercises || s.rows || [];
        totalExercises += exs.length;
        totalVolume += calculateSessionVolume(s);
      });
    });
    return {
      totalWeeks: prog.weeks.length,
      totalSessions,
      totalExercises,
      totalVolume,
      title: prog.title || prog.programTitle || 'Programma Senza Titolo'
    };
  }
};`;

if (code.includes(oldProgramService)) {
  code = code.replace(oldProgramService, newProgramService);
  console.log('✓ Replaced ProgramService in build_master24.mjs');
} else {
  console.log('Could not match oldProgramService');
}

fs.writeFileSync('build_master24.mjs', code, 'utf8');
