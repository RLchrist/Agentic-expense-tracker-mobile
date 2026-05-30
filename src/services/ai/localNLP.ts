import { Category } from '../../types'

const FILLER_WORDS = /\b(spent|paid|cost|rupees|rupee|rs\.?|rp\.?|₹|on|for|i|my|the|a|an|of|and|or|in|at|with|it|is|was|just|some|this)\b/gi
const AMOUNT_PATTERN = /(\d+(?:[,\s]\d{3})*(?:\.\d{1,2})?)/g

const categoryKeywords: Record<string, string[]> = {
  'Food & Dining': ['food', 'dining', 'lunch', 'dinner', 'breakfast', 'meal', 'eat', 'eating', 'restaurant', 'cafe', 'coffee', 'tea', 'snack', 'grocery', 'groceries', 'pizza', 'burger', 'sandwich', 'dine'],
  'Transport': ['transport', 'bus', 'fare', 'taxi', 'cab', 'uber', 'auto', 'petrol', 'fuel', 'diesel', 'gas', 'train', 'metro', 'flight', 'airfare', 'toll', 'parking', 'bike', 'car', 'travel'],
  'Shopping': ['shop', 'shopping', 'buy', 'bought', 'purchase', 'clothes', 'dress', 'shoe', 'electronics', 'gadget', 'gift', 'accessory'],
  'Utilities': ['utility', 'utilities', 'electricity', 'bill', 'water', 'gas bill', 'phone', 'mobile', 'recharge', 'internet', 'wifi', 'broadband', 'rent'],
  'Health': ['health', 'medical', 'medicine', 'doctor', 'hospital', 'clinic', 'pharmacy', 'drug', 'checkup', 'dentist', 'eye', 'healthcare'],
  'Entertainment': ['entertainment', 'movie', 'film', 'cinema', 'concert', 'show', 'game', 'gaming', 'netflix', 'spotify', 'music', 'ticket', 'club', 'party'],
  'Education': ['education', 'school', 'college', 'university', 'course', 'class', 'tution', 'tuition', 'book', 'exam', 'fee'],
  'Other': ['other', 'misc', 'miscellaneous', 'general'],
}

const titleFromText = (raw: string, amount: number): string => {
  let t = raw
    .replace(FILLER_WORDS, '')
    .replace(new RegExp(String(amount), 'g'), '')
    .replace(/\s+,?\s*/g, ' ')
    .trim()
    .replace(/^[, ]+|[, ]+$/g, '')

  if (!t) {
    const idx = raw.toLowerCase().search(/(?:rupees?|rs\.?|₹)\s*\d+|\d+\s*(?:rupees?|rs\.?|₹)/i)
    if (idx >= 0) {
      t = raw.slice(idx).replace(FILLER_WORDS, '').replace(/[,\d.\s]+/g, ' ').trim()
    }
  }

  if (!t) t = raw.substring(0, 50).trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

const parseAmount = (text: string): number => {
  const normalized = text
    .replace(/(\d)\s+(\d{3})/g, '$1$2') // "2 000" -> "2000"
    .replace(/,(\d{3})/g, '$1')           // "2,000" -> "2000"

  const matches = [...normalized.matchAll(AMOUNT_PATTERN)]
  if (matches.length === 0) return 0

  // If multiple numbers, pick the one closest to currency keywords
  const currencyIdx = normalized.search(/(?:rupees?|rs\.?|₹)/i)
  if (currencyIdx >= 0) {
    let closest = matches[0]
    let closestDist = Infinity
    for (const m of matches) {
      const dist = Math.abs((m as any).index - currencyIdx)
      if (dist < closestDist) {
        closestDist = dist
        closest = m
      }
    }
    return parseFloat(closest[0].replace(/[,\s]/g, ''))
  }

  // Default to the first number
  return parseFloat(matches[0][0].replace(/[,\s]/g, ''))
}

const detectCategory = (text: string, categories: Category[]): { category_id: string; category_name: string } => {
  const lower = text.toLowerCase()

  // Check keyword matches with scoring
  let bestCat: Category | null = null
  let bestScore = 0

  for (const cat of categories) {
    // Direct name match
    if (lower.includes(cat.name.toLowerCase())) {
      return { category_id: cat.id, category_name: cat.name }
    }

    // Keyword scoring
    const keywords = categoryKeywords[cat.name]
    if (keywords) {
      let score = 0
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          score += kw.length
        }
      }
      if (score > bestScore) {
        bestScore = score
        bestCat = cat
      }
    }
  }

  if (bestCat && bestScore > 0) {
    return { category_id: bestCat.id, category_name: bestCat.name }
  }

  // Fall back to first category or "Other"
  const other = categories.find((c) => c.name.toLowerCase() === 'other')
  const fallback = other || categories[0]
  return {
    category_id: fallback?.id || '',
    category_name: fallback?.name || 'Other',
  }
}

export const parseTextOffline = async (text: string, categories: Category[]) => {
  const cleaned = text.trim()

  if (!cleaned) {
    return {
      title: '',
      amount: 0,
      category_id: '',
      category_name: '',
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      note: null,
      confidence: 0,
    }
  }

  const amount = parseAmount(cleaned)
  const { category_id, category_name } = detectCategory(cleaned, categories)
  const title = titleFromText(cleaned, amount)

  return {
    title,
    amount,
    category_id,
    category_name,
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    note: null,
    confidence: 0.85,
  }
}
