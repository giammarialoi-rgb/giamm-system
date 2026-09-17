// Nothing a client session writes may land on the shared identity object.
//
// store now carries two kinds of field. Domain fields (NURVAN_DOMAIN_FIELDS)
// are accessors onto whichever memory area is active, so writing one inside a
// client session reaches the client's copy. Everything else is a plain property
// on the single shared store - the coach's account, workspace, inbox, flags -
// and writing one of those inside a session reaches the coach.
//
// So the load-bearing invariant is: every field applyClientPayloadToLocal()
// assigns must be a domain field. A field that slips off that list does not
// fail loudly; it quietly writes a client's value into the coach's record,
// which is how a day and a half of the coach's food diary went missing under
// the previous design.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

const base = fs.readFileSync(path.resolve(root, process.argv[2] || 'web/index.base.html'), 'utf8');
const ui = fs.readFileSync(path.resolve(root, process.argv[3] || 'web/coach-practice-ui.js'), 'utf8');

const listStart = base.indexOf('var NURVAN_DOMAIN_FIELDS');
assert.ok(listStart !== -1, 'NURVAN_DOMAIN_FIELDS is not declared');
const domainFields = new Set(
  [...base.slice(listStart, base.indexOf('];', listStart)).matchAll(/'(\w+)'/g)].map(m => m[1])
);
ok(domainFields.size >= 20, `the domain list has ${domainFields.size} fields`);

// Identity fields that a client session legitimately sets: they describe the
// coach's session, not the client's data, and belong on the shared object.
const SESSION_FIELDS = new Set([
  'coachViewingClient', 'coachAssigning', 'coachSessionActive', 'coachWorkspace',
  'activeProgramId', '__cpClientViewProfile', '__cpTrainingCleared',
  '__cpNutritionDirty', '__cpKeepLocalNutrition', '__cpSupplementsDirty',
  '__cpKeepLocalSupplements', '__cpTherapyCleared', '__cpExamsCleared'
]);

{
  const at = ui.indexOf('function applyClientPayloadToLocal(payload)');
  assert.ok(at !== -1, 'applyClientPayloadToLocal not found');
  const body = ui.slice(at, ui.indexOf('\nfunction ', at + 20));
  const written = [...new Set([...body.matchAll(/\bstore\.(\w+)\s*=(?!=)/g)].map(m => m[1]))];
  ok(written.length >= 10, `applyClientPayloadToLocal writes ${written.length} distinct fields`);
  for (const field of written) {
    ok(domainFields.has(field) || SESSION_FIELDS.has(field),
      `"${field}" is a domain field, so the client's value cannot reach the coach's record`);
  }
  ok(body.includes('nurvanEnterClientArea()'),
    'and it switches to the client area before writing any of them');
}

// The sandbox reset has the same requirement in reverse: it must only ever
// clear domain fields, or it would clear them for the coach too.
{
  const at = ui.indexOf('function resetSandboxSessionState()');
  const body = ui.slice(at, ui.indexOf('\n}', at) + 2);
  const cleared = [...new Set([...body.matchAll(/\bstore\.(\w+)\s*=(?!=)/g)].map(m => m[1]))];
  ok(cleared.length >= 15, `resetSandboxSessionState clears ${cleared.length} fields`);
  for (const field of cleared) {
    ok(domainFields.has(field), `clearing "${field}" cannot reach the coach's copy`);
  }
}

// Persistence must read the coach's area explicitly, never whatever is active.
{
  ok(base.includes('Object.assign({}, sanitized, personalDomain())'),
    'persist overlays the personal area onto what it writes');
  ok(base.includes('const own = personalDomain();'),
    'the emergency quota path reads the personal area too');
  ok(!/const bak = window\.__cpAssignBackup \|\| window\.__cpCoachViewBackup;[\s\S]{0,200}activeProgramId: bak\./.test(base),
    'the old snapshot substitution is gone, not merely bypassed');
}

// A rebuilt store must get its accessors back, or its domain fields become
// plain properties again and both areas collapse into one.
{
  const rebuilds = [...base.matchAll(/^\s*store = (?!area\.)[^\n]*$/gm)].map(m => m[0].trim());
  ok(rebuilds.length >= 2, `found ${rebuilds.length} places that rebuild store`);
  for (const line of rebuilds) {
    const at = base.indexOf(line);
    const after = base.slice(at, at + 400);
    ok(after.includes('nurvanInstallDomainAccessors()'),
      `accessors are reinstalled after: ${line.slice(0, 60)}`);
  }
}

console.log('\nAll coach/personal isolation tests passed.');
