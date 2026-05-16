import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as RNLocalize from 'react-native-localize'
import AsyncStorage from '@react-native-async-storage/async-storage'

import en from './assets/lang/en.json'
import np from './assets/lang/ne.json'

const resources = {
  en: { translation: en },
  np: { translation: np },
}

const LANGUAGE_KEY = 'appLang'

const languageDetector: any = {
  type: 'languageDetector',
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      const storedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY)
      if (storedLanguage) return callback(storedLanguage)
    } catch {}
    const locales = RNLocalize.getLocales()
    const deviceLang = locales[0]?.languageCode
    callback(deviceLang === 'ne' ? 'np' : 'en')
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    await AsyncStorage.setItem(LANGUAGE_KEY, language)
  },
}

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

export const changeLang = async (lang: string) => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang)
  i18n.changeLanguage(lang)
}

export default i18n
