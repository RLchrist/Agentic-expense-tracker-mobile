import TesseractOcr, { LANG_ENGLISH } from 'react-native-tesseract-ocr'
import { parseTextOffline } from './localNLP'
import { Category } from '../../types'

export const parseReceiptOffline = async (imagePath: string, categories: Category[]) => {
  try {
    const tessOptions = {
      whitelist: null,
      blacklist: null,
    }
    
    // Perform OCR
    const extractedText = await TesseractOcr.recognize(imagePath, LANG_ENGLISH, tessOptions)
    console.log('Offline OCR Text:', extractedText)

    // Use local NLP to extract entities from the OCR text
    return await parseTextOffline(extractedText, categories)
  } catch (e) {
    console.error('Local OCR failed:', e)
    throw new Error('Could not read receipt offline.')
  }
}
