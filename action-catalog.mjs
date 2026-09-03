/**
 * Canonical Action Catalog — AI Operating System foundation.
 * AI / MANUAL / IMPORT / AUTOMATION all emit the same action_type envelope,
 * mapped to legacy applyOperationsToProgram op types.
 */

export const ACTION_SOURCES = Object.freeze(['MANUAL', 'AI', 'IMPORT', 'AUTOMATION', 'SYSTEM']);
export const ACTION_SCOPES = Object.freeze(['SESSION_ADJUSTMENT', 'PROGRAM_ADJUSTMENT']);
export const AI_CONTROL_MODES = Object.freeze(['manual', 'suggest', 'confirm', 'auto']);

export const AI_CONTROL_DEFAULTS = Object.freeze({
  programming: 'confirm',
  liveCoach: 'confirm',
  autoregulation: 'suggest',
  progression: 'confirm',
  analytics: 'suggest',
  import: 'confirm'
});

/** @type {Array<{action_type:string, op_type:string, entity_type:string, destructive?:boolean, domain?:string}>} */
export const ACTION_DEFS = [
  { action_type: 'CREATE_WEEK', op_type: 'add_week', entity_type: 'week', domain: 'programming' },
  { action_type: 'UPDATE_WEEK', op_type: 'modify_week', entity_type: 'week', domain: 'programming' },
  { action_type: 'DELETE_WEEK', op_type: 'remove_week', entity_type: 'week', destructive: true, domain: 'programming' },
  { action_type: 'EXTEND_WEEKS', op_type: 'extend_weeks', entity_type: 'program', domain: 'programming' },
  { action_type: 'SET_PROGRAM_DURATION', op_type: 'set_program_duration', entity_type: 'program', domain: 'programming' },

  { action_type: 'CREATE_SESSION', op_type: 'add_session', entity_type: 'session', domain: 'programming' },
  { action_type: 'UPDATE_SESSION', op_type: 'modify_session', entity_type: 'session', domain: 'programming' },
  { action_type: 'DELETE_SESSION', op_type: 'remove_session', entity_type: 'session', destructive: true, domain: 'programming' },

  { action_type: 'ADD_EXERCISE', op_type: 'add_exercise', entity_type: 'exercise', domain: 'programming' },
  { action_type: 'REMOVE_EXERCISE', op_type: 'remove_exercise', entity_type: 'exercise', destructive: true, domain: 'programming' },
  { action_type: 'REPLACE_EXERCISE', op_type: 'replace_exercise', entity_type: 'exercise', domain: 'programming' },
  { action_type: 'CREATE_SUPERSET', op_type: 'create_superset', entity_type: 'exercise', domain: 'programming' },
  { action_type: 'REMOVE_SUPERSET', op_type: 'remove_superset', entity_type: 'exercise', domain: 'programming' },

  { action_type: 'ADD_SET', op_type: 'add_set', entity_type: 'set', domain: 'programming' },
  { action_type: 'REMOVE_SET', op_type: 'remove_set', entity_type: 'set', destructive: true, domain: 'programming' },
  { action_type: 'UPDATE_SET', op_type: 'modify_set', entity_type: 'set', domain: 'programming' },
  { action_type: 'UPDATE_SET_LOAD', op_type: 'modify_load', entity_type: 'set', domain: 'programming' },
  { action_type: 'UPDATE_SET_REPS', op_type: 'modify_reps', entity_type: 'set', domain: 'programming' },
  { action_type: 'UPDATE_SET_RIR', op_type: 'modify_rir', entity_type: 'set', domain: 'programming' },
  { action_type: 'UPDATE_SET_RPE', op_type: 'modify_rpe', entity_type: 'set', domain: 'programming' },
  { action_type: 'UPDATE_SET_REST', op_type: 'modify_rest', entity_type: 'set', domain: 'programming' },
  { action_type: 'UPDATE_SET_TEMPO', op_type: 'modify_tempo', entity_type: 'set', domain: 'programming' },
  { action_type: 'UPDATE_EXERCISE', op_type: 'modify_exercise', entity_type: 'exercise', domain: 'programming' },

  { action_type: 'SET_PREF', op_type: 'set_pref', entity_type: 'prefs', domain: 'programming' },
  { action_type: 'SET_PROFILE', op_type: 'set_profile', entity_type: 'profile', domain: 'programming' },
  { action_type: 'SET_NUTRITION', op_type: 'set_nutrition', entity_type: 'nutrition', domain: 'nutrition' },
  { action_type: 'SET_SUPPLEMENTATION', op_type: 'set_supplementation', entity_type: 'supplementation', domain: 'nutrition' },
  { action_type: 'NAVIGATE', op_type: 'navigate', entity_type: 'ui', domain: 'programming' },

  // Session logging (not program structure) — handled by ActionDispatcher, not applyOperationsToProgram
  { action_type: 'LOG_SET', op_type: 'log_set', entity_type: 'log', domain: 'liveCoach' },
  { action_type: 'UPDATE_LOG_FIELD', op_type: 'update_log_field', entity_type: 'log', domain: 'liveCoach' },
  { action_type: 'UNDO_LAST', op_type: 'undo_last', entity_type: 'history', domain: 'programming' },

  // Rewards / Adaptive (Wave 1–2) — AWARD_XP is SYSTEM/server only
  { action_type: 'SET_REWARDS_MODE', op_type: 'set_rewards_mode', entity_type: 'rewards', domain: 'programming' },
  { action_type: 'AWARD_XP', op_type: 'award_xp', entity_type: 'rewards', domain: 'analytics' },
  { action_type: 'UNLOCK_ACHIEVEMENT', op_type: 'unlock_achievement', entity_type: 'rewards', domain: 'analytics' },
  { action_type: 'UNLOCK_COSMETIC', op_type: 'unlock_cosmetic', entity_type: 'rewards', domain: 'analytics' },
  { action_type: 'APPLY_DELOAD', op_type: 'apply_deload', entity_type: 'program', domain: 'autoregulation' },
  { action_type: 'PROPOSE_PROGRESSION', op_type: 'propose_progression', entity_type: 'set', domain: 'progression' }
];

