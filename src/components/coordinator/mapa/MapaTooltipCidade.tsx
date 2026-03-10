import React from 'react';
import { DadosCidadeMapa } from '../../../lib/mapa-dados.ts';
import { TrendingUp, TrendingDown, Minus, Star } from 'lucide-react';

interface Props {
  cidade: DadosCidadeMapa;
}

export const MapaTooltipCidade: React.FC<Props> = ({ cidade }) => {
  const getTrendIcon = () => {
    if (cidade.tendenciaDirecao === 'CRESCIMENTO') return <TrendingUp className="w-3 h-3 text-emerald-500" />;
    if (cidade.tendenciaDirecao === 'QUEDA') return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-zinc-500" />;
  };

  return (
    <div className="p-3 min-w-[200px] bg-zinc-900 text-white rounded-xl border border-zinc-800 shadow-2xl font-sans">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-black tracking-tight">🏙️ {cidade.cidade} — {cidade.estado}</h4>
      </div>
      
      <div className="space-y-2">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            <span>Health Score</span>
            <span className={cidade.healthScore >= 70 ? 'text-emerald-500' : 'text-yellow-500'}>{cidade.healthScore}</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full ${cidade.healthScore >= 70 ? 'bg-emerald-500' : 'bg-yellow-500'}`} 
              style={{ width: `${cidade.healthScore}%` }} 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <p className="text-[10px] font-black text-zinc-600 uppercase">Voluntários</p>
            <p className="text-xs font-bold">{cidade.totalVoluntarios}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-600 uppercase">Ativos</p>
            <p className="text-xs font-bold text-emerald-500">{cidade.voluntariosAtivos}</p>
          </div>
        </div>

        {cidade.lideresEmergentes > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-black text-[#F5C400] uppercase tracking-widest pt-1">
            <Star className="w-3 h-3 fill-[#F5C400]" /> {cidade.lideresEmergentes} líderes emergentes
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {cidade.tendenciaDirecao === 'CRESCIMENTO' ? '+' : ''}{cidade.tendenciaPercentual}% esta sem.
            </span>
          </div>
        </div>
      </div>
      
      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-3 text-center">
        [Clique para mais detalhes]
      </p>
    </div>
  );
};
