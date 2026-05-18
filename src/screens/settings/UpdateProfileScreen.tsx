import { useState } from 'react'
import {
  View, Text, TouchableOpacity, Image,
  ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Camera, User } from 'lucide-react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import * as ImagePicker from 'expo-image-picker'
import { File } from 'expo-file-system'
import { supabase } from '../../services/supabase/client'
import { useAuthStore } from '../../store/authStore'
import { useAppTheme } from '../../hooks/useAppTheme'
import { useUiStore } from '../../store/uiStore'
import OutlinedInput from '../../components/forms/OutlinedInput'

const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').min(2, 'At least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email'),
})

type UpdateProfileFormData = z.infer<typeof updateProfileSchema>

export default function UpdateProfileScreen({ navigation }: any) {
  const { colors } = useAppTheme()
  const { showToast } = useUiStore()
  const { profile, updateProfile } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)

  const { control, handleSubmit, formState: { errors } } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      email: profile?.email ?? '',
    },
  })

  const handleAvatarUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    })

    if (!result.canceled && result.assets[0].uri) {
      setAvatarLoading(true)
      try {
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
      } catch (e) {
        console.error('Avatar upload failed:', e)
        showToast('Failed to upload avatar')
      }
      setAvatarLoading(false)
    }
  }

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true)
    try {
      await updateProfile({ full_name: data.full_name, email: data.email })

      if (data.email !== profile?.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: data.email })
        if (emailError) {
          showToast('Verification email sent to new address')
        }
      }

      showToast('Profile updated!')
      navigation.goBack()
    } catch {
      showToast('Failed to update profile')
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
          <Text className="text-lg font-bold text-text">Update Profile</Text>
        </View>

        <ScrollView contentContainerClassName="p-6" keyboardShouldPersistTaps="handled">
          <View className="items-center mb-8">
            <TouchableOpacity
              onPress={handleAvatarUpload}
              disabled={avatarLoading}
              className="w-24 h-24 rounded-full bg-surface border-2 border-border justify-center items-center overflow-hidden"
            >
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} className="w-full h-full" />
              ) : (
                <View className="w-full h-full bg-primary justify-center items-center">
                  <Text className="text-white text-3xl font-bold">
                    {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                  </Text>
                </View>
              )}
              {avatarLoading && (
                <View className="absolute inset-0 bg-black/40 justify-center items-center">
                  <ActivityIndicator color="white" />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAvatarUpload} className="mt-3" disabled={avatarLoading}>
              <View className="flex-row items-center gap-1.5">
                <Camera size={16} color={colors.primary} />
                <Text className="text-primary text-sm font-medium">Change Photo</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Controller
            control={control}
            name="full_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <OutlinedInput
                label="Full Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.full_name?.message}
                placeholder="John Doe"
                autoCapitalize="words"
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <OutlinedInput
                label="Email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
          />

          <TouchableOpacity
            className={`bg-primary rounded-xl p-4 items-center mt-6 ${loading ? 'opacity-70' : ''}`}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text className="text-white text-base font-bold">Save Changes</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
