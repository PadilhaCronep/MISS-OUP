import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  ExternalLink,
  Loader2,
  Shield,
  UserCog,
} from 'lucide-react';
import { apiClient } from '../lib/api-client.ts';
import { useAuth, type UserRole } from '../components/AuthContext.tsx';
import { getRoleHomePath } from '../lib/navigation.ts';

interface DevBinding {
  role: string;
  scope_type: string;
  scope_ref: string | null;
  office_context: string | null;
}

interface DevUser {
  id: string;
  name: string;
  email: string;
  role: string;
  city: string | null;
  state: string | null;
  xp_total: number;
  current_level: number;
  missions_completed: number;
  bindings: DevBinding[];
}

interface DevUsersResponse {
  enabled: boolean;
  authDevMode: boolean;
  users: DevUser[];
}

const staticCredentials = [
  { perfil: 'Admin Nacional', email: 'admin@missao.com.br', senha: 'Missao@2025', painel: '/coordinator' },
  { perfil: 'Chefe de Campanha', email: 'chefe@missao.com.br', senha: 'Campanha@2025', painel: '/coordinator' },
  { perfil: 'Pre-Candidata Presidencial', email: 'pre.presidencia@missao.com.br', senha: 'PrePres@2026', painel: '/coordinator' },
  { perfil: 'Pre-Candidato Governo SP', email: 'pre.gov.sp@missao.com.br', senha: 'PreGovSP@2026', painel: '/coordinator' },
  { perfil: 'Pre-Candidato Dep Federal', email: 'pre.depfed.sp@missao.com.br', senha: 'PreDepFed@2026', painel: '/coordinator' },
  { perfil: 'Coordenador SP', email: 'coord.sp@missao.com.br', senha: 'CoordSP@2025', painel: '/coordinator' },
  { perfil: 'Lider de Setor', email: 'lider.tech@missao.com.br', senha: 'LiderTech@2026', painel: '/coordinator' },
  { perfil: 'Militante', email: 'militante@missao.com.br', senha: 'Militante@2026', painel: '/' },
  { perfil: 'Voluntario', email: 'voluntario@missao.com.br', senha: 'Voluntario@2025', painel: '/' },
];

const roleBadgeClass: Record<string, string> = {
  ADMIN: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  ADMIN_NACIONAL: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  CHEFE_CAMPANHA: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  PRE_CANDIDATO: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  COORDENADOR_ESTADUAL: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  COORDENADOR_MUNICIPAL: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  LIDER_SETOR: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  MILITANTE: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  VOLUNTARIO: 'bg-zinc-700 text-zinc-200 border-zinc-600',
};

function resolveStartRoute(role: string): string {
  return getRoleHomePath(role);
}

