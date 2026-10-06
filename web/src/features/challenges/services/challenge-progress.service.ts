import { getChallengeRuleLogs } from './challenge.repository'
import { getLocalCheckIns, getLocalFinanceTransactions, getLocalFocusSessions, getLocalHabitLogs, getLocalReadingSessions, localDay, memoizeByRevision, today } from '../../../lib/local-store'
import { getWorkoutSessions } from '../../gym/services/gym.service'
import type { Challenge, ChallengeProgress, ChallengeRule, ChallengeScoreCalculator, RuleProgress } from '../domain/challenge'

export const MINIMUM_CHALLENGE_SCORE = 70

export function calculateChallengeProgress(challenge: Challenge, date = today()): ChallengeProgress {
  const currentDay = Math.max(0, Math.min(challenge.durationDays, daysBetween(challenge.startDate, date) + 1))
  const datedRules = challenge.rules.filter(rule => rule.frequency === 'DAILY').map(rule => ruleProgress(challenge, rule, date, date))
  const weekStart = monday(date); const weeklyRules = challenge.rules.filter(rule => rule.frequency === 'WEEKLY').map(rule => ruleProgress(challenge, rule, weekStart, date))
  const end = date <= challenge.endDate ? date : challenge.endDate
  const totalRules = challenge.rules.filter(rule => rule.frequency === 'TOTAL').map(rule => ruleProgress(challenge, rule, challenge.startDate, end))
  const dailyRules = challenge.rules.filter(rule => rule.frequency === 'DAILY')
  const completedDays = dailyRules.length ? datesBetween(challenge.startDate, end).filter(day => dailyRules.every(rule => ruleProgress(challenge, rule, day, day).completed)) : []
  const cycleDays = datesBetween(challenge.startDate, challenge.endDate)
  const elapsedDays = cycleDays.filter(day => day <= date)
  const weeks = [...new Set(cycleDays.map(monday))]
  const ratios = challenge.rules.map(rule => {
    if (rule.frequency === 'DAILY') return elapsedDays.reduce((sum, day) => sum + Math.min(1, valueFor(challenge, rule, day, day) / rule.target), 0) / cycleDays.length
    if (rule.frequency === 'WEEKLY') return weeks.filter(week => week <= date).reduce((sum, week) => sum + Math.min(1, valueFor(challenge, rule, week, shift(week, 6) < end ? shift(week, 6) : end) / rule.target), 0) / weeks.length
    return Math.min(1, valueFor(challenge, rule, challenge.startDate, end) / rule.target) * elapsedDays.length / cycleDays.length
  })
  const overall = ratios.length ? Math.round(ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length * 100) : 0
  return { overall, currentDay, daysRemaining: Math.max(0, daysBetween(date, challenge.endDate)), today: datedRules, weekly: weeklyRules, total: totalRules, perfectDays: completedDays.length, perfectDayRate: currentDay ? Math.round(completedDays.length / currentDay * 100) : 0, streak: trailingPerfectDays(challenge, date) }
}

