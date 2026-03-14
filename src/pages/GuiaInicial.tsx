import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Compass, Map, Rocket, Trophy, Users } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle.ts';

const STEPS = [
  {
    title: '1. Arena inicial',
    description: 'Comece no mapa de competicao para entender metas por estado e contexto geral da campanha.',
    actionLabel: 'Abrir Arena',
    actionPath: '/',
    icon: Map,
  },
  {
    title: '2. Engajamento estrategico',
    description: 'Veja seu indice, liga, desafios e ranking para priorizar a proxima acao de maior impacto.',
    actionLabel: 'Abrir Engajamento',
    actionPath: '/engajamento',
    icon: Trophy,
  },
  {
    title: '3. Operacao de campanha',
    description: 'Entre no painel da sua campanha para executar tarefas, acompanhar calendario e colaborar com o time.',
    actionLabel: 'Abrir Campanhas',
    actionPath: '/voluntario/campanhas',
    icon: Users,
  },
  {
    title: '4. Formacao continua',
    description: 'Avance nas trilhas de formacao para ganhar repertorio, elevar sua performance e acelerar entregas.',
    actionLabel: 'Abrir Formacao',
    actionPath: '/voluntario/formacao',
    icon: BookOpen,
  },
];

export const GuiaInicial: React.FC = () => {
  usePageTitle('Guia Inicial do Sistema');

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 md:p-8 text-white">
        <p className="text-xs uppercase tracking-wider text-zinc-400">Primeiros passos</p>
        <h1 className="text-2xl md:text-3xl font-black mt-2">Como operar o sistema de forma simples e eficiente</h1>
        <p className="text-zinc-300 mt-3 max-w-3xl">
          Este guia organiza o fluxo recomendado para ativacao do partido: contexto territorial, engajamento, execucao operacional e evolucao continua.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {STEPS.map((step) => (
          <article key={step.title} className="rounded-3xl border border-zinc-200 bg-white p-5 md:p-6">
            <div className="w-11 h-11 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center mb-4">
              <step.icon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-zinc-900">{step.title}</h2>
            <p className="text-sm text-zinc-600 mt-2">{step.description}</p>
            <Link
              to={step.actionPath}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              {step.actionLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 md:p-6">
        <h2 className="text-lg font-black text-zinc-900">Boas praticas para implementacao no partido</h2>
        <div className="grid gap-3 mt-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="font-semibold text-zinc-900 text-sm">Ritual semanal</p>
            <p className="text-xs text-zinc-600 mt-1">Defina metas por equipe toda segunda e revise ranking/entregas na sexta.</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="font-semibold text-zinc-900 text-sm">Transparencia de metas</p>
            <p className="text-xs text-zinc-600 mt-1">Use o mapa e o hub de engajamento para mostrar prioridades e progresso real.</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="font-semibold text-zinc-900 text-sm">Adoção orientada por funcao</p>
            <p className="text-xs text-zinc-600 mt-1">Voluntario foca em tarefas; lideranca foca em coordenacao e desenvolvimento da equipe.</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-zinc-900 text-zinc-100 p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-xl font-black">Fluxo recomendado de uso diario</h2>
            <p className="text-zinc-400 text-sm mt-2">Arena, Engajamento, Campanha, Formacao e Conquistas.</p>
          </div>
          <Link
            to="/engajamento"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F5C400] px-5 py-3 text-sm font-black text-zinc-900 hover:bg-[#e0b300]"
          >
            Ir para Engajamento
            <Rocket className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};

