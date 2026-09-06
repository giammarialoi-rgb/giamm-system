import { isCoachOsFeatureEnabled } from "../../feature-flags.mjs";
import { getTool } from "./registry.mjs";

const MEDICAL_DOMAINS = new Set(["therapy", "exams"]);

export function evaluateAgentPermission({
  toolId,
  role = "coach",
  flags = {},
  env = process.env,
  ownedClientIds = [],
  clientId = null,
  targetIds = [],
  domainConsent = {},
  executeEnabled = true
} = {}) {
  const tool = getTool(toolId);
  const errors = [];
  if (!tool.roles.includes(role)) errors.push("role_denied");
  if (tool.featureFlag && !isCoachOsFeatureEnabled(tool.featureFlag, { env, overrides: flags })) {
    errors.push("feature_disabled");
  }
  if (tool.capability === "EXECUTE" && !executeEnabled) errors.push("execute_kill_switch");

  const targets = uniqueIds([clientId, ...asArray(targetIds)]);
  if (tool.target === "client" || tool.target === "portfolio") {
    for (const id of targets) {
      if (id && !ownedClientIds.map(String).includes(String(id))) errors.push("ownership_denied:" + id);
    }
  }
  if (tool.target === "client" && tool.required.includes("clientId") && !targets.length) {
    errors.push("missing_client");
  }

  const requestedDomains = asArray(domainConsent.requested);
  for (const domain of requestedDomains) {
    if (MEDICAL_DOMAINS.has(domain) && domainConsent[domain] !== true) {
      errors.push("medical_consent_denied:" + domain);
    }
  }

  return {
    allowed: errors.length === 0,
    errors,
    tool
  };
}

export function assertAgentPermission(input) {
  const result = evaluateAgentPermission(input);
  if (!result.allowed) {
    const error = new Error("Agent permission denied.");
    error.code = "AGENT_FORBIDDEN";
    error.details = result.errors;
    throw error;
  }
  return result;
}

function asArray(value) {
  return Array.isArray(value) ? value : value == null || value === "" ? [] : [value];
}

function uniqueIds(values) {
  return [...new Set(asArray(values).map(String).filter(Boolean))];
}

export const AgentPermissionTestHelpers = Object.freeze({ MEDICAL_DOMAINS });
