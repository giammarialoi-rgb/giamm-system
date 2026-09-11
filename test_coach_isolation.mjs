import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mergeAssignClientData, sanitizeChatAttachment } from "./coach-practice.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", msg);
  } else {
    console.log("OK  ", msg);
  }
}

function extractFn(src, name) {
  const start = src.indexOf("function " + name);
  if (start < 0) throw new Error("missing " + name);
  const brace = src.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < src.length; i++) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error("unclosed " + name);
}

const ui = fs.readFileSync(path.join(__dirname, "web/coach-practice-ui.js"), "utf8");
const base = fs.readFileSync(path.join(__dirname, "web/index.base.html"), "utf8");
const today = fs.readFileSync(path.join(__dirname, "web/coach-os/today.js"), "utf8");
const practice = fs.readFileSync(path.join(__dirname, "coach-practice.mjs"), "utf8");

const stripProgramSessionPerformance = new Function(
  extractFn(ui, "stripProgramSessionPerformance") + "; return stripProgramSessionPerformance;"
)();

const coachPersonal = {
  w1_d0_e0_s1_load: 120,
  w1_d0_e0_s1_reps: 8,
  w1_d0_e0_s1_done: true,
  w1_d0_e1_s1_load: 180,
  w1_d0_e2_s1_load: 220
};
const personalSnapshot = JSON.stringify(coachPersonal);

const coachProgram = {
  id: "coach_master",
  title: "Scheda coach",
  weeks: [{
    week: 1,
    sessions: [{
      name: "A",
      exercises: [
        { name: "Panca", actualLoad: 120, lastLoad: 120, done: true, sets: [{ actual_load: 120, done: true, reps: 8, rir: 2 }] },
        { name: "Rematore", prescribedLoad: 80, reps: 10, rir: 2 }
      ]
    }]
  }]
};

const clientB = {
  id: "client_b",
  title: "Scheda cliente",
  weeks: [{
    week: 1,
    sessions: [{
      name: "Full",
      exercises: [
        { name: "Goblet squat", reps: 12, rir: 2 },
        { name: "Lat machine", reps: 10, rir: 2 },
        { name: "Leg curl", reps: 12, rir: 2 }
      ]
    }]
  }]
};

const stripped = stripProgramSessionPerformance(JSON.parse(JSON.stringify(coachProgram)));
const panca = stripped.weeks[0].sessions[0].exercises[0];
assert(!panca.actualLoad && !panca.lastLoad && !panca.done && !panca.sets[0].actual_load && !panca.sets[0].done, "strip drops actualLoad/done, keeps structure");
assert(panca.sets[0].reps === 8 && panca.sets[0].rir === 2, "strip keeps prescribed reps/RIR");
assert(stripped.weeks[0].sessions[0].exercises[1].prescribedLoad === 80, "strip keeps prescribedLoad");
assert(JSON.stringify(coachPersonal) === personalSnapshot, "strip does not touch coach personal store.data");

const oldClient = {
  assignmentId: "asg_old",
  activeProgramId: "prog_a",
  activeProgram: {
    id: "prog_a",
    title: "Scheda A",
    weeks: [{ week: 1, sessions: [{ exercises: [{ name: "Panca", sets: [{ reps: 8 }] }] }] }]
  },
  data: { w1_d0_e0_s1_load: 100, w1_d0_e0_s1_done: true },
  logs: [{ week: 1, day: 0, at: "2026-01-01" }],
  customSets: { w1_d0_e0: 4 },
  subs: { w1_d0_e0: "x" }
};

const mergedNew = mergeAssignClientData(oldClient, {
  assignmentId: "asg_new",
  activeProgram: JSON.parse(JSON.stringify(clientB))
}, ["training"]);

