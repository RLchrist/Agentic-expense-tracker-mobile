import { ScriptAnalysis, ScriptType } from './types';

const DEVANAGARI_REGEX = /[\u0900-\u097F]/g;
const LATIN_REGEX = /[a-zA-Z]/g;
const NUMERIC_REGEX = /[0-9\u0966-\u096F]/g; // Includes Western and Devanagari numerals

export class ScriptAnalyzer {
  /**
   * Analyzes the character composition of a transcript to identify script type,
   * language characteristics, and potential Whisper phonetic transliteration errors.
   */
  public static analyze(text: string): ScriptAnalysis {
    const cleanText = text.trim();
    if (!cleanText) {
      return {
        scriptType: 'LATIN',
        devanagariRatio: 0,
        latinRatio: 0,
        hasPhoneticAnomaly: false,
        detectedPrimaryLanguage: 'en',
      };
    }

    const devanagariMatches = cleanText.match(DEVANAGARI_REGEX) || [];
    const latinMatches = cleanText.match(LATIN_REGEX) || [];
    const numericMatches = cleanText.match(NUMERIC_REGEX) || [];

    const totalAlphabetic = devanagariMatches.length + latinMatches.length;

    let devanagariRatio = 0;
    let latinRatio = 0;
    let scriptType: ScriptType = 'LATIN';
    let detectedPrimaryLanguage: 'en' | 'ne' | 'code-switched' = 'en';

    if (totalAlphabetic > 0) {
      devanagariRatio = devanagariMatches.length / totalAlphabetic;
      latinRatio = latinMatches.length / totalAlphabetic;

      if (devanagariRatio > 0.8) {
        scriptType = 'DEVANAGARI';
        detectedPrimaryLanguage = 'ne';
      } else if (latinRatio > 0.8) {
        scriptType = 'LATIN';
        detectedPrimaryLanguage = 'en';
      } else if (devanagariRatio > 0.05 && latinRatio > 0.05) {
        scriptType = 'MIXED';
        detectedPrimaryLanguage = 'code-switched';
      } else {
        scriptType = 'NUMERIC_SPECIAL';
      }
    } else if (numericMatches.length > 0) {
      scriptType = 'NUMERIC_SPECIAL';
    }

    // Heuristic script anomaly detection:
    // If a transcript has predominantly Latin words but contains a small, sparse proportion
    // of Devanagari text, it's highly likely that English words are phonetically transliterated.
    // E.g., "पुर्चाइब 5 L of petrol" (Latin: 76%, Devanagari: 24%)
    // But if Devanagari is > 40%, it's typically legitimate code-switching or native Nepali script.
    const hasPhoneticAnomaly =
      latinRatio > 0.5 && devanagariRatio > 0.03 && devanagariRatio < 0.4;

    return {
      scriptType,
      devanagariRatio,
      latinRatio,
      hasPhoneticAnomaly,
      detectedPrimaryLanguage,
    };
  }
}
