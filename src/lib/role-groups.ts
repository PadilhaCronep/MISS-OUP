export const COORDINATION_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'ADMIN_NACIONAL',
  'DIRECAO_PARTIDARIA',
  'ADMIN_ESTADUAL',
  'ADMIN_REGIONAL',
  'PRE_CANDIDATO',
  'CANDIDATO',
  'CHEFE_CAMPANHA',
  'CHEFE_REDES',
  'CHEFE_LEADS',
  'CHEFE_PROGRAMACAO',
  'COORDENADOR_CAMPANHA',
  'COORDENADOR_TERRITORIAL',
  'COORDENADOR_ESTADUAL',
  'COORDENADOR_MUNICIPAL',
  'LIDER_SETOR',
] as const;

const COORDINATION_ROLE_SET = new Set<string>(COORDINATION_ROLES);

export function isCoordinatorRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return COORDINATION_ROLE_SET.has(role.toUpperCase());
}

export const CANDIDATE_PANEL_ROLES = ['CANDIDATO', 'PRE_CANDIDATO', 'CHEFE_CAMPANHA', 'CHEFE_REDES', 'CHEFE_LEADS', 'CHEFE_PROGRAMACAO'] as const;

const CANDIDATE_PANEL_ROLE_SET = new Set<string>(CANDIDATE_PANEL_ROLES);

export function isCandidatePanelRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return CANDIDATE_PANEL_ROLE_SET.has(role.toUpperCase());
}
