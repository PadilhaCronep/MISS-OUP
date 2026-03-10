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
  voluntariosAtivos: number
  voluntariosNovos: number
  voluntariosInativos: number
  taxaAtividade: number

  // Métricas de missões
  missoesCompletadasMes: number
  missoesAbertas: number
  submissoesPendentes: number
  mediaXPSemana: number

  // Liderança
  temCoordenador: boolean
  nomeCoordenador: string | null
  lideresEmergentes: number
  topVoluntario: {
    nome: string
    xpTotal: number
    nivelAtual: number
  } | null

  // Scores calculados
  healthScore: number
  momentumScore: number
  leadershipRatio: number
  engagementScore: number

  // Tendência temporal
  tendencia: {
    semana1: number
    semana2: number
    semana3: number
    semana4: number
  }
  tendenciaDirecao: 'CRESCIMENTO' | 'ESTAVEL' | 'QUEDA'
  tendenciaPercentual: number

  // Alertas da cidade
  alertas: Array<{
    tipo: 'SEM_COORDENADOR' | 'QUEDA_ENGAJAMENTO' | 'INATIVOS_CRITICO' | 'SEM_MISSAO_ATIVA' | 'POTENCIAL_IGNORADO'
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