const BY_ACTION = Object.create(null);
const BY_OP = Object.create(null);
for (const def of ACTION_DEFS) {
  BY_ACTION[def.action_type] = def;
  BY_OP[def.op_type] = def;
  BY_OP[String(def.op_type).toLowerCase()] = def;
}

export function getActionDef(actionTypeOrOp) {
  const key = String(actionTypeOrOp || '');
  return BY_ACTION[key] || BY_OP[key] || BY_OP[key.toLowerCase()] || null;
}

export function defaultAiControlPrefs() {
  return JSON.parse(JSON.stringify(AI_CONTROL_DEFAULTS));
}

export function ensureAiControlPrefs(prefs) {
  if (!prefs || typeof prefs !== 'object') return defaultAiControlPrefs();
  const out = defaultAiControlPrefs();
  Object.keys(out).forEach((mod) => {
    const m = prefs[mod];
    if (typeof m === 'string' && AI_CONTROL_MODES.includes(m)) out[mod] = m;
    else if (m && typeof m === 'object' && typeof m.mode === 'string' && AI_CONTROL_MODES.includes(m.mode)) out[mod] = m.mode;
  });
  return out;
}

/** Op types the LLM may emit (intersection of catalog program ops). */
export function promptAllowedOpTypes() {
  return ACTION_DEFS
    .filter((d) => d.op_type !== 'log_set' && d.op_type !== 'update_log_field' && d.op_type !== 'undo_last')
    .map((d) => d.op_type);
}

export function promptAllowedOpTypesCsv() {
  return promptAllowedOpTypes().join(', ');
}

/**
 * Normalize any raw AI/manual payload into a canonical action envelope.
 */
