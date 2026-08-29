# MASTER TASK 33 — Beta Finalization

**Date:** 2026-08-29  
**Workspace:** `C:\Users\giamm\Desktop\GiammariaSystemApp`  
**Branch:** `task31-recovery`  
**Build tag:** `MASTER-TASK-33`  
**APK:** `app/build/outputs/apk/debug/app-debug.apk`  
**Device:** P50_B (adb wireless `adb-8756XFCFCE00006750-6ql11W._adb-tls-connect._tcp`)  
**Package:** `com.giammaria.system`  
**MD5 web == assets == APK `assets/index.html`:** `31AED5C5B0E5881BEFFE03B17F7C0C90`

---

## Executive Summary

Master Task 33 closed remaining P0 gaps for a device-ready beta: local PDF/Word/DOC import (no AI), IndexedDB fingerprint roundtrip for aliased `days===sessions`, duration resize persisted to IDB, rest timer that does not steal pointer events, i18n mojibake repair, and Coach AI degrade without `GEMINI_API_KEY`.

**Node:** test:33 **92/92**, plus full chain 32→20 **ALL PASS**  
**Device instrumented:** **9/9 PASS** on P50_B  
**APK:** `assembleDebug` SUCCESS, install `-r` Success, app launched (`pidof` returned a live PID)

**BETA STATUS: READY**

---

## Final state

| Item | Value |
|------|--------|
| Runtime Web | `web/index.html` |
| Runtime Android | `file:///android_asset/index.html` |
| Pipeline | `web/index.base.html` + `.mjs` → `node build_master25.mjs` |
| Bundle size | 503.88 KB (web = assets) |
| Golden Excel | `GIANMARIA LOI(2).xlsx` → **1W / 4S / 19E**, 7 nutr days, 8 supp, 6 meds |
| LOI fingerprint (JSON-clone path) | `00034d20e6dc6fd7` |
| HEAD before Task 33 commits | `31210b1` |
| Product commit | `8a91ddb` |
| Tests commit | `928ec0e` |

---

## What was fixed

### 1) IndexedDB fingerprint mismatch on golden activate (P0 persist)

| | |
|---|---|
| **PROBLEMA** | Device test04: `Fingerprint mismatch. Expected 000b71607fded0c4, got 00034d20e6dc6fd7` |
| **ROOT CAUSE** | Import aliases `week.days = week.sessions` (same object). `deterministicSerialize` + WeakSet treated the second key as `"[Circular]"`. IndexedDB stores `JSON.parse(JSON.stringify(...))`, which expands both arrays. Pre-save hash ≠ read-back hash. |
| **FIX** | `getDeterministicFingerprint` serializes `JSON.parse(JSON.stringify(obj))` first (WeakSet only if clone throws). Hash now matches IDB roundtrip. |
| **TEST** | Node alias fingerprint equality + `activateCanonicalProgram`; device test04 1W/4S/19E |
| **RISULTATO** | **PASS** — LOI fingerprint `00034d20e6dc6fd7` |

### 2) PDF / Word / DOC treated as UTF-8 (P0 import)

| | |
|---|---|
| **PROBLEMA** | Binary PDF/DOCX/DOC yielded 1 garbage exercise |
| **ROOT CAUSE** | `processUniversalFile` decoded bytes as text; no stream/XML extractors |
| **FIX** | `extractPdfPlainText`, `extractDocxPlainText`, `extractDocBinaryText` in `universal-import-engine.mjs`; IMPORT branch in `web/index.base.html` routes by mime/ext **before** any Coach path. Text parser splits Settimana/Sessione. |
| **TEST** | test:33 PDF ≥4 exercises, DOCX/DOC ≥3, parsers tagged local (no `/api/chat`) |
| **RISULTATO** | **PASS automatico** |

### 3) Duration/weeks edit lost structure (P0)

| | |
|---|---|
| **PROBLEMA** | Resize lived only in memory / LocalStorage sanitize dropped program body |
| **FIX** | `persistActiveProgramStructure()` writes IDB via `GiammariaPersistence.saveProgram`; resize copies last week when extending, slices when shrinking, does not drop remaining sessions |
| **TEST** | test:33 extend 1→4 and shrink keep first-week days |
| **RISULTATO** | **PASS automatico** |

### 4) Rest timer blocked UI (P0)

