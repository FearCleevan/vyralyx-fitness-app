export const Colors = {
  primary: '#6C5CE7',
  primaryDark: '#5A4BC5',
  primaryLight: '#A29BFE',
  secondary: '#00CEC9',
  accent: '#FD79A8',
  gold: '#FDCB6E',

  bg: '#0A0A0F',
  bgCard: '#13131A',
  bgSurface: '#1A1A24',
  bgElevated: '#22222E',

  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textMuted: '#60607A',

  success: '#00B894',
  warning: '#FDCB6E',
  danger: '#D63031',
  info: '#74B9FF',

  border: '#2A2A3A',
  borderLight: '#333348',

  gradient: {
    primary: ['#6C5CE7', '#A29BFE'] as [string, string],
    fire: ['#FF6B35', '#F7C59F'] as [string, string],
    ocean: ['#00CEC9', '#74B9FF'] as [string, string],
    gold: ['#FDCB6E', '#E17055'] as [string, string],
    dark: ['#13131A', '#0A0A0F'] as [string, string],
  },
} as const;
