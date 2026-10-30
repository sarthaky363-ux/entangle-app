/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ENTANGLE Design System: TimelineItem Component
 * Shows timestamp, actor badge, short action sentence, and expandable payload detail.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, User, Bot, Shield, AlertOctagon } from 'lucide-react';

export interface TimelineItemProps {
  id?: string;
  timestamp: number | string;
  actor: string;
  summary: string;
  eventType?: string;
  detail?: string | Record<string, any>;
  isLast?: boolean;
  className?: string;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({
  timestamp,
  actor,
  summary,
  eventType,
  detail,
  isLast = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedTime =
    typeof timestamp === 'number'
      ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : timestamp;

  const isHuman = actor.toLowerCase().includes('human');
  const isKill = summary.toLowerCase().includes('kill') || actor.toLowerCase().includes('freeze');

  const getActorBadge = () => {
    if (isKill) {
      return {
        bg: 'bg-[#F6DDD6]',
        border: 'border-[#B8412F]',
        text: 'text-[#7A1C0E]',
        label: actor,
        icon: AlertOctagon,
      };
    }
    if (isHuman) {
      return {
        bg: 'bg-[#E3EDDF]',
        border: 'border-[#6E8F6A]',
        text: 'text-[#3D5939]',
        label: actor,
        icon: User,
      };
    }
    return {
      bg: 'bg-[#FAF6EE]',
      border: 'border-[#4F7C82]/30',
      text: 'text-[#4F7C82]',
      label: actor,
      icon: Bot,
    };
  };

  const badge = getActorBadge();
  const Icon = badge.icon;

  return (
    <div className={`relative flex gap-3.5 ${className}`}>
      {/* Left Timeline Spine */}
      <div className="flex flex-col items-center">
        <div
          className={`w-7 h-7 rounded-full border ${badge.bg} ${badge.border} ${badge.text} flex items-center justify-center shrink-0 z-10 shadow-[0_1px_2px_rgba(58,46,38,0.06)]`}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
        {!isLast && <div className="w-[1.5px] bg-[#E4D9C5] flex-1 my-1" />}
      </div>

      {/* Right Content Block */}
      <div className="flex-1 pb-4">
        <div className="p-3.5 rounded-[16px] bg-[#FFFDF8] border border-[#E4D9C5] shadow-[0_1px_2px_rgba(58,46,38,0.04)]">
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.border} ${badge.text} uppercase tracking-wider`}
              >
                {badge.label}
              </span>
              <span className="font-mono text-[11px] text-[#7A6A5A]">
                {formattedTime}
              </span>
              {eventType && (
                <span className="font-mono text-[9px] text-[#7A6A5A]">
                  {eventType.replaceAll('_', ' ')}
                </span>
              )}
            </div>

            {detail && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Hide' : 'Show'} event payload`}
                className="text-[11px] font-medium text-[#5F7A61] hover:text-[#4D664F] flex items-center gap-0.5 cursor-pointer select-none"
              >
                <span>{isExpanded ? 'Less' : 'Details'}</span>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          <p className="text-xs text-[#3A2E26] leading-relaxed font-sans">
            {summary}
          </p>

          {/* Expandable Detail View */}
          {detail && isExpanded && (
            <div className="mt-2.5 pt-2.5 border-t border-[#E4D9C5] text-[11px] font-mono">
              {typeof detail === 'string' ? (
                <p className="text-[#7A6A5A] whitespace-pre-wrap">{detail}</p>
              ) : (
                <pre className="p-2.5 rounded-xl bg-[#FAF6EE] border border-[#E4D9C5] overflow-x-auto text-[#3A2E26]">
                  {JSON.stringify(detail, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
