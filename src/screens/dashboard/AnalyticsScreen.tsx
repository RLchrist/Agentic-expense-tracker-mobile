import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useExpenseStore } from '../../store/expenseStore'
import { COLORS, SPACING } from '../../constants'

const { width } = Dimensions.get('window')

export default function AnalyticsScreen() {
  const { expenses, categories } = useExpenseStore()
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')

  const filtered = expenses.filter((e) => {
    const now = new Date()
    const d = new Date(e.expense_date)
    if (period === 'week') {
      const ago = new Date(now); ago.setDate(now.getDate() - 7)
      return d >= ago
    }
    if (period === 'month') {
      return d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
    }
    return d.getFullYear() === now.getFullYear()
  })

  // Category breakdown
  const categoryTotals = categories.map((cat) => {
    const total = filtered
      .filter((e) => e.category_id === cat.id)
      .reduce((s, e) => s + Number(e.amount), 0)
    return { ...cat, total }
  }).filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)

  const grandTotal = categoryTotals.reduce((s, c) => s + c.total, 0)

  // Daily spending for bar chart (last 7 days)
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const total = expenses
      .filter((e) => e.expense_date === dateStr)
      .reduce((s, e) => s + Number(e.amount), 0)
    return {
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      total,
      date: dateStr,
    }
  })

  const maxDaily = Math.max(...dailyData.map((d) => d.total), 1)

  // Payment method breakdown
  const paymentTotals = ['cash', 'card', 'upi', 'bank_transfer', 'other'].map((pm) => {
    const total = filtered
      .filter((e) => e.payment_method === pm)
      .reduce((s, e) => s + Number(e.amount), 0)
    return { method: pm, total }
  }).filter((p) => p.total > 0)

  const PERIODS = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
        </View>

        {/* Period filter */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodChip, period === p.key && styles.periodChipActive]}
              onPress={() => setPeriod(p.key as any)}
            >
              <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Total card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Spent ({period})</Text>
          <Text style={styles.totalAmount}>
            Rs. {grandTotal.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.totalCount}>{filtered.length} transactions</Text>
        </View>

        {/* Daily bar chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Daily Spending (Last 7 Days)</Text>
          <View style={styles.barChart}>
            {dailyData.map((d, i) => (
              <View key={i} style={styles.barCol}>
                <Text style={styles.barAmount}>
                  {d.total > 0 ? `${(d.total / 1000).toFixed(1)}k` : ''}
                </Text>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${(d.total / maxDaily) * 100}%`,
                        backgroundColor: d.total > 0 ? COLORS.primary : COLORS.border,
                      }
                    ]}
                  />
                </View>
                <Text style={styles.barDay}>{d.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Category breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏷️ By Category</Text>
          {categoryTotals.length === 0 ? (
            <Text style={styles.empty}>No data for this period</Text>
          ) : (
            categoryTotals.map((cat) => {
              const pct = grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0
              return (
                <View key={cat.id} style={styles.catRow}>
                  <View style={styles.catLeft}>
                    <View style={[styles.catIcon, { backgroundColor: cat.color + '33' }]}>
                      <Text>{cat.icon}</Text>
                    </View>
                    <View style={styles.catInfo}>
                      <Text style={styles.catName}>{cat.name}</Text>
                      <View style={styles.catBarBg}>
                        <View
                          style={[
                            styles.catBarFill,
                            { width: `${pct}%` as any, backgroundColor: cat.color }
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                  <View style={styles.catRight}>
                    <Text style={styles.catAmount}>
                      Rs.{cat.total.toLocaleString('en-NP')}
                    </Text>
                    <Text style={styles.catPct}>{pct.toFixed(1)}%</Text>
                  </View>
                </View>
              )
            })
          )}
        </View>

        {/* Payment method */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💳 By Payment Method</Text>
          {paymentTotals.length === 0 ? (
            <Text style={styles.empty}>No data for this period</Text>
          ) : (
            <View style={styles.paymentGrid}>
              {paymentTotals.map((p) => {
                const icons: Record<string, string> = {
                  cash: '💵', card: '💳', upi: '📱',
                  bank_transfer: '🏦', other: '📦'
                }
                const pct = grandTotal > 0 ? (p.total / grandTotal) * 100 : 0
                return (
                  <View key={p.method} style={styles.paymentCard}>
                    <Text style={styles.paymentIcon}>{icons[p.method]}</Text>
                    <Text style={styles.paymentMethod}>{p.method.replace('_', ' ')}</Text>
                    <Text style={styles.paymentAmount}>
                      Rs.{p.total.toLocaleString('en-NP')}
                    </Text>
                    <Text style={styles.paymentPct}>{pct.toFixed(0)}%</Text>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {/* Top expenses */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔝 Top Expenses</Text>
          {filtered
            .sort((a, b) => Number(b.amount) - Number(a.amount))
            .slice(0, 5)
            .map((e) => (
              <View key={e.id} style={styles.topRow}>
                <Text style={styles.topIcon}>{e.category?.icon ?? '📦'}</Text>
                <View style={styles.topInfo}>
                  <Text style={styles.topTitle} numberOfLines={1}>{e.title}</Text>
                  <Text style={styles.topDate}>{e.expense_date}</Text>
                </View>
                <Text style={styles.topAmount}>
                  Rs.{Number(e.amount).toLocaleString('en-NP')}
                </Text>
              </View>
            ))}
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, paddingBottom: SPACING.sm },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.text },
  periodRow: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.md,
  },
  periodChip: {
    flex: 1, paddingVertical: SPACING.sm, borderRadius: 10,
    backgroundColor: COLORS.surface, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  periodChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodText: { color: COLORS.textSecondary, fontWeight: '600' },
  periodTextActive: { color: COLORS.white },
  totalCard: {
    margin: SPACING.lg, marginTop: 0,
    backgroundColor: COLORS.primary, borderRadius: 20,
    padding: SPACING.lg, alignItems: 'center',
  },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  totalAmount: { color: COLORS.white, fontSize: 36, fontWeight: 'bold', marginVertical: 4 },
  totalCount: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  card: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 16, marginBottom: SPACING.md },
  empty: { color: COLORS.textSecondary, textAlign: 'center', padding: SPACING.md },
  barChart: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: 140, gap: 6,
  },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barAmount: { color: COLORS.textSecondary, fontSize: 9, marginBottom: 2 },
  barBg: {
    width: '100%', height: 100,
    backgroundColor: COLORS.background, borderRadius: 4,
    justifyContent: 'flex-end', overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 4, minHeight: 2 },
  barDay: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: SPACING.sm,
  },
  catLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.sm },
  catIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  catInfo: { flex: 1 },
  catName: { color: COLORS.text, fontSize: 13, fontWeight: '500', marginBottom: 4 },
  catBarBg: {
    height: 4, backgroundColor: COLORS.background,
    borderRadius: 2, overflow: 'hidden',
  },
  catBarFill: { height: '100%', borderRadius: 2 },
  catRight: { alignItems: 'flex-end', marginLeft: SPACING.sm },
  catAmount: { color: COLORS.text, fontWeight: 'bold', fontSize: 13 },
  catPct: { color: COLORS.textSecondary, fontSize: 11 },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  paymentCard: {
    flex: 1, minWidth: '28%', backgroundColor: COLORS.background,
    borderRadius: 12, padding: SPACING.sm, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  paymentIcon: { fontSize: 24, marginBottom: 4 },
  paymentMethod: { color: COLORS.textSecondary, fontSize: 11, textTransform: 'capitalize' },
  paymentAmount: { color: COLORS.text, fontWeight: 'bold', fontSize: 12, marginTop: 2 },
  paymentPct: { color: COLORS.primary, fontSize: 11 },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.xs, borderBottomWidth: 1,
    borderBottomColor: COLORS.border, gap: SPACING.sm,
  },
  topIcon: { fontSize: 22 },
  topInfo: { flex: 1 },
  topTitle: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  topDate: { color: COLORS.textSecondary, fontSize: 11 },
  topAmount: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
})