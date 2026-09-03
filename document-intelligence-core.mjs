/**
 * GIAMMARIA SYSTEM — UNIVERSAL DOCUMENT INTELLIGENCE CORE
 * Format detection, DocumentIR, table reconstruction, source refs,
 * validation helpers, OCR bridge, search & provenance.
 * Deterministic first — LLM only for ambiguous semantic mapping.
 */

export const DI_VERSION = "1.0.0";
export const DI_MAX_BYTES = 12 * 1024 * 1024;

export const DI_PIPELINE_STAGES = [
  { id: "upload", label: "Upload", pct: 5 },
  { id: "detect", label: "Detecting format", pct: 12 },
  { id: "read", label: "Reading document", pct: 22 },
  { id: "ocr", label: "OCR", pct: 35 },
  { id: "structure", label: "Detecting structure", pct: 48 },
  { id: "tables", label: "Reconstructing tables", pct: 60 },
  { id: "semantic", label: "Understanding content", pct: 72 },
  { id: "match", label: "Matching database", pct: 84 },
  { id: "validate", label: "Validation", pct: 92 },
  { id: "ready", label: "Ready for review", pct: 100 }
];

export function createSourceRef(partial = {}) {
  return {
    fileId: partial.fileId || null,
    filename: partial.filename || null,
    sheet: partial.sheet != null ? partial.sheet : null,
    cell: partial.cell != null ? partial.cell : null,
    page: partial.page != null ? partial.page : null,
    tableId: partial.tableId != null ? partial.tableId : null,
    row: partial.row != null ? partial.row : null,
    col: partial.col != null ? partial.col : null,
    line: partial.line != null ? partial.line : null,
    parser: partial.parser || null,
    rawSnippet: partial.rawSnippet != null ? String(partial.rawSnippet).slice(0, 240) : null
  };
}

