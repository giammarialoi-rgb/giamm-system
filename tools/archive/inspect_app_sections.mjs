import { execSync } from 'child_process';
import fs from 'fs';

function analyzeSections(html, label) {
  console.log(`\n================= ${label} =================`);
  
  // Navigation tabs in bottom bar or header
  const navItems = [];
  const navRe = /<button[^>]*class=["'][^"']*nav-item[^"']*["'][^>]*onclick=["']([^"']+)["'][^>]*>([\s\S]*?)<\/button>/gi;
  let m;
  while ((m = navRe.exec(html)) !== null) {
    navItems.push({ onclick: m[1].trim(), text: m[2].replace(/<[^>]+>/g, '').trim() });
  }
  console.log('Nav items in bottom bar:', navItems);

  // All Views rendered in navigate() switch/if
  const navSwitchMatches = [...html.matchAll(/case\s+['"]([a-zA-Z0-9_-]+)['"]\s*:/g)].map(x => x[1]);
  console.log('Navigate cases:', [...new Set(navSwitchMatches)]);

  // Modals present
  const modalMatches = [...html.matchAll(/id=["']([a-zA-Z0-9_-]*modal[a-zA-Z0-9_-]*)["']/gi)].map(x => x[1]);
  console.log('Modals found:', [...new Set(modalMatches)]);

  // Key Feature Modules
  console.log('Feature presence:');
  console.log('  - Auth / Account UI (loginModal/userProfile):', /login-modal|auth-modal|user-avatar|account-btn|loginModal/i.test(html));
  console.log('  - OAuth (Google/Apple):', /handleGoogleCredentialResponse|signInWithApple/i.test(html));
  console.log('  - Voice Coach AI:', /startVoiceRecognition|webkitSpeechRecognition|voiceBtn/i.test(html));
  console.log('  - Timer (Rest timer):', /startTimer|timer-overlay|restTimer/i.test(html));
  console.log('  - Training Logger (logSet/completeSet/updateSet):', /logSet|completeSet|updateSet|recordSet/i.test(html));
  console.log('  - RIR/RPE live conversion:', /calculateRIR|calculateRPE|updateRirRpe|rpe.*rir/i.test(html));
  console.log('  - Exercise Replacement / Swapping:', /showReplacementModal|replaceExercise|renderReplacementOptions/i.test(html));
  console.log('  - Volume / Tonnage Stats:', /calculateVolume|renderStats|volume.*tonnage/i.test(html));
  console.log('  - Performance Charts:', /renderSimpleChart|drawChart|canvas|chart/i.test(html));
  console.log('  - Program Management (Save/Switch/Active):', /saveProgram|switchProgram|activateProgram|renderProgramPreview/i.test(html));
  console.log('  - Coach AI Chat:', /sendCoachMessage|askCoach|renderAI/i.test(html));
  console.log('  - Import Engine (Universal / XLSX / Review):', /parseStructuredWorkbook|renderImport|confirmImportAndActivate/i.test(html));
  console.log('  - IndexedDB Persistence Core 2.0:', /GiammariaPersistence/i.test(html));
}

const headHtml = execSync('git show HEAD:web/index.html', { maxBuffer: 20 * 1024 * 1024 }).toString('utf8');
const commit695Html = execSync('git show 6952313:web/index.html', { maxBuffer: 20 * 1024 * 1024 }).toString('utf8');
const currHtml = fs.readFileSync('web/index.html', 'utf8');

analyzeSections(commit695Html, 'COMMIT 6952313 (OAuth / Early Full)');
analyzeSections(headHtml, 'COMMIT HEAD / 7602398 / 64df46e (Pre-Task 14)');
analyzeSections(currHtml, 'CURRENT WORKING TREE (Post-Task 18)');
