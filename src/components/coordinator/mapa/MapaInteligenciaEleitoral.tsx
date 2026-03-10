import React, { useEffect, useMemo, useState } from 'react';
import {
  Circle,
  CircleMarker,
  LayerGroup,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMapEvents,
} from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, MapPin, Radar, Target, Users, Vote } from 'lucide-react';
import { apiClient } from '../../../lib/api-client.ts';
import { useToast } from '../../ui/ToastProvider.tsx';
import type { ModoEstrategico, ScoresCidade } from '../../../lib/inteligencia-eleitoral.ts';

export interface ScoreMapaCidade extends ScoresCidade {
  latitude?: number | null;
  longitude?: number | null;
  votos_2022?: number | null;
  populacao_total?: number | null;
  pct_jovens_16_34?: number | null;
  pct_acesso_internet?: number | null;
  voluntarios_count_real?: number | null;
}

interface Props {
  scores: ScoreMapaCidade[];
  modo: ModoEstrategico;
  selectedCityKey?: string | null;
  onSelectCidade?: (cidade: ScoreMapaCidade | null) => void;
  showInternalPanel?: boolean;
  layerPreset?: 'score' | 'votos' | 'voluntarios';
  hideLayerToolbar?: boolean;
}

type LayerKey =
  | 'classificacao'
  | 'heat_votos'
  | 'heat_voluntarios'
  | 'heat_estrategico'
  | 'icd'
  | 'raio_sede'
  | 'polos'
  | 'ic_alerta'
  | 'clusters';

const SEDE_SP: LatLngExpression = [-23.5505, -46.6333];

const scoreModo = (cidade: ScoreMapaCidade, modo: ModoEstrategico): number => {
  if (modo === 'TERRITORIAL') return cidade.see_territorial;
  if (modo === 'MOBILIZACAO') return cidade.see_mobilizacao;
  return cidade.see_crescimento;
};

const cityKey = (cidade: Pick<ScoreMapaCidade, 'cidade' | 'estado'>): string => `${cidade.cidade}_${cidade.estado}`;

const colorClassificacao = (classificacao: ScoresCidade['classificacao']): string => {
  switch (classificacao) {
    case 'MOTOR':
      return '#22c55e';
    case 'DIAMANTE':
      return '#3b82f6';
    case 'POLO':
      return '#06b6d4';
    case 'APOSTA':
      return '#eab308';
    case 'LATENTE':
      return '#a855f7';
    default:
      return '#9ca3af';
  }
};

const colorHeat = (value: number, max: number, palette: 'votos' | 'voluntarios' | 'estrategico'): string => {
  if (max <= 0) return '#f59e0b';

  const ratio = Math.max(0, Math.min(1, value / max));

  if (palette === 'votos') {
    if (ratio > 0.8) return '#ef4444';
    if (ratio > 0.5) return '#f97316';
    if (ratio > 0.2) return '#f59e0b';
    return '#fde68a';
  }

  if (palette === 'voluntarios') {
    if (ratio > 0.8) return '#14532d';
    if (ratio > 0.5) return '#15803d';
    if (ratio > 0.2) return '#22c55e';
    return '#86efac';
  }

  if (ratio > 0.8) return '#F5C400';
  if (ratio > 0.5) return '#f59e0b';
  if (ratio > 0.2) return '#f97316';
  return '#7c2d12';
};

const ZoomWatcher: React.FC<{ onChange: (zoom: number) => void }> = ({ onChange }) => {
  useMapEvents({
    zoomend: (event) => {
      onChange(event.target.getZoom());
    },
  });

  return null;
};

interface ClusterItem {
  lat: number;
  lng: number;
  count: number;
  scoreMedio: number;
}

