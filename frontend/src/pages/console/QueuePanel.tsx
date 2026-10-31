import React from 'react';
import { Incident, IncidentStatus } from '../../types';
import { AlertCircle, Clock, Users, ShieldAlert, CheckCircle2, ChevronRight, Layers } from 'lucide-react';

interface QueuePanelProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  onSelectIncident: (inc: Incident) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  disasterFilter: string;
  onDisasterFilterChange: (type: string) => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
  statusFilter,
  onStatusFilterChange,
  disasterFilter,
  onDisasterFilterChange,
}) => {
  const filtered = incidents.filter((inc) => {
    if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
    if (disasterFilter !== 'all' && inc.disaster_type !== disasterFilter) return false;
    return true;
  });

  const statuses: { label: string; value: string }[] = [
    { label: 'All', value: 'all' },
    { label: 'New', value: 'new' },
    { label: 'Needs Info', value: 'needs_information' },
    { label: 'Verified', value: 'verified' },
    { label: 'Assigned', value: 'assigned' },
    { label: 'Resolved', value: 'resolved' },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Filters Header */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            Ranked Incident Queue ({filtered.length})
          </span>
          <select
            value={disasterFilter}
            onChange={(e) => onDisasterFilterChange(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 font-medium"
          >
            <option value="all">All Disasters</option>
            <option value="flood">Flood</option>
            <option value="fire">Fire</option>
            <option value="earthquake">Earthquake</option>
            <option value="cyclone">Cyclone</option>
            <option value="landslide">Landslide</option>
            <option value="other">Other / Uncategorized</option>
          </select>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => onStatusFilterChange(s.value)}
              className={`px-2 py-0.5 rounded-full font-medium whitespace-nowrap transition ${
                statusFilter === s.value
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No matching incidents in queue</p>
          </div>
        ) : (
          filtered.map((inc) => {
            const isSelected = selectedIncident?.id === inc.id;
            const isCritical = inc.priority_level === 'CRITICAL';
            const isHigh = inc.priority_level === 'HIGH';

            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className={`p-3 cursor-pointer transition flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-blue-50/70 border-l-4 border-blue-600 shadow-sm'
                    : 'hover:bg-slate-50 border-l-4 border-transparent'
                }`}
              >
                {/* Header line: Badges */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Priority badge */}
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        isCritical
                          ? 'bg-red-600 text-white shadow-sm'
                          : isHigh
                          ? 'bg-orange-600 text-white'
                          : inc.priority_level === 'MEDIUM'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-600 text-white'
                      }`}
                    >
                      {inc.priority_level} ({inc.priority_score.toFixed(0)})
                    </span>

                    {/* Confidence badge */}
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        inc.confidence_level === 'HIGH'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : inc.confidence_level === 'MEDIUM'
                          ? 'bg-sky-100 text-sky-800 border border-sky-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      Conf: {inc.confidence_level}
                    </span>

                    {/* Corroboration badge */}
                    {inc.corroboration_count > 1 && (
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Layers className="w-2.5 h-2.5" />
                        {inc.corroboration_count}x Merged
                      </span>
                    )}

                    {/* Unverified tag for needs_information */}
                    {inc.status === 'needs_information' && (
                      <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1 py-0.5 rounded">
                        UNVERIFIED
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    {inc.disaster_type}
                  </span>
                </div>

                {/* Plain "Why this rank" line */}
                <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                  {inc.why_this_rank}
                </p>

                {/* Location and Metadata footer */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                  <span className="truncate max-w-[180px]">
                    📍 {inc.address_summary || 'Coordinates provided'}
                  </span>
                  <div className="flex items-center gap-2">
                    {inc.people_at_risk > 0 && (
                      <span className="text-red-600 font-bold flex items-center gap-0.5">
                        <Users className="w-3 h-3" />
                        {inc.people_at_risk}
                      </span>
                    )}
                    <span className="capitalize font-medium px-1.5 py-0.2 bg-slate-100 rounded text-slate-600">
                      {inc.status.replace('_', ' ')}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
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
