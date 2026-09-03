/**
 * NURVAN Rewards Engine — XP ledger, levels, tiers, streaks, achievements.
 * Competitive XP is NEVER purchasable. Gold is cosmetic-only.
 * Therapy / exams / medical data must never enter this module.
 */

export const REWARDS_TIERS = Object.freeze([
  { id: 'bronze', label: 'Bronze', minScore: 0 },
  { id: 'silver', label: 'Silver', minScore: 120 },
  { id: 'gold', label: 'Gold', minScore: 280 },
  { id: 'platinum', label: 'Platinum', minScore: 500 },
  { id: 'diamond', label: 'Diamond', minScore: 800 },
  { id: 'elite', label: 'Elite', minScore: 1200 },
  { id: 'legend', label: 'Legend', minScore: 1800 }
]);

export const ACHIEVEMENT_DEFS = Object.freeze([
  { id: 'first_workout', name: 'First Workout', desc: 'Completa il primo allenamento', rarity: 'common', category: 'milestones', check: (p) => (p.workoutCount || 0) >= 1 },
  { id: 'workouts_10', name: '10 Workouts', desc: 'Completa 10 allenamenti', rarity: 'common', category: 'milestones', check: (p) => (p.workoutCount || 0) >= 10 },
  { id: 'workouts_50', name: '50 Workouts', desc: 'Completa 50 allenamenti', rarity: 'rare', category: 'milestones', check: (p) => (p.workoutCount || 0) >= 50 },
  { id: 'workouts_100', name: '100 Workouts', desc: 'Completa 100 allenamenti', rarity: 'epic', category: 'milestones', check: (p) => (p.workoutCount || 0) >= 100 },
  { id: 'streak_7', name: '7-Day Consistency', desc: '7 giorni di aderenza al piano', rarity: 'common', category: 'consistency', check: (p) => (p.streakDays || 0) >= 7 },
  { id: 'streak_30', name: '30-Day Consistency', desc: '30 giorni di aderenza', rarity: 'rare', category: 'consistency', check: (p) => (p.streakDays || 0) >= 30 },
  { id: 'streak_90', name: '90-Day Consistency', desc: '90 giorni di aderenza', rarity: 'epic', category: 'consistency', check: (p) => (p.streakDays || 0) >= 90 },
  { id: 'first_pr', name: 'First PR', desc: 'Registra il primo personal record', rarity: 'common', category: 'performance', check: (p) => (p.prCount || 0) >= 1 },
  { id: 'pr_10', name: 'PR Machine', desc: '10 personal record', rarity: 'rare', category: 'performance', check: (p) => (p.prCount || 0) >= 10 },
  { id: 'iron', name: 'Iron', desc: 'Raggiungi livello 10', rarity: 'common', category: 'milestones', check: (p) => (p.level || 1) >= 10 },
  { id: 'unbreakable', name: 'Unbreakable', desc: 'Raggiungi livello 25', rarity: 'epic', category: 'milestones', check: (p) => (p.level || 1) >= 25 },
  { id: 'early_adopter', name: 'Early Adopter', desc: 'Attiva NURVAN Rewards', rarity: 'rare', category: 'special', check: (p) => p.mode === 'rewards' && !!p.joinedAt }
]);

export const AVATAR_COSMETICS = Object.freeze([
  { id: 'frame_standard', type: 'frame', label: 'Standard', unlock: 'default' },
  { id: 'frame_gold', type: 'frame', label: 'Gold Frame', unlock: 'gold_sub' },
  { id: 'frame_elite', type: 'frame', label: 'Elite Frame', unlock: 'tier_elite' },
  { id: 'outfit_charcoal', type: 'outfit', label: 'Charcoal', unlock: 'default' },
  { id: 'outfit_silver', type: 'outfit', label: 'Silver', unlock: 'level_10' },
  { id: 'outfit_legend', type: 'outfit', label: 'Legend', unlock: 'tier_legend' }
]);

export const SOCIAL_CARD_TEMPLATES = Object.freeze([
  { id: 'minimal', label: 'Minimal Performance', premium: false },
  { id: 'photo', label: 'Athlete Photo', premium: false },
  { id: 'elite', label: 'Elite Premium', premium: true }
]);

