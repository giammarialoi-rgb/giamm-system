import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import mammoth from "mammoth";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = Number(process.env.PORT || 10000);
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

if (!process.env.GEMINI_API_KEY) {
  console.warn("WARNING: GEMINI_API_KEY is not configured.");
}
console.info(`GEMINI_API_KEY configured: ${Boolean(process.env.GEMINI_API_KEY)}`);
console.info(`MODEL = ${MODEL}`);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { apiVersion: "v1alpha" }
});

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS origin not allowed"));
  }
}));

app.use(express.json({ limit: "2mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

const workoutSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    source_summary: { type: "string" },
    assumptions: { type: "array", items: { type: "string" } },
    global_rules: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
    weeks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          week: { type: "integer" },
          label: { type: "string" },
          sessions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "string" },
                title: { type: "string" },
                exercises: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      order: { type: "integer" },
                      sets: { type: ["integer", "null"] },
                      reps: { type: ["string", "null"] },
                      load: { type: ["number", "null"] },
                      load_unit: { type: ["string", "null"] },
                      percentage_1rm: { type: ["number", "null"] },
                      rpe: { type: ["number", "null"] },
                      rir: { type: ["number", "null"] },
                      rest_seconds: { type: ["integer", "null"] },
                      tempo: { type: ["string", "null"] },
                      notes: { type: ["string", "null"] },
                      progression_rule: { type: ["string", "null"] }
                    },
                    required: [
                      "name",
                      "order",
                      "sets",
                      "reps",
                      "load",
                      "load_unit",
                      "percentage_1rm",
                      "rpe",
                      "rir",
                      "rest_seconds",
                      "tempo",
                      "notes",
                      "progression_rule"
                    ]
                  }
                }
              },
              required: ["day", "title", "exercises"]
            }
          }
        },
        required: ["week", "label", "sessions"]
      }
    }
  },
  required: [
    "title",
    "source_summary",
    "assumptions",
    "global_rules",
    "warnings",
    "weeks"
  ]
};

const workoutInstruction = `
Sei il motore di importazione di una app professionale per programmazione dell'allenamento.

Il tuo compito è leggere una scheda, un PDF, un documento Word o testo contenente un allenamento o indicazioni per costruirlo e trasformarlo in una struttura JSON precisa.

REGOLE FONDAMENTALI:
1. Non inventare esercizi, serie, ripetizioni, carichi, RPE, RIR, recuperi o progressioni che non siano supportati dal documento.
2. Conserva fedelmente l'intento del programma.
3. Se un dato manca, usa null.
4. Se un'informazione è ambigua, inseriscila in warnings o assumptions invece di indovinare.
5. Interpreta abbreviazioni comuni solo quando il significato è chiaro dal contesto.
6. Mantieni l'ordine degli esercizi.
7. Se il documento contiene settimane, giorni o sessioni, mantieni la periodizzazione.
8. Le regole di progressione devono essere riportate come progression_rule, senza trasformarle arbitrariamente in numeri.
9. I recuperi vanno convertiti in secondi quando possibile.
10. Non aggiungere consigli medici o diagnosi.
11. Rispondi esclusivamente con JSON conforme allo schema.
`;

function extractTextFromOutput(interaction) {
  return typeof interaction?.output_text === "string"
    ? interaction.output_text
    : "";
}

async function runStructuredInteraction(input) {
  const interaction = await ai.interactions.create({
    model: MODEL,
    input,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: workoutSchema
    }
  });

  const text = extractTextFromOutput(interaction);
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Gemini returned invalid JSON.");
  }
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "coach-api-gemini",
    model: MODEL,
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured on the server."
      });
    }

    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";

    if (!req.file && !text) {
      return res.status(400).json({
        error: "Provide a file field named 'file' or a non-empty 'text' field."
      });
    }

    const input = [
      {
        type: "text",
        text: `${workoutInstruction}\n\nAnalizza il materiale seguente e crea la programmazione.`
      }
    ];

    if (req.file) {
      const mime = req.file.mimetype || "application/octet-stream";

      if (mime === "application/pdf") {
        input.push({
          type: "document",
          data: req.file.buffer.toString("base64"),
          mime_type: "application/pdf"
        });
      } else if (
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        req.file.originalname.toLowerCase().endsWith(".docx")
      ) {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        input.push({
          type: "text",
          text: `DOCUMENTO WORD (${req.file.originalname}):\n${result.value}`
        });
      } else if (
        mime.startsWith("text/") ||
        req.file.originalname.toLowerCase().endsWith(".txt")
      ) {
        input.push({
          type: "text",
          text: `DOCUMENTO TESTUALE (${req.file.originalname}):\n${req.file.buffer.toString("utf8")}`
        });
      } else {
        return res.status(415).json({
          error: "Unsupported file type. Use PDF, DOCX or TXT."
        });
      }
    } else {
      input.push({
        type: "text",
        text: `TESTO FORNITO DALL'UTENTE:\n${text}`
      });
    }

    const result = await runStructuredInteraction(input);
    return res.json(result);
  } catch (error) {
    console.error("Analyze error:", {
      name: error?.name,
      message: error?.message,
      status: error?.status || error?.statusCode || error?.response?.status,
      response: error?.response,
      details: error?.details,
      stack: error?.stack
    });
    return res.status(500).json({
      error: "Document analysis failed.",
      ...(process.env.NODE_ENV === "development" ? {
        gemini: {
          name: error?.name,
          message: error?.message,
          status: error?.status || error?.statusCode || error?.response?.status,
          details: error?.details
        }
      } : {})
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured on the server."
      });
    }

    const message = typeof req.body?.message === "string"
      ? req.body.message.trim()
      : "";

    if (!message) {
      return res.status(400).json({ error: "message is required." });
    }

    const context = req.body?.context ?? {};
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    const system = `
Sei Coach AI dentro un'app di allenamento.
Rispondi in modo pratico e preciso.
Usa il contesto della programmazione quando presente.
Non modificare arbitrariamente una programmazione: se proponi una modifica, spiegala chiaramente.
Non dare diagnosi mediche.
`;

    const input = [
      { type: "text", text: system },
      {
        type: "text",
        text: `CONTESTO PROGRAMMA:\n${JSON.stringify(context)}`
      }
    ];

    for (const item of history.slice(-12)) {
      if (!item || typeof item.content !== "string") continue;
      const role = item.role === "assistant" ? "assistant" : "user";
      input.push({
        type: "text",
        text: `${role.toUpperCase()}: ${item.content}`
      });
    }

    input.push({
      type: "text",
      text: `USER: ${message}`
    });

    const interaction = await ai.interactions.create({
      model: MODEL,
      input
    });

    return res.json({
      reply: extractTextFromOutput(interaction),
      model: MODEL
    });
  } catch (error) {
    console.error("Chat error:", {
      name: error?.name,
      message: error?.message,
      status: error?.status || error?.statusCode || error?.response?.status,
      response: error?.response,
      details: error?.details,
      stack: error?.stack
    });
    return res.status(500).json({
      error: "Coach request failed.",
      ...(process.env.NODE_ENV === "development" ? {
        gemini: {
          name: error?.name,
          message: error?.message,
          status: error?.status || error?.statusCode || error?.response?.status,
          details: error?.details
        }
      } : {})
    });
  }
});

app.use((error, _req, res, _next) => {
  if (error?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large. Maximum 50 MB." });
  }
  if (error?.message === "CORS origin not allowed") {
    return res.status(403).json({ error: error.message });
  }
  console.error("Unhandled error:", error);
  return res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Coach API listening on port ${PORT}`);
  console.log(`Model: ${MODEL}`);
});