assert(mergedNew.assignmentId === "asg_new", "new assignmentId on training assign");
assert(Object.keys(mergedNew.data || {}).length === 0, "new session data is empty");
assert(!mergedNew.data.w1_d0_e0_s1_load && !mergedNew.data.w1_d0_e0_s1_done, "old 100 kg and _done are not current session");
assert(Array.isArray(mergedNew.logs) && mergedNew.logs.length === 0, "new session logs empty");
assert(Array.isArray(mergedNew.programHistory) && mergedNew.programHistory.length === 1, "old session archived additively");
assert(mergedNew.programHistory[0].data.w1_d0_e0_s1_load === 100, "archive keeps old 100 kg");
assert(mergedNew.programHistory[0].data.w1_d0_e0_s1_done === true, "archive keeps old _done");
assert(mergedNew.activeProgram.title === "Scheda cliente", "new program is B");
assert(JSON.stringify(coachPersonal) === personalSnapshot, "assign merge does not mutate coach personal snapshot");

const sameEx = mergeAssignClientData(mergedNew, {
  assignmentId: "asg_repeat",
  activeProgram: {
    id: "prog_b2",
    title: "Scheda B2",
    weeks: [{ week: 1, sessions: [{ exercises: [{ name: "Goblet squat", reps: 10, rir: 1 }] }] }]
  }
}, ["training"]);
assert(sameEx.assignmentId === "asg_repeat" && Object.keys(sameEx.data).length === 0, "reassign same exercise still no actualLoad");
assert(sameEx.programHistory.length === 2, "reassign archives previous program additively");
assert(sameEx.programHistory[0].data.w1_d0_e0_s1_load === 100, "first archive still has the old 100 kg");
assert(!sameEx.data.w1_d0_e0_s1_done, "repeat assign is not completed");

const nutrOnly = mergeAssignClientData(oldClient, {
  nutrition: { kcal: 2200 },
  activeProgram: { nutrition: { kcal: 2200 } }
}, ["nutrition"]);
assert(nutrOnly.data.w1_d0_e0_s1_load === 100, "nutrition-only assign keeps current training session");

