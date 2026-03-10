import { Router } from 'express';
import { db } from '../db/index.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { asyncHandler, type AppError } from './middleware/errorHandler.js';

import { COORDENADAS_CIDADES, classificarCidade } from '../lib/mapa-dados.js';
import {
  calcularScoresTerritorial,
  gerarRecomendacaoMensal,
  type CidadeDados,
  type ClassificacaoCidade,
  type ModoEstrategico,
  type ScoresCidade,
} from '../lib/inteligencia-eleitoral.js';

export const apiRouter = Router();

const createAppError = (message: string, statusCode: number, isOperational = true): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = isOperational;
  return error;
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  phone_whatsapp: z.string().min(10),
  state: z.string().min(2).max(2),
});

const createMissionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  type: z.enum(['DIGITAL', 'TERRITORIAL', 'RECRUTAMENTO', 'RECRUITMENT', 'FORMACAO', 'TRAINING']),
  urgency: z.enum(['CONTINUA', 'PRIORITARIA', 'URGENTE', 'ONGOING', 'PRIORITY', 'URGENT']),
  xp_reward: z.number().int().min(10).max(500),
  validation_type: z.string().min(1),
  deadline: z.string().datetime().optional().nullable(),
});

const createCampaignSchema = z.object({
  name: z.string().min(3).max(200),
  candidateName: z.string().min(3).max(200),
  office: z.string().min(2).max(100),
  templateId: z.string().min(1),
  configuration: z.record(z.string(), z.unknown()).default({}),
  sectors: z.array(
    z.object({
      nome: z.string().min(2),
      slug: z.string().min(2),
      icone: z.string().optional().default(''),
      cor: z.string().optional().default('#F5C400'),
      obrigatorio: z.boolean().optional().default(false),
      subsetoresDefault: z.array(z.string()).optional().default([]),
    }),
  ).min(1),
});
const questionarioEleitorSchema = z.object({
  cidade: z.string().min(2),
  estado: z.string().length(2),
  idade: z.number().int().min(16).max(120).optional(),
  sexo: z.enum(['M', 'F', 'NB', 'NI']).optional(),
  escolaridade: z.string().optional(),
  acesso_internet: z.boolean().optional(),
  usa_redes_sociais: z.array(z.string()).optional(),
  joga_videogame: z.boolean().optional(),
  plataformas_jogo: z.array(z.string()).optional(),
  conhece_candidata: z.boolean().optional(),
  simpatia_candidata: z.number().int().min(0).max(5).optional(),
  pretende_votar: z.enum(['SIM', 'NAO', 'TALVEZ', 'NR']).optional(),
  e_lider_comunidade: z.boolean().optional(),
  tipo_comunidade: z.string().optional(),
  preocupacao_principal: z.string().optional(),
  coletor_id: z.string().optional(),
});

const importarEleitoraisSchema = z.object({
  cidades: z.array(z.object({
    cidade: z.string().min(2),
    estado: z.string().length(2),
    codigo_ibge: z.string().optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    votos_2022: z.number().int().min(0).optional(),
    votos_2018: z.number().int().min(0).optional(),
    percentual_2022: z.number().min(0).max(100).optional(),
    total_eleitores: z.number().int().min(0).optional(),
  })).min(1),
});
const campaignTaskStatusSchema = z.enum(['PENDENTE', 'EM_PROGRESSO', 'REVISAO', 'CONCLUIDA']);
const campaignTaskPrioritySchema = z.enum(['BAIXA', 'MEDIA', 'ALTA']);

const createCampaignTaskSchema = z.object({
  title: z.string().min(3).max(140),
  description: z.string().max(2500).optional().nullable(),
  sectorId: z.string().min(1),
  subsectorId: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  status: campaignTaskStatusSchema.optional().default('PENDENTE'),
  priority: campaignTaskPrioritySchema.optional().default('MEDIA'),
  deadline: z.string().datetime().optional().nullable(),
  estimatedHours: z.number().min(0).max(500).optional().nullable(),
  xpReward: z.number().int().min(0).max(1000).optional().default(0),
  createdBy: z.string().optional().nullable(),
});

const updateCampaignTaskSchema = z
  .object({
    title: z.string().min(3).max(140).optional(),
    description: z.string().max(2500).optional().nullable(),
    sectorId: z.string().optional(),
    subsectorId: z.string().optional().nullable(),
    assignedTo: z.string().optional().nullable(),
    status: campaignTaskStatusSchema.optional(),
    priority: campaignTaskPrioritySchema.optional(),
    deadline: z.string().datetime().optional().nullable(),
    estimatedHours: z.number().min(0).max(500).optional().nullable(),
    registeredHours: z.number().min(0).max(2000).optional(),
    xpReward: z.number().int().min(0).max(1000).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'Envie ao menos um campo para atualizar.',
  });
