/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg:              '#000000',
        surface:         '#0a0a0a',
        surfaceElevated: '#111111',
        surfaceHover:    '#1a1a1a',
        border:          'rgba(255,255,255,0.08)',
        borderActive:    'rgba(255,255,255,0.25)',
        text:            '#ffffff',
        textMuted:       '#888888',
        textDim:         '#555555',
        primary:         '#ffffff',
        primaryHover:    '#e0e0e0',
        primaryGlow:     'rgba(255,255,255,0.06)',
        accent:          '#ffffff',
        accentHover:     '#e0e0e0',
        accentGlow:      'rgba(255,255,255,0.06)',
        success:         '#4ade80',
        successGlow:     'rgba(74,222,128,0.1)',
        danger:          '#f87171',
        dangerGlow:      'rgba(248,113,113,0.1)',
        warning:         '#fbbf24',
        warningGlow:     'rgba(251,191,36,0.1)',
        gold:            '#fbbf24',
      },
      boxShadow: {
        card:   '0 0 0 1px rgba(255,255,255,0.06)',
        glow:   '0 0 30px rgba(255,255,255,0.05)',
        inner:  'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #ffffff, #888888)',
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':      'fadeIn 0.15s ease-out',
        'slide-up':     'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                     to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
