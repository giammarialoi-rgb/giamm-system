/*
 * Merge for the user's record domains - nutrition (plan and food diary),
 * supplementation, therapy, exams. One implementation, shared by the app
 * (loaded as a plain script) and the server (run in a vm sandbox).
 *
 * Each domain used to travel as a single object and every copy of it - the
 * program envelope in IndexedDB, the localStorage blob, the cloud record, the
 * copy on another phone, the coach's copy of an athlete's plan - replaced the
 * others whole. Whichever copy was written last won, so a stale one silently
 * took everything recorded since it was made. Here every item has its own id
 * and updatedAt, a deletion is recorded as a tombstone, and two copies are
 * combined item by item: nothing either side holds is dropped unless someone
 * deleted it.
 *
 * Items live in the lists named per domain below (nutrition nests
 * days[].meals[].foods[]; meal.items is an old alias of foods). Everything
 * else on the domain object is plan-level. Added fields: id and updatedAt (ms)
 * on every item, deleted { id: ms }, metaUpdatedAt (ms, plan-level fields),
 * __v.
 */
(function (root) {
  'use strict';

  var VERSION = 1;
  var MAX_TOMBSTONES = 4000;
  var ITEM_META = { id: 1, updatedAt: 1 };
  var OWN_FIELDS = { deleted: 1, __v: 1, metaUpdatedAt: 1 };
  var COMBINING_MARKS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  function fold(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD')
      .replace(COMBINING_MARKS, '').replace(/\s+/g, ' ').trim();
  }

  // Small stable string hash (FNV-1a, 32 bit, base36). Ids and change
  // detection only - nothing here is security sensitive.
  function hash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(36);
  }

  // JSON with sorted keys, so the same content always hashes the same.
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (isObj(v)) {
      return '{' + Object.keys(v).sort().map(function (k) {
        return JSON.stringify(k) + ':' + stable(v[k]);
      }).join(',') + '}';
    }
    return JSON.stringify(v === undefined ? null : v);
  }

  function ownFields(item, skip) {
    var out = {};
    Object.keys(item || {}).forEach(function (k) {
      if (ITEM_META[k] || (skip && skip[k])) return;
      out[k] = item[k];
    });
    return out;
  }

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function ts(item) { return Number(item && item.updatedAt) || 0; }
  function hasId(item) { return item.id != null && item.id !== ''; }

  function randomId(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function isMergeAware(n) { return isObj(n) && Number(n.__v) >= 1; }

  /* ---------- the shape of each domain ---------------------------------- */

  // Older plans and imports may carry a meal's foods only in items, next to an
  // empty foods list; a plan that tracks its items keeps foods as the list.
  function mealFoods(meal, legacy) {
    if (legacy && (!Array.isArray(meal.foods) || !meal.foods.length) && Array.isArray(meal.items) && meal.items.length) return meal.items;
    if (Array.isArray(meal.foods)) return meal.foods;
    if (Array.isArray(meal.items)) return meal.items;
    return [];
  }

  var FOOD = {
    field: 'foods', prefix: 'f', children: [],
    key: function (f) { return fold(f.name) + '|' + String(f.quantity != null ? f.quantity : (f.qty != null ? f.qty : '')) + '|' + fold(f.unit); },
    get: mealFoods,
    set: function (meal, list) { meal.foods = list; meal.items = list; }
  };
  // A new day with a date, and a new meal, get the id their key gives rather
  // than a random one (stableFresh): two phones that each open the diary on
  // 25/09 before syncing create the same day, not two "25/09" days with the
  // meals split between them. Foods stay random: two identical foods logged
  // on two phones are two foods.
  var MEAL = {
    field: 'meals', prefix: 'm', children: [FOOD], skip: { foods: 1, items: 1 },
    key: function (m) { return fold(m.name || m.title || m.meal); },
    stableFresh: function () { return true; }
  };
  var DAY = {
    field: 'days', prefix: 'd', children: [MEAL], skip: { meals: 1 }, parentId: 'plan',
    key: function (d) { return d.date ? 'date:' + String(d.date).slice(0, 10) : 'name:' + fold(d.day || d.name || d.title); },
    stableFresh: function (d) { return !!(d && d.date); }
  };
  var CUSTOM_FOOD = {
    field: 'customFoods', prefix: 'cf', children: [],
    key: function (cf) { return fold(cf.name); },
    legacyId: function (cf) { return 'cf' + hash(fold(cf.name)); }
  };
  // A flat list: an item is identified by what it holds.
  function flat(field) {
    return {
      field: field, prefix: field.charAt(0), children: [], parentId: field,
      key: function (it) { return hash(stable(ownFields(it))); }
    };
  }

  var DOMAINS = {
    nutrition: [DAY, CUSTOM_FOOD],
    supplementation: [flat('items')],
    therapy: [flat('medications'), flat('protocols'), flat('entries')],
    exams: [flat('records'), flat('items'), flat('reminders')]
  };

  function rootsOf(domain) {
    var roots = DOMAINS[domain || 'nutrition'];
    if (!roots) throw new Error('unknown domain ' + domain);
    return roots;
  }

  function listOf(parent, spec, legacy) {
    if (spec.get) return spec.get(parent, legacy);
    return Array.isArray(parent[spec.field]) ? parent[spec.field] : [];
  }
  function setList(parent, spec, list) {
    if (spec.set) spec.set(parent, list);
    else parent[spec.field] = list;
  }

  // A root list is tracked item by item only when it holds objects; a list of
  // plain values (a few old fields are) is treated as a plan-level field.
  function managed(n, spec) {
    var v = n[spec.field];
    return v == null || (Array.isArray(v) && v.every(isObj));
  }
  function managedRoots(n, domain) {
    return rootsOf(domain).filter(function (spec) { return managed(n, spec); });
  }

  function metaFields(n, domain) {
    var skip = {};
    managedRoots(n, domain).forEach(function (spec) { skip[spec.field] = 1; });
    var out = {};
    Object.keys(n || {}).forEach(function (k) {
      if (!OWN_FIELDS[k] && !skip[k]) out[k] = n[k];
    });
    return out;
  }

  // Calls fn(item, spec) for every tracked item.
  function walk(n, domain, fn, legacy) {
    function visit(parent, spec) {
      listOf(parent, spec, legacy).forEach(function (item) {
        if (!isObj(item)) return;
        fn(item, spec);
        spec.children.forEach(function (child) { visit(item, child); });
      });
    }
    managedRoots(n, domain).forEach(function (spec) { visit(n, spec); });
  }

  /* ---------- ids, snapshots, recording changes ------------------------- */

  // Gives every item an id. Items that already existed before ids did get one
  // derived from where they sit and what they hold, so two copies of the same
  // old record agree on their ids without ever having talked to each other.
  // With fresh=true an id-less item is new since the last save and gets a
  // unique id instead: two identical foods logged on two phones are two foods.
  function ensureIds(n, fresh, domain) {
    if (!isObj(n)) return n;
    var legacy = !isMergeAware(n);
    function assign(parent, spec, parentId) {
      var list = listOf(parent, spec, legacy);
      setList(parent, spec, list);
      var seen = {};
      list.forEach(function (item) {
        if (!isObj(item)) return;
        var key = spec.key(item);
        var k = seen[key] = (seen[key] || 0) + 1;
        if (!hasId(item)) {
          if (fresh && !(spec.stableFresh && spec.stableFresh(item))) item.id = randomId(spec.prefix);
          else item.id = spec.legacyId ? spec.legacyId(item) : spec.prefix + hash(parentId + '|' + key + '#' + k);
        } else {
          item.id = String(item.id);
        }
        spec.children.forEach(function (child) { assign(item, child, item.id); });
      });
    }
    managedRoots(n, domain).forEach(function (spec) {
      if (spec.field === 'days' && !Array.isArray(n.days)) n.days = [];
      if (Array.isArray(n[spec.field])) assign(n, spec, spec.parentId || spec.field);
    });
    return n;
  }

  // Everything that identifies the current state: id -> content hash.
  function snapshotOf(n, domain) {
    var snap = { items: {}, meta: '' };
    if (!isObj(n)) return snap;
    snap.meta = hash(stable(metaFields(n, domain)));
    walk(n, domain, function (item, spec) { snap.items[item.id] = hash(stable(ownFields(item, spec.skip))); });
    return snap;
  }

  function trimTombstones(deleted) {
    var ids = Object.keys(deleted);
    if (ids.length <= MAX_TOMBSTONES) return deleted;
    ids.sort(function (a, b) { return deleted[b] - deleted[a]; });
    var out = {};
    ids.slice(0, MAX_TOMBSTONES).forEach(function (id) { out[id] = deleted[id]; });
    return out;
  }

  // Records what changed since `prev` (a snapshotOf result): new or edited
  // items get updatedAt = now, items that are gone get a tombstone. Returns
  // the new snapshot. Without a previous snapshot there is nothing to compare
  // with, so it only prepares the record (ids, version) and records nothing.
  function stamp(n, prev, now, domain) {
    if (!isObj(n)) return null;
    ensureIds(n, isMergeAware(n), domain);
    n.__v = VERSION;
    if (!isObj(n.deleted)) n.deleted = {};
    var next = snapshotOf(n, domain);
    if (!prev) return next;
    now = now || Date.now();
    var items = {};
    walk(n, domain, function (item) { items[item.id] = item; });
    Object.keys(next.items).forEach(function (id) {
      if (prev.items[id] !== next.items[id]) {
        items[id].updatedAt = now;
        if (n.deleted[id]) delete n.deleted[id];
      }
    });
    Object.keys(prev.items).forEach(function (id) {
      if (!(id in next.items)) n.deleted[id] = now;
    });
    if (prev.meta !== next.meta) n.metaUpdatedAt = now;
    n.deleted = trimTombstones(n.deleted);
    return snapshotOf(n, domain);
  }

  /* ---------- combining two copies -------------------------------------- */

  function newestInside(item, spec) {
    var best = ts(item);
    spec.children.forEach(function (child) {
      listOf(item, child).forEach(function (c) { if (isObj(c)) best = Math.max(best, newestInside(c, child)); });
    });
    return best;
  }

  // A deleted item stays deleted unless it (or something added inside it) was
  // edited after the deletion - then the newer edit is kept, never lost.
  //
  // A deletion only ever applies to an item that already carried its id. An
  // item that is only now being given one (an old copy, or a record some code
  // just rebuilt) may be the deleted one or a new one that happens to look the
  // same - the same date, the same meal - and when in doubt it is kept.
  function survives(item, spec, ctx) {
    var t = ctx.deleted[item.id];
    if (!t) return true;
    if (!ctx.tracked[item.id]) return true;
    return newestInside(item, spec) > t;
  }

  function mergeItem(a, b, spec, ctx) {
    var winner = ts(a) > ts(b) ? a : b;
    var out = clone(ownFields(winner, spec.skip));
    out.id = winner.id;
    if (winner.updatedAt != null) out.updatedAt = winner.updatedAt;
    spec.children.forEach(function (child) {
      setList(out, child, mergeLists(listOf(a, child), listOf(b, child), child, ctx));
    });
    return out;
  }

  // `b` wins a tie and sets the order; an item only `a` has is placed right
  // after the item it followed in `a`.
  function mergeLists(aList, bList, spec, ctx) {
    var a = (aList || []).filter(isObj);
    var b = (bList || []).filter(isObj);
    var aById = {};
    a.forEach(function (it) { aById[it.id] = it; });
    var bIds = {};
    var out = b.map(function (it) {
      bIds[it.id] = true;
      return aById[it.id] ? mergeItem(aById[it.id], it, spec, ctx) : clone(it);
    });
    var prevId = null;
    a.forEach(function (it) {
      if (!bIds[it.id]) {
        var at = prevId == null ? -1 : out.findIndex(function (o) { return o.id === prevId; });
        out.splice(at + 1, 0, clone(it));
      }
      prevId = it.id;
    });
    return out.filter(function (it) { return survives(it, spec, ctx); });
  }

  function collectIds(n, domain, out) {
    if (!isObj(n)) return out;
    // Before ensureIds: only ids the copy really carried count.
    walk(n, domain, function (item) { if (hasId(item)) out[String(item.id)] = true; }, !isMergeAware(n));
    return out;
  }

  function relink(n, domain) {
    walk(n, domain, function (item, spec) {
      spec.children.forEach(function (child) { setList(item, child, listOf(item, child)); });
    });
    return n;
  }

  // Combines two copies; `b` is the incoming one (wins ties, sets the order).
  // Neither argument is modified.
  function merge(a, b, domain) {
    if (!isObj(a)) return isObj(b) ? relink(ensureIds(clone(b), false, domain), domain) : b;
    if (!isObj(b)) return relink(ensureIds(clone(a), false, domain), domain);
    var ctx = { deleted: {}, tracked: collectIds(b, domain, collectIds(a, domain, {})) };
    var A = ensureIds(clone(a), false, domain);
    var B = ensureIds(clone(b), false, domain);
    [A.deleted, B.deleted].forEach(function (d) {
      if (!isObj(d)) return;
      Object.keys(d).forEach(function (id) { ctx.deleted[id] = Math.max(ctx.deleted[id] || 0, Number(d[id]) || 0); });
    });
    var metaFrom = (Number(A.metaUpdatedAt) || 0) > (Number(B.metaUpdatedAt) || 0) ? A : B;
    var out = clone(metaFields(metaFrom, domain));
    var metaAt = Math.max(Number(A.metaUpdatedAt) || 0, Number(B.metaUpdatedAt) || 0);
    if (metaAt) out.metaUpdatedAt = metaAt;
    var anyItems = false;
    rootsOf(domain).forEach(function (spec) {
      if (!managed(A, spec) || !managed(B, spec)) return; // a plain-value list: plan-level
      if (!Array.isArray(A[spec.field]) && !Array.isArray(B[spec.field])) {
        if (spec.field === 'days') out.days = [];
        return;
      }
      out[spec.field] = mergeLists(A[spec.field], B[spec.field], spec, ctx);
      if (out[spec.field].length && spec.field !== 'customFoods') anyItems = true;
    });
    out.deleted = trimTombstones(ctx.deleted);
    out.__v = VERSION;
    if (anyItems && out.present == null) out.present = true;
    return relink(out, domain);
  }

  // `next` deliberately takes the place of `current` (a new plan assigned, a
  // section cleared): everything current holds that next does not is recorded
  // as deleted, so no copy of the old plan brings it back. Anything added
  // somewhere current never saw is untouched by that, and is kept.
  function replace(current, next, now, domain) {
    if (!isObj(next)) return next;
    var out = clone(next);
    now = now || Date.now();
    if (!isObj(current)) {
      stamp(out, null, now, domain);
      return out;
    }
    var cur = ensureIds(clone(current), false, domain);
    var prev = snapshotOf(cur, domain);
    out.deleted = Object.assign({}, isObj(cur.deleted) ? cur.deleted : {}, isObj(out.deleted) ? out.deleted : {});
    stamp(out, prev, now, domain);
    return out;
  }

  function forDomain(domain) {
    return {
      isMergeAware: isMergeAware,
      ensureIds: function (n, fresh) { return ensureIds(n, fresh, domain); },
      snapshotOf: function (n) { return snapshotOf(n, domain); },
      stamp: function (n, prev, now) { return stamp(n, prev, now, domain); },
      merge: function (a, b) { return merge(a, b, domain); },
      replace: function (cur, next, now) { return replace(cur, next, now, domain); }
    };
  }

  root.NurvanDomainMerge = {
    VERSION: VERSION,
    DOMAINS: Object.keys(DOMAINS),
    isMergeAware: isMergeAware,
    ensureIds: ensureIds,
    snapshotOf: snapshotOf,
    stamp: stamp,
    merge: merge,
    replace: replace,
    forDomain: forDomain
  };
  root.NurvanNutritionMerge = forDomain('nutrition');
})(typeof self !== 'undefined' ? self : this);
