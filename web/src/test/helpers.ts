import type { LocalCheckIn, LocalFocusSession, LocalGoal, LocalHabit, LocalHabitLog, LocalReadingSession } from '../lib/local-store'

/** Empties the store and bumps the data revision, so memoized values from a previous test are discarded. */
export function resetStorage() {
  localStorage.clear()
  window.dispatchEvent(new Event('cavern:data-changed'))
}

/** Noon UTC: the UTC date of the timestamp is `date` whatever the machine's timezone is. */
export const at = (date: string) => `${date}T12:00:00.000Z`
/** Noon in the machine's own timezone: its local date is `date`. */
export const localAt = (date: string) => new Date(`${date}T12:00:00`).toISOString()

export const habit = (id: string, category: LocalHabit['category'] = 'custom'): LocalHabit => ({ id, name: id, description: null, type: 'positive', category, target_days: null, started_at: '2026-09-01', active: true })
export const habitLog = (habitId: string, date: string, status: LocalHabitLog['status'] = 'completed'): LocalHabitLog => ({ id: `${habitId}:${date}`, habit_id: habitId, date, status, notes: null })
export const goal = (overrides: Partial<LocalGoal> = {}): LocalGoal => ({ id: 'g1', title: 'Meta', target_value: 10, unit: 'dias', metric: 'habit_days', period_type: 'total', status: 'active', manual_progress: 0, start_date: '2026-10-01', end_date: '2026-10-31', ...overrides })
export const checkIn = (date: string): LocalCheckIn => ({ id: `checkin-${date}`, date, discipline: 3, focus: 3, energy: 3, good_today: '', improve_tomorrow: '' })
/** `seconds: null` is a session that was never finished. */
export const readingSession = (startedAt: string, pages: number, seconds: number | null = null): LocalReadingSession => ({ id: crypto.randomUUID(), book_id: 'book', start_page: 1, max_page_reached: 1 + pages, end_page: 1 + pages, pages_read: pages, started_at: startedAt, ended_at: seconds === null ? null : startedAt, duration_seconds: seconds })
export const focusSession = (endedAt: string | null, seconds: number, status: LocalFocusSession['status'] = 'completed', extra: Partial<LocalFocusSession> = {}): LocalFocusSession => ({ id: crypto.randomUUID(), started_at: endedAt ?? '2026-01-01T12:00:00.000Z', resumed_at: null, ended_at: endedAt, duration_seconds: seconds, accumulated_seconds: seconds, status, ...extra })
