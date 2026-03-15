import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext.tsx';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, MapPin, User, Briefcase, Zap, Target, Eye, EyeOff, Search, Loader2 } from 'lucide-react';
import { getRoleHomePath } from '../lib/navigation.ts';

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
].sort();

const SKILLS = [
  "Conteúdo Digital", "Produção de Vídeo", "Fotografia",
  "Oratória", "Captação de Voluntários", "Organização Local",
  "Gestão de Eventos", "Design", "Redes de Contato",
  "Comunicação Política", "Jornalismo", "Tecnologia"
];

export const Onboarding: React.FC = () => {
  const { register, updateProfile, user, login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone_whatsapp: '',
    state: '',
    cep: '',
    city: '',
    neighborhood: '',
    skills: [] as string[],
    availability: '',
    political_experience: '',
  });

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (formData.name.length < 3) newErrors.name = "Nome deve ter pelo menos 3 caracteres";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Digite um email válido";
    if ((formData.phone_whatsapp || '').replace(/\D/g, '').length !== 11) newErrors.phone_whatsapp = "Digite um WhatsApp válido com DDD";
    if (!formData.state) newErrors.state = "Selecione seu estado";
    if (formData.password.length < 8) newErrors.password = "Senha deve ter pelo menos 8 caracteres";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "As senhas não coincidem";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const maskPhone = (value: string) => {
    const digits = (value || '').replace(/\D/g, '');
    if (digits.length <= 11) {
      let masked = digits;
      if (digits.length > 2) masked = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      if (digits.length > 7) masked = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
      return masked;
    }
    return value;
  };

  const maskCEP = (value: string) => {
    const digits = (value || '').replace(/\D/g, '');
    if (digits.length <= 8) {
      if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
      return digits;
    }
    return value;
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return 0;
    if (pwd.length < 8) return 1; // Weak
    const hasNumber = /\d/.test(pwd);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    if (hasNumber && hasSymbol) return 3; // Strong
    return 2; // Medium
  };

  const handleCEPBlur = async () => {
    const digits = (formData.cep || '').replace(/\D/g, '');
    if (digits.length === 8) {
      fetchCEP(digits);
    }
  };

  const fetchCEP = async (cep: string) => {
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setErrors(prev => ({ ...prev, cep: "CEP não encontrado. Preencha manualmente." }));
      } else {
        setFormData(prev => ({
          ...prev,
          city: data.localidade,
          state: data.uf,
          neighborhood: data.bairro
        }));
        setErrors(prev => ({ ...prev, cep: '' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, cep: "Não foi possível buscar o CEP. Preencha manualmente." }));
    } finally {
      setCepLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) return;
    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.city) {
      setErrors(prev => ({ ...prev, city: "Cidade é obrigatória" }));
      return;
    }
    setStep(3);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // First register (Area 1 says register with all data from 3 steps)
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone_whatsapp: formData.phone_whatsapp,
        state: formData.state,
        cep: formData.cep,
        city: formData.city,
        neighborhood: formData.neighborhood,
        skills: formData.skills,
        availability: formData.availability,
        political_experience: formData.political_experience,
      });
      setStep(4);
    } catch (error: any) {
      alert(error.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill) 
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const renderProgressBar = () => (
    <div className="flex items-center justify-center mb-10 gap-4">
      {[1, 2, 3].map(i => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
              step === i ? 'bg-[#F5C400] border-[#F5C400] text-zinc-900 shadow-[0_0_15px_rgba(245,196,0,0.3)]' :
              step > i ? 'bg-[#F5C400] border-[#F5C400] text-zinc-900' :
              'bg-transparent border-zinc-300 text-zinc-400'
            }`}>
              {step > i ? <CheckCircle2 className="w-6 h-6" /> : i}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${step >= i ? 'text-[#F5C400]' : 'text-zinc-400'}`}>
              Passo {i}
            </span>
          </div>
          {i < 3 && (
            <div className={`h-[2px] w-12 transition-all ${step > i ? 'bg-[#F5C400]' : 'bg-zinc-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full mx-auto bg-zinc-900 p-8 rounded-3xl shadow-2xl border border-zinc-800">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Junte-se à Missão</h1>
        <p className="text-zinc-400">A infraestrutura do movimento começa aqui.</p>
      </div>
      
      {renderProgressBar()}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Nome Completo</label>
          <input 
            required 
            type="text" 
            className={`w-full px-4 py-3 rounded-xl bg-zinc-800 border ${errors.name ? 'border-red-500' : 'border-zinc-700'} text-white focus:ring-2 focus:ring-[#F5C400] focus:border-transparent outline-none transition-all placeholder:text-zinc-600`} 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            placeholder="Seu nome completo" 
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-1.5">E-mail</label>
          <input 
            required 
            type="email" 
            className={`w-full px-4 py-3 rounded-xl bg-zinc-800 border ${errors.email ? 'border-red-500' : 'border-zinc-700'} text-white focus:ring-2 focus:ring-[#F5C400] focus:border-transparent outline-none transition-all placeholder:text-zinc-600`} 
            value={formData.email} 
            onChange={e => setFormData({...formData, email: e.target.value})} 
            placeholder="seu@email.com" 
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-1.5">WhatsApp</label>
          <input 
            required 
            type="tel" 
            className={`w-full px-4 py-3 rounded-xl bg-zinc-800 border ${errors.phone_whatsapp ? 'border-red-500' : 'border-zinc-700'} text-white focus:ring-2 focus:ring-[#F5C400] focus:border-transparent outline-none transition-all placeholder:text-zinc-600`} 
            value={formData.phone_whatsapp} 
            onChange={e => setFormData({...formData, phone_whatsapp: maskPhone(e.target.value)})} 
            placeholder="(11) 99999-9999" 
          />
          {errors.phone_whatsapp && <p className="text-red-500 text-xs mt-1">{errors.phone_whatsapp}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Estado</label>
          <select 
            required 
            className={`w-full px-4 py-3 rounded-xl bg-zinc-800 border ${errors.state ? 'border-red-500' : 'border-zinc-700'} text-white focus:ring-2 focus:ring-[#F5C400] focus:border-transparent outline-none transition-all appearance-none`} 
            value={formData.state} 
            onChange={e => setFormData({...formData, state: e.target.value})}
          >
            <option value="" className="bg-zinc-900">Selecione seu estado</option>
            {STATES.map(uf => <option key={uf} value={uf} className="bg-zinc-900">{uf}</option>)}
          </select>
          {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Senha</label>
          <div className="relative">
            <input 
              required 
              type={showPassword ? "text" : "password"} 
              className={`w-full px-4 py-3 rounded-xl bg-zinc-800 border ${errors.password ? 'border-red-500' : 'border-zinc-700'} text-white focus:ring-2 focus:ring-[#F5C400] focus:border-transparent outline-none transition-all`} 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {/* Strength Indicator */}
          <div className="flex gap-1 h-1 mt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex-1 rounded-full transition-all ${
                getPasswordStrength(formData.password) >= i 
                  ? (getPasswordStrength(formData.password) === 1 ? 'bg-red-500' : getPasswordStrength(formData.password) === 2 ? 'bg-yellow-500' : 'bg-green-500')
                  : 'bg-zinc-800'
              }`} />
            ))}
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Confirmar Senha</label>
          <div className="relative">
            <input 
              required 
              type={showConfirmPassword ? "text" : "password"} 
              className={`w-full px-4 py-3 rounded-xl bg-zinc-800 border ${errors.confirmPassword ? 'border-red-500' : 'border-zinc-700'} text-white focus:ring-2 focus:ring-[#F5C400] focus:border-transparent outline-none transition-all`} 
              value={formData.confirmPassword} 
              onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
            />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
        </div>

        <button 
          type="submit" 
          className="w-full bg-[#F5C400] text-zinc-900 font-black py-4 px-4 rounded-xl hover:bg-[#e0b300] transition-all flex items-center justify-center gap-2 mt-6 shadow-lg active:scale-[0.98]"
        >
          CONTINUAR <ArrowRight className="w-5 h-5" />
        </button>
      </form>
      
      <div className="mt-8 text-center border-t border-zinc-800 pt-6">
        <p className="text-sm text-zinc-500">Já tem uma conta?</p>
        <button 
          type="button"
          onClick={() => setIsLogin(true)} 
          className="text-[#F5C400] font-bold hover:underline mt-1"
        >
          Fazer Login
        </button>
        <div className="mt-4">
          <Link to="/acesso-admin" className="text-zinc-600 text-xs hover:text-zinc-400 transition-colors">
            Acesso administrativo para testes →
          </Link>
        </div>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-md w-full mx-auto bg-zinc-900 p-8 rounded-3xl shadow-2xl border border-zinc-800">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-700">
          <MapPin className="w-8 h-8 text-[#F5C400]" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Onde você está?</h2>
        <p className="text-zinc-400">Precisamos saber sua localização para conectar você às missões da sua região.</p>
      </div>

      {renderProgressBar()}

      <form onSubmit={handleStep2Submit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-1.5">CEP</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                required 
                type="text" 
                className={`w-full px-4 py-3 rounded-xl bg-zinc-800 border ${errors.cep ? 'border-red-500' : 'border-zinc-700'} text-white focus:ring-2 focus:ring-[#F5C400] focus:border-transparent outline-none transition-all`} 
                value={formData.cep} 
                onChange={e => setFormData({...formData, cep: maskCEP(e.target.value)})} 
                onBlur={handleCEPBlur}
                placeholder="00000-000" 
              />
              {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#F5C400] animate-spin" />}
            </div>
            <button 
              type="button" 
              onClick={() => fetchCEP((formData.cep || '').replace(/\D/g, ''))}
              className="bg-zinc-800 border border-zinc-700 text-white px-4 rounded-xl hover:bg-zinc-700 transition-all flex items-center justify-center"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
          {errors.cep && <p className="text-red-500 text-xs mt-1">{errors.cep}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Cidade</label>
          <input 
            required 
            type="text" 
            className={`w-full px-4 py-3 rounded-xl bg-zinc-800 border ${formData.city && !errors.cep ? 'border-[#F5C400]' : 'border-zinc-700'} text-white focus:ring-2 focus:ring-[#F5C400] focus:border-transparent outline-none transition-all`} 
            value={formData.city} 
            onChange={e => setFormData({...formData, city: e.target.value})} 
          />
          {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Bairro (Opcional)</label>
          <input 
            type="text" 
            className={`w-full px-4 py-3 rounded-xl bg-zinc-800 border ${formData.neighborhood && !errors.cep ? 'border-[#F5C400]' : 'border-zinc-700'} text-white focus:ring-2 focus:ring-[#F5C400] focus:border-transparent outline-none transition-all`} 
            value={formData.neighborhood} 
            onChange={e => setFormData({...formData, neighborhood: e.target.value})} 
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={() => setStep(1)} className="flex-1 bg-zinc-800 text-white font-bold py-4 rounded-xl hover:bg-zinc-700 transition-all">
            Voltar
          </button>
          <button type="submit" className="flex-[2] bg-[#F5C400] text-zinc-900 font-black py-4 rounded-xl hover:bg-[#e0b300] transition-all flex items-center justify-center gap-2 shadow-lg">
            CONTINUAR <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl w-full mx-auto bg-zinc-900 p-8 rounded-3xl shadow-2xl border border-zinc-800">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#F5C400]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#F5C400]/20">
          <Zap className="w-8 h-8 text-[#F5C400]" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Seu Perfil de Atuação</h2>
        <p className="text-zinc-400">Complete este perfil para ganhar +100 XP e receber missões personalizadas.</p>
      </div>

      {renderProgressBar()}
      
      <form onSubmit={handleFinalSubmit} className="space-y-8">
        <div>
          <label className="block text-sm font-bold text-zinc-300 mb-4">O que você sabe fazer bem?</label>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map(skill => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                  formData.skills.includes(skill)
                    ? 'bg-[#F5C400] text-zinc-900 border-[#F5C400] shadow-[0_0_10px_rgba(245,196,0,0.2)]'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-zinc-300 mb-4">Disponibilidade Semanal</label>
            <div className="space-y-3">
              {[
                { id: 'LOW', label: '🕐 Baixa', desc: '1 a 3 horas por semana' },
                { id: 'MEDIUM', label: '🕓 Média', desc: '4 a 8 horas por semana' },
                { id: 'HIGH', label: '🕗 Alta', desc: 'Mais de 8 horas por semana' }
              ].map(av => (
                <label 
                  key={av.id} 
                  className={`flex flex-col p-4 border rounded-2xl cursor-pointer transition-all ${
                    formData.availability === av.id 
                      ? 'bg-[#F5C400]/10 border-[#F5C400] shadow-[0_0_15px_rgba(245,196,0,0.1)]' 
                      : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold ${formData.availability === av.id ? 'text-[#F5C400]' : 'text-white'}`}>{av.label}</span>
                    <input 
                      type="radio" 
                      name="availability" 
                      value={av.id} 
                      checked={formData.availability === av.id} 
                      onChange={e => setFormData({...formData, availability: e.target.value})} 
                      className="sr-only"
                    />
                  </div>
                  <span className="text-xs text-zinc-500">{av.desc}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-300 mb-4">Experiência Política</label>
            <div className="space-y-3">
              {[
                { id: 'NONE', label: '🌱 Nenhuma', desc: 'Primeira vez na política' },
                { id: 'SOME', label: '⚡ Alguma', desc: 'Já participei de campanhas' },
                { id: 'EXPERIENCED', label: '🔥 Experiente', desc: 'Veterano em campanhas' }
              ].map(exp => (
                <label 
                  key={exp.id} 
                  className={`flex flex-col p-4 border rounded-2xl cursor-pointer transition-all ${
                    formData.political_experience === exp.id 
                      ? 'bg-[#F5C400]/10 border-[#F5C400] shadow-[0_0_15px_rgba(245,196,0,0.1)]' 
                      : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold ${formData.political_experience === exp.id ? 'text-[#F5C400]' : 'text-white'}`}>{exp.label}</span>
                    <input 
                      type="radio" 
                      name="experience" 
                      value={exp.id} 
                      checked={formData.political_experience === exp.id} 
                      onChange={e => setFormData({...formData, political_experience: e.target.value})} 
                      className="sr-only"
                    />
                  </div>
                  <span className="text-xs text-zinc-500">{exp.desc}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-8 border-t border-zinc-800">
          <button type="button" onClick={() => setStep(2)} className="text-zinc-500 font-bold hover:text-zinc-300 px-4 py-2">
            Voltar
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-[#F5C400] text-zinc-900 font-black py-4 px-10 rounded-xl hover:bg-[#e0b300] transition-all flex items-center gap-2 shadow-xl disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar para o Movimento 🚀"}
          </button>
        </div>
      </form>
    </motion.div>
  );

  const renderLogin = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full mx-auto bg-zinc-900 p-8 rounded-3xl shadow-2xl border border-zinc-800">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Bem-vindo de volta</h1>
        <p className="text-zinc-400">Entre com suas credenciais para continuar.</p>
      </div>
      
      <form onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
          await login(formData.email, formData.password);
          const storedUser = localStorage.getItem('missao_user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser) as { role?: string };
            navigate(getRoleHomePath(parsedUser.role ?? null));
          } else {
            navigate('/inicio');
          }
        } catch (error: any) {
          alert(error.message || 'Erro ao fazer login. Verifique suas credenciais.');
        } finally {
          setLoading(false);
        }
      }} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-1.5">E-mail</label>
          <input 
            required 
            type="email" 
            className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-[#F5C400] focus:border-transparent outline-none transition-all placeholder:text-zinc-600" 
            value={formData.email} 
            onChange={e => setFormData({...formData, email: e.target.value})} 
            placeholder="seu@email.com" 
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Senha</label>
          <div className="relative">
            <input 
              required 
              type={showPassword ? "text" : "password"} 
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-[#F5C400] focus:border-transparent outline-none transition-all" 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-[#F5C400] text-zinc-900 font-black py-4 px-4 rounded-xl hover:bg-[#e0b300] transition-all flex items-center justify-center gap-2 mt-6 shadow-lg active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ENTRAR"} <ArrowRight className="w-5 h-5" />
        </button>
      </form>
      
      <div className="mt-8 text-center border-t border-zinc-800 pt-6">
        <p className="text-sm text-zinc-500">Ainda não tem uma conta?</p>
        <button 
          type="button"
          onClick={() => setIsLogin(false)} 
          className="text-[#F5C400] font-bold hover:underline mt-1"
        >
          Criar Conta
        </button>
      </div>
    </motion.div>
  );

  const renderTour = () => (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg w-full mx-auto bg-zinc-900 text-white p-10 rounded-[40px] shadow-2xl text-center border border-zinc-800">
      <div className="w-24 h-24 bg-[#F5C400] rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(245,196,0,0.4)]">
        <Target className="w-12 h-12 text-zinc-900" />
      </div>
      <h2 className="text-4xl font-black text-white mb-4">Bem-vindo à Missão</h2>
      <p className="text-zinc-400 mb-10 text-lg leading-relaxed">Sua primeira missão já está disponível. Vamos começar a construir a infraestrutura do movimento.</p>
      <button onClick={() => navigate(getRoleHomePath(user?.role ?? null))} className="w-full bg-[#F5C400] text-zinc-900 font-black py-5 px-6 rounded-2xl hover:bg-[#e0b300] transition-all text-xl shadow-lg active:scale-[0.98]">
        ACESSAR DASHBOARD
      </button>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans selection:bg-[#F5C400] selection:text-black">
      {isLogin ? renderLogin() : (
        <>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderTour()}
        </>
      )}
    </div>
  );
};


