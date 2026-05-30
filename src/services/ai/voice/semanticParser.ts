import { SemanticExpense, SemanticIntent, ExtractedEntity } from './types';
import { VERB_INTENT_SYNONYMS, ITEM_SYNONYMS } from './normalizationRegistry';
import { Category } from '../../../types';

export class SemanticParser {
  /**
   * Performs offline heuristic-based semantic extraction using regex and synonym dictionary matching.
   * Super-fast, fallback-safe.
   */
  public static parseHeuristic(text: string, categories: Category[]): SemanticExpense {
    const cleanText = text.trim();
    
    // 1. Extract Amount
    let amountEntity: ExtractedEntity<number> | null = null;
    // Match any positive integers or decimals, prioritizing words like "rupees", "rupee", "rs", "ko" or just digits
    const amountRegex = /(?:rs\.?\s*|rupees?\s*|npr\s*)?(\d+(?:\.\d+)?)(?:\s*(?:rupees?|rs|ko|npr))?/gi;
    let match;
    let highestAmount = 0;
    let amountIndex = -1;
    let amountRaw = '';

    while ((match = amountRegex.exec(cleanText)) !== null) {
      const val = parseFloat(match[1]);
      // Avoid matching quantities like "5 liters" or dates
      if (val > highestAmount && !cleanText.substring(match.index - 5, match.index).toLowerCase().includes('liter')) {
        highestAmount = val;
        amountIndex = match.index;
        amountRaw = match[0];
      }
    }

    if (highestAmount > 0) {
      amountEntity = {
        value: highestAmount,
        rawText: amountRaw,
        confidence: 0.85,
        startIndex: amountIndex,
        endIndex: amountIndex + amountRaw.length,
      };
    }

    // 2. Extract Quantity (e.g., "5 liters", "2 kg")
    let quantityEntity: ExtractedEntity<string> | null = null;
    const qtyRegex = /(\d+(?:\.\d+)?\s*(?:liters?|kg|kilo|pieces?|box|plate))/gi;
    const qtyMatch = qtyRegex.exec(cleanText);
    if (qtyMatch) {
      quantityEntity = {
        value: qtyMatch[0],
        rawText: qtyMatch[0],
        confidence: 0.9,
        startIndex: qtyMatch.index,
        endIndex: qtyMatch.index + qtyMatch[0].length,
      };
    }

    // 3. Extract Item & Category Name via Synonym Mappings
    let itemEntity: ExtractedEntity<string> | null = null;
    let categoryEntity: ExtractedEntity<string> | null = null;

    for (const [canonicalItem, synonyms] of Object.entries(ITEM_SYNONYMS)) {
      for (const synonym of synonyms) {
        const idx = cleanText.toLowerCase().indexOf(synonym.toLowerCase());
        if (idx !== -1) {
          itemEntity = {
            value: canonicalItem,
            rawText: cleanText.substring(idx, idx + synonym.length),
            confidence: 0.9,
            startIndex: idx,
            endIndex: idx + synonym.length,
          };
          
          // Map to standard category name based on simple mappings
          let catName = 'Other';
          if (canonicalItem === 'fuel') catName = 'Transportation';
          if (canonicalItem === 'momo') catName = 'Food & Drinks';
          if (canonicalItem === 'bus_fare') catName = 'Transportation';
          if (canonicalItem === 'room_rent') catName = 'Rent & Bills';
          if (canonicalItem === 'groceries') catName = 'Shopping';

          categoryEntity = {
            value: catName,
            rawText: cleanText.substring(idx, idx + synonym.length),
            confidence: 0.85,
            startIndex: idx,
            endIndex: idx + synonym.length,
          };
          break;
        }
      }
      if (itemEntity) break;
    }

    // 4. Extract Intent
    let intentAction: 'purchase' | 'income' | 'transfer' | 'unknown' = 'unknown';
    let detectedVerb = '';
    let canonicalVerb = '';

    for (const [action, synonyms] of Object.entries(VERB_INTENT_SYNONYMS)) {
      for (const synonym of synonyms) {
        const idx = cleanText.toLowerCase().indexOf(synonym.toLowerCase());
        if (idx !== -1) {
          intentAction = action as any;
          detectedVerb = cleanText.substring(idx, idx + synonym.length);
          canonicalVerb = action;
          break;
        }
      }
      if (intentAction !== 'unknown') break;
    }

    const intent: SemanticIntent = {
      action: intentAction,
      verb: detectedVerb,
      canonicalVerb: canonicalVerb || 'spent',
    };

    return {
      amount: amountEntity,
      quantity: quantityEntity,
      item: itemEntity,
      category: categoryEntity,
      merchant: null, // Heuristics cannot reliably detect merchants offline
      intent,
      originalText: text,
      normalizedText: cleanText,
    };
  }
}
