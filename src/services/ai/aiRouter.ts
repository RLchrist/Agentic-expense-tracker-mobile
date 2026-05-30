import NetInfo from '@react-native-community/netinfo'
import { supabase } from '../supabase/client'
import { parseTextOffline } from './localNLP'

export interface AIResponse {
  success: boolean
  data?: any
  error?: string
  source: 'online' | 'offline'
}

export const aiRouter = {
  /**
   * Parse text or voice transcripts for expense entities
   */
  async parseExpense(input: string, categories: any[]): Promise<AIResponse> {
    const state = await NetInfo.fetch()
    
    if (state.isConnected && state.isInternetReachable) {
      try {
        const { data, error } = await supabase.functions.invoke('parse-expense', {
          body: { text: input, categories },
        })
        if (error) throw error
        return { success: true, data: data.data, source: 'online' }
      } catch (e) {
        console.warn('Online AI failed, falling back to local...', e)
      }
    }

    // Fallback to local NLP
    console.log('Using On-device NLP (ONNX)...')
    try {
      const localResult = await parseTextOffline(input, categories)
      return { success: true, data: localResult, source: 'offline' }
    } catch (e) {
      return { success: false, error: 'Local AI failed: ' + (e as any).message, source: 'offline' }
    }
  },

  /**
   * Parse group expenses from natural language text
   */
  async parseGroupExpense(input: string): Promise<AIResponse> {
    const state = await NetInfo.fetch()
    
    if (state.isConnected && state.isInternetReachable) {
      try {
        const { data, error } = await supabase.functions.invoke('parse-expense', {
          body: { text: input, mode: 'group' },
        })
        if (error) throw error
        return { success: true, data: data.data, source: 'online' }
      } catch (e) {
        console.warn('Online AI failed, returning error...', e)
        return { success: false, error: 'Online AI failed', source: 'online' }
      }
    }
    return { success: false, error: 'No internet connection', source: 'offline' }
  },

  /**
   * Process receipt images
   */
  async parseReceipt(imagePath: string, categories: any[], imageBase64?: string): Promise<AIResponse> {
    const state = await NetInfo.fetch()

    if (state.isConnected && state.isInternetReachable) {
      try {
        const body: Record<string, any> = { categories }
        if (imageBase64) {
          body.images = [imageBase64]
        }
        const { data, error } = await supabase.functions.invoke('parse-expense', { body })
        if (error) throw error
        return { success: true, data: data.data, source: 'online' }
      } catch (e) {
        console.warn('Online OCR failed:', e)
      }
    }

    return { success: false, error: 'Receipt scanning is unavailable offline. Please type your expense instead.', source: 'offline' }
  },


}
