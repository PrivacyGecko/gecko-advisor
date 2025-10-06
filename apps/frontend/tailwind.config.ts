import type { Config } from 'tailwindcss';

/**
 * Privacy Advisor Design System
 *
 * Semantic color system based on privacy risk levels:
 * - Safe (70-100): Green palette for low privacy risk
 * - Caution (40-69): Amber palette for medium privacy risk
 * - Danger (0-39): Red palette for high privacy risk
 *
 * All colors meet WCAG AA contrast requirements
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand colors
        'privacy-advisor': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0e6fff', // security-blue
          600: '#0c5ce6',
          700: '#0a4fc2',
          800: '#08429f',
          900: '#06357d',
        },

        // Privacy score system - WCAG AA compliant
        'privacy': {
          // Safe range (70-100) - Green palette
          safe: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#16a34a', // Primary safe color
            600: '#15803d',
            700: '#166534',
            800: '#14532d',
            900: '#052e16',
          },

          // Caution range (40-69) - Amber palette
          caution: {
            50: '#fffbeb',
            100: '#fef3c7',
            200: '#fde68a',
            300: '#fcd34d',
            400: '#fbbf24',
            500: '#f59e0b', // Primary caution color
            600: '#d97706',
            700: '#b45309',
            800: '#92400e',
            900: '#78350f',
          },

          // Danger range (0-39) - Red palette
          danger: {
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#ef4444', // Primary danger color
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d',
          },
        },

        // Severity indicators - accessible color coding
        severity: {
          low: {
            bg: '#f1f5f9',    // slate-100
            text: '#475569',  // slate-600
            border: '#cbd5e1', // slate-300
          },
          medium: {
            bg: '#fef3c7',    // amber-100
            text: '#92400e',  // amber-800
            border: '#fbbf24', // amber-400
          },
          high: {
            bg: '#fee2e2',    // red-100
            text: '#991b1b',  // red-800
            border: '#f87171', // red-400
          },
        },

        // Legacy color aliases for backwards compatibility
        'pricko-green': '#19c37d',
        'security-blue': '#0e6fff',
        danger: '#ef4444',
        warning: '#f59e0b',
        safe: '#16a34a',
      },

      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji'
        ],
        mono: [
          'SF Mono',
          'Monaco',
          'Inconsolata',
          'Roboto Mono',
          'Consolas',
          'Liberation Mono',
          'Menlo',
          'Courier',
          'monospace'
        ],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }], // 10px
      },

      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },

      boxShadow: {
        'privacy': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'privacy-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'privacy-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },

      animation: {
        'score-fill': 'score-fill 1.5s ease-out forwards',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },

      keyframes: {
        'score-fill': {
          '0%': { strokeDashoffset: '251.2' },
          '100%': { strokeDashoffset: 'var(--target-offset)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
      },

      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },

      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },

      // Screen reader only utility
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [
    // Custom plugin for accessibility utilities
    function({ addUtilities }: { addUtilities: any }) {
      const newUtilities = {
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: '0',
        },
        '.not-sr-only': {
          position: 'static',
          width: 'auto',
          height: 'auto',
          padding: '0',
          margin: '0',
          overflow: 'visible',
          clip: 'auto',
          whiteSpace: 'normal',
        },
        '.focus-visible-ring': {
          '&:focus-visible': {
            outline: '2px solid transparent',
            outlineOffset: '2px',
            boxShadow: '0 0 0 2px #0e6fff',
          },
        },
      };

      addUtilities(newUtilities);
    },
  ],
} satisfies Config;

