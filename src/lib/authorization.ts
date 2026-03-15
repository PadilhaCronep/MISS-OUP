export type AccessRole =
  | 'SUPER_ADMIN'
  | 'ADMIN_NACIONAL'
  | 'DIRECAO_PARTIDARIA'
  | 'ADMIN_ESTADUAL'
  | 'ADMIN_REGIONAL'
  | 'PRE_CANDIDATO'
  | 'CANDIDATO'
  | 'CHEFE_CAMPANHA'
  | 'CHEFE_REDES'
  | 'CHEFE_LEADS'
  | 'CHEFE_PROGRAMACAO'
  | 'COORDENADOR_CAMPANHA'
  | 'COORDENADOR_TERRITORIAL'
  | 'LIDER_SETOR'
  | 'OPERADOR_AREA'
  | 'MEMBRO_SETOR'
  | 'MILITANTE'
  | 'VOLUNTARIO';

export type AccessScopeType =
  | 'NACIONAL'
  | 'ESTADUAL'
  | 'REGIONAL'
  | 'MUNICIPAL'
  | 'CAMPANHA'
  | 'SETOR'
  | 'PROPRIO_USUARIO';

export interface AccessBinding {
  role: AccessRole;
  scopeType: AccessScopeType;
  scopeRef: string | null;
  officeContext: string | null;
}

export interface AuthActor {
  id: string;
  name: string;
  email: string;
  state: string | null;
  city: string | null;
  legacyRole: string | null;
  bindings: AccessBinding[];
}

const NATIONAL_ROLES = new Set<AccessRole>(['SUPER_ADMIN', 'ADMIN_NACIONAL', 'DIRECAO_PARTIDARIA']);
const COORDINATOR_ROLES = new Set<AccessRole>([
  'SUPER_ADMIN',
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
  'LIDER_SETOR',
]);

const ROLE_HIERARCHY_INDEX: Record<AccessRole, number> = {
  SUPER_ADMIN: 1,
  ADMIN_NACIONAL: 2,
  DIRECAO_PARTIDARIA: 3,
  ADMIN_ESTADUAL: 4,
  ADMIN_REGIONAL: 5,
  PRE_CANDIDATO: 6,
  CANDIDATO: 7,
  CHEFE_CAMPANHA: 8,
  CHEFE_REDES: 9,
  CHEFE_LEADS: 9,
  CHEFE_PROGRAMACAO: 9,
  COORDENADOR_CAMPANHA: 10,
  COORDENADOR_TERRITORIAL: 11,
  LIDER_SETOR: 12,
  OPERADOR_AREA: 13,
  MEMBRO_SETOR: 14,
  MILITANTE: 15,
  VOLUNTARIO: 16,
};

export function normalizeRole(input: string | null | undefined): AccessRole {
  switch ((input || '').trim().toUpperCase()) {
    case 'SUPER_ADMIN':
      return 'SUPER_ADMIN';
    case 'ADMIN_NACIONAL':
    case 'ADMIN':
      return 'ADMIN_NACIONAL';
    case 'DIRECAO_PARTIDARIA':
    case 'DIRECAO':
      return 'DIRECAO_PARTIDARIA';
    case 'ADMIN_ESTADUAL':
    case 'COORDENADOR_ESTADUAL':
      return 'ADMIN_ESTADUAL';
    case 'ADMIN_REGIONAL':
    case 'COORDENADOR_MUNICIPAL':
      return 'ADMIN_REGIONAL';
    case 'PRE_CANDIDATO':
    case 'PRE_CANDIDATO_PRESIDENCIAL':
    case 'PRE_CANDIDATO_GOVERNADOR':
    case 'PRE_CANDIDATO_DEP_FEDERAL':
    case 'PRE_CANDIDATO_DEP_ESTADUAL':
      return 'PRE_CANDIDATO';
    case 'CANDIDATO':
      return 'CANDIDATO';
    case 'CHEFE_CAMPANHA':
      return 'CHEFE_CAMPANHA';
    case 'CHEFE_REDES':
      return 'CHEFE_REDES';
    case 'CHEFE_LEADS':
      return 'CHEFE_LEADS';
    case 'CHEFE_PROGRAMACAO':
    case 'CHEFE_PROGRAMAÇÃO':
      return 'CHEFE_PROGRAMACAO';
    case 'COORDENADOR_CAMPANHA':
      return 'COORDENADOR_CAMPANHA';
    case 'COORDENADOR_TERRITORIAL':
    case 'COORDENADOR_LOCAL':
      return 'COORDENADOR_TERRITORIAL';
    case 'LIDER_SETOR':
      return 'LIDER_SETOR';
    case 'OPERADOR_AREA':
    case 'OPERADOR_DE_AREA':
      return 'OPERADOR_AREA';
    case 'MEMBRO_SETOR':
      return 'MEMBRO_SETOR';
    case 'MILITANTE':
    case 'LIDER_EMERGENTE':
      return 'MILITANTE';
    default:
      return 'VOLUNTARIO';
  }
}

export function normalizeScopeType(input: string | null | undefined): AccessScopeType {
  switch ((input || '').trim().toUpperCase()) {
    case 'NACIONAL':
      return 'NACIONAL';
    case 'ESTADUAL':
      return 'ESTADUAL';
    case 'REGIONAL':
      return 'REGIONAL';
    case 'MUNICIPAL':
      return 'MUNICIPAL';
    case 'CAMPANHA':
      return 'CAMPANHA';
    case 'SETOR':
      return 'SETOR';
    default:
      return 'PROPRIO_USUARIO';
  }
}

