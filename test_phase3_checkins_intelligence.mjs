import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDeterministicIntelligence,
  INTELLIGENCE_FORMULA_VERSION
} from "./server/coach-os/intelligence.mjs";
import { CheckInTestHelpers } from "./server/coach-os/checkins.mjs";
import {
  createMediaAccessToken,
  MediaSecurityContract,
  parsePrivateMediaInput,
  verifyMediaAccessToken
} from "./server/media/private-store.mjs";
import { resolveCoachOsFeatureFlags } from "./feature-flags.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));

function ok(value, message) {
  assert.ok(value, message);
  console.log("OK  ", message);
}

const now = Date.now();
const logs = [
  { id: "old-1", at: new Date(now - 40 * 86400000).toISOString(), tonnage: 10000 },
  { id: "old-2", at: new Date(now - 35 * 86400000).toISOString(), tonnage: 10000 },
  { id: "cur-1", at: new Date(now - 12 * 86400000).toISOString(), tonnage: 10050 },
  { id: "cur-2", at: new Date(now - 8 * 86400000).toISOString(), tonnage: 9950 }
];
const client = {
  id: 7,
  last_workout_at: logs[logs.length - 1].at,
  program_expires_at: new Date(now + 2 * 86400000).toISOString(),
  next_check_at: new Date(now - 86400000).toISOString(),
  intake: { sleepHours: "Meno di 6 ore", stress: "Alto" }
};
const accountData = {
  activeProgram: {
    id: "program-1",
    weeks: [{ sessions: [{}, {}, {}, {}] }]
  },
  logs,
  bodyChecks: [
    { id: "b1", at: new Date(now - 42 * 86400000).toISOString(), weight: 80 },
    { id: "b2", at: new Date(now - 86400000).toISOString(), weight: 76.5 }
  ]
};

const intelligence = buildDeterministicIntelligence(client, accountData, now);
ok(intelligence.formulaVersion === INTELLIGENCE_FORMULA_VERSION, "intelligence exposes formula version");
ok(intelligence.aiInterpretation === null, "Phase 3 does not invent AI interpretation");
ok(intelligence.provenance.deterministic === true && intelligence.provenance.clinicalDiagnosis === false, "intelligence declares deterministic non-clinical provenance");
for (const signal of ["inactivity", "adherence_drop", "weight_change", "program_expiration", "missing_check_in"]) {
  ok(intelligence.signals.some((row) => row.id === signal), `deterministic signal ${signal}`);
}
ok(intelligence.derivedMetrics.adherence.value < 70, "adherence is derived from planned vs completed workouts");
ok(intelligence.derivedMetrics.recovery.score === 35, "recovery rule combines sleep and stress without diagnosis");
ok(intelligence.signals.every((row) => Array.isArray(row.evidence) && row.evidence.length), "every signal links underlying evidence");

ok(CheckInTestHelpers.clampPercent(140) === 100, "check-in adherence clamps high values");
ok(CheckInTestHelpers.clampPercent(-20) === 0, "check-in adherence clamps low values");
ok(CheckInTestHelpers.clampPercent("no") === null, "invalid adherence stays unknown");

const parsed = parsePrivateMediaInput({
  kind: "front",
  data: "data:image/jpeg;base64," + Buffer.from("private-image").toString("base64")
});
ok(parsed.contentType === "image/jpeg" && parsed.byteSize > 0, "private media parser accepts allowed image");
assert.throws(
  () => parsePrivateMediaInput({ data: "data:text/html;base64,PGgxPng8L2gxPg==" }),
  /Unsupported/,
  "private media rejects executable/public content types"
);
console.log("OK  ", "private media rejects executable/public content types");
ok(MediaSecurityContract.publicUrlsAllowed === false, "media contract forbids public URLs");
ok(MediaSecurityContract.authorizationRequired && MediaSecurityContract.accessAuditRequired, "media contract requires auth and audit");

