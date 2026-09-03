/**
 * ============================================================
 * GIAMMARIA SYSTEM — HIGH-RELIABILITY PERSISTENCE CORE 2.0
 * Architecture Layer 4: Enterprise-grade IndexedDB + LocalStorage Sync
 * ============================================================
 */

export const DB_NAME = 'GIAMMARIA_SYSTEM_DB';
export const DB_VERSION = 7;

export const STORES = {
  PROGRAMS: 'programs',             // Canonical programs (active + versions)
  NUTRITION: 'nutrition',           // Meal plans, macros, food records
  SUPPLEMENTS: 'supplements',       // Supplementation protocols & logs
  THERAPY: 'therapy',               // Medical therapy schedules & adherence
  EXAMS: 'exams',                   // Clinical lab exams & bloodwork history
  CALENDAR: 'calendar',             // Unified calendar events & reminders
  REMINDERS: 'reminders',           // Notification schedules & alerts
  FOOD_DB: 'food_db',               // Local offline food macro database (CC0/generic)
  FOOD_DB_OFF: 'food_db_off',       // Open Food Facts cache (ODbL — separate store)
  SUPPLEMENT_DB: 'supplement_db',   // Local offline supplement database
  DRUG_DB: 'drug_db',               // Local offline medication database
  HEALTH_SAMPLES: 'health_samples', // Health Connect / wearable samples
  EVIDENCE_CACHE: 'evidence_cache', // PubMed / evidence cache
  WORKOUT_LOGS: 'workout_logs',     // Completed set logs (mirror of GS_STORE.data)
  COACH_PROFILE: 'coach_profile',   // Longitudinal coach preferences / decisions
  CHECK_INS: 'check_ins',           // Weekly AI check-in archives
  DOCUMENT_INTELLIGENCE: 'document_intelligence', // DocumentIR + import sessions
  REWARDS_PROFILE: 'rewards_profile',
  XP_LEDGER: 'xp_ledger',
  ACHIEVEMENTS: 'achievements',
  REWARDS_WALLET: 'rewards_wallet',
  AVATAR_STATE: 'avatar_state',
  ACTION_HISTORY: 'action_history',
  SEASON_STATS: 'season_stats'
};

/**
 * Deterministic JSON Serializer (Key sorting + deterministic whitespace)
 */
export function deterministicSerialize(obj, seen) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  const seenSet = seen || new WeakSet();
  if (seenSet.has(obj)) return '"[Circular]"';
  seenSet.add(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(item => deterministicSerialize(item, seenSet)).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + deterministicSerialize(obj[k], seenSet)).join(',') + '}';
}

/**
 * Deep Equality Comparison
 */
export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  return deterministicSerialize(a) === deterministicSerialize(b);
}

/**
 * Deterministic Fingerprint / Checksum calculation (FNV-1a 64-bit style hash)
 */
