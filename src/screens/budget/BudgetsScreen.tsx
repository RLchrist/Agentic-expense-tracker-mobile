import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Plus, Wallet, Trash2, AlertTriangle, X } from 'lucide-react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBudgetStore } from '../../store/budgetStore'
import { useExpenseStore } from '../../store/expenseStore'
import { useAppTheme } from '../../hooks/useAppTheme'
import { useUiStore } from '../../store/uiStore'
import { Category } from '../../types'
import { checkBudgetAlerts } from '../../services/notifications/budgetAlerts'
import { addBudgetSchema, type AddBudgetFormData } from './budgetSchema'
import OutlinedInput from '../../components/forms/OutlinedInput'
import { Skeleton } from '../../components/common/Skeleton'
import OfflineBanner from '../../components/common/OfflineBanner'

export default function BudgetsScreen() {
  const { colors } = useAppTheme()
  const { showToast } = useUiStore()
  const { budgets, isLoading, fetchBudgets, addBudget, deleteBudget } = useBudgetStore()
  const { expenses, categories } = useExpenseStore()
  const [showModal, setShowModal] = useState(false)

useEffect(() => {
  fetchBudgets(expenses)
}, [expenses])

// Check alerts whenever budgets update
useEffect(() => {
  if (budgets.length > 0) {
    checkBudgetAlerts(budgets)
  }
}, [budgets])


  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const overBudget = budgets.filter((b) => b.percentage >= 100).length

  return (
    <SafeAreaView className="flex-1 bg-background">
      <OfflineBanner />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => fetchBudgets(expenses)}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View className="flex-row justify-between items-center p-6 pb-2">
          <Text className="text-[26px] font-bold text-text">Budgets</Text>
          <TouchableOpacity 
            className="flex-row items-center bg-primary rounded-xl px-4 py-2" 
            onPress={() => setShowModal(true)}
          >
            <Plus size={16} className="text-white mr-1" />
            <Text className="text-white font-bold text-sm">New</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View className="flex-row gap-2 px-6 mb-4">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <View key={i} className="flex-1 bg-surface rounded-xl p-4 items-center border border-border">
                  <Skeleton width={60} height={12} borderRadius={4} />
                  <Skeleton width={80} height={16} borderRadius={4} className="mt-2" />
                </View>
              ))}
            </>
          ) : (
            <>
              <View className="flex-1 bg-surface rounded-xl p-4 items-center border border-border">
                <Text className="text-textSecondary text-[11px] mb-1">Total Budget</Text>
                <Text className="text-text font-bold text-sm">Rs.{totalBudget.toLocaleString('en-NP')}</Text>
              </View>
              <View className="flex-1 bg-surface rounded-xl p-4 items-center border border-border">
                <Text className="text-textSecondary text-[11px] mb-1">Total Spent</Text>
                <Text className="text-secondary font-bold text-sm">
                  Rs.{totalSpent.toLocaleString('en-NP')}
                </Text>
              </View>
              <View className="flex-1 bg-surface rounded-xl p-4 items-center border border-border">
                <Text className="text-textSecondary text-[11px] mb-1">Over Budget</Text>
                <Text className={`font-bold text-sm ${overBudget > 0 ? 'text-error' : 'text-success'}`}>
                  {overBudget}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Budget cards */}
        <View className="p-6 pt-0 gap-2">
          {isLoading ? (
            [1, 2].map((i) => (
              <View key={i} className="bg-surface rounded-2xl p-4 border border-border">
                <View className="flex-row items-center gap-2 mb-4">
                  <Skeleton width={44} height={44} borderRadius={12} />
                  <View className="gap-1.5">
                    <Skeleton width={120} height={14} borderRadius={4} />
                    <Skeleton width={80} height={12} borderRadius={4} />
                  </View>
                </View>
                <Skeleton width="100%" height={8} borderRadius={4} />
                <View className="flex-row justify-between mt-2">
                  <Skeleton width={100} height={12} borderRadius={4} />
                  <Skeleton width={80} height={12} borderRadius={4} />
                </View>
              </View>
            ))
          ) : budgets.length === 0 ? (
            <View className="items-center py-12">
              <Wallet size={52} className="text-textSecondary mb-2" />
              <Text className="text-text text-lg font-bold">No budgets yet</Text>
              <Text className="text-textSecondary text-sm mt-1">Tap "+ New" to set a budget</Text>
            </View>
          ) : (
            budgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onDelete={() => {
                  Alert.alert('Delete Budget', 'Are you sure?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteBudget(budget.id) },
                  ])
                }}
              />
            ))
          )}
        </View>
      </ScrollView>

      <AddBudgetModal
        visible={showModal}
        categories={categories}
        onClose={() => setShowModal(false)}
        onAdd={async (data) => {
          await addBudget(data)
          setShowModal(false)
          showToast('Budget created!')
        }}
      />
    </SafeAreaView>
  )
}

