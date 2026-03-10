import { db } from '../db/index.js';

export type FluxoTipo = 
  | 'TAREFA_ATRIBUIDA' 
  | 'TAREFA_ENTREGUE' 
  | 'AVALIACAO_REALIZADA' 
  | 'CONVITE_ACEITO' 
  | 'ONBOARDING_CONCLUIDO' 
  | 'SELF_ASSESSMENT';

export async function processarFluxo(
  tipo: FluxoTipo,
  payload: Record<string, any>
): Promise<void> {
  console.log(`[Fluxo] Processando ${tipo}`, payload);
  
  switch (tipo) {
    case 'TAREFA_ATRIBUIDA':
      await fluxoTarefaAtribuida(payload);
      break;
    case 'TAREFA_ENTREGUE':
      await fluxoTarefaEntregue(payload);
      break;
    case 'AVALIACAO_REALIZADA':
      await fluxoAvaliacaoRealizada(payload);
      break;
    case 'CONVITE_ACEITO':
      await fluxoConviteAceito(payload);
      break;
    case 'ONBOARDING_CONCLUIDO':
      await fluxoOnboardingConcluido(payload);
      break;
    case 'SELF_ASSESSMENT':
      await fluxoSelfAssessment(payload);
      break;
  }
}

async function fluxoTarefaAtribuida(payload: any) {
  const { taskId, volunteerId, campaignId, sectorId } = payload;
  const task = db.prepare('SELECT title FROM campaign_tasks WHERE id = ?').get(taskId) as any;
  const sector = db.prepare('SELECT name FROM campaign_sectors WHERE id = ?').get(sectorId) as any;
  
  db.prepare(`
    INSERT INTO system_notifications (id, recipient_id, type, title, message, action_link, extra_data)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    Math.random().toString(36).substring(7),
    volunteerId,
    'TAREFA_ATRIBUIDA',
    '📋 Nova tarefa atribuída',
    `Você recebeu a tarefa: "${task.title}" no setor ${sector.name}.`,
    '/voluntario/funcao',
    JSON.stringify({ taskId, campaignId })
  );
}

async function fluxoTarefaEntregue(payload: any) {
  const { taskId, volunteerId, campaignId, sectorId } = payload;
  const task = db.prepare('SELECT title FROM campaign_tasks WHERE id = ?').get(taskId) as any;
  const volunteer = db.prepare('SELECT name FROM volunteers WHERE id = ?').get(volunteerId) as any;
  
  // Notify sector leader
  const leader = db.prepare(`
    SELECT volunteer_id FROM sector_members 
    WHERE sector_id = ? AND role = 'LIDER_SETOR'
  `).get(sectorId) as any;

  if (leader) {
    db.prepare(`
      INSERT INTO system_notifications (id, recipient_id, type, title, message, action_link, extra_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      Math.random().toString(36).substring(7),
      leader.volunteer_id,
      'TAREFA_ENTREGUE',
      '✅ Tarefa entregue para revisão',
      `${volunteer.name} entregou a tarefa: "${task.title}".`,
      `/coordenador/campanha/setor/${sectorId}/rh`,
      JSON.stringify({ taskId, volunteerId })
    );
  }
}

async function fluxoAvaliacaoRealizada(payload: any) {
  const { evaluationId, memberId, volunteerId, scoreGeneral, recommendation } = payload;
  const evaluator = db.prepare(`
    SELECT v.name FROM member_evaluations me
    JOIN volunteers v ON me.evaluator_id = v.id
    WHERE me.id = ?
  `).get(evaluationId) as any;

  // Notify volunteer
  db.prepare(`
    INSERT INTO system_notifications (id, recipient_id, type, title, message, action_link, extra_data)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    Math.random().toString(36).substring(7),
    volunteerId,
    'AVALIACAO_DISPONIVEL',
    '📊 Avaliação disponível',
    `${evaluator.name} avaliou sua performance. Seu score atual é ${scoreGeneral}.`,
    '/voluntario/funcao',
    JSON.stringify({ evaluationId })
  );

  // Update member score
  db.prepare('UPDATE sector_members SET performance_score = ? WHERE id = ?').run(scoreGeneral, memberId);

  // Handle promotion
  if (recommendation === 'PROMOVER_SUBLIDER') {
    // Logic for promotion pipeline could go here
    db.prepare(`
      INSERT INTO system_notifications (id, recipient_id, type, title, message, action_link)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      Math.random().toString(36).substring(7),
      volunteerId,
      'PROMOCAO_FUNCAO',
      '🌟 Parabéns! Você foi indicado para promoção',
      'Sua liderança foi reconhecida. Você iniciará o onboarding para Sublíder.',
      '/voluntario/funcao'
    );
  }
}

async function fluxoConviteAceito(payload: any) {
  const { invitationId, volunteerId, campaignId, sectorSlug, roleProfileId } = payload;
  
  const sector = db.prepare('SELECT id FROM campaign_sectors WHERE campaign_id = ? AND slug = ?').get(campaignId, sectorSlug) as any;
  
  if (!sector) return;

  const memberId = Math.random().toString(36).substring(7);
  
  // Create member
  db.prepare(`
    INSERT INTO sector_members (id, campaign_id, sector_id, volunteer_id, role_profile_id, role)
    VALUES (?, ?, ?, ?, ?, 'MEMBRO')
  `).run(memberId, campaignId, sector.id, volunteerId, roleProfileId);

  // Create onboarding
  if (roleProfileId) {
    db.prepare(`
      INSERT INTO role_onboardings (id, member_id, role_profile_id)
      VALUES (?, ?, ?)
    `).run(Math.random().toString(36).substring(7), memberId, roleProfileId);
  }

  // Notify leader
  const leader = db.prepare(`
    SELECT volunteer_id FROM sector_members 
    WHERE sector_id = ? AND role = 'LIDER_SETOR'
  `).get(sector.id) as any;

  if (leader) {
    const volunteer = db.prepare('SELECT name FROM volunteers WHERE id = ?').get(volunteerId) as any;
    db.prepare(`
      INSERT INTO system_notifications (id, recipient_id, type, title, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      Math.random().toString(36).substring(7),
      leader.volunteer_id,
      'CONVITE_ACEITO',
      '🤝 Novo membro no setor',
      `${volunteer.name} aceitou o convite e agora faz parte do seu time.`
    );
  }
}

async function fluxoOnboardingConcluido(payload: any) {
  const { onboardingId, volunteerId, memberId } = payload;
  
  db.prepare(`
    INSERT INTO system_notifications (id, recipient_id, type, title, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    Math.random().toString(36).substring(7),
    volunteerId,
    'ONBOARDING_CONCLUIDO',
    '🎉 Onboarding concluído!',
    'Parabéns! Você concluiu todas as etapas do seu onboarding funcional.'
  );
}

async function fluxoSelfAssessment(payload: any) {
  const { memberId, volunteerId, competencies } = payload;
  // Update competencies_eval in sector_members
  db.prepare('UPDATE sector_members SET competencies_eval = ? WHERE id = ?').run(
    JSON.stringify(competencies),
    memberId
  );
}