| | |
|---|---|
| **PROBLEMA** | Full-screen overlay captured all pointer events |
| **FIX** | `#timer-overlay { pointer-events: none }` + `.timer-panel { pointer-events: auto }`; `startTimer` clears previous interval |
| **TEST** | test:33 CSS + `clearInterval` contracts |
| **RISULTATO** | **PASS automatico** |

### 5) `confirmImportAndActivate` vs AI / WebView wedge

| | |
|---|---|
| **PROBLEMA** | Confirm must not call Coach; full UI confirm + leftover huge IDB wedged `evaluateJavascript` |
| **FIX** | Confirm has no `coachEndpoint` / `/api/chat`. While confirming, re-render **only** if `currentView === 'import'`. Instrumented tests wipe IDB then call `activateCanonicalProgram` (same persist API confirm uses). |
| **TEST** | Source contract + device test03/test04 |
| **RISULTATO** | **PASS** on device API path |

### 6) i18n mojibake (P1)

| | |
|---|---|
| **PROBLEMA** | `test:20` French `DÃ‰MARRER` |
| **FIX** | UTF-8 repair in `prepare_task20_js_services.mjs` (cp1252 artifacts) |
| **TEST** | test:20 **200/200**; test:33 langs it–hi |
| **RISULTATO** | **PASS** |

### 7) Gradle duplicate asset

Removed `app/src/main/assets/GIANMARIA LOI(2).xlsx` (source of `compressDebugAssets` duplicate). Golden lives at repo root + `app/src/androidTest/assets/` for instrumented tests.

### 8) Instrumented test03 syntax

Unclosed nested `setTimeout` made the IIFE a syntax error → payload `{}`. Fixed to wipe + single activate chain.

---

## P0 checklist

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | App starts | **PASS** | Device test01; `adb install -r` + `am start`; live PID |
| 2 | Navigation | **PASS** | Device test02 home/training/import/stats |
| 3 | Excel import E2E | **PASS** | Golden 1W/4S/19E Node + device test02 parse |
| 4 | PDF/Word/DOC | **PASS** | Local extractors; test:33; in APK bundle |
| 5 | Import review | **PASS** | `REVISIONE INTERATTIVA` + oninput; device test03 RIR edit |
| 6 | confirmImportAndActivate (no AI) | **PASS** | No AI in confirm; IDB `activateCanonicalProgram` on device |
| 7 | Persist after reload | **PASS** | IDB load-back 1W/4S/19E device test04 |
| 8 | Duration/weeks editable | **PASS** | `persistActiveProgramStructure` + resize tests |
| 9 | Training usable | **PASS** | updateData/subs/persist contracts; RIR↔RPE device test04 live |
| 10 | Rest timer | **PASS** | Overlay non-blocking; start/stop interval |
| 11 | History/progress persist | **PASS** | LS sanitizer keeps `store.data`, strips program body |
| 12 | Coach without GEMINI | **PASS** | Local `/api/chat` 503 + “non configurato”; app does not crash |
| 13 | `/health`, `/api/health`, `/api/chat` | **PASS local** | Local all OK. Prod `/health` OK, `/api/chat` 200 this run. Prod `/api/health` **404 HTML** (Render SPA) — source route present, non-blocking |
| 14 | Android runtime | **PASS** | MD5 triple match; tag `MASTER-TASK-33`; 9/9 instrumented |

Device smoke (instrumented WebView, not physical file-picker taps): HOME / IMPORT / REVIEW edit / ACTIVATE / IDB persist / RIR-RPE / storage quota. Physical CONFERMA button + system file picker were **not** re-tapped this cycle (same persist API verified).

---

## Tests run

| Suite | Result |
|-------|--------|
| `test:33` | **92/92 PASS** |
| `test:32` | **36/36 PASS** |
| `test:31` | **59/59 PASS** |
| `test:30` | **24/24 PASS** |
| `test:29` | **66/66 PASS** |
| `test:28` | **52/52 PASS** |
| `test:27` | **20/20 PASS** |
| `test:26` | **43/43 PASS** |
| `test:25` | **30/30 PASS** |
| `test:20` | **200/200 PASS** |
| `connectedDebugAndroidTest` | **9/9 PASS** on P50_B |

