/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ENTANGLE Design System: StatBlock Component
 * Big confident number in Inter Tight with a small muted uppercase label.
 */

import React from 'react';

export interface StatBlockProps {
  value: string | number;
  label: string;
  subtext?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  variant?: 'card' | 'inline' | 'hero';
  className?: string;
}

export const StatBlock: React.FC<StatBlockProps> = ({
  value,
  label,
  subtext,
  trend,
  variant = 'card',
  className = '',
}) => {
  const containerClasses = {
    card: 'p-4 rounded-[20px] bg-[#FFFDF8] border border-[#E4D9C5] shadow-[0_1px_2px_rgba(58,46,38,0.06)]',
    inline: 'p-2',
    hero: 'p-5 rounded-[20px] bg-[#FFFDF8]/90 backdrop-blur-xs border border-[#E4D9C5] shadow-[0_1px_2px_rgba(58,46,38,0.06)]',
  };

  const numberClasses = {
    card: 'text-3xl sm:text-4xl',
    inline: 'text-2xl',
    hero: 'text-4xl sm:text-5xl text-[#3A2E26]',
  };

  return (
    <div className={`${containerClasses[variant]} flex flex-col justify-between ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`font-heading font-extrabold tracking-tight text-[#3A2E26] ${numberClasses[variant]}`}
        >
          {value}
        </span>
        {trend && (
          <span
            className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
              trend.isPositive ? 'bg-[#E3EDDF] text-[#3D5939]' : 'bg-[#F6DDD6] text-[#7A1C0E]'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      <div className="mt-1">
        <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-[#7A6A5A] block">
          {label}
        </span>
        {subtext && (
          <span className="text-[11px] text-[#7A6A5A]/80 mt-0.5 block leading-tight">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
};
