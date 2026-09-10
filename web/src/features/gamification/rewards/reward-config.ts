export const REWARDS = {
  HABIT_COMPLETED: { xp: 10, embers: 5 }, CHECK_IN_COMPLETED: { xp: 10, embers: 5 }, PERFECT_DAY: { xp: 40, embers: 20 }, WORKOUT_COMPLETED: { xp: 30, embers: 15 }, FOCUS_30_MINUTES: { xp: 20, embers: 10 }, GOAL_COMPLETED: { xp: 100, embers: 50 }, CHALLENGE_CHECKPOINT: { xp: 150, embers: 75 }, CHALLENGE_COMPLETED: { xp: 500, embers: 250 }, ACHIEVEMENT: { xp: 100, embers: 50 },
} as const
export type RewardType = keyof typeof REWARDS
