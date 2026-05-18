import { useState } from 'react'
import {
  View, Text, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView
} from 'react-native'
import { Wallet, Fingerprint } from 'lucide-react-native'
import * as LocalAuthentication from 'expo-local-authentication'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../services/supabase/client'
import { useAppTheme } from '../../hooks/useAppTheme'
import { useSettingsStore } from '../../store/settingsStore'
import { useUiStore } from '../../store/uiStore'
import { secureStorage, StorageKeys } from '../../lib/storage'
import { loginSchema, type LoginFormData } from './authSchema'
import OutlinedInput from '../../components/forms/OutlinedInput'

export default function LoginScreen({ navigation }: any) {
  const { colors } = useAppTheme()
  const { showToast } = useUiStore()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const { isBiometricEnabled } = useSettingsStore()

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const handleLogin = handleSubmit(async (data) => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      showToast(error.message)
    } else {
      await secureStorage.set(
        StorageKeys.BIOMETRIC_CREDENTIALS,
        JSON.stringify({ email: data.email, password: data.password })
      )
    }
    setLoading(false)
  })

  const handleBiometricLogin = async () => {
    if (!isBiometricEnabled) {
      showToast(t('biometric.enable_first'))
      return
    }
    setBiometricLoading(true)
    try {
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
            showToast(error.message)
          }
        }
      }
    } catch {
      showToast(t('auth.biometric_login_error'))
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
            <Wallet size={64} className="text-primary" />
          </View>
          <Text className="text-3xl font-bold text-text mb-1">{t('auth.welcome_back')}</Text>
          <Text className="text-base text-textSecondary">{t('auth.sign_in_to')}</Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <OutlinedInput
                label={t('auth.email')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <OutlinedInput
                label={t('auth.password')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry
              />
            )}
          />

          <TouchableOpacity
            className={`bg-primary rounded-xl p-4 items-center mt-2 ${loading ? 'opacity-70' : ''}`}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator className="text-white" />
              : <Text className="text-white text-base font-bold">{t('auth.sign_in')}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-row items-center justify-center gap-2 rounded-xl p-4 border border-primary ${biometricLoading ? 'opacity-70' : ''}`}
            onPress={handleBiometricLogin}
            disabled={biometricLoading}
          >
            {biometricLoading ? (
              <ActivityIndicator className="text-primary" />
            ) : (
              <>
                <Fingerprint size={20} className="text-primary" />
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
