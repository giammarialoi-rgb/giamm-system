# GIAMMARIA SYSTEM — MASTER TASK 26 FINAL REPORT
## FULL SYSTEM AUDIT + DEFINITIVE STABILIZATION + E2E REPAIR

**Target codebase:** `C:\Users\giamm\Desktop\GiammariaSystemApp` (branch `task22-full-product-recovery`)  
**Note:** Cursor workspace `Documents\repository\giamm-system` is a slim checkout without the import engine; all Task 26 work was applied to the Desktop full product.

---

### 1. Executive summary

Master Task 26 audited the real multi-domain product (not the slim Coach-API-only tree), reproduced semantic bugs that Task 25 tests had incorrectly locked in as PASS, and fixed them at root cause.

**Golden file `GIANMARIA LOI(2).xlsx` verified live:**
- Allenamento: **1W / 4S / 19E** with real exercise names (incl. PULLDOWN / PUSH DOWN as exercises)
- Alimentazione: **7 days / 35 meals**
- Integrazione: **8 items**
- Terapia: **6 meds / 2 blocks** — Telmisartan W1–4 no longer falsely mapped to Lunedì-only via “Monitorare”

**Activation** now persists all domains to IndexedDB with fingerprint read-back. **Soft reset** preserves program/nutrition/therapy/supplements. **Hard reset** wipes IDB + localStorage + sessionStorage. Profile UI wired. Coach proposals survive navigation.

---

### 2. Root cause analysis

| Symptom | Root cause | Fix |
|---|---|---|
| Telmisartan “solo Lunedì” | `allText.includes("MON")` matched inside **MONITORARE** (notes) | `detectTherapyDaysOfWeek()` — word-boundary tokens; notes excluded from day scan |
| Task 25 green on that bug | Assertion required Lunedì for Block 1 | Inverted assertion to expect all-7 / `default_daily` |
| Croci → Panca Inclinata; RDL → Stacco; Crunch → Plank | First-match `includes()` on dictionary order | Longest-keyword-first + dictionary reordering / split entries |
| Home shows “Sessione” | UI used `title\|\|day`, ignored `name` | Prefer `name\|\|title\|\|day` |
| Domains lost after confirm | `confirmImportAndActivate` only wrote program envelope + LS; never `saveNutrition/Therapy/...`; never `store.activeProgram` | `activateCanonicalProgram()` + full confirm path + init domain restore |
| Soft reset IDB no-op | `clearWorkoutLogs` cleared non-existent `workout_sessions` / `exercise_logs` stores | Documented LS-keyed logs; preserve IDB domains |
| Coach APPLICA died after nav | Proposals only in `window.activeCoachProposals`, not in `chatHistory` | Persist `proposalId` + `proposedAction` in history; rehydrate in `renderAI` |
| Profile button missing | Account modal only; `DATA.profile` unused | Header **PROFILO** + Settings athlete form + `saveAthleteProfile()` |

---

### 3. File modificati

| File | Change |
|---|---|
| `universal-import-engine.mjs` | Therapy day detector; longest-match normalize; dict fixes |
| `persistence-core.mjs` | `activateCanonicalProgram`; honest `clearWorkoutLogs` |
| `web/index.base.html` | Confirm/activate, init restore, profile, session label, reset, Coach proposals |
| `generate_bundles.mjs` | Synced `confirmImportAndActivate` |
| `test_master_task25_e2e_fidelity.mjs` | Correct Telmisartan assertions |
| `test_master_task26_stabilization.mjs` | **New** full stabilization suite |
| `package.json` | `test`, `test:26`, `build:web`, `test:regression` |
| `web/index.html` + `app/src/main/assets/index.html` | Regenerated via `build_master25.mjs` |

---

### 4. Architettura prima/dopo

**Invariata (voluta):**
```
UI → Application Controller / Services → Domain → Canonical Model → Import/Export → Persistence → Android WebView
```

**Dopo Task 26:**
- Canonical model remains SSOT for Review counters
- Activation path is atomic multi-domain IDB + LS + read-back
- Offline structured XLSX import remains AI-independent
- Compose migration **not** started (deferred as required)

---

### 5. Import engine

- Session vs exercise: PULLDOWN / PUSH DOWN remain exercises (existing `\b` + pattern guards + verified golden)
- Exercise normalize: longest keyword wins
- Therapy: schedule fields only for day tokens; `daysSource` audit field; aliases `daysOfWeek` / `weekStart` / `weekEnd`

---

### 6. Canonical model

Training: Program → Weeks → Sessions → Exercises → Sets (target vs actual unchanged)  
Nutrition / Supplements / Therapy / Exams attached on canonical program and persisted as dedicated IDB stores on activate.

---

### 7. Therapy model

Regimen preserved as protocol blocks (`protocols[]` / `cycles[]`) with per-med:
`dayOfWeek[]`, `frequency`, `timing`, `dose`, `start_week`/`end_week`, `notes`, `daysSource`.

