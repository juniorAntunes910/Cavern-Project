import { getChallengeRuleLogs } from './challenge.repository'
import { getLocalCheckIns, getLocalFinanceTransactions, getLocalFocusSessions, getLocalHabitLogs, getLocalReadingSessions, getLocalWorkouts, today } from '../../../lib/local-store'
import type { Challenge, ChallengeProgress, ChallengeRule, ChallengeScoreCalculator, RuleProgress } from '../domain/challenge'

export function calculateChallengeProgress(challenge: Challenge, date = today()): ChallengeProgress {
  const currentDay = Math.max(0, Math.min(challenge.durationDays, daysBetween(challenge.startDate, date) + 1))
  const datedRules = challenge.rules.filter(rule => rule.frequency === 'DAILY').map(rule => ruleProgress(challenge, rule, date, date))
  const weekStart = monday(date); const weeklyRules = challenge.rules.filter(rule => rule.frequency === 'WEEKLY').map(rule => ruleProgress(challenge, rule, weekStart, date))
  const end = date <= challenge.endDate ? date : challenge.endDate
  const totalRules = challenge.rules.filter(rule => rule.frequency === 'TOTAL').map(rule => ruleProgress(challenge, rule, challenge.startDate, end))
  const all = [...datedRules, ...weeklyRules, ...totalRules]
  const overall = all.length ? Math.round(all.reduce((sum, item) => sum + Math.min(1, item.current / item.target), 0) / all.length * 100) : 0
  const dailyRules = challenge.rules.filter(rule => rule.frequency === 'DAILY')
  const completedDays = dailyRules.length ? datesBetween(challenge.startDate, end).filter(day => dailyRules.every(rule => ruleProgress(challenge, rule, day, day).completed)) : []
  return { overall, currentDay, daysRemaining: Math.max(0, daysBetween(date, challenge.endDate)), today: datedRules, weekly: weeklyRules, total: totalRules, perfectDays: completedDays.length, perfectDayRate: currentDay ? Math.round(completedDays.length / currentDay * 100) : 0, streak: trailingPerfectDays(challenge, date) }
}

export const defaultChallengeScoreCalculator: ChallengeScoreCalculator = { calculate: (_challenge, progress) => progress.overall }
function ruleProgress(challenge: Challenge, rule: ChallengeRule, from: string, to: string): RuleProgress { return { rule, target: rule.target, current: valueFor(challenge, rule, from, to), completed: valueFor(challenge, rule, from, to) >= rule.target } }
function valueFor(challenge: Challenge, rule: ChallengeRule, from: string, to: string) {
  const range = (date: string) => date >= from && date <= to && date >= challenge.startDate && date <= challenge.endDate
  if (rule.type === 'HABIT') return getLocalHabitLogs().filter(log => log.status === 'completed' && range(log.date) && (!rule.linkedEntityId || log.habit_id === rule.linkedEntityId)).length
  if (rule.type === 'READING_PAGES') return getLocalReadingSessions().filter(session => range(session.started_at.slice(0, 10))).reduce((sum, session) => sum + session.pages_read, 0)
  if (rule.type === 'READING_MINUTES') return Math.floor(getLocalReadingSessions().filter(session => range(session.started_at.slice(0, 10))).reduce((sum, session) => sum + (session.duration_seconds ?? 0), 0) / 60)
  if (rule.type === 'WORKOUT') return getLocalWorkouts().filter(workout => range(workout.date)).length
  if (rule.type === 'FOCUS_MINUTES') return Math.floor(getLocalFocusSessions().filter(session => session.status === 'completed' && session.ended_at && range(session.ended_at.slice(0, 10))).reduce((sum, session) => sum + session.duration_seconds, 0) / 60)
  if (rule.type === 'CHECK_IN') return getLocalCheckIns().filter(checkin => range(checkin.date)).length
  if (rule.type === 'FINANCIAL') return getLocalFinanceTransactions().filter(item => range(item.date) && (!rule.linkedEntityId || item.financial_goal_id === rule.linkedEntityId)).length
  return getChallengeRuleLogs().filter(log => log.challengeId === challenge.id && log.ruleId === rule.id && range(log.date)).reduce((sum, log) => sum + log.value, 0)
}
function trailingPerfectDays(challenge: Challenge, date: string) { const rules = challenge.rules.filter(rule => rule.frequency === 'DAILY'); if (!rules.length) return 0; let count = 0; let cursor = date; while (cursor >= challenge.startDate && rules.every(rule => ruleProgress(challenge, rule, cursor, cursor).completed)) { count++; cursor = shift(cursor, -1) } return count }
function monday(date: string) { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() - ((value.getDay() || 7) - 1)); return value.toLocaleDateString('en-CA') }
function datesBetween(from: string, to: string) { const result: string[] = []; for (let cursor = from; cursor <= to; cursor = shift(cursor, 1)) result.push(cursor); return result }
function daysBetween(from: string, to: string) { return Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000) }
function shift(date: string, amount: number) { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + amount); return value.toLocaleDateString('en-CA') }
