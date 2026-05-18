/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#dfa855',
        primaryLight: '#ecc387',
        primaryDark: '#b77d2b',
        secondary: '#FF6B6B',
        success: '#4ECDC4',
        warning: '#FFE66D',
        error: '#FF4757',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: 'hsl(var(--surface))',
        'surface-light': 'hsl(var(--surface-light))',
        surfaceLight: 'hsl(var(--surface-light))',
        border: 'hsl(var(--border))',
        text: 'hsl(var(--foreground))',
        textSecondary: 'hsl(var(--text-secondary))',
        'text-secondary': 'hsl(var(--text-secondary))',
        card: 'hsl(var(--card))',
      },
    },
  },
  plugins: [],
}
