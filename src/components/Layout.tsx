import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Award, Bell, BookOpen, Compass, Home, LogOut, Map as MapIcon, Menu, Settings, Target, Trophy, Users, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from './AuthContext.tsx';
import { NotificacoesDrawer } from './voluntario/NotificacoesDrawer.tsx';
import { Breadcrumb } from './layout/Breadcrumb.tsx';
import { apiClient } from '../lib/api-client.ts';
import { useNotificacoes } from '../hooks/useNotificacoes.ts';
import { isCandidatePanelRole, isCoordinatorRole } from '../lib/role-groups.ts';
import { buildWorkspaceShortcuts, getRoleHomePath } from '../lib/navigation.ts';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isCampaignMember, setIsCampaignMember] = useState(false);

  const { unreadCount } = useNotificacoes(user?.id ?? null, {
    enabled: !!user,
    pollingMs: 30000,
  });

  useEffect(() => {
    const controller = new AbortController();

    const checkCampaignMembership = async () => {
      if (!user) {
        setIsCampaignMember(false);
        return;
      }

      const result = await apiClient.get<{ isMember: boolean }>('/api/voluntario/minha-funcao', {
        signal: controller.signal,
      });

      if (controller.signal.aborted || result.error || !result.data) {
        setIsCampaignMember(false);
        return;
      }

      setIsCampaignMember(result.data.isMember);
    };

    void checkCampaignMembership();

    return () => {
      controller.abort();
    };
  }, [user]);

  const workspaceShortcuts = useMemo(
    () => buildWorkspaceShortcuts(user?.role, isCampaignMember),
    [user?.role, isCampaignMember],
  );

  const navItems = useMemo(() => {
    const items = [
      { name: 'Minha Visao', path: '/inicio', icon: Compass, group: 'workspace' },
      { name: 'Arena', path: '/', icon: Trophy, group: 'base' },
      { name: 'Engajamento', path: '/engajamento', icon: Target, group: 'base' },
      { name: 'Dashboard', path: '/dashboard', icon: Home, group: 'base' },
      { name: 'Mapa', path: '/map', icon: MapIcon, group: 'base' },
      { name: 'Guia Inicial', path: '/guia-inicial', icon: Compass, group: 'base' },
      { name: 'Formacao', path: '/voluntario/formacao', icon: BookOpen, group: 'base' },
      { name: 'Conquistas', path: '/badges', icon: Award, group: 'base' },
    ];

    if (isCampaignMember) {
      items.push({ name: 'Campanhas', path: '/voluntario/campanhas', icon: Users, group: 'operacao' });
      items.push({ name: 'Minha Funcao', path: '/voluntario/funcao', icon: Settings, group: 'operacao' });
    }

    if (user && isCandidatePanelRole(user.role)) {
      items.push({ name: 'Candidato', path: '/candidato', icon: Compass, group: 'lideranca' });
    }

    if (user && isCoordinatorRole(user.role)) {
      items.push({ name: 'Coordenacao', path: '/coordinator', icon: Users, group: 'lideranca' });
    }

    return items;
  }, [isCampaignMember, user]);

  const groupedNavItems = useMemo(() => {
    const groups = [
      { id: 'workspace', label: 'Visao Atual' },
      { id: 'base', label: 'Base da Plataforma' },
      { id: 'operacao', label: 'Operacao de Campanha' },
      { id: 'lideranca', label: 'Lideranca' },
    ] as const;

    return groups
      .map((group) => ({
        ...group,
        items: navItems.filter((item) => item.group === group.id),
      }))
      .filter((group) => group.items.length > 0);
  }, [navItems]);

  const mobileQuickItems = useMemo(() => {
    const preferredPaths = [
      getRoleHomePath(user?.role),
      '/map',
      '/engajamento',
      '/voluntario/campanhas',
      '/coordinator',
      '/candidato',
      '/dashboard',
    ];

    const quick = preferredPaths
      .map((path) => navItems.find((item) => item.path === path))
      .filter((item): item is (typeof navItems)[number] => Boolean(item));

    const uniqueByPath = new Map(quick.map((item) => [item.path, item]));

    return Array.from(uniqueByPath.values()).slice(0, 4);
  }, [navItems, user?.role]);

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

  const isPathActive = (path: string): boolean => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  if (!user || location.pathname.startsWith('/coordinator')) {
    return (
      <div className="min-h-screen bg-zinc-50 bg-[radial-gradient(circle_at_top_right,_rgba(245,196,0,0.08),_transparent_42%)]">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 bg-[radial-gradient(circle_at_top_right,_rgba(245,196,0,0.08),_transparent_42%)] flex flex-col md:flex-row">
      <aside className="hidden md:flex flex-col w-64 bg-zinc-900 text-zinc-100 min-h-screen border-r border-zinc-800">
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#F5C400] tracking-tight">MISSAO</h1>
            <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wider">Plataforma</p>
          </div>
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
            aria-label="Abrir notificacoes"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
          <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-800/40 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Acesso Rapido</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {workspaceShortcuts.map((shortcut) => {
                const active = isPathActive(shortcut.path);
                return (
                  <Link
                    key={shortcut.id}
                    to={shortcut.path}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      active
                        ? 'border-[#F5C400] bg-[#F5C400] text-zinc-900'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {shortcut.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {groupedNavItems.map((group) => (
              <div key={group.id}>
                <p className="mb-1 px-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">{group.label}</p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = isPathActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                          isActive
                            ? 'bg-[#F5C400] text-zinc-900 font-medium'
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-[#F5C400] font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-100 truncate">{user.name}</p>
              <p className="text-xs text-zinc-400 truncate">Nivel {user.current_level}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-2 w-full text-zinc-400 hover:text-red-400 transition-colors rounded-lg"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      <header className="md:hidden sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] text-zinc-100 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-100"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">Plataforma</p>
            <h1 className="truncate text-base font-extrabold tracking-tight text-[#F5C400]">MISSAO</h1>
          </div>
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-100"
            aria-label="Abrir notificacoes"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/55 md:hidden"
              aria-label="Fechar menu"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="fixed inset-y-0 left-0 z-50 w-[86%] max-w-sm border-r border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl md:hidden"
            >
              <div className="flex h-full flex-col">
                <div className="border-b border-zinc-800 px-4 pb-4 pt-[max(env(safe-area-inset-top),1rem)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Navegacao</p>
                      <h2 className="text-xl font-black tracking-tight text-[#F5C400]">MISSAO</h2>
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
                    <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-zinc-400">Nivel {user.current_level}</p>
                  </div>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4">
                  <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Acesso Rapido</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {workspaceShortcuts.map((shortcut) => {
                        const active = isPathActive(shortcut.path);
                        return (
                          <Link
                            key={shortcut.id}
                            to={shortcut.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                              active
                                ? 'border-[#F5C400] bg-[#F5C400] text-zinc-950'
                                : 'border-zinc-700 bg-zinc-900 text-zinc-300'
                            }`}
                          >
                            {shortcut.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {groupedNavItems.map((group) => (
                      <div key={group.id}>
                        <p className="mb-1 px-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">{group.label}</p>
                        <div className="space-y-1">
                          {group.items.map((item) => {
                            const active = isPathActive(item.path);
                            return (
                              <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                                  active
                                    ? 'bg-[#F5C400] text-zinc-950'
                                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                                }`}
                              >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </nav>

                <div className="space-y-2 border-t border-zinc-800 px-3 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsNotificationsOpen(true);
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-zinc-200"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notificacoes
                    </span>
                    {unreadCount > 0 ? (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">{unreadCount}</span>
                    ) : null}
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
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 pb-8 pt-5 sm:px-6 md:py-8 lg:px-8">
          <Breadcrumb />
          {children}
        </div>
      </main>

      <nav className="safe-area-bottom fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-950/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileQuickItems.map((item) => {
            const active = isPathActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-semibold transition-colors ${
                  active ? 'bg-[#F5C400] text-zinc-950' : 'text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="mt-1">{item.name}</span>
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

      <NotificacoesDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
};
