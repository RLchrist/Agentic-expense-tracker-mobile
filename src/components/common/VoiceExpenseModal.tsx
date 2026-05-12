import { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ActivityIndicator, Animated, Alert, TextInput, ScrollView
} from 'react-native'
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio'
import { COLORS, SPACING } from '../../constants'
import { parseExpenseFromText, ParsedExpense } from '../../services/ai/parseExpense'
import { useExpenseStore } from '../../store/expenseStore'

interface Props {
  visible: boolean
  onClose: () => void
  onSaved: () => void
}

type Stage = 'idle' | 'recording' | 'transcribing' | 'parsing' | 'preview' | 'saving'

export default function VoiceExpenseModal({ visible, onClose, onSaved }: Props) {
  const { categories, addExpense } = useExpenseStore()
  const [stage, setStage] = useState<Stage>('idle')
  const [textInput, setTextInput] = useState('')
  const [parsed, setParsed] = useState<ParsedExpense | null>(null)
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')
  const pulseAnim = useRef(new Animated.Value(1)).current

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start()
  }

  const stopPulse = () => {
    pulseAnim.stopAnimation()
    pulseAnim.setValue(1)
  }

 const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)

const startRecording = async () => {
  try {
    const status = await AudioModule.requestRecordingPermissionsAsync()
    if (!status.granted) {
      Alert.alert('Permission needed', 'Microphone permission is required')
      return
    }
    await audioRecorder.record()
    setStage('recording')
    startPulse()
  } catch (e) {
    Alert.alert('Error', 'Could not start recording')
  }
}

