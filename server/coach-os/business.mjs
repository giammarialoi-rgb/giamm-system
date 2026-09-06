export const CRM_STAGES = Object.freeze([
  "LEAD",
  "TRIAL",
  "ACTIVE",
  "PAUSED",
  "CHURN_RISK",
  "CHURNED"
]);

function clean(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function money(cents) {
  return Math.round(Number(cents || 0));
}

export function summarizeBusiness(plans, events, now = Date.now()) {
  const active = plans.filter((plan) => plan.status === "active");
  const revenue30 = events
    .filter((event) => event.kind === "paid" && new Date(event.occurredAt).getTime() >= now - 30 * 86400000)
    .reduce((sum, event) => sum + money(event.amountCents), 0);
  const overdue = active.filter((plan) => plan.nextDueAt && new Date(plan.nextDueAt).getTime() < now);
  const renewals = active.filter((plan) => {
    if (!plan.nextDueAt) return false;
    const due = new Date(plan.nextDueAt).getTime();
    return due >= now && due <= now + 14 * 86400000;
  });
  const mrr = active
    .filter((plan) => plan.cadence === "monthly")
    .reduce((sum, plan) => sum + money(plan.amountCents), 0);
  return {
    activeClients: active.length,
    revenue30dCents: revenue30,
    mrrCents: mrr,
    overdue: overdue.length,
    upcomingRenewals: renewals.length,
    overdueItems: overdue,
    renewalItems: renewals,
    stripeRequired: false
  };
}

export async function listClientPlans(pool, coachId) {
  const result = await pool.query(
    `SELECT p.*, c.display_name AS client_name
     FROM coach_client_plans p
     JOIN coach_clients c ON c.id = p.client_id
     WHERE p.coach_user_id = $1
     ORDER BY p.next_due_at NULLS LAST, p.updated_at DESC`,
    [coachId]
  );
  return (result.rows || []).map(planRow);
}

export async function upsertClientPlan(pool, coachId, input = {}) {
  const name = clean(input.name || "Monthly coaching", 80);
  const result = await pool.query(
    `INSERT INTO coach_client_plans(
       coach_user_id, client_id, name, amount_cents, currency, cadence, status, next_due_at
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      coachId,
      input.clientId,
      name,
      money(input.amountCents),
      clean(input.currency || "EUR", 8),
      clean(input.cadence || "monthly", 20),
      clean(input.status || "active", 20),
      input.nextDueAt || null
    ]
  );
  return planRow(result.rows[0]);
}

export async function recordPaymentEvent(pool, coachId, input = {}) {
  const result = await pool.query(
    `INSERT INTO coach_payment_events(
       coach_user_id, client_id, plan_id, kind, amount_cents, currency, note
     ) VALUES($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      coachId,
      input.clientId,
      input.planId || null,
      clean(input.kind || "paid", 20),
      money(input.amountCents),
      clean(input.currency || "EUR", 8),
      clean(input.note, 240) || null
    ]
  );
  if (input.kind === "paid" && input.clientId) {
    await pool.query(
      "UPDATE coach_clients SET paid = TRUE, next_due_at = COALESCE($2, next_due_at) WHERE id = $1 AND coach_user_id = $3",
      [input.clientId, input.nextDueAt || null, coachId]
    );
  }
  return eventRow(result.rows[0]);
}

export async function listPaymentEvents(pool, coachId) {
  const result = await pool.query(
    `SELECT * FROM coach_payment_events
     WHERE coach_user_id = $1
     ORDER BY occurred_at DESC
     LIMIT 80`,
    [coachId]
  );
  return (result.rows || []).map(eventRow);
}

export async function updateCrmStage(pool, coachId, clientId, input = {}) {
  const stage = clean(input.stage || "ACTIVE", 20).toUpperCase();
  if (!CRM_STAGES.includes(stage)) throw new Error("Invalid CRM stage.");
  await pool.query(
    `UPDATE coach_clients
     SET crm_stage = $3, crm_source = COALESCE($4, crm_source),
         crm_value = COALESCE($5, crm_value), crm_next_action = COALESCE($6, crm_next_action)
     WHERE id = $1 AND coach_user_id = $2`,
    [clientId, coachId, stage, input.source || null, input.value == null ? null : Number(input.value), input.nextAction || null]
  );
  if (input.note) {
    await pool.query(
      "INSERT INTO coach_crm_notes(coach_user_id, client_id, body) VALUES($1,$2,$3)",
      [coachId, clientId, clean(input.note, 800)]
    );
  }
  return { clientId: String(clientId), stage };
}

export async function listCrmPipeline(pool, coachId) {
  const result = await pool.query(
    `SELECT id, display_name, crm_stage, crm_source, crm_value, crm_next_action, paid, next_due_at
     FROM coach_clients
     WHERE coach_user_id = $1 AND status <> 'removed'
     ORDER BY display_name ASC`,
    [coachId]
  );
  return (result.rows || []).map((row) => ({
    id: String(row.id),
    name: row.display_name,
    stage: row.crm_stage || "ACTIVE",
    source: row.crm_source,
    value: row.crm_value,
    nextAction: row.crm_next_action,
    paid: !!row.paid,
    nextDueAt: row.next_due_at
  }));
}

export async function createAutomation(pool, coachId, input = {}) {
  const result = await pool.query(
    `INSERT INTO automation_rules(coach_user_id, name, trigger, conditions, action, enabled)
     VALUES($1,$2,$3,$4,$5,FALSE)
     RETURNING *`,
    [
      coachId,
      clean(input.name, 80) || "Automation",
      clean(input.trigger || "check_in_received", 60),
      JSON.stringify(input.conditions || {}),
      clean(input.action || "create_task", 60)
    ]
  );
  return automationRow(result.rows[0]);
}

export async function setAutomationEnabled(pool, coachId, id, enabled) {
  const result = await pool.query(
    `UPDATE automation_rules SET enabled = $3, updated_at = NOW()
     WHERE id = $1 AND coach_user_id = $2
     RETURNING *`,
    [id, coachId, !!enabled]
  );
  return result.rows[0] ? automationRow(result.rows[0]) : null;
}

export async function recordFailedAutomation(pool, coachId, rule, error) {
  const { createCoachTask } = await import("./workspace.mjs");
  const task = await createCoachTask(pool, coachId, {
    title: "Automation failed: " + String(rule.name || rule.action || "rule"),
    source: "automation",
    priority: "high",
    metadata: { ruleId: rule.id, error: String(error && error.message || error || "failed") }
  });
  return { task, failed: true };
}

export async function runAutomation(pool, coachId, id, context = {}) {
  const rule = await pool.query(
    "SELECT * FROM automation_rules WHERE id = $1 AND coach_user_id = $2",
    [id, coachId]
  );
  if (!rule.rows[0]) throw new Error("Automation not found.");
  try {
    const result = {
      matched: Number(context.matchCount || 0),
      action: rule.rows[0].action,
      trigger: rule.rows[0].trigger
    };
    await pool.query(
      `INSERT INTO automation_runs(rule_id, coach_user_id, dry_run, status, result)
       VALUES($1,$2,FALSE,'completed',$3)`,
      [id, coachId, JSON.stringify(result)]
    );
    return result;
  } catch (error) {
    await pool.query(
      `INSERT INTO automation_runs(rule_id, coach_user_id, dry_run, status, result)
       VALUES($1,$2,FALSE,'failed',$3)`,
      [id, coachId, JSON.stringify({ error: error.message })]
    );
    return recordFailedAutomation(pool, coachId, automationRow(rule.rows[0]), error);
  }
}

export async function runAutomationDry(pool, coachId, id, context = {}) {
  const rule = await pool.query(
    "SELECT * FROM automation_rules WHERE id = $1 AND coach_user_id = $2",
    [id, coachId]
  );
  if (!rule.rows[0]) throw new Error("Automation not found.");
  const preview = {
    wouldMatch: Number(context.matchCount || 0),
    action: rule.rows[0].action,
    trigger: rule.rows[0].trigger
  };
  await pool.query(
    `INSERT INTO automation_runs(rule_id, coach_user_id, dry_run, status, result)
     VALUES($1,$2,TRUE,'preview',$3)`,
    [id, coachId, JSON.stringify(preview)]
  );
  return preview;
}

function planRow(row) {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    clientName: row.client_name || null,
    name: row.name,
    amountCents: money(row.amount_cents),
    currency: row.currency,
    cadence: row.cadence,
    status: row.status,
    nextDueAt: row.next_due_at
  };
}

function eventRow(row) {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    planId: row.plan_id == null ? null : String(row.plan_id),
    kind: row.kind,
    amountCents: money(row.amount_cents),
    currency: row.currency,
    occurredAt: row.occurred_at,
    note: row.note || ""
  };
}

function automationRow(row) {
  return {
    id: String(row.id),
    name: row.name,
    trigger: row.trigger,
    conditions: row.conditions || {},
    action: row.action,
    enabled: !!row.enabled
  };
}

export const BusinessTestHelpers = Object.freeze({ money, summarizeBusiness });
