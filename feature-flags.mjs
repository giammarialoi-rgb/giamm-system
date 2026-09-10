/**
 * Shared Coach OS feature flags.
 *
 * Defaults are fail-closed so a new server can deploy before the matching UI.
 * Resolution order: defaults < environment < per-coach database overrides.
 */

export const COACH_OS_FEATURE_DEFAULTS = Object.freeze({
  coachShellV2: true,
  coachTodayV2: true,
  coachOverviewV2: false,
  coachImportV2: true,
  coachTasksV1: true,
  clientTimelineV1: true,
  clientIntelligence: true,
  checkInCenterV1: true,
  agentV1: true,
  schedulingV1: true,
  coachAnalyticsV1: true,
  businessV1: true,
  inboxV2: true,
  athleteBrainV1: true,
  mealAiV1: true,
  videoFormV1: true
});

export const COACH_OS_FEATURE_NAMES = Object.freeze(Object.keys(COACH_OS_FEATURE_DEFAULTS));

function envNameForFlag(name) {
  return "NURVAN_FEATURE_" + String(name)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toUpperCase();
}

export function parseFeatureBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value == null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) return true;
  if (["0", "false", "no", "off", "disabled"].includes(normalized)) return false;
  return fallback;
}

export function sanitizeFeatureFlagOverrides(raw) {
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const out = {};
  for (const name of COACH_OS_FEATURE_NAMES) {
    if (typeof input[name] === "boolean") out[name] = input[name];
  }
  return out;
}

export function resolveCoachOsFeatureFlags({ env = process.env, overrides = null } = {}) {
  const out = { ...COACH_OS_FEATURE_DEFAULTS };
  for (const name of COACH_OS_FEATURE_NAMES) {
    const envName = envNameForFlag(name);
    if (env && Object.prototype.hasOwnProperty.call(env, envName)) {
      out[name] = parseFeatureBoolean(env[envName], out[name]);
    }
  }
  return Object.freeze({ ...out, ...sanitizeFeatureFlagOverrides(overrides) });
}

export function isCoachOsFeatureEnabled(name, context = {}) {
  if (!COACH_OS_FEATURE_NAMES.includes(String(name))) return false;
  return resolveCoachOsFeatureFlags(context)[name] === true;
}

export function coachOsFeaturePublicPayload(context = {}) {
  return {
    version: 1,
    flags: resolveCoachOsFeatureFlags(context)
  };
}

export default resolveCoachOsFeatureFlags;