const secret = "0123456789abcdef0123456789abcdef";
const token = createMediaAccessToken(secret, {
  mediaId: "media-1",
  actorUserId: "10",
  actorRole: "coach",
  ttlSeconds: 60
});
ok(verifyMediaAccessToken(secret, token, {
  mediaId: "media-1",
  actorUserId: "10",
  actorRole: "coach"
}).ok, "signed media token validates for bound actor");
ok(!verifyMediaAccessToken(secret, token, {
  mediaId: "media-1",
  actorUserId: "11",
  actorRole: "coach"
}).ok, "signed media token rejects another coach");
ok(!verifyMediaAccessToken(secret, token + "x", {
  mediaId: "media-1",
  actorUserId: "10",
  actorRole: "coach"
}).ok, "signed media token rejects tampering");

const migration = fs.readFileSync(path.join(root, "server/db/migrations/0003_checkins_intelligence_media.sql"), "utf8");
for (const table of [
  "coach_check_ins",
  "coach_media_objects",
  "coach_check_in_media",
  "coach_media_access_audit",
  "coach_client_metric_snapshots"
]) {
  ok(migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `migration creates ${table}`);
}
ok(migration.includes("object_data BYTEA") && migration.includes("retention_until"), "media is private, retained outside JSONB");

const practice = fs.readFileSync(path.join(root, "coach-practice.mjs"), "utf8");
for (const route of [
  "/api/client/check-ins",
  "/api/coach/check-ins",
  "/api/coach/check-ins/request",
  "/api/coach/clients/:id/intelligence",
  "/api/media/:id/access",
  "/api/media/:id/content"
]) {
  ok(practice.includes(route), `API exposes ${route}`);
}
ok(practice.includes("loadAuthorizedMedia") && practice.includes("coach_user_id") && practice.includes("athlete_user_id"), "media authorization checks coach/client ownership");
ok(practice.includes("verifyMediaAccessToken") && practice.includes("Cache-Control"), "media content requires signed no-store access");
ok(practice.includes("coach_media_access_audit") || fs.readFileSync(path.join(root, "server/media/private-store.mjs"), "utf8").includes("coach_media_access_audit"), "media access is audited");

const checkinUi = fs.readFileSync(path.join(root, "web/coach-os/checkins.js"), "utf8");
const clientUi = fs.readFileSync(path.join(root, "web/coach-os/clients.js"), "utf8");
const base = fs.readFileSync(path.join(root, "web/index.base.html"), "utf8");
ok(checkinUi.includes("Requested") && checkinUi.includes("Received") && checkinUi.includes("To review") && checkinUi.includes("Reviewed"), "Check-in Center has workflow queues");
ok(checkinUi.includes("Review & Respond") && checkinUi.includes("openCheckInMedia"), "Check-in detail supports review and private media");
ok(clientUi.includes("Athlete intelligence") && clientUi.includes("Deterministic"), "Client Overview separates deterministic intelligence");
ok(base.includes("submitClientCheckInToCoach") && base.includes("serverCheckInId"), "athlete check flow submits to Check-in Center");

const flags = resolveCoachOsFeatureFlags({ env: {} });
ok(flags.clientIntelligence && flags.checkInCenterV1, "Phase 3 flags enabled");
const release = JSON.parse(fs.readFileSync(path.join(root, "release.json"), "utf8"));
ok(Number(release.schemaTarget) >= 3, "release includes Phase 3 migration");

const webIndex = path.join(root, "web/index.html");
const apkIndex = path.join(root, "app/src/main/assets/index.html");
if (fs.existsSync(webIndex) && fs.existsSync(apkIndex)) {
  const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  ok(hash(webIndex) === hash(apkIndex), "Web/APK parity");
  const built = fs.readFileSync(webIndex, "utf8");
  ok(built.includes("Review & Respond") && built.includes("Athlete intelligence"), "built bundle contains Phase 3 UI");
}

console.log("\nPhase 3 check-in and intelligence checks passed.");
