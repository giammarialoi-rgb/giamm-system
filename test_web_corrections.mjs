import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(root, "web/index.base.html"), "utf8");
const practice = fs.readFileSync(path.join(root, "web/coach-practice-ui.js"), "utf8");
const api = fs.readFileSync(path.join(root, "coach-api.mjs"), "utf8");
const catalog = fs.readFileSync(path.join(root, "web/exercise-catalog-extra.js"), "utf8");

assert.ok(html.includes('name="pdf-load-mode"'), "workout PDF requires explicit load mode");
assert.ok(html.includes("if (!opts.loadMode)"), "export blocked until load choice");
assert.ok(!html.includes('id="pdf-inc-logged"'), "old auto-checked load boxes are gone");
assert.ok(html.includes("startFreshPage();") && html.includes("headerDay ="), "each training day starts a page and repeats title");

assert.ok(api.includes("function slimCoachContext"), "server slims chat context");
assert.ok(api.includes("Gemini chat first attempt failed"), "server retries Gemini");
assert.ok(api.includes('status(503)') && api.includes("AI_UNAVAILABLE"), "missing key is 503 not 500");

assert.ok(html.includes("function restoreClientShellSync"), "client shell restored before first render");
assert.ok(html.includes("ALIGN_MS") && html.includes("align start"), "workout align has a timeout and does not block forever");
assert.ok(html.includes("practice timeout") && !html.includes("locked && typeof bootCoachPractice"), "first paint does not wait for bootCoachPractice");
assert.ok(html.includes("skip leftover client-shell rewrite"), "personal sessions are not hijacked by leftover client shell");
assert.ok(html.includes("delete payload.activeProgram.exerciseDb"), "account sync does not upload the exercise catalog");
assert.ok(html.includes("isClientShellLocked") && html.includes("athleteHomeHtml"), "empty client home is not the main create-program screen");
assert.ok(html.includes("nurvan_client_ctx") && html.includes("nurvan_app_mode") && html.includes("__NURVAN_CLIENT_BOOT"), "head boot persists client token via cookie and boot flag");
assert.ok(html.includes("display-mode: standalone") && html.includes("location.replace('/c/'"), "standalone Home launch at / reopens /c/token");
assert.ok(html.includes("function persistNurvanAppMode"), "master/client app mode is persisted");
assert.ok(practice.includes("GS_CLIENT_SHELL") && practice.includes("applyInviteManifestStartUrl(token)"), "invite token persisted for Home reopen");
assert.ok(practice.includes("/c/' + encodeURIComponent(token) + '/manifest.webmanifest'") || practice.includes("/manifest.webmanifest"), "invite manifest is a durable /c/token URL");
assert.ok(practice.includes("persistClientAppContext"), "practice UI writes client cookies");
assert.ok(html.includes("history.replaceState") && html.includes("/c/"), "cold start at / is rewritten to /c/token");
const apiPractice = fs.readFileSync(path.join(root, "coach-practice.mjs"), "utf8");
assert.ok(apiPractice.includes("/c/:token/manifest.webmanifest") && apiPractice.includes("start_url"), "server serves per-token PWA manifest");
assert.ok(apiPractice.includes("function injectClientPwaHtml") && apiPractice.includes("__NURVAN_CLIENT_BOOT"), "server injects per-token manifest into /c/:token HTML");
assert.ok(apiPractice.includes('res.redirect(302, "/c/"') || apiPractice.includes("res.redirect(302, \"/c/\""), "GET / with client cookies redirects to /c/token");
const sw = fs.readFileSync(path.join(root, "web/sw.js"), "utf8");
assert.ok(!sw.includes("'./manifest.webmanifest'") && sw.includes("analytics4"), "SW does not precache the root manifest");
assert.ok(sw.includes("isClientDoc") && sw.includes(".webmanifest"), "SW keeps /c/* and manifests on the network");
assert.ok(sw.includes("training-knowledge.js"), "SW precaches the training encyclopedia");

assert.ok(html.includes('name="cf-pdf-range"') && html.includes('value="weeks"') && html.includes('value="dates"'), "check PDF has week and date range");
assert.ok(html.includes("rangeMode === 'weeks'") && html.includes("rangeMode === 'dates'"), "check logs filtered by custom range");
assert.ok(html.includes("SETTIMANA ") && html.includes("GIORNO ") && html.includes("fine seduta"), "check PDF marks week/day/session end");

assert.ok(html.includes("VOLUME SESSIONE") && html.includes("non peso corporeo"), "tonnage is not labeled as body weight");
assert.ok(html.includes("function recordedBodyWeightForWeek"), "body weight chart uses recorded values only");
assert.ok(html.includes("Volume ") && html.includes("__statsMuscleVolumeByWeek"), "muscle drill shows that muscle volume");
assert.ok(/height:\s*280px/.test(html) && html.includes("formatChartAxis"), "charts use compact height and axis labels that do not clip");