const gerarClusters = (
  cidades: ScoreMapaCidade[],
  modo: ModoEstrategico,
  zoom: number,
): ClusterItem[] => {
  if (zoom >= 7) return [];

  const step = zoom <= 4 ? 1.2 : zoom <= 5 ? 0.8 : 0.5;
  const map = new Map<string, { latSum: number; lngSum: number; count: number; scoreSum: number }>();

  for (const cidade of cidades) {
    if (typeof cidade.latitude !== 'number' || typeof cidade.longitude !== 'number') continue;

    const keyLat = Math.round(cidade.latitude / step) * step;
    const keyLng = Math.round(cidade.longitude / step) * step;
    const key = `${keyLat}_${keyLng}`;

    const prev = map.get(key);
    if (prev) {
      prev.latSum += cidade.latitude;
      prev.lngSum += cidade.longitude;
      prev.count += 1;
      prev.scoreSum += scoreModo(cidade, modo);
    } else {
      map.set(key, {
        latSum: cidade.latitude,
        lngSum: cidade.longitude,
        count: 1,
        scoreSum: scoreModo(cidade, modo),
      });
    }
  }

  return Array.from(map.values())
    .filter((item) => item.count > 1)
    .map((item) => ({
      lat: item.latSum / item.count,
      lng: item.lngSum / item.count,
      count: item.count,
      scoreMedio: item.scoreSum / item.count,
    }));
};

