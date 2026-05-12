import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text } from 'react-native'
import { COLORS } from '../constants'
import DashboardScreen from '../screens/dashboard/DashboardScreen'
import AddExpenseScreen from '../screens/expense/AddExpenseScreen'
import { View } from 'react-native'

const Placeholder = (label: string) => () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
    <Text style={{ color: COLORS.text, fontSize: 20 }}>{label}</Text>
  </View>
)

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
        component={Placeholder('📋 Expenses')}
        options={{ tabBarLabel: 'Expenses', tabBarIcon: () => <Text>📋</Text> }}
      />
      <Tab.Screen
        name="Budgets"
        component={Placeholder('💰 Budgets')}
        options={{ tabBarLabel: 'Budgets', tabBarIcon: () => <Text>💰</Text> }}
      />
      <Tab.Screen
        name="Settings"
        component={Placeholder('⚙️ Settings')}
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
    </Stack.Navigator>
  )
}