# Nurvan Admin

La dashboard privata di Giammaria: persone, soldi, statistiche di sito, app, Instagram e store. Gira dentro lo stesso servizio dell'app (Render), ma **non si vede da nessuna parte** se non si conosce il suo indirizzo.

## Come ci si entra

1. Su Render, nel servizio, **Environment**, aggiungi:
   - `ADMIN_PATH` — un segreto lungo, solo lettere, numeri, `-` e `_` (da 16 a 80 caratteri). Per esempio generalo con `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`. **È il tuo link**: la dashboard sta a `https://app.nurvan.app/<ADMIN_PATH>`.
   - `ADMIN_EMAILS` — le email che possono entrare, separate da virgola. Meglio due (una di scorta).
   - `RESEND_API_KEY` e `MAIL_FROM` — già usate per le email dell'app: servono a mandare il codice di accesso.
2. Apri il link, scrivi la tua email, inserisci il codice a 6 cifre che arriva. La sessione dura 12 ore.
3. Salva il link tra i preferiti (o aggiungilo alla schermata Home del telefono: la pagina si adatta).

Senza `ADMIN_PATH` **in produzione la dashboard è spenta** (nessuna pagina, nessuna route). In locale (non produzione) il link è `/admin` e non serve configurare niente.

### Perché è privata

- La pagina non è su `/admin`: esiste solo al tuo indirizzo segreto.
- Tutte le richieste `/api/admin/*` rispondono «non trovato» (404, non 401) se non portano l'indirizzo segreto in un'intestazione che solo la pagina sa mandare. Un cookie rubato da solo non apre le route.
- In più: email nella lista + codice a 6 cifre (hash nel database, 5 tentativi, 10 minuti), sessione in cookie `HttpOnly`, `SameSite=Strict`, `Secure`.
- Ogni richiesta finisce nel **Registro accessi** (chi, quando, cosa, da quale IP). In **Operazioni → Sessioni admin** vedi chi è dentro e puoi chiudere le altre sessioni.
- Se pensi che il link sia trapelato: cambia `ADMIN_PATH` su Render (si riavvia da solo) e chiudi le sessioni.
- `NURVAN_ADMIN_TOKEN` resta solo per `tools/plan_admin.mjs` (riga di comando): non apre la dashboard.

## Cosa c'è

