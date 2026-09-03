// ====================================================
// NURVAN — ARCHITECTURE BASELINE (Master Task 22)
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
      appName: "NURVAN",
      appTitle: "NURVAN",
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
      coachAI: "NURVAN AI",
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
      chatPlaceholder: "Chiedi a Nurvan AI o scrivi una modifica al programma...",
      send: "INVIA",
      clearChat: "AZZERA CHAT",
      offlineCoach: "Nurvan AI non disponibile offline. Riconnetti la rete per chattare.",
      save: "SALVA",
      cancel: "ANNULLA",
      confirm: "CONFERMA",
      apply: "ATTIVA",
      delete: "ELIMINA",
      exportJson: "ESPORTA JSON",
      importBackup: "Importa backup",
      exportBackup: "Esporta backup",
      exportHistoryCsv: "Esporta storico CSV",
      backupRestore: "Backup e ripristino",
      backupHint: "Esporta tutti i tuoi dati (profilo, programmi, allenamenti) in un file JSON, oppure importa un backup precedente. Lo storico CSV contiene le sessioni registrate.",
      athleteProfile: "Profilo Atleta",
      saveProfile: "Salva profilo",
      profilo: "PROFILO",
      systemPreferences: "PREFERENZE DI SISTEMA",
      selectLanguage: "Seleziona lingua",
      currentPlan: "Piano attuale",
      managePlans: "Gestisci piani",
      architectureStatus: "Stato architettura",
      resetWorkoutLog: "Azzera carichi",
      hardReset: "Hard reset",
      hardResetApp: "Hard reset app",
      restoreLoads: "Ripristina carichi",
      coachWelcome: "Ciao! Sono Nurvan AI, il tuo coach di allenamento. Dimmi pure come posso aiutarti.",
      coachFileTitle: "Analisi file con Nurvan AI",
      coachFileHint: "Carica una scheda: Nurvan AI la analizza e ti propone miglioramenti.",
      analyzeCoachFile: "Analizza con Nurvan AI",
      checkAiServer: "Verifica server AI",
      newQuestion: "Nuova domanda",
      stopVoice: "Stop voce",
      readReply: "Leggi risposta",
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
      addDay: "Aggiungi giorno",
      addMeal: "Aggiungi pasto",
      addFood: "Aggiungi alimento",
      addItem: "Aggiungi",
      dailyTotals: "Totali giornalieri",
      importNutrition: "Importa alimentazione",
      importSupplements: "Importa integrazione",
      importTherapy: "Importa terapia",
      emptyNutrition: "Nessun piano alimentare. Importa una scheda o aggiungi un giorno.",
      scanBarcode: "Scansiona barcode",
      searchBarcode: "Cerca",
      timing: "Timing",
      dose: "Dose",
      drug: "Farmaco",
      parameter: "Parametro",
      value: "Valore",
      range: "Range di Riferimento",
      date: "Data",
      close: "CHIUDI",
      hubTitle: "NURVAN HUB",
      navHome: "Home",
      navWorkout: "Workout",
      navPerf: "Stats",
      navCoach: "Coach",
      menu: "Menu",
      account: "Account",
      accedi: "ACCEDI",
      googleContinue: "CONTINUA CON GOOGLE",
      appleContinue: "CONTINUA CON APPLE",
      createAccount: "CREA UN ACCOUNT",
      labelName: "Nome",
      labelAge: "Età",
      labelWeight: "Peso (kg)",
      labelHeight: "Altezza (cm)",
      labelGoal: "Obiettivo",
      systemModules: "Moduli di sistema"
    },
    en: {
      appName: "NURVAN",
      appTitle: "NURVAN",
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
      exportHistoryCsv: "Export history CSV",
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
      addDay: "Add day",
      addMeal: "Add meal",
      addFood: "Add food",
      addItem: "Add",
      dailyTotals: "Daily totals",
      importNutrition: "Import nutrition",
      importSupplements: "Import supplements",
      importTherapy: "Import therapy",
      emptyNutrition: "No meal plan yet. Import a file or add a day.",
      scanBarcode: "Scan barcode",
      searchBarcode: "Search",
      timing: "Timing",
      dose: "Dose",
      drug: "Medication",
      parameter: "Parameter",
      value: "Value",
      range: "Reference Range",
      date: "Date",
      close: "CLOSE",
      hubTitle: "NURVAN HUB",
      navHome: "Home",
      navWorkout: "Workout",
      navPerf: "Stats",
      navCoach: "Coach",
      menu: "Menu"
    },
    es: {
      appName: "NURVAN",
      appTitle: "NURVAN",
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
      addDay: "Añadir día",
      addMeal: "Añadir comida",
      addFood: "Añadir alimento",
      addItem: "Añadir",
      dailyTotals: "Totales diarios",
      importNutrition: "Importar alimentación",
      importSupplements: "Importar suplementación",
      importTherapy: "Importar terapia",
      emptyNutrition: "Sin plan alimentario. Importa un archivo o añade un día.",
      scanBarcode: "Escanear código",
      searchBarcode: "Buscar",
      timing: "Momento",
      dose: "Dosis",
      drug: "Medicamento",
      parameter: "Parámetro",
      value: "Valor",
      range: "Rango de Referencia",
      date: "Fecha",
      close: "CLOSE",
      hubTitle: "NURVAN HUB",
      navHome: "Home",
      navWorkout: "Entreno",
      navPerf: "Stats",
      navCoach: "Coach",
      menu: "Menú"
    },
    fr: {
      appName: "NURVAN",
      appTitle: "NURVAN",
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
      addDay: "Ajouter un jour",
      addMeal: "Ajouter un repas",
      addFood: "Ajouter un aliment",
      addItem: "Ajouter",
      dailyTotals: "Totaux journaliers",
      importNutrition: "Importer alimentation",
      importSupplements: "Importer compléments",
      importTherapy: "Importer thérapie",
      emptyNutrition: "Aucun plan alimentaire. Importez un fichier ou ajoutez un jour.",
      scanBarcode: "Scanner le code-barres",
      searchBarcode: "Chercher",
      timing: "Timing",
      dose: "Dose",
      drug: "Médicament",
      parameter: "Paramètre",
      value: "Valeur",
      range: "Valeurs de Référence",
      date: "Date",
      close: "CLOSE",
      hubTitle: "NURVAN HUB",
      navHome: "Home",
      navWorkout: "Séance",
      navPerf: "Stats",
      navCoach: "Coach",
      menu: "Menu"
    },
    de: {
      appName: "NURVAN",
      appTitle: "NURVAN",
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
      addDay: "Tag hinzufügen",
      addMeal: "Mahlzeit hinzufügen",
      addFood: "Lebensmittel hinzufügen",
      addItem: "Hinzufügen",
      dailyTotals: "Tageswerte",
      importNutrition: "Ernährung importieren",
      importSupplements: "Supplemente importieren",
      importTherapy: "Therapie importieren",
      emptyNutrition: "Kein Ernährungsplan. Datei importieren oder Tag hinzufügen.",
      scanBarcode: "Barcode scannen",
      searchBarcode: "Suchen",
      timing: "Zeitpunkt",
      dose: "Dosis",
      drug: "Medikament",
      parameter: "Parameter",
      value: "Wert",
      range: "Referenzbereich",
      date: "Datum",
      close: "CLOSE",
      hubTitle: "NURVAN HUB",
      navHome: "Home",
      navWorkout: "Training",
      navPerf: "Stats",
      navCoach: "Coach",
      menu: "Menü"
    },
    pt: {
      appName: "NURVAN", dashboard: "PAINEL DO SISTEMA", home: "PAINEL DO SISTEMA",
      training: "TREINO", nutrition: "NUTRIÇÃO", supplementation: "SUPLEMENTOS", therapy: "TERAPIA",
      coachAI: "COACH IA", database: "BANCO DE DADOS", settings: "CONFIGURAÇÕES", importProgram: "IMPORTAR PROGRAMA",
      addDay: "Adicionar dia", importNutrition: "Importar alimentação", importSupplements: "Importar suplementação",
      importTherapy: "Importar terapia", emptyNutrition: "Sem plano alimentar. Importe um ficheiro ou adicione um dia.",
      scanBarcode: "Ler código de barras", searchBarcode: "Pesquisar",
      navHome: "Home", navWorkout: "Treino", navPerf: "Stats", navCoach: "Coach", menu: "Menu"
    },
    ru: {
      appName: "NURVAN", dashboard: "ПАНЕЛЬ СИСТЕМЫ", home: "ПАНЕЛЬ СИСТЕМЫ",
      training: "ТРЕНИРОВКА", nutrition: "ПИТАНИЕ", supplementation: "ДОБАВКИ", therapy: "ТЕРАПИЯ",
      coachAI: "COACH AI", database: "БАЗА ДАННЫХ", settings: "НАСТРОЙКИ", importProgram: "ИМПОРТ ПРОГРАММЫ",
      addDay: "Добавить день", importNutrition: "Импорт питания", importSupplements: "Импорт добавок",
      importTherapy: "Импорт терапии", emptyNutrition: "Нет плана питания. Импортируйте файл или добавьте день.",
      scanBarcode: "Сканировать штрихкод", searchBarcode: "Поиск",
      navHome: "Home", navWorkout: "Тренировка", navPerf: "Статистика", navCoach: "Coach", menu: "Меню"
    },
    zh: {
      appName: "NURVAN", dashboard: "系统面板", home: "系统面板",
      training: "训练", nutrition: "营养", supplementation: "补剂", therapy: "治疗",
      coachAI: "AI 教练", database: "数据库", settings: "设置", importProgram: "导入计划",
      addDay: "添加日", importNutrition: "导入饮食", importSupplements: "导入补剂",
      importTherapy: "导入治疗", emptyNutrition: "暂无饮食计划。请导入文件或添加一天。",
      scanBarcode: "扫描条码", searchBarcode: "搜索"
    },
    ar: {
      appName: "NURVAN", dashboard: "لوحة النظام", home: "لوحة النظام",
      training: "التدريب", nutrition: "التغذية", supplementation: "المكملات", therapy: "العلاج",
      coachAI: "مدرب AI", database: "قاعدة البيانات", settings: "الإعدادات", importProgram: "استيراد البرنامج",
      addDay: "إضافة يوم", importNutrition: "استيراد التغذية", importSupplements: "استيراد المكملات",
      importTherapy: "استيراد العلاج", emptyNutrition: "لا توجد خطة غذائية. استورد ملفاً أو أضف يوماً.",
      scanBarcode: "مسح الباركود", searchBarcode: "بحث"
    },
    hi: {
      appName: "NURVAN", dashboard: "सिस्टम डैशबोर्ड", home: "सिस्टम डैशबोर्ड",
      training: "प्रशिक्षण", nutrition: "पोषण", supplementation: "सप्लीमेंट", therapy: "थेरेपी",
      coachAI: "कोच AI", database: "डेटाबेस", settings: "सेटिंग्स", importProgram: "प्रोग्राम आयात",
      addDay: "दिन जोड़ें", importNutrition: "पोषण आयात", importSupplements: "सप्लीमेंट आयात",
      importTherapy: "थेरेपी आयात", emptyNutrition: "कोई भोजन योजना नहीं। फ़ाइल आयात करें या दिन जोड़ें।",
      scanBarcode: "बारकोड स्कैन", searchBarcode: "खोजें"
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
    // Unknown camelCase keys → readable spaced fallback (never dump raw "exportBackup")
    return String(key || '').replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); }).trim();
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
  get catalog() {
    if (typeof FOOD_CATALOG !== 'undefined' && Array.isArray(FOOD_CATALOG) && FOOD_CATALOG.length) {
      return FOOD_CATALOG.map((f) => ({
        name: f.name,
        name_en: f.name_en || '',
        brand: f.brand || '',
        category: f.category || 'Altro',
        kcal: f.kcal || f.kcalPer100 || 0,
        pro: f.pro || f.proPer100 || 0,
        carb: f.carb || f.carbPer100 || 0,
        fat: f.fat || f.fatPer100 || 0,
        serving: f.serving || '100g',
        unit: f.unit || 'g',
        aliases: f.aliases || [],
        barcode: f.barcode || null,
        source: f.source || 'local'
      }));
    }
    return [
      { name: "Petto di Pollo crudo", category: "Proteine", kcal: 110, pro: 23.0, carb: 0.0, fat: 1.2, serving: "100g" },
      { name: "Avena in fiocchi", category: "Carboidrati", kcal: 389, pro: 16.9, carb: 66.3, fat: 6.9, serving: "100g" },
      { name: "Riso Basmati", category: "Carboidrati", kcal: 360, pro: 7.0, carb: 79.0, fat: 0.6, serving: "100g" },
      { name: "Olio EVO", category: "Grassi", kcal: 884, pro: 0.0, carb: 0.0, fat: 100.0, serving: "100g" }
    ];
  },
  search(query) {
    if (typeof searchFoodCatalog === 'function') {
      return searchFoodCatalog(query, 40).map((f) => ({
        name: f.name,
        name_en: f.name_en || '',
        brand: f.brand || '',
        category: f.category || 'Altro',
        kcal: f.kcal || 0,
        pro: f.pro || 0,
        carb: f.carb || 0,
        fat: f.fat || 0,
        serving: f.serving || '100g',
        unit: f.unit || 'g',
        aliases: f.aliases || []
      }));
    }
    if (!query) return this.catalog.slice(0, 40);
    const q = String(query).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return this.catalog.filter((f) => {
      const blob = [f.name, f.name_en, f.brand, f.category, ...(f.aliases || [])].filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return blob.includes(q) || blob.split(/\s+/).some((w) => w.startsWith(q));
    }).slice(0, 40);
  },
  searchFoods(query) {
    return this.search(query);
  },
  async searchLocalThenRemote(query, opts = {}) {
    const local = this.search(query) || [];
    if (!opts.allowRemote || !query || String(query).trim().length < 2) {
      return { items: local, source: 'local' };
    }
    const remote = [];
    try {
      if (typeof coachEndpoint === 'function' && typeof apiFetch === 'function' && typeof store !== 'undefined' && store.accountToken) {
        const res = await apiFetch(coachEndpoint('/api/food/search?q=' + encodeURIComponent(query)), {
          headers: { Authorization: 'Bearer ' + store.accountToken }
        });
        if (res && res.ok) {
          const j = await (typeof readApiJson === 'function' ? readApiJson(res) : res.json());
          (j.items || j.products || []).forEach((p) => {
            remote.push({
              name: p.name || p.product_name || 'Alimento',
              brand: p.brand || '',
              category: p.category || 'Remote',
              kcal: p.kcalPer100 || p.kcal || 0,
              pro: p.proPer100 || p.pro || 0,
              carb: p.carbPer100 || p.carb || 0,
              fat: p.fatPer100 || p.fat || 0,
              serving: '100g',
              unit: 'g',
              barcode: p.barcode || null,
              source: (p.provenance && p.provenance.source) || 'remote'
            });
          });
        }
      }
    } catch (_) {}
    try {
      if (!remote.length && typeof fetch !== 'undefined') {
        const url = 'https://world.openfoodfacts.org/cgi/search.pl?search_terms=' + encodeURIComponent(query) + '&search_simple=1&action=process&json=1&page_size=12';
        const res = await fetch(url);
        const j = await res.json();
        (j.products || []).forEach((p) => {
          const n = p.nutriments || {};
          remote.push({
            name: p.product_name || p.product_name_it || p.generic_name || 'OFF',
            brand: p.brands || '',
            category: 'Open Food Facts',
            kcal: Number(n['energy-kcal_100g'] || n.energy_kcal_100g || 0) || 0,
            pro: Number(n.proteins_100g || 0) || 0,
            carb: Number(n.carbohydrates_100g || 0) || 0,
            fat: Number(n.fat_100g || 0) || 0,
            serving: '100g',
            unit: 'g',
            barcode: p.code || null,
            source: 'open_food_facts'
          });
        });
      }
    } catch (_) {}
    const merged = [...local];
    const seen = new Set(local.map((x) => String(x.name || '').toLowerCase()));
    remote.forEach((r) => {
      const k = String(r.name || '').toLowerCase();
      if (!k || seen.has(k)) return;
      seen.add(k);
      merged.push(r);
    });
    return { items: merged.slice(0, 40), source: remote.length ? 'local+remote' : 'local' };
  },
  matchFood(name) {
    const q = String(name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (!q) return null;
    let best = null;
    let bestScore = 0;
    this.catalog.forEach((f) => {
      const n = [f.name, f.name_en, ...(f.aliases || [])].filter(Boolean).join(' ').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      let score = 0;
      if (n === q || String(f.name).toLowerCase() === q) score = 100;
      else if (n.includes(q) || q.includes(String(f.name).toLowerCase())) score = 80;
      else {
        const tokens = q.split(/\s+/).filter((t) => t.length > 2);
        const hits = tokens.filter((t) => n.includes(t)).length;
        if (hits) score = 40 + hits * 20;
      }
      if (score > bestScore) { bestScore = score; best = f; }
    });
    return bestScore >= 40 ? best : null;
  },
  scaleMacros(food, grams) {
    const g = Number(grams) || 100;
    const ratio = g / 100;
    return {
      ...food,
      kcal: Math.round((food.kcal || 0) * ratio),
      pro: Math.round((food.pro || 0) * ratio * 10) / 10,
      carb: Math.round((food.carb || 0) * ratio * 10) / 10,
      fat: Math.round((food.fat || 0) * ratio * 10) / 10
    };
  }
};

