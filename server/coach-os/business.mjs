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

export const PAYMENT_METHODS = Object.freeze(["cash", "transfer", "card", "other"]);

// The figure is optional: a payment can be noted without one, and then it is
// not counted in any total (it is not a payment of zero).
export function paymentAmount(input = {}) {
  const raw = input.amountCents;
  if (raw === null || raw === undefined || raw === "") return { cents: 0, has: false };
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n < 0 || n > 100000000) throw new Error("Importo non valido.");
  return { cents: n, has: true };
}

export async function recordPaymentEvent(pool, coachId, input = {}) {
  const amount = paymentAmount(input);
  let occurredAt = null;
  if (input.occurredAt) {
    const d = new Date(input.occurredAt);
    if (Number.isNaN(d.getTime())) throw new Error("Data non valida.");
    occurredAt = d.toISOString();
  }
  const method = PAYMENT_METHODS.includes(String(input.method || "")) ? String(input.method) : null;
  const result = await pool.query(
    `INSERT INTO coach_payment_events(
       coach_user_id, client_id, plan_id, kind, amount_cents, currency, note, occurred_at, method, label, has_amount
     ) VALUES($1,$2,$3,$4,$5,$6,$7,COALESCE($8::timestamptz, NOW()),$9,$10,$11)
     RETURNING *`,
    [
      coachId,
      input.clientId,
      input.planId || null,
      clean(input.kind || "paid", 20),
      amount.cents,
      clean(input.currency || "EUR", 8),
      clean(input.note, 240) || null,
      occurredAt,
      method,
      clean(input.label, 80) || null,
      amount.has
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

export async function listPaymentEvents(pool, coachId, { limit = 2000 } = {}) {
  const result = await pool.query(
    `SELECT e.*, c.display_name AS client_name
     FROM coach_payment_events e
     LEFT JOIN coach_clients c ON c.id = e.client_id
     WHERE e.coach_user_id = $1
     ORDER BY e.occurred_at DESC
     LIMIT $2`,
    [coachId, Math.min(5000, Math.max(1, Number(limit) || 2000))]
  );
  return (result.rows || []).map(eventRow);
}

// A payment written by mistake: only the coach who wrote it removes it.
export async function deletePaymentEvent(pool, coachId, id) {
  const result = await pool.query(
    "DELETE FROM coach_payment_events WHERE id = $1 AND coach_user_id = $2 RETURNING id",
    [id, coachId]
  );
  return !!result.rows[0];
}

// The totals of the ledger: everything, this year, this month, the last 30
// days, by month and by client. Payments without a figure are counted apart.
export function ledgerTotals(events, now = Date.now()) {
  const today = new Date(now);
  const yearKey = String(today.getFullYear());
  const monthKey = yearKey + "-" + String(today.getMonth() + 1).padStart(2, "0");
  const out = { allCents: 0, yearCents: 0, monthCents: 0, last30Cents: 0, count: 0, withoutAmount: 0, byMonth: [], byClient: [] };
  const months = new Map();
  const clients = new Map();
  for (const e of events || []) {
    if (!e || e.kind !== "paid") continue;
    out.count += 1;
    const when = new Date(e.occurredAt);
    const key = when.getFullYear() + "-" + String(when.getMonth() + 1).padStart(2, "0");
    const m = months.get(key) || { month: key, cents: 0, count: 0 };
    const c = clients.get(e.clientId) || { clientId: e.clientId, clientName: e.clientName || null, cents: 0, count: 0 };
    m.count += 1; c.count += 1;
    if (e.hasAmount === false) out.withoutAmount += 1;
    else {
      const cents = money(e.amountCents);
      out.allCents += cents;
      if (String(when.getFullYear()) === yearKey) out.yearCents += cents;
      if (key === monthKey) out.monthCents += cents;
      if (when.getTime() >= now - 30 * 86400000) out.last30Cents += cents;
      m.cents += cents; c.cents += cents;
    }
    months.set(key, m); clients.set(e.clientId, c);
  }
  out.byMonth = [...months.values()].sort((a, b) => (a.month < b.month ? 1 : -1));
  out.byClient = [...clients.values()].sort((a, b) => b.cents - a.cents);
  return out;
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
    clientName: row.client_name || null,
    kind: row.kind,
    amountCents: money(row.amount_cents),
    hasAmount: row.has_amount !== false,
    currency: row.currency,
    occurredAt: row.occurred_at,
    method: row.method || null,
    label: row.label || "",
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

export const BusinessTestHelpers = Object.freeze({ money, summarizeBusiness, ledgerTotals, paymentAmount });
