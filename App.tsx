import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { supabase } from './src/services/supabase/client'
import { useAuthStore } from './src/store/authStore'
import RootNavigator from './src/navigation/RootNavigator'

export default function App() {
  const { setSession } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )
    return () => subscription.unsubscribe()
  }, [])

  return (
    <>
      <StatusBar style="light" />
      <RootNavigator />
    </>
  )
}