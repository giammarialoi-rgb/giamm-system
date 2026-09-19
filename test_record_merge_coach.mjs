// Runs web/domain-merge.js and the server's real coach/athlete write paths
// (server/account + coach-practice) and asserts what the athlete's record ends
// up holding.
//
// Guards the same loss as test_nutrition_merge.mjs, for every record domain and
// for athletes: each copy of a domain used to replace the others whole - the
// coach's edit, an approved change, a finished workout's write - so a stale one
// silently took whatever the athlete had recorded since.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeAccountDataBlobs, landDomainValue, updateAccountData } from './server/account/index.mjs';
import { mergeAssignClientData, applyAthleteEditedDomains } from './coach-practice.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const sandbox = {};
sandbox.self = sandbox;
vm.runInNewContext(fs.readFileSync(path.join(root, 'web/domain-merge.js'), 'utf8'), sandbox);
const D = sandbox.NurvanDomainMerge;

function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}
const clone = (v) => JSON.parse(JSON.stringify(v));

// A device's copy of one domain plus the snapshot persist() keeps.
function device(domain, value) {
  const v = clone(value);
  return {
    v, snap: D.stamp(v, null, 1, domain),
    save(now) { this.snap = D.stamp(this.v, this.snap, now, domain); },
    copy() { return { v: clone(this.v), snap: this.snap, save: this.save, copy: this.copy }; }
  };
}
const itemNames = (v, list) => ((v && v[list]) || []).map((x) => x.name);
const foods = (n, d = 0, m = 0) => (((n.days[d] || {}).meals || [])[m] || { foods: [] }).foods.map((f) => f.name);

// --- supplementation, therapy, exams merge like nutrition ------------------
{
  const phone = device('supplementation', { protocol_name: 'Base', items: [{ name: 'Creatina', dose: '5g' }, { name: 'Omega 3', dose: '2 cps' }] });
  const stale = clone(phone.v);
  phone.v.items.push({ name: 'Vitamina D', dose: '1000 UI' });
  phone.v.items.splice(1, 1); // Omega 3 removed
  phone.save(1000);
  const merged = D.merge(phone.v, stale, 'supplementation');
  ok(itemNames(merged, 'items').join() === 'Creatina,Vitamina D', 'supplements: an added item survives a stale copy and a removed one stays removed');
}
{
  const phone = device('therapy', { medications: [{ name: 'Eutirox', dose: '50' }], entries: [] });
  const other = phone.copy();
  phone.v.entries.push({ name: 'Eutirox', at: '2026-09-19T07:00' }); phone.save(2000);
  other.v.medications.push({ name: 'Vitamina B12' }); other.save(2100);
  const merged = D.merge(phone.v, other.v, 'therapy');
  ok(merged.entries.length === 1 && itemNames(merged, 'medications').join() === 'Eutirox,Vitamina B12', 'therapy: an intake logged on one device and a medication added on another are both kept');
}
{
  const phone = device('exams', { records: [{ name: 'Emocromo', date: '2026-09-01' }], reminders: ['vecchio promemoria'] });
  ok(Array.isArray(phone.v.reminders) && phone.v.reminders[0] === 'vecchio promemoria' && !phone.v.reminders[0].id,
    'exams: a list of plain values is kept as it is, not taken apart into items');
  const stale = clone(phone.v);
  phone.v.records.push({ name: 'Glicemia', date: '2026-09-15' }); phone.save(3000);
  ok(itemNames(D.merge(phone.v, stale, 'exams'), 'records').join() === 'Emocromo,Glicemia', 'exams: a result added survives a stale copy');
}

// --- a coach's edit lands without erasing what the athlete logged meanwhile ---
{
  const athletePlan = { plan_name: 'Piano', days: [{ day: 'Lunedì', meals: [{ name: 'Pranzo', foods: [{ name: 'Riso', quantity: 80, unit: 'g' }, { name: 'Tonno', quantity: 1, unit: 'pz' }] }] }] };
  const athlete = device('nutrition', athletePlan);
  // the coach opens the client (the copy the coach app holds)...
  const coach = athlete.copy();
  // ...meanwhile the athlete logs a food, which reaches the server
  athlete.v.days[0].meals[0].foods.push({ name: 'Mela', quantity: 1, unit: 'pz' });
  athlete.save(4000);
  const server0 = { nutrition: clone(athlete.v) };
  // the coach removes Tonno and changes Riso
  coach.v.days[0].meals[0].foods.splice(1, 1);
  coach.v.days[0].meals[0].foods[0].quantity = 100;
  coach.save(4100);
  const landed = landDomainValue(server0.nutrition, coach.v, 'nutrition', 'edit');
  ok(foods(landed).join() === 'Riso,Mela', 'coach edit: the athlete\'s food logged while the coach was editing stays, the one the coach removed goes');
  ok(landed.days[0].meals[0].foods[0].quantity === 100, 'coach edit: the coach\'s change applies');
  // the athlete's phone, still holding its own copy, syncs and must agree
  const onPhone = D.merge(athlete.v, landed, 'nutrition');
  ok(foods(onPhone).join() === 'Riso,Mela', 'coach edit: the athlete\'s phone ends with the same plan, Tonno does not come back from it');
}

