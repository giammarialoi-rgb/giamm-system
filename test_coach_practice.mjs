import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { CoachPracticeLib } from "./coach-practice.mjs";

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

const { slugName, sanitizeIntake, intakeMissing, profileFromIntake, clientNeedsIntake, clientRow, bandMid, INTAKE_KEYS, INTAKE_REQUIRED, buildWebRtcIceServers } = CoachPracticeLib;

assert(slugName("Marco Rossi") === "marcorossi", "slug strips spaces");
assert(slugName("Giàmmàrià") === "giammaria", "slug strips accents");
assert(slugName("") === "atleta", "slug fallback");

const iceStunOnly = buildWebRtcIceServers({});
assert(Array.isArray(iceStunOnly) && iceStunOnly.length >= 2 && iceStunOnly.every((s) => !s.username), "ICE STUN-only without TURN env");
const iceWithTurn = buildWebRtcIceServers({
  TURN_URLS: "turn:example.com:3478, turns:example.com:5349",
  TURN_USERNAME: "user",
  TURN_CREDENTIAL: "secret"
});
const turnEntry = iceWithTurn.find((s) => s.username === "user");
assert(turnEntry && Array.isArray(turnEntry.urls) && turnEntry.urls.length === 2 && turnEntry.credential === "secret", "ICE includes TURN when env set");
assert(!iceWithTurn.some((s) => String(JSON.stringify(s)).includes("console")), "ICE builder has no console side effects");

assert(bandMid("25-29") === 27, "band mid range");
assert(bandMid("60+") === 60, "band mid plus");
assert(bandMid("175-179 cm") === 177, "band mid height");

const partial = sanitizeIntake({ firstName: "Marco", lastName: "Rossi", extra: "nope", goal: "Ipertrofia" });
assert(partial.firstName === "Marco" && !partial.extra, "sanitize keeps known keys only");
assert(intakeMissing(partial).includes("sex"), "missing required fields detected");

const full = {
  firstName: "Anna", lastName: "Bianchi", sex: "Femmina", ageBand: "25-29",
  heightBand: "165-169 cm", weightBand: "60-64 kg", trainingAge: "1-2 anni",
  level: "Intermedio", goal: "Ipertrofia", sessionsPerWeek: "4",
  sessionMinutes: "60 minuti", equipment: "Palestra completa",
  injuryPrimary: "Nessuno", jobType: "Sedentario", sleepHours: "7-8 ore", stress: "Medio"
};
assert(intakeMissing(full).length === 0, "complete intake has no missing");
const profile = profileFromIntake(full);
assert(profile.name === "Anna Bianchi", "profile name join");
assert(profile.sex === "f", "profile sex map");
assert(profile.age === 27, "profile age mid");
assert(profile.goal === "Ipertrofia", "profile goal");

const newRow = { intake_mode: "new", intake_completed_at: null };
const doneRow = { intake_mode: "new", intake_completed_at: new Date().toISOString() };
const transRow = { intake_mode: "transition", intake_completed_at: new Date().toISOString() };
assert(clientNeedsIntake(newRow) === true, "new client needs intake");
assert(clientNeedsIntake(doneRow) === false, "completed new does not need intake");
assert(clientNeedsIntake(transRow) === false, "transition never needs athlete intake");

const listed = clientRow({
  id: 9, display_name: "Anna Bianchi", username: "annabianchi", status: "active",
  paid: true, billing_cycle: "monthly", next_due_at: null, allow_program_db: false,
  last_workout_at: null, unread_count: 0, invite_token: "tok", created_at: "x",
  intake_mode: "new", intake: full, intake_completed_at: null
});
assert(listed.intakeMode === "new" && listed.intakeDone === false && listed.intake == null, "list row is thin");
const fat = clientRow({
  id: 9, display_name: "Anna Bianchi", username: "annabianchi", status: "active",
  paid: true, invite_token: "tok", intake_mode: "new", intake: full, intake_completed_at: null
}, { includeIntake: true });
assert(fat.needIntake === true && fat.intake.firstName === "Anna", "detail row includes intake");

