import React, { useEffect, useState } from 'react';
import { CalendarCheck2, Clock3, MessageCircle, Mic2 } from 'lucide-react';
import { apiClient } from '../lib/api-client.ts';

interface CandidateResponse {
  campaign: { id: string; name: string; candidateName: string; office: string };
  summary: {
    totalAgendaItems: number;
    pending: number;
    completed: number;
    waitingContent: number;
  };
  agenda: Array<{
    id: string;
    title: string;
    agenda_type: string;
    priority: string;
    status: string;
    due_at: string | null;
    source_entity: string | null;
    notes: string | null;
    created_at: string;
  }>;
  waitingContentTasks: Array<{
    id: string;
    title: string;
    status: string;
    deadline: string | null;
  }>;
  authorizedContacts: string[];
}

export const CandidatePanel: React.FC = () => {
  const [data, setData] = useState<CandidateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const result = await apiClient.get<CandidateResponse>('/api/campaign-os/candidate');
      if (cancelled) return;

      if (result.error || !result.data) {
        setError(result.error ?? 'Falha ao carregar modulo do candidato.');
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
    return <div className="h-[45vh] flex items-center justify-center text-zinc-500">Carregando agenda do candidato...</div>;
  }

  if (error || !data) {
    return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error ?? 'Sem dados do candidato.'}</div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="rounded-3xl border border-zinc-200 bg-white p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Painel do candidato</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">Agenda e Aprovacoes</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {data.campaign.candidateName} | {data.campaign.name}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Itens de agenda', value: data.summary.totalAgendaItems, icon: CalendarCheck2 },
          { label: 'Pendentes', value: data.summary.pending, icon: Clock3 },
          { label: 'Concluidas', value: data.summary.completed, icon: CalendarCheck2 },
          { label: 'Conteudos esperando', value: data.summary.waitingContent, icon: Mic2 },
        ].map((card) => (
          <article key={card.label} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <card.icon className="h-5 w-5 text-[#C99800]" />
            </div>
            <p className="text-2xl font-black text-zinc-900">{card.value}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{card.label}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-700">Agenda inteligente</h2>
          <div className="mt-3 space-y-2">
            {data.agenda.map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">{item.priority}</span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {item.agenda_type} | {item.due_at ? new Date(item.due_at).toLocaleString('pt-BR') : 'Sem horario'}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">{item.notes ?? 'Sem observacoes adicionais.'}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-700">Acoes que dependem de voce</h2>
          <div className="mt-3 space-y-2">
            {data.waitingContentTasks.map((task) => (
              <div key={task.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-sm font-semibold text-zinc-900">{task.title}</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Status: {task.status} | Prazo: {task.deadline ? new Date(task.deadline).toLocaleDateString('pt-BR') : 'Sem prazo'}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700">
              <MessageCircle className="h-4 w-4 text-[#C99800]" /> Contatos autorizados
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">{data.authorizedContacts.join(', ') || 'Sem contatos mapeados no momento.'}</p>
          </div>
        </article>
      </section>
    </div>
  );
};