export function canonicalizeAction(raw, meta = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const opType = raw.type || raw.op_type || null;
  const actionTypeIn = raw.action_type || raw.actionType || null;
  const def = getActionDef(actionTypeIn) || getActionDef(opType);
  if (!def) return null;

  const source = ACTION_SOURCES.includes(meta.source)
    ? meta.source
    : (ACTION_SOURCES.includes(raw.source) ? raw.source : 'SYSTEM');
  const scope = ACTION_SCOPES.includes(meta.scope)
    ? meta.scope
    : (ACTION_SCOPES.includes(raw.scope) ? raw.scope : 'PROGRAM_ADJUSTMENT');

  const changes = raw.changes && typeof raw.changes === 'object' ? { ...raw.changes } : {};
  // Lift top-level fields often used by legacy ops into changes when missing
  ['load', 'reps', 'rir', 'rpe', 'rest', 'rest_seconds', 'tempo', 'name', 'sets', 'view', 'key', 'value', 'field', 'duration'].forEach((k) => {
    if (raw[k] !== undefined && changes[k] === undefined) changes[k] = raw[k];
  });

  return {
    id: raw.id || ('act_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    action_type: def.action_type,
    op_type: def.op_type,
    entity_type: def.entity_type,
    entity_id: raw.entity_id || raw.entityId || null,
    week: raw.week != null ? raw.week : null,
    session: raw.session != null ? raw.session : null,
    exercise: raw.exercise != null ? raw.exercise : (raw.target_exercise || null),
    exercise_id: raw.exercise_id || null,
    target_exercise: raw.target_exercise || null,
    set_index: raw.set_index != null ? raw.set_index : null,
    changes,
    previous_values: raw.previous_values && typeof raw.previous_values === 'object' ? { ...raw.previous_values } : {},
    source,
    reason: raw.reason || meta.reason || '',
    confidence: typeof raw.confidence === 'number' ? raw.confidence : (typeof meta.confidence === 'number' ? meta.confidence : null),
    scope,
    reversible: raw.reversible !== false && !def.destructive,
    requires_confirm: raw.requires_confirm != null ? Boolean(raw.requires_confirm) : (def.destructive || source === 'AI'),
    domain: def.domain || 'programming',
    timestamp: raw.timestamp || new Date().toISOString(),
    destructive: Boolean(def.destructive)
  };
}

export function actionToOperation(action) {
  const a = canonicalizeAction(action);
  if (!a) return null;
  if (a.op_type === 'log_set' || a.op_type === 'update_log_field' || a.op_type === 'undo_last') {
    return null; // not program ops
  }
  const op = {
    type: a.op_type,
    week: a.week,
    session: a.session,
    exercise: a.exercise,
    exercise_id: a.exercise_id,
    target_exercise: a.target_exercise,
    set_index: a.set_index,
    changes: { ...a.changes }
  };
  Object.keys(op).forEach((k) => {
    if (op[k] === null || op[k] === undefined) delete op[k];
  });
  return op;
}

export function operationsToActions(operations, meta = {}) {
  if (!Array.isArray(operations)) return [];
  return operations.map((op) => canonicalizeAction(op, meta)).filter(Boolean);
}

export function actionsToOperations(actions) {
  if (!Array.isArray(actions)) return [];
  return actions.map(actionToOperation).filter(Boolean);
}

/**
 * Build reverse operation from previous_values when possible.
 */
export function reverseAction(action) {
  const a = canonicalizeAction(action);
  if (!a || !a.reversible) return null;
  const prev = a.previous_values || {};
  if (!Object.keys(prev).length) return null;

  if (a.op_type === 'log_set' || a.op_type === 'update_log_field') {
    return canonicalizeAction({
      action_type: a.action_type,
      entity_id: a.entity_id,
      changes: { ...prev },
      previous_values: { ...a.changes },
      week: a.week,
      session: a.session,
      set_index: a.set_index
    }, { source: 'SYSTEM', scope: a.scope, reason: 'undo' });
  }

  const revChanges = { ...prev };
  return canonicalizeAction({
    type: a.op_type,
    week: a.week,
    session: a.session,
    exercise: a.exercise,
    exercise_id: a.exercise_id,
    target_exercise: a.target_exercise,
    set_index: a.set_index,
    changes: revChanges,
    previous_values: { ...a.changes }
  }, { source: 'SYSTEM', scope: a.scope, reason: 'undo' });
}

export function isLogAction(action) {
  const a = canonicalizeAction(action);
  return a && (a.op_type === 'log_set' || a.op_type === 'update_log_field');
}

export function isRewardsAction(action) {
  const a = canonicalizeAction(action);
  return a && (a.entity_type === 'rewards' || a.op_type === 'set_rewards_mode' || a.op_type === 'award_xp' || a.op_type === 'unlock_achievement' || a.op_type === 'unlock_cosmetic');
}

export function isProgramAction(action) {
  const a = canonicalizeAction(action);
  return a && !isLogAction(a) && !isRewardsAction(a) && a.op_type !== 'undo_last' && a.op_type !== 'navigate' && a.op_type !== 'apply_deload' && a.op_type !== 'propose_progression';
}

/**
 * Create ActionDispatcher factory. Inject applyProgramOps and store accessors.
 */
export function createActionDispatcher(deps = {}) {
  const applyProgramOps = deps.applyProgramOps;
  const getStore = deps.getStore || (() => (typeof store !== 'undefined' ? store : null));
  const getData = deps.getData || (() => (typeof DATA !== 'undefined' ? DATA : null));
  const setData = deps.setData || ((p) => { if (typeof DATA !== 'undefined') DATA = p; });
  const persistFn = deps.persist || (() => {});
  const normalizeProgramFn = deps.normalizeProgram || ((p) => p);
  const maxHistory = deps.maxHistory || 80;

  function pushHistory(entry) {
    const s = getStore();
    if (!s) return;
    if (!Array.isArray(s.actionHistory)) s.actionHistory = [];
    s.actionHistory.push(entry);
    if (s.actionHistory.length > maxHistory) s.actionHistory.splice(0, s.actionHistory.length - maxHistory);
  }

  function applyLogAction(action) {
    const s = getStore();
    if (!s) throw new Error('Store non disponibile per LOG_SET');
    if (!s.data) s.data = {};
    const a = canonicalizeAction(action);
    const keyBase = a.entity_id || a.changes.keyBase;
    if (!keyBase) throw new Error('LOG_SET richiede entity_id (es. w1_d0_e0_s1)');
    const prev = {};
    const ch = a.changes || {};
    ['load', 'reps', 'rir', 'rpe', 'done'].forEach((field) => {
      if (ch[field] === undefined) return;
      const k = keyBase + '_' + field;
      prev[field] = s.data[k];
      s.data[k] = ch[field];
    });
    a.previous_values = { ...prev };
    return { ok: true, action: a };
  }

  async function dispatch(rawActions, opts = {}) {
    const list = (Array.isArray(rawActions) ? rawActions : [rawActions])
      .map((r) => canonicalizeAction(r, {
        source: opts.source || 'SYSTEM',
        scope: opts.scope,
        reason: opts.reason,
        confidence: opts.confidence
      }))
      .filter(Boolean);

    if (!list.length) return { ok: true, appliedCount: 0, actions: [], program: getData() };

    const s = getStore();
    const aiControl = ensureAiControlPrefs(s && s.prefs && s.prefs.aiControl);

    for (const a of list) {
      if (a.source === 'AI' && a.domain && aiControl[a.domain] === 'manual') {
        throw new Error('Modulo AI "' + a.domain + '" impostato su solo manuale.');
      }
      if (a.destructive && opts.skipConfirm !== true && a.requires_confirm && opts.confirmed !== true) {
        return { ok: false, needsConfirm: true, actions: list, message: 'Azione distruttiva: conferma richiesta.' };
      }
    }

    let program = getData();
    let appliedCount = 0;
    const applied = [];

    const programActions = list.filter(isProgramAction);
    const logActions = list.filter(isLogAction);

    if (programActions.length) {
      const ops = actionsToOperations(programActions);
      if (!applyProgramOps) throw new Error('applyProgramOps non configurato');
      const result = applyProgramOps(program, ops);
      program = normalizeProgramFn(result.program || program);
      setData(program);
      if (s) s.activeProgram = program;
      appliedCount += result.appliedCount || ops.length;
      programActions.forEach((a) => applied.push(a));
    }

    for (const a of logActions) {
      const r = applyLogAction(a);
      applied.push(r.action);
      appliedCount++;
    }

    const rewardsActions = list.filter(isRewardsAction);
    for (const a of rewardsActions) {
      if (a.op_type === 'award_xp' && a.source !== 'SYSTEM') {
        throw new Error('AWARD_XP consentito solo da SYSTEM/server');
      }
      if (a.op_type === 'set_rewards_mode' && typeof deps.applyRewardsMode === 'function') {
        deps.applyRewardsMode(a.changes && a.changes.mode);
      }
      applied.push(a);
      appliedCount++;
    }

    const historyEntry = {
      id: 'hist_' + Date.now(),
      timestamp: new Date().toISOString(),
      source: opts.source || (list[0] && list[0].source) || 'SYSTEM',
      reason: opts.reason || '',
      actions: applied,
      appliedCount
    };
    pushHistory(historyEntry);
    try { persistFn(); } catch (_) {}

    return { ok: true, appliedCount, actions: applied, program, historyEntry };
  }

  function undoLast() {
    const s = getStore();
    if (!s || !Array.isArray(s.actionHistory) || !s.actionHistory.length) {
      return { ok: false, message: 'Nessuna azione da annullare.' };
    }
    const last = s.actionHistory.pop();
    const reverses = (last.actions || []).map(reverseAction).filter(Boolean).reverse();
    if (!reverses.length) {
      try { persistFn(); } catch (_) {}
      return { ok: false, message: 'Ultima azione non reversibile.' };
    }
    // Apply reverses without nesting another undoable history push as SYSTEM silent
    return dispatch(reverses, { source: 'SYSTEM', reason: 'undo:' + (last.id || ''), skipConfirm: true, confirmed: true })
      .then((r) => {
        // Remove the undo's own history entry to avoid undo loops doubling
        if (s.actionHistory && s.actionHistory.length) s.actionHistory.pop();
        try { persistFn(); } catch (_) {}
        return { ok: true, undone: last, result: r };
      });
  }

  return { dispatch, undoLast, canonicalizeAction, actionsToOperations, operationsToActions };
}

export default {
  ACTION_SOURCES,
  ACTION_SCOPES,
  AI_CONTROL_DEFAULTS,
  ACTION_DEFS,
  getActionDef,
  defaultAiControlPrefs,
  ensureAiControlPrefs,
  promptAllowedOpTypes,
  promptAllowedOpTypesCsv,
  canonicalizeAction,
  actionToOperation,
  operationsToActions,
  actionsToOperations,
  reverseAction,
  isLogAction,
  isProgramAction,
  createActionDispatcher
};
