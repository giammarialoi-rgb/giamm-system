/*
 * Nutrition plan / food diary merge - one implementation, shared by the app
 * (loaded as a plain script) and the server (run in a vm sandbox).
 *
 * The plan used to travel as a single object and every copy of it - the
 * program envelope in IndexedDB, the localStorage blob, the cloud record, the
 * copy on another phone - replaced the others whole. Whichever copy was
 * written last won, so a stale one silently took every meal logged since it
 * was made. Here each day, meal, food and saved food has its own id and its
 * own updatedAt, a deletion is recorded as a tombstone, and two copies are
 * combined item by item: nothing either side holds is dropped unless someone
 * deleted it.
 *
 * Shape: nutrition.days[].meals[].foods[] (meal.items is an old alias of
 * foods), nutrition.customFoods[], plus plan-level fields (targets, name...).
 * Added fields: id and updatedAt (ms) on every item, nutrition.deleted
 * { id: ms }, nutrition.metaUpdatedAt (ms, plan-level fields), nutrition.__v.
 */
(function (root) {
  'use strict';

  var VERSION = 1;
  var MAX_TOMBSTONES = 4000;
  var ITEM_META = { id: 1, updatedAt: 1 };
  var LIST_FIELDS = { days: 1, customFoods: 1, deleted: 1, __v: 1, metaUpdatedAt: 1 };

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  function fold(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
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

  var DAY_CHILDREN = { meals: 1 };
  var MEAL_CHILDREN = { foods: 1, items: 1 };

  function contentHash(item, children) { return hash(stable(ownFields(item, children))); }

  function metaFields(n) {
    var out = {};
    Object.keys(n || {}).forEach(function (k) { if (!LIST_FIELDS[k]) out[k] = n[k]; });
    return out;
  }

  function isMergeAware(n) { return isObj(n) && Number(n.__v) >= 1; }

  function randomId(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function mealFoods(meal, legacy) {
    // Older plans and imports may carry their foods only in items, next to an
    // empty foods list; a plan that tracks its items keeps foods as the list.
    if (legacy && (!Array.isArray(meal.foods) || !meal.foods.length) && Array.isArray(meal.items) && meal.items.length) return meal.items;
    if (Array.isArray(meal.foods)) return meal.foods;
    if (Array.isArray(meal.items)) return meal.items;
    return [];
  }

  function dayKey(d) { return d.date ? 'date:' + String(d.date).slice(0, 10) : 'name:' + fold(d.day || d.name || d.title); }
  function mealKey(m) { return fold(m.name || m.title || m.meal); }
  function foodKey(f) { return fold(f.name) + '|' + String(f.quantity != null ? f.quantity : (f.qty != null ? f.qty : '')) + '|' + fold(f.unit); }

  // Gives every item an id. Items that already existed before ids did get one
  // derived from where they sit and what they hold, so two copies of the same
  // old plan agree on their ids without ever having talked to each other. With
  // fresh=true an id-less item is new since the last save and gets a unique
  // id instead: two identical foods logged on two phones are two foods.
  function ensureIds(n, fresh) {
    if (!isObj(n)) return n;
    var legacy = !isMergeAware(n);
    if (!Array.isArray(n.days)) n.days = [];
    function assign(list, parentId, keyOf, prefix) {
      var seen = {};
      list.forEach(function (item) {
        if (!isObj(item)) return;
        var key = keyOf(item);
        var k = seen[key] = (seen[key] || 0) + 1;
        if (item.id == null || item.id === '') {
          item.id = fresh ? randomId(prefix) : prefix + hash(parentId + '|' + key + '#' + k);
        } else {
          item.id = String(item.id);
        }
      });
    }
    assign(n.days, 'plan', dayKey, 'd');
    n.days.forEach(function (day) {
      if (!isObj(day)) return;
      if (!Array.isArray(day.meals)) day.meals = [];
      assign(day.meals, day.id, mealKey, 'm');
      day.meals.forEach(function (meal) {
        if (!isObj(meal)) return;
        var foods = mealFoods(meal, legacy);
        meal.foods = foods;
        meal.items = foods;
        assign(foods, meal.id, foodKey, 'f');
      });
    });
    if (Array.isArray(n.customFoods)) {
      n.customFoods.forEach(function (cf) {
        if (isObj(cf) && (cf.id == null || cf.id === '')) cf.id = 'cf' + hash(fold(cf.name));
      });
    }
    return n;
  }

  // Everything that identifies the current state: id -> content hash.
  function snapshotOf(n) {
    var snap = { items: {}, meta: '' };
    if (!isObj(n)) return snap;
    snap.meta = hash(stable(metaFields(n)));
    (n.days || []).forEach(function (day) {
      if (!isObj(day)) return;
      snap.items[day.id] = contentHash(day, DAY_CHILDREN);
      (day.meals || []).forEach(function (meal) {
        if (!isObj(meal)) return;
        snap.items[meal.id] = contentHash(meal, MEAL_CHILDREN);
        mealFoods(meal).forEach(function (f) {
          if (isObj(f)) snap.items[f.id] = contentHash(f);
        });
      });
    });
    (n.customFoods || []).forEach(function (cf) {
      if (isObj(cf)) snap.items[cf.id] = contentHash(cf);
    });
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
  // with, so it only prepares the plan (ids, version) and records nothing.
  function stamp(n, prev, now) {
    if (!isObj(n)) return null;
    var migrating = !isMergeAware(n);
    ensureIds(n, !migrating);
    n.__v = VERSION;
    if (!isObj(n.deleted)) n.deleted = {};
    var next = snapshotOf(n);
    if (!prev) return next;
    now = now || Date.now();
    var items = {};
    (n.days || []).forEach(function (day) {
      if (!isObj(day)) return;
      items[day.id] = day;
      (day.meals || []).forEach(function (meal) {
        if (!isObj(meal)) return;
        items[meal.id] = meal;
        mealFoods(meal).forEach(function (f) { if (isObj(f)) items[f.id] = f; });
      });
    });
    (n.customFoods || []).forEach(function (cf) { if (isObj(cf)) items[cf.id] = cf; });
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
    return snapshotOf(n);
  }

  function ts(item) { return Number(item && item.updatedAt) || 0; }

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  // Merges two lists of items with ids. `b` wins a tie and sets the order; an
  // item only `a` has is placed right after the item it followed in `a`.
  function mergeLists(aList, bList, mergeItem, deleted, tracked) {
    var a = (aList || []).filter(isObj);
    var b = (bList || []).filter(isObj);
    var aById = {};
    a.forEach(function (it) { aById[it.id] = it; });
    var bIds = {};
    var out = b.map(function (it) {
      bIds[it.id] = true;
      return aById[it.id] ? mergeItem(aById[it.id], it) : clone(it);
    });
    var prevId = null;
    a.forEach(function (it) {
      if (!bIds[it.id]) {
        var copy = clone(it);
        var at = prevId == null ? -1 : out.findIndex(function (o) { return o.id === prevId; });
        out.splice(at + 1, 0, copy);
      }
      prevId = it.id;
    });
    return out.filter(function (it) { return survives(it, deleted, tracked); });
  }

  function newestChild(it) {
    var best = ts(it);
    (it.meals || []).forEach(function (m) { best = Math.max(best, newestChild(m)); });
    mealFoods(it).forEach(function (f) { best = Math.max(best, ts(f)); });
    return best;
  }

  // A deleted item stays deleted unless it (or something added inside it) was
  // edited after the deletion - then the newer edit is kept, never lost.
  //
  // A deletion only ever applies to an item that already carried its id. An
  // item that is only now being given one (an old copy, or a plan some code
  // just rebuilt) may be the deleted one or a new one that happens to look the
  // same - the same date, the same meal - and when in doubt it is kept.
  function survives(it, deleted, tracked) {
    var t = deleted[it.id];
    if (!t) return true;
    if (tracked && !tracked[it.id]) return true;
    return newestChild(it) > t;
  }

  function collectIds(n, out) {
    if (!isObj(n)) return out;
    (n.days || []).forEach(function (day) {
      if (!isObj(day)) return;
      if (day.id != null && day.id !== '') out[String(day.id)] = true;
      (day.meals || []).forEach(function (meal) {
        if (!isObj(meal)) return;
        if (meal.id != null && meal.id !== '') out[String(meal.id)] = true;
        [meal.foods, meal.items].forEach(function (list) {
          (Array.isArray(list) ? list : []).forEach(function (f) {
            if (isObj(f) && f.id != null && f.id !== '') out[String(f.id)] = true;
          });
        });
      });
    });
    (n.customFoods || []).forEach(function (cf) {
      if (isObj(cf) && cf.id != null && cf.id !== '') out[String(cf.id)] = true;
    });
    return out;
  }

  function pickFields(a, b, children) {
    var winner = ts(a) > ts(b) ? a : b;
    var out = ownFields(winner, children);
    out.id = winner.id;
    if (winner.updatedAt != null) out.updatedAt = winner.updatedAt;
    return out;
  }

  function mergeFood(a, b) { return clone(pickFields(a, b)); }

  function makeMealMerger(deleted, tracked) {
    return function (a, b) {
      var out = clone(pickFields(a, b, MEAL_CHILDREN));
      var foods = mergeLists(mealFoods(a), mealFoods(b), mergeFood, deleted, tracked);
      out.foods = foods;
      out.items = foods;
      return out;
    };
  }

  function makeDayMerger(deleted, tracked) {
    var mergeMeal = makeMealMerger(deleted, tracked);
    return function (a, b) {
      var out = clone(pickFields(a, b, DAY_CHILDREN));
      out.meals = mergeLists(a.meals, b.meals, mergeMeal, deleted, tracked);
      return out;
    };
  }

  function relinkItems(n) {
    (n.days || []).forEach(function (day) {
      (day.meals || []).forEach(function (meal) {
        var foods = mealFoods(meal);
        meal.foods = foods;
        meal.items = foods;
      });
    });
    return n;
  }

  // Combines two copies of the plan; `b` is the incoming one (wins ties, sets
  // the order). Neither argument is modified.
  function merge(a, b) {
    if (!isObj(a)) return isObj(b) ? relinkItems(ensureIds(clone(b), false)) : b;
    if (!isObj(b)) return relinkItems(ensureIds(clone(a), false));
    var tracked = collectIds(b, collectIds(a, {}));
    var A = ensureIds(clone(a), false);
    var B = ensureIds(clone(b), false);
    var deleted = {};
    [A.deleted, B.deleted].forEach(function (d) {
      if (!isObj(d)) return;
      Object.keys(d).forEach(function (id) { deleted[id] = Math.max(deleted[id] || 0, Number(d[id]) || 0); });
    });
    var metaFrom = (Number(A.metaUpdatedAt) || 0) > (Number(B.metaUpdatedAt) || 0) ? A : B;
    var out = clone(metaFields(metaFrom));
    out.metaUpdatedAt = Math.max(Number(A.metaUpdatedAt) || 0, Number(B.metaUpdatedAt) || 0) || undefined;
    if (out.metaUpdatedAt === undefined) delete out.metaUpdatedAt;
    out.days = mergeLists(A.days, B.days, makeDayMerger(deleted, tracked), deleted, tracked);
    if (Array.isArray(A.customFoods) || Array.isArray(B.customFoods)) {
      out.customFoods = mergeLists(A.customFoods, B.customFoods, mergeFood, deleted, tracked);
    }
    out.deleted = trimTombstones(deleted);
    out.__v = VERSION;
    if (out.days.length && out.present == null) out.present = true;
    return relinkItems(out);
  }

  var api = {
    VERSION: VERSION,
    isMergeAware: isMergeAware,
    ensureIds: ensureIds,
    snapshotOf: snapshotOf,
    stamp: stamp,
    merge: merge
  };
  root.NurvanNutritionMerge = api;
})(typeof self !== 'undefined' ? self : this);
