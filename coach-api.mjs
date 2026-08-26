import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import XLSX from "xlsx";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = Number(process.env.PORT || 10000);
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const nullable = (type) => ({ anyOf: [{ type }, { type: "null" }] });

if (!process.env.GEMINI_API_KEY) {
  console.warn("WARNING: GEMINI_API_KEY is not configured.");
}
console.info(`GEMINI_API_KEY configured: ${Boolean(process.env.GEMINI_API_KEY)}`);
console.info(`MODEL = ${MODEL}`);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { apiVersion: "v1" }
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

app.use(express.json({ limit: "70mb" }));

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
                      sets: nullable("integer"),
                      reps: nullable("string"),
                      load: nullable("number"),
                      load_unit: nullable("string"),
                      percentage_1rm: nullable("number"),
                      rpe: nullable("number"),
                      rir: nullable("number"),
                      rest_seconds: nullable("integer"),
                      tempo: nullable("string"),
                      notes: nullable("string"),
                      progression_rule: nullable("string")
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

async function runStructuredInteraction(input, system_instruction) {
  const interaction = await ai.interactions.create({
    model: MODEL,
    input,
    ...(system_instruction ? { system_instruction } : {}),
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

function extractExcelText(buffer) {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, cellNF: true, cellFormula: true });
  } catch (error) {
    const invalid = new Error(`Unable to read Excel file: ${error?.message || "invalid workbook"}`);
    invalid.statusCode = 400;
    throw invalid;
  }

  if (!workbook.SheetNames.length) {
    const invalid = new Error("Excel workbook contains no worksheets.");
    invalid.statusCode = 400;
    throw invalid;
  }

  return workbook.SheetNames.map((sheetName, sheetIndex) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: true
    });
    const lines = rows.map((row, rowIndex) => {
      const values = Array.isArray(row) ? row.map((value) => value == null ? "" : String(value)) : [];
      return `RIGA ${rowIndex + 1}: ${values.join(" | ")}`;
    });
    return [`FOGLIO ${sheetIndex + 1}: ${sheetName}`, ...lines].join("\n");
  }).join(`\n\n`);
}

async function extractLegacyWordText(buffer) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "giammaria-doc-"));
  const filename = path.join(dir, "document.doc");
  try {
    await fs.writeFile(filename, buffer);
    const document = await new WordExtractor().extract(filename);
    return [document.getBody(), document.getHeaders(), document.getFootnotes()].filter(Boolean).join("\n\n");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function selectFileParser(filename, mime) {
  if (mime === "application/pdf" || filename.endsWith(".pdf")) return "gemini-document-base64";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || filename.endsWith(".docx")) return "mammoth-buffer";
  if (mime === "application/msword" || filename.endsWith(".doc")) return "word-extractor-buffer-via-tempfile";
  if (mime.startsWith("text/") || filename.endsWith(".txt")) return "utf8-buffer";
  if (mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || mime === "application/vnd.ms-excel" || filename.endsWith(".xlsx") || filename.endsWith(".xls")) return "xlsx-buffer";
  return "unsupported";
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "coach-api-gemini",
    model: MODEL,
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

app.get("/api/gemini-test", async (_req, res) => {
  try {
    const interaction = await ai.interactions.create({
      model: "gemini-3.1-flash-lite",
      input: "Rispondi semplicemente CIAO"
    });
    return res.json({ ok: true, reply: interaction.output_text });
  } catch (error) {
    console.error("Gemini test error:", {
      name: error?.name,
      message: error?.message,
      status: error?.status || error?.statusCode || error?.response?.status,
      details: error?.details,
      stack: error?.stack
    });
    return res.status(500).json({
      ok: false,
      name: error?.name,
      message: error?.message,
      status: error?.status || error?.statusCode || error?.response?.status
    });
  }
});

async function analyzeUploadedBuffer(originalname, mimetype, buffer) {
  const filename = String(originalname || "").toLowerCase();
  const mime = String(mimetype || "application/octet-stream").toLowerCase();
  if (!filename || !buffer?.length) {
    const error = new Error("filename, mime_type and non-empty data_base64 are required.");
    error.statusCode = 400;
    throw error;
  }
  const prompt = `${workoutInstruction}\n\nAnalizza il materiale seguente e crea la programmazione.`;
  let input;
  let systemInstruction;
  let parser = "unknown";
  if (mime === "application/pdf" || filename.endsWith(".pdf")) {
    parser = "gemini-document-base64";
    input = { type: "document", data: buffer.toString("base64"), mime_type: "application/pdf" };
    systemInstruction = prompt;
  } else if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || filename.endsWith(".docx")) {
    parser = "mammoth-buffer";
    const result = await mammoth.extractRawText({ buffer });
    input = `${prompt}\n\nDOCUMENTO WORD (${originalname}):\n${result.value}`;
  } else if (mime === "application/msword" || filename.endsWith(".doc")) {
    parser = "word-extractor-buffer-via-tempfile";
    const extracted = await extractLegacyWordText(buffer);
    if (!extracted.trim()) throw Object.assign(new Error("Legacy DOC contains no readable text."), { statusCode: 400 });
    input = `${prompt}\n\nDOCUMENTO WORD LEGACY (${originalname}):\n${extracted}`;
  } else if (mime.startsWith("text/") || filename.endsWith(".txt")) {
    parser = "utf8-buffer";
    input = `${prompt}\n\nDOCUMENTO TESTUALE (${originalname}):\n${buffer.toString("utf8")}`;
  } else if (mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || mime === "application/vnd.ms-excel" || filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
    parser = "xlsx-buffer";
    input = `${prompt}\n\nFOGLI EXCEL (${originalname}):\n${extractExcelText(buffer)}`;
  } else {
    const error = new Error("Unsupported file type. Use PDF, DOC, DOCX, TXT, XLSX or XLS.");
    error.statusCode = 415;
    throw error;
  }
  return { result: await runStructuredInteraction(input, systemInstruction), parser };
}

