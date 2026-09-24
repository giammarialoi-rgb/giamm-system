/*
 * Ricerca alimenti per pertinenza.
 *
 * Chi scrive "pet" cerca il petto di pollo, non un elenco alfabetico di
 * tutto cio' che contiene quelle tre lettere in qualche lingua. Qui ogni
 * alimento del catalogo locale riceve un punteggio:
 *
 *   nome italiano che inizia con il testo            100
 *   una parola del nome italiano che inizia col testo  80
 *   un alias italiano che inizia col testo             60
 *   il testo dentro il nome italiano                   30
 *   nome inglese o categoria                           10, e solo se nessun
 *                                                      alimento supera 30
 *
 * piu' l'uso dell'atleta: +50 se l'ha gia' usato, +10 per ogni uso negli
 * ultimi 30 giorni (fino a +30). A parita': il nome piu' corto, poi l'ordine
 * del curatore (`rank`), poi l'alfabeto. Al massimo 8 risultati.
 *
 * Il testo e il nome si confrontano minuscoli, senza accenti, senza apostrofi
 * ("d'anatra" = "d anatra") e con un singolare semplice per le parole di
 * almeno 4 lettere (-i -> -o, -e -> -a: "olive" trova "oliva", "mele" trova
 * "mela"). L'ultima parola del testo e' quella che si sta scrivendo, e resta
 * anche com'e': "oli" non diventa "olo".
 *
 * La rete e' un'altra sezione (vedi la pagina): qui ci sono solo le regole
 * locali e le costanti che la pagina usa.
 */
(function (root) {
  'use strict';

  var LOCAL_LIMIT = 8;
  var REMOTE_LIMIT = 6;
  var REMOTE_MIN_CHARS = 3;
  var REMOTE_TIMEOUT_MS = 2000;
  var SEARCH_DELAY_MS = 150;
  var RECENT_DAYS = 30;

  var SCORE = { start: 100, word: 80, alias: 60, substring: 30, fallback: 10 };
  var BONUS = { used: 50, recentEach: 10, recentMax: 30 };

  function fold(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/['’‘`´]/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function singularWord(w) {
    if (w.length < 4) return w;
    if (/i$/.test(w)) return w.slice(0, -1) + 'o';
    if (/e$/.test(w)) return w.slice(0, -1) + 'a';
    return w;
  }

  function singular(s) {
    return s.split(' ').map(singularWord).join(' ');
  }

  // The forms a text is compared in: as written, and with a simple singular.
  function formsOf(text) {
    var f = fold(text);
    var s = singular(f);
    return s === f ? [f] : [f, s];
  }

  function startsAtWord(hay, needle) {
    if (!needle) return false;
    if (hay.indexOf(needle) === 0) return true;
    return hay.indexOf(' ' + needle) >= 0;
  }

  function anyForm(hays, needles, test) {
    for (var i = 0; i < hays.length; i++) {
      for (var j = 0; j < needles.length; j++) if (test(hays[i], needles[j])) return true;
    }
    return false;
  }

  // Italian aliases: the aliases that are neither the name nor the English
  // name (the generated catalog repeats both among the aliases).
  function italianAliases(food) {
    var name = fold(food.name);
    var en = fold(food.name_en);
    return (food.aliases || []).map(fold).filter(function (a) { return a && a !== name && a !== en; });
  }

  // The relevance of a food for a query, without the usage bonus.
  function scoreFood(food, query) {
    var q = formsOf(query);
    if (!q[0]) return { score: 0, fallback: false };
    var name = formsOf(food.name);
    if (anyForm(name, q, function (h, n) { return h.indexOf(n) === 0; })) return { score: SCORE.start, fallback: false };
    if (anyForm(name, q, startsAtWord)) return { score: SCORE.word, fallback: false };
    var aliases = [];
    italianAliases(food).forEach(function (a) { aliases = aliases.concat(formsOf(a)); });
    if (aliases.length && anyForm(aliases, q, startsAtWord)) return { score: SCORE.alias, fallback: false };
    if (anyForm(name, q, function (h, n) { return h.indexOf(n) >= 0; })) return { score: SCORE.substring, fallback: false };
    var other = formsOf(food.name_en).concat(formsOf(food.category));
    if (anyForm(other, q, function (h, n) { return h.indexOf(n) >= 0; })) return { score: SCORE.fallback, fallback: true };
    return { score: 0, fallback: false };
  }

  function usageBonus(u) {
    if (!u || !u.used) return 0;
    return BONUS.used + Math.min(BONUS.recentMax, BONUS.recentEach * Math.max(0, Number(u.recent) || 0));
  }

  /**
   * rank(catalog, query, opts) -> the best local foods, best first.
   * opts: { limit = 8, usage: function (food) -> { used: bool, recent: n } }
   * Each result is the catalog item plus `_score` (relevance + usage).
   */
  function rank(catalog, query, opts) {
    opts = opts || {};
    var limit = opts.limit == null ? LOCAL_LIMIT : opts.limit;
    if (!fold(query)) return [];
    var hits = [];
    var fallbacks = [];
    var best = 0;
    (catalog || []).forEach(function (food) {
      if (!food || !food.name) return;
      var s = scoreFood(food, query);
      if (!s.score) return;
      if (s.fallback) { fallbacks.push({ food: food, base: s.score }); return; }
      best = Math.max(best, s.score);
      hits.push({ food: food, base: s.score });
    });
    if (best <= SCORE.substring) hits = hits.concat(fallbacks);
    hits.forEach(function (h) {
      h.total = h.base + usageBonus(opts.usage ? opts.usage(h.food) : null);
      h.len = String(h.food.name).length;
      h.rank = Number(h.food.rank);
      if (!Number.isFinite(h.rank)) h.rank = 999;
    });
    hits.sort(function (a, b) {
      return (b.total - a.total) || (a.len - b.len) || (a.rank - b.rank) ||
        String(a.food.name).localeCompare(String(b.food.name), 'it');
    });
    return hits.slice(0, limit).map(function (h) {
      return Object.assign({}, h.food, { _score: h.total });
    });
  }

  // How often each food was used: a map from the folded name to
  // { used, recent }. `entries` are { name, at } - `at` a date (or null when
  // the use has no date, which still counts as used).
  function usageIndex(entries, now) {
    var nowMs = now == null ? Date.now() : Number(now);
    var since = nowMs - RECENT_DAYS * 86400000;
    var map = {};
    (entries || []).forEach(function (e) {
      var key = fold(e && e.name);
      if (!key) return;
      var u = map[key] || (map[key] = { used: true, recent: 0 });
      var t = e.at ? new Date(e.at).getTime() : NaN;
      if (Number.isFinite(t) && t >= since && t <= nowMs + 86400000) u.recent += 1;
    });
    return {
      get: function (food) { return map[fold(food && food.name)] || null; },
      map: map
    };
  }

  root.NurvanFoodSearch = {
    LOCAL_LIMIT: LOCAL_LIMIT,
    REMOTE_LIMIT: REMOTE_LIMIT,
    REMOTE_MIN_CHARS: REMOTE_MIN_CHARS,
    REMOTE_TIMEOUT_MS: REMOTE_TIMEOUT_MS,
    SEARCH_DELAY_MS: SEARCH_DELAY_MS,
    RECENT_DAYS: RECENT_DAYS,
    SCORE: SCORE,
    BONUS: BONUS,
    fold: fold,
    singular: singular,
    scoreFood: scoreFood,
    rank: rank,
    usageIndex: usageIndex
  };
})(typeof self !== 'undefined' ? self : this);
