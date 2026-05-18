import { create } from 'zustand'
import { supabase } from '../services/supabase/client'
import { Expense, Category } from '../types'
import NetInfo from '@react-native-community/netinfo'
import { enqueue } from '../services/sync/offlineSync'
import { createMMKV } from 'react-native-mmkv'

const cacheStorage = createMMKV({ id: 'expense-cache' })
const CATEGORIES_CACHE_KEY = 'cached_categories'

interface ExpenseState {
  expenses: Expense[]
  categories: Category[]
  paymentMethods: { label: string; value: string; icon: string }[]
  isLoading: boolean
  error: string | null
  fetchExpenses: () => Promise<void>
  fetchCategories: () => Promise<void>
  addCategory: (category: { name: string; icon: string; color: string }) => Promise<Category | null>
  addPaymentMethod: (method: { label: string; icon: string }) => void
  addExpense: (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  getTotalByPeriod: (period: 'today' | 'week' | 'month') => number
}

const sanitizeExpensePayload = (payload: any) => {
  const allowedKeys = [
    'amount',
    'currency',
    'category_id',
    'title',
    'note',
    'receipt_url',
    'expense_date',
    'payment_method',
    'is_synced',
    'local_id',
    'user_id',
    'ai_parsed',
    'ai_confidence'
  ]
  const sanitized: any = {}
  for (const key of allowedKeys) {
    if (key in payload) {
      sanitized[key] = payload[key]
    }
  }
  return sanitized
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  categories: [],
  paymentMethods: (() => {
    try {
      const cached = cacheStorage.getString('custom_payment_methods')
      if (cached) return JSON.parse(cached)
    } catch {}
    return [
      { label: 'Cash', value: 'cash', icon: '💵' },
      { label: 'Card', value: 'card', icon: '💳' },
      { label: 'Digital Wallet', value: 'digital_wallet', icon: '📱' },
      { label: 'Bank Transfer', value: 'bank_transfer', icon: '🏦' },
      { label: 'Other', value: 'other', icon: '📦' },
    ]
  })(),
  isLoading: false,
  error: null,

  fetchExpenses: async () => {
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('expenses')
      .select('*, category:categories(*)')
      .order('expense_date', { ascending: false })
      .limit(100)
    if (error) set({ error: error.message })
    else set({ expenses: data ?? [] })
    set({ isLoading: false })
  },

  fetchCategories: async () => {
    // 1. Load from local cache immediately (instant, works offline)
    try {
      const cached = cacheStorage.getString(CATEGORIES_CACHE_KEY)
      if (cached) {
        const parsed: Category[] = JSON.parse(cached)
        if (parsed.length > 0) set({ categories: parsed })
      }
    } catch {}

    // 2. Try fetching fresh data from Supabase
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      if (!error && data && data.length > 0) {
        set({ categories: data })
        // Update local cache
        cacheStorage.set(CATEGORIES_CACHE_KEY, JSON.stringify(data))
      }
    } catch {
      // Network unavailable — cached data is already loaded above
    }
  },

  addCategory: async (category) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return null

    const payload = { ...category, user_id: session.user.id }
    const { data, error } = await supabase
      .from('categories')
      .insert(payload)
      .select()
      .single()

    if (!error && data) {
      set((state) => {
        const newCats = [...state.categories, data]
        cacheStorage.set(CATEGORIES_CACHE_KEY, JSON.stringify(newCats))
        return { categories: newCats }
      })
      return data
    }
    return null
  },

  addPaymentMethod: (method) => {
    const newValue = method.label.toLowerCase().replace(/\s+/g, '_')
    const newMethod = { ...method, value: newValue }
    set((state) => {
      const updated = [...state.paymentMethods, newMethod]
      cacheStorage.set('custom_payment_methods', JSON.stringify(updated))
      return { paymentMethods: updated }
    })
  },

addExpense: async (expense) => {
  // Use getSession() instead of getUser() — it reads from local storage
  // and doesn't make a network request, so it works offline
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return
  const user = session.user

  const localId = Math.random().toString(36).slice(2)
  const payload = { ...expense, user_id: user.id, local_id: localId }

  // Look up category for optimistic UI display
  const category = get().categories.find((c) => c.id === expense.category_id) ?? null

  // Check network
  const net = await NetInfo.fetch()

  if (!net.isConnected) {
    // Save to local queue
    enqueue({ operation: 'INSERT', table: 'expenses', payload })

    // Optimistic UI update with temp data
    const tempExpense: Expense = {
      ...payload,
      id: localId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_synced: false,
      category,
    }
    set((state) => ({ expenses: [tempExpense, ...state.expenses] }))
    return
  }

  // Online — save directly (with fallback to offline queue on network failure)
  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert(sanitizeExpensePayload(payload))
      .select('*, category:categories(*)')
      .single()

    if (!error && data) {
      set((state) => ({ expenses: [data, ...state.expenses] }))
    } else if (error) {
      console.warn('Insert failed, queuing offline:', error.message)
      enqueue({ operation: 'INSERT', table: 'expenses', payload })
      const tempExpense: Expense = {
        ...payload,
        id: localId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_synced: false,
        category,
      }
      set((state) => ({ expenses: [tempExpense, ...state.expenses] }))
    }
  } catch (e) {
    // Network request failed — fall back to offline queue
    console.warn('Network error, queuing offline:', e)
    enqueue({ operation: 'INSERT', table: 'expenses', payload })
    const tempExpense: Expense = {
      ...payload,
      id: localId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_synced: false,
      category,
    }
    set((state) => ({ expenses: [tempExpense, ...state.expenses] }))
  }
},

  deleteExpense: async (id) => {
    await supabase.from('expenses').delete().eq('id', id)
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id)
    }))
  },

  getTotalByPeriod: (period) => {
    const { expenses } = get()
    const now = new Date()
    return expenses
      .filter((e) => {
        const d = new Date(e.expense_date)
        if (period === 'today') return d.toDateString() === now.toDateString()
        if (period === 'week') {
          const weekAgo = new Date(now)
          weekAgo.setDate(now.getDate() - 7)
          return d >= weekAgo
        }
        if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        return false
      })
      .reduce((sum, e) => sum + Number(e.amount), 0)
  },
}))