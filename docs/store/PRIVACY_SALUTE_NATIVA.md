# Collegamento ad Apple Salute e Health Connect: privacy, store, tempi

**BOZZA da far verificare a un consulente legale / DPO prima della pubblicazione.** Non è parere legale. Non è
pubblicata: `web/privacy.html` descrive ciò che l'app fa oggi (nessuna lettura da altre app). Questi testi vanno
inseriti **nello stesso momento** in cui esce la versione che legge i dati, mai prima né dopo (un'informativa che
descrive un trattamento che non c'è, o che manca di uno che c'è, è un difetto). Quando si pubblica: aggiornare
`web/privacy.html`, `docs/store/PRIVACY_STORE.md` e fare salire `legal.version` in `web/features.json`.

I regolamenti e le regole degli store cambiano: i riferimenti sotto vanno ricontrollati sulle pagine ufficiali al momento
della richiesta (Apple App Review Guidelines 5.1.3 e documentazione HealthKit; Google Play, "Health apps declaration" e
documentazione Health Connect).

## 1. Cosa leggerebbe l'app (minimo necessario)

Solo lettura, ultimi 30 giorni, ogni tipo di dato richiesto separatamente e rifiutabile:

| Dato | iOS (HealthKit) | Android (Health Connect) | A cosa serve |
|---|---|---|---|
| Passi | stepCount | Steps | stima del recupero |
| Sonno | sleepAnalysis | SleepSession | stima del recupero |
| Frequenza cardiaca a riposo | restingHeartRate | RestingHeartRate | stima del recupero |
| Variabilità (HRV) | heartRateVariabilitySDNN | HeartRateVariability | stima del recupero |
| Peso corporeo | bodyMass | Weight | precompila il peso dei check fisici |

Nessuna scrittura. Nessuna posizione, nessun allenamento di altre app, nessun dato del ciclo, nessuna glicemia.
Se non serve a una funzione già visibile all'utente, non si chiede: chiedere dati non usati è un motivo di rifiuto.

## 2. Testo da aggiungere all'informativa (`web/privacy.html`)

**Nella sezione 2, dopo "Dati sulla salute":**

> **Dati dal servizio Salute del tuo telefono (facoltativo).** Se lo attivi, Nurvan legge dal tuo telefono (Apple Salute su
> iPhone, Health Connect su Android) passi, sonno, frequenza cardiaca a riposo, variabilità della frequenza cardiaca e peso
> corporeo degli ultimi 30 giorni, solo in lettura. Li usiamo per una sola cosa: stimare il tuo recupero e proporti il peso
> nei check fisici. Sono dati sulla salute (categorie particolari, art. 9 GDPR). Non li usiamo per pubblicità, né per
> profilazione, né per decidere nulla su di te in modo automatico, e non li vendiamo né li cediamo. Li leggi tu, sul tuo
> telefono: restano sul telefono, **non vengono inviati ai nostri server**, salvo quanto descritto qui sotto.

**Nella sezione 3 (basi giuridiche):**

> Dati dal servizio Salute del telefono: il tuo consenso esplicito (art. 6.1.a e art. 9.2.a GDPR), che dai quando attivi
> il collegamento e che puoi ritirare in ogni momento da Impostazioni > Privacy e dati, e dal telefono stesso
> (Impostazioni > Salute > Condivisione dati su iPhone; Health Connect > Autorizzazioni app su Android). Ritirarlo non
> toglie nulla alle altre funzioni dell'app.

**Nella sezione 4 (coach) e 5 (con chi condividiamo):**

> Il coach vede questi dati solo se tu scegli di condividerli con lui, e puoi smettere quando vuoi. Il Coach AI li
> riceve solo se hai dato il consenso alle funzioni AI **e** hai attivato "condividi i dati sanitari": in quel caso
> viaggiano al fornitore AI come il resto del contesto, come descritto alla sezione 5.

**Nella sezione 7 (conservazione) e 8 (dispositivo):**

> I dati letti da Salute si conservano sul telefono finché non scollega il servizio, esci dall'account o elimini
> l'account; allo scollegamento o all'uscita vengono cancellati dal telefono. Si possono sempre cancellare da
> Impostazioni > Privacy e dati.

## 3. Cosa implica sul trattamento (GDPR)

