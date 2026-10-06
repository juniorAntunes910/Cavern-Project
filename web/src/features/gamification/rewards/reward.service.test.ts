import { beforeEach, describe, expect, it } from 'vitest'
import { resetStorage } from '../../../test/helpers'
import { clearHabitLog, grantLocalReward, logHabit } from '../../../lib/local-store'
import { getBalance } from './reward.service'

beforeEach(resetStorage)

describe('getBalance', () => {
  it('shows the debt when a reward that was already spent is undone', () => {
    logHabit('h1', '2026-10-06', 'completed')
    const earned = getBalance().embers
    expect(earned).toBeGreaterThan(0)
    grantLocalReward('purchase', 'item', 0, -earned, 'Compra')
    expect(getBalance().embers).toBe(0)
    clearHabitLog('h1', '2026-10-06')
    expect(getBalance().embers).toBe(-earned)
    logHabit('h1', '2026-10-06', 'completed')
    expect(getBalance().embers).toBe(0)
  })
})