export function createEmptyDocumentIR(meta = {}) {
  return {
    version: DI_VERSION,
    document: {
      id: meta.id || ("doc_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7)),
      filename: meta.filename || "documento",
      mime: meta.mime || "application/octet-stream",
      magicType: meta.magicType || "unknown",
      extension: meta.extension || "",
      size: meta.size || 0,
      pageCount: meta.pageCount || 0,
      sheetCount: meta.sheetCount || 0,
      classification: meta.classification || "UNKNOWN",
      hasText: false,
      hasImages: false,
      hasTables: false,
      hasFormulas: false,
      hasScannedContent: false,
      createdAt: new Date().toISOString()
    },
    sheets: [],
    pages: [],
    sections: [],
    blocks: [],
    tables: [],
    images: [],
    extractions: [],
    unmapped: [],
    warnings: [],
    errors: [],
    originalText: "",
    originalBlobRef: meta.originalBlobRef || null
  };
}

/**
 * Magic-byte + MIME + extension format detection. Never trusts extension alone.
 */
export function detectFormat(bytes, filename = "", mimeType = "") {
  const u8 = toUint8(bytes);
  const ext = getExt(filename);
  const mime = String(mimeType || "").toLowerCase();
  const warnings = [];
  let magicType = "unknown";
  let confidence = 0.5;

  if (u8 && u8.length >= 4) {
    if (u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46) {
      magicType = "pdf";
      confidence = 0.99;
    } else if (u8[0] === 0x50 && u8[1] === 0x4b && u8[2] === 0x03 && u8[3] === 0x04) {
      // ZIP container: xlsx / docx / odt
      const sniff = asciiSlice(u8, 0, Math.min(u8.length, 2000));
      if (/word\//i.test(sniff) || ext === ".docx") magicType = "docx";
      else if (/xl\//i.test(sniff) || /worksheets/i.test(sniff) || ext === ".xlsx") magicType = "xlsx";
      else if (ext === ".docx") magicType = "docx";
      else if (ext === ".xlsx") magicType = "xlsx";
      else magicType = "zip";
      confidence = 0.92;
    } else if (u8[0] === 0xd0 && u8[1] === 0xcf && u8[2] === 0x11 && u8[3] === 0xe0) {
      // OLE compound: doc / xls
      if (ext === ".xls" || mime.includes("excel")) magicType = "xls";
      else if (ext === ".doc" || mime.includes("msword")) magicType = "doc";
      else magicType = "ole";
      confidence = 0.9;
    } else if (u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) {
      magicType = "jpeg";
      confidence = 0.99;
    } else if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) {
      magicType = "png";
      confidence = 0.99;
    } else if (u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46) {
      magicType = "webp";
      confidence = 0.85;
    } else {
      const head = asciiSlice(u8, 0, Math.min(u8.length, 512));
      if (/^[\x09\x0a\x0d\x20-\x7e\u00a0-\u024f]{20,}/.test(head) || ext === ".txt" || ext === ".csv" || ext === ".json") {
        if (ext === ".csv" || (head.includes(",") && head.includes("\n") && !head.includes("{"))) magicType = "csv";
        else if (ext === ".json" || /^\s*[\{\[]/.test(head)) magicType = "json";
        else magicType = "txt";
        confidence = 0.75;
      }
    }
  }

  // Extension / MIME mismatch warnings
  const extMap = {
    ".pdf": "pdf", ".docx": "docx", ".doc": "doc", ".xlsx": "xlsx", ".xls": "xls",
    ".csv": "csv", ".txt": "txt", ".json": "json", ".png": "png", ".jpg": "jpeg",
    ".jpeg": "jpeg", ".webp": "webp"
  };
  const expected = extMap[ext];
  if (expected && magicType !== "unknown" && expected !== magicType && !(expected === "jpeg" && magicType === "jpeg")) {
    if (!(expected === "xls" && magicType === "ole") && !(expected === "doc" && magicType === "ole")) {
      warnings.push(`Estensione ${ext} non coincide con contenuto rilevato (${magicType}).`);
    }
  } else if (ext && !expected && magicType !== "unknown" && magicType !== "zip" && magicType !== "ole") {
    warnings.push(`Estensione ${ext || "(nessuna)"} non tipica per contenuto ${magicType}.`);
  }
  if (mime.includes("pdf") && magicType !== "pdf" && magicType !== "unknown") {
    warnings.push(`MIME pdf non coincide con magic (${magicType}).`);
  }

  const route = resolveRoute(magicType, ext, mime);
  return {
    magicType,
    extension: ext,
    mime: mime || guessMime(magicType),
    route,
    confidence,
    size: u8 ? u8.length : 0,
    warnings,
    needsOcr: route === "image" || route === "pdf_scan"
  };
}

function resolveRoute(magicType, ext, mime) {
  if (magicType === "xlsx" || magicType === "xls" || ext === ".xlsx" || ext === ".xls") return "excel";
  if (magicType === "docx" || ext === ".docx") return "docx";
  if (magicType === "doc" || ext === ".doc") return "doc";
  if (magicType === "pdf" || ext === ".pdf") return "pdf";
  if (magicType === "png" || magicType === "jpeg" || magicType === "webp" ||
      [".png", ".jpg", ".jpeg", ".webp"].includes(ext)) return "image";
  if (magicType === "csv" || ext === ".csv") return "csv";
  if (magicType === "json" || ext === ".json") return "json";
  if (magicType === "txt" || ext === ".txt") return "txt";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "excel";
  if (mime.includes("wordprocessingml")) return "docx";
  if (mime.includes("msword")) return "doc";
  if (mime.includes("pdf")) return "pdf";
  if (mime.startsWith("image/")) return "image";
  return "text";
}

/**
 * Expand SheetJS merges into a cell grid with rowspan/colspan metadata.
 */
export function expandMergesToGrid(rawRows, merges = []) {
  const height = (rawRows || []).length;
  let width = 0;
  (rawRows || []).forEach((r) => { if ((r || []).length > width) width = r.length; });
  const grid = [];
  for (let r = 0; r < height; r++) {
    const row = [];
    for (let c = 0; c < width; c++) {
      const val = (rawRows[r] && rawRows[r][c] != null) ? rawRows[r][c] : null;
      row.push({
        row: r,
        col: c,
        value: val,
        displayValue: val == null ? "" : String(val).trim(),
        formula: null,
        rowSpan: 1,
        colSpan: 1,
        isMergeOrigin: false,
        isMergeCovered: false,
        confidence: 1,
        originalText: val == null ? "" : String(val)
      });
    }
    grid.push(row);
  }

  (merges || []).forEach((m) => {
    const sr = m.s?.r ?? m.startRow ?? 0;
    const sc = m.s?.c ?? m.startCol ?? 0;
    const er = m.e?.r ?? m.endRow ?? sr;
    const ec = m.e?.c ?? m.endCol ?? sc;
    if (!grid[sr] || !grid[sr][sc]) return;
    const origin = grid[sr][sc];
    origin.rowSpan = er - sr + 1;
    origin.colSpan = ec - sc + 1;
    origin.isMergeOrigin = true;
    for (let r = sr; r <= er; r++) {
      for (let c = sc; c <= ec; c++) {
        if (r === sr && c === sc) continue;
        if (grid[r] && grid[r][c]) {
          grid[r][c].isMergeCovered = true;
          grid[r][c].value = null;
          grid[r][c].displayValue = "";
          grid[r][c].mergeParent = { row: sr, col: sc };
        }
      }
    }
  });

  return { grid, height, width, mergedCells: (merges || []).map((m) => ({
    row: m.s?.r ?? 0,
    col: m.s?.c ?? 0,
    rowSpan: (m.e?.r ?? m.s?.r ?? 0) - (m.s?.r ?? 0) + 1,
    colSpan: (m.e?.c ?? m.s?.c ?? 0) - (m.s?.c ?? 0) + 1
  })) };
}

/**
 * Reconstruct one or more table regions from an Excel sheet cell model.
 * Detects blank-row separators as independent semantic regions.
 */
export function reconstructTablesFromSheet(sheet, fileId = null) {
  const rawRows = sheet.rawRows || [];
  const formulaMap = sheet.formulaMap || {};
  const merges = sheet.merges || [];
  const { grid, mergedCells } = expandMergesToGrid(rawRows, merges);
  const regions = splitSheetRegions(rawRows);
  const tables = [];

  regions.forEach((region, idx) => {
    const slice = grid.slice(region.start, region.end);
    if (!slice.length) return;
    const nonEmptyRows = slice.filter((row) => row.some((c) => c.displayValue));
    if (nonEmptyRows.length < 1) return;

    const headerRow = nonEmptyRows[0];
    const columns = headerRow.map((c, i) => c.displayValue || ("Col" + (i + 1)));
    const dataRows = nonEmptyRows.slice(1).map((row, ri) => {
      const cells = row.map((c, ci) => {
        const addr = excelAddress(region.start + findGridOffset(grid, c.row), c.col);
        const formula = formulaMap[addr] || formulaMap[excelAddress(c.row, c.col)] || null;
        return {
          row: ri,
          column: ci,
          value: c.value,
          displayValue: c.displayValue,
          formula: formula ? ("=" + formula.replace(/^=/, "")) : null,
          rowSpan: c.rowSpan,
          colSpan: c.colSpan,
          confidence: 1,
          originalText: c.originalText,
          sourceRef: createSourceRef({
            fileId,
            sheet: sheet.name,
            cell: addr || excelAddress(c.row, c.col),
            row: c.row + 1,
            col: c.col + 1,
            tableId: null,
            parser: "excel_sheet_region"
          })
        };
      });
      const obj = {};
      columns.forEach((col, i) => { obj[col] = cells[i] ? cells[i].displayValue : ""; });
      return { cells, values: obj };
    });

    const tableId = "tbl_" + (sheet.name || "sheet").replace(/\W+/g, "_") + "_" + idx;
    cellsAttachTableId(dataRows, tableId);
    tables.push({
      id: tableId,
      documentId: fileId,
      pageStart: null,
      pageEnd: null,
      sheetName: sheet.name,
      title: columns.slice(0, 3).filter(Boolean).join(" | ").slice(0, 80) || sheet.name,
      columns,
      rows: dataRows,
      mergedCells: mergedCells.filter((m) => m.row >= region.start && m.row < region.end),
      confidence: 0.9,
      sourceReference: createSourceRef({ fileId, sheet: sheet.name, parser: "excel_sheet_region", tableId }),
      regionStart: region.start,
      regionEnd: region.end
    });
  });

  return tables;
}

function splitSheetRegions(rawRows) {
  const regions = [];
  let start = 0;
  let blankRun = 0;
  for (let i = 0; i < (rawRows || []).length; i++) {
    const empty = !(rawRows[i] || []).some((v) => v != null && String(v).trim() !== "");
    if (empty) {
      blankRun++;
      if (blankRun >= 2 && i - start > 1) {
        regions.push({ start, end: i - blankRun + 1 });
        start = i + 1;
        blankRun = 0;
      }
    } else {
      blankRun = 0;
    }
  }
  if (start < (rawRows || []).length) regions.push({ start, end: rawRows.length });
  if (!regions.length) regions.push({ start: 0, end: (rawRows || []).length });
  return regions;
}

function findGridOffset(grid, rowIdx) {
  return rowIdx;
}

function cellsAttachTableId(dataRows, tableId) {
  dataRows.forEach((r) => {
    (r.cells || []).forEach((c) => {
      if (c.sourceRef) c.sourceRef.tableId = tableId;
    });
  });
}

/**
 * Build DocumentIR from structured workbook (SheetJS).
 */
export function buildIRFromWorkbook(structured, filename, detectMeta = {}) {
  const ir = createEmptyDocumentIR({
    filename,
    mime: detectMeta.mime,
    magicType: detectMeta.magicType || "xlsx",
    extension: detectMeta.extension,
    size: detectMeta.size,
    sheetCount: (structured.sheets || []).length,
    classification: "UNKNOWN"
  });
  ir.document.hasTables = true;
  const allTables = [];
  const unrecognised = [];

  (structured.sheets || []).forEach((sheet) => {
    const sheetType = typeof classifySheetType === "function"
      ? classifySheetType(sheet.name, sheet.rawRows)
      : (sheet.sheetType || "other");
    const hasFormula = sheet.formulaMap && Object.keys(sheet.formulaMap).length > 0;
    if (hasFormula) ir.document.hasFormulas = true;

    const cellModel = [];
    (sheet.rows || []).forEach((row) => {
      (row.cells || []).forEach((cell) => {
        const formula = sheet.formulaMap?.[cell.address] || null;
        cellModel.push({
          ...cell,
          formula: formula ? ("=" + String(formula).replace(/^=/, "")) : null,
          displayValue: cell.displayValue,
          value: cell.rawValue,
          type: formula ? "formula" : cell.type
        });
      });
    });

    const tables = reconstructTablesFromSheet(sheet, ir.document.id);
    tables.forEach((t) => allTables.push(t));

    ir.sheets.push({
      name: sheet.name,
      index: sheet.index,
      sheetType,
      rowCount: (sheet.rawRows || []).length,
      colCount: sheet.rawRows?.[0]?.length || 0,
      hasFormulas: hasFormula,
      merges: sheet.merges || [],
      tableIds: tables.map((t) => t.id),
      cellModelSample: cellModel.slice(0, 50)
    });

    if (sheetType === "other" && tables.length === 0) {
      unrecognised.push({
        type: "sheet",
        name: sheet.name,
        reason: "unclassified_sheet",
        sourceRef: createSourceRef({ fileId: ir.document.id, sheet: sheet.name, parser: "sheet_classifier" })
      });
    }
  });

  ir.tables = allTables;
  ir.document.hasTables = allTables.length > 0;
  ir.unmapped = unrecognised;
  ir.document.classification = classifyDocumentFromSignals({
    sheets: ir.sheets,
    tableCount: allTables.length,
    hasTraining: ir.sheets.some((s) => s.sheetType === "training"),
    hasNutrition: ir.sheets.some((s) => s.sheetType === "nutrition"),
    hasSupplements: ir.sheets.some((s) => s.sheetType === "supplementation")
  });
  ir.document.hasText = true;
  return ir;
}

/**
 * Reconstruct tables from DOCX w:tbl XML.
 */
export function reconstructTablesFromDocxXml(xml, fileId = null) {
  const tables = [];
  if (!xml) return tables;
  const tblRe = /<w:tbl\b[\s\S]*?<\/w:tbl>/gi;
  let m;
  let tIdx = 0;
  while ((m = tblRe.exec(xml)) !== null) {
    const tblXml = m[0];
    const rows = [];
    const trRe = /<w:tr\b[\s\S]*?<\/w:tr>/gi;
    let tr;
    while ((tr = trRe.exec(tblXml)) !== null) {
      const cells = [];
      const tcRe = /<w:tc\b[\s\S]*?<\/w:tc>/gi;
      let tc;
      while ((tc = tcRe.exec(tr[0])) !== null) {
        const text = xmlTextContent(tc[0]).replace(/\s+/g, " ").trim();
        const spanMatch = tc[0].match(/w:gridSpan\s+w:val="(\d+)"/i) || tc[0].match(/w:val="(\d+)"[^>]*w:gridSpan/i);
        const colSpan = spanMatch ? parseInt(spanMatch[1], 10) : 1;
        const vMerge = /w:vMerge/.test(tc[0]);
        cells.push({
          value: text || null,
          displayValue: text,
          formula: null,
          rowSpan: vMerge ? 1 : 1,
          colSpan,
          confidence: 0.95,
          originalText: text,
          isMergeCovered: vMerge && !/w:vMerge\s+w:val="restart"/i.test(tc[0])
        });
      }
      if (cells.length) rows.push(cells);
    }
    if (!rows.length) continue;
    const columns = rows[0].map((c, i) => c.displayValue || ("Col" + (i + 1)));
    const dataRows = rows.slice(1).map((row, ri) => {
      const cellObjs = row.map((c, ci) => ({
        row: ri,
        column: ci,
        ...c,
        sourceRef: createSourceRef({
          fileId,
          tableId: "docx_tbl_" + tIdx,
          row: ri + 2,
          col: ci + 1,
          parser: "docx_w_tbl",
          rawSnippet: c.originalText
        })
      }));
      const values = {};
      columns.forEach((col, i) => { values[col] = cellObjs[i]?.displayValue || ""; });
      return { cells: cellObjs, values };
    });
    tables.push({
      id: "docx_tbl_" + tIdx,
      documentId: fileId,
      title: columns.slice(0, 3).join(" | ").slice(0, 80),
      columns,
      rows: dataRows,
      mergedCells: [],
      confidence: 0.9,
      sourceReference: createSourceRef({ fileId, tableId: "docx_tbl_" + tIdx, parser: "docx_w_tbl" })
    });
    tIdx++;
  }
  return tables;
}

/**
 * Reconstruct tables from PDF positioned text items [{str,x,y,w,h}].
 */
export function reconstructTablesFromPositionedText(items, page = 1, fileId = null) {
  if (!items || !items.length) return [];
  const rowsMap = new Map();
  const yTol = 3;
  items.forEach((it) => {
    const y = Math.round((it.y || 0) / yTol) * yTol;
    if (!rowsMap.has(y)) rowsMap.set(y, []);
    rowsMap.get(y).push(it);
  });
  const sortedYs = Array.from(rowsMap.keys()).sort((a, b) => b - a);
  const lines = sortedYs.map((y) => {
    const cells = rowsMap.get(y).sort((a, b) => (a.x || 0) - (b.x || 0));
    return { y, cells, text: cells.map((c) => c.str || "").join(" ").trim() };
  }).filter((l) => l.text);

  // Cluster into table candidates: consecutive lines with similar column counts (>=2)
  const tables = [];
  let buf = [];
  const flush = () => {
    if (buf.length < 2) { buf = []; return; }
    const colXs = inferColumnXs(buf);
    if (colXs.length < 2) { buf = []; return; }
    const matrix = buf.map((line) => assignToColumns(line.cells, colXs));
    const columns = matrix[0].map((c, i) => c || ("Col" + (i + 1)));
    const dataRows = matrix.slice(1).map((row, ri) => {
      const cellObjs = row.map((val, ci) => ({
        row: ri,
        column: ci,
        value: val || null,
        displayValue: val || "",
        formula: null,
        rowSpan: 1,
        colSpan: 1,
        confidence: 0.85,
        originalText: val || "",
        sourceRef: createSourceRef({
          fileId, page, tableId: "pdf_tbl_" + tables.length, row: ri + 2, col: ci + 1, parser: "pdf_positioned"
        })
      }));
      const values = {};
      columns.forEach((col, i) => { values[col] = cellObjs[i]?.displayValue || ""; });
      return { cells: cellObjs, values };
    });
    tables.push({
      id: "pdf_tbl_" + tables.length + "_p" + page,
      documentId: fileId,
      pageStart: page,
      pageEnd: page,
      title: columns.slice(0, 3).join(" | ").slice(0, 80),
      columns,
      rows: dataRows,
      mergedCells: [],
      confidence: 0.8,
      sourceReference: createSourceRef({ fileId, page, parser: "pdf_positioned" })
    });
    buf = [];
  };

  lines.forEach((line) => {
    const nCols = line.cells.length;
    if (nCols >= 2) buf.push(line);
    else flush();
  });
  flush();
  return tables;
}

function inferColumnXs(lines) {
  const xs = [];
  lines.forEach((l) => l.cells.forEach((c) => xs.push(Math.round(c.x || 0))));
  xs.sort((a, b) => a - b);
  const clusters = [];
  xs.forEach((x) => {
    const last = clusters[clusters.length - 1];
    if (!last || Math.abs(last - x) > 12) clusters.push(x);
  });
  return clusters.slice(0, 15);
}

function assignToColumns(cells, colXs) {
  const out = colXs.map(() => "");
  cells.forEach((c) => {
    let best = 0;
    let bestD = Infinity;
    colXs.forEach((x, i) => {
      const d = Math.abs((c.x || 0) - x);
      if (d < bestD) { bestD = d; best = i; }
    });
    out[best] = (out[best] ? out[best] + " " : "") + (c.str || "");
  });
  return out.map((s) => s.trim());
}

/**
 * Estimate if PDF needs OCR (very little extractable text).
 */
export function pdfNeedsOcr(text, pageCount = 1) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  const perPage = t.length / Math.max(1, pageCount);
  return perPage < 40;
}

/**
 * OCR via tesseract.js if available in environment. Returns { text, words, confidence }.
 */
export async function runLocalOcr(imageSource, options = {}) {
  const lang = options.lang || "eng+ita";
  let Tesseract = null;
  try {
    if (typeof window !== "undefined" && window.Tesseract) Tesseract = window.Tesseract;
    else if (typeof globalThis !== "undefined" && globalThis.Tesseract) Tesseract = globalThis.Tesseract;
  } catch (_) {}

  if (!Tesseract || typeof Tesseract.recognize !== "function") {
    return {
      ok: false,
      text: "",
      words: [],
      confidence: 0,
      warning: "OCR non disponibile (tesseract.js non caricato). Contenuto grezzo conservato.",
      fallback: true
    };
  }

  try {
    const result = await Tesseract.recognize(imageSource, lang, {
      logger: options.logger || (() => {})
    });
    const data = result?.data || {};
    const words = (data.words || []).map((w) => ({
      text: w.text,
      confidence: (w.confidence || 0) / 100,
      bbox: w.bbox || null
    }));
    return {
      ok: true,
      text: data.text || "",
      words,
      confidence: (data.confidence || 0) / 100,
      fallback: false
    };
  } catch (err) {
    return {
      ok: false,
      text: "",
      words: [],
      confidence: 0,
      warning: "OCR fallito: " + (err?.message || String(err)),
      fallback: true
    };
  }
}

export function classifyDocumentFromSignals(sig = {}) {
  const t = !!sig.hasTraining;
  const n = !!sig.hasNutrition;
  const s = !!sig.hasSupplements;
  if (t && n) return "TRAINING + NUTRITION";
  if (t) return "TRAINING PROGRAM";
  if (n) return "NUTRITION PLAN";
  if (s) return "SUPPLEMENT PLAN";
  if (sig.hasTherapy) return "GENERIC DOCUMENT";
  if ((sig.tableCount || 0) > 0) return "GENERIC DOCUMENT";
  return "UNKNOWN";
}

/**
 * Validation beyond corrupt chars: numeric anomalies on sets/reps/load.
 */
export function validateDocumentSemantics(canonical) {
  const issues = [];
  const weeks = canonical?.weeks || canonical?.training?.weeks || [];
  weeks.forEach((w, wi) => {
    (w.sessions || w.days || []).forEach((s, si) => {
      (s.exercises || s.rows || []).forEach((ex, ei) => {
        const sets = Number(ex.sets_count ?? ex.sets?.length);
        if (Number.isFinite(sets) && sets < 0) {
          issues.push({ level: "error", code: "NEG_SETS", message: `Serie negative: ${ex.name}`, sourceRef: ex.sourceRef || null });
        }
        const reps = String(ex.reps_target || ex.reps || "");
        if (reps && /banana|null|undefined|NaN/i.test(reps)) {
          issues.push({ level: "error", code: "BAD_REPS", message: `Reps non numeriche: ${ex.name}`, sourceRef: ex.sourceRef || null });
        }
        const load = Number(ex.load_value ?? ex.load_target);
        if (Number.isFinite(load) && load > 5000) {
          issues.push({ level: "warning", code: "ANOMALY_LOAD", message: `Carico anomalo ${load} su ${ex.name}`, sourceRef: ex.sourceRef || null });
        }
        (ex.sets || []).forEach((set, seti) => {
          const r = Number(set.reps ?? set.target_reps);
          if (Number.isFinite(r) && r < 0) {
            issues.push({ level: "error", code: "NEG_REPS", message: `Reps negative set ${seti + 1} ${ex.name}` });
          }
        });
      });
    });
  });
  return issues;
}

/**
 * Attach invented-data flags for name-list sheets that used default 3x10.
 */
export function flagInferredSets(exercise, { inferred = false } = {}) {
  if (!exercise) return exercise;
  if (inferred) {
    exercise.setsInferred = true;
    exercise.confidence = Math.min(Number(exercise.mappingConfidence ?? 0.6), 0.55);
    exercise.reviewFlags = [...(exercise.reviewFlags || []), "SETS_INFERRED"];
    exercise.notes = [exercise.notes, "Serie/reps inferite (non nel documento) — verificare"].filter(Boolean).join(" | ");
  }
  return exercise;
}

/**
 * Search DocumentIR for a query string.
 */
export function searchDocumentIR(ir, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q || !ir) return [];
  const hits = [];
  (ir.tables || []).forEach((t) => {
    (t.rows || []).forEach((row, ri) => {
      (row.cells || []).forEach((cell) => {
        if (String(cell.displayValue || "").toLowerCase().includes(q)) {
          hits.push({
            type: "table_cell",
            tableId: t.id,
            sheet: t.sheetName,
            page: t.pageStart,
            row: ri,
            value: cell.displayValue,
            sourceRef: cell.sourceRef
          });
        }
      });
    });
  });
  (ir.unmapped || []).forEach((u) => {
    if (JSON.stringify(u).toLowerCase().includes(q)) {
      hits.push({ type: "unmapped", value: u.name || u.reason, sourceRef: u.sourceRef });
    }
  });
  if (ir.originalText && ir.originalText.toLowerCase().includes(q)) {
    hits.push({ type: "text", value: snippetAround(ir.originalText, q), sourceRef: createSourceRef({ fileId: ir.document?.id, parser: "fulltext" }) });
  }
  return hits;
}

/**
 * Minimal program diff for future re-import.
 */
export function diffCanonicalPrograms(a, b) {
  const diff = { addedExercises: [], removedExercises: [], changedSets: [], changedReps: [], changedLoads: [], changedNotes: [] };
  const flat = (prog) => {
    const list = [];
    (prog?.weeks || []).forEach((w, wi) => {
      (w.sessions || w.days || []).forEach((s, si) => {
        (s.exercises || []).forEach((ex) => {
          list.push({
            key: `${wi}|${si}|${String(ex.name_normalized || ex.name || "").toLowerCase()}`,
            name: ex.name_normalized || ex.name,
            sets: ex.sets_count ?? ex.sets?.length,
            reps: ex.reps_target || ex.reps,
            load: ex.load_value ?? ex.load_target,
            notes: ex.notes
          });
        });
      });
    });
    return list;
  };
  const A = flat(a);
  const B = flat(b);
  const mapA = new Map(A.map((x) => [x.key, x]));
  const mapB = new Map(B.map((x) => [x.key, x]));
  mapB.forEach((bx, k) => {
    if (!mapA.has(k)) diff.addedExercises.push(bx.name);
    else {
      const ax = mapA.get(k);
      if (ax.sets !== bx.sets) diff.changedSets.push({ name: bx.name, from: ax.sets, to: bx.sets });
      if (String(ax.reps) !== String(bx.reps)) diff.changedReps.push({ name: bx.name, from: ax.reps, to: bx.reps });
      if (String(ax.load) !== String(bx.load)) diff.changedLoads.push({ name: bx.name, from: ax.load, to: bx.load });
      if (String(ax.notes || "") !== String(bx.notes || "")) diff.changedNotes.push({ name: bx.name });
    }
  });
  mapA.forEach((ax, k) => {
    if (!mapB.has(k)) diff.removedExercises.push(ax.name);
  });
  return diff;
}

export function buildImportSummary(ir, canonical, validation) {
  const weeks = canonical?.weeks || [];
  let exercises = 0;
  weeks.forEach((w) => (w.sessions || []).forEach((s) => { exercises += (s.exercises || []).length; }));
  const foods = (canonical?.nutrition?.days || []).reduce((n, d) => n + (d.meals || []).reduce((m, meal) => m + (meal.foods || meal.items || []).length, 0), 0);
  const warnings = [...(ir?.warnings || []), ...(validation?.warnings || [])];
  const errors = [...(ir?.errors || []), ...(validation?.errors || [])];
  const lowConf = [];
  weeks.forEach((w) => (w.sessions || []).forEach((s) => (s.exercises || []).forEach((ex) => {
    if (Number(ex.mappingConfidence ?? 1) < 0.85) lowConf.push(ex.name || ex.name_original);
  })));
  return {
    filename: ir?.document?.filename || canonical?.source?.filename || "",
    format: ir?.document?.magicType || canonical?.source?.type || "",
    classification: ir?.document?.classification || "UNKNOWN",
    pages: ir?.document?.pageCount || 0,
    sheets: ir?.document?.sheetCount || (ir?.sheets || []).length,
    sections: (ir?.sections || []).length,
    tables: (ir?.tables || []).length,
    exercises,
    foods,
    supplements: (canonical?.supplementation?.items || []).length,
    unmapped: (ir?.unmapped || canonical?.unrecognised_elements || []).length,
    lowConfidence: lowConf.length,
    warnings: warnings.length,
    errors: errors.length,
    status: errors.length ? "IMPORT_BLOCKED" : (warnings.length || lowConf.length ? "IMPORT_COMPLETED_WITH_WARNINGS" : "IMPORT_COMPLETED")
  };
}

export function renderTableHtml(table) {
  if (!table) return "";
  const cols = table.columns || [];
  const rows = table.rows || [];
  let html = `<div class="di-table-wrap" style="overflow-x:auto;margin:8px 0;border:1px solid #333;border-radius:6px;">`;
  html += `<table class="di-table" style="border-collapse:collapse;width:100%;font-size:11px;min-width:320px;">`;
  html += `<thead><tr>${cols.map((c) => `<th style="padding:6px 8px;background:#1a1a1a;color:var(--gold);text-align:left;border-bottom:1px solid #333;white-space:nowrap;">${escapeHtml(c)}</th>`).join("")}</tr></thead><tbody>`;
  rows.forEach((row) => {
    html += "<tr>";
    (row.cells || cols.map((c) => ({ displayValue: row.values?.[c] || "", confidence: 1 }))).forEach((cell) => {
      if (cell.isMergeCovered) return;
      const low = Number(cell.confidence ?? 1) < 0.75;
      const rs = cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : "";
      const cs = cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : "";
      html += `<td${rs}${cs} style="padding:5px 8px;border-bottom:1px solid #222;${low ? "background:rgba(255,152,0,0.12);color:#ffb74d;" : "color:#ddd;"}" title="${escapeHtml(cell.sourceRef?.cell || cell.sourceRef?.parser || "")}">${escapeHtml(cell.displayValue || "")}${low ? " ⚠" : ""}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody></table></div>";
  return html;
}

export function enrichFoodMappingConfidence(nutrition) {
  if (!nutrition || !Array.isArray(nutrition.days)) return;
  nutrition.days.forEach((d) => {
    (d.meals || []).forEach((m) => {
      (m.foods || m.items || []).forEach((f) => {
        if (f.mappingConfidence != null) return;
        const name = String(f.name || f.food || f.originalText || "").trim();
        f.name_original = f.name_original || name;
        f.normalizedText = f.normalizedText || name.toLowerCase();
        f.mappingConfidence = name.length > 2 ? 0.7 : 0.4;
        f.mappingSource = "heuristic";
      });
    });
  });
}

export function enrichSupplementMappingConfidence(supp) {
  if (!supp || !Array.isArray(supp.items)) return;
  supp.items.forEach((it) => {
    if (it.mappingConfidence != null) return;
    const name = String(it.name || "").trim();
    it.name_original = it.name_original || name;
    it.normalizedText = (name || "").toLowerCase();
    it.mappingConfidence = name.length > 2 ? 0.7 : 0.4;
    it.mappingSource = "heuristic";
  });
}

/** Structured Excel extract for coach-api (no LLM cell invention). */
export function extractExcelStructuredForApi(workbook, XLSXlib) {
  const X = XLSXlib || (typeof XLSX !== "undefined" ? XLSX : null);
  if (!X) throw new Error("XLSX required");
  const sheetsOut = [];
  (workbook.SheetNames || []).forEach((name, index) => {
    const ws = workbook.Sheets[name];
    if (!ws) return;
    const rawRows = X.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false, blankrows: true });
    const merges = ws["!merges"] || [];
    const formulaMap = {};
    Object.keys(ws).forEach((key) => {
      if (!key || key[0] === "!") return;
      if (ws[key] && ws[key].f) formulaMap[key] = String(ws[key].f);
    });
    const sheet = { name, index, rawRows, formulaMap, merges };
    const tables = reconstructTablesFromSheet(sheet, null);
    sheetsOut.push({
      name,
      index,
      merges: merges.map((m) => ({ s: m.s, e: m.e })),
      formulas: formulaMap,
      tables: tables.map((t) => ({
        id: t.id,
        columns: t.columns,
        rows: (t.rows || []).map((r) => ({
          values: r.values,
          cells: (r.cells || []).map((c) => ({
            value: c.value,
            displayValue: c.displayValue,
            formula: c.formula,
            rowSpan: c.rowSpan,
            colSpan: c.colSpan,
            address: c.sourceRef?.cell
          }))
        }))
      })),
      // compact text fallback still available
      previewRows: rawRows.slice(0, 80).map((r) => (r || []).map((v) => (v == null ? "" : String(v))))
    });
  });
  return { sheetCount: sheetsOut.length, sheets: sheetsOut };
}

// ---- helpers ----
function toUint8(bytes) {
  if (!bytes) return null;
  if (bytes instanceof Uint8Array) return bytes;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer?.(bytes)) return new Uint8Array(bytes);
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  if (Array.isArray(bytes)) return new Uint8Array(bytes);
  return null;
}

function getExt(filename) {
  if (!filename) return "";
  const i = String(filename).lastIndexOf(".");
  return i >= 0 ? String(filename).slice(i).toLowerCase() : "";
}

function asciiSlice(u8, start, end) {
  let s = "";
  for (let i = start; i < end && i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return s;
}

function guessMime(magicType) {
  const map = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    png: "image/png",
    jpeg: "image/jpeg",
    webp: "image/webp",
    csv: "text/csv",
    txt: "text/plain",
    json: "application/json"
  };
  return map[magicType] || "application/octet-stream";
}

function excelAddress(r, c) {
  let col = "";
  let n = Number(c) + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    col = String.fromCharCode(65 + m) + col;
    n = Math.floor((n - 1) / 26);
  }
  return col + (Number(r) + 1);
}

function xmlTextContent(xml) {
  return String(xml || "")
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function snippetAround(text, q) {
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return text.slice(0, 120);
  return text.slice(Math.max(0, i - 40), Math.min(text.length, i + q.length + 40));
}

export default {
  DI_VERSION,
  DI_MAX_BYTES,
  DI_PIPELINE_STAGES,
  createSourceRef,
  createEmptyDocumentIR,
  detectFormat,
  expandMergesToGrid,
  reconstructTablesFromSheet,
  buildIRFromWorkbook,
  reconstructTablesFromDocxXml,
  reconstructTablesFromPositionedText,
  pdfNeedsOcr,
  runLocalOcr,
  classifyDocumentFromSignals,
  validateDocumentSemantics,
  flagInferredSets,
  searchDocumentIR,
  diffCanonicalPrograms,
  buildImportSummary,
  renderTableHtml,
  enrichFoodMappingConfidence,
  enrichSupplementMappingConfidence,
  extractExcelStructuredForApi
};
