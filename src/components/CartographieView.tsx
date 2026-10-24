import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Building2, Layers, Filter, Compass } from 'lucide-react';
import type { Quartier, EspaceJeunesse } from '../shared/types.ts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface CartographieViewProps {
  quartiers: Quartier[];
  espaces: EspaceJeunesse[];
}

export const CartographieView: React.FC<CartographieViewProps> = ({ quartiers, espaces }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [selectedQuartier, setSelectedQuartier] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Coordonnées centrales de Lambanyi (Conakry, Guinée)
    const map = L.map(mapContainerRef.current).setView([9.6200, -13.6200], 13);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | Commune de Lambanyi',
      maxZoom: 18,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when filters change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // 1. Marqueurs des 14 quartiers
    quartiers.forEach((q) => {
      if (selectedQuartier !== 'all' && q.id !== selectedQuartier) return;

      const circle = L.circle(q.coordonnees, {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.15,
        radius: 450,
      });

      const quartierMarker = L.marker(q.coordonnees, {
        icon: L.divIcon({
          className: 'custom-quartier-label',
          html: `<div style="background-color: #064e3b; color: #6ee7b7; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; border: 1px solid #10b981; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">${q.nom}</div>`,
        }),
      });

      quartierMarker.bindPopup(`
        <div style="font-family: sans-serif; color: #111;">
          <h4 style="font-weight: bold; font-size: 13px; margin: 0 0 4px 0;">Quartier : ${q.nom}</h4>
          <p style="font-size: 11px; margin: 0 0 4px 0;">Code : <strong>${q.code}</strong></p>
          <p style="font-size: 11px; margin: 0;">Population estimée : <strong>${q.population_estimee.toLocaleString()} hab.</strong></p>
        </div>
      `);

      markersLayerRef.current?.addLayer(circle);
      markersLayerRef.current?.addLayer(quartierMarker);
    });

    // 2. Marqueurs des Espaces Jeunesse
    espaces.forEach((esp) => {
      if (selectedQuartier !== 'all' && esp.quartier_id !== selectedQuartier) return;
      if (selectedType !== 'all' && esp.type_espace !== selectedType) return;

      const getIconColor = (etat: string) => {
        if (etat === 'tres_bon') return '#10b981';
        if (etat === 'moyen') return '#f59e0b';
        return '#ef4444';
      };

      const color = getIconColor(esp.etat);

      const spaceMarker = L.marker([esp.latitude, esp.longitude], {
        icon: L.divIcon({
          className: 'custom-space-pin',
          html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px ${color};"></div>`,
        }),
      });

      spaceMarker.bindPopup(`
        <div style="font-family: sans-serif; color: #111; min-width: 180px;">
          <h4 style="font-weight: bold; font-size: 13px; margin: 0 0 2px 0;">${esp.nom}</h4>
          <span style="display: inline-block; background: #e5e7eb; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; text-transform: capitalize; margin-bottom: 6px;">
            ${esp.type_espace.replace('_', ' ')} · État : ${esp.etat.replace('_', ' ')}
          </span>
          <p style="font-size: 11px; margin: 0 0 4px 0;">Quartier : <strong>${esp.quartier_nom}</strong></p>
          ${esp.description_besoins ? `<p style="font-size: 11px; margin: 0; color: #4b5563;">Besoins : ${esp.description_besoins}</p>` : ''}
          <div style="font-size: 10px; color: #6b7280; margin-top: 6px;">GPS: ${esp.latitude.toFixed(4)}, ${esp.longitude.toFixed(4)}</div>
        </div>
      `);

      markersLayerRef.current?.addLayer(spaceMarker);
    });
  }, [quartiers, espaces, selectedQuartier, selectedType]);

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-white">
              Cartographie des 14 Quartiers & Espaces Jeunesse
            </h3>
            <p className="text-xs text-neutral-400">
              Commune de Lambanyi · OpenStreetMap (CDC Option B)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={selectedQuartier}
              onChange={(e) => setSelectedQuartier(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="all">Tous les 14 Quartiers</option>
              {quartiers.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="all">Tous types d'espaces</option>
              <option value="maison_des_jeunes">Maisons des jeunes</option>
              <option value="terrain_football">Terrains de football</option>
              <option value="espace_polyvalent">Plateaux omnisports</option>
              <option value="foyer_socioculturel">Foyers socioculturels</option>
              <option value="emprise_amenagee">Emprises aménagées</option>
            </select>
          </div>
        </div>
      </div>

      {/* Map container */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow h-[520px] relative">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-20 bg-neutral-950/90 border border-neutral-800 backdrop-blur rounded-lg p-3 text-xs text-neutral-300 shadow-xl space-y-1.5">
          <div className="font-semibold text-white text-[11px] uppercase tracking-wider mb-1">
            Légende Cartographique
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block border border-white"></span>
            <span>Espace en très bon état</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block border border-white"></span>
            <span>Espace à réhabiliter / Moyen</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block border border-white"></span>
            <span>Espace dégradé / À équiper</span>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-neutral-800">
            <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-500 inline-block"></span>
            <span>Zone de quartier Lambanyi</span>
          </div>
        </div>
      </div>
    </div>
  );
};
