import crypto from "node:crypto";

export const HEALTH_EVENT_TYPES = new Set([
  "activity", "sleep", "heart_rate", "hrv", "weight", "body_fat", "nutrition", "hydration", "blood_glucose", "ecg"
]);

export function normalizeHealthEvent(input = {}) {
  const eventType = String(input.type || input.eventType || "unknown").toLowerCase();
  const occurredAt = input.occurredAt || input.timestamp || input.time || new Date().toISOString();
  const source = String(input.source || "google-health");
  const raw = input.data && typeof input.data === "object" ? input.data : input;
  const id = String(input.id || input.eventId || crypto.createHash("sha256")
    .update(`${source}:${eventType}:${occurredAt}:${JSON.stringify(raw)}`).digest("hex"));
  return { id, source, type: HEALTH_EVENT_TYPES.has(eventType) ? eventType : "unknown", occurredAt: new Date(occurredAt).toISOString(), data: raw };
}

export function verifyWebhookSignature(rawBody, signature, secret) {
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = String(signature || "").replace(/^sha256=/, "");
  return received.length === expected.length && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}
