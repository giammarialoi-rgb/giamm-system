#!/usr/bin/env node
// Amministrazione dei piani, da riga di comando.
//
//   node tools/plan_admin.mjs list [testo]
//   node tools/plan_admin.mjs history <id|email>
//   node tools/plan_admin.mjs set <id|email> <free|standard|coach|coach_pro>
//        [--seats N|unlimited] [--until AAAA-MM-GG] [--source manual|stripe|play]
//        [--note "testo"]
//
// Parla con le route /api/admin/* del server, con l'intestazione X-Admin-Token.
// Servono due variabili d'ambiente:
//   NURVAN_ADMIN_TOKEN  lo stesso valore impostato sul server (almeno 24 caratteri)
//   NURVAN_API          l'indirizzo del server (default: produzione)
// Nessuna dipendenza: solo fetch di Node.

const API = String(process.env.NURVAN_API || 'https://coach-api-gemini.onrender.com').replace(/\/+$/, '');
const TOKEN = String(process.env.NURVAN_ADMIN_TOKEN || '');

function usage(msg) {
  if (msg) console.error(msg + '\n');
  console.error('Uso:\n  node tools/plan_admin.mjs list [testo]\n  node tools/plan_admin.mjs history <id|email>\n  node tools/plan_admin.mjs set <id|email> <piano> [--seats N|unlimited] [--until AAAA-MM-GG] [--source manual|stripe|play] [--note "testo"]');
  process.exit(2);
}

async function call(method, route, body) {
  const res = await fetch(API + route, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': TOKEN },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  if (!res.ok) throw new Error((json && json.error) || ('HTTP ' + res.status));
  return json;
}

async function resolveId(who) {
  if (/^\d+$/.test(who)) return who;
  const out = await call('GET', '/api/admin/accounts?q=' + encodeURIComponent(who));
  const exact = (out.accounts || []).filter((a) => String(a.email).toLowerCase() === String(who).toLowerCase());
  if (exact.length !== 1) throw new Error('Account non trovato in modo univoco: ' + who);
  return exact[0].id;
}

function flags(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const m = String(args[i]).match(/^--(seats|until|source|note)$/);
    if (!m) usage('Opzione sconosciuta: ' + args[i]);
    if (i + 1 >= args.length) usage('Manca il valore di ' + args[i]);
    out[m[1]] = args[++i];
  }
  return out;
}

function row(a) {
  const seats = a.seatsEffective == null ? 'illimitati' : a.seatsEffective;
  return [a.id, a.email, a.plan + (a.effectivePlan !== a.plan ? ' -> ' + a.effectivePlan : ''), a.planSource, a.planUntil ? a.planUntil.slice(0, 10) : '-',
    a.status, (a.isCoach ? 'coach ' + a.athletes + '/' + seats : '-'), a.trialUsedAt ? 'trial usato' : ''].join('  |  ');
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd) usage();
  if (TOKEN.length < 24) usage('Imposta NURVAN_ADMIN_TOKEN (almeno 24 caratteri, lo stesso del server).');
  if (cmd === 'list') {
    const out = await call('GET', '/api/admin/accounts?limit=500&q=' + encodeURIComponent(rest.join(' ')));
    console.log('id  |  email  |  piano  |  origine  |  scadenza  |  stato  |  atleti/posti  |  trial');
    (out.accounts || []).forEach((a) => console.log(row(a)));
    return;
  }
  if (cmd === 'history') {
    if (!rest[0]) usage();
    const id = await resolveId(rest[0]);
    const out = await call('GET', '/api/admin/accounts/' + id + '/history');
    (out.history || []).forEach((h) => console.log([String(h.changed_at).slice(0, 16), (h.from_plan || '-') + ' -> ' + h.to_plan, h.source, h.plan_until ? String(h.plan_until).slice(0, 10) : '-', h.seats == null ? '' : 'posti ' + h.seats, h.actor || '', h.note || ''].join('  |  ')));
    return;
  }
  if (cmd === 'set') {
    if (rest.length < 2) usage();
    const id = await resolveId(rest[0]);
    const opts = flags(rest.slice(2));
    const out = await call('POST', '/api/admin/accounts/' + id + '/plan', { plan: rest[1], seats: opts.seats, until: opts.until, source: opts.source, note: opts.note });
    const e = out.entitlement || {};
    console.log('Fatto: account ' + id + ' -> ' + out.account.plan + (e.effective ? ' (vale ' + e.effective.plan + ', ' + e.effective.status + ')' : ''));
    return;
  }
  usage('Comando sconosciuto: ' + cmd);
}

main().catch((err) => {
  console.error('Errore: ' + (err && err.message ? err.message : err));
  process.exit(1);
});