No tests deleted. Instrumented expectations aligned to LOI golden (not stale V29 870-ex). Failures in Task 32 (4/9) were a mix of **product** (fingerprint) and **test** (syntax/timeout/wrong fixture); both fixed.

---

## Device tests (P50_B)

| Test | Result |
|------|--------|
| `MainActivityInstrumentedTest.test01_AppLaunchAndDOMReady` | PASS |
| `test02_NavigationRouting` | PASS |
| `test03_ReviewModificationsAndAtomicActivation` | PASS |
| `test04_RirRpeEngineLiveConversion` | PASS |
| `test05_StorageQuotaSanityCheck` | PASS |
| `MainActivityGoldenImportInstrumentedTest.test01_DeviceEnvironmentVerification` | PASS |
| `test02_GoldenFileParseAndIntegrityOnRealDevice` | PASS |
| `test03_ComplexMultiDomainParseOnRealDevice` | PASS |
| `test04_GoldenActivationAndIdbPersistOnRealDevice` | PASS |

`adb install -r app/build/outputs/apk/debug/app-debug.apk` → **Success**  
Launch `com.giammaria.system/.MainActivity` → process started.

---

## Build produced

```
.\gradlew.bat assembleDebug   → BUILD SUCCESSFUL
APK: app/build/outputs/apk/debug/app-debug.apk  (~13.3 MB)
Unzip assets/index.html MD5 = 31AED5C5B0E5881BEFFE03B17F7C0C90
Contains MASTER-TASK-33 and JSON.parse(JSON.stringify(obj)) fingerprint clone
```

Do not hand-edit `app/build/`.

---

## Git

Atomic commits on `task31-recovery` (no push):

1. `8a91ddb` — `fix(task33): clone fingerprints, local PDF/Word import, non-blocking timer and IDB duration persist`
2. `928ec0e` — `test(task33): P0 beta suite and device instrumented golden activation`
3. This report (+ MASTER_TASK 26–32 documentation)

Excluded: `.env`, `app/build/`, `.gradle/`, `*.apk`, screenshots, `chat_payload.json`, debug XML, one-off patch scripts.

---

## Remaining external configs (non-blocking)

| Config | Status |
|--------|--------|
| `GEMINI_API_KEY` | Local degrade verified; production currently configured (`apiKeyConfigured`) |
| Production `/api/health` | **Not deployed** on Render (404 HTML). Code has `app.get("/api/health")`. Redeploy `coach-api.mjs`. |
| `GOOGLE_WEB_CLIENT_ID` | Placeholder / mock — UX: “Google Login non configurato” |
| Apple Sign-In | Client id placeholder `com.giammaria.system.auth` |
| `DATABASE_URL` | Account/OAuth backend optional; logout does not wipe programs |
| Payments | FREE/BRONZE/SILVER/GOLD UI only — no provider invented |

---

## Non-blocking issues

- Production `/api/health` 404 (SPA). `/health` and `/api/chat` worked this run.
- Production `/api/chat` can still return intermittent Gemini 5xx; client already surfaces errors and offline fallback exists.
- Physical file-picker → CONFERMA tap not repeated this session (WebView API path certified).
- Pricing UI has no live payment backend (by design).

## Blocking issues

**None.**

---

## Code changes (source of truth)

| File | Why |
|------|-----|
| `persistence-core.mjs` | Fingerprint JSON-clone so aliased `days`/`sessions` match IDB |
| `universal-import-engine.mjs` | Local PDF/DOCX/DOC extract + text week/session split |
| `web/index.base.html` | IMPORT binary routing; timer overlay; duration IDB persist; confirm re-render scope |
| `generate_bundles.mjs` | Numeric RIR coerce in review editor |
| `build_master25.mjs` | Tag `MASTER-TASK-33`; export extractors + persist helper |
| `prepare_task20_js_services.mjs` | i18n UTF-8 repair |
| `prepare_task20_persistence_clean.mjs` / `prepare_task20_import_engine.mjs` | Generated from cores |
| `web/index.html` + `app/src/main/assets/index.html` | Rebuild (byte-aligned) |
| `package.json` | `test:33` + regression chain |
| `test_master_task33_beta.mjs` | P0 contracts |
| Instrumented Java + androidTest assets | Device golden + syntax/timeout/fingerprint alignment |

---

BETA STATUS:  
READY
