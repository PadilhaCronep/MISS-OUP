import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext.tsx';
import { motion } from 'motion/react';
import {
  Users,
  Zap,
  Target,
  Star,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  Brain,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiClient } from '../../lib/api-client.ts';

interface ActivityItem {
  id?: string;
  name?: string;
  action?: string;
  timestamp?: string;
  photo_url?: string | null;
}

interface Performer {
  id: string;
  name?: string;
  current_level?: number;
  xp_total?: number;
  photo_url?: string | null;
}

interface DashboardData {
  totalVoluntarios: number;
  voluntariosAtivos: number;
  submissoesPendentes: number;
  lideresEmergentes: number;
  taxaEngajamento: number;
  crescimentoMes: number;
  crescimentoMesAnterior: number;
  atividadeRecente: ActivityItem[];
  distribuicaoNiveis: Array<Record<string, unknown>>;
  topPerformers: Performer[];
}

interface InteligenciaAlerta {
  cidade: string;
  estado: string;
  classificacao: 'DIAMANTE' | 'LATENTE' | 'MOTOR' | 'POLO' | 'APOSTA' | 'BAIXA_PRIOR';
  ic: number;
  acao_sugerida: string;
  voluntarios_count: number;
  see_crescimento: number;
}

export const CoordinatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertasInteligencia, setAlertasInteligencia] = useState<InteligenciaAlerta[]>([]);

  useEffect(() => {
    let cancelled = false;

    const carregar = async (): Promise<void> => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const [dashboardResponse, alertasResponse] = await Promise.all([
          fetch(`/api/coordenador/dashboard?state=${user.state}&city=${user.city}&role=${user.role}`),
          apiClient.get<{ alertas: InteligenciaAlerta[] }>('/api/inteligencia/alertas?limite=3'),
        ]);

        const dashboardJson = (await dashboardResponse.json()) as DashboardData;

        if (cancelled) return;

        setData(dashboardJson);

        if (!alertasResponse.error && alertasResponse.data) {
          setAlertasInteligencia(alertasResponse.data.alertas ?? []);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void carregar();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const kpis = useMemo(() => {
    if (!data) return [];
    const activePct = data.totalVoluntarios > 0 ? Math.round((data.voluntariosAtivos / data.totalVoluntarios) * 100) : 0;

    return [
      {
        label: 'Total de voluntarios',
        value: data.totalVoluntarios,
        icon: Users,
        sub: `+${data.crescimentoMes} novos este mes`,
        trend: data.crescimentoMes >= data.crescimentoMesAnterior ? 'up' : 'down',
      },
      {
        label: 'Voluntarios ativos',
        value: data.voluntariosAtivos,
        icon: Zap,
        sub: `${activePct}% da base total`,
        color: 'emerald',
      },
      {
        label: 'Missoes para validar',
        value: data.submissoesPendentes,
        icon: Target,
        sub: data.submissoesPendentes > 0 ? 'Requer atencao imediata' : 'Tudo em dia',
        color: data.submissoesPendentes > 0 ? 'red' : 'emerald',
      },
      {
        label: 'Lideres emergentes',
        value: data.lideresEmergentes,
        icon: Star,
        sub: `${data.lideresEmergentes} prontos para promover`,
        color: 'yellow',
      },
      {
        label: 'Taxa de engajamento',
        value: `${data.taxaEngajamento}%`,
        icon: TrendingUp,
        sub: 'Meta: 40%',
        color: data.taxaEngajamento >= 40 ? 'emerald' : 'yellow',
      },
      {
        label: 'Crescimento do mes',
        value: `+${data.crescimentoMes}`,
        icon: UserPlus,
        sub: `vs ${data.crescimentoMesAnterior} no mes anterior`,
        trend: data.crescimentoMes >= data.crescimentoMesAnterior ? 'up' : 'down',
      },
    ];
  }, [data]);

  if (loading || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#F5C400] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 md:space-y-8">
      <div className="flex flex-col gap-3 rounded-3xl border border-zinc-800 bg-[#111111] p-4 md:flex-row md:items-end md:justify-between md:p-6">
        <div>
          <h1 className="mb-1 text-3xl font-black tracking-tight text-white md:text-4xl">Painel de Comando</h1>
          <p className="text-sm font-medium text-zinc-500 md:text-base">
            Visao operacional do territorio: <span className="text-[#F5C400]">{user?.state}</span>
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Ultima atualizacao</p>
          <p className="text-xs font-bold text-zinc-400">
            Hoje, as {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative overflow-hidden rounded-2xl border bg-[#111111] p-4 md:p-5 ${
              kpi.color === 'red' && Number(kpi.value) > 0 ? 'border-red-500/50' : 'border-zinc-800'
            }`}
          >
            <div className="mb-3 flex items-start justify-between md:mb-4">
              <div
                className={`rounded-lg p-2 ${
                  kpi.color === 'red'
                    ? 'bg-red-500/10 text-red-500'
                    : kpi.color === 'emerald'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                <kpi.icon className="h-5 w-5" />
              </div>
              {kpi.trend ? (
                <div className={`inline-flex items-center gap-0.5 text-[10px] font-black ${kpi.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {kpi.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {kpi.trend === 'up' ? 'CRESCENDO' : 'QUEDA'}
                </div>
              ) : null}
            </div>
            <p className="mb-1 text-xl font-black text-white md:text-2xl">{kpi.value}</p>
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-zinc-500">{kpi.label}</p>
            <p className={`text-[10px] font-bold ${kpi.color === 'red' && Number(kpi.value) > 0 ? 'text-red-400' : 'text-zinc-600'}`}>
              {kpi.sub}
            </p>
          </motion.div>
        ))}
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-lg font-black tracking-tight text-white">
            <Brain className="h-5 w-5 text-[#F5C400]" /> Alertas Territoriais
          </h2>
          <Link
            to="/coordinator/inteligencia"
            className="text-[10px] font-black uppercase tracking-widest text-[#F5C400] hover:underline"
          >
            Ver no mapa
          </Link>
        </div>

        {alertasInteligencia.length === 0 ? (
          <p className="text-xs text-zinc-500">Sem alertas criticos no momento.</p>
        ) : (
          <div className="space-y-3">
            {alertasInteligencia.map((alerta) => (
              <div
                key={`${alerta.cidade}_${alerta.estado}_${alerta.classificacao}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3"
              >
                <p className="text-sm font-bold text-white">
                  {alerta.classificacao} - {alerta.cidade}/{alerta.estado}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  IC {Number(alerta.ic ?? 0).toFixed(2)} | {alerta.voluntarios_count} voluntarios | Acao sugerida:{' '}
                  {alerta.acao_sugerida.replaceAll('_', ' ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="space-y-6 lg:col-span-5 lg:space-y-8">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-lg font-black tracking-tight text-white">
                <AlertCircle className="h-5 w-5 text-red-500" /> ATENCAO IMEDIATA
              </h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Requer acao</span>
            </div>

            <div className="space-y-3">
              {data.submissoesPendentes > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111111]">
                  <div className="border-b border-zinc-800 bg-red-500/5 p-4">
                    <p className="text-xs font-bold text-red-400">
                      Voce tem {data.submissoesPendentes} submissoes aguardando validacao
                    </p>
                  </div>
                  <div className="p-4">
                    <button className="w-full rounded-xl bg-red-500 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-red-600">
                      Validar agora
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
                  <p className="text-sm font-bold text-emerald-400">Nenhuma submissao pendente</p>
                  <p className="mt-1 text-xs text-emerald-500/60">Tudo em dia no seu territorio</p>
                </div>
              )}

              <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-bold text-zinc-400">Voluntarios inativos (14+ dias)</p>
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-black text-zinc-500">3</span>
                </div>
                <div className="space-y-3">
                  {[1, 2].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-800" />
                        <div>
                          <p className="text-xs font-bold text-white">Voluntario Exemplo {item}</p>
                          <p className="text-[10px] text-zinc-500">Inativo ha {14 + item} dias</p>
                        </div>
                      </div>
                      <button className="rounded-lg p-2 text-[#F5C400] transition-all hover:bg-[#F5C400]/10">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-lg font-black tracking-tight text-white">
                <Star className="h-5 w-5 text-[#F5C400]" /> LIDERES EMERGENTES
              </h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Prontos para promover</span>
            </div>

            <div className="grid gap-3">
              {data.topPerformers.filter((volunteer) => Number(volunteer.current_level ?? 0) >= 5).map((volunteer) => (
                <div
                  key={volunteer.id}
                  className="group flex items-center justify-between rounded-2xl border border-zinc-800 bg-[#111111] p-4 transition-all hover:border-[#F5C400]/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-xl">
                      {volunteer.photo_url ? (
                        <img src={volunteer.photo_url} className="h-full w-full rounded-xl object-cover" alt="Foto voluntario" />
                      ) : (
                        <span>V</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{volunteer.name ?? 'Voluntario'}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                          <div className="h-full w-[85%] bg-[#F5C400]" />
                        </div>
                        <span className="text-[10px] font-black text-[#F5C400]">85/100</span>
                      </div>
                    </div>
                  </div>
                  <button className="rounded-lg bg-[#F5C400]/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#F5C400] transition-all hover:bg-[#F5C400] hover:text-black">
                    Promover
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-4 lg:space-y-8">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-lg font-black tracking-tight text-white">
                <Clock className="h-5 w-5 text-zinc-500" /> ATIVIDADE RECENTE
              </h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Ultimas 48h</span>
            </div>

            <div className="relative rounded-3xl border border-zinc-800 bg-[#111111] p-5 md:p-6">
              <div className="absolute bottom-7 left-7 top-7 hidden w-px bg-zinc-800 sm:block" />
              <div className="space-y-6 md:space-y-8">
                {data.atividadeRecente.map((activity, index) => (
                  <div key={activity.id ?? `${activity.name}_${index}`} className="relative z-10 flex gap-4">
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-zinc-800 bg-zinc-900 text-xs">
                      {activity.photo_url ? (
                        <img src={activity.photo_url} className="h-full w-full object-cover" alt="Foto atividade" />
                      ) : (
                        <span>V</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs leading-relaxed text-zinc-400">
                        <span className="font-bold text-white">{activity.name ?? 'Voluntario'}</span> {activity.action ?? 'realizou uma acao'}
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                        {activity.timestamp
                          ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: ptBR })
                          : 'agora'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-3 lg:space-y-8">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight text-white">RANKING</h2>
              <button className="text-[10px] font-black uppercase tracking-widest text-[#F5C400] hover:underline">Ver todos</button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111111]">
              {data.topPerformers.map((volunteer, index) => (
                <div
                  key={volunteer.id}
                  className={`flex items-center justify-between p-4 ${index < 4 ? 'border-b border-zinc-800' : ''} ${index === 0 ? 'bg-[#F5C400]/5' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black ${index === 0 ? 'text-[#F5C400]' : 'text-zinc-600'}`}>#{index + 1}</span>
                    <div>
                      <p className="text-xs font-bold text-white">{volunteer.name ?? 'Voluntario'}</p>
                      <p className="text-[10px] font-bold uppercase text-zinc-500">Nivel {volunteer.current_level ?? 0}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#F5C400]">{volunteer.xp_total ?? 0} XP</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight text-white">METAS</h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Marco</span>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Novos voluntarios', current: data.crescimentoMes, target: 50, unit: 'voluntarios' },
                { label: 'Taxa de engajamento', current: data.taxaEngajamento, target: 40, unit: '%' },
                { label: 'Missoes validadas', current: 100, target: 100, unit: '%' },
              ].map((goal) => (
                <div key={goal.label} className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{goal.label}</p>
                    <p className="text-[10px] font-black text-white">
                      {goal.current}/{goal.target}
                      {goal.unit === '%' ? '%' : ''}
                    </p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full transition-all duration-1000 ${goal.current >= goal.target ? 'bg-emerald-500' : 'bg-[#F5C400]'}`}
                      style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
