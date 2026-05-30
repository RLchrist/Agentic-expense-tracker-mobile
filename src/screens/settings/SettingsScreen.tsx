import {
  View, Text, ScrollView, Image,
  TouchableOpacity, Alert, Switch, TextInput
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { 
  RefreshCw, Cloud, Bell, Globe, Smartphone, 
  Sparkles, Database, BarChart2, FileText, 
  Trash2, LogOut, ChevronRight, Coins,
  Fingerprint, Sun, Languages, Lock, Edit3,
  Minus, Plus
} from 'lucide-react-native'
import * as LocalAuthentication from 'expo-local-authentication'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import { useExpenseStore } from '../../store/expenseStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useUiStore } from '../../store/uiStore'
import { themeColors } from '../../constants'
import { getPendingCount } from '../../services/sync/offlineSync'
import { useState, useEffect } from 'react'
import { useColorScheme } from 'nativewind'
import { requestNotificationPermission, scheduleDailyReminder } from '../../services/notifications/budgetAlerts'
import { exportToCSV, exportToPDF } from '../../services/export/exportService'
import * as ImagePicker from 'expo-image-picker'
import * as MediaLibrary from 'expo-media-library'
import * as FileSystem from 'expo-file-system/legacy'
import { supabase } from '../../services/supabase/client'
import { changeLang } from '../../i18n'

export default function SettingsScreen({ navigation }: any) {
  const { t, i18n } = useTranslation()
  const { showToast } = useUiStore()
  const { profile, signOut, updateProfile } = useAuthStore()
  const { expenses, categories } = useExpenseStore()
  const { isBiometricEnabled, setBiometricEnabled, theme, setTheme } = useSettingsStore()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = themeColors(isDark)
  const [pendingSync, setPendingSync] = useState(0)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [momoCount, setMomoCount] = useState(5)
  const MOMO_PRICE = 100

  useEffect(() => {
    getPendingCount().then(setPendingSync)
  }, [])

  const handleAvatarUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    })

    if (!result.canceled && result.assets[0].uri) {
      const asset = result.assets[0]
      const filePath = `${profile?.id}/avatar.jpg`
      const file = new File(asset.uri)
      const arrayBuffer = await file.arrayBuffer()

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, { contentType: 'image/jpeg', upsert: true })

      if (error) {
        showToast(error.message || 'Failed to upload avatar')
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
      await updateProfile({ avatar_url: publicUrl })
      showToast('Avatar updated!')
    }
  }

  const totalExpenses = expenses.length
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const totalCategories = categories.length

  const handleSignOut = () => {
    Alert.alert(t('settings.sign_out_confirm'), '', [
      { text: t('actions.cancel'), style: 'cancel' },
      { text: t('actions.sign_out'), style: 'destructive', onPress: signOut },
    ])
  }

  const handleClearData = () => {
    Alert.alert(
      t('settings.clear_data_title'),
      t('settings.clear_data_confirm'),
      [
        { text: t('actions.cancel'), style: 'cancel' },
        { text: t('actions.clear'), style: 'destructive', onPress: () => Alert.alert('Info', t('settings.feature_coming')) },
      ]
    )
  }

  const handleBiometricToggle = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    if (!hasHardware) {
      showToast(t('biometric.no_hardware'))
      return
    }
    const isEnrolled = await LocalAuthentication.isEnrolledAsync()
    if (!isEnrolled) {
      showToast(t('biometric.not_enrolled'))
      return
    }

    if (isBiometricEnabled) {
      setBiometricEnabled(false)
    } else {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('biometric.authenticate_to_enable'),
        fallbackLabel: t('biometric.use_password'),
      })
      if (result.success) {
        setBiometricEnabled(true)
        showToast('Biometric enabled!')
      }
    }
  }

  const handleThemeChange = () => {
    Alert.alert(
      t('settings.theme'),
      t('themes.select_theme'),
      [
        { text: t('themes.system'), onPress: () => setTheme('system') },
        { text: t('themes.light'), onPress: () => setTheme('light') },
        { text: t('themes.dark'), onPress: () => setTheme('dark') },
        { text: t('actions.cancel'), style: 'cancel' },
      ]
    )
  }

  const handleLanguageToggle = () => {
    const newLang = i18n.language === 'np' ? 'en' : 'np'
    changeLang(newLang)
  }

  const handlePay = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to save images to your device.')
      return
    }

    try {
      const assetSource = Image.resolveAssetSource(require('../../../assets/esewa-QR.jpeg'))
      const localUri = FileSystem.cacheDirectory + 'esewa-QR.jpeg'
      await FileSystem.copyAsync({ from: assetSource.uri, to: localUri })
      await MediaLibrary.createAssetAsync(localUri)

      Alert.alert(
        'QR Code Saved!',
        `eSewa QR for Rs. ${MOMO_PRICE * momoCount} has been saved to your device.\n\n"Code is like momo — the more you fold, the better it gets. Thanks for supporting open source! 🚀"\n\n— A solo dev who survives on momo and midnight coffee ☕`
      )
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save QR code.')
    }
  }

  const languageLabel = i18n.language === 'np'
    ? t('languages.nepali')
    : t('languages.english')

  const themeLabel = theme === 'system' ? t('themes.system') : theme === 'light' ? t('themes.light') : t('themes.dark')

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="p-6 pb-2">
          <Text className="text-[26px] font-bold text-text">{t('settings.title')}</Text>
        </View>

        <View className="flex-row items-center m-6 mt-0 bg-surface rounded-2xl p-6 border border-border gap-4">
          <View className="relative">
            <TouchableOpacity onPress={() => navigation.navigate('UpdateProfile')} className="w-[60px] h-[60px] rounded-full bg-primary justify-center items-center overflow-hidden">
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} className="w-full h-full" />
              ) : (
                <Text className="text-white text-[26px] font-bold">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                </Text>
              )}
            </TouchableOpacity>
            <View className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 border-2 border-surface shadow-sm">
              <Edit3 size={14} color="white" />
            </View>
          </View>
          <View className="flex-1 gap-1">
            <Text className="text-text text-lg font-bold">{profile?.full_name ?? 'User'}</Text>
            <Text className="text-textSecondary text-[13px]">{profile?.email ?? ''}</Text>
            <View className="self-start bg-primary/15 px-2 py-0.5 rounded-md border border-primary flex-row items-center gap-1">
              <Coins size={12} className="text-primary" />
              <Text className="text-primary text-[12px] font-semibold">{profile?.currency ?? 'NPR'}</Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-2 px-6 mb-4">
          <View className="flex-1 bg-surface rounded-xl p-4 items-center border border-border">
            <Text className="text-text text-lg font-bold">{totalExpenses}</Text>
            <Text className="text-textSecondary text-[11px] mt-0.5">{t('expenses.title')}</Text>
          </View>
          <View className="flex-1 bg-surface rounded-xl p-4 items-center border border-border">
            <Text className="text-text text-lg font-bold">{totalCategories}</Text>
            <Text className="text-textSecondary text-[11px] mt-0.5">{t('add_expense.category')}</Text>
          </View>
          <View className="flex-1 bg-surface rounded-xl p-4 items-center border border-border">
            <Text className="text-text text-lg font-bold">
              Rs.{(totalSpent / 1000).toFixed(1)}k
            </Text>
            <Text className="text-textSecondary text-[11px] mt-0.5">{t('analytics.total_spent', { period: '' })}</Text>
          </View>
        </View>

        <View className="px-6 mb-4">
          <Text className="text-textSecondary text-[12px] font-bold mb-1 uppercase tracking-widest">{t('settings.sync')}</Text>
          <View className="bg-surface rounded-2xl border border-border overflow-hidden">
            <SettingsRow
              icon={<RefreshCw size={18} color={colors.textSecondary} />}
              label={t('settings.pending_sync')}
              value={pendingSync > 0 ? t('settings.pending_count', { count: pendingSync }) : t('settings.all_synced')}
              valueColor={pendingSync > 0 ? colors.warning : colors.success}
            />
            <SettingsRow
              icon={<Cloud size={18} color={colors.textSecondary} />}
              label={t('settings.cloud_backup')}
              value="Supabase"
            />
          </View>
        </View>

        <View className="px-6 mb-4">
          <Text className="text-textSecondary text-[12px] font-bold mb-1 uppercase tracking-widest">{t('settings.preferences')}</Text>
          <View className="bg-surface rounded-2xl border border-border overflow-hidden">
            <View className="flex-row items-center justify-between p-4 border-b border-border">
              <View className="flex-row items-center gap-2">
                <Bell size={18} color={colors.textSecondary} />
                <Text className="text-text text-[15px]">{t('settings.budget_alerts')}</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={async (val) => {
                  if (val) {
                    const granted = await requestNotificationPermission()
                    if (granted) {
                      await scheduleDailyReminder()
                      setNotificationsEnabled(true)
                      showToast(t('settings.daily_reminder_enabled'))
                    } else {
                      showToast(t('settings.permission_denied'))
                    }
                  } else {
                    setNotificationsEnabled(false)
                  }
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
            <SettingsRow icon={<Coins size={18} color={colors.textSecondary} />} label={t('settings.currency')} value={profile?.currency ?? 'NPR'} />
            
            <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-border" onPress={handleBiometricToggle}>
              <View className="flex-row items-center gap-2">
                <Fingerprint size={18} color={colors.textSecondary} />
                <Text className="text-text text-[15px]">{t('settings.biometric_login')}</Text>
              </View>
              <Text className={`text-sm font-medium ${isBiometricEnabled ? 'text-primary' : 'text-textSecondary'}`}>
                {isBiometricEnabled ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-border" onPress={handleThemeChange}>
              <View className="flex-row items-center gap-2">
                <Sun size={18} color={colors.textSecondary} />
                <Text className="text-text text-[15px]">{t('settings.theme')}</Text>
              </View>
              <Text className="text-textSecondary text-sm">{themeLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-border" onPress={handleLanguageToggle}>
              <View className="flex-row items-center gap-2">
                <Languages size={18} color={colors.textSecondary} />
                <Text className="text-text text-[15px]">{t('settings.language')}</Text>
              </View>
              <Text className="text-textSecondary text-sm">{languageLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-6 mb-4">
          <Text className="text-textSecondary text-[12px] font-bold mb-1 uppercase tracking-widest">{t('settings.about')}</Text>
          <View className="bg-surface rounded-2xl border border-border overflow-hidden">
            <SettingsRow icon={<Smartphone size={18} color={colors.textSecondary} />} label={t('settings.app_version')} value="1.0.0" />
            {/* <SettingsRow icon={<Sparkles size={18} color={colors.textSecondary} />} label={t('settings.ai_model')} value="Llama 3.1" />
            <SettingsRow icon={<Database size={18} color={colors.textSecondary} />} label={t('settings.database')} value="Supabase" /> */}
          </View>
        </View>

        <View className="px-6 mb-4">
          <Text className="text-textSecondary text-[12px] font-bold mb-1 uppercase tracking-widest">{t('settings.export_data')}</Text>
          <View className="bg-surface rounded-2xl border border-border overflow-hidden">
            <TouchableOpacity
              className="flex-row items-center justify-between p-4 border-b border-border"
              onPress={async () => {
                try {
                  await exportToCSV(expenses)
                } catch {
                  showToast(t('errors.could_not_export_csv'))
                }
              }}
            >
              <View className="flex-row items-center gap-2">
                <BarChart2 size={18} color={colors.textSecondary} />
                <Text className="text-text text-[15px]">{t('settings.export_csv')}</Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center justify-between p-4 border-b border-border"
              onPress={async () => {
                try {
                  await exportToPDF(expenses, profile?.full_name ?? 'User', 'All Time')
                } catch {
                  showToast(t('errors.could_not_export_pdf'))
                }
              }}
            >
              <View className="flex-row items-center gap-2">
                <FileText size={18} color={colors.textSecondary} />
                <Text className="text-text text-[15px]">{t('settings.export_pdf')}</Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-6 mb-4">
          <Text className="text-textSecondary text-[12px] font-bold mb-1 uppercase tracking-widest">{t('settings.account')}</Text>
          <View className="bg-surface rounded-2xl border border-border overflow-hidden">
            <TouchableOpacity
              className="flex-row items-center justify-between p-4 border-b border-border"
              onPress={() => navigation.navigate('ChangePassword')}
            >
              <View className="flex-row items-center gap-2">
                <Lock size={18} color={colors.textSecondary} />
                <Text className="text-text text-[15px]">Change Password</Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-border" onPress={handleClearData}>
              <View className="flex-row items-center gap-2">
                <Trash2 size={18} className="text-error" />
                <Text className="text-error text-[15px]">{t('settings.clear_all_data')}</Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-border" onPress={handleSignOut}>
              <View className="flex-row items-center gap-2">
                <LogOut size={18} className="text-error" />
                <Text className="text-error text-[15px]">{t('auth.sign_out')}</Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Buy me a Momo */}
        <View className="px-6 mb-4">
          <View className="flex-row items-center gap-2 mb-1">
            <Image source={require('../../../assets/momo-icon.png')} className="w-14 h-14" resizeMode="contain" />
            <Text className="text-textSecondary text-[12px] font-bold uppercase tracking-widest">BUY ME A MOMO</Text>
          </View>
          <View className="bg-surface rounded-2xl border border-border p-4">
            <Text className="text-text text-[13px] mb-3">How many plates of momo would you like to buy me?</Text>

            <View className="flex-row items-center justify-center gap-4 mb-4">
              <TouchableOpacity
                className="w-10 h-10 rounded-full bg-border justify-center items-center"
                onPress={() => setMomoCount(Math.max(1, momoCount - 1))}
              >
                <Minus size={20} className="text-text" />
              </TouchableOpacity>

              <TextInput
                className="w-20 h-14 bg-background rounded-xl text-text text-center text-[22px] font-bold border border-border"
                value={String(momoCount)}
                onChangeText={(val) => {
                  const num = parseInt(val) || 1
                  setMomoCount(Math.max(1, Math.min(100, num)))
                }}
                keyboardType="number-pad"
                selectTextOnFocus
              />

              <TouchableOpacity
                className="w-10 h-10 rounded-full bg-border justify-center items-center"
                onPress={() => setMomoCount(Math.min(100, momoCount + 1))}
              >
                <Plus size={20} className="text-text" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-textSecondary text-[13px]">Rs. {MOMO_PRICE} x {momoCount} plate{momoCount !== 1 ? 's' : ''}</Text>
              <Text className="text-text text-[20px] font-bold">Rs. {MOMO_PRICE * momoCount}</Text>
            </View>

            <TouchableOpacity
              className="flex-row items-center justify-center gap-3 bg-primary rounded-xl py-3.5"
              onPress={handlePay}
            >
              <Image
                source={require('../../../assets/esewa-QR.jpeg')}
                className="w-6 h-6 rounded"
                resizeMode="contain"
              />
              <Text className="text-white text-[15px] font-bold">Pay Rs.{MOMO_PRICE * momoCount}</Text>
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
