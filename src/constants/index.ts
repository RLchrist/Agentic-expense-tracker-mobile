export const COLORS = {
  primary: '#dfa855',
  primaryLight: '#ecc387',
  primaryDark: '#b77d2b',
  secondary: '#FF6B6B',
  success: '#4ECDC4',
  warning: '#FFE66D',
  error: '#FF4757',
  background: '#121318',
  surface: '#1C1D24',
  surfaceLight: '#282A34',
  text: '#FFFFFF',
  textSecondary: '#A3A6B4',
  border: '#2A2C37',
  white: '#FFFFFF',
  black: '#000000',
}

export function themeColors(isDark: boolean) {
  return {
    primary: '#dfa855',
    primaryLight: '#ecc387',
    primaryDark: '#b77d2b',
    secondary: '#FF6B6B',
    success: '#4ECDC4',
    warning: '#FFE66D',
    error: '#FF4757',
    white: '#FFFFFF',
    black: '#000000',
    background: isDark ? '#121318' : '#FAF7F2',
    surface: isDark ? '#1C1D24' : '#FFFFFF',
    surfaceLight: isDark ? '#282A34' : '#F3EFE9',
    text: isDark ? '#FFFFFF' : '#1C1C28',
    textSecondary: isDark ? '#A3A6B4' : '#8A8E9B',
    border: isDark ? '#2A2C37' : '#EBE5DC',
  }
}

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
}

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const PAYMENT_METHODS = [
  { label: 'Cash', value: 'cash', icon: '💵' },
  { label: 'Card', value: 'card', icon: '💳' },
  { label: 'DigitalWallet', value: 'digital_wallet', icon: '📱' },
  { label: 'Bank Transfer', value: 'bank_transfer', icon: '🏦' },
  { label: 'Other', value: 'other', icon: '📦' },
]

export const STORAGE_KEYS = {
  session: 'supabase-session',
  offlineQueue: 'offline-queue',
  lastSync: 'last-sync-time',
}
