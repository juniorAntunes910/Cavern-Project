import {
  getLocalBooks,
  getLocalCheckIns,
  getLocalAchievements,
  getLocalFinanceTransactions,
  getLocalFinancialGoals,
  getLocalFocusSessions,
  getLocalGoals,
  getLocalHabitLogs,
  getLocalHabits,
  getLocalProfile,
  getLocalReadingSessions,
  getLocalRewardTransactions,
  getLocalTimelineEvents,
  getLocalWorkouts,
  getLocalXpEntries,
  overallStreak,
  today,
} from '../../../lib/local-store'
import { getAttendance, getBodyWeight, getExercises, getWorkoutPlans, getWorkoutSessions } from '../../gym/services/gym.service'
import { getChallenges } from '../../challenges/services/challenge.repository'
import { achievements as achievementCatalog } from '../../achievements/domain/achievement'

export const aiDataCategories = [
  { id: 'profile', label: 'Rotina e foco', sensitive: false, description: 'Preferências gerais de rotina, sem nome, e-mail ou foto.' },
  { id: 'goalsHabits', label: 'Metas e hábitos', sensitive: false, description: 'Metas, hábitos e registros sem notas pessoais.' },
  { id: 'reading', label: 'Leitura', sensitive: false, description: 'Livros e sessões, sem arquivos ou conteúdo dos livros.' },
  { id: 'gym', label: 'Treinos', sensitive: false, description: 'Treinos, exercícios e frequência.' },
  { id: 'bodyWeight', label: 'Peso corporal', sensitive: true, description: 'Medições de peso registradas na academia.' },
  { id: 'focus', label: 'Sessões de foco', sensitive: false, description: 'Duração e nomes de projetos de foco.' },
  { id: 'checkins', label: 'Check-ins e bem-estar', sensitive: true, description: 'Indicadores e textos registrados nos check-ins.' },
  { id: 'finance', label: 'Finanças', sensitive: true, description: 'Metas e valores de transações, sem nome de conta ou observações.' },
  { id: 'challenges', label: 'Desafios e linha do tempo', sensitive: false, description: 'Desafios concluídos e tipos/datas de eventos.' },
  { id: 'progress', label: 'Progresso e conquistas', sensitive: false, description: 'XP acumulado e conquistas desbloqueadas.' },
] as const

export type AiDataCategory = typeof aiDataCategories[number]['id']
export type AiDataConsent = { version: 1; acceptedAt: string; categories: AiDataCategory[] }
export type AiMetric = { id: string; label: string; value: number | string; unit: string; period: string }
export const aiConsentStorageKey = 'cavern.ai-data-consent.v1'
export const aiPeriodDays = 180

const allowed = new Set<AiDataCategory>(aiDataCategories.map(item => item.id))

export function readAiDataConsent(): AiDataConsent | null {
  try {
    const value = JSON.parse(localStorage.getItem(aiConsentStorageKey) ?? 'null') as Partial<AiDataConsent> | null
    if (!value || value.version !== 1 || !Array.isArray(value.categories)) return null
    return { version: 1, acceptedAt: typeof value.acceptedAt === 'string' ? value.acceptedAt : '', categories: value.categories.filter((item): item is AiDataCategory => allowed.has(item as AiDataCategory)) }
  } catch { return null }
}

export function saveAiDataConsent(categories: AiDataCategory[]): AiDataConsent {
  const consent: AiDataConsent = { version: 1, acceptedAt: new Date().toISOString(), categories: [...new Set(categories)].filter(item => allowed.has(item)) }
  localStorage.setItem(aiConsentStorageKey, JSON.stringify(consent))
  window.dispatchEvent(new Event('cavern:data-changed'))
  return consent
}

export function revokeAiDataConsent() {
  localStorage.removeItem(aiConsentStorageKey)
  window.dispatchEvent(new Event('cavern:data-changed'))
}

