import * as ort from 'onnxruntime-react-native'
import { Category } from '../../types'

// Simple keyword-based extraction for offline use when model is not yet loaded
const extractEntitiesManually = (text: string, categories: Category[]) => {
  const amountMatch = text.match(/(\d+(?:\.\d+)?)/)
  const amount = amountMatch ? parseFloat(amountMatch[0]) : 0

  let detectedCategory = categories[0]?.id || null
  for (const cat of categories) {
    if (text.toLowerCase().includes(cat.name.toLowerCase())) {
      detectedCategory = cat.id
      break
    }
  }

  return {
    title: text.substring(0, 50),
    amount,
    category_id: detectedCategory,
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    note: `Extracted offline: ${text}`
  }
}

export const parseTextOffline = async (text: string, categories: Category[]) => {
  try {
    // Phase 2: Load quantized MiniLM model from assets
    // const session = await ort.InferenceSession.create('assets/models/minilm.onnx')
    // const input = prepareOnnxInput(text)
    // const output = await session.run(input)
    // return processOnnxOutput(output, categories)

    console.log('Running manual extraction fallback...')
    return extractEntitiesManually(text, categories)
  } catch (e) {
    console.error('Local ONNX failed:', e)
    return extractEntitiesManually(text, categories)
  }
}
