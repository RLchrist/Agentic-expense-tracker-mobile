import { useState, useRef, useCallback } from 'react'
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

interface UseVoiceRecorderOptions {
  /** Called immediately on every interim/final result — bypasses React state for zero-lag updates */
  onTranscript?: (text: string) => void
}

export function useVoiceRecorder(options?: UseVoiceRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [mode, setMode] = useState<'groq' | 'native'>('native')

  // Refs for tracking recording states
  const transcriptRef = useRef('')
  const endResolveRef = useRef<((value: string | null) => void) | null>(null)
  const activeModeRef = useRef<'groq' | 'native'>('native')

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

  const startRecording = useCallback(async () => {
    try {
      // 1. Determine active mode (Groq or Native STT)
      const netState = await NetInfo.fetch()
      const isOnline = netState.isConnected ?? false
      const hasApiKey = !!process.env.EXPO_PUBLIC_GROQ_API_KEY

      const selectedMode = isOnline && hasApiKey ? 'groq' : 'native'
      setMode(selectedMode)
      activeModeRef.current = selectedMode
      transcriptRef.current = ''

      if (selectedMode === 'groq') {
        // Groq Whisper Mode
        const perm = await requestRecordingPermissionsAsync()
        if (!perm.granted) {
          Alert.alert('Permission Denied', 'Microphone permission is required for voice input.')
          return false
        }

        await audioRecorder.prepareToRecordAsync()
        audioRecorder.record()
        setIsRecording(true)
        return true
      } else {
        // Native STT Fallback Mode
        const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
        if (!perm.granted) {
          Alert.alert('Permission Denied', 'Microphone permission is required for voice input.')
          return false
        }

        setIsRecording(true)
        ExpoSpeechRecognitionModule.start({
          lang: 'en-US',
          interimResults: true,
          continuous: true,
          maxAlternatives: 1,
          addsPunctuation: true,
          iosTaskHint: 'dictation',
        })
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
        const fileUri = audioRecorder.uri

        if (!fileUri) {
          throw new Error('No audio file was recorded')
        }

        setIsTranscribing(true)

        // Upload recorded file to Groq Whisper Large-v3-Turbo
        const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY
        const formData = new FormData()
        formData.append('file', {
          uri: fileUri,
          name: 'recording.m4a',
          type: 'audio/m4a',
        } as any)
        formData.append('model', 'whisper-large-v3-turbo')
        // Feed Whisper a bilingual contextual prompt of typical Nepali/English expenses to ensure perfect spelling, formatting, and language disambiguation
        formData.append('prompt', 'Spent 35 rupees on bus fare, milk 100 rupees, lunch 500, room rent 10000. म:म खाएको २०० रुपैयाँ, तरकारी किनेको ५० रुपैयाँ, बस भाडा ३५ रुपैयाँ, कोठा भाडा १०००० रुपैयाँ।')

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
          body: formData,
        })

        setIsTranscribing(false)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Groq transcription error response:', errorText)
          throw new Error(`Groq API returned status ${response.status}`)
        }

        const result = await response.json()
        return result.text || null
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
  }
}
