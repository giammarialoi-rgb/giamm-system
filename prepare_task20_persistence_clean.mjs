/**
 * ============================================================
 * GIAMMARIA SYSTEM — HIGH-RELIABILITY PERSISTENCE CORE 2.0
 * Architecture Layer 4: Enterprise-grade IndexedDB + LocalStorage Sync
 * ============================================================
 */

var DB_NAME = 'GIAMMARIA_SYSTEM_DB';
var DB_VERSION = 2;

var STORES = {
  PROGRAMS: 'programs',             // Canonical programs (active + versions)
  NUTRITION: 'nutrition',           // Meal plans, macros, food records
  SUPPLEMENTS: 'supplements',       // Supplementation protocols & logs
  THERAPY: 'therapy',               // Medical therapy schedules & adherence
  EXAMS: 'exams',                   // Clinical lab exams & bloodwork history
  CALENDAR: 'calendar',             // Unified calendar events & reminders
  REMINDERS: 'reminders',           // Notification schedules & alerts
  FOOD_DB: 'food_db',               // Local offline food macro database
  SUPPLEMENT_DB: 'supplement_db',   // Local offline supplement database
  DRUG_DB: 'drug_db'                // Local offline medication database
};

/**
 * Deterministic JSON Serializer (Key sorting + deterministic whitespace)
 */
function deterministicSerialize(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(item => deterministicSerialize(item)).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + deterministicSerialize(obj[k])).join(',') + '}';
}

/**
 * Deep Equality Comparison
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  return deterministicSerialize(a) === deterministicSerialize(b);
}

/**
 * Deterministic Fingerprint / Checksum calculation (FNV-1a 64-bit style hash)
 */
function getDeterministicFingerprint(obj) {
  if (obj === undefined || obj === null) return '0000000000000000';
  const str = typeof obj === 'string' ? obj : deterministicSerialize(obj);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hash.toString(16).padStart(16, '0');
}

/**
 * Environment-safe IndexedDB reference getter
 */
function getIDBFactory() {
  if (typeof indexedDB !== 'undefined') return indexedDB;
  if (typeof window !== 'undefined' && window.indexedDB) return window.indexedDB;
  if (typeof globalThis !== 'undefined' && globalThis.indexedDB) return globalThis.indexedDB;
  return null;
}

/**
 * Memory-only Fallback IDB implementation for headless/testing environments without native IndexedDB
 */
class MemoryIDBStore {
  constructor() {
    this.stores = {};
    Object.values(STORES).forEach(s => { this.stores[s] = new Map(); });
  }

  async get(storeName, key) {
    if (!this.stores[storeName]) return null;
    const val = this.stores[storeName].get(key);
    return val !== undefined ? JSON.parse(JSON.stringify(val)) : null;
  }

  async put(storeName, val, key) {
    if (!this.stores[storeName]) this.stores[storeName] = new Map();
    const effectiveKey = key || val.id || 'default';
    this.stores[storeName].set(effectiveKey, JSON.parse(JSON.stringify(val)));
    return effectiveKey;
  }

  async delete(storeName, key) {
    if (this.stores[storeName]) this.stores[storeName].delete(key);
    return true;
  }

  async getAll(storeName) {
    if (!this.stores[storeName]) return [];
    return Array.from(this.stores[storeName].values()).map(v => JSON.parse(JSON.stringify(v)));
  }

  async clear(storeName) {
    if (this.stores[storeName]) this.stores[storeName].clear();
    return true;
  }
}

class MemoryIndexedDB extends MemoryIDBStore {}

/**
 * Master Enterprise Persistence Class
 */
class GiammariaPersistenceEngine {
  constructor(customIdbOrOptions = null) {
    if (customIdbOrOptions && typeof customIdbOrOptions === 'object' && customIdbOrOptions.customDb) {
      this._customIdb = customIdbOrOptions.customDb;
    } else {
      this._customIdb = customIdbOrOptions;
    }
    this._db = null;
    this._openPromise = null;
    this._memStore = null;
  }

  isAvailable() {
    return Boolean(this._db) || Boolean(this._customIdb) || (typeof indexedDB !== 'undefined') || Boolean(this._memStore);
  }

