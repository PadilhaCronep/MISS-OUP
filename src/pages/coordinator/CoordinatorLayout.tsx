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
} from 'lucide-react';
import { useAuth } from '../../components/AuthContext.tsx';
import { Breadcrumb } from '../../components/layout/Breadcrumb.tsx';
import { apiClient } from '../../lib/api-client.ts';

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
    { icon: Users, label: 'Voluntarios', path: '/coordinator/volunteers' },
    { icon: Target, label: 'Missoes', path: '/coordinator/missions' },
    { icon: MapIcon, label: 'Territorios', path: '/coordinator/territories' },
    { icon: Brain, label: 'Inteligencia', path: '/coordinator/inteligencia', badge: alertasCriticos > 0 ? alertasCriticos : null },
    { icon: BarChart3, label: 'Relatorios', path: '/coordinator/reports' },
    { icon: Rocket, label: 'Campanhas', path: '/coordinator/campaigns' },
  ]), [alertasCriticos]);

  const isActive = (path: string): boolean => location.pathname === path;

  return (
    <div className="flex min-h-screen bg-black text-white font-sans">
      <aside className="w-[260px] bg-[#111111] border-r border-zinc-800 flex flex-col fixed h-full z-50">
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
              {user?.role?.replace('_', ' ')} - {user?.state}
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
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
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
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:text-white transition-all mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-bold">Voltar a plataforma</span>
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

      <main className="flex-1 ml-[260px] p-8">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb />
          {children}
        </div>
      </main>
    </div>
  );
};
