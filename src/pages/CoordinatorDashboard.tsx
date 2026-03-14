import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext.tsx';
import { motion } from 'motion/react';
import { Users, Target, CheckCircle2, XCircle, AlertTriangle, TrendingUp, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const CoordinatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user && ['COORDENADOR_MUNICIPAL', 'COORDENADOR_ESTADUAL', 'ADMIN', 'ADMIN_NACIONAL', 'ADMIN_ESTADUAL', 'ADMIN_REGIONAL', 'PRE_CANDIDATO', 'CHEFE_CAMPANHA', 'COORDENADOR_CAMPANHA', 'LIDER_SETOR'].includes(user.role)) {
      fetch(`/api/coordinator/volunteers?state=${user.state}`)
        .then(res => res.json())
        .then(data => setVolunteers(data.volunteers));
        
      fetch(`/api/coordinator/submissions?state=${user.state}`)
        .then(res => res.json())
        .then(data => setSubmissions(data.submissions));
    }
  }, [user]);

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
        alert(status === 'APPROVED' ? 'Missão aprovada com sucesso!' : 'Submissão rejeitada.');
        setSubmissions(prev => prev.filter(s => s.id !== submissionId));
      }
    } catch (error) {
      alert('Erro ao validar submissão.');
    }
  };

  const filteredVolunteers = volunteers.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user || !['COORDENADOR_MUNICIPAL', 'COORDENADOR_ESTADUAL', 'ADMIN', 'ADMIN_NACIONAL', 'ADMIN_ESTADUAL', 'ADMIN_REGIONAL', 'PRE_CANDIDATO', 'CHEFE_CAMPANHA', 'COORDENADOR_CAMPANHA', 'LIDER_SETOR'].includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-zinc-900">Acesso Negado</h2>
        <p className="text-zinc-500">Apenas coordenadores podem acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Painel de Coordenação</h1>
          <p className="text-zinc-500">Gerencie a operação no seu território ({user.state})</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Voluntários', value: volunteers.length, icon: Users, color: 'text-blue-500' },
          { label: 'Submissões Pendentes', value: submissions.length, icon: Target, color: 'text-orange-500' },
          { label: 'Missões Concluídas', value: volunteers.reduce((acc, v) => acc + v.missions_completed, 0), icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Líderes Emergentes', value: volunteers.filter(v => v.role === 'LIDER_EMERGENTE').length, icon: TrendingUp, color: 'text-purple-500' },
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

      <div className="grid md:grid-cols-3 gap-8">
        {/* Pending Submissions */}
        <div className="md:col-span-1 space-y-4">
          <h2 className="text-xl font-bold text-zinc-900">Validação Pendente</h2>
          {submissions.length === 0 ? (
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-zinc-500 font-medium">Tudo em dia!</p>
            </div>
          ) : (
            submissions.map(sub => (
              <div key={sub.id} className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-zinc-900">{sub.mission_title}</h4>
                    <p className="text-sm text-zinc-500">{sub.volunteer_name}</p>
                  </div>
                  <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-md">
                    {sub.evidence_type}
                  </span>
                </div>
                
                <div className="bg-zinc-50 p-3 rounded-xl mb-4 text-sm text-zinc-700 break-words">
                  {sub.evidence_type === 'LINK' ? (
                    <a href={sub.evidence_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{sub.evidence_url}</a>
                  ) : sub.evidence_type === 'PHOTO' ? (
                    <img src={sub.evidence_url} alt="Evidência" className="rounded-lg w-full h-32 object-cover" />
                  ) : (
                    sub.evidence_content
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleValidate(sub.id, 'APPROVED')}
                    className="flex-1 bg-emerald-500 text-white font-bold py-2 rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Aprovar
                  </button>
                  <button 
                    onClick={() => handleValidate(sub.id, 'REJECTED')}
                    className="flex-1 bg-red-50 text-red-600 font-bold py-2 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Rejeitar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Volunteers Table */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-zinc-900">Voluntários do Território</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar voluntário..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C400]"
              />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-sm text-zinc-500">
                    <th className="p-4 font-medium">Nome</th>
                    <th className="p-4 font-medium">Cidade</th>
                    <th className="p-4 font-medium">Nível / XP</th>
                    <th className="p-4 font-medium">Missões</th>
                    <th className="p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredVolunteers.map(v => (
                    <tr key={v.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-zinc-900">{v.name}</div>
                        <div className="text-xs text-zinc-500">{v.role}</div>
                      </td>
                      <td className="p-4 text-zinc-600">{v.city}</td>
                      <td className="p-4">
                        <div className="font-bold text-zinc-900">Lvl {v.current_level}</div>
                        <div className="text-xs text-zinc-500 font-mono">{v.xp_total} XP</div>
                      </td>
                      <td className="p-4 font-mono text-zinc-600">{v.missions_completed}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                          v.current_streak > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {v.current_streak > 0 ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

