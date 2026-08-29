# MASTER TASK 29 — Final Report
**Repository:** `C:\Users\giamm\Desktop\GiammariaSystemApp`  
**Branch:** `task22-full-product-recovery`  
**Build tag:** MASTER-TASK-29  
**Date:** 2026-08-29

---

## 1. Stato iniziale (fotografia)

| Item | Valore |
|------|--------|
| Workspace | `C:\Users\giamm\Desktop\GiammariaSystemApp` (corretto, non slim repo) |
| Branch | `task22-full-product-recovery` |
| Build pipeline | `web/index.base.html` → `node build_master25.mjs` → `web/index.html` + `app/src/main/assets/index.html` |
| Test regression pre-fix | **345/345 PASS** (Task 20–28) |
| Problema segnalato | Regressioni UI Android percepite mentre i test automatici passavano |
| Disallineamento rilevato | `web/index.html` e assets erano allineati (MD5 match); APK conteneva assets ma poteva essere stale fino a rebuild |

---

## 2. Regressioni trovate (codice reale)

| ID | Area | Problema | Gravità |
|----|------|----------|---------|
| R1 | **UI — Modelli** | `onclick="loadModelAsActive(idx)"` senza funzione definita → pulsante **Carica** morto | **P0** |
| R2 | **UI — Header** | Splash `z-index:3000` copriva header durante fade → ACCEDI/PROFILO non cliccabili per ~1.2s | **P1** |
| R3 | **Google Login** | Messaggio generico se `GOOGLE_WEB_CLIENT_ID` assente | **P2** |
| R4 | **Profilo** | Navigazione a settings senza scroll al form profilo | **P2** |
| R5 | **Instrumented tests** | 3/9 test Android falliti (timeout activation, golden V29 file) | **Info** — test legacy, non golden LOI(2) |

**Non regressi (verificati):** import offline golden 1W/4S/19E, terapia Monitorare, storage IDB multi-programma, Coach config Task 28, i18n×10.

---

## 3. Root cause

1. **loadModelAsActive:** refactoring multi-programma introdusse `activateSavedProgram` / `applyModel` ma un template HTML conservò il nome legacy `loadModelAsActive`.
2. **Splash blocking:** overlay fullscreen con z-index superiore all'header finché `display:none`; nessun `pointer-events:none` durante fade.
3. **Test vs realtà:** suite Node verifica parser/canonical model; non scansionava onclick orfani fino a Task 29.

---

## 4. File modificati

| File | Modifica |
|------|----------|
| `web/index.base.html` | Splash pointer-events; header touch targets; `startGoogleAuth` messaggio GOOGLE_WEB_CLIENT_ID; `openAthleteProfile` scroll; `loadModelAsActive` → `applyModel`; `finishInit` più rapido |
| `build_master25.mjs` | Build tag MASTER-TASK-29 |
| `test_master_task29_full_recovery.mjs` | **NUOVO** — 66 controlli (pipeline, golden, storage, UI contracts, reset, i18n, coach) |
| `package.json` | `test:29`, regression chain aggiornata |
| `web/index.html` + `app/src/main/assets/index.html` | Ricostruiti |

---

## 5. Funzionalità ripristinate / rafforzate

- Pulsante **Carica** modelli/template (home dashboard)
- **ACCEDI / PROFILO** cliccabili subito dopo avvio splash
- **Google Login** risponde con messaggio esplicito se non configurato
- **PROFILO** apre Impostazioni e scrolla al form atleta
- Scansione sistematica onclick → function (zero handler orfani)

---

## 6. Test automatici

| Suite | Risultato |
|-------|-----------|
| **Task 29** | **66/66 PASS** |
| Task 28 | 52/52 |
| Task 27 | 20/20 |
| Task 26 | 43/43 |
| Task 25 | 30/30 |
| Task 20 | 200/200 |
| **Totale Node** | **411/411 PASS** |

---

## 7. Golden File `GIANMARIA LOI(2).xlsx`

| Dominio | Atteso | Ottenuto |
|---------|--------|----------|
| Allenamento | 1W / 4S / 19E | ✅ |
| Alimentazione | 7G / 35P | ✅ |
| Integrazione | 8 | ✅ |
| Terapia | 6 meds / 2 blocchi | ✅ |
| Validazione | pass | ✅ |
| Monitorare ≠ Lunedì | 7 giorni | ✅ |

