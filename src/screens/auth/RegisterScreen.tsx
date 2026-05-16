import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView
} from 'react-native'
import { Sparkles } from 'lucide-react-native'
import { supabase } from '../../services/supabase/client'
import { COLORS } from '../../constants'

export default function RegisterScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

 const handleRegister = async () => {
  if (!fullName || !email || !password || !confirmPassword) {
    Alert.alert('Error', 'Please fill in all fields')
    return
  }
  if (password !== confirmPassword) {
    Alert.alert('Error', 'Passwords do not match')
    return
  }
  if (password.length < 6) {
    Alert.alert('Error', 'Password must be at least 6 characters')
    return
  }
  setLoading(true)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) {
    Alert.alert('Registration Failed', error.message)
    setLoading(false)
    return
  }

  if (data.user) {
    // Wait briefly for auth to settle
    await new Promise(resolve => setTimeout(resolve, 500))

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        currency: 'NPR',
      })

    if (profileError) {
      console.error('Profile insert error:', profileError.message)
    }

    Alert.alert('Success', 'Account created! Please sign in.')
    navigation.navigate('Login')
  }
  setLoading(false)
}

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerClassName="flex-grow justify-center p-6" keyboardShouldPersistTaps="handled">
        <View className="items-center mb-8">
          <View className="mb-4">
            <Sparkles size={64} color={COLORS.primary} />
          </View>
          <Text className="text-3xl font-bold text-text mb-1">Create Account</Text>
          <Text className="text-base text-textSecondary">Start tracking your expenses</Text>
        </View>

        <View className="gap-4">
          <View className="gap-1">
            <Text className="text-sm font-semibold text-textSecondary">Full Name</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl p-4 text-text text-base"
              placeholder="Raju Sah"
              placeholderTextColor={COLORS.textSecondary}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          <View className="gap-1">
            <Text className="text-sm font-semibold text-textSecondary">Email</Text>
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
            <Text className="text-sm font-semibold text-textSecondary">Password</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl p-4 text-text text-base"
              placeholder="••••••••"
              placeholderTextColor={COLORS.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View className="gap-1">
            <Text className="text-sm font-semibold text-textSecondary">Confirm Password</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl p-4 text-text text-base"
              placeholder="••••••••"
              placeholderTextColor={COLORS.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            className={`bg-primary rounded-xl p-4 items-center mt-2 ${loading ? 'opacity-70' : ''}`}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text className="text-white text-base font-bold">Create Account</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center mt-2"
            onPress={() => navigation.navigate('Login')}
          >
            <Text className="text-textSecondary text-sm">
              Already have an account?{' '}
              <Text className="text-primary font-bold">Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}