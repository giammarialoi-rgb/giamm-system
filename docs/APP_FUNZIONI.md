# Nurvan — funzioni e operazioni

Catalogo di ciò che l’app sa fare oggi (web + APK). Non è un elenco di funzioni JavaScript: è la mappa delle operazioni che puoi compiere nei tre ruoli.

Versione di riferimento: **1.5.34** (Coach OS: Today, Clients, Inbox, Agent, scheduling, analytics e ledger manuale).

---

## 1. Tre modi d’uso

| Ruolo | Chi è | Cosa vede |
|---|---|---|
| **Personale** | Account proprio, non loggato come atleta | Tutta l’app: schede, AI, import, catalogo, community, prezzi, sblocco Coach |
| **Coach** | Personale + modalità Coach sbloccata | Hub clienti, database schede, assegnazione, chat umana, vista dati cliente |
| **Cliente / atleta** | Entra da link `/c/…` e login | Solo i dati assegnati dal coach. Niente catalogo, community, prezzi, hub coach |

L’account atleta e l’account coach restano separati. In vista cliente il profilo del coach non viene sovrascritto.

---

## 2. Navigazione (senza perdere funzioni)

### Header
- **INDIETRO** — torna alla schermata personale precedente (non in sessione coach).
- **PROFILO** — foglio: Profilo atleta, Accedi / Sync, Esci.
- **COACH / HUB** — sblocca o apre l’hub (nascosto per l’atleta).
- **MENU** — hub sezioni (in sessione coach è nascosto: si usa il drawer).
- **NOTIFICHE** — centro notifiche in-app (account loggato, non in sessione coach).
- In **sessione coach**: selettore cliente + LISTA + INDIETRO. Cambiare cliente **resta nella sezione aperta** (es. chat → stessa chat, altro interlocutore; allenamento → stesso dominio, altri dati).

### Menu hub (MENU)
Home, Allenamento, Programmi, Alimentazione, Integrazione, Terapia, Esami, Calendario, Coach AI, Importa, Statistiche, Salute, Community, Profilo, Piani & Pro, Coach / Guida / Notifiche (in base al ruolo), Impostazioni.

### Barra bassa
| Personale | Atleta | Coach in sessione |
|---|---|---|
| Home · Workout · Stats · Coach AI · Menu | Home · Workout · Chat coach · (AI se concessa) · Menu | Home/Today · Clients · Inbox · Programs · Calendar |

### Scorciatoie
- Tap sul titolo di un dominio (allenamento, alimentazione, …) → cambio rapido dominio.
- Offline web: i dati restano in locale; al reconnect si svuota la coda (messaggi coach + sync account).

---

## 3. Account e profilo

### Account
- Registrazione / login email + password.
- Google e Apple (nativi e web).
- Recupero password.
- Logout.
- Sync cloud (`/api/account/sync`): preferenze, profilo, log, carichi, bonus, libreria esercizi, nutrizione, integrazione, terapia, esami, calendario, archivi chat, database schede coach.
- Foto profilo: aggiungi / cambia / rimuovi (compressa).

### Profilo atleta
- Nome, sesso, età, peso, altezza, obiettivo.
- 1RM squat / panca / stacco (anche in Impostazioni).
- Focus muscolari.
- Backup JSON, export storico CSV, import backup.
- Badge / Rewards (se modalità Rewards).
- Proposta deload adattiva (accetta / rifiuta).
- Atleta: richiesta chiusura collaborazione.
- Collegamento a Impostazioni.

### Impostazioni
- Profilo (stessi campi + 1RM + focus).
- Timer: avanzamento automatico, suono, vibrazione, secondi di preparazione.
- Esperienza Focus vs Rewards.
- Condividi terapia/esami con Coach AI (solo personale, opt-in).
- AI Control Center + UNDO ultima azione (non atleta).
- Health Connect (Android).
- Lingua.
- Piano / upgrade (non atleta).
- Backup / CSV / import.
- Reset log allenamento.
- Hard reset: **tutto** / **solo personale** / **solo hub coach**.

---

## 4. Home personale

Con scheda attiva:
- Sessione del giorno → avvia workout.
- Programmi (o Chat coach se atleta).
- Insight coach del giorno + apri AI (o chat umana).
- Conferma alimentazione del giorno.
- Moduli dominio (alimentazione, integrazione, terapia, esami, calendario, import).
- Durata / frequenza programma (può chiedere riprogrammazione).
- Lista programmi salvati: **ATTIVA** (con conferma; i carichi della scheda precedente si azzerano) / elimina.

Senza scheda:
- Importa file, database programmi, completa profilo, moduli dominio, hard reset.

---

