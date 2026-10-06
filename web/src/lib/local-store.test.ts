import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gymDataKeys } from '../features/gym/services/gym.service'
import { focusSession, goal, habit, habitLog, localAt, readingSession, resetStorage } from '../test/helpers'
import { persistDatabaseValue } from './app-db'
import { MAXIMUM_FOCUS_STRETCH_SECONDS, closeStaleReadingSessions, getLocalReadingSessions, finishLocalFocusSession, focusStretchSeconds, getLocalFocusSessions, goalProgress, habitStreak, localDataKeys, memoizeByRevision, overallStreak, readCollection, writeCollection } from './local-store'

const uniqueKey = () => `cavern.test.${crypto.randomUUID()}`
type Item = { id: string }

beforeEach(() => { resetStorage(); vi.mocked(persistDatabaseValue).mockClear() })
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('readCollection', () => {
  it('parses a stored collection once while its raw value is unchanged', () => {
    const key = uniqueKey()
    const raw = JSON.stringify([{ id: 'a' }, { id: 'b' }])
    localStorage.setItem(key, raw)
    const parse = vi.spyOn(JSON, 'parse')
    for (let read = 0; read < 5; read++) expect(readCollection<Item>(key)).toEqual([{ id: 'a' }, { id: 'b' }])
    expect(parse.mock.calls.filter(([text]) => text === raw)).toHaveLength(1)
  })

  it('picks up changes made by anything other than writeCollection (another tab, a backup restore)', () => {
    const key = uniqueKey()
    localStorage.setItem(key, JSON.stringify([{ id: 'a' }]))
    expect(readCollection<Item>(key)).toEqual([{ id: 'a' }])
    localStorage.setItem(key, JSON.stringify([{ id: 'a' }, { id: 'b' }]))
    expect(readCollection<Item>(key)).toEqual([{ id: 'a' }, { id: 'b' }])
    localStorage.removeItem(key)
    expect(readCollection<Item>(key)).toEqual([])
  })

  it('hands out an independent array on every call, whether or not the parsed value was cached', () => {
    const key = uniqueKey()
    localStorage.setItem(key, JSON.stringify([{ id: 'b' }, { id: 'a' }]))
    const scramble = (items: Item[]) => { items.sort((left, right) => left.id.localeCompare(right.id)); items.push({ id: 'c' }) }
    scramble(readCollection<Item>(key)) // parsed and cached by this call
    scramble(readCollection<Item>(key)) // served from the cache
    expect(readCollection<Item>(key).map(item => item.id)).toEqual(['b', 'a'])
  })

  it('treats missing, empty, corrupt and non-array values as an empty collection', () => {
    const key = uniqueKey()
    expect(readCollection(key)).toEqual([])
    for (const raw of ['', '{oops', '{"a":1}', 'null', '3']) {
      localStorage.setItem(key, raw)
      expect(readCollection(key)).toEqual([])
    }
  })
})

