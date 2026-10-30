/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ENTANGLE Design System Tokens: "Clay & Sage"
 * Editorial, calm, high-contrast disaster coordination palette.
 */

export const THEME_TOKENS = {
  colors: {
    // Canvas & Surfaces
    canvas: '#FAF6EE',
    surface: '#FFFDF8',
    surfaceSunken: '#F2EBDD',
    border: '#E4D9C5',
    
    // Typography
    ink: '#3A2E26',
    inkMuted: '#7A6A5A',
    
    // Brand & Semantic
    primary: '#5F7A61',        // Sage
    primaryHover: '#4D664F',
    agent: '#4F7C82',          // Deep Teal
    agentHover: '#3F656A',
    clay: '#B0623A',           // Warm Terracotta Clay
    clayHover: '#98532F',
    kill: '#9E2F22',           // Emergency Kill Switch Red
    killHover: '#84261B',
    
    // Severity Scales (tint for pill/bg, base for icon/border, text for high contrast)
    severity: {
      critical: {
        base: '#B8412F',
        tint: '#F6DDD6',
        text: '#7A1C0E',
      },
      high: {
        base: '#C77A24',
        tint: '#F8E6CC',
        text: '#844B0B',
      },
      medium: {
        base: '#B89A2E',
        tint: '#F5EBC4',
        text: '#705C11',
      },
      low: {
        base: '#6E8F6A',
        tint: '#E3EDDF',
        text: '#3D5939',
      },
    },

    // Agent States
    agentState: {
      idle: '#7A6A5A',
      thinking: '#4F7C82',
      waitingHuman: '#C77A24',
      frozen: '#9E2F22',
    },
  },

  fonts: {
    heading: '"Inter Tight", sans-serif',
    body: '"Inter", sans-serif',
    mono: '"JetBrains Mono", monospace',
  },

  radius: {
    card: '20px',
    pill: '9999px',
    subtle: '12px',
    input: '14px',
  },

  shadows: {
    card: '0 1px 2px rgba(58, 46, 38, 0.06)',
    cardHover: '0 4px 12px rgba(58, 46, 38, 0.08)',
    modal: '0 16px 36px rgba(58, 46, 38, 0.16)',
  },

  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    6: '24px',
    8: '32px',
    12: '48px',
  },
} as const;

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type AgentStateKind = 'idle' | 'thinking' | 'waiting' | 'frozen';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
