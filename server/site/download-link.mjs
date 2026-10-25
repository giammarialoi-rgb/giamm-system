// nurvan.app/scarica: the one link the app shares (Impostazioni › Condividi Nurvan, web/app-community.js).
// An iPhone or iPad goes to the App Store; an Android phone to Google Play once the app is public there
// (ANDROID_STORE_LIVE=1 on the host), to the web app until then; a computer to the site.
export const APP_STORE_URL = "https://apps.apple.com/app/id6817405788";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.nurvan.app";

export function downloadTarget(userAgent, env = {}) {
  const ua = String(userAgent || "");
  // iPadOS asks for the desktop site: a Macintosh that has a touch screen ("Mobile" in its app views).
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && /Mobile\//.test(ua))) return APP_STORE_URL;
  if (/Android/i.test(ua)) return env.ANDROID_STORE_LIVE === "1" ? PLAY_STORE_URL : String(env.APP_PUBLIC_URL || "https://app.nurvan.app/");
  return "https://" + (String(env.SITE_HOSTS || "nurvan.app").split(",")[0].trim() || "nurvan.app") + "/";
}

export function mountDownloadLink(app, env = process.env) {
  app.get(["/scarica", "/download"], (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.redirect(302, downloadTarget(req.headers["user-agent"], env));
  });
}
