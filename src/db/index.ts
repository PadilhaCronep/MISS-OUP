import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { seedDemoEcosystem } from './demo-seed.js';

const dbPath = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

export const db = new Database(path.join(dbPath, 'missao.db'));

export function setupDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS volunteers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      phone_whatsapp TEXT,
      cep TEXT,
      city TEXT,
      state TEXT,
      neighborhood TEXT,
      lat REAL,
      lng REAL,
      skills TEXT,
      availability TEXT,
      political_experience TEXT,
      photo_url TEXT,
      xp_total INTEGER DEFAULT 0,
      current_level INTEGER DEFAULT 1,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      missions_completed INTEGER DEFAULT 0,
      volunteers_recruited INTEGER DEFAULT 0,
      leadership_score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      role TEXT DEFAULT 'VOLUNTARIO',
      verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      urgency TEXT NOT NULL,
      xp_reward INTEGER NOT NULL,
      deadline DATETIME,
      target_scope TEXT,
      target_state TEXT,
      target_city TEXT,
      target_skills TEXT,
      evidence_type TEXT,
      validation_type TEXT,
      created_by TEXT,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS mission_submissions (
      id TEXT PRIMARY KEY,
      mission_id TEXT NOT NULL,
      volunteer_id TEXT NOT NULL,
      evidence_content TEXT,
      evidence_url TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      validated_at DATETIME,
      validation_status TEXT DEFAULT 'PENDING',
      validator_id TEXT,
      validator_note TEXT,
      xp_awarded INTEGER DEFAULT 0,
      FOREIGN KEY(mission_id) REFERENCES missions(id),
      FOREIGN KEY(volunteer_id) REFERENCES volunteers(id)
    );

    CREATE TABLE IF NOT EXISTS training_tracks (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      objective TEXT NOT NULL,
      level TEXT NOT NULL, -- INICIANTE | INTERMEDIARIO | AVANCADO
      category TEXT NOT NULL, -- POLITICA | COMUNICACAO | CAMPO | DIGITAL | LIDERANCA
      total_xp INTEGER NOT NULL,
      duration_min INTEGER NOT NULL,
      display_order INTEGER NOT NULL,
      is_mandatory BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      image_url TEXT,
      accent_color TEXT DEFAULT '#F5C400',
      prerequisite_slug TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS training_modules (
      id TEXT PRIMARY KEY,
      track_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL, -- VIDEO | LEITURA | QUIZ | PRATICA
      display_order INTEGER NOT NULL,
      duration_min INTEGER NOT NULL,
      xp_reward INTEGER NOT NULL,
      content TEXT NOT NULL, -- JSON string
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(track_id) REFERENCES training_tracks(id)
    );

    CREATE TABLE IF NOT EXISTS track_progress (
      id TEXT PRIMARY KEY,
      volunteer_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      percentage REAL DEFAULT 0,
      is_completed BOOLEAN DEFAULT 0,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      UNIQUE(volunteer_id, track_id),
      FOREIGN KEY(volunteer_id) REFERENCES volunteers(id),
      FOREIGN KEY(track_id) REFERENCES training_tracks(id)
    );

    CREATE TABLE IF NOT EXISTS module_progress (
      id TEXT PRIMARY KEY,
      volunteer_id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      is_completed BOOLEAN DEFAULT 0,
      quiz_score INTEGER,
      time_spent_min INTEGER DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      completed_at DATETIME,
      UNIQUE(volunteer_id, module_id),
      FOREIGN KEY(volunteer_id) REFERENCES volunteers(id),
      FOREIGN KEY(module_id) REFERENCES training_modules(id)
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      volunteer_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      verification_code TEXT UNIQUE NOT NULL,
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(volunteer_id, track_id),
      FOREIGN KEY(volunteer_id) REFERENCES volunteers(id),
      FOREIGN KEY(track_id) REFERENCES training_tracks(id)
    );

    CREATE TABLE IF NOT EXISTS territory_stats (
      territory_id TEXT PRIMARY KEY,
      territory_type TEXT NOT NULL,
      name TEXT NOT NULL,
      state TEXT NOT NULL,
      total_volunteers INTEGER DEFAULT 0,
      active_volunteers_30d INTEGER DEFAULT 0,
      missions_completed_30d INTEGER DEFAULT 0,
      growth_rate REAL DEFAULT 0,
      coverage_score REAL DEFAULT 0,
      health_score REAL DEFAULT 0,
      momentum_score REAL DEFAULT 0,
      leadership_ratio REAL DEFAULT 0,
      emerging_leaders_count INTEGER DEFAULT 0,
      coordinators_count INTEGER DEFAULT 0,
      last_calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      collection TEXT NOT NULL,
      rarity TEXT NOT NULL,
      icon_url TEXT,
      criteria_type TEXT,
      criteria_value TEXT,
      is_campaign_exclusive BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS volunteer_badges (
      volunteer_id TEXT NOT NULL,
      badge_id TEXT NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (volunteer_id, badge_id),
      FOREIGN KEY(volunteer_id) REFERENCES volunteers(id),
      FOREIGN KEY(badge_id) REFERENCES badges(id)
    );

    -- New tables for Multi-Candidate Organizational System
    CREATE TABLE IF NOT EXISTS campaign_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      office TEXT NOT NULL,
      description TEXT,
      sectors_template TEXT,
      is_public BOOLEAN DEFAULT 1,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS role_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      sector_slug TEXT NOT NULL,
      subsector_slug TEXT,
      description TEXT,
      technical_competencies TEXT,
      behavioral_competencies TEXT,
      platform_skills TEXT,
      weekly_hours_min INTEGER DEFAULT 4,
      weekly_hours_ideal INTEGER DEFAULT 8,
      weekly_hours_max INTEGER DEFAULT 20,
      min_xp_level INTEGER DEFAULT 0,
      performance_predictor TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      candidate_name TEXT NOT NULL,
      office TEXT NOT NULL,
      template_id TEXT,
      configuration TEXT DEFAULT '{}',
      visibility TEXT DEFAULT 'PRIVADA',
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(template_id) REFERENCES campaign_templates(id)
    );

    CREATE TABLE IF NOT EXISTS access_bindings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      scope_type TEXT NOT NULL,
      scope_ref TEXT,
      office_context TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES volunteers(id)
    );

    CREATE TABLE IF NOT EXISTS campaign_sectors (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      is_mandatory BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS campaign_subsectors (
      id TEXT PRIMARY KEY,
      sector_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(sector_id) REFERENCES campaign_sectors(id)
    );

    CREATE TABLE IF NOT EXISTS sector_members (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      sector_id TEXT NOT NULL,
      subsector_id TEXT,
      volunteer_id TEXT NOT NULL,
      role_profile_id TEXT,
      role TEXT DEFAULT 'MEMBRO',
      raci_decisions TEXT DEFAULT '{}',
      competencies_eval TEXT DEFAULT '[]',
      tasks_completed INTEGER DEFAULT 0,
      tasks_on_time INTEGER DEFAULT 0,
      hours_registered REAL DEFAULT 0,
      performance_score INTEGER DEFAULT 50,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY(sector_id) REFERENCES campaign_sectors(id),
      FOREIGN KEY(volunteer_id) REFERENCES volunteers(id),
      FOREIGN KEY(role_profile_id) REFERENCES role_profiles(id)
    );

    CREATE TABLE IF NOT EXISTS role_onboardings (
      id TEXT PRIMARY KEY,
      member_id TEXT UNIQUE NOT NULL,
      role_profile_id TEXT NOT NULL,
      status TEXT DEFAULT 'EM_ANDAMENTO',
      current_step INTEGER DEFAULT 1,
      completed_steps TEXT DEFAULT '[]',
      mentor_id TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY(member_id) REFERENCES sector_members(id),
      FOREIGN KEY(role_profile_id) REFERENCES role_profiles(id)
    );

    CREATE TABLE IF NOT EXISTS member_evaluations (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      evaluator_id TEXT NOT NULL,
      period TEXT NOT NULL,
      score_quality INTEGER,
      score_deadline INTEGER,
      score_collaboration INTEGER,
      score_proactivity INTEGER,
      score_alignment INTEGER,
      score_general INTEGER,
      strengths TEXT,
      development_points TEXT,
      agreed_actions TEXT DEFAULT '[]',
      recommendation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(member_id, period),
      FOREIGN KEY(member_id) REFERENCES sector_members(id)
    );

    CREATE TABLE IF NOT EXISTS campaign_invitations (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      email TEXT NOT NULL,
      sector_slug TEXT,
      subsector_slug TEXT,
      role_profile_id TEXT,
      token TEXT UNIQUE NOT NULL,
      is_used BOOLEAN DEFAULT 0,
      expires_at DATETIME NOT NULL,
      invited_by TEXT NOT NULL,
      accepted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS system_notifications (
      id TEXT PRIMARY KEY,
      recipient_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      action_link TEXT,
      is_read BOOLEAN DEFAULT 0,
      extra_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(recipient_id) REFERENCES volunteers(id)
    );

    CREATE TABLE IF NOT EXISTS campaign_tasks (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      sector_id TEXT NOT NULL,
      subsector_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'PENDENTE',
      priority TEXT DEFAULT 'MEDIA',
      xp_reward INTEGER DEFAULT 0,
      deadline DATETIME,
      estimated_hours REAL,
      registered_hours REAL DEFAULT 0,
      assigned_to TEXT,
      delivery_link TEXT,
      delivery_notes TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY(sector_id) REFERENCES campaign_sectors(id),
      FOREIGN KEY(assigned_to) REFERENCES volunteers(id)
    );
    CREATE TABLE IF NOT EXISTS dados_eleitorais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cidade TEXT NOT NULL,
      estado TEXT NOT NULL,
      codigo_ibge TEXT,
      latitude REAL,
      longitude REAL,
      votos_2022 INTEGER DEFAULT 0,
      votos_2018 INTEGER DEFAULT 0,
      percentual_2022 REAL DEFAULT 0,
      total_eleitores INTEGER DEFAULT 0,
      zona_eleitoral TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(cidade, estado)
    );

    CREATE TABLE IF NOT EXISTS dados_demograficos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cidade TEXT NOT NULL,
      estado TEXT NOT NULL,
      codigo_ibge TEXT,
      populacao_total INTEGER DEFAULT 0,
      densidade_hab_km2 REAL DEFAULT 0,
      pct_jovens_16_34 REAL DEFAULT 0,
      pct_acesso_internet REAL DEFAULT 0,
      pct_urbano REAL DEFAULT 0,
      pct_ensino_superior REAL DEFAULT 0,
      pct_evangelico REAL DEFAULT 0,
      pct_catolico REAL DEFAULT 0,
      idh REAL DEFAULT 0,
      renda_media_mensal REAL DEFAULT 0,
      fonte TEXT DEFAULT 'IBGE_2022',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(cidade, estado)
    );

    CREATE TABLE IF NOT EXISTS questionarios_eleitor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cidade TEXT NOT NULL,
      estado TEXT NOT NULL,
      idade INTEGER,
      sexo TEXT CHECK(sexo IN ('M','F','NB','NI')),
      escolaridade TEXT,
      acesso_internet INTEGER DEFAULT 0,
      usa_redes_sociais TEXT,
      joga_videogame INTEGER DEFAULT 0,
      plataformas_jogo TEXT,
      conhece_candidata INTEGER DEFAULT 0,
      simpatia_candidata INTEGER DEFAULT 0,
      pretende_votar TEXT CHECK(pretende_votar IN ('SIM','NAO','TALVEZ','NR')),
      e_lider_comunidade INTEGER DEFAULT 0,
      tipo_comunidade TEXT,
      preocupacao_principal TEXT,
      coletor_id TEXT REFERENCES volunteers(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scores_territoriais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cidade TEXT NOT NULL,
      estado TEXT NOT NULL,
      icd REAL DEFAULT 0,
      ipc REAL DEFAULT 0,
      iir REAL DEFAULT 0,
      ic REAL DEFAULT 0,
      io REAL DEFAULT 0,
      ivl REAL DEFAULT 0,
      see_territorial REAL DEFAULT 0,
      see_crescimento REAL DEFAULT 0,
      see_mobilizacao REAL DEFAULT 0,
      classificacao TEXT CHECK(classificacao IN (
        'MOTOR','DIAMANTE','POLO','APOSTA','LATENTE','BAIXA_PRIOR'
      )),
      acao_sugerida TEXT CHECK(acao_sugerida IN (
        'EVENTO_PRESENCIAL','RECRUTAMENTO','POLO_REGIONAL',
        'MONITORAR','EXPANSAO_PRIORITARIA','ACAO_DIGITAL'
      )),
      modo_calculo TEXT DEFAULT 'AUTOMATICO',
      calculado_em TEXT DEFAULT (datetime('now')),
      voluntarios_count INTEGER DEFAULT 0,
      UNIQUE(cidade, estado)
    );
    CREATE TABLE IF NOT EXISTS campaign_timeline_events (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      severity TEXT DEFAULT 'INFO',
      source_area TEXT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'ABERTO',
      event_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS campaign_social_metrics (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      collected_at DATETIME NOT NULL,
      media_type TEXT NOT NULL,
      platform TEXT NOT NULL,
      format TEXT NOT NULL,
      demographic_group TEXT,
      hour_slot INTEGER,
      reach INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      engagements INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0,
      followers_growth INTEGER DEFAULT 0,
      spend REAL DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      leads INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      cpc REAL DEFAULT 0,
      cpm REAL DEFAULT 0,
      ctr REAL DEFAULT 0,
      cpl REAL DEFAULT 0,
      cost_per_supporter REAL DEFAULT 0,
      cost_per_volunteer REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS campaign_leads (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      city TEXT,
      state TEXT,
      neighborhood TEXT,
      source TEXT NOT NULL,
      interest TEXT,
      tags TEXT DEFAULT '[]',
      status TEXT NOT NULL,
      engagement_level INTEGER DEFAULT 0,
      entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_status_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      territory_ref TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS campaign_whatsapp_groups (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      name TEXT NOT NULL,
      admins_json TEXT DEFAULT '[]',
      members_count INTEGER DEFAULT 0,
      activity_score REAL DEFAULT 0,
      territory_ref TEXT,
      retention_rate REAL DEFAULT 0,
      status TEXT DEFAULT 'ATIVO',
      last_activity_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS campaign_programming_topics (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id TEXT,
      votes INTEGER DEFAULT 0,
      answers_count INTEGER DEFAULT 0,
      is_solved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY(author_id) REFERENCES volunteers(id)
    );

    CREATE TABLE IF NOT EXISTS campaign_integrations (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      category TEXT NOT NULL,
      integration_type TEXT NOT NULL,
      status TEXT DEFAULT 'DESCONECTADA',
      owner_role TEXT,
      sync_health REAL DEFAULT 0,
      records_24h INTEGER DEFAULT 0,
      avg_latency_ms REAL DEFAULT 0,
      error_rate REAL DEFAULT 0,
      last_sync_at DATETIME,
      webhook_url TEXT,
      metadata_json TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS candidate_agenda (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      title TEXT NOT NULL,
      agenda_type TEXT NOT NULL,
      priority TEXT DEFAULT 'MEDIA',
      status TEXT DEFAULT 'PENDENTE',
      due_at DATETIME,
      source_entity TEXT,
      source_id TEXT,
      notes TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY(created_by) REFERENCES volunteers(id)
    );

    CREATE TABLE IF NOT EXISTS campaign_hierarchical_messages (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      target_role TEXT NOT NULL,
      recipient_id TEXT,
      urgency TEXT DEFAULT 'NORMAL',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      context_payload TEXT DEFAULT '{}',
      read_by_recipient INTEGER DEFAULT 0,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY(sender_id) REFERENCES volunteers(id),
      FOREIGN KEY(recipient_id) REFERENCES volunteers(id)
    );

    CREATE INDEX IF NOT EXISTS idx_campaign_social_metrics_campaign_day
      ON campaign_social_metrics(campaign_id, collected_at);
    CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_status
      ON campaign_leads(campaign_id, status, entered_at);
    CREATE INDEX IF NOT EXISTS idx_campaign_whatsapp_groups_campaign
      ON campaign_whatsapp_groups(campaign_id, status);
    CREATE INDEX IF NOT EXISTS idx_candidate_agenda_campaign_due
      ON candidate_agenda(campaign_id, status, due_at);
    CREATE INDEX IF NOT EXISTS idx_campaign_timeline_events_campaign
      ON campaign_timeline_events(campaign_id, event_at);
    CREATE INDEX IF NOT EXISTS idx_campaign_programming_topics_campaign
      ON campaign_programming_topics(campaign_id, category, is_solved);
    CREATE INDEX IF NOT EXISTS idx_campaign_integrations_campaign
      ON campaign_integrations(campaign_id, category, status);
    CREATE INDEX IF NOT EXISTS idx_campaign_hierarchical_messages_campaign
      ON campaign_hierarchical_messages(campaign_id, target_role, created_at);
    CREATE INDEX IF NOT EXISTS idx_dados_eleitorais_estado
      ON dados_eleitorais(estado);
    CREATE INDEX IF NOT EXISTS idx_dados_demograficos_estado
      ON dados_demograficos(estado);
    CREATE INDEX IF NOT EXISTS idx_scores_classificacao
      ON scores_territoriais(classificacao);
    CREATE INDEX IF NOT EXISTS idx_scores_see_crescimento
      ON scores_territoriais(see_crescimento DESC);
    CREATE INDEX IF NOT EXISTS idx_questionarios_cidade
      ON questionarios_eleitor(cidade, estado);
    CREATE INDEX IF NOT EXISTS idx_access_bindings_user
      ON access_bindings(user_id, is_active);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_access_bindings_unique
      ON access_bindings(user_id, role, scope_type, COALESCE(scope_ref, ''), COALESCE(office_context, ''));
  `);

  // Seed initial data if empty
  const count = db.prepare('SELECT count(*) as count FROM volunteers').get() as { count: number };
  if (count.count === 0) {
    seedData();
  }
  
  // Seed organizational system if empty
  const templateCount = db.prepare('SELECT count(*) as count FROM campaign_templates').get() as { count: number };
  if (templateCount.count === 0) {
    seedOrganizationalSystem();
  }

  // Seed inteligencia territorial data if empty
  const dadosEleitoraisCount = db.prepare('SELECT count(*) as count FROM dados_eleitorais').get() as { count: number };
  if (dadosEleitoraisCount.count === 0) {
    seedInteligenciaEleitoral();
  }

  ensureAccessBindings();

  seedDemoEcosystem(db);
  seedCampaignOperatingSystem();
  ensureAccessBindings();
}

function ensureAccessBindings() {
  const users = db
    .prepare('SELECT id, role, state, city FROM volunteers')
    .all() as Array<{ id: string; role: string | null; state: string | null; city: string | null }>;

  const exists = db.prepare(
    `SELECT id FROM access_bindings
     WHERE user_id = ?
       AND role = ?
       AND scope_type = ?
       AND COALESCE(scope_ref, '') = COALESCE(?, '')
       AND COALESCE(office_context, '') = COALESCE(?, '')
       AND is_active = 1
     LIMIT 1`,
  );

  const insert = db.prepare(
    `INSERT INTO access_bindings (id, user_id, role, scope_type, scope_ref, office_context, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
  );

  const ensureBinding = (
    userId: string,
    role: string,
    scopeType: string,
    scopeRef: string | null,
    officeContext: string | null = null,
  ) => {
    const found = exists.get(userId, role, scopeType, scopeRef ?? '', officeContext ?? '');
    if (found) return;
    insert.run(
      `ab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      role,
      scopeType,
      scopeRef,
      officeContext,
    );
  };

  for (const user of users) {
    const role = (user.role || 'VOLUNTARIO').toUpperCase();
    const isPreCandidate = role === 'PRE_CANDIDATO' || role.startsWith('PRE_CANDIDATO_');

    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'ADMIN_NACIONAL' || role === 'DIRECAO_PARTIDARIA') {
      ensureBinding(user.id, 'ADMIN_NACIONAL', 'NACIONAL', null);
      continue;
    }

    if (role === 'COORDENADOR_ESTADUAL' || role === 'ADMIN_ESTADUAL') {
      ensureBinding(user.id, 'ADMIN_ESTADUAL', 'ESTADUAL', user.state ? user.state.toUpperCase() : null);
      continue;
    }

    if (isPreCandidate) {
      const isPresidential = role.includes('PRESID');

      if (isPresidential || !user.state) {
        ensureBinding(user.id, 'PRE_CANDIDATO', 'NACIONAL', null, 'PRESIDENTE');
        continue;
      }

      const officeContext = role.includes('DEP') ? 'DEPUTADO' : 'GOVERNADOR';
      ensureBinding(user.id, 'PRE_CANDIDATO', 'ESTADUAL', user.state.toUpperCase(), officeContext);
      continue;
    }

    if (role === 'CHEFE_CAMPANHA' || role === 'COORDENADOR_CAMPANHA' || role === 'CHEFE_REDES' || role === 'CHEFE_LEADS' || role === 'CHEFE_PROGRAMACAO') {
      ensureBinding(
        user.id,
        role,
        user.state ? 'ESTADUAL' : 'PROPRIO_USUARIO',
        user.state ? user.state.toUpperCase() : user.id,
      );
      continue;
    }
    if (role === 'CANDIDATO') {
      if (user.state) {
        ensureBinding(user.id, 'CANDIDATO', 'ESTADUAL', user.state.toUpperCase());
      }
      ensureBinding(user.id, 'CANDIDATO', 'PROPRIO_USUARIO', user.id);
      continue;
    }
    if (role === 'LIDER_SETOR' || role === 'MEMBRO_SETOR') {
      if (user.state) {
        ensureBinding(user.id, role, 'ESTADUAL', user.state.toUpperCase());
      }
      ensureBinding(user.id, role, 'PROPRIO_USUARIO', user.id);
      continue;
    }

    if (role === 'COORDENADOR_MUNICIPAL' || role === 'ADMIN_REGIONAL' || role === 'COORDENADOR_TERRITORIAL') {
      ensureBinding(user.id, 'ADMIN_REGIONAL', 'MUNICIPAL', user.city ?? null);
      if (user.state) {
        ensureBinding(user.id, 'ADMIN_REGIONAL', 'ESTADUAL', user.state.toUpperCase());
      }
      continue;
    }
    if (role === 'OPERADOR_AREA') {
      if (user.state) {
        ensureBinding(user.id, 'OPERADOR_AREA', 'ESTADUAL', user.state.toUpperCase());
      }
      ensureBinding(user.id, 'OPERADOR_AREA', 'PROPRIO_USUARIO', user.id);
      continue;
    }
    if (role === 'LIDER_EMERGENTE' || role === 'MILITANTE') {
      ensureBinding(user.id, 'MILITANTE', 'PROPRIO_USUARIO', user.id);
      continue;
    }

    ensureBinding(user.id, 'VOLUNTARIO', 'PROPRIO_USUARIO', user.id);
  }
}

function seedOrganizationalSystem() {
  const insertTemplate = db.prepare(`
    INSERT INTO campaign_templates (id, name, office, description, sectors_template)
    VALUES (?, ?, ?, ?, ?)
  `);

  const templates = [
    [
      'tmpl-dep-fed',
      'Deputado(a) Federal',
      'DEPUTADO_FEDERAL',
      'Estrutura completa para campanha de Deputado Federal com foco em tecnologia e redes sociais.',
      JSON.stringify([
        {nome:"Tecnologia", slug:"tecnologia", icone:"💻", cor:"#1565C0", obrigatorio:false, subsetoresDefault:["Automação","Fullstack","Backend","Frontend","Infra/Segurança"]},
        {nome:"Redes Sociais", slug:"redes-sociais", icone:"📱", cor:"#7B1FA2", obrigatorio:true, subsetoresDefault:["Cards e Design","Edição de Vídeo","Roteiristas","Pesquisa"]},
        {nome:"RH", slug:"rh", icone:"👥", cor:"#2E7D32", obrigatorio:true, subsetoresDefault:[]},
        {nome:"Financeiro", slug:"financeiro", icone:"💰", cor:"#F5C400", obrigatorio:true, subsetoresDefault:[]},
        {nome:"Político-Legislativo", slug:"politico-legislativo", icone:"⚖️", cor:"#E53935", obrigatorio:true, subsetoresDefault:["Projetos de Lei","Ações de Campo"]},
        {nome:"Campo", slug:"campo", icone:"🗺️", cor:"#FF6F00", obrigatorio:true, subsetoresDefault:[]}
      ])
    ],
    [
      'tmpl-vereador',
      'Vereador(a)',
      'VEREADOR',
      'Estrutura ágil para campanhas municipais de vereança.',
      JSON.stringify([
        {nome:"Comunicação", slug:"comunicacao", icone:"📢", cor:"#7B1FA2", obrigatorio:true, subsetoresDefault:["Redes Sociais","Material Impresso"]},
        {nome:"Campo", slug:"campo", icone:"🗺️", cor:"#FF6F00", obrigatorio:true, subsetoresDefault:["Bairros","Eventos"]},
        {nome:"RH", slug:"rh", icone:"👥", cor:"#2E7D32", obrigatorio:true, subsetoresDefault:[]},
        {nome:"Financeiro", slug:"financeiro", icone:"💰", cor:"#F5C400", obrigatorio:true, subsetoresDefault:[]},
        {nome:"Legislativo", slug:"legislativo", icone:"⚖️", cor:"#E53935", obrigatorio:false, subsetoresDefault:["Projetos","Fiscalização"]}
      ])
    ],
    [
      'tmpl-prefeito',
      'Prefeito(a)',
      'PREFEITO',
      'Estrutura robusta para gestão de campanha majoritária municipal.',
      JSON.stringify([
        {nome:"Comunicação", slug:"comunicacao", icone:"📢", cor:"#7B1FA2", obrigatorio:true, subsetoresDefault:["Redes Sociais","TV/Rádio","Assessoria de Imprensa"]},
        {nome:"Campo", slug:"campo", icone:"🗺️", cor:"#FF6F00", obrigatorio:true, subsetoresDefault:["Mobilização","Logística"]},
        {nome:"Tecnologia", slug:"tecnologia", icone:"💻", cor:"#1565C0", obrigatorio:false, subsetoresDefault:["Dados","CRM"]},
        {nome:"RH", slug:"rh", icone:"👥", cor:"#2E7D32", obrigatorio:true, subsetoresDefault:[]},
        {nome:"Financeiro", slug:"financeiro", icone:"💰", cor:"#F5C400", obrigatorio:true, subsetoresDefault:[]},
        {nome:"Jurídico", slug:"juridico", icone:"🏛️", cor:"#455A64", obrigatorio:true, subsetoresDefault:[]},
        {nome:"Propostas de Governo", slug:"propostas", icone:"📋", cor:"#E53935", obrigatorio:true, subsetoresDefault:["Saúde","Educação","Infraestrutura","Segurança","Desenvolvimento Econômico"]}
      ])
    ]
  ];

  for (const t of templates) {
    insertTemplate.run(...t);
  }

  const insertProfile = db.prepare(`
    INSERT INTO role_profiles (id, name, slug, sector_slug, subsector_slug, description, technical_competencies, behavioral_competencies, platform_skills, weekly_hours_min, weekly_hours_ideal, weekly_hours_max, min_xp_level, performance_predictor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const profiles = [
    [
      'prof-dev-backend', 'Desenvolvedor Backend', 'dev-backend', 'tecnologia', 'Backend',
      'Responsável por APIs e banco de dados.',
      JSON.stringify(["APIs REST/GraphQL", "PostgreSQL/Prisma ORM", "Node.js/TypeScript", "Autenticação JWT", "Versionamento Git"]),
      JSON.stringify(["Atenção a detalhes de segurança", "Documentação do código", "Comunicação técnica clara", "Gestão de prioridades"]),
      JSON.stringify(["Tecnologia"]),
      6, 12, 30, 600, "Zero bugs críticos em produção e tempo médio de PR < 48h"
    ],
    [
      'prof-dev-frontend', 'Desenvolvedor Frontend', 'dev-frontend', 'tecnologia', 'Frontend',
      'Responsável pela interface do usuário.',
      JSON.stringify(["React/Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui", "Responsividade"]),
      JSON.stringify(["Senso estético", "Empatia com usuário", "Iteração rápida", "Colaboração"]),
      JSON.stringify(["Tecnologia", "Design"]),
      6, 12, 30, 600, "Fidelidade ao design e performance de carregamento"
    ],
    [
      'prof-designer', 'Designer de Conteúdo', 'designer-conteudo', 'redes-sociais', 'Cards e Design',
      'Criação de materiais visuais.',
      JSON.stringify(["Canva Pro / Figma", "Identidade visual", "Formatos por plataforma", "Tipografia"]),
      JSON.stringify(["Alinhamento narrativo", "Velocidade de produção", "Receptividade a feedback"]),
      JSON.stringify(["Design", "Conteúdo Digital"]),
      4, 10, 20, 300, "Taxa de engajamento acima da média"
    ],
    [
      'prof-rh', 'Responsável de RH', 'rh-geral', 'rh', null,
      'Gestão de voluntários e onboarding.',
      JSON.stringify(["Processo seletivo", "Onboarding", "Monitoramento de engajamento", "Gestão de conflitos"]),
      JSON.stringify(["Escuta ativa", "Comunicação clara", "Visão sistêmica", "Imparcialidade"]),
      JSON.stringify(["Captação de Voluntários", "Redes de Contato"]),
      5, 10, 20, 500, "Taxa de retenção > 80% após 60 dias"
    ],
    [
      'prof-tesoureiro', 'Tesoureiro(a)', 'tesoureiro', 'financeiro', null,
      'Gestão financeira e prestação de contas.',
      JSON.stringify(["Prestação de contas TSE", "Fluxo de caixa", "Lei das Eleições", "Recibos eleitorais"]),
      JSON.stringify(["Rigor com compliance", "Transparência", "Organização", "Resistência a pressão"]),
      JSON.stringify(["Organização Local"]),
      4, 8, 15, 800, "Zero irregularidades na prestação de contas"
    ]
  ];

  for (const p of profiles) {
    insertProfile.run(...p);
  }
}

function seedData() {
  const insertVolunteer = db.prepare(`
    INSERT INTO volunteers (id, name, email, phone_whatsapp, city, state, lat, lng, role, xp_total, current_level, missions_completed, current_streak, volunteers_recruited)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Seed specific test users requested in the prompt
  const volunteers = [
    ['admin1', 'Admin Missão', 'admin@missao.com.br', '61999999999', 'Brasília', 'DF', -15.7942, -47.8822, 'ADMIN', 15000, 7, 100, 50, 20],
    ['coord1', 'Coordenador SP', 'coordenador@missao.com.br', '11999999999', 'São Paulo', 'SP', -23.5505, -46.6333, 'COORDENADOR_ESTADUAL', 5000, 5, 40, 30, 10],
    ['vol1', 'Ana Silva', 'ana@teste.com', '11988888888', 'São Paulo', 'SP', -23.5605, -46.6433, 'VOLUNTARIO', 1200, 3, 18, 12, 4],
    ['vol2', 'Carlos Souza', 'carlos@teste.com', '21999999999', 'Rio de Janeiro', 'RJ', -22.9068, -43.1729, 'VOLUNTARIO', 150, 1, 2, 3, 0],
    // Add a few more for map density
    ['vol3', 'Maria Santos', 'maria@teste.com', '31999999999', 'Belo Horizonte', 'MG', -19.9167, -43.9345, 'VOLUNTARIO', 450, 2, 5, 4, 1],
    ['vol4', 'Pedro Alves', 'pedro@teste.com', '41999999999', 'Curitiba', 'PR', -25.4284, -49.2733, 'LIDER_EMERGENTE', 800, 3, 10, 6, 2],
  ];

  for (const v of volunteers) {
    insertVolunteer.run(...v);
  }

  const insertMission = db.prepare(`
    INSERT INTO missions (id, title, description, type, urgency, xp_reward, evidence_type, validation_type, target_state)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const missions = [
    ['m1', 'Compartilhe nossa proposta de saúde', 'Compartilhe o post fixado em nossas redes com a hashtag #MissaoSaude', 'DIGITAL', 'URGENT', 40, 'LINK', 'AUTOMATIC', null],
    ['m2', 'Participe do evento em São Paulo', 'Compareça ao evento de lançamento regional no Parque Ibirapuera', 'TERRITORIAL', 'PRIORITY', 80, 'PHOTO', 'MANUAL', 'SP'],
    ['m3', 'Recrute um novo voluntário', 'Convide uma pessoa do seu círculo que acredita nas propostas da Missão', 'RECRUITMENT', 'ONGOING', 60, 'TEXT', 'MANUAL', null],
    ['m4', 'Grave um vídeo de apresentação', 'Grave um vídeo de 60 segundos explicando por que apoia o movimento', 'DIGITAL', 'PRIORITY', 100, 'LINK', 'MANUAL', null],
    ['m5', 'Complete o módulo de introdução', 'Assista ao vídeo de boas-vindas e responda o quiz de conhecimento', 'TRAINING', 'ONGOING', 50, 'NONE', 'AUTOMATIC', null],
    ['m6', 'Mutirão de Limpeza', 'Participe da ação comunitária no centro da cidade', 'TERRITORIAL', 'URGENT', 150, 'PHOTO', 'MANUAL', 'RJ'],
    ['m7', 'Mapeamento de Lideranças', 'Identifique 3 líderes comunitários do seu bairro', 'TERRITORIAL', 'PRIORITY', 120, 'TEXT', 'MANUAL', null],
    ['m8', 'Blitz Digital no Twitter', 'Suba a hashtag oficial do movimento hoje às 19h', 'DIGITAL', 'URGENT', 80, 'LINK', 'AUTOMATIC', null],
  ];

  for (const m of missions) {
    insertMission.run(...m);
  }

  const insertBadge = db.prepare(`
    INSERT INTO badges (id, name, description, collection, rarity, icon_url, criteria_type, criteria_value)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const badges = [
    // DIGITAL
    ['b1', 'Primeiro Post', 'Completou a primeira missão digital', 'DIGITAL', 'COMUM', '🖥️', 'MISSOES_DIGITAL', '1'],
    ['b2', 'Voz do Movimento', 'Completou 10 missões digitais', 'DIGITAL', 'COMUM', '📢', 'MISSOES_DIGITAL', '10'],
    ['b3', 'Megafone', 'Completou 50 missões digitais', 'DIGITAL', 'RARO', '🔊', 'MISSOES_DIGITAL', '50'],
    ['b4', 'Digital Elite', 'Completou 100 missões digitais', 'DIGITAL', 'EPICO', '🌐', 'MISSOES_DIGITAL', '100'],
    // TERRITORIAL
    ['b5', 'Raízes', 'Completou a primeira missão territorial', 'TERRITORIAL', 'COMUM', '📍', 'MISSOES_TERRITORIAL', '1'],
    ['b6', 'Dono da Cidade', 'Completou 5 missões territoriais', 'TERRITORIAL', 'RARO', '🏙️', 'MISSOES_TERRITORIAL', '5'],
    ['b7', 'Conquistador', 'Completou 15 missões territoriais', 'TERRITORIAL', 'EPICO', '🗺️', 'MISSOES_TERRITORIAL', '15'],
    ['b8', 'Força Nacional', 'Atuou em 3 estados diferentes', 'TERRITORIAL', 'LENDARIO', '🇧🇷', 'ESTADOS_DIFERENTES', '3'],
    // RECRUTAMENTO
    ['b9', 'Primeiro Recruta', 'Recrutou o primeiro voluntário', 'RECRUITMENT', 'COMUM', '🤝', 'RECRUTADOS', '1'],
    ['b10', 'Expansão', 'Recrutou 5 voluntários', 'RECRUITMENT', 'RARO', '🌊', 'RECRUTADOS', '5'],
    ['b11', 'Rede Viva', 'Recrutou 10 voluntários', 'RECRUITMENT', 'EPICO', '🔗', 'RECRUTADOS', '10'],
    ['b12', 'Multiplicador', 'Recrutou 25 voluntários', 'RECRUITMENT', 'LENDARIO', '💥', 'RECRUTADOS', '25'],
    // CONSTÂNCIA
    ['b13', 'Pontual', '7 dias de streak', 'CONSTANCIA', 'COMUM', '⏰', 'STREAK', '7'],
    ['b14', 'Comprometido', '30 dias de streak', 'CONSTANCIA', 'RARO', '🔒', 'STREAK', '30'],
    ['b15', 'Inabalável', '90 dias de streak', 'CONSTANCIA', 'EPICO', '💎', 'STREAK', '90'],
    ['b16', 'Lenda Ativa', '365 dias de streak', 'CONSTANCIA', 'LENDARIO', '🏅', 'STREAK', '365'],
    // LIDERANÇA
    ['b17', 'Emergindo', 'Leadership score > 70', 'LIDERANCA', 'RARO', '🌟', 'LEADERSHIP_SCORE', '70'],
    ['b18', 'Referência Local', 'Top 3 na cidade por 30 dias', 'LIDERANCA', 'EPICO', '🎯', 'TOP3_CIDADE', '30'],
    ['b19', 'Coordenador', 'Promovido a coordenador', 'LIDERANCA', 'EPICO', '🏆', 'PAPEL', 'COORDENADOR'],
    ['b20', 'Pilar do Movimento', 'Reconhecimento especial', 'LIDERANCA', 'LENDARIO', '👑', 'MANUAL', '1'],
  ];

  for (const b of badges) {
    insertBadge.run(...b);
  }
}


type CidadeInteligenciaSeed = {
  cidade: string;
  estado: string;
  votos_2022: number;
  populacao_total: number;
  pct_jovens_16_34: number;
  pct_acesso_internet: number;
  pct_urbano: number;
  latitude: number;
  longitude: number;
};

function seedInteligenciaEleitoral() {
  const cidadesSP: CidadeInteligenciaSeed[] = [
    { cidade: 'S�o Paulo', estado: 'SP', votos_2022: 12840, populacao_total: 12325232, pct_jovens_16_34: 28.4, pct_acesso_internet: 81.2, pct_urbano: 99.1, latitude: -23.5505, longitude: -46.6333 },
    { cidade: 'Campinas', estado: 'SP', votos_2022: 8920, populacao_total: 1213792, pct_jovens_16_34: 30.1, pct_acesso_internet: 78.5, pct_urbano: 98.7, latitude: -22.9056, longitude: -47.0608 },
    { cidade: 'Santos', estado: 'SP', votos_2022: 2180, populacao_total: 433966, pct_jovens_16_34: 25.8, pct_acesso_internet: 76.3, pct_urbano: 99.8, latitude: -23.9608, longitude: -46.3336 },
    { cidade: 'S�o Jos� dos Campos', estado: 'SP', votos_2022: 5640, populacao_total: 729737, pct_jovens_16_34: 31.2, pct_acesso_internet: 80.1, pct_urbano: 99.3, latitude: -23.1896, longitude: -45.8841 },
    { cidade: 'Ribeir�o Preto', estado: 'SP', votos_2022: 3920, populacao_total: 711825, pct_jovens_16_34: 29.7, pct_acesso_internet: 77.8, pct_urbano: 99.6, latitude: -21.1775, longitude: -47.8103 },
    { cidade: 'Sorocaba', estado: 'SP', votos_2022: 4180, populacao_total: 696382, pct_jovens_16_34: 30.5, pct_acesso_internet: 76.2, pct_urbano: 99.2, latitude: -23.5015, longitude: -47.4526 },
    { cidade: 'Mau�', estado: 'SP', votos_2022: 980, populacao_total: 480793, pct_jovens_16_34: 32.8, pct_acesso_internet: 68.4, pct_urbano: 99.9, latitude: -23.6678, longitude: -46.4614 },
    { cidade: 'S�o Jos� do Rio Preto', estado: 'SP', votos_2022: 2840, populacao_total: 460782, pct_jovens_16_34: 27.3, pct_acesso_internet: 75.1, pct_urbano: 99.4, latitude: -20.8197, longitude: -49.3795 },
    { cidade: 'Guarulhos', estado: 'SP', votos_2022: 3120, populacao_total: 1392121, pct_jovens_16_34: 33.1, pct_acesso_internet: 70.2, pct_urbano: 99.8, latitude: -23.4539, longitude: -46.5333 },
    { cidade: 'Osasco', estado: 'SP', votos_2022: 2560, populacao_total: 696850, pct_jovens_16_34: 31.7, pct_acesso_internet: 72.8, pct_urbano: 99.7, latitude: -23.5324, longitude: -46.792 },
    { cidade: 'Presidente Prudente', estado: 'SP', votos_2022: 1240, populacao_total: 230006, pct_jovens_16_34: 28.9, pct_acesso_internet: 72.4, pct_urbano: 99.0, latitude: -22.1256, longitude: -51.3889 },
    { cidade: 'Piracicaba', estado: 'SP', votos_2022: 1680, populacao_total: 407252, pct_jovens_16_34: 29.2, pct_acesso_internet: 74.6, pct_urbano: 98.5, latitude: -22.7253, longitude: -47.6492 },
    { cidade: 'Franca', estado: 'SP', votos_2022: 890, populacao_total: 352500, pct_jovens_16_34: 30.8, pct_acesso_internet: 71.3, pct_urbano: 99.1, latitude: -20.5386, longitude: -47.4008 },
    { cidade: 'Limeira', estado: 'SP', votos_2022: 720, populacao_total: 308252, pct_jovens_16_34: 31.4, pct_acesso_internet: 73.9, pct_urbano: 98.8, latitude: -22.5648, longitude: -47.4019 },
    { cidade: 'Taubat�', estado: 'SP', votos_2022: 1420, populacao_total: 318099, pct_jovens_16_34: 29.6, pct_acesso_internet: 76.1, pct_urbano: 98.9, latitude: -23.0268, longitude: -45.5558 },
    { cidade: 'Bauru', estado: 'SP', votos_2022: 1860, populacao_total: 377648, pct_jovens_16_34: 28.4, pct_acesso_internet: 74.8, pct_urbano: 99.3, latitude: -22.3246, longitude: -49.0687 },
    { cidade: 'Mar�lia', estado: 'SP', votos_2022: 620, populacao_total: 237094, pct_jovens_16_34: 27.8, pct_acesso_internet: 71.2, pct_urbano: 99.0, latitude: -22.2129, longitude: -49.9455 },
    { cidade: 'S�o Carlos', estado: 'SP', votos_2022: 980, populacao_total: 254484, pct_jovens_16_34: 34.2, pct_acesso_internet: 79.8, pct_urbano: 99.4, latitude: -22.0175, longitude: -47.8908 },
    { cidade: 'Araraquara', estado: 'SP', votos_2022: 740, populacao_total: 238208, pct_jovens_16_34: 30.1, pct_acesso_internet: 76.7, pct_urbano: 99.5, latitude: -21.7886, longitude: -48.1758 },
    { cidade: 'Jundia�', estado: 'SP', votos_2022: 1120, populacao_total: 431896, pct_jovens_16_34: 31.8, pct_acesso_internet: 80.4, pct_urbano: 99.6, latitude: -23.1864, longitude: -46.8964 },
    { cidade: 'Indaiatuba', estado: 'SP', votos_2022: 480, populacao_total: 264893, pct_jovens_16_34: 34.6, pct_acesso_internet: 78.2, pct_urbano: 99.2, latitude: -23.0892, longitude: -47.2192 },
    { cidade: 'Americana', estado: 'SP', votos_2022: 390, populacao_total: 241428, pct_jovens_16_34: 30.4, pct_acesso_internet: 76.9, pct_urbano: 99.7, latitude: -22.7394, longitude: -47.3322 },
    { cidade: 'Catanduva', estado: 'SP', votos_2022: 280, populacao_total: 121774, pct_jovens_16_34: 27.2, pct_acesso_internet: 68.5, pct_urbano: 99.0, latitude: -21.1381, longitude: -48.9722 },
    { cidade: 'Botucatu', estado: 'SP', votos_2022: 340, populacao_total: 148100, pct_jovens_16_34: 32.8, pct_acesso_internet: 75.3, pct_urbano: 99.1, latitude: -22.8833, longitude: -48.4444 },
    { cidade: 'Ara�atuba', estado: 'SP', votos_2022: 560, populacao_total: 205179, pct_jovens_16_34: 27.9, pct_acesso_internet: 69.8, pct_urbano: 99.2, latitude: -21.2089, longitude: -50.4322 },
  ];

  const inserirEleitoral = db.prepare(`
    INSERT INTO dados_eleitorais (
      cidade, estado, codigo_ibge, latitude, longitude,
      votos_2022, votos_2018, percentual_2022, total_eleitores, zona_eleitoral, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(cidade, estado) DO UPDATE SET
      codigo_ibge = excluded.codigo_ibge,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      votos_2022 = excluded.votos_2022,
      votos_2018 = excluded.votos_2018,
      percentual_2022 = excluded.percentual_2022,
      total_eleitores = excluded.total_eleitores,
      zona_eleitoral = excluded.zona_eleitoral,
      updated_at = datetime('now')
  `);

  const inserirDemografico = db.prepare(`
    INSERT INTO dados_demograficos (
      cidade, estado, codigo_ibge, populacao_total, densidade_hab_km2,
      pct_jovens_16_34, pct_acesso_internet, pct_urbano, pct_ensino_superior,
      pct_evangelico, pct_catolico, idh, renda_media_mensal, fonte, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(cidade, estado) DO UPDATE SET
      codigo_ibge = excluded.codigo_ibge,
      populacao_total = excluded.populacao_total,
      densidade_hab_km2 = excluded.densidade_hab_km2,
      pct_jovens_16_34 = excluded.pct_jovens_16_34,
      pct_acesso_internet = excluded.pct_acesso_internet,
      pct_urbano = excluded.pct_urbano,
      pct_ensino_superior = excluded.pct_ensino_superior,
      pct_evangelico = excluded.pct_evangelico,
      pct_catolico = excluded.pct_catolico,
      idh = excluded.idh,
      renda_media_mensal = excluded.renda_media_mensal,
      fonte = excluded.fonte,
      updated_at = datetime('now')
  `);

  const seedTx = db.transaction((cidades: CidadeInteligenciaSeed[]) => {
    for (const cidade of cidades) {
      const totalEleitores = Math.round(cidade.populacao_total * 0.74);
      const percentual = totalEleitores > 0 ? (cidade.votos_2022 / totalEleitores) * 100 : 0;
      const votos2018 = Math.max(0, Math.round(cidade.votos_2022 * 0.82));
      const densidade = Number((cidade.populacao_total / 450).toFixed(2));
      const superior = Number(Math.max(8, Math.min(38, cidade.pct_acesso_internet * 0.4)).toFixed(1));
      const evangelico = Number(Math.max(14, Math.min(42, 28 + (cidade.pct_jovens_16_34 - 30) * 0.7)).toFixed(1));
      const catolico = Number(Math.max(20, Math.min(58, 48 - (cidade.pct_jovens_16_34 - 30) * 0.9)).toFixed(1));
      const idh = Number(Math.max(0.68, Math.min(0.86, 0.68 + cidade.pct_acesso_internet / 500)).toFixed(3));
      const renda = Math.round(1800 + cidade.pct_acesso_internet * 25 + cidade.pct_jovens_16_34 * 15);

      inserirEleitoral.run(
        cidade.cidade,
        cidade.estado,
        null,
        cidade.latitude,
        cidade.longitude,
        cidade.votos_2022,
        votos2018,
        Number(percentual.toFixed(2)),
        totalEleitores,
        null,
      );

      inserirDemografico.run(
        cidade.cidade,
        cidade.estado,
        null,
        cidade.populacao_total,
        densidade,
        cidade.pct_jovens_16_34,
        cidade.pct_acesso_internet,
        cidade.pct_urbano,
        superior,
        evangelico,
        catolico,
        idh,
        renda,
        'IBGE_2022_APROX',
      );
    }
  });

  seedTx(cidadesSP);
}








function seedCampaignOperatingSystem() {
  const campaign = db
    .prepare('SELECT id, candidate_name FROM campaigns ORDER BY created_at ASC LIMIT 1')
    .get() as { id: string; candidate_name: string } | undefined;

  if (!campaign) return;

  const sender = db
    .prepare(
      `SELECT id, role
       FROM volunteers
       WHERE UPPER(COALESCE(role, '')) IN (
         'CHEFE_CAMPANHA',
         'COORDENADOR_CAMPANHA',
         'COORDENADOR_ESTADUAL',
         'ADMIN',
         'ADMIN_NACIONAL'
       )
       ORDER BY created_at ASC
       LIMIT 1`,
    )
    .get() as { id: string; role: string } | undefined;

  const fallbackUser = db
    .prepare('SELECT id, role FROM volunteers ORDER BY created_at ASC LIMIT 1')
    .get() as { id: string; role: string } | undefined;

  const actor = sender ?? fallbackUser;
  if (!actor) return;

  const candidate = db
    .prepare(
      `SELECT id
       FROM volunteers
       WHERE UPPER(COALESCE(role, '')) IN ('CANDIDATO', 'PRE_CANDIDATO', 'CHEFE_CAMPANHA')
       ORDER BY created_at ASC
       LIMIT 1`,
    )
    .get() as { id: string } | undefined;

  const socialCount = db
    .prepare('SELECT count(*) as count FROM campaign_social_metrics WHERE campaign_id = ?')
    .get(campaign.id) as { count: number };

  if (socialCount.count === 0) {
    const socialInsert = db.prepare(
      `INSERT INTO campaign_social_metrics (
        id, campaign_id, collected_at, media_type, platform, format, demographic_group, hour_slot,
        reach, impressions, engagements, comments, shares, saves, followers_growth,
        spend, clicks, leads, conversions, cpc, cpm, ctr, cpl, cost_per_supporter, cost_per_volunteer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const days = 10;
    const channels = [
      { mediaType: 'ORGANICA', platform: 'Instagram', format: 'Reels', demographic: '18-34' },
      { mediaType: 'ORGANICA', platform: 'TikTok', format: 'Video Curto', demographic: '16-24' },
      { mediaType: 'ORGANICA', platform: 'Facebook', format: 'Carrossel', demographic: '35-54' },
      { mediaType: 'PAGA', platform: 'Instagram', format: 'Reels Ads', demographic: '18-34' },
      { mediaType: 'PAGA', platform: 'Meta Ads', format: 'Lead Form', demographic: '25-44' },
    ];

    for (let day = days; day >= 0; day -= 1) {
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() - day);

      channels.forEach((channel, index) => {
        const impressions = 1800 + day * 110 + index * 260;
        const reach = Math.round(impressions * (0.72 + (index % 2) * 0.06));
        const clicks = Math.round(impressions * (0.015 + index * 0.003));
        const engagements = Math.round(reach * (0.07 + (index % 3) * 0.01));
        const leads = channel.mediaType === 'PAGA' ? Math.max(2, Math.round(clicks * 0.11)) : Math.max(1, Math.round(clicks * 0.04));
        const conversions = channel.mediaType === 'PAGA' ? Math.max(1, Math.round(leads * 0.42)) : Math.max(1, Math.round(leads * 0.27));
        const spend = channel.mediaType === 'PAGA' ? Number((220 + day * 9 + index * 17).toFixed(2)) : 0;
        const cpc = clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0;
        const cpm = impressions > 0 ? Number(((spend / impressions) * 1000).toFixed(2)) : 0;
        const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
        const cpl = leads > 0 ? Number((spend / leads).toFixed(2)) : 0;

        socialInsert.run(
          `soc-${campaign.id}-${day}-${index}`,
          campaign.id,
          dayDate.toISOString(),
          channel.mediaType,
          channel.platform,
          channel.format,
          channel.demographic,
          8 + index * 2,
          reach,
          impressions,
          engagements,
          Math.round(engagements * 0.22),
          Math.round(engagements * 0.17),
          Math.round(engagements * 0.12),
          channel.mediaType === 'ORGANICA' ? Math.max(3, Math.round(engagements * 0.08)) : 0,
          spend,
          clicks,
          leads,
          conversions,
          cpc,
          cpm,
          ctr,
          cpl,
          conversions > 0 ? Number((spend / conversions).toFixed(2)) : 0,
          leads > 0 ? Number((spend / leads).toFixed(2)) : 0,
        );
      });
    }
  }

  const integrationsCount = db
    .prepare('SELECT count(*) as count FROM campaign_integrations WHERE campaign_id = ?')
    .get(campaign.id) as { count: number };
  if (integrationsCount.count === 0) {
    const integrationInsert = db.prepare(
      `INSERT INTO campaign_integrations (
        id, campaign_id, name, provider, category, integration_type, status, owner_role,
        sync_health, records_24h, avg_latency_ms, error_rate, last_sync_at, webhook_url, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const integrations = [
      {
        id: 'int-meta-ads',
        name: 'Meta Ads Manager',
        provider: 'Meta',
        category: 'MIDIA_DIGITAL',
        integrationType: 'API',
        status: 'ATIVA',
        ownerRole: 'CHEFE_REDES',
        syncHealth: 93,
        records24h: 842,
        avgLatencyMs: 410,
        errorRate: 0.8,
        hoursAgo: 1,
        webhookUrl: null,
        metadata: { scopes: ['ads_read', 'pages_read_engagement'], account: 'Ludymilla 2026' },
      },
      {
        id: 'int-google-ads',
        name: 'Google Ads',
        provider: 'Google',
        category: 'MIDIA_DIGITAL',
        integrationType: 'API',
        status: 'ATIVA',
        ownerRole: 'CHEFE_REDES',
        syncHealth: 88,
        records24h: 517,
        avgLatencyMs: 515,
        errorRate: 1.3,
        hoursAgo: 2,
        webhookUrl: null,
        metadata: { conversionAction: 'lead_form_submit' },
      },
      {
        id: 'int-tiktok-ads',
        name: 'TikTok Ads',
        provider: 'TikTok',
        category: 'MIDIA_DIGITAL',
        integrationType: 'API',
        status: 'ATENCAO',
        ownerRole: 'CHEFE_REDES',
        syncHealth: 67,
        records24h: 209,
        avgLatencyMs: 780,
        errorRate: 4.9,
        hoursAgo: 5,
        webhookUrl: null,
        metadata: { alert: 'Token expira em 3 dias' },
      },
      {
        id: 'int-whatsapp-cloud',
        name: 'WhatsApp Cloud API',
        provider: 'Meta',
        category: 'MIDIA_DIGITAL',
        integrationType: 'WEBHOOK',
        status: 'ATIVA',
        ownerRole: 'CHEFE_LEADS',
        syncHealth: 91,
        records24h: 1244,
        avgLatencyMs: 240,
        errorRate: 0.6,
        hoursAgo: 1,
        webhookUrl: 'https://hooks.missao.local/whatsapp',
        metadata: { botFlow: 'captacao-e-reengajamento' },
      },
      {
        id: 'int-n8n',
        name: 'n8n Campaign Automations',
        provider: 'n8n',
        category: 'SISTEMA_EXTERNO',
        integrationType: 'WEBHOOK',
        status: 'ATIVA',
        ownerRole: 'CHEFE_PROGRAMACAO',
        syncHealth: 95,
        records24h: 372,
        avgLatencyMs: 180,
        errorRate: 0.4,
        hoursAgo: 0,
        webhookUrl: 'https://hooks.missao.local/n8n',
        metadata: { flows: ['lead-score-update', 'candidate-agenda-sync'] },
      },
      {
        id: 'int-rd-station',
        name: 'RD Station CRM',
        provider: 'RD Station',
        category: 'CRM_AUTOMACAO',
        integrationType: 'API',
        status: 'ATIVA',
        ownerRole: 'CHEFE_LEADS',
        syncHealth: 84,
        records24h: 436,
        avgLatencyMs: 460,
        errorRate: 1.8,
        hoursAgo: 2,
        webhookUrl: null,
        metadata: { pipeline: 'funil-politico-2026' },
      },
      {
        id: 'int-looker',
        name: 'Looker Studio',
        provider: 'Google',
        category: 'ANALYTICS',
        integrationType: 'NATIVE',
        status: 'ATENCAO',
        ownerRole: 'CHEFE_CAMPANHA',
        syncHealth: 74,
        records24h: 98,
        avgLatencyMs: 680,
        errorRate: 3.1,
        hoursAgo: 9,
        webhookUrl: null,
        metadata: { dashboard: 'executive-campaign-health' },
      },
      {
        id: 'int-planilha-campo',
        name: 'Google Sheets Campo',
        provider: 'Google Sheets',
        category: 'SISTEMA_EXTERNO',
        integrationType: 'MANUAL',
        status: 'DESCONECTADA',
        ownerRole: 'COORDENADOR_TERRITORIAL',
        syncHealth: 22,
        records24h: 0,
        avgLatencyMs: 0,
        errorRate: 0,
        hoursAgo: 48,
        webhookUrl: null,
        metadata: { note: 'Importacao manual pendente' },
      },
    ];
    for (const integration of integrations) {
      const lastSync = new Date();
      lastSync.setHours(lastSync.getHours() - integration.hoursAgo);
      integrationInsert.run(
        `${integration.id}-${campaign.id}`,
        campaign.id,
        integration.name,
        integration.provider,
        integration.category,
        integration.integrationType,
        integration.status,
        integration.ownerRole,
        integration.syncHealth,
        integration.records24h,
        integration.avgLatencyMs,
        integration.errorRate,
        integration.hoursAgo > 24 ? null : lastSync.toISOString(),
        integration.webhookUrl,
        JSON.stringify(integration.metadata),
      );
    }
  }
  const leadsCount = db
    .prepare('SELECT count(*) as count FROM campaign_leads WHERE campaign_id = ?')
    .get(campaign.id) as { count: number };

  if (leadsCount.count === 0) {
    const leadInsert = db.prepare(
      `INSERT INTO campaign_leads (
        id, campaign_id, name, phone, city, state, neighborhood, source, interest, tags,
        status, engagement_level, entered_at, last_status_at, territory_ref
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const statuses = [
      'VISITANTE',
      'INTERESSADO',
      'SIMPATIZANTE',
      'APOIADOR',
      'VOLUNTARIO',
      'ATIVISTA',
      'MULTIPLICADOR',
      'LIDERANCA_LOCAL',
    ];

    const sources = [
      'Instagram organico',
      'Instagram pago',
      'Facebook',
      'TikTok',
      'WhatsApp',
      'Formulario do site',
      'QR Code',
      'Evento presencial',
      'Indicacao',
      'Acao de rua',
      'Cadastro manual',
    ];

    for (let i = 1; i <= 45; i += 1) {
      const status = statuses[(i - 1) % statuses.length];
      const source = sources[(i - 1) % sources.length];
      const entered = new Date();
      entered.setDate(entered.getDate() - (i % 22));

      leadInsert.run(
        `lead-${campaign.id}-${i}`,
        campaign.id,
        `Lead ${i}`,
        `1199${String(100000 + i).slice(0, 6)}`,
        i % 3 === 0 ? 'Sao Paulo' : i % 3 === 1 ? 'Guarulhos' : 'Osasco',
        'SP',
        i % 2 === 0 ? 'Centro' : 'Zona Norte',
        source,
        i % 4 === 0 ? 'voluntariado' : i % 4 === 1 ? 'evento com candidato' : 'conteudo politico',
        JSON.stringify(i % 2 === 0 ? ['juventude', 'digital'] : ['territorio']),
        status,
        Math.max(15, 92 - i),
        entered.toISOString(),
        entered.toISOString(),
        i % 3 === 0 ? 'capital' : 'grande-sp',
      );
    }
  }

  const groupsCount = db
    .prepare('SELECT count(*) as count FROM campaign_whatsapp_groups WHERE campaign_id = ?')
    .get(campaign.id) as { count: number };

  if (groupsCount.count === 0) {
    const groupsInsert = db.prepare(
      `INSERT INTO campaign_whatsapp_groups (
        id, campaign_id, name, admins_json, members_count, activity_score, territory_ref, retention_rate, status, last_activity_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const groups = [
      ['wpp-zona-norte', 'Coordenacao Zona Norte', ['coord.sp@missao.com.br'], 186, 84, 'zona-norte', 78.2, 'ATIVO'],
      ['wpp-jovens', 'Juventude Digital', ['lider.tech@missao.com.br'], 242, 91, 'capital', 73.4, 'ATIVO'],
      ['wpp-capitacao', 'Captacao de Voluntarios', ['rh@campanha.local'], 128, 66, 'metropolitana', 69.1, 'ATENCAO'],
      ['wpp-campo', 'Mobilizacao de Campo', ['campo@campanha.local'], 97, 57, 'interior', 62.5, 'RISCO'],
    ] as Array<[string, string, string[], number, number, string, number, string]>;

    for (const group of groups) {
      groupsInsert.run(
        group[0],
        campaign.id,
        group[1],
        JSON.stringify(group[2]),
        group[3],
        group[4],
        group[5],
        group[6],
        group[7],
        new Date().toISOString(),
      );
    }
  }

  const timelineCount = db
    .prepare('SELECT count(*) as count FROM campaign_timeline_events WHERE campaign_id = ?')
    .get(campaign.id) as { count: number };

  if (timelineCount.count === 0) {
    const timelineInsert = db.prepare(
      `INSERT INTO campaign_timeline_events (
        id, campaign_id, event_type, severity, source_area, title, description, status, event_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const events = [
      ['evt-001', 'ALERTA', 'CRITICO', 'Leads', 'Queda no CPL acima de 18%', 'Canal Instagram pago com aumento de custo nas ultimas 48h.', 'ABERTO', -2],
      ['evt-002', 'ENTREGA', 'INFO', 'Programacao', 'Automacao de roteiros publicada', 'Fluxo de aprovacao de conteudo conectado ao cronograma do candidato.', 'RESOLVIDO', -1],
      ['evt-003', 'MOBILIZACAO', 'ATENCAO', 'Voluntariado', 'Cidade sem coordenacao ativa', 'Necessidade de lider local para cobertura da Zona Leste.', 'ABERTO', 0],
      ['evt-004', 'REDE', 'INFO', 'Redes', 'Post com maior score da semana', 'Reels de agenda bateu benchmark de engajamento do estado.', 'ABERTO', -3],
    ] as Array<[string, string, string, string, string, string, string, number]>;

    for (const event of events) {
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + event[7]);

      timelineInsert.run(
        `${event[0]}-${campaign.id}`,
        campaign.id,
        event[1],
        event[2],
        event[3],
        event[4],
        event[5],
        event[6],
        eventDate.toISOString(),
      );
    }
  }

  const forumCount = db
    .prepare('SELECT count(*) as count FROM campaign_programming_topics WHERE campaign_id = ?')
    .get(campaign.id) as { count: number };

  if (forumCount.count === 0) {
    const forumInsert = db.prepare(
      `INSERT INTO campaign_programming_topics (
        id, campaign_id, title, category, content, author_id, votes, answers_count, is_solved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const topics = [
      ['topic-001', 'Integracao n8n para reengajamento de leads frios', 'automacoes', 'Fluxo com gatilho por inatividade de 7 dias e mensagem segmentada por origem.', 18, 6, 1],
      ['topic-002', 'Estrategia de permissao para chefe de redes em multiplas campanhas', 'permissoes', 'Sugestao de binding por campanha + setor para evitar vazamento de dados.', 14, 5, 1],
      ['topic-003', 'Observabilidade de conversao de criativos pagos', 'analytics', 'Modelo de evento unico para CPC, CPM, CTR e CPL por criativo.', 11, 3, 0],
      ['topic-004', 'Padrao de UI para dashboard executivo mobile', 'ux_ui', 'Cards hierarquicos com alertas e sem ruido de operacao tecnica.', 8, 2, 0],
    ] as Array<[string, string, string, string, number, number, number]>;

    for (const topic of topics) {
      forumInsert.run(
        `${topic[0]}-${campaign.id}`,
        campaign.id,
        topic[1],
        topic[2],
        topic[3],
        actor.id,
        topic[4],
        topic[5],
        topic[6],
      );
    }
  }

  const agendaCount = db
    .prepare('SELECT count(*) as count FROM candidate_agenda WHERE campaign_id = ?')
    .get(campaign.id) as { count: number };

  if (agendaCount.count === 0) {
    const agendaInsert = db.prepare(
      `INSERT INTO candidate_agenda (
        id, campaign_id, title, agenda_type, priority, status, due_at, source_entity, source_id, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const now = new Date();
    const agendaItems = [
      {
        id: 'cand-001',
        title: 'Gravar video para pauta de saude',
        type: 'GRAVACAO',
        priority: 'ALTA',
        status: 'PENDENTE',
        offsetDays: 1,
        notes: 'Roteiro aprovado por Redes e Chefe de Campanha.',
      },
      {
        id: 'cand-002',
        title: 'Aprovar cards da semana eleitoral',
        type: 'APROVACAO',
        priority: 'MEDIA',
        status: 'PENDENTE',
        offsetDays: 2,
        notes: 'Material preparado no fluxo de comunicacao escalonada.',
      },
      {
        id: 'cand-003',
        title: 'Confirmar agenda de evento territorial',
        type: 'EVENTO',
        priority: 'ALTA',
        status: 'PENDENTE',
        offsetDays: 3,
        notes: 'Reuniao com liderancas locais e grupo de campo.',
      },
    ];

    for (const item of agendaItems) {
      const due = new Date(now);
      due.setDate(now.getDate() + item.offsetDays);

      agendaInsert.run(
        `${item.id}-${campaign.id}`,
        campaign.id,
        item.title,
        item.type,
        item.priority,
        item.status,
        due.toISOString(),
        'campaign_tasks',
        null,
        item.notes,
        candidate?.id ?? actor.id,
      );
    }
  }

  const messagesCount = db
    .prepare('SELECT count(*) as count FROM campaign_hierarchical_messages WHERE campaign_id = ?')
    .get(campaign.id) as { count: number };

  if (messagesCount.count === 0) {
    db.prepare(
      `INSERT INTO campaign_hierarchical_messages (
        id, campaign_id, sender_id, sender_role, target_role, recipient_id, urgency, title, message, context_payload
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      `msg-welcome-${campaign.id}`,
      campaign.id,
      actor.id,
      actor.role,
      'CHEFE_REDES',
      null,
      'ALTA',
      'Alinhamento de semana critica',
      'Priorizar criativos com melhor CPL e reforcar rotina de aprovacao com o candidato.',
      JSON.stringify({ area: 'redes', rastreavel: true, criado_por_seed: true }),
    );
  }
}
