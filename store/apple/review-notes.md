# App Store Connect › Versione › Informazioni per la revisione dell'app

> **Dopo la bocciatura (Guideline 2.1) il testo in inglese da incollare nel campo Note è in `docs/APPLE-REVIEW-NOTES.md`**: sostituisce quello qui sotto, che resta come riferimento in italiano.

## Account di prova
Le password NON stanno in questo file. Creale con lo script (vedi `../README.md`, passo 3) e incollale nei campi di App Store Connect.

| Campo App Store Connect | Valore |
|---|---|
| Richiede accesso | **Sì** |
| Nome utente | `review-coach@nurvan.app` |
| Password | quella stampata dallo script |
| Contatto: nome, telefono, email | tuoi dati reali (Apple ti chiama/scrive se serve) |

Account di riserva da scrivere nelle note: `review-free@nurvan.app` (piano gratuito, per vedere la schermata abbonamenti) e `review-athlete@nurvan.app` (lato atleta).

## Note per il revisore (incolla nel campo «Note»)

```
Nurvan è un'app di allenamento: programmi, registro di serie e carichi, statistiche per gruppo muscolare, stima del recupero e un Coach AI. Ha anche un'area per coach che seguono i propri clienti.

COME ACCEDERE
Alla prima apertura si vede la schermata Account: inserisci email e password dell'account indicato nei campi "Nome utente" e "Password" e tocca ACCEDI (sono disponibili anche "Continua con Google" e "Accedi con Apple"). Spunta "Ho almeno 16 anni" e accetta informativa privacy e termini. Il consenso all'AI è separato e facoltativo (la prima volta che si usa il Coach AI).

COME PROVARE LE FUNZIONI
1. Allenamento: scheda "Allenamento" › scegli un giorno › inserisci carico e ripetizioni nelle serie e spunta. Il tasto + aggiunge un esercizio (propone un range di ripetizioni, modificabile).
2. Statistiche: scheda "Statistiche" › la figura anatomica evidenzia i muscoli del periodo scelto.
3. Coach AI: scheda "Coach AI" › fai una domanda sui tuoi carichi. (Richiede connessione e il consenso AI.)
4. Salute: valori di sonno, frequenza a riposo, HRV e passi si scrivono a mano; non c'è collegamento con Salute di Apple e l'app non usa HealthKit.
5. Area coach: con l'account review-coach, scheda MENU › "Modalità coach": clienti, inviti, programmi, check-in, calendario. I clienti si collegano con un invito del coach; non c'è ricerca di sconosciuti né feed pubblico.

ABBONAMENTI (guideline 3.1.1)
Le funzioni di base sono gratuite. Gli abbonamenti Standard, Coach e Coach Pro si acquistano SOLO con acquisti in-app di Apple (scheda MENU › "Piani & Pro"). Prezzi e addebito sono gestiti da App Store; c'è il pulsante "RIPRISTINA ACQUISTI". L'app non rimanda a pagamenti esterni e non mostra offerte legate al sito. Per provare l'acquisto usa l'account review-free (nessun abbonamento attivo); l'account review-coach ha il piano Coach Pro assegnato manualmente per mostrare tutte le schermate senza acquisto.
I pagamenti tra un coach e i suoi clienti (consulenza personale) avvengono fuori dall'app, come servizio individuale uno-a-uno (guideline 3.1.3(d)): l'app non vende né incassa questi servizi.

CONTENUTI GENERATI DAGLI UTENTI (guideline 1.2)
L'unica comunicazione tra utenti è la chat tra un coach e i clienti che ha invitato. In chat c'è "Segnala · Blocca" (motivo, testo libero, allegati facoltativi). Le segnalazioni arrivano a un pannello di moderazione; obiettivo di risposta entro 24 ore. Contatto per abusi: info@nurvan.app. Bloccare ferma i messaggi in entrambe le direzioni.

DATI SANITARI E AI (5.1.1, 5.1.2)
I dati di salute sono inseriti dall'utente; non usati per pubblicità né venduti. L'invio di testo/foto al servizio AI (Google Gemini) avviene solo dopo un consenso esplicito e revocabile (Impostazioni › Privacy e dati). L'app non è un dispositivo medico (avviso in app e nei termini).

ELIMINAZIONE ACCOUNT (5.1.1(v))
Impostazioni › Privacy e dati › Elimina account (conferma scrivendo ELIMINA). Vale per tutti gli account, anche per i clienti di un coach. Cancella l'account e i dati sul server, lo storico degli eventi di acquisto associato e la persona su RevenueCat. Se c'è un abbonamento attivo, la schermata lo segnala e rimanda a Impostazioni › il tuo nome › Abbonamenti: l'abbonamento lo annulla solo Apple, eliminare l'account non lo annulla.

L'app è un'interfaccia web impacchettata con Capacitor, con funzioni native: notifiche locali, fotocamera e microfono (solo all'uso), acquisti in-app (StoreKit tramite RevenueCat), Accedi con Apple.
Contatto tecnico: info@nurvan.app
```

## Prima di inviare, controlla
- [ ] Gli abbonamenti sono nello stato **Pronto per l'invio** e *allegati alla versione* (sezione «Acquisti in-app e abbonamenti» della versione), con screenshot di revisione. Il primo abbonamento va inviato insieme a una nuova versione dell'app.
- [ ] Gli account di revisione funzionano: apri l'app su un telefono pulito e accedi con ciascuno.
- [ ] I server (Render) sono attivi: se il primo caricamento è lento, scrivilo nelle note («il server può impiegare qualche secondo al primo accesso»). Meglio: tieni il servizio sempre acceso nei giorni di revisione.
- [ ] I campi del titolare (nome, indirizzo, P. IVA) compilati: Apple apre `/privacy` e `/termini` e non devono mostrare l'avviso «Bozza».
