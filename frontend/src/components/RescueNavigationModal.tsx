import React, { useState, useEffect } from 'react';
import {
  Navigation,
  MapPin,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Compass,
  Crosshair,
  X,
  ShieldAlert,
  Radio
} from 'lucide-react';
import { Incident } from '../types';
import { isValidCoordinate, formatCoordinates, copyCoordinatesToClipboard, buildTurnByTurnUrl } from '../lib/geoUtils';

interface RescueNavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident | null;
}

export const RescueNavigationModal: React.FC<RescueNavigationModalProps> = ({
  isOpen,
  onClose,
  incident
}) => {
  const [adminCoords, setAdminCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [adminAccuracy, setAdminAccuracy] = useState<number | null>(null);
  const [isLocatingAdmin, setIsLocatingAdmin] = useState<boolean>(false);
  const [adminLocationError, setAdminLocationError] = useState<string | null>(null);
  const [manualOrigin, setManualOrigin] = useState<string>('');
  const [useCustomOrigin, setUseCustomOrigin] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Acquire Admin's current GPS location on modal open
  useEffect(() => {
    if (!isOpen || !incident) return;

    setCopied(false);
    setAdminLocationError(null);
    setUseCustomOrigin(false);
    setManualOrigin('');

    if ('geolocation' in navigator) {
      setIsLocatingAdmin(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setAdminCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setAdminAccuracy(Math.round(position.coords.accuracy));
          setIsLocatingAdmin(false);
        },
        (error) => {
          setIsLocatingAdmin(false);
          let errorMsg = 'Could not acquire Admin GPS location.';
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = 'Admin location permission denied by browser.';
          } else if (error.code === error.TIMEOUT) {
            errorMsg = 'Admin GPS acquisition timed out.';
          }
          setAdminLocationError(errorMsg);
          setUseCustomOrigin(true);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    } else {
      setAdminLocationError('Geolocation sensor is not supported in this browser.');
      setUseCustomOrigin(true);
    }
  }, [isOpen, incident]);

  if (!isOpen || !incident) return null;

  const hasValidDestination = isValidCoordinate(incident.latitude, incident.longitude);
  const isGpsVerified = incident.reports?.[0]?.is_gps ?? false;

  const handleCopy = async () => {
    if (!hasValidDestination) return;
    const ok = await copyCoordinatesToClipboard(incident.latitude, incident.longitude);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleLaunchNavigation = () => {
    if (!hasValidDestination) return;

    let origin: any = null;
    if (useCustomOrigin && manualOrigin.trim()) {
      origin = manualOrigin.trim();
    } else if (adminCoords) {
      origin = adminCoords;
    }

    const navUrl = buildTurnByTurnUrl(incident.latitude, incident.longitude, origin);
    window.open(navUrl, '_blank', 'noopener,noreferrer');
  };

  const formattedReportTime = new Date(incident.created_at).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'medium'
  });

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rescue-nav-title"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400">
              <Navigation className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 id="rescue-nav-title" className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Rescue Turn-by-Turn Navigation
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                  incident.priority_level === 'CRITICAL'
                    ? 'bg-red-600 text-white'
                    : incident.priority_level === 'HIGH'
                    ? 'bg-orange-500 text-white'
                    : 'bg-teal-600 text-white'
                }`}>
                  {incident.priority_level}
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                Incident #{incident.id}: {incident.disaster_type.toUpperCase()} • Direct Route Dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-700 text-xs">
          {/* 1. DESTINATION SECTION (Affected Person's Coordinates) */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                Target Destination (Affected Person)
              </span>
              {hasValidDestination ? (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-[11px] shadow-2xs transition active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Coordinates</span>
                    </>
                  )}
                </button>
              ) : null}
            </div>

            {hasValidDestination ? (
              <div>
                <div className="flex items-baseline gap-2 font-mono text-base font-extrabold text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 font-sans text-xs font-semibold">GPS:</span>
                  <span>{incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}</span>
                </div>
                {incident.address_summary && (
                  <p className="text-[11px] text-slate-600 mt-1.5 font-medium">
                    Locality: {incident.address_summary}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs">Exact location unavailable</p>
                  <p className="text-[11px] text-red-700 mt-0.5">
                    The citizen's device did not provide valid GPS coordinates. Guessed coordinates are never substituted for navigation safety.
                  </p>
                </div>
              </div>
            )}

            {/* Description Synopsis */}
            <div className="border-t border-slate-200 pt-2 text-[11px]">
              <span className="font-bold text-slate-700">Report Description: </span>
              <span className="text-slate-600">{incident.what_happened || 'Immediate emergency assistance requested.'}</span>
            </div>
          </div>

          {/* 2. LOCATION FRESHNESS & SENSOR ACCURACY */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              Location Freshness & GPS Capture Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
              <div className="bg-white/80 p-2 rounded border border-amber-200/60">
                <span className="text-[10px] text-slate-500 block font-semibold">Captured At:</span>
                <span className="font-bold text-slate-900">{formattedReportTime}</span>
              </div>
              <div className="bg-white/80 p-2 rounded border border-amber-200/60">
                <span className="text-[10px] text-slate-500 block font-semibold">GPS Source & Accuracy:</span>
                <span className="font-bold text-slate-900">
                  {isGpsVerified ? 'Device GPS Sensor (±5m - ±15m)' : 'Reported coordinate pin'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-1.5 text-[10px] font-medium text-amber-900 bg-amber-100/70 p-2 rounded-lg border border-amber-200">
              <Radio className="w-3.5 h-3.5 text-amber-800 shrink-0 mt-0.5" />
              <span>
                <strong>Static Snapshot Notice:</strong> This represents the device location reported at SOS dispatch time. 
                Continuous real-time tracking is <strong>not</strong> active.
              </span>
            </div>
          </div>

          {/* 3. STARTING POINT (ADMIN / RESCUE TEAM ORIGIN) */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-teal-700" />
                Starting Point (Your Location)
              </span>
              <button
                type="button"
                onClick={() => setUseCustomOrigin(!useCustomOrigin)}
                className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold underline underline-offset-2"
              >
                {useCustomOrigin ? 'Use GPS Location' : 'Enter Custom Address'}
              </button>
            </div>

            {!useCustomOrigin ? (
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                {isLocatingAdmin ? (
                  <div className="flex items-center gap-2 text-slate-500 py-1">
                    <div className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    <span>Acquiring Admin GPS sensor location...</span>
                  </div>
                ) : adminCoords ? (
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <span className="font-semibold text-emerald-700 flex items-center gap-1 text-[11px]">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Admin GPS Acquired
                      </span>
                      <p className="font-mono text-slate-800 font-bold text-xs mt-0.5">
                        {adminCoords.lat.toFixed(5)}, {adminCoords.lng.toFixed(5)}
                      </p>
                    </div>
                    {adminAccuracy && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Accuracy: ±{adminAccuracy}m
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-600 py-1">
                    <p className="text-amber-700 font-semibold">{adminLocationError || 'Admin GPS unavailable.'}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Directions will launch with the destination preset; your device will prompt for your current spot.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Enter dispatch station, landmark, or starting address..."
                  value={manualOrigin}
                  onChange={(e) => setManualOrigin(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
                <p className="text-[10px] text-slate-500">
                  Leave blank to allow Google Maps to automatically route from your device's live position.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleLaunchNavigation}
            disabled={!hasValidDestination}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition active:scale-95 ${
              hasValidDestination
                ? 'bg-teal-700 hover:bg-teal-800'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            <Navigation className="w-4 h-4 text-white" />
            <span>Open Turn-by-Turn Directions</span>
            <ExternalLink className="w-3.5 h-3.5 text-teal-200 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
