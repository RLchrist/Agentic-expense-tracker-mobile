import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Switch, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Plus } from 'lucide-react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useExpenseStore } from '../../store/expenseStore'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { useAppTheme } from '../../hooks/useAppTheme'
import { Category } from '../../types'
import { addExpenseSchema, type AddExpenseFormData } from './expenseSchema'
import OutlinedInput from '../../components/forms/OutlinedInput'

export default function AddExpenseScreen({ navigation }: any) {
  const { colors } = useAppTheme()
  const { showToast } = useUiStore()
  const { categories, paymentMethods, addExpense, addCategory, addPaymentMethod } = useExpenseStore()
  const { profile } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringPeriod, setRecurringPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly')

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<AddExpenseFormData>({
    resolver: zodResolver(addExpenseSchema),
    defaultValues: {
      title: '',
      amount: '',
      expenseDate: new Date().toISOString().split('T')[0],
      note: '',
      categoryId: '',
      paymentMethod: 'cash',
    },
  })

  const selectedCategoryId = watch('categoryId')
  const selectedPayment = watch('paymentMethod')

  const handleSave = handleSubmit(async (data) => {
    setLoading(true)
    await addExpense({
      title: data.title.trim(),
      amount: parseFloat(data.amount),
      currency: profile?.currency ?? 'NPR',
      category_id: data.categoryId,
      note: data.note?.trim() || null,
      receipt_url: null,
      expense_date: data.expenseDate,
      payment_method: data.paymentMethod,
      is_synced: true,
      is_recurring: isRecurring,
      recurring_period: isRecurring ? recurringPeriod : null,
      local_id: null,
    })
    setLoading(false)
    showToast('Expense added!')
    navigation.goBack()
  })

  const [promptVisible, setPromptVisible] = useState(false)
  const [promptTitle, setPromptTitle] = useState('')
  const [promptValue, setPromptValue] = useState('')
  const [promptType, setPromptType] = useState<'category' | 'payment'>('category')

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
        color: colors.primary,
      })
      if (newCat) {
        setSelectedCategory(newCat)
        setValue('categoryId', newCat.id, { shouldValidate: true })
      }
    } else {
      addPaymentMethod({
        label: promptValue.trim(),
        icon: '💳',
      })
      const newVal = promptValue.trim().toLowerCase().replace(/\s+/g, '_')
      setValue('paymentMethod', newVal, { shouldValidate: true })
    }
    setPromptVisible(false)
  }

  const setSelectedCategory = (cat: Category) => {
    setValue('categoryId', cat.id, { shouldValidate: true })
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between p-6">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-[60px]">
            <ArrowLeft size={24} className="text-primary" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-text">Add Expense</Text>
          <View className="w-[60px]" />
        </View>

        <View className="p-6 gap-6">
          {/* Amount — big input */}
          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, onBlur, value } }) => (
              <View className="bg-surface rounded-2xl p-6 border border-border items-center"
                style={errors.amount ? { borderColor: '#f43f5e' } : {}}
              >
                <Text className="text-textSecondary text-sm mb-2">Amount (NPR)</Text>
                <View className="flex-row items-center">
                  <Text className="text-textSecondary text-2xl mr-2">Rs.</Text>
                  <TextInput
                    className="text-text text-[48px] font-bold min-w-[150px] text-center"
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="decimal-pad"
                  />
                </View>
                {errors.amount && (
                  <Text className="text-rose-500 text-[11px] mt-1">{errors.amount.message}</Text>
                )}
              </View>
            )}
          />

          {/* Title */}
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, onBlur, value } }) => (
              <OutlinedInput
                label="Title"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.title?.message}
                placeholder="e.g. Lunch at Bhojan Griha"
              />
            )}
          />

          {/* Date */}
          <Controller
            control={control}
            name="expenseDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <OutlinedInput
                label="Date"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.expenseDate?.message}
                placeholder="YYYY-MM-DD"
              />
            )}
          />

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
                      selectedCategoryId === cat.id && {
                        backgroundColor: cat.color + '33',
                        borderColor: cat.color,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text className="text-base">{cat.icon}</Text>
                    <Text
                      className={`text-[13px] font-medium ${selectedCategoryId === cat.id ? '' : 'text-textSecondary'}`}
                      style={[selectedCategoryId === cat.id && { color: cat.color }]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  className="flex-row items-center gap-1.5 border border-border rounded-full px-4 py-2 border-dashed border-primary bg-transparent"
                  onPress={handleAddNewCategory}
                >
                  <Plus size={16} className="text-primary" />
                  <Text className="text-primary text-[13px] font-bold">Add New</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            {errors.categoryId && (
              <Text className="text-rose-500 text-[11px] ml-1">{errors.categoryId.message}</Text>
            )}
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
                    onPress={() => setValue('paymentMethod', pm.value, { shouldValidate: true })}
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
                  <Plus size={16} className="text-primary" />
                  <Text className="text-primary text-[13px] font-bold">Add New</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            {errors.paymentMethod && (
              <Text className="text-rose-500 text-[11px] ml-1">{errors.paymentMethod.message}</Text>
            )}
          </View>

          {/* Recurring */}
          <View className="gap-1">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm font-semibold text-textSecondary">Recurring Expense</Text>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: colors.border, true: colors.primary }}
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
          <Controller
            control={control}
            name="note"
            render={({ field: { onChange, onBlur, value } }) => (
              <OutlinedInput
                label="Note (optional)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.note?.message}
                placeholder="Any additional details..."
                multiline
                numberOfLines={3}
              />
            )}
          />

          <TouchableOpacity
            className={`bg-primary rounded-xl p-4 items-center mt-2 ${loading ? 'opacity-70' : ''}`}
            onPress={handleSave}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator className="text-white" />
              : <Text className="text-white text-base font-bold">Save Expense</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

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
              placeholderTextColor={colors.textSecondary}
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
