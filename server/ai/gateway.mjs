import { GoogleGenAI } from "@google/genai";
import { GoogleAuth } from "google-auth-library";

/**
 * Server-side AI boundary. Clients never choose a provider, project or model.
 * The returned adapter deliberately mirrors the small @google/genai surface
 * used by the existing Coach so callers do not become provider-aware.
 */
export function createAiGateway(env = process.env) {
  const provider = String(env.AI_PROVIDER || "gemini").trim().toLowerCase();
  const model = String(env.AI_MODEL || env.GEMINI_MODEL || "gemini-2.5-flash").trim();
  if (provider === "vertex") return createVertexGateway(env, model);
  if (provider !== "gemini") throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
  const apiKey = String(env.GEMINI_API_KEY || "").trim();
  if (!apiKey) throw Object.assign(new Error("GEMINI_API_KEY is not configured on the server."), { statusCode: 503 });
  const client = new GoogleGenAI({ apiKey });
  return {
    provider, model, configured: true,
    models: { generateContent: (request) => client.models.generateContent(request) }
  };
}

function createVertexGateway(env, configuredModel) {
  const project = String(env.GOOGLE_CLOUD_PROJECT || "").trim();
  const location = String(env.VERTEX_AI_LOCATION || "us-central1").trim();
  if (!project) throw Object.assign(new Error("GOOGLE_CLOUD_PROJECT is required when AI_PROVIDER=vertex."), { statusCode: 503 });
  // ADC is intentionally used: Cloud Run service identity / local gcloud ADC.
  // No JSON service-account credential is read from an environment variable.
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  return {
    provider: "vertex", model: configuredModel, configured: true,
    models: {
      async generateContent({ model = configuredModel, contents, config = {} }) {
        const client = await auth.getClient();
        const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
        const response = await client.request({
          url: endpoint,
          method: "POST",
          data: {
            contents,
            generationConfig: config,
          }
        });
        const data = response.data || {};
        const text = (data.candidates || []).flatMap((candidate) => candidate.content?.parts || [])
          .map((part) => part.text || "").join("");
        return { ...data, text };
      }
    }
  };
}

export function aiPublicStatus(env = process.env) {
  const provider = String(env.AI_PROVIDER || "gemini").trim().toLowerCase();
  return {
    provider,
    model: String(env.AI_MODEL || env.GEMINI_MODEL || "gemini-2.5-flash").trim(),
    configured: provider === "vertex"
      ? Boolean(env.GOOGLE_CLOUD_PROJECT)
      : Boolean(env.GEMINI_API_KEY)
  };
}
