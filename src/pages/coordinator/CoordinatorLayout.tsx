import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Target,
  Map as MapIcon,
  BarChart3,
  LogOut,
  ShieldAlert,
  CheckSquare,
  UserPlus,
  ArrowLeft,
  Rocket,
  Brain,
  Menu,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../../components/AuthContext.tsx';
import { Breadcrumb } from '../../components/layout/Breadcrumb.tsx';
import { apiClient } from '../../lib/api-client.ts';
import { isCandidatePanelRole } from '../../lib/role-groups.ts';

interface AlertaInteligencia {
  classificacao?: string;
  ic?: number;
}

interface AlertasResponse {
  alertas: AlertaInteligencia[];
  total: number;
}

export const CoordinatorLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [alertasCriticos, setAlertasCriticos] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadAlertas = async (): Promise<void> => {
      const result = await apiClient.get<AlertasResponse>('/api/inteligencia/alertas?limite=30');
      if (cancelled || result.error || !result.data) return;

      const criticos = result.data.alertas.filter(
        (alerta) => alerta.classificacao === 'DIAMANTE' || (typeof alerta.ic === 'number' && alerta.ic < 0.5),
      ).length;

      setAlertasCriticos(criticos);
    };

    void loadAlertas();
    return () => {
      cancelled = true;
    };
  }, []);

  const menuItems = useMemo(() => ([
    { icon: LayoutDashboard, label: 'Dashboard', path: '/coordinator' },
    { icon: LayoutDashboard, label: 'Comando', path: '/coordinator/command' },
    { icon: BarChart3, label: 'Redes', path: '/coordinator/redes' },
    { icon: ShieldAlert, label: 'Integracoes', path: '/coordinator/integracoes' },
    { icon: UserPlus, label: 'Leads CRM', path: '/coordinator/leads' },
    { icon: Rocket, label: 'Programacao', path: '/coordinator/programacao' },
    { icon: Users, label: 'Voluntarios', path: '/coordinator/volunteers' },
    { icon: Target, label: 'Missoes', path: '/coordinator/missions' },
    { icon: MapIcon, label: 'Territorios', path: '/coordinator/territories' },
    { icon: Brain, label: 'Inteligencia', path: '/coordinator/inteligencia', badge: alertasCriticos > 0 ? alertasCriticos : null },
    { icon: BarChart3, label: 'Relatorios', path: '/coordinator/reports' },
    { icon: Rocket, label: 'Campanhas', path: '/coordinator/campaigns' },
    ...(user && isCandidatePanelRole(user.role) ? [{ icon: LayoutDashboard, label: 'Painel Candidato', path: '/candidato' }] : []),
  ]), [alertasCriticos, user]);

  const mobileQuickItems = useMemo(
    () => menuItems.filter((item) => ['/coordinator', '/coordinator/volunteers', '/coordinator/missions', '/coordinator/inteligencia'].includes(item.path)).slice(0, 4),
    [menuItems],
  );

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const isActive = (path: string): boolean => {
    if (path === '/coordinator') return location.pathname === '/coordinator';
    return location.pathname.startsWith(path);
  };

  const renderNavList = (closeOnClick?: boolean) => (
    <>
      {menuItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          onClick={closeOnClick ? () => setIsMobileMenuOpen(false) : undefined}
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all group ${
            isActive(item.path)
              ? 'bg-[#F5C400] text-black font-bold'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'text-black' : 'text-zinc-500 group-hover:text-[#F5C400]'}`} />
            <span className="text-sm">{item.label}</span>
          </div>
          {item.badge ? (
            <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">{item.badge}</span>
          ) : null}
        </Link>
      ))}
    </>
  );

  return (
    <div className="flex min-h-screen bg-black text-white font-sans">
      <aside className="hidden lg:flex w-[260px] bg-[#111111] border-r border-zinc-800 flex-col fixed h-full z-40">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-[#F5C400] rounded-lg flex items-center justify-center">
              <span className="text-black font-black text-xl">M</span>
            </div>
            <span className="text-xl font-black tracking-tighter">MISSAO</span>
          </div>

          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
            <p className="text-sm font-bold text-white truncate">{user?.name}</p>
            <span className="text-[10px] font-black text-[#F5C400] uppercase tracking-wider">
              {user?.role?.replaceAll('_', ' ')} - {user?.state}
            </span>
          </div>
        </div>

        <div className="px-6 mb-6">
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-400">{user?.state ?? 'UF'}</span>
              <span className="text-[10px] font-bold text-emerald-500">SAUDAVEL</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[78%]" />
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <p className="px-4 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2">Navegacao</p>
          {renderNavList()}

          <div className="pt-4 mt-4 border-t border-zinc-800 space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all group">
              <UserPlus className="w-5 h-5 text-zinc-500 group-hover:text-[#F5C400]" />
              <span className="text-sm">Convidar</span>
            </button>
            <Link
              to="/coordinator/missions?tab=validate"
              className="flex items-center justify-between px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-3">
                <CheckSquare className="w-5 h-5 text-zinc-500 group-hover:text-[#F5C400]" />
                <span className="text-sm">Validar</span>
              </div>
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">3</span>
            </Link>
          </div>
        </nav>

        <div className="p-4">
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-red-500">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Alertas</span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-tight">
              {alertasCriticos > 0
                ? `${alertasCriticos} alertas territoriais criticos detectados.`
                : 'Sem alertas territoriais criticos.'}
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={() => navigate('/inicio')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:text-white transition-all mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-bold">Ir para minha visao</span>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-bold">Sair</span>
          </button>
        </div>
      </aside>

      <header className="lg:hidden sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/95 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-100"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Painel coordenador</p>
            <h1 className="truncate text-base font-black tracking-tight text-[#F5C400]">MISSAO</h1>
          </div>

          <button
            onClick={() => navigate('/inicio')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-100"
            aria-label="Ir para minha visao"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen ? (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              aria-label="Fechar menu"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="fixed inset-y-0 left-0 z-50 w-[86%] max-w-sm border-r border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl lg:hidden"
            >
              <div className="flex h-full flex-col">
                <div className="border-b border-zinc-800 px-4 pb-4 pt-[max(env(safe-area-inset-top),1rem)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Menu rapido</p>
                      <h2 className="text-xl font-black tracking-tight text-[#F5C400]">Coordenacao</h2>
                    </div>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-200"
                      aria-label="Fechar menu"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
                    <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-zinc-400">
                      {user?.role?.replaceAll('_', ' ')} - {user?.state}
                    </p>
                  </div>
                </div>

                <nav className="flex-1 overflow-y-auto space-y-1 px-3 py-4">
                  {renderNavList(true)}

                  <div className="pt-4 mt-4 border-t border-zinc-800 space-y-1">
                    <Link
                      to="/coordinator/missions?tab=validate"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-3 rounded-xl text-zinc-300 hover:bg-zinc-900"
                    >
                      <div className="inline-flex items-center gap-2">
                        <CheckSquare className="h-4 w-4" />
                        <span className="text-sm">Validar missoes</span>
                      </div>
                      <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">3</span>
                    </Link>
                  </div>
                </nav>

                <div className="space-y-2 border-t border-zinc-800 px-3 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
                  <button
                    onClick={() => navigate('/inicio')}
                    className="flex w-full items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-zinc-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Ir para minha visao
                  </button>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm font-semibold text-red-300"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <main className="flex-1 lg:ml-[260px] p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb />
          {children}
        </div>
      </main>

      <nav className="safe-area-bottom fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-950/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileQuickItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-semibold transition-colors ${
                  active ? 'bg-[#F5C400] text-zinc-950' : 'text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="mt-1 truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-900"
          >
            <Menu className="h-4 w-4" />
            <span className="mt-1">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

