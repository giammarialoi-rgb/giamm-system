// Fewer useless notices to the coach (a coach with 200 clients): no "wants to change the program" before there is a
// program or while the questionnaire is open, one pending request = one notice, no push for a warm-up, pushes with a tag.
import fs from 'node:fs';
let failed = 0;
const ok = (m, v) => { if (v) console.log('OK   ' + m); else { failed++; console.log('FAIL ' + m); } };
const ui = fs.readFileSync('web/coach-practice-ui.js', 'utf8');
const api = fs.readFileSync('coach-practice.mjs', 'utf8');
const sw = fs.readFileSync('web/sw.js', 'utf8');
const gate = ui.slice(ui.indexOf('function gateAthleteProgramPersist'));
ok('1a. no change request without a program with exercises to change', /sliceHasExercises\(store\.clientApprovedProgram\)/.test(gate));
ok('1b. none while the questionnaire is still to do', /clientProfile\.needIntake/.test(gate.slice(0, 1200)));
ok('2a. a request still pending is refreshed, not announced again', /const waiting = !!ctx\.client\.pending_change/.test(api) && /unread_count \+ \$3/.test(api));
ok('2b. edits of a client with full freedom within ten minutes are one notice', /INTERVAL '10 minutes'/.test(api));
ok('3a. a warm-up does not push to the coach', !/"Warm-up completato"/.test(api));
ok('3b. coach pushes carry a tag and the service worker uses it', /tag: "coach:"/.test(api) && /options\.tag = String\(payload\.tag\)/.test(sw));
console.log(failed ? '\n' + failed + ' controlli falliti.' : '\nNotifiche al coach: meno rumore, tutto in regola.');
process.exit(failed ? 1 : 0);