**Never** invent a single weekday from free-text notes.

---

### 8. Persistence

- IDB `GIAMMARIA_SYSTEM_DB` stores unchanged
- New: `activateCanonicalProgram(prog)` — save program + domains + fingerprint verify
- Soft reset: clears `store.data` / `customSets` / `logs` only
- Hard reset: `wipeDatabase` + `localStorage.clear` + `sessionStorage.clear` + in-memory import/coach state

---

### 9. Reset

| Action | Clears | Preserves |
|---|---|---|
| AZZERA / clearWorkoutLogs | Workout loads/logs | Program, nutrition, therapy, supplements, profile |
| HARD RESET | Everything (IDB + LS + SS) | Clean boot state |

---

### 10. Profile

- Header **PROFILO** → Settings
- Editable name / age / weight / height / goal
- Saved to `store.profile` + `DATA.profile` via `persist()` (survives reload)

---

### 11. Coach AI

- Buttons remain wired (INVIA, VERIFICA SERVER, ANALIZZA FILE, voice when available)
- Proposals persist across `render()` / navigation
- Offline / API-down surfaces explicit errors (no silent fake success)
- Structured XLSX import does **not** depend on Coach AI

---

### 12. Android

- Assets synced via `build_master25.mjs` → `app/src/main/assets/index.html`
- `assembleDebug` **BUILD SUCCESSFUL**
- APK: `app/build/outputs/apk/debug/app-debug.apk`
- Physical device re-validation recommended (instrumented suite exists; not re-run in this session due to device availability)

---

### 13. Test eseguiti

| Suite | Result |
|---|---|
| `test_master_task26_stabilization.mjs` | **43 / 43 PASS** |
| `test_master_task25_e2e_fidelity.mjs` | **30 / 30 PASS** |
| `test_master_task20_architecture.mjs` | **200 / 200 PASS** |
| Gradle `assembleDebug` | **BUILD SUCCESSFUL** |

---

### 14. Risultati numerici

- Task 26: 43 PASS / 0 FAIL  
- Task 25 (corrected): 30 PASS / 0 FAIL  
- Task 20 regression: 200 PASS / 0 FAIL  
- Combined core: **273 PASS**

---

### 15. Golden file verification

**File:** `GIANMARIA LOI(2).xlsx`

| Domain | Verified |
|---|---|
| Training | 1W / 4S / 19E |
| Sessions | UPPER A, LOWER A, UPPER B, LOWER B |
| Exercises | See printed list in Task 26 output (19 names; PULLDOWN #5, PUSH DOWN #15 are exercises) |
| Nutrition | LUN–DOM, 35 meals |
| Supplements | Omega 3, Vit C, Vit D3, EAA, Creatina, Acqua, Magnesio Biglicinato, Multivitaminico |
| Therapy | 2 blocks (W1–4, W5–8); Metformina/Cardiaspirina/Telmisartan; Telmisartan W1–4 = Tutti i giorni |

---

### 16. APK build

```
BUILD SUCCESSFUL in 14s
Output: app/build/outputs/apk/debug/app-debug.apk
JAVA_HOME: Android Studio JBR 25
```

---

### 17. Problemi residui

1. **Physical Android re-smoke** of Confirm / Reset / Profile / Coach on device not re-executed in this session (Node + Gradle verified).
2. **`sync_and_test.mjs`** can still overwrite assets with unbundled `index.base.html` — avoid; use `build_master25.mjs` only.
3. **Documents slim checkout** (`giamm-system`) is still behind — merge/sync Desktop branch to GitHub when ready.
4. **Metformina W1–4 `daysSource=explicit_daily`** vs others `default_daily` — depends on schedule cell text containing daily hints; semantically both = all 7 days (OK).
5. Future **Compose** separation still pending (by design).

---

### 18. Prossimi interventi consigliati

1. Reopen Cursor on `Desktop\GiammariaSystemApp` as primary workspace; push `task22-full-product-recovery` (or merge to main).
2. Run `connectedDebugAndroidTest` on physical device with updated APK.
3. Deprecate or guard `sync_and_test.mjs` against unbundled copies.
4. Add npm `test:regression` to CI.
5. Optional: athlete profile IndexedDB store (currently LS via `GS_STORE`).

---

## MASTER TASK 26 STATUS

```
IMPORT:       PASS
TRAINING:     PASS
NUTRITION:    PASS
SUPPLEMENTS:  PASS
THERAPY:      PASS
REVIEW:       PASS
ACTIVATION:   PASS
PERSISTENCE:  PASS
RESET:        PASS
HARD RESET:   PASS
PROFILE:      PASS
COACH AI:     PASS
NAVIGATION:   PASS
ANDROID:      PASS (APK build; physical re-smoke recommended)
REGRESSION:   PASS
BUILD:        PASS
```

**MASTER TASK 26: COMPLETATA** (con residuo operativo: smoke fisico Android consigliato al prossimo device connect).
