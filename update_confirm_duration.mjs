import fs from 'fs';

let webHtml = fs.readFileSync('web/index.html', 'utf8');

const oldBlock = `    const normalized = normalizeProgram(canonical);
    store.activeAthleteProgram = athleteProg;
    store.activeProgram = normalized;
    DATA = normalized;
    currentWeek = 1;
    currentDay = 0;
    store.prefs.duration = normalized.weeks.length;
    store.prefs.durationUserSet = true;
    persist();`;

const newBlock = `    store.prefs.duration = (canonical.weeks || []).length || 16;
    store.prefs.durationUserSet = false;
    const normalized = normalizeProgram(canonical);
    store.activeAthleteProgram = athleteProg;
    store.activeProgram = normalized;
    DATA = normalized;
    currentWeek = 1;
    currentDay = 0;
    store.prefs.duration = normalized.weeks.length;
    store.prefs.durationUserSet = true;
    persist();`;

if (!webHtml.includes(oldBlock)) {
  console.error("oldBlock not found in webHtml!");
  process.exit(1);
}

webHtml = webHtml.replace(oldBlock, newBlock);

fs.writeFileSync('web/index.html', webHtml, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', webHtml, 'utf8');
console.log("Successfully updated confirmImportAndActivate duration handling in web and assets!");
