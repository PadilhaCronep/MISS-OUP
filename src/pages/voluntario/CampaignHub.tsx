import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Rocket, Target, Users, Sparkles } from 'lucide-react';
import { apiClient } from '../../lib/api-client.ts';
import { ErrorState } from '../../components/ui/ErrorState.tsx';

interface CampaignMemberSector {
  role: string;
  sector_name: string;
  sector_slug: string;
}

interface VolunteerCampaign {
  id: string;
  name: string;
  candidate_name: string;
  office: string;
  joined_at: string;
  membros_total: number;
  tarefas_total: number;
  tarefas_concluidas: number;
  minhas_tarefas_abertas: number;
  progresso: number;
  setores_usuario: CampaignMemberSector[];
}

export const CampaignHub: React.FC = () => {
  const [campaigns, setCampaigns] = useState<VolunteerCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const result = await apiClient.get<VolunteerCampaign[]>('/api/voluntario/campanhas');
      if (cancelled) return;

      if (result.error || !result.data) {
        setError(result.error ?? 'Erro ao carregar campanhas do voluntario');
        setLoading(false);
        return;
      }

      setCampaigns(result.data);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    return campaigns.reduce(
      (acc, campaign) => {
        acc.total += 1;
        acc.minhasAbertas += Number(campaign.minhas_tarefas_abertas ?? 0);
        acc.tarefas += Number(campaign.tarefas_total ?? 0);
        acc.concluidas += Number(campaign.tarefas_concluidas ?? 0);
        return acc;
      },
      { total: 0, minhasAbertas: 0, tarefas: 0, concluidas: 0 },
    );
  }, [campaigns]);

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center text-zinc-500">Carregando campanhas...</div>;
  }

  if (error) {
    return <ErrorState mensagem={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 px-5 py-6 text-white md:px-8 md:py-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Hub de colaboracao</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Minhas Campanhas</h1>
            <p className="mt-2 text-sm text-zinc-300 md:text-base">
              Gestao de campanhas em que voce participa com foco em tarefas, setores e entregas coletivas.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200">
            <Sparkles className="h-3.5 w-3.5 text-[#F5C400]" />
            Experiencia otimizada para mobile
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <article className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Campanhas</p>
          <p className="mt-1 text-2xl font-black text-zinc-900">{summary.total}</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Minhas abertas</p>
          <p className="mt-1 text-2xl font-black text-zinc-900">{summary.minhasAbertas}</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Tarefas rede</p>
          <p className="mt-1 text-2xl font-black text-zinc-900">{summary.tarefas}</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Concluidas</p>
          <p className="mt-1 text-2xl font-black text-emerald-600">{summary.concluidas}</p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {campaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-zinc-500 sm:col-span-2 xl:col-span-3">
            Voce ainda nao esta vinculado a nenhuma campanha.
          </div>
        ) : (
          campaigns.map((campaign) => (
            <article key={campaign.id} className="group rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
                <Rocket className="h-6 w-6 text-zinc-600" />
              </div>

              <h2 className="text-xl font-black text-zinc-900">{campaign.name}</h2>
              <p className="text-sm text-zinc-500">{campaign.candidate_name}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-400">
                {String(campaign.office || '').replaceAll('_', ' ')}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                  <p className="text-[10px] uppercase text-zinc-500">Membros</p>
                  <p className="inline-flex items-center gap-1 font-bold text-zinc-900">
                    <Users className="h-3.5 w-3.5" />
                    {campaign.membros_total}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                  <p className="text-[10px] uppercase text-zinc-500">Minhas abertas</p>
                  <p className="inline-flex items-center gap-1 font-bold text-zinc-900">
                    <Target className="h-3.5 w-3.5" />
                    {campaign.minhas_tarefas_abertas}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-1 text-[11px] text-zinc-500">Progresso da campanha: {campaign.progresso}%</p>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full bg-[#F5C400]" style={{ width: `${campaign.progresso}%` }} />
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-1 text-xs text-zinc-500">
                <CalendarDays className="h-3.5 w-3.5" />
                Vinculo desde {new Date(campaign.joined_at).toLocaleDateString('pt-BR')}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {campaign.setores_usuario.slice(0, 3).map((sector) => (
                  <span key={`${campaign.id}-${sector.sector_slug}`} className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] text-zinc-700">
                    {sector.sector_name}
                  </span>
                ))}
              </div>

              <Link
                to={`/campaign/${campaign.id}`}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
              >
                Abrir painel da campanha
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </article>
          ))
        )}
      </section>
    </div>
  );
};
