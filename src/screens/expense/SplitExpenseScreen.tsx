import React, { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Plus, Trash2, Check, ArrowLeft, Users, DivideCircle, Wand2, Camera, Mic, Square, ArrowRight, Image as ImageIcon } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition'
import { useAppTheme } from '../../hooks/useAppTheme'
import { GroupExpenseItem, SplitResult, calculateSplit } from '../../utils'
import { aiRouter } from '../../services/ai/aiRouter'
import { useExpenseStore } from '../../store/expenseStore'
import { useAuthStore } from '../../store/authStore'

export default function SplitExpenseScreen({ navigation }: any) {
  const { colors } = useAppTheme()
  const insets = useSafeAreaInsets()
  const { addExpense } = useExpenseStore()
  const { user, profile } = useAuthStore()

  // Input states (AI & Media)
  const [inputText, setInputText] = useState('')
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isParsingAI, setIsParsingAI] = useState(false)
  const recognitionActive = useRef(false)

  // Manual Form States
  const [currentName, setCurrentName] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [currentDesc, setCurrentDesc] = useState('')

  // Main State
  const [expenses, setExpenses] = useState<GroupExpenseItem[]>([])
  const [totalFriends, setTotalFriends] = useState('')
  const [splitResult, setSplitResult] = useState<SplitResult | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // --- Voice & Image Logic ---
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript
    if (transcript) setInputText(transcript)
  })

  useSpeechRecognitionEvent('end', () => setIsRecording(false))

  useSpeechRecognitionEvent('error', (event) => {
    setIsRecording(false)
    const errorCode = String(event.error || '').toLowerCase()
    if (errorCode === 'no-speech' || errorCode === 'aborted' || errorCode.includes('abort')) return
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
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false })
    } catch (e) {
      Alert.alert('Error', 'Could not start voice input')
      setIsRecording(false)
      recognitionActive.current = false
    }
  }

  const stopVoiceInput = () => {
    recognitionActive.current = false
    ExpoSpeechRecognitionModule.abort()
    setIsRecording(false)
  }

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera access.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 })
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

  const handleAIParsing = async () => {
    if (!inputText.trim() && attachedImages.length === 0) return
    setIsParsingAI(true)
    try {
      const response = await aiRouter.parseGroupExpense(inputText) // Note: currently doesn't support images in group parser yet, but we can pass text
      if (response.success && response.data?.expenses) {
        const parsedExpenses = response.data.expenses.map((exp: any) => ({
          id: Math.random().toString(),
          payerName: exp.payerName || '',
          amount: parseFloat(exp.amount) || 0,
          description: exp.description || ''
        }))
        if (parsedExpenses.length > 0) {
          setExpenses(prev => [...parsedExpenses, ...prev])
          setInputText('')
          setAttachedImages([])
        }
      } else {
        Alert.alert('AI Parse Failed', 'Could not extract expenses from input. Please try entering them manually.')
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to process input with AI.')
    } finally {
      setIsParsingAI(false)
    }
  }

  // --- Manual Form Logic ---
  const handleAddManualExpense = () => {
    if (!currentName.trim() || !currentAmount.trim()) {
      Alert.alert('Missing Info', 'Please enter at least the payer name and amount.')
      return
    }
    const amountNum = parseFloat(currentAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.')
      return
    }

    setExpenses([{
      id: Math.random().toString(),
      payerName: currentName.trim(),
      amount: amountNum,
      description: currentDesc.trim() || 'Trip Expense'
    }, ...expenses])

    setCurrentName('')
    setCurrentAmount('')
    setCurrentDesc('')
  }

  const removeExpense = (id: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id))
  }

  // --- Split Logic ---
  const handleDone = () => {
    if (expenses.length === 0) {
      Alert.alert('Error', 'Please add at least one expense.')
      return
    }
    const uniquePayers = new Set(expenses.map(e => e.payerName.trim())).size
    const friendsCount = parseInt(totalFriends, 10)

    if (isNaN(friendsCount) || friendsCount < uniquePayers) {
      Alert.alert('Error', `Please enter a valid number of friends (at least ${uniquePayers}).`)
      return
    }

    const result = calculateSplit(expenses, friendsCount)
    setSplitResult(result)
  }

  const saveSettlementsToDB = async () => {
    if (!splitResult || !user) return
    setIsSaving(true)
    try {
      const dateStr = new Date().toISOString()
      const currency = profile?.currency || 'NPR'

      const isCurrentUser = (name: string) => {
        const n = name.toLowerCase().trim()
        if (['me', 'my', 'i', 'myself'].includes(n)) return true
        if (!profile?.full_name) return false
        const full = profile.full_name.toLowerCase().trim()
        const parts = full.split(/\s+/)
        return n === full || parts.includes(n)
      }

      let savedCount = 0

      for (const exp of expenses) {
        if (exp.payerName.trim() && exp.amount > 0 && isCurrentUser(exp.payerName)) {
          await addExpense({
            amount: exp.amount,
            title: exp.description || 'Group Trip Expense',
            category_id: null,
            expense_date: dateStr,
            payment_method: 'cash',
            currency,
            receipt_url: null,
            is_synced: false,
            is_recurring: false,
            recurring_period: null,
            local_id: null,
            note: `You paid for group trip: ${exp.description}`
          })
          savedCount++
        }
      }

      for (const settle of splitResult.settlements) {
        if (isCurrentUser(settle.from)) {
          await addExpense({
            amount: settle.amount,
            title: `Owed to ${settle.to} for Trip`,
            category_id: null,
            expense_date: dateStr,
            payment_method: 'cash',
            currency,
            receipt_url: null,
            is_synced: false,
            is_recurring: false,
            recurring_period: null,
            local_id: null,
            note: `Auto-generated settlement. You owe ${settle.to} ${currency} ${settle.amount}`
          })
          savedCount++
        }
      }

      if (savedCount > 0) {
        Alert.alert('Success', `Saved ${savedCount} expense(s) to your dashboard!`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ])
      } else {
        Alert.alert('Done', 'No expenses or settlements found for your name.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ])
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save settlements to DB.')
    } finally {
      setIsSaving(false)
    }
  }

  // --- Renders ---
  if (splitResult) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center px-6 py-4 border-b border-border">
          <TouchableOpacity onPress={() => setSplitResult(null)} className="mr-4">
            <ArrowLeft size={24} className="text-text" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-text">Settlement Plan</Text>
        </View>

        <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}>
          <View className="bg-surface p-6 rounded-2xl border border-border mb-6 items-center">
            <Text className="text-textSecondary text-sm mb-1">Total Trip Cost</Text>
            <Text className="text-text text-3xl font-bold mb-4">Rs. {splitResult.totalAmount.toFixed(0)}</Text>
            
            <View className="w-full flex-row justify-between border-t border-border pt-4">
              <View className="items-center flex-1">
                <Text className="text-textSecondary text-xs">Per Person</Text>
                <Text className="text-text font-bold mt-1">Rs. {splitResult.perPersonShare.toFixed(0)}</Text>
              </View>
            </View>
          </View>

          <Text className="text-lg font-bold text-text mb-4">Who Pays Whom?</Text>
          
          {splitResult.settlements.length === 0 ? (
            <View className="bg-surface p-6 rounded-2xl border border-border items-center">
              <Check size={32} className="text-green-500 mb-2" />
              <Text className="text-text font-bold">All Settled!</Text>
              <Text className="text-textSecondary text-center mt-2">Everyone paid their exact share.</Text>
            </View>
          ) : (
            splitResult.settlements.map((settle, idx) => (
              <View key={idx} className="bg-surface p-5 rounded-2xl border border-border mb-3 flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-text font-bold text-[16px]">{settle.from}</Text>
                  <Text className="text-textSecondary text-xs">owes</Text>
                </View>
                <View className="px-4 items-center">
                  <Text className="text-primary font-bold text-lg">Rs. {settle.amount}</Text>
                  <ArrowLeft size={16} className="text-primary mt-1 rotate-180" />
                </View>
                <View className="flex-1 items-end">
                  <Text className="text-text font-bold text-[16px]">{settle.to}</Text>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity 
            className="w-full bg-primary py-4 rounded-xl items-center mt-6 mb-3"
            onPress={saveSettlementsToDB}
            disabled={isSaving}
          >
            <Text className="text-white font-bold text-[16px]">
              {isSaving ? 'Saving...' : 'Save Settlements as Expenses'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="w-full border border-primary py-4 rounded-xl items-center"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-primary font-bold text-[16px]">Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-6 py-4 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <ArrowLeft size={24} className="text-text" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text">Add Group Expenses</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
          
          {/* Number of Friends */}
          <View className="bg-surface p-1 rounded-xl border border-border flex-row items-center gap-3 mb-6">
            <Users size={20} className="text-primary" />
            <TextInput
              placeholder="Total number of friends in trip?"
              placeholderTextColor={colors.textSecondary}
              value={totalFriends}
              onChangeText={setTotalFriends}
              keyboardType="number-pad"
              className="flex-1 text-text text-[15px]"
            />
          </View>

          {/* Top AI / Media Input Bar */}
          <View className="bg-surface rounded-2xl p-1 border border-border shadow-md mb-6">
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
              <TouchableOpacity className="w-[38px] h-[38px] rounded-full justify-center items-center" onPress={openGallery}>
                <ImageIcon size={20} className="text-textSecondary" />
              </TouchableOpacity>
              
              <TextInput
                className="flex-1 text-text text-[15px] px-2 max-h-[100px]"
                placeholder="Parse multiple with AI..."
                placeholderTextColor={colors.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
              />

              <View className="flex-row gap-4 px-2">
                <TouchableOpacity onPress={openCamera}>
                  <Camera size={20} className="text-textSecondary" />
                </TouchableOpacity>
                <TouchableOpacity 
                  className={isRecording ? "bg-error/15 rounded-[15px] p-0.5" : ""}
                  onPress={isRecording ? stopVoiceInput : startVoiceInput}
                >
                  {isRecording ? <Square size={20} className="text-error" /> : <Mic size={20} className="text-textSecondary" />}
                </TouchableOpacity>
              </View>

              {(inputText.trim() !== '' || attachedImages.length > 0) && (
                <TouchableOpacity 
                  className="w-[46px] h-[46px] rounded-full bg-primary justify-center items-center ml-1 shadow-md"
                  onPress={handleAIParsing}
                  disabled={isParsingAI}
                >
                  {isParsingAI ? <ActivityIndicator size="small" className="text-white" /> : <Wand2 size={20} className="text-white" />}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Manual Entry Form */}
          <View className="bg-surface p-4 rounded-xl border border-border mb-6">
            <Text className="text-text font-bold text-[16px] mb-3">Add Manual Entry</Text>
            <View className="gap-3">
              <TextInput
                placeholder="Who paid? (e.g. Ram)"
                placeholderTextColor={colors.textSecondary}
                value={currentName}
                onChangeText={setCurrentName}
                className="bg-background px-4 py-3 rounded-xl border border-border text-text"
              />
              <TextInput
                placeholder="Amount (Rs.)"
                placeholderTextColor={colors.textSecondary}
                value={currentAmount}
                onChangeText={setCurrentAmount}
                keyboardType="decimal-pad"
                className="bg-background px-4 py-3 rounded-xl border border-border text-text"
              />
              <TextInput
                placeholder="For what? (e.g. Snacks)"
                placeholderTextColor={colors.textSecondary}
                value={currentDesc}
                onChangeText={setCurrentDesc}
                className="bg-background px-4 py-3 rounded-xl border border-border text-text"
              />
              <TouchableOpacity 
                className="w-full bg-primary/10 py-3 rounded-xl items-center mt-2 border border-primary/20"
                onPress={handleAddManualExpense}
              >
                <Text className="text-primary font-bold">Save Entry</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Added Expenses List */}
          {expenses.length > 0 && (
            <View className="mb-6">
              <Text className="text-text font-bold text-[16px] mb-3">Added Expenses ({expenses.length})</Text>
              {expenses.map((exp, index) => (
                <View key={exp.id} className="bg-surface p-4 rounded-xl border border-border mb-3 flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-text font-bold">{exp.payerName} paid Rs. {exp.amount}</Text>
                    <Text className="text-textSecondary text-xs">{exp.description}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeExpense(exp.id)} className="p-2">
                    <Trash2 size={18} className="text-error" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
        
        <View className="px-6 py-4 bg-background border-t border-border" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <TouchableOpacity 
            className="w-full bg-primary py-4 rounded-xl items-center flex-row justify-center gap-2"
            onPress={handleDone}
            disabled={expenses.length === 0}
            style={{ opacity: expenses.length === 0 ? 0.5 : 1 }}
          >
            <DivideCircle size={20} className="text-white" />
            <Text className="text-white font-bold text-[16px]">Calculate Split</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}
