/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: '#0c1222',
        surface: '#141c2e',
        surfaceElevated: '#1a2540',
        border: '#243049',
        text: '#e8eef4',
        textMuted: '#8b9cb8',
        primary: '#14b8a6',
        primaryHover: '#0d9488',
        accent: '#f59e0b',
        success: '#22c55e',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
}
