import { useState, useRef, useCallback, useEffect } from 'react'
import { Alert, Platform } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition'
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorderState,
} from 'expo-audio'
import { analyzeTranscript } from '../utils/transcriptAnalyzer'

interface UseVoiceRecorderOptions {
  /** Called immediately on every interim/final result — bypasses React state for zero-lag updates */
  onTranscript?: (text: string) => void
}

// Comprehensive bilingual prompt covering diverse expense verbs and items.
// English section: covers spent, purchased, bought, paid, had, ordered, got, took — all common synonyms.
// Nepali section: covers खर्च गरेँ (spent), किनेको (bought), तिरेको (paid), खाएको (ate/had).
// Whisper uses this as "fake previous context" to prime the decoder's language and vocabulary.
// Max 224 tokens — this prompt is ~80 tokens, well within limits.
const WHISPER_PROMPT =
  'Spent 50 rupees on snacks. Purchased 5 liters of petrol at 120 rupees per liter. ' +
  'Bought vegetables for 200. Paid 1500 for electricity bill. Had lunch for 350 rupees. ' +
  'Ordered coffee for 80. Got a haircut for 150 rupees. Took a cab for 250. ' +
  'म:म खाएको २०० रुपैयाँ। तरकारी किनेको ५०। बस भाडा ३५ रुपैयाँ। कोठा भाडा तिरेको १००००।'