const SupplementDatabaseService = {
  get catalog() {
    if (typeof SUPPLEMENT_CATALOG !== 'undefined' && Array.isArray(SUPPLEMENT_CATALOG) && SUPPLEMENT_CATALOG.length) {
      return SUPPLEMENT_CATALOG.map((s) => ({
        name: s.name,
        brand: s.brand || '',
        category: s.category || 'Altro',
        defaultDose: s.defaultDose || s.typicalDose || '',
        typicalDose: s.typicalDose || s.defaultDose || '',
        unit: s.unit || '',
        timing: s.timing || '',
        ingredient: s.ingredient || s.active_ingredient || '',
        active_ingredient: s.active_ingredient || s.ingredient || '',
        examineEvidence: s.examineEvidence || null
      }));
    }
    return [
      { name: "Creatina Monoidrato", category: "Creatina", defaultDose: "5g", timing: "Post-workout" },
      { name: "Proteine Whey Isolate", category: "Proteine", defaultDose: "30g", timing: "Post-workout" },
      { name: "Beta-Alanina", category: "Pre-workout", defaultDose: "3.2g", timing: "Pre-workout" },
      { name: "Caffeina Anidra", category: "Focus / Nootropi", defaultDose: "200mg", timing: "Pre-workout" },
      { name: "Omega-3 (EPA/DHA)", category: "Omega / Acidi grassi", defaultDose: "2-3g", timing: "Ai pasti" },
      { name: "Vitamina D3 + K2", category: "Vitamine / Multivitamin", defaultDose: "2000-4000 UI", timing: "Colazione" }
    ];
  },
  search(query) {
    if (typeof searchSupplementCatalog === 'function') {
      return searchSupplementCatalog(query);
    }
    const catalog = this.catalog;
    if (!query) {
      return catalog.slice().sort((a, b) =>
        String(a.category).localeCompare(String(b.category), 'it') ||
        String(a.name).localeCompare(String(b.name), 'it')
      );
    }
    const q = String(query).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return catalog.filter((s) => {
      const blob = [s.name, s.brand, s.category, s.ingredient, s.active_ingredient].filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (blob.includes(q)) return true;
      return blob.split(/\s+/).some((w) => w.startsWith(q));
    }).slice(0, 40);
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
  get catalog() {
    if (typeof DRUG_CATALOG !== 'undefined' && Array.isArray(DRUG_CATALOG) && DRUG_CATALOG.length) {
      return DRUG_CATALOG.map((d) => ({
        name: d.brand,
        brand: d.brand,
        class: d.category || 'Altro',
        category: d.category || 'Altro',
        ingredient: d.ingredient,
        defaultDose: d.defaultDose || '',
        timing: '',
        indications: d.ingredient || '',
        aliases: d.aliases || []
      })).sort((a, b) =>
        String(a.category).localeCompare(String(b.category), 'it') ||
        String(a.name).localeCompare(String(b.name), 'it')
      );
    }
    return [
      { name: "Cardiaspirina", class: "Cardiovascolare", category: "Cardiovascolare", defaultDose: "100mg", timing: "Dopo pranzo", indications: "Prevenzione cardiovascolare" },
      { name: "Metformina", class: "Metabolico / Diabete", category: "Metabolico / Diabete", defaultDose: "500-1000mg", timing: "Ai pasti principali", indications: "Sensibilità insulinica" },
      { name: "Eutirox (Levotiroxina)", class: "Ormonale / Tiroide", category: "Ormonale / Tiroide", defaultDose: "25-100mcg", timing: "Mattina a digiuno", indications: "Ipotiroidismo" }
    ];
  },
  search(query) {
    const catalog = this.catalog;
    if (!query) return catalog;
    const q = String(query).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return catalog.filter((d) => {
      const blob = [d.name, d.brand, d.class, d.category, d.ingredient, d.indications, ...(d.aliases || [])].filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (blob.includes(q)) return true;
      return blob.split(/\s+/).some((w) => w.startsWith(q));
    }).slice(0, 40);
  },
  searchMedications(query) {
    return this.search(query);
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
  },
  suggestMatches(rawName, limit = 5) {
    const raw = String(rawName || '').trim().toLowerCase();
    if (!raw) return [];
    const dict = typeof EXERCISE_DICTIONARY !== 'undefined' ? EXERCISE_DICTIONARY : [];
    const scored = [];
    dict.forEach((e) => {
      let score = 0;
      const name = String(e.normalized || '').toLowerCase();
      if (name === raw) score = 100;
      else if (name.includes(raw) || raw.includes(name)) score = 70;
      (e.keywords || []).forEach((kw) => {
        const k = String(kw).toLowerCase();
        if (raw.includes(k)) score = Math.max(score, 40 + Math.min(30, k.length));
        else if (k.includes(raw)) score = Math.max(score, 35);
      });
      raw.split(/[\\s\\-_\\/]+/).filter((t) => t.length > 2).forEach((t) => {
        if (name.includes(t)) score += 8;
      });
      if (score > 0) scored.push({ name: e.normalized, muscle: e.muscle, score });
    });
    scored.sort((a, b) => b.score - a.score);
    const out = [];
    const seen = {};
    scored.forEach((s) => {
      if (seen[s.name]) return;
      seen[s.name] = true;
      out.push(s);
    });
    return out.slice(0, limit);
  }
};

/** Offline intensity technique catalog (evidence-informed tools, not medical advice). */
const INTENSITY_TECHNIQUES = [
  { id: 'drop_set', label: 'Drop set / Stripping', hint: 'Riduci carico e continua senza pausa' },
  { id: 'rest_pause', label: 'Rest-pause', hint: 'Breve pausa 10–20s, stesse reps' },
  { id: 'myo_reps', label: 'Myo-reps', hint: 'Activation + mini-set a riposo breve' },
  { id: 'cluster', label: 'Cluster set', hint: 'Intra-set rest, carico alto' },
  { id: 'superset', label: 'Superset', hint: 'Due esercizi back-to-back' },
  { id: 'giant_set', label: 'Giant set', hint: '3+ esercizi in sequenza' },
  { id: 'pause_reps', label: 'Pause reps', hint: 'Pausa isometrica in fondo ROM' },
  { id: 'forced_reps', label: 'Forced reps', hint: 'Assistenza oltre il fallimento' },
  { id: 'negatives', label: 'Negatives / Eccentriche', hint: 'Enfasi fase eccentrica' },
  { id: 'partials', label: 'Partial reps', hint: 'ROM parziale post-failure' },
  { id: 'pre_exhaust', label: 'Pre-exhaust', hint: 'Isolamento prima del compound' },
  { id: 'pyramid', label: 'Pyramid', hint: 'Carico↑ reps↓' },
  { id: 'reverse_pyramid', label: 'Reverse pyramid', hint: 'Carico↓ reps↑' },
  { id: 'tempo_contrast', label: 'Tempo contrast', hint: 'Tempo lento + esplosivo' },
  { id: 'isometric', label: 'Isometria', hint: 'Hold statici' }
];
if (typeof window !== 'undefined') {
  window.INTENSITY_TECHNIQUES = INTENSITY_TECHNIQUES;
}

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
      app: "NURVAN",
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
    // Prefer live Health Connect / NativeConfig samples when present
    try {
      if (typeof NativeConfig !== 'undefined' && NativeConfig.getHealthTotals) {
        const raw = JSON.parse(NativeConfig.getHealthTotals() || '{}') || {};
        const steps = Number(raw.steps || raw.totalSteps);
        const sleepHours = Number(raw.sleepHours || raw.sleep);
        const restingHeartRate = Number(raw.restingHeartRate || raw.restingHr || raw.rhr);
        const hrvMs = Number(raw.hrvMs || raw.hrv);
        if ([steps, sleepHours, restingHeartRate, hrvMs].some((n) => Number.isFinite(n) && n > 0)) {
          return {
            steps: Number.isFinite(steps) ? steps : null,
            sleepHours: Number.isFinite(sleepHours) ? sleepHours : null,
            restingHeartRate: Number.isFinite(restingHeartRate) ? restingHeartRate : null,
            hrvMs: Number.isFinite(hrvMs) ? hrvMs : null,
            hydrationLiters: Number(raw.hydrationLiters) || null,
            source: 'health_connect'
          };
        }
      }
    } catch (_) {}
    return {
      steps: null,
      sleepHours: null,
      restingHeartRate: null,
      hrvMs: null,
      hydrationLiters: null,
      source: 'unavailable'
    };
  }
};

