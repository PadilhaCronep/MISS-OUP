import React, { useEffect, useMemo, useState } from 'react';
import { GeoJSON, MapContainer, TileLayer } from 'react-leaflet';
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

export const MapPage: React.FC = () => {
  const [arena, setArena] = useState<ArenaResponse | null>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [selectedState, setSelectedState] = useState<ArenaStateMetric | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const [arenaResponse, geoResponse] = await Promise.all([
        apiClient.get<ArenaResponse>('/api/arena/mapa-inicial'),
        fetch(geoUrl).then(async (res) => {
          if (!res.ok) throw new Error('Falha ao carregar mapa do Brasil');
          return await res.json();
        }),
      ]);

      if (cancelled) return;

      if (arenaResponse.error || !arenaResponse.data) {
        setError(arenaResponse.error ?? 'Falha ao carregar dados da competicao');
        setLoading(false);
        return;
      }

      setArena(arenaResponse.data);
      setGeoData(geoResponse);
      setSelectedState(arenaResponse.data.ranking_seguidores[0] ?? arenaResponse.data.estados[0] ?? null);
      setLoading(false);
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

  if (error || !arena) {
    return <div className="flex h-[70vh] items-center justify-center text-red-500">{error ?? 'Erro ao carregar mapa inicial'}</div>;
  }

  return (
    <div className="space-y-5 md:space-y-6">
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
            ) : null}
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
