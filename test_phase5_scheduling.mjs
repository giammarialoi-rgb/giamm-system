import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAppointment, normalizeSessionType, SESSION_TYPES, toIcs } from "./server/coach-os/scheduling.mjs";
import { resolveCoachOsFeatureFlags } from "./feature-flags.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log("OK  ", message);
}

ok(SESSION_TYPES[0] === "Coaching Call", "session type order is online-coaching-first");
ok(normalizeSessionType("review") === "Review", "session types normalize case");

const inserts = [];
const clashPool = {
  async query(sql) {
    const text = String(sql);
    if (text.includes("tstzrange") && inserts.length) return { rows: [{ id: 1 }] };
    if (text.includes("INSERT INTO coach_appointments")) {
      inserts.push(true);
      return {
        rows: [{
          id: 9,
          client_id: 4,
          type: "Coaching Call",
          title: "Call",
          starts_at: "2026-09-06T09:00:00.000Z",
          ends_at: "2026-09-06T09:45:00.000Z",
          timezone: "Europe/Rome",
          status: "scheduled",
          notes: "",
          created_by: "coach",
          created_at: new Date().toISOString()
        }]
      };
    }
    if (text.includes("INSERT INTO coach_reminders")) return { rows: [] };
    return { rows: [] };
  }
};

const first = await createAppointment(clashPool, 1, {
  type: "Coaching Call",
  title: "Marco",
  startsAt: "2026-09-06T09:00:00.000Z",
  timeZone: "Europe/Rome"
});
ok(first.type === "Coaching Call", "appointment is created");
await assert.rejects(
  () => createAppointment(clashPool, 1, {
    type: "Review",
    startsAt: "2026-09-06T09:15:00.000Z",
    endsAt: "2026-09-06T10:00:00.000Z"
  }),
  /collides/,
  "overlapping appointments are rejected"
);
console.log("OK  ", "overlapping appointments are rejected");

const ics = toIcs([first], "Nurvan");
ok(ics.includes("BEGIN:VEVENT") && ics.includes("DTSTART:"), "iCal export contains events");

const recurrencePool = {
  async query(sql) {
    const text = String(sql);
    if (text.includes("tstzrange")) return { rows: [] };
    if (text.includes("INSERT INTO coach_appointments")) {
      return {
        rows: [{
          id: Date.now(),
          client_id: 4,
          type: "Coaching Call",
          title: "Series",
          starts_at: "2026-09-06T09:00:00.000Z",
          ends_at: "2026-09-06T09:45:00.000Z",
          timezone: "Europe/Rome",
          status: "scheduled",
          notes: "",
          created_by: "coach",
          created_at: new Date().toISOString()
        }]
      };
    }
    return { rows: [] };
  }
};
const series = await createAppointment(recurrencePool, 1, {
  type: "Coaching Call",
  title: "Weekly",
  startsAt: "2026-09-06T09:00:00.000Z",
  timeZone: "Europe/Rome",
  recurrenceWeeks: 3
});
ok(series.count === 3 && series.series.length === 3, "weekly recurrence creates a 3-week series");

const practice = fs.readFileSync(path.join(root, "coach-practice.mjs"), "utf8");
ok(practice.includes("/api/coach/appointments"), "appointments API exists");
ok(practice.includes("/api/coach/availability"), "availability API exists");
ok(fs.readFileSync(path.join(root, "web/coach-os/calendar.js"), "utf8").includes("Coaching Call"), "Calendar UI lists coaching types");
ok(resolveCoachOsFeatureFlags({ env: {} }).schedulingV1, "scheduling flag ships enabled");
ok(fs.readFileSync(path.join(root, "server/db/migrations/0005_scheduling.sql"), "utf8").includes("coach_appointments"), "scheduling migration exists");

console.log("\nPhase 5 scheduling checks passed.");
