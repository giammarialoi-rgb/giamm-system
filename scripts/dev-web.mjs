// Lightweight static server for local development of the web UI in web/.
//
// In production the UI is bundled inside the Android app, which supplies the
// backend URL through the WebView `NativeConfig` bridge. In a plain browser
// that bridge does not exist, so this dev server injects a `window.NativeConfig`
// shim that points the UI at the local Coach API. It is a development-only
// helper and is not used by the deployed backend.
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const WEB_DIR = path.resolve(process.cwd(), "web");
const PORT = Number(process.env.WEB_PORT || 8080);
const COACH_API_URL = process.env.WEB_COACH_API_URL || "http://localhost:10000";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const nativeConfigShim = `<script>window.NativeConfig={getCoachApiUrl:function(){return ${JSON.stringify(
  COACH_API_URL
)};}};</script>`;

// Development-only fixture: the UI loads a starter program from `data.json`
// when the user has no active program yet. That file ships with the packaged
// app rather than the repo, so we synthesize a small sample program here to
// give designers/agents real content to look at in a plain browser.
function sampleProgram() {
  const template = [
    {
      title: "Giorno 1 — Spinta",
      exercises: [
        { name: "Panca piana", sets: 4, reps: "6", load: 80, rpe: 8, rest_seconds: 180, notes: "Controlla la fase eccentrica." },
        { name: "Military press", sets: 3, reps: "8", load: 40, rpe: 8, rest_seconds: 120 },
        { name: "Dip alle parallele", sets: 3, reps: "10", rpe: 9, rest_seconds: 90 }
      ]
    },
    {
      title: "Giorno 2 — Tirata",
      exercises: [
        { name: "Stacco da terra", sets: 4, reps: "5", load: 120, rpe: 8, rest_seconds: 180 },
        { name: "Trazioni", sets: 4, reps: "8", rpe: 9, rest_seconds: 120 },
        { name: "Rematore bilanciere", sets: 3, reps: "10", load: 60, rpe: 8, rest_seconds: 90 }
      ]
    },
    {
      title: "Giorno 3 — Gambe",
      exercises: [
        { name: "Squat", sets: 5, reps: "5", load: 100, rpe: 8, rest_seconds: 210 },
        { name: "Affondi con manubri", sets: 3, reps: "12", load: 20, rpe: 8, rest_seconds: 90 },
        { name: "Calf raise", sets: 4, reps: "15", rpe: 9, rest_seconds: 60 }
      ]
    }
  ];
  const weeks = Array.from({ length: 4 }, (_, wi) => ({
    weekNumber: wi + 1,
    sessions: template.map((session) => ({
      title: session.title,
      exercises: session.exercises.map((ex) => ({
        ...ex,
        load: ex.load != null ? Math.round(ex.load * (1 + wi * 0.025) * 2) / 2 : ex.load
      }))
    }))
  }));
  return {
    id: "demo_program",
    title: "Programma Forza Base (Demo)",
    source_summary: "Programma dimostrativo servito dall'ambiente di sviluppo locale.",
    assumptions: ["Carichi iniziali di esempio, da adattare all'atleta."],
    global_rules: ["Aumenta il carico del 2.5% quando completi tutte le ripetizioni al RPE target."],
    warnings: [],
    weeks
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/data.json") {
      let payload;
      try {
        payload = await readFile(path.join(WEB_DIR, "data.json"));
      } catch {
        payload = Buffer.from(JSON.stringify(sampleProgram()), "utf8");
      }
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      res.end(payload);
      return;
    }
    const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
    const filePath = path.join(WEB_DIR, rel);
    if (!filePath.startsWith(WEB_DIR)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    let body = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".html") {
      body = Buffer.from(
        body.toString("utf8").replace(/<head>/i, `<head>${nativeConfigShim}`),
        "utf8"
      );
    }
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(body);
  } catch (err) {
    res.writeHead(err.code === "ENOENT" ? 404 : 500).end(
      err.code === "ENOENT" ? "Not found" : "Server error"
    );
  }
});

server.listen(PORT, () => {
  console.log(`Web UI dev server on http://localhost:${PORT} -> Coach API ${COACH_API_URL}`);
});
