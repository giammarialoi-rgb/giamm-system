# MASTER TASK 30 — Final Report

**Workspace:** `C:\Users\giamm\Desktop\GiammariaSystemApp`  
**Build tag:** MASTER-TASK-30  
**Date:** 2026-08-29  
**Baseline doc:** `MASTER_TASK_30_BASELINE_REPORT.md`

---

## Executive Summary

Master Task 30 established a git/product baseline, verified the build pipeline (hashes aligned), investigated all user-reported failures against real code, and applied **two minimal P0 fixes** (splash click-through + review `oninput` sync). Full Node regression **435/435 PASS** (Task 30 + 20–29 chain). APK rebuilt and installed on P50_B.

**Do not revert to HEAD `70eb8a5` (Task 21)** — working tree is strictly ahead; `web/index.base.html` must be committed to preserve recovery work.

---

## Issue Tracker (PROBLEMA → ROOT CAUSE → FIX → TEST → RISULTATO)

### 1. ACCEDI opens nothing

| | |
|---|---|
| **PROBLEMA** | Tap ACCEDI during/after splash — no account modal |
| **ROOT CAUSE** | `#splash` z-index 3000 overlays header; default `pointer-events:auto` blocks taps until `finishInit()` (0–2500ms). HEAD commit lacked early fix. |
| **FIX** | `#splash { pointer-events: none; }` in CSS + existing Task 29 `finishInit` fade |
| **TEST** | `test_master_task30_functional_e2e.mjs` [1], [5]; Task 29 onclick scan |
| **RISULTATO** | ✅ CSS contract verified; ACCEDI wired in built HTML; APK reinstalled |

### 2. PROFILO opens nothing

| | |
|---|---|
| **PROBLEMA** | PROFILO button dead or absent |
| **ROOT CAUSE** | (a) Same splash overlay as ACCEDI; (b) `#profile-button` + `openAthleteProfile()` only in working tree, absent in HEAD |
| **FIX** | Splash pointer-events (above) + existing `openAthleteProfile()` → `navigate('settings')` + scroll |
| **TEST** | Task 30 [5]: onclick + function defined |
| **RISULTATO** | ✅ Present in MASTER-TASK-30 build; device install 2026-08-29 |

### 3. Coach AI HTTP 500

| | |
|---|---|
| **PROBLEMA** | User sees HTTP 500 in Coach chat |
| **ROOT CAUSE** | Production backend **healthy** (`apiKeyConfigured:true`). `/api/chat` returns **200** with valid payload. 500 = Gemini SDK exception in `coach-api.mjs` catch (large `context.program`, rate limits, transient API). Not reproduced with minimal message today. |
| **FIX** | None code change (server already configured). Recommend logging device `logcat` on next 500. |
| **TEST** | Task 30 [7]: live `/health` + `/api/chat` curl |
| **RISULTATO** | ✅ Backend OK; 500 **intermittent / payload-dependent** — not a missing API key |

### 4. IMPORT shows wrong data

| | |
|---|---|
| **PROBLEMA** | Import displays incorrect program |
| **ROOT CAUSE** | Parser **not broken** — golden `GIANMARIA LOI(2).xlsx` → 1W/4S/19E, 7G/35P, 8 supp, 6 meds. Likely **stale IDB/localStorage active program** shown on Home after cancel/failed activation, or confusion between review vs active DATA. |
| **FIX** | None parser change. Recommend Hard Reset before golden re-test; confirm import review counts before activate. |
| **TEST** | Task 30 [4]; Task 26/29 golden suites |
| **RISULTATO** | ✅ Offline parse correct; UX/cache hypothesis — **manual device smoke** still advised |

### 5. Training import unreliable

| | |
|---|---|
| **PROBLEMA** | Import less reliable than older version |
| **ROOT CAUSE** | Engine v3.0 (uncommitted) differs from HEAD v2.1; tests lock golden LOI(2). Real device issues may be **activation timeout** (instrumented test03 10s) or stale APK — current APK now aligned. |
| **FIX** | Pipeline rebuild ensures assets = web |
| **TEST** | 411+ regression import tests |
| **RISULTATO** | ✅ Parser fidelity confirmed; device activation timeout remains in instrumented tests (3/9 fail) |

### 6. Program structure edits revert

| | |
|---|---|
| **PROBLEMA** | Edit exercise name/reps in import review → UI reverts |
| **ROOT CAUSE** | Review inputs used **`onchange` only**; `render()` / tab switch rebuilds DOM before blur → state never updated |
| **FIX** | Added **`oninput`** handlers on training review fields (same `updateReviewExerciseField`) |
| **TEST** | Task 30 [2], [3]: oninput in base + simulated edit/read-back |
| **RISULTATO** | ✅ Fix applied and verified in simulation |

