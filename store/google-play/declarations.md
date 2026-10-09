# Play Console › Contenuti dell'app: tutte le dichiarazioni

Si compilano nel menu **Criteri e programmi › Contenuti dell'app** (o «Configura l'app»). Tutte devono risultare complete prima di inviare una versione in produzione, e in parte già prima del test chiuso.

## Accesso all'app
**Alcune funzioni sono limitate** → *Aggiungi istruzioni*:
- Nome: `Account Coach Pro`
- Nome utente: `review-coach@nurvan.app` · Password: stampata dallo script `tools/seed_review_accounts.mjs` (vedi `README.md`, passo 2)
- Istruzioni: 
  ```
  Alla prima apertura, nella schermata Account inserisci email e password e tocca ACCEDI. Spunta "Ho almeno 16 anni" e accetta informativa e termini.
  Questo account ha il piano Coach Pro assegnato manualmente: tutte le funzioni sono sbloccate, compresa la modalità Coach (scheda MENU › "Modalità coach").
  Per vedere la schermata degli abbonamenti e dell'acquisto usa il secondo account: review-free@nurvan.app (piano gratuito), scheda MENU › "Piani & Pro".
  L'invio di dati all'AI (Coach AI) richiede un consenso esplicito che si dà la prima volta che si usa. Con l'account gratuito la chat del Coach AI si sblocca da MENU › Piani & Pro › "ATTIVA 14 GIORNI DI COACH" (gratis, una volta per account, nessun addebito né rinnovo).
  Per provare chat tra coach e atleta, segnala e blocca: entra come atleta con il nome utente "revisorecliente" (scheda COACH › chat con il coach), oppure come review-coach (MENU › Modalità coach › HUB › il cliente › CHAT). "SEGNALA · BLOCCA" è nella barra della chat.
  I pagamenti tra coach e clienti avvengono fuori dall'app e non passano da Nurvan; l'app mostra solo un promemoria.
  ```
- Altre credenziali: `review-free@nurvan.app` (gratuito), `review-athlete@nurvan.app` (account personale con dati) e `review-client` (atleta collegato al coach: accede con il NOME UTENTE `revisorecliente`, non con l'email; password stampata da `tools/seed_review_accounts.mjs --only-client`).
- «Nessuna altra azione richiesta» (niente 2FA, niente codici).

## Annunci
**No, l'app non contiene annunci.**

## Classificazione dei contenuti (questionario IARC)
Categoria: **Utility / Produttività / Altro** (non gioco). Risposte: violenza no · contenuti sessuali no · linguaggio volgare no · sostanze controllate no · gioco d'azzardo no · **funzionalità di comunicazione tra utenti: sì** (chat coach-cliente, con segnala e blocca) · condivisione della posizione no · acquisti digitali sì (abbonamenti).
Esito atteso: PEGI 3 / Everyone, con avvertenza «Interazione tra utenti» e «Acquisti in-app».

## Pubblico di destinazione e contenuti
- Fasce d'età: **16-17 e 18+** (i termini richiedono ≥16 anni). Non selezionare fasce sotto i 13: attiverebbe le Norme Famiglie.
- L'app non è pensata per bambini e non ha nulla che li attiri in modo particolare.

## App di salute (dichiarazione «Health apps»)
Funzioni: *Attività fisica e benessere*, *Nutrizione e gestione del peso*. 
**No** a: monitoraggio di parametri clinici/diagnosi/dispositivi medici, ricerca clinica, gestione della salute mentale, salute femminile (riproduttiva), integrazione con Health Connect (non la usa; ci sono solo valori scritti a mano).
Disclaimer in app: «Nurvan non è un dispositivo medico e non sostituisce il parere di un medico o di un professionista sanitario» (foglio consensi, Privacy e dati, termini).

## Account finanziari / governativi / altre dichiarazioni
- App governativa: no · App finanziaria: no · Funzionalità di criptovalute: no · Notizie: no · COVID-19: no · App di scommesse: no.
- ID pubblicità: **l'app non lo usa** (rispondi «No» alla domanda sull'ID pubblicità).

## Permessi e giustificazioni (nel caso Play li chieda)
| Permesso | Perché |
|---|---|
| `INTERNET` | sincronizzazione account, Coach AI, abbonamenti |
| `CAMERA` | foto di pasti, etichette e check fisici; solo quando l'utente la usa |
| `RECORD_AUDIO` | dettare domande e dati con la voce (riconoscimento del sistema); solo all'uso |
| `POST_NOTIFICATIONS` | promemoria di allenamento e recupero (Android 13+, con richiesta) |
| `VIBRATE` | timer di recupero |
| `RECEIVE_BOOT_COMPLETED` | ripristinare i promemoria dopo il riavvio |
| `com.android.vending.BILLING` | aggiunto in automatico dalla libreria di acquisto: abbonamenti |
Nessun permesso `health.*`, nessuna posizione, nessun `SCHEDULE_EXACT_ALARM`, nessun accesso a tutti i file.

## Versione Android e requisiti
- `targetSdk` 36 (richiesto da Play dal 2026), `minSdk` come da `app/build.gradle`.
- Backup automatico disattivato (`allowBackup=false`).

## Eliminazione account
URL: `https://nurvan.app/elimina-account` · In app: Impostazioni › Privacy e dati › Elimina account.

## Valuta e monetizzazione
Serve il **profilo dei pagamenti** (merchant) di Google collegato alla Console per vendere abbonamenti. Vedi `subscriptions.md`.
