import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BellRing, CalendarClock, CheckCircle2, Gauge, Layers, Timer } from 'lucide-react';
import { apiClient } from '../../lib/api-client.ts';

interface CommandResponse {
  campaign: {
    id: string;
    name: string;
    candidateName: string;
    office: string;
  };
  periodDays: number;
  generatedAt: string;
  executive: {
    healthScore: number;
    executionRate: number;
    totalOpen: number;
    totalLate: number;
    leadHealth: number;
    socialHealth: number;
    candidatePending: number;
  };
  areaHealth: Array<{ area: string; score: number }>;
  bottlenecks: Array<{
    id: string;
    name: string;
    slug: string;
    total_tasks: number;
    done_tasks: number;
    open_tasks: number;
    late_tasks: number;
  }>;
  criticalAlerts: Array<{
    id: string;
    severity?: string;
    title: string;
    description?: string;
    event_at?: string;
  }>;
  timeline: Array<{
    id: string;
    event_type: string;
    severity: string;
    source_area: string | null;
    title: string;
    description: string | null;
    status: string;
    event_at: string;
  }>;
}

function scoreClass(score: number): string {
  if (score >= 75) return 'text-emerald-300';
  if (score >= 50) return 'text-yellow-300';
  return 'text-red-300';
}

export const CampaignCommandCenter: React.FC = () => {
  const [data, setData] = useState<CommandResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState(14);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const result = await apiClient.get<CommandResponse>(`/api/campaign-os/command?periodDays=${periodDays}`);
      if (cancelled) return;

      if (result.error || !result.data) {
        setError(result.error ?? 'Falha ao carregar painel executivo.');
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

  const kpis = useMemo(() => {
    if (!data) return [];

    return [
      { label: 'Saude geral', value: `${data.executive.healthScore}%`, icon: Gauge, tone: scoreClass(data.executive.healthScore) },
      { label: 'Execucao', value: `${data.executive.executionRate}%`, icon: CheckCircle2, tone: scoreClass(data.executive.executionRate) },
      { label: 'Pendencias abertas', value: data.executive.totalOpen, icon: Layers, tone: 'text-zinc-100' },
      { label: 'Atrasos criticos', value: data.executive.totalLate, icon: Timer, tone: data.executive.totalLate > 0 ? 'text-red-300' : 'text-emerald-300' },
      { label: 'Leads qualificados', value: `${data.executive.leadHealth}%`, icon: BellRing, tone: scoreClass(data.executive.leadHealth) },
      { label: 'Fila do candidato', value: data.executive.candidatePending, icon: CalendarClock, tone: data.executive.candidatePending > 2 ? 'text-yellow-300' : 'text-zinc-100' },
    ];
  }, [data]);

  if (loading) {
    return <div className="h-[45vh] flex items-center justify-center text-zinc-500">Carregando painel executivo...</div>;
  }

  if (error || !data) {
    return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error ?? 'Sem dados para o painel executivo.'}</div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="rounded-3xl border border-zinc-800 bg-[#111111] p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Campaign Operating System</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Painel Executivo</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {data.campaign.name} | Candidata: <span className="text-[#F5C400]">{data.campaign.candidateName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {[7, 14, 30].map((period) => (
              <button
                key={period}
                onClick={() => setPeriodDays(period)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                  periodDays === period
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
        {kpis.map((kpi) => (
          <article key={kpi.label} className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
            <div className="mb-3 flex items-center justify-between">
              <kpi.icon className={`h-5 w-5 ${kpi.tone}`} />
              <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">KPI</span>
            </div>
            <p className={`text-2xl font-black ${kpi.tone}`}>{kpi.value}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{kpi.label}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 xl:col-span-1">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Areas e gargalos</h2>
          <div className="mt-4 space-y-3">
            {data.bottlenecks.map((sector) => (
              <div key={sector.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{sector.name}</p>
                  <span className="text-[11px] text-zinc-400">{sector.done_tasks}/{sector.total_tasks}</span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">Abertas: {sector.open_tasks} | Atrasadas: {sector.late_tasks}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 xl:col-span-1">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Alertas criticos</h2>
          <div className="mt-4 space-y-3">
            {data.criticalAlerts.length === 0 ? (
              <p className="text-sm text-zinc-500">Sem alertas criticos no periodo.</p>
            ) : (
              data.criticalAlerts.slice(0, 8).map((alert) => (
                <div key={alert.id} className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-red-300" />
                    <div>
                      <p className="text-sm font-semibold text-red-200">{alert.title}</p>
                      <p className="text-[11px] text-red-100/80">{alert.description ?? 'Sem descricao adicional.'}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 xl:col-span-1">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Timeline estrategica</h2>
          <div className="mt-4 space-y-3">
            {data.timeline.map((event) => (
              <div key={event.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <p className="text-sm font-semibold text-white">{event.title}</p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  {event.source_area ?? 'Operacao'} | {new Date(event.event_at).toLocaleString('pt-BR')}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">{event.description ?? 'Sem detalhes.'}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
};
