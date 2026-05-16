import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Plus } from 'lucide-react-native'
import { useExpenseStore } from '../../store/expenseStore'
import { useAuthStore } from '../../store/authStore'
import { COLORS } from '../../constants'
import { Category } from '../../types'

export default function AddExpenseScreen({ navigation }: any) {
  const { categories, paymentMethods, addExpense, addCategory, addPaymentMethod } = useExpenseStore()
  const { profile } = useAuthStore()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedPayment, setSelectedPayment] = useState('cash')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringPeriod, setRecurringPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)

  // Custom Prompt State (since Alert.prompt is iOS only)
  const [promptVisible, setPromptVisible] = useState(false)
  const [promptTitle, setPromptTitle] = useState('')
  const [promptValue, setPromptValue] = useState('')
  const [promptType, setPromptType] = useState<'category' | 'payment'>('category')

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Error', 'Please enter a title'); return }
    if (!amount || isNaN(Number(amount))) { Alert.alert('Error', 'Please enter a valid amount'); return }
    if (!selectedCategory) { Alert.alert('Error', 'Please select a category'); return }

    setLoading(true)
    await addExpense({
      title: title.trim(),
      amount: parseFloat(amount),
      currency: profile?.currency ?? 'NPR',
      category_id: selectedCategory.id,
      note: note.trim() || null,
      receipt_url: null,
      expense_date: expenseDate,
      payment_method: selectedPayment,
      is_synced: true,
      is_recurring: isRecurring,
      recurring_period: isRecurring ? recurringPeriod : null,
      local_id: null,
    })
    setLoading(false)
    Alert.alert('Success', 'Expense added!', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ])
  }

  const handleAddNewCategory = () => {
    setPromptTitle('New Category')
    setPromptType('category')
    setPromptValue('')
    setPromptVisible(true)
  }

  const handleAddNewPayment = () => {
    setPromptTitle('New Payment Method')
    setPromptType('payment')
    setPromptValue('')
    setPromptVisible(true)
  }

  const handlePromptSubmit = async () => {
    if (!promptValue.trim()) return

    if (promptType === 'category') {
      const newCat = await addCategory({ 
        name: promptValue.trim(), 
        icon: '📦', 
        color: COLORS.primary 
      })
      if (newCat) setSelectedCategory(newCat)
    } else {
      addPaymentMethod({ 
        label: promptValue.trim(), 
        icon: '💳' 
      })
      setSelectedPayment(promptValue.trim().toLowerCase().replace(/\s+/g, '_'))
    }
    setPromptVisible(false)
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between p-6">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-[60px]">
            <ArrowLeft size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-text">Add Expense</Text>
          <View className="w-[60px]" />
        </View>

        <View className="p-6 gap-6">
          {/* Amount — big input */}
          <View className="bg-surface rounded-2xl p-6 border border-border items-center">
            <Text className="text-textSecondary text-sm mb-2">Amount (NPR)</Text>
            <View className="flex-row items-center">
              <Text className="text-textSecondary text-2xl mr-2">Rs.</Text>
              <TextInput
                className="text-text text-[48px] font-bold min-w-[150px] text-center"
                placeholder="0.00"
                placeholderTextColor={COLORS.textSecondary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Title */}
          <View className="gap-1">
            <Text className="text-sm font-semibold text-textSecondary">Title</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl p-4 text-text text-base"
              placeholder="e.g. Lunch at Bhojan Griha"
              placeholderTextColor={COLORS.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Date */}
          <View className="gap-1">
            <Text className="text-sm font-semibold text-textSecondary">Date</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl p-4 text-text text-base"
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textSecondary}
              value={expenseDate}
              onChangeText={setExpenseDate}
            />
          </View>

          {/* Categories */}
          <View className="gap-1">
            <Text className="text-sm font-semibold text-textSecondary">Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2 pb-1">
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    className="flex-row items-center gap-1.5 bg-surface border border-border rounded-full px-4 py-2"
                    style={[
                      selectedCategory?.id === cat.id && {
                        backgroundColor: cat.color + '33',
                        borderColor: cat.color,
                      }
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text className="text-base">{cat.icon}</Text>
                    <Text className={`text-[13px] font-medium ${selectedCategory?.id === cat.id ? '' : 'text-textSecondary'}`}
                      style={[selectedCategory?.id === cat.id && { color: cat.color }]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  className="flex-row items-center gap-1.5 border border-border rounded-full px-4 py-2 border-dashed border-primary bg-transparent"
                  onPress={handleAddNewCategory}
                >
                  <Plus size={16} color={COLORS.primary} />
                  <Text className="text-primary text-[13px] font-bold">Add New</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* Payment method */}
          <View className="gap-1">
            <Text className="text-sm font-semibold text-textSecondary">Payment Method</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2 pb-1">
                {paymentMethods.map((pm) => (
                  <TouchableOpacity
                    key={pm.value}
                    className={`flex-row items-center gap-1.5 bg-surface border rounded-full px-4 py-2 ${selectedPayment === pm.value ? 'bg-primary/20 border-primary' : 'border-border'}`}
                    onPress={() => setSelectedPayment(pm.value)}
                  >
                    <Text className="text-base">{pm.icon}</Text>
                    <Text className={`text-[13px] font-medium ${selectedPayment === pm.value ? 'text-primary' : 'text-textSecondary'}`}>
                      {pm.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  className="flex-row items-center gap-1.5 border border-border rounded-full px-4 py-2 border-dashed border-primary bg-transparent"
                  onPress={handleAddNewPayment}
                >
                  <Plus size={16} color={COLORS.primary} />
                  <Text className="text-primary text-[13px] font-bold">Add New</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* Recurring */}
          <View className="gap-1">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm font-semibold text-textSecondary">Recurring Expense</Text>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>
            {isRecurring && (
              <View className="flex-row gap-2 mt-1">
                {['daily', 'weekly', 'monthly', 'yearly'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    className={`flex-1 py-2 rounded-xl border items-center ${recurringPeriod === p ? 'bg-primary/20 border-primary' : 'bg-surface border-border'}`}
                    onPress={() => setRecurringPeriod(p as any)}
                  >
                    <Text className={`text-[13px] font-medium ${recurringPeriod === p ? 'text-primary' : 'text-textSecondary'}`}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Note */}
          <View className="gap-1">
            <Text className="text-sm font-semibold text-textSecondary">Note (optional)</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl p-4 text-text text-base h-20"
              style={{ textAlignVertical: 'top' }}
              placeholder="Any additional details..."
              placeholderTextColor={COLORS.textSecondary}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Save button */}
          <TouchableOpacity
            className={`bg-primary rounded-xl p-4 items-center mt-2 ${loading ? 'opacity-70' : ''}`}
            onPress={handleSave}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text className="text-white text-base font-bold">Save Expense</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Cross-platform Prompt Modal */}
      <Modal
        visible={promptVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPromptVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-center p-8">
          <View className="bg-surface rounded-[20px] p-6 border border-border">
            <Text className="text-text text-lg font-bold mb-4">{promptTitle}</Text>
            <TextInput
              className="bg-background border border-border rounded-xl p-4 text-text text-base mb-6"
              value={promptValue}
              onChangeText={setPromptValue}
              placeholder="Enter name..."
              placeholderTextColor={COLORS.textSecondary}
              autoFocus
            />
            <View className="flex-row justify-end gap-4">
              <TouchableOpacity 
                className="py-2 px-4" 
                onPress={() => setPromptVisible(false)}
              >
                <Text className="text-textSecondary text-base font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="bg-primary py-2 px-6 rounded-lg" 
                onPress={handlePromptSubmit}
              >
                <Text className="text-white text-base font-bold">Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
