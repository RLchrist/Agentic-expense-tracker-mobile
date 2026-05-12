import { create } from 'zustand'
import { supabase } from '../services/supabase/client'
import { Expense, Category } from '../types'
import NetInfo from '@react-native-community/netinfo'
import { enqueue } from '../services/sync/offlineSync'

interface ExpenseState {
  expenses: Expense[]
  categories: Category[]
  isLoading: boolean
  error: string | null
  fetchExpenses: () => Promise<void>
  fetchCategories: () => Promise<void>
  addExpense: (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  getTotalByPeriod: (period: 'today' | 'week' | 'month') => number
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  categories: [],
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
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    if (!error && data) set({ categories: data })
  },

addExpense: async (expense) => {
  // Use getSession() instead of getUser() — it reads from local storage
  // and doesn't make a network request, so it works offline
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return
  const user = session.user

  const localId = Math.random().toString(36).slice(2)
  const payload = { ...expense, user_id: user.id, local_id: localId }

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
    }
    set((state) => ({ expenses: [tempExpense, ...state.expenses] }))
    return
  }

  // Online — save directly
  const { data, error } = await supabase
    .from('expenses')
    .insert(payload)
    .select('*, category:categories(*)')
    .single()

  if (!error && data) {
    set((state) => ({ expenses: [data, ...state.expenses] }))
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