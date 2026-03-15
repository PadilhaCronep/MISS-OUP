import { isCandidatePanelRole, isCoordinatorRole } from './role-groups.ts';

export interface WorkspaceShortcut {
  id: string;
  label: string;
  path: string;
}

const ROLE_HOME_PATH_OVERRIDES: Record<string, string> = {
  CANDIDATO: '/candidato',
  PRE_CANDIDATO: '/candidato',
  CHEFE_CAMPANHA: '/coordinator/command',
  CHEFE_REDES: '/coordinator/redes',
  CHEFE_LEADS: '/coordinator/leads',
  CHEFE_PROGRAMACAO: '/coordinator/programacao',
  LIDER_SETOR: '/coordinator/campaigns',
};

export function getRoleHomePath(role: string | null | undefined): string {
  const normalizedRole = String(role ?? '').toUpperCase();

  if (!normalizedRole) return '/dashboard';
  if (ROLE_HOME_PATH_OVERRIDES[normalizedRole]) return ROLE_HOME_PATH_OVERRIDES[normalizedRole];
  if (isCoordinatorRole(normalizedRole)) return '/coordinator';
  if (isCandidatePanelRole(normalizedRole)) return '/candidato';

  return '/dashboard';
}

export function buildWorkspaceShortcuts(
  role: string | null | undefined,
  isCampaignMember: boolean,
): WorkspaceShortcut[] {
  const shortcuts: WorkspaceShortcut[] = [
    { id: 'home', label: 'Minha visao', path: getRoleHomePath(role) },
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'mapa', label: 'Mapa', path: '/map' },
  ];

  if (isCampaignMember) {
    shortcuts.push({ id: 'campanhas', label: 'Campanhas', path: '/voluntario/campanhas' });
  }

  if (isCandidatePanelRole(role)) {
    shortcuts.push({ id: 'candidato', label: 'Candidato', path: '/candidato' });
  }

  if (isCoordinatorRole(role)) {
    shortcuts.push({ id: 'coordenacao', label: 'Coordenacao', path: '/coordinator' });
  }

  const uniqueByPath = new Map<string, WorkspaceShortcut>();
  shortcuts.forEach((shortcut) => {
    if (!uniqueByPath.has(shortcut.path)) {
      uniqueByPath.set(shortcut.path, shortcut);
    }
  });

  return Array.from(uniqueByPath.values());
}
