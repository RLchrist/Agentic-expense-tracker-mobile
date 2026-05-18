import { useColorScheme } from 'nativewind'
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuthStore } from '../store/authStore'
import LoginScreen from '../screens/auth/LoginScreen'
import RegisterScreen from '../screens/auth/RegisterScreen'
import MainNavigator from './MainNavigator'
import { View, ActivityIndicator } from 'react-native'
import { useAppTheme } from '../hooks/useAppTheme'

const Stack = createNativeStackNavigator()

export default function RootNavigator() {
  const { colors } = useAppTheme()
  const { isAuthenticated, isLoading } = useAuthStore()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: isDark ? '#0F0F1A' : '#F8F9FA',
      card: isDark ? '#1A1A2E' : '#FFFFFF',
      text: isDark ? '#FFFFFF' : '#1C1C28',
      border: isDark ? '#2A2A4A' : '#E5E7EB',
      primary: colors.primary,
    },
  }

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator className="text-primary" size="large" />
      </View>
    )
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
