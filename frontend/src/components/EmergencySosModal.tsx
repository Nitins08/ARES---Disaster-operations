import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  MapPin,
  Send,
  X,
  Radio,
  Clock,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Building,
  Heart,
  Flame,
  Waves,
  ShieldAlert,
  Info
} from 'lucide-react';
import { SOS_PHONE_NUMBER, SOS_PHONE_NUMBERS, buildEmergencySmsUri } from '../config/sos';
import { saveSosDispatchOffline } from '../lib/offlineQueue';

interface EmergencySosModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoords?: { lat: number; lng: number } | null;
}

interface LocationDetails {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

export const EmergencySosModal: React.FC<EmergencySosModalProps> = ({
  isOpen,
  onClose,
  initialCoords
}) => {
  const [description, setDescription] = useState<string>('');
  const [manualLocation, setManualLocation] = useState<string>('');
  const [location, setLocation] = useState<LocationDetails | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [smsStatusMessage, setSmsStatusMessage] = useState<string | null>(null);
  const [isCooldown, setIsCooldown] = useState<boolean>(false);
  const [selectedRecipient, setSelectedRecipient] = useState<string>(SOS_PHONE_NUMBER);

  // Initialize with any existing coords if passed
  useEffect(() => {
    if (initialCoords && !location) {
      setLocation({
        latitude: initialCoords.lat,
        longitude: initialCoords.lng,
        accuracy: 10,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  }, [initialCoords]);

  // Reset transient feedback when opening
  useEffect(() => {
    if (isOpen) {
      setSmsStatusMessage(null);
      setIsCooldown(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. GPS Location Capture using browser Geolocation API
  const handleCaptureLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation sensor is not supported on this device. Please enter your landmark or street below.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = position.coords;
        const now = new Date();
        const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: Math.round(coords.accuracy),
          timestamp: formattedTime,
        });
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please allow location in your browser settings or enter a landmark below.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Satellite GPS position currently unavailable. Please enter your street address or landmark below.');
            break;
          case error.TIMEOUT:
            setLocationError('GPS acquisition timed out. Please try capturing again or type your landmark below.');
            break;
          default:
            setLocationError('Could not retrieve GPS coordinates. Please enter your location manually below.');
        }
      },
      geoOptions
    );
  };

  // Quick Description Presets for elderly or panicked citizens
  const handleAddPreset = (text: string) => {
    if (!description.trim()) {
      setDescription(text);
    } else if (!description.includes(text)) {
      setDescription(`${description.trim()}, ${text}`);
    }
  };

  // 2. Format Emergency SMS message strictly matching specification
  const generateSmsBody = (): string => {
    const formattedDate = new Date().toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'medium',
    });

    const descText = description.trim() || 'Immediate emergency assistance requested.';

    if (location) {
      return (
`DAMAGE MAPPER - EMERGENCY SOS

Emergency Description: ${descText}

GPS Latitude: ${location.latitude.toFixed(6)}

GPS Longitude: ${location.longitude.toFixed(6)}

Location Map: https://www.google.com/maps?q=${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}

Time: ${formattedDate}

Please provide emergency assistance.`
      );
    } else {
      const locText = manualLocation.trim() || 'Location not specified (GPS unavailable)';
      return (
`DAMAGE MAPPER - EMERGENCY SOS

Emergency Description: ${descText}

Location: ${locText}

Time: ${formattedDate}

Please provide emergency assistance.`
      );
    }
  };

  // 3. Dispatch Native Emergency SMS
  const handleSendSms = () => {
    if (isCooldown) return;

    if (!location && !manualLocation.trim()) {
      setLocationError('Please capture your GPS location or enter a nearby landmark so responders can find you.');
      return;
    }

    const messageBody = generateSmsBody();
    const smsUri = buildEmergencySmsUri(selectedRecipient || SOS_PHONE_NUMBER, messageBody);

    // 4. Store emergency description and coordinates locally in IndexedDB (zero internet needed)
    saveSosDispatchOffline({
      description: description.trim() || 'Urgent emergency assistance requested',
      latitude: location?.latitude,
      longitude: location?.longitude,
      accuracy: location?.accuracy,
      timestamp: location?.timestamp || new Date().toLocaleTimeString(),
      recipients: selectedRecipient || SOS_PHONE_NUMBER,
      message_body: messageBody,
    }).catch((err) => console.warn('Could not archive SOS locally in IndexedDB:', err));

    // Prevent accidental double clicks
    setIsCooldown(true);
    setSmsStatusMessage('Opening your phone\'s messaging app...');

    // Launch native SMS application
    try {
      window.location.href = smsUri;
    } catch (err) {
      // Fallback for popup-blocked or simulated environments
      window.open(smsUri, '_self');
    }

    // Cooldown release after 4 seconds
    setTimeout(() => {
      setIsCooldown(false);
    }, 4000);
  };

