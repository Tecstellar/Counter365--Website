/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#FF5F00',
          orangeHover: '#EA580C',
          orangeLight: '#FFF0E6',
          orangeBorder: '#FED7AA',
          bg: '#FAF8F5',
          cream: '#FDFDF1',
          black: '#111111',
          card: '#FFFFFF',
          border: '#EBE7E1',
          muted: '#76716B',
        },
      },
      fontFamily: {
        heading: ['Jost', 'Noto Sans Tamil', 'sans-serif'],
        body: ['Lexend', 'Noto Sans Tamil', 'sans-serif'],
        forum: ['Forum', 'serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
        card: '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
