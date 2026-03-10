import type BetterSqlite3 from 'better-sqlite3';
import {
  calcularScoresTerritorial,
  type CidadeDados,
  type ScoresCidade,
} from '../lib/inteligencia-eleitoral.js';

type Db = BetterSqlite3.Database;

interface CidadeInfo {
  cidade: string;
  estado: string;
  latitude: number;
  longitude: number;
}

interface DadosEleitoraisRow {
  cidade: string;
  estado: string;
  latitude: number | null;
  longitude: number | null;
  votos_2022: number | null;
}

interface DadosDemograficosRow {
  cidade: string;
  estado: string;
  populacao_total: number | null;
  pct_jovens_16_34: number | null;
  pct_acesso_internet: number | null;
  pct_urbano: number | null;
  pct_ensino_superior: number | null;
}

const normalizeNumber = (value: number | null | undefined): number => (typeof value === 'number' ? value : 0);

const isoOffsetDays = (offsetDays: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString();
};

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

const parseJsonArray = (value: string | null | undefined): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
};

function ensureCredentialUsers(db: Db): void {
  const users = [
    ['cred-admin', 'Admin Missao', 'admin@missao.com.br', 'ADMIN', 'Sao Paulo', 'SP', 22000, 7],
    ['cred-chefe', 'Chefe de Campanha', 'chefe@missao.com.br', 'COORDENADOR_ESTADUAL', 'Sao Paulo', 'SP', 14000, 6],
    ['cred-coord-sp', 'Coordenador SP', 'coord.sp@missao.com.br', 'COORDENADOR_ESTADUAL', 'Campinas', 'SP', 7600, 5],
    ['cred-coord-rj', 'Coordenador RJ', 'coord.rj@missao.com.br', 'COORDENADOR_ESTADUAL', 'Rio de Janeiro', 'RJ', 6800, 5],
    ['cred-coord-mun', 'Coordenador Municipal', 'coord.mun@missao.com.br', 'COORDENADOR_MUNICIPAL', 'Santo Andre', 'SP', 5100, 4],
    ['cred-voluntario', 'Voluntario Teste', 'voluntario@missao.com.br', 'VOLUNTARIO', 'Sao Paulo', 'SP', 1450, 3],
  ] as const;

  const hasEmail = db.prepare('SELECT id FROM volunteers WHERE email = ?');
  const insert = db.prepare(`
    INSERT INTO volunteers (
      id, name, email, phone_whatsapp, city, state, role,
      xp_total, current_level, missions_completed, current_streak,
      volunteers_recruited, leadership_score, status, created_at, last_active_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [id, name, email, role, city, state, xp, level] of users) {
    if (hasEmail.get(email)) continue;
    insert.run(
      id,
      name,
      email,
      '11999990000',
      city,
      state,
      role,
      xp,
      level,
      Math.round(xp / 90),
      8,
      3,
      role.includes('COORDENADOR') ? 85 : 68,
      'ACTIVE',
      isoOffsetDays(-120),
      isoOffsetDays(-1),
    );
  }
}
function ensureVolunteers(db: Db): void {
  const cities = db
    .prepare('SELECT cidade, estado, latitude, longitude FROM dados_eleitorais ORDER BY votos_2022 DESC')
    .all() as Array<{ cidade: string; estado: string; latitude: number | null; longitude: number | null }>;

  const fallbackCities: CidadeInfo[] = [
    { cidade: 'Sao Paulo', estado: 'SP', latitude: -23.5505, longitude: -46.6333 },
    { cidade: 'Campinas', estado: 'SP', latitude: -22.9056, longitude: -47.0608 },
    { cidade: 'Santos', estado: 'SP', latitude: -23.9608, longitude: -46.3336 },
    { cidade: 'Rio de Janeiro', estado: 'RJ', latitude: -22.9068, longitude: -43.1729 },
    { cidade: 'Belo Horizonte', estado: 'MG', latitude: -19.9167, longitude: -43.9345 },
  ];

  const cityPool: CidadeInfo[] =
    cities.length > 0
      ? cities.map((city) => ({
          cidade: city.cidade,
          estado: city.estado,
          latitude: normalizeNumber(city.latitude),
          longitude: normalizeNumber(city.longitude),
        }))
      : fallbackCities;

  const names = [
    'Ana Beatriz', 'Carlos Eduardo', 'Mariana Costa', 'Joao Victor', 'Fernanda Lima',
    'Pedro Henrique', 'Aline Souza', 'Rodrigo Araujo', 'Camila Martins', 'Lucas Silva',
    'Patricia Gomes', 'Rafael Nunes', 'Larissa Almeida', 'Thiago Ribeiro', 'Natalia Rocha',
    'Bruno Carvalho', 'Juliana Mendes', 'Gustavo Freitas', 'Amanda Oliveira', 'Felipe Barros',
    'Isabela Teixeira', 'Diego Cavalcanti', 'Renata Farias', 'Leandro Campos', 'Tatiane Moraes',
    'Marcelo Pinto', 'Denise Vieira', 'Eduardo Paiva', 'Priscila Correia', 'Vinicius Lopes',
    'Gabriela Ramos', 'Henrique Castro', 'Monique Azevedo', 'Fabio Santos', 'Sabrina Melo',
    'Andressa Dias', 'Caio Ferreira', 'Yasmin Fontes', 'Igor Coelho', 'Debora Pires',
    'Wesley Cardoso', 'Brenda Macedo', 'Danilo Xavier', 'Helena Moreira', 'Vitor Prado',
    'Lorena Duarte', 'Matheus Aguiar', 'Paula Brito', 'Cesar Medeiros', 'Bianca Moura',
  ];

  const insert = db.prepare(`
    INSERT OR IGNORE INTO volunteers (
      id, name, email, phone_whatsapp, city, state, neighborhood, lat, lng,
      role, xp_total, current_level, missions_completed, current_streak,
      longest_streak, volunteers_recruited, leadership_score, status,
      skills, availability, political_experience, created_at, last_active_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < 60; i += 1) {
    const city = cityPool[i % cityPool.length];
    const name = names[i % names.length];
    const role = i % 21 === 0 ? 'LIDER_EMERGENTE' : i % 31 === 0 ? 'COORDENADOR_MUNICIPAL' : 'VOLUNTARIO';
    const level = (i % 6) + 1;
    const xp = 420 + (i * 92) + (level * 130);
    const active = i % 9 !== 0;

    insert.run(
      `demo-vol-${String(i + 1).padStart(3, '0')}`,
      name,
      `demo.${String(i + 1).padStart(3, '0')}@missao.com.br`,
      `11${String(900000000 + i).padStart(9, '0')}`,
      city.cidade,
      city.estado,
      `Bairro ${((i % 8) + 1)}`,
      city.latitude + ((i % 5) * 0.01),
      city.longitude - ((i % 5) * 0.01),
      role,
      xp,
      level,
      Math.floor(xp / 130),
      Math.max(1, 14 - (i % 12)),
      Math.max(3, 20 - (i % 15)),
      i % 10,
      role.includes('COORDENADOR') ? 84 : i % 7 === 0 ? 74 : 50 + (i % 18),
      active ? 'ACTIVE' : 'INACTIVE',
      JSON.stringify(['Conteudo Digital', i % 2 === 0 ? 'Tecnologia' : 'Organizacao Local']),
      i % 3 === 0 ? '6h' : '10h',
      i % 4 === 0 ? 'Experiencia em acao de base' : 'Atuacao comunitaria',
      isoOffsetDays(-(i + 5)),
      active ? isoOffsetDays(-(i % 6)) : isoOffsetDays(-(35 + (i % 20))),
    );
  }
}

function ensureMissions(db: Db): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO missions (
      id, title, description, type, urgency, xp_reward, deadline,
      target_state, target_city, evidence_type, validation_type, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
  `);

  const missionTypes = ['DIGITAL', 'TERRITORIAL', 'RECRUTAMENTO', 'FORMACAO'] as const;
  const urgencies = ['URGENTE', 'PRIORITARIA', 'CONTINUA'] as const;
  const evidenceTypes = ['LINK', 'FOTO', 'TEXTO', 'NENHUM'] as const;
  const validations = ['AUTOMATICO', 'MANUAL'] as const;

  for (let i = 0; i < 24; i += 1) {
    const type = missionTypes[i % missionTypes.length];
    const urgency = urgencies[i % urgencies.length];
    const evidence = evidenceTypes[i % evidenceTypes.length];
    const validation = validations[i % validations.length];
    const deadline = urgency === 'CONTINUA' ? null : isoOffsetDays(2 + (i % 18));

    insert.run(
      `demo-mis-${String(i + 1).padStart(3, '0')}`,
      `Missao estrategica ${i + 1}`,
      `Entrega operacional ${i + 1} para apoiar mobilizacao territorial e digital da campanha.`,
      type,
      urgency,
      35 + (i % 7) * 15,
      deadline,
      i % 3 === 0 ? 'SP' : null,
      i % 6 === 0 ? 'Campinas' : null,
      evidence,
      validation,
      isoOffsetDays(-(i + 2)),
    );
  }
}
function ensureCampaignStructure(db: Db): void {
  const campaignId = 'camp-ludymilla-2026';

  db.prepare(`
    INSERT OR IGNORE INTO campaigns (
      id, name, candidate_name, office, template_id, configuration, visibility, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    campaignId,
    'Ludymilla 2026',
    'Ludymilla',
    'DEPUTADO_FEDERAL',
    'tmpl-dep-fed',
    JSON.stringify({ estado_foco: 'SP', ciclo: 'PRE_CAMPANHA' }),
    'PRIVADA',
    'cred-chefe',
    isoOffsetDays(-60),
  );

  const sectors = [
    { id: 'camp-sec-tecnologia', name: 'Tecnologia', slug: 'tecnologia', icon: 'DEV', color: '#1565C0', mandatory: 0, subs: ['Backend', 'Frontend', 'Dados'] },
    { id: 'camp-sec-redes', name: 'Redes Sociais', slug: 'redes-sociais', icon: 'SOC', color: '#7B1FA2', mandatory: 1, subs: ['Design', 'Video', 'Copy'] },
    { id: 'camp-sec-rh', name: 'RH', slug: 'rh', icon: 'RH', color: '#2E7D32', mandatory: 1, subs: ['Onboarding', 'Performance'] },
    { id: 'camp-sec-fin', name: 'Financeiro', slug: 'financeiro', icon: 'FIN', color: '#F5C400', mandatory: 1, subs: ['Doacoes', 'Compliance'] },
    { id: 'camp-sec-politico', name: 'Politico', slug: 'politico-legislativo', icon: 'POL', color: '#E53935', mandatory: 1, subs: ['Projetos', 'Analise'] },
    { id: 'camp-sec-campo', name: 'Campo', slug: 'campo', icon: 'CMP', color: '#FF6F00', mandatory: 1, subs: ['Mobilizacao', 'Eventos', 'Pesquisa'] },
  ] as const;

  const insertSector = db.prepare(`
    INSERT OR IGNORE INTO campaign_sectors (id, campaign_id, name, slug, icon, color, is_mandatory, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSubsector = db.prepare(`
    INSERT OR IGNORE INTO campaign_subsectors (id, sector_id, name, slug, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const sector of sectors) {
    insertSector.run(sector.id, campaignId, sector.name, sector.slug, sector.icon, sector.color, sector.mandatory, isoOffsetDays(-58));
    for (const sub of sector.subs) {
      insertSubsector.run(`camp-sub-${sector.slug}-${slugify(sub)}`, sector.id, sub, slugify(sub), isoOffsetDays(-57));
    }
  }

  const profileBySector: Record<string, string | null> = {
    tecnologia: 'prof-dev-backend',
    'redes-sociais': 'prof-designer',
    rh: 'prof-rh',
    financeiro: 'prof-tesoureiro',
    'politico-legislativo': null,
    campo: null,
  };

  const profileRows = db.prepare('SELECT id, technical_competencies FROM role_profiles').all() as Array<{ id: string; technical_competencies: string }>;
  const profileCompetencies = new Map<string, string[]>();
  for (const row of profileRows) {
    profileCompetencies.set(row.id, parseJsonArray(row.technical_competencies));
  }

  const volunteers = db.prepare(`
    SELECT id FROM volunteers
    WHERE state = 'SP'
    ORDER BY xp_total DESC
    LIMIT 32
  `).all() as Array<{ id: string }>;

  const insertMember = db.prepare(`
    INSERT OR IGNORE INTO sector_members (
      id, campaign_id, sector_id, subsector_id, volunteer_id, role_profile_id, role,
      raci_decisions, competencies_eval, tasks_completed, tasks_on_time, hours_registered,
      performance_score, joined_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < volunteers.length; i += 1) {
    const sector = sectors[i % sectors.length];
    const sub = sector.subs[i % sector.subs.length];
    const profileId = profileBySector[sector.slug];
    const competencies = profileId ? profileCompetencies.get(profileId) ?? [] : [];
    const evalMap: Record<string, number> = {};
    for (const competency of competencies) evalMap[competency] = 2 + (i % 4);

    insertMember.run(
      `camp-member-${String(i + 1).padStart(3, '0')}`,
      campaignId,
      sector.id,
      `camp-sub-${sector.slug}-${slugify(sub)}`,
      volunteers[i].id,
      profileId,
      i % 8 === 0 ? 'LIDER_SETOR' : 'MEMBRO',
      JSON.stringify({ responsavel: i % 5 === 0 }),
      JSON.stringify(evalMap),
      4 + (i % 12),
      62 + (i % 35),
      Number((6 + (i % 10) * 1.7).toFixed(1)),
      58 + (i % 35),
      isoOffsetDays(-(45 - i)),
    );
  }
  const demoVoluntario = db.prepare("SELECT id FROM volunteers WHERE email = 'voluntario@missao.com.br' LIMIT 1").get() as { id: string } | undefined;
  if (demoVoluntario) {
    insertMember.run(
      'camp-member-demo-voluntario',
      campaignId,
      'camp-sec-campo',
      'camp-sub-campo-mobilizacao',
      demoVoluntario.id,
      null,
      'MEMBRO',
      JSON.stringify({ responsavel: false }),
      JSON.stringify({ Mobilizacao: 3, Eventos: 2 }),
      6,
      78,
      9.5,
      74,
      isoOffsetDays(-18),
    );
  }
  const members = db.prepare('SELECT id, volunteer_id, role_profile_id FROM sector_members WHERE campaign_id = ? ORDER BY joined_at ASC').all(campaignId) as Array<{ id: string; volunteer_id: string; role_profile_id: string | null }>;

  const insertOnboarding = db.prepare(`
    INSERT OR IGNORE INTO role_onboardings (
      id, member_id, role_profile_id, status, current_step, completed_steps, mentor_id, started_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < members.length; i += 1) {
    if (!members[i].role_profile_id) continue;
    const done = i % 4 === 0;
    insertOnboarding.run(
      `onboarding-${members[i].id}`,
      members[i].id,
      members[i].role_profile_id,
      done ? 'CONCLUIDO' : 'EM_ANDAMENTO',
      done ? 4 : 2,
      JSON.stringify(done ? ['boas-vindas', 'ferramentas', 'objetivos', 'primeira-entrega'] : ['boas-vindas', 'ferramentas']),
      'cred-coord-sp',
      isoOffsetDays(-40 + i),
      done ? isoOffsetDays(-15 + i) : null,
    );
  }

  const insertTask = db.prepare(`
    INSERT OR IGNORE INTO campaign_tasks (
      id, campaign_id, sector_id, subsector_id, title, description, status, priority,
      xp_reward, deadline, estimated_hours, registered_hours, assigned_to, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < 36; i += 1) {
    const sector = sectors[i % sectors.length];
    const sub = sector.subs[i % sector.subs.length];
    const member = members[i % members.length];
    const status = i % 7 === 0 ? 'CONCLUIDA' : i % 5 === 0 ? 'REVISAO' : i % 3 === 0 ? 'EM_ANDAMENTO' : 'PENDENTE';
    const priority = i % 6 === 0 ? 'ALTA' : i % 4 === 0 ? 'MEDIA' : 'BAIXA';

    insertTask.run(
      `camp-task-${String(i + 1).padStart(3, '0')}`,
      campaignId,
      sector.id,
      `camp-sub-${sector.slug}-${slugify(sub)}`,
      `Entrega ${i + 1} - ${sector.name}`,
      `Atividade operacional do setor ${sector.name} focada em ${sub.toLowerCase()}.`,
      status,
      priority,
      30 + (i % 6) * 15,
      isoOffsetDays(2 + (i % 20)),
      Number((2 + (i % 5) * 1.5).toFixed(1)),
      Number((i % 7 === 0 ? 2.5 : 0).toFixed(1)),
      member?.volunteer_id ?? null,
      'cred-coord-sp',
      isoOffsetDays(-(20 - (i % 10))),
    );
  }


  db.prepare(`
    UPDATE campaign_tasks
    SET assigned_to = ?, status = 'PENDENTE', registered_hours = 0
    WHERE campaign_id = ? AND id IN ('camp-task-002', 'camp-task-008', 'camp-task-014')
  `).run('cred-voluntario', campaignId);

  const insertEval = db.prepare(`
    INSERT OR IGNORE INTO member_evaluations (
      id, member_id, evaluator_id, period,
      score_quality, score_deadline, score_collaboration, score_proactivity, score_alignment,
      score_general, strengths, development_points, agreed_actions, recommendation, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < Math.min(12, members.length); i += 1) {
    const q = 3 + (i % 3);
    const d = 2 + (i % 4);
    const c = 3 + (i % 2);
    const p = 2 + (i % 4);
    const a = 3 + (i % 3);
    const g = Math.round((q + d + c + p + a) / 5);

    insertEval.run(
      `eval-${members[i].id}-2026q1`,
      members[i].id,
      'cred-coord-sp',
      '2026-Q1',
      q,
      d,
      c,
      p,
      a,
      g,
      JSON.stringify(['Consistencia de entrega', 'Boa comunicacao com equipe']),
      JSON.stringify(['Aprimorar registro de horas']),
      JSON.stringify(['Mentoria quinzenal']),
      g >= 4 ? 'MANTER' : 'DESENVOLVER',
      isoOffsetDays(-10 + i),
    );
  }
}
function ensureMissionSubmissions(db: Db): void {
  const volunteers = db.prepare('SELECT id FROM volunteers ORDER BY xp_total DESC LIMIT 40').all() as Array<{ id: string }>;
  const missions = db.prepare("SELECT id, xp_reward FROM missions WHERE status = 'ACTIVE' ORDER BY created_at DESC LIMIT 25").all() as Array<{ id: string; xp_reward: number }>;
  if (volunteers.length === 0 || missions.length === 0) return;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO mission_submissions (
      id, mission_id, volunteer_id, evidence_content, evidence_url,
      submitted_at, validated_at, validation_status, validator_id, validator_note, xp_awarded
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < 90; i += 1) {
    const volunteer = volunteers[i % volunteers.length];
    const mission = missions[i % missions.length];
    const status = i % 5 === 0 ? 'PENDING' : i % 7 === 0 ? 'REJECTED' : 'APPROVED';

    insert.run(
      `submission-${String(i + 1).padStart(3, '0')}`,
      mission.id,
      volunteer.id,
      status === 'APPROVED' ? 'Entrega validada com checklist completo.' : 'Entrega em analise.',
      status === 'APPROVED' ? `https://demo.missao.local/evidencia/${i + 1}` : null,
      isoOffsetDays(-(i % 40)),
      status === 'PENDING' ? null : isoOffsetDays(-(i % 35)),
      status,
      status === 'PENDING' ? null : 'cred-coord-sp',
      status === 'REJECTED' ? 'Necessario complementar evidencias.' : 'Validacao concluida.',
      status === 'APPROVED' ? mission.xp_reward : 0,
    );
  }
}

function ensureVolunteerBadges(db: Db): void {
  const volunteers = db.prepare('SELECT id FROM volunteers ORDER BY xp_total DESC LIMIT 40').all() as Array<{ id: string }>;
  const badges = db.prepare('SELECT id FROM badges ORDER BY id ASC').all() as Array<{ id: string }>;
  if (volunteers.length === 0 || badges.length === 0) return;

  const insert = db.prepare('INSERT OR IGNORE INTO volunteer_badges (volunteer_id, badge_id, earned_at) VALUES (?, ?, ?)');

  for (let i = 0; i < volunteers.length; i += 1) {
    const badgeA = badges[i % badges.length];
    const badgeB = badges[(i + 3) % badges.length];
    insert.run(volunteers[i].id, badgeA.id, isoOffsetDays(-(i % 60)));
    if (i % 2 === 0) {
      insert.run(volunteers[i].id, badgeB.id, isoOffsetDays(-(i % 45)));
    }
  }
}

function ensureNotifications(db: Db): void {
  const volunteers = db.prepare('SELECT id FROM volunteers ORDER BY xp_total DESC LIMIT 30').all() as Array<{ id: string }>;
  if (volunteers.length === 0) return;

  const notifications = [
    { type: 'TAREFA_ATRIBUIDA', title: 'Nova tarefa atribuida', message: 'Voce recebeu uma nova tarefa no setor.', link: '/coordinator/campaigns' },
    { type: 'TAREFA_PRAZO', title: 'Prazo se aproximando', message: 'Uma tarefa vence nas proximas 48 horas.', link: '/coordinator/missions' },
    { type: 'AVALIACAO_DISPONIVEL', title: 'Nova avaliacao registrada', message: 'Seu ciclo de avaliacao trimestral foi atualizado.', link: '/voluntario/funcao' },
    { type: 'CONVITE_SETOR', title: 'Convite para setor', message: 'Voce foi convidado para participar de um novo setor.', link: '/coordinator/campaigns' },
    { type: 'PROMOCAO_FUNCAO', title: 'Promocao sugerida', message: 'Seu desempenho indica potencial para lideranca local.', link: '/coordinator/volunteers' },
    { type: 'META_ATINGIDA', title: 'Meta alcancada', message: 'Seu nucleo bateu a meta semanal de mobilizacao.', link: '/coordinator' },
  ] as const;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO system_notifications (
      id, recipient_id, type, title, message, action_link, is_read, extra_data, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < volunteers.length; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      const notification = notifications[(i + j) % notifications.length];
      insert.run(
        `notif-${volunteers[i].id}-${j + 1}`,
        volunteers[i].id,
        notification.type,
        notification.title,
        notification.message,
        notification.link,
        j === 0 ? 0 : 1,
        JSON.stringify({ prioridade: j === 0 ? 'ALTA' : 'MEDIA' }),
        isoOffsetDays(-(i % 20)),
      );
    }
  }
}
function ensureTrainingData(db: Db): void {
  const trackDefs = [
    { id: 'track-fundamentos', slug: 'fundamentos-missao', title: 'Fundamentos do Movimento', category: 'POLITICA', level: 'INICIANTE', color: '#F5C400', mandatory: 1, objective: 'Explicar o movimento com clareza.', pre: null },
    { id: 'track-comunicacao', slug: 'comunicacao-politica', title: 'Comunicacao Politica Eficaz', category: 'COMUNICACAO', level: 'INICIANTE', color: '#1E88E5', mandatory: 0, objective: 'Melhorar discurso e escuta ativa.', pre: 'fundamentos-missao' },
    { id: 'track-campo', slug: 'organizacao-de-campo', title: 'Organizacao de Campo', category: 'CAMPO', level: 'INTERMEDIARIO', color: '#43A047', mandatory: 0, objective: 'Executar acoes territoriais com previsibilidade.', pre: 'fundamentos-missao' },
    { id: 'track-digital', slug: 'presenca-digital', title: 'Militancia Digital', category: 'DIGITAL', level: 'INTERMEDIARIO', color: '#039BE5', mandatory: 0, objective: 'Aumentar alcance e conversao digital.', pre: 'comunicacao-politica' },
    { id: 'track-lideranca', slug: 'lideranca-de-nucleo', title: 'Lideranca de Nucleo', category: 'LIDERANCA', level: 'AVANCADO', color: '#8E24AA', mandatory: 0, objective: 'Formar liderancas locais consistentes.', pre: 'organizacao-de-campo' },
  ] as const;

  const insertTrack = db.prepare(`
    INSERT OR IGNORE INTO training_tracks (
      id, slug, title, description, objective, level, category,
      total_xp, duration_min, display_order, is_mandatory, is_active,
      accent_color, prerequisite_slug, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `);

  const insertModule = db.prepare(`
    INSERT OR IGNORE INTO training_modules (
      id, track_id, title, description, type, display_order,
      duration_min, xp_reward, content, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  for (let i = 0; i < trackDefs.length; i += 1) {
    const track = trackDefs[i];
    const baseXp = 240 + (i * 20);

    insertTrack.run(
      track.id,
      track.slug,
      track.title,
      `${track.title} com foco em aplicacao pratica na campanha.`,
      track.objective,
      track.level,
      track.category,
      baseXp,
      55 + (i * 5),
      i + 1,
      track.mandatory,
      track.color,
      track.pre,
      isoOffsetDays(-25),
    );

    const readContent = {
      secoes: [
        { subtitulo: 'Contexto', texto: `Principios de ${track.title.toLowerCase()} aplicados ao territorio.` },
        { subtitulo: 'Aplicacao', texto: 'Passo a passo para converter planejamento em execucao real.' },
      ],
      pontoChave: 'Disciplina operacional e consistencia de entrega.',
    };

    const quizContent = {
      notaMinimaAprovacao: 70,
      tentativasMaximas: 3,
      questoes: [
        {
          pergunta: `Qual objetivo principal da trilha ${track.title}?`,
          alternativas: ['Gerar ruido', 'Aprimorar execucao de campanha', 'Substituir coordenacao', 'Ignorar dados'],
          correta: 1,
          explicacao: 'A trilha existe para melhorar qualidade de execucao e coordenação.',
        },
      ],
    };

    const practiceContent = {
      desafio: `Defina uma acao concreta relacionada a ${track.title.toLowerCase()} para os proximos 7 dias.`,
      criterios: ['Meta clara', 'Prazo definido', 'Responsavel nomeado'],
      dica: 'Comece com escopo pequeno e execute com qualidade.',
    };

    insertModule.run(`mod-${track.slug}-1`, track.id, 'Aula Base', 'Conceitos introdutorios.', 'LEITURA', 1, 14, 60, JSON.stringify(readContent), isoOffsetDays(-24));
    insertModule.run(`mod-${track.slug}-2`, track.id, 'Quiz de Validacao', 'Teste rapido de conhecimento.', 'QUIZ', 2, 10, 70, JSON.stringify(quizContent), isoOffsetDays(-24));
    insertModule.run(`mod-${track.slug}-3`, track.id, 'Missao Pratica', 'Aplicacao real em contexto de campanha.', 'PRATICA', 3, 20, 110, JSON.stringify(practiceContent), isoOffsetDays(-24));
  }
}

function ensureTrainingProgress(db: Db): void {
  const volunteers = db.prepare('SELECT id FROM volunteers ORDER BY xp_total DESC LIMIT 18').all() as Array<{ id: string }>;
  const tracks = db.prepare('SELECT id FROM training_tracks ORDER BY display_order ASC').all() as Array<{ id: string }>;
  if (volunteers.length === 0 || tracks.length === 0) return;

  const insertTrackProgress = db.prepare(`
    INSERT OR IGNORE INTO track_progress (
      id, volunteer_id, track_id, percentage, is_completed, started_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertModuleProgress = db.prepare(`
    INSERT OR IGNORE INTO module_progress (
      id, volunteer_id, module_id, is_completed, quiz_score, time_spent_min, attempts, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertCertificate = db.prepare(`
    INSERT OR IGNORE INTO certificates (
      id, volunteer_id, track_id, verification_code, issued_at
    ) VALUES (?, ?, ?, ?, ?)
  `);

  for (let v = 0; v < volunteers.length; v += 1) {
    for (let t = 0; t < tracks.length; t += 1) {
      const modules = db.prepare('SELECT id FROM training_modules WHERE track_id = ? ORDER BY display_order ASC').all(tracks[t].id) as Array<{ id: string }>;
      if (modules.length === 0) continue;

      const completeCount = Math.min(modules.length, (v + t) % (modules.length + 1));
      const percentage = Number(((completeCount / modules.length) * 100).toFixed(2));
      const completed = completeCount === modules.length;

      insertTrackProgress.run(
        `track-progress-${volunteers[v].id}-${tracks[t].id}`,
        volunteers[v].id,
        tracks[t].id,
        percentage,
        completed ? 1 : 0,
        isoOffsetDays(-(20 + v)),
        completed ? isoOffsetDays(-(6 + t)) : null,
      );

      for (let m = 0; m < completeCount; m += 1) {
        insertModuleProgress.run(
          `module-progress-${volunteers[v].id}-${modules[m].id}`,
          volunteers[v].id,
          modules[m].id,
          1,
          72 + ((m + v) % 28),
          8 + ((m + t) % 18),
          1 + ((m + v) % 2),
          isoOffsetDays(-(5 + m)),
        );
      }

      if (completed) {
        insertCertificate.run(
          `cert-${volunteers[v].id}-${tracks[t].id}`,
          volunteers[v].id,
          tracks[t].id,
          `CERT-${slugify(volunteers[v].id).slice(0, 6).toUpperCase()}-${slugify(tracks[t].id).slice(0, 6).toUpperCase()}`,
          isoOffsetDays(-(4 + t)),
        );
      }
    }
  }
  const demoVolunteer = db.prepare("SELECT id FROM volunteers WHERE email = 'voluntario@missao.com.br' LIMIT 1").get() as { id: string } | undefined;
  if (demoVolunteer) {
    for (let t = 0; t < tracks.length; t += 1) {
      const modules = db.prepare('SELECT id FROM training_modules WHERE track_id = ? ORDER BY display_order ASC').all(tracks[t].id) as Array<{ id: string }>;
      if (modules.length === 0) continue;

      const completeCount = t === 0 ? modules.length : 1;
      const percentage = Number(((completeCount / modules.length) * 100).toFixed(2));
      const completed = completeCount === modules.length;

      insertTrackProgress.run(
        `track-progress-${demoVolunteer.id}-${tracks[t].id}`,
        demoVolunteer.id,
        tracks[t].id,
        percentage,
        completed ? 1 : 0,
        isoOffsetDays(-12),
        completed ? isoOffsetDays(-3) : null,
      );

      for (let m = 0; m < completeCount; m += 1) {
        insertModuleProgress.run(
          `module-progress-${demoVolunteer.id}-${modules[m].id}`,
          demoVolunteer.id,
          modules[m].id,
          1,
          86,
          14,
          1,
          isoOffsetDays(-(2 + m)),
        );
      }

      if (completed) {
        insertCertificate.run(
          `cert-${demoVolunteer.id}-${tracks[t].id}`,
          demoVolunteer.id,
          tracks[t].id,
          `CERT-${slugify(demoVolunteer.id).slice(0, 6).toUpperCase()}-${slugify(tracks[t].id).slice(0, 6).toUpperCase()}`,
          isoOffsetDays(-2),
        );
      }
    }
}
}
function ensureQuestionarios(db: Db): void {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM questionarios_eleitor').get() as { count: number };
  if (countRow.count >= 140) return;

  const cities = db.prepare('SELECT cidade, estado FROM dados_eleitorais ORDER BY votos_2022 DESC').all() as Array<{ cidade: string; estado: string }>;
  const collectors = db.prepare('SELECT id FROM volunteers ORDER BY created_at ASC LIMIT 50').all() as Array<{ id: string }>;
  if (cities.length === 0) return;

  const redes = [['Instagram', 'WhatsApp'], ['Instagram', 'TikTok', 'YouTube'], ['WhatsApp', 'Facebook'], ['X', 'Instagram']];
  const plataformas = [['Mobile'], ['Mobile', 'PC'], ['PS5', 'Mobile'], ['PC', 'Xbox']];
  const preocupacoes = ['emprego', 'educacao', 'seguranca'];
  const escolaridades = ['Ensino medio', 'Superior incompleto', 'Superior completo', 'Pos-graduacao'];
  const comunidades = ['igreja', 'gamer', 'universitario', 'bairro'];

  const insert = db.prepare(`
    INSERT INTO questionarios_eleitor (
      cidade, estado, idade, sexo, escolaridade, acesso_internet,
      usa_redes_sociais, joga_videogame, plataformas_jogo, conhece_candidata,
      simpatia_candidata, pretende_votar, e_lider_comunidade, tipo_comunidade,
      preocupacao_principal, coletor_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = countRow.count; i < 160; i += 1) {
    const city = cities[i % cities.length];
    const knows = i % 4 !== 0;
    const plays = i % 3 !== 0;

    insert.run(
      city.cidade,
      city.estado,
      17 + (i % 38),
      ['M', 'F', 'NB', 'NI'][i % 4],
      escolaridades[i % escolaridades.length],
      i % 7 === 0 ? 0 : 1,
      JSON.stringify(redes[i % redes.length]),
      plays ? 1 : 0,
      JSON.stringify(plays ? plataformas[i % plataformas.length] : []),
      knows ? 1 : 0,
      knows ? 2 + (i % 4) : 0,
      ['SIM', 'TALVEZ', 'NR', 'NAO'][i % 4],
      i % 8 === 0 ? 1 : 0,
      comunidades[i % comunidades.length],
      preocupacoes[i % preocupacoes.length],
      collectors.length > 0 ? collectors[i % collectors.length].id : null,
      isoOffsetDays(-(i % 90)),
    );
  }
}

function recalculateScores(db: Db): void {
  const dadosEleitorais = db.prepare('SELECT * FROM dados_eleitorais').all() as DadosEleitoraisRow[];
  if (dadosEleitorais.length === 0) return;

  const dadosDemograficos = db.prepare('SELECT * FROM dados_demograficos').all() as DadosDemograficosRow[];
  const volunteersByCity = db.prepare(`
    SELECT city as cidade, state as estado,
           SUM(CASE WHEN UPPER(COALESCE(status, '')) IN ('ACTIVE', 'ATIVO') THEN 1 ELSE 0 END) as count
    FROM volunteers
    GROUP BY city, state
  `).all() as Array<{ cidade: string; estado: string; count: number | null }>;

  const growthRows = db.prepare(`
    SELECT city as cidade, state as estado,
           SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) as novos_mes,
           SUM(CASE WHEN created_at >= datetime('now', '-60 days') AND created_at < datetime('now', '-30 days') THEN 1 ELSE 0 END) as novos_mes_anterior
    FROM volunteers
    GROUP BY city, state
  `).all() as Array<{ cidade: string; estado: string; novos_mes: number | null; novos_mes_anterior: number | null }>;

  const demoMap = new Map<string, DadosDemograficosRow>();
  for (const row of dadosDemograficos) demoMap.set(`${row.cidade}_${row.estado}`, row);

  const volunteerMap = new Map<string, number>();
  for (const row of volunteersByCity) volunteerMap.set(`${row.cidade}_${row.estado}`, normalizeNumber(row.count));

  const growthMap: Record<string, number> = {};
  for (const row of growthRows) {
    const previous = normalizeNumber(row.novos_mes_anterior);
    const current = normalizeNumber(row.novos_mes);
    growthMap[`${row.cidade}_${row.estado}`] = Number((previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0).toFixed(2));
  }

  const cidades: CidadeDados[] = dadosEleitorais.map((item) => {
    const demo = demoMap.get(`${item.cidade}_${item.estado}`);
    return {
      cidade: item.cidade,
      estado: item.estado,
      latitude: normalizeNumber(item.latitude),
      longitude: normalizeNumber(item.longitude),
      votos_2022: normalizeNumber(item.votos_2022),
      populacao_total: normalizeNumber(demo?.populacao_total),
      pct_jovens_16_34: normalizeNumber(demo?.pct_jovens_16_34),
      pct_acesso_internet: normalizeNumber(demo?.pct_acesso_internet),
      pct_urbano: normalizeNumber(demo?.pct_urbano),
      pct_ensino_superior: normalizeNumber(demo?.pct_ensino_superior),
      voluntarios_count: volunteerMap.get(`${item.cidade}_${item.estado}`) ?? 0,
      distancia_sede_km: 0,
    };
  });

  const scores = calcularScoresTerritorial(cidades, -23.5505, -46.6333, growthMap);
  if (scores.length === 0) return;

  const upsert = db.prepare(`
    INSERT INTO scores_territoriais (
      cidade, estado, icd, ipc, iir, ic, io, ivl,
      see_territorial, see_crescimento, see_mobilizacao,
      classificacao, acao_sugerida, voluntarios_count, calculado_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(cidade, estado) DO UPDATE SET
      icd = excluded.icd,
      ipc = excluded.ipc,
      iir = excluded.iir,
      ic = excluded.ic,
      io = excluded.io,
      ivl = excluded.ivl,
      see_territorial = excluded.see_territorial,
      see_crescimento = excluded.see_crescimento,
      see_mobilizacao = excluded.see_mobilizacao,
      classificacao = excluded.classificacao,
      acao_sugerida = excluded.acao_sugerida,
      voluntarios_count = excluded.voluntarios_count,
      calculado_em = datetime('now')
  `);

  const persist = db.transaction((rows: ScoresCidade[]) => {
    for (const row of rows) {
      upsert.run(
        row.cidade,
        row.estado,
        row.icd,
        row.ipc,
        row.iir,
        row.ic,
        row.io,
        row.ivl,
        row.see_territorial,
        row.see_crescimento,
        row.see_mobilizacao,
        row.classificacao,
        row.acao_sugerida,
        volunteerMap.get(`${row.cidade}_${row.estado}`) ?? 0,
      );
    }
  });

  persist(scores);
}

export function seedDemoEcosystem(db: Db): void {
  ensureCredentialUsers(db);
  ensureVolunteers(db);
  ensureMissions(db);
  ensureCampaignStructure(db);
  ensureMissionSubmissions(db);
  ensureVolunteerBadges(db);
  ensureNotifications(db);
  ensureTrainingData(db);
  ensureTrainingProgress(db);
  ensureQuestionarios(db);
  recalculateScores(db);
}


