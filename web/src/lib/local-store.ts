import { deleteDatabaseValue, persistDatabaseValue, readDatabaseValue, setDatabaseValue } from './app-db'
import { REWARDS, type RewardType } from '../features/gamification/rewards/reward-config'
import { createId } from './id'

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
export type LocalWorkout = { id: string; date: string; title: string; focus: string; duration_minutes: number; notes: string | null }
export type FinanceKind = 'income' | 'expense' | 'transfer' | 'buy_btc' | 'sell_btc' | 'contribution'
export type LocalFinanceTransaction = { id: string; date: string; kind: FinanceKind; amount_brl: number; category: string; account: string; note: string | null; btc_amount: number | null; btc_unit_price_brl: number | null; financial_goal_id?: string | null }
export type LocalFinancialGoal = { id: string; title: string; target_amount: number; currency: 'BRL' | 'BTC'; deadline: string | null; saved_amount: number; status: 'active' | 'completed' | 'cancelled' }
export type LocalFocusSession = { id: string; started_at: string; resumed_at?: string | null; ended_at: string | null; duration_seconds: number; accumulated_seconds: number; status: 'active' | 'paused' | 'completed' | 'cancelled'; goal_id?: string | null; challenge_id?: string | null; habit_id?: string | null; project_name?: string | null }
export type LocalXpEntry = { id: string; source_key: string; points: number; title: string; created_at: string }
export type LocalTimelineEvent = { id: string; type: string; title: string; description: string | null; created_at: string; metadata?: Record<string, string | number> }
export type LocalAchievement = { id: string; unlocked_at: string }
export type LocalRewardTransaction = { id: string; source_type: string; source_id: string; xp: number; embers: number; title: string; created_at: string }
export type LocalInventoryItem = { item_id: string; acquired_at: string; acquisition_type: 'PURCHASE' | 'ACHIEVEMENT' | 'CHALLENGE' | 'SPECIAL' }
export type LocalCustomization = { fire_skin_id: string; mascot_id: string; head_item_id?: string; body_item_id?: string; accessory_item_id?: string; effect_item_id?: string }
export type LocalProfile = { name: string; bio: string; focus: 'discipline' | 'reading' | 'fitness' | 'finance' | 'custom'; reminderTime: string; activeDays: number[]; weekStartsOn: 'monday' | 'sunday'; motion: 'full' | 'reduced' }
export const MINIMUM_FOCUS_SECONDS = 5 * 60
/** A running stretch longer than this is treated as forgotten: the timer stops counting there so an open tab left overnight does not become hours of focus. */
export const MAXIMUM_FOCUS_STRETCH_SECONDS = 4 * 60 * 60

export const localDataKeys = { goals: 'cavern.local.goals.v2', habits: 'cavern.local.habits.v1', habitLogs: 'cavern.local.habit-logs.v1', goalHabitLinks: 'cavern.local.goal-habit-links.v1', books: 'cavern.local.books.v1', sessions: 'cavern.local.reading-sessions.v1', checkins: 'cavern.local.checkins.v1', workouts: 'cavern.local.workouts.v1', financeTransactions: 'cavern.local.finance-transactions.v1', financialGoals: 'cavern.local.financial-goals.v1', challenges: 'cavern.local.challenges.v1', challengeRuleLogs: 'cavern.local.challenge-rule-logs.v1', focusSessions: 'cavern.local.focus-sessions.v1', xpLedger: 'cavern.local.xp-ledger.v1', rewards: 'cavern.local.reward-transactions.v1', inventory: 'cavern.local.inventory.v1', customization: 'cavern.local.customization.v1', timeline: 'cavern.local.timeline.v1', achievements: 'cavern.local.achievements.v1', profile: 'cavern.local.profile.v1' } as const
const keys = localDataKeys
// Screens re-read their collections on every render and on every 'cavern:data-changed', so parsing the stored JSON on
// each read made the cost of one action grow with the whole history. The parsed array is cached and revalidated
// against the raw string on every read (getItem returns the same string instance until the value changes), so writes
// from anywhere else (another tab, a backup restore, devtools) are still picked up on the next read.
const parsedCollections = new Map<string, { raw: string; items: unknown[] }>()
/** The returned array is a fresh copy, but its elements are shared between calls: treat them as immutable. */
export function readCollection<T>(key: string): T[] {
  let raw: string | null
  try { raw = localStorage.getItem(key) } catch { return [] }
  if (!raw) return []
  const cached = parsedCollections.get(key)
  if (cached?.raw === raw) { cached.raw = raw; return cached.items.slice() as T[] } // keep the latest instance so the next check is by identity
  let items: unknown[]
  try { const parsed: unknown = JSON.parse(raw); items = Array.isArray(parsed) ? parsed : [] } catch { items = [] }
  parsedCollections.set(key, { raw, items })
  return items.slice() as T[]
}
export function writeCollection<T>(key: string, value: T[]) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch (error) {
    // Cota cheia (ou armazenamento bloqueado): avisar a interface em vez de falhar em silêncio, e não fingir que salvou.
    window.dispatchEvent(new Event('cavern:storage-error'))
    throw error
  }
  persistDatabaseValue(key, value)
  window.dispatchEvent(new Event('cavern:data-changed'))
}
const read = readCollection
const write = writeCollection

