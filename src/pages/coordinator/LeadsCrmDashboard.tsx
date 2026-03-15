import React, { useEffect, useMemo, useState } from 'react';
import { Globe2, Layers2, MessagesSquare, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { apiClient } from '../../lib/api-client.ts';

interface LeadsResponse {
  campaign: { id: string; name: string; candidateName: string };
  periodDays: number;
  summary: {
    totalLeads: number;
    supporterOrAbove: number;
    volunteerOrAbove: number;
    avgEngagementLevel: number;
    conversionSupporterRate: number;
    conversionVolunteerRate: number;
  };
  funnel: Array<{ stage: string; count: number }>;
  channels: Array<{ channel: string; count: number }>;
  territoryDistribution: Array<{ territory: string; count: number }>;
  topTags: Array<{ tag: string; count: number }>;
  whatsappGroups: Array<{
    id: string;
    name: string;
    admins: string[];
    members_count: number;
    activity_score: number;
    territory_ref: string | null;
    retention_rate: number;
    status: string;
    last_activity_at: string | null;
  }>;
}

const stageLabel = (value: string): string => value.replaceAll('_', ' ');

export const LeadsCrmDashboard: React.FC = () => {
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [periodDays, setPeriodDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const result = await apiClient.get<LeadsResponse>(`/api/campaign-os/leads?periodDays=${periodDays}`);
      if (cancelled) return;

      if (result.error || !result.data) {
        setError(result.error ?? 'Falha ao carregar CRM politico.');
        setData(null);
        setLoading(false);
        return;
      }

      setData(result.data);
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [periodDays]);

  const cards = useMemo(() => {
    if (!data) return [];

    return [
      { label: 'Total de leads', value: data.summary.totalLeads, icon: Users },
      { label: 'Apoiador ou acima', value: data.summary.supporterOrAbove, icon: Layers2 },
      { label: 'Voluntario ou acima', value: data.summary.volunteerOrAbove, icon: Globe2 },
      { label: 'Conversao para apoiador', value: `${data.summary.conversionSupporterRate}%`, icon: MessagesSquare },
    ];
  }, [data]);

  const funnel = useMemo(() => {
    if (!data || data.funnel.length === 0) return [];

    const topCount = Math.max(...data.funnel.map((stage) => stage.count), 1);

    return data.funnel.map((stage, index, source) => {
      const previousCount = index === 0 ? source[0].count : source[index - 1].count;
      const stepConversionPct = index === 0
        ? 100
        : previousCount > 0
          ? Number(((stage.count / previousCount) * 100).toFixed(2))
          : 0;

      return {
        ...stage,
        label: stageLabel(stage.stage),
        shareOfTopPct: Number(((stage.count / topCount) * 100).toFixed(2)),
        stepConversionPct,
        dropPct: index === 0 ? 0 : Number((100 - stepConversionPct).toFixed(2)),
      };
    });
  }, [data]);

  const overallFunnelConversionPct = useMemo(() => {
    if (!funnel.length) return 0;
    const first = funnel[0].count;
    const last = funnel[funnel.length - 1].count;
    return first > 0 ? Number(((last / first) * 100).toFixed(2)) : 0;
  }, [funnel]);

  const channels = useMemo(() => {
    if (!data || data.channels.length === 0) return [];
    const maxCount = Math.max(...data.channels.map((channel) => channel.count), 1);
    return data.channels.map((channel) => ({
      ...channel,
      barPct: Number(((channel.count / maxCount) * 100).toFixed(2)),
    }));
  }, [data]);

  const territoryRows = useMemo(() => {
    if (!data || data.territoryDistribution.length === 0) return [];
    const maxCount = Math.max(...data.territoryDistribution.map((territory) => territory.count), 1);
    return data.territoryDistribution.map((territory) => ({
      ...territory,
      barPct: Number(((territory.count / maxCount) * 100).toFixed(2)),
    }));
  }, [data]);

  if (loading) {
    return <div className="flex h-[45vh] items-center justify-center text-zinc-500">Carregando CRM politico...</div>;
  }

  if (error || !data) {
    return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error ?? 'Sem dados de CRM.'}</div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="rounded-3xl border border-zinc-800 bg-[#111111] p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">CRM politico</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Leads e Conversao</h1>
            <p className="mt-1 text-sm text-zinc-400">{data.campaign.name} | {data.campaign.candidateName}</p>
          </div>
          <div className="flex items-center gap-2">
            {[7, 30, 60].map((period) => (
              <button
                key={period}
                onClick={() => setPeriodDays(period)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                  period === periodDays
                    ? 'border-[#F5C400] bg-[#F5C400] text-black'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white'
                }`}
              >
                {period} dias
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
            <div className="mb-3 flex items-center justify-between">
              <card.icon className="h-5 w-5 text-[#F5C400]" />
            </div>
            <p className="text-2xl font-black text-white">{card.value}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{card.label}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Funil politico visual</h2>
            <div className="rounded-full border border-[#F5C400]/40 bg-[#F5C400]/10 px-3 py-1 text-[11px] font-semibold text-[#F5C400]">
              Conversao total: {overallFunnelConversionPct}%
            </div>
          </div>

          <div className="space-y-3">
            {funnel.map((stage, index) => (
              <div key={stage.stage} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-zinc-400">Etapa {index + 1}</p>
                    <p className="mt-1 text-sm text-zinc-200">{stage.label}</p>
                  </div>
                  <p className="text-lg font-black text-white">{stage.count}</p>
                </div>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#F5C400] to-amber-300"
                    style={{ width: `${Math.max(stage.shareOfTopPct, 4)}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <p className="text-zinc-500">Participacao no topo: {stage.shareOfTopPct}%</p>
                  {index === 0 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <TrendingUp className="h-3.5 w-3.5" /> Base do funil
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-400">
                      <TrendingDown className="h-3.5 w-3.5" /> Queda: {stage.dropPct}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Origem dos leads</h2>
          <div className="mt-3 space-y-2">
            {channels.map((channel) => (
              <div key={channel.channel} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
                <div className="flex items-center justify-between text-sm">
                  <p className="text-zinc-300">{channel.channel}</p>
                  <p className="font-semibold text-white">{channel.count}</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-[#F5C400]" style={{ width: `${Math.max(channel.barPct, 6)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Distribuicao territorial</h2>
          <div className="mt-3 space-y-2">
            {territoryRows.map((row) => (
              <div key={row.territory} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
                <div className="flex items-center justify-between text-sm">
                  <p className="text-zinc-300">{row.territory}</p>
                  <p className="font-semibold text-white">{row.count}</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(row.barPct, 6)}%` }} />
                </div>
              </div>
            ))}
          </div>

          {data.topTags.length > 0 ? (
            <div className="mt-4 border-t border-zinc-800 pt-4">
              <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-zinc-500">Tags mais frequentes</p>
              <div className="flex flex-wrap gap-2">
                {data.topTags.map((tag) => (
                  <span key={tag.tag} className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300">
                    #{tag.tag} ({tag.count})
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Grupos de WhatsApp</h2>
          <div className="mt-3 space-y-2">
            {data.whatsappGroups.map((group) => (
              <div key={group.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{group.name}</p>
                  <p className="text-xs text-zinc-400">{group.members_count} membros</p>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Status: {group.status} | Retencao: {group.retention_rate.toFixed(1)}% | Atividade: {group.activity_score.toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
};
