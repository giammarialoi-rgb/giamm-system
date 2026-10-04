// The first page of the dashboard: the few numbers that say how Nurvan is
// going, each against the period before, and what needs attention.
import { summary } from "./economy.mjs";
import { signupSeries } from "./profiles.mjs";
import { siteStats, appStats, metricSeries, metricTotal, latestMetric, dayOf } from "./analytics.mjs";
import { status as integrationStatus } from "./integrations.mjs";
import { metrics as accountMetrics } from "./queries.mjs";
import { openReportCount } from "./reports.mjs";

const DAY = 86400000;

function delta(cur, prev) {
  if (!prev) return cur ? null : 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

export async function overview(pool, { siteHosts, env = process.env, days = 30, now = Date.now() } = {}) {
  const n = Math.min(90, Math.max(7, Number(days) || 30));
  const [money, accounts, signups, site, apps, igSeries, integrations] = await Promise.all([
    summary(pool, { now }),
    accountMetrics(pool, { now }),
    signupSeries(pool, Math.max(n, 30)),
    siteStats(pool, siteHosts, { days: n, now }),
    appStats(pool, { days: n, now }),
    metricSeries(pool, "instagram", { days: n + 31, now }),
    integrationStatus(pool, env)
  ]);
  const total = (acc) => acc.reduce((s, r) => s + r.signups, 0);
  const lastN = (list, k) => list.slice(-k);
  const new7 = total(lastN(signups, 7));
  const new30 = total(lastN(signups, 30));
  const accountsTotal = Number(accounts.plans.total);

  const followersNow = await latestMetric(pool, "instagram", "followers");
  const followersThen = (igSeries.followers || []).filter((x) => x.day <= dayOf(now - 30 * DAY)).pop();
  const followersSeries = (igSeries.followers || []).slice(-n);
  const reach7 = (igSeries.reach || []).filter((x) => x.day >= dayOf(now - 7 * DAY)).reduce((s, x) => s + x.value, 0);
  const clicks30 = (igSeries.website_clicks || []).filter((x) => x.day >= dayOf(now - 30 * DAY)).reduce((s, x) => s + x.value, 0);
  const [appStoreDl, playDl] = await Promise.all([metricTotal(pool, "appstore", "downloads", { days: n, now }), metricTotal(pool, "playstore", "downloads", { days: n, now })]);
  const installsApp = Object.values(apps.platforms).reduce((s, p) => s + p.installs.current, 0);
  const installsPrev = Object.values(apps.platforms).reduce((s, p) => s + p.installs.previous, 0);
  const dailyActive = Object.values(apps.platforms).reduce((s, p) => s + p.active.today, 0);

  const alerts = [];
  const errors24 = Number((await pool.query("SELECT COUNT(*)::int AS n FROM app_events WHERE at >= NOW() - INTERVAL '24 hours'")).rows[0].n);
  if (errors24 > 0) alerts.push({ level: errors24 >= 10 ? "bad" : "warn", text: errors24 + " errori visti dal server nelle ultime 24 ore", tab: "operations" });
  const openReports = await openReportCount(pool);
  if (openReports > 0) alerts.push({ level: "bad", text: openReports + (openReports === 1 ? " segnalazione della chat da gestire" : " segnalazioni della chat da gestire"), tab: "operations", sub: "reports" });
  const soon = money.expiring.filter((e) => Date.parse(e.until) - now <= 7 * DAY);
  if (soon.length) alerts.push({ level: "warn", text: soon.length + (soon.length === 1 ? " piano in scadenza" : " piani in scadenza") + " entro 7 giorni", tab: "economy" });
  for (const i of integrations) {
    if (i.configured && i.lastError) alerts.push({ level: "bad", text: i.label + ": " + i.lastError, tab: "stats" });
  }
  const adm = String(env.ADMIN_EMAILS || "").split(/[\s,;]+/).filter(Boolean);
  if (adm.length === 1) alerts.push({ level: "info", text: "Un solo indirizzo in ADMIN_EMAILS: se perdi la posta non entri piu'.", tab: "settings" });

  return {
    at: new Date(now).toISOString(),
    days: n,
    kpis: {
      mrrCents: money.mrrCents,
      paying: money.paying,
      comp: money.comp,
      trial: money.trial,
      accounts: accountsTotal,
      new7, new30,
      active7: accounts.active.d7,
      active30: accounts.active.d30,
      dailyActiveApp: dailyActive,
      sessions7: accounts.sessions.d7,
      sessions30: accounts.sessions.d30,
      siteVisitors: { current: site.visitors.current, delta: delta(site.visitors.current, site.visitors.previous) },
      siteViews: { current: site.views.current, delta: delta(site.views.current, site.views.previous) },
      installs: { current: installsApp, delta: delta(installsApp, installsPrev) },
      storeDownloads: { appstore: appStoreDl, playstore: playDl },
      instagram: {
        followers: followersNow ? followersNow.value : null,
        deltaMonth: followersNow && followersThen ? followersNow.value - followersThen.value : null,
        reach7, clicks30
      }
    },
    series: {
      signups: signups.slice(-n).map((s) => ({ day: s.day, value: s.signups })),
      visitors: site.visitors.series,
      views: site.views.series,
      followers: followersSeries.map((x) => ({ day: x.day, value: x.value }))
    },
    alerts
  };
}
