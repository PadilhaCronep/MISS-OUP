import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Brain,
  Flame,
  Gauge,
  Rocket,
  ShieldCheck,
  Target,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { apiClient } from '../lib/api-client.ts';
import { usePageTitle } from '../hooks/usePageTitle.ts';

type LeagueName = 'Bronze' | 'Prata' | 'Ouro' | 'Platina' | 'Diamante';

interface GamificationHubResponse {
  actor: {
    id: string;
    name: string;
    role: string;
    state: string | null;
    city: string | null;
    xp_total: number;
    current_level: number;
    current_streak: number;
    missions_completed: number;
    points_7d: number;
  };
  model: {
    mastery_score: number;
    impact_score: number;
    belonging_score: number;
    momentum_score: number;
    engagement_index: number;
    league: LeagueName;
    league_progress: number;
    next_league: LeagueName | null;
    next_league_target: number | null;
  };
  personal: {
    missions_approved_7d: number;
    tasks_completed_7d: number;
    modules_completed_7d: number;
    modules_completed_total: number;
    total_modules_available: number;
    state_rank: number | null;
    state_peers_total: number;
  };
  team: {
    type: 'CAMPANHA' | 'NUCLEO_LOCAL';
    id: string;
    name: string;
    rank: number | null;
    totalTeams: number;
    membersTotal: number;
    activeMembers7d: number;
    score7d: number;
    targetScore7d: number;
    progressPct: number;
  };
  challenges: Array<{
    id: string;
    title: string;
    description: string;
    target: number;
    current: number;
    points: number;
    teamBased: boolean;
    status: 'COMPLETO' | 'EM_ANDAMENTO';
    progressPct: number;
    remaining: number;
  }>;
  rankings: {
    campaigns: Array<{
      campaignId: string;
      name: string;
      candidateName: string;
      office: string;
      rank: number;
      score7d: number;
      targetScore7d: number;
      progressPct: number;
      activeMembers7d: number;
      membersTotal: number;
    }>;
    states: Array<{
      rank: number;
      state: string;
      score: number;
      vitality: number;
    }>;
    statePeers: Array<{
      rank: number;
      id: string;
      name: string;
      xp_total: number;
      current_level: number;
      current_streak: number;
      isSelf: boolean;
    }>;
  };
  nudges: Array<{
    id: string;
    title: string;
    description: string;
    actionLabel: string;
    actionPath: string;
  }>;
  principles: Array<{
    title: string;
    description: string;
  }>;
}

const GUIDE_STORAGE_KEY = 'missao_engajamento_guia_v1';

const leagueClass: Record<LeagueName, string> = {
  Bronze: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  Prata: 'bg-zinc-700/40 text-zinc-200 border-zinc-500/40',
  Ouro: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/40',
  Platina: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/40',
  Diamante: 'bg-indigo-900/40 text-indigo-300 border-indigo-700/40',
};

