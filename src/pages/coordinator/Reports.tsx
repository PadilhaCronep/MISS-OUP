import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api-client.ts';

interface ReportsResponse {
  campaign: { id: string; name: string; candidateName: string };
  report: {
    level: string;
    periodDays: number;
    generatedAt: string;
    kpis: {
      tasks: { total: number; done: number; in_review: number; in_progress: number; pending: number; late: number };
      leads: { total: number; converted: number; conversionRate: number };
      social: { impressions: number; reach: number; engagements: number; spend: number; leads: number };
    };
    breakdown: {
      sectors: Array<{ name: string; total: number; done: number; open: number }>;
      territories: Array<{ city: string | null; state: string | null; total: number }>;
    };
    perspective: Record<string, unknown>;
  };
}

const LEVELS = [
  { id: 'executivo', label: 'Executivo' },
  { id: 'chefia', label: 'Por chefia' },
  { id: 'equipe', label: 'Por equipe' },
  { id: 'candidato', label: 'Candidato' },
  { id: 'territorial', label: 'Territorial' },
  { id: 'militancia', label: 'Militancia' },
  { id: 'individual_voluntario', label: 'Individual' },
] as const;

export const Reports: React.FC = () => {
  const [level, setLevel] = useState<(typeof LEVELS)[number]['id']>('executivo');
  const [periodDays, setPeriodDays] = useState(7);
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const result = await apiClient.get<ReportsResponse>(`/api/campaign-os/reports?level=${level}&periodDays=${periodDays}`);
      if (cancelled) return;

      if (result.error || !result.data) {
        setError(result.error ?? 'Falha ao carregar relatorios multinivel.');
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
  }, [level, periodDays]);

  if (loading) {
    return <div className="h-[45vh] flex items-center justify-center text-zinc-500">Carregando relatorios...</div>;
  }

  if (error || !data) {
    return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error ?? 'Sem dados de relatorio.'}</div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="rounded-3xl border border-zinc-800 bg-[#111111] p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Relatorios multinivel</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Relatorios Operacionais</h1>
            <p className="mt-1 text-sm text-zinc-400">{data.campaign.name} | {data.campaign.candidateName}</p>
          </div>

          <div className="flex items-center gap-2">
            {[7, 30, 90].map((period) => (
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

      <section className="flex flex-wrap gap-2">
        {LEVELS.map((option) => (
          <button
            key={option.id}
            onClick={() => setLevel(option.id)}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
              level === option.id
                ? 'border-[#F5C400] bg-[#F5C400] text-black'
                : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: 'Tarefas totais', value: data.report.kpis.tasks.total },
          { label: 'Concluidas', value: data.report.kpis.tasks.done },
          { label: 'Atrasadas', value: data.report.kpis.tasks.late },
          { label: 'Leads', value: data.report.kpis.leads.total },
          { label: 'Conversao', value: `${data.report.kpis.leads.conversionRate}%` },
          { label: 'Alcance', value: data.report.kpis.social.reach.toLocaleString('pt-BR') },
        ].map((card) => (
          <article key={card.label} className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
            <p className="text-2xl font-black text-white">{card.value}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{card.label}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Quebra por area</h2>
          <div className="mt-3 space-y-2">
            {data.report.breakdown.sectors.map((sector) => (
              <div key={sector.name} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 flex items-center justify-between">
                <p className="text-sm text-zinc-300">{sector.name}</p>
                <p className="text-sm font-semibold text-white">{sector.done}/{sector.total}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Quebra territorial</h2>
          <div className="mt-3 space-y-2">
            {data.report.breakdown.territories.map((row) => (
              <div key={`${row.city}-${row.state}`} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 flex items-center justify-between">
                <p className="text-sm text-zinc-300">{row.city ?? 'Nao informado'}/{row.state ?? '-'}</p>
                <p className="text-sm font-semibold text-white">{row.total}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Leitura por nivel</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-300">
{JSON.stringify(data.report.perspective, null, 2)}
        </pre>
      </section>
    </div>
  );
};
