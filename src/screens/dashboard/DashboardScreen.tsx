import { useEffect, useState, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Image
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition'
import { useAuthStore } from '../../store/authStore'
import { useExpenseStore } from '../../store/expenseStore'
import { useBudgetStore } from '../../store/budgetStore'
import { COLORS, SPACING } from '../../constants'
import { Expense } from '../../types'
import { processRecurringExpenses, processBudgetResets } from '../../services/recurring/recurringService'
import VoiceExpenseModal from '../../components/common/VoiceExpenseModal'
import { parseExpenseFromText, ParsedExpense } from '../../services/ai/parseExpense'

export default function DashboardScreen({ navigation }: any) {
  const [showAI, setShowAI] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [parsedResult, setParsedResult] = useState<ParsedExpense | null>(null)
  const { profile, signOut } = useAuthStore()
  const {
    expenses, isLoading,
    fetchExpenses, fetchCategories,
    getTotalByPeriod, deleteExpense
  } = useExpenseStore()
  const { budgets, fetchBudgets } = useBudgetStore()
  const recognitionActive = useRef(false)

  // Real-time speech recognition events
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript
    if (transcript) {
      setInputText(transcript)
    }
  })

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false)
  })

  useSpeechRecognitionEvent('error', (event) => {
    setIsRecording(false)
    const errorCode = String(event.error || '').toLowerCase();
    
    // Silently ignore 'no-speech' and 'aborted' errors as they are common 
    // when stopping the microphone manually or quickly.
    if (errorCode === 'no-speech' || errorCode === 'aborted' || errorCode.includes('abort')) {
      return
    }
    
    console.error('Speech recognition error:', event.error, event.message)
    Alert.alert('Voice Error', event.message || 'Could not recognize speech')
  })

  const startVoiceInput = async () => {
    if (isRecording) return
    setIsRecording(true)
    recognitionActive.current = true
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
      if (!result.granted) {
        setIsRecording(false)
        recognitionActive.current = false
        Alert.alert('Permission Denied', 'We need microphone and speech recognition access.')
        return
      }
      
      if (!recognitionActive.current) {
        setIsRecording(false)
        return
      }

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      })
    } catch (e) {
      console.error('STT Error:', e)
      Alert.alert('Error', 'Could not start voice input')
      setIsRecording(false)
      recognitionActive.current = false
    }
  }

  const stopVoiceInput = () => {
    recognitionActive.current = false
    ExpoSpeechRecognitionModule.abort() // Immediate stop
    setIsRecording(false)
  }

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera access.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    })
    if (!result.canceled) {
      setAttachedImages(prev => [...prev, result.assets[0].uri])
    }
  }

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need gallery access.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
    })
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri)
      setAttachedImages(prev => [...prev, ...uris])
    }
  }

  useEffect(() => {
    const init = async () => {
      await fetchExpenses()
      await fetchCategories()
      
      // Process recurring items and budget resets
      const currentExpenses = useExpenseStore.getState().expenses
      if (currentExpenses.length > 0) {
        await processRecurringExpenses(currentExpenses)
      }

      await fetchBudgets(currentExpenses)
      const currentBudgets = useBudgetStore.getState().budgets
      if (currentBudgets.length > 0) {
        await processBudgetResets(currentBudgets)
      }
    }
    init()
  }, [])

  const todayTotal = getTotalByPeriod('today')
  const weekTotal = getTotalByPeriod('week')
  const monthTotal = getTotalByPeriod('month')

  const recentExpenses = expenses.slice(0, 5)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchExpenses}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good day 👋</Text>
            <Text style={styles.name}>{profile?.full_name ?? 'User'}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Month total card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total This Month</Text>
          <Text style={styles.heroAmount}>
            Rs. {monthTotal.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
          </Text>
          <View style={styles.heroRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillLabel}>Today</Text>
              <Text style={styles.heroPillAmount}>Rs. {todayTotal.toFixed(0)}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillLabel}>This Week</Text>
              <Text style={styles.heroPillAmount}>Rs. {weekTotal.toFixed(0)}</Text>
            </View>
          </View>
        </View>

        {/* Gemini-style Input Bar */}
        <View style={styles.inputContainer}>
          {attachedImages.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentScroll}>
              {attachedImages.map((uri, idx) => (
                <View key={idx} style={styles.attachmentWrapper}>
                  <Image source={{ uri }} style={styles.attachmentImage} />
                  <TouchableOpacity
                    style={styles.removeAttachment}
                    onPress={() => setAttachedImages(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={styles.inputBar}>
            {/* Manual Entry Button */}
            <TouchableOpacity 
              style={styles.actionIcon}
              onPress={() => navigation.navigate('AddExpense')}
            >
              <Text style={styles.iconText}>📝</Text>
            </TouchableOpacity>

            {/* Gallery Button */}
            <TouchableOpacity 
              style={styles.actionIcon}
              onPress={openGallery}
            >
              <Text style={styles.iconText}>🖼️</Text>
            </TouchableOpacity>
            
            <TextInput
              style={styles.textInput}
              placeholder="Ask anything or add expense..."
              placeholderTextColor={COLORS.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />

            {/* Quick Camera */}
            <TouchableOpacity 
              style={styles.secondaryIcon}
              onPress={openCamera}
            >
              <Text style={styles.iconText}>📷</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.micIcon, isRecording && styles.micIconRecording]}
              onPress={isRecording ? stopVoiceInput : startVoiceInput}
            >
              <Text style={styles.iconText}>{isRecording ? '⏹️' : '🎙️'}</Text>
            </TouchableOpacity>

            {(inputText.trim() !== '' || attachedImages.length > 0) && (
              <TouchableOpacity 
                style={styles.sendIcon}
                onPress={async () => {
                  if (isParsing) return
                  setIsParsing(true)
                  const result = await parseExpenseFromText(
                    inputText, 
                    useExpenseStore.getState().categories,
                    attachedImages
                  )
                  setIsParsing(false)
                  if (result) {
                    setParsedResult(result)
                    setShowAI(true)
                    setAttachedImages([]) // Clear images after successful send
                  } else {
                    Alert.alert('Error', 'Could not understand the expense. Please try again.')
                  }
                }}
              >
                {isParsing ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.iconText}>➡️</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Recent expenses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Expenses')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
          ) : recentExpenses.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🧾</Text>
              <Text style={styles.emptyText}>No expenses yet</Text>
              <Text style={styles.emptySubtext}>Tap Add Expense to get started</Text>
            </View>
          ) : (
            recentExpenses.map((expense) => (
              <ExpenseItem key={expense.id} expense={expense} onDelete={deleteExpense} />
            ))
          )}
        </View>
      </ScrollView>

      <VoiceExpenseModal
      visible={showAI}
      onClose={() => { setShowAI(false); setParsedResult(null); setInputText('') }}
      onSaved={() => { fetchExpenses(); setInputText('') }}
      initialParsed={parsedResult}
      />
    </SafeAreaView>
    
  )
}

function ExpenseItem({ expense, onDelete }: { expense: Expense; onDelete: (id: string) => void }) {
  return (
    <View style={itemStyles.container}>
      <View style={[itemStyles.iconBox, { backgroundColor: expense.category?.color + '33' ?? '#333' }]}>
        <Text style={itemStyles.icon}>{expense.category?.icon ?? '📦'}</Text>
      </View>
      <View style={itemStyles.info}>
        <Text style={itemStyles.title}>{expense.title}</Text>
        <Text style={itemStyles.meta}>
          {expense.category?.name ?? 'Uncategorized'} · {expense.expense_date}
        </Text>
      </View>
      <View style={itemStyles.right}>
        <Text style={itemStyles.amount}>Rs. {Number(expense.amount).toFixed(0)}</Text>
        <TouchableOpacity onPress={() => onDelete(expense.id)}>
          <Text style={itemStyles.delete}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: SPACING.lg, paddingBottom: SPACING.sm
  },
  greeting: { fontSize: 14, color: COLORS.textSecondary },
  name: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  signOutBtn: {
    backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border
  },
  signOutText: { color: COLORS.textSecondary, fontSize: 13 },
  heroCard: {
    margin: SPACING.lg, marginTop: SPACING.sm,
    backgroundColor: COLORS.primary, borderRadius: 20,
    padding: SPACING.lg,
  },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: SPACING.xs },
  heroAmount: { color: COLORS.white, fontSize: 36, fontWeight: 'bold', marginBottom: SPACING.md },
  heroRow: { flexDirection: 'row', gap: SPACING.sm },
  heroPill: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10, padding: SPACING.sm, alignItems: 'center'
  },
  heroPillLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  heroPillAmount: { color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
  inputContainer: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  textInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    paddingVertical: SPACING.xs,
    maxHeight: 120,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '11',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIconRecording: {
    backgroundColor: COLORS.error + '22',
    borderColor: COLORS.error,
    borderWidth: 1,
  },
  sendIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  attachmentScroll: {
    paddingBottom: SPACING.xs,
    marginBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  attachmentWrapper: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    position: 'relative',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeAttachment: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.error,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: { padding: SPACING.lg, paddingTop: SPACING.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  seeAll: { color: COLORS.primary, fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.sm },
  emptyText: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  emptySubtext: { color: COLORS.textSecondary, fontSize: 14, marginTop: SPACING.xs },
})

const itemStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 22 },
  info: { flex: 1, marginLeft: SPACING.sm },
  title: { color: COLORS.text, fontWeight: '600', fontSize: 15 },
  meta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { color: COLORS.text, fontWeight: 'bold', fontSize: 15 },
  delete: { fontSize: 16 },
})