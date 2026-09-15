import assert from 'node:assert/strict';
import { mergeAccountDataBlobs, domainHasContent, mergeDomainField } from './server/account/index.mjs';

function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

// Server-side root cause of a real data-loss incident: mergeAccountDataBlobs
// used to do a plain shallow `{...cur, ...inc}` spread for nutrition,
// supplementation, therapy and exams (only activeProgram's own weeks were
// protected). Any client upload that happened to carry a stale/empty
// snapshot of one of these - e.g. a sync that fired for an unrelated
// training change before DATA.nutrition had loaded, or a race between tabs -
// silently and PERMANENTLY overwrote the real logged data on the server, so
// even a perfectly-behaved client (dirty flags, local IndexedDB sync, all
// already fixed) would still lose data the next time it pulled from the
// cloud. Reproduces a real report: a dinner logged one evening was gone the
// next morning.
console.log('--- Running Account Data Merge Tests ---');

// 1. An incoming empty/missing nutrition must never wipe a richer existing one
{
  const cur = { nutrition: { present: true, days: [{ day: 'Lunedì', meals: [{ name: 'Cena', foods: [{ name: 'Pasta', kcal: 400 }] }] }] } };
  const inc = { nutrition: null };
  const merged = mergeAccountDataBlobs(cur, inc);
  ok(merged.nutrition.days.length === 1 && merged.nutrition.days[0].meals[0].foods.length === 1,
    '1a. null incoming nutrition does not wipe the existing logged dinner');
}
{
  const cur = { nutrition: { present: true, days: [{ day: 'Lunedì', meals: [{ name: 'Cena', foods: [{ name: 'Pasta', kcal: 400 }] }] }] } };
  const inc = { nutrition: { present: true, days: [] } }; // truthy but empty - the dangerous stale-snapshot case
  const merged = mergeAccountDataBlobs(cur, inc);
  ok(merged.nutrition.days.length === 1, '1b. truthy-but-empty incoming nutrition (a stale in-RAM snapshot) does not wipe existing days');
}

// 2. A genuine update (incoming has more/different content) must still win
{
  const cur = { nutrition: { present: true, days: [{ day: 'Lunedì', meals: [{ name: 'Cena', foods: [{ name: 'Pasta', kcal: 400 }] }] }] } };
  const inc = { nutrition: { present: true, days: [{ day: 'Lunedì', meals: [{ name: 'Cena', foods: [{ name: 'Pasta', kcal: 400 }, { name: 'Insalata', kcal: 60 }] }] }] } };
  const merged = mergeAccountDataBlobs(cur, inc);
  ok(merged.nutrition.days[0].meals[0].foods.length === 2, '2. a real update with more content replaces the older snapshot');
}

// 3. An explicit clear ("azzera alimentazione") must still be allowed through
{
  const cur = { nutrition: { present: true, days: [{ day: 'Lunedì', meals: [{ name: 'Cena', foods: [{ name: 'Pasta', kcal: 400 }] }] }] } };
  const inc = { nutrition: { cleared: true, isCleared: true, present: false, days: [] } };
  const merged = mergeAccountDataBlobs(cur, inc);
  ok(merged.nutrition.cleared === true && merged.nutrition.days.length === 0, '3. an explicit cleared/isCleared marker is allowed to empty the domain');
}

// 4. Same protection for supplementation, therapy, exams
{
  const cur = {
    supplementation: { items: [{ name: 'Creatina' }] },
    therapy: { medications: [{ name: 'Farmaco X' }] },
    exams: { records: [{ parameter: 'Glicemia', value: 90 }] }
  };
  const inc = { supplementation: null, therapy: {}, exams: { records: [] } };
  const merged = mergeAccountDataBlobs(cur, inc);
  ok(merged.supplementation.items.length === 1, '4a. supplementation is protected the same way as nutrition');
  ok(merged.therapy.medications.length === 1, '4b. therapy is protected the same way as nutrition');
  ok(merged.exams.records.length === 1, '4c. exams is protected the same way as nutrition');
}

// 5. The same protection applies to the domains nested inside activeProgram,
// since the client bundles them there too (accountPayload's includeProgram path)
{
  const cur = {
    activeProgram: { id: 'p1', weeks: [{ week: 1 }, { week: 2 }], nutrition: { present: true, days: [{ day: 'Lunedì', meals: [{ name: 'Cena', foods: [{ name: 'Pasta' }] }] }] } }
  };
  const inc = {
    activeProgram: { id: 'p1', weeks: [{ week: 1 }, { week: 2 }], nutrition: null }
  };
  const merged = mergeAccountDataBlobs(cur, inc);
  ok(merged.activeProgram.nutrition.days.length === 1, '5. nutrition nested inside activeProgram is protected too');
}

// 6. Unrelated top-level fields (logs, data, activeProgram weeks) keep working as before
{
  const cur = { logs: [{ id: 'l1', at: '2026-01-01' }], activeProgram: { weeks: [{ week: 1 }, { week: 2 }] } };
  const inc = { logs: [{ id: 'l2', at: '2026-01-02' }], activeProgram: null };
  const merged = mergeAccountDataBlobs(cur, inc);
  ok(merged.logs.length === 2, '6a. logs still union by id as before');
  ok(merged.activeProgram.weeks.length === 2, '6b. a null incoming activeProgram still keeps the richer existing one');
}

// 7. Pure helper sanity checks
ok(domainHasContent({ days: [{ day: 'Lunedì' }] }) === true, '7a. domainHasContent recognizes a populated nutrition shape');
ok(domainHasContent({ days: [] }) === false, '7b. domainHasContent treats an empty array as no content');
ok(domainHasContent(null) === false, '7c. domainHasContent treats null as no content');
ok(mergeDomainField({ x: { days: [1] } }, { x: { cleared: true } }, 'x').cleared === true, '7d. mergeDomainField honors an explicit cleared marker even with no cur content check needed');

// 8. The user's personal "my foods" library (customFoods) must survive on its
// own, even for a nutrition blob that otherwise has zero days - e.g. after
// clearing the week's plan but keeping the foods typed by hand for reuse.
{
  ok(domainHasContent({ days: [], customFoods: [{ name: 'Formaggio Modditzosu' }] }) === true,
    '8a. domainHasContent recognizes a nutrition shape that only has customFoods');
  const cur = { nutrition: { present: true, days: [], customFoods: [{ name: 'Formaggio Modditzosu', kcalPer100: 350 }] } };
  const inc = { nutrition: { present: true, days: [] } }; // stale snapshot with no customFoods at all
  const merged = mergeAccountDataBlobs(cur, inc);
  ok(merged.nutrition.customFoods.length === 1, '8b. a stale incoming snapshot does not wipe the custom foods library');
}

console.log('\nAll account data merge tests passed.');
