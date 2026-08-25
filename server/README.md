# Giammaria Coach API

This server keeps `GEMINI_API_KEY` outside the Android APK. It uses the
`@google/genai` Gemini Interactions API, sends PDF documents as inline
Base64 documents, extracts DOCX text server-side, and returns a strict
workout-plan JSON using `weeks[].sessions[].exercises[]`.

Run it on Node 20+ with an HTTPS reverse proxy:

```sh
GEMINI_API_KEY=... GEMINI_MODEL=gemini-3.1-flash-lite npm start
```

The health check is available at `GET /health`. After changing this server,
redeploy it before using the Android APK; the APK calls the configured public
HTTPS endpoint and does not contain the Gemini key.

The analysis endpoint accepts `POST /analyze` or `POST /api/analyze` with a
multipart field named `file` (PDF, DOCX or TXT), or a `text` field. The
coach endpoint accepts `POST /coach`, `POST /api/coach` or `POST /api/chat`.

Build the Android app with the public HTTPS address only:

```sh
./gradlew assembleDebug -PcoachApiUrl=https://coach.example.com
```

Never put `GEMINI_API_KEY` in `gradle.properties`, the assets, or the APK. Gemini's free tier has usage limits and Google states that free-tier content may be used to improve its products. See the [Gemini pricing page](https://ai.google.dev/gemini-api/docs/pricing) and [structured-output documentation](https://ai.google.dev/gemini-api/docs/structured-output).
