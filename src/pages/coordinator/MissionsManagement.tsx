import React, { useEffect, useState } from 'react';
import { useAuth } from '../../components/AuthContext.tsx';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Target, 
  Clock, 
  AlertCircle, 
  Search,
  ExternalLink,
  Image as ImageIcon,
  MapPin,
  FileText,
  Zap,
  TrendingUp,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const MissionsManagement: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'validate' | 'create' | 'active'>('validate');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState<any[]>([]);
  const [newMission, setNewMission] = useState({
    title: '',
    description: '',
    political_importance: '',
    type: 'DIGITAL',
    urgency: 'CONTINUA',
    xp_reward: 60,
    validation_type: 'TEXT'
  });

  useEffect(() => {
    if (user) {
      if (activeTab === 'validate') {
        fetch(`/api/coordinator/submissions?state=${user.state}`)
          .then(res => res.json())
          .then(data => {
            setSubmissions(data.submissions);
            setLoading(false);
          });
      } else if (activeTab === 'active') {
        fetch(`/api/missions`)
          .then(res => res.json())
          .then(data => {
            setMissions(data.missions);
            setLoading(false);
          });
      }
    }
  }, [user, activeTab]);

  const handleValidate = async (submissionId: string, status: 'APPROVED' | 'REJECTED') => {
    let note = '';
    if (status === 'REJECTED') {
      const reason = prompt('Motivo da rejeição:');
      if (!reason) return;
      note = reason;
    }

    try {
      const res = await fetch(`/api/submissions/${submissionId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, validator_id: user?.id, note })
      });
      
      if (res.ok) {
        setSubmissions(prev => prev.filter(s => s.id !== submissionId));
      }
    } catch (error) {
      alert('Erro ao validar submissão.');
    }
  };

  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMission,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Default 30 days
        })
      });
      
      if (res.ok) {
        alert('Missão publicada com sucesso!');
        setNewMission({
          title: '',
          description: '',
          political_importance: '',
          type: 'DIGITAL',
          urgency: 'CONTINUA',
          xp_reward: 60,
          validation_type: 'TEXT'
        });
        setActiveTab('active');
      }
    } catch (error) {
      alert('Erro ao publicar missão.');
    }
  };

  const renderValidateTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-500" /> VALIDAR SUBMISSÕES
        </h2>
        <div className="flex gap-2">
          <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest">
            {submissions.length} PENDENTES
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-emerald-500/5 border border-emerald-500/20 p-20 rounded-3xl text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-xl font-black text-emerald-400 mb-2">Tudo em dia!</h3>
          <p className="text-emerald-500/60 font-medium">Não há submissões aguardando validação no seu território.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {submissions.map((sub) => (
            <motion.div 
              key={sub.id} 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#111111] rounded-3xl border border-zinc-800 overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-zinc-800 bg-zinc-900/30">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-lg border border-zinc-700">
                      👤
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{sub.volunteer_name}</p>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">há {formatDistanceToNow(new Date(sub.submitted_at), { locale: ptBR })}</p>
                    </div>
                  </div>
                  <span className="bg-zinc-800 text-zinc-400 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                    {sub.evidence_type}
                  </span>
                </div>
                <h4 className="text-sm font-black text-[#F5C400] leading-tight mb-1">{sub.mission_title}</h4>
              </div>

              <div className="p-6 flex-1 space-y-4">
                <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 min-h-[100px] flex flex-col justify-center">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Evidência enviada:</p>
                  {sub.evidence_type === 'LINK' ? (
                    <a href={sub.evidence_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-xs break-all flex items-center gap-2">
                      <ExternalLink className="w-3 h-3" /> {sub.evidence_url}
                    </a>
                  ) : sub.evidence_type === 'PHOTO' ? (
                    <div className="relative group cursor-pointer">
                      <img src={sub.evidence_url} alt="Evidência" className="rounded-xl w-full h-32 object-cover border border-zinc-800" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-xl">
                        <ImageIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : sub.evidence_type === 'GPS' ? (
                    <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
                      <MapPin className="w-4 h-4" /> Localização validada no GPS
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 leading-relaxed italic">"{sub.evidence_content}"</p>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  <span>XP a creditar:</span>
                  <span className="text-[#F5C400] text-sm">+60 XP</span>
                </div>
              </div>

              <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex gap-3">
                <button 
                  onClick={() => handleValidate(sub.id, 'REJECTED')}
                  className="flex-1 bg-zinc-800 text-red-500 font-black py-3 rounded-xl hover:bg-red-500/10 transition-all text-[10px] uppercase tracking-widest"
                >
                  Rejeitar
                </button>
                <button 
                  onClick={() => handleValidate(sub.id, 'APPROVED')}
                  className="flex-[2] bg-emerald-500 text-black font-black py-3 rounded-xl hover:bg-emerald-400 transition-all text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/10"
                >
                  Aprovar +60XP
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCreateTab = () => (
    <div className="max-w-4xl mx-auto bg-[#111111] p-10 rounded-[40px] border border-zinc-800 shadow-2xl">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 bg-[#F5C400] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(245,196,0,0.2)]">
          <Plus className="w-8 h-8 text-black" />
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">Criar Nova Missão</h2>
          <p className="text-zinc-500 font-medium">Mobilize seu território com ações estratégicas</p>
        </div>
      </div>

      <form onSubmit={handleCreateMission} className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Título da Missão</label>
            <input 
              type="text" 
              value={newMission.title}
              onChange={e => setNewMission({...newMission, title: e.target.value})}
              placeholder="Ex: Compartilhe o manifesto" 
              className="w-full px-5 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white focus:ring-2 focus:ring-[#F5C400] outline-none transition-all placeholder:text-zinc-700 font-bold"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Descrição Detalhada</label>
            <textarea 
              rows={4}
              value={newMission.description}
              onChange={e => setNewMission({...newMission, description: e.target.value})}
              placeholder="Descreva o que o voluntário deve fazer..." 
              className="w-full px-5 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white focus:ring-2 focus:ring-[#F5C400] outline-none transition-all placeholder:text-zinc-700 text-sm leading-relaxed"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Importância Política</label>
            <textarea 
              rows={2}
              value={newMission.political_importance}
              onChange={e => setNewMission({...newMission, political_importance: e.target.value})}
              placeholder="Por que esta ação é importante agora?" 
              className="w-full px-5 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white focus:ring-2 focus:ring-[#F5C400] outline-none transition-all placeholder:text-zinc-700 text-sm italic"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Tipo</label>
              <select 
                value={newMission.type}
                onChange={e => setNewMission({...newMission, type: e.target.value})}
                className="w-full px-4 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white focus:ring-2 focus:ring-[#F5C400] outline-none transition-all appearance-none font-bold text-xs"
              >
                <option value="DIGITAL">🖥️ DIGITAL</option>
                <option value="TERRITORIAL">📍 TERRITORIAL</option>
                <option value="RECRUTAMENTO">🤝 RECRUTAMENTO</option>
                <option value="FORMACAO">📚 FORMAÇÃO</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Urgência</label>
              <select 
                value={newMission.urgency}
                onChange={e => setNewMission({...newMission, urgency: e.target.value})}
                className="w-full px-4 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white focus:ring-2 focus:ring-[#F5C400] outline-none transition-all appearance-none font-bold text-xs"
              >
                <option value="CONTINUA">🟢 CONTÍNUA</option>
                <option value="PRIORITARIA">🟡 PRIORITÁRIA</option>
                <option value="URGENTE">🔴 URGENTE</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">XP Recompensa</label>
              <input 
                type="number" 
                value={newMission.xp_reward}
                onChange={e => setNewMission({...newMission, xp_reward: parseInt(e.target.value)})}
                className="w-full px-5 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-[#F5C400] focus:ring-2 focus:ring-[#F5C400] outline-none transition-all font-black"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Evidência</label>
              <select 
                value={newMission.validation_type}
                onChange={e => setNewMission({...newMission, validation_type: e.target.value})}
                className="w-full px-4 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white focus:ring-2 focus:ring-[#F5C400] outline-none transition-all appearance-none font-bold text-xs"
              >
                <option value="NONE">NENHUMA</option>
                <option value="TEXT">TEXTO</option>
                <option value="URL">LINK/URL</option>
                <option value="PHOTO">FOTO</option>
                <option value="GPS">GPS</option>
              </select>
            </div>
          </div>

          <button type="submit" className="w-full bg-[#F5C400] text-black font-black py-5 rounded-2xl hover:bg-[#e0b300] transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#F5C400]/10 mt-4">
            PUBLICAR MISSÃO <TrendingUp className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );

  const renderActiveTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <Target className="w-6 h-6 text-[#F5C400]" /> MISSÕES ATIVAS
        </h2>
        <div className="flex gap-2">
          <span className="bg-zinc-800 text-zinc-400 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest">
            {missions.length} EM CURSO
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {missions.map((m) => (
          <div key={m.id} className="bg-[#111111] p-6 rounded-3xl border border-zinc-800 hover:border-zinc-700 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider ${
                  m.urgency === 'URGENT' ? 'bg-red-500/10 text-red-500' :
                  m.urgency === 'PRIORITY' ? 'bg-yellow-500/10 text-yellow-500' :
                  'bg-emerald-500/10 text-emerald-500'
                }`}>
                  {m.urgency}
                </span>
                <span className="bg-zinc-800 text-zinc-500 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                  {m.type}
                </span>
              </div>
              <span className="text-xs font-black text-[#F5C400]">{m.xp_reward} XP</span>
            </div>
            <h3 className="text-lg font-black text-white mb-2 group-hover:text-[#F5C400] transition-colors">{m.title}</h3>
            <p className="text-xs text-zinc-500 line-clamp-2 mb-6 leading-relaxed">{m.description}</p>
            
            <div className="flex items-center justify-between pt-6 border-t border-zinc-800/50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                  <Users className="w-3 h-3" /> 24 submissões
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                  <Clock className="w-3 h-3" /> {m.deadline ? format(new Date(m.deadline), "dd/MM") : 'Contínua'}
                </div>
              </div>
              <button className="text-[10px] font-black text-[#F5C400] uppercase tracking-widest hover:underline">Gerenciar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const tabs = [
    { id: 'validate', label: 'Validar Submissões', icon: CheckCircle2, badge: submissions.length > 0 ? submissions.length : null },
    { id: 'create', label: 'Criar Missão', icon: Plus },
    { id: 'active', label: 'Missões Ativas', icon: Target },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">Gestão de Missões</h1>
          <p className="text-zinc-500 font-medium">Mobilização e validação de ações territoriais</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest transition-all relative ${
              activeTab === tab.id ? 'text-[#F5C400]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md ml-1">
                {tab.badge}
              </span>
            )}
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F5C400]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === 'validate' && renderValidateTab()}
        {activeTab === 'create' && renderCreateTab()}
        {activeTab === 'active' && renderActiveTab()}
      </div>
    </div>
  );
};

function formatDistanceToNow(date: Date, options: any) {
  const diff = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
