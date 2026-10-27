/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0F1115',
        surface: '#171A21',
        secondary: '#20242D',
        tertiary: '#282E3B',
        'surface-border': '#29303D',
        'border-subtle': '#222834',
        text: '#F5F7FA',
        muted: '#9AA3B2',
        accent: {
          DEFAULT: '#7C5CFC',
          hover: '#6E4DF5',
          light: '#967DFF',
          dark: '#5838DF',
          subtle: 'rgba(124, 92, 252, 0.15)',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: ['Segoe UI Variable Text', 'Segoe UI', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Cascadia Code', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'floating': '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 20px rgba(124, 92, 252, 0.15)',
        'glow': '0 0 15px rgba(124, 92, 252, 0.35)',
      },
      backdropBlur: {
        'acrylic': '24px',
      },
    },
  },
  plugins: [],
}
