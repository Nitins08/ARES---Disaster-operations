import React, { useState } from 'react';
import { Incident, UserRole } from '../../types';
import { ImageAnnotator } from '../../components/ImageAnnotator';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Copy,
  Layers,
  Send,
  HelpCircle,
  FileText,
  User,
  History,
  ShieldCheck,
  Edit3,
  X,
  MapPin,
  Users,
  Flame,
  Waves,
  Wind,
  Mountain,
  Activity,
  ClipboardList,
  HeartHandshake,
  CheckCircle2,
  Clock,
  Radio,
  Check
} from 'lucide-react';

interface RescuerReviewPanelProps {
  incident: Incident | null;
  role: UserRole;
  onAction: (
    incidentId: number,
    actionPayload: {
      status?: string;
      corrected_severity?: number;
      corrected_hazard?: string;
      assigned_team?: string;
      coordinator_notes?: string;
    }
  ) => Promise<void>;
  onManualMerge: (targetId: number, sourceId: number, reason: string) => Promise<void>;
  allIncidents: Incident[];
  onClose?: () => void;
}

const getDisasterIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'fire':
      return <Flame className="w-4 h-4 text-red-500" />;
    case 'flood':
      return <Waves className="w-4 h-4 text-blue-500" />;
    case 'cyclone':
      return <Wind className="w-4 h-4 text-purple-500" />;
    case 'landslide':
      return <Mountain className="w-4 h-4 text-amber-700" />;
    case 'earthquake':
      return <Activity className="w-4 h-4 text-orange-500" />;
    default:
      return <AlertTriangle className="w-4 h-4 text-slate-500" />;
  }
};

