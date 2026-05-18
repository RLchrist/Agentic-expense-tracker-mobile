import { z } from 'zod'

export const addExpenseSchema = z.object({
  title: z.string().min(1, 'Please enter a title'),
  amount: z.string().min(1, 'Please enter an amount').refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    'Enter a valid positive amount',
  ),
  expenseDate: z.string().min(1, 'Please enter a date'),
  note: z.string().optional(),
  categoryId: z.string().min(1, 'Please select a category'),
  paymentMethod: z.string().min(1, 'Select a payment method'),
})

export type AddExpenseFormData = z.infer<typeof addExpenseSchema>
