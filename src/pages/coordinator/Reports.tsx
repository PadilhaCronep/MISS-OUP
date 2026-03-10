import React from 'react';
import { useAuth } from '../../components/AuthContext.tsx';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  Users, 
  Target, 
  Zap, 
  ArrowUpRight, 
  ChevronRight,
  FileText,
  PieChart,
  Activity,
  Star
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">Relatórios Operacionais</h1>
          <p className="text-zinc-500 font-medium">Análise de dados e exportação para tomada de decisão</p>
        </div>
      </div>

      {/* Weekly Report Card */}
      <section className="bg-[#111111] rounded-[40px] border border-zinc-800 overflow-hidden shadow-2xl">
        <div className="p-10 border-b border-zinc-800 bg-zinc-900/20 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[#F5C400] rounded-lg">
                <BarChart3 className="w-5 h-5 text-black" />
              </div>
              <h2 className="text-2xl font-black text-white">Relatório da Semana</h2>
            </div>
            <p className="text-zinc-500 font-bold text-sm">02 de Março a 08 de Março de 2026</p>
          </div>
          <button className="bg-[#F5C400] text-black font-black py-4 px-8 rounded-2xl hover:bg-[#e0b300] transition-all flex items-center gap-3 shadow-xl">
            <Download className="w-5 h-5" /> EXPORTAR RELATÓRIO
          </button>
        </div>

        <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-6">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Crescimento</p>
            <div>
              <p className="text-4xl font-black text-white mb-1">+23</p>
              <p className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" /> 12% vs semana anterior
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase">
                <span>Meta Semanal</span>
                <span>46%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#F5C400] w-[46%]" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Engajamento</p>
            <div>
              <p className="text-4xl font-black text-white mb-1">156</p>
              <p className="text-xs font-bold text-zinc-500">Missões completadas</p>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-[10px] font-black text-zinc-600 uppercase mb-1">Taxa Conclusão</p>
                <p className="text-sm font-black text-white">68%</p>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-zinc-600 uppercase mb-1">XP Distribuído</p>
                <p className="text-sm font-black text-[#F5C400]">8.4k</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Top Performers</p>
            <div className="space-y-3">
              {[
                { name: 'Ana Silva', xp: '+450' },
                { name: 'Carlos Souza', xp: '+380' },
                { name: 'Mariana Lima', xp: '+310' },
              ].map((v, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">{v.name}</span>
                  <span className="text-xs font-black text-[#F5C400]">{v.xp}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Saúde do Território</p>
            <div>
              <p className="text-4xl font-black text-[#F5C400] mb-1">62</p>
              <p className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" /> +4 pts vs semana anterior
              </p>
            </div>
            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
              <p className="text-[10px] font-bold text-zinc-500 leading-tight">
                "Crescimento acelerado em SP Capital compensando inatividade no interior."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { title: 'Relatório de Inativos', icon: Users, desc: 'Lista de voluntários sem atividade há 14+ dias para reativação.', color: 'red' },
          { title: 'Relatório de Lideranças', icon: Star, desc: 'Análise detalhada de voluntários com alto score de liderança.', color: 'yellow' },
          { title: 'Performance de Missões', icon: Target, desc: 'Quais tipos de missão geram mais engajamento no seu território.', color: 'emerald' },
        ].map((rep, i) => (
          <div key={i} className="bg-[#111111] p-8 rounded-3xl border border-zinc-800 hover:border-[#F5C400]/30 transition-all group cursor-pointer">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${
              rep.color === 'red' ? 'bg-red-500/10 text-red-500' :
              rep.color === 'yellow' ? 'bg-yellow-500/10 text-yellow-500' :
              'bg-emerald-500/10 text-emerald-500'
            }`}>
              <rep.icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-white mb-3 group-hover:text-[#F5C400] transition-colors">{rep.title}</h3>
            <p className="text-sm text-zinc-500 font-medium leading-relaxed mb-6">{rep.desc}</p>
            <button className="flex items-center gap-2 text-[10px] font-black text-[#F5C400] uppercase tracking-widest hover:underline">
              Gerar Relatório <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Advanced Analytics Section */}
      <section className="bg-[#111111] p-10 rounded-[40px] border border-zinc-800">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
              <Activity className="w-6 h-6 text-zinc-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Análise de Tendências</h2>
              <p className="text-zinc-500 font-bold text-sm">Projeções baseadas no comportamento da base</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="bg-zinc-900 text-zinc-400 font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest border border-zinc-800">30 dias</button>
            <button className="bg-[#F5C400] text-black font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest">90 dias</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800/50 flex flex-col items-center justify-center text-center">
            <PieChart className="w-16 h-16 text-zinc-700 mb-4" />
            <p className="text-sm font-bold text-zinc-500">Gráfico de Projeção de Crescimento</p>
            <p className="text-[10px] text-zinc-600 uppercase mt-2">Disponível na versão Pro</p>
          </div>
          <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800/50 flex flex-col items-center justify-center text-center">
            <Activity className="w-16 h-16 text-zinc-700 mb-4" />
            <p className="text-sm font-bold text-zinc-500">Mapa de Calor de Atividade Territorial</p>
            <p className="text-[10px] text-zinc-600 uppercase mt-2">Disponível na versão Pro</p>
          </div>
        </div>
      </section>
    </div>
  );
};