// Derived values (progress, achievements) are expensive to rebuild, so they are memoized until the next data change.
let dataRevision = 0
window.addEventListener('cavern:data-changed', () => { dataRevision++ })
// Another tab wrote to localStorage: refresh this tab's screens and derived values so a later save starts from the latest data instead of overwriting it.
window.addEventListener('storage', event => { if (event.key === null || event.key.startsWith('cavern.')) window.dispatchEvent(new Event('cavern:data-changed')) })
/** Memoizes `compute` until the next 'cavern:data-changed' and, with `daily`, until the calendar day rolls over. */
export function memoizeByRevision<T>(compute: () => T, { daily = false } = {}): () => T {
  let cached: { revision: number; day: string; value: T } | undefined
  return () => {
    const day = daily ? today() : ''
    if (cached?.revision !== dataRevision || cached.day !== day) cached = { revision: dataRevision, day, value: compute() }
    return cached.value
  }
}
const id = createId

const defaultProfile: LocalProfile = { name: '', bio: '', focus: 'discipline', reminderTime: '20:00', activeDays: [1, 2, 3, 4, 5, 6, 0], weekStartsOn: 'monday', motion: 'full' }
const avatarKey = 'cavern.profile.avatar.v1'
export function getLocalProfile(): LocalProfile { try { return { ...defaultProfile, ...JSON.parse(localStorage.getItem(keys.profile) ?? '{}') } } catch { return defaultProfile } }
export function saveLocalProfile(changes: Partial<LocalProfile>) { const next = { ...getLocalProfile(), ...changes }; localStorage.setItem(keys.profile, JSON.stringify(next)); persistDatabaseValue(keys.profile, next); document.documentElement.dataset.motion = next.motion; window.dispatchEvent(new Event('cavern:data-changed')); return next }
export async function getProfileAvatar() { return readDatabaseValue<string>(avatarKey) }
export async function saveProfileAvatar(avatar: string | null) { if (avatar) await setDatabaseValue(avatarKey, avatar); else await deleteDatabaseValue(avatarKey); window.dispatchEvent(new Event('cavern:data-changed')) }

export function getLocalGoals() { return read<LocalGoal & { cavern_id?: string | null }>(keys.goals).map(({ cavern_id: _cavernId, ...goal }) => ({ ...goal, metric: goal.metric ?? 'custom', manual_progress: goal.manual_progress ?? 0, start_date: goal.start_date ?? today(), end_date: goal.end_date ?? today() })) }
export function addLocalGoal(goal: Omit<LocalGoal, 'id' | 'status' | 'manual_progress'>) { const created = { ...goal, id: id(), status: 'active' as const, manual_progress: 0 }; const next = [created, ...getLocalGoals()]; write(keys.goals, next); getLocalHabits().filter(habit => habitMatchesGoal(habit, created)).forEach(habit => setHabitGoalLinks(habit.id, [...new Set([...getHabitGoalIds(habit.id), created.id])])); return next }
export function updateLocalGoal(id: string, changes: Partial<LocalGoal>) { const previous = getLocalGoals().find(goal => goal.id === id); const next = getLocalGoals().map(goal => goal.id === id ? { ...goal, ...changes } : goal); write(keys.goals, next); if (changes.status === 'completed' && previous?.status !== 'completed') { grantConfiguredReward('GOAL_COMPLETED', 'goal', id, 'Meta concluída'); addLocalTimelineEvent({ type: 'goal_completed', title: `Meta concluída: ${previous?.title ?? 'Meta'}`, description: null }) } return next }
export function deleteLocalGoal(id: string) { const next = getLocalGoals().filter(goal => goal.id !== id); write(keys.goals, next); write(keys.goalHabitLinks, getGoalHabitLinks().filter(link => link.goal_id !== id)); revokeSourceRewards('goal', sourceId => sourceId === id); return next }