## 5. Allenamento

- Timer sessione: Avvia / Pausa / Riprendi / Stop (indipendente dal recupero serie).
- Cambio settimana e giorno.
- Peso corporeo della settimana.
- Per ogni esercizio: carico, ripetizioni, RIR/RPE, fatto, skip, sostituzione (libreria o manuale + “aggiungi alla libreria”), tipo carico totale/parziale, tempo, serie extra, tecnica intensità, info esercizio → prefill chat.
- Recupero tra le serie (timer + suono/vibrazione).
- Esercizio bonus (macro + sottocategoria + checkbox libreria).
- Annulla ultima modifica workout.
- Scala intensità RIR/RPE.
- Export PDF scheda.
- Pianifica test massimale.
- Pannello START (Excel): ricalcola kg da massimali.
- **Finalizza allenamento**: log, calendario, Health Connect, overlay share card, XP/badge se Rewards.
- Live sync verso il coach mentre alleni (atleta).
- Coda offline se manca rete.

---

## 6. Statistiche e check fisico

- Grafici volume, intensità, peso.
- Corpo muscolare (fronte/retro) + chip macro: Schiena, Spalle, Petto, **Braccia**, Addome, Glutei, **Gambe** (sottocategorie per le stats).
- Cronologia sessioni e report.
- Check fisico: foto fronte/retro, peso, note. **L’analisi AI è solo per uso personale.** L’atleta lo invia al coach umano (non c’è “analizza con AI” lato cliente).
- Commento coach sul check.
- Export PDF check.

---

## 7. Alimentazione

- Piano per giorni / pasti / alimenti.
- Giorno selezionato evidenziato (oggi).
- Aggiungi / modifica / elimina cibo (database alimenti + warning allergie).
- Scanner barcode (foto o live).
- Wizard genera piano (kcal, macro, pasti liberi, giorni, combo).
- Filtro allergie / intolleranze (catalogo UE + frasi safe).
- Salva modifiche (sync upload-only, non rimpiazza il locale).
- Atleta: genera / aggiungi giorno solo se il coach ha dato **massima libertà**.

---

## 8. Integrazione

- Elenco integratori, dosaggio, alert.
- Aggiungi / modifica / elimina.
- Wizard genera integrazione per obiettivo.
- Evidenze / letteratura su un integratore.
- Barcode.
- Stesso gate “massima libertà” per l’atleta in generazione.

---

## 9. Terapia

- Farmaci / protocolli, alert.
- Aggiungi / modifica / elimina.
- Non entra in ranking, XP, share card.
- Al Coach AI solo con opt-in Impostazioni.

---

## 10. Esami di laboratorio

- Import da file / foto / testo (parser valori + range).
- Richiesta esami in PDF (catalogo).
- Aggiungi record, promemoria → evento calendario.
- Cronologia e invio in chat AI (personale).

---

## 11. Calendario

- Mese, selezione giorno.
- Eventi: workout finalizzati, nutrizione, integratori, terapia, pesata, check-in, nota, riposo, deload, allenamento custom.
- I workout della scheda **non** appaiono da soli: solo dopo **Finalizza** (o evento aggiunto a mano).
- Aggiungi / rimuovi eventi persistenti.

---

## 12. Coach AI (personale; atleta solo se il coach lo concede)

- Chat con cronologia e nuova sessione.
- Azzera sessione AI (non tocca schede).
- Analizza file del coach.
- Prompt rapidi: progressi, volume, punti deboli, scienza.
- Check-in settimanale.
- Ricerca PubMed.
- Proposte di modifica programma: applica / annulla.
- Voce: dettatura, lettura risposta, scelta leggi/ascolta.
- Controllo poteri AI da Impostazioni.

---

## 13. Import file e database programmi

### Import PDF / Excel / Word
1. Scegli file.
2. Anteprima canonical.
3. **Cosa importare?** Allenamento, alimentazione, integrazione, terapia, esami. Le sezioni non scelte **non si cancellano**.
4. Se c’è allenamento: scelte settimane / giorni / progressione.
5. Attiva (o salva nel database coach se sei in “import nel mio database”).

### Programmi
- Catalogo Nurvan con filtri (giorni, split, obiettivo, attrezzi, livello, durata, audience).
- Anteprima e attiva.
- Genera programma rules-based (giorni, goal, livello, settimane).
- Esporta JSON scheda attiva / storico CSV.
- Programmi salvati in home: attiva / elimina.

---

## 14. Community, salute, prezzi (solo personale)

- Community: link e programmi esterni, share.
- Health Connect: scrive sessioni e misure.
- Piani Free / Pro e cambio piano.

---

## 15. Cliente (atleta)

