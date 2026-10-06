import { getLocalRewardTransactions, getLocalXpEntries, grantLocalReward } from '../../../lib/local-store'
export function getBalance() { const transactions = getLocalRewardTransactions(); return { totalXp: Math.max(0, getLocalXpEntries().reduce((sum, item) => sum + item.points, 0) + transactions.reduce((sum, item) => sum + item.xp, 0)), // Not clamped: undoing an action whose brasas were already spent leaves a visible debt that future earnings pay off, instead of hiding it at 0.
    embers: transactions.reduce((sum, item) => sum + item.embers, 0) } }
export function grantReward(input: { sourceType: string; sourceId: string; xp: number; embers: number; title: string }) { return grantLocalReward(input.sourceType, input.sourceId, input.xp, input.embers, input.title) }
