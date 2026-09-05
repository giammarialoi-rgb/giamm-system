# NURVAN COACH OS — DECISION LOG

Baseline: v1.5.34

Questo file registra decisioni che modificano o chiariscono il Product Contract. Nessuna decisione può ridurre role isolation, consent, audit, idempotency, rollback o regressione baseline senza approvazione esplicita.

## D-001 — Evoluzione incrementale

Status: accepted

Decisione:

- nessun nuovo framework;
- nessun rewrite globale;
- mantenere `web/index.base.html` come host e `build_master25.mjs` come pipeline;
- estrarre soltanto le nuove superfici Coach in moduli sorgente dedicati;
- non modificare bundle generati direttamente.

Motivo:

- Personal, Workout, Import, Domains, Sync, Outbox e Client Sandbox sono stabili e ad alto rischio regressione.

## D-002 — Today è la Home Coach

Status: accepted

Decisione:

- la schermata primaria Coach è Today;
- attention, task e urgenze precedono KPI;
- Overview/Analytics rimane una vista separata.

Motivo:

- il job principale è capire cosa fare oggi, non osservare una dashboard.

## D-003 — Inbox sostituisce Chat nella nav Coach

Status: accepted

Decisione:

- nav Coach: Home, Clients, Inbox, Programs, Calendar;
- Chat E2E resta il thread principale dell’Inbox;
- check-in, request, approval e attention possono entrare nell’Inbox.

## D-004 — Attention e Task sono entità diverse

Status: accepted

Decisione:

- Attention = segnale/stato da valutare;
- Task = azione operativa assegnata, ordinabile e completabile;
- un’attention può generare un task, ma non lo sostituisce.

## D-005 — Intelligence a tre livelli

Status: accepted

Decisione:

1. deterministic signals;
2. derived intelligence;
3. AI interpretation.

L’AI non genera lo stato di base e deve linkare i dati.

## D-006 — Agent V1 ristretto

Status: accepted

READ:

- clients search/status/activity;
- inactive clients;
- missing check-ins;
- unread messages;
- program status;
- tasks e daily task summary.

PROPOSE:

- program draft/modification;
- deload;
- message draft;
- check-in request.

EXECUTE:

- assign approved program;
- apply approved program modification;
- send confirmed message;
- request check-in;
- task operations low-impact.

Esclusi:

- scheduling;
- business/payments;
- CRM;
- automations;
- broadcast/groups.

## D-007 — Un solo Action Catalog

Status: accepted

Decisione:

- estendere `action-catalog.mjs`;
- non creare un sistema azioni parallelo;
- tutte le action dichiarano actor, target, source, capability, confirmation, reversibility, audit, offline, permission, flag e idempotency.

## D-008 — Bulk guardrails

Status: accepted

Decisione:

- nessun bulk write senza target/action/impact preview e conferma;
- server batch cap;
- target set auditato e congelato;
- idempotency batch + per-target;
- completed/failed/skipped;
- retry senza duplicati.

Valido anche per future broadcast/automations.

## D-009 — Stale proposal

Status: accepted

Decisione:

- proposal vincolata a resource revision/fingerprint;
- mismatch produce `STALE_PROPOSAL`;
- nessun overwrite/merge implicito;
- UI offre diff, Refresh data e Re-plan.

## D-010 — Check-in media deny-by-default

Status: accepted

Decisione:

- percorso legacy riusabile soltanto se supera integralmente il media security contract;
- in caso contrario nuova storage abstraction;
- signed short-lived access, ownership, consent, audit, retention e revoke obbligatori;
- nessun URL pubblico permanente.

## D-011 — Import Program nativo Coach P0

Status: accepted

Decisione:

- entry `Programs → Import Program` e quick action Today;
- l’intero workflow resta nella nuova Coach shell;
- riusare engine extraction/canonical/validation, non la vecchia schermata;
- domain picker sempre esplicito e non distruttivo.

## D-012 — Normalizzazione su necessità

Status: accepted

Decisione:

- mantenere JSONB quando sufficiente;
- normalizzare soltanto per query cross-client, performance, workflow, audit, indexing o consistency;
- nessuna normalizzazione workout per preferenza architetturale.

## D-013 — Scheduling online-coaching-first

Status: accepted

Ordine tipi:

1. Coaching Call
2. Check-in
3. Review
4. Consultation
5. Custom Session
6. Training Session

Google/Apple Calendar restano adapter futuri.

## D-014 — Business non blocca P0

Status: accepted

Decisione:

- manual ledger prima;
- Stripe lifecycle/webhook/credits/refund dopo;
- Business Analytics separata da Coach Analytics;
- nessun billing blocca Today, Clients, Check-ins, Agent V1 o Scheduling.

## D-015 — Feature flags e rollback

Status: accepted

Flag iniziali:

- `coachShellV2`
- `coachTodayV2`
- `coachOverviewV2`
- `coachImportV2`
- `coachTasksV1`
- `clientTimelineV1`
- `clientIntelligence`
- `checkInCenterV1`
- `agentV1`
- `schedulingV1`
- `coachAnalyticsV1`
- `businessV1`
- `inboxV2`

Ogni fase mantiene fallback finché test e rollback drill non sono completati.

## Template nuova decisione

### D-XXX — Titolo

Status: proposed / accepted / superseded

Contesto:

Decisione:

Motivo:

Alternative rifiutate:

Impatto su ruoli, dati, API, test e rollback:
