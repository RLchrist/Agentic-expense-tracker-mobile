import Whisper from 'react-native-whisper'
import { parseTextOffline } from './localNLP'
import { Category } from '../../types'

export const parseVoiceOffline = async (audioPath: string, categories: Category[]) => {
  return new Promise(async (resolve, reject) => {
    try {
      const modelPath = 'assets/models/ggml-tiny.en.bin'
      
      if ((Whisper as any).transcribeWavToText) {
        (Whisper as any).transcribeWavToText(modelPath, audioPath, async (text: string) => {
          try {
            console.log('Offline Whisper Transcript:', text)
            const result = await parseTextOffline(text, categories)
            resolve(result)
          } catch (e) {
            reject(e)
          }
        })
      } else {
        throw new Error('Whisper JSI method not found')
      }
    } catch (e) {
      console.error('Local Whisper failed:', e)
      reject(new Error('Could not process voice offline.'))
    }
  })
}
