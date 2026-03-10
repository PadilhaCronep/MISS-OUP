import React from 'react';
import { DadosCidadeMapa } from '../../../lib/mapa-dados.ts';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface Props {
  cidades: DadosCidadeMapa[];
}

export const MapaAlertasOverlay: React.FC<Props> = ({ cidades }) => {
  const cidadesComAlertas = cidades.filter(c => c.alertas.length > 0);

  if (cidadesComAlertas.length === 0) return null;

  return (
    <div className="absolute top-6 right-[400px] z-[1000] space-y-2 pointer-events-none">
      {cidadesComAlertas.slice(0, 3).map((cidade, i) => (
        <div 
          key={cidade.cidadeId}
          className="bg-red-500/10 backdrop-blur-md border border-red-500/20 p-3 rounded-xl flex items-center gap-3 animate-pulse pointer-events-auto cursor-pointer hover:bg-red-500/20 transition-all shadow-lg"
        >
          <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none mb-1">Alerta Crítico</p>
            <p className="text-[10px] font-bold text-white leading-tight">
              {cidade.cidade}: {cidade.alertas[0].mensagem}
            </p>
          </div>
        </div>
      ))}
      {cidadesComAlertas.length > 3 && (
        <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest text-right pr-2">
          + {cidadesComAlertas.length - 3} outros alertas
        </div>
      )}
    </div>
  );
};
