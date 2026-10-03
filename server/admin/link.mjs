// The private address of the dashboard.
//
// The page is not at /admin: it is at /<ADMIN_PATH>/, a secret the owner sets
// on the host (16-80 letters, digits, - or _). Everything under /api/admin
// answers "not found" unless the request carries that same secret in the
// X-Nurvan-Admin-Link header, which only the page loaded from the secret
// address knows how to send; so the routes are not even visible to anyone
// without the link, and a leaked cookie alone does not open them. The email
// code (ADMIN_EMAILS) is still asked on top.
//
// In production without ADMIN_PATH the dashboard is off. Outside production
// (local runs, tests) the address is /admin, so nothing needs configuring.
import crypto from "node:crypto";

export const LINK_HEADER = "x-nurvan-admin-link";

export function adminSlug(env = process.env) {
  const raw = String(env.ADMIN_PATH || "").trim().replace(/^\/+|\/+$/g, "");
  if (/^[A-Za-z0-9_-]{16,80}$/.test(raw)) return raw;
  if (String(env.NODE_ENV || "").toLowerCase() !== "production") return "admin";
  return "";
}

function same(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/**
 * linkGate: Express middleware for /api/admin. Passes the CLI token (it has
 * its own secret) and requests that know the link; anything else is a plain 404.
 */
export function makeLinkGate(env = process.env) {
  return function linkGate(req, res, next) {
    const slug = adminSlug(env);
    if (!slug) return res.status(404).json({ error: "Not found" });
    const cli = String(env.NURVAN_ADMIN_TOKEN || "");
    if (cli.length >= 24 && req.headers["x-admin-token"] && same(req.headers["x-admin-token"], cli)) return next();
    if (same(req.headers[LINK_HEADER], slug)) return next();
    return res.status(404).json({ error: "Not found" });
  };
}
