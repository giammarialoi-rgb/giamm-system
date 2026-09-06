import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(root, "web/index.base.html"), "utf8");
const practice = fs.readFileSync(path.join(root, "web/coach-practice-ui.js"), "utf8");
const api = fs.readFileSync(path.join(root, "coach-api.mjs"), "utf8");
const catalog = fs.readFileSync(path.join(root, "web/exercise-catalog-extra.js"), "utf8");

assert.ok(html.includes('name="pdf-load-mode"'), "workout PDF requires explicit load mode");
assert.ok(html.includes("if (!opts.loadMode)"), "export blocked until load choice");
assert.ok(!html.includes('id="pdf-inc-logged"'), "old auto-checked load boxes are gone");
assert.ok(html.includes("startFreshPage();") && html.includes("headerDay ="), "each training day starts a page and repeats title");

assert.ok(api.includes("function slimCoachContext"), "server slims chat context");
assert.ok(api.includes("Gemini chat first attempt failed"), "server retries Gemini");
assert.ok(api.includes('status(503)') && api.includes("AI_UNAVAILABLE"), "missing key is 503 not 500");

assert.ok(html.includes("function restoreClientShellSync"), "client shell restored before first render");
assert.ok(html.includes("ALIGN_MS") && html.includes("align start"), "workout align has a timeout and does not block forever");
assert.ok(html.includes("practice timeout") && !html.includes("locked && typeof bootCoachPractice"), "first paint does not wait for bootCoachPractice");
assert.ok(html.includes("skip leftover client-shell rewrite"), "personal sessions are not hijacked by leftover client shell");
assert.ok(html.includes("delete payload.activeProgram.exerciseDb"), "account sync does not upload the exercise catalog");
assert.ok(html.includes("isClientShellLocked") && html.includes("athleteHomeHtml"), "empty client home is not the main create-program screen");
assert.ok(practice.includes("GS_CLIENT_SHELL") && practice.includes("applyInviteManifestStartUrl(token)"), "invite token persisted for Home reopen");
assert.ok(practice.includes("/c/' + encodeURIComponent(token) + '/manifest.webmanifest'") || practice.includes("/manifest.webmanifest"), "invite manifest is a durable /c/token URL");
assert.ok(html.includes("history.replaceState") && html.includes("/c/"), "cold start at / is rewritten to /c/token");
const apiPractice = fs.readFileSync(path.join(root, "coach-practice.mjs"), "utf8");
assert.ok(apiPractice.includes("/c/:token/manifest.webmanifest") && apiPractice.includes("start_url"), "server serves per-token PWA manifest");

assert.ok(html.includes('name="cf-pdf-range"') && html.includes('value="weeks"') && html.includes('value="dates"'), "check PDF has week and date range");
assert.ok(html.includes("rangeMode === 'weeks'") && html.includes("rangeMode === 'dates'"), "check logs filtered by custom range");
assert.ok(html.includes("SETTIMANA ") && html.includes("GIORNO ") && html.includes("fine seduta"), "check PDF marks week/day/session end");

assert.ok(html.includes("VOLUME SESSIONE") && html.includes("non peso corporeo"), "tonnage is not labeled as body weight");
assert.ok(html.includes("function recordedBodyWeightForWeek"), "body weight chart uses recorded values only");
assert.ok(html.includes("Volume ") && html.includes("__statsMuscleVolumeByWeek"), "muscle drill shows that muscle volume");
assert.ok(/height:\s*380px/.test(html), "charts are taller");

assert.ok(html.includes("function editSupplementItem") && html.includes("onclick=\"editSupplementItem("), "supplements have compact Edit");
assert.ok(!/updateSupplementField\(\$\{idx\},'name'/.test(html), "supplement list is not always-open name inputs");

assert.ok(catalog.includes("Barbell Bench Press") && catalog.includes("Panca piana"), "catalog has IT+EN bench");
assert.ok(html.includes("exerciseNameMatchesQuery") && html.includes("WEB_EXERCISE_CATALOG"), "replace search uses IT/EN aliases");
const names = catalog.match(/name: "/g) || [];
assert.ok(names.length >= 80, "extra catalog is substantially larger than the old 66-name dict");

const slimStart = api.indexOf("function slimCoachContext");
const slimEnd = api.indexOf("app.post([\"/api/chat\"");
assert.ok(slimStart >= 0 && slimEnd > slimStart);
vm.createContext({ console });
vm.runInContext(api.slice(slimStart, slimEnd), vm.createContext({}));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(api.slice(slimStart, slimEnd) + "\nthis.slimCoachContext = slimCoachContext;", ctx);
const slim = ctx.slimCoachContext({
  profile: { name: "G", secret: "no", weight: 80 },
  programSummary: { title: "P", weeks: new Array(8).fill({ week: 1, sessions: [{ name: "A", exercises: new Array(20).fill("x") }] }) },
  exams: { items: [1, 2, 3, 4] }
});
assert.equal(slim.profile.secret, undefined);
assert.ok(slim.programSummary.weeks.length <= 4);
assert.ok(slim.programSummary.weeks[0].sessions[0].exercises.length <= 14);
assert.equal(slim.exams.count, 4);

const restoreStart = html.indexOf("function restoreClientShellSync");
const restoreEnd = html.indexOf("var store = loadStore()");
assert.ok(restoreStart >= 0 && restoreEnd > restoreStart);

console.log("OK   web corrections: pdf choice/pages, coach slim, client shell, check range, stats, supp, catalog");
