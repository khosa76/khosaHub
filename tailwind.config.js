/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.html",
    "./subjects/**/*.html",
    "./src/**/*.{js,ts,jsx,tsx,css}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          bg: '#fbfbfd',
          surface: '#f5f5f7',
          card: 'rgba(255, 255, 255, 0.75)',
          dark: '#1d1d1f',
          gray: '#86868b',
          lightgray: '#f2f2f7',
          blue: '#0066cc',
          hoverblue: '#0052a3',
          purple: '#6e56cf',
          emerald: '#10b981',
          gold: '#d97706',
          border: 'rgba(0, 0, 0, 0.08)',
        },
        'ink-blue': '#0066cc',
        'ink-dark': '#1d1d1f',
        'paper-bg': '#ffffff',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'Roboto', 'sans-serif'],
        kalam: ["'Kalam'", 'cursive', 'sans-serif'],
        caveat: ["'Caveat'", 'cursive', 'sans-serif'],
        patrick: ["'Patrick Hand'", 'cursive', 'sans-serif'],
      },
      boxShadow: {
        'apple-glass': '0 8px 30px rgba(0, 0, 0, 0.04)',
        'apple-hover': '0 20px 40px rgba(0, 0, 0, 0.08), 0 0 20px rgba(0, 102, 204, 0.15)',
        'glow-blue': '0 0 30px rgba(0, 102, 204, 0.25)',
        'glow-purple': '0 0 30px rgba(110, 86, 207, 0.25)',
      },
      backdropBlur: {
        '2xl': '40px',
      }
    },
  },
  plugins: [],
}