- **Base e prova del consenso:** consenso esplicito, separato dagli altri, per tipo di dato dove il sistema lo permette,
  registrato (data, versione dell'informativa) come già per i dati sanitari e per l'AI (`server/account/consent.mjs`).
- **Minimizzazione e limitazione:** solo i cinque dati sopra, 30 giorni, per la sola finalità del recupero e del peso.
- **Valutazione d'impatto (art. 35):** trattare dati sulla salute dentro un'app con terapie, esami e coaching può
  richiedere una DPIA anche per un trattamento di dimensioni contenute. Va valutata con il consulente; è un documento da
  scrivere, non un'attività tecnica. Conviene farla **prima** del rilascio, non dopo un rifiuto.
- **Fornitori (art. 28):** se i dati restano sul telefono non c'è un nuovo fornitore. Se passano al Coach AI o al coach,
  valgono gli accordi già elencati in `PRIVACY_STORE.md` (Google/Gemini a pagamento, Render, ecc.).
- **Decisioni automatizzate:** la stima del recupero è un'indicazione, non una decisione con effetti legali: va detto
  in app, come già nel testo "Non è una misura clinica".
- **Minori:** minimo 16 anni, come oggi.
- **Eliminazione e revoca:** già presenti; vanno estese per cancellare anche i dati letti da Salute dal telefono
  (`NativeConfig.clearHealthData` esiste già per il cambio di account).

## 4. Dichiarazioni negli store (cosa cambia rispetto a oggi)

**Apple**
- Capability **HealthKit** sull'App ID (portale sviluppatori) e profilo di firma rigenerato nel CI.
- `Info.plist`: `NSHealthShareUsageDescription` (obbligatoria). Testo proposto: "Nurvan legge passi, sonno, frequenza cardiaca a
  riposo, HRV e peso per stimare il tuo recupero e precompilare il peso. I dati restano sul tuo iPhone e puoi
  scollegare l'accesso in ogni momento." Nessun `NSHealthUpdateUsageDescription` (non si scrive).
- App Store Connect > Privacy dell'app: aggiungere **Salute e fitness > Salute** e **Fitness**: raccolti, non collegati
  all'identità se restano sul telefono, **non** usati per il tracciamento.
- Guideline 5.1.3: i dati di Salute non vanno usati per pubblicità né per data mining, non vanno scritti in iCloud, e
  non vanno ceduti a terzi senza consenso. L'informativa deve dirlo (fatto qui sopra).

**Google Play**
- Sicurezza dei dati: "Salute e fitness" già dichiarata (dati inseriti a mano); aggiungere che l'app legge anche da
  Health Connect, finalità "Funzionalità dell'app", non condivisi, facoltativi.
- **Dichiarazione dei permessi Health Connect** in Play Console, un permesso alla volta (Steps, SleepSession,
  RestingHeartRate, HeartRateVariability, Weight), con la motivazione, e probabilmente un video o istruzioni che
  mostrano dove l'app usa ciascun dato.
- Il manifest deve avere l'attività che apre l'informativa dal pannello dei permessi di Health Connect
  (`androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE` / `VIEW_PERMISSION_USAGE`), altrimenti i permessi non appaiono.
- La dichiarazione "App sanitarie" va aggiornata: oggi dice "non usa Health Connect".
- Permessi in `AndroidManifest.xml`: `android.permission.health.READ_STEPS`, `READ_SLEEP`, `READ_RESTING_HEART_RATE`,
  `READ_HEART_RATE_VARIABILITY`, `READ_WEIGHT`. Android 14+ integrato, 13 e prima richiede l'app Health Connect.

## 5. Quanto si rischia di allungare l'approvazione

Stime di chi ha visto questi processi, non garanzie: i tempi li decidono i revisori.

| | Rischio di ritardo | Perché | Ordine di grandezza |
|---|---|---|---|
| **iOS, HealthKit** | basso-medio | Se testi, informativa e etichette sono coerenti la revisione procede nei tempi normali. I rifiuti tipici: testo del permesso vago, informativa che non cita Salute, dati chiesti e non usati. Un rifiuto costa un giro in più. | da 0 a qualche giorno in più |
| **Android, Health Connect** | medio-alto | È una dichiarazione separata e manuale, per permesso, con revisione dedicata; senza approvazione i permessi restano bloccati per il rilascio pubblico. I rifiuti sono frequenti se Google non ritiene la salute il cuore dell'app. | da pochi giorni a oltre una settimana, a volte più giri |
| **Informativa** | basso se fatta con il consulente | Un'informativa incoerente con le dichiarazioni è la causa più comune di rifiuto in entrambi gli store. | — |

Il rischio più grosso non è il collegamento in sé, è **mescolarlo con la prima uscita**: se la prima versione pubblica
contiene i permessi salute, un ritardo su Google blocca anche tutto il resto.

## 6. Strategia consigliata

1. **Prima uscita senza collegamenti** (stato attuale): niente permessi `health.*`, niente HealthKit. Si pubblica come è.
2. **Schermata "Salute" con i dati dell'app e inserimento manuale** nella prima uscita o nell'aggiornamento successivo
   (nessuna dichiarazione nuova: sono dati che l'utente già inserisce).
3. **Seconda uscita dedicata al collegamento**, iOS prima di Android:
   - nel frattempo: DPIA, informativa aggiornata, account demo con dati di esempio per i revisori;
   - iOS: capability, testi, etichette, build in TestFlight, invio;
   - Android: codice nativo, manifest, dichiarazione dei permessi in Play Console **in anticipo**, mentre l'app è ancora in test interno, così
     la revisione parte prima della pubblicazione;
   - un interruttore lato server per spegnere il collegamento senza rilasciare di nuovo, se un revisore lo chiede.
4. **Web app**: nessun collegamento possibile. Mostra la schermata con i dati dell'app e l'inserimento manuale; il tasto
   si toglie ai clienti dei coach che usano solo la web app.