export function buildAiContext(categories: AiDataCategory[], periodDays = aiPeriodDays) {
  const selected = new Set(categories.filter(item => allowed.has(item)))
  const days = Math.min(aiPeriodDays, Math.max(1, Math.trunc(periodDays)))
  const from = shift(today(), -(days - 1))
  const habits = getLocalHabits()
  const books = getLocalBooks()
  const exercises = getExercises()
  const habitName = (id: string) => habits.find(item => item.id === id)?.name ?? 'Hábito removido'
  const bookName = (id: string) => books.find(item => item.id === id)?.title ?? 'Livro removido'
  const exerciseName = (id: string) => exercises.find(item => item.id === id)?.name ?? 'Exercício removido'
  const within = (date: string | null | undefined) => Boolean(date && date.slice(0, 10) >= from && date.slice(0, 10) <= today())
  const categoriesData: Record<string, unknown> = {}

  if (selected.has('profile')) {
    const profile = getLocalProfile()
    categoriesData.profile = { focus: profile.focus, activeDays: profile.activeDays, weekStartsOn: profile.weekStartsOn }
  }
  if (selected.has('goalsHabits')) categoriesData.goalsHabits = {
    goals: cap(getLocalGoals().map(({ id: _id, title, target_value, unit, metric, period_type, status, manual_progress, start_date, end_date }) => ({ title, target_value, unit, metric, period_type, status, manual_progress, start_date, end_date })), 100),
    habits: cap(habits.map(({ id: _id, name, type, category, target_days, started_at, active }) => ({ name, type, category, target_days, started_at, active })), 100),
    logs: cap(getLocalHabitLogs().filter(item => within(item.date)).map(({ habit_id, date, status }) => ({ habit: habitName(habit_id), date, status })), 500),
    currentStreak: overallStreak(),
  }
  if (selected.has('reading')) categoriesData.reading = {
    books: cap(books.map(({ title, author, total_pages, current_page, status }) => ({ title, author, total_pages, current_page, status })), 100),
    sessions: cap(getLocalReadingSessions().filter(item => within(item.started_at)).map(({ book_id, start_page, end_page, pages_read, started_at, ended_at, duration_seconds }) => ({ book: bookName(book_id), start_page, end_page, pages_read, started_at, ended_at, duration_seconds })), 250),
  }
  if (selected.has('gym')) categoriesData.gym = {
    workouts: cap(getLocalWorkouts().filter(item => within(item.date)).map(({ date, title, focus, duration_minutes }) => ({ date, title, focus, duration_minutes })), 180),
    plans: cap(getWorkoutPlans().map(plan => ({ name: plan.name, exercises: plan.exercises.map(item => ({ exercise: exerciseName(item.exerciseId), sets: item.defaultSets, repsMin: item.repsMin, repsMax: item.repsMax })) })), 50),
    sessions: cap(getWorkoutSessions().filter(item => within(item.startedAt)).map(session => ({ workout: session.workoutName, startedAt: session.startedAt, completedAt: session.completedAt, status: session.status, exercises: session.exercises.map(item => ({ exercise: exerciseName(item.exerciseId), sets: item.sets.map(set => ({ set: set.setNumber, weightKg: set.weightKg, reps: set.reps, completed: set.completed })) })) })), 180),
    attendance: cap(getAttendance().filter(item => within(item.date)).map(({ date, status }) => ({ date, status })), 180),
  }
  if (selected.has('bodyWeight')) categoriesData.bodyWeight = cap(getBodyWeight().filter(item => within(item.date)).map(({ date, weightKg }) => ({ date, weightKg })), 180)
  if (selected.has('focus')) categoriesData.focus = cap(getLocalFocusSessions().filter(item => within(item.started_at)).map(({ started_at, ended_at, duration_seconds, accumulated_seconds, status, project_name }) => ({ started_at, ended_at, duration_seconds, accumulated_seconds, status, project_name })), 250)
  if (selected.has('checkins')) categoriesData.checkins = cap(getLocalCheckIns().filter(item => within(item.date)).map(({ date, discipline, focus, energy, good_today, improve_tomorrow }) => ({ date, discipline, focus, energy, good_today, improve_tomorrow })), 180)
  if (selected.has('finance')) categoriesData.finance = {
    goals: cap(getLocalFinancialGoals().map(({ title, target_amount, currency, deadline, saved_amount, status }) => ({ title, target_amount, currency, deadline, saved_amount, status })), 100),
    transactions: cap(getLocalFinanceTransactions().filter(item => within(item.date)).map(({ date, kind, amount_brl, category, btc_amount, btc_unit_price_brl }) => ({ date, kind, amount_brl, category, btc_amount, btc_unit_price_brl })), 300),
  }
  if (selected.has('challenges')) categoriesData.challenges = {
    history: cap(getChallenges().filter(challenge => within(challenge.startDate) || within(challenge.endDate)).map(challenge => ({ name: challenge.name, type: challenge.type, difficulty: challenge.difficulty, status: challenge.status, startDate: challenge.startDate, endDate: challenge.endDate, durationDays: challenge.durationDays, rules: challenge.rules.map(({ type, title, target, unit, frequency }) => ({ type, title, target, unit, frequency })) })), 100),
    timeline: cap(getLocalTimelineEvents().filter(item => within(item.created_at)).map(({ type, created_at }) => ({ type, date: created_at.slice(0, 10) })), 200),
  }
  if (selected.has('progress')) {
    const unlocked = new Map(getLocalAchievements().map(item => [item.id, item.unlocked_at]))
    categoriesData.progress = {
      xpEntries: cap(getLocalXpEntries().filter(item => within(item.created_at)).map(({ points, title, created_at }) => ({ points, title, date: created_at.slice(0, 10) })), 300),
      achievements: achievementCatalog.filter(item => unlocked.has(item.id)).map(item => ({ title: item.title, unlockedAt: unlocked.get(item.id) })),
      recentRewards: cap(getLocalRewardTransactions().filter(item => within(item.created_at)).map(({ xp, embers, title, created_at }) => ({ xp, embers, title, date: created_at.slice(0, 10) })), 300),
    }
  }

  return { schemaVersion: 1, generatedAt: new Date().toISOString(), period: { from, to: today(), days }, selectedCategories: [...selected], categories: categoriesData, metrics: buildAiMetrics(selected, from) }
}

