'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, LayerGroup, useMap } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { setupLeafletIcons } from '../../../lib/leaflet-config.ts';
import { DadosCidadeMapa, RespostaMapa } from '../../../lib/mapa-dados.ts';
import { MapaTooltipCidade } from './MapaTooltipCidade.tsx';
import { MapaControles } from './MapaControles.tsx';
import { MapaLegenda } from './MapaLegenda.tsx';
import { MapaPainelLateral } from './MapaPainelLateral.tsx';
import { MapaAlertasOverlay } from './MapaAlertasOverlay.tsx';
import { useAuth } from '../../../components/AuthContext.tsx';

// Fix for Leaflet icons
setupLeafletIcons();

const MapController = ({ center, zoom }: { center: LatLngExpression, zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

export const MapaInteligencia: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<RespostaMapa | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCidade, setSelectedCidade] = useState<DadosCidadeMapa | null>(null);
  const [activeLayers, setActiveLayers] = useState<string[]>(['base', 'momentum']);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([-15.7801, -47.9292]);
  const [mapZoom, setMapZoom] = useState(4);

  useEffect(() => {
    if (user) {
      fetch(`/api/coordenador/mapa?estado=${user.state}`)
        .then(res => res.json())
        .then(data => {
          setData(data);
          setLoading(false);
          if (data.cidades.length > 0) {
            // Center on the first city or state average
            setMapCenter([data.cidades[0].lat, data.cidades[0].lng]);
            setMapZoom(6);
          }
        });
    }
  }, [user]);

  const toggleLayer = (id: string) => {
    setActiveLayers(prev => {
      if (prev.includes(id)) return prev.filter(l => l !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const getCircleColor = (score: number) => {
    if (score >= 85) return '#2E7D32';
    if (score >= 70) return '#F5C400';
    if (score >= 40) return '#FF6F00';
    return '#E53935';
  };

  if (loading || !data) {
    return (
      <div className="w-full h-[calc(100vh-200px)] bg-zinc-950 rounded-[40px] border border-zinc-800 flex items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Carregando Inteligência Territorial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-200px)] bg-zinc-950 rounded-[40px] border border-zinc-800 relative overflow-hidden shadow-2xl pointer-events-auto">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        minZoom={3}
        maxZoom={10}
        zoomControl={false}
        style={{ height: '100%', width: '100%', background: '#0D0D0D' }}
      >
        <MapController center={mapCenter} zoom={mapZoom} />
        
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Camada 1: Força da Base */}
        {activeLayers.includes('base') && (
          <LayerGroup>
            {data.cidades.map(cidade => (
              <CircleMarker
                key={`base-${cidade.cidadeId}`}
                center={[cidade.lat, cidade.lng]}
                radius={Math.sqrt(cidade.voluntariosAtivos) * 3 + 8}
                pathOptions={{
                  fillColor: getCircleColor(cidade.healthScore),
                  fillOpacity: 0.7,
                  color: getCircleColor(cidade.healthScore),
                  weight: 2,
                  stroke: true
                }}
                eventHandlers={{
                  click: () => setSelectedCidade(cidade),
                  mouseover: (e) => {
                    const layer = e.target;
                    layer.setStyle({ fillOpacity: 1, weight: 4 });
                  },
                  mouseout: (e) => {
                    const layer = e.target;
                    layer.setStyle({ fillOpacity: 0.7, weight: 2 });
                  }
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <MapaTooltipCidade cidade={cidade} />
                </Tooltip>
              </CircleMarker>
            ))}
          </LayerGroup>
        )}

        {/* Camada 2: Momentum */}
        {activeLayers.includes('momentum') && (
          <LayerGroup>
            {data.cidades.map(cidade => {
              const direcao = cidade.tendenciaDirecao;
              const percentual = Math.abs(cidade.tendenciaPercentual);
              const color = direcao === 'CRESCIMENTO' ? '#4CAF50' : direcao === 'QUEDA' ? '#E53935' : '#888';
              const icon = direcao === 'CRESCIMENTO' ? '↑' : direcao === 'QUEDA' ? '↓' : '—';

              const momentumIcon = L.divIcon({
                html: `<div style="font-size: 18px; font-weight: bold; display: flex; align-items: center; gap: 2px; white-space: nowrap; color: ${color}; text-shadow: 0 0 10px rgba(0,0,0,0.5);">
                  ${icon}
                  <span style="font-size: 11px;">${percentual}%</span>
                </div>`,
                className: '',
                iconSize: [40, 20],
                iconAnchor: [20, -15] // Offset from the circle
              });

              return (
                <CircleMarker
                  key={`momentum-${cidade.cidadeId}`}
                  center={[cidade.lat, cidade.lng]}
                  radius={2}
                  pathOptions={{ opacity: 0, fillOpacity: 0 }}
                >
                  <Tooltip permanent direction="bottom" offset={[0, 15]} opacity={1} className="momentum-tooltip">
                    <div style={{ color, fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {icon} {percentual}%
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </LayerGroup>
        )}

        {/* Camada 3: Lideranças */}
        {activeLayers.includes('liderancas') && (
          <LayerGroup>
            {data.cidades.map(cidade => {
              let icon = '';
              if (cidade.temCoordenador && cidade.lideresEmergentes > 0) icon = '⭐';
              else if (cidade.temCoordenador) icon = '🛡️';
              else if (cidade.lideresEmergentes > 0) icon = '🌟';

              if (!icon) return null;

              return (
                <CircleMarker
                  key={`lider-${cidade.cidadeId}`}
                  center={[cidade.lat, cidade.lng]}
                  radius={2}
                  pathOptions={{ opacity: 0, fillOpacity: 0 }}
                >
                  <Tooltip permanent direction="right" offset={[15, 0]} opacity={1}>
                    <span style={{ fontSize: '14px' }}>{icon}</span>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </LayerGroup>
        )}
      </MapContainer>

      {/* Overlays */}
      <MapaControles activeLayers={activeLayers} toggleLayer={toggleLayer} />
      <MapaLegenda />
      <MapaAlertasOverlay cidades={data.cidades} />
      <MapaPainelLateral 
        cidade={selectedCidade} 
        resumo={data.resumoEstado} 
        onClose={() => setSelectedCidade(null)} 
      />

      <style>{`
        .leaflet-container {
          background: #0D0D0D !important;
        }
        .leaflet-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-tooltip-top:before, .leaflet-tooltip-bottom:before, .leaflet-tooltip-left:before, .leaflet-tooltip-right:before {
          display: none !important;
        }
        .momentum-tooltip {
          background: rgba(0,0,0,0.6) !important;
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255,255,255,0.1) !important;
          padding: 2px 6px !important;
          border-radius: 6px !important;
        }
      `}</style>
    </div>
  );
};

export default MapaInteligencia;
