import crypto from "node:crypto";
import { getTool, listTools } from "./registry.mjs";

const INTENT_RULES = [
  { id: "inactive_clients", pattern: /inattiv|inactive|no workout|non si allena/i, tools: ["clients.inactive"] },
  { id: "missing_checkins", pattern: /check-?in manc|missing check|senza check/i, tools: ["checkins.missing"] },
  { id: "unread", pattern: /non lett|unread|messaggi da leggere/i, tools: ["messages.unread"] },
  { id: "task_summary", pattern: /task|compiti|riepilogo giornal/i, tools: ["tasks.daily_summary", "tasks.list"] },
  { id: "client_status", pattern: /stato|status|come sta/i, tools: ["clients.status", "program.status", "clients.activity"] },
  { id: "search_clients", pattern: /cerca|search|trova client/i, tools: ["clients.search"] },
  { id: "deload", pattern: /deload|scarico/i, tools: ["program.propose_deload"] },
  { id: "program_change", pattern: /modifica program|program modification|cambia scheda/i, tools: ["program.propose_modification"] },
  { id: "program_draft", pattern: /bozza|draft|nuovo program/i, tools: ["program.draft"] },
  { id: "prepare_message", pattern: /messagg|message|scrivi/i, tools: ["messages.prepare"] },
  { id: "request_checkin", pattern: /richiedi check|request check/i, tools: ["checkins.prepare_request"] },
  { id: "create_task", pattern: /crea task|create task|aggiungi task/i, tools: ["tasks.create"] }
];

export function classifyAgentIntent(message) {
  const text = String(message || "").trim();
  const matches = INTENT_RULES.filter((rule) => rule.pattern.test(text));
  const primary = matches[0] || { id: "understand_portfolio", tools: ["clients.search", "tasks.daily_summary"] };
  return {
    id: primary.id,
    confidence: matches.length ? 0.86 : 0.4,
    tools: primary.tools,
    text
  };
}

export function buildWhy({ reasons, formulaVersion, windowDays, viewData, inference }) {
  const items = (Array.isArray(reasons) ? reasons : []).filter((row) => row && row.evidence != null);
  return {
    reasons: items.map((row) => ({
      statement: row.statement,
      evidence: row.evidence,
      formulaVersion: row.formulaVersion || formulaVersion || null,
      windowDays: row.windowDays || windowDays || null,
      kind: row.kind || "data"
    })),
    viewData: viewData || null,
    inference: inference || null,
    generatedAt: new Date().toISOString()
  };
}

export function resourceFingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value || {})).digest("hex");
}

export function planFromIntent(intent, context = {}) {
  const tools = (intent.tools || []).map((id) => getTool(id));
  const read = tools.filter((tool) => tool.capability === "READ");
  const propose = tools.filter((tool) => tool.capability === "PROPOSE");
  const execute = tools.filter((tool) => tool.capability === "EXECUTE" && tool.impact === "low");
  return {
    intent: intent.id,
    steps: [
      { stage: "understand", tools: read.map((tool) => tool.id) },
      { stage: "plan", tools: propose.concat(execute).map((tool) => tool.id) },
      { stage: "preview", confirmationRequired: propose.length + execute.length > 0 }
    ],
    availableTools: listTools({ role: context.role || "coach" }).map((tool) => tool.id)
  };
}

export const PlannerTestHelpers = Object.freeze({ INTENT_RULES });
