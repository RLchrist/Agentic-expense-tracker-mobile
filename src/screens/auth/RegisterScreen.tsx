import { useState } from 'react'
import {
  View, Text, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView
} from 'react-native'
import { Sparkles } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../services/supabase/client'
import { useAppTheme } from '../../hooks/useAppTheme'
import { useUiStore } from '../../store/uiStore'
import { registerSchema, type RegisterFormData } from './authSchema'
import OutlinedInput from '../../components/forms/OutlinedInput'

export default function RegisterScreen({ navigation }: any) {
  const { colors } = useAppTheme()
  const { showToast } = useUiStore()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  })

  const handleRegister = handleSubmit(async (data) => {
    setLoading(true)
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.fullName } },
    })
    if (error) {
      showToast(error.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      await new Promise(resolve => setTimeout(resolve, 500))

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: data.email,
          full_name: data.fullName,
          currency: 'NPR',
        })

      if (profileError) {
        console.error('Profile insert error:', profileError.message)
      }

      showToast(t('auth.account_created'))
      navigation.navigate('Login')
    }
    setLoading(false)
  })

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerClassName="flex-grow justify-center p-6" keyboardShouldPersistTaps="handled">
        <View className="items-center mb-8">
          <View className="mb-4">
            <Sparkles size={64} className="text-primary" />
          </View>
          <Text className="text-3xl font-bold text-text mb-1">{t('auth.create_account')}</Text>
          <Text className="text-base text-textSecondary">{t('auth.start_tracking')}</Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <OutlinedInput
                label={t('auth.full_name')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.fullName?.message}
                autoCapitalize="words"
              />
            )}
          />

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

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <OutlinedInput
                label={t('auth.confirm_password')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
                secureTextEntry
              />
            )}
          />

          <TouchableOpacity
            className={`bg-primary rounded-xl p-4 items-center mt-2 ${loading ? 'opacity-70' : ''}`}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator className="text-white" />
              : <Text className="text-white text-base font-bold">{t('auth.sign_up')}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center mt-2"
            onPress={() => navigation.navigate('Login')}
          >
            <Text className="text-textSecondary text-sm">
              {t('auth.has_account')}{' '}
              <Text className="text-primary font-bold">{t('auth.sign_in')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
