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

## Come si calcola

Ogni metrica ha `nameIt`, `whatIt`, `whyIt`, `howIt`, `limitIt`, `evidenceLevel`, `formulaVersion` nel catalogo.

## Training Control Engine (preparazione)

`build()` espone `control`, `personalResponse` e `performanceEfficiency`.

Sono strutture per la futura centralina (dose, stimolo, prestazione, fatica, recupero, adattamento, landmark). Non decidono la scheda e non riscrivono i landmark dopo una sola seduta.

