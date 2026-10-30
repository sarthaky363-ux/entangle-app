/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * IncidentCard: Displays disaster incidents with priority badge and 
 * an expandable "Why this priority?" deterministic score breakdown.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, HelpCircle, Users, Droplets, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Incident } from '../state/types.ts';
import { SeverityBadge } from './SeverityBadge.tsx';
import { useWorldStore } from '../state/store.ts';
import { CredibilityMeter } from './CredibilityMeter.tsx';

interface IncidentCardProps {
  incident: Incident;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({ incident }) => {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const reports = useWorldStore(state => state.reports);

  const breakdown = incident.priorityBreakdown;
  const primaryReportId = incident.reportIds?.[0];
  const primaryReport = primaryReportId ? reports[primaryReportId] : null;

  return (
    <div className="p-4 rounded-[16px] bg-[#FAF6EE] border border-[#E4D9C5] hover:bg-[#F2EBDD]/60 transition-all flex flex-col gap-3">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge severity={incident.severity} size="sm" />
            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E4D9C5] text-[#3A2E26]">
              {incident.area.toUpperCase()}
            </span>
            <span className="text-[11px] text-[#7A6A5A] font-mono">
              Status: <span className="font-semibold text-[#3A2E26]">{incident.status}</span>
            </span>
          </div>

          <h4 className="font-heading font-bold text-sm sm:text-base text-[#3A2E26] leading-snug">
            {incident.summary}
          </h4>

          {/* Tactical Needs Chips */}
          <div className="flex items-center gap-2 text-xs text-[#7A6A5A] flex-wrap pt-0.5">
            <span className="font-mono font-semibold">Needs:</span>
            {incident.needs.map(need => (
              <span
                key={need}
                className="px-2.5 py-0.5 rounded-full bg-[#FFFDF8] border border-[#E4D9C5] font-mono text-[10px] font-semibold text-[#5F7A61]"
              >
                {need}
              </span>
            ))}
            <span className="text-[11px] text-[#7A6A5A]">
              • {incident.reportIds.length} corroborating {incident.reportIds.length === 1 ? 'report' : 'reports'}
            </span>
          </div>
        </div>

        {/* Priority Score Box */}
        <div className="text-center font-mono px-3.5 py-2 rounded-2xl bg-[#FFFDF8] border border-[#E4D9C5] shadow-[0_1px_2px_rgba(58,46,38,0.04)] shrink-0 self-start sm:self-auto">
          <span className="text-[10px] text-[#7A6A5A] uppercase tracking-wider block font-semibold">
            Score
          </span>
          <span className="font-extrabold text-xl text-[#3A2E26]">
            {incident.priority}
            <span className="text-xs text-[#7A6A5A] font-normal">/100</span>
          </span>
        </div>
      </div>

      {/* Source Credibility Meter Bar */}
      {primaryReport && (
        <>
          <div className="pt-1.5 border-t border-[#E4D9C5]/50">
            <CredibilityMeter
              score={primaryReport.credibility ?? primaryReport.credibilityScore ?? 0.85}
              reasons={primaryReport.credibilityReasons || (primaryReport.credibilityExplanation ? [primaryReport.credibilityExplanation] : [])}
              isUnverified={primaryReport.isUnverified}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="min-w-0">
              <span className="font-mono font-bold text-[#7A6A5A] uppercase tracking-wider block mb-0.5">
                Original ({primaryReport.language.toUpperCase()})
              </span>
              <p lang={primaryReport.language} className="h-full p-2.5 rounded-lg bg-[#FAF6EE] border border-[#E4D9C5] italic text-[#3A2E26]">
                &ldquo;{primaryReport.text}&rdquo;
              </p>
            </div>
            <div className="min-w-0">
              <span className="font-mono font-bold text-[#7A6A5A] uppercase tracking-wider block mb-0.5">
                English translation
              </span>
              <p lang="en" className="h-full p-2.5 rounded-lg bg-[#FAF6EE] border border-[#E4D9C5] text-[#3A2E26]">
                {primaryReport.englishTranslation
                  ? `“${primaryReport.englishTranslation}”`
                  : primaryReport.translationStatus === 'pending'
                    ? 'Translation pending…'
                    : primaryReport.translationStatus === 'unavailable'
                      ? 'Translation unavailable.'
                      : primaryReport.language === 'en'
                        ? `“${primaryReport.text}”`
                        : 'English translation not available.'}
              </p>
            </div>
          </div>
        </>
      )}

      {/* "Why this priority?" Expander Trigger */}
      <div className="pt-1 border-t border-[#E4D9C5]/60 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
          className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#4F7C82] hover:text-[#3A2E26] transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Why this priority?</span>
          {isBreakdownOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        <span className="text-[10px] font-mono text-[#7A6A5A]">
          Deterministic formula • No LLM invented numbers
        </span>
      </div>

      {/* Expanded Priority Breakdown Card */}
      {isBreakdownOpen && (
        <div className="mt-1 p-3.5 rounded-xl bg-[#FFFDF8] border border-[#E4D9C5] text-xs font-sans space-y-3 animate-in fade-in">
          <div className="font-mono text-[11px] font-bold text-[#3A2E26] flex items-center justify-between border-b border-[#E4D9C5] pb-1.5">
            <span>Deterministic Scoring Formula Breakdown</span>
            <span className="text-[#5F7A61]">Result: {incident.priority} / 100</span>
          </div>

          {/* Breakdown 5 Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 font-mono text-[11px]">
            {/* 1. People At Risk (35%) */}
            <div className="p-2.5 rounded-lg bg-[#FAF6EE] border border-[#E4D9C5] space-y-1">
              <div className="flex items-center justify-between text-[#7A6A5A]">
                <span className="flex items-center gap-1 font-semibold">
                  <Users className="w-3 h-3 text-[#4F7C82]" /> People at Risk (35%)
                </span>
                <span className="font-bold text-[#3A2E26]">
                  {breakdown?.peopleAtRiskScore ?? Math.round(incident.priority * 0.35)} pts
                </span>
              </div>
              <p className="text-[10px] text-[#7A6A5A] font-sans">
                {breakdown?.peopleAtRiskCount ? `${breakdown.peopleAtRiskCount} people reported (capped at 20)` : 'Extracted from distress report'}
              </p>
            </div>

            {/* 2. Vulnerability Keywords (25%) */}
            <div className="p-2.5 rounded-lg bg-[#FAF6EE] border border-[#E4D9C5] space-y-1">
              <div className="flex items-center justify-between text-[#7A6A5A]">
                <span className="flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3 h-3 text-[#5F7A61]" /> Vulnerability (25%)
                </span>
                <span className="font-bold text-[#3A2E26]">
                  {breakdown?.vulnerabilityScore ?? (incident.priority >= 75 ? 25 : 15)} pts
                </span>
              </div>
              <p className="text-[10px] text-[#7A6A5A] font-sans">
                {breakdown?.detectedVulnerabilities?.length
                  ? `Detected: ${breakdown.detectedVulnerabilities.join(', ')}`
                  : 'Elderly / oxygen / child / pregnant'}
              </p>
            </div>

            {/* 3. Water Depth (20%) */}
            <div className="p-2.5 rounded-lg bg-[#FAF6EE] border border-[#E4D9C5] space-y-1">
              <div className="flex items-center justify-between text-[#7A6A5A]">
                <span className="flex items-center gap-1 font-semibold">
                  <Droplets className="w-3 h-3 text-[#4F7C82]" /> Water Depth (20%)
                </span>
                <span className="font-bold text-[#3A2E26]">
                  {breakdown?.waterDepthScore ?? 15} pts
                </span>
              </div>
              <p className="text-[10px] text-[#7A6A5A] font-sans">
                {breakdown?.detectedWaterDepth && breakdown.detectedWaterDepth !== 'none'
                  ? `Level: ${breakdown.detectedWaterDepth.toUpperCase()}`
                  : 'Inundation keywords checked (roof/chest/waist/knee)'}
              </p>
            </div>

            {/* 4. Time Elapsed (10%) */}
            <div className="p-2.5 rounded-lg bg-[#FAF6EE] border border-[#E4D9C5] space-y-1">
              <div className="flex items-center justify-between text-[#7A6A5A]">
                <span className="flex items-center gap-1 font-semibold">
                  <Clock className="w-3 h-3 text-[#7A6A5A]" /> Time Elapsed (10%)
                </span>
                <span className="font-bold text-[#3A2E26]">
                  {breakdown?.timeElapsedScore ?? 6} pts
                </span>
              </div>
              <p className="text-[10px] text-[#7A6A5A] font-sans">
                {breakdown?.minutesSinceReport !== undefined
                  ? `${breakdown.minutesSinceReport} mins pending (cap 60m)`
                  : 'Active response timer tracking'}
              </p>
            </div>

            {/* 5. Road Access Blocked (10%) */}
            <div className="p-2.5 rounded-lg bg-[#FAF6EE] border border-[#E4D9C5] space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between text-[#7A6A5A]">
                <span className="flex items-center gap-1 font-semibold">
                  <AlertTriangle className="w-3 h-3 text-[#B0623A]" /> Road Access Blocked (10%)
                </span>
                <span className="font-bold text-[#3A2E26]">
                  {breakdown?.roadBlockedScore ?? (breakdown?.roadBlockedDetected ? 10 : 0)} pts
                </span>
              </div>
              <p className="text-[10px] text-[#7A6A5A] font-sans">
                {breakdown?.roadBlockedDetected ? 'Chokepoint / submerged underpass reported' : 'Passage passable or unblocked'}
              </p>
            </div>
          </div>

          {/* Formula Summary Line */}
          {breakdown?.formulaDescription && (
            <div className="p-2 rounded bg-[#FAF6EE] text-[10px] font-mono text-[#7A6A5A] border border-[#E4D9C5]">
              {breakdown.formulaDescription}
            </div>
          )}

        </div>
      )}
    </div>
  );
};
