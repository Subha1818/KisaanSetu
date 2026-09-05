import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Info, Building, RefreshCw } from 'lucide-react';

export interface MapCentre {
  id: string;
  name: string;
  owner_name: string;
  status: string;
  approval_status?: string;
  latitude: number | null;
  longitude: number | null;
  daily_capacity?: number;
  geo_blocks?: {
    district_name?: string;
    block_name?: string;
    state_name?: string;
  } | null;
}

interface AdminCentresMapProps {
  centres: MapCentre[];
  loading?: boolean;
}

export const AdminCentresMap: React.FC<AdminCentresMapProps> = ({ centres, loading = false }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [selectedCentreFilter, setSelectedCentreFilter] = useState<'all' | 'open' | 'closed'>('all');

  // Filter approved centres with valid numeric coordinates
  const validCoordinateCentres = centres.filter(
    (c) =>
      c.latitude !== null &&
      c.longitude !== null &&
      !isNaN(Number(c.latitude)) &&
      !isNaN(Number(c.longitude)) &&
      (c.latitude !== 0 || c.longitude !== 0)
  );

  const missingCoordinateCentres = centres.filter(
    (c) =>
      c.latitude === null ||
      c.longitude === null ||
      isNaN(Number(c.latitude)) ||
      isNaN(Number(c.longitude)) ||
      (c.latitude === 0 && c.longitude === 0)
  );

  const displayedCentres = validCoordinateCentres.filter((c) => {
    if (selectedCentreFilter === 'open') return c.status === 'open';
    if (selectedCentreFilter === 'closed') return c.status !== 'open';
    return true;
  });

  const fitAllBounds = () => {
    if (!mapInstanceRef.current || validCoordinateCentres.length === 0) return;
    const latLngs = validCoordinateCentres.map(
      (c) => [Number(c.latitude), Number(c.longitude)] as [number, number]
    );
    const bounds = L.latLngBounds(latLngs);
    mapInstanceRef.current.fitBounds(bounds, { padding: [45, 45], maxZoom: 13 });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered on geographic center of India by default
    const map = L.map(mapContainerRef.current, {
      center: [22.5937, 82.0],
      zoom: 5,
      scrollWheelZoom: false,
      zoomControl: false,
    });

    // Custom positioned zoom control on top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Invalidate size after layout stabilization
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers and Fit Bounds when centres or filter change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const boundsPoints: [number, number][] = [];

    displayedCentres.forEach((centre) => {
      const lat = Number(centre.latitude);
      const lng = Number(centre.longitude);
      const isOpen = centre.status === 'open';
      boundsPoints.push([lat, lng]);

      const markerHtml = `
        <div style="
          width: 28px;
          height: 28px;
          background: ${isOpen ? '#10B981' : '#EF4444'};
          border: 2.5px solid #FFFFFF;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3), 0 0 0 3px ${isOpen ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'};
          cursor: pointer;
          transition: transform 0.2s ease;
        ">
          <svg style="width: 14px; height: 14px; fill: none; stroke: #FFFFFF; stroke-width: 2.2;" viewBox="0 0 24 24">
            <path d="M3 21h18M5 21V7l7-4 7 4v14M9 10v4M15 10v4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-leaflet-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16],
      });

      const locationStr = [
        centre.geo_blocks?.block_name,
        centre.geo_blocks?.district_name,
        centre.geo_blocks?.state_name,
      ]
        .filter(Boolean)
        .join(', ');

      const popupHtml = `
        <div style="font-family: inherit; padding: 2px; min-width: 210px; line-height: 1.4;">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <h4 style="font-weight: 800; font-size: 13.5px; color: #0F172A; margin: 0; line-height: 1.2;">
              ${centre.name}
            </h4>
            <span style="
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              padding: 2px 8px;
              border-radius: 9999px;
              background: ${isOpen ? '#ECFDF5' : '#FEF2F2'};
              color: ${isOpen ? '#047857' : '#B91C1C'};
              border: 1px solid ${isOpen ? '#A7F3D0' : '#FECACA'};
              white-space: nowrap;
            ">
              ${isOpen ? 'Open' : 'Closed'}
            </span>
          </div>
          <div style="font-size: 11.5px; color: #64748B; margin-bottom: 6px; display: flex; align-items: flex-start; gap: 4px;">
            <span style="color: #6366F1;">📍</span>
            <span>${locationStr || 'Location details unavailable'}</span>
          </div>
          <div style="padding-top: 6px; border-top: 1px solid #F1F5F9; font-size: 11px; color: #334155; display: flex; flex-direction: column; gap: 3px;">
            <div><strong style="color: #64748B;">In-Charge:</strong> <span style="font-weight: 600;">${centre.owner_name || 'N/A'}</span></div>
            ${centre.daily_capacity ? `<div><strong style="color: #64748B;">Capacity:</strong> <span style="font-weight: 600;">${centre.daily_capacity} slots/day</span></div>` : ''}
            <div><strong style="color: #64748B;">GPS:</strong> <span style="font-family: monospace; font-size: 10px; color: #475569;">${lat.toFixed(4)}, ${lng.toFixed(4)}</span></div>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: customIcon }).bindPopup(popupHtml, {
        maxWidth: 280,
        className: 'custom-admin-popup',
      });

      markersGroup.addLayer(marker);
    });

    // Auto-fit bounds if we have points
    if (boundsPoints.length > 1) {
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 11);
    } else {
      map.setView([22.5937, 82.0], 5);
    }
  }, [displayedCentres]);

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm shadow-slate-900/5 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                Procurement Centre Geographic Distribution
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Live interactive spatial plot of approved depot locations across India (OpenStreetMap)
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Legend */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Status Filter Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setSelectedCentreFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedCentreFilter === 'all'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({validCoordinateCentres.length})
            </button>
            <button
              onClick={() => setSelectedCentreFilter('open')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                selectedCentreFilter === 'open'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Open ({validCoordinateCentres.filter((c) => c.status === 'open').length})
            </button>
            <button
              onClick={() => setSelectedCentreFilter('closed')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                selectedCentreFilter === 'closed'
                  ? 'bg-rose-600 text-white font-bold shadow-xs'
                  : 'text-rose-700 hover:text-rose-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Closed ({validCoordinateCentres.filter((c) => c.status !== 'open').length})
            </button>
          </div>

          {/* Reset / Auto-fit Bounds Button */}
          <button
            onClick={fitAllBounds}
            disabled={validCoordinateCentres.length === 0}
            title="Auto-fit map bounds to all plotted centres"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Navigation className="w-3.5 h-3.5 text-indigo-600" />
            Fit Bounds
          </button>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className="relative admin-map-wrapper">
        <style>{`
          .admin-map-wrapper .leaflet-pane {
            z-index: 4 !important;
          }
          .admin-map-wrapper .leaflet-top,
          .admin-map-wrapper .leaflet-bottom {
            z-index: 8 !important;
          }
          .custom-admin-popup .leaflet-popup-content-wrapper {
            border-radius: 16px;
            box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1);
            border: 1px solid #E2E8F0;
            padding: 4px;
          }
          .custom-admin-popup .leaflet-popup-tip {
            box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.1);
            border: 1px solid #E2E8F0;
          }
        `}</style>
        <div
          ref={mapContainerRef}
          style={{ height: '420px', width: '100%' }}
          className="bg-slate-100"
        />

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
            <span className="text-xs font-bold text-slate-700">Loading spatial centre data...</span>
          </div>
        )}
      </div>

      {/* Bottom Integrity Indicator / Honesty Note Banner */}
      <div className="bg-slate-50/90 px-5 py-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Info className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            <strong className="text-slate-900 font-bold">
              {validCoordinateCentres.length} of {centres.length} approved centres
            </strong>{' '}
            have GPS coordinates set.
            {missingCoordinateCentres.length > 0 && (
              <span className="text-slate-500 ml-1">
                ({missingCoordinateCentres.length} centre{missingCoordinateCentres.length === 1 ? '' : 's'} registered without coordinates excluded from map)
              </span>
            )}
          </span>
        </div>

        {/* Active Marker Legend */}
        <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
            Open Depot
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200"></span>
            Closed Depot
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdminCentresMap;
