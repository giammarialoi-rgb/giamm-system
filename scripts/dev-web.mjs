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

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
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