export const AdminAccess: React.FC = () => {
  const { user, devLogin } = useAuth();
  const navigate = useNavigate();

  const [loadingSeed, setLoadingSeed] = useState<string | null>(null);
  const [loadingSwitchUserId, setLoadingSwitchUserId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [devUsers, setDevUsers] = useState<DevUser[]>([]);
  const [devModeEnabled, setDevModeEnabled] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);

  const showSuccess = useCallback((message: string) => {
    setSuccess(message);
    window.setTimeout(() => setSuccess(null), 3200);
  }, []);

  const loadDevUsers = useCallback(async () => {
    setDevLoading(true);

    const result = await apiClient.get<DevUsersResponse>('/api/auth/dev/users');
    if (result.error || !result.data) {
      setDevModeEnabled(false);
      setDevUsers([]);
      setDevError('Modo de teste local desativado. Defina AUTH_DEV_MODE=true para habilitar.');
      setDevLoading(false);
      return;
    }

    setDevModeEnabled(Boolean(result.data.enabled));
    setDevUsers(result.data.users ?? []);
    setDevError(null);
    setDevLoading(false);
  }, []);

  useEffect(() => {
    void loadDevUsers();
  }, [loadDevUsers]);

  const runSeed = async (type: string) => {
    setLoadingSeed(type);

    const result = await apiClient.post<{ success: boolean; count?: number }>(
      `/api/seed${type === 'all' ? '' : '/' + type}`,
      {},
    );

    if (result.error) {
      alert(result.error);
      setLoadingSeed(null);
      return;
    }

    showSuccess(`Seed "${type}" executado com sucesso.`);
    setLoadingSeed(null);
    await loadDevUsers();
  };

  const loginAsUser = async (targetUserId: string, role: string) => {
    setLoadingSwitchUserId(targetUserId);

    try {
      await devLogin(targetUserId);
      showSuccess('Sessao local atualizada.');
      navigate(resolveStartRoute(role), { replace: true });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Falha no login local');
    } finally {
      setLoadingSwitchUserId(null);
    }
  };

  const currentRole = useMemo(() => (user?.role ?? 'SEM_SESSAO') as UserRole | 'SEM_SESSAO', [user]);

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 text-center">
          <div className="w-16 h-16 bg-[#F5C400] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(245,196,0,0.2)]">
            <Shield className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">Acessos Administrativos</h1>
          <p className="text-zinc-500">Teste local de perfis, escopos e visoes por cargo.</p>
        </header>

        <section className="mb-6 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">Sessao atual</p>
            <p className="font-semibold text-zinc-100">{user ? `${user.name} (${user.email})` : 'Sem usuario logado'}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${roleBadgeClass[currentRole] ?? 'bg-zinc-700 text-zinc-200 border-zinc-600'}`}>
            {currentRole}
          </span>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Database className="w-5 h-5 text-[#F5C400]" />
                Credenciais de referencia
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-800/50 border-b border-zinc-800">
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Perfil</th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Email</th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Senha</th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Painel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {staticCredentials.map((credential) => (
                    <tr key={credential.email} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#F5C400]">{credential.perfil}</td>
                      <td className="px-4 py-3 text-sm text-zinc-300 font-mono">{credential.email}</td>
                      <td className="px-4 py-3 text-sm text-zinc-300 font-mono">{credential.senha}</td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{credential.painel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-[#F5C400]" />
              Troca rapida de usuario
            </h2>

            {devLoading && (
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando usuarios locais...
              </div>
            )}

            {!devLoading && devError && (
              <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300">
                {devError}
              </div>
            )}

            {!devLoading && !devError && devUsers.length === 0 && (
              <div className="p-3 rounded-xl border border-zinc-700 bg-zinc-800/50 text-sm text-zinc-400">
                Nenhum usuario encontrado. Execute seed de administradores.
              </div>
            )}

            {!devLoading && !devError && devUsers.length > 0 && (
              <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                {devUsers.map((devUser) => {
                  const firstBinding = devUser.bindings[0];
                  const scopeLabel = firstBinding
                    ? `${firstBinding.scope_type}${firstBinding.scope_ref ? `: ${firstBinding.scope_ref}` : ''}`
                    : 'Sem binding';

                  return (
                    <div key={devUser.id} className="p-3 rounded-2xl border border-zinc-800 bg-zinc-800/40">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm text-zinc-100">{devUser.name}</p>
                          <p className="text-xs text-zinc-400 font-mono">{devUser.email}</p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {devUser.city || '-'} / {devUser.state || '-'}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${roleBadgeClass[devUser.role] ?? 'bg-zinc-700 text-zinc-200 border-zinc-600'}`}>
                          {devUser.role}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-400 mt-2">Escopo: {scopeLabel}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-zinc-500">
                          Nivel {devUser.current_level} | XP {devUser.xp_total}
                        </span>
                        <button
                          type="button"
                          disabled={!devModeEnabled || loadingSwitchUserId === devUser.id}
                          onClick={() => loginAsUser(devUser.id, devUser.role)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F5C400] text-black text-xs font-black disabled:opacity-50"
                        >
                          {loadingSwitchUserId === devUser.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                          Entrar como
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-[#F5C400]" />
              Seeds de teste
            </h3>
            <div className="space-y-3">
              {[
                { key: 'admin', label: 'Criar / atualizar perfis de acesso' },
                { key: 'voluntarios', label: 'Criar voluntarios ficticios' },
                { key: 'missoes', label: 'Criar missoes realistas' },
                { key: 'all', label: 'Executar seed completo' },
              ].map((seedAction) => (
                <button
                  key={seedAction.key}
                  onClick={() => runSeed(seedAction.key)}
                  disabled={Boolean(loadingSeed)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                    seedAction.key === 'all'
                      ? 'bg-[#F5C400] text-black font-black'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                >
                  <span>{seedAction.label}</span>
                  {loadingSeed === seedAction.key ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-[#F5C400]" />
              Links rapidos
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/onboarding" className="p-4 bg-zinc-800 rounded-2xl text-center font-bold hover:bg-zinc-700 transition-all">
                Login / Cadastro
              </Link>
              <Link to="/" className="p-4 bg-zinc-800 rounded-2xl text-center font-bold hover:bg-zinc-700 transition-all">
                Dashboard
              </Link>
              <Link to="/coordinator" className="p-4 bg-zinc-800 rounded-2xl text-center font-bold hover:bg-zinc-700 transition-all">
                Coordenacao
              </Link>
              <Link to="/map" className="p-4 bg-zinc-800 rounded-2xl text-center font-bold hover:bg-zinc-700 transition-all">
                Mapa
              </Link>
            </div>
          </div>
        </section>

        {success && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-green-500/10 border border-green-500/30 text-green-400 rounded-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">{success}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