### 7. Historical features missing (nutrition/supplements/therapy/login/DB/i18n)

| | |
|---|---|
| **PROBLEMA** | User fears feature loss |
| **ROOT CAUSE** | Features **present in working tree** but **uncommitted**; not missing from code |
| **FIX** | Document + recommend git commit of `index.base.html` + Task 22–30 artifacts |
| **TEST** | Task 20–29 regression |
| **RISULTATO** | ✅ Feature matrix below — all present in code |

---

## Feature Matrix

| FEATURE | PRESENTE | FUNZIONANTE | TESTATA |
|---------|----------|-------------|---------|
| Multi-domain import (train/nutr/supp/therapy) | ✅ | ✅ offline | ✅ Node golden |
| Golden LOI(2) 1W/4S/19E | ✅ | ✅ | ✅ Task 30 |
| IndexedDB `activateCanonicalProgram` | ✅ | ✅ | ✅ Task 27/29 |
| Coach AI chat | ✅ | ✅ backend | ✅ curl 200; device intermittent |
| Coach health / config | ✅ | ✅ | ✅ Task 28/30 |
| Google Login UI + native bridge | ✅ | ⚠️ needs `-PgoogleWebClientId` | ✅ wiring tests |
| ACCEDI account modal | ✅ | ✅ post-fix | ✅ Task 30 |
| PROFILO → settings form | ✅ | ✅ post-fix | ✅ Task 30 |
| Program review editor | ✅ | ✅ post oninput fix | ✅ Task 30 sim |
| Exercise DB / matcher | ✅ | ✅ | ✅ Task 28 |
| i18n ×10 | ✅ | ✅ | ✅ Task 29 |
| Hard / soft reset | ✅ | ✅ | ✅ Task 26/29 |
| Build pipeline index.base → APK | ✅ | ✅ | ✅ MD5 parity |
| Nutrition/supplements/therapy import | ✅ | ✅ parse | ✅ golden |
| Email account auth (backend) | ✅ | ✅ server | ⚠️ device manual |

---

## Files Created / Modified

| File | Action |
|------|--------|
| `MASTER_TASK_30_BASELINE_REPORT.md` | **Created** — Phase 1–3 baseline |
| `MASTER_TASK_30_FINAL_REPORT.md` | **Created** — this document |
| `test_master_task30_functional_e2e.mjs` | **Created** — 24 behavior tests |
| `web/index.base.html` | **Modified** — splash pointer-events; review oninput |
| `build_master25.mjs` | **Modified** — build tag MASTER-TASK-30 |
| `web/index.html` + `app/src/main/assets/index.html` | **Rebuilt** |
| `package.json` | **Modified** — test:30, regression chain |

---

## Test Results

| Suite | Result |
|-------|--------|
| **Task 30 Functional E2E** | **24/24 PASS** |
| Task 29 | 66/66 |
| Task 28 | 52/52 |
| Task 27 | 20/20 |
| Task 26 | 43/43 |
| Task 25 | 30/30 |
| Task 20 | 200/200 |
| **Total Node** | **435/435 PASS** |

---

## Build & APK

```powershell
cd C:\Users\giamm\Desktop\GiammariaSystemApp
node build_master25.mjs
npm run test:regression
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

**APK:** `C:\Users\giamm\Desktop\GiammariaSystemApp\app\build\outputs\apk\debug\app-debug.apk`  
**Install:** ✅ Success on P50_B (2026-08-29)

---

## Still Broken / Needs Manual Validation

1. **Coach HTTP 500** — not reproduced; capture logcat + payload size on device when it recurs  
2. **Import “wrong data”** — likely cache; Hard Reset + golden re-import smoke on device  
3. **Instrumented Android** — 3/9 fail (legacy V29 xlsx asset, activation timeout) — not LOI(2)  
4. **Google Login real OAuth** — requires Gradle `-PgoogleWebClientId=...`  
5. **Git hygiene** — Tasks 22–30 uncommitted; **`web/index.base.html` untracked** — commit recommended  

---

## Baseline Recommendation

| Option | Verdict |
|--------|---------|
| Checkout `70eb8a5` | ❌ **Reject** — loses import 3.0, PROFILO, splash fix, build pipeline |
| Keep working tree + commit | ✅ **Recommended** |
| Cherry-pick from HEAD | N/A — HEAD is older |

---

**Task 30 status:** Baseline documented; 2 minimal P0 fixes applied; 435 tests green; APK rebuilt and installed. User-facing validation of ACCEDI/PROFILO/import on device is the remaining step.