### Ingresso
1. Apre il link invito.
2. Login (resta connesso) o recupero password.
3. **Questionario** (obbligatorio se nuovo):
   - Nome, cognome, sesso, fascia età / altezza / peso.
   - Anzianità, livello, obiettivo, sedute/settimana, minuti, attrezzi, split.
   - Infortunio principale / secondario, limiti medici.
   - Lavoro, sonno, stress.
   - 1RM stimati: squat, panca, stacco, military (opzionali).
   - Allergie / intolleranze (opzionale).
   - Status **Natural / Enhanced**; se enhanced: sotto farmaci, quali, da quanto; ultime analisi o “non ho analisi recenti”.
4. Tutorial (saltabile; rivedibile da MENU → Guida).
5. Installazione home screen / notifiche push (opzionale).

### Cosa può fare
- Home: in attesa scheda → chiedi scheda / scrivi al coach; con scheda → workout e moduli.
- Allenare, finalizzare, vedere stats (check fisico da inviare al coach).
- Aprire alimentazione / integrazione / terapia / esami / calendario assegnati.
- Chat umana cifrata, allegati, dettatura, videocall (se il coach la consente).
- Notifiche in-app e push.
- Chiedere al coach su un dominio (CHIEDI AL COACH).
- Chiedere libertà di generare piani (alimentazione/integrazione).
- Chiedere chiusura collaborazione (se non ci sono pagamenti in sospeso).
- Aggiorna home.
- Esci (logout) dall’header.

### Cosa non può fare (di default)
- Importare/generare schede, aprire catalogo, community, prezzi, hub coach.
- Usare Coach AI se il coach non ha acceso **Nurvan AI**.
- Modificare/generare piani se non ha **massima libertà**.
- Analizzare il check fisico con l’AI.

---

## 16. Coach — hub e lista

### Sblocco
- Checkout demo (stesso flusso del pagamento vero).
- Poi: APRI HUB COACH.

### Hub
- Cerca clienti.
- Aggiungi cliente (nuovo o transizione) → genera invito / testo benvenuto.
- Per cliente: Apri scheda, Chat, Segui live (se allena), Copia link, Segna pagato / non pagato, Revoca, Rimuovi.
- Nascondi presenza online.
- Consenti / togli videocall.
- Esci dall’hub (torna alla parte personale).

### Header in sessione
- Switch cliente: **resta dove sei** (chat, allenamento, alimentazione, …).
- Se sei in assegnazione in corso, lo switch è bloccato finché non invii o annulli.
- LISTA → hub. INDIETRO → esce dalla vista o dalla sessione.

### Drawer MENU COACH
- Notifiche / notifiche cliente.
- Lista, Il mio database.
- Con cliente aperto: scheda, chat, calendario, allenamento, alimentazione, integrazione, terapia, esami, stats.
- In vista dati: Salva modifiche, Torna alla scheda.
- Esci coach.

---

## 17. Coach — scheda cliente

- Presenza / live workout → Segui live (STOP per uscire).
- Storico allenamenti sync + VEDI REPORT.
- Stats / cronologia.
- Fine collaborazione da confermare.
- Approva / nega modifica atleta (nega con messaggio).
- Approva / nega sblocco (massima libertà o Nurvan AI; nega con nota).
- **ASSEGNA SCHEDA**:
  1. Importa PDF/Excel/Word
  2. Dal mio database
  3. Database programmi Nurvan (filtro anagrafica)
  4. Usa scheda attiva come base  
  Poi modifica nello spazio cliente e **INVIA** (scadenza automatica, conferma).
- **Dal mio database**: scegli la scheda, poi **sempre** cosa assegnare (allenamento / alimentazione / integrazione / terapia / esami). Puoi togliere l’integrazione anche se la scheda ce l’ha tutta. Il resto sul cliente non si cancella.
- Vedi / modifica domini del cliente; toolbar: notifiche, cancella dominio, importa nuovo.
- Consenti massima libertà / Nurvan AI.
- Chiedi check fisico; chiedi esami.
- Fissa / conferma schedule.
- Anagrafica intake (natural/enhanced, farmaci, analisi, allergie).
- Link invito, ruota link.
- Chat e videocall.

---

## 18. Coach — database schede (“Il mio database”)

- Importa nel database **senza** attivare la scheda sul tuo profilo e **senza** toccare i clienti.
- Elenco schede salvate, elimina.
- In assegnazione: APRI IL MIO DATABASE e scegli + picker domini.

---

## 19. Chat umana e videocall (coach ↔ cliente)

