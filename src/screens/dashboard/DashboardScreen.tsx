import { useEffect, useState, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Image, Modal, Platform
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
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [parsedResult, setParsedResult] = useState<ParsedExpense | null>(null)
  const { profile, signOut } = useAuthStore()
  const {
    expenses, isLoading,
    fetchExpenses, fetchCategories,
    getTotalByPeriod, deleteExpense: handleDeleteExpense
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

  const handleManualParse = async () => {
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

        {/* Modern Balance Header */}
        <View style={styles.modernHeader}>
          <Text style={styles.modernLabel}>Total Balance</Text>
          <Text style={styles.modernAmount}>
            Rs. {monthTotal.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
          </Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>Today</Text>
              <Text style={styles.statValue}>Rs. {todayTotal.toFixed(0)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>Week</Text>
              <Text style={styles.statValue}>Rs. {weekTotal.toFixed(0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.inputContainer}>
          {showActionMenu && (
            <View style={styles.geminiMenu}>
              <TouchableOpacity 
                style={styles.geminiItem}
                onPress={() => {
                  setShowActionMenu(false)
                  navigation.navigate('AddExpense')
                }}
              >
                <Text style={styles.geminiIcon}>📝</Text>
                <Text style={styles.geminiText}>Manual Add</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.geminiItem}
                onPress={() => {
                  setShowActionMenu(false)
                  openGallery()
                }}
              >
                <Text style={styles.geminiIcon}>🖼️</Text>
                <Text style={styles.geminiText}>Photos & Files</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputBar}>
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

            <View style={styles.inputActionRow}>
              <TouchableOpacity 
                style={styles.actionIcon}
                onPress={() => setShowActionMenu(!showActionMenu)}
              >
                <Text style={styles.plusIcon}>+</Text>
              </TouchableOpacity>
              
              <TextInput
                style={styles.textInput}
                placeholder="How much did you spend?"
                placeholderTextColor={COLORS.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
              />

              <View style={styles.inputActions}>
                <TouchableOpacity onPress={openCamera}>
                  <Text style={styles.actionEmoji}>📷</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[isRecording && styles.recordingActive]}
                  onPress={isRecording ? stopVoiceInput : startVoiceInput}
                >
                  <Text style={styles.actionEmoji}>{isRecording ? '⏹️' : '🎙️'}</Text>
                </TouchableOpacity>
              </View>

              {(inputText.trim() !== '' || attachedImages.length > 0) && (
                <TouchableOpacity 
                  style={styles.sendBtn}
                  onPress={handleManualParse}
                  disabled={isParsing}
                >
                  {isParsing ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.sendText}>→</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Expenses')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listContainer}>
          {recentExpenses.length > 0 ? (
            recentExpenses.map(item => (
              <ExpenseItem key={item.id} expense={item} onDelete={handleDeleteExpense} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎐</Text>
              <Text style={styles.emptyText}>No expenses yet</Text>
            </View>
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
      <View style={[itemStyles.iconBox, { backgroundColor: expense.category?.color + '22' ?? '#33333322' }]}>
        <Text style={itemStyles.icon}>{expense.category?.icon ?? '📦'}</Text>
      </View>
      <View style={itemStyles.info}>
        <Text style={itemStyles.title}>{expense.title}</Text>
        <Text style={itemStyles.meta}>{expense.category?.name ?? 'Uncategorized'}</Text>
      </View>
      <View style={itemStyles.right}>
        <Text style={itemStyles.amount}>Rs. {Number(expense.amount).toFixed(0)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  greeting: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  name: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginTop: 2 },
  signOutBtn: {
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  signOutText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  
  modernHeader: {
    margin: SPACING.lg,
    padding: SPACING.xl,
    backgroundColor: COLORS.primary,
    borderRadius: 32,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modernLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
  modernAmount: { color: COLORS.white, fontSize: 32, fontWeight: 'bold', marginVertical: SPACING.xs },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  statPill: { alignItems: 'center', paddingHorizontal: SPACING.md },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { color: COLORS.white, fontSize: 14, fontWeight: '700', marginTop: 2 },
  statDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)' },

  inputContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    zIndex: 10,
  },
  inputBar: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  inputActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  actionIcon: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  plusIcon: { color: COLORS.text, fontSize: 24, fontWeight: '300' },
  textInput: {
    flex: 1, color: COLORS.text, fontSize: 15,
    paddingHorizontal: SPACING.md, maxHeight: 100,
  },
  inputActions: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.sm },
  actionEmoji: { fontSize: 20 },
  recordingActive: {
    backgroundColor: COLORS.error + '22',
    borderRadius: 15,
    padding: 2,
  },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.sm },
  emptyText: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  emptySubtext: { color: COLORS.textSecondary, fontSize: 14, marginTop: SPACING.xs },

  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: SPACING.xs,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  sendText: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },

  attachmentScroll: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: 4,
  },
  attachmentWrapper: {
    marginRight: SPACING.sm,
    position: 'relative',
  },
  attachmentImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  removeAttachment: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.error,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  removeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Gemini-style Menu
  geminiMenu: {
    position: 'absolute',
    bottom: 80, // Slightly higher to account for images
    left: 0,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    width: 200,
    padding: SPACING.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  geminiItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  geminiIcon: {
    fontSize: 20,
    color: COLORS.white,
  },
  geminiText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '500',
  },
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