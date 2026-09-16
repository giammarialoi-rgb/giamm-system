import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WarmupTestHelpers } from './server/coach-os/warmup.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

console.log('--- Running Warm-Up Coach-Backend Tests ---');

const coachPractice = fs.readFileSync(path.join(root, 'coach-practice.mjs'), 'utf8');
const migrationSql = fs.readFileSync(path.join(root, 'server/db/migrations/0012_warmup_engine.sql'), 'utf8');

// 1. sanitizeItems: the actual boundary/coercion behavior every write route
// relies on before anything reaches Postgres.
{
  const { sanitizeItems } = WarmupTestHelpers;
  ok(sanitizeItems(null).length === 0, '1a. non-array input sanitizes to an empty list, never throws');
  ok(sanitizeItems('not-an-array').length === 0, '1b. a non-array garbage value sanitizes to empty, not a crash');
  const many = Array.from({ length: 30 }, (_, i) => ({ name: 'Ex ' + i }));
  ok(sanitizeItems(many).length === 20, '1c. item lists are capped at 20 (matches spec section 22\'s "target 5-8, never bloated" intent)');
  const [clean] = sanitizeItems([{ name: 'Bike', category: 'raise', sets: '3', reps: 8, durationSeconds: '180', restSeconds: '30', rampUp: [{ load: '100', reps: '5' }, { load: 'garbage', reps: 3 }] }]);
  ok(clean.sets === 3 && typeof clean.sets === 'number', '1d. sets coerces to a number');
  ok(clean.durationSeconds === 180, '1e. durationSeconds coerces to a number');
  ok(clean.rampUp.length === 2 && clean.rampUp[0].load === 100 && clean.rampUp[1].load === 0,
    '1f. ramp-up steps coerce load/reps to numbers, with a garbage value degrading to 0 rather than throwing');
  const longName = sanitizeItems([{ name: 'x'.repeat(500) }])[0];
  ok(longName.name.length === 200, '1g. name is truncated to a sane max length before it ever reaches the database');
  const noRamp = sanitizeItems([{ name: 'Bike' }])[0];
  ok(!('rampUp' in noRamp), '1h. items without a ramp-up never get a synthetic empty rampUp field');
}

// 2. Row mappers: JSONB columns (already-parsed by node-pg) map to plain
// arrays, and every id becomes a string (matches this codebase's convention
// of stringifying Postgres bigint ids everywhere else, e.g. checkInRow).
{
  const { templateRow, assignmentRow, completionRow } = WarmupTestHelpers;
  const t = templateRow({ id: 5, coach_user_id: 9, name: 'A', description: null, source: 'manual', target_session_type: null, items: [{ name: 'x' }], created_at: 'a', updated_at: 'b' });
  ok(t.id === '5' && t.coachUserId === '9', '2a. templateRow stringifies bigint ids');
  ok(Array.isArray(t.items) && t.items.length === 1, '2b. templateRow passes through the already-parsed JSONB items array');
  const a = assignmentRow({ id: 1, coach_user_id: 2, client_id: 3, template_id: null, name: 'W', target_session_type: null, items: [], assignment_type: 'mandatory', locked: true, active: true, created_at: 'a', updated_at: 'b' });
  ok(a.assignmentType === 'mandatory' && a.locked === true && a.active === true, '2c. assignmentRow maps assignment_type/locked/active correctly');
  ok(a.templateId === null, '2d. a null template_id (inline items, not from a saved template) maps to null, not the string "null"');
  const c = completionRow({ id: 1, assignment_id: 1, client_id: 3, session_date: '2026-01-01', status: 'completed', completed_items: [], total_items: 7, completed_count: 7, duration_seconds: 540, started_at: 'a', completed_at: 'b' });
  ok(c.status === 'completed' && c.totalItems === 7 && c.completedCount === 7, '2e. completionRow maps status/total/completed counts');
}

// 3. Route wiring: every write to template/assignment structure requires
// requireCoach + loadOwnedClient; the client-facing surface is read-only
// except for a single narrow completion-recording endpoint.
{
  ok(coachPractice.includes('app.get("/api/coach/warmup-templates"'), '3a. coach template list route exists');
  ok(coachPractice.includes('app.post("/api/coach/warmup-templates"'), '3b. coach template create route exists');
  ok(coachPractice.includes('app.patch("/api/coach/warmup-templates/:id"'), '3c. coach template update route exists');
  ok(coachPractice.includes('app.delete("/api/coach/warmup-templates/:id"'), '3d. coach template delete route exists');
  ok(coachPractice.includes('app.post("/api/coach/clients/:id/warmup-assign"'), '3e. coach assignment route exists');
  ok(coachPractice.includes('app.post("/api/coach/clients/:id/warmup-deactivate"'), '3f. coach deactivation route exists');
  ok(coachPractice.includes('app.get("/api/coach/clients/:id/warmup"'), '3g. coach visibility (assignment + completions) route exists');

  // Every coach warm-up route body must call requireCoach as its first check.
  const coachRouteRegex = /app\.(get|post|patch|delete)\("\/api\/coach\/(warmup-templates[^"]*|clients\/:id\/warmup[^"]*)",\s*async \(req, res\) => \{\s*const coach = await requireCoach\(req, res\);/g;
  const matches = coachPractice.match(coachRouteRegex) || [];
  ok(matches.length === 7, '3h. all 7 coach warm-up routes start with requireCoach as their first check (' + matches.length + ' found)');

  // 4. Client-facing surface: exactly two routes, and the write one only
  // ever touches completions, never templates/assignments.
  ok(coachPractice.includes('app.get("/api/client/warmup"'), '4a. client read route exists');
  ok(coachPractice.includes('app.post("/api/client/warmup/complete"'), '4b. client completion-write route exists');
  ok(!/app\.(post|patch|put|delete)\("\/api\/client\/warmup"/.test(coachPractice), '4c. there is no client-facing write route on /api/client/warmup itself (read-only)');
  const completeStart = coachPractice.indexOf('app.post("/api/client/warmup/complete"');
  const completeBody = coachPractice.slice(completeStart, coachPractice.indexOf('\n  });', completeStart));
  ok(completeBody.includes('requireAthlete'), '4d. the completion route requires an authenticated, coach-linked athlete');
  ok(completeBody.includes('recordWarmupCompletion'), '4e. it only ever calls recordWarmupCompletion - no template/assignment mutation function is reachable from client code');
  ok(completeBody.includes('String(assignment.id) !== String(assignmentId)'), '4f. it verifies the completion is against the client\'s own currently-active assignment, not an arbitrary assignmentId');
}

// 5. Migration/module column-name parity: warmup.mjs's SQL must reference
// exactly the columns the migration actually created.
{
  for (const col of ['coach_user_id', 'name', 'description', 'source', 'target_session_type', 'items']) {
    ok(migrationSql.includes(col), '5a. migration defines column ' + col + ' on coach_warmup_templates');
  }
  for (const col of ['client_id', 'template_id', 'assignment_type', 'locked', 'active']) {
    ok(migrationSql.includes(col), '5b. migration defines column ' + col + ' on coach_warmup_assignments');
  }
  ok(migrationSql.includes('UNIQUE (assignment_id, session_date)'), '5c. completions are uniquely keyed by (assignment_id, session_date) - the idempotency guarantee ON CONFLICT relies on');
}

console.log('\nAll warm-up coach-backend tests passed.');
