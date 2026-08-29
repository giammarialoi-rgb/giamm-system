# MASTER TASK 30 — Baseline Report (Phase 1–3)

**Workspace:** `C:\Users\giamm\Desktop\GiammariaSystemApp`  
**Date:** 2026-08-29  
**Branch:** `task22-full-product-recovery`  
**HEAD commit:** `70eb8a5` — *feat(task21): Master Task 21 Full Runtime Recovery…*

---

## 1. Current State Snapshot

| Item | Value |
|------|--------|
| Branch | `task22-full-product-recovery` |
| Last committed task | **Task 21** (`70eb8a5`) |
| Tasks 22–29 | **Almost entirely uncommitted** (staged scripts + unstaged product files) |
| Build tag in APK | `MASTER-TASK-29` |
| Node regression | **411/411 PASS** (Task 20–29 chain) |
| Device APK install | 2026-08-29 02:56:47 (P50_B) |
| APK path | `app/build/outputs/apk/debug/app-debug.apk` |

### Git working tree (critical)

| Category | Files |
|----------|--------|
| **Staged (not in HEAD)** | 49 files incl. `build_master25.mjs`, test suites Task 22–25, patch scripts |
| **Modified unstaged** | `web/index.html`, `app/src/main/assets/index.html`, `universal-import-engine.mjs`, `persistence-core.mjs`, `coach-api.mjs`, `build_master25.mjs`, `MainActivity.java`, `package.json` |
| **Untracked (source of truth!)** | `web/index.base.html`, `GIANMARIA LOI(2).xlsx`, Task 26–29 reports & tests, `apply_task24_fixes.mjs`, etc. |

**Risk:** `web/index.base.html` — the editable UI source — is **not tracked in git**. Rebuild pipeline depends on it but it can be lost on checkout/clone.

---

## 2. Branch + Relevant Commits

```
70eb8a5 feat(task21): Full Runtime Recovery + device certification   ← HEAD
9ada88a checkpoint: pre-task21 runtime recovery baseline
64df46e Restore email account authentication routes
… (backend OAuth, Coach AI, import fixes back to initial upload 55e56e2)
```

**Tasks 25–29 have no dedicated commits.** All work lives in working tree / index staging from Task 22 recovery branch work.

---

## 3. Files Changed (Tasks 25–29 effective delta vs HEAD)

| File | HEAD | Working tree | Role |
|------|------|--------------|------|
| `web/index.base.html` | ❌ absent | ✅ present (untracked) | **UI source** for build |
| `build_master25.mjs` | ❌ absent | ✅ staged+modified | Bundler: base → web + assets |
| `web/index.html` | Task 21 (~318 LOC delta in 70eb8a5) | +8357/−2558 vs HEAD | Built monolith |
| `app/src/main/assets/index.html` | synced in 70eb8a5 | matches web MD5 | Android WebView entry |
| `universal-import-engine.mjs` | v2.1 | v3.0 (+900 LOC) | Multi-domain parse |
| `persistence-core.mjs` | basic | +102 LOC | `activateCanonicalProgram`, read-back |
| `coach-api.mjs` | deployed base | +35 LOC | health `aiConfigured` |
| `MainActivity.java` | Task 21 | +5 LOC | NativeConfig tweaks |
| `package.json` | partial | test:25–29 regression chain | |

### Task reports (untracked, desktop only)

- `TASK_25_FINAL_E2E_REPORT.md`, `TASK_24_DEFINITIVE_IMPORT_REPAIR_REPORT.md`
- `MASTER_TASK_26_FINAL_REPORT.md` … `MASTER_TASK_29_FINAL_REPORT.md`

---

## 4. Architecture Truth Map (Phase 2)

### Pipeline (verified)

```
web/index.base.html
       ↓  node build_master25.mjs  (+ generate_bundles.mjs)
web/index.html  ←→  app/src/main/assets/index.html
       ↓  ./gradlew assembleDebug
app/build/outputs/apk/debug/app-debug.apk
       ↓
Android WebView (MainActivity loads assets/index.html)
```

### Hash verification (2026-08-29)

