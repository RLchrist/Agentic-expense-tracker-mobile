import { create } from 'zustand'
import { createMMKV } from 'react-native-mmkv'

export const storage = createMMKV({ id: 'app-settings' })

interface SettingsState {
  isBiometricEnabled: boolean
  theme: 'light' | 'dark' | 'system'
  language: string
  isOnboardingComplete: boolean
  setBiometricEnabled: (enabled: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLanguage: (lang: string) => void
  setOnboardingComplete: (complete: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  isBiometricEnabled: storage.getBoolean('isBiometricEnabled') ?? false,
  theme: (storage.getString('theme') as 'light' | 'dark' | 'system') ?? 'dark',
  language: storage.getString('language') ?? 'en',
  isOnboardingComplete: storage.getBoolean('onboarding_complete') ?? false,
  
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
  setOnboardingComplete: (complete) => {
    storage.set('onboarding_complete', complete)
    set({ isOnboardingComplete: complete })
  },
}))
