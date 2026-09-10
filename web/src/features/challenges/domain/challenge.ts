export type ChallengeType = 'FOCUS' | 'FITNESS' | 'READING' | 'HABITS' | 'FINANCE' | 'FULL_CAVERN' | 'CUSTOM'
export type ChallengeDifficulty = 'EASY' | 'NORMAL' | 'HARD' | 'EXTREME'
export type ChallengeStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'ABANDONED'
export type ChallengeRuleType = 'HABIT' | 'READING_PAGES' | 'READING_MINUTES' | 'WORKOUT' | 'FOCUS_MINUTES' | 'CHECK_IN' | 'FINANCIAL' | 'ABSTINENCE' | 'CUSTOM'
export type ChallengeRuleFrequency = 'DAILY' | 'WEEKLY' | 'TOTAL'

export type ChallengeRule = { id: string; type: ChallengeRuleType; title: string; target: number; unit: string; frequency: ChallengeRuleFrequency; linkedEntityId?: string }
export type ChallengeCheckpoint = { day: number; title: string; reachedAt?: string }
export type ChallengeReward = { title: string; xp: number }
export type Challenge = { id: string; name: string; description: string; type: ChallengeType; difficulty: ChallengeDifficulty; status: ChallengeStatus; startDate: string; endDate: string; durationDays: number; rules: ChallengeRule[]; checkpoints: ChallengeCheckpoint[]; rewards: ChallengeReward[]; createdAt: string; completedAt?: string }
export type ChallengeRuleLog = { id: string; challengeId: string; ruleId: string; date: string; value: number }
export type RuleProgress = { rule: ChallengeRule; current: number; target: number; completed: boolean }
export type ChallengeProgress = { overall: number; currentDay: number; daysRemaining: number; today: RuleProgress[]; weekly: RuleProgress[]; total: RuleProgress[]; perfectDays: number; perfectDayRate: number; streak: number }
export interface ChallengeScoreCalculator { calculate(challenge: Challenge, progress: ChallengeProgress): number }
