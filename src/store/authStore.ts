import { create } from 'zustand'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../services/supabase/client'
import { Profile } from '../types'
import { clearExpenseCache } from './expenseStore'
import { clearBudgetCache } from './budgetStore'
import * as SQLite from 'expo-sqlite'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  signOut: () => Promise<void>
  fetchProfile: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,
      isLoading: false,
    })
    if (session) {
      get().fetchProfile()
    }
  },

  setProfile: (profile) => set({ profile }),

  fetchProfile: async () => {
    const { user } = get()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) set({ profile: data })
  },

  updateProfile: async (updates) => {
    const { user, profile } = get()
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    
    if (!error && data) {
      set({ profile: data })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()

    // Clear all MMKV caches
    clearExpenseCache()
    clearBudgetCache()

    // Clear the SQLite offline queue
    try {
      const db = await SQLite.openDatabaseAsync('expense_tracker_queue.db')
      await db.execAsync('DELETE FROM outbox_queue')
    } catch (e) {
      console.warn('Failed to clear offline queue:', e)
    }

    set({ session: null, user: null, profile: null, isAuthenticated: false })
  },
}))