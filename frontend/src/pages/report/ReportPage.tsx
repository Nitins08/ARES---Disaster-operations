import React, { useState } from 'react';
import { Camera, MapPin, Upload, AlertCircle, CheckCircle, Smartphone, Send, Radio, User, AlertOctagon } from 'lucide-react';
import { submitReport } from '../../lib/api';
import { saveReportOffline } from '../../lib/offlineQueue';
import { LeafletMap } from '../../components/LeafletMap';
import { EmergencySosModal } from '../../components/EmergencySosModal';

interface ReportPageProps {
  onNavigateToTracking?: (token: string) => void;
}

export const ReportPage: React.FC<ReportPageProps> = ({ onNavigateToTracking }) => {
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [locationMode, setLocationMode] = useState<'gps' | 'map'>('gps');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isGps, setIsGps] = useState(false);
  const [isForOther, setIsForOther] = useState(false);
  const [reporterContact, setReporterContact] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedToken, setSubmittedToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSosOpen, setIsSosOpen] = useState(false);

  // Handle Photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Automatic Device GPS
  const handleGetDeviceGPS = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setErrorMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsGps(true);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setErrorMsg('Could not detect device GPS. Please pick your location on the map below.');
        setLocationMode('map');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Submit Report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && !photoFile) {
      setErrorMsg('Please provide either a photo or a description of the emergency.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const formData = new FormData();
    if (description.trim()) formData.append('raw_description', description.trim());
    if (coords) {
      formData.append('latitude', coords.lat.toString());
      formData.append('longitude', coords.lng.toString());
      formData.append('is_gps', isGps ? 'true' : 'false');
    }
    formData.append('is_reporting_for_other', isForOther ? 'true' : 'false');
    if (reporterContact.trim()) formData.append('reporter_contact', reporterContact.trim());
    if (photoFile) formData.append('photo', photoFile);

    try {
      if (navigator.onLine) {
        const result = await submitReport(formData);
        setSubmittedToken(result.tracking_token);
      } else {
        // Save to IndexedDB if offline
        const offlineId = await saveReportOffline({
          raw_description: description.trim(),
          latitude: coords?.lat,
          longitude: coords?.lng,
          is_gps: isGps,
          is_reporting_for_other: isForOther,
          reporter_contact: reporterContact.trim(),
          photo_blob: photoFile || undefined,
        });
        setSubmittedToken(offlineId);
      }
    } catch (err: any) {
      console.warn('Network submission failed, queueing offline:', err);
      const offlineId = await saveReportOffline({
        raw_description: description.trim(),
        latitude: coords?.lat,
        longitude: coords?.lng,
        is_gps: isGps,
        is_reporting_for_other: isForOther,
        reporter_contact: reporterContact.trim(),
        photo_blob: photoFile || undefined,
      });
      setSubmittedToken(offlineId);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedToken) {
    return (
      <div className="max-w-lg mx-auto p-6 bg-white rounded-xl shadow-xs border border-[#E5E7EB] mt-8 text-center flex flex-col items-center">
        <div className="w-14 h-14 bg-[#ECFDF5] text-[#047857] rounded-full flex items-center justify-center mb-3">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-[#111827] mb-1">Emergency Report Logged</h2>
        <p className="text-xs text-[#64748B] mb-5 max-w-sm">
          Your report has entered the prioritized rescue queue. First responders in this sector are now alerted.
        </p>

        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3.5 w-full mb-5 text-left">
          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
            Tracking URL Token
          </span>
          <span className="font-mono text-xs font-bold text-[#0F766E] break-all select-all">
            /r/{submittedToken}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 w-full">
          <button
            onClick={() => onNavigateToTracking && onNavigateToTracking(submittedToken)}
            className="flex-1 bg-[#0F766E] hover:bg-[#0d655e] text-white font-semibold text-xs py-2.5 rounded-lg shadow-xs transition"
          >
            Track Status & Live Updates
          </button>
          <button
            onClick={() => {
              setSubmittedToken(null);
              setDescription('');
              setPhotoFile(null);
              setPhotoPreview(null);
              setCoords(null);
            }}
            className="flex-1 bg-white hover:bg-[#F9FAFB] text-[#111827] border border-[#E5E7EB] font-semibold text-xs py-2.5 rounded-lg transition"
          >
            Submit Another Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 pb-24 relative">
      {/* HIGHLY VISIBLE OFFLINE SOS EMERGENCY BANNER & BUTTON */}
      <div className="mb-6 bg-[#DC2626] text-white rounded-xl p-4 shadow-sm border border-[#B91C1C] flex flex-col sm:flex-row items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[10px] tracking-wider uppercase bg-black/20 px-2 py-0.5 rounded text-white flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-white/90 animate-pulse" />
                Offline SOS • Zero Internet
              </span>
            </div>
            <h2 className="font-bold text-base leading-tight mt-1">
              Life Danger? Send Emergency SMS
            </h2>
            <p className="text-xs text-white/90 leading-snug">
              Generates native SMS with exact GPS coordinates for emergency dispatch.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsSosOpen(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-[#F9FAFB] text-[#DC2626] font-bold text-xs rounded-lg shadow-xs border border-white transition flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
        >
          <AlertOctagon className="w-3.5 h-3.5 text-[#DC2626]" />
          <span>ACTIVATE SOS</span>
        </button>
      </div>

      <div className="mb-5">
        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1] px-2 py-0.5 rounded">
          Emergency Citizen Portal
        </span>
        <h1 className="text-xl font-bold text-[#111827] mt-1.5">Report Disaster / Damage</h1>
        <p className="text-xs text-[#64748B]">
          Upload photos or describe hazards. Any language supported — automatic translation and GPS location.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Photo Upload / Camera Capture */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#111827]">
            Photo of Hazard / Damage (Optional but Recommended)
          </label>
          <div className="border border-dashed border-[#D1D5DB] hover:border-[#0F766E] rounded-xl p-4 flex flex-col items-center justify-center bg-white transition cursor-pointer relative overflow-hidden">
            {photoPreview ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-[#E5E7EB]">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="absolute top-2 right-2 bg-black/75 hover:bg-black text-white text-xs px-2.5 py-1 rounded-md"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full cursor-pointer py-3">
                <Camera className="w-7 h-7 text-[#64748B] mb-1.5" />
                <span className="text-xs font-semibold text-[#111827]">
                  Take Photo or Select File
                </span>
                <span className="text-[10px] text-[#64748B]">
                  EXIF GPS extracted automatically & privacy-sanitized
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Typed Description (Any Language) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#111827]">
              Describe Emergency / Location Details
            </label>
            <span className="text-[10px] text-[#64748B]">
              Multilingual (Hindi, Tamil, Spanish, English, etc.)
            </span>
          </div>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="E.g., Water is entering homes, 4 people trapped on roof, live wires touching water near the school..."
            className="w-full text-xs border border-[#E5E7EB] rounded-lg p-2.5 bg-white text-[#111827] placeholder-[#9CA3AF] focus:ring-1 focus:ring-[#0F766E] focus:border-[#0F766E] focus:outline-none"
          />
        </div>

        {/* Location Section */}
        <div className="flex flex-col gap-2.5 p-3.5 bg-white rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#111827] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
              Disaster Location Pin
            </span>
            <div className="flex items-center gap-1 bg-[#F3F4F6] p-0.5 rounded-lg border border-[#E5E7EB] text-[11px]">
              <button
                type="button"
                onClick={() => setLocationMode('gps')}
                className={`px-2.5 py-0.5 rounded-md font-medium transition ${
                  locationMode === 'gps' ? 'bg-[#0F766E] text-white shadow-xs' : 'text-[#64748B] hover:text-[#111827]'
                }`}
              >
                Auto GPS
              </button>
              <button
                type="button"
                onClick={() => setLocationMode('map')}
                className={`px-2.5 py-0.5 rounded-md font-medium transition ${
                  locationMode === 'map' ? 'bg-[#0F766E] text-white shadow-xs' : 'text-[#64748B] hover:text-[#111827]'
                }`}
              >
                Map Pin
              </button>
            </div>
          </div>

          {locationMode === 'gps' ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={isLocating}
                onClick={handleGetDeviceGPS}
                className="w-full py-2 bg-[#F9FAFB] hover:bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] rounded-lg text-xs font-semibold text-[#111827] flex items-center justify-center gap-1.5 transition"
              >
                <Radio className={`w-3.5 h-3.5 text-[#0F766E] ${isLocating ? 'animate-pulse' : ''}`} />
                {isLocating ? 'Detecting high-precision GPS...' : coords ? 'GPS Captured ✓ (Click to refresh)' : 'Use My Current Phone Location'}
              </button>
              {coords && (
                <span className="text-[11px] text-[#047857] font-semibold text-center">
                  📍 Coordinates: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} (GPS verified)
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-[#64748B]">
                Tap anywhere on the map or drag the pin to set incident coordinates:
              </span>
              <div className="w-full h-48 rounded-lg overflow-hidden border border-[#E5E7EB]">
                <LeafletMap
                  isPickerMode={true}
                  pickerLocation={coords}
                  onPickerLocationChange={(lat, lng) => {
                    setCoords({ lat, lng });
                    setIsGps(false);
                  }}
                />
              </div>
              {coords && (
                <span className="text-[11px] text-[#64748B] font-mono text-center">
                  Selected: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Reporting for someone else toggle */}
        <div className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-[#E5E7EB]">
          <input
            type="checkbox"
            id="forOther"
            checked={isForOther}
            onChange={(e) => setIsForOther(e.target.checked)}
            className="w-4 h-4 rounded text-[#0F766E] border-[#D1D5DB] focus:ring-[#0F766E]"
          />
          <label htmlFor="forOther" className="text-xs font-medium text-[#111827] cursor-pointer">
            I am reporting on behalf of someone else (relatives, neighbors, stranded victims)
          </label>
        </div>

        {isForOther && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#64748B]">
              Victim / Contact Details (Optional):
            </label>
            <input
              type="text"
              value={reporterContact}
              onChange={(e) => setReporterContact(e.target.value)}
              placeholder="E.g., Neighbor Mr. Sharma, House #42, Phone 9876543210"
              className="text-xs border border-[#E5E7EB] rounded-lg p-2 bg-white text-[#111827] focus:ring-1 focus:ring-[#0F766E] focus:outline-none"
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-[#0F766E] hover:bg-[#0d655e] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
        >
          <Send className="w-3.5 h-3.5" />
          {isSubmitting ? 'Transmitting Disaster Dispatch...' : 'Submit Emergency Report'}
        </button>

        <p className="text-[10px] text-[#64748B] text-center">
          Incomplete or text-only reports are never discarded. They enter the triage queue immediately as needs_information.
        </p>
      </form>

      {/* Floating Sticky Mobile SOS Button */}
      <button
        type="button"
        onClick={() => setIsSosOpen(true)}
        className="fixed bottom-5 right-5 z-40 bg-[#DC2626] hover:bg-[#b91c1c] text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-lg border border-white flex items-center gap-2 transition active:scale-95"
        title="Open Emergency SOS SMS Dispatch"
      >
        <AlertOctagon className="w-4 h-4 text-white" />
        <span>SOS EMERGENCY SMS</span>
      </button>

      {/* Emergency SOS Modal Panel */}
      <EmergencySosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        initialCoords={coords}
      />
    </div>
  );
};