  const previewBody = generateSmsBody();

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full border border-[#E5E7EB] flex flex-col overflow-hidden my-auto">
        {/* Urgent High-Contrast Header */}
        <div className="bg-[#DC2626] text-white p-4 sm:p-5 flex items-center justify-between border-b border-[#B91C1C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider text-white">
                <Radio className="w-3 h-3 text-white/90 animate-pulse" />
                <span>Offline Emergency SMS</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight leading-tight mt-0.5">
                EMERGENCY SOS DISPATCH
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close emergency SOS panel"
            className="w-8 h-8 rounded-lg bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Sub-banner for Elderly / Panicked Citizens */}
        <div className="bg-[#FEF2F2] border-b border-[#FECACA] px-4 py-2.5 flex items-start gap-2.5 text-xs text-[#991B1B]">
          <Info className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
          <p className="font-medium leading-relaxed">
            <strong className="font-bold text-[#7F1D1D]">No internet or mobile data required.</strong> Uses your phone's built-in GPS and cellular text messaging to dispatch your exact location directly to responders.
          </p>
        </div>

        {/* Modal Form Body */}
        <div className="p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
          {/* 1. Large Central Red SOS Button */}
          <div className="flex flex-col items-center justify-center pt-1 pb-1">
            <button
              type="button"
              onClick={handleSendSms}
              disabled={isCooldown}
              className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-lg flex flex-col items-center justify-center gap-1 transition transform active:scale-95 border-4 border-white ring-4 ring-[#FCA5A5] cursor-pointer ${
                isCooldown ? 'opacity-70 cursor-wait' : 'hover:scale-102'
              }`}
            >
              <AlertOctagon className="w-10 h-10 text-white" />
              <span className="font-black text-lg sm:text-xl tracking-wider uppercase">
                SEND SOS
              </span>
              <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">
                Via Native SMS
              </span>
            </button>
            <p className="text-xs text-[#64748B] font-medium mt-3 text-center">
              Tap the red SOS button to prepare emergency dispatch text
            </p>
          </div>

          {/* 2. Emergency Description Textarea with Quick Presets */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="sos-desc" className="text-xs font-bold text-[#111827] uppercase tracking-wide">
                1. Describe Emergency & Victims (Optional)
              </label>
              <span className="text-xs text-[#64748B]">Clear & concise</span>
            </div>

            <textarea
              id="sos-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g., Water rising into house, 3 elderly family members on roof, immediate medical/boat rescue needed..."
              className="w-full text-xs sm:text-sm border border-[#E5E7EB] focus:border-[#0F766E] rounded-xl p-3 bg-white text-[#111827] placeholder:text-[#9CA3AF] outline-none transition focus:ring-1 focus:ring-[#0F766E]"
            />

            {/* Quick Presets for Rapid 1-Tap Entry */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] font-medium text-[#64748B] self-center mr-1">Quick Select:</span>
              <button
                type="button"
                onClick={() => handleAddPreset('Trapped by floodwaters')}
                className="text-xs font-semibold bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#0F766E] border border-[#CCFBF1] px-2.5 py-1 rounded-lg transition flex items-center gap-1 active:scale-95"
              >
                <Waves className="w-3.5 h-3.5" />
                <span>Trapped by Water</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset('Fire spreading near building')}
                className="text-xs font-semibold bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#EA580C] border border-[#FED7AA] px-2.5 py-1 rounded-lg transition flex items-center gap-1 active:scale-95"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Fire / Smoke</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset('Medical assistance urgently needed')}
                className="text-xs font-semibold bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#047857] border border-[#A7F3D0] px-2.5 py-1 rounded-lg transition flex items-center gap-1 active:scale-95"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Medical Need</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset('Structural collapse / trapped under debris')}
                className="text-xs font-semibold bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] px-2.5 py-1 rounded-lg transition flex items-center gap-1 active:scale-95"
              >
                <Building className="w-3.5 h-3.5" />
                <span>Building Collapse</span>
              </button>
            </div>
          </div>

          {/* 3. GPS Location Section */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#111827] uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#0F766E]" />
                2. Current Location Status
              </span>
              {location && (
                <span className="text-[11px] font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
                  <span>GPS Locked</span>
                </span>
              )}
            </div>

            {/* GPS Coordinates or Live Status Display */}
            {location ? (
              <div className="bg-white border border-[#A7F3D0] rounded-xl p-3 flex flex-col gap-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#047857]">Coordinates Acquired</span>
                  <span className="text-[11px] text-[#64748B] font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#64748B]" />
                    {location.timestamp}
                  </span>
                </div>
                <div className="text-base font-bold font-mono text-[#111827] tracking-tight">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </div>
                <div className="flex items-center justify-between text-xs text-[#64748B] pt-1 border-t border-[#F3F4F6]">
                  <span className="font-semibold text-[#047857]">
                    Accuracy: ±{location.accuracy} metres
                  </span>
                  <span className="text-[11px] text-[#64748B]">
                    Device Satellite GPS
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-dashed border-[#D1D5DB] rounded-xl p-3 text-center text-xs text-[#64748B]">
                {isLocating ? (
                  <div className="flex items-center justify-center gap-2 py-1 text-[#0F766E] font-bold">
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>Acquiring high-accuracy satellite GPS...</span>
                  </div>
                ) : (
                  <span>GPS location has not been captured yet. Press the button below.</span>
                )}
              </div>
            )}

            {/* Capture Location Button */}
            <button
              type="button"
              onClick={handleCaptureLocation}
              disabled={isLocating}
              className="w-full py-2.5 bg-white hover:bg-[#F9FAFB] text-[#111827] font-semibold text-xs rounded-lg border border-[#E5E7EB] hover:border-[#D1D5DB] shadow-xs transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              <Navigation className={`w-3.5 h-3.5 text-[#0F766E] ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Requesting GPS Sensors...' : location ? 'Recapture GPS Location' : 'Capture Current Location'}</span>
            </button>

            {/* Location Error Notice if any */}
            {locationError && (
              <div className="p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{locationError}</span>
              </div>
            )}

            {/* Manual Landmark Input */}
            <div className="flex flex-col gap-1 pt-2 border-t border-[#E5E7EB]">
              <label htmlFor="manual-loc" className="text-xs font-semibold text-[#111827]">
                Nearby Landmark / Street (Use if indoors or GPS unavailable):
              </label>
              <input
                id="manual-loc"
                type="text"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                placeholder="E.g., Near St. Mary Church, 2nd Cross Street, Yellow House"
                className="text-xs border border-[#E5E7EB] rounded-lg p-2.5 bg-white text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#0F766E]"
              />
            </div>
          </div>

          {/* 4. Prepared SMS Preview */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1">
              <span>Prepared Emergency Message:</span>
              <span className="text-[10px] text-[#64748B] lowercase font-normal">(Prefilled in SMS app)</span>
            </span>
            <pre className="bg-[#F9FAFB] text-[#111827] text-xs p-3 rounded-xl border border-[#E5E7EB] font-mono whitespace-pre-wrap leading-relaxed select-all">
              {previewBody}
            </pre>
          </div>

          {/* 5. SMS Send Action Button */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={handleSendSms}
              disabled={isCooldown}
              className={`w-full py-3 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 border border-[#B91C1C] active:scale-98 ${
                isCooldown ? 'opacity-70 cursor-wait' : ''
              }`}
            >
              <Send className="w-4 h-4" />
              <span>SEND EMERGENCY SMS</span>
            </button>

            <div className="flex flex-col gap-1.5 text-[11px] text-[#64748B] px-1">
              <div className="flex items-center justify-between">
                <span>Emergency Recipients:</span>
                <span className="font-semibold text-[#047857]">Zero Internet Needed</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedRecipient(SOS_PHONE_NUMBERS.join(','))}
                  className={`px-2 py-0.5 rounded-md border text-xs font-mono font-bold transition ${
                    selectedRecipient === SOS_PHONE_NUMBERS.join(',')
                      ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-2xs'
                      : 'bg-white text-[#111827] border-[#E5E7EB] hover:bg-[#F9FAFB]'
                  }`}
                >
                  Both Numbers ({SOS_PHONE_NUMBERS.length})
                </button>
                {SOS_PHONE_NUMBERS.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSelectedRecipient(num)}
                    className={`px-2 py-0.5 rounded-md border text-xs font-mono font-bold transition ${
                      selectedRecipient === num
                        ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-2xs'
                        : 'bg-white text-[#111827] border-[#E5E7EB] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {smsStatusMessage && (
              <div className="p-2.5 bg-[#F0FDFA] border border-[#CCFBF1] text-[#0F766E] text-xs rounded-xl text-center font-bold">
                {smsStatusMessage}
              </div>
            )}

            {/* Truthful SMS Instruction Notice */}
            <div className="bg-[#F9FAFB] rounded-xl p-3 border border-[#E5E7EB] text-[#64748B] text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="font-bold text-[#111827]">Important: </strong>
                Pressing this button will launch your phone's native text messaging application with recipient and coordinates prefilled.
                <strong> You must press the SEND button inside your messaging app to transmit the SMS.</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
