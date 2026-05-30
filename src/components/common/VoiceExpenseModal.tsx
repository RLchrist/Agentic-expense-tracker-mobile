import { useState, useRef, useEffect } from 'react'
import {
  View, Text, Modal, TouchableOpacity,
  ActivityIndicator, Animated, Alert, TextInput, ScrollView,
  PanResponder, Dimensions
} from 'react-native'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import { 
  Sparkles, X, Mic, Square, FileText, 
  Wallet, Tag, Calendar, CreditCard, 
  ChevronRight, Check, Plus, Trash2 
} from 'lucide-react-native'
import { PAYMENT_METHODS } from '../../constants'
import { useAppTheme } from '../../hooks/useAppTheme'
import { ParsedExpense, parseExpenseFromText } from '../../services/ai/parseExpense'
import { useExpenseStore } from '../../store/expenseStore'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const MIN_SHEET_HEIGHT = SCREEN_HEIGHT * 0.6
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.92

interface Props {
  visible: boolean
  onClose: () => void
  onSaved: () => void
  initialParsed?: ParsedExpense | null
}

type Stage = 'idle' | 'recording' | 'parsing' | 'preview' | 'saving'

export default function VoiceExpenseModal({ visible, onClose, onSaved, initialParsed }: Props) {
  const { colors } = useAppTheme()
  const { categories, addExpense } = useExpenseStore()
  const { isOffline } = useNetworkStatus()
  const [stage, setStage] = useState<Stage>('idle')
  
  // Animation & Pan states
  const sheetHeight = useRef(new Animated.Value(MIN_SHEET_HEIGHT)).current
  const [isFullPage, setIsFullPage] = useState(false)

  const { isRecording, startRecording: triggerStartRecording, stopRecording: triggerStopRecording, preWarmRecorder } = useVoiceRecorder()

  // Pre-warm mic when the modal opens to minimize spin-up delay
  useEffect(() => {
    if (visible) {
      preWarmRecorder()
    }
  }, [visible, preWarmRecorder])

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
  
  const [parsed, setParsed] = useState<ParsedExpense | null>(null)
  const [isEditingCategory, setIsEditingCategory] = useState(false)
  const [isEditingPayment, setIsEditingPayment] = useState(false)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon] = useState('📦')
  const [customPayments, setCustomPayments] = useState(PAYMENT_METHODS)
  const [isAddingPayment, setIsAddingPayment] = useState(false)
  const [newPaymentName, setNewPaymentName] = useState('')
  
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

  const startRecording = async () => {
    // Show recording UI immediately — zero-lag perception like Gemini.
    // Hardware init happens behind the scenes; errors surface after if needed.
    setStage('recording')
    startPulse()
    try {
      const success = await triggerStartRecording()
      if (!success) {
        setStage('idle')
        stopPulse()
      }
    } catch (e) {
      console.error('Failed to start recording', e)
      setStage('idle')
      stopPulse()
      Alert.alert('Error', 'Could not start recording')
    }
  }

  const stopRecording = async () => {
    stopPulse()
    try {
      const text = await triggerStopRecording()
      if (!text) {
        setStage('idle')
        return
      }

      setStage('parsing')

      const result = await parseExpenseFromText(text, categories)

      if (!result) {
        setStage('idle')
        Alert.alert(
          'Could not understand',
          'Please try again or type your expense instead.',
          [{ text: 'OK' }]
        )
        return
      }

      setParsed(result)
      setStage('preview')
      Animated.spring(sheetHeight, { toValue: SCREEN_HEIGHT * 0.8, useNativeDriver: false }).start()

    } catch (e) {
      console.error('Voice processing error:', e)
      setStage('idle')
      Alert.alert(
        'Voice Error',
        'Could not process your speech. Please type your expense instead.',
        [{ text: 'OK' }]
      )
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
      is_recurring: false,
      recurring_period: null,
      local_id: null,
    })

    setStage('idle')
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
      color: colors.primary,
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
    setParsed(null)
    if (isRecording) {
      triggerStopRecording().catch(() => {})
    }
    sheetHeight.setValue(MIN_SHEET_HEIGHT)
    setIsFullPage(false)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <Animated.View className="bg-surface rounded-t-[24px] p-6 pb-10" style={{ height: sheetHeight }}>
          <View className="w-full h-[30px] justify-center items-center -mt-2.5" {...panResponder.panHandlers}>
            <View className="w-10 h-1.5 bg-border rounded-full" />
          </View>
          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center gap-2">
              <Sparkles size={20} className="text-primary" />
              <Text className="text-lg font-bold text-text">
                {stage === 'preview' ? 'AI Parsed Expense' : 'AI Expense Input'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} className="text-textSecondary" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {stage !== 'preview' && (
              <View className="items-center py-5">
                <Animated.View className="w-20 h-20 rounded-full bg-primary/15 justify-center items-center" style={{ transform: [{ scale: pulseAnim }] }}>
                  <TouchableOpacity
                    className={`w-[60px] h-[60px] rounded-full bg-primary justify-center items-center ${stage === 'recording' ? 'bg-error' : ''}`}
                    onPress={stage === 'recording' ? stopRecording : startRecording}
                    disabled={stage === 'parsing'}
                    style={{ opacity: stage === 'parsing' ? 0.6 : 1 }}
                  >
                    {stage === 'recording' ? (
                      <Square size={30} className="text-white" />
                    ) : (
                      <Mic size={30} className="text-white" />
                    )}
                  </TouchableOpacity>
                </Animated.View>

                <Text className="text-textSecondary mt-4 text-center">
                  {stage === 'idle' && 'Tap mic and say your expense'}
                  {stage === 'recording' && '🔴 Recording... tap to stop'}
                  {stage === 'parsing' && '✨ AI is parsing...'}
                </Text>
                {stage === 'parsing' && <ActivityIndicator className="text-primary mt-5" />}
              </View>
            )}

            {stage === 'preview' && parsed && (
              <View className="gap-4">
                <View className="bg-background rounded-xl p-4 border border-border">
                  <View className="flex-row items-center py-2.5 border-b border-border">
                    <View className="w-24 flex-row items-center gap-1.5">
                      <FileText size={14} className="text-textSecondary" />
                      <Text className="text-textSecondary text-[13px]">Title</Text>
                    </View>
                    <TextInput
                      className="flex-1 text-text text-[15px] font-medium"
                      value={parsed.title}
                      onChangeText={(t) => setParsed({ ...parsed, title: t })}
                    />
                  </View>
                  <View className="flex-row items-center py-2.5 border-b border-border">
                    <View className="w-24 flex-row items-center gap-1.5">
                      <Wallet size={14} className="text-textSecondary" />
                      <Text className="text-textSecondary text-[13px]">Amount</Text>
                    </View>
                    <TextInput
                      className="flex-1 text-lg text-primary font-bold"
                      value={String(parsed.amount)}
                      keyboardType="numeric"
                      onChangeText={(t) => setParsed({ ...parsed, amount: Number(t) || 0 })}
                    />
                  </View>
                  <TouchableOpacity className="flex-row items-center py-2.5 border-b border-border" onPress={() => setIsEditingCategory(true)}>
                    <View className="w-24 flex-row items-center gap-1.5">
                      <Tag size={14} className="text-textSecondary" />
                      <Text className="text-textSecondary text-[13px]">Category</Text>
                    </View>
                    <Text className="flex-1 text-text text-[15px]">{parsed.category_name || 'Select'}</Text>
                    <ChevronRight size={18} className="text-textSecondary" />
                  </TouchableOpacity>
                  <View className="flex-row items-center py-2.5 border-b border-border">
                    <View className="w-24 flex-row items-center gap-1.5">
                      <Calendar size={14} className="text-textSecondary" />
                      <Text className="text-textSecondary text-[13px]">Date</Text>
                    </View>
                    <TextInput
                      className="flex-1 text-text text-[15px] font-medium"
                      value={parsed.expense_date}
                      onChangeText={(t) => setParsed({ ...parsed, expense_date: t })}
                    />
                  </View>
                  <TouchableOpacity className="flex-row items-center py-2.5 border-b border-border" onPress={() => setIsEditingPayment(true)}>
                    <View className="w-24 flex-row items-center gap-1.5">
                      <CreditCard size={14} className="text-textSecondary" />
                      <Text className="text-textSecondary text-[13px]">Payment</Text>
                    </View>
                    <Text className="flex-1 text-text text-[15px]">{parsed.payment_method}</Text>
                    <ChevronRight size={18} className="text-textSecondary" />
                  </TouchableOpacity>
                </View>

                {/* Sub-modals for selection */}
                {isEditingCategory && (
                  <View className="absolute inset-0 bg-black/80 justify-center p-5 z-[1000]">
                    <View className="bg-surface rounded-[15px] p-5">
                      <Text className="text-text text-lg font-bold mb-4 text-center">Select Category</Text>
                      <ScrollView style={{maxHeight: 300}}>
                        {categories.map(cat => (
                          <TouchableOpacity key={cat.id} className="flex-row items-center py-3 border-b border-border" onPress={() => { setParsed({...parsed, category_id: cat.id, category_name: cat.name}); setIsEditingCategory(false) }}>
                            <Text className="text-xl mr-4">{cat.icon}</Text>
                            <Text className="text-text text-base">{cat.name}</Text>
                          </TouchableOpacity>
                        ))}
                        {isAddingCategory ? (
                          <View className="mt-2.5 p-2.5 bg-background rounded-lg">
                            <TextInput className="text-text border-b border-primary py-1 mb-2.5" value={newCatName} onChangeText={setNewCatName} placeholder="Category Name" placeholderTextColor="#999" />
                            <TouchableOpacity className="bg-primary p-2 rounded-md items-center" onPress={handleCreateCategory}><Text className="text-white font-bold">Create</Text></TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity className="p-3 rounded-lg border border-dashed border-primary mt-2.5 items-center flex-row justify-center gap-2" onPress={() => setIsAddingCategory(true)}>
                            <Plus size={16} className="text-primary" />
                            <Text className="text-primary font-semibold">New Category</Text>
                          </TouchableOpacity>
                        )}
                      </ScrollView>
                      <TouchableOpacity onPress={() => setIsEditingCategory(false)}><Text className="text-error text-center mt-4 font-semibold">Cancel</Text></TouchableOpacity>
                    </View>
                  </View>
                )}

                {isEditingPayment && (
                  <View className="absolute inset-0 bg-black/80 justify-center p-5 z-[1000]">
                    <View className="bg-surface rounded-[15px] p-5">
                      <Text className="text-text text-lg font-bold mb-4 text-center">Select Payment</Text>
                      <ScrollView style={{maxHeight: 300}}>
                        {customPayments.map(p => (
                          <TouchableOpacity key={p.value} className="flex-row items-center py-3 border-b border-border" onPress={() => { setParsed({...parsed, payment_method: p.label}); setIsEditingPayment(false) }}>
                            <Text className="text-xl mr-4">{p.icon}</Text>
                            <Text className="text-text text-base">{p.label}</Text>
                          </TouchableOpacity>
                        ))}
                        {isAddingPayment ? (
                          <View className="mt-2.5 p-2.5 bg-background rounded-lg">
                            <TextInput className="text-text border-b border-primary py-1 mb-2.5" value={newPaymentName} onChangeText={setNewPaymentName} placeholder="Payment Name" placeholderTextColor="#999" />
                            <TouchableOpacity className="bg-primary p-2 rounded-md items-center" onPress={handleAddCustomPayment}><Text className="text-white font-bold">Add</Text></TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity className="p-3 rounded-lg border border-dashed border-primary mt-2.5 items-center flex-row justify-center gap-2" onPress={() => setIsAddingPayment(true)}>
                            <Plus size={16} className="text-primary" />
                            <Text className="text-primary font-semibold">Custom Payment</Text>
                          </TouchableOpacity>
                        )}
                      </ScrollView>
                      <TouchableOpacity onPress={() => setIsEditingPayment(false)}><Text className="text-error text-center mt-4 font-semibold">Cancel</Text></TouchableOpacity>
                    </View>
                  </View>
                )}

                <View className="flex-row gap-2.5 mt-2.5">
                  <TouchableOpacity className="flex-1 p-4 rounded-xl bg-surface border border-border items-center flex-row justify-center gap-2" onPress={() => setStage('idle')}>
                    <Trash2 size={18} className="text-textSecondary" />
                    <Text className="text-textSecondary font-semibold">Retry</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="flex-[2] p-4 rounded-xl bg-primary items-center flex-row justify-center gap-2" onPress={handleSave}>
                    <Check size={18} className="text-white" />
                    <Text className="text-white font-bold">Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  )
}
