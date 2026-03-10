import React from 'react';
import { motion } from 'motion/react';
import { Layers, Zap, TrendingUp, Star, AlertTriangle, Shield } from 'lucide-react';

interface Props {
  activeLayers: string[];
  toggleLayer: (id: string) => void;
}

export const MapaControles: React.FC<Props> = ({ activeLayers, toggleLayer }) => {
  const layers = [
    { id: 'base', label: 'Força da Base', icon: Zap, desc: 'Tamanho e saúde da presença' },
    { id: 'momentum', label: 'Momentum', icon: TrendingUp, desc: 'Crescimento vs Enfraquecimento' },
    { id: 'liderancas', label: 'Lideranças', icon: Star, desc: 'Líderes e Coordenadores' },
    { id: 'alertas', label: 'Alertas Críticos', icon: AlertTriangle, desc: 'Zonas de risco operacional' },
    { id: 'cobertura', label: 'Cobertura', icon: Shield, desc: 'Capilaridade territorial' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute top-6 left-6 z-[1000] space-y-2 pointer-events-auto"
    >
      <div className="bg-zinc-900/90 backdrop-blur-md p-4 rounded-2xl border border-zinc-800 shadow-2xl w-64">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-[#F5C400]" />
          <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Camadas de Inteligência</h4>
        </div>

        <div className="space-y-1">
          {layers.map((layer) => {
            const isActive = activeLayers.includes(layer.id);
            return (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${
                  isActive 
                    ? 'bg-[#F5C400] text-black' 
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <layer.icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-zinc-500 group-hover:text-[#F5C400]'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider leading-none mb-1">{layer.label}</p>
                  <p className={`text-[9px] font-medium leading-tight ${isActive ? 'text-black/60' : 'text-zinc-600'}`}>
                    {layer.desc}
                  </p>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest text-center">
            Máximo 3 camadas simultâneas
          </p>
        </div>
      </div>
    </motion.div>
  );
};
