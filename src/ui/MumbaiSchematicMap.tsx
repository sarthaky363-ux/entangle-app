/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Mumbai Custom SVG Schematic Cartography
 * Fully self-contained offline SVG vector map of Mumbai disaster zones.
 */

import React, { useState } from 'react';
import { Compass } from 'lucide-react';
import { MUMBAI_WARDS, MumbaiWard } from '../data/mumbaiZones.ts';
import { useWorldStore } from '../state/store.ts';
import { Incident } from '../state/types.ts';

function getWardForArea(area?: string): MumbaiWard | undefined {
  const key = area?.toLowerCase() || '';
  if (key.includes('andheri')) return MUMBAI_WARDS.andheri;
  if (key.includes('mithi')) return MUMBAI_WARDS.kurla;
  return MUMBAI_WARDS[key];
}

interface MumbaiSchematicMapProps {
  selectedIncidentId?: string;
  onSelectIncident?: (incidentId: string) => void;
  selectedWardId?: string;
  onSelectWard?: (wardId: string) => void;
}

export const MumbaiSchematicMap: React.FC<MumbaiSchematicMapProps> = ({
  selectedIncidentId,
  onSelectIncident,
  selectedWardId,
  onSelectWard,
}) => {
  const { incidents, resources, volunteers, candidatePlans, approvedPlanId } = useWorldStore();
  const [activeLayer, setActiveLayer] = useState<'hybrid' | 'flood' | 'vulnerability' | 'heat'>('hybrid');
  const [showRoutes, setShowRoutes] = useState(true);
  const [hoveredIncidentId, setHoveredIncidentId] = useState<string | null>(null);

  const incidentList = Object.values(incidents);
  const resourceList = Object.values(resources);
  const activePlan = candidatePlans.find(p =>
    p.id === approvedPlanId && (p.status === 'approved' || p.status === 'executed')
  );
  const wardList: MumbaiWard[] = Object.values(MUMBAI_WARDS);

  const getWardFill = (ward: MumbaiWard) => {
    if (activeLayer === 'flood') {
      const inc = incidentList.find(i =>
        i.wardId === ward.id || i.area === ward.id || getWardForArea(i.wardId || i.area)?.id === ward.id
      );
      if (inc?.severity === 'critical') return '#F6DDD6';
      if (inc?.severity === 'high') return '#F8E6CC';
      if (inc) return '#F5EBC4';
      return '#FFFDF8';
    }
    if (activeLayer === 'vulnerability') {
      if (ward.vulnerabilityIndex >= 0.85) return '#F6DDD6';
      if (ward.vulnerabilityIndex >= 0.65) return '#F8E6CC';
      return '#E3EDDF';
    }
    if (activeLayer === 'heat') {
      if (ward.heatIslandSeverity === 'extreme') return '#F6DDD6';
      if (ward.heatIslandSeverity === 'high') return '#F8E6CC';
      return '#FFFDF8';
    }
    if (selectedWardId === ward.id) return '#E4D9C5';
    return '#F2EBDD';
  };

  return (
    <div className="bg-[#FFFDF8] rounded-[20px] border border-[#E4D9C5] p-5 shadow-xs flex flex-col h-full">
      {/* Map Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-[#5F7A61]" />
          <div>
            <h2 className="text-base font-bold font-heading text-[#3A2E26]">
              Mumbai District Geo-Schematic
            </h2>
            <p className="text-[11px] text-[#7A6A5A]">
              Vector topology with Mithi river channel, lowlines &amp; staging sectors
            </p>
          </div>
        </div>

        {/* Layer Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#FAF6EE] border border-[#E4D9C5] text-xs">
          <button
            onClick={() => setActiveLayer('hybrid')}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
              activeLayer === 'hybrid' ? 'bg-[#5F7A61] text-white shadow-xs' : 'text-[#7A6A5A] hover:text-[#3A2E26]'
            }`}
          >
            Tactical
          </button>
          <button
            onClick={() => setActiveLayer('flood')}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
              activeLayer === 'flood' ? 'bg-[#4F7C82] text-white shadow-xs' : 'text-[#7A6A5A] hover:text-[#3A2E26]'
            }`}
          >
            Inundation
          </button>
          <button
            onClick={() => setActiveLayer('vulnerability')}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
              activeLayer === 'vulnerability' ? 'bg-[#B0623A] text-white shadow-xs' : 'text-[#7A6A5A] hover:text-[#3A2E26]'
            }`}
          >
            Vulnerability
          </button>
          <button
            onClick={() => setShowRoutes(!showRoutes)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
              showRoutes ? 'bg-[#F2EBDD] border-[#E4D9C5] text-[#3A2E26]' : 'border-transparent text-[#7A6A5A]'
            }`}
            title="Toggle dispatch corridor vectors"
          >
            Routes
          </button>
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative flex-1 min-h-[460px] bg-[#FAF6EE] rounded-[16px] border border-[#E4D9C5] overflow-hidden flex items-center justify-center p-2">
        <div className="absolute top-3 left-4 text-[10px] font-mono tracking-widest text-[#7A6A5A]/60 uppercase">
          Arabian Sea (West)
        </div>
        <div className="absolute top-3 right-4 text-[10px] font-mono tracking-widest text-[#7A6A5A]/60 uppercase">
          Thane Creek (East)
        </div>
        <div className="absolute bottom-3 left-4 text-[10px] font-mono tracking-widest text-[#7A6A5A]/60 uppercase">
          Back Bay / Colaba Head
        </div>

        <svg
          viewBox="180 40 450 780"
          className="w-full h-full max-h-[580px] select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="mithiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A6B99F" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#6E8F6A" stopOpacity="0.9" />
            </linearGradient>

            <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" floodColor="#3A2E26" />
            </filter>
          </defs>

          {/* Mumbai Coastal Shoreline Outline */}
          <path
            d="M 280 80 Q 230 200 250 320 T 320 500 T 310 650 T 350 780 L 430 760 Q 480 600 560 520 T 560 300 Q 450 200 400 80 Z"
            fill="#F2EBDD"
            stroke="#E4D9C5"
            strokeWidth="2.5"
            strokeDasharray="4 4"
          />

          {/* Mithi River Channel */}
          <path
            d="M 430 180 Q 460 260 480 340 T 450 420 Q 390 440 330 450"
            fill="none"
            stroke="url(#mithiGradient)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <text x="495" y="315" fill="#5F7A61" fontSize="9" fontFamily="JetBrains Mono" fontWeight="600">
            Mithi River
          </text>

          {/* Mahim Bay / Creek */}
          <path
            d="M 330 440 Q 360 450 390 440"
            fill="none"
            stroke="#A6B99F"
            strokeWidth="3.5"
            strokeOpacity="0.6"
          />

          {/* Ward Polygons */}
          {wardList.map(ward => {
            const isSelected = selectedWardId === ward.id;
            return (
              <g
                key={ward.id}
                onClick={() => onSelectWard?.(ward.id)}
                className="cursor-pointer transition-all duration-200 group"
              >
                <polygon
                  points={ward.svgPolygon}
                  fill={getWardFill(ward)}
                  stroke={isSelected ? '#3A2E26' : '#E4D9C5'}
                  strokeWidth={isSelected ? '2.5' : '1.2'}
                  className="transition-colors hover:fill-[#FAF6EE]"
                />
                <text
                  x={ward.svgCenter.x}
                  y={ward.svgCenter.y - 12}
                  textAnchor="middle"
                  fill="#7A6A5A"
                  fontSize="10"
                  fontFamily="Inter"
                  fontWeight="600"
                  className="pointer-events-none group-hover:fill-[#3A2E26]"
                >
                  {ward.name}
                </text>
                <text
                  x={ward.svgCenter.x}
                  y={ward.svgCenter.y + 1}
                  textAnchor="middle"
                  fill="#3A2E26"
                  fontSize="8.5"
                  fontFamily="JetBrains Mono"
                  className="pointer-events-none opacity-60"
                >
                  Ward {ward.code} • Vuln {(ward.vulnerabilityIndex * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Routes are only shown after the operator approves a plan. */}
          {showRoutes &&
            activePlan &&
            activePlan?.assignments?.map((alloc: any, idx: number) => {
              const inc = incidents[alloc.incidentId];
              const targetWard = getWardForArea(inc?.area || inc?.wardId);
              const volunteer = volunteers[alloc.volunteerId];
              const target = inc?.coordinates || inc?.location || targetWard?.svgCenter;
              if (!volunteer || !target) return null;
              const routeColor = ['#5F7A61', '#4F7C82', '#B0623A', '#6E8F6A'][idx % 4];

              return (
                <g key={`route_${alloc.volunteerId}_${alloc.incidentId}`}>
                  <line
                    x1={volunteer.location.x}
                    y1={volunteer.location.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={routeColor}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    strokeOpacity="0.9"
                  />
                </g>
              );
            })}

          {/* Volunteer markers are positioned at their registered coordinates. */}
          {Object.values(volunteers).map(volunteer => (
            <g key={volunteer.id} transform={`translate(${volunteer.location.x}, ${volunteer.location.y})`}>
              <circle
                r="2.7"
                fill={volunteer.available ? '#5F7A61' : '#7A6A5A'}
                stroke="#FFFDF8"
                strokeWidth="1"
              >
                <title>{`${volunteer.name} · ${volunteer.available ? 'available' : 'assigned'}`}</title>
              </circle>
            </g>
          ))}

          {/* Depot squares use the existing depot labels and their schematic locations. */}
          {Array.from(new Map(resourceList.map(resource => [resource.depotArea, resource])).values()).map(resource => {
            const depotArea = resource.depotArea.toLowerCase();
            const ward = depotArea.includes('kurla')
              ? MUMBAI_WARDS.kurla
              : depotArea.includes('bandra')
              ? MUMBAI_WARDS.bkc
              : MUMBAI_WARDS.andheri;
            return (
              <g key={resource.depotArea} transform={`translate(${ward.svgCenter.x - 5}, ${ward.svgCenter.y + 14})`}>
                <rect width="10" height="10" rx="1" fill="#B0623A" stroke="#FFFDF8" strokeWidth="1.5">
                  <title>{resource.depotArea}</title>
                </rect>
              </g>
            );
          })}

          {/* Incident Pins */}
          {incidentList.map(incident => {
            const isSelected = selectedIncidentId === incident.id;
            const targetWard = getWardForArea(incident.area || incident.wardId) || MUMBAI_WARDS.kurla;
            const coord = incident.coordinates || incident.location || targetWard.svgCenter;
            const priority = Math.max(0, Math.min(100, incident.priority ?? incident.priorityScore ?? 50));
            const size = 7 + priority * 0.06;
            const severityColor = incident.severity === 'critical'
              ? '#B8412F'
              : incident.severity === 'high'
              ? '#C77A24'
              : incident.severity === 'medium'
              ? '#B89A2E'
              : '#6E8F6A';
            const hovered = hoveredIncidentId === incident.id;

            return (
              <g
                key={incident.id}
                onClick={() => onSelectIncident?.(incident.id)}
                onMouseEnter={() => setHoveredIncidentId(incident.id)}
                onMouseLeave={() => setHoveredIncidentId(null)}
                onFocus={() => setHoveredIncidentId(incident.id)}
                onBlur={() => setHoveredIncidentId(null)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') onSelectIncident?.(incident.id);
                }}
                role="button"
                tabIndex={0}
                aria-label={`${incident.summary || incident.title || 'Incident'}, ${incident.severity} severity, priority ${priority}`}
                className="cursor-pointer group"
                transform={`translate(${coord.x}, ${coord.y})`}
              >
                <title>{`${incident.summary || incident.title || 'Incident'} · ${incident.severity} · priority ${priority}`}</title>
                {incident.severity === 'critical' && (
                  <circle cx="0" cy="0" r={size + 7} fill={severityColor} opacity="0.16" />
                )}
                {incident.severity === 'critical' ? (
                  <path
                    d={`M 0 ${-size} L ${size} 0 L 0 ${size} L ${-size} 0 Z`}
                    fill={severityColor}
                    stroke="#FFFDF8"
                    strokeWidth={isSelected ? '3' : '2'}
                    className="transition-transform group-hover:scale-125"
                  />
                ) : incident.severity === 'high' ? (
                  <path
                    d={`M 0 ${-size} L ${size} ${size} L ${-size} ${size} Z`}
                    fill={severityColor}
                    stroke="#FFFDF8"
                    strokeWidth={isSelected ? '3' : '2'}
                    className="transition-transform group-hover:scale-125"
                  />
                ) : incident.severity === 'medium' ? (
                  <circle
                    r={size}
                    fill={severityColor}
                    stroke="#FFFDF8"
                    strokeWidth={isSelected ? '3' : '2'}
                    className="transition-transform group-hover:scale-125"
                  />
                ) : (
                  <rect
                    x={-size * 0.72}
                    y={-size * 0.72}
                    width={size * 1.44}
                    height={size * 1.44}
                    rx="2"
                    fill={severityColor}
                    stroke="#FFFDF8"
                    strokeWidth={isSelected ? '3' : '2'}
                    className="transition-transform group-hover:scale-125"
                  />
                )}
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fill="#FFFDF8"
                  fontSize={size > 11 ? '7.5' : '6.5'}
                  fontFamily="JetBrains Mono"
                  fontWeight="bold"
                >
                  {priority}
                </text>

                {hovered && (
                  <foreignObject x="14" y="-58" width="205" height="62" pointerEvents="none">
                    <div
                      className="rounded-lg border border-[#E4D9C5] bg-[#FFFDF8] px-2.5 py-2 text-[10px] leading-tight text-[#3A2E26] shadow-lg"
                    >
                      <strong className="block truncate">{incident.summary || incident.title || 'Incident'}</strong>
                      <span className="mt-1 block text-[#7A6A5A]">
                        {incident.area.replaceAll('_', ' ')} · {incident.severity} · priority {priority}
                      </span>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </svg>

        {/* Schematic Legend overlay */}
        <div className="absolute bottom-3 right-3 bg-[#FFFDF8]/95 backdrop-blur-xs border border-[#E4D9C5] rounded-[14px] p-2.5 text-[10px] space-y-1.5 shadow-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rotate-45 bg-[#B8412F]" />
            <span className="text-[#3A2E26]">Incident (shape = severity, size = priority)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5F7A61]" />
            <span className="text-[#3A2E26]">Volunteer</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#B0623A]" />
            <span className="text-[#3A2E26]">Depot</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 border-t-2 border-dashed border-[#4F7C82]" />
            <span className="text-[#3A2E26]">Dispatch Corridor</span>
          </div>
        </div>
      </div>
    </div>
  );
};
