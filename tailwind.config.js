/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        rc: {
          blue:   '#0F4C9E',
          navy:   '#0A2D5E',
          orange: '#FF6600',
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
