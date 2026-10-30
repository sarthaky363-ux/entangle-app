/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ENTANGLE Design System: Toast Component
 * Calm, editorial notification badge with gentle tone.
 */

import React from 'react';
import { CheckCircle2, Info, AlertTriangle, AlertOctagon, X } from 'lucide-react';

export interface ToastProps {
  id?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  title,
  message,
  onDismiss,
  className = '',
}) => {
  const configs = {
    info: {
      bg: 'bg-[#FFFDF8]',
      border: 'border-[#4F7C82]',
      icon: Info,
      iconColor: 'text-[#4F7C82]',
    },
    success: {
      bg: 'bg-[#FFFDF8]',
      border: 'border-[#5F7A61]',
      icon: CheckCircle2,
      iconColor: 'text-[#5F7A61]',
    },
    warning: {
      bg: 'bg-[#FFFDF8]',
      border: 'border-[#C77A24]',
      icon: AlertTriangle,
      iconColor: 'text-[#C77A24]',
    },
    error: {
      bg: 'bg-[#FFFDF8]',
      border: 'border-[#9E2F22]',
      icon: AlertOctagon,
      iconColor: 'text-[#9E2F22]',
    },
  };

  const current = configs[type];
  const Icon = current.icon;

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-[16px]
        ${current.bg} border-2 ${current.border}
        shadow-[0_8px_24px_rgba(58,46,38,0.1)]
        max-w-md w-full
        ${className}
      `}
      role="alert"
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${current.iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-heading font-bold text-xs text-[#3A2E26] tracking-tight">
            {title}
          </h4>
        )}
        <p className="text-xs text-[#7A6A5A] mt-0.5 leading-relaxed">
          {message}
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-[#7A6A5A] hover:text-[#3A2E26] p-1 rounded-full hover:bg-[#F2EBDD] transition-colors shrink-0"
          aria-label="Dismiss message"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
