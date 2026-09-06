import { listCoachTasks } from "../coach-os/workspace.mjs";
import { listAgentAudit, writeAgentAudit } from "./audit.mjs";
import {
  confirmAgentProposal,
  createAgentRun,
  getAgentRun,
  loadClientResource,
  loadCoachPreferences,
  loadOwnedClientIds,
  saveAgentProposal,
  saveCoachPreferences,
  undoAgentProposal
} from "./executor.mjs";
import { assertAgentPermission } from "./permissions.mjs";
import { buildWhy, classifyAgentIntent, planFromIntent } from "./planner.mjs";
import { executeKillSwitchOn, getTool } from "./registry.mjs";

export async function startAgentRun(pool, coachId, input = {}, context = {}) {
  const message = String(input.message || input.userMessage || "").trim();
  if (!message) {
    const error = new Error("Agent message is required.");
    error.statusCode = 400;
    throw error;
  }
  const intent = classifyAgentIntent(message);
  const plan = planFromIntent(intent, { role: "coach" });
  const owned = await loadOwnedClientIds(pool, coachId);
  const run = await createAgentRun(pool, coachId, {
    clientId: input.clientId || null,
    mode: input.mode || "PROPOSE",
    intent: intent.id,
    userMessage: message,
    plan: plan.steps
  });

  const reads = [];
  for (const toolId of (plan.steps[0] && plan.steps[0].tools) || []) {
    const permission = assertAgentPermission({
      toolId,
      role: "coach",
      flags: context.flags,
      env: context.env,
      ownedClientIds: owned,
      clientId: input.clientId,
      executeEnabled: true
    });
    const result = await runReadTool(pool, coachId, permission.tool, {
      clientId: input.clientId,
      query: input.query || message
    });
    reads.push({ toolId, result });
    await writeAgentAudit(pool, {
      coachUserId: coachId,
      clientId: input.clientId || null,
      runId: run.id,
      toolId,
      capability: "READ",
      outcome: "read",
      details: { count: Array.isArray(result.items) ? result.items.length : 1 }
    });
  }

  const proposals = [];
  for (const toolId of (plan.steps[1] && plan.steps[1].tools) || []) {
    const tool = getTool(toolId);
    if (tool.capability === "READ") continue;
    const proposal = await buildProposalForTool(pool, coachId, run, tool, {
      clientId: input.clientId,
      message,
      reads,
      payload: input.payload || {}
    }, context);
    if (proposal) proposals.push(proposal);
  }

  return {
    ok: true,
    run: { ...run, proposals },
    intent,
    plan,
    reads,
    executeEnabled: executeKillSwitchOn(context.env)
  };
}

async function runReadTool(pool, coachId, tool, input) {
  if (tool.id === "tasks.list" || tool.id === "tasks.daily_summary") {
    const tasks = await listCoachTasks(pool, coachId, { status: "open", limit: 40 });
    if (tool.id === "tasks.daily_summary") {
      return {
        items: tasks,
        summary: {
          total: tasks.length,
          overdue: tasks.filter((task) => task.dueAt && new Date(task.dueAt).getTime() < Date.now()).length
        }
      };
    }
    return { items: tasks };
  }

  const clients = await pool.query(
    `SELECT id, display_name, unread_count, last_workout_at, next_check_at, paid, program_expires_at, created_at
     FROM coach_clients
     WHERE coach_user_id = $1 AND status <> 'removed'
     ORDER BY display_name ASC`,
    [coachId]
  );
  const rows = clients.rows || [];
  const now = Date.now();
  if (tool.id === "clients.search") {
    const q = String(input.query || "").toLowerCase();
    return {
      items: rows.filter((row) => !q || String(row.display_name || "").toLowerCase().includes(q)).slice(0, 20)
        .map(publicClient)
    };
  }
  if (tool.id === "clients.inactive") {
    return {
      items: rows.filter((row) => {
        const last = row.last_workout_at ? new Date(row.last_workout_at).getTime() : 0;
        return !last || last < now - 7 * 86400000;
      }).map(publicClient)
    };
  }
  if (tool.id === "checkins.missing") {
    return {
      items: rows.filter((row) => row.next_check_at && new Date(row.next_check_at).getTime() <= now).map(publicClient)
    };
  }
  if (tool.id === "messages.unread") {
    return {
      items: rows.filter((row) => Number(row.unread_count || 0) > 0).map(publicClient)
    };
  }
  if (input.clientId && (tool.id === "clients.status" || tool.id === "clients.activity" || tool.id === "program.status")) {
    const resource = await loadClientResource(pool, coachId, input.clientId);
    if (!resource) return { items: [] };
    return {
      items: [{
        ...publicClient(resource.client),
        revision: resource.revision,
        fingerprint: resource.fingerprint,
        programTitle: resource.data && resource.data.activeProgram && resource.data.activeProgram.title
      }]
    };
  }
  return { items: rows.slice(0, 12).map(publicClient) };
}

