import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, TextInput
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useExpenseStore } from '../../store/expenseStore'
import { COLORS, SPACING } from '../../constants'
import { Expense } from '../../types'

export default function ExpensesScreen({ navigation }: any) {
  const { expenses, isLoading, fetchExpenses, deleteExpense } = useExpenseStore()
  const [search, setSearch] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  useEffect(() => { fetchExpenses() }, [])

  const filtered = expenses.filter((e) => {
    const matchSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.category?.name.toLowerCase().includes(search.toLowerCase())

    if (!matchSearch) return false

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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Expenses</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddExpense')}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search expenses..."
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              selectedFilter === f.key && styles.filterChipActive
            ]}
            onPress={() => setSelectedFilter(f.key as any)}
          >
            <Text style={[
              styles.filterText,
              selectedFilter === f.key && styles.filterTextActive
            ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {filtered.length} expense{filtered.length !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.summaryAmount}>
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
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🧾</Text>
            <Text style={styles.emptyText}>No expenses found</Text>
            <Text style={styles.emptySubtext}>
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
  return (
    <View style={rowStyles.container}>
      <View style={[rowStyles.iconBox, { backgroundColor: (expense.category?.color ?? '#888') + '33' }]}>
        <Text style={rowStyles.icon}>{expense.category?.icon ?? '📦'}</Text>
      </View>

      <View style={rowStyles.info}>
        <Text style={rowStyles.title} numberOfLines={1}>{expense.title}</Text>
        <View style={rowStyles.meta}>
          <Text style={rowStyles.category}>{expense.category?.name ?? 'Uncategorized'}</Text>
          <Text style={rowStyles.dot}>·</Text>
          <Text style={rowStyles.date}>{expense.expense_date}</Text>
          <Text style={rowStyles.dot}>·</Text>
          <Text style={rowStyles.payment}>{expense.payment_method}</Text>
        </View>
        {expense.note ? (
          <Text style={rowStyles.note} numberOfLines={1}>📝 {expense.note}</Text>
        ) : null}
      </View>

      <View style={rowStyles.right}>
        <Text style={rowStyles.amount}>
          Rs.{Number(expense.amount).toLocaleString('en-NP')}
        </Text>
        <TouchableOpacity
          onPress={() => onDelete(expense.id)}
          style={rowStyles.deleteBtn}
        >
          <Text style={rowStyles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: SPACING.lg, paddingBottom: SPACING.sm,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.text },
  addBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
  },
  addBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  searchIcon: { fontSize: 16, marginRight: SPACING.xs },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: SPACING.sm },
  filterRow: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: 20, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: COLORS.white },
  summaryBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surface, marginHorizontal: SPACING.lg,
    borderRadius: 10, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  summaryText: { color: COLORS.textSecondary, fontSize: 13 },
  summaryAmount: { color: COLORS.text, fontWeight: 'bold', fontSize: 13 },
  listContent: { padding: SPACING.lg, paddingTop: SPACING.sm, gap: SPACING.sm },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 52, marginBottom: SPACING.sm },
  emptyText: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  emptySubtext: { color: COLORS.textSecondary, fontSize: 14, marginTop: SPACING.xs },
})

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 14,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  iconBox: {
    width: 46, height: 46, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  icon: { fontSize: 22 },
  info: { flex: 1, marginLeft: SPACING.sm },
  title: { color: COLORS.text, fontWeight: '600', fontSize: 15 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, flexWrap: 'wrap' },
  category: { color: COLORS.textSecondary, fontSize: 12 },
  dot: { color: COLORS.border, marginHorizontal: 4, fontSize: 12 },
  date: { color: COLORS.textSecondary, fontSize: 12 },
  payment: { color: COLORS.textSecondary, fontSize: 12 },
  note: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: SPACING.xs },
  amount: { color: COLORS.text, fontWeight: 'bold', fontSize: 14 },
  deleteBtn: { padding: 2 },
  deleteText: { fontSize: 15 },
})