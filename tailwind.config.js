/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand colors
        primary: '#6C5CE7',
        'primary-dark': '#5A4BC5',
        'primary-light': '#A29BFE',
        secondary: '#00CEC9',
        accent: '#FD79A8',
        gold: '#FDCB6E',
        // Background shades
        bg: '#0A0A0F',
        'bg-card': '#13131A',
        'bg-surface': '#1A1A24',
        'bg-elevated': '#22222E',
        // Text
        'text-primary': '#FFFFFF',
        'text-secondary': '#A0A0B0',
        'text-muted': '#60607A',
        // Status
        success: '#00B894',
        warning: '#FDCB6E',
        danger: '#D63031',
        info: '#74B9FF',
        // XP / levels
        xp: '#6C5CE7',
        legendary: '#FFD700',
        epic: '#9B59B6',
        rare: '#3498DB',
      },
      fontFamily: {
        sans: ['Inter', 'System'],
        mono: ['SpaceMono', 'Courier'],
      },
    },
  },
  plugins: [],
};
