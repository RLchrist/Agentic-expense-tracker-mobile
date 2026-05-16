import { useEffect, useState, useRef } from 'react'
import {
  View, Text, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Image, Platform
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition'
import { 
  LogOut, Plus, Image as ImageIcon, Camera, 
  Mic, Square, ArrowRight, Box, Wind 
} from 'lucide-react-native'
import { useAuthStore } from '../../store/authStore'
import { useExpenseStore } from '../../store/expenseStore'
import { useBudgetStore } from '../../store/budgetStore'
import { COLORS } from '../../constants'
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
    <SafeAreaView className="flex-1 bg-background">
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
        <View className="flex-row justify-between items-center px-6 pt-4 pb-2">
          <View>
            <Text className="text-[13px] text-textSecondary font-medium">Good day 👋</Text>
            <Text className="text-xl font-bold text-text mt-[2px]">{profile?.full_name ?? 'User'}</Text>
          </View>
          <TouchableOpacity onPress={signOut} className="flex-row items-center py-1.5 px-3 bg-surface rounded-full border border-border">
            <LogOut size={14} color={COLORS.textSecondary} className="mr-1.5" />
            <Text className="text-textSecondary text-[12px] font-semibold">Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Modern Balance Header */}
        <View 
          className="m-6 p-8 bg-primary rounded-[32px] items-center"
          style={{
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <Text className="text-white/70 text-sm font-medium">Total Balance</Text>
          <Text className="text-white text-3xl font-bold my-1">
            Rs. {monthTotal.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
          </Text>
          
          <View className="flex-row items-center bg-white/15 rounded-2xl mt-4 px-6 py-2">
            <View className="items-center px-4">
              <Text className="text-white/60 text-[10px] uppercase tracking-widest">Today</Text>
              <Text className="text-white text-sm font-bold mt-[2px]">Rs. {todayTotal.toFixed(0)}</Text>
            </View>
            <View className="w-[1px] h-5 bg-white/20" />
            <View className="items-center px-4">
              <Text className="text-white/60 text-[10px] uppercase tracking-widest">Week</Text>
              <Text className="text-white text-sm font-bold mt-[2px]">Rs. {weekTotal.toFixed(0)}</Text>
            </View>
          </View>
        </View>

        <View className="px-6 mb-8 z-10">
          {showActionMenu && (
            <View 
              className="absolute bottom-20 left-6 bg-[#1E1E1E] rounded-2xl w-[200px] p-1 shadow-xl z-50 border border-white/10"
            >
              <TouchableOpacity 
                className="flex-row items-center p-4 gap-4"
                onPress={() => {
                  setShowActionMenu(false)
                  navigation.navigate('AddExpense')
                }}
              >
                <Plus size={20} color={COLORS.white} />
                <Text className="text-white text-[15px] font-medium">Manual Add</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="flex-row items-center p-4 gap-4"
                onPress={() => {
                  setShowActionMenu(false)
                  openGallery()
                }}
              >
                <ImageIcon size={20} color={COLORS.white} />
                <Text className="text-white text-[15px] font-medium">Photos & Files</Text>
              </TouchableOpacity>
            </View>
          )}

          <View className="bg-surface rounded-[28px] p-1 border border-border shadow-md">
            {attachedImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2 px-1">
                {attachedImages.map((uri, idx) => (
                  <View key={idx} className="mr-2 relative">
                    <Image source={{ uri }} className="w-[70px] h-[70px] rounded-xl border border-border" />
                    <TouchableOpacity
                      className="absolute -top-1.5 -right-1.5 bg-error w-[22px] h-[22px] rounded-full justify-center items-center border-2 border-surface"
                      onPress={() => setAttachedImages(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <Text className="text-white text-[12px] font-bold">✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View className="flex-row items-center py-0.5">
              <TouchableOpacity 
                className="w-[38px] h-[38px] rounded-full justify-center items-center"
                onPress={() => setShowActionMenu(!showActionMenu)}
              >
                <Plus size={24} color={COLORS.text} />
              </TouchableOpacity>
              
              <TextInput
                className="flex-1 text-text text-[15px] px-4 max-h-[100px]"
                placeholder="How much did you spend?"
                placeholderTextColor={COLORS.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
              />

              <View className="flex-row gap-4 px-2">
                <TouchableOpacity onPress={openCamera}>
                  <Camera size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  className={isRecording ? "bg-error/15 rounded-[15px] p-0.5" : ""}
                  onPress={isRecording ? stopVoiceInput : startVoiceInput}
                >
                  {isRecording ? (
                    <Square size={20} color={COLORS.error} />
                  ) : (
                    <Mic size={20} color={COLORS.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>

              {(inputText.trim() !== '' || attachedImages.length > 0) && (
                <TouchableOpacity 
                  className="w-[46px] h-[46px] rounded-full bg-primary justify-center items-center ml-1 shadow-md"
                  onPress={handleManualParse}
                  disabled={isParsing}
                >
                  {isParsing ? <ActivityIndicator size="small" color={COLORS.white} /> : <ArrowRight size={24} color={COLORS.white} />}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View className="flex-row justify-between items-center px-6 mb-4">
          <Text className="text-text text-lg font-bold">Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Expenses')}>
            <Text className="text-primary font-semibold">See All</Text>
          </TouchableOpacity>
        </View>

        <View className="px-6 pb-20">
          {recentExpenses.length > 0 ? (
            recentExpenses.map(item => (
              <ExpenseItem key={item.id} expense={item} onDelete={handleDeleteExpense} />
            ))
          ) : (
            <View className="items-center py-12">
              <Wind size={48} color={COLORS.textSecondary} className="mb-2" />
              <Text className="text-text text-lg font-bold">No expenses yet</Text>
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
    <View className="flex-row items-center bg-surface rounded-xl p-4 mb-2 border border-border">
      <View 
        className="w-11 h-11 rounded-xl justify-center items-center" 
        style={{ backgroundColor: expense.category?.color + '22' ?? '#33333322' }}
      >
        <Text className="text-[22px]">{expense.category?.icon ?? '📦'}</Text>
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-text font-semibold text-[15px]">{expense.title}</Text>
        <Text className="text-textSecondary text-[12px] mt-0.5">{expense.category?.name ?? 'Uncategorized'}</Text>
      </View>
      <View className="items-end">
        <Text className="text-text font-bold text-[15px]">Rs. {Number(expense.amount).toFixed(0)}</Text>
      </View>
    </View>
  )
}