| Pagina | Cosa fa |
|---|---|
| **Panoramica** | I numeri di oggi contro il periodo prima (ricavi, persone, sito, Instagram, download) e gli avvisi: errori, piani in scadenza, collegamenti rotti. |
| **Profili** | Tutti gli account, con filtri (piano, ruolo, ultimo accesso, iscrizione, accesso, sospesi), ordinamento, CSV. Aprendone uno: chi è, consensi, uso (sedute, controlli, import, spazio), piano e storico, cosa paga, note private, azioni (chiudi le sessioni, sospendi, prolunga la prova), incassi. |
| **Economia** | Ricavo ricorrente stimato dai piani, abbonati (paganti / omaggi / in prova / scaduti), nuovi e persi, scadenze, **contabilità** (entrate e uscite, annullabili mai cancellate, CSV), listino prezzi e costi fissi. |
| **Statistiche** | **Sito** (visitatori, pagine, provenienza, articoli, generatore di link con `utm_source`), **App** (aperture per piattaforma e prime aperture), **Instagram**, **App Store e Google Play**. |
| **Coach** | I coach, gli atleti attivi, i posti, i check-in. |
| **Operazioni** | Errori, log dei piani, registro accessi, sessioni admin, liste del sito (contatti, lista d'attesa, candidature coach), spazio occupato. |
| **Catalogo** | Le voci alimentari Nurvan. |
| **Impostazioni** | Stato della protezione e dei collegamenti. |

## Cosa legge (e cosa mai)

Solo chi sono, che piano hanno, quanto usano l'app e quanto spazio occupano: **conteggi e date**. Mai il contenuto: diario, foto, misure, terapie, esami, note dei check-in, né i clienti di un coach oltre al loro numero. Gli incassi che un coach registra dai suoi clienti sono suoi e non entrano nella contabilità di Nurvan.

Sospendere un account blocca le sue sessioni (entro 30 secondi); i dati restano. Eliminare un account lo può fare solo la persona dall'app.

## Soldi

- **Chi paga**: un piano in vigore, non scaduto, non in prova, e non un omaggio. Un piano assegnato a mano senza prezzo conta come **omaggio** (i primi coach gratis); con origine `stripe`/`play` paga il listino, salvo il prezzo proprio dell'account (scheda del profilo → «Cosa paga»).
- **Listino**: parte dai prezzi in `web/features.json`; si cambia in Economia → Listino e costi (non tocca i prezzi mostrati agli utenti, serve solo alle stime).
- **Contabilità**: le entrate vere. Oggi si scrivono a mano (o dal profilo di un account); gli incassi App Store in euro arrivano da soli quando il collegamento è attivo. Quando si collegheranno Stripe e Play Billing, le entrate arriveranno qui con un riferimento unico (non si duplicano).
- **Costi fissi**: server, email, dominio, account sviluppatore: servono a dire se gli abbonamenti li coprono.

## Statistiche: come si contano

**Sito e app senza cookie, senza identificativi, senza servizi esterni.**

- Una visita è: giorno, pagina, provenienza (il `utm_source` del link o il sito da cui arriva), tipo di dispositivo. I robot non si contano.
- Un «visitatore» è un'impronta di IP e browser mescolata con un sale che cambia ogni giorno, tenuta due giorni e poi dimenticata: dice che oggi sono venute 40 persone diverse, mai chi, né che domani è la stessa.
- L'app, una volta al giorno, dice su quale piattaforma gira (web, web app installata, iPhone, Android) e, una volta sola nella vita, che è stata aperta per la prima volta. Nessun identificativo salvato nel telefono, nessun account, nessun contenuto.

Per Instagram metti nella bio un link fatto dal generatore (Statistiche → Sito → «Un link che si riconosce»): le visite che portano compaiono con il nome scelto.

### Collegamenti (variabili su Render)

Si accendono da soli quando le variabili ci sono; senza, restano spenti e le stesse cifre si possono scrivere a mano. Ogni 6 ore (e con «Aggiorna ora») i dati arrivano da soli.

| Servizio | Variabili | Cosa porta |
|---|---|---|
| **Instagram** | `IG_ACCESS_TOKEN` (account Business o Creator; token lungo da Meta for Developers → app → Instagram; dura 60 giorni e si rinnova da solo ogni mese) | follower, account seguiti, post, persone raggiunte, visite al profilo, clic al sito, ultimi post con mi piace e commenti |
| **App Store** | `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY` (il testo del .p8, anche con `\n`), `ASC_VENDOR_NUMBER`; la chiave deve poter vedere «Vendite e rapporti» | download, aggiornamenti, incassi (in euro entrano anche nella contabilità); i dati di un giorno arrivano con 1–2 giorni di ritardo |
| **Google Play** | `PLAY_SERVICE_ACCOUNT_JSON`, `PLAY_BUCKET` (da «Scarica rapporti» in Play Console, senza `gs://`), `PLAY_PACKAGE` (default `com.nurvan.app`) | installazioni, disinstallazioni, dispositivi attivi |

I collegamenti di App Store e Google Play sono scritti sulla documentazione delle due API e **non sono ancora stati provati contro i servizi veri** (le app non sono ancora pubblicate): al primo collegamento controlla in Statistiche che i numeri tornino, e se qualcosa non va l'errore compare in Panoramica.

## Informativa e store

Il conteggio delle aperture dell'app non usa identificativi: non cambia la dichiarazione privacy («nessun tracciamento»). Vale la pena aggiungere una riga alla privacy policy («contiamo in forma anonima quante persone aprono l'app e da quale piattaforma, senza identificarle»).

## Come si prova

- `node test_admin_suite.mjs` e `node test_admin_dashboard.mjs` (nella suite di regressione): link privato, conteggi, soldi, collegamenti, cablaggio.
- Le query SQL sono state eseguite contro un vero PostgreSQL (embedded) con un server completo: iscrizioni, piani, contabilità, filtri dei profili, sospensione, visite reali con `Host` del sito, aperture dell'app, numeri a mano. Per rifarlo serve un Postgres locale e `DATABASE_URL` + `NURVAN_ADMIN_TOKEN` per avviare `coach-api.mjs`, poi chiamare le route con l'intestazione `X-Admin-Token`.
