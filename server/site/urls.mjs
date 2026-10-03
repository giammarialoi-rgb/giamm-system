// One address for each page of the site: Italian has no prefix ("/it/blog"
// goes to "/blog") and there is no trailing slash ("/blog/" goes to "/blog").
// A permanent redirect, so search engines keep the one they should.
// Only on the site's own domain; the app's address is left alone.
export function canonicalPath(pathname) {
  let p = String(pathname || "/");
  if (p === "/it" || p.startsWith("/it/")) p = p.slice(3) || "/";
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1) p = p.replace(/\/+$/, "") || "/";
  return p;
}

export function canonicalUrls(isSiteHost) {
  return (req, res, next) => {
    if ((req.method !== "GET" && req.method !== "HEAD") || !isSiteHost(req)) return next();
    const url = req.originalUrl || req.url || "/";
    const q = url.indexOf("?");
    const pathname = q < 0 ? url : url.slice(0, q);
    const target = canonicalPath(pathname);
    if (target === pathname || !target.startsWith("/") || target.startsWith("//")) return next();
    return res.redirect(301, target + (q < 0 ? "" : url.slice(q)));
  };
}
