/** Structured AI gateway errors — safe for clients, no secret leakage. */

export const AI_ERROR_CODES = {
  AI_NOT_CONFIGURED: 'AI_NOT_CONFIGURED',
  AI_AUTH_REQUIRED: 'AI_AUTH_REQUIRED',
  AI_RATE_LIMITED: 'AI_RATE_LIMITED',
  AI_QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',
  AI_INVALID_REQUEST: 'AI_INVALID_REQUEST',
  AI_TIMEOUT: 'AI_TIMEOUT',
  AI_PROVIDER_UNAVAILABLE: 'AI_PROVIDER_UNAVAILABLE',
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  AI_CIRCUIT_OPEN: 'AI_CIRCUIT_OPEN',
  AI_FORBIDDEN: 'AI_FORBIDDEN'
};

const STATUS = {
  AI_NOT_CONFIGURED: 503,
  AI_AUTH_REQUIRED: 401,
  AI_RATE_LIMITED: 429,
  AI_QUOTA_EXCEEDED: 429,
  AI_INVALID_REQUEST: 400,
  AI_TIMEOUT: 504,
  AI_PROVIDER_UNAVAILABLE: 503,
  AI_PROVIDER_ERROR: 502,
  AI_CIRCUIT_OPEN: 503,
  AI_FORBIDDEN: 403
};

const MESSAGES = {
  AI_NOT_CONFIGURED: 'Coach AI non configurato sul server.',
  AI_AUTH_REQUIRED: 'Accedi al tuo account per usare Coach AI.',
  AI_RATE_LIMITED: 'Troppe richieste. Riprova tra poco.',
  AI_QUOTA_EXCEEDED: 'Hai esaurito la quota Coach AI del tuo piano per questo periodo.',
  AI_INVALID_REQUEST: 'Richiesta Coach AI non valida.',
  AI_TIMEOUT: 'Coach AI non ha risposto in tempo. Riprova.',
  AI_PROVIDER_UNAVAILABLE: 'Coach AI temporaneamente non disponibile.',
  AI_PROVIDER_ERROR: 'Errore del servizio Coach AI. Riprova più tardi.',
  AI_CIRCUIT_OPEN: 'Coach AI temporaneamente sospeso per protezione del servizio.',
  AI_FORBIDDEN: 'Operazione non consentita.'
};

export class AiGatewayError extends Error {
  constructor(code, message, extras = {}) {
    super(message || MESSAGES[code] || 'AI error');
    this.name = 'AiGatewayError';
    this.code = code;
    this.statusCode = STATUS[code] || 500;
    this.extras = extras;
  }

  toJSON() {
    return {
      ok: false,
      error: this.message,
      code: this.code,
      ...this.extras
    };
  }
}

export function isAiGatewayError(err) {
  return err instanceof AiGatewayError || (err && err.name === 'AiGatewayError' && err.code);
}