const ReadinessService = {
  assess(health, trainingLoad) {
    const samples = health || {};
    const hasHr = typeof samples.restingHr === 'number' || typeof samples.avgHr === 'number' || typeof samples.restingHeartRate === 'number';
    const hasSleep = typeof samples.sleepHours === 'number';
    const hasSteps = typeof samples.steps === 'number' && samples.steps > 0;
    const hasHrv = typeof samples.hrvMs === 'number';
    if (!hasHr && !hasSleep && !trainingLoad && !hasSteps) {
      return { level: 'unknown', label: 'Dati insufficienti', advice: 'Collega Health Connect o registra sonno/HR per una stima.', kind: 'estimate', confidence: 0.2 };
    }
    let score = 70;
    if (hasSleep) {
      if (samples.sleepHours < 6) score -= 20;
      else if (samples.sleepHours >= 7.5) score += 10;
    }
    const rhr = samples.restingHr != null ? samples.restingHr : samples.restingHeartRate;
    if (hasHr && samples.baselineRhr && rhr) {
      const delta = rhr - samples.baselineRhr;
      if (delta > 8) score -= 25;
      else if (delta > 4) score -= 10;
      else if (delta < -2) score += 5;
    }
    if (hasHrv && samples.baselineHrv) {
      const hrvDelta = samples.hrvMs - samples.baselineHrv;
      if (hrvDelta < -15) score -= 15;
      else if (hrvDelta > 10) score += 5;
    }
    if (hasSteps && samples.steps < 3000) score -= 5;
    if (trainingLoad && trainingLoad.highVolume) score -= 10;
    if (trainingLoad && trainingLoad.setsCompleted > 25) score -= 8;
    let level = 'good';
    let label = 'Recupero apparentemente buono';
    if (score < 45) { level = 'reduced'; label = 'Recupero apparentemente ridotto'; }
    else if (score < 60) { level = 'fair'; label = 'Recupero nella media — prudenza sui carichi massimali'; }
    return {
      level, label, score,
      advice: level === 'reduced'
        ? 'Suggerimento (non automatico): valuta volume ridotto o tecnica. Non è una diagnosi medica.'
        : 'Mantieni il piano se ti senti bene. I dati wearable sono stime, non certezza clinica.',
      kind: 'estimate',
      confidence: (hasHr && hasSleep) ? 0.55 : (hasSleep || hasHr ? 0.4 : 0.3),
      provenance: DataProvenance.make('readiness_engine', null, 'estimate', hasHr && hasSleep ? 0.55 : 0.35, 'hr_sleep_load_heuristic')
    };
  }
};

