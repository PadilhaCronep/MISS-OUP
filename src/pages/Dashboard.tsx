import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Zap, Users, Trophy, Flame, Clock, CheckCircle2, AlertCircle, X, Upload, MapPin, GraduationCap, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [trainingTracks, setTrainingTracks] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [selectedMission, setSelectedMission] = useState<any | null>(null);
  const [evidenceContent, setEvidenceContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetch(`/api/users/${user.id}/stats`)
        .then(res => res.json())
        .then(data => setStats(data));
      
      fetch('/api/missions')
        .then(res => res.json())
        .then(data => setMissions(data.missions));

      fetch(`/api/formacao/trilhas?volunteerId=${user.id}`)
        .then(res => res.json())
        .then(data => setTrainingTracks(data));
    }
  }, [user]);

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMission) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/missions/${selectedMission.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volunteer_id: user?.id,
          evidence_content: evidenceContent,
          evidence_url: selectedMission.evidence_type === 'PHOTO' ? 'https://example.com/photo.jpg' : null
        })
      });
      if (res.ok) {
        alert('Missão enviada com sucesso!');
        setSelectedMission(null);
        setEvidenceContent('');
        // Refresh stats
        fetch(`/api/users/${user?.id}/stats`)
          .then(res => res.json())
          .then(data => setStats(data));
      }
    } catch (error) {
      alert('Erro ao enviar missão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!stats) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F5C400]"></div></div>;

  const filteredMissions = filter === 'ALL' ? missions : missions.filter(m => m.type === filter);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'URGENTE': return 'border-red-500 bg-red-50 text-red-700';
      case 'PRIORITARIA': return 'border-yellow-500 bg-yellow-50 text-yellow-700';
      default: return 'border-green-500 bg-green-50 text-green-700';
    }
  };

  const getMissionIcon = (type: string) => {
    switch (type) {
      case 'DIGITAL': return <Zap className="w-5 h-5" />;
      case 'TERRITORIAL': return <Target className="w-5 h-5" />;
      case 'RECRUTAMENTO': return <Users className="w-5 h-5" />;
      default: return <CheckCircle2 className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Identity Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F5C400] opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center border-2 border-[#F5C400] shadow-[0_0_15px_rgba(245,196,0,0.3)]">
              <span className="text-3xl font-bold text-[#F5C400]">{user?.name.charAt(0)}</span>
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{user?.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-3 py-1 bg-zinc-800 rounded-full text-sm font-medium text-zinc-300 border border-zinc-700">
                  Nível {stats.current_level} — 🔥 Militante
                </span>
                {stats.current_streak > 0 && (
                  <span className="flex items-center gap-1 text-orange-400 font-bold text-sm bg-orange-400/10 px-3 py-1 rounded-full">
                    <Flame className="w-4 h-4" /> {stats.current_streak} dias
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-64 bg-zinc-800 p-4 rounded-2xl border border-zinc-700">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-400 font-medium">Progresso para Nível {stats.current_level + 1}</span>
              <span className="text-[#F5C400] font-bold">{stats.xp_total} XP</span>
            </div>
            <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
              <div className="h-full bg-[#F5C400] rounded-full" style={{ width: `${(stats.xp_total % 1000) / 10}%` }}></div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'XP Total', value: stats.xp_total, icon: Zap, color: 'text-[#F5C400]' },
          { label: 'Missões', value: stats.missions_completed, icon: Target, color: 'text-emerald-500' },
          { label: 'Recrutados', value: stats.volunteers_recruited, icon: Users, color: 'text-blue-500' },
          { label: 'Ranking Local', value: `#${stats.cityRanking}`, icon: Trophy, color: 'text-purple-500' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-zinc-500">{stat.label}</span>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <span className="text-3xl font-mono font-bold text-zinc-900">{stat.value}</span>
          </motion.div>
        ))}
      </div>

      {/* Training Progress */}
      {trainingTracks.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Sua Formação</h3>
                <p className="text-xs text-zinc-500">Continue evoluindo seu conhecimento</p>
              </div>
            </div>
            <Link to="/voluntario/formacao" className="text-sm font-bold text-[#F5C400] hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trainingTracks.filter(t => t.percentage > 0 && t.percentage < 100).length > 0 ? (
              trainingTracks.filter(t => t.percentage > 0 && t.percentage < 100).slice(0, 2).map(track => (
                <div key={track.id} className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-zinc-900 text-sm">{track.title}</h4>
                    <span className="text-xs font-black text-[#F5C400]">{Math.round(track.percentage)}%</span>
                  </div>
                  <div className="h-2 bg-zinc-200 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-[#F5C400]" style={{ width: `${track.percentage}%` }} />
                  </div>
                  <Link 
                    to={`/voluntario/formacao/trilha/${track.slug}`}
                    className="w-full py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors text-center block"
                  >
                    CONTINUAR TRILHA
                  </Link>
                </div>
              ))
            ) : (
              <div className="md:col-span-2 bg-zinc-50 rounded-2xl p-8 text-center border border-zinc-100 border-dashed">
                <p className="text-zinc-500 text-sm mb-4">Você ainda não começou nenhuma trilha de formação.</p>
                <Link 
                  to="/voluntario/formacao"
                  className="inline-flex items-center gap-2 bg-[#F5C400] text-zinc-900 px-6 py-2 rounded-xl font-bold text-sm hover:bg-[#e0b300] transition-colors"
                >
                  Começar agora <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Mission Feed */}
      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">Missões Disponíveis</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
            {['ALL', 'DIGITAL', 'TERRITORIAL', 'RECRUITMENT', 'TRAINING'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === f 
                    ? 'bg-zinc-900 text-white' 
                    : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                {f === 'ALL' ? 'Todas' : f}
              </button>
            ))}
          </div>
        </div>

        {filteredMissions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-zinc-200 border-dashed">
            <Target className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">Nenhuma missão disponível no momento.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredMissions.map((mission, i) => (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-white p-6 rounded-2xl shadow-sm border-l-4 ${getUrgencyColor(mission.urgency).split(' ')[0]} border-y border-r border-zinc-200 flex flex-col cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => setSelectedMission(mission)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
                      {getMissionIcon(mission.type)}
                    </div>
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md mb-1 inline-block ${getUrgencyColor(mission.urgency)}`}>
                        {mission.urgency === 'URGENT' ? 'URGENTE' : mission.urgency === 'PRIORITY' ? 'PRIORITÁRIA' : 'CONTÍNUA'}
                      </span>
                      <h4 className="text-lg font-bold text-zinc-900 leading-tight">{mission.title}</h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-mono font-bold text-[#F5C400]">+{mission.xp_reward}</span>
                    <span className="block text-xs font-bold text-zinc-400 uppercase">XP</span>
                  </div>
                </div>
                
                <p className="text-zinc-600 text-sm mb-6 flex-1 line-clamp-2">{mission.description}</p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-100">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                    <Clock className="w-4 h-4" />
                    {mission.deadline ? format(new Date(mission.deadline), "dd MMM, HH:mm", { locale: ptBR }) : 'Sem prazo'}
                  </div>
                  <button className="bg-zinc-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors shadow-sm">
                    Aceitar Missão
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Mission Details Modal */}
      <AnimatePresence>
        {selectedMission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-zinc-100 flex justify-between items-start bg-zinc-50">
                <div>
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md mb-2 inline-block ${getUrgencyColor(selectedMission.urgency)}`}>
                    {selectedMission.urgency === 'URGENT' ? 'URGENTE' : selectedMission.urgency === 'PRIORITY' ? 'PRIORITÁRIA' : 'CONTÍNUA'}
                  </span>
                  <h2 className="text-2xl font-bold text-zinc-900">{selectedMission.title}</h2>
                </div>
                <button onClick={() => setSelectedMission(null)} className="p-2 text-zinc-400 hover:text-zinc-900 bg-white rounded-full shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <p className="text-zinc-600 mb-6 text-lg leading-relaxed">{selectedMission.description}</p>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Recompensa da Missão</span>
                  </div>
                  <span className="text-2xl font-mono font-bold text-yellow-600">+{selectedMission.xp_reward} XP</span>
                </div>

                <form onSubmit={handleSubmitEvidence} className="space-y-4">
                  <h3 className="font-bold text-zinc-900">Evidência Necessária</h3>
                  
                  {selectedMission.evidence_type === 'TEXT' && (
                    <textarea 
                      required
                      placeholder="Descreva como você concluiu a missão..."
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 focus:ring-2 focus:ring-[#F5C400] focus:border-transparent outline-none min-h-[120px]"
                      value={evidenceContent}
                      onChange={e => setEvidenceContent(e.target.value)}
                    />
                  )}
                  
                  {selectedMission.evidence_type === 'LINK' && (
                    <input 
                      type="url"
                      required
                      placeholder="https://..."
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 focus:ring-2 focus:ring-[#F5C400] focus:border-transparent outline-none"
                      value={evidenceContent}
                      onChange={e => setEvidenceContent(e.target.value)}
                    />
                  )}
                  
                  {selectedMission.evidence_type === 'PHOTO' && (
                    <div className="border-2 border-dashed border-zinc-300 rounded-2xl p-8 text-center hover:bg-zinc-50 transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-zinc-600">Clique para fazer upload da foto</p>
                      <p className="text-xs text-zinc-400 mt-1">PNG, JPG até 5MB</p>
                    </div>
                  )}

                  {selectedMission.evidence_type === 'NONE' && (
                    <div className="bg-zinc-50 p-4 rounded-xl text-sm text-zinc-600 text-center border border-zinc-200">
                      Nenhuma evidência necessária. Basta confirmar a conclusão.
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-[#F5C400] text-zinc-900 font-bold py-4 px-6 rounded-xl hover:bg-[#e0b300] transition-colors shadow-sm mt-4 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar Evidência e Concluir'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
