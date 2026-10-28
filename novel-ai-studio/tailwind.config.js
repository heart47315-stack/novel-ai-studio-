/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans Thai"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        blush: '#fff4fa',
        lilac: '#f1eaff',
        orchid: '#8b5cf6',
        berry: '#d9468f',
      },
      boxShadow: {
        soft: '0 16px 45px rgba(123, 83, 153, 0.10)',
      },
    },
  },
  plugins: [],
}