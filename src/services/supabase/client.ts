import { createClient } from '@supabase/supabase-js'
import { createMMKV } from 'react-native-mmkv'

const storage = createMMKV({ id: 'supabase-storage' })

const MMKVStorage = {
  getItem: (key: string): string | null => {
    const value = storage.getString(key)
    return value ?? null
  },
  setItem: (key: string, value: string): void => {
    storage.set(key, value)
  },
  removeItem: (key: string): void => {
    storage.remove(key)
  },
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: MMKVStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})