import { useColorScheme } from 'nativewind'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Home, List, BarChart2, Wallet, Settings } from 'lucide-react-native'
import { themeColors } from '../constants'
import DashboardScreen from '../screens/dashboard/DashboardScreen'
import BudgetsScreen from '../screens/budget/BudgetsScreen'
import AnalyticsScreen from '../screens/dashboard/AnalyticsScreen'
import ExpensesScreen from '../screens/expense/ExpensesScreen'
import AddExpenseScreen from '../screens/expense/AddExpenseScreen'
import ReceiptScannerScreen from '../screens/expense/ReceiptScannerScreen'
import SettingsScreen from '../screens/settings/SettingsScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function HomeTabs() {
  const insets = useSafeAreaInsets()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = themeColors(isDark)

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ 
          tabBarLabel: 'Home', 
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> 
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{ 
          tabBarLabel: 'Expenses', 
          tabBarIcon: ({ color, size }) => <List color={color} size={size} /> 
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ 
          tabBarLabel: 'Analytics', 
          tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} /> 
        }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetsScreen}
        options={{ 
          tabBarLabel: 'Budgets', 
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} /> 
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ 
          tabBarLabel: 'Settings', 
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> 
        }}
      />
    </Tab.Navigator>
  )
}

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeTabs" component={HomeTabs} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
      <Stack.Screen name="ReceiptScanner" component={ReceiptScannerScreen} />
    </Stack.Navigator>
  )
}
