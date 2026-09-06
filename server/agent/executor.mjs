import crypto from "node:crypto";
import { createCheckInRequest } from "../coach-os/checkins.mjs";
import { createCoachTask, listCoachTasks, reorderCoachTasks, updateCoachTask } from "../coach-os/workspace.mjs";
import { writeAgentAudit } from "./audit.mjs";
import { assertAgentPermission } from "./permissions.mjs";
import { executeKillSwitchOn, getTool, maxAgentBatchSize } from "./registry.mjs";
import { resourceFingerprint } from "./planner.mjs";

export class AgentExecutionError extends Error {
  constructor(code, message, extras = {}) {
    super(message);
    this.code = code;
    Object.assign(this, extras);
  }
}

export function defaultCoachPreferences() {
  return {
    deloadStrategy: "volume_first",
    volumeProgression: "linear",
    communicationStyle: "direct",
    agentConfirmation: "always",
    notifications: { attention: true, checkIns: true, payments: true },
    programDefaults: { weeks: 8, sessionsPerWeek: 4 }
  };
}

export async function loadCoachPreferences(pool, coachId) {
  const result = await pool.query(
    "SELECT version, preferences, updated_by, updated_at FROM coach_preferences WHERE coach_user_id = $1",
    [coachId]
  );
  if (!result.rows[0]) {
    return { version: 1, preferences: defaultCoachPreferences(), updatedBy: "system", updatedAt: null };
  }
  return {
    version: Number(result.rows[0].version || 1),
    preferences: { ...defaultCoachPreferences(), ...(result.rows[0].preferences || {}) },
    updatedBy: result.rows[0].updated_by,
    updatedAt: result.rows[0].updated_at
  };
}

export async function saveCoachPreferences(pool, coachId, input = {}, actor = "coach") {
  const current = await loadCoachPreferences(pool, coachId);
  const next = { ...current.preferences, ...asObject(input) };
  const result = await pool.query(
    `INSERT INTO coach_preferences(coach_user_id, version, preferences, updated_by, updated_at)
     VALUES($1, 1, $2, $3, NOW())
     ON CONFLICT (coach_user_id) DO UPDATE SET
       version = coach_preferences.version + 1,
       preferences = EXCLUDED.preferences,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()
     RETURNING version, preferences, updated_by, updated_at`,
    [coachId, JSON.stringify(next), actor]
  );
  return {
    version: Number(result.rows[0].version),
    preferences: result.rows[0].preferences,
    updatedBy: result.rows[0].updated_by,
    updatedAt: result.rows[0].updated_at
  };
}

export async function loadOwnedClientIds(pool, coachId) {
  const result = await pool.query(
    "SELECT id FROM coach_clients WHERE coach_user_id = $1 AND status <> 'removed'",
    [coachId]
  );
  return (result.rows || []).map((row) => String(row.id));
}

