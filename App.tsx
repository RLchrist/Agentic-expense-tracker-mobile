import { useEffect } from 'react'
import { View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import NetInfo from '@react-native-community/netinfo'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useColorScheme } from 'nativewind'
import { Appearance } from 'react-native'
import { supabase } from './src/services/supabase/client'
import { useAuthStore } from './src/store/authStore'
import { useSettingsStore } from './src/store/settingsStore'
import RootNavigator from './src/navigation/RootNavigator'
import Toast from './src/components/common/Toast'
import { drainQueue, getPendingCount } from './src/services/sync/offlineSync'
import './src/i18n'

export default function App() {
  const { setSession } = useAuthStore()
  const { theme } = useSettingsStore()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  useEffect(() => {
    if (theme === 'system') {
      Appearance.setColorScheme(null)
    } else {
      Appearance.setColorScheme(theme)
    }
  }, [theme])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )

    let isSyncing = false
    const unsubscribeNet = NetInfo.addEventListener(async (state) => {
      if (state.isConnected && state.isInternetReachable && !isSyncing) {
        const pending = await getPendingCount()
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
    <View className={`flex-1 ${isDark ? 'dark' : ''}`}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <RootNavigator />
          <Toast />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </View>
  )
}
