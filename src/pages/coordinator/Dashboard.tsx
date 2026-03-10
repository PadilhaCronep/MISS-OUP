import React, { useEffect, useState } from 'react';
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
  Brain
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiClient } from '../../lib/api-client.ts';

interface DashboardData {
  totalVoluntarios: number;
  voluntariosAtivos: number;
  submissoesPendentes: number;
  lideresEmergentes: number;
  taxaEngajamento: number;
  crescimentoMes: number;
  crescimentoMesAnterior: number;
  atividadeRecente: Array<Record<string, unknown>>;
  distribuicaoNiveis: Array<Record<string, unknown>>;
  topPerformers: Array<Record<string, unknown>>;
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

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const kpis = [
    { label: 'Total de Voluntários', value: data.totalVoluntarios, icon: Users, sub: `+${data.crescimentoMes} novos este mês`, trend: data.crescimentoMes >= data.crescimentoMesAnterior ? 'up' : 'down' },
    { label: 'Voluntários Ativos', value: data.voluntariosAtivos, icon: Zap, sub: `${Math.round((data.voluntariosAtivos / data.totalVoluntarios) * 100)}% da base total`, color: 'emerald' },
    { label: 'Missões para Validar', value: data.submissoesPendentes, icon: Target, sub: data.submissoesPendentes > 0 ? 'Requer atenção imediata' : 'Tudo em dia!', color: data.submissoesPendentes > 0 ? 'red' : 'emerald' },
    { label: 'Líderes Emergentes', value: data.lideresEmergentes, icon: Star, sub: `${data.lideresEmergentes} prontos para promover`, color: 'yellow' },
    { label: 'Taxa de Engajamento', value: `${data.taxaEngajamento}%`, icon: TrendingUp, sub: 'meta: 40%', color: data.taxaEngajamento >= 40 ? 'emerald' : 'yellow' },
    { label: 'Crescimento do Mês', value: `+${data.crescimentoMes}`, icon: UserPlus, sub: `vs ${data.crescimentoMesAnterior} no mês anterior`, trend: data.crescimentoMes >= data.crescimentoMesAnterior ? 'up' : 'down' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Painel de Comando</h1>
          <p className="text-zinc-500 font-medium">Visão operacional do território: <span className="text-[#F5C400]">{user?.state}</span></p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Última atualização</p>
          <p className="text-xs font-bold text-zinc-400">Hoje, às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-[#111111] p-5 rounded-2xl border ${kpi.color === 'red' && kpi.value > 0 ? 'border-red-500/50 animate-pulse' : 'border-zinc-800'} relative overflow-hidden group`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg ${kpi.color === 'red' ? 'bg-red-500/10 text-red-500' : kpi.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-400'}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
              {kpi.trend && (
                <div className={`flex items-center gap-0.5 text-[10px] font-black ${kpi.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {kpi.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {kpi.trend === 'up' ? 'CRESCENDO' : 'QUEDA'}
                </div>
              )}
            </div>
            <p className="text-2xl font-black text-white mb-1">{kpi.value}</p>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-2">{kpi.label}</p>
            <p className={`text-[10px] font-bold ${kpi.color === 'red' && kpi.value > 0 ? 'text-red-400' : 'text-zinc-600'}`}>{kpi.sub}</p>
          </motion.div>
        ))}
      </div>
      {/* Alertas Territoriais */}
      <section className="bg-[#111111] rounded-2xl border border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#F5C400]" /> Alertas Territoriais
          </h2>
          <Link
            to="/coordinator/inteligencia"
            className="text-[10px] font-black text-[#F5C400] uppercase tracking-widest hover:underline"
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
                <p className="text-xs text-zinc-400 mt-1">
                  IC {Number(alerta.ic ?? 0).toFixed(2)} | {alerta.voluntarios_count} voluntarios | Acao sugerida: {alerta.acao_sugerida.replaceAll('_', ' ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Attention Immediate */}
        <div className="lg:col-span-5 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" /> ATENÇÃO IMEDIATA
              </h2>
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Requer sua ação</span>
            </div>
            
            <div className="space-y-3">
              {data.submissoesPendentes > 0 ? (
                <div className="bg-[#111111] rounded-2xl border border-zinc-800 overflow-hidden">
                  <div className="p-4 border-b border-zinc-800 bg-red-500/5">
                    <p className="text-xs font-bold text-red-400">Você tem {data.submissoesPendentes} submissões aguardando validação</p>
                  </div>
                  <div className="p-4">
                    <button className="w-full bg-red-500 text-white font-black py-3 rounded-xl hover:bg-red-600 transition-all text-xs tracking-widest uppercase">
                      Validar Agora
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-2xl text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                  <p className="text-sm font-bold text-emerald-400">Nenhuma submissão pendente</p>
                  <p className="text-xs text-emerald-500/60 mt-1">Tudo em dia no seu território!</p>
                </div>
              )}

              {/* Inactive Volunteers Alert */}
              <div className="bg-[#111111] p-4 rounded-2xl border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold text-zinc-400">Voluntários Inativos (14+ dias)</p>
                  <span className="bg-zinc-800 text-zinc-500 text-[10px] font-black px-1.5 py-0.5 rounded">3</span>
                </div>
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-800 rounded-full" />
                        <div>
                          <p className="text-xs font-bold text-white">Voluntário Exemplo {i}</p>
                          <p className="text-[10px] text-zinc-500">Inativo há {14 + i} dias</p>
                        </div>
                      </div>
                      <button className="p-2 text-[#F5C400] hover:bg-[#F5C400]/10 rounded-lg transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-[#F5C400]" /> LÍDERES EMERGENTES
              </h2>
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Prontos para promover</span>
            </div>
            
            <div className="grid gap-3">
              {data.topPerformers.filter(v => v.current_level >= 5).map((v, i) => (
                <div key={v.id} className="bg-[#111111] p-4 rounded-2xl border border-zinc-800 flex items-center justify-between group hover:border-[#F5C400]/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-xl border border-zinc-700">
                      {v.photo_url ? <img src={v.photo_url} className="w-full h-full object-cover rounded-xl" /> : '👤'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{v.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-[#F5C400] w-[85%]" />
                        </div>
                        <span className="text-[10px] font-black text-[#F5C400]">85/100</span>
                      </div>
                    </div>
                  </div>
                  <button className="bg-[#F5C400]/10 text-[#F5C400] text-[10px] font-black px-3 py-2 rounded-lg hover:bg-[#F5C400] hover:text-black transition-all uppercase tracking-wider">
                    Promover
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Center Column: Activity Feed */}
        <div className="lg:col-span-4 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-zinc-500" /> ATIVIDADE RECENTE
              </h2>
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Últimas 48h</span>
            </div>

            <div className="bg-[#111111] rounded-3xl border border-zinc-800 p-6 relative">
              <div className="absolute left-[33px] top-8 bottom-8 w-[1px] bg-zinc-800" />
              <div className="space-y-8">
                {data.atividadeRecente.map((act, i) => (
                  <div key={i} className="flex gap-4 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs overflow-hidden">
                      {act.photo_url ? <img src={act.photo_url} className="w-full h-full object-cover" /> : '👤'}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        <span className="font-bold text-white">{act.name}</span> {act.action}
                      </p>
                      <p className="text-[10px] font-bold text-zinc-600 mt-1 uppercase tracking-wider">
                        {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Rankings & Goals */}
        <div className="lg:col-span-3 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black tracking-tight text-white">🏆 RANKING</h2>
              <button className="text-[10px] font-black text-[#F5C400] uppercase tracking-widest hover:underline">Ver todos</button>
            </div>
            
            <div className="bg-[#111111] rounded-2xl border border-zinc-800 overflow-hidden">
              {data.topPerformers.map((v, i) => (
                <div key={v.id} className={`flex items-center justify-between p-4 ${i < 4 ? 'border-b border-zinc-800' : ''} ${i === 0 ? 'bg-[#F5C400]/5' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black ${i === 0 ? 'text-[#F5C400]' : 'text-zinc-600'}`}>#{i + 1}</span>
                    <div>
                      <p className="text-xs font-bold text-white">{v.name}</p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Nível {v.current_level}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#F5C400]">{v.xp_total} XP</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black tracking-tight text-white">🎯 METAS</h2>
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Março</span>
            </div>
            
            <div className="space-y-4">
              {[
                { label: 'Novos Voluntários', current: data.crescimentoMes, target: 50, unit: 'voluntários' },
                { label: 'Taxa de Engajamento', current: data.taxaEngajamento, target: 40, unit: '%' },
                { label: 'Missões Validadas', current: 100, target: 100, unit: '%' },
              ].map((meta, i) => (
                <div key={i} className="bg-[#111111] p-4 rounded-2xl border border-zinc-800">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">{meta.label}</p>
                    <p className="text-[10px] font-black text-white">{meta.current}/{meta.target}{meta.unit === '%' ? '%' : ''}</p>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${meta.current >= meta.target ? 'bg-emerald-500' : 'bg-[#F5C400]'}`} 
                      style={{ width: `${Math.min((meta.current / meta.target) * 100, 100)}%` }} 
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








