/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ENTANGLE Design System: Card Component
 * Surface background (#FFFDF8), 1px border (#E4D9C5), 20px radius, soft shadow (0 1px 2px rgba(58,46,38,0.06)).
 */

import React, { HTMLAttributes, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'sunken' | 'canvas';
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'surface', interactive = false, className = '', children, ...props }, ref) => {
    const bgClasses = {
      surface: 'bg-[#FFFDF8]',
      sunken: 'bg-[#F2EBDD]',
      canvas: 'bg-[#FAF6EE]',
    };

    const interactiveClasses = interactive
      ? 'cursor-pointer hover:shadow-[0_4px_12px_rgba(58,46,38,0.08)] hover:border-[#D8CCB5] transition-all duration-150 active:scale-[0.99]'
      : '';

    return (
      <div
        ref={ref}
        className={`
          ${bgClasses[variant]}
          border border-[#E4D9C5]
          rounded-[20px]
          shadow-[0_1px_2px_rgba(58,46,38,0.06)]
          ${interactiveClasses}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`p-5 pb-3 border-b border-[#E4D9C5] ${className}`} {...props}>
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', children, ...props }, ref) => (
    <h3
      ref={ref}
      className={`font-heading font-bold text-base text-[#3A2E26] tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className = '', children, ...props }, ref) => (
    <p ref={ref} className={`text-xs text-[#7A6A5A] mt-0.5 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`p-5 pt-3 border-t border-[#E4D9C5] ${className}`} {...props}>
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';
