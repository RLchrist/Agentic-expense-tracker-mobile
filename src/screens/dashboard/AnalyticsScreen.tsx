import { useState, useRef, useEffect } from 'react'
import {
  View, Text, ScrollView,
  TouchableOpacity
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { 
  Calendar, Tag, CreditCard, TrendingUp, 
  Banknote, Smartphone, Landmark, Package,
  ChevronLeft, ChevronRight
} from 'lucide-react-native'
import { useAuthStore } from '../../store/authStore'
import { useExpenseStore } from '../../store/expenseStore'
import { useAppTheme } from '../../hooks/useAppTheme'
import { formatCurrency } from '../../utils'

export default function AnalyticsScreen() {
  const { colors } = useAppTheme()
  const { profile } = useAuthStore()
  const { expenses, categories } = useExpenseStore()
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')

  const chartScrollRef = useRef<ScrollView>(null)
  const scrollXRef = useRef(0)

  const handleScroll = (event: any) => {
    scrollXRef.current = event.nativeEvent.contentOffset.x
  }

  const handleScrollBack = () => {
    const newOffset = Math.max(0, scrollXRef.current - 15 * 24)
    chartScrollRef.current?.scrollTo({ x: newOffset, animated: true })
  }

  const handleScrollNext = () => {
    const newOffset = scrollXRef.current + 15 * 24
    chartScrollRef.current?.scrollTo({ x: newOffset, animated: true })
  }

  useEffect(() => {
    if (period === 'month' && chartScrollRef.current) {
      const today = new Date().getDate()
      const offset = Math.max(0, (today - 1) * 24 - 130)
      setTimeout(() => {
        chartScrollRef.current?.scrollTo({ x: offset, animated: true })
      }, 150)
    }
  }, [period])

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
    if (period === 'quarter') {
      const ago = new Date(now); ago.setMonth(now.getMonth() - 3)
      return d >= ago
    }
    return d.getFullYear() === now.getFullYear()
  })

  // Category breakdown
  const validCategoryTotals = categories.map((cat) => {
    const total = filtered
      .filter((e) => e.category_id === cat.id)
      .reduce((s, e) => s + Number(e.amount), 0)
    return { ...cat, total }
  }).filter((c) => c.total > 0)

  const uncategorizedTotal = filtered
    .filter((e) => !e.category_id || !categories.some((cat) => cat.id === e.category_id))
    .reduce((s, e) => s + Number(e.amount), 0)

  const categoryTotals: any[] = [...validCategoryTotals]
  if (uncategorizedTotal > 0) {
    categoryTotals.push({
      id: 'uncategorized',
      name: 'Uncategorized',
      icon: '📦',
      color: colors.textSecondary || '#888888',
      total: uncategorizedTotal,
    })
  }

  categoryTotals.sort((a, b) => b.total - a.total)

  const grandTotal = filtered.reduce((s, e) => s + Number(e.amount), 0)

  // Dynamic chart data calculation
  let chartData: { label: string; total: number }[] = []
  const now = new Date()

  if (period === 'week') {
    chartData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const dateStr = d.toISOString().split('T')[0]
      const total = expenses
        .filter((e) => e.expense_date === dateStr)
        .reduce((s, e) => s + Number(e.amount), 0)
      return {
        label: d.toLocaleDateString('en', { weekday: 'short' }),
        total,
      }
    })
  } else if (period === 'month') {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    chartData = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1
      const total = expenses
        .filter((e) => {
          const d = new Date(e.expense_date)
          return d.getDate() === dayNum &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
        })
        .reduce((s, e) => s + Number(e.amount), 0)
      return {
        label: String(dayNum),
        total,
      }
    })
  } else if (period === 'quarter') {
    chartData = Array.from({ length: 3 }, (_, i) => {
      const d = new Date()
      d.setMonth(now.getMonth() - (2 - i))
      const targetMonth = d.getMonth()
      const targetYear = d.getFullYear()
      const total = expenses
        .filter((e) => {
          const ed = new Date(e.expense_date)
          return ed.getMonth() === targetMonth && ed.getFullYear() === targetYear
        })
        .reduce((s, e) => s + Number(e.amount), 0)
      return {
        label: d.toLocaleDateString('en', { month: 'short' }),
        total,
      }
    })
  } else if (period === 'year') {
    chartData = Array.from({ length: 12 }, (_, i) => {
      const targetMonth = i
      const total = expenses
        .filter((e) => {
          const ed = new Date(e.expense_date)
          return ed.getMonth() === targetMonth && ed.getFullYear() === now.getFullYear()
        })
        .reduce((s, e) => s + Number(e.amount), 0)
      
      const dummyDate = new Date()
      dummyDate.setMonth(targetMonth)
      return {
        label: dummyDate.toLocaleDateString('en', { month: 'short' }),
        total,
      }
    })
  }

  const maxVal = Math.max(...chartData.map((d) => d.total), 1)

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
    { key: 'quarter', label: 'Quarter' },
    { key: 'year', label: 'Year' },
  ]

  const paymentIcons: Record<string, any> = {
    cash: <Banknote size={24} className="text-success" />,
    card: <CreditCard size={24} className="text-primary" />,
    upi: <Smartphone size={24} className="text-secondary" />,
    bank_transfer: <Landmark size={24} className="text-warning" />,
    other: <Package size={24} className="text-textSecondary" />
  }

  const getChartTitle = () => {
    if (period === 'week') return 'Daily Spending (Last 7 Days)'
    if (period === 'month') return 'Daily Spending (This Month)'
    if (period === 'quarter') return 'Monthly Spending (This Quarter)'
    return 'Monthly Spending (This Year)'
  }

  const getPeriodLabel = () => {
    if (period === 'week') return 'This Week'
    if (period === 'month') return 'This Month'
    if (period === 'quarter') return 'This Quarter'
    return 'This Year'
  }

  const renderChartContent = () => {
    const barWidth = period === 'month' ? 16 : undefined
    const containerStyle = period === 'month' ? { gap: 8, paddingRight: 16 } : { gap: 6 }
    
    const chartContent = (
      <View 
        className={`flex-row items-end h-[140px] ${period === 'month' ? 'pt-4' : 'w-full'}`}
        style={containerStyle}
      >
        {chartData.map((d, i) => {
          const barHeightPct = maxVal > 0 ? (d.total / maxVal) * 100 : 0
          const isSelected = period === 'month' && new Date().getDate() === (i + 1)
          
          return (
            <View 
              key={i} 
              style={barWidth ? { width: barWidth } : { flex: 1 }}
              className="items-center h-full justify-end"
            >
              <Text className="text-textSecondary text-[9px] mb-0.5" numberOfLines={1}>
                {d.total > 0 ? (d.total >= 1000 ? `${(d.total / 1000).toFixed(0)}k` : `${d.total}`) : ''}
              </Text>
              <View className="w-full h-[95px] bg-background rounded-lg justify-end overflow-hidden">
                <View
                  className="w-full rounded-lg min-h-[2px]"
                  style={{
                    height: `${barHeightPct}%`,
                    backgroundColor: d.total > 0 
                      ? (isSelected ? colors.primary : colors.primary + 'CC') 
                      : colors.border,
                  }}
                />
              </View>
              <Text 
                className={`text-[10px] mt-1 font-bold ${
                  isSelected ? 'text-primary' : 'text-textSecondary'
                }`}
              >
                {d.label}
              </Text>
            </View>
          )
        })}
      </View>
    )

    if (period === 'month') {
      return (
        <View className="flex-row items-center justify-between">
          <TouchableOpacity 
            onPress={handleScrollBack} 
            className="p-1.5 mr-1 bg-background border border-border rounded-full justify-center items-center shadow-sm"
            style={{ width: 28, height: 28 }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={16} className="text-text" />
          </TouchableOpacity>
          
          <ScrollView 
            ref={chartScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            className="flex-1"
          >
            {chartContent}
          </ScrollView>

          <TouchableOpacity 
            onPress={handleScrollNext} 
            className="p-1.5 ml-1 bg-background border border-border rounded-full justify-center items-center shadow-sm"
            style={{ width: 28, height: 28 }}
            activeOpacity={0.7}
          >
            <ChevronRight size={16} className="text-text" />
          </TouchableOpacity>
        </View>
      )
    }

    return chartContent
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
          <Text className="text-white/80 text-sm">Total Spent ({getPeriodLabel()})</Text>
          <Text className="text-white text-4xl font-bold my-1">
            {formatCurrency(grandTotal, profile?.currency ?? 'NPR')}
          </Text>
          <Text className="text-white/70 text-[13px]">{filtered.length} transactions</Text>
        </View>

        {/* Daily bar chart */}
        <View className="mx-6 mb-4 bg-surface rounded-2xl p-4 border border-border">
          <View className="flex-row items-center mb-4 gap-2">
            <Calendar size={18} className="text-text" />
            <Text className="text-text font-bold text-base">{getChartTitle()}</Text>
          </View>
          {renderChartContent()}
        </View>

        {/* Category breakdown */}
        <View className="mx-6 mb-4 bg-surface rounded-2xl p-4 border border-border">
          <View className="flex-row items-center mb-4 gap-2">
            <Tag size={18} className="text-text" />
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
                      {formatCurrency(cat.total, profile?.currency ?? 'NPR')}
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
            <CreditCard size={18} className="text-text" />
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
                      {formatCurrency(p.total, profile?.currency ?? 'NPR')}
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
            <TrendingUp size={18} className="text-text" />
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
                  {formatCurrency(Number(e.amount), profile?.currency ?? 'NPR')}
                </Text>
              </View>
            ))}
        </View>

        <View className="h-12" />
      </ScrollView>
    </SafeAreaView>
  )
}