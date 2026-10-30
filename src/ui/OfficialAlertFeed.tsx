/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OfficialAlertFeed: Live feed of institutional radar, hydrology, and civil defence advisories.
 * Features:
 * - Displays official advisories from IMD, BMC, NDRF, Traffic Police, and IoT telemetry
 * - "Release next alert" on-demand operator button that injects the next scheduled advisory
 * - Triggers entanglement: recalculates credibility across citizen reports and detects contradictions/rumours
 */

import React, { useState } from 'react';
import {
  Radio,
  PlusCircle,
  AlertOctagon,
  AlertTriangle,
  Info,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Cpu,
  Waves,
} from 'lucide-react';
import { useWorldStore } from '../state/store.ts';
import { OfficialAgency, OfficialAlert } from '../state/types.ts';
import { Button } from './Button.tsx';

interface OfficialAlertFeedProps {
  onAlertReleased?: (alert: OfficialAlert) => void;
  className?: string;
}

export const OfficialAlertFeed: React.FC<OfficialAlertFeedProps> = ({
  onAlertReleased,
  className = '',
}) => {
  const store = useWorldStore();
  const { officialAlerts = [], pendingAlertsQueue = [], releaseNextOfficialAlert } = store;
  const [justReleasedId, setJustReleasedId] = useState<string | null>(null);

  const handleReleaseNext = () => {
    if (store.isKilled) {
      alert('Global Kill Switch engaged. Disengage switch before issuing official advisories.');
      return;
    }

    const released = releaseNextOfficialAlert();
    if (released) {
      setJustReleasedId(released.id);
      setTimeout(() => setJustReleasedId(null), 3000);
      if (onAlertReleased) {
        onAlertReleased(released);
      }
    }
  };

  const getAgencyBadge = (agency?: OfficialAgency) => {
    switch (agency) {
      case 'IMD':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F6DDD6] text-[#9E2F22] border border-[#E8BCB5] flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 animate-pulse text-[#9E2F22]" />
            IMD Radar
          </span>
        );
      case 'BMC':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#D7E3E5] text-[#2C5258] border border-[#B7CAD0] flex items-center gap-1">
            <ShieldCheck className="w-2.5 h-2.5 text-[#2C5258]" />
            MCGM / BMC
          </span>
        );
      case 'NDRF':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#E3EDDF] text-[#3D5939] border border-[#C8DEC0] flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5 text-[#3D5939]" />
            NDRF 5th Bn
          </span>
        );
      case 'TRAFFIC':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#EAE8E2] text-[#4A443C] border border-[#D5D0C6] flex items-center gap-1">
            Traffic Police
          </span>
        );
      case 'IOT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#E5DFEC] text-[#553C7B] border border-[#CFC5DE] flex items-center gap-1">
            <Cpu className="w-2.5 h-2.5 text-[#553C7B]" />
            IoT Telemetry
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FAF6EE] text-[#7A6A5A] border border-[#E4D9C5]">
            Official
          </span>
        );
    }
  };

  const formatRelativeTime = (ts: number) => {
    const diffMin = Math.round((Date.now() - ts) / 60000);
    if (diffMin <= 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    return `${Math.round(diffMin / 60)}h ago`;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Feed Action Header */}
      <div className="p-3 rounded-2xl bg-[#FAF6EE] border border-[#E4D9C5] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#9E2F22] animate-pulse" />
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[#3A2E26]">
              Official alert feed
            </h3>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFFDF8] text-[#5F7A61] border border-[#E4D9C5]">
              {officialAlerts.length} Active
            </span>
          </div>
          <p className="text-[11px] text-[#7A6A5A] mt-0.5">
            IMD radar warnings, BMC floodgates, and river gauges used to corroborate or cancel citizen claims.
          </p>
        </div>

        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReleaseNext}
            disabled={pendingAlertsQueue.length === 0}
            leftIcon={<PlusCircle className="w-3.5 h-3.5 text-[#5F7A61]" />}
            className="text-xs font-heading font-bold"
          >
            {pendingAlertsQueue.length > 0
              ? 'Release next alert'
              : 'All Alerts Released'}
          </Button>
        </div>
      </div>

      {/* Alert Cards List */}
      <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
        {officialAlerts.map(alert => {
          const isJustReleased = justReleasedId === alert.id;
          const hasContradiction = alert.contradictsClaims && alert.contradictsClaims.length > 0;

          return (
            <div
              key={alert.id}
              className={`p-3.5 rounded-2xl bg-[#FFFDF8] border transition-all duration-300 ${
                isJustReleased
                  ? 'border-[#5F7A61] shadow-[0_0_12px_rgba(95,122,97,0.35)] ring-2 ring-[#5F7A61]/30'
                  : hasContradiction
                  ? 'border-[#E8BCB5] hover:border-[#9E2F22]'
                  : 'border-[#E4D9C5] hover:border-[#7A6A5A]/50'
              }`}
            >
              {/* Top metadata strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {getAgencyBadge(alert.agency)}
                  {alert.area && (
                    <span className="text-[10px] font-mono font-bold text-[#7A6A5A] uppercase px-1.5 py-0.5 rounded bg-[#FAF6EE] border border-[#E4D9C5]">
                      {alert.area}
                    </span>
                  )}
                  {alert.urgency === 'critical' ? (
                    <span className="text-[10px] font-mono font-bold text-[#9E2F22] flex items-center gap-0.5">
                      <AlertOctagon className="w-2.5 h-2.5" />
                      Critical
                    </span>
                  ) : alert.urgency === 'high' ? (
                    <span className="text-[10px] font-mono font-bold text-[#B0623A] flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Urgent
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono text-[#7A6A5A]">
                  <Clock className="w-3 h-3" />
                  <span>{formatRelativeTime(alert.ts)}</span>
                </div>
              </div>

              {/* Headline */}
              <h4 className="font-heading font-bold text-xs text-[#3A2E26] leading-snug">
                {alert.headline}
              </h4>

              {/* Text Description */}
              <p className="text-xs text-[#524438] mt-1 leading-relaxed">
                {alert.text}
              </p>

              {/* Contradiction / Debunking Tag */}
              {hasContradiction && (
                <div className="mt-2.5 p-2 rounded-xl bg-[#F6DDD6] border border-[#E8BCB5] flex items-start gap-1.5 text-[11px] font-mono text-[#9E2F22]">
                  <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Fact-Check / Contradiction: </span>
                    <span>
                      Cancels rumors claiming &ldquo;{alert.contradictsClaims?.join(', ')}&rdquo; with -0.50 credibility penalty.
                    </span>
                  </div>
                </div>
              )}

              {/* Source attribution footer */}
              <div className="mt-2 pt-1.5 border-t border-[#E4D9C5]/40 flex items-center justify-between text-[10px] font-mono text-[#7A6A5A]">
                <span>Source: {alert.source}</span>
                <span>ID: {alert.id}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
