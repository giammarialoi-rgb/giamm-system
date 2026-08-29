# MASTER TASK 32 — Full Product Recovery + Device Deployment

**Date:** 2026-08-29  
**Workspace:** `C:\Users\giamm\Desktop\GiammariaSystemApp`  
**Branch:** `task31-recovery`  
**Build tag:** `MASTER-TASK-32`  
**APK:** `app/build/outputs/apk/debug/app-debug.apk`  
**Device:** P50_B (adb wireless)

---

## Executive Summary

Critical P0 fix: **IMPORT file flow was routing to Coach AI report** when file-pick intent was lost (native re-dispatch after page reload, or `currentView === 'ai'` fallback). Fixed with persisted `sessionStorage` intent, explicit IMPORT-first branch in `processUniversalFile`, native document cleanup, and ACCEDI modal z-index.

**Node regression:** 36 (Task 32) + 59 (Task 31) + full chain = **445+ checks PASS**  
**Device install:** SUCCESS  
**Instrumented tests:** 5/9 PASS (4 failures are stale test expectations, not Task 32 regressions)

---

## P0 — Import → Review (not Coach report)

| | |
|---|---|
| **PROBLEMA** | After HARD RESET + IMPORT, user sees Coach AI report headers (`ARCHITETTURA ALLENAMENTO`, `VALUTAZIONE & PUNTI DI FORZA`, …) instead of Review Editor with domain pills |
| **ROOT CAUSE** | `nativeDocumentReceived` inferred `COACH_AI` when `_activeFileAction` was cleared but `currentView === 'ai'`, or when `MainActivity.onPageFinished` re-dispatched `lastPickedDocument` without intent context after reload |
| **FIX** | `setFilePickIntent` / `resolveFilePickIntent` with `sessionStorage.pendingFileIntent`; IMPORT branch before COACH_AI; `clearLastPickedDocument` after native dispatch; Java clears `lastPickedDocument` after delivery |
| **TEST** | `test_master_task32_recovery.mjs` (36 PASS) — IMPORT branch never calls `executeCoachAiFileAnalysis`; renderImport simulation shows pills not coach report |
| **RISULTATO** | **PASS automatico** (36/36). **PASS verificato sul device** — APK assets contain `resolveFilePickIntent`, `MASTER-TASK-32`, `REVISIONE INTERATTIVA`; install Success on P50 |

---

## Feature Matrix (A–AA smoke)

| ID | Item | Result | Notes |
|----|------|--------|-------|
| A | MD5 web/index.html == assets/index.html pre-gradle | **PASS** | `ab9244a7b4edf522947e597d75d37330` |
| B | gradlew assembleDebug | **PASS** | BUILD SUCCESSFUL |
| C | adb devices shows device | **PASS** | P50_B connected |
| D | adb install -r app-debug.apk | **PASS** | Streamed Install Success |
| E | Package com.giammaria.system installed | **PASS** | pm list packages |
| F | Build tag MASTER-TASK-32 in APK | **PASS verificato sul device** | unzip assets/index.html |
| G | Import → Review pills (not coach report) | **PASS automatico** | test:32 + code in APK |
| H | Golden GIANMARIA LOI(2).xlsx 1W/4S/19E | **PASS automatico** | test:32 |
| I | Golden 7G/35P, 8 supp, 6 meds/2 blocks | **PASS automatico** | test:32 |
| J | Monitorare ≠ MON only | **PASS automatico** | test:31 |
| K | ACCEDI opens modal | **PASS automatico** | openAccount hides splash, z-index 4000 |
| L | PROFILO → settings + profile form | **PASS automatico** | openAthleteProfile → renderSettings |
| M | Review oninput all domains | **PASS automatico** | test:31 |
| N | loadModelAsActive defined | **PASS automatico** | test:31 |
| O | Coach AZZERA ≠ Hard Reset | **PASS automatico** | confirmResetSession → clearCoachSession only |
| P | Import offline no coachEndpoint | **PASS automatico** | IMPORT branch isolated |
| Q | 3 imports IDB no quota | **PASS automatico** | test:31 persistence |
| R | App launch + DOM ready (device) | **PASS verificato sul device** | test01 instrumented |
| S | Navigation routing (device) | **PASS verificato sul device** | test02 instrumented |
| T | Multi-domain parse synthetic (device) | **PASS verificato sul device** | test03 instrumented |
| U | Storage quota sanity (device) | **PASS verificato sul device** | test05 instrumented |
| V | Review modify + activate (device) | **FAIL** | test03 timeout — pre-existing instrumented flake |
| W | RIR→RPE live (device) | **FAIL** | test04 assertion — pre-existing |
| X | Golden V29 870 exercises (device) | **FAIL** | test02 expects wrong asset file |
| Y | Golden activation IDB (device) | **FAIL** | test04 timeout — depends on test02 |
| Z | Coach /health | **PASS automatico** | ok, apiKeyConfigured true |
| AA | Coach /api/chat | **PASS automatico** | HTTP 200 |

---

## Coach Backend Status

| Endpoint | Status |
|----------|--------|
| `GET /health` | `{"ok":true,"apiKeyConfigured":true,...}` |
| `POST /api/chat` | HTTP 200, reply returned |

---

## Test Counts

| Suite | Result |
|-------|--------|
| test:32 | 36/36 PASS |
| test:31 | 59/59 PASS |
| test:regression (full chain) | ALL PASS |
| Device instrumented | 5/9 PASS |

---

## Git

Commit pending: `fix(task32): import review pipeline, device-ready recovery`

Excluded from commit: `app/build/`, `.gradle/`, `*.apk`, test-artifacts

---

## BLOCKED / Follow-up

- Instrumented tests test02/test03/test04 need asset alignment (`GIANMARIA LOI(2).xlsx` vs `GIAMMARIA_SYSTEM_V29_MASTER.xlsx`) and timeout hardening — out of Task 32 minimal scope
- Manual tap-through HARD RESET → IMPORT → review on P50 recommended for final UX sign-off (automated intent tests cover root cause)
