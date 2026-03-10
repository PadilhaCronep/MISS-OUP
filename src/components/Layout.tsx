import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Map, Target, Award, BookOpen, LogOut, Menu, Users, Bell, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from './AuthContext.tsx';
import { NotificacoesDrawer } from './voluntario/NotificacoesDrawer.tsx';
import { Breadcrumb } from './layout/Breadcrumb.tsx';
import { apiClient } from '../lib/api-client.ts';
import { useNotificacoes } from '../hooks/useNotificacoes.ts';

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

      const result = await apiClient.get<{ isMember: boolean }>(
        `/api/voluntario/minha-funcao?volunteerId=${user.id}`,
        { signal: controller.signal },
      );

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

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Missoes', path: '/missions', icon: Target },
    { name: 'Mapa', path: '/map', icon: Map },
    { name: 'Formacao', path: '/voluntario/formacao', icon: BookOpen },
    { name: 'Conquistas', path: '/badges', icon: Award },
  ];

  if (isCampaignMember) {
    navItems.push({ name: 'Minha Funcao', path: '/voluntario/funcao', icon: Settings });
  }

  if (user && ['COORDENADOR_MUNICIPAL', 'COORDENADOR_ESTADUAL', 'ADMIN'].includes(user.role)) {
    navItems.push({ name: 'Coordenacao', path: '/coordinator', icon: Users });
  }

  if (!user || location.pathname.startsWith('/coordinator')) {
    return <div className="min-h-screen bg-zinc-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
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

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
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

      <header className="md:hidden bg-zinc-900 text-zinc-100 p-4 flex items-center justify-between sticky top-0 z-50">
        <h1 className="text-xl font-bold text-[#F5C400]">MISSAO</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2" aria-label="Abrir menu">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-zinc-900 text-zinc-100 absolute top-16 left-0 right-0 z-40 border-b border-zinc-800 shadow-xl"
        >
          <nav className="p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-300 hover:bg-zinc-800"
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-3 w-full text-red-400 hover:bg-zinc-800 rounded-xl"
            >
              <LogOut className="w-5 h-5" />
              Sair
            </button>
          </nav>
        </motion.div>
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <Breadcrumb />
          {children}
        </div>
      </main>

      <NotificacoesDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
};
