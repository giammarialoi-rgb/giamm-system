# Cloud Run and Google integrations

## Deployment model

The API remains compatible with Render. For Cloud Run, deploy the same image in
one region first and only then add a second region behind a global load
balancer. Both services must use the same PostgreSQL database and the same
secret values. Do not rely on memory for state, rate limits, OAuth tokens or
webhook deduplication.

* Liveness: `GET /livez`.
* Readiness: `GET /readyz` returns 503 until the configured AI provider and
  required database are available.
* Shutdown: the server stops accepting new connections on `SIGTERM`, drains
  active requests, then closes its database pool.
* Set `RATE_LIMIT_STORE=postgres` for Cloud Run. Render may retain `memory`
  while it has a single instance.

The repository includes `Dockerfile` and `deploy/cloud-run-deploy.ps1`. The
script takes the project ID and target region(s), builds the image, deploys the
same image to each region and binds only the database/JWT secrets by name. Run
it only after creating those secrets and a Cloud Run service account. It never
prints secret values and does not migrate or delete application data.

## AI provider

`AI_PROVIDER=gemini` uses `GEMINI_API_KEY`, stored in a platform secret.
`AI_PROVIDER=vertex` uses Application Default Credentials and requires
`GOOGLE_CLOUD_PROJECT`; attach a least-privilege Cloud Run service account.
Never mount a service-account JSON file or put a Gemini key in Android.

## Health events

The endpoint is `POST /api/webhooks/google-health`. It expects the original
JSON body plus `x-google-health-signature: sha256=<HMAC-SHA256>`, signed with
`GOOGLE_HEALTH_WEBHOOK_SECRET`. Event IDs are unique in PostgreSQL, making
delivery retries idempotent. The actual provider subscription, user consent
and user-to-subscription mapping are deployment-specific and must be completed
in Google Cloud before enabling it. Health Connect on Android remains local and
is not replaced by this endpoint.

## Calendar

Calendar has a separate client configuration. Availability mode requests only
the free/busy scope; write mode is an explicit opt-in and is intended for
app-created workout events. Set `CALENDAR_WRITER_WITHOUT_PRIVATE_ACCESS=true`
only after confirming the Google Workspace/domain capability applies to the
target deployment. Store refresh tokens encrypted at rest and never expose them
through the Android client.

## Secrets and verification

Use Secret Manager (or Render secrets during transition) for JWT, AI, webhook,
OAuth and database credentials. Use an approved OAuth consent screen with the
minimum scopes, and complete Google verification before a public rollout of
sensitive health scopes. Firebase App Check and Google ID-token validation
remain optional, independently configurable layers; App Check must be verified
server-side before it is treated as an authorization signal.
