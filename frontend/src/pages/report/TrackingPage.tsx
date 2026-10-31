import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReportTracking, submitFollowUp } from '../../lib/api';
import { LeafletMap } from '../../components/LeafletMap';
import { AlertCircle, CheckCircle, Clock, MapPin, Camera, ArrowLeft, Send } from 'lucide-react';

interface TrackingPageProps {
  token: string;
  onBackToReport: () => void;
}

export const TrackingPage: React.FC<TrackingPageProps> = ({ token, onBackToReport }) => {
  const queryClient = useQueryClient();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [followUpSuccess, setFollowUpSuccess] = useState(false);

  // Poll report tracking status every 4 seconds
  const { data: tracking, isLoading, error } = useQuery({
    queryKey: ['tracking', token],
    queryFn: () => getReportTracking(token),
    refetchInterval: 4000,
  });

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile && !coords) return;
    setIsSubmitting(true);
    const formData = new FormData();
    if (photoFile) formData.append('photo', photoFile);
    if (coords) {
      formData.append('latitude', coords.lat.toString());
      formData.append('longitude', coords.lng.toString());
    }

    try {
      await submitFollowUp(token, formData);
      setFollowUpSuccess(true);
      setPhotoFile(null);
      setPhotoPreview(null);
      setCoords(null);
      queryClient.invalidateQueries({ queryKey: ['tracking', token] });
    } catch (err) {
      console.error('Follow-up submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto p-8 text-center text-[#64748B]">
        <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0F766E]" />
        <p className="text-sm font-semibold text-[#111827]">Retrieving Emergency Dispatch Status...</p>
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-xs border border-[#E5E7EB] mt-8 text-center">
        <AlertCircle className="w-10 h-10 text-[#DC2626] mx-auto mb-2" />
        <h2 className="text-base font-bold text-[#111827]">Tracking Token Not Found</h2>
        <p className="text-xs text-[#64748B] mt-1 mb-4">
          Token: <code className="font-mono bg-[#F3F4F6] px-1 py-0.5 rounded text-[#111827]">{token}</code>
        </p>
        <button
          onClick={onBackToReport}
          className="text-xs bg-[#0F766E] hover:bg-[#0d655e] text-white font-semibold px-4 py-2 rounded-lg shadow-xs transition"
        >
          Return to Citizen Portal
        </button>
      </div>
    );
  }

  const isNeedsInfo = tracking.status === 'needs_information' || tracking.is_unverified;

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 pb-20">
      <button
        onClick={onBackToReport}
        className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#111827] mb-4 transition font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Citizen Portal
      </button>

      <div className="bg-white rounded-xl shadow-xs border border-[#E5E7EB] overflow-hidden">
        {/* Header Status Bar */}
        <div className={`p-4 border-b border-[#E5E7EB] ${
          isNeedsInfo ? 'bg-[#D97706] text-white' : 'bg-[#0F766E] text-white'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">
              Emergency Dispatch Tracker
            </span>
            <span className="text-xs font-mono font-bold">
              Token: {tracking.tracking_token.substring(0, 8)}...
            </span>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div>
              <h2 className="text-lg font-bold uppercase tracking-tight">
                Status: {tracking.status.replace('_', ' ')}
              </h2>
              <p className="text-xs opacity-90">{tracking.message}</p>
            </div>

            {tracking.priority_level && (
              <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">
                {tracking.priority_level}
              </span>
            )}
          </div>
        </div>

        {/* Explainable Reasoning */}
        <div className="p-4 border-b border-[#E5E7EB] flex flex-col gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B]">
            Triage Assessment
          </span>
          <p className="text-xs text-[#111827] bg-[#F9FAFB] p-3 rounded-lg border border-[#E5E7EB]">
            {tracking.why_this_rank || 'Processing AI priority and confidence scores...'}
          </p>
        </div>

        {/* Follow-up Section if missing photo or location */}
        {isNeedsInfo && (
          <div className="p-4 bg-[#FFFBEB] border-b border-[#FDE68A] flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-[#92400E]">
                  Follow-Up Information Requested
                </h3>
                <p className="text-[11px] text-[#B45309] mt-0.5">
                  Your report has been safely ranked, but response units require verification.
                  Please provide the missing details below:
                </p>
              </div>
            </div>

            {followUpSuccess && (
              <div className="p-2.5 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs font-medium">
                ✓ Follow-up details submitted! AI re-evaluating verification score.
              </div>
            )}

            <form onSubmit={handleFollowUpSubmit} className="flex flex-col gap-3 mt-1">
              {/* If photo missing */}
              {tracking.follow_up_needed.includes('photo') && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#111827]">Attach Verifying Photo:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPhotoFile(e.target.files[0]);
                        setPhotoPreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                    className="text-xs text-[#64748B] file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#0F766E] file:text-white hover:file:bg-[#0d655e]"
                  />
                  {photoPreview && (
                    <img src={photoPreview} alt="Preview" className="w-24 h-24 object-cover rounded mt-1 border border-[#E5E7EB]" />
                  )}
                </div>
              )}

              {/* If location missing */}
              {tracking.follow_up_needed.includes('location') && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#111827]">Drop Map Pin for Location:</label>
                  <div className="w-full h-40 rounded-lg overflow-hidden border border-[#E5E7EB]">
                    <LeafletMap
                      isPickerMode={true}
                      pickerLocation={coords}
                      onPickerLocationChange={(lat, lng) => setCoords({ lat, lng })}
                    />
                  </div>
                  {coords && (
                    <span className="text-[10px] text-[#64748B] font-mono">
                      Selected: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || (!photoFile && !coords)}
                className="py-2.5 bg-[#0F766E] hover:bg-[#0d655e] text-white font-bold text-xs rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? 'Submitting Follow-up...' : 'Submit Verifying Details'}
              </button>
            </form>
          </div>
        )}

        <div className="p-3.5 bg-[#F9FAFB] text-[11px] text-[#64748B] flex items-center justify-between">
          <span>Submitted: {new Date(tracking.created_at).toLocaleString()}</span>
          <span className="text-[#047857] font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#047857] animate-ping" />
            Live Queue Polling Active
          </span>
        </div>
      </div>
    </div>
  );
};
