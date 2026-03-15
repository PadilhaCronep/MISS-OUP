import React, { useEffect, useMemo, useState } from 'react';
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'motion/react';
import { Crown, Flame, Rocket, Target, TrendingUp } from 'lucide-react';
import { apiClient } from '../lib/api-client.ts';

const geoUrl = 'https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson';

interface ArenaStateMetric {
  state: string;
  voluntarios: number;
  voluntarios_novos_30d: number;
  voluntarios_ativos_30d: number;
  projetos: number;
  tarefas_ativas: number;
  tarefas_total: number;
  seguidores: number;
  ganho_seguidores_30d: number;
  meta_voluntarios: number;
  meta_projetos: number;
  meta_seguidores: number;
  engagement_score: number;
  posicao?: number;
}

interface ArenaSummary {
  voluntarios: number;
  projetos: number;
  seguidores: number;
  ganhoSeguidores30d: number;
  metaVoluntarios: number;
  metaProjetos: number;
  metaSeguidores: number;
  progresso: {
    voluntarios: number;
    projetos: number;
    seguidores: number;
  };
}

interface ArenaResponse {
  actorScope: 'NACIONAL' | string[];
  resumo: ArenaSummary;
  ranking_seguidores: ArenaStateMetric[];
  estados: ArenaStateMetric[];
}

interface MockStateSeed {
  state: string;
  voluntarios: number;
  voluntarios_novos_30d: number;
  voluntarios_ativos_30d: number;
  projetos: number;
  tarefas_ativas: number;
  tarefas_total: number;
  seguidores: number;
  ganho_seguidores_30d: number;
}

const STATE_NAME_TO_UF: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  goias: 'GO',
  maranhao: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  paraiba: 'PB',
  parana: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};

const STATE_CENTER_BY_UF: Record<string, [number, number]> = {
  AC: [-8.77, -70.55],
  AL: [-9.71, -35.73],
  AP: [1.41, -51.77],
  AM: [-3.47, -65.1],
  BA: [-12.96, -41.57],
  CE: [-5.2, -39.53],
  DF: [-15.8, -47.9],
  ES: [-19.19, -40.34],
  GO: [-15.98, -49.86],
  MA: [-4.96, -45.27],
  MT: [-12.64, -55.42],
  MS: [-20.51, -54.54],
  MG: [-18.1, -44.38],
  PA: [-3.79, -52.48],
  PB: [-7.24, -36.78],
  PR: [-24.89, -51.55],
  PE: [-8.28, -35.07],
  PI: [-8.28, -43.68],
  RJ: [-22.84, -43.15],
  RN: [-5.22, -36.52],
  RS: [-30.17, -53.5],
  RO: [-10.83, -63.34],
  RR: [1.99, -61.33],
  SC: [-27.33, -49.44],
  SP: [-22.19, -48.79],
  SE: [-10.9, -37.07],
  TO: [-10.25, -48.25],
};

