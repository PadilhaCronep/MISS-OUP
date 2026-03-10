import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Shield, Key, ExternalLink, Database, Loader2, CheckCircle2, ArrowRight, Zap } from 'lucide-react';

export const AdminAccess: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const runSeed = async (type: string) => {
    setLoading(type);
    try {
      const res = await fetch(`/api/seed${type === 'all' ? '' : '/' + type}`, { method: 'POST' });
      if (res.ok) {
        setSuccess(`Dados de ${type} criados com sucesso!`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      alert('Erro ao executar seed');
    } finally {
      setLoading(null);
    }
  };

  const credentials = [
    { perfil: "Admin Nacional", email: "admin@missao.com.br", senha: "Missao@2025", painel: "/hq" },
    { perfil: "Chefe Campanha", email: "chefe@missao.com.br", senha: "Campanha@2025", painel: "/hq" },
    { perfil: "Coord. SP", email: "coord.sp@missao.com.br", senha: "CoordSP@2025", painel: "/coordinator" },
    { perfil: "Coord. RJ", email: "coord.rj@missao.com.br", senha: "CoordRJ@2025", painel: "/coordinator" },
    { perfil: "Coord. Municipal", email: "coord.mun@missao.com.br", senha: "CoordMun@2025", painel: "/coordinator" },
    { perfil: "Voluntário Teste", email: "voluntario@missao.com.br", senha: "Voluntario@2025", painel: "/dashboard" },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <div className="w-16 h-16 bg-[#F5C400] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(245,196,0,0.2)]">
            <Shield className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">🔐 Acessos Administrativos</h1>
          <p className="text-zinc-500 text-lg">Use estas credenciais para testar o sistema Missão Platform</p>
        </header>

        <div className="grid gap-8">
          {/* Credentials Table */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-800/50 border-b border-zinc-800">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Perfil</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Email</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Senha</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Painel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {credentials.map((c, i) => (
                    <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-[#F5C400]">{c.perfil}</td>
                      <td className="px-6 py-4 font-mono text-sm text-zinc-300">{c.email}</td>
                      <td className="px-6 py-4 font-mono text-sm text-zinc-300">{c.senha}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-zinc-800 rounded text-xs font-bold text-zinc-400">{c.painel}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="grid md:grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-[#F5C400]" />
                Gerenciamento de Dados
              </h3>
              <div className="space-y-3">
                <button 
                  onClick={() => runSeed('admin')}
                  disabled={!!loading}
                  className="w-full flex items-center justify-between p-4 bg-zinc-800 rounded-2xl hover:bg-zinc-700 transition-all group"
                >
                  <span className="font-bold">Criar dados de teste (Admins)</span>
                  {loading === 'admin' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-[#F5C400]" />}
                </button>
                <button 
                  onClick={() => runSeed('voluntarios')}
                  disabled={!!loading}
                  className="w-full flex items-center justify-between p-4 bg-zinc-800 rounded-2xl hover:bg-zinc-700 transition-all group"
                >
                  <span className="font-bold">Criar voluntários fictícios</span>
                  {loading === 'voluntarios' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-[#F5C400]" />}
                </button>
                <button 
                  onClick={() => runSeed('missoes')}
                  disabled={!!loading}
                  className="w-full flex items-center justify-between p-4 bg-zinc-800 rounded-2xl hover:bg-zinc-700 transition-all group"
                >
                  <span className="font-bold">Criar missões realistas</span>
                  {loading === 'missoes' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-[#F5C400]" />}
                </button>
                <button 
                  onClick={() => runSeed('all')}
                  disabled={!!loading}
                  className="w-full flex items-center justify-between p-4 bg-[#F5C400] text-black rounded-2xl hover:bg-[#e0b300] transition-all group"
                >
                  <span className="font-black">EXECUTAR SEED COMPLETO 🚀</span>
                  {loading === 'all' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-[#F5C400]" />
                  Links Rápidos
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/onboarding" className="p-4 bg-zinc-800 rounded-2xl text-center font-bold hover:bg-zinc-700 transition-all">
                    Login / Cadastro
                  </Link>
                  <Link to="/" className="p-4 bg-zinc-800 rounded-2xl text-center font-bold hover:bg-zinc-700 transition-all">
                    Dashboard
                  </Link>
                  <Link to="/coordinator" className="p-4 bg-zinc-800 rounded-2xl text-center font-bold hover:bg-zinc-700 transition-all">
                    Coordenador
                  </Link>
                  <Link to="/map" className="p-4 bg-zinc-800 rounded-2xl text-center font-bold hover:bg-zinc-700 transition-all">
                    Mapa
                  </Link>
                </div>
              </div>
              
              {success && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-2xl flex items-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold">{success}</span>
                </motion.div>
              )}
            </div>
          </section>
        </div>

        <footer className="mt-12 text-center text-zinc-600 text-sm">
          <p>Ambiente de Desenvolvimento — Missão Platform v1.0</p>
        </footer>
      </div>
    </div>
  );
};
