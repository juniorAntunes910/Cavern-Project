import { beforeEach, describe, expect, it } from 'vitest'
import { at, checkIn, habitLog, focusSession, readingSession, resetStorage } from '../../../test/helpers'
import { getLocalCheckIns, getLocalFinanceTransactions, getLocalFocusSessions, getLocalHabitLogs, getLocalReadingSessions, localDataKeys, writeCollection, type LocalFinanceTransaction, type LocalHabitLog, type LocalReadingSession, type LocalWorkout } from '../../../lib/local-store'
import { gymDataKeys, getCompletedWorkoutCount } from '../../gym/services/gym.service'
import type { WorkoutSession } from '../../gym/domain'
import type { Challenge, ChallengeProgress, ChallengeRule, ChallengeRuleLog } from '../domain/challenge'
import { getChallengeRuleLogs, setChallengeRuleLog } from './challenge.repository'
import { calculateChallengeProgress, canCompleteChallenge } from './challenge-progress.service'

const rule = (overrides: Partial<ChallengeRule> & Pick<ChallengeRule, 'type'>): ChallengeRule => ({ id: overrides.type, title: overrides.type, target: 1, unit: 'x', frequency: 'DAILY', ...overrides })
const challenge = (overrides: Partial<Challenge> = {}): Challenge => ({ id: 'c1', name: 'Ciclo', description: '', type: 'CUSTOM', difficulty: 'NORMAL', status: 'ACTIVE', startDate: '2026-10-01', endDate: '2026-10-07', durationDays: 7, rules: [], checkpoints: [], rewards: [], createdAt: '2026-10-01T00:00:00.000Z', ...overrides })
const gymSession = (day: string, status: WorkoutSession['status'] = 'COMPLETED'): WorkoutSession => ({ id: `gym-${day}-${status}`, workoutName: 'Treino', startedAt: at(day), exercises: [], status })

beforeEach(resetStorage)

