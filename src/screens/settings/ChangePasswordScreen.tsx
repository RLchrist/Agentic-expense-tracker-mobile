import { useState } from 'react'
import {
  View, Text, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Lock } from 'lucide-react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../services/supabase/client'
import { useAuthStore } from '../../store/authStore'
import { useAppTheme } from '../../hooks/useAppTheme'
import { useUiStore } from '../../store/uiStore'
import OutlinedInput from '../../components/forms/OutlinedInput'

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(1, 'New password is required').min(6, 'At least 6 characters'),
    confirm_password: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

export default function ChangePasswordScreen({ navigation }: any) {
  const { colors } = useAppTheme()
  const { showToast } = useUiStore()
  const { profile } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true)

    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: profile?.email ?? '',
      password: data.current_password,
    })

    if (reAuthError) {
      showToast('Current password is incorrect')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: data.new_password })

    if (error) {
      showToast(error.message)
    } else {
      showToast('Password changed successfully!')
      navigation.goBack()
    }
    setLoading(false)
  })

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-row items-center p-4 border-b border-border">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-text">Change Password</Text>
        </View>

        <ScrollView contentContainerClassName="p-6" keyboardShouldPersistTaps="handled">
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full bg-primary/10 justify-center items-center">
              <Lock size={36} color={colors.primary} />
            </View>
            <Text className="text-textSecondary text-sm mt-3 text-center">
              Enter your current password and a new password
            </Text>
          </View>

          <Controller
            control={control}
            name="current_password"
            render={({ field: { onChange, onBlur, value } }) => (
              <OutlinedInput
                label="Current Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.current_password?.message}
                placeholder="••••••••"
                secureTextEntry
              />
            )}
          />

          <Controller
            control={control}
            name="new_password"
            render={({ field: { onChange, onBlur, value } }) => (
              <OutlinedInput
                label="New Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.new_password?.message}
                placeholder="••••••••"
                secureTextEntry
              />
            )}
          />

          <Controller
            control={control}
            name="confirm_password"
            render={({ field: { onChange, onBlur, value } }) => (
              <OutlinedInput
                label="Confirm New Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirm_password?.message}
                placeholder="••••••••"
                secureTextEntry
              />
            )}
          />

          <TouchableOpacity
            className={`bg-primary rounded-xl p-4 items-center mt-6 ${loading ? 'opacity-70' : ''}`}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-base font-bold">Change Password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
