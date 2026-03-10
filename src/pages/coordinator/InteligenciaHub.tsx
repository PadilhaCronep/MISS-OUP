import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Brain, Filter, MapPin, RefreshCw, Sparkles, Target, Users, Vote } from 'lucide-react';
import { apiClient } from '../../lib/api-client.ts';
import { usePageTitle } from '../../hooks/usePageTitle.ts';
import { useToast } from '../../components/ui/ToastProvider.tsx';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader.tsx';
import { ErrorState } from '../../components/ui/ErrorState.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import {
  calcularDistanciaHaversine,
  type ModoEstrategico,
} from '../../lib/inteligencia-eleitoral.ts';
import {
  MapaInteligenciaEleitoral,
  type ScoreMapaCidade,
} from '../../components/coordinator/mapa/MapaInteligenciaEleitoral.tsx';
import { RankingCidades } from '../../components/coordinator/inteligencia/RankingCidades.tsx';
import { RecomendacaoMensal } from '../../components/coordinator/inteligencia/RecomendacaoMensal.tsx';
import { FormularioQuestionario } from '../../components/coordinator/inteligencia/FormularioQuestionario.tsx';

type TabAtiva = 'mapa' | 'ranking' | 'questionarios';

type CategoriaEstrategica = 'MOTOR' | 'DIAMANTE' | 'OPORTUNIDADE' | 'IRRADIADORA' | 'BASE';
type MapaVisualizacao = 'score' | 'votos' | 'voluntarios';

interface ScoreCidadeEnriquecida extends ScoreMapaCidade {
  score_modo: number;
  distancia_sede_km: number;
  indice_cobertura_raw: number;
  indice_oportunidade_raw: number;
  potencial_demografico: number;
  categoria_estrategica: CategoriaEstrategica;
}

interface ScoresResponse {
  scores: ScoreMapaCidade[];
  total: number;
  modo: ModoEstrategico;
}

interface InvestirAgoraResponse {
  modo: ModoEstrategico;
  gerado_em: string;
  resumo: string;
  eventos_presenciais: ScoreMapaCidade[];
  crescimento_base: ScoreMapaCidade[];
  potencial_estrategico: ScoreMapaCidade[];
}

interface FiltrosTerritoriais {
  estado: string;
  populacaoMinima: number;
  votosMinimos: number;
  voluntariosMinimos: number;
  distanciaMaxima: number;
  scoreMinimo: number;
}

const MODOS: Array<{ key: ModoEstrategico; label: string; pesos: string }> = [
  { key: 'TERRITORIAL', label: 'Territorial', pesos: 'ICD 20% | IPC 30% | IIR 50%' },
  { key: 'CRESCIMENTO', label: 'Crescimento', pesos: 'ICD 45% | IPC 40% | IIR 15%' },
  { key: 'MOBILIZACAO', label: 'Mobilizacao', pesos: 'ICD 30% | IPC 20% | IIR 50%' },
];

const FILTROS_INICIAIS: FiltrosTerritoriais = {
  estado: 'TODOS',
  populacaoMinima: 0,
  votosMinimos: 0,
  voluntariosMinimos: 0,
  distanciaMaxima: 800,
  scoreMinimo: 0,
};

const SEDE_CAMPANHA = {
  lat: -23.5505,
  lng: -46.6333,
};

const cityKey = (cidade: Pick<ScoreMapaCidade, 'cidade' | 'estado'>): string => `${cidade.cidade}_${cidade.estado}`;

const valorScoreModo = (cidade: ScoreMapaCidade, modo: ModoEstrategico): number => {
  if (modo === 'TERRITORIAL') return cidade.see_territorial;
  if (modo === 'MOBILIZACAO') return cidade.see_mobilizacao;
  return cidade.see_crescimento;
};

const classificarEstrategia = (cidade: ScoreMapaCidade): CategoriaEstrategica => {
  if (cidade.classificacao === 'MOTOR') return 'MOTOR';
  if (cidade.classificacao === 'DIAMANTE') return 'DIAMANTE';
  if (cidade.classificacao === 'POLO' || cidade.iir >= 60) return 'IRRADIADORA';
  if (cidade.classificacao === 'LATENTE' || cidade.classificacao === 'APOSTA' || cidade.ipc >= 60) return 'OPORTUNIDADE';
  return 'BASE';
};

