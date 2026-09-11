import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  clientOperationalStatus,
  createCoachTask,
  DEFAULT_SAVED_VIEWS,
  nextClientAction,
  WorkspaceTestHelpers
} from "./server/coach-os/workspace.mjs";
import { resolveCoachOsFeatureFlags } from "./feature-flags.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));

function ok(value, message) {
  assert.ok(value, message);
  console.log("OK  ", message);
}

ok(DEFAULT_SAVED_VIEWS.length === 5, "five default saved views exist");
for (const name of ["At Risk", "No Workout 7d", "Check-ins", "Payments", "New Clients"]) {
  ok(DEFAULT_SAVED_VIEWS.some((view) => view.name === name), `saved view ${name} exists`);
}

const baseClient = {
  id: 4,
  paid: true,
  unread_count: 0,
  pending_change: null,
  pending_unlock: null,
  leave_requested_at: null,
  next_check_at: null,
  last_workout_at: new Date().toISOString()
};
const programData = { activeProgram: { title: "Program", weeks: [{ sessions: [] }] } };
ok(clientOperationalStatus(baseClient, programData).id === "on_track", "healthy client is on track");
ok(clientOperationalStatus({ ...baseClient, paid: false }, programData).id === "payment_due", "unpaid client is payment due");
ok(clientOperationalStatus({ ...baseClient, unread_count: 2 }, programData).id === "awaiting_coach", "unread client awaits coach");
ok(
  clientOperationalStatus({ ...baseClient, last_workout_at: new Date(Date.now() - 9 * 86400000).toISOString() }, programData).id === "at_risk",
  "inactive client is at risk"
);
ok(nextClientAction({ ...baseClient, unread_count: 1 }, programData).view === "coachChat", "unread next action opens chat");
ok(nextClientAction(baseClient, {}).view === "coachPrograms", "missing program next action assigns program");

const taskPool = {
  async query(_sql, params) {
    return {
      rows: [{
        id: 11,
        client_id: params[1],
        source: params[2],
        title: params[3],
        due_at: params[4],
        priority: params[5],
        status: "open",
        created_by: params[6],
        sort_order: params[7],
        source_entity_type: params[8],
        source_entity_id: params[9],
        metadata: JSON.parse(params[10]),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]
    };
  }
};
const task = await createCoachTask(taskPool, 1, {
  clientId: 4,
  title: "Review Marco check-in",
  priority: "high",
  source: "check-in"
});
ok(task.title === "Review Marco check-in" && task.priority === "high", "task creation preserves operation fields");
await assert.rejects(
  () => createCoachTask(taskPool, 1, { title: "" }),
  /required/,
  "task title is required"
);
console.log("OK  ", "task title is required");

const timelineSpec = WorkspaceTestHelpers.timelineSpec("program_assigned", {});
ok(timelineSpec[0] === "program_assignment" && timelineSpec[1] === "program", "timeline maps assignment to source domain");
const weight = WorkspaceTestHelpers.latestWeight({
  bodyChecks: [
    { weight: 80, at: "2026-08-01" },
    { weight: 78.5, at: "2026-09-01" }
  ]
});
ok(weight.current === 78.5 && weight.delta === -1.5, "snapshot derives latest weight delta");

const migration = fs.readFileSync(path.join(root, "server/db/migrations/0002_clients_tasks_timeline.sql"), "utf8");
for (const table of ["coach_attention_items", "coach_tasks", "coach_saved_views", "coach_timeline_events"]) {
  ok(migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `migration creates ${table}`);
}

const practice = fs.readFileSync(path.join(root, "coach-practice.mjs"), "utf8");
for (const route of [
  "/api/coach/attention",
  "/api/coach/tasks",
  "/api/coach/tasks/reorder",
  "/api/coach/saved-views",
  "/api/coach/clients/:id/overview",
  "/api/coach/clients/:id/timeline"
]) {
  ok(practice.includes(route), `API exposes ${route}`);
}
ok(practice.includes("savedViewId") && practice.includes("nextCursor"), "client API supports saved views and cursor");
ok(practice.includes("loadOwnedClient(coach, req.params.id"), "overview/timeline enforce client ownership");

const clientsUi = fs.readFileSync(path.join(root, "web/coach-os/clients.js"), "utf8");
const todayUi = fs.readFileSync(path.join(root, "web/coach-os/today.js"), "utf8");
for (const label of ["coNextAction", "coAthleteSnapshot", "coTimeline", "coDomains"]) {
  ok(clientsUi.includes(label), `Client Overview contains ${label}`);
}
ok(clientsUi.indexOf("coNextAction") < clientsUi.indexOf("coAthleteSnapshot"), "Client Overview puts next action first");
ok(clientsUi.includes("saveCurrentClientView") && clientsUi.includes("savedViewId"), "Clients UI supports saved views");
ok(clientsUi.includes("openLegacyClientWorkspace"), "classic workspace remains available");
ok(todayUi.includes("completeTask") && todayUi.includes("snoozeTask") && todayUi.includes("moveTask"), "Today supports task lifecycle and reorder");
ok(todayUi.includes("updateAttention") && todayUi.includes("attentionMenu"), "Today supports attention lifecycle");

const flags = resolveCoachOsFeatureFlags({ env: {} });
ok(flags.coachTasksV1 && flags.clientTimelineV1, "Phase 2 feature flags enabled");
ok(flags.clientIntelligence && flags.checkInCenterV1, "Phase 3 intelligence and check-in flags enabled");

const release = JSON.parse(fs.readFileSync(path.join(root, "release.json"), "utf8"));
ok(Number(release.schemaTarget) >= 2, "release includes Phase 2 migration");

const webIndex = path.join(root, "web/index.html");
const apkIndex = path.join(root, "app/src/main/assets/index.html");
if (fs.existsSync(webIndex) && fs.existsSync(apkIndex)) {
  const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  ok(hash(webIndex) === hash(apkIndex), "Web/APK parity");
  const built = fs.readFileSync(webIndex, "utf8");
  ok(built.includes("saveCurrentClientView") && built.includes("Athlete snapshot"), "built bundle contains Phase 2 clients");
}

console.log("\nPhase 2 client operations checks passed.");