describe('calculateChallengeProgress', () => {
  describe('daily rules', () => {
    const rules = [rule({ id: 'habits', type: 'HABIT', target: 2 }), rule({ id: 'pages', type: 'READING_PAGES', target: 5 }), rule({ id: 'checkin', type: 'CHECK_IN' })]
    const cycle = challenge({ rules })
    beforeEach(() => {
      writeCollection(localDataKeys.habitLogs, [
        habitLog('h1', '2026-10-01'), habitLog('h2', '2026-10-01'), // 2 habits
        habitLog('h1', '2026-10-02'), habitLog('h2', '2026-10-02', 'failed'), // 1 habit
        habitLog('h1', '2026-10-03'), habitLog('h2', '2026-10-03'), // 2 habits
        habitLog('h1', '2026-09-30'), habitLog('h2', '2026-09-30'), // before the cycle
      ])
      writeCollection(localDataKeys.sessions, [readingSession(at('2026-10-01'), 5), readingSession(at('2026-10-02'), 3), readingSession(at('2026-10-02'), 4), readingSession(at('2026-09-30'), 50)])
      writeCollection(localDataKeys.checkins, [checkIn('2026-10-01'), checkIn('2026-10-02')])
    })

    it('scores the elapsed days against the whole cycle', () => {
      const progress = calculateChallengeProgress(cycle, '2026-10-03')
      expect(progress).toMatchObject({ currentDay: 3, daysRemaining: 4, perfectDays: 1, perfectDayRate: 33, streak: 0 })
      // habits (1 + 0.5 + 1), pages (1 + 1 + 0) and check-ins (1 + 1 + 0), each over the 7 days of the cycle.
      expect(progress.overall).toBe(31)
      expect(progress.today.map(item => [item.current, item.target, item.completed])).toEqual([[2, 2, true], [0, 5, false], [0, 1, false]])
    })

    it('counts the streak of perfect days that ends on the given date', () => {
      expect(calculateChallengeProgress(cycle, '2026-10-01')).toMatchObject({ currentDay: 1, perfectDays: 1, perfectDayRate: 100, streak: 1 })
      expect(calculateChallengeProgress(cycle, '2026-10-02').streak).toBe(0)
    })

    it('reports nothing for today once the cycle is over, but keeps the cycle score', () => {
      const progress = calculateChallengeProgress(cycle, '2026-10-10')
      expect(progress).toMatchObject({ overall: 31, currentDay: 7, daysRemaining: 0, perfectDays: 1, perfectDayRate: 14, streak: 0 })
      expect(progress.today.map(item => item.current)).toEqual([0, 0, 0])
    })

    it('has not started before the first day', () => {
      const progress = calculateChallengeProgress(cycle, '2026-09-29')
      expect(progress).toMatchObject({ overall: 0, currentDay: 0, daysRemaining: 8, perfectDays: 0, perfectDayRate: 0, streak: 0 })
      expect(progress.today.map(item => item.current)).toEqual([0, 0, 0])
    })
  })

  describe('weekly and total rules', () => {
    it('sums workouts over the week and focus time over the cycle', () => {
      writeCollection(gymDataKeys.sessions, [gymSession('2026-10-01'), gymSession('2026-10-02'), gymSession('2026-10-02', 'CANCELLED')])
      // 1799 s + 1801 s is exactly 60 minutes; rounding each session down would give 59.
      writeCollection(localDataKeys.focusSessions, [focusSession(at('2026-10-01'), 1799), focusSession(at('2026-10-02'), 1801), focusSession(at('2026-10-02'), 3600, 'cancelled'), focusSession(null, 3600, 'active')])
      const cycle = challenge({ rules: [rule({ id: 'gym', type: 'WORKOUT', target: 2, frequency: 'WEEKLY' }), rule({ id: 'focus', type: 'FOCUS_MINUTES', target: 60, frequency: 'TOTAL' })] })
      const progress = calculateChallengeProgress(cycle, '2026-10-03')
      expect(progress.weekly.map(item => [item.current, item.completed])).toEqual([[2, true]])
      expect(progress.total.map(item => [item.current, item.completed])).toEqual([[60, true]])
      // The week (Mon 28 Sep to Sat 3 Oct) is worth half of the cycle's weeks; the total rule has run 3 of 7 days.
      expect(progress.overall).toBe(46)
    })

    it('sums reading minutes only after adding the sessions up', () => {
      writeCollection(localDataKeys.sessions, [readingSession(at('2026-10-02'), 1, 100), readingSession(at('2026-10-02'), 1, 100), readingSession(at('2026-10-02'), 1)])
      const cycle = challenge({ rules: [rule({ type: 'READING_MINUTES', target: 3, frequency: 'TOTAL' })] })
      expect(calculateChallengeProgress(cycle, '2026-10-02').total[0]).toMatchObject({ current: 3, completed: true })
    })
  })

  describe('linked entities', () => {
    it('counts only the linked habit', () => {
      writeCollection(localDataKeys.habitLogs, [habitLog('h1', '2026-10-02'), habitLog('h2', '2026-10-02'), habitLog('h2', '2026-10-03')])
      const cycle = challenge({ rules: [rule({ id: 'any', type: 'HABIT' }), rule({ id: 'h2', type: 'HABIT', linkedEntityId: 'h2' }), rule({ id: 'missing', type: 'HABIT', linkedEntityId: 'nobody' })] })
      expect(calculateChallengeProgress(cycle, '2026-10-02').today.map(item => item.current)).toEqual([2, 1, 0])
    })

    it('counts only the transactions of the linked financial goal', () => {
      const transaction = (id: string, financial_goal_id?: string): LocalFinanceTransaction => ({ id, date: '2026-10-02', kind: 'contribution', amount_brl: 10, category: 'Aporte', account: 'Conta', note: null, btc_amount: null, btc_unit_price_brl: null, financial_goal_id })
      writeCollection(localDataKeys.financeTransactions, [transaction('a', 'f1'), transaction('b', 'f1'), transaction('c', 'f2'), transaction('d')])
      const cycle = challenge({ rules: [rule({ id: 'any', type: 'FINANCIAL' }), rule({ id: 'f1', type: 'FINANCIAL', linkedEntityId: 'f1' })] })
      expect(calculateChallengeProgress(cycle, '2026-10-02').today.map(item => item.current)).toEqual([4, 2])
    })
  })

  describe('manually logged rules', () => {
    it('adds up the values logged for that rule and nothing else', () => {
      const cycle = challenge({ rules: [rule({ id: 'water', type: 'CUSTOM', target: 3 }), rule({ id: 'sugar', type: 'ABSTINENCE', target: 1 })] })
      setChallengeRuleLog('c1', 'water', '2026-10-02', 1)
      setChallengeRuleLog('c1', 'water', '2026-10-02', 2)
      setChallengeRuleLog('c1', 'water', '2026-10-02', 3) // replaces the previous value of the same day
      setChallengeRuleLog('c1', 'sugar', '2026-10-03', 1)
      setChallengeRuleLog('other', 'water', '2026-10-02', 9)
      expect(calculateChallengeProgress(cycle, '2026-10-02').today.map(item => [item.current, item.completed])).toEqual([[3, true], [0, false]])
      expect(calculateChallengeProgress(cycle, '2026-10-03').today.map(item => item.current)).toEqual([0, 1])
    })
  })

  it('reflects data written after an earlier calculation', () => {
    const cycle = challenge({ rules: [rule({ type: 'CHECK_IN' })] })
    expect(calculateChallengeProgress(cycle, '2026-10-02').today[0].current).toBe(0)
    writeCollection(localDataKeys.checkins, [checkIn('2026-10-02')])
    expect(calculateChallengeProgress(cycle, '2026-10-02').today[0].current).toBe(1)
  })
})

