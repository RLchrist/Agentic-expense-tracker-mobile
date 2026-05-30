import { IngestionEventLog, CorrectionEvent, IngestionResult } from './types';
import { supabase } from '../../supabase/client';

export class FeedbackLearningSystem {
  /**
   * Logs a voice ingestion event to the local console and attempts to sync with Supabase
   * to provide full observability and audit trails for transcription runs.
   */
  public static async logIngestionEvent(result: IngestionResult): Promise<string> {
    const eventId = Math.random().toString(36).substring(2, 15);
    console.log(`[FeedbackLearningSystem] Ingestion Logged: ${eventId}`, {
      raw: result.rawTranscript,
      normalized: result.normalizedTranscript,
      decision: result.decision,
      compositeScore: result.confidence.compositeScore,
    });

    try {
      // Offload to Supabase asynchronously in background (do not block user interaction)
      supabase.from('expense_transcripts').insert({
        id: eventId,
        raw_transcript: result.rawTranscript,
        normalized_transcript: result.normalizedTranscript,
        composite_score: result.confidence.compositeScore,
        routing_decision: result.decision,
        metadata: {
          scriptAnalysis: result.scriptAnalysis,
          expenseData: result.semanticExpense,
          meta: result.meta,
        },
      }).then(({ error }) => {
        if (error) console.warn('[FeedbackLearningSystem] Syncing log to Supabase failed:', error.message);
      });
    } catch (e) {
      console.warn('[FeedbackLearningSystem] Silent fail logging event:', e);
    }

    return eventId;
  }

  /**
   * Logs a user-initiated correction event.
   * If a user manually edits the parsed title, amount, or category, we capture the delta
   * so offline pipelines or LLM dynamic prompt context builders can learn the vocabulary adjustments.
   */
  public static async logCorrectionEvent(
    eventId: string,
    rawTranscript: string,
    originalNormalized: string,
    userCorrectedTranscript: string,
    userCorrectedExpense: any
  ): Promise<void> {
    const correction: Omit<CorrectionEvent, 'created_at'> = {
      id: Math.random().toString(36).substring(2, 15),
      ingestionEventId: eventId,
      rawTranscript,
      originalNormalized,
      userCorrectedTranscript,
      userCorrectedExpense,
      processed: false,
    };

    console.log('[FeedbackLearningSystem] User Correction Event Logged:', correction);

    try {
      // Sync correction log with Supabase for analytics and future RLHF / prompt tuning
      supabase.from('correction_events').insert({
        id: correction.id,
        transcript_id: eventId,
        raw_transcript: rawTranscript,
        original_normalized: originalNormalized,
        corrected_transcript: userCorrectedTranscript,
        corrected_expense: userCorrectedExpense,
        processed: false,
      }).then(({ error }) => {
        if (error) console.warn('[FeedbackLearningSystem] Syncing correction to Supabase failed:', error.message);
      });
    } catch (e) {
      console.warn('[FeedbackLearningSystem] Silent fail logging correction:', e);
    }
  }
}
