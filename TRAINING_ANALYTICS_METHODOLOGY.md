# Metodologia Training Analytics

Analytics derivata. Il motore non riscrive `store.data`, i workout, le serie o la programmazione. Versione formule: `intel-v1`.

Livelli di evidenza: MEASURED | DERIVED | EVIDENCE_SUPPORTED | MODEL_BASED | HEURISTIC | EXPERIMENTAL.

---

## Volume (tonnellaggio)

**Definizione:** Lavoro eseguito come carico × ripetizioni.  
**Formula:** `Σ(load × reps × partMultiplier)` — `partMultiplier` = 2 solo in modalità per parte.  
**Input:** carico e rip registrati. **Unità:** kg. **Tipo:** DERIVED.  
**Evidenza:** Relazione dose–risposta tra volume di resistance training e ipertrofia, con grandi differenze individuali e senza un numero magico universale (review Schoenfeld e colleghi).  
**Limiti:** Non inventa riscaldamento vs lavoro. Serie saltate escluse.  
**Uso:** KPI, grafico, confronto periodo. Un aumento di volume non è automaticamente progressione.

---

## Export Check Fisico — niente riavvio SPA

**Causa:** su iOS, WebKit e PWA standalone l’attributo `download` di un `<a href="blob:…">` viene ignorato. Un `a.click()` **naviga il documento corrente verso il PDF**. Chiudendo il file, la WebView/PWA ricarica l’HTML: route, profilo e tab si perdono.

**Fix:** `shareOrSavePdfBlob` non naviga più la scheda. Ordine: NativeConfig share/download → Web Share API → overlay in-app (`#nurvan-pdf-overlay` + iframe). Snapshot `sessionStorage.NURVAN_SURFACE` (`reason: 'pdf'`) solo per un eventuale reload vero; si cancella dopo il restore o alla chiusura overlay.

**Limite OS:** se il sistema distrugge la WebView (memory, iOS che uccide la PWA in background), lo stato non può essere garantito oltre lo snapshot di view/settimana/giorno. Non è un reload innescato dal blob.

---

## Serie, ripetizioni, carico medio, frequenza, sedute

**Tipo:** DERIVED.  
**Limiti:** Il conteggio nominale sovrastima o sottostima la dose se lo stesso muscolo è coinvolto in più esercizi.

---

## Peso corporeo

**Tipo:** MEASURED. Solo valori inseriti. Nessuna interpolazione.

---

## e1RM e rep max stimate

**Definizione:** Stima del 1RM da una serie submassimale. Non è un 1RM testato.  
**Formula:** Epley `load × (1 + reps/30)`; singoli = carico; invalido se rip > 12.  
**e5/8/10RM:** inversione di Epley dalla e1RM corrente, solo se esiste.  
**Tipo:** DERIVED. **formulaVersion:** `epley-v1`.  
**Evidenza:** Il 1RM misurato ha buona affidabilità test-retest; le formule predittive peggiorano ad alte ripetizioni.  
**Regola:** mai sommare e1RM di esercizi diversi.

---

## Intensità, RPE, RIR

Un numero per serie; la scala arriva da `exIntensity` / settimana / preferenze.

- RIR `n` → intensità 10 = `10 − n`
- RPE `n` → intensità 10 = `n`

**Evidenza:** RPE/RIR sono utili per autoregolare; non obbliga a portare ogni serie a cedimento.  
**Tipo:** DERIVED se lo sforzo è presente, altrimenti vuoto.

---

## Serie dure e volume efficace

**Serie dure:** RIR ≤ 2 o RPE ≥ 8.  
**Volume efficace:** `Σ load × (reps + RIR)`.  
**Tipo:** HEURISTIC. Non usarle da sole per alzare o togliere volume.

---

## Contributo muscolare, serie dirette/indirette, ETD, costo di fatica

Mappa euristica: primario 1, secondario 0,5, indiretto 0,25.  
**Effective Training Dose** e **Fatigue Cost** sono modelli interni per la futura centralina, non metriche fisiologiche ufficiali.  
**Tipo:** HEURISTIC / MODEL_BASED.  
**Letteratura:** il conteggio frazionato/diretto-indiretto è un’ipotesi di programmazione, non una misura validata in modo uniforme.

---

## Snapshot unico e decision engine

Per ogni esercizio la UI e il peso consigliato leggono lo stesso `exerciseAnalyticsSnapshot` (`formulaVersion: snap-v1`).

Pipeline:

```text
RAW (immutabile)
  → exerciseAnalyticsSnapshot
  → evaluateExerciseState
  → recommendNext
```

`recommendNext` non ricalcola performance, volume, RPE o fatica da raw paralleli. Riceve lo snapshot (o lo costruisce una volta) e decide.

Campi condivisi: `performanceDelta`, `volumeDelta`, `performanceDirection`, `fatigue.signal` (solo intra-seduta), `recovery.signal` (carico recente, etichetta distinta), `currentE1RM` (picco dell’esposizione, non l’ultimo set).

Azioni: `increase` / `maintain` / `monitor` / `reduce_load` / `reduce_volume` / `insufficient`.

RPE 9 con prestazione in aumento → maintain/monitor, **non** riduzione automatica. Una sola seduta negativa → `monitor`, non reduce. Reduce richiede calo ripetuto + fatica + recupero/sforzo alti.

---

## Performance & Intensity Context

Layer aggiuntivo, non un sostituto del volume.

| Dimensione | Domanda | Non è |
| --- | --- | --- |
| Volume load | Quanto lavoro ho fatto? | Prestazione |
| Intensità | Quanto era alto il carico (assoluto / %e1RM)? | RPE |
| Effort | Quanto è stata difficile la serie? | Fatica cumulativa |
| Prestazione | Quanto sono riuscito a produrre? | Tonnellaggio |
| Fatica | Quanto è caduta la capacità in seduta / di recente? | Un RPE 9 isolato |
| Recupero | I dati recenti sono favorevoli a una nuova esposizione? | Fatica intra-seduta |
| Adattamento | La risposta alle dosi recenti appare positiva? | Volume > MRV |

`evaluatePerformanceContext` restituisce `volumeState`, `intensityState`, `effortState`, `performanceState`, `fatigueState`, `overallSignal`, `confidence`, `reasons`, `interpretation`.

Versioni: `performanceComparisonVersion: pic-v1`, `intensityContextVersion: intx-v1`, `effortContextVersion: effx-v1`, `doseContextVersion: dose-v1`, `recommendationVersion: reco-pic-v1`.

Il top set pesa più dei backoff. Mixed è uno stato valido. Effective Training Dose, Performance Efficiency e Session Quality Signal sono modelli interni (HEURISTIC / MODEL_BASED), non metriche fisiologiche ufficiali.

## Why Volume Load Is Not Performance

```text
130×7 @ 9, 117.5×9 @ 9, 117.5×7 @ 9
→
132.5×7 @ 9, 120×7 @ 9, 120×7 @ 9
```

Top load ↑, top reps =, RPE =. Il volume load può muoversi di poco o scendere perché il backoff ha perso ripetizioni. La prestazione resta positiva. Frase generata dal motore (esempio di forma): il volume è rimasto sostanzialmente invariato, ma hai aumentato il carico mantenendo le stesse ripetizioni e lo stesso livello di sforzo.

---

## Prestazione vs precedente (exercise exposure)

**Definizione:** confronto tra l’ultima esposizione valida dello stesso esercizio e la precedente esposizione valida. Non è la variazione di volume della seduta e non è “vs best storico”.

**Segnali (in ordine):** carico, ripetizioni, e1RM di supporto, contesto RPE/RIR. Il tonnellaggio è una metrica separata (`volume vs precedente`).

**Stati:** miglioramento / stabile / calo / dati insufficienti, più trend multi-seduta e confidenza.

**formulaVersion:** `perf-exposure-v1`.

**Regola:** same load + more reps + same RIR = prestazione in miglioramento. Un calo di volume con carico/rep/RIR in aumento non è un calo di prestazione.

## Tre scale di volume

- **GLOBAL:** volume totale, serie totali, ripetizioni, frequenza, sessioni, training load. Nessuna barra MEV/MAV/MRV.
- **MUSCLE GROUP:** serie di quel distretto vs MEV/MAV/MRV di quel distretto. Unità unica: serie / settimana.
- **EXERCISE:** carico, rip, e1RM, volume dell’esercizio, prestazione. Non è l’MRV del petto applicato alla panca.

Mai confrontare serie globali (es. 87) con l’MRV di un singolo muscolo (es. 20).

## Peso consigliato

Funziona su esercizi canonici, custom e aggiunti in enciclopedia. Fonte primaria: storico dell’esercizio, non la voce enciclopedica. Azioni: increase / maintain / monitor / reduce_load / reduce_volume / insufficient, sempre con `why` dallo snapshot. Accetta modifica solo i set futuri (`intelTargets`).