describe('canCompleteChallenge', () => {
  it('requires the cycle to be over and the score to reach the minimum', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-03']
    writeCollection(localDataKeys.checkins, days.map(checkIn))
    const cycle = challenge({ endDate: '2026-10-03', durationDays: 3, rules: [rule({ type: 'CHECK_IN' })] })
    expect(canCompleteChallenge(cycle, calculateChallengeProgress(cycle, '2026-10-02'))).toBe(false)
    expect(canCompleteChallenge(cycle, calculateChallengeProgress(cycle, '2026-10-03'))).toBe(true)
    writeCollection(localDataKeys.checkins, [checkIn('2026-10-01')])
    expect(canCompleteChallenge(cycle, calculateChallengeProgress(cycle, '2026-10-03'))).toBe(false)
  })
})

// The calculation used to scan every collection for each (rule, day) pair. It now answers from an index built once per
// data revision, so this keeps the original brute-force version as a reference and checks that both agree on
// randomly generated histories, including dates before, during and after each cycle.
describe('calculateChallengeProgress against the brute-force reference', () => {
  function referenceValue(cycle: Challenge, item: ChallengeRule, from: string, to: string) {
    const range = (date: string) => date >= from && date <= to && date >= cycle.startDate && date <= cycle.endDate
    if (item.type === 'HABIT') return getLocalHabitLogs().filter(log => log.status === 'completed' && range(log.date) && (!item.linkedEntityId || log.habit_id === item.linkedEntityId)).length
    if (item.type === 'READING_PAGES') return getLocalReadingSessions().filter(session => range(session.started_at.slice(0, 10))).reduce((sum, session) => sum + session.pages_read, 0)
    if (item.type === 'READING_MINUTES') return Math.floor(getLocalReadingSessions().filter(session => range(session.started_at.slice(0, 10))).reduce((sum, session) => sum + (session.duration_seconds ?? 0), 0) / 60)
    if (item.type === 'WORKOUT') return getCompletedWorkoutCount(from, to)
    if (item.type === 'FOCUS_MINUTES') return Math.floor(getLocalFocusSessions().filter(session => session.status === 'completed' && session.ended_at && range(session.ended_at.slice(0, 10))).reduce((sum, session) => sum + session.duration_seconds, 0) / 60)
    if (item.type === 'CHECK_IN') return getLocalCheckIns().filter(entry => range(entry.date)).length
    if (item.type === 'FINANCIAL') return getLocalFinanceTransactions().filter(entry => range(entry.date) && (!item.linkedEntityId || entry.financial_goal_id === item.linkedEntityId)).length
    return getChallengeRuleLogs().filter(log => log.challengeId === cycle.id && log.ruleId === item.id && range(log.date)).reduce((sum, log) => sum + log.value, 0)
  }
  const shiftDay = (day: string, amount: number) => { const [year, month, date] = day.split('-').map(Number); return new Date(Date.UTC(year, month - 1, date + amount)).toISOString().slice(0, 10) }
  const monday = (day: string) => { const value = new Date(`${day}T12:00:00`); value.setDate(value.getDate() - ((value.getDay() || 7) - 1)); return value.toLocaleDateString('en-CA') }
  const daysBetween = (from: string, to: string) => Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000)
  const datesBetween = (from: string, to: string) => { const result: string[] = []; for (let cursor = from; cursor <= to; cursor = shiftDay(cursor, 1)) result.push(cursor); return result }
  function referenceProgress(cycle: Challenge, date: string): ChallengeProgress {
    const progressOf = (item: ChallengeRule, from: string, to: string) => { const current = referenceValue(cycle, item, from, to); return { rule: item, target: item.target, current, completed: current >= item.target } }
    const currentDay = Math.max(0, Math.min(cycle.durationDays, daysBetween(cycle.startDate, date) + 1))
    const daily = cycle.rules.filter(item => item.frequency === 'DAILY')
    const end = date <= cycle.endDate ? date : cycle.endDate
    const completedDays = daily.length ? datesBetween(cycle.startDate, end).filter(day => daily.every(item => progressOf(item, day, day).completed)) : []
    const cycleDays = datesBetween(cycle.startDate, cycle.endDate)
    const elapsedDays = cycleDays.filter(day => day <= date)
    const weeks = [...new Set(cycleDays.map(monday))]
    const ratios = cycle.rules.map(item => {
      if (item.frequency === 'DAILY') return elapsedDays.reduce((sum, day) => sum + Math.min(1, referenceValue(cycle, item, day, day) / item.target), 0) / cycleDays.length
      if (item.frequency === 'WEEKLY') return weeks.filter(week => week <= date).reduce((sum, week) => sum + Math.min(1, referenceValue(cycle, item, week, shiftDay(week, 6) < end ? shiftDay(week, 6) : end) / item.target), 0) / weeks.length
      return Math.min(1, referenceValue(cycle, item, cycle.startDate, end) / item.target) * elapsedDays.length / cycleDays.length
    })
    let streak = 0
    for (let cursor = date; daily.length && cursor >= cycle.startDate && daily.every(item => progressOf(item, cursor, cursor).completed); cursor = shiftDay(cursor, -1)) streak++
    return {
      overall: ratios.length ? Math.round(ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length * 100) : 0,
      currentDay,
      daysRemaining: Math.max(0, daysBetween(date, cycle.endDate)),
      today: daily.map(item => progressOf(item, date, date)),
      weekly: cycle.rules.filter(item => item.frequency === 'WEEKLY').map(item => progressOf(item, monday(date), date)),
      total: cycle.rules.filter(item => item.frequency === 'TOTAL').map(item => progressOf(item, cycle.startDate, end)),
      perfectDays: completedDays.length,
      perfectDayRate: currentDay ? Math.round(completedDays.length / currentDay * 100) : 0,
      streak,
    }
  }

  function randomSource(seed: number) {
    return () => { seed = (seed + 0x6d2b79f5) | 0; let value = Math.imul(seed ^ (seed >>> 15), 1 | seed); value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value; return ((value ^ (value >>> 14)) >>> 0) / 4294967296 }
  }
  const habitIds = ['h0', 'h1', 'h2', 'h3']
  const goalIds = ['f1', 'f2']
  const ruleTypes = ['HABIT', 'READING_PAGES', 'READING_MINUTES', 'WORKOUT', 'FOCUS_MINUTES', 'CHECK_IN', 'FINANCIAL', 'ABSTINENCE', 'CUSTOM'] as const
  const frequencies = ['DAILY', 'WEEKLY', 'TOTAL'] as const

  function seedWorld(seed: number) {
    const next = randomSource(seed)
    const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
    const pick = <T,>(items: readonly T[]) => items[int(0, items.length - 1)]
    const days = Array.from({ length: 52 }, (_, offset) => shiftDay('2026-09-20', offset))
    // Any time of day: sessions are bucketed by the UTC date in the timestamp, which the day itself fixes.
    const stamp = (day: string) => `${day}T${String(int(0, 23)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}:00.000Z`
    const habitLogs: LocalHabitLog[] = []; const reading: LocalReadingSession[] = []; const focus = []; const gym: WorkoutSession[] = []; const legacy: LocalWorkout[] = []; const checkins = []; const finance: LocalFinanceTransaction[] = []
    for (const day of days) {
      for (const habitId of habitIds) if (next() < 0.5) habitLogs.push(habitLog(habitId, day, pick(['completed', 'completed', 'completed', 'failed', 'skipped'] as const)))
      for (let count = int(0, 2); count > 0; count--) reading.push(readingSession(stamp(day), int(0, 40), next() < 0.2 ? null : int(0, 4000)))
      for (let count = int(0, 2); count > 0; count--) focus.push(focusSession(next() < 0.2 ? null : stamp(day), int(0, 400) * 13, pick(['completed', 'completed', 'cancelled', 'active', 'paused'] as const)))
      if (next() < 0.3) gym.push({ id: `gym-${day}`, workoutName: 'Treino', startedAt: stamp(day), exercises: [], status: pick(['COMPLETED', 'COMPLETED', 'IN_PROGRESS', 'CANCELLED'] as const) })
      if (next() < 0.1) legacy.push({ id: `legacy-${day}`, date: day, title: 'Treino', focus: 'Geral', duration_minutes: 30, notes: null })
      if (next() < 0.5) checkins.push(checkIn(day))
      for (let count = int(0, 2); count > 0; count--) finance.push({ id: `${day}-${count}`, date: day, kind: 'expense', amount_brl: 10, category: 'Teste', account: 'Conta', note: null, btc_amount: null, btc_unit_price_brl: null, financial_goal_id: pick([undefined, 'f1', 'f2']) })
    }
    const cycles = Array.from({ length: 3 }, (_, index) => {
      const durationDays = int(1, 30)
      const startDate = pick(days.slice(0, 40))
      const rules = Array.from({ length: int(1, 5) }, (_, ruleIndex): ChallengeRule => {
        const type = pick(ruleTypes)
        const linkedEntityId = next() < 0.4 ? (type === 'HABIT' ? pick(habitIds) : type === 'FINANCIAL' ? pick(goalIds) : '') : undefined
        return { id: `c${index}-r${ruleIndex}`, type, title: type, target: type.endsWith('MINUTES') ? int(10, 120) : int(1, 8), unit: 'x', frequency: pick(frequencies), linkedEntityId }
      })
      return challenge({ id: `c${index}`, startDate, endDate: shiftDay(startDate, durationDays - 1), durationDays, rules })
    })
    const ruleLogs: ChallengeRuleLog[] = cycles.flatMap(cycle => cycle.rules.flatMap(item => days.filter(() => next() < 0.4).map(day => ({ id: `${item.id}-${day}`, challengeId: cycle.id, ruleId: item.id, date: day, value: int(0, 5) }))))
    writeCollection(localDataKeys.habitLogs, habitLogs); writeCollection(localDataKeys.sessions, reading); writeCollection(localDataKeys.focusSessions, focus)
    writeCollection(gymDataKeys.sessions, gym); writeCollection(localDataKeys.workouts, legacy); writeCollection(localDataKeys.checkins, checkins)
    writeCollection(localDataKeys.financeTransactions, finance); writeCollection(localDataKeys.challengeRuleLogs, ruleLogs)
    return cycles
  }

  it.each(Array.from({ length: 40 }, (_, seed) => seed + 1))('agrees on generated history %i', seed => {
    for (const cycle of seedWorld(seed)) {
      for (const date of [shiftDay(cycle.startDate, -2), cycle.startDate, shiftDay(cycle.startDate, Math.floor(cycle.durationDays / 2)), shiftDay(cycle.endDate, -1), cycle.endDate, shiftDay(cycle.endDate, 3), shiftDay(cycle.endDate, 20)]) {
        expect(calculateChallengeProgress(cycle, date), `${cycle.id} on ${date}`).toEqual(referenceProgress(cycle, date))
      }
    }
  })
})
