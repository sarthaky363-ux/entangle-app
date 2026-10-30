/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Incident & Citizen Report Feed
 * Displays triaged active incidents with deterministic priority formulas and credibility indices.
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Droplet,
  ExternalLink,
  Flame,
  HelpCircle,
  Radio,
  Search,
  Shield,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { MUMBAI_WARDS } from '../data/mumbaiZones.ts';
import { useWorldStore } from '../state/store.ts';
import { Incident, SeverityLevel } from '../state/types.ts';
import { SeverityBadge } from './SeverityBadge.tsx';

interface IncidentFeedProps {
  selectedIncidentId?: string;
  onSelectIncident?: (incidentId: string) => void;
}

export const IncidentFeed: React.FC<IncidentFeedProps> = ({
  selectedIncidentId,
  onSelectIncident,
}) => {
  const { incidents, reports } = useWorldStore();
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'incidents' | 'reports'>('incidents');
  const [inspectedPriorityId, setInspectedPriorityId] = useState<string | null>(null);

  const incidentList = Object.values(incidents).sort((a, b) => (b.priority || b.priorityScore || 0) - (a.priority || a.priorityScore || 0));
  const reportList = Object.values(reports).sort((a, b) => (b.ts || b.timestamp || 0) - (a.ts || a.timestamp || 0));

  const filteredIncidents = incidentList.filter(inc => {
    if (filterSeverity !== 'all' && inc.severity !== filterSeverity) return false;
    if (filterType !== 'all' && inc.type !== filterType && !inc.needs?.includes(filterType)) return false;
    return true;
  });

  return (
    <div className="bg-[#FFFDF8] rounded-[20px] border border-[#E4D9C5] p-5 shadow-xs flex flex-col h-full">
      {/* Feed Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5 pb-3 border-b border-[#E4D9C5]">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-[#B0623A]" />
          <div>
            <h2 className="text-base font-bold font-heading text-[#3A2E26]">
              Triage &amp; Intake Stream
            </h2>
            <p className="text-[11px] text-[#7A6A5A]">
              Deterministic priority scoring &amp; telemetry corroboration
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-[#FAF6EE] border border-[#E4D9C5] text-xs">
          <button
            onClick={() => setActiveTab('incidents')}
            className={`px-3 py-1 rounded-full font-semibold transition-colors ${
              activeTab === 'incidents'
                ? 'bg-[#5F7A61] text-white shadow-xs'
                : 'text-[#7A6A5A] hover:text-[#3A2E26]'
            }`}
          >
            Incidents ({incidentList.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1 rounded-full font-semibold transition-colors ${
              activeTab === 'reports'
                ? 'bg-[#4F7C82] text-white shadow-xs'
                : 'text-[#7A6A5A] hover:text-[#3A2E26]'
            }`}
          >
            Field Reports ({reportList.length})
          </button>
        </div>
      </div>

      {/* Filter Row */}
      {activeTab === 'incidents' && (
        <div className="flex items-center gap-2 mb-3 text-xs overflow-x-auto pb-1">
          <span className="text-[#7A6A5A] font-mono text-[11px] shrink-0">Filter:</span>
          {['all', 'critical', 'high', 'medium'].map(sev => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-0.5 rounded-full capitalize text-[11px] font-semibold border transition-colors shrink-0 ${
                filterSeverity === sev
                  ? 'bg-[#3A2E26] text-white border-[#3A2E26]'
                  : 'bg-[#FAF6EE] text-[#7A6A5A] border-[#E4D9C5] hover:text-[#3A2E26]'
              }`}
            >
              {sev}
            </button>
          ))}
          <span className="text-[#E4D9C5]">|</span>
          {['all', 'flood', 'heatwave', 'compound'].map(typ => (
            <button
              key={typ}
              onClick={() => setFilterType(typ)}
              className={`px-2.5 py-0.5 rounded-full capitalize text-[11px] font-semibold border transition-colors shrink-0 ${
                filterType === typ
                  ? 'bg-[#5F7A61] text-white border-[#5F7A61]'
                  : 'bg-[#FAF6EE] text-[#7A6A5A] border-[#E4D9C5] hover:text-[#3A2E26]'
              }`}
            >
              {typ}
            </button>
          ))}
        </div>
      )}

      {/* List Feed Area */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[500px]">
        {activeTab === 'incidents' ? (
          filteredIncidents.map(incident => {
            const isSelected = selectedIncidentId === incident.id;
            const areaKey = incident.area || incident.wardId || 'kurla';
            const ward = MUMBAI_WARDS[areaKey];
            const isInspected = inspectedPriorityId === incident.id;
            const priorityVal = incident.priority || incident.priorityScore || 50;

            return (
              <div
                key={incident.id}
                onClick={() => onSelectIncident?.(incident.id)}
                className={`p-3.5 rounded-[16px] border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#FFFDF8] border-2 border-[#5F7A61] shadow-xs'
                    : 'bg-[#FAF6EE] border-[#E4D9C5] hover:bg-[#F2EBDD]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={incident.severity} size="sm" />
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E4D9C5] text-[#3A2E26]">
                      {ward?.name || areaKey.toUpperCase()}
                    </span>
                    {(incident.requiresEvacuation || incident.requiresEvac) && (
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F6DDD6] text-[#B8412F] border border-[#B8412F]/40">
                        EVAC REQUIRED
                      </span>
                    )}
                  </div>

                  {/* Deterministic Priority Score Pill */}
                  <div
                    onClick={e => {
                      e.stopPropagation();
                      setInspectedPriorityId(isInspected ? null : incident.id);
                    }}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFFDF8] border border-[#E4D9C5] font-mono text-xs font-bold text-[#3A2E26] hover:bg-[#F2EBDD]"
                    title="Click to view mathematical priority breakdown"
                  >
                    <span className="text-[10px] text-[#7A6A5A]">P:</span>
                    <span>{priorityVal}/100</span>
                    <HelpCircle className="w-3 h-3 text-[#7A6A5A]" />
                  </div>
                </div>

                <h3 className="text-xs font-bold font-heading text-[#3A2E26] mb-1">
                  {incident.summary || incident.title}
                </h3>
                <p className="text-[11px] text-[#7A6A5A] line-clamp-1 mb-2">
                  Location: {incident.locationName || areaKey}
                </p>

                {/* Mathematical Priority Breakdown Popover */}
                {isInspected && (
                  <div className="mb-2.5 p-2.5 rounded-xl bg-[#FFFDF8] border border-[#5F7A61] text-[11px] font-mono space-y-1">
                    <div className="font-bold text-[#5F7A61]">Deterministic Formula Breakdown:</div>
                    <div className="text-[#3A2E26] text-[10px] leading-relaxed">
                      {incident.priorityBreakdown?.formulaDescription || `Formula: Vuln×35 + Severity×35 + Velocity×18 = ${priorityVal}/100`}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] font-mono text-[#7A6A5A] pt-1.5 border-t border-[#E4D9C5]/60">
                  <div className="flex items-center gap-3">
                    {incident.waterLevelCm && (
                      <span className="flex items-center gap-1 text-[#4F7C82]">
                        <Droplet className="w-3 h-3" />
                        {incident.waterLevelCm} cm
                      </span>
                    )}
                    {incident.heatIndexC && (
                      <span className="flex items-center gap-1 text-[#B0623A]">
                        <Flame className="w-3 h-3" />
                        {incident.heatIndexC}°C
                      </span>
                    )}
                    <span>{incident.reportIds.length} corroborating reports</span>
                  </div>

                  <span className="capitalize font-semibold text-[#5F7A61]">
                    ● {incident.status}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          reportList.map(report => (
            <div
              key={report.id}
              className="p-3.5 rounded-[16px] bg-[#FAF6EE] border border-[#E4D9C5] text-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E4D9C5] text-[#3A2E26]">
                    {(report.area || report.wardId || 'KURLA').toUpperCase()}
                  </span>
                  <span className="font-mono text-[10px] text-[#7A6A5A]">
                    Source: {report.source.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFFDF8] border border-[#E4D9C5]">
                  <span className="text-[#7A6A5A]">Cred:</span>
                  <span className={(report.credibility || report.credibilityScore || 0.8) >= 0.75 ? 'text-[#5F7A61]' : 'text-[#C77A24]'}>
                    {((report.credibility || report.credibilityScore || 0.8) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <p className="text-[#3A2E26] text-[11px] leading-relaxed">
                &ldquo;{report.text}&rdquo;
              </p>

              {report.sensorCorroboration?.isCorroborated && (
                <div className="p-2 rounded-xl bg-[#E3EDDF] border border-[#6E8F6A]/30 text-[10px] font-mono text-[#3D5939] flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-[#5F7A61] shrink-0" />
                  <span>Telemetry Match: {report.sensorCorroboration.sensorReading}</span>
                </div>
              )}

              {report.credibilityExplanation && (
                <div className="text-[10px] text-[#7A6A5A] italic">
                  Agent Note: {report.credibilityExplanation}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
