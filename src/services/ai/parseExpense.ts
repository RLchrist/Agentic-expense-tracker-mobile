import * as Manipulator from 'expo-image-manipulator'
import NetInfo from '@react-native-community/netinfo'
import { supabase } from '../supabase/client'
import { Category } from '../../types'
import { aiRouter } from './aiRouter'

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

const isValid = (d: any): d is ParsedExpense =>
  d && (!!d.title || d.amount > 0)

export const parseExpenseFromText = async (
  text: string,
  categories: Category[],
  imageUris: string[] = []
): Promise<ParsedExpense | null> => {
  try {
    // If no images, route through aiRouter (has offline fallback to localNLP)
    if (imageUris.length === 0) {
      const result = await aiRouter.parseExpense(text, categories)
      if (isValid(result.data)) return result.data as ParsedExpense
      return null
    }

    // Check network before attempting edge function
    const netState = await NetInfo.fetch()
    const isOnline = netState.isConnected && netState.isInternetReachable

    if (!isOnline) {
      const fallback = await aiRouter.parseExpense(text, categories)
      if (isValid(fallback.data)) return fallback.data as ParsedExpense
      return null
    }

    // Convert and resize images to base64 if any
    const base64Images = await Promise.all(
      imageUris.map(async (uri) => {
        try {
          const manipResult = await Manipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1024 } }],
            { compress: 0.7, format: Manipulator.SaveFormat.JPEG, base64: true }
          )
          return manipResult.base64 || null
        } catch (err) {
          console.error('Failed to process image:', uri, err)
          return null
        }
      })
    )

    const validImages = base64Images.filter((img): img is string => img !== null)

    const { data, error } = await supabase.functions.invoke('parse-expense', {
      body: { 
        text, 
        categories,
        images: validImages 
      },
    })

    if (error) {
      const fallback = await aiRouter.parseExpense(text, categories)
      if (isValid(fallback.data)) return fallback.data as ParsedExpense
      return null
    }

    if (data?.success && isValid(data.data)) {
      return data.data as ParsedExpense
    }

    return null
  } catch (e) {
    console.error('Parse expense error:', e)
    try {
      const fallback = await aiRouter.parseExpense(text, categories)
      if (isValid(fallback.data)) return fallback.data as ParsedExpense
    } catch {}
    return null
  }
}