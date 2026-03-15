import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock3, LineChart, Megaphone, MousePointerClick, Target, Users, Wallet } from 'lucide-react';
import { apiClient } from '../../lib/api-client.ts';

interface NetworkResponse {
  campaign: { id: string; name: string; candidateName: string };
  periodDays: number;
  organic: {
    impressions: number;
    reach: number;
    engagements: number;
    comments: number;
    shares: number;
    saves: number;
    followersGrowth: number;
  };
  paid: {
    impressions: number;
    reach: number;
    spend: number;
    clicks: number;
    leads: number;
    conversions: number;
    cpc: number;
    cpm: number;
    cpl: number;
    ctr: number;
    costPerSupporter: number;
    costPerVolunteer: number;
  };
  paidTraffic: {
    budget: {
      monthlyBudget: number;
      budgetWindow: number;
      spend: number;
      remainingWindowBudget: number;
      pacingPct: number;
      projectedMonthSpend: number;
      projectedMonthLeads: number;
    };
    efficiency: {
      cpc: number;
      cpm: number;
      cpl: number;
      ctr: number;
      conversionRate: number;
      costPerSupporter: number;
      costPerVolunteer: number;
    };
    platformBreakdown: Array<{
      platform: string;
      spend: number;
      impressions: number;
      clicks: number;
      leads: number;
      conversions: number;
      ctr: number;
      cpl: number;
    }>;
    hourlyDistribution: Array<{
      hourSlot: number;
      spend: number;
      impressions: number;
      clicks: number;
      leads: number;
      conversions: number;
    }>;
    demographicDistribution: Array<{
      group: string;
      spend: number;
      shareSpendPct: number;
      impressions: number;
      clicks: number;
      leads: number;
      conversions: number;
    }>;
  };
  variation: {
    organic: { impressionsPct: number; reachPct: number; engagementsPct: number };
    paid: { spendPct: number; clicksPct: number; leadsPct: number };
  };
  ranking: Array<{
    rank: number;
    platform: string;
    format: string;
    mediaType: string;
    impressions: number;
    reach: number;
    engagements: number;
    clicks: number;
    leads: number;
    cpl: number;
    aiScore: number;
  }>;
}

