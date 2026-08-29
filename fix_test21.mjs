import fs from 'fs';

let c = fs.readFileSync('test_master_task21_runtime_recovery.mjs', 'utf8');

c = c.replace(
  `    vm.runInContext(\`
      programImportState.canonicalProgram = buildCanonicalProgram(goldenParsed);
      programImportState.currentImportId = 'test_imp_21';
      programImportState.activeReviewTab = 'training';
      navigate('import');
    \`, { ...context, goldenParsed });`,
  `    mockWindow.goldenParsed = goldenParsed;
    vm.runInContext(\`
      programImportState.canonicalProgram = buildCanonicalProgram(goldenParsed);
      programImportState.currentImportId = 'test_imp_21';
      programImportState.activeReviewTab = 'training';
      navigate('import');
    \`, context);`
);

fs.writeFileSync('test_master_task21_runtime_recovery.mjs', c, 'utf8');
console.log('Successfully patched Check 9');