export function defaultRewardsState() {
  return {
    mode: null, // null = onboarding pending; 'focus' | 'rewards'
    onboardingDone: false,
    joinedAt: null,
    xp: 0,
    level: 1,
    tier: 'bronze',
    consistencyScore: 0,
    streakDays: 0,
    streakWeeks: 0,
    lastWorkoutDayKey: null,
    workoutCount: 0,
    prCount: 0,
    topPercent: null,
    ledger: [],
    achievements: [],
    wallet: [],
    avatar: { frame: 'frame_standard', outfit: 'outfit_charcoal', unlocked: ['frame_standard', 'outfit_charcoal'] },
    prefs: {
      notifications: false,
      rankingNotifications: false,
      achievementNotifications: true,
      socialSuggestions: true
    },
    shareDefaults: {
      tonnage: true,
      duration: true,
      prs: true,
      level: true,
      tier: true,
      topPercent: true,
      calories: false,
      bodyWeight: false
    },
    pendingSync: [],
    season: { id: 'lifetime', xp: 0, rank: null }
  };
}

/** Non-linear XP to reach next level from current level. */
export function xpForLevel(level) {
  const L = Math.max(1, Math.min(200, Number(level) || 1));
  return Math.round(100 + L * 45 + Math.pow(L, 1.35) * 8);
}

export function levelFromTotalXp(totalXp) {
  let xp = Math.max(0, Number(totalXp) || 0);
  let level = 1;
  while (level < 200) {
    const need = xpForLevel(level);
    if (xp < need) break;
    xp -= need;
    level++;
  }
  return { level, xpIntoLevel: xp, xpToNext: xpForLevel(level) - xp, need: xpForLevel(level) };
}

export function tierFromScore(score) {
  let t = REWARDS_TIERS[0];
  for (const row of REWARDS_TIERS) {
    if (score >= row.minScore) t = row;
  }
  return t;
}

export function dayKeyFromDate(d) {
  const x = d instanceof Date ? d : new Date(d || Date.now());
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}

function clampWorkoutSnap(snap) {
  const tonnage = Math.min(500000, Math.max(0, Number(snap.tonnage) || 0));
  const sets = Math.min(80, Math.max(0, Number(snap.sets) || 0));
  const durationSec = Math.min(14400, Math.max(0, Number(snap.durationSec) || 0));
  const intensity = Math.min(200000, Math.max(0, Number(snap.intensity) || 0));
  const kcal = Math.min(5000, Math.max(0, Number(snap.kcal) || 0));
  return { tonnage, sets, durationSec, intensity, kcal };
}

/**
 * Validate and compute XP for a workout completion event.
 * Returns null if rejected (duplicate / rate / invalid / focus mode).
 */
export function validateWorkoutXp(state, logEntry) {
  const s = state || defaultRewardsState();
  if (s.mode !== 'rewards') {
    return { ok: false, reason: 'focus_mode', xp: 0 };
  }
  const sourceId = String(logEntry && logEntry.id || '');
  if (!sourceId) return { ok: false, reason: 'missing_source', xp: 0 };
  if ((s.ledger || []).some((e) => e.sourceId === sourceId && e.eventType === 'WORKOUT_COMPLETED')) {
    return { ok: false, reason: 'duplicate', xp: 0 };
  }
  const today = dayKeyFromDate(logEntry.at || Date.now());
  const todayCount = (s.ledger || []).filter((e) => e.eventType === 'WORKOUT_COMPLETED' && dayKeyFromDate(e.timestamp) === today).length;
  if (todayCount >= 4) return { ok: false, reason: 'rate_limit', xp: 0 };

  const c = clampWorkoutSnap(logEntry);
  if (c.sets < 1 && c.tonnage < 1) return { ok: false, reason: 'empty_session', xp: 0 };
  if (c.tonnage > 0 && c.sets > 0) {
    const avgLoad = c.tonnage / Math.max(1, c.sets * 8);
    if (avgLoad > 600) return { ok: false, reason: 'anomalous_load', xp: 0 };
  }

  let xp = 40;
  xp += Math.min(80, Math.floor(c.sets * 2.5));
  xp += Math.min(60, Math.floor(c.tonnage / 500));
  xp += Math.min(40, Math.floor(c.durationSec / 120));
  if (logEntry.prCount > 0) xp += Math.min(50, logEntry.prCount * 25);

  return {
    ok: true,
    xp: Math.round(xp),
    event: {
      id: 'xp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      eventType: 'WORKOUT_COMPLETED',
      sourceId,
      xpAmount: Math.round(xp),
      timestamp: logEntry.at || new Date().toISOString(),
      metadata: {
        tonnage: c.tonnage,
        sets: c.sets,
        durationSec: c.durationSec,
        intensity: c.intensity,
        week: logEntry.week,
        day: logEntry.day
      },
      validationStatus: 'validated'
    }
  };
}

