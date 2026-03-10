export interface DadosCidadeMapa {
  // Identificação
  cidade: string
  estado: string
  cidadeId: string

  // Coordenadas geográficas
  lat: number
  lng: number

  // Métricas de voluntários
  totalVoluntarios: number
  voluntariosAtivos: number        // ativos nos últimos 30 dias
  voluntariosNovos: number         // cadastrados nos últimos 30 dias
  voluntariosInativos: number      // sem atividade há 30+ dias
  taxaAtividade: number            // % ativos / total

  // Métricas de missões
  missoesCompletadasMes: number
  missoesAbertas: number
  submissoesPendentes: number
  mediaXPSemana: number

  // Liderança
  temCoordenador: boolean
  nomeCoordenador: string | null
  lideresEmergentes: number        // leadershipScore >= 70
  topVoluntario: {
    nome: string
    xpTotal: number
    nivelAtual: number
  } | null

  // Scores calculados
  healthScore: number              // 0 a 100
  momentumScore: number            // crescimento: -100 a +100
  leadershipRatio: number          // líderes / total (%)
  engagementScore: number          // profundidade do engajamento

  // Tendência temporal (últimas 4 semanas)
  tendencia: {
    semana1: number   // missões na semana mais antiga
    semana2: number
    semana3: number
    semana4: number   // semana mais recente
  }
  tendenciaDirecao: 'CRESCIMENTO' | 'ESTAVEL' | 'QUEDA'
  tendenciaPercentual: number      // % de variação semana4 vs semana1

  // Alertas da cidade
  alertas: Array<{
    tipo: 'SEM_COORDENADOR' | 'QUEDA_ENGAJAMENTO' | 'INATIVOS_CRITICO'
          | 'SEM_MISSAO_ATIVA' | 'POTENCIAL_IGNORADO'
    severidade: 'CRITICO' | 'ATENCAO' | 'OPORTUNIDADE'
    mensagem: string
  }>

  // Classificação estratégica
  classificacao: 'FORTALEZA' | 'CONSOLIDADA' | 'ATENCAO' | 'CRITICA' | 'OPORTUNIDADE' | 'DORMINDO'
}

export interface RespostaMapa {
  estado: string
  geradoEm: string
  totalCidades: number
  resumoEstado: {
    totalVoluntarios: number
    totalAtivos: number
    healthMedio: number
    cidadesCriticas: number
    cidadesSemCoordenador: number
    oportunidadesNaoExploradas: number
  }
  cidades: DadosCidadeMapa[]
}

export function classificarCidade(dados: Partial<DadosCidadeMapa>): DadosCidadeMapa['classificacao'] {
  const { healthScore = 0, momentumScore = 0, totalVoluntarios = 0, taxaAtividade = 0 } = dados

  if (healthScore >= 85 && momentumScore > 10) return 'FORTALEZA'
  if (healthScore >= 70) return 'CONSOLIDADA'
  if (totalVoluntarios > 20 && taxaAtividade < 30) return 'DORMINDO'
  if (totalVoluntarios < 10 && momentumScore > 20) return 'OPORTUNIDADE'
  if (healthScore < 40) return 'CRITICA'
  return 'ATENCAO'
}

export const COORDENADAS_CIDADES: Record<string, { lat: number; lng: number }> = {
  // SP
  'São Paulo':        { lat: -23.5505, lng: -46.6333 },
  'Campinas':         { lat: -22.9056, lng: -47.0608 },
  'Santo André':      { lat: -23.6639, lng: -46.5383 },
  'Sorocaba':         { lat: -23.5015, lng: -47.4526 },
  'Santos':           { lat: -23.9618, lng: -46.3322 },
  'Ribeirão Preto':   { lat: -21.1775, lng: -47.8103 },
  // RJ
  'Rio de Janeiro':   { lat: -22.9068, lng: -43.1729 },
  'Niterói':          { lat: -22.8833, lng: -43.1036 },
  'Nova Iguaçu':      { lat: -22.7592, lng: -43.4511 },
  'Duque de Caxias':  { lat: -22.7856, lng: -43.3117 },
  'Petrópolis':       { lat: -22.5044, lng: -43.1786 },
  // MG
  'Belo Horizonte':   { lat: -19.9167, lng: -43.9345 },
  'Uberlândia':       { lat: -18.9186, lng: -48.2772 },
  'Contagem':         { lat: -19.9317, lng: -44.0536 },
  'Juiz de Fora':     { lat: -21.7642, lng: -43.3503 },
  // RS
  'Porto Alegre':     { lat: -30.0346, lng: -51.2177 },
  'Caxias do Sul':    { lat: -29.1678, lng: -51.1794 },
  'Pelotas':          { lat: -31.7654, lng: -52.3376 },
  'Canoas':           { lat: -29.9178, lng: -51.1839 },
  // BA
  'Salvador':               { lat: -12.9714, lng: -38.5014 },
  'Feira de Santana':       { lat: -12.2664, lng: -38.9663 },
  'Vitória da Conquista':   { lat: -14.8619, lng: -40.8444 },
  // PE
  'Recife':           { lat: -8.0476, lng: -34.8770 },
  'Caruaru':          { lat: -8.2760, lng: -35.9753 },
  'Petrolina':        { lat: -9.3983, lng: -40.5022 },
  // CE
  'Fortaleza':              { lat: -3.7172, lng: -38.5433 },
  'Caucaia':                { lat: -3.7361, lng: -38.6531 },
  'Juazeiro do Norte':      { lat: -7.2136, lng: -39.3153 },
  // GO
  'Goiânia':                { lat: -16.6864, lng: -49.2643 },
  'Aparecida de Goiânia':   { lat: -16.8234, lng: -49.2436 },
  'Anápolis':               { lat: -16.3281, lng: -48.9528 },
  // PR
  'Curitiba':         { lat: -25.4284, lng: -49.2733 },
  'Londrina':         { lat: -23.3045, lng: -51.1696 },
  // SC
  'Florianópolis':    { lat: -27.5954, lng: -48.5480 },
  'Joinville':        { lat: -26.3044, lng: -48.8487 },
  // DF
  'Brasília':         { lat: -15.7801, lng: -47.9292 },
}
