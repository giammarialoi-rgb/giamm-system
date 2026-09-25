# Sign in with Apple: the four variables

All from developer.apple.com → Certificates, Identifiers & Profiles (paid Apple Developer account).
1. **APPLE_TEAM_ID**: the 10 characters in the top right of the portal (also under Membership details).
2. **APPLE_CLIENT_ID**: Identifiers → + → Services IDs (e.g. `app.nurvan.signin`). Tick "Sign in with Apple", then Configure: primary App ID, the site's domains, and the Return URL `https://<server>/api/auth/apple/callback` (the one in APPLE_REDIRECT_URI, if you set it).
3. **APPLE_KEY_ID**: Keys → + → tick "Sign in with Apple" → Configure with the same primary App ID. The Key ID is shown next to the key.
4. **APPLE_PRIVATE_KEY**: the `.p8` file of that key. It can be downloaded **only once**. Paste its whole content into Render (on one line with `\n` works too).
The primary App ID needs the "Sign in with Apple" capability turned on (Identifiers → App IDs).
For mail to reach @privaterelay.appleid.com addresses (reset, admin codes): Services → Sign in with Apple for Email Communication → add the MAIL_FROM domain or address, with SPF and DKIM.
With any of the four missing, the button does not show and /api/auth/apple answers 503.
