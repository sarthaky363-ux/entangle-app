/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ENTANGLE Design System: SeverityBadge Component
 * Non-negotiables:
 * - Tint background + solid text + icon + label text. Never colour alone!
 * - Critical: octagon alert (AlertOctagon)
 * - High: triangle alert (AlertTriangle)
 * - Medium: circle-dot (CircleDot)
 * - Low: check-circle (CheckCircle2)
 */

import React from 'react';
import { AlertOctagon, AlertTriangle, CircleDot, CheckCircle2 } from 'lucide-react';
import { SeverityLevel } from '../theme/tokens.ts';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  size = 'md',
  className = '',
  showIcon = true,
}) => {
  const configs = {
    critical: {
      bg: 'bg-[#F6DDD6]',
      border: 'border-[#B8412F]',
      text: 'text-[#7A1C0E]',
      icon: AlertOctagon,
      label: 'Critical',
    },
    high: {
      bg: 'bg-[#F8E6CC]',
      border: 'border-[#C77A24]',
      text: 'text-[#844B0B]',
      icon: AlertTriangle,
      label: 'High',
    },
    medium: {
      bg: 'bg-[#F5EBC4]',
      border: 'border-[#B89A2E]',
      text: 'text-[#705C11]',
      icon: CircleDot,
      label: 'Medium',
    },
    low: {
      bg: 'bg-[#E3EDDF]',
      border: 'border-[#6E8F6A]',
      text: 'text-[#3D5939]',
      icon: CheckCircle2,
      label: 'Low',
    },
  };

  const current = configs[severity] || configs.low;
  const Icon = current.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1 font-mono font-bold tracking-wider',
    md: 'text-xs px-3 py-1 gap-1.5 font-mono font-bold tracking-wider',
    lg: 'text-sm px-4 py-1.5 gap-2 font-mono font-bold tracking-wider',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full border
        ${current.bg} ${current.border} ${current.text}
        ${sizeClasses[size]}
        uppercase select-none
        ${className}
      `}
      title={`Severity Level: ${current.label}`}
    >
      {showIcon && <Icon className={`${iconSizes[size]} shrink-0`} />}
      <span>{current.label}</span>
    </span>
  );
};
