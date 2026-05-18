export const COLORS = {
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
  white: '#FFFFFF',
  black: '#000000',
}

export function themeColors(isDark: boolean) {
  return {
    primary: '#6C63FF',
    primaryLight: '#8B85FF',
    primaryDark: '#4B44CC',
    secondary: '#FF6B6B',
    success: '#4ECDC4',
    warning: '#FFE66D',
    error: '#FF4757',
    white: '#FFFFFF',
    black: '#000000',
    background: isDark ? '#0F0F1A' : '#F8F9FA',
    surface: isDark ? '#1A1A2E' : '#FFFFFF',
    surfaceLight: isDark ? '#252540' : '#F0F2F5',
    text: isDark ? '#FFFFFF' : '#1C1C28',
    textSecondary: isDark ? '#A0A0B0' : '#6B7280',
    border: isDark ? '#2A2A4A' : '#E5E7EB',
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