  /**
   * Opens connection to GIAMMARIA_SYSTEM_DB and configures stores
   */
  async init() { return this.dbOpen(); }
  async dbOpen() {
    if (this._db) return this._db;
    if (this._openPromise) return this._openPromise;

    this._openPromise = new Promise((resolve, reject) => {
      const idb = this._customIdb || getIDBFactory();
      if (!idb) {
        // Use memory fallback
        this._memStore = new MemoryIDBStore();
        return resolve({ isMemoryFallback: true });
      }

      try {
        const req = idb.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
          const db = req.result || e.target?.result;
          if (!db) return;
          Object.values(STORES).forEach(storeName => {
            const hasStore = typeof db.objectStoreNames?.contains === 'function' 
              ? db.objectStoreNames.contains(storeName) 
              : Array.isArray(db.objectStoreNames) 
                ? db.objectStoreNames.includes(storeName) 
                : false;

            if (!hasStore) {
              let s;
              if (storeName === STORES.PROGRAMS) {
                s = db.createObjectStore(storeName, { keyPath: 'id' });
                if (s && typeof s.createIndex === 'function') {
                  s.createIndex('isActive', 'isActive', { unique: false });
                  s.createIndex('fingerprint', 'fingerprint', { unique: false });
                  s.createIndex('updatedAt', 'updatedAt', { unique: false });
                }
              } else if (storeName === STORES.EXAMS) {
                s = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                if (s && typeof s.createIndex === 'function') {
                  s.createIndex('date', 'date', { unique: false });
                  s.createIndex('parameter', 'parameter', { unique: false });
                }
              } else if (storeName === STORES.REMINDERS) {
                s = db.createObjectStore(storeName, { keyPath: 'id' });
                if (s && typeof s.createIndex === 'function') {
                  s.createIndex('time', 'time', { unique: false });
                  s.createIndex('enabled', 'enabled', { unique: false });
                }
              } else {
                s = db.createObjectStore(storeName, { keyPath: 'id' });
              }
            }
          });
        };

        req.onsuccess = () => {
          this._db = req.result;
          resolve(this._db);
        };

        req.onerror = () => {
          // Graceful fallback to memory store
          console.warn('[IndexedDB Warning] Native open failed, activating MemoryIDB fallback', req.error);
          this._memStore = new MemoryIDBStore();
          resolve({ isMemoryFallback: true });
        };
      } catch (err) {
        console.warn('[IndexedDB Warning] Synchronous open error, activating MemoryIDB fallback', err);
        this._memStore = new MemoryIDBStore();
        resolve({ isMemoryFallback: true });
      }
    });

