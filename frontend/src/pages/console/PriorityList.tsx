import React from 'react';
import { Incident } from '../../types';
import {
  AlertTriangle,
  Users,
  ShieldAlert,
  ChevronRight,
  Layers,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Search,
  Flame,
  Waves,
  Wind,
  Mountain,
  Activity,
  HeartHandshake,
  FileText,
  Radio,
  ShieldCheck
} from 'lucide-react';

interface PriorityListProps {
  incidents: Incident[];
  onSelectIncident: (inc: Incident) => void;
  selectedIncident: Incident | null;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  disasterFilter: string;
  onDisasterFilterChange: (type: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export const PriorityList: React.FC<PriorityListProps> = ({
  incidents,
  onSelectIncident,
  selectedIncident,
  statusFilter,
  onStatusFilterChange,
  disasterFilter,
  onDisasterFilterChange,
  searchQuery,
  onSearchQueryChange,
}) => {
  // Filter incidents by search query, status, and disaster category
  const filtered = incidents.filter((inc) => {
    if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
    if (disasterFilter !== 'all' && inc.disaster_type !== disasterFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${inc.disaster_type} ${inc.address_summary || ''} ${inc.why_this_rank} ${(inc.visible_hazards || []).join(' ')}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  // Always sorted by Priority Score descending (highest urgency first)
  const sorted = [...filtered].sort((a, b) => b.priority_score - a.priority_score);

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

  const criticalCount = incidents.filter((i) => i.priority_level === 'CRITICAL').length;
  const highCount = incidents.filter((i) => i.priority_level === 'HIGH').length;
  const needsInfoCount = incidents.filter((i) => i.status === 'needs_information').length;

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB] overflow-hidden">
      {/* Top Summary Metrics */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Total Incidents</span>
            <p className="text-lg font-black text-[#111827]">{incidents.length}</p>
          </div>
          <span className="text-xs font-bold text-[#94A3B8]">All Sectors</span>
        </div>

        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#DC2626] uppercase">Critical Urgency</span>
            <p className="text-lg font-black text-[#DC2626]">{criticalCount}</p>
          </div>
          <span className="text-xs font-bold text-[#DC2626]">Tier 1</span>
        </div>

        <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#EA580C] uppercase">High Priority</span>
            <p className="text-lg font-black text-[#EA580C]">{highCount}</p>
          </div>
          <span className="text-xs font-bold text-[#EA580C]">Tier 2</span>
        </div>

        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#D97706] uppercase">Unverified / Needs Info</span>
            <p className="text-lg font-black text-[#D97706]">{needsInfoCount}</p>
          </div>
          <span className="text-xs font-bold text-[#D97706]">Pending</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by locality, hazard, address, or keyword..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-[#E5E7EB] rounded-lg bg-white text-[#111827] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Disaster Type Filter */}
          <select
            value={disasterFilter}
            onChange={(e) => onDisasterFilterChange(e.target.value)}
            className="border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 bg-white text-[#111827] font-medium focus:outline-none focus:border-[#0F766E]"
          >
            <option value="all">All Incident Categories</option>
            <option value="flood">Flood</option>
            <option value="fire">Fire</option>
            <option value="earthquake">Earthquake</option>
            <option value="cyclone">Cyclone</option>
            <option value="landslide">Landslide</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 bg-white text-[#111827] font-medium focus:outline-none focus:border-[#0F766E]"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="needs_information">Needs Information</option>
            <option value="verified">Verified</option>
            <option value="assigned">Assigned</option>
            <option value="resolved">Resolved</option>
          </select>

          <div className="flex items-center gap-1 text-[11px] text-[#64748B] font-medium ml-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span>Sorted by Priority Score</span>
          </div>
        </div>
      </div>

      {/* Structured Ranked Priority List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
        {sorted.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-12 text-center text-[#64748B] flex flex-col items-center justify-center">
            <ShieldAlert className="w-10 h-10 opacity-30 text-[#64748B] mb-2" />
            <p className="text-sm font-semibold text-[#111827]">No matching incidents in priority queue</p>
            <p className="text-xs text-[#64748B] mt-1">Try resetting the search query or status filter.</p>
          </div>
        ) : (
          sorted.map((inc, index) => {
            const isSelected = selectedIncident?.id === inc.id;
            const isCritical = inc.priority_level === 'CRITICAL';
            const isHigh = inc.priority_level === 'HIGH';

            // 9. Verification status derived label & badge
            const verificationStatus = inc.verification_status || (
              inc.status === 'verified' || inc.status === 'assigned' || inc.status === 'resolved'
                ? 'Verified'
                : inc.status === 'needs_information'
                ? 'Unverified'
                : 'Under Review'
            );

            // 8. Report source derived label
            const reportSource = inc.report_source || 'Citizen';

            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className={`bg-white border border-[#E5E7EB] rounded-xl p-4 cursor-pointer transition flex flex-col gap-3 shadow-xs hover:shadow-sm ${
                  isSelected
                    ? 'border-[#0F766E] ring-2 ring-[#0F766E]/20 bg-[#F0FDFA]/25'
                    : isCritical
                    ? 'border-l-4 border-l-[#DC2626] hover:border-slate-300'
                    : isHigh
                    ? 'border-l-4 border-l-[#EA580C] hover:border-slate-300'
                    : inc.priority_level === 'MEDIUM'
                    ? 'border-l-4 border-l-[#D97706] hover:border-slate-300'
                    : 'border-l-4 border-l-[#0F766E] hover:border-slate-300'
                }`}
              >
                {/* Top Row: Rank, 4. Severity, 1. Type, 8. Source, 9. Verification, 5. People Affected */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Numerical Rank */}
                    <span className="w-6 h-6 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#64748B]">
                      #{index + 1}
                    </span>

                    {/* 4. Severity Level & Score */}
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                        isCritical
                          ? 'bg-[#DC2626] text-white shadow-xs'
                          : isHigh
                          ? 'bg-[#EA580C] text-white'
                          : inc.priority_level === 'MEDIUM'
                          ? 'bg-[#D97706] text-white'
                          : 'bg-[#0F766E] text-white'
                      }`}
                    >
                      {inc.priority_level} ({inc.priority_score.toFixed(0)}/100)
                    </span>

                    {/* 1. Incident Type */}
                    <span className="flex items-center gap-1 text-xs font-bold bg-[#F3F4F6] text-[#111827] border border-[#E5E7EB] px-2 py-0.5 rounded-md uppercase">
                      {getDisasterIcon(inc.disaster_type)}
                      <span>{inc.disaster_type}</span>
                    </span>

                    {/* 8. Report Source */}
                    <span className="text-[11px] font-semibold bg-[#F3F4F6] text-[#64748B] border border-[#E5E7EB] px-2 py-0.5 rounded-md">
                      Source: {reportSource}
                    </span>

                    {/* 9. Verification Status */}
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                        verificationStatus === 'Verified'
                          ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                          : verificationStatus === 'Under Review'
                          ? 'bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]'
                          : 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                      }`}
                    >
                      {verificationStatus}
                    </span>

                    {/* Corroboration Badge */}
                    {inc.corroboration_count > 1 && (
                      <span className="text-[11px] font-bold bg-[#F3F4F6] text-[#111827] border border-[#E5E7EB] px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Layers className="w-3 h-3 text-[#0F766E]" />
                        <span>{inc.corroboration_count}x Corroborated</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 5. People Affected (only explicitly reported/verified, else 'Unknown') */}
                    {inc.people_at_risk > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-black bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] px-2.5 py-0.5 rounded-full">
                        <Users className="w-3.5 h-3.5 text-[#DC2626]" />
                        <span>{inc.people_at_risk} People Affected</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#64748B] bg-[#F3F4F6] px-2 py-0.5 rounded-full border border-[#E5E7EB]">
                        <Users className="w-3 h-3 text-[#94A3B8]" />
                        <span>People Affected: Unknown</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Row: 2. What Happened, 3. Exact Location, Thumbnail & Priority Assessment */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    {/* 2. What Happened (Concise Factual Description) */}
                    <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-[#0F766E]" />
                          What Happened
                        </span>
                        <span className="text-[9px] font-semibold text-[#94A3B8]">
                          AI-Synthesized Factual Summary
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#111827] leading-snug">
                        {inc.what_happened || inc.why_this_rank}
                      </p>
                    </div>

                    {/* 3. Exact Location */}
                    <div className="flex items-center gap-1.5 text-xs text-[#111827] font-medium">
                      <MapPin className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                      <span className="font-semibold text-[#111827] truncate">
                        Location: {inc.address_summary || 'Coordinates provided'}
                      </span>
                      {inc.latitude && inc.longitude && (
                        <span className="text-[11px] text-[#64748B] font-mono font-normal shrink-0">
                          ({inc.latitude.toFixed(4)}, {inc.longitude.toFixed(4)})
                        </span>
                      )}
                    </div>

                    {/* Priority Rationale Note */}
                    <p className="text-[11px] text-[#64748B] bg-white p-1.5 rounded border border-[#E5E7EB]">
                      <span className="font-bold text-[#111827]">Priority Assessment: </span>
                      {inc.why_this_rank}
                    </p>
                  </div>

                  {/* Curated Visual Evidence Thumbnail */}
                  {inc.primary_image_url ? (
                    <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-[#E5E7EB] bg-slate-900 shadow-xs">
                      <img
                        src={inc.primary_image_url}
                        alt={inc.disaster_type}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const parent = (e.currentTarget as HTMLElement).parentElement;
                          if (parent) parent.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 shrink-0 rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] flex flex-col items-center justify-center p-1 text-center">
                      <AlertTriangle className="w-5 h-5 text-[#D97706] mb-0.5" />
                      <span className="text-[9px] font-bold text-[#64748B] leading-tight">No Photo (Unverified)</span>
                    </div>
                  )}
                </div>

                {/* Bottom Row: 6. Immediate Needs, 7. Hazards & Action Button */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#E5E7EB] text-xs flex-wrap">
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* 6. Immediate Needs */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-[#DC2626] uppercase flex items-center gap-0.5">
                        <HeartHandshake className="w-3 h-3 text-[#DC2626]" />
                        Needs:
                      </span>
                      {inc.urgent_needs && inc.urgent_needs.length > 0 ? (
                        inc.urgent_needs.map((need, i) => (
                          <span key={i} className="text-[10px] font-semibold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] px-1.5 py-0.5 rounded capitalize">
                            {need.replace('_', ' ')}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-[#94A3B8] italic">Not reported</span>
                      )}
                    </div>

                    {/* 7. Hazards */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-[#D97706] uppercase flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3 text-[#D97706]" />
                        Hazards:
                      </span>
                      {inc.visible_hazards && inc.visible_hazards.length > 0 ? (
                        inc.visible_hazards.slice(0, 3).map((h, i) => (
                          <span key={i} className="text-[10px] font-medium bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] px-1.5 py-0.5 rounded capitalize">
                            {h}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-[#94A3B8] italic">None reported</span>
                      )}
                      {(inc.visible_hazards || []).length > 3 && (
                        <span className="text-[10px] text-[#64748B]">
                          +{(inc.visible_hazards || []).length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-[11px] text-[#64748B]">
                      {new Date(inc.created_at).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectIncident(inc);
                      }}
                      className="px-3 py-1.5 bg-[#0F766E] hover:bg-[#0d655e] text-white font-semibold text-xs rounded-lg shadow-xs transition flex items-center gap-1 active:scale-95"
                    >
                      <span>Review Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