assert(!/body:\s*JSON\.stringify\(\{[\s\S]{0,400}store\.data/.test(ui), "assign payload does not send coach store.data");
assert(ui.includes("assignmentId: 'asg_'") && ui.includes("stripProgramSessionPerformance(payload.activeProgram)"), "assign payload has new assignmentId and stripped weeks");
assert(ui.includes("resetSandboxSessionState") && ui.includes("store.data = {}"), "sandbox clears store.data");
assert(ui.includes("window.__cpAssignBackup") && ui.includes("window.__cpCoachViewBackup"), "master backups exist");
assert(base.includes("bak.data || {}") && base.includes("scheduleWorkoutLogsIdbSync") && base.includes("coachAssigning || store.coachViewingClient"), "persist writes backup not sandbox map");
assert(!ui.includes("clearWorkoutLogsForNewProgram") || !/restoreCoachMaster[\s\S]{0,400}clearWorkoutLogsForNewProgram/.test(ui), "restore master does not wipe coach logs");

const pdf = sanitizeChatAttachment({
  kind: "file",
  name: "scheda.pdf",
  mime: "application/octet-stream",
  data: "data:application/octet-stream;base64,JVBERi0x"
});
assert(pdf && pdf.kind === "file" && pdf.mime === "application/pdf", "PDF MIME aligned to application/pdf");
const e2e = sanitizeChatAttachment({
  kind: "file",
  name: "scheda.pdf",
  mime: "application/pdf",
  e2eData: "E2E1:deadbeef"
});
assert(e2e && e2e.e2eData === "E2E1:deadbeef" && !e2e.data, "E2E PDF kept without public data URL");
assert(!sanitizeChatAttachment({ kind: "file", name: "x.pdf", data: "http://public.example/x.pdf" }), "public URL attachments rejected");
assert(ui.includes("openChatAttachment") && ui.includes("openPdfStayInApp") && ui.includes("resolveChatAttachmentPlain"), "chat PDF opens in-app after decrypt");
assert(!/href=\"data:/.test(ui.match(/function renderMessageHtml[\s\S]+?\n\}/)?.[0] || ""), "chat chips are not data-URL downloads");
assert(practice.includes("/api/coach/clients/:id/messages") && practice.includes("requireCoach"), "messages stay behind coach/client ACL");

assert(ui.includes("navigate('coachHub')") && ui.includes("function enterCoachSession"), "top COACH session lands on hub");
assert(ui.includes("else if (typeof isCoachUnlocked === 'function' && isCoachUnlocked()) enterCoachSession()"), "unlocked header COACH opens hub not personal AI");
assert(today.includes("coachHub") && today.includes("coClients") && today.includes("btn btn-primary"), "Today has Clients entry to hub");
assert(base.includes("navigate('ai', event)") && ui.includes("navigate('clientChat', event)"), "bottom athlete COACH stays clientChat; master AI nav kept");

assert(base.includes("isCoachClientSandbox()") && base.includes("advanceToNextOpenTrainingDay"), "sandbox skips auto day advance");
assert(base.includes("Giorno non disponibile") && base.includes("pinTrainingDay(1,0)"), "editor catch stays on program when weeks exist");
assert(base.includes("store.activeProgramId = DATA.id || store.activeProgramId"), "day pin keeps programId");
assert(!/pinTrainingDay[\s\S]{0,200}emptyClientAssignDraft/.test(base) && !/pinTrainingDay[\s\S]{0,200}activateCanonicalProgram/.test(ui), "day change does not recreate draft");

assert(ui.includes("if (domains[view]) return { kind: 'domain', domain: view }"), "training switch stays on domain without viewing flag");
assert(ui.includes("window.__pinnedTraining = null") && ui.includes("primeCoachWorkspaceForClient(id)") && !/stay\.kind === 'domain'[\s\S]{0,180}leaveCoachClientView/.test(ui), "A→B switch is atomic and does not restore master mid-swap");

assert(ui.includes("HO CAPITO") && ui.includes('data-tut="done"') && ui.includes('data-tut="skip"'), "tutorial step 6 has HO CAPITO + SALTA");
assert(ui.includes("if (!isClientTutorialVisible() || force) window.__cpTutStep = 0"), "tutorial does not reset step while open");
assert(ui.includes("bind('[data-tut=\"skip\"]'") && ui.includes("closeClientTutorial"), "SALTA always closes");
assert(base.includes("isClientTutorialVisible()") && base.includes("showBusyOverlay") && base.includes("id === 'cp-tutorial'"), "busy overlay yields to tutorial; back closes it");
assert(ui.includes("#cp-tutorial.cp-overlay{z-index:100010;"), "tutorial sits above busy overlay");
assert(base.includes("drawClientTutorial()") && ui.includes("window.drawClientTutorial"), "render rebinds tutorial controls");

assert(ui.includes("window.__cpExitingCoach") && ui.includes("store.coachSessionActive = false") && ui.includes("Cold start: personal app is default"), "exit coach clears sticky session; cold start personal");
assert(base.includes("sanitized.coachSessionActive = false") && base.includes("sanitized.coachAssigning = null"), "persist never stores sticky coach session locks");

assert(base.includes("function isClientStorageContext") && base.includes("GS_STORE_CLIENT") && base.includes("function emptyClientTrainingState"), "client/personal stores are namespaced");
assert(base.includes("Client/invite context: skip personal IDB/program restore"), "invite boot skips personal IDB hydration");
assert(base.includes("skipped: 'client'") || base.includes('skipped: "client"'), "personal auto-restore returns without mutating client RAM");
assert(base.includes("localStorage.setItem(persistKey") && base.includes("clientStoreKeyForUser"), "persist writes the role-scoped key");
assert(base.includes("remoteLooksLeakedPersonal") && base.includes("!remote.assignedByCoach"), "athlete sync refuses leaked personal 16w unless coach assigned it");
assert(base.includes("GiammariaPersistence.loadActiveProgram") && base.includes("restorePersonalStoreFromNamespace"), "leaving client invite reloads personal program from IDB");
assert(/!DATA\.weeks\.length\) return/.test(base) || base.includes("!DATA.weeks.length) return"), "empty program shells are not written to personal IDB");
assert(!/isClientStorageContext[\s\S]{0,200}localStorage\.removeItem\('GS_STORE'\)/.test(base) || base.includes("isClientStorageContext()) return false"), "factory clean does not wipe personal store from client invite");
assert(ui.includes("emptyClientTrainingState()") && ui.includes("store.__cpClientScoped = true"), "client login empties athlete RAM without touching personal key");
assert(ui.includes("restorePersonalStoreFromNamespace") && base.includes("function restorePersonalStoreFromNamespace"), "leaving invite restores personal namespace");

const isolationHarness = new Function(
  extractFn(base, "emptyClientTrainingSnapshot") + "\n" +
  extractFn(base, "emptyClientTrainingState") + "\n" +
  extractFn(base, "clientStoreKeyForUser") + "\n" +
  "var GS_STORE_CLIENT_PENDING_KEY = 'GS_STORE_CLIENT';\n" +
  "var personalLoads = { w3_d2_e0_s1_load: 45, w3_d2_e1_s1_load: 30 };\n" +
  "var DATA = { title: 'Programma personalizzato 16 settimane', id: 'personal_16w_giammaria', weeks: new Array(16).fill({ sessions: [] }) };\n" +
  "var currentWeek = 3, currentDay = 2;\n" +
  "var store = { data: personalLoads, logs: [{ id: 'w3d2', week: 3 }], activeProgram: DATA, models: [{ id: 'p' }], coachProgramLibrary: [{ id: 'lib' }], customSets: { w3_d2_e0: 4 } };\n" +
  "var personalCopy = JSON.stringify(personalLoads);\n" +
  "emptyClientTrainingState();\n" +
  "return {\n" +
  "  weeks: (DATA && DATA.weeks && DATA.weeks.length) || 0,\n" +
  "  loads: Object.keys(store.data || {}).length,\n" +
  "  logs: (store.logs || []).length,\n" +
  "  models: (store.models || []).length,\n" +
  "  scoped: !!store.__cpClientScoped,\n" +
  "  personalUntouched: JSON.stringify(personalLoads) === personalCopy,\n" +
  "  clientKey: clientStoreKeyForUser({ id: 99, email: 'a@b.c' }),\n" +
  "  pendingKey: clientStoreKeyForUser(null)\n" +
  "};"
)();
assert(isolationHarness.weeks === 0 && isolationHarness.loads === 0 && isolationHarness.logs === 0, "empty client state has no program or loads");
assert(isolationHarness.scoped && isolationHarness.personalUntouched, "emptying client RAM does not mutate the personal loads object");
assert(isolationHarness.clientKey.indexOf("GS_STORE_CLIENT_") === 0 && isolationHarness.pendingKey === "GS_STORE_CLIENT", "client store keys are account-scoped");

assert((ui.match(/home: 1, settings: 1, ai: 1/g) || []).length >= 2, "coach session gate allows AI view from hub and bottom nav");
assert(ui.includes("navigate('ai', event)") && ui.includes("sp.textContent = 'AI'"), "coach chrome wires bottom AI to coach assistant");

const coachEventLabel = new Function(
  extractFn(ui, "parseCoachEventPayload") + "\n" +
  extractFn(ui, "coachEventLabel") + "\n" +
  "return coachEventLabel;"
)();
const nutr = coachEventLabel("ask_coach", "Test Signor", { domain: "nutrition", note: "niente latte, allenamento sera" });
assert(nutr.view === "chat" && /niente latte/.test(nutr.body) && /alimentazione/i.test(nutr.title), "nutrition request notification includes personal note and opens chat");
const supp = coachEventLabel("ask_coach", "Test Signor", { domain: "supplements", note: "creatina dopo il workout" });
assert(supp.view === "chat" && /creatina/.test(supp.body), "supplement request notification includes personal note");

assert(practice.includes("insertMessage(ctx.client.id, \"athlete\"") && practice.includes("Richiesta ${domainLabel}"), "ask-coach persists the athlete message into the chat thread");
assert(practice.includes('view: "chat"') && practice.includes("kind: \"ask_coach\""), "ask-coach push deep-links to the client chat");
const inboxSrc = fs.readFileSync(path.join(__dirname, "server/coach-os/inbox.mjs"), "utf8");
assert(inboxSrc.includes("e.kind = 'ask_coach'") && inboxSrc.includes('view: "coachChat"'), "inbox feed includes ask_coach requests with chat deep-link");
assert(fs.readFileSync(path.join(__dirname, "web/coach-os/inbox.js"), "utf8").includes("item.kind === 'ask_coach'"), "inbox UI opens ask_coach items in chat");

if (failed) {
  console.error("\n" + failed + " isolation checks failed");
  process.exit(1);
}
console.log("\nAll coach isolation checks passed");
