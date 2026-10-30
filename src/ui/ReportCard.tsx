/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ReportCard: Displays raw citizen and field reports with live CredibilityMeter,
 * language badges, people-at-risk indicators, and merge/unverified status.
 */

import React from 'react';
import { Clock, MapPin, Users, Globe, CheckCircle2, ShieldAlert, GitMerge } from 'lucide-react';
import { Report } from '../state/types.ts';
import { CredibilityMeter } from './CredibilityMeter.tsx';

interface ReportCardProps {
  report: Report;
  className?: string;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report, className = '' }) => {
  const formatTime = (ts: number) => {
    const diff = Math.round((Date.now() - ts) / 60000);
    if (diff <= 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.round(diff / 60)}h ago`;
  };

  const isUnverified = report.isUnverified || (report.credibility !== undefined && report.credibility < 0.35);

  return (
    <div
      className={`p-3.5 rounded-2xl bg-[#FFFDF8] border transition-all ${
        isUnverified
          ? 'border-[#E8BCB5] bg-[#FFF8F6]'
          : 'border-[#E4D9C5] hover:border-[#7A6A5A]/50'
      } ${className}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap text-xs font-mono">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-[#3A2E26] uppercase px-2 py-0.5 rounded-md bg-[#E4D9C5]/60 text-[10.5px]">
            {report.area.toUpperCase()}
          </span>

          <span className="text-[10px] text-[#7A6A5A] px-1.5 py-0.5 rounded bg-[#FAF6EE] border border-[#E4D9C5]">
            Source: {report.source}
          </span>

          <span className="text-[10px] font-bold text-[#4F7C82] flex items-center gap-1">
            <Globe className="w-2.5 h-2.5" />
            {report.language.toUpperCase()}
          </span>

          {report.mergedInto && (
            <span className="text-[10px] text-[#5F7A61] flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full bg-[#E3EDDF]">
              <GitMerge className="w-2.5 h-2.5" />
              Merged into #{report.mergedInto}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] text-[#7A6A5A]">
          <Clock className="w-3 h-3" />
          <span>{formatTime(report.ts)}</span>
        </div>
      </div>

      {/* Original report and its English translation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
        <div className="min-w-0">
          <span className="block text-[10px] font-mono font-bold uppercase text-[#7A6A5A] mb-1">
            Original ({report.language.toUpperCase()})
          </span>
          <p lang={report.language} className="h-full text-xs text-[#3A2E26] leading-relaxed italic bg-[#FAF6EE]/80 p-2.5 rounded-xl border border-[#E4D9C5]/50">
            &ldquo;{report.text}&rdquo;
          </p>
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] font-mono font-bold uppercase text-[#7A6A5A] mb-1">
            English translation
          </span>
          <p lang="en" className="h-full text-xs text-[#3A2E26] leading-relaxed bg-[#FAF6EE]/80 p-2.5 rounded-xl border border-[#E4D9C5]/50">
            {report.englishTranslation
              ? `“${report.englishTranslation}”`
              : report.translationStatus === 'pending'
                ? 'Translation pending…'
                : report.translationStatus === 'unavailable'
                  ? 'Translation unavailable.'
                  : report.language === 'en'
                    ? `“${report.text}”`
                    : 'English translation not available.'}
          </p>
        </div>
      </div>

      {/* Flags & people at risk */}
      <div className="flex items-center gap-2 flex-wrap text-[10.5px] font-mono text-[#7A6A5A] mb-2.5">
        {report.peopleAtRisk && (
          <span className="flex items-center gap-1 text-[#3A2E26] font-bold px-2 py-0.5 rounded bg-[#FAF6EE] border border-[#E4D9C5]">
            <Users className="w-3 h-3 text-[#B0623A]" />
            {report.peopleAtRisk} at risk
          </span>
        )}

        {report.flags?.map(flag => (
          <span
            key={flag}
            className="px-2 py-0.5 rounded-full bg-[#FAF6EE] text-[#7A6A5A] border border-[#E4D9C5] text-[10px]"
          >
            #{flag}
          </span>
        ))}
      </div>

      {/* Credibility Meter Bar */}
      <div className="pt-2 border-t border-[#E4D9C5]/60">
        <CredibilityMeter
          score={report.credibility ?? report.credibilityScore ?? 0.50}
          reasons={report.credibilityReasons || (report.credibilityExplanation ? [report.credibilityExplanation] : [])}
          isUnverified={isUnverified}
        />
      </div>
    </div>
  );
};