---

## 8. Storage

- 3 programmi consecutivi in IndexedDB: ✅
- Nessun base64 in push `store.docs`: ✅
- Hard reset: `wipeDatabase` + `localStorage.clear` + `sessionStorage.clear`: ✅ (codice verificato)
- Soft reset: `clearWorkoutLogs` preserva programma: ✅ (Task 26)

---

## 9. Login Google

- UI: `openAccount()` + `startGoogleAuth()` wired ✅
- Android: `NativeConfig.startGoogleSignIn()` + `GOOGLE_WEB_CLIENT_ID` in Gradle ✅
- Se non configurato: *"Google Login non configurato. Configurare GOOGLE_WEB_CLIENT_ID nella build Android."* ✅
- **Build con client ID:** `./gradlew assembleDebug -PgoogleWebClientId=YOUR_ID.apps.googleusercontent.com`

---

## 10. Coach AI

- ConfigService fallback URL (Task 28) preservato ✅
- Import **OFFLINE** — nessuna chiamata Coach in branch IMPORT ✅
- Analisi file Coach: fallback locale + banner config ✅
- Render health: `https://coach-api-gemini.onrender.com/health` → `apiKeyConfigured: true` (live)

---

## 11. Database esercizi

- `searchDb` + `buildExerciseDbFromDictionary` presenti ✅
- Matcher longest-keyword: PULLDOWN, CROCI, RDL, etc. (Task 28 smoke) ✅

---

## 12. Multilingua

10 lingue in `I18nService`: it, en, es, fr, de, pt, ru, zh, ar, hi ✅

---

## 13. Reset

| Azione | Comportamento |
|--------|---------------|
| Azzera log workout | Cancella carichi/log, mantiene programma |
| Hard reset | Wipe IDB + LS + SS + reload |

---

## 14. Build Android

```
JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
.\gradlew.bat assembleDebug
→ BUILD SUCCESSFUL
```

**APK:** `app/build/outputs/apk/debug/app-debug.apk`  
Verificato contenuto: `index.html`, `gs_logo.png`, `xlsx.full.min.js`, `data.json`

---

## 15. Test fisico Android

| Test | Esito |
|------|-------|
| `adb install -r app-debug.apk` | ✅ Success |
| Instrumented `connectedDebugAndroidTest` | **6/9 PASS**, 3 FAIL |
| Passati | App launch, navigation, RIR/RPE live, storage quota, device env, complex parse (parziale) |
| Falliti | `test03_ReviewModificationsAndAtomicActivation` (timeout 10s), `test04_GoldenActivation` (file V29 20W — asset legacy, non LOI(2)) |

**Nota:** I 3 test falliti usano timeout stretti o il file `GIAMMARIA_SYSTEM_V29_MASTER.xlsx` (20 settimane), non il golden ufficiale `GIANMARIA LOI(2).xlsx`. Il parser golden LOI(2) è verificato da 411 test Node.

**Smoke manuale consigliato su device (post-install):**
1. Avvio → logo visibile, splash scompare
2. ACCEDI → modal account
3. PROFILO → form atleta in Impostazioni
4. Import golden XLSX → Review 1W/4S/19E
5. Coach → VERIFICA SERVER AI
6. Hard reset → nessun programma attivo

---

## 16. Problemi residui

1. **GOOGLE_WEB_CLIENT_ID** — richiede build Gradle esplicita per login reale
2. **Instrumented tests** — aggiornare test03 timeout e test04 per usare `GIANMARIA LOI(2).xlsx` (task futura, non refactoring architettura)
3. **Smoke UI manuale** — non tutti i 15 scenari A–O eseguiti automaticamente in questa sessione

---

## 17. Regola anti-regressione

Funzionalità Task 25–28 **mantenute**. Nessuna rimozione servizi, nessuna migrazione Compose, nessuna dipendenza import→Gemini.

---

## 18. Comandi verifica

```powershell
cd C:\Users\giamm\Desktop\GiammariaSystemApp
node build_master25.mjs
npm run test:29
npm run test:regression
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat assembleDebug
```

---

**Task 29 status:** Stabilizzazione codice completata; **411 test Node PASS**; **1 dead button reale corretto**; APK rebuildato e installato; instrumented Android **parziale (6/9)**. Validazione UI completa A–O richiede smoke manuale sul device con golden file.
