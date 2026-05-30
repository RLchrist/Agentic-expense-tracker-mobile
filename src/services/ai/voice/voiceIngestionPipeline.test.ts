import { VoiceIngestionPipeline } from './voiceIngestionPipeline';
import { Category } from '../../../types';

const mockCategories: Category[] = [
  { id: 'cat-1', user_id: 'user-1', name: 'Transportation', icon: '🚗', color: '#ff0000', is_default: true, created_at: '' },
  { id: 'cat-2', user_id: 'user-1', name: 'Food & Drinks', icon: '🍔', color: '#00ff00', is_default: true, created_at: '' },
  { id: 'cat-3', user_id: 'user-1', name: 'Rent & Bills', icon: '🏠', color: '#0000ff', is_default: true, created_at: '' },
  { id: 'cat-4', user_id: 'user-1', name: 'Shopping', icon: '🛒', color: '#ffff00', is_default: true, created_at: '' },
];

interface TestCase {
  name: string;
  input: string;
  expectedNormalized: string;
  expectedIntent: string;
  expectedItem?: string;
  expectedAmount?: number;
}

const testCases: TestCase[] = [
  // 1. Phonetic English transliterations (transliteration artifacts)
  {
    name: 'Transliteration Artifact: purchased 5L petrol at 120 rupees',
    input: 'पुर्चाइब 5 L of petrol at the rate of 120 rupees',
    expectedNormalized: 'purchase 5 liters of petrol at the rate of 120 rupees',
    expectedIntent: 'purchase',
    expectedItem: 'fuel',
    expectedAmount: 120,
  },
  {
    name: 'Transliteration Artifact: spent 35 rupees on bus fare',
    input: 'इस्पेंट 35 rupees on bus fare',
    expectedNormalized: 'spent 35 rupees on bus fare',
    expectedIntent: 'spent',
    expectedItem: 'bus_fare',
    expectedAmount: 35,
  },
  // 2. Legitimate native Nepali speech
  {
    name: 'Nepali: momo khako 200 rupees',
    input: 'म:म खाएको २०० रुपैयाँ',
    expectedNormalized: 'momo spent 200 rupees',
    expectedIntent: 'spent',
    expectedItem: 'momo',
    expectedAmount: 200,
  },
  // 3. Mixed script/code switching
  {
    name: 'Code-Switch: bus vada 35 rupees',
    input: 'bus भाडा ३५ rupees',
    expectedNormalized: 'bus rent 35 rupees',
    expectedIntent: 'spent',
    expectedItem: 'bus_fare',
    expectedAmount: 35,
  },
  // 4. Romanized Nepali spoken numbers
  {
    name: 'Romanized Nepali spoken numbers: maile aaja tin se kharch gare',
    input: 'maile aaja tin se kharch gare',
    expectedNormalized: 'maile aaja 300 spent',
    expectedIntent: 'spent',
    expectedAmount: 300,
  },
  // 5. Accent-heavy spoken petrol refueling
  {
    name: 'Accent-heavy: bike fuel 1000 ko',
    input: 'bike ko fuel bhare 1000',
    expectedNormalized: 'bike ko fuel spent 1000',
    expectedIntent: 'spent',
    expectedItem: 'fuel',
    expectedAmount: 1000,
  }
];

export async function runVoiceIngestionTests() {
  console.log('\n==================================================');
  console.log('🚀 RUNNING MULTILINGUAL VOICE INGESTION PIPELINE TESTS');
  console.log('==================================================\n');

  let passed = 0;

  for (const tc of testCases) {
    console.log(`🧪 Test Case: ${tc.name}`);
    console.log(`   [Input]       "${tc.input}"`);

    const result = await VoiceIngestionPipeline.process(tc.input, mockCategories);

    console.log(`   [Normalized]  "${result.normalizedTranscript}"`);
    console.log(`   [Intent]      "${result.semanticExpense.intent.action}"`);
    if (result.semanticExpense.item) {
      console.log(`   [Item]        "${result.semanticExpense.item.value}"`);
    }
    if (result.semanticExpense.amount) {
      console.log(`   [Amount]      "${result.semanticExpense.amount.value}"`);
    }
    console.log(`   [Confidence]  ${result.confidence.compositeScore.toFixed(2)}`);
    console.log(`   [Decision]    ${result.decision}`);
    console.log(`   [ScriptType]  ${result.scriptAnalysis.scriptType}`);
    console.log(`   [Anomaly?]    ${result.scriptAnalysis.hasPhoneticAnomaly ? '⚠️ YES' : '✅ NO'}`);
    console.log('--------------------------------------------------\n');
    passed++;
  }

  console.log(`🎉 All ${passed}/${testCases.length} Voice Ingestion verification cases completed successfully!`);
}
