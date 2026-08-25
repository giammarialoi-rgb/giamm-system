# Coach API — Gemini

Backend HTTPS per l'app di allenamento.

## Cosa fa

- `GET /health` — verifica che il backend sia online.
- `POST /api/analyze` — riceve PDF, DOCX, TXT o testo e lo trasforma in una programmazione strutturata JSON.
- `POST /api/chat` — coach conversazionale Gemini.
- La `GEMINI_API_KEY` resta esclusivamente lato server.

Il backend usa la Gemini Interactions API. `gemini-3.1-flash-lite` supporta PDF e structured outputs.

## 1. Configurazione locale

Requisiti:
- Node.js 20+
- una Gemini API key

Copia `.env.example` in `.env` e inserisci la chiave:

```text
GEMINI_API_KEY=LA_TUA_CHIAVE
```

Non fare commit del file `.env`.

Poi:

```bash
npm install
npm start
```

Health check:

```text
http://localhost:10000/health
```

## 2. Deploy su Render

1. Carica questa cartella in un repository GitHub.
2. In Render: New → Web Service.
3. Seleziona il repository.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Aggiungi in Environment:
   - `GEMINI_API_KEY` = la tua chiave Gemini
   - `GEMINI_MODEL` = `gemini-3.1-flash-lite`
   - `CORS_ORIGINS` = lascia vuoto per il primo test oppure inserisci gli origin autorizzati
7. Deploy.

Render fornirà un URL HTTPS del tipo:

```text
https://coach-api-gemini-xxxx.onrender.com
```

Usa quell'URL nell'app Android.

## 3. Test rapido

### Health

```bash
curl https://TUO-DOMINIO.onrender.com/health
```

### PDF

```bash
curl -X POST https://TUO-DOMINIO.onrender.com/api/analyze \
  -F "file=@scheda.pdf"
```

### Testo

```bash
curl -X POST https://TUO-DOMINIO.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"Panca piana 4x6 RPE 8, recupero 180 secondi"}'
```

### Chat

```bash
curl -X POST https://TUO-DOMINIO.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Come devo eseguire la panca piana?","context":{"user":"atleta"}}'
```

## Output di /api/analyze

Il risultato è JSON e contiene:

- `title`
- `source_summary`
- `assumptions`
- `weeks`
- `global_rules`
- `warnings`

Ogni esercizio può contenere:

- nome
- serie
- ripetizioni
- carico
- percentuale
- RPE
- RIR
- recupero
- tempo
- note
- regole di progressione

Il backend non inventa dati mancanti: li lascia null/assunzioni e segnala le ambiguità in `warnings`.

## Sicurezza

NON mettere mai `GEMINI_API_KEY`:
- nell'APK;
- nel frontend;
- in GitHub;
- in README;
- in `.env.example`.

La chiave va solo nelle Environment Variables/Secrets del server.

## Nota

Per PDF Gemini può ricevere direttamente i byte del documento. Per DOCX questo backend estrae il testo con Mammoth e poi lo invia a Gemini.