export function getLocalHabits() { return read<LocalHabit & { cavern_id?: string | null }>(keys.habits).map(({ cavern_id: _cavernId, ...habit }) => ({ ...habit, category: habit.category ?? 'custom' })) }
export function addLocalHabit(habit: Omit<LocalHabit, 'id' | 'active'>) { const created = { ...habit, id: id(), active: true }; const next = [created, ...getLocalHabits()]; write(keys.habits, next); getLocalGoals().filter(goal => habitMatchesGoal(created, goal)).forEach(goal => setHabitGoalLinks(created.id, [...new Set([...getHabitGoalIds(created.id), goal.id])])); return next }
export function updateLocalHabit(id: string, changes: Partial<LocalHabit>) { const next = getLocalHabits().map(habit => habit.id === id ? { ...habit, ...changes } : habit); write(keys.habits, next); return next }
export function deleteLocalHabit(id: string) { const next = getLocalHabits().filter(habit => habit.id !== id); write(keys.habits, next); write(keys.habitLogs, getLocalHabitLogs().filter(log => log.habit_id !== id)); write(keys.goalHabitLinks, getGoalHabitLinks().filter(link => link.habit_id !== id)); revokeSourceRewards('habit', sourceId => sourceId.startsWith(`${id}:`)); return next }
export function getLocalHabitLogs() { return read<LocalHabitLog>(keys.habitLogs) }
export function getLocalBooks() { return read<LocalBook>(keys.books) }
export function addLocalBook(book: Omit<LocalBook, 'current_page' | 'status'> & { id?: string }) { const next = [{ ...book, id: book.id ?? id(), current_page: 1, status: 'want_to_read' as const }, ...getLocalBooks()]; write(keys.books, next); return next }
export function updateLocalBook(id: string, changes: Partial<LocalBook>) { const previous = getLocalBooks().find(book => book.id === id); const next = getLocalBooks().map(book => book.id === id ? { ...book, ...changes } : book); write(keys.books, next); if (changes.status === 'finished' && previous?.status !== 'finished') addLocalTimelineEvent({ type: 'book_finished', title: `Livro concluído: ${previous?.title ?? 'Livro'}`, description: null }); return next }
export function deleteLocalBook(id: string) { const next = getLocalBooks().filter(book => book.id !== id); write(keys.books, next); write(keys.sessions, getLocalReadingSessions().filter(session => session.book_id !== id)); return next }
export function getLocalReadingSessions() { return read<LocalReadingSession>(keys.sessions) }
export function getLocalCheckIns() { return read<LocalCheckIn>(keys.checkins) }
export function saveLocalCheckIn(checkin: Omit<LocalCheckIn, 'id'>) { const current = getLocalCheckIns(); const existing = current.findIndex(item => item.date === checkin.date); const item = { ...checkin, id: existing >= 0 ? current[existing].id : id() }; const next = existing >= 0 ? current.map((value,index) => index === existing ? item : value) : [item, ...current]; write(keys.checkins, next); if (existing < 0) grantConfiguredReward('CHECK_IN_COMPLETED', 'checkin', checkin.date, 'Check-in concluído'); return next }
export function getLocalWorkouts() { return read<LocalWorkout>(keys.workouts).sort((a, b) => b.date.localeCompare(a.date)) }
export function addLocalWorkout(workout: Omit<LocalWorkout, 'id'>) { const created = { ...workout, id: id() }; const next = [created, ...getLocalWorkouts()]; write(keys.workouts, next); grantConfiguredReward('WORKOUT_COMPLETED', 'workout', created.id, 'Treino registrado'); addLocalTimelineEvent({ type: 'workout', title: 'Treino registrado', description: created.title }); return next }
export function deleteLocalWorkout(workoutId: string) { const next = getLocalWorkouts().filter(workout => workout.id !== workoutId); write(keys.workouts, next); revokeSourceRewards('workout', sourceId => sourceId === workoutId); return next }
export function startReadingSession(bookId: string, page: number) { const session: LocalReadingSession = { id: id(), book_id: bookId, start_page: page, max_page_reached: page, end_page: page, pages_read: 0, started_at: new Date().toISOString(), ended_at: null, duration_seconds: null }; const next = [...getLocalReadingSessions(), session]; write(keys.sessions, next); return session }
export function updateReadingSession(sessionId: string, page: number) { const next = getLocalReadingSessions().map(session => session.id === sessionId ? { ...session, end_page: page, max_page_reached: Math.max(session.max_page_reached, page), pages_read: Math.max(0, Math.max(session.max_page_reached, page) - session.start_page) } : session); write(keys.sessions, next); return next }
export function finishReadingSession(sessionId: string) { const next = getLocalReadingSessions().map(session => session.id === sessionId && !session.ended_at ? { ...session, ended_at: new Date().toISOString(), duration_seconds: Math.max(0, Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000)) } : session); write(keys.sessions, next); return next }
export function logHabit(habitId: string, date: string, status: HabitLogStatus, notes: string | null = null) { const logs = getLocalHabitLogs(); const existing = logs.findIndex(log => log.habit_id === habitId && log.date === date); const item: LocalHabitLog = { id: existing >= 0 ? logs[existing].id : id(), habit_id: habitId, date, status, notes }; const next = existing >= 0 ? logs.map((log, index) => index === existing ? item : log) : [...logs, item]; write(keys.habitLogs, next); if (existing >= 0 && logs[existing].status === 'completed' && status !== 'completed') write(keys.rewards, getLocalRewardTransactions().filter(reward => reward.source_type !== 'habit' || reward.source_id !== `${habitId}:${date}`)); if (status === 'completed') grantConfiguredReward('HABIT_COMPLETED', 'habit', `${habitId}:${date}`, 'Hábito concluído'); return next }
export function clearHabitLog(habitId: string, date: string) { const current = getLocalHabitLogs(); const completed = current.some(log => log.habit_id === habitId && log.date === date && log.status === 'completed'); const next = current.filter(log => log.habit_id !== habitId || log.date !== date); write(keys.habitLogs, next); if (completed) write(keys.rewards, getLocalRewardTransactions().filter(item => item.source_type !== 'habit' || item.source_id !== `${habitId}:${date}`)); return next }

