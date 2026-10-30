/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ENTANGLE Design System: AgentChip Component
 * Shows agent name, a state dot (idle, thinking, waiting for human, frozen), and one-line role.
 */

import React from 'react';
import { AgentStateKind } from '../theme/tokens.ts';

export interface AgentChipProps {
  name: string;
  roleDescription?: string;
  state?: AgentStateKind;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const AgentChip: React.FC<AgentChipProps> = ({
  name,
  roleDescription,
  state = 'idle',
  isSelected = false,
  onClick,
  className = '',
}) => {
  const stateConfigs: Record<
    AgentStateKind,
    { label: string; dotClass: string; bgClass: string; textClass: string }
  > = {
    idle: {
      label: 'Idle',
      dotClass: 'bg-[#7A6A5A]',
      bgClass: 'bg-[#FAF6EE] text-[#7A6A5A]',
      textClass: 'text-[#7A6A5A]',
    },
    thinking: {
      label: 'Thinking',
      dotClass: 'bg-[#4F7C82] animate-pulse',
      bgClass: 'bg-[#4F7C82]/10 text-[#4F7C82]',
      textClass: 'text-[#4F7C82] font-semibold',
    },
    waiting: {
      label: 'Waiting for Human',
      dotClass: 'bg-[#C77A24] animate-ping',
      bgClass: 'bg-[#F8E6CC] text-[#844B0B]',
      textClass: 'text-[#844B0B] font-semibold',
    },
    frozen: {
      label: 'Frozen',
      dotClass: 'bg-[#8A8A86]',
      bgClass: 'bg-[#E8E6E0] text-[#66645F]',
      textClass: 'text-[#66645F] font-semibold',
    },
  };

  const current = stateConfigs[state];

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`
        p-3 rounded-[16px] border transition-all duration-150 text-left select-none
        ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4F7C82]' : ''}
        ${
          state === 'frozen'
            ? 'bg-[#E8E6E0] border-[#D2D0CA]'
            : isSelected
              ? 'bg-[#FFFDF8] border-2 border-[#5F7A61] shadow-[0_2px_8px_rgba(95,122,97,0.12)]'
              : 'bg-[#FFFDF8] border-[#E4D9C5] hover:bg-[#FAF6EE] hover:border-[#D8CCB5]'
        }
        ${className}
      `}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <h4 className="font-heading font-bold text-xs text-[#3A2E26] tracking-tight">
          {name}
        </h4>
        <div
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono ${current.bgClass}`}
          title={`Status: ${current.label}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dotClass}`} />
          <span>{current.label}</span>
        </div>
      </div>
      {roleDescription && (
        <p className="text-[11px] text-[#7A6A5A] leading-relaxed line-clamp-2">
          {roleDescription}
        </p>
      )}
    </div>
  );
};