const HealthSyncService = {
  async syncFromNative() {
    let raw = {};
    try {
      if (typeof NativeConfig !== 'undefined' && NativeConfig.getHealthTotals) {
        raw = JSON.parse(NativeConfig.getHealthTotals() || '{}') || {};
      }
    } catch (_) { raw = {}; }
    const sample = {
      id: 'latest',
      steps: Number(raw.steps) || null,
      sleepHours: Number(raw.sleepHours) || null,
      restingHr: Number(raw.restingHr || raw.restingHeartRate) || null,
      avgHr: Number(raw.avgHr) || null,
      hrvMs: Number(raw.hrvMs) || null,
      kcal: Number(raw.kcal) || null,
      source: raw.source || 'health_connect_bridge',
      kind: raw.kind || 'estimate',
      confidence: raw.confidence != null ? raw.confidence : 0.4,
      updatedAt: new Date().toISOString()
    };
    if (typeof store !== 'undefined') {
      store.health = Object.assign({}, store.health || {}, sample);
    }
    try {
      if (typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.saveHealthSamples) {
        await GiammariaPersistence.saveHealthSamples(sample);
      }
    } catch (_) {}
    return sample;
  },
  async getLatest() {
    try {
      if (typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.getHealthSamples) {
        const s = await GiammariaPersistence.getHealthSamples();
        if (s) return s;
      }
    } catch (_) {}
    return this.syncFromNative();
  }
};

