import { useEffect, useRef, useState } from 'react'
import { Animated, Text, View } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { COLORS } from '../../constants'

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)
  const heightAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable)
      setIsOffline(offline)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: isOffline ? 36 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }, [isOffline])

  return (
    <Animated.View
      style={{
        height: heightAnim,
        backgroundColor: COLORS.warning,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: '#1C1C28',
          fontSize: 12,
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        You're offline — changes will sync when connected
      </Text>
    </Animated.View>
  )
}
