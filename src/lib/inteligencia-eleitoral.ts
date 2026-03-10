export interface CidadeDados {
  cidade: string;
  estado: string;
  latitude: number;
  longitude: number;
  votos_2022: number;
  populacao_total: number;
  pct_jovens_16_34: number;
  pct_acesso_internet: number;
  pct_urbano: number;
  pct_ensino_superior: number;
  voluntarios_count: number;
  distancia_sede_km: number;
}

export type ClassificacaoCidade =
  | 'MOTOR'
  | 'DIAMANTE'
  | 'POLO'
  | 'APOSTA'
  | 'LATENTE'
  | 'BAIXA_PRIOR';

export type AcaoSugerida =
  | 'EVENTO_PRESENCIAL'
  | 'RECRUTAMENTO'
  | 'POLO_REGIONAL'
  | 'MONITORAR'
  | 'EXPANSAO_PRIORITARIA'
  | 'ACAO_DIGITAL';

export interface ScoresCidade {
  cidade: string;
  estado: string;
  icd: number;
  ipc: number;
  iir: number;
  ic: number;
  io: number;
  ivl: number;
  see_territorial: number;
  see_crescimento: number;
  see_mobilizacao: number;
  classificacao: ClassificacaoCidade;
  acao_sugerida: AcaoSugerida;
  votos_norm: number;
  populacao_norm: number;
  voluntarios_norm: number;
  distancia_norm: number;
}

export interface PesosEstrategicos {
  w_icd: number;
  w_ipc: number;
  w_iir: number;
}