const ProgramGeneratorService = {
  templates: {
    'full-body-3': {
      title: 'Full Body 3 giorni',
      days: 3,
      sessions: [
        ['Squat', 'Panca Piana', 'Rematore', 'Military Press', 'Curl', 'Pushdown'],
        ['Stacco Rumeno', 'Panca Inclinata', 'Lat Pulldown', 'Alzate Laterali', 'Leg Curl', 'Calf Raise'],
        ['Front Squat', 'Dip', 'Trazioni', 'Face Pull', 'Hip Thrust', 'Plank']
      ]
    },
    'upper-lower-4': {
      title: 'Upper/Lower 4 giorni',
      days: 4,
      sessions: [
        ['Panca Piana', 'Rematore', 'Military Press', 'Lat Pulldown', 'Curl', 'Pushdown'],
        ['Squat', 'Stacco Rumeno', 'Leg Press', 'Leg Curl', 'Calf Raise', 'Hip Thrust'],
        ['Panca Inclinata', 'Trazioni', 'Alzate Laterali', 'Face Pull', 'Hammer Curl', 'French Press'],
        ['Front Squat', 'Affondi', 'Leg Extension', 'Leg Curl', 'Calf Raise', 'Plank']
      ]
    },
    'ppl-6': {
      title: 'PPL 6 giorni',
      days: 6,
      sessions: [
        ['Panca Piana', 'Panca Inclinata', 'Croci', 'Military Press', 'Alzate Laterali', 'Pushdown'],
        ['Trazioni', 'Rematore', 'Lat Pulldown', 'Face Pull', 'Curl', 'Hammer Curl'],
        ['Squat', 'Leg Press', 'Leg Extension', 'Stacco Rumeno', 'Leg Curl', 'Calf Raise'],
        ['Dip', 'Panca Inclinata', 'Military Press', 'Alzate Laterali', 'French Press', 'Pushdown'],
        ['Rematore', 'Trazioni', 'Pullover', 'Face Pull', 'Curl', 'Hammer Curl'],
        ['Front Squat', 'Affondi', 'Hip Thrust', 'Leg Curl', 'Calf Raise', 'Plank']
      ]
    }
  },
  generateLocal(opts) {
    const days = Number(opts && opts.days) || 4;
    const weeksCount = Math.min(16, Math.max(4, Number(opts && opts.weeks) || 8));
    const level = String((opts && opts.level) || 'intermediate').toLowerCase();
    const goal = String((opts && opts.goal) || 'hypertrophy').toLowerCase();
    const templateKey = (opts && opts.template) || (days >= 6 ? 'ppl-6' : days >= 4 ? 'upper-lower-4' : 'full-body-3');
    const tpl = this.templates[templateKey] || this.templates['upper-lower-4'];
    const scheme = goal === 'strength'
      ? { sets: 5, reps: '3-5', rir: 2 }
      : (goal === 'fat_loss' || goal === 'dimagrimento')
        ? { sets: 3, reps: '10-15', rir: 1 }
        : { sets: 3, reps: '8-12', rir: 2 };
    const weeks = [];
    for (let w = 1; w <= weeksCount; w++) {
      const deload = w % 4 === 0;
      const weekScheme = deload
        ? { sets: Math.max(2, scheme.sets - 1), reps: scheme.reps, rir: (scheme.rir || 2) + 1 }
        : scheme;
      weeks.push({
        week: w, week_number: w,
        label: deload ? ('Settimana ' + w + ' (deload)') : ('Settimana ' + w),
        sessions: tpl.sessions.map(function (names, si) {
          return {
            title: 'Giorno ' + (si + 1),
            day: 'Giorno ' + (si + 1),
            exercises: names.map(function (n) {
              const sets = [];
              for (let i = 0; i < weekScheme.sets; i++) {
                sets.push({ reps: weekScheme.reps, rir: weekScheme.rir, target_load: null });
              }
              return { name: n, name_original: n, setCount: weekScheme.sets, repsTarget: weekScheme.reps, sets: sets, mappingConfidence: 0.95 };
            })
          };
        })
      });
    }
    return {
      program: {
        id: 'gen_' + Date.now(),
        title: tpl.title + ' · ' + level + ' · ' + goal,
        source: 'structured_generator',
        duration_weeks: weeksCount,
        weeks: weeks,
        meta: { template: templateKey, level: level, goal: goal, days: tpl.days, generatedAt: new Date().toISOString(), method: 'rules_based_not_random' }
      }
    };
  },
  async generate(opts) {
    try {
      const base = (typeof ConfigService !== 'undefined' && ConfigService.getCoachApiUrl) ? ConfigService.getCoachApiUrl() : '';
      const token = (typeof store !== 'undefined' && store.accountToken) ? store.accountToken : '';
      if (base && token && navigator.onLine) {
        const res = await fetch(base.replace(/\\/$/, '') + '/api/program/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify(opts || {})
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.program) return { program: data.program, source: 'api' };
        }
      }
    } catch (_) {}
    const local = this.generateLocal(opts || {});
    return { program: local.program, source: 'local' };
  }
};