| Artifact | MD5 |
|----------|-----|
| `web/index.base.html` | `CBE212069CAFEFAA9895DCFD80AAB8FD` |
| `web/index.html` | `333504F8C280E33DD16BAA3008C612B4` |
| `app/src/main/assets/index.html` | `333504F8C280E33DD16BAA3008C612B4` |
| APK `assets/index.html` | `333504F8C280E33DD16BAA3008C612B4` |

**Conclusion:** web, assets, and APK are **aligned**. Source of truth for edits is **`web/index.base.html`** → rebuild required. Risk pattern *"fixed in web but Android stale"* is **not present** in current tree (hashes match).

**Risk pattern that IS present:** editing `web/index.html` directly without rebuilding from base → next `build_master25.mjs` run overwrites changes.

---

## 5. Regressions Introduced (evidence-based)

| ID | Symptom | Root cause | Introduced |
|----|---------|------------|------------|
| R1 | ACCEDI/PROFILO “open nothing” | `#splash` z-index **3000** covers header (1100); blocks pointer events until `finishInit()` (up to **2.5s**). HEAD lacks `pointer-events:none` early fix. | Pre–Task 29; partial fix in Task 29 working tree |
| R2 | PROFILO button missing | `openAthleteProfile()` + `#profile-button` added in working tree only; **absent in HEAD** | Task 29 working tree |
| R3 | Coach HTTP 500 (user report) | Production `/health` OK, `/api/chat` returns **200** with valid payload. 500 likely **intermittent Gemini API** or **oversized `context.program`** payload. Bad curl → 400 (not 500). | Server-side / payload-dependent |
| R4 | Import “wrong data” | Golden `GIANMARIA LOI(2).xlsx` parses **correctly** offline (1W/4S/19E, 7G/35P, 8 supp, 6 meds). Wrong data likely **stale IDB/localStorage program** from prior session, or user viewing **active program** vs **import review**. | State/cache UX, not parser regression |
| R5 | Program editor edits revert | Review inputs use **`onchange`** (fires on blur). Any `render()` before blur (tab switch, confirm, timer) **rebuilds DOM** from state that was never updated. | Task 20+ review UX |
| R6 | Tests green, product broken | Node tests verify **parser + function existence**; do not simulate **WebView splash overlay**, **onchange timing**, or **full tap flows**. | Test gap (Tasks 25–29) |
| R7 | `web/index.base.html` untracked | Source not in git → recovery/clone loses UI source | Process gap since Task 22 |

---

## 6. Best Baseline Commit (with evidence)

| Candidate | Verdict |
|-----------|---------|
| **`70eb8a5` (HEAD / Task 21)** | Last **committed** stable point. Has account modal + import v2.1. **Missing:** build pipeline, multi-domain import 3.0, Task 26–29 fixes, PROFILO button, splash click fix, `activateCanonicalProgram`. |
| **Working tree (2026-08-29)** | **Best functional baseline.** 411 tests pass, golden parse correct, APK aligned, Task 29 UI fixes present. **Not committed.** |

**Recommendation:** Do **not** destructive checkout to `70eb8a5`. Current working tree is strictly ahead. **Commit** `index.base.html` + Task 22–29 artifacts to preserve baseline.

---

## 7. Diff Baseline (70eb8a5) vs Current — Feature Matrix

| Feature | HEAD 70eb8a5 | Working tree | Evidence |
|---------|--------------|--------------|----------|
| A. Multi-domain import (train/nutr/supp/therapy) | Partial v2.1 | ✅ v3.0 | `test_canonical_parse.mjs`, Task 26 golden |
| B. Golden LOI(2) 1W/4S/19E | Unknown | ✅ | Node parse output |
| C. IndexedDB persistence | Basic | ✅ `activateCanonicalProgram` | `persistence-core.mjs` |
| D. Coach AI chat | ✅ backend | ✅ health OK, chat 200 | curl 2026-08-29 |
| E. Google Login | Wired | ✅ + explicit misconfig msg | `startGoogleAuth`, Gradle `-PgoogleWebClientId` |
| F. ACCEDI modal | ✅ `openAccount()` | ✅ + splash fix | diff vs HEAD |
| G. PROFILO | ❌ no button | ✅ `openAthleteProfile()` | grep HEAD vs base |
| H. Program review editor | ✅ UI | ⚠️ onchange revert bug | code review |
| I. Exercise DB / matcher | ✅ | ✅ expanded keywords | engine 3.0 |
| J. i18n ×10 | ✅ | ✅ | Task 29 tests |
| K. Hard/soft reset | ✅ | ✅ | Task 26/29 |
| L. Build pipeline | ❌ no `build_master25` | ✅ | file presence |