// --- a newly assigned plan replaces the old one, also on the athlete's phone ---
{
  const athlete = device('nutrition', { plan_name: 'Vecchio', days: [{ day: 'Lunedì', meals: [{ name: 'Colazione', foods: [{ name: 'Biscotti', quantity: 3, unit: 'pz' }] }] }] });
  const current = { nutrition: clone(athlete.v), activeProgram: { weeks: [{}], nutrition: clone(athlete.v) } };
  const newPlan = { plan_name: 'Nuovo', days: [{ day: 'Lunedì', meals: [{ name: 'Colazione', foods: [{ name: 'Avena', quantity: 60, unit: 'g' }] }] }] };
  const merged = mergeAssignClientData(current, { nutrition: newPlan, activeProgram: { nutrition: newPlan } }, ['nutrition']);
  ok(foods(merged.nutrition).join() === 'Avena' && merged.nutrition.plan_name === 'Nuovo', 'assign: the record holds the new plan');
  ok(foods(merged.activeProgram.nutrition).join() === 'Avena', 'assign: and so does the copy inside the program');
  const onPhone = D.merge(athlete.v, merged.nutrition, 'nutrition');
  ok(foods(onPhone).join() === 'Avena' && onPhone.plan_name === 'Nuovo',
    'assign: syncing the athlete\'s phone, which still has the old plan, does not bring the old foods back');
  // a food the athlete logged on the phone that the server never saw is not lost
  athlete.v.days[0].meals[0].foods.push({ name: 'Caffè', quantity: 1, unit: 'pz' }); athlete.save(5000);
  const later = D.merge(athlete.v, merged.nutrition, 'nutrition');
  ok(foods(later).includes('Caffè') && !foods(later).includes('Biscotti'), 'assign: a food logged offline before the assignment arrived is still kept');
}

// --- an athlete's change (approved, or made freely) lands the same way -----
{
  const athlete = device('supplementation', { items: [{ name: 'Creatina' }] });
  const proposal = athlete.copy();
  proposal.v.items.push({ name: 'Magnesio' }); proposal.save(6000);
  const current = { supplementation: clone(athlete.v) };
  current.supplementation.items.push({ id: 'coach1', updatedAt: 6100, name: 'Zinco' }); // the coach added one meanwhile
  const merged = applyAthleteEditedDomains(current, { supplementation: proposal.v }, { assignedByCoach: true });
  ok(itemNames(merged.supplementation, 'items').sort().join() === 'Creatina,Magnesio,Zinco',
    'athlete change: the change applies and the coach\'s addition made meanwhile is kept');
  ok(merged.assignedByCoach === true, 'athlete change: the extra fields are set');
}

// --- clearing a section clears it on every device ---------------------------
{
  const athlete = device('therapy', { medications: [{ name: 'Eutirox' }] });
  const cleared = landDomainValue(clone(athlete.v), { present: false, medications: [], cleared: true }, 'therapy', 'clear');
  ok(cleared.medications.length === 0, 'clear: the section is empty');
  ok(D.merge(athlete.v, cleared, 'therapy').medications.length === 0, 'clear: the athlete\'s phone does not refill it');
}

// --- sync from the athlete's phone merges all four domains ------------------
{
  const exams = device('exams', { records: [{ name: 'Emocromo' }] });
  const stale = clone(exams.v);
  exams.v.records.push({ name: 'Ferritina' }); exams.save(7000);
  let cloud = mergeAccountDataBlobs({}, { exams: exams.v });
  cloud = mergeAccountDataBlobs(cloud, { exams: stale });
  ok(itemNames(cloud.exams, 'records').join() === 'Emocromo,Ferritina', 'sync: a stale device no longer erases an exam result');
}

// --- every write to an athlete's record is one locked step ------------------
{
  const log = [];
  let row = { v: 1 };
  const pool = {
    async connect() {
      return {
        async query(sql, params) {
          log.push(sql.split(/\s+/).slice(0, 3).join(' '));
          if (/^SELECT data/.test(sql)) { ok(/FOR UPDATE/.test(sql), 'the record is read with a row lock'); return { rows: [{ data: row }] }; }
          if (/^UPDATE app_account_data/.test(sql)) { row = JSON.parse(params[1]); }
          return { rows: [] };
        },
        release() { log.push('release'); }
      };
    }
  };
  const out = await updateAccountData(pool, 7, (current) => ({ ...current, v: current.v + 1 }));
  ok(out.v === 2 && row.v === 2, 'the rebuilt record is written');
  ok(log[0] === 'BEGIN' && log.includes('COMMIT') && log[log.length - 1] === 'release', 'inside one transaction, and the connection is released');
  await assert.rejects(updateAccountData(pool, 7, () => { throw new Error('boom'); }));
  ok(log.includes('ROLLBACK') && log[log.length - 1] === 'release', 'a failure rolls back and still releases');
  const src = fs.readFileSync(path.join(root, 'coach-practice.mjs'), 'utf8');
  const unlocked = src.split('\n').filter((l) => /ON CONFLICT \(user_id\) DO UPDATE SET data = (EXCLUDED\.data|app_account_data\.data \|\| EXCLUDED\.data)/.test(l));
  ok(unlocked.length === 1, 'coach-practice rewrites a whole record outside updateAccountData only when creating a new athlete (' + unlocked.length + ')');
}

console.log('\nAll record merge tests (coach and athlete) passed.');
