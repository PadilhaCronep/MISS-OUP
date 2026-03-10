import React, { useEffect, useState, Suspense } from 'react';
import { useAuth } from '../../components/AuthContext.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Users, 
  Zap, 
  Target, 
  Star, 
  TrendingUp, 
  AlertTriangle, 
  ChevronRight,
  Search,
  Filter,
  Download,
  LayoutGrid,
  Map as MapIcon
} from 'lucide-react';

const MapaInteligencia = React.lazy(() => import('../../components/coordinator/mapa/MapaInteligencia.tsx'));

export const Territories: React.FC = () => {
  const { user } = useAuth();
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  useEffect(() => {
    const fetchTerritories = async () => {
      try {
        const res = await fetch(`/api/coordenador/territorios?state=${user?.state}`);
        const data = await res.json();
        setCities(data);
      } catch (error) {
        console.error('Error fetching territories:', error);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchTerritories();
  }, [user]);

  const getHealthColor = (score: number) => {
    if (score >= 70) return 'text-emerald-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthBg = (score: number) => {
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">Visão Territorial</h1>
          <p className="text-zinc-500 font-medium">Saúde e expansão do movimento no estado de <span className="text-[#F5C400]">{user?.state}</span></p>
        </div>
        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="bg-zinc-900 p-1 rounded-xl border border-zinc-800 flex">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'grid' ? 'bg-[#F5C400] text-black shadow-lg' : 'text-zinc-500 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grade
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'map' ? 'bg-[#F5C400] text-black shadow-lg' : 'text-zinc-500 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Mapa
            </button>
          </div>

          <button className="bg-zinc-900 text-white font-bold py-3 px-6 rounded-xl border border-zinc-800 hover:bg-zinc-800 transition-all flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Exportar Relatório
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#111111] p-6 rounded-3xl border border-zinc-800">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Cidades com Presença</p>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-black text-white">12</span>
                  <span className="text-zinc-500 font-bold mb-1">de 645 cidades</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mt-4">
                  <div className="h-full bg-[#F5C400] w-[2%]" />
                </div>
              </div>
              <div className="bg-[#111111] p-6 rounded-3xl border border-zinc-800">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Capilaridade Estadual</p>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-black text-white">1.8%</span>
                  <span className="text-emerald-500 font-bold mb-1 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> +0.2%
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-4 font-bold uppercase tracking-wider">Meta do trimestre: 5%</p>
              </div>
              <div className="bg-[#111111] p-6 rounded-3xl border border-zinc-800">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Saúde Média do Estado</p>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-black text-[#F5C400]">62</span>
                  <span className="text-zinc-500 font-bold mb-1">/ 100</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mt-4">
                  <div className="h-full bg-[#F5C400] w-[62%]" />
                </div>
              </div>
            </div>

            {/* Cities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cities.map((city, i) => (
                <motion.div
                  key={city.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-[#111111] p-6 rounded-[32px] border ${city.health < 40 ? 'border-red-500/30' : 'border-zinc-800'} hover:border-[#F5C400]/30 transition-all group relative overflow-hidden`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-xl border border-zinc-800">
                        🏙️
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white group-hover:text-[#F5C400] transition-colors">{city.name}</h3>
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{user?.state}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black ${getHealthColor(city.health)}`}>{city.health}</p>
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Health Score</p>
                    </div>
                  </div>

                  <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden mb-8">
                    <div className={`h-full ${getHealthBg(city.health)}`} style={{ width: `${city.health}%` }} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800/50">
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Voluntários</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{city.volunteers}</span>
                        <span className="text-[10px] font-bold text-emerald-500">+{Math.floor(city.volunteers * 0.1)}</span>
                      </div>
                    </div>
                    <div className="bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800/50">
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Ativos</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{city.active}</span>
                        <span className="text-[10px] font-bold text-zinc-500">{Math.round((city.active / city.volunteers) * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 font-bold">Coordenador:</span>
                      <span className={`font-black ${city.coordinator ? 'text-white' : 'text-red-500'}`}>
                        {city.coordinator || '⚠️ Sem Coordenador'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 font-bold">Último Contato:</span>
                      <span className="text-zinc-400 font-bold">{city.lastContact}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 bg-zinc-900 text-white font-black py-3 rounded-xl hover:bg-zinc-800 transition-all text-[10px] uppercase tracking-widest border border-zinc-800">
                      Ver Voluntários
                    </button>
                    <button className="flex-1 bg-[#F5C400]/10 text-[#F5C400] font-black py-3 rounded-xl hover:bg-[#F5C400] hover:text-black transition-all text-[10px] uppercase tracking-widest">
                      Criar Missão
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="map-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full"
          >
            <Suspense fallback={
              <div className="w-full h-[calc(100vh-200px)] bg-zinc-950 rounded-[40px] border border-zinc-800 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <MapaInteligencia />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