const CoachAnalyticsService = {
  epley1rm(load, reps) {
    const l = Number(load);
    const r = Number(reps);
    if (!Number.isFinite(l) || !Number.isFinite(r) || l <= 0 || r <= 0) return null;
    if (r === 1) return l;
    return Math.round(l * (1 + r / 30) * 10) / 10;
  },
  parseCompletedSets(storeData) {
    const re = /^w(\d+)_d(\d+)_e(\d+)_s(\d+)_(load|reps|rir|done)$/;
    const map = {};
    Object.keys(storeData || {}).forEach(function (k) {
      const m = k.match(re);
      if (!m) return;
      const id = 'w' + m[1] + '_d' + m[2] + '_e' + m[3] + '_s' + m[4];
      if (!map[id]) map[id] = { week: +m[1], day: +m[2], exIdx: +m[3], set: +m[4] };
      map[id][m[5]] = storeData[k];
    });
    const out = [];
    Object.keys(map).forEach(function (id) {
      const row = map[id];
      if (!row.done) return;
      const load = parseFloat(row.load);
      const reps = parseInt(row.reps, 10);
      if (!Number.isFinite(load) || load <= 0 || !Number.isFinite(reps) || reps <= 0) return;
      out.push({ week: row.week, day: row.day, exIdx: row.exIdx, set: row.set, load: load, reps: reps, rir: row.rir });
    });
    return out;
  },
  resolveExerciseName(data, week, day, exIdx) {
    try {
      const w = data && data.weeks && data.weeks[week - 1];
      const sess = w && (w.sessions || w.days) && (w.sessions || w.days)[day];
      const ex = sess && (sess.exercises || sess.rows) && (sess.exercises || sess.rows)[exIdx];
      if (ex) return ex.name || ex.exercise || ('Esercizio ' + exIdx);
      if (exIdx >= 900 && typeof store !== 'undefined') {
        const bonus = (store.bonus && store.bonus['w' + week + '_d' + day]) || [];
        const b = bonus[exIdx - 900];
        if (b) return b.name || b.exercise || 'Bonus';
      }
    } catch (_) {}
    return 'Esercizio ' + exIdx;
  },
  buildPerformanceSummary(storeRef, data) {
    const completed = this.parseCompletedSets(storeRef && storeRef.data);
    if (!completed.length) return { hasData: false, completedSets: 0, source: 'user_workout_logs' };
    const byExercise = {};
    completed.forEach(function (s) {
      const name = CoachAnalyticsService.resolveExerciseName(data, s.week, s.day, s.exIdx);
      if (!byExercise[name]) byExercise[name] = [];
      byExercise[name].push(s);
    });
    const exercises = Object.keys(byExercise).slice(0, 14).map(function (name) {
      const rows = byExercise[name].sort(function (a, b) {
        return a.week - b.week || a.day - b.day || a.set - b.set;
      });
      const last = rows[rows.length - 1];
      const prev = rows.length > 1 ? rows[rows.length - 2] : null;
      let bestE1rm = null;
      rows.forEach(function (r) {
        const e1 = CoachAnalyticsService.epley1rm(r.load, r.reps);
        if (e1 && (!bestE1rm || e1 > bestE1rm)) bestE1rm = e1;
      });
      let trend = 'stable';
      if (prev && last) {
        const d = (CoachAnalyticsService.epley1rm(last.load, last.reps) || 0) - (CoachAnalyticsService.epley1rm(prev.load, prev.reps) || 0);
        if (d > 1) trend = 'improving';
        else if (d < -1) trend = 'declining';
      }
      return { name: name, loggedSets: rows.length, lastLoad: last.load, lastReps: last.reps, bestE1rm: bestE1rm, trend: trend };
    });
    const bw = (storeRef && storeRef.bw) || {};
    const weeks = Object.keys(bw).map(Number).filter(function (n) { return n > 0; }).sort(function (a, b) { return a - b; });
    let weightTrend = null;
    if (weeks.length >= 2) {
      const first = parseFloat(bw[weeks[0]]);
      const lastW = parseFloat(bw[weeks[weeks.length - 1]]);
      if (Number.isFinite(first) && Number.isFinite(lastW)) {
        weightTrend = { deltaKg: Math.round((lastW - first) * 10) / 10, weeksTracked: weeks.length };
      }
    }
    return {
      hasData: true,
      completedSets: completed.length,
      exercises: exercises,
      weightTrend: weightTrend,
      source: 'user_workout_logs',
      note: 'Trend da log locali — indicativi, non certezza clinica'
    };
  },
  homeInsight(storeRef, data) {
    const perf = this.buildPerformanceSummary(storeRef, data);
    if (!perf.hasData) return 'Logga le serie completate per sbloccare insight personalizzati del Coach.';
    const improving = (perf.exercises || []).filter(function (e) { return e.trend === 'improving'; });
    if (improving.length) {
      return 'Trend positivo su ' + improving.slice(0, 2).map(function (e) { return e.name; }).join(' e ') + '. Chiedi al Coach un check volume/recupero.';
    }
    if (perf.weightTrend && perf.weightTrend.deltaKg !== 0) {
      const sign = perf.weightTrend.deltaKg > 0 ? '+' : '';
      return 'Peso ' + sign + perf.weightTrend.deltaKg + ' kg nelle ultime ' + perf.weightTrend.weeksTracked + ' settimane loggate.';
    }
    return perf.completedSets + ' serie completate. Prova: "Analizza i miei progressi" nel Coach.';
  }
};

const NotificationService = {
  async requestPermission() { return true; },
  async schedule(opts) {
    try {
      if (typeof NativeConfig !== 'undefined' && NativeConfig.scheduleReminder) {
        NativeConfig.scheduleReminder(JSON.stringify(opts || {}));
        return true;
      }
    } catch (_) {}
    return false;
  },
  async cancel(id) {
    try {
      if (typeof NativeConfig !== 'undefined' && NativeConfig.cancelReminder) {
        NativeConfig.cancelReminder(String(id || ''));
      }
    } catch (_) {}
  },
  async scheduleTherapyReminders() { return false; },
  async scheduleWorkoutReminders() { return false; }
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
