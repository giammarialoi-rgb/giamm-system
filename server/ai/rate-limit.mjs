import { AiGatewayError } from './errors.mjs';

export function createRateLimiter(store, config) {
  return {
    async checkIp(ip) {
      const key = `rl:ip:${ip || 'unknown'}`;
      const { count, resetAt } = await store.incr(key, config.rateLimitWindowMs);
      if (count > config.rateLimitMaxIp) {
        throw new AiGatewayError('AI_RATE_LIMITED', undefined, {
          scope: 'ip',
          retryAfterSec: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
        });
      }
      return { count, resetAt };
    },
    async checkUser(userId) {
      const key = `rl:user:${userId}`;
      const { count, resetAt } = await store.incr(key, config.rateLimitWindowMs);
      if (count > config.rateLimitMaxUser) {
        throw new AiGatewayError('AI_RATE_LIMITED', undefined, {
          scope: 'user',
          retryAfterSec: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
        });
      }
      return { count, resetAt };
    }
  };
}
