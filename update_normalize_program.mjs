import fs from 'fs';

let webHtml = fs.readFileSync('web/index.html', 'utf8');

// Normalize line endings for replacement
const isCRLF = webHtml.includes('\r\n');

const searchRegex = /\/\/ Build canonical sets\[\] array[\s\S]*?program\.source = 'Gemini Coach API';\s*adaptProgramDuration\(program\);\s*return program;/;

const replacement = `// Build canonical sets[] array
        let canonicalSets = [];
        if (Array.isArray(exercise.sets_data) && exercise.sets_data.length) {
          canonicalSets = exercise.sets_data.map((s, sIdx) => ({
            id: s.id || \`\${exId}_s\${sIdx + 1}\`,
            order: s.order || sIdx + 1,
            set_number: s.set_number || sIdx + 1,
            set_type: s.set_type || 'working',
            target_reps: s.target_reps || s.reps_target || repsTarget,
            target_load: s.target_load !== undefined ? s.target_load : plannedLoad,
            target_rir: s.target_rir !== undefined ? s.target_rir : rirTarget,
            target_rpe: s.target_rpe !== undefined ? s.target_rpe : rpeTarget,
            percentage_1rm: s.percentage_1rm != null ? Number(s.percentage_1rm) : null,
            rest_seconds: s.rest_seconds || parseInt(rest, 10) || 90,
            notes: s.notes || null,
            reps: s.reps !== undefined && s.reps !== repsTarget ? s.reps : (s.actual_reps || null),
            load: s.load !== undefined && s.load !== plannedLoad ? s.load : (s.actual_load || null),
            rpe: s.rpe !== undefined && s.rpe !== rpeTarget ? s.rpe : (s.actual_rpe || null),
            rir: s.rir !== undefined && s.rir !== rirTarget ? s.rir : (s.actual_rir || null),
            tempo: s.tempo || tempo,
            done: Boolean(s.done)
          }));
        } else if (Array.isArray(exercise.sets) && exercise.sets.length && typeof exercise.sets[0] === 'object') {
          canonicalSets = exercise.sets.map((s, sIdx) => ({
            id: s.id || \`\${exId}_s\${sIdx + 1}\`,
            order: s.order || sIdx + 1,
            set_number: s.set_number || sIdx + 1,
            set_type: s.set_type || 'working',
            target_reps: s.target_reps || s.reps_target || repsTarget,
            target_load: s.target_load !== undefined ? s.target_load : plannedLoad,
            target_rir: s.target_rir !== undefined ? s.target_rir : rirTarget,
            target_rpe: s.target_rpe !== undefined ? s.target_rpe : rpeTarget,
            percentage_1rm: s.percentage_1rm != null ? Number(s.percentage_1rm) : null,
            rest_seconds: s.rest_seconds || parseInt(rest, 10) || 90,
            notes: s.notes || null,
            reps: s.actual_reps || null,
            load: s.actual_load || null,
            rpe: s.actual_rpe || null,
            rir: s.actual_rir || null,
            tempo: s.tempo || tempo,
            done: Boolean(s.done)
          }));
        } else {
          canonicalSets = Array.from({ length: setsCount }, (_, sIdx) => ({
            id: \`\${exId}_s\${sIdx + 1}\`,
            order: sIdx + 1,
            set_number: sIdx + 1,
            set_type: 'working',
            target_reps: repsTarget,
            target_load: plannedLoad,
            target_rir: rirTarget,
            target_rpe: rpeTarget,
            percentage_1rm: null,
            rest_seconds: parseInt(rest, 10) || 90,
            notes: null,
            reps: null,
            load: null,
            rpe: null,
            rir: null,
            tempo: tempo,
            done: false
          }));
        }

        return {
          id: exId,
          name: exName,
          exercise: exName,
          order: exercise.order || ei + 1,
          movement: exercise.movement || exercise.muscle_group || 'ALTRO',
          muscle_groups: Array.isArray(exercise.muscle_groups) ? exercise.muscle_groups : (exercise.muscle_group ? [exercise.muscle_group] : []),
          muscleGroups: Array.isArray(exercise.muscle_groups) ? exercise.muscle_groups : (exercise.muscle_group ? [exercise.muscle_group] : []),
          muscle_group: exercise.muscle_group || null,
          superset_id: exercise.superset_id || null,
          notes: exercise.notes || '',
          progression_rule: exercise.progression_rule || '',
          is_bonus: isBonusEx,
          isBonus: isBonusEx,
          sets: canonicalSets,
          reps_target: exercise.reps_target || repsTarget,
          repsTarget: exercise.reps_target || repsTarget,
          rpe_target: exercise.rpe_target !== undefined ? exercise.rpe_target : rpeTarget,
          rpeTarget: exercise.rpe_target !== undefined ? exercise.rpe_target : rpeTarget,
          rir_target: exercise.rir_target !== undefined ? exercise.rir_target : rirTarget,
          rirTarget: exercise.rir_target !== undefined ? exercise.rir_target : rirTarget,
          rest: rest,
          rest_seconds: exercise.rest_seconds != null ? exercise.rest_seconds : (parseInt(rest, 10) || null),
          plannedLoad: plannedLoad,
          tempo: tempo,
          setRows: Array.from({ length: Math.max(0, canonicalSets.length - 1) }, (_, i) => i + 2)
        };
      });

      totalImportExercises += exercises.length;
      const sTitle = session.title || session.name || \`SESSIONE \${si + 1}\`;
      console.info(\`DOC_SESSION: week=\${wNum} session=\${si + 1} title=\${sTitle} is_bonus=\${isBonusSession} exerciseCount=\${exercises.length}\`);

      return {
        id: session.id || \`w\${wNum}_s\${si + 1}\`,
        day: session.day || \`Giorno \${si + 1}\`,
        title: sTitle,
        is_bonus: isBonusSession,
        isBonus: isBonusSession,
        exercises: exercises,
        rows: exercises
      };
    });

    return {
      id: week.id || \`w\${wNum}\`,
      weekNumber: wNum,
      week: wNum,
      title: week.title || \`SETTIMANA \${String(wNum).padStart(2, '0')}\`,
      label: week.label || '',
      sessions: normalizedSessions,
      days: normalizedSessions
    };
  });

  console.info(\`DOC_IMPORT_SESSIONS=\${totalImportSessions}\`);
  console.info(\`DOC_IMPORT_EXERCISES=\${totalImportExercises}\`);

  if(!program.weeks.some(week => (week.sessions || week.days || []).some(session => (session.exercises || session.rows || []).length))) {
    throw new Error('La programmazione non contiene esercizi importabili.');
  }
  program.exerciseDb = (DATA && DATA.exerciseDb) || candidate.exerciseDb || {};
  program.nutrition = candidate.nutrition || { present: false, days: [] };
  program.supplementation = candidate.supplementation || { present: false, items: [] };
  program.therapy = candidate.therapy || { present: false, medications: [] };
  program.exams = candidate.exams || { present: false, records: [] };
  program.integrityStats = candidate.integrityStats || null;
  program.source = 'Gemini Coach API';
  adaptProgramDuration(program);
  return program;`;

if (!searchRegex.test(webHtml)) {
  console.error("searchRegex did not match webHtml!");
  process.exit(1);
}

webHtml = webHtml.replace(searchRegex, replacement);

fs.writeFileSync('web/index.html', webHtml, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', webHtml, 'utf8');
console.log("Successfully updated normalizeProgram regex in web/index.html and app/src/main/assets/index.html!");
