import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COACH_OS_FEATURE_NAMES, resolveCoachOsFeatureFlags } from "./feature-flags.mjs";
import { loadMigrationFiles } from "./server/db/migrate.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log("OK  ", message);
}

const release = JSON.parse(fs.readFileSync(path.join(root, "release.json"), "utf8"));
ok(release.versionName === "1.5.34", "release baseline remains 1.5.34");
ok(release.schemaTarget === "0007", "schema target includes all Coach OS migrations");

const migrations = await loadMigrationFiles();
ok(migrations.map((row) => row.version).join(",") === "0001,0002,0003,0004,0005,0006,0007", "migrations are additive and ordered");

const flags = resolveCoachOsFeatureFlags({ env: {} });
for (const name of [
  "coachShellV2", "coachTodayV2", "coachImportV2", "coachTasksV1", "clientTimelineV1",
  "clientIntelligence", "checkInCenterV1", "agentV1", "schedulingV1", "coachAnalyticsV1",
  "businessV1", "inboxV2"
]) {
  ok(COACH_OS_FEATURE_NAMES.includes(name) && flags[name] === true, `shipped flag ${name} is on`);
}

const off = resolveCoachOsFeatureFlags({
  env: {
    NURVAN_FEATURE_AGENT_V1: "false",
    NURVAN_FEATURE_SCHEDULING_V1: "false",
    NURVAN_FEATURE_BUSINESS_V1: "false"
  }
});
ok(!off.agentV1 && !off.schedulingV1 && !off.businessV1, "shipped flags can still be rolled back");

const personal = fs.readFileSync(path.join(root, "web/index.base.html"), "utf8");
ok(personal.includes("function renderTraining(") && personal.includes("function renderNutrition("), "Personal domain functions remain");
ok(!/CRM pipeline|Business Analytics/.test(personal.slice(0, 2000)), "Personal host is not rewritten as a CRM product");

const clientUi = fs.readFileSync(path.join(root, "web/coach-practice-ui.js"), "utf8");
ok(clientUi.includes("coachLandingView") && clientUi.includes("switchCoachClientFromHeader"), "client switch and landing remain");
ok(clientUi.includes("enqueueClientOutbox"), "client outbox remains");

const functionsDoc = fs.readFileSync(path.join(root, "docs/APP_FUNZIONI.md"), "utf8");
ok(functionsDoc.includes("Coach OS") || functionsDoc.includes("Today"), "function catalog mentions Coach OS surfaces");

const build = fs.readFileSync(path.join(root, "build_master25.mjs"), "utf8");
ok(build.includes("web/coach-os/agent.js") && build.includes("web/coach-os/inbox.js"), "build concatenates later Coach OS modules");

const webIndex = path.join(root, "web/index.html");
const apkIndex = path.join(root, "app/src/main/assets/index.html");
if (fs.existsSync(webIndex) && fs.existsSync(apkIndex)) {
  const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  ok(hash(webIndex) === hash(apkIndex), "Web/APK parity after Coach OS");
}

console.log("\nRelease gates passed.");
