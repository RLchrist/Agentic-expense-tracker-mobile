import { useState } from 'react'
import {
  View, Text, ScrollView,
  TouchableOpacity
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { 
  Calendar, Tag, CreditCard, TrendingUp, 
  Banknote, Smartphone, Landmark, Package 
} from 'lucide-react-native'
import { useExpenseStore } from '../../store/expenseStore'
import { COLORS } from '../../constants'

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

  const paymentIcons: Record<string, any> = {
    cash: <Banknote size={24} color={COLORS.success} />,
    card: <CreditCard size={24} color={COLORS.primary} />,
    upi: <Smartphone size={24} color={COLORS.secondary} />,
    bank_transfer: <Landmark size={24} color={COLORS.warning} />,
    other: <Package size={24} color={COLORS.textSecondary} />
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="p-6 pb-2">
          <Text className="text-[26px] font-bold text-text">Analytics</Text>
        </View>

        {/* Period filter */}
        <View className="flex-row gap-2 px-6 mb-4">
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              className={`flex-1 py-3 rounded-xl items-center border ${period === p.key ? 'bg-primary border-primary' : 'bg-surface border-border'}`}
              onPress={() => setPeriod(p.key as any)}
            >
              <Text className={`font-semibold ${period === p.key ? 'text-white' : 'text-textSecondary'}`}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Total card */}
        <View className="m-6 mt-0 bg-primary rounded-[20px] p-6 items-center">
          <Text className="text-white/80 text-sm">Total Spent ({period})</Text>
          <Text className="text-white text-4xl font-bold my-1">
            Rs. {grandTotal.toLocaleString('en-NP', { minimumFractionDigits: 2 })}
          </Text>
          <Text className="text-white/70 text-[13px]">{filtered.length} transactions</Text>
        </View>

        {/* Daily bar chart */}
        <View className="mx-6 mb-4 bg-surface rounded-2xl p-4 border border-border">
          <View className="flex-row items-center mb-4 gap-2">
            <Calendar size={18} color={COLORS.text} />
            <Text className="text-text font-bold text-base">Daily Spending (Last 7 Days)</Text>
          </View>
          <View className="flex-row items-end h-[140px] gap-1.5">
            {dailyData.map((d, i) => (
              <View key={i} className="flex-1 items-center h-full justify-end">
                <Text className="text-textSecondary text-[9px] mb-0.5">
                  {d.total > 0 ? `${(d.total / 1000).toFixed(1)}k` : ''}
                </Text>
                <View className="w-full h-[100px] bg-background rounded-lg justify-end overflow-hidden">
                  <View
                    className="w-full rounded-lg min-h-[2px]"
                    style={{
                      height: `${(d.total / maxDaily) * 100}%`,
                      backgroundColor: d.total > 0 ? COLORS.primary : COLORS.border,
                    }}
                  />
                </View>
                <Text className="text-textSecondary text-[11px] mt-1">{d.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Category breakdown */}
        <View className="mx-6 mb-4 bg-surface rounded-2xl p-4 border border-border">
          <View className="flex-row items-center mb-4 gap-2">
            <Tag size={18} color={COLORS.text} />
            <Text className="text-text font-bold text-base">By Category</Text>
          </View>
          {categoryTotals.length === 0 ? (
            <Text className="text-textSecondary text-center p-4">No data for this period</Text>
          ) : (
            categoryTotals.map((cat) => {
              const pct = grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0
              return (
                <View key={cat.id} className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center flex-1 gap-2">
                    <View 
                      className="w-9 h-9 rounded-xl justify-center items-center" 
                      style={{ backgroundColor: cat.color + '33' }}
                    >
                      <Text>{cat.icon}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-text text-[13px] font-medium mb-1">{cat.name}</Text>
                      <View className="h-1 bg-background rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: cat.color }}
                        />
                      </View>
                    </View>
                  </View>
                  <View className="items-end ml-2">
                    <Text className="text-text font-bold text-[13px]">
                      Rs.{cat.total.toLocaleString('en-NP')}
                    </Text>
                    <Text className="text-textSecondary text-[11px]">{pct.toFixed(1)}%</Text>
                  </View>
                </View>
              )
            })
          )}
        </View>

        {/* Payment method */}
        <View className="mx-6 mb-4 bg-surface rounded-2xl p-4 border border-border">
          <View className="flex-row items-center mb-4 gap-2">
            <CreditCard size={18} color={COLORS.text} />
            <Text className="text-text font-bold text-base">By Payment Method</Text>
          </View>
          {paymentTotals.length === 0 ? (
            <Text className="text-textSecondary text-center p-4">No data for this period</Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {paymentTotals.map((p) => {
                const pct = grandTotal > 0 ? (p.total / grandTotal) * 100 : 0
                return (
                  <View key={p.method} className="flex-1 min-w-[28%] bg-background rounded-xl p-3 items-center border border-border">
                    <View className="mb-1">{paymentIcons[p.method]}</View>
                    <Text className="text-textSecondary text-[11px] capitalize">{p.method.replace('_', ' ')}</Text>
                    <Text className="text-text font-bold text-[12px] mt-0.5">
                      Rs.{p.total.toLocaleString('en-NP')}
                    </Text>
                    <Text className="text-primary text-[11px]">{pct.toFixed(0)}%</Text>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {/* Top expenses */}
        <View className="mx-6 mb-4 bg-surface rounded-2xl p-4 border border-border">
          <View className="flex-row items-center mb-4 gap-2">
            <TrendingUp size={18} color={COLORS.text} />
            <Text className="text-text font-bold text-base">Top Expenses</Text>
          </View>
          {filtered
            .sort((a, b) => Number(b.amount) - Number(a.amount))
            .slice(0, 5)
            .map((e) => (
              <View key={e.id} className="flex-row items-center py-2 border-b border-border gap-2">
                <Text className="text-[22px]">{e.category?.icon ?? '📦'}</Text>
                <View className="flex-1">
                  <Text className="text-text text-sm font-medium" numberOfLines={1}>{e.title}</Text>
                  <Text className="text-textSecondary text-[11px]">{e.expense_date}</Text>
                </View>
                <Text className="text-primary font-bold text-sm">
                  Rs.{Number(e.amount).toLocaleString('en-NP')}
                </Text>
              </View>
            ))}
        </View>

        <View className="h-12" />
      </ScrollView>
    </SafeAreaView>
  )
}