import { create } from 'zustand'

interface SettingsState {
  isBiometricEnabled: boolean
  theme: 'light' | 'dark' | 'system'
  language: string
  setBiometricEnabled: (enabled: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLanguage: (lang: string) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  isBiometricEnabled: false,
  theme: 'dark',
  language: 'en',
  setBiometricEnabled: (enabled) => set({ isBiometricEnabled: enabled }),
  setTheme: (theme) => set({ theme }),
  setLanguage: (lang) => set({ language: lang }),
}))
