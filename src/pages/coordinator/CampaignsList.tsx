import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Plus, Rocket, Search, Target, Users } from 'lucide-react';
import { apiClient } from '../../lib/api-client.ts';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader.tsx';
import { ErrorState } from '../../components/ui/ErrorState.tsx';
import { useDebounce } from '../../hooks/useDebounce.ts';

interface CampaignCardData {
  id: string;
  name: string;
  candidate_name: string;
  office: string;
  created_at: string;
  setores_total: number;
  membros_total: number;
  tarefas_total: number;
  tarefas_concluidas: number;
}

export const CampaignsList: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const searchDebounced = useDebounce(search, 250);

  const loadCampaigns = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    const result = await apiClient.get<CampaignCardData[]>('/api/coordenador/campanhas');
    if (result.error || !result.data) {
      setError(result.error ?? 'Erro ao carregar campanhas.');
      setLoading(false);
      return;
    }

    setCampaigns(result.data);
    setLoading(false);
  };

  useEffect(() => {
    void loadCampaigns();
  }, []);

  const filtered = useMemo(() => {
    const term = searchDebounced.trim().toLowerCase();
    if (!term) return campaigns;

    return campaigns.filter((campaign) =>
      [campaign.name, campaign.candidate_name, campaign.office]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [campaigns, searchDebounced]);

  const resumo = useMemo(() => {
    return filtered.reduce(
      (acc, campaign) => {
        acc.membros += Number(campaign.membros_total ?? 0);
        acc.tarefas += Number(campaign.tarefas_total ?? 0);
        acc.concluidas += Number(campaign.tarefas_concluidas ?? 0);
        return acc;
      },
      { membros: 0, tarefas: 0, concluidas: 0 },
    );
  }, [filtered]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="kpi" count={1} />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonLoader variant="card" count={6} />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState mensagem={error} onRetry={() => void loadCampaigns()} />;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Campanhas</h1>
          <p className="text-zinc-400">Workspace de operacao por campanha com acompanhamento de equipe e entregas.</p>
        </div>

        <Link
          to="/coordinator/campaigns/new"
          className="inline-flex items-center gap-2 bg-[#F5C400] text-black px-5 py-3 rounded-xl font-bold hover:bg-[#E5B400] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Campanha
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-[#111111] p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-400">Campanhas Ativas</p>
          <p className="mt-2 text-2xl font-black text-white">{filtered.length}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-[#111111] p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-400">Membros no Ecossistema</p>
          <p className="mt-2 text-2xl font-black text-white">{resumo.membros}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-[#111111] p-4">
          <p className="text-xs uppercase tracking-wider text-zinc-400">Tarefas Concluidas</p>
          <p className="mt-2 text-2xl font-black text-white">{resumo.concluidas} / {resumo.tarefas}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#111111] p-4">
        <label htmlFor="campaign-search" className="text-xs uppercase tracking-wider text-zinc-500">
          Buscar campanha
        </label>
        <div className="mt-2 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
          <input
            id="campaign-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome da campanha, candidata ou cargo"
            className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-3 py-2.5 text-sm text-white outline-none focus:border-[#F5C400]"
          />
        </div>
      </section>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((campaign) => {
          const totalTasks = Number(campaign.tarefas_total ?? 0);
          const doneTasks = Number(campaign.tarefas_concluidas ?? 0);
          const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

          return (
            <article
              key={campaign.id}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all group"
            >
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#F5C400]/10 transition-colors">
                <Rocket className="w-6 h-6 text-zinc-500 group-hover:text-[#F5C400]" />
              </div>

              <h3 className="text-xl font-bold text-white mb-1">{campaign.name}</h3>
              <p className="text-sm text-zinc-400">{campaign.candidate_name}</p>
              <p className="text-xs text-zinc-500 mb-6">{(campaign.office || '').replaceAll('_', ' ')}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-zinc-800/50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">Membros</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="w-3 h-3 text-zinc-400" />
                    <span className="text-sm font-bold text-white">{campaign.membros_total ?? 0}</span>
                  </div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">Tarefas</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Target className="w-3 h-3 text-zinc-400" />
                    <span className="text-sm font-bold text-white">{doneTasks}/{totalTasks}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between text-[11px] text-zinc-400 mb-2">
                  <span>Progresso operacional</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-[#F5C400]" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <Link
                to={`/coordinator/campaign/${campaign.id}`}
                className="w-full bg-zinc-800 text-white py-3 rounded-xl font-bold hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
              >
                Abrir Workspace
                <ChevronRight className="w-4 h-4" />
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
};
