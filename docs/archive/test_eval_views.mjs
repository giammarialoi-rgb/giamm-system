import fs from 'fs';
import vm from 'vm';

const code = fs.readFileSync('prepare_task20_views_and_handlers.js', 'utf8');
const ctx = vm.createContext({
  DATA: { weeks: [], duration_weeks: 4 },
  store: { customSets: {}, data: {}, models: [] },
  esc: (s) => s,
  safeDisplayValue: (s, f) => s || f,
  $: () => ({ style: {}, value: '' }),
  document: { createElement: () => ({ setAttribute: () => {}, click: () => {} }), body: { appendChild: () => {}, removeChild: () => {} } },
  window: {},
  showToast: () => {},
  getExerciseSetCount: () => 3,
  persist: () => {},
  render: () => {},
  currentWeek: 1,
  currentDay: 0,
  PricingService: { getPlans: () => [] },
  EntitlementService: { getPlan: () => 'FREE' },
  I18nService: { t: (k) => k, setLanguage: () => {} }
});
vm.runInContext(code, ctx);
console.log('✅ prepare_task20_views_and_handlers.js evaluated without error!');
console.log('renderPrograms:', typeof ctx.renderPrograms);
console.log('renderNutrition:', typeof ctx.renderNutrition);
console.log('renderImport:', typeof ctx.renderImport);
console.log('renderPricing:', typeof ctx.renderPricing);
