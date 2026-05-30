import { NormalizedToken } from './types';
import { PHONETIC_DEVANAGARI_MAP, VERB_INTENT_SYNONYMS, ITEM_SYNONYMS, ROMANIZED_NUMBERS } from './normalizationRegistry';

export class TranscriptNormalizer {
  /**
   * Computes the Levenshtein distance between two strings.
   * Standard dynamic programming approach.
   */
  public static levenshtein(a: string, b: string): number {
    const tmp: number[][] = [];
    for (let i = 0; i <= a.length; i++) {
      tmp[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
      tmp[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        tmp[i][j] = Math.min(
          tmp[i - 1][j] + 1,
          tmp[i][j - 1] + 1,
          tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return tmp[a.length][b.length];
  }

  /**
   * Fuzzy matches a target token against a vocabulary list with an edit distance threshold.
   */
  public static fuzzyMatch(token: string, vocab: string[], threshold = 2): string | null {
    let bestMatch: string | null = null;
    let minDistance = Infinity;

    for (const word of vocab) {
      const dist = this.levenshtein(token.toLowerCase(), word.toLowerCase());
      if (dist < minDistance && dist <= threshold) {
        minDistance = dist;
        bestMatch = word;
      }
    }
    return bestMatch;
  }

  /**
   * Normalizes individual tokens in a transcript, fixing transliteration, typos, and synonyms.
   */
  public static normalizeToken(token: string): NormalizedToken {
    const lower = token.trim();
    if (!lower) {
      return { original: token, normalized: token, confidence: 1.0, wasCorrected: false };
    }

    // 1. Direct Phonetic Devanagari Mapping
    if (PHONETIC_DEVANAGARI_MAP[lower]) {
      return {
        original: token,
        normalized: PHONETIC_DEVANAGARI_MAP[lower],
        confidence: 0.95,
        wasCorrected: true,
        correctionType: 'direct_map',
      };
    }

    // 2. Intent Synonym Matching (fuzzy matching against standard verbs)
    for (const [intent, synonyms] of Object.entries(VERB_INTENT_SYNONYMS)) {
      if (synonyms.includes(lower.toLowerCase())) {
        return {
          original: token,
          normalized: intent,
          confidence: 0.9,
          wasCorrected: true,
          correctionType: 'direct_map',
        };
      }
      // Fuzzy fallback
      const fuzzy = this.fuzzyMatch(lower, synonyms, 1);
      if (fuzzy) {
        return {
          original: token,
          normalized: intent,
          confidence: 0.8,
          wasCorrected: true,
          correctionType: 'fuzzy',
        };
      }
    }

    // 3. Item Synonym Matching
    for (const [itemKey, synonyms] of Object.entries(ITEM_SYNONYMS)) {
      if (synonyms.includes(lower.toLowerCase())) {
        return {
          original: token,
          normalized: itemKey,
          confidence: 0.9,
          wasCorrected: true,
          correctionType: 'direct_map',
        };
      }
    }

    return { original: token, normalized: token, confidence: 1.0, wasCorrected: false, correctionType: 'none' };
  }

  /**
   * Performs full text normalization, replacing phonetic transliterations,
   * Romanized numbers, and normalizing units (e.g. "5 L" or "5l" -> "5 liters").
   */
  public static normalizeTranscript(text: string): string {
    let cleanText = text.trim();
    if (!cleanText) return '';

    // 1. Normalize Devanagari numerals to standard digits (e.g., ५०० -> 500)
    const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    for (let i = 0; i < 10; i++) {
      const reg = new RegExp(nepaliDigits[i], 'g');
      cleanText = cleanText.replace(reg, String(i));
    }

    // 2. Normalize Romanized Nepali spoken numbers (e.g., "panch se ko momo" -> "500 ko momo")
    for (const [romanized, numberValue] of Object.entries(ROMANIZED_NUMBERS)) {
      // Use boundary-safe regex to prevent replacing inside other words
      const reg = new RegExp(`\\b${romanized}\\b`, 'gi');
      cleanText = cleanText.replace(reg, String(numberValue));
    }

    // 3. Normalize quantity structures (e.g., "5l" or "5 l" or "5L" -> "5 liters")
    cleanText = cleanText.replace(/(\d+)\s*[lL]\b/g, '$1 liters');
    cleanText = cleanText.replace(/(\d+)\s*[kK][gG]\b/g, '$1 kg');

    // 4. Tokenize and normalize phonetic transliterations
    const words = cleanText.split(/\s+/);
    const normalizedWords = words.map(word => {
      // Strip punctuation for matching, but preserve it in final output if necessary
      const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
      const normalized = this.normalizeToken(cleanWord);
      return normalized.wasCorrected ? normalized.normalized : word;
    });

    return normalizedWords.join(' ');
  }
}
