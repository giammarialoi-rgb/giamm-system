import fs from 'fs';

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Fix foodName regex
  content = content.replace(
    'foodName = foodName.replace(/^[,\\-\\u2013:\\s]+|[,\\-\\u2013:\\s]+$/g, "").trim();',
    'foodName = foodName.replace(/^[-,\u2013:\\s]+|[-,\u2013:\\s]+$/g, "").trim();'
  );
  
  // 2. Fix isExamRow regex
  content = content.replace(
    'const isExamRow = /emocromo|emoglobina|testosterone|ematocrito|glicemia|colesterolo|transaminasi|ast|alt|creatinina|referto|range|intervallo|ng\\/dl|mg\\/dl|pg\\/ml|u\\/l|%/i.test(rowStr);',
    'const isExamRow = /\\b(emocromo|emoglobina|testosterone|ematocrito|glicemia|colesterolo|transaminasi|ast|alt|creatinina|referto|sideremia|ferritina|leucociti|piastrine|eritrociti|ves|pcr|tsh|ft3|ft4|cortisolo|prolattina|estradiolo|dhea|dhea-s|psa|azotemia|uricemia|bilirubina)\\b|\\b(?:ng\\/dl|mg\\/dl|pg\\/ml|u\\/l|ug\\/dl|nmol\\/l|pmol\\/l|ui\\/l)\\b/i.test(rowStr);'
  );
  
  // 3. Fix isHeaderRow in parseTherapyExamsSheet
  const oldHeaderLogic = `        if (v.includes("data") || v.includes("date") || v.includes("settimana")) headerColMap.date = cIdx;
        else if (v.includes("farmaco") || v.includes("principio") || v.includes("medicinale") || v.includes("esame") || v.includes("parametro") || v === "voce") headerColMap.name = cIdx;
        else if (v.includes("dose") || v.includes("dosaggio") || v.includes("posologia") || v.includes("valore") || v.includes("referto")) headerColMap.value = cIdx;
        else if (v.includes("giorn") || v.includes("day") || v.includes("frequenza") || v.includes("quando")) headerColMap.days = cIdx;
        else if (v.includes("orario") || v.includes("timing") || v.includes("ora") || v.includes("momento")) headerColMap.timing = cIdx;
        else if (v.includes("durata") || v.includes("duration") || v.includes("periodo")) headerColMap.duration = cIdx;`;

  const newHeaderLogic = `        if (v.includes("durata") || v.includes("duration") || v.includes("periodo")) headerColMap.duration = cIdx;
        else if (v.includes("data") || v.includes("date")) headerColMap.date = cIdx;
        else if (v.includes("farmaco") || v.includes("principio") || v.includes("medicinale") || v.includes("esame") || v.includes("parametro") || v === "voce") headerColMap.name = cIdx;
        else if (v.includes("dose") || v.includes("dosaggio") || v.includes("posologia") || v.includes("valore") || v.includes("referto")) headerColMap.value = cIdx;
        else if (v.includes("orario") || v.includes("timing") || v.includes("ora") || v.includes("momento")) headerColMap.timing = cIdx;
        else if (v.includes("giorn") || v.includes("day") || v.includes("frequenza") || v.includes("quando")) headerColMap.days = cIdx;
        else if (v.includes("settimana")) headerColMap.date = cIdx;`;

  content = content.replace(oldHeaderLogic, newHeaderLogic);

  // 4. Fix cleanMedName regex
  content = content.replace(
    'const cleanMedName = med.replace(/(\\d+(?:[.,]\\d+)?\\s*(?:mg|mcg|g|cps|capsule|compresse|cp|fiale|fiala|ui|ml|gocce|dose|bustine))/i, "").replace(/^[,\\\\-\\u2013:\\s]+|[,\\\\-\\u2013:\\s]+$/g, "").trim() || med;',
    'const cleanMedName = med.replace(/(\\d+(?:[.,]\\d+)?\\s*(?:mg|mcg|g|cps|capsule|compresse|cp|fiale|fiala|ui|ml|gocce|dose|bustine))/i, "").replace(/^[-,\u2013:\\s]+|[-,\u2013:\\s]+$/g, "").trim() || med;'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched:', filePath);
}

patchFile('universal-import-engine.mjs');
patchFile('prepare_task20_import_engine.mjs');
