import React, { useEffect, useState } from 'react';
import { Bug, CalendarRange, KanbanSquare, MessageSquareQuote } from 'lucide-react';
import { apiClient } from '../../lib/api-client.ts';

interface ProgrammingResponse {
  campaign: { id: string; name: string; candidateName: string };
  summary: {
    totalTasks: number;
    backlog: number;
    inProgress: number;
    review: number;
    done: number;
    completionRate: number;
    estimatedHours: number;
    registeredHours: number;
  };
  kanban: {
    backlog: any[];
    inProgress: any[];
    review: any[];
    done: any[];
  };
  roadmap: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    priority: string;
    dueAt: string;
    owner: string | null;
    sector: string;
  }>;
  forum: Array<{
    id: string;
    title: string;
    category: string;
    content: string;
    votes: number;
    answers_count: number;
    is_solved: number;
    created_at: string;
  }>;
}

export const ProgrammingChiefDashboard: React.FC = () => {
  const [data, setData] = useState<ProgrammingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const result = await apiClient.get<ProgrammingResponse>('/api/campaign-os/programming');
      if (cancelled) return;

      if (result.error || !result.data) {
        setError(result.error ?? 'Falha ao carregar hub de programacao.');
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
  }, []);

  if (loading) {
    return <div className="h-[45vh] flex items-center justify-center text-zinc-500">Carregando hub de programacao...</div>;
  }

  if (error || !data) {
    return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error ?? 'Sem dados de programacao.'}</div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="rounded-3xl border border-zinc-800 bg-[#111111] p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Hub tecnico interno</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Programacao da Campanha</h1>
        <p className="mt-1 text-sm text-zinc-400">{data.campaign.name} | {data.campaign.candidateName}</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: 'Total', value: data.summary.totalTasks },
          { label: 'Backlog', value: data.summary.backlog },
          { label: 'Em progresso', value: data.summary.inProgress },
          { label: 'Revisao', value: data.summary.review },
          { label: 'Concluidas', value: data.summary.done },
          { label: 'Conclusao', value: `${data.summary.completionRate}%` },
        ].map((card) => (
          <article key={card.label} className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
            <p className="text-2xl font-black text-white">{card.value}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{card.label}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wider text-zinc-300">
            <KanbanSquare className="h-4 w-4 text-[#F5C400]" /> Kanban
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-zinc-200">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">Backlog: {data.kanban.backlog.length}</div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">Em progresso: {data.kanban.inProgress.length}</div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">Revisao: {data.kanban.review.length}</div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">Concluidas: {data.kanban.done.length}</div>
          </div>

          <div className="mt-4 grid gap-2 text-[12px] text-zinc-400">
            <p>Horas estimadas: <span className="text-zinc-100">{data.summary.estimatedHours.toFixed(1)}</span></p>
            <p>Horas registradas: <span className="text-zinc-100">{data.summary.registeredHours.toFixed(1)}</span></p>
          </div>
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wider text-zinc-300">
            <CalendarRange className="h-4 w-4 text-[#F5C400]" /> Roadmap
          </h2>
          <div className="mt-3 space-y-2">
            {data.roadmap.slice(0, 12).map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {item.category} | {item.status} | Prazo: {new Date(item.dueAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wider text-zinc-300">
          <MessageSquareQuote className="h-4 w-4 text-[#F5C400]" /> Forum interno de chefes de programacao
        </h2>
        <div className="mt-3 space-y-2">
          {data.forum.map((topic) => (
            <div key={topic.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{topic.title}</p>
                <span className={`text-[10px] uppercase tracking-wider ${topic.is_solved ? 'text-emerald-300' : 'text-yellow-300'}`}>
                  {topic.is_solved ? 'resolvido' : 'aberto'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">#{topic.category} | votos: {topic.votes} | respostas: {topic.answers_count}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 text-sm text-zinc-300">
        <p className="inline-flex items-center gap-2 font-semibold text-zinc-100">
          <Bug className="h-4 w-4 text-[#F5C400]" /> Conhecimento compartilhado
        </p>
        <p className="mt-1 text-zinc-500">
          O forum interno funciona como memoria tecnica para reduzir retrabalho entre campanhas e acelerar resposta a incidentes.
        </p>
      </section>
    </div>
  );
};