app.post("/api/analyze-file", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    const { filename, mime_type: mimeType, data_base64: dataBase64 } = req.body || {};
    if (typeof filename !== "string" || typeof mimeType !== "string" || typeof dataBase64 !== "string" || !dataBase64.trim()) {
      return res.status(400).json({ error: "filename, mime_type and data_base64 are required." });
    }
    const normalizedBase64 = dataBase64.replace(/^data:[^,]+,/, "").replace(/\s/g, "");
    if (!normalizedBase64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalizedBase64) || normalizedBase64.length % 4 === 1) {
      return res.status(400).json({ error: "Invalid base64 file data." });
    }
    const buffer = Buffer.from(normalizedBase64, "base64");
    if (!buffer.length || buffer.length > 50 * 1024 * 1024) return res.status(400).json({ error: "Invalid or oversized file data." });
    const normalizedFilename = filename.toLowerCase();
    const parser = selectFileParser(normalizedFilename, mimeType.toLowerCase());
    console.info("FILE_ANALYZE_START", { filename, mime: mimeType, byteLength: buffer.length, parser });
    try {
      const analyzed = await analyzeUploadedBuffer(filename, mimeType, buffer);
      console.info("FILE_ANALYZE_END", { filename, parser: analyzed.parser });
      return res.json(analyzed.result);
    } catch (error) {
      console.error("FILE_ANALYZE_ERROR", {
        filename,
        mime: mimeType,
        byteLength: buffer.length,
        error: { name: error?.name, message: error?.message, stack: error?.stack }
      });
      throw error;
    }
  } catch (error) {
    console.error("Analyze-file error:", { name: error?.name, message: error?.message, status: error?.status || error?.statusCode, stack: error?.stack });
    return res.status(error?.statusCode || 500).json({ error: error?.statusCode === 415 ? error.message : "Document analysis failed." });
  }
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

    const prompt = `${workoutInstruction}\n\nAnalizza il materiale seguente e crea la programmazione.`;
    let input;
    let systemInstruction;

    if (req.file) {
      const filename = req.file.originalname.toLowerCase();
      const mime = req.file.mimetype || "application/octet-stream";

      if (mime === "application/pdf" || filename.endsWith(".pdf")) {
        input = {
          type: "document",
          data: req.file.buffer.toString("base64"),
          mime_type: "application/pdf"
        };
        systemInstruction = prompt;
      } else if (
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        filename.endsWith(".docx")
      ) {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        input = `${prompt}\n\nDOCUMENTO WORD (${req.file.originalname}):\n${result.value}`;
      } else if (mime === "application/msword" || filename.endsWith(".doc")) {
        const extracted = await extractLegacyWordText(req.file.buffer);
        if (!extracted.trim()) throw Object.assign(new Error("Legacy DOC contains no readable text."), { statusCode: 400 });
        input = `${prompt}\n\nDOCUMENTO WORD LEGACY (${req.file.originalname}):\n${extracted}`;
      } else if (
        mime.startsWith("text/") ||
        filename.endsWith(".txt")
      ) {
        input = `${prompt}\n\nDOCUMENTO TESTUALE (${req.file.originalname}):\n${req.file.buffer.toString("utf8")}`;
      } else if (
        mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        mime === "application/vnd.ms-excel" ||
        filename.endsWith(".xlsx") ||
        filename.endsWith(".xls")
      ) {
        input = `${prompt}\n\nFOGLI EXCEL (${req.file.originalname}):\n${extractExcelText(req.file.buffer, req.file.originalname)}`;
      } else {
        return res.status(415).json({
          error: "Unsupported file type. Use PDF, DOC, DOCX, TXT, XLSX or XLS."
        });
      }
    } else {
      input = `${prompt}\n\nTESTO FORNITO DALL'UTENTE:\n${text}`;
    }

    const result = await runStructuredInteraction(input, systemInstruction);
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
    return res.status(error?.statusCode || 500).json({
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

    const historyText = history.slice(-12)
      .filter((item) => item && typeof item.content === "string")
      .map((item) => `${item.role === "assistant" ? "ASSISTANT" : "USER"}: ${item.content}`)
      .join("\n");
    const input = `${system}\n\nCONTESTO PROGRAMMA:\n${JSON.stringify(context)}\n\nCRONOLOGIA:\n${historyText}\n\nUSER: ${message}`;
    const interaction = await ai.interactions.create({
      model: MODEL,
      input
    });

    return res.json({
      reply: interaction.output_text,
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