async function buildProposalForTool(pool, coachId, run, tool, input, context) {
  const prefs = await loadCoachPreferences(pool, coachId);
  const clientId = input.clientId || null;
  const resource = clientId ? await loadClientResource(pool, coachId, clientId) : null;
  const why = whyForTool(tool, input, prefs);
  const payload = payloadForTool(tool, input, prefs, resource);
  const targetSet = resolveTargetSet(tool, input);
  const preview = {
    action: tool.id,
    impact: tool.impact,
    confirmation: tool.confirmation,
    targetCount: targetSet.length || (clientId ? 1 : 0),
    targets: targetSet,
    executeEnabled: executeKillSwitchOn(context.env)
  };
  return saveAgentProposal(pool, coachId, {
    runId: run.id,
    clientId,
    toolId: tool.id,
    summary: summaryForTool(tool, input, prefs),
    why,
    payload,
    preview,
    targetSet,
    expectedRevision: resource && resource.revision,
    expectedFingerprint: resource && resource.fingerprint,
    beforeState: resource ? { data: resource.data, revision: resource.revision } : payload
  });
}

function whyForTool(tool, input, prefs) {
  const read = (input.reads || []).find((row) => Array.isArray(row.result && row.result.items));
  const count = read && read.result.items ? read.result.items.length : 0;
  if (tool.id === "program.propose_deload") {
    return buildWhy({
      formulaVersion: "coach_preferences.deloadStrategy",
      windowDays: 28,
      viewData: { view: "coachClient", clientId: input.clientId },
      reasons: [{
        statement: "Deload proposed using the coach preferred strategy.",
        evidence: { strategy: prefs.preferences.deloadStrategy, clientId: input.clientId },
        kind: "recommendation"
      }]
    });
  }
  if (tool.id === "checkins.prepare_request" || tool.id === "checkins.request") {
    return buildWhy({
      windowDays: 7,
      viewData: { view: "coachCheckIns", clientId: input.clientId },
      reasons: [{
        statement: "A check-in request is justified by missing or due check-in data.",
        evidence: { missingOrDue: count, clientId: input.clientId }
      }]
    });
  }
  if (tool.id === "messages.prepare" || tool.id === "messages.send") {
    return buildWhy({
      viewData: { view: "coachChat", clientId: input.clientId },
      reasons: [{
        statement: "Message draft uses the coach communication style preference.",
        evidence: { style: prefs.preferences.communicationStyle, unreadOrInactive: count }
      }]
    });
  }
  return buildWhy({
    viewData: input.clientId ? { view: "coachClient", clientId: input.clientId } : { view: "coachToday" },
    reasons: [{
      statement: "Proposal generated from the classified intent and current Coach data.",
      evidence: { intent: input.message, matchingItems: count, tool: tool.id }
    }]
  });
}

function payloadForTool(tool, input, prefs, resource) {
  if (tool.id === "program.propose_deload") {
    return {
      clientId: input.clientId,
      strategy: prefs.preferences.deloadStrategy,
      operations: [{ type: "apply_deload", reason: "agent_deload" }]
    };
  }
  if (tool.id === "messages.prepare" || tool.id === "messages.send") {
    return {
      clientId: input.clientId,
      body: input.payload.body || defaultMessage(input, prefs),
      encryptedBody: input.payload.encryptedBody || null
    };
  }
  if (tool.id === "checkins.prepare_request" || tool.id === "checkins.request") {
    return { clientId: input.clientId, note: input.payload.note || "Check-in richiesto da Nurvan Agent" };
  }
  if (tool.id === "tasks.create") {
    return { title: input.payload.title || input.message.slice(0, 80), clientId: input.clientId, priority: "normal" };
  }
  if (tool.id === "program.assign" || tool.id === "program.apply_modification" || tool.id === "program.draft" || tool.id === "program.propose_modification") {
    return {
      clientId: input.clientId,
      kinds: input.payload.kinds || ["training"],
      data: input.payload.data || (resource && resource.data) || {}
    };
  }
  return { ...input.payload, clientId: input.clientId };
}

function summaryForTool(tool, input) {
  const labels = {
    "program.propose_deload": "Proposta deload",
    "program.draft": "Bozza programma",
    "program.propose_modification": "Proposta modifica programma",
    "messages.prepare": "Bozza messaggio",
    "checkins.prepare_request": "Bozza richiesta check-in",
    "tasks.create": "Crea task",
    "program.assign": "Assegna programma",
    "program.apply_modification": "Applica modifica programma",
    "messages.send": "Invia messaggio",
    "checkins.request": "Richiedi check-in"
  };
  return labels[tool.id] || tool.id;
}

function defaultMessage(input, prefs) {
  const style = prefs.preferences.communicationStyle;
  const prefix = style === "warm" ? "Ciao, ti scrivo per un aggiornamento: " : "";
  return prefix + String(input.message || "Aggiornamento dal coach").slice(0, 280);
}

function resolveTargetSet(tool, input) {
  if (input.payload && Array.isArray(input.payload.targets)) {
    return input.payload.targets.map((id) => ({ clientId: String(id) }));
  }
  const fromReads = (input.reads || [])
    .flatMap((row) => (row.result && row.result.items) || [])
    .map((row) => row.id || row.clientId)
    .filter(Boolean)
    .slice(0, 25)
    .map((id) => ({ clientId: String(id) }));
  if (tool.target === "portfolio" && fromReads.length) return fromReads;
  return input.clientId ? [{ clientId: String(input.clientId) }] : [];
}

function publicClient(row) {
  return {
    id: String(row.id),
    displayName: row.display_name,
    unreadCount: Number(row.unread_count || 0),
    lastWorkoutAt: row.last_workout_at || null,
    nextCheckAt: row.next_check_at || null,
    paid: !!row.paid
  };
}

export {
  confirmAgentProposal,
  getAgentRun,
  listAgentAudit,
  loadCoachPreferences,
  saveCoachPreferences,
  undoAgentProposal
};
