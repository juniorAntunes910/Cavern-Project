import { getLocalCheckIns, getLocalFocusSessions, getLocalGoals, getLocalHabitLogs, getLocalReadingSessions, getLocalWorkouts, memoizeByRevision, overallStreak } from '../../../lib/local-store'
import { achievements, type Achievement } from '../domain/achievement'
import { getChallenges } from '../../challenges/services/challenge.repository'
import { calculateChallengeProgress } from '../../challenges/services/challenge-progress.service'

export function evaluateAchievements(): Achievement[] { const progress: Record<string, number> = achievementProgress(); const targets: Record<string, number> = { streak_7: 7, streak_14: 14, pages_100: 100, pages_500: 500, pages_1000: 1000, focus_10: 10, focus_100h: 360000, streak_30: 30, workouts_10: 10, workouts_50: 50, goals_1: 1, goals_10: 10, habits_1: 1, habits_100: 100, checkins_30: 30, perfect_days_7: 7, challenge_30: 1, challenges_5: 5 }; return achievements.filter(item => progress[item.condition] >= (targets[item.condition] ?? Infinity)) }
// Every card of the achievements page and every data change asks for this, so it is computed once per data revision.
export const achievementProgress = memoizeByRevision(computeAchievementProgress, { daily: true })
function computeAchievementProgress() {
  const challenges = getChallenges(); const logs = getLocalHabitLogs(); const streak = overallStreak(logs)
  const pages = getLocalReadingSessions().reduce((sum, item) => sum + item.pages_read, 0)
  const focus = getLocalFocusSessions().filter(item => item.status === 'completed'); const workouts = getLocalWorkouts().length
  const goals = getLocalGoals().filter(item => item.status === 'completed').length; const habits = logs.filter(item => item.status === 'completed').length
  const completed = challenges.filter(item => item.status === 'COMPLETED')
  return { streak_7: streak, streak_14: streak, streak_30: streak, pages_100: pages, pages_500: pages, pages_1000: pages, focus_10: focus.length, focus_100h: focus.reduce((sum, item) => sum + item.duration_seconds, 0), workouts_10: workouts, workouts_50: workouts, goals_1: goals, goals_10: goals, habits_1: habits, habits_100: habits, checkins_30: getLocalCheckIns().length, perfect_days_7: Math.max(0, ...challenges.map(challenge => calculateChallengeProgress(challenge).perfectDays)), challenge_30: completed.filter(item => item.durationDays >= 30).length, challenges_5: completed.length }
}
export function formatAchievementProgress(condition: string) { const value = achievementProgress()[condition as keyof ReturnType<typeof achievementProgress>] ?? 0; const target = ({ streak_7: 7, streak_14: 14, streak_30: 30, pages_100: 100, pages_500: 500, pages_1000: 1000, focus_10: 10, focus_100h: 360000, workouts_10: 10, workouts_50: 50, goals_1: 1, goals_10: 10, habits_1: 1, habits_100: 100, checkins_30: 30, perfect_days_7: 7, challenge_30: 1, challenges_5: 5 } as Record<string, number>)[condition]; if (!target) return '???'; return condition === 'focus_100h' ? `${Math.floor(value / 3600)} / 100 horas` : `${Math.min(value, target)} / ${target}` }
