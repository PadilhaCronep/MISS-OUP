import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
}

const labelMap: Record<string, string> = {
  onboarding: 'Onboarding',
  'acesso-admin': 'Acesso Admin',
  map: 'Mapa',
  badges: 'Conquistas',
  voluntario: 'Voluntario',
  formacao: 'Formacao',
  trilha: 'Trilha',
  modulo: 'Modulo',
  certificados: 'Certificados',
  funcao: 'Minha Funcao',
  coordinator: 'Coordenacao',
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

  if (pathname === '/' || pathname === '/coordinator') {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = segments.map((segment, index) => ({
    label: toLabel(segment),
    path: `/${segments.slice(0, index + 1).join('/')}`,
  }));

  return (
    <nav aria-label="Localizacao" className="flex items-center gap-2 text-xs text-zinc-400 mb-6 flex-wrap">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={item.path}>
            {index > 0 ? <ChevronRight className="w-3 h-3 text-zinc-500" /> : null}
            {isLast ? (
              <span className="text-white font-semibold">{item.label}</span>
            ) : (
              <Link to={item.path} className="hover:text-[#F5C400] transition-colors">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