- Messaggi cifrati, allegati (foto/file), dettatura.
- Azzera chat (solo per te), nuova chat.
- Videocall (muto / camera); entrambi devono premere VIDEO.
- Notifica in chat se l’altro non è in call.

---

## 20. Notifiche

- Centro: elenco, apri, segna letta, archivia, cancella tutte.
- Coach: notifiche globali e per cliente (con orario).
- Tipi tipici: messaggio, check richiesto, esami, pagamento, modifica, unlock, leave, workout live, assegnazione.
- Badge icona / app.
- Push web (se sottoscritto).
- L’inbox coach ignora il rumore delle azioni fatte dal coach stesso.

---

## 21. Salvataggio, sync, offline

| Dove | Cosa succede |
|---|---|
| Locale | IndexedDB + persist immediato |
| Account cloud | Sync dopo modifiche; in vista cliente la sync del profilo coach è in pausa |
| Outbox | Ping workout, live sync, messaggi, chiedi scheda, change-request, sync account |
| Offline | Toast; al ritorno online flush coda + sync |
| APK | Stesso `index.html` della web (build master) |

---

## 22. Privacy e confini

- Terapia ed esami **mai** in ranking, XP, share card.
- Coach AI vede terapia/esami solo con opt-in.
- Check fisico atleta: solo invio al coach umano.
- Vista cliente: sandbox; SALVA MODIFICHE spinge i dati al cliente, non al master.
- Hard reset selettivo (tutto / personale / coach).

---

## 23. Mappa sezioni → operazioni principali

| Sezione | Operazioni |
|---|---|
| Home | Avvia seduta, programmi/chat, moduli, attiva/elimina schede, reset |
| Allenamento | Log serie, timer, bonus, sostituzione, PDF, massimale, finalizza |
| Stats | Grafici, muscoli, check fisico, PDF, cronologia |
| Alimentazione | Piano, cibi, barcode, wizard, allergie, salva |
| Integrazione | Elenco, wizard, evidenze, barcode |
| Terapia | Farmaci, alert |
| Esami | Import, PDF richiesta, record, reminder |
| Calendario | Mese, eventi, aggiungi/rimuovi |
| Coach AI | Chat, file, PubMed, proposte, voce |
| Programmi | Catalogo, genera, importa, esporta |
| Import | File → picker domini → attiva |
| Profilo | Anagrafica, foto, backup |
| Impostazioni | Timer, lingua, AI, salute, reset |
| Hub coach | Clienti, inviti, pagato, live |
| Scheda cliente | Assegna, domini, libertà, check, esami |
| Database coach | Import personale, assegna con picker |
| Chat | Messaggi, file, video |
| Notifiche | Leggi, archivia, apri destinazione |

---

## 23b. Coach OS (v1.5.34)

La sessione Coach usa una shell distinta. Personal e Client restano invariati nei permessi.

- **Today** — attention, sessioni, task, activity recente, Agent. KPI secondari.
- **Clients** — filtri, saved views, Client Overview (Next Action → snapshot → intelligence → timeline → domini).
- **Inbox** — feed messaggi, check-in e attention; la chat 1:1 resta il thread.
- **Programs** — database coach e Import Program nativo con picker domini.
- **Calendar** — booking online (Coaching Call, Check-in, Review, Consultation, Custom, Training).
- **Check-in Center** — requested / received / to review / reviewed; media privati firmati.
- **Nurvan Agent V1** — READ/PROPOSE/EXECUTE ristretto, WHY, conferma, stale protection, audit, undo.
- **Coach Analytics** — qualità atleta, senza revenue/MRR.
- **Business / CRM / Automations** — ledger manuale, pipeline LEAD→CHURNED, regole con dry-run. Stripe non è richiesto.
- **Athlete Brain** — interpretazione ancorata ai segnali deterministici; feedback Approve/Dismiss.
- **Nutrition / Form review** — stima pasto con conferma obbligatoria; marker video.

Feature flag indipendenti permettono il rollback di ogni superficie.

---

## 24. Flussi tipici

**Uso personale.** Accedi → importa o scegli/genera scheda → allena e finalizza → nutri/integra → stats e check → AI se serve → backup.

**Coach prende un cliente.** Sblocca hub → aggiungi → invia link → il cliente fa intake → assegna (file / database / catalogo) scegliendo i domini → il cliente allena → tu vedi live/stats/chat → eventuale libertà AI o generate.

**Cliente.** Link → login → intake → tutorial → aspetta o usa la scheda → chat / check se richiesto.

---

Questo file va aggiornato quando si aggiunge una funzione utente (non per ogni refactor interno). Per i nomi tecnici nel codice: `web/index.base.html`, `web/coach-practice-ui.js`, `coach-practice.mjs`.
