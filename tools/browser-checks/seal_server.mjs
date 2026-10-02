// The built app on a local port, with client links served the way the real
// server serves them (the page with the invite token written into it, and the
// two cookies). No API: every /api call fails, as offline.
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'web');
const app = express();
app.get('/c/:token', (req, res, next) => {
  const tok = String(req.params.token || '');
  if (/\.(png|jpe?g|gif|webp|svg|ico|js|css|json|map|webmanifest|html|txt|woff2?)$/i.test(tok)) return next();
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  html = html.replace(/<head[^>]*>/i, (open) => open + '\n<script>window.__NURVAN_CLIENT_BOOT=' + JSON.stringify({ token: tok, mode: 'client' }) + ';</script><base href="/">');
  res.cookie('nurvan_client_ctx', tok, { path: '/', maxAge: 31536000000, sameSite: 'lax' });
  res.cookie('nurvan_app_mode', 'client', { path: '/', maxAge: 31536000000, sameSite: 'lax' });
  res.type('html').send(html);
});
app.use('/api', (req, res) => res.status(503).json({ error: 'offline test' }));
app.use(express.static(ROOT));
app.listen(4181, '127.0.0.1', () => console.log('http://127.0.0.1:4181'));
