import { useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../../store/authStore'
import { useExpenseStore } from '../../store/expenseStore'
import { COLORS, SPACING } from '../../constants'
import { Expense } from '../../types'

export default function DashboardScreen({ navigation }: any) {
  const { profile, signOut } = useAuthStore()
  const {
    expenses, isLoading,
    fetchExpenses, fetchCategories,
    getTotalByPeriod, deleteExpense
  } = useExpenseStore()

  useEffect(() => {
    fetchExpenses()
    fetchCategories()
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

        {/* Month total card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total This Month</Text>
          <Text style={styles.heroAmount}>
            Rs. {monthTotal.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
          </Text>
          <View style={styles.heroRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillLabel}>Today</Text>
              <Text style={styles.heroPillAmount}>Rs. {todayTotal.toFixed(0)}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillLabel}>This Week</Text>
              <Text style={styles.heroPillAmount}>Rs. {weekTotal.toFixed(0)}</Text>
            </View>
          </View>
        </View>

        {/* Quick add button */}
        <TouchableOpacity
          style={styles.quickAdd}
          onPress={() => navigation.navigate('AddExpense')}
        >
          <Text style={styles.quickAddText}>➕  Add Expense</Text>
        </TouchableOpacity>

        {/* Recent expenses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Expenses')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
          ) : recentExpenses.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🧾</Text>
              <Text style={styles.emptyText}>No expenses yet</Text>
              <Text style={styles.emptySubtext}>Tap Add Expense to get started</Text>
            </View>
          ) : (
            recentExpenses.map((expense) => (
              <ExpenseItem key={expense.id} expense={expense} onDelete={deleteExpense} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function ExpenseItem({ expense, onDelete }: { expense: Expense; onDelete: (id: string) => void }) {
  return (
    <View style={itemStyles.container}>
      <View style={[itemStyles.iconBox, { backgroundColor: expense.category?.color + '33' ?? '#333' }]}>
        <Text style={itemStyles.icon}>{expense.category?.icon ?? '📦'}</Text>
      </View>
      <View style={itemStyles.info}>
        <Text style={itemStyles.title}>{expense.title}</Text>
        <Text style={itemStyles.meta}>
          {expense.category?.name ?? 'Uncategorized'} · {expense.expense_date}
        </Text>
      </View>
      <View style={itemStyles.right}>
        <Text style={itemStyles.amount}>Rs. {Number(expense.amount).toFixed(0)}</Text>
        <TouchableOpacity onPress={() => onDelete(expense.id)}>
          <Text style={itemStyles.delete}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: SPACING.lg, paddingBottom: SPACING.sm
  },
  greeting: { fontSize: 14, color: COLORS.textSecondary },
  name: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  signOutBtn: {
    backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border
  },
  signOutText: { color: COLORS.textSecondary, fontSize: 13 },
  heroCard: {
    margin: SPACING.lg, marginTop: SPACING.sm,
    backgroundColor: COLORS.primary, borderRadius: 20,
    padding: SPACING.lg,
  },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: SPACING.xs },
  heroAmount: { color: COLORS.white, fontSize: 36, fontWeight: 'bold', marginBottom: SPACING.md },
  heroRow: { flexDirection: 'row', gap: SPACING.sm },
  heroPill: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10, padding: SPACING.sm, alignItems: 'center'
  },
  heroPillLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  heroPillAmount: { color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
  quickAdd: {
    marginHorizontal: SPACING.lg, backgroundColor: COLORS.surface,
    borderRadius: 12, padding: SPACING.md, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed'
  },
  quickAddText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
  section: { padding: SPACING.lg, paddingTop: SPACING.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  seeAll: { color: COLORS.primary, fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.sm },
  emptyText: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  emptySubtext: { color: COLORS.textSecondary, fontSize: 14, marginTop: SPACING.xs },
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