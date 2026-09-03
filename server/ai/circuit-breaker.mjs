import { AiGatewayError } from './errors.mjs';

export function createCircuitBreaker(config) {
  let failures = 0;
  let openUntil = 0;

  return {
    assertClosed() {
      if (Date.now() < openUntil) {
        throw new AiGatewayError('AI_CIRCUIT_OPEN', undefined, {
          retryAfterSec: Math.max(1, Math.ceil((openUntil - Date.now()) / 1000))
        });
      }
    },
    recordSuccess() {
      failures = 0;
      openUntil = 0;
    },
    recordFailure() {
      failures += 1;
      if (failures >= (config.circuitFailureThreshold || 8)) {
        openUntil = Date.now() + (config.circuitOpenMs || 30000);
        failures = 0;
      }
    },
    state() {
      return {
        open: Date.now() < openUntil,
        openUntil,
        failures
      };
    },
    reset() {
      failures = 0;
      openUntil = 0;
    }
  };
}