export function getLocalFocusSessions() { return read<LocalFocusSession>(keys.focusSessions).sort((a, b) => b.started_at.localeCompare(a.started_at)) }
export function addLocalFocusSession(session: Omit<LocalFocusSession, 'id' | 'status' | 'ended_at' | 'duration_seconds' | 'accumulated_seconds'>) { const created: LocalFocusSession = { ...session, id: id(), status: 'active', ended_at: null, duration_seconds: 0, accumulated_seconds: 0 }; const next = [created, ...getLocalFocusSessions()]; write(keys.focusSessions, next); return created }
export function updateLocalFocusSession(sessionId: string, changes: Partial<LocalFocusSession>) { const next = getLocalFocusSessions().map(session => session.id === sessionId ? { ...session, ...changes } : session); write(keys.focusSessions, next); return next }
/** Seconds since the session last started/resumed (0 unless active), capped at MAXIMUM_FOCUS_STRETCH_SECONDS. */
export function focusStretchSeconds(session: Pick<LocalFocusSession, 'status' | 'resumed_at' | 'started_at'>, now = Date.now()) { if (session.status !== 'active') return 0; return Math.min(MAXIMUM_FOCUS_STRETCH_SECONDS, Math.max(0, Math.round((now - new Date(session.resumed_at ?? session.started_at).getTime()) / 1000))) }
export function finishLocalFocusSession(sessionId: string) { const current = getLocalFocusSessions().find(session => session.id === sessionId); if (!current) return undefined; const elapsed = focusStretchSeconds(current); const total = current.accumulated_seconds + elapsed; const valid = total >= MINIMUM_FOCUS_SECONDS; updateLocalFocusSession(sessionId, { status: valid ? 'completed' : 'cancelled', resumed_at: null, ended_at: new Date().toISOString(), duration_seconds: total, accumulated_seconds: total }); if (!valid) return { total, valid }; if (total >= 1800) grantConfiguredReward('FOCUS_30_MINUTES', 'focus', sessionId, 'Foco concluído'); addLocalTimelineEvent({ type: 'focus', title: 'Foco concluído', description: `${Math.floor(total / 60)} minutos de foco` }); return { total, valid } }

