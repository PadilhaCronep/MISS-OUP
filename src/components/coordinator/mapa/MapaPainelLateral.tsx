import React from 'react';
import { motion } from 'motion/react';
import { DadosCidadeMapa, RespostaMapa } from '../../../lib/mapa-dados.ts';
import { 
  Users, 
  Target, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  ChevronRight,
  ArrowUpRight,
  Zap,
  Shield,
  MapPin,
  Calendar,
  X
} from 'lucide-react';

interface Props {
  cidade: DadosCidadeMapa | null;
  resumo: RespostaMapa['resumoEstado'] | null;
  onClose: () => void;
}

export const MapaPainelLateral: React.FC<Props> = ({ cidade, resumo, onClose }) => {
  if (!cidade && !resumo) return null;

  const getHealthColor = (score: number) => {
    if (score >= 85) return 'text-emerald-500';
    if (score >= 70) return 'text-[#F5C400]';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const renderResumoEstado = () => (
    <div className="space-y-8 p-8">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-white mb-2 uppercase">Resumo do Estado</h2>
        <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Inteligência Territorial</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Total Voluntários</p>
          <p className="text-2xl font-black text-white">{resumo?.totalVoluntarios}</p>
        </div>
        <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Health Médio</p>
          <p className={`text-2xl font-black ${getHealthColor(resumo?.healthMedio || 0)}`}>{resumo?.healthMedio}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Alertas Críticos</h3>
        <div className="space-y-2">
          {resumo?.cidadesCriticas && resumo.cidadesCriticas > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <p className="text-xs font-bold text-red-400">{resumo.cidadesCriticas} cidades em estado crítico</p>
            </div>
          )}
          {resumo?.cidadesSemCoordenador && resumo.cidadesSemCoordenador > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-500" />
              <p className="text-xs font-bold text-orange-400">{resumo.cidadesSemCoordenador} cidades sem coordenação</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Oportunidades</h3>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <p className="text-xs font-bold text-emerald-400">{resumo?.oportunidadesNaoExploradas} zonas de alto momentum</p>
        </div>
      </div>
    </div>
  );

  const renderCidade = () => (
    <div className="space-y-8 p-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white mb-1 uppercase">{cidade?.cidade}</h2>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">{cidade?.estado} — {cidade?.classificacao}</p>
        </div>
        <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Health Score</p>
          <p className={`text-2xl font-black ${getHealthColor(cidade?.healthScore || 0)}`}>{cidade?.healthScore}</p>
        </div>
        <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Momentum</p>
          <p className={`text-2xl font-black ${cidade?.momentumScore && cidade.momentumScore > 0 ? 'text-emerald-500' : 'text-zinc-500'}`}>
            {cidade?.momentumScore && cidade.momentumScore > 0 ? '+' : ''}{cidade?.momentumScore}%
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Métricas da Base</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-600 uppercase">Total Voluntários</p>
            <p className="text-lg font-black text-white">{cidade?.totalVoluntarios}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-600 uppercase">Ativos (30d)</p>
            <p className="text-lg font-black text-emerald-500">{cidade?.voluntariosAtivos}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-600 uppercase">Líderes Emergentes</p>
            <p className="text-lg font-black text-[#F5C400]">{cidade?.lideresEmergentes}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-600 uppercase">Taxa Atividade</p>
            <p className="text-lg font-black text-white">{Math.round(cidade?.taxaAtividade || 0)}%</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Coordenação</h3>
        <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex items-center gap-4">
          <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-lg border border-zinc-700">
            {cidade?.temCoordenador ? '👤' : '⚠️'}
          </div>
          <div>
            <p className="text-xs font-bold text-white">{cidade?.nomeCoordenador || 'Sem coordenador'}</p>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Responsável Territorial</p>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button className="w-full bg-[#F5C400] text-black font-black py-4 rounded-2xl hover:bg-[#e0b300] transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#F5C400]/10 uppercase tracking-widest text-xs">
          Ver Detalhes da Cidade <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <motion.div 
      initial={{ x: 380 }}
      animate={{ x: 0 }}
      exit={{ x: 380 }}
      className="absolute top-0 right-0 bottom-0 w-[380px] bg-zinc-950 border-l border-zinc-800 z-[1001] shadow-2xl overflow-y-auto pointer-events-auto"
    >
      {cidade ? renderCidade() : renderResumoEstado()}
    </motion.div>
  );
};
