import { ScriptAnalyzer } from './scriptAnalyzer';
import { TranscriptNormalizer } from './normalizer';
import { SemanticParser } from './semanticParser';
import { ConfidenceRouter } from './confidenceRouter';
import { FeedbackLearningSystem } from './feedbackSystem';
import { IngestionResult, RoutingDecision } from './types';
import { Category } from '../../../types';
import { parseExpenseFromText } from '../parseExpense';

export class VoiceIngestionPipeline {
  /**
   * Main entry point to ingest and normalize a spoken transcript.
   * Leverages the three-layer script and vocabulary normalizer, applies heuristic
   * offline semantic parsers, evaluates confidence metrics, and routes the processing.
   */
  public static async process(
    rawText: string,
    categories: Category[],
    transcriptionLanguageUsed = 'auto'
  ): Promise<IngestionResult> {
    const startTime = Date.now();

    // 1. Analyze script characteristics and phonetic transliteration anomalies
    const scriptAnalysis = ScriptAnalyzer.analyze(rawText);

    // 2. Perform three-layer vocabulary and transcript normalization
    const normalizedText = TranscriptNormalizer.normalizeTranscript(rawText);

    // 3. Extract semantic intent & entities locally using high-speed heuristics
    const localSemanticExpense = SemanticParser.parseHeuristic(normalizedText, categories);

    // 4. Calculate multi-vector confidence metrics and determine optimal routing path
    const { confidence, decision } = ConfidenceRouter.evaluate(scriptAnalysis, localSemanticExpense);

    let finalExpense = localSemanticExpense;
    let finalNormalizedText = normalizedText;
    let finalDecision: RoutingDecision = decision;

    // 5. Execute Routing Actions
    if (decision === 'PARSE_DIRECTLY') {
      // High confidence: Keep local heuristic parse or execute deep LLM validation
      console.log('[VoiceIngestionPipeline] High Confidence. Ingesting directly.');
    } else if (decision === 'NORMALIZE_AND_PARSE') {
      // Medium confidence: Trigger deep AI parser with fully normalized text for perfect structural extraction
      console.log('[VoiceIngestionPipeline] Medium Confidence. Triggering normalized semantic parse.');
      try {
        const aiParsed = await parseExpenseFromText(normalizedText, categories);
        if (aiParsed) {
          finalExpense = {
            amount: aiParsed.amount ? {
              value: aiParsed.amount,
              rawText: String(aiParsed.amount),
              confidence: aiParsed.confidence || 0.9,
              startIndex: 0,
              endIndex: String(aiParsed.amount).length,
            } : localSemanticExpense.amount,
            quantity: localSemanticExpense.quantity,
            item: aiParsed.title ? {
              value: aiParsed.title,
              rawText: aiParsed.title,
              confidence: aiParsed.confidence || 0.9,
              startIndex: 0,
              endIndex: aiParsed.title.length,
            } : localSemanticExpense.item,
            category: aiParsed.category_name ? {
              value: aiParsed.category_name,
              rawText: aiParsed.category_name,
              confidence: aiParsed.confidence || 0.9,
              startIndex: 0,
              endIndex: aiParsed.category_name.length,
            } : localSemanticExpense.category,
            merchant: aiParsed.note ? {
              value: aiParsed.note,
              rawText: aiParsed.note,
              confidence: 0.8,
              startIndex: 0,
              endIndex: aiParsed.note.length,
            } : null,
            intent: localSemanticExpense.intent,
            originalText: rawText,
            normalizedText: normalizedText,
          };
          finalDecision = 'PARSE_DIRECTLY'; // Upgraded
        }
      } catch (err) {
        console.warn('[VoiceIngestionPipeline] Remote AI parsing fallback failed. Using local heuristics.', err);
      }
    } else if (decision === 'FORCE_RETRY_TRANSCRIPTION') {
      console.log('[VoiceIngestionPipeline] Script anomaly detected. Retry recommended.');
    } else {
      console.log('[VoiceIngestionPipeline] Low confidence. Routing to user verification.');
    }

    const result: IngestionResult = {
      rawTranscript: rawText,
      normalizedTranscript: finalNormalizedText,
      scriptAnalysis,
      semanticExpense: finalExpense,
      confidence,
      decision: finalDecision,
      meta: {
        modelUsed: 'Groq Whisper large-v3-turbo + Gemini-2.5-flash fallback',
        durationMs: Date.now() - startTime,
        retryCount: 0,
        transcriptionLanguageUsed,
      },
    };

    // 6. Log ingestion telemetry and enable feedback learning
    await FeedbackLearningSystem.logIngestionEvent(result);

    return result;
  }
}
