const CURRENCY_SYMBOLS: Record<string, string> = {
  NPR: '₨',
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  AED: 'د.إ',
  CNY: '¥',
  JPY: '¥',
  SGD: 'S$',
}

export function getCurrencySymbol(currencyCode: string = 'NPR'): string {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode
}

export function formatCurrency(amount: number, currencyCode: string = 'NPR', fractionDigits: number = 0): string {
  const symbol = getCurrencySymbol(currencyCode)
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
  return `${symbol} ${formatted}`
}