const MiniBarList: React.FC<{ title: string; data: Array<{ label: string; value: number }>; colorClass: string }> = ({
  title,
  data,
  colorClass,
}) => {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="rounded-xl border border-white/10 bg-[#111111] p-4">
      <h3 className="text-sm font-bold text-white mb-3">{title}</h3>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
              <span className="truncate pr-2">{item.label}</span>
              <span className="font-semibold text-white">{item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div className={`h-full ${colorClass}`} style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const InteligenciaHub: React.FC = () => {
  usePageTitle('Inteligencia Territorial');

  const toast = useToast();
  const [scores, setScores] = useState<ScoreMapaCidade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modo, setModo] = useState<ModoEstrategico>('CRESCIMENTO');
  const [tabAtiva, setTabAtiva] = useState<TabAtiva>('mapa');
  const [recalculando, setRecalculando] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosTerritoriais>(FILTROS_INICIAIS);
  const [selectedCityKey, setSelectedCityKey] = useState<string | null>(null);
  const [investindoAgora, setInvestindoAgora] = useState(false);
  const [mapaVisualizacao, setMapaVisualizacao] = useState<MapaVisualizacao>('score');
  const [investirAgora, setInvestirAgora] = useState<InvestirAgoraResponse | null>(null);

  const carregarScores = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    const result = await apiClient.get<ScoresResponse>(
      `/api/inteligencia/scores?modo=${modo}&limite=400`,
      { signal },
    );

    if (signal?.aborted) return;

    if (result.error || !result.data) {
      setError(result.error ?? 'Falha ao carregar scores.');
      setScores([]);
      setLoading(false);
      return;
    }

    setScores(result.data.scores ?? []);
    setLoading(false);
  }, [modo]);

  useEffect(() => {
    const controller = new AbortController();
    void carregarScores(controller.signal);
    return () => controller.abort();
  }, [carregarScores]);

  const handleRecalcular = async (): Promise<void> => {
    setRecalculando(true);
    const result = await apiClient.post<{ sucesso: boolean; total_cidades: number }>('/api/inteligencia/recalcular', {});

    if (result.error || !result.data?.sucesso) {
      toast.error(result.error ?? 'Nao foi possivel recalcular os scores.');
      setRecalculando(false);
      return;
    }

    toast.success(`Scores recalculados para ${result.data.total_cidades} cidades.`);
    await carregarScores();
    setRecalculando(false);
  };

  const handleInvestirAgora = async (): Promise<void> => {
    setInvestindoAgora(true);
    const result = await apiClient.get<InvestirAgoraResponse>(`/api/inteligencia/investir-agora?modo=${modo}&limite=10`);

    if (result.error || !result.data) {
      toast.error(result.error ?? 'Nao foi possivel gerar prioridades de investimento.');
      setInvestindoAgora(false);
      return;
    }

    setInvestirAgora(result.data);
    toast.success('Analise ONDE INVESTIR AGORA atualizada.');
    setInvestindoAgora(false);
  };

  const scoresEnriquecidos = useMemo<ScoreCidadeEnriquecida[]>(() => {
    return scores.map((score) => {
      const votos = Number(score.votos_2022 ?? 0);
      const voluntarios = Number(score.voluntarios_count_real ?? 0);
      const populacao = Number(score.populacao_total ?? 0);
      const jovens = Number(score.pct_jovens_16_34 ?? 0);
      const internet = Number(score.pct_acesso_internet ?? 0);

      const distancia =
        typeof score.latitude === 'number' && typeof score.longitude === 'number'
          ? calcularDistanciaHaversine(SEDE_CAMPANHA.lat, SEDE_CAMPANHA.lng, score.latitude, score.longitude)
          : Number.POSITIVE_INFINITY;

      const potencialDemografico = Math.round((jovens * 0.55 + internet * 0.45));
      const indiceCobertura = votos > 0 ? voluntarios / votos : voluntarios > 0 ? 1 : 0;
      const indiceOportunidade = votos / (voluntarios + 1);

      return {
        ...score,
        score_modo: valorScoreModo(score, modo),
        distancia_sede_km: Number.isFinite(distancia) ? Number(distancia.toFixed(1)) : 9999,
        indice_cobertura_raw: Number(indiceCobertura.toFixed(4)),
        indice_oportunidade_raw: Number(indiceOportunidade.toFixed(1)),
        potencial_demografico: Math.max(0, Math.min(100, potencialDemografico)),
        categoria_estrategica: classificarEstrategia(score),
        populacao_total: populacao,
      };
    });
  }, [scores, modo]);

  const estadosDisponiveis = useMemo(() => {
    return Array.from(new Set(scoresEnriquecidos.map((score) => score.estado))).sort();
  }, [scoresEnriquecidos]);

  const scoresFiltrados = useMemo(() => {
    return scoresEnriquecidos.filter((score) => {
      if (filtros.estado !== 'TODOS' && score.estado !== filtros.estado) return false;
      if (Number(score.populacao_total ?? 0) < filtros.populacaoMinima) return false;
      if (Number(score.votos_2022 ?? 0) < filtros.votosMinimos) return false;
      if (Number(score.voluntarios_count_real ?? 0) < filtros.voluntariosMinimos) return false;
      if (score.distancia_sede_km > filtros.distanciaMaxima) return false;
      if (score.score_modo < filtros.scoreMinimo) return false;
      return true;
    });
  }, [scoresEnriquecidos, filtros]);

  useEffect(() => {
    if (scoresFiltrados.length === 0) {
      setSelectedCityKey(null);
      return;
    }

    const hasSelected = selectedCityKey && scoresFiltrados.some((score) => cityKey(score) === selectedCityKey);
    if (!hasSelected) {
      setSelectedCityKey(cityKey(scoresFiltrados[0]));
    }
  }, [scoresFiltrados, selectedCityKey]);

  const cidadeSelecionada = useMemo(() => {
    if (!selectedCityKey) return null;
    return scoresFiltrados.find((score) => cityKey(score) === selectedCityKey) ?? null;
  }, [scoresFiltrados, selectedCityKey]);

  const kpis = useMemo(() => {
    return {
      total: scoresFiltrados.length,
      motores: scoresFiltrados.filter((score) => score.categoria_estrategica === 'MOTOR').length,
      diamantes: scoresFiltrados.filter((score) => score.categoria_estrategica === 'DIAMANTE').length,
      oportunidades: scoresFiltrados.filter((score) => score.categoria_estrategica === 'OPORTUNIDADE').length,
      irradiadoras: scoresFiltrados.filter((score) => score.categoria_estrategica === 'IRRADIADORA').length,
    };
  }, [scoresFiltrados]);

  const modoAtual = MODOS.find((item) => item.key === modo) ?? MODOS[1];

  const rankingTop = useMemo(() => {
    return [...scoresFiltrados]
      .sort((a, b) => b.score_modo - a.score_modo)
      .slice(0, 10)
      .map((item) => ({ label: `${item.cidade}/${item.estado}`, value: item.score_modo }));
  }, [scoresFiltrados]);

  const crescimentoBase = useMemo(() => {
    return [...scoresFiltrados]
      .sort((a, b) => b.ipc - a.ipc)
      .slice(0, 10)
      .map((item) => ({ label: `${item.cidade}/${item.estado}`, value: item.ipc }));
  }, [scoresFiltrados]);

  const votosPorClassificacao = useMemo(() => {
    const map = new Map<string, number>();
    for (const score of scoresFiltrados) {
      const chave = score.classificacao;
      map.set(chave, (map.get(chave) ?? 0) + Number(score.votos_2022 ?? 0));
    }

    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [scoresFiltrados]);
  const distribuicaoOportunidade = useMemo(() => {
    const base: Record<CategoriaEstrategica, number> = {
      MOTOR: 0,
      DIAMANTE: 0,
      OPORTUNIDADE: 0,
      IRRADIADORA: 0,
      BASE: 0,
    };

    for (const score of scoresFiltrados) {
      base[score.categoria_estrategica] += 1;
    }

    return Object.entries(base)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [scoresFiltrados]);
  const panoramaGlobal = useMemo(() => {
    const votos = scoresFiltrados.reduce((acc, score) => acc + Number(score.votos_2022 ?? 0), 0);
    const voluntarios = scoresFiltrados.reduce((acc, score) => acc + Number(score.voluntarios_count_real ?? 0), 0);
    const populacao = scoresFiltrados.reduce((acc, score) => acc + Number(score.populacao_total ?? 0), 0);

    return {
      votos,
      voluntarios,
      populacao,
      cidades: scoresFiltrados.length,
    };
  }, [scoresFiltrados]);

  if (loading && scores.length === 0) {
    return (
      <div className="space-y-4">
        <SkeletonLoader variant="kpi" count={4} />
        <SkeletonLoader variant="card" count={1} className="h-[560px]" />
      </div>
    );
  }

  if (error && scores.length === 0) {
    return <ErrorState mensagem={error} onRetry={() => void carregarScores()} />;
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-[#F5C400]" /> Inteligencia Territorial
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Centro de inteligencia territorial de campanha | {scoresFiltrados.length} cidades em analise
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {MODOS.map((item) => (
              <button
                key={item.key}
                onClick={() => setModo(item.key)}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  modo === item.key
                    ? 'bg-[#F5C400] text-black'
                    : 'bg-[#1A1A1A] text-zinc-300 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => void handleRecalcular()}
            disabled={recalculando}
            aria-busy={recalculando}
            className="inline-flex items-center gap-2 rounded-lg bg-[#F5C400] px-4 py-2 text-sm font-bold text-black hover:bg-yellow-400 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${recalculando ? 'animate-spin' : ''}`} />
            {recalculando ? 'Recalculando...' : 'Recalcular Scores'}
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Cidades analisadas', value: kpis.total, color: 'text-white' },
          { label: 'Cidades motor', value: kpis.motores, color: 'text-green-400' },
          { label: 'Cidades diamante', value: kpis.diamantes, color: 'text-blue-400' },
          { label: 'Cidades oportunidade', value: kpis.oportunidades, color: 'text-yellow-400' },
          { label: 'Cidades irradiadoras', value: kpis.irradiadoras, color: 'text-cyan-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">{kpi.label}</p>
            <p className={`mt-2 text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </section>

      <RecomendacaoMensal modo={modo} />

      {investirAgora ? (
        <section className="rounded-2xl border border-[#F5C400]/30 bg-[#1A1A1A] p-4">
          <div className="mb-3">
            <h2 className="text-sm font-black text-[#F5C400] uppercase tracking-wider">Onde investir agora</h2>
            <p className="text-xs text-zinc-400">{investirAgora.resumo}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-bold text-white mb-2">Top 10 eventos presenciais</p>
              <div className="space-y-1.5 text-xs text-zinc-300">
                {investirAgora.eventos_presenciais.slice(0, 10).map((cidade, index) => (
                  <div key={`evento_${cityKey(cidade)}`} className="flex justify-between gap-2">
                    <span>{index + 1}. {cidade.cidade}</span>
                    <span className="text-[#F5C400]">{cidade.see_territorial}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-bold text-white mb-2">Top 10 crescimento de base</p>
              <div className="space-y-1.5 text-xs text-zinc-300">
                {investirAgora.crescimento_base.slice(0, 10).map((cidade, index) => (
                  <div key={`base_${cityKey(cidade)}`} className="flex justify-between gap-2">
                    <span>{index + 1}. {cidade.cidade}</span>
                    <span className="text-[#F5C400]">{cidade.see_crescimento}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-bold text-white mb-2">Top 10 potencial estrategico</p>
              <div className="space-y-1.5 text-xs text-zinc-300">
                {investirAgora.potencial_estrategico.slice(0, 10).map((cidade, index) => (
                  <div key={`pot_${cityKey(cidade)}`} className="flex justify-between gap-2">
                    <span>{index + 1}. {cidade.cidade}</span>
                    <span className="text-[#F5C400]">{valorScoreModo(cidade, modo)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {error ? <ErrorState mensagem={error} onRetry={() => void carregarScores()} compact /> : null}

      {scoresFiltrados.length === 0 ? (
        <EmptyState
          icone={<Brain className="w-6 h-6" />}
          titulo="Sem cidades para os filtros selecionados"
          subtitulo="Ajuste os filtros territoriais ou recalcule os scores."
          acao={{ label: 'Limpar filtros', onClick: () => setFiltros(FILTROS_INICIAIS) }}
        />
      ) : (
        <section className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
            {[
              { id: 'mapa', label: 'Mapa estrategico' },
              { id: 'ranking', label: 'Ranking de cidades' },
              { id: 'questionarios', label: 'Questionarios de campo' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabAtiva(tab.id as TabAtiva)}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  tabAtiva === tab.id
                    ? 'bg-[#F5C400] text-black'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {tabAtiva === 'mapa' && (
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
                <aside className="rounded-2xl border border-white/10 bg-[#050607] p-4 h-fit xl:sticky xl:top-4">
                  <button
                    onClick={() => void handleInvestirAgora()}
                    disabled={investindoAgora}
                    className="w-full rounded-lg bg-[#F5C400] px-4 py-3 text-sm font-black text-black hover:bg-yellow-400 disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      {investindoAgora ? 'ANALISANDO...' : 'ONDE INVESTIR AGORA'}
                    </span>
                  </button>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-zinc-500 mb-3">Visualizacao do mapa</p>
                    <div className="space-y-2">
                      {([
                        { id: 'score', label: 'Score Estrategico' },
                        { id: 'votos', label: 'Densidade de Votos' },
                        { id: 'voluntarios', label: 'Densidade de Voluntarios' },
                      ] as Array<{ id: MapaVisualizacao; label: string }>).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setMapaVisualizacao(item.id)}
                          className={`w-full rounded-md border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                            mapaVisualizacao === item.id
                              ? 'border-white/20 bg-zinc-800 text-white'
                              : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-zinc-500 mb-3">Filtros</p>

                    <label className="text-xs text-zinc-400 block mb-3">
                      Estado
                      <select
                        value={filtros.estado}
                        onChange={(event) => setFiltros((prev) => ({ ...prev, estado: event.target.value }))}
                        className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 px-2 py-2 text-sm text-white"
                      >
                        <option value="TODOS">Todos os Estados</option>
                        {estadosDisponiveis.map((estado) => (
                          <option key={estado} value={estado}>{estado}</option>
                        ))}
                      </select>
                    </label>

                    <div className="space-y-3">
                      <label className="block">
                        <span className="text-xs text-zinc-400">Populacao Minima: {filtros.populacaoMinima.toLocaleString('pt-BR')}</span>
                        <input
                          type="range"
                          min={0}
                          max={2000000}
                          step={10000}
                          value={filtros.populacaoMinima}
                          onChange={(event) => setFiltros((prev) => ({ ...prev, populacaoMinima: Number(event.target.value) }))}
                          className="mt-1 w-full accent-[#F5C400]"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs text-zinc-400">Votos Minimos: {filtros.votosMinimos.toLocaleString('pt-BR')}</span>
                        <input
                          type="range"
                          min={0}
                          max={15000}
                          step={50}
                          value={filtros.votosMinimos}
                          onChange={(event) => setFiltros((prev) => ({ ...prev, votosMinimos: Number(event.target.value) }))}
                          className="mt-1 w-full accent-[#F5C400]"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs text-zinc-400">Voluntarios Minimos: {filtros.voluntariosMinimos.toLocaleString('pt-BR')}</span>
                        <input
                          type="range"
                          min={0}
                          max={300}
                          step={1}
                          value={filtros.voluntariosMinimos}
                          onChange={(event) => setFiltros((prev) => ({ ...prev, voluntariosMinimos: Number(event.target.value) }))}
                          className="mt-1 w-full accent-[#F5C400]"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs text-zinc-400">Distancia Max. da Sede: {filtros.distanciaMaxima} km</span>
                        <input
                          type="range"
                          min={0}
                          max={5000}
                          step={10}
                          value={filtros.distanciaMaxima}
                          onChange={(event) => setFiltros((prev) => ({ ...prev, distanciaMaxima: Number(event.target.value) }))}
                          className="mt-1 w-full accent-[#F5C400]"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs text-zinc-400">Score Estrategico Minimo: {filtros.scoreMinimo.toFixed(2)}</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={filtros.scoreMinimo}
                          onChange={(event) => setFiltros((prev) => ({ ...prev, scoreMinimo: Number(event.target.value) }))}
                          className="mt-1 w-full accent-[#F5C400]"
                        />
                      </label>
                    </div>

                    <button
                      onClick={() => setFiltros(FILTROS_INICIAIS)}
                      className="mt-4 w-full rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/5"
                    >
                      Olho de Limpar
                    </button>
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-zinc-500 mb-3">Panorama Global</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-3xl leading-none font-light text-white">{panoramaGlobal.votos.toLocaleString('pt-BR')}</p>
                        <p className="text-[11px] text-zinc-500 mt-1">Votos Filtrados</p>
                      </div>
                      <div>
                        <p className="text-3xl leading-none font-light text-white">{panoramaGlobal.voluntarios.toLocaleString('pt-BR')}</p>
                        <p className="text-[11px] text-zinc-500 mt-1">Voluntarios Filtrados</p>
                      </div>
                      <div>
                        <p className="text-xl leading-none font-light text-white">{panoramaGlobal.cidades.toLocaleString('pt-BR')}</p>
                        <p className="text-[11px] text-zinc-500 mt-1">Cidades</p>
                      </div>
                      <div>
                        <p className="text-xl leading-none font-light text-white">{panoramaGlobal.populacao.toLocaleString('pt-BR')}</p>
                        <p className="text-[11px] text-zinc-500 mt-1">Populacao</p>
                      </div>
                    </div>
                  </div>
                </aside>

                <div>
                  <MapaInteligenciaEleitoral
                    scores={scoresFiltrados}
                    modo={modo}
                    selectedCityKey={selectedCityKey}
                    showInternalPanel={false}
                    hideLayerToolbar
                    layerPreset={mapaVisualizacao}
                    onSelectCidade={(cidade) => setSelectedCityKey(cidade ? cityKey(cidade) : null)}
                  />
                </div>

                <aside className="rounded-xl border border-white/10 bg-[#111111] p-4 h-fit sticky top-4">
                  {cidadeSelecionada ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-[#F5C400]">{cidadeSelecionada.classificacao}</p>
                        <h3 className="text-lg font-bold text-white">{cidadeSelecionada.cidade} - {cidadeSelecionada.estado}</h3>
                        <p className="text-xs text-zinc-400">Categoria: {cidadeSelecionada.categoria_estrategica}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-black/30 p-2">
                          <p className="text-zinc-400">Populacao</p>
                          <p className="font-semibold text-white">{Number(cidadeSelecionada.populacao_total ?? 0).toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="rounded-lg bg-black/30 p-2">
                          <p className="text-zinc-400">Votos</p>
                          <p className="font-semibold text-white">{Number(cidadeSelecionada.votos_2022 ?? 0).toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="rounded-lg bg-black/30 p-2">
                          <p className="text-zinc-400">Voluntarios</p>
                          <p className="font-semibold text-white">{Number(cidadeSelecionada.voluntarios_count_real ?? 0).toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="rounded-lg bg-black/30 p-2">
                          <p className="text-zinc-400">Distancia sede</p>
                          <p className="font-semibold text-white">{cidadeSelecionada.distancia_sede_km.toFixed(1)} km</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <div className="flex justify-between text-zinc-400">
                            <span>Indice de cobertura (vol/votos)</span>
                            <span className="text-white">{cidadeSelecionada.indice_cobertura_raw.toFixed(4)}</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-zinc-400">
                            <span>Indice de oportunidade</span>
                            <span className="text-white">{cidadeSelecionada.indice_oportunidade_raw.toFixed(1)}</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-zinc-400 mb-1">
                            <span>Potencial de expansao</span>
                            <span className="text-[#F5C400]">{cidadeSelecionada.ipc}/100</span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full bg-[#F5C400]" style={{ width: `${cidadeSelecionada.ipc}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-md border border-white/10 p-2">
                          <p className="text-zinc-400">ICD</p>
                          <p className="font-bold text-white">{cidadeSelecionada.icd}</p>
                        </div>
                        <div className="rounded-md border border-white/10 p-2">
                          <p className="text-zinc-400">IIR</p>
                          <p className="font-bold text-white">{cidadeSelecionada.iir}</p>
                        </div>
                        <div className="rounded-md border border-white/10 p-2">
                          <p className="text-zinc-400">Score</p>
                          <p className="font-bold text-[#F5C400]">{cidadeSelecionada.score_modo}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MapPin className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
                      <p className="text-sm text-zinc-300">Selecione uma cidade no mapa</p>
                    </div>
                  )}
                </aside>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <MiniBarList title="Ranking de cidades (score)" data={rankingTop} colorClass="bg-[#F5C400]" />
                <MiniBarList title="Crescimento de base (IPC)" data={crescimentoBase} colorClass="bg-cyan-500" />
                <MiniBarList title="Distribuicao de votos por classificacao" data={votosPorClassificacao} colorClass="bg-green-500" />
                <MiniBarList title="Oportunidades estrategicas" data={distribuicaoOportunidade} colorClass="bg-blue-500" />
              </div>
            </div>
          )}
          {tabAtiva === 'ranking' && <RankingCidades scores={scoresFiltrados} modo={modo} />}
          {tabAtiva === 'questionarios' && <FormularioQuestionario />}
        </section>
      )}

      <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Pesos estrategicos ativos</p>
        <div className="text-sm text-zinc-300">
          <strong className="text-white">{modoAtual.label}</strong>: {modoAtual.pesos}
        </div>
      </section>
    </div>
  );
};







