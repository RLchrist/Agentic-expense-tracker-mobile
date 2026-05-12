export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  currency: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  icon: string
  color: string
  is_default: boolean
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  amount: number
  currency: string
  category_id: string | null
  title: string
  note: string | null
  receipt_url: string | null
  expense_date: string
  payment_method: string
  is_synced: boolean
  local_id: string | null
  created_at: string
  updated_at: string
  category?: Category
}

export interface Budget {
  id: string
  user_id: string
  category_id: string | null
  amount: number
  period: string
  start_date: string
  end_date: string
  created_at: string
}

export interface SyncQueueItem {
  id: string
  user_id: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  table_name: string
  record_id: string
  payload: Json
  synced_at: string | null
  created_at: string
}

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other'

export type RootStackParamList = {
  Auth: undefined
  Main: undefined
}

export type MainTabParamList = {
  Dashboard: undefined
  Expenses: undefined
  AddExpense: undefined
  Budgets: undefined
  Settings: undefined
}