import { create } from 'zustand'
import { supabase } from '../services/supabase/client'
import { Budget, Category } from '../types'
import NetInfo from '@react-native-community/netinfo'
import { enqueue } from '../services/sync/offlineSync'
import { createMMKV } from 'react-native-mmkv'

const budgetCache = createMMKV({ id: 'budget-cache' })
const BUDGETS_CACHE_KEY = 'cached_budgets'

export interface BudgetWithSpent extends Budget {
  spent: number
  percentage: number
  category?: Category
}

interface BudgetState {
  budgets: BudgetWithSpent[]
  isLoading: boolean
  fetchBudgets: (expenses: any[]) => Promise<void>
  addBudget: (budget: Omit<Budget, 'id' | 'created_at' | 'user_id'>) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
}

const computeSpent = (budgets: any[], expenses: any[]): BudgetWithSpent[] => {
  return budgets.map((budget) => {
    const spent = expenses
      .filter((e) => {
        const d = new Date(e.expense_date)
        const start = new Date(budget.start_date)
        const end = new Date(budget.end_date)
        const categoryMatch = budget.category_id
          ? e.category_id === budget.category_id
          : true
        return d >= start && d <= end && categoryMatch
      })
      .reduce((sum: number, e: any) => sum + Number(e.amount), 0)

    return {
      ...budget,
      spent,
      percentage: Math.min((spent / Number(budget.amount)) * 100, 100),
    }
  })
}

export const useBudgetStore = create<BudgetState>((set) => ({
  budgets: [],
  isLoading: false,

  fetchBudgets: async (expenses) => {
    // 1. Load from MMKV cache instantly (works offline)
    try {
      const cached = budgetCache.getString(BUDGETS_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.length > 0) {
          set({ budgets: computeSpent(parsed, expenses) })
        }
      }
    } catch {}

    // 2. Try fetching fresh data from Supabase
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .order('created_at', { ascending: false })

      if (error || !data) { set({ isLoading: false }); return }

      const budgetsWithSpent = computeSpent(data, expenses)
      set({ budgets: budgetsWithSpent, isLoading: false })

      // 3. Update MMKV cache on success
      budgetCache.set(BUDGETS_CACHE_KEY, JSON.stringify(data))
    } catch (e) {
      // Offline — cached data already loaded above
      console.warn('Budget fetch failed (offline?):', e)
      set({ isLoading: false })
    }
  },

  addBudget: async (budget) => {
    // Use getSession() instead of getUser() — reads MMKV, no network
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const user = session.user

    const net = await NetInfo.fetch()

    if (!net.isConnected) {
      // Offline — add optimistically with temp id and queue
      const tempId = 'temp_' + Math.random().toString(36).slice(2)
      const tempBudget: BudgetWithSpent = {
        ...budget,
        id: tempId,
        user_id: user.id,
        created_at: new Date().toISOString(),
        spent: 0,
        percentage: 0,
      }
      set((state) => ({ budgets: [tempBudget, ...state.budgets] }))
      enqueue({ operation: 'INSERT', table: 'budgets', payload: { ...budget, user_id: user.id } })
      return
    }

    // Online — save to Supabase
    try {
      const { data, error } = await supabase
        .from('budgets')
        .insert({ ...budget, user_id: user.id })
        .select('*, category:categories(*)')
        .single()
      if (!error && data) {
        set((state) => ({
          budgets: [{ ...data, spent: 0, percentage: 0 }, ...state.budgets]
        }))
      } else if (error) {
        console.warn('Budget insert failed, queuing offline:', error.message)
        const tempId = 'temp_' + Math.random().toString(36).slice(2)
        const tempBudget: BudgetWithSpent = {
          ...budget,
          id: tempId,
          user_id: user.id,
          created_at: new Date().toISOString(),
          spent: 0,
          percentage: 0,
        }
        set((state) => ({ budgets: [tempBudget, ...state.budgets] }))
        enqueue({ operation: 'INSERT', table: 'budgets', payload: { ...budget, user_id: user.id } })
      }
    } catch (e) {
      console.warn('Network error on budget add, queuing offline:', e)
      const tempId = 'temp_' + Math.random().toString(36).slice(2)
      const tempBudget: BudgetWithSpent = {
        ...budget,
        id: tempId,
        user_id: user.id,
        created_at: new Date().toISOString(),
        spent: 0,
        percentage: 0,
      }
      set((state) => ({ budgets: [tempBudget, ...state.budgets] }))
      enqueue({ operation: 'INSERT', table: 'budgets', payload: { ...budget, user_id: user.id } })
    }
  },

  deleteBudget: async (id) => {
    // 1. Always remove from state immediately (optimistic)
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== id)
    }))

    // 2. Check network
    const net = await NetInfo.fetch()

    if (!net.isConnected) {
      // 3. Offline — enqueue DELETE operation
      enqueue({ operation: 'DELETE', table: 'budgets', payload: { id } })
      return
    }

    // 4. Online — delete from Supabase with fallback to queue
    try {
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) {
        console.warn('Budget delete failed, queuing offline:', error.message)
        enqueue({ operation: 'DELETE', table: 'budgets', payload: { id } })
      }
    } catch (e) {
      console.warn('Network error on budget delete, queuing offline:', e)
      enqueue({ operation: 'DELETE', table: 'budgets', payload: { id } })
    }
  },
}))

/** Clear cached budgets from MMKV — call on sign out */
export const clearBudgetCache = () => {
  budgetCache.remove(BUDGETS_CACHE_KEY)
}