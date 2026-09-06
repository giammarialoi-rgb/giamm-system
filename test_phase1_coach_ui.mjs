import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadCoachToday,
  normalizeCoachTimeZone,
  TodayTestHelpers
} from "./server/coach-os/today.mjs";
import { resolveCoachOsFeatureFlags } from "./feature-flags.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));

function ok(value, message) {
  assert.ok(value, message);
  console.log("OK  ", message);
}

const now = Date.now();
const attention = TodayTestHelpers.attentionFromRow({
  id: 4,
  display_name: "Marco",
  unread_count: 2,
  pending_change: { summary: "Split" },
  paid: false,
  next_due_at: new Date(now - 86400000).toISOString(),
  next_check_at: new Date(now - 1000).toISOString(),
  program_expires_at: new Date(now + 86400000).toISOString(),
  last_workout_at: new Date(now - 9 * 86400000).toISOString(),
  created_at: new Date(now - 30 * 86400000).toISOString()
}, now);

for (const type of ["unread", "program_change", "payment_due", "check_in", "program_expiring", "inactive"]) {
  ok(attention.some((item) => item.type === type), `Today derives ${type} attention`);
}
ok(normalizeCoachTimeZone("Europe/Rome") === "Europe/Rome", "valid timezone preserved");
ok(normalizeCoachTimeZone("not/a-zone") === "UTC", "invalid timezone falls back to UTC");

const mockPool = {
  async query(sql) {
    const text = String(sql);
    if (text.includes("COUNT(*)::int AS clients")) {
      return { rows: [{ clients: 3, active_clients: 2, unread: 2, live_now: 1 }] };
    }
    if (text.includes("FROM coach_clients") && text.includes("pending_change")) {
      return {
        rows: [{
          id: 4,
          display_name: "Marco",
          paid: false,
          next_due_at: new Date(now - 86400000).toISOString(),
          unread_count: 2,
          pending_change: null,
          pending_unlock: null,
          leave_requested_at: null,
          next_check_at: null,
          program_expires_at: null,
          last_workout_at: null,
          created_at: new Date(now - 20 * 86400000).toISOString()
        }]
      };
    }
    return {
      rows: [{
        id: 9,
        kind: "workout_done",
        payload: {},
        created_at: new Date().toISOString(),
        client_id: 4,
        display_name: "Marco"
      }]
    };
  }
};

const today = await loadCoachToday(mockPool, "1", {
  date: "2026-09-05",
  timeZone: "Europe/Rome"
});
ok(today.date === "2026-09-05" && today.timeZone === "Europe/Rome", "Today returns date and timezone");
ok(today.kpi.clients === 3 && today.kpi.liveNow === 1, "Today returns portfolio KPIs");
ok(today.attention.length >= 2, "Today returns actionable attention");
ok(today.recentActivity.length === 1 && today.recentActivity.length <= 8, "Today activity is compact");
ok(Array.isArray(today.sessions) && Array.isArray(today.tasks), "Today reserves sessions and tasks without inventing data");

const flags = resolveCoachOsFeatureFlags({ env: {} });
ok(flags.coachShellV2 && flags.coachTodayV2 && flags.coachImportV2, "Phase 1 flags enabled");
ok(flags.agentV1 && flags.schedulingV1, "later Coach OS flags remain independently togglable");

const shell = fs.readFileSync(path.join(root, "web/coach-os/shell.js"), "utf8");
const todayUi = fs.readFileSync(path.join(root, "web/coach-os/today.js"), "utf8");
const programs = fs.readFileSync(path.join(root, "web/coach-os/programs.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "web/coach-os/design-system.css"), "utf8");
const practice = fs.readFileSync(path.join(root, "web/coach-practice-ui.js"), "utf8");
const base = fs.readFileSync(path.join(root, "web/index.base.html"), "utf8");

ok(shell.includes("coachToday") && shell.includes("coachInbox") && shell.includes("coachPrograms") && shell.includes("coachCalendar"), "Coach shell defines five primary destinations");
ok(shell.includes("Home") && shell.includes("Clients") && shell.includes("Inbox") && shell.includes("Programs") && shell.includes("Calendar"), "Coach bottom navigation contract present");
ok(todayUi.includes("Needs attention") && todayUi.includes("My tasks") && todayUi.includes("Recent activity"), "Today hierarchy is action-first");
ok(todayUi.indexOf("Needs attention") < todayUi.indexOf("Portfolio"), "Today places attention before KPIs");
ok(programs.includes("openNativeImport") && programs.includes("coachImport"), "Programs owns native Coach import route");
ok(base.includes("COACH OS · IMPORT PROGRAM") && base.includes("SALVA NEL COACH DATABASE"), "native import owns Coach copy and completion");
ok(base.includes("forceAsk: true") && base.includes("selectedDomains"), "domain picker remains explicit");
ok(styles.includes("@media (min-width: 1024px)") && styles.includes("--co-space-"), "design system includes tokens and desktop sidebar");
ok(practice.includes("window.CoachOS.applyShell") && practice.includes("coachLandingView"), "legacy practice shell delegates behind feature flag");

for (const existing of ["function renderTraining(", "function renderNutrition(", "function syncAccountData(", "function enqueueClientOutbox("]) {
  ok(base.includes(existing) || practice.includes(existing), `stable capability preserved: ${existing}`);
}

const webIndex = path.join(root, "web/index.html");
const apkIndex = path.join(root, "app/src/main/assets/index.html");
if (fs.existsSync(webIndex) && fs.existsSync(apkIndex)) {
  const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  ok(hash(webIndex) === hash(apkIndex), "Web/APK index parity");
  const built = fs.readFileSync(webIndex, "utf8");
  ok(built.includes("coach-os-design-system") && built.includes("Needs attention") && built.includes("openNativeImport"), "built bundle contains Coach OS Phase 1");
}

console.log("\nPhase 1 Coach UI checks passed.");
