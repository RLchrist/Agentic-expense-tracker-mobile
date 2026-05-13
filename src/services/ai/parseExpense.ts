import * as FileSystem from 'expo-file-system'
import * as Manipulator from 'expo-image-manipulator'
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
  categories: Category[],
  imageUris: string[] = []
): Promise<ParsedExpense | null> => {
  try {
    // Convert and resize images to base64 if any
    const base64Images = await Promise.all(
      imageUris.map(async (uri) => {
        try {
          // Resize image to be safe with payload limits
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
      console.error('Edge function error details:', {
        message: error.message,
        status: error.status,
        // @ts-ignore
        details: error.details,
      })
      return null
    }

    if (data?.success && data?.data) {
      return data.data as ParsedExpense
    }

    if (data?.error) {
      console.error('AI Parsing Error:', data.error, data.details)
    }

    return null
  } catch (e) {
    console.error('Parse expense error:', e)
    return null
  }
}