export function parseCampaignState(configuration: unknown): string | null {
  let parsed: Record<string, unknown> | null = null;

  if (typeof configuration === 'string' && configuration) {
    try {
      parsed = JSON.parse(configuration) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  } else if (configuration && typeof configuration === 'object') {
    parsed = configuration as Record<string, unknown>;
  }

  if (!parsed) return null;

  const candidates = [parsed.state, parsed.estado, parsed.estado_foco, parsed.uf, parsed.target_state]
    .filter((value) => typeof value === 'string')
    .map((value) => String(value).trim().toUpperCase())
    .filter((value) => value.length === 2);

  return candidates[0] ?? null;
}

export function hasRole(actor: AuthActor, roles: AccessRole[]): boolean {
  const roleSet = new Set(roles);
  return actor.bindings.some((binding) => roleSet.has(binding.role));
}

export function getRoleHierarchyLevel(role: AccessRole): number {
  return ROLE_HIERARCHY_INDEX[role];
}

export function getPrimaryRole(actor: AuthActor): AccessRole {
  const sorted = [...actor.bindings].sort(
    (a, b) => getRoleHierarchyLevel(a.role) - getRoleHierarchyLevel(b.role),
  );

  return sorted[0]?.role ?? 'VOLUNTARIO';
}

export function canManageRole(actor: AuthActor, targetRole: AccessRole): boolean {
  const actorPrimary = getPrimaryRole(actor);

  if (hasNationalAccess(actor)) return true;
  return getRoleHierarchyLevel(actorPrimary) < getRoleHierarchyLevel(targetRole);
}

export function canSendHierarchicalMessage(actor: AuthActor, targetRole: AccessRole): boolean {
  const actorPrimary = getPrimaryRole(actor);

  if (targetRole === actorPrimary) return true;
  if (hasNationalAccess(actor)) return true;

  if (actorPrimary === 'CANDIDATO') {
    return ['CHEFE_CAMPANHA', 'CHEFE_REDES', 'CHEFE_LEADS', 'CHEFE_PROGRAMACAO', 'COORDENADOR_CAMPANHA'].includes(targetRole);
  }

  return getRoleHierarchyLevel(actorPrimary) < getRoleHierarchyLevel(targetRole);
}

export function hasNationalAccess(actor: AuthActor): boolean {
  if (actor.bindings.some((binding) => NATIONAL_ROLES.has(binding.role))) {
    return true;
  }

  return actor.bindings.some(
    (binding) => binding.role === 'PRE_CANDIDATO' && (binding.officeContext || '').toUpperCase() === 'PRESIDENTE',
  );
}

export function canAccessCoordinatorPanel(actor: AuthActor): boolean {
  return actor.bindings.some((binding) => COORDINATOR_ROLES.has(binding.role));
}

export function getAllowedStates(actor: AuthActor): string[] {
  const states = actor.bindings
    .filter((binding) => binding.scopeType === 'ESTADUAL' && binding.scopeRef)
    .map((binding) => String(binding.scopeRef).toUpperCase());

  return Array.from(new Set(states));
}

export function getAllowedCities(actor: AuthActor): string[] {
  const cities = actor.bindings
    .filter((binding) => binding.scopeType === 'MUNICIPAL' && binding.scopeRef)
    .map((binding) => String(binding.scopeRef));

  return Array.from(new Set(cities));
}

export function getAllowedCampaigns(actor: AuthActor): string[] {
  const campaigns = actor.bindings
    .filter((binding) => binding.scopeType === 'CAMPANHA' && binding.scopeRef)
    .map((binding) => String(binding.scopeRef));

  return Array.from(new Set(campaigns));
}

export function canAccessState(actor: AuthActor, state: string | null | undefined): boolean {
  if (!state) return false;
  if (hasNationalAccess(actor)) return true;

  const uf = String(state).trim().toUpperCase();
  if (!uf) return false;

  return getAllowedStates(actor).includes(uf);
}

export function canAccessCampaign(
  actor: AuthActor,
  campaign: { id: string; configuration?: unknown; created_by?: string | null },
): boolean {
  if (hasNationalAccess(actor)) return true;

  if (campaign.created_by && campaign.created_by === actor.id) {
    return true;
  }

  if (getAllowedCampaigns(actor).includes(campaign.id)) {
    return true;
  }

  const campaignState = parseCampaignState(campaign.configuration ?? null);
  if (campaignState && canAccessState(actor, campaignState)) {
    return true;
  }

  return false;
}

export function canAccessVolunteer(
  actor: AuthActor,
  volunteer: { id: string; state?: string | null; city?: string | null },
): boolean {
  if (hasNationalAccess(actor)) return true;
  if (volunteer.id === actor.id) return true;

  if (volunteer.state && canAccessState(actor, volunteer.state)) {
    return true;
  }

  const allowedCities = getAllowedCities(actor);
  if (volunteer.city && allowedCities.includes(volunteer.city)) {
    return true;
  }

  return false;
}

export function buildActor(params: {
  id: string;
  name: string;
  email: string;
  state: string | null;
  city: string | null;
  legacyRole: string | null;
  bindings: Array<{ role: string; scope_type: string; scope_ref: string | null; office_context: string | null }>;
}): AuthActor {
  const normalizedBindings = params.bindings.map((binding) => ({
    role: normalizeRole(binding.role),
    scopeType: normalizeScopeType(binding.scope_type),
    scopeRef: binding.scope_ref,
    officeContext: binding.office_context ?? null,
  }));

  if (normalizedBindings.length === 0) {
    normalizedBindings.push({
      role: normalizeRole(params.legacyRole),
      scopeType: 'PROPRIO_USUARIO',
      scopeRef: params.id,
      officeContext: null,
    });
  }

  return {
    id: params.id,
    name: params.name,
    email: params.email,
    state: params.state,
    city: params.city,
    legacyRole: params.legacyRole,
    bindings: normalizedBindings,
  };
}
