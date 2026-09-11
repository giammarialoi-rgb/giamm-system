import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AGENT_V1_TOOL_DEFS, getAgentToolDef, validateAgentToolInput } from "./action-catalog.mjs";
import { evaluateAgentPermission } from "./server/agent/permissions.mjs";
import { classifyAgentIntent, planFromIntent, resourceFingerprint } from "./server/agent/planner.mjs";
import { AgentExecutionError, confirmAgentProposal, diffResource } from "./server/agent/executor.mjs";
import { executeKillSwitchOn, maxAgentBatchSize } from "./server/agent/registry.mjs";
import { resolveCoachOsFeatureFlags } from "./feature-flags.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log("OK  ", message);
}

ok(AGENT_V1_TOOL_DEFS.every((tool) => !/schedul|business|crm|broadcast|automat/.test(tool.id)), "Agent V1 excludes deferred domains");
ok(getAgentToolDef("clients.inactive") && getAgentToolDef("program.propose_deload"), "inactive and deload tools exist");
ok(validateAgentToolInput("program.assign", {}).valid === false, "assign requires client and proposal");
ok(classifyAgentIntent("mostra i clienti inattivi").id === "inactive_clients", "intent classifies inactive clients");
ok(classifyAgentIntent("check-in mancanti").tools.includes("checkins.missing"), "intent classifies missing check-ins");
ok(planFromIntent(classifyAgentIntent("riepilogo task")).steps[0].stage === "understand", "plan starts with understand");

const allowed = evaluateAgentPermission({
  toolId: "clients.status",
  role: "coach",
  flags: { agentV1: true },
  ownedClientIds: ["4"],
  clientId: "4"
});
ok(allowed.allowed, "owned client READ is allowed");
const denied = evaluateAgentPermission({
  toolId: "clients.status",
  role: "coach",
  flags: { agentV1: true },
  ownedClientIds: ["4"],
  clientId: "99"
});
ok(!denied.allowed && denied.errors.some((row) => row.startsWith("ownership")), "cross-coach client is denied");
ok(!evaluateAgentPermission({
  toolId: "program.assign",
  role: "coach",
  flags: { agentV1: true },
  ownedClientIds: ["4"],
  clientId: "4",
  executeEnabled: false
}).allowed, "EXECUTE kill switch blocks writes");
ok(maxAgentBatchSize({ AGENT_MAX_BATCH_SIZE: "10" }) === 10, "server batch cap is not client-controlled");
ok(executeKillSwitchOn({ NURVAN_AGENT_EXECUTE: "false" }) === false, "execute kill switch can disable writes");

const changes = diffResource(
  { revision: 1, fingerprint: "aaa" },
  { revision: 2, fingerprint: "bbb" }
);
ok(changes.length === 2, "stale proposal diff includes revision and fingerprint");

const store = { proposals: [], keys: [], audits: [] };
const stalePool = {
  async query(sql, params) {
    const text = String(sql);
    if (text.includes("FROM agent_proposals WHERE id")) {
      return {
        rows: [{
          id: "prop_1",
          run_id: "run_1",
          coach_user_id: 1,
          client_id: 4,
          tool_id: "program.assign",
          status: "pending",
          payload: {},
          target_set: [{ clientId: "4" }],
          expected_resource_revision: 1,
          expected_fingerprint: "old",
          expires_at: new Date(Date.now() + 3600000).toISOString()
        }]
      };
    }
    if (text.includes("FROM coach_clients WHERE coach_user_id") && text.includes("SELECT id")) {
      return { rows: [{ id: 4 }] };
    }
    if (text.includes("FROM coach_clients c") && text.includes("app_account_data")) {
      return {
        rows: [{
          id: 4,
          data: { activeProgram: { id: "changed" } },
          revision: 2,
          next_check_at: null,
          paid: true
        }]
      };
    }
    if (text.includes("INSERT INTO agent_audit_log")) {
      store.audits.push(params);
      return { rows: [{ id: 1, coach_user_id: 1, tool_id: "program.assign", capability: "EXECUTE", outcome: "stale", action_id: "a", actor_role: "coach", target_set: [], details: {}, created_at: new Date().toISOString() }] };
    }
    if (text.includes("agent_idempotency_keys")) return { rows: [] };
    return { rows: [] };
  }
};

await assert.rejects(
  () => confirmAgentProposal(stalePool, 1, {
    proposalId: "prop_1",
    expectedRevision: 1,
    expectedFingerprint: "old",
    idempotencyKey: "k1"
  }, {}, { env: { NURVAN_FEATURE_AGENT_V1: "true" }, flags: { agentV1: true } }),
  (error) => error instanceof AgentExecutionError && error.code === "STALE_PROPOSAL",
  "stale proposal refuses execute"
);
console.log("OK  ", "stale proposal refuses execute");
ok(store.audits.length === 1, "rejected stale execute is audited");

const practice = fs.readFileSync(path.join(root, "coach-practice.mjs"), "utf8");
for (const route of ["/api/coach/agent/runs", "/api/coach/agent/runs/:id/confirm", "/api/coach/agent/runs/:id/undo", "/api/coach/agent/audit"]) {
  ok(practice.includes(route), `API exposes ${route}`);
}
ok(practice.includes("STALE_PROPOSAL"), "confirm route returns stale code");
ok(fs.readFileSync(path.join(root, "web/coach-os/agent.js"), "utf8").includes("coViewData"), "Agent UI shows WHY view data");
ok(fs.readFileSync(path.join(root, "web/coach-os/agent.js"), "utf8").includes("coReplan"), "Agent UI offers re-plan after stale");
ok(resolveCoachOsFeatureFlags({ env: {} }).agentV1, "agentV1 ships enabled");
ok(resourceFingerprint({ a: 1 }) === resourceFingerprint({ a: 1 }), "fingerprints are stable");

console.log("\nPhase 4 Agent V1 checks passed.");
