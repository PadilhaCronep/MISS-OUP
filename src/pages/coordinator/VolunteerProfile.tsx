import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext.tsx';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Target, 
  Crown, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Calendar, 
  Mail, 
  Phone, 
  Zap, 
  Star,
  Download,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const VolunteerProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/coordenador/voluntarios/${id}`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, [id]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { volunteer, history, badges } = data;

  const stats = [
    { label: 'XP Total', value: volunteer.xp_total, icon: Zap, color: 'text-[#F5C400]' },
    { label: 'Missões', value: volunteer.missions_completed, icon: Target, color: 'text-blue-500' },
    { label: 'Streak', value: `🔥 ${volunteer.current_streak} dias`, icon: Clock, color: 'text-orange-500' },
    { label: 'Recrutados', value: volunteer.volunteers_recruited, icon: Star, color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/coordinator/volunteers')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all font-bold text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para lista
        </button>
        <div className="flex gap-3">
          <button className="bg-zinc-900 text-white font-bold py-2.5 px-4 rounded-xl border border-zinc-800 hover:bg-zinc-800 transition-all flex items-center gap-2 text-xs">
            <Download className="w-4 h-4" /> Exportar Histórico
          </button>
          {volunteer.leadership_score >= 70 && volunteer.role === 'VOLUNTARIO' && (
            <button className="bg-[#F5C400] text-black font-black py-2.5 px-4 rounded-xl hover:bg-[#e0b300] transition-all flex items-center gap-2 text-xs shadow-lg">
              <Crown className="w-4 h-4" /> Promover a Coordenador
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="w-24 h-24 bg-zinc-800 rounded-3xl flex items-center justify-center text-4xl border-2 border-[#F5C400]/20 shadow-[0_0_30px_rgba(245,196,0,0.1)]">
          {volunteer.photo_url ? <img src={volunteer.photo_url} className="w-full h-full object-cover rounded-3xl" /> : '👤'}
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">{volunteer.name}</h1>
          <div className="flex flex-wrap gap-2">
            <span className="bg-[#F5C400] text-black text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">Nível {volunteer.current_level}</span>
            <span className="bg-zinc-900 text-zinc-400 text-[10px] font-black px-2 py-1 rounded border border-zinc-800 uppercase tracking-wider">{(volunteer.role || '').replace('_', ' ')}</span>
            <span className="bg-zinc-900 text-zinc-400 text-[10px] font-black px-2 py-1 rounded border border-zinc-800 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {volunteer.city}, {volunteer.state}
            </span>
            <span className="bg-zinc-900 text-zinc-400 text-[10px] font-black px-2 py-1 rounded border border-zinc-800 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Membro desde {format(new Date(volunteer.created_at), "MMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Stats & History */}
        <div className="lg:col-span-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-[#111111] p-5 rounded-2xl border border-zinc-800"
              >
                <div className="flex items-center justify-between mb-3">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-black text-white mb-1">{stat.value}</p>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Mission History */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-[#F5C400]" /> HISTÓRICO DE MISSÕES
              </h2>
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{history.length} missões</span>
            </div>
            
            <div className="bg-[#111111] rounded-2xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-900/50 border-b border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    <th className="p-5">Missão</th>
                    <th className="p-5">Tipo</th>
                    <th className="p-5">Data</th>
                    <th className="p-5">XP</th>
                    <th className="p-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {history.map((h: any) => (
                    <tr key={h.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-all">
                      <td className="p-5 font-bold text-white">{h.mission_title}</td>
                      <td className="p-5">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">{h.mission_type}</span>
                      </td>
                      <td className="p-5 text-zinc-400 text-xs">{format(new Date(h.submitted_at), "dd/MM/yyyy HH:mm")}</td>
                      <td className="p-5 font-black text-[#F5C400]">+{h.xp_awarded}</td>
                      <td className="p-5 text-right">
                        <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider ${
                          h.validation_status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                          h.validation_status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                          'bg-orange-500/10 text-orange-500'
                        }`}>
                          {h.validation_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Column: Profile Details */}
        <div className="lg:col-span-4 space-y-8">
          {/* Leadership Score */}
          <section className="bg-[#111111] p-6 rounded-3xl border border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Score de Liderança</h3>
              <span className={`text-2xl font-black ${volunteer.leadership_score >= 70 ? 'text-emerald-500' : volunteer.leadership_score >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                {volunteer.leadership_score}
              </span>
            </div>
            <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden mb-6">
              <div 
                className={`h-full transition-all duration-1000 ${volunteer.leadership_score >= 70 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : volunteer.leadership_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                style={{ width: `${volunteer.leadership_score}%` }} 
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-bold">Engajamento</span>
                <span className="text-white font-black">85%</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-bold">Recrutamento</span>
                <span className="text-white font-black">42%</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-bold">Consistência</span>
                <span className="text-white font-black">91%</span>
              </div>
            </div>
            
            {volunteer.leadership_score >= 70 && (
              <div className="mt-8 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                <Star className="w-5 h-5 text-emerald-500" />
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Pronto para liderar</p>
              </div>
            )}
          </section>

          {/* Contact & Info */}
          <section className="bg-[#111111] p-6 rounded-3xl border border-zinc-800 space-y-6">
            <div>
              <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Contato</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <Mail className="w-4 h-4 text-zinc-600" /> {volunteer.email}
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <Phone className="w-4 h-4 text-zinc-600" /> {volunteer.phone_whatsapp}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Habilidades</h3>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  let skillsArray = [];
                  try {
                    skillsArray = typeof volunteer.skills === 'string' ? JSON.parse(volunteer.skills) : (volunteer.skills || []);
                  } catch (e) {
                    skillsArray = volunteer.skills ? volunteer.skills.split(',').map((s: string) => s.trim()) : [];
                  }
                  
                  if (!Array.isArray(skillsArray)) skillsArray = [];
                  
                  return skillsArray.length > 0 ? skillsArray.map((skill: string) => (
                    <span key={skill} className="bg-zinc-800 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded border border-zinc-700">
                      {skill}
                    </span>
                  )) : <span className="text-zinc-600 italic text-xs">Nenhuma declarada</span>;
                })()}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Observações Internas</h3>
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <p className="text-xs text-zinc-500 italic">Nenhuma observação registrada pelo coordenador.</p>
                <button className="text-[10px] font-black text-[#F5C400] uppercase tracking-widest mt-3 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Adicionar nota
                </button>
              </div>
            </div>
          </section>

          {/* Badges */}
          <section className="bg-[#111111] p-6 rounded-3xl border border-zinc-800">
            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Badges Conquistadas</h3>
            <div className="grid grid-cols-4 gap-3">
              {badges.map((b: any) => (
                <div key={b.id} className="aspect-square bg-zinc-800 rounded-xl flex items-center justify-center text-2xl border border-zinc-700 shadow-inner" title={b.name}>
                  {b.icon_url}
                </div>
              ))}
              {[...Array(Math.max(0, 8 - badges.length))].map((_, i) => (
                <div key={i} className="aspect-square bg-zinc-900/50 rounded-xl border border-zinc-800/50 flex items-center justify-center text-zinc-800">
                  ?
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
