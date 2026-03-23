/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        rc: {
          blue:   '#0F4C9E',
          navy:   '#0A2D5E',
          orange: '#FF6600',
        },
      },
    },
  },
  plugins: [],
};
