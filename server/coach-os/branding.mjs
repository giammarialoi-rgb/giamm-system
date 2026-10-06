// The coach's own name and logo, as the web app of their clients shows them.
//
// The coach crops the logo on their phone and "powered by Nurvan" is laid over it there; what arrives here is the
// finished icon in three sizes (512, 192, 180). The server checks they are real PNGs of the right size and small, keeps
// them, and serves them under the client's link: /c/<invite>/icon-512.png ... A store app has one icon for everybody;
// the icon that is the coach's is the one of the web app the client puts on the Home screen.
import { imageSize } from "../site/seo.mjs";

export const ICON_SIZES = [512, 192, 180];
const MAX_ICON_BYTES = 400 * 1024;
const NAME_MAX = 40;

// What the coach typed as the name: one line, no markup, no control characters.
export function cleanBrandName(value) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001f\u007f<>"`\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX);
}

// "data:image/png;base64,...." -> Buffer, or null when it is not a PNG of the size asked.
export function pngFromDataUrl(value, size) {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(value || ""));
  if (!m) return null;
  const buf = Buffer.from(m[1], "base64");
  if (buf.length < 33 || buf.length > MAX_ICON_BYTES) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  const dim = imageSize(buf);
  if (!dim || dim.width !== size || dim.height !== size) return null;
  return buf;
}

export function brandPublic(row) {
  if (!row) return null;
  const hasLogo = !!row.icon_512;
  const name = String(row.brand_name || "");
  if (!name && !hasLogo) return null;
  return { name, hasLogo, version: new Date(row.updated_at).getTime() || 0 };
}

export async function getBranding(pool, coachId) {
  const r = await pool.query(
    "SELECT brand_name, (icon_512 IS NOT NULL) AS has_logo, updated_at FROM coach_branding WHERE coach_user_id = $1",
    [coachId]
  );
  const row = r.rows[0];
  if (!row) return { name: "", hasLogo: false, version: 0 };
  return { name: row.brand_name || "", hasLogo: !!row.has_logo, version: new Date(row.updated_at).getTime() || 0 };
}

// input: { name, icons: { 512: dataUrl, 192: dataUrl, 180: dataUrl } }. Returns the saved branding or throws a message
// for the coach. A name alone is fine (no logo yet); a logo needs all three sizes.
export async function saveBranding(pool, coachId, input = {}) {
  const name = cleanBrandName(input.name);
  const icons = input.icons && typeof input.icons === "object" ? input.icons : null;
  let bufs = null;
  if (icons && (icons[512] || icons[192] || icons[180])) {
    bufs = {};
    for (const size of ICON_SIZES) {
      const buf = pngFromDataUrl(icons[size], size);
      if (!buf) throw new Error("Il logo non è valido: ricaricalo e ritaglialo di nuovo.");
      bufs[size] = buf;
    }
  }
  if (!name && !bufs) {
    const had = await pool.query("SELECT 1 FROM coach_branding WHERE coach_user_id = $1 AND icon_512 IS NOT NULL", [coachId]);
    if (!had.rows[0]) throw new Error("Scrivi il nome o carica il logo.");
  }
  if (bufs) {
    await pool.query(
      `INSERT INTO coach_branding(coach_user_id, brand_name, icon_512, icon_192, icon_180, updated_at)
       VALUES($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (coach_user_id) DO UPDATE SET brand_name = EXCLUDED.brand_name, icon_512 = EXCLUDED.icon_512,
         icon_192 = EXCLUDED.icon_192, icon_180 = EXCLUDED.icon_180, updated_at = NOW()`,
      [coachId, name, bufs[512], bufs[192], bufs[180]]
    );
  } else {
    await pool.query(
      `INSERT INTO coach_branding(coach_user_id, brand_name, updated_at) VALUES($1,$2,NOW())
       ON CONFLICT (coach_user_id) DO UPDATE SET brand_name = EXCLUDED.brand_name, updated_at = NOW()`,
      [coachId, name]
    );
  }
  return getBranding(pool, coachId);
}

export async function removeBranding(pool, coachId) {
  await pool.query("DELETE FROM coach_branding WHERE coach_user_id = $1", [coachId]);
}

// The branding behind a client's invite link, or null. Cached a short while: the page and the manifest ask every time.
const cache = new Map();
const CACHE_MS = 30 * 1000;
export function forgetBrandCache() { cache.clear(); }
export async function brandForInvite(pool, token) {
  const key = String(token || "");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.brand;
  let brand = null;
  try {
    const r = await pool.query(
      `SELECT b.brand_name, b.icon_512, b.updated_at
       FROM coach_clients c JOIN coach_branding b ON b.coach_user_id = c.coach_user_id
       WHERE c.invite_token = $1 AND c.status <> 'removed' LIMIT 1`,
      [key]
    );
    brand = brandPublic(r.rows[0]);
  } catch (_) { brand = null; }
  cache.set(key, { at: Date.now(), brand });
  if (cache.size > 2000) cache.clear();
  return brand;
}

export async function iconForInvite(pool, token, size) {
  if (!ICON_SIZES.includes(size)) return null;
  const col = "icon_" + size;
  const r = await pool.query(
    `SELECT b.${col} AS icon, b.updated_at
     FROM coach_clients c JOIN coach_branding b ON b.coach_user_id = c.coach_user_id
     WHERE c.invite_token = $1 AND c.status <> 'removed' AND b.${col} IS NOT NULL LIMIT 1`,
    [String(token || "")]
  );
  const row = r.rows[0];
  return row ? { png: row.icon, version: new Date(row.updated_at).getTime() || 0 } : null;
}
