# NURVAN COACH OS — ACCEPTANCE SCENARIOS

Baseline: v1.5.34

Questi scenari diventano test manuali/automatici nelle fasi indicate. Phase -1 li definisce; non implementa runtime.

## 1. Personal journey

### PERS-001 — Workout raggiungibile

Given un utente Personal con programma attivo  
When apre Home  
Then vede la sessione del giorno  
And raggiunge Workout in massimo 1–2 azioni.

### PERS-002 — Nessun business Coach

Given un utente Personal fuori dalla modalità Coach  
When apre Home e Menu  
Then non vede CRM, Business, portfolio analytics o Agent interno Coach.

### PERS-003 — Import invariato

Given un file in un formato già supportato  
When lo importa in Personal  
Then extraction, preview, domain picker, validation e activation continuano a funzionare  
And i domini non selezionati non vengono cancellati.

## 2. Coach Today

### COACH-001 — Cosa fare oggi

Given un coach con attention, task e recent activity  
When apre Today  
Then entro 10 secondi identifica:

- clienti totali;
- clienti che richiedono attenzione;
- task di oggi;
- urgenze;
- CTA Nurvan Agent.

### COACH-002 — KPI secondari

Given Today con attention presenti  
When la pagina viene renderizzata  
Then attention e task precedono i KPI  
And Recent Activity contiene al massimo 5–8 elementi.

## 3. Navigation and role isolation

### NAV-001 — Coach navigation

Given modalità Coach attiva  
Then bottom navigation è Home, Clients, Inbox, Programs, Calendar.

### NAV-002 — Switch mantiene la sezione

Given il coach è nella Chat E2E di Client A  
When seleziona Client B dall’header  
Then resta in Chat  
And nome, interlocutore, thread e banner mostrano Client B.

### NAV-003 — Client isolation

Given un account Client  
When apre Home e Menu o prova route dirette  
Then non può vedere Today, portfolio Clients, Coach Programs, Business, CRM, Automations o Agent interno.

## 4. Client Overview and Timeline

### CLIENT-001 — Comprensione rapida

Given un cliente con attività e metriche  
When il coach apre Client Overview  
Then vede nell’ordine:

1. Header;
2. Next Action;
3. Athlete Snapshot;
4. Timeline;
5. Recent Activity;
6. Domain tabs.

### CLIENT-002 — Timeline source link

Given un workout finalizzato  
When compare nella Client Timeline  
Then l’evento contiene timestamp, source, domain, actor e link al workout originale  
And non duplica l’intero payload.

## 5. Attention and Coach Tasks

### TASK-001 — Attention non è Task

Given un missing check-in  
Then esiste un’attention deduplicata  
And un task nasce soltanto secondo regola o azione esplicita.

### TASK-002 — Task lifecycle

Given un task “Review Marco check-in”  
When il coach lo snooza, riordina e completa  
Then status/due/order/completed_at vengono aggiornati e auditati.

### TASK-003 — Agent daily summary

Given task open di più clienti  
When il coach chiede il daily summary  
Then l’Agent legge i task autorizzati, li ordina e non modifica nulla.

## 6. Deterministic intelligence

### INT-001 — Signal riproducibile

Given nessun workout da 7 giorni  
When viene calcolato il signal inactivity  
Then rule version, finestra e source data sono disponibili.

### INT-002 — AI grounded

Given signals e derived metrics  
When l’AI produce un’interpretazione  
Then separa dato, inferenza e raccomandazione  
And mostra WHY e View data  
And non formula diagnosi.

## 7. Agent V1

### AGENT-001 — Program proposal lifecycle

Given un owned client e dati correnti  
When il coach chiede una modifica programma  
Then il flusso è:

`Intent → Plan → Preview + WHY → Confirmation → Execution → Result → Undo se disponibile`

### AGENT-002 — Confirmation required

Given una proposal di assegnazione programma, modifica, invio messaggio o request check-in  
When il coach non conferma  
Then nessuna mutazione viene applicata.

### AGENT-003 — Permission denied

Given un target non owned o un dominio non consentito  
When l’Agent prova a leggere/proporre/eseguire  
Then l’operazione viene negata e auditata senza esporre dati.

### AGENT-004 — Stale proposal