export function applyXpEvent(state, event) {
  const next = JSON.parse(JSON.stringify(state || defaultRewardsState()));
  if (!event || !event.xpAmount) return next;
  if ((next.ledger || []).some((e) => e.id === event.id || (e.sourceId === event.sourceId && e.eventType === event.eventType))) {
    return next;
  }
  next.ledger = next.ledger || [];
  next.ledger.push(event);
  if (next.ledger.length > 500) next.ledger = next.ledger.slice(-500);
  next.xp = (next.xp || 0) + event.xpAmount;
  const lv = levelFromTotalXp(next.xp);
  next.level = lv.level;
  if (event.eventType === 'WORKOUT_COMPLETED') {
    next.workoutCount = (next.workoutCount || 0) + 1;
    const dk = dayKeyFromDate(event.timestamp);
    if (next.lastWorkoutDayKey !== dk) {
      const prev = next.lastWorkoutDayKey ? new Date(next.lastWorkoutDayKey + 'T12:00:00') : null;
      const cur = new Date(dk + 'T12:00:00');
      if (prev) {
        const diffDays = Math.round((cur - prev) / 86400000);
        if (diffDays === 1 || diffDays === 2) next.streakDays = (next.streakDays || 0) + 1;
        else if (diffDays > 2) next.streakDays = 1;
      } else {
        next.streakDays = 1;
      }
      next.lastWorkoutDayKey = dk;
    }
    next.consistencyScore = Math.min(2500,
      (next.consistencyScore || 0) + 8 + Math.min(12, Math.floor((event.metadata && event.metadata.sets) || 0) / 2)
    );
  }
  if (event.eventType === 'PR_ACHIEVED') {
    next.prCount = (next.prCount || 0) + (event.metadata && event.metadata.count ? event.metadata.count : 1);
    next.consistencyScore = (next.consistencyScore || 0) + 15;
  }
  next.tier = tierFromScore(next.consistencyScore).id;
  next.achievements = evaluateAchievements(next);
  next.avatar = unlockCosmetics(next);
  return next;
}

export function evaluateAchievements(state) {
  const unlocked = new Set((state.achievements || []).map((a) => a.id || a));
  const out = (state.achievements || []).slice();
  ACHIEVEMENT_DEFS.forEach((def) => {
    if (unlocked.has(def.id)) return;
    try {
      if (def.check(state)) {
        out.push({ id: def.id, name: def.name, unlockedAt: new Date().toISOString(), rarity: def.rarity });
      }
    } catch (_) {}
  });
  return out;
}

export function unlockCosmetics(state) {
  const av = JSON.parse(JSON.stringify((state && state.avatar) || defaultRewardsState().avatar));
  const unlocked = new Set(av.unlocked || []);
  const add = (id) => { if (!unlocked.has(id)) { unlocked.add(id); } };
  add('frame_standard');
  add('outfit_charcoal');
  if ((state.level || 1) >= 10) add('outfit_silver');
  if (state.tier === 'elite' || state.tier === 'legend') add('frame_elite');
  if (state.tier === 'legend') add('outfit_legend');
  // Gold sub cosmetic — checked by caller via setGoldCosmetic
  av.unlocked = Array.from(unlocked);
  return av;
}

export function applyGoldCosmetic(state, hasGold) {
  const next = JSON.parse(JSON.stringify(state || defaultRewardsState()));
  next.avatar = unlockCosmetics(next);
  if (hasGold && next.avatar.unlocked.indexOf('frame_gold') < 0) {
    next.avatar.unlocked.push('frame_gold');
  }
  return next;
}

export function estimateTopPercent(consistencyScore, populationHint) {
  const score = Number(consistencyScore) || 0;
  // Local heuristic until server population exists
  if (populationHint && populationHint.total > 10 && populationHint.rank) {
    return Math.max(1, Math.min(99, Math.round((populationHint.rank / populationHint.total) * 100)));
  }
  if (score >= 1800) return 1;
  if (score >= 1200) return 3;
  if (score >= 800) return 6;
  if (score >= 500) return 10;
  if (score >= 280) return 20;
  if (score >= 120) return 50;
  return 75;
}

