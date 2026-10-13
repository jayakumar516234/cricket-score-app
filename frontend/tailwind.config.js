/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#050f1f', 900: '#0a1a33', 800: '#10264a', 700: '#183462', 600: '#24457c' },
        pitch: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
};
