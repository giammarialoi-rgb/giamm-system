import fs from 'fs';
import * as XLSX from 'xlsx';

export function createComplexSyntheticWorkbook() {
  const wb = XLSX.utils.book_new();

  // 1. Training Sheet W01
  const wsTrainingData = [
    ["SETTIMANA 01 • ACCUMULO 1"],
    ["GIORNO 1 • UPPER A — PETTO + DORSO"],
    ["Movimento", "Esercizio effettivo", "Set", "Reps target", "RIR target", "Recupero", "Carico pianificato", null, null, null, "Note"],
    ["Panca orizzontale", "Panca piana bilanciere", 1, "5–7", 2, "3–4 min", 130, null, null, null, "TOP SET"],
    ["Panca orizzontale", "Panca piana bilanciere", 2, "7–9", 2, "3 min", 115, null, null, null, "BACK-OFF"],
    ["Lat verticale", "Lat machine presa larga", 1, "4x25-20-15-10", 2, "2–3 min", 90, null, null, null, "PIRAMIDALE"],
    ["GIORNO 2 • LOWER A — GAMBE + POLPACCI"],
    ["Movimento", "Esercizio effettivo", "Set", "Reps target", "RIR target", "Recupero", "Carico pianificato", null, null, null, "Note"],
    ["Quad squat", "Squat bilanciere", 1, "6–10", 2, "3–4 min", 170, null, null, null, null],
    ["Flessione ginocchio", "Leg curl sdraiato", 1, "10–12", 1, "90s", 45, null, null, null, null]
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsTrainingData), "W01");

  // 2. Nutrition Sheet (ALIMENTAZIONE) - Detailed with Days, Meals, Foods, Quantities, Units, Kcal, Macros, Notes
  const wsNutData = [
    ["PIANO ALIMENTARE PERSONALIZZATO • GIAMMARIA SYSTEM"],
    ["LUNEDÌ"],
    ["Colazione", "Albume d'uovo", 250, "g", 130, 27, 1.5, 0.5, "Cotto in padella antiaderente"],
    [null, "Fiocchi d'avena integrali", 80, "g", 300, 11, 55, 6, "Macinati o porridge"],
    [null, "Burro d'arachidi 100%", 15, "g", 90, 4, 2, 8, null],
    ["Spuntino Mattina", "Yogurt Greco 0%", 170, "g", 95, 17, 6, 0, null],
    [null, "Mandorle", 20, "g", 120, 4, 3, 10, null],
    ["Pranzo", "Riso Basmati", 120, "g", 420, 9, 90, 1, "Peso a crudo"],
    [null, "Petto di Pollo", 200, "g", 220, 46, 0, 3, "Ai ferri con spezie"],
    [null, "Olio Extravergine d'Oliva", 10, "g", 90, 0, 0, 10, "A crudo"],
    [null, "Zucchine grigliate", 200, "g", 35, 3, 6, 0.5, null],
    ["Merenda", "Proteine Whey Isolate", 30, "g", 115, 27, 1, 0.5, "Shaker in 250ml acqua"],
    [null, "Mela", 150, "g", 80, 0.5, 20, 0.3, "1 frutto medio"],
    ["Cena", "Salmone fresco", 180, "g", 360, 36, 0, 24, "Al vapore"],
    [null, "Patate dolci al forno", 250, "g", 215, 4, 50, 0.2, null],
    [null, "Spinaci freschi", 150, "g", 35, 4, 3, 0.5, null],
    ["Pre-nanna", "Fiocchi di latte magri", 150, "g", 110, 18, 4, 3, null],
    ["MARTEDÌ"],
    ["Colazione", "Pancake proteici (albumi + avena)", 1, "porzione", 350, 30, 45, 5, null],
    ["Pranzo", "Pasta integrale", 100, "g", 350, 13, 68, 2, null],
    [null, "Filetto di manzo magro", 180, "g", 240, 40, 0, 9, null],
    ["Cena", "Merluzzo al forno", 250, "g", 200, 44, 0, 2, null],
    [null, "Riso Venere", 80, "g", 280, 7, 58, 2, null]
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsNutData), "ALIMENTAZIONE");

  // 3. Supplementation Sheet (INTEGRAZIONE)
  const wsSuppData = [
    ["PIANO SUPPLEMENTI ED INTEGRAZIONE"],
    ["Integratore", "Dose", "Unità", "Timing", "Frequenza", "Note"],
    ["Creatina Monoidrato", 5, "g", "Post-workout", "Quotidiano", "Assumere con 300ml acqua e carboidrati"],
    ["Whey Isolate", 30, "g", "Post-workout / Merenda", "Giorni ON", "Shaker con acqua"],
    ["Omega 3 IFOS", 3, "capsule", "Colazione", "Quotidiano", "Ai pasti"],
    ["Multivitaminico", 1, "compressa", "Colazione", "Quotidiano", "Con il primo pasto"],
    ["Magnesio Bisglicinato", 400, "mg", "Prima di dormire", "Quotidiano", "30 minuti prima di coricarsi"],
    ["Caffeina Anidra", 200, "mg", "Pre-workout", "Giorni ON", "30-45 min prima dell'allenamento"]
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsSuppData), "INTEGRAZIONE");

  // 4. Therapy Sheet (TERAPIA)
  const wsTherapyData = [
    ["PIANO TERAPIA CLINICA"],
    ["Farmaco / Medicinale", "Dose", "Giorno / Frequenza", "Durata", "Orario / Timing", "Note"],
    ["Farmaco X", "1 compressa", "Lunedì", "8 settimane", "Ore 08:00", "A digiuno"],
    ["Farmaco X", "1 compressa", "Mercoledì", "8 settimane", "Ore 08:00", "A digiuno"],
    ["Farmaco X", "1 compressa", "Venerdì", "8 settimane", "Ore 08:00", "A digiuno"],
    ["Farmaco Y", "2 compresse", "Giovedì", "6 settimane", "Ore 20:00", "Post-cena"],
    ["Farmaco Z", "1 dose", "Lunedì e Giovedì", "8 settimane", "Ore 09:00", "Sotto monitoraggio"]
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsTherapyData), "TERAPIA");

  // 5. Exams Sheet (ESAMI)
  const wsExamsData = [
    ["ESAMI DEL SANGUE & DATI CLINICI"],
    ["Data", "Parametro / Esame", "Valore", "Unità", "Intervallo di Riferimento", "Note"],
    ["2026-08-15", "Emoglobina", 15.4, "g/dL", "13.5 - 17.5", "Nella norma"],
    ["2026-08-15", "Ematocrito", 46.2, "%", "40.0 - 52.0", "Ottimale"],
    ["2026-08-15", "Testosterone Totale", 650, "ng/dL", "300 - 1000", "Profilo eugonadico"],
    ["2026-08-15", "Estradiolo (E2)", 24.5, "pg/mL", "11.0 - 44.0", "Bilanciato"],
    ["2026-08-15", "Glicemia a digiuno", 88, "mg/dL", "70 - 99", "Eccellente sensibilità"],
    ["2026-08-15", "AST (GOT)", 26, "U/L", "10 - 40", "Normale"],
    ["2026-08-15", "ALT (GPT)", 28, "U/L", "10 - 45", "Normale"],
    ["2026-08-15", "Creatinina", 1.05, "mg/dL", "0.7 - 1.2", "Funzione renale preservata"]
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsExamsData), "ESAMI");

  return wb;
}

const wb = createComplexSyntheticWorkbook();
XLSX.writeFile(wb, "synthetic_complex_test.xlsx");
console.log("Created synthetic_complex_test.xlsx successfully!");