export const PESOS_PREDEFINIDOS: Record<string, PesosEstrategicos> = {
  TERRITORIAL: { w_icd: 0.2, w_ipc: 0.3, w_iir: 0.5 },
  CRESCIMENTO: { w_icd: 0.45, w_ipc: 0.4, w_iir: 0.15 },
  MOBILIZACAO: { w_icd: 0.3, w_ipc: 0.2, w_iir: 0.5 },
  CUSTOM: { w_icd: 0.33, w_ipc: 0.34, w_iir: 0.33 },
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export function normalizarMinMax(valores: number[], valor: number): number {
  if (valores.length === 0) return 0;

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  if (max === min) return 0;

  return clamp01((valor - min) / (max - min));
}

export function normalizarArray(valores: number[]): number[] {
  if (valores.length === 0) return [];

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  if (max === min) return valores.map(() => 0);

  return valores.map((value) => clamp01((value - min) / (max - min)));
}

function toRad(graus: number): number {
  return graus * (Math.PI / 180);
}

export function calcularDistanciaHaversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calcularIC(voluntarios: number, votos: number): number {
  if (votos === 0) return voluntarios > 0 ? 10 : 0;
  return voluntarios / (votos / 1000);
}

export function classificarIC(ic: number): 'DESCOBERTA' | 'ADEQUADA' | 'BEM_SERVIDA' {
  if (ic < 0.5) return 'DESCOBERTA';
  if (ic <= 2.0) return 'ADEQUADA';
  return 'BEM_SERVIDA';
}

export function calcularIO(votos: number, voluntarios: number): number {
  return votos / (voluntarios + 1);
}

export function calcularICD(
  jovens_norm: number,
  internet_norm: number,
  urbano_norm: number,
  superior_norm: number,
  pesos = { w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 },
): number {
  return (
    pesos.w1 * jovens_norm +
    pesos.w2 * internet_norm +
    pesos.w3 * urbano_norm +
    pesos.w4 * superior_norm
  );
}

export function calcularIPC(populacao_norm: number, votos_norm: number): number {
  return populacao_norm * (1 - votos_norm);
}

export function calcularIIR(
  cidade: CidadeDados,
  todasCidades: CidadeDados[],
  raioMaxKm = 150,
): number {
  let soma = 0;

  for (const vizinha of todasCidades) {
    if (vizinha.cidade === cidade.cidade && vizinha.estado === cidade.estado) {
      continue;
    }

    const distancia = calcularDistanciaHaversine(
      cidade.latitude,
      cidade.longitude,
      vizinha.latitude,
      vizinha.longitude,
    );

    if (distancia > 0 && distancia <= raioMaxKm) {
      soma += vizinha.populacao_total / distancia;
    }
  }

  return soma;
}

export function calcularIVL(
  voluntarios: number,
  distancia_km: number,
  engajamento_medio = 0.7,
): number {
  if (distancia_km === 0) return voluntarios * engajamento_medio;
  return (voluntarios * engajamento_medio) / distancia_km;
}

export function calcularSEE(
  icd_norm: number,
  ipc_norm: number,
  iir_norm: number,
  pesos: PesosEstrategicos,
): number {
  const see = pesos.w_icd * icd_norm + pesos.w_ipc * ipc_norm + pesos.w_iir * iir_norm;
  return Math.round(see * 100);
}

export function classificarCidade(
  votos_norm: number,
  voluntarios_norm: number,
  iir_norm: number,
  crescimento_mes: number,
  icd: number,
  _see_crescimento: number,
): { classificacao: ClassificacaoCidade; acao: AcaoSugerida } {
  if (votos_norm >= 0.6 && voluntarios_norm >= 0.6) {
    return { classificacao: 'MOTOR', acao: 'EVENTO_PRESENCIAL' };
  }

  if (votos_norm >= 0.6 && voluntarios_norm < 0.4) {
    return { classificacao: 'DIAMANTE', acao: 'RECRUTAMENTO' };
  }

  if (iir_norm >= 0.6 && voluntarios_norm >= 0.3) {
    return { classificacao: 'POLO', acao: 'POLO_REGIONAL' };
  }

  if (crescimento_mes >= 20 && votos_norm < 0.4) {
    return { classificacao: 'APOSTA', acao: 'MONITORAR' };
  }

  if (icd >= 0.6 && voluntarios_norm < 0.3) {
    return { classificacao: 'LATENTE', acao: 'EXPANSAO_PRIORITARIA' };
  }

  return { classificacao: 'BAIXA_PRIOR', acao: 'ACAO_DIGITAL' };
}

export function calcularScoresTerritorial(
  cidades: CidadeDados[],
  latSede: number,
  lngSede: number,
  crescimentos: Record<string, number> = {},
): ScoresCidade[] {
  if (cidades.length === 0) return [];

  const todosVotos = cidades.map((c) => c.votos_2022);
  const todosPopulacao = cidades.map((c) => c.populacao_total);
  const todosVoluntarios = cidades.map((c) => c.voluntarios_count);
  const todosJovens = cidades.map((c) => c.pct_jovens_16_34);
  const todosInternet = cidades.map((c) => c.pct_acesso_internet);
  const todosUrbano = cidades.map((c) => c.pct_urbano);
  const todosSuperior = cidades.map((c) => c.pct_ensino_superior);

  const votosNorm = normalizarArray(todosVotos);
  const populacaoNorm = normalizarArray(todosPopulacao);
  const voluntariosNorm = normalizarArray(todosVoluntarios);
  const jovensNorm = normalizarArray(todosJovens);
  const internetNorm = normalizarArray(todosInternet);
  const urbanoNorm = normalizarArray(todosUrbano);
  const superiorNorm = normalizarArray(todosSuperior);

  const iirBrutos = cidades.map((cidade) => calcularIIR(cidade, cidades));
  const iirNorm = normalizarArray(iirBrutos);

  const distancias = cidades.map((cidade) =>
    calcularDistanciaHaversine(latSede, lngSede, cidade.latitude, cidade.longitude),
  );
  const distanciasNorm = normalizarArray(distancias);

  const ivlBrutos = cidades.map((cidade, index) =>
    calcularIVL(cidade.voluntarios_count, distancias[index]),
  );
  const ivlNorm = normalizarArray(ivlBrutos);

  const ipcBrutos = cidades.map((_, index) => calcularIPC(populacaoNorm[index], votosNorm[index]));
  const ipcNorm = normalizarArray(ipcBrutos);

  return cidades.map((cidade, index) => {
    const icd = calcularICD(jovensNorm[index], internetNorm[index], urbanoNorm[index], superiorNorm[index]);
    const ic = calcularIC(cidade.voluntarios_count, cidade.votos_2022);
    const io = calcularIO(cidade.votos_2022, cidade.voluntarios_count);

    const see_territorial = calcularSEE(icd, ipcNorm[index], iirNorm[index], PESOS_PREDEFINIDOS.TERRITORIAL);
    const see_crescimento = calcularSEE(icd, ipcNorm[index], iirNorm[index], PESOS_PREDEFINIDOS.CRESCIMENTO);
    const see_mobilizacao = calcularSEE(icd, ipcNorm[index], iirNorm[index], PESOS_PREDEFINIDOS.MOBILIZACAO);

    const chaveCidade = `${cidade.cidade}_${cidade.estado}`;
    const crescimentoMes = crescimentos[chaveCidade] ?? 0;

    const { classificacao, acao } = classificarCidade(
      votosNorm[index],
      voluntariosNorm[index],
      iirNorm[index],
      crescimentoMes,
      icd,
      see_crescimento,
    );

    return {
      cidade: cidade.cidade,
      estado: cidade.estado,
      icd: Math.round(icd * 100),
      ipc: Math.round(ipcNorm[index] * 100),
      iir: Math.round(iirNorm[index] * 100),
      ic: Math.round(ic * 10) / 10,
      io: Math.round(io),
      ivl: Math.round(ivlNorm[index] * 100),
      see_territorial,
      see_crescimento,
      see_mobilizacao,
      classificacao,
      acao_sugerida: acao,
      votos_norm: Math.round(votosNorm[index] * 100) / 100,
      populacao_norm: Math.round(populacaoNorm[index] * 100) / 100,
      voluntarios_norm: Math.round(voluntariosNorm[index] * 100) / 100,
      distancia_norm: Math.round(distanciasNorm[index] * 100) / 100,
    };
  });
}

export type ModoEstrategico = 'TERRITORIAL' | 'CRESCIMENTO' | 'MOBILIZACAO';

export function filtrarCidadesPorClassificacao(
  scores: ScoresCidade[],
  classificacoes: ClassificacaoCidade[],
  modo: ModoEstrategico = 'CRESCIMENTO',
  limite = 10,
): ScoresCidade[] {
  const campo =
    modo === 'TERRITORIAL'
      ? 'see_territorial'
      : modo === 'MOBILIZACAO'
        ? 'see_mobilizacao'
        : 'see_crescimento';

  return scores
    .filter((score) => classificacoes.includes(score.classificacao))
    .sort((a, b) => b[campo] - a[campo])
    .slice(0, limite);
}

export function gerarRecomendacaoMensal(
  scores: ScoresCidade[],
  modo: ModoEstrategico = 'CRESCIMENTO',
): {
  cidades: ScoresCidade[];
  resumo: string;
  prioridade: ModoEstrategico;
} {
  const diamantes = filtrarCidadesPorClassificacao(scores, ['DIAMANTE'], modo, 2);
  const motores = filtrarCidadesPorClassificacao(scores, ['MOTOR'], modo, 1);
  const latentes = filtrarCidadesPorClassificacao(scores, ['LATENTE'], modo, 2);

  const campo: 'see_territorial' | 'see_crescimento' | 'see_mobilizacao' =
    modo === 'TERRITORIAL' ? 'see_territorial' : modo === 'MOBILIZACAO' ? 'see_mobilizacao' : 'see_crescimento';

  const recomendadas: ScoresCidade[] = [];
  const chaves = new Set<string>();

  const pushUnico = (cidade: ScoresCidade): void => {
    const chave = `${cidade.cidade}_${cidade.estado}`;
    if (chaves.has(chave)) return;
    chaves.add(chave);
    recomendadas.push(cidade);
  };

  for (const cidade of [...diamantes, ...motores, ...latentes]) {
    pushUnico(cidade);
    if (recomendadas.length >= 5) break;
  }

  if (recomendadas.length < 5) {
    const fallback = [...scores].sort((a, b) => b[campo] - a[campo]);
    for (const cidade of fallback) {
      pushUnico(cidade);
      if (recomendadas.length >= 5) break;
    }
  }

  const mapaAcoes: Record<ModoEstrategico, string> = {
    TERRITORIAL: 'presenca territorial e eventos',
    CRESCIMENTO: 'expansao e recrutamento',
    MOBILIZACAO: 'mobilizacao e acao imediata',
  };

  return {
    cidades: recomendadas,
    resumo:
      `Com foco em ${mapaAcoes[modo]}, as ${recomendadas.length} cidades ` +
      'recomendadas tem maior potencial de retorno estrategico este mes.',
    prioridade: modo,
  };
}
