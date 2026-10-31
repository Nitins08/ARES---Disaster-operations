import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Incident } from '../types';
import { isValidCoordinate, copyCoordinatesToClipboard } from '../lib/geoUtils';
import { Navigation, Copy, Check, Clock, AlertTriangle } from 'lucide-react';

interface LeafletMapProps {
  incidents?: Incident[];
  selectedIncident?: Incident | null;
  onSelectIncident?: (incident: Incident) => void;
  onNavigateIncident?: (incident: Incident) => void;
  // Picker mode for Report portal
  isPickerMode?: boolean;
  pickerLocation?: { lat: number; lng: number } | null;
  onPickerLocationChange?: (lat: number, lng: number) => void;
  center?: [number, number];
  zoom?: number;
}

// Custom Marker generator based on Priority
function createPriorityIcon(priority: string) {
  let bgColor = '#0F766E'; // Low: Deep Teal
  let pulseClass = '';

  if (priority === 'CRITICAL') {
    bgColor = '#DC2626'; // Red
    pulseClass = 'pulse-marker-critical';
  } else if (priority === 'HIGH') {
    bgColor = '#EA580C'; // Orange
  } else if (priority === 'MEDIUM') {
    bgColor = '#D97706'; // Amber
  } else if (priority === 'LOW') {
    bgColor = '#0F766E'; // Deep Teal
  }

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="background-color: ${bgColor};" class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md border-2 border-white ${pulseClass}">
        ${priority.charAt(0)}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

const pickerIcon = L.divIcon({
  className: 'picker-div-icon',
  html: `
    <div class="w-8 h-8 rounded-full bg-[#0F766E] flex items-center justify-center text-white text-xs font-bold shadow-xl border-2 border-white ring-4 ring-[#99F6E4]">
      📍
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Helper component to pan map when selected incident changes
function MapRecenter({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, 14, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

// Helper component to automatically invalidate map size when container is resized or mounted
function MapAutoResizer() {
  const map = useMap();

  useEffect(() => {
    // 1. Immediate invalidation
    map.invalidateSize();

    // 2. Next animation frame
    const rafId = requestAnimationFrame(() => {
      map.invalidateSize();
    });

    // 3. Staggered timeouts to catch tab transitions or layout recalculations
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 300);

    // 4. ResizeObserver on the map's container DOM node
    let observer: ResizeObserver | null = null;
    const container = map.getContainer();
    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        map.invalidateSize();
      });
      observer.observe(container);
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [map]);

  return null;
}

// Helper component for click-to-pick in Citizen Report portal
function LocationPickerHandler({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onPick) {
        onPick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  incidents = [],
  selectedIncident,
  onSelectIncident,
  onNavigateIncident,
  isPickerMode = false,
  pickerLocation,
  onPickerLocationChange,
  center = [13.0827, 80.2707], // Default city center (Chennai/Emergency center)
  zoom = 12,
}) => {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const hasSelectedValidCoords = selectedIncident && isValidCoordinate(selectedIncident.latitude, selectedIncident.longitude);
  const activeCenter: [number, number] = hasSelectedValidCoords
    ? [selectedIncident.latitude, selectedIncident.longitude]
    : pickerLocation
    ? [pickerLocation.lat, pickerLocation.lng]
    : center;

  const handleCopyCoords = async (e: React.MouseEvent, inc: Incident) => {
    e.stopPropagation();
    if (!isValidCoordinate(inc.latitude, inc.longitude)) return;
    const ok = await copyCoordinatesToClipboard(inc.latitude, inc.longitude);
    if (ok) {
      setCopiedId(inc.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  return (
    <div className="w-full h-full relative rounded-lg overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
      <MapContainer
        center={activeCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
        style={{ height: '100%', width: '100%' }}
      >
        <MapAutoResizer />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {hasSelectedValidCoords && (
          <MapRecenter target={[selectedIncident.latitude, selectedIncident.longitude]} />
        )}

        {/* Citizen Report Pin Picker Mode */}
        {isPickerMode && (
          <>
            <LocationPickerHandler onPick={onPickerLocationChange} />
            {pickerLocation && (
              <Marker
                position={[pickerLocation.lat, pickerLocation.lng]}
                icon={pickerIcon}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const marker = e.target;
                    const position = marker.getLatLng();
                    if (onPickerLocationChange) {
                      onPickerLocationChange(position.lat, position.lng);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold text-indigo-700">Selected Disaster Location</p>
                    <p className="text-slate-500">Drag pin or click map to adjust</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </>
        )}

        {/* Incident Queue Markers for Console */}
        {!isPickerMode &&
          incidents.map((inc) => {
            // Strict check: DO NOT place a guessed marker if coordinates are missing or invalid
            if (!isValidCoordinate(inc.latitude, inc.longitude)) return null;
            const icon = createPriorityIcon(inc.priority_level);

            return (
              <Marker
                key={inc.id}
                position={[inc.latitude, inc.longitude]}
                icon={icon}
                eventHandlers={{
                  click: () => onSelectIncident && onSelectIncident(inc),
                }}
              >
                <Popup>
                  <div className="p-1 max-w-[260px] text-slate-800">
                    {inc.primary_image_url && (
                      <div className="w-full h-16 rounded overflow-hidden mb-1.5 bg-slate-900 border border-slate-200">
                        <img
                          src={inc.primary_image_url}
                          alt={inc.disaster_type}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const p = (e.currentTarget as HTMLElement).parentElement;
                            if (p) p.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-xs uppercase tracking-wide text-[#111827]">
                        {inc.disaster_type}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          inc.priority_level === 'CRITICAL'
                            ? 'bg-[#FEF2F2] text-[#DC2626]'
                            : inc.priority_level === 'HIGH'
                            ? 'bg-[#FFF7ED] text-[#EA580C]'
                            : inc.priority_level === 'MEDIUM'
                            ? 'bg-[#FFFBEB] text-[#D97706]'
                            : 'bg-[#F0FDFA] text-[#0F766E]'
                        }`}
                      >
                        {inc.priority_level} ({inc.priority_score.toFixed(0)})
                      </span>
                    </div>

                    {/* Source & Verification Status */}
                    <div className="flex items-center justify-between text-[10px] text-[#64748B] mb-1">
                      <span className="font-semibold">Source: {inc.report_source || 'Citizen'}</span>
                      <span className="font-bold text-[#0F766E]">
                        {inc.verification_status || (inc.status === 'needs_information' ? 'Unverified' : inc.status === 'new' ? 'Under Review' : 'Verified')}
                      </span>
                    </div>

                    {/* What Happened (Concise Synopsis) */}
                    <p className="text-[11px] font-semibold text-[#111827] bg-[#F9FAFB] p-1.5 rounded border border-[#E5E7EB] mb-1.5 line-clamp-2">
                      {inc.what_happened || inc.why_this_rank}
                    </p>

                    {/* Saved GPS Coordinates & Copy */}
                    <div className="bg-slate-100 p-1.5 rounded border border-slate-200 mb-1.5 flex items-center justify-between gap-1 text-[10px] font-mono">
                      <div>
                        <span className="text-slate-500 text-[9px] block font-sans font-semibold">DEVICE GPS:</span>
                        <span className="font-bold text-slate-900">{inc.latitude.toFixed(5)}, {inc.longitude.toFixed(5)}</span>
                      </div>
                      <button
                        onClick={(e) => handleCopyCoords(e, inc)}
                        className="px-1.5 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-50 text-[10px] font-sans font-medium flex items-center gap-0.5"
                        title="Copy exact latitude, longitude"
                      >
                        {copiedId === inc.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-500" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Location Freshness and Real-time Disclaimer */}
                    <div className="text-[9px] text-slate-500 bg-amber-50 border border-amber-200 p-1 rounded mb-2 flex items-start gap-1">
                      <Clock className="w-3 h-3 text-amber-700 shrink-0 mt-0.5" />
                      <span>
                        Reported: {new Date(inc.created_at).toLocaleTimeString()} (Static snapshot at dispatch — not live tracking)
                      </span>
                    </div>

                    {/* Action Buttons: Navigate to Incident & View Details */}
                    <div className="flex flex-col gap-1">
                      {onNavigateIncident && (
                        <button
                          onClick={() => onNavigateIncident(inc)}
                          className="w-full text-center py-1.5 bg-[#DC2626] hover:bg-[#b91c1c] text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Navigate to Incident</span>
                        </button>
                      )}

                      <button
                        onClick={() => onSelectIncident && onSelectIncident(inc)}
                        className="w-full text-center py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition"
                      >
                        View Review Details
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};
