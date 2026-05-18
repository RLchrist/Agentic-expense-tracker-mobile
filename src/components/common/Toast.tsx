import React from 'react'
import { View, Text, Animated } from 'react-native'
import { useUiStore } from '../../store/uiStore'

export default function Toast() {
  const { toast } = useUiStore()
  const opacity = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    if (toast.visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  }, [toast.visible])

  if (!toast.visible) return null

  return (
    <Animated.View 
      pointerEvents="none"
      className="absolute inset-0 justify-center items-center z-[9999]"
      style={{ opacity }}
    >
      <View className="bg-black/75 px-5 py-2.5 rounded-2xl">
        <Text className="text-white text-[15px] font-medium">{toast.message}</Text>
      </View>
    </Animated.View>
  )
}
