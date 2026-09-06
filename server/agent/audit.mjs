export async function writeAgentAudit(pool, entry = {}) {
  const result = await pool.query(
    `INSERT INTO agent_audit_log(
       coach_user_id, client_id, run_id, proposal_id, action_id, tool_id,
       capability, actor_role, outcome, reason, before_fingerprint,
       after_fingerprint, target_set, details
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      entry.coachUserId,
      entry.clientId || null,
      entry.runId || null,
      entry.proposalId || null,
      entry.actionId || ("act_" + Date.now()),
      entry.toolId,
      entry.capability,
      entry.actorRole || "coach",
      entry.outcome,
      entry.reason || null,
      entry.beforeFingerprint || null,
      entry.afterFingerprint || null,
      JSON.stringify(entry.targetSet || []),
      JSON.stringify(entry.details || {})
    ]
  );
  return auditRow(result.rows[0]);
}

export async function listAgentAudit(pool, coachId, options = {}) {
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 40));
  const result = await pool.query(
    `SELECT * FROM agent_audit_log
     WHERE coach_user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [coachId, limit]
  );
  return (result.rows || []).map(auditRow);
}

function auditRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    coachUserId: String(row.coach_user_id),
    clientId: row.client_id == null ? null : String(row.client_id),
    runId: row.run_id || null,
    proposalId: row.proposal_id || null,
    actionId: row.action_id,
    toolId: row.tool_id,
    capability: row.capability,
    actorRole: row.actor_role,
    outcome: row.outcome,
    reason: row.reason || null,
    beforeFingerprint: row.before_fingerprint || null,
    afterFingerprint: row.after_fingerprint || null,
    targetSet: row.target_set || [],
    details: row.details || {},
    createdAt: row.created_at
  };
}
