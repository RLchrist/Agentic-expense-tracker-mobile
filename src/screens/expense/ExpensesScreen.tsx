import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, Alert, TextInput
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Plus, Search, X, Trash2, List, FileText } from 'lucide-react-native'
import { useExpenseStore } from '../../store/expenseStore'
import { useAppTheme } from '../../hooks/useAppTheme'
import { Expense } from '../../types'

export default function ExpensesScreen({ navigation }: any) {
  const { colors } = useAppTheme()
  const { expenses, isLoading, fetchExpenses, deleteExpense } = useExpenseStore()
  const [search, setSearch] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => { fetchExpenses() }, [])

  const filtered = expenses.filter((e) => {
    const matchSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.category?.name.toLowerCase().includes(search.toLowerCase()) ||
      e.note?.toLowerCase().includes(search.toLowerCase())

    if (!matchSearch) return false

    if (selectedCategory && e.category_id !== selectedCategory) return false

    const now = new Date()
    const d = new Date(e.expense_date)

    if (selectedFilter === 'today')
      return d.toDateString() === now.toDateString()
    if (selectedFilter === 'week') {
      const weekAgo = new Date(now)
      weekAgo.setDate(now.getDate() - 7)
      return d >= weekAgo
    }
    if (selectedFilter === 'month')
      return d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()

    return true
  })

  const totalFiltered = filtered.reduce((sum, e) => sum + Number(e.amount), 0)

  const handleDelete = (id: string) => {
    Alert.alert('Delete Expense', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(id) },
    ])
  }

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
  ]

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row justify-between items-center p-6 pb-2">
        <Text className="text-[26px] font-bold text-text">Expenses</Text>
        <TouchableOpacity
          className="flex-row items-center bg-primary rounded-xl px-4 py-2"
          onPress={() => navigation.navigate('AddExpense')}
        >
          <Plus size={16} className="text-white mr-1" />
          <Text className="text-white font-bold text-sm">Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View className="flex-row items-center bg-surface rounded-xl mx-6 mb-2 px-4 border border-border">
        <Search size={16} className="text-textSecondary mr-2" />
        <TextInput
          className="flex-1 text-text text-[15px] py-2"
          placeholder="Search expenses..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={18} className="text-textSecondary" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View className="flex-row gap-2 px-6 mb-2">
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            className={`px-4 py-1.5 rounded-full border ${selectedFilter === f.key ? 'bg-primary border-primary' : 'bg-surface border-border'}`}
            onPress={() => setSelectedFilter(f.key as any)}
          >
            <Text className={`text-[13px] font-medium ${selectedFilter === f.key ? 'text-white' : 'text-textSecondary'}`}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category Filter */}
      <View className="mb-2">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: null, name: 'All Categories', icon: '' }, ...useExpenseStore.getState().categories]}
          keyExtractor={(item) => item.id ?? 'all'}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              className={`flex-row items-center px-4 py-1.5 rounded-full border ${selectedCategory === item.id ? 'bg-primary border-primary' : 'bg-surface border-border'}`}
              onPress={() => setSelectedCategory(item.id)}
            >
              {item.icon ? (
                <Text className="mr-1.5 text-base">{item.icon}</Text>
              ) : (
                <List size={14} color={selectedCategory === item.id ? colors.white : colors.textSecondary} className="mr-1.5" />
              )}
              <Text className={`text-[13px] font-medium ${selectedCategory === item.id ? 'text-white' : 'text-textSecondary'}`}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Summary bar */}
      <View className="flex-row justify-between px-6 py-2 bg-surface mx-6 rounded-xl mb-2 border border-border">
        <Text className="text-textSecondary text-[13px]">
          {filtered.length} expense{filtered.length !== 1 ? 's' : ''}
        </Text>
        <Text className="text-text font-bold text-[13px]">
          Rs. {totalFiltered.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchExpenses}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { padding: 24, paddingTop: 8, gap: 8 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-20">
            <List size={52} className="text-textSecondary mb-2" />
            <Text className="text-text text-lg font-bold">No expenses found</Text>
            <Text className="text-textSecondary text-sm mt-1">
              {search ? 'Try a different search' : 'Add your first expense'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ExpenseRow expense={item} onDelete={handleDelete} />
        )}
      />
    </SafeAreaView>
  )
}

function ExpenseRow({
  expense,
  onDelete,
}: {
  expense: Expense
  onDelete: (id: string) => void
}) {
  const { colors } = useAppTheme()
  return (
    <View className="flex-row items-center bg-surface rounded-2xl p-4 border border-border">
      <View 
        className="w-[46px] h-[46px] rounded-xl justify-center items-center" 
        style={{ backgroundColor: (expense.category?.color ?? '#888') + '33' }}
      >
        {expense.category?.icon ? (
          <Text className="text-[22px]">{expense.category.icon}</Text>
        ) : (
          <List size={24} color={expense.category?.color ?? colors.primary} />
        )}
      </View>

      <View className="flex-1 ml-3">
        <Text className="text-text font-semibold text-[15px]" numberOfLines={1}>{expense.title}</Text>
        <View className="flex-row items-center mt-1 flex-wrap">
          <Text className="text-textSecondary text-[12px]">{expense.category?.name ?? 'Uncategorized'}</Text>
          <Text className="text-border mx-1 text-[12px]">·</Text>
          <Text className="text-textSecondary text-[12px]">{expense.expense_date}</Text>
          <Text className="text-border mx-1 text-[12px]">·</Text>
          <Text className="text-textSecondary text-[12px] uppercase">{expense.payment_method}</Text>
        </View>
        {expense.note ? (
          <View className="flex-row items-center mt-1">
            <FileText size={10} className="text-textSecondary mr-1" />
            <Text className="text-textSecondary text-[11px]" numberOfLines={1}>{expense.note}</Text>
          </View>
        ) : null}
      </View>

      <View className="items-end gap-1">
        <Text className="text-text font-bold text-sm">
          Rs.{Number(expense.amount).toLocaleString('en-NP')}
        </Text>
        <TouchableOpacity
          onPress={() => onDelete(expense.id)}
          className="p-1"
        >
          <Trash2 size={16} className="text-error" />
        </TouchableOpacity>
      </View>
    </View>
  )
}