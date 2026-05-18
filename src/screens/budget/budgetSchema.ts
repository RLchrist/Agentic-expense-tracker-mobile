import { z } from 'zod'

export const addBudgetSchema = z.object({
  amount: z.string().min(1, 'Enter an amount').refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    'Enter a valid positive amount',
  ),
  period: z.enum(['monthly', 'weekly']),
})

export type AddBudgetFormData = z.infer<typeof addBudgetSchema>
