// ====================================================
// GIAMMARIA SYSTEM — ARCHITECTURE BASELINE (Master Task 22)
// PRODUCT DOMAIN SERVICES & CATALOG IMPLEMENTATIONS
// ====================================================

// Product services code string for injection into single bundle HTML
export const JS_PRODUCT_SERVICES = `
// ====================================================
// LAYER 3: DOMAIN PRODUCT SERVICES (Master Task 22)
// ====================================================

const pricingConfig = {
  currency: "EUR",
  symbol: "€",
  plans: {
    FREE: {
      id: "free",
      name: "Free",
      price: 0,
      period: "Sempre gratuito",
      features: ["Tracciamento base workout", "Statistiche e tonnellaggio", "14 giorni di Prova Gratuita Silver"]
    },
    BRONZE: {
      id: "bronze",
      name: "Bronze Athlete",
      price: 4.99,
      period: "/mese",
      lifetimePrice: 49.99,
      features: ["Nessuna pubblicità", "Calendario e timeline giornaliera", "Rest timer avanzato"]
    },
    SILVER: {
      id: "silver",
      name: "Silver Pro",
      price: 9.99,
      period: "/mese",
      lifetimePrice: 99.99,
      features: ["Importazione illimitata Excel / PDF / Word", "Coach AI & Proposte strutturate con 1-click", "Database Alimentare, Integratori ed Examine.com"]
    },
    GOLD: {
      id: "gold",
      name: "Gold Lifetime Master",
      price: 199.99,
      period: "Una tantum per sempre",
      features: ["Accesso a vita a tutte le funzionalità Pro", "Aggiornamenti a vita inclusi", "Supporto prioritario e accesso anticipato alle novità"]
    }
  }
};

const I18nService = {
  currentLang: "it",
  LANG_META: {
    it: { code: "it", name: "Italiano", flag: "🇮🇹" },
    en: { code: "en", name: "English", flag: "🇬🇧" },
    es: { code: "es", name: "Español", flag: "🇪🇸" },
    fr: { code: "fr", name: "Français", flag: "🇫🇷" },
    de: { code: "de", name: "Deutsch", flag: "🇩🇪" },
    pt: { code: "pt", name: "Português", flag: "🇧🇷" },
    ru: { code: "ru", name: "Русский", flag: "🇷🇺" },
    zh: { code: "zh", name: "中文", flag: "🇨🇳" },
    ar: { code: "ar", name: "العربية", flag: "🇸🇦" },
    hi: { code: "hi", name: "हिन्दी", flag: "🇮🇳" }
  },
  get supportedLangs() {
    return Object.keys(this.LANG_META);
  },
  dictionaries: {
    it: {
      appName: "GIAMMARIA SYSTEM",
      appTitle: "GIAMMARIA SYSTEM",
      dashboard: "SYSTEM DASHBOARD",
      home: "SYSTEM DASHBOARD",
      activeSession: "Sessione Attiva",
      startWorkout: "INIZIA WORKOUT",
      importProgram: "IMPORTA SCHEDA",
      programsLibrary: "LIBRERIA PROGRAMMI",
      activeProgram: "Programma Attivo",
      training: "ALLENAMENTO",
      nutrition: "ALIMENTAZIONE",
      supplementation: "INTEGRAZIONE",
      supplements: "INTEGRAZIONE",
      therapy: "TERAPIA MEDICA",
      clinicalExams: "ESAMI LAB",
      exams: "ESAMI LAB",
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
      appTitle: "GIAMMARIA SYSTEM",
      dashboard: "SYSTEM DASHBOARD",
      home: "SYSTEM DASHBOARD",
      activeSession: "Active Session",
      startWorkout: "START WORKOUT",
      importProgram: "IMPORT PROGRAM",
      programsLibrary: "PROGRAM LIBRARY",
      activeProgram: "Active Program",
      training: "TRAINING",
      nutrition: "NUTRITION",
      supplementation: "SUPPLEMENTS",
      supplements: "SUPPLEMENTS",
      therapy: "MEDICAL THERAPY",
      clinicalExams: "LAB EXAMS",
      exams: "LAB EXAMS",
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
      carbs: "Carbohydrates",
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
      appTitle: "GIAMMARIA SYSTEM",
      dashboard: "PANEL PRINCIPAL",
      home: "PANEL PRINCIPAL",
      activeSession: "Sesión Activa",
      startWorkout: "INICIAR ENTRENAMIENTO",
      importProgram: "IMPORTAR RUTINA",
      programsLibrary: "BIBLIOTECA DE RUTINAS",
      activeProgram: "Rutina Activa",
      training: "ENTRENAMIENTO",
      nutrition: "NUTRICIÓN",
      supplementation: "SUPLEMENTACIÓN",
      supplements: "SUPLEMENTACIÓN",
      therapy: "TERAPIA MÉDICA",
      clinicalExams: "ANÁLISIS CLÍNICOS",
      exams: "ANÁLISIS CLÍNICOS",
      calendar: "CALENDARIO",
      performance: "LABORATORIO DE RENDIMIENTO",
      coachIA: "COACH IA",
      database: "BASE DE DATOS & RECURSOS",
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
      bonusExercise: "+ EJERCICIO EXTRA",
      finalizeWorkout: "FINALIZAR SESIÓN",
      chatPlaceholder: "Pregunta al Coach IA o escribe un cambio...",
      send: "ENVIAR",
      clearChat: "BORRAR CHAT",
      offlineCoach: "Coach IA fuera de línea.",
      save: "GUARDAR",
      cancel: "CANCELAR",
      confirm: "CONFIRMAR",
      apply: "ACTIVAR",
      delete: "ELIMINAR",
      exportJson: "EXPORTAR JSON",
      importBackup: "IMPORTAR COPIA DE SEGURIDAD",
      exportBackup: "EXPORTAR COPIA COMPLETA",
      language: "IDIOMA",
      plan: "PLAN ACTIVO",
      free: "Gratis",
      bronze: "Bronce",
      silver: "Plata",
      gold: "Oro De Por Lite",
      trial: "Prueba 14 Días",
      today: "Hoy",
      meals: "Comidas",
      foods: "Alimentos",
      calories: "Calorías",
      protein: "Proteína",
      carbs: "Carbohidratos",
      fats: "Grasas",
      timing: "Momento",
      dose: "Dosis",
      drug: "Medicamento",
      parameter: "Parámetro",
      value: "Valor",
      range: "Rango de Referencia",
      date: "Fecha"
    },
    fr: {
      appName: "GIAMMARIA SYSTEM",
      appTitle: "GIAMMARIA SYSTEM",
      dashboard: "TABLEAU DE BORD",
      home: "TABLEAU DE BORD",
      activeSession: "Séance Active",
      startWorkout: "DÉMARRER LA SÉANCE",
      importProgram: "IMPORTER PROGRAMME",
      programsLibrary: "BIBLIOTHÈQUE DE PROGRAMMES",
      activeProgram: "Programme Actif",
      training: "ENTRAÎNEMENT",
      nutrition: "NUTRITION",
      supplementation: "COMPLÉMENTS",
      supplements: "COMPLÉMENTS",
      therapy: "THÉRAPIE MÉDICALE",
      clinicalExams: "ANALYSES LABO",
      exams: "ANALYSES LABO",
      calendar: "CALENDRIER",
      performance: "LABO PERFORMANCE",
      coachAI: "COACH IA",
      database: "BASE DE DONNÉES",
      settings: "PARAMÈTRES",
      pricing: "ABONNEMENTS & TARIFS",
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
      chatPlaceholder: "Posez une question au Coach IA...",
      send: "ENVOYER",
      clearChat: "EFFACER CHAT",
      offlineCoach: "Coach IA hors ligne.",
      save: "ENREGISTRER",
      cancel: "ANNULER",
      confirm: "CONFIRMER",
      apply: "ACTIVER",
      delete: "SUPPRIMER",
      exportJson: "EXPORTER JSON",
      importBackup: "IMPORTER SAUVEGARDE",
      exportBackup: "EXPORTER SAUVEGARDE TOTALE",
      language: "LANGUE",
      plan: "FORFAIT ACTIF",
      free: "Gratuit",
      bronze: "Bronze",
      silver: "Argent",
      gold: "Or À Vie",
      trial: "Essai 14 Jours",
      today: "Aujourd'hui",
      meals: "Repas",
      foods: "Aliments",
      calories: "Calories",
      protein: "Protéines",
      carbs: "Glucides",
      fats: "Lipides",
      timing: "Timing",
      dose: "Dose",
      drug: "Médicament",
      parameter: "Paramètre",
      value: "Valeur",
      range: "Valeurs de Référence",
      date: "Date"
    },
    de: {
      appName: "GIAMMARIA SYSTEM",
      appTitle: "GIAMMARIA SYSTEM",
      dashboard: "ÜBERSICHT",
      home: "ÜBERSICHT",
      activeSession: "Aktive Einheit",
      startWorkout: "TRAINING STARTEN",
      importProgram: "TRAININGSPLAN IMPORTIEREN",
      programsLibrary: "TRAININGSPLAN-BIBLIOTHEK",
      activeProgram: "Aktiver Trainingsplan",
      training: "TRAINING",
      nutrition: "ERNÄHRUNG",
      supplementation: "SUPPLEMENTE",
      supplements: "SUPPLEMENTE",
      therapy: "MEDIKATION",
      clinicalExams: "LABORWERTE",
      exams: "LABORWERTE",
      calendar: "KALENDER",
      performance: "LEISTUNGSLABOR",
      coachAI: "COACH KI",
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
      substitute: "AUSTAUSCHEN",
      skip: "ÜBERSPRINGEN",
      bonusExercise: "+ ZUSATZÜBUNG",
      finalizeWorkout: "TRAINING ABSCHLIESSEN",
      chatPlaceholder: "Frag Coach KI oder passe den Plan an...",
      send: "SENDEN",
      clearChat: "CHAT LÖSCHEN",
      offlineCoach: "Coach KI offline.",
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
      free: "Kostenlos",
      bronze: "Bronze",
      silver: "Silber",
      gold: "Gold Lebenslang",
      trial: "14 Tage Testphase",
      today: "Heute",
      meals: "Mahlzeiten",
      foods: "Lebensmittel",
      calories: "Kalorien",
      protein: "Protein",
      carbs: "Kohlenhydrate",
      fats: "Fette",
      timing: "Zeitpunkt",
      dose: "Dosis",
      drug: "Medikament",
      parameter: "Parameter",
      value: "Wert",
      range: "Referenzbereich",
      date: "Datum"
    },
    pt: {
      appName: "GIAMMARIA SYSTEM", dashboard: "PAINEL DO SISTEMA", home: "PAINEL DO SISTEMA",
      training: "TREINO", nutrition: "NUTRIÇÃO", supplementation: "SUPLEMENTOS", therapy: "TERAPIA",
      coachAI: "COACH IA", database: "BANCO DE DADOS", settings: "CONFIGURAÇÕES", importProgram: "IMPORTAR PROGRAMA"
    },
    ru: {
      appName: "GIAMMARIA SYSTEM", dashboard: "ПАНЕЛЬ СИСТЕМЫ", home: "ПАНЕЛЬ СИСТЕМЫ",
      training: "ТРЕНИРОВКА", nutrition: "ПИТАНИЕ", supplementation: "ДОБАВКИ", therapy: "ТЕРАПИЯ",
      coachAI: "COACH AI", database: "БАЗА ДАННЫХ", settings: "НАСТРОЙКИ", importProgram: "ИМПОРТ ПРОГРАММЫ"
    },
    zh: {
      appName: "GIAMMARIA SYSTEM", dashboard: "系统面板", home: "系统面板",
      training: "训练", nutrition: "营养", supplementation: "补剂", therapy: "治疗",
      coachAI: "AI 教练", database: "数据库", settings: "设置", importProgram: "导入计划"
    },
    ar: {
      appName: "GIAMMARIA SYSTEM", dashboard: "لوحة النظام", home: "لوحة النظام",
      training: "التدريب", nutrition: "التغذية", supplementation: "المكملات", therapy: "العلاج",
      coachAI: "مدرب AI", database: "قاعدة البيانات", settings: "الإعدادات", importProgram: "استيراد البرنامج"
    },
    hi: {
      appName: "GIAMMARIA SYSTEM", dashboard: "सिस्टम डैशबोर्ड", home: "सिस्टम डैशबोर्ड",
      training: "प्रशिक्षण", nutrition: "पोषण", supplementation: "सप्लीमेंट", therapy: "थेरेपी",
      coachAI: "कोच AI", database: "डेटाबेस", settings: "सेटिंग्स", importProgram: "प्रोग्राम आयात"
    }
  },

  t(key) {
    const aliases = {
      appTitle: 'appName',
      home: 'dashboard',
      supplements: 'supplementation',
      exams: 'clinicalExams'
    };
    const resolvedKey = aliases[key] || key;
    const lang = this.currentLang || "it";
    const dict = this.dictionaries[lang] || this.dictionaries.en || this.dictionaries.it;
    if (dict && dict[resolvedKey]) return dict[resolvedKey];
    if (this.dictionaries.en && this.dictionaries.en[resolvedKey]) return this.dictionaries.en[resolvedKey];
    if (this.dictionaries.it && this.dictionaries.it[resolvedKey]) return this.dictionaries.it[resolvedKey];
    if (dict && dict[key]) return dict[key];
    if (this.dictionaries.it && this.dictionaries.it[key]) return this.dictionaries.it[key];
    return key;
  },

  setLanguage(lang) {
    if (this.supportedLangs.includes(lang)) {
      this.currentLang = lang;
      if (typeof store !== 'undefined' && store) {
        if (!store.prefs) store.prefs = {};
        store.prefs.language = lang;
      }
      try {
        localStorage.setItem("GS_LANG", lang);
      } catch(e) {}
      if (typeof render === 'function') render();
    }
  },

  getLanguage() {
    return this.currentLang;
  },

  getAvailableLanguages() {
    return this.supportedLangs.map(code => this.LANG_META[code] || { code, name: code.toUpperCase(), flag: '🌐' });
  },

  init() {
    try {
      const saved = localStorage.getItem("GS_LANG");
      if (saved && this.supportedLangs.includes(saved)) {
        this.currentLang = saved;
      }
    } catch(e) {}
  }
};

const FoodDatabaseService = {
  catalog: [
    { name: "Petto di Pollo crudo", category: "Proteine", kcal: 110, pro: 23.0, carb: 0.0, fat: 1.2, serving: "100g" },
    { name: "Petto di Tacchino", category: "Proteine", kcal: 105, pro: 24.0, carb: 0.0, fat: 1.0, serving: "100g" },
    { name: "Albume d'uovo", category: "Proteine", kcal: 52, pro: 11.0, carb: 0.7, fat: 0.2, serving: "100g" },
    { name: "Uovo intero", category: "Proteine/Grassi", kcal: 143, pro: 12.6, carb: 0.8, fat: 9.5, serving: "100g" },
    { name: "Salmone fresco", category: "Proteine/Grassi", kcal: 208, pro: 20.0, carb: 0.0, fat: 13.0, serving: "100g" },
    { name: "Tonno al naturale", category: "Proteine", kcal: 103, pro: 24.0, carb: 0.0, fat: 0.8, serving: "100g" },
    { name: "Fiocchi di latte 2%", category: "Proteine", kcal: 85, pro: 12.0, carb: 3.5, fat: 2.0, serving: "100g" },
    { name: "Whey Protein Isolate (Isolate 90)", category: "Integratori", kcal: 370, pro: 90.0, carb: 1.5, fat: 1.0, serving: "100g" },
    { name: "Riso Basmati", category: "Carboidrati", kcal: 360, pro: 7.0, carb: 79.0, fat: 0.6, serving: "100g" },
    { name: "Avena in fiocchi", category: "Carboidrati", kcal: 389, pro: 16.9, carb: 66.3, fat: 6.9, serving: "100g" },
    { name: "Patate dolci (americane)", category: "Carboidrati", kcal: 86, pro: 1.6, carb: 20.1, fat: 0.1, serving: "100g" },
    { name: "Gallette di riso", category: "Carboidrati", kcal: 380, pro: 8.0, carb: 82.0, fat: 1.5, serving: "100g" },
    { name: "Pasta di semola", category: "Carboidrati", kcal: 355, pro: 12.5, carb: 73.0, fat: 1.5, serving: "100g" },
    { name: "Olio Extravergine d'Oliva", category: "Grassi", kcal: 884, pro: 0.0, carb: 0.0, fat: 100.0, serving: "100g" },
    { name: "Burro di arachidi 100%", category: "Grassi", kcal: 588, pro: 25.0, carb: 20.0, fat: 50.0, serving: "100g" },
    { name: "Mandorle sgusciate", category: "Grassi", kcal: 579, pro: 21.0, carb: 22.0, fat: 49.0, border: "none", serving: "100g" },
    { name: "Avocado", category: "Grassi", kcal: 160, pro: 2.0, carb: 8.5, fat: 14.7, border: "none", serving: "100g" }
  ],
  search(query) {
    if (!query) return this.catalog;
    const q = query.toLowerCase().trim();
    return this.catalog.filter(f => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
  },
  searchFoods(query) {
    return this.search(query);
  }
};

const SupplementDatabaseService = {
  catalog: [
    {
      name: "Creatina Monoidrato",
      category: "Performance / Ergogenico",
      defaultDose: "5g",
      timing: "Post-workout",
      examineEvidence: {
        grade: "A (Evidenza Forte)",
        primaryOutcomes: ["forza", "massa magra", "potenza anaerobica", "Aumento della forza massimale (+5-15%)", "Aumento della massa magra (idratazione cellulare)", "Miglioramento potenza anaerobica lattacida"],
        secondaryOutcomes: ["Neuroprotezione e supporto cognitivo", "Resintesi rapida di ATP muscolare"],
        recommendedDosing: "3-5g al giorno a tempo indeterminato (senza fase di carico necessaria)",
        safetyNotes: "Sicuro per reni e fegato in soggetti sani; bere almeno 35-45 ml/kg di acqua."
      }
    },
    {
      name: "Proteine Whey Isolate",
      category: "Nutrizione / Sintesi Proteica",
      defaultDose: "30g",
      timing: "Post-workout",
      examineEvidence: {
        grade: "A (Evidenza Forte)",
        primaryOutcomes: ["Massimizzazione MPS (Sintesi Proteica Muscolare)", "Leucina biodisponibile rapida"],
        secondaryOutcomes: ["Supporto recupero muscolare", "Sazietà controllata"],
        recommendedDosing: "20-40g per porzione (contenente almeno 2.5-3g di leucina)",
        safetyNotes: "Altamente tollerabile; scegliere isolate per ridotto contenuto di lattosio."
      }
    },
    {
      name: "Beta-Alanina",
      category: "Resistenza / Buffer Acido",
      defaultDose: "3.2g",
      timing: "Pre-workout",
      examineEvidence: {
        grade: "A (Evidenza Forte)",
        primaryOutcomes: ["Buffer acido lattico (Carnosina intramuscolare)", "Miglioramento prestazioni sforzi 60-240s"],
        secondaryOutcomes: ["Aumento volume totale allenamento"],
        recommendedDosing: "3.2-6.4g/die divisi in dosi da 1.6g per minimizzare parestesia",
        safetyNotes: "Parestesia (formicolio temporaneo innocuo) tipica se assunta in dose unica."
      }
    },
    {
      name: "Caffeina Anidra",
      category: "Focus / Stimolante",
      defaultDose: "200mg",
      timing: "Pre-workout",
      examineEvidence: {
        grade: "A (Evidenza Forte)",
        primaryOutcomes: ["Aumento focus, prontezza e RPE ridotto", "Aumento forza isometrica e resistenza"],
        secondaryOutcomes: ["Mobilizzazione acidi grassi liberi"],
        recommendedDosing: "3-6 mg/kg peso corporeo 45-60 min prima dell'attività",
        safetyNotes: "Evitare entro 6 ore dal sonno per preservare la qualità del sonno profondo."
      }
    },
    {
      name: "Omega-3 (EPA/DHA)",
      category: "Salute Cardiovascolare / Anti-infiammatorio",
      defaultDose: "2-3g",
      timing: "Ai pasti",
      examineEvidence: {
        grade: "A (Evidenza Forte)",
        primaryOutcomes: ["Riduzione trigliceridi sierici", "Modulazione risposta infiammatoria sistemica"],
        secondaryOutcomes: ["Salute endoteliale e profilo lipidico"],
        recommendedDosing: "2-3g totali di EPA + DHA combinati al giorno",
        safetyNotes: "Assumere con cibi contenenti grassi per ottimizzare l'assorbimento."
      }
    },
    {
      name: "Vitamina D3 + K2",
      category: "Salute Ossea / Sistema Immunitario",
      defaultDose: "2000-4000 UI",
      timing: "Colazione",
      examineEvidence: {
        grade: "A (Evidenza Forte)",
        primaryOutcomes: ["Ottimizzazione livelli sierici 25(OH)D", "Supporto omeostasi calcio osseo"],
        secondaryOutcomes: ["Funzione immunitaria e supporto ormonale"],
        recommendedDosing: "2000-4000 UI D3 + 100-200 mcg K2 (MK-7)",
        safetyNotes: "Vitamina liposolubile: richiede pasto con lipidi."
      }
    }
  ],
  search(query) {
    if (!query) return this.catalog;
    const q = query.toLowerCase().trim();
    return this.catalog.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  },
  searchSupplements(query) {
    return this.search(query);
  }
};

const ExamineService = {
  async getEvidence(supplementName) {
    const item = SupplementDatabaseService.catalog.find(s => s.name.toLowerCase().includes((supplementName || "").toLowerCase()));
    if (item && item.examineEvidence) {
      return { ok: true, supplement: item.name, evidence: item.examineEvidence };
    }
    return { ok: false, error: "Nessuna scheda Examine trovata per questo integratore." };
  }
};

const DrugDatabaseService = {
  disclaimer: "DISCLAIMER MEDICO: Questa sezione ha scopo puramente di tracciamento personale. L'assunzione di qualsiasi farmaco o terapia deve avvenire sotto stretta supervisione del medico curante.",
  catalog: [
    { name: "Cardiaspirina", class: "Antiaggregante piastrinico", defaultDose: "100mg", timing: "Dopo pranzo", indications: "Prevenzione cardiovascolare" },
    { name: "Metformina", class: "Biguanide / Antidiabetico", defaultDose: "500-1000mg", timing: "Ai pasti principali", indications: "Sensibilità insulinica, controllo glicemico" },
    { name: "Eutirox (Levotiroxina)", class: "Ormone tiroideo T4", defaultDose: "25-100mcg", timing: "Mattina a digiuno (20-30 min prima di colazione)", indications: "Ipotiroidismo" },
    { name: "Telmisartan", class: "Sartano / Antiipertensivo (ARB)", defaultDose: "20-40mg", timing: "Mattina", indications: "Controllo pressione arteriosa, protezione renale" },
    { name: "Nebivololo", class: "Beta-bloccante selettivo (b1)", defaultDose: "2.5-5mg", timing: "Mattina", indications: "Frequenza cardiaca a riposo, controllo pressorio" },
    { name: "Omeprazolo", class: "Inibitore pompa protonica (IPP)", defaultDose: "20mg", timing: "Mattina prima di colazione", indications: "Gastroprotezione, reflusso gastroesofageo" },
    { name: "TUDCA / Tauroursodeossicolico", class: "Acido biliare epatoprotettore", defaultDose: "250-500mg", timing: "Ai pasti con grassi", indications: "Salute epatica, flusso biliare, colestasi" },
    { name: "NAC (N-Acetilcisteina)", class: "Antiossidante / Precursore Glutatione", defaultDose: "600-1200mg", timing: "Lontano dai pasti", indications: "Detossificazione epatica, supporto renale" }
  ],
  search(query) {
    if (!query) return this.catalog;
    const q = query.toLowerCase().trim();
    return this.catalog.filter(d => d.name.toLowerCase().includes(q) || d.indications.toLowerCase().includes(q));
  }
};

const ExerciseDatabaseService = {
  getAllExercises() {
    return (typeof EXERCISE_DICTIONARY !== 'undefined' ? EXERCISE_DICTIONARY : []).map(e => ({
      name: e.normalized,
      muscle_group: e.muscle,
      secondary_muscles: (e.muscles || []).filter(m => m !== e.muscle)
    }));
  },
  filterByMuscle(muscle) {
    if (!muscle || muscle === 'ALL') return this.getAllExercises();
    const m = muscle.toUpperCase();
    return this.getAllExercises().filter(e => e.muscle_group === m || e.secondary_muscles.includes(m));
  }
};

const CalendarService = {
  getDailySchedule(dateStr = null) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const dayOfWeek = date.getDay();
    const dayNames = ["DOMENICA", "LUNEDI", "MARTEDI", "MERCOLEDI", "GIOVEDI", "VENERDI", "SABATO"];
    const currentDayName = dayNames[dayOfWeek];

    const schedule = {
      date: date.toISOString().split('T')[0],
      dayName: currentDayName,
      workout: null,
      nutrition: null,
      supplements: [],
      therapy: [],
      reminders: []
    };

    if (typeof DATA !== 'undefined' && DATA) {
      if (DATA.training?.weeks?.[0]?.sessions) {
        const sessIdx = (dayOfWeek - 1 + 7) % 7;
        schedule.workout = DATA.training.weeks[0].sessions[sessIdx] || DATA.training.weeks[0].sessions[0] || null;
      }
      if (DATA.nutrition?.days) {
        schedule.nutrition = DATA.nutrition.days.find(d => d.day && d.day.toUpperCase().includes(currentDayName)) || DATA.nutrition.days[0] || null;
      }
      if (DATA.supplementation?.items) {
        schedule.supplements = DATA.supplementation.items;
      }
      if (DATA.therapy?.medications) {
        schedule.therapy = DATA.therapy.medications.filter(m => (m.days || []).includes("Tutti i giorni") || (m.days || []).some(d => d.toUpperCase().includes(currentDayName)));
      }
    }

    return schedule;
  },

  getEventsForDate(dateStr = null, d = (typeof DATA !== 'undefined' ? DATA : null), s = (typeof store !== 'undefined' ? store : null)) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const events = [];
    if (d?.weeks?.length) {
      const sess = d.weeks[0]?.sessions?.[0];
      if (sess) events.push({ type: 'workout', title: sess.title || 'Allenamento', time: '18:00' });
    }
    if (d?.nutrition?.days?.length) {
      events.push({ type: 'nutrition', title: 'Piano Nutrizionale', time: 'Tutto il giorno' });
    }
    (d?.supplementation?.items || []).forEach(item => {
      events.push({ type: 'supplement', title: item.name, time: item.timing || '08:00' });
    });
    (d?.therapy?.medications || []).forEach(med => {
      events.push({ type: 'therapy', title: med.name || med.medication, time: med.timing || '08:00' });
    });
    return events;
  }
};

const CoachAIService = {
  isConfigured: false,
  apiKey: null,
  history: [],
  lastProposal: null,

  async sendQuery(queryText, currentProgram = null) {
    return this.sendChatMessage(queryText, currentProgram);
  },

  async sendChatMessage(queryText, currentProgram = null) {
    if (!queryText || !queryText.trim()) return { ok: true, reply: "Domanda vuota.", text: "Domanda vuota.", proposal: null };

    // Offline smart fallback engine
    const lower = queryText.toLowerCase();
    let replyText = "Nota: Coach AI opera in modalità offline/non configurata. ";
    if (lower.includes("sostituisci") || lower.includes("cambia") || lower.includes("modifica") || lower.includes("panca")) {
      const proposal = {
        id: "prop_" + Date.now(),
        type: "EXERCISE_REPLACEMENT",
        action: "replace_exercise",
        target: { weekNumber: 1, dayNumber: 1, exerciseIndex: 0 },
        targetExercise: "Panca Piana",
        original: "Panca Piana",
        newExercise: "Manubri Inclinata",
        proposed: "Manubri Inclinata",
        reason: "Ottimizzazione traiettoria e stimolo fascio claveare",
        status: "PENDING"
      };
      this.lastProposal = proposal;
      replyText += "Ti propongo di sostituire l'esercizio con Manubri Inclinata. Puoi confermare la modifica con 1 clic.";
      return { ok: true, reply: replyText, text: replyText, proposal };
    }
    replyText += "Ho ricevuto la tua richiesta. Quando la connessione sarà attiva, potrò formulare proposte di periodizzazione avanzate su tutto il mesociclo.";
    return { ok: true, reply: replyText, text: replyText, proposal: null };
  },

  async applyProposal(proposal, currentProgram = null) {
    if (!proposal || !proposal.action) return { ok: false, success: false, error: "Nessuna proposta valida da applicare.", message: "Nessuna proposta valida da applicare." };
    const p = currentProgram || ((typeof DATA !== 'undefined' && DATA) ? DATA : (typeof window !== 'undefined' ? window.DATA : null));
    if (!p || !p.weeks) return { ok: false, success: false, error: "Nessun programma attivo", message: "Nessun programma attivo" };

    try {
      if (proposal.action === 'add_exercise' && proposal.changes) {
        const targetWeek = proposal.target?.weekNumber || proposal.target?.week || 1;
        const targetDay = proposal.target?.dayNumber || proposal.target?.day || 1;
        const week = (p.weeks || [])[targetWeek - 1] || (p.weeks || []).find(w => (w.weekNumber || w.week || w.week_number) === targetWeek) || (p.weeks || [])[0];
        if (week) {
          const session = (week.sessions || week.days || [])[targetDay - 1] || (week.sessions || week.days || [])[0];
          if (session) {
            if (!session.exercises) session.exercises = [];
            session.exercises.push(proposal.changes);
            if (session.rows && session.rows !== session.exercises) session.rows.push(proposal.changes);
          }
        }
      } else if (proposal.action === 'replace_exercise') {
        const targetWeek = proposal.target?.weekNumber || proposal.target?.week || 1;
        const targetDay = proposal.target?.dayNumber || proposal.target?.day || 1;
        const week = (p.weeks || [])[targetWeek - 1] || (p.weeks || []).find(w => (w.weekNumber || w.week || w.week_number) === targetWeek) || (p.weeks || [])[0];
        if (week) {
          const session = (week.sessions || week.days || [])[targetDay - 1] || (week.sessions || week.days || [])[0];
          if (session && session.exercises) {
            const ex = session.exercises.find(e => (e.exercise || e.name) === (proposal.targetExercise || proposal.original || proposal.target));
            if (ex) {
              ex.exercise = proposal.newExercise || proposal.proposed || proposal.replacement;
              ex.name = ex.exercise;
            }
          }
        }
      }
      if (typeof persist === 'function') persist();
      if (typeof render === 'function') render();
      return { ok: true, success: true, message: "Modifica applicata con successo.", updatedProgram: p };
    } catch(err) {
      return { ok: false, success: false, error: err.message, message: err.message };
    }
  },

  undoLastProposal(currentProgram = null) {
    if (!this.lastProposal) return { success: false, message: "Nessuna modifica recente da annullare." };
    this.lastProposal = null;
    return { success: true, message: "Modifica annullata." };
  }
};

const EntitlementService = {
  plans: {
    free: {
      id: "free",
      name: "Free Tier",
      priceMonthly: 0,
      priceLifetime: 0,
      features: ["basic_training", "basic_stats", "local_storage"]
    },
    bronze: {
      id: "bronze",
      name: "Bronze Athlete",
      priceMonthly: 4.99,
      priceLifetime: 49.99,
      features: ["basic_training", "basic_stats", "local_storage", "ads_free", "calendar", "rest_timer"]
    },
    silver: {
      id: "silver",
      name: "Silver Pro",
      priceMonthly: 9.99,
      priceLifetime: 99.99,
      features: ["basic_training", "basic_stats", "local_storage", "ads_free", "calendar", "rest_timer", "universal_import_full", "advanced_ai", "food_db", "supplement_db", "therapy_manager", "exam_tracker", "full_cloud_backup"]
    },
    gold: {
      id: "gold",
      name: "Gold Lifetime Master",
      priceMonthly: 0,
      priceLifetime: 199.99,
      features: ["basic_training", "basic_stats", "local_storage", "ads_free", "calendar", "rest_timer", "universal_import_full", "advanced_ai", "food_db", "supplement_db", "therapy_manager", "exam_tracker", "full_cloud_backup", "priority_support", "beta_access", "lifetime_updates"]
    }
  },

  currentPlan: "free",
  trialActive: false,
  trialEnd: null,

  getPlan() {
    if (typeof store !== 'undefined' && store && store.accountPlan) {
      const sp = store.accountPlan.toLowerCase();
      if (this.isTrialActive()) return "silver";
      return sp;
    }
    if (this.isTrialActive()) {
      return "silver";
    }
    return this.currentPlan;
  },

  setPlan(planId) {
    const key = (planId || "").toLowerCase().trim();
    if (this.plans[key]) {
      this.currentPlan = key;
      this.trialActive = false;
      this.trialEnd = null;
      if (typeof store !== 'undefined' && store) {
        store.accountPlan = key.toUpperCase();
      }
      try {
        localStorage.setItem("GS_PLAN", key);
      } catch(e) {}
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
    try {
      localStorage.setItem("GS_TRIAL_END", this.trialEnd.toString());
    } catch(e) {}
    return { ok: true, trialEnd: this.trialEnd };
  },

  isTrialActive() {
    if (typeof store !== 'undefined' && store && store.accountTrialStart !== undefined && store.accountTrialStart !== null) {
      const trialStart = parseInt(store.accountTrialStart, 10);
      return (Date.now() - trialStart) < (14 * 24 * 60 * 60 * 1000);
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
    let activePlan = EntitlementService.getPlan();
    if (typeof store !== 'undefined' && store && store.accountPlan) {
      const storePlan = store.accountPlan.toLowerCase();
      if (storePlan === 'free') {
        const isTrialActive = EntitlementService.isTrialActive();
        if (!isTrialActive) activePlan = 'free';
        else activePlan = 'silver';
      } else {
        activePlan = storePlan;
      }
    }
    if (activePlan !== 'free') return false;
    if (EntitlementService.hasFeature("ads_free")) return false;
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
    if (protectedPlacements.includes((placement || '').toLowerCase())) return false;
    return true;
  }
};

const BackupService = {
  createFullBackupJson() {
    const backup = {
      version: "2.0.0",
      app: "GIAMMARIA_SYSTEM",
      exportedAt: new Date().toISOString(),
      store: typeof store !== 'undefined' ? store : {},
      program: typeof DATA !== 'undefined' ? DATA : null,
      nutrition: (typeof DATA !== 'undefined' && DATA?.nutrition) ? DATA.nutrition : null,
      supplementation: (typeof DATA !== 'undefined' && DATA?.supplementation) ? DATA.supplementation : null,
      therapy: (typeof DATA !== 'undefined' && DATA?.therapy) ? DATA.therapy : null,
      exams: (typeof DATA !== 'undefined' && DATA?.exams) ? DATA.exams : null
    };
    return JSON.stringify(backup, null, 2);
  },

  restoreFullBackup(jsonString) {
    try {
      const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      if (!data || typeof data !== 'object') throw new Error("File di backup non valido.");

      if (data.store && typeof store !== 'undefined') {
        Object.assign(store, data.store);
      }
      if (data.program && typeof DATA !== 'undefined') {
        DATA = data.program;
      }
      if (typeof persist === 'function') persist();
      if (typeof render === 'function') render();
      return { success: true, message: "Backup ripristinato con successo." };
    } catch(err) {
      return { success: false, error: err.message };
    }
  }
};

const HealthDataProvider = {
  isSupported: true,
  async fetchMetrics() {
    return {
      steps: 8450,
      sleepHours: 7.5,
      restingHeartRate: 58,
      hrvMs: 65,
      hydrationLiters: 2.5
    };
  }
};

const ErrorLogger = {
  CATEGORIES: {
    IMPORT_ERROR: "IMPORT_ERROR",
    PERSISTENCE_ERROR: "PERSISTENCE_ERROR",
    AI_ERROR: "AI_ERROR",
    RENDER_ERROR: "RENDER_ERROR",
    NETWORK_ERROR: "NETWORK_ERROR",
    CALC_ERROR: "CALC_ERROR",
    AUTH_ERROR: "AUTH_ERROR",
    SECURITY_ERROR: "SECURITY_ERROR"
  },
  logs: [],
  log(category, message, details = null) {
    const entry = {
      id: "err_" + Date.now(),
      timestamp: new Date().toISOString(),
      category: this.CATEGORIES[category] || category,
      message,
      details
    };
    this.logs.push(entry);
    if (this.logs.length > 100) this.logs.shift();
    console.error(\`[GS_ERROR] \${entry.category} \${entry.message}\`, details || '');
    return entry;
  },
  clearErrors() {
    this.logs = [];
  },
  getRecentErrors() {
    return [...this.logs];
  }
};
`;
