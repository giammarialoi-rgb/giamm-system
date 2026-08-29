import fs from 'fs';

let content = fs.readFileSync('prepare_task20_js_services.mjs', 'utf8');

// 1. Add getLanguage and getAvailableLanguages to I18nService
const i18nInitSearch = `  init() {
    let saved = null;
    try {
      saved = localStorage.getItem('GS_LANG');
    } catch(e) {}
    if (!saved && typeof store !== 'undefined' && store?.prefs?.language) {
      saved = store.prefs.language;
    }
    if (saved && this.supportedLangs.includes(saved)) {
      this.currentLang = saved;
    }
  }`;

const i18nInitReplace = `  getLanguage() {
    return this.currentLang || (typeof store !== 'undefined' && store?.prefs?.language) || 'it';
  },
  getAvailableLanguages() {
    return [
      { code: 'it', name: 'Italiano', flag: '🇮🇹' },
      { code: 'en', name: 'English', flag: '🇬🇧' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
    ];
  },
  init() {
    let saved = null;
    try {
      saved = localStorage.getItem('GS_LANG');
    } catch(e) {}
    if (!saved && typeof store !== 'undefined' && store?.prefs?.language) {
      saved = store.prefs.language;
    }
    if (saved && this.supportedLangs.includes(saved)) {
      this.currentLang = saved;
    }
  }`;

content = content.replace(i18nInitSearch, i18nInitReplace);

// 2. Enhance pricingConfig with plans dictionary
const pricingConfigSearch = `const pricingConfig = {
  tiers: [
    { id: "free", name: "Free", priceMonthly: 0, priceYearly: 0, badge: "BASE", features: ["Importazione schede standard", "Training Logger di base", "Database Alimenti base"] },
    { id: "bronze", name: "Bronze", priceMonthly: 4.99, priceYearly: 49.99, badge: "STARTER", features: ["Zero banner pubblicitari", "Grafici di performance", "Esportazione PDF/CSV"] },
    { id: "silver", name: "Silver", priceMonthly: 9.99, priceYearly: 89.99, badge: "POPULAR", features: ["Tutto in Bronze", "Coach AI illimitato", "Evidenze Examine.com", "Modulo Terapia & Clinica"] },
    { id: "gold", name: "Gold Lifetime", priceMonthly: 199.00, priceYearly: 199.00, badge: "LIFETIME", isLifetime: true, features: ["Accesso illimitato per sempre", "Tutti gli aggiornamenti futuri", "Priorità Coach AI", "Supporto dedicato VIP"] }
  ]
};`;

const pricingConfigReplace = `const pricingConfig = {
  tiers: [
    { id: "free", name: "Free", priceMonthly: 0, priceYearly: 0, badge: "BASE", description: "Funzionalità essenziali per il tracciamento degli allenamenti.", features: ["Importazione schede standard", "Training Logger di base", "Database Alimenti base"] },
    { id: "bronze", name: "Bronze", priceMonthly: 4.99, priceYearly: 49.99, badge: "STARTER", description: "Allenamento senza distrazioni ed esportazione avanzata.", features: ["Zero banner pubblicitari", "Grafici di performance", "Esportazione PDF/CSV"] },
    { id: "silver", name: "Silver", priceMonthly: 9.99, priceYearly: 89.99, badge: "POPULAR", description: "Suite completa con Coach AI illimitato e modulo clinico.", features: ["Tutto in Bronze", "Coach AI illimitato", "Evidenze Examine.com", "Modulo Terapia & Clinica"] },
    { id: "gold", name: "Gold Lifetime", priceMonthly: 199.00, priceYearly: 199.00, badge: "LIFETIME", isLifetime: true, description: "Accesso a vita senza canone ricorrente con priorità VIP.", features: ["Accesso illimitato per sempre", "Tutti gli aggiornamenti futuri", "Priorità Coach AI", "Supporto dedicato VIP"] }
  ],
  plans: {
    free: { name: "Free", price: "0€", description: "Piano essenziale per allenamento e nutrizione di base." },
    bronze: { name: "Bronze", price: "4.99€/m", description: "Esperienza fluida senza annunci pubblicitari con grafici di progressione." },
    silver: { name: "Silver", price: "9.99€/m", description: "Suite completa di intelligenza artificiale, biohacking, terapia ed esami ematochimici." },
    gold: { name: "Gold Lifetime", price: "199€", description: "Abbonamento a vita permanente con tutti gli aggiornamenti futuri garantiti." }
  }
};`;

content = content.replace(pricingConfigSearch, pricingConfigReplace);

fs.writeFileSync('prepare_task20_js_services.mjs', content, 'utf8');
console.log('Successfully updated prepare_task20_js_services.mjs');
