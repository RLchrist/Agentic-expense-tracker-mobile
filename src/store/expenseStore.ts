import { create } from 'zustand'
import { supabase } from '../services/supabase/client'
import { Expense, Category } from '../types'

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...expense, user_id: user.id })
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