export function getDeterministicFingerprint(obj) {
  if (obj === undefined || obj === null) return '0000000000000000';
  let str;
  if (typeof obj === 'string') {
    str = obj;
  } else {
    try {
      str = deterministicSerialize(JSON.parse(JSON.stringify(obj)));
    } catch (_) {
      str = deterministicSerialize(obj);
    }
  }
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
export class MemoryIDBStore {
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

export class MemoryIndexedDB extends MemoryIDBStore {}

/**
 * Master Enterprise Persistence Class
 */
export class GiammariaPersistenceEngine {
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
              } else if (storeName === STORES.XP_LEDGER) {
                s = db.createObjectStore(storeName, { keyPath: 'id' });
                if (s && typeof s.createIndex === 'function') {
                  s.createIndex('sourceId', 'sourceId', { unique: false });
                  s.createIndex('timestamp', 'timestamp', { unique: false });
                  s.createIndex('eventType', 'eventType', { unique: false });
                }
              } else if (storeName === STORES.ACTION_HISTORY) {
                s = db.createObjectStore(storeName, { keyPath: 'id' });
                if (s && typeof s.createIndex === 'function') {
                  s.createIndex('at', 'at', { unique: false });
                  s.createIndex('action_type', 'action_type', { unique: false });
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

  async saveWorkoutLogsSnapshot(snapshot = {}) {
    await this.dbOpen();
    const payload = {
      id: 'active_logs',
      data: snapshot.data || {},
      customSets: snapshot.customSets || {},
      bw: snapshot.bw || {},
      logs: Array.isArray(snapshot.logs) ? snapshot.logs.slice(-80) : [],
      health: snapshot.health || null,
      updatedAt: snapshot.updatedAt || new Date().toISOString()
    };
    await this.dbPut(STORES.WORKOUT_LOGS, payload);
    return payload;
  }

  async loadWorkoutLogsSnapshot() {
    await this.dbOpen();
    try {
      return await this.dbGet(STORES.WORKOUT_LOGS, 'active_logs');
    } catch (_) {
      return null;
    }
  }

  async clearWorkoutLogs() {
    await this.dbOpen();
    try {
      await this.dbDelete(STORES.WORKOUT_LOGS, 'active_logs');
    } catch (_) {}
    return {
      success: true,
      ok: true,
      note: 'Workout logs cleared from IDB workout_logs; callers must clear store.data/customSets in memory.'
    };
  }

  /** NURVAN Rewards — dual-write profile + truncated ledger (never therapy/exams). */
  async saveRewardsSnapshot(rewards = {}) {
    await this.dbOpen();
    const clean = JSON.parse(JSON.stringify(rewards || {}));
    delete clean.therapy;
    delete clean.exams;
    delete clean.healthSamples;
    const ledger = Array.isArray(clean.ledger) ? clean.ledger.slice(-200) : [];
    const profile = Object.assign({}, clean, { ledger: undefined });
    delete profile.ledger;
    await this.dbPut(STORES.REWARDS_PROFILE, Object.assign({ id: 'active' }, profile, { updatedAt: new Date().toISOString() }));
    await this.dbPut(STORES.AVATAR_STATE, Object.assign({ id: 'active' }, clean.avatar || {}, { updatedAt: new Date().toISOString() }));
    await this.dbPut(STORES.ACHIEVEMENTS, { id: 'active', items: clean.achievements || [], updatedAt: new Date().toISOString() });
    await this.dbPut(STORES.REWARDS_WALLET, { id: 'active', items: clean.wallet || [], updatedAt: new Date().toISOString() });
    // Append latest ledger events (idempotent put by id)
    for (const ev of ledger.slice(-40)) {
      if (!ev || !ev.id) continue;
      await this.dbPut(STORES.XP_LEDGER, ev);
    }
    return { ok: true };
  }

  async loadRewardsSnapshot() {
    await this.dbOpen();
    try {
      return await this.dbGet(STORES.REWARDS_PROFILE, 'active');
    } catch (_) {
      return null;
    }
  }

  async saveActionHistorySnapshot(entries = []) {
    await this.dbOpen();
    const list = Array.isArray(entries) ? entries.slice(-80) : [];
    for (const e of list) {
      if (!e || !e.id) continue;
      await this.dbPut(STORES.ACTION_HISTORY, e);
    }
    return { ok: true, count: list.length };
  }

  async saveCheckIn(entry) {
    await this.dbOpen();
    const payload = {
      id: entry.id || entry.weekKey || `checkin_${Date.now()}`,
      weekKey: entry.weekKey || entry.id,
      createdAt: entry.createdAt || new Date().toISOString(),
      reply: entry.reply || '',
      sections: entry.sections || {},
      proposed_action: entry.proposed_action || null,
      status: entry.status || 'completed'
    };
    await this.dbPut(STORES.CHECK_INS, payload);
    return payload;
  }

  async listCheckIns(limit = 12) {
    await this.dbOpen();
    try {
      const all = await this.dbGetAll(STORES.CHECK_INS);
      return (all || [])
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        .slice(0, limit);
    } catch (_) {
      return [];
    }
  }

  async getLatestCheckIn() {
    const list = await this.listCheckIns(1);
    return list[0] || null;
  }

  /**
   * Save Document Intelligence IR / import session (resume after crash).
   */
  async saveDocumentIntelligence(record) {
    if (!record || typeof record !== 'object') throw new Error('DocumentIntelligence record required');
    await this.dbOpen();
    const id = record.id || (`di_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    const envelope = {
      ...record,
      id,
      updatedAt: new Date().toISOString(),
      createdAt: record.createdAt || new Date().toISOString()
    };
    await this.dbPut(STORES.DOCUMENT_INTELLIGENCE, envelope);
    return { ok: true, id, fingerprint: getDeterministicFingerprint(envelope) };
  }

  async getDocumentIntelligence(id) {
    await this.dbOpen();
    return this.dbGet(STORES.DOCUMENT_INTELLIGENCE, id);
  }

  async listDocumentIntelligence(limit = 20) {
    await this.dbOpen();
    try {
      const all = await this.dbGetAll(STORES.DOCUMENT_INTELLIGENCE);
      return (all || [])
        .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
        .slice(0, limit);
    } catch (_) {
      return [];
    }
  }

  async deleteDocumentIntelligence(id) {
    await this.dbOpen();
    if (this._memStore) return this._memStore.delete(STORES.DOCUMENT_INTELLIGENCE, id);
    return new Promise((resolve, reject) => {
      try {
        const tx = this._db.transaction(STORES.DOCUMENT_INTELLIGENCE, 'readwrite');
        tx.objectStore(STORES.DOCUMENT_INTELLIGENCE).delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
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
    const normalized = (items || []).map(function (it) {
      if (!it || typeof it !== 'object') return it;
      const kcalPer100 = it.kcalPer100 != null ? it.kcalPer100 : it.kcal;
      const proPer100 = it.proPer100 != null ? it.proPer100 : it.pro;
      const carbPer100 = it.carbPer100 != null ? it.carbPer100 : it.carb;
      const fatPer100 = it.fatPer100 != null ? it.fatPer100 : it.fat;
      return Object.assign({}, it, { kcalPer100, proPer100, carbPer100, fatPer100, kcal: kcalPer100, pro: proPer100, carb: carbPer100, fat: fatPer100 });
    });
    await this.dbPut(STORES.FOOD_DB, { id: 'food_catalog', items: normalized, updatedAt: new Date().toISOString(), schema: 2 });
    return { success: true, ok: true, count: normalized.length };
  }
  async getFoodDatabase() {
    const res = await this.dbGet(STORES.FOOD_DB, 'food_catalog');
    const items = res ? res.items : [];
    return (items || []).map(function (it) {
      if (!it || typeof it !== 'object') return it;
      if (it.kcalPer100 != null) return it;
      return Object.assign({}, it, {
        kcalPer100: it.kcal, proPer100: it.pro, carbPer100: it.carb, fatPer100: it.fat
      });
    });
  }

  async saveOffFoodCache(items) {
    await this.dbPut(STORES.FOOD_DB_OFF, {
      id: 'off_cache',
      items: items || [],
      license: 'ODbL',
      attribution: 'Open Food Facts contributors — https://openfoodfacts.org',
      updatedAt: new Date().toISOString()
    });
    return { success: true, ok: true };
  }
  async getOffFoodCache() {
    const res = await this.dbGet(STORES.FOOD_DB_OFF, 'off_cache');
    return res || { items: [], license: 'ODbL', attribution: 'Open Food Facts' };
  }

  async saveHealthSamples(payload) {
    await this.dbPut(STORES.HEALTH_SAMPLES, Object.assign({ id: 'latest' }, payload || {}, { updatedAt: new Date().toISOString() }));
    return { success: true, ok: true };
  }
  async getHealthSamples() {
    return (await this.dbGet(STORES.HEALTH_SAMPLES, 'latest')) || null;
  }

  async saveEvidenceCache(pmid, data) {
    await this.dbPut(STORES.EVIDENCE_CACHE, Object.assign({ id: String(pmid) }, data || {}, { fetchedAt: new Date().toISOString() }));
    return { success: true, ok: true };
  }
  async getEvidenceCache(pmid) {
    return this.dbGet(STORES.EVIDENCE_CACHE, String(pmid));
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
    // Privacy: never keep medical payloads in LS cache; strip from rewards mirror too
    if (sanitized.rewards) {
      const r = sanitized.rewards;
      delete r.therapy;
      delete r.exams;
      delete r.healthSamples;
      if (Array.isArray(r.ledger) && r.ledger.length > 80) r.ledger = r.ledger.slice(-80);
      if (Array.isArray(r.pendingSync) && r.pendingSync.length > 40) r.pendingSync = r.pendingSync.slice(-40);
    }
    if (Array.isArray(sanitized.bodyChecks)) {
      sanitized.bodyChecks = sanitized.bodyChecks.slice(-16).map((c) => ({
        id: c && c.id,
        at: c && c.at,
        weight: c && c.weight,
        period: c && c.period,
        notes: c && c.notes ? String(c.notes).slice(0, 240) : '',
        hasFront: !!(c && c.hasFront),
        hasBack: !!(c && c.hasBack),
        analysis: c && c.analysis ? String(c.analysis).slice(0, 800) : ''
      }));
    }
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
export const GiammariaPersistenceCore = GiammariaPersistenceEngine;
export const GiammariaPersistence = new GiammariaPersistenceEngine();
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
