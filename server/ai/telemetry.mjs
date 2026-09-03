/**
 * Structured AI telemetry — no secrets, no full conversation text.
 */

export function createAiTelemetry(options = {}) {
  const maxEvents = options.maxEvents || 2000;
  const events = [];
  const counters = {
    requests: 0,
    success: 0,
    errors: 0,
    rateLimited: 0,
    quotaExceeded: 0,
    timeouts: 0,
    provider429: 0,
    provider5xx: 0
  };

  function push(evt) {
    events.push(evt);
    if (events.length > maxEvents) events.shift();
  }

  return {
    record(evt) {
      counters.requests += 1;
      if (evt.ok) counters.success += 1;
      else counters.errors += 1;
      if (evt.code === 'AI_RATE_LIMITED') counters.rateLimited += 1;
      if (evt.code === 'AI_QUOTA_EXCEEDED') counters.quotaExceeded += 1;
      if (evt.code === 'AI_TIMEOUT') counters.timeouts += 1;
      if (evt.providerStatus === 429) counters.provider429 += 1;
      if (evt.providerStatus >= 500) counters.provider5xx += 1;

      const safe = {
        ts: new Date().toISOString(),
        requestId: evt.requestId,
        userId: evt.userId ? String(evt.userId) : null,
        plan: evt.plan || null,
        endpoint: evt.endpoint || '/api/chat',
        model: evt.model,
        durationMs: evt.durationMs,
        ok: Boolean(evt.ok),
        code: evt.code || null,
        inputTokens: evt.inputTokens || 0,
        outputTokens: evt.outputTokens || 0,
        estimatedCostUsd: evt.estimatedCostUsd || 0,
        cached: Boolean(evt.cached),
        providerStatus: evt.providerStatus || null
      };
      push(safe);
      // Application log line (no message body). Suppress noisy rate-limit spam unless AI_TELEMETRY_VERBOSE=1
      const verbose = process.env.AI_TELEMETRY_VERBOSE === '1';
      if (verbose || (safe.code !== 'AI_RATE_LIMITED' && safe.code !== 'AI_QUOTA_EXCEEDED')) {
        console.info('[AI_TELEMETRY]', JSON.stringify(safe));
      }
      return safe;
    },

    estimateCost(config, inputTokens, outputTokens) {
      const inCost = ((inputTokens || 0) / 1e6) * (config.costInputPer1M || 0);
      const outCost = ((outputTokens || 0) / 1e6) * (config.costOutputPer1M || 0);
      return Math.round((inCost + outCost) * 1e6) / 1e6;
    },

    snapshot() {
      const byUser = new Map();
      for (const e of events) {
        if (!e.userId) continue;
        const cur = byUser.get(e.userId) || { requests: 0, tokens: 0, cost: 0 };
        cur.requests += 1;
        cur.tokens += (e.inputTokens || 0) + (e.outputTokens || 0);
        cur.cost += e.estimatedCostUsd || 0;
        byUser.set(e.userId, cur);
      }
      const topUsers = [...byUser.entries()]
        .map(([userId, s]) => ({ userId, ...s }))
        .sort((a, b) => b.cost - a.cost || b.requests - a.requests)
        .slice(0, 20);

      const okN = counters.success || 1;
      const totalCost = events.reduce((s, e) => s + (e.estimatedCostUsd || 0), 0);
      const totalReq = counters.requests || 1;

      return {
        counters: { ...counters },
        avgCostPerRequest: Math.round((totalCost / totalReq) * 1e6) / 1e6,
        avgLatencyMs:
          Math.round(
            events.filter((e) => e.ok).reduce((s, e) => s + (e.durationMs || 0), 0) / okN
          ) || 0,
        topUsers,
        recent: events.slice(-20)
      };
    },

    reset() {
      events.length = 0;
      Object.keys(counters).forEach((k) => {
        counters[k] = 0;
      });
    }
  };
}
