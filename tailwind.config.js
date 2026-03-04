/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        drift: {
          50: '#f8f7f3',
          100: '#f1eee8',
          200: '#e3ddd3',
          300: '#cbc2b4',
          400: '#a89d8b',
          500: '#887c6a',
          600: '#6d6456',
          700: '#575145',
          800: '#47433a',
          900: '#39362f'
        }
      },
      boxShadow: {
        soft: '0 8px 30px rgba(72, 65, 53, 0.08)',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