export async function loadClientResource(pool, coachId, clientId) {
  const result = await pool.query(
    `SELECT c.*, d.data, COALESCE(d.revision, 1) AS revision
     FROM coach_clients c
     LEFT JOIN app_account_data d ON d.user_id = c.athlete_user_id
     WHERE c.id = $1 AND c.coach_user_id = $2 AND c.status <> 'removed'`,
    [clientId, coachId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    client: row,
    data: row.data || {},
    revision: Number(row.revision || 1),
    fingerprint: resourceFingerprint({
      revision: Number(row.revision || 1),
      programId: row.data && row.data.activeProgram && row.data.activeProgram.id,
      assignedAt: row.data && row.data.assignedAt,
      nextCheckAt: row.next_check_at,
      paid: row.paid
    })
  };
}

export function diffResource(expected, current) {
  const changes = [];
  if (expected.revision !== current.revision) {
    changes.push({ field: "revision", before: expected.revision, after: current.revision });
  }
  if (expected.fingerprint !== current.fingerprint) {
    changes.push({ field: "fingerprint", before: expected.fingerprint, after: current.fingerprint });
  }
  return changes;
}

export async function createAgentRun(pool, coachId, input = {}) {
  const id = input.id || ("run_" + crypto.randomUUID());
  const result = await pool.query(
    `INSERT INTO agent_runs(
       id, coach_user_id, client_id, mode, intent, status, user_message, plan
     ) VALUES($1,$2,$3,$4,$5,'planned',$6,$7)
     RETURNING *`,
    [
      id,
      coachId,
      input.clientId || null,
      input.mode || "PROPOSE",
      input.intent || "understand",
      String(input.userMessage || "").slice(0, 4000),
      JSON.stringify(input.plan || [])
    ]
  );
  return runRow(result.rows[0]);
}

export async function getAgentRun(pool, coachId, runId) {
  const run = await pool.query(
    "SELECT * FROM agent_runs WHERE id = $1 AND coach_user_id = $2",
    [runId, coachId]
  );
  if (!run.rows[0]) return null;
  const proposals = await pool.query(
    "SELECT * FROM agent_proposals WHERE run_id = $1 AND coach_user_id = $2 ORDER BY created_at ASC",
    [runId, coachId]
  );
  return {
    ...runRow(run.rows[0]),
    proposals: (proposals.rows || []).map(proposalRow)
  };
}

export async function saveAgentProposal(pool, coachId, input = {}) {
  const id = input.id || ("prop_" + crypto.randomUUID());
  const result = await pool.query(
    `INSERT INTO agent_proposals(
       id, run_id, coach_user_id, client_id, tool_id, status, summary, why,
       payload, preview, target_set, expected_resource_revision, expected_fingerprint,
       before_state, idempotency_key, expires_at
     ) VALUES($1,$2,$3,$4,$5,'pending',$6,$7,$8,$9,$10,$11,$12,$13,$14, NOW() + INTERVAL '2 hours')
     RETURNING *`,
    [
      id,
      input.runId,
      coachId,
      input.clientId || null,
      input.toolId,
      input.summary,
      JSON.stringify(input.why || {}),
      JSON.stringify(input.payload || {}),
      JSON.stringify(input.preview || {}),
      JSON.stringify(input.targetSet || []),
      input.expectedRevision || null,
      input.expectedFingerprint || null,
      JSON.stringify(input.beforeState || null),
      input.idempotencyKey || null
    ]
  );
  return proposalRow(result.rows[0]);
}

export async function confirmAgentProposal(pool, coachId, input = {}, hooks = {}, context = {}) {
  const proposalResult = await pool.query(
    "SELECT * FROM agent_proposals WHERE id = $1 AND coach_user_id = $2",
    [input.proposalId, coachId]
  );
  const proposal = proposalResult.rows[0];
  if (!proposal) throw new AgentExecutionError("NOT_FOUND", "Proposal not found.");
  if (proposal.status === "executed") {
    return { replayed: true, proposal: proposalRow(proposal), result: proposal.batch_result || proposal.after_state };
  }
  if (proposal.status !== "pending") {
    throw new AgentExecutionError("PROPOSAL_CLOSED", "This proposal is no longer pending.");
  }
  if (proposal.expires_at && new Date(proposal.expires_at).getTime() < Date.now()) {
    throw new AgentExecutionError("PROPOSAL_EXPIRED", "This proposal has expired.");
  }

  const tool = getTool(proposal.tool_id);
  const owned = await loadOwnedClientIds(pool, coachId);
  assertAgentPermission({
    toolId: tool.id,
    role: "coach",
    flags: context.flags,
    env: context.env,
    ownedClientIds: owned,
    clientId: proposal.client_id,
    targetIds: (proposal.target_set || []).map((row) => row.clientId || row.id || row),
    executeEnabled: executeKillSwitchOn(context.env)
  });

  const frozenTargets = freezeTargets(proposal.target_set, proposal.client_id);
  const requestedTargets = freezeTargets(input.targetSet || input.targets, input.clientId || proposal.client_id);
  if (requestedTargets.length && JSON.stringify(requestedTargets) !== JSON.stringify(frozenTargets)) {
    throw new AgentExecutionError("TARGET_SET_CHANGED", "Target set changed between preview and confirm. A new preview is required.");
  }
  if (frozenTargets.length > maxAgentBatchSize(context.env)) {
    throw new AgentExecutionError("BATCH_LIMIT", "Batch exceeds server AGENT_MAX_BATCH_SIZE.");
  }

  const idempotencyKey = String(input.idempotencyKey || proposal.idempotency_key || "").trim();
  if (idempotencyKey) {
    const existing = await pool.query(
      "SELECT * FROM agent_idempotency_keys WHERE coach_user_id = $1 AND idempotency_key = $2",
      [coachId, idempotencyKey]
    );
    if (existing.rows[0] && existing.rows[0].status === "completed") {
      return { replayed: true, result: existing.rows[0].result };
    }
  }

  if (proposal.client_id && tool.capability === "EXECUTE" && tool.impact !== "low") {
    const current = await loadClientResource(pool, coachId, proposal.client_id);
    if (!current) throw new AgentExecutionError("NOT_FOUND", "Client no longer available.");
    const expected = {
      revision: Number(input.expectedRevision != null ? input.expectedRevision : proposal.expected_resource_revision),
      fingerprint: input.expectedFingerprint || proposal.expected_fingerprint
    };
    const changes = diffResource(expected, current);
    if (changes.length) {
      await writeAgentAudit(pool, {
        coachUserId: coachId,
        clientId: proposal.client_id,
        runId: proposal.run_id,
        proposalId: proposal.id,
        toolId: tool.id,
        capability: "EXECUTE",
        outcome: "stale",
        reason: "STALE_PROPOSAL",
        beforeFingerprint: expected.fingerprint,
        afterFingerprint: current.fingerprint,
        targetSet: frozenTargets,
        details: { changes }
      });
      throw new AgentExecutionError("STALE_PROPOSAL", "Questa proposta non è più aggiornata perché i dati sono cambiati.", {
        statusCode: 409,
        diff: changes,
        current
      });
    }
  }

  const results = { completed: [], failed: [], skipped: [] };
  for (const target of frozenTargets.length ? frozenTargets : [{ clientId: proposal.client_id }]) {
    const subKey = idempotencyKey ? idempotencyKey + ":" + (target.clientId || "coach") : null;
    try {
      if (subKey) {
        const prior = await pool.query(
          "SELECT status FROM agent_idempotency_keys WHERE coach_user_id = $1 AND idempotency_key = $2",
          [coachId, subKey]
        );
        if (prior.rows[0] && prior.rows[0].status === "completed") {
          results.skipped.push({ clientId: target.clientId, reason: "already_completed" });
          continue;
        }
      }
      const executed = await executeTool(pool, coachId, tool, proposal, target, hooks);
      results.completed.push({ clientId: target.clientId, result: executed });
      if (subKey) {
        await pool.query(
          `INSERT INTO agent_idempotency_keys(coach_user_id, idempotency_key, proposal_id, status, result)
           VALUES($1,$2,$3,'completed',$4)
           ON CONFLICT (coach_user_id, idempotency_key) DO UPDATE SET
             status = 'completed', result = EXCLUDED.result, updated_at = NOW()`,
          [coachId, subKey, proposal.id, JSON.stringify(executed)]
        );
      }
    } catch (error) {
      results.failed.push({ clientId: target.clientId, reason: error.message || "failed" });
    }
  }

  const after = proposal.client_id ? await loadClientResource(pool, coachId, proposal.client_id) : null;
  await pool.query(
    `UPDATE agent_proposals
     SET status = 'executed', executed_at = NOW(), after_state = $3, batch_result = $4
     WHERE id = $1 AND coach_user_id = $2`,
    [proposal.id, coachId, JSON.stringify(after), JSON.stringify(results)]
  );
  await pool.query(
    "UPDATE agent_runs SET status = 'completed', result = $3, completed_at = NOW() WHERE id = $1 AND coach_user_id = $2",
    [proposal.run_id, coachId, JSON.stringify(results)]
  );
  if (idempotencyKey) {
    await pool.query(
      `INSERT INTO agent_idempotency_keys(coach_user_id, idempotency_key, proposal_id, status, result)
       VALUES($1,$2,$3,'completed',$4)
       ON CONFLICT (coach_user_id, idempotency_key) DO UPDATE SET
         status = 'completed', result = EXCLUDED.result, updated_at = NOW()`,
      [coachId, idempotencyKey, proposal.id, JSON.stringify(results)]
    );
  }
  await writeAgentAudit(pool, {
    coachUserId: coachId,
    clientId: proposal.client_id,
    runId: proposal.run_id,
    proposalId: proposal.id,
    toolId: tool.id,
    capability: tool.capability,
    outcome: results.failed.length ? "partial" : "executed",
    beforeFingerprint: proposal.expected_fingerprint,
    afterFingerprint: after && after.fingerprint,
    targetSet: frozenTargets,
    details: results
  });
  return { replayed: false, result: results };
}

export async function undoAgentProposal(pool, coachId, proposalId, hooks = {}) {
  const result = await pool.query(
    "SELECT * FROM agent_proposals WHERE id = $1 AND coach_user_id = $2",
    [proposalId, coachId]
  );
  const proposal = result.rows[0];
  if (!proposal) throw new AgentExecutionError("NOT_FOUND", "Proposal not found.");
  const tool = getTool(proposal.tool_id);
  if (!tool.reversible) throw new AgentExecutionError("NOT_REVERSIBLE", "This action cannot be undone.");
  if (proposal.status !== "executed" || proposal.undone_at) {
    throw new AgentExecutionError("NOT_UNDOABLE", "Nothing to undo.");
  }
  const before = proposal.before_state || {};
  if (tool.id.startsWith("tasks.")) {
    if (before.taskId) {
      await updateCoachTask(pool, coachId, before.taskId, { status: before.status || "open" });
    }
  } else if (proposal.client_id && before.data && hooks.restoreClientData) {
    await hooks.restoreClientData(proposal.client_id, before.data);
  }
  await pool.query(
    "UPDATE agent_proposals SET status = 'undone', undone_at = NOW() WHERE id = $1 AND coach_user_id = $2",
    [proposalId, coachId]
  );
  await writeAgentAudit(pool, {
    coachUserId: coachId,
    clientId: proposal.client_id,
    runId: proposal.run_id,
    proposalId: proposal.id,
    toolId: tool.id,
    capability: "EXECUTE",
    outcome: "undone",
    targetSet: proposal.target_set || []
  });
  return { ok: true, undone: true };
}

async function executeTool(pool, coachId, tool, proposal, target, hooks) {
  const payload = proposal.payload || {};
  if (tool.id === "tasks.create") {
    return createCoachTask(pool, coachId, { ...payload, clientId: payload.clientId || target.clientId, createdBy: "agent" });
  }
  if (tool.id === "tasks.complete") {
    return updateCoachTask(pool, coachId, payload.taskId, { status: "completed" });
  }
  if (tool.id === "tasks.snooze") {
    return updateCoachTask(pool, coachId, payload.taskId, { status: "snoozed", dueAt: payload.dueAt });
  }
  if (tool.id === "tasks.reorder") {
    return reorderCoachTasks(pool, coachId, payload.ids || []);
  }
  if (tool.id === "checkins.request") {
    return createCheckInRequest(pool, coachId, target.clientId || proposal.client_id, payload);
  }
  if (tool.id === "messages.send" && hooks.sendMessage) {
    return hooks.sendMessage(target.clientId || proposal.client_id, payload.encryptedBody || payload.body, payload.attachment);
  }
  if ((tool.id === "program.assign" || tool.id === "program.apply_modification") && hooks.assignProgram) {
    return hooks.assignProgram(target.clientId || proposal.client_id, payload);
  }
  if (tool.capability === "PROPOSE") {
    return { proposed: true, toolId: tool.id, payload };
  }
  throw new AgentExecutionError("UNSUPPORTED_EXECUTE", "No execute handler for " + tool.id);
}

function freezeTargets(value, fallbackClientId) {
  const rows = Array.isArray(value) ? value : [];
  const mapped = rows.map((row) => ({
    clientId: String(row.clientId || row.id || row)
  })).filter((row) => row.clientId && row.clientId !== "undefined");
  if (!mapped.length && fallbackClientId) return [{ clientId: String(fallbackClientId) }];
  return mapped.sort((a, b) => a.clientId.localeCompare(b.clientId));
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function runRow(row) {
  return {
    id: row.id,
    coachUserId: String(row.coach_user_id),
    clientId: row.client_id == null ? null : String(row.client_id),
    mode: row.mode,
    intent: row.intent,
    status: row.status,
    userMessage: row.user_message,
    plan: row.plan || [],
    result: row.result || null,
    createdAt: row.created_at,
    completedAt: row.completed_at
  };
}

function proposalRow(row) {
  return {
    id: row.id,
    runId: row.run_id,
    clientId: row.client_id == null ? null : String(row.client_id),
    toolId: row.tool_id,
    status: row.status,
    summary: row.summary,
    why: row.why || {},
    payload: row.payload || {},
    preview: row.preview || {},
    targetSet: row.target_set || [],
    batchResult: row.batch_result || null,
    expectedRevision: row.expected_resource_revision,
    expectedFingerprint: row.expected_fingerprint,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    executedAt: row.executed_at,
    undoneAt: row.undone_at
  };
}

export const ExecutorTestHelpers = Object.freeze({
  freezeTargets,
  diffResource,
  listCoachTasks
});
