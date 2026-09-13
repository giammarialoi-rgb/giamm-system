import fs from 'fs';

let html = fs.readFileSync('web/index.html', 'utf8').replace(/\r\n/g, '\n');

const brokenConfirm = `async function confirmImportAndActivate() {
  const state = window.programImportState;
  if (!state || !state.canonicalProgram) return;

  const prog = JSON.parse(JSON.stringify(state.canonicalProgram));
  try {
    if (typeof GiammariaPersistence !== 'undefined') {
      const res = await GiammariaPersistence.saveActiveProgram(prog);
      console.log(\`[PERSISTENCE ATOMIC] Canonical program saved and verified in IndexedDB. ID: \${res.id}\`);
      store.activeProgramId = res.id;
      store.activeProgram = null;
    } else {
      store.activeProgram = prog;
    }
    if (prog.duration_weeks) {
      store.prefs.duration = prog.duration_weeks;
    }
    DATA = normalizeProgram(prog);
    currentWeek = 1;
    currentDay = 0;
    store.activeAthleteProgram = null;
    persist();
    showToast("Programma importato e attivato con successo!", "success");
    navigate('home');
  } catch (err) {
    console.error("[CONFIRM IMPORT ERROR]", err);
    showToast("Errore durante il salvataggio del programma: " + err.message, "danger");
  }
} catch (err) {
    console.error("CONFIRM_IMPORT_ERROR", err);
    alert("Errore conferma: " + err.message);
  } finally {
    state.isConfirming = false;
    if (currentView === 'import') render();
  }
}`;

const cleanConfirm = `async function confirmImportAndActivate() {
  const state = window.programImportState;
  if (!state || !state.canonicalProgram) return;

  if (state.isConfirming) return;
  state.isConfirming = true;
  if (currentView === 'import') render();

  const prog = JSON.parse(JSON.stringify(state.canonicalProgram));
  try {
    if (typeof GiammariaPersistence !== 'undefined') {
      const res = await GiammariaPersistence.saveActiveProgram(prog);
      console.log(\`[PERSISTENCE ATOMIC] Canonical program saved and verified in IndexedDB. ID: \${res.id}\`);
      store.activeProgramId = res.id;
      store.activeProgram = null;
    } else {
      store.activeProgram = prog;
    }
    if (prog.duration_weeks) {
      store.prefs.duration = prog.duration_weeks;
    }
    DATA = normalizeProgram(prog);
    currentWeek = 1;
    currentDay = 0;
    store.activeAthleteProgram = null;
    persist();
    if (typeof showToast === 'function') {
      showToast("Programma importato e attivato con successo!", "success");
    } else {
      alert("🎉 Programma importato con successo! Nuova scheda impostata sulla tua Dashboard.");
    }
    state.currentImportId = null;
    state.canonicalProgram = null;
    navigate('home');
  } catch (err) {
    console.error("[CONFIRM IMPORT ERROR]", err);
    if (typeof showToast === 'function') {
      showToast("Errore durante il salvataggio del programma: " + err.message, "danger");
    } else {
      alert("Errore conferma: " + err.message);
    }
  } finally {
    state.isConfirming = false;
    if (currentView === 'import') render();
  }
}`;

if (html.includes(brokenConfirm)) {
  html = html.replace(brokenConfirm, cleanConfirm);
  fs.writeFileSync('web/index.html', html, 'utf8');
  fs.writeFileSync('app/src/main/assets/index.html', html, 'utf8');
  console.log('Fixed confirmImportAndActivate successfully!');
} else {
  console.log('brokenConfirm pattern not exact match, using regex...');
  const regex = /async function confirmImportAndActivate\(\)\s*\{[\s\S]*?\/\/ ====================================================\s*\n\/\/ RENDER IMPORT REVIEW UX 2\.1/;
  html = html.replace(regex, cleanConfirm + "\n\n// ====================================================\n// RENDER IMPORT REVIEW UX 2.1");
  fs.writeFileSync('web/index.html', html, 'utf8');
  fs.writeFileSync('app/src/main/assets/index.html', html, 'utf8');
  console.log('Regex replaced confirmImportAndActivate!');
}
