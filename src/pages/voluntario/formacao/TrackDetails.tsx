import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../components/AuthContext.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, BookOpen, Clock, Star, CheckCircle2, Play, Lock, Award, X } from 'lucide-react';

interface Module {
  id: string;
  title: string;
  description: string;
  type: string;
  display_order: number;
  duration_min: number;
  xp_reward: number;
  is_completed: boolean;
  quiz_score: number | null;
  completed_at: string | null;
}

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
  accent_color: string;
  percentage: number;
  is_completed: boolean;
  modules: Module[];
}

export const TrackDetails: React.FC = () => {
  const { trilhaId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  useEffect(() => {
    if (user && trilhaId) {
      fetch(`/api/formacao/trilhas/${trilhaId}?volunteerId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          setTrack(data);
          setLoading(false);
          
          // Check if just completed (simple logic for demo)
          if (data.is_completed && !localStorage.getItem(`track_congrats_${data.id}`)) {
            setShowCompletionModal(true);
            localStorage.setItem(`track_congrats_${data.id}`, 'true');
          }
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [user, trilhaId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F5C400]"></div>
      </div>
    );
  }

  if (!track) return <div>Trilha não encontrada</div>;

  const xpEarned = track.modules.reduce((acc, m) => acc + (m.is_completed ? m.xp_reward : 0), 0);
  const completedCount = track.modules.filter(m => m.is_completed).length;

  return (
    <div className="space-y-8 pb-12">
      {/* Breadcrumb & Back */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/voluntario/formacao')}
          className="p-2 rounded-full hover:bg-zinc-100 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-zinc-600" />
        </button>
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-400 uppercase tracking-widest">
          <Link to="/voluntario/formacao" className="hover:text-[#F5C400]">Formação</Link>
          <span>/</span>
          <span className="text-zinc-900">{track.title}</span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-zinc-900 p-8 md:p-12 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#F5C400]/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-black uppercase tracking-widest">
                {track.level}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-black uppercase tracking-widest" style={{ color: track.accent_color }}>
                {track.category}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black">{track.title}</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">{track.description}</p>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-xs font-black text-[#F5C400] uppercase tracking-widest mb-1">Objetivo</p>
              <p className="text-sm text-zinc-300 italic">"{track.objective}"</p>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center md:items-end gap-6 min-w-[240px]">
            <div className="grid grid-cols-3 gap-4 w-full">
              <div className="text-center">
                <p className="text-[10px] font-black text-zinc-500 uppercase">Módulos</p>
                <p className="text-xl font-black">{track.modules.length}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-zinc-500 uppercase">Minutos</p>
                <p className="text-xl font-black">{track.duration_min}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-zinc-500 uppercase">XP Total</p>
                <p className="text-xl font-black text-[#F5C400]">{track.total_xp}</p>
              </div>
            </div>
            
            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs font-bold text-zinc-400">
                <span>Progresso da Trilha</span>
                <span>{completedCount} de {track.modules.length} concluídos</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${track.percentage}%` }}
                  className="h-full bg-[#F5C400]"
                />
              </div>
              <p className="text-right text-[10px] font-black text-zinc-500 uppercase">
                {xpEarned} XP ganhos de {track.total_xp}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modules List */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-zinc-900">Módulos da Trilha</h2>
        <div className="space-y-3">
          {track.modules.map((module, idx) => {
            const isPreviousCompleted = idx === 0 || track.modules[idx - 1].is_completed;
            const isLocked = !isPreviousCompleted;
            const isCurrent = isPreviousCompleted && !module.is_completed;

            return (
              <div 
                key={module.id}
                className={`relative group rounded-2xl border-2 transition-all p-5 ${
                  module.is_completed 
                    ? 'border-emerald-500/20 bg-emerald-50/20' 
                    : isCurrent 
                      ? 'border-[#F5C400] bg-white shadow-md' 
                      : 'border-zinc-100 bg-zinc-50/50 opacity-60'
                }`}
              >
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      module.is_completed 
                        ? 'bg-emerald-500 text-white' 
                        : isCurrent 
                          ? 'bg-[#F5C400] text-zinc-900' 
                          : 'bg-zinc-200 text-zinc-400'
                    }`}>
                      {module.is_completed ? <CheckCircle2 className="w-6 h-6" /> : isLocked ? <Lock className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Módulo {idx + 1}</span>
                        {module.is_completed && <span className="text-emerald-600 text-[10px] font-black uppercase">Concluído</span>}
                        {isCurrent && <span className="text-[#F5C400] text-[10px] font-black uppercase">Próximo</span>}
                      </div>
                      <h3 className={`font-black ${module.is_completed ? 'text-zinc-700' : 'text-zinc-900'}`}>
                        {module.title}
                      </h3>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-400 uppercase">
                        <span className="flex items-center gap-1">{module.type}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">{module.duration_min} min</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-[10px] font-black text-zinc-400 uppercase">Recompensa</p>
                      <p className={`text-sm font-black ${module.is_completed ? 'text-emerald-600' : 'text-amber-600'}`}>
                        +{module.xp_reward} XP
                      </p>
                    </div>

                    {module.is_completed ? (
                      <button 
                        onClick={() => navigate(`/voluntario/formacao/trilha/${track.slug}/modulo/${module.id}`)}
                        className="px-6 py-2 rounded-xl border-2 border-zinc-200 text-zinc-500 font-black text-xs hover:bg-zinc-100 transition-all"
                      >
                        REVISAR
                      </button>
                    ) : isLocked ? (
                      <div className="px-6 py-2 rounded-xl bg-zinc-100 text-zinc-400 font-black text-xs flex items-center gap-2">
                        <Lock className="w-3 h-3" /> BLOQUEADO
                      </div>
                    ) : (
                      <button 
                        onClick={() => navigate(`/voluntario/formacao/trilha/${track.slug}/modulo/${module.id}`)}
                        className="px-6 py-2 rounded-xl bg-[#F5C400] text-zinc-900 font-black text-xs hover:bg-[#e0b300] shadow-sm transition-all animate-pulse"
                      >
                        COMEÇAR
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion Modal */}
      <AnimatePresence>
        {showCompletionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full text-center relative shadow-2xl"
            >
              <button 
                onClick={() => setShowCompletionModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-zinc-400" />
              </button>

              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10" />
              </div>

              <h2 className="text-2xl font-black text-zinc-900 mb-2">Parabéns!</h2>
              <p className="text-zinc-500 mb-6">Você concluiu com êxito a trilha <span className="font-bold text-zinc-900">"{track.title}"</span> e conquistou <span className="font-bold text-amber-600">+{track.total_xp} XP</span>!</p>

              <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 mb-8">
                <Award className="w-12 h-12 text-[#F5C400] mx-auto mb-3" />
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">Novo Certificado</p>
                <p className="font-bold text-zinc-900">Certificado de Conclusão</p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => navigate('/voluntario/formacao/certificados')}
                  className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-black hover:bg-zinc-800 transition-all"
                >
                  VER MEU CERTIFICADO
                </button>
                <button 
                  onClick={() => navigate('/voluntario/formacao')}
                  className="w-full bg-[#F5C400] text-zinc-900 py-4 rounded-2xl font-black hover:bg-[#e0b300] transition-all"
                >
                  PRÓXIMA TRILHA
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Trophy = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);
