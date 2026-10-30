/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CredibilityMeter: Visual indicator of report source truth and corroboration.
 * Features:
 * - Thin meter bar: Sage (#5F7A61) for high (>=0.65), Clay/Amber (#B0623A) for medium, Terracotta/Red (#9E2F22) for low (<0.35)
 * - "Unverified" badge when score < 0.35
 * - Prominent reason tag: e.g. "Reinforced by 2 reports" or "Contradicted by BMC alert"
 * - Expandable rationale breakdown for auditability
 */

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ChevronDown, ChevronUp, Layers, CheckCircle, XCircle } from 'lucide-react';

interface CredibilityMeterProps {
  score?: number;
  reasons?: string[];
  isUnverified?: boolean;
  compact?: boolean;
  className?: string;
}

export const CredibilityMeter: React.FC<CredibilityMeterProps> = ({
  score = 0.50,
  reasons = [],
  isUnverified,
  compact = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const normalizedScore = Math.max(0, Math.min(1, score));
  const percent = Math.round(normalizedScore * 100);
  const unverified = isUnverified !== undefined ? isUnverified : normalizedScore < 0.35;

  // Color determination: Sage for high (>=0.65), Amber/Terracotta for medium (0.35-0.64), Crimson for low (<0.35)
  let barColor = 'bg-[#5F7A61]'; // Sage
  let textColor = 'text-[#5F7A61]';
  let badgeBg = 'bg-[#E3EDDF] text-[#3D5939] border-[#C8DEC0]';

  if (unverified || normalizedScore < 0.35) {
    barColor = 'bg-[#9E2F22]'; // Deep Terracotta / Crimson
    textColor = 'text-[#9E2F22]';
    badgeBg = 'bg-[#F6DDD6] text-[#9E2F22] border-[#E8BCB5]';
  } else if (normalizedScore < 0.65) {
    barColor = 'bg-[#B0623A]'; // Amber / Clay
    textColor = 'text-[#B0623A]';
    badgeBg = 'bg-[#EED8CE] text-[#8C4624] border-[#DFC0B0]';
  }

  // Find headline tag: Reinforcement or Contradiction
  const reinforcementReason = reasons.find(r => r.toLowerCase().includes('reinforced by'));
  const contradictionReason = reasons.find(r => r.toLowerCase().includes('contradicted by'));
  const extremeReason = reasons.find(r => r.toLowerCase().includes('extreme disaster claim'));

  const highlightLine = contradictionReason || extremeReason || reinforcementReason || (reasons.length > 0 ? reasons[0] : null);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Header Row: Score + Unverified Badge + Toggle */}
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          {unverified ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F6DDD6] text-[#9E2F22] border border-[#E8BCB5]">
              <ShieldAlert className="w-3 h-3" />
              Unverified
            </span>
          ) : normalizedScore >= 0.80 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E3EDDF] text-[#3D5939] border border-[#C8DEC0]">
              <ShieldCheck className="w-3 h-3" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FAF6EE] text-[#7A6A5A] border border-[#E4D9C5]">
              <Layers className="w-3 h-3" />
              Provisional
            </span>
          )}

          <span className="text-[11px] text-[#7A6A5A]">Credibility:</span>
          <span className={`font-bold font-mono text-xs ${textColor}`}>
            {normalizedScore.toFixed(2)} ({percent}%)
          </span>
        </div>

        {reasons.length > 0 && !compact && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[11px] text-[#7A6A5A] hover:text-[#3A2E26] transition-colors cursor-pointer"
          >
            <span>{isExpanded ? 'Hide breakdown' : 'Why this score?'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Thin Credibility Bar */}
      <div className="w-full h-1.5 rounded-full bg-[#E4D9C5]/50 overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
        {/* Subtle 0.35 threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-[1.5px] bg-[#3A2E26]/40 z-10"
          style={{ left: '35%' }}
          title="0.35 Verification Threshold"
        />
      </div>

      {/* Prominent Highlighting Reason */}
      {highlightLine && (
        <div className="flex items-center gap-1.5 text-[11px]">
          {contradictionReason ? (
            <XCircle className="w-3 h-3 text-[#9E2F22] shrink-0" />
          ) : reinforcementReason ? (
            <CheckCircle className="w-3 h-3 text-[#5F7A61] shrink-0" />
          ) : (
            <AlertTriangle className="w-3 h-3 text-[#B0623A] shrink-0" />
          )}
          <span
            className={`font-mono text-[10.5px] truncate ${
              contradictionReason
                ? 'text-[#9E2F22] font-bold'
                : reinforcementReason
                ? 'text-[#5F7A61] font-semibold'
                : 'text-[#7A6A5A]'
            }`}
            title={highlightLine}
          >
            {highlightLine}
          </span>
        </div>
      )}

      {/* Expandable Rationale Details */}
      {isExpanded && reasons.length > 0 && (
        <div className="mt-2 p-2.5 rounded-xl bg-[#FAF6EE] border border-[#E4D9C5] space-y-1.5 text-[11px] font-mono text-[#3A2E26] animate-in fade-in">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#7A6A5A] pb-1 border-b border-[#E4D9C5]/60 flex justify-between items-center">
            <span>Deterministic Scoring Audit</span>
            <span>Threshold: 0.35</span>
          </div>
          <ul className="space-y-1 text-[10.5px] text-[#3A2E26]">
            {reasons.map((reason, idx) => {
              const isPositive = reason.includes('+');
              const isNegative = reason.includes('-');
              return (
                <li key={idx} className="flex items-start gap-1.5">
                  <span
                    className={`shrink-0 font-bold ${
                      isPositive ? 'text-[#5F7A61]' : isNegative ? 'text-[#9E2F22]' : 'text-[#7A6A5A]'
                    }`}
                  >
                    •
                  </span>
                  <span className={isNegative ? 'text-[#9E2F22]' : isPositive ? 'text-[#3D5939]' : ''}>
                    {reason}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