---

Default configurabili in `store.prefs.volumeLandmarks`.  
**Tipo:** MODEL_BASED.  
**Regola di raccomandazione:** volume > MRV stimata **non** implica riduzione se prestazione ↑, RPE stabile e recupero stabile. In quel caso: «la stima di MRV potrebbe essere conservativa».

---

## Training load, ATL, CTL, TSB

ATL = volume ultima settimana; CTL = media fino a 4; TSB = CTL − ATL.  
**Tipo:** MODEL_BASED, context-dependent.  
**Evidenza:** modelli nati nell’endurance. Qui solo tendenza. Non verdetto di overtraining e non unica base delle reco.

---

## Fatica

Due concetti distinti, mai etichettati entrambi come «fatica»:

- **Fatica durante questa seduta** (`intraSessionFatigue`, `snapshot.fatigue`): perdita di rip, deriva RPE/RIR sulla stessa esposizione.
- **Fatica / carico recente** (ATL/CTL, `fatigueFromWeeks`): accumulo sulle settimane. In UI: «Fatica recente (modello)».

RPE 9 da solo non rende la fatica HIGH e non attiva una riduzione.

**Tipo:** HEURISTIC. Mai «Fatigue = 73%». Mai diagnosi.

---

## Recupero / readiness

Observed (RPE, BW, durata) / derived (acuto-cronico) / estimated (segnale GOOD / MODERATE / LOW / INSUFFICIENT DATA).  
**Tipo:** HEURISTIC. Nessuna percentuale fisiologica.

---

## Prestazione, risposta al volume, adattamento

**Performance response** ha più peso del confronto volume-vs-MRV.  
**Volume response:** Δ volume vs Δ prestazione vs Δ sforzo vs recupero.  
**Adattamento:** POSITIVE / NEUTRAL / MIXED / NEGATIVE.  
**Tipo:** ESTIMATED. Servono più esposizioni. Una seduta non aggiorna i landmark.

---

## Raccomandazioni

Gerarchia: snapshot centralizzato → `evaluateExerciseState` → azione.  
Le reco **non** ricalcolano performance, volume, RPE o fatica da raw paralleli.

Azioni: increase / maintain / monitor / reduce_load / reduce_volume / insufficient.  
Riduci carico ≠ riduci volume. RPE 9 con prestazione ↑ → maintain/monitor, non reduce. Una sola seduta negativa → monitor. Reduce richiede calo ripetuto + fatica intra-seduta + recupero/sforzo alti.

Ogni reco ha why, evidence (stessi delta dello snapshot), confidence, signalsUsed, advisable.  
Accetta / Mantieni / Scarta scrivono solo `store.intelligence` e `store.intelTargets`. Mai `programmedWeight`. In seduta, Accetta prefilla solo i set non eseguiti.

---

## Settimane concluse

Una settimana è completa solo se tutti i giorni previsti (`sessions`/`days`) risultano finalizzati nei log.  
Default: `includeIncompleteWeeks = false`. Zoom e variazione ignorano la settimana in corso.

---

## Fonti (uso cauto)

- Volume e ipertrofia: review/meta-analisi sul dose–response (Schoenfeld et al.). Differenze individuali ampie.
- Prossimità al cedimento: RPE/RIR utili; non tutte le serie devono arrivare a cedimento.
- Autoregolazione: supportata se contestualizzata; le implementazioni non sono equivalenti.
- Frequenza: va letta insieme al volume totale.
- 1RM / e1RM: il test è specifico dell’esercizio; l’e1RM è una stima.
- Training load ATL/CTL/TSB: adattati dall’endurance, contesto-dipendenti.
- Conteggio diretto/indiretto/frazionato: pratica di programmazione, non misura biologica universale.

Nessuna fonte viene usata per sostenere una conclusione più forte di quanto mostri.

## Training Control Engine (preparazione)

Oggetto `analytics.control` con: actual, derived, dose, stimulus, performance, effort, fatigue, recovery, adaptation, volumeResponse, landmarks, personalResponse, performanceEfficiency, confidence.

`personalResponse` resta null sui campi di tolleranza finché non ci sono abbastanza esposizioni (≥4 settimane con dati). Non aggiorna `prefs.volumeLandmarks`.

**Performance efficiency:** Δ e1RM / |Δ volume|. HEURISTIC. Non mostrarla come fatto fisiologico.

