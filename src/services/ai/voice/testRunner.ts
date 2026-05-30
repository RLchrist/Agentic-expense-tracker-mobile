import { runVoiceIngestionTests } from './voiceIngestionPipeline.test';

// Run immediately if this file is imported or run programmatically
runVoiceIngestionTests()
  .then(() => {
    console.log('✅ Ingestion Pipeline Verification Complete.');
  })
  .catch((err) => {
    console.error('❌ Pipeline Verification Failed:', err);
  });
