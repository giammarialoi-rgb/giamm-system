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
