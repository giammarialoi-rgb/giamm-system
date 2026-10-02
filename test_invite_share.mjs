// Sharing a client's invite (link and credentials) closed the app on iPhone:
// the phone's share sheet and a system alert were asked for in the same
// breath, and a web view that cannot show its alert is terminated. The
// invite is now shown in the page, and the share sheet opens alone, from a tap.
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const ui = fs.readFileSync('web/coach-practice-ui.js', 'utf8').replace(/\r\n/g, '\n');
const cut = (a, b) => { const i = ui.indexOf(a); const j = ui.indexOf(b, i); if (i < 0 || j < 0) throw new Error('block not found: ' + a); return ui.slice(i, j); };
const fn = (name) => cut('async function ' + name + '(', '\n}\n');

// Sending the invite again first asks about the password (confirmResendInvite shows the sheet).
const callers = ['confirmResendInvite', 'rotateClientInvite', 'resetClientPassword'];
ok('1a. copia link, rigenera link e nuova password mostrano l’invito nella pagina', callers.every((n) => /showInviteSheet\(/.test(fn(n))));
ok('1b. e non aprono più da soli né la condivisione né un avviso di sistema', callers.every((n) => !/copyOrShare\(|navigator\.share|alert\(/.test(fn(n))));
const create = cut("const msg = formatInviteShareText({", "if (currentView === 'coachHub') loadCoachClientList();");
ok('1c. lo stesso alla creazione di un cliente', /showInviteSheet\([^;]*'Invito pronto', msg/.test(create) && !/alert\(|copyOrShare\(/.test(create));
ok('1d. in tutta l’area coach nessun avviso di sistema accanto a una condivisione', !/copyOrShare\([^)]*\);\s*(?:practiceToast\([^)]*\);\s*)?try \{ alert\(/.test(ui) && !/navigator\.share\([\s\S]{0,200}alert\(/.test(ui));

function world(withShare) {
  const calls = { share: [], alert: 0, copied: [], toasts: [] };
  const made = [];
  const c = {
    console, String, Promise,
    window: {}, esc: (s) => String(s).replace(/</g, '&lt;'),
    practiceToast: (m) => calls.toasts.push(m),
    alert: () => { calls.alert++; },
    navigator: Object.assign({ clipboard: { writeText: (t) => { calls.copied.push(t); return Promise.resolve(); } } }, withShare ? { share: (p) => { calls.share.push(p); return Promise.resolve(); } } : {}),
    document: {
      body: { appendChild: (el) => made.push(el) },
      createElement: () => ({ style: {}, innerHTML: '', remove() {} }),
      getElementById: (id) => made.find((e) => e.id === id) || null
    }
  };
  vm.createContext(c);
  vm.runInContext(cut('function showInviteSheet(title, text, note) {', 'window.showInviteSheet = showInviteSheet;') + '\nthis.api = { show: showInviteSheet, share: shareInviteSheet, copy: copyInviteSheet };', c);
  return { c, calls, made };
}
{
  const { c, calls, made } = world(true);
  c.api.show('Invito univoco pronto', 'Link: https://app.nurvan.app/c/abc\nUtente: mario\nPassword: <1234>', 'nota');
  ok('2a. aprire l’invito non apre nulla del telefono: né condivisione né avviso', calls.share.length === 0 && calls.alert === 0 && made.length === 1);
  ok('2b. il testo è nella pagina, selezionabile, con CONDIVIDI, COPIA e CHIUDI', /Utente: mario/.test(made[0].innerHTML) && /&lt;1234>/.test(made[0].innerHTML) && /shareInviteSheet\(\)/.test(made[0].innerHTML) && /copyInviteSheet\(\)/.test(made[0].innerHTML) && /CHIUDI/.test(made[0].innerHTML) && /user-select:text/.test(made[0].innerHTML));
  c.api.share();
  ok('2c. CONDIVIDI apre la condivisione, da sola, con link e credenziali', calls.share.length === 1 && /Password: <1234>/.test(calls.share[0].text) && calls.alert === 0);
  c.api.copy();
  await new Promise((r) => setTimeout(r, 0));
  ok('2d. COPIA mette tutto negli appunti e lo dice', calls.copied.length === 1 && /Utente: mario/.test(calls.copied[0]) && calls.toasts.includes('Copiato') && calls.alert === 0);
}
{
  const { c, calls, made } = world(false);
  c.api.show('Invito', 'testo');
  ok('3. dove la condivisione non esiste resta solo COPIA', !/shareInviteSheet\(\)/.test(made[0].innerHTML) && /copyInviteSheet\(\)/.test(made[0].innerHTML) && (c.api.share(), calls.copied.length === 1));
}

console.log('');
if (failed) { console.log(failed + ' controlli della condivisione invito falliti.'); process.exit(1); }
console.log('Tutti i controlli della condivisione invito passano.');