---

## 8. Lost vs Intact Functions

### Intact (verified in working tree + tests)

- `processUniversalFile` IMPORT vs COACH_AI branching
- `confirmImportAndActivate` + IDB read-back
- `openAccount`, `closeAccount`, OAuth handlers
- `universal-import-engine.mjs` v3.0 golden parse
- ConfigService Coach URL fallback
- RIR/RPE engine, 10 languages, exercise DB search

### Broken / degraded (user-facing)

- Header buttons during splash window (R1)
- Review field edits before blur (R5)
- Instrumented Android 6/9 (timeout + legacy V29 xlsx asset — not LOI(2))

### Missing from git (not from product)

- `web/index.base.html` version history
- Commits for Tasks 22–29

---

## 9. Phase 3 — Bug Investigation Summary

### 9.1 ACCEDI / PROFILO

- **Code:** `openAccount()` sets `#account-modal` to `display:flex`. Modal exists (line 826 base). `openAthleteProfile()` → `navigate('settings')` + scroll to `#profile-name`.
- **HEAD gap:** no PROFILO button; splash blocks clicks.
- **Working tree:** Task 29 adds `#profile-button`, `pointer-events:none` in `finishInit`, header z-index 1101.
- **Remaining gap:** splash still has default `pointer-events:auto` **during init** before `finishInit` — header taps swallowed for 0–2500ms.

### 9.2 Coach HTTP 500

```
GET  https://coach-api-gemini.onrender.com/health
→ {"ok":true,"apiKeyConfigured":true,"model":"gemini-3.1-flash-lite"}

POST /api/chat {"message":"Ciao","conversation_id":"test123","context":{},"history":[]}
→ HTTP 200, valid reply
```

500 occurs in `coach-api.mjs` catch block when Gemini SDK throws. Frontend shows `HTTP 500: Coach interaction failed.` via `readApiJson`. Not reproduced with minimal payload.

### 9.3 Import wrong data

- Golden file at repo root parses: **1W, 4S, 19E, 7G, 35P, 8 supp, 6 meds / 2 blocks**.
- `canonicalProgram.weeks === canonicalProgram.training.weeks` (same reference).
- Wrong data hypothesis: **cached active program** in IDB/localStorage displayed after import cancel, or user on **Home** viewing old DATA while import review was correct.

### 9.4 Program structure editor

- `updateReviewExerciseField(w,s,e,field,val)` mutates in-memory canonical program correctly.
- `renderImport()` / `switchReviewTab()` call `render()` → full innerHTML rebuild.
- Inputs bound with `onchange` only → **edits lost if render before blur**.

---

## 10. Minimal Fixes Planned (Phase 4)

| Priority | Fix | Files |
|----------|-----|-------|
| P0 | `#splash { pointer-events: none; }` — header always clickable | `web/index.base.html` |
| P0 | Review training fields: add `oninput` sync (same handler as onchange) | `web/index.base.html` |
| P1 | Track `web/index.base.html` in git (recommend commit, not auto-done) | git |

No architectural refactor. Rebuild: `node build_master25.mjs` → `gradlew assembleDebug`.

---

## 11. Honest Assessment

- **Automated tests:** strong on parsing/persistence contracts; **weak on Android WebView interaction timing**.
- **Current code** is ahead of HEAD and **should not be reverted** to Task 21.
- **User-reported failures** align with **splash overlay (R1)**, **review onchange (R5)**, and **test-reality gap (R6)** more than import/parser regression.
- **Coach 500:** backend healthy today; treat as **transient Gemini** or **large program context** until reproduced with device logs.

---

*Generated: Master Task 30 Phase 1–3 — baseline before code changes.*
