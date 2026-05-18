import NetInfo from '@react-native-community/netinfo'
import { supabase } from '../supabase/client'
import { parseTextOffline } from './localNLP'
import { parseReceiptOffline } from './localOCR'
import { parseVoiceOffline } from './localSTT'

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
      return { success: false, error: 'Local AI failed: ' + e.message, source: 'offline' }
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
  async parseReceipt(imagePath: string, categories: any[]): Promise<AIResponse> {
    const state = await NetInfo.fetch()

    if (state.isConnected && state.isInternetReachable) {
      try {
        // Note: For online, we might need to send base64, but local uses file path
        const { data, error } = await supabase.functions.invoke('parse-receipt', {
          body: { image_path: imagePath, categories },
        })
        if (error) throw error
        return { success: true, data: data.data, source: 'online' }
      } catch (e) {
        console.warn('Online OCR failed, falling back to local...', e)
      }
    }

    // Fallback to local OCR
    console.log('Using On-device OCR (Tesseract)...')
    try {
      const localResult = await parseReceiptOffline(imagePath, categories)
      return { success: true, data: localResult, source: 'offline' }
    } catch (e) {
      return { success: false, error: 'Local OCR failed: ' + e.message, source: 'offline' }
    }
  },

  /**
   * Process voice commands
   */
  async parseVoice(audioPath: string, categories: any[]): Promise<AIResponse> {
    const state = await NetInfo.fetch()

    if (state.isConnected && state.isInternetReachable) {
      try {
        const { data, error } = await supabase.functions.invoke('parse-voice', {
          body: { audio_path: audioPath, categories },
        })
        if (error) throw error
        return { success: true, data: data.data, source: 'online' }
      } catch (e) {
        console.warn('Online Voice failed, falling back to local...', e)
      }
    }

    // Fallback to local STT
    console.log('Using On-device STT (Whisper)...')
    try {
      const localResult = await parseVoiceOffline(audioPath, categories)
      return { success: true, data: localResult, source: 'offline' }
    } catch (e) {
      return { success: false, error: 'Local Voice failed: ' + e.message, source: 'offline' }
    }
  }
}