assert.ok(html.includes("function editSupplementItem") && html.includes("onclick=\"editSupplementItem("), "supplements have compact Edit");
assert.ok(!/updateSupplementField\(\$\{idx\},'name'/.test(html), "supplement list is not always-open name inputs");

assert.ok(catalog.includes("Barbell Bench Press") && catalog.includes("Panca piana"), "catalog has IT+EN bench");
assert.ok(html.includes("exerciseNameMatchesQuery") && html.includes("WEB_EXERCISE_CATALOG"), "replace search uses IT/EN aliases");
const names = catalog.match(/name: "/g) || [];
assert.ok(names.length >= 80, "extra catalog is substantially larger than the old 66-name dict");

const slimStart = api.indexOf("function slimCoachContext");
const slimEnd = api.indexOf("app.post([\"/api/chat\"");
assert.ok(slimStart >= 0 && slimEnd > slimStart);
vm.createContext({ console });
vm.runInContext(api.slice(slimStart, slimEnd), vm.createContext({}));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(api.slice(slimStart, slimEnd) + "\nthis.slimCoachContext = slimCoachContext;", ctx);
const slim = ctx.slimCoachContext({
  profile: { name: "G", secret: "no", weight: 80 },
  programSummary: { title: "P", weeks: new Array(8).fill({ week: 1, sessions: [{ name: "A", exercises: new Array(20).fill("x") }] }) },
  exams: { items: [1, 2, 3, 4] }
});
assert.equal(slim.profile.secret, undefined);
assert.ok(slim.programSummary.weeks.length <= 4);
assert.ok(slim.programSummary.weeks[0].sessions[0].exercises.length <= 14);
assert.equal(slim.exams.count, 4);

const restoreStart = html.indexOf("function restoreClientShellSync");
const restoreEnd = html.indexOf("var store = loadStore()");
assert.ok(restoreStart >= 0 && restoreEnd > restoreStart);

assert.ok(html.includes("function progressionAddKg") && html.includes("isLightProgressionLoad"), "load jumps use 2.5 kg or 1 kg on light lifts");
assert.ok(!/addKg = 1\.25/.test(html), "progression no longer uses 1.25 kg jumps");
assert.ok(html.includes("function openExerciseInfoSheet") && html.includes("renderTrainingKnowledge"), "CHIEDI INFO opens a local explanation sheet");
assert.ok(html.includes("navigate('knowledge')") && html.includes("Info training"), "hub has the training encyclopedia page");
assert.ok(practice.includes("openExerciseInfoSheet"), "workout CHIEDI INFO uses the explanation sheet");
const knowledge = fs.readFileSync(path.join(root, "web/training-knowledge.js"), "utf8");
assert.ok(knowledge.includes("RIR") && knowledge.includes("RPE") && knowledge.includes("Drop set"), "encyclopedia covers RIR/RPE and intensity techniques");
assert.ok(knowledge.includes("Full body") && knowledge.includes("Push Pull Legs") && knowledge.includes("+2,5 kg"), "encyclopedia covers splits and 2.5 kg progression");
assert.ok(knowledge.includes("Panca piana") && knowledge.includes("PETTO"), "encyclopedia has exercises by muscle");
assert.ok(knowledge.includes("colonna in posizione neutra") && knowledge.includes("Adduci le scapole"), "encyclopedia uses technical Italian cues");
assert.ok(!knowledge.includes("Neutro il rachide") && !knowledge.includes("Schiena tonda sotto carico"), "encyclopedia avoids literary calques");
assert.ok(knowledge.includes("function setExtraExercises") && knowledge.includes("EXTRA_EXERCISES"), "encyclopedia accepts custom extras");

assert.ok(html.includes("function maybePushFieldUndo") && html.includes('id="workout-undo-btn"'), "workout undo button exists");
assert.ok(html.includes("maybePushFieldUndo(/_load$/") && html.includes("function updateData"), "load edits snapshot undo");
assert.ok(html.includes("function refreshWorkoutUndoButton"), "undo button refreshes without full render");
assert.ok(html.includes("function clearKnowledgeSearch") && html.includes('id="knowledge-search-clear"'), "encyclopedia search has clear X");
assert.ok(html.includes("function toggleKnowledgeMuscle") && html.includes("__knowledgeCollapsed"), "muscle groups can collapse");
assert.ok(html.includes("function openAddEncyclopediaExercise") && html.includes("function saveEncyclopediaExercise"), "encyclopedia can add exercises");
assert.ok(html.includes("function researchExerciseKnowledge") && html.includes("knowledgeLookup"), "new exercises can be researched");
assert.ok(html.includes("function persistKnowledgeExtra") && html.includes("NURVAN_KNOWLEDGE_EXTRA_"), "custom encyclopedia entries persist separately from workouts");
assert.ok(html.includes("function queueExerciseKnowledgeAdapt"), "new session exercises adapt encyclopedia in background");
assert.ok(html.includes("function toggleReplaceManual"), "replace-manual toggle is a real function");
assert.ok(html.includes("function encyclopedizeProgramExercises") && html.includes("function toggleKnowledgeEditMode"), "user exercises get encyclopedized and cards can be edited");
assert.ok(html.includes("hiddenProgramIds") && html.includes("L’allenamento attivo resta"), "deleting the active program from the list keeps it running");
assert.ok(html.includes("function deleteSavedProgramFromList") && html.includes("data-id="), "saved-program X uses data attributes, not broken stringify");
assert.ok(html.includes("function deleteBodyCheck") && html.includes("function toggleStatsHistory"), "checks can be deleted and session history closed");
assert.ok(html.includes("Includi settimane non concluse") && html.includes("setIncludeIncompleteWeeks"), "incomplete-week checkbox");
assert.ok(html.includes("stats-advanced-exercise") && html.includes("stats-advanced-muscle"), "advanced exercise and muscle selectors");
assert.ok(html.includes("function fillStatsAdvancedPanel"), "advanced panel updates in place");
assert.ok(html.includes("STATS_MARKET_NOTES") && html.includes("Peso corporeo:"), "market notes change with the selected metric");
assert.ok(!/function applyStatsMarketNote[\s\S]{0,500}effectiveVolumeNote/.test(html), "market note never falls back to effective volume");
assert.ok(html.includes("<th>MRV</th>") && !html.includes("<th>e1RM</th>"), "weekly table uses MRV not aggregated e1RM");
assert.ok(html.includes("toggleExerciseIntel") && html.includes("Calcola peso consigliato"), "live analytics toggle and suggested load");
assert.ok(html.includes("sessionSummary") && html.includes("RIEPILOGO SEDUTA"), "session summary after finalize");
assert.ok(html.includes("Training Market") && html.includes("Gruppo muscolare"), "italian stats chrome");
assert.ok(!/function setStatsAdvancedMode[\s\S]{0,400}render\(\);/.test(html), "setStatsAdvancedMode does not call render()");
assert.ok(!/function setStatsAdvancedMode[\s\S]{0,400}renderStatsData\(/.test(html), "setStatsAdvancedMode does not rebuild the stats page");
assert.ok(html.includes("intelTargets") && !html.includes("programmedWeight"), "recommendation layer does not write programmedWeight");
assert.ok(html.includes("function statsWeeksCount") && html.includes("TrainingAnalyticsEngine"), "stats tables use the analytics engine");
assert.ok(html.includes("function setStatsZoom") && html.includes("stats-zoom-slider") && html.includes("function setStatsAxis"), "stats zoom is a training-week slider");
assert.ok(html.includes("function pinTrainingDay") && html.includes("shouldStayOnPinnedTraining"), "finalized days stay open instead of auto-advancing");
assert.ok(html.includes("function applySelectedSuperset") && html.includes("COLLEGA IN SUPERSET"), "training can pair supersets");
assert.ok(practice.includes("stayPinned") && practice.includes("__pinnedTraining"), "client-shell apply does not bounce a pinned finalized day");
assert.ok(practice.includes("function openPersonalCoachAi") && practice.includes("navigate('ai')"), "personal COACH opens Coach AI");
assert.ok(practice.includes("if (athlete) ai.style.display = 'none'"), "clients do not get Coach AI");
assert.ok(html.includes("function startEditFinalizedWorkout") && html.includes("function saveFinalizedWorkoutEdits"), "finalized workouts can be reopened and saved in place");
assert.ok(html.includes("MODIFICA ALLENAMENTO FINALIZZATO") && html.includes("updateSessionBodyWeight"), "finalized banner can edit BW without wiping the log");
assert.ok(html.includes("La seduta resta finalizzata"), "editing a finalized session does not un-finalize it");

const kctx = { console };
kctx.window = kctx;
kctx.self = kctx;
vm.createContext(kctx);
vm.runInContext(knowledge, kctx);
kctx.NURVAN_TRAINING_KNOWLEDGE.setExtraExercises([{ name: "Foo row", muscle: "DORSALI", how: "Tira le scapole", mistakes: "strap", cue: "gomiti" }]);
const extraHit = kctx.lookupTrainingKnowledge("Foo row");
assert.equal(extraHit.matched, true);
assert.ok(String(extraHit.body).includes("Tira le scapole"));
assert.equal(extraHit.custom, true);

console.log("OK   web corrections: pdf choice/pages, coach slim, client shell, check range, stats, supp, catalog");
