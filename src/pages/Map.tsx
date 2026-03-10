import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion } from 'motion/react';
import { Users, TrendingUp, Target, AlertTriangle, Layers } from 'lucide-react';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const customIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0Y1QzQwMCIgc3Ryb2tlPSIjMUExQTFBIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIxIDEwYzAgNy05IDEzLTkgMTNzLTktNi05LTEzYTkgOSAwIDAgMSAxOCAwem0tOSAzYTMgMyAwIDEgMCAwLTYgMyAzIDAgMCAwIDAgNnoiLz48L3N2Zz4=',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const geoUrl = "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson";

export const MapPage: React.FC = () => {
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [activeLayer, setActiveLayer] = useState('DENSITY');
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/map/volunteers')
      .then(res => res.json())
      .then(data => setVolunteers(data.volunteers));
      
    fetch(geoUrl)
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error("Error loading GeoJSON", err));
  }, []);

  const handleMarkerClick = (v: any) => {
    setSelectedCity({
      name: v.city,
      state: v.state,
      totalVolunteers: volunteers.filter(vol => vol.city === v.city).length,
      activeVolunteers: Math.floor(Math.random() * 50) + 10,
      missionsCompleted: Math.floor(Math.random() * 200) + 50,
      growthRate: (Math.random() * 20 - 5).toFixed(1),
      healthScore: Math.floor(Math.random() * 40) + 60,
    });
  };

  const onEachFeature = (feature: any, layer: any) => {
    layer.on({
      mouseover: (e: any) => {
        const layer = e.target;
        layer.setStyle({
          fillOpacity: 0.5,
          weight: 2,
          color: '#F5C400'
        });
      },
      mouseout: (e: any) => {
        const layer = e.target;
        layer.setStyle({
          fillOpacity: 0.1,
          weight: 1,
          color: '#1A1A1A'
        });
      },
      click: (e: any) => {
        // Mock state click
        setSelectedCity({
          name: feature.properties.name,
          state: feature.properties.sigla || feature.properties.name,
          totalVolunteers: Math.floor(Math.random() * 500) + 100,
          activeVolunteers: Math.floor(Math.random() * 200) + 50,
          missionsCompleted: Math.floor(Math.random() * 1000) + 200,
          growthRate: (Math.random() * 20 - 5).toFixed(1),
          healthScore: Math.floor(Math.random() * 40) + 60,
        });
      }
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
      <div className="flex-1 rounded-3xl overflow-hidden border border-zinc-200 shadow-sm relative">
        <MapContainer 
          center={[-15.7801, -47.9292]} 
          zoom={4} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          {geoData && (
            <GeoJSON 
              data={geoData} 
              style={{
                fillColor: '#F5C400',
                weight: 1,
                opacity: 1,
                color: '#1A1A1A',
                fillOpacity: 0.1
              }}
              onEachFeature={onEachFeature}
            />
          )}

          {volunteers.map(v => (
            <Marker 
              key={v.id} 
              position={[v.lat, v.lng]} 
              icon={customIcon}
              eventHandlers={{ click: () => handleMarkerClick(v) }}
            >
              <Popup className="rounded-xl">
                <div className="font-sans">
                  <h3 className="font-bold text-zinc-900">{v.city} - {v.state}</h3>
                  <p className="text-sm text-zinc-500">{v.name} ({v.role})</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Layer Controls */}
        <div className="absolute top-4 right-4 z-[1000] bg-white p-2 rounded-2xl shadow-lg border border-zinc-200 flex flex-col gap-2">
          {[
            { id: 'DENSITY', label: 'Densidade', icon: Users },
            { id: 'ACTIVE', label: 'Ativos 30d', icon: Target },
            { id: 'GROWTH', label: 'Crescimento', icon: TrendingUp },
            { id: 'LEADERSHIP', label: 'Lideranças', icon: Layers },
          ].map(layer => (
            <button
              key={layer.id}
              onClick={() => setActiveLayer(layer.id)}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeLayer === layer.id 
                  ? 'bg-zinc-900 text-white' 
                  : 'text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <layer.icon className="w-4 h-4" />
              {layer.label}
            </button>
          ))}
        </div>
      </div>

      {/* Territory Intelligence Panel */}
      {selectedCity ? (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full md:w-96 bg-white rounded-3xl shadow-sm border border-zinc-200 p-6 flex flex-col"
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{selectedCity.name}</h2>
            <p className="text-zinc-500 font-medium">{selectedCity.state}</p>
          </div>

          <div className="space-y-4 flex-1">
            <div className="flex justify-between items-center p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <span className="text-zinc-600 font-medium">Voluntários Totais</span>
              <span className="text-xl font-mono font-bold text-zinc-900">{selectedCity.totalVolunteers}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <span className="text-zinc-600 font-medium">Ativos (30d)</span>
              <span className="text-xl font-mono font-bold text-emerald-600">{selectedCity.activeVolunteers}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <span className="text-zinc-600 font-medium">Missões Concluídas</span>
              <span className="text-xl font-mono font-bold text-[#F5C400]">{selectedCity.missionsCompleted}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <span className="text-zinc-600 font-medium">Crescimento</span>
              <span className={`text-xl font-mono font-bold ${Number(selectedCity.growthRate) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {Number(selectedCity.growthRate) > 0 ? '+' : ''}{selectedCity.growthRate}%
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-zinc-900 text-white rounded-2xl">
              <span className="font-medium">Saúde do Território</span>
              <span className="text-xl font-mono font-bold text-[#F5C400]">{selectedCity.healthScore}/100</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-zinc-100">
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl text-yellow-800 mb-4">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">Oportunidade: Crescimento orgânico detectado. Considere lançar uma missão local.</p>
            </div>
            <button className="w-full bg-[#F5C400] text-zinc-900 font-bold py-3 px-4 rounded-xl hover:bg-[#e0b300] transition-colors shadow-sm">
              Criar Missão Local
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="hidden md:flex w-96 bg-zinc-50 rounded-3xl border border-zinc-200 border-dashed items-center justify-center p-8 text-center">
          <div>
            <Target className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Inteligência Territorial</h3>
            <p className="text-zinc-500 text-sm">Selecione um município no mapa para visualizar dados detalhados da operação.</p>
          </div>
        </div>
      )}
    </div>
  );
};
