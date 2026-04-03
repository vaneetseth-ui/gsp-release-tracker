/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        rc: {
          blue:   '#0F4C9E',
          navy:   '#0A2D5E',
          orange: '#FF6600',
        },
        bud: {
          navy: '#0a0e27',
          teal: '#0ea5c6',
          purple: '#7c3aed',
          orange: '#ea580c',
          green: '#059669',
          mist: '#f6f8fb',
        },
        surface: {
          page: '#F8FAFC',
          card: '#FFFFFF',
          muted: '#F1F5F9',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -8px rgba(15, 23, 42, 0.08)',
        panel: '0 0 0 1px rgba(15, 23, 42, 0.06), -12px 0 40px -16px rgba(15, 23, 42, 0.12)',
      },
    },
  },
  plugins: [],
};
