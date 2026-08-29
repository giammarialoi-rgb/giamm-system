import fs from 'fs';

let content = fs.readFileSync('prepare_task20_js_services.mjs', 'utf8');

// Patch 1: getPlan in export const EntitlementService
content = content.replace(
`  getPlan() {
    if (this.trialActive && this.trialEnd && Date.now() < this.trialEnd) {
      return "silver"; // Trial unlocks Silver Pro features
    }
    return this.currentPlan;
  },`,
`  getPlan() {
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
    if (this.trialActive && this.trialEnd && Date.now() < this.trialEnd) {
      return "silver";
    }
    return this.currentPlan;
  },`
);

// Patch 2: isTrialActive in export const EntitlementService
content = content.replace(
`  isTrialActive() {
    return Boolean(this.trialActive && this.trialEnd && Date.now() < this.trialEnd);
  },`,
`  isTrialActive() {
    if (typeof store !== 'undefined' && store && store.accountTrialStart) {
      const trialStart = parseInt(store.accountTrialStart, 10);
      return Date.now() - trialStart < 14 * 24 * 60 * 60 * 1000;
    }
    return Boolean(this.trialActive && this.trialEnd && Date.now() < this.trialEnd);
  },`
);

// Patch 3: AdsService in export const AdsService
content = content.replace(
`export const AdsService = {
  shouldShowAd(placement) {
    let activePlan = EntitlementService.getPlan();
    if (typeof store !== 'undefined' && store && store.accountPlan) {
      const storePlan = store.accountPlan.toLowerCase();
      if (storePlan === 'free') {
        const trialStart = store.accountTrialStart ? parseInt(store.accountTrialStart, 10) : 0;\n        const isTrialActive = trialStart && (Date.now() - trialStart < 14 * 24 * 60 * 60 * 1000);
        if (!isTrialActive) activePlan = 'free';
      } else {
        activePlan = storePlan;
      }
    }
    if (activePlan !== 'free') return false;
    if (EntitlementService.hasFeature("ads_free")) return false;
    // Zero-Ad Protected Critical Zones
    const protectedPlacements = [
      "workout",
      "workout_logger",
      "logger",
      "rest_timer",
      "timer",
      "therapy",
      "medical",
      "import",
      "universal_import"
    ];
    if (protectedPlacements.includes(placement)) return false;
    return true; // Dashboard or passive screens only
  }
};`,
`export const AdsService = {
  shouldShowAd(placement) {
    const activePlan = EntitlementService.getPlan();
    if (activePlan !== 'free') return false;
    const protectedPlacements = [
      "workout",
      "workout_logger",
      "logger",
      "rest_timer",
      "timer",
      "therapy",
      "medical",
      "import",
      "universal_import"
    ];
    if (protectedPlacements.includes(placement)) return false;
    return true;
  }
};`
);

// Patch 4: getPlan in JS_PRODUCT_SERVICES template string
content = content.replace(
`  getPlan() {
    if (this.trialActive && this.trialEnd && Date.now() < this.trialEnd) return "silver";
    return this.currentPlan;
  },`,
`  getPlan() {
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
  },`
);

// Patch 5: isTrialActive in JS_PRODUCT_SERVICES template string
content = content.replace(
`  isTrialActive() {
    return Boolean(this.trialActive && this.trialEnd && Date.now() < this.trialEnd);
  },`,
`  isTrialActive() {
    if (typeof store !== 'undefined' && store && store.accountTrialStart) {
      const trialStart = parseInt(store.accountTrialStart, 10);
      return Date.now() - trialStart < 14 * 24 * 60 * 60 * 1000;
    }
    return Boolean(this.trialActive && this.trialEnd && Date.now() < this.trialEnd);
  },`
);

// Patch 6: AdsService in JS_PRODUCT_SERVICES template string
content = content.replace(
`const AdsService = {
  shouldShowAd(placement) {
    let activePlan = EntitlementService.getPlan();
    if (typeof store !== 'undefined' && store && store.accountPlan) {
      const storePlan = store.accountPlan.toLowerCase();
      if (storePlan === 'free') {
        const trialStart = store.accountTrialStart ? parseInt(store.accountTrialStart, 10) : 0;
        const isTrialActive = trialStart && (Date.now() - trialStart < 14 * 24 * 60 * 60 * 1000);
        if (!isTrialActive) activePlan = 'free';
      } else {
        activePlan = storePlan;
      }
    }
    if (activePlan !== 'free') return false;
    if (EntitlementService.hasFeature("ads_free")) return false;
    const protectedPlacements = ["workout", "workout_logger", "logger", "rest_timer", "timer", "therapy", "medical", "import", "universal_import"];
    if (protectedPlacements.includes(placement)) return false;
    return true;
  }
};`,
`const AdsService = {
  shouldShowAd(placement) {
    const activePlan = EntitlementService.getPlan();
    if (activePlan !== 'free') return false;
    const protectedPlacements = ["workout", "workout_logger", "logger", "rest_timer", "timer", "therapy", "medical", "import", "universal_import"];
    if (protectedPlacements.includes(placement)) return false;
    return true;
  }
};`
);

fs.writeFileSync('prepare_task20_js_services.mjs', content, 'utf8');
console.log('Service patch applied.');
