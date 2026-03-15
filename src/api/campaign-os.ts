import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler, type AppError } from './middleware/errorHandler.js';
import type { AuthRequest } from './middleware/auth.js';
import {
  canAccessCampaign,
  canSendHierarchicalMessage,
  getAllowedStates,
  getPrimaryRole,
  type AccessRole,
  type AuthActor,
} from '../lib/authorization.js';

export const campaignOsRouter = Router();

function createAppError(message: string, statusCode: number, isOperational = true): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = isOperational;
  return error;
}

function getActor(req: AuthRequest): AuthActor {
  if (!req.auth) throw createAppError('Nao autenticado', 401);
  return req.auth;
}

function parseIntSafe(value: unknown, fallback: number, min = 1, max = 365): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function diffPct(current: number, previous: number): number {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(2));
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function getActorRoles(actor: AuthActor): Set<string> {
  return new Set(actor.bindings.map((binding) => binding.role));
}

function resolveCampaign(actor: AuthActor, campaignIdParam?: string): {
  id: string;
  name: string;
  candidate_name: string;
  office: string;
  configuration: string | null;
  created_by: string | null;
} {
  if (campaignIdParam) {
    const campaign = db
      .prepare(
        `SELECT id, name, candidate_name, office, configuration, created_by
         FROM campaigns WHERE id = ?`,
      )
      .get(campaignIdParam) as
      | { id: string; name: string; candidate_name: string; office: string; configuration: string | null; created_by: string | null }
      | undefined;

    if (!campaign) throw createAppError('Campanha nao encontrada', 404);
    if (!canAccessCampaign(actor, campaign)) throw createAppError('Sem permissao para esta campanha', 403);
    return campaign;
  }

  const campaigns = db
    .prepare('SELECT id, name, candidate_name, office, configuration, created_by FROM campaigns ORDER BY created_at ASC')
    .all() as Array<{ id: string; name: string; candidate_name: string; office: string; configuration: string | null; created_by: string | null }>;

  const selected = campaigns.find((campaign) => canAccessCampaign(actor, campaign));
  if (!selected) throw createAppError('Nenhuma campanha disponivel no seu escopo', 404);
  return selected;
}

