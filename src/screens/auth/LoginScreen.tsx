import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView
} from 'react-native'
import { Wallet, Fingerprint } from 'lucide-react-native'
import * as LocalAuthentication from 'expo-local-authentication'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../services/supabase/client'
import { COLORS } from '../../constants'
import { useSettingsStore } from '../../store/settingsStore'
import { secureStorage, StorageKeys } from '../../lib/storage'

export default function LoginScreen({ navigation }: any) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const { isBiometricEnabled } = useSettingsStore()

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('errors.error'), t('auth.please_fill_fields'))
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      Alert.alert(t('auth.login_failed'), error.message)
    } else {
      await secureStorage.set(
        StorageKeys.BIOMETRIC_CREDENTIALS,
        JSON.stringify({ email, password })
      )
    }
    setLoading(false)
  }

  const handleBiometricLogin = async () => {
    if (!isBiometricEnabled) {
      Alert.alert(t('errors.error'), t('biometric.enable_first'))
      return
    }
    setBiometricLoading(true)
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync()
      if (!hasHardware) {
        Alert.alert(t('errors.error'), t('biometric.no_hardware'))
        return
      }
      const isEnrolled = await LocalAuthentication.isEnrolledAsync()
      if (!isEnrolled) {
        Alert.alert(t('errors.error'), t('biometric.not_enrolled'))
        return
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('biometric.sign_in_prompt'),
        fallbackLabel: t('biometric.use_password'),
      })
      if (result.success) {
        const storedCreds = await secureStorage.get(StorageKeys.BIOMETRIC_CREDENTIALS)
        if (storedCreds) {
          const { email: storedEmail, password: storedPassword } = JSON.parse(storedCreds)
          const { error } = await supabase.auth.signInWithPassword({
            email: storedEmail,
            password: storedPassword,
          })
          if (error) {
            Alert.alert(t('auth.biometric_login_error'), error.message)
          }
        }
      }
    } catch {
      Alert.alert(t('errors.error'), t('auth.biometric_login_error'))
    }
    setBiometricLoading(false)
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerClassName="flex-grow justify-center p-6" keyboardShouldPersistTaps="handled">
        <View className="items-center mb-12">
          <View className="mb-4">
            <Wallet size={64} color={COLORS.primary} />
          </View>
          <Text className="text-3xl font-bold text-text mb-1">{t('auth.welcome_back')}</Text>
          <Text className="text-base text-textSecondary">{t('auth.sign_in_to')}</Text>
        </View>

        <View className="gap-4">
          <View className="gap-1">
            <Text className="text-sm font-semibold text-textSecondary">{t('auth.email')}</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl p-4 text-text text-base"
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View className="gap-1">
            <Text className="text-sm font-semibold text-textSecondary">{t('auth.password')}</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl p-4 text-text text-base"
              placeholder="••••••••"
              placeholderTextColor={COLORS.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            className={`bg-primary rounded-xl p-4 items-center mt-2 ${loading ? 'opacity-70' : ''}`}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text className="text-white text-base font-bold">{t('auth.sign_in')}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-row items-center justify-center gap-2 rounded-xl p-4 border border-primary ${biometricLoading ? 'opacity-70' : ''}`}
            onPress={handleBiometricLogin}
            disabled={biometricLoading}
          >
            {biometricLoading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <>
                <Fingerprint size={20} color={COLORS.primary} />
                <Text className="text-primary font-bold text-base">{t('auth.sign_in_with_biometric')}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center mt-2"
            onPress={() => navigation.navigate('Register')}
          >
            <Text className="text-textSecondary text-sm">
              {t('auth.no_account')}{' '}
              <Text className="text-primary font-bold">{t('auth.sign_up')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