export const RescuerReviewPanel: React.FC<RescuerReviewPanelProps> = ({
  incident,
  role,
  onAction,
  onManualMerge,
  allIncidents,
  onClose,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<number>(3);
  const [newHazard, setNewHazard] = useState('');
  const [teamName, setTeamName] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState<number | ''>('');
  const [mergeReason, setMergeReason] = useState('');
  const [coordinatorNote, setCoordinatorNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'review' | 'reports' | 'audit'>('review');

  if (!incident) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-[#64748B] bg-[#F9FAFB]">
        <ShieldCheck className="w-12 h-12 mb-2 text-[#0F766E] opacity-40" />
        <p className="text-sm font-medium">Select an incident from the queue to start rescuer review</p>
      </div>
    );
  }

  const handleSeverityChange = async (sev: number) => {
    setIsSubmitting(true);
    try {
      await onAction(incident.id, { corrected_severity: sev });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHazard.trim()) return;
    setIsSubmitting(true);
    try {
      await onAction(incident.id, { corrected_hazard: newHazard.trim() });
      setNewHazard('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setIsSubmitting(true);
    try {
      await onAction(incident.id, { assigned_team: teamName.trim(), status: 'assigned' });
      setTeamName('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeTargetId || !mergeReason.trim()) return;
    setIsSubmitting(true);
    try {
      await onManualMerge(Number(mergeTargetId), incident.id, mergeReason.trim());
      setMergeReason('');
      setMergeTargetId('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header with Title & Tabs */}
      <div className="p-3 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm text-[#111827]">
              Incident #{incident.id}: {incident.disaster_type.toUpperCase()}
            </h2>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                incident.priority_level === 'CRITICAL'
                  ? 'bg-[#DC2626] text-white'
                  : incident.priority_level === 'HIGH'
                  ? 'bg-[#EA580C] text-white'
                  : incident.priority_level === 'MEDIUM'
                  ? 'bg-[#D97706] text-white'
                  : 'bg-[#0F766E] text-white'
              }`}
            >
              Priority: {incident.priority_level} ({incident.priority_score.toFixed(0)})
            </span>
            <span className="text-[10px] font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] px-1.5 py-0.5 rounded">
              Conf: {incident.confidence_level} ({incident.confidence_score.toFixed(2)})
            </span>
          </div>
          <p className="text-xs text-[#64748B] truncate max-w-md mt-0.5">
            📍 {incident.address_summary || 'Coordinates provided'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex items-center bg-[#F3F4F6] p-0.5 rounded-lg border border-[#E5E7EB] text-xs font-semibold">
            <button
              onClick={() => setActiveTab('review')}
              className={`px-2.5 py-1 rounded-md transition ${
                activeTab === 'review' ? 'bg-[#0F766E] text-white shadow-xs' : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              Review & Actions
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-2.5 py-1 rounded-md transition ${
                activeTab === 'reports' ? 'bg-[#0F766E] text-white shadow-xs' : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              Reports ({incident.reports?.length || 1})
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              title="Close details"
              className="p-1 rounded-lg hover:bg-[#F3F4F6] text-[#64748B] hover:text-[#111827] transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Review Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {activeTab === 'review' && (
          <>
            {/* STRUCTURED OPERATIONAL INCIDENT BRIEFING (9 CRITICAL POINTS) */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#0F766E]" />
                  <span className="font-bold text-xs uppercase tracking-wider text-[#111827]">
                    Operational Incident Briefing
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="bg-[#F9FAFB] text-[#64748B] px-2 py-0.5 rounded font-semibold border border-[#E5E7EB]">
                    Source: {incident.report_source || (incident.reports?.[0]?.is_reporting_for_other ? 'Citizen (Proxy)' : 'Citizen')}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold border ${
                      (incident.verification_status || (incident.status === 'needs_information' ? 'Unverified' : incident.status === 'new' ? 'Under Review' : 'Verified')) === 'Verified'
                        ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                        : (incident.verification_status || (incident.status === 'needs_information' ? 'Unverified' : incident.status === 'new' ? 'Under Review' : 'Verified')) === 'Under Review'
                        ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
                        : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                    }`}
                  >
                    {incident.verification_status || (incident.status === 'needs_information' ? 'Unverified' : incident.status === 'new' ? 'Under Review' : 'Verified')}
                  </span>
                </div>
              </div>

              {/* 2. What Happened (Concise Factual Description) */}
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-[#0F766E]" />
                    2. What Happened (Concise Synopsis)
                  </span>
                  <span className="text-[9px] font-semibold text-[#64748B] bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB]">
                    AI-Synthesized Factual Summary
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#111827] leading-relaxed">
                  {incident.what_happened || 
                    incident.reports?.[0]?.english_translation || 
                    incident.reports?.[0]?.raw_description || 
                    `Emergency incident reported. Visual analysis identified ${incident.disaster_type} hazards.`}
                </p>
              </div>

              {/* 2-Column Grid for Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* 1. Incident Type */}
                <div className="p-2.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase">1. Incident Type</span>
                  <div className="flex items-center gap-1.5 mt-1 font-bold text-[#111827] capitalize text-xs">
                    {getDisasterIcon(incident.disaster_type)}
                    <span>{incident.disaster_type}</span>
                  </div>
                </div>

                {/* 4. Severity */}
                <div className="p-2.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase">4. Severity Level</span>
                  <div className="mt-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        incident.priority_level === 'CRITICAL'
                          ? 'bg-[#DC2626] text-white'
                          : incident.priority_level === 'HIGH'
                          ? 'bg-[#EA580C] text-white'
                          : incident.priority_level === 'MEDIUM'
                          ? 'bg-[#D97706] text-white'
                          : 'bg-[#0F766E] text-white'
                      }`}
                    >
                      {incident.priority_level} ({incident.priority_score.toFixed(0)}/100)
                    </span>
                  </div>
                </div>

                {/* 3. Exact Location */}
                <div className="col-span-2 p-2.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#0F766E]" />
                      3. Exact Location
                    </span>
                    <span className="text-[10px] font-semibold text-[#047857]">
                      {incident.reports?.[0]?.is_gps ? '✓ Device GPS Verified' : 'Approximate Pin / Reported'}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-[#111827] text-xs">
                    {incident.address_summary || 'Coordinates provided'}
                  </p>
                  {incident.latitude && incident.longitude && (
                    <span className="text-[10px] text-[#64748B] font-mono mt-0.5">
                      GPS: {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
                    </span>
                  )}
                </div>

                {/* 5. People Affected */}
                <div className="p-2.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase flex items-center gap-1">
                    <Users className="w-3 h-3 text-[#0F766E]" />
                    5. People Affected
                  </span>
                  <p className="mt-1 font-bold text-[#111827] text-xs">
                    {incident.people_at_risk > 0 
                      ? `${incident.people_at_risk} people affected`
                      : 'Unknown'}
                  </p>
                  <span className="text-[9px] text-[#64748B] mt-0.5">
                    {incident.people_at_risk > 0 ? 'Verified count' : 'Not reported in dispatch'}
                  </span>
                </div>

                {/* 8. Source & 9. Status */}
                <div className="p-2.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase">8. Source & 9. Status</span>
                  <div className="mt-1 flex items-center gap-1 font-bold text-xs text-[#111827]">
                    <span>{incident.report_source || 'Citizen'}</span>
                    <span className="text-[#D1D5DB]">•</span>
                    <span className="text-[#0F766E]">
                      {incident.verification_status || (incident.status === 'needs_information' ? 'Unverified' : incident.status === 'new' ? 'Under Review' : 'Verified')}
                    </span>
                  </div>
                  <span className="text-[9px] text-[#64748B] mt-0.5">
                    {incident.corroboration_count > 1 ? `${incident.corroboration_count} corroborating reports` : 'Single source report'}
                  </span>
                </div>

                {/* 6. Immediate Needs */}
                <div className="col-span-2 p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex flex-col">
                  <span className="text-[10px] font-bold text-[#DC2626] uppercase flex items-center gap-1">
                    <HeartHandshake className="w-3.5 h-3.5 text-[#DC2626]" />
                    6. Immediate Needs
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {incident.urgent_needs && incident.urgent_needs.length > 0 ? (
                      incident.urgent_needs.map((need, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-bold bg-white text-[#DC2626] border border-[#FECACA] px-2 py-0.5 rounded shadow-2xs capitalize"
                        >
                          {need.replace('_', ' ')}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#64748B] text-xs italic">Not reported</span>
                    )}
                  </div>
                </div>

                {/* 7. Hazards */}
                <div className="col-span-2 p-2.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex flex-col">
                  <span className="text-[10px] font-bold text-[#D97706] uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
                    7. Hazards Present
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {incident.visible_hazards && incident.visible_hazards.length > 0 ? (
                      incident.visible_hazards.map((h, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-semibold bg-white text-[#B45309] border border-[#FDE68A] px-2 py-0.5 rounded shadow-2xs capitalize"
                        >
                          {h}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#64748B] text-xs italic">Unknown / None reported</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Direct User-Submitted Report Distinction */}
              <div className="mt-1 p-2.5 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                    Original Citizen Description (Unmodified Raw Text)
                  </span>
                  <span className="text-[9px] font-semibold text-[#64748B] bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB]">
                    User Input
                  </span>
                </div>
                <p className="text-xs text-[#111827] italic bg-white p-2.5 rounded border border-[#E5E7EB]">
                  "{incident.reports?.[0]?.raw_description || 'No written description submitted by reporter.'}"
                </p>
                {incident.reports?.[0] && incident.reports[0].detected_language !== 'en' && incident.reports[0].english_translation && (
                  <p className="text-[11px] text-[#111827] bg-[#F0FDFA] p-2 rounded border border-[#CCFBF1] mt-1">
                    <span className="font-bold text-[#0F766E]">Faithful English Translation: </span>
                    "{incident.reports[0].english_translation}"
                  </p>
                )}
              </div>
            </div>

            {/* Explainable "Why this rank" Card */}
            <div className="bg-white text-[#111827] p-3.5 rounded-xl border-l-4 border-l-[#0F766E] border border-[#E5E7EB] shadow-xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#0F766E] block mb-1">
                Explainable Prioritization AI Reason
              </span>
              <p className="text-xs font-medium leading-relaxed text-[#111827]">
                {incident.why_this_rank}
              </p>
              {incident.merge_reasons && incident.merge_reasons.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#E5E7EB] text-[11px] text-[#047857]">
                  <span className="font-bold">Corroboration: </span>
                  {incident.merge_reasons.join('; ')}
                </div>
              )}
            </div>

            {/* Visual Evidence with AI Bounding Boxes */}
            <ImageAnnotator
              imageUrl={incident.primary_image_url}
              boxes={incident.evidence_boxes}
              hazards={incident.visible_hazards}
              dangerPhrases={incident.danger_phrases}
            />

            {/* Rescuer Action Bar */}
            <div className="border border-[#E5E7EB] rounded-xl p-3.5 bg-white shadow-xs flex flex-col gap-3">
              <span className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-[#0F766E]" />
                Incident Triage & Verification Actions
              </span>

              {/* Status Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  disabled={isSubmitting}
                  onClick={() => onAction(incident.id, { status: 'verified' })}
                  className="flex items-center justify-center gap-1 text-xs font-semibold bg-[#047857] hover:bg-[#065f46] text-white py-2 px-2 rounded-lg shadow-xs transition disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Confirm / Verify
                </button>

                <button
                  disabled={isSubmitting}
                  onClick={() => onAction(incident.id, { status: 'needs_information' })}
                  className="flex items-center justify-center gap-1 text-xs font-semibold bg-[#D97706] hover:bg-[#b45309] text-white py-2 px-2 rounded-lg shadow-xs transition disabled:opacity-50"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Request Info
                </button>

                <button
                  disabled={isSubmitting}
                  onClick={() => onAction(incident.id, { status: 'false_report' })}
                  className="flex items-center justify-center gap-1 text-xs font-semibold bg-[#64748B] hover:bg-[#475569] text-white py-2 px-2 rounded-lg shadow-xs transition disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Mark False
                </button>

                <button
                  disabled={isSubmitting}
                  onClick={() => onAction(incident.id, { status: 'resolved' })}
                  className="flex items-center justify-center gap-1 text-xs font-semibold bg-[#0F766E] hover:bg-[#0d655e] text-white py-2 px-2 rounded-lg shadow-xs transition disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Mark Resolved
                </button>
              </div>

              {/* Correct Severity (1-5) */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-[#E5E7EB]">
                <span className="text-xs font-semibold text-[#111827]">
                  Override AI Severity (1 = Minor, 5 = Catastrophic):
                </span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((sev) => (
                    <button
                      key={sev}
                      disabled={isSubmitting}
                      onClick={() => handleSeverityChange(sev)}
                      className={`flex-1 py-1 text-xs font-bold rounded-lg border transition ${
                        sev >= 4
                          ? 'border-[#FECACA] hover:bg-[#FEF2F2] text-[#DC2626]'
                          : 'border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#111827]'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add / Correct Hazard */}
              <form onSubmit={handleAddHazard} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add verified physical hazard (e.g. gas leak, live wire)"
                  value={newHazard}
                  onChange={(e) => setNewHazard(e.target.value)}
                  className="flex-1 text-xs border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 bg-white text-[#111827] focus:border-[#0F766E] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newHazard.trim()}
                  className="text-xs font-semibold bg-[#0F766E] hover:bg-[#0d655e] text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  Add Hazard
                </button>
              </form>

              {/* Dispatch / Assign Team */}
              <form onSubmit={handleAssignTeam} className="flex gap-2 pt-2 border-t border-[#E5E7EB]">
                <input
                  type="text"
                  placeholder="Dispatch response team (e.g. Fire Station 4, Boat Team Bravo)"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="flex-1 text-xs border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 bg-white text-[#111827] focus:border-[#0F766E] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !teamName.trim()}
                  className="text-xs font-semibold bg-[#0F766E] hover:bg-[#0d655e] text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  Assign Team
                </button>
              </form>
            </div>

            {/* Incident Deduplication & Manual Merge */}
            <div className="border border-[#E5E7EB] bg-[#F9FAFB] rounded-xl p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#0F766E]" />
                  Incident Deduplication: Manual Merge
                </span>
              </div>

              <form onSubmit={handleMergeSubmit} className="flex flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={mergeTargetId}
                    onChange={(e) => setMergeTargetId(e.target.value ? Number(e.target.value) : '')}
                    className="text-xs border border-[#E5E7EB] rounded-lg p-2 bg-white text-[#111827] font-medium focus:border-[#0F766E] focus:outline-none"
                  >
                    <option value="">Select Target Incident to Merge into...</option>
                    {allIncidents
                      .filter((inc) => inc.id !== incident.id)
                      .map((inc) => (
                        <option key={inc.id} value={inc.id}>
                          #{inc.id} {inc.disaster_type} - {inc.address_summary || 'No address'} ({inc.priority_level})
                        </option>
                      ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Reason (e.g. Same warehouse fire, caller confirmed)"
                    value={mergeReason}
                    onChange={(e) => setMergeReason(e.target.value)}
                    className="text-xs border border-[#E5E7EB] rounded-lg p-2 bg-white text-[#111827] focus:border-[#0F766E] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !mergeTargetId || !mergeReason.trim()}
                  className="self-end text-xs font-bold bg-[#0F766E] hover:bg-[#0d655e] text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  Execute Manual Merge
                </button>
              </form>
            </div>
          </>
        )}

        {/* Reports Tab: View original citizen reports & translations */}
        {activeTab === 'reports' && (
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#111827]">
              Corroborating Citizen Reports ({incident.reports?.length || 0})
            </span>

            {incident.reports?.map((rep, idx) => (
              <div key={rep.id} className="border border-[#E5E7EB] rounded-xl p-3.5 bg-white flex flex-col gap-2 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#111827]">
                    Report #{rep.id} {idx === 0 ? '(Primary Anchor)' : `(Corroboration #${idx})`}
                  </span>
                  <span className="text-[10px] text-[#0F766E] font-mono font-bold">
                    Token: /r/{rep.tracking_token}
                  </span>
                </div>

                {/* Multilingual original & English translation */}
                <div className="text-xs bg-[#F9FAFB] p-3 rounded-lg border border-[#E5E7EB] flex flex-col gap-1.5">
                  <div>
                    <span className="text-[10px] font-bold text-[#64748B] uppercase">
                      Original Citizen Text ({rep.detected_language.toUpperCase()}):
                    </span>
                    <p className="text-[#111827] italic mt-0.5">
                      "{rep.raw_description || 'No textual description provided.'}"
                    </p>
                  </div>

                  {rep.detected_language !== 'en' && rep.english_translation && (
                    <div className="pt-1.5 border-t border-[#E5E7EB]">
                      <span className="text-[10px] font-bold text-[#0F766E] uppercase">
                        AI English Translation:
                      </span>
                      <p className="text-[#111827] font-medium mt-0.5">
                        "{rep.english_translation}"
                      </p>
                    </div>
                  )}

                  {rep.consistency_note && (
                    <div className="pt-1.5 border-t border-[#E5E7EB] text-[11px] text-[#047857] font-medium">
                      ✓ {rep.consistency_note}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                  <span>GPS: {rep.is_gps ? 'Device EXIF GPS' : 'Manual Map Pin'}</span>
                  <span>{new Date(rep.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