export function onWorkoutCompleted(state, logEntry, opts) {
  const base = state || defaultRewardsState();
  if (base.mode !== 'rewards') {
    // Still track workout count lightly for Focus? Plan says no XP; skip ledger.
    return { state: base, awarded: null, reason: 'focus_mode' };
  }
  const v = validateWorkoutXp(base, logEntry || {});
  if (!v.ok) return { state: base, awarded: null, reason: v.reason };
  let next = applyXpEvent(base, v.event);
  if (opts && opts.prCount > 0) {
    const prEvent = {
      id: 'xp_pr_' + (logEntry.id || Date.now()),
      eventType: 'PR_ACHIEVED',
      sourceId: String(logEntry.id) + '_pr',
      xpAmount: Math.min(50, opts.prCount * 25),
      timestamp: logEntry.at || new Date().toISOString(),
      metadata: { count: opts.prCount },
      validationStatus: 'validated'
    };
    next = applyXpEvent(next, prEvent);
  }
  if (opts && opts.hasGold) next = applyGoldCosmetic(next, true);
  next.topPercent = estimateTopPercent(next.consistencyScore, opts && opts.population);
  const lv = levelFromTotalXp(next.xp);
  return {
    state: next,
    awarded: {
      xp: v.xp + (opts && opts.prCount ? Math.min(50, opts.prCount * 25) : 0),
      level: lv.level,
      xpIntoLevel: lv.xpIntoLevel,
      xpToNext: lv.xpToNext,
      need: lv.need,
      tier: next.tier,
      streakDays: next.streakDays,
      newAchievements: (next.achievements || []).filter((a) => {
        const prev = (base.achievements || []).some((b) => (b.id || b) === (a.id || a));
        return !prev;
      })
    },
    reason: 'ok'
  };
}

export function setRewardsMode(state, mode) {
  const next = JSON.parse(JSON.stringify(state || defaultRewardsState()));
  if (mode !== 'focus' && mode !== 'rewards') return next;
  next.mode = mode;
  next.onboardingDone = true;
  if (mode === 'rewards' && !next.joinedAt) next.joinedAt = new Date().toISOString();
  next.achievements = evaluateAchievements(next);
  return next;
}

export function buildSharePayload(logEntry, rewardsState, toggles) {
  const defaults = (defaultRewardsState().shareDefaults) || {};
  const fromState = (rewardsState && rewardsState.shareDefaults) || {};
  const t = Object.assign({}, defaults, fromState, toggles || {});
  const payload = {
    brand: 'NURVAN',
    title: 'WORKOUT COMPLETE',
    date: (logEntry && logEntry.at) ? String(logEntry.at).slice(0, 10) : dayKeyFromDate(Date.now())
  };
  // Never include therapy/exams/meds/health
  if (t.duration) payload.durationSec = logEntry.durationSec || 0;
  if (t.tonnage) payload.tonnage = logEntry.tonnage || 0;
  if (t.calories) payload.kcal = logEntry.kcal || 0;
  if (t.prs && logEntry.prCount) payload.prCount = logEntry.prCount;
  if (rewardsState && rewardsState.mode === 'rewards') {
    if (t.level) payload.level = rewardsState.level;
    if (t.tier) payload.tier = rewardsState.tier;
    if (t.topPercent) payload.topPercent = rewardsState.topPercent;
    if (t.duration !== false) payload.streakDays = rewardsState.streakDays;
  }
  payload.sets = logEntry.sets || 0;
  payload.exercises = logEntry.exercises || 0;
  return payload;
}

export default {
  REWARDS_TIERS,
  ACHIEVEMENT_DEFS,
  AVATAR_COSMETICS,
  SOCIAL_CARD_TEMPLATES,
  defaultRewardsState,
  xpForLevel,
  levelFromTotalXp,
  tierFromScore,
  validateWorkoutXp,
  applyXpEvent,
  onWorkoutCompleted,
  setRewardsMode,
  buildSharePayload,
  estimateTopPercent,
  evaluateAchievements,
  applyGoldCosmetic
};
