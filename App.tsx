import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import NetInfo from '@react-native-community/netinfo'
import { supabase } from './src/services/supabase/client'
import { useAuthStore } from './src/store/authStore'
import RootNavigator from './src/navigation/RootNavigator'
import { drainQueue, getPendingCount } from './src/services/sync/offlineSync'

export default function App() {
  const { setSession } = useAuthStore()

  useEffect(() => {
    // Auth listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )

    // Network listener — drain queue when back online
    let isSyncing = false
    const unsubscribeNet = NetInfo.addEventListener(async (state) => {
      if (state.isConnected && state.isInternetReachable && !isSyncing) {
        const pending = getPendingCount()
        if (pending > 0) {
          isSyncing = true
          console.log(`Back online — syncing ${pending} queued operations...`)
          try {
            const result = await drainQueue()
            console.log(`Sync complete: ${result.success} success, ${result.failed} failed`)
          } finally {
            isSyncing = false
          }
        }
      }
    })

    return () => {
      subscription.unsubscribe()
      unsubscribeNet()
    }
  }, [])

  return (
    <>
      <StatusBar style="light" />
      <RootNavigator />
    </>
  )
}