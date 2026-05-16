import {
  View, Text, ScrollView,
  TouchableOpacity, Alert, Switch
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { 
  RefreshCw, Cloud, Bell, Globe, Smartphone, 
  Sparkles, Database, BarChart2, FileText, 
  Trash2, LogOut, ChevronRight, Coins
} from 'lucide-react-native'
import { useAuthStore } from '../../store/authStore'
import { useExpenseStore } from '../../store/expenseStore'
import { COLORS } from '../../constants'
import { getPendingCount } from '../../services/sync/offlineSync'
import { useState, useEffect } from 'react'
import { requestNotificationPermission, scheduleDailyReminder } from '../../services/notifications/budgetAlerts'
import { exportToCSV, exportToPDF } from '../../services/export/exportService'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../services/supabase/client'

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
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="p-6 pb-2">
          <Text className="text-[26px] font-bold text-text">Settings</Text>
        </View>

        {/* Profile card */}
        <View className="flex-row items-center m-6 mt-0 bg-surface rounded-2xl p-6 border border-border gap-4">
          <View className="w-[60px] h-[60px] rounded-full bg-primary justify-center items-center">
            <Text className="text-white text-[26px] font-bold">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            </Text>
          </View>
          <View className="flex-1 gap-1">
            <Text className="text-text text-lg font-bold">{profile?.full_name ?? 'User'}</Text>
            <Text className="text-textSecondary text-[13px]">{profile?.email ?? ''}</Text>
            <View className="self-start bg-primary/15 px-2 py-0.5 rounded-md border border-primary flex-row items-center gap-1">
              <Coins size={12} color={COLORS.primary} />
              <Text className="text-primary text-[12px] font-semibold">{profile?.currency ?? 'NPR'}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row gap-2 px-6 mb-4">
          <View className="flex-1 bg-surface rounded-xl p-4 items-center border border-border">
            <Text className="text-text text-lg font-bold">{totalExpenses}</Text>
            <Text className="text-textSecondary text-[11px] mt-0.5">Expenses</Text>
          </View>
          <View className="flex-1 bg-surface rounded-xl p-4 items-center border border-border">
            <Text className="text-text text-lg font-bold">{totalCategories}</Text>
            <Text className="text-textSecondary text-[11px] mt-0.5">Categories</Text>
          </View>
          <View className="flex-1 bg-surface rounded-xl p-4 items-center border border-border">
            <Text className="text-text text-lg font-bold">
              Rs.{(totalSpent / 1000).toFixed(1)}k
            </Text>
            <Text className="text-textSecondary text-[11px] mt-0.5">Total Spent</Text>
          </View>
        </View>

        {/* Sync status */}
        <View className="px-6 mb-4">
          <Text className="text-textSecondary text-[12px] font-bold mb-1 uppercase tracking-widest">Sync</Text>
          <View className="bg-surface rounded-2xl border border-border overflow-hidden">
            <SettingsRow
              icon={<RefreshCw size={18} color={COLORS.textSecondary} />}
              label="Pending sync items"
              value={pendingSync > 0 ? `${pendingSync} pending` : 'All synced'}
              valueColor={pendingSync > 0 ? COLORS.warning : COLORS.success}
            />
            <SettingsRow
              icon={<Cloud size={18} color={COLORS.textSecondary} />}
              label="Cloud backup"
              value="Supabase"
            />
          </View>
        </View>

        {/* Preferences */}
        <View className="px-6 mb-4">
          <Text className="text-textSecondary text-[12px] font-bold mb-1 uppercase tracking-widest">Preferences</Text>
          <View className="bg-surface rounded-2xl border border-border overflow-hidden">
            <View className="flex-row items-center justify-between p-4 border-b border-border">
              <View className="flex-row items-center gap-2">
                <Bell size={18} color={COLORS.textSecondary} />
                <Text className="text-text text-[15px]">Budget alerts</Text>
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
            <SettingsRow icon={<Coins size={18} color={COLORS.textSecondary} />} label="Currency" value={profile?.currency ?? 'NPR'} />
            <SettingsRow icon={<Globe size={18} color={COLORS.textSecondary} />} label="Language" value="English" />
          </View>
        </View>

        {/* About */}
        <View className="px-6 mb-4">
          <Text className="text-textSecondary text-[12px] font-bold mb-1 uppercase tracking-widest">About</Text>
          <View className="bg-surface rounded-2xl border border-border overflow-hidden">
            <SettingsRow icon={<Smartphone size={18} color={COLORS.textSecondary} />} label="App version" value="1.0.0" />
            <SettingsRow icon={<Sparkles size={18} color={COLORS.textSecondary} />} label="AI model" value="Llama 3.1" />
            <SettingsRow icon={<Database size={18} color={COLORS.textSecondary} />} label="Database" value="Supabase" />
          </View>
        </View>

        {/* Export */}
        <View className="px-6 mb-4">
          <Text className="text-textSecondary text-[12px] font-bold mb-1 uppercase tracking-widest">Export Data</Text>
          <View className="bg-surface rounded-2xl border border-border overflow-hidden">
            <TouchableOpacity
              className="flex-row items-center justify-between p-4 border-b border-border"
              onPress={async () => {
                try {
                  await exportToCSV(expenses)
                } catch (e) {
                  Alert.alert('Error', 'Could not export CSV')
                }
              }}
            >
              <View className="flex-row items-center gap-2">
                <BarChart2 size={18} color={COLORS.textSecondary} />
                <Text className="text-text text-[15px]">Export as CSV</Text>
              </View>
              <ChevronRight size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center justify-between p-4 border-b border-border"
              onPress={async () => {
                try {
                  await exportToPDF(expenses, profile?.full_name ?? 'User', 'All Time')
                } catch (e) {
                  Alert.alert('Error', 'Could not export PDF')
                }
              }}
            >
              <View className="flex-row items-center gap-2">
                <FileText size={18} color={COLORS.textSecondary} />
                <Text className="text-text text-[15px]">Export as PDF</Text>
              </View>
              <ChevronRight size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger zone */}
        <View className="px-6 mb-4">
          <Text className="text-textSecondary text-[12px] font-bold mb-1 uppercase tracking-widest">Account</Text>
          <View className="bg-surface rounded-2xl border border-border overflow-hidden">
            <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-border" onPress={handleClearData}>
              <View className="flex-row items-center gap-2">
                <Trash2 size={18} color={COLORS.error} />
                <Text className="text-error text-[15px]">Clear all data</Text>
              </View>
              <ChevronRight size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-border" onPress={handleSignOut}>
              <View className="flex-row items-center gap-2">
                <LogOut size={18} color={COLORS.error} />
                <Text className="text-error text-[15px]">Sign out</Text>
              </View>
              <ChevronRight size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View className="h-12" />
      </ScrollView>
    </SafeAreaView>
  )
}

function SettingsRow({ icon, label, value, valueColor }: {
  icon: any; label: string; value: string; valueColor?: string
}) {
  return (
    <View className="flex-row items-center justify-between p-4 border-b border-border">
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="text-text text-[15px]">{label}</Text>
      </View>
      <Text className="text-textSecondary text-sm" style={[valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  )
}