# MASTER TASK 31 — Working Notes & Baseline

**Date:** 2026-08-29  
**Workspace:** `C:\Users\giamm\Desktop\GiammariaSystemApp`  
**Branch:** `task31-recovery`

---

## Phase 1 — Mandatory Audit

### Git state

| Item | Value |
|------|-------|
| HEAD | `f83779e` — *MASTER: stabilize app Tasks 22-30* |
| Task 21 baseline | `70eb8a5` (parent of stabilization commit) |
| Branch | `task31-recovery` |
| Uncommitted | Yes — Tasks 22–30 work + Task 31 fixes (not auto-committed per rules) |

### File classification

| Category | Paths |
|----------|-------|
| **Real sources** | `web/index.base.html`, `build_master25.mjs`, `universal-import-engine.mjs`, `persistence-core.mjs`, `prepare_task20_*.mjs`, `coach-api.mjs`, `app/src/main/java/...`, `test_master_task*.mjs` |
| **Generated (rebuild)** | `web/index.html`, `app/src/main/assets/index.html`, `prepare_task20_persistence_clean.mjs`, `prepare_task20_import_engine.mjs` |
| **Build artifacts** | `app/build/**`, `.gradle/**`, `build/reports/**` |
| **Test artifacts** | `test-artifacts/**`, golden `GIANMARIA LOI(2).xlsx` |
| **Reports** | `MASTER_TASK_*_FINAL_REPORT.md` |

**Rule:** Edit `web/index.base.html` only → `node build_master25.mjs` → assets → gradle → APK.

### Task 30 fixes verified present (pre-Task 31)

- `#splash { pointer-events: none; }` + `finishInit()` sets `pointerEvents = 'none'`
- Training review `oninput` + `updateReviewExerciseField`
- `loadModelAsActive` → `applyModel` → `activateSavedProgram`
- `openAccount()` / `openAthleteProfile()` wired in header

### Task 31 delta

- Extended `oninput` to nutrition, supplements, therapy, exams review fields + title
- Build tag `MASTER-TASK-31`
- New `test_master_task31_recovery.mjs` (59 behavior tests)
- `test:regression` chain updated to run Task 31 first

---

## Phase 2 — Regression map (A–H)

See `MASTER_TASK_31_FINAL_REPORT.md` for full PROBLEMA → ROOT CAUSE → FIX → TEST → RISULTATO.
