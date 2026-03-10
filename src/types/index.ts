export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'COORDENADOR_ESTADUAL'
  | 'COORDENADOR_MUNICIPAL'
  | 'LIDER_EMERGENTE'
  | 'VOLUNTARIO';

export type MissionStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';
export type MissionType = 'DIGITAL' | 'TERRITORIAL' | 'RECRUITMENT' | 'TRAINING';
export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type TaskStatus = 'PENDENTE' | 'EM_PROGRESSO' | 'REVISAO' | 'CONCLUIDA';
export type NotificationType =
  | 'TAREFA_ATRIBUIDA'
  | 'TAREFA_ENTREGUE'
  | 'AVALIACAO_DISPONIVEL'
  | 'CONVITE_SETOR'
  | 'PROMOCAO_FUNCAO'
  | 'META_ATINGIDA'
  | 'ONBOARDING_CONCLUIDO';

export interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone_whatsapp: string | null;
  city: string | null;
  state: string | null;
  role: UserRole;
  xp_total: number;
  current_level: number;
  leadership_score: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  urgency: 'URGENT' | 'PRIORITY' | 'ONGOING' | 'CONTINUA' | 'PRIORITARIA';
  xp_reward: number;
  status: MissionStatus;
  deadline: string | null;
  target_state: string | null;
  target_city: string | null;
  created_at: string;
}

export interface Submission {
  id: string;
  mission_id: string;
  volunteer_id: string;
  validation_status: SubmissionStatus;
  evidence_content: string | null;
  evidence_url: string | null;
  submitted_at: string;
  mission_title?: string;
  volunteer_name?: string;
}

export interface CampaignSubsector {
  id: string;
  sector_id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface CampaignSector {
  id: string;
  campaign_id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  is_mandatory: number;
  subsetores: CampaignSubsector[];
}

export interface Campaign {
  id: string;
  name: string;
  candidate_name: string;
  office: string;
  template_id: string | null;
  configuration: Record<string, unknown>;
  visibility: string;
  created_by: string | null;
  created_at: string;
  sectors: CampaignSector[];
}

export interface CampaignTask {
  id: string;
  campaign_id: string;
  sector_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: 'BAIXA' | 'MEDIA' | 'ALTA';
  deadline: string | null;
  estimated_hours: number | null;
  registered_hours: number;
  assigned_to: string | null;
}

export interface RoleOnboarding {
  id: string;
  member_id: string;
  role_profile_id: string;
  status: string;
  current_step: number;
  completed_steps: string[];
}

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_link: string | null;
  is_read: number;
  created_at: string;
}