campaignOsRouter.get('/command', asyncHandler(async (req, res) => {
  const actor = getActor(req as AuthRequest);
  const campaign = resolveCampaign(actor, typeof req.query.campaignId === 'string' ? req.query.campaignId : undefined);
  const periodDays = parseIntSafe(req.query.periodDays, 14, 1, 90);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - periodDays);

  const sectors = db
    .prepare(
      `SELECT
         cs.id,
         cs.name,
         cs.slug,
         COUNT(ct.id) AS total_tasks,
         SUM(CASE WHEN ct.status = 'CONCLUIDA' THEN 1 ELSE 0 END) AS done_tasks,
         SUM(CASE WHEN ct.status IN ('PENDENTE', 'EM_PROGRESSO', 'REVISAO') THEN 1 ELSE 0 END) AS open_tasks,
         SUM(CASE WHEN ct.deadline IS NOT NULL AND ct.deadline < ? AND ct.status <> 'CONCLUIDA' THEN 1 ELSE 0 END) AS late_tasks
       FROM campaign_sectors cs
       LEFT JOIN campaign_tasks ct ON ct.sector_id = cs.id
       WHERE cs.campaign_id = ?
       GROUP BY cs.id, cs.name, cs.slug
       ORDER BY open_tasks DESC, late_tasks DESC`,
    )
    .all(new Date().toISOString(), campaign.id) as Array<{
    id: string;
    name: string;
    slug: string;
    total_tasks: number;
    done_tasks: number;
    open_tasks: number;
    late_tasks: number;
  }>;

  const leadsSummary = db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status IN ('APOIADOR', 'VOLUNTARIO', 'ATIVISTA', 'MULTIPLICADOR', 'LIDERANCA_LOCAL') THEN 1 ELSE 0 END) AS qualified,
              SUM(CASE WHEN entered_at >= ? THEN 1 ELSE 0 END) AS new_in_period
       FROM campaign_leads
       WHERE campaign_id = ?`,
    )
    .get(fromDate.toISOString(), campaign.id) as { total: number; qualified: number; new_in_period: number };

  const socialSummary = db
    .prepare(
      `SELECT SUM(impressions) AS impressions, SUM(reach) AS reach, SUM(engagements) AS engagements, SUM(spend) AS spend
       FROM campaign_social_metrics
       WHERE campaign_id = ? AND collected_at >= ?`,
    )
    .get(campaign.id, fromDate.toISOString()) as { impressions: number | null; reach: number | null; engagements: number | null; spend: number | null };

  const candidateQueue = db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'PENDENTE' THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN status = 'CONCLUIDA' THEN 1 ELSE 0 END) AS done
       FROM candidate_agenda
       WHERE campaign_id = ?`,
    )
    .get(campaign.id) as { total: number; pending: number; done: number };

  const timeline = db
    .prepare(
      `SELECT id, event_type, severity, source_area, title, description, status, event_at
       FROM campaign_timeline_events
       WHERE campaign_id = ?
       ORDER BY event_at DESC
       LIMIT 15`,
    )
    .all(campaign.id);

  const totalTasks = sectors.reduce((sum, sector) => sum + Number(sector.total_tasks ?? 0), 0);
  const doneTasks = sectors.reduce((sum, sector) => sum + Number(sector.done_tasks ?? 0), 0);
  const totalOpen = sectors.reduce((sum, sector) => sum + Number(sector.open_tasks ?? 0), 0);
  const totalLate = sectors.reduce((sum, sector) => sum + Number(sector.late_tasks ?? 0), 0);

  const executionRate = totalTasks > 0 ? Number(((doneTasks / totalTasks) * 100).toFixed(2)) : 0;
  const leadHealth = leadsSummary.total > 0 ? Number(((leadsSummary.qualified / leadsSummary.total) * 100).toFixed(2)) : 0;
  const socialHealth = Number(socialSummary.reach ?? 0) > 0
    ? Number((((Number(socialSummary.engagements ?? 0) / Number(socialSummary.reach ?? 1)) * 100)).toFixed(2))
    : 0;

  const healthScore = Number(Math.max(0, Math.min(100, executionRate * 0.45 + leadHealth * 0.25 + socialHealth * 0.2 + (candidateQueue.pending > 0 ? 10 : 20))).toFixed(2));

  res.json({
    campaign: { id: campaign.id, name: campaign.name, candidateName: campaign.candidate_name, office: campaign.office },
    periodDays,
    generatedAt: new Date().toISOString(),
    executive: { healthScore, executionRate, totalOpen, totalLate, leadHealth, socialHealth, candidatePending: candidateQueue.pending },
    areaHealth: [
      { area: 'Redes', score: socialHealth },
      { area: 'Leads', score: leadHealth },
      { area: 'Programacao', score: executionRate },
      { area: 'Voluntariado', score: Math.max(0, 100 - totalLate * 8) },
      { area: 'Candidato', score: Math.max(0, 100 - candidateQueue.pending * 12) },
    ],
    bottlenecks: sectors.slice(0, 8),
    criticalAlerts: timeline,
    timeline,
    pendingByArea: sectors.map((sector) => ({ area: sector.name, openTasks: sector.open_tasks, lateTasks: sector.late_tasks })),
  });
}));
campaignOsRouter.get('/networks', asyncHandler(async (req, res) => {
  const actor = getActor(req as AuthRequest);
  const campaign = resolveCampaign(actor, typeof req.query.campaignId === 'string' ? req.query.campaignId : undefined);

  const periodDays = parseIntSafe(req.query.periodDays, 7, 1, 60);
  const currentFrom = new Date();
  currentFrom.setDate(currentFrom.getDate() - periodDays);
  const previousFrom = new Date(currentFrom);
  previousFrom.setDate(previousFrom.getDate() - periodDays);

  const mediaType = typeof req.query.mediaType === 'string' ? req.query.mediaType.toUpperCase() : null;
  const whereParts = ['campaign_id = ?', 'collected_at >= ?'];
  const params: Array<string> = [campaign.id, currentFrom.toISOString()];
  if (mediaType) {
    whereParts.push('media_type = ?');
    params.push(mediaType);
  }

  const totals = db
    .prepare(
      `SELECT media_type,
              SUM(impressions) AS impressions,
              SUM(reach) AS reach,
              SUM(engagements) AS engagements,
              SUM(comments) AS comments,
              SUM(shares) AS shares,
              SUM(saves) AS saves,
              SUM(followers_growth) AS followers_growth,
              SUM(spend) AS spend,
              SUM(clicks) AS clicks,
              SUM(leads) AS leads,
              SUM(conversions) AS conversions,
              AVG(cpc) AS avg_cpc,
              AVG(cpm) AS avg_cpm,
              AVG(cpl) AS avg_cpl,
              AVG(ctr) AS avg_ctr,
              AVG(cost_per_supporter) AS avg_cost_per_supporter,
              AVG(cost_per_volunteer) AS avg_cost_per_volunteer
       FROM campaign_social_metrics
       WHERE ${whereParts.join(' AND ')}
       GROUP BY media_type`,
    )
    .all(...params) as Array<Record<string, number | string | null>>;

  const previousTotals = db
    .prepare(
      `SELECT media_type,
              SUM(impressions) AS impressions,
              SUM(reach) AS reach,
              SUM(engagements) AS engagements,
              SUM(spend) AS spend,
              SUM(leads) AS leads,
              SUM(clicks) AS clicks
       FROM campaign_social_metrics
       WHERE campaign_id = ? AND collected_at >= ? AND collected_at < ?
       GROUP BY media_type`,
    )
    .all(campaign.id, previousFrom.toISOString(), currentFrom.toISOString()) as Array<Record<string, number | string | null>>;

  const previousMap = new Map(previousTotals.map((item) => [String(item.media_type), item]));

  const byCreative = db
    .prepare(
      `SELECT platform, format, media_type,
              SUM(impressions) AS impressions,
              SUM(reach) AS reach,
              SUM(engagements) AS engagements,
              SUM(spend) AS spend,
              SUM(clicks) AS clicks,
              SUM(leads) AS leads,
              SUM(conversions) AS conversions
       FROM campaign_social_metrics
       WHERE ${whereParts.join(' AND ')}
       GROUP BY platform, format, media_type
       ORDER BY engagements DESC
       LIMIT 15`,
    )
    .all(...params) as Array<Record<string, number | string | null>>;

  const paidByPlatform = db
    .prepare(
      `SELECT platform,
              SUM(spend) AS spend,
              SUM(impressions) AS impressions,
              SUM(clicks) AS clicks,
              SUM(leads) AS leads,
              SUM(conversions) AS conversions
       FROM campaign_social_metrics
       WHERE campaign_id = ? AND collected_at >= ? AND media_type = 'PAGA'
       GROUP BY platform
       ORDER BY spend DESC`,
    )
    .all(campaign.id, currentFrom.toISOString()) as Array<Record<string, number | string | null>>;

  const paidByHour = db
    .prepare(
      `SELECT hour_slot,
              SUM(spend) AS spend,
              SUM(impressions) AS impressions,
              SUM(clicks) AS clicks,
              SUM(leads) AS leads,
              SUM(conversions) AS conversions
       FROM campaign_social_metrics
       WHERE campaign_id = ? AND collected_at >= ? AND media_type = 'PAGA'
       GROUP BY hour_slot
       ORDER BY hour_slot ASC`,
    )
    .all(campaign.id, currentFrom.toISOString()) as Array<Record<string, number | string | null>>;

  const paidByDemographic = db
    .prepare(
      `SELECT demographic_group,
              SUM(spend) AS spend,
              SUM(impressions) AS impressions,
              SUM(clicks) AS clicks,
              SUM(leads) AS leads,
              SUM(conversions) AS conversions
       FROM campaign_social_metrics
       WHERE campaign_id = ? AND collected_at >= ? AND media_type = 'PAGA'
       GROUP BY demographic_group
       ORDER BY spend DESC`,
    )
    .all(campaign.id, currentFrom.toISOString()) as Array<Record<string, number | string | null>>;

  const normalize = (record: Record<string, number | string | null> | undefined) => ({
    impressions: Number(record?.impressions ?? 0),
    reach: Number(record?.reach ?? 0),
    engagements: Number(record?.engagements ?? 0),
    comments: Number(record?.comments ?? 0),
    shares: Number(record?.shares ?? 0),
    saves: Number(record?.saves ?? 0),
    followersGrowth: Number(record?.followers_growth ?? 0),
    spend: Number(record?.spend ?? 0),
    clicks: Number(record?.clicks ?? 0),
    leads: Number(record?.leads ?? 0),
    conversions: Number(record?.conversions ?? 0),
    cpc: Number(record?.avg_cpc ?? 0),
    cpm: Number(record?.avg_cpm ?? 0),
    cpl: Number(record?.avg_cpl ?? 0),
    ctr: Number(record?.avg_ctr ?? 0),
    costPerSupporter: Number(record?.avg_cost_per_supporter ?? 0),
    costPerVolunteer: Number(record?.avg_cost_per_volunteer ?? 0),
  });

  const organic = normalize(totals.find((item) => String(item.media_type) === 'ORGANICA'));
  const paid = normalize(totals.find((item) => String(item.media_type) === 'PAGA'));

  const organicPrev = previousMap.get('ORGANICA');
  const paidPrev = previousMap.get('PAGA');

  const campaignConfig = parseJsonObject(campaign.configuration);
  const budgetFromConfig = Number(campaignConfig.paid_budget_target ?? campaignConfig.budget_paid ?? 0);
  const monthlyBudget = Number.isFinite(budgetFromConfig) && budgetFromConfig > 0 ? budgetFromConfig : 15000;
  const budgetWindow = Number(((monthlyBudget / 30) * periodDays).toFixed(2));
  const remainingWindowBudget = Number(Math.max(0, budgetWindow - paid.spend).toFixed(2));
  const pacingPct = budgetWindow > 0 ? Number(((paid.spend / budgetWindow) * 100).toFixed(2)) : 0;
  const projectedMonthSpend = Number((((periodDays > 0 ? paid.spend / periodDays : 0) * 30)).toFixed(2));
  const projectedMonthLeads = paid.cpl > 0 ? Number((monthlyBudget / paid.cpl).toFixed(0)) : 0;
  const paidToConversionRate = paid.clicks > 0 ? Number(((paid.conversions / paid.clicks) * 100).toFixed(2)) : 0;

  const demographicTotalSpend = paidByDemographic.reduce((sum, item) => sum + Number(item.spend ?? 0), 0);

  res.json({
    campaign: { id: campaign.id, name: campaign.name, candidateName: campaign.candidate_name },
    periodDays,
    organic,
    paid,
    paidTraffic: {
      budget: {
        monthlyBudget,
        budgetWindow,
        spend: Number(paid.spend.toFixed(2)),
        remainingWindowBudget,
        pacingPct,
        projectedMonthSpend,
        projectedMonthLeads,
      },
      efficiency: {
        cpc: Number(paid.cpc.toFixed(2)),
        cpm: Number(paid.cpm.toFixed(2)),
        cpl: Number(paid.cpl.toFixed(2)),
        ctr: Number(paid.ctr.toFixed(2)),
        conversionRate: paidToConversionRate,
        costPerSupporter: Number(paid.costPerSupporter.toFixed(2)),
        costPerVolunteer: Number(paid.costPerVolunteer.toFixed(2)),
      },
      platformBreakdown: paidByPlatform.map((item) => {
        const impressions = Number(item.impressions ?? 0);
        const clicks = Number(item.clicks ?? 0);
        const leads = Number(item.leads ?? 0);
        const spend = Number(item.spend ?? 0);
        return {
          platform: String(item.platform ?? 'Nao informado'),
          spend: Number(spend.toFixed(2)),
          impressions,
          clicks,
          leads,
          conversions: Number(item.conversions ?? 0),
          ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
          cpl: leads > 0 ? Number((spend / leads).toFixed(2)) : 0,
        };
      }),
      hourlyDistribution: paidByHour.map((item) => {
        const hourSlot = Number(item.hour_slot ?? -1);
        return {
          hourSlot,
          spend: Number(Number(item.spend ?? 0).toFixed(2)),
          impressions: Number(item.impressions ?? 0),
          clicks: Number(item.clicks ?? 0),
          leads: Number(item.leads ?? 0),
          conversions: Number(item.conversions ?? 0),
        };
      }),
      demographicDistribution: paidByDemographic.map((item) => {
        const spend = Number(item.spend ?? 0);
        return {
          group: String(item.demographic_group ?? 'Nao informado'),
          spend: Number(spend.toFixed(2)),
          shareSpendPct: demographicTotalSpend > 0 ? Number(((spend / demographicTotalSpend) * 100).toFixed(2)) : 0,
          impressions: Number(item.impressions ?? 0),
          clicks: Number(item.clicks ?? 0),
          leads: Number(item.leads ?? 0),
          conversions: Number(item.conversions ?? 0),
        };
      }),
    },
    variation: {
      organic: {
        impressionsPct: diffPct(organic.impressions, Number(organicPrev?.impressions ?? 0)),
        reachPct: diffPct(organic.reach, Number(organicPrev?.reach ?? 0)),
        engagementsPct: diffPct(organic.engagements, Number(organicPrev?.engagements ?? 0)),
      },
      paid: {
        spendPct: diffPct(paid.spend, Number(paidPrev?.spend ?? 0)),
        clicksPct: diffPct(paid.clicks, Number(paidPrev?.clicks ?? 0)),
        leadsPct: diffPct(paid.leads, Number(paidPrev?.leads ?? 0)),
      },
    },
    ranking: byCreative.map((item, index) => {
      const impressions = Number(item.impressions ?? 0);
      const reach = Number(item.reach ?? 0);
      const engagements = Number(item.engagements ?? 0);
      const clicks = Number(item.clicks ?? 0);
      const leads = Number(item.leads ?? 0);
      const spend = Number(item.spend ?? 0);
      const engagementRate = reach > 0 ? (engagements / reach) * 100 : 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpl = leads > 0 ? spend / leads : 0;
      const aiScore = Number(Math.max(0, Math.min(100, engagementRate * 4.2 + ctr * 12 - cpl * 0.2)).toFixed(2));

      return {
        rank: index + 1,
        platform: item.platform,
        format: item.format,
        mediaType: item.media_type,
        impressions,
        reach,
        engagements,
        clicks,
        leads,
        cpl: Number(cpl.toFixed(2)),
        aiScore,
      };
    }),
    generatedAt: new Date().toISOString(),
  });
}));