export function useVoiceRecorder(options?: UseVoiceRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [mode, setMode] = useState<'groq' | 'native'>('native')

  // Refs for tracking recording states
  const transcriptRef = useRef('')
  const endResolveRef = useRef<((value: string | null) => void) | null>(null)
  const activeModeRef = useRef<'groq' | 'native'>('native')
  const isPreparedRef = useRef(false)

  // --- CACHED VALUES FOR SUB-MILLISECOND START ---
  // NetInfo.fetch() is async (50-200ms). Cache it so we never block on it in the critical path.
  const netStateRef = useRef({ isConnected: true })
  // Cache permission grants so we don't re-ask on every tap
  const permGrantedRef = useRef(false)
  const nativePermGrantedRef = useRef(false)

  // Initialize cached network state once and keep it fresh via a listener
  useEffect(() => {
    NetInfo.fetch().then((s) => {
      netStateRef.current = { isConnected: s.isConnected ?? true }
    })
    const unsub = NetInfo.addEventListener((s) => {
      netStateRef.current = { isConnected: s.isConnected ?? true }
    })
    return () => unsub()
  }, [])

  // Initialize the high-quality audio recorder for Groq Whisper with hardware metering enabled
  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  })

  // Poll state every 100ms for high-frequency waveform updates
  const recorderState = useAudioRecorderState(audioRecorder, 100)

  // Direct callback invocation for native STT — no intermediate state, zero extra renders
  const onTranscriptRef = useRef(options?.onTranscript)
  onTranscriptRef.current = options?.onTranscript

  useSpeechRecognitionEvent('result', (event) => {
    // Only process native STT results if we are actively in native mode
    if (activeModeRef.current !== 'native') return

    const text = event.results[0]?.transcript
    if (text) {
      transcriptRef.current = text
      onTranscriptRef.current?.(text)
    }
  })

  useSpeechRecognitionEvent('end', () => {
    if (activeModeRef.current === 'native') {
      setIsRecording(false)
      endResolveRef.current?.(transcriptRef.current || null)
      endResolveRef.current = null
    }
  })

  useSpeechRecognitionEvent('error', (event) => {
    if (activeModeRef.current !== 'native') return

    setIsRecording(false)
    endResolveRef.current?.(transcriptRef.current || null)
    endResolveRef.current = null

    const code = String(event.error || '').toLowerCase()
    if (code === 'no-speech' || code === 'aborted' || code.includes('abort')) return

    if (code === 'language-not-supported' || code === 'network') {
      Alert.alert(
        'Voice Unavailable',
        "Speech recognition needs an internet connection, or download the English language pack in your device's Settings > Google > Voice > Offline Speech Recognition."
      )
      return
    }
    console.error('Speech error:', event.error, event.message)
  })

  /**
   * Calls the Groq Whisper API with the given parameters.
   * Extracted as a helper so the retry path can reuse it with `language: 'en'`.
   */
  const callWhisperAPI = async (
    fileUri: string,
    apiKey: string,
    forcedLanguage?: string
  ): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', {
      uri: fileUri,
      name: 'recording.m4a',
      type: 'audio/m4a',
    } as any)
    formData.append('model', 'whisper-large-v3-turbo')
    formData.append('prompt', WHISPER_PROMPT)
    if (forcedLanguage) {
      formData.append('language', forcedLanguage)
    }

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Groq transcription error:', errorText)
      throw new Error(`Groq API returned status ${response.status}`)
    }

    const result = await response.json()
    return result.text || null
  }

  /**
   * Pre-warms microphone permissions and pre-initializes recording hardware
   * to eliminate critical-path startup delays when the user eventually taps the mic.
   */
  const preWarmRecorder = useCallback(async () => {
    try {
      if (isPreparedRef.current) return
      const perm = await requestRecordingPermissionsAsync()
      if (perm.granted) {
        permGrantedRef.current = true
        await audioRecorder.prepareToRecordAsync()
        isPreparedRef.current = true
      }
    } catch (e) {
      console.warn('[VoiceRecorder] Pre-warming audio hardware silent fail:', e)
    }
  }, [audioRecorder])

  const startRecording = useCallback(async () => {
    // No "activating" state — we start recording immediately for zero-lag perception.
    // Hardware initialization happens behind the scenes; failures surface as errors.
    try {
      // Use cached NetInfo (updated by listener) — never blocks on async fetch
      const isOnline = netStateRef.current.isConnected
      const hasApiKey = !!process.env.EXPO_PUBLIC_GROQ_API_KEY

      const selectedMode = isOnline && hasApiKey ? 'groq' : 'native'
      setMode(selectedMode)
      activeModeRef.current = selectedMode
      transcriptRef.current = ''

      if (selectedMode === 'groq') {
        // Only request permission if not already granted by preWarmRecorder
        if (!permGrantedRef.current) {
          const perm = await requestRecordingPermissionsAsync()
          if (!perm.granted) {
            Alert.alert('Permission Denied', 'Microphone permission is required for voice input.')
            return false
          }
          permGrantedRef.current = true
        }

        if (!isPreparedRef.current) {
          try {
            await audioRecorder.prepareToRecordAsync()
            isPreparedRef.current = true
          } catch {
            // Already prepared — safe to proceed
            isPreparedRef.current = true
          }
        }

        audioRecorder.record()
        setIsRecording(true)
        return true
      } else {
        if (!nativePermGrantedRef.current) {
          const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
          if (!perm.granted) {
            Alert.alert('Permission Denied', 'Microphone permission is required for voice input.')
            return false
          }
          nativePermGrantedRef.current = true
        }

        ExpoSpeechRecognitionModule.start({
          lang: 'en-US',
          interimResults: true,
          continuous: true,
          maxAlternatives: 1,
          addsPunctuation: true,
          iosTaskHint: 'dictation',
        })
        setIsRecording(true)
        return true
      }
    } catch (e) {
      console.error('Failed to start recording:', e)
      Alert.alert('Error', 'Could not start voice input')
      return false
    }
  }, [audioRecorder])

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (activeModeRef.current === 'groq') {
      // Groq Stop & Transcribe
      try {
        setIsRecording(false)
        await audioRecorder.stop()
        isPreparedRef.current = false
        const fileUri = audioRecorder.uri

        if (!fileUri) {
          throw new Error('No audio file was recorded')
        }

        setIsTranscribing(true)

        const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY!

        // --- Layer 1: Transcribe with auto-detect + comprehensive prompt ---
        let transcript = await callWhisperAPI(fileUri, apiKey)

        // --- Layer 2: Script anomaly detection + conditional retry ---
        if (transcript) {
          const analysis = analyzeTranscript(transcript)

          if (analysis.shouldRetryAsEnglish) {
            console.log(
              `[VoiceRecorder] Mixed-script anomaly detected (Devanagari: ${(analysis.devanagariRatio * 100).toFixed(1)}%, Latin: ${(analysis.latinRatio * 100).toFixed(1)}%). Retrying with language=en...`
            )
            try {
              const retryTranscript = await callWhisperAPI(fileUri, apiKey, 'en')
              if (retryTranscript) {
                transcript = retryTranscript
              }
            } catch (retryErr) {
              // If retry fails, use the original transcript — better than nothing
              console.warn('[VoiceRecorder] English retry failed, using original:', retryErr)
            }
          }
        }

        setIsTranscribing(false)
        return transcript
      } catch (err) {
        setIsTranscribing(false)
        console.error('Groq Whisper transcription failed:', err)
        Alert.alert('Transcription Failed', 'Could not transcribe audio using Groq Whisper.')
        return null
      }
    } else {
      // Native STT Stop Fallback
      return new Promise((resolve) => {
        endResolveRef.current = resolve
        ExpoSpeechRecognitionModule.stop()
        setTimeout(() => {
          if (endResolveRef.current) {
            endResolveRef.current = null
            setIsRecording(false)
            resolve(transcriptRef.current || null)
          }
        }, 2000)
      })
    }
  }, [audioRecorder])

  return {
    isRecording,
    isTranscribing,
    mode,
    metering: recorderState.metering,
    startRecording,
    stopRecording,
    preWarmRecorder,
  }
}
