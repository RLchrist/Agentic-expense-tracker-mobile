import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useExpenseStore } from '../../store/expenseStore'
import { COLORS, SPACING, PAYMENT_METHODS } from '../../constants'
import { Category } from '../../types'

export default function AddExpenseScreen({ navigation }: any) {
  const { categories, addExpense } = useExpenseStore()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedPayment, setSelectedPayment] = useState('cash')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Error', 'Please enter a title'); return }
    if (!amount || isNaN(Number(amount))) { Alert.alert('Error', 'Please enter a valid amount'); return }
    if (!selectedCategory) { Alert.alert('Error', 'Please select a category'); return }

    setLoading(true)
    await addExpense({
      title: title.trim(),
      amount: parseFloat(amount),
      currency: 'NPR',
      category_id: selectedCategory.id,
      note: note.trim() || null,
      receipt_url: null,
      expense_date: expenseDate,
      payment_method: selectedPayment,
      is_synced: true,
      local_id: null,
    })
    setLoading(false)
    Alert.alert('Success', 'Expense added!', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ])
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Expense</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.form}>
          {/* Amount — big input */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Amount (NPR)</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>Rs.</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.textSecondary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lunch at Bhojan Griha"
              placeholderTextColor={COLORS.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textSecondary}
              value={expenseDate}
              onChangeText={setExpenseDate}
            />
          </View>

          {/* Categories */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryRow}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      selectedCategory?.id === cat.id && {
                        backgroundColor: cat.color + '33',
                        borderColor: cat.color,
                      }
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={[
                      styles.categoryName,
                      selectedCategory?.id === cat.id && { color: cat.color }
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Payment method */}
          <View style={styles.field}>
            <Text style={styles.label}>Payment Method</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryRow}>
                {PAYMENT_METHODS.map((pm) => (
                  <TouchableOpacity
                    key={pm.value}
                    style={[
                      styles.categoryChip,
                      selectedPayment === pm.value && {
                        backgroundColor: COLORS.primary + '33',
                        borderColor: COLORS.primary,
                      }
                    ]}
                    onPress={() => setSelectedPayment(pm.value)}
                  >
                    <Text style={styles.categoryIcon}>{pm.icon}</Text>
                    <Text style={[
                      styles.categoryName,
                      selectedPayment === pm.value && { color: COLORS.primary }
                    ]}>
                      {pm.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Note */}
          <View style={styles.field}>
            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
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
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.saveBtnText}>Save Expense</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: SPACING.lg
  },
  backBtn: { width: 60 },
  backText: { color: COLORS.primary, fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  form: { padding: SPACING.lg, gap: SPACING.lg },
  amountCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center'
  },
  amountLabel: { color: COLORS.textSecondary, fontSize: 14, marginBottom: SPACING.sm },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  currencySymbol: { color: COLORS.textSecondary, fontSize: 24, marginRight: SPACING.xs },
  amountInput: {
    color: COLORS.text, fontSize: 48, fontWeight: 'bold',
    minWidth: 150, textAlign: 'center'
  },
  field: { gap: SPACING.xs },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.surface, borderWidth: 1,
    borderColor: COLORS.border, borderRadius: 12,
    padding: SPACING.md, color: COLORS.text, fontSize: 16,
  },
  noteInput: { height: 80, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', gap: SPACING.sm, paddingBottom: SPACING.xs },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderWidth: 1,
    borderColor: COLORS.border, borderRadius: 20,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  categoryIcon: { fontSize: 16 },
  categoryName: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    padding: SPACING.md, alignItems: 'center', marginTop: SPACING.sm
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
})