const ui = fs.readFileSync(path.join(__dirname, "web/coach-practice-ui.js"), "utf8");
["bootCoachPractice", "openAddClientWizard", "setAddClientMode", "submitAddClient", "showClientIntake", "submitClientIntake", "showClientTutorial", "showDemoUnlock", "renderCoachHub", "renderClientChat"].forEach((name) => {
  assert(ui.includes(name), "UI defines " + name);
});
assert(ui.includes("ASSEGNA SCHEDA") && (ui.includes("Consenti massima libertà") || ui.includes("Consenti massima liberta")), "assign + max freedom");
assert(ui.includes("Scadenza automatica") && ui.includes("confirmAssignSandboxSend"), "auto expiry on assign");
assert(ui.includes("openCoachDrawer") && ui.includes("cp-client-switcher") && ui.includes("rotateClientInvite"), "coach drawer + switcher + rotate invite");
assert(ui.includes("attachRemoteStream") && (ui.includes("Permessi camera") || ui.includes("permessi camera")), "videocall status + remote play");
assert(!ui.includes("MASTER · DATI DI") || ui.includes("MENU COACH"), "legacy floating master bar replaced by drawer");
assert(ui.includes("cp-modal-open") && ui.includes("clearChatAttachPreview"), "modal z-index + attach clear");
assert(ui.includes("chatFileIconKind") && ui.includes("cp-file-chip"), "chat file icons");
assert((ui.includes("AZZERA (PER ME)") || ui.includes("AZZERA CHAT (PER ME)")) && ui.includes("NUOVA CHAT") && ui.includes("openChatAttachSheet"), "chat thread tools");
assert(ui.includes("Resta connesso") && ui.includes("RICHIEDI RECUPERO PASSWORD"), "login stay + recovery");
assert(ui.includes("CHIEDI AL COACH") || ui.includes("askRealCoachForDomain"), "real coach ask");
assert(ui.includes("RICHIEDI CHECK") || ui.includes("requestCheckFromClient"), "coach request check");
assert(ui.includes("exitCoachSession") && ui.includes("enterCoachClientView"), "coach session + client view");
assert(ui.includes("GS_CLIENT_SHELL") || ui.includes("clientShell"), "client shell lock");
assert(ui.includes("Notification") && ui.includes("onclick"), "web notification click");
assert(!ui.includes("127.0.0.1:7810"), "debug ingest removed");
assert(ui.includes("Anzianità di allenamento") && ui.includes("Problema fisico principale") && ui.includes("Tempo a sessione"), "UI intake has requested fields");
INTAKE_REQUIRED.forEach((k) => {
  assert(ui.includes("key: '" + k + "'") || ui.includes('key: "' + k + '"'), "UI field " + k + " matches server");
});
assert(INTAKE_KEYS.includes("rmSquat") && INTAKE_KEYS.includes("rmBench") && INTAKE_KEYS.includes("rmDeadlift") && INTAKE_KEYS.includes("rmMilitary"), "intake has estimated 1RM keys");
const withRm = sanitizeIntake({ firstName: "A", lastName: "B", rmSquat: "100 kg", rmBench: "Non so / Mai fatti" });
assert(withRm.rmSquat === "100 kg" && withRm.rmBench === "Non so / Mai fatti", "sanitize keeps 1RM intake");
assert(INTAKE_KEYS.length >= INTAKE_REQUIRED.length, "keys cover required");