export function getLocalXpEntries() { return read<LocalXpEntry>(keys.xpLedger) }
export function awardLocalXp(sourceKey: string, points: number, title: string) { if (points <= 0 || getLocalXpEntries().some(entry => entry.source_key === sourceKey)) return false; write(keys.xpLedger, [{ id: id(), source_key: sourceKey, points, title, created_at: new Date().toISOString() }, ...getLocalXpEntries()]); return true }
export function getLocalRewardTransactions() { return read<LocalRewardTransaction>(keys.rewards) }
export function revokeSourceRewards(sourceType: string, matchesId: (sourceId: string) => boolean) { const current = getLocalRewardTransactions(); const next = current.filter(item => item.source_type !== sourceType || !matchesId(item.source_id)); if (next.length !== current.length) write(keys.rewards, next); return next }
export function grantLocalReward(sourceType: string, sourceId: string, xp: number, embers: number, title: string) { if (getLocalRewardTransactions().some(item => item.source_type === sourceType && item.source_id === sourceId)) return false; const transaction: LocalRewardTransaction = { id: id(), source_type: sourceType, source_id: sourceId, xp, embers, title, created_at: new Date().toISOString() }; write(keys.rewards, [transaction, ...getLocalRewardTransactions()]); return true }
export function grantConfiguredReward(type: RewardType, sourceType: string, sourceId: string, title: string) { const reward = REWARDS[type]; return grantLocalReward(sourceType, sourceId, reward.xp, reward.embers, title) }
export function getLocalInventory() { return read<LocalInventoryItem>(keys.inventory) }
export function addLocalInventoryItem(itemId: string, acquisitionType: LocalInventoryItem['acquisition_type']) { if (getLocalInventory().some(item => item.item_id === itemId)) return false; write(keys.inventory, [{ item_id: itemId, acquired_at: new Date().toISOString(), acquisition_type: acquisitionType }, ...getLocalInventory()]); return true }
export function getLocalCustomization(): LocalCustomization { try { const value = localStorage.getItem(keys.customization); return value ? { fire_skin_id: 'fire-classic', mascot_id: 'bot-mk1', ...JSON.parse(value) as Partial<LocalCustomization> } : { fire_skin_id: 'fire-classic', mascot_id: 'bot-mk1' } } catch { return { fire_skin_id: 'fire-classic', mascot_id: 'bot-mk1' } } }
export function saveLocalCustomization(changes: Partial<LocalCustomization>) { const next = { ...getLocalCustomization(), ...changes }; localStorage.setItem(keys.customization, JSON.stringify(next)); persistDatabaseValue(keys.customization, next); window.dispatchEvent(new Event('cavern:data-changed')); return next }
export function getLocalTimelineEvents() { return read<LocalTimelineEvent>(keys.timeline).sort((a, b) => b.created_at.localeCompare(a.created_at)) }
export function addLocalTimelineEvent(event: Omit<LocalTimelineEvent, 'id' | 'created_at'>) { const created: LocalTimelineEvent = { ...event, id: id(), created_at: new Date().toISOString() }; write(keys.timeline, [created, ...getLocalTimelineEvents()]); return created }
export function getLocalAchievements() { return read<LocalAchievement>(keys.achievements) }
export function unlockLocalAchievement(achievementId: string) { if (getLocalAchievements().some(item => item.id === achievementId)) return false; write(keys.achievements, [{ id: achievementId, unlocked_at: new Date().toISOString() }, ...getLocalAchievements()]); return true }

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
  if (localStorage.getItem(legacyKey) === null && !localStorage.getItem(keys.goals)?.includes('"cavern_id"') && !localStorage.getItem(keys.habits)?.includes('"cavern_id"')) return
  localStorage.removeItem(legacyKey)
  await deleteDatabaseValue(legacyKey).catch(() => undefined)
  const cleanGoals = getLocalGoals(); const cleanHabits = getLocalHabits()
  write(keys.goals, cleanGoals); write(keys.habits, cleanHabits)
}

