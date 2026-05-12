import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { supabase } from './src/services/supabase/client'
import { useAuthStore } from './src/store/authStore'
import { Text, View } from 'react-native'

export default function App() {
  const { setSession, isLoading } = useAuthStore()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F1A' }}>
        <Text style={{ color: '#fff' }}>Loading...</Text>
      </View>
    )
  }

  return (
    <>
      <StatusBar style="light" />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F1A' }}>
        <Text style={{ color: '#fff', fontSize: 24 }}>Expense Tracker</Text>
        <Text style={{ color: '#A0A0B0', marginTop: 8 }}>Supabase connected ✓</Text>
      </View>
    </>
  )
}