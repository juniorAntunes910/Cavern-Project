import { persistDatabaseValue } from './app-db'

export type LocalCavern = { id: string; name: string; description: string | null; start_date: string; end_date: string; status: 'planned' | 'active' | 'completed' | 'cancelled' }
export type GoalMetric = 'habit_days' | 'pages_read' | 'reading_minutes' | 'study_minutes' | 'workouts' | 'custom'
export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'total'
export type LocalGoal = { id: string; cavern_id: string | null; title: string; target_value: number; unit: string; metric: GoalMetric; period_type: GoalPeriod; status: 'active' | 'completed' | 'cancelled'; manual_progress: number; start_date: string; end_date: string }
export type HabitType = 'positive' | 'abstinence'
export type HabitCategory = 'workout' | 'study' | 'meditation' | 'reading' | 'custom'
export type HabitLogStatus = 'completed' | 'failed' | 'skipped'
export type LocalHabit = { id: string; cavern_id: string | null; name: string; description: string | null; type: HabitType; category: HabitCategory; target_days: number | null; started_at: string; active: boolean }
export type LocalHabitLog = { id: string; habit_id: string; date: string; status: HabitLogStatus; notes: string | null }
export type LocalBook = { id: string; title: string; author: string | null; file_name: string; total_pages: number; current_page: number; status: 'want_to_read' | 'reading' | 'finished' | 'archived' }
export type LocalReadingSession = { id: string; book_id: string; start_page: number; max_page_reached: number; end_page: number; pages_read: number; started_at: string; ended_at: string | null; duration_seconds: number | null }
export type LocalCheckIn = { id: string; date: string; discipline: number; focus: number; energy: number; good_today: string; improve_tomorrow: string }

export const localDataKeys = { caverns: 'cavern.local.caverns.v1', goals: 'cavern.local.goals.v2', habits: 'cavern.local.habits.v1', habitLogs: 'cavern.local.habit-logs.v1', books: 'cavern.local.books.v1', sessions: 'cavern.local.reading-sessions.v1', checkins: 'cavern.local.checkins.v1' } as const
const keys = localDataKeys
const read = <T>(key: string): T[] => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T[] : [] } catch { return [] } }
const write = <T>(key: string, value: T[]) => {
  localStorage.setItem(key, JSON.stringify(value))
  persistDatabaseValue(key, value)
  window.dispatchEvent(new Event('cavern:data-changed'))
}
const id = () => crypto.randomUUID()

export function getLocalCaverns() { return read<LocalCavern>(keys.caverns) }
export function addLocalCavern(cavern: Omit<LocalCavern, 'id' | 'status'>) { const next = [{ ...cavern, id: id(), status: 'planned' as const }, ...getLocalCaverns()]; write(keys.caverns, next); return next }

export function getLocalGoals() { return read<LocalGoal>(keys.goals).map(goal => ({ ...goal, cavern_id: goal.cavern_id ?? null, metric: goal.metric ?? 'custom', manual_progress: goal.manual_progress ?? 0, start_date: goal.start_date ?? today(), end_date: goal.end_date ?? today() })) }
export function addLocalGoal(goal: Omit<LocalGoal, 'id' | 'status' | 'manual_progress'>) { const next = [{ ...goal, id: id(), status: 'active' as const, manual_progress: 0 }, ...getLocalGoals()]; write(keys.goals, next); return next }
export function updateLocalGoal(id: string, changes: Partial<LocalGoal>) { const next = getLocalGoals().map(goal => goal.id === id ? { ...goal, ...changes } : goal); write(keys.goals, next); return next }
export function deleteLocalGoal(id: string) { const next = getLocalGoals().filter(goal => goal.id !== id); write(keys.goals, next); return next }

