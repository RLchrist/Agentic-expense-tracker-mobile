import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView
} from 'react-native'
import { Wallet } from 'lucide-react-native'
import { supabase } from '../../services/supabase/client'
import { COLORS } from '../../constants'

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) Alert.alert('Login Failed', error.message)
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerClassName="flex-grow justify-center p-6" keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View className="items-center mb-12">
          <View className="mb-4">
            <Wallet size={64} color={COLORS.primary} />
          </View>
          <Text className="text-3xl font-bold text-text mb-1">Welcome Back</Text>
          <Text className="text-base text-textSecondary">Sign in to your expense tracker</Text>
        </View>

        {/* Form */}
        <View className="gap-4">
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

          <TouchableOpacity
            className={`bg-primary rounded-xl p-4 items-center mt-2 ${loading ? 'opacity-70' : ''}`}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text className="text-white text-base font-bold">Sign In</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center mt-2"
            onPress={() => navigation.navigate('Register')}
          >
            <Text className="text-textSecondary text-sm">
              Don't have an account?{' '}
              <Text className="text-primary font-bold">Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}