function buildAiMetrics(selected: Set<AiDataCategory>, from: string): AiMetric[] {
  const period = `${from} a ${today()}`
  const within = (date: string | null | undefined) => Boolean(date && date.slice(0, 10) >= from && date.slice(0, 10) <= today())
  const metrics: AiMetric[] = []
  const add = (category: AiDataCategory, id: string, label: string, value: number | string, unit: string) => { if (selected.has(category)) metrics.push({ id, label, value, unit, period }) }
  const logs = getLocalHabitLogs().filter(item => item.date >= from && item.date <= today())
  const reading = getLocalReadingSessions().filter(item => item.started_at.slice(0, 10) >= from && item.started_at.slice(0, 10) <= today())
  const workouts = getLocalWorkouts().filter(item => item.date >= from && item.date <= today())
  const focus = getLocalFocusSessions().filter(item => item.started_at.slice(0, 10) >= from && item.started_at.slice(0, 10) <= today() && item.status === 'completed')
  const checkins = getLocalCheckIns().filter(item => item.date >= from && item.date <= today())
  const transactions = getLocalFinanceTransactions().filter(item => item.date >= from && item.date <= today())
  const challenges = getChallenges()
  const xpEntries = getLocalXpEntries().filter(item => within(item.created_at))
  add('goalsHabits', 'habits.active', 'Hábitos ativos', getLocalHabits().filter(item => item.active).length, 'hábitos')
  add('goalsHabits', 'habits.completed_logs', 'Registros de hábitos concluídos', logs.filter(item => item.status === 'completed').length, 'registros')
  add('goalsHabits', 'habits.current_streak', 'Sequência atual', overallStreak(), 'dias')
  add('reading', 'reading.pages', 'Páginas lidas', reading.reduce((sum, item) => sum + item.pages_read, 0), 'páginas')
  add('reading', 'reading.sessions', 'Sessões de leitura', reading.length, 'sessões')
  add('gym', 'gym.workouts', 'Treinos registrados', workouts.length, 'treinos')
  add('gym', 'gym.minutes', 'Minutos de treino registrados', workouts.reduce((sum, item) => sum + item.duration_minutes, 0), 'minutos')
  add('bodyWeight', 'body_weight.measurements', 'Medições de peso', getBodyWeight().filter(item => item.date >= from && item.date <= today()).length, 'medições')
  add('focus', 'focus.sessions', 'Sessões de foco concluídas', focus.length, 'sessões')
  add('focus', 'focus.minutes', 'Minutos de foco concluídos', Math.round(focus.reduce((sum, item) => sum + item.duration_seconds, 0) / 60), 'minutos')
  add('checkins', 'checkins.count', 'Check-ins registrados', checkins.length, 'check-ins')
  if (checkins.length) add('checkins', 'checkins.mean_energy', 'Energia média nos check-ins', Number((checkins.reduce((sum, item) => sum + item.energy, 0) / checkins.length).toFixed(1)), '/ 5')
  add('finance', 'finance.transactions', 'Transações registradas', transactions.length, 'transações')
  add('finance', 'finance.expenses_brl', 'Despesas registradas', Number(transactions.filter(item => item.kind === 'expense').reduce((sum, item) => sum + item.amount_brl, 0).toFixed(2)), 'BRL')
  const financialGoals = getLocalFinancialGoals().filter(item => item.status === 'active' && item.target_amount > 0)
  if (financialGoals.length) add('finance', 'finance.goals_progress', 'Progresso médio das metas financeiras ativas', Math.round(financialGoals.reduce((sum, item) => sum + Math.min(100, Math.max(0, item.saved_amount / item.target_amount * 100)), 0) / financialGoals.length), '%')
  const manualGoals = getLocalGoals().filter(item => item.status === 'active' && item.metric === 'custom' && item.target_value > 0)
  if (manualGoals.length) add('goalsHabits', 'goals.manual_progress', 'Progresso médio das metas manuais ativas', Math.round(manualGoals.reduce((sum, item) => sum + Math.min(100, Math.max(0, item.manual_progress / item.target_value * 100)), 0) / manualGoals.length), '%')
  add('challenges', 'challenges.completed', 'Desafios concluídos', challenges.filter(item => item.status === 'COMPLETED').length, 'desafios')
  add('progress', 'progress.xp', 'XP recebido no período', xpEntries.reduce((sum, item) => sum + item.points, 0), 'XP')
  add('progress', 'progress.achievements', 'Conquistas desbloqueadas', getLocalAchievements().length, 'conquistas')
  return metrics
}

export function getAiCategoryCounts(periodDays = aiPeriodDays) {
  const context = buildAiContext(aiDataCategories.map(item => item.id), periodDays)
  const data = context.categories as Record<string, Record<string, unknown>>
  return Object.fromEntries(aiDataCategories.map(item => [item.id, countItems(data[item.id])])) as Record<AiDataCategory, number>
}

function countItems(value: Record<string, unknown> | undefined): number {
  if (!value) return 0
  const count = Object.values(value).reduce<number>((total, entry) => total + (Array.isArray(entry) ? entry.length : typeof entry === 'number' ? 1 : 0), 0)
  return count || (Object.keys(value).length ? 1 : 0)
}

function cap<T>(items: T[], maximum: number) { return items.slice(0, maximum) }
function shift(date: string, amount: number) { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + amount); return value.toLocaleDateString('en-CA') }
