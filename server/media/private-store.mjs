import crypto from "node:crypto";

const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime"
]);

const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
const DEFAULT_RETENTION_DAYS = 365;
const MAX_ACCESS_TTL_SECONDS = 10 * 60;

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64url(value) {
  return Buffer.from(String(value || ""), "base64url").toString("utf8");
}

function sign(secret, payloadPart) {
  return crypto.createHmac("sha256", secret).update(payloadPart).digest("base64url");
}

export function parsePrivateMediaInput(input) {
  const source = input && typeof input === "object" ? input : {};
  let contentType = String(source.contentType || source.mime || "").toLowerCase();
  let encoded = String(source.data || "");
  const match = encoded.match(/^data:([^;,]+);base64,(.+)$/s);
  if (match) {
    contentType = String(match[1]).toLowerCase();
    encoded = match[2];
  }
  if (!ALLOWED_MEDIA_TYPES.has(contentType)) {
    throw new Error("Unsupported check-in media type.");
  }
  const data = Buffer.from(encoded.replace(/\s/g, ""), "base64");
  if (!data.length || data.length > MAX_MEDIA_BYTES) {
    throw new Error("Check-in media must be between 1 byte and 8 MB.");
  }
  return {
    kind: String(source.kind || (contentType.startsWith("video/") ? "video" : "photo")).slice(0, 30),
    contentType,
    data,
    byteSize: data.length,
    checksum: crypto.createHash("sha256").update(data).digest("hex")
  };
}

export async function savePrivateMedia(pool, input) {
  const parsed = parsePrivateMediaInput(input);
  const id = "media_" + crypto.randomUUID();
  const retentionDays = Math.min(
    730,
    Math.max(1, Number(input.retentionDays) || DEFAULT_RETENTION_DAYS)
  );
  const retentionUntil = new Date(Date.now() + retentionDays * 86400000).toISOString();
  await pool.query(
    `INSERT INTO coach_media_objects(
       id, coach_user_id, client_id, domain, kind, content_type,
       byte_size, checksum, object_data, retention_until
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      id,
      input.coachUserId,
      input.clientId,
      String(input.domain || "check-in").slice(0, 40),
      parsed.kind,
      parsed.contentType,
      parsed.byteSize,
      parsed.checksum,
      parsed.data,
      retentionUntil
    ]
  );
  return {
    id,
    kind: parsed.kind,
    contentType: parsed.contentType,
    byteSize: parsed.byteSize,
    checksum: parsed.checksum,
    retentionUntil
  };
}

export function createMediaAccessToken(secret, input) {
  if (!secret || String(secret).length < 32) throw new Error("Media signing secret is not configured.");
  const ttlSeconds = Math.min(
    MAX_ACCESS_TTL_SECONDS,
    Math.max(30, Number(input.ttlSeconds) || 300)
  );
  const payload = {
    mediaId: String(input.mediaId),
    actorUserId: String(input.actorUserId),
    actorRole: String(input.actorRole),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    nonce: crypto.randomBytes(8).toString("hex")
  };
  const body = base64url(JSON.stringify(payload));
  return body + "." + sign(String(secret), body);
}

export function verifyMediaAccessToken(secret, token, expected = {}) {
  try {
    const [body, signature] = String(token || "").split(".");
    if (!body || !signature) return { ok: false, reason: "malformed" };
    const wanted = sign(String(secret), body);
    const left = Buffer.from(signature);
    const right = Buffer.from(wanted);
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
      return { ok: false, reason: "signature" };
    }
    const payload = JSON.parse(fromBase64url(body));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return { ok: false, reason: "expired" };
    }
    if (expected.mediaId && String(payload.mediaId) !== String(expected.mediaId)) {
      return { ok: false, reason: "media" };
    }
    if (expected.actorUserId && String(payload.actorUserId) !== String(expected.actorUserId)) {
      return { ok: false, reason: "actor" };
    }
    if (expected.actorRole && String(payload.actorRole) !== String(expected.actorRole)) {
      return { ok: false, reason: "role" };
    }
    return { ok: true, payload };
  } catch (_) {
    return { ok: false, reason: "invalid" };
  }
}

export async function auditMediaAccess(pool, mediaId, auth, outcome, reason) {
  try {
    await pool.query(
      `INSERT INTO coach_media_access_audit(
         media_id, actor_user_id, actor_role, outcome, reason
       ) VALUES($1,$2,$3,$4,$5)`,
      [
        mediaId,
        auth && auth.id || null,
        String(auth && auth.role || "unknown").slice(0, 30),
        String(outcome || "denied").slice(0, 30),
        String(reason || "").slice(0, 200) || null
      ]
    );
  } catch (_) {}
}

export async function purgeExpiredPrivateMedia(pool) {
  const result = await pool.query(
    `DELETE FROM coach_media_objects
     WHERE retention_until <= NOW() OR revoked_at IS NOT NULL
     RETURNING id`
  );
  return (result.rows || []).length;
}

export const MediaSecurityContract = Object.freeze({
  allowedTypes: [...ALLOWED_MEDIA_TYPES],
  maxBytes: MAX_MEDIA_BYTES,
  maxAccessTtlSeconds: MAX_ACCESS_TTL_SECONDS,
  defaultRetentionDays: DEFAULT_RETENTION_DAYS,
  publicUrlsAllowed: false,
  authorizationRequired: true,
  accessAuditRequired: true
});
