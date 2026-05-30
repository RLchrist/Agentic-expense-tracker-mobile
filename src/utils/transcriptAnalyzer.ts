/**
 * Transcript Quality Analyzer
 *
 * Detects mixed-script anomalies in Whisper transcription output that indicate
 * the model misidentified the spoken language and phonetically transliterated
 * English words into Devanagari script.
 *
 * Example anomaly: "पुर्चाइब 5 L of petrol" instead of "purchased 5 L of petrol"
 *
 * Heuristic: If Latin script dominates (>50%) but Devanagari is also present (3–40%),
 * the Devanagari words are almost certainly phonetic artifacts of English speech.
 * Conversely, if Devanagari dominates (>60%), it's genuine Nepali — even if a few
 * English words (like "bus") appear, that's normal code-switching.
 */

const DEVANAGARI_RANGE = /[\u0900-\u097F]/g
const LATIN_RANGE = /[a-zA-Z]/g

export interface TranscriptAnalysis {
  /** Whether the transcript likely contains phonetic transliteration artifacts */
  hasMixedScriptAnomaly: boolean
  /** Ratio of Devanagari characters to total alphabetic characters (0–1) */
  devanagariRatio: number
  /** Ratio of Latin characters to total alphabetic characters (0–1) */
  latinRatio: number
  /** Whether a retry with forced English is recommended */
  shouldRetryAsEnglish: boolean
}

export function analyzeTranscript(text: string): TranscriptAnalysis {
  const devanagariChars = text.match(DEVANAGARI_RANGE) || []
  const latinChars = text.match(LATIN_RANGE) || []

  const totalAlpha = devanagariChars.length + latinChars.length

  if (totalAlpha === 0) {
    return {
      hasMixedScriptAnomaly: false,
      devanagariRatio: 0,
      latinRatio: 0,
      shouldRetryAsEnglish: false,
    }
  }

  const devanagariRatio = devanagariChars.length / totalAlpha
  const latinRatio = latinChars.length / totalAlpha

  // Mixed-script anomaly: both scripts present in non-trivial amounts
  const hasMixedScriptAnomaly = devanagariRatio > 0.03 && latinRatio > 0.2

  // Retry as English when:
  //   1. Latin script dominates (>50% of alphabetic chars)
  //   2. Devanagari is present (>3%) — indicates phonetic artifacts
  //   3. Devanagari portion is minority (<40%) — rules out genuine Nepali
  const shouldRetryAsEnglish =
    latinRatio > 0.5 && devanagariRatio > 0.03 && devanagariRatio < 0.4

  return {
    hasMixedScriptAnomaly,
    devanagariRatio,
    latinRatio,
    shouldRetryAsEnglish,
  }
}
