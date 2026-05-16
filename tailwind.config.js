/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#6C63FF',
        primaryLight: '#8B85FF',
        primaryDark: '#4B44CC',
        secondary: '#FF6B6B',
        success: '#4ECDC4',
        warning: '#FFE66D',
        error: '#FF4757',
        background: '#0F0F1A',
        surface: '#1A1A2E',
        surfaceLight: '#252540',
        text: '#FFFFFF',
        textSecondary: '#A0A0B0',
        border: '#2A2A4A',
      },
    },
  },
  plugins: [],
}
