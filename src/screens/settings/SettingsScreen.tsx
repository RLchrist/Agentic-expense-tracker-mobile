import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Switch
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../../store/authStore'
import { useExpenseStore } from '../../store/expenseStore'
import { COLORS, SPACING } from '../../constants'
import { getPendingCount } from '../../services/sync/offlineSync'
import { useState, useEffect } from 'react'
import { requestNotificationPermission, scheduleDailyReminder } from '../../services/notifications/budgetAlerts'
import { exportToCSV, exportToPDF } from '../../services/export/exportService'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../services/supabase/client'
import { Image } from 'expo-image'

export default function SettingsScreen() {
  const { profile, signOut, updateProfile } = useAuthStore()
  const { expenses, categories } = useExpenseStore()
  const [pendingSync, setPendingSync] = useState(0)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  useEffect(() => {
    setPendingSync(getPendingCount())
  }, [])

  const handleAvatarUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    })

    if (!result.canceled && result.assets[0].uri) {
      const { assets } = result
      const filePath = `${profile?.id}/avatar.jpg`
      
      const response = await fetch(assets[0].uri)
      const blob = await response.blob()
      
      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true })
      
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
        await updateProfile({ avatar_url: publicUrl })
      }
    }
  }

  const CURRENCIES = [
    { code: 'NPR', label: 'Nepalese Rupee (Rs.)' },
    { code: 'USD', label: 'US Dollar ($)' },
    { code: 'EUR', label: 'Euro (€)' },
    { code: 'INR', label: 'Indian Rupee (₹)' },
  ]

  const totalExpenses = expenses.length
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const totalCategories = categories.length

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ])
  }

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your expenses permanently. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => Alert.alert('Info', 'Feature coming soon') },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.full_name ?? 'User'}</Text>
            <Text style={styles.profileEmail}>{profile?.email ?? ''}</Text>
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyText}>💱 {profile?.currency ?? 'NPR'}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalExpenses}</Text>
            <Text style={styles.statLabel}>Expenses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalCategories}</Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              Rs.{(totalSpent / 1000).toFixed(1)}k
            </Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
        </View>

        {/* Sync status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync</Text>
          <View style={styles.card}>
            <SettingsRow
              icon="🔄"
              label="Pending sync items"
              value={pendingSync > 0 ? `${pendingSync} pending` : 'All synced ✓'}
              valueColor={pendingSync > 0 ? COLORS.warning : COLORS.success}
            />
            <SettingsRow
              icon="☁️"
              label="Cloud backup"
              value="Supabase"
            />
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowIcon}>🔔</Text>
                <Text style={styles.rowLabel}>Budget alerts</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={async (val) => {
  if (val) {
    const granted = await requestNotificationPermission()
    if (granted) {
      await scheduleDailyReminder()
      setNotificationsEnabled(true)
      Alert.alert('✅ Enabled', 'You will get daily reminders at 9 PM')
    } else {
      Alert.alert('Permission denied', 'Enable notifications in phone settings')
    }
  } else {
    setNotificationsEnabled(false)
  }
}}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>
            <SettingsRow icon="💱" label="Currency" value={profile?.currency ?? 'NPR'} />
            <SettingsRow icon="🌍" label="Language" value="English" />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <SettingsRow icon="📱" label="App version" value="1.0.0" />
            <SettingsRow icon="🤖" label="AI model" value="Llama 3.1 (Groq)" />
            <SettingsRow icon="🗄️" label="Database" value="Supabase" />
          </View>
        </View>

        {/* Export */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Export Data</Text>
  <View style={styles.card}>
    <TouchableOpacity
      style={styles.row}
      onPress={async () => {
        try {
          await exportToCSV(expenses)
        } catch (e) {
          Alert.alert('Error', 'Could not export CSV')
        }
      }}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowIcon}>📊</Text>
        <Text style={styles.rowLabel}>Export as CSV</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.row}
      onPress={async () => {
        try {
          await exportToPDF(expenses, profile?.full_name ?? 'User', 'All Time')
        } catch (e) {
          Alert.alert('Error', 'Could not export PDF')
        }
      }}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowIcon}>📄</Text>
        <Text style={styles.rowLabel}>Export as PDF</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  </View>
</View>

        {/* Danger zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={handleClearData}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowIcon}>🗑️</Text>
                <Text style={[styles.rowLabel, { color: COLORS.error }]}>Clear all data</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={handleSignOut}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowIcon}>🚪</Text>
                <Text style={[styles.rowLabel, { color: COLORS.error }]}>Sign out</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function SettingsRow({ icon, label, value, valueColor }: {
  icon: string; label: string; value: string; valueColor?: string
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowIcon}>{icon}</Text>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, paddingBottom: SPACING.sm },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.text },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    margin: SPACING.lg, marginTop: 0,
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
    gap: SPACING.md,
  },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: 26, fontWeight: 'bold' },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  profileEmail: { color: COLORS.textSecondary, fontSize: 13 },
  currencyBadge: {
    alignSelf: 'flex-start', backgroundColor: COLORS.primary + '22',
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1, borderColor: COLORS.primary,
  },
  currencyText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 12,
    padding: SPACING.md, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  statValue: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  sectionTitle: {
    color: COLORS.textSecondary, fontSize: 12,
    fontWeight: '700', marginBottom: SPACING.xs,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  rowIcon: { fontSize: 18, width: 28 },
  rowLabel: { color: COLORS.text, fontSize: 15 },
  rowValue: { color: COLORS.textSecondary, fontSize: 14 },
  arrow: { color: COLORS.textSecondary, fontSize: 20 },
})