Given l’Agent crea una proposal sul revision/fingerprint R1  
And il coach modifica manualmente la risorsa, portandola a R2  
When tenta EXECUTE della proposal R1  
Then il server restituisce `STALE_PROPOSAL`  
And non modifica R2  
And mostra il diff  
And offre Refresh data e Re-plan  
And registra il tentativo rifiutato.

### AGENT-005 — Concurrent confirm

Given due richieste di conferma simultanee sulla stessa proposal  
When arrivano al server  
Then una sola può eseguire  
And l’altra riceve stato already-executed/stale  
And nessuna action viene duplicata.

## 8. Bulk guardrails

### BULK-001 — Future inactive-client message

Given il comando futuro “Invia il messaggio ai clienti inattivi”  
When l’Agent prepara l’azione  
Then mostra target count, target preview/segment, message preview, action type e impact  
And richiede conferma  
And congela il target set.

When il coach conferma  
Then il server applica batch cap, ownership, permission, consent e feature flag per target  
And restituisce completed, failed e skipped  
And registra target set e risultati nell’audit.

### BULK-002 — Safe retry

Given un batch con alcuni completed e alcuni failed  
When viene ritentato  
Then completed non vengono ripetuti  
And vengono ripresi soltanto failed retryable  
And l’idempotency del batch resta valida.

Nota: questi sono guardrail contrattuali; broadcast e automations non entrano in Agent V1.

## 9. Check-in media security

### MEDIA-001 — Owning coach

Given Coach A possiede Client A  
When richiede un media check-in autorizzato  
Then riceve accesso firmato e temporaneo  
And l’accesso viene auditato.

### MEDIA-002 — Cross-coach denial

Given Coach B non possiede Client A  
When cambia ID, object key o URL  
Then riceve access denied  
And nessun metadata sensibile viene rivelato.

### MEDIA-003 — Cross-client denial

Given Client B  
When prova ad accedere al media di Client A  
Then riceve access denied.

### MEDIA-004 — Expiry and revoke

Given un signed URL/token scaduto o revocato  
When viene utilizzato  
Then l’accesso fallisce.

### MEDIA-005 — Legacy reuse gate

Given il percorso media legacy  
When manca anche uno tra access control, ownership, consent, retention, signed access, audit, expiry, revoke o no-public-URL  
Then il percorso non viene riutilizzato  
And si usa la nuova storage abstraction.

## 10. Native Coach Import

### IMPORT-001 — Full path inside Coach OS

Given la nuova Coach shell  
When il coach apre `Programs → Import Program`  
And carica PDF/XLS/XLSX/DOC/DOCX/immagine o altro formato supportato  
Then vede extraction progress, preview e domini riconosciuti  
And può correggere problemi  
And seleziona esplicitamente Workout/Nutrition/Integration/Therapy/Exams  
And valida  
And salva nel Coach Database oppure assegna a un owned client  
And non attraversa la vecchia shell.

### IMPORT-002 — Non-destructive domains

Given un target con Therapy esistente  
When il coach importa soltanto Workout e Nutrition  
Then Therapy resta invariata.

### IMPORT-003 — Today quick action

Given Coach Today  
When usa Quick Action Import Program  
Then apre lo stesso percorso nativo Programs/Import e mantiene la nuova shell.

## 11. Scheduling

### SCHED-001 — Online coaching order

Then i tipi sono ordinati:

1. Coaching Call
2. Check-in
3. Review
4. Consultation
5. Custom Session
6. Training Session

### SCHED-002 — Timezone and collision

Given coach e client in timezone diverse  
When prenotano/reschedulano  
Then lo stesso istante è rappresentato correttamente  
And non è possibile una doppia prenotazione.

## 12. Build and rollback gates

### BUILD-001 — Web/APK parity

After ogni fase UI  
Then `web/index.html` e `app/src/main/assets/index.html` sono equivalenti secondo il test esistente.

### ROLLBACK-001 — Feature flag

Given una feature nuova  
When il flag viene disattivato  
Then torna la superficie v1.5.34 compatibile  
And schema/additive data non rompono client precedenti.

### ROLLBACK-002 — Agent execute kill switch

Given un problema Agent  
When EXECUTE viene disabilitato server-side  
Then READ/PROPOSE possono restare disponibili  
And nessuna nuova mutation viene accettata.
