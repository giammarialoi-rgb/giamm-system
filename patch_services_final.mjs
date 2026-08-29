import fs from 'fs';

let content = fs.readFileSync('prepare_task20_js_services.mjs', 'utf8');
content = content.replace(/\r\n/g, '\n');

const startMarker = "const EntitlementService = {\n  plans: {";
const startIdx = content.lastIndexOf(startMarker);
if (startIdx === -1) throw new Error("Could not find EntitlementService in template");

const endMarker = "const BackupService = {";
const endIdx = content.indexOf(endMarker, startIdx);
if (endIdx === -1) throw new Error("Could not find BackupService in template");

const replacement = `const EntitlementService = {
  plans: {
    free: { id: "free", name: "Free Tier", priceMonthly: 0, priceLifetime: 0, features: ["basic_training", "basic_stats", "local_storage"] },
    bronze: { id: "bronze", name: "Bronze Athlete", priceMonthly: 4.99, priceLifetime: 49.99, features: ["basic_training", "basic_stats", "local_storage", "ads_free", "calendar", "rest_timer"] },
    silver: { id: "silver", name: "Silver Pro", priceMonthly: 9.99, priceLifetime: 99.99, features: ["basic_training", "basic_stats", "local_storage", "ads_free", "calendar", "rest_timer", "universal_import_full", "advanced_ai", "food_db", "supplement_db", "therapy_manager", "exam_tracker", "full_cloud_backup"] },
    gold: { id: "gold", name: "Gold Lifetime Master", priceMonthly: 0, priceLifetime: 199.99, features: ["basic_training", "basic_stats", "local_storage", "ads_free", "calendar", "rest_timer", "universal_import_full", "advanced_ai", "food_db", "supplement_db", "therapy_manager", "exam_tracker", "full_cloud_backup", "priority_support", "beta_access", "lifetime_updates"] }
  },
  currentPlan: "free",
  trialActive: false,
  trialEnd: null,

  getPlan() {
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
  },
  setPlan(planId) {
    const key = (planId || "").toLowerCase().trim();
    if (this.plans[key]) {
      this.currentPlan = key;
      if (typeof store !== 'undefined' && store) {
        store.accountPlan = key.toUpperCase();
      }
      try { localStorage.setItem("GS_PLAN", key); } catch(e) {}
    }
  },
  startTrial() {
    return this.start14DayTrial();
  },
  start14DayTrial() {
    this.trialActive = true;
    this.trialEnd = Date.now() + (14 * 24 * 60 * 60 * 1000);
    if (typeof store !== 'undefined' && store) {
      store.accountTrialStart = Date.now();
    }
    try { localStorage.setItem("GS_TRIAL_END", this.trialEnd.toString()); } catch(e) {}
    return { ok: true, trialEnd: this.trialEnd };
  },
  isTrialActive() {
    if (typeof store !== 'undefined' && store && store.accountTrialStart) {
      const trialStart = parseInt(store.accountTrialStart, 10);
      return Date.now() - trialStart < 14 * 24 * 60 * 60 * 1000;
    }
    return Boolean(this.trialActive && this.trialEnd && Date.now() < this.trialEnd);
  },
  hasFeature(featureName) {
    const activePlanId = this.getPlan();
    const plan = this.plans[activePlanId] || this.plans.free;
    return (plan.features || []).includes(featureName);
  },
  init() {
    try {
      const savedPlan = localStorage.getItem("GS_PLAN");
      if (savedPlan && this.plans[savedPlan.toLowerCase()]) this.currentPlan = savedPlan.toLowerCase();
      const savedTrial = localStorage.getItem("GS_TRIAL_END");
      if (savedTrial) {
        const trialTime = parseInt(savedTrial, 10);
        if (Date.now() < trialTime) {
          this.trialActive = true;
          this.trialEnd = trialTime;
        }
      }
    } catch(e) {}
  }
};

const PricingService = {
  getPlans() { return Object.values(EntitlementService.plans); },
  getCurrentPlan() { return EntitlementService.getPlan(); }
};

const AdsService = {
  shouldShowAd(placement) {
    const activePlan = EntitlementService.getPlan();
    if (activePlan !== 'free') return false;
    const protectedPlacements = ["workout", "workout_logger", "logger", "rest_timer", "timer", "therapy", "medical", "import", "universal_import"];
    if (protectedPlacements.includes(placement)) return false;
    return true;
  }
};

`;

content = content.slice(0, startIdx) + replacement + content.slice(endIdx);

fs.writeFileSync('prepare_task20_js_services.mjs', content, 'utf8');
console.log('Successfully replaced EntitlementService, PricingService, and AdsService in template!');