const clampPct = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export const EngajamentoHub: React.FC = () => {
  usePageTitle('Engajamento e Gamificacao');

  const [data, setData] = useState<GamificationHubResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const result = await apiClient.get<GamificationHubResponse>('/api/gamificacao/hub');
      if (cancelled) return;

      if (result.error || !result.data) {
        setError(result.error ?? 'Falha ao carregar o hub de engajamento');
        setLoading(false);
        return;
      }

      setData(result.data);
      setLoading(false);

      const alreadySeen = window.localStorage.getItem(GUIDE_STORAGE_KEY) === '1';
      if (!alreadySeen) {
        setShowGuide(true);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const challengeCompletionRate = useMemo(() => {
    if (!data || data.challenges.length === 0) return 0;
    const completed = data.challenges.filter((challenge) => challenge.status === 'COMPLETO').length;
    return clampPct((completed / data.challenges.length) * 100);
  }, [data]);

  const dismissGuide = () => {
    window.localStorage.setItem(GUIDE_STORAGE_KEY, '1');
    setShowGuide(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh] text-zinc-500">Carregando hub de engajamento...</div>;
  }

  if (error || !data) {
    return <div className="flex items-center justify-center h-[60vh] text-red-500">{error ?? 'Nao foi possivel carregar o hub.'}</div>;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800 text-white p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-wider text-zinc-400 mb-2">Modelo estrategico de gamificacao</p>
            <h1 className="text-2xl md:text-3xl font-black">Engajamento orientado por comportamento humano</h1>
            <p className="text-zinc-300 mt-3 text-sm md:text-base">
              A pontuacao combina consistencia, impacto real, pertencimento de equipe e progresso de formacao.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${leagueClass[data.model.league]}`}>
                Liga {data.model.league}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold border border-white/20 text-zinc-200">
                Indice de engajamento: {data.model.engagement_index}
              </span>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between text-sm text-zinc-300">
              <span>Progresso da liga atual</span>
              <span>{clampPct(data.model.league_progress)}%</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-700 mt-2 overflow-hidden">
              <div className="h-full bg-[#F5C400]" style={{ width: `${clampPct(data.model.league_progress)}%` }} />
            </div>
            <p className="text-xs text-zinc-400 mt-3">
              {data.model.next_league
                ? `Meta para ${data.model.next_league}: indice ${data.model.next_league_target}`
                : 'Voce esta no topo das ligas atuais.'}
            </p>
            <button
              onClick={() => setShowGuide(true)}
              className="mt-3 w-full rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10"
            >
              Como funciona a gamificacao
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase text-zinc-500">Maestria</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">{data.model.mastery_score}</p>
          <p className="text-xs text-zinc-500 mt-2">Progresso em trilhas e modulos.</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase text-zinc-500">Impacto</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">{data.model.impact_score}</p>
          <p className="text-xs text-zinc-500 mt-2">Entrega em missoes e tarefas.</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase text-zinc-500">Pertencimento</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">{data.model.belonging_score}</p>
          <p className="text-xs text-zinc-500 mt-2">Participacao no desempenho do grupo.</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase text-zinc-500">Momentum</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">{data.model.momentum_score}</p>
          <p className="text-xs text-zinc-500 mt-2">Ritmo semanal e constancia de atividade.</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-zinc-900">Desafios da Semana</h2>
            <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
              Conclusao geral {challengeCompletionRate}%
            </span>
          </div>
          <div className="space-y-3 mt-4">
            {data.challenges.map((challenge) => (
              <div key={challenge.id} className="rounded-2xl border border-zinc-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-900 text-sm">{challenge.title}</p>
                    <p className="text-xs text-zinc-500 mt-1">{challenge.description}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full border ${challenge.status === 'COMPLETO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                    {challenge.status === 'COMPLETO' ? 'Completo' : 'Em andamento'}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                  <span>{challenge.current}/{challenge.target}</span>
                  <span>+{challenge.points} pts</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 mt-2 overflow-hidden">
                  <div className={`h-full ${challenge.teamBased ? 'bg-blue-500' : 'bg-[#F5C400]'}`} style={{ width: `${clampPct(challenge.progressPct)}%` }} />
                </div>
                {challenge.remaining > 0 ? (
                  <p className="text-[11px] text-zinc-500 mt-2">Faltam {challenge.remaining} para concluir.</p>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-lg font-black text-zinc-900">Painel Pessoal e de Equipe</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-200">
              <p className="text-[11px] uppercase text-zinc-500">Pontos 7 dias</p>
              <p className="text-xl font-black text-zinc-900">{data.actor.points_7d}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-200">
              <p className="text-[11px] uppercase text-zinc-500">Streak atual</p>
              <p className="text-xl font-black text-zinc-900">{data.actor.current_streak} dias</p>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-200">
              <p className="text-[11px] uppercase text-zinc-500">Ranking estadual</p>
              <p className="text-xl font-black text-zinc-900">{data.personal.state_rank ? `#${data.personal.state_rank}` : '-'}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-200">
              <p className="text-[11px] uppercase text-zinc-500">Equipe ativa</p>
              <p className="text-xl font-black text-zinc-900">{data.team.activeMembers7d}/{data.team.membersTotal}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase text-zinc-500">Equipe em foco</p>
            <p className="font-black text-zinc-900 text-lg mt-1">{data.team.name}</p>
            <p className="text-xs text-zinc-600 mt-1">
              {data.team.rank ? `Posicao #${data.team.rank} entre ${data.team.totalTeams} equipes` : 'Sem ranking de equipe vinculado ainda'}
            </p>
            <div className="h-2 rounded-full bg-white mt-3 overflow-hidden border border-zinc-200">
              <div className="h-full bg-blue-500" style={{ width: `${clampPct(data.team.progressPct)}%` }} />
            </div>
            <p className="text-[11px] text-zinc-500 mt-2">{data.team.score7d}/{data.team.targetScore7d} pontos</p>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-3xl border border-zinc-200 bg-white p-5 xl:col-span-2">
          <h2 className="text-lg font-black text-zinc-900 mb-3">Rankings de Competicao Saudavel</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 p-4">
              <p className="text-sm font-semibold text-zinc-800 mb-2">Equipes / campanhas</p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {data.rankings.campaigns.length === 0 ? (
                  <p className="text-xs text-zinc-500">Sem campanhas no seu escopo.</p>
                ) : data.rankings.campaigns.map((item) => (
                  <div key={item.campaignId} className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">#{item.rank} {item.name}</p>
                      <p className="text-[11px] text-zinc-500">{item.activeMembers7d}/{item.membersTotal} ativos</p>
                    </div>
                    <p className="text-sm font-black text-zinc-800">{item.score7d}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <p className="text-sm font-semibold text-zinc-800 mb-2">Estados (7 dias)</p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {data.rankings.states.length === 0 ? (
                  <p className="text-xs text-zinc-500">Sem dados estaduais para o seu escopo.</p>
                ) : data.rankings.states.map((item) => (
                  <div key={item.state} className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">#{item.rank} {item.state}</p>
                      <p className="text-[11px] text-zinc-500">Vitalidade {item.vitality}%</p>
                    </div>
                    <p className="text-sm font-black text-zinc-800">{item.score}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-black text-zinc-900 mb-3">Acoes recomendadas</h2>
          <div className="space-y-3">
            {data.nudges.map((nudge) => (
              <div key={nudge.id} className="rounded-2xl border border-zinc-200 p-3">
                <p className="text-sm font-semibold text-zinc-900">{nudge.title}</p>
                <p className="text-xs text-zinc-500 mt-1">{nudge.description}</p>
                <Link
                  to={nudge.actionPath}
                  className="mt-3 inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                >
                  {nudge.actionLabel}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-black text-zinc-900">Fundamentos comportamentais adotados</h2>
        <div className="grid gap-3 mt-4 md:grid-cols-2 xl:grid-cols-4">
          {data.principles.map((principle) => (
            <article key={principle.title} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="font-semibold text-zinc-900 text-sm">{principle.title}</p>
              <p className="text-xs text-zinc-600 mt-2">{principle.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-zinc-900 text-zinc-100 p-5">
        <h2 className="text-lg font-black">Acesso rapido</h2>
        <div className="grid gap-3 mt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/dashboard" className="rounded-2xl border border-white/10 px-4 py-3 hover:bg-white/10">
            <p className="font-semibold">Missoes</p>
            <p className="text-xs text-zinc-400 mt-1">Executar tarefas de impacto.</p>
          </Link>
          <Link to="/voluntario/campanhas" className="rounded-2xl border border-white/10 px-4 py-3 hover:bg-white/10">
            <p className="font-semibold">Campanhas</p>
            <p className="text-xs text-zinc-400 mt-1">Colaborar com sua equipe.</p>
          </Link>
          <Link to="/voluntario/formacao" className="rounded-2xl border border-white/10 px-4 py-3 hover:bg-white/10">
            <p className="font-semibold">Formacao</p>
            <p className="text-xs text-zinc-400 mt-1">Aumentar maestria tecnica.</p>
          </Link>
          <Link to="/map" className="rounded-2xl border border-white/10 px-4 py-3 hover:bg-white/10">
            <p className="font-semibold">Arena nacional</p>
            <p className="text-xs text-zinc-400 mt-1">Acompanhar competicao por estado.</p>
          </Link>
        </div>
      </section>

      {showGuide ? (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-white p-5 md:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-zinc-500">Onboarding de engajamento</p>
                <h3 className="text-xl font-black text-zinc-900">Como funciona este sistema</h3>
              </div>
              <button
                onClick={dismissGuide}
                className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:text-zinc-900"
                aria-label="Fechar guia"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid gap-3 mt-4 md:grid-cols-2">
              <article className="rounded-2xl border border-zinc-200 p-4">
                <p className="font-semibold text-zinc-900">1. Entenda seu indice</p>
                <p className="text-xs text-zinc-600 mt-1">Seu indice combina maestria, impacto, pertencimento e ritmo.</p>
              </article>
              <article className="rounded-2xl border border-zinc-200 p-4">
                <p className="font-semibold text-zinc-900">2. Foque nos desafios semanais</p>
                <p className="text-xs text-zinc-600 mt-1">Complete os desafios para ganhar pontos e manter consistencia.</p>
              </article>
              <article className="rounded-2xl border border-zinc-200 p-4">
                <p className="font-semibold text-zinc-900">3. Evolua junto da equipe</p>
                <p className="text-xs text-zinc-600 mt-1">O score coletivo influencia o ranking de campanha e a motivacao do grupo.</p>
              </article>
              <article className="rounded-2xl border border-zinc-200 p-4">
                <p className="font-semibold text-zinc-900">4. Use os nudges</p>
                <p className="text-xs text-zinc-600 mt-1">As recomendacoes mostram a proxima acao de maior retorno.</p>
              </article>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 justify-end">
              <Link
                to="/guia-inicial"
                onClick={dismissGuide}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Ver guia completo do sistema
              </Link>
              <button
                onClick={dismissGuide}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
