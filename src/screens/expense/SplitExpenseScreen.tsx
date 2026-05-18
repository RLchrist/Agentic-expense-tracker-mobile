import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Plus, Trash2, Check, ArrowLeft, Users, DivideCircle, Receipt, Wand2 } from 'lucide-react-native'
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

  const [expenses, setExpenses] = useState<GroupExpenseItem[]>([
    { id: '1', payerName: '', amount: 0, description: '' }
  ])
  const [totalFriends, setTotalFriends] = useState('')
  const [splitResult, setSplitResult] = useState<SplitResult | null>(null)
  
  const [aiInputText, setAiInputText] = useState('')
  const [isParsingAI, setIsParsingAI] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleAIParsing = async () => {
    if (!aiInputText.trim()) return
    setIsParsingAI(true)
    try {
      const response = await aiRouter.parseGroupExpense(aiInputText)
      if (response.success && response.data?.expenses) {
        const parsedExpenses = response.data.expenses.map((exp: any) => ({
          id: Math.random().toString(),
          payerName: exp.payerName || '',
          amount: parseFloat(exp.amount) || 0,
          description: exp.description || ''
        }))
        if (parsedExpenses.length > 0) {
          setExpenses(parsedExpenses)
          setAiInputText('')
        }
      } else {
        Alert.alert('AI Parse Failed', 'Could not extract expenses from text. Please try entering them manually.')
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to process text with AI.')
    } finally {
      setIsParsingAI(false)
    }
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

      // 1. Save actual expenses paid by the user
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

      // 2. Save settlements where the user owes money
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
  
  const addExpenseLine = () => {
    setExpenses([...expenses, { id: Math.random().toString(), payerName: '', amount: 0, description: '' }])
  }

  const updateExpense = (id: string, field: keyof GroupExpenseItem, value: string | number) => {
    setExpenses(prev => prev.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    ))
  }

  const removeExpense = (id: string) => {
    if (expenses.length > 1) {
      setExpenses(prev => prev.filter(exp => exp.id !== id))
    }
  }

  const handleDone = () => {
    // Validate
    const validExpenses = expenses.filter(e => e.payerName.trim() && e.amount > 0)
    if (validExpenses.length === 0) {
      Alert.alert('Error', 'Please enter at least one valid expense with a name and amount.')
      return
    }

    const uniquePayers = new Set(validExpenses.map(e => e.payerName.trim())).size
    const friendsCount = parseInt(totalFriends, 10)

    if (isNaN(friendsCount) || friendsCount < uniquePayers) {
      Alert.alert('Error', `Please enter a valid number of friends (at least ${uniquePayers}).`)
      return
    }

    const result = calculateSplit(validExpenses, friendsCount)
    setSplitResult(result)
  }

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
        <Text className="text-xl font-bold text-text">Group Trip Expense</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="bg-surface p-4 rounded-xl border border-border flex-row items-center gap-3 mb-6">
            <Users size={20} className="text-primary" />
            <TextInput
              placeholder="Total number of friends?"
              placeholderTextColor={colors.textSecondary}
              value={totalFriends}
              onChangeText={setTotalFriends}
              keyboardType="number-pad"
              className="flex-1 text-text text-[15px]"
            />
          </View>

          <View className="bg-surface p-4 rounded-xl border border-border mb-6">
            <Text className="text-text font-bold text-[16px] mb-2">Paste from chat</Text>
            <TextInput
              placeholder="e.g. Ram paid Rs. 600 for snacks and Ramesh paid Rs. 700 on drinks"
              placeholderTextColor={colors.textSecondary}
              value={aiInputText}
              onChangeText={setAiInputText}
              multiline
              className="bg-background px-4 py-3 rounded-xl border border-border text-text min-h-[80px]"
            />
            <TouchableOpacity 
              className="mt-3 flex-row items-center justify-center bg-primary/10 py-3 rounded-xl border border-primary/20"
              onPress={handleAIParsing}
              disabled={isParsingAI || !aiInputText.trim()}
            >
              <Wand2 size={18} className="text-primary mr-2" />
              <Text className="text-primary font-bold">
                {isParsingAI ? 'Parsing...' : 'Parse with AI'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="text-text font-bold text-[16px] mb-4">Manual Entries</Text>
          
          {expenses.map((exp, index) => (
            <View key={exp.id} className="bg-surface p-4 rounded-xl border border-border mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-textSecondary font-semibold text-xs">Expense #{index + 1}</Text>
                <TouchableOpacity onPress={() => removeExpense(exp.id)} className="p-1">
                  <Trash2 size={16} className="text-error" />
                </TouchableOpacity>
              </View>
              
              <View className="gap-3">
                <TextInput
                  placeholder="Who paid? (e.g. Ram)"
                  placeholderTextColor={colors.textSecondary}
                  value={exp.payerName}
                  onChangeText={(val) => updateExpense(exp.id, 'payerName', val)}
                  className="bg-background px-4 py-3 rounded-xl border border-border text-text"
                />
                <TextInput
                  placeholder="Amount (Rs.)"
                  placeholderTextColor={colors.textSecondary}
                  value={exp.amount ? exp.amount.toString() : ''}
                  onChangeText={(val) => updateExpense(exp.id, 'amount', parseFloat(val) || 0)}
                  keyboardType="decimal-pad"
                  className="bg-background px-4 py-3 rounded-xl border border-border text-text"
                />
                <TextInput
                  placeholder="For what? (e.g. Snacks)"
                  placeholderTextColor={colors.textSecondary}
                  value={exp.description}
                  onChangeText={(val) => updateExpense(exp.id, 'description', val)}
                  className="bg-background px-4 py-3 rounded-xl border border-border text-text"
                />
              </View>
            </View>
          ))}

          <TouchableOpacity 
            className="flex-row items-center justify-center py-4 border border-dashed border-primary rounded-xl mb-6"
            onPress={addExpenseLine}
          >
            <Plus size={20} className="text-primary mr-2" />
            <Text className="text-primary font-bold">Add Another Expense</Text>
          </TouchableOpacity>
        </ScrollView>
        
        <View className="px-6 py-4 bg-background border-t border-border" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <TouchableOpacity 
            className="w-full bg-primary py-4 rounded-xl items-center flex-row justify-center gap-2"
            onPress={handleDone}
          >
            <DivideCircle size={20} className="text-white" />
            <Text className="text-white font-bold text-[16px]">Calculate Split</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}
