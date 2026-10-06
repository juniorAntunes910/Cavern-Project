import { getLocalFocusSessions, getLocalHabitLogs, getLocalHabits, getLocalReadingSessions, getLocalWorkouts, localDay, overallStreak, today } from '../../../lib/local-store'
import { analyzeLocalData, type LocalAnalysis } from '../../advisor/services/reflection.service'
import type { AiDataCategory, AiMetric } from '../../advisor/services/ai-data.service'
import type { Challenge } from '../domain/challenge'
import { checkpoints } from '../templates/challengeTemplates'

export type ChallengeGenerationResult = { challenge: Challenge; source: 'local'; message: string; analysis: LocalAnalysis }
export const aiChallengeConfigured = true

export async function generatePersonalizedChallenge(startDate = today(), categories: AiDataCategory[] = []): Promise<ChallengeGenerationResult> {
  const { analysis, metrics } = analyzeLocalData(categories)
  const challenge = createLocalChallenge(startDate, categories, metrics)
  return { challenge, source: 'local', analysis, message: 'Análise concluída no aparelho. Seus dados não saíram do Cavern.' }
}

function createLocalChallenge(startDate: string, categories: AiDataCategory[], metrics: AiMetric[]): Challenge {
  const selected = new Set(categories)
  const byId = new Map(metrics.map(metric => [metric.id, metric.value]))
  const recent = shift(startDate, -27)
  const habits = getLocalHabits().filter(item => item.active)
  const reading = getLocalReadingSessions().filter(item => (localDay(item.started_at) ?? '') >= recent && (localDay(item.started_at) ?? '') <= startDate)
  const workouts = getLocalWorkouts().filter(item => item.date >= recent && item.date <= startDate)
  const focus = getLocalFocusSessions().filter(item => (localDay(item.started_at) ?? '') >= recent && (localDay(item.started_at) ?? '') <= startDate && item.status === 'completed')
  const streak = overallStreak(getLocalHabitLogs())
  const durationDays = streak >= 14 ? 14 : 7
  const rules: Challenge['rules'] = []

  if (selected.has('goalsHabits') && habits.length) {
    const completed = getLocalHabitLogs().filter(item => item.status === 'completed' && item.date >= recent && item.date <= startDate).length
    const perDay = completed / 28
    rules.push({ id: crypto.randomUUID(), type: 'HABIT', title: 'Manter hábitos essenciais', target: Math.max(1, Math.min(habits.length, Math.round(perDay || 1))), unit: 'hábitos', frequency: 'DAILY' })
  }
  if (selected.has('reading') && reading.length) {
    const pages = reading.reduce((sum, item) => sum + item.pages_read, 0)
    rules.push({ id: crypto.randomUUID(), type: 'READING_PAGES', title: 'Leitura em pequenos blocos', target: Math.max(1, Math.min(100, Math.ceil(pages / 28))), unit: 'páginas', frequency: 'DAILY' })
  }
  if (selected.has('gym') && workouts.length) {
    rules.push({ id: crypto.randomUUID(), type: 'WORKOUT', title: 'Treino sustentável', target: Math.max(1, Math.min(5, Math.ceil(workouts.length / 4))), unit: 'treinos', frequency: 'WEEKLY' })
  }
  if (selected.has('focus') && focus.length) {
    const minutes = focus.reduce((sum, item) => sum + item.duration_seconds, 0) / 60
    rules.push({ id: crypto.randomUUID(), type: 'FOCUS_MINUTES', title: 'Sessões de foco', target: Math.max(25, Math.min(600, Math.ceil(minutes / 4 / 25) * 25)), unit: 'minutos', frequency: 'WEEKLY' })
  }
  if (selected.has('checkins') && Number(byId.get('checkins.count') ?? 0) > 0) {
    rules.push({ id: crypto.randomUUID(), type: 'CHECK_IN', title: 'Registrar como foi o dia', target: 1, unit: 'check-in', frequency: 'DAILY' })
  }
  if (!rules.length) rules.push({ id: crypto.randomUUID(), type: 'CUSTOM', title: 'Escolher um pequeno passo', target: 1, unit: 'vez', frequency: 'DAILY' })

  return {
    id: crypto.randomUUID(), name: 'Ritmo possível',
    description: `Desafio de ${durationDays} dias montado localmente com ${rules.length} meta(s) baseada(s) nos registros selecionados. Você pode editar tudo antes de começar.`,
    type: 'FULL_CAVERN', difficulty: rules.length > 3 ? 'NORMAL' : 'EASY', status: 'DRAFT', startDate,
    endDate: shift(startDate, durationDays - 1), durationDays, rules, checkpoints: checkpoints(durationDays),
    rewards: [{ title: 'Ciclo concluído', xp: 500 }], createdAt: new Date().toISOString(),
  }
}

function shift(date: string, amount: number) { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + amount); return value.toLocaleDateString('en-CA') }
