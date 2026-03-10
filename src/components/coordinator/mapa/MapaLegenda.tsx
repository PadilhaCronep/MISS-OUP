import React from 'react';
import { motion } from 'motion/react';

export const MapaLegenda: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-6 left-6 z-[1000] bg-zinc-900/90 backdrop-blur-md p-4 rounded-2xl border border-zinc-800 shadow-2xl pointer-events-auto"
    >
      <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3">Legenda do Mapa</h4>
      
      <div className="space-y-4">
        <div>
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">Health Score (Círculos)</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-zinc-400">85-100</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#F5C400]" />
              <span className="text-[10px] font-bold text-zinc-400">70-84</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-[10px] font-bold text-zinc-400">40-69</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-[10px] font-bold text-zinc-400">0-39</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">Momentum</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold text-xs">↑</span>
                <span className="text-[10px] font-bold text-zinc-400">Crescimento</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-500 font-bold text-xs">↓</span>
                <span className="text-[10px] font-bold text-zinc-400">Queda</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">Liderança</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs">⭐</span>
                <span className="text-[10px] font-bold text-zinc-400">Estrutura Completa</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">🛡️</span>
                <span className="text-[10px] font-bold text-zinc-400">Coordenado</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
