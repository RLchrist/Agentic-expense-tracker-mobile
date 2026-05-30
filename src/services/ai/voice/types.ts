export type ScriptType = 'LATIN' | 'DEVANAGARI' | 'MIXED' | 'NUMERIC_SPECIAL';

export interface ScriptAnalysis {
  scriptType: ScriptType;
  devanagariRatio: number;
  latinRatio: number;
  hasPhoneticAnomaly: boolean;
  detectedPrimaryLanguage: 'en' | 'ne' | 'code-switched';
}

export interface NormalizationMapping {
  original: string;
  normalized: string;
  type: 'phonetic' | 'synonym' | 'typo' | 'intent';
  language: 'en' | 'ne' | 'bilingual';
}

export interface NormalizedToken {
  original: string;
  normalized: string;
  confidence: number;
  wasCorrected: boolean;
  correctionType?: 'fuzzy' | 'direct_map' | 'regex' | 'none';
}

export interface SemanticIntent {
  action: 'purchase' | 'income' | 'transfer' | 'unknown';
  verb: string;
  canonicalVerb: string;
}

export interface ExtractedEntity<T> {
  value: T;
  rawText: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface SemanticExpense {
  amount: ExtractedEntity<number> | null;
  quantity: ExtractedEntity<string> | null; // e.g. "5L", "2 kg"
  item: ExtractedEntity<string> | null;
  category: ExtractedEntity<string> | null;
  merchant: ExtractedEntity<string> | null;
  intent: SemanticIntent;
  originalText: string;
  normalizedText: string;
}

export type RoutingDecision = 'PARSE_DIRECTLY' | 'NORMALIZE_AND_PARSE' | 'FORCE_RETRY_TRANSCRIPTION' | 'USER_CONFIRMATION';

export interface ConfidenceScore {
  compositeScore: number; // 0.0 to 1.0
  scriptConfidence: number;
  semanticConfidence: number;
  entityConfidence: number;
}

export interface IngestionResult {
  rawTranscript: string;
  normalizedTranscript: string;
  scriptAnalysis: ScriptAnalysis;
  semanticExpense: SemanticExpense;
  confidence: ConfidenceScore;
  decision: RoutingDecision;
  meta: {
    modelUsed: string;
    durationMs: number;
    retryCount: number;
    transcriptionLanguageUsed?: string;
  };
}

export interface IngestionEventLog {
  id: string;
  rawTranscript: string;
  normalizedTranscript: string;
  extractedExpense: any;
  confidenceScore: number;
  routingDecision: string;
  deviceInfo: string;
  created_at: string;
}

export interface CorrectionEvent {
  id: string;
  ingestionEventId: string;
  rawTranscript: string;
  originalNormalized: string;
  userCorrectedTranscript: string;
  userCorrectedExpense: any;
  created_at: string;
  processed: boolean;
}