const stopRecording = async () => {
  stopPulse()
  setStage('transcribing')
  try {
    await audioRecorder.stop()
    setStage('idle')
    setInputMode('text')
    Alert.alert(
      'Voice recorded! 🎙️',
      'Type what you said to parse it with AI',
      [{ text: 'OK' }]
    )
  } catch (e) {
    Alert.alert('Error', 'Recording failed')
    setStage('idle')
  }
}

  const parseWithAI = async (text: string) => {
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter some text')
      return
    }

    setStage('parsing')
    const result = await parseExpenseFromText(text, categories)

    if (!result) {
      Alert.alert('Error', 'Could not parse expense. Try again.')
      setStage('idle')
      return
    }

    setParsed(result)
    setStage('preview')
  }

  const handleSave = async () => {
    if (!parsed) return
    setStage('saving')

    await addExpense({
      title: parsed.title,
      amount: parsed.amount,
      currency: 'NPR',
      category_id: parsed.category_id,
      note: parsed.note,
      receipt_url: null,
      expense_date: parsed.expense_date,
      payment_method: parsed.payment_method,
      is_synced: true,
      local_id: null,
    })

    setStage('idle')
    setTextInput('')
    setParsed(null)
    onSaved()
    onClose()
  }

  const handleClose = () => {
    setStage('idle')
    setTextInput('')
    setParsed(null)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {stage === 'preview' ? '✨ AI Parsed Expense' : '🤖 AI Expense Input'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Mode toggle */}
            {stage === 'idle' && (
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeBtn, inputMode === 'voice' && styles.modeBtnActive]}
                  onPress={() => setInputMode('voice')}
                >
                  <Text style={styles.modeBtnText}>🎙️ Voice</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, inputMode === 'text' && styles.modeBtnActive]}
                  onPress={() => setInputMode('text')}
                >
                  <Text style={styles.modeBtnText}>⌨️ Text</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Voice mode */}
            {inputMode === 'voice' && stage !== 'preview' && (
              <View style={styles.voiceSection}>
                <Animated.View style={[styles.micOuter, { transform: [{ scale: pulseAnim }] }]}>
                  <TouchableOpacity
                    style={[styles.micBtn, stage === 'recording' && styles.micBtnRecording]}
                    onPress={stage === 'recording' ? stopRecording : startRecording}
                    disabled={stage === 'transcribing' || stage === 'parsing'}
                  >
                    <Text style={styles.micIcon}>
                      {stage === 'recording' ? '⏹️' : '🎙️'}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>

                <Text style={styles.voiceHint}>
                  {stage === 'idle' && 'Tap mic and say your expense'}
                  {stage === 'recording' && '🔴 Recording... tap to stop'}
                  {stage === 'transcribing' && 'Processing audio...'}
                  {stage === 'parsing' && 'AI is parsing...'}
                </Text>

                {(stage === 'transcribing' || stage === 'parsing') && (
                  <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.md }} />
                )}
              </View>
            )}

            {/* Text mode */}
            {inputMode === 'text' && stage !== 'preview' && stage !== 'saving' && (
              <View style={styles.textSection}>
                <Text style={styles.textHint}>
                  Describe your expense naturally:
                </Text>
                <Text style={styles.example}>
                  e.g. "Spent 250 on lunch at Thamel" or "Bus fare 30 rupees"
                </Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Type your expense here..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={textInput}
                  onChangeText={setTextInput}
                  multiline
                  numberOfLines={3}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.parseBtn, stage === 'parsing' && styles.parseBtnDisabled]}
                  onPress={() => parseWithAI(textInput)}
                  disabled={stage === 'parsing'}
                >
                  {stage === 'parsing'
                    ? <ActivityIndicator color={COLORS.white} />
                    : <Text style={styles.parseBtnText}>✨ Parse with AI</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* AI Preview */}
            {stage === 'preview' && parsed && (
              <View style={styles.preview}>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceText}>
                    {Math.round(parsed.confidence * 100)}% confident
                  </Text>
                </View>

                <View style={styles.previewCard}>
                  <PreviewRow label="📝 Title" value={parsed.title} />
                  <PreviewRow
                    label="💰 Amount"
                    value={`Rs. ${parsed.amount.toLocaleString('en-NP')}`}
                    highlight
                  />
                  <PreviewRow label="🏷️ Category" value={parsed.category_name} />
                  <PreviewRow label="📅 Date" value={parsed.expense_date} />
                  <PreviewRow label="💳 Payment" value={parsed.payment_method} />
                  {parsed.note && <PreviewRow label="📌 Note" value={parsed.note} />}
                </View>

                <View style={styles.previewActions}>
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => { setParsed(null); setStage('idle') }}
                  >
                    <Text style={styles.retryText}>← Try Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, stage === 'saving' && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={stage === 'saving'}
                  >
                    {stage === 'saving'
                      ? <ActivityIndicator color={COLORS.white} />
                      : <Text style={styles.saveBtnText}>Save Expense ✓</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function PreviewRow({
  label, value, highlight
}: {
  label: string; value: string; highlight?: boolean
}) {
  return (
    <View style={previewStyles.row}>
      <Text style={previewStyles.label}>{label}</Text>
      <Text style={[previewStyles.value, highlight && previewStyles.highlight]}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: SPACING.lg,
    maxHeight: '90%', minHeight: '60%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: COLORS.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SPACING.lg,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  closeBtn: { color: COLORS.textSecondary, fontSize: 20, padding: SPACING.xs },
  modeToggle: {
    flexDirection: 'row', backgroundColor: COLORS.background,
    borderRadius: 12, padding: 4, marginBottom: SPACING.lg,
  },
  modeBtn: {
    flex: 1, padding: SPACING.sm, borderRadius: 10, alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: COLORS.primary },
  modeBtnText: { color: COLORS.text, fontWeight: '600' },
  voiceSection: { alignItems: 'center', paddingVertical: SPACING.xl },
  micOuter: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.primary + '22',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  micBtn: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  micBtnRecording: { backgroundColor: COLORS.error },
  micIcon: { fontSize: 36 },
  voiceHint: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center' },
  textSection: { gap: SPACING.md },
  textHint: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  example: {
    color: COLORS.textSecondary, fontSize: 13,
    fontStyle: 'italic', marginTop: -SPACING.xs,
  },
  textArea: {
    backgroundColor: COLORS.background, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, color: COLORS.text,
    fontSize: 16, minHeight: 90, textAlignVertical: 'top',
  },
  parseBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    padding: SPACING.md, alignItems: 'center',
  },
  parseBtnDisabled: { opacity: 0.7 },
  parseBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  preview: { gap: SPACING.md },
  confidenceBadge: {
    alignSelf: 'center', backgroundColor: COLORS.success + '33',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.success,
  },
  confidenceText: { color: COLORS.success, fontWeight: '600', fontSize: 13 },
  previewCard: {
    backgroundColor: COLORS.background, borderRadius: 14,
    padding: SPACING.md, gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  previewActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  retryBtn: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 12,
    padding: SPACING.md, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  retryText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: {
    flex: 2, backgroundColor: COLORS.primary,
    borderRadius: 12, padding: SPACING.md, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
})

const previewStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: SPACING.xs,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  label: { color: COLORS.textSecondary, fontSize: 14 },
  value: { color: COLORS.text, fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },
  highlight: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold' },
})