const formatCurrency = (value: number): string =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const NetworksIntelligence: React.FC = () => {
  const [data, setData] = useState<NetworkResponse | null>(null);
  const [periodDays, setPeriodDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const result = await apiClient.get<NetworkResponse>(`/api/campaign-os/networks?periodDays=${periodDays}`);
      if (cancelled) return;

      if (result.error || !result.data) {
        setError(result.error ?? 'Falha ao carregar inteligencia de redes.');
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

  const metrics = useMemo(() => {
    if (!data) return [];

    return [
      { label: 'Alcance organico', value: data.organic.reach.toLocaleString('pt-BR'), icon: LineChart },
      { label: 'Engajamento organico', value: data.organic.engagements.toLocaleString('pt-BR'), icon: BarChart3 },
      { label: 'Investimento pago', value: formatCurrency(data.paid.spend), icon: Megaphone },
      { label: 'Cliques pagos', value: data.paid.clicks.toLocaleString('pt-BR'), icon: MousePointerClick },
      { label: 'CTR', value: `${data.paid.ctr.toFixed(2)}%`, icon: BarChart3 },
      { label: 'CPL', value: formatCurrency(data.paid.cpl), icon: LineChart },
    ];
  }, [data]);

  const hourlyDistribution = useMemo(() => {
    if (!data) return [];

    const maxSpend = Math.max(...data.paidTraffic.hourlyDistribution.map((entry) => entry.spend), 1);

    return data.paidTraffic.hourlyDistribution
      .filter((entry) => entry.hourSlot >= 0)
      .sort((a, b) => a.hourSlot - b.hourSlot)
      .map((entry) => ({
        ...entry,
        barPct: Number(((entry.spend / maxSpend) * 100).toFixed(2)),
      }));
  }, [data]);

  if (loading) {
    return <div className="flex h-[45vh] items-center justify-center text-zinc-500">Carregando painel de redes...</div>;
  }

  if (error || !data) {
    return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error ?? 'Sem dados de redes.'}</div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="rounded-3xl border border-zinc-800 bg-[#111111] p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Data Layer {'>'} Post Layer</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Inteligencia de Redes</h1>
            <p className="mt-1 text-sm text-zinc-400">{data.campaign.name} | {data.campaign.candidateName}</p>
          </div>
          <div className="flex items-center gap-2">
            {[7, 14, 30].map((period) => (
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
            <div className="mb-3 flex items-center justify-between">
              <metric.icon className="h-5 w-5 text-[#F5C400]" />
            </div>
            <p className="text-2xl font-black text-white">{metric.value}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{metric.label}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Organico</h2>
          <div className="mt-3 grid gap-2 text-sm text-zinc-300">
            <p>Impressoes: {data.organic.impressions.toLocaleString('pt-BR')}</p>
            <p>Alcance: {data.organic.reach.toLocaleString('pt-BR')}</p>
            <p>Comentarios: {data.organic.comments.toLocaleString('pt-BR')}</p>
            <p>Compartilhamentos: {data.organic.shares.toLocaleString('pt-BR')}</p>
            <p>Salvamentos: {data.organic.saves.toLocaleString('pt-BR')}</p>
            <p>Variacao de alcance: {data.variation.organic.reachPct.toFixed(2)}%</p>
          </div>
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Pago</h2>
          <div className="mt-3 grid gap-2 text-sm text-zinc-300">
            <p>Impressoes: {data.paid.impressions.toLocaleString('pt-BR')}</p>
            <p>Leads: {data.paid.leads.toLocaleString('pt-BR')}</p>
            <p>Conversoes: {data.paid.conversions.toLocaleString('pt-BR')}</p>
            <p>CPC: {formatCurrency(data.paid.cpc)}</p>
            <p>CPM: {formatCurrency(data.paid.cpm)}</p>
            <p>Variacao de leads: {data.variation.paid.leadsPct.toFixed(2)}%</p>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 md:p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Submodulo dedicado</p>
            <h2 className="text-xl font-black tracking-tight text-white">Trafego pago em campanha</h2>
          </div>
          <div className="rounded-lg border border-[#F5C400]/30 bg-[#F5C400]/10 px-3 py-2 text-xs font-semibold text-[#F5C400]">
            Pacing: {data.paidTraffic.budget.pacingPct.toFixed(2)}%
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-zinc-500"><Wallet className="h-3.5 w-3.5" /> Orcamento janela</p>
            <p className="mt-1 text-xl font-black text-white">{formatCurrency(data.paidTraffic.budget.budgetWindow)}</p>
            <p className="text-[11px] text-zinc-500">Mensal: {formatCurrency(data.paidTraffic.budget.monthlyBudget)}</p>
          </article>

          <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-zinc-500"><Megaphone className="h-3.5 w-3.5" /> Investido</p>
            <p className="mt-1 text-xl font-black text-white">{formatCurrency(data.paidTraffic.budget.spend)}</p>
            <p className="text-[11px] text-zinc-500">Restante: {formatCurrency(data.paidTraffic.budget.remainingWindowBudget)}</p>
          </article>

          <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-zinc-500"><Target className="h-3.5 w-3.5" /> Projecao mensal</p>
            <p className="mt-1 text-xl font-black text-white">{formatCurrency(data.paidTraffic.budget.projectedMonthSpend)}</p>
            <p className="text-[11px] text-zinc-500">Leads projetados: {data.paidTraffic.budget.projectedMonthLeads}</p>
          </article>

          <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-zinc-500"><Users className="h-3.5 w-3.5" /> Efetividade</p>
            <p className="mt-1 text-xl font-black text-white">{data.paidTraffic.efficiency.conversionRate.toFixed(2)}%</p>
            <p className="text-[11px] text-zinc-500">CTR: {data.paidTraffic.efficiency.ctr.toFixed(2)}%</p>
          </article>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">Performance por plataforma paga</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-zinc-500">
                  <tr>
                    <th className="py-2 pr-3">Plataforma</th>
                    <th className="py-2 pr-3">Invest.</th>
                    <th className="py-2 pr-3">Leads</th>
                    <th className="py-2 pr-3">CTR</th>
                    <th className="py-2 pr-3">CPL</th>
                  </tr>
                </thead>
                <tbody>
                  {data.paidTraffic.platformBreakdown.map((entry) => (
                    <tr key={entry.platform} className="border-t border-zinc-800 text-zinc-200">
                      <td className="py-2 pr-3">{entry.platform}</td>
                      <td className="py-2 pr-3">{formatCurrency(entry.spend)}</td>
                      <td className="py-2 pr-3">{entry.leads}</td>
                      <td className="py-2 pr-3">{entry.ctr.toFixed(2)}%</td>
                      <td className="py-2 pr-3">{formatCurrency(entry.cpl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">Horario x investimento</h3>
            <div className="mt-3 space-y-2">
              {hourlyDistribution.map((entry) => (
                <div key={entry.hourSlot} className="rounded-lg border border-zinc-800 bg-zinc-900 p-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-300">
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {entry.hourSlot.toString().padStart(2, '0')}:00</span>
                    <span>{formatCurrency(entry.spend)}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-[#F5C400]" style={{ width: `${Math.max(entry.barPct, 4)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">Demografia da verba paga</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {data.paidTraffic.demographicDistribution.map((entry) => (
              <div key={entry.group} className="rounded-lg border border-zinc-800 bg-zinc-900 p-2.5">
                <p className="text-xs text-zinc-400">{entry.group}</p>
                <p className="mt-1 text-base font-black text-white">{entry.shareSpendPct.toFixed(1)}%</p>
                <p className="text-[11px] text-zinc-500">{formatCurrency(entry.spend)} | {entry.leads} leads</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-2 border-t border-zinc-800 pt-3 text-xs text-zinc-300 sm:grid-cols-2 xl:grid-cols-5">
            <p>CPC: {formatCurrency(data.paidTraffic.efficiency.cpc)}</p>
            <p>CPM: {formatCurrency(data.paidTraffic.efficiency.cpm)}</p>
            <p>CPL: {formatCurrency(data.paidTraffic.efficiency.cpl)}</p>
            <p>Custo por apoiador: {formatCurrency(data.paidTraffic.efficiency.costPerSupporter)}</p>
            <p>Custo por voluntario: {formatCurrency(data.paidTraffic.efficiency.costPerVolunteer)}</p>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Ranking de posts/criativos</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Canal</th>
                <th className="py-2 pr-3">Formato</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Engaj.</th>
                <th className="py-2 pr-3">Leads</th>
                <th className="py-2 pr-3">CPL</th>
                <th className="py-2 pr-3">AI Score</th>
              </tr>
            </thead>
            <tbody>
              {data.ranking.map((item) => (
                <tr key={`${item.platform}-${item.format}-${item.rank}`} className="border-t border-zinc-800 text-zinc-200">
                  <td className="py-2 pr-3">{item.rank}</td>
                  <td className="py-2 pr-3">{item.platform}</td>
                  <td className="py-2 pr-3">{item.format}</td>
                  <td className="py-2 pr-3">{item.mediaType}</td>
                  <td className="py-2 pr-3">{item.engagements}</td>
                  <td className="py-2 pr-3">{item.leads}</td>
                  <td className="py-2 pr-3">{formatCurrency(item.cpl)}</td>
                  <td className="py-2 pr-3 font-semibold text-[#F5C400]">{item.aiScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
