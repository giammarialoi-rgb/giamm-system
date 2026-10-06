// The coach's brand (name + logo as the clients' web app shows it) and the coach's books (expenses, profit, who owes).
import sharp from 'sharp';
import { cleanBrandName, pngFromDataUrl, brandPublic, ICON_SIZES } from './server/coach-os/branding.mjs';
import { financeReport, EXPENSE_CATEGORIES } from './server/coach-os/business.mjs';

let failed = 0;
const ok = (m, v) => { if (v) console.log('OK   ' + m); else { failed++; console.log('FAIL ' + m); } };
const png = async (size) => 'data:image/png;base64,' + (await sharp({ create: { width: size, height: size, channels: 4, background: '#c0392b' } }).png().toBuffer()).toString('base64');

ok('1a. the name is one line, without markup, at most 40 characters', cleanBrandName('  <b>Fitness</b>\n  Gym X  ') === 'b Fitness /b Gym X'.replace('b Fitness /b', 'b Fitness /b') || !/[<>\n]/.test(cleanBrandName('  <b>Fitness</b>\n  Gym X  ')));
ok('1b. a long name is cut', cleanBrandName('x'.repeat(100)).length === 40);
ok('1c. the sizes of the icon are the ones a Home screen needs', ICON_SIZES.join() === '512,192,180');
ok('2a. a PNG of the right size is accepted', !!pngFromDataUrl(await png(192), 192));
ok('2b. a PNG of another size is refused', pngFromDataUrl(await png(180), 192) === null);
ok('2c. something that is not a PNG is refused', pngFromDataUrl('data:image/png;base64,AAAA', 192) === null && pngFromDataUrl('data:image/jpeg;base64,/9j/', 192) === null && pngFromDataUrl('', 192) === null);
ok('2d. nothing to show without name and logo', brandPublic({ brand_name: '', icon_512: null, updated_at: new Date() }) === null);
ok('2e. a name alone is a brand', brandPublic({ brand_name: 'Gym', icon_512: null, updated_at: new Date() }).hasLogo === false);

const now = Date.parse('2026-10-15T12:00:00Z');
const events = [
  { kind: 'paid', amountCents: 10000, hasAmount: true, occurredAt: '2026-10-05T10:00:00Z' },
  { kind: 'paid', amountCents: 5000, hasAmount: true, occurredAt: '2026-09-10T10:00:00Z' },
  { kind: 'paid', amountCents: 0, hasAmount: false, occurredAt: '2026-10-06T10:00:00Z' }
];
const expenses = [
  { amountCents: 3000, category: 'rent', occurredAt: '2026-10-02T10:00:00Z' },
  { amountCents: 1000, category: 'software', occurredAt: '2026-09-02T10:00:00Z' },
  { amountCents: 500, category: 'rent', occurredAt: '2025-12-02T10:00:00Z' }
];
const f = financeReport(events, expenses, now);
ok('3a. income of the year counts payments with a figure only', f.yearIncomeCents === 15000);
ok('3b. expenses of the year leave out the previous year', f.yearExpenseCents === 4000 && f.allExpenseCents === 4500);
ok('3c. profit = income - expenses (year and month)', f.yearNetCents === 11000 && f.monthNetCents === 7000);
ok('3d. month by month, newest first', f.byMonth[0].month === '2026-10' && f.byMonth[0].netCents === 7000);
ok('3e. expenses by category (this year)', f.byCategory[0].category === 'rent' && f.byCategory[0].cents === 3000);
ok('3f. the categories are the ones the form offers', EXPENSE_CATEGORIES.includes('rent') && EXPENSE_CATEGORIES.includes('other') && EXPENSE_CATEGORIES.length === 8);

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nMarchio del coach e gestionale: tutto in regola.');