describe('writeCollection', () => {
  it('stores the JSON, mirrors it to IndexedDB and notifies listeners once', () => {
    const key = uniqueKey()
    const items = [{ id: 'a' }]
    const listener = vi.fn()
    window.addEventListener('cavern:data-changed', listener)
    writeCollection(key, items)
    window.removeEventListener('cavern:data-changed', listener)
    expect(localStorage.getItem(key)).toBe(JSON.stringify(items))
    expect(persistDatabaseValue).toHaveBeenCalledWith(key, items)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('is visible to the next read, even after an earlier read cached the previous value', () => {
    const key = uniqueKey()
    writeCollection(key, [{ id: 'a' }])
    expect(readCollection<Item>(key)).toEqual([{ id: 'a' }])
    writeCollection(key, [{ id: 'a' }, { id: 'b' }])
    expect(readCollection<Item>(key)).toEqual([{ id: 'a' }, { id: 'b' }])
  })

  it('reads back what was stored rather than the objects that were passed in', () => {
    const key = uniqueKey()
    writeCollection<Record<string, unknown>>(key, [{ id: 'a', note: undefined, amount: Number.NaN }])
    const [item] = readCollection<Record<string, unknown>>(key)
    expect(item).toEqual({ id: 'a', amount: null })
    expect('note' in item).toBe(false)
  })
})

describe('memoizeByRevision', () => {
  it('recomputes only after the data changed', () => {
    const compute = vi.fn(() => ({}))
    const memo = memoizeByRevision(compute)
    const first = memo()
    expect(memo()).toBe(first)
    expect(compute).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new Event('cavern:data-changed'))
    expect(memo()).not.toBe(first)
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('is invalidated by a write to any collection', () => {
    const compute = vi.fn(() => ({}))
    const memo = memoizeByRevision(compute)
    memo()
    writeCollection(uniqueKey(), [{ id: 'a' }])
    memo()
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('ignores the calendar day unless asked to track it', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 7, 23, 0))
    const plain = vi.fn(() => 1)
    const daily = vi.fn(() => 1)
    const plainMemo = memoizeByRevision(plain)
    const dailyMemo = memoizeByRevision(daily, { daily: true })
    plainMemo(); dailyMemo()
    vi.setSystemTime(new Date(2026, 9, 8, 0, 5))
    plainMemo(); dailyMemo()
    expect(plain).toHaveBeenCalledTimes(1)
    expect(daily).toHaveBeenCalledTimes(2)
  })
})

describe('streaks', () => {
  const completed = (habitId: string, ...dates: string[]) => dates.map(date => habitLog(habitId, date))

  it('counts the consecutive completed days up to the given date', () => {
    expect(habitStreak('h1', completed('h1', '2026-10-05', '2026-10-06', '2026-10-07'), '2026-10-07')).toBe(3)
  })

  it('keeps the streak alive while the given day is still open', () => {
    expect(habitStreak('h1', completed('h1', '2026-10-05', '2026-10-06', '2026-10-07'), '2026-10-08')).toBe(3)
  })

  it('stops at the first missing day', () => {
    expect(habitStreak('h1', completed('h1', '2026-10-03', '2026-10-05', '2026-10-06', '2026-10-07'), '2026-10-07')).toBe(3)
  })

  it('ignores failed and skipped days and other habits', () => {
    const logs = [habitLog('h1', '2026-10-07', 'failed'), habitLog('h1', '2026-10-06'), habitLog('h1', '2026-10-05', 'skipped'), habitLog('h2', '2026-10-05')]
    expect(habitStreak('h1', logs, '2026-10-07')).toBe(1)
    expect(habitStreak('h3', logs, '2026-10-07')).toBe(0)
  })

  it('counts a day for the overall streak when any habit was completed, and breaks after a missed day', () => {
    const logs = [habitLog('h1', '2026-10-05'), habitLog('h2', '2026-10-06'), habitLog('h1', '2026-10-07')]
    expect(overallStreak(logs, '2026-10-07')).toBe(3)
    expect(overallStreak(logs, '2026-10-08')).toBe(3)
    expect(overallStreak(logs, '2026-10-09')).toBe(0)
  })
})

describe('goalProgress', () => {
  // Wednesday: the weekly window starts on Monday 2026-10-05.
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 9, 7, 12, 0)) })

  it('counts distinct days with a completed linked habit inside the goal window up to today', () => {
    writeCollection(localDataKeys.goals, [goal({ id: 'g1', start_date: '2026-10-01', end_date: '2026-10-31' })])
    writeCollection(localDataKeys.habits, [habit('h1'), habit('h2')])
    writeCollection(localDataKeys.goalHabitLinks, [{ id: 'l1', goal_id: 'g1', habit_id: 'h1' }])
    writeCollection(localDataKeys.habitLogs, [
      habitLog('h1', '2026-10-02'), habitLog('h1', '2026-10-03'), // counted
      habitLog('h2', '2026-10-04'), // not linked
      habitLog('h1', '2026-10-05', 'failed'), // not completed
      habitLog('h1', '2026-09-30'), // before the goal started
      habitLog('h1', '2026-10-08'), // in the future
    ])
    expect(goalProgress(goal({ id: 'g1', start_date: '2026-10-01', end_date: '2026-10-31' }))).toBe(2)
  })

  it('restricts a weekly goal to the current week', () => {
    const weekly = goal({ id: 'g1', period_type: 'weekly' })
    writeCollection(localDataKeys.goals, [weekly])
    writeCollection(localDataKeys.habits, [habit('h1')])
    writeCollection(localDataKeys.goalHabitLinks, [{ id: 'l1', goal_id: 'g1', habit_id: 'h1' }])
    writeCollection(localDataKeys.habitLogs, [habitLog('h1', '2026-10-03'), habitLog('h1', '2026-10-05'), habitLog('h1', '2026-10-07')])
    expect(goalProgress(weekly)).toBe(2)
  })

  it('returns the manual progress of a custom goal', () => {
    expect(goalProgress(goal({ metric: 'custom', manual_progress: 4 }))).toBe(4)
  })

  it('sums pages and minutes of finished reading sessions inside the window', () => {
    writeCollection(localDataKeys.sessions, [
      readingSession(localAt('2026-10-02'), 20, 100),
      readingSession(localAt('2026-10-03'), 5, 100),
      readingSession(localAt('2026-10-04'), 99), // never finished
      readingSession(localAt('2026-09-30'), 50, 600), // before the window
    ])
    expect(goalProgress(goal({ metric: 'pages_read', unit: 'páginas' }))).toBe(25)
    // 200 s in total is 3 minutes; rounding each session down would give 2.
    expect(goalProgress(goal({ metric: 'reading_minutes', unit: 'minutos' }))).toBe(3)
  })

  it('counts completed focus time linked to the goal directly or through one of its habits', () => {
    writeCollection(localDataKeys.goals, [goal({ id: 'g1', metric: 'study_minutes' })])
    writeCollection(localDataKeys.habits, [habit('h1')])
    writeCollection(localDataKeys.goalHabitLinks, [{ id: 'l1', goal_id: 'g1', habit_id: 'h1' }])
    writeCollection(localDataKeys.focusSessions, [
      focusSession(localAt('2026-10-02'), 1800, 'completed', { goal_id: 'g1' }),
      focusSession(localAt('2026-10-03'), 1200, 'completed', { habit_id: 'h1' }),
      focusSession(localAt('2026-10-04'), 3600, 'cancelled', { goal_id: 'g1' }),
      focusSession(localAt('2026-10-05'), 3600),
    ])
    expect(goalProgress(goal({ id: 'g1', metric: 'study_minutes' }))).toBe(50)
  })

  it('counts each training day once, whichever record it came from', () => {
    writeCollection(localDataKeys.goals, [goal({ id: 'g1', metric: 'workouts' })])
    writeCollection(localDataKeys.habits, [habit('h3', 'workout')])
    writeCollection(localDataKeys.goalHabitLinks, [{ id: 'l1', goal_id: 'g1', habit_id: 'h3' }])
    writeCollection(localDataKeys.workouts, [{ id: 'w1', date: '2026-10-02', title: 'Treino', focus: 'Peito', duration_minutes: 45, notes: null }])
    writeCollection(gymDataKeys.sessions, [
      { id: 's1', workoutName: 'A', startedAt: localAt('2026-10-03'), exercises: [], status: 'COMPLETED' },
      { id: 's2', workoutName: 'B', startedAt: localAt('2026-10-04'), exercises: [], status: 'IN_PROGRESS' },
    ])
    writeCollection(gymDataKeys.attendance, [
      { id: 'a1', date: '2026-10-05', status: 'WENT', createdAt: '2026-10-05T10:00:00.000Z' },
      { id: 'a2', date: '2026-10-06', status: 'DID_NOT_GO', createdAt: '2026-10-06T10:00:00.000Z' },
    ])
    // The workout habit repeats 10-02 (already counted) and adds 10-07.
    writeCollection(localDataKeys.habitLogs, [habitLog('h3', '2026-10-02'), habitLog('h3', '2026-10-07')])
    expect(goalProgress(goal({ id: 'g1', metric: 'workouts', unit: 'treinos' }))).toBe(4)
  })
})

