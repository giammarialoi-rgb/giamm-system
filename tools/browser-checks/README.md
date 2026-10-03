# Checks run in a real browser

These are not part of `npm run test:regression`: they need Chrome installed
and drive it through the DevTools protocol, with a throwaway profile.

- `appeval.mjs <script.js> [shot.png]` — opens the built app served by the
  preview (`node preview-webapp.mjs`, port 4173), runs the script's body as an
  async function inside the page and prints what it returns. `OFFLINE_API=1`
  makes every API call fail; `AFTER_RELOAD=a.js,b.js` reloads the page and
  runs each further script. A guest profile is emptied at every boot: to test
  what survives a reload, write a fake logged-in account first.
- `seal_server.mjs` + `seal_test.mjs` — the normal app and a coach's client
  link (`/c/<invite>`) opened in turn in the same browser: neither may change
  the other. Start the server, then run the test.

- `ui-audit/uiaudit.mjs <width> <height> <lang> <outdir> [views]` — every view of the athlete app in one
  headless Chrome, with a fixture program: DOM audit (text cut, escaping its box, words broken, tiny type,
  small tap targets) plus screenshots down each page. `ui-audit/agg.mjs <outdir>` summarises the issues.
- `ui-audit/coach/coachaudit.mjs <width> <height> <lang> <outdir> [screens]` — the coach area (Coach OS and
  the client workspace) with a fake coach account and a mock of every `/api/` call in the browser
  (`mock.js`), so nothing reaches the production database. `console-setup.js` does the same by hand
  in a normal browser console. Both need `node preview-webapp.mjs` running (port 4173) and a fresh
  `npm run build:web`.
