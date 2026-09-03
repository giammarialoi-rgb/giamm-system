/**
 * AI Gateway configuration — all tunables via environment variables.
 */

function envInt(env, name, fallback) {
  const v = env[name];
  if (v === undefined || v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function envFloat(env, name, fallback) {
  const v = env[name];
  if (v === undefined || v === '') return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function envBool(env, name, fallback) {
  const v = env[name];
  if (v === undefined || v === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(v).toLowerCase());
}

export function createAiConfig(env = process.env) {
  return {
    model: env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
    apiKey: env.GEMINI_API_KEY || '',
    provider: (env.AI_PROVIDER || (env.MOCK_GEMINI === '1' ? 'mock' : 'gemini')).toLowerCase(),
    requireAuth: envBool(env, 'AI_REQUIRE_AUTH', true),
    rateLimitWindowMs: envInt(env, 'AI_RATE_LIMIT_WINDOW_MS', 60_000),
    rateLimitMaxIp: envInt(env, 'AI_RATE_LIMIT_MAX_REQUESTS', 60),
    rateLimitMaxUser: envInt(env, 'AI_USER_RATE_LIMIT_MAX_REQUESTS', 30),
    monthlyQuota: {
      free: envInt(env, 'AI_MONTHLY_REQUEST_LIMIT_FREE', 20),
      bronze: envInt(env, 'AI_MONTHLY_REQUEST_LIMIT_BRONZE', 100),
      silver: envInt(env, 'AI_MONTHLY_REQUEST_LIMIT_SILVER', 500),
      gold: envInt(env, 'AI_MONTHLY_REQUEST_LIMIT_GOLD', 5000)
    },
    dailyTokenLimit: {
      free: envInt(env, 'AI_DAILY_TOKEN_LIMIT_FREE', 50_000),
      bronze: envInt(env, 'AI_DAILY_TOKEN_LIMIT_BRONZE', 200_000),
      silver: envInt(env, 'AI_DAILY_TOKEN_LIMIT_SILVER', 1_000_000),
      gold: envInt(env, 'AI_DAILY_TOKEN_LIMIT_GOLD', 5_000_000)
    },
    maxQueryChars: envInt(env, 'AI_MAX_QUERY_CHARS', 4000),
    maxHistoryMessages: envInt(env, 'AI_MAX_HISTORY_MESSAGES', 8),
    maxContextChars: envInt(env, 'AI_MAX_CONTEXT_CHARS', 24_000),
    maxOutputTokens: envInt(env, 'AI_MAX_OUTPUT_TOKENS', 2048),
    timeoutMs: envInt(env, 'AI_TIMEOUT_MS', 45_000),
    maxRetries: envInt(env, 'AI_MAX_RETRIES', 2),
    retryBaseMs: envInt(env, 'AI_RETRY_BASE_MS', 400),
    cacheEnabled: envBool(env, 'AI_CACHE_ENABLED', true),
    cacheTtlMs: envInt(env, 'AI_CACHE_TTL_MS', 5 * 60_000),
    cacheMaxEntries: envInt(env, 'AI_CACHE_MAX_ENTRIES', 500),
    circuitFailureThreshold: envInt(env, 'AI_CIRCUIT_FAILURE_THRESHOLD', 8),
    circuitOpenMs: envInt(env, 'AI_CIRCUIT_OPEN_MS', 30_000),
    costInputPer1M: envFloat(env, 'AI_COST_INPUT_PER_1M', 0.10),
    costOutputPer1M: envFloat(env, 'AI_COST_OUTPUT_PER_1M', 0.40),
    storeBackend: (env.AI_STORE_BACKEND || 'memory').toLowerCase(),
    redisUrl: env.REDIS_URL || env.AI_REDIS_URL || '',
    nodeEnv: env.NODE_ENV || 'development'
  };
}

export default createAiConfig;
