import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aggregateCoachAnalytics } from "./server/coach-os/analytics.mjs";
import { CRM_STAGES, summarizeBusiness } from "./server/coach-os/business.mjs";
import { inboxItem } from "./server/coach-os/inbox.mjs";
import { interpretAthleteBrain } from "./server/coach-os/intelligence.mjs";
import { estimateMealFromHints } from "./server/coach-os/media-ai.mjs";
import { resolveCoachOsFeatureFlags } from "./feature-flags.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log("OK  ", message);
}

const analytics = aggregateCoachAnalytics([
  {
    client: { id: 4, display_name: "Marco", unread_count: 2 },
    intelligence: {
      signals: [{ id: "missing_check_in" }],
      derivedMetrics: {
        adherence: { value: 40 },
        consistency: { workouts28d: 2, inactiveDays: 9 },
        performance: { tonnageAverage: 8000 },
        weight: { delta: -3 }
      }
    }
  }
]);
ok(analytics.provenance.businessMetricsExcluded, "Coach Analytics excludes business metrics");
ok(analytics.adherence.atRisk === 1 && analytics.clientsAtRisk[0].name === "Marco", "low adherence becomes an actionable client");
ok(!JSON.stringify(analytics).includes("mrr"), "analytics payload has no MRR");

const business = summarizeBusiness(
  [{ status: "active", cadence: "monthly", amountCents: 20000, nextDueAt: new Date(Date.now() - 86400000).toISOString() }],
  [{ kind: "paid", amountCents: 20000, occurredAt: new Date().toISOString() }]
);
ok(business.stripeRequired === false, "manual ledger does not require Stripe");
ok(business.overdue === 1 && business.mrrCents === 20000, "overdue and MRR come from the ledger");
ok(CRM_STAGES[0] === "LEAD" && CRM_STAGES.includes("CHURNED"), "CRM pipeline is LEAD to CHURNED");

const item = inboxItem("message", { id: 1, client_id: 4, client_name: "Marco", body: "ciao", created_at: new Date().toISOString() });
ok(item.kind === "message" && item.unread, "Inbox item preserves unread message state");

const brain = interpretAthleteBrain({
  signals: [{ id: "inactivity", title: "Workout inactivity", detail: "9 giorni", evidence: [{ source: "workout_logs" }] }],
  derivedMetrics: { adherence: { value: 82 }, performance: { deltaPct: 8 } },
  sourceFingerprint: "abc"
});
ok(brain.grounded && brain.clinicalDiagnosis === false, "Athlete Brain is grounded and non-clinical");
ok(brain.positives.length >= 1 && brain.risks.length === 1, "Brain separates positives and risks");
ok(brain.suggestedAction.signalId === "inactivity", "suggested action points at a real signal");

const meal = estimateMealFromHints({ protein: 30, carbs: 40, fats: 10 });
ok(meal.needsConfirmation && meal.calories === 370, "meal estimate requires confirmation and uses macros");
ok(estimateMealFromHints({}).needsConfirmation, "low-confidence meal estimate still requires confirm");

const flags = resolveCoachOsFeatureFlags({ env: {} });
ok(flags.coachAnalyticsV1 && flags.businessV1 && flags.inboxV2, "Phase 6-8 flags enabled");
ok(flags.athleteBrainV1 && flags.mealAiV1 && flags.videoFormV1, "Phase 9-10 flags exist and ship");

const practice = fs.readFileSync(path.join(root, "coach-practice.mjs"), "utf8");
for (const route of [
  "/api/coach/analytics",
  "/api/coach/business",
  "/api/coach/crm",
  "/api/coach/automations",
  "/api/coach/inbox-feed",
  "/api/coach/clients/:id/brain-feedback",
  "/api/coach/meals/estimate",
  "/api/coach/form-reviews"
]) {
  ok(practice.includes(route), `API exposes ${route}`);
}

ok(fs.readFileSync(path.join(root, "web/coach-os/analytics.js"), "utf8").includes("Nessun revenue"), "Analytics UI forbids business copy");
ok(fs.readFileSync(path.join(root, "web/coach-os/inbox.js"), "utf8").includes("Inbox"), "Inbox UI exists");
ok(fs.readFileSync(path.join(root, "web/coach-os/clients.js"), "utf8").includes("Athlete Brain"), "Client Overview shows Athlete Brain");
ok(fs.readFileSync(path.join(root, "web/coach-os/media-ai.js"), "utf8").includes("CONFIRM & LOG"), "meal UI requires confirm");
ok(fs.readFileSync(path.join(root, "server/db/migrations/0006_business_crm.sql"), "utf8").includes("coach_payment_events"), "business migration exists");
ok(fs.readFileSync(path.join(root, "server/db/migrations/0007_inbox_media_ai.sql"), "utf8").includes("meal_logs"), "media AI migration exists");

console.log("\nPhase 6-10 Coach OS checks passed.");
