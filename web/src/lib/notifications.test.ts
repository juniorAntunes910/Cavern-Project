import { beforeEach, describe, expect, it, vi } from 'vitest'
import { habit } from '../test/helpers'
import { resetStorage } from '../test/helpers'
import { readDatabaseValue, setDatabaseValue } from './app-db'
import { localDataKeys } from './local-store'

const plugin = vi.hoisted(() => ({
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  cancel: vi.fn(),
  schedule: vi.fn(),
}))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } }))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: plugin }))
vi.mock('./pwa', () => ({ registerAppServiceWorker: vi.fn() }))

import { disableHabitNotifications, enableHabitNotifications, getNotificationSettings, syncNativeReminders, updateNotificationHour } from './notifications'

/** Memória no lugar do IndexedDB (que os testes não usam). */
const store = new Map<string, unknown>()
beforeEach(() => {
  resetStorage(); store.clear()
  vi.mocked(readDatabaseValue).mockImplementation(async key => store.get(key) as never)
  vi.mocked(setDatabaseValue).mockImplementation(async (key, value) => { store.set(key, value) })
  plugin.checkPermissions.mockResolvedValue({ display: 'granted' })
  plugin.requestPermissions.mockResolvedValue({ display: 'granted' })
  plugin.cancel.mockReset().mockResolvedValue(undefined)
  plugin.schedule.mockReset().mockResolvedValue({ notifications: [] })
  localStorage.setItem(localDataKeys.habits, JSON.stringify([habit('treinar'), habit('ler')]))
})

describe('native habit reminders (Android APK)', () => {
  it('is supported: reports the native permission instead of "unsupported"', async () => {
    plugin.checkPermissions.mockResolvedValue({ display: 'prompt' })
    expect((await getNotificationSettings()).permission).toBe('default')
    plugin.checkPermissions.mockResolvedValue({ display: 'denied' })
    expect((await getNotificationSettings()).permission).toBe('denied')
    plugin.checkPermissions.mockResolvedValue({ display: 'granted' })
    expect((await getNotificationSettings()).permission).toBe('granted')
  })

  it('asks for permission, saves the preference and schedules the next 7 days', async () => {
    const settings = await enableHabitNotifications(20)
    expect(plugin.requestPermissions).toHaveBeenCalled()
    expect(settings).toMatchObject({ enabled: true, hour: 20, permission: 'granted' })
    const scheduled = plugin.schedule.mock.calls.at(-1)![0].notifications as { id: number; schedule: { at: Date; allowWhileIdle: boolean } }[]
    expect(scheduled.length).toBeGreaterThanOrEqual(6)
    expect(scheduled.every(item => item.schedule.at.getHours() === 20 && item.schedule.allowWhileIdle)).toBe(true)
    expect(new Set(scheduled.map(item => item.id)).size).toBe(scheduled.length)
  })

  it('does not enable (and schedules nothing) when the permission is denied', async () => {
    plugin.requestPermissions.mockResolvedValue({ display: 'denied' })
    plugin.checkPermissions.mockResolvedValue({ display: 'denied' })
    const settings = await enableHabitNotifications(18)
    expect(settings).toMatchObject({ enabled: false, permission: 'denied' })
    expect(plugin.schedule).not.toHaveBeenCalled()
  })

  it('disabling cancels the whole reminder window and schedules nothing', async () => {
    await enableHabitNotifications(18)
    plugin.schedule.mockClear()
    const settings = await disableHabitNotifications()
    expect(settings.enabled).toBe(false)
    expect(plugin.cancel).toHaveBeenCalled()
    expect(plugin.cancel.mock.calls.at(-1)![0].notifications).toHaveLength(7)
    expect(plugin.schedule).not.toHaveBeenCalled()
  })

  it('changing the hour reschedules at the new hour', async () => {
    await enableHabitNotifications(18)
    await updateNotificationHour(21)
    const scheduled = plugin.schedule.mock.calls.at(-1)![0].notifications as { schedule: { at: Date } }[]
    expect(scheduled.every(item => item.schedule.at.getHours() === 21)).toBe(true)
  })

  it('resync always cancels the old window first, so completing habits does not leave a stale reminder', async () => {
    await enableHabitNotifications(18)
    plugin.cancel.mockClear(); plugin.schedule.mockClear()
    await syncNativeReminders()
    expect(plugin.cancel).toHaveBeenCalledTimes(1)
    expect(plugin.cancel.mock.invocationCallOrder[0]).toBeLessThan(plugin.schedule.mock.invocationCallOrder[0] ?? Infinity)
  })
})
