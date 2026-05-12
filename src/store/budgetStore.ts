import { create } from 'zustand'
import { supabase } from '../services/supabase/client'
import { Budget, Category } from '../types'

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

export const useBudgetStore = create<BudgetState>((set) => ({
  budgets: [],
  isLoading: false,

  fetchBudgets: async (expenses) => {
    set({ isLoading: true })
    const { data, error } = await supabase
      .from('budgets')
      .select('*, category:categories(*)')
      .order('created_at', { ascending: false })

    if (error || !data) { set({ isLoading: false }); return }

    // Calculate spent amount per budget
    const budgetsWithSpent: BudgetWithSpent[] = data.map((budget) => {
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

    set({ budgets: budgetsWithSpent, isLoading: false })
  },

  addBudget: async (budget) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('budgets')
      .insert({ ...budget, user_id: user.id })
      .select('*, category:categories(*)')
      .single()
    if (!error && data) {
      set((state) => ({
        budgets: [{ ...data, spent: 0, percentage: 0 }, ...state.budgets]
      }))
    }
  },

  deleteBudget: async (id) => {
    await supabase.from('budgets').delete().eq('id', id)
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== id)
    }))
  },
}))