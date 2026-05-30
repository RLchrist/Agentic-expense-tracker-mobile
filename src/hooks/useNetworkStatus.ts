import { useState, useEffect } from 'react'
import NetInfo from '@react-native-community/netinfo'

export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected && state.isInternetReachable))
    })
    return () => unsubscribe()
  }, [])

  return { isOffline }
}
