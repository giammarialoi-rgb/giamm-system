import { AGENT_V1_TOOL_DEFS, getAgentToolDef, listAgentTools, validateAgentToolInput } from "../../action-catalog.mjs";

export const AGENT_V1_EXCLUDED_DOMAINS = Object.freeze([
  "scheduling",
  "business",
  "payments",
  "crm",
  "automations",
  "broadcast",
  "groups"
]);

export function isAgentV1Tool(toolId) {
  return !!getAgentToolDef(toolId);
}

export function getTool(toolId) {
  const tool = getAgentToolDef(toolId);
  if (!tool) {
    const error = new Error("Unknown or out-of-scope Agent tool.");
    error.code = "UNKNOWN_TOOL";
    throw error;
  }
  if (AGENT_V1_EXCLUDED_DOMAINS.some((domain) => String(toolId).startsWith(domain + "."))) {
    const error = new Error("This tool is excluded from Agent V1.");
    error.code = "TOOL_NOT_IN_V1";
    throw error;
  }
  return tool;
}

export function listTools(filters = {}) {
  return listAgentTools(filters).filter((tool) => !AGENT_V1_EXCLUDED_DOMAINS.some((domain) => tool.id.startsWith(domain + ".")));
}

export function validateToolInput(toolId, input) {
  const tool = getTool(toolId);
  return { ...validateAgentToolInput(toolId, input), tool };
}

export function maxAgentBatchSize(env = process.env) {
  const parsed = Number(env.AGENT_MAX_BATCH_SIZE);
  if (Number.isFinite(parsed) && parsed > 0) return Math.min(100, Math.floor(parsed));
  return 25;
}

export function executeKillSwitchOn(env = process.env) {
  const raw = String(env.NURVAN_AGENT_EXECUTE || env.NURVAN_FEATURE_AGENT_EXECUTE || "true").toLowerCase();
  return !["0", "false", "off", "disabled"].includes(raw);
}

export const AgentRegistry = Object.freeze({
  defs: AGENT_V1_TOOL_DEFS,
  getTool,
  listTools,
  validateToolInput,
  maxAgentBatchSize,
  executeKillSwitchOn
});
