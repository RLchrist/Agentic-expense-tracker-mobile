import { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ActivityIndicator, Animated, Alert, TextInput, ScrollView,
  PanResponder, Dimensions, Platform
} from 'react-native'
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition'
import { COLORS, SPACING, PAYMENT_METHODS } from '../../constants'
import { parseExpenseFromText, ParsedExpense } from '../../services/ai/parseExpense'
import { useExpenseStore } from '../../store/expenseStore'
import { Category } from '../../types'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const MIN_SHEET_HEIGHT = SCREEN_HEIGHT * 0.6
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.92

interface Props {
  visible: boolean
  onClose: () => void
  onSaved: () => void
  initialParsed?: ParsedExpense | null
}

type Stage = 'idle' | 'recording' | 'transcribing' | 'parsing' | 'preview' | 'saving'

export default function VoiceExpenseModal({ visible, onClose, onSaved, initialParsed }: Props) {
  const { categories, addExpense } = useExpenseStore()
  const [stage, setStage] = useState<Stage>('idle')
  
  // Animation & Pan states
  const sheetHeight = useRef(new Animated.Value(MIN_SHEET_HEIGHT)).current
  const [isFullPage, setIsFullPage] = useState(false)

  useEffect(() => {
    if (initialParsed) {
      setParsed(initialParsed)
      setStage('preview')
      Animated.spring(sheetHeight, {
        toValue: SCREEN_HEIGHT * 0.8,
        useNativeDriver: false,
      }).start()
    }
  }, [initialParsed])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // dy is negative when pulling up
        const newHeight = Math.max(MIN_SHEET_HEIGHT, Math.min(MAX_SHEET_HEIGHT, MIN_SHEET_HEIGHT - gestureState.dy))
        sheetHeight.setValue(newHeight)
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50) {
          Animated.spring(sheetHeight, {
            toValue: MAX_SHEET_HEIGHT,
            useNativeDriver: false,
          }).start(() => setIsFullPage(true))
        } else if (gestureState.dy > 50) {
          if (isFullPage) {
            Animated.spring(sheetHeight, {
              toValue: MIN_SHEET_HEIGHT,
              useNativeDriver: false,
            }).start(() => setIsFullPage(false))
          } else {
            handleClose()
          }
        } else {
          Animated.spring(sheetHeight, {
            toValue: isFullPage ? MAX_SHEET_HEIGHT : MIN_SHEET_HEIGHT,
            useNativeDriver: false,
          }).start()
        }
      },
    })
  ).current
  
  const [textInput, setTextInput] = useState('')
  const [parsed, setParsed] = useState<ParsedExpense | null>(null)
  const [realtimeTranscript, setRealtimeTranscript] = useState('')
  const [isEditingCategory, setIsEditingCategory] = useState(false)
  const [isEditingPayment, setIsEditingPayment] = useState(false)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('📦')
  const [customPayments, setCustomPayments] = useState(PAYMENT_METHODS)
  const [isAddingPayment, setIsAddingPayment] = useState(false)
  const [newPaymentName, setNewPaymentName] = useState('')
  
  const recognitionActive = useRef(false)
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

  // Real-time speech recognition events
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript
    if (transcript) {
      setRealtimeTranscript(transcript)
      if (event.isFinal && stage === 'recording') {
        setStage('parsing')
        stopPulse()
        handleTranscriptionResult(transcript)
      }
    }
  })

  useSpeechRecognitionEvent('end', () => {
    if (stage === 'recording') {
      stopPulse()
      if (realtimeTranscript.trim()) {
        setStage('parsing')
        handleTranscriptionResult(realtimeTranscript)
      } else {
        setStage('idle')
      }
    }
  })

  useSpeechRecognitionEvent('error', (event) => {
    stopPulse()
    setStage('idle')
    const errorCode = String(event.error || '').toLowerCase();
    if (errorCode === 'no-speech' || errorCode === 'aborted' || errorCode.includes('abort')) {
      return
    }
    console.error('Speech recognition error:', event.error, event.message)
    Alert.alert('Voice Error', event.message || 'Could not recognize speech')
  })

  const startRecording = async () => {
    if (stage === 'recording') return
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
      if (!result.granted) {
        Alert.alert('Permission needed', 'Microphone and speech recognition permissions are required')
        return
      }

      setStage('recording')
      recognitionActive.current = true
      setRealtimeTranscript('')
      startPulse()

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      })
    } catch (e) {
      console.error('Recording failed', e)
      Alert.alert('Error', 'Could not start recording')
      setStage('idle')
      recognitionActive.current = false
    }
  }

  const stopRecording = () => {
    recognitionActive.current = false
    stopPulse()
    ExpoSpeechRecognitionModule.abort()
    setStage('idle')
  }

  const handleTranscriptionResult = async (text: string) => {
    try {
      const result = await parseExpenseFromText(text, categories)
      if (result) {
        setParsed(result)
        setStage('preview')
        Animated.spring(sheetHeight, { toValue: SCREEN_HEIGHT * 0.8, useNativeDriver: false }).start()
      } else {
        setStage('idle')
        Alert.alert('Error', 'Could not understand the expense.')
      }
    } catch (e) {
      console.error('Parsing failed', e)
      setStage('idle')
    }
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

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return
    const { addCategory } = useExpenseStore.getState()
    const newCat = await addCategory({
      name: newCatName,
      icon: newCatIcon,
      color: COLORS.primary,
    })
    if (newCat && parsed) {
      setParsed({ ...parsed, category_id: newCat.id, category_name: newCat.name })
      setIsAddingCategory(false)
      setIsEditingCategory(false)
      setNewCatName('')
    }
  }

  const handleAddCustomPayment = () => {
    if (!newPaymentName.trim()) return
    const newMethod = { label: newPaymentName, value: newPaymentName.toLowerCase().replace(/\s+/g, '_'), icon: '💳' }
    setCustomPayments(prev => [...prev, newMethod])
    if (parsed) {
      setParsed({ ...parsed, payment_method: newMethod.label })
    }
    setIsAddingPayment(false)
    setIsEditingPayment(false)
    setNewPaymentName('')
  }

  const handleClose = () => {
    setStage('idle')
    setTextInput('')
    setParsed(null)
    sheetHeight.setValue(MIN_SHEET_HEIGHT)
    setIsFullPage(false)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
          <View style={styles.handleContainer} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>
          <View style={styles.header}>
            <Text style={styles.title}>
              {stage === 'preview' ? '✨ AI Parsed Expense' : '🤖 AI Expense Input'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {stage !== 'preview' && (
              <View style={styles.voiceSection}>
                <Animated.View style={[styles.micOuter, { transform: [{ scale: pulseAnim }] }]}>
                  <TouchableOpacity
                    style={[styles.micBtn, stage === 'recording' && styles.micBtnRecording]}
                    onPress={stage === 'recording' ? stopRecording : startRecording}
                    disabled={stage === 'transcribing' || stage === 'parsing'}
                  >
                    <Text style={styles.micIcon}>{stage === 'recording' ? '⏹️' : '🎙️'}</Text>
                  </TouchableOpacity>
                </Animated.View>

                {realtimeTranscript !== '' && (
                  <View style={styles.realtimeContainer}>
                    <Text style={styles.realtimeText}>{realtimeTranscript}</Text>
                  </View>
                )}

                <Text style={styles.voiceHint}>
                  {stage === 'idle' && 'Tap mic and say your expense'}
                  {stage === 'recording' && 'Listening...'}
                  {stage === 'parsing' && 'AI is parsing...'}
                </Text>
                {stage === 'parsing' && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />}
              </View>
            )}

            {stage === 'preview' && parsed && (
              <View style={styles.preview}>
                <View style={styles.previewCard}>
                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>📝 Title</Text>
                    <TextInput
                      style={styles.editInput}
                      value={parsed.title}
                      onChangeText={(t) => setParsed({ ...parsed, title: t })}
                    />
                  </View>
                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>💰 Amount</Text>
                    <TextInput
                      style={[styles.editInput, styles.amountInput]}
                      value={String(parsed.amount)}
                      keyboardType="numeric"
                      onChangeText={(t) => setParsed({ ...parsed, amount: Number(t) || 0 })}
                    />
                  </View>
                  <TouchableOpacity style={styles.editRow} onPress={() => setIsEditingCategory(true)}>
                    <Text style={styles.editLabel}>🏷️ Category</Text>
                    <Text style={styles.editValue}>{parsed.category_name || 'Select'}</Text>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>📅 Date</Text>
                    <TextInput
                      style={styles.editInput}
                      value={parsed.expense_date}
                      onChangeText={(t) => setParsed({ ...parsed, expense_date: t })}
                    />
                  </View>
                  <TouchableOpacity style={styles.editRow} onPress={() => setIsEditingPayment(true)}>
                    <Text style={styles.editLabel}>💳 Payment</Text>
                    <Text style={styles.editValue}>{parsed.payment_method}</Text>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                </View>

                {/* Sub-modals for selection */}
                {isEditingCategory && (
                  <View style={styles.selectionOverlay}>
                    <View style={styles.selectionSheet}>
                      <Text style={styles.selectionTitle}>Select Category</Text>
                      <ScrollView style={{maxHeight: 300}}>
                        {categories.map(cat => (
                          <TouchableOpacity key={cat.id} style={styles.selectionItem} onPress={() => { setParsed({...parsed, category_id: cat.id, category_name: cat.name}); setIsEditingCategory(false) }}>
                            <Text style={styles.itemIcon}>{cat.icon}</Text>
                            <Text style={styles.itemLabel}>{cat.name}</Text>
                          </TouchableOpacity>
                        ))}
                        {isAddingCategory ? (
                          <View style={styles.newItemForm}>
                            <TextInput style={styles.newItemInput} value={newCatName} onChangeText={setNewCatName} placeholder="Category Name" placeholderTextColor="#999" />
                            <TouchableOpacity style={styles.addConfirmBtn} onPress={handleCreateCategory}><Text style={styles.addConfirmText}>Create</Text></TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddingCategory(true)}><Text style={styles.addBtnText}>+ New Category</Text></TouchableOpacity>
                        )}
                      </ScrollView>
                      <TouchableOpacity onPress={() => setIsEditingCategory(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                    </View>
                  </View>
                )}

                {isEditingPayment && (
                  <View style={styles.selectionOverlay}>
                    <View style={styles.selectionSheet}>
                      <Text style={styles.selectionTitle}>Select Payment</Text>
                      <ScrollView style={{maxHeight: 300}}>
                        {customPayments.map(p => (
                          <TouchableOpacity key={p.value} style={styles.selectionItem} onPress={() => { setParsed({...parsed, payment_method: p.label}); setIsEditingPayment(false) }}>
                            <Text style={styles.itemIcon}>{p.icon}</Text>
                            <Text style={styles.itemLabel}>{p.label}</Text>
                          </TouchableOpacity>
                        ))}
                        {isAddingPayment ? (
                          <View style={styles.newItemForm}>
                            <TextInput style={styles.newItemInput} value={newPaymentName} onChangeText={setNewPaymentName} placeholder="Payment Name" placeholderTextColor="#999" />
                            <TouchableOpacity style={styles.addConfirmBtn} onPress={handleAddCustomPayment}><Text style={styles.addConfirmText}>Add</Text></TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddingPayment(true)}><Text style={styles.addBtnText}>+ Custom Payment</Text></TouchableOpacity>
                        )}
                      </ScrollView>
                      <TouchableOpacity onPress={() => setIsEditingPayment(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.previewActions}>
                  <TouchableOpacity style={styles.retryBtn} onPress={() => setStage('idle')}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveBtnText}>Save ✓</Text></TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, paddingBottom: 40 },
  handleContainer: { width: '100%', height: 30, justifyContent: 'center', alignItems: 'center', marginTop: -10 },
  handle: { width: 40, height: 5, backgroundColor: COLORS.border, borderRadius: 3 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  closeBtn: { color: COLORS.textSecondary, fontSize: 20 },
  voiceSection: { alignItems: 'center', paddingVertical: 20 },
  micOuter: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary + '22', justifyContent: 'center', alignItems: 'center' },
  micBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  micBtnRecording: { backgroundColor: COLORS.error },
  micIcon: { fontSize: 30 },
  realtimeContainer: { width: '100%', padding: 15, backgroundColor: COLORS.background, borderRadius: 12, marginVertical: 20 },
  realtimeText: { color: COLORS.text, fontSize: 16, textAlign: 'center' },
  voiceHint: { color: COLORS.textSecondary, marginTop: 10 },
  preview: { gap: 15 },
  previewCard: { backgroundColor: COLORS.background, borderRadius: 12, padding: 15, borderWidth: 1, borderColor: COLORS.border },
  editRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  editLabel: { width: 80, color: COLORS.textSecondary, fontSize: 13 },
  editInput: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '500' },
  amountInput: { fontSize: 18, color: COLORS.primary, fontWeight: 'bold' },
  editValue: { flex: 1, color: COLORS.text, fontSize: 15 },
  chevron: { color: COLORS.textSecondary, fontSize: 18 },
  previewActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  retryBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  retryText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 2, padding: 15, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveBtnText: { color: COLORS.white, fontWeight: 'bold' },
  selectionOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20, zIndex: 1000 },
  selectionSheet: { backgroundColor: COLORS.surface, borderRadius: 15, padding: 20 },
  selectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  selectionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemIcon: { fontSize: 20, marginRight: 15 },
  itemLabel: { color: COLORS.text, fontSize: 16 },
  cancelText: { color: COLORS.error, textAlign: 'center', marginTop: 15, fontWeight: '600' },
  addBtn: { padding: 12, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.primary, marginTop: 10, alignItems: 'center' },
  addBtnText: { color: COLORS.primary, fontWeight: '600' },
  newItemForm: { marginTop: 10, padding: 10, backgroundColor: COLORS.background, borderRadius: 8 },
  newItemInput: { color: COLORS.text, borderBottomWidth: 1, borderBottomColor: COLORS.primary, paddingVertical: 5, marginBottom: 10 },
  addConfirmBtn: { backgroundColor: COLORS.primary, padding: 8, borderRadius: 5, alignItems: 'center' },
  addConfirmText: { color: COLORS.white, fontWeight: 'bold' }
})