campaignOsRouter.get('/integrations', asyncHandler(async (req, res) => {
  const actor = getActor(req as AuthRequest);
  const campaign = resolveCampaign(actor, typeof req.query.campaignId === 'string' ? req.query.campaignId : undefined);

  const rows = db
    .prepare(
      `SELECT id, name, provider, category, integration_type, status, owner_role,
              sync_health, records_24h, avg_latency_ms, error_rate,
              last_sync_at, webhook_url, metadata_json, created_at, updated_at
       FROM campaign_integrations
       WHERE campaign_id = ?
       ORDER BY
         CASE status
           WHEN 'ERRO' THEN 1
           WHEN 'ATENCAO' THEN 2
           WHEN 'DESCONECTADA' THEN 3
           ELSE 4
         END,
         category ASC,
         sync_health DESC`,
    )
    .all(campaign.id) as Array<{
    id: string;
    name: string;
    provider: string;
    category: string;
    integration_type: string;
    status: string;
    owner_role: string | null;
    sync_health: number;
    records_24h: number;
    avg_latency_ms: number;
    error_rate: number;
    last_sync_at: string | null;
    webhook_url: string | null;
    metadata_json: string | null;
    created_at: string;
    updated_at: string;
  }>;

  const integrations = rows.map((row) => ({
    id: row.id,
    name: row.name,
    provider: row.provider,
    category: row.category,
    integrationType: row.integration_type,
    status: row.status,
    ownerRole: row.owner_role,
    syncHealth: Number(row.sync_health ?? 0),
    records24h: Number(row.records_24h ?? 0),
    avgLatencyMs: Number(row.avg_latency_ms ?? 0),
    errorRate: Number(row.error_rate ?? 0),
    lastSyncAt: row.last_sync_at,
    webhookUrl: row.webhook_url,
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const summary = integrations.reduce(
    (acc, integration) => {
      acc.total += 1;
      acc.totalRecords24h += integration.records24h;
      acc.totalLatency += integration.avgLatencyMs;
      acc.totalHealth += integration.syncHealth;

      if (integration.status === 'ATIVA') acc.active += 1;
      if (integration.status === 'ATENCAO') acc.attention += 1;
      if (integration.status === 'ERRO') acc.error += 1;
      if (integration.status === 'DESCONECTADA') acc.disconnected += 1;

      return acc;
    },
    {
      total: 0,
      active: 0,
      attention: 0,
      error: 0,
      disconnected: 0,
      totalRecords24h: 0,
      totalLatency: 0,
      totalHealth: 0,
    },
  );

  const categoryMap = new Map<string, {
    category: string;
    total: number;
    active: number;
    attention: number;
    error: number;
    disconnected: number;
    sumHealth: number;
    records24h: number;
  }>();

  integrations.forEach((integration) => {
    const entry = categoryMap.get(integration.category) ?? {
      category: integration.category,
      total: 0,
      active: 0,
      attention: 0,
      error: 0,
      disconnected: 0,
      sumHealth: 0,
      records24h: 0,
    };

    entry.total += 1;
    entry.sumHealth += integration.syncHealth;
    entry.records24h += integration.records24h;

    if (integration.status === 'ATIVA') entry.active += 1;
    if (integration.status === 'ATENCAO') entry.attention += 1;
    if (integration.status === 'ERRO') entry.error += 1;
    if (integration.status === 'DESCONECTADA') entry.disconnected += 1;

    categoryMap.set(integration.category, entry);
  });

  const categories = Array.from(categoryMap.values()).map((entry) => ({
    category: entry.category,
    total: entry.total,
    active: entry.active,
    attention: entry.attention,
    error: entry.error,
    disconnected: entry.disconnected,
    records24h: entry.records24h,
    avgHealth: entry.total > 0 ? Number((entry.sumHealth / entry.total).toFixed(2)) : 0,
  }));

  const criticalAlerts = integrations
    .filter((integration) => integration.status === 'ERRO' || integration.status === 'ATENCAO' || integration.status === 'DESCONECTADA')
    .slice(0, 8)
    .map((integration) => ({
      integrationId: integration.id,
      name: integration.name,
      status: integration.status,
      ownerRole: integration.ownerRole,
      message:
        integration.status === 'ERRO'
          ? 'Sincronizacao com falhas criticas. Revisar credenciais e endpoint.'
          : integration.status === 'ATENCAO'
            ? 'Integracao com degradacao de performance. Monitorar latencia e taxa de erro.'
            : 'Integracao desconectada. Reativar para evitar ruptura operacional.',
    }));

  res.json({
    campaign: { id: campaign.id, name: campaign.name, candidateName: campaign.candidate_name },
    summary: {
      total: summary.total,
      active: summary.active,
      attention: summary.attention,
      error: summary.error,
      disconnected: summary.disconnected,
      totalRecords24h: summary.totalRecords24h,
      avgLatencyMs: summary.total > 0 ? Number((summary.totalLatency / summary.total).toFixed(2)) : 0,
      avgHealth: summary.total > 0 ? Number((summary.totalHealth / summary.total).toFixed(2)) : 0,
    },
    categories,
    digitalMedia: integrations.filter((integration) => integration.category === 'MIDIA_DIGITAL'),
    externalSystems: integrations.filter((integration) => integration.category !== 'MIDIA_DIGITAL'),
    criticalAlerts,
    integrations,
    generatedAt: new Date().toISOString(),
  });
}));
campaignOsRouter.get('/leads', asyncHandler(async (req, res) => {
  const actor = getActor(req as AuthRequest);
  const campaign = resolveCampaign(actor, typeof req.query.campaignId === 'string' ? req.query.campaignId : undefined);

  const periodDays = parseIntSafe(req.query.periodDays, 30, 1, 180);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - periodDays);

  const leads = db
    .prepare(
      `SELECT id, name, phone, city, state, neighborhood, source, interest, tags, status, engagement_level, entered_at
       FROM campaign_leads
       WHERE campaign_id = ? AND entered_at >= ?
       ORDER BY entered_at DESC`,
    )
    .all(campaign.id, fromDate.toISOString()) as Array<{
    id: string;
    name: string;
    phone: string;
    city: string | null;
    state: string | null;
    neighborhood: string | null;
    source: string;
    interest: string | null;
    tags: string;
    status: string;
    engagement_level: number;
    entered_at: string;
  }>;

  const statusOrder = ['VISITANTE', 'INTERESSADO', 'SIMPATIZANTE', 'APOIADOR', 'VOLUNTARIO', 'ATIVISTA', 'MULTIPLICADOR', 'LIDERANCA_LOCAL'];
  const statusCount = new Map<string, number>();
  const sourceCount = new Map<string, number>();
  const cityCount = new Map<string, number>();
  const tagCount = new Map<string, number>();

  leads.forEach((lead) => {
    statusCount.set(lead.status, (statusCount.get(lead.status) ?? 0) + 1);
    sourceCount.set(lead.source, (sourceCount.get(lead.source) ?? 0) + 1);

    const territoryKey = `${lead.city ?? 'Nao informado'}/${lead.state ?? ''}`.replace(/\/$/, '');
    cityCount.set(territoryKey, (cityCount.get(territoryKey) ?? 0) + 1);

    try {
      const tags = JSON.parse(lead.tags) as string[];
      tags.forEach((tag) => tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1));
    } catch {
      // ignore parse errors
    }
  });

  const totalLeads = leads.length;
  const supporterOrAbove = leads.filter((lead) => ['APOIADOR', 'VOLUNTARIO', 'ATIVISTA', 'MULTIPLICADOR', 'LIDERANCA_LOCAL'].includes(lead.status)).length;
  const volunteerOrAbove = leads.filter((lead) => ['VOLUNTARIO', 'ATIVISTA', 'MULTIPLICADOR', 'LIDERANCA_LOCAL'].includes(lead.status)).length;

  const whatsappGroups = db
    .prepare(
      `SELECT id, name, admins_json, members_count, activity_score, territory_ref, retention_rate, status, last_activity_at
       FROM campaign_whatsapp_groups
       WHERE campaign_id = ?
       ORDER BY activity_score DESC, members_count DESC`,
    )
    .all(campaign.id) as Array<{
    id: string;
    name: string;
    admins_json: string;
    members_count: number;
    activity_score: number;
    territory_ref: string | null;
    retention_rate: number;
    status: string;
    last_activity_at: string | null;
  }>;

  res.json({
    campaign: { id: campaign.id, name: campaign.name, candidateName: campaign.candidate_name },
    periodDays,
    summary: {
      totalLeads,
      supporterOrAbove,
      volunteerOrAbove,
      avgEngagementLevel: totalLeads > 0 ? Number((leads.reduce((sum, lead) => sum + Number(lead.engagement_level ?? 0), 0) / totalLeads).toFixed(2)) : 0,
      conversionSupporterRate: totalLeads > 0 ? Number(((supporterOrAbove / totalLeads) * 100).toFixed(2)) : 0,
      conversionVolunteerRate: totalLeads > 0 ? Number(((volunteerOrAbove / totalLeads) * 100).toFixed(2)) : 0,
    },
    funnel: statusOrder.map((stage) => ({ stage, count: statusCount.get(stage) ?? 0 })),
    channels: Array.from(sourceCount.entries()).map(([channel, count]) => ({ channel, count })).sort((a, b) => b.count - a.count),
    territoryDistribution: Array.from(cityCount.entries()).map(([territory, count]) => ({ territory, count })).sort((a, b) => b.count - a.count).slice(0, 12),
    topTags: Array.from(tagCount.entries()).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    whatsappGroups: whatsappGroups.map((group) => ({ ...group, admins: JSON.parse(group.admins_json || '[]') as string[] })),
    leads: leads.slice(0, 80),
    generatedAt: new Date().toISOString(),
  });
}));
campaignOsRouter.get('/programming', asyncHandler(async (req, res) => {
  const actor = getActor(req as AuthRequest);
  const campaign = resolveCampaign(actor, typeof req.query.campaignId === 'string' ? req.query.campaignId : undefined);

  const tasks = db
    .prepare(
      `SELECT ct.id, ct.title, ct.description, ct.status, ct.priority, ct.deadline, ct.estimated_hours, ct.registered_hours,
              cs.name AS sector_name, cs.slug AS sector_slug, v.name AS assignee_name
       FROM campaign_tasks ct
       JOIN campaign_sectors cs ON cs.id = ct.sector_id
       LEFT JOIN volunteers v ON v.id = ct.assigned_to
       WHERE ct.campaign_id = ?
       ORDER BY CASE ct.priority WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 ELSE 3 END, ct.deadline ASC`,
    )
    .all(campaign.id);

  const forum = db
    .prepare(
      `SELECT id, title, category, content, votes, answers_count, is_solved, created_at
       FROM campaign_programming_topics
       WHERE campaign_id = ?
       ORDER BY is_solved ASC, votes DESC, created_at DESC
       LIMIT 40`,
    )
    .all(campaign.id);

  const kanban = {
    backlog: tasks.filter((task: any) => task.status === 'PENDENTE'),
    inProgress: tasks.filter((task: any) => task.status === 'EM_PROGRESSO'),
    review: tasks.filter((task: any) => task.status === 'REVISAO'),
    done: tasks.filter((task: any) => task.status === 'CONCLUIDA'),
  };

  const workload = (tasks as Array<{ estimated_hours?: number | null; registered_hours?: number | null }>).reduce((acc: { estimated: number; registered: number }, task: any) => {
    acc.estimated += Number(task.estimated_hours ?? 0);
    acc.registered += Number(task.registered_hours ?? 0);
    return acc;
  }, { estimated: 0, registered: 0 });

  const roadmap = tasks
    .filter((task: any) => task.deadline)
    .map((task: any) => ({
      id: task.id,
      title: task.title,
      category: String(task.title ?? '').toLowerCase().includes('bug') ? 'bug' : 'feature',
      status: task.status,
      priority: task.priority,
      dueAt: task.deadline,
      owner: task.assignee_name,
      sector: task.sector_name,
    }))
    .slice(0, 25);

  res.json({
    campaign: { id: campaign.id, name: campaign.name, candidateName: campaign.candidate_name },
    summary: {
      totalTasks: tasks.length,
      backlog: kanban.backlog.length,
      inProgress: kanban.inProgress.length,
      review: kanban.review.length,
      done: kanban.done.length,
      completionRate: tasks.length > 0 ? Number(((kanban.done.length / tasks.length) * 100).toFixed(2)) : 0,
      estimatedHours: Number(workload.estimated.toFixed(2)),
      registeredHours: Number(workload.registered.toFixed(2)),
    },
    kanban,
    roadmap,
    forum,
    generatedAt: new Date().toISOString(),
  });
}));

campaignOsRouter.get('/candidate', asyncHandler(async (req, res) => {
  const actor = getActor(req as AuthRequest);
  const campaign = resolveCampaign(actor, typeof req.query.campaignId === 'string' ? req.query.campaignId : undefined);

  const agenda = db
    .prepare(
      `SELECT id, title, agenda_type, priority, status, due_at, source_entity, notes, created_at
       FROM candidate_agenda
       WHERE campaign_id = ?
       ORDER BY CASE priority WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 ELSE 3 END, due_at ASC`,
    )
    .all(campaign.id);

  const waitingContentTasks = db
    .prepare(
      `SELECT id, title, status, deadline
       FROM campaign_tasks
       WHERE campaign_id = ?
         AND (LOWER(title) LIKE '%roteiro%' OR LOWER(title) LIKE '%conteudo%' OR LOWER(title) LIKE '%video%')
         AND status IN ('PENDENTE', 'REVISAO', 'EM_PROGRESSO')
       ORDER BY deadline ASC
       LIMIT 25`,
    )
    .all(campaign.id);

  const authorizedContacts = db
    .prepare(
      `SELECT DISTINCT sender_role
       FROM campaign_hierarchical_messages
       WHERE campaign_id = ?
       ORDER BY sender_role ASC`,
    )
    .all(campaign.id)
    .map((row) => String((row as { sender_role: string }).sender_role));

  const pending = agenda.filter((item: any) => item.status === 'PENDENTE').length;
  const completed = agenda.filter((item: any) => item.status === 'CONCLUIDA').length;

  res.json({
    campaign: { id: campaign.id, name: campaign.name, candidateName: campaign.candidate_name, office: campaign.office },
    summary: {
      totalAgendaItems: agenda.length,
      pending,
      completed,
      waitingContent: waitingContentTasks.length,
    },
    agenda,
    waitingContentTasks,
    authorizedContacts,
    generatedAt: new Date().toISOString(),
  });
}));

campaignOsRouter.get('/reports', asyncHandler(async (req, res) => {
  const actor = getActor(req as AuthRequest);
  const campaign = resolveCampaign(actor, typeof req.query.campaignId === 'string' ? req.query.campaignId : undefined);

  const level = typeof req.query.level === 'string' ? req.query.level : 'executivo';
  const periodDays = parseIntSafe(req.query.periodDays, 7, 1, 120);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - periodDays);

  const tasks = db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'CONCLUIDA' THEN 1 ELSE 0 END) AS done,
              SUM(CASE WHEN status = 'REVISAO' THEN 1 ELSE 0 END) AS in_review,
              SUM(CASE WHEN status = 'EM_PROGRESSO' THEN 1 ELSE 0 END) AS in_progress,
              SUM(CASE WHEN status = 'PENDENTE' THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN deadline IS NOT NULL AND deadline < ? AND status <> 'CONCLUIDA' THEN 1 ELSE 0 END) AS late
       FROM campaign_tasks
       WHERE campaign_id = ? AND created_at >= ?`,
    )
    .get(new Date().toISOString(), campaign.id, fromDate.toISOString()) as any;

  const leads = db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status IN ('APOIADOR', 'VOLUNTARIO', 'ATIVISTA', 'MULTIPLICADOR', 'LIDERANCA_LOCAL') THEN 1 ELSE 0 END) AS converted
       FROM campaign_leads
       WHERE campaign_id = ? AND entered_at >= ?`,
    )
    .get(campaign.id, fromDate.toISOString()) as any;

  const social = db
    .prepare(
      `SELECT SUM(impressions) AS impressions,
              SUM(reach) AS reach,
              SUM(engagements) AS engagements,
              SUM(spend) AS spend,
              SUM(leads) AS leads
       FROM campaign_social_metrics
       WHERE campaign_id = ? AND collected_at >= ?`,
    )
    .get(campaign.id, fromDate.toISOString()) as any;

  const sectors = db
    .prepare(
      `SELECT cs.name, COUNT(ct.id) AS total,
              SUM(CASE WHEN ct.status = 'CONCLUIDA' THEN 1 ELSE 0 END) AS done,
              SUM(CASE WHEN ct.status <> 'CONCLUIDA' THEN 1 ELSE 0 END) AS open
       FROM campaign_sectors cs
       LEFT JOIN campaign_tasks ct ON ct.sector_id = cs.id
       WHERE cs.campaign_id = ?
       GROUP BY cs.id, cs.name
       ORDER BY total DESC`,
    )
    .all(campaign.id);

  const territories = db
    .prepare(
      `SELECT city, state, COUNT(*) AS total
       FROM campaign_leads
       WHERE campaign_id = ?
       GROUP BY city, state
       ORDER BY total DESC
       LIMIT 20`,
    )
    .all(campaign.id);

  const perspectiveByLevel: Record<string, Record<string, unknown>> = {
    executivo: { headline: 'Visao consolidada para direcao', score: tasks.total > 0 ? Number(((tasks.done / tasks.total) * 100).toFixed(2)) : 0 },
    chefia: { headline: 'Acompanhamento por chefia', attentionPoints: tasks.late },
    equipe: { headline: 'Producao de equipe', throughput: tasks.done },
    candidato: {
      headline: 'Painel simplificado do candidato',
      approvalsPending: (db.prepare('SELECT COUNT(*) as count FROM candidate_agenda WHERE campaign_id = ? AND status = ?').get(campaign.id, 'PENDENTE') as { count: number }).count,
    },
    territorial: { headline: 'Cobertura territorial', knownStates: getAllowedStates(actor) },
    militancia: { headline: 'Mobilizacao da base', activeFronts: sectors.filter((sector: any) => Number(sector.open ?? 0) > 0).length },
    individual_voluntario: { headline: 'Desempenho individual (expansao futura)' },
  };

  res.json({
    campaign: { id: campaign.id, name: campaign.name, candidateName: campaign.candidate_name },
    report: {
      level,
      periodDays,
      generatedAt: new Date().toISOString(),
      kpis: {
        tasks,
        leads: {
          ...leads,
          conversionRate: leads.total > 0 ? Number(((leads.converted / leads.total) * 100).toFixed(2)) : 0,
        },
        social: {
          impressions: Number(social.impressions ?? 0),
          reach: Number(social.reach ?? 0),
          engagements: Number(social.engagements ?? 0),
          spend: Number(social.spend ?? 0),
          leads: Number(social.leads ?? 0),
        },
      },
      breakdown: { sectors, territories },
      perspective: perspectiveByLevel[level] ?? perspectiveByLevel.executivo,
    },
  });
}));
campaignOsRouter.get('/notifications', asyncHandler(async (req, res) => {
  const actor = getActor(req as AuthRequest);
  const campaign = resolveCampaign(actor, typeof req.query.campaignId === 'string' ? req.query.campaignId : undefined);
  const actorRoles = getActorRoles(actor);

  const rolePlaceholders = Array.from(actorRoles).map(() => '?').join(', ');
  const sql = `SELECT id, campaign_id, sender_id, sender_role, target_role, recipient_id, urgency, title, message, context_payload, read_by_recipient, read_at, created_at
               FROM campaign_hierarchical_messages
               WHERE campaign_id = ?
                 AND (sender_id = ? OR recipient_id = ? ${rolePlaceholders ? `OR target_role IN (${rolePlaceholders})` : ''})
               ORDER BY created_at DESC
               LIMIT 100`;

  const messages = db
    .prepare(sql)
    .all(campaign.id, actor.id, actor.id, ...Array.from(actorRoles)) as Array<{
    id: string;
    campaign_id: string;
    sender_id: string;
    sender_role: string;
    target_role: string;
    recipient_id: string | null;
    urgency: string;
    title: string;
    message: string;
    context_payload: string;
    read_by_recipient: number;
    read_at: string | null;
    created_at: string;
  }>;

  res.json({
    campaignId: campaign.id,
    unread: messages.filter((message) => !message.read_by_recipient).length,
    messages: messages.map((message) => ({
      ...message,
      context: (() => {
        try {
          return JSON.parse(message.context_payload || '{}');
        } catch {
          return {};
        }
      })(),
    })),
  });
}));

