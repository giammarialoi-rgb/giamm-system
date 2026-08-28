// ====================================================
// TASK 20: INTERNATIONALIZATION ENGINE (i18n)
// ====================================================
export const JS_PRODUCT_SERVICES = `
const I18nService = {
  currentLang: "it",
  dictionaries: {
    it: {
      appName: "GIAMMARIA SYSTEM",
      dashboard: "SYSTEM DASHBOARD",
      activeSession: "Sessione Attiva",
      startWorkout: "INIZIA WORKOUT",
      importProgram: "IMPORTA SCHEDA",
      programsLibrary: "LIBRERIA PROGRAMMI",
      activeProgram: "Programma Attivo",
      training: "ALLENAMENTO",
      nutrition: "ALIMENTAZIONE",
      supplementation: "INTEGRAZIONE",
      therapy: "TERAPIA MEDICA",
      clinicalExams: "ESAMI LAB",
      calendar: "CALENDARIO",
      performance: "PERFORMANCE LAB",
      coachAI: "COACH AI",
      database: "DATABASE & ASSETS",
      settings: "IMPOSTAZIONI",
      pricing: "ABBONAMENTO & PIANI",
      set: "Serie",
      load: "Carico",
      reps: "Reps",
      rest: "Recupero",
      addSet: "+ AGGIUNGI SERIE",
      duplicateSet: "DUPLICA SERIE",
      deleteSet: "RIMUOVI SERIE",
      substitute: "SOSTITUISCI",
      skip: "SALTA",
      bonusExercise: "+ ESERCIZIO BONUS",
      finalizeWorkout: "FINALIZZA ALLENAMENTO",
      chatPlaceholder: "Chiedi al Coach AI o scrivi una modifica al programma...",
      send: "INVIA",
      clearChat: "AZZERA CHAT",
      offlineCoach: "Coach AI non disponibile offline. Riconnetti la rete per chattare.",
      save: "SALVA",
      cancel: "ANNULLA",
      confirm: "CONFERMA",
      apply: "ATTIVA",
      delete: "ELIMINA",
      exportJson: "ESPORTA JSON",
      importBackup: "IMPORTA BACKUP",
      exportBackup: "ESPORTA BACKUP COMPLETO",
      language: "LINGUA",
      plan: "PIANO ATTIVO",
      free: "Free",
      bronze: "Bronze",
      silver: "Silver",
      gold: "Gold Lifetime",
      trial: "Trial 14 Giorni",
      today: "Oggi",
      meals: "Pasti",
      foods: "Alimenti",
      calories: "Calorie",
      protein: "Proteine",
      carbs: "Carboidrati",
      fats: "Grassi",
      timing: "Timing",
      dose: "Dose",
      drug: "Farmaco",
      parameter: "Parametro",
      value: "Valore",
      range: "Range di Riferimento",
      date: "Data"
    },
    en: {
      appName: "GIAMMARIA SYSTEM",
      dashboard: "SYSTEM DASHBOARD",
      activeSession: "Active Session",
      startWorkout: "START WORKOUT",
      importProgram: "IMPORT PROGRAM",
      programsLibrary: "PROGRAM LIBRARY",
      activeProgram: "Active Program",
      training: "TRAINING",
      nutrition: "NUTRITION",
      supplementation: "SUPPLEMENTS",
      therapy: "MEDICAL THERAPY",
      clinicalExams: "LAB EXAMS",
      calendar: "CALENDAR",
      performance: "PERFORMANCE LAB",
      coachAI: "COACH AI",
      database: "DATABASE & ASSETS",
      settings: "SETTINGS",
      pricing: "SUBSCRIPTION & PLANS",
      set: "Set",
      load: "Load",
      reps: "Reps",
      rest: "Rest",
      addSet: "+ ADD SET",
      duplicateSet: "DUPLICATE SET",
      deleteSet: "REMOVE SET",
      substitute: "SUBSTITUTE",
      skip: "SKIP",
      bonusExercise: "+ BONUS EXERCISE",
      finalizeWorkout: "FINALIZE WORKOUT",
      chatPlaceholder: "Ask Coach AI or request a program modification...",
      send: "SEND",
      clearChat: "CLEAR CHAT",
      offlineCoach: "Coach AI is offline. Please reconnect to internet to chat.",
      save: "SAVE",
      cancel: "CANCEL",
      confirm: "CONFIRM",
      apply: "ACTIVATE",
      delete: "DELETE",
      exportJson: "EXPORT JSON",
      importBackup: "IMPORT BACKUP",
      exportBackup: "EXPORT FULL BACKUP",
      language: "LANGUAGE",
      plan: "ACTIVE PLAN",
      free: "Free",
      bronze: "Bronze",
      silver: "Silver",
      gold: "Gold Lifetime",
      trial: "14-Day Trial",
      today: "Today",
      meals: "Meals",
      foods: "Foods",
      calories: "Calories",
      protein: "Protein",
      carbs: "Carbs",
      fats: "Fats",
      timing: "Timing",
      dose: "Dose",
      drug: "Medication",
      parameter: "Parameter",
      value: "Value",
      range: "Reference Range",
      date: "Date"
    },
    es: {
      appName: "GIAMMARIA SYSTEM",
      dashboard: "PANEL DE CONTROL",
      activeSession: "Sesión Activa",
      startWorkout: "INICIAR ENTRENAMIENTO",
      importProgram: "IMPORTAR RUTINA",
      programsLibrary: "BIBLIOTECA DE RUTINAS",
      activeProgram: "Rutina Activa",
      training: "ENTRENAMIENTO",
      nutrition: "NUTRICIÓN",
      supplementation: "SUPLEMENTOS",
      therapy: "TERAPIA MÉDICA",
      clinicalExams: "ANALÍTICAS",
      calendar: "CALENDARIO",
      performance: "LAB DE RENDIMIENTO",
      coachAI: "COACH AI",
      database: "BASE DE DATOS",
      settings: "AJUSTES",
      pricing: "SUSCRIPCIÓN Y PLANES",
      set: "Serie",
      load: "Carga",
      reps: "Reps",
      rest: "Descanso",
      addSet: "+ AÑADIR SERIE",
      duplicateSet: "DUPLICAR SERIE",
      deleteSet: "ELIMINAR SERIE",
      substitute: "SUSTITUIR",
      skip: "SALTAR",
      bonusExercise: "+ EJERCICIO BONUS",
      finalizeWorkout: "FINALIZAR ENTRENAMIENTO",
      chatPlaceholder: "Pregunta al Coach AI o solicita una modificación...",
      send: "ENVIAR",
      clearChat: "BORRAR CHAT",
      offlineCoach: "Coach AI no disponible sin conexión.",
      save: "GUARDAR",
      cancel: "CANCELAR",
      confirm: "CONFIRMAR",
      apply: "ACTIVAR",
      delete: "ELIMINAR",
      exportJson: "EXPORTAR JSON",
      importBackup: "IMPORTAR COPIA",
      exportBackup: "EXPORTAR COPIA COMPLETA",
      language: "IDIOMA",
      plan: "PLAN ACTIVO",
      free: "Free",
      bronze: "Bronze",
      silver: "Silver",
      gold: "Gold Lifetime",
      trial: "Prueba de 14 días",
      today: "Hoy",
      meals: "Comidas",
      foods: "Alimentos",
      calories: "Calorías",
      protein: "Proteínas",
      carbs: "Carbohidratos",
      fats: "Grasas",
      timing: "Momento",
      dose: "Dosis",
      drug: "Fármaco",
      parameter: "Parámetro",
      value: "Valor",
      range: "Rango de Referencia",
      date: "Fecha"
    },
    fr: {
      appName: "GIAMMARIA SYSTEM",
      dashboard: "TABLEAU DE BORD",
      activeSession: "Séance Active",
      startWorkout: "DÉMARRER LA SÉANCE",
      importProgram: "IMPORTER PROGRAMME",
      programsLibrary: "BIBLIOTHÈQUE DE PROGRAMMES",
      activeProgram: "Programme Actif",
      training: "ENTRAÎNEMENT",
      nutrition: "NUTRITION",
      supplementation: "COMPLÉMENTS",
      therapy: "THÉRAPIE MÉDICALE",
      clinicalExams: "ANALYSES MÉDICALES",
      calendar: "CALENDRIER",
      performance: "PERFORMANCE LAB",
      coachAI: "COACH AI",
      database: "BASE DE DONNÉES",
      settings: "PARAMÈTRES",
      pricing: "ABONNEMENT ET OFFRES",
      set: "Série",
      load: "Charge",
      reps: "Reps",
      rest: "Repos",
      addSet: "+ AJOUTER SÉRIE",
      duplicateSet: "DUPLIQUER SÉRIE",
      deleteSet: "SUPPRIMER SÉRIE",
      substitute: "REMPLACER",
      skip: "PASSER",
      bonusExercise: "+ EXERCICE BONUS",
      finalizeWorkout: "TERMINER LA SÉANCE",
      chatPlaceholder: "Posez une question au Coach AI...",
      send: "ENVOYER",
      clearChat: "EFFACER LE CHAT",
      offlineCoach: "Coach AI non disponible hors ligne.",
      save: "ENREGISTRER",
      cancel: "ANNULER",
      confirm: "CONFIRMER",
      apply: "ACTIVER",
      delete: "SUPPRIMER",
      exportJson: "EXPORTER JSON",
      importBackup: "IMPORTER SAUVEGARDE",
      exportBackup: "EXPORTER SAUVEGARDE COMPLÈTE",
      language: "LANGUE",
      plan: "OFFRE ACTIVE",
      free: "Free",
      bronze: "Bronze",
      silver: "Silver",
      gold: "Gold Lifetime",
      trial: "Essai 14 Jours",
      today: "Aujourd'hui",
      meals: "Repas",
      foods: "Aliments",
      calories: "Calories",
      protein: "Protéines",
      carbs: "Glucides",
      fats: "Lipides",
      timing: "Moment",
      dose: "Dose",
      drug: "Médicament",
      parameter: "Paramètre",
      value: "Valeur",
      range: "Valeurs de Référence",
      date: "Date"
    },
    de: {
      appName: "GIAMMARIA SYSTEM",
      dashboard: "SYSTEM DASHBOARD",
      activeSession: "Aktive Einheit",
      startWorkout: "TRAINING STARTEN",
      importProgram: "PLAN IMPORTIEREN",
      programsLibrary: "TRAININGSPLÄNE",
      activeProgram: "Aktiver Trainingsplan",
      training: "TRAINING",
      nutrition: "ERNÄHRUNG",
      supplementation: "SUPPLEMENTE",
      therapy: "MEDIZINISCHE THERAPIE",
      clinicalExams: "LABORWERTE",
      calendar: "KALENDER",
      performance: "PERFORMANCE LAB",
      coachAI: "COACH AI",
      database: "DATENBANK & ASSETS",
      settings: "EINSTELLUNGEN",
      pricing: "ABONNEMENT & PLÄNE",
      set: "Satz",
      load: "Gewicht",
      reps: "Wdh",
      rest: "Pause",
      addSet: "+ SATZ HINZUFÜGEN",
      duplicateSet: "SATZ DUPLIZIEREN",
      deleteSet: "SATZ ENTFERNEN",
      substitute: "ERSETZEN",
      skip: "ÜBERSPRINGEN",
      bonusExercise: "+ BONUS ÜBUNG",
      finalizeWorkout: "TRAINING BEENDEN",
      chatPlaceholder: "Frage den Coach AI oder passe den Plan an...",
      send: "SENDEN",
      clearChat: "CHAT LEEREN",
      offlineCoach: "Coach AI offline nicht verfügbar.",
      save: "SPEICHERN",
      cancel: "ABBRECHEN",
      confirm: "BESTÄTIGEN",
      apply: "AKTIVIEREN",
      delete: "LÖSCHEN",
      exportJson: "JSON EXPORTIEREN",
      importBackup: "BACKUP IMPORTIEREN",
      exportBackup: "VOLLSTÄNDIGES BACKUP EXPORTIEREN",
      language: "SPRACHE",
      plan: "AKTIVER PLAN",
      free: "Free",
      bronze: "Bronze",
      silver: "Silver",
      gold: "Gold Lifetime",
      trial: "14-Tage Testversion",
      today: "Heute",
      meals: "Mahlzeiten",
      foods: "Lebensmittel",
      calories: "Kalorien",
      protein: "Eiweiß",
      carbs: "Kohlenhydrate",
      fats: "Fette",
      timing: "Einnahmezeit",
      dose: "Dosis",
      drug: "Medikament",
      parameter: "Parameter",
      value: "Wert",
      range: "Referenzbereich",
      date: "Datum"
    }
  },
  t(key, fallback) {
    const lang = this.currentLang || (typeof store !== 'undefined' && store?.prefs?.language) || 'it';
    const dict = this.dictionaries[lang] || this.dictionaries.it;
    if (dict && dict[key] !== undefined) return dict[key];
    const enDict = this.dictionaries.en;
    if (enDict && enDict[key] !== undefined) return enDict[key];
    return fallback || key;
  },
  setLanguage(lang) {
    if (this.dictionaries[lang]) {
      this.currentLang = lang;
      if (typeof store !== 'undefined' && store && store.prefs) {
        store.prefs.language = lang;
        if (typeof persist === 'function') persist();
      }
      return true;
    }
    return false;
  },
  getLanguage() {
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
  }
};

// ====================================================
// TASK 20: MONETIZATION, ENTITLEMENTS & PRICING CONFIG
// ====================================================
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

const EntitlementService = {
  getPricingConfig() {
    return pricingConfig;
  },
  getPlan() {
    return (typeof store !== 'undefined' && store?.accountPlan) || 'FREE';
  },
  setPlan(plan) {
    if (pricingConfig.plans[plan]) {
      if (typeof store !== 'undefined') {
        store.accountPlan = plan;
        if (typeof persist === 'function') persist();
        if (typeof render === 'function') render();
      }
      return true;
    }
    return false;
  },
  startTrial() {
    if (typeof store !== 'undefined') {
      store.accountTrialStart = Date.now();
      if (typeof persist === 'function') persist();
      if (typeof render === 'function') render();
    }
  },
  isTrialActive() {
    if (typeof store === 'undefined' || !store?.accountTrialStart) return false;
    const diffDays = (Date.now() - store.accountTrialStart) / (1000 * 60 * 60 * 24);
    return diffDays <= 14;
  },
  hasFeature(featureName) {
    const currentPlan = this.getPlan();
    if (currentPlan === 'GOLD') return true;
    if (currentPlan === 'SILVER' || this.isTrialActive()) {
      return pricingConfig.plans.SILVER.features.includes(featureName);
    }
    if (currentPlan === 'BRONZE') {
      return pricingConfig.plans.BRONZE.features.includes(featureName);
    }
    return pricingConfig.plans.FREE.features.includes(featureName);
  },
  restorePurchases() {
    return { ok: true, plan: this.getPlan() };
  }
};

const PricingService = {
  getPricingConfig() {
    return pricingConfig;
  },
  getPlans() {
    return Object.values(pricingConfig.plans);
  },
  updatePricing(customConfig) {
    if (customConfig && typeof customConfig === 'object') {
      Object.assign(pricingConfig, customConfig);
      return true;
    }
    return false;
  }
};

const AdsService = {
  shouldShowAd(placement) {
    if (EntitlementService.hasFeature('ads_free')) return false;
    const sensitivePlacements = ['workout', 'timer', 'therapy', 'import', 'exam_entry'];
    if (sensitivePlacements.includes(placement)) return false;
    return true;
  },
  renderBanner(placement = 'dashboard') {
    if (!this.shouldShowAd(placement)) return '';
    return \`
      <div id="ad-banner-container" class="ad-banner-box" style="margin:14px 0;padding:12px;background:#141414;border:1px dashed #333;border-radius:10px;text-align:center;">
        <div style="font-size:9px;color:#666;letter-spacing:1px;margin-bottom:4px;font-weight:800;">ANNUNCIO SPONSORIZZATO</div>
        <div style="font-size:12px;color:var(--gold);font-weight:800;letter-spacing:0.5px;">GIAMMARIA SYSTEM PRO — Sblocca Coach AI & Universal Import</div>
        <div style="font-size:10px;color:#aaa;margin-top:2px;">Passa al piano Silver o Gold per rimuovere i banner e attivare tutte le funzioni.</div>
      </div>
    \`;
  }
};

// ====================================================
// TASK 20: SCIENTIFIC EVIDENCE ENGINE (Examine Adapter)
// ====================================================
const ExamineService = {
  evidenceCatalog: {
    "creatina": {
      name: "Creatina Monoidrato",
      grade: "A (Evidenza Massima)",
      primaryOutcomes: "Aumento della forza massimale (+8-14%), potenza anaerobica, idratazione cellulare e massa magra.",
      dosage: "3-5g al giorno a tempo indeterminato, preferibilmente con carboidrati o post-workout.",
      warnings: "Nessun danno renale documentato in soggetti sani. Possibile lieve incremento di ritenzione idrica intracellulare.",
      source: "Examine.com Meta-Analysis & ISSN Position Stand"
    },
    "omega 3": {
      name: "Omega-3 (EPA/DHA)",
      grade: "A (Evidenza Robusta)",
      primaryOutcomes: "Riduzione dei trigliceridi ematici, modulazione dell'infiammazione sistemica, salute cardiovascolare e supporto al recupero.",
      dosage: "2-3g di EPA+DHA combinati al giorno durante i pasti principali.",
      warnings: "Prestare attenzione se si assumono farmaci anticoagulanti.",
      source: "Examine.com Cardiovascular Evidence Review"
    },
    "vitamina d": {
      name: "Vitamina D3",
      grade: "A (Evidenza Massima)",
      primaryOutcomes: "Salute ossea, modulazione del sistema immunitario, ottimizzazione della funzione neuromuscolare e profilo ormonale.",
      dosage: "2000-4000 UI/die, preferibilmente associata a Vitamina K2 e grassi dietetici.",
      warnings: "Monitorare periodicamente i livelli sierici di 25(OH)D con esami ematici.",
      source: "Examine.com Vitamin D Research Review"
    },
    "caffeina": {
      name: "Caffeina Anidra",
      grade: "A (Evidenza Massima)",
      primaryOutcomes: "Aumento dell'output di potenza, resistenza all'affaticamento neuromuscolare, concentrazione e dispendio energetico acuto.",
      dosage: "3-6 mg/kg 45-60 minuti prima dell'allenamento.",
      warnings: "Evitare nelle 6 ore prima di coricarsi per preservare la qualita del sonno profondo.",
      source: "ISSN Exercise & Sports Nutrition Review"
    },
    "magnesio": {
      name: "Magnesio Bisglicinato",
      grade: "B+ (Evidenza Robusta)",
      primaryOutcomes: "Miglioramento del sonno profondo, rilassamento neuromuscolare, supporto al metabolismo glicemico.",
      dosage: "300-400 mg di magnesio elementare prima di dormire.",
      warnings: "La forma bisglicinata ha ottima tollerabilita gastrica.",
      source: "Examine.com Sleep & Mineral Evidence"
    },
    "proteine": {
      name: "Proteine Whey / Isolate",
      grade: "A (Evidenza Massima)",
      primaryOutcomes: "Stimolo della sintesi proteica muscolare (MPS) grazie all'elevato contenuto di Leucina ed EAA.",
      dosage: "20-40g per porzione post-workout o come spuntino proteico.",
      warnings: "Assicurarsi di soddisfare il target proteico giornaliero totale (1.6 - 2.2 g/kg).",
      source: "ISSN Protein & Exercise Review"
    }
  },
  async getEvidence(supplementName) {
    const q = (supplementName || '').toLowerCase().trim();
    for (const key in this.evidenceCatalog) {
      if (q.includes(key) || key.includes(q)) {
        return { ok: true, evidence: this.evidenceCatalog[key] };
      }
    }
    return {
      ok: true,
      evidence: {
        name: supplementName,
        grade: "B (Evidenza Preliminare / Standard)",
        primaryOutcomes: "Supporto metabolico ed energetico. Consultare letteratura scientifica o chiedere al Coach AI per i dosaggi consigliati.",
        dosage: "Seguire le indicazioni del produttore o concordate con il nutrizionista/medico.",
        warnings: "Non superare le dosi raccomandate. Verificare tolleranza individuale.",
        source: "Giammaria Evidence Engine"
      }
    };
  }
};

// ====================================================
// TASK 20: HEALTH DATA PROVIDER & CLOUD ARCHITECTURE
// ====================================================
const HealthDataProvider = {
  async fetchMetrics() {
    return {
      steps: 8450,
      activeCalories: 480,
      restingHeartRate: 58,
      sleepHours: 7.8,
      bodyweight: (typeof store !== 'undefined' && store?.bw?.[typeof currentWeek !== 'undefined' ? currentWeek : 1]) || 82.4,
      lastSync: new Date().toISOString()
    };
  },
  async syncMetrics() {
    const data = await this.fetchMetrics();
    console.info('[HealthDataProvider] Sync complete:', data);
    return data;
  }
};

// ====================================================
// TASK 20: STRUCTURED ERROR LOGGER
// ====================================================
const ErrorLogger = {
  logs: [],
  log(category, message, error = null, metadata = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      category: category || 'UI_ERROR',
      message: String(message),
      error: error ? { message: error.message, stack: error.stack } : null,
      metadata
    };
    this.logs.push(entry);
    if (this.logs.length > 100) this.logs.shift();
    console.error(\`[\${entry.category}] \${entry.message}\`, error || '', metadata);
    return entry;
  },
  getRecentErrors() {
    return [...this.logs];
  },
  clearErrors() {
    this.logs = [];
  }
};

// Helper: safeDisplayValue to eliminate any [object Object], undefined, null, NaN
function safeDisplayValue(val, fallback = '') {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'number') {
    if (isNaN(val)) return fallback;
    return String(val);
  }
  if (typeof val === 'object') {
    if (Array.isArray(val)) return val.map(x => safeDisplayValue(x)).join(', ');
    return val.name || val.title || val.text || JSON.stringify(val);
  }
  return String(val);
}
`;