function BudgetCard({ budget, onDelete }: { budget: any; onDelete: () => void }) {
  const { colors } = useAppTheme()
  const isOver = budget.percentage >= 100
  const isWarning = budget.percentage >= 80 && budget.percentage < 100
  const barColor = isOver ? colors.error : isWarning ? colors.warning : colors.success

  return (
    <View className="bg-surface rounded-2xl p-4 border border-border">
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center gap-2">
          <View 
            className="w-11 h-11 rounded-xl justify-center items-center" 
            style={{ backgroundColor: (budget.category?.color ?? colors.primary) + '33' }}
          >
            {budget.category?.icon ? (
              <Text className="text-[22px]">{budget.category.icon}</Text>
            ) : (
              <Wallet size={24} color={budget.category?.color ?? colors.primary} />
            )}
          </View>
          <View>
            <Text className="text-text font-semibold text-[15px]">
              {budget.category?.name ?? 'Overall'}
            </Text>
            <Text className="text-textSecondary text-[12px]">{budget.period} · {budget.start_date}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onDelete}>
          <Trash2 size={20} className="text-error" />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View className="h-2 bg-background rounded-full overflow-hidden mb-1">
        <View 
          className="h-full rounded-full" 
          style={{ width: `${Math.min(budget.percentage, 100)}%`, backgroundColor: barColor }} 
        />
      </View>

      <View className="flex-row justify-between">
        <Text className="text-text text-[13px] font-semibold">
          Rs.{budget.spent.toLocaleString('en-NP')} spent
        </Text>
        <Text className="text-textSecondary text-[13px]">
          of Rs.{Number(budget.amount).toLocaleString('en-NP')}
        </Text>
      </View>

      {isOver && (
        <View className="mt-2 bg-error/15 rounded-lg p-2 items-center border border-error flex-row justify-center gap-2">
          <AlertTriangle size={14} className="text-error" />
          <Text className="text-error text-[12px] font-semibold">Over budget by Rs.{(budget.spent - Number(budget.amount)).toFixed(0)}</Text>
        </View>
      )}
    </View>
  )
}

function AddBudgetModal({ visible, categories, onClose, onAdd }: {
  visible: boolean
  categories: Category[]
  onClose: () => void
  onAdd: (data: any) => Promise<void>
}) {
  const { colors } = useAppTheme()
  const { showToast } = useUiStore()
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(false)

  const { control, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<AddBudgetFormData>({
    resolver: zodResolver(addBudgetSchema),
    defaultValues: { amount: '', period: 'monthly' },
  })

  const period = watch('period')

  const handleAdd = handleSubmit(async (data) => {
    const now = new Date()
    const start = now.toISOString().split('T')[0]
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    setLoading(true)
    await onAdd({
      amount: parseFloat(data.amount),
      category_id: selectedCategory?.id ?? null,
      period: data.period,
      start_date: start,
      end_date: end,
    })
    setLoading(false)
    setSelectedCategory(null)
    reset()
  })

  const handleClose = () => {
    reset()
    setSelectedCategory(null)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-surface rounded-t-[24px] p-6 max-h-[85%]">
          <View className="w-10 h-1 bg-border rounded-full self-center mb-4" />
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-lg font-bold text-text">New Budget</Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} className="text-textSecondary" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Amount */}
            <Controller
              control={control}
              name="amount"
              render={({ field: { onChange, onBlur, value } }) => (
                <OutlinedInput
                  label="Budget Amount (NPR)"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.amount?.message}
                  placeholder="e.g. 5000"
                  keyboardType="decimal-pad"
                />
              )}
            />

            {/* Period */}
            <View className="mb-4 mt-2">
              <Text className="text-textSecondary text-[13px] font-semibold mb-1">Period</Text>
              <View className="flex-row gap-2 flex-wrap">
                {(['monthly', 'weekly'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    className={`px-4 py-2 rounded-full border ${period === p ? 'bg-primary border-primary' : 'bg-background border-border'}`}
                    onPress={() => setValue('period', p, { shouldValidate: true })}
                  >
                    <Text className={`text-[13px] font-medium ${period === p ? 'text-white' : 'text-textSecondary'}`}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.period && (
                <Text className="text-rose-500 text-[11px] mt-1">{errors.period.message}</Text>
              )}
            </View>

            {/* Category */}
            <View className="mb-4">
              <Text className="text-textSecondary text-[13px] font-semibold mb-1">Category (optional — leave empty for overall)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2 flex-wrap">
                  <TouchableOpacity
                    className={`px-4 py-2 rounded-full border ${!selectedCategory ? 'bg-primary border-primary' : 'bg-background border-border'}`}
                    onPress={() => setSelectedCategory(null)}
                  >
                    <Text className={`text-[13px] font-medium ${!selectedCategory ? 'text-white' : 'text-textSecondary'}`}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      className="px-4 py-2 rounded-full border"
                      style={[
                        { backgroundColor: colors.background, borderColor: colors.border },
                        selectedCategory?.id === cat.id && {
                          backgroundColor: cat.color + '33',
                          borderColor: cat.color,
                        },
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text className="text-textSecondary text-[13px] font-medium">{cat.icon} {cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <TouchableOpacity
              className={`bg-primary rounded-xl p-4 items-center mt-4 ${loading ? 'opacity-70' : ''}`}
              onPress={handleAdd}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator className="text-white" />
                : <Text className="text-white font-bold text-base">Create Budget</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
