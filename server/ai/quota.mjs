import { AiGatewayError } from './errors.mjs';

const MONTH_MS = 31 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizePlan(plan) {
  const p = String(plan || 'free').toLowerCase().trim();
  if (p === 'bronze' || p === 'silver' || p === 'gold' || p === 'free') return p;
  return 'free';
}

/**
 * Resolve plan server-side. Never trust body.plan from client.
 * Sources: account_data.accountPlan / entitlement.plan / JWT claim / default free.
 */
export function resolvePlanFromAccount(accountData, jwtClaims) {
  const data = accountData && typeof accountData === 'object' ? accountData : {};
  const fromData =
    data.accountPlan ||
    data.plan ||
    (data.entitlement && (data.entitlement.plan || data.entitlement.currentPlan)) ||
    null;
  const fromJwt = jwtClaims && (jwtClaims.plan || jwtClaims.accountPlan);
  return normalizePlan(fromData || fromJwt || 'free');
}

export function createQuotaService(store, config) {
  return {
    async checkAndConsume(userId, plan) {
      const p = normalizePlan(plan);
      const limit = config.monthlyQuota[p] ?? config.monthlyQuota.free;
      const key = `quota:month:${userId}:${new Date().toISOString().slice(0, 7)}`;
      const { count, resetAt } = await store.incr(key, MONTH_MS);
      if (count > limit) {
        throw new AiGatewayError('AI_QUOTA_EXCEEDED', undefined, {
          plan: p,
          used: count,
          limit,
          period: 'monthly'
        });
      }
      return { plan: p, used: count, limit, resetAt };
    },

    async checkTokens(userId, plan, estimatedTokens) {
      const p = normalizePlan(plan);
      const limit = config.dailyTokenLimit[p] ?? config.dailyTokenLimit.free;
      const day = new Date().toISOString().slice(0, 10);
      const key = `quota:tokens:${userId}:${day}`;
      const current = await store.get(key, DAY_MS);
      if ((current.tokens || 0) + estimatedTokens > limit) {
        throw new AiGatewayError('AI_QUOTA_EXCEEDED', undefined, {
          plan: p,
          usedTokens: current.tokens || 0,
          limit,
          period: 'daily_tokens'
        });
      }
      return { plan: p, usedTokens: current.tokens || 0, limit };
    },

    async recordTokens(userId, tokens) {
      const day = new Date().toISOString().slice(0, 10);
      const key = `quota:tokens:${userId}:${day}`;
      return store.addTokens(key, DAY_MS, tokens);
    }
  };
}