campaignOsRouter.post('/notifications', asyncHandler(async (req, res) => {
  const actor = getActor(req as AuthRequest);

  const payload = req.body as {
    campaignId?: string;
    targetRole?: AccessRole;
    recipientId?: string | null;
    urgency?: string;
    title?: string;
    message?: string;
    context?: Record<string, unknown>;
  };

  if (!payload.campaignId || !payload.targetRole || !payload.title || !payload.message) {
    throw createAppError('Campos obrigatorios: campaignId, targetRole, title, message', 400);
  }

  const campaign = resolveCampaign(actor, payload.campaignId);

  if (!canSendHierarchicalMessage(actor, payload.targetRole)) {
    throw createAppError('Quebra de cadeia de comando: voce nao pode enviar aviso para este cargo', 403);
  }

  if (payload.recipientId) {
    const recipient = db.prepare('SELECT id FROM volunteers WHERE id = ?').get(payload.recipientId) as { id: string } | undefined;
    if (!recipient) throw createAppError('Destinatario nao encontrado', 404);
  }

  const actorRole = getPrimaryRole(actor);
  const id = `hmsg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  db.prepare(
    `INSERT INTO campaign_hierarchical_messages (
      id, campaign_id, sender_id, sender_role, target_role, recipient_id, urgency, title, message, context_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    campaign.id,
    actor.id,
    actorRole,
    payload.targetRole,
    payload.recipientId ?? null,
    (payload.urgency || 'NORMAL').toUpperCase(),
    payload.title.trim(),
    payload.message.trim(),
    JSON.stringify(payload.context ?? {}),
  );

  if (payload.recipientId) {
    db.prepare(
      `INSERT INTO system_notifications (id, recipient_id, type, title, message, action_link, extra_data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      payload.recipientId,
      'ALERTA_HIERARQUICO',
      payload.title.trim(),
      payload.message.trim(),
      `/coordinator/campaign/${campaign.id}`,
      JSON.stringify({ campaignId: campaign.id, messageId: id, senderRole: actorRole, targetRole: payload.targetRole }),
    );
  }

  res.status(201).json({ success: true, id, campaignId: campaign.id });
}));

campaignOsRouter.patch('/notifications/:id/read', asyncHandler(async (req, res) => {
  const actor = getActor(req as AuthRequest);

  const message = db
    .prepare(
      `SELECT id, campaign_id, recipient_id, target_role, read_by_recipient
       FROM campaign_hierarchical_messages
       WHERE id = ?`,
    )
    .get(req.params.id) as { id: string; campaign_id: string; recipient_id: string | null; target_role: string; read_by_recipient: number } | undefined;

  if (!message) throw createAppError('Mensagem nao encontrada', 404);

  resolveCampaign(actor, message.campaign_id);

  const actorRoles = getActorRoles(actor);
  const canRead = message.recipient_id === actor.id || actorRoles.has(message.target_role);
  if (!canRead) throw createAppError('Sem permissao para confirmar leitura desta mensagem', 403);

  if (!message.read_by_recipient) {
    db.prepare('UPDATE campaign_hierarchical_messages SET read_by_recipient = 1, read_at = ? WHERE id = ?')
      .run(new Date().toISOString(), message.id);
  }

  res.json({ success: true, id: message.id });
}));

