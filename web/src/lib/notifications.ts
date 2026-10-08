import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { readDatabaseValue, setDatabaseValue } from './app-db'
import { REMINDER_DAYS, REMINDER_ID_BASE, planReminders } from './habit-reminders'
import { getLocalHabitLogs, getLocalHabits, today } from './local-store'
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

/** No APK o WebView do Android não tem a API Notification do navegador: os lembretes usam o agendador nativo. */
const isNative = () => Capacitor.isNativePlatform()

async function nativePermission(): Promise<NotificationPermission | 'unsupported'> {
  try {
    const { display } = await LocalNotifications.checkPermissions()
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'default'
  } catch { return 'unsupported' }
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const enabled = await readDatabaseValue<boolean>(enabledKey) ?? false
  const hour = await readDatabaseValue<number>(hourKey) ?? defaultHour
  const permission = isNative() ? await nativePermission() : 'Notification' in window ? Notification.permission : 'unsupported'
  return { enabled, hour, permission }
}

/** Hábitos ativos ainda sem conclusão hoje (a mesma regra do service worker). */
function pendingHabitNames() {
  const date = today()
  const done = new Set(getLocalHabitLogs().filter(log => log.date === date && log.status === 'completed').map(log => log.habit_id))
  return getLocalHabits().filter(habit => habit.active && !done.has(habit.id)).map(habit => habit.name)
}

let scheduling: Promise<void> = Promise.resolve()
/**
 * Reagenda a janela de lembretes nativos (7 dias). Roda ao ativar, ao mudar o horário, ao abrir o app e quando os dados mudam,
 * para que concluir o último hábito do dia cancele o lembrete de hoje. Chamadas seguidas são enfileiradas.
 */
export function syncNativeReminders() {
  if (!isNative()) return Promise.resolve()
  scheduling = scheduling.then(async () => {
    try {
      const ids = Array.from({ length: REMINDER_DAYS }, (_, offset) => ({ id: REMINDER_ID_BASE + offset }))
      await LocalNotifications.cancel({ notifications: ids })
      const enabled = await readDatabaseValue<boolean>(enabledKey) ?? false
      if (!enabled || (await nativePermission()) !== 'granted') return
      const hour = await readDatabaseValue<number>(hourKey) ?? defaultHour
      const planned = planReminders({ now: new Date(), hour, pendingNames: pendingHabitNames() })
      if (!planned.length) return
      await LocalNotifications.schedule({ notifications: planned.map(item => ({ id: item.id, title: item.title, body: item.body, schedule: { at: item.at, allowWhileIdle: true }, extra: { url: '/habits' } })) })
    } catch (error) {
      console.error('Não foi possível agendar os lembretes.', error)
    }
  })
  return scheduling
}

export async function enableHabitNotifications(hour = defaultHour) {
  if (isNative()) {
    const { display } = await LocalNotifications.requestPermissions()
    if (display !== 'granted') return getNotificationSettings()
    await setDatabaseValue(enabledKey, true)
    await setDatabaseValue(hourKey, hour)
    await syncNativeReminders()
    return getNotificationSettings()
  }
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
  if (isNative()) {
    await syncNativeReminders()
    return getNotificationSettings()
  }
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
  if (isNative()) await syncNativeReminders()
  else await requestHabitReminderCheck()
  return getNotificationSettings()
}

async function requestHabitReminderCheck(existingRegistration?: ServiceWorkerRegistration | null) {
  if (!('serviceWorker' in navigator)) return
  const registration = existingRegistration ?? await navigator.serviceWorker.getRegistration() ?? await registerAppServiceWorker()
  const readyRegistration = registration?.active ? registration : await navigator.serviceWorker.ready
  readyRegistration.active?.postMessage({ type: 'CHECK_HABIT_REMINDER' })
}

export function startHabitReminderChecks() {
  if (isNative()) {
    let timer = 0
    const resync = () => { window.clearTimeout(timer); timer = window.setTimeout(() => void syncNativeReminders(), 800) }
    const onVisible = () => { if (document.visibilityState === 'visible') resync() }
    resync()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('cavern:data-changed', resync)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('cavern:data-changed', resync)
    }
  }
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
