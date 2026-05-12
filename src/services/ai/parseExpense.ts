import { supabase } from '../supabase/client'
import { Category } from '../../types'

export interface ParsedExpense {
  title: string
  amount: number
  category_name: string
  category_id: string
  expense_date: string
  payment_method: string
  note: string | null
  confidence: number
}

export const parseExpenseFromText = async (
  text: string,
  categories: Category[]
): Promise<ParsedExpense | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('parse-expense', {
      body: { text, categories },
    })

    if (error) {
      console.error('Edge function error:', error)
      return null
    }

    if (data?.success && data?.data) {
      return data.data as ParsedExpense
    }

    return null
  } catch (e) {
    console.error('Parse expense error:', e)
    return null
  }
}