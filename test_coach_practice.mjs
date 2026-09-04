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

const { slugName, sanitizeIntake, intakeMissing, profileFromIntake, clientNeedsIntake, clientRow, bandMid, INTAKE_KEYS, INTAKE_REQUIRED } = CoachPracticeLib;

assert(slugName("Marco Rossi") === "marcorossi", "slug strips spaces");
assert(slugName("Giàmmàrià") === "giammaria", "slug strips accents");
assert(slugName("") === "atleta", "slug fallback");

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
assert(ui.includes("ASSEGNA SCHEDA") && ui.includes("Consenti massima libertà"), "assign + max freedom");
assert(ui.includes("AZZERA CHAT (PER ME)") && ui.includes("NUOVA CHAT"), "chat thread tools");
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
assert(INTAKE_KEYS.length >= INTAKE_REQUIRED.length, "keys cover required");

const base = fs.readFileSync(path.join(__dirname, "web/index.base.html"), "utf8");
["function navigate(", "function render(", "function finalizeWorkout(", "function askAIInner(", "function renderAthleteProfile(", "function renderHome(", "function applyCoachProposal("].forEach((fn) => {
  assert(base.includes(fn), "existing " + fn + " still present");
});
assert(base.includes("Analizza check fisico") || base.includes("analyzeCheckFisicoWithCoach"), "check fisico kept");
assert(base.includes("NURVAN HUB"), "menu hub kept");
assert(base.includes("bootCoachPractice"), "finishInit boots practice");
assert(base.includes("athleteInfoOnly"), "athlete chat flag");
assert(base.includes("massima libertà") || base.includes("allowMaxFreedom"), "athlete edit gate / max freedom");
assert(base.includes("afterProgramActivatedNavigate"), "assign preview after import");

const api = fs.readFileSync(path.join(__dirname, "coach-api.mjs"), "utf8");
assert(api.includes("mountCoachPractice"), "API mounts practice");
assert(api.includes("athleteLocked"), "API locks athlete chat");
assert(api.includes("coachPracticeVersion"), "health version");
assert(api.includes("role"), "JWT has role");

const practice = fs.readFileSync(path.join(__dirname, "coach-practice.mjs"), "utf8");
["/api/coach/unlock/demo", "/api/coach/clients", "/api/client/login", "/api/client/intake", "/c/:token", "intake_mode", "/api/client/ask-coach", "/api/client/change-request", "allow_max_freedom"].forEach((s) => {
  assert(practice.includes(s), "server has " + s);
});

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
  assert(built.includes("function navigate(") && built.includes("analyzeCheckFisicoWithCoach"), "built index keeps previous features");
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
