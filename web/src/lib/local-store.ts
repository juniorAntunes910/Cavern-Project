import { deleteDatabaseValue, persistDatabaseValue } from './app-db'

export type GoalMetric = 'habit_days' | 'pages_read' | 'reading_minutes' | 'study_minutes' | 'workouts' | 'custom'
export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'total'
export type LocalGoal = { id: string; title: string; target_value: number; unit: string; metric: GoalMetric; period_type: GoalPeriod; status: 'active' | 'completed' | 'cancelled'; manual_progress: number; start_date: string; end_date: string }
export type HabitType = 'positive' | 'abstinence'
export type HabitCategory = 'workout' | 'study' | 'meditation' | 'reading' | 'custom'
export type HabitLogStatus = 'completed' | 'failed' | 'skipped'
export type LocalHabit = { id: string; name: string; description: string | null; type: HabitType; category: HabitCategory; target_days: number | null; started_at: string; active: boolean }
export type LocalHabitLog = { id: string; habit_id: string; date: string; status: HabitLogStatus; notes: string | null }
export type GoalHabitLink = { id: string; goal_id: string; habit_id: string }
export type LocalBook = { id: string; title: string; author: string | null; file_name: string; total_pages: number; current_page: number; status: 'want_to_read' | 'reading' | 'finished' | 'archived' }
export type LocalReadingSession = { id: string; book_id: string; start_page: number; max_page_reached: number; end_page: number; pages_read: number; started_at: string; ended_at: string | null; duration_seconds: number | null }
export type LocalCheckIn = { id: string; date: string; discipline: number; focus: number; energy: number; good_today: string; improve_tomorrow: string }
export type FinanceKind = 'income' | 'expense' | 'transfer' | 'buy_btc' | 'sell_btc' | 'contribution'
export type LocalFinanceTransaction = { id: string; date: string; kind: FinanceKind; amount_brl: number; category: string; account: string; note: string | null; btc_amount: number | null; btc_unit_price_brl: number | null; financial_goal_id?: string | null }
export type LocalFinancialGoal = { id: string; title: string; target_amount: number; currency: 'BRL' | 'BTC'; deadline: string | null; saved_amount: number; status: 'active' | 'completed' | 'cancelled' }

export const localDataKeys = { goals: 'cavern.local.goals.v2', habits: 'cavern.local.habits.v1', habitLogs: 'cavern.local.habit-logs.v1', goalHabitLinks: 'cavern.local.goal-habit-links.v1', books: 'cavern.local.books.v1', sessions: 'cavern.local.reading-sessions.v1', checkins: 'cavern.local.checkins.v1', financeTransactions: 'cavern.local.finance-transactions.v1', financialGoals: 'cavern.local.financial-goals.v1' } as const
const keys = localDataKeys
const read = <T>(key: string): T[] => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T[] : [] } catch { return [] } }
const write = <T>(key: string, value: T[]) => {
  localStorage.setItem(key, JSON.stringify(value))
  persistDatabaseValue(key, value)
  window.dispatchEvent(new Event('cavern:data-changed'))
}
const id = () => crypto.randomUUID()

export function getLocalGoals() { return read<LocalGoal & { cavern_id?: string | null }>(keys.goals).map(({ cavern_id: _cavernId, ...goal }) => ({ ...goal, metric: goal.metric ?? 'custom', manual_progress: goal.manual_progress ?? 0, start_date: goal.start_date ?? today(), end_date: goal.end_date ?? today() })) }
export function addLocalGoal(goal: Omit<LocalGoal, 'id' | 'status' | 'manual_progress'>) { const created = { ...goal, id: id(), status: 'active' as const, manual_progress: 0 }; const next = [created, ...getLocalGoals()]; write(keys.goals, next); getLocalHabits().filter(habit => habitMatchesGoal(habit, created)).forEach(habit => setHabitGoalLinks(habit.id, [...new Set([...getHabitGoalIds(habit.id), created.id])])); return next }
export function updateLocalGoal(id: string, changes: Partial<LocalGoal>) { const next = getLocalGoals().map(goal => goal.id === id ? { ...goal, ...changes } : goal); write(keys.goals, next); return next }
export function deleteLocalGoal(id: string) { const next = getLocalGoals().filter(goal => goal.id !== id); write(keys.goals, next); return next }

