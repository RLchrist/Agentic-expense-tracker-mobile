import { create } from 'zustand'
import { createMMKV } from 'react-native-mmkv'

const storage = createMMKV({ id: 'app-settings' })

interface SettingsState {
  isBiometricEnabled: boolean
  theme: 'light' | 'dark' | 'system'
  language: string
  setBiometricEnabled: (enabled: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLanguage: (lang: string) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  isBiometricEnabled: storage.getBoolean('isBiometricEnabled') ?? false,
  theme: (storage.getString('theme') as 'light' | 'dark' | 'system') ?? 'dark',
  language: storage.getString('language') ?? 'en',
  
  setBiometricEnabled: (enabled) => {
    storage.set('isBiometricEnabled', enabled)
    set({ isBiometricEnabled: enabled })
  },
  setTheme: (theme) => {
    storage.set('theme', theme)
    set({ theme })
  },
  setLanguage: (lang) => {
    storage.set('language', lang)
    set({ language: lang })
  },
}))
