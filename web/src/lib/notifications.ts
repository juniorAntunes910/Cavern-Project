import { readDatabaseValue, setDatabaseValue } from './app-db'
import { registerAppServiceWorker } from './pwa'

const enabledKey = 'cavern.settings.notifications.enabled'
const hourKey = 'cavern.settings.notifications.hour'
const reminderTag = 'cavern-daily-habit-reminder'
const defaultHour = 18

interface PeriodicSyncManager {
  register(tag: string, options: { minInterval: number }): Promise<void>
  unregister(tag: string): Promise<void>
}

type ServiceWorkerRegistrationWithPeriodicSync = ServiceWorkerRegistration & {
  periodicSync?: PeriodicSyncManager
}

export type NotificationSettings = {
  enabled: boolean
  hour: number
  permission: NotificationPermission | 'unsupported'
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const enabled = await readDatabaseValue<boolean>(enabledKey) ?? false
  const hour = await readDatabaseValue<number>(hourKey) ?? defaultHour
  const permission = 'Notification' in window ? Notification.permission : 'unsupported'
  return { enabled, hour, permission }
}

export async function enableHabitNotifications(hour = defaultHour) {
  if (!('Notification' in window)) return getNotificationSettings()
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return getNotificationSettings()

  await setDatabaseValue(enabledKey, true)
  await setDatabaseValue(hourKey, hour)
  const registration = await registerAppServiceWorker() as ServiceWorkerRegistrationWithPeriodicSync | null
  if (registration?.periodicSync) {
    try {
      await registration.periodicSync.register(reminderTag, { minInterval: 24 * 60 * 60 * 1000 })
    } catch {
      // The foreground and visibility checks remain active as a compatible fallback.
    }
  }
  await requestHabitReminderCheck(registration)
  return getNotificationSettings()
}

export async function disableHabitNotifications() {
  await setDatabaseValue(enabledKey, false)
  const registration = await navigator.serviceWorker?.getRegistration() as ServiceWorkerRegistrationWithPeriodicSync | undefined
  if (registration?.periodicSync) {
    try {
      await registration.periodicSync.unregister(reminderTag)
    } catch {
      // The saved preference is authoritative even if unregister is unavailable.
    }
  }
  return getNotificationSettings()
}

export async function updateNotificationHour(hour: number) {
  await setDatabaseValue(hourKey, hour)
  await requestHabitReminderCheck()
  return getNotificationSettings()
}

async function requestHabitReminderCheck(existingRegistration?: ServiceWorkerRegistration | null) {
  if (!('serviceWorker' in navigator)) return
  const registration = existingRegistration ?? await navigator.serviceWorker.getRegistration() ?? await registerAppServiceWorker()
  const readyRegistration = registration?.active ? registration : await navigator.serviceWorker.ready
  readyRegistration.active?.postMessage({ type: 'CHECK_HABIT_REMINDER' })
}

export function startHabitReminderChecks() {
  const check = () => {
    if (document.visibilityState === 'visible') void requestHabitReminderCheck()
  }
  check()
  document.addEventListener('visibilitychange', check)
  const interval = window.setInterval(check, 30 * 60 * 1000)
  return () => {
    document.removeEventListener('visibilitychange', check)
    window.clearInterval(interval)
  }
}
