import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../components/AuthContext.tsx';
import { motion } from 'motion/react';
import { GraduationCap, BookOpen, Award, CheckCircle2, Lock, ArrowRight, Play, Trophy } from 'lucide-react';

interface Track {
  id: string;
  slug: string;
  title: string;
  description: string;
  objective: string;
  level: string;
  category: string;
  total_xp: number;
  duration_min: number;
  display_order: number;
  is_mandatory: boolean;
  accent_color: string;
  prerequisite_slug: string | null;
  percentage: number;
  is_completed: boolean;
  completed_modules: number;
  total_modules: number;
  next_module_id: string | null;
  has_certificate: boolean;
}

export const TrainingHub: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch(`/api/formacao/trilhas?volunteerId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          setTracks(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F5C400]"></div>
      </div>
    );
  }

  const mandatoryTrack = tracks.find(t => t.is_mandatory);
  const otherTracks = tracks.filter(t => !t.is_mandatory);
  const totalCompletedModules = tracks.reduce((acc, t) => acc + t.completed_modules, 0);
  const totalModules = tracks.reduce((acc, t) => acc + t.total_modules, 0);
  const totalXpEarned = user?.xp_total || 0; // Simplified
  const totalCertificates = tracks.filter(t => t.has_certificate).length;

  const currentTrack = tracks.find(t => t.percentage > 0 && t.percentage < 100) || tracks.find(t => t.percentage === 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-zinc-900 flex items-center gap-3">
          <GraduationCap className="w-10 h-10 text-[#F5C400]" />
          Academia Missão
        </h1>
        <p className="text-zinc-500 mt-2">Cada módulo concluído te torna um militante mais poderoso</p>
      </div>

      {/* Progress Banner */}
      <div className="bg-zinc-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div className="md:col-span-2 space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-zinc-400 text-sm uppercase tracking-wider font-bold">Seu Progresso Geral</p>
                <h2 className="text-2xl font-bold mt-1">{Math.round((totalCompletedModules / totalModules) * 100)}% Concluído</h2>
              </div>
              <div className="text-right">
                <p className="text-zinc-400 text-xs">{totalCompletedModules} de {totalModules} módulos</p>
              </div>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(totalCompletedModules / totalModules) * 100}%` }}
                className="h-full bg-[#F5C400]"
              />
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center border-l border-zinc-800 px-4">
            <p className="text-zinc-400 text-xs uppercase font-bold">XP Formação</p>
            <p className="text-2xl font-black text-[#F5C400]">{totalXpEarned}</p>
          </div>

          <div className="flex flex-col items-center justify-center border-l border-zinc-800 px-4">
            <p className="text-zinc-400 text-xs uppercase font-bold">Certificados</p>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              <p className="text-2xl font-black">{totalCertificates}</p>
            </div>
          </div>
        </div>

        {currentTrack && currentTrack.next_module_id && (
          <div className="mt-6 pt-6 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-[#F5C400]">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Continue de onde parou:</p>
                <p className="text-sm font-bold">{currentTrack.title}</p>
              </div>
            </div>
            <button 
              onClick={() => navigate(`/voluntario/formacao/trilha/${currentTrack.slug}/modulo/${currentTrack.next_module_id}`)}
              className="bg-[#F5C400] text-zinc-900 px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-[#e0b300] transition-colors"
            >
              <Play className="w-4 h-4 fill-current" /> Continuar
            </button>
          </div>
        )}
      </div>

      {/* Mandatory Track */}
      {mandatoryTrack && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
              ⚡ OBRIGATÓRIO PARA TODOS
            </div>
          </div>
          
          <div className={`relative overflow-hidden rounded-2xl border-2 ${mandatoryTrack.is_completed ? 'border-emerald-500/20 bg-emerald-50/30' : 'border-[#F5C400] bg-white'} p-6 shadow-sm`}>
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-zinc-900">{mandatoryTrack.title}</h3>
                  {mandatoryTrack.is_completed && (
                    <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-100 px-2 py-1 rounded-lg">
                      <CheckCircle2 className="w-3 h-3" /> Concluída
                    </span>
                  )}
                </div>
                <p className="text-zinc-600 text-sm leading-relaxed max-w-2xl">{mandatoryTrack.description}</p>
                <div className="flex flex-wrap gap-4 text-xs font-bold text-zinc-400">
                  <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {mandatoryTrack.total_modules} módulos</span>
                  <span className="flex items-center gap-1">⏱️ {mandatoryTrack.duration_min} min</span>
                  <span className="flex items-center gap-1 text-amber-600">⭐ {mandatoryTrack.total_xp} XP</span>
                </div>
              </div>
              
              <div className="flex flex-col justify-center items-end gap-4 min-w-[200px]">
                {!mandatoryTrack.is_completed && (
                  <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs font-bold text-zinc-500">
                      <span>Progresso</span>
                      <span>{Math.round(mandatoryTrack.percentage)}%</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#F5C400]" style={{ width: `${mandatoryTrack.percentage}%` }} />
                    </div>
                  </div>
                )}
                <Link 
                  to={`/voluntario/formacao/trilha/${mandatoryTrack.slug}`}
                  className={`w-full text-center py-3 rounded-xl font-black transition-all ${
                    mandatoryTrack.is_completed 
                      ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200' 
                      : 'bg-[#F5C400] text-zinc-900 hover:bg-[#e0b300] shadow-md'
                  }`}
                >
                  {mandatoryTrack.is_completed ? 'REVISAR TRILHA' : mandatoryTrack.percentage > 0 ? 'CONTINUAR' : 'COMEÇAR AGORA'}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Other Tracks */}
      <section className="space-y-6">
        <h3 className="text-xl font-black text-zinc-900">Trilhas disponíveis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {otherTracks.map(track => {
            const isLocked = track.prerequisite_slug && !tracks.find(t => t.slug === track.prerequisite_slug)?.is_completed;
            
            return (
              <div 
                key={track.id}
                className={`group relative flex flex-col rounded-2xl border border-zinc-200 bg-white overflow-hidden transition-all hover:shadow-lg ${isLocked ? 'opacity-75 grayscale' : ''}`}
              >
                <div className="h-2 w-full" style={{ backgroundColor: track.accent_color }} />
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        {track.level} · {track.category}
                      </span>
                      <h4 className="text-lg font-black text-zinc-900 group-hover:text-[#F5C400] transition-colors">
                        {track.title}
                      </h4>
                    </div>
                    {track.is_completed && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                    {isLocked && <Lock className="w-5 h-5 text-zinc-400" />}
                  </div>

                  <p className="text-zinc-500 text-sm line-clamp-2 mb-6">
                    {track.description}
                  </p>

                  <div className="flex items-center gap-4 text-[10px] font-black text-zinc-400 uppercase mb-6">
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {track.total_modules} módulos</span>
                    <span className="flex items-center gap-1">⏱️ {track.duration_min} min</span>
                    <span className="flex items-center gap-1 text-amber-600">⭐ {track.total_xp} XP</span>
                  </div>

                  <div className="mt-auto space-y-4">
                    {track.percentage > 0 && !track.is_completed && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black text-zinc-500">
                          <span>PROGRESSO</span>
                          <span>{Math.round(track.percentage)}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#F5C400]" style={{ width: `${track.percentage}%` }} />
                        </div>
                      </div>
                    )}

                    {isLocked ? (
                      <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold bg-zinc-50 p-3 rounded-xl border border-dashed border-zinc-200">
                        <Lock className="w-4 h-4" />
                        Complete "{tracks.find(t => t.slug === track.prerequisite_slug)?.title}" primeiro
                      </div>
                    ) : (
                      <Link 
                        to={`/voluntario/formacao/trilha/${track.slug}`}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${
                          track.is_completed 
                            ? 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100' 
                            : track.percentage > 0 
                              ? 'bg-[#F5C400] text-zinc-900 hover:bg-[#e0b300]' 
                              : 'border-2 border-zinc-100 text-zinc-900 hover:border-[#F5C400] hover:bg-[#F5C400]/5'
                        }`}
                      >
                        {track.is_completed ? 'REVISAR' : track.percentage > 0 ? 'CONTINUAR' : 'COMEÇAR TRILHA'}
                        {!track.is_completed && <ArrowRight className="w-4 h-4" />}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Learning Journey Timeline */}
      <section className="bg-white rounded-2xl border border-zinc-200 p-8">
        <h3 className="text-xl font-black text-zinc-900 mb-8">Minha Jornada de Aprendizado</h3>
        <div className="relative space-y-8">
          {/* Vertical Line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-zinc-100" />
          
          {tracks.sort((a, b) => a.display_order - b.display_order).map((track, idx) => {
            const isLocked = track.prerequisite_slug && !tracks.find(t => t.slug === track.prerequisite_slug)?.is_completed;
            
            return (
              <Link 
                key={track.id}
                to={isLocked ? '#' : `/voluntario/formacao/trilha/${track.slug}`}
                className={`relative flex items-center gap-6 group ${isLocked ? 'cursor-not-allowed' : ''}`}
              >
                <div className={`z-10 w-6 h-6 rounded-full border-4 border-white shadow-sm transition-colors ${
                  track.is_completed ? 'bg-emerald-500' : track.percentage > 0 ? 'bg-[#F5C400]' : isLocked ? 'bg-zinc-200' : 'bg-zinc-300'
                }`} />
                
                <div className="flex-1 flex items-center justify-between">
                  <span className={`font-bold transition-colors ${
                    track.is_completed ? 'text-zinc-900' : track.percentage > 0 ? 'text-zinc-900' : isLocked ? 'text-zinc-400' : 'text-zinc-600'
                  } group-hover:text-[#F5C400]`}>
                    {track.title}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {track.is_completed ? (
                      <span className="text-emerald-600 text-[10px] font-black uppercase">✅ Concluída</span>
                    ) : track.percentage > 0 ? (
                      <span className="text-[#F5C400] text-[10px] font-black uppercase">🔄 {Math.round(track.percentage)}%</span>
                    ) : isLocked ? (
                      <span className="text-zinc-400 text-[10px] font-black uppercase">🔒 Bloqueada</span>
                    ) : (
                      <span className="text-zinc-400 text-[10px] font-black uppercase">⏳ Disponível</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Certificates Link */}
      <div className="flex justify-center">
        <Link 
          to="/voluntario/formacao/certificados"
          className="flex items-center gap-2 text-zinc-500 hover:text-[#F5C400] font-bold transition-colors"
        >
          <Trophy className="w-5 h-5" />
          Ver todos os meus certificados conquistados
        </Link>
      </div>
    </div>
  );
};
