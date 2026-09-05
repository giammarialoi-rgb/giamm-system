# NURVAN COACH OS — PRODUCT CONTRACT

Status: binding implementation contract  
Baseline tecnica e funzionale: v1.5.34  
Principio operativo: `TODAY → ATTENTION → CLIENT → UNDERSTAND → DECIDE → NURVAN EXECUTES`

Questo contratto precede schema, endpoint e UI del Coach OS. Le nuove implementazioni non possono ridurre le funzioni elencate in [`../APP_FUNZIONI.md`](../APP_FUNZIONI.md).

## 1. Product boundaries

Nurvan mantiene tre prodotti distinti:

### Personal

Per una persona che si allena autonomamente, senza necessità di essere coach o cliente.

Deve conservare:

- import PDF/XLS/XLSX/DOC/DOCX/immagini e altri formati supportati;
- catalogo e generazione programmi;
- Coach AI personale;
- workout, log, stats e check fisico personale;
- alimentazione, integrazione, terapia, esami e calendario;
- backup, account sync, offline/outbox e Health Connect;
- accesso al workout in massimo 1–2 azioni dalla Home.

Non deve mostrare CRM, business, portfolio clienti o Agent interno Coach.

### Coach

Per il coaching online e la gestione di un portafoglio clienti.

Deve rendere immediatamente comprensibili:

- cosa richiede attenzione;
- quali task sono dovuti oggi;
- quale cliente aprire;
- quali dati supportano una decisione;
- quali azioni possono essere delegate a Nurvan;
- quali azioni sono state eseguite e con quale risultato.

### Client

Per l’atleta invitato da un coach.

Deve conservare:

- login da invito e intake;
- Home, workout e domini assegnati;
- chat E2E, notifiche, videocall e live workout;
- check-in e risposte del coach;
- AI soltanto se concessa;
- sandbox, role/ownership checks, offline/outbox.

Non deve vedere:

- Coach Today o portfolio clienti;
- database Coach;
- business, CRM o automations interne;
- Coach Analytics cross-client;
- Agent interno Coach.

## 2. User journeys

### Personal journey

`Entry → Home → Import / Database / Create / AI → Program → Workout → Stats → Domains → AI`

Acceptance:

- la Home rende evidente la sessione odierna;
- il workout è raggiungibile in 1–2 azioni;
- import, database, create e AI conducono allo stesso canonical program model;
- nessuna capability Coach appare senza un cambio modalità esplicito.

### Coach journey

`Login → Today → Attention → Client → Understand → Decide → Execute → Done`

Acceptance:

- Today risponde a “Cosa devo fare oggi?”;
- Attention apre cliente, task o fonte;
- Client Overview mostra Next Action prima delle analisi;
- Understand separa dati, segnali e interpretazione;
- Execute è manuale o passa da Agent con permission, conferma e audit.

### Client journey

`Invite → Login → Intake → Home → Workout → Check-in / Chat → Coach response`

Acceptance:

- nessun passaggio espone strumenti interni Coach;
- i domini visibili corrispondono a quelli assegnati;
- AI e libertà di modifica rispettano i flag correnti;
- check-in, chat e workout continuano a funzionare con rete intermittente secondo le capability offline esistenti.

## 3. Navigation contract

### Personal navigation

Bottom navigation:

1. Home
2. Workout
3. Stats
4. Coach AI
5. Menu

Menu secondario:

- Programs
- Import
- Nutrition
- Integration
- Therapy
- Exams
- Calendar
- Community
- Profile
- Settings
- Pricing/entitlements ove applicabile

### Coach navigation

Bottom navigation mobile:

1. Home, che apre Today
2. Clients
3. Inbox
4. Programs
5. Calendar

Drawer/sidebar:

- Check-ins
- Nutrition
- Analytics
- Agent
- Automations
- Business
- CRM
- Settings
- Help

Regole:

- `Inbox`, non `Chat`, è il concetto di primo livello;
- la chat 1:1 rimane il thread principale dell’Inbox;
- il client selector rimane nell’header contestuale;
- lo switch cliente mantiene la sezione corrente e aggiorna identità/interlocutore;
- lo switch è bloccato durante un’assegnazione non conclusa;
- desktop usa sidebar persistente, tablet sidebar collassabile, mobile drawer.

### Client navigation

Bottom navigation:

1. Home
2. Workout
3. Chat
4. AI, soltanto se concessa
5. Menu

Il Menu contiene esclusivamente domini assegnati, notifiche, guida, profilo e impostazioni consentite.

## 4. Permission matrix

Ogni permission deve essere applicata sul server e riflessa nella UI. Nascondere un controllo non costituisce autorizzazione.

### Workout

- Personal: legge e modifica il proprio workout.
- Coach: usa il proprio workout in Personal; legge/modifica quello di un owned client esclusivamente in sandbox/vista autorizzata.
- Client: legge il programma assegnato e registra i propri log.

### Program import

