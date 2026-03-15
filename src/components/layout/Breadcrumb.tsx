import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
}

const labelMap: Record<string, string> = {
  inicio: 'Minha Visao',
  onboarding: 'Onboarding',
  'acesso-admin': 'Acesso Admin',
  dashboard: 'Dashboard',
  map: 'Mapa',
  engajamento: 'Engajamento',
  'guia-inicial': 'Guia Inicial',
  badges: 'Conquistas',
  candidato: 'Painel Candidato',
  voluntario: 'Voluntario',
  formacao: 'Formacao',
  trilha: 'Trilha',
  modulo: 'Modulo',
  certificados: 'Certificados',
  funcao: 'Minha Funcao',
  coordinator: 'Coordenacao',
  command: 'Comando',
  redes: 'Redes',
  leads: 'Leads CRM',
  integracoes: 'Integracoes',
  programacao: 'Programacao',
  volunteers: 'Voluntarios',
  missions: 'Missoes',
  territories: 'Territorios',
  reports: 'Relatorios',
  campaigns: 'Campanhas',
  campaign: 'Campanha',
  sector: 'Setor',
  rh: 'RH',
  inteligencia: 'Inteligencia',
  coordenador: 'Coordenacao',
};

const toLabel = (segment: string): string => {
  if (labelMap[segment]) return labelMap[segment];
  if (/^[a-z0-9-]{6,}$/i.test(segment)) return 'Detalhes';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
};

export const Breadcrumb: React.FC = () => {
  const { pathname } = useLocation();

  if (pathname === '/' || pathname === '/coordinator' || pathname === '/inicio') {
    return null;
  }

  const isCoordinator = pathname.startsWith('/coordinator');
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = segments.map((segment, index) => ({
    label: toLabel(segment),
    path: `/${segments.slice(0, index + 1).join('/')}`,
  }));

  return (
    <nav
      aria-label="Localizacao"
      className="mb-5 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs text-zinc-500"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={item.path}>
            {index > 0 ? <ChevronRight className="h-3 w-3 text-zinc-500" /> : null}
            {isLast ? (
              <span className={isCoordinator ? 'font-semibold text-white' : 'font-semibold text-zinc-900'}>{item.label}</span>
            ) : (
              <Link
                to={item.path}
                className={isCoordinator ? 'transition-colors hover:text-[#F5C400]' : 'transition-colors hover:text-zinc-900'}
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
