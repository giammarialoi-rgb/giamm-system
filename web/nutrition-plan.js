/*
 * Piani del nutrizionista: alternative, ricette, combinazioni.
 *
 * Un piano da nutrizionista (quelli esportati dai gestionali: giorni
 * raggruppati "Lun, Mer e Ven", pasti con l'orario, alimenti "o" alternativi,
 * pagine di ricette con ingredienti e valori) letto in:
 *   - giorni della settimana, ognuno con i suoi pasti;
 *   - per ogni riga del pasto le alternative scritte dal nutrizionista, la
 *     prima come scelta di partenza (mai la somma di tutte);
 *   - le ricette, con porzioni, ingredienti (anche loro con alternative),
 *     procedimento e i valori dichiarati, controllati fra loro: un numero
 *     letto male dall'OCR non passa, resta vuoto;
 *   - le note e le raccomandazioni.
 * Poi le combinazioni: scegliere un'altra alternativa della stessa riga, e
 * quando il piano non ne ha, alternative generate dalla banca alimenti con
 * le stesse calorie e un profilo di macro vicino.
 * Nessun DOM, nessuno stato: le funzioni ricevono cio' che serve.
 */
(function (root) {
  'use strict';

  var WEEKDAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  var DAY_KEYS = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];

  function fold(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  }
  function num(s) {
    if (s == null || s === '') return null;
    var t = String(s).trim();
    var frac = /^(\d+)\s*\/\s*(\d+)$/.exec(t);
    if (frac) return Number(frac[1]) / Number(frac[2]);
    var n = Number(t.replace(',', '.'));
    return isFinite(n) ? n : null;
  }
  function round1(n) { return Math.round(n * 10) / 10; }
  function titleCase(s) {
    var t = String(s || '').trim().toLowerCase();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  }

  /* ---------- a page in columns (the rendered PDF page) ------------------ */

  /**
   * Where a rendered page is split in columns. ink: Uint8Array W*H (1 = ink).
   * A gutter is a vertical strip with (almost) no ink - a few header lines may
   * cross it - at least minGap wide, and every column it leaves at least
   * minCol of the page wide (a bullet or an hour in front of the text is not
   * a column). Returns [{x0, x1}] columns, one when the page is not split.
   */
  function pageColumns(ink, W, H, opts) {
    opts = opts || {};
    var minGap = Math.max(4, Math.round(W * (opts.minGap || 0.012)));
    var minCol = Math.round(W * (opts.minCol || 0.18));
    var cross = opts.cross != null ? opts.cross : 0.08;
    var count = new Array(W);
    var inkRows = 0;
    for (var x = 0; x < W; x++) count[x] = 0;
    for (var y = 0; y < H; y++) {
      var any = false;
      var row = y * W;
      for (var x2 = 0; x2 < W; x2++) {
        if (ink[row + x2]) { count[x2]++; any = true; }
      }
      if (any) inkRows++;
    }
    if (!inkRows) return [{ x0: 0, x1: W }];
    var left = 0, right = W - 1;
    while (left < W && !count[left]) left++;
    while (right > left && !count[right]) right--;
    // Rows of text that cross a gutter: a few header lines may, the lines of
    // a page written across its width (a recipe's description) may not.
    var limit = Math.max(1, inkRows * cross);
    var clean = Math.max(1, inkRows * 0.004);
    var gaps = [];
    var s = -1;
    for (var x3 = left; x3 <= right + 1; x3++) {
      var clear = x3 <= right && count[x3] <= limit;
      if (clear) { if (s < 0) s = x3; }
      else {
        if (s >= 0 && x3 - s >= minGap) gaps.push([s, x3]);
        s = -1;
      }
    }
    // The cut goes where the next column's text starts: the end of the
    // cleanest stretch of the gutter (headings sit further left than the
    // bullets of their column, inside the gutter).
    function cutOf(g) {
      var best = null, rs = -1;
      for (var x = g[0]; x <= g[1]; x++) {
        var ok = x < g[1] && count[x] <= clean;
        if (ok) { if (rs < 0) rs = x; }
        else if (rs >= 0) { if (!best || x - rs > best[1] - best[0]) best = [rs, x]; rs = -1; }
      }
      return best ? best[1] : g[1];
    }
    // A strip is a gutter when what stands on each side of it is a column.
    var cols = [];
    var start = left;
    // Lines of text running across the cut itself: a page written across
    // its width (a recipe: title, description, ingredients) has many.
    function crossing(cut) {
      // Ink on both sides of the cut, close to it: the column's own text
      // starts right at the cut, with the gutter clear before it.
      var n = 0;
      var reach = Math.max(6, Math.round(W * 0.006));
      function inkIn(row, a, b) {
        for (var x = Math.max(0, a); x <= Math.min(W - 1, b); x++) if (ink[row + x]) return true;
        return false;
      }
      for (var y = 0; y < H; y++) {
        var row = y * W;
        if (inkIn(row, cut - reach, cut - 2) && inkIn(row, cut, cut + reach)) n++;
      }
      return n;
    }
    gaps.forEach(function (g) {
      var cut = cutOf(g);
      if (g[0] - start >= minCol && right - cut >= minCol && crossing(cut) <= inkRows * (opts.crossCut || 0.03)) {
        cols.push({ x0: start, x1: cut });
        start = cut;
      }
    });
    cols.push({ x0: start, x1: W });
    if (cols.length > 1) cols[0].x0 = 0;
    return cols;
  }

  /* ---------- one "o" alternative ---------------------------------------- */

  var MEASURE_WORDS = 'porzion[ei]|grammi|grammo|gr|g|ml|unit[aà]|fett[ae]|filett[io]|scatol[ae]|scatolett[ae]|cucchiai[oi]?|cucchiain[oi]|bicchier[ei]|pacchett[io]|quadrett[io]|scoop|tazz[ae]|vasett[io]|spicchi[o]?|pezz[io]|confezion[ei]|barrett[ae]|mestol[io]|manciat[ae]|pizzic[oh]i?';

  /**
   * "1 porzione di pancake Avena e Albumi (165 g)" -> { name: 'pancake Avena e
   * Albumi', quantity: 165, unit: 'g', amount: '1 porzione', label: <text> }.
   * The grams written in brackets win; then "100 grammi di X"; then a count
   * ("2 unità di X" -> 2 pezzi). A quantity that is not written stays empty.
   */
  function parseOption(text) {
    var label = String(text || '').replace(/\s+/g, ' ').replace(/^[\s,;.·•*+°©«»-]+|[\s,;·•*+°©«»-]+$/g, '').trim();
    if (!label) return null;
    var out = { label: label, name: label, quantity: null, unit: '', amount: '' };
    var body = label;
    // Grams in brackets, the last ones: "(165 g)", "(300g)", OCR "(200 gl)".
    var br = /\((\d+(?:[.,]\d+)?)\s*(g|gr|ml|kg)\w?\)\s*$/i.exec(body);
    if (br) {
      out.quantity = num(br[1]);
      out.unit = /ml/i.test(br[2]) ? 'ml' : (/kg/i.test(br[2]) ? 'kg' : 'g');
      body = body.slice(0, br.index).trim();
    }
    var lead = new RegExp('^((?:\\d+(?:[.,]\\d+)?|\\d+\\s*/\\s*\\d+)\\s*(' + MEASURE_WORDS + ')?\\b[^]*?)\\s+di\\s+([^]+)$', 'i').exec(body);
    var q = /^(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)\s*/.exec(body);
    if (q && lead) {
      var amount = lead[1].trim();
      out.amount = amount;
      out.name = lead[3].trim();
      if (out.quantity == null) {
        var n = num(q[1]);
        var m = /^(\d+(?:[.,]\d+)?)\s*(grammi|grammo|gr|g)\b/i.exec(amount);
        var ml = /^(\d+(?:[.,]\d+)?)\s*ml\b/i.exec(amount);
        var inner = /\bda\s+(\d+(?:[.,]\d+)?)\s*(gr|g|ml)\b/i.exec(amount);
        if (m) { out.quantity = num(m[1]); out.unit = 'g'; }
        else if (ml) { out.quantity = num(ml[1]); out.unit = 'ml'; }
        else if (inner) { out.quantity = round1(n * num(inner[1])); out.unit = /ml/i.test(inner[2]) ? 'ml' : 'g'; }
        else if (/porzion/i.test(amount)) { out.quantity = n; out.unit = 'porzioni'; }
        else if (/cucchiain/i.test(amount)) { out.quantity = n; out.unit = 'cucchiaini'; }
        else if (/cucchiai/i.test(amount)) { out.quantity = n; out.unit = 'cucchiai'; }
        else { out.quantity = n; out.unit = 'pezzi'; }
      }
    } else if (q && out.quantity == null) {
      // "2 broccoli", "5 grammi miele": a count or grams without "di".
      var g2 = /^(\d+(?:[.,]\d+)?)\s*(grammi|gr|g|ml)\s+(.+)$/i.exec(body);
      if (g2) { out.quantity = num(g2[1]); out.unit = /ml/i.test(g2[2]) ? 'ml' : 'g'; out.name = g2[3]; out.amount = g2[1] + ' ' + g2[2]; }
      else { out.quantity = num(q[1]); out.unit = 'pezzi'; out.name = body.slice(q[0].length).trim(); out.amount = q[1]; }
    } else if (q) {
      out.name = body.replace(/^(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)\s*/, '').trim();
    } else {
      out.name = body;
    }
    out.name = out.name.replace(/^(?:q\.?\s*b\.?\s+(?:di\s+)?)/i, '').replace(/\s+/g, ' ').trim();
    if (/^q\.?\s*b/i.test(label)) out.qb = true;
    if (!out.name) out.name = label;
    return out;
  }

  // The "o" between alternatives; OCR may read the small circle as ©, ◦, 0.
  // Never inside brackets: "(senza aggiunta di grassi o sale)" is one food.
  function splitOptions(text) {
    var t = cleanItemText(text);
    var out = [];
    var depth = 0, from = 0;
    var re = /\s+(?:o|©|◦|°|ο)\s+(?=\d|q\.?b|[a-zàèéìòù])/gi;
    var m;
    var marks = [];
    while ((m = re.exec(t))) marks.push([m.index, m.index + m[0].length]);
    var mi = 0;
    for (var i = 0; i <= t.length; i++) {
      if (mi < marks.length && i === marks[mi][0]) {
        if (depth === 0) { out.push(t.slice(from, i)); from = marks[mi][1]; }
        mi++;
      }
      var ch = t.charAt(i);
      if (ch === '(' || ch === '[') depth++;
      else if ((ch === ')' || ch === ']') && depth > 0) depth--;
    }
    out.push(t.slice(from));
    // In a list where each alternative opens with its amount, a piece
    // without one is still the name before it: "senza copertura o ripieno",
    // "philadelphia active o simili".
    var merged = [];
    out.map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (x) {
      var prev = merged[merged.length - 1];
      if (prev && /^\d/.test(prev) && !/^(?:\d|q\.?\s?b)/i.test(x)) merged[merged.length - 1] = prev + ' o ' + x;
      else merged.push(x);
    });
    return merged;
  }

  // What the OCR does to these lines: "g)" read "9g)" or "9)", the small "o"
  // between alternatives read "0" (or "01" with the next 1), "[16 g)", an
  // hour printed next to the text.
  function cleanItemText(text) {
    return String(text || '')
      .replace(/\[(\d+(?:[.,]\d+)?\s*g\))/g, '($1')
      .replace(/\((\d+(?:[.,]\d+)?)\s*9g\)/g, '($1 g)')
      .replace(/\((\d{2,4})9\)/g, '($1 g)')
      .replace(/\)\s+01\s+/g, ') o 1 ')
      .replace(/\)\s+0\s+(?=\d)/g, ') o ')
      .replace(/\s\d{1,2}:\d{2}(?=\s|$)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ---------- day groups -------------------------------------------------- */

  /**
   * "LUN, MER E VEN" -> [0, 2, 4]; "DOMENICA" -> [6]; "LUNEDÌ - VENERDÌ" ->
   * [0..4]. Null when the line is not a list of weekdays.
   */
  function weekdaysOf(line) {
    var t = fold(line).replace(/[.:]+$/, '');
    if (!t || t.length > 60) return null;
    var words = t.split(/\s*(?:,|\be\b|&|\/|\+)\s*/).map(function (w) { return w.trim(); }).filter(Boolean);
    var range = /^(lun|mar|mer|gio|ven|sab|dom)\w*\s*(?:-|–|al|a)\s*(lun|mar|mer|gio|ven|sab|dom)\w*$/.exec(t);
    if (range) {
      var a = DAY_KEYS.indexOf(range[1]), b = DAY_KEYS.indexOf(range[2]);
      var out = [];
      for (var i = a; i <= (b >= a ? b : b + 7); i++) out.push(i % 7);
      return out;
    }
    var days = [];
    for (var k = 0; k < words.length; k++) {
      var w = words[k];
      var m = /^(lun|mar|mer|gio|ven|sab|dom)(?:e|edi|tedi|coledi|ovedi|erdi|ato|enica|t|c|v)?\.?$/.exec(w);
      if (!m) return null;
      var idx = DAY_KEYS.indexOf(m[1]);
      if (days.indexOf(idx) < 0) days.push(idx);
    }
    return days.length ? days : null;
  }

  var MEAL_HEAD = /^(\d{1,2})[:.](\d{2})\s+(.{3,60})$/;
  var MEAL_NAME = /^(colazione|spuntino(?: [a-zàèéìòù' ]{0,30})?|pranzo|merenda|cena|dopocena|dopo cena|pre[- ]?(?:allenamento|workout|nanna)|post[- ]?(?:allenamento|workout)|spuntino serale)$/i;
  var COURSE = /^(primo piatto|secondo piatto|contorno|dessert|antipasto|piatto unico|frutta|bevand[ae]|condimenti?)$/i;
  var SECTION_END = /^(raccomandazioni|altre raccomandazioni|altre informazioni|integrazione|lista della spesa|ricette)\b/i;
  var BULLET = /^(?:[e•°*+©«®·])\s+(?=\d|q\.?\s?b)/i;

  function isUpperHeading(line) {
    var t = String(line || '').trim();
    if (t.length < 3 || t.length > 60 || /\d/.test(t)) return false;
    var letters = t.replace(/[^A-Za-zÀ-ÿ]/g, '');
    return letters.length >= 3 && letters === letters.toUpperCase();
  }

  /**
   * One column of the plan (its lines top to bottom, across pages) -> the
   * meals of its day group: [{ name, time, course rows, notes }].
   */
  function parseMealColumn(lines) {
    var meals = [];
    var meal = null;
    var item = null;
    var course = '';
    var inNotes = false;
    // The hour printed apart from its meal ends up on another line: kept
    // for the next meal that comes without one.
    var pendingTime = '';
    function closeItem() {
      if (!item || !meal) { item = null; return; }
      // Two list items read on one line: "... (25 g) e 1 pacchetto ...".
      var parts = cleanItemText(item).split(/\)\s+[e•]\s+(?=\d)/);
      parts.forEach(function (part, k) {
        var text = k < parts.length - 1 ? part + ')' : part;
        var opts = splitOptions(text).map(parseOption).filter(Boolean);
        if (opts.length) {
          var row = { alternatives: opts };
          if (course) row.course = course;
          meal.rows.push(row);
        }
      });
      item = null;
    }
    function openMeal(name, time) {
      closeItem();
      meal = { name: titleCase(name), time: time || pendingTime || '', rows: [], notes: '' };
      pendingTime = '';
      meals.push(meal);
      course = '';
      inNotes = false;
    }
    for (var i = 0; i < lines.length; i++) {
      var line = String(lines[i] || '').replace(/\s+/g, ' ').trim();
      if (!line) continue;
      if (SECTION_END.test(line) && isUpperHeading(line)) { closeItem(); meal = null; break; }
      var loose = /(?:^|\s)(\d{1,2})[:.](\d{2})$/.exec(line);
      if (loose && !MEAL_HEAD.test(line)) {
        // Only an hour after the meal in course can be the next meal's.
        var hh = loose[1].padStart(2, '0') + ':' + loose[2];
        if (!meal || !meal.time || hh > meal.time) pendingTime = hh;
        line = line.slice(0, loose.index).trim();
        if (!line) continue;
      }
      var head = MEAL_HEAD.exec(line);
      if (head && isUpperHeading(head[3])) { openMeal(head[3], head[1].padStart(2, '0') + ':' + head[2]); continue; }
      if (MEAL_NAME.test(line) && isUpperHeading(line)) { openMeal(line, ''); continue; }
      if (!meal) continue;
      if (COURSE.test(line)) { closeItem(); course = titleCase(line); inNotes = false; continue; }
      if (/^note:?$/i.test(line)) { closeItem(); inNotes = true; continue; }
      if (inNotes) { meal.notes = (meal.notes ? meal.notes + ' ' : '') + line; continue; }
      // "e | porzione": the 1 read as a bar.
      line = line.replace(/^([e•*°+©])\s+[|!]\s+(?=[a-zA-Z])/, '$1 1 ');
      var b = BULLET.exec(line);
      var text = b ? line.slice(b[0].length) : line;
      var startsNew = !!b || (!item && /^\d/.test(text));
      if (startsNew) { closeItem(); item = text; }
      else if (item) {
        // A line that goes on: "(165" + "g) o 100 grammi".
        item = /[(\/-]$/.test(item) ? item + text : item + ' ' + text;
      }
    }
    closeItem();
    return meals;
  }

  /* ---------- recipes ----------------------------------------------------- */

  var TABLE_ROWS = [
    { key: 'kcal', re: /\bENERGIA\b/i, unit: 'kcal' },
    { key: 'pro', re: /\bPROTEINE\b/i },
    { key: 'carb', re: /\bCARBOIDRATI\b/i },
    { key: 'sugars', re: /\bZUCCHERI\b/i },
    { key: 'fat', re: /\bLIPIDI\b|\bGRASSI\s+TOTALI\b/i },
    { key: 'satfat', re: /\bGRASSI\s+SAT\w*\b/i },
    { key: 'fiber', re: /\bFIBRE?\b(?:\s+ALIMENTARI)?/i },
    { key: 'sodium', re: /\bSODIO\b/i, unit: 'mg' }
  ];

  // What a number cell can have been: "14g" -> 14; "149" (OCR of "14g") ->
  // 149 or 14; "s79" -> nothing sure.
  // OCR's usual mix-ups in a number cell: "Tg" is 7g, "og" 0g, "lg" 1g.
  function cleanCell(tok) {
    return String(tok || '').trim().replace(/^T(?=g$)/, '7').replace(/^[oO](?=g$)/, '0').replace(/^[lI](?=\d*g$)/, '1').replace(',', '.');
  }
  function cellCandidates(tok, unit) {
    var t = cleanCell(tok).toLowerCase();
    var out = [];
    var m;
    if ((m = /^(\d+(?:\.\d+)?)\s*(?:g|kcal|mg)$/.exec(t))) out.push(Number(m[1]));
    else if ((m = /^(\d+(?:\.\d+)?)$/.exec(t))) {
      out.push(Number(m[1]));
      if (unit !== 'kcal' && /9$/.test(m[1]) && m[1].length > 1) out.push(Number(m[1].slice(0, -1)));
    }
    return out;
  }
  // A cell read with its unit ("43g", "294 kcal") is sure; "149" is not.
  function cellSure(tok) {
    return /^\d+(?:\.\d+)?(?:g|kcal|mg)$/i.test(cleanCell(tok));
  }

  /**
   * The values table of a recipe, per 100 g and per portion, each value
   * checked against the other through the portion weight. A value that does
   * not agree with itself is left out, never guessed.
   */
  function parseNutritionTable(lines) {
    var portionG = null;
    var rows = {};
    lines.forEach(function (line) {
      var pg = /PER\s+PORZIONE\s*\((\d+(?:[.,]\d+)?)\s*g\)/i.exec(line);
      if (pg) portionG = num(pg[1]);
      TABLE_ROWS.forEach(function (spec) {
        var m = spec.re.exec(line);
        if (!m || rows[spec.key]) return;
        var rest = line.slice(m.index + m[0].length).trim();
        // "40 9" is "40 g" read apart.
        var toks = rest.replace(/(\d)\s+(g|kcal|mg)\b/gi, '$1$2').replace(/(\d)\s+9(?=\s|$)/g, '$1g').split(/\s+/);
        rows[spec.key] = { a: toks[0] || '', b: toks[1] || '', unit: spec.unit || 'g' };
      });
    });
    var per100 = {}, perPortion = {};
    Object.keys(rows).forEach(function (k) {
      var r = rows[k];
      var A = cellCandidates(r.a, r.unit), B = cellCandidates(r.b, r.unit);
      var best = null;
      if (portionG > 0) {
        A.forEach(function (a) {
          if (r.unit === 'g' && a > 100) return;
          B.forEach(function (b) {
            var expect = a * portionG / 100;
            var tol = Math.max(r.unit === 'kcal' ? 6 : 1.2, expect * 0.12);
            if (Math.abs(expect - b) <= tol && (!best || Math.abs(expect - b) < best.err)) best = { a: a, b: b, err: Math.abs(expect - b) };
          });
        });
        if (!best && B.length === 1 && A.length === 0) best = null;
      } else if (A.length === 1) {
        best = { a: A[0], b: null };
      }
      if (best) { per100[k] = best.a; if (best.b != null) perPortion[k] = best.b; }
    });
    // One of the two cells misread and the other read with its unit: the
    // sure one gives the value (per 100 g from the portion, or back), and
    // only if the energy then agrees with the macros.
    // Each value still missing may come from either cell read with its unit;
    // when both were (they disagree: one is misread) the energy decides.
    var options = {};
    if (portionG > 0) {
      Object.keys(rows).forEach(function (k) {
        if (per100[k] != null) return;
        var r = rows[k];
        var B = cellCandidates(r.b, r.unit), A = cellCandidates(r.a, r.unit);
        var opts = [];
        if (cellSure(r.b) && B.length === 1) opts.push({ a: Math.round(B[0] / portionG * 1000) / 10, b: B[0] });
        if (cellSure(r.a) && A.length === 1 && (r.unit !== 'g' || A[0] <= 100)) opts.push({ a: A[0], b: Math.round(A[0] * portionG / 10) / 10 });
        if (opts.length) options[k] = opts;
      });
    }
    function energyError(v) {
      if (v.kcal == null || v.pro == null || v.carb == null || v.fat == null) return null;
      var est = v.pro * 4 + v.carb * 4 + v.fat * 9;
      return Math.abs(est - v.kcal) / Math.max(v.kcal, 1);
    }
    var keys = Object.keys(options);
    var best = null;
    (function walk(i, pick) {
      if (i === keys.length) {
        var v = Object.assign({}, per100);
        keys.forEach(function (k, j) { v[k] = options[k][pick[j]].a; });
        var err = energyError(v);
        if (!best || (err != null && (best.err == null || err < best.err))) best = { pick: pick.slice(), err: err };
        return;
      }
      for (var c = 0; c < options[keys[i]].length; c++) { pick.push(c); walk(i + 1, pick); pick.pop(); }
    })(0, []);
    if (best) {
      keys.forEach(function (k, j) {
        var o = options[k];
        // Two readings and nothing to tell them apart: neither.
        if (o.length > 1 && best.err == null) return;
        per100[k] = o[best.pick[j]].a;
        perPortion[k] = o[best.pick[j]].b;
      });
    }
    // Energy must agree with the macros (4/4/9), within 20 %: if the values
    // taken from one cell break it they go, and then the energy itself.
    var errNow = energyError(per100);
    if (errNow != null && errNow > 0.2) {
      keys.forEach(function (k) { delete per100[k]; delete perPortion[k]; });
      errNow = energyError(per100);
      if (errNow != null && errNow > 0.2) { delete per100.kcal; delete perPortion.kcal; }
    }
    return { portionGrams: portionG, per100: per100, perPortion: perPortion };
  }

  var STEP = /^(\d{1,2})\s*[°º.)]\s*(.*)$/;
  var TABLE_TAIL = /\s+(PER\s+100\s*g|ENERGIA|PROTEINE|CARBOIDRATI|ZUCCHERI|LIPIDI|GRASSI\s+SAT\w*|FIBRE?\s+ALIMENTARI|SODIO)\b.*$/i;

  /**
   * One recipe from its page text: title, author line, description, portions,
   * ingredients (with alternatives), steps, values.
   */
  function parseRecipe(lines) {
    var clean = lines.map(function (l) { return String(l || '').replace(/\s+/g, ' ').trim(); }).filter(Boolean);
    // "PORZIONE 1" is a label of its own (next to the title, or in the other
    // column of the page): read, then taken out of the text.
    var portions = null;
    clean = clean.filter(function (l) {
      var pm = /^\W{0,3}\S{0,2}\s*PORZION[EI]\s+(\d+)\s*$/i.exec(l);
      if (pm) { if (portions == null) portions = Number(pm[1]); return false; }
      return true;
    });
    var at = clean.findIndex(function (l) { return /^INGREDIENTI\b/i.test(l); });
    if (at < 1) return null;
    var titleAt = 0;
    // The title, without what the OCR puts before it ("‘è FRENCH TOAST") and
    // without the "RICETTE" heading of the section.
    var titleOf = function (l) { return String(l || '').replace(/^[^A-Za-zÀ-ÿ]+/, '').replace(/^[a-zà-ÿ]\s+(?=[A-ZÀ-Ý])/, '').trim(); };
    while (titleAt < at && (!isUpperHeading(titleOf(clean[titleAt])) || /^ricette$/i.test(titleOf(clean[titleAt])))) titleAt++;
    if (titleAt >= at) return null;
    var recipe = { name: titleCase(titleOf(clean[titleAt])), portions: portions, description: '', author: '', ingredients: [], steps: [], per100: {}, perPortion: {}, portionGrams: null };
    var desc = [];
    for (var i = titleAt + 1; i < at; i++) {
      var l = clean[i];
      var por = /\bPORZION[EI]\s+(\d+)\b/i.exec(l);
      if (por) { recipe.portions = Number(por[1]); l = l.slice(0, por.index).replace(/\s+\S{0,2}\s*$/, '').trim(); }
      if (/^da\s+/i.test(l) && !recipe.author && i === titleAt + 1) { recipe.author = l.replace(/^da\s+/i, '').trim(); continue; }
      // The page's icons read as a line of marks ("i . ’' ’ . Co ’"): no word in it.
      if (!/[A-Za-zÀ-ÿ]{3}/.test(l)) continue;
      if (l && l.length > 3) desc.push(l);
    }
    recipe.description = desc.join(' ').trim();
    var prepAt = clean.findIndex(function (l, idx) { return idx > at && /COME\s+PREPARARE/i.test(l); });
    var ingLines = clean.slice(at + 1, prepAt > at ? prepAt : clean.length);
    var item = null;
    var group = '';
    var ingOpen = false;
    function closeIng() {
      if (!item) return;
      var opts = splitOptions(item).map(parseOption).filter(function (o) { return o && o.name.replace(/[^A-Za-zÀ-ÿ]/g, '').length >= 2; });
      if (opts.length) recipe.ingredients.push(group ? { group: group, alternatives: opts } : { alternatives: opts });
      item = null;
    }
    // Two columns of ingredients read on one line ("... secche e Per la
    // Farcitura"): each column keeps its own item and its own heading.
    var colItems = ['', ''], colGroups = ['', ''];
    function closeCol(c) {
      if (!colItems[c]) return;
      item = colItems[c]; group = colGroups[c];
      closeIng();
      colItems[c] = '';
    }
    ingLines.forEach(function (line) {
      line.split(/\s+(?=(?:[e•°*+©]\s+)(?:\d|q\.?\s?b|Per\s))/i).forEach(function (part, pi) {
        var c = pi > 0 ? 1 : 0;
        var b = BULLET.exec(part) || /^[e•°*+©]\s+(?=Per\s)/i.exec(part);
        var text = b ? part.slice(b[0].length) : part;
        if (/^Per\s+(?:la|il|lo|le|i|gli)\s+.+:?$/i.test(text) && text.length < 50) { closeCol(c); colGroups[c] = text.replace(/:$/, ''); return; }
        if (b) { closeCol(c); colItems[c] = text; }
        else if (colItems[c]) colItems[c] = colItems[c] + ' ' + text;
      });
    });
    closeCol(0);
    closeCol(1);
    group = '';
    var tableLines = [];
    if (prepAt > at) {
      var step = null;
      var tableOnly = false;
      clean.slice(prepAt + 1).forEach(function (line) {
        if (tableOnly) { tableLines.push(line); return; }
        var infoAt = line.search(/INFORMAZIONI\s+NUTRIZIONALI/i);
        // The table in a column of its own: everything after its heading.
        if (infoAt === 0) { tableOnly = true; return; }
        if (infoAt >= 0) line = line.slice(0, infoAt).trim();
        var tail = TABLE_TAIL.exec(' ' + line);
        if (tail) { tableLines.push(tail[0].trim()); line = (' ' + line).slice(0, tail.index).trim(); }
        // Rows of the table read into the text ("Ron 129 579 18 %"), times.
        line = line.replace(/\s*[A-Z]{3,}\s+\d+\S*\s+\d+\S*(?:\s+\d+\s*%|\s+[-=i])?(?=\s|$)/g, '')
          .replace(/\s*[A-Z][A-Za-z]{1,}\s+\d+\S*\s+\d+\S*\s+\d+\s*%(?=\s|$)/g, '')
          .replace(/[@©®]?\s*(?:PREPARAZIONE|TOTALE|COTTURA)\s+\d+\s*(?:minuti|min|ore|ora)\b/gi, '')
          .replace(/\s+[©@®]\s*\w?$/, '').trim();
        if (!line || /^[©.·@\s]+$/.test(line)) return;
        // The other column of the page: more ingredients after the steps.
        if (/^[e•*°+©]\s+\S/.test(line) && !STEP.test(line)) { closeIng(); ingOpen = true; item = line.replace(/^[e•*°+©]\s+[|!]\s+/, '1 ').replace(/^[e•*°+©]\s+/, ''); return; }
        var sm = STEP.exec(line);
        if (sm) { closeIng(); ingOpen = false; step = sm[2].replace(/^[©.·\s]+/, '').replace(/\s+[©.]\s+/g, ' ').trim(); recipe.steps.push(step); }
        else if (ingOpen && item) item = item + ' ' + line;
        else if (recipe.steps.length) recipe.steps[recipe.steps.length - 1] += ' ' + line;
      });
      closeIng();
    }
    if (recipe.portions == null) {
      clean.some(function (l) { var pm = /\bPORZION[EI]\s+(\d+)\b/i.exec(l); if (pm) recipe.portions = Number(pm[1]); return !!pm; });
    }
    recipe.steps = recipe.steps.map(function (st) { return st.replace(/\s*\S{0,3}\s*\bPORZION[EI]\s+\d+\b/i, '').trim(); }).filter(Boolean);
    clean.forEach(function (l) { if (/PER\s+PORZIONE\s*\(/i.test(l) && tableLines.indexOf(l) < 0) tableLines.push(l.slice(l.search(/PER\s+100/i) >= 0 ? l.search(/PER\s+100/i) : 0)); });
    var table = parseNutritionTable(tableLines);
    recipe.portionGrams = table.portionGrams;
    recipe.per100 = table.per100;
    recipe.perPortion = table.perPortion;
    return recipe;
  }

  /* ---------- the whole document ------------------------------------------ */

  /**
   * doc: { pages: [{ columns: [[lines]...] }] } as read from the PDF - one
   * entry in columns for each column of the page (one for a plain page).
   * Returns null when it is not a nutritionist's plan (no day groups with
   * timed meals), else { present, plan_name, days, recipes, notes, source }.
   */
  function parsePlanDocument(doc) {
    var pages = (doc && doc.pages) || [];
    var streams = [];      // one per day group, in the order of the columns
    var groups = [];       // weekdays of each stream
    var gridWidth = 0;     // how many columns the plan grid has
    var afterGrid = [];    // plain pages after the grid (notes, recipes)
    var inGrid = false;
    pages.forEach(function (page) {
      var cols = page.columns || [];
      var slots = page.slots || null;
      // The first time a column opens with its weekdays, the grid starts.
      var heads = cols.map(function (lines) {
        for (var i = 0; i < Math.min(lines.length, 40); i++) {
          var wd = weekdaysOf(lines[i]);
          if (wd) return { at: i, days: wd };
        }
        return null;
      });
      if (!inGrid && heads.some(Boolean)) {
        inGrid = true;
        gridWidth = cols.length;
        cols.forEach(function (lines, ci) {
          var h = heads[ci];
          streams[ci] = h ? lines.slice(h.at + 1) : [];
          groups[ci] = h ? h.days : null;
        });
        return;
      }
      if (inGrid && (cols.length === gridWidth || (page.slot != null && page.slot < gridWidth))) {
        if (cols.length === gridWidth) cols.forEach(function (lines, ci) { streams[ci] = (streams[ci] || []).concat(lines); });
        else streams[page.slot] = (streams[page.slot] || []).concat(cols[0] || []);
        // The grid ends where a section heading closes the last column.
        return;
      }
      if (inGrid) inGrid = false;
      afterGrid.push(cols.length === 1 ? cols[0] : [].concat.apply([], cols));
    });
    if (!streams.length) return null;
    var byDay = [];
    var notes = [];
    streams.forEach(function (lines, ci) {
      var wd = groups[ci];
      if (!wd) return;
      // What follows the last meal after a section heading is notes.
      var endAt = lines.findIndex(function (l) { return SECTION_END.test(String(l || '').trim()) && isUpperHeading(l); });
      if (endAt >= 0) notes = notes.concat(lines.slice(endAt).map(function (l) { return String(l).trim(); }).filter(Boolean));
      var meals = parseMealColumn(endAt >= 0 ? lines.slice(0, endAt) : lines);
      wd.forEach(function (d) { if (!byDay[d]) byDay[d] = meals; });
    });
    if (!byDay.some(function (m) { return m && m.length; })) return null;
    var recipes = [];
    afterGrid.forEach(function (lines) {
      var r = parseRecipe(lines);
      if (r) recipes.push(r);
      else notes = notes.concat(lines.map(function (l) { return String(l).trim(); }).filter(Boolean));
    });
    var days = [];
    byDay.forEach(function (meals, d) {
      if (!meals) return;
      days.push({
        day: WEEKDAYS[d],
        meals: meals.map(function (m) {
          return {
            name: m.name,
            time: m.time,
            notes: m.notes || '',
            foods: m.rows.map(function (row) { return foodFromRow(row); })
          };
        })
      });
    });
    var plan = { present: true, source: 'nutritionist', days: days, recipes: recipes, notes: notes.join('\n').trim() };
    linkRecipes(plan);
    return plan;
  }

  // A plan row -> a food of the app: the chosen alternative's fields on the
  // food itself (so sums, lists and edits work as for any food), all of them
  // kept in `alternatives`.
  function foodFromRow(row) {
    var alts = row.alternatives.map(function (o) {
      var a = { name: o.name, quantity: o.quantity, unit: o.unit || 'g', label: o.label };
      if (o.amount) a.amount = o.amount;
      if (o.qb) a.qb = true;
      return a;
    });
    var f = applyChoice({ alternatives: alts, choice: 0 }, 0);
    if (row.course) f.course = row.course;
    return f;
  }

  var FOOD_FIELDS = ['name', 'quantity', 'unit', 'label', 'amount', 'recipeId', 'kcalPer100', 'proPer100', 'carbPer100', 'fatPer100', 'macro_source'];

  /**
   * Makes alternative `idx` the food: its name, quantity, unit and values go
   * on the food; the alternatives stay as they are. Returns the food.
   */
  function applyChoice(food, idx) {
    var alts = (food && food.alternatives) || [];
    var a = alts[idx];
    if (!a) return food;
    FOOD_FIELDS.forEach(function (k) {
      if (a[k] != null && a[k] !== '') food[k] = a[k];
      else if (k !== 'name') delete food[k];
    });
    ['kcal', 'pro', 'carb', 'fat', 'protein_g', 'carbs_g', 'fat_g', 'food'].forEach(function (k) { delete food[k]; });
    food.choice = idx;
    return food;
  }

  // An alternative "1 porzione di colazione toast veloce (260 g)" is that
  // recipe: it takes the recipe's declared values per 100 g.
  function linkRecipes(plan) {
    var recipes = plan.recipes || [];
    if (!recipes.length) return plan;
    recipes.forEach(function (r, i) { if (!r.id) r.id = 'r_' + i + '_' + fold(r.name).replace(/[^a-z0-9]+/g, '_').slice(0, 30); });
    var byName = {};
    recipes.forEach(function (r) { byName[fold(r.name)] = r; });
    function link(a) {
      var r = byName[fold(a.name)];
      if (!r) return;
      a.recipeId = r.id;
      // Only values that are whole: a recipe whose table was read in part
      // gets its values in the app, from its ingredients.
      if (per100Complete(r.per100)) setPer100(a, r.per100);
      if (a.unit === 'porzioni' && r.portionGrams) { a.quantity = round1(a.quantity * r.portionGrams); a.unit = 'g'; }
      a.macro_source = 'recipe';
    }
    (plan.days || []).forEach(function (d) {
      (d.meals || []).forEach(function (m) {
        (m.foods || []).forEach(function (f) {
          (f.alternatives || []).forEach(link);
          applyChoice(f, f.choice || 0);
        });
      });
    });
    return plan;
  }

  function per100Complete(v) {
    return !!v && v.kcal != null && v.pro != null && v.carb != null && v.fat != null;
  }

  function setPer100(target, per100) {
    if (!per100) return;
    if (per100.kcal != null) target.kcalPer100 = per100.kcal;
    if (per100.pro != null) target.proPer100 = per100.pro;
    if (per100.carb != null) target.carbPer100 = per100.carb;
    if (per100.fat != null) target.fatPer100 = per100.fat;
  }

  /* ---------- the food database: same food, other wording ------------------ */

  // Words that do not change what the food is: "riso basmati" is "Riso
  // Basmati, crudo" (a plan weighs raw), "pesca" is "pesca fresca". Cooked,
  // canned, dried do change it and stay.
  var SAME_FOOD = { crudo: 1, cruda: 1, crudi: 1, crude: 1, fresco: 1, fresca: 1, freschi: 1, fresche: 1, di: 1, del: 1, della: 1, dello: 1, dei: 1, delle: 1, da: 1, a: 1, al: 1, allo: 1, alla: 1, e: 1, in: 1, tipo: 1 };
  // One word per food whatever the number: "uova" is "uovo", "filetti" is
  // "filetto". A list, not a stemmer: "pesca" and "pesce" stay apart.
  var SINGULAR = {
    uova: 'uovo', filetti: 'filetto', fette: 'fetta', pomodori: 'pomodoro', cozze: 'cozza', vongole: 'vongola', fagioli: 'fagiolo',
    piselli: 'pisello', patate: 'patata', carote: 'carota', cipolle: 'cipolla', porri: 'porro', mandorle: 'mandorla', noci: 'noce',
    nocciole: 'nocciola', olive: 'oliva', zucchine: 'zucchina', melanzane: 'melanzana', spinaci: 'spinacio', funghi: 'fungo',
    gamberi: 'gambero', albicocche: 'albicocca', fragole: 'fragola', mele: 'mela', pere: 'pera', arance: 'arancia', banane: 'banana',
    lenticchie: 'lenticchia', biscotti: 'biscotto', crackers: 'cracker', legumi: 'legume', cereali: 'cereale', semi: 'seme', fiocchi: 'fiocco',
    grissini: 'grissino', gallette: 'galletta', peperoni: 'peperone', broccoli: 'broccolo', carciofi: 'carciofo', asparagi: 'asparago',
    finocchi: 'finocchio', cavolfiori: 'cavolfiore', ravanelli: 'ravanello', datteri: 'dattero', fichi: 'fico', prugne: 'prugna',
    ciliegie: 'ciliegia', pesche: 'pesca', kiwi: 'kiwi', mirtilli: 'mirtillo', lamponi: 'lampone', albumi: 'albume', tuorli: 'tuorlo',
    pistacchi: 'pistacchio', anacardi: 'anacardo', arachidi: 'arachide', lupini: 'lupino', fave: 'fava', ceci: 'ceci', gnocchi: 'gnocco',
    wurstel: 'wurstel', calamari: 'calamaro', totani: 'totano', polpi: 'polpo', sgombri: 'sgombro', alici: 'alice', acciughe: 'acciuga',
    sardine: 'sardina', crostacei: 'crostaceo', molluschi: 'mollusco', cetrioli: 'cetriolo', sedani: 'sedano', agrumi: 'agrume',
    frutti: 'frutto', ortaggi: 'ortaggio', vegetali: 'vegetale', bovino: 'manzo', vitellone: 'manzo', suino: 'maiale',
    selvatica: 'selvaggia', selvatico: 'selvaggio', verdure: 'verdura', strapazzate: 'strapazzato', strapazzata: 'strapazzato', couscous: 'couscous'
  };
  // What a food "is" when nothing else is said: plain yogurt is white and
  // whole, milk is cow's, an egg is a hen's. Only these may be what the
  // database says more than the plan - never "light", "0%", "cotto".
  var DEFAULTS = {
    bianco: 1, bianca: 1, naturale: 1, intero: 1, intera: 1, vaccino: 1, vacca: 1, gallina: 1, comune: 1, medio: 1, media: 1,
    pastorizzato: 1, pastorizzata: 1, polpa: 1, buccia: 1, senza: 1, nocciolo: 1, torsolo: 1, semi: 1, pelle: 1, sgocciolato: 1,
    sgocciolati: 1, sgocciolata: 1, fresco: 1, crudo: 1, preconfezionato: 1, preconfezionata: 1, sfuso: 1,
    cucina: 1
  };
  // Words about the shop, not the food: "Esselunga", "Bio".
  var SHOP_WORDS = { esselunga: 1, bio: 1, biologico: 1, biologica: 1, coop: 1, conad: 1, carrefour: 1, lidl: 1, eurospin: 1, pam: 1, despar: 1, iper: 1 };
  function tokenList(name) {
    var t = fold(name).replace(/extra\s+vergine/g, 'extravergine').replace(/cous\s+cous/g, 'couscous').replace(/[^a-z0-9%]+/g, ' ').trim();
    return t ? t.split(' ').map(function (w) { return SINGULAR[w] || w; }).filter(function (w) { return !SAME_FOOD[w]; }) : [];
  }
  function foodTokens(name) {
    var out = tokenList(name);
    out.sort();
    return out.join(' ');
  }
  // "Merluzzo o nasello, surgelato" is also "merluzzo, surgelato" and
  // "nasello, surgelato".
  function foodNames(f) {
    var names = [f.name, f.crea_name].concat(f.aliases || []).filter(Boolean);
    var more = [];
    names.forEach(function (n) {
      var comma = String(n).indexOf(',');
      var head = comma >= 0 ? n.slice(0, comma) : n;
      var rest = comma >= 0 ? n.slice(comma) : '';
      // Only two one-word names ("Merluzzo o nasello"): "aromatizzato o
      // alla frutta" is not a name for "frutta".
      var parts = head.trim().split(/\s+o\s+/i);
      if (parts.length === 2 && parts.every(function (p) { return /^\S+$/.test(p.trim()); })) parts.forEach(function (p) { more.push(p + rest); });
    });
    return names.concat(more);
  }
  // The plan's words without what does not change the food: notes in
  // brackets ("(pesato a crudo, consumato cotto)", "(tipo Alce Nero)"), the
  // shop, "o altro ..." alternatives written inside the name.
  function coreName(name) {
    return String(name || '')
      .replace(/\([^)]*\)|\[[^\]]*\)|\[[^\]]*\]/g, ' ')
      .replace(/\s+o\s+(?:altr[oaie]|simil[ie]).*$/i, ' ')
      .split(/\s+/).filter(function (w) { return !SHOP_WORDS[fold(w)]; }).join(' ')
      .replace(/\s+/g, ' ').replace(/[\s,]+$/, '').trim();
  }
  /**
   * The catalog food that is this food, or null. First the same words
   * (order, punctuation, accents, singular/plural, "crudo"/"fresco" aside);
   * then the same words plus only what a food is by default (white, whole,
   * cow's, hen's...); then the same again without notes in brackets and shop
   * names. Several: the fewest extra words, then the rank. Never a name that
   * only looks close - a wrong value is worse than none.
   */
  function sameFood(name, catalog) {
    var tries = [name];
    var core = coreName(name);
    if (core && core !== name) tries.push(core);
    for (var t = 0; t < tries.length; t++) {
      var want = tokenList(tries[t]);
      if (!want.length) continue;
      var k = want.slice().sort().join(' ');
      var best = null;
      (catalog || []).forEach(function (f) {
        if (!f || !f.name) return;
        foodNames(f).forEach(function (n) {
          var have = tokenList(n);
          var extra;
          if (have.slice().sort().join(' ') === k) extra = 0;
          else {
            // The words the two names share, and on either side only what
            // a food is by default ("senza pelle" on a chicken breast).
            var rest = have.slice();
            var mine = [];
            for (var i = 0; i < want.length; i++) {
              var at = rest.indexOf(want[i]);
              if (at < 0) mine.push(want[i]);
              else rest.splice(at, 1);
            }
            if (mine.length === want.length) return;
            if (!rest.every(function (w) { return DEFAULTS[w]; }) || !mine.every(function (w) { return DEFAULTS[w]; })) return;
            // The food itself must be named on both sides, not only defaults.
            if (!want.some(function (w) { return !DEFAULTS[w] && have.indexOf(w) >= 0; })) return;
            extra = rest.length + mine.length;
          }
          var r = f.rank != null ? f.rank : 999;
          if (!best || extra < best.extra || (extra === best.extra && (r < best.r || (r === best.r && String(f.name).length < String(best.f.name).length)))) {
            best = { f: f, r: r, extra: extra };
          }
        });
      });
      if (best) return best.f;
    }
    return null;
  }

  /**
   * The foods of the catalog closest to a name, for someone (or the AI) to
   * pick the same food among them: those sharing its words, most shared
   * first. Never used as a match by itself.
   */
  function closeFoods(name, catalog, limit) {
    var want = tokenList(coreName(name) || name).filter(function (w) { return !DEFAULTS[w]; });
    if (!want.length) return [];
    var scored = [];
    (catalog || []).forEach(function (f) {
      if (!f || !f.name) return;
      var have = tokenList(f.name);
      var shared = 0;
      want.forEach(function (w) { if (have.indexOf(w) >= 0) shared++; });
      if (!shared) return;
      var score = shared / (want.length + have.length - shared);
      scored.push({ f: f, s: score, r: f.rank != null ? f.rank : 999 });
    });
    scored.sort(function (a, b) { return (b.s - a.s) || (a.r - b.r); });
    return scored.slice(0, limit || 8).map(function (x) { return x.f; });
  }

  /* ---------- combinations ------------------------------------------------ */

  function energyShares(v) {
    var k = (v.pro || 0) * 4 + (v.carb || 0) * 4 + (v.fat || 0) * 9;
    if (!(k > 0)) return null;
    return { pro: (v.pro || 0) * 4 / k, carb: (v.carb || 0) * 4 / k, fat: (v.fat || 0) * 9 / k };
  }

  /**
   * Alternatives for a food the plan gives none for: foods of the same group
   * in the catalog, in the amount that gives the same calories, closest in
   * protein/carb/fat share first. base: the catalog food the row is (per 100
   * g); grams: how much of it. Each result is marked generated.
   */
  function generateAlternatives(base, grams, catalog, opts) {
    opts = opts || {};
    var limit = opts.limit || 6;
    if (!base || !(base.kcal > 0) || !(grams > 0)) return [];
    var kcal = base.kcal * grams / 100;
    var sh = energyShares(base);
    if (!sh) return [];
    var seen = {};
    seen[fold(base.name)] = 1;
    var out = [];
    (catalog || []).forEach(function (c) {
      if (!c || !c.name || c.category !== base.category || !(c.kcal > 0)) return;
      var key = fold(c.name);
      if (seen[key]) return;
      var cs = energyShares(c);
      if (!cs) return;
      var g = Math.round(kcal / c.kcal * 100 / 5) * 5;
      if (g < 5 || g > 800) return;
      var d = Math.abs(cs.pro - sh.pro) + Math.abs(cs.carb - sh.carb) + Math.abs(cs.fat - sh.fat);
      seen[key] = 1;
      out.push({ d: d, rank: c.rank != null ? c.rank : 999, group: c.group || '', alt: {
        name: c.name, quantity: g, unit: 'g', generated: true,
        kcalPer100: c.kcal, proPer100: c.pro || 0, carbPer100: c.carb || 0, fatPer100: c.fat || 0, macro_source: 'db'
      } });
    });
    out.sort(function (a, b) { return (a.d - b.d) || (a.rank - b.rank); });
    // Everyday foods first (the ranked ones of the database): when enough of
    // them are close in macros, a whey shake is swapped for tuna or chicken,
    // not for frog legs with the same numbers.
    var common = out.filter(function (o) { return o.rank < 999 && o.d <= 0.3; });
    // Within the same kind when the table says it (fish for fish, fruit for
    // fruit): "Proteine" alone puts cheese next to tuna.
    var kin = base.group ? out.filter(function (o) { return o.group === base.group && o.d <= 0.35; }) : [];
    var pool = kin.length >= 3 ? kin : (common.length >= 3 ? common : out);
    return pool.slice(0, limit).map(function (o) { return o.alt; });
  }

  /* ---------- recipes in the shopping list -------------------------------- */

  /**
   * A food that is a recipe, as its ingredients (the first alternative of
   * each, or the one chosen): the amounts of the recipe scaled from its
   * portions to the grams on the plate. Null when that cannot be done without
   * guessing (no portion weight, no portions).
   */
  function recipeIngredientsFor(food, recipe, gramsOnPlate) {
    if (!recipe || !(recipe.portionGrams > 0) || !(gramsOnPlate > 0)) return null;
    var portions = recipe.portions > 0 ? recipe.portions : 1;
    var factor = gramsOnPlate / recipe.portionGrams / portions;
    return (recipe.ingredients || []).map(function (ing) {
      var alts = ing.alternatives || [];
      var a = alts[ing.choice || 0] || alts[0];
      if (!a) return null;
      return { name: a.name, quantity: a.quantity != null ? round1(a.quantity * factor) : null, unit: a.unit || 'g', qb: !!a.qb };
    }).filter(Boolean);
  }

  var api = {
    WEEKDAYS: WEEKDAYS,
    fold: fold,
    pageColumns: pageColumns,
    parseOption: parseOption,
    splitOptions: splitOptions,
    weekdaysOf: weekdaysOf,
    parseMealColumn: parseMealColumn,
    parseNutritionTable: parseNutritionTable,
    parseRecipe: parseRecipe,
    parsePlanDocument: parsePlanDocument,
    applyChoice: applyChoice,
    linkRecipes: linkRecipes,
    setPer100: setPer100,
    per100Complete: per100Complete,
    sameFood: sameFood,
    closeFoods: closeFoods,
    coreName: coreName,
    foodTokens: foodTokens,
    generateAlternatives: generateAlternatives,
    recipeIngredientsFor: recipeIngredientsFor
  };
  root.NurvanNutritionPlan = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