// Mapa InteligÃƒÂªncia
apiRouter.get('/coordenador/mapa', (req, res) => {
  const { estado } = req.query;
  
  const volunteers = db.prepare('SELECT * FROM volunteers WHERE state = ?').all(estado) as any[];
  const submissions = db.prepare(`
    SELECT ms.*, v.city 
    FROM mission_submissions ms
    JOIN volunteers v ON ms.volunteer_id = v.id
    WHERE v.state = ?
  `).all(estado) as any[];

  const citiesMap = new Map<string, any>();

  volunteers.forEach(v => {
    if (!citiesMap.has(v.city)) {
      citiesMap.set(v.city, {
        volunteers: [],
        submissions: []
      });
    }
    citiesMap.get(v.city).volunteers.push(v);
  });

  submissions.forEach(s => {
    if (citiesMap.has(s.city)) {
      citiesMap.get(s.city).submissions.push(s);
    }
  });

  const cidades: any[] = [];
  let totalVoluntariosEstado = 0;
  let totalAtivosEstado = 0;
  let sumHealth = 0;
  let cidadesCriticas = 0;
  let cidadesSemCoordenador = 0;

  citiesMap.forEach((data, cityName) => {
    const coords = COORDENADAS_CIDADES[cityName];
    if (!coords) return;

    const totalVoluntarios = data.volunteers.length;
    const voluntariosAtivos = data.volunteers.filter((v: any) => 
      new Date(v.last_active_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    
    const voluntariosNovos = data.volunteers.filter((v: any) => 
      new Date(v.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    const temCoordenador = data.volunteers.some((v: any) => v.role.includes('COORDENADOR'));
    const nomeCoordenador = data.volunteers.find((v: any) => v.role.includes('COORDENADOR'))?.name || null;
    const lideresEmergentes = data.volunteers.filter((v: any) => v.leadership_score >= 70).length;

    const taxaAtividade = totalVoluntarios > 0 ? (voluntariosAtivos / totalVoluntarios) * 100 : 0;
    
    // Simplified health score for the map
    const healthScore = Math.min(100, Math.round((taxaAtividade * 0.6) + (lideresEmergentes * 10) + (temCoordenador ? 20 : 0)));
    const momentumScore = Math.round((voluntariosNovos / Math.max(1, totalVoluntarios)) * 100);

    const cidadeData = {
      cidade: cityName,
      estado: estado as string,
      cidadeId: (cityName || '').toLowerCase().replace(/\s+/g, '-'),
      lat: coords.lat,
      lng: coords.lng,
      totalVoluntarios,
      voluntariosAtivos,
      voluntariosNovos,
      voluntariosInativos: totalVoluntarios - voluntariosAtivos,
      taxaAtividade,
      missoesCompletadasMes: data.submissions.length,
      missoesAbertas: 5, // Mock
      submissoesPendentes: data.submissions.filter((s: any) => s.validation_status === 'PENDING').length,
      mediaXPSemana: 450, // Mock
      temCoordenador,
      nomeCoordenador,
      lideresEmergentes,
      topVoluntario: data.volunteers.length > 0 ? {
        nome: data.volunteers[0].name,
        xpTotal: data.volunteers[0].xp_total,
        nivelAtual: data.volunteers[0].current_level
      } : null,
      healthScore,
      momentumScore,
      leadershipRatio: totalVoluntarios > 0 ? (lideresEmergentes / totalVoluntarios) * 100 : 0,
      engagementScore: taxaAtividade,
      tendencia: {
        semana1: 10, semana2: 15, semana3: 12, semana4: 20 // Mock
      },
      tendenciaDirecao: momentumScore > 10 ? 'CRESCIMENTO' : momentumScore < -10 ? 'QUEDA' : 'ESTAVEL',
      tendenciaPercentual: momentumScore,
      alertas: [],
      classificacao: classificarCidade({ healthScore, momentumScore, totalVoluntarios, taxaAtividade })
    };

    // Add some alerts
    if (!temCoordenador) {
      cidadeData.alertas.push({
        tipo: 'SEM_COORDENADOR',
        severidade: 'CRITICO',
        mensagem: 'Cidade sem coordenaÃƒÂ§ÃƒÂ£o ativa'
      });
      cidadesSemCoordenador++;
    }
    if (healthScore < 40) {
      cidadesCriticas++;
    }

    cidades.push(cidadeData);
    totalVoluntariosEstado += totalVoluntarios;
    totalAtivosEstado += voluntariosAtivos;
    sumHealth += healthScore;
  });

  res.json({
    estado,
    geradoEm: new Date().toISOString(),
    totalCidades: cidades.length,
    resumoEstado: {
      totalVoluntarios: totalVoluntariosEstado,
      totalAtivos: totalAtivosEstado,
      healthMedio: cidades.length > 0 ? Math.round(sumHealth / cidades.length) : 0,
      cidadesCriticas,
      cidadesSemCoordenador,
      oportunidadesNaoExploradas: 5 // Mock
    },
    cidades
  });
});

// Auth / User endpoints
apiRouter.post('/auth/login', asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Dados invalidos',
      campos: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { email, password } = parsed.data;
  const user = db.prepare('SELECT * FROM volunteers WHERE email = ?').get(email) as Record<string, unknown> | undefined;

  if (!user) {
    throw createAppError('Usuario nao encontrado', 404);
  }

  const userPassword = typeof user.password === 'string' ? user.password : null;
  if (userPassword) {
    const isMatch = await bcrypt.compare(password, userPassword);
    if (!isMatch) {
      throw createAppError('Credenciais invalidas', 401);
    }
  }

  const { password: _password, ...userWithoutPassword } = user;
  res.status(200).json({ user: userWithoutPassword });
}));

apiRouter.post('/auth/register', asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Dados invalidos',
      campos: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { name, email, password, phone_whatsapp, state } = parsed.data;

  if ((phone_whatsapp || '').replace(/\D/g, '').length !== 11) {
    res.status(400).json({ error: 'Digite um WhatsApp valido com DDD' });
    return;
  }

  const existing = db.prepare('SELECT id FROM volunteers WHERE email = ?').get(email);
  if (existing) {
    throw createAppError('Este email ja esta cadastrado. Faca login.', 409);
  }

  const id = Math.random().toString(36).substring(7);
  const hashedPassword = await bcrypt.hash(password, 12);

  db.prepare(`
    INSERT INTO volunteers (id, name, email, password, phone_whatsapp, state)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, email, hashedPassword, phone_whatsapp, state);

  const createdUser = db.prepare('SELECT * FROM volunteers WHERE id = ?').get(id) as Record<string, unknown> | undefined;

  if (!createdUser) {
    throw createAppError('Usuario cadastrado, mas nao encontrado para retorno.', 500, false);
  }

  const { password: _password, ...userWithoutPassword } = createdUser;
  res.status(201).json({ success: true, message: 'Conta criada com sucesso', user: userWithoutPassword });
}));
apiRouter.put('/users/:id/profile', (req, res) => {
  const { id } = req.params;
  const { cep, city, neighborhood, skills, availability, political_experience, lat, lng } = req.body;
  try {
    db.prepare(`
      UPDATE volunteers 
      SET cep = ?, city = ?, neighborhood = ?, skills = ?, availability = ?, political_experience = ?, lat = ?, lng = ?, xp_total = xp_total + 100
      WHERE id = ?
    `).run(cep, city, neighborhood, JSON.stringify(skills), availability, political_experience, lat, lng, id);
    const user = db.prepare('SELECT * FROM volunteers WHERE id = ?').get(id);
    res.json({ user });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update profile' });
  }
});

// Missions
apiRouter.get('/missions', (req, res) => {
  const missions = db.prepare("SELECT * FROM missions WHERE status = 'ACTIVE'").all();
  res.json({ missions });
});

apiRouter.post('/missions/:id/submit', (req, res) => {
  const { id } = req.params;
  const { volunteer_id, evidence_content, evidence_url } = req.body;
  const submissionId = Math.random().toString(36).substring(7);
  
  try {
    db.prepare(`
      INSERT INTO mission_submissions (id, mission_id, volunteer_id, evidence_content, evidence_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(submissionId, id, volunteer_id, evidence_content, evidence_url);
    
    // Auto-approve if automatic validation
    const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(id) as any;
    if (mission.validation_type === 'AUTOMATIC') {
      db.prepare(`
        UPDATE mission_submissions 
        SET validation_status = 'APPROVED', xp_awarded = ? 
        WHERE id = ?
      `).run(mission.xp_reward, submissionId);
      
      db.prepare(`
        UPDATE volunteers 
        SET xp_total = xp_total + ?, missions_completed = missions_completed + 1 
        WHERE id = ?
      `).run(mission.xp_reward, volunteer_id);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to submit mission' });
  }
});

// Map Data
apiRouter.get('/map/volunteers', (req, res) => {
  const volunteers = db.prepare('SELECT id, name, city, state, lat, lng, role, current_level FROM volunteers WHERE lat IS NOT NULL AND lng IS NOT NULL').all();
  res.json({ volunteers });
});

// Dashboard Stats
apiRouter.get('/users/:id/stats', (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT xp_total, current_level, current_streak, missions_completed, volunteers_recruited, city, state FROM volunteers WHERE id = ?').get(id) as any;
  
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Mock rankings
  const cityRank = db.prepare('SELECT count(*) as rank FROM volunteers WHERE city = ? AND xp_total > ?').get(user.city, user.xp_total) as any;
  const stateRank = db.prepare('SELECT count(*) as rank FROM volunteers WHERE state = ? AND xp_total > ?').get(user.state, user.xp_total) as any;
  const nationalRank = db.prepare('SELECT count(*) as rank FROM volunteers WHERE xp_total > ?').get(user.xp_total) as any;

  res.json({
    ...user,
    cityRanking: cityRank.rank + 1,
    stateRanking: stateRank.rank + 1,
    nationalRanking: nationalRank.rank + 1
  });
});

// Badges
apiRouter.get('/badges', (req, res) => {
  const badges = db.prepare('SELECT * FROM badges').all();
  res.json({ badges });
});

apiRouter.get('/users/:id/badges', (req, res) => {
  const { id } = req.params;
  const badges = db.prepare('SELECT badge_id FROM volunteer_badges WHERE volunteer_id = ?').all(id);
  res.json({ badges });
});

// Coordinator
apiRouter.get('/coordenador/dashboard', (req, res) => {
  const { state, city, role } = req.query;
  
  try {
    let baseQuery = 'FROM volunteers WHERE 1=1';
    const params: any[] = [];
    
    if (role === 'COORDENADOR_ESTADUAL' && state) {
      baseQuery += ' AND state = ?';
      params.push(state);
    } else if (role === 'COORDENADOR_MUNICIPAL' && city) {
      baseQuery += ' AND city = ?';
      params.push(city);
    }

    const totalVoluntarios = db.prepare(`SELECT count(*) as count ${baseQuery}`).get(...params) as any;
    const voluntariosAtivos = db.prepare(`SELECT count(*) as count ${baseQuery} AND last_active_at > datetime('now', '-30 days')`).get(...params) as any;
    
    const submissoesPendentes = db.prepare(`
      SELECT count(*) as count 
      FROM mission_submissions ms
      JOIN volunteers v ON ms.volunteer_id = v.id
      WHERE ms.validation_status = 'PENDING'
      ${role === 'COORDENADOR_ESTADUAL' ? 'AND v.state = ?' : role === 'COORDENADOR_MUNICIPAL' ? 'AND v.city = ?' : ''}
    `).get(...(role === 'COORDENADOR_ESTADUAL' ? [state] : role === 'COORDENADOR_MUNICIPAL' ? [city] : [])) as any;

    const lideresEmergentes = db.prepare(`SELECT count(*) as count ${baseQuery} AND leadership_score >= 70`).get(...params) as any;
    
    const missoesMes = db.prepare(`
      SELECT count(*) as count 
      FROM mission_submissions ms
      JOIN volunteers v ON ms.volunteer_id = v.id
      WHERE ms.validation_status = 'APPROVED' 
      AND ms.validated_at > datetime('now', '-30 days')
      ${role === 'COORDENADOR_ESTADUAL' ? 'AND v.state = ?' : role === 'COORDENADOR_MUNICIPAL' ? 'AND v.city = ?' : ''}
    `).get(...(role === 'COORDENADOR_ESTADUAL' ? [state] : role === 'COORDENADOR_MUNICIPAL' ? [city] : [])) as any;

    const crescimentoMes = db.prepare(`SELECT count(*) as count ${baseQuery} AND created_at > datetime('now', '-30 days')`).get(...params) as any;
    const crescimentoMesAnterior = db.prepare(`SELECT count(*) as count ${baseQuery} AND created_at BETWEEN datetime('now', '-60 days') AND datetime('now', '-30 days')`).get(...params) as any;

    const atividadeRecente = db.prepare(`
      SELECT v.name, v.photo_url, ms.submitted_at as timestamp, m.title as action, 'MISSION' as type
      FROM mission_submissions ms
      JOIN volunteers v ON ms.volunteer_id = v.id
      JOIN missions m ON ms.mission_id = m.id
      WHERE 1=1
      ${role === 'COORDENADOR_ESTADUAL' ? 'AND v.state = ?' : role === 'COORDENADOR_MUNICIPAL' ? 'AND v.city = ?' : ''}
      ORDER BY ms.submitted_at DESC LIMIT 15
    `).all(...(role === 'COORDENADOR_ESTADUAL' ? [state] : role === 'COORDENADOR_MUNICIPAL' ? [city] : []));

    const distribuicaoNiveis = db.prepare(`
      SELECT current_level as level, count(*) as count 
      ${baseQuery}
      GROUP BY current_level
    `).all(...params);

    const topPerformers = db.prepare(`
      SELECT id, name, photo_url, xp_total, current_level
      ${baseQuery}
      ORDER BY xp_total DESC LIMIT 5
    `).all(...params);

    res.json({
      totalVoluntarios: totalVoluntarios.count,
      voluntariosAtivos: voluntariosAtivos.count,
      submissoesPendentes: submissoesPendentes.count,
      lideresEmergentes: lideresEmergentes.count,
      taxaEngajamento: totalVoluntarios.count > 0 ? Math.round((missoesMes.count / totalVoluntarios.count) * 100) : 0,
      crescimentoMes: crescimentoMes.count,
      crescimentoMesAnterior: crescimentoMesAnterior.count,
      atividadeRecente,
      distribuicaoNiveis,
      topPerformers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch coordinator dashboard data' });
  }
});

apiRouter.get('/coordenador/voluntarios', (req, res) => {
  const { state, city, role, filter, search, page = 1, limit = 25, sort = 'recent' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  
  try {
    let query = 'FROM volunteers WHERE 1=1';
    const params: any[] = [];
    
    if (role === 'COORDENADOR_ESTADUAL' && state) {
      query += ' AND state = ?';
      params.push(state);
    } else if (role === 'COORDENADOR_MUNICIPAL' && city) {
      query += ' AND city = ?';
      params.push(city);
    }

    if (filter === 'ativos') query += " AND last_active_at > datetime('now', '-30 days')";
    if (filter === 'inativos') query += " AND last_active_at <= datetime('now', '-30 days')";
    if (filter === 'lideres') query += " AND leadership_score >= 70";
    if (filter === 'novos') query += " AND created_at > datetime('now', '-7 days')";

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const total = db.prepare(`SELECT count(*) as count ${query}`).get(...params) as any;
    
    let orderBy = 'created_at DESC';
    if (sort === 'xp') orderBy = 'xp_total DESC';
    if (sort === 'leadership') orderBy = 'leadership_score DESC';
    if (sort === 'missions') orderBy = 'missions_completed DESC';

    const volunteers = db.prepare(`SELECT * ${query} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...params, limit, offset);

    res.json({ 
      volunteers,
      pagination: {
        total: total.count,
        pages: Math.ceil(total.count / Number(limit)),
        currentPage: Number(page)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch volunteers' });
  }
});

apiRouter.get('/coordenador/voluntarios/:id', (req, res) => {
  const { id } = req.params;
  try {
    const volunteer = db.prepare('SELECT * FROM volunteers WHERE id = ?').get(id) as any;
    if (!volunteer) return res.status(404).json({ error: 'Volunteer not found' });

    const history = db.prepare(`
      SELECT ms.*, m.title as mission_title, m.type as mission_type, m.xp_reward
      FROM mission_submissions ms
      JOIN missions m ON ms.mission_id = m.id
      WHERE ms.volunteer_id = ?
      ORDER BY ms.submitted_at DESC
      LIMIT 20
    `).all(id);

    const badges = db.prepare(`
      SELECT b.*, vb.earned_at
      FROM volunteer_badges vb
      JOIN badges b ON vb.badge_id = b.id
      WHERE vb.volunteer_id = ?
    `).all(id);

    res.json({ volunteer, history, badges });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch volunteer profile' });
  }
});

apiRouter.get('/coordenador/territorios', (req, res) => {
  const { state } = req.query;
  try {
    const cities = db.prepare(`
      SELECT 
        city as name, 
        count(*) as volunteers,
        sum(CASE WHEN last_active_at > datetime('now', '-30 days') THEN 1 ELSE 0 END) as active,
        avg(leadership_score) as health,
        sum(CASE WHEN leadership_score >= 70 THEN 1 ELSE 0 END) as leaders,
        (SELECT name FROM volunteers v2 WHERE v2.city = volunteers.city AND v2.role LIKE '%COORDENADOR%' LIMIT 1) as coordinator,
        max(last_active_at) as lastContact
      FROM volunteers
      WHERE state = ?
      GROUP BY city
    `).all(state);
    res.json(cities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch territory data' });
  }
});

apiRouter.patch('/coordenador/voluntarios/:id', (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  try {
    db.prepare('UPDATE volunteers SET role = ? WHERE id = ?').run(role, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update volunteer role' });
  }
});

apiRouter.post('/coordenador/atribuir-missao', (req, res) => {
  const { volunteerIds, missionId } = req.body;
  try {
    const insert = db.prepare(`
      INSERT INTO mission_submissions (id, mission_id, volunteer_id, validation_status)
      VALUES (?, ?, ?, 'PENDING')
    `);

    const transaction = db.transaction((ids, mId) => {
      for (const vId of ids) {
        insert.run(Math.random().toString(36).substring(7), mId, vId);
      }
    });

    transaction(volunteerIds, missionId);
    res.json({ success: true, count: volunteerIds.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign missions' });
  }
});

apiRouter.get('/coordenador/campanhas', asyncHandler(async (_req, res) => {
  const campaigns = db.prepare(`
    SELECT
      c.*,
      COUNT(DISTINCT s.id) as setores_total,
      COUNT(DISTINCT sm.id) as membros_total,
      COUNT(DISTINCT ct.id) as tarefas_total,
      COUNT(DISTINCT CASE WHEN ct.status = 'CONCLUIDA' THEN ct.id END) as tarefas_concluidas
    FROM campaigns c
    LEFT JOIN campaign_sectors s ON s.campaign_id = c.id
    LEFT JOIN sector_members sm ON sm.campaign_id = c.id
    LEFT JOIN campaign_tasks ct ON ct.campaign_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all();

  res.status(200).json(campaigns);
}));

apiRouter.get('/coordinator/submissions', (req, res) => {
  const { state } = req.query;
  try {
    const submissions = db.prepare(`
      SELECT ms.*, v.name as volunteer_name, v.photo_url as volunteer_photo, m.title as mission_title, m.xp_reward
      FROM mission_submissions ms
      JOIN volunteers v ON ms.volunteer_id = v.id
      JOIN missions m ON ms.mission_id = m.id
      WHERE ms.validation_status = 'PENDING'
      ${state ? 'AND v.state = ?' : ''}
      ORDER BY ms.submitted_at DESC
    `).all(state ? [state] : []);
    res.json({ submissions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

apiRouter.post('/missions', (req, res) => {
  const parsed = createMissionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Dados invalidos',
      campos: parsed.error.flatten().fieldErrors,
    });
  }

  const { title, description, type, urgency, xp_reward, validation_type, deadline } = parsed.data;
  const id = Math.random().toString(36).substring(7);

  try {
    db.prepare(`
      INSERT INTO missions (id, title, description, type, urgency, xp_reward, validation_type, deadline, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `).run(id, title, description, type, urgency, xp_reward, validation_type, deadline ?? null);

    return res.status(201).json({ success: true, missionId: id });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: 'Failed to create mission' });
  }
});

// Existing Coordinator endpoints

apiRouter.post('/submissions/:id/validate', (req, res) => {
  const { id } = req.params;
  const { status, validator_id, note } = req.body;
  
  try {
    const submission = db.prepare('SELECT * FROM mission_submissions WHERE id = ?').get(id) as any;
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    
    const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(submission.mission_id) as any;

    db.prepare(`
      UPDATE mission_submissions 
      SET validation_status = ?, validator_id = ?, validator_note = ?, validated_at = CURRENT_TIMESTAMP, xp_awarded = ?
      WHERE id = ?
    `).run(status, validator_id, note, status === 'APPROVED' ? mission.xp_reward : 0, id);
    
    if (status === 'APPROVED') {
      db.prepare(`
        UPDATE volunteers 
        SET xp_total = xp_total + ?, missions_completed = missions_completed + 1 
        WHERE id = ?
      `).run(mission.xp_reward, submission.volunteer_id);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to validate submission' });
  }
});

// Seed Helpers
async function seedAdmins() {
  const admins = [
    { nome: "Admin MissÃƒÂ£o", email: "admin@missao.com.br", senha: "Missao@2025", papel: "ADMIN", cidade: "BrasÃƒÂ­lia", estado: "DF", xp: 25000, nivel: 7, missoes: 180, streak: 45, score: 98 },
    { nome: "Ricardo Alves", email: "chefe@missao.com.br", senha: "Campanha@2025", papel: "COORDENADOR_ESTADUAL", cidade: "SÃƒÂ£o Paulo", estado: "SP", xp: 12000, nivel: 6, missoes: 95, streak: 30, score: 91 },
    { nome: "Fernanda Costa", email: "coord.sp@missao.com.br", senha: "CoordSP@2025", papel: "COORDENADOR_ESTADUAL", cidade: "Campinas", estado: "SP", xp: 6500, nivel: 6, missoes: 58, streak: 22, score: 84 },
    { nome: "Marcos Oliveira", email: "coord.rj@missao.com.br", senha: "CoordRJ@2025", papel: "COORDENADOR_ESTADUAL", cidade: "Rio de Janeiro", estado: "RJ", xp: 5200, nivel: 5, missoes: 47, streak: 18, score: 79 },
    { nome: "Juliana Santos", email: "coord.mun@missao.com.br", senha: "CoordMun@2025", papel: "COORDENADOR_MUNICIPAL", cidade: "Santo AndrÃƒÂ©", estado: "SP", xp: 3100, nivel: 4, missoes: 31, streak: 14, score: 71 },
    { nome: "VoluntÃƒÂ¡rio Teste", email: "voluntario@missao.com.br", senha: "Voluntario@2025", papel: "VOLUNTARIO", cidade: "SÃƒÂ£o Paulo", estado: "SP", xp: 450, nivel: 2, missoes: 5, streak: 3, score: 65 }
  ];

  for (const admin of admins) {
    const existing = db.prepare('SELECT id FROM volunteers WHERE email = ?').get(admin.email);
    if (!existing) {
      const id = Math.random().toString(36).substring(7);
      const hashedPassword = await bcrypt.hash(admin.senha, 12);
      db.prepare(`
        INSERT INTO volunteers (id, name, email, password, role, city, state, xp_total, current_level, missions_completed, current_streak, leadership_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, admin.nome, admin.email, hashedPassword, admin.papel, admin.cidade, admin.estado, admin.xp, admin.nivel, admin.missoes, admin.streak, admin.score);
    }
  }
  return admins.length;
}

async function seedVoluntarios() {
  const nomes = [
    "Ana Silva", "Carlos Souza", "Mariana Lima", "JoÃƒÂ£o Pereira",
    "Patricia Costa", "Roberto Santos", "Fernanda Oliveira", "Lucas Ferreira",
    "Gabriela Alves", "Thiago Rodrigues", "Camila Nascimento", "Bruno Carvalho",
    "LetÃƒÂ­cia Ribeiro", "Diego Martins", "Juliana AraÃƒÂºjo", "Felipe Gomes",
    "Isabela Moreira", "Gustavo Barbosa", "Larissa Pinto", "Henrique Correia",
    "Amanda Lopes", "VinÃƒÂ­cius Mendes", "Natalia Freitas", "Rafael Castro",
    "Beatriz Nunes", "Leonardo Cavalcanti", "Priscila Ramos", "Eduardo Cardoso",
    "Aline Teixeira", "Rodrigo Cunha", "Monique Azevedo", "Danilo Moraes",
    "Renata Campos", "FÃƒÂ¡bio Rocha", "Simone Medeiros", "AndrÃƒÂ© Vieira",
    "Tatiane Melo", "Marcelo Sousa", "Denise Paiva", "Leandro Farias"
  ];

  const estadosCidades: Record<string, string[]> = {
    SP: ["SÃƒÂ£o Paulo", "Campinas", "Santo AndrÃƒÂ©", "Sorocaba", "RibeirÃƒÂ£o Preto", "Santos"],
    RJ: ["Rio de Janeiro", "NiterÃƒÂ³i", "Nova IguaÃƒÂ§u", "Duque de Caxias", "PetrÃƒÂ³polis"],
    MG: ["Belo Horizonte", "UberlÃƒÂ¢ndia", "Contagem", "Juiz de Fora"],
    RS: ["Porto Alegre", "Caxias do Sul", "Pelotas", "Canoas"],
    BA: ["Salvador", "Feira de Santana", "VitÃƒÂ³ria da Conquista"],
    PE: ["Recife", "Caruaru", "Petrolina"],
    CE: ["Fortaleza", "Caucaia", "Juazeiro do Norte"],
    GO: ["GoiÃƒÂ¢nia", "Aparecida de GoiÃƒÂ¢nia", "AnÃƒÂ¡polis"],
    PR: ["Curitiba", "Londrina"],
    SC: ["FlorianÃƒÂ³polis", "Joinville"]
  };

  const distribution = [
    { uf: 'SP', count: 8 }, { uf: 'RJ', count: 6 }, { uf: 'MG', count: 5 },
    { uf: 'RS', count: 4 }, { uf: 'BA', count: 4 }, { uf: 'PE', count: 3 },
    { uf: 'CE', count: 3 }, { uf: 'GO', count: 3 }, { uf: 'PR', count: 2 },
    { uf: 'SC', count: 2 }
  ];

  let nomeIdx = 0;
  const hashedPassword = await bcrypt.hash("Teste@123", 12);
  let totalCreated = 0;

  for (const dist of distribution) {
    for (let i = 0; i < dist.count; i++) {
      const nome = nomes[nomeIdx++];
      const email = (nome || '').toLowerCase().replace(/\s/g, '.') + "@teste.com";
      
      const existing = db.prepare('SELECT id FROM volunteers WHERE email = ?').get(email);
      if (existing) continue;

      const cidade = estadosCidades[dist.uf][Math.floor(Math.random() * estadosCidades[dist.uf].length)];
      const level = Math.floor(Math.random() * 5) + 1;
      
      let xp = 0;
      if (level === 1) xp = Math.floor(Math.random() * 150) + 50;
      else if (level === 2) xp = Math.floor(Math.random() * 300) + 300;
      else if (level === 3) xp = Math.floor(Math.random() * 700) + 700;
      else if (level === 4) xp = Math.floor(Math.random() * 1300) + 1600;
      else if (level === 5) xp = Math.floor(Math.random() * 2800) + 3100;

      const id = Math.random().toString(36).substring(7);
      db.prepare(`
        INSERT INTO volunteers (id, name, email, password, role, city, state, xp_total, current_level, missions_completed, current_streak, volunteers_recruited, leadership_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, nome, email, hashedPassword, "VOLUNTARIO", cidade, dist.uf, xp, level, Math.floor(xp / 60), Math.floor(Math.random() * 45), Math.floor(Math.random() * 15), Math.floor(Math.random() * 100));
      totalCreated++;
    }
  }
  return totalCreated;
}

function seedMissoes() {
  const missoes = [
    // URGENTES
    { titulo: "Compartilhe o manifesto Ã¢â‚¬â€ ÃƒÂºltimas 48h", tipo: "DIGITAL", urgencia: "URGENTE", xp: 40, desc: "Compartilhe o manifesto do movimento nas suas redes sociais usando a hashtag #MissaoMudaBrasil. Esta aÃƒÂ§ÃƒÂ£o ÃƒÂ© fundamental para amplificar nossa mensagem nacional neste momento crÃƒÂ­tico.", ev: "LINK", val: "AUTOMATICO", prazo: 2 },
    { titulo: "Panfletagem urgente Ã¢â‚¬â€ Centro de SÃƒÂ£o Paulo", tipo: "TERRITORIAL", urgencia: "URGENTE", xp: 80, desc: "Precisamos de voluntÃƒÂ¡rios para distribuir material no centro de SP antes do evento de sÃƒÂ¡bado. AÃƒÂ§ÃƒÂ£o coordenada com outros 30 voluntÃƒÂ¡rios na regiÃƒÂ£o.", ev: "FOTO", val: "MANUAL", estado: "SP", cidade: "SÃƒÂ£o Paulo", prazo: 3 },
    { titulo: "Grave seu depoimento de apoio ao movimento", tipo: "DIGITAL", urgencia: "URGENTE", xp: 100, desc: "Grave um vÃƒÂ­deo de 30 a 60 segundos explicando por que vocÃƒÂª apoia a MissÃƒÂ£o. Seja autÃƒÂªntico. Estes vÃƒÂ­deos serÃƒÂ£o usados na nossa campanha digital desta semana.", ev: "LINK", val: "MANUAL", prazo: 4 },
    { titulo: "Recrute 2 amigos para o movimento hoje", tipo: "RECRUTAMENTO", urgencia: "URGENTE", xp: 120, desc: "Hoje ÃƒÂ© o dia de trazer reforÃƒÂ§os. Convide pelo menos 2 pessoas do seu cÃƒÂ­rculo que acreditam na mudanÃƒÂ§a que o Brasil precisa. Compartilhe o link de cadastro com elas.", ev: "TEXTO", val: "MANUAL", prazo: 1 },
    { titulo: "ComentÃƒÂ¡rio estratÃƒÂ©gico Ã¢â‚¬â€ debate de hoje", tipo: "DIGITAL", urgencia: "URGENTE", xp: 30, desc: "Participe ativamente nos comentÃƒÂ¡rios das transmissÃƒÂµes do debate polÃƒÂ­tico de hoje nas redes sociais. Represente o movimento com argumentos sÃƒÂ³lidos e linguagem respeitosa.", ev: "LINK", val: "AUTOMATICO", prazo: 0.3 },
    
    // PRIORITÃƒÂRIAS
    { titulo: "Evento de apresentaÃƒÂ§ÃƒÂ£o do movimento Ã¢â‚¬â€ BH", tipo: "TERRITORIAL", urgencia: "PRIORITARIA", xp: 90, desc: "Participe do evento de lanÃƒÂ§amento regional em Belo Horizonte. HaverÃƒÂ¡ palestra, coffee break e rodada de recrutamento. Confirme presenÃƒÂ§a atÃƒÂ© sexta-feira.", ev: "FOTO", val: "MANUAL", estado: "MG", cidade: "Belo Horizonte", prazo: 10 },
    { titulo: "SÃƒÂ©rie de stories Ã¢â‚¬â€ proposta de educaÃƒÂ§ÃƒÂ£o", tipo: "DIGITAL", urgencia: "PRIORITARIA", xp: 60, desc: "Crie uma sÃƒÂ©rie de 5 stories no Instagram explicando a proposta de educaÃƒÂ§ÃƒÂ£o do movimento. Use os templates disponÃƒÂ­veis na nossa base de materiais. Marque @missaobrasil.", ev: "LINK", val: "MANUAL", prazo: 7 },
    { titulo: "Mapeamento de lideranÃƒÂ§as locais Ã¢â‚¬â€ Nordeste", tipo: "TERRITORIAL", urgencia: "PRIORITARIA", xp: 70, desc: "Identifique e cadastre pelo menos 3 lideranÃƒÂ§as comunitÃƒÂ¡rias da sua cidade no Nordeste que possam se tornar coordenadores locais. Preencha o formulÃƒÂ¡rio de indicaÃƒÂ§ÃƒÂ£o.", ev: "TEXTO", val: "MANUAL", prazo: 14 },
    { titulo: "Complete o mÃƒÂ³dulo de formaÃƒÂ§ÃƒÂ£o polÃƒÂ­tica", tipo: "FORMACAO", urgencia: "PRIORITARIA", xp: 80, desc: "Assista ÃƒÂ s 4 aulas do mÃƒÂ³dulo de FormaÃƒÂ§ÃƒÂ£o PolÃƒÂ­tica BÃƒÂ¡sica disponÃƒÂ­veis na nossa plataforma. Em seguida responda o quiz de validaÃƒÂ§ÃƒÂ£o com aproveitamento mÃƒÂ­nimo de 70%.", ev: "NENHUM", val: "AUTOMATICO", prazo: 21 },
    { titulo: "Organize uma reuniÃƒÂ£o de nÃƒÂºcleo no seu bairro", tipo: "TERRITORIAL", urgencia: "PRIORITARIA", xp: 150, desc: "ReÃƒÂºna pelo menos 5 apoiadores do movimento na sua regiÃƒÂ£o para uma conversa de alinhamento e planejamento local. Pode ser presencial ou online. Registre os participantes.", ev: "FOTO", val: "MANUAL", prazo: 30 },
    { titulo: "Reels de impacto Ã¢â‚¬â€ saÃƒÂºde pÃƒÂºblica", tipo: "DIGITAL", urgencia: "PRIORITARIA", xp: 90, desc: "Produza um Reels mostrando um problema de saÃƒÂºde pÃƒÂºblica da sua cidade e como a proposta do movimento aborda este problema. MÃƒÂ¡ximo 60 segundos, legenda com hashtags.", ev: "LINK", val: "MANUAL", prazo: 12 },
    { titulo: "Confirme participaÃƒÂ§ÃƒÂ£o no mutirÃƒÂ£o de SP", tipo: "TERRITORIAL", urgencia: "PRIORITARIA", xp: 50, desc: "O grande mutirÃƒÂ£o de voluntÃƒÂ¡rios de SÃƒÂ£o Paulo acontece no prÃƒÂ³ximo mÃƒÂªs. Confirme sua participaÃƒÂ§ÃƒÂ£o e ajude a divulgar entre os voluntÃƒÂ¡rios da sua cidade.", ev: "TEXTO", val: "AUTOMATICO", estado: "SP", prazo: 25 },
    { titulo: "Pesquisa de campo Ã¢â‚¬â€ percepÃƒÂ§ÃƒÂ£o eleitoral", tipo: "TERRITORIAL", urgencia: "PRIORITARIA", xp: 65, desc: "Realize 10 conversas curtas com eleitores do seu bairro e registre as principais preocupaÃƒÂ§ÃƒÂµes citadas. Use o formulÃƒÂ¡rio padrÃƒÂ£o de pesquisa disponÃƒÂ­vel na plataforma.", ev: "TEXTO", val: "MANUAL", prazo: 20 },

    // CONTÃƒÂNUAS
    { titulo: "Recrute um novo voluntÃƒÂ¡rio para o movimento", tipo: "RECRUTAMENTO", urgencia: "CONTINUA", xp: 60, desc: "Convide uma pessoa do seu cÃƒÂ­rculo pessoal ou profissional que compartilhe dos valores do movimento. Compartilhe o link de cadastro e acompanhe o processo de entrada dela.", ev: "TEXTO", val: "MANUAL", prazo: null },
    { titulo: "Compartilhe 3 publicaÃƒÂ§ÃƒÂµes esta semana", tipo: "DIGITAL", urgencia: "CONTINUA", xp: 20, desc: "Escolha 3 publicaÃƒÂ§ÃƒÂµes do perfil oficial do movimento e compartilhe nas suas redes pessoais com um comentÃƒÂ¡rio seu sobre o tema. Engajamento genuÃƒÂ­no vale mais que alcance.", ev: "LINK", val: "AUTOMATICO", prazo: null },
    { titulo: "Complete seu perfil na plataforma", tipo: "FORMACAO", urgencia: "CONTINUA", xp: 100, desc: "Preencha todas as informaÃƒÂ§ÃƒÂµes do seu perfil na plataforma: foto, habilidades, disponibilidade e cidade. Um perfil completo nos ajuda a distribuir as missÃƒÂµes certas para vocÃƒÂª.", ev: "NENHUM", val: "AUTOMATICO", prazo: null },
    { titulo: "Apresente o movimento em conversa pessoal", tipo: "RECRUTAMENTO", urgencia: "CONTINUA", xp: 45, desc: "Tenha uma conversa genuÃƒÂ­na com alguÃƒÂ©m que ainda nÃƒÂ£o conhece o movimento. NÃƒÂ£o precisa convencer Ã¢â‚¬â€ apenas apresentar as propostas e ouvir o que a pessoa pensa.", ev: "TEXTO", val: "MANUAL", prazo: null },
    { titulo: "MÃƒÂ³dulo: ComunicaÃƒÂ§ÃƒÂ£o PolÃƒÂ­tica Eficaz", tipo: "FORMACAO", urgencia: "CONTINUA", xp: 70, desc: "Assista ao mÃƒÂ³dulo de ComunicaÃƒÂ§ÃƒÂ£o PolÃƒÂ­tica Eficaz e aprenda tÃƒÂ©cnicas de argumentaÃƒÂ§ÃƒÂ£o, escuta ativa e diÃƒÂ¡logo com diferentes perfis de eleitores. Essencial para todo voluntÃƒÂ¡rio.", ev: "NENHUM", val: "AUTOMATICO", prazo: null },
    { titulo: "Foto do seu ponto de campanha local", tipo: "TERRITORIAL", urgencia: "CONTINUA", xp: 35, desc: "Registre com foto um local pÃƒÂºblico da sua cidade onde o movimento tem presenÃƒÂ§a: faixa, adesivo, material, ou qualquer manifestaÃƒÂ§ÃƒÂ£o visÃƒÂ­vel de apoio ao movimento.", ev: "FOTO", val: "MANUAL", prazo: null },
    { titulo: "Avalie e melhore sua cidade no mapa", tipo: "TERRITORIAL", urgencia: "CONTINUA", xp: 25, desc: "Acesse o mapa do movimento, identifique a situaÃƒÂ§ÃƒÂ£o da sua cidade e sugira pelo menos uma aÃƒÂ§ÃƒÂ£o concreta para fortalecer a presenÃƒÂ§a do movimento no seu municÃƒÂ­pio.", ev: "TEXTO", val: "MANUAL", prazo: null }
  ];

  let totalCreated = 0;
  for (const m of missoes) {
    const existing = db.prepare('SELECT id FROM missions WHERE title = ?').get(m.titulo);
    if (existing) continue;

    const id = Math.random().toString(36).substring(7);
    db.prepare(`
      INSERT INTO missions (id, title, description, type, urgency, xp_reward, evidence_type, validation_type, target_state, target_city)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, m.titulo, m.desc, m.tipo, m.urgencia, m.xp, m.ev, m.val, m.estado || null, m.cidade || null);
    totalCreated++;
  }
  return totalCreated;
}

// Training / FormaÃƒÂ§ÃƒÂ£o endpoints
apiRouter.get('/formacao/trilhas', (req, res) => {
  const volunteerId = req.query.volunteerId as string;
  if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });

  const tracks = db.prepare('SELECT * FROM training_tracks WHERE is_active = 1 ORDER BY display_order ASC').all() as any[];
  const progress = db.prepare('SELECT * FROM track_progress WHERE volunteer_id = ?').all(volunteerId) as any[];
  const moduleProgress = db.prepare('SELECT * FROM module_progress WHERE volunteer_id = ?').all(volunteerId) as any[];
  const certificates = db.prepare('SELECT * FROM certificates WHERE volunteer_id = ?').all(volunteerId) as any[];

  const tracksWithProgress = tracks.map(track => {
    const trackProg = progress.find(p => p.track_id === track.id);
    const trackModules = db.prepare('SELECT id FROM training_modules WHERE track_id = ?').all(track.id) as any[];
    const completedModulesCount = moduleProgress.filter(mp => trackModules.some(tm => tm.id === mp.module_id) && mp.is_completed).length;
    
    // Find next available module
    const allModules = db.prepare('SELECT * FROM training_modules WHERE track_id = ? ORDER BY display_order ASC').all(track.id) as any[];
    const nextModule = allModules.find(m => !moduleProgress.some(mp => mp.module_id === m.id && mp.is_completed));

    return {
      ...track,
      percentage: trackProg?.percentage || 0,
      is_completed: trackProg?.is_completed || 0,
      completed_modules: completedModulesCount,
      total_modules: trackModules.length,
      next_module_id: nextModule?.id || null,
      has_certificate: certificates.some(c => c.track_id === track.id)
    };
  });

  res.json(tracksWithProgress);
});

apiRouter.get('/formacao/trilhas/:id', (req, res) => {
  const { id } = req.params;
  const volunteerId = req.query.volunteerId as string;

  const track = db.prepare('SELECT * FROM training_tracks WHERE id = ? OR slug = ?').get(id, id) as any;
  if (!track) return res.status(404).json({ error: 'Trilha nÃƒÂ£o encontrada' });

  const modules = db.prepare('SELECT * FROM training_modules WHERE track_id = ? ORDER BY display_order ASC').all(track.id) as any[];
  const progress = db.prepare('SELECT * FROM track_progress WHERE volunteer_id = ? AND track_id = ?').get(volunteerId, track.id) as any;
  const moduleProgress = db.prepare('SELECT * FROM module_progress WHERE volunteer_id = ?').all(volunteerId) as any[];

  const modulesWithProgress = modules.map(m => {
    const mProg = moduleProgress.find(mp => mp.module_id === m.id);
    return {
      ...m,
      is_completed: mProg?.is_completed || 0,
      quiz_score: mProg?.quiz_score || null,
      completed_at: mProg?.completed_at || null
    };
  });

  res.json({
    ...track,
    percentage: progress?.percentage || 0,
    is_completed: progress?.is_completed || 0,
    modules: modulesWithProgress
  });
});

apiRouter.get('/formacao/modulos/:id', (req, res) => {
  const { id } = req.params;
  const module = db.prepare('SELECT * FROM training_modules WHERE id = ?').get(id) as any;
  if (!module) return res.status(404).json({ error: 'MÃƒÂ³dulo nÃƒÂ£o encontrado' });
  
  // Parse content if it's a string
  if (typeof module.content === 'string') {
    module.content = JSON.parse(module.content);
  }

  res.json(module);
});

apiRouter.post('/formacao/progresso', (req, res) => {
  const { volunteerId, moduleId, quizScore, timeSpentMin } = req.body;
  
  const module = db.prepare('SELECT * FROM training_modules WHERE id = ?').get(moduleId) as any;
  if (!module) return res.status(404).json({ error: 'MÃƒÂ³dulo nÃƒÂ£o encontrado' });

  // Update module progress
  const existingProg = db.prepare('SELECT * FROM module_progress WHERE volunteer_id = ? AND module_id = ?').get(volunteerId, moduleId) as any;
  
  if (existingProg) {
    db.prepare(`
      UPDATE module_progress 
      SET is_completed = 1, quiz_score = ?, time_spent_min = time_spent_min + ?, attempts = attempts + 1, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(quizScore || null, timeSpentMin || 0, existingProg.id);
  } else {
    db.prepare(`
      INSERT INTO module_progress (id, volunteer_id, module_id, is_completed, quiz_score, time_spent_min, attempts, completed_at)
      VALUES (?, ?, ?, 1, ?, ?, 1, CURRENT_TIMESTAMP)
    `).run(Math.random().toString(36).substring(2, 15), volunteerId, moduleId, quizScore || null, timeSpentMin || 0);
  }

  // Award XP
  db.prepare('UPDATE volunteers SET xp_total = xp_total + ? WHERE id = ?').run(module.xp_reward, volunteerId);
  
  // Update track progress
  const trackModules = db.prepare('SELECT id FROM training_modules WHERE track_id = ?').all(module.track_id) as any[];
  const completedModules = db.prepare(`
    SELECT COUNT(*) as count FROM module_progress 
    WHERE volunteer_id = ? AND is_completed = 1 AND module_id IN (${trackModules.map(() => '?').join(',')})
  `).get(volunteerId, ...trackModules.map(m => m.id)) as any;

  const percentage = (completedModules.count / trackModules.length) * 100;
  const isCompleted = completedModules.count === trackModules.length;

  const existingTrackProg = db.prepare('SELECT * FROM track_progress WHERE volunteer_id = ? AND track_id = ?').get(volunteerId, module.track_id) as any;
  
  if (existingTrackProg) {
    db.prepare(`
      UPDATE track_progress 
      SET percentage = ?, is_completed = ?, completed_at = ?
      WHERE id = ?
    `).run(percentage, isCompleted ? 1 : 0, isCompleted ? new Date().toISOString() : null, existingTrackProg.id);
  } else {
    db.prepare(`
      INSERT INTO track_progress (id, volunteer_id, track_id, percentage, is_completed, completed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(Math.random().toString(36).substring(2, 15), volunteerId, module.track_id, percentage, isCompleted ? 1 : 0, isCompleted ? new Date().toISOString() : null);
  }

  // Issue certificate if completed
  let certificateId = null;
  if (isCompleted) {
    const existingCert = db.prepare('SELECT id FROM certificates WHERE volunteer_id = ? AND track_id = ?').get(volunteerId, module.track_id);
    if (!existingCert) {
      certificateId = Math.random().toString(36).substring(2, 15);
      const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      db.prepare(`
        INSERT INTO certificates (id, volunteer_id, track_id, verification_code)
        VALUES (?, ?, ?, ?)
      `).run(certificateId, volunteerId, module.track_id, verificationCode);
    }
  }

  const updatedUser = db.prepare('SELECT xp_total, current_level FROM volunteers WHERE id = ?').get(volunteerId) as any;

  res.json({
    success: true,
    xpGanho: module.xp_reward,
    novoXpTotal: updatedUser.xp_total,
    trilhaConcluida: isCompleted,
    certificateId
  });
});

// --- Multi-Candidate Organizational System API ---

import { processarFluxo } from '../lib/coesao-sistema.js';

// Templates & Profiles
apiRouter.get('/organizacional/templates', (req, res) => {
  const templates = db.prepare('SELECT * FROM campaign_templates').all();
  res.json(templates.map((t: any) => ({ ...t, sectors_template: JSON.parse(t.sectors_template) })));
});

apiRouter.get('/organizacional/perfis', (req, res) => {
  const profiles = db.prepare('SELECT * FROM role_profiles WHERE is_active = 1').all();
  res.json(profiles.map((p: any) => ({
    ...p,
    technical_competencies: JSON.parse(p.technical_competencies),
    behavioral_competencies: JSON.parse(p.behavioral_competencies),
    platform_skills: JSON.parse(p.platform_skills)
  })));
});

// Campaign Wizard & Management
apiRouter.post('/campanha/criar', asyncHandler(async (req, res) => {
  const parsed = createCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Dados invalidos',
      campos: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { name, candidateName, office, templateId, configuration, sectors } = parsed.data;
  const campaignId = Math.random().toString(36).substring(7);

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO campaigns (id, name, candidate_name, office, template_id, configuration)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(campaignId, name, candidateName, office, templateId, JSON.stringify(configuration));

    for (const sector of sectors) {
      const sectorId = Math.random().toString(36).substring(7);
      db.prepare(`
        INSERT INTO campaign_sectors (id, campaign_id, name, slug, icon, color, is_mandatory)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(sectorId, campaignId, sector.nome, sector.slug, sector.icone, sector.cor, sector.obrigatorio ? 1 : 0);

      for (const sub of sector.subsetoresDefault) {
        db.prepare(`
          INSERT INTO campaign_subsectors (id, sector_id, name, slug)
          VALUES (?, ?, ?, ?)
        `).run(Math.random().toString(36).substring(7), sectorId, sub, (sub || '').toLowerCase().replace(/\s+/g, '-'));
      }
    }
  });

  transaction();
  res.status(201).json({ success: true, campaignId });
}));

apiRouter.get('/campanha/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!campaign) {
    throw createAppError('Campanha nao encontrada', 404);
  }

  const sectors = db.prepare(`
    SELECT
      s.*,
      COUNT(DISTINCT sm.id) as members_count,
      COUNT(DISTINCT ct.id) as tasks_total,
      COUNT(DISTINCT CASE WHEN ct.status = 'CONCLUIDA' THEN ct.id END) as tasks_done
    FROM campaign_sectors s
    LEFT JOIN sector_members sm ON sm.sector_id = s.id
    LEFT JOIN campaign_tasks ct ON ct.sector_id = s.id
    WHERE s.campaign_id = ?
    GROUP BY s.id
    ORDER BY s.name ASC
  `).all(id) as Array<Record<string, unknown>>;

  const sectorsWithSub = sectors.map((sector) => {
    const subsectors = db.prepare('SELECT * FROM campaign_subsectors WHERE sector_id = ? ORDER BY name ASC').all(sector.id);
    return {
      ...sector,
      subsectors,
      subsetores: subsectors,
    };
  });

  const tasks = db.prepare(`
    SELECT
      ct.*,
      s.name as sector_name,
      s.slug as sector_slug,
      s.color as sector_color,
      ss.name as subsector_name,
      v.name as assigned_to_name,
      v.email as assigned_to_email
    FROM campaign_tasks ct
    JOIN campaign_sectors s ON s.id = ct.sector_id
    LEFT JOIN campaign_subsectors ss ON ss.id = ct.subsector_id
    LEFT JOIN volunteers v ON v.id = ct.assigned_to
    WHERE ct.campaign_id = ?
    ORDER BY
      CASE ct.status
        WHEN 'PENDENTE' THEN 1
        WHEN 'EM_PROGRESSO' THEN 2
        WHEN 'REVISAO' THEN 3
        WHEN 'CONCLUIDA' THEN 4
        ELSE 5
      END,
      CASE WHEN ct.deadline IS NULL THEN 1 ELSE 0 END,
      ct.deadline ASC,
      ct.created_at DESC
  `).all(id);

  const members = db.prepare(`
    SELECT
      sm.id as member_id,
      sm.volunteer_id,
      sm.sector_id,
      sm.role,
      sm.performance_score,
      v.name,
      v.email,
      s.name as sector_name
    FROM sector_members sm
    JOIN volunteers v ON v.id = sm.volunteer_id
    JOIN campaign_sectors s ON s.id = sm.sector_id
    WHERE sm.campaign_id = ?
    ORDER BY s.name ASC, v.name ASC
  `).all(id);

  let parsedConfiguration: Record<string, unknown> = {};
  if (typeof campaign.configuration === 'string' && campaign.configuration) {
    try {
      parsedConfiguration = JSON.parse(campaign.configuration);
    } catch {
      parsedConfiguration = {};
    }
  }

  res.status(200).json({
    ...campaign,
    configuration: parsedConfiguration,
    sectors: sectorsWithSub,
    tasks,
    members,
  });
}));

apiRouter.post('/coordenador/campanha/:campaignId/tarefas', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  const parsed = createCampaignTaskSchema.safeParse(req.body);

  if (!parsed.success) {
    const erros = parsed.error.flatten();
    res.status(400).json({
      error: 'Dados invalidos',
      campos: erros.fieldErrors,
      formulario: erros.formErrors,
    });
    return;
  }

  const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(campaignId) as { id: string } | undefined;
  if (!campaign) {
    throw createAppError('Campanha nao encontrada', 404);
  }

  const data = parsed.data;

  const sector = db.prepare('SELECT id FROM campaign_sectors WHERE id = ? AND campaign_id = ?').get(data.sectorId, campaignId) as { id: string } | undefined;
  if (!sector) {
    throw createAppError('Setor invalido para esta campanha', 400);
  }

  if (data.subsectorId) {
    const subsector = db.prepare('SELECT id FROM campaign_subsectors WHERE id = ? AND sector_id = ?').get(data.subsectorId, data.sectorId) as { id: string } | undefined;
    if (!subsector) {
      throw createAppError('Subsetor invalido para o setor selecionado', 400);
    }
  }

  if (data.assignedTo) {
    const volunteer = db.prepare('SELECT id FROM volunteers WHERE id = ?').get(data.assignedTo) as { id: string } | undefined;
    if (!volunteer) {
      throw createAppError('Responsavel nao encontrado', 400);
    }
  }

  const taskId = `camp-task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  db.prepare(`
    INSERT INTO campaign_tasks (
      id, campaign_id, sector_id, subsector_id, title, description, status, priority,
      xp_reward, deadline, estimated_hours, registered_hours, assigned_to, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    taskId,
    campaignId,
    data.sectorId,
    data.subsectorId ?? null,
    data.title,
    data.description ?? null,
    data.status,
    data.priority,
    data.xpReward,
    data.deadline ?? null,
    data.estimatedHours ?? null,
    data.assignedTo ?? null,
    data.createdBy ?? null,
  );

  const task = db.prepare(`
    SELECT
      ct.*,
      s.name as sector_name,
      s.slug as sector_slug,
      s.color as sector_color,
      ss.name as subsector_name,
      v.name as assigned_to_name,
      v.email as assigned_to_email
    FROM campaign_tasks ct
    JOIN campaign_sectors s ON s.id = ct.sector_id
    LEFT JOIN campaign_subsectors ss ON ss.id = ct.subsector_id
    LEFT JOIN volunteers v ON v.id = ct.assigned_to
    WHERE ct.id = ? AND ct.campaign_id = ?
    LIMIT 1
  `).get(taskId, campaignId);

  res.status(201).json({ success: true, task });
}));

apiRouter.patch('/coordenador/campanha/:campaignId/tarefas/:taskId', asyncHandler(async (req, res) => {
  const { campaignId, taskId } = req.params;
  const parsed = updateCampaignTaskSchema.safeParse(req.body);

  if (!parsed.success) {
    const erros = parsed.error.flatten();
    res.status(400).json({
      error: 'Dados invalidos',
      campos: erros.fieldErrors,
      formulario: erros.formErrors,
    });
    return;
  }

  const currentTask = db.prepare('SELECT * FROM campaign_tasks WHERE id = ? AND campaign_id = ?').get(taskId, campaignId) as Record<string, unknown> | undefined;
  if (!currentTask) {
    throw createAppError('Tarefa nao encontrada', 404);
  }

  const payload = parsed.data;
  const nextSectorId = payload.sectorId ?? String(currentTask.sector_id);

  const sector = db.prepare('SELECT id FROM campaign_sectors WHERE id = ? AND campaign_id = ?').get(nextSectorId, campaignId) as { id: string } | undefined;
  if (!sector) {
    throw createAppError('Setor invalido para esta campanha', 400);
  }

  const nextSubsectorId = payload.subsectorId !== undefined ? payload.subsectorId : (currentTask.subsector_id as string | null);
  if (nextSubsectorId) {
    const subsector = db.prepare('SELECT id FROM campaign_subsectors WHERE id = ? AND sector_id = ?').get(nextSubsectorId, nextSectorId) as { id: string } | undefined;
    if (!subsector) {
      throw createAppError('Subsetor invalido para o setor selecionado', 400);
    }
  }

  const nextAssignedTo = payload.assignedTo !== undefined ? payload.assignedTo : (currentTask.assigned_to as string | null);
  if (nextAssignedTo) {
    const volunteer = db.prepare('SELECT id FROM volunteers WHERE id = ?').get(nextAssignedTo) as { id: string } | undefined;
    if (!volunteer) {
      throw createAppError('Responsavel nao encontrado', 400);
    }
  }

  const nextTitle = payload.title ?? String(currentTask.title);
  const nextDescription = payload.description !== undefined ? payload.description : (currentTask.description as string | null);
  const nextStatus = payload.status ?? String(currentTask.status);
  const nextPriority = payload.priority ?? String(currentTask.priority);
  const nextDeadline = payload.deadline !== undefined ? payload.deadline : (currentTask.deadline as string | null);
  const nextEstimatedHours = payload.estimatedHours !== undefined ? payload.estimatedHours : (currentTask.estimated_hours as number | null);
  const nextRegisteredHours = payload.registeredHours !== undefined ? payload.registeredHours : Number(currentTask.registered_hours ?? 0);
  const nextXpReward = payload.xpReward !== undefined ? payload.xpReward : Number(currentTask.xp_reward ?? 0);

  db.prepare(`
    UPDATE campaign_tasks
    SET sector_id = ?, subsector_id = ?, title = ?, description = ?,
        status = ?, priority = ?, deadline = ?, estimated_hours = ?,
        registered_hours = ?, assigned_to = ?, xp_reward = ?
    WHERE id = ? AND campaign_id = ?
  `).run(
    nextSectorId,
    nextSubsectorId ?? null,
    nextTitle,
    nextDescription ?? null,
    nextStatus,
    nextPriority,
    nextDeadline ?? null,
    nextEstimatedHours ?? null,
    nextRegisteredHours,
    nextAssignedTo ?? null,
    nextXpReward,
    taskId,
    campaignId,
  );

  const task = db.prepare(`
    SELECT
      ct.*,
      s.name as sector_name,
      s.slug as sector_slug,
      s.color as sector_color,
      ss.name as subsector_name,
      v.name as assigned_to_name,
      v.email as assigned_to_email
    FROM campaign_tasks ct
    JOIN campaign_sectors s ON s.id = ct.sector_id
    LEFT JOIN campaign_subsectors ss ON ss.id = ct.subsector_id
    LEFT JOIN volunteers v ON v.id = ct.assigned_to
    WHERE ct.id = ? AND ct.campaign_id = ?
    LIMIT 1
  `).get(taskId, campaignId);

  res.status(200).json({ success: true, task });
}));
// Notifications
apiRouter.get('/notificacoes', asyncHandler(async (req, res) => {
  const { volunteerId } = req.query;

  if (!volunteerId || typeof volunteerId !== 'string') {
    res.status(400).json({ error: 'volunteerId e obrigatorio' });
    return;
  }

  const notifications = db
    .prepare('SELECT * FROM system_notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(volunteerId) as Array<Record<string, unknown>>;

  const parsed = notifications.map((notification) => {
    let extraData: unknown = null;

    if (typeof notification.extra_data === 'string' && notification.extra_data) {
      try {
        extraData = JSON.parse(notification.extra_data);
      } catch {
        extraData = null;
      }
    }

    return {
      ...notification,
      extra_data: extraData,
    };
  });

  res.status(200).json(parsed);
}));

apiRouter.patch('/notificacoes/:id/ler', asyncHandler(async (req, res) => {
  db.prepare('UPDATE system_notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.status(200).json({ success: true });
}));

apiRouter.patch('/notificacoes/ler-todas', asyncHandler(async (req, res) => {
  const { volunteerId } = req.body as { volunteerId?: string };

  if (!volunteerId) {
    res.status(400).json({ error: 'volunteerId e obrigatorio' });
    return;
  }

  db.prepare('UPDATE system_notifications SET is_read = 1 WHERE recipient_id = ?').run(volunteerId);
  res.status(200).json({ success: true });
}));

// Volunteer "My Role" API
apiRouter.get('/voluntario/minha-funcao', asyncHandler(async (req, res) => {
  const { volunteerId } = req.query;

  if (!volunteerId || typeof volunteerId !== 'string') {
    res.status(400).json({ error: 'volunteerId e obrigatorio' });
    return;
  }

  const member = db.prepare(`
    SELECT sm.*, c.name as campaign_name, c.office as campaign_office,
           s.name as sector_name, s.color as sector_color, s.slug as sector_slug,
           rp.name as role_name, rp.slug as role_slug, rp.technical_competencies,
           rp.behavioral_competencies
    FROM sector_members sm
    JOIN campaigns c ON sm.campaign_id = c.id
    JOIN campaign_sectors s ON sm.sector_id = s.id
    LEFT JOIN role_profiles rp ON sm.role_profile_id = rp.id
    WHERE sm.volunteer_id = ?
  `).get(volunteerId) as Record<string, unknown> | undefined;

  if (!member) {
    res.status(200).json({ isMember: false, member: null, tasks: [], onboarding: [], setor: null });
    return;
  }

  const tasks = db.prepare(`
    SELECT * FROM campaign_tasks
    WHERE assigned_to = ? AND campaign_id = ? AND status != 'CONCLUIDA'
  `).all(volunteerId, member.campaign_id) as Array<Record<string, unknown>>;

  const onboardingRow = db.prepare('SELECT * FROM role_onboardings WHERE member_id = ?').get(member.id) as Record<string, unknown> | undefined;

  const onboarding = onboardingRow
    ? [{
      ...onboardingRow,
      completed_steps:
        typeof onboardingRow.completed_steps === 'string' && onboardingRow.completed_steps
          ? JSON.parse(onboardingRow.completed_steps)
          : [],
    }]
    : [];

  const parsedTechnical = typeof member.technical_competencies === 'string' && member.technical_competencies
    ? JSON.parse(member.technical_competencies)
    : [];
  const parsedBehavioral = typeof member.behavioral_competencies === 'string' && member.behavioral_competencies
    ? JSON.parse(member.behavioral_competencies)
    : [];
  const parsedCompetenciesEval = typeof member.competencies_eval === 'string' && member.competencies_eval
    ? JSON.parse(member.competencies_eval)
    : {};

  res.status(200).json({
    isMember: true,
    member: {
      ...member,
      technical_competencies: parsedTechnical,
      behavioral_competencies: parsedBehavioral,
      competencies_eval: parsedCompetenciesEval,
    },
    tasks,
    onboarding,
    setor: {
      id: member.sector_id,
      slug: member.sector_slug,
      name: member.sector_name,
      color: member.sector_color,
    },
  });
}));

apiRouter.patch('/voluntario/tarefas/:id/progresso', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { hours, status, notes, deliveryLink } = req.body as {
    hours?: number;
    status?: string;
    notes?: string;
    deliveryLink?: string;
  };

  const task = db.prepare('SELECT * FROM campaign_tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!task) {
    throw createAppError('Tarefa nao encontrada', 404);
  }

  db.prepare(`
    UPDATE campaign_tasks
    SET registered_hours = registered_hours + ?, status = ?, delivery_notes = ?, delivery_link = ?
    WHERE id = ?
  `).run(hours || 0, status, notes, deliveryLink, id);

  if (status === 'REVISAO') {
    await processarFluxo('TAREFA_ENTREGUE', {
      taskId: id,
      volunteerId: task.assigned_to,
      campaignId: task.campaign_id,
      sectorId: task.sector_id,
    });
  }

  res.status(200).json({ success: true });
}));

apiRouter.post('/voluntario/self-assessment', asyncHandler(async (req, res) => {
  const { memberId, volunteerId, competencies } = req.body as {
    memberId?: string;
    volunteerId?: string;
    competencies?: Record<string, number>;
  };

  if (!memberId || !volunteerId || !competencies) {
    res.status(400).json({ error: 'Dados obrigatorios ausentes' });
    return;
  }

  await processarFluxo('SELF_ASSESSMENT', { memberId, volunteerId, competencies });
  res.status(200).json({ success: true });
}));

// Coordinator HR API
apiRouter.get('/coordenador/campanha/:campaignId/setor/:sectorSlug/rh', asyncHandler(async (req, res) => {
  const { campaignId, sectorSlug } = req.params;

  const sector = db.prepare('SELECT * FROM campaign_sectors WHERE campaign_id = ? AND slug = ?').get(campaignId, sectorSlug) as Record<string, unknown> | undefined;
  if (!sector) {
    throw createAppError('Setor nao encontrado', 404);
  }

  const members = db.prepare(`
    SELECT sm.*, v.name, v.photo_url, rp.name as role_name, rp.technical_competencies
    FROM sector_members sm
    JOIN volunteers v ON sm.volunteer_id = v.id
    LEFT JOIN role_profiles rp ON sm.role_profile_id = rp.id
    WHERE sm.sector_id = ?
  `).all(sector.id) as Array<Record<string, unknown>>;

  const evaluations = members.length === 0
    ? []
    : db.prepare(`
        SELECT me.*, v.name as evaluator_name
        FROM member_evaluations me
        JOIN volunteers v ON me.evaluator_id = v.id
        WHERE me.member_id IN (${members.map(() => '?').join(',')})
      `).all(...members.map((member) => member.id)) as Array<Record<string, unknown>>;

  res.status(200).json({
    sector,
    members: members.map((member) => {
      let technicalCompetencies: unknown[] = [];
      let competenciesEval: Record<string, number> = {};

      if (typeof member.technical_competencies === 'string' && member.technical_competencies) {
        try {
          technicalCompetencies = JSON.parse(member.technical_competencies);
        } catch {
          technicalCompetencies = [];
        }
      }

      if (typeof member.competencies_eval === 'string' && member.competencies_eval) {
        try {
          competenciesEval = JSON.parse(member.competencies_eval) as Record<string, number>;
        } catch {
          competenciesEval = {};
        }
      }

      return {
        ...member,
        technical_competencies: technicalCompetencies,
        competencies_eval: competenciesEval,
        evaluations: evaluations.filter((evaluation) => evaluation.member_id === member.id),
      };
    }),
  });
}));
apiRouter.post('/coordenador/avaliacoes', asyncHandler(async (req, res) => {
  const {
    memberId,
    evaluatorId,
    period,
    scores,
    strengths,
    developmentPoints,
    agreedActions,
    recommendation,
  } = req.body as {
    memberId?: string;
    evaluatorId?: string;
    period?: string;
    scores?: Record<string, number>;
    strengths?: string[];
    developmentPoints?: string[];
    agreedActions?: string[];
    recommendation?: string;
  };

  if (!memberId || !evaluatorId || !period || !scores) {
    res.status(400).json({ error: 'Dados obrigatorios ausentes' });
    return;
  }

  const scoreValues = Object.values(scores);
  const scoreGeneral = scoreValues.length === 0
    ? 0
    : Math.round(scoreValues.reduce((acc, value) => acc + value, 0) / scoreValues.length);

  const id = Math.random().toString(36).substring(7);

  db.prepare(`
    INSERT INTO member_evaluations (
      id, member_id, evaluator_id, period,
      score_quality, score_deadline, score_collaboration, score_proactivity, score_alignment,
      score_general, strengths, development_points, agreed_actions, recommendation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    memberId,
    evaluatorId,
    period,
    scores.quality,
    scores.deadline,
    scores.collaboration,
    scores.proactivity,
    scores.alignment,
    scoreGeneral,
    JSON.stringify(strengths ?? []),
    JSON.stringify(developmentPoints ?? []),
    JSON.stringify(agreedActions ?? []),
    recommendation ?? null,
  );

  const member = db.prepare('SELECT volunteer_id FROM sector_members WHERE id = ?').get(memberId) as { volunteer_id?: string } | undefined;

  if (!member?.volunteer_id) {
    throw createAppError('Membro nao encontrado para notificacao', 404);
  }

  await processarFluxo('AVALIACAO_REALIZADA', {
    evaluationId: id,
    memberId,
    volunteerId: member.volunteer_id,
    scoreGeneral,
    recommendation,
  });

  res.status(201).json({ success: true, id });
}));
apiRouter.get('/coordenador/candidatos-sugeridos', (req, res) => {
  const { sectorSlug, roleProfileId } = req.query;
  
  const profile = db.prepare('SELECT * FROM role_profiles WHERE id = ?').get(roleProfileId) as any;
  if (!profile) return res.json([]);

  const skills = JSON.parse(profile.platform_skills);
  
  // Find volunteers with matching skills who are not members of any campaign yet
  // (Simplified for now)
  const candidates = db.prepare(`
    SELECT * FROM volunteers 
    WHERE role = 'VOLUNTARIO' 
    AND id NOT IN (SELECT volunteer_id FROM sector_members)
    LIMIT 10
  `).all();

  res.json(candidates);
});

apiRouter.get('/formacao/certificados', (req, res) => {
  const volunteerId = req.query.volunteerId as string;
  if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });

  const certs = db.prepare(`
    SELECT c.*, t.title as track_title, t.accent_color
    FROM certificates c
    JOIN training_tracks t ON c.track_id = t.id
    WHERE c.volunteer_id = ?
  `).all(volunteerId) as any[];

  res.json(certs);
});

type DadosEleitoraisRow = {
  cidade: string;
  estado: string;
  latitude: number | null;
  longitude: number | null;
  votos_2022: number;
  votos_2018: number;
  percentual_2022: number;
  total_eleitores: number;
};

type DadosDemograficosRow = {
  cidade: string;
  estado: string;
  populacao_total: number;
  pct_jovens_16_34: number;
  pct_acesso_internet: number;
  pct_urbano: number;
  pct_ensino_superior: number;
};

type VoluntariosCidadeRow = {
  cidade: string;
  estado: string;
  count: number;
};

type CrescimentoCidadeRow = {
  cidade: string;
  estado: string;
  novos_mes: number;
  novos_mes_anterior: number;
};

const SCORE_COLUNA_POR_MODO: Record<ModoEstrategico, 'see_territorial' | 'see_crescimento' | 'see_mobilizacao'> = {
  TERRITORIAL: 'see_territorial',
  CRESCIMENTO: 'see_crescimento',
  MOBILIZACAO: 'see_mobilizacao',
};

const parseModo = (value: unknown): ModoEstrategico => {
  const modo = typeof value === 'string' ? value.toUpperCase() : 'CRESCIMENTO';
  if (modo === 'TERRITORIAL' || modo === 'MOBILIZACAO' || modo === 'CRESCIMENTO') return modo;
  return 'CRESCIMENTO';
};

const clampLimit = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(500, Math.trunc(parsed)));
};

apiRouter.get('/inteligencia/scores', asyncHandler(async (req, res) => {
  const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
  const classificacao = typeof req.query.classificacao === 'string' ? req.query.classificacao : undefined;
  const modo = parseModo(req.query.modo);
  const limite = clampLimit(req.query.limite, 50);

  const params: Array<string | number> = [];
  let where = 'WHERE 1=1';

  if (estado) {
    where += ' AND s.estado = ?';
    params.push(estado);
  }

  if (classificacao) {
    where += ' AND s.classificacao = ?';
    params.push(classificacao);
  }

  const orderColumn = SCORE_COLUNA_POR_MODO[modo];

  const query = `
    SELECT
      s.*,
      d.populacao_total,
      d.pct_jovens_16_34,
      d.pct_acesso_internet,
      e.votos_2022,
      e.latitude,
      e.longitude,
      SUM(CASE WHEN UPPER(COALESCE(v.status, '')) IN ('ACTIVE', 'ATIVO') THEN 1 ELSE 0 END) as voluntarios_count_real
    FROM scores_territoriais s
    LEFT JOIN dados_demograficos d ON d.cidade = s.cidade AND d.estado = s.estado
    LEFT JOIN dados_eleitorais e ON e.cidade = s.cidade AND e.estado = s.estado
    LEFT JOIN volunteers v ON v.city = s.cidade AND v.state = s.estado
    ${where}
    GROUP BY s.id
    ORDER BY ${orderColumn} DESC
    LIMIT ?
  `;

  params.push(limite);

  const scores = db.prepare(query).all(...params);
  res.status(200).json({ scores, modo, total: scores.length });
}));

apiRouter.post('/inteligencia/recalcular', asyncHandler(async (req, res) => {
  const latSede = typeof req.body?.lat_sede === 'number' ? req.body.lat_sede : -23.5505;
  const lngSede = typeof req.body?.lng_sede === 'number' ? req.body.lng_sede : -46.6333;

  const dadosEleitorais = db.prepare('SELECT * FROM dados_eleitorais').all() as DadosEleitoraisRow[];
  const dadosDemograficos = db.prepare('SELECT * FROM dados_demograficos').all() as DadosDemograficosRow[];

  if (dadosEleitorais.length === 0) {
    throw createAppError('Sem dados eleitorais para recalculo.', 400);
  }

  const voluntariosPorCidade = db.prepare(`
    SELECT
      city as cidade,
      state as estado,
      SUM(CASE WHEN UPPER(COALESCE(status, '')) IN ('ACTIVE', 'ATIVO') THEN 1 ELSE 0 END) as count
    FROM volunteers
    GROUP BY city, state
  `).all() as VoluntariosCidadeRow[];

  const crescimentoRows = db.prepare(`
    SELECT
      city as cidade,
      state as estado,
      SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) as novos_mes,
      SUM(CASE WHEN created_at >= datetime('now', '-60 days') AND created_at < datetime('now', '-30 days') THEN 1 ELSE 0 END) as novos_mes_anterior
    FROM volunteers
    GROUP BY city, state
  `).all() as CrescimentoCidadeRow[];

  const demoMap = new Map<string, DadosDemograficosRow>();
  for (const demo of dadosDemograficos) {
    demoMap.set(`${demo.cidade}_${demo.estado}`, demo);
  }

  const voluntariosMap = new Map<string, number>();
  for (const row of voluntariosPorCidade) {
    voluntariosMap.set(`${row.cidade}_${row.estado}`, row.count ?? 0);
  }

  const crescimentoMap: Record<string, number> = {};
  for (const row of crescimentoRows) {
    const anterior = row.novos_mes_anterior ?? 0;
    const atual = row.novos_mes ?? 0;
    const crescimento = anterior > 0 ? ((atual - anterior) / anterior) * 100 : (atual > 0 ? 100 : 0);
    crescimentoMap[`${row.cidade}_${row.estado}`] = Number(crescimento.toFixed(2));
  }

  const cidades: CidadeDados[] = dadosEleitorais.map((eleitoral) => {
    const key = `${eleitoral.cidade}_${eleitoral.estado}`;
    const demo = demoMap.get(key);

    return {
      cidade: eleitoral.cidade,
      estado: eleitoral.estado,
      latitude: eleitoral.latitude ?? 0,
      longitude: eleitoral.longitude ?? 0,
      votos_2022: eleitoral.votos_2022 ?? 0,
      populacao_total: demo?.populacao_total ?? 0,
      pct_jovens_16_34: demo?.pct_jovens_16_34 ?? 0,
      pct_acesso_internet: demo?.pct_acesso_internet ?? 0,
      pct_urbano: demo?.pct_urbano ?? 0,
      pct_ensino_superior: demo?.pct_ensino_superior ?? 0,
      voluntarios_count: voluntariosMap.get(key) ?? 0,
      distancia_sede_km: 0,
    };
  });

  const scores = calcularScoresTerritorial(cidades, latSede, lngSede, crescimentoMap);

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

  const persistir = db.transaction((lista: ScoresCidade[]) => {
    for (const score of lista) {
      const key = `${score.cidade}_${score.estado}`;
      upsert.run(
        score.cidade,
        score.estado,
        score.icd,
        score.ipc,
        score.iir,
        score.ic,
        score.io,
        score.ivl,
        score.see_territorial,
        score.see_crescimento,
        score.see_mobilizacao,
        score.classificacao,
        score.acao_sugerida,
        voluntariosMap.get(key) ?? 0,
      );
    }
  });

  persistir(scores);

  res.status(200).json({
    sucesso: true,
    total_cidades: scores.length,
    calculado_em: new Date().toISOString(),
    resumo: {
      motores: scores.filter((score) => score.classificacao === 'MOTOR').length,
      diamantes: scores.filter((score) => score.classificacao === 'DIAMANTE').length,
      polos: scores.filter((score) => score.classificacao === 'POLO').length,
      latentes: scores.filter((score) => score.classificacao === 'LATENTE').length,
      apostas: scores.filter((score) => score.classificacao === 'APOSTA').length,
    },
  });
}));

apiRouter.get('/inteligencia/recomendacao-mensal', asyncHandler(async (req, res) => {
  const modo = parseModo(req.query.modo);

  const orderColumn = SCORE_COLUNA_POR_MODO[modo];
  const rows = db.prepare(`
    SELECT
      s.*,
      e.latitude,
      e.longitude,
      e.votos_2022,
      d.populacao_total,
      d.pct_jovens_16_34
    FROM scores_territoriais s
    LEFT JOIN dados_eleitorais e ON e.cidade = s.cidade AND e.estado = s.estado
    LEFT JOIN dados_demograficos d ON d.cidade = s.cidade AND d.estado = s.estado
    ORDER BY ${orderColumn} DESC
  `).all() as Array<Record<string, unknown>>;

  const scores: ScoresCidade[] = rows.map((row) => ({
    cidade: String(row.cidade ?? ''),
    estado: String(row.estado ?? ''),
    icd: Number(row.icd ?? 0),
    ipc: Number(row.ipc ?? 0),
    iir: Number(row.iir ?? 0),
    ic: Number(row.ic ?? 0),
    io: Number(row.io ?? 0),
    ivl: Number(row.ivl ?? 0),
    see_territorial: Number(row.see_territorial ?? 0),
    see_crescimento: Number(row.see_crescimento ?? 0),
    see_mobilizacao: Number(row.see_mobilizacao ?? 0),
    classificacao: (String(row.classificacao ?? 'BAIXA_PRIOR') as ClassificacaoCidade),
    acao_sugerida: String(row.acao_sugerida ?? 'ACAO_DIGITAL') as ScoresCidade['acao_sugerida'],
    votos_norm: Number(row.votos_norm ?? 0),
    populacao_norm: Number(row.populacao_norm ?? 0),
    voluntarios_norm: Number(row.voluntarios_norm ?? 0),
    distancia_norm: Number(row.distancia_norm ?? 0),
  }));

  const recomendacao = gerarRecomendacaoMensal(scores, modo);
  res.status(200).json(recomendacao);
}));

apiRouter.get('/inteligencia/ranking', asyncHandler(async (req, res) => {
  const modo = parseModo(req.query.modo);
  const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
  const classificacao = typeof req.query.classificacao === 'string' ? req.query.classificacao : undefined;
  const limite = clampLimit(req.query.limite, 20);

  const params: Array<string | number> = [];
  let where = 'WHERE 1=1';

  if (estado) {
    where += ' AND estado = ?';
    params.push(estado);
  }

  if (classificacao) {
    where += ' AND classificacao = ?';
    params.push(classificacao);
  }

  const colOrdem = SCORE_COLUNA_POR_MODO[modo];
  const query = `SELECT * FROM scores_territoriais ${where} ORDER BY ${colOrdem} DESC LIMIT ?`;
  params.push(limite);

  const ranking = db.prepare(query).all(...params);
  res.status(200).json({ ranking, modo, total: ranking.length });
}));

apiRouter.get('/inteligencia/investir-agora', asyncHandler(async (req, res) => {
  const modo = parseModo(req.query.modo);
  const limite = clampLimit(req.query.limite, 10);
  const orderColumn = SCORE_COLUNA_POR_MODO[modo];

  const baseSelect = `
    SELECT
      s.*, e.votos_2022, e.latitude, e.longitude,
      d.populacao_total, d.pct_jovens_16_34, d.pct_acesso_internet,
      SUM(CASE WHEN UPPER(COALESCE(v.status, '')) IN ('ACTIVE', 'ATIVO') THEN 1 ELSE 0 END) as voluntarios_count_real
    FROM scores_territoriais s
    LEFT JOIN dados_eleitorais e ON e.cidade = s.cidade AND e.estado = s.estado
    LEFT JOIN dados_demograficos d ON d.cidade = s.cidade AND d.estado = s.estado
    LEFT JOIN volunteers v ON v.city = s.cidade AND v.state = s.estado
  `;

  const queryPorFiltro = (whereClause: string, orderClause: string): string => `
    ${baseSelect}
    WHERE 1=1 ${whereClause}
    GROUP BY s.id
    ORDER BY ${orderClause} DESC
    LIMIT ?
  `;

  const listaFallback = db.prepare(queryPorFiltro('', `s.${orderColumn}`));

  const construirLista = (whereClause: string, orderClause: string): Array<Record<string, unknown>> => {
    const primaria = db.prepare(queryPorFiltro(whereClause, orderClause)).all(limite) as Array<Record<string, unknown>>;
    if (primaria.length >= limite) return primaria;

    const fallback = listaFallback.all(limite * 2) as Array<Record<string, unknown>>;
    const chaves = new Set(primaria.map((cidade) => `${String(cidade.cidade)}_${String(cidade.estado)}`));

    for (const cidade of fallback) {
      const chave = `${String(cidade.cidade)}_${String(cidade.estado)}`;
      if (chaves.has(chave)) continue;
      chaves.add(chave);
      primaria.push(cidade);
      if (primaria.length >= limite) break;
    }

    return primaria;
  };

  const eventosPresenciais = construirLista(" AND s.classificacao IN ('MOTOR', 'POLO')", 's.see_territorial');
  const crescimentoBase = construirLista(" AND (s.classificacao IN ('DIAMANTE', 'LATENTE', 'APOSTA') OR s.ipc >= 55)", 's.see_crescimento');
  const potencialEstrategico = construirLista('', `s.${orderColumn}`);

  res.status(200).json({
    modo,
    gerado_em: new Date().toISOString(),
    resumo: 'As listas priorizam cidades para evento presencial, crescimento de base e maior potencial estrategico.',
    eventos_presenciais: eventosPresenciais,
    crescimento_base: crescimentoBase,
    potencial_estrategico: potencialEstrategico,
  });
}));

apiRouter.get('/inteligencia/alertas', asyncHandler(async (req, res) => {
  const limite = clampLimit(req.query.limite, 10);

  const alertas = db.prepare(`
    SELECT
      cidade,
      estado,
      classificacao,
      ic,
      io,
      see_crescimento,
      acao_sugerida,
      voluntarios_count,
      calculado_em
    FROM scores_territoriais
    WHERE classificacao IN ('DIAMANTE', 'LATENTE') OR ic < 0.5
    ORDER BY see_crescimento DESC
    LIMIT ?
  `).all(limite);

  res.status(200).json({ alertas, total: alertas.length });
}));

apiRouter.post('/inteligencia/questionario', asyncHandler(async (req, res) => {
  const parsed = questionarioEleitorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Dados invalidos',
      campos: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const dados = parsed.data;

  db.prepare(`
    INSERT INTO questionarios_eleitor (
      cidade, estado, idade, sexo, escolaridade,
      acesso_internet, usa_redes_sociais, joga_videogame, plataformas_jogo,
      conhece_candidata, simpatia_candidata, pretende_votar,
      e_lider_comunidade, tipo_comunidade, preocupacao_principal, coletor_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    dados.cidade,
    dados.estado,
    dados.idade ?? null,
    dados.sexo ?? null,
    dados.escolaridade ?? null,
    dados.acesso_internet ? 1 : 0,
    JSON.stringify(dados.usa_redes_sociais ?? []),
    dados.joga_videogame ? 1 : 0,
    JSON.stringify(dados.plataformas_jogo ?? []),
    dados.conhece_candidata ? 1 : 0,
    dados.simpatia_candidata ?? 0,
    dados.pretende_votar ?? 'NR',
    dados.e_lider_comunidade ? 1 : 0,
    dados.tipo_comunidade ?? null,
    dados.preocupacao_principal ?? null,
    dados.coletor_id ?? null,
  );

  res.status(201).json({ sucesso: true, mensagem: 'Questionario salvo.' });
}));

apiRouter.get('/inteligencia/questionario/resumo/:cidade', asyncHandler(async (req, res) => {
  const cidade = decodeURIComponent(req.params.cidade);
  const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;

  const resumoQueryComEstado = db.prepare(`
    SELECT
      COUNT(*) as total_respostas,
      AVG(idade) as idade_media,
      SUM(acesso_internet) as tem_internet,
      SUM(joga_videogame) as joga_games,
      SUM(conhece_candidata) as conhece_candidata,
      AVG(simpatia_candidata) as simpatia_media,
      SUM(CASE WHEN pretende_votar = 'SIM' THEN 1 ELSE 0 END) as vai_votar,
      SUM(e_lider_comunidade) as lideres_identificados,
      SUM(CASE WHEN preocupacao_principal = 'emprego' THEN 1 ELSE 0 END) as preoc_emprego,
      SUM(CASE WHEN preocupacao_principal IN ('educacao', 'educaÃ§Ã£o') THEN 1 ELSE 0 END) as preoc_educacao,
      SUM(CASE WHEN preocupacao_principal = 'seguranca' OR preocupacao_principal = 'seguranÃ§a' THEN 1 ELSE 0 END) as preoc_seguranca
    FROM questionarios_eleitor
    WHERE cidade = ? AND estado = ?
  `);

  const resumoQuerySemEstado = db.prepare(`
    SELECT
      COUNT(*) as total_respostas,
      AVG(idade) as idade_media,
      SUM(acesso_internet) as tem_internet,
      SUM(joga_videogame) as joga_games,
      SUM(conhece_candidata) as conhece_candidata,
      AVG(simpatia_candidata) as simpatia_media,
      SUM(CASE WHEN pretende_votar = 'SIM' THEN 1 ELSE 0 END) as vai_votar,
      SUM(e_lider_comunidade) as lideres_identificados,
      SUM(CASE WHEN preocupacao_principal = 'emprego' THEN 1 ELSE 0 END) as preoc_emprego,
      SUM(CASE WHEN preocupacao_principal IN ('educacao', 'educaÃ§Ã£o') THEN 1 ELSE 0 END) as preoc_educacao,
      SUM(CASE WHEN preocupacao_principal = 'seguranca' OR preocupacao_principal = 'seguranÃ§a' THEN 1 ELSE 0 END) as preoc_seguranca
    FROM questionarios_eleitor
    WHERE cidade = ?
  `);

  const resumo = estado ? resumoQueryComEstado.get(cidade, estado) : resumoQuerySemEstado.get(cidade);
  res.status(200).json({ cidade, estado: estado ?? null, resumo });
}));

apiRouter.post('/inteligencia/importar-eleitorais', asyncHandler(async (req, res) => {
  const parsed = importarEleitoraisSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Dados invalidos',
      campos: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const upsert = db.prepare(`
    INSERT INTO dados_eleitorais (
      cidade, estado, codigo_ibge, latitude, longitude,
      votos_2022, votos_2018, percentual_2022, total_eleitores, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(cidade, estado) DO UPDATE SET
      codigo_ibge = excluded.codigo_ibge,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      votos_2022 = excluded.votos_2022,
      votos_2018 = excluded.votos_2018,
      percentual_2022 = excluded.percentual_2022,
      total_eleitores = excluded.total_eleitores,
      updated_at = datetime('now')
  `);

  const inserirLote = db.transaction((cidades: z.infer<typeof importarEleitoraisSchema>['cidades']) => {
    for (const cidade of cidades) {
      upsert.run(
        cidade.cidade,
        cidade.estado,
        cidade.codigo_ibge ?? null,
        cidade.latitude ?? null,
        cidade.longitude ?? null,
        cidade.votos_2022 ?? 0,
        cidade.votos_2018 ?? 0,
        cidade.percentual_2022 ?? 0,
        cidade.total_eleitores ?? 0,
      );
    }
  });

  inserirLote(parsed.data.cidades);
  res.status(201).json({ sucesso: true, importados: parsed.data.cidades.length });
}));

// Seed Routes
apiRouter.post('/seed/admin', async (req, res) => {
  try {
    const count = await seedAdmins();
    res.json({
      success: true,
      mensagem: "UsuÃƒÂ¡rios administrativos criados com sucesso",
      credenciais: [
        { perfil: "Admin Nacional Ã¢â‚¬â€ acesso total", email: "admin@missao.com.br", senha: "Missao@2025", acessa: "/hq, /coordenador, tudo" },
        { perfil: "Chefe de Campanha", email: "chefe@missao.com.br", senha: "Campanha@2025", acessa: "/hq, /coordenador" },
        { perfil: "Coordenador SP", email: "coord.sp@missao.com.br", senha: "CoordSP@2025", acessa: "/coordenador (estado SP)" },
        { perfil: "Coordenador RJ", email: "coord.rj@missao.com.br", senha: "CoordRJ@2025", acessa: "/coordenador (estado RJ)" },
        { perfil: "Coordenador Municipal", email: "coord.mun@missao.com.br", senha: "CoordMun@2025", acessa: "/coordenador (municÃƒÂ­pio)" }
      ]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar administradores' });
  }
});

apiRouter.post('/seed/voluntarios', async (req, res) => {
  try {
    const count = await seedVoluntarios();
    res.json({ success: true, count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar voluntÃƒÂ¡rios' });
  }
});

apiRouter.post('/seed/missoes', async (req, res) => {
  try {
    const count = await seedMissoes();
    res.json({ success: true, count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar missÃƒÂµes' });
  }
});

apiRouter.post('/seed', async (req, res) => {
  try {
    const admins = await seedAdmins();
    const voluntarios = await seedVoluntarios();
    const missoes = await seedMissoes();

    res.json({
      success: true,
      resumo: {
        adminsCriados: admins,
        voluntariosCriados: voluntarios,
        missoesCriadas: missoes,
        formacaoCriada: await seedFormacao()
      },
      proximosPasso: [
        "Acesse /acesso-admin para ver as credenciais",
        "FaÃƒÂ§a login em /login com admin@missao.com.br / Missao@2025",
        "Explore o painel em /coordenador",
        "Acesse o HQ em /hq"
      ]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro no seed consolidado' });
  }
});

apiRouter.post('/seed/formacao', async (req, res) => {
  try {
    const count = await seedFormacao();
    res.json({ success: true, count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar formaÃƒÂ§ÃƒÂ£o' });
  }
});

async function seedFormacao() {
  const generateId = () => Math.random().toString(36).substring(2, 15);
  
  // Clear existing
  db.prepare('DELETE FROM module_progress').run();
  db.prepare('DELETE FROM track_progress').run();
  db.prepare('DELETE FROM certificates').run();
  db.prepare('DELETE FROM training_modules').run();
  db.prepare('DELETE FROM training_tracks').run();

  const tracks = [
    {
      id: generateId(),
      slug: "fundamentos-missao",
      title: "Fundamentos do Movimento",
      description: "O ponto de partida de todo militante. Compreenda a origem, os valores e as propostas centrais do movimento MissÃƒÂ£o.",
      objective: "Ao concluir esta trilha, vocÃƒÂª serÃƒÂ¡ capaz de explicar o movimento para qualquer pessoa em menos de 3 minutos.",
      level: "INICIANTE",
      category: "POLITICA",
      total_xp: 240,
      duration_min: 55,
      display_order: 1,
      is_mandatory: 1,
      accent_color: "#F5C400",
      modules: [
        {
          id: generateId(),
          title: "O que ÃƒÂ© o Movimento MissÃƒÂ£o?",
          type: "LEITURA",
          display_order: 1,
          duration_min: 8,
          xp_reward: 40,
          content: JSON.stringify({
            secoes: [
              {
                subtitulo: "Uma nova forma de fazer polÃƒÂ­tica",
                texto: "O Movimento MissÃƒÂ£o nasceu da convicÃƒÂ§ÃƒÂ£o de que a polÃƒÂ­tica brasileira precisa ser reinventada. NÃƒÂ£o apenas nas propostas, mas na forma como os cidadÃƒÂ£os se organizam e participam. Nossa base ÃƒÂ© formada por pessoas comuns que acreditam que mudanÃƒÂ§a real vem de baixo para cima."
              },
              {
                subtitulo: "Os 3 pilares do movimento",
                texto: "1. PESSOAS ANTES DE CARGOS Ã¢â‚¬â€ Todo cargo pÃƒÂºblico ÃƒÂ© um instrumento de serviÃƒÂ§o, nunca de poder pessoal. 2. TRANSPARÃƒÅ NCIA RADICAL Ã¢â‚¬â€ Cada decisÃƒÂ£o ÃƒÂ© explicada e cada recurso ÃƒÂ© prestado publicamente. 3. PARTICIPAÃƒâ€¡ÃƒÆ’O REAL Ã¢â‚¬â€ Os militantes nÃƒÂ£o apenas apoiam, eles decidem."
              },
              {
                subtitulo: "Por que vocÃƒÂª importa",
                texto: "Movimentos nÃƒÂ£o crescem por causa de lÃƒÂ­deres carismÃƒÂ¡ticos. Crescem porque pessoas como vocÃƒÂª decidem agir. Cada voluntÃƒÂ¡rio do MissÃƒÂ£o ÃƒÂ© um ponto de presenÃƒÂ§a do movimento no seu bairro, na sua famÃƒÂ­lia, no seu trabalho."
              }
            ],
            pontoChave: "O MissÃƒÂ£o ÃƒÂ© um movimento de base Ã¢â‚¬â€ sua forÃƒÂ§a vem dos voluntÃƒÂ¡rios, nÃƒÂ£o dos polÃƒÂ­ticos.",
            tempoLeitura: 8
          })
        },
        {
          id: generateId(),
          title: "As 5 Propostas Centrais",
          type: "LEITURA",
          display_order: 2,
          duration_min: 12,
          xp_reward: 40,
          content: JSON.stringify({
            secoes: [
              {
                subtitulo: "1. EducaÃƒÂ§ÃƒÂ£o de Qualidade Universal",
                texto: "Toda crianÃƒÂ§a brasileira merece escola integral, professor bem pago e infraestrutura digna. Nossa proposta prevÃƒÂª aumento de 40% no investimento por aluno nas escolas pÃƒÂºblicas, com prioridade para os 20% municÃƒÂ­pios com pior IDEB."
              },
              {
                subtitulo: "2. SaÃƒÂºde como Direito, NÃƒÂ£o PrivilÃƒÂ©gio",
                texto: "Reforma profunda do SUS com foco em atenÃƒÂ§ÃƒÂ£o bÃƒÂ¡sica. MÃƒÂ©dico de famÃƒÂ­lia em cada bairro antes de hospital de ponta em capital. Nossa meta: zero lista de espera para consultas de atenÃƒÂ§ÃƒÂ£o primÃƒÂ¡ria em 3 anos."
              },
              {
                subtitulo: "3. SeguranÃƒÂ§a com InteligÃƒÂªncia",
                texto: "Combate ao crime organizado com tecnologia, investigaÃƒÂ§ÃƒÂ£o financeira e integraÃƒÂ§ÃƒÂ£o de forÃƒÂ§as. Menos presos por trÃƒÂ¡fico de menor potencial, mais recursos para desarticular redes de lavagem de dinheiro."
              },
              {
                subtitulo: "4. Economia que Gera Emprego",
                texto: "DesburocratizaÃƒÂ§ÃƒÂ£o radical para micro e pequenas empresas. Simples Nacional expandido, abertura de empresa em 24h, crÃƒÂ©dito a juro baixo para empreendedores de baixa renda."
              },
              {
                subtitulo: "5. TransparÃƒÂªncia e Controle Social",
                texto: "Portal ÃƒÂºnico de gastos pÃƒÂºblicos em tempo real, auditoria cidadÃƒÂ£, recall de mandato por iniciativa popular. O eleitor que votou tem o direito de acompanhar cada centavo."
              }
            ],
            pontoChave: "ConheÃƒÂ§a cada proposta a fundo Ã¢â‚¬â€ vocÃƒÂª precisarÃƒÂ¡ explicÃƒÂ¡-las em campo.",
            tempoLeitura: 12
          })
        },
        {
          id: generateId(),
          title: "Quiz: VocÃƒÂª conhece o Movimento?",
          type: "QUIZ",
          display_order: 3,
          duration_min: 10,
          xp_reward: 60,
          content: JSON.stringify({
            notaMinimaAprovacao: 70,
            tentativasMaximas: 3,
            questoes: [
              {
                id: "q1",
                pergunta: "Qual ÃƒÂ© o principal diferencial do Movimento MissÃƒÂ£o em relaÃƒÂ§ÃƒÂ£o a partidos tradicionais?",
                alternativas: [
                  "Ter um lÃƒÂ­der carismÃƒÂ¡tico nacional",
                  "OrganizaÃƒÂ§ÃƒÂ£o de base com participaÃƒÂ§ÃƒÂ£o real dos militantes",
                  "Foco exclusivo em eleiÃƒÂ§ÃƒÂµes presidenciais",
                  "AlianÃƒÂ§as com partidos consolidados"
                ],
                correta: 1,
                explicacao: "O MissÃƒÂ£o ÃƒÂ© fundamentalmente um movimento de base. O poder vem dos voluntÃƒÂ¡rios organizados, nÃƒÂ£o de figuras de topo."
              },
              {
                id: "q2",
                pergunta: "Qual dos seguintes NÃƒÆ’O ÃƒÂ© um dos 3 pilares do movimento?",
                alternativas: [
                  "Pessoas antes de cargos",
                  "TransparÃƒÂªncia radical",
                  "AlianÃƒÂ§as estratÃƒÂ©gicas acima de princÃƒÂ­pios",
                  "ParticipaÃƒÂ§ÃƒÂ£o real"
                ],
                correta: 2,
                explicacao: "Os 3 pilares sÃƒÂ£o: Pessoas antes de cargos, TransparÃƒÂªncia radical e ParticipaÃƒÂ§ÃƒÂ£o real."
              },
              {
                id: "q3",
                pergunta: "Qual ÃƒÂ© a meta do movimento para consultas de atenÃƒÂ§ÃƒÂ£o primÃƒÂ¡ria no SUS?",
                alternativas: [
                  "Reduzir em 50% as filas em 10 anos",
                  "Zero lista de espera para atenÃƒÂ§ÃƒÂ£o primÃƒÂ¡ria em 3 anos",
                  "Privatizar o SUS progressivamente",
                  "Construir 500 novos hospitais"
                ],
                correta: 1,
                explicacao: "A proposta foca em atenÃƒÂ§ÃƒÂ£o bÃƒÂ¡sica com meta de zero espera para consultas primÃƒÂ¡rias em 3 anos."
              },
              {
                id: "q4",
                pergunta: "O que o movimento propÃƒÂµe para micro e pequenas empresas?",
                alternativas: [
                  "IsenÃƒÂ§ÃƒÂ£o total de impostos por 10 anos",
                  "DesburocratizaÃƒÂ§ÃƒÂ£o, Simples expandido e abertura em 24h",
                  "FusÃƒÂ£o com grandes empresas para ganho de escala",
                  "Financiamento estatal obrigatÃƒÂ³rio"
                ],
                correta: 1,
                explicacao: "A proposta econÃƒÂ´mica foca em desburocratizaÃƒÂ§ÃƒÂ£o radical e crÃƒÂ©dito acessÃƒÂ­vel para pequenos empreendedores."
              },
              {
                id: "q5",
                pergunta: "Como o movimento define o papel de um cargo pÃƒÂºblico?",
                alternativas: [
                  "Instrumento de poder e influÃƒÂªncia",
                  "Recompensa por anos de militÃƒÂ¢ncia",
                  "Instrumento de serviÃƒÂ§o, nunca de poder pessoal",
                  "Base para construÃƒÂ§ÃƒÂ£o de carreira polÃƒÂ­tica"
                ],
                correta: 2,
                explicacao: "O primeiro pilar do movimento ÃƒÂ© claro: todo cargo pÃƒÂºblico ÃƒÂ© instrumento de serviÃƒÂ§o."
              }
            ]
          })
        },
        {
          id: generateId(),
          title: "MissÃƒÂ£o PrÃƒÂ¡tica: Apresente o movimento",
          type: "PRATICA",
          display_order: 4,
          duration_min: 15,
          xp_reward: 100,
          content: JSON.stringify({
            instrucoes: "VocÃƒÂª aprendeu os fundamentos. Agora ÃƒÂ© hora de praticar.",
            desafio: "Grave um vÃƒÂ­deo de atÃƒÂ© 60 segundos ou escreva um texto de 100 a 200 palavras apresentando o Movimento MissÃƒÂ£o para alguÃƒÂ©m que nunca ouviu falar. Use suas prÃƒÂ³prias palavras Ã¢â‚¬â€ nÃƒÂ£o copie os textos dos mÃƒÂ³dulos anteriores.",
            criterios: [
              "Mencionar pelo menos 2 dos 3 pilares do movimento",
              "Citar pelo menos 1 proposta especÃƒÂ­fica",
              "Usar linguagem acessÃƒÂ­vel (sem jargÃƒÂ£o polÃƒÂ­tico)",
              "Demonstrar entusiasmo genuÃƒÂ­no"
            ],
            dica: "Imagine que vocÃƒÂª estÃƒÂ¡ explicando para um familiar em um almoÃƒÂ§o de domingo. Fale como vocÃƒÂª, nÃƒÂ£o como um panfleto.",
            tipoSubmissao: "TEXTO_OU_LINK",
            validacao: "MANUAL"
          })
        }
      ]
    },
    {
      id: generateId(),
      slug: "comunicacao-politica",
      title: "ComunicaÃƒÂ§ÃƒÂ£o PolÃƒÂ­tica Eficaz",
      description: "Aprenda a comunicar ideias polÃƒÂ­ticas de forma clara, persuasiva e respeitosa. Da conversa de mesa ÃƒÂ  publicaÃƒÂ§ÃƒÂ£o nas redes sociais.",
      objective: "Ao concluir esta trilha, vocÃƒÂª dominarÃƒÂ¡ tÃƒÂ©cnicas de argumentaÃƒÂ§ÃƒÂ£o e serÃƒÂ¡ capaz de defender as propostas do movimento em qualquer situaÃƒÂ§ÃƒÂ£o.",
      level: "INICIANTE",
      category: "COMUNICACAO",
      total_xp: 280,
      duration_min: 70,
      display_order: 2,
      is_mandatory: 0,
      prerequisite_slug: "fundamentos-missao",
      accent_color: "#1565C0",
      modules: [
        {
          id: generateId(),
          title: "A arte de ouvir antes de falar",
          type: "LEITURA",
          display_order: 1,
          duration_min: 10,
          xp_reward: 40,
          content: JSON.stringify({
            secoes: [
              {
                subtitulo: "Por que militantes perdem debates",
                texto: "O erro mais comum de voluntÃƒÂ¡rios polÃƒÂ­ticos ÃƒÂ© chegar numa conversa querendo convencer, nÃƒÂ£o entender. Quando a pessoa percebe que vocÃƒÂª nÃƒÂ£o estÃƒÂ¡ ouvindo ela, fecha-se imediatamente. A primeira habilidade da comunicaÃƒÂ§ÃƒÂ£o polÃƒÂ­tica nÃƒÂ£o ÃƒÂ© falar Ã¢â‚¬â€ ÃƒÂ© ouvir ativamente."
              },
              {
                subtitulo: "Escuta ativa em 3 passos",
                texto: "PASSO 1 Ã¢â‚¬â€ PERGUNTE: Comece com uma pergunta aberta. 'O que vocÃƒÂª acha da situaÃƒÂ§ÃƒÂ£o da saÃƒÂºde aqui na cidade?' deixa a pessoa falar livremente. PASSO 2 Ã¢â‚¬â€ CONFIRME: Repita o que ouviu em suas palavras. 'EntÃƒÂ£o vocÃƒÂª estÃƒÂ¡ dizendo que o problema maior ÃƒÂ© a fila, nÃƒÂ£o a qualidade do atendimento. Entendi certo?' PASSO 3 Ã¢â‚¬â€ CONECTE: SÃƒÂ³ entÃƒÂ£o conecte a preocupaÃƒÂ§ÃƒÂ£o dela ÃƒÂ  proposta do movimento. 'Ãƒâ€° exatamente isso que nossa proposta de atenÃƒÂ§ÃƒÂ£o bÃƒÂ¡sica resolve.'"
              },
              {
                subtitulo: "Identificando o medo real por trÃƒÂ¡s da objeÃƒÂ§ÃƒÂ£o",
                texto: "Quando alguÃƒÂ©m diz 'todos os polÃƒÂ­ticos sÃƒÂ£o iguais', o que estÃƒÂ¡ dizendo na verdade ÃƒÂ© 'jÃƒÂ¡ fui decepcionado antes e tenho medo de me decepcionar de novo'. Responder o argumento racional sem endereÃƒÂ§ar o medo emocional nÃƒÂ£o funciona. Valide o sentimento antes de oferecer a razÃƒÂ£o."
              }
            ],
            pontoChave: "OuÃƒÂ§a primeiro. ConvenÃƒÂ§a depois. Sempre nessa ordem.",
            tempoLeitura: 10
          })
        },
        {
          id: generateId(),
          title: "ArgumentaÃƒÂ§ÃƒÂ£o sem conflito",
          type: "LEITURA",
          display_order: 2,
          duration_min: 12,
          xp_reward: 40,
          content: JSON.stringify({
            secoes: [
              {
                subtitulo: "O mÃƒÂ©todo da ponte",
                texto: "Nunca contradiga diretamente. Use a tÃƒÂ©cnica da ponte: reconheÃƒÂ§a o ponto vÃƒÂ¡lido na objeÃƒÂ§ÃƒÂ£o, depois construa uma ponte para o seu argumento. 'VocÃƒÂª tem razÃƒÂ£o que mudanÃƒÂ§as bruscas sÃƒÂ£o arriscadas. Ãƒâ€° exatamente por isso que nossa proposta prevÃƒÂª implementaÃƒÂ§ÃƒÂ£o gradual com metas trimestrais auditÃƒÂ¡veis.'"
              },
              {
                subtitulo: "Dados que convencem vs. dados que afastam",
                texto: "Usar estatÃƒÂ­stica na hora errada parece arrogÃƒÂ¢ncia. Use dados DEPOIS de estabelecer conexÃƒÂ£o emocional, nÃƒÂ£o antes. A sequÃƒÂªncia correta ÃƒÂ©: histÃƒÂ³ria pessoal Ã¢â€ â€™ problema identificado Ã¢â€ â€™ dado que confirma a escala Ã¢â€ â€™ proposta de soluÃƒÂ§ÃƒÂ£o."
              },
              {
                subtitulo: "Como responder 'mas fulano tambÃƒÂ©m prometeu isso'",
                texto: "Esta ÃƒÂ© a objeÃƒÂ§ÃƒÂ£o mais comum. A resposta nÃƒÂ£o ÃƒÂ© atacar o adversÃƒÂ¡rio Ã¢â‚¬â€ ÃƒÂ© mostrar o que ÃƒÂ© diferente no processo, nÃƒÂ£o apenas na promessa. 'A diferenÃƒÂ§a nÃƒÂ£o estÃƒÂ¡ no que prometemos, estÃƒÂ¡ em como tomamos decisÃƒÂµes. Cada proposta nossa passou por consulta pÃƒÂºblica com mais de X pessoas.'"
              }
            ],
            pontoChave: "Nunca venÃƒÂ§a uma discussÃƒÂ£o e perca um apoiador. O objetivo ÃƒÂ© a relaÃƒÂ§ÃƒÂ£o, nÃƒÂ£o o debate.",
            tempoLeitura: 12
          })
        },
        {
          id: generateId(),
          title: "ComunicaÃƒÂ§ÃƒÂ£o nas redes sociais",
          type: "LEITURA",
          display_order: 3,
          duration_min: 15,
          xp_reward: 50,
          content: JSON.stringify({
            secoes: [
              {
                subtitulo: "As 3 regras de ouro do conteÃƒÂºdo polÃƒÂ­tico online",
                texto: "REGRA 1 Ã¢â‚¬â€ CLAREZA ACIMA DE TUDO: Se precisar ler duas vezes para entender, o post falhou. REGRA 2 Ã¢â‚¬â€ EMOÃƒâ€¡ÃƒÆ’O ANTES DE RAZÃƒÆ’O: O algoritmo favorece o que gera reaÃƒÂ§ÃƒÂ£o. Comece com o impacto humano, termine com os dados. REGRA 3 Ã¢â‚¬â€ CONSISTÃƒÅ NCIA DE VOZ: VocÃƒÂª ÃƒÂ© voluntÃƒÂ¡rio, nÃƒÂ£o porta-voz oficial. Fale como pessoa, use 'eu acredito', 'na minha opiniÃƒÂ£o' Ã¢â‚¬â€ isso cria mais confianÃƒÂ§a do que parecer um comunicado oficial."
              },
              {
                subtitulo: "O que NÃƒÆ’O postar Ã¢â‚¬â€ erros que prejudicam o movimento",
                texto: "Ã¢ÂÅ’ ConteÃƒÂºdo que ataca adversÃƒÂ¡rios pessoalmente (foca no movimento, nÃƒÂ£o no inimigo). Ã¢ÂÅ’ InformaÃƒÂ§ÃƒÂµes nÃƒÂ£o verificadas (sempre cheque antes de compartilhar). Ã¢ÂÅ’ ConteÃƒÂºdo que promete o que o movimento nÃƒÂ£o pode cumprir. Ã¢ÂÅ’ Respostas emocionais em comentÃƒÂ¡rios hostis (ignore ou responda com fatos calmos)."
              },
              {
                subtitulo: "Formato por plataforma",
                texto: "INSTAGRAM: Visual + legenda curta + CTA claro. Use os templates oficiais. TWITTER/X: Uma ideia por post. Se precisar de mais de 3 tweets em fio, escreva um artigo. WHATSAPP: Mensagem pessoal e direta. Nunca encaminhe materiais sem contextualizar para o seu grupo. TIKTOK/REELS: Conte uma histÃƒÂ³ria em 30-60 segundos. Mostre, nÃƒÂ£o diga."
              }
            ],
            pontoChave: "Online vocÃƒÂª representa o movimento mesmo quando nÃƒÂ£o estÃƒÂ¡ 'trabalhando'. Cuide da sua presenÃƒÂ§a digital.",
            tempoLeitura: 15
          })
        },
        {
          id: generateId(),
          title: "Quiz: ComunicaÃƒÂ§ÃƒÂ£o na prÃƒÂ¡tica",
          type: "QUIZ",
          display_order: 4,
          duration_min: 10,
          xp_reward: 60,
          content: JSON.stringify({
            notaMinimaAprovacao: 70,
            tentativasMaximas: 3,
            questoes: [
              {
                id: "q1",
                pergunta: "Um eleitor diz: 'todos os polÃƒÂ­ticos sÃƒÂ£o iguais, nÃƒÂ£o acredito em ninguÃƒÂ©m'. Qual ÃƒÂ© a melhor resposta?",
                alternativas: [
                  "Apresentar imediatamente as propostas do movimento",
                  "Dizer que ele estÃƒÂ¡ errado e que o MissÃƒÂ£o ÃƒÂ© diferente",
                  "Validar o sentimento de decepÃƒÂ§ÃƒÂ£o antes de falar do movimento",
                  "Mostrar estatÃƒÂ­sticas de aprovaÃƒÂ§ÃƒÂ£o do movimento"
                ],
                correta: 2,
                explicacao: "O medo real por trÃƒÂ¡s da objeÃƒÂ§ÃƒÂ£o ÃƒÂ© 'jÃƒÂ¡ fui decepcionado'. Valide o sentimento primeiro, depois apresente o diferencial."
              },
              {
                id: "q2",
                pergunta: "Qual ÃƒÂ© a sequÃƒÂªncia correta ao usar dados em uma conversa polÃƒÂ­tica?",
                alternativas: [
                  "Dado Ã¢â€ â€™ Problema Ã¢â€ â€™ EmoÃƒÂ§ÃƒÂ£o Ã¢â€ â€™ SoluÃƒÂ§ÃƒÂ£o",
                  "HistÃƒÂ³ria pessoal Ã¢â€ â€™ Problema Ã¢â€ â€™ Dado Ã¢â€ â€™ SoluÃƒÂ§ÃƒÂ£o",
                  "SoluÃƒÂ§ÃƒÂ£o Ã¢â€ â€™ Dado Ã¢â€ â€™ Problema Ã¢â€ â€™ EmoÃƒÂ§ÃƒÂ£o",
                  "Dado Ã¢â€ â€™ SoluÃƒÂ§ÃƒÂ£o Ã¢â€ â€™ Problema Ã¢â€ â€™ EmoÃƒÂ§ÃƒÂ£o"
                ],
                correta: 1,
                explicacao: "Dados convencem mais quando vÃƒÂªm depois da conexÃƒÂ£o emocional. A sequÃƒÂªncia ÃƒÂ©: histÃƒÂ³ria Ã¢â€ â€™ problema Ã¢â€ â€™ dado Ã¢â€ â€™ soluÃƒÂ§ÃƒÂ£o."
              },
              {
                id: "q3",
                pergunta: "Qual prÃƒÂ¡tica ÃƒÂ© recomendada para comunicaÃƒÂ§ÃƒÂ£o no WhatsApp?",
                alternativas: [
                  "Encaminhar materiais oficiais sem comentar",
                  "Criar grupos grandes para alcanÃƒÂ§ar mais pessoas",
                  "Mensagem pessoal e direta, sempre contextualizada",
                  "Priorizar volume de mensagens para maior impacto"
                ],
                correta: 2,
                explicacao: "No WhatsApp, mensagem pessoal e contextualizada tem muito mais impacto do que encaminhamentos em massa."
              }
            ]
          })
        }
      ]
    },
    {
      id: generateId(),
      slug: "organizacao-de-campo",
      title: "OrganizaÃƒÂ§ÃƒÂ£o e AÃƒÂ§ÃƒÂ£o de Campo",
      description: "Como organizar aÃƒÂ§ÃƒÂµes territoriais eficazes: desde panfletagem atÃƒÂ© eventos de bairro. O guia completo do militante em campo.",
      objective: "Ao concluir esta trilha, vocÃƒÂª serÃƒÂ¡ capaz de organizar e executar aÃƒÂ§ÃƒÂµes presenciais com atÃƒÂ© 20 pessoas de forma eficiente.",
      level: "INTERMEDIARIO",
      category: "CAMPO",
      total_xp: 320,
      duration_min: 80,
      display_order: 3,
      is_mandatory: 0,
      prerequisite_slug: "fundamentos-missao",
      accent_color: "#2E7D32",
      modules: [
        {
          id: generateId(),
          title: "Planejando uma aÃƒÂ§ÃƒÂ£o territorial",
          type: "LEITURA",
          display_order: 1,
          duration_min: 12,
          xp_reward: 50,
          content: JSON.stringify({
            secoes: [
              {
                subtitulo: "Os 5 elementos de toda aÃƒÂ§ÃƒÂ£o de campo",
                texto: "Toda aÃƒÂ§ÃƒÂ£o territorial eficaz precisa de: 1. OBJETIVO CLARO (o que queremos atingir?), 2. PÃƒÅ¡BLICO ALVO (quem queremos alcanÃƒÂ§ar?), 3. LOCAL ESTRATÃƒâ€°GICO (onde esse pÃƒÂºblico estÃƒÂ¡?), 4. MATERIAL ADEQUADO (o que vamos entregar/falar?), 5. REGISTRO (como vamos documentar e reportar?)"
              },
              {
                subtitulo: "Como escolher o local certo",
                texto: "Os melhores locais para aÃƒÂ§ÃƒÂ£o de campo sÃƒÂ£o onde hÃƒÂ¡ fluxo NATURAL de pessoas: entradas de metrÃƒÂ´/ÃƒÂ´nibus nos horÃƒÂ¡rios de pico, feiras livres, saÃƒÂ­das de escola, UBS nos dias de maior movimento. Evite locais que exijam que as pessoas parem Ã¢â‚¬â€ prefira onde elas jÃƒÂ¡ param naturalmente."
              },
              {
                subtitulo: "FormaÃƒÂ§ÃƒÂ£o do grupo de campo",
                texto: "Para uma aÃƒÂ§ÃƒÂ£o eficaz, nunca envie voluntÃƒÂ¡rios sozinhos. O mÃƒÂ­nimo ÃƒÂ© dupla. Para pontos de alto fluxo, o ideal ÃƒÂ© grupos de 4 a 6 pessoas com papÃƒÂ©is definidos: 1 abordagem ativa, 1 material, 1 registro/foto, 1 apoio. Mais que 8 pessoas num ponto cria confusÃƒÂ£o e pode intimidar."
              }
            ],
            pontoChave: "Uma aÃƒÂ§ÃƒÂ£o de campo bem planejada com 4 pessoas ÃƒÂ© mais eficaz que uma mal planejada com 40.",
            tempoLeitura: 12
          })
        },
        {
          id: generateId(),
          title: "Abordagem e Conversa de Convencimento",
          type: "LEITURA",
          display_order: 2,
          duration_min: 15,
          xp_reward: 60,
          content: JSON.stringify({
            secoes: [
              {
                subtitulo: "Os primeiros 10 segundos definem tudo",
                texto: "A abordagem ÃƒÂ© decisiva. Postura aberta, sorriso natural, voz firme mas nÃƒÂ£o agressiva. A frase de abertura nunca deve ser uma declaraÃƒÂ§ÃƒÂ£o Ã¢â‚¬â€ deve ser uma pergunta: 'Posso te falar rapidinho sobre uma proposta de saÃƒÂºde para o bairro?' ÃƒÂ© infinitamente melhor que 'Estou aqui para apresentar o Movimento MissÃƒÂ£o.'"
              },
              {
                subtitulo: "O script de 3 minutos",
                texto: "MINUTO 1 Ã¢â‚¬â€ CONEXÃƒÆ’O: Identifique um problema real da regiÃƒÂ£o. 'Vi que a UBS aqui estÃƒÂ¡ sempre cheia. Isso te afeta?' MINUTO 2 Ã¢â‚¬â€ PROPOSTA: Apresente a soluÃƒÂ§ÃƒÂ£o de forma simples. 'O Movimento MissÃƒÂ£o tem uma proposta especÃƒÂ­fica para isso que jÃƒÂ¡ foi implementada em X cidade.' MINUTO 3 Ã¢â‚¬â€ CONVITE: NÃƒÂ£o peÃƒÂ§a voto, peÃƒÂ§a curiosidade. 'Posso te enviar mais informaÃƒÂ§ÃƒÂµes? Tem um minuto para eu pegar seu contato?'"
              },
              {
                subtitulo: "Lidando com rejeiÃƒÂ§ÃƒÂ£o e hostilidade",
                texto: "A maioria das pessoas vai ignorar ou recusar. Isso ÃƒÂ© normal e esperado. Nunca insista apÃƒÂ³s a primeira recusa. Nunca responda hostilidade com hostilidade Ã¢â‚¬â€ isso prejudica o movimento e pode virar vÃƒÂ­deo viral negativo. Se alguÃƒÂ©m for agressivo, agradeÃƒÂ§a pela atenÃƒÂ§ÃƒÂ£o, recue gentilmente e documente o incidente."
              }
            ],
            pontoChave: "VocÃƒÂª nÃƒÂ£o estÃƒÂ¡ vendendo, estÃƒÂ¡ convidando. Cada nÃƒÂ£o gentil ÃƒÂ© melhor que um sim forÃƒÂ§ado.",
            tempoLeitura: 15
          })
        },
        {
          id: generateId(),
          title: "DocumentaÃƒÂ§ÃƒÂ£o e Reporte de Campo",
          type: "LEITURA",
          display_order: 3,
          duration_min: 8,
          xp_reward: 40,
          content: JSON.stringify({
            secoes: [
              {
                subtitulo: "Por que documentar ÃƒÂ© parte da missÃƒÂ£o",
                texto: "Cada aÃƒÂ§ÃƒÂ£o de campo nÃƒÂ£o documentada ÃƒÂ© uma aÃƒÂ§ÃƒÂ£o que nÃƒÂ£o existiu para a coordenaÃƒÂ§ÃƒÂ£o. O registro transforma aÃƒÂ§ÃƒÂ£o individual em inteligÃƒÂªncia coletiva. Quando vocÃƒÂª reporta que 'no ponto X ÃƒÂ s 7h hÃƒÂ¡ 200 pessoas em 20 minutos e a receptividade ao tema saÃƒÂºde ÃƒÂ© alta', vocÃƒÂª estÃƒÂ¡ ajudando a coordenaÃƒÂ§ÃƒÂ£o a alocar recursos melhor."
              },
              {
                subtitulo: "O checklist de reporte padrÃƒÂ£o",
                texto: "ApÃƒÂ³s toda aÃƒÂ§ÃƒÂ£o, registrar na plataforma: LOCAL EXATO (rua, nÃƒÂºmero ou ponto de referÃƒÂªncia), HORÃƒÂRIO (inÃƒÂ­cio e fim), EQUIPE (nÃƒÂºmero de voluntÃƒÂ¡rios), ALCANCE (estimativa de pessoas abordadas), MATERIAL DISTRIBUÃƒÂDO (quantidade), CONTATOS COLETADOS (nÃƒÂºmero), RECEPTIVIDADE GERAL (1 a 5 Ã¢â‚¬â€ insira um comentÃƒÂ¡rio breve), INCIDENTES (se houver), FOTO DE EVIDÃƒÅ NCIA (obrigatÃƒÂ³ria)."
              }
            ],
            pontoChave: "Documentar nÃƒÂ£o ÃƒÂ© burocracia Ã¢â‚¬â€ ÃƒÂ© o que transforma esforÃƒÂ§o individual em forÃƒÂ§a coletiva.",
            tempoLeitura: 8
          })
        }
      ]
    },
    {
      id: generateId(),
      slug: "presenca-digital",
      title: "MilitÃƒÂ¢ncia Digital",
      description: "Domine as ferramentas digitais para amplificar o movimento nas redes. Do conteÃƒÂºdo ao engajamento estratÃƒÂ©gico.",
      objective: "Ao concluir esta trilha, vocÃƒÂª produzirÃƒÂ¡ conteÃƒÂºdo digital consistente que representa bem o movimento.",
      level: "INTERMEDIARIO",
      category: "DIGITAL",
      total_xp: 260,
      duration_min: 65,
      display_order: 5,
      is_mandatory: 0,
      prerequisite_slug: "comunicacao-politica",
      accent_color: "#0277BD",
      modules: [
        {
          id: generateId(),
          title: "CriaÃƒÂ§ÃƒÂ£o de conteÃƒÂºdo para Instagram e TikTok",
          type: "LEITURA",
          display_order: 1,
          duration_min: 15,
          xp_reward: 50,
          content: JSON.stringify({
            secoes: [
              {
                subtitulo: "O poder do vÃƒÂ­deo curto",
                texto: "Instagram Reels e TikTok sÃƒÂ£o as ferramentas mais poderosas para alcance orgÃƒÂ¢nico hoje. Um vÃƒÂ­deo bem feito pode alcanÃƒÂ§ar milhares de pessoas fora da sua bolha."
              },
              {
                subtitulo: "Estrutura de um vÃƒÂ­deo de sucesso",
                texto: "1. GANCHO (0-3s): Chame atenÃƒÂ§ÃƒÂ£o. 2. VALOR (3-45s): Entregue a informaÃƒÂ§ÃƒÂ£o. 3. CTA (45-60s): PeÃƒÂ§a uma aÃƒÂ§ÃƒÂ£o."
              }
            ],
            pontoChave: "Seja autÃƒÂªntico. Pessoas seguem pessoas, nÃƒÂ£o logotipos.",
            tempoLeitura: 15
          })
        },
        {
          id: generateId(),
          title: "GestÃƒÂ£o de comunidades online",
          type: "LEITURA",
          display_order: 2,
          duration_min: 12,
          xp_reward: 50,
          content: JSON.stringify({
            secoes: [
              {
                subtitulo: "Comunidade vs. AudiÃƒÂªncia",
                texto: "AudiÃƒÂªncia assiste. Comunidade participa. Nosso objetivo ÃƒÂ© transformar seguidores em participantes ativos do movimento."
              }
            ],
            pontoChave: "Engajamento ÃƒÂ© uma via de mÃƒÂ£o dupla. Responda, pergunte, ouÃƒÂ§a.",
            tempoLeitura: 12
          })
        },
        {
          id: generateId(),
          title: "Quiz: EstratÃƒÂ©gia digital",
          type: "QUIZ",
          display_order: 3,
          duration_min: 10,
          xp_reward: 60,
          content: JSON.stringify({
            notaMinimaAprovacao: 70,
            tentativasMaximas: 3,
            questoes: [
              {
                id: "q1",
                pergunta: "Qual ÃƒÂ© a parte mais importante de um vÃƒÂ­deo curto?",
                alternativas: ["A trilha sonora", "Os primeiros 3 segundos (gancho)", "A qualidade da cÃƒÂ¢mera", "O nÃƒÂºmero de hashtags"],
                correta: 1,
                explicacao: "Se vocÃƒÂª nÃƒÂ£o prender a atenÃƒÂ§ÃƒÂ£o nos primeiros segundos, o usuÃƒÂ¡rio vai rolar para o prÃƒÂ³ximo vÃƒÂ­deo."
              }
            ]
          })
        },
        {
          id: generateId(),
          title: "PrÃƒÂ¡tica: Crie e publique um post",
          type: "PRATICA",
          display_order: 4,
          duration_min: 20,
          xp_reward: 100,
          content: JSON.stringify({
            instrucoes: "Crie um post para sua rede social preferida falando sobre o movimento.",
            desafio: "Crie um conteÃƒÂºdo original e envie o link ou o texto aqui.",
            tipoSubmissao: "TEXTO_OU_LINK",
            validacao: "MANUAL"
          })
        }
      ]
    },
    {
      id: generateId(),
      slug: "lideranca-de-nucleo",
      title: "LideranÃƒÂ§a e GestÃƒÂ£o de NÃƒÂºcleo",
      description: "Para quem estÃƒÂ¡ pronto para dar o prÃƒÂ³ximo passo: como organizar, motivar e manter um nÃƒÂºcleo local ativo e em crescimento.",
      objective: "Ao concluir esta trilha, vocÃƒÂª terÃƒÂ¡ as ferramentas para montar e liderar um nÃƒÂºcleo local com atÃƒÂ© 30 voluntÃƒÂ¡rios.",
      level: "AVANCADO",
      category: "LIDERANCA",
      total_xp: 400,
      duration_min: 110,
      display_order: 4,
      is_mandatory: 0,
      prerequisite_slug: "comunicacao-politica",
      accent_color: "#7B1FA2",
      modules: [
        {
          id: generateId(),
          title: "O que ÃƒÂ© um nÃƒÂºcleo e como montar o seu",
          type: "LEITURA",
          display_order: 1,
          duration_min: 15,
          xp_reward: 80,
          content: JSON.stringify({
            secoes: [
              {
                subtitulo: "DefiniÃƒÂ§ÃƒÂ£o de NÃƒÂºcleo",
                texto: "Um nÃƒÂºcleo ÃƒÂ© a cÃƒÂ©lula base do movimento. Ãƒâ€° onde a polÃƒÂ­tica acontece no dia a dia."
              }
            ],
            pontoChave: "Liderar ÃƒÂ© servir. O coordenador de nÃƒÂºcleo facilita o trabalho de todos.",
            tempoLeitura: 15
          })
        },
        {
          id: generateId(),
          title: "MotivaÃƒÂ§ÃƒÂ£o e retenÃƒÂ§ÃƒÂ£o de voluntÃƒÂ¡rios",
          type: "LEITURA",
          display_order: 2,
          duration_min: 20,
          xp_reward: 80,
          content: JSON.stringify({
            secoes: [
              {
                subtitulo: "Por que as pessoas ficam?",
                texto: "Pessoas ficam por causa do propÃƒÂ³sito, da comunidade e do reconhecimento."
              }
            ],
            pontoChave: "ReconheÃƒÂ§a publicamente, corrija privadamente.",
            tempoLeitura: 20
          })
        },
        {
          id: generateId(),
          title: "ReuniÃƒÂµes produtivas de nÃƒÂºcleo",
          type: "LEITURA",
          display_order: 3,
          duration_min: 12,
          xp_reward: 60,
          content: JSON.stringify({
            secoes: [
              {
                subtitulo: "Pauta e Tempo",
                texto: "Toda reuniÃƒÂ£o deve ter pauta clara e hora para acabar."
              }
            ],
            pontoChave: "Saia de toda reuniÃƒÂ£o com aÃƒÂ§ÃƒÂµes definidas e responsÃƒÂ¡veis.",
            tempoLeitura: 12
          })
        },
        {
          id: generateId(),
          title: "Quiz: GestÃƒÂ£o de lideranÃƒÂ§a",
          type: "QUIZ",
          display_order: 4,
          duration_min: 15,
          xp_reward: 80,
          content: JSON.stringify({
            notaMinimaAprovacao: 70,
            tentativasMaximas: 3,
            questoes: [
              {
                id: "q1",
                pergunta: "Qual ÃƒÂ© a principal funÃƒÂ§ÃƒÂ£o de um lÃƒÂ­der de nÃƒÂºcleo?",
                alternativas: ["Dar ordens", "Facilitar o trabalho dos voluntÃƒÂ¡rios", "Aparecer na mÃƒÂ­dia", "Decidir tudo sozinho"],
                correta: 1,
                explicacao: "No MissÃƒÂ£o, lideranÃƒÂ§a ÃƒÂ© serviÃƒÂ§o. O lÃƒÂ­der remove obstÃƒÂ¡culos e motiva a equipe."
              }
            ]
          })
        },
        {
          id: generateId(),
          title: "MissÃƒÂ£o Final: Monte seu nÃƒÂºcleo",
          type: "PRATICA",
          display_order: 5,
          duration_min: 30,
          xp_reward: 100,
          content: JSON.stringify({
            instrucoes: "Desenhe um plano para montar seu nÃƒÂºcleo local.",
            desafio: "Descreva como vocÃƒÂª pretende recrutar os primeiros 5 voluntÃƒÂ¡rios e qual serÃƒÂ¡ a primeira aÃƒÂ§ÃƒÂ£o do nÃƒÂºcleo.",
            tipoSubmissao: "TEXTO_OU_LINK",
            validacao: "MANUAL"
          })
        }
      ]
    }
  ];

  let moduleCount = 0;
  const stmtTrack = db.prepare(`
    INSERT INTO training_tracks (id, slug, title, description, objective, level, category, total_xp, duration_min, display_order, is_mandatory, accent_color, prerequisite_slug)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const stmtModule = db.prepare(`
    INSERT INTO training_modules (id, track_id, title, description, type, display_order, duration_min, xp_reward, content)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  tracks.forEach((t: any) => {
    stmtTrack.run(t.id, t.slug, t.title, t.description, t.objective, t.level, t.category, t.total_xp, t.duration_min, t.display_order, t.is_mandatory, t.accent_color, t.prerequisite_slug || null);
    t.modules.forEach((m: any) => {
      stmtModule.run(m.id, t.id, m.title, m.description || m.title, m.type, m.display_order, m.duration_min, m.xp_reward, m.content);
      moduleCount++;
    });
  });

  return { tracks: tracks.length, modules: moduleCount };
}



















