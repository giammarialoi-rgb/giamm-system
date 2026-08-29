import fs from 'fs';

let content = fs.readFileSync('prepare_task20_js_services.mjs', 'utf8');

// 1. Fix Creatina timing to "Post-workout"
content = content.replace(
  '{ name: "Creatina Monoidrato", defaultDose: "5g", timing: "Post-workout / Quotidiano",',
  '{ name: "Creatina Monoidrato", defaultDose: "5g", timing: "Post-workout",'
);

// 2. Add pricingConfig to JS_PRODUCT_SERVICES bundle
const pricingConfigDef = `
const pricingConfig = {
  currency: "EUR",
  symbol: "€",
  plans: {
    FREE: {
      id: "free",
      name: "Free",
      price: 0,
      period: "lifetime",
      description: "Training logger essenziale, RIR/RPE, timer, statistiche di base e import limitato.",
      ads: true,
      features: ["basic_training", "timer", "rir_rpe", "basic_stats", "limited_import"]
    },
    BRONZE: {
      id: "bronze",
      name: "Bronze",
      price: 4.99,
      period: "month",
      description: "Esperienza senza pubblicita, programmi predefiniti completi, calendario, nutrizione e integrazione base.",
      ads: false,
      features: ["basic_training", "timer", "rir_rpe", "basic_stats", "ads_free", "advanced_stats", "basic_nutrition", "basic_supplements", "calendar"]
    },
    SILVER: {
      id: "silver",
      name: "Silver",
      price: 9.99,
      period: "month",
      popular: true,
      description: "Il piano definitivo: Universal Import completo (XLSX/PDF/TXT), Coach AI con adattamento del programma, database alimenti & integratori, terapia medica e monitoraggio esami clinici.",
      ads: false,
      features: ["basic_training", "timer", "rir_rpe", "basic_stats", "ads_free", "advanced_stats", "basic_nutrition", "basic_supplements", "calendar", "universal_import_full", "pdf_import", "advanced_ai", "program_adaptation", "advanced_nutrition", "food_db", "supplement_db", "therapy_manager", "clinical_exams"]
    },
    GOLD: {
      id: "gold",
      name: "Gold Lifetime",
      price: 199.00,
      period: "once",
      badge: "LIFETIME",
      description: "Accesso illimitato a vita a tutte le funzionalita Silver, aggiornamenti futuri garantiti e supporto prioritario.",
      ads: false,
      features: ["basic_training", "timer", "rir_rpe", "basic_stats", "ads_free", "advanced_stats", "basic_nutrition", "basic_supplements", "calendar", "universal_import_full", "pdf_import", "advanced_ai", "program_adaptation", "advanced_nutrition", "food_db", "supplement_db", "therapy_manager", "clinical_exams", "lifetime_updates", "priority_support"]
    }
  }
};
if (typeof window !== 'undefined') window.pricingConfig = pricingConfig;
`;

if (!content.includes('const pricingConfig = {')) {
  content = content.replace(
    '// ====================================================\n// LAYER 3: DOMAIN PRODUCT SERVICES (Master Task 22)\n// ====================================================',
    `// ====================================================\n// LAYER 3: DOMAIN PRODUCT SERVICES (Master Task 22)\n// ====================================================\n${pricingConfigDef}`
  );
}

fs.writeFileSync('prepare_task20_js_services.mjs', content, 'utf8');
console.log('Applied Task 21 fixes to prepare_task20_js_services.mjs');
