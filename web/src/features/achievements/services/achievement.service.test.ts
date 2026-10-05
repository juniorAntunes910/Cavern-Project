import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { habitLog, localAt, readingSession, resetStorage } from '../../../test/helpers'
import { localDataKeys, writeCollection } from '../../../lib/local-store'
import { achievementProgress, evaluateAchievements, formatAchievementProgress } from './achievement.service'

const dates = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => `2026-10-${String(from + index).padStart(2, '0')}`)
const unlocked = () => evaluateAchievements().map(item => item.id)

beforeEach(() => {
  resetStorage()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 7, 12, 0))
})
afterEach(() => vi.useRealTimers())

describe('evaluateAchievements', () => {
  it('unlocks nothing for an empty history', () => {
    expect(unlocked()).toEqual([])
    expect(Object.values(achievementProgress()).every(value => value === 0)).toBe(true)
  })

  it('unlocks the achievements whose target has been reached', () => {
    writeCollection(localDataKeys.habitLogs, dates(1, 7).map(date => habitLog('h1', date)))
    expect(unlocked().sort()).toEqual(['first-flame', 'first-step'])
  })

  it('does not count failed or skipped habit logs', () => {
    writeCollection(localDataKeys.habitLogs, [habitLog('h1', '2026-10-07', 'failed'), habitLog('h1', '2026-10-06', 'skipped')])
    expect(unlocked()).toEqual([])
  })
})

describe('achievementProgress', () => {
  it('follows the data it is computed from', () => {
    expect(achievementProgress().habits_1).toBe(0)
    writeCollection(localDataKeys.habitLogs, [habitLog('h1', '2026-10-07')])
    expect(achievementProgress()).toMatchObject({ habits_1: 1, habits_100: 1, streak_7: 1 })
  })

  it('is computed once per data revision', () => {
    expect(achievementProgress()).toBe(achievementProgress())
    const before = achievementProgress()
    window.dispatchEvent(new Event('cavern:data-changed'))
    expect(achievementProgress()).not.toBe(before)
    expect(achievementProgress()).toEqual(before)
  })

  it('notices a streak ending when the day rolls over, with no data change', () => {
    writeCollection(localDataKeys.habitLogs, dates(5, 7).map(date => habitLog('h1', date)))
    expect(achievementProgress().streak_7).toBe(3)
    vi.setSystemTime(new Date(2026, 9, 8, 12, 0))
    expect(achievementProgress().streak_7).toBe(3) // today is still open, so yesterday's streak holds
    vi.setSystemTime(new Date(2026, 9, 9, 12, 0))
    expect(achievementProgress().streak_7).toBe(0)
  })
})

describe('formatAchievementProgress', () => {
  it('shows the current value against the target, capped at the target', () => {
    writeCollection(localDataKeys.sessions, [readingSession(localAt('2026-10-02'), 40, 100)])
    expect(formatAchievementProgress('pages_100')).toBe('40 / 100')
    writeCollection(localDataKeys.sessions, [readingSession(localAt('2026-10-02'), 150, 100)])
    expect(formatAchievementProgress('pages_100')).toBe('100 / 100')
  })

  it('shows focus time in hours and hides unknown conditions', () => {
    expect(formatAchievementProgress('focus_100h')).toBe('0 / 100 horas')
    expect(formatAchievementProgress('nothing')).toBe('???')
  })
})
