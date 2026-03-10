import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, ChevronLeft, Rocket, CheckCircle2, 
  Layout, Settings, Users, Palette, Globe, Shield, 
  Briefcase, MessageSquare, Code, Users2, Scale, Map as MapIcon,
  Plus, Trash2
} from 'lucide-react';

interface Sector {
  nome: string;
  slug: string;
  icone: string;
  cor: string;
  obrigatorio: boolean;
  subsetoresDefault: string[];
}

interface Template {
  id: string;
  name: string;
  office: string;
  description: string;
  sectors_template: Sector[];
}

export const NewCampaign: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    candidateName: '',
    office: '',
    templateId: '',
    configuration: {
      primaryColor: '#F5C400',
      electionDate: '',
      state: '',
      city: '',
      ballotNumber: ''
    },
    sectors: [] as Sector[]
  });

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/organizacional/templates');
        const data = await res.json();
        setTemplates(data);
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const handleSelectTemplate = (template: Template) => {
    setFormData(prev => ({
      ...prev,
      templateId: template.id,
      office: template.office,
      sectors: template.sectors_template.map(s => ({ ...s }))
    }));
    setStep(3);
  };

  const handleCreateCampaign = async () => {
    try {
      const res = await fetch('/api/campanha/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/coordinator/campaign/${data.campaignId}`);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Nome da Campanha</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Ludymilla 2026"
                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-[#F5C400] outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Nome da Candidata/o</label>
                <input 
                  type="text" 
                  value={formData.candidateName}
                  onChange={(e) => setFormData(prev => ({ ...prev, candidateName: e.target.value }))}
                  placeholder="Nome completo na urna"
                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-[#F5C400] outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Estado (UF)</label>
                <input 
                  type="text" 
                  value={formData.configuration.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, configuration: { ...prev.configuration, state: e.target.value } }))}
                  placeholder="Ex: SP"
                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-[#F5C400] outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Cidade</label>
                <input 
                  type="text" 
                  value={formData.configuration.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, configuration: { ...prev.configuration, city: e.target.value } }))}
                  placeholder="Ex: São Paulo"
                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-[#F5C400] outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700">Número de Urna</label>
                <input 
                  type="text" 
                  value={formData.configuration.ballotNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, configuration: { ...prev.configuration, ballotNumber: e.target.value } }))}
                  placeholder="Ex: 4567"
                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-[#F5C400] outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end pt-6">
              <button 
                onClick={() => setStep(2)}
                disabled={!formData.name || !formData.candidateName}
                className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                Próximo Passo
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-bold text-zinc-900 mb-6">Selecione o Template de Estrutura</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {templates.map(tmpl => (
                <button
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl)}
                  className="bg-white border-2 border-zinc-100 p-6 rounded-3xl text-left hover:border-[#F5C400] transition-all group"
                >
                  <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#F5C400]/10 transition-colors">
                    <Layout className="w-6 h-6 text-zinc-400 group-hover:text-[#F5C400]" />
                  </div>
                  <h4 className="font-bold text-zinc-900 mb-1">{tmpl.name}</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed mb-4">{tmpl.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {tmpl.sectors_template.slice(0, 4).map(s => (
                      <span key={s.slug} className="text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-500">{s.nome}</span>
                    ))}
                    {tmpl.sectors_template.length > 4 && <span className="text-[10px] text-zinc-400">+{tmpl.sectors_template.length - 4}</span>}
                  </div>
                </button>
              ))}
              <button className="bg-zinc-50 border-2 border-dashed border-zinc-200 p-6 rounded-3xl text-left hover:bg-zinc-100 transition-all flex flex-col items-center justify-center text-center">
                <Plus className="w-8 h-8 text-zinc-300 mb-2" />
                <h4 className="font-bold text-zinc-400">Customizado</h4>
                <p className="text-xs text-zinc-400">Crie sua estrutura do zero</p>
              </button>
            </div>
            <div className="flex justify-between pt-6">
              <button onClick={() => setStep(1)} className="text-zinc-500 font-bold flex items-center gap-2">
                <ChevronLeft className="w-5 h-5" /> Voltar
              </button>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-bold text-zinc-900 mb-6">Configurar Setores da Campanha</h3>
            <div className="space-y-4">
              {formData.sectors.map((sector, idx) => (
                <div key={idx} className="bg-white border border-zinc-100 p-6 rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: sector.cor + '20', color: sector.cor }}>
                      {sector.icone}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">{sector.nome}</h4>
                      <p className="text-xs text-zinc-500">{sector.subsetoresDefault.length} subsetores padrão</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {sector.obrigatorio ? (
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Obrigatório</span>
                    ) : (
                      <button 
                        onClick={() => setFormData(prev => ({ ...prev, sectors: prev.sectors.filter((_, i) => i !== idx) }))}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button className="w-full p-4 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400 font-bold text-sm hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Adicionar Setor Customizado
              </button>
            </div>
            <div className="flex justify-between pt-6">
              <button onClick={() => setStep(2)} className="text-zinc-500 font-bold flex items-center gap-2">
                <ChevronLeft className="w-5 h-5" /> Voltar
              </button>
              <button 
                onClick={() => setStep(4)}
                className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2"
              >
                Revisar e Criar
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="bg-[#F5C400]/10 p-8 rounded-3xl border border-[#F5C400]/20">
              <h3 className="text-xl font-bold text-zinc-900 mb-6">Resumo da Campanha</h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Candidatura</p>
                    <p className="text-lg font-bold text-zinc-900">{formData.candidateName}</p>
                    <p className="text-sm text-zinc-600">{(formData.office || '').replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Localização</p>
                    <p className="text-sm font-bold text-zinc-900">{formData.configuration.state} {formData.configuration.city && `— ${formData.configuration.city}`}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Organograma</p>
                    <p className="text-sm font-bold text-zinc-900">{formData.sectors.length} setores configurados</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.sectors.map(s => (
                        <span key={s.slug} className="w-6 h-6 rounded bg-white flex items-center justify-center text-xs shadow-sm" title={s.nome}>{s.icone}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6">
              <button onClick={() => setStep(3)} className="text-zinc-500 font-bold flex items-center gap-2">
                <ChevronLeft className="w-5 h-5" /> Voltar
              </button>
              <button 
                onClick={handleCreateCampaign}
                className="bg-zinc-900 text-white px-12 py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2 text-lg"
              >
                <Rocket className="w-6 h-6 text-[#F5C400]" />
                Lançar Campanha
              </button>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4 tracking-tight">Nova Campanha</h1>
        <p className="text-zinc-500 text-lg">Configure a estrutura organizacional do seu candidato em minutos.</p>
      </header>

      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-16 relative px-4">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-100 -translate-y-1/2 z-0" />
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="relative z-10 flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
              step >= s ? 'bg-[#F5C400] text-zinc-900' : 'bg-white border-2 border-zinc-100 text-zinc-300'
            }`}>
              {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= s ? 'text-zinc-900' : 'text-zinc-300'}`}>
              {s === 1 ? 'Dados' : s === 2 ? 'Template' : s === 3 ? 'Setores' : 'Lançar'}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[40px] border border-zinc-100 p-8 md:p-12 shadow-xl shadow-zinc-200/50">
        {renderStep()}
      </div>
    </div>
  );
};
