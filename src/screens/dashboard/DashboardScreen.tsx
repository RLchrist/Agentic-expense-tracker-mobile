import { useEffect, useState, useRef } from 'react'
import {
  View, Text,
  TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Image, Platform, Dimensions, Animated
} from 'react-native'
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg'
import { ScrollView, Swipeable } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import { 
  LogOut, Plus, Image as ImageIcon, Camera, 
  Mic, Square, ArrowRight, Box, Wind, Users,
  Pencil, Trash2, Bell, MoreVertical
} from 'lucide-react-native'
import { useAuthStore } from '../../store/authStore'
import { useExpenseStore } from '../../store/expenseStore'
import { useBudgetStore } from '../../store/budgetStore'
import { useAppTheme } from '../../hooks/useAppTheme'
import { Expense } from '../../types'
import { processRecurringExpenses, processBudgetResets } from '../../services/recurring/recurringService'
import VoiceExpenseModal from '../../components/common/VoiceExpenseModal'
import { parseExpenseFromText, ParsedExpense } from '../../services/ai/parseExpense'
import { Skeleton } from '../../components/common/Skeleton'
import OfflineBanner from '../../components/common/OfflineBanner'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import { formatCurrency } from '../../utils'

export default function DashboardScreen({ navigation }: any) {
  const { colors } = useAppTheme()
  const [showAI, setShowAI] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [parsedResult, setParsedResult] = useState<ParsedExpense | null>(null)
  const { profile, signOut } = useAuthStore()
  const { isOffline } = useNetworkStatus()
  
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(clockTimer)
  }, [])

  const {
    expenses, isLoading,
    fetchExpenses, fetchCategories,
    getTotalByPeriod, deleteExpense: handleDeleteExpense
  } = useExpenseStore()
  const { budgets, fetchBudgets } = useBudgetStore()

  // Direct callback — fires from native event with zero intermediate renders
  const { isRecording, isTranscribing, mode, startRecording: triggerStartRecording, stopRecording: triggerStopRecording } = useVoiceRecorder({
    onTranscript: (text) => setInputText(text),
  })

  const startVoiceInput = async () => {
    if (isRecording || isTranscribing) return
    try {
      await triggerStartRecording()
    } catch (e) {
      console.error('Voice start failed:', e)
      Alert.alert('Error', 'Could not start voice input')
    }
  }

  const stopVoiceInput = async () => {
    try {
      const text = await triggerStopRecording()
      if (text) {
        setInputText(text)
      }
    } catch (e) {
      console.error('Voice error:', e)
    }
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

  // Helper calculations for Account Balance (Budgets) and Expenses (month totals)
  const getBudgetTotal = (isCurrentMonth: boolean) => {
    const now = new Date()
    const targetMonth = isCurrentMonth ? now.getMonth() : now.getMonth() - 1
    const targetYear = now.getFullYear()
    const yearAdjusted = targetMonth < 0 ? targetYear - 1 : targetYear
    const monthAdjusted = targetMonth < 0 ? 11 : targetMonth

    const monthlyBudgets = budgets.filter(b => b.period === 'monthly')
    if (monthlyBudgets.length === 0) {
      return isCurrentMonth ? 15000 : 12500
    }
    return monthlyBudgets.reduce((acc, b) => acc + Number(b.amount), 0)
  }

  const getLastMonthExpensesTotal = () => {
    const now = new Date()
    const lm = now.getMonth() - 1
    const targetYear = lm < 0 ? now.getFullYear() - 1 : now.getFullYear()
    const targetMonth = lm < 0 ? 11 : lm

    return expenses
      .filter(e => {
        const d = new Date(e.expense_date)
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear
      })
      .reduce((sum, e) => sum + Number(e.amount), 0)
  }

  const getWeeklySpending = (isCurrentMonth: boolean) => {
    const now = new Date()
    const targetMonth = isCurrentMonth ? now.getMonth() : now.getMonth() - 1
    const targetYear = now.getFullYear()
    const yearAdjusted = targetMonth < 0 ? targetYear - 1 : targetYear
    const monthAdjusted = targetMonth < 0 ? 11 : targetMonth

    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.expense_date)
      return d.getMonth() === monthAdjusted && d.getFullYear() === yearAdjusted
    })

    const intervals = [0, 0, 0, 0, 0]
    monthExpenses.forEach(e => {
      const day = new Date(e.expense_date).getDate()
      const idx = Math.min(Math.floor((day - 1) / 6), 4)
      intervals[idx] += Number(e.amount)
    })
    
    // Fallback trend values to always ensure a gorgeous visual golden wave!
    const defaultTrend = isCurrentMonth ? [100, 250, 150, 420, 200] : [150, 300, 200, 180, 280]
    return intervals.map((v, i) => v > 0 ? v : defaultTrend[i])
  }

  const thisMonthBudget = getBudgetTotal(true)
  const lastMonthBudget = getBudgetTotal(false)
  const lastMonthTotal = getLastMonthExpensesTotal()
  const thisMonthSpending = getWeeklySpending(true)
  const lastMonthSpending = getWeeklySpending(false)

  const { width: screenWidth } = Dimensions.get('window')
  const cardWidth = screenWidth - 48

  const formattedLiveDateTime = currentTime.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }) + ' • ' + currentTime.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })

  return (
    <SafeAreaView className="flex-1 bg-background">
      <OfflineBanner />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchExpenses}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View className="flex-row justify-between items-start px-6 pt-4 pb-2 z-50">
          <View>
            <Text className="text-[13px] text-textSecondary font-medium">Good day 👋</Text>
            <Text className="text-xl font-bold text-text mt-[2px]">{profile?.full_name ?? 'User'}</Text>
            <Text className="text-[11px] text-textSecondary mt-1.5 font-medium bg-surface px-2.5 py-1 rounded-full border border-border self-start">
              🕒 {formattedLiveDateTime}
            </Text>
          </View>
          <View className="flex-row items-center gap-2 relative">
            <TouchableOpacity 
              className="w-9 h-9 rounded-full bg-surface border border-border justify-center items-center"
              onPress={() => Alert.alert('Notifications', 'You have no new notifications.')}
            >
              <Bell size={18} className="text-text" />
            </TouchableOpacity>

            <TouchableOpacity 
              className="w-9 h-9 rounded-full bg-surface border border-border justify-center items-center"
              onPress={() => setShowDropdown(!showDropdown)}
            >
              <MoreVertical size={18} className="text-text" />
            </TouchableOpacity>

            {showDropdown && (
              <View 
                className="absolute right-0 top-11 bg-surface border border-border rounded-xl p-1.5 w-[110px] shadow-lg z-50"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                <TouchableOpacity 
                  className="flex-row items-center p-2 rounded-lg bg-error/10"
                  onPress={() => {
                    setShowDropdown(false)
                    signOut()
                  }}
                >
                  <LogOut size={14} className="text-error mr-2" />
                  <Text className="text-error text-[12px] font-bold">Sign Out</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>



        {/* Interactive Monthly Bar Chart */}
        {!isLoading && (
          <InteractiveMonthlyBarChart 
            expenses={expenses}
            currency={profile?.currency ?? 'NPR'}
            colors={colors}
            budget={thisMonthBudget}
            monthTotal={monthTotal}
          />
        )}

        <View className="px-6 mb-3 z-10">
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
                <Plus size={20} className="text-white" />
                <Text className="text-white text-[15px] font-medium">Manual Add</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="flex-row items-center p-4 gap-4 border-t border-white/10"
                onPress={() => {
                  setShowActionMenu(false)
                  openCamera()
                }}
              >
                <Camera size={20} className="text-white" />
                <Text className="text-white text-[15px] font-medium">Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="flex-row items-center p-4 gap-4 border-t border-white/10"
                onPress={() => {
                  setShowActionMenu(false)
                  openGallery()
                }}
              >
                <ImageIcon size={20} className="text-white" />
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
                <Plus size={24} className="text-text" />
              </TouchableOpacity>
              
              {isRecording && mode === 'groq' ? (
                <View className="flex-1 flex-row items-center justify-center gap-2 px-4 h-[44px]">
                  <PulsingOrb color={colors.primary} />
                  <Text className="text-textSecondary text-[14px] font-semibold ml-2">Listening...</Text>
                </View>
              ) : isTranscribing ? (
                <View className="flex-1 flex-row items-center justify-center gap-2 px-4 h-[44px]">
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text className="text-textSecondary text-[14px] font-semibold ml-2">Transcribing...</Text>
                </View>
              ) : (
                <TextInput
                  className="flex-1 text-text text-[15px] px-4 max-h-[100px]"
                  placeholder="How much did you spend?"
                  placeholderTextColor={colors.textSecondary}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                />
              )}
               

              <View className="flex-row gap-4 px-2">
                {isTranscribing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <TouchableOpacity 
                    className={isRecording ? "bg-error/15 rounded-[15px] p-0.5" : ""}
                    onPress={isRecording ? stopVoiceInput : startVoiceInput}
                  >
                    {isRecording ? (
                      <Square size={20} className="text-error" />
                    ) : (
                      <Mic size={20} className="text-textSecondary" />
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {(inputText.trim() !== '' || attachedImages.length > 0) && !isRecording && !isTranscribing && (
                <TouchableOpacity 
                  className="w-[46px] h-[46px] rounded-full bg-primary justify-center items-center ml-1 shadow-md"
                  onPress={handleManualParse}
                  disabled={isParsing}
                >
                  {isParsing ? <ActivityIndicator size="small" className="text-white" /> : <ArrowRight size={24} className="text-white" />}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View className="mb-6 items-center">
          <TouchableOpacity 
            className="flex-row items-center justify-center bg-surface py-2 px-6 rounded-full border border-border shadow-sm"
            onPress={() => navigation.navigate('SplitExpense')}
          >
            <Users size={18} className="text-primary mr-2" />
            <Text className="text-text font-semibold text-[14px]">Split Group Expense</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between items-center px-6 mb-4">
          <Text className="text-text text-lg font-bold">Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Expenses')}>
            <Text className="text-primary font-semibold">See All</Text>
          </TouchableOpacity>
        </View>

        <View className="px-6 pb-20">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <View key={i} className="flex-row items-center bg-surface rounded-xl p-4 mb-2 border border-border">
                  <Skeleton width={44} height={44} borderRadius={12} />
                  <View className="flex-1 ml-3 gap-1.5">
                    <Skeleton width="60%" height={14} borderRadius={4} />
                    <Skeleton width="40%" height={12} borderRadius={4} />
                  </View>
                  <Skeleton width={70} height={16} borderRadius={4} />
                </View>
              ))}
            </>
          ) : recentExpenses.length > 0 ? (
            recentExpenses.map(item => (
              <ExpenseItem 
                key={item.id} 
                expense={item} 
                onDelete={handleDeleteExpense} 
                onEdit={(exp) => navigation.navigate('AddExpense', { expense: exp })}
              />
            ))
          ) : (
            <View className="items-center py-12">
              <Wind size={48} className="text-textSecondary mb-2" />
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

interface InteractiveMonthlyBarChartProps {
  expenses: any[]
  currency: string
  colors: any
  budget: number
  monthTotal: number
}

function InteractiveMonthlyBarChart({ expenses, currency, colors, budget, monthTotal }: InteractiveMonthlyBarChartProps) {
  const now = new Date()
  const currentMonthName = now.toLocaleString(undefined, { month: 'long' })
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  
  // Aggregate expenses by day
  const dailyExpenses = Array(daysInMonth).fill(0)
  expenses.forEach(e => {
    const d = new Date(e.expense_date)
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      const dayNum = d.getDate()
      if (dayNum >= 1 && dayNum <= daysInMonth) {
        dailyExpenses[dayNum - 1] += Number(e.amount)
      }
    }
  })

  const scrollRef = useRef<ScrollView>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate())

  useEffect(() => {
    if (scrollRef.current) {
      const today = now.getDate()
      const offset = Math.max(0, (today - 1) * 21 - 130)
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: offset, animated: true })
      }, 150)
    }
  }, [])
  
  const maxVal = Math.max(...dailyExpenses, 100)
  const chartHeight = 120

  // Calculate selected spending details
  const selectedSpent = selectedDay !== null ? dailyExpenses[selectedDay - 1] : 0

  return (
    <View className="mx-6 my-4 bg-surface border border-border rounded-[28px] p-6 shadow-md">
      {/* Primary Row: Budget & Selected Day Spend */}
      <View className="flex-row justify-between items-center mb-4">
        <View>
          <Text className="text-textSecondary text-[10px] font-bold uppercase tracking-widest">Total Budget</Text>
          <Text className="text-primary text-3xl font-black mt-1">
            {formatCurrency(budget, currency, 0)}
          </Text>
        </View>
        
        {/* Selected Day Spend (Pill Container) */}
        {selectedDay !== null && (
          <View 
            className="bg-primary/5 border border-primary/10 rounded-2xl px-4 py-2 items-center"
            style={{ minWidth: 85 }}
          >
            <Text className="text-textSecondary text-[9px] font-bold uppercase tracking-wider">Day {selectedDay}</Text>
            <Text className="text-primary text-sm font-extrabold mt-0.5">
              {formatCurrency(selectedSpent, currency, 0)}
            </Text>
          </View>
        )}
      </View>

      {/* Secondary Row: Sleek Capsule Badges */}
      <View className="flex-row items-center gap-2 mb-5 border-b border-border/30 pb-4">
        <View className="bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
          <Text className="text-primary text-[11px] font-bold">
            Expenses: {formatCurrency(monthTotal, currency, 0)} this month
          </Text>
        </View>
        
        <View className="bg-surfaceLight border border-border rounded-full px-3 py-1">
          <Text className="text-textSecondary text-[10px] font-bold uppercase tracking-wider">
            {currentMonthName} {now.getFullYear()}
          </Text>
        </View>
      </View>

      {/* Horizontally Scrollable Bar Chart */}
      <ScrollView 
        ref={scrollRef}
        horizontal 
        showsHorizontalScrollIndicator={false}
        className="mt-2"
        contentContainerStyle={{ alignItems: 'flex-end', paddingBottom: 6 }}
      >
        <View className="flex-row items-end gap-[7px] pt-4">
          {dailyExpenses.map((spent, idx) => {
            const dayNum = idx + 1
            const isSelected = selectedDay === dayNum
            
            // Calculate height of bar
            const barHeight = Math.max((spent / maxVal) * chartHeight, spent > 0 ? 8 : 4)
            
            return (
              <TouchableOpacity
                key={dayNum}
                onPress={() => setSelectedDay(dayNum)}
                className="items-center"
                activeOpacity={0.7}
              >
                {/* Visual Bar */}
                <View 
                  style={{ 
                    height: barHeight, 
                    width: 14,
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                    borderBottomLeftRadius: 2,
                    borderBottomRightRadius: 2,
                    backgroundColor: isSelected ? colors.primary : `${colors.primary}44`,
                    shadowColor: isSelected ? colors.primary : 'transparent',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isSelected ? 0.4 : 0,
                    shadowRadius: 6,
                    elevation: isSelected ? 4 : 0,
                  }}
                  className={`transition-all duration-150 ${isSelected ? 'scale-x-105' : ''}`}
                />
                
                {/* Day Label */}
                <Text 
                  className={`text-[9px] mt-2 font-bold ${
                    isSelected ? 'text-primary' : 'text-textSecondary'
                  }`}
                >
                  {dayNum}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

function ExpenseItem({ expense, onDelete, onEdit }: { expense: Expense; onDelete: (id: string) => void; onEdit: (expense: Expense) => void }) {
  const { colors } = useAppTheme()
  const { profile } = useAuthStore()
  const swipeableRef = useRef<any>(null)
  
  const formattedDate = expense.created_at 
    ? `${new Date(expense.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${new Date(expense.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}`
    : ''

  const renderSwipeActions = () => (
    <View className="flex-row items-center pl-2 mb-2" style={{ height: '100%' }}>
      <TouchableOpacity 
        className="bg-primary justify-center items-center px-4 rounded-xl mr-2 h-[52px]"
        onPress={() => {
          swipeableRef.current?.close()
          onEdit(expense)
        }}
      >
        <Pencil size={20} className="text-white" />
      </TouchableOpacity>
      <TouchableOpacity 
        className="bg-error justify-center items-center px-4 rounded-xl h-[52px] mr-2"
        onPress={() => {
          swipeableRef.current?.close()
          Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(expense.id) }
          ])
        }}
      >
        <Trash2 size={20} className="text-white" />
      </TouchableOpacity>
    </View>
  )

  const renderRightSwipeActions = () => (
    <View className="flex-row items-center pr-2 mb-2" style={{ height: '100%' }}>
      <TouchableOpacity 
        className="bg-primary justify-center items-center px-4 rounded-xl mr-2 h-[52px]"
        onPress={() => {
          swipeableRef.current?.close()
          onEdit(expense)
        }}
      >
        <Pencil size={20} className="text-white" />
      </TouchableOpacity>
      <TouchableOpacity 
        className="bg-error justify-center items-center px-4 rounded-xl h-[52px]"
        onPress={() => {
          swipeableRef.current?.close()
          Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(expense.id) }
          ])
        }}
      >
        <Trash2 size={20} className="text-white" />
      </TouchableOpacity>
    </View>
  )

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderSwipeActions}
      renderRightActions={renderRightSwipeActions}
    >
      <View className="flex-row items-center bg-surface rounded-xl p-4 mb-2 border border-border">
        <View 
          className="w-11 h-11 rounded-xl justify-center items-center" 
          style={{ backgroundColor: (expense.category?.color ?? '#333') + '22' }}
        >
          {expense.category?.icon ? (
            <Text className="text-[22px]">{expense.category.icon}</Text>
          ) : (
            <Box size={24} color={expense.category?.color ?? colors.primary} />
          )}
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-text font-semibold text-[15px]">{expense.title}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Text className="text-textSecondary text-[12px]">{expense.category?.name ?? 'Uncategorized'}</Text>
            {formattedDate && (
              <>
                <Text className="text-textSecondary text-[12px]">•</Text>
                <Text className="text-textSecondary text-[11px]">{formattedDate}</Text>
              </>
            )}
          </View>
        </View>
        <View className="items-end">
          <Text className="text-text font-bold text-[15px]">{formatCurrency(Number(expense.amount), profile?.currency ?? 'NPR')}</Text>
        </View>
      </View>
    </Swipeable>
  )
}

function PulsingOrb({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current
  const opacity = useRef(new Animated.Value(0.6)).current

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.6,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.2,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start()
  }, [scale, opacity])

  return (
    <View className="justify-center items-center w-8 h-8">
      {/* Outer Pulse */}
      <Animated.View
        style={{
          transform: [{ scale }],
          opacity,
          backgroundColor: color,
        }}
        className="absolute w-4 h-4 rounded-full"
      />
      {/* Inner Solid Orb */}
      <View
        style={{ backgroundColor: color }}
        className="w-3.5 h-3.5 rounded-full z-10"
      />
    </View>
  )
}