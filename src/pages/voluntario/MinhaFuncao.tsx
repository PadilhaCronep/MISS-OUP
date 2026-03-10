import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Settings, Target, Clock, CheckCircle2, AlertCircle,
  TrendingUp, Star, User, Calendar, ExternalLink, PlayCircle, Award
} from 'lucide-react';
import { useAuth } from '../../components/AuthContext.tsx';
import { ErrorState } from '../../components/ui/ErrorState.tsx';
import { apiClient } from '../../lib/api-client.ts';
import { usePageTitle } from '../../hooks/usePageTitle.ts';
import { useMinhaFuncao } from '../../hooks/useMinhaFuncao.ts';

export const MinhaFuncao: React.FC = () => {
  usePageTitle('Minha Funcao');
  const { user } = useAuth();
  const { data, loading, error, refetch } = useMinhaFuncao(user?.id ?? null);
  const [taskHours, setTaskHours] = useState<Record<string, number>>({});
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({});

  const handleUpdateProgress = async (taskId: string, status: string = 'EM_PROGRESSO') => {
    const hours = taskHours[taskId] || 0;
    const notes = taskNotes[taskId] || '';

    const result = await apiClient.patch<{ success: boolean }>(`/api/voluntario/tarefas/${taskId}/progresso`, {
      hours,
      status,
      notes,
    });

    if (!result.error) {
      void refetch();
      setTaskHours((prev) => ({ ...prev, [taskId]: 0 }));
      setTaskNotes((prev) => ({ ...prev, [taskId]: '' }));
    }
  };

  const handleSelfAssessment = async (competency: string, level: number) => {
    if (!data?.member || !user) return;
    const newCompetencies = { ...data.member.competencies_eval, [competency]: level };

    const result = await apiClient.post<{ success: boolean }>('/api/voluntario/self-assessment', {
      memberId: data.member.id,
      volunteerId: user.id,
      competencies: newCompetencies,
    });

    if (!result.error) {
      void refetch();
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64">Carregando...</div>;

  if (error) {
    return <ErrorState mensagem={error} onRetry={() => void refetch()} />;
  }

  if (!data?.isMember || !data.member) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Settings className="w-10 h-10 text-zinc-400" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Voce ainda nao tem uma funcao</h2>
        <p className="text-zinc-600 mb-8">
          Para ter uma funcao especifica, voce precisa ser convidado para uma campanha ou se candidatar a uma vaga aberta.
        </p>
        <button className="bg-[#F5C400] text-zinc-900 px-6 py-3 rounded-xl font-bold hover:bg-[#E5B400] transition-colors">
          Explorar Campanhas
        </button>
      </div>
    );
  }

  const { member } = data;
  const tasks = data.tasks ?? [];
  const onboarding = data.onboarding?.[0] ?? null;

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 rounded bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wider">
              {member.campaign_office}
            </span>
            <span className="px-2 py-1 rounded text-white text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: member.sector_color }}>
              {member.sector_name}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-zinc-900">Minha Funcao na Campanha</h1>
          <p className="text-zinc-500">{member.campaign_name}</p>
        </div>
      </header>

      <div className="bg-zinc-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 grid md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                <User className="w-8 h-8 text-[#F5C400]" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{member.role_name}</h3>
                <p className="text-zinc-400 text-sm">{member.sector_name} - {member.subsector_name || 'Geral'}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Membro desde:</span>
                <span className="text-white">{new Date(member.joined_at).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Carga horaria:</span>
                <span className="text-white">12h/semana</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Performance</span>
                <span className="text-[#F5C400] font-bold">{member.performance_score}/100</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${member.performance_score}%` }}
                  className="h-full bg-[#F5C400]"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-4">
              <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                <p className="text-xl font-bold">{member.tasks_completed}</p>
                <p className="text-[10px] text-zinc-400 uppercase">Entregas</p>
              </div>
              <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                <p className="text-xl font-bold">{member.tasks_on_time}%</p>
                <p className="text-[10px] text-zinc-400 uppercase">No Prazo</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-[#F5C400]" />
                Tarefas Ativas
              </h2>
              <span className="text-xs font-medium text-zinc-500">{tasks.length} pendentes</span>
            </div>
            <div className="space-y-4">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div key={task.id} className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          task.status === 'EM_PROGRESSO' ? 'bg-blue-50 text-blue-600' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {(task.status || '').replace('_', ' ')}
                        </span>
                        <h3 className="text-lg font-bold text-zinc-900 mt-1">{task.title}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-zinc-400 font-medium">Prazo</p>
                        <p className="text-sm font-bold text-zinc-900">
                          {task.deadline ? new Date(task.deadline).toLocaleDateString('pt-BR') : 'Sem prazo'}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-600 mb-6">{task.description}</p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-zinc-50 rounded-xl p-3">
                        <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Horas Registradas</p>
                        <p className="text-lg font-bold text-zinc-900">
                          {task.registered_hours}h <span className="text-zinc-400 text-xs font-normal">/ {task.estimated_hours}h est.</span>
                        </p>
                      </div>
                      <div className="bg-zinc-50 rounded-xl p-3">
                        <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Registrar Hoje</p>
                        <input
                          type="number"
                          value={taskHours[task.id] || ''}
                          onChange={(e) => setTaskHours((prev) => ({ ...prev, [task.id]: Number(e.target.value) }))}
                          className="w-full bg-transparent border-none p-0 text-lg font-bold text-zinc-900 focus:ring-0"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => void handleUpdateProgress(task.id)}
                        className="flex-1 bg-zinc-100 text-zinc-900 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                      >
                        <Clock className="w-4 h-4" />
                        Salvar Progresso
                      </button>
                      <button
                        onClick={() => void handleUpdateProgress(task.id, 'REVISAO')}
                        className="flex-1 bg-zinc-900 text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Entregar
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <p className="text-zinc-500 font-medium">Nenhuma tarefa pendente</p>
                  <p className="text-sm text-zinc-400">Voce esta em dia com suas obrigacoes!</p>
                </div>
              )}
            </div>
          </section>

          {onboarding && onboarding.status === 'EM_ANDAMENTO' && (
            <section className="bg-white rounded-2xl border border-zinc-100 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">Seu Onboarding</h2>
                  <p className="text-sm text-zinc-500">Prepare-se para atuar como {member.role_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-zinc-900">{onboarding.completed_steps.length} / 5</p>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold">Etapas</p>
                </div>
              </div>
              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden mb-8">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(onboarding.completed_steps.length / 5) * 100}%` }}
                  className="h-full bg-green-500"
                />
              </div>
              <div className="space-y-4">
                {[
                  'Apresentacao ao time de Tecnologia',
                  'Acesso ao repositorio e ambiente local',
                  'Primeira tarefa simples atribuida',
                  'Code review da primeira entrega',
                  'Reuniao 1:1 com lider de setor',
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      idx < onboarding.completed_steps.length ? 'bg-green-100 text-green-600' : 'bg-zinc-100 text-zinc-400'
                    }`}>
                      {idx < onboarding.completed_steps.length ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                    </div>
                    <span className={`text-sm ${idx < onboarding.completed_steps.length ? 'text-zinc-500 line-through' : 'text-zinc-900 font-medium'}`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-8">
          <section className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-[#F5C400]" />
              Minhas Competencias
            </h2>
            <p className="text-xs text-zinc-500 mb-6">Avalie seu nivel tecnico para que possamos alinhar expectativas.</p>

            <div className="space-y-6">
              {member.technical_competencies.map((comp) => (
                <div key={comp}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-zinc-700">{comp}</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => void handleSelfAssessment(comp, star)}
                          className={`w-5 h-5 transition-colors ${
                            star <= (member.competencies_eval[comp] || 0) ? 'text-[#F5C400]' : 'text-zinc-200'
                          }`}
                          aria-label={`Avaliar ${comp} com ${star} estrelas`}
                        >
                          <Star className="w-full h-full fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Sua auto-avaliacao ajuda o lider a identificar onde voce precisa de suporte ou onde pode mentorar outros.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Minha Evolucao
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-zinc-600">Horas este mes</span>
                </div>
                <span className="font-bold text-zinc-900">{member.hours_registered}h</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <PlayCircle className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-zinc-600">Trilhas concluidas</span>
                </div>
                <span className="font-bold text-zinc-900">2</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Award className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-zinc-600">Badges de funcao</span>
                </div>
                <span className="font-bold text-zinc-900">1</span>
              </div>
            </div>
            <button className="w-full mt-6 text-sm font-bold text-zinc-900 flex items-center justify-center gap-2 hover:underline">
              Ver historico completo
              <ExternalLink className="w-4 h-4" />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
