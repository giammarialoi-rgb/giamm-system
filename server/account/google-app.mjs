// Google sign-in for the iOS app.
//
// Google refuses its sign-in inside an app's web view (400 invalid_request,
// "doesn't comply with Google's OAuth 2.0 policy"). The app therefore opens
// /api/auth/google/start in the system browser (SFSafariViewController),
// Google comes back to /api/auth/google/callback with a code, this server
// swaps it for the ID token and hands the app a one-time ticket through
// nurvan://oauth/google. The app swaps the ticket at POST /api/auth/google,
// together with the secret whose hash started the login: the same tickets and
// the same proof as Sign in with Apple on Android.
//
// Configuration: the web client id already used for Google (GOOGLE_CLIENT_ID)
// and its secret, GOOGLE_CLIENT_SECRET. The OAuth client must list
// https://<server>/api/auth/google/callback as an authorized redirect URI.
import { isVerifierHash, issueAppleState, readAppleState, issueLoginTicket, returnPage } from "./apple.mjs";

const GOOGLE_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
export const GOOGLE_APP_RETURN = "nurvan://oauth/google";

export function googleAppConfig(env, clientId) {
  const secret = String((env || {}).GOOGLE_CLIENT_SECRET || "").trim();
  const id = String(clientId || "").trim();
  const redirectUri = String((env || {}).GOOGLE_REDIRECT_URI || "").trim();
  return { enabled: Boolean(id && secret), clientId: id, clientSecret: secret, redirectUri };
}

export function mountGoogleAppAuth(app, deps) {
  const { pool, secret, initDb, verifyGoogleCredential, resolveIdentityUser, clientId } = deps;
  const env = deps.env || process.env;
  const fetchImpl = deps.fetchImpl || ((...a) => fetch(...a));
  const cfg = () => googleAppConfig(env, typeof clientId === "function" ? clientId() : clientId);
  const redirectUri = (req) => cfg().redirectUri || (req.protocol + "://" + req.get("host") + "/api/auth/google/callback");

  app.get("/api/auth/google/start", (req, res) => {
    const c = cfg();
    if (!c.enabled) return returnPage(res, GOOGLE_APP_RETURN + "?error=not_configured", "Accesso con Google non disponibile nell'app.");
    const vh = String(req.query.vh || "");
    if (!isVerifierHash(vh)) return returnPage(res, GOOGLE_APP_RETURN + "?error=update", "Aggiorna l'app Nurvan per accedere con Google.");
    const { state } = issueAppleState(secret, "app", Date.now(), vh);
    const q = new URLSearchParams({
      client_id: c.clientId,
      redirect_uri: redirectUri(req),
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account"
    });
    res.set("Cache-Control", "no-store");
    return res.redirect(302, GOOGLE_AUTHORIZE + "?" + q.toString());
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    if (req.query.error) return returnPage(res, GOOGLE_APP_RETURN + "?error=cancelled", "Accesso con Google annullato.");
    try {
      const c = cfg();
      if (!c.enabled) throw Object.assign(new Error("Accesso con Google non disponibile nell'app."), { statusCode: 503 });
      const st = readAppleState(secret, req.query.state);
      if (st.mode !== "app" || !st.verifierHash) throw Object.assign(new Error("Richiesta Google non valida. Riprova."), { statusCode: 400 });
      const tokenRes = await fetchImpl(GOOGLE_TOKEN, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: String(req.query.code || ""),
          client_id: c.clientId,
          client_secret: c.clientSecret,
          redirect_uri: redirectUri(req),
          grant_type: "authorization_code"
        }).toString()
      });
      const tokens = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokens.id_token) throw Object.assign(new Error("Google non ha confermato l'accesso. Riprova."), { statusCode: 401 });
      // The same checks as the web login: audience, verified email.
      const identity = await verifyGoogleCredential(tokens.id_token);
      if (initDb) await initDb();
      const { user } = await resolveIdentityUser(pool, { ...identity, linkingUserId: null });
      const ticket = await issueLoginTicket(pool, user.id, st.verifierHash);
      return returnPage(res, GOOGLE_APP_RETURN + "?code=" + encodeURIComponent(ticket), "Accesso riuscito. Torna a Nurvan.");
    } catch (err) {
      if (!err.statusCode) console.error("GOOGLE_APP_CALLBACK_ERROR", err);
      return returnPage(res, GOOGLE_APP_RETURN + "?error=failed", err.statusCode ? err.message : "Accesso con Google non riuscito.");
    }
  });
}