describe('focus session left running', () => {
  it('stops counting a single running stretch after the maximum', () => {
    const now = Date.parse('2026-10-06T12:00:00Z')
    const session = { status: 'active' as const, started_at: '2026-10-05T20:00:00Z', resumed_at: null }
    expect(focusStretchSeconds(session, now)).toBe(MAXIMUM_FOCUS_STRETCH_SECONDS)
    expect(focusStretchSeconds({ ...session, started_at: '2026-10-06T11:00:00Z' }, now)).toBe(3600)
    expect(focusStretchSeconds({ ...session, status: 'paused' as never }, now)).toBe(0)
  })
  it('records at most the maximum when an overnight session is finished', () => {
    writeCollection(localDataKeys.focusSessions, [{ id: 'f1', started_at: new Date(Date.now() - 10 * 3600_000).toISOString(), ended_at: null, duration_seconds: 0, accumulated_seconds: 0, status: 'active' }])
    finishLocalFocusSession('f1')
    expect(getLocalFocusSessions()[0].duration_seconds).toBe(MAXIMUM_FOCUS_STRETCH_SECONDS)
  })
})

describe('skipped days', () => {
  it('neither count nor break a habit streak', () => {
    const logs = [habitLog('h1', '2026-10-03'), habitLog('h1', '2026-10-04'), habitLog('h1', '2026-10-05', 'skipped'), habitLog('h1', '2026-10-06')]
    expect(habitStreak('h1', logs, '2026-10-06')).toBe(3)
    expect(overallStreak(logs, '2026-10-06')).toBe(3)
  })
  it('still lets a failure or an empty day end the streak', () => {
    const logs = [habitLog('h1', '2026-10-03'), habitLog('h1', '2026-10-04', 'failed'), habitLog('h1', '2026-10-05'), habitLog('h1', '2026-10-06')]
    expect(habitStreak('h1', logs, '2026-10-06')).toBe(2)
  })
  it('keeps the streak alive when today is skipped', () => {
    const logs = [habitLog('h1', '2026-10-04'), habitLog('h1', '2026-10-05'), habitLog('h1', '2026-10-06', 'skipped')]
    expect(habitStreak('h1', logs, '2026-10-06')).toBe(2)
  })
})

describe('closeStaleReadingSessions', () => {
  it('closes only sessions left open for hours, keeping their pages', () => {
    const now = Date.parse('2026-10-06T12:00:00Z')
    const old = { ...readingSession('2026-10-06T01:00:00.000Z', 7), ended_at: null }
    const recent = { ...readingSession('2026-10-06T11:30:00.000Z', 2), ended_at: null }
    writeCollection(localDataKeys.sessions, [old, recent])
    expect(closeStaleReadingSessions(now)).toBe(1)
    const [closed, open] = getLocalReadingSessions()
    expect(closed.ended_at).toBe(old.started_at); expect(closed.pages_read).toBe(7); expect(closed.duration_seconds).toBe(0)
    expect(open.ended_at).toBeNull()
    expect(closeStaleReadingSessions(now)).toBe(0)
  })
})
