import * as SecureStore from 'expo-secure-store'

export const secureStorage = {
  get: async (key: string) => SecureStore.getItemAsync(key),
  set: async (key: string, value: string) => SecureStore.setItemAsync(key, value),
  delete: async (key: string) => SecureStore.deleteItemAsync(key),
}

export const StorageKeys = {
  BIOMETRIC_CREDENTIALS: 'biometric-credentials',
}
