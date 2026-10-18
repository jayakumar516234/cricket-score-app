/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060d1b',
          900: '#0a172e',
          850: '#0f2040',
          800: '#142a53',
          700: '#1e3c75',
          600: '#2b529d',
        },
        pitch: {
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
        },
        cricket: {
          gold: '#f59e0b',
          amber: '#d97706',
          red: '#dc2626',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
      boxShadow: {
        '2xs': '0 1px 1px 0 rgb(0 0 0 / 0.03)',
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'glow-pitch': '0 0 16px -2px rgba(16, 185, 129, 0.35)',
        'glow-blue': '0 0 16px -2px rgba(59, 130, 246, 0.35)',
      },
    },
  },
  plugins: [],
};
