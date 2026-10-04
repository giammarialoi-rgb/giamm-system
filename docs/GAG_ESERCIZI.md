# Esercizi dal PDF «Exercise Library – Booty By Bret» e sezione GAG

Analisi del 05/10/2026. Il PDF è un elenco di **413 pagine-esercizio** (nomi con link, nessuna descrizione né immagine). Il lavoro svolto:

| | Quanti | Cosa ne ho fatto |
|---|---|---|
| Parte alta del corpo (panca, trazioni, rematori, spalle, braccia…) | 141 | Esclusi, come richiesto |
| Parte bassa e core | 272 | Analizzati uno per uno contro la libreria (300 voci, più i sinonimi della tassonomia) |
| …di cui **tecniche** (pausa, tempo, eccentrica, pulse, isohold, drop set, piramidi, deficit, 1 ¼, tensione costante, speed, rest-pause) | ~100 | Non sono esercizi nuovi ma modi di eseguirne uno: non aggiunti |
| …di cui **già presenti** o varianti minime di attrezzo (squat, stacchi, hip thrust col bilanciere, Bulgarian, walking lunge, frog pump, nordic, leg press…) | ~135 | Non aggiunti, per non avere copie |
| …di cui **movimenti nuovi** | **36** | Aggiunti alla libreria (sotto) |

Regola: un nome del PDF diventa un esercizio solo se è un movimento che la libreria non ha. Si controlla anche il sinonimo (es. *Bicycle crunch* = «Criss cross» del Pilates, ora trovabile anche con quel nome; *Hanging leg raise* = «Leg raise»).

## I 36 esercizi aggiunti

Per ognuno: nome nell'app · muscolo · attrezzo · livello (0 chiunque, 1 serve un po' di pratica, 2 avanzato). **Nessuno ha ancora l'immagine**: l'app mostra il segnaposto, e il link YouTube è la ricerca (nessun video verificato inventato).

**Glutei – ponti, hip thrust, reverse hyper**
Hip thrust manubrio · Hip thrust piedi rialzati (1) · B-stance hip thrust (1) · Hip thrust con elastico (1) · Glute bridge con elastico · Glute bridge bilanciere · Glute bridge manubrio · Glute bridge piedi rialzati (1) · Reverse hyper (1) · Reverse hyper su panca (1) · Iperestensione 45° glutei

**Glutei – kickback e aperture dell'anca**
Kickback cavo in ginocchio · Donkey kick · Fire hydrant · Clam shell · Abduzione sdraiata sul fianco · Abduzione in piedi con elastico · Abduzione ai cavi in piedi · Abduzione seduta con elastico · Lateral band walk · Monster walk · Hip hike (1)

**Gambe – squat, affondi, step**
Sumo squat · Front squat manubri (1) · Curtsy lunge (1) · Lateral lunge · Affondi bilanciere (1) · High step-up (1) · Skater squat (2) · Single-leg box squat (1)

**Femorali**
Stacco rumeno manubri · B-stance RDL (1) · Leg curl con slider (1) · Leg curl con fitball (1) · Leg curl manubrio (1)

**Core**
RKC plank (1)

Dove sono: `web/exercise-catalog-extra.js` (nome, nome inglese, muscolo, attrezzo, sinonimi di ricerca), `web/exercise-taxonomy.js` (movimento, ruolo, attrezzo, livello: è da qui che i programmi li pescano), `data/youtube-links.json` (ricerca). Script che li ha aggiunti, rilanciabile senza doppioni: `tools/add_gag_exercises.mjs`.

## Immagini da fare (manichino grigio calvo, una alla volta)
Tutti i 36 sopra. Priorità per quanto compaiono nei programmi: Hip thrust manubrio, Glute bridge con elastico, Donkey kick, Fire hydrant, Clam shell, Lateral band walk, Sumo squat, Curtsy lunge, Lateral lunge, Stacco rumeno manubri, Abduzione seduta con elastico, Reverse hyper.

## Sezione GAG (gambe, addome, glutei)
Quinta disciplina di «Allenarsi a casa» (`web/disciplines.js`): tre attrezzature (corpo libero, elastici, manubri), da 2 a 5 giorni, 20/30/45 minuti, tre livelli, 4-12 settimane: **432 schede pronte**, per un totale di 1.656 nel database delle discipline. Tre tipi di seduta (Glutei e gambe, Glutei e addome, Gambe e addome) in cui glutei e addome ci sono sempre; ogni movimento è una scala di quattro gradini, si parte dal livello della persona e a metà programma si passa al gradino dopo. Fonti nel programma (solo abstract verificati su PubMed): Plotkin 2023, Collings 2023, McCurdy 2021, Goller 2024.

## Focus glutei nelle schede con i pesi
Il focus «Glutei» esisteva già tra i muscoli da privilegiare (da una a tre scelte). Ora, scegliendolo, le sedute delle gambe **si aprono con un esercizio per i glutei** (hip thrust o simile), il secondo esercizio può essere un altro movimento per i glutei (non solo uno stacco) e c'è un esercizio in più di isolamento; nel full body se ne aggiunge uno senza togliere i dorsali. Con i nuovi esercizi i movimenti per i glutei sono 34 (erano 13), quindi i programmi cambiano molto da uno all'altro.

## Database
Le schede con i pesi non sono salvate: si calcolano dalla griglia (35.712.000 combinazioni). Aggiungendo esercizi i programmi si ricalcolano da soli; non c'è nulla da rigenerare. Le tre schede d'esempio del sito sono state ricostruite (`tools/build_site_samples.mjs --pdf`) perché la scelta degli esercizi è cambiata. Una scheda **già attivata** da una persona resta com'è: vive nei suoi dati.
