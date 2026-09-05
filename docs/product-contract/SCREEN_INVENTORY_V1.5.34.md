# NURVAN — SCREEN INVENTORY v1.5.34

Scopo: fissare le superfici esistenti da preservare e il naming target del Coach OS.

## 1. Current Personal surfaces

Router/renderers principali in [`../../web/index.base.html`](../../web/index.base.html):

- `home` — Home personale, sessione attiva, insight, domini, programmi salvati.
- `training` — workout logger, timer sessione/riposo, esercizi, finalizzazione.
- `stats` — grafici, volume muscolare, history, check fisico.
- `ai` — Coach AI personale, proposte e history.
- `programs` — catalogo, generator e programmi.
- `import` — upload, extraction, canonical preview, domain picker e activation.
- `db` — database esercizi.
- `nutrition` — piano, alimenti, wizard, barcode.
- `supplements` — integrazione.
- `therapy` — terapia.
- `exams` — esami.
- `calendar` — calendario personale.
- `community` — community.
- `athlete` — profilo personale.
- `settings` — preferences, AI controls, health, backup e reset.
- `pricing` — entitlements.

Current bottom navigation:

- Home
- Workout
- Stats
- Coach AI
- Menu

Vincolo: nessuna superficie Personal stabile viene riscritta durante il Coach OS P0.

## 2. Current Coach surfaces

Router/renderers principali in [`../../web/coach-practice-ui.js`](../../web/coach-practice-ui.js):

- `coachHub` — lista/search clienti e impostazioni presenza/video.
- `coachClient` — workspace/scheda cliente.
- `coachChat` — chat E2E con cliente.
- `coachLibrary` — database programmi Coach.
- client domains — riuso di `training`, `nutrition`, `supplements`, `therapy`, `exams`, `stats`, `calendar`, `athlete` in sandbox.

Current Coach chrome:

- header con client selector, Lista e Indietro;
- session banner;
- bottom nav Hub, Cliente, Chat, Menu;
- drawer con lista, database, chat e domini.

Current key overlays:

- assign chooser/sandbox;
- notifications;
- check/exams requests;
- intake;
- videocall;
- import/domain picker.

Vincoli:

- switch cliente mantiene la sezione;
- nome/interlocutore/banner si aggiornano;
- switch bloccato durante assign;
- salvataggio client non modifica il master Coach.

## 3. Current Client surfaces

- invite/login.
- intake e tutorial.
- Home assegnata/attesa.
- Workout.
- Chat coach.
- AI gated.
- Nutrition, Integration, Therapy, Exams, Calendar assegnati.
- Stats/check fisico secondo permission.
- Notifications e Profile/logout.

Vincolo: non mostrare alcuna nuova superficie Coach interna.

## 4. Target Coach screen map

### Primary navigation

- `Coach Today` — label UI: **Home** nella bottom nav; page title: **Today / Oggi**.
- `Coach Clients` — label: **Clients / Clienti**.
- `Coach Inbox` — label: **Inbox**; Chat resta il thread.
- `Coach Programs` — label: **Programs / Programmi**.
- `Coach Calendar` — label: **Calendar / Calendario**.

### Secondary navigation

- Check-ins
- Nutrition
- Analytics
- Agent
- Automations
- Business
- CRM
- Settings
- Help

### Client detail

- Overview
- Program
- Nutrition
- Check-ins
- Messages
- Calendar
- Analytics
- Profile

## 5. Naming contract

- Usare **Today/Oggi**, non “Overview”, per la Home Coach.
- Usare **Inbox**, non “Chat”, nella navigazione Coach.
- Usare **Coach Analytics** per adherence/performance/engagement.
- Usare **Business Analytics** per revenue/MRR/renewal/overdue/churn.
- Usare **Attention** per segnali che richiedono valutazione.
- Usare **Task** per azioni operative completabili.
- Usare **Client Timeline** per storia significativa con source link.
- Usare **Nurvan Agent** per il sistema READ/PROPOSE/EXECUTE.
- Usare **Coach AI** per l’assistente personale esistente.
- Usare **Import Program** per il percorso nativo Coach.

## 6. Stable components/services to reuse

- `navigate`/`render` routing e role gates.
- Coach client selector e workspace identity.
- assign sandbox e domain picker.
- notifications/inbox events.
- chat E2E, attachments, voice e videocall.
- import/canonical/validation engines.
- action catalog/dispatcher.
- trend/performance/readiness services.
- IndexedDB/account sync/outbox.
- CalendarService e domain renderers.

## 7. Duplication to remove only inside new shell

- Lista clienti non deve essere contemporaneamente Home e Clients.
- Header, bottom nav e drawer non devono offrire la stessa CTA adiacente.
- Today quick actions non duplicano CTA primaria Agent.
- Programs usa un unico percorso Import Program.
- Attention e Tasks non vengono renderizzati come copie dello stesso record.

Non rimuovere entry point legacy finché il relativo feature flag/fallback non è verificato.
