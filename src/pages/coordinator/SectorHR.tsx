import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Users, Star, TrendingUp, AlertTriangle, CheckCircle2, 
  Plus, Search, UserPlus, FileText, ChevronRight, BarChart3
} from 'lucide-react';
import { useAuth } from '../../components/AuthContext.tsx';

interface Member {
  id: string;
  volunteer_id: string;
  name: string;
  photo_url: string;
  role_name: string;
  performance_score: number;
  tasks_completed: number;
  tasks_on_time: number;
  hours_registered: number;
  technical_competencies: string[];
  competencies_eval: Record<string, number>;
  evaluations: any[];
}

export const SectorHR: React.FC = () => {
  const { campaignId, sectorSlug } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [evalForm, setEvalForm] = useState({
    scores: { quality: 3, deadline: 3, collaboration: 3, proactivity: 3, alignment: 3 },
    strengths: [''],
    developmentPoints: [''],
    agreedActions: [{ action: '', responsible: '', deadline: '' }],
    recommendation: 'MANTER'
  });

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/coordenador/campanha/${campaignId}/setor/${sectorSlug}/rh`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching HR data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [campaignId, sectorSlug]);

  const handleCreateEvaluation = async () => {
    if (!selectedMember || !user) return;
    try {
      const res = await fetch('/api/coordenador/avaliacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMember.id,
          evaluatorId: user.id,
          period: '2025-Q1',
          ...evalForm
        })
      });
      if (res.ok) {
        setIsEvalModalOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error creating evaluation:', error);
    }
  };

  if (loading) return <div className="p-8">Carregando...</div>;
  if (!data) return <div className="p-8">Setor não encontrado.</div>;

  const { sector, members } = data;
  const allCompetencies = Array.from(new Set(members.flatMap((m: Member) => m.technical_competencies)));

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/coordinator/territories" className="text-zinc-400 hover:text-zinc-600 transition-colors">Campanha</Link>
            <ChevronRight className="w-4 h-4 text-zinc-300" />
            <span className="text-zinc-900 font-medium">{sector.name}</span>
          </div>
          <h1 className="text-3xl font-bold text-zinc-900">Gestão de Pessoas</h1>
          <p className="text-zinc-500">{members.length} membros ativos no setor</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-zinc-200 text-zinc-900 px-4 py-2 rounded-xl font-bold hover:bg-zinc-50 transition-colors flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Relatório de RH
          </button>
          <button className="bg-[#F5C400] text-zinc-900 px-4 py-2 rounded-xl font-bold hover:bg-[#E5B400] transition-colors flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Recrutar
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Saúde do Setor</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-zinc-900">84%</span>
            <span className="text-green-500 text-sm font-bold mb-1">↑ 4%</span>
          </div>
          <div className="mt-4 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 w-[84%]" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Entregas no Prazo</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-zinc-900">92%</span>
            <span className="text-zinc-400 text-sm font-medium mb-1">Meta: 90%</span>
          </div>
          <div className="mt-4 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-[92%]" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Vagas Abertas</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-zinc-900">2</span>
            <span className="text-orange-500 text-sm font-bold mb-1">Prioridade</span>
          </div>
          <div className="mt-4 flex gap-1">
            <div className="h-1.5 bg-orange-500 rounded-full flex-1" />
            <div className="h-1.5 bg-orange-500 rounded-full flex-1" />
            <div className="h-1.5 bg-zinc-100 rounded-full flex-1" />
          </div>
        </div>
      </div>

      {/* Competency Matrix */}
      <section className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Mapa de Competências
          </h2>
          <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Meta atingida</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" /> Gap leve</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Gap crítico</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50">
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">Membro</th>
                {allCompetencies.map(comp => (
                  <th key={comp} className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 text-center">
                    {comp}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m: Member) => (
                <tr key={m.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-4 border-b border-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">{m.name}</p>
                        <p className="text-[10px] text-zinc-400 uppercase">{m.role_name}</p>
                      </div>
                    </div>
                  </td>
                  {allCompetencies.map((comp: any) => {
                    const level = m.competencies_eval[comp as string] || 0;
                    return (
                      <td key={comp} className="p-4 border-b border-zinc-100 text-center">
                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-xs ${
                          level >= 4 ? 'bg-green-50 text-green-600' :
                          level === 3 ? 'bg-orange-50 text-orange-600' :
                          level > 0 ? 'bg-red-50 text-red-600' : 'bg-zinc-50 text-zinc-300'
                        }`}>
                          {level > 0 ? `★${level}` : '—'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Performance Table */}
      <section className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Performance Individual
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50">
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">Membro</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">Entregas</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">No Prazo</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">Score</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">Ações</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m: Member) => (
                <tr key={m.id} className={`hover:bg-zinc-50 transition-colors ${m.performance_score < 60 ? 'bg-red-50/30' : ''}`}>
                  <td className="p-4 border-b border-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-600">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">{m.name}</p>
                        <p className="text-xs text-zinc-400">{m.role_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 border-b border-zinc-100">
                    <span className="text-sm font-bold text-zinc-900">{m.tasks_completed}</span>
                  </td>
                  <td className="p-4 border-b border-zinc-100">
                    <span className={`text-sm font-bold ${m.tasks_on_time >= 90 ? 'text-green-600' : 'text-zinc-900'}`}>
                      {m.tasks_on_time}%
                    </span>
                  </td>
                  <td className="p-4 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${
                        m.performance_score >= 85 ? 'text-green-600' :
                        m.performance_score < 60 ? 'text-red-600' : 'text-zinc-900'
                      }`}>
                        {m.performance_score}
                      </span>
                      {m.performance_score >= 85 && <Star className="w-3 h-3 text-yellow-500 fill-current" />}
                    </div>
                  </td>
                  <td className="p-4 border-b border-zinc-100">
                    <button 
                      onClick={() => { setSelectedMember(m); setIsEvalModalOpen(true); }}
                      className="text-xs font-bold text-zinc-900 hover:underline flex items-center gap-1"
                    >
                      Avaliar
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Evaluation Modal */}
      {isEvalModalOpen && selectedMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-8 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900">Avaliação Formal</h2>
                <p className="text-zinc-500">Avaliando: {selectedMember.name}</p>
              </div>
              <button onClick={() => setIsEvalModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                <Plus className="w-6 h-6 text-zinc-400 rotate-45" />
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              {/* Scores */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Dimensões de Performance (1-5)</h3>
                {Object.entries(evalForm.scores).map(([key, val]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-zinc-700 capitalize">{(key || '').replace('quality', 'Qualidade').replace('deadline', 'Prazo').replace('collaboration', 'Colaboração').replace('proactivity', 'Proatividade').replace('alignment', 'Alinhamento')}</label>
                      <span className="text-sm font-bold text-zinc-900">{val} / 5</span>
                    </div>
                    <input 
                      type="range" min="1" max="5" step="1"
                      value={val}
                      onChange={(e) => setEvalForm(prev => ({ ...prev, scores: { ...prev.scores, [key]: Number(e.target.value) } }))}
                      className="w-full h-2 bg-zinc-100 rounded-full appearance-none cursor-pointer accent-[#F5C400]"
                    />
                  </div>
                ))}
              </div>

              {/* Recommendation */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Recomendação</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { id: 'PROMOVER_SUBLIDER', label: 'Promover', color: 'bg-green-50 text-green-700' },
                    { id: 'MANTER', label: 'Manter', color: 'bg-blue-50 text-blue-700' },
                    { id: 'DESENVOLVER', label: 'Desenvolver', color: 'bg-yellow-50 text-yellow-700' },
                    { id: 'REALOCAR', label: 'Realocar', color: 'bg-orange-50 text-orange-700' },
                    { id: 'DESLIGAR', label: 'Desligar', color: 'bg-red-50 text-red-700' },
                  ].map(rec => (
                    <button
                      key={rec.id}
                      onClick={() => setEvalForm(prev => ({ ...prev, recommendation: rec.id }))}
                      className={`p-3 rounded-xl text-xs font-bold border transition-all ${
                        evalForm.recommendation === rec.id 
                          ? `${rec.color} border-current` 
                          : 'bg-white border-zinc-200 text-zinc-500'
                      }`}
                    >
                      {rec.label}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleCreateEvaluation}
                className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-colors"
              >
                Salvar Avaliação e Notificar Membro
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
