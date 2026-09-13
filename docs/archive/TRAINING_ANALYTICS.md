# Motore di analisi allenamento

Le formule vivono in `web/training-analytics-engine.js`. La UI Stats e Workout interrogano il motore e non ricalcolano da sole.

I dati grezzi (`store.data`, log, scheda) restano immutabili. Le raccomandazioni stanno in `store.intelligence` e `store.intelTargets`.

| Tipo | Significato |
| --- | --- |
| MEASURED | Valore inserito da te (kg, rip, BW) |
| DERIVED | Calcolo da dati osservati (volume, e1RM) |
| MODEL_BASED | Modello interno configurabile (landmark, ATL/CTL) |
| HEURISTIC | Classificazione euristica (serie dure, contributo muscolare) |
| ESTIMATED | Segnale interpretativo (adattamento, recupero) |

---

## Volume

Somma di carico × ripetizioni delle serie valide. Un volume più alto è un fatto, non un miglioramento.

## Serie / ripetizioni / carico medio / frequenza / sedute

Conteggi derivati. 1 serie nominale non vale 1 per ogni muscolo.

## Peso corporeo

Valore BW registrato sulla settimana. Se manca, resta vuoto.

## Intensità

RIR e RPE sono scale opposte. Senza sforzo il dato resta vuoto.

## e1RM

Stima del massimale a una ripetizione (Epley), non un 1RM testato. Solo per lo stesso esercizio. Sopra 12 rip non si calcola.

## Serie dure / volume efficace

Euristiche da RIR/RPE. Non decidono da sole il volume della prossima seduta.

## Contributo muscolare

Mappa primaria / secondaria / indiretta. Pesi interni 1 / 0,5 / 0,25. Non sono coefficienti fisiologici misurati.

## Landmark MV–MEV–MAV–MRV

Stime configurabili. Superare la MRV stimata non impone da sola una riduzione se la prestazione resta positiva.

## Training load / ATL / CTL / TSB

Modello adattato dal carico endurance. Solo tendenza, non diagnosi.

## Fatica / recupero / adattamento

Segnali con motivo e confidenza. Mai «sei in overtraining». Mai una percentuale inventata.

## Snapshot unico

Card esercizio, peso consigliato, report e session summary usano `exerciseAnalyticsSnapshot`. La recommendation non ha un secondo calcolo di performance/volume/fatica.

Pipeline: RAW → snapshot → `evaluateExerciseState` → recommendation.

`previousExposure` è la precedente esposizione valida e comparabile dello stesso esercizio. Prestazione, volume, e1RM e reco usano quella stessa coppia. Il trend multi-seduta è un campo separato (`multiTrend`).

| Campo snapshot | UI | Recommendation |
| --- | --- | --- |
| performanceDelta | Prestazione vs precedente | evidence + decisione |
| volumeDelta | Volume vs precedente | evidence |
| fatigue.signal | Fatica durante questa seduta | evidence (stesso valore) |
| recovery.signal | Recupero recente | evidence (concetto distinto) |
| currentE1RM | Massimale stimato dell’esposizione | contesto |
| multiTrend | Trend ultime esposizioni | contesto, non sostituisce il delta singolo |

Fatica intra-seduta ≠ recupero recente. Non si usano due “fatiche” con lo stesso nome. RPE 9 con prestazione in aumento non attiva da solo una riduzione.

## Performance & Intensity Context

Il tonnellaggio (`kg × rip × serie`) resta una metrica di volume load. Non è prestazione, intensità, fatica o adattamento.

`evaluatePerformanceContext(snapshot)` legge volume, intensità, effort, prestazione e fatica come dimensioni separate e produce uno stato + una frase generata dai delta (non un testo fisso in UI).

Pipeline: RAW → snapshot (+ PIC) → `evaluatePerformanceContext` → `evaluateExerciseState` → recommendation.

## Why Volume Load Is Not Performance

Esempio (set reali):

```text
A  130×7 + 117.5×9 + 117.5×7
B  132.5×7 + 120×7 + 120×7
```

Il volume load può restare quasi uguale o persino scendere (il backoff fa meno ripetizioni). Il top set sale 130 → 132.5 a pari rip e pari RPE. La risposta di prestazione è **positiva**. Il motore non conclude dal solo tonnellaggio.

## Peso consigliato

`evaluateExerciseState(snapshot)` produce `increase` / `maintain` / `monitor` / `reduce_load` / `reduce_volume` / `insufficient`. Accetta modifica solo i set futuri.

---

Ogni metrica ha `nameIt`, `shortNameIt`, `technicalName`, `whatIt`, `whyIt`, `howIt`, `limitIt`, `unit`, `evidenceLevel`, `formulaVersion`. In UI: etichetta umana prima, termine tecnico dopo. Coach e Client usano lo stesso motore; il Client vede analytics e suggerimenti ma non applica da solo le modifiche alla scheda (`CHIEDI AL COACH`).

## Training Control Engine (preparazione)

`build()` espone `control`, `personalResponse` e `performanceEfficiency`.

Sono strutture per la futura centralina (dose, stimolo, prestazione, fatica, recupero, adattamento, landmark). Non decidono la scheda e non riscrivono i landmark dopo una sola seduta.