export const MapaInteligenciaEleitoral: React.FC<Props> = ({
  scores,
  modo,
  selectedCityKey,
  onSelectCidade,
  showInternalPanel = true,
  layerPreset,
  hideLayerToolbar = false,
}) => {
  const toast = useToast();
  const [selectedInterna, setSelectedInterna] = useState<ScoreMapaCidade | null>(null);
  const [zoom, setZoom] = useState(6);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    classificacao: true,
    heat_votos: true,
    heat_voluntarios: false,
    heat_estrategico: false,
    icd: false,
    raio_sede: true,
    polos: true,
    ic_alerta: true,
    clusters: true,
  });
  const [creatingMission, setCreatingMission] = useState(false);
  useEffect(() => {
    if (!layerPreset) return;

    setLayers((prev) => ({
      ...prev,
      classificacao: layerPreset === 'score',
      heat_estrategico: layerPreset === 'score',
      heat_votos: layerPreset === 'votos',
      heat_voluntarios: layerPreset === 'voluntarios',
    }));
  }, [layerPreset]);

  const cidadesComCoord = useMemo(() => {
    return scores.filter((cidade) => typeof cidade.latitude === 'number' && typeof cidade.longitude === 'number');
  }, [scores]);

  const selectedExterna = useMemo(() => {
    if (!selectedCityKey) return null;
    return cidadesComCoord.find((cidade) => cityKey(cidade) === selectedCityKey) ?? null;
  }, [cidadesComCoord, selectedCityKey]);

  const selectedCidade = showInternalPanel ? selectedInterna : selectedExterna;

  const maxVotos = useMemo(
    () => Math.max(...cidadesComCoord.map((cidade) => Number(cidade.votos_2022 ?? 0)), 0),
    [cidadesComCoord],
  );

  const maxVoluntarios = useMemo(
    () => Math.max(...cidadesComCoord.map((cidade) => Number(cidade.voluntarios_count_real ?? 0)), 0),
    [cidadesComCoord],
  );

  const maxScore = useMemo(
    () => Math.max(...cidadesComCoord.map((cidade) => scoreModo(cidade, modo)), 0),
    [cidadesComCoord, modo],
  );

  const clusters = useMemo(() => gerarClusters(cidadesComCoord, modo, zoom), [cidadesComCoord, modo, zoom]);

  const polos = useMemo(() => {
    const cidadesPolo = cidadesComCoord.filter((cidade) => cidade.classificacao === 'POLO');

    return cidadesPolo.flatMap((polo) => {
      if (typeof polo.latitude !== 'number' || typeof polo.longitude !== 'number') return [];

      const satelites = cidadesComCoord
        .filter((cidade) => cityKey(cidade) !== cityKey(polo))
        .sort((a, b) => b.iir - a.iir)
        .slice(0, 3);

      return satelites
        .filter((sat) => typeof sat.latitude === 'number' && typeof sat.longitude === 'number')
        .map((sat) => ({
          from: [polo.latitude as number, polo.longitude as number] as [number, number],
          to: [sat.latitude as number, sat.longitude as number] as [number, number],
          intensidade: Math.max(0.2, Math.min(1, polo.iir / 100)),
        }));
    });
  }, [cidadesComCoord]);

  const toggleLayer = (key: LayerKey): void => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selecionarCidade = (cidade: ScoreMapaCidade): void => {
    if (showInternalPanel) {
      setSelectedInterna(cidade);
    }
    onSelectCidade?.(cidade);
  };

  const limparSelecao = (): void => {
    if (showInternalPanel) {
      setSelectedInterna(null);
    }
    onSelectCidade?.(null);
  };

  const criarMissaoCidade = async (cidade: ScoreMapaCidade): Promise<void> => {
    setCreatingMission(true);

    const result = await apiClient.post<{ success: boolean; missionId?: string }>('/api/missions', {
      title: `Recrutamento territorial - ${cidade.cidade}/${cidade.estado}`,
      description:
        `Acao de recrutamento orientada por inteligencia territorial para ${cidade.cidade}/${cidade.estado}. ` +
        `Classificacao ${cidade.classificacao} e score de crescimento ${cidade.see_crescimento}.`,
      type: 'RECRUTAMENTO',
      urgency: 'PRIORITARIA',
      xp_reward: 80,
      validation_type: 'MANUAL',
      deadline: null,
    });

    if (result.error) {
      toast.error(`Falha ao criar missao: ${result.error}`);
      setCreatingMission(false);
      return;
    }

    toast.success(`Missao criada para ${cidade.cidade}.`);
    setCreatingMission(false);
  };

  const center: LatLngExpression = cidadesComCoord.length > 0
    ? [cidadesComCoord[0].latitude as number, cidadesComCoord[0].longitude as number]
    : SEDE_SP;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {!hideLayerToolbar && ([
          ['classificacao', 'Classificacao'],
          ['heat_votos', 'Heat Votos'],
          ['heat_voluntarios', 'Heat Voluntarios'],
          ['heat_estrategico', 'Heat Potencial'],
          ['icd', 'Compatibilidade ICD'],
          ['raio_sede', 'Raio da Sede'],
          ['polos', 'Polos Regionais'],
          ['ic_alerta', 'Alertas IC'],
          ['clusters', 'Clusters'],
        ] as Array<[LayerKey, string]>).map(([key, label]) => (
          <button
            key={key}
            onClick={() => toggleLayer(key)}
            className={`px-3 py-1 rounded-full border text-xs ${
              layers[key] ? 'bg-[#F5C400] text-black border-[#F5C400]' : 'bg-black/30 text-gray-300 border-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="h-[620px] rounded-xl overflow-hidden border border-white/10 relative">
        <MapContainer center={center} zoom={6} minZoom={4} maxZoom={12} style={{ height: '100%', width: '100%' }}>
          <ZoomWatcher onChange={setZoom} />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap &copy; CARTO"
          />

          {layers.raio_sede && (
            <LayerGroup>
              <Circle center={SEDE_SP} radius={100000} pathOptions={{ color: '#F5C400', fillOpacity: 0.03, weight: 1 }} />
              <Circle center={SEDE_SP} radius={200000} pathOptions={{ color: '#F5C400', fillOpacity: 0.02, weight: 1 }} />
              <Circle center={SEDE_SP} radius={400000} pathOptions={{ color: '#F5C400', fillOpacity: 0.01, weight: 1 }} />
            </LayerGroup>
          )}

          {layers.heat_votos && (
            <LayerGroup>
              {cidadesComCoord.map((cidade) => (
                <CircleMarker
                  key={`votos_${cityKey(cidade)}`}
                  center={[cidade.latitude as number, cidade.longitude as number]}
                  radius={6 + (Number(cidade.votos_2022 ?? 0) / Math.max(maxVotos, 1)) * 16}
                  pathOptions={{
                    color: 'transparent',
                    fillOpacity: 0.18,
                    fillColor: colorHeat(Number(cidade.votos_2022 ?? 0), maxVotos, 'votos'),
                  }}
                />
              ))}
            </LayerGroup>
          )}

          {layers.heat_voluntarios && (
            <LayerGroup>
              {cidadesComCoord.map((cidade) => (
                <CircleMarker
                  key={`vols_${cityKey(cidade)}`}
                  center={[cidade.latitude as number, cidade.longitude as number]}
                  radius={6 + (Number(cidade.voluntarios_count_real ?? 0) / Math.max(maxVoluntarios, 1)) * 16}
                  pathOptions={{
                    color: 'transparent',
                    fillOpacity: 0.2,
                    fillColor: colorHeat(Number(cidade.voluntarios_count_real ?? 0), maxVoluntarios, 'voluntarios'),
                  }}
                />
              ))}
            </LayerGroup>
          )}

          {layers.heat_estrategico && (
            <LayerGroup>
              {cidadesComCoord.map((cidade) => (
                <CircleMarker
                  key={`estrategico_${cityKey(cidade)}`}
                  center={[cidade.latitude as number, cidade.longitude as number]}
                  radius={8 + (scoreModo(cidade, modo) / Math.max(maxScore, 1)) * 14}
                  pathOptions={{
                    color: 'transparent',
                    fillOpacity: 0.2,
                    fillColor: colorHeat(scoreModo(cidade, modo), maxScore, 'estrategico'),
                  }}
                />
              ))}
            </LayerGroup>
          )}

          {layers.icd && (
            <LayerGroup>
              {cidadesComCoord.map((cidade) => (
                <CircleMarker
                  key={`icd_${cityKey(cidade)}`}
                  center={[cidade.latitude as number, cidade.longitude as number]}
                  radius={8}
                  pathOptions={{
                    color: cidade.icd >= 70 ? '#16a34a' : cidade.icd >= 50 ? '#eab308' : '#ef4444',
                    fillColor: cidade.icd >= 70 ? '#16a34a' : cidade.icd >= 50 ? '#eab308' : '#ef4444',
                    fillOpacity: 0.4,
                    weight: 1,
                  }}
                />
              ))}
            </LayerGroup>
          )}

          {layers.polos && (
            <LayerGroup>
              {polos.map((conexao, index) => (
                <Polyline
                  key={`polo_${index}`}
                  positions={[conexao.from, conexao.to]}
                  pathOptions={{ color: '#22d3ee', weight: 1 + conexao.intensidade * 2, opacity: 0.5 }}
                />
              ))}
            </LayerGroup>
          )}

          {layers.classificacao && (
            <LayerGroup>
              {cidadesComCoord.map((cidade) => {
                const radius = 5 + (scoreModo(cidade, modo) / 100) * 14;
                return (
                  <CircleMarker
                    key={`class_${cityKey(cidade)}`}
                    center={[cidade.latitude as number, cidade.longitude as number]}
                    radius={radius}
                    pathOptions={{
                      color: cidade.classificacao === 'DIAMANTE' ? '#F5C400' : colorClassificacao(cidade.classificacao),
                      fillColor: colorClassificacao(cidade.classificacao),
                      fillOpacity: 0.8,
                      weight: cidade.classificacao === 'DIAMANTE' ? 3 : 1,
                    }}
                    eventHandlers={{
                      click: () => selecionarCidade(cidade),
                    }}
                  >
                    <Tooltip>
                      <div className="text-xs">
                        <strong>{cidade.cidade} - {cidade.estado}</strong><br />
                        {cidade.classificacao} | SEE {scoreModo(cidade, modo)}<br />
                        Votos {cidade.votos_2022 ?? 0} | Voluntarios {cidade.voluntarios_count_real ?? 0}
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
            </LayerGroup>
          )}

          {layers.ic_alerta && (
            <LayerGroup>
              {cidadesComCoord
                .filter((cidade) => cidade.ic < 0.5)
                .map((cidade) => (
                  <CircleMarker
                    key={`ic_alert_${cityKey(cidade)}`}
                    center={[cidade.latitude as number, cidade.longitude as number]}
                    radius={10}
                    pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.2, weight: 2 }}
                  >
                    <Tooltip>
                      <div className="text-xs">Alerta cobertura: IC {cidade.ic.toFixed(2)}</div>
                    </Tooltip>
                  </CircleMarker>
                ))}
            </LayerGroup>
          )}

          {layers.clusters && clusters.length > 0 && (
            <LayerGroup>
              {clusters.map((cluster, index) => (
                <CircleMarker
                  key={`cluster_${index}`}
                  center={[cluster.lat, cluster.lng]}
                  radius={10 + Math.min(cluster.count, 15)}
                  pathOptions={{
                    color: '#111827',
                    fillColor: cluster.scoreMedio >= 70 ? '#22c55e' : cluster.scoreMedio >= 50 ? '#eab308' : '#ef4444',
                    fillOpacity: 0.75,
                    weight: 1,
                  }}
                >
                  <Tooltip>
                    <div className="text-xs">Cluster com {cluster.count} cidades | SEE medio {cluster.scoreMedio.toFixed(1)}</div>
                  </Tooltip>
                </CircleMarker>
              ))}
            </LayerGroup>
          )}
        </MapContainer>

        {showInternalPanel && selectedCidade && (
          <aside className="absolute top-3 right-3 w-[360px] max-w-[90vw] rounded-xl border border-white/10 bg-[#111111] p-4 text-white shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#F5C400]">{selectedCidade.classificacao}</p>
                <h3 className="text-lg font-bold">{selectedCidade.cidade} - {selectedCidade.estado}</h3>
              </div>
              <button onClick={limparSelecao} className="text-xs text-gray-400 hover:text-white">Fechar</button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-white/5 p-2">
                <p className="text-gray-400 flex items-center gap-1"><Vote className="w-3 h-3" /> Votos 2022</p>
                <p className="font-semibold">{selectedCidade.votos_2022 ?? 0}</p>
              </div>
              <div className="rounded-lg bg-white/5 p-2">
                <p className="text-gray-400 flex items-center gap-1"><Users className="w-3 h-3" /> Voluntarios</p>
                <p className="font-semibold">{selectedCidade.voluntarios_count_real ?? 0}</p>
              </div>
              <div className="rounded-lg bg-white/5 p-2">
                <p className="text-gray-400">IC cobertura</p>
                <p className="font-semibold">{selectedCidade.ic.toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-white/5 p-2">
                <p className="text-gray-400">Acao sugerida</p>
                <p className="font-semibold">{selectedCidade.acao_sugerida.replaceAll('_', ' ')}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              {[['ICD', selectedCidade.icd], ['IPC', selectedCidade.ipc], ['IIR', selectedCidade.iir]].map(([label, value]) => (
                <div key={label}>
                  <div className="flex justify-between text-gray-400"><span>{label}</span><span>{value}/100</span></div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-[#F5C400]" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => void criarMissaoCidade(selectedCidade)}
                disabled={creatingMission}
                className="w-full rounded-lg bg-[#F5C400] px-3 py-2 text-black text-sm font-semibold hover:bg-yellow-400 disabled:opacity-60"
              >
                {creatingMission ? 'Criando missao...' : `Criar missao para ${selectedCidade.cidade}`}
              </button>
              <button className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300 hover:text-white flex items-center justify-center gap-2">
                <Target className="w-4 h-4" /> Ver questionarios da cidade
              </button>
            </div>

            <div className="mt-3 text-[11px] text-gray-400 flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              {Number(selectedCidade.latitude ?? 0).toFixed(3)}, {Number(selectedCidade.longitude ?? 0).toFixed(3)}
            </div>
            {selectedCidade.ic < 0.5 && (
              <div className="mt-2 text-[11px] text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" /> Cobertura critica: IC abaixo de 0.5
              </div>
            )}
            <div className="mt-1 text-[11px] text-cyan-400 flex items-center gap-2">
              <Radar className="w-3 h-3" /> Score {modo.toLowerCase()}: {scoreModo(selectedCidade, modo)}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};




