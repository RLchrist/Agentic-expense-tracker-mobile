import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text } from 'react-native'
import { COLORS } from '../constants'
import DashboardScreen from '../screens/dashboard/DashboardScreen'
import BudgetsScreen from '../screens/dashboard/BudgetsScreen'
import AnalyticsScreen from '../screens/dashboard/AnalyticsScreen'
import ExpensesScreen from '../screens/expense/ExpensesScreen'
import AddExpenseScreen from '../screens/expense/AddExpenseScreen'
import ReceiptScannerScreen from '../screens/expense/ReceiptScannerScreen'
import SettingsScreen from '../screens/settings/SettingsScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          paddingBottom: 8, paddingTop: 8, height: 60,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home', tabBarIcon: () => <Text>🏠</Text> }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{ tabBarLabel: 'Expenses', tabBarIcon: () => <Text>📋</Text> }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ tabBarLabel: 'Analytics', tabBarIcon: () => <Text>📊</Text> }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetsScreen}
        options={{ tabBarLabel: 'Budgets', tabBarIcon: () => <Text>💰</Text> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings', tabBarIcon: () => <Text>⚙️</Text> }}
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