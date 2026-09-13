import fs from 'fs';

let content = fs.readFileSync('prepare_task20_js_services.mjs', 'utf8');

const target1 = `  getPlan() {
    if (this.trialActive && this.trialEnd && Date.now() < this.trialEnd) {
      return "silver"; // Trial unlocks Silver Pro features
    }
    return this.currentPlan;
  },`;

const target2 = `  getPlan() {
    if (this.trialActive && this.trialEnd && Date.now() < this.trialEnd) return "silver";
    return this.currentPlan;
  },`;

const replacement = `  getPlan() {
    if (typeof store !== 'undefined' && store && store.accountPlan) {
      const plan = store.accountPlan.toLowerCase();
      if (plan !== 'free') return plan;
      if (store.accountTrialStart) {
        const trialStart = parseInt(store.accountTrialStart, 10);
        if (Date.now() - trialStart < 14 * 24 * 60 * 60 * 1000) {
          return "silver";
        }
        return "free";
      }
    }
    if (this.trialActive && this.trialEnd && Date.now() < this.trialEnd) return "silver";
    return this.currentPlan;
  },`;

content = content.replace(target1, replacement);
content = content.replace(target2, replacement);

fs.writeFileSync('prepare_task20_js_services.mjs', content, 'utf8');
console.log('Replaced both getPlan implementations!');
