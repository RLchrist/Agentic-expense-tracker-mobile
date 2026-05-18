export interface GroupExpenseItem {
  id: string
  payerName: string
  amount: number
  description: string
}

export interface Settlement {
  from: string
  to: string
  amount: number
}

export interface SplitResult {
  totalAmount: number
  perPersonShare: number
  settlements: Settlement[]
  balances: Record<string, number>
}

export function calculateSplit(expenses: GroupExpenseItem[], totalFriends: number): SplitResult {
  const balances: Record<string, number> = {}
  let totalAmount = 0

  // Calculate total and how much each named person paid
  for (const exp of expenses) {
    const amount = Number(exp.amount) || 0
    totalAmount += amount
    
    const name = exp.payerName.trim() || 'Unknown'
    balances[name] = (balances[name] || 0) + amount
  }

  // Calculate per person share
  const perPersonShare = totalFriends > 0 ? totalAmount / totalFriends : 0

  // Subtract the share from everyone who paid to find their balance
  // Balance > 0 means they should get money back. Balance < 0 means they owe money.
  const uniquePayers = Object.keys(balances)
  for (const payer of uniquePayers) {
    balances[payer] -= perPersonShare
  }

  // Add the remaining members who didn't pay anything
  const numUnpaidFriends = totalFriends - uniquePayers.length
  for (let i = 1; i <= numUnpaidFriends; i++) {
    balances[`Member ${i}`] = -perPersonShare
  }

  // Separate into debtors and creditors
  const debtors = Object.keys(balances)
    .filter(name => balances[name] < -0.01)
    .map(name => ({ name, amount: Math.abs(balances[name]) }))
    .sort((a, b) => b.amount - a.amount)

  const creditors = Object.keys(balances)
    .filter(name => balances[name] > 0.01)
    .map(name => ({ name, amount: balances[name] }))
    .sort((a, b) => b.amount - a.amount)

  const settlements: Settlement[] = []
  
  let i = 0 // debtor index
  let j = 0 // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    
    const settleAmount = Math.min(debtor.amount, creditor.amount)
    
    if (settleAmount > 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: Number(settleAmount.toFixed(2))
      })
    }
    
    debtor.amount -= settleAmount
    creditor.amount -= settleAmount
    
    if (debtor.amount < 0.01) i++
    if (creditor.amount < 0.01) j++
  }

  return {
    totalAmount,
    perPersonShare,
    settlements,
    balances
  }
}
