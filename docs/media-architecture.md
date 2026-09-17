# Exercise & warm-up media architecture

Status: infrastructure only. No real images exist yet, no bulk import has
run, and none is required by this document. Everything below works today
with zero media rows in the database - that is the normal, permanent state
for the large majority of exercises, including every custom exercise an
athlete ever types.

## Principle

**An exercise must never depend on an image existing.** You can create an
exercise, log sets against it, put it in a program, assign it, and complete
a workout with it - all without a single media row. Media is purely
additive and can be added or replaced later without touching the exercise
itself, the program model, or any UI beyond the media component.

## Architecture

```
Exercise / Warm-up (canonical id)
        |
        v
ExerciseMediaService (server/media/exercise-media-service.mjs)
  - resolves already-stored rows, never generates/scrapes anything
        |
        v
exercise_media (Postgres table, migration 0013)
  - owner_type/owner_id -> media_type/variant -> storage_key/public_url
        |
        v
MediaStorageProvider (server/media/storage-provider.mjs)
  - abstract contract: upload/delete/getUrl/getSignedUrl/exists/getMetadata
        |
        v
R2MediaStorageProvider (server/media/r2-storage-provider.mjs)
  - Cloudflare R2 today, via the standard S3-compatible AWS SDK client
  - swapping to Supabase Storage/S3/anything else means writing one new
    provider class, not touching the service, routes, or frontend
```

The database and the resolution service never call the storage provider on
the read path - they only read already-persisted `public_url`/
`thumbnail_url` columns. The storage provider only matters for a future
admin upload/replace flow (not built in this phase - see "What's next").

## Canonical id

Exercises don't have a database row of their own - they live in
`web/exercise-catalog-extra.js` (a static list) or as free-text custom
entries an athlete types. To key media off something stable, this phase
introduces a **derived canonical id**: a slug built from the display name,
using the exact accent-stripping/lowercasing rule already used by the
exercise encyclopedia's own fuzzy matching (`fold()` in
`web/training-knowledge.js`):

```
"Squat bilanciere"          -> squat_bilanciere
"Panca inclinata manubri"   -> panca_inclinata_manubri
"Salto della quaglia"       -> salto_della_quaglia   (works even if unknown)
```

The identical algorithm exists in two places, and a test
(`test_media_architecture.mjs`, section "Canonical id") pins them equal:

- `server/media/canonical-id.mjs` - `canonicalExerciseId(name)`
- `web/exercise-media-client.js` - `canonicalExerciseId(name)` (same body)

This is a pragmatic middle ground, not a permanent id: renaming an
exercise's display text changes its canonical id, the same way it already
changes its encyclopedia match today. A future task could introduce a real
persisted id if that tradeoff stops being acceptable; nothing here blocks
it, since `owner_id` is just a `TEXT` column.

**Warm-up exercises don't need this.** They already carry a real, stable
`id` field in `web/warmup-exercise-library.js` (e.g. `raise_bike_easy`),
and that id IS the canonical id - unchanged by this phase.

## Database

Migration `server/db/migrations/0013_media_architecture.sql` creates one
table, shared by exercises and warm-ups via `owner_type`:

| column | notes |
|---|---|
| `owner_type` | `'exercise' \| 'warmup'` |
| `owner_id` | canonical exercise slug, or the warm-up's own `id` |
| `media_type` | `'image' \| 'video' \| 'animation'` |
| `variant` | `'master' \| 'thumbnail' \| 'animation'` |
| `storage_provider`, `storage_key` | where the object actually lives |
| `public_url`, `thumbnail_key`, `thumbnail_url` | what gets served |
| `mime_type`, `width`, `height`, `file_size_bytes` | for stable layout / no CLS |
| `version` | incremented on every replace, for cache busting |
| `status` | `'active' \| 'inactive' \| 'processing' \| 'failed'` - the row's own lifecycle |
| `match_type` | `'exact' \| 'variant' \| 'reference'` |
| `confidence` | 0-1, nullable |
| `source` | `'nurvan' \| 'user' \| 'licensed' \| 'generated' \| 'external'` |
| `license` | free text, nullable - never auto-filled with "copyright free" |

A partial unique index, `uq_exercise_media_active_slot`, guarantees at most
one **active** row per `(owner_type, owner_id, media_type, variant)` -
replacing an asset means deactivating the old row and inserting a new
active one (see `assignMedia()` below), never two actives fighting over the
same slot.

There is deliberately **no foreign key** from `exercise_media` to an
"exercises" table - none exists. `owner_id` is a plain `TEXT` column that
may or may not correspond to anything in the static catalogs; a row for an
`owner_id` nobody has typed yet is harmless (it just never resolves).

## Resolution rules (exact / variant / reference)

`pickPrimaryMedia()` in `server/media/exercise-media-service.mjs` is the
single place this logic lives:

1. Only `status = 'active'` rows are eligible.
2. Among those, `exact` always beats `variant` always beats `reference`.
3. Ties (same match type) are broken by most-recently-updated.
4. If nothing is active, the manifest resolves to `hasMedia: false` - never
   a different exercise's image, ever.

The manifest also derives an overall `status` for the entity (distinct from
an individual row's own `status` column):

| manifest status | when |
|---|---|
| `missing` | no rows, or nothing usable yet |
| `processing` | a row is mid-upload and nothing is active yet |
| `ready` | a master, thumbnail, or animation is active |
| `failed` | the only rows for this owner failed and nothing is active |
| `disabled` | rows exist but every one of them is `inactive` |

## API

Three read-only endpoints, metadata only - never the binary file (that is
served straight from the CDN/public bucket URL already stored on the row):

```
GET /api/exercises/:exerciseId/media
GET /api/warmups/:warmupId/media
GET /api/media/:id
```

`:exerciseId` is expected to already be a canonical id (the frontend
computes it before calling); passing a raw display name still works
because the route re-derives the canonical id from whatever string it
receives. `:warmupId` is used as-is (it is already stable).

Example - an exercise with media:

```json
{
  "entityType": "exercise",
  "entityId": "squat_bilanciere",
  "canonicalName": null,
  "hasMedia": true,
  "primary": {
    "id": "1",
    "mediaType": "image",
    "matchType": "exact",
    "url": "https://media.nurvan.app/exercises/squat_bilanciere/master.v1.webp",
    "thumbnailUrl": "https://media.nurvan.app/exercises/squat_bilanciere/thumb.v1.webp",
    "width": 1024,
    "height": 1024,
    "version": 1,
    "source": "nurvan",
    "confidence": null
  },
  "media": { "master": "...", "thumbnail": "...", "animation": null },
  "status": "ready"
}
```

Example - a custom exercise with none:

```json
{
  "entityType": "exercise",
  "entityId": "salto_della_quaglia",
  "canonicalName": null,
  "hasMedia": false,
  "primary": null,
  "media": { "master": null, "thumbnail": null, "animation": null },
  "status": "missing"
}
```

Every failure mode (DB unreachable, malformed id, etc.) still returns
`200` with `hasMedia: false` - a media lookup failure must never surface as
an error on the exercise itself. The only `4xx` responses are for a
genuinely malformed request (missing id param, non-numeric `/api/media/:id`).

## Storage

`MEDIA_STORAGE_PROVIDER=r2` selects `R2MediaStorageProvider`
(`server/media/r2-storage-provider.mjs`), which talks to Cloudflare R2
through the standard `@aws-sdk/client-s3` client (R2 is S3-compatible - no
R2-specific SDK needed). Credentials never leave the server process and are
never imported by any frontend file.

Environment variables (see `.env.example`; **never commit real values**):

```
MEDIA_STORAGE_ENABLED=true
MEDIA_STORAGE_PROVIDER=r2
MEDIA_STORAGE_BUCKET=nurvan-media
MEDIA_STORAGE_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
MEDIA_STORAGE_ACCESS_KEY_ID=...
MEDIA_STORAGE_SECRET_ACCESS_KEY=...
MEDIA_STORAGE_PUBLIC_BASE_URL=https://media.nurvan.app
```

If `MEDIA_STORAGE_ENABLED` is unset/false, or any required R2 variable is
missing, `getMediaStorageProvider()` returns `NullMediaStorageProvider`:
`exists()`/`getMetadata()` resolve to `false`/`null`, `getUrl()` returns
`null`, and the mutating methods (`upload`/`delete`/`getSignedUrl`) throw a
recognizable `MEDIA_STORAGE_NOT_CONFIGURED` error rather than pretending to
succeed. **The lookup routes never call the storage provider at all** -
they only read `public_url`/`thumbnail_url` already persisted on the row -
so an unconfigured or misconfigured bucket cannot break exercise/warm-up
media lookups; it only blocks the future upload flow.

### Object key layout

```
exercises/<canonicalId>/master.webp
exercises/<canonicalId>/thumb.webp
exercises/<canonicalId>/animation.webm
warmups/<warmupId>/master.webp
warmups/<warmupId>/thumb.webp
warmups/<warmupId>/animation.webm
```

Keys use the stable id, never the display name (so renaming/translating an
exercise's Italian or English label never breaks its media).

### Setting up an R2 bucket (manual steps, one-time)

1. In the Cloudflare dashboard: R2 -> Create bucket -> name it (e.g.
   `nurvan-media`).
2. R2 -> Manage R2 API Tokens -> create a token with Object Read & Write
   scoped to that bucket. Note the Access Key ID / Secret Access Key - they
   are shown once.
3. The S3 API endpoint for the account is
   `https://<account_id>.r2.cloudflarestorage.com` (the account id is in
   the R2 dashboard URL / overview page).
4. Either enable the bucket's public R2.dev URL, or (recommended for
   production) attach a custom domain to the bucket via
   R2 -> bucket -> Settings -> Custom Domains, and use that domain as
   `MEDIA_STORAGE_PUBLIC_BASE_URL`.
5. Set the six `MEDIA_STORAGE_*` variables above in Render's environment
   variables (never in the repo), then set `MEDIA_STORAGE_ENABLED=true`.
6. Nothing else changes - the app already has the table, the service, and
   the routes; setting these variables only makes `isConfigured()` become
   true for a future admin upload flow to use.

### Cache / versioning

Uploaded objects are set with `Cache-Control: public, max-age=31536000,
immutable` - safe because every replace increments `version` and (in a
future admin flow) would upload to a new/version-qualified key or be
fronted by a CDN that busts on that version. The manifest exposes
`primary.version` so any future caching layer (including a
`?v=<version>` query param) has something to key on immediately, without a
data-model change.

## Frontend

`web/exercise-media-client.js` (loaded as a plain script, `window.NurvanExerciseMedia`) is the **only** place in the frontend that knows the
API shape:

```js
NurvanExerciseMedia.resolve('exercise', 'squat_bilanciere')       // -> Promise<manifest>
NurvanExerciseMedia.resolveByExerciseName('Squat bilanciere')     // derives the canonical id for you
NurvanExerciseMedia.getPrimaryMedia('warmup', 'raise_bike_easy')
NurvanExerciseMedia.hasMedia('exercise', 'x')
NurvanExerciseMedia.renderInto(containerEl, {
  entityType: 'exercise',        // or 'warmup'
  entityId: 'squat_bilanciere',  // optional for exercises - derived from canonicalName if omitted
  canonicalName: 'Squat bilanciere',
  size: 'thumb'                  // 'thumb' | 'master' (default)
});
```

`resolve()` never rejects - any network/parse/timeout failure resolves to
the same `{ hasMedia: false, ... }` shape callers get for a genuinely
missing exercise, so no caller needs a `.catch()`. Results are cached
in-memory per `entityType:entityId` for the life of the page; failed
lookups are not cached, so a transient network error doesn't permanently
hide media that shows up moments later.

`renderInto()` shows a stable placeholder immediately (never empty space,
never a broken-image icon), swaps in the real thumbnail/master
asynchronously, and falls back to the same placeholder if the image URL
404s or otherwise fails to load. It sets `loading="lazy"` and, when the row
has `width`/`height`, those attributes too, so a list of many exercises
never downloads every master image and never causes layout shift.

### Where it's wired up today

The exercise encyclopedia ("Info training") - both the **Esercizi** and the
new **Riscaldamento** tabs - renders a 52x52 thumbnail slot next to every
card via `renderKnowledgeCard()` / `refreshKnowledgeMediaSlots()` in
`web/index.base.html`. This is intentionally the only wired-up surface in
this phase (per the task's own scope note): it's a purely additive,
read-only surface, so wiring it up carries zero risk to program/workout/log
data, while proving the whole stack (canonical id -> API -> component ->
placeholder/fallback) end to end with real exercises and real warm-ups.

### Where it's ready but not wired up yet

`NurvanExerciseMedia` is a generic, reusable component - dropping it into
the exercise catalog list, the exercise picker, the workout session card,
the substitution picker, or an AI Coach suggestion card is a matter of
calling `renderInto()` in each of those render functions with the right
`entityType`/`entityId`/`size`. None of those were touched in this phase to
keep the change additive and low-risk.

## What's next (not built in this phase)

- **Admin upload/replace/delete panel.** The service functions it needs
  already exist and are exported for this purpose:
  `assignMedia()` (upload/replace - deactivates the old active row,
  inserts a new active versioned one, transactionally), `setMediaStatus()`
  (activate/deactivate), `deleteMediaRow()`. None of these are wired to an
  HTTP route yet - there is no write endpoint and no admin auth model for
  one in this phase.
- **Real image generation/sourcing.** Out of scope by explicit instruction.
  The manifest's `status: 'missing'` on virtually every exercise today is
  exactly what a future bulk-generation task would scan for.
- **AI-assisted `variant`/`reference` matching** (fingerprint-based, per
  the task spec's section 20) - the schema and resolution priority already
  support it (`match_type`, `confidence`), but nothing computes a
  fingerprint or proposes a match yet.

## Tests

`test_media_architecture.mjs` (registered as `npm run test:media-architecture`,
included in `npm run test:regression`) covers, against a fake in-memory
Postgres pool (no live database needed) and the real service/route code:

no-media exercises and warm-ups, exact/variant/reference resolution and
priority, custom exercises, thumbnail vs. master resolution, disabled
media, version bumping on replace, an unconfigured storage provider never
breaking anything, canonical-id parity between server and frontend, and
that every wiring point (migration, feature flag, route mount, script tag,
Android asset sync, `.env.example`, docs) is actually in place - not just
described.
