import * as Notifications from 'expo-notifications'
import { BudgetWithSpent } from '../../store/budgetStore'

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export const requestNotificationPermission = async (): Promise<boolean> => {
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export const checkBudgetAlerts = async (budgets: BudgetWithSpent[]): Promise<void> => {
  const { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') return

  for (const budget of budgets) {
    const categoryName = budget.category?.name ?? 'Overall'

    // Over budget alert
    if (budget.percentage >= 100) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Over Budget!',
          body: `You've exceeded your ${categoryName} budget by Rs.${(budget.spent - Number(budget.amount)).toFixed(0)}`,
          data: { budgetId: budget.id, type: 'over_budget' },
        },
        trigger: null, // immediate
      })
    }
    // 80% warning
    else if (budget.percentage >= 80 && budget.percentage < 100) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Budget Warning',
          body: `You've used ${budget.percentage.toFixed(0)}% of your ${categoryName} budget`,
          data: { budgetId: budget.id, type: 'budget_warning' },
        },
        trigger: null,
      })
    }
  }
}

export const scheduleDailyReminder = async (): Promise<void> => {
  // Cancel existing reminders
  await Notifications.cancelAllScheduledNotificationsAsync()

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💰 Daily Expense Reminder',
      body: "Don't forget to log today's expenses!",
      data: { type: 'daily_reminder' },
    },
    trigger: {
      hour: 21,
      minute: 0,
      repeats: true,
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
    },
  })
}