const base = fs.readFileSync(path.join(__dirname, "web/index.base.html"), "utf8");
["function navigate(", "function render(", "function finalizeWorkout(", "function askAIInner(", "function renderAthleteProfile(", "function renderHome(", "function applyCoachProposal("].forEach((fn) => {
  assert(base.includes(fn), "existing " + fn + " still present");
});
assert(base.includes("Invia al coach") && base.includes("sendCheckFisicoToCoach"), "check fisico send-to-coach kept");
assert(!base.includes("ANALISI COACH AI") && !base.includes("Analizza check fisico"), "client AI check analysis removed");
assert(base.includes("NURVAN HUB"), "menu hub kept");
assert(base.includes("bootCoachPractice"), "finishInit boots practice");
assert(base.includes("athleteInfoOnly"), "athlete chat flag");
assert(base.includes("massima libertà") || base.includes("allowMaxFreedom"), "athlete edit gate / max freedom");
assert(base.includes("afterProgramActivatedNavigate"), "assign preview after import");
assert(base.includes("openImportDomainPicker") && base.includes("detectProgramDomains"), "import domain picker");
assert(base.includes("isCoachClientSandbox"), "coach sandbox import gate");
assert(base.includes("openGenerateNutritionPlanWizard") && base.includes("balanceMacroPercents") && base.includes("GENERA PIANO"), "nutrition precise plan wizard");
assert(base.includes("comboCount") && base.includes("dayCount") && base.includes("NUTRITION_MEAL_COMBO_VARIANTS"), "nutrition days + combo variants");
assert(base.includes("Inserisci pasti liberi") && base.includes("onGenNutritionFreeToggle") && base.includes("applyFreeMealsToNutritionPlan") && base.includes("gen-nutr-free-slot") && base.includes("freeMealSlot"), "nutrition free meals wizard + meal slot");
assert(base.includes("athleteCanSelfGeneratePlans") && base.includes("CHIEDI LIBERTÀ DI GENERARE") && ui.includes("requestAthleteGenerateFreedom"), "athlete generate gated by max freedom");
assert(base.includes('<base href="/">') && base.includes('src="/nurvan_logo.png"'), "root-absolute logos for /c/ invite links");
assert(base.includes("ALLERGIE E INTOLLERANZE") && base.includes("filterFoodForRestrictions") && base.includes("ensureAllergenIntoleranceCatalog") && base.includes("safe_phrases"), "nutrition allergy filter wizard");
const allergenCatPath = path.join(__dirname, "web/allergen-intolerance-catalog.json");
assert(fs.existsSync(allergenCatPath), "allergen catalog file exists");
const allergenCat = JSON.parse(fs.readFileSync(allergenCatPath, "utf8"));
assert(Array.isArray(allergenCat.items) && allergenCat.items.length >= 20, "allergen catalog has full EU+intolerance set");
assert(allergenCat.items.some((x) => x.id === "arachidi") && allergenCat.items.some((x) => x.id === "lattosio"), "catalog has peanuts + lactose");
assert(allergenCat.items.filter((x) => x.kind === "allergy").length >= 14, "EU Annex II allergies present");
assert(fs.readFileSync(path.join(__dirname, "sync_web_assets.mjs"), "utf8").includes("allergen-intolerance-catalog.json"), "sync copies allergen catalog");
{
  const fold = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[''`´]/g, "");
  const hit = (foodName, item) => {
    const blob = fold(foodName);
    if ((item.safe_phrases || []).some((p) => blob.includes(fold(p)))) return false;
    return (item.keywords || []).some((k) => blob.includes(fold(k)));
  };
  const peanut = allergenCat.items.find((x) => x.id === "arachidi");
  const lactose = allergenCat.items.find((x) => x.id === "lattosio");
  const milk = allergenCat.items.find((x) => x.id === "latte");
  assert(hit("Burro di arachidi", peanut) && !hit("Burro di mandorle", peanut), "peanut filter hits PB not almond butter");
  assert(hit("Yogurt greco 0%", lactose) && !hit("Latte senza lattosio", lactose), "lactose filter + safe phrase");
  assert(hit("Mozzarella light", milk) && !hit("Latte di mandorla", milk), "milk allergy + plant milk safe");
  assert(!hit("Burro di arachidi", milk), "milk allergy does not flag peanut butter");
}
assert(base.includes("setDictateButtonState"), "dictate button state reset");

const api = fs.readFileSync(path.join(__dirname, "coach-api.mjs"), "utf8");
assert(api.includes("mountCoachPractice"), "API mounts practice");
assert(api.includes("athleteLocked"), "API locks athlete chat");
assert(api.includes("coachPracticeVersion"), "health version");
assert(api.includes("role"), "JWT has role");

const practice = fs.readFileSync(path.join(__dirname, "coach-practice.mjs"), "utf8");
["/api/coach/unlock/demo", "/api/coach/clients", "/api/client/login", "/api/client/intake", "/c/:token", "intake_mode", "/api/client/ask-coach", "/api/client/change-request", "allow_max_freedom", "/api/webrtc/ice", "TURN_URLS", "anchorExpiryOnFirstWorkout", "/api/coach/inbox/ack", "rotate-invite", "unlock-approve", "unlock-reject", "pending_unlock"].forEach((s) => {
  assert(practice.includes(s), "server has " + s);
});
assert(practice.includes("e.payload") || practice.includes("e.payload,"), "coach inbox returns payload");
assert(practice.includes("allow_nurvan_ai") && practice.includes("/nurvan-ai"), "server has allow_nurvan_ai");

assert(ui.includes("toggleAssignBannerExpand") && ui.includes("cp-assign-collapsed"), "assign bar collapsible");
assert(ui.includes("location.origin") && ui.includes("/peerjs.min.js"), "PeerJS absolute origin URL");
assert(ui.includes("coachProgramLibrary") && ui.includes("saveCanonicalToCoachLibrary"), "coach personal program library");
assert(ui.includes("__cpSending") && ui.includes("cp-chat-send-progress"), "chat send UX");
assert(base.includes("buildOperationalRulesHtml") && base.includes("deviceTimeZone"), "ops rules + device timezone");
assert(base.includes("CHAT COACH") || ui.includes("clientChat"), "athlete home chat coach");
assert(base.includes("/peerjs.min.js"), "index loads PeerJS from root");
assert(ui.includes("seedAssignSandboxFromClient") && ui.includes("closeClientInviteOverlay"), "assign merge seed + close invite");
assert(ui.includes("input[type=\"checkbox\"]") && practice.includes("Link vecchio") || practice.includes("username = $1 AND status = 'active'"), "checkbox CSS + login username fallback");
assert(base.includes("Quelle non scelte restano") || base.includes("non vengono cancellate"), "import domain picker merge copy");
assert(ui.includes("maybeOfferClientHomeInstall") && ui.includes("__nurvanDeferredInstall") && ui.includes("beforeinstallprompt"), "A2HS invite sheet");
assert(ui.includes("maybeSubscribeWebPush") && ui.includes("pushManager.subscribe") && ui.includes("/api/push/subscribe"), "web push client subscribe");
assert(ui.includes("toggleCoachWsSection") && ui.includes("__cpWsCollapse") && !ui.includes("cp-ws-chat-card"), "coach ws collapse + no inline chat");
assert(ui.includes("buildExerciseInfoPrefill") && ui.includes("applyChatPrefill") && ui.includes("giorno ") && ui.includes("settimana "), "ask exercise info prefill");
assert(ui.includes("coachHeaderBack") && ui.includes("INDIETRO") && ui.includes("menu-hub-button"), "INDIETRO header + hide hub menu");
assert(ui.includes("VISUALIZZA ALLENAMENTO") && ui.includes("stopLiveFollowWorkout") && ui.includes(">STOP<"), "visualizza allenamento + live STOP");
assert(ui.includes("ensureCoachDomainToolbar") && ui.includes("clearCoachClientDomain") && ui.includes("IMPORTA NUOVO") && ui.includes("CANCELLA"), "domain cancel/import toolbar");
assert(ui.includes("friendlyApiError") && ui.includes("RIPROVA"), "hub list friendly retry");
assert(base.includes("Server non disponibile") && base.includes("looksHtml"), "readApiJson HTML sanitize");
assert(ui.includes("openNotificationsCenter") && ui.includes("cp-notify-btn") && ui.includes("NOTIFICHE") && ui.includes("LE TUE NOTIFICHE"), "in-app notifications center athlete+coach");
assert(ui.includes("NOTIFICHE CLIENTE") && ui.includes("buildCoachClientNotifyItems") && ui.includes("openClientSheetNotify"), "coach client-scoped notifies with time");
assert(ui.includes("SEGNA LETTA") && ui.includes("CANCELLA TUTTE") && ui.includes("markNotifyRead") && ui.includes("dismissNotifyItem") && ui.includes("dismissAllNotifyItems"), "notify mark-read/dismiss UI");
assert(ui.includes("Notifica archiviata") && ui.includes("removeNotifyItemLocal"), "notify archive action + optimistic remove");
assert(base.includes("syncAccountData(false)") && base.includes("__cpKeepLocalNutrition"), "nutrition save upload-only keep local");
assert(ui.includes("pushCoachClientEdits(opts)") && (base.includes("domains: ['nutrition']") || base.includes('domains: ["nutrition"]') || ui.includes("indexOf('nutrition')")), "slim coach nutrition push");
assert(practice.includes("windowMs = 300000") || practice.includes("windowMs = 300000") || /isOnlineAt\([^)]*300000/.test(practice) || practice.includes("300000"), "coach online window 5min");
assert(base.includes("overflow-x: auto") && base.includes(".header-actions"), "header actions scroll to avoid MENU clip");
assert(practice.includes("/api/client/inbox/ack"), "client inbox ack");
assert(practice.includes("/api/client/inbox/dismiss") && practice.includes("/api/coach/inbox/dismiss") && practice.includes("dismissed_for"), "inbox dismiss client+coach");
assert(base.includes("hub-tile-notify") && base.includes("openNotificationsCenter"), "athlete hub notify tile");
assert(base.includes("__nutritionDayUserPicked") && base.includes("saveNutritionPlanEdits") && base.includes("__cpNutritionDirty"), "nutrition day pin + dirty SALVA");
assert(base.includes("openGenerateSupplementationWizard") && base.includes("SUPPLEMENT_GOAL_CATALOG") && base.includes("GENERA INTEGRAZIONE"), "supplementation goal wizard");
assert(base.includes("header .logo-container span") && /header \.logo-container span\s*\{\s*display:\s*none/i.test(base), "header logo text hidden");
assert(!/<div class="logo-container"><img[^>]*><span>NURVAN<\/span>/i.test(base), "header logo has no NURVAN span");
assert(ui.includes("setNurvanAppBadge") && ui.includes("clearNurvanAppBadge") && ui.includes("followClientLiveWorkout"), "app badge + live follow");
assert(ui.includes("coachLibrary") && ui.includes("calendar: 1") && ui.includes("__cpCoachLibraryImport"), "coach library + calendar gates");
assert(ui.includes("postVideocallChatNotice") && ui.includes("Anche l’altro deve premere VIDEO"), "videocall chat notice");
assert(base.includes("openExamImportChooser") && base.includes("EXAM_FILE_ONLY") && base.includes("exportExamRequestPdf"), "exam import chooser + PDF request");
assert(base.includes("__nurvanBusySafetyTimer"), "busy overlay safety timeout");
assert(practice.includes("sendWebPush") && practice.includes("VAPID_PUBLIC_KEY") && practice.includes("/api/push/vapid-public-key"), "web push server");
assert(practice.includes("push_subscription") && practice.includes("notifyAthletePush") && practice.includes("notifyCoachPush"), "push columns + notify helpers");
assert(practice.includes("/api/client/workout-live-sync") && practice.includes("coachRequest"), "live sync + exam request persist");
const sw = fs.readFileSync(path.join(__dirname, "web/sw.js"), "utf8");
assert(sw.includes("addEventListener('push'") && sw.includes("notificationclick") && sw.includes("nurvan-shell-v36-coach"), "SW push + cache v36");
assert(base.includes("updateSupplementField") && base.includes("markSupplementsDirty") && base.includes("DOSAGGIO"), "supplement inline edit fields");
assert(ui.includes("benvenuto nel mio servizio coaching") && practice.includes("benvenuto nel mio servizio coaching") && ui.includes("formatInviteShareText"), "client invite welcome message");
assert(ui.includes("intakeAllergiesHtml") && ui.includes("ALIMENTAZIONE · ALLERGIE") && practice.includes("allergies") && practice.includes("profileFromIntake"), "intake optional allergies/intolerances");
assert(practice.includes("/api/coach/clients/:id/unlock-approve") && practice.includes("/api/coach/clients/:id/unlock-reject") && practice.includes("pending_unlock") && ui.includes("approveUnlockRequest") && ui.includes("rejectUnlockRequest"), "coach approve/deny unlock with note");
assert(ui.includes("advanceClientTutorial") && ui.includes('data-tut="next"') && ui.includes("#cp-tutorial.cp-overlay{z-index:10155;}") && ui.includes("__cpA2hsPending"), "client tutorial click + A2HS defer");
assert(ui.includes("emptyDomainShell") && ui.includes("isClearedDomainPayload") && ui.includes("cleared: true"), "domain clear empty shells");
assert(ui.includes("preferFilledTherapy") && ui.includes("__cpTherapyCleared") && ui.includes("__cpTrainingCleared"), "clear therapy/training keep flags");
assert(practice.includes("CLEARABLE") && practice.includes("emptyCleared") && practice.includes("clearedTraining"), "API patch-data accepts domain clears");
assert(ui.includes("__cpClientViewProfile") && base.includes("purgeCoachProfileLeakIfNeeded") && base.includes("profileConflictsWithAccountUser"), "coach profile isolated from client");
assert(base.includes("Sync in pausa (vista cliente)") && base.includes("bak.profile"), "sync/persist shield coach profile");
assert(base.includes("normalizeNutritionMeals") && ui.includes("preferFilledNutrition") && ui.includes("keepLocalNutr"), "nutrition meal normalize + coach live poll keep");
assert(sw.includes("setAppBadge"), "SW badging API");

const build = fs.readFileSync(path.join(__dirname, "build_master25.mjs"), "utf8");
assert(build.includes("coach-practice-ui.js"), "build injects UI");

const webIndex = path.join(__dirname, "web/index.html");
const apkIndex = path.join(__dirname, "app/src/main/assets/index.html");
if (fs.existsSync(webIndex) && fs.existsSync(apkIndex)) {
  const { createHash } = await import("node:crypto");
  const sha = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
  const a = sha(webIndex);
  const b = sha(apkIndex);
  assert(a === b, "web and APK index.html hashes match");
  const built = fs.readFileSync(webIndex, "utf8");
  assert(built.includes("bootCoachPractice") && built.includes("TRANSIZIONE VERSO APP"), "built index includes coach UI");
  assert(built.includes("function navigate(") && built.includes("sendCheckFisicoToCoach"), "built index keeps previous features");
  assert(!built.includes("Analizza check fisico"), "built index has no client AI check CTA");
  const s0 = built.indexOf("<script>");
  const s1 = built.lastIndexOf("</script>");
  if (s0 >= 0 && s1 > s0) {
    const tmp = path.join(__dirname, "_check_index.js");
    fs.writeFileSync(tmp, built.slice(s0 + 8, s1));
    try {
      execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
      assert(true, "built index.html script parses");
    } catch (err) {
      assert(false, "built index.html script parses: " + String(err && err.stderr || err));
    } finally {
      try { fs.unlinkSync(tmp); } catch (_) {}
    }
  }
}

import express from "express";
import { mountCoachPractice } from "./coach-practice.mjs";

const app = express();
app.use(express.json());
mountCoachPractice(app, {
  pool: { query: async () => ({ rows: [] }), connect: async () => ({ query: async () => ({ rows: [] }), release() {} }) },
  initDb: async () => {},
  hashPassword: async (p) => p,
  verifyPassword: async () => false,
  issueAccountToken: () => "tok",
  accountFromBearer: async () => null,
  webDir: path.join(__dirname, "web")
});
const server = await new Promise((resolve) => {
  const s = app.listen(0, "127.0.0.1", () => resolve(s));
});
try {
  const port = server.address().port;
  const invitePage = await fetch("http://127.0.0.1:" + port + "/c/demo-token");
  const html = await invitePage.text();
  assert(invitePage.status === 200, "GET /c/:token serves app");
  assert(html.includes("NURVAN") || html.includes("bootCoachPractice") || html.includes("<!doctype"), "invite URL returns SPA html");
  const locked = await fetch("http://127.0.0.1:" + port + "/api/coach/clients");
  assert(locked.status === 401, "clients API requires login");
  const athleteBlocked = await fetch("http://127.0.0.1:" + port + "/api/client/me");
  assert(athleteBlocked.status === 401, "client me requires athlete JWT");
  const iceRes = await fetch("http://127.0.0.1:" + port + "/api/webrtc/ice");
  const iceJson = await iceRes.json();
  assert(iceRes.status === 200 && iceJson.ok && Array.isArray(iceJson.iceServers) && iceJson.iceServers.length >= 2, "GET /api/webrtc/ice returns STUN");
  assert(iceJson.iceServers.every((s) => !s.credential), "ICE without TURN env has no credentials");
} finally {
  await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
}

assert(api.includes("dbReady"), "health exposes dbReady");

import { parseExamLineRecord, harvestLabExamRecords } from "./universal-import-engine.mjs";
const labLine = parseExamLineRecord("Emoglobina 15,2 g/dL 13,5 - 17,5");
assert(labLine && labLine.parameter && /emoglobina/i.test(labLine.parameter) && String(labLine.value).includes("15"), "lab line without header still parses");
assert(labLine.range || labLine.reference_range, "lab line keeps reference range without parentheses");
const harvested = harvestLabExamRecords("ESAMI\nEmoglobina    15,2    g/dL    13,5 - 17,5\nGlicemia 95 mg/dL (70-100)\nPanca piana 4x10 RIR 2");
assert(harvested.length >= 2, "harvest finds lab rows without ESAMI section switch");
assert(harvested.every((r) => !/panca/i.test(r.parameter || "")), "harvest skips training lines");

if (failed) {
  console.error("\n" + failed + " checks failed");
  process.exit(1);
}
console.log("\nAll coach-practice control checks passed.");
