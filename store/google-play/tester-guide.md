# Guida per i tester del test chiuso (da mandare ai 20 tester)

Questo testo è scritto per essere incollato in una mail o in un messaggio ai tester. In fondo ci sono i passi che fai tu per attivare il test.

---

## Ciao! Grazie per aver accettato di provare Nurvan

Nurvan è un'app di allenamento: schede, registro dei carichi, statistiche per muscolo, recupero e un Coach AI. Ti chiediamo di usarla **un po' ogni giorno per 14 giorni** e di segnalarci cosa funziona e cosa no. Più sei sincero e preciso, più ci aiuti.

### 1. Come installarla (5 minuti)
1. Serve un telefono **Android** (versione 8 o successiva) e l'account Google con cui ci hai dato la tua email.
2. Apri questo link dal telefono: **`<LINK DI ADESIONE AL TEST — lo incolli tu da Play Console>`** e tocca **«Diventa tester»**.
3. Tocca **«Scarica da Google Play»** e installa Nurvan.
4. **Non disinstallarla e non uscire dal test per 14 giorni**: per Google conta che resti tester tutto il periodo, anche se non la usi ogni giorno.

### 2. Il tuo account
Crea il tuo account dall'app (email e password, oppure «Continua con Google»). Compila il profilo con dati veri o inventati, come preferisci. Nessuno vedrà i tuoi dati se non ci scrivi tu.

### 3. Cosa fare, giorno per giorno
Non serve fare tutto subito: segui questa traccia nei 14 giorni, e usa l'app liberamente tra una cosa e l'altra.

**Giorni 1-2: primi passi**
- Registrati, accetta informativa e termini, completa il profilo (c'è anche l'opzione «non binario» per il genere).
- Scegli un programma o creane uno, poi apri la scheda **Allenamento**.
- Prova a registrare una seduta: carico, ripetizioni, spunta le serie, timer di recupero.
- Aggiungi un esercizio al programma: l'app propone delle ripetizioni; prova a cambiarle.

**Giorni 3-5: statistiche e esercizi**
- Scheda **Statistiche**: cambia periodo (settimana, mese…), guarda la figura dei muscoli. Provala con figura maschile e femminile.
- Apri la scheda di un esercizio: immagine, spiegazione, video. Dicci se manca qualcosa o se un'immagine non corrisponde all'esercizio.
- Fine seduta: guarda la scheda riepilogo con i muscoli lavorati.

**Giorni 6-8: Coach AI e Salute**
- Scheda **Coach AI**: dai il consenso e fai 3-4 domande sui tuoi allenamenti («come sto andando con la panca?»). Le risposte usano davvero i tuoi numeri? Sono chiare? Quanto ci mette?
- **Salute**: scrivi a mano sonno, frequenza a riposo, HRV, passi. Il recupero stimato ti sembra sensato?
- Prova a scattare/caricare una foto di un pasto (facoltativo).

**Giorni 9-11: piani e impostazioni**
- MENU › **Piani & Pro**: guarda i piani e i prezzi. **Non comprare nulla a meno che non ti diciamo che puoi** (per gli acquisti di prova ti daremo istruzioni a parte).
- Impostazioni › **Privacy e dati**: esporta i tuoi dati; cambia il consenso all'AI; leggi l'informativa.
- Prova a cambiare lingua, tema e le notifiche.

**Giorni 12-14: uso reale e prova di robustezza**
- Allenati davvero con Nurvan almeno 2 volte.
- Chiudi e riapri l'app, mettila in secondo piano, spegni il wifi a metà seduta e riaccendilo: i dati sono ancora lì?
- Disinstalla e reinstalla **solo se te lo chiediamo** (altrimenti rimani tester senza interruzioni).

### 4. Come segnalare un problema (questa è la parte più importante)
Scrivi a **`<EMAIL O CANALE PER I REPORT>`** oppure compila **`<LINK AL MODULO>`**. Per ogni segnalazione indica:
1. **Cosa stavi facendo** (schermata e passi, in ordine)
2. **Cosa ti aspettavi** e **cosa è successo**
3. **Screenshot o registrazione schermo**, se puoi
4. **Modello del telefono e versione di Android** (Impostazioni › Informazioni sul telefono)
5. Quanto è grave: *blocca l'app* / *fastidioso* / *dettaglio estetico*

Segnala anche **le cose che funzionano bene** e quelle che non hai capito: se hai dovuto cercare un pulsante, per noi è un problema.

Nelle ultime due settimane ti chiederemo un breve **questionario finale** (10 domande, 5 minuti).

### 5. Cose da sapere
- L'app è una versione di prova: possono esserci errori. Non inserire dati che non vuoi che vediamo in caso di problema.
- Il Coach AI **non è un medico**: i suoi consigli sono indicativi.
- Per cancellare il tuo account in qualsiasi momento: Impostazioni › Privacy e dati › Elimina account.
- Per qualsiasi dubbio: `<CONTATTO>`.

Grazie!

---

## Per te: come attivare il test chiuso e contare i 14 giorni

**Regola di Google** (account sviluppatore personale creato dopo novembre 2023): per chiedere l'accesso alla produzione serve un **test chiuso con almeno 12 tester che restano iscritti per 14 giorni consecutivi**. Hai 20 tester: tieni un margine, perché qualcuno si dimentica o esce.

1. Play Console › app › **Test › Test chiuso › Crea traccia** (o usa quella «Closed testing - Alpha»).
2. **Tester**: crea una lista email (fino a 2.000) con le email Google dei 20 tester, oppure un Google Group. Salva.
3. **Versioni**: *Crea nuova versione* › carica l'`.aab` (lo prendi dall'Actions: workflow «Android Play» lo carica già sul **test interno**; da lì puoi **promuovere** la stessa build al test chiuso). Aggiungi note di versione.
4. **Paesi/regioni**: Italia (e gli altri dei tuoi tester).
5. Invia la versione in revisione (per il test chiuso la revisione è di solito rapida, da poche ore a qualche giorno).
6. Quando è approvata, in **Test chiuso › Tester › «Come partecipano i tester»** copia il **link di adesione** e incollalo nel messaggio qui sopra.
7. Il conto dei 14 giorni parte dal momento in cui i tester sono iscritti. Nella pagina **Dashboard** compare «Numero di tester» e i giorni mancanti per l'accesso alla produzione.
8. Allo scadere dei 14 giorni: Dashboard › **Candidati per la produzione** (compila il questionario su come hai testato; usa i report dei tester come materia).
9. Google risponde in genere entro 7 giorni lavorativi. Poi crei la versione di produzione.

Suggerimenti:
- Manda la guida **il primo giorno** e un promemoria al giorno 7 e al giorno 12.
- Ogni correzione importante che fai durante i 14 giorni: carica una nuova build sulla stessa traccia (non azzera il conteggio).
- Per testare gli **acquisti**: aggiungi le email dei tester tra i **tester di licenza** (Impostazioni › Test della licenza). Compreranno senza pagare e potranno provare acquisto e annullamento (richiede che i prodotti siano creati: `subscriptions.md`). Dì loro esplicitamente quando farlo.
- Raccogli i report in un solo posto (un foglio con le colonne: data, tester, schermata, gravità, descrizione, stato).
