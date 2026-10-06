// A client whose training was cleared once (CANCELLA) keeps marks on the record (clearedTraining, clearedAt).
// A program assigned afterwards must not inherit them: the next save from the client view sent them back and the
// server emptied the weeks again - the coach saw the title and "Nessun programma caricato".
import { mergeAssignClientData } from './coach-practice.mjs';

let failed = 0;
const ok = (m, v) => { if (v) console.log('OK   ' + m); else { failed++; console.log('FAIL ' + m); } };

const cleared = { activeProgram: { title: '', weeks: [], clearedTraining: true, clearedAt: '2026-10-04T10:00:00Z' } };
const prog = { id: 'p1', title: 'Hyrox', weeks: [{ week: 1, sessions: [{ name: 'G1', exercises: [] }] }] };
const out = mergeAssignClientData(cleared, { assignmentId: 'a1', activeProgram: prog }, ['training']);
ok('1a. the assigned program keeps its weeks and title', out.activeProgram.weeks.length === 1 && out.activeProgram.title === 'Hyrox');
ok('1b. the old cleared marks are not carried over', !('clearedTraining' in out.activeProgram) && !('clearedAt' in out.activeProgram));

const withMark = mergeAssignClientData({}, { assignmentId: 'a2', activeProgram: Object.assign({}, prog, { clearedTraining: true }) }, ['training']);
ok('1c. a mark that came with the program itself is left as sent', withMark.activeProgram.clearedTraining === true);

const nutritionOnly = mergeAssignClientData(cleared, { activeProgram: { nutrition: { present: true, days: [] } }, nutrition: { present: true, days: [] } }, ['nutrition']);
ok('1d. assigning something else does not touch the training marks', nutritionOnly.activeProgram.clearedTraining === true);

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nScheda assegnata dopo una cancellazione: nessun segno vecchio.');
