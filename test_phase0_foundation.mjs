import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  COACH_OS_FEATURE_NAMES,
  resolveCoachOsFeatureFlags,
  sanitizeFeatureFlagOverrides
} from "./feature-flags.mjs";
import {
  buildCorsOriginValidator,
  isCorsOriginAllowed,
  resolveJwtSecret
} from "./server/security.mjs";
import {
  loadMigrationFiles,
  runMigrations
} from "./server/db/migrate.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));

function ok(condition, message) {
  assert.ok(condition, message);
  console.log("OK  ", message);
}

const release = JSON.parse(fs.readFileSync(path.join(root, "release.json"), "utf8"));
ok(release.versionName === "1.5.34", "release metadata preserves baseline version");
ok(release.androidVersionCode === 41, "release metadata preserves Android version code");
ok(Number(release.schemaTarget) >= 1, "release metadata declares schema target");

const gradle = fs.readFileSync(path.join(root, "app/build.gradle"), "utf8");
ok(gradle.includes("release.json") && !/versionName\s+"1\.5\.34"/.test(gradle), "Gradle reads release metadata");

const build = fs.readFileSync(path.join(root, "build_master25.mjs"), "utf8");
ok(build.includes("RELEASE_META") && build.includes("resolveCoachOsFeatureFlags"), "web build reads release and feature metadata");
ok(
  fs.readFileSync(path.join(root, "web/sw.js"), "utf8").includes("release-meta.js") &&
    fs.readFileSync(path.join(root, "sync_web_assets.mjs"), "utf8").includes("release-meta.js"),
  "service worker cache version is generated and synced from release metadata"
);

ok(COACH_OS_FEATURE_NAMES.includes("coachTodayV2"), "feature registry has coachTodayV2");
ok(COACH_OS_FEATURE_NAMES.includes("coachImportV2"), "feature registry has native coach import");
ok(COACH_OS_FEATURE_NAMES.includes("agentV1"), "feature registry has agentV1");
const defaults = resolveCoachOsFeatureFlags({ env: {} });
ok(
  defaults.coachShellV2 && defaults.coachTodayV2 && defaults.coachImportV2 &&
    defaults.coachTasksV1 && defaults.clientTimelineV1,
  "shipped Coach OS flags default on"
);
ok(defaults.agentV1 && defaults.schedulingV1 && defaults.businessV1 && defaults.inboxV2, "shipped later-phase Coach OS flags default on");
const envEnabled = resolveCoachOsFeatureFlags({
  env: { NURVAN_FEATURE_COACH_TODAY_V2: "true" }
});
ok(envEnabled.coachTodayV2 === true, "environment enables requested flag");
const overridden = resolveCoachOsFeatureFlags({
  env: { NURVAN_FEATURE_AGENT_V1: "true" },
  overrides: { agentV1: false, unknownFlag: true }
});
ok(overridden.agentV1 === false && !("unknownFlag" in overridden), "per-coach flags override known flags only");
ok(Object.keys(sanitizeFeatureFlagOverrides({ agentV1: true, x: true })).length === 1, "unknown flag overrides are rejected");

assert.throws(
  () => resolveJwtSecret({ NODE_ENV: "production", JWT_SECRET: "short" }),
  /at least 32/,
  "production rejects weak JWT secret"
);
console.log("OK  ", "production rejects weak JWT secret");
ok(resolveJwtSecret({ NODE_ENV: "test" }).includes("development-only"), "development has explicit non-production fallback");
ok(isCorsOriginAllowed(undefined, { NODE_ENV: "production" }), "native/no-origin requests remain supported");
ok(isCorsOriginAllowed("https://coach-api-gemini.onrender.com", { NODE_ENV: "production" }), "canonical production origin allowed");
ok(!isCorsOriginAllowed("https://evil.example", { NODE_ENV: "production" }), "unknown production origin denied");
ok(isCorsOriginAllowed("http://localhost:5173", { NODE_ENV: "development" }), "localhost allowed in development");

await new Promise((resolve, reject) => {
  const validator = buildCorsOriginValidator({ NODE_ENV: "production" });
  validator("https://evil.example", (error, allowed) => {
    try {
      ok(!!error && allowed !== true, "CORS validator rejects disallowed origin");
      resolve();
    } catch (err) {
      reject(err);
    }
  });
});

const migrations = await loadMigrationFiles();
ok(migrations.length >= 1 && migrations[0].version === "0001", "migration runner discovers ordered migrations");
ok(migrations[0].sql.includes("feature_flags") && migrations[0].sql.includes("invite_password = NULL"), "phase0 migration contains flags and credential scrub");

const queries = [];
const fakeClient = {
  async query(sql, params) {
    const text = String(sql).trim();
    queries.push({ text, params });
    if (text.startsWith("SELECT version, checksum")) return { rows: [] };
    return { rows: [] };
  }
};
const migrated = await runMigrations(fakeClient);
ok(migrated.latest === release.schemaTarget, "migration runner reaches declared schema target");
ok(migrated.applied.includes("0001"), "migration runner applies pending migration");
ok(queries.some((entry) => entry.text.includes("INSERT INTO schema_migrations")), "migration runner records applied migration");

const practice = fs.readFileSync(path.join(root, "coach-practice.mjs"), "utf8");
ok(practice.includes('/api/coach/features'), "Coach feature endpoint exists");
ok(practice.includes("invite_password = NULL"), "invite plaintext is cleared on credential changes");
ok(!practice.includes("password: row.invite_password"), "snapshot never returns persisted invite plaintext");
ok(practice.includes("24 hours"), "call signal retention cleanup is configured");

const api = fs.readFileSync(path.join(root, "coach-api.mjs"), "utf8");
ok(api.includes("jwtVerify") && api.includes("APPLE_JWKS"), "Apple identity token uses JWKS verification");
ok(api.includes("buildCorsOriginValidator"), "API uses CORS allowlist validator");
ok(api.includes("createFixedWindowRateLimiter"), "API protects auth/import endpoints");
ok(api.includes("schemaVersion: dbSchemaVersion"), "health exposes schema version");

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
for (const [name, command] of Object.entries(packageJson.scripts || {})) {
  if (!name.startsWith("test")) continue;
  for (const match of command.matchAll(/node\s+([^\s&]+)/g)) {
    const scriptPath = path.join(root, match[1]);
    ok(fs.existsSync(scriptPath), `${name} references existing ${match[1]}`);
  }
}

for (const doc of [
  "PRODUCT_CONTRACT_V1.5.34.md",
  "SCREEN_INVENTORY_V1.5.34.md",
  "ACCEPTANCE_SCENARIOS.md",
  "DECISION_LOG.md"
]) {
  ok(fs.existsSync(path.join(root, "docs/product-contract", doc)), `product contract includes ${doc}`);
}

console.log("\\nPhase 0 foundation checks passed.");