export const defaultChallengeScoreCalculator: ChallengeScoreCalculator = { calculate: (_challenge, progress) => progress.overall }
export function canCompleteChallenge(challenge: Challenge, progress = calculateChallengeProgress(challenge)) { return progress.daysRemaining === 0 && defaultChallengeScoreCalculator.calculate(challenge, progress) >= MINIMUM_CHALLENGE_SCORE }
function ruleProgress(challenge: Challenge, rule: ChallengeRule, from: string, to: string): RuleProgress { const current = valueFor(challenge, rule, from, to); return { rule, target: rule.target, current, completed: current >= rule.target } }
// A rule's value is a sum over a date range of one collection. Scanning the collection for every (rule, day) pair made one
// calculation O(days × rules × records), and it ran for every Caverna on every data change. Instead each collection is
// grouped by day once per data revision and a range is answered with a binary search.
type Series = { dates: string[]; values: number[] }
function toSeries(entries: (readonly [string | null | undefined, number])[]): Series {
  const perDay = new Map<string, number>()
  for (const [day, value] of entries) if (day) perDay.set(day, (perDay.get(day) ?? 0) + value)
  const dates = [...perDay.keys()].sort()
  return { dates, values: dates.map(day => perDay.get(day)!) }
}
function bucket<T>(items: T[], dayOf: (item: T) => string | null | undefined, valueOf: (item: T) => number = () => 1) { return toSeries(items.map(item => [dayOf(item), valueOf(item)] as const)) }
function bucketBy<T>(items: T[], groupOf: (item: T) => string | null | undefined, dayOf: (item: T) => string | null | undefined, valueOf: (item: T) => number = () => 1) {
  const groups = new Map<string, T[]>()
  for (const item of items) { const group = groupOf(item); if (!group) continue; const members = groups.get(group); if (members) members.push(item); else groups.set(group, [item]) }
  return new Map([...groups].map(([group, members]) => [group, bucket(members, dayOf, valueOf)] as const))
}
function sumSeries(series: Series | undefined, from: string, to: string) {
  if (!series) return 0
  const { dates, values } = series
  let low = 0; let high = dates.length
  while (low < high) { const middle = (low + high) >> 1; if (dates[middle] < from) low = middle + 1; else high = middle }
  let total = 0
  for (let index = low; index < dates.length && dates[index] <= to; index++) total += values[index]
  return total
}
const ruleLogKey = (challengeId: string, ruleId: string) => `${challengeId}\n${ruleId}`
// Sessions are bucketed by the local calendar day of their timestamps, the same rule goalProgress uses.
const challengeData = memoizeByRevision(() => {
  const habitLogs = getLocalHabitLogs().filter(log => log.status === 'completed')
  const reading = getLocalReadingSessions()
  const finance = getLocalFinanceTransactions()
  return {
    habits: bucket(habitLogs, log => log.date),
    habitsById: bucketBy(habitLogs, log => log.habit_id, log => log.date),
    pages: bucket(reading, session => localDay(session.started_at), session => session.pages_read),
    readingSeconds: bucket(reading, session => localDay(session.started_at), session => session.duration_seconds ?? 0),
    focusSeconds: bucket(getLocalFocusSessions().filter(session => session.status === 'completed' && session.ended_at), session => localDay(session.ended_at), session => session.duration_seconds),
    workouts: bucket(getWorkoutSessions().filter(session => session.status === 'COMPLETED'), session => localDay(session.startedAt)),
    checkins: bucket(getLocalCheckIns(), checkin => checkin.date),
    finance: bucket(finance, item => item.date),
    financeByGoal: bucketBy(finance, item => item.financial_goal_id, item => item.date),
    ruleLogs: bucketBy(getChallengeRuleLogs(), log => ruleLogKey(log.challengeId, log.ruleId), log => log.date, log => log.value),
  }
})
function valueFor(challenge: Challenge, rule: ChallengeRule, from: string, to: string) {
  const data = challengeData()
  // Workouts are counted over the requested range even when it extends past the cycle; every other rule is clamped to the cycle dates.
  if (rule.type === 'WORKOUT') return sumSeries(data.workouts, from, to)
  const start = from > challenge.startDate ? from : challenge.startDate
  const end = to < challenge.endDate ? to : challenge.endDate
  if (rule.type === 'HABIT') return sumSeries(rule.linkedEntityId ? data.habitsById.get(rule.linkedEntityId) : data.habits, start, end)
  if (rule.type === 'READING_PAGES') return sumSeries(data.pages, start, end)
  if (rule.type === 'READING_MINUTES') return Math.floor(sumSeries(data.readingSeconds, start, end) / 60)
  if (rule.type === 'FOCUS_MINUTES') return Math.floor(sumSeries(data.focusSeconds, start, end) / 60)
  if (rule.type === 'CHECK_IN') return sumSeries(data.checkins, start, end)
  if (rule.type === 'FINANCIAL') return sumSeries(rule.linkedEntityId ? data.financeByGoal.get(rule.linkedEntityId) : data.finance, start, end)
  return sumSeries(data.ruleLogs.get(ruleLogKey(challenge.id, rule.id)), start, end)
}
function trailingPerfectDays(challenge: Challenge, date: string) { const rules = challenge.rules.filter(rule => rule.frequency === 'DAILY'); if (!rules.length) return 0; let count = 0; let cursor = date; while (cursor >= challenge.startDate && rules.every(rule => ruleProgress(challenge, rule, cursor, cursor).completed)) { count++; cursor = shift(cursor, -1) } return count }
function monday(date: string) { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() - ((value.getDay() || 7) - 1)); return value.toLocaleDateString('en-CA') }
function datesBetween(from: string, to: string) { const result: string[] = []; for (let cursor = from; cursor <= to; cursor = shift(cursor, 1)) result.push(cursor); return result }
function daysBetween(from: string, to: string) { return Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000) }
function shift(date: string, amount: number) { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + amount); return value.toLocaleDateString('en-CA') }