export function getLocalHabits() { return read<LocalHabit>(keys.habits).map(habit => ({ ...habit, category: habit.category ?? 'custom' })) }
export function addLocalHabit(habit: Omit<LocalHabit, 'id' | 'active'>) { const next = [{ ...habit, id: id(), active: true }, ...getLocalHabits()]; write(keys.habits, next); return next }
export function updateLocalHabit(id: string, changes: Partial<LocalHabit>) { const next = getLocalHabits().map(habit => habit.id === id ? { ...habit, ...changes } : habit); write(keys.habits, next); return next }
export function deleteLocalHabit(id: string) { const next = getLocalHabits().filter(habit => habit.id !== id); write(keys.habits, next); write(keys.habitLogs, getLocalHabitLogs().filter(log => log.habit_id !== id)); return next }
export function getLocalHabitLogs() { return read<LocalHabitLog>(keys.habitLogs) }
export function getLocalBooks() { return read<LocalBook>(keys.books) }
export function addLocalBook(book: Omit<LocalBook, 'id' | 'current_page' | 'status'>) { const next = [{ ...book, id: id(), current_page: 1, status: 'want_to_read' as const }, ...getLocalBooks()]; write(keys.books, next); return next }
export function updateLocalBook(id: string, changes: Partial<LocalBook>) { const next = getLocalBooks().map(book => book.id === id ? { ...book, ...changes } : book); write(keys.books, next); return next }
export function deleteLocalBook(id: string) { const next = getLocalBooks().filter(book => book.id !== id); write(keys.books, next); return next }
export function getLocalReadingSessions() { return read<LocalReadingSession>(keys.sessions) }
export function getLocalCheckIns() { return read<LocalCheckIn>(keys.checkins) }
export function saveLocalCheckIn(checkin: Omit<LocalCheckIn, 'id'>) { const current = getLocalCheckIns(); const existing = current.findIndex(item => item.date === checkin.date); const item = { ...checkin, id: existing >= 0 ? current[existing].id : id() }; const next = existing >= 0 ? current.map((value,index) => index === existing ? item : value) : [item, ...current]; write(keys.checkins, next); return next }
export function startReadingSession(bookId: string, page: number) { const session: LocalReadingSession = { id: id(), book_id: bookId, start_page: page, max_page_reached: page, end_page: page, pages_read: 0, started_at: new Date().toISOString(), ended_at: null, duration_seconds: null }; const next = [...getLocalReadingSessions(), session]; write(keys.sessions, next); return session }
export function updateReadingSession(sessionId: string, page: number) { const next = getLocalReadingSessions().map(session => session.id === sessionId ? { ...session, end_page: page, max_page_reached: Math.max(session.max_page_reached, page), pages_read: Math.max(0, Math.max(session.max_page_reached, page) - session.start_page) } : session); write(keys.sessions, next); return next }
export function finishReadingSession(sessionId: string) { const next = getLocalReadingSessions().map(session => session.id === sessionId && !session.ended_at ? { ...session, ended_at: new Date().toISOString(), duration_seconds: Math.max(0, Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000)) } : session); write(keys.sessions, next); return next }
export function logHabit(habitId: string, date: string, status: HabitLogStatus, notes: string | null = null) { const logs = getLocalHabitLogs(); const existing = logs.findIndex(log => log.habit_id === habitId && log.date === date); const item: LocalHabitLog = { id: existing >= 0 ? logs[existing].id : id(), habit_id: habitId, date, status, notes }; const next = existing >= 0 ? logs.map((log, index) => index === existing ? item : log) : [...logs, item]; write(keys.habitLogs, next); return next }

export function today() { return new Date().toLocaleDateString('en-CA') }
export function periodStart(period: GoalPeriod, date = today()) { const value = new Date(`${date}T12:00:00`); if (period === 'daily') return date; if (period === 'weekly') { const day = value.getDay() || 7; value.setDate(value.getDate() - day + 1) } else if (period === 'monthly') value.setDate(1); return value.toLocaleDateString('en-CA') }
export function goalProgress(goal: LocalGoal, logs = getLocalHabitLogs()) { if (goal.metric === 'custom') return goal.manual_progress; const from = goal.period_type === 'total' ? goal.start_date : periodStart(goal.period_type); const to = goal.period_type === 'total' ? goal.end_date : today(); const completed = logs.filter(log => log.status === 'completed' && log.date >= from && log.date <= to); if (goal.metric === 'habit_days') return new Set(completed.map(log => log.date)).size; if (goal.metric === 'workouts') { const workouts = new Set(getLocalHabits().filter(habit => habit.category === 'workout').map(habit => habit.id)); return completed.filter(log => workouts.has(log.habit_id)).length } if (goal.metric === 'pages_read') return getLocalReadingSessions().filter(session => session.started_at.slice(0, 10) >= from && session.started_at.slice(0, 10) <= to).reduce((total, session) => total + session.pages_read, 0); return 0 }
export function habitStreak(habitId: string, logs = getLocalHabitLogs(), date = today()) { const complete = new Set(logs.filter(log => log.habit_id === habitId && log.status === 'completed').map(log => log.date)); let cursor = date; if (!complete.has(cursor)) cursor = shiftDate(cursor, -1); let count = 0; while (complete.has(cursor)) { count++; cursor = shiftDate(cursor, -1) } return count }
export function overallStreak(logs = getLocalHabitLogs(), date = today()) { const activeDates = new Set(logs.filter(log => log.status === 'completed').map(log => log.date)); let cursor = activeDates.has(date) ? date : shiftDate(date, -1); let count = 0; while (activeDates.has(cursor)) { count++; cursor = shiftDate(cursor, -1) } return count }
function shiftDate(date: string, days: number) { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + days); return value.toLocaleDateString('en-CA') }
