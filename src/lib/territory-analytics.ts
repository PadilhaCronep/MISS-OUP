export function calcularHealthScore(dados: {
  totalVoluntarios: number;
  voluntariosAtivos: number;
  missoesCompletadasMes: number;
  crescimentoPercentual: number;
  temCoordenador: boolean;
}): number {
  // Componente 1: Taxa de atividade (peso 35%)
  const taxaAtividade = dados.totalVoluntarios > 0
    ? (dados.voluntariosAtivos / dados.totalVoluntarios) * 100
    : 0;
  const scoreAtividade = Math.min(taxaAtividade, 100) * 0.35;

  // Componente 2: Produtividade de missões (peso 30%)
  const missoesPorAtivo = dados.voluntariosAtivos > 0
    ? dados.missoesCompletadasMes / dados.voluntariosAtivos
    : 0;
  const scoreMissoes = Math.min(missoesPorAtivo * 20, 100) * 0.30;

  // Componente 3: Crescimento (peso 20%)
  const crescimento = Math.max(-100, Math.min(dados.crescimentoPercentual, 100));
  const scoreCrescimento = ((crescimento + 100) / 2) * 0.20;

  // Componente 4: Liderança (peso 15%)
  const scoreLideranca = dados.temCoordenador ? 15 : 0;

  return Math.round(scoreAtividade + scoreMissoes + scoreCrescimento + scoreLideranca);
}
