# MASTER TASK 28 — Final Report
**Repository:** `C:\Users\giamm\Desktop\GiammariaSystemApp`  
**Build:** MASTER-TASK-28  
**Date:** 2026-08-29

---

## 1. Problems Found

| # | Area | Symptom | Root Cause |
|---|------|---------|------------|
| P1 | Coach AI (Android) | `Endpoint Coach AI non configurato` during file analysis | `ConfigService.getCoachApiUrl()` returned empty native URL without falling back to `CONFIG.coachApiUrl`; secondary line in `index.base.html` could reset `COACH_API_URL` to `''` |
| P2 | Coach AI (errors) | Generic / legacy error strings | `coachEndpoint()` threw opaque message; no `formatCoachError()` mapping |
| P3 | Backend | No `/api/health`; unclear startup state | Only `/health` existed; no startup log for missing `GEMINI_API_KEY` |
| P4 | Logo (Android) | GS logo alt text, broken image | Build pipeline synced only `index.html` — static assets not copied to `app/src/main/assets/` on rebuild |
| P5 | Google Login | Client ID not exposed to JS | Missing `NativeConfig.getGoogleClientId()` bridge (Gradle field existed but JS couldn't read it) |

**Not a code bug (external config):**
- Production Render at `https://coach-api-gemini.onrender.com` responds **healthy** with `apiKeyConfigured: true` (verified live).
- Google Login on device requires `-PgoogleWebClientId=...` at APK build time (currently empty by default).

---

## 2. Root Cause Summary (Coach AI on Device)

```
Android WebView
  → NativeConfig.getCoachApiUrl()  [BuildConfig.COACH_API_URL]
  → ConfigService (OLD: no fallback if native empty/invalid)
  → coachEndpoint() → throw "Endpoint Coach AI non configurato"
```

**Import path is separate:** `processUniversalFile(..., 'IMPORT')` uses local XLSX parser only — never calls `coachEndpoint()`.

**Coach analysis path:** `processUniversalFile(..., 'COACH_AI')` → local parse first → optional `POST /api/chat` if configured.

---

## 3. Files Modified

| File | Change |
|------|--------|
| `build_master25.mjs` | ConfigService fallback + `isValidHttpUrl`; static asset sync; build tag MASTER-TASK-28 |
| `web/index.base.html` | `formatCoachError`, `coachEndpoint`, `checkBackendHealth`, Coach file analysis warnings, COACH_API_URL refresh |
| `web/index.html` | Rebuilt (488 KB) |
| `app/src/main/assets/index.html` | Rebuilt + synced |
| `app/src/main/assets/gs_logo.png` | Re-synced by build |
| `app/src/main/assets/xlsx.full.min.js` | Re-synced by build |
| `app/src/main/assets/data.json` | Re-synced by build |
| `coach-api.mjs` | `/api/health`, `buildHealthPayload()`, startup diagnostics, clearer 503 for missing GEMINI |
| `app/src/main/java/.../MainActivity.java` | `getGoogleClientId()` JS bridge |
| `test_master_task28_coach_ai.mjs` | **NEW** — 52 tests |
| `package.json` | `test:28`, regression chain updated |
| `.env.example` | Documented health endpoints + Android Gradle flags |

---

## 4. Changes Effectuated

### Coach AI configuration (frontend)
- `ConfigService.getCoachApiUrl()`: validates native URL; falls back to `https://coach-api-gemini.onrender.com`
- Removed destructive `COACH_API_URL = ... || ''` pattern
- `coachEndpoint()` → clear message: *"Coach AI non configurato: configurare il backend e GEMINI_API_KEY."*
- `checkBackendHealth()` checks client config + server `aiConfigured`
- Coach file analysis: shows config warning banner + **local technical report fallback** (canonical model never destroyed)

### Backend
- `GET /health` and `GET /api/health` return non-sensitive:
  ```json
  { "ok": true, "aiConfigured": true|false, "model": "...", "accountStorageConfigured": true|false, "googleOAuthConfigured": true|false }
  ```
- Startup logs MODEL / GEMINI / DATABASE / GOOGLE status
- `/api/chat` without key → **503** with Italian config message

### Assets
- Every `node build_master25.mjs` now copies `gs_logo.png`, `xlsx.full.min.js`, `data.json` → Android assets

### Google Login
- `NativeConfig.getGoogleClientId()` added
- Existing Android guard: *"Google non configurato: manca il Web client ID."* when `GOOGLE_WEB_CLIENT_ID` empty

---

## 5. Tests Executed

| Suite | Result |
|-------|--------|
| **Task 28** (`test_master_task28_coach_ai.mjs`) | **52/52 PASS** |
| Task 27 recovery | 20/20 PASS |
| Task 26 stabilization | 43/43 PASS |
| Task 25 E2E fidelity | 30/30 PASS |
| Task 20 architecture | 200/200 PASS |
| **Total regression** | **345/345 PASS** |

Task 28 covers: config fallback, assets, golden import, exercise matcher, i18n×10, Google wiring, backend health/chat without GEMINI, ConfigService patterns.

---

## 6. Build

```
./gradlew.bat assembleDebug
BUILD SUCCESSFUL
```

**APK:** `app/build/outputs/apk/debug/app-debug.apk`

---

## 7. Configuration Required (Manual)

### Render (production backend)
| Variable | Required for Coach AI | Status (live check) |
|----------|----------------------|---------------------|
| `GEMINI_API_KEY` | Yes | ✅ configured (`apiKeyConfigured: true`) |
| `GEMINI_MODEL` | Optional | `gemini-3.1-flash-lite` |
| `DATABASE_URL` | Auth/sync | ✅ configured |
| `JWT_SECRET` | Auth | (assumed — storage configured) |
| `GOOGLE_CLIENT_ID` | Google OAuth on server | Set in Render if using account sync |

**Redeploy Render** after pulling Task 28 to get `/api/health` + `aiConfigured` field on production.

### Android APK build
```powershell
cd C:\Users\giamm\Desktop\GiammariaSystemApp
node build_master25.mjs
.\gradlew.bat assembleDebug `
  -PcoachApiUrl=https://coach-api-gemini.onrender.com `
  -PgoogleWebClientId=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

### Local backend dev
```powershell
cp .env.example .env
# Set GEMINI_API_KEY=...
npm start
curl http://localhost:3000/api/health
```

---

## 8. E2E Checklist (Device — Manual)

| # | Test | Expected | Automated |
|---|------|----------|-----------|
| 1 | App launch | Splash + logo visible | Partial (assets) |
| 2 | Google login | Sign-in or clear "Web client ID" message | Wiring verified |
| 3 | Profile | Open/edit/save | Code present — **device not run** |
| 4 | Exercise DB search | PULLDOWN, CROCI, etc. | ✅ matcher tests |
| 5–7 | Golden import → review → activate | 1W/4S/19E, 7G/35P, 8 supp, 6 meds | ✅ |
| 8–10 | Multi-import ×3 | No "spazio terminato" | ✅ Task 27 IDB |
| 11–13 | Nutrition / supplements / therapy views | Data from golden | ✅ parse |
| 14 | Reset carichi | Logs cleared, program kept | Code verified Task 26 |
| 15 | Hard reset | Full wipe | Code verified Task 26 |
| 16 | Coach AI file analysis | Remote Gemini OR local report + config banner | ✅ config tests |
| 17 | Language switch ×10 | UI updates | ✅ i18n meta |
| 18–20 | Save program / reopen / persistence | IDB | ✅ Task 27 |

**Android physical smoke test:** NOT executed in this session (no device attached). Install APK and verify logo + Coach AI chat after rebuild.

---

## 9. Residual Issues / Not Simulated

1. **Render redeploy** needed for `/api/health` alias on production (local code ready).
2. **Google Login on device** requires real `GOOGLE_WEB_CLIENT_ID` + matching `GOOGLE_CLIENT_ID` on Render.
3. **Physical device logcat** not captured — recommend checking `GiammariaWebView` tag after install.
4. **Gemini live response quality** not tested (would consume API quota; production key is present).

---

## 10. Anti-Regression Statement

All Task 25/26/27 capabilities preserved:
- Universal Import Engine (offline golden XLSX)
- IndexedDB persistence / multi-program
- Therapy temporal blocks
- Exercise DB + i18n ×10
- Reset / hard reset handlers
- Google Login code path (not removed)

**Function count:** unchanged; Coach AI configuration layer strengthened.

---

## 11. Quick Verification Commands

```powershell
cd C:\Users\giamm\Desktop\GiammariaSystemApp
npm run test:28
npm run test:regression
node build_master25.mjs
.\gradlew.bat assembleDebug
```

```powershell
# Production health (current deploy)
Invoke-RestMethod https://coach-api-gemini.onrender.com/health
```

---

**Task 28 status:** Code complete, tests green, APK built. Device smoke test and Render redeploy are the remaining manual steps.
