/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ENTANGLE Design System: EmptyState Component
 * Calm, editorial placeholder when no active items or selections exist.
 */

import React from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';
import { Button } from './Button.tsx';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Sparkles,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`
        p-8 sm:p-12 text-center rounded-[20px] bg-[#FFFDF8] border border-[#E4D9C5]
        flex flex-col items-center justify-center
        ${className}
      `}
    >
      <div className="w-12 h-12 rounded-full bg-[#FAF6EE] border border-[#E4D9C5] flex items-center justify-center text-[#7A6A5A] mb-3.5 shadow-[0_1px_2px_rgba(58,46,38,0.04)]">
        <Icon className="w-6 h-6 text-[#5F7A61]" />
      </div>

      <h3 className="font-heading font-bold text-base text-[#3A2E26] tracking-tight">
        {title}
      </h3>

      <p className="text-xs text-[#7A6A5A] max-w-sm mt-1.5 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
