import { buildDeterministicIntelligence } from "./intelligence.mjs";

export function emptyAnalytics() {
  return {
    clients: 0,
    adherence: { average: null, atRisk: 0 },
    workouts: { completed28d: 0, inactive7d: 0 },
    volume: { averageTonnage: null },
    e1rm: { samples: 0 },
    weight: { moving: 0 },
    engagement: { unread: 0, liveNow: 0 },
    checkIns: { due: 0, reviewed: 0 },
    clientsAtRisk: []
  };
}

export function aggregateCoachAnalytics(rows, now = Date.now()) {
  const out = emptyAnalytics();
  out.clients = rows.length;
  const adherences = [];
  for (const row of rows) {
    const intelligence = row.intelligence || buildDeterministicIntelligence(row.client, row.data || {}, now);
    const adherence = intelligence.derivedMetrics && intelligence.derivedMetrics.adherence
      ? intelligence.derivedMetrics.adherence.value
      : null;
    if (adherence != null) adherences.push(adherence);
    if (adherence != null && adherence < 70) {
      out.adherence.atRisk += 1;
      out.clientsAtRisk.push({
        id: String(row.client.id),
        name: row.client.display_name || row.client.displayName,
        adherence
      });
    }
    out.workouts.completed28d += Number(intelligence.derivedMetrics?.consistency?.workouts28d || 0);
    if (Number(intelligence.derivedMetrics?.consistency?.inactiveDays || 0) >= 7) out.workouts.inactive7d += 1;
    const tonnage = intelligence.derivedMetrics?.performance?.tonnageAverage;
    if (tonnage != null) {
      out.volume.averageTonnage = out.volume.averageTonnage == null
        ? tonnage
        : Math.round((out.volume.averageTonnage + tonnage) / 2);
    }
    if (intelligence.derivedMetrics?.weight?.delta != null) out.weight.moving += 1;
    out.engagement.unread += Number(row.client.unread_count || row.client.unreadCount || 0);
    if (row.client.workoutLive || row.client.workout_live) out.engagement.liveNow += 1;
    if (intelligence.signals.some((signal) => signal.id === "missing_check_in")) out.checkIns.due += 1;
    const profile = (row.data && row.data.profile) || {};
    const oneRms = [profile.rmSquat, profile.rmBench, profile.rmDeadlift, row.data && row.data.e1rm]
      .map(Number)
      .filter((value) => Number.isFinite(value) && value > 0);
    if (oneRms.length) out.e1rm.samples += 1;
  }
  out.adherence.average = adherences.length
    ? Math.round(adherences.reduce((sum, value) => sum + value, 0) / adherences.length)
    : null;
  return {
    ...out,
    provenance: {
      formulaVersion: "coach-analytics-v1",
      sources: ["deterministic_intelligence", "coach_clients"],
      businessMetricsExcluded: true
    },
    computedAt: new Date(now).toISOString()
  };
}

export async function loadCoachAnalytics(pool, coachId, options = {}) {
  const clientId = options.clientId || options.client_id || null;
  const result = await pool.query(
    `SELECT c.*, d.data
     FROM coach_clients c
     LEFT JOIN app_account_data d ON d.user_id = c.athlete_user_id
     WHERE c.coach_user_id = $1 AND c.status <> 'removed'
       AND ($3::bigint IS NULL OR c.id = $3::bigint)
     ORDER BY c.display_name ASC
     LIMIT $2`,
    [coachId, Math.min(200, Number(options.limit) || 100), clientId]
  );
  const analytics = aggregateCoachAnalytics((result.rows || []).map((row) => ({
    client: row,
    data: row.data || {}
  })));
  analytics.filters = {
    rangeDays: Number(options.range || options.days || 28),
    clientId: clientId ? String(clientId) : null,
    savedView: options.savedView || options.view || null
  };
  return analytics;
}