export function getLocalHabits() { return read<LocalHabit & { cavern_id?: string | null }>(keys.habits).map(({ cavern_id: _cavernId, ...habit }) => ({ ...habit, category: habit.category ?? 'custom' })) }
export function addLocalHabit(habit: Omit<LocalHabit, 'id' | 'active'>) { const created = { ...habit, id: id(), active: true }; const next = [created, ...getLocalHabits()]; write(keys.habits, next); getLocalGoals().filter(goal => habitMatchesGoal(created, goal)).forEach(goal => setHabitGoalLinks(created.id, [...new Set([...getHabitGoalIds(created.id), goal.id])])); return next }
export function updateLocalHabit(id: string, changes: Partial<LocalHabit>) { const next = getLocalHabits().map(habit => habit.id === id ? { ...habit, ...changes } : habit); write(keys.habits, next); return next }
export function deleteLocalHabit(id: string) { const next = getLocalHabits().filter(habit => habit.id !== id); write(keys.habits, next); write(keys.habitLogs, getLocalHabitLogs().filter(log => log.habit_id !== id)); return next }
export function getLocalHabitLogs() { return read<LocalHabitLog>(keys.habitLogs) }
export function getLocalBooks() { return read<LocalBook>(keys.books) }
export function addLocalBook(book: Omit<LocalBook, 'current_page' | 'status'> & { id?: string }) { const next = [{ ...book, id: book.id ?? id(), current_page: 1, status: 'want_to_read' as const }, ...getLocalBooks()]; write(keys.books, next); return next }
export function updateLocalBook(id: string, changes: Partial<LocalBook>) { const next = getLocalBooks().map(book => book.id === id ? { ...book, ...changes } : book); write(keys.books, next); return next }
export function deleteLocalBook(id: string) { const next = getLocalBooks().filter(book => book.id !== id); write(keys.books, next); return next }
export function getLocalReadingSessions() { return read<LocalReadingSession>(keys.sessions) }
export function getLocalCheckIns() { return read<LocalCheckIn>(keys.checkins) }
export function saveLocalCheckIn(checkin: Omit<LocalCheckIn, 'id'>) { const current = getLocalCheckIns(); const existing = current.findIndex(item => item.date === checkin.date); const item = { ...checkin, id: existing >= 0 ? current[existing].id : id() }; const next = existing >= 0 ? current.map((value,index) => index === existing ? item : value) : [item, ...current]; write(keys.checkins, next); return next }
export function startReadingSession(bookId: string, page: number) { const session: LocalReadingSession = { id: id(), book_id: bookId, start_page: page, max_page_reached: page, end_page: page, pages_read: 0, started_at: new Date().toISOString(), ended_at: null, duration_seconds: null }; const next = [...getLocalReadingSessions(), session]; write(keys.sessions, next); return session }
export function updateReadingSession(sessionId: string, page: number) { const next = getLocalReadingSessions().map(session => session.id === sessionId ? { ...session, end_page: page, max_page_reached: Math.max(session.max_page_reached, page), pages_read: Math.max(0, Math.max(session.max_page_reached, page) - session.start_page) } : session); write(keys.sessions, next); return next }
export function finishReadingSession(sessionId: string) { const next = getLocalReadingSessions().map(session => session.id === sessionId && !session.ended_at ? { ...session, ended_at: new Date().toISOString(), duration_seconds: Math.max(0, Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000)) } : session); write(keys.sessions, next); return next }
export function logHabit(habitId: string, date: string, status: HabitLogStatus, notes: string | null = null) { const logs = getLocalHabitLogs(); const existing = logs.findIndex(log => log.habit_id === habitId && log.date === date); const item: LocalHabitLog = { id: existing >= 0 ? logs[existing].id : id(), habit_id: habitId, date, status, notes }; const next = existing >= 0 ? logs.map((log, index) => index === existing ? item : log) : [...logs, item]; write(keys.habitLogs, next); return next }

export function getGoalHabitLinks() { return read<GoalHabitLink>(keys.goalHabitLinks).filter(link => getLocalGoals().some(goal => goal.id === link.goal_id) && getLocalHabits().some(habit => habit.id === link.habit_id)) }
export function getHabitGoalIds(habitId: string) { return getGoalHabitLinks().filter(link => link.habit_id === habitId).map(link => link.goal_id) }
export function getGoalHabitIds(goalId: string) { return getGoalHabitLinks().filter(link => link.goal_id === goalId).map(link => link.habit_id) }
export function setHabitGoalLinks(habitId: string, goalIds: string[]) { const selected = new Set(goalIds); const other = getGoalHabitLinks().filter(link => link.habit_id !== habitId); const next = [...other, ...[...selected].map(goalId => ({ id: id(), habit_id: habitId, goal_id: goalId }))]; write(keys.goalHabitLinks, next); return next }

