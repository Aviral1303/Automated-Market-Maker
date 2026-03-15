/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg:              '#080b14',
        surface:         '#0e1420',
        surfaceElevated: '#141d2e',
        surfaceHover:    '#1a2540',
        border:          'rgba(255,255,255,0.07)',
        borderActive:    'rgba(20,184,166,0.4)',
        text:            '#e2e8f0',
        textMuted:       '#64748b',
        textDim:         '#475569',
        primary:         '#14b8a6',
        primaryHover:    '#0d9488',
        primaryGlow:     'rgba(20,184,166,0.15)',
        accent:          '#6366f1',
        accentHover:     '#4f46e5',
        accentGlow:      'rgba(99,102,241,0.15)',
        success:         '#10b981',
        successGlow:     'rgba(16,185,129,0.15)',
        danger:          '#ef4444',
        dangerGlow:      'rgba(239,68,68,0.15)',
        warning:         '#f59e0b',
        warningGlow:     'rgba(245,158,11,0.15)',
        gold:            '#fbbf24',
      },
      boxShadow: {
        card:   '0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)',
        glow:   '0 0 20px rgba(20,184,166,0.2)',
        accent: '0 0 20px rgba(99,102,241,0.2)',
        inner:  'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      backgroundImage: {
        'grid':         'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
        'gradient-primary': 'linear-gradient(135deg, #14b8a6, #6366f1)',
        'gradient-card': 'linear-gradient(135deg, rgba(20,184,166,0.05), rgba(99,102,241,0.05))',
      },
      backgroundSize: {
        'grid': '32px 32px',
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow':    'spin 3s linear infinite',
        'fade-in':      'fadeIn 0.2s ease-out',
        'slide-up':     'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                     to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
