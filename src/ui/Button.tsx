/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ENTANGLE Design System: Button Component
 * Variants: primary (sage fill, cream text), secondary (outline, ink), ghost, danger (kill).
 * Non-negotiables: Pill-shaped, 44px minimum height, visible focus ring in the agent colour (#4F7C82).
 */

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { ButtonSize, ButtonVariant } from '../theme/tokens.ts';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      leftIcon,
      rightIcon,
      isLoading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    // Base styles: Pill-shaped, 44px minimum height, focus ring in agent color (#4F7C82)
    const baseClasses =
      'inline-flex items-center justify-center font-heading font-semibold rounded-full min-h-[44px] transition-all duration-150 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4F7C82] focus:ring-offset-2 focus:ring-offset-[#FAF6EE] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

    // Variant definitions
    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-[#5F7A61] text-[#FFFDF8] hover:bg-[#4D664F] active:bg-[#3E5240] shadow-[0_1px_2px_rgba(58,46,38,0.08)] border border-transparent',
      secondary:
        'bg-[#FFFDF8] text-[#3A2E26] border border-[#E4D9C5] hover:bg-[#F2EBDD] hover:border-[#D8CCB5] active:bg-[#EAE0D0] shadow-[0_1px_2px_rgba(58,46,38,0.04)]',
      ghost:
        'bg-transparent text-[#3A2E26] hover:bg-[#F2EBDD] hover:text-[#3A2E26] active:bg-[#EAE0D0]',
      danger:
        'bg-[#9E2F22] text-[#FFFDF8] hover:bg-[#84261B] active:bg-[#6D1F16] shadow-[0_1px_2px_rgba(58,46,38,0.12)] border border-transparent',
    };

    // Size definitions (ensuring 44px min height across sizes)
    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'text-xs px-4 py-2 gap-1.5 min-h-[44px]',
      md: 'text-sm px-5 py-2.5 gap-2 min-h-[44px]',
      lg: 'text-base px-6 py-3 gap-2.5 min-h-[48px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          ${baseClasses}
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