export function getLocalFinanceTransactions() { return read<LocalFinanceTransaction>(keys.financeTransactions) }
export function addLocalFinanceTransaction(item: Omit<LocalFinanceTransaction, 'id'>) { const next = [{ ...item, id: id() }, ...getLocalFinanceTransactions()]; write(keys.financeTransactions, next); return next }
export function deleteLocalFinanceTransaction(transactionId: string) { const next = getLocalFinanceTransactions().filter(item => item.id !== transactionId); write(keys.financeTransactions, next); return next }
export function getLocalFinancialGoals() { return read<LocalFinancialGoal>(keys.financialGoals) }
export function addLocalFinancialGoal(item: Omit<LocalFinancialGoal, 'id' | 'status' | 'saved_amount'>) { const next = [{ ...item, id: id(), saved_amount: 0, status: 'active' as const }, ...getLocalFinancialGoals()]; write(keys.financialGoals, next); return next }
export function updateLocalFinancialGoal(goalId: string, changes: Partial<LocalFinancialGoal>) { const next = getLocalFinancialGoals().map(item => item.id === goalId ? { ...item, ...changes } : item); write(keys.financialGoals, next); return next }
export function deleteLocalFinancialGoal(goalId: string) { const next = getLocalFinancialGoals().filter(item => item.id !== goalId); write(keys.financialGoals, next); return next }

export async function removeCavernsData() {
  const legacyKey = 'cavern.local.caverns.v1'
  localStorage.removeItem(legacyKey)
  await deleteDatabaseValue(legacyKey).catch(() => undefined)
  const cleanGoals = getLocalGoals(); const cleanHabits = getLocalHabits()
  write(keys.goals, cleanGoals); write(keys.habits, cleanHabits)
}

export function today() { return new Date().toLocaleDateString('en-CA') }
export function periodStart(period: GoalPeriod, date = today()) { const value = new Date(`${date}T12:00:00`); if (period === 'daily') return date; if (period === 'weekly') { const day = value.getDay() || 7; value.setDate(value.getDate() - day + 1) } else if (period === 'monthly') value.setDate(1); return value.toLocaleDateString('en-CA') }
export function goalProgress(goal: LocalGoal, logs = getLocalHabitLogs()) { if (goal.metric === 'custom') return goal.manual_progress; const from = goal.period_type === 'total' ? goal.start_date : periodStart(goal.period_type); const to = goal.period_type === 'total' ? goal.end_date : today(); const linkedHabitIds = getGoalHabitIds(goal.id); const completed = logs.filter(log => log.status === 'completed' && log.date >= from && log.date <= to && (linkedHabitIds.length === 0 || linkedHabitIds.includes(log.habit_id))); if (goal.metric === 'habit_days') return new Set(completed.map(log => log.date)).size; if (goal.metric === 'workouts') { const workouts = new Set(getLocalHabits().filter(habit => habit.category === 'workout').map(habit => habit.id)); return completed.filter(log => workouts.has(log.habit_id)).length } if (goal.metric === 'pages_read') return getLocalReadingSessions().filter(session => session.started_at.slice(0, 10) >= from && session.started_at.slice(0, 10) <= to).reduce((total, session) => total + session.pages_read, 0); return 0 }
export function habitStreak(habitId: string, logs = getLocalHabitLogs(), date = today()) { const complete = new Set(logs.filter(log => log.habit_id === habitId && log.status === 'completed').map(log => log.date)); let cursor = date; if (!complete.has(cursor)) cursor = shiftDate(cursor, -1); let count = 0; while (complete.has(cursor)) { count++; cursor = shiftDate(cursor, -1) } return count }
export function overallStreak(logs = getLocalHabitLogs(), date = today()) { const activeDates = new Set(logs.filter(log => log.status === 'completed').map(log => log.date)); let cursor = activeDates.has(date) ? date : shiftDate(date, -1); let count = 0; while (activeDates.has(cursor)) { count++; cursor = shiftDate(cursor, -1) } return count }
function shiftDate(date: string, days: number) { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + days); return value.toLocaleDateString('en-CA') }
function habitMatchesGoal(habit: LocalHabit, goal: LocalGoal) { return goal.status === 'active' && (goal.metric === 'habit_days' || (goal.metric === 'workouts' && habit.category === 'workout')) }
