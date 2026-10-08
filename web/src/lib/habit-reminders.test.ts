import { describe, expect, it } from 'vitest'
import { REMINDER_ID_BASE, pendingBody, planReminders } from './habit-reminders'

const at = (day: string, time: string) => new Date(`${day}T${time}:00`)

describe('planReminders', () => {
  it('schedules today (if pending and not past) plus the following days at the chosen hour', () => {
    const plan = planReminders({ now: at('2026-10-08', '09:00'), hour: 18, pendingNames: ['Treinar'] })
    expect(plan).toHaveLength(7)
    expect(plan[0]).toMatchObject({ id: REMINDER_ID_BASE, body: '1 hábito espera por você: Treinar.' })
    expect(plan[0].at.getHours()).toBe(18)
    expect(plan.map(item => item.at.getDate())).toEqual([8, 9, 10, 11, 12, 13, 14])
    expect(plan.map(item => item.id)).toEqual(Array.from({ length: 7 }, (_, i) => REMINDER_ID_BASE + i))
  })

  it('skips today when every habit is done, so completing the last one cancels today\'s reminder', () => {
    const plan = planReminders({ now: at('2026-10-08', '09:00'), hour: 18, pendingNames: [] })
    expect(plan[0].at.getDate()).toBe(9)
    expect(plan).toHaveLength(6)
  })

  it('skips today when the hour has already passed', () => {
    const plan = planReminders({ now: at('2026-10-08', '19:30'), hour: 18, pendingNames: ['Ler'] })
    expect(plan[0].at.getDate()).toBe(9)
  })

  it('rolls over month ends', () => {
    const plan = planReminders({ now: at('2026-10-30', '08:00'), hour: 20, pendingNames: ['Ler'], days: 4 })
    expect(plan.map(item => `${item.at.getMonth() + 1}/${item.at.getDate()}`)).toEqual(['10/30', '10/31', '11/1', '11/2'])
  })

  it('uses a generic text for the following days', () => {
    const plan = planReminders({ now: at('2026-10-08', '09:00'), hour: 18, pendingNames: ['Ler'] })
    expect(plan[1].body).toContain('Cavern')
    expect(plan[1].body).not.toContain('Ler')
  })
})

describe('pendingBody', () => {
  it('names up to three habits and counts the rest', () => {
    expect(pendingBody(['A', 'B'])).toBe('2 hábitos esperam por você: A, B.')
    expect(pendingBody(['A', 'B', 'C', 'D', 'E'])).toBe('5 hábitos esperam por você: A, B, C e mais 2.')
  })
})