- Personal: consentito sul proprio account.
- Coach: consentito nel proprio database o nella sandbox di un owned client.
- Client: non consentito.

### Program catalog, create e AI generation

- Personal: consentiti secondo entitlement.
- Coach: consentiti nel proprio scope e in assegnazione.
- Client: non accede al catalogo interno; eventuali modifiche/generazioni rispettano `allow_max_freedom`.

### Coach database

- Personal non-Coach: non disponibile.
- Coach: disponibile nel proprio account.
- Client: non disponibile.

### Client management, Today, Attention, Tasks e Timeline portfolio

- Personal: non disponibili.
- Coach: disponibili soltanto sui propri clienti.
- Client: vede soltanto gli eventi propri esplicitamente esposti; non vede il portfolio.

### Agent

- Personal: usa il Coach AI personale esistente.
- Coach: usa Coach Agent soltanto su owned clients e tool abilitati.
- Client: usa AI personale soltanto con `allow_nurvan_ai`; nessun tool interno Coach.

### Chat e videocall

- Coach: soltanto con owned clients.
- Client: soltanto con il proprio coach.
- Personal: nessuna inbox portfolio.

### Nutrition

- Personal: propria.
- Coach: owned client in sandbox e secondo policy.
- Client: propria/assegnata; generazione/modifica secondo libertà concessa.

### Therapy ed Exams

- Personal: propri.
- Coach: owned client soltanto con domain permission/consent.
- Client: propri o assegnati.
- Tutti: mai ranking, XP o share card.
- Agent: esclusi dal context senza consenso esplicito.

### Check-in e media

- Coach: richiede/revisiona check-in dei propri clienti.
- Client: invia e legge i propri.
- Altro coach o altro client: accesso negato.
- Il media richiede autorizzazione server-side e accesso firmato temporaneo.

### Scheduling

- Coach: disponibilità e appuntamenti del proprio coaching.
- Client: booking/reschedule/cancel entro policy.
- Personal: calendario personale, non business scheduling.

### Coach Analytics

- Coach: metriche atleta/portfolio dei propri clienti.
- Personal e Client: non disponibili come analytics portfolio.

### Business, CRM e Automations

- Soltanto Coach e soltanto sul proprio scope.
- Nessuna esposizione al Client.
- Nessuna contaminazione della Personal Home.

### Export e reset

- Ogni ruolo agisce soltanto sul proprio scope.
- Hard reset `all/personal/coach` resta selettivo.

## 5. Action contract

[`../../action-catalog.mjs`](../../action-catalog.mjs) rimane l’unico catalogo canonico.

Ogni action deve dichiarare:

- actor role;
- target type e id;
- source: MANUAL, AI, IMPORT, AUTOMATION o SYSTEM;
- capability: READ, PROPOSE o EXECUTE;
- read/write;
- confirmation policy;
- reversible e compensating action;
- audit policy;
- offline policy;
- permission e feature flag;
- input/output schema;
- impact level;
- idempotency strategy;
- handler;
- eventuale bulk policy.

### P0 read actions

- Search clients.
- Get client status.
- Get client activity.
- List inactive clients.
- List missing check-ins.
- Summarize unread messages.
- Get program status.
- List tasks.
- Create daily task summary.

Actor: Coach/Coach Agent.  
Target: owned portfolio, owned client o own task.  
Confirmation: non richiesta.  
Audit: query/run summary, senza duplicare dati sensibili.  
Offline: cache read-only se disponibile; nessuna falsa freschezza.

### P0 proposal actions

- Create program draft.
- Propose program modification.
- Propose deload.
- Prepare message.
- Prepare check-in request.

Actor: Coach Agent.  
Write: nessuna mutazione target.  
Confirmation: richiesta soltanto al passaggio EXECUTE.  
Audit: proposta, WHY, revision/fingerprint e provenance.

### P0 execute actions

- Assign approved program.
- Apply approved program modification.
- Send confirmed message.
- Request check-in.
- Create, complete, snooze e reorder Coach Tasks.

Actor: Coach/Coach Agent.  
Target: owned client o own task.  
Confirmation: sempre per program assignment/modification, message e check-in request; task low-impact secondo policy, bulk sempre confermato.  
Audit: obbligatorio.  
Offline: nessuna execution Agent; draft/proposal può essere conservata.

### Import actions

- Import program.
- Save Coach template.
- Assign selected domains.

Actor: Personal o Coach.  
Confirmation: domain picker e conferma activation/save/assign.  
Offline: extraction locale dove già supportata; assegnazione client richiede rete.  
Audit/provenance: filename, detected domains, selected domains, warnings e target.

### Deferred action families

Le definizioni possono essere preparate nelle rispettive fasi ma non rese eseguibili prima:

- scheduling;
- business/payments;
- CRM;
- automations;
- broadcast/groups;
- meal/video AI.

## 6. Bulk execution contract

Valido per ogni capability presente o futura che coinvolge più clienti.

