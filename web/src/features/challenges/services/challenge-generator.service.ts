import { getLocalHabitLogs, getLocalReadingSessions, getLocalWorkouts, overallStreak, today } from '../../../lib/local-store'
import type { Challenge } from '../domain/challenge'
import { checkpoints } from '../templates/challengeTemplates'

export interface ChallengeGenerator { generate(startDate?: string): Challenge }
export const localChallengeGenerator: ChallengeGenerator = { generate(startDate = today()) {
  const since = shift(startDate, -28); const reading = getLocalReadingSessions().filter(item => item.started_at.slice(0, 10) >= since); const pagesPerDay = reading.reduce((sum, item) => sum + item.pages_read, 0) / 28
  const workoutsPerWeek = getLocalWorkouts().filter(item => item.date >= since).length / 4; const streak = overallStreak(getLocalHabitLogs()); const durationDays = streak >= 14 ? 30 : streak >= 5 ? 14 : 7
  const rules = [] as Challenge['rules']; if (pagesPerDay > 0) rules.push({ id: crypto.randomUUID(), type: 'READING_PAGES', title: 'Leitura proporcional', target: Math.max(1, Math.ceil(pagesPerDay * 1.35)), unit: 'páginas', frequency: 'DAILY' }); if (workoutsPerWeek > 0) rules.push({ id: crypto.randomUUID(), type: 'WORKOUT', title: 'Treino proporcional', target: Math.min(5, Math.max(1, Math.ceil(workoutsPerWeek + 1))), unit: 'treinos', frequency: 'WEEKLY' }); rules.push({ id: crypto.randomUUID(), type: 'HABIT', title: 'Hábitos essenciais', target: Math.max(1, Math.min(3, Math.round(activeHabitDailyAverage(since)))), unit: 'hábitos', frequency: 'DAILY' })
  return { id: crypto.randomUUID(), name: `Ciclo proporcional — ${durationDays} dias`, description: 'Sugestão local baseada no seu ritmo recente. Ajuste antes de iniciar.', type: 'CUSTOM', difficulty: streak >= 14 ? 'NORMAL' : 'EASY', status: 'DRAFT', startDate, endDate: shift(startDate, durationDays - 1), durationDays, rules, checkpoints: checkpoints(durationDays), rewards: [{ title: 'Ciclo concluído', xp: 500 }], createdAt: new Date().toISOString() }
} }
function activeHabitDailyAverage(since: string) { return getLocalHabitLogs().filter(item => item.status === 'completed' && item.date >= since).length / 28 }
function shift(date: string, amount: number) { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + amount); return value.toLocaleDateString('en-CA') }
