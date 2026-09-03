/**
 * NURVAN webapp preview — serve built SPA + optional public tunnel.
 * Usage:
 *   node preview-webapp.mjs              # local http://127.0.0.1:4173
 *   node preview-webapp.mjs --tunnel     # also prints a public URL (localtunnel)
 *   PREVIEW_PORT=4173 node preview-webapp.mjs --tunnel
 */
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

function lanIPv4() {
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const n of list || []) {
      if (n && n.family === 'IPv4' && !n.internal) return n.address;
    }
  }
  return null;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, 'web');
const PORT = Number(process.env.PREVIEW_PORT || 4173);
const WANT_TUNNEL = process.argv.includes('--tunnel') || process.env.PREVIEW_TUNNEL === '1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent((reqPath || '/').split('?')[0]);
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(root, cleaned);
  if (!full.startsWith(root)) return null;
  return full;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    ...headers
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    return send(res, 204, '', {
      'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
  }

  let filePath = safeJoin(ROOT, req.url === '/' ? '/index.html' : req.url);
  if (!filePath) return send(res, 403, 'Forbidden');

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    // SPA fallback
    const fallback = path.join(ROOT, 'index.html');
    if (fs.existsSync(fallback)) {
      filePath = fallback;
    } else {
      return send(res, 404, 'Not found — run: npm run build:web');
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 500, 'Read error');
    send(res, 200, data, { 'Content-Type': type });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const local = `http://127.0.0.1:${PORT}/`;
  const lanIp = lanIPv4();
  const lanHint = lanIp ? `http://${lanIp}:${PORT}/` : `http://<TUO-IP-LAN>:${PORT}/`;
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  NURVAN Web Preview');
  console.log('═══════════════════════════════════════════');
  console.log('  Locale:  ' + local);
  console.log('  LAN:     ' + lanHint + '  (stessa Wi‑Fi)');
  console.log('  Root:    ' + ROOT);
  if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
    console.log('  ⚠ index.html mancante — esegui: npm run build:web');
  }
  console.log('═══════════════════════════════════════════');
  console.log('');

  // Write a clickable shortcut HTML on Desktop for convenience
  try {
    const desktop = path.join(process.env.USERPROFILE || '', 'Desktop');
    const linkFile = path.join(desktop, 'NURVAN-Web-Preview.url');
    if (desktop && fs.existsSync(desktop)) {
      fs.writeFileSync(linkFile, `[InternetShortcut]\nURL=${local}\n`, 'utf8');
      console.log('  Collegamento Desktop: NURVAN-Web-Preview.url');
    }
  } catch (_) {}

  if (WANT_TUNNEL) {
    console.log('  Avvio tunnel pubblico (Cloudflare)…');
    const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    let lt;
    try {
      lt = spawn(
        npxBin,
        ['--yes', 'cloudflared', 'tunnel', '--url', 'http://127.0.0.1:' + String(PORT)],
        { stdio: ['ignore', 'pipe', 'pipe'], shell: true, windowsHide: true }
      );
    } catch (err) {
      console.error('  Tunnel spawn fallito:', err.message);
      console.log('  Preview locale resta su ' + local);
      return;
    }
    let published = false;
    const onChunk = (buf) => {
      const s = String(buf);
      // cloudflared is noisy; only surface URL lines
      if (/trycloudflare\.com|ERR_|error/i.test(s)) process.stdout.write(s);
      const m = s.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (m && !published) {
        published = true;
        const url = m[0];
        console.log('');
        console.log('  ★ LINK PUBBLICO (apri da qualsiasi browser / PC remoto):');
        console.log('    ' + url);
        console.log('');
        console.log('  iPhone (Safari, non Chrome):');
        console.log('    1. Apri il link  2. Condividi  3. Aggiungi a Home');
        console.log('');
        try {
          const desktop = path.join(process.env.USERPROFILE || '', 'Desktop');
          if (desktop && fs.existsSync(desktop)) {
            fs.writeFileSync(
              path.join(desktop, 'NURVAN-Web-Preview-PUBLIC.url'),
              `[InternetShortcut]\nURL=${url}\n`,
              'utf8'
            );
            console.log('  Collegamento Desktop: NURVAN-Web-Preview-PUBLIC.url');
          }
        } catch (_) {}
      }
    };
    lt.stdout.on('data', onChunk);
    lt.stderr.on('data', onChunk);
    lt.on('error', (err) => {
      console.error('  Tunnel error:', err.message);
      console.log('  Preview locale resta su ' + local);
    });
    lt.on('exit', (code) => {
      console.log('  Tunnel terminato (code ' + code + '). Preview locale resta attivo.');
    });
    process.on('SIGINT', () => {
      try { lt.kill(); } catch (_) {}
      process.exit(0);
    });
  } else {
    console.log('  Per un link remoto: npm run preview:public');
    console.log('');
  }
});