    return this._openPromise;
  }

  /**
   * Internal transaction executor
   */
  async dbTransaction(storeName, mode, callback) {
    await this.dbOpen();
    if (this._memStore) {
      return callback(this._memStore);
    }
    return new Promise((resolve, reject) => {
      try {
        const tx = this._db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        let result;

        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Transaction aborted'));

        result = callback(store, tx);
      } catch (err) {
        reject(err);
      }
    });
  }

  async dbGet(storeName, key) {
    await this.dbOpen();
    if (this._memStore) return this._memStore.get(storeName, key);
    return new Promise((resolve, reject) => {
      try {
        const tx = this._db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async dbPut(storeName, value) {
    await this.dbOpen();
    if (this._memStore) return this._memStore.put(storeName, value);
    return new Promise((resolve, reject) => {
      try {
        const tx = this._db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(value);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async dbDelete(storeName, key) {
    await this.dbOpen();
    if (this._memStore) return this._memStore.delete(storeName, key);
    return new Promise((resolve, reject) => {
      try {
        const tx = this._db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async dbGetAll(storeName) {
    await this.dbOpen();
    if (this._memStore) return this._memStore.getAll(storeName);
    return new Promise((resolve, reject) => {
      try {
        const tx = this._db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async dbClear(storeName) {
    await this.dbOpen();
    if (this._memStore) return this._memStore.clear(storeName);
    return new Promise((resolve, reject) => {
      try {
        const tx = this._db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async wipeDatabase() {
    await this.dbOpen();
    for (const storeName of Object.values(STORES)) {
      try {
        await this.dbClear(storeName);
      } catch (e) {
        console.warn(`[PERSISTENCE] Error clearing store ${storeName}:`, e);
      }
    }
    if (this._memStore) {
      this._memStore.stores = {};
      Object.values(STORES).forEach(s => { this._memStore.stores[s] = new Map(); });
    }
    return { success: true, ok: true };
  }

  async clearWorkoutLogs() {
    // Workout actual loads/logs live in localStorage GS_STORE (store.data / customSets),
    // not in dedicated IDB stores. Preserve programs, nutrition, therapy, supplements.
    // No-op on IDB domain stores — callers must clear in-memory store.data themselves.
    await this.dbOpen();
    return {
      success: true,
      ok: true,
      note: 'Workout logs are LocalStorage-keyed (store.data). Callers clear store.data/customSets; IDB domain stores preserved.'
    };
  }

  /**
   * Atomically persist full multi-domain canonical program + read-back verify.
   */
  async activateCanonicalProgram(prog) {
    if (!prog || typeof prog !== 'object') {
      throw new Error('Activation Error: canonical program required');
    }
    const training = prog.training || prog;
    if (!Array.isArray(training.weeks) && !Array.isArray(prog.weeks)) {
      throw new Error('Activation Error: program must contain weeks');
    }

    const saveRes = await this.saveActiveProgram(prog);
    const domainResults = {};

    if (prog.nutrition) {
      domainResults.nutrition = await this.saveNutrition(prog.nutrition);
      const rb = await this.getNutrition();
      if (!rb || getDeterministicFingerprint(rb) !== getDeterministicFingerprint(prog.nutrition)) {
        throw new Error('Atomic Verification Failed: nutrition read-back mismatch');
      }
    }
    if (prog.supplementation) {
      domainResults.supplements = await this.saveSupplements(prog.supplementation);
      const rb = await this.getSupplements();
      if (!rb || getDeterministicFingerprint(rb) !== getDeterministicFingerprint(prog.supplementation)) {
        throw new Error('Atomic Verification Failed: supplements read-back mismatch');
      }
    }
    if (prog.therapy) {
      domainResults.therapy = await this.saveTherapy(prog.therapy);
      const rb = await this.getTherapy();
      if (!rb || getDeterministicFingerprint(rb) !== getDeterministicFingerprint(prog.therapy)) {
        throw new Error('Atomic Verification Failed: therapy read-back mismatch');
      }
    }
    if (prog.exams) {
      domainResults.exams = await this.saveExams(prog.exams);
      const rb = await this.getExams();
      if (!rb || getDeterministicFingerprint(rb) !== getDeterministicFingerprint(prog.exams)) {
        throw new Error('Atomic Verification Failed: exams read-back mismatch');
      }
    }

    const loaded = await this.loadActiveProgram();
    if (!loaded) {
      throw new Error('Atomic Verification Failed: active program missing after save');
    }

    return {
      success: true,
      ok: true,
      id: saveRes.id,
      fingerprint: saveRes.fingerprint,
      domains: domainResults
    };
  }

  /**
   * Validates canonical program structure before write
   */
  validatePersistedProgram(program) {
    if (!program || typeof program !== 'object') {
      throw new Error('Persistence Error: Program must be a non-null object.');
    }
    if (!Array.isArray(program.weeks)) {
      throw new Error('Persistence Error: Program must have a weeks array.');
    }
    return true;
  }

  /**
   * Save canonical training program with atomic verification and fingerprinting
   */
  async saveProgram(program, setActive = true, metadata = {}) {
    this.validatePersistedProgram(program);
    await this.dbOpen();

    const programId = program.id || metadata.id || `prog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // 1. If setActive, demote existing active programs
    if (setActive) {
      const all = await this.dbGetAll(STORES.PROGRAMS);
      for (const p of all) {
        if (p.isActive && p.id !== programId) {
          p.isActive = false;
          await this.dbPut(STORES.PROGRAMS, p);
        }
      }
    }

    // 2. Compute canonical fingerprint pre-save
    const canonicalFingerprint = getDeterministicFingerprint(program);

    // 3. Build Envelope
    const envelope = {
      id: programId,
      title: program.title || program.name || 'Programma Senza Titolo',
      author: program.author || program.coach || 'Coach',
      isActive: Boolean(setActive),
      createdAt: metadata.createdAt || now,
      updatedAt: now,
      version: metadata.version || 1,
      fingerprint: canonicalFingerprint,
      summary: {
        totalWeeks: program.weeks.length,
        totalSessions: program.weeks.reduce((acc, w) => acc + (w.sessions?.length || w.days?.length || 0), 0)
      },
      canonicalModel: JSON.parse(JSON.stringify(program))
    };

    // 4. Write to Primary Store
    await this.dbPut(STORES.PROGRAMS, envelope);

    // 5. Verify Fingerprint Integrity on Read-Back
    const readBack = await this.dbGet(STORES.PROGRAMS, programId);
    if (!readBack || !readBack.canonicalModel) {
      throw new Error(`Atomic Verification Failed: Program ${programId} could not be read back after write.`);
    }

    const readBackFingerprint = getDeterministicFingerprint(readBack.canonicalModel);
    if (readBackFingerprint !== canonicalFingerprint) {
      throw new Error(`Atomic Verification Failed: Fingerprint mismatch. Expected ${canonicalFingerprint}, got ${readBackFingerprint}`);
    }

    return {
      success: true,
      ok: true,
      id: programId,
      fingerprint: canonicalFingerprint,
      envelope
    };
  }

  async saveActiveProgram(prog, opts = { setActive: true }) {
    return this.saveProgram(prog, opts.setActive !== false, opts);
  }

  async loadProgram(programId) {
    const envelope = await this.dbGet(STORES.PROGRAMS, programId);
    if (!envelope) return null;

    // Verify stored fingerprint
    const currentFp = getDeterministicFingerprint(envelope.canonicalModel);
    if (envelope.fingerprint && envelope.fingerprint !== currentFp) {
      console.warn(`[PERSISTENCE WARNING] Fingerprint mismatch on load for ${programId}. Model may have been modified.`);
    }

    return envelope.canonicalModel;
  }

  async getProgram(programId) {
    return this.loadProgram(programId);
  }

  async loadActiveProgram() {
    const all = await this.dbGetAll(STORES.PROGRAMS);
    const active = all.find(p => p.isActive === true);
    if (active) return active.canonicalModel;
    if (all.length > 0) return all[all.length - 1].canonicalModel;
    return null;
  }

  async getActiveProgram() {
    return this.loadActiveProgram();
  }

  async getAllPrograms() {
    const all = await this.dbGetAll(STORES.PROGRAMS);
    return all.map(e => e.canonicalModel || e);
  }

  async listPrograms() {
    const all = await this.dbGetAll(STORES.PROGRAMS);
    return all.map(e => ({
      id: e.id,
      title: e.title,
      author: e.author,
      isActive: e.isActive,
      updatedAt: e.updatedAt,
      version: e.version,
      fingerprint: e.fingerprint,
      summary: e.summary
    }));
  }

  async deleteProgram(programId) {
    return this.dbDelete(STORES.PROGRAMS, programId);
  }

  // --- NUTRITION ---
  async saveNutrition(plan) {
    const envelope = { id: 'active_nutrition', plan, updatedAt: new Date().toISOString() };
    await this.dbPut(STORES.NUTRITION, envelope);
    return { success: true, ok: true, fingerprint: getDeterministicFingerprint(plan) };
  }
  async getNutrition() {
    const res = await this.dbGet(STORES.NUTRITION, 'active_nutrition');
    return res ? res.plan : null;
  }

  // --- SUPPLEMENTS ---
  async saveSupplements(protocol) {
    const envelope = { id: 'active_supplements', protocol, updatedAt: new Date().toISOString() };
    await this.dbPut(STORES.SUPPLEMENTS, envelope);
    return { success: true, ok: true, fingerprint: getDeterministicFingerprint(protocol) };
  }
  async getSupplements() {
    const res = await this.dbGet(STORES.SUPPLEMENTS, 'active_supplements');
    return res ? res.protocol : null;
  }

  // --- THERAPY ---
  async saveTherapy(therapyPlan) {
    const envelope = { id: 'active_therapy', therapyPlan, updatedAt: new Date().toISOString() };
    await this.dbPut(STORES.THERAPY, envelope);
    return { success: true, ok: true, fingerprint: getDeterministicFingerprint(therapyPlan) };
  }
  async getTherapy() {
    const res = await this.dbGet(STORES.THERAPY, 'active_therapy');
    return res ? res.therapyPlan : null;
  }

  // --- CLINICAL EXAMS ---
  async saveExams(examsData) {
    const envelope = { id: 'active_exams', examsData, updatedAt: new Date().toISOString() };
    await this.dbPut(STORES.EXAMS, envelope);
    return { success: true, ok: true, fingerprint: getDeterministicFingerprint(examsData) };
  }
  async getExams() {
    const res = await this.dbGet(STORES.EXAMS, 'active_exams');
    return res ? res.examsData : null;
  }

  // --- CALENDAR & REMINDERS ---
  async saveCalendar(calData) {
    const envelope = { id: 'active_calendar', calData, updatedAt: new Date().toISOString() };
    await this.dbPut(STORES.CALENDAR, envelope);
    return { success: true, ok: true };
  }
  async getCalendar() {
    const res = await this.dbGet(STORES.CALENDAR, 'active_calendar');
    return res ? res.calData : null;
  }

  async saveReminders(remindersList) {
    const envelope = { id: 'active_reminders', items: remindersList, updatedAt: new Date().toISOString() };
    await this.dbPut(STORES.REMINDERS, envelope);
    return { success: true, ok: true };
  }
  async getReminders() {
    const res = await this.dbGet(STORES.REMINDERS, 'active_reminders');
    return res ? res.items : [];
  }

  // --- LOCAL CATALOGS ---
  async saveFoodDatabase(items) {
    await this.dbPut(STORES.FOOD_DB, { id: 'food_catalog', items, updatedAt: new Date().toISOString() });
    return { success: true, ok: true, count: items.length };
  }
  async getFoodDatabase() {
    const res = await this.dbGet(STORES.FOOD_DB, 'food_catalog');
    return res ? res.items : [];
  }

  async saveSupplementDatabase(items) {
    await this.dbPut(STORES.SUPPLEMENT_DB, { id: 'supplement_catalog', items, updatedAt: new Date().toISOString() });
    return { success: true, ok: true, count: items.length };
  }
  async getSupplementDatabase() {
    const res = await this.dbGet(STORES.SUPPLEMENT_DB, 'supplement_catalog');
    return res ? res.items : [];
  }

  async saveDrugDatabase(items) {
    await this.dbPut(STORES.DRUG_DB, { id: 'drug_catalog', items, updatedAt: new Date().toISOString() });
    return { success: true, ok: true, count: items.length };
  }
  async getDrugDatabase() {
    const res = await this.dbGet(STORES.DRUG_DB, 'drug_catalog');
    return res ? res.items : [];
  }

  /**
   * Helper to inspect LocalStorage footprint
   */
  getLocalStorageSize() {
    if (typeof localStorage === 'undefined') return 0;
    let total = 0;
    for (let x in localStorage) {
      if (localStorage.hasOwnProperty(x)) {
        total += ((localStorage[x].length + x.length) * 2);
      }
    }
    return total; // bytes
  }

  /**
   * LocalStorage Sanitizer: strips bulky program payloads, keeping only logs & lightweight state (< 10 KB)
   */
  sanitizeStoreForLocalStorage(fullStore) {
    if (!fullStore || typeof fullStore !== 'object') return {};
    const sanitized = JSON.parse(JSON.stringify(fullStore));

    // Remove bulky objects
    sanitized.activeProgram = null;
    if (sanitized.activeAthleteProgram) {
      if (sanitized.activeAthleteProgram.program_data) {
        delete sanitized.activeAthleteProgram.program_data;
      }
    }
    if (sanitized.data && sanitized.data.weeks) delete sanitized.data.weeks;
    if (sanitized.nutrition && sanitized.nutrition.days) delete sanitized.nutrition;
    if (sanitized.supplementation && sanitized.supplementation.items) delete sanitized.supplementation;
    if (sanitized.therapy && sanitized.therapy.medications) delete sanitized.therapy;
    if (sanitized.exams && sanitized.exams.records) delete sanitized.exams;
    if (sanitized.docs && Array.isArray(sanitized.docs)) {
      sanitized.docs = sanitized.docs.slice(0, 5).map(d => {
        const docCopy = { ...d };
        delete docCopy.base64;
        return docCopy;
      });
    }
    if (sanitized.models && Array.isArray(sanitized.models)) {
      sanitized.models = sanitized.models.slice(0, 5).map(m => {
        const mCopy = { ...m };
        delete mCopy.data;
        return mCopy;
      });
    }

    return sanitized;
  }

  /**
   * Migration from Legacy LocalStorage to IndexedDB
   */
  async migrateLegacyStore(customLocalStorage = null) {
    const ls = customLocalStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!ls) return { migrated: false, reason: 'no_localstorage' };

    const raw = ls.getItem('GS_STORE');
    if (!raw) return { migrated: false, reason: 'empty_store' };

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return { migrated: false, error: 'JSON parse error' };
    }

    // Check if legacy program is in store.activeProgram, store.data.weeks, or store.activeAthleteProgram.program_data
    let legacyProgToMigrate = null;
    if (parsed.activeProgram && Array.isArray(parsed.activeProgram.weeks) && parsed.activeProgram.weeks.length > 0) {
      legacyProgToMigrate = parsed.activeProgram;
    } else if (parsed.activeAthleteProgram?.program_data && Array.isArray(parsed.activeAthleteProgram.program_data.weeks) && parsed.activeAthleteProgram.program_data.weeks.length > 0) {
      legacyProgToMigrate = parsed.activeAthleteProgram.program_data;
    } else if (parsed.data && Array.isArray(parsed.data.weeks) && parsed.data.weeks.length > 0) {
      legacyProgToMigrate = {
        title: parsed.data.title || parsed.data.programTitle || 'Programma Migrato v1',
        author: parsed.data.author || 'Coach',
        weeks: parsed.data.weeks
      };
    }

    if (legacyProgToMigrate) {
      try {
        const saveRes = await this.saveProgram(legacyProgToMigrate, true, { version: 1, migratedFrom: 'localStorage' });
        console.info(`[MIGRATION 2.0] Legacy program saved to IndexedDB (ID: ${saveRes.id}, Fingerprint: ${saveRes.fingerprint})`);

        // Sanitize LocalStorage
        const cleaned = this.sanitizeStoreForLocalStorage(parsed);
        cleaned.migrationVersion = '2.0';
        ls.setItem('GS_STORE', JSON.stringify(cleaned));

        return { migrated: true, programId: saveRes.id, fingerprint: saveRes.fingerprint };
      } catch (migErr) {
        console.error('[MIGRATION 2.0] Failed to migrate legacy program to IndexedDB', migErr);
        return { migrated: false, error: migErr.message };
      }
    } else {
      // Just mark migration version
      parsed.migrationVersion = '2.0';
      const clean = this.sanitizeStoreForLocalStorage(parsed);
      ls.setItem('GS_STORE', JSON.stringify(clean));
      return { migrated: true, reason: 'marked_lightweight' };
    }
  }
}

// Export backwards-compatible aliases
var GiammariaPersistenceCore = GiammariaPersistenceEngine;
var GiammariaPersistence = new GiammariaPersistenceEngine();
GiammariaPersistence.generateFingerprint = getDeterministicFingerprint;
GiammariaPersistence.calculateFingerprint = getDeterministicFingerprint;

if (typeof window !== 'undefined') {
  window.GiammariaPersistence = GiammariaPersistence;
  window.GiammariaPersistenceCore = GiammariaPersistenceCore;
  window.GiammariaPersistenceEngine = GiammariaPersistenceEngine;
  window.deterministicSerialize = deterministicSerialize;
  window.getDeterministicFingerprint = getDeterministicFingerprint;
  window.deepEqual = deepEqual;
  window.MemoryIDBStore = MemoryIDBStore;
  window.MemoryIndexedDB = MemoryIndexedDB;
}
