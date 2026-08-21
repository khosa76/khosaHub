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
        'ink-blue': '#1e3a8a',
        'ink-dark': '#0f172a',
        'ink-black': '#1e293b',
        'paper-bg': '#fffdf8',
        'desk-bg': '#f8fafc',
        'accent-gold': '#d97706',
        'accent-yellow': '#fef08a',
        'accent-pink': '#fbcfe8',
      },
      fontFamily: {
        patrick: ["'Patrick Hand'", 'cursive', 'sans-serif'],
        kalam: ["'Kalam'", 'cursive', 'sans-serif'],
        caveat: ["'Caveat'", 'cursive', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'paper': '0 10px 30px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
        'float': '0 12px 24px -6px rgba(30, 58, 138, 0.15)',
      }
    },
  },
  plugins: [],
}
