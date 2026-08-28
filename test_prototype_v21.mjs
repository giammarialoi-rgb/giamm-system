/**
 * Test Prototype for Import Engine 2.1 Semantic Extractors
 */

export function parseFoodItemString(rawStr) {
  if (!rawStr) return null;
  let str = String(rawStr).trim();
  if (!str) return null;

  let food = str;
  let quantity = null;
  let unit = "g";
  let kcal = null;
  let protein_g = null;
  let carbs_g = null;
  let fat_g = null;
  let notes = null;

  // 1. Extract Kcal & Macros if present (e.g. "350 kcal", "Prot: 30g, Carb: 50g, Fat: 5g")
  const kcalMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:kcal|calorie|cal)\b/i);
  if (kcalMatch) {
    kcal = parseFloat(kcalMatch[1]);
    str = str.replace(kcalMatch[0], "").trim();
  }

  const proMatch = str.match(/(?:pro(?:t|teine)?|p)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*g?\b/i);
  if (proMatch) {
    protein_g = parseFloat(proMatch[1]);
    str = str.replace(proMatch[0], "").trim();
  }

  const carbMatch = str.match(/(?:carb(?:o|oidrati)?|c|cho)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*g?\b/i);
  if (carbMatch) {
    carbs_g = parseFloat(carbMatch[1]);
    str = str.replace(carbMatch[0], "").trim();
  }

  const fatMatch = str.match(/(?:fat|grassi|g)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*g?\b/i);
  if (fatMatch) {
    fat_g = parseFloat(fatMatch[1]);
    str = str.replace(fatMatch[0], "").trim();
  }

  // 2. Extract parenthesized notes (e.g. "(a crudo)", "(peso a crudo)", "(opzionale)")
  const noteMatch = str.match(/\(([^)]+)\)/);
  if (noteMatch) {
    notes = noteMatch[1].trim();
    str = str.replace(noteMatch[0], "").trim();
  }

  // 3. Extract quantity & unit:
  // Examples: "250 g", "250g", "80 grammi", "3 fette biscottate", "200 ml", "2 misurini", "4 albumi", "1 mela"
  const qtyUnitMatch = str.match(/(\d+(?:[.,]\d+)?)\s*(g|gr|grammi|ml|l|litri|cps|capsule|compresse|cp|fette|fetta|scoop|misurini|misurino|porzioni|porzione|pz|pezzi|cucchiai|cucchiaio|uova|albumi)\b/i);
  if (qtyUnitMatch) {
    quantity = parseFloat(qtyUnitMatch[1].replace(",", "."));
    const rawUnit = qtyUnitMatch[2].toLowerCase();
    if (rawUnit === "gr" || rawUnit === "grammi") unit = "g";
    else if (rawUnit === "litri" || rawUnit === "l") unit = "ml";
    else if (rawUnit === "compresse" || rawUnit === "cp") unit = "compresse";
    else if (rawUnit === "capsule" || rawUnit === "cps") unit = "capsule";
    else if (rawUnit === "fetta" || rawUnit === "fette") unit = "fette";
    else if (rawUnit === "misurino" || rawUnit === "misurini" || rawUnit === "scoop") unit = "misurino";
    else if (rawUnit === "cucchiaio" || rawUnit === "cucchiai") unit = "cucchiaio";
    else if (rawUnit === "pz" || rawUnit === "pezzi") unit = "pz";
    else unit = rawUnit;

    food = str.replace(qtyUnitMatch[0], "").replace(/^[,\-–:\s]+|[,\-–:\s]+$/g, "").trim();
  } else {
    // Check if leading number alone e.g. "2 mele", "1 banana"
    const leadingNumMatch = str.match(/^(\d+(?:[.,]\d+)?)\s+([a-zA-ZÀ-ÿ\s'-]+)$/);
    if (leadingNumMatch) {
      quantity = parseFloat(leadingNumMatch[1].replace(",", "."));
      unit = "pz";
      food = leadingNumMatch[2].trim();
    } else {
      food = str.replace(/^[,\-–:\s]+|[,\-–:\s]+$/g, "").trim();
    }
  }

  if (!food) food = rawStr.trim();

  return {
    name: food,
    food: food,
    quantity: quantity !== null ? quantity : (food.match(/\d+/) ? food.replace(/[^0-9.]/g, "") : ""),
    unit: unit || "g",
    kcal: kcal !== null ? kcal : null,
    protein_g: protein_g !== null ? protein_g : null,
    carbs_g: carbs_g !== null ? carbs_g : null,
    fat_g: fat_g !== null ? fat_g : null,
    notes: notes || null
  };
}

export function parseTherapyItem(nameRaw, doseRaw, timingRaw, durationRaw, notesRaw) {
  const name = String(nameRaw || "").trim();
  let dose = String(doseRaw || "").trim();
  let duration = String(durationRaw || "").trim();
  let timing = String(timingRaw || "").trim();
  let notes = notesRaw ? String(notesRaw).trim() : null;

  if (!dose && name) {
    const doseMatch = name.match(/(\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|cps|capsule|compresse|cp|fiale|fiala|ui|ml|gocce|dose|bustine))/i);
    if (doseMatch) {
      dose = doseMatch[1].trim();
    }
  }

  let durationWeeks = null;
  const durMatch = (duration + " " + notes + " " + name).match(/(\d+)\s*(?:settimane|sett|weeks|w)\b/i);
  if (durMatch) {
    durationWeeks = parseInt(durMatch[1], 10);
  }

  // Days detection
  const allText = (timing + " " + notes + " " + dose + " " + name).toUpperCase();
  const daysDetected = [];
  if (allText.includes("LUNED") || allText.includes("MON")) daysDetected.push("Lunedì");
  if (allText.includes("MARTED") || allText.includes("TUE")) daysDetected.push("Martedì");
  if (allText.includes("MERCOLED") || allText.includes("WED")) daysDetected.push("Mercoledì");
  if (allText.includes("GIOVED") || allText.includes("THU")) daysDetected.push("Giovedì");
  if (allText.includes("VENERD") || allText.includes("FRI")) daysDetected.push("Venerdì");
  if (allText.includes("SABATO") || allText.includes("SAT")) daysDetected.push("Sabato");
  if (allText.includes("DOMENICA") || allText.includes("SUN")) daysDetected.push("Domenica");

  let days = daysDetected.length > 0 ? daysDetected : ["Tutti i giorni"];
  if (allText.includes("TUTTI I GIORNI") || allText.includes("QUOTIDIANO") || allText.includes("DAILY")) {
    days = ["Tutti i giorni"];
  }

  return {
    medication: name.replace(/(\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|cps|capsule|compresse|cp|fiale|fiala|ui|ml|gocce|dose|bustine))/i, "").replace(/^[,\-–:\s]+|[,\-–:\s]+$/g, "").trim() || name,
    name: name,
    dose: dose || "1 dose",
    unit: dose.replace(/[0-9.,\s]/g, "") || "dose",
    days: days,
    duration_weeks: durationWeeks,
    duration_text: durationWeeks ? `${durationWeeks} settimane` : (duration || null),
    timing: timing || null,
    notes: notes
  };
}

console.log("Food test 1:", parseFoodItemString("Albume d'uovo 250g 130 kcal (a crudo)"));
console.log("Food test 2:", parseFoodItemString("Fiocchi d'avena 80 g - Prot: 11g, Carb: 55g, Fat: 6g"));
console.log("Food test 3:", parseFoodItemString("3 fette biscottate integrali"));
console.log("Therapy test 1:", parseTherapyItem("Farmaco X 100 mg", "1 compressa", "Lunedì e Giovedì", "8 settimane", "Ore 08:00"));
console.log("Therapy test 2:", parseTherapyItem("Cardioaspirina 100mg", "1 cp", "Quotidiano", "12 settimane", "Post-pranzo"));
