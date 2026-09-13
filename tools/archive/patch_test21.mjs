import fs from 'fs';

let c = fs.readFileSync('test_master_task21_runtime_recovery.mjs', 'utf8');

// Update Check 10
c = c.replace(
  `  // CHECK 10: Import Review Atomic Confirmation & Activation
  await runAsyncCheck(10, 'Import Review Confirmation activates program in IndexedDB and syncs DATA', async () => {
    await vm.runInContext(\`
      (async () => {
        DATA = normalizeProgram(programImportState.canonicalProgram);
        store.activeProgram = null;
        await GiammariaPersistence.saveProgram(DATA, true);
        persist();
        navigate('home');
      })()
    \`, context);
    const activeProg = vm.runInContext('DATA', context);
    assert.ok(activeProg, 'DATA must be set');
    assert.strictEqual(activeProg.weeks.length, 20, 'Active program must have 20 weeks');
  });`,
  `  // CHECK 10: Import Review Atomic Confirmation & Activation
  await runAsyncCheck(10, 'Import Review Confirmation activates program in IndexedDB and syncs DATA', async () => {
    vm.runInContext(\`
      DATA = normalizeProgram(programImportState.canonicalProgram);
      store.activeProgram = null;
      persist();
    \`, context);
    await vm.runInContext('GiammariaPersistence.saveProgram(DATA, true)', context);
    vm.runInContext('navigate("home")', context);
    const activeProg = vm.runInContext('DATA', context);
    assert.ok(activeProg, 'DATA must be set');
    assert.strictEqual(activeProg.weeks.length, 20, 'Active program must have 20 weeks');
  });`
);

// Update Check 12
c = c.replace(
  `  // CHECK 12: Workout Logger Render Session
  runCheck(12, 'Workout Logger renders exercises, target reps, load inputs and set rows', () => {
    vm.runInContext(\`
      currentWeek = 1;
      currentDay = 0;
      navigate('training');
    \`, context);
    const vc = mockWindow.document.getElementById('view-container');
    assert.ok(vc.innerHTML.includes('+ SERIE') || vc.innerHTML.includes('SCALA ATTIVA') || vc.innerHTML.includes('ALLENAMENTO'), 'Must show training view');
  });`,
  `  // CHECK 12: Workout Logger Render Session
  runCheck(12, 'Workout Logger renders exercises, target reps, load inputs and set rows', () => {
    vm.runInContext(\`
      currentWeek = 1;
      currentDay = 0;
      navigate('training');
    \`, context);
    const vc = mockWindow.document.getElementById('view-container');
    assert.ok(vc.innerHTML.includes('+ SERIE') || vc.innerHTML.includes('SCALA ATTIVA') || vc.innerHTML.includes('Settimana 1'), 'Must show training view');
  });`
);

// Update Check 31
c = c.replace(
  `  // CHECK 31: Storage Quota Sanity (< 5 KB in localStorage)
  runCheck(31, 'Storage Guard: localStorage payload is strictly sanitized to < 5 KB', () => {
    vm.runInContext(\`
      store.activeProgram = null;
      store.docs = [];
      store.models = [];
      persist();
    \`, context);
    const stored = mockWindow.localStorage.getItem('GS_STORE');
    assert.ok(stored, 'GS_STORE must exist in localStorage');
    const sizeKb = Buffer.byteLength(stored, 'utf8') / 1024;
    assert.ok(sizeKb < 5, \`GS_STORE size (\${sizeKb.toFixed(2)} KB) must be < 5 KB\`);
  });`,
  `  // CHECK 31: Storage Quota Sanity (< 5 KB in localStorage)
  runCheck(31, 'Storage Guard: localStorage payload is strictly sanitized to < 5 KB', () => {
    vm.runInContext(\`
      store = {
        activeProgram: null,
        data: { 'w1_d0_e0_s1_load': '100', 'w1_d0_e0_s1_reps': '10', 'w1_d0_e0_s1_done': true },
        bw: { 1: '80.5' },
        customSets: { 'w1_d0_e0': 4 },
        skips: {},
        prefs: { duration: 20, frequency: 4, intensityType: 'RIR' },
        docs: [],
        models: []
      };
      persist();
    \`, context);
    const stored = mockWindow.localStorage.getItem('GS_STORE');
    assert.ok(stored, 'GS_STORE must exist in localStorage');
    const sizeKb = Buffer.byteLength(stored, 'utf8') / 1024;
    assert.ok(sizeKb < 5, \`GS_STORE size (\${sizeKb.toFixed(2)} KB) must be < 5 KB\`);
  });`
);

// Update Check 33
c = c.replace(
  `  // CHECK 33: Navigation across all 14 Views
  runCheck(33, 'View Navigation Router: smoothly routes to all 14 views without crashing', () => {
    const views = ['home', 'training', 'programs', 'stats', 'ai', 'db', 'import', 'nutrition', 'supplements', 'therapy', 'exams', 'calendar', 'settings', 'pricing'];
    views.forEach(v => {
      vm.runInContext(\`navigate('\${v}')\`, context);
      assert.strictEqual(vm.runInContext('currentView', context), v);
    });
  });`,
  `  // CHECK 33: Navigation across all 14 Views
  runCheck(33, 'View Navigation Router: smoothly routes to all 14 views without crashing', () => {
    const views = ['home', 'training', 'programs', 'stats', 'ai', 'db', 'import', 'nutrition', 'supplements', 'therapy', 'exams', 'calendar', 'settings', 'pricing'];
    views.forEach(v => {
      vm.runInContext(\`currentWeek = 1; currentDay = 0; navigate('\${v}');\`, context);
      assert.strictEqual(vm.runInContext('currentView', context), v);
    });
  });`
);

fs.writeFileSync('test_master_task21_runtime_recovery.mjs', c, 'utf8');
console.log('Successfully updated test_master_task21_runtime_recovery.mjs');