Prima di EXECUTE:

- target count;
- target list, segment o saved view;
- action type;
- impact preview;
- content preview, se messaggio o documento;
- ownership, permission, domain consent e feature flag per ogni target;
- conferma obbligatoria;
- server batch cap configurabile;
- target set congelato.

Execution:

- idempotency key per il batch;
- deterministic sub-key per ogni target;
- audit del target set;
- risultati separati in `completed`, `failed`, `skipped`;
- retry soltanto dei target retryable non completati.

Un target cambiato dopo la preview invalida il batch.

Il comando futuro “Invia il messaggio ai clienti inattivi” deve produrre:

1. target count;
2. target preview;
3. message preview;
4. confirmation;
5. execution;
6. per-target result;
7. audit;
8. safe retry.

Broadcast e automations restano fuori da Agent V1.

## 7. Stale proposal and concurrency contract

Ogni proposal conserva:

- resource id;
- resource revision/version;
- precondition fingerprint;
- owner/permission snapshot;
- created/expiry timestamp;
- status;
- idempotency state.

Prima di EXECUTE il server rivalida revision, fingerprint, ownership, permission, domain consent, feature flag, TTL e status.

Se i dati sono cambiati:

- rispondere `STALE_PROPOSAL`;
- non applicare merge o overwrite implicito;
- mostrare “Questa proposta non è più aggiornata perché i dati sono cambiati.”;
- mostrare un diff sicuro;
- offrire `Refresh data` e `Re-plan`;
- auditare il tentativo rifiutato.

Il client non può forzare una proposal stale.

## 8. Screen contract

### Coach Today

Ordine:

1. Header.
2. Greeting.
3. Nurvan Agent CTA.
4. Needs attention.
5. Today’s sessions, soltanto se presenti.
6. My tasks.
7. Recent activity, massimo 5–8.
8. KPI secondari.
9. Quick actions contestuali.

### Clients

- search, filters, sort e pagination;
- saved views: At Risk, No Workout 7d, Check-ins, Payments, New Clients;
- card: foto, status, goal, last workout, adherence, last check-in, trend, unread, payment, next action.

### Client Overview

Ordine:

1. Header: name, status, goal, actions.
2. Next Action.
3. Athlete Snapshot.
4. Client Timeline.
5. Recent Activity.
6. Domain tabs: Program, Nutrition, Check-ins, Messages, Calendar, Analytics, Profile.

### Client Timeline

Eventi riassuntivi:

- workout;
- check-in;
- peso;
- program assignment/change;
- message/coach response;
- nutrition update;
- milestone;
- request/approval.

Ogni evento: timestamp, source, domain, actor, summary e link alla fonte. Nessuna copia del payload originale.

### Programs and native Import

Entry:

- `Programs → Import Program`;
- `Today → Quick Action → Import Program`.

Workflow interno alla nuova Coach shell:

`Upload → Extraction → Preview/Correction → Domain Detection → Domain Picker → Validation → Activation / Save to Coach Database / Assign to Client`

Picker sempre esplicito:

- Workout;
- Nutrition;
- Integration;
- Therapy;
- Exams.

I domini non scelti non vengono cancellati.

## 9. Intelligence contract

### Level 1 — deterministic signals

- inactivity;
- adherence drop;
- weight change;
- program expiration;
- missing check-in;
- performance plateau.

Ogni segnale ha formula/regola versionata, finestra, input e source links.

### Level 2 — derived intelligence

- performance trend;
- adherence trend;
- recovery trend;
- consistency.

Ogni metrica ha formula version e fingerprint degli input.

### Level 3 — AI interpretation

- usa esclusivamente livelli 1–2 e dati autorizzati;
- distingue dato, inferenza e raccomandazione;
- mostra WHY e View data;
- non formula diagnosi;
- non inventa uno stato.

## 10. Regression baseline

Devono rimanere operativi:

- Personal mode completo;
- Coach mode e uscita verso Personal;
- Client invite/login/intake/tutorial;
- sandbox e separazione profilo;
- switch cliente che mantiene sezione e aggiorna nome/interlocutore;
- domain assignment e domain picker;
- import/canonical/preview/validation;
- Coach database e catalogo Nurvan;
- workout logger, timer, finalize, stats e check fisico;
- nutrition, integration, therapy, exams e calendar;
- Coach AI personale e Client AI gated;
- chat E2E, attachment, voice, videocall e live workout;
- notifications/push;
- sync, IndexedDB, offline/outbox;
- hard reset selettivo;
- web/APK parity.

## 11. Phase -1 exit gate

Phase -1 è completa quando:

- journeys, navigation, permissions e actions sono approvati;
- ogni nuova capability ha owner e target;
- i confini Personal/Coach/Client non sono ambigui;
- import nativo, media security, bulk e stale proposal sono contratti espliciti;
- acceptance scenarios e decision log sono versionati;
- nessun codice runtime è stato modificato.
