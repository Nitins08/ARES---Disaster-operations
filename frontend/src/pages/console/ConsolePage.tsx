import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIncidents, updateIncident, mergeIncidents } from '../../lib/api';
import { Incident, UserRole } from '../../types';
import { LeafletMap } from '../../components/LeafletMap';
import { PriorityList } from './PriorityList';
import { RescuerReviewPanel } from './RescuerReviewPanel';
import { Map, ListFilter, Search, AlertCircle } from 'lucide-react';

interface ConsolePageProps {
  role: UserRole;
}

export const ConsolePage: React.FC<ConsolePageProps> = ({ role }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [disasterFilter, setDisasterFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Poll incidents every 3.5 seconds (Both tabs share this single underlying dataset)
  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents', statusFilter, disasterFilter],
    queryFn: () => getIncidents({ status: statusFilter, disaster_type: disasterFilter }),
    refetchInterval: 3500,
  });

  // Keep selected incident synchronized with fresh polled data
  React.useEffect(() => {
    if (selectedIncident && incidents.length > 0) {
      const updated = incidents.find((inc) => inc.id === selectedIncident.id);
      if (updated) setSelectedIncident(updated);
    }
  }, [incidents]);

  // Filter incidents for map view if search query is active
  const filteredIncidents = incidents.filter((inc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchText = `${inc.disaster_type} ${inc.address_summary || ''} ${inc.why_this_rank} ${(inc.visible_hazards || []).join(' ')}`.toLowerCase();
    return matchText.includes(q);
  });

  // Mutation for incident review and updates
  const actionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      updateIncident(id, { ...payload, actor_role: role, actor_id: `${role}_operator` }),
    onSuccess: (updated) => {
      setSelectedIncident(updated);
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });

  // Mutation for manual deduplication merge
  const mergeMutation = useMutation({
    mutationFn: ({ targetId, sourceId, reason }: { targetId: number; sourceId: number; reason: string }) =>
      mergeIncidents({
        target_incident_id: targetId,
        source_incident_id: sourceId,
        reason,
        actor_role: role,
        actor_id: `${role}_lead`,
      }),
    onSuccess: (target) => {
      setSelectedIncident(target);
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-[#F9FAFB]">
      {/* Top Operations Sub-header & Navigation Tabs */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Navigation Tabs: Map View vs Priority List */}
        <div className="flex items-center gap-1 bg-[#F3F4F6] p-1 rounded-xl border border-[#E5E7EB]">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'map'
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#111827]'
            }`}
          >
            <Map className="w-4 h-4 text-white" />
            <span>Map View</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'map' ? 'bg-[#047857] text-white' : 'bg-[#E5E7EB] text-[#111827]'
            }`}>
              {filteredIncidents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'list'
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#111827]'
            }`}
          >
            <ListFilter className="w-4 h-4 text-white" />
            <span>Priority List</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'list' ? 'bg-[#047857] text-white' : 'bg-[#E5E7EB] text-[#111827]'
            }`}>
              {incidents.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
        {/* TAB 1: MAP VIEW */}
        {activeTab === 'map' && (
          <div className="flex-1 min-h-0 w-full flex flex-col relative">
            {/* Map Filter Bar */}
            <div className="bg-white border-b border-[#E5E7EB] px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 z-10 shrink-0">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter map by locality or hazard..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 border border-[#E5E7EB] rounded-lg bg-white text-[#111827] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <select
                  value={disasterFilter}
                  onChange={(e) => setDisasterFilter(e.target.value)}
                  className="border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 bg-white text-[#111827] font-medium focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="all">All Incident Categories</option>
                  <option value="flood">Flood</option>
                  <option value="fire">Fire</option>
                  <option value="earthquake">Earthquake</option>
                  <option value="cyclone">Cyclone</option>
                  <option value="landslide">Landslide</option>
                  <option value="other">Other / Uncategorized</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 bg-white text-[#111827] font-medium focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="all">All Statuses</option>
                  <option value="new">New</option>
                  <option value="needs_information">Needs Info</option>
                  <option value="verified">Verified</option>
                  <option value="assigned">Assigned</option>
                  <option value="resolved">Resolved</option>
                </select>

                {/* Severity Legend */}
                <div className="hidden lg:flex items-center gap-2 text-[11px] font-semibold text-[#64748B] bg-[#F9FAFB] border border-[#E5E7EB] px-2.5 py-1 rounded-lg">
                  <span className="flex items-center gap-1 text-[#111827]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                    Critical
                  </span>
                  <span className="flex items-center gap-1 text-[#111827]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
                    High
                  </span>
                  <span className="flex items-center gap-1 text-[#111827]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                    Medium
                  </span>
                  <span className="flex items-center gap-1 text-[#111827]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
                    Low
                  </span>
                </div>
              </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 min-h-0 w-full relative">
              <div className="absolute inset-0">
                <LeafletMap
                  incidents={filteredIncidents}
                  selectedIncident={selectedIncident}
                  onSelectIncident={(inc) => setSelectedIncident(inc)}
                />
              </div>

              {/* Side Inspection Panel when an incident is selected in Map View */}
              {selectedIncident && (
                <div className="absolute top-2 right-2 bottom-2 w-full max-w-lg z-[1000] shadow-xl rounded-xl overflow-hidden border border-[#E5E7EB] animate-in slide-in-from-right duration-200">
                  <RescuerReviewPanel
                    incident={selectedIncident}
                    role={role}
                    onAction={async (id, payload) => {
                      await actionMutation.mutateAsync({ id, payload });
                    }}
                    onManualMerge={async (targetId, sourceId, reason) => {
                      await mergeMutation.mutateAsync({ targetId, sourceId, reason });
                    }}
                    allIncidents={incidents}
                    onClose={() => setSelectedIncident(null)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PRIORITY LIST */}
        {activeTab === 'list' && (
          <div className="w-full h-full flex flex-col relative overflow-hidden">
            <PriorityList
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              disasterFilter={disasterFilter}
              onDisasterFilterChange={setDisasterFilter}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
            />

            {/* Slide-over Detailed Report Panel when an incident is opened from the Priority List */}
            {selectedIncident && (
              <div className="absolute top-0 right-0 bottom-0 w-full max-w-xl z-30 shadow-xl bg-white border-l border-[#E5E7EB] animate-in slide-in-from-right duration-200">
                <RescuerReviewPanel
                  incident={selectedIncident}
                  role={role}
                  onAction={async (id, payload) => {
                    await actionMutation.mutateAsync({ id, payload });
                  }}
                  onManualMerge={async (targetId, sourceId, reason) => {
                    await mergeMutation.mutateAsync({ targetId, sourceId, reason });
                  }}
                  allIncidents={incidents}
                  onClose={() => setSelectedIncident(null)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
