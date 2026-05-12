import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useBudgetStore } from '../../store/budgetStore'
import { useExpenseStore } from '../../store/expenseStore'
import { COLORS, SPACING } from '../../constants'
import { Category } from '../../types'

export default function BudgetsScreen() {
  const { budgets, isLoading, fetchBudgets, addBudget, deleteBudget } = useBudgetStore()
  const { expenses, categories } = useExpenseStore()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { fetchBudgets(expenses) }, [expenses])

  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const overBudget = budgets.filter((b) => b.percentage >= 100).length

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => fetchBudgets(expenses)}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Budgets</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Budget</Text>
            <Text style={styles.summaryValue}>Rs.{totalBudget.toLocaleString('en-NP')}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Spent</Text>
            <Text style={[styles.summaryValue, { color: COLORS.secondary }]}>
              Rs.{totalSpent.toLocaleString('en-NP')}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Over Budget</Text>
            <Text style={[styles.summaryValue, { color: overBudget > 0 ? COLORS.error : COLORS.success }]}>
              {overBudget}
            </Text>
          </View>
        </View>

        {/* Budget cards */}
        <View style={styles.section}>
          {budgets.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💰</Text>
              <Text style={styles.emptyText}>No budgets yet</Text>
              <Text style={styles.emptySubtext}>Tap "+ New" to set a budget</Text>
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
        }}
      />
    </SafeAreaView>
  )
}

function BudgetCard({ budget, onDelete }: { budget: any; onDelete: () => void }) {
  const isOver = budget.percentage >= 100
  const isWarning = budget.percentage >= 80 && budget.percentage < 100
  const barColor = isOver ? COLORS.error : isWarning ? COLORS.warning : COLORS.success

  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.top}>
        <View style={cardStyles.left}>
          <View style={[cardStyles.iconBox, { backgroundColor: (budget.category?.color ?? COLORS.primary) + '33' }]}>
            <Text style={cardStyles.icon}>{budget.category?.icon ?? '💰'}</Text>
          </View>
          <View>
            <Text style={cardStyles.name}>
              {budget.category?.name ?? 'Overall'}
            </Text>
            <Text style={cardStyles.period}>{budget.period} · {budget.start_date}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onDelete}>
          <Text style={{ fontSize: 18 }}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={cardStyles.barBg}>
        <View style={[cardStyles.barFill, { width: `${budget.percentage}%` as any, backgroundColor: barColor }]} />
      </View>

      <View style={cardStyles.amounts}>
        <Text style={cardStyles.spent}>
          Rs.{budget.spent.toLocaleString('en-NP')} spent
        </Text>
        <Text style={cardStyles.total}>
          of Rs.{Number(budget.amount).toLocaleString('en-NP')}
        </Text>
      </View>

      {isOver && (
        <View style={cardStyles.alertBadge}>
          <Text style={cardStyles.alertText}>⚠️ Over budget by Rs.{(budget.spent - Number(budget.amount)).toFixed(0)}</Text>
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
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly')
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Error', 'Enter a valid amount')
      return
    }
    const now = new Date()
    const start = now.toISOString().split('T')[0]
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    setLoading(true)
    await onAdd({
      amount: parseFloat(amount),
      category_id: selectedCategory?.id ?? null,
      period,
      start_date: start,
      end_date: end,
    })
    setLoading(false)
    setAmount('')
    setSelectedCategory(null)
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>New Budget</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={modalStyles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Amount */}
            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>Budget Amount (NPR)</Text>
              <TextInput
                style={modalStyles.input}
                placeholder="e.g. 5000"
                placeholderTextColor={COLORS.textSecondary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Period */}
            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>Period</Text>
              <View style={modalStyles.row}>
                {(['monthly', 'weekly'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[modalStyles.chip, period === p && modalStyles.chipActive]}
                    onPress={() => setPeriod(p)}
                  >
                    <Text style={[modalStyles.chipText, period === p && modalStyles.chipTextActive]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category */}
            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>Category (optional — leave empty for overall)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={modalStyles.row}>
                  <TouchableOpacity
                    style={[modalStyles.chip, !selectedCategory && modalStyles.chipActive]}
                    onPress={() => setSelectedCategory(null)}
                  >
                    <Text style={[modalStyles.chipText, !selectedCategory && modalStyles.chipTextActive]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        modalStyles.chip,
                        selectedCategory?.id === cat.id && {
                          backgroundColor: cat.color + '33',
                          borderColor: cat.color,
                        }
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text style={modalStyles.chipText}>{cat.icon} {cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[modalStyles.saveBtn, loading && { opacity: 0.7 }]}
              onPress={handleAdd}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={modalStyles.saveBtnText}>Create Budget</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  summaryRow: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.md,
  },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 12,
    padding: SPACING.md, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  summaryLabel: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 4 },
  summaryValue: { color: COLORS.text, fontWeight: 'bold', fontSize: 14 },
  section: { padding: SPACING.lg, paddingTop: 0, gap: SPACING.sm },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyEmoji: { fontSize: 52, marginBottom: SPACING.sm },
  emptyText: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  emptySubtext: { color: COLORS.textSecondary, fontSize: 14, marginTop: SPACING.xs },
})

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  left: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 22 },
  name: { color: COLORS.text, fontWeight: '600', fontSize: 15 },
  period: { color: COLORS.textSecondary, fontSize: 12 },
  barBg: {
    height: 8, backgroundColor: COLORS.background,
    borderRadius: 4, overflow: 'hidden', marginBottom: SPACING.xs,
  },
  barFill: { height: '100%', borderRadius: 4 },
  amounts: { flexDirection: 'row', justifyContent: 'space-between' },
  spent: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  total: { color: COLORS.textSecondary, fontSize: 13 },
  alertBadge: {
    marginTop: SPACING.sm, backgroundColor: COLORS.error + '22',
    borderRadius: 8, padding: SPACING.xs, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.error,
  },
  alertText: { color: COLORS.error, fontSize: 12, fontWeight: '600' },
})

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: SPACING.lg, maxHeight: '85%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: COLORS.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SPACING.lg,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  close: { color: COLORS.textSecondary, fontSize: 20 },
  field: { marginBottom: SPACING.md },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: SPACING.xs },
  input: {
    backgroundColor: COLORS.background, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, color: COLORS.text, fontSize: 16,
  },
  row: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: 20, backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: COLORS.white },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    padding: SPACING.md, alignItems: 'center', marginTop: SPACING.md,
  },
  saveBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
})