export function today() { return new Date().toLocaleDateString('en-CA') }
/** Calendar day (local time zone, YYYY-MM-DD) of an ISO timestamp. Use it everywhere a timestamp is bucketed by day so goals and challenges agree. */
export function localDay(iso: string | null | undefined) { if (!iso) return null; const date = new Date(iso); return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-CA') }
export function periodStart(period: GoalPeriod, date = today()) { const value = new Date(`${date}T12:00:00`); if (period === 'daily') return date; if (period === 'weekly') { const day = value.getDay() || 7; value.setDate(value.getDate() - day + 1) } else if (period === 'monthly') value.setDate(1); return value.toLocaleDateString('en-CA') }
export function goalProgress(goal: LocalGoal, logs = getLocalHabitLogs()) {
  if (goal.metric === 'custom') return goal.manual_progress
  const reference = today() < goal.end_date ? today() : goal.end_date
  if (reference < goal.start_date) return 0
  const from = goal.period_type === 'total' ? goal.start_date : [goal.start_date, periodStart(goal.period_type, reference)].sort().at(-1)!
  const to = reference
  const linkedHabitIds = getGoalHabitIds(goal.id)
  const completed = logs.filter(log => log.status === 'completed' && log.date >= from && log.date <= to && linkedHabitIds.includes(log.habit_id))
  if (goal.metric === 'habit_days') return new Set(completed.map(log => log.date)).size
  if (goal.metric === 'workouts') {
    const workoutDates = new Set([
      ...getLocalWorkouts().filter(workout => workout.date >= from && workout.date <= to).map(workout => workout.date),
      ...read<{ status: string; startedAt: string }>('cavern.gym.sessions.v1').filter(session => session.status === 'COMPLETED').map(session => new Date(session.startedAt).toLocaleDateString('en-CA')).filter(date => date >= from && date <= to),
      ...read<{ status: string; date: string }>('cavern.gym.attendance.v1').filter(entry => entry.status === 'WENT' && entry.date >= from && entry.date <= to).map(entry => entry.date),
    ])
    const workoutHabitIds = new Set(getLocalHabits().filter(habit => habit.category === 'workout').map(habit => habit.id))
    const habitDates = new Set(completed.filter(log => workoutHabitIds.has(log.habit_id)).map(log => log.date))
    return workoutDates.size + [...habitDates].filter(date => !workoutDates.has(date)).length
  }
  if (goal.metric === 'pages_read' || goal.metric === 'reading_minutes') {
    const sessions = getLocalReadingSessions().filter(session => {
      const date = new Date(session.started_at).toLocaleDateString('en-CA')
      return session.ended_at && date >= from && date <= to
    })
    return goal.metric === 'pages_read'
      ? sessions.reduce((total, session) => total + session.pages_read, 0)
      : Math.floor(sessions.reduce((total, session) => total + (session.duration_seconds ?? 0), 0) / 60)
  }
  if (goal.metric === 'study_minutes') {
    const seconds = getLocalFocusSessions().filter(session => {
      const date = new Date(session.started_at).toLocaleDateString('en-CA')
      return session.status === 'completed' && date >= from && date <= to && (session.goal_id === goal.id || (session.habit_id && linkedHabitIds.includes(session.habit_id)))
    }).reduce((total, session) => total + session.duration_seconds, 0)
    return Math.floor(seconds / 60)
  }
  return 0
}
// A skipped day ("Pular dia") is neutral: it neither counts nor breaks the run.
export function habitStreak(habitId: string, logs = getLocalHabitLogs(), date = today()) { const own = logs.filter(log => log.habit_id === habitId); return runLength(new Set(own.filter(log => log.status === 'completed').map(log => log.date)), new Set(own.filter(log => log.status === 'skipped').map(log => log.date)), date) }
export function overallStreak(logs = getLocalHabitLogs(), date = today()) { return runLength(new Set(logs.filter(log => log.status === 'completed').map(log => log.date)), new Set(logs.filter(log => log.status === 'skipped').map(log => log.date)), date) }
function runLength(complete: Set<string>, skipped: Set<string>, date: string) { let cursor = complete.has(date) || skipped.has(date) ? date : shiftDate(date, -1); let count = 0; while (complete.has(cursor) || skipped.has(cursor)) { if (complete.has(cursor)) count++; cursor = shiftDate(cursor, -1) } return count }
function shiftDate(date: string, days: number) { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + days); return value.toLocaleDateString('en-CA') }
function habitMatchesGoal(habit: LocalHabit, goal: LocalGoal) { return goal.status === 'active' && (goal.metric === 'habit_days' || (goal.metric === 'workouts' && habit.category === 'workout')) }