const MOCK_STATE_SEED: MockStateSeed[] = [
  { state: 'SP', voluntarios: 1420, voluntarios_novos_30d: 196, voluntarios_ativos_30d: 1084, projetos: 42, tarefas_ativas: 118, tarefas_total: 248, seguidores: 81240, ganho_seguidores_30d: 6480 },
  { state: 'RJ', voluntarios: 980, voluntarios_novos_30d: 132, voluntarios_ativos_30d: 706, projetos: 29, tarefas_ativas: 86, tarefas_total: 194, seguidores: 58710, ganho_seguidores_30d: 4890 },
  { state: 'MG', voluntarios: 1140, voluntarios_novos_30d: 165, voluntarios_ativos_30d: 812, projetos: 34, tarefas_ativas: 101, tarefas_total: 219, seguidores: 69420, ganho_seguidores_30d: 5330 },
  { state: 'BA', voluntarios: 890, voluntarios_novos_30d: 121, voluntarios_ativos_30d: 614, projetos: 23, tarefas_ativas: 72, tarefas_total: 171, seguidores: 49480, ganho_seguidores_30d: 4260 },
  { state: 'RS', voluntarios: 760, voluntarios_novos_30d: 103, voluntarios_ativos_30d: 551, projetos: 21, tarefas_ativas: 64, tarefas_total: 152, seguidores: 45230, ganho_seguidores_30d: 3780 },
  { state: 'PR', voluntarios: 810, voluntarios_novos_30d: 114, voluntarios_ativos_30d: 589, projetos: 24, tarefas_ativas: 68, tarefas_total: 164, seguidores: 47150, ganho_seguidores_30d: 4010 },
  { state: 'SC', voluntarios: 620, voluntarios_novos_30d: 88, voluntarios_ativos_30d: 458, projetos: 17, tarefas_ativas: 52, tarefas_total: 124, seguidores: 36120, ganho_seguidores_30d: 2890 },
  { state: 'PE', voluntarios: 690, voluntarios_novos_30d: 92, voluntarios_ativos_30d: 479, projetos: 19, tarefas_ativas: 58, tarefas_total: 139, seguidores: 38990, ganho_seguidores_30d: 3210 },
  { state: 'CE', voluntarios: 640, voluntarios_novos_30d: 83, voluntarios_ativos_30d: 446, projetos: 18, tarefas_ativas: 55, tarefas_total: 132, seguidores: 37100, ganho_seguidores_30d: 3020 },
  { state: 'GO', voluntarios: 530, voluntarios_novos_30d: 74, voluntarios_ativos_30d: 369, projetos: 15, tarefas_ativas: 44, tarefas_total: 109, seguidores: 31620, ganho_seguidores_30d: 2440 },
  { state: 'DF', voluntarios: 460, voluntarios_novos_30d: 62, voluntarios_ativos_30d: 332, projetos: 14, tarefas_ativas: 42, tarefas_total: 96, seguidores: 29840, ganho_seguidores_30d: 2280 },
  { state: 'PA', voluntarios: 570, voluntarios_novos_30d: 79, voluntarios_ativos_30d: 401, projetos: 16, tarefas_ativas: 47, tarefas_total: 118, seguidores: 33450, ganho_seguidores_30d: 2590 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildMockArenaData(): ArenaResponse {
  const metrics: ArenaStateMetric[] = MOCK_STATE_SEED.map((seed) => {
    const metaVoluntarios = seed.voluntarios + Math.max(20, Math.round(seed.voluntarios * 0.15));
    const metaProjetos = seed.projetos + Math.max(2, Math.round(seed.projetos * 0.2));
    const metaSeguidores = seed.seguidores + Math.max(350, Math.round(seed.seguidores * 0.12));
    const engagementRaw = seed.voluntarios > 0
      ? Math.round(((seed.voluntarios_ativos_30d + seed.voluntarios_novos_30d) / (seed.voluntarios * 2)) * 100)
      : 0;

    return {
      ...seed,
      meta_voluntarios: metaVoluntarios,
      meta_projetos: metaProjetos,
      meta_seguidores: metaSeguidores,
      engagement_score: clamp(engagementRaw, 0, 100),
    };
  });

  const rankingSeguidores = [...metrics]
    .sort((a, b) => b.seguidores - a.seguidores)
    .slice(0, 10)
    .map((item, index) => ({
      ...item,
      posicao: index + 1,
    }));

  const totals = metrics.reduce(
    (acc, item) => {
      acc.voluntarios += item.voluntarios;
      acc.projetos += item.projetos;
      acc.seguidores += item.seguidores;
      acc.ganhoSeguidores30d += item.ganho_seguidores_30d;
      acc.metaVoluntarios += item.meta_voluntarios;
      acc.metaProjetos += item.meta_projetos;
      acc.metaSeguidores += item.meta_seguidores;
      return acc;
    },
    {
      voluntarios: 0,
      projetos: 0,
      seguidores: 0,
      ganhoSeguidores30d: 0,
      metaVoluntarios: 0,
      metaProjetos: 0,
      metaSeguidores: 0,
    },
  );

  const progress = {
    voluntarios: totals.metaVoluntarios > 0 ? Math.round((totals.voluntarios / totals.metaVoluntarios) * 100) : 0,
    projetos: totals.metaProjetos > 0 ? Math.round((totals.projetos / totals.metaProjetos) * 100) : 0,
    seguidores: totals.metaSeguidores > 0 ? Math.round((totals.seguidores / totals.metaSeguidores) * 100) : 0,
  };

  return {
    actorScope: 'NACIONAL',
    resumo: {
      ...totals,
      progresso: progress,
    },
    ranking_seguidores: rankingSeguidores,
    estados: metrics,
  };
}

const MOCK_ARENA_DATA = buildMockArenaData();

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function resolveUfFromFeature(feature: any): string {
  const props = feature?.properties ?? {};
  const uf = String(props.sigla || props.uf || props.code || '').toUpperCase();
  if (uf && uf.length === 2) return uf;

  const name = String(props.name || props.nome || '').trim();
  const normalized = normalizeName(name);
  return STATE_NAME_TO_UF[normalized] ?? '';
}

function metricFillColor(value: number, max: number): string {
  if (!max || value <= 0) return '#2d2d2d';
  const ratio = value / max;
  if (ratio >= 0.85) return '#0f766e';
  if (ratio >= 0.65) return '#1d4ed8';
  if (ratio >= 0.45) return '#ca8a04';
  if (ratio >= 0.25) return '#c2410c';
  return '#7f1d1d';
}

async function fetchGeoData(): Promise<any> {
  const response = await fetch(geoUrl);
  if (!response.ok) {
    throw new Error('Falha ao carregar mapa do Brasil');
  }
  return await response.json();
}

export const MapPage: React.FC = () => {
  const [arena, setArena] = useState<ArenaResponse | null>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [selectedState, setSelectedState] = useState<ArenaStateMetric | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSourceMode, setDataSourceMode] = useState<'api' | 'mock'>('api');
  const [mapSourceMode, setMapSourceMode] = useState<'geojson' | 'markers'>('geojson');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [arenaResult, geoResult] = await Promise.allSettled([
          apiClient.get<ArenaResponse>('/api/arena/mapa-inicial'),
          fetchGeoData(),
        ]);

        if (cancelled) return;

        let resolvedArena = MOCK_ARENA_DATA;
        if (
          arenaResult.status === 'fulfilled'
          && !arenaResult.value.error
          && arenaResult.value.data
          && arenaResult.value.data.estados.length > 0
        ) {
          resolvedArena = arenaResult.value.data;
          setDataSourceMode('api');
        } else {
          setDataSourceMode('mock');
        }

        if (geoResult.status === 'fulfilled') {
          setGeoData(geoResult.value);
          setMapSourceMode('geojson');
        } else {
          setGeoData(null);
          setMapSourceMode('markers');
        }

        setArena(resolvedArena);
        setSelectedState(resolvedArena.ranking_seguidores[0] ?? resolvedArena.estados[0] ?? null);
        setLoading(false);
      } catch (loadError) {
        if (cancelled) return;

        const message = loadError instanceof Error ? loadError.message : 'Falha ao carregar arena inicial';
        setError(message);
        setArena(MOCK_ARENA_DATA);
        setSelectedState(MOCK_ARENA_DATA.ranking_seguidores[0] ?? MOCK_ARENA_DATA.estados[0] ?? null);
        setDataSourceMode('mock');
        setMapSourceMode('markers');
        setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stateMap = useMemo(() => {
    const map = new Map<string, ArenaStateMetric>();
    for (const state of arena?.estados ?? []) {
      map.set(state.state.toUpperCase(), state);
    }
    return map;
  }, [arena]);

  const maxFollowers = useMemo(() => {
    const all = arena?.estados ?? [];
    if (all.length === 0) return 0;
    return Math.max(...all.map((item) => item.seguidores));
  }, [arena]);

  const onEachFeature = (feature: any, layer: any) => {
    const uf = resolveUfFromFeature(feature);

    layer.on({
      click: () => {
        const metric = stateMap.get(uf);
        if (metric) {
          setSelectedState(metric);
        }
      },
      mouseover: (event: any) => {
        event.target.setStyle({ fillOpacity: 0.82, weight: 2, color: '#f5c400' });
      },
      mouseout: (event: any) => {
        const metric = stateMap.get(uf);
        event.target.setStyle({
          fillOpacity: 0.7,
          weight: 1,
          color: '#161616',
          fillColor: metricFillColor(metric?.seguidores ?? 0, maxFollowers),
        });
      },
    });
  };

  const styleFeature = (feature: any) => {
    const uf = resolveUfFromFeature(feature);
    const metric = stateMap.get(uf);

    return {
      fillColor: metricFillColor(metric?.seguidores ?? 0, maxFollowers),
      weight: 1,
      opacity: 1,
      color: '#161616',
      fillOpacity: 0.7,
    };
  };

  if (loading) {
    return <div className="flex h-[70vh] items-center justify-center text-zinc-500">Carregando mapa da competicao...</div>;
  }

  if (!arena) {
    return <div className="flex h-[70vh] items-center justify-center text-red-500">{error ?? 'Erro ao carregar mapa inicial'}</div>;
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {error ? (
        <section className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-xs text-red-100">
          Nao foi possivel carregar dados em tempo real: {error}. Exibindo modo demonstracao no frontend.
        </section>
      ) : null}
      {dataSourceMode === 'mock' ? (
        <section className="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs text-amber-100">
          Modo demonstracao ativo: dados ficticios aplicados no frontend enquanto o backend da arena inicial e finalizado.
        </section>
      ) : null}

      {mapSourceMode === 'markers' ? (
        <section className="rounded-2xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-xs text-zinc-300">
          Mapa em modo simplificado: exibindo marcadores por estado ate a malha geografica carregar novamente.
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 text-white">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">Voluntarios</p>
          <p className="mt-1 text-2xl font-black">{arena.resumo.voluntarios}</p>
          <p className="mt-2 text-xs text-zinc-400">Meta: {arena.resumo.metaVoluntarios} ({arena.resumo.progresso.voluntarios}%)</p>
        </article>
        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 text-white">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">Projetos</p>
          <p className="mt-1 text-2xl font-black">{arena.resumo.projetos}</p>
          <p className="mt-2 text-xs text-zinc-400">Meta: {arena.resumo.metaProjetos} ({arena.resumo.progresso.projetos}%)</p>
        </article>
        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 text-white">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">Seguidores</p>
          <p className="mt-1 text-2xl font-black">{arena.resumo.seguidores}</p>
          <p className="mt-2 text-xs text-zinc-400">Meta: {arena.resumo.metaSeguidores} ({arena.resumo.progresso.seguidores}%)</p>
        </article>
        <article className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 text-white">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">Ganho 30 dias</p>
          <p className="mt-1 text-2xl font-black text-emerald-400">+{arena.resumo.ganhoSeguidores30d}</p>
          <p className="mt-2 text-xs text-zinc-400">Pressao positiva entre estados</p>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-[52vh] overflow-hidden rounded-3xl border border-zinc-800 sm:h-[60vh] lg:h-[68vh]">
          <MapContainer center={[-15.7801, -47.9292]} zoom={4} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution="&copy; OpenStreetMap &copy; CARTO"
            />
            {geoData ? (
              <GeoJSON data={geoData} style={styleFeature as any} onEachFeature={onEachFeature} />
            ) : (
              arena.estados.map((row) => {
                const center = STATE_CENTER_BY_UF[row.state];
                if (!center) return null;

                const isSelected = selectedState?.state === row.state;
                return (
                  <CircleMarker
                    key={row.state}
                    center={center}
                    radius={isSelected ? 11 : 8}
                    pathOptions={{
                      color: '#161616',
                      weight: isSelected ? 2 : 1,
                      fillColor: metricFillColor(row.seguidores, maxFollowers),
                      fillOpacity: 0.86,
                    }}
                    eventHandlers={{
                      click: () => setSelectedState(row),
                    }}
                  >
                    <Popup>
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold">{row.state}</p>
                        <p>Seguidores: {row.seguidores}</p>
                        <p>Voluntarios: {row.voluntarios}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })
            )}
          </MapContainer>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 text-white">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">Estado em foco: {selectedState?.state ?? '--'}</h2>
              <span className="rounded-full bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300">
                Engajamento {selectedState?.engagement_score ?? 0}%
              </span>
            </div>

            {selectedState ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-500">Voluntarios</p>
                  <p className="text-xl font-bold">{selectedState.voluntarios}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-500">Projetos</p>
                  <p className="text-xl font-bold">{selectedState.projetos}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-500">Seguidores</p>
                  <p className="text-xl font-bold">{selectedState.seguidores}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-500">Ganho 30d</p>
                  <p className="text-xl font-bold text-emerald-400">+{selectedState.ganho_seguidores_30d}</p>
                </div>
              </div>
            ) : null}

            {selectedState ? (
              <div className="mt-4 space-y-2 text-xs text-zinc-400">
                <p className="inline-flex items-center gap-2"><Target className="h-3.5 w-3.5 text-[#F5C400]" /> Meta voluntarios: {selectedState.meta_voluntarios}</p>
                <p className="inline-flex items-center gap-2"><Rocket className="h-3.5 w-3.5 text-[#F5C400]" /> Meta projetos: {selectedState.meta_projetos}</p>
                <p className="inline-flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5 text-[#F5C400]" /> Meta seguidores: {selectedState.meta_seguidores}</p>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 text-white">
            <h3 className="mb-3 inline-flex items-center gap-2 text-base font-bold">
              <Crown className="h-4 w-4 text-[#F5C400]" /> Ranking de Seguidores
            </h3>
            <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1 sm:max-h-[240px]">
              {arena.ranking_seguidores.map((row) => (
                <button
                  key={row.state}
                  onClick={() => setSelectedState(row)}
                  className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-left hover:border-zinc-700"
                >
                  <span className="text-sm font-semibold">#{row.posicao} {row.state}</span>
                  <span className="text-sm text-zinc-300">{row.seguidores}</span>
                </button>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100"
          >
            <p className="inline-flex items-center gap-2 text-sm font-semibold"><Flame className="h-4 w-4" /> Meta emocional da semana</p>
            <p className="mt-2 text-xs">
              Unir competitividade com proposito: crescer base, entregar projetos e ampliar alcance digital com transparencia.
            </p>
            <p className="mt-1 text-xs text-amber-200">
              Estados com maior ganho em 30 dias entram no destaque nacional interno.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
