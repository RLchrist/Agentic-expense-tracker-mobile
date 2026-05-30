import { Expense, Budget } from '../../types'
import { useExpenseStore } from '../../store/expenseStore'
import { useBudgetStore } from '../../store/budgetStore'
import { addDays, addWeeks, addMonths, addYears, isBefore, format } from 'date-fns'

export const processRecurringExpenses = async (expenses: Expense[]) => {
  const recurring = expenses.filter(e => e.is_recurring && e.recurring_period)
  const { addExpense } = useExpenseStore.getState()
  const today = new Date()

  for (const exp of recurring) {
    let lastInstanceDate = new Date(exp.expense_date)
    let nextInstanceDate: Date

    // Calculate the next date based on period
    switch (exp.recurring_period) {
      case 'daily': nextInstanceDate = addDays(lastInstanceDate, 1); break
      case 'weekly': nextInstanceDate = addWeeks(lastInstanceDate, 1); break
      case 'monthly': nextInstanceDate = addMonths(lastInstanceDate, 1); break
      case 'yearly': nextInstanceDate = addYears(lastInstanceDate, 1); break
      default: continue
    }

    // If the next instance date is today or in the past, and it doesn't exist yet
    // Note: This is a simplified check. In a real app, we might want to check 
    // if an expense with the same title/amount/date already exists to avoid duplicates.
    if (isBefore(nextInstanceDate, today) || nextInstanceDate.toDateString() === today.toDateString()) {
      const exists = expenses.find(e => 
        e.title === exp.title && 
        e.expense_date === format(nextInstanceDate, 'yyyy-MM-dd')
      )

      if (!exists) {
        console.log(`Generating recurring instance for: ${exp.title}`)
        const { id, user_id, created_at, updated_at, ...rest } = exp
        await addExpense({
          ...rest,
          expense_date: format(nextInstanceDate, 'yyyy-MM-dd'),
          is_synced: false,
          local_id: null,
        })
      }
    }
  }
}

export const processBudgetResets = async (budgets: Budget[]) => {
  const { addBudget, deleteBudget } = useBudgetStore.getState()
  const today = new Date()

  for (const budget of budgets) {
    const endDate = new Date(budget.end_date)
    
    if (isBefore(endDate, today)) {
      console.log(`Resetting budget for category: ${budget.category_id}`)
      
      // Calculate new dates
      let newStart = addDays(endDate, 1)
      let newEnd: Date
      
      if (budget.period === 'weekly') newEnd = addDays(newStart, 6)
      else if (budget.period === 'monthly') newEnd = addMonths(newStart, 1)
      else newEnd = addYears(newStart, 1)

      // In a real app, we might want to "archive" the old budget 
      // and create a new one instead of just deleting.
      // For now, we'll follow the logic of refreshing the window.
      await addBudget({
        ...budget,
        start_date: format(newStart, 'yyyy-MM-dd'),
        end_date: format(newEnd, 'yyyy-MM-dd'),
      })
      
      // Optionally delete the old one or mark as inactive
      // await deleteBudget(budget.id)
    }
  }
}
