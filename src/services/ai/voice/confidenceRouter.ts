import { ConfidenceScore, RoutingDecision, ScriptAnalysis, SemanticExpense } from './types';

export class ConfidenceRouter {
  /**
   * Evaluates composite confidence scores across three vectors: script, semantics, and entities.
   * Based on the score, routes the transcript to the optimal pipeline path.
   */
  public static evaluate(
    script: ScriptAnalysis,
    expense: SemanticExpense
  ): { confidence: ConfidenceScore; decision: RoutingDecision } {
    
    // 1. Script Confidence Scorer
    let scriptConfidence = 1.0;
    if (script.hasPhoneticAnomaly) {
      scriptConfidence = 0.4; // Strong penalty for phonetic Devanagari script mixups
    } else if (script.scriptType === 'MIXED') {
      scriptConfidence = 0.85; // Legitimate bilingual mixing is trusted but slightly lower than single-script
    }

    // 2. Semantic Confidence Scorer
    let semanticConfidence = 0.5;
    if (expense.intent.action !== 'unknown') {
      semanticConfidence = 0.95; // Intent is recognized
    } else if (expense.item !== null) {
      semanticConfidence = 0.8; // Item was matched, indicating rich context even if main verb is missing
    }

    // 3. Entity Confidence Scorer
    let entityConfidence = 0.0;
    if (expense.amount !== null) {
      entityConfidence += 0.7; // Having an amount is critical
      entityConfidence += expense.amount.confidence * 0.15;
    }
    if (expense.item !== null) {
      entityConfidence += 0.15; // Having an item description increases trust
    }

    // 4. Composite Score (weighted average)
    // 45% weight on entities (must have amount/item), 35% on script script-hygiene, 20% on semantics
    const compositeScore = Math.max(
      0.0,
      Math.min(
        1.0,
        entityConfidence * 0.45 + scriptConfidence * 0.35 + semanticConfidence * 0.2
      )
    );

    // 5. Confidence-Based Decision Routing
    let decision: RoutingDecision = 'USER_CONFIRMATION';

    if (script.hasPhoneticAnomaly) {
      // Force a transcription retry with language='en' to eliminate phonetic transliterations immediately
      decision = 'FORCE_RETRY_TRANSCRIPTION';
    } else if (compositeScore >= 0.85) {
      decision = 'PARSE_DIRECTLY';
    } else if (compositeScore >= 0.6) {
      decision = 'NORMALIZE_AND_PARSE';
    } else if (compositeScore >= 0.4) {
      decision = 'FORCE_RETRY_TRANSCRIPTION';
    } else {
      decision = 'USER_CONFIRMATION';
    }

    // Edge case: if no amount could be extracted, never auto-save directly
    if (expense.amount === null && decision === 'PARSE_DIRECTLY') {
      decision = 'NORMALIZE_AND_PARSE';
    }

    const confidence: ConfidenceScore = {
      compositeScore,
      scriptConfidence,
      semanticConfidence,
      entityConfidence,
    };

    return { confidence, decision };
  }
}
